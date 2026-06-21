#!/usr/bin/env python3
"""patch_717.py — Beta 0.717: Bottom Nav 0.728 transplant + final theme lock"""
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

print("=== patch_717.py — Beta 0.717: Bottom Nav transplant + theme lock ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.716</title>',
    '<title>DVL Binance Live — Beta 0.717</title>', "title")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.716";',
    'const DVL_APP_VERSION = "Beta 0.717";', "version const")
html = rep(html,
    '>BETA 0.716</span>',
    '>BETA 0.717</span>', "static badge")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.716 — Global',
    '  { version: DVL_APP_VERSION, note: "Beta 0.717 — Bottom nav visual transplant from 0.728 and final black/green theme lock. Header frozen." },\n  { version: "Beta 0.716", note: "Beta 0.716 — Global',
    "changelog")

# ── 2. Audit: bump to 0717 ────────────────────────────────────────────────────
html = rep(html,
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

    '<script id="DVL_UI_OVERLAY_PHASE_0717_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.717"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.717\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.717")===-1) blockers.push("A2: title missing 0.717");',
    "audit: id + A1 + A2")

html = rep(html,
    'var N=55, name="DVL_UI_OVERLAY_PHASE_0716_AUDIT_MODULE";',

    '// A56. DVL_717_BOTTOM_NAV_0728_TRANSPLANT present\n'
    'if(!document.getElementById("DVL_717_BOTTOM_NAV_0728_TRANSPLANT")) blockers.push("A56: bottom nav transplant style missing");\n'
    '// A57. DVL_717_FINAL_BLACK_GREEN_THEME_LOCK present\n'
    'if(!document.getElementById("DVL_717_FINAL_BLACK_GREEN_THEME_LOCK")) blockers.push("A57: final theme lock style missing");\n'
    '// A58. --cyan locked to #10df77\n'
    '(function(){try{var v=getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim();if(v!=="#10df77")warnings.push("A58: --cyan="+v+" (expected #10df77)");}catch(_e){}})();\n'
    '// A59. navItem.active has no old drop-shadow filter\n'
    '(function(){var el=document.querySelector(".navItem.active");if(el){try{var cs=getComputedStyle(el);if(cs.filter&&cs.filter.indexOf("drop-shadow")!==-1&&cs.filter.indexOf("207,255")!==-1)warnings.push("A59: .navItem.active still has cyan drop-shadow");}catch(_e){}}})();\n'
    '// A60. setCandleMode reachable (chart engine intact)\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A60: setCandleMode missing");\n'
    '\n'
    'var N=60, name="DVL_UI_OVERLAY_PHASE_0717_AUDIT_MODULE";',
    "audit: A56-A60 + N=60 + name 0717")

# ── 3. Insert both style blocks at absolute end of document ───────────────────
# Anchor: the very end just before </body></html>

BOTTOM_NAV_BLOCK = """\
<style id="DVL_717_BOTTOM_NAV_0728_TRANSPLANT">
/* ─── Beta 0.717 — Bottom Nav 0.728 visual transplant ─── */
/* Placed at end of document: wins ALL legacy cascade battles with !important */

/* Floating pill container — final override */
nav.bottomNav,
.bottomNav{
  position:fixed !important;
  left:6px !important;
  right:6px !important;
  bottom:calc(8px + env(safe-area-inset-bottom)) !important;
  width:auto !important;
  height:68px !important;
  padding:0 !important;
  margin:0 !important;
  border-radius:18px !important;
  background:linear-gradient(180deg,rgba(5,14,12,.93),rgba(4,11,10,.97)) !important;
  border:1px solid rgba(145,175,165,.18) !important;
  box-shadow:0 8px 28px rgba(0,0,0,.42),0 0 0 1px rgba(16,223,119,.05) !important;
  display:flex !important;
  align-items:center !important;
  justify-content:stretch !important;
  z-index:200 !important;
  overflow:hidden !important;
}

/* Inner grid */
.bottomNav .navInner,
nav.bottomNav .navInner{
  display:grid !important;
  grid-template-columns:repeat(5,1fr) !important;
  width:100% !important;
  height:100% !important;
  padding:0 5px !important;
  gap:0 !important;
  align-items:center !important;
}

/* Inactive buttons */
.bottomNav .navItem,
nav.bottomNav .navItem{
  position:relative !important;
  display:flex !important;
  flex-direction:column !important;
  align-items:center !important;
  justify-content:center !important;
  gap:3px !important;
  height:52px !important;
  color:#6b7d70 !important;
  font-size:10px !important;
  font-weight:700 !important;
  letter-spacing:.01em !important;
  border-radius:12px !important;
  background:transparent !important;
  border:none !important;
  box-shadow:none !important;
  filter:none !important;
  padding:0 !important;
  margin:0 !important;
  cursor:pointer !important;
  overflow:visible !important;
}

/* SVG icons */
.bottomNav .navItem svg,
nav.bottomNav .navItem svg{
  width:20px !important;
  height:20px !important;
  stroke:currentColor !important;
  fill:none !important;
  stroke-width:1.75 !important;
  stroke-linecap:round !important;
  stroke-linejoin:round !important;
  flex-shrink:0 !important;
  margin:0 !important;
}

/* Label text */
.bottomNav .navItem > span:last-of-type,
nav.bottomNav .navItem > span:last-of-type{
  font-size:9.5px !important;
  font-weight:700 !important;
  color:inherit !important;
  line-height:1 !important;
}

/* ── Active Trade button — elevated green card ── */
.bottomNav #tradeNavBtn,
nav.bottomNav #tradeNavBtn,
.bottomNav .navItem.active,
nav.bottomNav .navItem.active{
  height:62px !important;
  margin-top:-3px !important;
  color:#10df77 !important;
  background:radial-gradient(circle at 50% 18%,rgba(16,223,119,.22),rgba(16,223,119,.07) 58%,rgba(4,12,10,.90)) !important;
  border:1px solid rgba(16,223,119,.58) !important;
  box-shadow:0 0 18px rgba(16,223,119,.16),0 2px 8px rgba(0,0,0,.28) !important;
  border-radius:14px !important;
  filter:none !important;
}

/* Pull glyph (arrow above Trade button) */
.bottomNav .tradePullGlyph,
nav.bottomNav .tradePullGlyph{
  color:#10df77 !important;
  opacity:.85 !important;
}

/* Pull glyph arrow shape */
.bottomNav .tradePullGlyph b,
nav.bottomNav .tradePullGlyph b{
  border-bottom-color:currentColor !important;
}
</style>
"""

FINAL_LOCK_BLOCK = """\
<style id="DVL_717_FINAL_BLACK_GREEN_THEME_LOCK">
/* ─── Beta 0.717 — Final Black/Green Theme Lock ─── */
/* ABSOLUTE LAST style block in document */
/* Locks all CSS variables and neutralizes any residual navy/blue/cyan */

:root{
  --bg0:#020806 !important;
  --bg1:#030d0a !important;
  --bg2:#010504 !important;
  --card:rgba(5,14,12,.92) !important;
  --card2:rgba(7,17,15,.94) !important;
  --panel:rgba(5,14,12,.92) !important;
  --panel-soft:rgba(4,12,10,.68) !important;
  --line:rgba(110,140,130,.16) !important;
  --lineSoft:rgba(145,175,165,.22) !important;
  --grid:rgba(122,155,145,.092) !important;
  --gridSoft:rgba(122,155,145,.055) !important;
  --text:#f4f6f4 !important;
  --muted:#a5aaa9 !important;
  --muted2:#737b79 !important;
  --cyan:#10df77 !important;
  --cyan2:#10df77 !important;
  --accent:#10df77 !important;
  --green:#10df77 !important;
  --accentLine:rgba(16,223,119,.76) !important;
  --red:#ff3037 !important;
  --yellow:#ffd321 !important;
  --orange:#ff9900 !important;
}

/* Trade drawer */
.tradeDrawerSheet{
  background:linear-gradient(180deg,rgba(5,14,12,.97),rgba(3,10,8,.99)) !important;
  border-color:rgba(16,223,119,.18) !important;
}
.tradeDrawerHandle{border-bottom-color:rgba(110,140,130,.16) !important}

/* Panel buttons and metrics */
.panelBtn{background:rgba(7,17,15,.88) !important;border-color:rgba(110,140,130,.18) !important;color:var(--text) !important}
.panelToggle{background:rgba(5,14,12,.82) !important;border-color:rgba(110,140,130,.16) !important}
.panelMetric{background:rgba(5,14,12,.76) !important;border-color:rgba(110,140,130,.14) !important}

/* Order type, number pad, confirms */
.orderTypeMenu,.orderTypeSheet,
.numberPadSheet,.numPadWrap{
  background:rgba(5,14,12,.97) !important;
  border-color:rgba(110,140,130,.18) !important;
}
.numKey,.numPadKey{
  background:rgba(7,17,15,.82) !important;
  border-color:rgba(110,140,130,.14) !important;
  color:var(--text) !important;
}

/* Toast */
.toast,.toastMsg{
  background:rgba(5,14,12,.96) !important;
  border-color:rgba(16,223,119,.24) !important;
  color:var(--text) !important;
}

/* Chart settings panel */
.chartSettingsPanel,[class*="chartSettings"]{
  background:rgba(5,14,12,.97) !important;
  border-color:rgba(110,140,130,.16) !important;
}

/* Indicators dropdown */
#indicatorDropdown,.indicatorDropdown{
  background:linear-gradient(180deg,rgba(5,14,12,.98),rgba(3,10,8,.99)) !important;
  border-color:rgba(16,223,119,.22) !important;
}

/* Drawing tools menu */
#assetToolsMenu{
  background:rgba(5,14,12,.97) !important;
  border-color:rgba(16,223,119,.22) !important;
}

/* Canvas area */
.canvasWrap,#chart{background:#020806 !important}

/* Favorites drawer */
.assetFavoritesSheet{
  background:rgba(5,14,12,.97) !important;
  border-color:rgba(110,140,130,.18) !important;
}
</style>
"""

# Insert both blocks just before </body></html>
html = rep(html,
    '\n</body>\n</html>',
    '\n' + BOTTOM_NAV_BLOCK + FINAL_LOCK_BLOCK + '</body>\n</html>',
    "insert nav transplant + final lock before </body>")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count("\n") + 1
print(f"\n=== Done — {lines} lines ===")
