#!/usr/bin/env python3
"""patch_742.py — Beta 0.742: fix reset icon scale; fix asset dropdown visibility."""
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

print("=== patch_742.py — Beta 0.742 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.741</title>',
    '<title>DVL Binance Live — Beta 0.742</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.741";',
    'const DVL_APP_VERSION = "Beta 0.742";', "version const")

html = rep(html,
    '>BETA 0.741</span>',
    '>BETA 0.742</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.741 — gear icon fixed; settings panel wired to chart settings." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.742 — reset icon scales with pill; asset dropdown escapes hidden marketRow." },\n  { version: "Beta 0.741", note: "Beta 0.741 — gear icon fixed; settings panel wired to chart settings." },',
    "changelog")

# ── 2. Audit bump 0741 → 0742 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0741_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0742_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.741"',
    'window.DVL_APP_VERSION==="Beta 0.742"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.741' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.742' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.741")===-1) blockers.push("A2: title missing 0.741")',
    'indexOf("0.742")===-1) blockers.push("A2: title missing 0.742")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0741_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0742_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Reset icon: font-size 16px → 1.8em so it scales with the pill ─────────────
# (pill font-size: 12px base / 8.5px medium / 7.2px small)
# 1.8em → 21.6px / 15.3px / 12.96px — fills the pill proportionally
html = rep(html,
    '"opacity:.60!important;cursor:pointer!important;font-size:16px!important;line-height:1!important;"',
    '"opacity:.60!important;cursor:pointer!important;font-size:1.8em!important;line-height:1!important;"',
    "dvlDemoReset: font-size 16px → 1.8em")

# ── 4. CSS: escape assetDropdown from hidden .marketRow ──────────────────────────
# Same overflow:visible trick used for indicators and chart settings.
# :has() is already used in 0.741 (chartSettingsPanel) — confirmed working.
html = rep(html,
    '/* settings via new header: expose toolbar overflow so panel can escape display:none */\n'
    'html.dvl-ui-1b-active .chartCard>.toolbar:has(#chartSettingsPanel.is-open){',
    '/* asset dropdown: escape hidden .marketRow via same overflow trick */\n'
    'html.dvl-ui-1b-active .marketRow:has(#assetDropdown.is-open){'
    'display:block!important;visibility:hidden!important;position:fixed!important;'
    'left:0!important;top:0!important;width:0!important;height:0!important;'
    'min-height:0!important;padding:0!important;margin:0!important;'
    'border:0!important;background:transparent!important;box-shadow:none!important;'
    'overflow:visible!important;pointer-events:none!important;z-index:99998!important;}\n'
    'html.dvl-ui-1b-active #assetDropdown.is-open{'
    'pointer-events:auto!important;}\n'
    '\n'
    '/* settings via new header: expose toolbar overflow so panel can escape display:none */\n'
    'html.dvl-ui-1b-active .chartCard>.toolbar:has(#chartSettingsPanel.is-open){',
    "CSS: assetDropdown escapes marketRow")

# ── 5. Bridge symBtn: reposition dropdown fixed under the symbol button ───────────
html = rep(html,
    '  var symBtn=document.getElementById("dvl1b_symbolBtn");\n'
    '  if(symBtn) symBtn.addEventListener("click", function(e){\n'
    '    e.stopPropagation();\n'
    '    try{ if(typeof toggleAssetDropdown==="function") toggleAssetDropdown(); else if(window.toggleAssetDropdown) window.toggleAssetDropdown(); }catch(_e){}\n'
    '  }, false);',
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
    "symBtn: reposition dropdown fixed under button")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
