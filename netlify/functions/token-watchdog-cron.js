/**
 * token-watchdog-cron.js — twice-daily scheduled trigger (see netlify.toml). Fires
 * token-watchdog-background so token_health stays fresh (catches a broken auto-refresh
 * or a near-expiry Shopee refresh token before sync goes dark). Returns immediately.
 */
exports.handler = async () => {
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://www.10camp.com';
    try { await fetch(`${base}/.netlify/functions/token-watchdog-background?mode=sync`); }
    catch (e) { return { statusCode: 200, body: `trigger attempted: ${String(e)}` }; }
    return { statusCode: 200, body: 'token-watchdog-background triggered' };
};
