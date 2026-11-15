import { AppleClient } from '../../dist/apple/client.js';

// Returns a review detail that carries a demo account password, for any request.
globalThis.fetch = async () => { throw new Error('Unexpected network access in redact fixture'); };
AppleClient.prototype.request = async function () {
  return {
    data: {
      type: 'appStoreReviewDetails', id: 'rd',
      attributes: { demoAccountName: 'demo', demoAccountPassword: 'fixture-secret-value' },
      links: { self: 'https://example.invalid/rd' },
    },
  };
};
