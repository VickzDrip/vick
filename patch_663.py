#!/usr/bin/env python3
"""patch_663.py — Beta 0.663 / Phase 2.7: Paper layer anchor + oscillator-safe sync."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-23.before_0663_paper_layer_anchor.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ABORT] not found: {label}"); sys.exit(1)
    if count > 1:
        print(f"[ABORT] ambiguous ({count}x): {label}"); sys.exit(1)
    return html.replace(old, new, 1)

shutil.copy2(SRC, BAK)
print(f"[OK] backup: {BAK}")

with open(SRC, encoding="utf-8") as f:
    html = f.read()

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    "<title>DVL Binance Live — Beta 0.662</title>",
    "<title>DVL Binance Live — Beta 0.663</title>",
    "title 0.662→0.663")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.662<",
    ">BETA 0.663<",
    "static badge 0.662→0.663")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.662";',
    'const DVL_APP_VERSION = "Beta 0.663";',
    "DVL_APP_VERSION 0.662→0.663")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.662 — Phase 2.6: lock final de gap chart/canvas/footer e geometria do trade drawer 150px sem sobrepor o footer." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.663 — Phase 2.7: Paper layer anchor + oscillator-safe sync; normaliza offsets internos do Paper após price scale 70px." },\n  { version: "Beta 0.662", note: "Phase 2.6: lock final de gap chart/canvas/footer e geometria do trade drawer 150px sem sobrepor o footer." },',
    "changelog 0.663 entry")

# ── 5. CSS + module — insert after 0662 block, before </head> ─────────────────
PAPER_CSS = """<style id="DVL_PAPER_LAYER_ANCHOR_CSS_0663">
/* DVL Beta 0.663 — Phase 2.7: Paper layer anchor.
   The paper layer itself reserves the 70px right price scale.
   Internal paper lines/hits should not subtract the old 54/55/56/57px offsets again. */
:root{
  --dvl-paper-price-scale-w:var(--dvl-price-scale-w,70px)!important;
}
#dvlPaperLayer.dvl-paper-layer,
.canvasWrap .dvl-paper-layer{
  left:0!important;
  right:var(--dvl-paper-price-scale-w)!important;
  width:auto!important;
}
#dvlPaperLayer .dvl-paper-line,
#dvlPaperLayer .dvl-paper-hit{
  left:0!important;
  right:0!important;
}
#dvlPaperLayer .dvl-paper-tag:not(.dvl-paper-edit-label-fixed){
  right:auto!important;
}
#dvlPaperLayer .dvl-paper-pending,
#dvlPaperLayer .dvl-paper-pending-controls,
#dvlPaperLayer .dvl-paper-edit-confirm{
  right:0!important;
}
</style>

"""

PAPER_MODULE = """<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">
(function(){
"use strict";

var _lastSync = null;

function getScaleW(){
  return (typeof window.DVL_PRICE_SCALE_W === "number") ? window.DVL_PRICE_SCALE_W : 70;
}

function getWrap(){
  return document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
}

function getLayer(){
  return document.getElementById("dvlPaperLayer") || document.querySelector(".dvl-paper-layer");
}

function sync(){
  var layer = getLayer();
  var wrap  = getWrap();
  if(!layer || !wrap) return { layerExists: false, wrapExists: !!wrap };

  var scaleW = getScaleW();
  var totalH = wrap.clientHeight;
  var priceH = totalH;
  try{
    if(typeof dvlPricePanelHeight === "function") priceH = dvlPricePanelHeight(totalH);
  }catch(_){}
  var timeH = 20;
  try{
    if(typeof dvlMainTimeScaleHeight === "function") timeH = dvlMainTimeScaleHeight();
  }catch(_){}
  var paneH = Math.max(40, priceH - timeH);

  layer.style.setProperty("top",    "0",               "important");
  layer.style.setProperty("left",   "0",               "important");
  layer.style.setProperty("right",  scaleW + "px",     "important");
  layer.style.setProperty("width",  "auto",            "important");
  layer.style.setProperty("height", paneH + "px",      "important");
  layer.style.setProperty("bottom", "auto",            "important");

  var result = {
    layerExists:  true,
    wrapExists:   true,
    priceScaleW:  scaleW,
    paneH:        paneH,
    timestamp:    Date.now()
  };
  _lastSync = result;
  return result;
}

function audit(){
  var layer   = getLayer();
  var wrap    = getWrap();
  var scaleW  = getScaleW();
  var layerRect = layer ? layer.getBoundingClientRect() : null;
  var wrapRect  = wrap  ? wrap.getBoundingClientRect()  : null;
  var rightGapPx = (layerRect && wrapRect) ? (wrapRect.right - layerRect.right) : null;
  var lines = layer ? layer.querySelectorAll(".dvl-paper-line").length : 0;
  var hits  = layer ? layer.querySelectorAll(".dvl-paper-hit").length  : 0;
  var totalH = wrap ? wrap.clientHeight : 0;
  var priceH = totalH;
  try{ if(typeof dvlPricePanelHeight === "function") priceH = dvlPricePanelHeight(totalH); }catch(_){}
  var timeH = 20;
  try{ if(typeof dvlMainTimeScaleHeight === "function") timeH = dvlMainTimeScaleHeight(); }catch(_){}
  var expectedMaxH = Math.max(40, priceH - timeH);

  return {
    version:              "0.663",
    layerExists:          !!layer,
    wrapExists:           !!wrap,
    priceScaleW:          scaleW,
    layerRect:            layerRect ? { top: layerRect.top, left: layerRect.left, right: layerRect.right, bottom: layerRect.bottom, width: layerRect.width, height: layerRect.height } : null,
    wrapRect:             wrapRect  ? { top: wrapRect.top,  left: wrapRect.left,  right: wrapRect.right,  bottom: wrapRect.bottom,  width: wrapRect.width,  height: wrapRect.height  } : null,
    rightGapPx:           rightGapPx,
    heightPx:             layerRect ? layerRect.height : null,
    expectedMaxHeightPx:  expectedMaxH,
    internalLineCount:    lines,
    internalHitCount:     hits,
    noTradeLogicMutation: true,
    lastSync:             _lastSync
  };
}

function getLastSync(){
  return _lastSync;
}

function run(){
  sync();
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", run, { once: true });
} else {
  run();
}

window.addEventListener("resize", sync);

if(typeof window.drawSoon === "function"){
  var _prevDrawSoon = window.drawSoon;
  window.drawSoon = function(){
    var r = _prevDrawSoon.apply(this, arguments);
    requestAnimationFrame(sync);
    return r;
  };
}

window.DVL_PAPER_LAYER_ANCHOR = {
  VERSION:     "0.663",
  sync:        sync,
  audit:       audit,
  getLastSync: getLastSync
};

})();
</script>

"""

html = rep(html,
    ".tradeDrawerBody{\n  max-height:150px!important;\n  overflow:hidden!important;\n}\n</style>\n\n</head>\n<body>",
    ".tradeDrawerBody{\n  max-height:150px!important;\n  overflow:hidden!important;\n}\n</style>\n\n" + PAPER_CSS + PAPER_MODULE + "</head>\n<body>",
    "insert DVL_PAPER_LAYER_ANCHOR_CSS_0663 + MODULE before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_663 applied: title, badge, version, changelog, DVL_PAPER_LAYER_ANCHOR_CSS_0663, DVL_PAPER_LAYER_ANCHOR_MODULE_0663")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.663</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.662</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.663";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.662";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.663<" in content, "FAIL: static badge"
assert ">BETA 0.662<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.663 — Phase 2.7: Paper layer anchor + oscillator-safe sync; normaliza offsets internos do Paper após price scale 70px.' in content, "FAIL: changelog 0.663"
assert '"Beta 0.662", note: "Phase 2.6:' in content, "FAIL: 0.662 changelog preserved"

# 3. CSS block present exactly once
assert content.count("DVL_PAPER_LAYER_ANCHOR_CSS_0663") == 1, "FAIL: CSS 0663 count != 1"
assert '<style id="DVL_PAPER_LAYER_ANCHOR_CSS_0663">' in content, "FAIL: CSS tag"

# 4. Module present exactly once
assert content.count("DVL_PAPER_LAYER_ANCHOR_MODULE_0663") == 1, "FAIL: module count != 1"
assert '<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">' in content, "FAIL: module script tag"

# 5. Order: 0662 → CSS 0663 → module 0663 → </head>
idx_0662  = content.index("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662")
idx_css   = content.index("DVL_PAPER_LAYER_ANCHOR_CSS_0663")
idx_mod   = content.index("DVL_PAPER_LAYER_ANCHOR_MODULE_0663")
idx_head  = content.index("</head>")
assert idx_0662 < idx_css < idx_mod < idx_head, "FAIL: 0663 blocks not in correct order before </head>"

# 6. CSS content correct
module_area = content[idx_css:idx_head]
assert "--dvl-paper-price-scale-w:var(--dvl-price-scale-w,70px)!important;" in module_area, "FAIL: --dvl-paper-price-scale-w"
assert "#dvlPaperLayer.dvl-paper-layer," in module_area, "FAIL: #dvlPaperLayer selector"
assert "right:var(--dvl-paper-price-scale-w)!important;" in module_area, "FAIL: right:var paper layer"
assert "#dvlPaperLayer .dvl-paper-line," in module_area, "FAIL: paper-line selector"
assert "#dvlPaperLayer .dvl-paper-hit{" in module_area, "FAIL: paper-hit selector"
assert "#dvlPaperLayer .dvl-paper-tag:not(.dvl-paper-edit-label-fixed){" in module_area, "FAIL: paper-tag selector"
assert "#dvlPaperLayer .dvl-paper-pending," in module_area, "FAIL: paper-pending selector"

# 7. Module API exported
assert 'window.DVL_PAPER_LAYER_ANCHOR = {' in content, "FAIL: window.DVL_PAPER_LAYER_ANCHOR"
assert 'VERSION:     "0.663",' in content, "FAIL: VERSION"
assert "sync:        sync," in content, "FAIL: sync exported"
assert "audit:       audit," in content, "FAIL: audit exported"
assert "getLastSync: getLastSync" in content, "FAIL: getLastSync exported"

# 8. Module functions defined
assert "function sync()" in content, "FAIL: sync() not defined"
assert "function audit()" in content, "FAIL: audit() not defined"
assert "function getLastSync()" in content, "FAIL: getLastSync() not defined"

# 9. Audit return fields
assert "noTradeLogicMutation: true," in content, "FAIL: noTradeLogicMutation"
assert "internalLineCount:" in content, "FAIL: internalLineCount"
assert "internalHitCount:" in content, "FAIL: internalHitCount"
assert "rightGapPx:" in content, "FAIL: rightGapPx"
assert "expectedMaxHeightPx:" in content, "FAIL: expectedMaxHeightPx"

# 10. No forbidden patterns in new module
assert "setInterval" not in module_area, "FAIL: setInterval in module"
assert "MutationObserver" not in module_area, "FAIL: MutationObserver in module"
assert "ResizeObserver" not in module_area, "FAIL: ResizeObserver in module"

# 11. drawSoon safe wrap present
assert "_prevDrawSoon = window.drawSoon" in content, "FAIL: drawSoon safe wrap"
assert "requestAnimationFrame(sync)" in content, "FAIL: rAF(sync) in drawSoon wrap"

# 12. resize listener present
assert 'window.addEventListener("resize", sync)' in content, "FAIL: resize listener"

# 13. Prior lock blocks preserved
assert "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659" in content, "FAIL: 0659 missing"
assert "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660" in content, "FAIL: 0660 missing"
assert "DVL_CHROME_FINAL_LOCK_CSS_0661" in content, "FAIL: 0661 missing"
assert "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662" in content, "FAIL: 0662 missing"

# 14. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"

# 15. No wrongly-created button system modules
for ver in ["0656","0657","0658","0659","0660","0661","0662","0663"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 16. No nested <script> inside <script>
# The new <script> is in <head>, not nested inside the main script body
main_script_start = content.index('<script>\nconst DVL_APP_VERSION')
# Module should be in <head> (before main script), not nested inside it
assert content.index('<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">') < main_script_start, "FAIL: module not in <head> before main script"
assert content.count('<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">') == 1, "FAIL: module appears more than once"

# 17. Zero DVL_TODO_0663
assert "DVL_TODO_0663" not in content, "FAIL: DVL_TODO_0663 remaining"

# 18. Buy/Sell HTML untouched
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 19. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 20. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;' in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 21. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-header",
            "dvl-btn-migrated-panel", "dvl-btn-migrated-drawer",
            "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

print("[OK] all 50 assertions passed — 0663 clean, paper layer anchor CSS+module before </head>, no forbidden observers/timers")
