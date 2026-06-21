#!/usr/bin/env python3
"""patch_739.py — Beta 0.739: reset ↺ fills pill height; symbol selector wired in new header."""
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

print("=== patch_739.py — Beta 0.739 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.738</title>',
    '<title>DVL Binance Live — Beta 0.739</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.738";',
    'const DVL_APP_VERSION = "Beta 0.739";', "version const")

html = rep(html,
    '>BETA 0.738</span>',
    '>BETA 0.739</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.738 — demo wallet starts at 10k, tracks realized PnL; reset ↺ button next to DEMO pill." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.739 — reset ↺ fills pill height; symbol selector wired in new header." },\n  { version: "Beta 0.738", note: "Beta 0.738 — demo wallet starts at 10k, tracks realized PnL; reset ↺ button next to DEMO pill." },',
    "changelog")

# ── 2. Audit bump 0738 → 0739 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0738_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0739_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.738"',
    'window.DVL_APP_VERSION==="Beta 0.739"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.738' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.739' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.738")===-1) blockers.push("A2: title missing 0.738")',
    'indexOf("0.739")===-1) blockers.push("A2: title missing 0.739")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0738_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0739_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Fix .dvlDemoReset CSS: fill pill height ───────────────────────────────────
html = rep(html,
    '    ".dvlDemoReset{background:none!important;border:none!important;color:var(--orange)!important;"'
    '\n'
    '    "opacity:.60!important;cursor:pointer!important;font-size:16px!important;line-height:1!important;"'
    '\n'
    '    "padding:0 0 0 5px!important;display:inline-grid!important;place-items:center!important;}"'
    '\n'
    '    ".dvlDemoReset:hover,.dvlDemoReset:active{opacity:1!important;}";',
    '    ".dvlDemoReset{background:none!important;border:none!important;color:var(--orange)!important;"'
    '\n'
    '    "opacity:.60!important;cursor:pointer!important;font-size:16px!important;line-height:1!important;"'
    '\n'
    '    "padding:0 4px!important;display:inline-flex!important;align-items:center!important;"'
    '\n'
    '    "align-self:stretch!important;height:100%!important;}"'
    '\n'
    '    ".dvlDemoReset:hover,.dvlDemoReset:active{opacity:1!important;}";',
    "dvlDemoReset: fill pill height")

# ── 4. Wire dvl1b_symbolBtn → toggleAssetDropdown ────────────────────────────────
html = rep(html,
    '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    '  /* ── Symbol button — open/close asset dropdown ── */\n'
    '  var symBtn=document.getElementById("dvl1b_symbolBtn");\n'
    '  if(symBtn) symBtn.addEventListener("click", function(e){\n'
    '    e.stopPropagation();\n'
    '    try{ if(typeof toggleAssetDropdown==="function") toggleAssetDropdown(); else if(window.toggleAssetDropdown) window.toggleAssetDropdown(); }catch(_e){}\n'
    '  }, false);\n'
    '\n'
    '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    "bridge: wire dvl1b_symbolBtn")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
