# EasyStore ↔ POS Bidirectional Sync — Setup Guide (p1_29)

## Overview

```
   ┌────────────────┐                      ┌──────────────────┐
   │   EasyStore    │  ◄── PUSH (real)──── │   POS (browser)  │
   │   (online)     │                      │                  │
   │                │ ──── WEBHOOK ───►    │  Supabase DB     │
   └────────────────┘                      └──────────────────┘
```

Two flows keep inventory consistent:
- **POS sale → EasyStore** (push): when staff rings up a sale at counter, system auto-decrements EasyStore variant qty so online catalogue won't oversell.
- **EasyStore order → POS** (webhook): when an online order comes in, EasyStore notifies our webhook endpoint which records the sale + deducts local `inventory_batches`.

---

## Step 1 — Configure EasyStore webhook (one-time, admin task)

In EasyStore admin (https://www.10camp.com/admin):

1. Navigate to **Settings → Notifications → Webhooks**
2. Click **Add webhook**
3. Configure:
   - **URL**: `https://pos-system-test.netlify.app/api/easystore-webhook`
   - **Format**: JSON
   - **Topic / Events** (subscribe to all 4):
     - `orders/create` (REQUIRED — incoming online sale)
     - `orders/cancelled` (recommended — auto-mark as voided in POS)
     - `orders/updated` (optional — status changes)
     - `orders/paid` (optional)
4. **Save** the webhook
5. EasyStore generates an HMAC secret. Copy the secret.

## Step 2 — Add HMAC secret to Netlify env

```bash
# Set via Netlify CLI (or dashboard → Site settings → Environment variables)
netlify env:set EASYSTORE_APP_SECRET "<paste secret from step 1>"
netlify env:set EASYSTORE_TOKEN "<your easystore access token>"
netlify env:set SUPABASE_URL "https://asehjdnfzoypbwfeazra.supabase.co"
netlify env:set SUPABASE_KEY "<service role or anon key with INSERT/UPDATE on sales_history + inventory_batches>"
```

After setting, redeploy site so functions pick up new env vars.

## Step 3 — Verify webhook live

Browse to:
```
https://pos-system-test.netlify.app/api/easystore-webhook
```
Should return JSON: `{ "ok": true, "service": "easystore-webhook", "hmac_configured": true, "supabase_configured": true }`

Browse to:
```
https://pos-system-test.netlify.app/api/easystore-push
```
Should return JSON: `{ "ok": true, "service": "easystore-push", "easystore_token": true }`

If `easystore_token: false` → token env not set.

## Step 4 — Test with a small order

1. Place a test order on EasyStore website
2. Check Netlify Functions log: should see POST received
3. Check Supabase `sales_history` table: row inserted with `metadata->>'migrated_from'='easystore_webhook'`
4. Check `inventory_batches`: deducted for items in order

## Step 5 — Test POS push

1. Login to POS as cashier
2. Add product to cart, checkout
3. Open browser DevTools → Network tab → look for POST to `/api/easystore-push`
4. Response should show `succeeded: N`
5. Check EasyStore admin → product → variant inventory should be lower

---

## How it works internally

### POS push (`/api/easystore-push`)

POS sends:
```json
{ "items": [{"sku": "CD001", "qty": 1}], "delta": "subtract" }
```

Function does:
1. Look up `products_master.metadata.easystore_variant_id` + `easystore_product_id` for each SKU
2. GET current `inventory_quantity` from EasyStore via `/products/<pid>/variants/<vid>.json`
3. Calculate new qty = current ± qty_sold
4. PUT new value to EasyStore

For refunds with restock, POS sends `delta: "add"` to increment.

### Webhook (`/api/easystore-webhook`)

EasyStore POSTs order JSON when event fires.

Function does:
1. Verify HMAC signature against `EASYSTORE_APP_SECRET`
2. Check idempotency (`metadata->>'easystore_order_id'` already in `sales_history`?)
3. If new: insert `sales_history` row with channel `EasyStore Online`
4. For each line item: deduct `inventory_batches` LIFO (newest batch first)
5. Returns count of SKUs processed + any shortfall errors

---

## Failure modes & retries

### POS push fails (browser offline, EasyStore down, etc.)
- Failed items queued in browser `localStorage.easystorePushQueue_v1`
- On next sale, queue is drained alongside new items
- Toast warning shown if queue grows ≥3 items
- Queue capped at 100 entries (FIFO oldest dropped)

### Webhook fails (POS DB down)
- EasyStore retries automatically with exponential backoff (up to 24h)
- After EasyStore DB is back, webhook will succeed and insert deferred orders
- Idempotency check prevents duplicate inserts

### SKU not mapped to EasyStore (no variant_id in metadata)
- Push function returns `{ok:false, reason:'no_easystore_mapping'}` for that SKU
- Run `python3 scripts/easystore_sync.py --products-only` to refresh mapping

---

## Daily reconciliation (manual, optional)

Run weekly or after suspected drift:

```bash
source ~/.claude/.env
python3 scripts/easystore_sync.py --products-only
```

This pulls current EasyStore product state and updates `metadata.easystore_qty` for visibility. Use this to spot-check drift between POS local stock and EasyStore reported stock.

Future enhancement (p1_30+): automated nightly cron that compares + auto-fixes drift.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Webhook returns 401 invalid_hmac | Secret mismatch or webhook misconfigured | Re-copy secret from EasyStore, update Netlify env, redeploy |
| Webhook returns 500 db_insert_failed | Supabase RLS blocking insert | Check `sales_history` table policies allow service role |
| POS push "no_easystore_mapping" for many SKUs | Sync script didn't store variant_id | Re-run `easystore_sync.py --products-only` (script v2+) |
| EasyStore stock not decreasing on sale | Function URL wrong / token missing | Visit `/api/easystore-push` in browser to check health |
| Local inventory not deducting on online sale | Webhook fired but inventory loop failed | Check `inventory.errors[]` in webhook response |
