import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { get } from 'node:http';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { waitForOAuthCode } from '../src/auth.js';
import {
  DICTIONARIES,
  LANGUAGES,
  detectCliLanguage,
  detectWebLanguage,
  matchLanguageTag,
  translate,
} from '../src/i18n.js';

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
const localesDir = fileURLToPath(new URL('../src/locales/', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'locales' ? [] : sourceFiles(path);
    return name.endsWith('.ts') && name !== 'i18n.ts' ? [path] : [];
  });
}

test('every supported language has a dictionary file and an entry', () => {
  assert.deepEqual([...LANGUAGES], ['ja', 'en', 'zh-CN', 'zh-TW', 'ko', 'es', 'fr', 'de', 'pt-BR']);
  const files = readdirSync(localesDir).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort();
  assert.deepEqual(files, [...LANGUAGES].sort());
  assert.deepEqual(Object.keys(DICTIONARIES).sort(), [...LANGUAGES].sort());
});

test('all dictionaries share the English key set and the same placeholders', () => {
  const english = DICTIONARIES.en;
  const keys = Object.keys(english).sort();
  for (const language of LANGUAGES) {
    const dictionary = DICTIONARIES[language];
    assert.deepEqual(Object.keys(dictionary).sort(), keys, `${language} keys`);
    for (const key of keys) {
      assert.ok(dictionary[key].trim().length > 0, `${language}/${key} is empty`);
      assert.deepEqual(placeholders(dictionary[key]), placeholders(english[key]), `${language}/${key} placeholders`);
    }
  }
});

test('keys referenced by the code exist in the dictionary and no key is unused', () => {
  const used = new Set<string>();
  for (const file of sourceFiles(srcDir)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/'((?:cli|server|auth|web)\.[A-Za-z]+)'/g)) used.add(match[1]);
  }
  const defined = new Set(Object.keys(DICTIONARIES.en));
  for (const key of used) assert.ok(defined.has(key), `missing key: ${key}`);
  for (const key of defined) assert.ok(used.has(key), `unused key: ${key}`);
});

test('missing keys fall back to English and then to the key itself', () => {
  assert.equal(translate('ja', 'no.such.key'), 'no.such.key');
  assert.equal(translate('en', 'auth.saved', { path: 'X' }), '✅ Google credentials saved to X');
  assert.match(translate('ja', 'auth.saved', { path: 'X' }), /X/);
  // 未指定のプレースホルダーはそのまま残る。
  assert.match(translate('en', 'auth.saved'), /\{path\}/);
});

test('language tags follow the shared matching rules', () => {
  const cases: Array<[string, string | undefined]> = [
    ['ja-JP', 'ja'], ['ja_JP.UTF-8', 'ja'], ['en-US', 'en'], ['zh-Hans', 'zh-CN'], ['zh-CN', 'zh-CN'],
    ['zh-SG', 'zh-CN'], ['zh', 'zh-CN'], ['zh-Hant', 'zh-TW'], ['zh-TW', 'zh-TW'], ['zh-HK', 'zh-TW'],
    ['zh-MO', 'zh-TW'], ['zh-Hant-CN', 'zh-TW'], ['pt', 'pt-BR'], ['pt-PT', 'pt-BR'], ['pt-BR', 'pt-BR'],
    ['ko-KR', 'ko'], ['es-MX', 'es'], ['fr-CA', 'fr'], ['de-AT', 'de'], ['it-IT', undefined], ['', undefined],
  ];
  for (const [tag, expected] of cases) assert.equal(matchLanguageTag(tag), expected, tag);
});

test('CLI language resolves in the documented order', () => {
  const noIntl = () => undefined;
  assert.equal(detectCliLanguage({ APP_PUBLISH_MCP_LANGUAGE: 'de', LC_ALL: 'ja_JP.UTF-8' }, noIntl), 'de');
  assert.equal(detectCliLanguage({ LC_ALL: 'fr_FR.UTF-8', LC_MESSAGES: 'ja', LANG: 'ko' }, noIntl), 'fr');
  assert.equal(detectCliLanguage({ LC_MESSAGES: 'es_ES', LANG: 'ko' }, noIntl), 'es');
  assert.equal(detectCliLanguage({ LANG: 'pt_BR.UTF-8' }, noIntl), 'pt-BR');
  // C・POSIX・空は読み飛ばして次の候補を見る。
  assert.equal(detectCliLanguage({ LC_ALL: 'C', LC_MESSAGES: 'POSIX', LANG: 'ko_KR.UTF-8' }, noIntl), 'ko');
  assert.equal(detectCliLanguage({ LANG: 'C.UTF-8' }, () => 'zh-TW'), 'zh-TW');
  // どれも無ければ Intl、それも判定できなければ英語。未対応の言語も英語。
  assert.equal(detectCliLanguage({}, () => 'ja-JP'), 'ja');
  assert.equal(detectCliLanguage({}, noIntl), 'en');
  assert.equal(detectCliLanguage({ LANG: 'it_IT.UTF-8' }, () => 'ja-JP'), 'en');
});

test('web language follows Accept-Language with q values and defaults to English', () => {
  assert.equal(detectWebLanguage(undefined), 'en');
  assert.equal(detectWebLanguage(''), 'en');
  assert.equal(detectWebLanguage('ja,en;q=0.8'), 'ja');
  assert.equal(detectWebLanguage('en;q=0.5, fr;q=0.9, de;q=0.7'), 'fr');
  assert.equal(detectWebLanguage('it-IT, zh-Hant;q=0.8'), 'zh-TW');
  assert.equal(detectWebLanguage('pt-PT'), 'pt-BR');
  assert.equal(detectWebLanguage('ko;q=0, es;q=0.1'), 'es');
  assert.equal(detectWebLanguage('it, *;q=0.5'), 'en');
});

test('OAuth callback page is rendered in the Accept-Language language', async () => {
  let announce!: (address: { host: string; port: number }) => void;
  const listening = new Promise<{ host: string; port: number }>(resolve => { announce = resolve; });
  const codePromise = waitForOAuthCode('https://accounts.example/auth', 'state-1', {
    port: 0, timeoutMs: 2_000, openBrowser: () => {}, log: () => {}, onListening: announce,
  });
  const address = await listening;
  const request = (path: string, language?: string) => new Promise<{ status: number; body: string }>((resolve, reject) => {
    get({ host: address.host, port: address.port, path, headers: language ? { 'accept-language': language } : {} }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    }).on('error', reject);
  });

  const invalid = await request('/callback?state=wrong', 'de');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body, DICTIONARIES.de['web.invalidState']);
  const missing = await request('/callback?state=state-1');
  assert.equal(missing.body, DICTIONARIES.en['web.missingCode']);
  const ok = await request('/callback?state=state-1&code=abc', 'ja;q=0.9');
  assert.match(ok.body, /lang="ja"/);
  assert.ok(ok.body.includes(DICTIONARIES.ja['web.successTitle']));
  assert.equal(await codePromise, 'abc');
});
