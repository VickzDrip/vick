#!/usr/bin/env python3
"""patch_708.py — Beta 0.708: badge/save fixes + Phase 2A (Candles only)

Fixes:
  1. Version badge — inline badge now driven by DVL_APP_VERSION (never stale)
     and bumped to 0.708 everywhere.
  2. Save button — mobile-first label: shows "Salvar" on phones, "Salvar perfil"
     only on >=768px (no "Salvar perfil" eating header space on mobile).

Phase 2A — Candles only:
  - Wires ONLY the Velas button of the new UI to a CUSTOM (non-native) dropdown.
  - Options: Candles, Hollow, Heikin Ashi, Footprint, Line, Area, Bars, Renko.
  - The 5 modes the old engine supports call window.setCandleMode(...);
    Line/Area/Bars are shown disabled (no old function exists -> not faked).
  - Indicators / Desenhos / Settings NOT connected. Chart/zoom/pan/scale/
    oscillators/paper/drawings/API untouched.
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
# PART 1 — Version bump 0.707 -> 0.708 (+ make inline badge dynamic)
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.707</title>',
                 '<title>DVL Binance Live — Beta 0.708</title>', "title")
html = rep(html, '>BETA 0.707</div>', '>BETA 0.708</div>', "host_badge")
html = rep(html, '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.707</span>',
                 '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.708</span>', "new_badge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.707";',
                 'const DVL_APP_VERSION = "Beta 0.708";', "DVL_APP_VERSION")

# inline badge kept in sync with DVL_APP_VERSION (runs after the const is defined)
html = rep(html,
    'try{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}',
    'try{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); var _dvlVB1b = document.getElementById("dvl1b_versionBadge"); if(_dvlVB1b) _dvlVB1b.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}',
    "badge_sync")

html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.707 — Phase 1C',
    '  { version: DVL_APP_VERSION, note: "Beta 0.708 — Badge/save fixes + Phase 2A (Candles): inline version badge now follows DVL_APP_VERSION; Save shows \'Salvar\' on mobile and \'Salvar perfil\' only >=768px; the new-UI Velas button now opens a custom DVL dropdown (Candles/Hollow/Heikin Ashi/Footprint/Renko call the old setCandleMode; Line/Area/Bars shown disabled). No other buttons connected; chart untouched." },\n'
    '  { version: "Beta 0.707", note: "Beta 0.707 — Phase 1C',
    "changelog_0708")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — Save button: mobile-first label
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-short{ display:none; }\n'
    '@media (max-width:560px){\n'
    '  #DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-full{ display:none; }\n'
    '  #DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-short{ display:inline; }\n'
    '}',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-full{ display:none; }\n'
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-short{ display:inline; }\n'
    '@media (min-width:768px){\n'
    '  #DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-full{ display:inline; }\n'
    '  #DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-short{ display:none; }\n'
    '}',
    "save_mobile_first")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — Phase 2A: custom candle dropdown (CSS)
# ═══════════════════════════════════════════════════════════════════════════════
CANDLE_CSS = (
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-menuwrap{ position:relative; flex:0 0 auto; display:flex; align-items:center; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-menu{ position:fixed; z-index:200; display:none; min-width:calc(210 * var(--px)); padding:calc(6 * var(--px)); border-radius:calc(12 * var(--px)); background:linear-gradient(180deg,rgba(8,18,15,.98),rgba(5,12,10,.98)); border:calc(1 * var(--px)) solid rgba(150,180,165,.20); box-shadow:0 calc(18 * var(--px)) calc(46 * var(--px)) rgba(0,0,0,.55); }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-menuwrap.is-open .dvl1b-menu{ display:block; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-menu-item{ display:flex; align-items:center; justify-content:space-between; gap:calc(10 * var(--px)); width:100%; height:calc(44 * var(--px)); padding:0 calc(12 * var(--px)); border-radius:calc(8 * var(--px)); font-size:calc(19 * var(--px)); font-weight:500; color:#e7ecea; text-align:left; white-space:nowrap; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-menu-item:active{ background:rgba(16,223,119,.12); }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-menu-item.is-active{ color:var(--b-accent); background:rgba(16,223,119,.10); }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-menu-item.is-disabled{ color:#6b7572; cursor:default; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-soon{ font-size:calc(13 * var(--px)); color:#5f6b67; font-weight:600; }\n'
)
html = rep(html,
    '/* Hide old chrome ONLY when 1B is confirmed active. */',
    CANDLE_CSS + '/* Hide old chrome ONLY when 1B is confirmed active. */',
    "candle_css")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — Phase 2A: Velas button markup -> wrapped with custom menu
# ═══════════════════════════════════════════════════════════════════════════════
OLD_VELAS = ('      <button class="dvl1b-act" id="dvl1b_candleBtn" type="button" aria-label="Velas">\n'
'        <svg viewBox="0 0 24 24"><path d="M7 3v18M17 3v18" stroke="currentColor" stroke-width="1.8"/><rect x="5" y="7" width="4" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="15" y="5" width="4" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>\n'
'        <span>Velas</span><span class="dvl1b-chev" aria-hidden="true"></span>\n'
'      </button>')
NEW_VELAS = ('      <div class="dvl1b-menuwrap" id="dvl1b_candleWrap">\n'
'        <button class="dvl1b-act" id="dvl1b_candleBtn" type="button" aria-label="Tipo de vela" aria-haspopup="true" aria-expanded="false">\n'
'          <svg viewBox="0 0 24 24"><path d="M7 3v18M17 3v18" stroke="currentColor" stroke-width="1.8"/><rect x="5" y="7" width="4" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="15" y="5" width="4" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>\n'
'          <span id="dvl1b_candleLabel">Velas</span><span class="dvl1b-chev" aria-hidden="true"></span>\n'
'        </button>\n'
'        <div class="dvl1b-menu" id="dvl1b_candleMenu" role="menu" aria-hidden="true">\n'
'          <button class="dvl1b-menu-item" role="menuitem" type="button" data-candle="candles">Candles</button>\n'
'          <button class="dvl1b-menu-item" role="menuitem" type="button" data-candle="hollow">Hollow</button>\n'
'          <button class="dvl1b-menu-item" role="menuitem" type="button" data-candle="heikin">Heikin Ashi</button>\n'
'          <button class="dvl1b-menu-item" role="menuitem" type="button" data-candle="footprint">Footprint</button>\n'
'          <button class="dvl1b-menu-item is-disabled" role="menuitem" type="button" data-candle="line" aria-disabled="true">Line <span class="dvl1b-soon">em breve</span></button>\n'
'          <button class="dvl1b-menu-item is-disabled" role="menuitem" type="button" data-candle="area" aria-disabled="true">Area <span class="dvl1b-soon">em breve</span></button>\n'
'          <button class="dvl1b-menu-item is-disabled" role="menuitem" type="button" data-candle="bars" aria-disabled="true">Bars <span class="dvl1b-soon">em breve</span></button>\n'
'          <button class="dvl1b-menu-item" role="menuitem" type="button" data-candle="renko">Renko</button>\n'
'        </div>\n'
'      </div>')
html = rep(html, OLD_VELAS, NEW_VELAS, "velas_markup")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 5 — Phase 2A: bridge wiring (insert before the console-toggle helper)
# ═══════════════════════════════════════════════════════════════════════════════
CANDLE_JS = (
'  /* ── Phase 2A: Velas (candle type) — custom DVL dropdown -> old setCandleMode ── */\n'
'  var cWrap=document.getElementById("dvl1b_candleWrap");\n'
'  var cBtn=document.getElementById("dvl1b_candleBtn");\n'
'  var cMenu=document.getElementById("dvl1b_candleMenu");\n'
'  var cLabel=document.getElementById("dvl1b_candleLabel");\n'
'  var CANDLE_OK={candles:1,hollow:1,heikin:1,footprint:1,renko:1};\n'
'  function candleLabelFor(m){ return ({candles:"Velas",hollow:"Hollow",heikin:"Heikin Ashi",footprint:"Footprint",renko:"Renko"})[m] || "Velas"; }\n'
'  function curCandle(){ try{ if(typeof getCandleMode==="function") return getCandleMode(); }catch(_e){} try{ if(window.getCandleMode) return window.getCandleMode(); }catch(_e){} try{ if(typeof candleMode!=="undefined") return candleMode; }catch(_e){} return null; }\n'
'  function closeCandle(){ if(cWrap) cWrap.classList.remove("is-open"); if(cBtn) cBtn.setAttribute("aria-expanded","false"); if(cMenu) cMenu.setAttribute("aria-hidden","true"); }\n'
'  function markCandle(){ if(!cMenu) return; var cur=curCandle(); try{ var items=cMenu.querySelectorAll(".dvl1b-menu-item"); Array.prototype.forEach.call(items,function(it){ it.classList.toggle("is-active", !it.classList.contains("is-disabled") && it.getAttribute("data-candle")===cur); }); }catch(_e){} if(cLabel && cur && CANDLE_OK[cur]) cLabel.textContent=candleLabelFor(cur); }\n'
'  function openCandle(){ if(!cWrap||!cBtn||!cMenu) return; try{ var r=cBtn.getBoundingClientRect(); cMenu.style.left=Math.round(r.left)+"px"; cMenu.style.top=Math.round(r.bottom+6)+"px"; }catch(_e){} cWrap.classList.add("is-open"); cBtn.setAttribute("aria-expanded","true"); cMenu.setAttribute("aria-hidden","false"); markCandle(); }\n'
'  if(cBtn) cBtn.addEventListener("click", function(e){ e.stopPropagation(); if(cWrap && cWrap.classList.contains("is-open")) closeCandle(); else openCandle(); }, false);\n'
'  if(cMenu) cMenu.addEventListener("click", function(e){ var it=e.target&&e.target.closest?e.target.closest(".dvl1b-menu-item"):null; if(!it) return; if(it.classList.contains("is-disabled")){ return; } var m=it.getAttribute("data-candle"); if(CANDLE_OK[m]){ try{ if(typeof setCandleMode==="function") setCandleMode(m); else if(window.setCandleMode) window.setCandleMode(m); }catch(_e){} } closeCandle(); markCandle(); }, false);\n'
'  document.addEventListener("click", function(e){ if(cWrap && cWrap.classList.contains("is-open") && !cWrap.contains(e.target)) closeCandle(); }, false);\n\n'
)
html = rep(html,
    '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    CANDLE_JS + '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    "candle_js")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 6 — Audit -> Phase 2A 0.708
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_1C_AUDIT_MODULE_0707">',
    '<script id="DVL_UI_OVERLAY_PHASE_2A_AUDIT_MODULE_0708">',
    "audit_id")
html = rep(html,
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.707"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.707\' (got: "+window.DVL_APP_VERSION+")");',
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.708"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.708\' (got: "+window.DVL_APP_VERSION+")");',
    "audit_a1")
html = rep(html,
    'if(!_t || (_t.textContent||"").indexOf("0.707")===-1) blockers.push("A2: title missing 0.707");',
    'if(!_t || (_t.textContent||"").indexOf("0.708")===-1) blockers.push("A2: title missing 0.708");',
    "audit_a2")
html = rep(html,
    'var N=17, name="DVL_UI_OVERLAY_PHASE_1C_AUDIT_MODULE_0707";',
    '// A18. Phase 2A: Velas connected to a custom dropdown\n'
    'if(!document.getElementById("dvl1b_candleMenu")) blockers.push("A18: candle dropdown missing");\n'
    'if(!document.getElementById("dvl1b_candleBtn")) blockers.push("A18b: candle button missing");\n'
    'if(typeof setCandleMode!=="function" && typeof window.setCandleMode!=="function") blockers.push("A18c: setCandleMode not reachable");\n'
    '// A19. Custom (non-native) dropdown: no <select> inside the new UI\n'
    'var _ui2=document.getElementById("DVL_UI_OVERLAY_PHASE_1B");\n'
    'if(_ui2 && _ui2.querySelector("select")) blockers.push("A19: native <select> found (must be custom dropdown)");\n'
    '// A20. ONLY Candles integrated — Indicators/Desenhos/Settings have NO dropdown yet\n'
    'if(document.getElementById("dvl1b_indMenu")||document.getElementById("dvl1b_drawMenu")||document.getElementById("dvl1b_settingsMenu"))\n'
    '  blockers.push("A20: a non-Candles dropdown was added (Phase 2A is candles-only)");\n'
    '// A21. Mobile-first Save label present\n'
    'if(!document.querySelector("#dvl1b_saveBtn .dvl1b-save-short")) warnings.push("A21: compact save label missing");\n\n'
    'var N=21, name="DVL_UI_OVERLAY_PHASE_2A_AUDIT_MODULE_0708";',
    "audit_n")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.708 OK")
