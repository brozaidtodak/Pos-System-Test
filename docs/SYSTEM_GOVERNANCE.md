# 10 CAMP — System Governance

**Objective · Pipeline · SOP** untuk 3 permukaan: **Landing Page**, **Back Office**, **POS Apps**.
Dokumen rujukan tunggal — apa setiap permukaan patut buat, macam mana data mengalir, dan peraturan operasi/maintenance. Kemas kini bila skop berubah.

- Repo: `~/Projects/pos-site` · Deploy: `git push origin main` → Netlify auto-deploy (~1–2 min)
- Live: `www.10camp.com` (landing + app pada domain sama, SPA)
- DB: Supabase `asehjdnfzoypbwfeazra` (POS-System-Test)
- Brand-lock: **Sunset Bronze `#CD7C32`** · **Tropical Black `#101010`** · **Cloudy White `#FAF6EF`** · Poppins · **tiada emoji** (guna Lucide icon). Warna status merah/hijau/amber = pengecualian fungsi sahaja.
- Roadmap: setiap perubahan MESTI update `ROADMAP_DATA` dalam `index.html` (commit sama).

---

## 1. LANDING PAGE (storefront awam)

### 1.1 Objective
Etalase katalog awam + corong jualan (funnel). **BUKAN payment gateway** — pelanggan beli via **Shopee / TikTok / walk-in**. Tugas landing:
1. Pamer produk (katalog live, harga runcit marketplace, stok tersedia) dengan cara premium & dipercayai.
2. Corong ke marketplace / WhatsApp / kedai (butang beli → link platform).
3. Tangkap lead: VIP loyalty (mata), pertanyaan/invois web (menunggu pengesahan admin).
4. SEO / keterlihatan (schema, sitemap, marketing pixels).

**Tak boleh:** dedah kos/margin/supplier/PII pelanggan ke pelawat awam. Landing = data **cost-free** sahaja.

### 1.2 Pipeline
```
Pelawat anon
  → GET www.10camp.com (SPA boot, no login)
  → initApp(anon): baca VIEW cost-free — public_products + public_stock (BUKAN base table)
  → renderPublicStorefront + lpRenderActivityTiles + lpRenderCategoryPills + lpUpdateTrustStats
       Penapis wajib: isPublished == true · metadata.discontinued != true · BUKAN event-SKU (LP_EVENT_KEYWORDS)
  → Pelawat: browse / cari / buka product detail
  → Corong keluar:
       (a) Butang marketplace → link Shopee/TikTok (dari app_settings.links)
       (b) WhatsApp → wa.me (nombor dari app_settings.shop.whatsapp)
       (c) Pertanyaan web → public-checkout.js → quotations_log (type 'Web Invoice', status menunggu) → admin sahkan
       (d) VIP loyalty → loyalty-otp.js (OTP email) → papar mata/pembelian
```
**Sempadan keselamatan:** RLS + GRANT — role `anon` hanya boleh baca 2 view (`public_products`, `public_stock`). Semua tulisan awam lalu Netlify function service-role (`public-checkout`, `public-customer`, `loyalty-otp`) yang throttle/validate sendiri.

### 1.3 SOP
- **Nak produk keluar di landing:** set **Published** + **bukan discontinued** + kategori/nama **bukan** event-SKU. Kalau tak nampak → semak 3 syarat ni dulu.
- **Landing = Preview parity:** apa-apa ubah pada grid landing mesti sama pada Preview Mode (DOM/CSS sama). Guna ID selector untuk grid landing.
- **Kontak & sosial:** SEMUA dari `app_settings` (`shop.whatsapp`, `links.*`) — jangan hardcode nombor/handle. (Resit email pun kena ikut sumber sama.)
- **Brand-lock + no-emoji** dikuatkuasakan (GitHub Action guardian scan baris baru).
- **Jangan dedah:** kos, margin, supplier/vendor, bin lokasi, notes dalaman, PII pelanggan ke laluan anon.
- **Deploy:** push → tunggu Netlify → curl-verify `app.js?v=` → kill & buka semula app untuk nampak.

---

## 2. BACK OFFICE (pengurusan — staff/mgmt)

### 2.1 Objective
Satu control-plane untuk seluruh operasi 10 CAMP: katalog, inventori, procurement, kewangan, HR, sync marketplace, CRM, laporan. Staff jalankan operasi harian; Bos/mgmt awasi + luluskan.

### 2.2 Pipeline
```
Login staf (email/password kali pertama → PIN pada peranti sama; __detectUserByPin)
  → initApp(staff): baca BASE table penuh (products_master, inventory_batches, inventory_transactions,
    suppliers, PO, reservations, promo) + app_settings + marketplace_promotions
  → Modul:
     • Product Master  → CRUD katalog → auto-push draf ke TikTok (+ Shopee) bila produk baru/edit
     • Inventory       → batches (FIFO), Analytics (health/turnover/aging), Receiving, Cycle Count, Locations
     • Procurement     → Calculator (RMB×ex + SF 5% + shipping + part-time) → landed cost → inventory_batches
     • Marketplace     → Stock Sync (2-hala) + Price Push (Shopee/TikTok) + Not-on-TikTok gap + Campaign flags
     • Finance         → Commission Report, Laporan Sulit (PIN), bridge ke 10cc (source-of-truth kewangan)
     • HR / Roster     → jadual syif, cuti (AL/MC), tuntutan, approval (Bos)
     • CRM / Members   → loyalty, tier, B2B negotiated price
     • Collections     → koleksi/brand/kategori (thumbnail) + Urus Koleksi
     • Reports / Memo / Alerts (Pusat Amaran, dept-routed)
  → Tulisan: Supabase (RLS authenticated) + Netlify service-role functions (gated _auth requireStaff/requireAuth)
  → Deploy: git push → Netlify
```

### 2.3 SOP
- **Roles:** `mgmt` (penuh) · `sales` · `inventory` · **Bos** dikenali via `isBoss(u)` (jawatan Managing Director) — BUKAN role lama `'superior'` (sudah retired, jangan guna).
- **Approval (HR claim / cuti / memo):** gate guna `isBoss(u)` / `mgmt` — konsisten antara render butang dan handler.
- **Roadmap rule (keras):** setiap perubahan POS update `ROADMAP_DATA` dalam `index.html`, commit sama.
- **Data integrity (wajib):**
  - Semua `await db.from(...).insert/update()` pada laluan duit/stok — **semak `{error}` dan throw** (supabase-js tak throw sendiri; unchecked = "berjaya" palsu).
  - Operasi stok/returns idempoten — persist flag SEBELUM/selari kerja fizikal; guna kunci idempotensi, elak double-apply bila retry.
  - Jangan guna `Date.now()` sebagai primary key (collision) — guna default DB/UUID.
- **Jangan padam sejarah produk:** buang produk = padam baris katalog SAHAJA; jualan/returns/history kekal.
- **Marketplace:** harga POS = harga kedai (base terendah); Shopee/TikTok LEBIH tinggi (cover fee). Stok sync 2-hala; harga auto-push ON.
- **Brand-lock + no-emoji** untuk SEMUA skrin back office (3 warna + Poppins + logo rasmi + corak 10 Camp).
- **Confidential:** Laporan Sulit + kos/margin/komisen kunci PIN; role gate `mgmt` + PIN. (Nota: RLS server = sempadan sebenar, bukan gate klien.)

---

## 3. POS APPS (Cashier — jualan, web + mobile Capacitor)

### 3.1 Objective
Point-of-sale untuk **walk-in** + fulfillment omnichannel. Laju, tahan-offline, dengan **duit / stok / loyalti tepat**. Skrin staf jual; mobile shell (Android/iOS) untuk peranti kedai.

### 3.2 Pipeline
```
Login staf → Cashier (POS/Kaunter)
  → Buka Shift (float masuk laci; cash_drawer_log)
  → Cari / Scan barcode / Katalog (browse ikut Koleksi/Brand/Kategori) → tambah ke troli
  → Attach pelanggan: Walk-in / VIP (loyalty) / B2B (harga rundingan ikut min_qty)
  → Diskaun (manual per-item / global) + Loyalty redeem
  → Checkout (processNewCheckout):
       1. deduct_stock_fifo (RPC atomik, FOR UPDATE) — tolak stok per SKU
       2. insert sales_history (client_txn_id = kunci idempotensi; guard re-query bila timeout)
       3. kira mata + total_spent pelanggan (RM10 = 1 mata)
       4. resit (email Resend / print) + rekod laci + komisen
       5. push stok ke TikTok/Shopee (fire-and-forget)
  → Selepas jual: Return/Refund (restock ATAU tulis-off rosak) · Void · Tahan Jualan (held_sales) ·
    Split payment · Duit Keluar · Tutup Kira (Z-report: float + tunai − keluar = dijangka vs kira)
  → Offline: queue tempatan + sync bila online (laluan online tak diusik)
```
**Prinsip duit/stok:** deduct atomik; sale insert idempoten (`client_txn_id`); void/refund/edit MESTI pulih stok **dan** loyalti (idempoten via `md.stock_restored` / `md.loyalty_reversed`); Tutup Kira kira kaki tunai Split + refund tunai.

### 3.3 SOP
- **Mula shift:** Buka Shift → masukkan float. **Tutup shift:** Tutup Kira → kira tunai sebenar vs dijangka → simpan Z-report.
- **Jual:** cari/scan/Katalog → troli → attach pelanggan (VIP untuk mata, B2B untuk harga tier) → diskaun → **BAYAR**. Tunai: masuk duit diterima (sistem kira baki; halang kalau < jumlah).
- **Refund/Return:**
  - Barang **elok balik jual** → tick "Pulang ke stok".
  - Barang **rosak / write-off** → **UNTICK** "Pulang ke stok" (stok TAK ditambah balik).
  - Refund penuh → status Refunded + loyalti dipulih; separa → loyalti dipulih berkadar.
- **B2B:** harga tier ikut qty (min_qty) — dinilai semula bila qty berubah. Diskaun manual + harga B2B mesti selaras dengan yang dicaj (jangan caj lebih dari yang dipapar).
- **Offline caveat:** stok/resit ikut masa sync; cold-start perlu app dah dimuat. Elak jual offline masa stok kritikal.
- **Mobile:** Capacitor shell (iOS installed; Android internal testing). Kill & buka semula app untuk muat versi baru.
- **Brand-lock + no-emoji.**

---

## Peraturan silang (semua permukaan)
1. **Roadmap update** tiap perubahan (`ROADMAP_DATA`).
2. **Brand-lock 3 warna + Poppins + no emoji** (Lucide icon).
3. **Semak `{error}` + idempotensi** pada tiap tulisan duit/stok.
4. **Auth:** endpoint Netlify bermutasi/pulang-data gated (`_auth` requireStaff/requireAuth) + set `INTERNAL_FN_SECRET`. Jangan dedah kos/PII ke anon.
5. **Guard boot-race:** render yang bergantung `masterProducts` mesti tahan kalau katalog belum load (loading + retry), bukan render 0.
6. **Deploy:** push → Netlify → verify `app.js?v=` → kill-reopen app.
