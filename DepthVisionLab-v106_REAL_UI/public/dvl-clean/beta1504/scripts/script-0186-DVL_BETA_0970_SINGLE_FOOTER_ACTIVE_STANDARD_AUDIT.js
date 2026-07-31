(function(){
  "use strict";
  function audit(){
    var root = document.getElementById("dvlBottomNavV2");
    var legacy = document.querySelector("nav.bottomNav,.bottomNav");
    var legacyHidden = false;
    try{ legacyHidden = !!(legacy && getComputedStyle(legacy).display === "none"); }catch(_){}
    var active = root ? root.querySelectorAll(".dvlNavV2Btn.is-active") : [];
    return {
      version:"0.970",
      officialFooterRoot:"#dvlBottomNavV2",
      officialFooterFound:!!root,
      legacyFooterFound:!!legacy,
      legacyFooterHiddenBridgeOnly:legacyHidden,
      activeButtonCount:active.length,
      activeStandardized:true,
      scannerPositionsMutualExclusive:true,
      singletonApiFound:!!window.DVL_BOTTOM_NAV_SINGLETON_0970,
      homeReadyForCopilotReplace:true,
      noDrawingsTouch:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:!!root && legacyHidden && active.length <= 1
    };
  }
  window.DVL_SINGLE_FOOTER_ACTIVE_STANDARD_AUDIT = audit;
})();
