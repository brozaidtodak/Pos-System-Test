import re

# 1. index.html - Inject Pricing Calculator Modal
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

modal_html = """
<!-- PRICING CALCULATOR MODAL -->
<div id="pricingCalcModal" class="login-overlay" style="display:none; z-index:99999;">
    <div class="login-box" style="max-width:500px; text-align:left; padding:30px; border-top:6px solid #10B981;">
        <button onclick="document.getElementById('pricingCalcModal').style.display='none'" style="float:right; border:none; background:none; font-size:24px; cursor:pointer; color:var(--text-muted);">&times;</button>
        <h2 style="font-weight:800; font-size:20px; margin-bottom:5px;">🧮 Kalkulator Harga</h2>
        <p style="font-size:12px; color:#666; margin-bottom:20px;" id="calcSkuTitle">SKU: ---</p>

        <input type="hidden" id="calcSku">

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
            <div><label class="small-lbl">Kos Awal (RM)</label><input type="number" id="calcBaseCost" class="login-input" step="0.01" oninput="window.calcPricing()"></div>
            <div><label class="small-lbl">+ Kos Shipping (RM)</label><input type="number" id="calcShipping" class="login-input" step="0.01" oninput="window.calcPricing()"></div>
            <div><label class="small-lbl">+ Upah Buruh (RM)</label><input type="number" id="calcLabor" class="login-input" step="0.01" oninput="window.calcPricing()"></div>
            <div></div>
            <div style="grid-column: 1 / -1; border-top:1px dashed #ccc; padding-top:10px;">
                <label class="small-lbl" style="color:#2563EB;">= Modal Keseluruhan (RM)</label>
                <input type="number" id="calcTotalCost" class="login-input" readonly style="background:#EFF6FF; font-weight:bold; color:#1E3A8A;">
            </div>
            
            <div><label class="small-lbl">Margin Untung (%)</label><input type="number" id="calcMarginPct" class="login-input" oninput="window.calcPricing()"></div>
            <div><label class="small-lbl">Komisen Staf (%)</label><input type="number" id="calcCommPct" class="login-input" oninput="window.calcPricing()"></div>
        </div>

        <div style="background:#F0FDF4; border:1px solid #BBF7D0; padding:15px; border-radius:8px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:13px; color:#166534;">
                <span>Untung Bersih Syarikat:</span>
                <span style="font-weight:bold;">RM <span id="calcProfitAmount">0.00</span></span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px; color:#166534;">
                <span>Bahagian Komisen Staf:</span>
                <span style="font-weight:bold;">RM <span id="calcCommAmount">0.00</span></span>
            </div>
            <hr style="border:0; border-top:1px solid #BBF7D0; margin:10px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; color:#14532D;">
                <span style="font-weight:bold; font-size:16px;">Harga Jualan Sasaran:</span>
                <span style="font-weight:900; font-size:24px;">RM <span id="calcFinalPrice">0.00</span></span>
            </div>
        </div>

        <button onclick="window.applyCalculatedPrice()" class="btn-success" style="width:100%; padding:15px; font-size:16px;">Sahkan & Simpan Data</button>
    </div>
</div>
"""

insert_marker = "<!-- 0.1 E-RECEIPT POPUP -->"
if insert_marker in html:
    html = html.replace(insert_marker, modal_html + "\n    " + insert_marker)
else:
    html = html.replace("</body>", modal_html + "\n</body>")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. app.js - Add the Calculator JS
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

calc_js = """
// ===================================
// PRICING CALCULATOR LOGIC
// ===================================

window.openPricingCalc = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    if(!p) return;

    document.getElementById('calcSku').value = sku;
    document.getElementById('calcSkuTitle').innerText = `SKU: ${sku} | ${p.name}`;
    
    // Parse existing Metafields for calculator memory
    let m = {};
    try {
        if(p.metafields) m = typeof p.metafields === 'string' ? JSON.parse(p.metafields) : p.metafields;
    } catch(e) {}

    document.getElementById('calcBaseCost').value = p.cost_price || 0;
    document.getElementById('calcShipping').value = parseFloat(m['_calc_shipping']) || 0;
    document.getElementById('calcLabor').value = parseFloat(m['_calc_labor']) || 0;
    document.getElementById('calcMarginPct').value = parseFloat(m['_calc_margin_pct']) || 20; // default 20%
    document.getElementById('calcCommPct').value = parseFloat(m['_calc_comm_pct']) || 5; // default 5%

    window.calcPricing();
    document.getElementById('pricingCalcModal').style.display = 'flex';
};

window.calcPricing = function() {
    let base = parseFloat(document.getElementById('calcBaseCost').value) || 0;
    let ship = parseFloat(document.getElementById('calcShipping').value) || 0;
    let labor = parseFloat(document.getElementById('calcLabor').value) || 0;
    let marginPct = parseFloat(document.getElementById('calcMarginPct').value) || 0;
    let commPct = parseFloat(document.getElementById('calcCommPct').value) || 0;

    let totalCost = base + ship + labor;
    document.getElementById('calcTotalCost').value = totalCost.toFixed(2);

    let profit = totalCost * (marginPct / 100);
    let grossPrice = totalCost + profit;
    
    // finalPrice = grossPrice / (1 - commPct)
    let finalPrice = 0;
    if(commPct >= 100) finalPrice = grossPrice; // avoid division by zero/negative
    else finalPrice = grossPrice / (1 - (commPct / 100));

    let commAmount = finalPrice * (commPct / 100);

    document.getElementById('calcProfitAmount').innerText = profit.toFixed(2);
    document.getElementById('calcCommAmount').innerText = commAmount.toFixed(2);
    document.getElementById('calcFinalPrice').innerText = finalPrice.toFixed(2);
};

window.applyCalculatedPrice = async function() {
    const sku = document.getElementById('calcSku').value;
    const p = masterProducts.find(x => x.sku === sku);
    if(!p) return;

    let finalPrice = parseFloat(document.getElementById('calcFinalPrice').innerText);
    let baseCost = parseFloat(document.getElementById('calcBaseCost').value) || 0;
    let ship = parseFloat(document.getElementById('calcShipping').value) || 0;
    let labor = parseFloat(document.getElementById('calcLabor').value) || 0;
    let marginPct = parseFloat(document.getElementById('calcMarginPct').value) || 0;
    let commPct = parseFloat(document.getElementById('calcCommPct').value) || 0;

    let m = {};
    try {
        if(p.metafields) m = typeof p.metafields === 'string' ? JSON.parse(p.metafields) : p.metafields;
    } catch(e) {}

    // Save calculation config to metafields
    m['_calc_shipping'] = ship;
    m['_calc_labor'] = labor;
    m['_calc_margin_pct'] = marginPct;
    m['_calc_comm_pct'] = commPct;

    const payload = {
        cost_price: baseCost,
        price: finalPrice,
        metafields: JSON.stringify(m)
    };

    try {
        const { error } = await db.from('products_master').update(payload).eq('sku', sku);
        if(error) throw error;
        
        alert("Harga Jualan & Data Kalkulator berjaya disimpan!");
        document.getElementById('pricingCalcModal').style.display = 'none';
        await window.initApp(); // reload everything to update UI
    } catch(e) {
        alert("Ralat semasa menyimpan: " + e.message);
    }
};
"""

js += calc_js

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
