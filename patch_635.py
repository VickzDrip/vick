#!/usr/bin/env python3
"""
patch_635.py — DVL Beta 0.635
Two UX fixes on top of the Beta 0.634 Paper Trading integration:

1. Remove direction text from pending Limit ENTRY label:
   "Long Limit" / "Short Limit"  →  "LIMIT"

2. Tags (TP/ENTRY/SL labels) float 10 candles to the right of the
   creation candle instead of sticking to the chart's right edge.
   Lines are unchanged (left:0 to right edge).
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
html = rep(html, 'BETA 0.634', 'BETA 0.635', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.634";',
    'const DVL_APP_VERSION = "Beta 0.635";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Feat: Paper Trading 0.598 — Y coords and layer bounds confined to price pane; oscillator-safe." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading — tags float 10 candles ahead of creation point; pending ENTRY shows LIMIT instead of Long/Short Limit." },\n'
    '  { version: "Beta 0.634", note: "Feat: Paper Trading 0.598 — Y coords and layer bounds confined to price pane; oscillator-safe." },',
    "changelog 0.635")

# ── 2. Remove "Long Limit" / "Short Limit" direction text ────────────────────
html = rep(html,
    'const pendingTitle = pos.side === "buy" ? "Long Limit" : "Short Limit";',
    'const pendingTitle = "LIMIT";',
    "pending title neutral")

# ── 3. Inject tag-left positioning script ────────────────────────────────────
TAG_LEFT_FIX = """\
<script id="DVL_BETA_0635_TAG_LEFT_FIX">
/*
  DVL Beta 0.635 — Float TP/ENTRY/SL tags 10 candles to the right of the
  position's creation candle, instead of sticking to the chart's right edge.
  Lines are NOT moved (they still span left-to-right).

  Runs after every render() call: draw() -> render() -> dvlSyncTagLeft().
*/
(function(){
"use strict";

var PRICE_SCALE_W = 55;
var CANDLE_OFFSET = 10; /* candles to the right of creation point */

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

    /* skip fixed-positioned labels used during drag */
    if(tag.classList.contains('dvl-paper-edit-label-fixed')) continue;

    var posId = tag.dataset.id;
    var pos = null;
    for(var j = 0; j < positions.length; j++){
      if(String(positions[j].id) === String(posId)){ pos = positions[j]; break; }
    }
    if(!pos) continue;

    var idx  = candleIdxForTime(S.candles, Number(pos.createdAt) || 0);
    var idx10 = idx + CANDLE_OFFSET;
    var xPx  = (idx10 - S.view.start + 0.5) * chartW / span;
    xPx = Math.max(0, Math.min(xPx, chartW - 4)); /* clamp within chart */

    tag.style.setProperty('left',  xPx.toFixed(1) + 'px', 'important');
    tag.style.setProperty('right', 'auto',                 'important');
  }
}

/* Hook into drawSoon after the 0634 layer-bounds wrapper */
var _raf0635 = 0;
var _orig0635 = window.drawSoon;
if(typeof _orig0635 === 'function'){
  window.drawSoon = function(){
    var r = _orig0635.apply(this, arguments);
    cancelAnimationFrame(_raf0635);
    _raf0635 = requestAnimationFrame(dvlSyncTagLeft);
    return r;
  };
}

setInterval(dvlSyncTagLeft, 600);
window.addEventListener('resize', dvlSyncTagLeft, {passive:true});

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', dvlSyncTagLeft, {once:true});
} else {
  dvlSyncTagLeft();
}

})();
</script>"""

TAIL = '\n</body>\n</html>'
html = rep(html, TAIL, '\n' + TAG_LEFT_FIX + TAIL, "inject tag left fix")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_635 applied: {', '.join(_ok)}")
