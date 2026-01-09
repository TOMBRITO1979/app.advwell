const CACHE_NAME = 'advwell-v102';
const urlsToCache = [
  '/'
];

self.addEventListener('install', (event) => {
  // Force immediate activation - skip waiting
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network, never cache JS/CSS
  event.respondWith(fetch(event.request));
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete ALL caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    ])
  );
});
