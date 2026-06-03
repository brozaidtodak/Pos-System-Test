-- p1_167 — Stock Check Sessions (Zack→Kael/Fahmi→Zack→Bos workflow digitized).
CREATE TABLE IF NOT EXISTS public.stock_check_sessions (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    locations       TEXT[] NOT NULL DEFAULT '{}',
    assigned_to     TEXT[] NOT NULL DEFAULT '{}',
    created_by_id   TEXT,
    created_by_name TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    items_total     INT NOT NULL DEFAULT 0,
    items_checked   INT NOT NULL DEFAULT 0,
    items_variance  INT NOT NULL DEFAULT 0,
    rm_variance     NUMERIC(12,2) NOT NULL DEFAULT 0,
    summary_text    TEXT,
    review_notes    TEXT,
    reviewer_name   TEXT,
    reviewer_id     TEXT,
    reviewed_at     TIMESTAMPTZ,
    bos_action      TEXT,
    bos_seen_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    forwarded_at    TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ
);

COMMENT ON TABLE public.stock_check_sessions IS
    'Stock check workflow sessions. Status: active -> review -> forwarded -> approved/rejected. Zack creates -> Kael+Fahmi fill -> Zack review -> Bos approve.';

ALTER TABLE public.stock_check_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_scs" ON public.stock_check_sessions;
CREATE POLICY "service_role_all_scs" ON public.stock_check_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_scs" ON public.stock_check_sessions;
CREATE POLICY "auth_all_scs" ON public.stock_check_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS scs_status_idx ON public.stock_check_sessions (status, created_at DESC);

-- Per-item submissions (atomic Kael/Fahmi count per SKU within a session)
CREATE TABLE IF NOT EXISTS public.stock_check_session_items (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT NOT NULL REFERENCES public.stock_check_sessions(id) ON DELETE CASCADE,
    sku             TEXT NOT NULL,
    product_name    TEXT,
    location_bin    TEXT,
    system_qty      INT,
    counted_qty     INT,
    variance        INT,
    flag            TEXT,
    note            TEXT,
    counted_by_id   TEXT,
    counted_by_name TEXT,
    counted_at      TIMESTAMPTZ,
    UNIQUE(session_id, sku)
);

ALTER TABLE public.stock_check_session_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_scsi" ON public.stock_check_session_items;
CREATE POLICY "service_role_all_scsi" ON public.stock_check_session_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_scsi" ON public.stock_check_session_items;
CREATE POLICY "auth_all_scsi" ON public.stock_check_session_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS scsi_session_idx ON public.stock_check_session_items (session_id, location_bin);
CREATE INDEX IF NOT EXISTS scsi_unchecked_idx ON public.stock_check_session_items (session_id) WHERE counted_qty IS NULL;
