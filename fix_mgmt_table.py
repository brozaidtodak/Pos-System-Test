import re

# 1. Fix index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove Action column from inventoryTableBody
html = html.replace('<th>Cost / Retail</th><th>Action</th>', '<th>Cost / Retail</th>')

# Insert the new management table right after Kemaskini Profil Produk search box
mgmt_table_html = """
                    <div style="margin-top:20px; border-top:1px dashed #ccc; padding-top:20px;">
                        <h4 style="margin-bottom:10px; color:var(--primary);">Pangkalan Data Produk (Gudang)</h4>
                        <div class="table-responsive" style="max-height:400px; overflow-y:auto; border:1px solid var(--border-color);">
                            <table class="data-table" style="font-size:12px;">
                                <thead style="position:sticky; top:0; background:#FAFAFA;">
                                    <tr><th>SKU Profile</th><th>Informasi Fizikal & Logistik</th><th>Bilangan / Total Stock</th><th>Lokasi Gudang (Bin)</th><th>Cost / Retail</th><th>Tindakan</th></tr>
                                </thead>
                                <tbody id="mgmtInventoryTableBody">
                                    <tr><td colspan="6" style="text-align:center;">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
"""

insert_marker = '</datalist>\n                        <button class="btn-primary" onclick="window.openPdpModal(document.getElementById(\'editSkuSearch\').value)">Buka Profil (Edit)</button>\n                    </div>'
if insert_marker in html:
    html = html.replace(insert_marker, insert_marker + mgmt_table_html)
    print("Injected mgmt table into HTML")
else:
    print("Could not find insert marker for mgmt table in HTML")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Fix app.js
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the Action button from regular renderWMS
old_render_wms_td = """
                <td>
                    <button class="btn-secondary" style="padding:4px 8px; font-size:12px; cursor:pointer;" onclick="window.openPdpModal('${p.sku}')">✏️ Edit Details</button>
                </td>
            </tr>
"""
if old_render_wms_td in js:
    js = js.replace(old_render_wms_td, "\n            </tr>\n")
    print("Removed Edit button from regular WMS table")
else:
    print("Could not find old render wms td")

# Add renderMgmtInventory function
mgmt_js = """
window.renderMgmtInventory = function() {
    const tbody = document.getElementById("mgmtInventoryTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    let htmlBuf = "";

    masterProducts.forEach(p => {
        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        let thumb = "https://placehold.co/100x100?text=Img";
        let imgs = p.images || []; if(imgs.length > 0) thumb = imgs[0];

        let sBadge = p.is_published ? `<span style="color:green;font-size:10px;">Active</span>` : `<span style="color:red;font-size:10px;">Draft</span>`;

        htmlBuf += `
            <tr>
                <td>
                    <img src="${thumb}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; background:#eee;"><br>
                    ${sBadge}
                </td>
                <td>
                    <span class="sku-badge">${p.sku}</span> <span class="cat-badge">${p.category||'Uncategorized'}</span> ${p.location_bin ? `<span style="background:#fef08a; color:#854d0e; padding:3px 6px; border-radius:4px; font-size:10px;">📌 Loc: ${p.location_bin}</span>` : ''}<br>
                    <strong>${p.name}</strong><br>
                    <small style="color:#888;">Jenama: <strong>${p.brand || 'N/A'}</strong></small>
                </td>
                <td>
                    <div style="font-size:12px; color:#555;">
                        Model: ${p.model_no || '-'}<br>
                        Variant: ${p.variant_size || '-'} / ${p.variant_color || '-'}<br>
                        Dimensi: ${p.dimensions || '-'} (${p.weight_kg ? p.weight_kg+'Kg' : '-'})
                    </div>
                </td>
                <td style="font-weight:bold; color:${totalStock <= 0 ? 'red' : 'green'};">
                    ${totalStock} ${p.unit||'Pcs'}<br>
                    <small style="font-weight:normal; color:#888;">${myBatches.length} batch(es)</small>
                </td>
                <td>
                    <div style="background:#F3F4F6; padding:5px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid #ddd; display:inline-block;">
                        📍 ${p.location_bin || "Tiada Maklumat Rak"}
                    </div>
                </td>
                <td>
                    <small>Cost: RM${parseFloat(p.cost_price||0).toFixed(2)}</small><br>
                    <strong>Sell: RM${parseFloat(p.price).toFixed(2)}</strong>
                </td>
                <td>
                    <button class="btn-primary" style="padding:4px 8px; font-size:12px; cursor:pointer; width:100%; white-space:nowrap;" onclick="window.openPdpModal('${p.sku}')">✏️ Edit Details</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlBuf;
};
"""

js += mgmt_js

# Inject call into initApp
call_marker = "if(typeof renderWhAudit === 'function') renderWhAudit();"
if call_marker in js:
    js = js.replace(call_marker, "if(typeof renderWhAudit === 'function') renderWhAudit();\n        if(typeof renderMgmtInventory === 'function') renderMgmtInventory();")
    print("Injected renderMgmtInventory call into initApp")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

