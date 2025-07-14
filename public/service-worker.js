
const CACHE_NAME = 'lexora-cache-v1';
const DYNAMIC_CACHE_NAME = 'lexora-dynamic-cache-v1';

// URLs to cache on installation
const urlsToCache = [
  '/',
  '/manifest.json',
  '/my-logo.png',
  // Note: Next.js build files are added dynamically below
];

// URLs to always fetch from the network first
const networkFirstUrls = [
    '/login',
    '/signup',
    '/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Fetch the asset manifest from Next.js build
      return fetch('/_next/static/asset-manifest.json')
        .then(response => response.json())
        .then(assets => {
          const toCache = [
            '/',
            '/manifest.json',
            '/my-logo.png',
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
            'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',
            'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsjNsFjTDJK.woff2',
            ...Object.values(assets)
          ];
          console.log('[Service Worker] Caching app shell', toCache);
          return cache.addAll(toCache);
        })
        .catch(err => {
            console.error('[Service Worker] Failed to fetch asset manifest. Caching default URLs.', err);
            return cache.addAll(urlsToCache);
        });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Always try network first for navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // If successful, cache the response in the dynamic cache
                    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(request.url, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(request);
                })
        );
        return;
    }
    
    // For other requests (CSS, JS, images), use cache-first strategy
    event.respondWith(
        caches.match(request).then((response) => {
            if (response) {
                return response; // Serve from cache
            }

            // If not in cache, fetch from network
            return fetch(request).then((networkResponse) => {
                // Cache the new response for future use
                return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                    // Don't cache chrome-extension requests
                    if (request.url.startsWith('chrome-extension://')) {
                        return networkResponse;
                    }
                    cache.put(request.url, networkResponse.clone());
                    return networkResponse;
                });
            });
        }).catch(error => {
            // This will be triggered for things like failed API calls when offline.
            // The app's logic (e.g., Firestore offline persistence) will handle this.
            console.warn(`[Service Worker] Fetch failed for ${request.url}; relying on app logic.`, error);
            // We can't really return a meaningful response here for API calls,
            // so we let the request fail, which is the expected behavior.
        })
    );
});
