import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Locate the Variant Builder Section
builder_pattern = re.compile(r'(\s*<!-- EXPERIMENTAL VARIANT BUILDER \(Full Width\) -->\s*<div id="variantBuilderSection".*?</div>\s*</div>)', re.DOTALL)
builder_match = builder_pattern.search(html)

if builder_match:
    builder_str = builder_match.group(1)
    
    # Remove it from its current position
    html = html.replace(builder_str, '')

    # Change the heading logic so it looks good in Column A (remove "D. Pembina Pukal" to just "Pembina Variasi")
    # Change min-width from 700px to 100% so it squeezes in
    builder_str_mod = builder_str.replace('D. Pembina Variasi Pukal (Variant Builder)', 'Pembina Variasi')
    builder_str_mod = builder_str_mod.replace('min-width:700px;', 'width:100%; min-width:500px;')

    # Insert it right below the singleVariantFields inside Kumpulan Identiti
    target = """                            <div style="display:flex; gap:10px;">
                                <input type="text" id="regVarSize" class="login-input" style="flex:1;" placeholder="Saiz (L)">
                                <input type="text" id="regVarColor" class="login-input" style="flex:1;" placeholder="Warna (Hitam)">
                            </div>
                        </div>"""
    
    html = html.replace(target, target + "\n" + builder_str_mod)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("UI Shuffled Successfully!")
else:
    print("Could not find Variant Builder Section")
