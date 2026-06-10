// p1_560 — Service Worker DIPENCEN (bug audit #27/#10/#26).
// Versi lama (network-first + precache index.html/app.js) boleh serve KOD LAMA di device staf
// (cth iPad Ariff: fix custom-sale '+' p1_554 tak sampai walaupun dah ship). App ni online-only
// (Capacitor + web load live site), jadi SW tak beri manfaat offline — cuma jadi punca cache basi.
// Versi ni: bersihkan SEMUA cache + unregister diri, supaya device staf berhenti melekat pada
// kod lama dan sentiasa ambil versi terbaru terus dari rangkaian (?v=NNN cache-bust kekal jalan).
self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch (_) {}
    try { await self.clients.claim(); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
  })());
});

// Tiada fetch handler — semua request terus ke rangkaian (sentiasa fresh).
