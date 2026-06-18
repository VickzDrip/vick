#!/usr/bin/env python3
"""
patch_637.py — DVL Beta 0.637
Fix: Paper Trading overlay Y coordinates align with the main price pane when
oscillators (OI, Long/Short, Delta Volume, etc.) are active.

Root cause:
  drawPriceSection() draws candles using:
    y1 = dvlPricePanelBottom(h)  <- oscillator-aware (e.g. 414px of 700px)
    const y = v => y1 - (v-min)/(max-min)*(y1-y0)

  But scale() -- called by paper trading scaleInfo() -> yPrice() -- uses:
    y1 = __dvlLegacyPriceArea(H).y1
       = (indicatorsOn ? H*0.55-36 : H-24)  <- does NOT check dvlLowerPanelOn()
       = H-24 = 676px when oscillators are ON (indicatorsOn=false)

  Both use the same price range (priceViewCenter/priceViewRange) but different
  y1 -> massive vertical misalignment between candles and TP/ENTRY/SL lines.
  Example with H=700: canvas y1=414, scale() y1=676 -> 131px drift at midrange.

Fix:
  Replace window.__dvlLegacyPriceArea with a version that delegates to
  dvlPricePanelHeight() and dvlMainTimeScaleHeight() -- the same source the
  canvas uses -- so scale().y(price) and the canvas local y(v) always share
  identical [y0, y1] bounds regardless of oscillator state.

  dvlPricePanelHeight() handles all oscillator configurations:
    - No oscillators -> full chartWrap height
    - DVLTestOscillator with user-draggable split -> splitHeight()
    - OI / Long-Short / Delta Volume -> Math.max(250, h * 0.62)

  dvlMainTimeScaleHeight() -> 20px (matches canvas timeH).

The approved 0.598 Paper Trading trade logic is NOT modified.
No changes to syncBounds, makeLine, makeTag, startPaperDrag, yPrice, scaleInfo.
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
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading panel layout isolation — contain+height lock prevents oscillator layout thrashing; overlay layer relocated outside canvas DOM." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading overlay Y coordinates — __dvlLegacyPriceArea now uses dvlPricePanelHeight so TP/ENTRY/SL align with candles when oscillators are active." },\n'
    '  { version: "Beta 0.636", note: "Fix: Paper Trading panel layout isolation — contain+height lock prevents oscillator layout thrashing; overlay layer relocated outside canvas DOM." },',
    "changelog 0.637")

# ── 2. Price-pane alignment fix ───────────────────────────────────────────────
PRICE_PANE_JS = """\
<script id="DVL_BETA_0637_PRICE_PANE_FIX">
/*
  DVL Beta 0.637 — Paper Trading price-pane Y alignment

  __dvlLegacyPriceArea(H) is the source of y0/y1 for scale() and
  __dvlSyncLegacyState(). The original version used the 'indicatorsOn' boolean
  and ignored oscillator panels, returning y1 = H-24 (676px on a 700px chart)
  even when oscillators compressed the price pane to y1 = 414px.

  This replacement always calls dvlPricePanelHeight() and dvlMainTimeScaleHeight()
  so scale().y(price) uses the same bounds as the canvas drawPriceSection() local
  y() function at all times.
*/
(function(){
"use strict";

if(window.__dvl0637AreaFixed) return;
window.__dvl0637AreaFixed = true;

window.__dvlLegacyPriceArea = function(H){
  var priceH = (typeof dvlPricePanelHeight === 'function')
    ? dvlPricePanelHeight(H)
    : H;
  var timeH = (typeof dvlMainTimeScaleHeight === 'function')
    ? dvlMainTimeScaleHeight()
    : 20;
  var y0 = 4;
  var y1 = Math.max(y0 + 40, priceH - timeH);
  return { y0: y0, y1: y1, priceH: priceH, timeH: timeH };
};

})();
</script>"""

# ── 3. Inject before </body></html> ──────────────────────────────────────────
TAIL = '\n</body>\n</html>'
html = rep(html, TAIL, '\n' + PRICE_PANE_JS + TAIL, "inject price pane fix")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_637 applied: {', '.join(_ok)}")
