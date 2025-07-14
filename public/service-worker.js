// A robust, network-first-then-cache service worker.
// It's designed to provide a reliable offline experience for Next.js apps.

const CACHE_NAME = 'lexora-cache-v1';

// On install, we don't pre-cache specific files because Next.js uses hashed filenames.
// We will cache them dynamically as they are requested.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  // Clear out old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests (HTML pages), use a network-first strategy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If the network request is successful, cache it and return it.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If the network fails, try to serve the page from the cache.
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If the page isn't in the cache, you could return a fallback offline page here,
            // but for a true PWA feel, the page should have been cached on a previous visit.
            // Returning the root cache as a fallback for any un-cached page.
            return caches.match('/');
          });
        })
    );
    return;
  }

  // For non-navigation requests (JS, CSS, images, etc.), use a cache-first strategy.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If it's not in the cache, fetch from the network, cache it, and then return it.
      return fetch(request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
