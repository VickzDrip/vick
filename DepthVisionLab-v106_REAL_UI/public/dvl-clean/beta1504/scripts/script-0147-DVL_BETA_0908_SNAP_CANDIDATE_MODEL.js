(function(){
  "use strict";

  var chart = window.DVL_CHART_MODEL || null;
  if(!chart || chart.__snapCandidateWrapped) return;

  var originalSnapToCandle = chart.snapToCandle;

  function coarsePointer(){
    try{ return !!(window.matchMedia && window.matchMedia("(pointer:coarse)").matches); }catch(_){ return false; }
  }

  function optionsWithDefaults(options){
    return Object.assign({
      wick:true,
      body:true,
      maxX:null,
      maxY:null,
      searchRadius:1
    }, options || {});
  }

  function buildCandidates(point, options){
    var out = [];
    if(!point) return out;

    var cs = null;
    try{ cs = chart.buildCoordinateSystem ? chart.buildCoordinateSystem() : null; }catch(_){}
    if(!cs || !cs.candles || !cs.candles.length) return out;

    var opts = optionsWithDefaults(options);
    var rawIdx = Number(point.index ?? point.idx ?? 0);
    if(!Number.isFinite(rawIdx)) return out;

    var px = Number.isFinite(Number(point.x)) ? Number(point.x) : cs.indexToX(rawIdx);
    var py = Number.isFinite(Number(point.y)) ? Number(point.y) : cs.priceToY(Number(point.price));

    var baseIdx = Math.max(0, Math.min(Math.round(rawIdx), cs.candles.length - 1));
    var radius = Math.max(0, Math.min(4, Number(opts.searchRadius) || 1));

    var metrics = null;
    try{ metrics = chart.barMetrics ? chart.barMetrics(cs) : null; }catch(_){}
    var coarse = coarsePointer();

    for(var delta = -radius; delta <= radius; delta++){
      var idx = Math.max(0, Math.min(baseIdx + delta, cs.candles.length - 1));
      var rc = null;
      try{
        rc = chart.getRenderCandleAtIndex ? chart.getRenderCandleAtIndex(idx) : null;
      }catch(_){}
      if(!rc){
        try{
          rc = chart.renderCandleFromModel && metrics ? chart.renderCandleFromModel(cs.candles[idx], cs, metrics) : null;
        }catch(_){}
      }
      if(!rc) continue;

      var step = metrics && metrics.step ? metrics.step : 8;
      var defaultX = coarse
        ? Math.max(14, Math.min(36, Math.max(rc.halfHitW || 0, step * 0.48)))
        : Math.max(10, Math.min(26, Math.max(rc.halfHitW || 0, step * 0.42)));
      var xTol = Number.isFinite(Number(opts.maxX)) ? Number(opts.maxX) : defaultX;
      if(Number.isFinite(px) && Math.abs(px - rc.x) > xTol) continue;

      var levels = [];
      try{ levels = chart.renderSnapLevels ? chart.renderSnapLevels(rc, opts) : []; }catch(_){}
      for(var i=0;i<levels.length;i++){
        var level = levels[i];
        if(!level || !Number.isFinite(Number(level.price)) || !Number.isFinite(Number(level.y))) continue;
        if((level.kind === "wickHigh" || level.kind === "wickLow") && opts.wick === false) continue;
        if((level.kind === "bodyTop" || level.kind === "bodyBottom") && opts.body === false) continue;

        var yTol = Number.isFinite(Number(opts.maxY))
          ? Number(opts.maxY)
          : (coarse ? 26 : 18);
        var dy = Number.isFinite(py) ? Math.abs(py - Number(level.y)) : 0;
        if(Number.isFinite(py) && dy > yTol) continue;

        out.push({
          version:"0.941",
          index:idx,
          idx:idx,
          time:rc.time || (cs.candles[idx] && (cs.candles[idx].time || cs.candles[idx].t)) || 0,
          candle:rc.candle || cs.candles[idx],
          kind:level.kind,
          price:Number(level.price),
          x:Number(level.x),
          y:Number(level.y),
          dx:Number.isFinite(px) ? Math.abs(px - Number(level.x)) : 0,
          dy:dy,
          distance:Number.isFinite(px) && Number.isFinite(py)
            ? Math.hypot(Math.abs(px - Number(level.x)), dy)
            : dy,
          source:"snap-candidate-model"
        });
      }
    }

    out.sort(function(a,b){
      if(a.distance !== b.distance) return a.distance - b.distance;
      if(a.dy !== b.dy) return a.dy - b.dy;
      return a.dx - b.dx;
    });

    return out;
  }

  function bestCandidate(point, options){
    var candidates = buildCandidates(point, options);
    return candidates.length ? candidates[0] : null;
  }

  function snapPoint(point, options){
    var best = bestCandidate(point, options);
    if(!best) return point;

    return Object.assign({}, point, {
      index:best.index,
      idx:best.idx,
      time:best.time,
      price:best.price,
      x:best.x,
      y:best.y,
      snapped:true,
      snapKind:best.kind,
      snapSource:"DVL_SNAP_CANDIDATE_MODEL",
      snapDistance:best.distance
    });
  }

  function snapToCandle(point, options){
    try{
      var snapped = snapPoint(point, options);
      if(snapped && snapped !== point && snapped.snapped) return snapped;
    }catch(_){}
    try{
      return typeof originalSnapToCandle === "function" ? originalSnapToCandle.call(chart, point, options) : point;
    }catch(_){
      return point;
    }
  }

  function audit(){
    var sample = null;
    var candidates = [];
    try{
      var cs = chart.buildCoordinateSystem ? chart.buildCoordinateSystem() : null;
      if(cs && cs.candles && cs.candles.length){
        var i = Math.max(0, Math.min(Math.round(((cs.range && cs.range.end) || cs.candles.length - 1) - 1), cs.candles.length - 1));
        var c = cs.candles[i];
        sample = { index:i, idx:i, price:Number(c.close ?? c.c), x:cs.indexToX(i), y:cs.priceToY(Number(c.close ?? c.c)) };
        candidates = buildCandidates(sample, { wick:true, body:true, searchRadius:1, maxY:9999 });
      }
    }catch(_){}
    return {
      version:"0.941",
      available:true,
      chartWrapped:!!(window.DVL_CHART_MODEL && window.DVL_CHART_MODEL.__snapCandidateWrapped),
      sampleAvailable:!!sample,
      candidateCount:candidates.length,
      bestKind:candidates[0] ? candidates[0].kind : null,
      pass:!!(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.snapToCandle === "function")
    };
  }

  window.DVL_SNAP_CANDIDATE_MODEL = {
    version:"0.941",
    buildCandidates:buildCandidates,
    bestCandidate:bestCandidate,
    snapPoint:snapPoint,
    audit:audit
  };

  window.DVL_CHART_MODEL = Object.assign({}, chart, {
    version:"0.941",
    __snapCandidateWrapped:true,
    snapToCandle:snapToCandle
  });

  window.DVL_SNAP_CANDIDATE_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var sc = audit();
    base.snapCandidateModel = sc;
    base.snapCandidateModelAvailable = !!sc.pass;
    base.pass = !!(base.pass !== false && sc.pass);
    return base;
  };
})();
