/**
 * sw.js — Service Worker untuk OFFLINE PENUH (p1_975).
 *
 * SEJARAH: SW lama dipencen (p1_560) sebab jadi punca KOD BASI — versi lama
 * precache index.html/app.js (network-first salah) lalu serve kod lama di device staf.
 *
 * STRATEGI SELAMAT kali ni (elak basi):
 *   1. HTML / navigation  → NETWORK-FIRST. Bila online SENTIASA ambil fresh dari
 *      rangkaian; cache hanya dipakai bila OFFLINE. Jadi tak mungkin serve HTML basi
 *      semasa online.
 *   2. Aset berversi (app.js?v=NNN, design-tokens.css?v=NNN) → URL berubah bila versi
 *      naik, jadi versi baru = URL baru = ambil fresh. Guna stale-while-revalidate:
 *      pantas (dari cache) + kemas kini latar belakang.
 *   3. API DATA (Supabase, /api/, /.netlify/, analytics) → TIDAK PERNAH di-cache.
 *      Bacaan live sentiasa terus ke rangkaian; offline-queue app handle tulisan.
 *   4. skipWaiting + clients.claim + buang cache lama pada activate → SW baru ambil
 *      alih serta-merta, tiada cache tersangkut.
 *
 * Rollback: kalau SW ni buat hal, ganti fail ni dengan versi unregister (p1_560) +
 * buang pendaftaran dalam index.html, deploy — device akan self-clean.
 */
const CACHE = 'pos-shell-v1';            // bump nilai ni untuk paksa buang cache lama

self.addEventListener('install', (e) => {
    e.waitUntil((async () => {
        try { const c = await caches.open(CACHE); await c.addAll(['/', '/index.html']); } catch (_) {}
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
        } catch (_) {}
        try { await self.clients.claim(); } catch (_) {}
    })());
});

// Endpoint DATA dinamik — jangan sentuh (terus ke rangkaian; offline = app handle).
function isDynamic(url) {
    const h = url.hostname;
    if (h.endsWith('supabase.co') || h.endsWith('supabase.in')) return true;
    if (h.includes('google-analytics') || h.includes('googletagmanager') ||
        h.includes('analytics.tiktok') || h.includes('facebook') || h.includes('doubleclick') ||
        h === 'analytics.10camp.com') return true;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return true;
    return false;
}

function cacheable(res) {
    return res && (res.status === 200 || res.type === 'opaque');
}

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;                     // POST/PATCH dll → biar lalu (tulisan data)
    let url;
    try { url = new URL(req.url); } catch (_) { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (isDynamic(url)) return;                            // data API → tak cache

    const isHTML = req.mode === 'navigate' || req.destination === 'document' ||
                   url.pathname === '/' || url.pathname.endsWith('.html');

    if (isHTML) {
        // NETWORK-FIRST: fresh bila online, cache fallback bila offline.
        e.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                if (cacheable(fresh)) { const c = await caches.open(CACHE); c.put(req, fresh.clone()).catch(() => {}); }
                return fresh;
            } catch (_) {
                const cached = (await caches.match(req)) || (await caches.match('/index.html')) || (await caches.match('/'));
                return cached || new Response('Offline — sila sambung internet sekali untuk muat app.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
            }
        })());
        return;
    }

    // Aset shell (app.js?v=, css, font, lucide/chart CDN, gambar) → stale-while-revalidate.
    e.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
            if (cacheable(res)) cache.put(req, res.clone()).catch(() => {});
            return res;
        }).catch(() => null);
        return cached || (await network) || new Response('', { status: 504 });
    })());
});
