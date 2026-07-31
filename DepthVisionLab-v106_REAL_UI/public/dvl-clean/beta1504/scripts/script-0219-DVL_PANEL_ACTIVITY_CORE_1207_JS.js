(function(){
  "use strict";
  if(window.DVL_PANEL_ACTIVITY_1207) return;
  function classOpen(el){ return !!(el && (el.classList.contains("is-open") || el.classList.contains("open"))); }
  function copilotOpen(){
    if(document.hidden) return false;
    return classOpen(document.getElementById("dvlCopilotPage0974")) || document.body.classList.contains("dvlCopilotOpen0974");
  }
  function scannerOpen(){
    if(document.hidden) return false;
    return classOpen(document.getElementById("dvlScannerPanel0780")) || document.body.classList.contains("dvlScannerOpen080");
  }
  function anyAnalysisOpen(){ return copilotOpen() || scannerOpen(); }
  function state(){ return {copilot:copilotOpen(),scanner:scannerOpen(),any:anyAnalysisOpen(),hidden:document.hidden}; }
  function emit(){ try{ window.dispatchEvent(new CustomEvent("dvl:panel-activity-change",{detail:state()})); }catch(_){} }
  window.addEventListener("dvl:copilot-state-change",function(){ setTimeout(emit,0); },true);
  window.addEventListener("dvl:scanner-state-change",function(){ setTimeout(emit,0); },true);
  document.addEventListener("visibilitychange",emit,true);
  window.DVL_PANEL_ACTIVITY_1207={version:"1.207",copilotOpen:copilotOpen,scannerOpen:scannerOpen,anyAnalysisOpen:anyAnalysisOpen,state:state,emit:emit};
})();
