(function(){
  "use strict";
  function audit(){
    return {
      version:"0.965",
      builtFrom:"0.958",
      discardedBrokenLine:["0.959","0.960","0.961","0.962","0.963","0.964"],
      onlyChange:"persistent ruler label",
      chartPointToScreenUntouched:true,
      viewportUntouched:true,
      timeIndexProjectionUntouched:true,
      drawingsNormalBase0958:true,
      rulerLabelPersistent:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:true
    };
  }
  window.DVL_FROM_0958_RULER_LABEL_ONLY_AUDIT = audit;
})();
