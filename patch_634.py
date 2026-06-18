#!/usr/bin/env python3
"""
patch_634.py — DVL Beta 0.634
Integrate Paper Trading 0.598 with two critical fixes applied from the start:

1. Y-coordinate alignment: override window.__dvlLegacyPriceArea BEFORE the
   0598 script initialises so scaleInfo() / yPrice() use dvlPricePanelHeight()
   — the same bounds the canvas drawPriceSection() local y() function uses.
   Without this, with oscillators active: canvas y1=414px, paper y1=676px
   -> ~130px drift at midrange price.

2. Layer bounds confinement: after every drawSoon (pan/zoom/oscillator toggle),
   set #dvlPaperLayer height = dvlPricePanelHeight(H) - dvlMainTimeScaleHeight()
   with !important inline style so overlays never bleed into oscillator panes.

The approved 0.598 Paper Trading trade logic is NOT modified.
"""
import sys, pathlib

SRC        = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
SCRIPT_SRC = pathlib.Path("/tmp/dvl_paper/dvl_paper_trading_script_only_0598.js")

html        = SRC.read_text(encoding="utf-8")
script_0598 = SCRIPT_SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1:  print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── 1. Version ────────────────────────────────────────────────────────────────
html = rep(html, 'BETA 0.633', 'BETA 0.634', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.633";',
    'const DVL_APP_VERSION = "Beta 0.634";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },',
    '  { version: DVL_APP_VERSION, note: "Feat: Paper Trading 0.598 — Y coords and layer bounds confined to price pane; oscillator-safe." },\n'
    '  { version: "Beta 0.633", note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },',
    "changelog 0.634")

# ── 2. Build injection block ──────────────────────────────────────────────────
PRICE_AREA_FIX = """\
<script id="DVL_BETA_0634_PRICE_AREA_FIX">
/*
  DVL Beta 0.634 — Override __dvlLegacyPriceArea before Paper Trading 0.598
  initialises.  scaleInfo() -> yPrice() will then use the same [y0, y1] bounds
  as drawPriceSection()'s local y(v) function regardless of oscillator state.
*/
(function(){
"use strict";
if(window.__dvl0634AreaFixed) return;
window.__dvl0634AreaFixed = true;

window.__dvlLegacyPriceArea = function(H){
  var priceH = (typeof dvlPricePanelHeight === 'function')
    ? dvlPricePanelHeight(H) : H;
  var timeH = (typeof dvlMainTimeScaleHeight === 'function')
    ? dvlMainTimeScaleHeight() : 20;
  var y0 = 4;
  var y1 = Math.max(y0 + 40, priceH - timeH);
  return { y0: y0, y1: y1, priceH: priceH, timeH: timeH };
};

})();
</script>"""

PAPER_SCRIPT = (
    '<script id="DVL_BETA_0634_PAPER_TRADING_0598">\n'
    + script_0598
    + '\n</script>'
)

LAYER_BOUNDS_FIX = """\
<script id="DVL_BETA_0634_LAYER_BOUNDS_FIX">
/*
  DVL Beta 0.634 — Constrain #dvlPaperLayer height to the price pane so
  TP/ENTRY/SL overlays never bleed into oscillator panels or buttons below.

  Runs after 0598's drawSoon wrapper.  RAF execution order per frame:
    draw() (canvas, scheduled by original drawSoon)
    render() (paper elements, scheduled by 0598 wrapper)
    dvlSyncLayerBounds() (layer clip, scheduled by this wrapper)
*/
(function(){
"use strict";

var PRICE_SCALE_W = 55;

function dvlSyncLayerBounds(){
  var layer = document.getElementById('dvlPaperLayer');
  if(!layer) return;
  var wrap = document.getElementById('chartWrap');
  if(!wrap) return;
  var H = wrap.clientHeight;
  var priceH = (typeof dvlPricePanelHeight === 'function') ? dvlPricePanelHeight(H) : H;
  var timeH  = (typeof dvlMainTimeScaleHeight === 'function') ? dvlMainTimeScaleHeight() : 20;
  var paneH  = Math.max(40, priceH - timeH);
  layer.style.setProperty('top',    '0',                  'important');
  layer.style.setProperty('left',   '0',                  'important');
  layer.style.setProperty('right',  PRICE_SCALE_W + 'px', 'important');
  layer.style.setProperty('height', paneH + 'px',         'important');
  layer.style.setProperty('bottom', 'auto',               'important');
}

/* Wrap drawSoon after 0598's hook — our wrapper calls 0598's wrapper */
var _raf0634 = 0;
var _orig0634 = window.drawSoon;
if(typeof _orig0634 === 'function'){
  window.drawSoon = function(){
    var r = _orig0634.apply(this, arguments);
    cancelAnimationFrame(_raf0634);
    _raf0634 = requestAnimationFrame(dvlSyncLayerBounds);
    return r;
  };
}

/* Catch oscillator toggles that don't go through drawSoon */
setInterval(dvlSyncLayerBounds, 600);
window.addEventListener('resize', dvlSyncLayerBounds, {passive:true});

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', dvlSyncLayerBounds, {once:true});
} else {
  dvlSyncLayerBounds();
}

})();
</script>"""

INJECT = (
    '\n'
    + PRICE_AREA_FIX
    + '\n\n'
    + PAPER_SCRIPT
    + '\n\n'
    + LAYER_BOUNDS_FIX
)

# ── 3. Inject before </body></html> ──────────────────────────────────────────
TAIL = '\n</body>\n</html>'
html = rep(html, TAIL, INJECT + TAIL, "inject paper trading + fixes")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_634 applied: {', '.join(_ok)}")
