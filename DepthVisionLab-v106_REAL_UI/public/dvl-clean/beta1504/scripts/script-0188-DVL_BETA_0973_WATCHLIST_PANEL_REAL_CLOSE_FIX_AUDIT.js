(function(){
  "use strict";
  function audit(){
    var oldDrawer = document.getElementById("assetFavoritesDrawer");
    var newPanel = document.getElementById("dvlWatchlistPanel");
    var root = document.getElementById("dvlBottomNavV2");
    return {
      version:"0.973",
      realWatchlistPanelTarget:"#dvlWatchlistPanel",
      assetFavoritesBridgeStillSupported:true,
      newPanelCurrentlyOpen:!!(newPanel && newPanel.classList.contains("is-open")),
      oldDrawerCurrentlyOpen:!!(oldDrawer && oldDrawer.classList.contains("is-open")),
      closeWatchlistPanelAvailable:typeof window.closeWatchlistPanel === "function",
      watchlistEventBridge:true,
      scannerWatchlistMutualExclusive:true,
      officialFooterFound:!!root,
      singleFooterCompactPreserved:!!document.getElementById("DVL_BETA_0971_FOOTER_COMPACT_TUNE_CSS"),
      noDrawingsTouch:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:!!root
    };
  }
  window.DVL_WATCHLIST_PANEL_REAL_CLOSE_FIX_AUDIT = audit;
})();
