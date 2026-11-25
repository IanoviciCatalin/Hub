const CACHE_PREFIX = 'unipulse-';
const CACHE = CACHE_PREFIX + 'v21';
const ROOT = self.registration.scope;
const SHELL = new Set([
  './',
  './css/style.css',
  './js/data.js',
  './js/events.js',
  './js/events-timisoara.js',
  './js/cathedral.js',
  './js/social.js',
  './js/app.js',
  './js/campus-data.js',
  './js/campus-nav.js',
  './manifest.webmanifest',
  './icons/logo-96.png',
  './icons/favicon-48.png',
  './icons/icon-192.png'
].map(path => new URL(path, ROOT).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...SHELL])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('Range')) return;
  const url = new URL(request.url);
  url.search = '';
  const key = url.href === new URL('index.html', ROOT).href ? ROOT : url.href;
  if (!SHELL.has(key)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(key, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      const cache = await caches.open(CACHE);
      return (await cache.match(key)) || Response.error();
    }
  })());
});
