import os

with open('index.html', 'r') as f:
    html = f.read()

index_modals = """
    <!-- 0.2 QUOTATION PREVIEW MODAL (WYSIWYG Editable) -->
    <style>
        .editable-field {
            transition: background 0.2s, box-shadow 0.2s;
            border-radius: 4px;
            cursor: pointer;
        }
        .editable-field:hover {
            background-color: #fff9c4;
            box-shadow: 0 0 0 2px #fbc02d;
            outline: none;
        }
        .editable-field:focus {
            background-color: #ffffff;
            box-shadow: 0 0 0 2px #2196f3;
            outline: none;
            cursor: text;
        }
        .editable-qty, .editable-price {
            text-align: right;
            display: inline-block;
            min-width: 40px;
        }
    </style>
    <div id="quoteModal" class="login-overlay" style="display:none; z-index:2000;">
        <div class="login-box quote-print-container" style="width:90%; max-width:800px; text-align:left; padding:30px; background:#fff; max-height:90vh; overflow-y:auto; position:relative;">
            <button class="no-print" onclick="document.getElementById('quoteModal').style.display='none'" style="position:absolute; top:15px; right:20px; border:none; background:none; font-size:24px; cursor:pointer; color:#888;">&times;</button>
            <button class="no-print btn-secondary" onclick="window.print()" style="position:absolute; top:15px; right:60px; font-size:12px; padding:5px 10px;">🖨️ Print PDF</button>
            
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="font-weight:900; letter-spacing:-1px; margin:0;" id="quoteTitleType" contenteditable="true" spellcheck="false" class="editable-field">SALES QUOTATION</h1>
                <p style="color:#555; font-size:12px;" contenteditable="true" spellcheck="false" class="editable-field">10Camp (UT0030589-H) <br> No. 1, Jalan Kemajuan, Cyberjaya</p>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; font-size:12px; border-bottom:1px solid #ccc; padding-bottom:15px;">
                <div><strong contenteditable="true" class="editable-field">Kepada:</strong><br><span id="quoteCustNameStr" contenteditable="true" spellcheck="false" class="editable-field">Sila isi nama pelanggan</span></div>
                <div style="text-align:right; white-space:pre-wrap;" id="quoteDateStr" contenteditable="true" spellcheck="false" class="editable-field">Date: 01/01/2026</div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px;" id="editableQuoteTable">
                <thead>
                    <tr style="border-bottom:2px solid #000; text-align:left;">
                        <th style="padding:8px 5px;" contenteditable="true" class="editable-field">Item</th>
                        <th style="padding:8px 5px; text-align:center;" contenteditable="true" class="editable-field">Qty</th>
                        <th style="padding:8px 5px; text-align:right;" contenteditable="true" class="editable-field">Unit (RM)</th>
                        <th style="padding:8px 5px; text-align:right;" contenteditable="true" class="editable-field">Total (RM)</th>
                    </tr>
                </thead>
                <tbody id="quoteItemsTableBody">
                    <!-- Items -->
                </tbody>
            </table>

            <div id="quoteRentalDetailsBlock" style="display:none; margin-bottom:20px; padding:10px; border:1px dashed #ccc; font-size:11px; background:#fafafa;">
                <strong contenteditable="true" class="editable-field">Maklumat Sewaan:</strong><br>
                Tarikh Mula: <span id="quotePreviewValStart" contenteditable="true" class="editable-field"></span> <br>
                Tarikh Pulang: <span id="quotePreviewValEnd" contenteditable="true" class="editable-field"></span> <br>
                Tempoh: <span id="quotePreviewValDuration" contenteditable="true" class="editable-field"></span> Hari <br>
                Deposit Cagaran: RM <span id="quotePreviewValDeposit" contenteditable="true" class="editable-field" oninput="calculateEditableTotal()"></span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; font-size:12px; margin-top:20px;">
                <div style="width:55%;">
                    <strong contenteditable="true" class="editable-field">Terma & Syarat:</strong>
                    <p id="quotePreviewTnc" style="white-space:pre-wrap; margin-top:5px; color:#555;" contenteditable="true" spellcheck="false" class="editable-field"></p>
                </div>
                <div style="width:40%; text-align:right; font-size:16px;">
                    <strong contenteditable="true" class="editable-field">Grand Total:</strong>
                    <br>
                    <span style="font-size:24px; font-weight:900; color:var(--primary);">RM <span id="quotePreviewGrandTotal" contenteditable="true" spellcheck="false" class="editable-field">0.00</span></span>
                    <button class="no-print" onclick="window.calculateEditableTotal()" style="display:block; margin-top:10px; margin-left:auto; font-size:10px; padding:5px; cursor:pointer;">Update Total ↑</button>
                </div>
            </div>
            
            <div style="margin-top:40px; text-align:center; font-size:10px; color:#888;" contenteditable="true" class="editable-field">Dokumen ini dijana oleh komputer. Tandatangan tidak diperlukan.</div>
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

# Check if modals are already in the file. If they are, we should just replace them.
import re
# We'll just carefully replace if quoteModal exists, or insert if it doesn't.
if 'id="quoteModal"' in html:
    # Just to be safe, we'll replace the block. But wait, we know it's NOT there because of grep.
    pass

if '<div id="posAppLayout"' in html:
    html = html.replace('<div id="posAppLayout"', index_modals + '\n<div id="posAppLayout"')

with open('index.html', 'w') as f:
    f.write(html)

print("Injected modals into index.html")
