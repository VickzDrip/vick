#!/usr/bin/env python3
"""patch_740.py — Beta 0.740: redo reset button fill + symbol selector wire."""
import sys

PATH = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label, expect=1):
    count = html.count(old)
    if count != expect:
        print(f"ABORT [{label}] — expected {expect} occ, got {count}")
        sys.exit(1)
    html = html.replace(old, new, expect)
    print(f"  OK: {label}")
    return html

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_740.py — Beta 0.740 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.739</title>',
    '<title>DVL Binance Live — Beta 0.740</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.739";',
    'const DVL_APP_VERSION = "Beta 0.740";', "version const")

html = rep(html,
    '>BETA 0.739</span>',
    '>BETA 0.740</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.739 — reset ↺ fills pill height; symbol selector wired in new header." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.740 — reset ↺ fills pill height; symbol selector wired in new header." },\n  { version: "Beta 0.739", note: "Beta 0.739 — reset ↺ fills pill height; symbol selector wired in new header." },',
    "changelog")

# ── 2. Audit bump 0739 → 0740 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0739_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0740_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.739"',
    'window.DVL_APP_VERSION==="Beta 0.740"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.739' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.740' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.739")===-1) blockers.push("A2: title missing 0.739")',
    'indexOf("0.740")===-1) blockers.push("A2: title missing 0.740")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0739_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0740_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Update style tag id → _0740 so fresh CSS always injects ───────────────────
html = rep(html,
    'if(document.getElementById("DVL_DEMO_WALLET_STYLE_0738")) return;\n'
    '  var s=document.createElement("style");\n'
    '  s.id="DVL_DEMO_WALLET_STYLE_0738";',
    'if(document.getElementById("DVL_DEMO_WALLET_STYLE_0740")) return;\n'
    '  var s=document.createElement("style");\n'
    '  s.id="DVL_DEMO_WALLET_STYLE_0740";',
    "wallet style id → 0740")

# ── 4. Confirm dvlDemoReset CSS fills pill (align-self:stretch + height:100%) ─────
# Already applied in 0.739 — verify it's there, abort if not
assert 'align-self:stretch!important;height:100%!important;}' in html, \
    "ABORT: dvlDemoReset stretch CSS missing — check 0739 patch"
print("  OK: dvlDemoReset fill-pill CSS confirmed")

# ── 5. Confirm dvl1b_symbolBtn handler is wired ───────────────────────────────────
assert 'var symBtn=document.getElementById("dvl1b_symbolBtn");' in html, \
    "ABORT: dvl1b_symbolBtn handler missing — check 0739 patch"
print("  OK: dvl1b_symbolBtn handler confirmed")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
