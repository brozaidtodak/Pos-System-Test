/**
 * EasyStore image import — Netlify Function (p1_489).
 *
 * Fetches a product's images from EasyStore (via products_master.metadata
 * .easystore_product_id) and RETURNS the image URLs. Read-only: it does NOT
 * write to products_master — the client adds the URLs to the editor gallery so
 * the user reviews + clicks Save. Mirrors marketplace-image-import.js (p1_425).
 *
 *   GET ?sku=OP005
 *
 * EasyStore: GET /products/{id}.json -> product.images[].src
 * Fallback : metadata.easystore_images_backup (URLs saved during migration p1_318).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const ES_TOKEN     = process.env.EASYSTORE_TOKEN || '';
const ES_BASE      = 'https://www.10camp.com/api/3.0';

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}

async function sb(path) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
}

async function esGet(path) {
    const r = await fetch(`${ES_BASE}${path}`, {
        headers: { 'EasyStore-Access-Token': ES_TOKEN, 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error(`EasyStore ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
}

// EasyStore/Shopify-style product.images[] → list of URL strings (handles a few shapes)
function extractImages(product) {
    const imgs = (product && (product.images || product.media)) || [];
    const urls = [];
    for (const im of imgs) {
        const u = (im && (im.src || im.url || im.image_url || (im.image && im.image.src))) || (typeof im === 'string' ? im : '');
        if (u) urls.push(String(u));
    }
    return urls;
}

exports.handler = async (event) => {
    const q = event.queryStringParameters || {};
    const sku = (q.sku || '').trim().toUpperCase();
    const out = { sku, images: [] };

    if (!sku) return json(400, { error: 'sku required (e.g. ?sku=OP005)' });
    if (!SERVICE_KEY) return json(500, { error: 'SUPABASE_SERVICE_KEY not set' });

    try {
        const rows = await sb(`/products_master?select=sku,metadata&sku=eq.${encodeURIComponent(sku)}`);
        if (!rows || !rows.length) return json(404, { error: `SKU ${sku} not found in products_master` });
        const meta = (rows[0].metadata && typeof rows[0].metadata === 'object') ? rows[0].metadata : {};
        const esId = meta.easystore_product_id;
        let urls = [];
        let source = null;

        // 1) Live EasyStore API (current gallery)
        if (esId && ES_TOKEN) {
            try {
                const resp = await esGet(`/products/${esId}.json`);
                const product = resp.product || resp;
                urls = extractImages(product);
                if (urls.length) source = 'easystore_api';
            } catch (e) { out.api_error = String(e); }
        }
        // 2) Fallback: original EasyStore URLs saved during migration (p1_318)
        if (!urls.length && Array.isArray(meta.easystore_images_backup)) {
            urls = meta.easystore_images_backup.filter(u => typeof u === 'string' && u);
            if (urls.length) source = 'backup';
        }

        const seen = new Set();
        out.images = urls.filter(u => u && !seen.has(u) && seen.add(u));
        out.count = out.images.length;
        out.source = source;
        out.mapped = !!esId;
        out.ok = true;
        if (!out.count) {
            out.note = esId
                ? 'EasyStore mapped tapi tiada gambar dijumpai (atau EASYSTORE_TOKEN tak set di Netlify).'
                : 'Produk ni takde easystore_product_id (tak dipetakan ke EasyStore).';
        }
        return json(200, out);
    } catch (err) {
        out.ok = false;
        out.error = String(err);
        return json(500, out);
    }
};
