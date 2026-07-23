// Rugby 2026 — Service Worker v2
// Network-first strategy: always fetches fresh content from GitHub,
// falls back to cache only when offline. This ensures updates you
// upload to GitHub appear immediately without needing to clear cache.

const CACHE_NAME = 'rugby2026-v2';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: delete ALL old caches so stale content is never served
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: NETWORK-FIRST — always try network, cache is only offline fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Got fresh response from network — update the cache and return it
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, clone)
          );
        }
        return response;
      })
      .catch(() => {
        // Network failed (offline) — serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Final fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
