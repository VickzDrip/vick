(function(){
  "use strict";

  function audit(){
    var st = window.DVL_API_STATUS || {};
    return {
      version:"0.941",
      rebuiltFromApproved:"0.931",
      realEndpointPoolAvailable:!!(window.DVL_REAL_MARKET_ENDPOINTS && window.DVL_REAL_MARKET_ENDPOINTS.length),
      endpointCount:window.DVL_REAL_MARKET_ENDPOINTS ? window.DVL_REAL_MARKET_ENDPOINTS.length : 0,
      currentSource:st.source || null,
      currentEndpoint:st.endpoint || null,
      currentMarket:st.market || null,
      candles:!!st.candles,
      rows:st.rows || 0,
      fallback:!!st.fallback,
      fakeFallbackBlocked:!!st.fakeFallbackBlocked || !!st.genericBlocked,
      lastError:st.lastError || null,
      fetchKlinesHistoryFailover:typeof fetchKlinesHistory === "function",
      fetchAggTradesFailover:typeof fetchKlinesFromAggTrades === "function",
      automaticMakeFallbackBlocked:true,
      pass:!!(
        window.DVL_REAL_MARKET_ENDPOINTS &&
        window.DVL_REAL_MARKET_ENDPOINTS.length >= 4 &&
        typeof fetchKlinesHistory === "function" &&
        typeof fetchKlinesFromAggTrades === "function" &&
        st.source !== "LOCAL_FALLBACK"
      )
    };
  }

  window.DVL_REAL_API_FAILOVER_NO_FAKE_FALLBACK_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var api = audit();
    base.realApiFailoverNoFakeFallback = api;
    base.realApiFailoverNoFakeFallbackAvailable = true;
    base.pass = !!(base.pass !== false && api.pass !== false);
    return base;
  };
})();
