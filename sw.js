const CACHE_NAME = 'dungeon-raid-shell-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/dungeon-raid.html',
  '/dungeon-raid-dev.html',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await Promise.all(APP_SHELL.map(async url => {
      try{
        let response = await fetch(url, { cache: 'no-store' });
        if(response.redirected) response = await fetch(response.url, { cache: 'no-store' });
        if(response.ok && !response.redirected) await cache.put(url, response);
      }catch(e){}
    }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

async function networkFirst(request) {
  try {
    let response = await fetch(request);
    if(response.redirected) response = await fetch(response.url, { cache: 'no-store' });
    if(response.redirected || (response.status >= 300 && response.status < 400)) throw new Error('redirect response');
    if(response && response.ok){
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }catch(e){
    const cached = await caches.match(request)
      || await caches.match(new URL('/', self.location.origin).href)
      || await caches.match(new URL('/dungeon-raid.html', self.location.origin).href);
    // respondWith() must always receive a Response, including on a first-ever
    // offline visit where the shell has not been cached yet.
    return cached || new Response(
      '<!doctype html><meta charset="utf-8"><title>Dungeon Raid offline</title>' +
      '<p>游戏尚未完成离线缓存，请联网打开一次后再试。</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if(event.request.mode === 'navigate') event.respondWith(networkFirst(event.request));
  else event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
