#!/usr/bin/env python3
"""patch_712.py — Beta 0.712: Phase 2B-FIX-2 (Indicators Compact Size)

CSS-only compact size fix for the old #indicatorDropdown when opened from
the new overlay. No new bridges, no indicator logic, no Drawings/Settings
changes. Only adjusts dimensions, max-height, scrolling and item density.

Root causes fixed:
  1. #fxIndicatorWrap had height:32px (from old toolbar CSS) — when made
     position:fixed it pushed the dropdown 39px below the button instead
     of 6px, AND the ghost itself occupied screen space. Fixed by adding
     height:0/min-height:0/max-height:none/overflow:visible to the existing
     dvl1b-ind-open #fxIndicatorWrap rule.
  2. .indicatorDropdown had no max-height — full content height, could be
     very tall (sidebar effect). Fixed with max-height:56vh + overflow-y:auto.
  3. Width: override to min(310px, 100vw-18px); JS positionInd W updated to 310.
  4. Items: compact grid columns, font sizes, badge sizes matching spec.
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
# PART 1 — Version bump 0.711 -> 0.712
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.711</title>',
                 '<title>DVL Binance Live — Beta 0.712</title>', "title")
html = rep(html, '>BETA 0.711</div>', '>BETA 0.712</div>', "host_badge")
html = rep(html, '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.711</span>',
                 '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.712</span>', "new_badge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.711";',
                 'const DVL_APP_VERSION = "Beta 0.712";', "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.711 — Phase 2C (Drawings):',
    '  { version: DVL_APP_VERSION, note: "Beta 0.712 — Phase 2B-FIX-2 (Indicators Compact Size): CSS-only compact fix for the indicators panel. Root causes: #fxIndicatorWrap had height:32px making it a 32px ghost and misplacing the dropdown 39px too low — fixed with height:0. No max-height on dropdown — full sidebar height — fixed with max-height:56vh + overflow-y:auto. Width clamped to min(310px,100vw-18px). Items compacted: 44px min-height, 30px badge, 13px title, 10.5px subtext, 44px toggle. No new bridges; Drawings 2C, Indicators 2B, Velas 2A all unchanged." },\n'
    '  { version: "Beta 0.711", note: "Beta 0.711 — Phase 2C (Drawings):',
    "changelog_0712")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — CSS fix #1: #fxIndicatorWrap — collapse to zero-height ghost
#          The old toolbar CSS gives .fxIndicatorWrap height:32px!important.
#          When made position:fixed, that 32px ghost pushes the dropdown down
#          by 32+7=39px instead of the intended 6px gap.
#          Fix: height:0 + min-height:0 + max-height:none + overflow:visible.
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    'html.dvl1b-ind-open #fxIndicatorWrap{ display:block !important; visibility:visible !important; position:fixed !important; pointer-events:auto !important; z-index:100000 !important; }',
    'html.dvl1b-ind-open #fxIndicatorWrap{ display:block !important; visibility:visible !important; position:fixed !important; height:0 !important; min-height:0 !important; max-height:none !important; overflow:visible !important; pointer-events:auto !important; z-index:100000 !important; }',
    "ind_wrap_height")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — CSS fix #2: compact size/height/items for the indicators panel
#          Inserted after the existing soon-label override, before Phase 2C CSS.
# ═══════════════════════════════════════════════════════════════════════════════
IND_COMPACT_CSS = (
'/* Phase 2B-FIX-2: compact size for indicators panel — max-height, width, item density */\n'
'html.dvl1b-ind-open #indicatorDropdown{\n'
'  width:min(310px, calc(100vw - 18px)) !important;\n'
'  max-height:56vh !important;\n'
'  overflow-y:auto !important;\n'
'  overflow-x:hidden !important;\n'
'  -webkit-overflow-scrolling:touch !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorDropHead{\n'
'  height:38px !important;\n'
'  min-height:38px !important;\n'
'  padding:0 12px !important;\n'
'  font-size:11px !important;\n'
'  letter-spacing:.04em !important;\n'
'  text-transform:uppercase !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorItem{\n'
'  min-height:44px !important;\n'
'  max-height:52px !important;\n'
'  padding:5px 10px !important;\n'
'  grid-template-columns:30px minmax(0,1fr) 46px !important;\n'
'  gap:8px !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorFxMark{\n'
'  width:30px !important;\n'
'  height:30px !important;\n'
'  min-width:30px !important;\n'
'  min-height:30px !important;\n'
'  border-radius:7px !important;\n'
'  font-size:10px !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorItem b{ font-size:13px !important; font-weight:650 !important; }\n'
'html.dvl1b-ind-open .indicatorItem small{ font-size:10.5px !important; }\n'
'html.dvl1b-ind-open .indicatorItem i{ font-size:9px !important; }\n'
'html.dvl1b-ind-open .indicatorItem .dvl-vt-state{\n'
'  width:44px !important; min-width:44px !important; max-width:44px !important;\n'
'  height:20px !important; flex:0 0 44px !important;\n'
'}\n'
'html.dvl1b-ind-open .indicatorItem .dvl-vt-state.is-on::after{ transform:translateX(24px) !important; }\n'
)
html = rep(html,
    'html.dvl1b-ind-open .indicatorSoonLabel,\n'
    'html.dvl1b-ind-open [class*="soon"],\n'
    'html.dvl1b-ind-open .indicatorItem.is-soon .indicatorFxMark{\n'
    '  background:rgba(180,150,60,.10) !important;\n'
    '  color:#9e8b50 !important;\n'
    '  border-color:rgba(180,150,60,.22) !important;\n'
    '}\n'
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act.dvl1b-open',
    'html.dvl1b-ind-open .indicatorSoonLabel,\n'
    'html.dvl1b-ind-open [class*="soon"],\n'
    'html.dvl1b-ind-open .indicatorItem.is-soon .indicatorFxMark{\n'
    '  background:rgba(180,150,60,.10) !important;\n'
    '  color:#9e8b50 !important;\n'
    '  border-color:rgba(180,150,60,.22) !important;\n'
    '}\n'
    + IND_COMPACT_CSS
    + '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act.dvl1b-open',
    "ind_compact_css")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — JS: update positionInd W from 250 to 310 (matches new dropdown width)
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    'function positionInd(){ var w=indWrap(); if(!w||!indBtn) return; try{ var r=indBtn.getBoundingClientRect(); var W=250, vw=window.innerWidth||360; var left=Math.max(8, Math.min(Math.round(r.left), vw-W-8)); w.style.left=left+"px"; w.style.top=Math.round(r.bottom)+"px"; w.style.width=W+"px"; }catch(_e){} }',
    'function positionInd(){ var w=indWrap(); if(!w||!indBtn) return; try{ var r=indBtn.getBoundingClientRect(); var W=Math.min(310,Math.max(240,(window.innerWidth||360)-18)), vw=window.innerWidth||360; var left=Math.max(8, Math.min(Math.round(r.left), vw-W-8)); w.style.left=left+"px"; w.style.top=Math.round(r.bottom)+"px"; w.style.width=W+"px"; }catch(_e){} }',
    "ind_pos_W")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 5 — Audit -> Phase 2B-FIX-2 0.712
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_2C_AUDIT_MODULE_0711">',
    '<script id="DVL_UI_OVERLAY_PHASE_2B_FIX2_AUDIT_MODULE_0712">',
    "audit_id")
html = rep(html,
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.711"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.711\' (got: "+window.DVL_APP_VERSION+")");',
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.712"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.712\' (got: "+window.DVL_APP_VERSION+")");',
    "audit_a1")
html = rep(html,
    'if(!_t || (_t.textContent||"").indexOf("0.711")===-1) blockers.push("A2: title missing 0.711");',
    'if(!_t || (_t.textContent||"").indexOf("0.712")===-1) blockers.push("A2: title missing 0.712");',
    "audit_a2")
html = rep(html,
    'var N=33, name="DVL_UI_OVERLAY_PHASE_2C_AUDIT_MODULE_0711";',
    '// A34. Indicators compact CSS: max-height rule present (scoped to dvl1b-ind-open)\n'
    '(function(){\n'
    '  var found=false;\n'
    '  try{\n'
    '    var sheets=document.styleSheets;\n'
    '    for(var si=0;si<sheets.length;si++){\n'
    '      try{\n'
    '        var rules=sheets[si].cssRules||sheets[si].rules||[];\n'
    '        for(var ri=0;ri<rules.length;ri++){\n'
    '          var r=rules[ri];\n'
    '          if(r.selectorText&&r.selectorText.indexOf("dvl1b-ind-open")!==-1&&r.selectorText.indexOf("indicatorDropdown")!==-1&&r.style&&r.style.maxHeight){\n'
    '            found=true; break;\n'
    '          }\n'
    '        }\n'
    '        if(found) break;\n'
    '      }catch(_ie){}\n'
    '    }\n'
    '  }catch(_e){}\n'
    '  if(!found) warnings.push("A34: compact max-height rule for indicators not detected in styleSheets");\n'
    '})();\n'
    '// A35. #fxIndicatorWrap height:0 override present\n'
    '(function(){\n'
    '  var found=false;\n'
    '  try{\n'
    '    var sheets=document.styleSheets;\n'
    '    for(var si=0;si<sheets.length;si++){\n'
    '      try{\n'
    '        var rules=sheets[si].cssRules||sheets[si].rules||[];\n'
    '        for(var ri=0;ri<rules.length;ri++){\n'
    '          var r=rules[ri];\n'
    '          if(r.selectorText&&r.selectorText.indexOf("dvl1b-ind-open")!==-1&&r.selectorText.indexOf("fxIndicatorWrap")!==-1&&r.style&&r.style.height==="0px"){\n'
    '            found=true; break;\n'
    '          }\n'
    '        }\n'
    '        if(found) break;\n'
    '      }catch(_ie){}\n'
    '    }\n'
    '  }catch(_e){}\n'
    '  if(!found) warnings.push("A35: height:0 override for #fxIndicatorWrap not detected — ghost may still have 32px height");\n'
    '})();\n\n'
    'var N=35, name="DVL_UI_OVERLAY_PHASE_2B_FIX2_AUDIT_MODULE_0712";',
    "audit_n")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.712 OK")
