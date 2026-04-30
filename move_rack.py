import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add Rack, Tier, Bin inputs to Edit Product Fields
marker = '<div><label class="small-lbl">Harga Kos (RM)</label><input type="number" id="epCost" class="login-input" step="0.01"></div>'
new_inputs = """
                        <div><label class="small-lbl">Rak (Rack)</label><input type="text" id="epRack" class="login-input" placeholder="Cth: A, B, C"></div>
                        <div><label class="small-lbl">Tingkat (Tier)</label><input type="text" id="epTier" class="login-input" placeholder="Cth: 1, 2, 3"></div>
                        <div><label class="small-lbl">Kotak (Bin)</label><input type="text" id="epBin" class="login-input" placeholder="Cth: 14"></div>
"""
if marker in html:
    html = html.replace(marker, marker + new_inputs)
    print("Injected Rack inputs into HTML")
else:
    print("Could not find marker for Rack inputs")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Update loadProductForEdit
load_marker = "document.getElementById('epImages').value = (prod.images || []).join(', ');"
load_addition = """
    
    // Parse location_bin assuming format "RACK-TIER-BIN" or just text
    let loc = prod.location_bin || '';
    let locParts = loc.split('-');
    document.getElementById('epRack').value = locParts[0] || '';
    document.getElementById('epTier').value = locParts[1] || '';
    document.getElementById('epBin').value = locParts[2] || '';
"""
if load_marker in js:
    js = js.replace(load_marker, load_marker + load_addition)
    print("Injected Rack load into JS")

# Update saveProductEdit
save_marker = "const images = imagesRaw ? imagesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];"
save_addition = """
    
    const rack = document.getElementById('epRack').value.trim();
    const tier = document.getElementById('epTier').value.trim();
    const bin = document.getElementById('epBin').value.trim();
    const locationStr = [rack, tier, bin].filter(Boolean).join('-');
"""
if save_marker in js:
    js = js.replace(save_marker, save_marker + save_addition)
    print("Injected Rack save vars into JS")

payload_marker = "images: images"
if payload_marker in js:
    js = js.replace(payload_marker, "images: images,\n        location_bin: locationStr")
    print("Injected Rack save payload into JS")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
