/**
 * push-retry-cron.js — scheduled trigger (see netlify.toml, every 30 min). Fires
 * push-retry-background so parked marketplace price-push failures get re-attempted
 * with backoff. Returns immediately.
 */
const { requireAuth, internalHeaders } = require('./_auth'); // p1_787 (C1)
exports.handler = async (event) => {
    const __a = await requireAuth(event); if (!__a.ok) return __a.response;
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://www.10camp.com';
    try { await fetch(`${base}/.netlify/functions/push-retry-background?mode=sync`, { headers: internalHeaders() }); }
    catch (e) { return { statusCode: 200, body: `trigger attempted: ${String(e)}` }; }
    return { statusCode: 200, body: 'push-retry-background triggered' };
};
