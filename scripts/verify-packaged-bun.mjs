// `bun pm pack` で作った tarball を、利用者と同じ形で実インストールして検証する。
//
// 使い方: bun scripts/verify-packaged-bun.mjs <tarball> [作業ディレクトリ]
//
// 検証内容:
//   1. 空のディレクトリへ tarball を `bun add` で実インストールする。
//   2. node_modules/.bin/app-publish-mcp（利用者が MCP 設定から起動する shim）を stdio で起動し、
//      initialize・listTools を行い、README の Features 表と公開ツール名を突き合わせる。
//   3. 外部通信を遮断した Bun（test/fixtures/network-guard.mjs）で、インストール先の dist/cli.js を
//      起動し、フィクスチャ経由で apple_submit_for_review を呼ぶ。
//   4. 遮断ガード自体が fetch / http / https / net / tls / Bun.connect を拒否し、
//      ローカルリスナーへ 1 件も到達しないことをプローブで確認する。
//
// 注意:
//   - 実インストールはレジストリから「package.json の範囲内の最新」を解決するため、
//     リポジトリの bun.lock と依存の版がずれ得る。ここでは「配布物が利用者環境で動くこと」を
//     確認するのが目的で、bun.lock どおりの版であることまでは保証しない。
//   - 作業ディレクトリは削除しない（呼び出し側が片付ける）。
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

if (!process.versions.bun) throw new Error('verify-packaged-bun.mjs must run on Bun');

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tarballArg = process.argv[2];
if (!tarballArg) throw new Error('Usage: bun scripts/verify-packaged-bun.mjs <tarball> [work-directory]');
const tarball = realpathSync(resolve(tarballArg));
// 作業ディレクトリ未指定なら RUNNER_TEMP（CI）→ OS の一時領域の順に使う。
const work = process.argv[3]
  ? resolve(process.argv[3])
  : mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'packaged-bun-'));
mkdirSync(work, { recursive: true });
assert.deepEqual(readdirSync(work), [], 'Work directory must be empty');

const bunPath = realpathSync(process.execPath);
const app = join(work, 'app');
const home = join(work, 'home');
mkdirSync(app);
mkdirSync(home);

// 子プロセスへ渡す最小の環境。HOME は作業ディレクトリ内に閉じ、利用者の資格情報ストアへ触れない。
const baseEnv = {
  PATH: [dirname(bunPath), process.env.PATH ?? process.env.Path ?? ''].join(delimiter),
  ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
  TEMP: work, TMP: work, TMPDIR: work,
  HOME: home, USERPROFILE: home,
  APP_PUBLISH_MCP_LANGUAGE: 'en',
};

// ---- README の Features 表と公開ツール名の突合 ----

function compareDocumentedTools(markdown, actual) {
  const expected = [];
  let inFeatures = false;
  let inTable = false;
  let tables = 0;
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && /^\s*$/.test(marker[2])) fence = null;
      continue;
    }
    if (marker) { fence = marker[1]; inTable = false; continue; }
    if (/^ {0,3}##(?:[ \t]+|$)/.test(line)) {
      if (inFeatures) break;
      if (/^ {0,3}##[ \t]+Features[ \t]*#*[ \t]*$/.test(line)) inFeatures = true;
      continue;
    }
    if (!inFeatures) continue;
    if (/^\|\s*Category\s*\|\s*Tools\s*\|\s*$/.test(line)) { inTable = true; tables++; continue; }
    if (!inTable) continue;
    if (!line.startsWith('|')) { inTable = false; continue; }
    if (/^\|[\s:-]+\|[\s:-]+\|\s*$/.test(line)) continue;
    const cells = line.split('|');
    assert.equal(cells.length, 4, 'Invalid tools table row');
    const names = cells[2].trim();
    assert.match(names, /^`[A-Za-z0-9_.-]+`(?:,\s*`[A-Za-z0-9_.-]+`)*$/, 'Invalid tool name list');
    expected.push(...[...names.matchAll(/`([^`]+)`/g)].map(match => match[1]));
  }
  assert.ok(tables && expected.length, 'README has no documented tools');
  assert.equal(new Set(expected).size, expected.length, 'Duplicate documented tool');
  assert.equal(new Set(actual).size, actual.length, 'Duplicate discovered tool');
  assert.deepEqual([...actual].sort(), [...expected].sort(), 'Discovered tools differ from README');
}

// 突合ロジック自体の自己テスト（誤検出・見逃しを防ぐ）。
const sample = '## Features\n| Category | Tools |\n|---|---|\n| Example | `apple_one`, `google_two` |\n## Setup\n';
compareDocumentedTools(sample, ['google_two', 'apple_one']);
compareDocumentedTools(sample.replace('## Setup', '## Installation'), ['apple_one', 'google_two']);
compareDocumentedTools(sample.replace('## Setup', '##') + '| Category | Tools |\n|---|---|\n| Other | `unrelated_tool` |\n', ['apple_one', 'google_two']);
compareDocumentedTools(sample.replace('## Setup\n', ''), ['apple_one', 'google_two']);
compareDocumentedTools(sample + '## Other\n| Category | Tools |\n|---|---|\n| Other | `unrelated_tool` |\n', ['apple_one', 'google_two']);
const fenced = ['```md', '## Features', '| Category | Tools |', '|---|---|', '| Fake | `wrong_before` |', '```',
  '## Features', '```md', '## Fake heading', '| Category | Tools |', '|---|---|', '| Fake | `wrong_backtick` |', '```',
  '~~~md', '## Another fake heading', '| Category | Tools |', '|---|---|', '| Fake | `wrong_tilde` |', '~~~',
  '| Category | Tools |', '|---|---|', '| Real | `apple_one`, `google_two` |', '## Other',
  '| Category | Tools |', '|---|---|', '| Fake | `wrong_after` |'].join('\n');
compareDocumentedTools(fenced, ['apple_one', 'google_two']);
compareDocumentedTools(sample.replace('`google_two`', '`google_two`, `apple_new`'), ['apple_new', 'apple_one', 'google_two']);
compareDocumentedTools(sample.replace('`google_two`', '`google_two`, `0start`, `Tool.Name-1`, `_under`'), ['google_two', 'apple_one', '0start', 'Tool.Name-1', '_under']);
assert.throws(() => compareDocumentedTools(sample, ['apple_one']));
assert.throws(() => compareDocumentedTools(sample, ['apple_one', 'google_two', 'extra_tool']));
assert.throws(() => compareDocumentedTools(sample.replace('`google_two`', '`apple_one`'), ['apple_one']));
assert.throws(() => compareDocumentedTools(sample, ['apple_one', 'google_two', 'apple_one']));

// ---- 1. 実インストール ----

writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'packaged-bun-verification', private: true }));
const added = spawnSync(bunPath, ['add', tarball], { cwd: app, env: baseEnv, encoding: 'utf8' });
if (added.status !== 0) throw new Error(`bun add failed (${added.status})\n${added.stdout}\n${added.stderr}`);

const installed = join(app, 'node_modules', '@kagayoi', 'app-publish-mcp');
assert.ok(existsSync(join(installed, 'dist', 'cli.js')), 'Installed package has no dist/cli.js');
assert.equal(
  // CRLF の shebang は POSIX で起動に失敗するため、LF 区切りの完全一致で確認する（CR を許容しない）。
  readFileSync(join(installed, 'dist', 'cli.js'), 'utf8').split('\n', 1)[0], '#!/usr/bin/env bun',
  'Installed CLI shebang is not bun',
);

// ---- 2. shim 経由の起動・listTools・README 突合 ----

// 利用者が MCP 設定から起動するのは .bin の shim。Windows では bun が .exe の shim を作り、
// POSIX では dist/cli.js への symlink（shebang の bun を PATH から解決）になる。
const shim = join(app, 'node_modules', '.bin', process.platform === 'win32' ? 'app-publish-mcp.exe' : 'app-publish-mcp');
assert.ok(existsSync(shim), `Missing bin shim: ${shim}`);

const fixtureEnv = {
  APPLE_KEY_ID: 'fixture', APPLE_ISSUER_ID: 'fixture', APPLE_P8_PATH: 'unused-fixture-key',
  GOOGLE_SERVICE_ACCOUNT_PATH: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_REFRESH_TOKEN: '',
  REVIEW_FIXTURE_LOST_RESPONSE: '0',
};

async function withClient(transport, name, action) {
  const client = new Client({ name, version: '1.0.0' });
  const timeout = setTimeout(() => { console.error(`${name} timed out`); process.exit(1); }, 60_000);
  let stderr = '';
  transport.stderr?.on('data', data => { stderr += data; });
  try {
    await client.connect(transport);
    return await action(client);
  } catch (error) {
    throw new Error(`${error.message}\n${stderr}`, { cause: error });
  } finally {
    clearTimeout(timeout);
    await client.close();
  }
}

const documented = readFileSync(join(installed, 'README.md'), 'utf8');
await withClient(
  new StdioClientTransport({ command: shim, args: [], env: { ...baseEnv, ...fixtureEnv }, stderr: 'pipe' }),
  'packaged-bun-shim',
  async client => {
    const { tools } = await client.listTools();
    compareDocumentedTools(documented, tools.map(tool => tool.name));
    assert.ok(tools.find(tool => tool.name === 'apple_submit_for_review')?.inputSchema.properties?.submissionId);
    console.log(`shim started the packaged server: ${tools.length} tools match the README`);
  },
);

// ---- 3 / 4. 通信遮断下でのフィクスチャ呼び出しとガードのプローブ ----

// フィクスチャは自身の位置から ../../dist を読み込むため、インストール先の test/fixtures へ置く。
const fixtures = join(installed, 'test', 'fixtures');
mkdirSync(fixtures, { recursive: true });
copyFileSync(join(repoRoot, 'test', 'fixtures', 'apple-review.mjs'), join(fixtures, 'apple-review.mjs'));
copyFileSync(join(repoRoot, 'test', 'fixtures', 'network-guard.mjs'), join(fixtures, 'network-guard.mjs'));
const guard = join(fixtures, 'network-guard.mjs');

// プローブ: ガード下で各経路の通信が拒否され、待ち受け側へ何も届かないことを確認する。
const probe = join(work, 'probe.mjs');
writeFileSync(probe, `import assert from 'node:assert/strict';
import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import tls from 'node:tls';
assert.ok(process.versions.bun, 'probe must run on Bun');
const port = Number(process.env.PROBE_PORT), url = 'http://127.0.0.1:' + port;
async function refused(name, action) {
  try {
    const result = action();
    if (result && typeof result.then === 'function') await result;
    else await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(name + ' timed out')), 5000); result.once('error', error => { clearTimeout(timer); reject(error); }); });
    throw new Error(name + ' unexpectedly connected');
  } catch (error) { assert.match(String(error), /Unexpected network access/, name); }
}
await refused('fetch', () => fetch(url));
await refused('http', () => http.get(url));
await refused('https', () => https.get('https://127.0.0.1:' + port));
await refused('net', () => net.connect({ host: '127.0.0.1', port }));
await refused('tls', () => tls.connect({ host: '127.0.0.1', port }));
await refused('Bun.connect', () => Bun.connect({ hostname: '127.0.0.1', port, socket: { data() {} } }));
`);

let received = 0;
const listener = createServer(socket => { received++; socket.destroy(); });
await new Promise((resolveListen, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolveListen); });
try {
  const child = spawnSync(bunPath, ['--preload', guard, probe], {
    env: { ...baseEnv, PROBE_PORT: String(listener.address().port) }, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.equal(received, 0, 'Network guard permitted a connection');
  console.log('fetch, http, https, net, tls and Bun.connect were rejected; listener received no connections');
} finally {
  await new Promise((resolveClose, reject) => listener.close(error => error ? reject(error) : resolveClose()));
}

await withClient(
  new StdioClientTransport({
    command: bunPath,
    args: ['--preload', guard, '--preload', join(fixtures, 'apple-review.mjs'), join(installed, 'dist', 'cli.js')],
    env: { ...baseEnv, ...fixtureEnv },
    stderr: 'pipe',
  }),
  'packaged-bun-fixture',
  async client => {
    const result = await client.callTool({ name: 'apple_submit_for_review', arguments: {
      appId: 'app', versionId: 'version', platform: 'IOS', submissionId: 'draft',
    } });
    const text = result.content.map(item => item.text ?? '').join('\n');
    assert.notEqual(result.isError, true, text);
    assert.match(text, /WAITING_FOR_REVIEW/);
    console.log('packaged server handled the review fixture under the network guard');
  },
);
console.log(`Verified ${tarball}`);
