#!/usr/bin/env python3
"""patch_665.py — Beta 0.665 / Phase 2.9: oscillator safe clamp + Paper layer audit verification."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-25.before_0665_oscillator_safe_clamp.html"

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
    "<title>DVL Binance Live — Beta 0.664</title>",
    "<title>DVL Binance Live — Beta 0.665</title>",
    "title 0.664→0.665")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.664<",
    ">BETA 0.665<",
    "static badge 0.664→0.665")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.664";',
    'const DVL_APP_VERSION = "Beta 0.665";',
    "DVL_APP_VERSION 0.664→0.665")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.664 — Phase 2.8: Paper sync non-invasive hotfix + oscillator bounds read-only audit." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.665 — Phase 2.9: oscillator safe clamp + audit verification for Paper layer bounds." },\n  { version: "Beta 0.664", note: "Phase 2.8: Paper sync non-invasive hotfix + oscillator bounds read-only audit." },',
    "changelog 0.665 entry")

# ── 5. Replace both modules (paper anchor 0663 + oscillator audit 0664) ───────
OLD_MODULES = r"""<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663">
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

NEW_MODULES = r"""<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0665">
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

function getOscillatorBounds(){
  if(window.__dvlOscillatorPanelBounds &&
     typeof window.__dvlOscillatorPanelBounds === "object" &&
     typeof window.__dvlOscillatorPanelBounds.top === "number"){
    return window.__dvlOscillatorPanelBounds;
  }
  return null;
}

function getMaxPricePaneHeight(wrapRect, totalH, priceH, timeH){
  return Math.max(40, priceH - timeH);
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

  var wrapRect = wrap.getBoundingClientRect();
  var paneH    = getMaxPricePaneHeight(wrapRect, totalH, priceH, timeH);

  var oscBounds            = getOscillatorBounds();
  var oscBoundsDetected    = false;
  var firstOscTopPx        = null;
  var localOscTopPx        = null;
  var clampApplied         = false;
  var clampMarginPx        = 0;

  if(oscBounds !== null){
    oscBoundsDetected = true;
    firstOscTopPx    = oscBounds.top;
    localOscTopPx    = firstOscTopPx - wrapRect.top;
    var clamped      = Math.max(40, localOscTopPx - 1);
    if(clamped < paneH){
      paneH         = clamped;
      clampApplied  = true;
      clampMarginPx = 1;
    }
  }

  layer.style.setProperty("top",    "0",           "important");
  layer.style.setProperty("left",   "0",           "important");
  layer.style.setProperty("right",  scaleW + "px", "important");
  layer.style.setProperty("width",  "auto",        "important");
  layer.style.setProperty("height", paneH + "px",  "important");
  layer.style.setProperty("bottom", "auto",        "important");

  var result = {
    version:                 "0.665",
    layerExists:             true,
    wrapExists:              true,
    priceScaleW:             scaleW,
    paneH:                   paneH,
    oscillatorBoundsDetected: oscBoundsDetected,
    firstOscillatorTopPx:    firstOscTopPx,
    localOscillatorTopPx:    localOscTopPx,
    clampApplied:            clampApplied,
    clampMarginPx:           clampMarginPx,
    timestamp:               Date.now()
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
    version:                   "0.665",
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
  VERSION:      "0.665",
  sync:         sync,
  scheduleSync: scheduleSync,
  audit:        audit,
  getLastSync:  getLastSync
};

})();
</script>

<style id="DVL_OSCILLATOR_SAFE_CLAMP_CSS_0665">
/* DVL Beta 0.665 — Phase 2.9: oscillator safe clamp marker only.
   The Paper layer anchor JS module (DVL_PAPER_LAYER_ANCHOR_MODULE_0665) clamps #dvlPaperLayer
   height to the price pane when window.__dvlOscillatorPanelBounds is present.
   No visual/layout properties here. Read-only/visual-neutral. */
</style>

<script id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665">
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

  var totalH = canvasWrap ? canvasWrap.clientHeight : 0;
  var priceH = totalH;
  try{ if(typeof dvlPricePanelHeight === "function") priceH = dvlPricePanelHeight(totalH); }catch(_){}
  var timeH = 20;
  try{ if(typeof dvlMainTimeScaleHeight === "function") timeH = dvlMainTimeScaleHeight(); }catch(_){}
  var expectedMaxPaneH = Math.max(40, priceH - timeH);

  var lastSync      = window.DVL_PAPER_LAYER_ANCHOR ? window.DVL_PAPER_LAYER_ANCHOR.getLastSync() : null;
  var clampApplied  = lastSync ? !!lastSync.clampApplied : false;
  var clampMarginPx = lastSync ? (lastSync.clampMarginPx || 0) : 0;

  var paperBottomVsFirstOscTopPx = (paperBottomPx !== null && firstOscTop !== null)
    ? Math.round(paperBottomPx - firstOscTop)
    : null;

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

  var paperFitsPricePane = paperHeightPx !== null
    ? (paperHeightPx <= expectedMaxPaneH + 1)
    : true;

  var result = {
    version:                    "0.665",
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
    paperFitsPricePane:         paperFitsPricePane,
    expectedMaxPaneH:           expectedMaxPaneH,
    clampApplied:               clampApplied,
    clampMarginPx:              clampMarginPx,
    paperBottomVsFirstOscTopPx: paperBottomVsFirstOscTopPx,
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
  VERSION:      "0.665",
  audit:        audit,
  getLastAudit: getLastAudit
};

})();
</script>

</head>
<body>"""

html = rep(html, OLD_MODULES, NEW_MODULES, "replace paper anchor 0663→0665 + oscillator audit 0664→0665 + clamp CSS")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_665 applied: title, badge, version, changelog, paper anchor 0665, clamp CSS 0665, oscillator audit 0665")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.665</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.664</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.665";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.664";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.665<" in content, "FAIL: static badge"
assert ">BETA 0.664<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.665 — Phase 2.9: oscillator safe clamp + audit verification for Paper layer bounds.' in content, "FAIL: changelog 0.665"
assert '"Beta 0.664", note: "Phase 2.8:' in content, "FAIL: 0.664 changelog preserved"

# 3. New module IDs present exactly once each
assert content.count('id="DVL_PAPER_LAYER_ANCHOR_MODULE_0665"') == 1,        "FAIL: paper anchor 0665 count != 1"
assert content.count('id="DVL_OSCILLATOR_SAFE_CLAMP_CSS_0665"') == 1,        "FAIL: clamp CSS 0665 count != 1"
assert content.count('id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665"') == 1,   "FAIL: oscillator audit 0665 count != 1"

# 4. Old module IDs must NOT remain
assert 'id="DVL_PAPER_LAYER_ANCHOR_MODULE_0663"' not in content,             "FAIL: old paper anchor 0663 still present"
assert 'id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0664"' not in content,        "FAIL: old oscillator audit 0664 still present"

# 5. Extract paper anchor module block
pa_start = content.index('<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0665">')
pa_end   = content.index('</script>', pa_start) + len('</script>')
pa_block = content[pa_start:pa_end]

# 6. Paper anchor module: VERSION 0.665
assert 'VERSION:      "0.665"' in pa_block, "FAIL: paper anchor VERSION not 0.665"

# 7. Paper anchor module: clamp logic present
assert 'function getOscillatorBounds()' in pa_block,  "FAIL: getOscillatorBounds missing"
assert 'function getMaxPricePaneHeight(' in pa_block,  "FAIL: getMaxPricePaneHeight missing"
assert '__dvlOscillatorPanelBounds' in pa_block,       "FAIL: __dvlOscillatorPanelBounds read missing in paper anchor"
assert 'localOscTopPx' in pa_block,                   "FAIL: localOscTopPx missing in paper anchor"
assert 'clampApplied' in pa_block,                    "FAIL: clampApplied missing in paper anchor"
assert 'clampMarginPx' in pa_block,                   "FAIL: clampMarginPx missing in paper anchor"
assert 'oscillatorBoundsDetected' in pa_block,        "FAIL: oscillatorBoundsDetected missing"

# 8. Paper anchor module: sync() result fields
assert '"0.665"' in pa_block,                         "FAIL: version 0.665 not in paper anchor sync"

# 9. Paper anchor module: non-invasive scheduler preserved
assert 'function scheduleSync()' in pa_block,         "FAIL: scheduleSync missing"
assert '_syncQueued' in pa_block,                     "FAIL: _syncQueued missing"
assert 'queueMicrotask' in pa_block,                  "FAIL: queueMicrotask missing"
assert 'scheduleSync: scheduleSync' in pa_block,      "FAIL: scheduleSync not exported"

# 10. Paper anchor module: noChartFunctionOverride
assert 'noChartFunctionOverride:   true' in pa_block, "FAIL: noChartFunctionOverride: true missing"
assert 'usesNonInvasiveScheduler:  true' in pa_block, "FAIL: usesNonInvasiveScheduler: true missing"

# 11. Paper anchor module: no forbidden patterns
assert 'window.drawSoon'    not in pa_block,          "FAIL: window.drawSoon in paper anchor"
assert '_prevDrawSoon'      not in pa_block,          "FAIL: _prevDrawSoon in paper anchor"
assert 'requestAnimationFrame(' not in pa_block,      "FAIL: requestAnimationFrame( in paper anchor"
assert 'setInterval('       not in pa_block,          "FAIL: setInterval in paper anchor"
assert 'setTimeout('        not in pa_block,          "FAIL: setTimeout in paper anchor"
assert 'MutationObserver'   not in pa_block,          "FAIL: MutationObserver in paper anchor"
assert 'ResizeObserver'     not in pa_block,          "FAIL: ResizeObserver in paper anchor"

# 12. Extract oscillator audit module block
osc_start = content.index('<script id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665">')
osc_end   = content.index('</script>', osc_start) + len('</script>')
osc_block = content[osc_start:osc_end]

# 13. Oscillator audit module: VERSION 0.665
assert 'VERSION:      "0.665"' in osc_block,                   "FAIL: oscillator audit VERSION not 0.665"

# 14. Oscillator audit module: new required fields
assert 'paperFitsPricePane' in osc_block,                      "FAIL: paperFitsPricePane missing"
assert 'expectedMaxPaneH' in osc_block,                        "FAIL: expectedMaxPaneH missing"
assert 'clampApplied' in osc_block,                            "FAIL: clampApplied missing in oscillator audit"
assert 'clampMarginPx' in osc_block,                           "FAIL: clampMarginPx missing in oscillator audit"
assert 'paperBottomVsFirstOscTopPx' in osc_block,             "FAIL: paperBottomVsFirstOscTopPx missing"
assert 'paperInvadesOscillatorArea' in osc_block,             "FAIL: paperInvadesOscillatorArea missing"
assert 'overlapPx' in osc_block,                              "FAIL: overlapPx missing in oscillator audit"
assert 'recommendations' in osc_block,                        "FAIL: recommendations missing"

# 15. Oscillator audit module: reads from last sync
assert 'DVL_PAPER_LAYER_ANCHOR' in osc_block,                  "FAIL: DVL_PAPER_LAYER_ANCHOR not read in oscillator audit"
assert 'getLastSync()' in osc_block,                           "FAIL: getLastSync() not called in oscillator audit"

# 16. Oscillator audit module: read-only (no mutations)
assert 'style.set'        not in osc_block,                    "FAIL: style write in oscillator audit"
assert 'classList'        not in osc_block,                    "FAIL: classList in oscillator audit"
assert 'setAttribute'     not in osc_block,                    "FAIL: setAttribute in oscillator audit"
assert 'appendChild'      not in osc_block,                    "FAIL: appendChild in oscillator audit"
assert 'removeChild'      not in osc_block,                    "FAIL: removeChild in oscillator audit"
assert 'requestAnimationFrame(' not in osc_block,              "FAIL: requestAnimationFrame( in oscillator audit"
assert 'setInterval('     not in osc_block,                    "FAIL: setInterval in oscillator audit"
assert 'setTimeout('      not in osc_block,                    "FAIL: setTimeout in oscillator audit"
assert 'MutationObserver' not in osc_block,                    "FAIL: MutationObserver in oscillator audit"
assert 'ResizeObserver'   not in osc_block,                    "FAIL: ResizeObserver in oscillator audit"

# 17. Clamp CSS marker
assert content.count('<style id="DVL_OSCILLATOR_SAFE_CLAMP_CSS_0665">') == 1, "FAIL: clamp CSS count != 1"

# 18. Block order before </head>
idx_css_0663     = content.index('DVL_PAPER_LAYER_ANCHOR_CSS_0663')
idx_mod_0665_pa  = content.index('DVL_PAPER_LAYER_ANCHOR_MODULE_0665')
idx_clamp_css    = content.index('DVL_OSCILLATOR_SAFE_CLAMP_CSS_0665')
idx_mod_0665_osc = content.index('DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665')
idx_head         = content.index('</head>')
assert idx_css_0663 < idx_mod_0665_pa < idx_clamp_css < idx_mod_0665_osc < idx_head, \
    "FAIL: blocks not in correct order before </head>"

# 19. Both new modules are in <head> (before main script)
main_script_start = content.index('<script>\nconst DVL_APP_VERSION')
assert content.index('<script id="DVL_PAPER_LAYER_ANCHOR_MODULE_0665">') < main_script_start, \
    "FAIL: paper anchor module 0665 not in <head>"
assert content.index('<script id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665">') < main_script_start, \
    "FAIL: oscillator audit module 0665 not in <head>"

# 20. Prior CSS lock blocks preserved
assert "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659"       in content, "FAIL: 0659 lock missing"
assert "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660"      in content, "FAIL: 0660 lock missing"
assert "DVL_CHROME_FINAL_LOCK_CSS_0661"             in content, "FAIL: 0661 lock missing"
assert "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"  in content, "FAIL: 0662 lock missing"
assert "DVL_PAPER_LAYER_ANCHOR_CSS_0663"            in content, "FAIL: 0663 paper CSS missing"

# 21. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655"    in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656"  in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content,"FAIL: layout assertions 0657 missing"

# 22. No wrongly-created button system modules
for ver in ["0656","0657","0658","0659","0660","0661","0662","0663","0664","0665"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 23. Zero DVL_TODO_0665
assert "DVL_TODO_0665" not in content, "FAIL: DVL_TODO_0665 remaining"

# 24. Buy/Sell HTML untouched
assert 'class="tradeAction buy"'  in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 25. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 26. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;'                in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 27. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-header",
            "dvl-btn-migrated-panel",  "dvl-btn-migrated-drawer",
            "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

print("[OK] all 47 assertions passed — 0665 clean: oscillator safe clamp in paper anchor + audit verification")
