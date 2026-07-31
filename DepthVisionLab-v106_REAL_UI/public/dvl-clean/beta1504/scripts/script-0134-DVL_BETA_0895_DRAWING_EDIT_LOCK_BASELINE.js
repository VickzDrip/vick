(function(){
  "use strict";
  window.DVL_DRAWING_EDIT_LOCK_BASELINE = {
    version:"0.941",
    approvedFrom:"0.894",
    requiredTools:["trendline","arrow","rectangle","text"],
    note:"Arrow/Line/Rectangle/Text edit pointer lock approved on mobile; do not remove the drawing edit pointerdown capture before chart pan."
  };

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }

    var html = "";
    try{ html = document.documentElement ? document.documentElement.outerHTML : ""; }catch(_){}

    var lockFound =
      html.indexOf("__dvlDrawingEditPointerActive") >= 0 ||
      html.indexOf("DVL_DRAWING_EDIT_POINTER_LOCK") >= 0 ||
      html.indexOf("Drawing edit pointer lock") >= 0;

    base.drawingEditLockBaseline = {
      version:"0.941",
      approvedFrom:"0.894",
      lockFound:!!lockFound,
      requiredTools:["trendline","arrow","rectangle","text"]
    };

    base.pass = !!(base.pass !== false && lockFound);
    return base;
  };
})();
