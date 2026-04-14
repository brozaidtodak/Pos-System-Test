import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Dimensi Kotak
old_dim = """                            <div>
                                <label class="small-lbl">Dimensi Kotak (P x L x T)</label>
                                <input type="text" id="regDim" class="login-input" placeholder="12cm x 3cm x 2cm">
                            </div>"""

new_dim = """                            <div>
                                <label class="small-lbl">Dimensi Kotak (cm)</label>
                                <div style="display:flex; gap:5px;">
                                    <input type="number" id="regLen" class="login-input" placeholder="L">
                                    <input type="number" id="regWid" class="login-input" placeholder="W">
                                    <input type="number" id="regHei" class="login-input" placeholder="H">
                                </div>
                            </div>"""

html = html.replace(old_dim, new_dim)

# Main Category
old_cat = """                        <label class="small-lbl">Sistem Koleksi (Collection Path)</label>
                        <input type="text" id="regColl1" class="login-input" style="margin-bottom:5px;" placeholder="Main Category (Cth: Tents)">"""

new_cat = """                        <label class="small-lbl">Sistem Koleksi (Collection Path)</label>
                        <select id="regColl1" class="login-input" style="margin-bottom:5px;">
                            <option value="">-- Main Category --</option>
                            <option value="Shelter">Shelter</option>
                            <option value="Cookware">Cookware</option>
                            <option value="Storage">Storage</option>
                            <option value="Lighting">Lighting</option>
                            <option value="Sleeping Gear">Sleeping Gear</option>
                            <option value="Camping Furniture">Camping Furniture</option>
                            <option value="Fan">Fan</option>
                            <option value="Accessories">Accessories</option>
                        </select>"""

html = html.replace(old_cat, new_cat)

# Gambar Produk
old_img = """                        <label class="small-lbl" style="margin-top:10px;">Gambar Produk (Max: 20 Imej)</label>
                        <input type="file" id="regImages" class="login-input" accept="image/png, image/jpeg, image/webp, image/avif, image/jfif" multiple>"""

new_img = """                        <label class="small-lbl" style="margin-top:10px;">Gambar Produk (Max: 20 Imej)</label>
                        <div style="background:#fff; border:1px solid #ddd; padding:10px; border-radius:5px; margin-bottom:10px;">
                            <label style="font-size:11px; font-weight:bold;">1. Upload Image</label>
                            <input type="file" id="regImages" class="login-input" style="margin-bottom:10px; font-size:11px; padding:2px;" accept="image/png, image/jpeg, image/webp, image/avif, image/jfif" multiple>
                            
                            <label style="font-size:11px; font-weight:bold;">2. Add with URL Image</label>
                            <input type="text" id="regImageUrl" class="login-input" style="margin-bottom:10px; font-size:12px; padding:8px;" placeholder="https://contoh.com/gambar.jpg">
                            
                            <label style="font-size:11px; font-weight:bold;">3. Add with URL Video</label>
                            <input type="text" id="regVideoUrl" class="login-input" style="margin-bottom:5px; font-size:12px; padding:8px;" placeholder="https://youtube.com/watch?v=...">
                        </div>"""

html = html.replace(old_img, new_img)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Dimensi Grab
old_dim_js = """    const loc = document.getElementById("regLocation")?.value || '';
    const dim = document.getElementById("regDim")?.value || '';
    const weight = document.getElementById("regWeight")?.value || 0;"""

new_dim_js = """    const loc = document.getElementById("regLocation")?.value || '';
    const len_cm = parseFloat(document.getElementById("regLen")?.value || 0);
    const wid_cm = parseFloat(document.getElementById("regWid")?.value || 0);
    const hei_cm = parseFloat(document.getElementById("regHei")?.value || 0);
    const weight = document.getElementById("regWeight")?.value || 0;"""

js = js.replace(old_dim_js, new_dim_js)

# Image Logic
old_img_js = """    let localImageUrls = [];
    const files = document.getElementById("regImages")?.files;
    if(files && files.length > 0) {
        // limit to 20
        const len = Math.min(files.length, 20);
        for(let i=0; i<len; i++) {
            localImageUrls.push(URL.createObjectURL(files[i]));
        }
    } else {
        localImageUrls = ["https://via.placeholder.com/500?text=Barang+Baru"];
    }"""

new_img_js = """    let localImageUrls = [];
    
    // Check URL inputs first
    const imgUrl = document.getElementById("regImageUrl")?.value.trim();
    const vidUrl = document.getElementById("regVideoUrl")?.value.trim();
    if(imgUrl) localImageUrls.push(imgUrl);
    if(vidUrl) localImageUrls.push(vidUrl);

    const files = document.getElementById("regImages")?.files;
    if(files && files.length > 0) {
        const len = Math.min(files.length, 20);
        for(let i=0; i<len; i++) {
            localImageUrls.push(URL.createObjectURL(files[i]));
        }
    }
    
    if(localImageUrls.length === 0) {
        localImageUrls = ["https://via.placeholder.com/500?text=Barang+Baru"];
    }"""

js = js.replace(old_img_js, new_img_js)

# Base Prod mapping
old_base = """        location_bin: loc,
        dimensions: dim,
        weight_kg: parseFloat(weight)"""

new_base = """        location_bin: loc,
        length_cm: len_cm,
        width_cm: wid_cm,
        height_cm: hei_cm,
        weight_kg: parseFloat(weight)"""

js = js.replace(old_base, new_base)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Patching Finished! UI and JS mapped.")
