-- 2026-07-22 — Tugasan Staf (task assignment Bos → staf). p1_1176
-- Bos (CMP001) beri tugasan; staf nampak & update status tugasan SENDIRI sahaja
-- dalam app mobile (tab Task). Papan semua-staf = back office, gate isBoss client-side.
-- Model akses = sama macam b2b_price_list: POS staff login PIN guna anon key,
-- jadi policy benarkan role `public`. App dalaman dipercayai.

CREATE TABLE IF NOT EXISTS public.staff_tasks (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title            TEXT NOT NULL,
    notes            TEXT DEFAULT '',
    assigned_to      TEXT NOT NULL,           -- staff_id cth CMP006
    assigned_to_name TEXT DEFAULT '',
    assigned_by      TEXT DEFAULT '',          -- nama pemberi (Zaid)
    status           TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru','buat','siap')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at       TIMESTAMPTZ,
    done_at          TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_tasks IS
    'Tugasan ad-hoc Bos ke staf. status: baru (belum mula) / buat (tengah buat) / siap.';

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_staff_tasks" ON public.staff_tasks;
CREATE POLICY "service_role_all_staff_tasks" ON public.staff_tasks
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_staff_tasks" ON public.staff_tasks;
CREATE POLICY "public_read_staff_tasks" ON public.staff_tasks
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_insert_staff_tasks" ON public.staff_tasks;
CREATE POLICY "public_insert_staff_tasks" ON public.staff_tasks
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_staff_tasks" ON public.staff_tasks;
CREATE POLICY "public_update_staff_tasks" ON public.staff_tasks
    FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_staff_tasks" ON public.staff_tasks;
CREATE POLICY "public_delete_staff_tasks" ON public.staff_tasks
    FOR DELETE TO public USING (true);

CREATE INDEX IF NOT EXISTS staff_tasks_assigned_to_idx
    ON public.staff_tasks (assigned_to, status);

-- Rollback:
-- DROP TABLE IF EXISTS public.staff_tasks;
