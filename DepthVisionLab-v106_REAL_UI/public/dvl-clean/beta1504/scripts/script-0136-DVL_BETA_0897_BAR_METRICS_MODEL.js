(function(){
  "use strict";

  function fallbackStep(cs){
    if(!cs) return 1;
    try{
      var s = Math.abs(cs.indexToX(1) - cs.indexToX(0));
      if(Number.isFinite(s) && s > 0) return s;
    }catch(_){}
    try{
      var span = Math.max(0.35, Number(cs.span || (cs.range && cs.range.span) || 1));
      var w = Math.max(1, Number(cs.cw || ((cs.right || 1) - (cs.left || 0)) || 1));
      return Math.max(1, w / span);
    }catch(_){}
    return 1;
  }

  function get(cs){
    cs = cs || null;
    var vp = null;
    try{
      if(window.DVL_VIEWPORT_MODEL && typeof window.DVL_VIEWPORT_MODEL.build === "function") vp = window.DVL_VIEWPORT_MODEL.build();
    }catch(_){}

    var step = vp && Number.isFinite(Number(vp.barSpacing)) ? Number(vp.barSpacing) : fallbackStep(cs);
    var bodyW = Math.max(1, Math.min(18, step * 0.68));
    var hitW = Math.max(6, Math.min(36, step * 0.95));
    var wickW = step < 4 ? 1 : Math.max(1, Math.min(2, Math.round(step * 0.08)));

    return {
      version:"0.941",
      source:vp ? "viewport-model" : "coordinate-system",
      step:step,
      barSpacing:step,
      bodyW:bodyW,
      wickW:wickW,
      hitW:hitW,
      halfBodyW:bodyW / 2,
      halfHitW:hitW / 2
    };
  }

  function audit(){
    var cs = null;
    try{ cs = window.DVL_CHART_MODEL && window.DVL_CHART_MODEL.buildCoordinateSystem ? window.DVL_CHART_MODEL.buildCoordinateSystem() : null; }catch(_){}
    var bm = null;
    try{ bm = get(cs); }catch(_){}
    return {
      version:"0.941",
      barMetricsAvailable:!!bm,
      source:bm ? bm.source : null,
      step:bm ? bm.step : 0,
      bodyW:bm ? bm.bodyW : 0,
      hitW:bm ? bm.hitW : 0,
      wickW:bm ? bm.wickW : 0,
      pass:!!(bm && Number.isFinite(Number(bm.step)) && Number.isFinite(Number(bm.bodyW)) && Number.isFinite(Number(bm.hitW)))
    };
  }

  window.DVL_BAR_METRICS_MODEL = {
    version:"0.941",
    get:get,
    audit:audit
  };
  window.DVL_BAR_METRICS_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var bm = audit();
    base.barMetricsModel = bm;
    base.barMetricsModelAvailable = !!bm.pass;
    base.pass = !!(base.pass !== false && bm.pass);
    return base;
  };
})();
