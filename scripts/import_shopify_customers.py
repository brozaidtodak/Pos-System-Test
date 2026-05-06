#!/usr/bin/env python3
"""
Import Shopify customer export → public.customers.

Wipes the current 2,705 auto-derived customers (less reliable, missing
email + marketing consent + address) and replaces with the 3,291 rows
from the dedicated Shopify customer export.

Dedup precedence: shopify_customer_id (cleanest) → email → phone.
"""
from __future__ import annotations
import csv, json, os, sys, urllib.request
from pathlib import Path

PROJECT_REF = "asehjdnfzoypbwfeazra"
CSV_PATH = Path("/tmp/customers_export.csv")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not TOKEN:
    sys.exit("source ~/.claude/.env first")
API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"


def normalize_phone(raw):
    if not raw: return None
    digits = ''.join(c for c in raw if c.isdigit())
    if not digits: return None
    if digits.startswith('60'): return digits
    if digits.startswith('0'): return '60' + digits[1:]
    return digits


def yn(s):
    return (s or '').strip().lower() == 'yes'


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


def main():
    if not CSV_PATH.exists():
        sys.exit(f"Not found: {CSV_PATH}")
    with CSV_PATH.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    print(f"Loaded {len(rows)} customer rows.")

    # Wipe existing
    pre = run_sql("select count(*)::int as n from customers")[0]['n']
    print(f"DB has {pre} existing customers — wiping...")
    run_sql("delete from customers where id > 0;")

    # Build payloads
    payloads = []
    seen_phones = set()
    seen_emails = set()
    duplicates = 0

    for r in rows:
        first = (r.get('First Name') or '').strip()
        last = (r.get('Last Name') or '').strip()
        name = f"{first} {last}".strip() or (r.get('Email') or '').split('@')[0] or '(unnamed)'
        email = (r.get('Email') or '').strip().lower() or None
        phone = normalize_phone(r.get('Phone') or r.get('Default Address Phone'))

        # Skip exact duplicates within the import batch (same phone OR same email)
        if phone and phone in seen_phones:
            duplicates += 1
            continue
        if email and email in seen_emails:
            duplicates += 1
            continue
        if phone: seen_phones.add(phone)
        if email: seen_emails.add(email)

        addr = None
        if (r.get('Default Address Address1') or r.get('Default Address City')):
            addr = {
                'address1': r.get('Default Address Address1') or None,
                'address2': r.get('Default Address Address2') or None,
                'city': r.get('Default Address City') or None,
                'state': r.get('Default Address Province Code') or None,
                'zip': r.get('Default Address Zip') or None,
                'country': r.get('Default Address Country Code') or None,
                'company': r.get('Default Address Company') or None,
            }
            addr = {k: v for k, v in addr.items() if v}

        total_orders = int(float(r.get('Total Orders') or 0))
        total_spent = float(r.get('Total Spent') or 0)

        payload = {
            'name': name[:200],
            'phone': phone,
            'email': email,
            'shopify_customer_id': (r.get('Customer ID') or '').strip().strip("'") or None,
            'accepts_email_marketing': yn(r.get('Accepts Email Marketing')),
            'accepts_sms_marketing': yn(r.get('Accepts SMS Marketing')),
            'total_spent': total_spent,
            'total_orders': total_orders,
            'address': addr,
            'tags': (r.get('Tags') or '').strip() or None,
            'note': (r.get('Note') or '').strip() or None,
            'is_member': total_orders >= 3,   # 3+ orders = auto-member
            'points': int(total_spent / 10),  # rough default: 1 point per RM10 spent
        }
        payloads.append({k: v for k, v in payload.items() if v is not None})

    print(f"Built {len(payloads)} unique customer payloads (dropped {duplicates} duplicates within import)")

    # Insert
    cols = [
        ('name','text'),('phone','text'),('email','text'),
        ('shopify_customer_id','text'),
        ('accepts_email_marketing','boolean'),('accepts_sms_marketing','boolean'),
        ('total_spent','numeric'),('total_orders','integer'),
        ('address','jsonb'),('tags','text'),('note','text'),
        ('is_member','boolean'),('points','integer')
    ]
    cols_def = ', '.join(f"{c} {t}" for c, t in cols)
    col_names = ', '.join(c for c, _ in cols)

    chunk_size = 200
    inserted = 0
    failures = []
    for i in range(0, len(payloads), chunk_size):
        chunk = payloads[i:i + chunk_size]
        payload_sql = json.dumps(chunk, ensure_ascii=False, default=str).replace("'", "''")
        sql = (
            f"INSERT INTO public.customers ({col_names}) "
            f"SELECT {col_names} FROM jsonb_to_recordset('{payload_sql}'::jsonb) "
            f"AS x({cols_def}) "
            f"ON CONFLICT (phone) DO UPDATE SET "
            f"  name = excluded.name, "
            f"  email = COALESCE(excluded.email, customers.email), "
            f"  shopify_customer_id = COALESCE(excluded.shopify_customer_id, customers.shopify_customer_id), "
            f"  accepts_email_marketing = excluded.accepts_email_marketing, "
            f"  accepts_sms_marketing = excluded.accepts_sms_marketing, "
            f"  total_spent = excluded.total_spent, "
            f"  total_orders = excluded.total_orders, "
            f"  address = COALESCE(excluded.address, customers.address), "
            f"  tags = COALESCE(excluded.tags, customers.tags), "
            f"  note = COALESCE(excluded.note, customers.note), "
            f"  is_member = excluded.is_member, "
            f"  points = excluded.points;"
        )
        try:
            run_sql(sql)
            inserted += len(chunk)
        except urllib.error.HTTPError as e:
            err = e.read().decode()[:300]
            failures.append((i, err))
            print(f"  chunk {i}: {err[:200]}")
        if (i // chunk_size) % 3 == 0 or inserted == len(payloads):
            print(f"  progress: {inserted}/{len(payloads)}")

    # Verify
    final = run_sql("select count(*)::int as n, count(distinct phone)::int as ph, count(distinct email)::int as em, sum(total_spent)::numeric as spent, sum(total_orders)::int as orders from customers")[0]
    print()
    print("========== IMPORT SUMMARY ==========")
    print(f"  Customers: {final['n']}")
    print(f"  With phone: {final['ph']}")
    print(f"  With email: {final['em']}")
    print(f"  Sum of total_spent: RM {float(final['spent'] or 0):,.2f}")
    print(f"  Sum of total_orders: {final['orders']}")

    # Cross-check: how many sales_history customer_phones have a matching customer record?
    matches = run_sql("""
        select
            count(distinct sh.customer_phone)::int as unique_sale_phones,
            count(distinct case when c.id is not null then sh.customer_phone end)::int as matched_phones
        from sales_history sh
        left join customers c on c.phone = sh.customer_phone
        where sh.customer_phone is not null
    """)[0]
    print(f"\n  Sales-side phones: {matches['unique_sale_phones']} unique")
    print(f"  Matched to a customer record: {matches['matched_phones']} ({matches['matched_phones']*100//max(1,matches['unique_sale_phones'])}%)")
    print(f"  Guest checkouts (no customer record): {matches['unique_sale_phones'] - matches['matched_phones']}")


if __name__ == "__main__":
    main()
