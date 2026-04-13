// Service worker asas untuk benarkan aplikasi berfungsi secara 'offline' dan boleh di-install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('pos-store-v2').then((cache) => cache.addAll([
      './index.html',
      './style.css',
      './app.js'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
