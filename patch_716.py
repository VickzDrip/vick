#!/usr/bin/env python3
"""patch_716.py — Beta 0.716: Global navy/blue/cyan theme removal"""
import re, sys

PATH = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label, expect=1):
    count = html.count(old)
    if count != expect:
        print(f"ABORT [{label}] — expected {expect} occ, got {count}")
        sys.exit(1)
    html = html.replace(old, new, expect)
    print(f"  OK: {label}")
    return html

def css_rep(html, old, new, label=None):
    """Replace old→new ONLY inside <style>...</style> blocks."""
    result = []
    pos = 0
    total = 0
    for m in re.finditer(r'(<style[^>]*>)(.*?)(</style>)', html, re.DOTALL):
        result.append(html[pos:m.start()])
        o, content, c = m.group(1), m.group(2), m.group(3)
        n = content.count(old)
        total += n
        result.append(o + content.replace(old, new) + c)
        pos = m.end()
    result.append(html[pos:])
    tag = label or f"{old[:30]} -> {new[:20]}"
    print(f"  CSS({total:3d}): {tag}")
    return ''.join(result), total

with open(PATH, encoding='utf-8') as f:
    html = f.read()

print("=== patch_716.py — Beta 0.716: Global navy/blue/cyan removal ===")
grand_total = 0

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.715</title>',
    '<title>DVL Binance Live — Beta 0.716</title>', "title")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.715";',
    'const DVL_APP_VERSION = "Beta 0.716";', "version const")
html = rep(html,
    '>BETA 0.715</span>',
    '>BETA 0.716</span>', "static badge")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.715 — Global',
    '  { version: DVL_APP_VERSION, note: "Beta 0.716 — Global removal of legacy navy/blue/cyan theme residues, unified black/green DVL theme across chart body, price scale, bottom nav, drawers and panels. Header frozen." },\n  { version: "Beta 0.715", note: "Beta 0.715 — Global',
    "changelog")

# ── 2. Insert DVL_716_THEME_CSS (new :root tokens + targeted overrides) ───────
CSS_716 = (
'<style id="DVL_716_THEME_CSS">\n'
'/* ─── Beta 0.716 — Global black/green token unification ─── */\n'
'\n'
'/* Override all legacy CSS variables to green/black DVL theme.\n'
'   Setting --cyan/#--cyan2 here kills every var(--cyan) usage globally. */\n'
':root{\n'
'  --bg0:#020806;\n'
'  --bg1:#030d0a;\n'
'  --bg2:#010504;\n'
'  --card:rgba(5,14,12,.92);\n'
'  --card2:rgba(7,17,15,.94);\n'
'  --panel:rgba(5,14,12,.92);\n'
'  --panel-soft:rgba(4,12,10,.68);\n'
'  --line:rgba(110,140,130,.16);\n'
'  --lineSoft:rgba(145,175,165,.10);\n'
'  --grid:rgba(122,155,145,.092);\n'
'  --gridSoft:rgba(122,155,145,.055);\n'
'  --text:#f4f6f4;\n'
'  --muted:#a5aaa9;\n'
'  --muted2:#737b79;\n'
'  --accent:#10df77;\n'
'  --green:#10df77;\n'
'  --cyan:#10df77;\n'
'  --cyan2:rgba(16,223,119,.76);\n'
'  --accentLine:rgba(16,223,119,.76);\n'
'  --red:#ff3037;\n'
'  --yellow:#ffd321;\n'
'  --orange:#ff9900;\n'
'  --shadow:0 18px 50px rgba(0,0,0,.40);\n'
'}\n'
'\n'
'/* Trade drawer: navy -> green-black */\n'
'.tradeDrawerSheet{\n'
'  background:linear-gradient(180deg,rgba(5,14,12,.97),rgba(3,10,8,.99)) !important;\n'
'  border-color:rgba(16,223,119,.18) !important;\n'
'}\n'
'.tradeDrawerHandle{border-bottom-color:rgba(110,140,130,.16) !important}\n'
'\n'
'/* Trade pull glyph: cyan -> green */\n'
'.tradePullGlyph{color:#10df77 !important}\n'
'\n'
'/* Generic dark panels / modals with navy remnants */\n'
'.numPad,.numPadWrap,[id*="numPad"],[class*="numPad"]{\n'
'  background:rgba(5,14,12,.96) !important;\n'
'  border-color:rgba(110,140,130,.16) !important;\n'
'}\n'
'.numKey,[class*="numKey"]{\n'
'  background:rgba(7,17,15,.80) !important;\n'
'  border-color:rgba(110,140,130,.14) !important;\n'
'  color:var(--text) !important;\n'
'}\n'
'\n'
'/* Order type / confirm panels */\n'
'[class*="orderType"],[class*="confirmBox"],[class*="pendingBox"]{\n'
'  background:rgba(5,14,12,.96) !important;\n'
'  border-color:rgba(110,140,130,.16) !important;\n'
'}\n'
'\n'
'/* Toast / snackbar */\n'
'.toast,.toastMsg,[class*="toast"]{\n'
'  background:rgba(5,14,12,.96) !important;\n'
'  border-color:rgba(16,223,119,.22) !important;\n'
'}\n'
'\n'
'/* Chart settings panel */\n'
'[class*="chartSettings"],[id*="chartSettings"]{\n'
'  background:rgba(5,14,12,.96) !important;\n'
'  border-color:rgba(110,140,130,.16) !important;\n'
'}\n'
'\n'
'/* Bottom nav inactive items: muted green-grey */\n'
'.navItem{color:#6b7d70 !important}\n'
'\n'
'/* Bottom nav svg icons inherit currentColor (no forced blue) */\n'
'.navItem svg{stroke:currentColor !important}\n'
'\n'
'/* Bottom nav label text */\n'
'.navItem span,.navItem .navLabel{color:inherit !important}\n'
'</style>\n'
)

html = rep(html,
    '</style>\n<div id="DVL_UI_OVERLAY_PHASE_1B" data-dvl-overlay-phase="1B" aria-label="DVL new UI (phase 1B, visual)">',
    CSS_716 + '<div id="DVL_UI_OVERLAY_PHASE_1B" data-dvl-overlay-phase="1B" aria-label="DVL new UI (phase 1B, visual)">',
    "insert DVL_716_THEME_CSS")

# ── 3. Global CSS color replacements (only inside <style> blocks) ─────────────
print("\n-- CSS color replacements --")

# ── 3a. Cyan/blue hex colors → green ─────────────────────────────────────────
html, n = css_rep(html, '#18d7ff', '#10df77', '#18d7ff → #10df77'); grand_total += n
html, n = css_rep(html, '#00a7df', '#0bb864', '#00a7df → #0bb864'); grand_total += n
html, n = css_rep(html, '#21dfff', '#10df77', '#21dfff → #10df77'); grand_total += n
html, n = css_rep(html, '#23e6d7', '#10df77', '#23e6d7 → #10df77'); grand_total += n
html, n = css_rep(html, '#2bdcff', '#10df77', '#2bdcff → #10df77'); grand_total += n
html, n = css_rep(html, '#28b6ff', '#10df77', '#28b6ff → #10df77'); grand_total += n
html, n = css_rep(html, '#29c9ec', '#10df77', '#29c9ec → #10df77'); grand_total += n
html, n = css_rep(html, '#9eeeff', '#b0f5d8', '#9eeeff → #b0f5d8'); grand_total += n

# ── 3b. Cyan/blue rgba → green-grey ──────────────────────────────────────────
html, n = css_rep(html, 'rgba(24,215,255,', 'rgba(16,223,119,', 'rgba(24,215,255,...)'); grand_total += n
html, n = css_rep(html, 'rgba(0,207,255,',  'rgba(16,223,119,', 'rgba(0,207,255,...)');  grand_total += n
html, n = css_rep(html, 'rgba(0,196,255,',  'rgba(16,223,119,', 'rgba(0,196,255,...)');  grand_total += n
html, n = css_rep(html, 'rgba(33,223,255,', 'rgba(16,223,119,', 'rgba(33,223,255,...)'); grand_total += n
html, n = css_rep(html, 'rgba(35,230,215,', 'rgba(16,223,119,', 'rgba(35,230,215,...)'); grand_total += n
html, n = css_rep(html, 'rgba(0,184,255,',  'rgba(16,223,119,', 'rgba(0,184,255,...)');  grand_total += n

# ── 3c. Blue-grey rgba borders → green-grey ──────────────────────────────────
html, n = css_rep(html, 'rgba(42,165,217,',  'rgba(110,140,130,', 'rgba(42,165,217,...)');  grand_total += n
html, n = css_rep(html, 'rgba(62,120,170,',  'rgba(110,140,130,', 'rgba(62,120,170,...)');  grand_total += n
html, n = css_rep(html, 'rgba(70,116,162,',  'rgba(110,140,130,', 'rgba(70,116,162,...)');  grand_total += n
html, n = css_rep(html, 'rgba(72,128,172,',  'rgba(110,140,130,', 'rgba(72,128,172,...)');  grand_total += n
html, n = css_rep(html, 'rgba(64,105,145,',  'rgba(122,155,145,', 'rgba(64,105,145,...)');  grand_total += n

# ── 3d. Navy dark hex backgrounds → green-dark ───────────────────────────────
html, n = css_rep(html, '#030814', '#020806', '#030814 → #020806'); grand_total += n
html, n = css_rep(html, '#050d1a', '#030d0a', '#050d1a → #030d0a'); grand_total += n
html, n = css_rep(html, '#02050b', '#020806', '#02050b → #020806'); grand_total += n
html, n = css_rep(html, '#02060c', '#020806', '#02060c → #020806'); grand_total += n
html, n = css_rep(html, '#06111f', '#03100c', '#06111f → #03100c'); grand_total += n
html, n = css_rep(html, '#081728', '#040e0c', '#081728 → #040e0c'); grand_total += n

# ── 3e. Navy rgba backgrounds → green-dark ────────────────────────────────────
html, n = css_rep(html, 'rgba(3,8,15,',   'rgba(3,8,6,',    'rgba(3,8,15,...) nav bg');   grand_total += n
html, n = css_rep(html, 'rgba(5,16,30,',  'rgba(5,14,12,',  'rgba(5,16,30,...) panel bg'); grand_total += n
html, n = css_rep(html, 'rgba(3,10,19,',  'rgba(3,10,8,',   'rgba(3,10,19,...) panel bg'); grand_total += n
html, n = css_rep(html, 'rgba(8,20,34,',  'rgba(7,18,14,',  'rgba(8,20,34,...) panel bg'); grand_total += n
html, n = css_rep(html, 'rgba(8,19,34,',  'rgba(7,17,14,',  'rgba(8,19,34,...) panel bg'); grand_total += n
html, n = css_rep(html, 'rgba(10,20,35,', 'rgba(8,17,14,',  'rgba(10,20,35,...)');        grand_total += n
html, n = css_rep(html, 'rgba(10,21,36,', 'rgba(8,18,14,',  'rgba(10,21,36,...)');        grand_total += n
html, n = css_rep(html, 'rgba(5,18,33,',  'rgba(5,15,12,',  'rgba(5,18,33,...)');         grand_total += n
html, n = css_rep(html, 'rgba(6,18,32,',  'rgba(5,14,12,',  'rgba(6,18,32,...) dark navy'); grand_total += n

print(f"\n  Total CSS replacements: {grand_total}")

# ── 4. Audit: update to 0716 ──────────────────────────────────────────────────
print("\n-- Audit module --")
html = rep(html,
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

    '<script id="DVL_UI_OVERLAY_PHASE_0716_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.716"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.716\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.716")===-1) blockers.push("A2: title missing 0.716");',
    "audit: id + A1 + A2")

html = rep(html,
    'var N=49, name="DVL_UI_OVERLAY_PHASE_0715_AUDIT_MODULE";',

    '// A50. DVL_716_THEME_CSS present\n'
    'if(!document.getElementById("DVL_716_THEME_CSS")) blockers.push("A50: DVL_716_THEME_CSS missing");\n'
    '// A51. --cyan token overridden to green\n'
    '(function(){try{var v=getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim();if(v!=="#10df77")warnings.push("A51: --cyan="+v+" (expected #10df77)");}catch(_e){}})();\n'
    '// A52. --bg0 overridden to green-dark\n'
    '(function(){try{var v=getComputedStyle(document.documentElement).getPropertyValue("--bg0").trim();if(v!=="#020806")warnings.push("A52: --bg0="+v+" (expected #020806)");}catch(_e){}})();\n'
    '// A53. Trade drawer DOM still present (not removed)\n'
    'if(!document.querySelector(".tradeDrawer")) warnings.push("A53: .tradeDrawer not found in DOM");\n'
    '// A54. setCandleMode still reachable (chart engine intact)\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A54: setCandleMode missing");\n'
    '// A55. Header Phase 1B overlay intact\n'
    'if(!document.getElementById("DVL_UI_OVERLAY_PHASE_1B")) blockers.push("A55: DVL_UI_OVERLAY_PHASE_1B missing (header removed!)");\n'
    '\n'
    'var N=55, name="DVL_UI_OVERLAY_PHASE_0716_AUDIT_MODULE";',
    "audit: A50-A55 + N=55 + name 0716")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count("\n") + 1
print(f"\n=== Done — {lines} lines, {grand_total} CSS color replacements ===")
