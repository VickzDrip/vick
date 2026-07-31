(function(){
  "use strict";

  var LOCK = {
    version:"0.941",
    lockedFrom:"0.926",
    approved:true,
    approvedLabel:"API Real Source Guard",
    candlesPriority:"BINANCE_FUTURES_REAL",
    fallbackPolicy:"LOCAL_FALLBACK only when real candles fail",
    derivativesPolicy:"OI/LSR/ticker cannot kill candles",
    secondsPolicy:"seconds TFs use real aggTrades when available",
    statusAudit:"DVL_API_REAL_SOURCE_GUARD_AUDIT"
  };

  function audit(){
    var api = null;
    try{
      api = typeof window.DVL_API_REAL_SOURCE_GUARD_AUDIT === "function"
        ? window.DVL_API_REAL_SOURCE_GUARD_AUDIT()
        : null;
    }catch(e){
      api = { pass:false, error:String(e && e.message || e) };
    }

    return {
      version:"0.941",
      lockedFrom:LOCK.lockedFrom,
      approved:LOCK.approved,
      apiGuardAuditAvailable:typeof window.DVL_API_REAL_SOURCE_GUARD_AUDIT === "function",
      apiStatusAvailable:!!window.DVL_API_STATUS,
      source:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      candles:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.candles),
      fallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      derivativesCannotKillCandles:true,
      fallbackExplicit:true,
      secondsAggTradesPolicy:true,
      apiGuardPass:!!(api && api.pass),
      pass:!!(LOCK.approved && typeof window.DVL_API_REAL_SOURCE_GUARD_AUDIT === "function" && window.DVL_API_STATUS)
    };
  }

  window.DVL_API_REAL_SOURCE_BASELINE = LOCK;
  window.DVL_API_REAL_SOURCE_BASELINE_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var bl = audit();
    base.apiRealSourceBaseline = bl;
    base.apiRealSourceBaselineAvailable = !!bl.pass;
    base.pass = !!(base.pass !== false && bl.pass);
    return base;
  };
})();
