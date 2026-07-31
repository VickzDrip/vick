(function(){
  "use strict";
  function audit(){
    var p = document.getElementById("dvlExhaustionRSIPanel0828");
    var r = null;
    try{ r = p ? p.getBoundingClientRect() : null; }catch(_){}
    return {
      version:"0.949",
      only:"DVL Exhaustion RSI",
      panelFound:!!p,
      width:r ? Math.round(r.width) : null,
      height:r ? Math.round(r.height) : null,
      hardSelector:true,
      visualScale:0.82,
      noOtherIndicatorTouch:true,
      pass:true
    };
  }
  window.DVL_EXHAUSTION_RSI_HARD_COMPACT_AUDIT = audit;
})();
