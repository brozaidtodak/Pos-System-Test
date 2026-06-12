/**
 * easystore-order-peek.js — THROWAWAY probe (p1_682 feasibility check).
 * Fetch one EasyStore order by id and return the fields that might carry the original
 * marketplace (Shopee/TikTok) order number — to decide if a historical id backfill is feasible.
 * Delete after use.  ?id=107776674
 */
const ES_BASE  = 'https://www.10camp.com/api/3.0';
const ES_TOKEN = process.env.EASYSTORE_TOKEN || '';

exports.handler = async (event) => {
    const id = (event.queryStringParameters || {}).id || '107776674';
    if (!ES_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'EASYSTORE_TOKEN not set' }) };
    try {
        const r = await fetch(`${ES_BASE}/orders/${id}.json`, { headers: { 'EasyStore-Access-Token': ES_TOKEN, 'Content-Type': 'application/json' } });
        const t = await r.text();
        let j; try { j = JSON.parse(t); } catch (_) { return { statusCode: 200, body: JSON.stringify({ http: r.status, nonjson: t.slice(0, 300) }) }; }
        const o = j.order || j;
        // surface the candidate keys for matching to a marketplace order_sn
        const pick = {};
        ['id', 'name', 'order_number', 'source_name', 'source', 'source_identifier', 'reference',
         'channel', 'channel_name', 'note', 'tags', 'fulfillment_status', 'financial_status'].forEach(k => { if (o[k] !== undefined) pick[k] = o[k]; });
        return { statusCode: 200, body: JSON.stringify({ http: r.status, all_keys: Object.keys(o), picked: pick }, null, 2) };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: String(e).slice(0, 200) }) };
    }
};
