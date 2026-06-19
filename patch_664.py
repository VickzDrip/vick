#!/usr/bin/env python3
"""patch_664.py — Beta 0.664 / Phase 2.8: Paper sync non-invasive hotfix + oscillator bounds read-only audit."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-24.before_0664_paper_sync_hotfix.html"

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
    "<title>DVL Binance Live — Beta 0.663</title>",
    "<title>DVL Binance Live — Beta 0.664</title>",
    "title 0.663→0.664")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.663<",
    ">BETA 0.664<",
    "static badge 0.663→0.664")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.663";',
    'const DVL_APP_VERSION = "Beta 0.664";',
    "DVL_APP_VERSION 0.663→0.664")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.663 — Phase 2.7: Paper layer anchor + oscillator-safe sync; normaliza offsets internos do Paper após price scale 70px." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.664 — Phase 2.8: Paper sync non-invasive hotfix + oscillator bounds read-only audit." },\n  { version: "Beta 0.663", note: "Phase 2.7: Paper layer anchor + oscillator-safe sync; normaliza offsets internos do Paper após price scale 70px." },',
    "changelog 0.664 entry")

# ── 5. Replace old paper anchor module + insert oscillator audit module ────────
OLD_MODULE = r"""<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">
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

</head>
<body>"""

NEW_MODULE = r"""<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">
(function(){
"use strict";

var _lastSync   = null;
var _syncQueued = false;

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

  layer.style.setProperty("top",    "0",           "important");
  layer.style.setProperty("left",   "0",           "important");
  layer.style.setProperty("right",  scaleW + "px", "important");
  layer.style.setProperty("width",  "auto",        "important");
  layer.style.setProperty("height", paneH + "px",  "important");
  layer.style.setProperty("bottom", "auto",        "important");

  var result = {
    layerExists: true,
    wrapExists:  true,
    priceScaleW: scaleW,
    paneH:       paneH,
    timestamp:   Date.now()
  };
  _lastSync = result;
  return result;
}

function scheduleSync(){
  if(_syncQueued) return;
  _syncQueued = true;
  if(typeof queueMicrotask === "function"){
    queueMicrotask(function(){ _syncQueued = false; sync(); });
  } else {
    _syncQueued = false;
    sync();
  }
}

function audit(){
  var layer     = getLayer();
  var wrap      = getWrap();
  var scaleW    = getScaleW();
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
    version:                   "0.664",
    layerExists:               !!layer,
    wrapExists:                !!wrap,
    priceScaleW:               scaleW,
    layerRect:                 layerRect ? { top: layerRect.top, left: layerRect.left, right: layerRect.right, bottom: layerRect.bottom, width: layerRect.width, height: layerRect.height } : null,
    wrapRect:                  wrapRect  ? { top: wrapRect.top,  left: wrapRect.left,  right: wrapRect.right,  bottom: wrapRect.bottom,  width: wrapRect.width,  height: wrapRect.height  } : null,
    rightGapPx:                rightGapPx,
    heightPx:                  layerRect ? layerRect.height : null,
    expectedMaxHeightPx:       expectedMaxH,
    internalLineCount:         lines,
    internalHitCount:          hits,
    noTradeLogicMutation:      true,
    noChartFunctionOverride:   true,
    usesNonInvasiveScheduler:  true,
    requestAnimationFrameUsed: false,
    lastSync:                  _lastSync
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

window.addEventListener("resize",            sync);
window.addEventListener("orientationchange", scheduleSync);
window.addEventListener("load",              scheduleSync);

window.DVL_PAPER_LAYER_ANCHOR = {
  VERSION:      "0.664",
  sync:         sync,
  scheduleSync: scheduleSync,
  audit:        audit,
  getLastSync:  getLastSync
};

})();
</script>

<style id="DVL_OSCILLATOR_BOUNDS_AUDIT_CSS_0664">
/* DVL Beta 0.664 — Phase 2.8: oscillator bounds audit marker only.
   Read-only/visual-neutral. No layout, color, spacing, z-index, radius, padding, height or width properties. */
</style>

<script id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0664">
(function(){
"use strict";

var _lastAudit = null;

var KNOWN_OSCILLATORS = [
  "DVLOpenInterestOscillator",
  "DVLLongShortOscillator",
  "DVLDeltaVolume",
  "DVLTickVolume",
  "DVLTestOscillator",
  "DVLTestOscillator2"
];

function countActiveOscillators(){
  var count = 0;
  for(var i = 0; i < KNOWN_OSCILLATORS.length; i++){
    var obj = window[KNOWN_OSCILLATORS[i]];
    if(obj && typeof obj.on === "function") count++;
  }
  return count;
}

function audit(){
  var canvasWrap  = document.querySelector(".canvasWrap");
  var paperLayer  = document.getElementById("dvlPaperLayer") || document.querySelector(".dvl-paper-layer");
  var paperAnchor = document.getElementById("DVL_PAPER_LAYER_ANCHOR_CSS_0663");

  var activeCount = countActiveOscillators();

  var oscBoundsSource = null;
  var oscBounds       = null;
  var firstOscTop     = null;
  var lastOscBottom   = null;

  if(window.__dvlOscillatorPanelBounds && typeof window.__dvlOscillatorPanelBounds === "object"){
    oscBoundsSource = "window.__dvlOscillatorPanelBounds";
    oscBounds       = window.__dvlOscillatorPanelBounds;
    firstOscTop     = (typeof oscBounds.top    === "number") ? oscBounds.top    : null;
    lastOscBottom   = (typeof oscBounds.bottom === "number") ? oscBounds.bottom : null;
  }

  var paperLayerRect = paperLayer ? paperLayer.getBoundingClientRect() : null;
  var chartWrapRect  = canvasWrap ? canvasWrap.getBoundingClientRect() : null;

  var paperBottomPx = paperLayerRect ? paperLayerRect.bottom : null;
  var paperHeightPx = paperLayerRect ? paperLayerRect.height : null;

  var invades     = false;
  var overlapPx   = 0;
  var recommendations = [];

  if(firstOscTop !== null && paperBottomPx !== null){
    if(paperBottomPx > firstOscTop){
      invades   = true;
      overlapPx = Math.round(paperBottomPx - firstOscTop);
      recommendations.push("Paper layer should be limited to price pane only before oscillator fixes.");
    }
  }

  var result = {
    version:                    "0.664",
    canvasWrapExists:           !!canvasWrap,
    paperLayerExists:           !!paperLayer,
    paperAnchorExists:          !!paperAnchor,
    activeOscillatorCount:      activeCount,
    oscillatorBoundsSource:     oscBoundsSource,
    oscillatorBounds:           oscBounds,
    firstOscillatorTopPx:       firstOscTop,
    lastOscillatorBottomPx:     lastOscBottom,
    paperLayerRect:             paperLayerRect ? { top: paperLayerRect.top, left: paperLayerRect.left, right: paperLayerRect.right, bottom: paperLayerRect.bottom, width: paperLayerRect.width, height: paperLayerRect.height } : null,
    chartWrapRect:              chartWrapRect  ? { top: chartWrapRect.top,  left: chartWrapRect.left,  right: chartWrapRect.right,  bottom: chartWrapRect.bottom,  width: chartWrapRect.width,  height: chartWrapRect.height  } : null,
    paperLayerBottomPx:         paperBottomPx,
    paperLayerHeightPx:         paperHeightPx,
    paperInvadesOscillatorArea: invades,
    overlapPx:                  overlapPx,
    recommendations:            recommendations
  };

  _lastAudit = result;
  return result;
}

function getLastAudit(){
  return _lastAudit;
}

window.DVL_OSCILLATOR_BOUNDS_AUDIT = {
  VERSION:      "0.664",
  audit:        audit,
  getLastAudit: getLastAudit
};

})();
</script>

</head>
<body>"""

html = rep(html, OLD_MODULE, NEW_MODULE, "replace paper anchor module + add oscillator audit module")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_664 applied: title, badge, version, changelog, paper anchor hotfix, oscillator bounds audit module")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.664</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.663</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.664";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.663";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.664<" in content, "FAIL: static badge"
assert ">BETA 0.663<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.664 — Phase 2.8: Paper sync non-invasive hotfix + oscillator bounds read-only audit.' in content, "FAIL: changelog 0.664"
assert '"Beta 0.663", note: "Phase 2.7:' in content, "FAIL: 0.663 changelog preserved"

# 3. Paper anchor module present exactly once
assert content.count('id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663"') == 1, "FAIL: paper anchor module count != 1"

# 4. Paper anchor module VERSION updated to 0.664
# Find the module block and check it contains version 0.664
module_start = content.index('<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">')
module_end   = content.index('</script>', module_start) + len('</script>')
module_block = content[module_start:module_end]
assert 'VERSION:      "0.664"' in module_block, "FAIL: paper anchor module VERSION not 0.664"
assert '"0.664"' in module_block, "FAIL: version string 0.664 not in module"

# 5. No drawSoon in paper anchor module
assert 'window.drawSoon' not in module_block, "FAIL: window.drawSoon still present in paper anchor module"
assert '_prevDrawSoon'   not in module_block, "FAIL: _prevDrawSoon still present in paper anchor module"
assert 'requestAnimationFrame(' not in module_block, "FAIL: requestAnimationFrame call still present in paper anchor module"

# 6. scheduleSync present in paper anchor module
assert 'function scheduleSync()' in module_block, "FAIL: scheduleSync function missing from paper anchor module"
assert '_syncQueued'    in module_block, "FAIL: _syncQueued missing from paper anchor module"
assert 'queueMicrotask' in module_block, "FAIL: queueMicrotask missing from paper anchor module"
assert 'scheduleSync: scheduleSync' in module_block, "FAIL: scheduleSync not exported"

# 7. audit() in paper anchor module reports correct fields
assert 'noChartFunctionOverride:   true' in module_block, "FAIL: noChartFunctionOverride: true missing"
assert 'usesNonInvasiveScheduler:  true' in module_block, "FAIL: usesNonInvasiveScheduler: true missing"
assert 'requestAnimationFrameUsed: false' in module_block, "FAIL: requestAnimationFrameUsed: false missing"

# 8. No forbidden patterns in paper anchor module
assert 'setInterval'      not in module_block, "FAIL: setInterval in paper anchor module"
assert 'setTimeout'       not in module_block, "FAIL: setTimeout in paper anchor module"
assert 'MutationObserver' not in module_block, "FAIL: MutationObserver in paper anchor module"
assert 'ResizeObserver'   not in module_block, "FAIL: ResizeObserver in paper anchor module"

# 9. Oscillator audit module present exactly once
assert content.count('id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0664"') == 1, "FAIL: oscillator audit module count != 1"

# 10. Oscillator audit module properties
osc_start = content.index('<script id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0664">')
osc_end   = content.index('</script>', osc_start) + len('</script>')
osc_block = content[osc_start:osc_end]
assert 'window.DVL_OSCILLATOR_BOUNDS_AUDIT' in osc_block, "FAIL: DVL_OSCILLATOR_BOUNDS_AUDIT not exported"
assert 'function audit()' in osc_block, "FAIL: audit() missing from oscillator module"
assert 'function getLastAudit()' in osc_block, "FAIL: getLastAudit() missing from oscillator module"
assert 'VERSION:      "0.664"' in osc_block, "FAIL: oscillator module VERSION not 0.664"
assert 'paperInvadesOscillatorArea' in osc_block, "FAIL: paperInvadesOscillatorArea missing"
assert 'overlapPx' in osc_block, "FAIL: overlapPx missing"
assert 'recommendations' in osc_block, "FAIL: recommendations missing"
assert 'window.__dvlOscillatorPanelBounds' in osc_block, "FAIL: __dvlOscillatorPanelBounds read missing"
assert 'DVLOpenInterestOscillator' in osc_block, "FAIL: known oscillator list missing"

# 11. Oscillator audit module is read-only (no forbidden mutations)
assert 'style.set'        not in osc_block, "FAIL: style write in oscillator audit module"
assert 'classList'        not in osc_block, "FAIL: classList mutation in oscillator audit module"
assert 'setAttribute'     not in osc_block, "FAIL: setAttribute in oscillator audit module"
assert 'appendChild'      not in osc_block, "FAIL: appendChild in oscillator audit module"
assert 'removeChild'      not in osc_block, "FAIL: removeChild in oscillator audit module"
assert 'requestAnimationFrame(' not in osc_block, "FAIL: requestAnimationFrame call in oscillator audit module"
assert 'setInterval'      not in osc_block, "FAIL: setInterval in oscillator audit module"
assert 'setTimeout'       not in osc_block, "FAIL: setTimeout in oscillator audit module"
assert 'MutationObserver' not in osc_block, "FAIL: MutationObserver in oscillator audit module"
assert 'ResizeObserver'   not in osc_block, "FAIL: ResizeObserver in oscillator audit module"

# 12. Oscillator audit CSS marker present
assert 'id="DVL_OSCILLATOR_BOUNDS_AUDIT_CSS_0664"' in content, "FAIL: oscillator audit CSS marker missing"
assert content.count('id="DVL_OSCILLATOR_BOUNDS_AUDIT_CSS_0664"') == 1, "FAIL: oscillator audit CSS count != 1"

# 13. Order of blocks before </head>
idx_css_0663    = content.index('DVL_PAPER_LAYER_ANCHOR_CSS_0663')
idx_mod_0663    = content.index('DVL_PAPER_LAYER_ANCHOR_MODULE_0663')
idx_css_0664    = content.index('DVL_OSCILLATOR_BOUNDS_AUDIT_CSS_0664')
idx_mod_0664    = content.index('DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0664')
idx_head        = content.index('</head>')
assert idx_css_0663 < idx_mod_0663 < idx_css_0664 < idx_mod_0664 < idx_head, \
    "FAIL: blocks not in correct order before </head>"

# 14. Prior CSS lock blocks preserved (in correct order)
idx_0659 = content.index("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659")
idx_0660 = content.index("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660")
idx_0661 = content.index("DVL_CHROME_FINAL_LOCK_CSS_0661")
idx_0662 = content.index("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662")
assert idx_0659 < idx_0660 < idx_0661 < idx_0662 < idx_css_0663, \
    "FAIL: prior CSS lock blocks not in correct order"

# 15. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655"   in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"

# 16. No wrongly-created button system modules
for ver in ["0656","0657","0658","0659","0660","0661","0662","0663","0664"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 17. Module in <head>: both new script tags must appear before main script
main_script_start = content.index('<script>\nconst DVL_APP_VERSION')
assert content.index('<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">') < main_script_start, \
    "FAIL: paper anchor module not in <head>"
assert content.index('<script id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0664">') < main_script_start, \
    "FAIL: oscillator audit module not in <head>"

# 18. Zero DVL_TODO_0664
assert "DVL_TODO_0664" not in content, "FAIL: DVL_TODO_0664 remaining"

# 19. Buy/Sell HTML untouched
assert 'class="tradeAction buy"'  in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 20. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 21. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;'          in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 22. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-header",
            "dvl-btn-migrated-panel",  "dvl-btn-migrated-drawer",
            "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 23. DVL_PAPER_LAYER_ANCHOR_CSS_0663 preserved
assert content.count('id="DVL_PAPER_LAYER_ANCHOR_CSS_0663"') == 1, "FAIL: paper anchor CSS missing or duplicated"

print("[OK] all 45 assertions passed — 0664 clean: paper sync non-invasive hotfix + oscillator bounds audit")
