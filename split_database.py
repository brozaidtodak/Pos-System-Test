import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add the pill button
pill_target = """               <button id="pillWarehouse" class="pill-btn" onclick="window.switchMgmtTab('subtabWarehouse', 'pillWarehouse')">📦 Gudang Pusat</button>"""
pill_replacement = pill_target + """\n               <button id="pillDatabase" class="pill-btn" onclick="window.switchMgmtTab('subtabDatabase', 'pillDatabase')">🗄️ Database</button>"""

if pill_target in html:
    html = html.replace(pill_target, pill_replacement)
    print("Added Database pill button.")
else:
    print("Could not find pill button target.")

# 2. Extract the Kemaskini Profil Produk and Pangkalan Data table
# Let's find the start and end of that section.
# Start: <div class="admin-card" style="border-top:4px solid var(--primary); padding:20px; margin-bottom:20px;">
#        <h3 style="margin-bottom:15px;">✏️ Kemaskini Profil Produk (Edit)</h3>
# End: The closing div of that admin-card, before the CSV Importer.

import sys
start_str = """<div class="admin-card" style="border-top:4px solid var(--primary); padding:20px; margin-bottom:20px;">
                    <h3 style="margin-bottom:15px;">✏️ Kemaskini Profil Produk (Edit)</h3>"""

if start_str not in html:
    print("Could not find the start string of the section to extract.")
    sys.exit(1)

start_idx = html.find(start_str)

end_str = """<!-- FORM 2: CSV IMPORTER -->"""
if end_str not in html:
    print("Could not find end string.")
    sys.exit(1)

end_idx = html.find(end_str)

extracted_content = html[start_idx:end_idx]

# 3. Create the new subtabDatabase HTML
new_subtab_html = f"""
            <!-- WAREHOUSE DATABASE VIEW -->
            <div id="subtabDatabase" class="mgmt-subtab" style="display:none; margin-top:30px;">
                <h3 style="font-size:18px; margin-bottom:15px; color:var(--primary);">🗄️ Database Produk</h3>
                {extracted_content}
            </div>
"""

# 4. Remove extracted content from subtabWarehouse
html = html[:start_idx] + html[end_idx:]

# 5. Insert new subtabDatabase at the end of Management section or right after subtabWarehouse
insert_marker = "            </div> <!-- End subtabWarehouse -->"
if insert_marker in html:
    html = html.replace(insert_marker, insert_marker + "\n" + new_subtab_html)
    print("Inserted new subtabDatabase successfully.")
else:
    # If the marker is different, let's just insert it right before the shopAppLayout
    insert_marker2 = "    <!-- ============================================== -->\n    <!-- THE PUBLIC STOREFRONT (E-COMMERCE)           -->"
    if insert_marker2 in html:
        html = html.replace(insert_marker2, new_subtab_html + "\n" + insert_marker2)
        print("Inserted new subtabDatabase before storefront.")
    else:
        print("Could not find insert marker for the new subtab.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
