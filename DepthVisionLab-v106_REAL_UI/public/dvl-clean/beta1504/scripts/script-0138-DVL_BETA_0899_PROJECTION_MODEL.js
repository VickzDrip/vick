(function(){
  "use strict";

  function build(){
    var vp = null;
    try{ vp = window.DVL_VIEWPORT_MODEL && window.DVL_VIEWPORT_MODEL.build ? window.DVL_VIEWPORT_MODEL.build() : null; }catch(_){}

    var chart = window.DVL_CHART_MODEL || null;
    var cs = vp && vp.cs ? vp.cs : null;
    try{ if(!cs && chart && chart.buildCoordinateSystem) cs = chart.buildCoordinateSystem(); }catch(_){}

    if(!cs) return null;

    var priceModel = cs.priceModel || null;
    if(!priceModel){
      try{
        if(window.DVL_PRICE_SCALE_MODEL && window.DVL_PRICE_SCALE_MODEL.build){
          priceModel = window.DVL_PRICE_SCALE_MODEL.build(cs.visibleCandles || cs.candles || [], cs.H, cs.bounds || {});
        }
      }catch(_){}
    }

    function indexToX(index){
      if(vp && typeof vp.indexToX === "function") return vp.indexToX(index);
      return cs.indexToX(Number(index));
    }

    function xToIndex(x){
      if(vp && typeof vp.xToIndex === "function") return vp.xToIndex(x);
      return cs.xToIndex(Number(x));
    }

    function priceToY(price){
      if(priceModel && typeof priceModel.priceToY === "function") return priceModel.priceToY(price);
      return cs.priceToY(Number(price));
    }

    function yToPrice(y){
      if(priceModel && typeof priceModel.yToPrice === "function") return priceModel.yToPrice(y);
      return cs.yToPrice(Number(y));
    }

    function clampLocal(x, y){
      x = Number(x);
      y = Number(y);
      return {
        x:Math.max(cs.left, Math.min(cs.right, x)),
        y:Math.max(cs.top, Math.min(cs.bottom, y))
      };
    }

    function pointToScreen(point){
      if(!point) return null;
      var idx = null;
      if(point.index != null || point.idx != null) idx = Number(point.index ?? point.idx);
      else if(point.time != null && typeof cs.timeToIndex === "function") idx = cs.timeToIndex(point.time);
      if(!Number.isFinite(idx)) idx = 0;
      var price = Number(point.price);
      return {
        x:indexToX(idx),
        y:priceToY(price),
        index:idx,
        idx:idx,
        time:point.time || (typeof cs.indexToTime === "function" ? cs.indexToTime(idx) : 0),
        price:price
      };
    }

    function localToPoint(x, y, opts){
      opts = opts || {};
      var p = opts.clamp === false ? { x:Number(x), y:Number(y) } : clampLocal(x, y);
      var idx = xToIndex(p.x);
      var price = yToPrice(p.y);
      var rounded = Math.max(0, Math.min(Math.round(idx), (cs.candles ? cs.candles.length : 1) - 1));
      var candle = cs.candles && cs.candles[rounded] ? cs.candles[rounded] : null;
      return {
        x:p.x,
        y:p.y,
        index:idx,
        idx:idx,
        price:price,
        time:candle ? (candle.time || candle.t || 0) : 0
      };
    }

    function deltaFromLocal(ax, ay, bx, by){
      var a = localToPoint(ax, ay, { clamp:true });
      var b = localToPoint(bx, by, { clamp:true });
      return {
        di:Number(b.index) - Number(a.index),
        dp:Number(b.price) - Number(a.price),
        a:a,
        b:b
      };
    }

    return {
      version:"0.941",
      source:"viewport-price-projection",
      cs:cs,
      viewport:vp,
      priceModel:priceModel,
      indexToX:indexToX,
      xToIndex:xToIndex,
      priceToY:priceToY,
      yToPrice:yToPrice,
      pointToScreen:pointToScreen,
      localToPoint:localToPoint,
      deltaFromLocal:deltaFromLocal
    };
  }

  function audit(){
    var out = {
      version:"0.941",
      available:true,
      canBuild:false,
      hasViewport:false,
      hasPriceScale:false,
      hasPointToScreen:false,
      hasLocalToPoint:false,
      hasDelta:false,
      pass:false
    };
    try{
      var p = build();
      out.canBuild = !!p;
      out.hasViewport = !!(p && p.viewport);
      out.hasPriceScale = !!(p && p.priceModel);
      out.hasPointToScreen = !!(p && typeof p.pointToScreen === "function");
      out.hasLocalToPoint = !!(p && typeof p.localToPoint === "function");
      out.hasDelta = !!(p && typeof p.deltaFromLocal === "function");
      out.pass = !!(out.canBuild && out.hasPointToScreen && out.hasLocalToPoint && out.hasDelta);
    }catch(e){
      out.error = String(e && e.message || e);
    }
    return out;
  }

  window.DVL_PROJECTION_MODEL = {
    version:"0.941",
    build:build,
    audit:audit
  };
  window.DVL_PROJECTION_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var pr = audit();
    base.projectionModel = pr;
    base.projectionModelAvailable = !!pr.pass;
    base.pass = !!(base.pass !== false && pr.pass);
    return base;
  };
})();
