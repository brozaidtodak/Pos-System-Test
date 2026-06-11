#!/usr/bin/env python3
"""
status_color_migrate.py — replace generic web status colours (bright red/green/amber)
with 10 CAMP-aligned EARTHY equivalents that still read as danger/ok/warn but harmonise
with Sunset Bronze #CD7C32 + Tropical Black #101010 + cream.

Design rationale (colour-expert choices):
  DANGER  -> clay / rust red   (warm, premium, clearly redder than bronze)
  WARNING -> amber / honey gold (deeper + yellower than bronze, stays distinct)
  SUCCESS -> forest / moss green (earthy, outdoor/camping vibe)
Lightness tiers are preserved per old hex so light backgrounds stay light, dark text dark.

NEVER touched: #CD7C32 bronze, #101010 black, #FAF6EF cream, neutral greys,
Shopee #ee4d2d, WhatsApp #25d366. ROADMAP_DATA lines (id:'pN') are skipped (history).

Usage: python3 scripts/status_color_migrate.py [--apply]   (default = dry run)
"""
import re, sys, os

APPLY = "--apply" in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["app.js", "index.html", "design-tokens.css", "style.css",
         "netlify/functions/daily-bos-digest.js"]

# old hex (upper) -> new earthy hex. Grouped for readability.
MAP = {
    # ---- DANGER: clay / rust red ----
    "FEF2F2": "FAF0EE", "FEE2E2": "F4E4DF", "FECACA": "ECD2CA", "FFE4E6": "F5E7E3",
    "FCA5A5": "E0B3A9", "F87171": "CE8579", "EF4444": "C24A3C",
    "DC2626": "B23A2E", "C0392B": "B23A2E",
    "B91C1C": "95342A", "991B1B": "7C2A20", "7F1D1D": "5E2018",
    # ---- WARNING: amber / honey gold ----
    "FFFBEB": "FBF7EC", "FFF7ED": "FAF2E6", "FEF9C3": "F7F0D8", "FEF3C7": "F8EFD7",
    "FDE68A": "ECD9A4", "FCD34D": "E7C66A", "FBBF24": "E0B248",
    "F59E0B": "CE9420", "D97706": "C68A1A", "CA8A04": "B5840F",
    "B45309": "9E7016", "92400E": "7A5410", "78350F": "5E3F0C", "7C2D12": "5E3F0C",
    # ---- SUCCESS: forest / moss green ----
    "F0FDF4": "EEF3EC", "ECFDF5": "ECF3EA", "DCFCE7": "E6F0E4", "D1FAE5": "E4EFE2",
    "BBF7D0": "C9DEC2", "86EFAC": "ABC6A0", "4ADE80": "7FAE74", "34D399": "74A269",
    "22C55E": "5C8A56", "16A34A": "4E7C4A", "10B981": "4E7C4A",
    "059669": "3F7350", "15803D": "3C6438", "047857": "345E43", "065F46": "345E43",
    "166534": "34522F", "064E3B": "2C5038",
}

# build one regex: #hex not surrounded by other hex digits (protects 8-digit hexes)
alt = "|".join(sorted(MAP.keys(), key=len, reverse=True))
RX = re.compile(r"(?<![0-9A-Fa-f])#(" + alt + r")(?![0-9A-Fa-f])", re.IGNORECASE)
ROADMAP = re.compile(r"id:\s*'p\d")   # ROADMAP_DATA entry line -> skip

def newhex(m):
    return "#" + MAP[m.group(1).upper()]

total = 0
for rel in FILES:
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        continue
    lines = open(path, encoding="utf-8").read().split("\n")
    cnt = skipped = 0
    out = []
    for ln in lines:
        if ROADMAP.search(ln):
            n = len(RX.findall(ln))
            skipped += n
            out.append(ln)
            continue
        new, n = RX.subn(newhex, ln)
        cnt += n
        out.append(new)
    total += cnt
    print(f"{rel:42} replace {cnt:4}   skip(roadmap) {skipped}")
    if APPLY and cnt:
        open(path, "w", encoding="utf-8").write("\n".join(out))

print(f"\nTOTAL replacements: {total}   ({'APPLIED' if APPLY else 'DRY RUN — add --apply'})")
