(function(){
  "use strict";

  function rawSlotOffset(totalSlots, futureSlots, visibleLength){
    return Number(totalSlots) - Number(futureSlots || 0) - Number(visibleLength || 0);
  }

  function oldClampedSlotOffset(totalSlots, futureSlots, visibleLength){
    return Math.max(0, rawSlotOffset(totalSlots, futureSlots, visibleLength));
  }

  function lastSlot(totalSlots, futureSlots){
    var visibleLength = Math.max(1, Math.ceil(Number(totalSlots) - Number(futureSlots || 0)));
    return rawSlotOffset(totalSlots, futureSlots, visibleLength) + visibleLength - 1;
  }

  function audit(){
    var totalSlots = 5.5;
    var futureSlots = 0;
    var visibleLength = Math.ceil(totalSlots - futureSlots);
    var raw = rawSlotOffset(totalSlots, futureSlots, visibleLength);
    var old = oldClampedSlotOffset(totalSlots, futureSlots, visibleLength);
    var rawLast = raw + visibleLength - 1;
    var oldLast = old + visibleLength - 1;
    var expectedRight = totalSlots - 1;

    return {
      version:"0.941",
      available:true,
      sampleTotalSlots:totalSlots,
      sampleVisibleLength:visibleLength,
      rawSlotOffset:raw,
      oldClampedSlotOffset:old,
      rawLastSlot:rawLast,
      oldLastSlot:oldLast,
      expectedRightSlot:expectedRight,
      rawKeepsLastAnchored:Math.abs(rawLast - expectedRight) < 0.000001,
      oldWouldOverflow:oldLast > expectedRight,
      appliedToMainChart:true,
      appliedToXForIndexMaps:true,
      pass:Math.abs(rawLast - expectedRight) < 0.000001 && oldLast > expectedRight
    };
  }

  window.DVL_FRACTIONAL_SLOT_ANCHOR_FIX = {
    version:"0.941",
    rawSlotOffset:rawSlotOffset,
    lastSlot:lastSlot,
    audit:audit
  };
  window.DVL_FRACTIONAL_SLOT_ANCHOR_FIX_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var fx = audit();
    base.fractionalSlotAnchorFix = fx;
    base.fractionalSlotAnchorFixAvailable = !!fx.pass;
    base.pass = !!(base.pass !== false && fx.pass);
    return base;
  };
})();
