import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove old inbound form
old_inbound_marker = '<!-- FORM 3: INBOUND -->'
end_inbound_marker = '</button>\n            </div>'
start_idx = html.find(old_inbound_marker)
if start_idx != -1:
    end_idx = html.find(end_inbound_marker, start_idx) + len(end_inbound_marker)
    html = html[:start_idx] + html[end_idx:]

# Insert new Stock Movements Block
new_stock_movements = """
                <!-- STOCK MOVEMENTS (INBOUND & OUTBOUND) -->
                <div class="admin-card" style="border-top:4px solid var(--primary); padding:20px; margin-bottom:20px;">
                    <h3 style="margin-bottom:15px;">📦 Pergerakan Inventori (Inbound & Outbound)</h3>
                    <p style="font-size:12px; color:#888; margin-bottom:20px;">Merekod secara rasmi setiap unit fizikal yang masuk (dari pembekal) atau keluar (kegunaan stor/rosak).</p>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <!-- Inbound Section -->
                        <div style="background:#f0fdf4; padding:15px; border-radius:8px; border:1px solid #bbf7d0;">
                            <h4 style="color:#166534; margin-bottom:10px;">🟢 Terima Stok Baru (Inbound)</h4>
                            <label class="small-lbl">Cari SKU Produk</label>
                            <input type="text" id="inboundSkuSearch" class="login-input" placeholder="Taip SKU..." list="movementSkuList">
                            <label class="small-lbl">Kuantiti Diterima</label>
                            <input type="number" id="inboundQty" class="login-input" placeholder="0" min="1">
                            <label class="small-lbl">Rujukan PO / Nota (Pilihan)</label>
                            <input type="text" id="inboundRef" class="login-input" placeholder="PO-10023">
                            <button class="btn-success" style="width:100%; margin-top:10px;" onclick="window.processInbound()">Terima & Tambah Stok</button>
                        </div>
                        
                        <!-- Outbound Section -->
                        <div style="background:#fef2f2; padding:15px; border-radius:8px; border:1px solid #fecaca;">
                            <h4 style="color:#991b1b; margin-bottom:10px;">🔴 Keluarkan Stok (Outbound)</h4>
                            <label class="small-lbl">Cari SKU Produk</label>
                            <input type="text" id="outboundSkuSearch" class="login-input" placeholder="Taip SKU..." list="movementSkuList">
                            <label class="small-lbl">Kuantiti Dikeluarkan</label>
                            <input type="number" id="outboundQty" class="login-input" placeholder="0" min="1">
                            <label class="small-lbl">Sebab / Catatan</label>
                            <select id="outboundReason" class="login-input">
                                <option value="Transfer ke Cawangan">Transfer ke Cawangan Lain</option>
                                <option value="Kerosakan / Pecah">Kerosakan / Pecah (Write-off)</option>
                                <option value="Kegunaan Marketing">Kegunaan Marketing / Shooting</option>
                                <option value="Lain-lain">Lain-lain (Sila catat)</option>
                            </select>
                            <input type="text" id="outboundNote" class="login-input" placeholder="Catatan tambahan (pilihan)..." style="margin-top:-10px;">
                            <button class="btn-primary" style="background:#EF4444; border:none; width:100%; margin-top:10px;" onclick="window.processOutbound()">Tolak Stok Fizikal</button>
                        </div>
                    </div>
                    <datalist id="movementSkuList"></datalist>
                </div>
"""

insert_marker = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">\n                    <!-- Discrepancy Log -->'
if insert_marker in html:
    html = html.replace(insert_marker, new_stock_movements + '\n                ' + insert_marker)
    print("Injected Stock Movements into HTML")
else:
    print("Could not find insert marker for Stock Movements")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add logic for Inbound and Outbound
js_additions = """
window.populateMovementSkuList = function() {
    const list = document.getElementById('movementSkuList');
    if(!list) return;
    list.innerHTML = masterProducts.map(p => `<option value="${p.sku}">${p.name}</option>`).join('');
};

window.processInbound = async function() {
    const sku = document.getElementById('inboundSkuSearch').value.trim();
    const qty = parseInt(document.getElementById('inboundQty').value) || 0;
    const ref = document.getElementById('inboundRef').value.trim();
    
    if(!sku || qty <= 0) return alert("Sila isikan SKU dan kuantiti sah untuk Inbound.");
    
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return alert("SKU tidak wujud di dalam sistem utama.");
    
    try {
        const batchPayload = {
            sku: sku,
            qty_received: qty,
            qty_remaining: qty,
            inbound_date: new Date().toISOString().split('T')[0]
        };
        
        let { error } = await db.from('inventory_batches').insert([batchPayload]);
        if(error) throw error;
        
        // Let realtime handle UI update, or reload
        alert(`Berjaya merekod Inbound sebanyak ${qty} unit untuk ${sku}.`);
        document.getElementById('inboundSkuSearch').value = '';
        document.getElementById('inboundQty').value = '';
        document.getElementById('inboundRef').value = '';
        
        await window.initApp(); // reload data
    } catch(e) {
        alert("Ralat Inbound: " + e.message);
    }
};

window.processOutbound = async function() {
    const sku = document.getElementById('outboundSkuSearch').value.trim();
    const qty = parseInt(document.getElementById('outboundQty').value) || 0;
    const reason = document.getElementById('outboundReason').value;
    const note = document.getElementById('outboundNote').value.trim();
    
    if(!sku || qty <= 0) return alert("Sila isikan SKU dan kuantiti sah untuk Outbound.");
    
    // Simple logic: we need to deduct from the oldest inventory batches
    let remainingToDeduct = qty;
    let relevantBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).sort((a,b) => new Date(a.inbound_date) - new Date(b.inbound_date));
    
    let totalStock = relevantBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
    if(totalStock < qty) {
        return alert(`Kuantiti dalam sistem tidak mencukupi. Baki sistem: ${totalStock}`);
    }
    
    try {
        for(let batch of relevantBatches) {
            if(remainingToDeduct <= 0) break;
            let deductAmount = Math.min(batch.qty_remaining, remainingToDeduct);
            
            let { error } = await db.from('inventory_batches').update({ qty_remaining: batch.qty_remaining - deductAmount }).eq('id', batch.id);
            if(error) throw error;
            
            remainingToDeduct -= deductAmount;
        }
        
        alert(`Berjaya memotong ${qty} unit stok untuk ${sku}. Sebab: ${reason}`);
        document.getElementById('outboundSkuSearch').value = '';
        document.getElementById('outboundQty').value = '';
        document.getElementById('outboundNote').value = '';
        
        await window.initApp(); // reload data
    } catch(e) {
        alert("Ralat Outbound: " + e.message);
    }
};
"""

js += js_additions

call_marker = "if(typeof populateEditSkuList === 'function') populateEditSkuList();"
if call_marker in js:
    js = js.replace(call_marker, "if(typeof populateEditSkuList === 'function') populateEditSkuList();\n        if(typeof populateMovementSkuList === 'function') populateMovementSkuList();")
    print("Injected populateMovementSkuList into JS initApp")
else:
    print("Could not find call marker for populateMovementSkuList in JS")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

