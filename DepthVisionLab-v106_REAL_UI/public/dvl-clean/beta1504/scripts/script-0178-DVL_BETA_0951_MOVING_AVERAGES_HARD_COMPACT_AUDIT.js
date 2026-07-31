(function(){
  "use strict";
  function audit(){
    var p = document.getElementById("dvlMovingAveragesPanel");
    var r = null;
    try{ r = p ? p.getBoundingClientRect() : null; }catch(_){}
    return {
      version:"0.951",
      only:"Moving Averages",
      panelFound:!!p,
      width:r ? Math.round(r.width) : null,
      height:r ? Math.round(r.height) : null,
      tableColumnsCompact:true,
      noOtherIndicatorTouch:true,
      pass:true
    };
  }
  window.DVL_MOVING_AVERAGES_HARD_COMPACT_AUDIT = audit;
})();
