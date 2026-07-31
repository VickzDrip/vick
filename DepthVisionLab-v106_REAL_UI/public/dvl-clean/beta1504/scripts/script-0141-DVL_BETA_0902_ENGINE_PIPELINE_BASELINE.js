(function(){
  "use strict";

  window.DVL_ENGINE_PIPELINE_BASELINE = {
    version:"0.941",
    approvedFrom:"0.901",
    locked:true,
    requiredModels:[
      "DVL_CHART_MODEL",
      "DVL_VIEWPORT_MODEL",
      "DVL_BAR_METRICS_MODEL",
      "DVL_PRICE_SCALE_MODEL",
      "DVL_PROJECTION_MODEL",
      "DVL_TOOL_POINT_MODEL"
    ],
    requiredRules:{
      drawingsSnap:true,
      longShortSnap:false,
      editLockFrom:"0.894",
      pipelineFrom:"0.901"
    },
    note:"0.901 aprovado pelo teste real; próximas etapas devem preservar pipeline/modelos, edit lock e Long/Short sem imã."
  };

  function baselineAudit(){
    var out = {
      version:"0.941",
      approvedFrom:"0.901",
      chartModel:!!window.DVL_CHART_MODEL,
      viewportModel:!!window.DVL_VIEWPORT_MODEL,
      barMetricsModel:!!window.DVL_BAR_METRICS_MODEL,
      priceScaleModel:!!window.DVL_PRICE_SCALE_MODEL,
      projectionModel:!!window.DVL_PROJECTION_MODEL,
      toolPointModel:!!window.DVL_TOOL_POINT_MODEL,
      engineAudit:!!window.DVL_ENGINE_PIPELINE_AUDIT,
      engineReady:false,
      longShortSnapDisabled:false,
      drawingsSnapEnabled:false,
      editLockBaseline:!!window.DVL_DRAWING_EDIT_LOCK_BASELINE,
      pass:false
    };

    try{
      out.engineReady = typeof window.DVL_ENGINE_PIPELINE_READY === "function" ? !!window.DVL_ENGINE_PIPELINE_READY() : false;
    }catch(_){}

    try{
      var tpm = window.DVL_TOOL_POINT_MODEL;
      out.longShortSnapDisabled = !!(tpm && tpm.shouldSnap && tpm.shouldSnap("long", true) === false && tpm.shouldSnap("short", true) === false);
      out.drawingsSnapEnabled = !!(tpm && tpm.shouldSnap && tpm.shouldSnap("arrow", true) === true && tpm.shouldSnap("trendline", true) === true && tpm.shouldSnap("rectangle", true) === true && tpm.shouldSnap("text", true) === true);
    }catch(_){}

    out.pass = !!(
      out.chartModel &&
      out.viewportModel &&
      out.barMetricsModel &&
      out.priceScaleModel &&
      out.projectionModel &&
      out.toolPointModel &&
      out.engineAudit &&
      out.longShortSnapDisabled &&
      out.drawingsSnapEnabled
    );

    return out;
  }

  window.DVL_ENGINE_PIPELINE_BASELINE_AUDIT = baselineAudit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var locked = baselineAudit();
    base.enginePipelineBaseline = locked;
    base.enginePipelineBaselineLocked = !!locked.pass;
    base.pass = !!(base.pass !== false && locked.pass);
    return base;
  };
})();
