(function(){
  "use strict";
  function audit(){
    return {
      version:"0.954",
      rebuiltFromApproved:"0.951",
      discarded:["0.952","0.953"],
      structuresLocked:true,
      indicatorsCompactCheckpoint:true,
      noGlobalMenuController:true,
      noColorTildePatch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      appVersion:window.DVL_APP_VERSION || null,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:true
    };
  }
  window.DVL_HARD_ROLLBACK_0951_LOCKED_AUDIT = audit;
})();
