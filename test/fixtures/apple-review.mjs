import assert from 'node:assert/strict';
import { AppleClient } from '../../dist/apple/client.js';

// 実際の認証・通信を使わず、提出成功後の応答喪失も再現する。
globalThis.fetch = async () => { throw new Error('Unexpected network access in review fixture'); };
let submitted = false;
let forbiddenMutation = false;
AppleClient.prototype.request = async function (path, options = {}) {
  assert.equal(forbiddenMutation, false, '取消・再提出などの禁止操作が試行された');
  const url = new URL(path, 'https://api.appstoreconnect.apple.com/v1/');
  const method = options.method ?? 'GET';
  const submission = {
    data: {
      type: 'reviewSubmissions', id: 'draft',
      attributes: {
        platform: 'IOS', state: submitted ? 'WAITING_FOR_REVIEW' : 'READY_FOR_REVIEW',
        submittedDate: submitted ? '2026-09-12T00:00:00Z' : null,
      },
      relationships: { app: { data: { type: 'apps', id: 'app' } } },
    },
  };
  if (method === 'GET' && url.pathname === '/reviewSubmissions/draft') return submission;
  if (method === 'GET' && url.pathname === '/reviewSubmissions/draft/app') {
    return { data: { type: 'apps', id: 'app' } };
  }
  if (method === 'GET' && url.pathname === '/reviewSubmissions/draft/items') {
    return {
      data: ['appStoreVersion', 'subscriptionGroupVersion', 'subscriptionVersion', 'subscriptionVersion'].map((relation, i) => ({
        type: 'reviewSubmissionItems', id: `item-${i}`,
        attributes: { state: 'READY_FOR_REVIEW' },
        relationships: { [relation]: { data: { id: i === 0 ? 'version' : `extra-${i}` } } },
      })),
      links: { next: null },
    };
  }
  try {
    assert.equal(method, 'PATCH');
    assert.equal(url.pathname, '/reviewSubmissions/draft');
    assert.deepEqual(options.body.data.attributes, { submitted: true });
    assert.equal(submitted, false, '提出済みの審査を再送してはいけない');
  } catch (error) {
    forbiddenMutation = true;
    throw error;
  }
  submitted = true;
  if (process.env.REVIEW_FIXTURE_LOST_RESPONSE === '1') throw new Error('submit response lost');
  submission.data.attributes.state = 'WAITING_FOR_REVIEW';
  submission.data.attributes.submittedDate = '2026-09-12T00:00:00Z';
  return submission;
};
