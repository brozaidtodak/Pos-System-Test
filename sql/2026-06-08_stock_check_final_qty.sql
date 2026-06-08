-- p1_507 — Stock Take: kolum "Final Qty" untuk submit ke Bos.
-- Reviewer (Zack) isi kuantiti muktamad selepas tengok Kiraan 1 vs Semakan 2.
-- final_qty jadi default "Set Ke" masa publish ke Products.
ALTER TABLE stock_check_session_items ADD COLUMN IF NOT EXISTS final_qty INTEGER;
ALTER TABLE stock_check_session_items ADD COLUMN IF NOT EXISTS final_by_name TEXT;
ALTER TABLE stock_check_session_items ADD COLUMN IF NOT EXISTS final_at TIMESTAMPTZ;
