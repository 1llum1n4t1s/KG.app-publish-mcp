import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { GoogleClient } from '../src/google/client.js';
import { googleTools } from '../src/google/tools.js';

const tempDir = mkdtempSync(join(tmpdir(), 'app-publish-signing-test-'));
const resolvedTempDir = resolve(tempDir);
assert.ok(resolvedTempDir.startsWith(resolve(tmpdir())), 'test directory must stay inside the OS temp directory');

const signingPem = '-----BEGIN CERTIFICATE-----\nU0lHTklORw==\n-----END CERTIFICATE-----\n';
const uploadPem = '-----BEGIN CERTIFICATE-----\nVVBMT0FE\n-----END CERTIFICATE-----\n';
const signingPemPath = join(tempDir, 'signing.pem');
const uploadPemPath = join(tempDir, 'upload.pem');
const lineagePath = join(tempDir, 'lineage.bin');
writeFileSync(signingPemPath, signingPem);
writeFileSync(uploadPemPath, uploadPem);
writeFileSync(lineagePath, Buffer.from([0x01, 0x02, 0x03, 0x04]));

after(() => rmSync(resolvedTempDir, { recursive: true, force: true }));

function mockClient(appsigning: Record<string, unknown>): GoogleClient {
  const client = new GoogleClient({ clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh' });
  (client as unknown as { publisher: unknown }).publisher = { appsigning };
  return client;
}

test('enrollAppSigning builds a new-app Cloud KMS request and base64-encodes certificates', async () => {
  let captured: any;
  const client = mockClient({
    enrollApp: async (params: any) => {
      captured = params;
      return { data: { signingCertificate: { certificateHashSha256: 'AA:BB' } } };
    },
  });

  const result = await client.enrollAppSigning('com.example.app', {
    enrollmentType: 'new',
    cloudKmsKeyVersionResource: 'projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
    pemCertificatePath: signingPemPath,
    pemUploadCertificatePath: uploadPemPath,
  });

  assert.equal(captured.name, 'com.example.app');
  assert.equal(captured.requestBody.enrollExistingApp, undefined);
  assert.equal(
    captured.requestBody.enrollNewApp.cloudKmsKeyAndCert.cloudKmsKey.cryptoKeyVersionResource,
    'projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
  );
  assert.equal(captured.requestBody.enrollNewApp.cloudKmsKeyAndCert.pemCertificate, Buffer.from(signingPem).toString('base64'));
  assert.equal(captured.requestBody.pemUploadCertificate, Buffer.from(uploadPem).toString('base64'));
  assert.equal(result.signingCertificate?.certificateHashSha256, 'AA:BB');
});

test('enrollAppSigning builds an existing-app Cloud KMS request', async () => {
  let captured: any;
  const client = mockClient({
    enrollApp: async (params: any) => {
      captured = params;
      return { data: { signingCertificate: { certificateHashSha1: 'CC:DD' } } };
    },
  });

  await client.enrollAppSigning('com.example.existing', {
    enrollmentType: 'existing',
    cloudKmsKeyVersionResource: 'projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/2',
  });

  assert.equal(captured.requestBody.enrollNewApp, undefined);
  assert.equal(
    captured.requestBody.enrollExistingApp.cloudKmsKey.cryptoKeyVersionResource,
    'projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/2',
  );
});

test('rotateAppSigningKey builds the KMS rotation request with proof-of-rotation bytes', async () => {
  let captured: any;
  const client = mockClient({
    rotateAppSigningKey: async (params: any) => {
      captured = params;
      return { data: { rotatedKeyCertificate: { certificateHashMd5: 'EE:FF' } } };
    },
  });

  const result = await client.rotateAppSigningKey('com.example.app', {
    cloudKmsKeyVersionResource: 'projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/3',
    pemCertificatePath: signingPemPath,
    signingCertificateLineagePath: lineagePath,
    keyRotationReason: 'ROUTINE_KEY_UPGRADE',
  });

  assert.equal(captured.requestBody.keyRotationReason, 'ROUTINE_KEY_UPGRADE');
  assert.equal(captured.requestBody.rotatedCloudKmsKey.cloudKmsKeyAndCert.pemCertificate, Buffer.from(signingPem).toString('base64'));
  assert.equal(captured.requestBody.rotatedCloudKmsKey.signingCertificateLineage, Buffer.from([1, 2, 3, 4]).toString('base64'));
  assert.equal(result.rotatedKeyCertificate?.certificateHashMd5, 'EE:FF');
});

test('app-signing tool schemas require explicit confirmation and valid enrollment inputs', () => {
  const enroll = googleTools.find(tool => tool.name === 'google_enroll_app_signing');
  const rotate = googleTools.find(tool => tool.name === 'google_rotate_app_signing_key');
  assert.ok(enroll);
  assert.ok(rotate);

  const base = {
    packageName: 'com.example.app',
    enrollmentType: 'new',
    cloudKmsKeyVersionResource: 'projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
  };
  assert.equal(enroll.schema.safeParse({ ...base, confirmSelfHostedKms: false }).success, false);
  assert.equal(enroll.schema.safeParse({ ...base, confirmSelfHostedKms: true }).success, false);
  assert.equal(
    enroll.schema.safeParse({ ...base, pemCertificatePath: signingPemPath, confirmSelfHostedKms: true }).success,
    true,
  );
  assert.equal(
    rotate.schema.safeParse({
      packageName: 'com.example.app',
      cloudKmsKeyVersionResource: 'invalid-key-name',
      pemCertificatePath: signingPemPath,
      signingCertificateLineagePath: lineagePath,
      keyRotationReason: 'ROUTINE_KEY_UPGRADE',
      confirmSelfHostedKms: true,
    }).success,
    false,
  );
});
