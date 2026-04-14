import sys

with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_toggle = """window.toggleVariantBuilder = function(isEnabled) {
    const singleFields = document.getElementById("singleVariantFields");
    const builderSection = document.getElementById("variantBuilderSection");
    
    if(isEnabled) {
        singleFields.style.display = 'none';
        builderSection.style.display = 'block';
        if(document.getElementById("variantTableBody").children.length === 0) {
            window.addVariantRow(); // add 1st row automatically
        }
    } else {
        singleFields.style.display = 'block';
        builderSection.style.display = 'none';
    }
};

window.addVariantRow = function() {
    const tbody = document.getElementById("variantTableBody");
    const rowId = Date.now() + Math.floor(Math.random()*1000);
    const tr = document.createElement("tr");
    tr.id = "varRow-" + rowId;
    
    tr.innerHTML = `
        <td style="text-align:center;">▶</td>
        <td><input type="text" class="login-input var-sku" style="margin:0; padding:5px; height:30px;" placeholder="Cth: BD-HITAM-L"></td>
        <td><input type="text" class="login-input var-opt" style="margin:0; padding:5px; height:30px;" placeholder="Saiz L, Hitam"></td>
        <td><input type="number" class="login-input var-qty" style="margin:0; padding:5px; height:30px;" placeholder="0"></td>
        <td><input type="number" class="login-input var-price" style="margin:0; padding:5px; height:30px;" placeholder="(Ikut Induk)"></td>
        <td style="text-align:center;"><button onclick="document.getElementById('varRow-${rowId}').remove()" style="background:#EF4444; color:white; padding:5px 10px; margin:0; border:none; border-radius:3px; cursor:pointer;">X</button></td>
    `;
    tbody.appendChild(tr);
};"""

new_toggle = """window.toggleVariantBuilder = function(isEnabled) {
    const singleFields = document.getElementById("singleVariantFields");
    const builderSection = document.getElementById("variantBuilderSection");
    
    if(isEnabled) {
        singleFields.style.display = 'none';
        builderSection.style.display = 'block';
        if(document.getElementById("variantListContainer").children.length === 0) {
            window.addVariantRow();
        }
    } else {
        singleFields.style.display = 'block';
        builderSection.style.display = 'none';
    }
};

window.addVariantRow = function() {
    const container = document.getElementById("variantListContainer");
    const rowId = Date.now() + Math.floor(Math.random()*1000);
    const div = document.createElement("div");
    div.id = "varRow-" + rowId;
    div.style.cssText = "display:flex; align-items:center; gap:10px; background:#fff; padding:10px; border:1px solid #ddd; border-radius:8px;";
    
    div.innerHTML = `
        <div style="flex:1;">
            <input type="text" class="login-input var-opt" style="margin:0; padding:8px;" placeholder="Nama Pilihan (Cth: L, Hitam)">
        </div>
        <div style="width:100px;">
            <input type="number" class="login-input var-qty" style="margin:0; padding:8px;" placeholder="Stok: 0">
        </div>
        <div style="width:150px;">
            <input type="number" class="login-input var-price" style="margin:0; padding:8px;" placeholder="Harga (Opsyenal)">
        </div>
        <button onclick="document.getElementById('varRow-${rowId}').remove()" style="background:#EF4444; color:white; border:none; border-radius:5px; width:40px; height:40px; cursor:pointer; font-weight:bold;">X</button>
    `;
    container.appendChild(div);
};"""

text = text.replace(old_toggle, new_toggle)

old_save = """    if(hasVariants) {
        const trs = document.getElementById("variantTableBody").querySelectorAll("tr");
        if(trs.length === 0) { alert("Pilihan Variasi kosong!"); btn.disabled=false; btn.textContent="Sahkan & Masukkan Ke Rekod Rasmi"; return; }
        
        trs.forEach((tr, idx) => {
            let vSku = tr.querySelector('.var-sku').value.trim().toUpperCase();
            let vOpt = tr.querySelector('.var-opt').value.trim();
            let vQty = parseInt(tr.querySelector('.var-qty').value || 0);
            let vPrice = tr.querySelector('.var-price').value;
            
            if(!vSku) vSku = sku ? `${sku}-V${idx+1}` : `VAR-${Date.now()}-${idx}`;
            
            let prod = { ...baseProd };
            prod.sku = vSku;
            prod.name = vOpt ? `${name} - ${vOpt}` : name;
            prod.variant_size = vOpt;
            prod.variant_color = ""; // Merged into opt
            if(vPrice && vPrice.trim() !== "") prod.price = parseFloat(vPrice);
            
            productsPayloads.push(prod);
            if(vQty > 0) {
                batchesPayloads.push({
                    id: Date.now() + idx,
                    sku: vSku,
                    qty_remaining: vQty,
                    inbound_date: new Date().toISOString().split('T')[0]
                });
            }
        });"""

new_save = """    if(hasVariants) {
        const rows = document.getElementById("variantListContainer").children;
        if(rows.length === 0) { alert("Pilihan Variasi kosong!"); btn.disabled=false; btn.textContent="Sahkan & Masukkan Ke Rekod Rasmi"; return; }
        
        Array.from(rows).forEach((row, idx) => {
            let vOpt = row.querySelector('.var-opt').value.trim();
            let vQty = parseInt(row.querySelector('.var-qty').value || 0);
            let vPrice = row.querySelector('.var-price').value;
            
            let autoSkuStr = vOpt.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            let vSku = sku ? `${sku}-${autoSkuStr||(idx+1)}` : `VAR-${Date.now()}-${idx}`;
            
            let prod = { ...baseProd };
            prod.sku = vSku;
            prod.name = vOpt ? `${name} - ${vOpt}` : name;
            prod.variant_size = vOpt;
            prod.variant_color = ""; // Merged into opt
            if(vPrice && vPrice.trim() !== "") prod.price = parseFloat(vPrice);
            
            productsPayloads.push(prod);
            if(vQty > 0) {
                batchesPayloads.push({
                    id: Date.now() + idx,
                    sku: vSku,
                    qty_remaining: vQty,
                    inbound_date: new Date().toISOString().split('T')[0]
                });
            }
        });"""

text = text.replace(old_save, new_save)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(text)
print("SUCCESS WRITING!")
