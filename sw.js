// Service Worker — SARS Doc Compiler
// Cache-first strategy for the app shell; network-only for CDN libraries.

var CACHE = 'sars-doc-v1';

// Files we own and want available offline
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './icon-maskable.svg'
];

// Install: pre-cache the app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k)   { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache when possible, fall back to network
self.addEventListener('fetch', function(e) {
  // Only handle GET requests; skip cross-origin CDN requests (pdf-lib, pdf.js)
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache any new same-origin responses
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, copy); });
        }
        return response;
      });
    })
  );
});
