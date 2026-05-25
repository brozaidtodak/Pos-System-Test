-- p3_1 Shopee Fasa 1 — token storage table.
-- Run dalam Supabase SQL Editor (project asehjdnfzoypbwfeazra).
--
-- Pattern same as public.tiktok_tokens — RLS locked, service-role only.
-- Access from Netlify function shopee-oauth.js via SUPABASE_SERVICE_KEY.

CREATE TABLE IF NOT EXISTS public.shopee_tokens (
    shop_id                 BIGINT PRIMARY KEY,
    partner_id              BIGINT NOT NULL,
    access_token            TEXT   NOT NULL,
    access_token_expire_at  TIMESTAMPTZ NOT NULL,
    refresh_token           TEXT   NOT NULL,
    refresh_token_expire_at TIMESTAMPTZ NOT NULL,
    environment             TEXT   NOT NULL DEFAULT 'sandbox', -- 'sandbox' atau 'live'
    merchant_id_list        JSONB,
    shop_id_list            JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shopee_tokens IS
    'Shopee Open Platform access + refresh tokens per shop. Written by Netlify function shopee-oauth.js.';

-- RLS: lock all client access. Only service_role can read/write.
ALTER TABLE public.shopee_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON public.shopee_tokens;
CREATE POLICY "service_role_only" ON public.shopee_tokens
    FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Index for environment lookups (sandbox vs live separation)
CREATE INDEX IF NOT EXISTS shopee_tokens_environment_idx
    ON public.shopee_tokens (environment);

-- Trigger to bump updated_at on row update
CREATE OR REPLACE FUNCTION public.shopee_tokens_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shopee_tokens_touch_updated_at_trg ON public.shopee_tokens;
CREATE TRIGGER shopee_tokens_touch_updated_at_trg
    BEFORE UPDATE ON public.shopee_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.shopee_tokens_touch_updated_at();
