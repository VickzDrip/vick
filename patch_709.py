#!/usr/bin/env python3
"""patch_709.py — Beta 0.709: Phase 2B (Indicators only)

Wires ONLY the new-UI Indicators button to the EXISTING old indicators panel
(#fxIndicatorWrap / #indicatorDropdown) by calling the old functions
openIndicatorsDropdown()/closeIndicatorsDropdown(). The old panel is reused
(not recreated). Because it lives inside the now-hidden old toolbar, it is
revealed with a visibility-based override and repositioned (fixed) under the
new button — no DOM moves, no indicator logic rewritten.

Not connected: Desenhos, Settings. Velas untouched (2A preserved).
No chart/zoom/pan/scale/oscillator/paper/drawing/API changes. No iframe,
no second file, namespaced ids, fail-safe preserved. No timers/observers.
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
# PART 1 — Version bump 0.708 -> 0.709
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.708</title>',
                 '<title>DVL Binance Live — Beta 0.709</title>', "title")
html = rep(html, '>BETA 0.708</div>', '>BETA 0.709</div>', "host_badge")
html = rep(html, '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.708</span>',
                 '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.709</span>', "new_badge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.708";',
                 'const DVL_APP_VERSION = "Beta 0.709";', "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.708 — Badge/save',
    '  { version: DVL_APP_VERSION, note: "Beta 0.709 — Phase 2B (Indicators): the new-UI Indicators button now opens the existing old indicators dropdown (#indicatorDropdown) via the old openIndicatorsDropdown/closeIndicatorsDropdown functions, revealed from the hidden toolbar and repositioned under the new button. Old panel reused (not recreated); indicator logic/oscillators untouched. Desenhos/Settings still not connected; Velas unchanged." },\n'
    '  { version: "Beta 0.708", note: "Beta 0.708 — Badge/save',
    "changelog_0709")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — CSS: reveal old indicators panel + new button open-state
#          (inserted AFTER the hide rule so it wins when ind-open is present)
# ═══════════════════════════════════════════════════════════════════════════════
IND_CSS = (
'/* Phase 2B: reveal the OLD indicators dropdown from the hidden toolbar, anchored under the new button. */\n'
'html.dvl1b-ind-open .chartCard > .toolbar{ display:block !important; visibility:hidden !important; position:fixed !important; left:0 !important; top:0 !important; width:0 !important; height:0 !important; min-height:0 !important; padding:0 !important; margin:0 !important; border:0 !important; background:transparent !important; box-shadow:none !important; overflow:visible !important; pointer-events:none !important; z-index:100000 !important; }\n'
'html.dvl1b-ind-open #fxIndicatorWrap{ display:block !important; visibility:visible !important; position:fixed !important; pointer-events:auto !important; z-index:100000 !important; }\n'
'html.dvl1b-ind-open #fxIndicatorWrap *{ visibility:visible !important; }\n'
'html.dvl1b-ind-open #fxIndicatorWrap > #toggleIndicators{ display:none !important; }\n'
'html.dvl1b-ind-open #fxIndicatorWrap .indicatorDropdown{ left:0 !important; right:auto !important; top:calc(100% + 6px) !important; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act.dvl1b-open{ color:var(--b-accent); background:rgba(16,223,119,.10); border:calc(1 * var(--px)) solid rgba(16,223,119,.30); }\n'
)
html = rep(html,
    'html.dvl-ui-1b-active .chartCard > .toolbar{ display:none !important; }\n</style>',
    'html.dvl-ui-1b-active .chartCard > .toolbar{ display:none !important; }\n' + IND_CSS + '</style>',
    "ind_css")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — JS: wire new Indicators button to old open/close (insert before helper)
# ═══════════════════════════════════════════════════════════════════════════════
IND_JS = (
'  /* ── Phase 2B: Indicators — open the OLD indicators dropdown (reuse old DOM + fns) ── */\n'
'  var indBtn=document.getElementById("dvl1b_indBtn");\n'
'  var indOpen=false;\n'
'  function indWrap(){ return document.getElementById("fxIndicatorWrap"); }\n'
'  function positionInd(){ var w=indWrap(); if(!w||!indBtn) return; try{ var r=indBtn.getBoundingClientRect(); var W=250, vw=window.innerWidth||360; var left=Math.max(8, Math.min(Math.round(r.left), vw-W-8)); w.style.left=left+"px"; w.style.top=Math.round(r.bottom)+"px"; w.style.width=W+"px"; }catch(_e){} }\n'
'  function closeInd(){ indOpen=false; try{ document.documentElement.classList.remove("dvl1b-ind-open"); }catch(_e){} if(indBtn) indBtn.classList.remove("dvl1b-open"); try{ if(typeof closeIndicatorsDropdown==="function") closeIndicatorsDropdown(); else if(window.closeIndicatorsDropdown) window.closeIndicatorsDropdown(); }catch(_e){} var w=indWrap(); if(w){ w.style.left=""; w.style.top=""; w.style.width=""; } }\n'
'  function openInd(){ try{ document.documentElement.classList.add("dvl1b-ind-open"); }catch(_e){} positionInd(); try{ if(typeof openIndicatorsDropdown==="function") openIndicatorsDropdown(); else if(window.openIndicatorsDropdown) window.openIndicatorsDropdown(); }catch(_e){} if(indBtn) indBtn.classList.add("dvl1b-open"); indOpen=true; positionInd(); }\n'
'  if(indBtn) indBtn.addEventListener("click", function(e){ e.stopPropagation(); if(indOpen) closeInd(); else openInd(); }, false);\n'
'  document.addEventListener("click", function(e){ if(!indOpen) return; var w=indWrap(); var inDrop=w && w.contains(e.target); var inBtn=indBtn && indBtn.contains(e.target); if(!inDrop && !inBtn) closeInd(); }, false);\n\n'
)
html = rep(html,
    '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    IND_JS + '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    "ind_js")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — Audit -> Phase 2B 0.709
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_2A_AUDIT_MODULE_0708">',
    '<script id="DVL_UI_OVERLAY_PHASE_2B_AUDIT_MODULE_0709">',
    "audit_id")
html = rep(html,
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.708"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.708\' (got: "+window.DVL_APP_VERSION+")");',
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.709"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.709\' (got: "+window.DVL_APP_VERSION+")");',
    "audit_a1")
html = rep(html,
    'if(!_t || (_t.textContent||"").indexOf("0.708")===-1) blockers.push("A2: title missing 0.708");',
    'if(!_t || (_t.textContent||"").indexOf("0.709")===-1) blockers.push("A2: title missing 0.709");',
    "audit_a2")
html = rep(html,
    'var N=21, name="DVL_UI_OVERLAY_PHASE_2A_AUDIT_MODULE_0708";',
    '// A22. Phase 2B: Indicators connected to the OLD panel (reused, not recreated)\n'
    'if(!document.getElementById("dvl1b_indBtn")) blockers.push("A22: new Indicators button missing");\n'
    'if(!document.getElementById("fxIndicatorWrap") || !document.getElementById("indicatorDropdown")) blockers.push("A22b: old indicators panel missing");\n'
    'if(typeof openIndicatorsDropdown!=="function" && typeof window.openIndicatorsDropdown!=="function") blockers.push("A22c: openIndicatorsDropdown not reachable");\n'
    '// A23. Indicators reuses the OLD panel — no new custom indicators dropdown was created\n'
    'if(_ui2 && _ui2.querySelector("#dvl1b_indMenu")) blockers.push("A23: a new custom indicators dropdown was created (must reuse old)");\n'
    '// A24. Desenhos / Settings still NOT integrated (no new dropdown, no open-state class)\n'
    'if(document.getElementById("dvl1b_drawMenu")||document.getElementById("dvl1b_settingsMenu"))\n'
    '  blockers.push("A24: a Desenhos/Settings dropdown was added (out of Phase 2B scope)");\n'
    'if(document.documentElement.classList.contains("dvl1b-draw-open")||document.documentElement.classList.contains("dvl1b-settings-open"))\n'
    '  warnings.push("A24b: draw/settings open-state class present");\n'
    '// A25. Velas (2A) still present and engines not rewritten\n'
    'if(!document.getElementById("dvl1b_candleMenu")) blockers.push("A25: candle dropdown (2A) lost");\n'
    'if(typeof visibleWindow!=="function" && typeof window.visibleWindow!=="function") warnings.push("A25b: visibleWindow not reachable");\n\n'
    'var N=25, name="DVL_UI_OVERLAY_PHASE_2B_AUDIT_MODULE_0709";',
    "audit_n")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.709 OK")
