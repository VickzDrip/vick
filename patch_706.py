#!/usr/bin/env python3
"""patch_706.py — Beta 0.706: Phase 1B inline UI (no iframe, single file)

Fixes the 0.705 failure (blank screen: iframe failed to load + old chrome was
hidden). Phase 1B:
  - Removes the 0.705 iframe overlay entirely (no iframe, no second file).
  - Adds an INLINE header/hotbar (#DVL_UI_OVERLAY_PHASE_1B) styled like the
    0.728 design (same colors / icons / --px proportions), fully namespaced
    (dvl1b_* ids, .dvl1b- classes, scoped CSS) to avoid all collisions.
  - The real chart (#chart) stays visible: new header is prepended into the
    flex column .app; old chrome is hidden ONLY after the inline UI is
    confirmed present (so the app survives if it is missing).
  - Does NOT render the 0.728 fake chart. Does NOT touch zoom/pan/scale/
    oscillators/paper/drawings/API engines.
  - Bridges only Save / Favorite / Timeframe 1m-5m-15m to the real functions.
  - No setTimeout/setInterval/RAF/observers used.
"""

import sys, os, re

PUBLIC = os.path.join(os.path.dirname(__file__),
    "DepthVisionLab-v106_REAL_UI", "public")
TARGET = os.path.join(PUBLIC, "index.html")
DESIGN_OUT = os.path.join(PUBLIC, "dvl_ui_0728.html")

def rep(html, old, new, label, expect=1):
    n = html.count(old)
    if n != expect:
        print(f"ABORT [{label}]: expected {expect} match(es), found {n}")
        sys.exit(1)
    return html.replace(old, new)

def subn1(pat, repl, html, label):
    new, n = re.subn(pat, repl, html, count=1, flags=re.DOTALL)
    if n != 1:
        print(f"ABORT [{label}]: expected 1 regex match, found {n}")
        sys.exit(1)
    return new

with open(TARGET, "r", encoding="utf-8") as f:
    html = f.read()
print(f"Loaded index.html: {len(html)} chars, {html.count(chr(10))+1} lines")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 1 — Remove the 0.705 iframe overlay + its audit, delete the 2nd file
# ═══════════════════════════════════════════════════════════════════════════════
html = subn1(r'<!--[^\n]*DVL_UI_OVERLAY_PHASE_1 \(Beta 0\.705\).*?<script id="DVL_UI_OVERLAY_PHASE_1_BRIDGE">.*?</script>\s*',
             '', html, "remove_overlay_705")
html = subn1(r'<script id="DVL_UI_OVERLAY_PHASE_1_AUDIT_MODULE_0705">.*?</script>\s*',
             '', html, "remove_audit_705")

# sanity: no 0.705 overlay / second-file references remain
for tok in ['DVL_UI_OVERLAY_PHASE_1_FRAME', 'dvl_ui_0728', 'DVL_UI_OVERLAY_PHASE_1_BRIDGE',
            'DVL_UI_OVERLAY_PHASE_1_CSS', 'DVL_UI_OVERLAY_PHASE_1_AUDIT_MODULE_0705']:
    if tok in html:
        print(f"ABORT: leftover 0.705 token in html: {tok}")
        sys.exit(1)
if '<iframe' in html:
    print("ABORT: an <iframe> still present after removal")
    sys.exit(1)

if os.path.exists(DESIGN_OUT):
    os.remove(DESIGN_OUT)
    print(f"Deleted second file: {DESIGN_OUT}")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — Version bump 0.705 -> 0.706
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.705</title>',
                 '<title>DVL Binance Live — Beta 0.706</title>', "title")
html = rep(html, '>BETA 0.705</div>', '>BETA 0.706</div>', "versionBadge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.705";',
                 'const DVL_APP_VERSION = "Beta 0.706";', "DVL_APP_VERSION")

OLD_CL = '  { version: DVL_APP_VERSION, note: "Beta 0.705 — Phase 1 UI overlay: added DVL_UI_OVERLAY_PHASE_1, a visual-only redesigned mobile UI (based on the approved 0.728 pixel-separated design) rendered as an isolated iframe layer on top of the existing functional core; old header/market-row/timeframe-toolbar/bottom-nav are visually hidden (kept in DOM), and only Save / Favorite / Timeframe 1m-5m-15m are bridged to real functions." },'
NEW_CL = ('  { version: DVL_APP_VERSION, note: "Beta 0.706 — Phase 1B inline UI: replaced the failed 0.705 iframe overlay with an inline single-file header/hotbar (#DVL_UI_OVERLAY_PHASE_1B) styled like the 0.728 design. No iframe, no second file. The real #chart stays visible; old header/market-row/timeframe-toolbar are hidden only after the inline UI is confirmed present, so the app survives if it is missing. Bridges Save / Favorite / Timeframe 1m-5m-15m." },\n'
          '  { version: "Beta 0.705", note: "Beta 0.705 (superseded by 0.706) — Phase 1 iframe UI overlay: blanked the screen on deploy when the second file failed to load; removed." },')
html = rep(html, OLD_CL, NEW_CL, "changelog_0706")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — Inject inline Phase 1B header/hotbar as first child of .app
# ═══════════════════════════════════════════════════════════════════════════════
OVERLAY_1B = r'''<!-- ════════════ DVL_UI_OVERLAY_PHASE_1B (Beta 0.706) — inline visual header/hotbar ════════════
     Visual-only new UI in the 0.728 aesthetic. Namespaced (no collisions).
     Real #chart stays visible. Old chrome hidden ONLY after this exists. -->
<style id="DVL_UI_OVERLAY_PHASE_1B_CSS">
#DVL_UI_OVERLAY_PHASE_1B{
  --px:min(calc(100vw / 864), .62px);
  --b-accent:#10df77; --b-text:#f4f6f4; --b-muted:#a5aaa9; --b-yellow:#ffd321;
  --b-border:rgba(110,140,130,.16);
  position:relative; width:100%; box-sizing:border-box; flex:0 0 auto; z-index:50;
  padding:calc(8 * var(--px)) calc(6 * var(--px)) 0;
  background:linear-gradient(180deg,#020907,#020806 60%,#010504);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  color:var(--b-text); -webkit-user-select:none; user-select:none;
}
#DVL_UI_OVERLAY_PHASE_1B *{ box-sizing:border-box; }
#DVL_UI_OVERLAY_PHASE_1B button{ font:inherit; color:inherit; border:0; background:transparent; margin:0; padding:0; cursor:pointer; touch-action:manipulation; }
#DVL_UI_OVERLAY_PHASE_1B svg{ display:block; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-card{
  background:linear-gradient(180deg,rgba(5,14,12,.86),rgba(4,11,10,.78));
  border:calc(1 * var(--px)) solid var(--b-border); border-radius:calc(17 * var(--px));
  padding:calc(12 * var(--px)) calc(18 * var(--px)); display:flex; flex-direction:column;
  gap:calc(10 * var(--px)); box-shadow:0 calc(14 * var(--px)) calc(40 * var(--px)) rgba(0,0,0,.4);
}
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-row1{ display:flex; align-items:center; gap:calc(14 * var(--px)); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-row2{ display:flex; align-items:center; gap:calc(10 * var(--px)); overflow-x:auto; scrollbar-width:none; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-row2::-webkit-scrollbar{ display:none; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-brand{ display:flex; align-items:center; gap:calc(13 * var(--px)); flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-logo{ width:calc(40 * var(--px)); height:calc(50 * var(--px)); position:relative; flex:0 0 auto; filter:drop-shadow(0 0 calc(12 * var(--px)) rgba(16,223,119,.22)); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-logo::before{ content:""; position:absolute; inset:calc(4 * var(--px)) calc(6 * var(--px)); background:linear-gradient(135deg,#18f17c,#08bd64); clip-path:polygon(0 0,100% 0,63% 34%,100% 34%,36% 100%,0 100%,35% 48%,0 48%); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-logoText{ font-size:calc(40 * var(--px)); font-weight:850; line-height:1; letter-spacing:.016em; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-badge{ height:calc(34 * var(--px)); padding:0 calc(10 * var(--px)); display:inline-flex; align-items:center; border-radius:calc(7 * var(--px)); border:calc(1 * var(--px)) solid rgba(16,223,119,.55); background:rgba(16,223,119,.06); color:var(--b-accent); font-size:calc(16 * var(--px)); font-weight:800; letter-spacing:.03em; white-space:nowrap; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-btn{ display:flex; align-items:center; justify-content:center; border:calc(1 * var(--px)) solid rgba(170,190,180,.16); background:rgba(5,14,12,.58); border-radius:calc(10 * var(--px)); color:var(--b-text); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-btn:active{ transform:scale(.985); background:rgba(16,223,119,.10); border-color:rgba(16,223,119,.28); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-symbol{ flex:1 1 auto; min-width:0; height:calc(62 * var(--px)); gap:calc(12 * var(--px)); padding:0 calc(15 * var(--px)); justify-content:flex-start; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-coin{ width:calc(42 * var(--px)); height:calc(42 * var(--px)); border-radius:50%; display:grid; place-items:center; background:linear-gradient(180deg,#ffae20,#f59000); color:#fff; font-weight:900; font-size:calc(26 * var(--px)); flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-symText{ font-size:calc(24 * var(--px)); font-weight:750; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-chev{ width:calc(14 * var(--px)); height:calc(14 * var(--px)); border-right:calc(2 * var(--px)) solid currentColor; border-bottom:calc(2 * var(--px)) solid currentColor; transform:rotate(45deg) translateY(calc(-2 * var(--px))); opacity:.85; flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-symbol .dvl1b-chev{ margin-left:auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-star{ width:calc(56 * var(--px)); height:calc(56 * var(--px)); flex:0 0 auto; background:transparent; border-color:transparent; color:var(--b-yellow); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-star svg{ width:calc(34 * var(--px)); height:calc(34 * var(--px)); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-star.is-fav svg path{ fill:var(--b-yellow); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save{ flex:0 0 auto; height:calc(62 * var(--px)); padding:0 calc(16 * var(--px)); font-size:calc(22 * var(--px)); font-weight:500; color:#f1f1ee; white-space:nowrap; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save.dvl1b-pulse{ animation:dvl1bPulse .5s ease; }
@keyframes dvl1bPulse{ 0%{ background:rgba(16,223,119,.30); border-color:rgba(16,223,119,.6); } 100%{ background:rgba(5,14,12,.58); } }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-more{ width:calc(40 * var(--px)); height:calc(56 * var(--px)); flex:0 0 auto; border-color:transparent; background:transparent; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-kebab{ display:flex; flex-direction:column; gap:calc(5 * var(--px)); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-kebab i{ width:calc(5 * var(--px)); height:calc(5 * var(--px)); border-radius:50%; background:#d9dddc; display:block; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tfRow{ display:flex; align-items:center; gap:calc(6 * var(--px)); flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tf{ height:calc(46 * var(--px)); min-width:calc(54 * var(--px)); padding:0 calc(12 * var(--px)); border-radius:calc(9 * var(--px)); font-size:calc(22 * var(--px)); font-weight:700; color:var(--b-muted); border:calc(1 * var(--px)) solid transparent; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-tf.is-active{ color:var(--b-accent); font-weight:800; background:rgba(16,223,119,.10); border-color:rgba(16,223,119,.30); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-sep{ width:calc(1 * var(--px)); height:calc(36 * var(--px)); background:rgba(180,198,190,.16); flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act{ display:flex; align-items:center; gap:calc(9 * var(--px)); height:calc(50 * var(--px)); padding:0 calc(9 * var(--px)); border-radius:calc(9 * var(--px)); font-size:calc(21 * var(--px)); font-weight:450; color:#eef2f0; white-space:nowrap; flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act svg{ width:calc(28 * var(--px)); height:calc(28 * var(--px)); color:#eef2f0; flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act .dvl1b-chev{ width:calc(12 * var(--px)); height:calc(12 * var(--px)); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-fx{ font-family:Georgia,serif; font-style:italic; font-size:calc(30 * var(--px)); line-height:.9; flex:0 0 auto; }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-gear{ padding:0 calc(6 * var(--px)); }
#DVL_UI_OVERLAY_PHASE_1B .dvl1b-gear svg{ width:calc(32 * var(--px)); height:calc(32 * var(--px)); }
/* Hide old chrome ONLY when 1B is confirmed active. */
html.dvl-ui-1b-active .top,
html.dvl-ui-1b-active .marketRow,
html.dvl-ui-1b-active .chartCard > .toolbar{ display:none !important; }
</style>
<div id="DVL_UI_OVERLAY_PHASE_1B" data-dvl-overlay-phase="1B" aria-label="DVL new UI (phase 1B, visual)">
  <div class="dvl1b-card">
    <div class="dvl1b-row1">
      <div class="dvl1b-brand">
        <span class="dvl1b-logo" aria-hidden="true"></span>
        <span class="dvl1b-logoText">DVL</span>
        <span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.706</span>
      </div>
      <button class="dvl1b-btn dvl1b-symbol" id="dvl1b_symbolBtn" type="button" aria-label="Selecionar ativo">
        <span class="dvl1b-coin" aria-hidden="true">&#8383;</span>
        <span class="dvl1b-symText" id="dvl1b_symbolText">BTC/USDT</span>
        <span class="dvl1b-chev" aria-hidden="true"></span>
      </button>
      <button class="dvl1b-btn dvl1b-star" id="dvl1b_favBtn" type="button" aria-label="Favoritar ativo">
        <svg viewBox="0 0 24 24"><path d="M12 2.8l2.82 5.72 6.31.92-4.56 4.45 1.08 6.28L12 17.2l-5.65 2.97 1.08-6.28-4.56-4.45 6.31-.92L12 2.8z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/></svg>
      </button>
      <button class="dvl1b-btn dvl1b-save" id="dvl1b_saveBtn" type="button">Salvar perfil</button>
      <button class="dvl1b-btn dvl1b-more" id="dvl1b_menuBtn" type="button" aria-label="Menu">
        <span class="dvl1b-kebab" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
    </div>
    <div class="dvl1b-row2">
      <div class="dvl1b-tfRow" id="dvl1b_tfRow">
        <button class="dvl1b-tf" data-tf="1m" type="button">1m</button>
        <button class="dvl1b-tf" data-tf="5m" type="button">5m</button>
        <button class="dvl1b-tf" data-tf="15m" type="button">15m</button>
      </div>
      <span class="dvl1b-sep"></span>
      <button class="dvl1b-act" id="dvl1b_candleBtn" type="button" aria-label="Velas">
        <svg viewBox="0 0 24 24"><path d="M7 3v18M17 3v18" stroke="currentColor" stroke-width="1.8"/><rect x="5" y="7" width="4" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="15" y="5" width="4" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
        <span>Velas</span><span class="dvl1b-chev" aria-hidden="true"></span>
      </button>
      <span class="dvl1b-sep"></span>
      <button class="dvl1b-act" id="dvl1b_indBtn" type="button" aria-label="Indicadores">
        <span class="dvl1b-fx" aria-hidden="true">&#402;x</span><span>Indicadores</span><span class="dvl1b-chev" aria-hidden="true"></span>
      </button>
      <span class="dvl1b-sep"></span>
      <button class="dvl1b-act" id="dvl1b_drawBtn" type="button" aria-label="Desenhos">
        <svg viewBox="0 0 24 24"><circle cx="5" cy="19" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="19" cy="5" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 17.5l11-11" stroke="currentColor" stroke-width="1.8"/></svg>
        <span>Desenhos</span><span class="dvl1b-chev" aria-hidden="true"></span>
      </button>
      <span class="dvl1b-sep"></span>
      <button class="dvl1b-act dvl1b-gear" id="dvl1b_settingsBtn" type="button" aria-label="Configurações">
        <svg viewBox="0 0 24 24"><path d="M12 8.2A3.8 3.8 0 1 0 12 15.8A3.8 3.8 0 0 0 12 8.2Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a8.1 8.1 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a8.2 8.2 0 0 0-1.7-1L15 6.4h-4L10.6 9a8.2 8.2 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a8.1 8.1 0 0 0 .1 1l-2 1.5 2 3.5 2.4-1a8.2 8.2 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8.2 8.2 0 0 0 1.7-1l2.4 1 2-3.5-2.2-1.6Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</div>
<script id="DVL_UI_OVERLAY_PHASE_1B_BRIDGE">
/* Phase 1B bridge (inline, same document): wires only SAFE controls to the
   real functions. Visual-only otherwise. No timers/observers used. */
(function(){
  "use strict";
  var root = document.getElementById("DVL_UI_OVERLAY_PHASE_1B");
  if(!root) return; /* inline UI missing -> leave old app fully visible */

  /* Only hide old chrome once the new UI is confirmed present. */
  try{ document.documentElement.classList.add("dvl-ui-1b-active"); }catch(_e){}

  function curSym(){ try{ if(typeof symbol !== "undefined" && symbol) return symbol; }catch(_e){} try{ if(window.symbol) return window.symbol; }catch(_e){} return null; }
  function fmtSym(s){ if(!s) return null; s=String(s); var i=s.indexOf("USDT"); return (i>0)? (s.slice(0,i)+"/USDT") : s; }

  /* reflect current real symbol + active timeframe */
  try{ var st=document.getElementById("dvl1b_symbolText"); var cs=fmtSym(curSym()); if(st && cs) st.textContent=cs; }catch(_e){}
  try{
    var iv=(typeof interval!=="undefined")?interval:(window.interval||null);
    if(iv){ var ab=root.querySelector('.dvl1b-tf[data-tf="'+iv+'"]'); if(ab) ab.classList.add("is-active"); }
  }catch(_e){}

  /* SAVE -> saveProfile() */
  var sv=document.getElementById("dvl1b_saveBtn");
  if(sv) sv.addEventListener("click", function(){
    try{ if(typeof saveProfile==="function") saveProfile(); else if(window.saveProfile) window.saveProfile(); }catch(_e){}
    try{ sv.classList.remove("dvl1b-pulse"); void sv.offsetWidth; sv.classList.add("dvl1b-pulse"); }catch(_e){}
  }, false);

  /* FAVORITE -> toggleFavoriteSymbol(currentSymbol) */
  var fav=document.getElementById("dvl1b_favBtn");
  if(fav) fav.addEventListener("click", function(){
    try{ var s=curSym(); if(s){ if(typeof toggleFavoriteSymbol==="function") toggleFavoriteSymbol(s); else if(window.toggleFavoriteSymbol) window.toggleFavoriteSymbol(s); } }catch(_e){}
    try{ fav.classList.toggle("is-fav"); }catch(_e){}
  }, false);

  /* TIMEFRAME 1m/5m/15m -> setIntervalUi() */
  var tfs=root.querySelectorAll(".dvl1b-tf");
  Array.prototype.forEach.call(tfs, function(btn){
    btn.addEventListener("click", function(){
      var tf=btn.getAttribute("data-tf");
      if(tf==="1m"||tf==="5m"||tf==="15m"){
        try{ if(typeof setIntervalUi==="function") setIntervalUi(tf); else if(window.setIntervalUi) window.setIntervalUi(tf); }catch(_e){}
      }
      try{ Array.prototype.forEach.call(tfs,function(b){ b.classList.remove("is-active"); }); btn.classList.add("is-active"); }catch(_e){}
    }, false);
  });

  /* Console helper: toggle the new UI on/off (also restores old chrome). */
  window.DVL_UI_1B_SET = function(on){
    try{
      root.style.display = on ? "" : "none";
      document.documentElement.classList.toggle("dvl-ui-1b-active", !!on);
    }catch(_e){}
  };
})();
</script>
'''

html = rep(html, '<div class="app">\n', '<div class="app">\n' + OVERLAY_1B, "inject_1b")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — Audit module
# ═══════════════════════════════════════════════════════════════════════════════
AUDIT = '''
<script id="DVL_UI_OVERLAY_PHASE_1B_AUDIT_MODULE_0706">
(function(){
"use strict";
var blockers=[], warnings=[];

// A1. Version
if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.706"))
  blockers.push("A1: DVL_APP_VERSION !== 'Beta 0.706' (got: "+window.DVL_APP_VERSION+")");

// A2. Title
var _t=document.querySelector("title");
if(!_t || (_t.textContent||"").indexOf("0.706")===-1) blockers.push("A2: title missing 0.706");

// A3. NO iframe anywhere (Phase 1B requirement)
if(document.querySelector("iframe")) blockers.push("A3: an <iframe> exists (must be none)");

// A4. No 0.705 overlay / second-file leftovers
if(document.getElementById("DVL_UI_OVERLAY_PHASE_1")) blockers.push("A4: stale #DVL_UI_OVERLAY_PHASE_1 present");
if(document.getElementById("DVL_UI_OVERLAY_PHASE_1_FRAME")) blockers.push("A4b: stale overlay iframe present");

// A5. Inline UI exists
var _ui=document.getElementById("DVL_UI_OVERLAY_PHASE_1B");
if(!_ui) blockers.push("A5: #DVL_UI_OVERLAY_PHASE_1B inline UI missing");

// A6. Real chart #chart present AND visible
var _c=document.getElementById("chart");
if(!_c){ blockers.push("A6: #chart missing"); }
else{
  var vis=true;
  try{ var cs=getComputedStyle(_c); if(cs.display==="none"||cs.visibility==="hidden") vis=false; }catch(_e){}
  try{ if(_c.getClientRects().length===0) vis=false; }catch(_e){}
  if(!vis) blockers.push("A6: #chart not visible");
}

// A7-A10. Old chrome STILL in DOM (hidden, not removed)
if(!document.querySelector(".top")) blockers.push("A7: old .top removed (must stay in DOM)");
if(!document.querySelector(".marketRow")) blockers.push("A8: old .marketRow removed (must stay in DOM)");
if(!document.querySelector(".chartCard > .toolbar")) blockers.push("A9: old .chartCard toolbar removed (must stay in DOM)");
if(!document.querySelector(".bottomNav")) warnings.push("A10: .bottomNav not found");

// A11. Overlay-active class set (hide gate fired)
if(!document.documentElement.classList.contains("dvl-ui-1b-active")) warnings.push("A11: dvl-ui-1b-active not set (old chrome not hidden)");

// A12. No duplicate IDs with host (namespaced ids must be unique)
["dvl1b_symbolBtn","dvl1b_symbolText","dvl1b_favBtn","dvl1b_saveBtn","dvl1b_versionBadge"].forEach(function(id){
  if(document.querySelectorAll("#"+id).length!==1) blockers.push("A12: id "+id+" not unique");
});

// A13. Bridge script present + console helper exposed
if(!document.getElementById("DVL_UI_OVERLAY_PHASE_1B_BRIDGE")) blockers.push("A13: bridge script missing");
if(typeof window.DVL_UI_1B_SET!=="function") warnings.push("A13b: DVL_UI_1B_SET not exposed");

// A14. Functional engines NOT rewritten (still present)
if(typeof setIntervalUi!=="function" && typeof window.setIntervalUi!=="function") blockers.push("A14: setIntervalUi missing (engine altered)");
if(typeof visibleWindow!=="function" && typeof window.visibleWindow!=="function") warnings.push("A14b: visibleWindow not reachable");
if(typeof saveProfile!=="function" && typeof window.saveProfile!=="function") warnings.push("A14c: saveProfile not reachable");
if(typeof selectSymbol!=="function" && typeof window.selectSymbol!=="function") warnings.push("A14d: selectSymbol not reachable");

// A15. Paper V2 baseline preserved
if(!document.getElementById("DVL_PAPER_LOCK_FIX_GUARD_0701")) blockers.push("A15: DVL_PAPER_LOCK_FIX_GUARD_0701 missing");
if(!document.getElementById("DVL_OBJECT_PERSISTENCE_ROLLBACK_AUDIT_MODULE_0704")) warnings.push("A15b: 0704 audit missing");

// A16. No second-file reference remains
if(document.querySelector('[src*="dvl_ui_"],[href*="dvl_ui_"]')) blockers.push("A16: a second-file (dvl_ui_*) resource is still loaded");

var N=16, name="DVL_UI_OVERLAY_PHASE_1B_AUDIT_MODULE_0706";
if(blockers.length){
  var m="["+name+"] BLOCKED ("+blockers.length+"): "+blockers.join("; ");
  if(warnings.length) m+=" | Warnings: "+warnings.join("; ");
  console.error(m);
  if(typeof window.DVL_AUDIT_BLOCK==="function") window.DVL_AUDIT_BLOCK(name, blockers);
}else{
  var ok="["+name+"] OK — "+N+" checks passed";
  if(warnings.length) ok+=" ("+warnings.length+" warning(s): "+warnings.join("; ")+")";
  console.log(ok);
}
})();
</script>
'''

html = rep(html, '</body>', AUDIT + '</body>', "audit_inject")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.706 OK")
