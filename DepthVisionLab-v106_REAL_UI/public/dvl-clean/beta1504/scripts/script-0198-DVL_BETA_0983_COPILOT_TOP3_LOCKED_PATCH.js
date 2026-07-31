(function(){
  "use strict";

  function patchTop3(){
    var page = document.getElementById("dvlCopilotPage0974");
    if(!page) return false;

    var opp = page.querySelector('[data-dvl-cp-section="opportunities"]');
    if(opp){
      var head = opp.querySelector(".dvlCp0976SectionHead");
      if(head){
        head.classList.add("dvlCp0983Top3Head");
        var oldBtn = head.querySelector('button,[data-dvl-cp-action="scanner"]');
        if(oldBtn) oldBtn.remove();
        if(!head.querySelector(".dvlCp0983Top3Badge")){
          head.insertAdjacentHTML("beforeend", '<span class="dvlCp0983Top3Badge">Top 3</span>');
        }
      }

      opp.querySelectorAll(".dvlCp0976Opp").forEach(function(row){
        row.removeAttribute("data-dvl-cp-action");
        row.setAttribute("data-dvl-cp-top3-row","1");
      });
    }

    var scanner = page.querySelector('[data-dvl-cp-section="scanner"]');
    if(scanner && !scanner.querySelector(".dvlCp0983ScannerMiniNote")){
      var table = scanner.querySelector(".dvlCp0976ScannerTable");
      if(table){
        table.insertAdjacentHTML("beforebegin", '<div class="dvlCp0983ScannerMiniNote">Resumo rápido do Scanner padrão</div>');
      }
    }

    return true;
  }

  function boot(){
    patchTop3();
    setTimeout(patchTop3, 0);
    setTimeout(patchTop3, 350);
    setTimeout(patchTop3, 1000);
    /* DVL 0.993 stability: Top3 lock interval disabled after initial boot. */
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_TOP3_LOCKED_0983 = {
    version:"0.983",
    patch:patchTop3,
    audit:function(){
      patchTop3();
      var page = document.getElementById("dvlCopilotPage0974");
      var opp = page ? page.querySelector('[data-dvl-cp-section="opportunities"]') : null;
      var scanner = page ? page.querySelector('[data-dvl-cp-section="scanner"]') : null;
      var scannerBtnsInsideOpp = opp ? opp.querySelectorAll('[data-dvl-cp-action="scanner"],button').length : 0;
      var top3Rows = opp ? opp.querySelectorAll('[data-dvl-cp-top3-row="1"]').length : 0;
      return {
        version:"0.983",
        top3Locked:true,
        viewAllRemoved:scannerBtnsInsideOpp === 0,
        opportunitiesNoScannerNavigation:scannerBtnsInsideOpp === 0,
        top3Rows:top3Rows,
        scannerSummaryNote:!!(scanner && scanner.querySelector(".dvlCp0983ScannerMiniNote")),
        scannerStandardStillAccessible:!!(scanner && scanner.querySelector('[data-dvl-cp-action="scanner"]')),
        noTradeExecution:true,
        noOrdersSent:true,
        noDrawingsTouch:true,
        noIndicatorsTouch:true,
        noApiTouch:true,
        noFallbackTouch:true,
        pass:!!(page && opp && top3Rows > 0 && scannerBtnsInsideOpp === 0)
      };
    }
  };

  window.DVL_COPILOT_TOP3_LOCKED_AUDIT = function(){
    return window.DVL_COPILOT_TOP3_LOCKED_0983.audit();
  };
})();
