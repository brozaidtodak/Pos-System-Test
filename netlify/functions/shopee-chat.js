/**
 * shopee-chat.js — Shopee Seller Chat (omnichannel inbox, Fasa 1 + Fasa 2 reply p1_1046).
 * Reads buyer<->seller conversations + messages via Shopee Open Platform sellerchat API,
 * and (Fasa 2) SENDS text replies. Shop-scoped sign (same as other shopee fns). Requires the
 * partner app to have the Chat/SIP API category enabled in Shopee Open Platform console.
 *
 *   ?mode=conversations              — list conversations (default; also the probe)
 *   ?mode=messages&conversation_id=… — messages in one conversation
 *   ?mode=send  (POST)               — body { to_id, message } → send text reply to buyer
 *
 * p1_1046 — SECURITY: digate requireAuth (staff JWT / internal key). Sebelum ni fungsi ni
 * TERBUKA — chat customer (PII) boleh dibaca sesiapa yang tahu URL. Client hantar
 * Authorization via __authHeaderSync.
 *
 * Public URL: /.netlify/functions/shopee-chat
 */
const { getValidToken, shopeeGet, shopeePost } = require('./_shopee');
const { requireAuth } = require('./_auth');

function json(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}

exports.handler = async (event) => {
    const auth = await requireAuth(event);
    if (!auth.ok) return auth.response;
    const p = (event && event.queryStringParameters) || {};
    const mode = p.mode || 'conversations';
    try {
        const tok = await getValidToken();
        // p1_1046 — Fasa 2: HANTAR balasan teks ke pembeli (POST). Validasi ketat: to_id numerik +
        // mesej 1-1000 aksara. message_type 'text' sahaja (gambar/sticker = fasa lain).
        if (mode === 'send') {
            if (event.httpMethod !== 'POST') return json(405, { error: 'POST only untuk mode=send' });
            let body = {};
            try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { error: 'bad body' }); }
            const toId = Number(body.to_id);
            const msg = String(body.message || '').trim();
            if (!toId || !Number.isFinite(toId)) return json(400, { error: 'to_id (user id pembeli) tak sah' });
            if (!msg) return json(400, { error: 'mesej kosong' });
            if (msg.length > 1000) return json(400, { error: 'mesej terlalu panjang (max 1000 aksara)' });
            const r = await shopeePost('/api/v2/sellerchat/send_message', {}, {
                to_id: toId,
                message_type: 'text',
                content: { text: msg }
            }, tok.access_token, tok.shop_id);
            return json(200, { shop_id: tok.shop_id, ...r });
        }
        if (mode === 'messages') {
            if (!p.conversation_id) return json(400, { error: 'conversation_id required' });
            const r = await shopeeGet('/api/v2/sellerchat/get_message', {
                conversation_id: p.conversation_id,
                page_size: Number(p.page_size) || 25
            }, tok.access_token, tok.shop_id);
            return json(200, { shop_id: tok.shop_id, ...r });
        }
        // default: conversations (probe)
        const r = await shopeeGet('/api/v2/sellerchat/get_conversation_list', {
            type: 'all',
            page_size: Number(p.page_size) || 25,
            direction: 'latest'
        }, tok.access_token, tok.shop_id);
        return json(200, { shop_id: tok.shop_id, ...r });
    } catch (e) {
        return json(500, { error: String(e) });
    }
};
