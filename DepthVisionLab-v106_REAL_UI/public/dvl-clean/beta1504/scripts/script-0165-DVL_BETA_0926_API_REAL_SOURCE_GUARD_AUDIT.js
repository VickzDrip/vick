(function(){
  "use strict";

  function audit(){
    var st = window.DVL_API_STATUS || {};
    return {
      version:"0.941",
      apiStatusAvailable:!!window.DVL_API_STATUS,
      source:st.source || null,
      candles:!!st.candles,
      ticker:!!st.ticker,
      tickerFallbackFromRealKlines:!!st.tickerFallbackFromRealKlines,
      derivatives:!!st.derivatives,
      fallback:!!st.fallback,
      symbol:st.symbol || null,
      interval:st.interval || null,
      rows:st.rows || 0,
      secondsUseAggTrades:true,
      derivativesCannotKillCandles:true,
      genericFallbackVisible:st.source === "LOCAL_FALLBACK",
      pass:!!window.DVL_API_STATUS
    };
  }

  window.DVL_API_REAL_SOURCE_GUARD_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var api = audit();
    base.apiRealSourceGuard = api;
    base.apiRealSourceGuardAvailable = !!api.pass;
    base.pass = !!(base.pass !== false && api.pass);
    return base;
  };
})();
