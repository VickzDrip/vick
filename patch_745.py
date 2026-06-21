#!/usr/bin/env python3
"""patch_745.py — Beta 0.745: dropdown full-width on mobile, clamped on desktop."""
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

print("=== patch_745.py — Beta 0.745 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.744</title>',
    '<title>DVL Binance Live — Beta 0.745</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.744";',
    'const DVL_APP_VERSION = "Beta 0.745";', "version const")

html = rep(html,
    '>BETA 0.744</span>',
    '>BETA 0.745</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.744 — reset CSS static; symbol dropdown moves to body to escape display:none parent." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.745 — symbol dropdown: full-width on mobile, clamped on desktop." },\n  { version: "Beta 0.744", note: "Beta 0.744 — reset CSS static; symbol dropdown moves to body to escape display:none parent." },',
    "changelog")

# ── 2. Audit bump 0744 → 0745 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0744_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0745_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.744"',
    'window.DVL_APP_VERSION==="Beta 0.745"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.744' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.745' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.744")===-1) blockers.push("A2: title missing 0.744")',
    'indexOf("0.745")===-1) blockers.push("A2: title missing 0.745")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0744_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0745_AUDIT_MODULE";',
    "audit name bump")

# ── 3. symBtn: fix dropdown position — full-width on mobile, button-aligned on desktop ─
# On mobile (vw < 600) use left:8px right:8px width:auto so it doesn't overflow.
# On desktop align left to button position.
# Also clear 'width' on close.
html = rep(html,
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
    '    }',

    '      var r=symBtn.getBoundingClientRect();\n'
    '      var vw=window.innerWidth;\n'
    '      dd.style.setProperty("position","fixed","important");\n'
    '      dd.style.setProperty("top",Math.round(r.bottom+6)+"px","important");\n'
    '      dd.style.setProperty("z-index","999999","important");\n'
    '      if(vw<600){\n'
    '        dd.style.setProperty("left","8px","important");\n'
    '        dd.style.setProperty("right","8px","important");\n'
    '        dd.style.setProperty("width","auto","important");\n'
    '      } else {\n'
    '        var left=Math.round(r.left);\n'
    '        dd.style.setProperty("left",left+"px","important");\n'
    '        dd.style.setProperty("right","auto","important");\n'
    '        dd.style.setProperty("width","auto","important");\n'
    '      }\n'
    '      dvlDDOpen=true;\n'
    '    }\n'
    '    function dvlClose(){\n'
    '      var dd=getDD();\n'
    '      try{ if(typeof closeAssetDropdown==="function") closeAssetDropdown();\n'
    '           else if(window.closeAssetDropdown) window.closeAssetDropdown(); }catch(_e){}\n'
    '      if(dd){\n'
    '        if(ddHome) ddHome.appendChild(dd);\n'
    '        ["position","left","top","right","z-index","width"].forEach(function(p){ dd.style.removeProperty(p); });\n'
    '      }\n'
    '      dvlDDOpen=false;\n'
    '    }',
    "symBtn: full-width mobile, clamped desktop")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
