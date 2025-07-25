// A unique name for the cache
const CACHE_NAME = 'lexora-v1';

// A list of files to cache for offline use
const urlsToCache = [
  '/',
  '/login',
  '/manifest.json',
  '/my-logo.png'
  // Note: Next.js assets (_next/...) are usually handled by runtime caching
];

// Install the service worker and cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Serve cached content when offline, with a network-first strategy
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For navigation requests (HTML pages), use a network-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If the network request is successful, clone it and cache it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If the network fails, serve the page from the cache
          return caches.match(event.request)
            .then((response) => {
              return response || caches.match('/'); // Fallback to home page if specific page not cached
            });
        })
    );
    return;
  }
  
  // For other requests (CSS, JS, images), use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the resource is in the cache, return it
        if (response) {
          return response;
        }

        // Otherwise, fetch it from the network
        return fetch(event.request).then((networkResponse) => {
            // Clone and cache the new response for future use
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(event.request, responseToCache);
                });
            return networkResponse;
        });
      })
  );
});

// Clean up old caches when the service worker is activated
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
