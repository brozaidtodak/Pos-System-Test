import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. We replace the main top grid with a flex-column layout
target_grid = '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">'
new_grid = '<div style="display:flex; flex-direction:column; gap:20px;">'

html = html.replace(target_grid, new_grid, 1)

# 2. We wrap Column B and C in a new Grid
# Find Kumpulan Logistik
mid_col = '<!-- Kumpulan Logistik & Harga (Tengah) -->'
new_mid_col = '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px; width:100%;">\n                    <!-- Kumpulan Logistik & Harga (Bawah Kiri) -->'

html = html.replace(mid_col, new_mid_col, 1)

# 3. Find Kumpulan Klasifikasi
right_col = '<!-- Kumpulan Klasifikasi (Kanan) -->'
new_right_col = '<!-- Kumpulan Klasifikasi (Bawah Kanan) -->'
html = html.replace(right_col, new_right_col, 1)

# 4. We need to close the new Grid div after Kumpulan Klasifikasi closes.
# The end of Kumpulan Klasifikasi has </div> then <div style="margin-top:20px; border-top... Sahkan & Masukkan...
submit_btn = '<div style="margin-top:20px; border-top:1px solid #ccc; padding-top:15px; text-align:right;">'
new_submit_btn = '</div>\n                \n                <div style="margin-top:20px; border-top:1px solid #ccc; padding-top:15px; text-align:right;">'

html = html.replace(submit_btn, new_submit_btn, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Layout adjusted A top, B/C bottom")
