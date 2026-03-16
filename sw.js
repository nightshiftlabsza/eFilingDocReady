// v6: Final pricing fixes and magic-link activation - 2026-03-17
var CACHE       = 'docready-v6';
var SHARE_CACHE = 'sars-share-v1';

var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './icon-maskable.svg',
  './icon-192.png',
  './icon-512.png',
  'https://js.paystack.co/v1/inline.js',
  'https://unpkg.com/pdf-lib/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Install: pre-cache the app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) { return cache.addAll(APP_SHELL); })
  );
  self.skipWaiting();
});

// Activate: delete old caches (but keep the share cache)
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE && k !== SHARE_CACHE; })
            .map(function(k)   { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: handle Share Target POSTs first, then cache-first for GET
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // ── Share Target: intercept the POST from the OS share sheet ──
  if (e.request.method === 'POST' && url.origin === location.origin) {
    e.respondWith(handleShareTarget(e.request));
    return;
  }

  // ── Normal GET: serve from cache, fall back to network ──
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, copy); });
        }
        return response;
      });
    })
  );
});

// Store shared files in the SHARE_CACHE, then redirect to the app
async function handleShareTarget(request) {
  try {
    var formData = await request.formData();
    var shared   = formData.getAll('documents');

    if (shared.length) {
      var cache    = await caches.open(SHARE_CACHE);
      var fileList = [];

      for (var i = 0; i < shared.length; i++) {
        var f   = shared[i];
        var key = 'shared-' + i;
        var ab  = await f.arrayBuffer();

        await cache.put(key, new Response(ab, {
          headers: {
            'Content-Type': f.type || 'application/octet-stream',
            'X-Filename':   encodeURIComponent(f.name)
          }
        }));
        fileList.push({ key: key, name: f.name, type: f.type });
      }

      await cache.put('file-list', new Response(JSON.stringify(fileList), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  } catch(err) {
    console.warn('Share target processing failed:', err);
  }

  return Response.redirect('./index.html?shared=1', 303);
}
