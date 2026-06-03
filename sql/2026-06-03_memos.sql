-- p1_143 — Memos cross-device persistence via Supabase.
CREATE TABLE IF NOT EXISTS public.memos (
    id              TEXT PRIMARY KEY,
    department      TEXT NOT NULL DEFAULT 'general',
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    pinned          BOOLEAN NOT NULL DEFAULT false,
    status          TEXT NOT NULL DEFAULT 'pending',
    posted_by_id    TEXT,
    posted_by_name  TEXT,
    posted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by_name TEXT,
    approved_at     TIMESTAMPTZ,
    reject_reason   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_memos" ON public.memos;
CREATE POLICY "service_role_all_memos" ON public.memos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_memos" ON public.memos;
CREATE POLICY "auth_read_memos" ON public.memos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_write_memos" ON public.memos;
CREATE POLICY "auth_write_memos" ON public.memos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_memos" ON public.memos;
CREATE POLICY "auth_update_memos" ON public.memos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_memos" ON public.memos;
CREATE POLICY "auth_delete_memos" ON public.memos FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS memos_status_posted_idx ON public.memos (status, posted_at DESC);
CREATE INDEX IF NOT EXISTS memos_dept_idx ON public.memos (department, status);
CREATE INDEX IF NOT EXISTS memos_pinned_idx ON public.memos (pinned, status) WHERE pinned = true;
