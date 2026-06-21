#!/usr/bin/env python3
"""patch_714.py — Beta 0.714: Chart Body + Bottom Nav Visual Match"""
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

print("=== patch_714.py — Beta 0.714: Chart Body + Bottom Nav Visual Match ===")

# 1. Title
html = rep(html,
    '<title>DVL Binance Live — Beta 0.713</title>',
    '<title>DVL Binance Live — Beta 0.714</title>',
    "title")

# 2. Version const
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.713";',
    'const DVL_APP_VERSION = "Beta 0.714";',
    "version const")

# 3. Static badge (gets overwritten by JS, keep in sync)
html = rep(html,
    '>BETA 0.713</span>',
    '>BETA 0.714</span>',
    "static badge")

# 4. Changelog: add 0.714 entry at top, demote 0.713 to literal string
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.713 — 4-point UI',
    '  { version: DVL_APP_VERSION, note: "Beta 0.714 — Chart Body + Bottom Nav Visual Match: body bg blue->green radial, canvasWrap green borders, bottomNav floating pill (17px radius, green-black gradient, green border), navItem.active green radial + glow (color #10df77), homeLine hidden, app padding-bottom 88px for floating nav clearance. CSS-only; no chart engine changes." },\n  { version: "Beta 0.713", note: "Beta 0.713 — 4-point UI',
    "changelog")

# 5. Insert DVL_714_VISUAL_CSS style block before Phase 1B div
# Anchor: the closing </style> of Phase 1B CSS + the Phase 1B div opening tag
CSS_BLOCK = (
'<style id="DVL_714_VISUAL_CSS">\n'
'/* ─── Beta 0.714 — Chart Body + Bottom Nav Visual Match ─── */\n'
'\n'
'/* 1. Body bg: blue radial -> green-dark */\n'
'html,body{background:radial-gradient(900px 420px at 50% -180px,rgba(11,53,42,.18),transparent 64%),linear-gradient(180deg,var(--bg0),var(--bg1) 46%,#020710) !important}\n'
'\n'
'/* 2. App: bottom clearance for floating nav */\n'
'.app{padding-bottom:calc(88px + env(safe-area-inset-bottom)) !important}\n'
'\n'
'/* 3. canvasWrap: blue borders -> green */\n'
'.canvasWrap{border-top:1px solid rgba(150,180,168,.18) !important;border-bottom:1px solid rgba(150,180,168,.18) !important}\n'
'\n'
'/* 4. bottomNav: floating pill */\n'
'.bottomNav{left:6px !important;right:6px !important;bottom:calc(8px + env(safe-area-inset-bottom)) !important;height:72px !important;padding:0 !important;border-radius:17px !important;background:linear-gradient(180deg,rgba(6,16,14,.88),rgba(4,11,10,.92)) !important;border:1px solid rgba(145,175,165,.14) !important;box-shadow:0 4px 24px rgba(0,0,0,.38),0 0 0 1px rgba(16,223,119,.04) !important;overflow:hidden !important;align-items:center !important}\n'
'\n'
'/* 5. navInner: fill pill width */\n'
'.navInner{width:100% !important;padding:0 6px !important;height:100% !important;align-items:center !important}\n'
'\n'
'/* 6. navItem: taller, muted green-grey */\n'
'.navItem{height:58px !important;color:#6b7d70 !important;border-radius:12px !important}\n'
'\n'
'/* 7. navItem.active: green glow pill */\n'
'.navItem.active{height:64px !important;margin-top:-4px !important;border:1px solid rgba(16,223,119,.65) !important;background:radial-gradient(circle at 50% 15%,rgba(16,223,119,.20),rgba(16,223,119,.06) 55%,rgba(5,14,12,.80)) !important;color:#10df77 !important;box-shadow:0 0 22px rgba(16,223,119,.14) !important;filter:none !important;border-radius:13px !important}\n'
'\n'
'/* 8. Hide iOS home indicator bar */\n'
'.homeLine{display:none !important}\n'
'</style>\n'
)

html = rep(html,
    '</style>\n<div id="DVL_UI_OVERLAY_PHASE_1B" data-dvl-overlay-phase="1B" aria-label="DVL new UI (phase 1B, visual)">',
    CSS_BLOCK + '<div id="DVL_UI_OVERLAY_PHASE_1B" data-dvl-overlay-phase="1B" aria-label="DVL new UI (phase 1B, visual)">',
    "insert DVL_714_VISUAL_CSS")

# 6. Audit: update script id + A1 version check + A2 title check
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0713_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.713"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.713\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.713")===-1) blockers.push("A2: title missing 0.713");',

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

    "audit: id + A1 + A2")

# 7. Audit: add A40-A44, update N=44 and name
html = rep(html,
    'var N=39, name="DVL_UI_OVERLAY_PHASE_0713_AUDIT_MODULE";',

    '// A40. DVL_714_VISUAL_CSS style block present\n'
    'if(!document.getElementById("DVL_714_VISUAL_CSS")) blockers.push("A40: DVL_714_VISUAL_CSS style block missing");\n'
    '// A41. bottomNav floating pill: border-radius rule detected\n'
    '(function(){var found=false;try{var ss=document.styleSheets;for(var si=0;si<ss.length;si++){try{var rules=ss[si].cssRules||[];for(var ri=0;ri<rules.length;ri++){var r=rules[ri];if(r.selectorText&&r.selectorText===".bottomNav"&&r.style&&r.style.borderRadius){found=true;break;}}if(found)break;}catch(_ie){}}}catch(_e){}if(!found)warnings.push("A41: .bottomNav border-radius override not detected");})();\n'
    '// A42. homeLine hidden\n'
    '(function(){var el=document.querySelector(".homeLine");if(el){try{var cs=getComputedStyle(el);if(cs.display!=="none")warnings.push("A42: .homeLine not hidden (display:none not applied)");}catch(_e){}}})();\n'
    '// A43. canvasWrap green border (not blue)\n'
    '(function(){var el=document.querySelector(".canvasWrap");if(el){try{var cs=getComputedStyle(el);if(cs.borderTopColor&&cs.borderTopColor.indexOf("64, 105")!==-1)warnings.push("A43: .canvasWrap still has blue border color");}catch(_e){}}})();\n'
    '// A44. chart engine intact (setCandleMode still reachable)\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A44: setCandleMode missing (chart engine altered)");\n'
    '\n'
    'var N=44, name="DVL_UI_OVERLAY_PHASE_0714_AUDIT_MODULE";',

    "audit: A40-A44 + N=44 + name 0714")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count("\n") + 1
print(f"\n=== Done — {lines} lines ===")
