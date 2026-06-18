#!/usr/bin/env python3
"""
patch_636.py — DVL Beta 0.636
Fix: paper trading panel layout stability when oscillators are toggled.

Two root causes:
 A) Panel (tradeDrawer): only had max-height — no explicit height — plus
    overflow:visible from DVL_BETA_0416. Frequent canvas redraws caused
    browser layout thrashing that transiently changed the fixed panel's
    visual proportions. Fix: lock every row to an exact pixel height and
    add CSS containment to fully isolate the panel from external layout.

 B) Overlay (#dvlPaperLayer): lived inside #chartWrap (position:absolute).
    When indicatorsOn toggled, __dvlLegacyPriceArea returned a smaller
    price area (55% of canvas), compressing all TP/ENTRY/SL labels into
    the top half of the overlay. Fix: relocate the layer to document.body
    as position:fixed and sync its bounds to #chartWrap on every drawSoon
    and resize — fully decoupled from chart DOM layout.

The approved 0.598 trade logic is NOT modified — only layout/CSS/positioning.
"""
import sys, pathlib

SRC = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
html = SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1: print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── 1. Version ────────────────────────────────────────────────────────────────
html = rep(html, 'BETA 0.635', 'BETA 0.636', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.635";',
    'const DVL_APP_VERSION = "Beta 0.636";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Feature: Paper Trading 0.598 — overlay TP/ENTRY/SL arrastavel, Limit pendente, TP auto-close, SL manual, multi-posicao por simbolo." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading panel layout isolation — contain+height lock prevents oscillator layout thrashing; overlay layer relocated outside canvas DOM." },\n'
    '  { version: "Beta 0.635", note: "Feature: Paper Trading 0.598 — overlay TP/ENTRY/SL arrastavel, Limit pendente, TP auto-close, SL manual, multi-posicao por simbolo." },',
    "changelog 0.636")

# ── 2. CSS: lock panel dimensions ────────────────────────────────────────────
PANEL_CSS = """\
<style id="DVL_BETA_0636_PAPER_PANEL_LAYOUT_FIX">
/*
  DVL Beta 0.636 — Paper Trading panel layout isolation

  Locks every row of the trade panel to explicit pixel heights and adds CSS
  containment so the panel is fully isolated from canvas/oscillator redraws.
  No trade logic is changed.
*/

/* Promote panel to own compositor layer — isolated from canvas repaints */
.tradeDrawer{
  transform:translateZ(0)!important;
  will-change:transform!important;
  contain:layout style!important;
  bottom:calc(var(--dvl-footer-h, 57px) + env(safe-area-inset-bottom))!important;
}

/* Sheet: exact fixed height, never depends on viewport height or chart size */
.tradeDrawerSheet{
  height:130px!important;
  min-height:130px!important;
  max-height:130px!important;
  overflow:hidden!important;
  contain:layout!important;
}

/* Body: fixed height — sum of grid rows + padding + gaps */
/* rows: 24+66+22=112 + gaps: 4*2=8 + padding: 5*2=10 = 130 */
.tradeDrawerBody{
  height:120px!important;
  min-height:120px!important;
  max-height:120px!important;
  padding:5px!important;
  display:grid!important;
  grid-template-rows:24px 66px 22px!important;
  gap:4px!important;
  overflow:hidden!important;
  contain:layout style!important;
}

/* Row 1 — order type / margin mode / close X : 24px */
.panelRowTop{
  height:24px!important;
  min-height:24px!important;
  max-height:24px!important;
  overflow:visible!important;
  contain:layout style!important;
}

/* Row 2 — Wallet / Entry / Leverage / Buy / Sell : 66px */
.panelRowMain{
  height:66px!important;
  min-height:66px!important;
  max-height:66px!important;
  overflow:hidden!important;
  align-items:stretch!important;
  contain:layout!important;
}

/* Every card in row 2 — explicitly 66px */
.panelMetric,
.tradeAction{
  height:66px!important;
  min-height:66px!important;
  max-height:66px!important;
  contain:layout style!important;
}

/* Buy/Sell text: fixed font sizes, never scale with chart height */
.tradeAction strong{
  font-size:12.5px!important;
  line-height:1.05!important;
}

.tradeAction span{
  margin-top:4px!important;
  font-size:7.8px!important;
  line-height:1!important;
}

/* Row 3 — liquidation display row : 22px */
.panelRowBottom{
  height:22px!important;
  min-height:22px!important;
  max-height:22px!important;
  overflow:hidden!important;
  contain:layout style!important;
}

/* Panel buttons row: always 24px */
.panelBtn{
  height:24px!important;
  min-height:24px!important;
  max-height:24px!important;
  contain:layout!important;
}

/* Order-type dropdown escapes the overflow:hidden of panelRowTop */
.orderTypeMenu{
  position:absolute!important;
  z-index:100250!important;
}

/* Paper overlay layer: no height-100% inheritance from chart containers */
#dvlPaperLayer{
  position:fixed!important;
}
</style>"""

# ── 3. JS: relocate overlay layer outside canvas DOM ─────────────────────────
LAYER_JS = """\
<script id="DVL_BETA_0636_PAPER_LAYER_FIXED">
/*
  DVL Beta 0.636 — Paper Trading overlay layer relocation

  The 0.598 runtime places #dvlPaperLayer inside #chartWrap (position:absolute).
  Moving it to document.body as position:fixed decouples it from the chart DOM
  so oscillator / indicator toggles cannot affect the layer's bounding box.

  y-coordinates from the 0.598 runtime are already relative to chartWrap top,
  so we just set layer.{top,left,width,height} = chartWrap.getBoundingClientRect().

  The approved 0.598 trade logic is NOT modified.
*/
(function(){
  "use strict";

  var DONE_KEY = "__dvlLayer0636Fixed";

  function syncBounds(layer, wrap){
    var r = wrap.getBoundingClientRect();
    layer.style.position = "fixed";
    layer.style.top      = r.top.toFixed(1)    + "px";
    layer.style.left     = r.left.toFixed(1)   + "px";
    layer.style.width    = r.width.toFixed(1)  + "px";
    layer.style.height   = r.height.toFixed(1) + "px";
    layer.style.right    = "";
    layer.style.bottom   = "";
    layer.style.inset    = "";
    layer.style.zIndex   = "17";
    layer.style.pointerEvents = "none";
    layer.style.overflow = "visible";
  }

  function applyFix(){
    var layer = document.getElementById("dvlPaperLayer");
    var wrap  = document.getElementById("chartWrap") ||
                document.querySelector(".canvasWrap");
    if(!layer || !wrap)    return false;
    if(layer[DONE_KEY])    return true;
    layer[DONE_KEY] = true;

    /* Move out of chartWrap */
    if(layer.parentNode && layer.parentNode !== document.body){
      layer.parentNode.removeChild(layer);
      document.body.appendChild(layer);
    }

    syncBounds(layer, wrap);

    /* Keep synced on resize / orientation change */
    window.addEventListener("resize", function(){
      syncBounds(layer, wrap);
    }, { passive: true });

    /* Piggyback on drawSoon (already patched by 0.598 runtime) */
    var _old = window.drawSoon;
    if(typeof _old === "function" && !_old[DONE_KEY]){
      window.drawSoon = function(){
        var r = _old.apply(this, arguments);
        requestAnimationFrame(function(){ syncBounds(layer, wrap); });
        return r;
      };
      window.drawSoon[DONE_KEY] = true;
    }

    /* Periodic fallback for SVH recalculation on mobile */
    setInterval(function(){ syncBounds(layer, wrap); }, 800);
    return true;
  }

  /* Poll until 0.598 runtime creates the layer (fires after DOMContentLoaded) */
  function waitForLayer(){
    if(applyFix()) return;
    var poll = setInterval(function(){
      if(applyFix()) clearInterval(poll);
    }, 80);
    setTimeout(function(){ clearInterval(poll); }, 12000);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", waitForLayer, { once: true });
  } else {
    waitForLayer();
  }
})();
</script>"""

# ── 4. Inject both blocks before </body></html> ───────────────────────────────
TAIL = '\n</body>\n</html>'
html = rep(html, TAIL, '\n' + PANEL_CSS + '\n\n' + LAYER_JS + TAIL, "inject layout fix")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_636 applied: {', '.join(_ok)}")
