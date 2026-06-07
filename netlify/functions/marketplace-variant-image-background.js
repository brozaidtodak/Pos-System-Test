/**
 * Per-variant images from TikTok — Netlify BACKGROUND Function (p1_435).
 *
 * The bulk import (p1_430) gave every variant the SAME product gallery. TikTok
 * actually stores a distinct image per variant at
 *   skus[].sales_attributes[].sku_img.urls[0]
 * This walks each TikTok-mapped product group, fetches the product, and for
 * every POS variant (matched by metadata.tiktok_sku_id == sku.id) sets:
 *   images = [ rehosted(variant sku_img), ...the group's shared gallery ]
 * The variant's own image becomes the primary (shown on the card + as the PDP
 * main image); the full gallery still follows.
 *
 * Re-hosts the variant image into our product-images bucket. Idempotent: a
 * group is skipped once its variants already have DIFFERENT first images.
 * 13.5-min internal deadline; re-trigger to continue.
 */

const tiktok = require('./_tiktok');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = 'product-images';
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

async function sb(method, path, body, extraHeaders) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        method,
        headers: Object.assign({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }, extraHeaders || {}),
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
}

function parseImgs(images) {
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === 'string') { try { const a = JSON.parse(images); return Array.isArray(a) ? a.filter(Boolean) : (images ? [images] : []); } catch (_) { return images ? [images] : []; } }
    return [];
}
const isOurs = (u) => typeof u === 'string' && u.indexOf(PUBLIC_PREFIX) === 0;

async function rehostOne(url, path) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('download ' + res.status);
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': ct, 'x-upsert': 'true' },
        body: buf
    });
    if (!up.ok) { const t = await up.text(); throw new Error('upload ' + up.status + ' ' + t.slice(0, 120)); }
    return PUBLIC_PREFIX + path;
}

exports.handler = async () => {
    if (!SERVICE_KEY) return { statusCode: 500, body: 'no service key' };
    const start = Date.now();
    const DEADLINE = 13.5 * 60 * 1000;

    const rows = await sb('GET', '/products_master?select=sku,images,metadata&limit=10000') || [];
    // group by tiktok_product_id
    const groups = {};
    for (const r of rows) {
        const m = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};
        if (!m.tiktok_product_id || !m.tiktok_sku_id) continue;
        const g = groups[m.tiktok_product_id] = groups[m.tiktok_product_id] || [];
        g.push({ sku: r.sku, images: parseImgs(r.images), sid: String(m.tiktok_sku_id) });
    }

    let groupsDone = 0, variantsSet = 0, failed = 0;
    for (const pid of Object.keys(groups)) {
        if (Date.now() - start > DEADLINE) { console.log('[variant-img] deadline'); break; }
        const vars = groups[pid];
        if (vars.length < 2) continue;                          // not a real variant group
        const firsts = new Set(vars.map(v => v.images[0] || ''));
        if (firsts.size > 1) continue;                          // already per-variant → skip

        // shared gallery = current images (already re-hosted) of any variant
        const gallery = (vars[0].images || []).filter(isOurs);
        let r;
        try {
            const tok = await tiktok.getValidToken();
            const cipher = await tiktok.ensureShopCipher(tok);
            r = await tiktok.ttRequest('GET', `/product/${tiktok.VERSION}/products/${pid}`,
                { accessToken: tok.access_token, shopCipher: cipher });
        } catch (e) { console.log('[variant-img] fetch fail', pid, String(e).slice(0, 100)); continue; }
        if (!r || r.code !== 0) { console.log('[variant-img] api', pid, r && r.message); continue; }

        const skuImg = {};
        for (const s of (r.data && r.data.skus) || []) {
            let img = (s.sku_img && s.sku_img.urls && s.sku_img.urls[0]) || '';
            if (!img) { for (const a of (s.sales_attributes || [])) { if (a.sku_img && a.sku_img.urls && a.sku_img.urls[0]) { img = a.sku_img.urls[0]; break; } } }
            if (img) skuImg[String(s.id)] = img;
        }
        let any = false;
        for (const v of vars) {
            const src = skuImg[v.sid];
            if (!src) continue;
            try {
                const rehosted = await rehostOne(src, `products/v_${v.sku}.jpg`);
                const newImgs = [rehosted, ...gallery.filter(u => u !== rehosted)];
                await sb('PATCH', `/products_master?sku=eq.${encodeURIComponent(v.sku)}`, { images: newImgs }, { Prefer: 'return=minimal' });
                variantsSet++; any = true;
            } catch (e) { failed++; console.log('[variant-img] var fail', v.sku, String(e).slice(0, 100)); }
        }
        if (any) groupsDone++;
    }
    console.log(`[variant-img] done groups:${groupsDone} variants:${variantsSet} failed:${failed}`);
    return { statusCode: 200, body: JSON.stringify({ groupsDone, variantsSet, failed }) };
};
