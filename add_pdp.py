import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

modal_html = """
<!-- PRODUCT DETAILS PAGE MODAL (PDP) -->
<div id="pdpModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#f4f6f8; z-index:9999; overflow-y:auto; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    
    <!-- PDP Header -->
    <div style="position:sticky; top:0; background:#fff; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e1e3e5; z-index:10;">
        <div style="display:flex; align-items:center; gap:15px;">
            <button onclick="document.getElementById('pdpModal').style.display='none'" style="background:none; border:none; font-size:20px; cursor:pointer; padding:5px;">←</button>
            <h2 id="pdpHeaderTitle" style="margin:0; font-size:18px; color:#202223;">SKU | Nama Produk</h2>
        </div>
        <button class="btn-success" onclick="window.savePdpData()" style="padding:8px 16px;">Save</button>
    </div>

    <!-- PDP Content Container -->
    <div style="max-width:800px; margin:20px auto; padding:0 20px; display:flex; flex-direction:column; gap:20px;">
        <input type="hidden" id="pdpOriginalSku">

        <!-- Card: Status -->
        <div style="background:#fff; border-radius:8px; padding:15px 20px; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#202223;">Product status</strong>
            <select id="pdpStatus" class="login-input" style="width:auto; margin:0; padding:6px 12px;">
                <option value="true">Active</option>
                <option value="false">Draft</option>
            </select>
        </div>

        <!-- Card: Media -->
        <div style="background:#fff; border-radius:8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <strong style="color:#202223;">Media</strong>
                <button style="background:none; border:none; color:#2c6ecb; cursor:pointer;" onclick="window.addPdpMedia()">Add URL</button>
            </div>
            <div id="pdpMediaGallery" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px;">
                <!-- Media items injected here -->
            </div>
            <input type="text" id="pdpMediaUrls" class="login-input" style="display:none;" placeholder="Comma separated URLs">
        </div>

        <!-- Card: Basic Info & Specs -->
        <div style="background:#fff; border-radius:8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:13px; color:#6d7175; margin-bottom:5px;">Title</label>
                <input type="text" id="pdpName" class="login-input">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                <div>
                    <label style="display:block; font-size:13px; color:#6d7175; margin-bottom:5px;">Type / Category</label>
                    <input type="text" id="pdpCategory" class="login-input">
                </div>
                <div>
                    <label style="display:block; font-size:13px; color:#6d7175; margin-bottom:5px;">Vendor / Brand</label>
                    <input type="text" id="pdpBrand" class="login-input">
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div>
                    <label style="display:block; font-size:13px; color:#6d7175; margin-bottom:5px;">Price (RM)</label>
                    <input type="number" id="pdpPrice" class="login-input" step="0.01">
                </div>
                <div>
                    <label style="display:block; font-size:13px; color:#6d7175; margin-bottom:5px;">Cost (RM)</label>
                    <input type="number" id="pdpCost" class="login-input" step="0.01">
                </div>
            </div>
        </div>

        <!-- Card: Metafields -->
        <div style="background:#fff; border-radius:8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <strong style="color:#202223;">Product Metafields</strong>
                <button style="background:none; border:none; color:#2c6ecb; cursor:pointer;" onclick="window.addMetafieldRow()">+ Add Field</button>
            </div>
            <div id="pdpMetafieldsContainer" style="display:flex; flex-direction:column; gap:10px;">
                <!-- Metafield rows injected here -->
            </div>
        </div>

        <!-- Card: Inventory -->
        <div style="background:#fff; border-radius:8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong style="color:#202223;">Inventory</strong>
            </div>
            <div style="color:#202223; font-size:14px;"><span id="pdpStockAvailable" style="font-weight:bold;">0</span> available</div>
        </div>

    </div>
</div>
"""

insert_marker = '</body>'
if insert_marker in html:
    html = html.replace(insert_marker, modal_html + '\n' + insert_marker)
    print("Injected PDP Modal into HTML")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
