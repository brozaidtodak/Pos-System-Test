/**
 * TikTok Shop sync — Netlify Function (p3_9 direct integration, Phase 2).
 *
 * Phase 2a (this version) — VERIFY + PEEK, does NOT write to sales_history yet:
 *   1. Load token from Supabase tiktok_tokens; refresh access_token if expired.
 *   2. GET /authorization/202309/shops → store shop_cipher + shop_id.
 *   3. POST /order/202309/orders/search → list recent order IDs.
 *   4. GET /order/202309/orders?ids=... → return raw order detail shape.
 * Returns a JSON summary. Once the real order shape is confirmed, Phase 2b
 * adds the order → sales_history mapping + dedup upsert.
 *
 * Public URL: https://pos.10camp.com/api/tiktok-sync
 *
 * Signature algorithm (TikTok Shop Open API 202309), verified against the
 * EcomPHP/tiktokshop-php SDK:
 *   sign = HMAC-SHA256( app_secret + path + sortedParams + body + app_secret,
 *                       key = app_secret )  → lowercase hex
 *   sortedParams: all query params except sign/access_token/x-tts-access-token,
 *   keys sorted alphabetically, concatenated as {key}{value}. Body appended for
 *   non-GET requests when content-type is not multipart/form-data.
 */

const crypto = require('crypto');

const API_BASE   = 'https://open-api.tiktokglobalshop.com';
const TOKEN_BASE = 'https://auth.tiktok-shops.com/api/v2/token';
const VERSION    = '202309';

const APP_KEY     = process.env.TIKTOK_APP_KEY || '';
const APP_SECRET  = process.env.TIKTOK_APP_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';

function json(statusCode, obj) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(obj, null, 2)
    };
}

// ---- Supabase (service-role) ----
async function sb(method, path, body, extraHeaders) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        method,
        headers: Object.assign({
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
        }, extraHeaders || {}),
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
}

// ---- TikTok signature ----
function signRequest(path, query, bodyStr, isGet) {
    const keys = Object.keys(query)
        .filter(k => k !== 'sign' && k !== 'access_token' && k !== 'x-tts-access-token')
        .sort();
    let s = '';
    for (const k of keys) {
        if (Array.isArray(query[k])) continue;
        s += `${k}${query[k]}`;
    }
    s = path + s;
    if (!isGet && bodyStr) s += bodyStr;
    s = APP_SECRET + s + APP_SECRET;
    return crypto.createHmac('sha256', APP_SECRET).update(s).digest('hex');
}

// ---- Signed TikTok Open API call ----
async function ttRequest(method, path, { query = {}, body = null, accessToken, shopCipher } = {}) {
    const isGet = method.toUpperCase() === 'GET';
    const q = Object.assign({}, query, {
        app_key: APP_KEY,
        timestamp: Math.floor(Date.now() / 1000).toString()
    });
    // shop_cipher applies to shop-scoped calls — not /authorization/ or /seller/ paths
    const noCipher = /^\/(authorization|seller)\/\d{6}\//.test(path);
    if (shopCipher && !noCipher) q.shop_cipher = shopCipher;

    const bodyStr = (!isGet && body != null) ? JSON.stringify(body) : '';
    q.sign = signRequest(path, q, bodyStr, isGet);

    const qs = Object.entries(q)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

    const res = await fetch(`${API_BASE}${path}?${qs}`, {
        method,
        headers: {
            'x-tts-access-token': accessToken,
            'content-type': 'application/json'
        },
        body: bodyStr || undefined
    });
    const data = await res.json();
    return data;
}

// ---- Token: load + refresh if expired ----
async function getValidToken() {
    const rows = await sb('GET', '/tiktok_tokens?order=created_at.desc&limit=1');
    if (!rows || !rows.length) throw new Error('No TikTok token in tiktok_tokens — run the authorize flow first.');
    let tok = rows[0];

    const expMs = new Date(tok.access_token_expire_at).getTime();
    // refresh if expiring within 1 hour
    if (expMs - Date.now() < 60 * 60 * 1000) {
        const url = `${TOKEN_BASE}/refresh?app_key=${encodeURIComponent(APP_KEY)}`
            + `&app_secret=${encodeURIComponent(APP_SECRET)}`
            + `&refresh_token=${encodeURIComponent(tok.refresh_token)}`
            + `&grant_type=refresh_token`;
        const r = await fetch(url);
        const j = await r.json();
        if (j.code !== 0 || !j.data || !j.data.access_token) {
            throw new Error(`Token refresh failed: ${j.message || 'unknown'} (code ${j.code})`);
        }
        const d = j.data;
        const patch = {
            access_token: d.access_token,
            access_token_expire_at: new Date((d.access_token_expire_in || 0) * 1000).toISOString(),
            refresh_token: d.refresh_token || tok.refresh_token,
            refresh_token_expire_at: d.refresh_token_expire_in
                ? new Date(d.refresh_token_expire_in * 1000).toISOString()
                : tok.refresh_token_expire_at,
            updated_at: new Date().toISOString()
        };
        await sb('PATCH', `/tiktok_tokens?open_id=eq.${encodeURIComponent(tok.open_id)}`, patch,
            { Prefer: 'return=minimal' });
        tok = Object.assign(tok, patch);
    }
    return tok;
}

exports.handler = async () => {
    if (!APP_KEY || !APP_SECRET) return json(500, { error: 'TIKTOK_APP_KEY / TIKTOK_APP_SECRET not set' });
    if (!SERVICE_KEY) return json(500, { error: 'SUPABASE_SERVICE_KEY not set' });

    const out = { phase: '2a verify+peek', steps: {} };

    try {
        // Step 1 — token
        const tok = await getValidToken();
        out.steps.token = { open_id: tok.open_id, seller_name: tok.seller_name, region: tok.seller_base_region };

        // Step 2 — get authorized shop → shop_cipher
        const shopsRes = await ttRequest('GET', `/authorization/${VERSION}/shops`, { accessToken: tok.access_token });
        if (shopsRes.code !== 0) {
            out.steps.shops = { error: shopsRes.message, code: shopsRes.code, raw: shopsRes };
            return json(502, out);
        }
        const shops = (shopsRes.data && shopsRes.data.shops) || [];
        out.steps.shops = shops.map(s => ({ id: s.id, name: s.name, region: s.region, cipher_present: !!s.cipher }));

        if (!shops.length) { out.note = 'No authorized shops returned.'; return json(200, out); }
        const shop = shops[0];

        // store shop_cipher + shop_id
        await sb('PATCH', `/tiktok_tokens?open_id=eq.${encodeURIComponent(tok.open_id)}`,
            { shop_cipher: shop.cipher, shop_id: String(shop.id), updated_at: new Date().toISOString() },
            { Prefer: 'return=minimal' });
        out.steps.shop_cipher_stored = true;

        // Step 3 — list recent orders (last 7 days)
        const createGe = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
        const listRes = await ttRequest('POST', `/order/${VERSION}/orders/search`, {
            query: { page_size: 10, sort_field: 'create_time', sort_order: 'DESC' },
            body: { create_time_ge: createGe },
            accessToken: tok.access_token,
            shopCipher: shop.cipher
        });
        if (listRes.code !== 0) {
            out.steps.order_list = { error: listRes.message, code: listRes.code, raw: listRes };
            return json(502, out);
        }
        const orderIds = ((listRes.data && listRes.data.orders) || []).map(o => o.id);
        out.steps.order_list = { count: orderIds.length, ids: orderIds, total_count: listRes.data && listRes.data.total_count };

        // Step 4 — peek order detail (raw shape of first batch)
        if (orderIds.length) {
            const detailRes = await ttRequest('GET', `/order/${VERSION}/orders`, {
                query: { ids: orderIds.slice(0, 5).join(',') },
                accessToken: tok.access_token,
                shopCipher: shop.cipher
            });
            out.steps.order_detail = detailRes.code === 0
                ? { raw_first_order: (detailRes.data && detailRes.data.orders && detailRes.data.orders[0]) || null }
                : { error: detailRes.message, code: detailRes.code };
        }

        out.ok = true;
        return json(200, out);

    } catch (err) {
        out.error = String(err);
        return json(500, out);
    }
};
