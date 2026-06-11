/**
 * Marketplace Price Push — Netlify Function (p1_295, "manage listing from POS").
 *
 * Pushes POS price (+ per-channel markup to cover marketplace commission) out to
 * Shopee + TikTok listings. POS becomes the price master.
 *
 *   base price = products_master.price_marketplace ?? products_master.price
 *   Shopee price = round2(base * (1 + SHOPEE_MARKUP%))
 *   TikTok price = round2(base * (1 + TIKTOK_MARKUP%))
 *
 * Modes (SAFE BY DEFAULT):
 *   ?mode=dryrun (default) — compute the plan, write NOTHING. Review first.
 *   ?mode=push             — actually update marketplace prices (LIVE, money!).
 * Markup override: ?shopee_markup=8&tiktok_markup=5  (percent)
 * Scope: POST {skus:[...]} or ?skus=A,B,C ; omit → all mapped products.
 *
 * Shopee: POST /api/v2/product/update_price {item_id, price_list:[{model_id, original_price}]}
 * TikTok: POST /product/202309/products/{id}/prices/update {skus:[{id, price:{amount,currency}}]}
 */

const shopee = require('./_shopee');
const tiktok = require('./_tiktok');

const DEFAULT_SHOPEE_MARKUP = 8;   // percent — covers ~Shopee commission+processing
const DEFAULT_TIKTOK_MARKUP = 5;   // percent — covers ~TikTok commission+processing
const CURRENCY = 'MYR';

function json(statusCode, obj) {
    return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function parseSkus(event) {
    let skus = [];
    if (event.body) { try { const b = JSON.parse(event.body); if (Array.isArray(b.skus)) skus = b.skus; } catch (_) {} }
    const q = (event.queryStringParameters || {}).skus;
    if (!skus.length && q) skus = q.split(',');
    const seen = new Set(); const clean = [];
    for (const s of skus) {
        const sku = (s || '').trim().toUpperCase();
        if (!sku || sku.startsWith('CUSTOM-') || seen.has(sku)) continue;
        seen.add(sku); clean.push(sku);
    }
    return clean;
}

exports.handler = async (event) => {
    const p = event.queryStringParameters || {};
    const mode = p.mode === 'push' ? 'push' : 'dryrun';
    // channel: 'both' (default) | 'shopee' | 'tiktok'. Lets callers batch each
    // channel separately to stay under Netlify's function time limit.
    const channel = ['shopee', 'tiktok'].includes(p.channel) ? p.channel : 'both';
    const doShopee = channel === 'both' || channel === 'shopee';
    const doTiktok = channel === 'both' || channel === 'tiktok';
    const out = { mode, channel };
    const skus = parseSkus(event);
    try {
        // Markup config from app_settings (POS-editable). mode 'pct' or 'rm'.
        // Optional query override for testing: ?shopee_markup=&shopee_mode=rm
        let cfg = { shopee: { mode: 'pct', value: DEFAULT_SHOPEE_MARKUP }, tiktok: { mode: 'pct', value: DEFAULT_TIKTOK_MARKUP } };
        try {
            const srow = await shopee.sb('GET', '/app_settings?key=eq.marketplace_markup&select=value&limit=1');
            if (srow && srow[0] && srow[0].value) cfg = srow[0].value;
        } catch (_) {}
        if (p.shopee_markup != null) cfg.shopee = { mode: p.shopee_mode === 'rm' ? 'rm' : 'pct', value: Number(p.shopee_markup) };
        if (p.tiktok_markup != null) cfg.tiktok = { mode: p.tiktok_mode === 'rm' ? 'rm' : 'pct', value: Number(p.tiktok_markup) };
        out.markup = cfg;
        const applyMarkup = (base, c) => (c && c.mode === 'rm') ? round2(base + (Number(c.value) || 0)) : round2(base * (1 + (Number(c.value) || 0) / 100));
        // Load products (scoped to skus, or all that are mapped to either channel)
        let path = '/products_master?select=sku,price,price_marketplace,shopee_price,tiktok_price,shopee_price_mode,tiktok_price_mode,cost_price,floor_price,floor_margin_pct,metadata';
        if (skus.length) path += `&sku=in.(${skus.map(s => `"${s}"`).join(',')})`;
        const rows = await shopee.sb('GET', path) || [];

        // Per-product custom price wins; else POS price + global channel markup.
        // Custom mode: 'rm' = absolute price; 'pct' = markup % over base POS price.
        const computeCustom = (val, modeRaw, base) => {
            if (val == null) return null;
            const v = Number(val); if (!isFinite(v)) return null;
            return (modeRaw === 'pct') ? round2(base * (1 + v / 100)) : round2(v);
        };
        // p1_631 (#1) — below-cost guard. floor = floor_price ?? margin-floor ?? cost.
        const floorFor = (r) => {
            const cost = Number(r.cost_price) || 0;
            const fp = Number(r.floor_price) || 0;
            if (fp > 0) return fp;
            const fm = Number(r.floor_margin_pct) || 0;
            if (cost > 0 && fm > 0) return round2(cost / (1 - Math.min(fm, 90) / 100));
            return cost; // hard floor = cost (0 if cost unknown → no guard)
        };
        const plan = rows.map(r => {
            const m = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};
            const __mp = Number(r.price_marketplace); // p1_556 (#32) — 0/negatif = unset, fallback ke harga POS (elak base 0 buang SKU dari push)
            const base = (isFinite(__mp) && __mp > 0) ? __mp : (Number(r.price) || 0);
            const customShopee = computeCustom(r.shopee_price, r.shopee_price_mode, base);
            const customTiktok = computeCustom(r.tiktok_price, r.tiktok_price_mode, base);
            const sp = customShopee != null ? round2(customShopee) : applyMarkup(base, cfg.shopee);
            const tp = customTiktok != null ? round2(customTiktok) : applyMarkup(base, cfg.tiktok);
            const cost = Number(r.cost_price) || 0;
            const floor = floorFor(r);
            return {
                sku: (r.sku || '').toUpperCase(),
                base, cost, floor,
                shopee_price: sp,
                tiktok_price: tp,
                shopee_custom: customShopee != null,
                tiktok_custom: customTiktok != null,
                shopee_blocked: floor > 0 && sp > 0 && sp < floor,
                tiktok_blocked: floor > 0 && tp > 0 && tp < floor,
                shopee_item_id: m.shopee_item_id || null,
                shopee_model_id: m.shopee_model_id != null ? m.shopee_model_id : null,
                tiktok_product_id: m.tiktok_product_id || null,
                tiktok_sku_id: m.tiktok_sku_id || null
            };
        }).filter(x => x.base > 0 || x.shopee_price > 0 || x.tiktok_price > 0);

        // p1_631 (#1) — collect below-floor blocks (skipped unless ?force=1)
        const force = (event.queryStringParameters || {}).force === '1';
        out.blocked = [];
        for (const x of plan) {
            if (x.shopee_blocked) out.blocked.push({ sku: x.sku, channel: 'shopee', price: x.shopee_price, floor: x.floor, cost: x.cost });
            if (x.tiktok_blocked) out.blocked.push({ sku: x.sku, channel: 'tiktok', price: x.tiktok_price, floor: x.floor, cost: x.cost });
        }
        out.blocked_count = out.blocked.length;
        out.force = force;

        out.products = plan.length;
        out.shopee_targets = plan.filter(x => x.shopee_item_id).length;
        out.tiktok_targets = plan.filter(x => x.tiktok_product_id && x.tiktok_sku_id).length;

        if (mode === 'dryrun') {
            out.sample = plan.slice(0, 15).map(x => ({ sku: x.sku, base: x.base, shopee: x.shopee_price + (x.shopee_custom ? ' (custom)' : ''), tiktok: x.tiktok_price + (x.tiktok_custom ? ' (custom)' : ''), shopee_mapped: !!x.shopee_item_id }));
            out.note = 'DRYRUN — nothing written. Add ?mode=push to apply (LIVE prices).'
                + (out.blocked_count ? ` ${out.blocked_count} channel-price(s) BELOW floor will be SKIPPED (use ?force=1 to override).` : '');
            return json(200, out);
        }

        // ---- PUSH: Shopee (group by item_id) ----
        const shopeeRes = { pushed: 0, failed: 0, errors: [], skipped: !doShopee };
        const shopeeMapped = doShopee ? plan.filter(x => x.shopee_item_id && (force || !x.shopee_blocked)) : [];
        if (shopeeMapped.length) {
            const tok = await shopee.getValidToken();
            const byItem = {};
            for (const x of shopeeMapped) {
                (byItem[String(x.shopee_item_id)] = byItem[String(x.shopee_item_id)] || []).push(x);
            }
            for (const [itemId, list] of Object.entries(byItem)) {
                // p1_556 (#19) — Shopee update_price perlu model_id setiap entry (0 utk single-variant), mirror laluan stok
                const price_list = list.map(x => ({ model_id: x.shopee_model_id != null ? Number(x.shopee_model_id) : 0, original_price: x.shopee_price }));
                const r = await shopee.shopeePost('/api/v2/product/update_price', {}, { item_id: Number(itemId), price_list }, tok.access_token, tok.shop_id);
                if (r.error) shopeeRes.errors.push({ item_id: itemId, error: r.error, message: r.message });
                else shopeeRes.pushed += list.length;
            }
            shopeeRes.failed = shopeeRes.errors.length;
        }
        out.shopee = shopeeRes;

        // ---- PUSH: TikTok (p1_426 — use PERSISTED mapping tiktok_product_id + tiktok_sku_id) ----
        // Old approach pulled the ACTIVATE catalog and matched by seller_sku, which fails for
        // multi-variant products whose TikTok variant seller_sku != POS sku (e.g. VD035/036/047/048).
        // All 621 mapped products have both ids persisted, so target them directly + reliably.
        const tiktokRes = { pushed: 0, failed: 0, errors: [], unmapped: 0, skipped: !doTiktok };
        const tiktokMapped = doTiktok ? plan.filter(x => x.tiktok_product_id && x.tiktok_sku_id && (force || !x.tiktok_blocked)) : [];
        if (doTiktok) tiktokRes.unmapped = plan.filter(x => !x.tiktok_product_id || !x.tiktok_sku_id).length;
        if (tiktokMapped.length) try {
            const tok = await tiktok.getValidToken();
            const cipher = await tiktok.ensureShopCipher(tok);
            const byProduct = {};
            for (const x of tiktokMapped) {
                (byProduct[String(x.tiktok_product_id)] = byProduct[String(x.tiktok_product_id)] || [])
                    .push({ id: String(x.tiktok_sku_id), price: { amount: String(x.tiktok_price), currency: CURRENCY } });
            }
            for (const [productId, skuList] of Object.entries(byProduct)) {
                const r = await tiktok.ttRequest('POST', `/product/202309/products/${productId}/prices/update`, { body: { skus: skuList }, accessToken: tok.access_token, shopCipher: cipher });
                if (r.code === 0) tiktokRes.pushed += skuList.length;
                else tiktokRes.errors.push({ product_id: productId, code: r.code, message: r.message, sku_ids: skuList.map(s => s.id) });
            }
            tiktokRes.failed = tiktokRes.errors.length;
        } catch (e) {
            tiktokRes.errors.push({ error: String(e).slice(0, 200) });
            tiktokRes.failed = 1;
        }
        out.tiktok = tiktokRes;

        out.ok = (shopeeRes.failed === 0) && (tiktokRes.failed === 0);
        return json(200, out);
    } catch (err) {
        out.error = String(err);
        return json(500, out);
    }
};
