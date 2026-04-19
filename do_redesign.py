import re
import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace quoteModal entire block
modal_regex = re.compile(r'<div id="quoteModal"(.*?)<!-- 0\.3 QUOTATION LOGS ARCHIVE MODAL -->', re.DOTALL)

new_modal_html = """<div id="quoteModal" class="login-overlay" style="display:none; z-index:2000;">
        <div class="login-box quote-print-container" style="width:90%; max-width:900px; text-align:left; padding:40px; background:#fff; max-height:90vh; overflow-y:auto; position:relative; font-family:'Inter', sans-serif;">
            <button class="no-print" onclick="document.getElementById('quoteModal').style.display='none'" style="position:absolute; top:15px; right:20px; border:none; background:none; font-size:24px; cursor:pointer; color:#888;">&times;</button>
            <button class="no-print btn-secondary" onclick="window.print()" style="position:absolute; top:15px; right:60px; font-size:12px; padding:5px 10px;">🖨️ Print PDF</button>

            <!-- Top Orange Line -->
            <div style="height: 4px; background-color: #E28833; width: 100%; margin-bottom: 30px;"></div>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px;">
                <!-- Left Company Details -->
                <div style="font-size: 10px; color: #555; line-height: 1.4;">
                    <strong style="color: #E28833; font-size: 13px;">10 CAMP ENTERPRISE</strong><br>
                    No. 9-G, Block H, Glomac Cyberjaya, Jalan GC 9<br>
                    63000, Cyberjaya, Selangor<br>
                    admin@10camp.com<br>
                    +60 11-3310 9547
                </div>
                <!-- Right Logo -->
                <div style="text-align:right;">
                    <!-- Placeholder for the actual logo image. We'll use text styled similarly if no logo is available, but the user expects the Todak logo. -->
                    <img src="https://i.ibb.co/L5Q41R0/Logo-10camp-todak-baru-1.png" alt="10Camp Logo" style="height:70px; object-fit:contain;">
                </div>
            </div>

            <div style="margin-bottom:30px;">
                <h1 style="color: #E28833; font-weight:900; margin:0; font-size: 32px;" id="quoteHeaderTitle" contenteditable="true" class="editable-field">Quote</h1>
                <p style="color:#555; font-size:11px; margin:0; font-weight:600;" contenteditable="true" class="editable-field">Submitted on <span id="quoteHeaderSubmitDate">31/07/2025</span></p>
            </div>

            <!-- Meta Grid -->
            <div style="display:grid; grid-template-columns: 2fr 1.5fr 1fr; gap:20px; font-size:11px; color:#333; margin-bottom:30px; font-weight:600;">
                <div>
                    <span style="color:#000; font-weight:800; display:block; margin-bottom:3px;">Quote for</span>
                    <span id="quoteValCustName" contenteditable="true" class="editable-field" style="color:#555; font-weight:normal;">Sila Isi Maklumat Pelanggan</span>
                </div>
                <div>
                    <span style="color:#000; font-weight:800; display:block; margin-bottom:3px;">Payable to</span>
                    <span contenteditable="true" class="editable-field" style="color:#555; font-weight:normal;">10 Camp Enterprise</span><br><br>
                    <span style="color:#000; font-weight:800; display:block; margin-bottom:3px;">Project</span>
                    <span id="quoteValProjectName" contenteditable="true" class="editable-field" style="color:#555; font-weight:normal;">Nama Keterangan Projek</span>
                </div>
                <div>
                    <span style="color:#000; font-weight:800; display:block; margin-bottom:3px;">Quote #</span>
                    <span id="quoteValQuoteId" contenteditable="true" class="editable-field" style="color:#555; font-weight:normal;">-</span><br><br>
                    <span style="color:#000; font-weight:800; display:block; margin-bottom:3px;">Date</span>
                    <span id="quoteValCurrentDate" contenteditable="true" class="editable-field" style="color:#555; font-weight:normal;">-</span>
                </div>
            </div>

            <!-- Table -->
            <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #000; color: #E28833; font-weight:800;">
                        <th style="padding:10px 10px; text-align:left; border:none;" contenteditable="true" class="editable-field">Description</th>
                        <th style="padding:10px 10px; text-align:center; border:none;" contenteditable="true" class="editable-field">Qty</th>
                        <th style="padding:10px 10px; text-align:right; border:none;" contenteditable="true" class="editable-field">Unit price (RM)</th>
                        <th style="padding:10px 10px; text-align:right; border:none;" contenteditable="true" class="editable-field">Total price (RM)</th>
                    </tr>
                </thead>
                <tbody id="quoteItemsTableBody">
                    <!-- Dynamic Rows -->
                </tbody>
            </table>

            <!-- Footer Summary and Notes -->
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#555; padding-top:10px;">
                <!-- Left Notes -->
                <div style="width:50%;">
                    <span style="color:#000; font-weight:800; display:block; margin-bottom:5px;">Notes:</span>
                    <div id="quotePreviewTnc" contenteditable="true" class="editable-field" style="line-height:1.4; margin-bottom:15px; white-space:pre-wrap;">Terms and conditions text here.</div>
                    
                    <span style="color:#000; font-weight:800; display:block; margin-bottom:5px;">Payment Details:</span>
                    <div contenteditable="true" class="editable-field" style="line-height:1.4;">
                        Bank: Maybank<br>
                        Account Number: 568603082318<br>
                        Account Name: 10 Camp Enterprise
                    </div>
                </div>
                
                <!-- Right Totals -->
                <div style="width:40%; display:flex; flex-direction:column; gap:10px; align-items:flex-end; font-weight:800;">
                    <div style="display:flex; width:200px; justify-content:space-between; color:#E28833;">
                        <span contenteditable="true" class="editable-field">Subtotal</span>
                        <span>RM <span id="quoteValSubtotal" contenteditable="true" class="editable-field" oninput="calculateEditableTotal()">0.00</span></span>
                    </div>
                    
                    <!-- Rental Deposit Row -->
                    <div id="quoteDepositRowUI" style="display:none; width:200px; justify-content:space-between; color:#E28833;">
                        <span contenteditable="true" class="editable-field">Deposit</span>
                        <span>RM <span id="quotePreviewValDeposit" contenteditable="true" class="editable-field" oninput="calculateEditableTotal()">0.00</span></span>
                    </div>

                    <div style="display:flex; width:200px; justify-content:space-between; color:#E28833;">
                        <span contenteditable="true" class="editable-field">Discount</span>
                        <span>RM <span id="quoteValDiscount" contenteditable="true" class="editable-field" oninput="calculateEditableTotal()">0.00</span></span>
                    </div>
                    <div style="display:flex; width:200px; justify-content:space-between; color:#000;">
                        <span contenteditable="true" class="editable-field">Total</span>
                        <span>RM <span id="quotePreviewGrandTotal" contenteditable="true" class="editable-field">0.00</span></span>
                    </div>
                    
                    <button class="no-print" onclick="window.calculateEditableTotal()" style="padding:4px 8px; font-size:10px; background:#f0f0f0; border:1px solid #ccc; cursor:pointer;">Update Calcs ↑</button>
                    
                    <!-- Include hidden original inputs for backend save compatibility -->
                    <span id="quoteSubtotal" style="display:none;"></span>
                    <span id="quoteGrandTotal" style="display:none;"></span>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 0.3 QUOTATION LOGS ARCHIVE MODAL -->"""

html = modal_regex.sub(new_modal_html, html)
html = html.replace("v=31", "v=32")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html template updated.")

# Next, update app.js to match logic
with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# I will replace saveAndPreviewQuotationParams and calculateEditableTotal entire bodies if possible.
# Actually, it's safer to just do string replacements for the specific ID targets since they are few.

# 1. quoteDateStr -> quoteValCurrentDate (and submit date)
app_js = app_js.replace('document.getElementById("quoteDateStr").innerText = "Date: " + new Date().toLocaleDateString(\'ms-MY\') + "\\nID: " + qId;',
                        'document.getElementById("quoteHeaderSubmitDate").innerText = new Date().toLocaleDateString(\'en-GB\');\n    document.getElementById("quoteValCurrentDate").innerText = new Date().toLocaleDateString(\'en-GB\');\n    document.getElementById("quoteValQuoteId").innerText = qId;')

# 2. quoteCustName / quoteCustContact -> quoteValCustName
app_js = app_js.replace('document.getElementById("quoteCustName").innerText = parts[0] ? parts[0].trim() : "-";\n    document.getElementById("quoteCustContact").innerText = parts.length > 1 ? parts[1].trim() : "-";',
                        'document.getElementById("quoteValCustName").innerText = custDetail;')

# 3. quoteHeaderTitle instead of quoteTitleType
app_js = app_js.replace('document.getElementById("quoteTitleType").innerText = docTitle;', 'document.getElementById("quoteHeaderTitle").innerText = docTitle;')

# 4. Project Name implementation. We don't have project input in the invoice layout yet, so it defaults to rental description or empty.
app_js = app_js.replace('const type = docType;', 'const type = docType;\n    document.getElementById("quoteValProjectName").innerText = "Sila taip acara/projek";')

# 5. Fix rentalContainer error Since its ID was removed. It was `quoteRentalDatesContainer`. We do NOT need it because we have a cleaner format, but wait we need to avoid JS crash.
app_js = app_js.replace('const rentalContainer = document.getElementById("quoteRentalDatesContainer");\n    let depositBlock = document.getElementById("quoteDepositRow");',
                        '// Rental UI now just uses the deposit row\n    let depositBlock = document.getElementById("quoteDepositRowUI");')

app_js = app_js.replace('rentalContainer.innerHTML = `\n            <strong>Rental Period:</strong><br>\n            ${sStr ? new Date(sStr).toLocaleDateString(\'en-GB\') : \'TBD\'} to ${eStr ? new Date(eStr).toLocaleDateString(\'en-GB\') : \'TBD\'}<br>\n            Duration: ${dur} Day(s)\n        `;',
                        '// Rental meta added to project name\n        document.getElementById("quoteValProjectName").innerText = `Rental: ${sStr||"TBD"} - ${eStr||"TBD"} (${dur} Hari)`;')
app_js = app_js.replace('rentalContainer.innerHTML = "";', '// no rental container anymore')

app_js = app_js.replace('document.getElementById("quoteDepositAmount").innerText = "RM " + deposit.toFixed(2);', 'document.getElementById("quotePreviewValDeposit").innerText = deposit.toFixed(2);')


# 6. Table row style and calculating
new_row_loop = """
    subtotal = 0;
    let rowCount = 0;
    workingCart.forEach((item, index) => {
        let line = item.price * item.qty;
        subtotal += line;
        let bg = rowCount % 2 === 0 ? "#F8F8F8" : "#FFFFFF";
        tbody.innerHTML += `
            <tr class="editable-row" style="background-color: ${bg}; border-bottom:1px solid #f1f1f1;">
                <td style="padding:8px 10px; color:#555;">
                    <div style="font-style:italic; font-weight:bold; color:#000;" contenteditable="true" spellcheck="false" class="editable-field editable-name">${item.name}</div>
                </td>
                <td style="text-align:center; padding:8px 10px; color:#555;">
                    <span contenteditable="true" class="editable-field editable-qty" oninput="window.calculateEditableTotal()">${item.qty}</span>
                </td>
                <td style="text-align:right; padding:8px 10px; color:#555;">
                    <span contenteditable="true" class="editable-field editable-price" oninput="window.calculateEditableTotal()">RM ${item.price.toFixed(2)}</span>
                </td>
                <td style="text-align:right; padding:8px 10px; color:#555; font-weight:bold;">
                    RM <span class="row-total">${line.toFixed(2)}</span>
                </td>
            </tr>
        `;
        rowCount++;
    });
"""
# Need to replace the whole `workingCart.forEach` block carefully
import re
app_js = re.sub(r'subtotal = 0;\s*workingCart\.forEach\(\(item, index\).*?</tr>\s*`;\s*}\);', new_row_loop.strip(), app_js, flags=re.DOTALL)

# Update subtotal target element
app_js = app_js.replace('document.getElementById("quoteSubtotal").innerText = "RM " + subtotal.toFixed(2);',
                        'document.getElementById("quoteSubtotal").innerText = "RM " + subtotal.toFixed(2);\n    document.getElementById("quoteValSubtotal").innerText = subtotal.toFixed(2);')


# Let's fix calculateEditableTotal to strip RM
calc_func_new = """
window.calculateEditableTotal = function() {
    let subtotal = 0;
    const rows = document.querySelectorAll('#quoteItemsTableBody tr');
    
    rows.forEach(row => {
        let qtyEl = row.querySelector('.editable-qty');
        let priceEl = row.querySelector('.editable-price');
        let rowTotalEl = row.querySelector('.row-total');
        
        if(qtyEl && priceEl && rowTotalEl) {
            let q = parseFloat(qtyEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
            let p = parseFloat(priceEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
            let lineTotal = q * p;
            subtotal += lineTotal;
            rowTotalEl.innerText = lineTotal.toFixed(2);
        }
    });

    let depositEl = document.getElementById("quotePreviewValDeposit");
    let deposit = 0;
    if(depositEl) deposit = parseFloat(depositEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
    
    let discountEl = document.getElementById("quoteValDiscount");
    let discount = 0;
    if(discountEl) discount = parseFloat(discountEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
    
    let grandTotal = subtotal + deposit - discount;
    let gtEl = document.getElementById("quotePreviewGrandTotal");
    if(gtEl) gtEl.innerText = grandTotal.toFixed(2);
    
    let subEl2 = document.getElementById("quoteValSubtotal");
    if(subEl2) subEl2.innerText = subtotal.toFixed(2);
    
    // Hidden inputs update
    let subEl = document.getElementById("quoteSubtotal");
    if(subEl) subEl.innerText = subtotal.toFixed(2);
    let gtEl2 = document.getElementById("quoteGrandTotal");
    if(gtEl2) gtEl2.innerText = grandTotal.toFixed(2);
};
"""
app_js = re.sub(r'window\.calculateEditableTotal = function\(\) \{.*?\n\};\n?', calc_func_new, app_js, flags=re.DOTALL)


with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("Updated app.js")
