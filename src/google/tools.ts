import { z } from 'zod';
import { androidpublisher_v3 } from 'googleapis';
import { GoogleClient } from './client.js';

interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  handler: (client: GoogleClient, args: any) => Promise<any>;
}

const cloudKmsKeyVersionResource = z
  .string()
  .regex(
    /^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+\/cryptoKeyVersions\/[^/]+$/,
    'Expected projects/{project}/locations/{location}/keyRings/{keyRing}/cryptoKeys/{key}/cryptoKeyVersions/{version}',
  )
  .describe('Full resource name of the self-hosted Google Cloud KMS key version');

const confirmSelfHostedKms = z
  .literal(true)
  .describe('Must be true to confirm this app uses self-hosted Cloud KMS keys and that this signing operation is intentional');

function normalizedVersionCodes(versionCodes: string[] | null | undefined): string[] {
  return [...(versionCodes ?? [])].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function haveSameVersionCodes(
  left: string[] | null | undefined,
  right: string[] | null | undefined,
): boolean {
  return normalizedVersionCodes(left).join(',') === normalizedVersionCodes(right).join(',');
}

function upsertTrackRelease(
  releases: androidpublisher_v3.Schema$TrackRelease[] | null | undefined,
  release: androidpublisher_v3.Schema$TrackRelease,
): androidpublisher_v3.Schema$TrackRelease[] {
  const updated = [...(releases ?? [])];
  const index = updated.findIndex(candidate => haveSameVersionCodes(candidate.versionCodes, release.versionCodes));
  if (index >= 0) {
    updated[index] = release;
  } else {
    updated.push(release);
  }
  return updated;
}

function maxVersionCode(release: androidpublisher_v3.Schema$TrackRelease): bigint {
  return (release.versionCodes ?? []).reduce((maximum, versionCode) => {
    if (!/^\d+$/.test(versionCode)) return maximum;
    const value = BigInt(versionCode);
    return value > maximum ? value : maximum;
  }, -1n);
}

function selectPromotableRelease(
  releases: androidpublisher_v3.Schema$TrackRelease[] | null | undefined,
): androidpublisher_v3.Schema$TrackRelease | undefined {
  return (releases ?? [])
    .filter(release =>
      (release.status === 'completed' || release.status === 'inProgress') &&
      (release.versionCodes?.length ?? 0) > 0,
    )
    .reduce<androidpublisher_v3.Schema$TrackRelease | undefined>((latest, candidate) => {
      if (!latest) return candidate;
      const candidateVersion = maxVersionCode(candidate);
      const latestVersion = maxVersionCode(latest);
      if (candidateVersion !== latestVersion) return candidateVersion > latestVersion ? candidate : latest;
      if (candidate.status === 'inProgress' && latest.status !== 'inProgress') return candidate;
      return latest;
    }, undefined);
}

// ═══════════════════════════════════════════
// 1. Edit Lifecycle
// ═══════════════════════════════════════════

const createEdit: ToolDef = {
  name: 'google_create_edit',
  description: 'Create a new edit session. Required before making any changes to a Google Play listing.',
  schema: z.object({
    packageName: z.string().describe('Android package name (e.g. com.example.app)'),
  }),
  handler: async (client, args) => {
    const editId = await client.createEdit(args.packageName);
    return { editId, note: 'Use this editId for subsequent operations, then commit when done.' };
  },
};

const commitEdit: ToolDef = {
  name: 'google_commit_edit',
  description: 'Commit all pending changes in an edit session. This publishes the changes.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID from google_create_edit'),
  }),
  handler: async (client, args) => {
    await client.commitEdit(args.packageName, args.editId);
    return { success: true };
  },
};

const validateEdit: ToolDef = {
  name: 'google_validate_edit',
  description: 'Validate an edit session without committing. Useful to check for errors before commit.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID from google_create_edit'),
  }),
  handler: async (client, args) => {
    await client.validateEdit(args.packageName, args.editId);
    return { success: true, note: 'Edit is valid and ready to commit.' };
  },
};

const deleteEdit: ToolDef = {
  name: 'google_delete_edit',
  description: 'Discard an edit session without committing changes',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
  }),
  handler: async (client, args) => {
    await client.deleteEdit(args.packageName, args.editId);
    return { success: true };
  },
};

// ═══════════════════════════════════════════
// 2. Play App Signing (self-hosted Cloud KMS)
// ═══════════════════════════════════════════

const enrollAppSigningSchema = z
  .object({
    packageName: z.string().min(1).describe('Android package name or Google Play app ID'),
    enrollmentType: z
      .enum(['new', 'existing'])
      .describe('Use new only before the app has reached Open testing or Production; otherwise use existing'),
    cloudKmsKeyVersionResource,
    pemCertificatePath: z
      .string()
      .min(1)
      .optional()
      .describe('PEM certificate path for the self-hosted signing key; required for new app enrollment'),
    pemUploadCertificatePath: z
      .string()
      .min(1)
      .optional()
      .describe('Optional PEM certificate path for a separate upload key'),
    confirmSelfHostedKms,
  })
  .superRefine((args, ctx) => {
    if (args.enrollmentType === 'new' && !args.pemCertificatePath) {
      ctx.addIssue({
        code: 'custom',
        path: ['pemCertificatePath'],
        message: 'pemCertificatePath is required for new app enrollment',
      });
    }
    if (args.enrollmentType === 'existing' && args.pemCertificatePath) {
      ctx.addIssue({
        code: 'custom',
        path: ['pemCertificatePath'],
        message: 'pemCertificatePath is only valid for new app enrollment',
      });
    }
  });

const enrollAppSigning: ToolDef = {
  name: 'google_enroll_app_signing',
  description:
    'Enroll an app in Play App Signing with a self-hosted Google Cloud KMS key. Enterprise-only advanced operation; standard Google-managed Play App Signing enrollment is not supported by the API.',
  schema: enrollAppSigningSchema,
  handler: async (client, args) => {
    if (args.enrollmentType === 'new') {
      return client.enrollAppSigning(args.packageName, {
        enrollmentType: 'new',
        cloudKmsKeyVersionResource: args.cloudKmsKeyVersionResource,
        pemCertificatePath: args.pemCertificatePath,
        pemUploadCertificatePath: args.pemUploadCertificatePath,
      });
    }
    return client.enrollAppSigning(args.packageName, {
      enrollmentType: 'existing',
      cloudKmsKeyVersionResource: args.cloudKmsKeyVersionResource,
      pemUploadCertificatePath: args.pemUploadCertificatePath,
    });
  },
};

const rotateAppSigningKey: ToolDef = {
  name: 'google_rotate_app_signing_key',
  description:
    'Rotate an app signing key to another self-hosted Google Cloud KMS key. Only valid for apps already enrolled with self-hosted KMS; standard Google-managed signing key rotation remains a Play Console operation.',
  schema: z.object({
    packageName: z.string().min(1).describe('Android package name or Google Play app ID'),
    cloudKmsKeyVersionResource,
    pemCertificatePath: z.string().min(1).describe('PEM certificate path associated with the rotated Cloud KMS key'),
    signingCertificateLineagePath: z
      .string()
      .min(1)
      .describe('Path to the binary proof-of-rotation signing certificate lineage generated by apksigner'),
    keyRotationReason: z.enum([
      'COMPROMISED_KEY',
      'USE_STRONGER_KEY',
      'USE_SAME_KEY_FOR_MULTIPLE_APPS',
      'ROUTINE_KEY_UPGRADE',
      'OTHER',
    ]),
    confirmSelfHostedKms,
  }),
  handler: async (client, args) => {
    return client.rotateAppSigningKey(args.packageName, {
      cloudKmsKeyVersionResource: args.cloudKmsKeyVersionResource,
      pemCertificatePath: args.pemCertificatePath,
      signingCertificateLineagePath: args.signingCertificateLineagePath,
      keyRotationReason: args.keyRotationReason,
    });
  },
};

// ═══════════════════════════════════════════
// 3. App Details
// ═══════════════════════════════════════════

const getDetails: ToolDef = {
  name: 'google_get_details',
  description: 'Get app details (default language, contact email/phone/website)',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
  }),
  handler: async (client, args) => {
    return client.getDetails(args.packageName, args.editId);
  },
};

const updateDetails: ToolDef = {
  name: 'google_update_details',
  description: 'Update app details (default language, contact email/phone/website)',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    defaultLanguage: z.string().optional().describe('Default language code in BCP 47 format (e.g. en-US)'),
    contactWebsite: z.string().optional().describe('User-visible website URL'),
    contactEmail: z.string().optional().describe('User-visible support email'),
    contactPhone: z.string().optional().describe('User-visible support phone number'),
  }),
  handler: async (client, args) => {
    const { packageName, editId, ...details } = args;
    return client.updateDetails(packageName, editId, details);
  },
};

// ═══════════════════════════════════════════
// 4. Store Listing
// ═══════════════════════════════════════════

const listListings: ToolDef = {
  name: 'google_list_listings',
  description: 'List all store listings (all languages) for an app',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
  }),
  handler: async (client, args) => {
    return client.listListings(args.packageName, args.editId);
  },
};

const getListing: ToolDef = {
  name: 'google_get_listing',
  description: 'Get store listing for a specific language',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    language: z.string().describe('Language code (e.g. ko-KR, en-US, ja-JP)'),
  }),
  handler: async (client, args) => {
    return client.getListing(args.packageName, args.editId, args.language);
  },
};

const updateListing: ToolDef = {
  name: 'google_update_listing',
  description: 'Partially update a store listing for a specific language. Omitted fields are preserved.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    language: z.string().describe('Language code (e.g. ko-KR, en-US)'),
    title: z.string().optional().describe('App title (max 30 chars)'),
    shortDescription: z.string().optional().describe('Short description (max 80 chars)'),
    fullDescription: z.string().optional().describe('Full description (max 4000 chars)'),
    video: z.string().optional().describe('URL of a promotional YouTube video for the app'),
  }),
  handler: async (client, args) => {
    const { packageName, editId, language, ...listing } = args;
    return client.updateListing(packageName, editId, language, listing);
  },
};

const deleteListing: ToolDef = {
  name: 'google_delete_listing',
  description: 'Delete a store listing for a specific language',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    language: z.string().describe('Language code to delete (e.g. ko-KR)'),
  }),
  handler: async (client, args) => {
    await client.deleteListing(args.packageName, args.editId, args.language);
    return { success: true };
  },
};

// ═══════════════════════════════════════════
// 5. Country Availability & Testers
// ═══════════════════════════════════════════

const getCountryAvailability: ToolDef = {
  name: 'google_get_country_availability',
  description: 'Get country availability for a specific track',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    track: z.string().describe('Track name (e.g. production, beta, alpha, internal)'),
  }),
  handler: async (client, args) => {
    return client.getCountryAvailability(args.packageName, args.editId, args.track);
  },
};

const getTesters: ToolDef = {
  name: 'google_get_testers',
  description: 'Get tester configuration for a track',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    track: z.string().describe('Track name (e.g. internal, alpha, beta)'),
  }),
  handler: async (client, args) => {
    return client.getTesters(args.packageName, args.editId, args.track);
  },
};

const updateTesters: ToolDef = {
  name: 'google_update_testers',
  description: 'Update tester Google Groups for a track',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    track: z.string().describe('Track name (e.g. internal, alpha, beta)'),
    googleGroups: z.array(z.string()).optional().describe('List of Google Group email addresses'),
  }),
  handler: async (client, args) => {
    const { packageName, editId, track, ...testers } = args;
    return client.updateTesters(packageName, editId, track, testers);
  },
};

// ═══════════════════════════════════════════
// 6. Images (Screenshots, Icons, Feature Graphics)
// ═══════════════════════════════════════════

const listImages: ToolDef = {
  name: 'google_list_images',
  description: 'List uploaded images of a specific type',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    language: z.string().describe('Language code'),
    imageType: z.enum([
      'featureGraphic', 'icon', 'phoneScreenshots', 'sevenInchScreenshots',
      'tenInchScreenshots', 'tvBanner', 'tvScreenshots', 'wearScreenshots',
    ]).describe('Image type'),
  }),
  handler: async (client, args) => {
    return client.listImages(args.packageName, args.editId, args.language, args.imageType);
  },
};

const uploadImage: ToolDef = {
  name: 'google_upload_image',
  description: 'Upload an image (screenshot, icon, feature graphic, etc)',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    language: z.string().describe('Language code'),
    imageType: z.enum([
      'featureGraphic', 'icon', 'phoneScreenshots', 'sevenInchScreenshots',
      'tenInchScreenshots', 'tvBanner', 'tvScreenshots', 'wearScreenshots',
    ]).describe('Image type'),
    imagePath: z.string().describe('Local path to the image file'),
  }),
  handler: async (client, args) => {
    return client.uploadImage(
      args.packageName, args.editId, args.language, args.imageType, args.imagePath,
    );
  },
};

const deleteImage: ToolDef = {
  name: 'google_delete_image',
  description: 'Delete a specific uploaded image',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    language: z.string().describe('Language code'),
    imageType: z.string().describe('Image type'),
    imageId: z.string().describe('Image ID to delete'),
  }),
  handler: async (client, args) => {
    await client.deleteImage(
      args.packageName, args.editId, args.language, args.imageType, args.imageId,
    );
    return { success: true };
  },
};

const deleteAllImages: ToolDef = {
  name: 'google_delete_all_images',
  description: 'Delete all images of a specific type for a language',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    language: z.string().describe('Language code'),
    imageType: z.string().describe('Image type'),
  }),
  handler: async (client, args) => {
    await client.deleteAllImages(args.packageName, args.editId, args.language, args.imageType);
    return { success: true };
  },
};

// ═══════════════════════════════════════════
// 7. Tracks & Releases
// ═══════════════════════════════════════════

const listTracks: ToolDef = {
  name: 'google_list_tracks',
  description: 'List all release tracks (internal, alpha, beta, production)',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
  }),
  handler: async (client, args) => {
    return client.listTracks(args.packageName, args.editId);
  },
};

const getTrack: ToolDef = {
  name: 'google_get_track',
  description: 'Get details of a specific release track',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    track: z.enum(['internal', 'alpha', 'beta', 'production']).describe('Track name'),
  }),
  handler: async (client, args) => {
    return client.getTrack(args.packageName, args.editId, args.track);
  },
};

const createRelease: ToolDef = {
  name: 'google_create_release',
  description:
    'Create or update a release on a track without discarding the track\'s other active releases. Defaults to draft; version codes are required.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    track: z.enum(['internal', 'alpha', 'beta', 'production']).describe('Target track'),
    versionCodes: z.array(z.string().regex(/^[1-9]\d*$/, 'Version codes must be positive integer strings')).min(1).describe('Version codes to include'),
    releaseNotes: z.array(z.object({
      language: z.string(),
      text: z.string(),
    })).optional().describe('Release notes per language'),
    status: z.enum(['draft', 'halted', 'completed', 'inProgress']).default('draft'),
    userFraction: z.number().gt(0).lt(1).optional().describe('Staged rollout fraction (greater than 0 and less than 1, only for production)'),
    releaseName: z.string().optional().describe('Release name/label'),
  }).superRefine((args, ctx) => {
    const staged = args.status === 'inProgress' || args.status === 'halted';
    if (staged && args.userFraction === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['userFraction'],
        message: `userFraction is required when status is ${args.status}`,
      });
    }
    if (!staged && args.userFraction !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['userFraction'],
        message: `userFraction cannot be set when status is ${args.status}`,
      });
    }
    if (args.userFraction !== undefined && args.track !== 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['track'],
        message: 'Staged rollouts are only supported on the production track',
      });
    }
  }),
  handler: async (client, args) => {
    const trackData = await client.getTrack(args.packageName, args.editId, args.track);
    const inProgress = trackData.releases?.find(r => r.status === 'inProgress');
    if (inProgress) {
      const ongoing = normalizedVersionCodes(inProgress.versionCodes).join(',');
      if (!haveSameVersionCodes(inProgress.versionCodes, args.versionCodes)) {
        throw new Error(
          `Track "${args.track}" has a staged rollout in progress (version codes ${ongoing || 'unknown'}` +
            `${inProgress.userFraction != null ? `, userFraction ${inProgress.userFraction}` : ''}). ` +
            'Creating a release here would replace it. Halt it with google_halt_release, complete it, ' +
            'or pass the same versionCodes to advance the existing rollout.',
        );
      }
    }

    const existing = trackData.releases?.find(candidate =>
      haveSameVersionCodes(candidate.versionCodes, args.versionCodes),
    );
    const release: androidpublisher_v3.Schema$TrackRelease = {
      ...existing,
      versionCodes: args.versionCodes,
      status: args.status,
    };
    if (args.releaseNotes) release.releaseNotes = args.releaseNotes;
    if (args.userFraction !== undefined) release.userFraction = args.userFraction;
    else delete release.userFraction;
    if (args.releaseName) release.name = args.releaseName;
    if (args.status !== 'inProgress') delete release.countryTargeting;

    const releases = upsertTrackRelease(trackData.releases, release);
    return client.updateTrack(args.packageName, args.editId, args.track, releases);
  },
};

const promoteRelease: ToolDef = {
  name: 'google_promote_release',
  description: 'Promote a release from one track to another (e.g. beta → production)',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    fromTrack: z.enum(['internal', 'alpha', 'beta']).describe('Source track'),
    toTrack: z.enum(['alpha', 'beta', 'production']).describe('Target track'),
    userFraction: z.number().gt(0).lt(1).optional().describe('Staged rollout fraction for production (greater than 0 and less than 1)'),
    releaseNotes: z.array(z.object({
      language: z.string(),
      text: z.string(),
    })).optional(),
  }),
  handler: async (client, args) => {
    // Select the newest active source release without relying on API array order.
    const sourceTrack = await client.getTrack(args.packageName, args.editId, args.fromTrack);
    const latestRelease = selectPromotableRelease(sourceTrack.releases);
    if (!latestRelease) {
      throw new Error(`No completed or in-progress release with version codes found on ${args.fromTrack} track`);
    }

    const destinationTrack = await client.getTrack(args.packageName, args.editId, args.toTrack);
    const destinationRollout = destinationTrack.releases?.find(candidate => candidate.status === 'inProgress');
    if (destinationRollout && !haveSameVersionCodes(destinationRollout.versionCodes, latestRelease.versionCodes)) {
      const ongoing = normalizedVersionCodes(destinationRollout.versionCodes).join(',');
      const incoming = normalizedVersionCodes(latestRelease.versionCodes).join(',');
      throw new Error(
        `Track "${args.toTrack}" has a staged rollout in progress (version codes ${ongoing || 'unknown'}` +
          `${destinationRollout.userFraction != null ? `, userFraction ${destinationRollout.userFraction}` : ''}). ` +
          `Promoting version codes ${incoming || 'unknown'} would replace it. Halt or complete the existing rollout first.`,
      );
    }

    const existingDestination = destinationTrack.releases?.find(candidate =>
      haveSameVersionCodes(candidate.versionCodes, latestRelease.versionCodes),
    );
    const release: androidpublisher_v3.Schema$TrackRelease = {
      ...existingDestination,
      versionCodes: latestRelease.versionCodes,
      status: args.userFraction != null ? 'inProgress' : 'completed',
    };
    if (args.userFraction != null) release.userFraction = args.userFraction;
    else delete release.userFraction;
    if (args.releaseNotes) release.releaseNotes = args.releaseNotes;
    else if (latestRelease.releaseNotes) release.releaseNotes = latestRelease.releaseNotes;
    if (release.status !== 'inProgress') delete release.countryTargeting;

    const releases = upsertTrackRelease(destinationTrack.releases, release);
    return client.updateTrack(args.packageName, args.editId, args.toTrack, releases);
  },
};

const haltRelease: ToolDef = {
  name: 'google_halt_release',
  description: 'Halt an ongoing staged rollout',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    track: z.string().describe('Track name'),
  }),
  handler: async (client, args) => {
    const trackData = await client.getTrack(args.packageName, args.editId, args.track);
    const inProgress = trackData.releases?.find(r => r.status === 'inProgress');
    if (!inProgress) throw new Error('No in-progress release to halt');

    inProgress.status = 'halted';
    return client.updateTrack(args.packageName, args.editId, args.track, trackData.releases!);
  },
};

// ═══════════════════════════════════════════
// 8. Bundle / APK Upload
// ═══════════════════════════════════════════

const uploadBundle: ToolDef = {
  name: 'google_upload_bundle',
  description: 'Upload an Android App Bundle (.aab)',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    bundlePath: z.string().describe('Local path to the .aab file'),
  }),
  handler: async (client, args) => {
    return client.uploadBundle(args.packageName, args.editId, args.bundlePath);
  },
};

const uploadApk: ToolDef = {
  name: 'google_upload_apk',
  description: 'Upload an APK file',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    editId: z.string().describe('Edit ID'),
    apkPath: z.string().describe('Local path to the .apk file'),
  }),
  handler: async (client, args) => {
    return client.uploadApk(args.packageName, args.editId, args.apkPath);
  },
};

// ═══════════════════════════════════════════
// 9. Reviews
// ═══════════════════════════════════════════

const listReviews: ToolDef = {
  name: 'google_list_reviews',
  description:
    'List user reviews for an app. Note: the Play Developer API reviews.list endpoint only surfaces recent reviews and requires the "Reply to reviews" account permission for the linked service account (Play Console → Users and permissions). If this returns an empty array for an app with visible reviews in Play Console, verify that permission first, then use pageToken to page through more results.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    maxResults: z.number().optional().describe('Max reviews to return per page (API max is 100)'),
    pageToken: z.string().optional().describe('Pagination token from a previous response (nextPageToken)'),
    translationLanguage: z.string().optional().describe('BCP-47 language code to translate review text into'),
  }),
  handler: async (client, args) => {
    return client.listReviews(args.packageName, {
      maxResults: args.maxResults,
      token: args.pageToken,
      translationLanguage: args.translationLanguage,
    });
  },
};

const getReview: ToolDef = {
  name: 'google_get_review',
  description: 'Get a specific review with details',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    reviewId: z.string().describe('Review ID'),
    translationLanguage: z.string().optional().describe('BCP-47 language code to translate review text into'),
  }),
  handler: async (client, args) => {
    return client.getReview(args.packageName, args.reviewId, args.translationLanguage);
  },
};

const replyToReview: ToolDef = {
  name: 'google_reply_to_review',
  description: 'Reply to a user review',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    reviewId: z.string().describe('Review ID'),
    replyText: z.string().describe('Reply text'),
  }),
  handler: async (client, args) => {
    return client.replyToReview(args.packageName, args.reviewId, args.replyText);
  },
};

// ═══════════════════════════════════════════
// 10. In-App Products
// ═══════════════════════════════════════════

const listInAppProducts: ToolDef = {
  name: 'google_list_iap',
  description: 'List all in-app products (managed products) for an app',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
  }),
  handler: async (client, args) => {
    return client.listInAppProducts(args.packageName);
  },
};

const getInAppProduct: ToolDef = {
  name: 'google_get_iap',
  description: 'Get details of a specific in-app product',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    sku: z.string().describe('Product SKU'),
  }),
  handler: async (client, args) => {
    return client.getInAppProduct(args.packageName, args.sku);
  },
};

const createInAppProduct: ToolDef = {
  name: 'google_create_iap',
  description: 'Create a new managed in-app product. Use google_create_subscription for subscriptions.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    sku: z.string().describe('Product SKU (unique identifier)'),
    defaultLanguage: z.string().describe('Default language (e.g. en-US)'),
    defaultTitle: z.string().describe('Default product title'),
    defaultDescription: z.string().describe('Default product description'),
    status: z.enum(['active', 'inactive']).default('active'),
    purchaseType: z.literal('managedUser').default('managedUser').describe('Legacy product type; subscriptions must use google_create_subscription'),
    defaultPriceCurrencyCode: z.string().describe('Currency code (e.g. USD)'),
    defaultPriceMicros: z.string().describe('Price in micros (e.g. 990000 for $0.99)'),
  }),
  handler: async (client, args) => {
    return client.createInAppProduct(args.packageName, {
      sku: args.sku,
      status: args.status,
      purchaseType: 'managedUser',
      defaultLanguage: args.defaultLanguage,
      listings: {
        [args.defaultLanguage]: {
          title: args.defaultTitle,
          description: args.defaultDescription,
        },
      },
      defaultPrice: {
        priceMicros: args.defaultPriceMicros,
        currency: args.defaultPriceCurrencyCode,
      },
    });
  },
};

const updateInAppProduct: ToolDef = {
  name: 'google_update_iap',
  description: 'Partially update an existing in-app product. Listing edits preserve other locales and omitted fields.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    sku: z.string().describe('Product SKU'),
    defaultLanguage: z.string().optional().describe('Default language'),
    title: z.string().optional().describe('Product title (for default language)'),
    description: z.string().optional().describe('Product description (for default language)'),
    status: z.enum(['active', 'inactive']).optional(),
    defaultPriceCurrencyCode: z.string().optional().describe('Currency code'),
    defaultPriceMicros: z.string().optional().describe('Price in micros'),
  }),
  handler: async (client, args) => {
    const product: androidpublisher_v3.Schema$InAppProduct = {};
    if (args.status !== undefined) product.status = args.status;
    if (args.defaultLanguage !== undefined) product.defaultLanguage = args.defaultLanguage;
    if (args.title !== undefined || args.description !== undefined) {
      const existing = await client.getInAppProduct(args.packageName, args.sku);
      const language = args.defaultLanguage ?? existing.defaultLanguage;
      if (!language) {
        throw new Error('The existing product has no defaultLanguage; pass defaultLanguage when updating a listing');
      }
      const currentListings = existing.listings ?? {};
      product.listings = {
        ...currentListings,
        [language]: {
          ...(currentListings[language] ?? {}),
          ...(args.title !== undefined ? { title: args.title } : {}),
          ...(args.description !== undefined ? { description: args.description } : {}),
        },
      };
    }
    if (args.defaultPriceCurrencyCode && args.defaultPriceMicros) {
      product.defaultPrice = {
        priceMicros: args.defaultPriceMicros,
        currency: args.defaultPriceCurrencyCode,
      };
    }
    return client.updateInAppProduct(args.packageName, args.sku, product);
  },
};

const deleteInAppProduct: ToolDef = {
  name: 'google_delete_iap',
  description: 'Delete an in-app product',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    sku: z.string().describe('Product SKU to delete'),
  }),
  handler: async (client, args) => {
    await client.deleteInAppProduct(args.packageName, args.sku);
    return { success: true };
  },
};

// ═══════════════════════════════════════════
// 11. Subscriptions (monetization)
// ═══════════════════════════════════════════

const listSubscriptions: ToolDef = {
  name: 'google_list_subscriptions',
  description: 'List all subscriptions for an app',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
  }),
  handler: async (client, args) => {
    return client.listSubscriptions(args.packageName);
  },
};

const getSubscription: ToolDef = {
  name: 'google_get_subscription',
  description: 'Get details of a specific subscription',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('Subscription product ID'),
  }),
  handler: async (client, args) => {
    return client.getSubscription(args.packageName, args.productId);
  },
};

const archiveSubscription: ToolDef = {
  name: 'google_archive_subscription',
  description: 'Archive a subscription (remove from Google Play but retain for existing subscribers)',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('Subscription product ID to archive'),
  }),
  handler: async (client, args) => {
    return client.archiveSubscription(args.packageName, args.productId);
  },
};

const createSubscription: ToolDef = {
  name: 'google_create_subscription',
  description:
    'Create a new subscription on Google Play (monetization API). Pass the full subscription body — including listings and at least one base plan with billing details and per-region pricing. Base plans are created in DRAFT state; call google_activate_subscription_base_plan to make them purchasable.',
  schema: z.object({
    packageName: z.string().describe('Android package name (e.g. com.example.app)'),
    productId: z
      .string()
      .describe('Subscription product ID, e.g. com.example.app.pro_monthly'),
    listings: z
      .array(
        z.object({
          languageCode: z.string().describe('BCP-47 locale code, e.g. en-US'),
          title: z.string().describe('Localized subscription title (max 30 chars)'),
          description: z
            .string()
            .describe('Localized description (max 80 chars)'),
          benefits: z
            .array(z.string())
            .optional()
            .describe('Up to four short benefit bullets per locale'),
        }),
      )
      .min(1)
      .describe('At least one localization is required'),
    basePlans: z
      .array(
        z.object({
          basePlanId: z
            .string()
            .describe('Stable base plan id, e.g. pro-monthly'),
          autoRenewing: z
            .object({
              billingPeriodDuration: z
                .string()
                .describe('ISO 8601 duration, e.g. P1M, P3M, P1Y'),
              gracePeriodDuration: z
                .string()
                .optional()
                .describe('ISO 8601 grace period duration, e.g. P3D'),
              accountHoldDuration: z
                .string()
                .optional()
                .describe('ISO 8601 account hold duration, e.g. P30D'),
              prorationMode: z
                .string()
                .optional()
                .describe(
                  'e.g. SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE',
                ),
              resubscribeState: z
                .string()
                .optional()
                .describe('e.g. RESUBSCRIBE_STATE_ACTIVE'),
              legacyCompatible: z.boolean().optional(),
            })
            .describe('Auto-renewing billing config. Use this for standard monthly/yearly subs.'),
          regionalConfigs: z
            .array(
              z.object({
                regionCode: z.string().describe('ISO 3166-1 alpha-2 region, e.g. US'),
                newSubscriberAvailability: z.boolean().optional().default(true),
                priceMicros: z
                  .string()
                  .describe('Price in micros, e.g. 3990000 for $3.99'),
                currency: z.string().describe('ISO 4217 currency code, e.g. USD'),
              }),
            )
            .min(1)
            .describe('At least one region price is required'),
          offerTags: z
            .array(z.string())
            .optional()
            .describe('Optional offer tag identifiers'),
        }),
      )
      .min(1)
      .describe('At least one base plan is required'),
    regionsVersion: z
      .string()
      .optional()
      .default('2022/02')
      .describe('Google Play regions version. Default 2022/02 matches Google API expectations.'),
  }),
  handler: async (client, args) => {
    const body: androidpublisher_v3.Schema$Subscription = {
      packageName: args.packageName,
      productId: args.productId,
      listings: args.listings.map((l: any) => ({
        languageCode: l.languageCode,
        title: l.title,
        description: l.description,
        benefits: l.benefits,
      })),
      basePlans: args.basePlans.map((bp: any) => {
        const priceToMoney = (micros: string, currency: string) => {
          const n = BigInt(micros);
          const unitsBig = n / 1_000_000n;
          const nanos = Number((n % 1_000_000n) * 1_000n);
          return { currencyCode: currency, units: unitsBig.toString(), nanos };
        };
        return {
          basePlanId: bp.basePlanId,
          state: 'DRAFT',
          autoRenewingBasePlanType: {
            billingPeriodDuration: bp.autoRenewing.billingPeriodDuration,
            gracePeriodDuration: bp.autoRenewing.gracePeriodDuration,
            accountHoldDuration: bp.autoRenewing.accountHoldDuration,
            prorationMode: bp.autoRenewing.prorationMode,
            resubscribeState: bp.autoRenewing.resubscribeState,
            legacyCompatible: bp.autoRenewing.legacyCompatible ?? false,
          },
          regionalConfigs: bp.regionalConfigs.map((rc: any) => ({
            regionCode: rc.regionCode,
            newSubscriberAvailability: rc.newSubscriberAvailability ?? true,
            price: priceToMoney(rc.priceMicros, rc.currency),
          })),
          offerTags: bp.offerTags?.map((t: string) => ({ tag: t })),
        };
      }),
    };
    return client.createSubscription(
      args.packageName,
      args.productId,
      body,
      args.regionsVersion,
    );
  },
};

const activateBasePlan: ToolDef = {
  name: 'google_activate_subscription_base_plan',
  description:
    'Activate a subscription base plan so it becomes purchasable. Base plans default to DRAFT after creation; this is required to make them ACTIVE.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('Subscription product ID'),
    basePlanId: z.string().describe('Base plan id to activate'),
  }),
  handler: async (client, args) => {
    return client.activateBasePlan(
      args.packageName,
      args.productId,
      args.basePlanId,
    );
  },
};

const deactivateBasePlan: ToolDef = {
  name: 'google_deactivate_subscription_base_plan',
  description: 'Deactivate a subscription base plan so it stops being purchasable.',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('Subscription product ID'),
    basePlanId: z.string().describe('Base plan id to deactivate'),
  }),
  handler: async (client, args) => {
    return client.deactivateBasePlan(args.packageName, args.productId, args.basePlanId);
  },
};

// ═══════════════════════════════════════════
// 12. One-time Products (monetization)
// ═══════════════════════════════════════════

const listOneTimeProducts: ToolDef = {
  name: 'google_list_one_time_products',
  description: 'List all one-time products (non-subscription purchases, buy or rent) for an app',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
  }),
  handler: async (client, args) => {
    return client.listOneTimeProducts(args.packageName);
  },
};

const getOneTimeProduct: ToolDef = {
  name: 'google_get_one_time_product',
  description: 'Get details of a specific one-time product',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('One-time product ID'),
  }),
  handler: async (client, args) => {
    return client.getOneTimeProduct(args.packageName, args.productId);
  },
};

const oneTimeProductPurchaseOptionSchema = z.object({
  purchaseOptionId: z.string().describe('Stable purchase option id, e.g. buy-standard'),
  buy: z
    .object({
      legacyCompatible: z.boolean().optional().describe('Marks this as the single "buy" option usable by legacy PBL flows'),
      multiQuantityEnabled: z.boolean().optional(),
    })
    .optional()
    .describe('Configures this as a one-time buy option. Mutually exclusive with rent.'),
  rent: z
    .object({
      rentalPeriod: z.string().describe('ISO 8601 duration the entitlement lasts, e.g. P30D'),
      expirationPeriod: z.string().optional().describe('ISO 8601 duration after consumption starts before the entitlement is revoked, e.g. P2D'),
    })
    .optional()
    .describe('Configures this as a rental option. Mutually exclusive with buy.'),
  regionalConfigs: z
    .array(
      z.object({
        regionCode: z.string().describe('ISO 3166-1 alpha-2 region, e.g. US'),
        priceMicros: z.string().describe('Price in micros, e.g. 3990000 for $3.99'),
        currency: z.string().describe('ISO 4217 currency code, e.g. USD'),
        availability: z.enum(['AVAILABLE', 'NOT_AVAILABLE']).optional().default('AVAILABLE'),
      }),
    )
    .min(1)
    .describe('At least one region price is required'),
  offerTags: z.array(z.string()).optional(),
});

const oneTimeProductBody = {
  packageName: z.string().describe('Android package name (e.g. com.example.app)'),
  productId: z.string().describe('One-time product ID, e.g. com.example.app.remove_ads'),
  listings: z
    .array(
      z.object({
        languageCode: z.string().describe('BCP-47 locale code, e.g. en-US'),
        title: z.string().describe('Localized title (max 55 chars)'),
        description: z.string().describe('Localized description (max 200 chars)'),
      }),
    )
    .min(1)
    .describe('At least one localization is required'),
  purchaseOptions: z.array(oneTimeProductPurchaseOptionSchema).min(1).describe('At least one purchase option (buy or rent) is required'),
  regionsVersion: z
    .string()
    .optional()
    .default('2022/02')
    .describe('Google Play regions version. Default 2022/02 matches Google API expectations.'),
};

function buildOneTimeProduct(args: any): androidpublisher_v3.Schema$OneTimeProduct {
  const priceToMoney = (micros: string, currency: string) => {
    const n = BigInt(micros);
    const unitsBig = n / 1_000_000n;
    const nanos = Number((n % 1_000_000n) * 1_000n);
    return { currencyCode: currency, units: unitsBig.toString(), nanos };
  };
  return {
    packageName: args.packageName,
    productId: args.productId,
    listings: args.listings.map((l: any) => ({
      languageCode: l.languageCode,
      title: l.title,
      description: l.description,
    })),
    purchaseOptions: args.purchaseOptions.map((po: any) => ({
      purchaseOptionId: po.purchaseOptionId,
      buyOption: po.buy
        ? { legacyCompatible: po.buy.legacyCompatible ?? false, multiQuantityEnabled: po.buy.multiQuantityEnabled ?? false }
        : undefined,
      rentOption: po.rent ? { rentalPeriod: po.rent.rentalPeriod, expirationPeriod: po.rent.expirationPeriod } : undefined,
      regionalPricingAndAvailabilityConfigs: po.regionalConfigs.map((rc: any) => ({
        regionCode: rc.regionCode,
        price: priceToMoney(rc.priceMicros, rc.currency),
        availability: rc.availability ?? 'AVAILABLE',
      })),
      offerTags: po.offerTags?.map((t: string) => ({ tag: t })),
    })),
  };
}

const createOneTimeProduct: ToolDef = {
  name: 'google_create_one_time_product',
  description:
    'Create a new one-time product (buy or rent) on Google Play using the monetization.onetimeproducts API. Existing product IDs are rejected; use google_update_one_time_product to modify one. Purchase options are created ACTIVE by default.',
  schema: z.object(oneTimeProductBody),
  handler: async (client, args) => {
    const body = buildOneTimeProduct(args);
    return client.createOneTimeProduct(args.packageName, args.productId, body, args.regionsVersion);
  },
};

const updateOneTimeProduct: ToolDef = {
  name: 'google_update_one_time_product',
  description: 'Update an existing one-time product. Pass the full desired listings/purchaseOptions state plus an updateMask (e.g. "listings,purchaseOptions").',
  schema: z.object({
    ...oneTimeProductBody,
    updateMask: z.string().describe('Comma-separated field mask of top-level fields to update, e.g. "listings,purchaseOptions"'),
  }),
  handler: async (client, args) => {
    const body = buildOneTimeProduct(args);
    return client.upsertOneTimeProduct(args.packageName, args.productId, body, {
      allowMissing: false,
      updateMask: args.updateMask,
      regionsVersionVersion: args.regionsVersion,
    });
  },
};

const deleteOneTimeProduct: ToolDef = {
  name: 'google_delete_one_time_product',
  description: 'Delete a one-time product',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('One-time product ID to delete'),
  }),
  handler: async (client, args) => {
    await client.deleteOneTimeProduct(args.packageName, args.productId);
    return { success: true };
  },
};

const activatePurchaseOption: ToolDef = {
  name: 'google_activate_purchase_option',
  description: 'Activate a one-time product purchase option so it becomes available for purchase',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('One-time product ID'),
    purchaseOptionId: z.string().describe('Purchase option ID to activate'),
  }),
  handler: async (client, args) => {
    return client.setPurchaseOptionState(args.packageName, args.productId, args.purchaseOptionId, 'activate');
  },
};

const deactivatePurchaseOption: ToolDef = {
  name: 'google_deactivate_purchase_option',
  description: 'Deactivate a one-time product purchase option so it stops being available for purchase',
  schema: z.object({
    packageName: z.string().describe('Android package name'),
    productId: z.string().describe('One-time product ID'),
    purchaseOptionId: z.string().describe('Purchase option ID to deactivate'),
  }),
  handler: async (client, args) => {
    return client.setPurchaseOptionState(args.packageName, args.productId, args.purchaseOptionId, 'deactivate');
  },
};

// ═══════════════════════════════════════════
// Export all tools
// ═══════════════════════════════════════════

export const googleTools: ToolDef[] = [
  // Edit lifecycle
  createEdit, commitEdit, validateEdit, deleteEdit,
  // Play App Signing
  enrollAppSigning, rotateAppSigningKey,
  // App details
  getDetails, updateDetails,
  // Store listing
  listListings, getListing, updateListing, deleteListing,
  // Country availability & Testers
  getCountryAvailability, getTesters, updateTesters,
  // Images
  listImages, uploadImage, deleteImage, deleteAllImages,
  // Tracks & Releases
  listTracks, getTrack, createRelease, promoteRelease, haltRelease,
  // Bundle / APK
  uploadBundle, uploadApk,
  // Reviews
  listReviews, getReview, replyToReview,
  // In-App Products
  listInAppProducts, getInAppProduct, createInAppProduct, updateInAppProduct, deleteInAppProduct,
  // Subscriptions
  listSubscriptions, getSubscription, createSubscription, archiveSubscription,
  activateBasePlan, deactivateBasePlan,
  // One-time Products
  listOneTimeProducts, getOneTimeProduct, createOneTimeProduct, updateOneTimeProduct, deleteOneTimeProduct,
  activatePurchaseOption, deactivatePurchaseOption,
];
