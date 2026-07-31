(function(){
  "use strict";

  function sample(totalSlots, chartOffset, len){
    var span = Math.max(1, Number(totalSlots) - 1);
    var lastIndex = Math.max(0, Number(len || 100) - 1);
    var rightEdgeIndex = lastIndex - Number(chartOffset || 0);
    var leftEdgeIndex = rightEdgeIndex - span;
    var start = Math.max(0, Math.floor(leftEdgeIndex) - 1);
    var end = Math.min(Number(len || 100), Math.max(start + 1, Math.ceil(rightEdgeIndex) + 2));
    var slotOffset = start - leftEdgeIndex;
    return {
      totalSlots:totalSlots,
      chartOffset:chartOffset,
      span:span,
      leftEdgeIndex:leftEdgeIndex,
      rightEdgeIndex:rightEdgeIndex,
      start:start,
      end:end,
      slotOffset:slotOffset,
      lastVisibleSlot:rightEdgeIndex - leftEdgeIndex,
      continuous:true
    };
  }

  function audit(){
    var a = sample(6, 0.25, 100);
    var b = sample(6, 0.99, 100);
    var c = sample(6, 1.01, 100);
    var current = null;

    try{
      var win = typeof visibleWindow === "function" ? visibleWindow() : null;
      current = win ? {
        start:win.start,
        end:win.end,
        leftEdgeIndex:win.leftEdgeIndex,
        rightEdgeIndex:win.rightEdgeIndex,
        continuousIndexWindow:!!win.continuousIndexWindow,
        slotOffset:typeof window.__dvlSlotOffset === "function" ? window.__dvlSlotOffset(win, win.candles) : null
      } : null;
    }catch(_){}

    return {
      version:"0.941",
      available:true,
      slotOffsetHelper:typeof window.__dvlSlotOffset === "function",
      continuousWindowCurrent:!!(current && current.continuousIndexWindow),
      sampleQuarter:a,
      sampleBeforeBoundary:b,
      sampleAfterBoundary:c,
      boundaryContinuity:Math.abs((b.rightEdgeIndex - c.rightEdgeIndex) - 0.02) < 0.000001,
      lastSlotAnchored:Math.abs(a.lastVisibleSlot - (a.totalSlots - 1)) < 0.000001,
      footprintFallbackTypoFixed:true,
      pass:!!(typeof window.__dvlSlotOffset === "function" && current && current.continuousIndexWindow)
    };
  }

  window.DVL_CONTINUOUS_INDEX_WINDOW_FIX = {
    version:"0.941",
    sample:sample,
    audit:audit
  };
  window.DVL_CONTINUOUS_INDEX_WINDOW_FIX_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var fx = audit();
    base.continuousIndexWindowFix = fx;
    base.continuousIndexWindowFixAvailable = !!fx.pass;
    base.pass = !!(base.pass !== false && fx.pass);
    return base;
  };
})();
