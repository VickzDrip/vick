#!/usr/bin/env python3
"""
patch_638.py — DVL Beta 0.638
Three paper-trading fixes:

1. Remove DVL native "SHORT/LONG" text on lines:
   DVL's _toggleDemoPos listener fires on dvlBuyBtn/dvlSellBtn BEFORE our
   0598.js handler, creating a native DVL demo position with its own text
   on the chart line. Fix: neutralize that listener by clone-replacing the
   buttons at DOMContentLoaded, before 0598.js registers its handlers.

2. Labels 10 candles to the right of creation:
   Restore JS positioning (creation_candle + 10) with MutationObserver
   so labels are stable and zero-flicker. Replace the CSS left:50% approach
   from 0.637 which put labels in the middle of price action.

3. Edit label (fixedLabel) no longer escapes:
   fixedLabel is position:fixed with right:56px (viewport right edge).
   Body MutationObserver repositions it to match the normal label's left
   position (creation_candle + 10 candles) when it's appended to body.
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
    '  { version: DVL_APP_VERSION, note: "Fix: Limit ≠ Market (0.5% offset); labels centered; edit label no longer escapes to right edge." },',
    '  { version: DVL_APP_VERSION, note: "Fix: native DVL demo-position text removed; labels 10 candles right of creation; edit label stable." },\n'
    '  { version: "Beta 0.637", note: "Fix: Limit ≠ Market (0.5% offset); labels centered; edit label no longer escapes to right edge." },',
    "changelog 0.638")

# ── 2. Neutralizer: inject BEFORE DVL_BETA_0634_PAPER_TRADING_0598 ───────────
NEUTRALIZER = """\
<script id="DVL_BETA_0638_DEMO_NEUTRALIZER">
/*
  DVL Beta 0.638 — Neutralize native _toggleDemoPos listeners.

  DVL registers click handlers on #dvlBuyBtn/#dvlSellBtn at parse time
  (lines ~14964-14965) that call _toggleDemoPos('long'/'short'), which
  creates a DVL-native demo position and draws "SHORT/LONG price..." text
  on the chart line in addition to our 0598 overlay.

  We clone-replace both buttons at DOMContentLoaded (runs before 0598.js's
  DOMContentLoaded since this script comes first in the HTML). The clone
  has identical DOM/attributes/style but no event listeners. 0598.js then
  registers its handlers on the clean clone — only our overlay fires.
*/
(function(){
"use strict";
function neutralize(){
  ['dvlBuyBtn','dvlSellBtn'].forEach(function(id){
    var el = document.getElementById(id);
    if(el && el.parentNode){
      el.parentNode.replaceChild(el.cloneNode(true), el);
    }
  });
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', neutralize, {once:true});
} else {
  neutralize();
}
})();
</script>

"""

html = rep(html,
    '<script id="DVL_BETA_0634_PAPER_TRADING_0598">',
    NEUTRALIZER + '<script id="DVL_BETA_0634_PAPER_TRADING_0598">',
    "inject neutralizer before 0598")

# ── 3. Replace DVL_BETA_0635_TAG_LEFT_FIX (CSS centering) with JS creation+10 ─
OLD_TAG_OPEN = '<script id="DVL_BETA_0635_TAG_LEFT_FIX">'
TAIL         = '\n</body>\n</html>'

old_start  = html.index(OLD_TAG_OPEN)
tail_start = html.index(TAIL)
old_block  = html[old_start:tail_start]

NEW_TAG_SCRIPTS = """\
<script id="DVL_BETA_0635_TAG_LEFT_FIX">
/*
  DVL Beta 0.638 — Labels 10 candles right of creation point + edit label fix.

  Replaces the CSS left:50% centering from 0.637 (which put labels on top of
  price action) with JS positioning: creation_candle + 10 candles.
  MutationObserver fires before browser paint → zero flicker.

  Also fixes .dvl-paper-edit-label-fixed: when 0598.js appends it to
  document.body with position:fixed;right:56px, it jumps to the viewport
  right edge. A body MutationObserver repositions it to the same
  creation+10 left position as the normal tags.
*/
(function(){
"use strict";

var PRICE_SCALE_W = 55;
var CANDLE_OFFSET = 10;

/* CSS: override right:56px so tags default to left edge (pending JS) */
(function(){
  var id = 'DVL_0638_TAG_RIGHT_OVERRIDE';
  if(document.getElementById(id)) return;
  var s = document.createElement('style');
  s.id = id;
  /* Reset centering CSS from 0.637 and the right:56px from 0598 */
  s.textContent =
    '.dvl-paper-tag:not(.dvl-paper-edit-label-fixed){' +
      'left:0!important;right:auto!important;transform:none!important;' +
    '}';
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

function tagLeftPx(pos, chartW, S){
  var idx = candleIdxForTime(S.candles, Number(pos.createdAt) || 0);
  var span = Math.max(0.1, S.view.end - S.view.start);
  var xPx = (idx + CANDLE_OFFSET - S.view.start + 0.5) * chartW / span;
  return Math.max(0, Math.min(xPx, chartW - 4));
}

function dvlSyncTagLeft(){
  var layer = document.getElementById('dvlPaperLayer');
  if(!layer) return;
  var rt = getRuntime();
  if(!rt || !rt.state || !rt.state.positions) return;
  var positions = rt.state.positions;
  var S = window.S;
  if(!S || !S.view || !Array.isArray(S.candles) || !S.candles.length) return;
  var wrap = document.getElementById('chartWrap');
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
    var xPx = tagLeftPx(pos, chartW, S);
    tag.style.setProperty('left',  xPx.toFixed(1) + 'px', 'important');
    tag.style.setProperty('right', 'auto',                 'important');
    tag.style.setProperty('transform', 'none',             'important');
  }
}

/* ── MutationObserver on #dvlPaperLayer ─────────────────────────────────── */
function attachLayerObserver(layer){
  var obs = new MutationObserver(function(mutations){
    for(var i = 0; i < mutations.length; i++){
      if(mutations[i].type === 'childList'){ dvlSyncTagLeft(); return; }
    }
  });
  obs.observe(layer, {childList:true});
  dvlSyncTagLeft();
}

function waitForLayer(){
  var l = document.getElementById('dvlPaperLayer');
  if(l){ attachLayerObserver(l); return; }
  var poll = setInterval(function(){
    var ll = document.getElementById('dvlPaperLayer');
    if(ll){ clearInterval(poll); attachLayerObserver(ll); }
  }, 80);
  setTimeout(function(){ clearInterval(poll); }, 15000);
}

/* ── Body MutationObserver: fix fixedLabel position when drag starts ─────── */
(function(){
  var bodyObs = new MutationObserver(function(muts){
    for(var i = 0; i < muts.length; i++){
      var added = muts[i].addedNodes;
      for(var j = 0; j < added.length; j++){
        var el = added[j];
        if(!el.classList) continue;
        if(!el.classList.contains('dvl-paper-edit-label-fixed')) continue;
        /* Position the edit label at the same X as normal tags */
        var rt = getRuntime();
        var S = window.S;
        var wrap = document.getElementById('chartWrap');
        if(!rt || !S || !S.view || !S.candles || !wrap) continue;
        var posId = el.dataset && el.dataset.id;
        if(!posId) continue;
        var pos = null;
        var positions = rt.state && rt.state.positions;
        if(positions){
          for(var k = 0; k < positions.length; k++){
            if(String(positions[k].id) === String(posId)){ pos = positions[k]; break; }
          }
        }
        if(!pos) continue;
        var chartW = Math.max(1, wrap.clientWidth - PRICE_SCALE_W);
        var wrapRect = wrap.getBoundingClientRect();
        var xInChart = tagLeftPx(pos, chartW, S);
        var leftVp = wrapRect.left + xInChart;
        el.style.setProperty('left',      leftVp.toFixed(1) + 'px', 'important');
        el.style.setProperty('right',     'auto',                    'important');
        el.style.setProperty('transform', 'none',                    'important');
      }
    }
  });
  bodyObs.observe(document.body, {childList:true});
})();

/* ── drawSoon hook for pan/zoom re-anchor ────────────────────────────────── */
var _raf0638 = 0;
var _orig0638 = window.drawSoon;
if(typeof _orig0638 === 'function'){
  window.drawSoon = function(){
    var r = _orig0638.apply(this, arguments);
    cancelAnimationFrame(_raf0638);
    _raf0638 = requestAnimationFrame(dvlSyncTagLeft);
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

html = html[:old_start] + NEW_TAG_SCRIPTS + html[tail_start:]
_ok.append("replace 0635 tag fix with creation+10 JS + edit-label body observer")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_638 applied: {', '.join(_ok)}")
