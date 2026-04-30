import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

audit_html = """
                <!-- STOCK AUDIT MODULE -->
                <div class="admin-card" style="border-top:4px solid var(--primary); padding:20px; margin-bottom:20px;">
                    <h3 style="margin-bottom:15px;">🔍 Audit Stok Berkala (Cycle Count)</h3>
                    <p style="font-size:12px; color:#888; margin-bottom:15px;">Imbas SKU atau taip untuk membandingkan kuantiti sistem vs kuantiti fizikal.</p>
                    
                    <div style="display:flex; gap:10px; align-items:flex-end;">
                        <div style="flex:1;">
                            <label class="small-lbl">SKU Produk</label>
                            <input type="text" id="auditSku" class="login-input" placeholder="Taip SKU..." list="movementSkuList" onchange="window.loadAuditProduct()">
                        </div>
                        <div style="width:120px;">
                            <label class="small-lbl">Kuantiti Sistem</label>
                            <input type="number" id="auditSysQty" class="login-input" readonly style="background:#eee;">
                        </div>
                        <div style="width:120px;">
                            <label class="small-lbl">Kuantiti Fizikal</label>
                            <input type="number" id="auditPhysQty" class="login-input" placeholder="0">
                        </div>
                        <button class="btn-primary" style="height:42px; margin-bottom:15px;" onclick="window.submitStockAudit()">Semak & Hantar</button>
                    </div>
                </div>
"""

insert_marker = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">\n                    <!-- Discrepancy Log -->'
if insert_marker in html:
    html = html.replace(insert_marker, audit_html + '\n                ' + insert_marker)
    print("Injected Stock Audit HTML")
else:
    print("Could not find insert marker for Stock Audit")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

audit_js = """
window.loadAuditProduct = function() {
    const sku = document.getElementById('auditSku').value.trim();
    if(!sku) return;
    
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return; // Silent return if not found, wait for full typing
    
    const myBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0);
    const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
    
    document.getElementById('auditSysQty').value = totalStock;
    document.getElementById('auditPhysQty').focus();
};

window.submitStockAudit = async function() {
    const sku = document.getElementById('auditSku').value.trim();
    const sysQty = parseInt(document.getElementById('auditSysQty').value) || 0;
    const physQtyStr = document.getElementById('auditPhysQty').value;
    
    if(!sku || physQtyStr === '') return alert("Sila isikan SKU dan Kuantiti Fizikal.");
    const physQty = parseInt(physQtyStr);
    
    if(sysQty === physQty) {
        alert(`Tiada perbezaan stok untuk ${sku}. Selesai audit.`);
        document.getElementById('auditSku').value = '';
        document.getElementById('auditSysQty').value = '';
        document.getElementById('auditPhysQty').value = '';
        return;
    }
    
    const diff = physQty - sysQty;
    const diffText = diff > 0 ? `+${diff} (Berlebihan)` : `${diff} (Hilang/Rosak)`;
    
    const confirmAudit = confirm(`Perbezaan dikesan: ${diffText}\\nKuantiti Sistem: ${sysQty}\\nKuantiti Fizikal: ${physQty}\\n\\nAdakah anda pasti mahu hantar laporan Discrepancy ini?`);
    if(!confirmAudit) return;
    
    try {
        const payload = {
            request_type: 'Discrepancy',
            status: 'Pending',
            metadata: {
                sku: sku,
                system_qty: sysQty,
                physical_qty: physQty,
                difference: diff,
                reported_by: currentUser ? currentUser.name : 'Unknown'
            }
        };
        let { error } = await db.from('pending_requests').insert([payload]);
        if(error) throw error;
        
        alert(`Laporan Discrepancy ${sku} berjaya dihantar untuk kelulusan.`);
        document.getElementById('auditSku').value = '';
        document.getElementById('auditSysQty').value = '';
        document.getElementById('auditPhysQty').value = '';
        // Wait for realtime UI update
    } catch(e) {
        alert("Ralat menghantar laporan audit: " + e.message);
    }
};

window.renderWhAudit = function() {
    const tbody = document.getElementById("whAuditTbody");
    if(!tbody) return;
    
    const audits = pendingSchedules.filter(r => r.request_type === 'Discrepancy' && r.status === 'Pending');
    if(audits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">Tiada laporan Discrepancy yang menunggu kelulusan.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = audits.map(a => {
        let meta = a.metadata || {};
        let diffColor = meta.difference > 0 ? '#10B981' : '#EF4444';
        return `
            <tr>
                <td><strong>${meta.sku || 'N/A'}</strong><br><span style="color:${diffColor}; font-weight:bold;">${meta.difference > 0 ? '+'+meta.difference : meta.difference} unit</span></td>
                <td>${meta.reported_by || 'Staf'}</td>
                <td>
                    <button class="btn-success" style="padding:4px 8px; font-size:10px; margin-bottom:4px;" onclick="window.approveDiscrepancy('${a.id}', '${meta.sku}', ${meta.difference})">Lulus</button><br>
                    <button class="btn-primary" style="background:#EF4444; border:none; padding:4px 8px; font-size:10px;" onclick="window.rejectRequest('${a.id}')">Tolak</button>
                </td>
            </tr>
        `;
    }).join('');
};

window.approveDiscrepancy = async function(reqId, sku, difference) {
    if(!confirm(`Luluskan pelarasan stok ${difference > 0 ? '+'+difference : difference} unit untuk ${sku}?`)) return;
    
    try {
        // Find batch to adjust
        if(difference > 0) {
            // Surplus, create a new inbound batch
            await db.from('inventory_batches').insert([{
                sku: sku, qty_received: difference, qty_remaining: difference, inbound_date: new Date().toISOString().split('T')[0]
            }]);
        } else {
            // Shortage, deduct from oldest batch (similar to outbound)
            let qtyToDeduct = Math.abs(difference);
            let relevantBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).sort((a,b) => new Date(a.inbound_date) - new Date(b.inbound_date));
            
            for(let batch of relevantBatches) {
                if(qtyToDeduct <= 0) break;
                let deductAmount = Math.min(batch.qty_remaining, qtyToDeduct);
                await db.from('inventory_batches').update({ qty_remaining: batch.qty_remaining - deductAmount }).eq('id', batch.id);
                qtyToDeduct -= deductAmount;
            }
        }
        
        await db.from('pending_requests').update({status: 'Approved'}).eq('id', reqId);
        alert(`Discrepancy diluluskan. Baki stok ${sku} telah diselaraskan.`);
        await window.initApp();
    } catch(e) {
        alert("Ralat menyelaraskan stok: " + e.message);
    }
};

window.rejectRequest = async function(reqId) {
    if(!confirm('Tolak permintaan ini secara rasmi?')) return;
    try {
        await db.from('pending_requests').update({status: 'Rejected'}).eq('id', reqId);
        alert('Permintaan ditolak.');
        await window.initApp();
    } catch(e) {
        alert("Ralat menolak permintaan: " + e.message);
    }
};
"""

js += audit_js

call_marker = "if(typeof renderFinance === \"function\") renderFinance();"
if call_marker in js:
    js = js.replace(call_marker, "if(typeof renderFinance === \"function\") renderFinance();\n        if(typeof renderWhAudit === 'function') renderWhAudit();")
    print("Injected renderWhAudit into JS initApp")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
