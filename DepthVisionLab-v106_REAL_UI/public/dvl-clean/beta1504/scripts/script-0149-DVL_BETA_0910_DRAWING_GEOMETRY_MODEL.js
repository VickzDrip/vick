(function(){
  "use strict";

  function projection(){
    try{
      if(window.DVL_PROJECTION_MODEL && typeof window.DVL_PROJECTION_MODEL.build === "function"){
        return window.DVL_PROJECTION_MODEL.build();
      }
    }catch(_){}
    return null;
  }

  function chartModel(){
    return window.DVL_CHART_MODEL || null;
  }

  function typeOf(d){
    return String(d && d.type || "").toLowerCase();
  }

  function isDrawing(d){
    var t = typeOf(d);
    return t === "trendline" || t === "line" || t === "arrow" || t === "rectangle" || t === "rect" || t === "text";
  }

  function pointsOf(d){
    if(!d) return [];
    var t = typeOf(d);
    if(t === "trendline" || t === "line" || t === "arrow" || t === "rectangle" || t === "rect"){
      return [d.a, d.b].filter(Boolean);
    }
    if(t === "text"){
      return [d.p || d.a || d.point].filter(Boolean);
    }
    return [];
  }

  function pointToScreen(p){
    if(!p) return null;
    var pr = projection();
    try{
      if(pr && typeof pr.pointToScreen === "function"){
        return pr.pointToScreen(p);
      }
    }catch(_){}

    var cm = chartModel();
    try{
      var cs = cm && cm.buildCoordinateSystem ? cm.buildCoordinateSystem() : null;
      if(!cs) return null;
      var idx = Number(p.index ?? p.idx ?? 0);
      return {
        x:cs.indexToX(idx),
        y:cs.priceToY(Number(p.price)),
        index:idx,
        idx:idx,
        price:Number(p.price),
        time:p.time || 0
      };
    }catch(_){}
    return null;
  }

  function screenToPoint(x, y, opts){
    opts = opts || {};
    var pr = projection();
    try{
      if(pr && typeof pr.localToPoint === "function"){
        return pr.localToPoint(Number(x), Number(y), { clamp: opts.clamp !== false });
      }
    }catch(_){}

    var cm = chartModel();
    try{
      if(cm && typeof cm.pointFromLocal === "function"){
        return cm.pointFromLocal(Number(x), Number(y), { clamp: opts.clamp !== false, snap:false });
      }
    }catch(_){}
    return null;
  }

  function screenPoints(d){
    return pointsOf(d).map(pointToScreen).filter(Boolean);
  }

  function bounds(d){
    var pts = screenPoints(d);
    if(!pts.length) return null;
    var xs = pts.map(function(p){ return Number(p.x); }).filter(Number.isFinite);
    var ys = pts.map(function(p){ return Number(p.y); }).filter(Number.isFinite);
    if(!xs.length || !ys.length) return null;

    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);

    if(typeOf(d) === "text"){
      var padX = Number(d && d.w) || 92;
      var padY = Number(d && d.h) || 28;
      maxX = minX + padX;
      maxY = minY + padY;
    }

    return {
      left:minX,
      right:maxX,
      top:minY,
      bottom:maxY,
      width:Math.max(0, maxX - minX),
      height:Math.max(0, maxY - minY),
      centerX:(minX + maxX) / 2,
      centerY:(minY + maxY) / 2
    };
  }

  function distanceToSegment(px, py, ax, ay, bx, by){
    px = Number(px); py = Number(py); ax = Number(ax); ay = Number(ay); bx = Number(bx); by = Number(by);
    var dx = bx - ax;
    var dy = by - ay;
    var len2 = dx * dx + dy * dy;
    if(!len2) return Math.hypot(px - ax, py - ay);
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    var x = ax + t * dx;
    var y = ay + t * dy;
    return Math.hypot(px - x, py - y);
  }

  function handleHit(d, x, y, radius){
    radius = Number.isFinite(Number(radius)) ? Number(radius) : 18;
    var pts = screenPoints(d);
    if(!pts.length) return null;

    var names = typeOf(d) === "text" ? ["p"] : ["a","b"];
    for(var i=0;i<pts.length;i++){
      var p = pts[i];
      if(Math.hypot(Number(x) - Number(p.x), Number(y) - Number(p.y)) <= radius){
        return {
          handle:names[i] || ("p" + i),
          point:p,
          distance:Math.hypot(Number(x) - Number(p.x), Number(y) - Number(p.y))
        };
      }
    }
    return null;
  }

  function bodyHit(d, x, y, tolerance){
    tolerance = Number.isFinite(Number(tolerance)) ? Number(tolerance) : 22;
    var t = typeOf(d);
    var pts = screenPoints(d);

    if(t === "trendline" || t === "line" || t === "arrow"){
      if(pts.length < 2) return null;
      var dist = distanceToSegment(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      return dist <= tolerance ? { part:"body", distance:dist } : null;
    }

    if(t === "rectangle" || t === "rect"){
      var b = bounds(d);
      if(!b) return null;
      var inside = Number(x) >= b.left - tolerance && Number(x) <= b.right + tolerance && Number(y) >= b.top - tolerance && Number(y) <= b.bottom + tolerance;
      if(!inside) return null;
      var edgeDist = Math.min(
        Math.abs(Number(x) - b.left),
        Math.abs(Number(x) - b.right),
        Math.abs(Number(y) - b.top),
        Math.abs(Number(y) - b.bottom)
      );
      return { part:"body", distance:edgeDist, inside:true };
    }

    if(t === "text"){
      var tb = bounds(d);
      if(!tb) return null;
      var textInside = Number(x) >= tb.left - tolerance && Number(x) <= tb.right + tolerance && Number(y) >= tb.top - tolerance && Number(y) <= tb.bottom + tolerance;
      return textInside ? { part:"body", distance:0, inside:true } : null;
    }

    return null;
  }

  function hitTest(d, x, y, opts){
    opts = opts || {};
    if(!isDrawing(d)) return null;
    var handle = handleHit(d, x, y, opts.handleRadius);
    if(handle) return Object.assign({ kind:"handle" }, handle);

    var body = bodyHit(d, x, y, opts.bodyTolerance);
    if(body) return Object.assign({ kind:"body" }, body);

    return null;
  }

  function audit(){
    var pr = projection();
    var drawings = [];
    try{ drawings = (window.S && Array.isArray(S.drawings)) ? S.drawings : []; }catch(_){}
    var sample = drawings.find(isDrawing) || null;
    var b = sample ? bounds(sample) : null;

    return {
      version:"0.941",
      available:true,
      projectionAvailable:!!pr,
      drawingCount:drawings.length,
      sampleType:sample ? typeOf(sample) : null,
      sampleBounds:!!b,
      hasPointToScreen:typeof pointToScreen === "function",
      hasScreenToPoint:typeof screenToPoint === "function",
      hasHitTest:typeof hitTest === "function",
      pass:!!(typeof pointToScreen === "function" && typeof screenToPoint === "function" && typeof hitTest === "function")
    };
  }

  window.DVL_DRAWING_GEOMETRY_MODEL = {
    version:"0.941",
    isDrawing:isDrawing,
    pointsOf:pointsOf,
    pointToScreen:pointToScreen,
    screenToPoint:screenToPoint,
    screenPoints:screenPoints,
    bounds:bounds,
    distanceToSegment:distanceToSegment,
    handleHit:handleHit,
    bodyHit:bodyHit,
    hitTest:hitTest,
    audit:audit
  };
  window.DVL_DRAWING_GEOMETRY_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var dg = audit();
    base.drawingGeometryModel = dg;
    base.drawingGeometryModelAvailable = !!dg.pass;
    base.pass = !!(base.pass !== false && dg.pass);
    return base;
  };
})();
