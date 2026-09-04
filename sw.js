const CACHE_NAME = 'dungeon-raid-shell-v2';
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
    return caches.match(request);
  }
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if(event.request.mode === 'navigate') event.respondWith(networkFirst(event.request));
  else event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
