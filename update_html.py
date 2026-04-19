import re

with open('index.html', 'r') as f:
    html = f.read()

index_modals = """
    <!-- 0.2 QUOTATION PREVIEW MODAL -->
    <div id="quoteModal" class="login-overlay" style="display:none; z-index:2000;">
        <div class="login-box quote-print-container" style="width:90%; max-width:800px; text-align:left; padding:30px; background:#fff; max-height:90vh; overflow-y:auto; position:relative;">
            <button class="no-print" onclick="document.getElementById('quoteModal').style.display='none'" style="position:absolute; top:15px; right:20px; border:none; background:none; font-size:24px; cursor:pointer; color:#888;">&times;</button>
            <button class="no-print btn-secondary" onclick="window.print()" style="position:absolute; top:15px; right:60px; font-size:12px; padding:5px 10px;">🖨️ Print PDF</button>
            
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="font-weight:900; letter-spacing:-1px; margin:0;" id="quoteTitleType">SALES QUOTATION</h1>
                <p style="color:#555; font-size:12px;">10Camp (UT0030589-H) <br> No. 1, Jalan Kemajuan, Cyberjaya</p>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; font-size:12px; border-bottom:1px solid #ccc; padding-bottom:15px;">
                <div><strong>Kepada:</strong><br><span id="quoteCustNameStr">Sila isi nama pelanggan</span></div>
                <div style="text-align:right; white-space:pre-wrap;" id="quoteDateStr">Date: 01/01/2026</div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px;">
                <thead>
                    <tr style="border-bottom:2px solid #000; text-align:left;">
                        <th style="padding:8px 5px;">Item</th>
                        <th style="padding:8px 5px; text-align:center;">Qty</th>
                        <th style="padding:8px 5px; text-align:right;">Unit (RM)</th>
                        <th style="padding:8px 5px; text-align:right;">Total (RM)</th>
                    </tr>
                </thead>
                <tbody id="quotePreviewTableBody">
                    <!-- Items -->
                </tbody>
            </table>

            <div id="quoteRentalDetailsBlock" style="display:none; margin-bottom:20px; padding:10px; border:1px dashed #ccc; font-size:11px; background:#fafafa;">
                <strong>Maklumat Sewaan:</strong><br>
                Tarikh Mula: <span id="quotePreviewValStart"></span> <br>
                Tarikh Pulang: <span id="quotePreviewValEnd"></span> <br>
                Tempoh: <span id="quotePreviewValDuration"></span> Hari <br>
                Deposit Cagaran: RM <span id="quotePreviewValDeposit"></span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; font-size:12px; margin-top:20px;">
                <div style="width:55%;">
                    <strong>Terma & Syarat:</strong>
                    <p id="quotePreviewTnc" style="white-space:pre-wrap; margin-top:5px; color:#555;"></p>
                </div>
                <div style="width:40%; text-align:right; font-size:16px;">
                    <strong>Grand Total:</strong>
                    <br>
                    <span style="font-size:24px; font-weight:900; color:var(--primary);">RM <span id="quotePreviewGrandTotal">0.00</span></span>
                </div>
            </div>
            
            <div style="margin-top:40px; text-align:center; font-size:10px; color:#888;">Dokumen ini dijana oleh komputer. Tandatangan tidak diperlukan.</div>
        </div>
    </div>

    <!-- 0.3 QUOTATION LOGS ARCHIVE MODAL -->
    <div id="quoteLogsModal" class="login-overlay no-print" style="display:none; z-index:2500;">
        <div class="login-box" style="width:90%; max-width:800px; text-align:left; padding:30px; background:#fff; max-height:80vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="font-weight:900; letter-spacing:-1px; margin:0;">Quotation & Rental Logs</h2>
                <button onclick="document.getElementById('quoteLogsModal').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer; color:var(--text-muted);">&times;</button>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <input type="text" id="quoteLogSearch" placeholder="Cari Ref No atau Nama..." class="login-input" style="flex:1; margin:0;" onkeyup="window.renderQuoteLogs(this.value)">
            </div>
            <table class="inventory-table" style="font-size:12px;">
                <thead>
                    <tr>
                        <th>Ref & Versi</th>
                        <th>Kategori</th>
                        <th>Pelanggan</th>
                        <th>Status</th>
                        <th>Jumlah (RM)</th>
                        <th>Tindakan / Print</th>
                    </tr>
                </thead>
                <tbody id="quoteLogsTableBody">
                    <tr><td colspan="6" style="text-align:center;">Memuatkan data dari awan...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- 0.4 PRODUCT PICKER MODAL -->
    <div id="quoteSearchModal" class="login-overlay" style="display:none; z-index:3000;">
        <div class="login-box" style="width:90%; max-width:700px; text-align:left; padding:30px; background:#fff; max-height:80vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="font-weight:900; letter-spacing:-1px; margin:0;">Select Items to Quote</h2>
                <button onclick="document.getElementById('quoteSearchModal').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer; color:var(--text-muted);">&times;</button>
            </div>
            <input type="text" id="quoteSearchInput" placeholder="Scan or Search SKU / Nama Produk..." autofocus style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px; font-size:14px; background:#fafafa; outline:none;" onkeyup="renderQuotePOS(this.value)">
            <div id="quoteProductsList" class="products-grid" style="grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));">
                <i>Sila cari produk di atas...</i>
            </div>
        </div>
    </div>
"""

if "<!-- 0.2 QUOTATION PREVIEW MODAL -->" not in html:
    html = html.replace('<div class="pos-app-layout">', index_modals + '\n<div class="pos-app-layout">')

invoice_regex = re.compile(r'<!-- SECTION: INVOICE / QUOTATION.*?</button>\s*</div>\s*</div>\s*</div>', re.DOTALL)
replacement_invoice = """<!-- SECTION: INVOICE / QUOTATION (SALES PAGE 3)    -->
        <!-- ============================================== -->
        <div id="invoiceSection" class="tab-section" style="display: none; background:#f4f4f4; padding:20px;">
            <div style="max-width:900px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding:30px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div>
                        <h1 style="font-size:20px; font-weight:800; display:flex; align-items:center; gap:8px;">📝 Create Invoice / Quotation</h1>
                        <p style="font-size:12px; color:#777; margin-top:5px;">Bina sebut harga rasmi atau Invois B2B secara manual.</p>
                    </div>
                    <button onclick="window.renderQuoteLogs()" class="btn-dark" style="background:#f0f0f0; color:#333; border:none; padding:8px 15px; border-radius:8px; font-weight:bold; font-size:11px; cursor:pointer;">📜 Lihat Logs</button>
                </div>
                
                <div id="quoteEditIndicator" style="display:none; background:#FEF3C7; border:1px dashed #F59E0B; padding:8px 10px; border-radius:8px; margin-bottom:20px; font-size:12px; font-weight:bold; color:#B45309; align-items:center; justify-content:space-between;">
                    <span>Editing Mode: <span id="quoteEditRefLabel"></span></span>
                    <button onclick="window.clearQuoteCart()" style="background:none; border:1px solid #B45309; padding:4px 8px; border-radius:6px; color:#B45309; cursor:pointer; font-size:10px;">Batal</button>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
                    <div>
                        <label class="small-lbl" style="font-size:10px; color:#888;">NAMA SYARIKAT / PELANGGAN</label>
                        <input type="text" id="quoteCustDetail" placeholder="Contoh: Majlis Bandaraya... - 012345" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:13px; background:#fff; margin:0;">
                    </div>
                    <div>
                        <div style="display:flex; gap:10px;">
                            <div style="flex:1;">
                                <label class="small-lbl" style="font-size:10px; color:#888;">TARIKH MULA SEWA</label>
                                <input type="date" id="quoteStartDate" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:13px; background:#fff; margin:0;" onchange="calculateRentalDays()">
                            </div>
                            <div style="flex:1;">
                                <label class="small-lbl" style="font-size:10px; color:#888;">TARIKH PULANG</label>
                                <input type="date" id="quoteEndDate" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:13px; background:#fff; margin:0;" onchange="calculateRentalDays()">
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:25px;">
                    <div>
                        <label class="small-lbl" style="font-size:10px; color:#888;">DEPOSIT (RM)</label>
                        <input type="number" id="quoteDeposit" placeholder="50.00" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:13px; background:#fff; margin:0;">
                    </div>
                    <div>
                        <label class="small-lbl" style="font-size:10px; color:#888;">TEMPOH SEWA (HARI) - AUTO</label>
                        <input type="number" id="quoteDuration" value="1" disabled style="width:100%; padding:12px; border:1px solid #eee; border-radius:8px; outline:none; font-size:13px; background:#fafafa; color:#888; margin:0;">
                    </div>
                </div>

                <div style="border:1px dashed #ccc; border-radius:12px; padding:30px; text-align:center; background:#fff; margin-bottom:20px; position:relative;">
                    <div id="quoteEmptyState" style="margin-bottom:20px;">
                        <div style="font-size:28px; color:#bbb; margin-bottom:10px;">📄</div>
                        <h3 style="font-size:16px; font-weight:700; color:#333; margin-bottom:5px;">Select Items to Quote</h3>
                        <p style="font-size:12px; color:#888;">Cari produk dari inventori dan masukkan ke senarai quotation.</p>
                    </div>

                    <button onclick="document.getElementById('quoteSearchModal').style.display='flex'; renderQuotePOS('');" style="background:#D98A52; color:white; border:none; padding:12px 25px; border-radius:50px; font-weight:bold; font-size:12px; cursor:pointer;">+ TAMBAH BARANG</button>

                    <div id="quoteCartItems" style="text-align:left; margin-top:25px; max-height:250px; overflow-y:auto; padding:0 10px;">
                        <!-- Cart Items dynamically populate here -->
                    </div>
                    
                    <div style="margin-top:20px; text-align:right; font-weight:900; font-size:18px; border-top:1px dashed #ddd; padding-top:15px; color:#333;">
                        Subtotal: RM <span id="quoteTotalPrice">0.00</span>
                    </div>
                </div>
                
                <input type="hidden" id="quoteType" value="Sales">
                <textarea id="quoteTerms" style="display:none;"></textarea>

                <div style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
                    <button onclick="saveAndPreviewQuotationParams('Sales', 'QUOTATION')" style="background:#fff; color:#333; border:1px solid #ccc; padding:12px 20px; border-radius:50px; font-weight:bold; font-size:11px; cursor:pointer;">JANA PDF QUOTATION</button>
                    <button onclick="saveAndPreviewQuotationParams('Rental', 'RENTAL QUO.')" style="background:#fff; color:#D98A52; border:1px solid #D98A52; padding:12px 20px; border-radius:50px; font-weight:bold; font-size:11px; cursor:pointer;">JANA PDF QUO. SEWA</button>
                    <button onclick="saveAndPreviewQuotationParams('Sales', 'INVOICE')" style="background:#D98A52; color:white; border:none; padding:12px 20px; border-radius:50px; font-weight:bold; font-size:11px; cursor:pointer;">JANA PDF INVOICE</button>
                    <button onclick="saveAndPreviewQuotationParams('Rental', 'RENTAL INVOICE')" style="background:#b36b3b; color:white; border:none; padding:12px 20px; border-radius:50px; font-weight:bold; font-size:11px; cursor:pointer;">JANA PDF INV. SEWA</button>
                </div>
            </div>
        </div>"""

html = invoice_regex.sub(replacement_invoice, html)
html = html.replace("v=17", "v=31")

with open('index.html', 'w') as f:
    f.write(html)

print("Injected index.html")
