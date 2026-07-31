(function(){
  "use strict";

  var base = window.DVL_CANDLE_DATA_MODEL || null;
  if(!base || base.__cacheWrapped) return;

  var cache = {
    key:null,
    rawRef:null,
    candles:null,
    hits:0,
    misses:0
  };

  function candleSignature(c){
    if(!c) return "none";
    return [
      c.t ?? c.time ?? c.openTime ?? c.open_time ?? "",
      c.o ?? c.open ?? "",
      c.h ?? c.high ?? "",
      c.l ?? c.low ?? "",
      c.c ?? c.close ?? "",
      c.v ?? c.volume ?? c.vol ?? ""
    ].join("|");
  }

  function buildKey(raw){
    raw = Array.isArray(raw) ? raw : [];
    try{
      if(window.DVL_CANDLE_REVISION_MODEL && typeof window.DVL_CANDLE_REVISION_MODEL.key === "function"){
        return window.DVL_CANDLE_REVISION_MODEL.key(raw);
      }
    }catch(_){}
    var first = raw.length ? candleSignature(raw[0]) : "empty";
    var last = raw.length ? candleSignature(raw[raw.length - 1]) : "empty";
    return raw.length + "::" + first + "::" + last;
  }

  function getRawCandles(){
    return base.getRawCandles ? base.getRawCandles() : [];
  }

  function getCandles(){
    var raw = getRawCandles();
    var key = buildKey(raw);

    if(cache.candles && cache.rawRef === raw && cache.key === key){
      cache.hits++;
      return cache.candles;
    }

    cache.misses++;
    cache.rawRef = raw;
    cache.key = key;

    var out = [];
    for(var i=0;i<raw.length;i++){
      var c = base.normalizeCandle ? base.normalizeCandle(raw[i], i) : null;
      if(c) out.push(c);
    }

    cache.candles = out;
    return out;
  }

  function candleAt(index){
    var candles = getCandles();
    if(!candles.length) return null;
    var i = Math.max(0, Math.min(Math.round(Number(index) || 0), candles.length - 1));
    return candles[i] || null;
  }

  function timeToIndex(time, candles){
    candles = Array.isArray(candles) ? candles : getCandles();
    if(base.timeToIndex) return base.timeToIndex(time, candles);
    return 0;
  }

  function indexToTime(index, candles){
    candles = Array.isArray(candles) ? candles : getCandles();
    if(base.indexToTime) return base.indexToTime(index, candles);
    if(!candles.length) return 0;
    var i = Math.max(0, Math.min(Math.round(Number(index) || 0), candles.length - 1));
    return candles[i] ? candles[i].time : 0;
  }

  function clear(){
    cache.key = null;
    cache.rawRef = null;
    cache.candles = null;
  }

  function stats(){
    return {
      version:"0.941",
      key:cache.key,
      count:cache.candles ? cache.candles.length : 0,
      hits:cache.hits,
      misses:cache.misses,
      hasCache:!!cache.candles
    };
  }

  function audit(){
    var raw = getRawCandles();
    var candles = getCandles();
    return {
      version:"0.941",
      available:true,
      wrapped:true,
      rawCount:Array.isArray(raw) ? raw.length : 0,
      normalizedCount:Array.isArray(candles) ? candles.length : 0,
      hasCache:!!cache.candles,
      hits:cache.hits,
      misses:cache.misses,
      pass:!!(Array.isArray(candles) && (!raw.length || candles.length <= raw.length))
    };
  }

  window.DVL_CANDLE_DATA_MODEL = Object.assign({}, base, {
    version:"0.941",
    __cacheWrapped:true,
    getRawCandles:getRawCandles,
    getCandles:getCandles,
    candleAt:candleAt,
    timeToIndex:timeToIndex,
    indexToTime:indexToTime,
    clearCache:clear,
    cacheStats:stats,
    audit:audit
  });

  window.DVL_CANDLE_CACHE_MODEL = {
    version:"0.941",
    clear:clear,
    stats:stats,
    audit:audit
  };

  window.DVL_CANDLE_CACHE_MODEL_AUDIT = audit;
  window.DVL_CANDLE_DATA_MODEL_AUDIT = function(){
    try{ return window.DVL_CANDLE_DATA_MODEL.audit(); }catch(e){ return { pass:false, error:String(e && e.message || e) }; }
  };

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var baseAudit = {};
    try{ baseAudit = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ baseAudit = { pass:false, error:String(e && e.message || e) }; }
    var cc = audit();
    baseAudit.candleCacheModel = cc;
    baseAudit.candleCacheModelAvailable = !!cc.pass;
    baseAudit.pass = !!(baseAudit.pass !== false && cc.pass);
    return baseAudit;
  };
})();
