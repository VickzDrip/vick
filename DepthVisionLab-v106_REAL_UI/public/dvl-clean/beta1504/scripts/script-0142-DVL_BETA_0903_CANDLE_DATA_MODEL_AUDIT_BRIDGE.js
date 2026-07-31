(function(){
  "use strict";
  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var cd = null;
    try{ cd = window.DVL_CANDLE_DATA_MODEL_AUDIT ? window.DVL_CANDLE_DATA_MODEL_AUDIT() : null; }catch(_){}
    base.candleDataModel = cd;
    base.candleDataModelAvailable = !!(cd && cd.pass);
    base.pass = !!(base.pass !== false && cd && cd.pass);
    return base;
  };
})();
