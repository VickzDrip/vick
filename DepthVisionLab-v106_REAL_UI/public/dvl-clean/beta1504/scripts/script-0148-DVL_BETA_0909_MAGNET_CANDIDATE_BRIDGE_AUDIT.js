(function(){
  "use strict";

  function audit(){
    var magnet = window.DVL_TOOL_MAGNET || null;
    var candidates = window.DVL_SNAP_CANDIDATE_MODEL || null;
    var tpm = window.DVL_TOOL_POINT_MODEL || null;

    var sample = null;
    var snapped = null;
    try{
      var chart = window.DVL_CHART_MODEL || null;
      var cs = chart && chart.buildCoordinateSystem ? chart.buildCoordinateSystem() : null;
      if(cs && cs.candles && cs.candles.length){
        var i = Math.max(0, Math.min(Math.round(((cs.range && cs.range.end) || cs.candles.length - 1) - 1), cs.candles.length - 1));
        var c = cs.candles[i];
        sample = { index:i, idx:i, price:Number(c.close ?? c.c), x:cs.indexToX(i), y:cs.priceToY(Number(c.close ?? c.c)) };
        if(magnet && typeof magnet.snapPoint === "function") snapped = magnet.snapPoint(sample, cs);
      }
    }catch(_){}

    var longShortSnapDisabled = false;
    try{
      longShortSnapDisabled = !!(tpm && tpm.shouldSnap && tpm.shouldSnap("long", true) === false && tpm.shouldSnap("short", true) === false);
    }catch(_){}

    return {
      version:"0.941",
      magnetAvailable:!!magnet,
      candidateModelAvailable:!!candidates,
      snapPointAvailable:!!(magnet && typeof magnet.snapPoint === "function"),
      sampleAvailable:!!sample,
      candidateBridgeUsed:!!(snapped && snapped.magnetBridge === "candidate"),
      fallbackSafe:!!(snapped || !sample),
      longShortSnapDisabled:longShortSnapDisabled,
      pass:!!(magnet && candidates && typeof magnet.snapPoint === "function" && longShortSnapDisabled)
    };
  }

  window.DVL_MAGNET_CANDIDATE_BRIDGE_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var mb = audit();
    base.magnetCandidateBridge = mb;
    base.magnetCandidateBridgeAvailable = !!mb.pass;
    base.pass = !!(base.pass !== false && mb.pass);
    return base;
  };
})();
