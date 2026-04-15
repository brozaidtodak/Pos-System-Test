// Service worker asas untuk benarkan aplikasi berfungsi secara 'offline' dan boleh di-install
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  e.waitUntil(
    caches.open('pos-store-v3').then((cache) => cache.addAll([
      './index.html',
      './style.css',
      './app.js'
    ]))
  );
});

self.addEventListener('activate', (e) => {
  // Clear old caches
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== 'pos-store-v3') {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network-First Strategy 
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
