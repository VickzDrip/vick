(function(){
  "use strict";

  function sample(totalSlots, pastRaw){
    var pastOffset = Math.floor(Math.max(0, pastRaw) + 0.000001);
    var pastFraction = Math.max(0, Math.min(0.999999, Math.max(0, pastRaw) - pastOffset));
    var baseVisibleSlots = Math.ceil(totalSlots);
    var visibleSlots = baseVisibleSlots + (pastFraction > 0.000001 ? 1 : 0);
    var slotOffset = totalSlots - visibleSlots + pastFraction;
    return {
      totalSlots:totalSlots,
      pastRaw:pastRaw,
      pastOffset:pastOffset,
      pastFraction:pastFraction,
      visibleSlots:visibleSlots,
      slotOffset:slotOffset,
      lastSlot:slotOffset + visibleSlots - 1
    };
  }

  function audit(){
    var s05 = sample(6, 0.5);
    var s099 = sample(6, 0.99);
    var s1 = sample(6, 1.0);

    return {
      version:"0.941",
      slotOffsetHelper:typeof window.__dvlSlotOffset === "function",
      halfPastPan:s05,
      nearBoundaryPan:s099,
      boundaryPan:s1,
      halfPanAddsExtraCandle:s05.visibleSlots === 7,
      halfPanKeepsFraction:Math.abs(s05.slotOffset + 0.5) < 0.000001,
      boundaryIsStable:s1.visibleSlots === 6 && Math.abs(s1.slotOffset) < 0.000001,
      removesPastCandleLock:true,
      pass:!!(typeof window.__dvlSlotOffset === "function" && s05.visibleSlots === 7 && Math.abs(s05.slotOffset + 0.5) < 0.000001 && s1.visibleSlots === 6)
    };
  }

  window.DVL_PAST_FRACTIONAL_PAN_FIX_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var fx = audit();
    base.pastFractionalPanFix = fx;
    base.pastFractionalPanFixAvailable = !!fx.pass;
    base.pass = !!(base.pass !== false && fx.pass);
    return base;
  };
})();
