#!/usr/bin/env python3
"""patch_719.py — Beta 0.719: Trade btn visual fix, drawer-over-footer fix,
compact chart corner controls, and switchRow/toggle blue purge."""
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

print("=== patch_719.py — Beta 0.719 ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.718</title>',
    '<title>DVL Binance Live — Beta 0.719</title>',
    "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.718";',
    'const DVL_APP_VERSION = "Beta 0.719";',
    "version const")

html = rep(html,
    '>BETA 0.718</span>',
    '>BETA 0.719</span>',
    "static badge")

html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.718 — real bottom nav button transplant from 0.728, chart corner controls aligned, removed dead space above footer, and final blue/cyan purge across switches, toggles, keypads, tools and panels." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.719 — fixed Trade footer button visual, prevented trade panel from overlapping bottom nav, restored compact chart corner controls, and removed remaining blue/cyan toggles." },\n  { version: "Beta 0.718", note: "Beta 0.718 — real bottom nav button transplant from 0.728, chart corner controls aligned, removed dead space above footer, and final blue/cyan purge across switches, toggles, keypads, tools and panels." },',
    "changelog")

# ── 2. Audit: bump to 0719, A66-A70, N=70 ────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0718_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.718"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.718\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.718")===-1) blockers.push("A2: title missing 0.718");',

    '<script id="DVL_UI_OVERLAY_PHASE_0719_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.719"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.719\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.719")===-1) blockers.push("A2: title missing 0.719");',
    "audit: id + A1 + A2")

html = rep(html,
    'var N=65, name="DVL_UI_OVERLAY_PHASE_0718_AUDIT_MODULE";',

    '// A66. DVL_719_TRADE_BTN_FIX style block present\n'
    'if(!document.getElementById("DVL_719_TRADE_BTN_FIX")) blockers.push("A66: DVL_719_TRADE_BTN_FIX missing");\n'
    '// A67. DVL_719_DRAWER_FIX style block present\n'
    'if(!document.getElementById("DVL_719_DRAWER_FIX")) blockers.push("A67: DVL_719_DRAWER_FIX missing");\n'
    '// A68. Trade drawer not covering bottom nav (bottom >= 70px)\n'
    '(function(){var d=document.querySelector(".tradeDrawer");if(d){try{var b=getComputedStyle(d).bottom;var bpx=parseFloat(b);if(bpx<70)warnings.push("A68: .tradeDrawer bottom="+b+" — may overlap bottom nav");}catch(_e){}}\n'
    'else warnings.push("A68: .tradeDrawer not found");})();\n'
    '// A69. switchRow toggle not blue (checked + i background is not blue gradient)\n'
    '(function(){var found=false;try{var ss=document.styleSheets;for(var si=0;si<ss.length;si++){try{var rules=ss[si].cssRules||[];for(var ri=0;ri<rules.length;ri++){var r=rules[ri];if(r.selectorText&&r.selectorText.indexOf("switchRow")!==-1&&r.selectorText.indexOf("checked")!==-1&&r.style&&r.style.background&&r.style.background.indexOf("0e8fd8")!==-1){found=true;break;}}if(found)break;}catch(_ie){}}}catch(_e){}if(found)warnings.push("A69: switchRow still has navy-blue gradient in checked state");})();\n'
    '// A70. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A70: setCandleMode missing (chart engine altered)");\n'
    '\n'
    'var N=70, name="DVL_UI_OVERLAY_PHASE_0719_AUDIT_MODULE";',
    "audit: A66-A70 + N=70 + name 0719")

# ── 3. Insert CSS fix blocks at end of document ───────────────────────────────

TRADE_BTN_BLOCK = """\
<style id="DVL_719_TRADE_BTN_FIX">
/* ─── Beta 0.719 — Trade button visual fix ─── */
/* Problem in 0.718: tradePullGlyph b had CSS triangle borders PLUS ::before content
   = double visual. Fix: hide tradePullGlyph entirely, inject ↑↓ via button ::before. */

/* Hide entire tradePullGlyph (triangle + text) */
.bottomNav .tradePullGlyph,
nav.bottomNav .tradePullGlyph{
  display:none !important;
}

/* Clean ↑↓ via #tradeNavBtn::before — avoids all triangle CSS conflicts */
.bottomNav #tradeNavBtn::before,
nav.bottomNav #tradeNavBtn::before{
  content:"↑↓" !important;
  display:block !important;
  font-size:17px !important;
  font-weight:600 !important;
  line-height:.7 !important;
  letter-spacing:-.04em !important;
  color:inherit !important;
  text-align:center !important;
  margin-bottom:1px !important;
}

/* Keep old swap-arrows SVG hidden (set in 0.718, confirmed here) */
.bottomNav #tradeNavBtn > svg,
nav.bottomNav #tradeNavBtn > svg{
  display:none !important;
}

/* Active Trade button proportions (match 0.728) */
.bottomNav #tradeNavBtn,
nav.bottomNav #tradeNavBtn{
  display:flex !important;
  flex-direction:column !important;
  align-items:center !important;
  justify-content:center !important;
  gap:2px !important;
}

/* Non-trade navItem: no ::before content leaks */
.bottomNav .navItem:not(#tradeNavBtn)::before,
nav.bottomNav .navItem:not(#tradeNavBtn)::before{
  content:none !important;
  display:none !important;
}
</style>
"""

DRAWER_FIX_BLOCK = """\
<style id="DVL_719_DRAWER_FIX">
/* ─── Beta 0.719 — Trade drawer must not cover bottom nav ─── */
/* Bottom nav occupies: bottom:8px + height:68px = 8 to 76px from screen bottom.
   Drawer bottom must be >= 76px so its sheet always stays above the nav. */

.tradeDrawer{
  bottom:calc(78px + env(safe-area-inset-bottom)) !important;
  z-index:9980 !important;
}

.tradeDrawer.is-open{
  pointer-events:auto !important;
}

/* Bottom nav: always above trade drawer even without runtime paper CSS */
nav.bottomNav,
.bottomNav{
  z-index:20000 !important;
}
</style>
"""

CORNER_FIX_BLOCK = """\
<style id="DVL_719_CHART_CORNER_COMPACT">
/* ─── Beta 0.719 — Chart corner controls: compact 26px ─── */
/* 0.718 used 38px which was too large. 26px matches 0.728 reference (27px).
   Two buttons side-by-side: 26+26+6=58px — fits within 70px price scale column. */

.chartScaleControls{
  position:absolute !important;
  right:2px !important;
  bottom:4px !important;
  width:58px !important;
  height:26px !important;
  display:grid !important;
  grid-template-columns:26px 26px !important;
  gap:6px !important;
  z-index:35 !important;
  pointer-events:auto !important;
}

.chartMiniBtn{
  width:26px !important;
  height:26px !important;
  min-width:26px !important;
  min-height:26px !important;
  border-radius:8px !important;
  border:1px solid rgba(110,140,130,.28) !important;
  background:linear-gradient(180deg,rgba(5,14,12,.92),rgba(3,10,8,.96)) !important;
  color:#a5aaa9 !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  box-shadow:0 2px 8px rgba(0,0,0,.24),inset 0 0 0 1px rgba(255,255,255,.02) !important;
}

.chartMiniBtn svg{
  width:15px !important;
  height:15px !important;
  display:block !important;
}

.chartMiniBtn path{
  fill:none !important;
  stroke:currentColor !important;
  stroke-width:2 !important;
  stroke-linecap:round !important;
  stroke-linejoin:round !important;
}

.chartMiniBtn.is-active,
.chartMiniBtn:active{
  color:#10df77 !important;
  border-color:rgba(16,223,119,.55) !important;
  background:
    radial-gradient(circle at 50% 0%,rgba(16,223,119,.18),transparent 58%),
    linear-gradient(180deg,rgba(5,14,12,.92),rgba(3,10,8,.96)) !important;
}
</style>
"""

SWITCH_PURGE_BLOCK = """\
<style id="DVL_719_SWITCH_PURGE">
/* ─── Beta 0.719 — switchRow (Chart Settings) blue/cyan purge ─── */
/* Problem: .switchRow i::after had bg:#dcecff (blue-tint knob)
           .switchRow input:checked + i had bg:linear-gradient(90deg,#0e8fd8,#10df77)
   Fix: pure green-black switch following DVL OFF/ON pattern. */

/* OFF track: dark green-black with green-grey border */
.switchRow i{
  background:rgba(5,14,12,.92) !important;
  border:1px solid rgba(110,140,130,.24) !important;
  box-sizing:border-box !important;
}

/* OFF knob: neutral grey (not blue-tint) */
.switchRow i::after{
  background:#a5aaa9 !important;
  box-shadow:none !important;
}

/* ON track: green tint with green border */
.switchRow input:checked + i{
  background:rgba(16,223,119,.18) !important;
  border-color:rgba(16,223,119,.55) !important;
}

/* ON knob: DVL green */
.switchRow input:checked + i::after{
  background:#10df77 !important;
  box-shadow:0 0 6px rgba(16,223,119,.22) !important;
}

/* Session checkboxes: green accent */
.sessionCheck,
#gridToggle,
#sessionsToggle{
  accent-color:#10df77 !important;
}

/* sessionCountInput: remove navy background */
.sessionCountInput{
  background:rgba(4,12,8,.72) !important;
  color:#d0d8d4 !important;
  border-color:rgba(110,140,130,.28) !important;
}

/* chartSettingRow text: remove blue tint */
.chartSettingRow{
  color:#cdd5d0 !important;
  border-bottom-color:rgba(110,140,130,.13) !important;
}

/* Session dot colors remain intentional (Asia=gold, London=blue(map), NY=green, Sydney=purple)
   Only London dot kept as is — these are geographic identifiers, not theme colors. */
</style>
"""

html = rep(html,
    '\n</body>\n</html>',
    '\n' + TRADE_BTN_BLOCK + DRAWER_FIX_BLOCK + CORNER_FIX_BLOCK + SWITCH_PURGE_BLOCK + '</body>\n</html>',
    "insert 719 CSS blocks before </body>")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
