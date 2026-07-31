(function(){
  "use strict";

  function audit(){
    var style = window.DVL_CANDLE_RENDER_STYLE_MODEL || null;
    var bridge = window.DVL_CANDLE_RENDER_BRIDGE || null;
    var geom = window.DVL_CANDLE_GEOMETRY_MODEL || null;
    var probe = null;

    try{
      if(style && typeof style.renderProps === "function"){
        probe = style.renderProps(
          { open:1, high:2, low:0.5, close:1.5 },
          { step:100, bodyW:28, width:28, hitW:28, halfBodyW:14, halfHitW:14 }
        );
      }
    }catch(_){}

    return {
      version:"0.941",
      styleModelAvailable:!!style,
      renderBridgeAvailable:!!bridge,
      geometryModelAvailable:!!geom,
      legacyWidthPreserved:!!(probe && probe.metrics && probe.metrics.legacyWidthPreserved),
      probeBodyW:probe && probe.metrics ? probe.metrics.bodyW : null,
      expectedBodyW:28,
      widthFixPass:!!(probe && probe.metrics && Math.abs(Number(probe.metrics.bodyW) - 28) < 0.001),
      connectedToRuntime:!!bridge,
      pass:!!(style && bridge && geom && probe && probe.metrics && Math.abs(Number(probe.metrics.bodyW) - 28) < 0.001)
    };
  }

  window.DVL_CANDLE_WIDTH_TILT_FIX_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var fx = audit();
    base.candleWidthTiltFix = fx;
    base.candleWidthTiltFixAvailable = !!fx.pass;
    base.pass = !!(base.pass !== false && fx.pass);
    return base;
  };
})();
