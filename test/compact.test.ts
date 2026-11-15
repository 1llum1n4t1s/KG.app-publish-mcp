import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AppleApiError } from '../src/apple/client.js';
import { appleTools } from '../src/apple/tools.js';
import { compactJsonApi, formatAppleResult, redactSecretText } from '../src/apple/compact.js';

const fixture = () => ({
  data: [
    {
      type: 'builds', id: '1', attributes: { version: '7' },
      relationships: {
        app: { links: { self: 'https://x/self', related: 'https://x/app' }, data: { type: 'apps', id: 'a' } },
        icons: { links: { self: 'https://x/icons', related: 'https://x/icons' } },
        meta_only: { links: { self: 'https://x/m' }, meta: { count: 2 } },
      },
      links: { self: 'https://x/builds/1' },
    },
    { type: 'builds', id: '2', attributes: {}, relationships: { icons: { links: { self: 'https://x' } } }, links: { self: 'https://x/2' } },
  ],
  included: [{ type: 'apps', id: 'a', attributes: { name: 'A' }, links: { self: 'https://x/apps/a' } }],
  links: { self: 'https://x/builds', next: 'https://x/builds?cursor=abc' },
  meta: { paging: { total: 9, limit: 2, nextCursor: 'abc' } },
});

test('compaction removes resource and relationship links but keeps linkage and meta', () => {
  const out: any = compactJsonApi(fixture());
  assert.deepEqual(out.data[0], {
    type: 'builds', id: '1', attributes: { version: '7' },
    relationships: { app: { data: { type: 'apps', id: 'a' } }, meta_only: { meta: { count: 2 } } },
  });
  // Empty relationships disappear, and so does an emptied `relationships` object.
  assert.deepEqual(out.data[1], { type: 'builds', id: '2', attributes: {} });
  assert.deepEqual(out.included, [{ type: 'apps', id: 'a', attributes: { name: 'A' } }]);
});

test('compaction keeps top-level paging links and meta', () => {
  const out: any = compactJsonApi(fixture());
  assert.equal(out.links.next, 'https://x/builds?cursor=abc');
  assert.equal(out.links.self, 'https://x/builds');
  assert.deepEqual(out.meta, { paging: { total: 9, limit: 2, nextCursor: 'abc' } });
});

test('compaction handles a single resource and does not mutate its input', () => {
  const input = { data: fixture().data[0], links: { self: 'https://x/builds/1' } };
  const snapshot = JSON.stringify(input);
  const out: any = compactJsonApi(input);
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(out.data.links, undefined);
  assert.deepEqual(out.links, { self: 'https://x/builds/1' });
});

test('compaction keeps an empty list with its paging links', () => {
  const input = { data: [], links: { self: 'https://x' }, meta: { paging: { total: 0 } } };
  assert.deepEqual(compactJsonApi(input), input);
});

test('non JSON:API results are returned unchanged', () => {
  const shapes: unknown[] = [
    null, 'text', 42, [], [{ type: 'a', id: 'b', links: { self: 'x' } }],
    { releases: [{ name: 'r', links: { self: 'x' } }], links: { self: 'x' } },
    { data: { notAResource: true, links: { self: 'x' } } },
    // Google-style result that happens to carry `links` and relationships-like keys.
    { tracks: [{ track: 'production', releases: [] }], links: { next: 'x' }, relationships: { a: { links: { self: 'x' } } } },
  ];
  for (const shape of shapes) {
    assert.deepEqual(compactJsonApi(shape), shape);
    assert.equal(JSON.stringify(compactJsonApi(shape)), JSON.stringify(shape));
  }
});

test('only the Apple registration applies compaction; Google results stay as returned', () => {
  const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.match(source, /appleTools,[\s\S]*?formatAppleResult,\s*\);/);
  assert.match(source, /registerTools\(server, googleTools, googleClient, GOOGLE_NOT_CONFIGURED_MESSAGE, formatGoogleApiError\);/);
});

const detail = (password: unknown) => ({
  data: {
    type: 'appStoreReviewDetails', id: 'rd',
    attributes: { contactEmail: 'a@example.com', demoAccountName: 'demo', demoAccountPassword: password, notes: 'n' },
    links: { self: 'https://x/rd' },
  },
  included: [{ type: 'appStoreReviewDetails', id: 'rd2', attributes: { demoAccountPassword: 'second-secret' } }],
});

test('demoAccountPassword is masked in PATCH/POST-style and GET-style responses', () => {
  const secret = 'S3cret-pass!';
  const response = formatAppleResult(detail(secret)) as any;
  assert.equal(response.data.attributes.demoAccountPassword, '<redacted>');
  assert.equal(response.included[0].attributes.demoAccountPassword, '<redacted>');
  assert.equal(response.data.attributes.demoAccountName, 'demo');
  assert.equal(JSON.stringify(response).includes(secret), false);
  assert.equal(JSON.stringify(response).includes('second-secret'), false);
  // List responses and non JSON:API shapes (echoed input) are covered too.
  const list = formatAppleResult({ data: [detail(secret).data], links: { next: 'n' } }) as any;
  assert.equal(list.data[0].attributes.demoAccountPassword, '<redacted>');
  assert.equal(list.links.next, 'n');
  const echoed = formatAppleResult({ submitted: { demoAccountPassword: secret, notes: 'x' } }) as any;
  assert.deepEqual(echoed, { submitted: { demoAccountPassword: '<redacted>', notes: 'x' } });
});

test('an unset or empty password stays visible as unset and input is not mutated', () => {
  assert.equal((formatAppleResult(detail(null)) as any).data.attributes.demoAccountPassword, null);
  assert.equal((formatAppleResult(detail('')) as any).data.attributes.demoAccountPassword, '');
  const input = detail('keep-me');
  formatAppleResult(input);
  assert.equal(input.data.attributes.demoAccountPassword, 'keep-me');
});

test('error text echoing the password is masked', () => {
  const text = 'Apple API PATCH /x -> 409: {"attributes":{"demoAccountPassword":"pa\\"ss","notes":"n"}}';
  const masked = redactSecretText(text);
  assert.equal(masked, 'Apple API PATCH /x -> 409: {"attributes":{"demoAccountPassword":"<redacted>","notes":"n"}}');
});

const tool = (name: string) => {
  const found = appleTools.find(candidate => candidate.name === name);
  assert.ok(found, name);
  return found;
};

test('apple_get_review_detail reads the version relationship and masks the password', async () => {
  const calls: Array<{ path: string; options?: any }> = [];
  const client = { request: async (path: string, options?: any) => { calls.push({ path, options }); return detail('pw-123'); } };
  const raw = await tool('apple_get_review_detail').handler(client as any, { versionId: 'v1' });
  assert.deepEqual(calls.map(call => call.path), ['/appStoreVersions/v1/appStoreReviewDetail']);
  assert.equal((formatAppleResult(raw) as any).data.attributes.demoAccountPassword, '<redacted>');
});

test('apple_get_review_detail reports a missing review detail on 404 and rethrows other errors', async () => {
  const missing = { request: async (path: string) => { throw new AppleApiError('nf', 404, 'GET', path, '{}'); } };
  const result = await tool('apple_get_review_detail').handler(missing as any, { versionId: 'v1' });
  assert.equal(result.exists, false);
  assert.equal(result.versionId, 'v1');
  const broken = { request: async (path: string) => { throw new AppleApiError('boom', 500, 'GET', path, '{}'); } };
  await assert.rejects(() => tool('apple_get_review_detail').handler(broken as any, { versionId: 'v1' }), /boom/);
});

test('apple_list_review_submissions filters by app, states and limit and keeps links.next', async () => {
  const calls: Array<{ path: string; options?: any }> = [];
  const page = {
    data: [{ type: 'reviewSubmissions', id: 's1', attributes: { state: 'READY_FOR_REVIEW' }, links: { self: 'x' } }],
    links: { next: 'https://x/reviewSubmissions?cursor=c' },
  };
  const client = { request: async (path: string, options?: any) => { calls.push({ path, options }); return page; } };
  const raw = await tool('apple_list_review_submissions').handler(client as any,
    { appId: 'app', states: ['READY_FOR_REVIEW', 'WAITING_FOR_REVIEW'], limit: 5 });
  assert.equal(calls[0].path, '/reviewSubmissions');
  assert.deepEqual(calls[0].options.params, {
    'filter[app]': 'app', 'filter[state]': 'READY_FOR_REVIEW,WAITING_FOR_REVIEW', limit: '5',
  });
  const shaped = formatAppleResult(raw) as any;
  assert.equal(shaped.links.next, 'https://x/reviewSubmissions?cursor=c');
  assert.equal(shaped.data[0].links, undefined);
  await tool('apple_list_review_submissions').handler(client as any, { appId: 'app' });
  assert.deepEqual(calls[1].options.params, { 'filter[app]': 'app' });
});

test('apple_add_build_to_beta_groups / apple_remove_build_from_beta_groups call each group relationship', async () => {
  for (const [name, method] of [['apple_add_build_to_beta_groups', 'POST'], ['apple_remove_build_from_beta_groups', 'DELETE']]) {
    const calls: Array<{ path: string; options?: any }> = [];
    const client = { request: async (path: string, options?: any) => { calls.push({ path, options }); return {}; } };
    const result = await tool(name).handler(client as any, { buildId: 'b1', betaGroupIds: ['g1', 'g2'] });
    assert.deepEqual(calls.map(call => call.path), ['/betaGroups/g1/relationships/builds', '/betaGroups/g2/relationships/builds']);
    for (const call of calls) {
      assert.equal(call.options.method, method);
      assert.deepEqual(call.options.body, { data: [{ type: 'builds', id: 'b1' }] });
    }
    assert.deepEqual(result, { buildId: 'b1', betaGroupIds: ['g1', 'g2'] });
  }
});

test('adding a build to groups reports which groups were already changed on failure', async () => {
  const client = {
    request: async (path: string) => {
      if (path.includes('/g2/')) throw new AppleApiError('conflict', 409, 'POST', path, '{}');
      return {};
    },
  };
  await assert.rejects(
    () => tool('apple_add_build_to_beta_groups').handler(client as any, { buildId: 'b1', betaGroupIds: ['g1', 'g2', 'g3'] }),
    /beta group g2; already added to: g1/,
  );
  assert.equal(tool('apple_add_build_to_beta_groups').schema.safeParse({ buildId: 'b', betaGroupIds: [] }).success, false);
});

test('apple_list_build_beta_localizations reads the build relationship', async () => {
  const calls: Array<{ path: string; options?: any }> = [];
  const client = { request: async (path: string, options?: any) => { calls.push({ path, options }); return { data: [] }; } };
  await tool('apple_list_build_beta_localizations').handler(client as any, { buildId: 'b1', limit: 10 });
  assert.equal(calls[0].path, '/builds/b1/betaBuildLocalizations');
  assert.deepEqual(calls[0].options.params, { limit: '10' });
});

test('apple_set_build_whats_new PATCHes an existing locale and POSTs a missing one', async () => {
  const calls: Array<{ path: string; options?: any }> = [];
  const client = {
    request: async (path: string, options?: any) => {
      calls.push({ path, options });
      if (!options?.method) {
        return { data: [{ type: 'betaBuildLocalizations', id: 'loc-ja', attributes: { locale: 'ja', whatsNew: 'old' } }] };
      }
      return { data: { id: 'result' } };
    },
  };
  const handler = tool('apple_set_build_whats_new').handler;

  await handler(client as any, { buildId: 'b1', locale: 'ja', whatsNew: 'new text' });
  assert.equal(calls[0].path, '/builds/b1/betaBuildLocalizations');
  assert.equal(calls[1].path, '/betaBuildLocalizations/loc-ja');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.deepEqual(calls[1].options.body, {
    data: { type: 'betaBuildLocalizations', id: 'loc-ja', attributes: { whatsNew: 'new text' } },
  });

  calls.length = 0;
  await handler(client as any, { buildId: 'b1', locale: 'en-US', whatsNew: 'hello' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].path, '/betaBuildLocalizations');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(calls[1].options.body, {
    data: {
      type: 'betaBuildLocalizations',
      attributes: { locale: 'en-US', whatsNew: 'hello' },
      relationships: { build: { data: { type: 'builds', id: 'b1' } } },
    },
  });
  assert.equal(tool('apple_set_build_whats_new').schema.safeParse({ buildId: 'b', locale: 'ja', whatsNew: '' }).success, false);
});
