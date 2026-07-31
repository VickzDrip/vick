(function(){
  "use strict";

  window.DVL_CANDLE_SOURCE_GUARD = {
    version:"0.941",
    rawSource:"S.candles",
    cacheLayer:"DVL_CANDLE_CACHE_MODEL",
    normalizedLayer:"DVL_CANDLE_DATA_MODEL",
    recursionGuard:true
  };

  function audit(){
    var raw = [];
    var normalized = [];
    var cache = null;
    try{ raw = Array.isArray(S.candles) ? S.candles : []; }catch(_){}
    try{ normalized = window.DVL_CANDLE_DATA_MODEL && window.DVL_CANDLE_DATA_MODEL.getCandles ? window.DVL_CANDLE_DATA_MODEL.getCandles() : []; }catch(e){ normalized = []; }
    try{ cache = window.DVL_CANDLE_CACHE_MODEL && window.DVL_CANDLE_CACHE_MODEL.stats ? window.DVL_CANDLE_CACHE_MODEL.stats() : null; }catch(_){}

    var rawDirectOk = false;
    try{
      rawDirectOk = !!(window.DVL_CANDLE_DATA_MODEL && window.DVL_CANDLE_DATA_MODEL.getRawCandles && window.DVL_CANDLE_DATA_MODEL.getRawCandles() === raw);
    }catch(_){}

    return {
      version:"0.941",
      rawSource:"S.candles",
      rawCount:raw.length,
      normalizedCount:Array.isArray(normalized) ? normalized.length : 0,
      rawDirectOk:rawDirectOk,
      cacheAvailable:!!window.DVL_CANDLE_CACHE_MODEL,
      cacheStats:cache,
      pass:!!(Array.isArray(raw) && Array.isArray(normalized) && (!raw.length || normalized.length <= raw.length))
    };
  }

  window.DVL_CANDLE_SOURCE_GUARD_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var sg = audit();
    base.candleSourceGuard = sg;
    base.candleSourceGuardPass = !!sg.pass;
    base.pass = !!(base.pass !== false && sg.pass);
    return base;
  };
})();
