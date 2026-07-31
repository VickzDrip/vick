(function(){
  "use strict";

  var base = window.DVL_DRAWING_GEOMETRY_MODEL || null;
  if(!base || base.__bridge0911) return;

  function typeOf(d){
    return String(d && d.type || "").toLowerCase();
  }

  function isPosition(d){
    var t = typeOf(d);
    return t === "longpos" || t === "shortpos";
  }

  function isDrawing(d){
    var t = typeOf(d);
    return t === "trendline" || t === "line" || t === "arrow" || t === "rectangle" || t === "rect" || t === "text";
  }

  function pointsOf(d){
    if(!d) return [];
    var t = typeOf(d);

    if(t === "trendline" || t === "line" || t === "arrow" || t === "rectangle" || t === "rect"){
      return [d.p1 || d.a, d.p2 || d.b].filter(Boolean);
    }

    if(t === "text"){
      return [d.p || d.p1 || d.a || d.point].filter(Boolean);
    }

    return [];
  }

  function pointToScreen(p){
    if(!p) return null;

    try{
      if(window.DVL_PROJECTION_MODEL && typeof window.DVL_PROJECTION_MODEL.build === "function"){
        var pr = window.DVL_PROJECTION_MODEL.build();
        if(pr && typeof pr.pointToScreen === "function"){
          var sp = pr.pointToScreen(p);
          if(sp && Number.isFinite(Number(sp.x)) && Number.isFinite(Number(sp.y))) return sp;
        }
      }
    }catch(_){}

    try{
      if(base && typeof base.pointToScreen === "function"){
        var bp = base.pointToScreen(p);
        if(bp && Number.isFinite(Number(bp.x)) && Number.isFinite(Number(bp.y))) return bp;
      }
    }catch(_){}

    try{
      if(typeof getCS === "function"){
        var cs = getCS();
        if(cs){
          var idx = Number(p.index ?? p.idx ?? 0);
          return {
            x:cs.xI ? cs.xI(idx) : cs.indexToX(idx),
            y:cs.yP ? cs.yP(Number(p.price)) : cs.priceToY(Number(p.price)),
            index:idx,
            idx:idx,
            price:Number(p.price),
            time:p.time || 0
          };
        }
      }
    }catch(_){}

    return null;
  }

  function screenToPoint(x, y, opts){
    opts = opts || {};
    try{
      if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === "function"){
        var p = window.DVL_TOOL_POINT_MODEL.pointFromLocal(Number(x), Number(y), {
          tool:opts.tool || "drawing",
          clamp:opts.clamp !== false,
          snap:!!opts.snap
        });
        if(p) return p;
      }
    }catch(_){}

    try{
      if(base && typeof base.screenToPoint === "function"){
        return base.screenToPoint(Number(x), Number(y), opts);
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

    var left = Math.min.apply(null, xs);
    var right = Math.max.apply(null, xs);
    var top = Math.min.apply(null, ys);
    var bottom = Math.max.apply(null, ys);

    if(typeOf(d) === "text"){
      var fs = Number(d && d.style && d.style.fontSize) || 12;
      var txt = String(d && d.text || "");
      right = left + Math.max(48, txt.length * fs * 0.62 + 16);
      bottom = top + Math.max(18, fs + 10);
      top = top - Math.max(14, fs + 4);
    }

    return {
      left:left,
      right:right,
      top:top,
      bottom:bottom,
      width:Math.max(0, right - left),
      height:Math.max(0, bottom - top),
      centerX:(left + right) / 2,
      centerY:(top + bottom) / 2
    };
  }

  function distanceToSegment(px, py, ax, ay, bx, by){
    px=Number(px); py=Number(py); ax=Number(ax); ay=Number(ay); bx=Number(bx); by=Number(by);
    var dx = bx - ax, dy = by - ay;
    var len2 = dx*dx + dy*dy;
    if(!len2) return Math.hypot(px - ax, py - ay);
    var t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / len2));
    return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
  }

  function handleHit(d, x, y, radius){
    radius = Number.isFinite(Number(radius)) ? Number(radius) : 22;
    var t = typeOf(d);
    var pts = screenPoints(d);
    if(!pts.length) return null;

    if(t === "text"){
      var tp = pts[0];
      var td = Math.hypot(Number(x) - Number(tp.x), Number(y) - Number(tp.y));
      return td <= radius ? { handle:"h1", point:tp, distance:td, geometryBridge:true } : null;
    }

    if(t === "trendline" || t === "line" || t === "arrow"){
      var d1 = Math.hypot(Number(x) - Number(pts[0].x), Number(y) - Number(pts[0].y));
      var d2 = pts[1] ? Math.hypot(Number(x) - Number(pts[1].x), Number(y) - Number(pts[1].y)) : Infinity;
      if(d1 <= radius) return { handle:"h1", point:pts[0], distance:d1, geometryBridge:true };
      if(d2 <= radius) return { handle:"h2", point:pts[1], distance:d2, geometryBridge:true };
      return null;
    }

    if(t === "rectangle" || t === "rect"){
      if(pts.length < 2) return null;
      var s1 = pts[0], s2 = pts[1];
      var corners = [
        { handle:"h1", x:s1.x, y:s1.y },
        { handle:"h2", x:s2.x, y:s2.y },
        { handle:"h3", x:s2.x, y:s1.y },
        { handle:"h4", x:s1.x, y:s2.y }
      ];
      var best = null;
      for(var i=0;i<corners.length;i++){
        var c = corners[i];
        var dist = Math.hypot(Number(x) - Number(c.x), Number(y) - Number(c.y));
        if(dist <= radius && (!best || dist < best.distance)){
          best = { handle:c.handle, point:{ x:c.x, y:c.y }, distance:dist, geometryBridge:true };
        }
      }
      return best;
    }

    return null;
  }

  function bodyHit(d, x, y, tolerance){
    tolerance = Number.isFinite(Number(tolerance)) ? Number(tolerance) : 24;
    var t = typeOf(d);
    var pts = screenPoints(d);

    if(t === "trendline" || t === "line" || t === "arrow"){
      if(pts.length < 2) return null;
      var dist = distanceToSegment(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      return dist <= tolerance ? { part:"body", distance:dist, geometryBridge:true } : null;
    }

    if(t === "rectangle" || t === "rect"){
      var b = bounds(d);
      if(!b) return null;
      var inside = Number(x) >= b.left - tolerance && Number(x) <= b.right + tolerance && Number(y) >= b.top - tolerance && Number(y) <= b.bottom + tolerance;
      if(!inside) return null;
      var edge = Math.min(
        Math.abs(Number(x)-b.left),
        Math.abs(Number(x)-b.right),
        Math.abs(Number(y)-b.top),
        Math.abs(Number(y)-b.bottom)
      );
      return { part:"body", distance:edge, inside:true, geometryBridge:true };
    }

    if(t === "text"){
      var tb = bounds(d);
      if(!tb) return null;
      var hit = Number(x) >= tb.left - tolerance && Number(x) <= tb.right + tolerance && Number(y) >= tb.top - tolerance && Number(y) <= tb.bottom + tolerance;
      return hit ? { part:"body", distance:0, inside:true, geometryBridge:true } : null;
    }

    return null;
  }

  function hitTest(d, x, y, opts){
    opts = opts || {};
    if(!isDrawing(d) || isPosition(d)) return null;
    var handle = handleHit(d, x, y, opts.handleRadius);
    if(handle) return Object.assign({ kind:"handle" }, handle);
    var body = bodyHit(d, x, y, opts.bodyTolerance);
    if(body) return Object.assign({ kind:"body" }, body);
    return null;
  }

  function audit(){
    var drawings = [];
    try{ drawings = (window.S && Array.isArray(S.drawings)) ? S.drawings : []; }catch(_){}
    var sample = drawings.find(isDrawing) || null;
    var pts = sample ? pointsOf(sample) : [];
    var sp = sample ? screenPoints(sample) : [];
    return {
      version:"0.941",
      available:true,
      bridge:true,
      drawingCount:drawings.length,
      sampleType:sample ? typeOf(sample) : null,
      samplePointCount:pts.length,
      sampleScreenPointCount:sp.length,
      supportsP1P2:true,
      supportsTextP:true,
      hasHitTest:typeof hitTest === "function",
      pass:!!(typeof hitTest === "function" && typeof pointToScreen === "function" && typeof screenToPoint === "function")
    };
  }

  var upgraded = Object.assign({}, base, {
    version:"0.941",
    __bridge0911:true,
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
  });

  window.DVL_DRAWING_GEOMETRY_MODEL = upgraded;
  window.DVL_DRAWING_GEOMETRY_MODEL_AUDIT = audit;

  var oldHitDrawing = window._hitDrawing;
  var oldHitHandles = window._hitHandles;

  if(typeof oldHitDrawing === "function"){
    window._hitDrawing = function(d, mx, my, cs){
      try{
        if(d && !isPosition(d)){
          var hit = hitTest(d, mx, my, { bodyTolerance: (typeof HIT === "function" ? HIT() : 22) });
          if(hit) return true;
        }
      }catch(_){}
      return oldHitDrawing.call(this, d, mx, my, cs);
    };
  }

  if(typeof oldHitHandles === "function"){
    window._hitHandles = function(mx, my, d, cs){
      try{
        if(d && !isPosition(d)){
          var hit = handleHit(d, mx, my, (typeof HDL === "function" ? HDL()+5 : 22));
          if(hit && hit.handle) return hit.handle;
        }
      }catch(_){}
      return oldHitHandles.call(this, mx, my, d, cs);
    };
  }

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var baseAudit = {};
    try{ baseAudit = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ baseAudit = { pass:false, error:String(e && e.message || e) }; }
    var dg = audit();
    baseAudit.drawingGeometryBridge = dg;
    baseAudit.drawingGeometryBridgeAvailable = !!dg.pass;
    baseAudit.pass = !!(baseAudit.pass !== false && dg.pass);
    return baseAudit;
  };
})();
