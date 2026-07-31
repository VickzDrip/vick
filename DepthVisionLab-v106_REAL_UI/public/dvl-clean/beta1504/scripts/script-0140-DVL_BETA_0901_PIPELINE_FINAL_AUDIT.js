(function(){
  "use strict";

  function safeCall(fn){
    try{ return typeof fn === "function" ? fn() : null; }catch(e){ return { pass:false, error:String(e && e.message || e) }; }
  }

  function hasFn(obj, name){
    return !!(obj && typeof obj[name] === "function");
  }

  function audit(){
    var chart = window.DVL_CHART_MODEL || null;
    var viewport = window.DVL_VIEWPORT_MODEL || null;
    var bars = window.DVL_BAR_METRICS_MODEL || null;
    var price = window.DVL_PRICE_SCALE_MODEL || null;
    var projection = window.DVL_PROJECTION_MODEL || null;
    var toolPoint = window.DVL_TOOL_POINT_MODEL || null;
    var magnet = window.DVL_TOOL_MAGNET || null;

    var chartAudit = safeCall(window.DVL_CHART_MODEL_AUDIT);
    var viewportAudit = safeCall(window.DVL_VIEWPORT_MODEL_AUDIT);
    var barAudit = safeCall(window.DVL_BAR_METRICS_MODEL_AUDIT);
    var priceAudit = safeCall(window.DVL_PRICE_SCALE_MODEL_AUDIT);
    var projectionAudit = safeCall(window.DVL_PROJECTION_MODEL_AUDIT);
    var toolAudit = safeCall(window.DVL_TOOL_POINT_MODEL_AUDIT);

    var pipelineAudit = null;
    try{
      if(window.DVL_TOOL_PIPELINE_AUDIT && window.DVL_TOOL_PIPELINE_AUDIT !== audit){
        pipelineAudit = window.DVL_TOOL_PIPELINE_AUDIT();
      }
    }catch(e){
      pipelineAudit = { pass:false, error:String(e && e.message || e) };
    }

    var cs = null, vp = null, pr = null, bm = null, pm = null;
    try{ cs = chart && chart.buildCoordinateSystem ? chart.buildCoordinateSystem() : null; }catch(_){}
    try{ vp = viewport && viewport.build ? viewport.build() : null; }catch(_){}
    try{ pr = projection && projection.build ? projection.build() : null; }catch(_){}
    try{ bm = bars && bars.get ? bars.get(cs) : null; }catch(_){}
    try{ pm = cs && cs.priceModel ? cs.priceModel : null; }catch(_){}

    var out = {
      version:"0.941",
      title:"DVL Engine Pipeline Final Audit",

      chartModel:{
        available:!!chart,
        coordinateSystem:!!cs,
        renderCandles:hasFn(chart,"getRenderCandles"),
        renderSnapLevels:hasFn(chart,"renderSnapLevels"),
        snapToCandle:hasFn(chart,"snapToCandle"),
        audit:chartAudit
      },

      viewportModel:{
        available:!!viewport,
        build:!!vp,
        indexToX:!!(vp && typeof vp.indexToX === "function"),
        xToIndex:!!(vp && typeof vp.xToIndex === "function"),
        barSpacing:vp ? Number(vp.barSpacing) : null,
        audit:viewportAudit
      },

      barMetricsModel:{
        available:!!bars,
        build:!!bm,
        step:bm ? Number(bm.step) : null,
        bodyW:bm ? Number(bm.bodyW) : null,
        hitW:bm ? Number(bm.hitW) : null,
        audit:barAudit
      },

      priceScaleModel:{
        available:!!price,
        build:!!pm,
        priceToY:!!(pm && typeof pm.priceToY === "function"),
        yToPrice:!!(pm && typeof pm.yToPrice === "function"),
        lo:pm ? Number(pm.lo) : null,
        hi:pm ? Number(pm.hi) : null,
        audit:priceAudit
      },

      projectionModel:{
        available:!!projection,
        build:!!pr,
        pointToScreen:!!(pr && typeof pr.pointToScreen === "function"),
        localToPoint:!!(pr && typeof pr.localToPoint === "function"),
        deltaFromLocal:!!(pr && typeof pr.deltaFromLocal === "function"),
        audit:projectionAudit
      },

      toolPointModel:{
        available:!!toolPoint,
        pointFromLocal:hasFn(toolPoint,"pointFromLocal"),
        pointFromClient:hasFn(toolPoint,"pointFromClient"),
        pointFromCross:hasFn(toolPoint,"pointFromCross"),
        toScreen:hasFn(toolPoint,"toScreen"),
        longShortSnapDisabled:!!(toolPoint && toolPoint.shouldSnap && toolPoint.shouldSnap("long", true) === false && toolPoint.shouldSnap("short", true) === false),
        drawingsSnapEnabled:!!(toolPoint && toolPoint.shouldSnap && toolPoint.shouldSnap("arrow", true) === true && toolPoint.shouldSnap("trendline", true) === true && toolPoint.shouldSnap("rectangle", true) === true && toolPoint.shouldSnap("text", true) === true),
        audit:toolAudit
      },

      magnet:{
        available:!!magnet,
        snapPoint:!!(magnet && typeof magnet.snapPoint === "function"),
        snapChartPoint:!!(magnet && typeof magnet.snapChartPoint === "function"),
        snapRulerPoint:!!(magnet && typeof magnet.snapRulerPoint === "function")
      },

      bridges:{
        cursorModelBridge:!!(chartAudit && chartAudit.cursorModelBridgeAvailable),
        dragModelBridge:!!(chartAudit && chartAudit.dragModelBridgeAvailable),
        renderSnapBridge:!!(chartAudit && chartAudit.renderSnapBridgeAvailable),
        projectionBridge:!!(toolAudit && toolAudit.projectionBridgeAvailable),
        editLockBaseline:!!(pipelineAudit && pipelineAudit.drawingEditLockBaseline && pipelineAudit.drawingEditLockBaseline.lockFound)
      },

      priorPipelineAudit:pipelineAudit
    };

    out.pass = !!(
      out.chartModel.available &&
      out.chartModel.coordinateSystem &&
      out.chartModel.renderCandles &&
      out.chartModel.renderSnapLevels &&
      out.viewportModel.available &&
      out.viewportModel.build &&
      out.barMetricsModel.available &&
      out.barMetricsModel.build &&
      out.priceScaleModel.available &&
      out.priceScaleModel.priceToY &&
      out.priceScaleModel.yToPrice &&
      out.projectionModel.available &&
      out.projectionModel.pointToScreen &&
      out.projectionModel.localToPoint &&
      out.projectionModel.deltaFromLocal &&
      out.toolPointModel.available &&
      out.toolPointModel.pointFromLocal &&
      out.toolPointModel.toScreen &&
      out.toolPointModel.longShortSnapDisabled &&
      out.toolPointModel.drawingsSnapEnabled &&
      out.magnet.available &&
      out.magnet.snapPoint
    );

    return out;
  }

  window.DVL_ENGINE_PIPELINE_AUDIT = audit;
  window.DVL_ENGINE_PIPELINE_READY = function(){
    var a = audit();
    return !!(a && a.pass);
  };

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var finalAudit = audit();
    base.enginePipelineFinal = finalAudit;
    base.enginePipelineReady = !!(finalAudit && finalAudit.pass);
    base.pass = !!(base.pass !== false && finalAudit && finalAudit.pass);
    return base;
  };
})();
