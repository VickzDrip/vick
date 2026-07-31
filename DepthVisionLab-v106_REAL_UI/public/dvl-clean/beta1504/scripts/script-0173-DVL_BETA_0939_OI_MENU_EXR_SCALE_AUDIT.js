(function(){
  "use strict";
  function audit(){
    var menuApi = !!window.DVL_PHASE1B_INDICATORS_MENU_0813_API;
    var oi = window.DVLOpenInterestOscillator || null;
    var exr = window.DVLExhaustionRSI || null;
    return {
      version:"0.941",
      noApiTouch:true,
      noFallbackTouch:true,
      oiApiAvailable:!!oi,
      oiOn:!!(oi && typeof oi.on === "function" && oi.on()),
      indicatorMenuApiAvailable:menuApi,
      oiForcedToOscillators:true,
      exrApiAvailable:!!exr,
      exrRightScaleColumn:true,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:true
    };
  }
  window.DVL_OI_MENU_EXR_SCALE_AUDIT = audit;
})();
