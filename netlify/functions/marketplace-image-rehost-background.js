/**
 * Re-host marketplace images into 10 CAMP's own storage — Netlify BACKGROUND
 * Function (p1_431). The "-background" suffix gives it up to 15 min and async
 * execution (returns 202 immediately).
 *
 * Walks products_master, finds images still pointing at external CDNs
 * (Shopee / TikTok / ibyteimg), downloads each one and uploads it to the public
 * Supabase bucket `product-images`, then rewrites products_master.images with the
 * new storage URLs. Idempotent: images already on our storage are skipped, so it
 * can be re-run safely until none remain. Groups variants (same tiktok_product_id
 * / shopee_item_id) so a shared gallery is fetched once and applied to all.
 *
 *   GET /api/marketplace-image-rehost-background   (fire once; poll the DB)
 *
 * Stops ~13.5 min in to stay under the 15-min cap — re-trigger to continue.
 */

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

function parseImgs(images) {
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === 'string') { try { const a = JSON.parse(images); return Array.isArray(a) ? a.filter(Boolean) : (images ? [images] : []); } catch (_) { return images ? [images] : []; } }
    return [];
}

exports.handler = async () => {
    if (!SERVICE_KEY) return { statusCode: 500, body: 'no service key' };
    const start = Date.now();
    const DEADLINE = 13.5 * 60 * 1000;

    const rows = await sb('GET', '/products_master?select=sku,images,metadata&limit=10000') || [];
    // group by marketplace product id (variants share a gallery)
    const groups = {};
    for (const r of rows) {
        const imgs = parseImgs(r.images);
        if (!imgs.length || !imgs.some(u => !isOurs(u))) continue; // nothing external to move
        const m = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};
        const key = m.tiktok_product_id || m.shopee_item_id || imgs[0];
        const g = groups[key] = groups[key] || { skus: [], imgs };
        g.skus.push(r.sku);
    }

    let groupsDone = 0, uploaded = 0, failed = 0;
    for (const key of Object.keys(groups)) {
        if (Date.now() - start > DEADLINE) { console.log('[rehost] deadline reached, stopping'); break; }
        const g = groups[key];
        const safeKey = String(key).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || (g.skus[0] || 'p');
        const newImgs = [];
        let idx = 0;
        for (const url of g.imgs) {
            if (isOurs(url)) { newImgs.push(url); continue; }
            idx++;
            let ext = 'jpg';
            const mt = String(url).match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
            if (mt) ext = mt[1].toLowerCase().replace('jpeg', 'jpg');
            try {
                const nu = await rehostOne(url, `products/${safeKey}_${idx}.${ext}`);
                newImgs.push(nu); uploaded++;
            } catch (e) { newImgs.push(url); failed++; console.log('[rehost] img fail', safeKey, idx, String(e).slice(0, 120)); }
        }
        try {
            const skuList = g.skus.map(s => encodeURIComponent('"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"')).join(','); // p1_789 (M5)
            await sb('PATCH', `/products_master?sku=in.(${skuList})`, { images: newImgs }, { Prefer: 'return=minimal' });
            groupsDone++;
        } catch (e) { console.log('[rehost] patch fail', safeKey, String(e).slice(0, 120)); }
    }
    console.log(`[rehost] done — groups:${groupsDone} uploaded:${uploaded} failed:${failed}`);
    return { statusCode: 200, body: JSON.stringify({ groupsDone, uploaded, failed }) };
};
