#!/usr/bin/env python3
"""patch_721.py — Beta 0.721: Indicator dropdown proportions + Trade button top-clip fix."""
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

print("=== patch_721.py — Beta 0.721 ===")

# ── 1-4. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.720</title>',
    '<title>DVL Binance Live — Beta 0.721</title>',
    "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.720";',
    'const DVL_APP_VERSION = "Beta 0.721";',
    "version const")

html = rep(html,
    '>BETA 0.720</span>',
    '>BETA 0.721</span>',
    "static badge")

html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.720 — replaced Trade button HTML (clean glyph, removed tradePullGlyph and swap SVG), cancelled conflicting ::before rules." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.721 — expanded indicator dropdown proportions to match 0.728 reference, fixed Trade button top-clip (margin-top correction)." },\n  { version: "Beta 0.720", note: "Beta 0.720 — replaced Trade button HTML (clean glyph, removed tradePullGlyph and swap SVG), cancelled conflicting ::before rules." },',
    "changelog")

# ── 2. Audit: bump to 0721, A74-A76, N=76 ────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0720_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.720"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.720\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.720")===-1) blockers.push("A2: title missing 0.720");',

    '<script id="DVL_UI_OVERLAY_PHASE_0721_AUDIT_MODULE">\n'
    '(function(){\n'
    '"use strict";\n'
    'var blockers=[], warnings=[];\n'
    '\n'
    '// A1. Version\n'
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.721"))\n'
    '  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.721\' (got: "+window.DVL_APP_VERSION+")");\n'
    '\n'
    '// A2. Title\n'
    'var _t=document.querySelector("title");\n'
    'if(!_t || (_t.textContent||"").indexOf("0.721")===-1) blockers.push("A2: title missing 0.721");',
    "audit: id + A1 + A2")

html = rep(html,
    'var N=73, name="DVL_UI_OVERLAY_PHASE_0720_AUDIT_MODULE";',

    '// A74. DVL_721_INDIC_PROPORTIONS style block present\n'
    'if(!document.getElementById("DVL_721_INDIC_PROPORTIONS")) blockers.push("A74: DVL_721_INDIC_PROPORTIONS missing");\n'
    '// A75. DVL_721_TRADE_CLIP_FIX style block present\n'
    'if(!document.getElementById("DVL_721_TRADE_CLIP_FIX")) blockers.push("A75: DVL_721_TRADE_CLIP_FIX missing");\n'
    '// A76. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A76: setCandleMode missing");\n'
    '\n'
    'var N=76, name="DVL_UI_OVERLAY_PHASE_0721_AUDIT_MODULE";',
    "audit: A74-A76 + N=76 + name 0721")

# ── 3. Insert CSS blocks before </body> ───────────────────────────────────────

INDIC_BLOCK = """\
<style id="DVL_721_INDIC_PROPORTIONS">
/* ─── Beta 0.721 — Indicator dropdown proportions match 0.728 reference ─── */
/* positionInd() sets wrapper left/width via inline style (no !important).
   CSS !important overrides non-!important inline styles — no JS change needed. */

/* Override JS-capped width (310px): expand wrapper to almost full screen */
html.dvl1b-ind-open #fxIndicatorWrap{
  left:12px !important;
  width:calc(100vw - 24px) !important;
}

/* Dropdown fills the repositioned wrapper */
html.dvl1b-ind-open #fxIndicatorWrap .indicatorDropdown,
html.dvl1b-ind-open #indicatorDropdown{
  left:0 !important;
  right:0 !important;
  width:100% !important;
  max-height:62vh !important;
  border-radius:14px !important;
}

/* Header row */
html.dvl1b-ind-open .indicatorDropHead{
  height:44px !important;
  min-height:44px !important;
  padding:0 14px !important;
  font-size:11px !important;
  letter-spacing:.06em !important;
  text-transform:uppercase !important;
}

/* Indicator rows — taller, more breathing room */
html.dvl1b-ind-open .indicatorItem{
  min-height:56px !important;
  max-height:none !important;
  padding:8px 14px !important;
  grid-template-columns:36px minmax(0,1fr) 46px !important;
  gap:10px !important;
}

/* Icon badge — 36×36 matching reference */
html.dvl1b-ind-open .indicatorFxMark{
  width:36px !important;
  height:36px !important;
  min-width:36px !important;
  min-height:36px !important;
  border-radius:9px !important;
  font-size:10px !important;
}

/* Text sizes */
html.dvl1b-ind-open .indicatorItem b{
  font-size:14px !important;
  font-weight:700 !important;
}
html.dvl1b-ind-open .indicatorItem small{
  font-size:11px !important;
  line-height:1.3 !important;
}
html.dvl1b-ind-open .indicatorItem i{
  font-size:9.5px !important;
}

/* Toggle — wider/taller: 44×22px */
html.dvl1b-ind-open .indicatorItem .dvl-vt-state{
  width:44px !important;
  min-width:44px !important;
  max-width:44px !important;
  height:22px !important;
  flex:0 0 44px !important;
}
html.dvl1b-ind-open .indicatorItem .dvl-vt-state.is-on::after{
  transform:translateX(24px) !important;
}
</style>
"""

TRADE_CLIP_BLOCK = """\
<style id="DVL_721_TRADE_CLIP_FIX">
/* ─── Beta 0.721 — Trade button top-clip fix ─── */
/* Root cause: margin-top:-3px pushed the 62px active button flush to the top
   of the 68px nav. The nav's overflow:hidden + border-radius:18px then clipped
   the button's top corners and 1px green border.
   Fix: margin-top:2px → 6px clearance from nav top, well inside the 18px radius. */

.bottomNav #tradeNavBtn,
nav.bottomNav #tradeNavBtn,
.bottomNav .navItem.active,
nav.bottomNav .navItem.active{
  height:60px !important;
  margin-top:2px !important;
}
</style>
"""

html = rep(html,
    '\n</body>\n</html>',
    '\n' + INDIC_BLOCK + TRADE_CLIP_BLOCK + '</body>\n</html>',
    "insert 721 CSS blocks before </body>")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
