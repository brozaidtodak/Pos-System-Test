-- p1_144 — staff_profiles cross-device leave balance persistence.
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    name            TEXT PRIMARY KEY,
    leave_balance   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_sp" ON public.staff_profiles;
CREATE POLICY "service_role_all_sp" ON public.staff_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_sp" ON public.staff_profiles;
CREATE POLICY "auth_read_sp" ON public.staff_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_write_sp" ON public.staff_profiles;
CREATE POLICY "auth_write_sp" ON public.staff_profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sp" ON public.staff_profiles;
CREATE POLICY "auth_update_sp" ON public.staff_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed initial balances (idempotent — ON CONFLICT preserves existing)
INSERT INTO public.staff_profiles (name, leave_balance) VALUES
    ('Aliff', 14),
    ('Farhan Moyy', 14),
    ('Zack', 12),
    ('Ariff', 10),
    ('Irfan', 10),
    ('Tarmizi', 8),
    ('Fahmi', 8)
ON CONFLICT (name) DO NOTHING;
