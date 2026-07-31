(function(){
"use strict";

var _lastPublish = null;

var SUB_KEYS = ["teste", "teste2", "openInterest", "longShort"];

function publish(){
  var canvas     = document.getElementById("chart");
  var canvasWrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  var bounds     = window.__dvlOscillatorPanelBounds || {};

  var canvasRect = canvas ? canvas.getBoundingClientRect() : null;
  var scaleY     = (canvas && canvasRect && canvas.height > 0)
                   ? (canvasRect.height / canvas.height)
                   : 1;

  var list = [];
  var i, key, entry;

  for(i = 0; i < SUB_KEYS.length; i++){
    key   = SUB_KEYS[i];
    entry = bounds[key];
    if(entry && typeof entry.top === "number" && typeof entry.h === "number"){
      list.push({
        key:    key,
        top:    entry.top,
        bottom: entry.top + entry.h,
        height: entry.h
      });
    }
  }

  list.sort(function(a, b){ return a.top - b.top; });

  var count  = list.length;
  var result;
  var now    = Date.now();

  if(count > 0 && canvasRect){
    var firstTop    = list[0].top;
    var lastBottom  = list[count - 1].bottom;
    var viewportTop = canvasRect.top + firstTop * scaleY;
    var viewportBot = canvasRect.top + lastBottom * scaleY;
    var heightPx    = viewportBot - viewportTop;

    bounds.top       = viewportTop;
    bounds.bottom    = viewportBot;
    bounds.height    = heightPx;
    bounds.count     = count;
    bounds.source    = "DVL_OSCILLATOR_BOUNDS_PUBLISHER_0666";
    bounds.updatedAt = now;

    window.__dvlOscillatorPanelBounds     = bounds;
    window.__dvlOscillatorPanelBoundsList = list;

    result = {
      count:     count,
      top:       viewportTop,
      bottom:    viewportBot,
      height:    heightPx,
      source:    "DVL_OSCILLATOR_BOUNDS_PUBLISHER_0666",
      updatedAt: now
    };
  } else {
    window.__dvlOscillatorPanelBoundsList = list;

    result = {
      count:     0,
      top:       null,
      bottom:    null,
      height:    null,
      source:    "DVL_OSCILLATOR_BOUNDS_PUBLISHER_0666",
      updatedAt: now
    };
  }

  _lastPublish = result;
  return result;
}

function audit(){
  return {
    version:      "0.666",
    boundsExists: !!(window.__dvlOscillatorPanelBounds &&
                     typeof window.__dvlOscillatorPanelBounds.top === "number"),
    boundsList:   window.__dvlOscillatorPanelBoundsList || [],
    lastPublish:  _lastPublish
  };
}

function getLastPublish(){
  return _lastPublish;
}

window.DVL_OSCILLATOR_BOUNDS_PUBLISHER = {
  VERSION:        "0.666",
  publish:        publish,
  audit:          audit,
  getLastPublish: getLastPublish
};

})();
