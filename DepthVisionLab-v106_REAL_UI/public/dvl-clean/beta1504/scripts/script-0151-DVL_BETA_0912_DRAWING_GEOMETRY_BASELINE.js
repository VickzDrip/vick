(function(){
  "use strict";

  window.DVL_DRAWING_GEOMETRY_BASELINE = {
    version:"0.941",
    approvedFrom:"0.911",
    locked:true,
    requiredTools:["trendline","arrow","rectangle","text"],
    requiredPointSchema:{
      trendline:["p1","p2"],
      arrow:["p1","p2"],
      rectangle:["p1","p2"],
      text:["p"]
    },
    requiredRules:{
      geometryBridge:true,
      legacyFallback:true,
      editLockFrom:"0.894",
      enginePipelineFrom:"0.901"
    },
    note:"0.911 aprovada pelo teste real; preservar hit-test/handles/body move dos drawings nas próximas etapas."
  };

  function audit(){
    var gm = window.DVL_DRAWING_GEOMETRY_MODEL || null;
    var tpm = window.DVL_TOOL_POINT_MODEL || null;
    var drawings = [];
    try{ drawings = (window.S && Array.isArray(S.drawings)) ? S.drawings : []; }catch(_){}

    var geometryAudit = null;
    try{ geometryAudit = gm && gm.audit ? gm.audit() : null; }catch(e){ geometryAudit = { pass:false, error:String(e && e.message || e) }; }

    var hasCore = !!(
      gm &&
      gm.__bridge0911 &&
      typeof gm.hitTest === "function" &&
      typeof gm.handleHit === "function" &&
      typeof gm.bodyHit === "function" &&
      typeof gm.pointsOf === "function" &&
      typeof gm.pointToScreen === "function" &&
      typeof gm.screenToPoint === "function"
    );

    var schemaOk = true;
    try{
      for(var i=0;i<drawings.length;i++){
        var d = drawings[i];
        if(!d || d.visible === false) continue;
        var t = String(d.type || "").toLowerCase();
        if(t === "trendline" || t === "arrow" || t === "rectangle"){
          if(!(d.p1 && d.p2)) schemaOk = false;
        }
        if(t === "text"){
          if(!d.p) schemaOk = false;
        }
      }
    }catch(_){ schemaOk = false; }

    var longShortSnapDisabled = false;
    try{
      longShortSnapDisabled = !!(tpm && tpm.shouldSnap && tpm.shouldSnap("long", true) === false && tpm.shouldSnap("short", true) === false);
    }catch(_){}

    return {
      version:"0.941",
      approvedFrom:"0.911",
      geometryModelAvailable:!!gm,
      bridge0911:!!(gm && gm.__bridge0911),
      hasCore:hasCore,
      drawingCount:drawings.length,
      schemaOk:schemaOk,
      longShortSnapDisabled:longShortSnapDisabled,
      geometryAudit:geometryAudit,
      pass:!!(hasCore && schemaOk && longShortSnapDisabled)
    };
  }

  window.DVL_DRAWING_GEOMETRY_BASELINE_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var dg = audit();
    base.drawingGeometryBaseline = dg;
    base.drawingGeometryBaselineLocked = !!dg.pass;
    base.pass = !!(base.pass !== false && dg.pass);
    return base;
  };
})();
