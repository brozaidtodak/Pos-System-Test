/**
 * Marketplace Settings — Netlify Function (p1_296).
 *
 * Read/save the per-channel price markup config used by marketplace-price-push.
 * Stored in app_settings (key='marketplace_markup') so both the POS UI and the
 * server-side push read the same source of truth.
 *
 *   GET  /api/marketplace-settings           → { shopee:{mode,value}, tiktok:{mode,value} }
 *   POST /api/marketplace-settings  {shopee:{mode,value}, tiktok:{mode,value}}
 *
 * mode: 'pct' (percent markup) | 'rm' (flat RM add-on). value: number.
 */

const { sb } = require('./_shopee');

const KEY = 'marketplace_markup';
const DEFAULTS = { shopee: { mode: 'pct', value: 8 }, tiktok: { mode: 'pct', value: 5 } };

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj, null, 2) };
}

// Coerce one channel's config to a safe {mode,value}.
function clean(ch, fallback) {
    ch = ch && typeof ch === 'object' ? ch : {};
    const mode = ch.mode === 'rm' ? 'rm' : 'pct';
    let value = Number(ch.value);
    if (!isFinite(value) || value < 0) value = fallback.value;
    return { mode, value };
}

exports.handler = async (event) => {
    try {
        if (event.httpMethod === 'POST') {
            let body = {};
            try { body = JSON.parse(event.body || '{}'); } catch (_) {}
            const value = {
                shopee: clean(body.shopee, DEFAULTS.shopee),
                tiktok: clean(body.tiktok, DEFAULTS.tiktok)
            };
            await sb('POST', '/app_settings?on_conflict=key',
                { key: KEY, value, updated_at: new Date().toISOString() },
                { Prefer: 'resolution=merge-duplicates,return=minimal' });
            return json(200, { ok: true, saved: value });
        }

        // GET
        const rows = await sb('GET', `/app_settings?key=eq.${KEY}&select=value&limit=1`);
        const value = (rows && rows[0] && rows[0].value) || DEFAULTS;
        return json(200, {
            shopee: clean(value.shopee, DEFAULTS.shopee),
            tiktok: clean(value.tiktok, DEFAULTS.tiktok)
        });
    } catch (err) {
        return json(500, { error: String(err) });
    }
};
