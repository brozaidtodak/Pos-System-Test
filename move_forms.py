import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate inventorySection start
# It starts at: <div id="inventorySection" class="tab-section" style="display: none;">
inv_start_str = '<div id="inventorySection" class="tab-section" style="display: none;">'
inv_idx = content.find(inv_start_str)

if inv_idx == -1:
    print("Could not find inventorySection")
    exit(1)

# Extract the block to move
# We want to move everything from `<div class="inventory-controls"` up to right before `<h2 class="section-title" style="margin-top:30px;">Current Stock Balance (FIFO)</h2>`
start_marker = '<div class="inventory-controls" style="display: flex; gap:10px; margin-bottom: 20px;">'
end_marker = '<h2 class="section-title" style="margin-top:30px;">Current Stock Balance (FIFO)</h2>'

start_idx = content.find(start_marker, inv_idx)
end_idx = content.find(end_marker, inv_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end markers for forms")
    exit(1)

forms_content = content[start_idx:end_idx]

# Remove the forms from the original content
content = content[:start_idx] + content[end_idx:]

# Now, insert forms_content into subtabWarehouse
# Let's find: <div id="subtabWarehouse" class="mgmt-subtab" style="margin-top:30px;">
wh_start_marker = '<div id="subtabWarehouse" class="mgmt-subtab"'
wh_idx = content.find(wh_start_marker)

if wh_idx == -1:
    print("Could not find subtabWarehouse")
    exit(1)

# We want to insert it after the Product Registration Mode div
# Or maybe right at the beginning of subtabWarehouse, after the <h3>📦 Penyeliaan Gudang Pusat</h3>
insert_marker = '<h3 style="font-size:18px; margin-bottom:15px; color:var(--primary);">📦 Penyeliaan Gudang Pusat</h3>'
insert_idx = content.find(insert_marker, wh_idx)

if insert_idx == -1:
    print("Could not find insert marker")
    exit(1)

insert_idx += len(insert_marker)

# Insert the forms
content = content[:insert_idx] + '\n\n' + forms_content + '\n\n' + content[insert_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully moved forms to Warehouse Management")
