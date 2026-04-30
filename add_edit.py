import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

edit_card = """
                <!-- Product Edit Mode -->
                <div class="admin-card" style="border-top:4px solid var(--primary); padding:20px; margin-bottom:20px;">
                    <h3 style="margin-bottom:15px;">✏️ Kemaskini Profil Produk (Edit)</h3>
                    <p style="font-size:12px; color:#888; margin-bottom:20px;">Pilih SKU dari senarai Gudang untuk mengubah suai maklumat teras produk.</p>
                    
                    <label class="small-lbl">Cari SKU Produk</label>
                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <input type="text" id="editSkuSearch" class="login-input" style="flex:1;" placeholder="Taip atau pilih SKU..." list="editSkuList" onchange="window.loadProductForEdit(this.value)">
                        <datalist id="editSkuList"></datalist>
                        <button class="btn-secondary" onclick="window.loadProductForEdit(document.getElementById('editSkuSearch').value)">Load Data</button>
                    </div>

                    <div id="editProductFields" style="display:none; grid-template-columns: 1fr 1fr; gap:15px; border-top:1px dashed #ccc; padding-top:15px;">
                        <div><label class="small-lbl">Nama Produk</label><input type="text" id="epName" class="login-input"></div>
                        <div><label class="small-lbl">Kategori Utama</label><input type="text" id="epCategory" class="login-input"></div>
                        <div><label class="small-lbl">Harga Jualan (RM)</label><input type="number" id="epPrice" class="login-input" step="0.01"></div>
                        <div><label class="small-lbl">Harga Kos (RM)</label><input type="number" id="epCost" class="login-input" step="0.01"></div>
                        <div style="grid-column: 1 / -1;"><label class="small-lbl">URL Gambar Berangkai (Comma Separated)</label><input type="text" id="epImages" class="login-input" placeholder="https://..., https://..."></div>
                        <button class="btn-primary" style="grid-column: 1 / -1; margin-top:10px;" onclick="window.saveProductEdit()">Simpan Perubahan Gudang</button>
                    </div>
                </div>
"""

insert_marker = '<!-- FORM 2: CSV IMPORTER -->'
if insert_marker in html:
    html = html.replace(insert_marker, edit_card + '\n' + insert_marker)
    print("Injected Edit Card into HTML")
else:
    print("Could not find insert marker in HTML")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

js_addition = """
window.populateEditSkuList = function() {
    const list = document.getElementById('editSkuList');
    if(!list) return;
    list.innerHTML = masterProducts.map(p => `<option value="${p.sku}">${p.name}</option>`).join('');
};

window.loadProductForEdit = function(sku) {
    if(!sku) return;
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return alert("SKU tidak dijumpai di Gudang Pusat.");
    
    document.getElementById('epName').value = prod.name || '';
    document.getElementById('epCategory').value = prod.category || '';
    document.getElementById('epPrice').value = prod.price || 0;
    document.getElementById('epCost').value = prod.cost_price || 0;
    document.getElementById('epImages').value = (prod.images || []).join(', ');
    
    document.getElementById('editProductFields').style.display = 'grid';
};

window.saveProductEdit = async function() {
    const sku = document.getElementById('editSkuSearch').value;
    if(!sku) return;
    
    const name = document.getElementById('epName').value;
    const category = document.getElementById('epCategory').value;
    const price = parseFloat(document.getElementById('epPrice').value) || 0;
    const cost = parseFloat(document.getElementById('epCost').value) || 0;
    const imagesRaw = document.getElementById('epImages').value;
    const images = imagesRaw ? imagesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    const updatePayload = {
        name: name,
        category: category,
        price: price,
        cost_price: cost,
        images: images
    };
    
    try {
        let { error } = await db.from('products_master').update(updatePayload).eq('sku', sku);
        if(error) throw error;
        
        alert(`Berjaya kemas kini profil SKU: ${sku}`);
        await window.initApp(); // reload masterProducts
        document.getElementById('editProductFields').style.display = 'none';
        document.getElementById('editSkuSearch').value = '';
    } catch(e) {
        alert("Ralat mengemaskini produk: " + e.message);
    }
};
"""

js += js_addition

# Inject populateEditSkuList() call in initApp()
call_marker = "renderWMS();"
if call_marker in js:
    js = js.replace(call_marker, "renderWMS();\n        if(typeof populateEditSkuList === 'function') populateEditSkuList();")
    print("Injected populateEditSkuList into JS initApp")
else:
    print("Could not find call marker in JS")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

