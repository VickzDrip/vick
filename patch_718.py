#!/usr/bin/env python3
"""patch_718.py — Beta 0.718: Real bottom nav button transplant, chart corner alignment,
dead space removal, and final blue/cyan purge across canvas, JS defaults and CSS."""
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

print("=== patch_718.py — Beta 0.718 ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.717</title>',
    '<title>DVL Binance Live — Beta 0.718</title>',
    "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.717";',
    'const DVL_APP_VERSION = "Beta 0.718";',
    "version const")

html = rep(html,
    '>BETA 0.717</span>',
    '>BETA 0.718</span>',
    "static badge")

html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.717 — Bottom nav visual transplant from 0.728 and final black/green theme lock. Header frozen." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.718 — real bottom nav button transplant from 0.728, chart corner controls aligned, removed dead space above footer, and final blue/cyan purge across switches, toggles, keypads, tools and panels." },\n  { version: "Beta 0.717", note: "Beta 0.717 — Bottom nav visual transplant from 0.728 and final black/green theme lock. Header frozen." },',
    "changelog")

# ── 2. Audit: bump to 0718, A61-A65, N=65 ────────────────────────────────────
html = rep(html,
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
    "audit: id + A1 + A2")

html = rep(html,
    'var N=60, name="DVL_UI_OVERLAY_PHASE_0717_AUDIT_MODULE";',

    '// A61. DVL_718_BOTTOM_NAV_BUTTONS_0728_INLINE present\n'
    'if(!document.getElementById("DVL_718_BOTTOM_NAV_BUTTONS_0728_INLINE")) blockers.push("A61: bottom nav button shell (718) missing");\n'
    '// A62. DVL_718_BLUE_PURGE_CSS present\n'
    'if(!document.getElementById("DVL_718_BLUE_PURGE_CSS")) blockers.push("A62: final blue purge CSS (718) missing");\n'
    '// A63. .app padding-bottom clears footer (>= 76px)\n'
    '(function(){var el=document.querySelector(".app");if(el){try{var pb=parseFloat(getComputedStyle(el).paddingBottom);if(pb<70)warnings.push("A63: .app padding-bottom="+pb+"px — may not fully clear bottom nav");}catch(_e){}}\n'
    'else warnings.push("A63: .app element not found");})();\n'
    '// A64. .dvl-switch border not legacy blue (no rgba(94,135,178))\n'
    '(function(){var el=document.querySelector(".dvl-switch");if(el){try{var bc=getComputedStyle(el).borderTopColor;if(bc&&bc.indexOf("94, 135")!==-1)warnings.push("A64: .dvl-switch still has navy border: "+bc);}catch(_e){}}})();\n'
    '// A65. chart engine intact (setCandleMode reachable)\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A65: setCandleMode missing (chart engine altered)");\n'
    '\n'
    'var N=65, name="DVL_UI_OVERLAY_PHASE_0718_AUDIT_MODULE";',
    "audit: A61-A65 + N=65 + name 0718")

# ── 3. Canvas crosshair: cyan → green ────────────────────────────────────────
html = rep(html,
    'ctx.strokeStyle = "rgba(33,223,255,.68)";',
    'ctx.strokeStyle = "rgba(16,223,119,.52)";',
    "crosshair line stroke cyan->green")

html = rep(html,
    'ctx.fillStyle = "rgba(33,223,255,.98)";',
    'ctx.fillStyle = "rgba(16,223,119,.92)";',
    "crosshair dot fill cyan->green")

html = rep(html,
    'roundRect(ctx, tagX, tagY, tagW, tagH, 6, true, false, "#21dfff");',
    'roundRect(ctx, tagX, tagY, tagW, tagH, 6, true, false, "#10df77");',
    "price label bg cyan->#10df77")

html = rep(html,
    'ctx.fillStyle = "#02111d";',
    'ctx.fillStyle = "#020806";',
    "price label text: navy->green-black")

html = rep(html,
    'roundRect(ctx, boxX, boxY, textW, timeBoxH, 6, true, false, "rgba(6,18,32,.96)");',
    'roundRect(ctx, boxX, boxY, textW, timeBoxH, 6, true, false, "rgba(4,12,8,.96)");',
    "time box bg: navy->green-black")

html = rep(html,
    'ctx.strokeStyle = "rgba(33,223,255,.42)";',
    'ctx.strokeStyle = "rgba(16,223,119,.42)";',
    "time box border stroke cyan->green")

html = rep(html,
    'ctx.fillStyle = "#dff8ff";',
    'ctx.fillStyle = "#f4f6f4";',
    "time box text: cyan-white->neutral")

# ── 4. OFI indicator border ───────────────────────────────────────────────────
html = rep(html,
    'ctx.strokeStyle = "rgba(24,215,255,.22)";',
    'ctx.strokeStyle = "rgba(110,140,130,.22)";',
    "OFI box border cyan->green-grey")

# ── 5. Empty oscillator center dashed line ────────────────────────────────────
html = rep(html,
    'ctx.strokeStyle = "rgba(24,215,255,.24)";',
    'ctx.strokeStyle = "rgba(110,140,130,.24)";',
    "oscillator center line cyan->green-grey",
    expect=2)

# ── 6. Dynamic drawing settings checkbox ─────────────────────────────────────
html = rep(html,
    'accent-color:#00d4ff;width:16px;height:16px;cursor:pointer;',
    'accent-color:#10df77;width:16px;height:16px;cursor:pointer;',
    "dynamic checkbox accent-color->green")

# ── 7. OB level default colors ────────────────────────────────────────────────
html = rep(html,
    '{on:true, name:"Level 1", mult:1, color:"#18d7ff",',
    '{on:true, name:"Level 1", mult:1, color:"#10df77",',
    "OB level 1 default color->green")

html = rep(html,
    '{on:true, name:"Level 2", mult:2, color:"#23e6d7",',
    '{on:true, name:"Level 2", mult:2, color:"#0abe60",',
    "OB level 2 default color->green-alt")

# ── 8. hexToRgba fallback colors ─────────────────────────────────────────────
html = rep(html,
    'if(hex.length !== 6) return "rgba(24,215,255," + alpha + ")";',
    'if(hex.length !== 6) return "rgba(16,223,119," + alpha + ")";',
    "hexToRgbaVT fallback cyan->green")

html = rep(html,
    'if(hex.length !== 6) return "rgba(24,215,255," + a + ")";',
    'if(hex.length !== 6) return "rgba(16,223,119," + a + ")";',
    "rgba() fallback cyan->green")

# ── 9. Drawing tool / trace default color ─────────────────────────────────────
html = rep(html,
    'style.color || "#18d7ff"',
    'style.color || "#10df77"',
    "drawTrace/drawBubble/drawZone default color->green",
    expect=3)

html = rep(html,
    'state[key]||"#18d7ff"',
    'state[key]||"#10df77"',
    "cField default color->green")

# ── 10. Insert CSS blocks at absolute end of document ─────────────────────────

NAV_SHELL_BLOCK = """\
<style id="DVL_718_BOTTOM_NAV_BUTTONS_0728_INLINE">
/* ─── Beta 0.718 — Bottom Nav button visual shell (0.728 style) ─── */
/* Replaces the old tradePullGlyph triangle with ↑↓ arrows, aligns chart controls,
   fixes dead space between time scale and footer. */

/* Trade button: show ↑↓ via tradePullGlyph b::before, hide old swap-SVG */
.bottomNav #tradeNavBtn .tradePullGlyph,
nav.bottomNav #tradeNavBtn .tradePullGlyph{
  display:flex !important;
  flex-direction:column !important;
  align-items:center !important;
  justify-content:center !important;
  height:22px !important;
  font-size:17px !important;
  font-weight:600 !important;
  line-height:.65 !important;
  letter-spacing:-.03em !important;
  color:inherit !important;
  opacity:1 !important;
}

.bottomNav #tradeNavBtn .tradePullGlyph b,
nav.bottomNav #tradeNavBtn .tradePullGlyph b{
  display:block !important;
  font-style:normal !important;
  font-weight:600 !important;
  color:inherit !important;
  font-size:18px !important;
}

.bottomNav #tradeNavBtn .tradePullGlyph b::before,
nav.bottomNav #tradeNavBtn .tradePullGlyph b::before{
  content:"↑↓" !important;
  display:block !important;
}

/* Hide the old swap-arrows SVG inside tradeNavBtn (keep only tradePullGlyph + label) */
.bottomNav #tradeNavBtn > svg,
nav.bottomNav #tradeNavBtn > svg{
  display:none !important;
}

/* Nav item SVGs: unified icon sizing + stroke style */
.bottomNav .navItem svg,
nav.bottomNav .navItem svg{
  width:22px !important;
  height:22px !important;
  stroke:currentColor !important;
  fill:none !important;
  stroke-width:1.8 !important;
  stroke-linecap:round !important;
  stroke-linejoin:round !important;
  flex:0 0 auto !important;
}

/* Nav item label text */
.bottomNav .navItem > span:last-of-type,
nav.bottomNav .navItem > span:last-of-type{
  font-size:10px !important;
  font-weight:700 !important;
  color:inherit !important;
  line-height:1 !important;
  letter-spacing:.01em !important;
}

/* App bottom clearance: nav 68px + bottom 8px + 2px margin = 78px */
.app{
  padding-bottom:calc(78px + env(safe-area-inset-bottom)) !important;
}

/* canvasWrap: no extra bottom margin/padding that creates dead space */
.canvasWrap{
  margin-bottom:0 !important;
  padding-bottom:0 !important;
}

/* homeLine: keep permanently hidden */
.homeLine{
  display:none !important;
  visibility:hidden !important;
}

/* Chart corner controls — black/green, 38px, aligned to scale area */
.chartScaleControls{
  position:absolute !important;
  right:2px !important;
  bottom:4px !important;
  width:82px !important;
  height:38px !important;
  display:grid !important;
  grid-template-columns:38px 38px !important;
  gap:6px !important;
  z-index:35 !important;
  pointer-events:auto !important;
}

.chartMiniBtn{
  width:38px !important;
  height:38px !important;
  min-width:38px !important;
  min-height:38px !important;
  border-radius:10px !important;
  border:1px solid rgba(110,140,130,.28) !important;
  background:linear-gradient(180deg,rgba(5,14,12,.92),rgba(3,10,8,.96)) !important;
  color:#a5aaa9 !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  box-shadow:0 4px 12px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.02) !important;
}

.chartMiniBtn svg{
  width:18px !important;
  height:18px !important;
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
  box-shadow:0 0 14px rgba(16,223,119,.14),0 4px 12px rgba(0,0,0,.28) !important;
}
</style>
"""

PURGE_BLOCK = """\
<style id="DVL_718_BLUE_PURGE_CSS">
/* ─── Beta 0.718 — Final blue/cyan CSS purge ─── */
/* Covers: dvl-switch, modeBtn, liqToggle, levSlider/Knob,
   panelToggle, checkboxes, accent-colors. ALL !important to beat legacy. */

/* dvl-switch container: remove blue border */
.dvl-switch{
  border-color:rgba(110,140,130,.22) !important;
  background:rgba(5,14,12,.84) !important;
}

/* dvl-switch knob OFF: dark green-grey (was blue-grey #536176) */
.dvl-switch i{
  background:#3d4f48 !important;
  box-shadow:0 2px 6px rgba(0,0,0,.32) !important;
}

/* dvl-switch knob ON: exact DVL green */
.dvl-switch input:checked ~ i{
  background:#10df77 !important;
  box-shadow:0 0 10px rgba(16,223,119,.22) !important;
}

/* dvl-switch ON text */
.dvl-switch input:checked ~ b{
  color:#10df77 !important;
}

/* dvl-switch OFF text: muted green-grey */
.dvl-switch b{
  color:#73867e !important;
}

/* modeBtn.activeMode: remove navy blue gradient */
.modeBtn.activeMode{
  color:#f4f6f4 !important;
  background:
    radial-gradient(circle at 50% 0%,rgba(16,223,119,.20),transparent 56%),
    linear-gradient(180deg,rgba(5,14,12,.92),rgba(3,10,8,.96)) !important;
  box-shadow:
    0 0 0 1px rgba(16,223,119,.16) inset,
    0 0 18px rgba(16,223,119,.14) !important;
}

/* liqToggle.is-on: remove navy blue gradient */
.liqToggle.is-on{
  color:#f4f6f4 !important;
  background:
    radial-gradient(circle at 50% 0%,rgba(16,223,119,.16),transparent 56%),
    linear-gradient(180deg,rgba(5,14,12,.88),rgba(3,10,8,.90)) !important;
  box-shadow:
    0 0 0 1px rgba(16,223,119,.12) inset,
    0 0 14px rgba(16,223,119,.10) !important;
}

/* liqToggle OFF: dark green base */
.liqToggle:not(.is-on){
  color:#7d8e88 !important;
  background:rgba(5,14,12,.55) !important;
}

/* Leverage slider track: remove navy #304153 */
.levSlider{
  background:rgba(110,140,130,.22) !important;
}

/* Leverage fill bar: keep green */
.levSliderFill{
  background:linear-gradient(90deg,#10df77,#0abe60) !important;
}

/* Leverage knob: remove cyan glow, keep green border */
.levKnob{
  background:rgba(5,14,12,.96) !important;
  border-color:#10df77 !important;
  box-shadow:0 0 0 4px rgba(16,223,119,.14) !important;
}

/* panelToggle border: remove blue rgba(92,126,154,.22) */
.panelToggle{
  border-left-color:rgba(110,140,130,.16) !important;
  color:#c8d0ca !important;
  background:rgba(5,14,12,.3) !important;
}

/* All checkboxes and range inputs: green accent */
input[type="checkbox"],
input[type="radio"],
.sessionList input{
  accent-color:#10df77 !important;
}

input[type="range"]{
  accent-color:#10df77 !important;
}

/* dvl-vt-check: ensure not cyan */
.dvl-vt-check input:checked{
  border-color:rgba(16,223,119,.72) !important;
  background:rgba(16,223,119,.12) !important;
}

/* dvl-vt-tile-toggle: ensure not cyan */
.dvl-vt-tile-toggle input:checked{
  border-color:rgba(16,223,119,.72) !important;
  background:rgba(16,223,119,.12) !important;
}

/* dvl-custom-select: remove any cyan border/bg */
.dvl-custom-select-btn,
.dvl-custom-menu,
.dvl-custom-option{
  border-color:rgba(110,140,130,.18) !important;
}

.dvl-custom-option.is-selected,
.dvl-custom-option:hover{
  background:rgba(16,223,119,.10) !important;
  color:#10df77 !important;
  border-color:rgba(16,223,119,.28) !important;
}
</style>
"""

html = rep(html,
    '\n</body>\n</html>',
    '\n' + NAV_SHELL_BLOCK + PURGE_BLOCK + '</body>\n</html>',
    "insert 718 nav shell + blue purge before </body>")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
