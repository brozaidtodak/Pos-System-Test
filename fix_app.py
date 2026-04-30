import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Delete toggleVariantBuilder and addVariantRow
start_marker = 'window.toggleVariantBuilder = function(isEnabled) {'
end_marker = 'if(typeof renderWMS === \'function\') renderWMS();\n};'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_marker)
    # Remove the whole chunk
    content = content[:start_idx] + content[end_idx:]
    print("Successfully removed the old newSkuForm JS logic.")
else:
    print("Could not find start or end markers for JS logic.")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

