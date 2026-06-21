#!/usr/bin/env python3
"""patch_737.py — Beta 0.737: cards 40px; list max-height capped."""
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

print("=== patch_737.py — Beta 0.737 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.736</title>',
    '<title>DVL Binance Live — Beta 0.737</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.736";',
    'const DVL_APP_VERSION = "Beta 0.737";', "version const")

html = rep(html,
    '>BETA 0.736</span>',
    '>BETA 0.737</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.736 — pending order × always visible on chart; drag clamped to chart bounds." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.737 — position cards reduced to 40px; list height capped." },\n  { version: "Beta 0.736", note: "Beta 0.736 — pending × always visible on chart; drag clamped to chart bounds." },',
    "changelog")

# ── 2. Audit bump 0736 → 0737 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0736_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0737_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.736"',
    'window.DVL_APP_VERSION==="Beta 0.737"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.736' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.737' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.736")===-1) blockers.push("A2: title missing 0.736")',
    'indexOf("0.737")===-1) blockers.push("A2: title missing 0.737")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0736_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0737_AUDIT_MODULE";',
    "audit name bump")

# ── 3. List: cap max-height so panel doesn't grow with more trades ────────────────
html = rep(html,
    '.dvlPosV2List{\n'
    '  max-height:none!important;\n'
    '  overflow:auto!important;\n'
    '  padding:0 9px 10px!important;\n'
    '  min-height:0!important;\n'
    '}',
    '.dvlPosV2List{\n'
    '  max-height:180px!important;\n'
    '  overflow-y:auto!important;\n'
    '  padding:0 9px 10px!important;\n'
    '  min-height:0!important;\n'
    '}',
    "list: cap max-height 180px")

# ── 4. Cards 58px → 40px + scale all inner elements ──────────────────────────────
html = rep(html,
    '.dvlPosV2Card{\n'
    '  height:58px!important;\n'
    '  grid-template-columns:30px minmax(66px,1.10fr) minmax(48px,.72fr) minmax(48px,.72fr) minmax(66px,.92fr) 10px!important;\n'
    '  gap:5px!important;\n'
    '  padding:0 8px!important;\n'
    '  margin-bottom:6px!important;\n'
    '  border-radius:12px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Token{\n'
    '  width:28px!important;\n'
    '  height:28px!important;\n'
    '  font-size:15px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Pair{overflow:hidden!important;}\n'
    '\n'
    '.dvlPosV2Pair b{\n'
    '  font-size:13px!important;\n'
    '  max-width:100%!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Tags{margin-top:5px!important;gap:3px!important;}\n'
    '\n'
    '.dvlPosV2Tag{\n'
    '  height:18px!important;\n'
    '  min-width:34px!important;\n'
    '  padding:0 5px!important;\n'
    '  border-radius:5px!important;\n'
    '  font-size:9px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Col span,\n'
    '.dvlPosV2Pnl span{\n'
    '  font-size:8.5px!important;\n'
    '  margin-bottom:4px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Col b{\n'
    '  font-size:11.5px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Pnl b{\n'
    '  font-size:12.5px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Pnl small{\n'
    '  margin-top:3px!important;\n'
    '  font-size:10px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Next{\n'
    '  width:10px!important;\n'
    '  height:10px!important;\n'
    '  border-right-width:2px!important;\n'
    '  border-bottom-width:2px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Empty{\n'
    '  height:86px!important;\n'
    '  font-size:12px!important;\n'
    '}',

    '.dvlPosV2Card{\n'
    '  height:40px!important;\n'
    '  grid-template-columns:24px minmax(54px,1.10fr) minmax(42px,.72fr) minmax(42px,.72fr) minmax(56px,.92fr) 10px!important;\n'
    '  gap:4px!important;\n'
    '  padding:0 7px!important;\n'
    '  margin-bottom:4px!important;\n'
    '  border-radius:9px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Token{\n'
    '  width:22px!important;\n'
    '  height:22px!important;\n'
    '  font-size:11px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Pair{overflow:hidden!important;}\n'
    '\n'
    '.dvlPosV2Pair b{\n'
    '  font-size:11px!important;\n'
    '  max-width:100%!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Tags{margin-top:2px!important;gap:2px!important;}\n'
    '\n'
    '.dvlPosV2Tag{\n'
    '  height:13px!important;\n'
    '  min-width:27px!important;\n'
    '  padding:0 3px!important;\n'
    '  border-radius:3px!important;\n'
    '  font-size:7.5px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Col span,\n'
    '.dvlPosV2Pnl span{\n'
    '  font-size:7px!important;\n'
    '  margin-bottom:2px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Col b{\n'
    '  font-size:10px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Pnl b{\n'
    '  font-size:11px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Pnl small{\n'
    '  margin-top:1px!important;\n'
    '  font-size:8.5px!important;\n'
    '  line-height:1!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Next{\n'
    '  width:8px!important;\n'
    '  height:8px!important;\n'
    '  border-right-width:1.5px!important;\n'
    '  border-bottom-width:1.5px!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Del{width:16px!important;height:16px!important;font-size:12px!important;}\n'
    '\n'
    '.dvlPosV2Empty{\n'
    '  height:70px!important;\n'
    '  font-size:11px!important;\n'
    '}',
    "cards 58→40px + scale inner elements")

# ── 5. Responsive @media(max-width:385px): update card columns for 40px ──────────
html = rep(html,
    '  .dvlPosV2Card{grid-template-columns:29px minmax(68px,1.18fr) minmax(49px,.76fr) minmax(66px,.95fr) 10px!important;}\n'
    '  .dvlPosV2Card .dvlPosV2Col:nth-of-type(3){display:none!important;}',
    '  .dvlPosV2Card{grid-template-columns:22px minmax(56px,1.18fr) minmax(40px,.76fr) minmax(54px,.95fr) 10px!important;}\n'
    '  .dvlPosV2Card .dvlPosV2Col:nth-of-type(3){display:none!important;}',
    "responsive: update card columns")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
