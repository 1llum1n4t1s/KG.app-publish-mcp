import { AppleClient } from '../../dist/apple/client.js';

// Serves a link-heavy JSON:API list without real authentication or network access.
globalThis.fetch = async () => { throw new Error('Unexpected network access in compact fixture'); };
AppleClient.prototype.request = async function () {
  return {
    data: [{
      type: 'builds', id: 'build-1',
      attributes: { version: '7' },
      relationships: {
        app: { links: { self: 'https://example.invalid/self', related: 'https://example.invalid/app' }, data: { type: 'apps', id: 'app' } },
        icons: { links: { self: 'https://example.invalid/icons' } },
      },
      links: { self: 'https://example.invalid/builds/build-1' },
    }],
    links: { self: 'https://example.invalid/builds', next: 'https://example.invalid/builds?cursor=abc' },
    meta: { paging: { total: 9, limit: 1 } },
  };
};
