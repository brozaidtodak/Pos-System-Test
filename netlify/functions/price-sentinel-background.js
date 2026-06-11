/**
 * price-sentinel-background.js — Integration hardening #2 (p1_633).
 * Daily: pull LIVE TikTok prices, compare each mapped product's effective price
 * (live × (1 − active campaign discount)) against COST, and the live base price
 * against the POS intended price (tiktok_price). Flags:
 *   below_cost — effective live price < cost (BD069 class)
 *   drift      — live base differs from POS price by > DRIFT_PCT (push failed / changed on marketplace)
 * Writes findings to price_sentinel (replaced each run). Background fn; cron-triggered.
 *
 * ?mode=peek returns the computed findings without writing (test).
 */
const tt = require('./_tiktok');

const DRIFT_PCT = 30;   // % gap between live and POS price to flag as drift
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function json(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}
function ttSkuPrice(sku) {
    const p = sku.price || {};
    const v = p.sale_price || p.tax_exclusive_price || p.original_price || p.amount || p.list_price;
    return parseFloat(v) || 0;
}

async function computeTiktok() {
    const tok = await tt.getValidToken();
    const cipher = await tt.ensureShopCipher(tok);
    const products = await tt.getTiktokProducts(tok.access_token, cipher);
    // live base price by seller_sku
    const live = {};
    for (const p of products) for (const s of (p.skus || [])) {
        const ss = (s.seller_sku || '').toUpperCase();
        if (ss) live[ss] = ttSkuPrice(s);
    }
    const rows = await tt.sb('GET', '/products_master?select=sku,cost_price,tiktok_price,tiktok_campaign&metadata->>tiktok_sku_id=not.is.null');
    const findings = [];
    let checked = 0;
    for (const r of rows) {
        const sku = (r.sku || '').toUpperCase();
        const lp = live[sku];
        if (lp == null || lp <= 0) continue; // not live / no price
        checked++;
        const cost = parseFloat(r.cost_price) || 0;
        const pos = parseFloat(r.tiktok_price) || 0;
        const camp = r.tiktok_campaign && r.tiktok_campaign.active ? r.tiktok_campaign : null;
        const disc = camp && camp.discount_value != null ? Number(camp.discount_value) : 0;
        const eff = round2(lp * (1 - disc / 100));
        if (cost > 0 && eff < cost) {
            findings.push({ sku, platform: 'TikTok', flag: 'below_cost', live_price: lp, effective_price: eff, cost, pos_price: pos, campaign_disc: disc || null,
                detail: `Live ${lp}${disc ? ` −${disc}% = ${eff}` : ''} < kos ${cost}` });
        } else if (pos > 0 && lp > 0 && Math.abs(lp - pos) / pos > DRIFT_PCT / 100) {
            findings.push({ sku, platform: 'TikTok', flag: 'drift', live_price: lp, effective_price: eff, cost, pos_price: pos, campaign_disc: disc || null,
                detail: `Live ${lp} vs POS ${pos} (beza ${Math.round(Math.abs(lp - pos) / pos * 100)}%)` });
        }
    }
    return { checked, findings };
}

exports.handler = async (event) => {
    const mode = (event && event.queryStringParameters && event.queryStringParameters.mode) || 'sync';
    try {
        const { checked, findings } = await computeTiktok();
        const now = new Date().toISOString();
        if (mode === 'peek') {
            return json(200, { mode, checked, below_cost: findings.filter(f => f.flag === 'below_cost').length, drift: findings.filter(f => f.flag === 'drift').length, findings: findings.slice(0, 40) });
        }
        // replace TikTok findings
        await tt.sb('DELETE', '/price_sentinel?platform=eq.TikTok', null, { Prefer: 'return=minimal' });
        if (findings.length) {
            const rows = findings.map(f => Object.assign({}, f, { checked_at: now }));
            for (let i = 0; i < rows.length; i += 200) await tt.sb('POST', '/price_sentinel', rows.slice(i, i + 200), { Prefer: 'return=minimal' });
        }
        return json(200, { mode: 'sync', checked, below_cost: findings.filter(f => f.flag === 'below_cost').length, drift: findings.filter(f => f.flag === 'drift').length, checked_at: now });
    } catch (err) {
        return json(500, { error: String(err) });
    }
};
