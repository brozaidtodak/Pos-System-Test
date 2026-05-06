#!/usr/bin/env python3
"""
Full Shopify → POS migration:

  orders_export_1.csv      → public.sales_history (original sales + refund rows)
                            → public.customers (deduped)
  transactions_export_1.csv → annotates sales_history.metadata with gateway info

Decisions baked in (per Zaid 2026-05-06):
  - source `2891397` → channel "TikTok/Shopee"
  - "10 Camp Official Store" employee → staff_name=null + metadata.pending_staff_backfill=true
  - Refunds → ORIGINAL stays, NEW negative-total row linked via metadata.original_order_name
  - Platform fees & refund amount kept in metadata
"""
from __future__ import annotations
import csv, json, os, re, sys, urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

PROJECT_REF = "asehjdnfzoypbwfeazra"
ORDERS_CSV = Path("/tmp/orders_export_1.csv")
TXN_CSV = Path("/Users/brozaidtodak/Downloads/transactions_export_1.csv")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not TOKEN:
    sys.exit("source ~/.claude/.env first")
API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

# Employee name (Shopify) → staff_id (DB) mapping
EMPLOYEE_MAP = {
    'Ariff 10 Camp':    ('CMP006', 'Ariff'),
    'Alif 10 Camp':     ('CMP008', 'Aliff'),
    'Irfan 10 Camp':    ('CMP003', 'Irfan'),
    'Moyy 10 Camp':     ('CMP010', 'Farhan Moyy'),
    'Kael 10 Camp':     ('CMP011', 'Tarmizi Kael'),
    'Fahmi 10 camp':    ('CMP009', 'Fahmi'),
    'Zakwan 10 Camp':   ('CMP005', 'Zack'),
    # Generic store account → null (pending manual backfill)
    '10 Camp Official Store': (None, None),
}

CHANNEL_MAP = {
    'pos':      'POS In-Store',
    'tiktok':   'TikTok',
    'shopee':   'Shopee',
    'web':      'Web',
    '2891397':  'TikTok/Shopee',
}


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


def to_iso(dt_str: str) -> str | None:
    """Shopify timestamp '2026-03-26 06:36:56 +0800' → ISO."""
    if not dt_str:
        return None
    s = dt_str.strip()
    # Shopify gives 'YYYY-MM-DD HH:MM:SS +TZ'
    try:
        # parse with %z which doesn't accept space-separated TZ in older Python; normalise
        if ' +' in s or ' -' in s:
            parts = s.rsplit(' ', 1)
            base = parts[0]
            tz = parts[1].replace(':', '')
            if len(tz) == 4: tz = tz[:3] + '00'
            s = f"{base}{tz[0]}{tz[1:].zfill(4)}"
        dt = datetime.strptime(s, '%Y-%m-%d %H:%M:%S%z')
        return dt.isoformat()
    except Exception:
        # Try without TZ
        try:
            return datetime.strptime(s[:19], '%Y-%m-%d %H:%M:%S').isoformat() + '+08:00'
        except Exception:
            return None


def to_float(s):
    try: return float(s)
    except: return 0.0


def to_int(s):
    try: return int(float(s))
    except: return 0


def main():
    # ============================================================
    # 1. LOAD CSVs
    # ============================================================
    print("Loading orders CSV...")
    with ORDERS_CSV.open(newline='', encoding='utf-8') as f:
        order_rows = list(csv.DictReader(f))
    print(f"  {len(order_rows)} order line rows")

    print("Loading transactions CSV...")
    with TXN_CSV.open(newline='', encoding='utf-8') as f:
        txn_rows = list(csv.DictReader(f))
    print(f"  {len(txn_rows)} transaction rows")

    # ============================================================
    # 2. INDEX TRANSACTIONS BY ORDER NAME for quick lookup
    # ============================================================
    txns_by_order: dict[str, list[dict]] = defaultdict(list)
    for t in txn_rows:
        name = (t.get('Name') or '').strip()
        if name:
            txns_by_order[name].append(t)

    # ============================================================
    # 3. GROUP ORDER LINES BY ORDER NAME
    # ============================================================
    orders_grouped: dict[str, list[dict]] = defaultdict(list)
    for r in order_rows:
        nm = (r.get('Name') or '').strip()
        if nm:
            orders_grouped[nm].append(r)

    print(f"  {len(orders_grouped)} unique orders")

    # ============================================================
    # 4. BUILD sales_history PAYLOADS + customer extracts
    # ============================================================
    sales_payloads = []
    refund_payloads = []
    customers: dict[str, dict] = {}   # key = email or "phone:<phone>"

    skipped_no_total = 0
    skipped_voided = 0

    for order_name, lines in orders_grouped.items():
        # First row of an order has all the header fields (Total, Email, etc.)
        head = lines[0]
        total = to_float(head.get('Total'))
        if total <= 0 and head.get('Financial Status') != 'voided':
            skipped_no_total += 1
            # Don't skip — voided/comp orders may still be useful
        fin_status = (head.get('Financial Status') or '').strip()

        # Map employee → staff
        emp_raw = (head.get('Employee') or '').strip()
        staff_id = None
        staff_name = None
        pending_backfill = False
        if emp_raw in EMPLOYEE_MAP:
            staff_id, staff_name = EMPLOYEE_MAP[emp_raw]
            if emp_raw == '10 Camp Official Store':
                pending_backfill = True
        elif emp_raw:
            # Unknown employee — keep raw name for now
            staff_name = emp_raw
            pending_backfill = True

        # Channel
        src = (head.get('Source') or '').strip()
        channel = CHANNEL_MAP.get(src, src or 'Unknown')

        # Customer
        email = (head.get('Email') or '').strip().lower() or None
        phone = ((head.get('Phone') or head.get('Billing Phone') or head.get('Shipping Phone') or '').strip()) or None
        billing_name = (head.get('Billing Name') or head.get('Shipping Name') or '').strip() or None
        cust_key = email or (f"phone:{phone}" if phone else None)
        if cust_key and billing_name:
            existing = customers.get(cust_key)
            order_dt = to_iso(head.get('Created at'))
            if not existing:
                customers[cust_key] = {
                    'name': billing_name,
                    'phone': phone,
                    'email': email,
                    'first_order_at': order_dt,
                    'last_order_at': order_dt,
                    'order_count': 1,
                    'total_spent': total
                }
            else:
                existing['last_order_at'] = order_dt
                existing['order_count'] += 1
                existing['total_spent'] += total

        # Build line items array (one per line row)
        items = []
        for ln in lines:
            sku = (ln.get('Lineitem sku') or '').strip().upper()
            li_name = (ln.get('Lineitem name') or '').strip()
            if not li_name:
                continue
            items.append({
                'sku': sku or None,
                'name': li_name,
                'qty': to_int(ln.get('Lineitem quantity')) or 1,
                'price': to_float(ln.get('Lineitem price')),
                'discount': to_float(ln.get('Lineitem discount')),
                'fulfilled': (ln.get('Lineitem fulfillment status') or '').strip()
            })

        # Payment method (first row's value)
        payment_method = (head.get('Payment Method') or '').strip()

        # Lookup transactions for this order
        order_txns = txns_by_order.get(order_name, [])
        gateways = []
        platform_fees = 0.0  # if available
        refund_total = 0.0
        for t in order_txns:
            gw = (t.get('Gateway') or '').strip()
            kind = (t.get('Kind') or '').strip()
            amt = to_float(t.get('Amount'))
            status = (t.get('Status') or '').strip()
            if status != 'success':
                continue
            if kind == 'sale' or kind == 'capture':
                if gw and gw not in [g['gateway'] for g in gateways]:
                    gateways.append({'gateway': gw, 'amount': amt, 'kind': kind})
            elif kind == 'refund':
                refund_total += amt

        # Build metadata
        metadata = {
            'shopify_order_id': head.get('Id'),
            'shopify_order_name': order_name,
            'shopify_employee': emp_raw or None,
            'shopify_source': src,
            'shopify_currency': head.get('Currency') or 'MYR',
            'subtotal': to_float(head.get('Subtotal')),
            'shipping': to_float(head.get('Shipping')),
            'taxes': to_float(head.get('Taxes')),
            'discount_code': head.get('Discount Code') or None,
            'discount_amount': to_float(head.get('Discount Amount')),
            'refunded_amount_shopify': to_float(head.get('Refunded Amount')),
            'shopify_outstanding_balance': to_float(head.get('Outstanding Balance')),
            'shopify_location': head.get('Location') or None,
            'shopify_payment_reference': head.get('Payment Reference') or None,
            'shopify_tags': head.get('Tags') or None,
            'shopify_notes': head.get('Notes') or None,
            'gateways': gateways,
            'transaction_count': len(order_txns),
            'shipping_address': {
                'name': head.get('Shipping Name'),
                'address1': head.get('Shipping Address1'),
                'address2': head.get('Shipping Address2'),
                'city': head.get('Shipping City'),
                'zip': head.get('Shipping Zip'),
                'province': head.get('Shipping Province Name') or head.get('Shipping Province'),
                'country': head.get('Shipping Country'),
                'phone': head.get('Shipping Phone')
            } if head.get('Shipping Address1') else None,
            'pending_staff_backfill': pending_backfill,
            'migrated_from': 'shopify',
            'migrated_at': '2026-05-06'
        }
        # Strip empty
        metadata = {k: v for k, v in metadata.items() if v not in (None, '', 0, 0.0, [])
                    or k in ('subtotal', 'taxes', 'shipping', 'gateways')}

        # Map status: paid → completed; refunded/partial → refunded; voided → voided; pending → pending
        status_map = {
            'paid':                'Completed',
            'pending':             'Pending',
            'refunded':            'Refunded',
            'partially_refunded':  'Partially Refunded',
            'voided':              'Voided',
            '':                    'Completed',
        }
        sh_status = status_map.get(fin_status, 'Completed')

        sale_payload = {
            'customer_name': billing_name,
            'customer_phone': phone,
            'payment_method': payment_method or None,
            'total': total,
            'total_amount': total,
            'items': items,
            'created_at': to_iso(head.get('Created at')),
            'channel': channel,
            'status': sh_status,
            'staff_name': staff_name,
            'metadata': metadata
        }
        # Drop None
        sale_payload = {k: v for k, v in sale_payload.items() if v is not None}
        sales_payloads.append(sale_payload)

        # If refunded, add a separate negative-total row (D1:b)
        if fin_status in ('refunded', 'partially_refunded') and refund_total > 0:
            refund_meta = {
                'shopify_order_name': order_name,
                'original_order_name': order_name,
                'shopify_order_id': head.get('Id'),
                'refund_kind': 'full' if fin_status == 'refunded' else 'partial',
                'migrated_from': 'shopify',
                'migrated_at': '2026-05-06'
            }
            refund_payload = {
                'customer_name': billing_name,
                'customer_phone': phone,
                'payment_method': payment_method or None,
                'total': -refund_total,
                'total_amount': -refund_total,
                'items': items,  # same items, refunded
                'created_at': to_iso(head.get('Created at')),
                'channel': channel,
                'status': 'Refund',
                'staff_name': staff_name,
                'metadata': refund_meta
            }
            refund_payload = {k: v for k, v in refund_payload.items() if v is not None}
            refund_payloads.append(refund_payload)

    print(f"\nBuilt {len(sales_payloads)} sales rows + {len(refund_payloads)} refund rows")
    print(f"Skipped {skipped_no_total} zero-total orders, {skipped_voided} voided")
    print(f"Customers to upsert: {len(customers)}")

    # ============================================================
    # 5. WIPE existing sales_history (clean import per user)
    # ============================================================
    print("\nWiping existing sales_history (was 0 rows; safety check)...")
    pre = run_sql("select count(*)::int as n from sales_history")[0]['n']
    if pre > 0:
        ans = input(f"sales_history has {pre} rows — WIPE? [type 'YES']: ")
        if ans != 'YES':
            sys.exit("Aborted.")
        run_sql("delete from sales_history;")

    # ============================================================
    # 6. INSERT sales_history in chunks
    # ============================================================
    sh_cols = [
        ('customer_name', 'text'), ('customer_phone', 'text'),
        ('payment_method', 'text'), ('total', 'numeric'),
        ('total_amount', 'numeric'), ('items', 'jsonb'),
        ('created_at', 'timestamptz'), ('channel', 'text'),
        ('status', 'text'), ('staff_name', 'text'),
        ('metadata', 'jsonb')
    ]
    sh_cols_def = ', '.join(f"{c} {t}" for c, t in sh_cols)
    sh_col_names = ', '.join(c for c, _ in sh_cols)

    def chunked(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i:i + n]

    print(f"\nInserting {len(sales_payloads)} sales_history rows...")
    inserted = 0
    for i, chunk in enumerate(chunked(sales_payloads, 100), start=1):
        payload_sql = json.dumps(chunk, ensure_ascii=False, default=str).replace("'", "''")
        sql = (
            f"INSERT INTO public.sales_history ({sh_col_names}) "
            f"SELECT {sh_col_names} FROM jsonb_to_recordset('{payload_sql}'::jsonb) "
            f"AS x({sh_cols_def});"
        )
        run_sql(sql)
        inserted += len(chunk)
        if i % 5 == 0 or inserted == len(sales_payloads):
            print(f"  chunk {i}: total {inserted}/{len(sales_payloads)}")

    print(f"\nInserting {len(refund_payloads)} refund rows...")
    refunds_done = 0
    for chunk in chunked(refund_payloads, 100):
        payload_sql = json.dumps(chunk, ensure_ascii=False, default=str).replace("'", "''")
        sql = (
            f"INSERT INTO public.sales_history ({sh_col_names}) "
            f"SELECT {sh_col_names} FROM jsonb_to_recordset('{payload_sql}'::jsonb) "
            f"AS x({sh_cols_def});"
        )
        run_sql(sql)
        refunds_done += len(chunk)

    # ============================================================
    # 7. INSERT customers (skip the existing 1 row to avoid id collision)
    # ============================================================
    customer_payloads = []
    for cust in customers.values():
        customer_payloads.append({
            'name': cust['name'][:200],
            'phone': cust['phone'],
            'email': cust.get('email'),
            'is_member': cust['order_count'] >= 3,  # 3+ orders = auto-member
            'points': 0,
            'created_at': cust.get('first_order_at')
        })

    # Note: existing schema has email column? let me probe
    try:
        existing_cust_cols = run_sql("select column_name from information_schema.columns where table_name='customers' and table_schema='public'")
        col_names = [c['column_name'] for c in existing_cust_cols]
    except: col_names = []

    has_email = 'email' in col_names
    if not has_email:
        # remove email field
        for cp in customer_payloads:
            cp.pop('email', None)

    cust_cols = [('name', 'text'), ('phone', 'text'), ('is_member', 'boolean'),
                 ('points', 'integer'), ('created_at', 'timestamptz')]
    if has_email:
        cust_cols.insert(2, ('email', 'text'))
    cust_cols_def = ', '.join(f"{c} {t}" for c, t in cust_cols)
    cust_col_names = ', '.join(c for c, _ in cust_cols)

    print(f"\nInserting {len(customer_payloads)} customer rows ...")
    cust_done = 0
    for chunk in chunked(customer_payloads, 200):
        payload_sql = json.dumps(chunk, ensure_ascii=False, default=str).replace("'", "''")
        sql = (
            f"INSERT INTO public.customers ({cust_col_names}) "
            f"SELECT {cust_col_names} FROM jsonb_to_recordset('{payload_sql}'::jsonb) "
            f"AS x({cust_cols_def});"
        )
        try:
            run_sql(sql)
            cust_done += len(chunk)
        except Exception as e:
            print(f"  customer chunk failed: {e}")
    print(f"  customers inserted: {cust_done}")

    # ============================================================
    # 8. SUMMARY
    # ============================================================
    summary = run_sql("""
        select
            (select count(*)::int from sales_history) as sales,
            (select round(sum(total)::numeric, 2) from sales_history where total > 0) as revenue_rm,
            (select count(*)::int from sales_history where status = 'Refund') as refunds,
            (select round(sum(total)::numeric, 2) from sales_history where total < 0) as refund_total,
            (select count(*)::int from customers) as customers,
            (select count(distinct staff_name)::int from sales_history where staff_name is not null) as distinct_staff
    """)[0]

    print("\n========== MIGRATION SUMMARY ==========")
    for k, v in summary.items():
        print(f"  {k:<22}: {v}")
    print()


if __name__ == "__main__":
    main()
