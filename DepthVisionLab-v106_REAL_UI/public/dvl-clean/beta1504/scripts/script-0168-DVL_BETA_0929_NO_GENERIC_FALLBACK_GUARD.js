(function(){
  "use strict";

  function audit(){
    var st = window.DVL_API_STATUS || {};
    return {
      version:"0.941",
      source:st.source || null,
      candles:!!st.candles,
      fallback:!!st.fallback,
      emergencyReal:!!st.emergencyReal,
      loadedInterval:st.loadedInterval || null,
      requestedInterval:st.requestedInterval || null,
      rows:st.rows || 0,
      hasEmergencyLoader:typeof fetchEmergencyRealKlines === "function",
      hasApplyRows:typeof applyKlineRowsToChart === "function",
      genericOnlyAfterEmergency:true,
      pass:!!(typeof fetchEmergencyRealKlines === "function" && typeof applyKlineRowsToChart === "function")
    };
  }

  window.DVL_NO_GENERIC_FALLBACK_GUARD_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var ng = audit();
    base.noGenericFallbackGuard = ng;
    base.noGenericFallbackGuardAvailable = !!ng.pass;
    base.pass = !!(base.pass !== false && ng.pass);
    return base;
  };
})();
