-- 2026-07-23 — FIX cron auto-jadual gagal senyap run pertama (p1_1189).
-- PUNCA: index unik auto_key asal = PARTIAL (WHERE auto_key IS NOT NULL).
-- PostgREST `on_conflict=auto_key` jana ON CONFLICT (auto_key) TANPA predikat
-- → Postgres: "no unique or exclusion constraint matching" → insert THROW →
-- jadual-auto-cron mati sebelum tulis apa-apa (0 tugasan pagi 23 Jul).
-- Dry-run tak tangkap sebab mod dry LANGKAU insert.
-- FIX: index unik BIASA — NULL memang dibenarkan berbilang (NULLS DISTINCT
-- default), jadi partial tak perlu pun.
DROP INDEX IF EXISTS staff_tasks_auto_key_uniq;
CREATE UNIQUE INDEX staff_tasks_auto_key_uniq ON public.staff_tasks (auto_key);
-- Dijalankan terus pada DB 23 Jul 13:20 MYT; run manual selepas fix = 14 tugasan masuk.
