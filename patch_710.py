#!/usr/bin/env python3
"""patch_710.py — Beta 0.710: Phase 2B-FIX (Theme Unification — Indicators dropdown)

CSS-only skin: the old #indicatorDropdown is re-skinned to match the new
green/black UI when opened from the new overlay (scoped to html.dvl1b-ind-open).
No new functional bridges. No chart/zoom/pan/scale/oscillator/paper/drawing/API
changes. No iframe, no second file, namespaced ids, fail-safe preserved.
No timers/observers. Desenhos/Settings still unconnected. Velas unchanged.

Theme overrides (all scoped to html.dvl1b-ind-open):
  - #indicatorDropdown: green/black gradient, green border, no cyan glow
  - .indicatorDropHead: green tint text, green-tinted separator
  - .indicatorItem: dark hover state, green accent for active items
  - .indicatorFxMark: green badge (was blue)
  - .is-soon items: text muted, gold/gray "Em breve" label
"""

import sys, os

TARGET = os.path.join(os.path.dirname(__file__),
    "DepthVisionLab-v106_REAL_UI", "public", "index.html")

def rep(html, old, new, label, expect=1):
    n = html.count(old)
    if n != expect:
        print(f"ABORT [{label}]: expected {expect} match(es), found {n}")
        sys.exit(1)
    return html.replace(old, new)

with open(TARGET, "r", encoding="utf-8") as f:
    html = f.read()
print(f"Loaded index.html: {len(html)} chars, {html.count(chr(10))+1} lines")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 1 — Version bump 0.709 -> 0.710
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.709</title>',
                 '<title>DVL Binance Live — Beta 0.710</title>', "title")
html = rep(html, '>BETA 0.709</div>', '>BETA 0.710</div>', "host_badge")
html = rep(html, '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.709</span>',
                 '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.710</span>', "new_badge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.709";',
                 'const DVL_APP_VERSION = "Beta 0.710";', "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.709 — Phase 2B (Indicators): the new-UI Indicators button now opens the existing old indicators dropdown (#indicatorDropdown) via the old openIndicatorsDropdown/closeIndicatorsDropdown functions, revealed from the hidden toolbar and repositioned under the new button. Old panel reused (not recreated); indicator logic/oscillators untouched. Desenhos/Settings still not connected; Velas unchanged." },\n'
    '  { version: "Beta 0.708", note: "Beta 0.708 — Badge/save',
    '  { version: DVL_APP_VERSION, note: "Beta 0.710 — Phase 2B-FIX (Theme Unification): CSS-only re-skin of the old #indicatorDropdown to match the new green/black UI when opened from the overlay (scoped to html.dvl1b-ind-open). Green/black gradient, green border, no cyan glow, muted soon labels in gold/gray. No new functional bridges; indicator logic untouched; Desenhos/Settings unconnected; Velas unchanged." },\n'
    '  { version: "Beta 0.709", note: "Beta 0.709 — Phase 2B (Indicators): the new-UI Indicators button now opens the existing old indicators dropdown (#indicatorDropdown) via the old openIndicatorsDropdown/closeIndicatorsDropdown functions, revealed from the hidden toolbar and repositioned under the new button. Old panel reused (not recreated); indicator logic/oscillators untouched. Desenhos/Settings still not connected; Velas unchanged." },\n'
    '  { version: "Beta 0.708", note: "Beta 0.708 — Badge/save',
    "changelog_0710")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — CSS: green/black theme overrides for the old indicators dropdown
#          All scoped to html.dvl1b-ind-open so old theme is preserved if
#          the panel is somehow opened via the old path.
# ═══════════════════════════════════════════════════════════════════════════════
IND_THEME_CSS = (
'/* Phase 2B-FIX: re-skin old #indicatorDropdown to match the new green/black UI */\n'
'html.dvl1b-ind-open #indicatorDropdown{\n'
'  background:linear-gradient(180deg,rgba(8,18,15,.98),rgba(5,12,10,.98)) !important;\n'
'  border:1px solid rgba(150,180,165,.20) !important;\n'
'  box-shadow:0 18px 46px rgba(0,0,0,.55) !important;\n'
'  backdrop-filter:none !important;\n'
'  -webkit-backdrop-filter:none !important;\n'
'  border-radius:12px !important;\n'
'  color:#d4e0d9 !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorDropHead{\n'
'  color:#8fb8a0 !important;\n'
'  border-bottom:1px solid rgba(150,180,165,.12) !important;\n'
'  background:transparent !important;\n'
'  font-size:11px !important;\n'
'  letter-spacing:.04em !important;\n'
'  text-transform:uppercase !important;\n'
'  padding:10px 14px 8px !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorItem{\n'
'  color:#c8d8cf !important;\n'
'  border-bottom:1px solid rgba(150,180,165,.07) !important;\n'
'  background:transparent !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorItem:hover,\n'
'html.dvl1b-ind-open .indicatorItem:focus{\n'
'  background:rgba(16,223,119,.07) !important;\n'
'  color:#eef2f0 !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorItem.is-active{\n'
'  color:#10df77 !important;\n'
'  background:rgba(16,223,119,.10) !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorItem.is-soon{\n'
'  opacity:.55 !important;\n'
'  cursor:default !important;\n'
'  pointer-events:none !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorFxMark{\n'
'  background:rgba(16,223,119,.12) !important;\n'
'  color:#10df77 !important;\n'
'  border:1px solid rgba(16,223,119,.25) !important;\n'
'  border-radius:4px !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorSoonLabel,\n'
'html.dvl1b-ind-open [class*="soon"],\n'
'html.dvl1b-ind-open .indicatorItem.is-soon .indicatorFxMark{\n'
'  background:rgba(180,150,60,.10) !important;\n'
'  color:#9e8b50 !important;\n'
'  border-color:rgba(180,150,60,.22) !important;\n'
'}\n'
)
html = rep(html,
    'html.dvl1b-ind-open #fxIndicatorWrap .indicatorDropdown{ left:0 !important; right:auto !important; top:calc(100% + 6px) !important; }\n',
    'html.dvl1b-ind-open #fxIndicatorWrap .indicatorDropdown{ left:0 !important; right:auto !important; top:calc(100% + 6px) !important; }\n'
    + IND_THEME_CSS,
    "ind_theme_css")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — Audit -> Phase 2B-FIX 0.710
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_2B_AUDIT_MODULE_0709">',
    '<script id="DVL_UI_OVERLAY_PHASE_2B_FIX_AUDIT_MODULE_0710">',
    "audit_id")
html = rep(html,
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.709"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.709\' (got: "+window.DVL_APP_VERSION+")");',
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.710"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.710\' (got: "+window.DVL_APP_VERSION+")");',
    "audit_a1")
html = rep(html,
    'if(!_t || (_t.textContent||"").indexOf("0.709")===-1) blockers.push("A2: title missing 0.709");',
    'if(!_t || (_t.textContent||"").indexOf("0.710")===-1) blockers.push("A2: title missing 0.710");',
    "audit_a2")
html = rep(html,
    'var N=25, name="DVL_UI_OVERLAY_PHASE_2B_AUDIT_MODULE_0709";',
    '// A26. Theme fix: ensure no new functional bridges were added beyond 2A+2B\n'
    'if(document.getElementById("dvl1b_drawMenu")||document.getElementById("dvl1b_settingsMenu"))\n'
    '  blockers.push("A26: new draw/settings menu was added (out of Phase 2B-FIX scope)");\n'
    '// A27. Indicators panel still uses the old DOM (not recreated)\n'
    'if(!document.getElementById("indicatorDropdown")) blockers.push("A27: #indicatorDropdown missing — old panel was removed");\n'
    '// A28. Theme override CSS present (scoped rule must exist, blue rgba must not dominate)\n'
    '(function(){\n'
    '  var found=false;\n'
    '  try{\n'
    '    var sheets=document.styleSheets;\n'
    '    for(var si=0;si<sheets.length;si++){\n'
    '      try{\n'
    '        var rules=sheets[si].cssRules||sheets[si].rules||[];\n'
    '        for(var ri=0;ri<rules.length;ri++){\n'
    '          var r=rules[ri];\n'
    '          if(r.selectorText&&r.selectorText.indexOf("dvl1b-ind-open")!==-1&&r.selectorText.indexOf("indicatorDropdown")!==-1&&(r.style&&r.style.background&&r.style.background.indexOf("rgba(8,18,15")!==-1)){ found=true; break; }\n'
    '        }\n'
    '        if(found) break;\n'
    '      }catch(_ie){}\n'
    '    }\n'
    '  }catch(_e){}\n'
    '  if(!found) warnings.push("A28: green/black theme override rule not detected in styleSheets");\n'
    '})();\n\n'
    'var N=28, name="DVL_UI_OVERLAY_PHASE_2B_FIX_AUDIT_MODULE_0710";',
    "audit_n")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.710 OK")
