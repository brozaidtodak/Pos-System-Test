with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

pdp_js = """
// ===================================
// PRODUCT DETAILS PAGE (PDP) MODAL
// ===================================

let currentPdpMetafields = {};

window.openPdpModal = function(sku) {
    const prod = masterProducts.find(p => p.sku === sku);
    if(!prod) return alert("Product not found");

    document.getElementById('pdpOriginalSku').value = prod.sku;
    document.getElementById('pdpHeaderTitle').innerText = `${prod.sku} | ${prod.name}`;
    document.getElementById('pdpStatus').value = prod.is_published === false ? "false" : "true";
    document.getElementById('pdpName').value = prod.name || '';
    document.getElementById('pdpCategory').value = prod.category || '';
    document.getElementById('pdpBrand').value = prod.brand || '';
    document.getElementById('pdpPrice').value = prod.price || 0;
    document.getElementById('pdpCost').value = prod.cost_price || 0;

    // Media
    let imgs = prod.images || [];
    document.getElementById('pdpMediaUrls').value = imgs.join(',');
    renderPdpMediaGallery(imgs);

    // Inventory
    const myBatches = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0);
    const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
    document.getElementById('pdpStockAvailable').innerText = totalStock;

    // Metafields
    currentPdpMetafields = {};
    if(prod.metafields) {
        try {
            currentPdpMetafields = typeof prod.metafields === 'string' ? JSON.parse(prod.metafields) : prod.metafields;
        } catch(e) {}
    }
    renderMetafields();

    document.getElementById('pdpModal').style.display = 'block';
};

window.renderPdpMediaGallery = function(urls) {
    const container = document.getElementById('pdpMediaGallery');
    container.innerHTML = '';
    urls.forEach((url, idx) => {
        container.innerHTML += `
            <div style="position:relative; width:80px; height:80px; border-radius:8px; border:1px solid #e1e3e5; overflow:hidden; flex-shrink:0;">
                <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                <button onclick="window.removePdpMedia(${idx})" style="position:absolute; top:2px; right:2px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:20px; height:20px; font-size:10px; cursor:pointer; color:red;">✕</button>
            </div>
        `;
    });
};

window.addPdpMedia = function() {
    let url = prompt("Enter Image URL:");
    if(url) {
        let currentStr = document.getElementById('pdpMediaUrls').value;
        let urls = currentStr ? currentStr.split(',') : [];
        urls.push(url.trim());
        document.getElementById('pdpMediaUrls').value = urls.join(',');
        renderPdpMediaGallery(urls);
    }
};

window.removePdpMedia = function(idx) {
    let currentStr = document.getElementById('pdpMediaUrls').value;
    let urls = currentStr ? currentStr.split(',') : [];
    urls.splice(idx, 1);
    document.getElementById('pdpMediaUrls').value = urls.join(',');
    renderPdpMediaGallery(urls);
};

window.renderMetafields = function() {
    const container = document.getElementById('pdpMetafieldsContainer');
    container.innerHTML = '';
    for(let key in currentPdpMetafields) {
        container.innerHTML += `
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" class="login-input" value="${key}" disabled style="flex:1; background:#f9fafb; margin:0;">
                <input type="text" class="login-input" value="${currentPdpMetafields[key]}" onchange="window.updateMetafield('${key}', this.value)" style="flex:2; margin:0;">
                <button onclick="window.removeMetafield('${key}')" style="background:none; border:none; color:#d82c0d; cursor:pointer; padding:5px;">🗑️</button>
            </div>
        `;
    }
};

window.addMetafieldRow = function() {
    let key = prompt("Enter Field Name (e.g. Color, Hardware material):");
    if(key && !currentPdpMetafields[key]) {
        currentPdpMetafields[key] = "";
        renderMetafields();
    }
};

window.updateMetafield = function(key, val) {
    currentPdpMetafields[key] = val;
};

window.removeMetafield = function(key) {
    delete currentPdpMetafields[key];
    renderMetafields();
};

window.savePdpData = async function() {
    const sku = document.getElementById('pdpOriginalSku').value;
    const updatePayload = {
        name: document.getElementById('pdpName').value.trim(),
        category: document.getElementById('pdpCategory').value.trim(),
        brand: document.getElementById('pdpBrand').value.trim(),
        price: parseFloat(document.getElementById('pdpPrice').value) || 0,
        cost_price: parseFloat(document.getElementById('pdpCost').value) || 0,
        is_published: document.getElementById('pdpStatus').value === "true",
        metafields: JSON.stringify(currentPdpMetafields)
    };

    let imgStr = document.getElementById('pdpMediaUrls').value;
    updatePayload.images = imgStr ? imgStr.split(',').map(s=>s.trim()).filter(Boolean) : [];

    try {
        let { error } = await db.from('products_master').update(updatePayload).eq('sku', sku);
        if(error) throw error;
        
        alert("Product saved successfully.");
        document.getElementById('pdpModal').style.display = 'none';
        await window.initApp(); // reload everything
    } catch(e) {
        alert("Error saving product: " + e.message);
    }
};
"""

js += pdp_js

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
