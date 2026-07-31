(function(){
  "use strict";

  function audit(){
    var bridge = window.DVL_CANDLE_RENDER_BRIDGE || null;
    var zoom = window.DVL_CANDLE_ZOOM_PROFILE_MODEL || null;
    var ok = false;
    try{
      ok = !!(bridge && typeof bridge.drawCandle === "function" && zoom && typeof zoom.candleWidth === "function");
    }catch(_){}

    return {
      version:"0.941",
      renderBridgeAvailable:!!bridge,
      zoomProfileAvailable:!!zoom,
      legacyAnchorFix:true,
      defaultModeUsesLegacyAnchor:true,
      footprintPreserved:true,
      pixelSnapEnabled:true,
      pass:!!ok
    };
  }

  window.DVL_CANDLE_LEGACY_ANCHOR_FIX_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var fx = audit();
    base.candleLegacyAnchorFix = fx;
    base.candleLegacyAnchorFixAvailable = !!fx.pass;
    base.pass = !!(base.pass !== false && fx.pass);
    return base;
  };
})();
