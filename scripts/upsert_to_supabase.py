#!/usr/bin/env python3
"""
Upsert products_master.json + inventory_batches.json to Supabase via Management API.

Uses the SQL query endpoint (/v1/projects/<ref>/database/query). Each chunk is
sent as a single INSERT … SELECT FROM jsonb_to_recordset(...) statement so we
don't have to escape per-row literals.

Requires SUPABASE_ACCESS_TOKEN in env (already set in ~/.claude/.env).
"""
from __future__ import annotations
import json, os, sys, urllib.request, urllib.error
from pathlib import Path

PROJECT_REF = "asehjdnfzoypbwfeazra"
SCRIPT_DIR = Path(__file__).resolve().parent
PRODUCTS = json.load(open(SCRIPT_DIR / "products_master.json"))
BATCHES = json.load(open(SCRIPT_DIR / "inventory_batches.json"))

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not TOKEN:
    sys.exit("SUPABASE_ACCESS_TOKEN not set. `source ~/.claude/.env` first.")

API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

PRODUCT_COLS = [
    ("sku", "text"), ("name", "text"), ("unit", "text"), ("price", "numeric"),
    ("cost_price", "numeric"), ("category", "text"), ("brand", "text"),
    ("model_no", "text"), ("parent_sku", "text"), ("erp_barcode", "text"),
    ("variant_color", "text"), ("variant_size", "text"), ("weight_kg", "numeric"),
    ("images", "jsonb"), ("description", "text"), ("is_published", "boolean"),
]
BATCH_COLS = [
    ("sku", "text"), ("batch_year", "integer"),
    ("inbound_date", "timestamptz"), ("qty_received", "integer"),
    ("qty_remaining", "integer"),
]

UPDATE_SET = ", ".join(
    f"{c} = excluded.{c}" for c, _ in PRODUCT_COLS if c != "sku"
)


def run_sql(sql: str) -> dict:
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}",
                 "Content-Type": "application/json",
                 "User-Agent": "10camp-pos-importer/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"HTTP {e.code}: {body}")


def chunked(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


def upsert_products(rows, chunk_size=100):
    cols_def = ", ".join(f"{c} {t}" for c, t in PRODUCT_COLS)
    col_names = ", ".join(c for c, _ in PRODUCT_COLS)
    total = 0
    for i, chunk in enumerate(chunked(rows, chunk_size), start=1):
        payload = json.dumps(chunk, ensure_ascii=False)
        # Single-quote escape for SQL literal
        payload_sql = payload.replace("'", "''")
        sql = (
            f"INSERT INTO public.products_master ({col_names}) "
            f"SELECT {col_names} FROM jsonb_to_recordset('{payload_sql}'::jsonb) "
            f"AS x({cols_def}) "
            f"ON CONFLICT (sku) DO UPDATE SET {UPDATE_SET};"
        )
        run_sql(sql)
        total += len(chunk)
        print(f"  products chunk {i}: +{len(chunk)} (running total {total}/{len(rows)})")
    return total


def insert_batches(rows, chunk_size=200):
    cols_def = ", ".join(f"{c} {t}" for c, t in BATCH_COLS)
    col_names = ", ".join(c for c, _ in BATCH_COLS)
    total = 0
    for i, chunk in enumerate(chunked(rows, chunk_size), start=1):
        payload = json.dumps(chunk, ensure_ascii=False).replace("'", "''")
        sql = (
            f"INSERT INTO public.inventory_batches ({col_names}) "
            f"SELECT {col_names} FROM jsonb_to_recordset('{payload}'::jsonb) "
            f"AS x({cols_def});"
        )
        run_sql(sql)
        total += len(chunk)
        print(f"  batches chunk {i}: +{len(chunk)} (running total {total}/{len(rows)})")
    return total


def main():
    print(f"Products to upsert: {len(PRODUCTS)}")
    print(f"Batches to insert:  {len(BATCHES)}")
    print()

    # Pre-flight: count current rows
    pre_p = run_sql("select count(*)::int as n from public.products_master;")
    pre_b = run_sql("select count(*)::int as n from public.inventory_batches;")
    print(f"DB pre-import:  products={pre_p[0]['n']}  batches={pre_b[0]['n']}")
    print()

    print("Upserting products_master ...")
    upsert_products(PRODUCTS)
    print()

    print("Inserting inventory_batches ...")
    insert_batches(BATCHES)
    print()

    post_p = run_sql("select count(*)::int as n from public.products_master;")
    post_b = run_sql("select count(*)::int as n from public.inventory_batches;")
    print(f"DB post-import: products={post_p[0]['n']}  batches={post_b[0]['n']}")


if __name__ == "__main__":
    main()
