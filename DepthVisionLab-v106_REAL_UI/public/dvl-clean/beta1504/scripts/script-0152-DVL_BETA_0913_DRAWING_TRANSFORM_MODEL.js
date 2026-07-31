(function(){
  "use strict";

  function clone(obj){
    try{ return JSON.parse(JSON.stringify(obj)); }catch(_){ return Object.assign({}, obj); }
  }

  function typeOf(d){
    return String(d && d.type || "").toLowerCase();
  }

  function isPosition(d){
    var t = typeOf(d);
    return t === "longpos" || t === "shortpos";
  }

  function isDrawing(d){
    var gm = window.DVL_DRAWING_GEOMETRY_MODEL;
    try{ if(gm && typeof gm.isDrawing === "function") return !!gm.isDrawing(d) && !isPosition(d); }catch(_){}
    var t = typeOf(d);
    return t === "trendline" || t === "line" || t === "arrow" || t === "rectangle" || t === "rect" || t === "text";
  }

  function timeForIndex(index){
    try{
      if(window.DVL_CANDLE_DATA_MODEL && typeof window.DVL_CANDLE_DATA_MODEL.indexToTime === "function"){
        return window.DVL_CANDLE_DATA_MODEL.indexToTime(index);
      }
    }catch(_){}
    try{
      var candles = (window.S && Array.isArray(S.candles)) ? S.candles : [];
      var i = Math.max(0, Math.min(Math.round(Number(index) || 0), candles.length - 1));
      return candles[i] ? (candles[i].t || candles[i].time || 0) : 0;
    }catch(_){}
    return 0;
  }

  function pointDeltaFromScreen(startX, startY, nowX, nowY, opts){
    opts = opts || {};
    var gm = window.DVL_DRAWING_GEOMETRY_MODEL || null;
    var a = null, b = null;

    try{
      if(gm && typeof gm.screenToPoint === "function"){
        a = gm.screenToPoint(Number(startX), Number(startY), { clamp:true, snap:false });
        b = gm.screenToPoint(Number(nowX), Number(nowY), { clamp:true, snap:false });
      }
    }catch(_){}

    if(!a || !b){
      try{
        if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === "function"){
          a = window.DVL_TOOL_POINT_MODEL.pointFromLocal(Number(startX), Number(startY), { tool:"drawing", clamp:true, snap:false });
          b = window.DVL_TOOL_POINT_MODEL.pointFromLocal(Number(nowX), Number(nowY), { tool:"drawing", clamp:true, snap:false });
        }
      }catch(_){}
    }

    if(!a || !b) return { di:0, dp:0, a:null, b:null, source:"fallback-zero" };

    return {
      di:Number(b.index ?? b.idx ?? 0) - Number(a.index ?? a.idx ?? 0),
      dp:Number(b.price) - Number(a.price),
      a:a,
      b:b,
      source:"geometry-screen-delta"
    };
  }

  function translatePoint(pt, delta){
    if(!pt) return pt;
    delta = delta || {};
    var idx = Number(pt.index ?? pt.idx ?? 0) + Number(delta.di || 0);
    var price = Number(pt.price) + Number(delta.dp || 0);
    return Object.assign({}, pt, {
      index:idx,
      idx:idx,
      time:timeForIndex(idx) || pt.time || 0,
      price:price
    });
  }

  function moveBody(draw, delta){
    if(!draw || !isDrawing(draw)) return draw;
    var d = clone(draw);
    var t = typeOf(d);

    if(t === "text"){
      d.p = translatePoint(d.p || d.p1, delta);
      return d;
    }

    if(t === "trendline" || t === "line" || t === "arrow" || t === "rectangle" || t === "rect"){
      d.p1 = translatePoint(d.p1 || d.a, delta);
      d.p2 = translatePoint(d.p2 || d.b, delta);
      return d;
    }

    return d;
  }

  function normalizeScreenPoint(localPoint, opts){
    opts = opts || {};
    if(!localPoint) return null;

    try{
      if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === "function"){
        var p = window.DVL_TOOL_POINT_MODEL.pointFromLocal(Number(localPoint.x), Number(localPoint.y), {
          tool:opts.tool || "drawing",
          clamp:true,
          snap:opts.snap !== false
        });
        if(p) return p;
      }
    }catch(_){}

    try{
      var gm = window.DVL_DRAWING_GEOMETRY_MODEL;
      if(gm && typeof gm.screenToPoint === "function"){
        return gm.screenToPoint(Number(localPoint.x), Number(localPoint.y), { clamp:true, snap:opts.snap !== false });
      }
    }catch(_){}

    return null;
  }

  function moveHandle(draw, handle, localPoint, opts){
    if(!draw || !isDrawing(draw)) return draw;
    opts = opts || {};
    var d = clone(draw);
    var t = typeOf(d);
    var cp = normalizeScreenPoint(localPoint, { tool:t, snap:opts.snap !== false });
    if(!cp) return d;

    if(t === "trendline" || t === "line" || t === "arrow"){
      if(handle === "h1") d.p1 = Object.assign({}, cp);
      else if(handle === "h2") d.p2 = Object.assign({}, cp);
      return d;
    }

    if(t === "rectangle" || t === "rect"){
      if(handle === "h1"){
        d.p1 = Object.assign({}, cp);
      }else if(handle === "h2"){
        d.p2 = Object.assign({}, cp);
      }else if(handle === "h3"){
        d.p2 = Object.assign({}, d.p2, { index:cp.index, idx:cp.index, time:cp.time });
        d.p1 = Object.assign({}, d.p1, { price:cp.price });
      }else if(handle === "h4"){
        d.p1 = Object.assign({}, d.p1, { index:cp.index, idx:cp.index, time:cp.time });
        d.p2 = Object.assign({}, d.p2, { price:cp.price });
      }
      return d;
    }

    if(t === "text"){
      d.p = Object.assign({}, cp);
      return d;
    }

    return d;
  }

  function applyInto(target, next){
    if(!target || !next) return target;
    Object.keys(target).forEach(function(k){ delete target[k]; });
    Object.keys(next).forEach(function(k){ target[k] = next[k]; });
    return target;
  }

  function audit(){
    var gm = window.DVL_DRAWING_GEOMETRY_MODEL || null;
    var tpm = window.DVL_TOOL_POINT_MODEL || null;
    var drawings = [];
    try{ drawings = (window.S && Array.isArray(S.drawings)) ? S.drawings : []; }catch(_){}
    var sample = drawings.find(isDrawing) || null;
    var moved = null;
    try{
      if(sample) moved = moveBody(sample, { di:0, dp:0 });
    }catch(_){}

    return {
      version:"0.941",
      available:true,
      geometryModelAvailable:!!gm,
      toolPointModelAvailable:!!tpm,
      drawingCount:drawings.length,
      sampleType:sample ? typeOf(sample) : null,
      sampleMoveSafe:sample ? !!moved : true,
      hasPointDelta:typeof pointDeltaFromScreen === "function",
      hasMoveBody:typeof moveBody === "function",
      hasMoveHandle:typeof moveHandle === "function",
      hasApplyInto:typeof applyInto === "function",
      visualNeutral:true,
      connectedToRuntime:false,
      pass:!!(typeof pointDeltaFromScreen === "function" && typeof moveBody === "function" && typeof moveHandle === "function")
    };
  }

  window.DVL_DRAWING_TRANSFORM_MODEL = {
    version:"0.941",
    isDrawing:isDrawing,
    pointDeltaFromScreen:pointDeltaFromScreen,
    translatePoint:translatePoint,
    moveBody:moveBody,
    moveHandle:moveHandle,
    applyInto:applyInto,
    audit:audit
  };
  window.DVL_DRAWING_TRANSFORM_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var dt = audit();
    base.drawingTransformModel = dt;
    base.drawingTransformModelAvailable = !!dt.pass;
    base.pass = !!(base.pass !== false && dt.pass);
    return base;
  };
})();
