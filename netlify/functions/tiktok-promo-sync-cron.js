/**
 * tiktok-promo-sync-cron.js — scheduled trigger (see netlify.toml schedule).
 * Fires the heavy tiktok-promo-sync-background function (which has the 15-min
 * background budget) so active TikTok campaigns + below_cost flags stay fresh on
 * products_master.tiktok_campaign. Returns immediately.
 */
const { requireAuth, internalHeaders } = require('./_auth'); // p1_787 (C1)
exports.handler = async (event) => {
    const __a = await requireAuth(event); if (!__a.ok) return __a.response;
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://www.10camp.com';
    try {
        await fetch(`${base}/.netlify/functions/tiktok-promo-sync-background?mode=sync`, { headers: internalHeaders() });
        await fetch(`${base}/.netlify/functions/tiktok-coupon-sync?mode=sync`, { headers: internalHeaders() });
    } catch (e) {
        return { statusCode: 200, body: `trigger attempted: ${String(e)}` };
    }
    return { statusCode: 200, body: 'tiktok promo + coupon sync triggered' };
};
