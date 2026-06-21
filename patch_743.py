#!/usr/bin/env python3
"""patch_743.py — Beta 0.743: reset square fill pill; symbol dropdown via pure JS (no :has)."""
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

print("=== patch_743.py — Beta 0.743 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.742</title>',
    '<title>DVL Binance Live — Beta 0.743</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.742";',
    'const DVL_APP_VERSION = "Beta 0.743";', "version const")

html = rep(html,
    '>BETA 0.742</span>',
    '>BETA 0.743</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.742 — reset icon scales with pill; asset dropdown escapes hidden marketRow." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.743 — reset fills pill height as square; symbol dropdown via pure JS." },\n  { version: "Beta 0.742", note: "Beta 0.742 — reset icon scales with pill; asset dropdown escapes hidden marketRow." },',
    "changelog")

# ── 2. Audit bump 0742 → 0743 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0742_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0743_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.742"',
    'window.DVL_APP_VERSION==="Beta 0.743"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.742' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.743' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.742")===-1) blockers.push("A2: title missing 0.742")',
    'indexOf("0.743")===-1) blockers.push("A2: title missing 0.743")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0742_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0743_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Reset button: square that fills pill height, 16px icon ────────────────────
# aspect-ratio:1 makes it as wide as it is tall (pill height)
# background gives it a visible circular disc inside the pill
html = rep(html,
    '"opacity:.60!important;cursor:pointer!important;font-size:1.8em!important;line-height:1!important;"'
    '\n'
    '    "padding:0 4px!important;display:inline-flex!important;align-items:center!important;"'
    '\n'
    '    "align-self:stretch!important;height:100%!important;}"',
    '"opacity:.60!important;cursor:pointer!important;font-size:16px!important;line-height:1!important;"'
    '\n'
    '    "padding:0!important;display:inline-flex!important;align-items:center!important;"'
    '\n'
    '    "justify-content:center!important;align-self:stretch!important;aspect-ratio:1!important;"'
    '\n'
    '    "margin-left:4px!important;}"',
    "dvlDemoReset: square pill-height, 16px icon")

# ── 4. Symbol selector: replace old handler with pure-JS approach ─────────────────
# Old approach used :has() CSS + called toggleAssetDropdown (dropdown stays hidden
# inside display:none .marketRow). New approach manages marketRow visibility via JS.
html = rep(html,
    '  /* ── Symbol button — open/close asset dropdown ── */\n'
    '  var symBtn=document.getElementById("dvl1b_symbolBtn");\n'
    '  if(symBtn) symBtn.addEventListener("click", function(e){\n'
    '    e.stopPropagation();\n'
    '    try{\n'
    '      var willOpen=!(typeof assetDropdownOpen!=="undefined"?assetDropdownOpen:(window.assetDropdownOpen||false));\n'
    '      if(typeof toggleAssetDropdown==="function") toggleAssetDropdown();\n'
    '      else if(window.toggleAssetDropdown) window.toggleAssetDropdown();\n'
    '      if(willOpen){\n'
    '        var r=symBtn.getBoundingClientRect();\n'
    '        var dd=document.getElementById("assetDropdown");\n'
    '        if(dd){\n'
    '          dd.style.setProperty("position","fixed","important");\n'
    '          dd.style.setProperty("left",Math.round(r.left)+"px","important");\n'
    '          dd.style.setProperty("top",Math.round(r.bottom+6)+"px","important");\n'
    '          dd.style.setProperty("right","auto","important");\n'
    '        }\n'
    '      }\n'
    '    }catch(_e){}\n'
    '  }, false);',

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
    "symBtn: pure-JS marketRow + dropdown management")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
