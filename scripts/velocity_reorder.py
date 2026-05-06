#!/usr/bin/env python3
"""
Velocity-based reorder-point auto-suggest.

Reads sales_history (22 months) → computes per-SKU monthly velocity →
suggests reorder_point + reorder_qty based on:

   daily_velocity   = avg_monthly_qty / 30
   reorder_point    = ceil(daily_velocity × lead_time_days × 1.5)   # 1.5x safety
   reorder_qty      = ceil(avg_monthly_qty × 2)                     # 2-month cover

Lead time defaults to 14 days if not set on product.
Refunds (negative qty in items array) subtract from gross sales.
Recent-window: use last 6 months (more relevant) but fall back to lifetime
if the SKU was only sold occasionally.

Run:
   python3 scripts/velocity_reorder.py             # dry-run + preview
   python3 scripts/velocity_reorder.py --apply     # commit to DB
"""
from __future__ import annotations
import json, math, os, sys, urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone

PROJECT_REF = "asehjdnfzoypbwfeazra"
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not TOKEN:
    sys.exit("source ~/.claude/.env first")
API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

SAFETY_FACTOR = 1.5
COVER_MONTHS = 2.0
DEFAULT_LEAD_DAYS = 14
RECENT_WINDOW_MONTHS = 6
MIN_REORDER_POINT = 2


def run_sql(sql: str):
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}",
                 "Content-Type": "application/json",
                 "User-Agent": "10camp-pos-importer/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())


def parse_iso(s: str) -> datetime | None:
    """Postgres returns '2026-03-25 22:36:54+00' or '...+08'. Normalise then parse."""
    if not s: return None
    s = s.strip().replace('Z', '+00:00')
    # Convert space separator → 'T', and '+00' → '+00:00'
    if ' ' in s and 'T' not in s:
        s = s.replace(' ', 'T', 1)
    # Pad TZ offsets like +00, +08, -05 → +00:00 etc.
    import re as _re
    s = _re.sub(r'([+-])(\d{2})$', r'\1\2:00', s)
    try:
        return datetime.fromisoformat(s)
    except Exception:
        try:
            return datetime.strptime(s[:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc)
        except Exception:
            return None


def main():
    apply_changes = '--apply' in sys.argv

    # Pull all positive-qty sales from sales_history
    print("Loading sales_history items + master products...")
    sales = run_sql("select created_at, items, total from sales_history where total > 0 order by created_at")
    products = run_sql("select sku, name, brand, category, reorder_point, reorder_qty, lead_time_days, price, cost_price from products_master")
    batches = run_sql("select sku, sum(qty_remaining)::int as stock from inventory_batches group by sku")

    print(f"  {len(sales)} sales rows · {len(products)} products · {len(batches)} stock entries")

    stock_map = {b['sku']: b['stock'] for b in batches}
    prod_map = {p['sku']: p for p in products}

    # Compute per-SKU sales aggregated by month
    now = datetime.now(timezone.utc)
    cutoff_recent = now - timedelta(days=RECENT_WINDOW_MONTHS * 30)
    earliest = None

    sku_qty = defaultdict(float)            # lifetime qty
    sku_qty_recent = defaultdict(float)     # last 6 months
    sku_first = {}                          # first sale date
    sku_last = {}                           # last sale date

    for s in sales:
        dt = parse_iso(s['created_at'])
        if not dt: continue
        if earliest is None or dt < earliest: earliest = dt
        items = s.get('items') or []
        for it in items:
            sku = (it.get('sku') or '').strip().upper()
            if not sku: continue
            qty = float(it.get('qty') or 0)
            if qty <= 0: continue
            sku_qty[sku] += qty
            sku_first.setdefault(sku, dt)
            sku_last[sku] = dt
            if dt >= cutoff_recent:
                sku_qty_recent[sku] += qty

    # Now also subtract refund qty (rows with total < 0 referencing original items)
    refund_sales = run_sql("select items from sales_history where total < 0")
    for s in refund_sales:
        items = s.get('items') or []
        for it in items:
            sku = (it.get('sku') or '').strip().upper()
            if sku and (it.get('qty') or 0) > 0:
                sku_qty[sku] -= float(it['qty'])
                if sku_qty[sku] < 0: sku_qty[sku] = 0

    print(f"  Earliest sale: {earliest.date() if earliest else '?'}")
    print(f"  Sold-something SKUs: {len(sku_qty)}")

    # Compute recommendations
    recommendations = []
    for p in products:
        sku = p['sku']
        lifetime_qty = sku_qty.get(sku, 0)
        recent_qty = sku_qty_recent.get(sku, 0)
        first_dt = sku_first.get(sku)
        last_dt = sku_last.get(sku)

        # Pick best window: prefer recent if SKU has activity, else lifetime
        if recent_qty > 0:
            avg_monthly = recent_qty / RECENT_WINDOW_MONTHS
            window = f"{RECENT_WINDOW_MONTHS}mo"
        elif lifetime_qty > 0 and first_dt:
            months_active = max(1, (last_dt - first_dt).days / 30)
            avg_monthly = lifetime_qty / months_active
            window = f"lifetime({months_active:.0f}mo)"
        else:
            avg_monthly = 0
            window = "no-sales"

        lead = p.get('lead_time_days') or DEFAULT_LEAD_DAYS
        daily = avg_monthly / 30
        suggested_rp = max(MIN_REORDER_POINT, math.ceil(daily * lead * SAFETY_FACTOR))
        suggested_rq = max(MIN_REORDER_POINT, math.ceil(avg_monthly * COVER_MONTHS))

        # If no sales at all, set conservative defaults
        if avg_monthly == 0:
            suggested_rp = MIN_REORDER_POINT
            suggested_rq = 5

        # Stale flag: last sale > 6 months ago
        is_stale = False
        if last_dt and (now - last_dt).days > 180 and lifetime_qty > 0:
            is_stale = True
            suggested_rp = MIN_REORDER_POINT  # don't reorder dead stock automatically
            suggested_rq = 5

        cur_stock = stock_map.get(sku, 0)
        old_rp = p.get('reorder_point')

        recommendations.append({
            'sku': sku,
            'name': (p.get('name') or '')[:60],
            'brand': p.get('brand') or '-',
            'lifetime_qty': int(lifetime_qty),
            'recent_qty': int(recent_qty),
            'avg_monthly': round(avg_monthly, 1),
            'daily': round(daily, 2),
            'lead': lead,
            'old_rp': old_rp,
            'new_rp': suggested_rp,
            'new_rq': suggested_rq,
            'cur_stock': cur_stock,
            'window': window,
            'is_stale': is_stale,
            'price': float(p.get('price') or 0),
            'cost_price': float(p.get('cost_price') or 0)
        })

    # Sort by recent demand
    recommendations.sort(key=lambda r: -r['recent_qty'])

    # Stats
    moving = [r for r in recommendations if r['recent_qty'] > 0]
    stale = [r for r in recommendations if r['is_stale']]
    no_sales = [r for r in recommendations if r['lifetime_qty'] == 0]
    high_value_low_stock = [r for r in recommendations if r['recent_qty'] > 0 and r['cur_stock'] < r['new_rp']]

    print()
    print(f"Active SKUs (sold last {RECENT_WINDOW_MONTHS}mo): {len(moving)}")
    print(f"Stale SKUs (no sale > 180d):                  {len(stale)}")
    print(f"Never sold (zero lifetime):                   {len(no_sales)}")
    print(f"⚠️  Active SKUs BELOW suggested rp NOW:        {len(high_value_low_stock)}")

    # Top 25 actively-moving SKUs preview
    print("\n=== TOP 25 BY RECENT SALES VELOCITY ===")
    print(f"{'SKU':<16} {'Brand':<14} {'6moQty':>7} {'Mo/avg':>7} {'Lead':>5} {'Cur RP':>7} {'New RP':>7} {'New RQ':>7} {'Stock':>6}  Name")
    for r in recommendations[:25]:
        print(f"{r['sku']:<16} {r['brand'][:14]:<14} {r['recent_qty']:>7} {r['avg_monthly']:>7.1f} {r['lead']:>5} {str(r['old_rp']):>7} {r['new_rp']:>7} {r['new_rq']:>7} {r['cur_stock']:>6}  {r['name'][:40]}")

    # URGENT REORDER LIST
    if high_value_low_stock:
        print(f"\n=== ⚠️  {len(high_value_low_stock)} SKUS BELOW SUGGESTED REORDER POINT (need to order NOW) ===")
        print(f"{'SKU':<16} {'Stock':>6} {'NewRP':>6} {'NewRQ':>6} {'Brand':<14}  Name")
        for r in high_value_low_stock[:30]:
            print(f"{r['sku']:<16} {r['cur_stock']:>6} {r['new_rp']:>6} {r['new_rq']:>6} {r['brand'][:14]:<14}  {r['name'][:50]}")
        if len(high_value_low_stock) > 30:
            print(f"  ... and {len(high_value_low_stock) - 30} more")

    # Apply or just preview
    if not apply_changes:
        print("\n--- DRY RUN ---")
        print("Re-run with --apply to commit reorder_point + reorder_qty + lead_time_days to DB.")
        return

    print(f"\nApplying {len(recommendations)} updates ...")
    # Update in chunks via single SQL using jsonb_to_recordset
    payloads = [{'sku': r['sku'], 'rp': r['new_rp'], 'rq': r['new_rq'], 'lead': r['lead']} for r in recommendations]

    chunk_size = 200
    updated = 0
    for i in range(0, len(payloads), chunk_size):
        chunk = payloads[i:i + chunk_size]
        payload_sql = json.dumps(chunk).replace("'", "''")
        sql = f"""
            UPDATE products_master pm
            SET reorder_point = u.rp, reorder_qty = u.rq, lead_time_days = u.lead
            FROM jsonb_to_recordset('{payload_sql}'::jsonb) AS u(sku text, rp integer, rq integer, lead integer)
            WHERE pm.sku = u.sku;
        """
        run_sql(sql)
        updated += len(chunk)
        if (i // chunk_size) % 3 == 0:
            print(f"  {updated}/{len(payloads)}")

    # Audit log entry
    run_sql(f"""
        INSERT INTO audit_logs (action_type, actor_name, details, created_at)
        VALUES (
            'velocity_reorder_bulk_update',
            'System (velocity_reorder.py)',
            '{json.dumps({'updated': updated, 'window_months': RECENT_WINDOW_MONTHS, 'safety_factor': SAFETY_FACTOR, 'cover_months': COVER_MONTHS, 'low_stock_alerts': len(high_value_low_stock)}).replace("'", "''")}',
            now()
        );
    """)

    print(f"\n✓ Updated {updated} products with velocity-based reorder points.")
    print(f"  → Refresh POS UI to see updated Low Stock Alert.")


if __name__ == "__main__":
    main()
