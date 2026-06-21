#!/usr/bin/env python3
"""patch_715.py — Beta 0.715: Global black/green visual unification"""
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

print("=== patch_715.py — Beta 0.715: Global black/green visual unification ===")

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.714</title>',
    '<title>DVL Binance Live — Beta 0.715</title>',
    "title")

# ── 2. Version const ──────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.714";',
    'const DVL_APP_VERSION = "Beta 0.715";',
    "version const")

# ── 3. Static badge ───────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.714</span>',
    '>BETA 0.715</span>',
    "static badge")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.714 — Chart Body',
    '  { version: DVL_APP_VERSION, note: "Beta 0.715 — Global black/green visual unification for chart body, price scale, time scale, volume and bottom nav using 0.728 as reference. Header frozen. Removed navy/blue from canvas drawing: grid rgba(64,105,145)->(122,155,145), price/time labels blue-grey->green-grey, current price line brighter green, candle bull #13dc8d->#10df77, bear #ff4a61->#ff3037, oscillator scale pills cyan->#10df77, volume MA cyan->#10df77. CSS token overrides: --green, --red, --grid, --text, --muted." },\n  { version: "Beta 0.714", note: "Beta 0.714 — Chart Body',
    "changelog")

# ── 5. Insert DVL_715_VISUAL_CSS before Phase 1B div ─────────────────────────
# After 0.714, the anchor is: </style>\n<div id="DVL_UI_OVERLAY_PHASE_1B"...
# (end of DVL_714_VISUAL_CSS block)
CSS_715 = (
'<style id="DVL_715_VISUAL_CSS">\n'
'/* ─── Beta 0.715 — Global black/green visual unification ─── */\n'
'\n'
'/* CSS token overrides: shift from navy/blue to green/black */\n'
':root{\n'
'  --green:#10df77;\n'
'  --red:#ff3037;\n'
'  --grid:rgba(122,155,145,.092);\n'
'  --text:#f4f6f4;\n'
'  --muted:#a5aaa9;\n'
'  --muted2:#737b79;\n'
'}\n'
'\n'
'/* Canvas area: dark green-black base visible before first draw */\n'
'.canvasWrap,#chart{background:#020806 !important}\n'
'</style>\n'
)

html = rep(html,
    '</style>\n<div id="DVL_UI_OVERLAY_PHASE_1B" data-dvl-overlay-phase="1B" aria-label="DVL new UI (phase 1B, visual)">',
    CSS_715 + '<div id="DVL_UI_OVERLAY_PHASE_1B" data-dvl-overlay-phase="1B" aria-label="DVL new UI (phase 1B, visual)">',
    "insert DVL_715_VISUAL_CSS")

# ── 6. Canvas background: navy-black -> green-black ───────────────────────────
html = rep(html,
    'ctx.fillStyle = "#020812"',
    'ctx.fillStyle = "#020806"',
    "canvas bg #020812->#020806", 9)

# ── 7. Grid color: blue-navy -> green-grey ────────────────────────────────────
html = rep(html,
    'ctx.strokeStyle = "rgba(64,105,145,.105)"',
    'ctx.strokeStyle = "rgba(122,155,145,.092)"',
    "grid color", 4)

# ── 8. Divider: blue -> green ─────────────────────────────────────────────────
html = rep(html,
    'ctx.strokeStyle = "rgba(64,105,145,.24)"',
    'ctx.strokeStyle = "rgba(150,180,168,.18)"',
    "divider color")

# ── 9. Price scale labels: blue-grey -> green-grey ───────────────────────────
html = rep(html,
    'ctx.fillStyle = "rgba(200,213,230,.72)"',
    'ctx.fillStyle = "rgba(165,170,168,.72)"',
    "price scale labels (space=)", 5)

# ── 10. Price scale labels variant (no space around =) ───────────────────────
html = rep(html,
    'ctx.fillStyle="rgba(200,213,230,.72)"',
    'ctx.fillStyle="rgba(165,170,168,.72)"',
    "price scale labels (no-space=)")

# ── 11. Time scale labels ─────────────────────────────────────────────────────
html = rep(html,
    'ctx.fillStyle = "rgba(200,213,230,.68)"',
    'ctx.fillStyle = "rgba(165,170,168,.68)"',
    "time scale labels")

# ── 12. OHLC stats overlay ────────────────────────────────────────────────────
html = rep(html,
    '"rgba(200,213,230,.64)"',
    '"rgba(165,170,168,.64)"',
    "OHLC stats", 3)

# ── 13. Current price line ────────────────────────────────────────────────────
html = rep(html,
    'ctx.strokeStyle = "rgba(19,220,141,.65)"',
    'ctx.strokeStyle = "rgba(16,223,119,.76)"',
    "current price line")

# ── 14. Candle bull color constant ───────────────────────────────────────────
html = rep(html,
    'let candleBullColor = "#13dc8d"',
    'let candleBullColor = "#10df77"',
    "candleBullColor const")

# ── 15. Candle bear color constant ───────────────────────────────────────────
html = rep(html,
    'let candleBearColor = "#ff4a61"',
    'let candleBearColor = "#ff3037"',
    "candleBearColor const")

# ── 16. Current price pill (roundRect fill) ───────────────────────────────────
html = rep(html,
    'roundRect(ctx, tx, ty, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#13dc8d")',
    'roundRect(ctx, tx, ty, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#10df77")',
    "price pill roundRect")

# ── 17. Long liquidation line color ──────────────────────────────────────────
html = rep(html,
    '      color: "#13dc8d",',
    '      color: "#10df77",',
    "long liq color")

# ── 18. Short liquidation line color ─────────────────────────────────────────
html = rep(html,
    '      color: "#ff4a61",',
    '      color: "#ff3037",',
    "short liq color")

# ── 19. Hollow candle interior background ─────────────────────────────────────
html = rep(html,
    '"rgba(2,8,18,.92)"',
    '"rgba(2,8,6,.92)"',
    "hollow candle bg")

# ── 20. Footprint candle inner dividers ───────────────────────────────────────
html = rep(html,
    '"rgba(2,8,18,.55)"',
    '"rgba(2,8,6,.55)"',
    "footprint inner")

# ── 21. Empty state text ─────────────────────────────────────────────────────
html = rep(html,
    'ctx.fillStyle = "#74859a"',
    'ctx.fillStyle = "#6b7d6e"',
    "empty state text")

# ── 22. Volume module: MA line color (was cyan) ───────────────────────────────
html = rep(html,
    'maColor:"#18d7ff"',
    'maColor:"#10df77"',
    "volume maColor")

# ── 23. Volume module: bull bar default ───────────────────────────────────────
html = rep(html,
    'bullColor:"#13dc8d"',
    'bullColor:"#10df77"',
    "volume bullColor default")

# ── 24. Volume module: bear bar default ───────────────────────────────────────
html = rep(html,
    'bearColor:"#ff4a61"',
    'bearColor:"#ff3037"',
    "volume bearColor default")

# ── 25. Flow events: buyer color default ─────────────────────────────────────
html = rep(html,
    'buyerColor:"#13dc8d"',
    'buyerColor:"#10df77"',
    "flow buyerColor default")

# ── 26. Flow events: seller color default ────────────────────────────────────
html = rep(html,
    'sellerColor:"#ff4a61"',
    'sellerColor:"#ff3037"',
    "flow sellerColor default")

# ── 27. Oscillator price scale labels (cyan -> green, with space) ─────────────
html = rep(html,
    'ctx.fillStyle = "#18d7ff"',
    'ctx.fillStyle = "#10df77"',
    "osc fillStyle #18d7ff (space=)", 4)

# ── 28. Oscillator price scale label (no space around =) ─────────────────────
html = rep(html,
    'ctx.fillStyle="#18d7ff"',
    'ctx.fillStyle="#10df77"',
    "osc fillStyle #18d7ff (no-space=)")

# ── 29. Oscillator price pill: roundRect tx,ty variant ───────────────────────
html = rep(html,
    'roundRect(ctx, tx, ty, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#18d7ff")',
    'roundRect(ctx, tx, ty, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#10df77")',
    "osc roundRect ty variant", 2)

# ── 30. Oscillator price pill: roundRect tx,yy-tagH/2 variant ────────────────
html = rep(html,
    'roundRect(ctx, tx, yy-tagH/2, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#18d7ff")',
    'roundRect(ctx, tx, yy-tagH/2, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#10df77")',
    "osc roundRect yy-tagH/2 variant", 3)

# ── 31. Audit: update script id + A1 version + A2 title ──────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0714_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.714"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.714\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.714")===-1) blockers.push("A2: title missing 0.714");',

    '<script id="DVL_UI_OVERLAY_PHASE_0715_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.715"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.715\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.715")===-1) blockers.push("A2: title missing 0.715");',

    "audit: id + A1 + A2")

# ── 32. Audit: add A45-A49 + N=49 + name 0715 ────────────────────────────────
html = rep(html,
    'var N=44, name="DVL_UI_OVERLAY_PHASE_0714_AUDIT_MODULE";',

    '// A45. DVL_715_VISUAL_CSS style block present\n'
    'if(!document.getElementById("DVL_715_VISUAL_CSS")) blockers.push("A45: DVL_715_VISUAL_CSS style block missing");\n'
    '// A46. CSS --green token override applied\n'
    '(function(){try{var v=getComputedStyle(document.documentElement).getPropertyValue("--green").trim();if(v!=="#10df77")warnings.push("A46: --green CSS token is "+v+" (expected #10df77)");}catch(_e){}})();\n'
    '// A47. setCandleMode reachable (chart engine intact)\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A47: setCandleMode missing — chart engine altered");\n'
    '// A48. visibleWindow reachable (engine intact)\n'
    'if(typeof visibleWindow!=="function"&&typeof window.visibleWindow!=="function") warnings.push("A48: visibleWindow not reachable");\n'
    '// A49. Header bridge still present (frozen header guard)\n'
    'if(!document.querySelector("#DVL_UI_OVERLAY_PHASE_1B .dvl1b-card")) warnings.push("A49: dvl1b-card missing — header may have been altered");\n'
    '\n'
    'var N=49, name="DVL_UI_OVERLAY_PHASE_0715_AUDIT_MODULE";',

    "audit: A45-A49 + N=49 + name 0715")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count("\n") + 1
print(f"\n=== Done — {lines} lines ===")
