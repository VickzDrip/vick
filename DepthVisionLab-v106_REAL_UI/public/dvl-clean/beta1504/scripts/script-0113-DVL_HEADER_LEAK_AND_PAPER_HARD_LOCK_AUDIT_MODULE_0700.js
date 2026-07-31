(function(){
"use strict";

var _lastAudit = null;
var _brokerToken = 'Broker' + 'Connector';
var _realOrder   = 'placeReal' + 'Order';

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

function _cntId(els, id){
  var c=0; for(var i=0;i<els.length;i++){if(els[i].id===id)c++;} return c;
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  // Build full source excluding this module (avoids self-match on string checks)
  var _allScripts = document.querySelectorAll('script');
  var _selfId = "DVL_HEADER_LEAK_AND_PAPER_HARD_LOCK_AUDIT_MODULE_0700";
  var _srcFull = "";
  for(var _si=0;_si<_allScripts.length;_si++){
    if(_allScripts[_si].id === _selfId) continue;
    _srcFull += _allScripts[_si].textContent;
  }

  var _modEl  = document.getElementById(_selfId);
  var _modSrc = _modEl ? _modEl.textContent : "";

  var _v2El   = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697");
  var _v2Src  = _v2El ? _v2El.textContent : "";

  var _guardEl  = document.getElementById("DVL_PAPER_HARD_LOCK_GUARD_0700");
  var _guardSrc = _guardEl ? _guardEl.textContent : "";

  // ── A1. Title Beta 0.700 ─────────────────────────────────────────────────────
  var titleOk = document.title.indexOf("0.700") > -1;
  if(!titleOk) blockers.push("A1: title not 0.700: " + document.title);

  // ── A2. Badge BETA 0.875 ──────────────────────────────────────────────────────
  var badge = document.getElementById("versionBadge");
  var badgeOk = badge && badge.textContent.indexOf("0.700") > -1;
  if(!badgeOk) blockers.push("A2: badge not 0.700");

  // ── A3. Changelog 0.700 at top ────────────────────────────────────────────────
  var changelogOk = typeof window.DVL_CHANGELOG !== "undefined" &&
    window.DVL_CHANGELOG.length > 0 &&
    window.DVL_CHANGELOG[0].note &&
    window.DVL_CHANGELOG[0].note.indexOf("0.700") > -1;
  if(!changelogOk) blockers.push("A3: changelog 0.700 not at top");

  // ── A4. No orphan text node in body before .app ───────────────────────────────
  var _appEl = document.querySelector('.app');
  var _orphanText = [];
  if(document.body && _appEl){
    var _node = document.body.firstChild;
    while(_node && _node !== _appEl){
      if(_node.nodeType === 3 && _node.textContent.trim().length > 0){
        _orphanText.push(_node.textContent.trim().substring(0, 40));
      }
      _node = _node.nextSibling;
    }
  }
  var noOrphanText = _orphanText.length === 0;
  if(!noOrphanText) blockers.push("A4: orphan text before .app: " + _orphanText.join("|"));

  // ── A5. No text node containing 'DVL_DRAFT_CONFIRM' ──────────────────────────
  var _draftMarker = "DVL_DRAFT" + "_CONFIRM";
  var noDraftLeak = _orphanText.filter(function(t){ return t.indexOf(_draftMarker) > -1; }).length === 0;
  if(!noDraftLeak) blockers.push("A5: DVL_DRAFT_CONFIRM text visible in body");

  // ── A6. No text node containing 'window.DVL_' ────────────────────────────────
  var _wdvlMark = "window." + "DVL_";
  var noWDVLLeak = _orphanText.filter(function(t){ return t.indexOf(_wdvlMark) > -1; }).length === 0;
  if(!noWDVLLeak) blockers.push("A6: window.DVL_ text visible in body");

  // ── A7. Hard lock guard 0700 present ─────────────────────────────────────────
  var guardPresent = _cntId(scriptEls, "DVL_PAPER_HARD_LOCK_GUARD_0700") === 1;
  if(!guardPresent) blockers.push("A7: DVL_PAPER_HARD_LOCK_GUARD_0700 not found");

  // ── A8. Guard captures pointerdown ───────────────────────────────────────────
  var guardDown = _guardSrc.indexOf("pointerdown") > -1;
  if(!guardDown) blockers.push("A8: guard does not handle pointerdown");

  // ── A9. Guard captures touchstart ────────────────────────────────────────────
  var guardTouch = _guardSrc.indexOf("touchstart") > -1;
  if(!guardTouch) blockers.push("A9: guard does not handle touchstart");

  // ── A10. Guard has _isPaperTarget ────────────────────────────────────────────
  var guardTarget = _guardSrc.indexOf("_isPaperTarget") > -1;
  if(!guardTarget) blockers.push("A10: guard missing _isPaperTarget");

  // ── A11. Guard has _activateLock ─────────────────────────────────────────────
  var guardActivate = _guardSrc.indexOf("_activateLock") > -1;
  if(!guardActivate) blockers.push("A11: guard missing _activateLock");

  // ── A12. Guard clears chartPointers ──────────────────────────────────────────
  var guardClearsPointers = _guardSrc.indexOf("chartPointers.clear()") > -1;
  if(!guardClearsPointers) blockers.push("A12: guard does not clear chartPointers");

  // ── A13. Guard clears chartDragState ─────────────────────────────────────────
  var guardClearsDrag = _guardSrc.indexOf("chartDragState = null") > -1;
  if(!guardClearsDrag) blockers.push("A13: guard does not null chartDragState");

  // ── A14. Guard clears crosshair.active ───────────────────────────────────────
  var guardClearsCross = _guardSrc.indexOf("crosshair.active = false") > -1;
  if(!guardClearsCross) blockers.push("A14: guard does not clear crosshair.active");

  // ── A15. Guard uses stopImmediatePropagation ──────────────────────────────────
  var guardStopsImm = _guardSrc.indexOf("stopImmediatePropagation") > -1;
  if(!guardStopsImm) blockers.push("A15: guard missing stopImmediatePropagation");

  // ── A16. Guard handles pointermove ───────────────────────────────────────────
  var guardMove = _guardSrc.indexOf("pointermove") > -1;
  if(!guardMove) blockers.push("A16: guard does not handle pointermove");

  // ── A17. Guard handles pointerup ─────────────────────────────────────────────
  var guardUp = _guardSrc.indexOf("pointerup") > -1;
  if(!guardUp) blockers.push("A17: guard does not handle pointerup");

  // ── A18. Chart _onDown checks paper gesture lock ─────────────────────────────
  var chartDownCheck = _srcFull.indexOf("__dvlPaperGestureActive||window.__dvlPaperDragLock||window.__dvlPositionDragActive") > -1;
  if(!chartDownCheck) blockers.push("A18: chart _onDown does not check paper lock");

  // ── A19. Chart _onEnd checks paper lock ──────────────────────────────────────
  var chartEndCheck = _srcFull.indexOf("__dvlPaperGestureActive||window.__dvlPaperDragLock) return;") > -1;
  if(!chartEndCheck) blockers.push("A19: chart _onEnd does not check paper lock");

  // ── A20. Paper lock activates before chart pointerdown (guard in head) ────────
  var guardInHead = _guardEl && _guardEl.closest ? _guardEl.closest('head') !== null : false;
  if(!guardInHead) warnings.push("A20: guard not found in <head> (cannot verify priority)");

  // ── A21. V2 Pro module present ───────────────────────────────────────────────
  var v2Present = _cntId(scriptEls, "DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697") === 1;
  if(!v2Present) blockers.push("A21: V2 Pro module missing");

  // ── A22. V2 startDrag sets __dvlPaperGestureActive ───────────────────────────
  var startSetsFlag = _v2Src.indexOf("__dvlPaperGestureActive=true") > -1;
  if(!startSetsFlag) blockers.push("A22: V2 startDrag does not set __dvlPaperGestureActive");

  // ── A23. V2 endDrag clears __dvlPaperGestureActive ───────────────────────────
  var endClearsFlag = _v2Src.indexOf("__dvlPaperGestureActive=false") > -1;
  if(!endClearsFlag) blockers.push("A23: V2 endDrag does not clear __dvlPaperGestureActive");

  // ── A24. V2 moveDrag uses scaleSnapshot ──────────────────────────────────────
  var moveUsesSnapshot = _v2Src.indexOf("scaleSnapshot") > -1;
  if(!moveUsesSnapshot) blockers.push("A24: V2 moveDrag missing scaleSnapshot");

  // ── A25. moveDrag calls preventDefault ───────────────────────────────────────
  var movePrevent = _v2Src.indexOf("ev.preventDefault()") > -1;
  if(!movePrevent) blockers.push("A25: V2 moveDrag missing preventDefault");

  // ── A26. moveDrag calls stopPropagation ──────────────────────────────────────
  var moveStop = _v2Src.indexOf("ev.stopPropagation()") > -1;
  if(!moveStop) blockers.push("A26: V2 moveDrag missing stopPropagation");

  // ── A27. moveDrag calls stopImmediatePropagation ──────────────────────────────
  var moveStopImm = _v2Src.indexOf("stopImmediatePropagation") > -1;
  if(!moveStopImm) blockers.push("A27: V2 moveDrag missing stopImmediatePropagation");

  // ── A28. V2 startDrag sets setPointerCapture ──────────────────────────────────
  var hasCapture = _v2Src.indexOf("setPointerCapture") > -1;
  if(!hasCapture) blockers.push("A28: V2 startDrag missing setPointerCapture");

  // ── A29. V2 Pro layer unique ─────────────────────────────────────────────────
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("A29: multiple #dvlPaperLayerV2Pro: " + v2LayerCount);
  if(v2LayerCount < 1) warnings.push("A29: #dvlPaperLayerV2Pro not yet in DOM");

  // ── A30. Legacy paper hidden ─────────────────────────────────────────────────
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("A30: #dvlPaperLayer still visible");

  // ── A31. TP/SL activation preserved ─────────────────────────────────────────
  var hasTpSl = _v2Src.indexOf("function maybeCloseOpen(") > -1;
  if(!hasTpSl) blockers.push("A31: maybeCloseOpen missing from V2");

  // ── A32. TP/SL edit OK/X preserved ──────────────────────────────────────────
  var hasEditOkX = _v2Src.indexOf("confirmTpSlEdit") > -1;
  if(!hasEditOkX) blockers.push("A32: confirmTpSlEdit missing from V2");

  // ── A33. ENTRY close X preserved ────────────────────────────────────────────
  var hasCloseX = _v2Src.indexOf("data-close-trade") > -1;
  if(!hasCloseX) blockers.push("A33: data-close-trade missing from V2");

  // ── A34. Market preserved ───────────────────────────────────────────────────
  var hasMarket = _v2Src.indexOf("openMarket") > -1;
  if(!hasMarket) blockers.push("A34: openMarket missing from V2");

  // ── A35. Limit/Stop draft preserved ─────────────────────────────────────────
  var hasDraft = _v2Src.indexOf("createDraft") > -1;
  if(!hasDraft) blockers.push("A35: createDraft missing from V2");

  // ── A36. No position:fixed in V2 (labels stay in chart) ──────────────────────
  var noFixed = _v2Src.indexOf("position:fixed") === -1 && _v2Src.indexOf("position: fixed") === -1;
  if(!noFixed) blockers.push("A36: V2 uses position:fixed");

  // ── A37. Tools preserved ─────────────────────────────────────────────────────
  var toolsOk = _cntId(scriptEls, "DVL_BETA_0635_TAG_LEFT_FIX") === 1;
  if(!toolsOk) warnings.push("A37: DVL_BETA_0635_TAG_LEFT_FIX not found");

  // ── A38. Final locks 0659-0662 present ───────────────────────────────────────
  var missingLocks = [];
  for(var _fl=0;_fl<FINAL_LOCK_CSS.length;_fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[_fl])!==1) missingLocks.push(FINAL_LOCK_CSS[_fl]);
  }
  if(missingLocks.length > 0) blockers.push("A38: final locks missing: " + missingLocks.join(", "));

  // ── A39. Zero _brokerToken in source ────────────────────────────────────────
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push("A39: " + _brokerToken + " found in source");

  // ── A40. Zero Real order ─────────────────────────────────────────────────────
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push("A40: " + _realOrder + " found in source");

  // ── A41. No API key in audit module ──────────────────────────────────────────
  var noApiKey = _modSrc.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("A41: apiKey found in audit module");

  // ── A42. drawSoon intact ─────────────────────────────────────────────────────
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn] === "function" ||
                    _srcFull.indexOf("function drawSoon") > -1;
  if(!hasDrawSoon) warnings.push("A42: drawSoon not found");

  var pass = (
    titleOk && badgeOk && changelogOk &&
    noOrphanText && noDraftLeak && noWDVLLeak &&
    guardPresent && guardDown && guardTouch &&
    guardTarget && guardActivate &&
    guardClearsPointers && guardClearsDrag && guardClearsCross &&
    guardStopsImm && guardMove && guardUp &&
    chartDownCheck && chartEndCheck &&
    v2Present && startSetsFlag && endClearsFlag &&
    moveUsesSnapshot && movePrevent && moveStop && moveStopImm &&
    hasCapture && v2LayerCount <= 1 && legacyHidden &&
    hasTpSl && hasEditOkX && hasCloseX && hasMarket && hasDraft &&
    noFixed && missingLocks.length === 0 &&
    noBroker && noRealOrder
  );

  _lastAudit = {
    pass:                 pass,
    titleOk:              titleOk,
    badgeOk:              badgeOk,
    changelogOk:          changelogOk,
    noOrphanText:         noOrphanText,
    noDraftLeak:          noDraftLeak,
    noWDVLLeak:           noWDVLLeak,
    guardPresent:         guardPresent,
    guardDown:            guardDown,
    guardTouch:           guardTouch,
    guardTarget:          guardTarget,
    guardActivate:        guardActivate,
    guardClearsPointers:  guardClearsPointers,
    guardClearsDrag:      guardClearsDrag,
    guardClearsCross:     guardClearsCross,
    guardStopsImm:        guardStopsImm,
    guardMove:            guardMove,
    guardUp:              guardUp,
    chartDownCheck:       chartDownCheck,
    chartEndCheck:        chartEndCheck,
    v2Present:            v2Present,
    startSetsFlag:        startSetsFlag,
    endClearsFlag:        endClearsFlag,
    moveUsesSnapshot:     moveUsesSnapshot,
    movePrevent:          movePrevent,
    moveStop:             moveStop,
    moveStopImm:          moveStopImm,
    hasCapture:           hasCapture,
    v2LayerCount:         v2LayerCount,
    legacyHidden:         legacyHidden,
    hasTpSl:              hasTpSl,
    hasEditOkX:           hasEditOkX,
    hasCloseX:            hasCloseX,
    hasMarket:            hasMarket,
    hasDraft:             hasDraft,
    noFixed:              noFixed,
    finalLocksOk:         missingLocks.length === 0,
    noBroker:             noBroker,
    noRealOrder:          noRealOrder,
    blockers:             blockers,
    warnings:             warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_HARD_LOCK_AUDIT = {
  VERSION:      "0.700",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
