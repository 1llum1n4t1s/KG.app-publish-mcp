import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { AppleClient } from '../../dist/apple/client.js';
import { GoogleClient } from '../../dist/google/client.js';
import { getGoogleTokenPath, loadSavedGoogleToken } from '../../dist/auth.js';

// ファイルと通信だけを置き換え、実際のハンドラーと分割送信を通す。
const originalRead = fs.readFileSync;
const initialBytes = Buffer.from('snapshot');
let currentBytes = initialBytes;
let reads = 0;
let tokenContents;
fs.readFileSync = function (path, ...args) {
  if (path === 'fixture-screenshot.png') {
    reads += 1;
    return Buffer.from(currentBytes);
  }
  if (path === getGoogleTokenPath()) {
    if (tokenContents instanceof Error) throw tokenContents;
    return tokenContents;
  }
  return originalRead.call(this, path, ...args);
};
syncBuiltinESMExports();

// 保存トークンの不足・読込不能・不正形式は、すべて未設定扱いになる。
for (const contents of [Object.assign(new Error('missing'), { code: 'ENOENT' }),
  Object.assign(new Error('unreadable'), { code: 'EACCES' }), '{', '{}']) {
  tokenContents = contents;
  assert.equal(loadSavedGoogleToken(), null);
}
tokenContents = JSON.stringify({ clientId: 'fixture', clientSecret: 'fixture', refreshToken: 'fixture' });
assert.equal(loadSavedGoogleToken()?.refreshToken, 'fixture');

let uploads = 0;
globalThis.fetch = async (url, init) => {
  assert.equal(url, `https://uploads.example/${uploads}`);
  assert.equal(init.method, uploads === 0 ? 'PUT' : 'POST');
  assert.deepEqual(init.headers, { 'X-Upload-Part': String(uploads) });
  assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual(init.body, initialBytes.subarray(uploads * 4, uploads * 4 + 4));
  uploads += 1;
  return new Response(null, { status: 204 });
};
AppleClient.prototype.request = async function (path, options = {}) {
  // MCP initialize後の最初のツール呼出しで、実際にロードされたAPIを確認する。
  const require = createRequire(import.meta.url);
  const loadedAPIs = Object.keys(require.cache)
    .map(path => path.replaceAll('\\', '/'))
    .filter(path => path.includes('/googleapis/build/src/apis/'));
  assert.ok(loadedAPIs.some(path => path.includes('/androidpublisher/v3.js')));
  assert.deepEqual(loadedAPIs.filter(path => !path.includes('/apis/androidpublisher/')), [],
    'Android Publisher以外のAPIを起動時にロードしない');
  if (path === '/appScreenshots' && options.method === 'POST') {
    assert.equal(options.body.data.attributes.fileSize, initialBytes.length);
    currentBytes = Buffer.from('changed-after-reservation');
    return { data: { id: 'screenshot', attributes: { uploadOperations: [0, 1].map(part => ({
      url: `https://uploads.example/${part}`, method: part === 0 ? 'PUT' : 'POST',
      offset: part * 4, length: 4,
      requestHeaders: [{ name: 'X-Upload-Part', value: String(part) }],
    })) } } };
  }
  assert.equal(path, '/appScreenshots/screenshot');
  assert.equal(options.method, 'PATCH');
  assert.deepEqual(options.body.data.attributes, {
    uploaded: true, sourceFileChecksum: createHash('md5').update(initialBytes).digest('hex'),
  });
  assert.equal(uploads, 2);
  assert.equal(reads, 1, '予約・全分割送信・checksumには同じ読込結果を使う');
  return { data: { id: 'screenshot' } };
};

// 実際のSDK factory・OAuth認証・HTTP要求生成を通し、最終通信だけを置き換える。
const adapterClient = new GoogleClient({ clientId: 'fixture', clientSecret: 'fixture', refreshToken: 'fixture' });
assert.equal(Object.isFrozen(adapterClient.api), true);
const auth = adapterClient.api.context._options.auth;
auth.setCredentials({ access_token: 'fixture-access-token', expiry_date: Date.now() + 3_600_000 });
let requests = 0;
auth.transporter.defaults.adapter = async options => {
  requests += 1;
  assert.equal(String(options.url), 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.fixture/edits/edit/tracks');
  assert.equal(options.method, 'GET');
  assert.equal(options.headers.get('authorization'), 'Bearer fixture-access-token');
  return { config: options, data: { tracks: [{ track: 'internal' }] },
    status: 200, statusText: 'OK', headers: new Headers() };
};
assert.deepEqual(await adapterClient.listTracks('com.example.fixture', 'edit'), [{ track: 'internal' }]);
assert.equal(requests, 1);

GoogleClient.prototype.createSubscription = async function (packageName, productId, body) {
  return body;
};
GoogleClient.prototype.createOneTimeProduct = async function (packageName, productId, body) {
  return body;
};
