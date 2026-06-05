/**
 * Marketplace Stock Reconcile Cron — Netlify Scheduled Function (p1_293).
 *
 * Pushes POS stock → Shopee + TikTok on a schedule so every channel stays in
 * sync regardless of WHERE the stock changed (counter sale, online order on a
 * different channel, GRN/stock receive, manual adjustment, stocktake).
 *
 * This replaces EasyStore's old role as the central cross-channel stock hub —
 * required for the full Shopee/TikTok cutover (EasyStore out of the loop).
 * POS inventory_batches is the single source of truth; marketplaces follow.
 *
 * Per-sale pushes (tiktok-stock-push / shopee-stock-push) give instant updates;
 * this cron is the safety net that catches everything else + heals drift.
 *
 * Each underlying function only WRITES diffs (POS != marketplace), so writes
 * stay minimal even though it reconciles the full mapped catalog each run.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const SITE_URL     = process.env.URL || 'https://www.10camp.com';

async function logRun(table, row) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify(row)
        });
    } catch (e) { /* silent */ }
}

async function reconcile(name, url) {
    const startMs = Date.now();
    try {
        const res = await fetch(url);
        const json = await res.json();
        return {
            name, ok: !json.error,
            pushed: json.pushed || 0,
            failed: json.failed || 0,
            error: json.error || null,
            duration_ms: Date.now() - startMs
        };
    } catch (e) {
        return { name, ok: false, error: String(e).slice(0, 300), duration_ms: Date.now() - startMs };
    }
}

exports.handler = async () => {
    const ranAt = new Date().toISOString();

    // Run both reconciles. Shopee paginates with ?limit (max 100); TikTok pulls all.
    const [shopee, tiktok] = await Promise.all([
        reconcile('shopee', `${SITE_URL}/api/shopee-stock-sync?mode=push&limit=100`),
        reconcile('tiktok', `${SITE_URL}/api/tiktok-stock-sync?mode=push`)
    ]);

    await logRun('shopee_sync_log', {
        source: 'stock-cron', mode: 'push', ran_at: ranAt,
        error_message: shopee.error ? String(shopee.error).slice(0, 500) : null,
        duration_ms: shopee.duration_ms,
        raw_response: { pushed: shopee.pushed, failed: shopee.failed }
    });
    await logRun('tiktok_sync_log', {
        source: 'stock-cron', mode: 'push', ran_at: ranAt,
        error_message: tiktok.error ? String(tiktok.error).slice(0, 500) : null,
        duration_ms: tiktok.duration_ms,
        raw_response: { pushed: tiktok.pushed, failed: tiktok.failed }
    });

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ran_at: ranAt, shopee, tiktok })
    };
};
