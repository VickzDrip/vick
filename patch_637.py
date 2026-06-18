#!/usr/bin/env python3
"""
patch_637.py — DVL Beta 0.637
Four paper-trading UX fixes:

1. Limit order ≠ Market: pending ENTRY is placed 0.5% away from market
   (buy → below, sell → above) so maybeTriggerPending() doesn't fire
   immediately. User drags entry to desired price, then price crossing
   activates the order naturally.

2. fixedLabelText "Long Limit"/"Short Limit" → "LIMIT" (same as renderPosition).

3. Labels centered: replace candle-offset JS with CSS left:50% +
   transform:translateX(-50%) so TP/ENTRY/SL tags always appear in the
   center of the visible chart, stable through pan/zoom, zero JS overhead.

4. Label no longer escapes during edit: .dvl-paper-edit-label-fixed is
   position:fixed with right:56px which puts it at the viewport right edge.
   Same center CSS override fixes the edit-label position.
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
html = rep(html, 'BETA 0.636', 'BETA 0.637', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.636";',
    'const DVL_APP_VERSION = "Beta 0.637";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading tag positioning — MutationObserver eliminates flicker; right:auto CSS override prevents CSS-caused flash." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Limit ≠ Market (0.5% offset); labels centered; edit label no longer escapes to right edge." },\n'
    '  { version: "Beta 0.636", note: "Fix: Paper Trading tag positioning — MutationObserver eliminates flicker; right:auto CSS override prevents CSS-caused flash." },',
    "changelog 0.637")

# ── 2. Fix "Long Limit"/"Short Limit" in fixedLabelText (inside startPaperDrag)
html = rep(html,
    'return { main:(pos.side === "buy" ? "Long Limit" : "Short Limit"), pct:"" };',
    'return { main:"LIMIT", pct:"" };',
    "fixedLabelText pending title")

# ── 3. Replace the 0635 tag-fix script with CSS-centering + limit offset ─────
OLD_SCRIPT_OPEN = '<script id="DVL_BETA_0635_TAG_LEFT_FIX">'
TAIL = '\n</body>\n</html>'

# Find boundary: from the old script tag to end-of-file tail
old_start = html.index(OLD_SCRIPT_OPEN)
tail_start = html.index(TAIL)
OLD_BLOCK = html[old_start:tail_start]
if html.count(OLD_BLOCK) != 1:
    print("[FAIL] old tag-fix block not unique"); sys.exit(1)

NEW_BLOCK = """\
<script id="DVL_BETA_0635_TAG_LEFT_FIX">
/*
  DVL Beta 0.637 — Center TP/ENTRY/SL labels in the visible chart area.

  Replaces the candle-based left-offset from 0.635/0.636 with pure CSS:
    left:50% + transform:translateX(-50%)
  Tags are always centered in the paper layer (chart width minus price scale)
  with zero JavaScript overhead. Stable through pan/zoom/oscillator toggle.

  Also centers .dvl-paper-edit-label-fixed (the draggable label during edit)
  which previously used right:56px (position:fixed → viewport right edge),
  causing the label to "escape" to the right side of the screen on drag start.
*/
(function(){
"use strict";

var id = 'DVL_0637_TAG_CENTER_CSS';
if(document.getElementById(id)) return;
var s = document.createElement('style');
s.id = id;
s.textContent =
  /* Normal tags: centered within the paper layer */
  '.dvl-paper-tag:not(.dvl-paper-edit-label-fixed){' +
    'left:50%!important;right:auto!important;transform:translateX(-50%)!important;' +
  '}' +
  /* Edit label during drag: centered in viewport (chart is full-width) */
  '.dvl-paper-edit-label-fixed{' +
    'left:50%!important;right:auto!important;transform:translateX(-50%)!important;' +
  '}';
(document.head || document.documentElement).appendChild(s);

})();
</script>

<script id="DVL_BETA_0637_LIMIT_OFFSET_FIX">
/*
  DVL Beta 0.637 — Limit order default price offset.

  maybeTriggerPending() fires when live >= entry (sell) or live <= entry (buy).
  createPosition() sets entry = lastPrice(), so a pending Limit order created
  at market price triggers immediately — indistinguishable from Market.

  Fix: wrap createPosition() so pending orders start 0.5% away from market:
    Buy Limit  → entry = live * 0.995  (wait for price to drop to entry)
    Sell Limit → entry = live * 1.005  (wait for price to rise to entry)
  TP and SL shift by the same absolute delta to preserve the user's spread.
*/
(function(){
"use strict";

function getLive(){
  try{
    if(window.ticker && Number(window.ticker.lastPrice) > 0)
      return Number(window.ticker.lastPrice);
    var S = window.S;
    if(S && Array.isArray(S.candles) && S.candles.length){
      var c = S.candles[S.candles.length - 1];
      return Number(c.c || c.close || 0);
    }
  }catch(_){}
  return 0;
}

function patchRuntime(rt){
  if(rt.__dvl0637LimitPatched) return;
  rt.__dvl0637LimitPatched = true;

  var orig = rt.createPosition;
  rt.createPosition = function(){
    var result = orig.apply(this, arguments);
    var positions = rt.state && rt.state.positions;
    if(!positions || !positions.length) return result;
    var pos = positions[positions.length - 1];
    if(!pos || pos.status !== 'pending') return result;

    var live = getLive();
    if(!(live > 0)) return result;

    /* Skip if entry is already far from market (user passed explicit price) */
    if(Math.abs(Number(pos.entry) - live) / live > 0.003) return result;

    var OFFSET = 0.005; /* 0.5% */
    var oldEntry = Number(pos.entry);
    var newEntry = pos.side === 'buy'
      ? live * (1 - OFFSET)   /* buy limit waits for price to fall */
      : live * (1 + OFFSET);  /* sell limit waits for price to rise */
    var delta = newEntry - oldEntry;

    pos.entry = newEntry;
    if(Number.isFinite(Number(pos.tp))) pos.tp = Number(pos.tp) + delta;
    if(Number.isFinite(Number(pos.sl))) pos.sl = Number(pos.sl) + delta;

    rt.render();
    return result;
  };
}

function waitForRuntime(){
  var rt = window.__dvlPaperRuntime0581 ||
           window.__dvlPaperRuntime0582 ||
           window.__dvlPaperRuntime0580 ||
           window.__dvlPaperRuntime;
  if(rt && rt.ready){ patchRuntime(rt); return; }
  var poll = setInterval(function(){
    var r = window.__dvlPaperRuntime0581 ||
            window.__dvlPaperRuntime0582 ||
            window.__dvlPaperRuntime0580 ||
            window.__dvlPaperRuntime;
    if(r && r.ready){ clearInterval(poll); patchRuntime(r); }
  }, 100);
  setTimeout(function(){ clearInterval(poll); }, 15000);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', waitForRuntime, {once:true});
} else {
  waitForRuntime();
}

})();
</script>"""

html = html[:old_start] + NEW_BLOCK + html[tail_start:]
_ok.append("replace tag-fix + inject limit-offset fix")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_637 applied: {', '.join(_ok)}")
