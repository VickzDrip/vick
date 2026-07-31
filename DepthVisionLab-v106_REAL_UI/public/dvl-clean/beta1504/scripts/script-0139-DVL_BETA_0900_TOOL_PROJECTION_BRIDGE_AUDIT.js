(function(){
  "use strict";
  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }

    var tpm = null;
    try{ tpm = window.DVL_TOOL_POINT_MODEL && window.DVL_TOOL_POINT_MODEL.audit ? window.DVL_TOOL_POINT_MODEL.audit() : null; }catch(_){}

    base.toolProjectionBridge = {
      version:"0.941",
      toolPointModelAvailable:!!tpm,
      projectionBridgeAvailable:!!(tpm && tpm.projectionBridgeAvailable),
      projectionBridgeActive:!!(tpm && tpm.projectionBridgeActive),
      longShortSnapDisabled:!!(tpm && tpm.longShortSnapDisabled)
    };

    base.pass = !!(base.pass !== false && base.toolProjectionBridge.projectionBridgeAvailable && base.toolProjectionBridge.longShortSnapDisabled);
    return base;
  };
})();
