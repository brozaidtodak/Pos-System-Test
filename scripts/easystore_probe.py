#!/usr/bin/env python3
"""
EasyStore API probe — fetch full counts + sample rows for products,
customers, orders, locations. Prints a summary so we know what we're
working with before doing migration.
"""
from __future__ import annotations
import json, os, sys, urllib.request, urllib.error
from datetime import datetime

STORE = os.environ.get('EASYSTORE_STORE')      # e.g. 10camp.easystore.co (display)
TOKEN = os.environ.get('EASYSTORE_TOKEN')
BASE = "https://www.10camp.com/api/3.0"         # actual API host

if not TOKEN:
    sys.exit("source ~/.claude/.env first")


def get(path):
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"EasyStore-Access-Token": TOKEN, "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:200]}
    except Exception as e:
        return {"error": str(e)}


def section(title): print(f"\n━━━ {title} ━━━")


def main():
    section("CONNECTION")
    print(f"Store: {STORE}")
    print(f"API:   {BASE}")

    # Products
    section("PRODUCTS")
    p = get("/products.json?limit=1")
    if 'error' in p:
        print(f"  ERROR: {p}")
    else:
        print(f"  Total products: {p.get('total_count')} ({p.get('page_count')} pages × {p.get('limit')}/page)")
        if p.get('products'):
            sample = p['products'][0]
            print(f"  Sample [{sample.get('id')}]: {sample.get('title','')[:60]}")
            print(f"    Brand: {sample.get('vendor','-')} · Type: {sample.get('product_type','-')}")
            print(f"    Variants: {len(sample.get('variants', []))}")
            print(f"    Status: {sample.get('status','-')} · Published: {sample.get('published','-')}")

    # Customers
    section("CUSTOMERS")
    c = get("/customers.json?limit=1")
    if 'error' in c:
        print(f"  ERROR: {c}")
    else:
        print(f"  Total customers: {c.get('total_count')}")
        if c.get('customers'):
            cs = c['customers'][0]
            print(f"  Sample: {cs.get('name','')} · {cs.get('email','-')} · {cs.get('phone','-')}")
            print(f"    Total spent: {cs.get('total_spent','-')} · Orders: {cs.get('orders_count','-')}")

    # Orders
    section("ORDERS")
    o = get("/orders.json?limit=3")
    if 'error' in o:
        print(f"  ERROR: {o}")
    else:
        print(f"  Total orders: {o.get('total_count')}")
        if o.get('orders'):
            for od in o['orders'][:3]:
                print(f"  #{od.get('order_number')} · {od.get('processed_at','')[:10]} · {od.get('customer',{}).get('name','-')} · RM {od.get('total_price','-')} · {od.get('financial_status','-')}")

    # Date range of orders
    section("ORDER DATE RANGE")
    o_old = get("/orders.json?limit=1&sort=processed_at.asc")
    o_new = get("/orders.json?limit=1&sort=processed_at.desc")
    if o_old.get('orders'):
        first = o_old['orders'][0]
        print(f"  First: {first.get('processed_at','-')[:10]} · #{first.get('order_number')}")
    if o_new.get('orders'):
        last = o_new['orders'][0]
        print(f"  Last:  {last.get('processed_at','-')[:10]} · #{last.get('order_number')}")

    # Locations
    section("LOCATIONS")
    l = get("/locations.json")
    if 'error' in l:
        print(f"  ERROR: {l}")
    else:
        for loc in l.get('locations', []):
            print(f"  [{loc.get('id')}] {loc.get('name')} · {loc.get('code')} · {loc.get('city')} · primary={loc.get('is_primary')}")

    # Try a few possibly-existing endpoints
    section("OTHER ENDPOINTS (probe)")
    for path in ['/discounts.json?limit=1', '/transactions.json?limit=1',
                 '/fulfillments.json?limit=1', '/shop.json', '/shop/info.json']:
        r = get(path)
        if 'error' in r:
            print(f"  {path:<30} → {r['error']}")
        else:
            keys = ', '.join(list(r.keys())[:5])
            print(f"  {path:<30} → keys: {keys}")


if __name__ == "__main__":
    main()
