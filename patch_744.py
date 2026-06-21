#!/usr/bin/env python3
"""patch_744.py — Beta 0.744: reset CSS static; dropdown moves to body."""
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

print("=== patch_744.py — Beta 0.744 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.743</title>',
    '<title>DVL Binance Live — Beta 0.744</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.743";',
    'const DVL_APP_VERSION = "Beta 0.744";', "version const")

html = rep(html,
    '>BETA 0.743</span>',
    '>BETA 0.744</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.743 — reset fills pill height as square; symbol dropdown via pure JS." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.744 — reset CSS static; symbol dropdown moves to body to escape display:none parent." },\n  { version: "Beta 0.743", note: "Beta 0.743 — reset fills pill height as square; symbol dropdown via pure JS." },',
    "changelog")

# ── 2. Audit bump 0743 → 0744 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0743_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0744_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.743"',
    'window.DVL_APP_VERSION==="Beta 0.744"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.743' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.744' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.743")===-1) blockers.push("A2: title missing 0.743")',
    'indexOf("0.744")===-1) blockers.push("A2: title missing 0.744")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0743_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0744_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Reset button: add STATIC CSS in HTML (no JS injection) ────────────────────
# This is bulletproof — applies regardless of wallet module execution
html = rep(html,
    '/* Bottom nav label text */\n'
    '.navItem span,.navItem .navLabel{color:inherit !important}\n'
    '\n'
    '/* asset dropdown: escape hidden .marketRow via same overflow trick */\n',
    '/* Bottom nav label text */\n'
    '.navItem span,.navItem .navLabel{color:inherit !important}\n'
    '\n'
    '/* reset button: static CSS — fills pill height as a square */\n'
    '.dvlDemoReset{background:none!important;border:none!important;'
    'color:var(--orange)!important;opacity:.60!important;cursor:pointer!important;'
    'font-size:16px!important;line-height:1!important;padding:0!important;'
    'display:inline-flex!important;align-items:center!important;'
    'justify-content:center!important;align-self:stretch!important;'
    'aspect-ratio:1/1!important;margin-left:4px!important;}\n'
    '.dvlDemoReset:hover,.dvlDemoReset:active{opacity:1!important;}\n'
    '\n'
    '/* asset dropdown: escape hidden .marketRow via same overflow trick */\n',
    "reset CSS: static in HTML")

# ── 4. Symbol selector: move #assetDropdown to body to escape display:none parent ─
# display:none on parent cascades to ALL children regardless of position:fixed.
# Moving the element out of .marketRow to document.body bypasses this completely.
html = rep(html,
    '  /* ── Symbol button — pure-JS: make .marketRow visible, reposition dropdown fixed ── */\n'
    '  (function(){\n'
    '    var symBtn=document.getElementById("dvl1b_symbolBtn");\n'
    '    if(!symBtn) return;\n'
    '    var dvlDDOpen=false;\n'
    '    var SP=["display","visibility","position","left","top","width","height",\n'
    '            "min-height","padding","margin","border","background","box-shadow",\n'
    '            "overflow","pointer-events","z-index"];\n'
    '    function getMR(){ return document.querySelector(".marketRow"); }\n'
    '    function getDD(){ return document.getElementById("assetDropdown"); }\n'
    '    function showMR(mr){\n'
    '      mr.style.setProperty("display","block","important");\n'
    '      mr.style.setProperty("visibility","hidden","important");\n'
    '      mr.style.setProperty("position","fixed","important");\n'
    '      mr.style.setProperty("left","0","important");\n'
    '      mr.style.setProperty("top","0","important");\n'
    '      mr.style.setProperty("width","0","important");\n'
    '      mr.style.setProperty("height","0","important");\n'
    '      mr.style.setProperty("min-height","0","important");\n'
    '      mr.style.setProperty("padding","0","important");\n'
    '      mr.style.setProperty("margin","0","important");\n'
    '      mr.style.setProperty("border","0","important");\n'
    '      mr.style.setProperty("background","transparent","important");\n'
    '      mr.style.setProperty("box-shadow","none","important");\n'
    '      mr.style.setProperty("overflow","visible","important");\n'
    '      mr.style.setProperty("pointer-events","none","important");\n'
    '      mr.style.setProperty("z-index","99998","important");\n'
    '    }\n'
    '    function hideMR(mr){ SP.forEach(function(p){ mr.style.removeProperty(p); }); }\n'
    '    function posDD(dd){\n'
    '      var r=symBtn.getBoundingClientRect();\n'
    '      dd.style.setProperty("position","fixed","important");\n'
    '      dd.style.setProperty("left",Math.round(r.left)+"px","important");\n'
    '      dd.style.setProperty("top",Math.round(r.bottom+6)+"px","important");\n'
    '      dd.style.setProperty("right","auto","important");\n'
    '      dd.style.setProperty("pointer-events","auto","important");\n'
    '    }\n'
    '    function hideDD(dd){ ["position","left","top","right","pointer-events"].forEach(function(p){ dd.style.removeProperty(p); }); }\n'
    '    function dvlOpen(){\n'
    '      var mr=getMR(), dd=getDD(); if(!mr||!dd) return;\n'
    '      showMR(mr);\n'
    '      try{ if(typeof openAssetDropdown==="function") openAssetDropdown(); }catch(_e){}\n'
    '      posDD(dd);\n'
    '      dvlDDOpen=true;\n'
    '    }\n'
    '    function dvlClose(){\n'
    '      var mr=getMR(), dd=getDD();\n'
    '      try{ if(typeof closeAssetDropdown==="function") closeAssetDropdown(); }catch(_e){}\n'
    '      if(mr) hideMR(mr);\n'
    '      if(dd) hideDD(dd);\n'
    '      dvlDDOpen=false;\n'
    '    }\n'
    '    symBtn.addEventListener("click",function(e){\n'
    '      e.stopPropagation();\n'
    '      if(dvlDDOpen) dvlClose(); else dvlOpen();\n'
    '    },false);\n'
    '    document.addEventListener("click",function(e){\n'
    '      if(!dvlDDOpen) return;\n'
    '      var dd=getDD();\n'
    '      if(dd&&dd.contains(e.target)) return;\n'
    '      if(symBtn.contains(e.target)) return;\n'
    '      dvlClose();\n'
    '    },true);\n'
    '  })();',

    '  /* ── Symbol button — move #assetDropdown to body to escape display:none .marketRow ── */\n'
    '  (function(){\n'
    '    var symBtn=document.getElementById("dvl1b_symbolBtn");\n'
    '    if(!symBtn) return;\n'
    '    var dvlDDOpen=false, ddHome=null;\n'
    '    function getDD(){ return document.getElementById("assetDropdown"); }\n'
    '    function dvlOpen(){\n'
    '      var dd=getDD(); if(!dd) return;\n'
    '      if(!ddHome) ddHome=dd.parentElement;\n'
    '      document.body.appendChild(dd);\n'
    '      try{ if(typeof openAssetDropdown==="function") openAssetDropdown();\n'
    '           else if(window.openAssetDropdown) window.openAssetDropdown(); }catch(_e){}\n'
    '      var r=symBtn.getBoundingClientRect();\n'
    '      dd.style.setProperty("position","fixed","important");\n'
    '      dd.style.setProperty("left",Math.round(r.left)+"px","important");\n'
    '      dd.style.setProperty("top",Math.round(r.bottom+6)+"px","important");\n'
    '      dd.style.setProperty("right","auto","important");\n'
    '      dd.style.setProperty("z-index","999999","important");\n'
    '      dvlDDOpen=true;\n'
    '    }\n'
    '    function dvlClose(){\n'
    '      var dd=getDD();\n'
    '      try{ if(typeof closeAssetDropdown==="function") closeAssetDropdown();\n'
    '           else if(window.closeAssetDropdown) window.closeAssetDropdown(); }catch(_e){}\n'
    '      if(dd){\n'
    '        if(ddHome) ddHome.appendChild(dd);\n'
    '        ["position","left","top","right","z-index"].forEach(function(p){ dd.style.removeProperty(p); });\n'
    '      }\n'
    '      dvlDDOpen=false;\n'
    '    }\n'
    '    symBtn.addEventListener("click",function(e){\n'
    '      e.stopPropagation();\n'
    '      if(dvlDDOpen) dvlClose(); else dvlOpen();\n'
    '    },false);\n'
    '    document.addEventListener("click",function(e){\n'
    '      if(!dvlDDOpen) return;\n'
    '      var dd=getDD();\n'
    '      if(dd&&dd.contains(e.target)) return;\n'
    '      if(symBtn&&symBtn.contains(e.target)) return;\n'
    '      dvlClose();\n'
    '    },true);\n'
    '  })();',
    "symBtn: move dropdown to body")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
