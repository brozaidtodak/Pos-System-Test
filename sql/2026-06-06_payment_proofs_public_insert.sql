-- p1_373 (2026-06-06): Fix "Upload resit gagal" untuk jualan Cash.
-- PUNCA: bucket payment-proofs INSERT/UPDATE policy hanya untuk role `authenticated`,
-- tapi POS staff login via PIN (anon key) -> session = anon -> RLS block upload.
-- product-images bucket dah ada public insert (sebab tu gambar produk OK), payment-proofs tak.
-- FIX: tambah policy public INSERT + UPDATE (merangkumi anon) untuk payment-proofs.
-- Konsisten dengan model POS = app dalaman anon-key dipercayai. Read sudah public.

create policy "payment_proofs_public_insert" on storage.objects
  for insert to public with check (bucket_id = 'payment-proofs');

create policy "payment_proofs_public_update" on storage.objects
  for update to public using (bucket_id = 'payment-proofs') with check (bucket_id = 'payment-proofs');

-- Rollback:
-- drop policy "payment_proofs_public_insert" on storage.objects;
-- drop policy "payment_proofs_public_update" on storage.objects;
