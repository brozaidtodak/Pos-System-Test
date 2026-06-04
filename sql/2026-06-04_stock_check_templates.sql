-- 2026-06-04 — Stock Check templates (Zakwan reusable picker selections)
-- Reason: Zakwan stock-check workflow often repeats — weekly Top 50, monthly
--         brand audit, dead-stock review. Save selected SKU list as template
--         to reuse without manually ticking 100+ checkboxes every time.

BEGIN;

CREATE TABLE IF NOT EXISTS public.stock_check_templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku_list TEXT[] NOT NULL,
  filter_locations TEXT[],
  filter_categories TEXT[],
  filter_brands TEXT[],
  created_by_id TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  use_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sct_created_at ON public.stock_check_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sct_last_used ON public.stock_check_templates(last_used_at DESC NULLS LAST);

ALTER TABLE public.stock_check_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sct_authenticated_read" ON public.stock_check_templates;
CREATE POLICY "sct_authenticated_read" ON public.stock_check_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sct_authenticated_insert" ON public.stock_check_templates;
CREATE POLICY "sct_authenticated_insert" ON public.stock_check_templates
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sct_authenticated_update" ON public.stock_check_templates;
CREATE POLICY "sct_authenticated_update" ON public.stock_check_templates
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "sct_authenticated_delete" ON public.stock_check_templates;
CREATE POLICY "sct_authenticated_delete" ON public.stock_check_templates
  FOR DELETE TO authenticated USING (true);

COMMIT;

SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_check_templates';
