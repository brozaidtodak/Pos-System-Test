/**
 * price-sentinel-cron.js — daily scheduled trigger (see netlify.toml). Fires the heavy
 * price-sentinel-background fn so price-drift / below-cost findings stay fresh in
 * price_sentinel. Returns immediately.
 */
const { requireAuth, internalHeaders } = require('./_auth'); // p1_787 (C1)
exports.handler = async (event) => {
    const __a = await requireAuth(event); if (!__a.ok) return __a.response;
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://www.10camp.com';
    try { await fetch(`${base}/.netlify/functions/price-sentinel-background?mode=sync`, { headers: internalHeaders() }); }
    catch (e) { return { statusCode: 200, body: `trigger attempted: ${String(e)}` }; }
    return { statusCode: 200, body: 'price-sentinel-background triggered' };
};
