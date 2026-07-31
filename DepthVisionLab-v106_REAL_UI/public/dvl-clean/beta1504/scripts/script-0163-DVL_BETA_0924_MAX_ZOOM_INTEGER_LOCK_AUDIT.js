(function(){
  "use strict";

  function audit(){
    var zoom = window.DVL_CANDLE_ZOOM_PROFILE_MODEL || null;
    var normalMin = null, hollowMin = null, footprintMin = null;
    try{
      normalMin = zoom && typeof zoom.minViewCandles === "function" ? zoom.minViewCandles("normal") : null;
      hollowMin = zoom && typeof zoom.minViewCandles === "function" ? zoom.minViewCandles("hollow") : null;
      footprintMin = zoom && typeof zoom.minViewCandles === "function" ? zoom.minViewCandles("footprint") : null;
    }catch(_){}

    return {
      version:"0.941",
      zoomProfileAvailable:!!zoom,
      normalMinView:normalMin,
      hollowMinView:hollowMin,
      footprintMinView:footprintMin,
      normalIntegerMaxZoom:Number.isInteger(Number(normalMin)),
      hollowIntegerMaxZoom:Number.isInteger(Number(hollowMin)),
      footprintWideReserved:Number(footprintMin) === 3,
      stableViewCountHelper:typeof __dvlStableViewCountForMode === "function",
      pass:!!(zoom && Number(normalMin) === 6 && Number(hollowMin) === 6 && Number(footprintMin) === 3 && typeof __dvlStableViewCountForMode === "function")
    };
  }

  window.DVL_MAX_ZOOM_INTEGER_LOCK_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var fx = audit();
    base.maxZoomIntegerLock = fx;
    base.maxZoomIntegerLockAvailable = !!fx.pass;
    base.pass = !!(base.pass !== false && fx.pass);
    return base;
  };
})();
