-- p1_294 — Fill variant_color from the variant label embedded in product name.
-- Zaid: "semua product yang title dia ada tulis SKU number dimasukkan sebagai
--        variant" → chose "isi field variant dari nama".
--
-- Product names carry the specific variant label after an em-dash, prefixed by
-- the row's own SKU, e.g.:
--   "BD040-041 | ... Incubator | BD040 | BD041 — BD041 25L"  (sku=BD041)  -> "25L"
--   "...Cinema... — BD013 v1 (Screen)"                       (sku=BD013)  -> "v1 (Screen)"
-- Extraction = text after the last em-dash, with the leading own-SKU stripped.
--
-- Non-destructive: only fills rows where variant_color IS NULL and the name has
-- an em-dash + a non-empty label. Names + parent_sku untouched. Reversible
-- (set variant_color = NULL for the affected rows to roll back).
-- Applied 2026-06-05 via Supabase Management API: 215 rows updated.

UPDATE products_master
SET variant_color = trim(regexp_replace(regexp_replace(name, '^.*—\s*', ''), '^' || sku || '\s*', '', 'i'))
WHERE name LIKE '%—%'
  AND variant_color IS NULL
  AND trim(regexp_replace(regexp_replace(name, '^.*—\s*', ''), '^' || sku || '\s*', '', 'i')) <> '';

-- Verify:
-- SELECT sku, variant_color, name FROM products_master WHERE variant_color IS NOT NULL ORDER BY parent_sku LIMIT 30;
