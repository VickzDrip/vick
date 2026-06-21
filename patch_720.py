#!/usr/bin/env python3
"""patch_720.py — Beta 0.720: Trade button HTML substitution (same proportions, clean glyph)."""
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

print("=== patch_720.py — Beta 0.720 ===")

# ── 1-4. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.719</title>',
    '<title>DVL Binance Live — Beta 0.720</title>',
    "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.719";',
    'const DVL_APP_VERSION = "Beta 0.720";',
    "version const")

html = rep(html,
    '>BETA 0.719</span>',
    '>BETA 0.720</span>',
    "static badge")

html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.719 — fixed Trade footer button visual, prevented trade panel from overlapping bottom nav, restored compact chart corner controls, and removed remaining blue/cyan toggles." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.720 — replaced Trade button HTML (clean glyph, removed tradePullGlyph and swap SVG), cancelled conflicting ::before rules." },\n  { version: "Beta 0.719", note: "Beta 0.719 — fixed Trade footer button visual, prevented trade panel from overlapping bottom nav, restored compact chart corner controls, and removed remaining blue/cyan toggles." },',
    "changelog")

# ── 2. Audit: bump to 0720, A71-A73, N=73 ────────────────────────────────────
html = rep(html,
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
    "audit: id + A1 + A2")

html = rep(html,
    'var N=70, name="DVL_UI_OVERLAY_PHASE_0719_AUDIT_MODULE";',

    '// A71. tradeArrowsGlyph span present (clean HTML, no tradePullGlyph)\n'
    '(function(){var btn=document.getElementById("tradeNavBtn");if(btn){'
    'if(btn.querySelector(".tradePullGlyph")) warnings.push("A71: tradePullGlyph still in DOM (should be replaced)");'
    'if(!btn.querySelector(".tradeArrowsGlyph")) blockers.push("A71: .tradeArrowsGlyph missing from #tradeNavBtn");'
    '}else blockers.push("A71: #tradeNavBtn not found");})();\n'
    '// A72. DVL_720_TRADE_BTN_CLEAN style block present\n'
    'if(!document.getElementById("DVL_720_TRADE_BTN_CLEAN")) blockers.push("A72: DVL_720_TRADE_BTN_CLEAN missing");\n'
    '// A73. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A73: setCandleMode missing");\n'
    '\n'
    'var N=73, name="DVL_UI_OVERLAY_PHASE_0720_AUDIT_MODULE";',
    "audit: A71-A73 + N=73 + name 0720")

# ── 3. Replace Trade button HTML (surgical — same proportions, clean glyph) ─────
# Remove tradePullGlyph span + swap SVG, replace with .tradeArrowsGlyph span
html = rep(html,
    '<button class="navItem active tradeNavWithPull" id="tradeNavBtn" aria-label="Abrir painel de trade">\n'
    '      <span class="tradePullGlyph" aria-hidden="true"><b></b></span>\n'
    '      <svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>\n'
    '      <span>Trade</span>\n'
    '    </button>',

    '<button class="navItem active tradeNavWithPull" id="tradeNavBtn" aria-label="Abrir painel de trade">\n'
    '      <span class="tradeArrowsGlyph" aria-hidden="true">↑↓</span>\n'
    '      <span>Trade</span>\n'
    '    </button>',
    "trade button HTML substitution")

# ── 4. Insert CSS block before </body> ────────────────────────────────────────
TRADE_CLEAN_BLOCK = """\
<style id="DVL_720_TRADE_BTN_CLEAN">
/* ─── Beta 0.720 — Trade button clean HTML glyph ─── */
/* tradePullGlyph + swap SVG removed from DOM.
   Using .tradeArrowsGlyph span with literal ↑↓ text.
   Cancel ::before from 0.718/0.719 to prevent any residual injection. */

/* Cancel conflicting ::before from 0.718 and 0.719 */
.bottomNav #tradeNavBtn::before,
nav.bottomNav #tradeNavBtn::before{
  content:none !important;
  display:none !important;
}

/* Style the clean glyph span — same proportions as 0.728 reference */
.tradeArrowsGlyph{
  display:block !important;
  font-size:17px !important;
  font-weight:700 !important;
  line-height:.7 !important;
  letter-spacing:-.04em !important;
  color:inherit !important;
  text-align:center !important;
  margin-bottom:2px !important;
  pointer-events:none !important;
}
</style>
"""

html = rep(html,
    '\n</body>\n</html>',
    '\n' + TRADE_CLEAN_BLOCK + '</body>\n</html>',
    "insert 720 CSS block before </body>")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
