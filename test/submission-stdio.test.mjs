import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

for (const lostResponse of [false, true]) {
  test(`ビルド済みstdio: 4項目の提出と再実行（応答喪失=${lostResponse}）`, { timeout: 30_000 }, async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--import', new URL('./fixtures/apple-review.mjs', import.meta.url).href,
        fileURLToPath(new URL('../dist/cli.js', import.meta.url))],
      env: {
        APPLE_KEY_ID: 'fixture', APPLE_ISSUER_ID: 'fixture', APPLE_P8_PATH: 'unused-fixture-key',
        GOOGLE_CLIENT_ID: 'fixture', GOOGLE_CLIENT_SECRET: 'fixture', GOOGLE_REFRESH_TOKEN: 'fixture',
        REVIEW_FIXTURE_LOST_RESPONSE: lostResponse ? '1' : '0',
      },
      stderr: 'pipe',
    });
    const client = new Client({ name: 'review-regression', version: '1.0.0' });
    let stderr = '';
    transport.stderr?.on('data', data => { stderr += data; });
    try {
      await client.connect(transport);
      const listed = await client.listTools();
      const tool = listed.tools.find(item => item.name === 'apple_submit_for_review');
      assert.ok(tool?.inputSchema.properties?.submissionId);
      const args = { appId: 'app', versionId: 'version', platform: 'IOS', submissionId: 'draft' };
      for (const submissionId of ['', '   ']) {
        const invalid = await client.callTool({ name: tool.name, arguments: { ...args, submissionId } });
        assert.equal(invalid.isError, true, '空の下書きIDで新規提出に進んではいけない');
      }
      const first = await client.callTool({ name: tool.name, arguments: args });
      const firstText = first.content.map(item => item.text ?? '').join('\n');
      if (lostResponse) {
        assert.equal(first.isError, true);
        assert.match(firstText, /draft/);
        assert.match(firstText, /submit response lost/);
      } else {
        assert.notEqual(first.isError, true, firstText);
        assert.match(firstText, /WAITING_FOR_REVIEW/);
      }
      const repeated = await client.callTool({ name: tool.name, arguments: args });
      const repeatedText = repeated.content.map(item => item.text ?? '').join('\n');
      assert.notEqual(repeated.isError, true, repeatedText);
      assert.match(repeatedText, /WAITING_FOR_REVIEW/);
      assert.match(stderr, /app-publish-mcp running/);
    } catch (error) {
      throw new Error(`${error.message}\n${stderr}`, { cause: error });
    } finally {
      await client.close();
      await transport.close();
    }
  });
}

test('ビルド済みstdio: 同一snapshotの分割uploadと両Google価格経路', { timeout: 30_000 }, async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', new URL('./fixtures/upload-pricing.mjs', import.meta.url).href,
      fileURLToPath(new URL('../dist/cli.js', import.meta.url))],
    env: {
      APPLE_KEY_ID: 'fixture', APPLE_ISSUER_ID: 'fixture', APPLE_P8_PATH: 'unused-fixture-key',
      GOOGLE_SERVICE_ACCOUNT_PATH: '', GOOGLE_CLIENT_ID: 'partial',
      GOOGLE_CLIENT_SECRET: '', GOOGLE_REFRESH_TOKEN: '',
      ...(process.env.TEMP ? { TEMP: process.env.TEMP } : {}),
      ...(process.env.TMP ? { TMP: process.env.TMP } : {}),
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'upload-pricing-regression', version: '1.0.0' });
  let stderr = '';
  transport.stderr?.on('data', data => { stderr += data; });
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    const text = result.content.map(item => item.text ?? '').join('\n');
    assert.notEqual(result.isError, true, `${text}\n${stderr}`);
    return JSON.parse(text);
  };
  try {
    await client.connect(transport);
    await call('apple_upload_screenshot', {
      screenshotSetId: 'set', filePath: 'fixture-screenshot.png', fileName: 'screen.png',
    });
    const listings = [{ languageCode: 'en-US', title: 'Fixture', description: 'Fixture' }];
    const regionalConfigs = ['2000000', '3990123', '9007199254740993'].map((priceMicros, index) => ({
      regionCode: ['US', 'GB', 'JP'][index], priceMicros, currency: ['USD', 'GBP', 'JPY'][index],
    }));
    const expected = [
      { currencyCode: 'USD', units: '2', nanos: 0 },
      { currencyCode: 'GBP', units: '3', nanos: 990123000 },
      { currencyCode: 'JPY', units: '9007199254', nanos: 740993000 },
    ];
    const subscription = await call('google_create_subscription', {
      packageName: 'com.example.fixture', productId: 'subscription', listings,
      basePlans: [{ basePlanId: 'monthly', autoRenewing: { billingPeriodDuration: 'P1M' }, regionalConfigs }],
    });
    assert.deepEqual(subscription.basePlans[0].regionalConfigs.map(region => region.price), expected);
    const oneTime = await call('google_create_one_time_product', {
      packageName: 'com.example.fixture', productId: 'one-time', listings,
      purchaseOptions: [{ purchaseOptionId: 'buy', buy: {}, regionalConfigs }],
    });
    assert.deepEqual(oneTime.purchaseOptions[0].regionalPricingAndAvailabilityConfigs.map(region => region.price), expected);
  } finally {
    await client.close();
    await transport.close();
  }
});
