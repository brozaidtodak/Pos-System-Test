/**
 * tiktok-chat.js — TikTok Shop seller<->buyer chat (omnichannel inbox, Fasa TikTok).
 * Reads conversations + messages via TikTok Shop Customer Service (IM) API.
 * Uses the existing TikTok Shop token + shop_cipher (same as orders/products fns).
 * Requires the partner app to have the Customer Service / messaging scope; else
 * returns a permission error (this probe surfaces that).
 *
 *   ?mode=conversations              — list conversations (default; probe)
 *   ?mode=messages&conversation_id=… — messages in one conversation
 *
 * Public URL: /.netlify/functions/tiktok-chat
 */
const { VERSION, ttRequest, getValidToken, ensureShopCipher } = require('./_tiktok');
const { requireAuth } = require('./_auth');

function json(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}

exports.handler = async (event) => {
    // p1_1046 — SECURITY: gate requireAuth (sebelum ni terbuka; chat customer = PII)
    const auth = await requireAuth(event);
    if (!auth.ok) return auth.response;
    const p = (event && event.queryStringParameters) || {};
    const mode = p.mode || 'conversations';
    try {
        const tok = await getValidToken();
        const cipher = await ensureShopCipher(tok);
        // TikTok validation: page_size mesti 1-20 (36009004 kalau lebih) — clamp server-side
        const pageSize = Math.min(20, Math.max(1, Number(p.page_size) || 20));
        if (mode === 'messages') {
            if (!p.conversation_id) return json(400, { error: 'conversation_id required' });
            const r = await ttRequest('GET', `/customer_service/${VERSION}/conversations/${encodeURIComponent(p.conversation_id)}/messages`, {
                query: { page_size: pageSize },
                accessToken: tok.access_token, shopCipher: cipher
            });
            return json(200, r);
        }
        // default: conversations (probe)
        const r = await ttRequest('GET', `/customer_service/${VERSION}/conversations`, {
            query: { page_size: pageSize },
            accessToken: tok.access_token, shopCipher: cipher
        });
        return json(200, r);
    } catch (e) {
        return json(500, { error: String(e) });
    }
};
