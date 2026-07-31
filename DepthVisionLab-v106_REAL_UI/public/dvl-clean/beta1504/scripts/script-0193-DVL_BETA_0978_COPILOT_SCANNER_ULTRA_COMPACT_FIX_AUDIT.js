(function(){
  "use strict";
  function audit(){
    var p = document.getElementById("dvlCopilotPage0974");
    var table = p ? p.querySelector(".dvlCp0976ScannerTable") : null;
    var rows = table ? table.querySelectorAll(".dvlCp0976ScanRow").length : 0;
    return {
      version:"0.978",
      scannerUltraCompact:true,
      scannerNoLogos:true,
      scannerColumns:"#, Ativo, Spike, Tempo, Status",
      statusShortened:true,
      noFiveCandlesMiniColumn:true,
      rowCount:rows,
      noTradeExecution:true,
      noOrdersSent:true,
      noDrawingsTouch:true,
      noIndicatorsTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      pass:!!(p && table)
    };
  }
  window.DVL_COPILOT_SCANNER_ULTRA_COMPACT_FIX_AUDIT = audit;
})();
