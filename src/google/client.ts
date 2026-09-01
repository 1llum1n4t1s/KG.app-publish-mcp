import { google, androidpublisher_v3 } from 'googleapis';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { readFileSync } from 'fs';
import { extname } from 'path';
import { getGoogleApiStatus } from './errors.js';

/** Validate the store asset's extension and signature before selecting its MIME type. */
function imageMimeType(imagePath: string, bytes: Buffer): string {
  const extension = extname(imagePath).toLowerCase();
  if (extension === '.png') {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (bytes.length < pngSignature.length || !bytes.subarray(0, pngSignature.length).equals(pngSignature)) {
      throw new Error(`Image content does not match the .png extension: ${imagePath}`);
    }
    return 'image/png';
  }
  if (extension === '.jpg' || extension === '.jpeg') {
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new Error(`Image content does not match the ${extension} extension: ${imagePath}`);
    }
    return 'image/jpeg';
  }
  throw new Error(`Unsupported image extension "${extension || '(none)'}". Use a PNG or JPEG file.`);
}

export interface GoogleClientOptions {
  serviceAccountPath?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export type GoogleKeyRotationReason =
  | 'COMPROMISED_KEY'
  | 'USE_STRONGER_KEY'
  | 'USE_SAME_KEY_FOR_MULTIPLE_APPS'
  | 'ROUTINE_KEY_UPGRADE'
  | 'OTHER';

export type GoogleAppSigningEnrollment =
  | {
      enrollmentType: 'new';
      cloudKmsKeyVersionResource: string;
      pemCertificatePath: string;
      pemUploadCertificatePath?: string;
    }
  | {
      enrollmentType: 'existing';
      cloudKmsKeyVersionResource: string;
      pemUploadCertificatePath?: string;
    };

function readPemCertificateAsBase64(certificatePath: string): string {
  const pem = readFileSync(certificatePath, 'utf8');
  if (!pem.includes('-----BEGIN CERTIFICATE-----') || !pem.includes('-----END CERTIFICATE-----')) {
    throw new Error(`Certificate file is not PEM encoded: ${certificatePath}`);
  }
  return Buffer.from(pem, 'utf8').toString('base64');
}

function readFileAsBase64(filePath: string): string {
  return readFileSync(filePath).toString('base64');
}

export class GoogleClient {
  private publisher: androidpublisher_v3.Androidpublisher;

  constructor(opts: GoogleClientOptions) {
    let auth: GoogleAuth | OAuth2Client;

    if (opts.serviceAccountPath) {
      auth = new GoogleAuth({
        keyFile: opts.serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    } else if (opts.clientId && opts.clientSecret && opts.refreshToken) {
      const oauth2 = new OAuth2Client(opts.clientId, opts.clientSecret);
      oauth2.setCredentials({ refresh_token: opts.refreshToken });
      auth = oauth2;
    } else {
      throw new Error('Google client requires either serviceAccountPath or clientId+clientSecret+refreshToken');
    }

    this.publisher = google.androidpublisher({
      version: 'v3',
      auth: auth as any,
    });
  }

  get api() {
    return this.publisher;
  }

  // ─── Play App Signing (self-hosted Cloud KMS) ───
  async enrollAppSigning(name: string, enrollment: GoogleAppSigningEnrollment) {
    const requestBody: androidpublisher_v3.Schema$EnrollAppRequest = {
      pemUploadCertificate: enrollment.pemUploadCertificatePath
        ? readPemCertificateAsBase64(enrollment.pemUploadCertificatePath)
        : undefined,
    };

    if (enrollment.enrollmentType === 'new') {
      requestBody.enrollNewApp = {
        cloudKmsKeyAndCert: {
          cloudKmsKey: {
            cryptoKeyVersionResource: enrollment.cloudKmsKeyVersionResource,
          },
          pemCertificate: readPemCertificateAsBase64(enrollment.pemCertificatePath),
        },
      };
    } else {
      requestBody.enrollExistingApp = {
        cloudKmsKey: {
          cryptoKeyVersionResource: enrollment.cloudKmsKeyVersionResource,
        },
      };
    }

    const res = await this.publisher.appsigning.enrollApp({ name, requestBody });
    return res.data;
  }

  async rotateAppSigningKey(
    name: string,
    opts: {
      cloudKmsKeyVersionResource: string;
      pemCertificatePath: string;
      signingCertificateLineagePath: string;
      keyRotationReason: GoogleKeyRotationReason;
    },
  ) {
    const res = await this.publisher.appsigning.rotateAppSigningKey({
      name,
      requestBody: {
        keyRotationReason: opts.keyRotationReason,
        rotatedCloudKmsKey: {
          cloudKmsKeyAndCert: {
            cloudKmsKey: {
              cryptoKeyVersionResource: opts.cloudKmsKeyVersionResource,
            },
            pemCertificate: readPemCertificateAsBase64(opts.pemCertificatePath),
          },
          signingCertificateLineage: readFileAsBase64(opts.signingCertificateLineagePath),
        },
      },
    });
    return res.data;
  }

  // ─── Edit lifecycle ───
  async createEdit(packageName: string): Promise<string> {
    const res = await this.publisher.edits.insert({ packageName });
    return res.data.id!;
  }

  async commitEdit(packageName: string, editId: string): Promise<void> {
    await this.publisher.edits.commit({ packageName, editId });
  }

  async validateEdit(packageName: string, editId: string): Promise<void> {
    await this.publisher.edits.validate({ packageName, editId });
  }

  async deleteEdit(packageName: string, editId: string): Promise<void> {
    await this.publisher.edits.delete({ packageName, editId });
  }

  // ─── App Details ───
  async getDetails(packageName: string, editId: string) {
    const res = await this.publisher.edits.details.get({
      packageName, editId,
    });
    return res.data;
  }

  async updateDetails(
    packageName: string,
    editId: string,
    details: { defaultLanguage?: string; contactWebsite?: string; contactEmail?: string; contactPhone?: string },
  ) {
    const res = await this.publisher.edits.details.patch({
      packageName, editId,
      requestBody: details,
    });
    return res.data;
  }

  // ─── Store listing ───
  async getListing(packageName: string, editId: string, language: string) {
    const res = await this.publisher.edits.listings.get({
      packageName, editId, language,
    });
    return res.data;
  }

  async updateListing(
    packageName: string,
    editId: string,
    language: string,
    listing: { title?: string; shortDescription?: string; fullDescription?: string; video?: string },
  ) {
    const res = await this.publisher.edits.listings.patch({
      packageName, editId, language,
      requestBody: listing,
    });
    return res.data;
  }

  async listListings(packageName: string, editId: string) {
    const res = await this.publisher.edits.listings.list({
      packageName, editId,
    });
    return res.data.listings ?? [];
  }

  async deleteListing(packageName: string, editId: string, language: string) {
    await this.publisher.edits.listings.delete({
      packageName, editId, language,
    });
  }

  // ─── Country Availability ───
  async getCountryAvailability(packageName: string, editId: string, track: string) {
    const res = await this.publisher.edits.countryavailability.get({
      packageName, editId, track,
    });
    return res.data;
  }

  // ─── Testers ───
  async getTesters(packageName: string, editId: string, track: string) {
    const res = await this.publisher.edits.testers.get({
      packageName, editId, track,
    });
    return res.data;
  }

  async updateTesters(
    packageName: string,
    editId: string,
    track: string,
    testers: { googleGroups?: string[] },
  ) {
    const res = await this.publisher.edits.testers.patch({
      packageName, editId, track,
      requestBody: testers,
    });
    return res.data;
  }

  // ─── Images ───
  async uploadImage(
    packageName: string,
    editId: string,
    language: string,
    imageType: string,
    imagePath: string,
  ) {
    const body = readFileSync(imagePath);
    const media = { mimeType: imageMimeType(imagePath, body), body };
    const res = await this.publisher.edits.images.upload({
      packageName, editId, language, imageType,
      media,
    } as any);
    return res.data;
  }

  async listImages(
    packageName: string,
    editId: string,
    language: string,
    imageType: string,
  ) {
    const res = await this.publisher.edits.images.list({
      packageName, editId, language, imageType,
    });
    return res.data.images ?? [];
  }

  async deleteImage(
    packageName: string,
    editId: string,
    language: string,
    imageType: string,
    imageId: string,
  ) {
    await this.publisher.edits.images.delete({
      packageName, editId, language, imageType, imageId,
    });
  }

  async deleteAllImages(
    packageName: string,
    editId: string,
    language: string,
    imageType: string,
  ) {
    await this.publisher.edits.images.deleteall({
      packageName, editId, language, imageType,
    });
  }

  // ─── Tracks & Releases ───
  async listTracks(packageName: string, editId: string) {
    const res = await this.publisher.edits.tracks.list({
      packageName, editId,
    });
    return res.data.tracks ?? [];
  }

  async getTrack(packageName: string, editId: string, track: string) {
    const res = await this.publisher.edits.tracks.get({
      packageName, editId, track,
    });
    return res.data;
  }

  async updateTrack(
    packageName: string,
    editId: string,
    track: string,
    releases: androidpublisher_v3.Schema$TrackRelease[],
  ) {
    const res = await this.publisher.edits.tracks.update({
      packageName, editId, track,
      requestBody: { track, releases },
    });
    return res.data;
  }

  // ─── Bundles ───
  async uploadBundle(packageName: string, editId: string, bundlePath: string) {
    const media = {
      mimeType: 'application/octet-stream',
      body: readFileSync(bundlePath),
    };
    const res = await this.publisher.edits.bundles.upload({
      packageName, editId,
      media,
    } as any);
    return res.data;
  }

  async uploadApk(packageName: string, editId: string, apkPath: string) {
    const media = {
      mimeType: 'application/vnd.android.package-archive',
      body: readFileSync(apkPath),
    };
    const res = await this.publisher.edits.apks.upload({
      packageName, editId,
      media,
    } as any);
    return res.data;
  }

  // ─── In-App Products ───
  async listInAppProducts(packageName: string) {
    const products: androidpublisher_v3.Schema$InAppProduct[] = [];
    const seenTokens = new Set<string>();
    let token: string | undefined;

    do {
      const res = await this.publisher.inappproducts.list({ packageName, token });
      products.push(...(res.data.inappproduct ?? []));
      const nextToken = res.data.tokenPagination?.nextPageToken ?? undefined;
      if (nextToken && seenTokens.has(nextToken)) {
        throw new Error(`Google Play returned a repeated in-app product page token: ${nextToken}`);
      }
      if (nextToken) seenTokens.add(nextToken);
      token = nextToken;
    } while (token);

    return products;
  }

  async getInAppProduct(packageName: string, sku: string) {
    const res = await this.publisher.inappproducts.get({ packageName, sku });
    return res.data;
  }

  async createInAppProduct(packageName: string, product: androidpublisher_v3.Schema$InAppProduct) {
    const res = await this.publisher.inappproducts.insert({
      packageName,
      autoConvertMissingPrices: true,
      requestBody: product,
    });
    return res.data;
  }

  async updateInAppProduct(packageName: string, sku: string, product: androidpublisher_v3.Schema$InAppProduct) {
    const res = await this.publisher.inappproducts.patch({
      packageName, sku,
      autoConvertMissingPrices: product.defaultPrice != null,
      requestBody: product,
    });
    return res.data;
  }

  async deleteInAppProduct(packageName: string, sku: string) {
    await this.publisher.inappproducts.delete({ packageName, sku });
  }

  // ─── Subscriptions (monetization) ───
  async listSubscriptions(packageName: string) {
    const subscriptions: androidpublisher_v3.Schema$Subscription[] = [];
    const seenTokens = new Set<string>();
    let pageToken: string | undefined;

    do {
      const res = await this.publisher.monetization.subscriptions.list({
        packageName,
        pageSize: 1000,
        pageToken,
      });
      subscriptions.push(...(res.data.subscriptions ?? []));
      const nextToken = res.data.nextPageToken ?? undefined;
      if (nextToken && seenTokens.has(nextToken)) {
        throw new Error(`Google Play returned a repeated subscription page token: ${nextToken}`);
      }
      if (nextToken) seenTokens.add(nextToken);
      pageToken = nextToken;
    } while (pageToken);

    return subscriptions;
  }

  async getSubscription(packageName: string, productId: string) {
    const res = await this.publisher.monetization.subscriptions.get({ packageName, productId });
    return res.data;
  }

  async createSubscription(
    packageName: string,
    productId: string,
    subscription: androidpublisher_v3.Schema$Subscription,
    regionsVersionVersion: string = '2022/02',
  ) {
    const res = await this.publisher.monetization.subscriptions.create({
      packageName,
      productId,
      'regionsVersion.version': regionsVersionVersion,
      requestBody: subscription,
    });
    return res.data;
  }

  async patchSubscription(
    packageName: string,
    productId: string,
    subscription: androidpublisher_v3.Schema$Subscription,
    updateMask?: string,
    regionsVersionVersion?: string,
  ) {
    const params: any = {
      packageName,
      productId,
      requestBody: subscription,
    };
    if (updateMask) params.updateMask = updateMask;
    if (regionsVersionVersion) params['regionsVersion.version'] = regionsVersionVersion;
    const res = await this.publisher.monetization.subscriptions.patch(params);
    return res.data;
  }

  async archiveSubscription(packageName: string, productId: string) {
    const res = await this.publisher.monetization.subscriptions.archive({
      packageName, productId,
      requestBody: {},
    });
    return res.data;
  }

  // ─── Subscription Base Plans ───
  async activateBasePlan(
    packageName: string,
    productId: string,
    basePlanId: string,
  ) {
    const res = await this.publisher.monetization.subscriptions.basePlans.activate({
      packageName,
      productId,
      basePlanId,
      requestBody: { packageName, productId, basePlanId },
    });
    return res.data;
  }

  async deactivateBasePlan(packageName: string, productId: string, basePlanId: string) {
    const res = await this.publisher.monetization.subscriptions.basePlans.deactivate({
      packageName,
      productId,
      basePlanId,
      requestBody: { packageName, productId, basePlanId },
    });
    return res.data;
  }

  // ─── One-time Products (monetization) ───
  async listOneTimeProducts(packageName: string) {
    const oneTimeProducts: androidpublisher_v3.Schema$OneTimeProduct[] = [];
    const seenTokens = new Set<string>();
    let pageToken: string | undefined;

    do {
      const res = await this.publisher.monetization.onetimeproducts.list({
        packageName,
        pageSize: 1000,
        pageToken,
      });
      oneTimeProducts.push(...(res.data.oneTimeProducts ?? []));
      const nextToken = res.data.nextPageToken ?? undefined;
      if (nextToken && seenTokens.has(nextToken)) {
        throw new Error(`Google Play returned a repeated one-time product page token: ${nextToken}`);
      }
      if (nextToken) seenTokens.add(nextToken);
      pageToken = nextToken;
    } while (pageToken);

    return {
      oneTimeProducts,
      nextPageToken: null,
    };
  }

  async getOneTimeProduct(packageName: string, productId: string) {
    const res = await this.publisher.monetization.onetimeproducts.get({ packageName, productId });
    return res.data;
  }

  async createOneTimeProduct(
    packageName: string,
    productId: string,
    product: androidpublisher_v3.Schema$OneTimeProduct,
    regionsVersionVersion: string,
  ) {
    try {
      await this.getOneTimeProduct(packageName, productId);
      throw new Error(
        `One-time product "${productId}" already exists. Use google_update_one_time_product to modify it.`,
      );
    } catch (err: unknown) {
      if (getGoogleApiStatus(err) !== 404) throw err;
    }

    return this.upsertOneTimeProduct(packageName, productId, product, {
      allowMissing: true,
      updateMask: '*',
      regionsVersionVersion,
    });
  }

  async upsertOneTimeProduct(
    packageName: string,
    productId: string,
    product: androidpublisher_v3.Schema$OneTimeProduct,
    opts: { allowMissing: boolean; updateMask?: string; regionsVersionVersion?: string },
  ) {
    const params: androidpublisher_v3.Params$Resource$Monetization$Onetimeproducts$Patch = {
      packageName,
      productId,
      allowMissing: opts.allowMissing,
      requestBody: product,
    };
    if (opts.updateMask) params.updateMask = opts.updateMask;
    if (opts.regionsVersionVersion) params['regionsVersion.version'] = opts.regionsVersionVersion;
    const res = await this.publisher.monetization.onetimeproducts.patch(params);
    return res.data;
  }

  async deleteOneTimeProduct(packageName: string, productId: string) {
    await this.publisher.monetization.onetimeproducts.delete({ packageName, productId });
  }

  async setPurchaseOptionState(
    packageName: string,
    productId: string,
    purchaseOptionId: string,
    action: 'activate' | 'deactivate',
  ) {
    const request =
      action === 'activate'
        ? { activatePurchaseOptionRequest: { packageName, productId, purchaseOptionId } }
        : { deactivatePurchaseOptionRequest: { packageName, productId, purchaseOptionId } };
    const res = await this.publisher.monetization.onetimeproducts.purchaseOptions.batchUpdateStates({
      packageName,
      productId,
      requestBody: { requests: [request] },
    });
    return res.data;
  }

  // ─── Reviews ───
  async listReviews(
    packageName: string,
    opts: { maxResults?: number; startIndex?: number; token?: string; translationLanguage?: string } = {},
  ) {
    const res = await this.publisher.reviews.list({
      packageName,
      maxResults: opts.maxResults,
      startIndex: opts.startIndex,
      token: opts.token,
      translationLanguage: opts.translationLanguage,
    });
    return {
      reviews: res.data.reviews ?? [],
      nextPageToken: res.data.tokenPagination?.nextPageToken ?? null,
    };
  }

  async getReview(packageName: string, reviewId: string, translationLanguage?: string) {
    const res = await this.publisher.reviews.get({ packageName, reviewId, translationLanguage });
    return res.data;
  }

  async replyToReview(packageName: string, reviewId: string, replyText: string) {
    const res = await this.publisher.reviews.reply({
      packageName, reviewId,
      requestBody: { replyText },
    });
    return res.data;
  }
}
