#!/usr/bin/env python3
"""
patch_636.py — DVL Beta 0.636
Fix: Paper Trading tag left-positioning flicker.

Root cause (0.635): the 0598.js runtime calls setInterval(render, 1200)
directly — bypassing our drawSoon hook. render() rebuilds tags with
right:56px (CSS), and our setInterval(dvlSyncTagLeft, 600) corrects them
up to 600ms later. That gap is the visible flicker.

Fix:
  - Replace setInterval(dvlSyncTagLeft) with a MutationObserver on
    #dvlPaperLayer. MutationObserver callbacks are microtasks that fire
    BEFORE the browser paints, so tags are repositioned in the same paint
    cycle as render() — zero visible frame with wrong position.
  - Add CSS override right:auto on .dvl-paper-tag so there's no CSS flash
    even before the observer fires.
  - Keep drawSoon wrapper for re-anchoring after pan/zoom (view changes
    that don't trigger MutationObserver).
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
html = rep(html, 'BETA 0.635', 'BETA 0.636', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.635";',
    'const DVL_APP_VERSION = "Beta 0.636";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading — tags float 10 candles ahead of creation point; pending ENTRY shows LIMIT instead of Long/Short Limit." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading tag positioning — MutationObserver eliminates flicker; right:auto CSS override prevents CSS-caused flash." },\n'
    '  { version: "Beta 0.635", note: "Fix: Paper Trading — tags float 10 candles ahead of creation point; pending ENTRY shows LIMIT instead of Long/Short Limit." },',
    "changelog 0.636")

# ── 2. Replace the 0635 tag-fix script with MutationObserver version ──────────
OLD_SCRIPT = '<script id="DVL_BETA_0635_TAG_LEFT_FIX">'

NEW_SCRIPT = """\
<script id="DVL_BETA_0635_TAG_LEFT_FIX">
/*
  DVL Beta 0.636 — Flicker-free tag left positioning via MutationObserver.

  0635 used setInterval(dvlSyncTagLeft, 600) but 0598 calls
  setInterval(render, 1200) directly, which rebuilt tags at right:56px.
  The 600ms correction window was visible as a flicker.

  MutationObserver fires as a microtask BEFORE the browser paints, so
  tags are repositioned in the same frame as render() — no visible jump.
  CSS right:auto override prevents any CSS-caused flash at creation time.
*/
(function(){
"use strict";

var PRICE_SCALE_W = 55;
var CANDLE_OFFSET = 10;

/* Remove right:56px so tags default to left:auto (0) pending JS */
(function(){
  var id = 'DVL_0636_TAG_RIGHT_OVERRIDE';
  if(document.getElementById(id)) return;
  var s = document.createElement('style');
  s.id = id;
  s.textContent = '.dvl-paper-tag:not(.dvl-paper-edit-label-fixed){right:auto!important;}';
  (document.head || document.documentElement).appendChild(s);
})();

function getRuntime(){
  return window.__dvlPaperRuntime0581 ||
         window.__dvlPaperRuntime0582 ||
         window.__dvlPaperRuntime0580 ||
         window.__dvlPaperRuntime;
}

function candleIdxForTime(candles, createdAt){
  if(!(createdAt > 0)) return candles.length - 1;
  var lo = 0, hi = candles.length - 1, best = 0;
  while(lo <= hi){
    var mid = (lo + hi) >> 1;
    var t = Number(candles[mid].t || candles[mid].time || 0);
    if(t <= createdAt){ best = mid; lo = mid + 1; }
    else              { hi  = mid - 1; }
  }
  return best;
}

function dvlSyncTagLeft(){
  var layer = document.getElementById('dvlPaperLayer');
  if(!layer) return;

  var rt = getRuntime();
  if(!rt || !rt.state || !rt.state.positions) return;
  var positions = rt.state.positions;

  var S = window.S;
  if(!S || !S.view || !Array.isArray(S.candles) || !S.candles.length) return;

  var span   = Math.max(0.1, S.view.end - S.view.start);
  var wrap   = document.getElementById('chartWrap');
  if(!wrap) return;
  var chartW = Math.max(1, wrap.clientWidth - PRICE_SCALE_W);

  var tags = layer.querySelectorAll('.dvl-paper-tag[data-id]');
  for(var i = 0; i < tags.length; i++){
    var tag = tags[i];
    if(tag.classList.contains('dvl-paper-edit-label-fixed')) continue;

    var posId = tag.dataset.id;
    var pos = null;
    for(var j = 0; j < positions.length; j++){
      if(String(positions[j].id) === String(posId)){ pos = positions[j]; break; }
    }
    if(!pos) continue;

    var idx = candleIdxForTime(S.candles, Number(pos.createdAt) || 0);
    var xPx = (idx + CANDLE_OFFSET - S.view.start + 0.5) * chartW / span;
    xPx = Math.max(0, Math.min(xPx, chartW - 4));

    tag.style.setProperty('left',  xPx.toFixed(1) + 'px', 'important');
    tag.style.setProperty('right', 'auto',                 'important');
  }
}

/* ── MutationObserver: fires before browser paint ─────────────────────── */
function attachObserver(layer){
  var obs = new MutationObserver(function(mutations){
    for(var i = 0; i < mutations.length; i++){
      if(mutations[i].type === 'childList'){ dvlSyncTagLeft(); return; }
    }
  });
  obs.observe(layer, {childList: true});
  dvlSyncTagLeft();
}

function waitForLayer(){
  var layer = document.getElementById('dvlPaperLayer');
  if(layer){ attachObserver(layer); return; }
  var poll = setInterval(function(){
    var l = document.getElementById('dvlPaperLayer');
    if(l){ clearInterval(poll); attachObserver(l); }
  }, 80);
  setTimeout(function(){ clearInterval(poll); }, 15000);
}

/* ── drawSoon hook: re-anchor after pan/zoom view changes ─────────────── */
var _raf0636 = 0;
var _orig0636 = window.drawSoon;
if(typeof _orig0636 === 'function'){
  window.drawSoon = function(){
    var r = _orig0636.apply(this, arguments);
    cancelAnimationFrame(_raf0636);
    _raf0636 = requestAnimationFrame(dvlSyncTagLeft);
    return r;
  };
}

window.addEventListener('resize', dvlSyncTagLeft, {passive:true});

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', waitForLayer, {once:true});
} else {
  waitForLayer();
}

})();
</script>"""

html = rep(html, OLD_SCRIPT, NEW_SCRIPT, "replace tag fix with MutationObserver version")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_636 applied: {', '.join(_ok)}")
