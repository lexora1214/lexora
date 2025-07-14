
const CACHE_NAME = 'lexora-cache-v1.6'; // Increment version to force update
const DYNAMIC_CACHE_NAME = 'lexora-dynamic-cache-v1.6';

// URLs to cache on installation
const urlsToCache = [
  '/',
  '/manifest.json',
  '/my-logo.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
  // Note: Add other essential static assets here.
  // Next.js build files are handled dynamically.
];

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate the service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Delete old caches
          return cacheName.startsWith('lexora-cache-') && cacheName !== CACHE_NAME ||
                 cacheName.startsWith('lexora-dynamic-cache-') && cacheName !== DYNAMIC_CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

// Cache and return requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategy for Next.js pages and data (network first, then cache)
  if (request.mode === 'navigate' || url.pathname.startsWith('/_next/data/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If the request is successful, clone it and cache it.
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If the network fails, try to get it from the cache.
          return caches.match(request).then(response => {
            return response || caches.match('/'); // Fallback to home page if specific page not cached
          });
        })
    );
    return;
  }
  
  // Strategy for Google Maps Static API and other external assets (cache first, then network)
  if (url.hostname === 'maps.googleapis.com') {
      event.respondWith(
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              return cache.match(request).then(response => {
                  const fetchPromise = fetch(request).then(networkResponse => {
                      cache.put(request, networkResponse.clone());
                      return networkResponse;
                  });
                  return response || fetchPromise;
              });
          })
      );
      return;
  }

  // Strategy for other static assets (cache first, then network)
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(fetchResponse => {
        // Cache the new resource
        return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          cache.put(request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});
