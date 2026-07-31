(function(){
  "use strict";

  function typeCount(){
    var out = {};
    try{
      var arr = Array.isArray(window.drawings) ? window.drawings : [];
      arr.forEach(function(d){
        var t = d && (d.type || d.kind || d.tool || "unknown");
        out[t] = (out[t] || 0) + 1;
      });
    }catch(_){}
    return out;
  }

  function safeFn(name){
    try{ return typeof window[name] === "function"; }catch(_){ return false; }
  }

  function safeObj(name){
    try{ return !!window[name]; }catch(_){ return false; }
  }

  function toolButtonInfo(){
    var selectors = [
      "[data-tool]",
      "[data-draw-tool]",
      ".dvlDrawTool",
      ".dvlDrawBtn",
      ".toolBtn",
      "#dvlDrawCtxBar button",
      ".dvl-draw-ctx button"
    ];
    var buttons = [];
    selectors.forEach(function(sel){
      try{
        document.querySelectorAll(sel).forEach(function(btn){
          if(buttons.indexOf(btn) < 0) buttons.push(btn);
        });
      }catch(_){}
    });
    return buttons.map(function(btn){
      return {
        text:(btn.textContent || "").trim().slice(0,32),
        tool:btn.getAttribute("data-tool") || btn.getAttribute("data-draw-tool") || null,
        id:btn.id || null,
        className:String(btn.className || "").slice(0,80)
      };
    });
  }

  function audit(){
    var drawingsArr = [];
    try{ drawingsArr = Array.isArray(window.drawings) ? window.drawings : []; }catch(_){ drawingsArr = []; }

    var activeTool = null;
    try{ activeTool = window.activeDrawTool || window.activeTool || window.drawingTool || window.selectedTool || null; }catch(_){}

    var selectedDrawing = null;
    try{ selectedDrawing = window.selectedDrawing || window.activeDrawing || window.__dvlSelectedDrawing || null; }catch(_){}

    var btns = toolButtonInfo();

    var modules = {
      drawingGeometryModel:safeObj("DVL_DRAWING_GEOMETRY_MODEL"),
      drawingTransformModel:safeObj("DVL_DRAWING_TRANSFORM_MODEL"),
      candleGeometryModel:safeObj("DVL_CANDLE_GEOMETRY_MODEL"),
      snapCandidateModel:safeObj("DVL_SNAP_CANDIDATE_MODEL"),
      toolPipelineAudit:safeFn("DVL_TOOL_PIPELINE_AUDIT"),
      drawingHitFn:safeFn("_hitDrawing"),
      drawingHandleFn:safeFn("_hitHandles"),
      applyBodyDragFn:safeFn("_applyBodyDrag"),
      applyHandleDragFn:safeFn("_applyHandleDrag")
    };

    return {
      version:"0.958",
      step:"Tools/Drawings Audit Guard",
      noVisualChange:true,
      noApiTouch:true,
      noFallbackTouch:true,
      appVersion:window.DVL_APP_VERSION || null,
      activeTool:activeTool,
      selectedDrawingType:selectedDrawing && (selectedDrawing.type || selectedDrawing.kind || selectedDrawing.tool) || null,
      drawingsCount:drawingsArr.length,
      drawingsByType:typeCount(),
      toolButtonsCount:btns.length,
      toolButtons:btns.slice(0,30),
      modules:modules,
      expectedTools:[
        "line",
        "rectangle",
        "text",
        "arrow",
        "ruler",
        "long",
        "short"
      ],
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:!!(
        modules.drawingGeometryModel &&
        modules.drawingTransformModel &&
        modules.drawingHitFn &&
        modules.drawingHandleFn &&
        modules.applyBodyDragFn &&
        modules.applyHandleDragFn
      )
    };
  }

  window.DVL_TOOLS_DRAWINGS_AUDIT_GUARD = {
    version:"0.958",
    audit:audit
  };

  window.DVL_TOOLS_DRAWINGS_FINAL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var td = audit();
    base.toolsDrawingsAuditGuard = td;
    base.toolsDrawingsAuditGuardAvailable = true;
    base.pass = !!(base.pass !== false && td.pass !== false);
    return base;
  };
})();
