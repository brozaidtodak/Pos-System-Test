/**
 * inventory-snapshot-cron.js — daily snapshot of inventory aggregates for the trend chart (p1_807).
 * Scheduled (see netlify.toml, ~9:20am MYT). Calls the snapshot_inventory() RPC so the DB does the
 * aggregation (no heavy row fetch). Upserts one row per day into inventory_snapshots.
 */
const { requireAuth } = require('./_auth');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

exports.handler = async (event) => {
    const a = await requireAuth(event); if (!a.ok) return a.response;
    if (!SERVICE_KEY) return { statusCode: 500, body: 'SUPABASE_SERVICE_KEY not set' };
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/snapshot_inventory`, {
            method: 'POST',
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
            body: '{}'
        });
        if (!r.ok) { const t = await r.text(); return { statusCode: 200, body: 'snapshot failed: ' + t.slice(0, 200) }; }
        return { statusCode: 200, body: 'inventory snapshot done' };
    } catch (e) { return { statusCode: 200, body: 'snapshot error: ' + String(e.message || e).slice(0, 150) }; }
};
