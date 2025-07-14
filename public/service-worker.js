// A more robust service worker for a Next.js PWA

const CACHE_NAME = `lexoranet-cache-v${new Date().getTime()}`;
const PRECACHE_ASSETS = [
    '/',
    '/login',
    '/signup',
    '/manifest.json',
    '/my-logo.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap'
];


// On install, precache known assets and Next.js build files
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        
        // Fetch the asset manifest from Next.js build output
        // This allows us to cache all the generated JS, CSS, and font files
        const assetManifest = await fetch('/_next/static/development/_buildManifest.js')
            .then(res => res.text())
            .then(text => {
                // This is a bit of a hack to parse the JS file content to get the asset list
                // In a real production build, this would be more reliable.
                const manifestString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
                try {
                    const manifest = new Function(`return ${manifestString}`)();
                    return Object.values(manifest).flat();
                } catch (e) {
                    console.error("Failed to parse build manifest:", e);
                    return [];
                }
            }).catch(e => {
                console.error("Could not fetch build manifest. Caching will be incomplete.", e);
                return [];
            });
        
        const allUrlsToCache = [...PRECACHE_ASSETS, ...assetManifest.map(url => `/_next/${url}`)];

        console.log('Service Worker: Caching files:', allUrlsToCache);

        await cache.addAll(allUrlsToCache.filter(url => !url.includes('.hot-update.')));
    })());
});

// On activate, clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Use a cache-first strategy for fetching resources
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // For navigation requests (loading a new page), use a network-first strategy
    // to ensure the user gets the latest version of the page if they are online.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    // Try the network first
                    const networkResponse = await fetch(event.request);
                    return networkResponse;
                } catch (error) {
                    // If the network fails, try to serve from cache
                    const cache = await caches.open(CACHE_NAME);
                    const cachedResponse = await cache.match('/'); // Fallback to the root page
                    return cachedResponse;
                }
            })()
        );
        return;
    }

    // For other assets (CSS, JS, images), use cache-first
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                // Return the cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not in cache, fetch from the network
                return fetch(event.request).then((networkResponse) => {
                    // Optionally, you can add the new resource to the cache here
                    // cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});
