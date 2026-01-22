// sw.js

// Define cache names and versions
const STATIC_CACHE_NAME = 'truawake-static-cache-v3';
const API_CACHE_NAME = 'truawake-api-cache-v1';

// List of static assets to cache during installation
const urlsToCache = [
  './',
  './index.html',
  './metadata.json',
  './vite.svg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css',
  'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://aistudiocdn.com/recharts@^3.2.1',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  'https://aistudiocdn.com/@google/genai@^1.25.0',
  'https://aistudiocdn.com/@supabase/supabase-js@^2.44.4',
  'https://aistudiocdn.com/leaflet@^1.9.4',
  'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
  'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  'https://actions.google.com/sounds/v1/alarms/dosimeter_alarm.ogg',
  'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
];

// Service worker installation: Caches all essential static assets.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching core static assets.');
        const cachePromises = urlsToCache.map(url => {
            return cache.add(new Request(url, { cache: 'no-cache' })).catch(err => console.warn(`Failed to cache ${url}:`, err));
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker: Installation complete.');
        self.skipWaiting();
      })
  );
});

// Service worker activation: Cleans up old caches.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const allowedCaches = [STATIC_CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!allowedCaches.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete.');
      return self.clients.claim();
    })
  );
});

// Service worker fetch: Implements caching strategies for API calls and static assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests. Let the browser handle them.
  if (request.method !== 'GET') {
    return;
  }

  // Define API origins
  const apiOrigins = [
    'yyrqxvefirfjjtlloouhc.supabase.co', // Supabase
    'api.open-meteo.com',              // Open-Meteo
    'nominatim.openstreetmap.org',     // Nominatim
    'corsproxy.io',                    // CORS Proxy
  ];

  // Strategy for API calls: Network-first, then cache
  if (apiOrigins.includes(url.hostname)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.log('Service Worker: Network request failed, trying cache for', request.url);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(JSON.stringify({ error: 'Offline and not in cache' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }

  // Strategy for all other requests (static assets): Cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // If we have a cached response, return it.
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise, try to fetch from the network.
      return fetch(request).then((networkResponse) => {
        // If the fetch is successful, cache it and return it.
        if (networkResponse.ok && url.protocol.startsWith('http')) {
          const cacheResponse = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then(cache => cache.put(request, cacheResponse));
        }
        return networkResponse;
      }).catch(error => {
        // If the network fetch fails (e.g., user is offline), log the error.
        // The browser will handle the failed request for the asset.
        console.warn('Service Worker: Static asset fetch failed for', request.url, error);
        // Re-throw the error to ensure the browser sees the fetch as failed.
        throw error;
      });
    })
  );
});


// Listener for post messages from the main app, e.g., to show a notification.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: './vite.svg',
      })
    );
  }
});