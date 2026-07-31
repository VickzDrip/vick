(function(){
  var oldAudit = window.DVL_CHART_MODEL_AUDIT;
  window.DVL_CHART_MODEL_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var adapter = null;
    try{ adapter = window.DVL_TOOL_POINT_MODEL && window.DVL_TOOL_POINT_MODEL.audit ? window.DVL_TOOL_POINT_MODEL.audit() : null; }catch(_){}
    base.toolPointAdapter = adapter;
    base.toolPointAdapterAvailable = !!adapter;
    base.longShortSnapDisabled = !!(adapter && adapter.longShortSnapDisabled);
    base.drawingSnapEnabled = !!(adapter && adapter.drawingSnapEnabled);
    base.pass = !!(base.pass && adapter && adapter.pass && adapter.longShortSnapDisabled && adapter.drawingSnapEnabled);
    return base;
  };
})();
