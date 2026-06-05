-- p1_308 — Give inventory_batches.batch_year a DEFAULT.
-- Audit found 6+ inventory_batches INSERT sites omitted batch_year (NOT NULL, no
-- default) → inserts failed (PO receive, manual inbound, master-product initial
-- stock, onboarding, discrepancy surplus). Rather than patch each call site,
-- default the column so every insert (current + future) is safe. Explicit setters
-- (migration/GRN) still override it.

ALTER TABLE inventory_batches
  ALTER COLUMN batch_year SET DEFAULT EXTRACT(YEAR FROM timezone('utc', now()))::int;
