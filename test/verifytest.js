'use strict';

const assert = require('assert');
process.env.VERIFY_SECRET = 'test-secret';

const {
  verifyPending,
  loadEnginesForPending,
  resolveEnginePath,
} = require('../verify.js');

async function main() {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async url => {
    calls.push(String(url));
    return { json: async () => ({ pending: [] }) };
  };

  try {
    const result = await verifyPending({ VERSION: 'v1.78.3' }, 'v1.78.3');
    assert.deepStrictEqual(result, { pass: 0, fail: 0, skip: 0, total: 0 });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0], 'https://api.dungeonraid.win/pending?k=test-secret');
    assert(!calls[0].includes('version='), 'pending request must not be pinned to current engine version');
  } finally {
    global.fetch = originalFetch;
  }

  const pending = [{ version: 'v1.77.2' }, { version: 'v1.78.2' }];
  const engines = loadEnginesForPending(pending);
  assert.strictEqual(engines.get('v1.77.2').VERSION, 'v1.77.2');
  assert.strictEqual(engines.get('v1.78.2').VERSION, 'v1.78.2');
  assert(resolveEnginePath('v1.77.2').endsWith('/engines/v1.77.2.html'));

  console.log('verifytest passed');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
