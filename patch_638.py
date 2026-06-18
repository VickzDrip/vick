#!/usr/bin/env python3
"""
patch_638.py — DVL Beta 0.638
Fix: Paper Trading overlay lines/hit-areas now start at the candle where the
position was placed and extend only rightward — not leftward from left:0.

Root cause: .dvl-paper-line and .dvl-paper-hit both had left:0!important in
the CSS injected by the 0.598 runtime, so every line spanned the full chart
width. The position object has createdAt (Unix ms) but the render function
never converted that to an X pixel.

Fix (no modification to approved 0.598 logic):
  A) MutationObserver on #dvlPaperLayer — fires after each render() call
     (which sets layer.innerHTML="" and rebuilds all DOM nodes).
  B) For each .dvl-paper-line, reads position ID from nextElementSibling
     (.dvl-paper-hit or .dvl-paper-tag — both have data-id).
  C) Converts pos.createdAt → candle index via S.candles binary search →
     pixel X using S.view / chartWrap.clientWidth.
  D) Applies el.style.setProperty('left', xPx + 'px', 'important') to
     override the CSS !important rule.
  E) Same treatment for .dvl-paper-hit[data-id] so the drag handle
     also starts at the creation point (user can still drag via the tag).
  F) Edge case: if creation candle is left of the visible view (very old
     position), xPx < 0 → clamped to 0 (line starts from chart left edge).

The approved 0.598 Paper Trading trade logic is NOT modified.
"""
import sys, pathlib

SRC = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
html = SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1:  print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── 1. Version ────────────────────────────────────────────────────────────────
html = rep(html, 'BETA 0.637', 'BETA 0.638', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.637";',
    'const DVL_APP_VERSION = "Beta 0.638";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: Interaction motor — DVLInteractionLock blocks chart pan/zoom during any drawing/ruler/paper-trading edit; cancelBubble detection covers trendline drag." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading overlay — lines start at creation candle and extend rightward only; no left-bleed across chart history." },\n'
    '  { version: "Beta 0.637", note: "Fix: Interaction motor — DVLInteractionLock blocks chart pan/zoom during any drawing/ruler/paper-trading edit; cancelBubble detection covers trendline drag." },',
    "changelog 0.638")

# ── 2. Layer-left correction script ──────────────────────────────────────────
LAYER_LEFT_JS = """\
<script id="DVL_BETA_0638_PAPER_LINE_LEFT_FIX">
/*
  DVL Beta 0.638 — Paper Trading line/hit-area left-anchor fix

  After each render() call by the 0.598 runtime, a MutationObserver walks the
  #dvlPaperLayer children and sets each .dvl-paper-line and .dvl-paper-hit
  'left' to the pixel X of the candle where the position was created.

  Position coordinate storage (price/time) and all trade logic are unchanged.
*/
(function(){
"use strict";

var PRICE_SCALE_W = 55; /* matches RP() — right-side price scale pixel width */

/* ── Coordinate helpers ──────────────────────────────────────────────────── */
function chartWrapWidth(){
  var wrap = document.getElementById('chartWrap');
  return wrap ? wrap.clientWidth : window.innerWidth;
}

function candleIndexToX(idx){
  var S = window.S;
  if(!S || !S.view) return -1;
  var span = Math.max(0.1, S.view.end - S.view.start);
  var chartW = Math.max(1, chartWrapWidth() - PRICE_SCALE_W);
  return (idx - S.view.start + 0.5) * chartW / span;
}

/* Binary-search S.candles for the index whose time <= createdAt */
function candleIdxForTime(createdAt){
  var S = window.S;
  if(!S || !Array.isArray(S.candles) || !S.candles.length) return -1;
  if(!(createdAt > 0)) return S.candles.length - 1;

  var candles = S.candles;
  var lo = 0, hi = candles.length - 1;

  /* candles are ordered oldest→newest; find last candle whose time ≤ createdAt */
  var best = 0;
  while(lo <= hi){
    var mid = (lo + hi) >> 1;
    var t = Number(candles[mid].t || candles[mid].time || 0);
    if(t <= createdAt){ best = mid; lo = mid + 1; }
    else               { hi  = mid - 1; }
  }
  return best;
}

function positionLeftPx(pos){
  var createdAt = Number(pos.createdAt) || 0;
  var idx = candleIdxForTime(createdAt);
  if(idx < 0) return 0;
  var xPx = candleIndexToX(idx);
  return Math.max(0, xPx); /* never go left of chart edge */
}

/* ── Runtime accessor ────────────────────────────────────────────────────── */
function findPos(id){
  var rt = window.__dvlPaperRuntime0581 ||
           window.__dvlPaperRuntime0582 ||
           window.__dvlPaperRuntime0580 ||
           window.__dvlPaperRuntime;
  if(!rt || !rt.state || !rt.state.positions) return null;
  var positions = rt.state.positions;
  for(var i = 0; i < positions.length; i++){
    if(String(positions[i].id) === String(id)) return positions[i];
  }
  return null;
}

/* ── Apply left to one element ───────────────────────────────────────────── */
function applyLeft(el, posId){
  var pos = findPos(posId);
  if(!pos) return;
  var xPx = positionLeftPx(pos);
  el.style.setProperty('left', xPx.toFixed(1) + 'px', 'important');
}

/* ── Post-process the entire layer after a render ───────────────────────── */
function postProcess(layer){
  /* 1. Lines: get position ID from nextElementSibling (hit or tag, both have data-id) */
  var lines = layer.querySelectorAll('.dvl-paper-line');
  for(var i = 0; i < lines.length; i++){
    var line = lines[i];
    var next = line.nextElementSibling;
    if(next && next.dataset && next.dataset.id){
      applyLeft(line, next.dataset.id);
    }
  }

  /* 2. Hit areas (drag zones) — also start at creation X */
  var hits = layer.querySelectorAll('.dvl-paper-hit[data-id]');
  for(var j = 0; j < hits.length; j++){
    applyLeft(hits[j], hits[j].dataset.id);
  }
}

/* ── MutationObserver on #dvlPaperLayer ─────────────────────────────────── */
function attachObserver(layer){
  var obs = new MutationObserver(function(mutations){
    /* Only act when childList changed (render() rebuilt the layer) */
    var hasChildListMutation = false;
    for(var i = 0; i < mutations.length; i++){
      if(mutations[i].type === 'childList'){ hasChildListMutation = true; break; }
    }
    if(hasChildListMutation) postProcess(layer);
  });
  obs.observe(layer, {childList: true});
  /* Initial pass in case layer is already populated */
  postProcess(layer);
}

/* ── Wait for layer to exist (created by 0.598 runtime on DOMContentLoaded) */
function waitForLayer(){
  var layer = document.getElementById('dvlPaperLayer');
  if(layer){ attachObserver(layer); return; }
  /* Poll — layer is appended by the 0.598 runtime after ready() fires */
  var poll = setInterval(function(){
    var l = document.getElementById('dvlPaperLayer');
    if(l){ clearInterval(poll); attachObserver(l); }
  }, 80);
  setTimeout(function(){ clearInterval(poll); }, 15000);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', waitForLayer, {once:true});
}else{
  waitForLayer();
}

})();
</script>"""

# ── 3. Inject before </body></html> ──────────────────────────────────────────
TAIL = '\n</body>\n</html>'
html = rep(html, TAIL, '\n' + LAYER_LEFT_JS + TAIL, "inject paper line left fix")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_638 applied: {', '.join(_ok)}")
