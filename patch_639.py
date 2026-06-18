#!/usr/bin/env python3
"""
patch_639.py — DVL Beta 0.639
Fix: Paper Trading overlay lines re-anchor on every chart pan/zoom, not only
when a position is created or modified.

Root cause (0.638): The MutationObserver fired only when render() rebuilt the
layer (position create/modify). When the user panned or zoomed the chart,
drawSoon() → draw() updated S.view but render() was NOT called, so .dvl-paper-line
elements kept their stale 'left' values. Lines drifted off the creation candle
after any pan/zoom.

Fix:
  Wrap window.drawSoon (exposed at line ~15939) to schedule a
  requestAnimationFrame callback that runs AFTER draw() has updated S.view.
  Because we register our RAF right after drawSoon() registers its RAF, our
  callback executes in the same frame but after draw() has already set S.view.

  We replace the entire DVL_BETA_0638_PAPER_LINE_LEFT_FIX script with a
  revised version that contains both the original MutationObserver logic AND
  the new drawSoon hook.

The approved 0.598 Paper Trading logic is NOT modified.
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
html = rep(html, 'BETA 0.638', 'BETA 0.639', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.638";',
    'const DVL_APP_VERSION = "Beta 0.639";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading overlay — lines start at creation candle and extend rightward only; no left-bleed across chart history." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading overlay — lines re-anchor on every chart pan/zoom, not only on position create/modify." },\n'
    '  { version: "Beta 0.638", note: "Fix: Paper Trading overlay — lines start at creation candle and extend rightward only; no left-bleed across chart history." },',
    "changelog 0.639")

# ── 2. Replace the 0.638 script with an improved version ─────────────────────
OLD_SCRIPT = '<script id="DVL_BETA_0638_PAPER_LINE_LEFT_FIX">'

NEW_SCRIPT = """\
<script id="DVL_BETA_0638_PAPER_LINE_LEFT_FIX">
/*
  DVL Beta 0.638 / 0.639 — Paper Trading line/hit-area left-anchor

  After each render() call OR chart pan/zoom (drawSoon hook), a MutationObserver
  and a drawSoon wrapper walk #dvlPaperLayer and set each .dvl-paper-line and
  .dvl-paper-hit 'left' to the pixel X of the candle where the position was
  created.

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

/* ── Post-process the entire layer ──────────────────────────────────────── */
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

/* Expose for the drawSoon hook below */
window.__dvl0638PostProcess = postProcess;

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

/* ── Wait for layer to exist ─────────────────────────────────────────────── */
function waitForLayer(){
  var layer = document.getElementById('dvlPaperLayer');
  if(layer){ attachObserver(layer); return; }
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

/* ── drawSoon hook — re-anchor after every chart pan/zoom ───────────────────
   draw() → __dvlSyncLegacyState() updates S.view, THEN our RAF runs
   postProcess with the fresh view. We cancel any pending RAF before
   registering a new one so rapid panning doesn't stack callbacks.
──────────────────────────────────────────────────────────────────────────── */
(function(){
  var _raf = 0;
  var _orig = window.drawSoon;
  if(typeof _orig !== 'function') return;

  window.drawSoon = function(){
    var r = _orig.apply(this, arguments);
    /* draw() runs in the RAF registered by _orig.  We register a SECOND RAF
       right after — it executes in the same frame but after draw() has already
       called __dvlSyncLegacyState() and updated S.view. */
    cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(function(){
      if(typeof window.__dvl0638PostProcess !== 'function') return;
      var layer = document.getElementById('dvlPaperLayer');
      if(layer && layer.children.length){
        window.__dvl0638PostProcess(layer);
      }
    });
    return r;
  };
})();

})();
</script>"""

html = rep(html, OLD_SCRIPT, NEW_SCRIPT, "replace 0638 script with pan-sync version")

# ── 3. Write ──────────────────────────────────────────────────────────────────
SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_639 applied: {', '.join(_ok)}")
