import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove inventory-controls (the buttons)
controls_start = '<div class="inventory-controls" style="display: flex; gap:10px; margin-bottom: 20px;">'
controls_end = '</div>'
idx_controls = content.find(controls_start)
if idx_controls != -1:
    end_idx_controls = content.find(controls_end, idx_controls) + len(controls_end)
    content = content[:idx_controls] + content[end_idx_controls:]

# 2. Extract csvForm
csv_start_marker = '<!-- FORM 2: CSV IMPORTER -->'
csv_end_marker = '<!-- FORM 3: INBOUND -->'
idx_csv = content.find(csv_start_marker)
if idx_csv != -1:
    end_idx_csv = content.find(csv_end_marker, idx_csv)
    csv_content = content[idx_csv:end_idx_csv]
    
    # Remove style="display:none;" from csvForm so it's always visible in the new location
    csv_content = csv_content.replace('style="display:none; border-color:var(--primary);"', 'style="border-top:2px dashed #ccc; margin-top:30px; padding-top:20px;"')
    
    # Remove the csvForm from its original location
    content = content[:idx_csv] + content[end_idx_csv:]

# 3. Remove newSkuForm
# It's right before where csvForm used to be, or after where controls were.
# Let's find: <div id="newSkuForm" class="admin-card"
new_sku_start_marker = '<!-- FORM 1: REGISTER NEW SKU (INDUSTRIAL LEVEL) -->'
idx_sku = content.find(new_sku_start_marker)
if idx_sku != -1:
    # Since we removed csv_content, the next thing after newSkuForm was where csvForm started.
    # But wait, we already removed csvForm. 
    # Let's find the closing tag of newSkuForm. It's the </div> right before where csvForm used to be.
    # Actually, let's just find the exact string to delete.
    # Since we know new_sku_start_marker is unique:
    # We want to delete from new_sku_start_marker up to the start of the next section, which is either where csv_start_marker was.
    # Let's just find where newSkuForm ends by looking for `<div id="saveMasterBtn"`... wait, the button is `<button id="saveMasterBtn"`
    end_button_marker = '<button id="saveMasterBtn" class="btn-primary" style="font-size:16px; padding:12px 25px;">Sahkan & Masukkan Ke Rekod Rasmi</button>\n                </div>\n            </div>'
    end_idx_sku = content.find(end_button_marker, idx_sku)
    if end_idx_sku != -1:
        end_idx_sku += len(end_button_marker)
        content = content[:idx_sku] + content[end_idx_sku:]
    else:
        print("Could not find end of newSkuForm")

# 4. Insert csvForm into Product Registration Mode card
pr_marker = '<button class="btn-primary" style="margin-top:20px; width:100%;" onclick="window.saveProductRegistration()">Daftar Produk ke Gudang</button>'
idx_pr = content.find(pr_marker)
if idx_pr != -1:
    insert_pos = idx_pr + len(pr_marker)
    # Insert csv_content
    content = content[:insert_pos] + '\n\n' + csv_content + '\n' + content[insert_pos:]
else:
    print("Could not find Product Registration Mode marker")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done python script")
