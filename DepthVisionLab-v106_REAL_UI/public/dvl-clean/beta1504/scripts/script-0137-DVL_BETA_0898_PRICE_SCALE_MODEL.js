(function(){
  "use strict";

  function build(candles, H, bounds){
    candles = Array.isArray(candles) ? candles : [];
    H = Number(H) || 1;
    bounds = bounds || {};

    var sc = null;
    try{
      sc = typeof scale === "function" ? scale(candles, H) : null;
    }catch(_){}

    if(!sc){
      sc = {
        lo:0,
        hi:1,
        y:function(){ return (Number(bounds.top)||0) + (Number(bounds.plotH)||H) / 2; }
      };
    }

    var top = Number(bounds.top);
    if(!Number.isFinite(top)) top = typeof PT === "number" ? PT : 0;
    var bottom = Number(bounds.bottom);
    if(!Number.isFinite(bottom)){
      var pb = typeof PB === "number" ? PB : 24;
      bottom = H - pb;
    }
    var plotH = Math.max(1, bottom - top);

    function priceToY(price){
      return sc.y(Number(price));
    }

    function yToPrice(y){
      return Number(sc.lo) + (1 - (Number(y) - top) / plotH) * (Number(sc.hi) - Number(sc.lo));
    }

    function clampPrice(price){
      price = Number(price);
      if(!Number.isFinite(price)) price = Number(sc.lo) || 0;
      return Math.max(Math.min(Number(sc.lo), Number(sc.hi)), Math.min(Math.max(Number(sc.lo), Number(sc.hi)), price));
    }

    return {
      version:"0.941",
      source:"legacy-scale-adapter",
      scale:sc,
      lo:Number(sc.lo),
      hi:Number(sc.hi),
      range:Math.max(1e-12, Number(sc.hi) - Number(sc.lo)),
      top:top,
      bottom:bottom,
      plotH:plotH,
      priceToY:priceToY,
      yToPrice:yToPrice,
      clampPrice:clampPrice
    };
  }

  function audit(){
    var out = {
      version:"0.941",
      available:true,
      canBuild:false,
      hasPriceToY:false,
      hasYToPrice:false,
      pass:false
    };
    try{
      var model = window.DVL_CHART_MODEL;
      var cs = model && model.buildCoordinateSystem ? model.buildCoordinateSystem() : null;
      var pm = cs && cs.priceModel ? cs.priceModel : null;
      out.canBuild = !!pm;
      out.hasPriceToY = !!(pm && typeof pm.priceToY === "function");
      out.hasYToPrice = !!(pm && typeof pm.yToPrice === "function");
      out.lo = pm ? pm.lo : null;
      out.hi = pm ? pm.hi : null;
      out.pass = !!(out.canBuild && out.hasPriceToY && out.hasYToPrice);
    }catch(e){
      out.error = String(e && e.message || e);
    }
    return out;
  }

  window.DVL_PRICE_SCALE_MODEL = {
    version:"0.941",
    build:build,
    audit:audit
  };
  window.DVL_PRICE_SCALE_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var ps = audit();
    base.priceScaleModel = ps;
    base.priceScaleModelAvailable = !!ps.pass;
    base.pass = !!(base.pass !== false && ps.pass);
    return base;
  };
})();
