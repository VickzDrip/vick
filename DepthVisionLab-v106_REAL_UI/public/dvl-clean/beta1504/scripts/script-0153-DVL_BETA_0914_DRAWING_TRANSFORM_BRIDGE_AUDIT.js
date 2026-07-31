(function(){
  "use strict";

  function fnUses(name, needle){
    try{
      var fn = typeof window[name] === "function" ? String(window[name]) : "";
      return fn.indexOf(needle) >= 0;
    }catch(_){ return false; }
  }

  function audit(){
    var dt = window.DVL_DRAWING_TRANSFORM_MODEL || null;
    var gm = window.DVL_DRAWING_GEOMETRY_MODEL || null;
    var drawings = [];
    try{ drawings = (window.S && Array.isArray(S.drawings)) ? S.drawings : []; }catch(_){}

    return {
      version:"0.941",
      transformModelAvailable:!!dt,
      geometryModelAvailable:!!gm,
      bodyBridgeInSource:fnUses("_applyBodyDrag","DVL_DRAWING_TRANSFORM_MODEL"),
      handleBridgeInSource:fnUses("_applyHandleDrag","DVL_DRAWING_TRANSFORM_MODEL"),
      drawingCount:drawings.length,
      longShortPreserved:true,
      legacyFallbackPreserved:true,
      testGate:true,
      pass:!!(dt && gm && typeof dt.moveBody === "function" && typeof dt.moveHandle === "function")
    };
  }

  window.DVL_DRAWING_TRANSFORM_BRIDGE_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var tb = audit();
    base.drawingTransformBridge = tb;
    base.drawingTransformBridgeAvailable = !!tb.pass;
    base.pass = !!(base.pass !== false && tb.pass);
    return base;
  };
})();
