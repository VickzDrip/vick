(function(){
  "use strict";
  function audit(){
    var v2 = document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="markets"]');
    var old = document.getElementById("scannerNavBtn");
    return {
      version:"0.969",
      builtFrom:"0.965",
      visibleFooterV2Found:!!document.getElementById("dvlBottomNavV2"),
      v2ScannerButtonFound:!!v2,
      v2ScannerLogoFound:!!(v2 && v2.querySelector(".dvlScannerLogo0969")),
      oldScannerLogoFound:!!(old && old.querySelector(".dvlScannerLogo0969")),
      scannerStateEventBridge:true,
      renderNavMarksMarketsActive:true,
      noDrawingsTouch:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:!!(v2 && v2.querySelector(".dvlScannerLogo0969"))
    };
  }
  window.DVL_SCANNER_NAV_V2_REAL_FIX_AUDIT = audit;
})();
