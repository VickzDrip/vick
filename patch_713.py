#!/usr/bin/env python3
"""patch_713.py — Beta 0.713: 4-point UI/bridge correction

1. Indicators compact — width min(300px,100vw-20px), max-height 54vh,
   denser items. Scoped to html.dvl1b-ind-open. No logic changes.

2. Desenhos clean open — hide #assetToolsStrip (favorite-tool icon row)
   and #assetToolsGear when dvl1b-draw-open: they were visible because
   #assetToolsShell * { visibility:visible } applies to all children.
   Only the #assetToolsMenu itself should show. Also hide any residual
   chart-area floating elements for cleanliness.

3. Candles active state — openCandle() now adds dvl1b-open to cBtn so
   the Velas button turns green while the menu is open. closeCandle()
   removes it. markCandle() already marks the active item in the menu;
   the new cBtn styling makes the button itself also highlight.

4. TF scroll picker — replaces 3 fixed TF buttons (1m/5m/15m) with a
   horizontally-scrollable strip showing 13 TFs (1s→1D). CSS: fade masks
   at edges, scroll-snap per button, active = green. JS: calls setIntervalUi
   for any TF (removes old 1m/5m/15m filter), scroll active into view.

No chart/zoom/pan/scale/oscillator/paper/API changes. Single file.
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
# PART 1 — Version bump 0.712 -> 0.713
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.712</title>',
                 '<title>DVL Binance Live — Beta 0.713</title>', "title")
html = rep(html, '>BETA 0.712</div>', '>BETA 0.713</div>', "host_badge")
html = rep(html, '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.712</span>',
                 '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.713</span>', "new_badge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.712";',
                 'const DVL_APP_VERSION = "Beta 0.713";', "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.712 — Phase 2B-FIX-2',
    '  { version: DVL_APP_VERSION, note: "Beta 0.713 — 4-point UI/bridge correction: (1) Indicators compact: width min(300px,100vw-20px), max-height 54vh, denser items; (2) Desenhos clean open: strip/gear hidden, only menu visible; (3) Candles active state: Velas button turns green when menu open, active item highlighted in menu; (4) TF scroll picker: replaces 3 fixed TF buttons with 13-TF horizontal scroll strip (1s-1D), active TF in green, scroll into view on tap." },\n'
    '  { version: "Beta 0.712", note: "Beta 0.712 — Phase 2B-FIX-2',
    "changelog_0713")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — Fix 1: Indicators compact — narrow, shorter, denser items
# ═══════════════════════════════════════════════════════════════════════════════
# 2a. Tighten the dropdown container
html = rep(html,
    'html.dvl1b-ind-open #indicatorDropdown{\n'
    '  width:min(310px, calc(100vw - 18px)) !important;\n'
    '  max-height:56vh !important;\n'
    '  overflow-y:auto !important;\n'
    '  overflow-x:hidden !important;\n'
    '  -webkit-overflow-scrolling:touch !important;\n'
    '}',
    'html.dvl1b-ind-open #indicatorDropdown{\n'
    '  width:min(300px, calc(100vw - 20px)) !important;\n'
    '  max-height:54vh !important;\n'
    '  overflow-y:auto !important;\n'
    '  overflow-x:hidden !important;\n'
    '  -webkit-overflow-scrolling:touch !important;\n'
    '}',
    "ind_compact_size")

# 2b. Tighter header
html = rep(html,
    'html.dvl1b-ind-open .indicatorDropHead{\n'
    '  height:38px !important;\n'
    '  min-height:38px !important;\n'
    '  padding:0 12px !important;\n'
    '  font-size:11px !important;\n'
    '  letter-spacing:.04em !important;\n'
    '  text-transform:uppercase !important;\n'
    '}',
    'html.dvl1b-ind-open .indicatorDropHead{\n'
    '  height:34px !important;\n'
    '  min-height:34px !important;\n'
    '  padding:0 10px !important;\n'
    '  font-size:10px !important;\n'
    '  letter-spacing:.05em !important;\n'
    '  text-transform:uppercase !important;\n'
    '}',
    "ind_compact_head")

# 2c. Tighter items
html = rep(html,
    'html.dvl1b-ind-open .indicatorItem{\n'
    '  min-height:44px !important;\n'
    '  max-height:52px !important;\n'
    '  padding:5px 10px !important;\n'
    '  grid-template-columns:30px minmax(0,1fr) 46px !important;\n'
    '  gap:8px !important;\n'
    '}',
    'html.dvl1b-ind-open .indicatorItem{\n'
    '  min-height:42px !important;\n'
    '  max-height:48px !important;\n'
    '  padding:4px 10px !important;\n'
    '  grid-template-columns:28px minmax(0,1fr) 42px !important;\n'
    '  gap:7px !important;\n'
    '}',
    "ind_compact_item")

# 2d. Tighter badge
html = rep(html,
    'html.dvl1b-ind-open .indicatorFxMark{\n'
    '  width:30px !important;\n'
    '  height:30px !important;\n'
    '  min-width:30px !important;\n'
    '  min-height:30px !important;\n'
    '  border-radius:7px !important;\n'
    '  font-size:10px !important;\n'
    '}',
    'html.dvl1b-ind-open .indicatorFxMark{\n'
    '  width:28px !important;\n'
    '  height:28px !important;\n'
    '  min-width:28px !important;\n'
    '  min-height:28px !important;\n'
    '  border-radius:6px !important;\n'
    '  font-size:9.5px !important;\n'
    '}',
    "ind_compact_badge")

# 2e. Tighter toggle
html = rep(html,
    'html.dvl1b-ind-open .indicatorItem .dvl-vt-state{\n'
    '  width:44px !important; min-width:44px !important; max-width:44px !important;\n'
    '  height:20px !important; flex:0 0 44px !important;\n'
    '}',
    'html.dvl1b-ind-open .indicatorItem .dvl-vt-state{\n'
    '  width:40px !important; min-width:40px !important; max-width:40px !important;\n'
    '  height:18px !important; flex:0 0 40px !important;\n'
    '}',
    "ind_compact_toggle")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — Fix 2: Desenhos clean open — hide strip/gear, only menu shows
# ═══════════════════════════════════════════════════════════════════════════════
DRAW_FIX_CSS = (
'\n/* Phase 2C-FIX: hide favorite-tool strip and gear so only #assetToolsMenu shows */\n'
'html.dvl1b-draw-open #assetToolsStrip{ display:none !important; visibility:hidden !important; }\n'
'html.dvl1b-draw-open #assetToolsGear{ display:none !important; visibility:hidden !important; }\n'
'html.dvl1b-draw-open .moreDot{ display:none !important; visibility:hidden !important; }\n'
)
html = rep(html,
    'html.dvl1b-draw-open .assetToolsShell.is-open > .assetToolBtn.toolGear{ color:#10df77 !important; background:rgba(16,223,119,.08) !important; box-shadow:inset 0 0 0 1px rgba(16,223,119,.30) !important; }',
    'html.dvl1b-draw-open .assetToolsShell.is-open > .assetToolBtn.toolGear{ color:#10df77 !important; background:rgba(16,223,119,.08) !important; box-shadow:inset 0 0 0 1px rgba(16,223,119,.30) !important; }'
    + DRAW_FIX_CSS,
    "draw_fix_css")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — Fix 3: Candles active state — button turns green when menu open
# ═══════════════════════════════════════════════════════════════════════════════
# 4a. openCandle: add dvl1b-open to cBtn
html = rep(html,
    'function openCandle(){ if(!cWrap||!cBtn||!cMenu) return; try{ var r=cBtn.getBoundingClientRect(); cMenu.style.left=Math.round(r.left)+"px"; cMenu.style.top=Math.round(r.bottom+6)+"px"; }catch(_e){} cWrap.classList.add("is-open"); cBtn.setAttribute("aria-expanded","true"); cMenu.setAttribute("aria-hidden","false"); markCandle(); }',
    'function openCandle(){ if(!cWrap||!cBtn||!cMenu) return; try{ var r=cBtn.getBoundingClientRect(); cMenu.style.left=Math.round(r.left)+"px"; cMenu.style.top=Math.round(r.bottom+6)+"px"; }catch(_e){} cWrap.classList.add("is-open"); cBtn.classList.add("dvl1b-open"); cBtn.setAttribute("aria-expanded","true"); cMenu.setAttribute("aria-hidden","false"); markCandle(); }',
    "candle_open_active")

# 4b. closeCandle: remove dvl1b-open from cBtn
html = rep(html,
    'function closeCandle(){ if(cWrap) cWrap.classList.remove("is-open"); if(cBtn) cBtn.setAttribute("aria-expanded","false"); if(cMenu) cMenu.setAttribute("aria-hidden","true"); }',
    'function closeCandle(){ if(cWrap) cWrap.classList.remove("is-open"); if(cBtn){ cBtn.classList.remove("dvl1b-open"); cBtn.setAttribute("aria-expanded","false"); } if(cMenu) cMenu.setAttribute("aria-hidden","true"); }',
    "candle_close_active")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 5 — Fix 4a: TF scroll picker — CSS (replace old tfRow/tf rules)
# ═══════════════════════════════════════════════════════════════════════════════
TF_PICKER_CSS = (
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfPicker{ position:relative; flex:0 1 calc(120 * var(--px)); min-width:calc(60 * var(--px)); max-width:calc(150 * var(--px)); overflow:hidden; align-self:stretch; display:flex; align-items:center; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfPicker::before,\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfPicker::after{ content:""; position:absolute; top:0; bottom:0; width:calc(18 * var(--px)); z-index:1; pointer-events:none; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfPicker::before{ left:0; background:linear-gradient(to right,rgba(8,12,10,.95),transparent); }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfPicker::after{ right:0; background:linear-gradient(to left,rgba(8,12,10,.95),transparent); }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfScroll{ display:flex; align-items:center; gap:calc(3 * var(--px)); overflow-x:auto; scrollbar-width:none; width:100%; padding:0 calc(18 * var(--px)); scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfScroll::-webkit-scrollbar{ display:none; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tf{ flex:0 0 auto; scroll-snap-align:center; height:calc(40 * var(--px)); min-width:calc(38 * var(--px)); padding:0 calc(9 * var(--px)); border-radius:calc(8 * var(--px)); font-size:calc(19 * var(--px)); font-weight:600; color:rgba(160,185,172,.55); border:0; background:transparent; white-space:nowrap; transition:color .12s, background .12s, font-weight .12s; cursor:pointer; }\n'
'#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tf.is-active{ color:#10df77; font-weight:750; background:rgba(16,223,119,.10); border-radius:calc(8 * var(--px)); }\n'
)
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfRow{ display:flex; align-items:center; gap:calc(6 * var(--px)); flex:0 0 auto; }\n'
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tf{ height:calc(46 * var(--px)); min-width:calc(54 * var(--px)); padding:0 calc(12 * var(--px)); border-radius:calc(9 * var(--px)); font-size:calc(22 * var(--px)); font-weight:700; color:var(--b-muted); border:calc(1 * var(--px)) solid transparent; }\n'
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tf.is-active{ color:var(--b-accent); font-weight:800; background:rgba(16,223,119,.10); border-color:rgba(16,223,119,.30); }',
    TF_PICKER_CSS.rstrip('\n'),
    "tf_picker_css")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 6 — Fix 4b: TF scroll picker — markup (replace 3 fixed buttons)
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '      <div class="dvl1b-tfRow" id="dvl1b_tfRow">\n'
    '        <button class="dvl1b-tf" data-tf="1m" type="button">1m</button>\n'
    '        <button class="dvl1b-tf" data-tf="5m" type="button">5m</button>\n'
    '        <button class="dvl1b-tf" data-tf="15m" type="button">15m</button>\n'
    '      </div>',
    '      <div class="dvl1b-tfPicker" id="dvl1b_tfPicker" aria-label="Timeframe">\n'
    '        <div class="dvl1b-tfScroll" id="dvl1b_tfScroll">\n'
    '          <button class="dvl1b-tf" data-tf="1s" type="button">1s</button>\n'
    '          <button class="dvl1b-tf" data-tf="5s" type="button">5s</button>\n'
    '          <button class="dvl1b-tf" data-tf="15s" type="button">15s</button>\n'
    '          <button class="dvl1b-tf" data-tf="30s" type="button">30s</button>\n'
    '          <button class="dvl1b-tf" data-tf="1m" type="button">1m</button>\n'
    '          <button class="dvl1b-tf" data-tf="3m" type="button">3m</button>\n'
    '          <button class="dvl1b-tf" data-tf="5m" type="button">5m</button>\n'
    '          <button class="dvl1b-tf" data-tf="15m" type="button">15m</button>\n'
    '          <button class="dvl1b-tf" data-tf="30m" type="button">30m</button>\n'
    '          <button class="dvl1b-tf" data-tf="1H" type="button">1H</button>\n'
    '          <button class="dvl1b-tf" data-tf="2H" type="button">2H</button>\n'
    '          <button class="dvl1b-tf" data-tf="4H" type="button">4H</button>\n'
    '          <button class="dvl1b-tf" data-tf="1D" type="button">1D</button>\n'
    '        </div>\n'
    '      </div>',
    "tf_picker_markup")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 7 — Fix 4c: TF scroll picker — JS (replace old TF listener block)
# ═══════════════════════════════════════════════════════════════════════════════
# 7a. Replace the old init that hard-coded class (now handled by markActiveTf below)
html = rep(html,
    '  try{\n'
    '    var iv=(typeof interval!=="undefined")?interval:(window.interval||null);\n'
    '    if(iv){ var ab=root.querySelector(\'[data-tf="\'+iv+\'"]\'); if(ab) ab.classList.add("is-active"); }\n'
    '  }catch(_e){}',
    '  /* TF active state on init — delegated to markActiveTf() defined in TF picker block */',
    "tf_init_noop",
    expect=0)   # might not exist; let's try expect=1 with original text
# Actually let me use the exact original text
html = rep(html,
    '    if(iv){ var ab=root.querySelector(\'.dvl1b-tf[data-tf="\'+iv+\'"]\'); if(ab) ab.classList.add("is-active"); }',
    '    if(iv){ /* TF active init — markActiveTf() handles this below */ }',
    "tf_init_class")

# 7b. Replace the full TF listener block
html = rep(html,
    '  /* TIMEFRAME 1m/5m/15m -> setIntervalUi() */\n'
    '  var tfs=root.querySelectorAll(".dvl1b-tf");\n'
    '  Array.prototype.forEach.call(tfs, function(btn){\n'
    '    btn.addEventListener("click", function(){\n'
    '      var tf=btn.getAttribute("data-tf");\n'
    '      if(tf==="1m"||tf==="5m"||tf==="15m"){\n'
    '        try{ if(typeof setIntervalUi==="function") setIntervalUi(tf); else if(window.setIntervalUi) window.setIntervalUi(tf); }catch(_e){}\n'
    '      }\n'
    '      try{ Array.prototype.forEach.call(tfs,function(b){ b.classList.remove("is-active"); }); btn.classList.add("is-active"); }catch(_e){}\n'
    '    }, false);\n'
    '  });',
    '  /* ── TF scroll picker (0.713): all 13 TFs, setIntervalUi for any, scroll-into-view ── */\n'
    '  var tfs=root.querySelectorAll(".dvl1b-tf");\n'
    '  function markActiveTf(tf){ try{ Array.prototype.forEach.call(tfs,function(b){ b.classList.remove("is-active"); }); var a=root.querySelector(\'.dvl1b-tf[data-tf="\'+tf+\'"]\'); if(a){ a.classList.add("is-active"); try{ a.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"}); }catch(_e){} } }catch(_e){} }\n'
    '  Array.prototype.forEach.call(tfs, function(btn){\n'
    '    btn.addEventListener("click", function(){\n'
    '      var tf=btn.getAttribute("data-tf");\n'
    '      if(!tf) return;\n'
    '      try{ if(typeof setIntervalUi==="function") setIntervalUi(tf); else if(window.setIntervalUi) window.setIntervalUi(tf); }catch(_e){}\n'
    '      markActiveTf(tf);\n'
    '    }, false);\n'
    '  });\n'
    '  try{ var ivTf=(typeof interval!=="undefined")?interval:(window.interval||null); if(ivTf) markActiveTf(ivTf); }catch(_e){}',
    "tf_picker_js")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 8 — Audit -> 0.713
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_2B_FIX2_AUDIT_MODULE_0712">',
    '<script id="DVL_UI_OVERLAY_PHASE_0713_AUDIT_MODULE">',
    "audit_id")
html = rep(html,
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.712"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.712\' (got: "+window.DVL_APP_VERSION+")");',
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.713"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.713\' (got: "+window.DVL_APP_VERSION+")");',
    "audit_a1")
html = rep(html,
    'if(!_t || (_t.textContent||"").indexOf("0.712")===-1) blockers.push("A2: title missing 0.712");',
    'if(!_t || (_t.textContent||"").indexOf("0.713")===-1) blockers.push("A2: title missing 0.713");',
    "audit_a2")
html = rep(html,
    'var N=35, name="DVL_UI_OVERLAY_PHASE_2B_FIX2_AUDIT_MODULE_0712";',
    '// A36. TF scroll picker present (dvl1b_tfPicker, dvl1b_tfScroll, 13 buttons)\n'
    'if(!document.getElementById("dvl1b_tfPicker")) blockers.push("A36: TF scroll picker (dvl1b_tfPicker) missing");\n'
    'if(!document.getElementById("dvl1b_tfScroll")) blockers.push("A36b: TF scroll container (dvl1b_tfScroll) missing");\n'
    'if(document.querySelectorAll(".dvl1b-tf").length < 13) warnings.push("A36c: fewer than 13 TF buttons found");\n'
    '// A37. Candle button gets active class (dvl1b-open) — check bridge patched\n'
    '(function(){ var s=document.getElementById("DVL_UI_OVERLAY_PHASE_1B_BRIDGE"); var t=s?(s.textContent||""):""; if(t.indexOf("cBtn.classList.add(\\"dvl1b-open\\")")===-1) warnings.push("A37: candle active-class bridge not found"); })();\n'
    '// A38. Desenhos strip hidden: CSS rule present\n'
    '(function(){ var found=false; try{ var ss=document.styleSheets; for(var si=0;si<ss.length;si++){ try{ var rules=ss[si].cssRules||[]; for(var ri=0;ri<rules.length;ri++){ var r=rules[ri]; if(r.selectorText&&r.selectorText.indexOf("dvl1b-draw-open")!==-1&&r.selectorText.indexOf("assetToolsStrip")!==-1){ found=true; break; } } if(found) break; }catch(_ie){} } }catch(_e){} if(!found) warnings.push("A38: Desenhos strip-hide rule not found"); })();\n'
    '// A39. Indicators compact: max-height 54vh present\n'
    '(function(){ var found=false; try{ var ss=document.styleSheets; for(var si=0;si<ss.length;si++){ try{ var rules=ss[si].cssRules||[]; for(var ri=0;ri<rules.length;ri++){ var r=rules[ri]; if(r.selectorText&&r.selectorText.indexOf("dvl1b-ind-open")!==-1&&r.selectorText.indexOf("indicatorDropdown")!==-1&&r.style&&r.style.maxHeight){ found=true; break; } } if(found) break; }catch(_ie){} } }catch(_e){} if(!found) warnings.push("A39: indicators compact max-height rule not found"); })();\n\n'
    'var N=39, name="DVL_UI_OVERLAY_PHASE_0713_AUDIT_MODULE";',
    "audit_n")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.713 OK")
