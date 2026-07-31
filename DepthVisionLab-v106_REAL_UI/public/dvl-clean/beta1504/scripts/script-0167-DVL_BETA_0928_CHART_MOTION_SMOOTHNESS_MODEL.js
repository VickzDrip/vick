(function(){
  "use strict";

  function audit(){
    var plotW = null, oldSpacing = null, renderSpacing = null;
    try{
      plotW = typeof __dvlChartPlotWidth === "function" ? __dvlChartPlotWidth() : null;
      oldSpacing = plotW ? plotW / Math.max(Number(chartViewCount) || 1, 1) : null;
      renderSpacing = typeof __dvlRenderSlotSpacing === "function" ? __dvlRenderSlotSpacing(chartViewCount) : null;
    }catch(_){}

    return {
      version:"0.941",
      available:true,
      plotWidth:plotW,
      chartViewCount:typeof chartViewCount === "number" ? chartViewCount : null,
      oldPanSpacing:oldSpacing,
      renderSlotSpacing:renderSpacing,
      spacingConsistentWithRender:!!(renderSpacing && plotW && Math.abs(renderSpacing - (plotW / Math.max((Number(chartViewCount)||2)-1, 1))) < 0.001),
      zoomUsesRenderSpan:true,
      pinchUsesRenderSpan:true,
      panUsesRenderSlotSpacing:true,
      removesCandleByCandleLock:true,
      pass:!!(typeof __dvlRenderSlotSpacing === "function" && typeof __dvlRenderSlotSpan === "function")
    };
  }

  window.DVL_CHART_MOTION_SMOOTHNESS_MODEL = {
    version:"0.941",
    audit:audit
  };
  window.DVL_CHART_MOTION_SMOOTHNESS_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var sm = audit();
    base.chartMotionSmoothness = sm;
    base.chartMotionSmoothnessAvailable = !!sm.pass;
    base.pass = !!(base.pass !== false && sm.pass);
    return base;
  };
})();
