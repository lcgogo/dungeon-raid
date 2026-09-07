const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('sw.js', 'utf8');
const listeners = {};
const cacheEntries = new Map();
const cache = {
  async put(request, response) { cacheEntries.set(typeof request === 'string' ? request : request.url, response); },
};
const context = {
  URL,
  Response,
  self: {
    location: { origin: 'https://dungeonraid.win' },
    addEventListener(type, handler) { listeners[type] = handler; },
  },
  caches: {
    async open() { return cache; },
    async match(request) { return cacheEntries.get(typeof request === 'string' ? request : request.url) || undefined; },
  },
  fetch: async () => { throw new Error('offline'); },
};
vm.runInNewContext(source, context, { filename: 'sw.js' });

async function navigate(url) {
  let responsePromise;
  listeners.fetch({
    request: { method: 'GET', mode: 'navigate', url },
    respondWith(value) { responsePromise = value; },
  });
  return responsePromise;
}

(async () => {
  const requestUrl = 'https://dungeonraid.win/dungeon-raid.html';
  const shell = new Response('cached shell', { status: 200 });
  cacheEntries.set(requestUrl, shell);
  assert.strictEqual((await navigate(requestUrl)).status, 200, 'exact navigation cache should be used');

  cacheEntries.clear();
  cacheEntries.set('https://dungeonraid.win/', new Response('cached root', { status: 200 }));
  assert.strictEqual((await navigate(requestUrl)).status, 200, 'root cache should be a navigation fallback');

  cacheEntries.clear();
  const unavailable = await navigate(requestUrl);
  assert.strictEqual(unavailable.status, 503, 'offline miss must still return a Response');
  assert.match(await unavailable.text(), /尚未完成离线缓存/);
  console.log('Service Worker offline navigation tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
