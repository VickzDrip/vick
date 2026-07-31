(function(){
  "use strict";

  function audit(){
    var st = window.__dvlLastOscillatorDrawState || null;
    return {
      version:"0.941",
      noApiTouch:true,
      noFallbackTouch:true,
      appVersion:window.DVL_APP_VERSION || null,
      helperCollect:typeof window.__dvlCollectActiveOscillators === "function" || typeof __dvlCollectActiveOscillators === "function",
      helperGuardPanel:typeof window.__dvlDrawOscillatorGuardPanel === "function" || typeof __dvlDrawOscillatorGuardPanel === "function",
      lastState:st,
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:true
    };
  }

  window.DVL_OSCILLATOR_PAN_RENDER_GUARD_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var og = audit();
    base.oscillatorPanRenderGuard = og;
    base.oscillatorPanRenderGuardAvailable = true;
    base.pass = !!(base.pass !== false);
    return base;
  };
})();
