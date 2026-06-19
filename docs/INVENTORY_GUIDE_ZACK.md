# 10 CAMP POS — Panduan Inventory (untuk Zack)

Macam mana sistem inventory jalan + cara guna setiap bahagian. Baca "Konsep Teras" dulu — kalau faham ni, semua benda lain masuk akal.

---

## KONSEP TERAS (faham ni dulu)

**1. Stok sebenar = jumlah BATCH, bukan satu nombor.**
Setiap kali stok masuk, sistem cipta satu *batch* dalam `inventory_batches` (qty + tarikh + kos). Stok semasa satu SKU = jumlah `qty_remaining` semua batch dia. Bukan baca satu medan "stock" je.

**2. Stok masuk = cipta batch. Stok keluar = tolak FIFO.**
Bila jual / keluarkan stok, sistem tolak dari **batch paling lama dulu** (First-In-First-Out). Enjin teras = `__applyStockDelta(sku, qty, sebab)` — qty negatif tolak FIFO, qty positif cipta batch baru.

**3. Semua pergerakan dilog.**
Tiap IN / OUT / ADJUST direkod dalam `inventory_transactions` (ledger). Boleh audit di *Inventory History*.

**Kenapa FIFO penting:** kos barang lama ≠ kos barang baru (RMB + shipping berubah). FIFO bagi COGS tepat ikut batch sebenar yang terjual.

---

## SIDEBAR: Katalog & Stok

- **Products** — Products (katalog + stok) · Collections · Bundles
- **Inventory** — Stock Levels · Stock Take · **Cycle Count** · FIFO Listing · Inventory History · **Locations & Bins**
- **Purchasing** — Purchase Orders · **Receiving** · Delivery Orders
- **Tools** — Price Calc · Cost Calc · Price History · Barcode

(*tebal* = baru ditambah 19 Jun)

---

## ALIRAN KERJA

### 1. Daftar produk BARU (katalog)
`Products › Products` → tambah produk. Isi SKU, nama, harga jual, kos, jenama, kategori, gambar.
> Ni cipta baris katalog je. **Stok masih 0** sampai ada batch masuk (langkah 2).
> Nota: butang "Daftar Produk ke Gudang" BUKAN untuk cipta produk — itu untuk daftar STOK (batch) untuk SKU yang dah wujud. Jangan keliru.

### 2. Masukkan STOK (3 cara)

**(A) Cara utama — PO + Receiving** *(paling kemas, ada kos + audit)*
1. `Purchasing › Purchase Orders` → cipta PO (pembekal, ETA, senarai SKU + qty).
2. Bila barang sampai: `Purchasing › Receiving` → pilih PO → **Terima**.
3. Dalam GRN: isi **qty sebenar diterima** + **qty Rosak** + kos/unit. Boleh **scan barcode** untuk auto-tambah.
4. Sahkan → barang **baik** masuk stok (batch dgn kos + link PO); barang **rosak** masuk *Returns log* (tak jadi stok jual; untuk claim pembekal). PO tutup (Completed/Partial).

**(B) Cara cepat — Daftar batch terus**
"Daftar Produk ke Gudang" (form registrasi stok): shipment no, tarikh, SKU sedia ada, harga RMB, units, kos shipping → terus cipta batch.

**(C) Pelarasan manual**
`Inventory › Inventory History` → Movement **IN** → cipta batch + bagi sebab (dilog sebagai ADJUST_IN).

### 3. Stok KELUAR
- **Auto (utama):** setiap jualan (Cashier / Shopee / TikTok) tolak stok **FIFO** automatik.
- **Manual:** `Inventory History` → Movement **OUT** (tolak FIFO) — bagi sebab.
- **Write-off** (rosak/hilang/sample): ikut flow write-off; **nilai tinggi perlu PIN kelulusan**. Dilog penuh.

### 4. Semak & BETULKAN stok
- **Stock Take** (`Inventory › Stock Take`) — kira **penuh** ikut sesi. Untuk audit besar.
- **Cycle Count** (`Inventory › Cycle Count`) — kira **separa berputar**: jana 25 SKU (giliran / nilai tertinggi / rawak) → cipta sesi → kira → variance → adjust. Guna sistem Stock Take yang sama, tapi tak payah tutup kedai. Buat selalu (cth seminggu sekali) untuk ketepatan berterusan.

### 5. LOKASI (di mana barang)
- Tetapkan lokasi per SKU: medan `location_bin` (format Zone-Aisle-Rack-Tier-Bin, cth `Z1-A2-R3`). Edit guna butang lokasi pada produk.
- `Inventory › Locations & Bins` — directory semua bin: bil SKU + unit + nilai per bin. **Scan/taip kod bin atau SKU** → tengok apa dalam bin. **Cetak label barcode bin** (tampal kat rak). Senarai "SKU tiada lokasi" + butang Tetapkan.

### 6. TENGOK stok
- **Stock Levels** (`Inventory › Stock Levels`) — stok pelbagai keadaan per SKU: **On-hand** · **Reserved** (order online belum hantar) · **Tersedia jual** (=on-hand−reserved) · **Akan masuk** (PO pending). Yang **Tersedia ≤ 0 = risiko oversell**. Read-only + Eksport CSV.
- **FIFO Listing** — semua batch per SKU + kos + baki. Untuk faham COGS / nilai stok.
- **Inventory History** — ledger penuh semua IN/OUT/ADJUST (siapa, bila, sebab).

---

## PERATURAN PENTING / CAVEAT
1. **Stok = batch FIFO**, bukan medan tunggal. Kalau nak betulkan stok, guna Movement / Stock Take — jangan edit nombor terus.
2. **Receiving:** barang rosak ≠ stok jual. Isi qty Rosak betul-betul → masuk Returns log (bukti claim pembekal).
3. **Stock Levels "Reserved" & "lama tak beli"** tepat **~4 saat lepas login** (sistem muat sejarah jualan penuh di latar).
4. **Stock Levels "Rosak/Hold" belum disambung** — tunggu kita sahkan: adakah qty rosak patut tolak dari "tersedia jual"? Bagi pendapat.
5. **Adjust besar / write-off** ada audit + PIN. Jangan bypass.
6. Semua view baru (Stock Levels / Cycle Count / Locations & Bins / Receiving) **reuse data sedia ada — tiada table baru**, jadi selamat.

---

## RINGKAS: barang masuk → keluar
```
Cipta produk (katalog)  →  PO  →  Receiving (GRN: baik+rosak)  →  BATCH masuk stok
                                                                    │
                          Jualan / Movement OUT  ←  tolak FIFO  ←──┘
                                                                    │
              Cycle Count / Stock Take  →  betulkan variance  ──────┘
              Locations & Bins  →  tahu di mana barang
              Stock Levels  →  tahu berapa tersedia jual
```

Apa-apa tak clear, tanya je.
