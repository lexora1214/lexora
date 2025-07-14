// A robust service worker for a Next.js PWA

const CACHE_NAME = 'lexora-cache-v1';
const PRECACHE_ASSETS = [
    '/',
    '/login',
    '/signup',
    '/manifest.json',
    '/my-logo.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',
    'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQtsPqBpqh_-9_hVdkLZeHfen92g.woff2'
];

// 1. Installation: Pre-cache the main shell and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching offline assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        self.skipWaiting(); 
      })
  );
});

// 2. Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Tell the active service worker to take control of the page immediately.
        return self.clients.claim();
    })
  );
});

// 3. Fetch: Intercept network requests and serve from cache if necessary
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests (pages), use a network-first strategy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If the network request is successful, clone it and cache it.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If the network fails, serve the cached version of the page.
          return caches.match(request)
            .then((cachedResponse) => {
              // If we have a cached version, serve it.
              if (cachedResponse) {
                return cachedResponse;
              }
              // If the specific page isn't cached, fall back to the main offline page.
              return caches.match('/'); 
            });
        })
    );
    return;
  }

  // For all other requests (CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // If we have a cached response, return it immediately.
          return cachedResponse;
        }

        // If it's not in the cache, fetch it from the network.
        return fetch(request).then((networkResponse) => {
          // Clone the response and cache it for next time.
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
      .catch((error) => {
        // This catch handles errors from both caches.match and fetch.
        console.error('[Service Worker] Fetch failed:', error);
        // You could return a fallback asset here if needed, e.g., an offline placeholder image.
      })
  );
});
