(function(){
  "use strict";

  function chartModel(){
    return window.DVL_CHART_MODEL || null;
  }

  function build(){
    var model = chartModel();
    var cs = null;
    try{ cs = model && model.buildCoordinateSystem ? model.buildCoordinateSystem() : null; }catch(_){}
    if(!cs) return null;

    var candleCount = cs.candles ? cs.candles.length : 0;
    var range = cs.range || {};
    var start = Number(range.start);
    var end = Number(range.end);
    if(!Number.isFinite(start)) start = 0;
    if(!Number.isFinite(end)) end = Math.max(1, candleCount);
    var span = Math.max(0.35, end - start);

    var step = 1;
    try{
      step = Math.abs(cs.indexToX(1) - cs.indexToX(0)) || Math.max(1, cs.cw / span);
    }catch(_){
      step = Math.max(1, (cs.right - cs.left) / span);
    }

    var firstVisible = Math.max(0, Math.floor(start));
    var lastVisible = Math.min(Math.max(0, candleCount - 1), Math.ceil(end));
    var futureBars = Math.max(0, end - Math.max(0, candleCount - 1));

    return {
      version:"0.941",
      cs:cs,
      candleCount:candleCount,
      start:start,
      end:end,
      span:span,
      firstVisible:firstVisible,
      lastVisible:lastVisible,
      futureBars:futureBars,
      step:step,
      barSpacing:step,
      plotLeft:cs.left,
      plotRight:cs.right,
      plotWidth:Math.max(1, cs.right - cs.left),

      indexToX:function(index){
        return cs.indexToX(Number(index));
      },

      xToIndex:function(x){
        return cs.xToIndex(Number(x));
      },

      clampIndex:function(index, allowFuture){
        index = Number(index);
        if(!Number.isFinite(index)) index = 0;
        var max = allowFuture ? Math.max(index, candleCount - 1) : candleCount - 1;
        return Math.max(0, Math.min(index, max));
      },

      isIndexVisible:function(index){
        index = Number(index);
        return Number.isFinite(index) && index >= start && index <= end;
      },

      isXInPlot:function(x){
        x = Number(x);
        return Number.isFinite(x) && x >= cs.left && x <= cs.right;
      },

      nearestIndexFromX:function(x, opts){
        opts = opts || {};
        var raw = cs.xToIndex(Number(x));
        var rounded = Math.round(raw);
        var clamped = opts.allowFuture ? Math.max(0, rounded) : Math.max(0, Math.min(rounded, candleCount - 1));
        return {
          raw:raw,
          index:clamped,
          x:cs.indexToX(clamped),
          distanceX:Math.abs(Number(x) - cs.indexToX(clamped))
        };
      }
    };
  }

  function audit(){
    var vp = build();
    return {
      version:"0.941",
      viewportAvailable:!!vp,
      candleCount:vp ? vp.candleCount : 0,
      span:vp ? vp.span : 0,
      barSpacing:vp ? vp.barSpacing : 0,
      hasIndexToX:!!(vp && typeof vp.indexToX === "function"),
      hasXToIndex:!!(vp && typeof vp.xToIndex === "function"),
      hasFutureBars:!!(vp && Number.isFinite(Number(vp.futureBars))),
      pass:!!(vp && typeof vp.indexToX === "function" && typeof vp.xToIndex === "function" && Number.isFinite(Number(vp.barSpacing)))
    };
  }

  window.DVL_VIEWPORT_MODEL = {
    version:"0.941",
    build:build,
    audit:audit
  };
  window.DVL_VIEWPORT_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var vp = audit();
    base.viewportModel = vp;
    base.viewportModelAvailable = !!vp.pass;
    base.pass = !!(base.pass !== false && vp.pass);
    return base;
  };
})();
