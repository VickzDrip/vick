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

  /* Beta 1.209 — avoid style mutations when the anchor geometry did not
     change. This also prevents observers/layout from waking up after every sync. */
  var anchorSig = [scaleW,Math.round(paneH*10)/10].join("|");
  if(layer.__dvlAnchorSig1209 !== anchorSig){
    layer.__dvlAnchorSig1209 = anchorSig;
    layer.style.setProperty("top",    "0",           "important");
    layer.style.setProperty("left",   "0",           "important");
    layer.style.setProperty("right",  scaleW + "px", "important");
    layer.style.setProperty("width",  "auto",        "important");
    layer.style.setProperty("height", paneH + "px",  "important");
    layer.style.setProperty("bottom", "auto",        "important");
  }

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
