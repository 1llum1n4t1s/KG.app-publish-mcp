import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { AppleApiError, AppleClient } from '../src/apple/client.js';
import { appleTools } from '../src/apple/tools.js';
import { getBrowserOpenCommand, parseSavedGoogleToken, waitForOAuthCode } from '../src/auth.js';
import { GoogleClient } from '../src/google/client.js';
import { formatGoogleApiError, GOOGLE_NOT_CONFIGURED_MESSAGE } from '../src/google/errors.js';
import { googleTools } from '../src/google/tools.js';

function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = get(url, { agent: false }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => resolve({ statusCode: response.statusCode ?? 0, body }));
    });
    request.once('error', reject);
  });
}

function mockGoogleClient(publisher: unknown): GoogleClient {
  const client = new GoogleClient({ clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh' });
  (client as unknown as { publisher: unknown }).publisher = publisher;
  return client;
}

test('Windows browser launch keeps the complete OAuth URL outside cmd.exe', () => {
  const url = 'https://accounts.example/auth?access_type=offline&scope=test';
  const command = getBrowserOpenCommand(url, 'win32');
  assert.equal(command.file, 'rundll32.exe');
  assert.deepEqual(command.args, ['url.dll,FileProtocolHandler', url]);
  assert.equal(command.args.includes('cmd'), false);
});

test('OAuth callback binds to loopback and ignores a callback with the wrong state', async () => {
  let announceListening!: (address: { host: string; port: number }) => void;
  const listening = new Promise<{ host: string; port: number }>(resolve => {
    announceListening = resolve;
  });

  const codePromise = waitForOAuthCode('https://accounts.example/auth', 'expected-state', {
    port: 0,
    timeoutMs: 2_000,
    openBrowser: () => {},
    log: () => {},
    onListening: announceListening,
  });
  const address = await listening;
  assert.equal(address.host, '127.0.0.1');

  const invalid = await httpGet(`http://${address.host}:${address.port}/callback?state=wrong&code=attacker`);
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body, 'Invalid OAuth state');

  const valid = await httpGet(`http://${address.host}:${address.port}/callback?state=expected-state&code=valid-code`);
  assert.equal(valid.statusCode, 200);
  assert.equal(await codePromise, 'valid-code');
});

test('OAuth callback reports a busy port immediately without launching the browser', async () => {
  const occupied = createServer();
  await new Promise<void>((resolve, reject) => {
    occupied.once('error', reject);
    occupied.listen(0, '127.0.0.1', resolve);
  });
  const address = occupied.address();
  assert.ok(address && typeof address === 'object');
  let browserLaunched = false;

  try {
    await assert.rejects(
      () => waitForOAuthCode('https://accounts.example/auth', 'state', {
        port: address.port,
        timeoutMs: 2_000,
        openBrowser: () => {
          browserLaunched = true;
        },
        log: () => {},
      }),
      /OAuth callback server failed:[\s\S]*EADDRINUSE/,
    );
  } finally {
    await new Promise<void>(resolve => occupied.close(() => resolve()));
  }

  assert.equal(browserLaunched, false);
});

test('apple_submit_for_review cancels a submission when attaching the version fails', async () => {
  const tool = appleTools.find(candidate => candidate.name === 'apple_submit_for_review');
  assert.ok(tool);
  const calls: Array<{ path: string; options: any }> = [];
  const client = {
    request: async (path: string, options: any) => {
      calls.push({ path, options });
      if (calls.length === 1) return { data: { id: 'submission-attach' } };
      if (calls.length === 2) throw new Error('usesNonExemptEncryption is missing');
      return { data: { id: 'submission-attach' } };
    },
  };

  await assert.rejects(
    () => tool.handler(client as any, { appId: 'app', versionId: 'version', platform: 'IOS' }),
    error => {
      assert.match((error as Error).message, /Review submission ID: submission-attach/);
      assert.match((error as Error).message, /automatically canceled/);
      assert.match((error as Error).message, /ITSAppUsesNonExemptEncryption/);
      return true;
    },
  );
  assert.equal(calls[2].path, '/reviewSubmissions/submission-attach');
  assert.equal(calls[2].options.body.data.attributes.canceled, true);
});

test('apple_submit_for_review preserves the submission ID when submit and cleanup both fail', async () => {
  const tool = appleTools.find(candidate => candidate.name === 'apple_submit_for_review');
  assert.ok(tool);
  let call = 0;
  const client = {
    request: async () => {
      call += 1;
      if (call === 1) return { data: { id: 'submission-submit' } };
      if (call === 2) return { data: { id: 'item' } };
      if (call === 3) throw new Error('submit failed');
      throw new Error('cancel failed');
    },
  };

  await assert.rejects(
    () => tool.handler(client as any, { appId: 'app', versionId: 'version', platform: 'IOS' }),
    /Review submission ID: submission-submit[\s\S]*Automatic cancellation failed: cancel failed[\s\S]*apple_cancel_submission/,
  );
});

test('google_promote_release selects the newest active source release independent of array order', async () => {
  const tool = googleTools.find(candidate => candidate.name === 'google_promote_release');
  assert.ok(tool);
  let updatedRelease: any;
  const client = {
    getTrack: async (_packageName: string, _editId: string, track: string) => track === 'beta'
      ? {
          releases: [
            { status: 'draft', versionCodes: ['999'] },
            { status: 'completed', versionCodes: ['123'] },
            { status: 'completed', versionCodes: ['200'], releaseNotes: [{ language: 'ja-JP', text: '最新です' }] },
          ],
        }
      : { releases: [] },
    updateTrack: async (_packageName: string, _editId: string, _track: string, releases: any[]) => {
      updatedRelease = releases[0];
      return { releases };
    },
  };

  await tool.handler(client as any, {
    packageName: 'com.example.app',
    editId: 'edit',
    fromTrack: 'beta',
    toTrack: 'production',
  });
  assert.deepEqual(updatedRelease.versionCodes, ['200']);
  assert.equal(updatedRelease.status, 'completed');
  assert.deepEqual(updatedRelease.releaseNotes, [{ language: 'ja-JP', text: '最新です' }]);
});

test('google_promote_release refuses to replace a different staged rollout', async () => {
  const tool = googleTools.find(candidate => candidate.name === 'google_promote_release');
  assert.ok(tool);
  let updateCalled = false;
  const client = {
    getTrack: async (_packageName: string, _editId: string, track: string) => track === 'beta'
      ? { releases: [{ status: 'completed', versionCodes: ['200'] }] }
      : { releases: [{ status: 'inProgress', versionCodes: ['100'], userFraction: 0.25 }] },
    updateTrack: async () => {
      updateCalled = true;
    },
  };

  await assert.rejects(
    () => tool.handler(client as any, {
      packageName: 'com.example.app',
      editId: 'edit',
      fromTrack: 'beta',
      toTrack: 'production',
    }),
    /staged rollout in progress[\s\S]*would replace it/,
  );
  assert.equal(updateCalled, false);
});

test('google_create_release defaults to draft, requires version codes, and preserves other releases', async () => {
  const tool = googleTools.find(candidate => candidate.name === 'google_create_release');
  assert.ok(tool);
  assert.equal(tool.schema.safeParse({ packageName: 'app', editId: 'edit', track: 'production' }).success, false);
  assert.equal(tool.schema.safeParse({
    packageName: 'app', editId: 'edit', track: 'production', versionCodes: ['200'], status: 'completed', userFraction: 0.5,
  }).success, false);

  const args = tool.schema.parse({
    packageName: 'app', editId: 'edit', track: 'production', versionCodes: ['200'],
  });
  assert.equal(args.status, 'draft');

  let updated: any[] = [];
  const client = {
    getTrack: async () => ({
      releases: [
        { status: 'completed', versionCodes: ['100'], name: 'stable' },
        { status: 'draft', versionCodes: ['200'], name: 'candidate', releaseNotes: [{ language: 'en-US', text: 'Keep me' }] },
      ],
    }),
    updateTrack: async (_packageName: string, _editId: string, _track: string, releases: any[]) => {
      updated = releases;
      return { releases };
    },
  };

  await tool.handler(client as any, args);
  assert.equal(updated.length, 2);
  assert.equal(updated[0].name, 'stable');
  assert.equal(updated[1].name, 'candidate');
  assert.equal(updated[1].status, 'draft');
  assert.equal(updated[1].releaseNotes[0].text, 'Keep me');
});

test('google_promote_release preserves unrelated destination releases', async () => {
  const tool = googleTools.find(candidate => candidate.name === 'google_promote_release');
  assert.ok(tool);
  let updated: any[] = [];
  const client = {
    getTrack: async (_packageName: string, _editId: string, track: string) => track === 'beta'
      ? { releases: [{ status: 'completed', versionCodes: ['200'] }] }
      : { releases: [{ status: 'completed', versionCodes: ['100'], name: 'stable' }] },
    updateTrack: async (_packageName: string, _editId: string, _track: string, releases: any[]) => {
      updated = releases;
      return { releases };
    },
  };

  await tool.handler(client as any, {
    packageName: 'app', editId: 'edit', fromTrack: 'beta', toTrack: 'production',
  });
  assert.deepEqual(updated.map(release => release.versionCodes), [['100'], ['200']]);
});

test('legacy IAP tools auto-convert missing prices only when setting a default price', async () => {
  const calls: any[] = [];
  const client = mockGoogleClient({
    inappproducts: {
      insert: async (params: any) => {
        calls.push(params);
        return { data: {} };
      },
      patch: async (params: any) => {
        calls.push(params);
        return { data: {} };
      },
    },
  });

  await client.createInAppProduct('app', { sku: 'one', defaultPrice: { currency: 'USD', priceMicros: '990000' } });
  await client.updateInAppProduct('app', 'one', { defaultPrice: { currency: 'USD', priceMicros: '1990000' } });
  await client.updateInAppProduct('app', 'one', { status: 'active' });

  assert.equal(calls[0].autoConvertMissingPrices, true);
  assert.equal(calls[1].autoConvertMissingPrices, true);
  assert.equal(calls[2].autoConvertMissingPrices, false);

  const tool = googleTools.find(candidate => candidate.name === 'google_create_iap');
  assert.ok(tool);
  assert.equal(tool.schema.safeParse({
    packageName: 'app', sku: 'sub', defaultLanguage: 'en-US', defaultTitle: 'Sub', defaultDescription: 'Sub',
    purchaseType: 'subscription', defaultPriceCurrencyCode: 'USD', defaultPriceMicros: '990000',
  }).success, false);
});

test('google_update_iap merges a listing update without dropping other locales or fields', async () => {
  const tool = googleTools.find(candidate => candidate.name === 'google_update_iap');
  assert.ok(tool);
  let updatedProduct: any;
  const client = {
    getInAppProduct: async () => ({
      defaultLanguage: 'ja-JP',
      listings: {
        'ja-JP': { title: '旧タイトル', description: '既存の説明' },
        'en-US': { title: 'Old title', description: 'Existing description' },
      },
    }),
    updateInAppProduct: async (_packageName: string, _sku: string, product: any) => {
      updatedProduct = product;
      return product;
    },
  };

  await tool.handler(client as any, {
    packageName: 'com.example.app',
    sku: 'premium',
    title: '新タイトル',
  });

  assert.deepEqual(updatedProduct.listings, {
    'ja-JP': { title: '新タイトル', description: '既存の説明' },
    'en-US': { title: 'Old title', description: 'Existing description' },
  });
  assert.equal(updatedProduct.defaultLanguage, undefined);
});

test('Apple client applies abort deadlines to API requests and both upload paths', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'app-publish-timeout-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const uploadPath = join(directory, 'upload.bin');
  writeFileSync(uploadPath, Buffer.from('upload'));

  const client = new AppleClient({ keyId: 'key', issuerId: 'issuer', p8Path: 'unused' });
  (client as unknown as { getToken: () => string }).getToken = () => 'token';
  const originalFetch = globalThis.fetch;
  const signals: AbortSignal[] = [];
  globalThis.fetch = async (_input, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    signals.push(init.signal);
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await client.request('/apps');
  await client.upload('https://uploads.example/file', uploadPath, 'application/octet-stream');
  await client.uploadOperation({ method: 'PUT', url: 'https://uploads.example/chunk' }, uploadPath);

  assert.equal(signals.length, 3);
  assert.equal(signals.every(signal => !signal.aborted), true);
});

test('apple_update_review_detail creates review details after a 404 relationship lookup', async () => {
  const tool = appleTools.find(candidate => candidate.name === 'apple_update_review_detail');
  assert.ok(tool);
  const calls: Array<{ path: string; options?: any }> = [];
  const client = {
    request: async (path: string, options?: any) => {
      calls.push({ path, options });
      if (calls.length === 1) {
        throw new AppleApiError('not found', 404, 'GET', path, '{}');
      }
      return { data: { id: 'review-detail' } };
    },
  };

  const result = await tool.handler(client as any, { versionId: 'version', contactEmail: 'review@example.com' });
  assert.equal(result.data.id, 'review-detail');
  assert.equal(calls[1].path, '/appStoreReviewDetails');
  assert.equal(calls[1].options.body.data.relationships.appStoreVersion.data.id, 'version');
});

test('apple_upload_screenshot deletes a reservation when upload operations are missing', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'app-publish-screenshot-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const imagePath = join(directory, 'screen.png');
  writeFileSync(imagePath, Buffer.from('screenshot'));
  const tool = appleTools.find(candidate => candidate.name === 'apple_upload_screenshot');
  assert.ok(tool);
  const calls: Array<{ path: string; options?: any }> = [];
  const client = {
    request: async (path: string, options?: any) => {
      calls.push({ path, options });
      if (calls.length === 1) return { data: { id: 'shot-1', attributes: {} } };
      return {};
    },
    uploadOperation: async () => {},
  };

  await assert.rejects(
    () => tool.handler(client as any, { screenshotSetId: 'set', filePath: imagePath, fileName: 'screen.png' }),
    /did not return upload operations[\s\S]*Screenshot ID: shot-1[\s\S]*was deleted/,
  );
  assert.equal(calls[1].path, '/appScreenshots/shot-1');
  assert.equal(calls[1].options.method, 'DELETE');
});

test('apple_upload_screenshot reports the reservation ID when automatic deletion fails', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'app-publish-screenshot-cleanup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const imagePath = join(directory, 'screen.png');
  writeFileSync(imagePath, Buffer.from('screenshot'));
  const tool = appleTools.find(candidate => candidate.name === 'apple_upload_screenshot');
  assert.ok(tool);
  let calls = 0;
  const client = {
    request: async () => {
      calls += 1;
      if (calls === 1) return { data: { id: 'shot-cleanup', attributes: {} } };
      throw new Error('delete failed');
    },
    uploadOperation: async () => {},
  };

  await assert.rejects(
    () => tool.handler(client as any, { screenshotSetId: 'set', filePath: imagePath, fileName: 'screen.png' }),
    /Screenshot ID: shot-cleanup[\s\S]*Automatic deletion failed: delete failed[\s\S]*apple_delete_screenshot/,
  );
});

test('saved Google OAuth token parsing rejects incomplete or empty credentials', () => {
  assert.equal(parseSavedGoogleToken('{"clientId":"client"}'), null);
  assert.equal(parseSavedGoogleToken('{"clientId":"client","clientSecret":"","refreshToken":"refresh"}'), null);
  assert.equal(parseSavedGoogleToken('not-json'), null);
  assert.deepEqual(
    parseSavedGoogleToken('{"clientId":"client","clientSecret":"secret","refreshToken":"refresh","savedAt":"now"}'),
    { clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh', savedAt: 'now' },
  );
});

test('Google image upload accepts matching PNG data and rejects unsupported or mismatched files', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'app-publish-image-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const pngPath = join(directory, 'valid.png');
  const badPngPath = join(directory, 'bad.png');
  const webpPath = join(directory, 'image.webp');
  writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
  writeFileSync(badPngPath, Buffer.from('not png'));
  writeFileSync(webpPath, Buffer.from('RIFF....WEBP'));
  let uploads = 0;
  let mimeType: string | undefined;
  const client = mockGoogleClient({
    edits: {
      images: {
        upload: async (params: any) => {
          uploads += 1;
          mimeType = params.media.mimeType;
          return { data: {} };
        },
      },
    },
  });

  await client.uploadImage('app', 'edit', 'en-US', 'phoneScreenshots', pngPath);
  assert.equal(mimeType, 'image/png');
  await assert.rejects(() => client.uploadImage('app', 'edit', 'en-US', 'phoneScreenshots', badPngPath), /does not match/);
  await assert.rejects(() => client.uploadImage('app', 'edit', 'en-US', 'phoneScreenshots', webpPath), /Unsupported image extension/);
  assert.equal(uploads, 1);
});

test('Google catalog list methods merge every API page', async () => {
  const iapTokens: Array<string | undefined> = [];
  const subscriptionTokens: Array<string | undefined> = [];
  const oneTimeTokens: Array<string | undefined> = [];
  const client = mockGoogleClient({
    inappproducts: {
      list: async ({ token }: { token?: string }) => {
        iapTokens.push(token);
        return token
          ? { data: { inappproduct: [{ sku: 'iap-2' }] } }
          : { data: { inappproduct: [{ sku: 'iap-1' }], tokenPagination: { nextPageToken: 'iap-next' } } };
      },
    },
    monetization: {
      subscriptions: {
        list: async ({ pageToken }: { pageToken?: string }) => {
          subscriptionTokens.push(pageToken);
          return pageToken
            ? { data: { subscriptions: [{ productId: 'sub-2' }] } }
            : { data: { subscriptions: [{ productId: 'sub-1' }], nextPageToken: 'sub-next' } };
        },
      },
      onetimeproducts: {
        list: async ({ pageToken }: { pageToken?: string }) => {
          oneTimeTokens.push(pageToken);
          return pageToken
            ? { data: { oneTimeProducts: [{ productId: 'one-2' }] } }
            : { data: { oneTimeProducts: [{ productId: 'one-1' }], nextPageToken: 'one-next' } };
        },
      },
    },
  });

  const iap = await client.listInAppProducts('com.example.app');
  const subscriptions = await client.listSubscriptions('com.example.app');
  const oneTime = await client.listOneTimeProducts('com.example.app');

  assert.deepEqual(iap.map(product => product.sku), ['iap-1', 'iap-2']);
  assert.deepEqual(subscriptions.map(product => product.productId), ['sub-1', 'sub-2']);
  assert.deepEqual(oneTime.oneTimeProducts.map(product => product.productId), ['one-1', 'one-2']);
  assert.equal(oneTime.nextPageToken, null);
  assert.deepEqual(iapTokens, [undefined, 'iap-next']);
  assert.deepEqual(subscriptionTokens, [undefined, 'sub-next']);
  assert.deepEqual(oneTimeTokens, [undefined, 'one-next']);
});

test('Google listing updates use PATCH so omitted listing fields are preserved by the API', async () => {
  let patchParams: any;
  let updateCalled = false;
  const client = mockGoogleClient({
    edits: {
      listings: {
        patch: async (params: any) => {
          patchParams = params;
          return { data: params.requestBody };
        },
        update: async () => {
          updateCalled = true;
          return { data: {} };
        },
      },
    },
  });

  await client.updateListing('com.example.app', 'edit', 'ja-JP', { title: '新タイトル' });

  assert.deepEqual(patchParams, {
    packageName: 'com.example.app',
    editId: 'edit',
    language: 'ja-JP',
    requestBody: { title: '新タイトル' },
  });
  assert.equal(updateCalled, false);
});

test('one-time product creation rejects existing IDs and only creates after a 404 preflight', async () => {
  let existingPatchCalled = false;
  const existingClient = mockGoogleClient({
    monetization: {
      onetimeproducts: {
        get: async () => ({ data: { productId: 'premium' } }),
        patch: async () => {
          existingPatchCalled = true;
          return { data: {} };
        },
      },
    },
  });

  await assert.rejects(
    () => existingClient.createOneTimeProduct('com.example.app', 'premium', { listings: [] }, '2025/01'),
    /already exists[\s\S]*google_update_one_time_product/,
  );
  assert.equal(existingPatchCalled, false);

  let createParams: any;
  const missingClient = mockGoogleClient({
    monetization: {
      onetimeproducts: {
        get: async () => {
          throw { response: { status: 404 } };
        },
        patch: async (params: any) => {
          createParams = params;
          return { data: params.requestBody };
        },
      },
    },
  });

  await missingClient.createOneTimeProduct('com.example.app', 'premium', { listings: [] }, '2025/01');
  assert.equal(createParams.allowMissing, true);
  assert.equal(createParams.updateMask, '*');
  assert.equal(createParams['regionsVersion.version'], '2025/01');
});

test('Google API errors include response details without serializing credentials', () => {
  const formatted = formatGoogleApiError({
    message: 'Request failed with status code 400',
    response: {
      status: 400,
      data: {
        error: {
          code: 400,
          message: 'Invalid track state',
          status: 'INVALID_ARGUMENT',
          errors: [{ reason: 'invalid', message: 'Invalid track state' }],
        },
      },
      headers: { authorization: 'Bearer secret' },
    },
    config: { headers: { authorization: 'Bearer secret' } },
  });

  assert.match(formatted, /Invalid track state/);
  assert.match(formatted, /INVALID_ARGUMENT/);
  assert.doesNotMatch(formatted, /Bearer secret/);
  assert.match(GOOGLE_NOT_CONFIGURED_MESSAGE, /GOOGLE_SERVICE_ACCOUNT_PATH/);
  assert.match(GOOGLE_NOT_CONFIGURED_MESSAGE, /GOOGLE_REFRESH_TOKEN/);
  assert.match(GOOGLE_NOT_CONFIGURED_MESSAGE, /auth google/);
});
