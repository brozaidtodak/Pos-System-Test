#!/usr/bin/env python3
"""
Create the 130 SKUs from Shopify orders that don't exist in products_master.

For each SKU we collect ALL its order line rows, pick the best (latest, highest-price)
sample for name + price, then guess brand from SKU prefix and category from name tokens.
"""
from __future__ import annotations
import csv, json, os, re, sys, urllib.request
from collections import defaultdict
from pathlib import Path

PROJECT_REF = "asehjdnfzoypbwfeazra"
ORDERS_CSV = Path("/tmp/orders_export_1.csv")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not TOKEN:
    sys.exit("source ~/.claude/.env first")
API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

# Map SKU prefix → brand (matches the seed names from sprint2_migrations.sql)
PREFIX_BRAND = {
    'OP': 'Opolar',
    'CD': 'Chanodug',
    'BD': 'Black Dog',
    'NH': 'Naturehike',
    'MG': 'Mobi Garden',
    'ST': 'SHINE TRIP',
    'VD': 'Vidalido',
    'MH': 'Mountainhiker',
    'LF': 'LFO',
    'TD': 'Todak',
    'CV': '10 Camp Official Store',
    '10': '10 Camp Official Store',
}

CATEGORY_KEYWORDS = [
    ('Tent',          ['tent','khemah']),
    ('Tables',        ['table','meja']),
    ('Chairs',        ['chair','kerusi','stool']),
    ('Bags',          ['bag','beg','case','pouch']),
    ('Boxes',         ['box','kotak','crate']),
    ('Flysheet',      ['flysheet','tarp','canopy']),
    ('Stove',         ['stove','dapur','cooker','burner']),
    ('Pots',          ['pot','pan','cookware','kettle','teapot','mug','cup']),
    ('Hanging Lamp',  ['lamp','light','lantern','candlestick','chandelier','torch']),
    ('Portable Fan',  ['fan','kipas','tower']),
    ('Wagons',        ['wagon','trolley','cart']),
    ('Accessories',   ['rack','stand','shelf','holder','hook','strap','clip']),
    ('Apparel',       ['shirt','jacket','poncho','glove','hat','bandana','umbrella']),
    ('Power',         ['battery','powerbank','charger','solar']),
    ('Sleeping',      ['sleeping','mat','mattress','blanket','pillow','bed']),
    ('Cooking',       ['firewood','coal','charcoal','fuel','starter','lighter']),
    ('Storage',       ['storage','organizer','organiser']),
    ('Cooler',        ['cooler','ice','thermal']),
]


def guess_brand(sku: str, name: str) -> str | None:
    sku_u = sku.upper()
    for pref, brand in PREFIX_BRAND.items():
        if sku_u.startswith(pref):
            return brand
    # Fall back: look for a known brand word in the name
    name_u = name.upper()
    for brand in PREFIX_BRAND.values():
        if brand.upper() in name_u:
            return brand
    return None


def guess_category(name: str) -> str | None:
    n = name.lower()
    for cat, kws in CATEGORY_KEYWORDS:
        if any(kw in n for kw in kws):
            return cat
    return None


def run_sql(sql: str):
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}",
                 "Content-Type": "application/json",
                 "User-Agent": "10camp-pos-importer/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def main():
    # 1. Get current SKU list
    master_skus = {r['sku'].upper() for r in run_sql("select sku from products_master")}
    print(f"Existing SKUs in DB: {len(master_skus)}")

    # 2. Walk Shopify orders, group by SKU
    with ORDERS_CSV.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    sku_data = defaultdict(lambda: {'lines': 0, 'prices': [], 'names': set()})
    for r in rows:
        sku = (r.get('Lineitem sku') or '').strip().upper()
        name = (r.get('Lineitem name') or '').strip()
        price = (r.get('Lineitem price') or '').strip()
        if not sku or not name:
            continue
        sku_data[sku]['lines'] += 1
        if price:
            try: sku_data[sku]['prices'].append(float(price))
            except: pass
        sku_data[sku]['names'].add(name)

    # 3. Filter to UNMATCHED
    unmatched = {sku: d for sku, d in sku_data.items() if sku not in master_skus}
    print(f"Unmatched SKUs to create: {len(unmatched)}")

    # 4. Build payloads
    payloads = []
    for sku, d in unmatched.items():
        # Use the longest/most descriptive name
        name = max(d['names'], key=len) if d['names'] else sku
        # Use the median price (robust against typos)
        prices = sorted(d['prices'])
        price = prices[len(prices) // 2] if prices else 0.0

        brand = guess_brand(sku, name)
        category = guess_category(name)

        payload = {
            'sku': sku,
            'name': name[:200],
            'unit': 'pcs',
            'price': price,
            'cost_price': round(price * 0.6, 2) if price else None,  # rough estimate
            'brand': brand,
            'category': category,
            'description': f"[CREATED FROM SHOPIFY ORDER HISTORY 2026-05-06 — sold {d['lines']}× across May 2024–Apr 2026; auto-derived from order line text. Cost is rough 60% estimate; review & update.]",
            'is_published': False,
            'reorder_point': 5,
        }
        # Strip nulls
        payloads.append({k: v for k, v in payload.items() if v not in (None, '')})

    # 5. Bulk upsert via jsonb_to_recordset
    print(f"Inserting {len(payloads)} new products...")
    cols = [('sku','text'),('name','text'),('unit','text'),('price','numeric'),
            ('cost_price','numeric'),('brand','text'),('category','text'),
            ('description','text'),('is_published','boolean'),('reorder_point','integer')]
    cols_def = ', '.join(f"{c} {t}" for c, t in cols)
    col_names = ', '.join(c for c, _ in cols)

    chunk_size = 50
    inserted = 0
    for i in range(0, len(payloads), chunk_size):
        chunk = payloads[i:i + chunk_size]
        payload_sql = json.dumps(chunk, ensure_ascii=False).replace("'", "''")
        sql = (
            f"INSERT INTO public.products_master ({col_names}) "
            f"SELECT {col_names} FROM jsonb_to_recordset('{payload_sql}'::jsonb) "
            f"AS x({cols_def}) "
            f"ON CONFLICT (sku) DO NOTHING;"
        )
        run_sql(sql)
        inserted += len(chunk)
        print(f"  chunk {i // chunk_size + 1}: +{len(chunk)} (total {inserted}/{len(payloads)})")

    # 6. Verify
    final = run_sql("select count(*)::int as n from products_master")[0]['n']
    print(f"\nDB now has {final} products (was {len(master_skus)}; expected +{len(payloads)} = {len(master_skus) + len(payloads)})")

    # Brand summary
    print("\nBrand breakdown of newly-created products:")
    brand_counter = defaultdict(int)
    for p in payloads:
        brand_counter[p.get('brand') or '(unknown)'] += 1
    for b, n in sorted(brand_counter.items(), key=lambda x: -x[1]):
        print(f"  {b:<30} {n}")


if __name__ == "__main__":
    main()
