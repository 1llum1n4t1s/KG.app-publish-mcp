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
