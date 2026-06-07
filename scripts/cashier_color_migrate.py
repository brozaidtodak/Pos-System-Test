#!/usr/bin/env python3
"""p1_403 — Replace the cartoon emerald green (#10B981) with Tropical Black (#101010)
everywhere, and mute the bright red (#EF4444) to a professional muted red (#C0392B).
Keeps red for danger meaning (just not cartoonish). Run: python3 scripts/cashier_color_migrate.py [--apply]
"""
import re, sys, io
APPLY = "--apply" in sys.argv
FILES = ["index.html", "app.js", "style.css", "design-tokens.css", "customer-display.html"]

HEX = {
    "#10b981": "#101010",  # emerald success -> Tropical Black
    "#ef4444": "#c0392b",  # bright red -> muted professional red
}
RGBA = {
    (16, 185, 129): (16, 16, 16),   # green shadow -> black
    (239, 68, 68): (192, 57, 43),   # red shadow -> muted red
}

def migrate(text):
    n = 0
    def hx(m):
        nonlocal n
        k = m.group(0).lower()
        if k in HEX:
            n += 1
            return HEX[k]
        return m.group(0)
    text = re.sub(r"#[0-9a-fA-F]{6}\b", hx, text)
    def rg(m):
        nonlocal n
        r, g, b = int(m.group(2)), int(m.group(3)), int(m.group(4))
        if (r, g, b) in RGBA:
            n += 1
            nr, ng, nb = RGBA[(r, g, b)]
            return f"{m.group('fn')}({nr}, {ng}, {nb}"
        return m.group(0)
    text = re.sub(r"(?P<fn>rgba?)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})", rg, text)
    return text, n

total = 0
for f in FILES:
    try:
        src = io.open(f, encoding="utf-8").read()
    except FileNotFoundError:
        continue
    new, n = migrate(src)
    total += n
    print(f"  {f:24s} {n:4d}")
    if APPLY and n:
        io.open(f, "w", encoding="utf-8").write(new)
print(f"  {'TOTAL':24s} {total:4d}  " + ("APPLIED" if APPLY else "DRY-RUN"))
