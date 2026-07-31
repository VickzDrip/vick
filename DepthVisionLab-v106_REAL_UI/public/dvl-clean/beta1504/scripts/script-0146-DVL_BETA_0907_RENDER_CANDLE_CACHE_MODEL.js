(function(){
  "use strict";

  var chart = window.DVL_CHART_MODEL || null;
  if(!chart || chart.__renderCacheWrapped) return;

  var original = {
    getRenderCandles: chart.getRenderCandles,
    getRenderCandleAtIndex: chart.getRenderCandleAtIndex,
    nearestRenderCandleFromX: chart.nearestRenderCandleFromX
  };

  var cache = {
    key:null,
    renderCandles:null,
    byIndex:null,
    hits:0,
    misses:0,
    singleHits:0,
    singleMisses:0
  };

  function revision(){
    try{
      if(window.DVL_CANDLE_REVISION_MODEL && typeof window.DVL_CANDLE_REVISION_MODEL.getRevision === "function"){
        return window.DVL_CANDLE_REVISION_MODEL.getRevision();
      }
    }catch(_){}
    return 0;
  }

  function viewportKey(cs, pad){
    if(!cs) return "no-cs";
    var r = cs.range || {};
    return [
      revision(),
      Number(r.start).toFixed(4),
      Number(r.end).toFixed(4),
      Number(cs.left).toFixed(2),
      Number(cs.right).toFixed(2),
      Number(cs.top).toFixed(2),
      Number(cs.bottom).toFixed(2),
      Number(pad || 0),
      cs.candles ? cs.candles.length : 0
    ].join("|");
  }

  function buildRenderSet(options){
    options = options || {};
    var cs = null;
    try{ cs = chart.buildCoordinateSystem ? chart.buildCoordinateSystem() : null; }catch(_){}
    if(!cs) return { key:"no-cs", candles:[], byIndex:new Map() };

    var pad = Number.isFinite(Number(options.pad)) ? Number(options.pad) : 2;
    var key = viewportKey(cs, pad);

    if(cache.renderCandles && cache.key === key){
      cache.hits++;
      return { key:key, candles:cache.renderCandles, byIndex:cache.byIndex };
    }

    cache.misses++;
    var candles = [];
    try{
      if(typeof original.getRenderCandles === "function"){
        candles = original.getRenderCandles.call(chart, options) || [];
      }
    }catch(_){
      candles = [];
    }

    var byIndex = new Map();
    for(var i=0;i<candles.length;i++){
      var rc = candles[i];
      if(rc && Number.isFinite(Number(rc.index))){
        byIndex.set(Math.round(Number(rc.index)), rc);
      }
    }

    cache.key = key;
    cache.renderCandles = candles;
    cache.byIndex = byIndex;
    return { key:key, candles:candles, byIndex:byIndex };
  }

  function getRenderCandles(options){
    return buildRenderSet(options).candles;
  }

  function getRenderCandleAtIndex(index){
    var i = Math.round(Number(index) || 0);
    var set = buildRenderSet({ pad:3 });
    if(set.byIndex && set.byIndex.has(i)){
      cache.singleHits++;
      return set.byIndex.get(i);
    }

    cache.singleMisses++;
    try{
      return typeof original.getRenderCandleAtIndex === "function" ? original.getRenderCandleAtIndex.call(chart, index) : null;
    }catch(_){
      return null;
    }
  }

  function nearestRenderCandleFromX(x, options){
    options = options || {};
    var set = buildRenderSet({ pad:Number.isFinite(Number(options.pad)) ? Number(options.pad) : 3 });
    var best = null;
    var bestDist = Infinity;
    for(var i=0;i<set.candles.length;i++){
      var rc = set.candles[i];
      if(!rc || !Number.isFinite(Number(rc.x))) continue;
      var dist = Math.abs(Number(x) - Number(rc.x));
      if(dist < bestDist){
        best = rc;
        bestDist = dist;
      }
    }

    if(best){
      var maxX = Number.isFinite(Number(options.maxX)) ? Number(options.maxX) : best.halfHitW;
      var out = Object.assign({}, best);
      out.distanceX = bestDist;
      out.withinHit = bestDist <= maxX;
      out.renderCache = true;
      return out;
    }

    try{
      return typeof original.nearestRenderCandleFromX === "function" ? original.nearestRenderCandleFromX.call(chart, x, options) : null;
    }catch(_){
      return null;
    }
  }

  function clear(){
    cache.key = null;
    cache.renderCandles = null;
    cache.byIndex = null;
  }

  function stats(){
    return {
      version:"0.941",
      key:cache.key,
      count:cache.renderCandles ? cache.renderCandles.length : 0,
      hits:cache.hits,
      misses:cache.misses,
      singleHits:cache.singleHits,
      singleMisses:cache.singleMisses,
      hasCache:!!cache.renderCandles
    };
  }

  function audit(){
    var rcs = [];
    try{ rcs = getRenderCandles({ pad:2 }); }catch(_){}
    return {
      version:"0.941",
      available:true,
      wrapped:true,
      renderCount:Array.isArray(rcs) ? rcs.length : 0,
      hasCache:!!cache.renderCandles,
      hits:cache.hits,
      misses:cache.misses,
      revision:revision(),
      pass:!!Array.isArray(rcs)
    };
  }

  window.DVL_CHART_MODEL = Object.assign({}, chart, {
    version:"0.941",
    __renderCacheWrapped:true,
    getRenderCandles:getRenderCandles,
    getRenderCandleAtIndex:getRenderCandleAtIndex,
    nearestRenderCandleFromX:nearestRenderCandleFromX
  });

  window.DVL_RENDER_CANDLE_CACHE_MODEL = {
    version:"0.941",
    clear:clear,
    stats:stats,
    audit:audit
  };
  window.DVL_RENDER_CANDLE_CACHE_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var rc = audit();
    base.renderCandleCacheModel = rc;
    base.renderCandleCacheModelAvailable = !!rc.pass;
    base.pass = !!(base.pass !== false && rc.pass);
    return base;
  };
})();
