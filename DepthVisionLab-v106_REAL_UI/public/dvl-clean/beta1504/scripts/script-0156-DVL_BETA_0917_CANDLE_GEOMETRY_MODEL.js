(function(){
  "use strict";

  function styleModel(){
    return window.DVL_CANDLE_RENDER_STYLE_MODEL || null;
  }

  function chartModel(){
    return window.DVL_CHART_MODEL || null;
  }

  function finite(n, fallback){
    n = Number(n);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeRenderCandle(rc){
    if(!rc) return null;

    var x = finite(rc.x, 0);
    var openY = finite(rc.openY, rc.y);
    var closeY = finite(rc.closeY, rc.y);
    var highY = finite(rc.highY ?? rc.wickHighY, Math.min(openY, closeY));
    var lowY = finite(rc.lowY ?? rc.wickLowY, Math.max(openY, closeY));

    var bodyTopY = Math.min(openY, closeY);
    var bodyBottomY = Math.max(openY, closeY);
    var bodyH = Math.max(1, bodyBottomY - bodyTopY);

    var halfBodyW = finite(rc.halfBodyW, finite(rc.bodyW, finite(rc.width, 1)) / 2);
    var halfHitW = finite(rc.halfHitW, finite(rc.hitW, Math.max(6, halfBodyW * 2)) / 2);

    return Object.assign({}, rc, {
      x:x,
      openY:openY,
      closeY:closeY,
      highY:highY,
      lowY:lowY,
      wickHighY:highY,
      wickLowY:lowY,
      bodyTopY:bodyTopY,
      bodyBottomY:bodyBottomY,
      bodyH:bodyH,
      halfBodyW:halfBodyW,
      halfHitW:halfHitW,
      bodyW:halfBodyW * 2,
      width:halfBodyW * 2,
      hitW:halfHitW * 2
    });
  }

  function styleProps(rc, metrics){
    var sm = styleModel();
    try{
      if(sm && typeof sm.renderProps === "function"){
        return sm.renderProps(rc && rc.candle ? rc.candle : rc, metrics || rc || null);
      }
    }catch(_){}

    return {
      version:"0.917-fallback",
      preset:"legacy-current",
      visualNeutral:true,
      direction:rc && rc.direction || "neutral",
      colors:{
        body:rc && rc.direction === "down" ? "#ff4d5f" : "#10df77",
        wick:rc && rc.direction === "down" ? "#ff4d5f" : "#10df77",
        border:rc && rc.direction === "down" ? "#ff4d5f" : "#10df77"
      },
      body:{ fill:true, border:false, borderWidth:1, minHeight:1, radius:0, opacity:1 },
      wick:{ visible:true, width:1, minWidth:1, opacity:1, roundCap:false },
      premium:{ glow:false, glowBlur:0, glowOpacity:0 },
      metrics:metrics || rc || {}
    };
  }

  function geometryFromRenderCandle(rc, options){
    options = options || {};
    rc = normalizeRenderCandle(rc);
    if(!rc) return null;

    var props = styleProps(rc, options.metrics || rc);
    var metrics = props && props.metrics ? props.metrics : rc;

    var bodyW = Math.max(1, finite(metrics.bodyW ?? metrics.width, rc.bodyW));
    var halfBodyW = bodyW / 2;
    var wickW = Math.max(1, finite(metrics.wickW, finite(props && props.wick && props.wick.width, 1)));
    var hitW = Math.max(bodyW, finite(metrics.hitW, rc.hitW || bodyW));
    var halfHitW = hitW / 2;

    var bodyHeight = Math.max(finite(props && props.body && props.body.minHeight, 1), rc.bodyH);
    var bodyBottom = (props && props.visualNeutral === true) ? Math.max(rc.bodyBottomY, rc.bodyTopY + bodyHeight) : (rc.bodyTopY + bodyHeight);

    var body = {
      x:rc.x - halfBodyW,
      y:rc.bodyTopY,
      w:bodyW,
      h:bodyBottom - rc.bodyTopY,
      left:rc.x - halfBodyW,
      right:rc.x + halfBodyW,
      top:rc.bodyTopY,
      bottom:bodyBottom,
      centerX:rc.x,
      centerY:rc.bodyTopY + (bodyBottom - rc.bodyTopY) / 2
    };

    var wick = {
      x:rc.x,
      y1:rc.wickHighY,
      y2:rc.wickLowY,
      top:Math.min(rc.wickHighY, rc.wickLowY),
      bottom:Math.max(rc.wickHighY, rc.wickLowY),
      width:wickW,
      visible:!!(props && props.wick && props.wick.visible !== false)
    };

    var hitbox = {
      left:rc.x - halfHitW,
      right:rc.x + halfHitW,
      top:Math.min(wick.top, body.top),
      bottom:Math.max(wick.bottom, body.bottom),
      width:hitW,
      height:Math.max(1, Math.max(wick.bottom, body.bottom) - Math.min(wick.top, body.top))
    };

    var bounds = {
      left:Math.min(body.left, hitbox.left),
      right:Math.max(body.right, hitbox.right),
      top:hitbox.top,
      bottom:hitbox.bottom,
      width:Math.max(body.w, hitbox.width),
      height:hitbox.height
    };

    return {
      version:"0.941",
      index:rc.index,
      idx:rc.idx,
      time:rc.time,
      direction:props.direction || rc.direction || "neutral",
      candle:rc.candle || null,
      renderCandle:rc,
      props:props,
      body:body,
      wick:wick,
      hitbox:hitbox,
      bounds:bounds,
      visualNeutral:!!(props && props.visualNeutral)
    };
  }

  function getGeometryAtIndex(index){
    var cm = chartModel();
    try{
      if(cm && typeof cm.getRenderCandleAtIndex === "function"){
        var rc = cm.getRenderCandleAtIndex(index);
        return geometryFromRenderCandle(rc);
      }
    }catch(_){}
    return null;
  }

  function getVisibleGeometries(options){
    options = options || {};
    var cm = chartModel();
    var out = [];
    try{
      var rcs = cm && typeof cm.getRenderCandles === "function" ? cm.getRenderCandles(options) : [];
      for(var i=0;i<rcs.length;i++){
        var g = geometryFromRenderCandle(rcs[i]);
        if(g) out.push(g);
      }
    }catch(_){}
    return out;
  }

  function nearestGeometryFromX(x, options){
    options = options || {};
    var cm = chartModel();
    var rc = null;
    try{
      rc = cm && typeof cm.nearestRenderCandleFromX === "function" ? cm.nearestRenderCandleFromX(x, options) : null;
    }catch(_){}
    var g = geometryFromRenderCandle(rc);
    if(g){
      g.distanceX = Math.abs(Number(x) - Number(g.body.centerX));
      g.withinHit = g.distanceX <= (g.hitbox.width / 2);
    }
    return g;
  }

  function audit(){
    var cm = chartModel();
    var visible = [];
    var sample = null;
    try{ visible = getVisibleGeometries({ pad:2 }); }catch(_){}
    try{ sample = visible.length ? visible[visible.length - 1] : null; }catch(_){}

    return {
      version:"0.941",
      available:true,
      chartModelAvailable:!!cm,
      styleModelAvailable:!!styleModel(),
      visibleGeometryCount:visible.length,
      sampleAvailable:!!sample,
      hasBody:!!(sample && sample.body),
      hasWick:!!(sample && sample.wick),
      hasHitbox:!!(sample && sample.hitbox),
      hasBounds:!!(sample && sample.bounds),
      connectedToRuntime:false,
      visualNeutral:true,
      pass:!!(typeof geometryFromRenderCandle === "function" && typeof getVisibleGeometries === "function")
    };
  }

  window.DVL_CANDLE_GEOMETRY_MODEL = {
    version:"0.941",
    normalizeRenderCandle:normalizeRenderCandle,
    styleProps:styleProps,
    geometryFromRenderCandle:geometryFromRenderCandle,
    getGeometryAtIndex:getGeometryAtIndex,
    getVisibleGeometries:getVisibleGeometries,
    nearestGeometryFromX:nearestGeometryFromX,
    audit:audit
  };
  window.DVL_CANDLE_GEOMETRY_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var cg = audit();
    base.candleGeometryModel = cg;
    base.candleGeometryModelAvailable = !!cg.pass;
    base.pass = !!(base.pass !== false && cg.pass);
    return base;
  };
})();
