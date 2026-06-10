/**
 * _inventory.js — shared stock-deduction helper for inbound marketplace orders.
 *
 * Files prefixed with "_" are ignored by Netlify's function scanner, so this is
 * a private module, not a deployed endpoint. Required by the inbound order
 * functions (shopee-sync, tiktok-sync, shopee-webhook, easystore-webhook) so
 * that every online order deducts POS stock the SAME way the cashier counter
 * does (app.js): FIFO by batch (oldest inbound_date first) + an OUTBOUND_SALE
 * row in inventory_transactions for the audit ledger.
 *
 * Why this exists (Lubang A — "stok auto 2-hala"): before this, a TikTok/Shopee
 * order created a sales_history record but never decremented inventory_batches,
 * so POS over-stated stock and could oversell. This closes that gap.
 *
 * IDEMPOTENCY: callers MUST only invoke this once per order — i.e. on the
 * genuine first insert of a sales_history row (after the dedup check), never on
 * a re-sync/update. Deducting twice = stock too low.
 */

// Deduct a list of {sku, qty} line items from inventory_batches (FIFO).
//   sb       — the calling function's Supabase REST helper: sb(method, path, body, extraHeaders)
//   items    — array of line items, each { sku, qty }
//   opts.txnType — inventory_transactions.transaction_type (default 'OUTBOUND_SALE')
// Returns { skus_processed, total_deducted, shortfalls: [{sku, short}] }.
// Never throws on a per-SKU error — collects it and continues, so one bad SKU
// can't block the rest of the order.
async function deductStockForItems(sb, items, opts) {
    opts = opts || {};
    const txnType = opts.txnType || 'OUTBOUND_SALE';
    const result = { skus_processed: 0, total_deducted: 0, shortfalls: [], errors: [] };
    const txnRows = [];

    for (const item of (items || [])) {
        const sku = (item.sku || '').trim();
        const qty = Number(item.qty) || 0;
        // Skip blanks, non-positive qty, and custom/ad-hoc sale lines (no batches).
        if (!sku || qty <= 0 || sku.startsWith('CUSTOM-')) continue;

        try {
            // p1_577 (#2/#15) — ATOMIK FIFO deduct via RPC (FOR UPDATE kunci baris) — elak lost-update
            // bila webhook serentak (cth Shopee + TikTok) tolak SKU bertindih. Ganti read-modify-write.
            const rpc = await sb('POST', '/rpc/deduct_stock_fifo', { p_sku: sku, p_qty: qty });
            const alloc = (rpc && rpc.allocated) ? rpc.allocated : [];
            for (const a of alloc) {
                txnRows.push({ sku, batch_id: a.batch_id, transaction_type: txnType, qty_change: -a.qty });
                result.total_deducted += (Number(a.qty) || 0);
            }
            const short = (rpc && rpc.short) || 0;
            if (short > 0) result.shortfalls.push({ sku, short });
            result.skus_processed++;
        } catch (e) {
            result.errors.push({ sku, err: (e.message || String(e)).slice(0, 120) });
        }
    }

    // Audit ledger — best-effort: a logging failure must NOT undo the deduction.
    if (txnRows.length) {
        try {
            await sb('POST', '/inventory_transactions', txnRows, { Prefer: 'return=minimal' });
        } catch (e) {
            result.errors.push({ sku: '(txn_log)', err: (e.message || String(e)).slice(0, 120) });
        }
    }

    return result;
}

// A sales_history status that means the order is dead and must NOT deduct stock.
function isVoidStatus(status) {
    const s = (status || '').toLowerCase();
    return s === 'voided' || s === 'cancelled' || s === 'canceled';
}

// p1_576 — RESTOCK list of {sku, qty} back into inventory_batches (mirror app.js __applyStockDelta +).
//   Inserts ONE new inbound batch per SKU (qty available again) + an INBOUND_RESTOCK ledger row.
//   Used when a previously-deducted marketplace order is cancelled/voided (bug audit #4/#14).
//   IDEMPOTENCY: caller MUST guard (e.g. metadata.stock_restored flag) so a re-fired cancel
//   webhook doesn't restock twice.
async function restockForItems(sb, items, opts) {
    opts = opts || {};
    const reason = opts.reason || 'Marketplace cancel restock';
    const txnType = opts.txnType || 'INBOUND_RESTOCK';
    const result = { skus_processed: 0, total_restocked: 0, errors: [] };
    const txnRows = [];
    const nowIso = new Date().toISOString();
    for (const item of (items || [])) {
        const sku = (item.sku || '').trim();
        const qty = Number(item.qty) || 0;
        if (!sku || qty <= 0 || sku.startsWith('CUSTOM-')) continue;
        try {
            const ins = await sb('POST', '/inventory_batches',
                [{ sku, qty_received: qty, qty_remaining: qty, cost_price: 0, inbound_date: nowIso, notes: reason }],
                { Prefer: 'return=representation' });
            const batchId = (Array.isArray(ins) && ins[0]) ? ins[0].id : null;
            txnRows.push({ sku, batch_id: batchId, transaction_type: txnType, qty_change: qty });
            result.total_restocked += qty;
            result.skus_processed++;
        } catch (e) {
            result.errors.push({ sku, err: (e.message || String(e)).slice(0, 120) });
        }
    }
    if (txnRows.length) {
        try { await sb('POST', '/inventory_transactions', txnRows, { Prefer: 'return=minimal' }); }
        catch (e) { result.errors.push({ sku: '(txn_log)', err: (e.message || String(e)).slice(0, 120) }); }
    }
    return result;
}

module.exports = { deductStockForItems, restockForItems, isVoidStatus };
