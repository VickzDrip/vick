(function(){
  "use strict";

  window.DVL_DRAWING_TRANSFORM_BASELINE = {
    version:"0.941",
    approvedFrom:"0.914",
    locked:true,
    requiredRuntimeHooks:[
      "_applyBodyDrag",
      "_applyHandleDrag"
    ],
    requiredModels:[
      "DVL_DRAWING_GEOMETRY_MODEL",
      "DVL_DRAWING_TRANSFORM_MODEL"
    ],
    requiredRules:{
      arrowLineRectangleTextTransform:true,
      longShortOwnFlow:true,
      legacyFallback:true,
      editLockFrom:"0.894",
      geometryBridgeFrom:"0.911",
      transformBridgeFrom:"0.914"
    },
    note:"0.914 aprovada no teste real; preservar body/handle drag dos drawings nas próximas etapas."
  };

  function fnUses(name, needle){
    try{
      var fn = typeof window[name] === "function" ? String(window[name]) : "";
      return fn.indexOf(needle) >= 0;
    }catch(_){ return false; }
  }

  function audit(){
    var dt = window.DVL_DRAWING_TRANSFORM_MODEL || null;
    var gm = window.DVL_DRAWING_GEOMETRY_MODEL || null;
    var tpm = window.DVL_TOOL_POINT_MODEL || null;

    var longShortSnapDisabled = false;
    try{
      longShortSnapDisabled = !!(tpm && tpm.shouldSnap && tpm.shouldSnap("long", true) === false && tpm.shouldSnap("short", true) === false);
    }catch(_){}

    return {
      version:"0.941",
      approvedFrom:"0.914",
      transformModelAvailable:!!dt,
      geometryModelAvailable:!!gm,
      bodyBridgeInSource:fnUses("_applyBodyDrag","DVL_DRAWING_TRANSFORM_MODEL"),
      handleBridgeInSource:fnUses("_applyHandleDrag","DVL_DRAWING_TRANSFORM_MODEL"),
      transformCore:!!(dt && typeof dt.moveBody === "function" && typeof dt.moveHandle === "function" && typeof dt.applyInto === "function"),
      geometryCore:!!(gm && typeof gm.hitTest === "function" && typeof gm.handleHit === "function" && typeof gm.bodyHit === "function"),
      longShortSnapDisabled:longShortSnapDisabled,
      pass:!!(
        dt &&
        gm &&
        typeof dt.moveBody === "function" &&
        typeof dt.moveHandle === "function" &&
        typeof dt.applyInto === "function" &&
        longShortSnapDisabled
      )
    };
  }

  window.DVL_DRAWING_TRANSFORM_BASELINE_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var tb = audit();
    base.drawingTransformBaseline = tb;
    base.drawingTransformBaselineLocked = !!tb.pass;
    base.pass = !!(base.pass !== false && tb.pass);
    return base;
  };
})();
