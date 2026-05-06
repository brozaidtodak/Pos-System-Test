#!/usr/bin/env python3
"""
Shopify products_export.csv → POS products_master + inventory_batches.

User decisions baked in (2026-05-06):
  - Full import (all variants)
  - is_published = false (draft)
  - Use Shopify qty + tag description as preliminary stock-take pending
  - Keep Shopify CDN image URLs
  - Auto-gen SKU when missing: 10C-<HANDLE_TRIM>-<OPT1>-<OPT2>

Outputs two JSON files alongside the CSV:
  products_master.json  - rows ready to upsert to public.products_master
  inventory_batches.json - rows ready to insert to public.inventory_batches
"""

from __future__ import annotations
import csv, json, re, sys, html
from collections import defaultdict
from pathlib import Path

CSV_PATH = Path("/Users/brozaidtodak/Downloads/products_export_1.csv")
OUT_DIR = Path("/Users/brozaidtodak/.gemini/antigravity/scratch/Pos-System-Test/scripts")
PRODUCTS_OUT = OUT_DIR / "products_master.json"
BATCHES_OUT = OUT_DIR / "inventory_batches.json"

INBOUND_DATE = "2026-04-30T00:00:00Z"   # last Shopify month per user
BATCH_YEAR = 2026
STOCKTAKE_PREFIX = "[STOK BELUM DISAHKAN — perlu stock-take fizikal. Qty terakhir dari Shopify Apr 2026.]\n\n"


def slug(s: str, maxlen: int = 16) -> str:
    """URL-safe uppercase slug for SKU parts."""
    s = (s or "").strip().upper()
    s = re.sub(r"[^A-Z0-9]+", "-", s)
    s = s.strip("-")
    return s[:maxlen]


def strip_html(raw: str, max_chars: int = 500) -> str:
    if not raw:
        return ""
    txt = re.sub(r"<[^>]+>", " ", raw)
    txt = html.unescape(txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    if len(txt) > max_chars:
        cut = txt[:max_chars].rsplit(" ", 1)[0]
        txt = cut + "…"
    return txt


def to_num(v: str):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def to_int(v: str):
    if v is None or v == "":
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def main() -> None:
    if not CSV_PATH.exists():
        sys.exit(f"CSV not found: {CSV_PATH}")

    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Group by handle, capture parent metadata from first non-empty values
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        h = (r.get("Handle") or "").strip()
        if h:
            groups[h].append(r)

    products: list[dict] = []
    batches: list[dict] = []
    seen_skus: set[str] = set()
    auto_seq = 0

    for handle, grp in groups.items():
        # Parent fields = first row's values (Shopify exports parent meta on row 1 only)
        parent = grp[0]
        title = (parent.get("Title") or "").strip()
        vendor = (parent.get("Vendor") or "").strip()
        ptype = (parent.get("Type") or "").strip()
        body = strip_html(parent.get("Body (HTML)") or "")

        # Collect ALL image URLs for this handle (variant & continuation rows)
        all_images = []
        for r in grp:
            img = (r.get("Image Src") or "").strip()
            if img and img not in all_images:
                all_images.append(img)

        # Variant rows = rows with a Price (Shopify always sets price on variant rows)
        variant_rows = [r for r in grp if (r.get("Variant Price") or "").strip()]
        if not variant_rows:
            continue

        for idx, v in enumerate(variant_rows, start=1):
            opt1_name = (v.get("Option1 Name") or parent.get("Option1 Name") or "").strip()
            opt1_val = (v.get("Option1 Value") or "").strip()
            opt2_name = (v.get("Option2 Name") or parent.get("Option2 Name") or "").strip()
            opt2_val = (v.get("Option2 Value") or "").strip()
            opt3_val = (v.get("Option3 Value") or "").strip()

            # Build name
            opt_parts = [p for p in (opt1_val, opt2_val, opt3_val) if p and p.lower() != "default title"]
            name = title if not opt_parts else f"{title} — {' / '.join(opt_parts)}"
            name = name[:200]  # safety

            # SKU
            sku = (v.get("Variant SKU") or "").strip()
            if not sku:
                handle_slug = slug(handle, 20)
                opt1_slug = slug(opt1_val, 8) if opt1_val else ""
                opt2_slug = slug(opt2_val, 6) if opt2_val else ""
                parts = ["10C", handle_slug] + [p for p in (opt1_slug, opt2_slug) if p]
                sku = "-".join(parts)
                # Disambiguate against collisions
                base = sku
                while sku in seen_skus:
                    auto_seq += 1
                    sku = f"{base}-{auto_seq}"
            sku = sku.upper()[:64]
            if sku in seen_skus:
                # Collision even on imported SKU — append index
                sku = f"{sku}-{idx}"
            seen_skus.add(sku)

            price = to_num(v.get("Variant Price"))
            cost = to_num(v.get("Cost per item"))
            grams = to_num(v.get("Variant Grams"))
            qty = to_int(v.get("Variant Inventory Qty")) or 0
            barcode = re.sub(r"[\s\x00-\x1f]+", "", v.get("Variant Barcode") or "") or None

            # Color/Size detection
            variant_color = None
            variant_size = None
            for nm, val in ((opt1_name, opt1_val), (opt2_name, opt2_val)):
                if not val:
                    continue
                low = nm.lower()
                if any(k in low for k in ("color", "colour", "warna")):
                    variant_color = val
                elif "size" in low or "saiz" in low:
                    variant_size = val
            # Heuristic: if Option1 looks like a color word and we still have nothing
            if not variant_color and opt1_val and opt1_name.lower() in ("variants", "variant", ""):
                # First-pass guess: look for common color tokens
                color_tokens = {"black", "white", "red", "blue", "green", "yellow", "grey", "gray",
                                "brown", "khaki", "navy", "olive", "pink", "purple", "orange",
                                "beige", "tan", "silver", "gold", "hitam", "putih", "merah",
                                "biru", "hijau", "kuning", "kelabu"}
                if any(t in opt1_val.lower() for t in color_tokens):
                    variant_color = opt1_val
            if not variant_size and opt2_val and re.fullmatch(r"[smlx0-9.]+", opt2_val.lower()):
                variant_size = opt2_val

            description = (STOCKTAKE_PREFIX + body) if body else STOCKTAKE_PREFIX.strip()

            product = {
                "sku": sku,
                "name": name,
                "unit": "pcs",
                "price": price if price is not None else 0,
                "cost_price": cost,
                "category": ptype or None,
                "brand": vendor or None,
                "model_no": handle,
                "parent_sku": handle.upper()[:64],
                "erp_barcode": barcode,
                "variant_color": variant_color,
                "variant_size": variant_size,
                "weight_kg": round(grams / 1000, 3) if grams else None,
                "images": all_images if all_images else None,
                "description": description,
                "is_published": False,
            }
            # Drop None-valued keys so PG defaults / NULLs apply cleanly
            product = {k: v for k, v in product.items() if v is not None}
            products.append(product)

            if qty > 0:
                batches.append({
                    "sku": sku,
                    "batch_year": BATCH_YEAR,
                    "inbound_date": INBOUND_DATE,
                    "qty_received": qty,
                    "qty_remaining": qty,
                })

    PRODUCTS_OUT.write_text(json.dumps(products, ensure_ascii=False, indent=2))
    BATCHES_OUT.write_text(json.dumps(batches, ensure_ascii=False, indent=2))

    print(f"Products: {len(products)} (unique SKUs: {len(seen_skus)})")
    print(f"Batches:  {len(batches)} (qty>0 variants only)")
    print(f"  → {PRODUCTS_OUT}")
    print(f"  → {BATCHES_OUT}")
    if products:
        print("\n--- Sample 3 products ---")
        for p in products[:3]:
            print(json.dumps(p, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
