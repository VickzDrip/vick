(function(){
  "use strict";
  function audit(){
    var p = document.getElementById("dvlCopilotPage0974");
    var table = p ? p.querySelector(".dvlCp0976ScannerTable") : null;
    return {
      version:"0.977",
      compactProportions:true,
      scannerNoAssetLogos:true,
      scannerLogoElementsHiddenOrRemoved:!table || !table.querySelector(".dvlCp0976MiniCoin"),
      scannerColumns:"#, Ativo, Spike Score, Há qt tempo, Status",
      fiveCandlesColumnRemovedFromMiniScanner:true,
      footerCompactPreserved:true,
      noTradeExecution:true,
      noOrdersSent:true,
      noDrawingsTouch:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      pass:!!p
    };
  }
  window.DVL_COPILOT_PRO_COMPACT_SCANNER_AUDIT = audit;
})();
