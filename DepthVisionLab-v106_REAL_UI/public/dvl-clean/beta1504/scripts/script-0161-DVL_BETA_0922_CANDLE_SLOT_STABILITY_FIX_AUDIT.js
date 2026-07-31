(function(){
  "use strict";

  function currentMode(){
    try{ return String(candleMode || "normal").toLowerCase(); }catch(_){ return "normal"; }
  }

  function bridgeModePolicy(mode){
    mode = String(mode || currentMode()).toLowerCase();
    return {
      mode:mode,
      usesBridge:mode === "footprint" || window.DVL_FORCE_CANDLE_RENDER_BRIDGE === true,
      usesLegacyDirect:mode !== "footprint" && window.DVL_FORCE_CANDLE_RENDER_BRIDGE !== true
    };
  }

  function audit(){
    var zoom = window.DVL_CANDLE_ZOOM_PROFILE_MODEL || null;
    var bridge = window.DVL_CANDLE_RENDER_BRIDGE || null;
    var normal = bridgeModePolicy("normal");
    var hollow = bridgeModePolicy("hollow");
    var footprint = bridgeModePolicy("footprint");

    return {
      version:"0.941",
      zoomProfileAvailable:!!zoom,
      renderBridgeAvailable:!!bridge,
      normalUsesLegacyDirect:!!normal.usesLegacyDirect,
      hollowUsesLegacyDirect:!!hollow.usesLegacyDirect,
      footprintUsesBridge:!!footprint.usesBridge,
      tvLikeZoomPreserved:!!(zoom && typeof zoom.minViewCandles === "function" && zoom.minViewCandles("normal") > zoom.minViewCandles("footprint")),
      forceBridgeFlag:window.DVL_FORCE_CANDLE_RENDER_BRIDGE === true,
      pass:!!(zoom && bridge && normal.usesLegacyDirect && hollow.usesLegacyDirect && footprint.usesBridge)
    };
  }

  window.DVL_CANDLE_SLOT_STABILITY_FIX_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var st = audit();
    base.candleSlotStabilityFix = st;
    base.candleSlotStabilityFixAvailable = !!st.pass;
    base.pass = !!(base.pass !== false && st.pass);
    return base;
  };
})();
