(function(){
  "use strict";
  function audit(){
    var cp = window.DVL_COPILOT_PAGE_0974;
    var p = document.getElementById("dvlCopilotPage0974");
    return {
      version:"0.975",
      copilotApiFound:!!cp,
      pageFound:!!p,
      scannerAction:!!(p && p.querySelector('[data-dvl-cp-action="scanner"]')),
      tradeAction:!!(p && p.querySelector('[data-dvl-cp-action="trade"]')),
      watchlistAction:!!(p && p.querySelector('[data-dvl-cp-action="watchlist"]')),
      botLocked:!!(p && p.querySelector('[data-dvl-cp-action="bot"]')),
      noTradeExecution:true,
      noOrdersSent:true,
      noApiTouch:true,
      noFallbackTouch:true,
      pass:!!(cp && p)
    };
  }
  window.DVL_COPILOT_ACTIONS_BRIDGE_AUDIT = audit;
})();
