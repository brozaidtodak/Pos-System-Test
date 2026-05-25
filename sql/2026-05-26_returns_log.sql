-- p1_121 — Returns/Damage tracking.
-- Log returns + damages + missing items with reason for quality control.

CREATE TABLE IF NOT EXISTS public.returns_log (
    id              BIGSERIAL PRIMARY KEY,
    sku             TEXT        NOT NULL,
    product_name    TEXT,
    qty             INT         NOT NULL,
    type            TEXT        NOT NULL, -- 'return' | 'damaged' | 'missing' | 'expired'
    reason          TEXT        NOT NULL, -- enum-like: defective, customer_change, wrong_item, packaging, etc
    notes           TEXT,
    channel         TEXT,                  -- Walk-in / Shopee / TikTok / Web / etc
    order_ref       TEXT,                  -- original sale id atau order_sn
    supplier        TEXT,
    cost_impact     NUMERIC(10, 2) DEFAULT 0,
    reported_by_id  TEXT,
    reported_by_name TEXT,
    reported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.returns_log IS
    'Track returns/damages/missing items per SKU. Identify problem SKUs + supplier QC issues.';

ALTER TABLE public.returns_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.returns_log;
CREATE POLICY "service_role_all" ON public.returns_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read" ON public.returns_log;
CREATE POLICY "auth_read" ON public.returns_log
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert" ON public.returns_log;
CREATE POLICY "auth_insert" ON public.returns_log
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS returns_log_sku_idx
    ON public.returns_log (sku, reported_at DESC);

CREATE INDEX IF NOT EXISTS returns_log_reported_at_idx
    ON public.returns_log (reported_at DESC);

CREATE INDEX IF NOT EXISTS returns_log_type_idx
    ON public.returns_log (type, reported_at DESC);
