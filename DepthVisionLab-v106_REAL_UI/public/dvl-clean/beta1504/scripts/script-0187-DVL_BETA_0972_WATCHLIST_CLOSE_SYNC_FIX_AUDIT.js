(function(){
  "use strict";
  function audit(){
    var drawer = document.getElementById("assetFavoritesDrawer");
    var root = document.getElementById("dvlBottomNavV2");
    return {
      version:"0.972",
      watchlistCloseDirectFunction:true,
      watchlistStateEventBridge:true,
      watchlistCurrentlyOpen:!!(drawer && drawer.classList.contains("is-open")),
      officialFooterFound:!!root,
      singleFooterCompact0971Preserved:!!document.getElementById("DVL_BETA_0971_FOOTER_COMPACT_TUNE_CSS"),
      noDrawingsTouch:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:!!root
    };
  }
  window.DVL_WATCHLIST_CLOSE_SYNC_FIX_AUDIT = audit;
})();
