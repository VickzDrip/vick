#!/usr/bin/env python3
"""patch_705.py — Beta 0.705: Phase 1 UI Overlay (visual layer)

Adds DVL_UI_OVERLAY_PHASE_1 — a new visual UI layer based on the approved
0.728 "pixel separated" design, rendered as an isolated <iframe> overlay on
top of the existing functional DVL core.

Phase 1 = VISUAL ONLY.
- Does NOT move old DOM / canvas / toolbar / scripts.
- Visually hides (visibility:hidden, no reflow) the old header / market row /
  timeframe toolbar / bottom nav while keeping them in the DOM.
- New UI is fully isolated inside an iframe (zero CSS/JS collision with the
  40k-line app), so it reproduces the 0.728 look/proportions exactly and is
  trivially reversible for Phase 2.
- Bridges ONLY the safe controls: SAVE, FAVORITE, TIMEFRAME 1m/5m/15m via
  postMessage. ASSET selection stays visual (Phase 2).
"""

import sys, os, re

PUBLIC = os.path.join(os.path.dirname(__file__),
    "DepthVisionLab-v106_REAL_UI", "public")
TARGET = os.path.join(PUBLIC, "index.html")
DESIGN_SRC = "/root/.claude/uploads/572a5b6b-aa34-5b5b-a24e-0a73f32b4204/87042339-dvl_pixel_separated_0728_price_scale_zoom11.html"
DESIGN_OUT = os.path.join(PUBLIC, "dvl_ui_0728.html")

def rep(html, old, new, label, expect=1):
    n = html.count(old)
    if n != expect:
        print(f"ABORT [{label}]: expected {expect} match(es), found {n}")
        sys.exit(1)
    return html.replace(old, new)

# ═══════════════════════════════════════════════════════════════════════════════
# PART A — Build the isolated design file (public/dvl_ui_0728.html) + iframe bridge
# ═══════════════════════════════════════════════════════════════════════════════
with open(DESIGN_SRC, "r", encoding="utf-8") as f:
    design = f.read()
print(f"Loaded design: {len(design)} chars, {design.count(chr(10))+1} lines")

IFRAME_BRIDGE = '''
<script id="DVL_UI_OVERLAY_PHASE_1_IFRAME_BRIDGE">
/* Phase 1 bridge (iframe side): forwards SAFE control clicks to the host app.
   Visual-only design otherwise runs unchanged. */
(function(){
  "use strict";
  function send(type, payload){
    try{ parent.postMessage({ __dvlOverlayPhase1:true, type:type, payload:payload }, "*"); }catch(_e){}
  }
  function on(id, fn){ var el=document.getElementById(id); if(el) el.addEventListener("click", fn, false); }
  on("profileSaveBtn",     function(){ send("save"); });
  on("currentFavoriteBtn", function(){ send("favorite"); });
  on("symbolBtn",          function(){ send("assetClick"); }); /* Phase 2 on host side */
  /* Delegated: timeframe options/buttons are generated at runtime by the design. */
  document.addEventListener("click", function(e){
    var t = e.target;
    var opt = (t && t.closest) ? t.closest("[data-timeframe]") : null;
    if(opt){ send("timeframe", opt.getAttribute("data-timeframe")); }
  }, true);
})();
</script>
'''

if design.count("</body>") != 1:
    print(f"ABORT [design </body>]: expected 1, found {design.count('</body>')}")
    sys.exit(1)
design_out = design.replace("</body>", IFRAME_BRIDGE + "\n</body>", 1)

with open(DESIGN_OUT, "w", encoding="utf-8") as f:
    f.write(design_out)
print(f"Wrote {DESIGN_OUT}: {len(design_out)} chars")

# ═══════════════════════════════════════════════════════════════════════════════
# PART B — Patch index.html
# ═══════════════════════════════════════════════════════════════════════════════
with open(TARGET, "r", encoding="utf-8") as f:
    html = f.read()
print(f"Loaded index.html: {len(html)} chars, {html.count(chr(10))+1} lines")

# ── B1. Version: title ────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.704</title>',
    '<title>DVL Binance Live — Beta 0.705</title>',
    "title")

# ── B2. Version: badge ────────────────────────────────────────────────────────
html = rep(html, '>BETA 0.704</div>', '>BETA 0.705</div>', "versionBadge")

# ── B3. Version: constant ─────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.704";',
    'const DVL_APP_VERSION = "Beta 0.705";',
    "DVL_APP_VERSION")

# ── B4. Changelog ─────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.704 — Rollback stability and object persistence:',
    '  { version: DVL_APP_VERSION, note: "Beta 0.705 — Phase 1 UI overlay: added DVL_UI_OVERLAY_PHASE_1, a visual-only redesigned mobile UI (based on the approved 0.728 pixel-separated design) rendered as an isolated iframe layer on top of the existing functional core; old header/market-row/timeframe-toolbar/bottom-nav are visually hidden (kept in DOM), and only Save / Favorite / Timeframe 1m-5m-15m are bridged to real functions." },\n  { version: "Beta 0.704", note: "Beta 0.704 — Rollback stability and object persistence:',
    "changelog_0705")

# ── B5. Inject overlay as first child of <body> (before <div class="app">) ─────
OVERLAY = '''<!-- ════════════════ DVL_UI_OVERLAY_PHASE_1 (Beta 0.705) ════════════════
     Visual-only new UI layer (0.728 design) over the functional core.
     Isolated in an iframe: no CSS/JS collision with the host app. -->
<style id="DVL_UI_OVERLAY_PHASE_1_CSS">
#DVL_UI_OVERLAY_PHASE_1{
  position:fixed; inset:0; width:100%; height:100%;
  margin:0; padding:0; border:0; z-index:2000000; background:#000;
}
#DVL_UI_OVERLAY_PHASE_1 > iframe{
  display:block; width:100%; height:100%;
  margin:0; padding:0; border:0; background:#000;
}
/* Visually hide the OLD chrome (kept in DOM; visibility => no reflow). */
html.dvl-overlay-phase1-active header.top,
html.dvl-overlay-phase1-active section.marketRow,
html.dvl-overlay-phase1-active .chartCard > .toolbar,
html.dvl-overlay-phase1-active nav.bottomNav{
  visibility:hidden !important;
}
</style>
<div id="DVL_UI_OVERLAY_PHASE_1" data-dvl-overlay-phase="1" aria-label="DVL new UI overlay (phase 1, visual)">
  <iframe id="DVL_UI_OVERLAY_PHASE_1_FRAME" src="dvl_ui_0728.html?v=0705" title="DVL 0.728 UI preview"></iframe>
</div>
<script id="DVL_UI_OVERLAY_PHASE_1_BRIDGE">
/* Phase 1 bridge (host side): receives SAFE control events from the overlay
   iframe and calls the real app functions. Asset selection stays visual. */
(function(){
  "use strict";
  try{ document.documentElement.classList.add("dvl-overlay-phase1-active"); }catch(_e){}

  function curSym(){
    try{ if(typeof symbol !== "undefined" && symbol) return symbol; }catch(_e){}
    try{ if(window.symbol) return window.symbol; }catch(_e){}
    return null;
  }

  window.addEventListener("message", function(ev){
    var d = ev && ev.data;
    if(!d || d.__dvlOverlayPhase1 !== true) return;
    try{
      if(d.type === "save"){
        if(typeof saveProfile === "function") saveProfile();
        else if(window.saveProfile) window.saveProfile();
      } else if(d.type === "favorite"){
        var s = curSym();
        if(s){
          if(typeof toggleFavoriteSymbol === "function") toggleFavoriteSymbol(s);
          else if(window.toggleFavoriteSymbol) window.toggleFavoriteSymbol(s);
        }
      } else if(d.type === "timeframe"){
        var tf = String(d.payload || "");
        if(tf === "1m" || tf === "5m" || tf === "15m"){
          if(typeof setIntervalUi === "function") setIntervalUi(tf);
          else if(window.setIntervalUi) window.setIntervalUi(tf);
        }
      }
      /* d.type === "assetClick": Phase 2 (no host action in Phase 1) */
    }catch(_e){}
  }, false);

  /* Console helper to toggle the overlay for side-by-side comparison. */
  window.DVL_UI_OVERLAY_PHASE_1_SET = function(on){
    try{
      var el = document.getElementById("DVL_UI_OVERLAY_PHASE_1");
      if(el) el.style.display = on ? "block" : "none";
      document.documentElement.classList.toggle("dvl-overlay-phase1-active", !!on);
    }catch(_e){}
  };
})();
</script>
'''

html = rep(html,
    '<body>\n<div class="app">\n',
    '<body>\n' + OVERLAY + '<div class="app">\n',
    "overlay_inject")

# ── B6. Audit module before </body> ───────────────────────────────────────────
AUDIT = '''
<script id="DVL_UI_OVERLAY_PHASE_1_AUDIT_MODULE_0705">
(function(){
"use strict";
var blockers = [], warnings = [];

// A1. Version constant
if(!(typeof window.DVL_APP_VERSION !== "undefined" && window.DVL_APP_VERSION === "Beta 0.705"))
  blockers.push("A1: DVL_APP_VERSION !== 'Beta 0.705' (got: " + window.DVL_APP_VERSION + ")");

// A2. Title
var _t = document.querySelector("title");
if(!_t || (_t.textContent||"").indexOf("0.705") === -1) blockers.push("A2: title missing 0.705");

// A3. Badge
var _b = document.getElementById("versionBadge");
if(!_b || (_b.textContent||"").toUpperCase().indexOf("0.705") === -1) blockers.push("A3: versionBadge missing 0.705");

// A4. Overlay container present
var _ov = document.getElementById("DVL_UI_OVERLAY_PHASE_1");
if(!_ov) blockers.push("A4: DVL_UI_OVERLAY_PHASE_1 container missing");

// A5. Overlay iframe present + correct src
var _if = document.getElementById("DVL_UI_OVERLAY_PHASE_1_FRAME");
if(!_if) blockers.push("A5: overlay iframe missing");
else if((_if.getAttribute("src")||"").indexOf("dvl_ui_0728.html") === -1) blockers.push("A5: iframe src not dvl_ui_0728.html");

// A6. Host bridge script present
if(!document.getElementById("DVL_UI_OVERLAY_PHASE_1_BRIDGE")) blockers.push("A6: host bridge script missing");

// A7. Overlay-active class on <html>
if(!document.documentElement.classList.contains("dvl-overlay-phase1-active")) blockers.push("A7: dvl-overlay-phase1-active class not set");

// A8. Console toggle helper exposed
if(typeof window.DVL_UI_OVERLAY_PHASE_1_SET !== "function") blockers.push("A8: DVL_UI_OVERLAY_PHASE_1_SET not a function");

// A9. NO design version leak into host (host must NOT be "0.728")
if(window.DVL_APP_VERSION === "0.728" || window.DVL_APP_VERSION === "Beta 0.728")
  blockers.push("A9: design version leaked into host");

// A10-A13. Old chrome KEPT in DOM (not removed) — header/marketRow/toolbar/bottomNav
if(!document.querySelector("header.top")) blockers.push("A10: old header.top removed (must stay in DOM)");
if(!document.querySelector("section.marketRow")) blockers.push("A11: old section.marketRow removed (must stay in DOM)");
if(!document.querySelector(".chartCard > .toolbar")) blockers.push("A12: old .chartCard toolbar removed (must stay in DOM)");
if(!document.querySelector("nav.bottomNav")) blockers.push("A13: old nav.bottomNav removed (must stay in DOM)");

// A14. Chart canvas untouched (still present)
if(!document.getElementById("chart")) blockers.push("A14: #chart canvas missing (must not be moved/removed)");
if(!document.getElementById("chartWrap")) warnings.push("A14b: #chartWrap not found");

// A15. Bridge target functions exist in host scope
if(typeof window.setIntervalUi !== "function" && typeof setIntervalUi !== "function") warnings.push("A15: setIntervalUi not reachable");
if(typeof window.saveProfile !== "function" && typeof saveProfile !== "function") warnings.push("A15b: saveProfile not reachable");
if(typeof window.toggleFavoriteSymbol !== "function" && typeof toggleFavoriteSymbol !== "function") warnings.push("A15c: toggleFavoriteSymbol not reachable");

// A16. Paper V2 baseline preserved (0.701 guard + 0.702 audit + 0.704 audit)
if(!document.getElementById("DVL_PAPER_LOCK_FIX_GUARD_0701")) blockers.push("A16: DVL_PAPER_LOCK_FIX_GUARD_0701 missing");
if(!document.getElementById("DVL_OBJECT_PERSISTENCE_ROLLBACK_AUDIT_MODULE_0704")) warnings.push("A16b: 0704 audit module missing");

var N = 16, name = "DVL_UI_OVERLAY_PHASE_1_AUDIT_MODULE_0705";
if(blockers.length){
  var m = "[" + name + "] BLOCKED (" + blockers.length + "): " + blockers.join("; ");
  if(warnings.length) m += " | Warnings: " + warnings.join("; ");
  console.error(m);
  if(typeof window.DVL_AUDIT_BLOCK === "function") window.DVL_AUDIT_BLOCK(name, blockers);
}else{
  var ok = "[" + name + "] OK — " + N + " checks passed";
  if(warnings.length) ok += " (" + warnings.length + " warning(s): " + warnings.join("; ") + ")";
  console.log(ok);
}
})();
</script>
'''

html = rep(html, '</body>', AUDIT + '</body>', "audit_inject")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.705 OK")
