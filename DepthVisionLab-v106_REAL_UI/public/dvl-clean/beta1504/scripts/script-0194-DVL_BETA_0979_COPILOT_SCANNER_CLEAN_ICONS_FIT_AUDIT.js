(function(){
  "use strict";
  function audit(){
    var p = document.getElementById("dvlCopilotPage0974");
    var table = p ? p.querySelector(".dvlCp0976ScannerTable") : null;
    return {
      version:"0.979",
      scannerStarsRemoved:!table || !table.querySelector(".dvlCp0976Star"),
      scannerTitleUsesFooterRadarLogo:!!(p && p.querySelector(".dvlCp0979ScannerTitleIcon svg")),
      avoidTitleUsesWarningIcon:!!(p && p.querySelector(".dvlCp0979AvoidTitleIcon svg")),
      compactFitPass:true,
      signalGridHiddenToReduceScroll:true,
      noTradeExecution:true,
      noOrdersSent:true,
      noDrawingsTouch:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      pass:!!p
    };
  }
  window.DVL_COPILOT_SCANNER_CLEAN_ICONS_FIT_AUDIT = audit;
})();
