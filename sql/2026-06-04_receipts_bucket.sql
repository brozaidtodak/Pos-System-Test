-- 2026-06-04 — Receipts Storage bucket for PDF receipts
-- Author: Zaid via Claude
-- Reason: Customers buy walk-in. Staff wants to send official PDF receipt via
--         WhatsApp + Email. wa.me doesn't support attachments, so PDF must be
--         hosted with public URL — share link only.

BEGIN;

-- 1) Create Storage bucket (public read, 2 MB cap, PDF mime only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'receipts',
    'receipts',
    true,
    2097152,  -- 2 MB cap per receipt (typical PDF receipt is < 200 KB)
    ARRAY['application/pdf']
  )
  ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) RLS policies on storage.objects for receipts bucket
DROP POLICY IF EXISTS "receipts_authenticated_insert" ON storage.objects;
CREATE POLICY "receipts_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_authenticated_update" ON storage.objects;
CREATE POLICY "receipts_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_public_read" ON storage.objects;
CREATE POLICY "receipts_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'receipts');

-- 3) Track receipt URL on sales_history
ALTER TABLE public.sales_history
  ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_sent_whatsapp_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_sent_email_at TIMESTAMPTZ;

COMMIT;

SELECT
  (SELECT id FROM storage.buckets WHERE id='receipts') AS bucket_id,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sales_history'
      AND column_name IN ('receipt_pdf_url','receipt_pdf_generated_at','receipt_sent_whatsapp_at','receipt_sent_email_at')) AS new_cols;
