/**
 * shopee-chat.js — Shopee Seller Chat (omnichannel inbox, Fasa 1).
 * Reads buyer<->seller conversations + messages via Shopee Open Platform sellerchat API.
 * Shop-scoped sign (same as other shopee fns). Requires the partner app to have the
 * Chat/SIP API category enabled in Shopee Open Platform console (else returns no-permission).
 *
 *   ?mode=conversations            — list conversations (default; also the probe)
 *   ?mode=messages&conversation_id=… — messages in one conversation
 *
 * Public URL: /.netlify/functions/shopee-chat
 */
const { getValidToken, shopeeGet } = require('./_shopee');

function json(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}

exports.handler = async (event) => {
    const p = (event && event.queryStringParameters) || {};
    const mode = p.mode || 'conversations';
    try {
        const tok = await getValidToken();
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
