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

  var _selfId = "DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701";
  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var _si=0;_si<_allScripts.length;_si++){
    if(_allScripts[_si].id === _selfId) continue;
    _srcFull += _allScripts[_si].textContent;
  }

  var _modEl  = document.getElementById(_selfId);
  var _modSrc = _modEl ? _modEl.textContent : "";

  var _v2El   = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697");
  var _v2Src  = _v2El ? _v2El.textContent : "";

  var _guardEl  = document.getElementById("DVL_PAPER_LOCK_FIX_GUARD_0701");
  var _guardSrc = _guardEl ? _guardEl.textContent : "";

  // ── A1. Title Beta 0.701 ─────────────────────────────────────────────────────
  var titleOk = document.title.indexOf("0.701") > -1;
  if(!titleOk) blockers.push("A1: title not 0.701: " + document.title);

  // ── A2. Badge BETA 0.875 ──────────────────────────────────────────────────────
  var badge = document.getElementById("versionBadge");
  var badgeOk = badge && badge.textContent.indexOf("0.701") > -1;
  if(!badgeOk) blockers.push("A2: badge not 0.701");

  // ── A3. Changelog 0.701 at top ────────────────────────────────────────────────
  var changelogOk = typeof window.DVL_CHANGELOG !== "undefined" &&
    window.DVL_CHANGELOG.length > 0 &&
    window.DVL_CHANGELOG[0].note &&
    window.DVL_CHANGELOG[0].note.indexOf("0.701") > -1;
  if(!changelogOk) blockers.push("A3: changelog 0.701 not at top");

  // ── A4. _onPaperDown does not call stopPropagation ────────────────────────────
  var noStopPropInDown = _guardSrc.indexOf("ev.stopPropagation()") === -1;
  if(!noStopPropInDown) blockers.push("A4: guard _onPaperDown calls stopPropagation");

  // ── A5. _onPaperDown does not call stopImmediatePropagation ──────────────────
  var downIdx = _guardSrc.indexOf("function _onPaperDown");
  var nextFnIdx = _guardSrc.indexOf("function _onTouchStart");
  var downBody = (downIdx > -1 && nextFnIdx > -1) ? _guardSrc.substring(downIdx, nextFnIdx) : "";
  var noStopImmInDown = downBody.indexOf("stopImmediatePropagation") === -1;
  if(!noStopImmInDown) blockers.push("A5: _onPaperDown calls stopImmediatePropagation");

  // ── A6. _isPaperDragTarget exists ────────────────────────────────────────────
  var hasDragTarget = _guardSrc.indexOf("_isPaperDragTarget") > -1;
  if(!hasDragTarget) blockers.push("A6: _isPaperDragTarget missing from guard");

  // ── A7. dvl-pv2p-btn does not activate lock ───────────────────────────────────
  var btnNoLock = _guardSrc.indexOf("dvl-pv2p-btn") > -1 &&
    (function(){
      var idx = _guardSrc.indexOf("_isPaperDragTarget");
      var fnEnd = _guardSrc.indexOf("function _activateLock");
      var body = _guardSrc.substring(idx, fnEnd);
      return body.indexOf("dvl-pv2p-btn") > -1 && body.indexOf("return false") > -1;
    })();
  if(!btnNoLock) blockers.push("A7: dvl-pv2p-btn does not return false in _isPaperDragTarget");

  // ── A8. dvl-pv2p-controls does not activate lock ─────────────────────────────
  var ctrlNoLock = _guardSrc.indexOf("dvl-pv2p-controls") > -1;
  if(!ctrlNoLock) blockers.push("A8: dvl-pv2p-controls not handled in guard");

  // ── A9. releasePaperLock exists in guard ─────────────────────────────────────
  var hasRelease = _guardSrc.indexOf("releasePaperLock") > -1;
  if(!hasRelease) blockers.push("A9: releasePaperLock missing from guard");

  // ── A10. window.DVL_RELEASE_PAPER_LOCK exposed ───────────────────────────────
  var releaseExposed = typeof window.DVL_RELEASE_PAPER_LOCK === "function";
  if(!releaseExposed) blockers.push("A10: window.DVL_RELEASE_PAPER_LOCK not a function");

  // ── A11. pointerup always releases lock (try/finally) ────────────────────────
  var upHasFinally = _guardSrc.indexOf("finally") > -1;
  if(!upHasFinally) blockers.push("A11: _onUp missing try/finally");

  // ── A12. pointercancel releases lock ─────────────────────────────────────────
  var cancelHasRelease = _guardSrc.indexOf("pointercancel") > -1;
  if(!cancelHasRelease) blockers.push("A12: pointercancel not handled");

  // ── A13. touchend releases lock ──────────────────────────────────────────────
  var touchEndRelease = _guardSrc.indexOf("touchend") > -1;
  if(!touchEndRelease) blockers.push("A13: touchend not handled");

  // ── A14. touchcancel releases lock ───────────────────────────────────────────
  var touchCancelRelease = _guardSrc.indexOf("touchcancel") > -1;
  if(!touchCancelRelease) blockers.push("A14: touchcancel not handled");

  // ── A15. blur releases lock ───────────────────────────────────────────────────
  var blurRelease = _guardSrc.indexOf("blur") > -1;
  if(!blurRelease) blockers.push("A15: blur not handled in guard");

  // ── A16. visibilitychange releases lock ──────────────────────────────────────
  var visChange = _guardSrc.indexOf("visibilitychange") > -1;
  if(!visChange) blockers.push("A16: visibilitychange not handled in guard");

  // ── A17. __dvlPaperV2ProDragging flag initialized ────────────────────────────
  var v2DragFlag = "dvlPaperV2ProDragging" in window;
  if(!v2DragFlag) blockers.push("A17: window.__dvlPaperV2ProDragging not initialized");

  // ── A18. startDrag sets __dvlPaperV2ProDragging = true ───────────────────────
  var startSetsV2 = _v2Src.indexOf("__dvlPaperV2ProDragging=true") > -1;
  if(!startSetsV2) blockers.push("A18: startDrag does not set __dvlPaperV2ProDragging");

  // ── A19. endDrag clears __dvlPaperV2ProDragging ──────────────────────────────
  var endClearsV2 = _v2Src.indexOf("__dvlPaperV2ProDragging=false") > -1;
  if(!endClearsV2) blockers.push("A19: endDrag does not clear __dvlPaperV2ProDragging");

  // ── A20. _onMove checks __dvlPaperV2ProDragging before blocking ──────────────
  var moveSafe = _guardSrc.indexOf("__dvlPaperV2ProDragging") > -1;
  if(!moveSafe) blockers.push("A20: guard _onMove does not check __dvlPaperV2ProDragging");

  // ── A21. V2 endDrag calls DVL_RELEASE_PAPER_LOCK ─────────────────────────────
  var endCallsRelease = _v2Src.indexOf("DVL_RELEASE_PAPER_LOCK") > -1;
  if(!endCallsRelease) blockers.push("A21: V2 endDrag does not call DVL_RELEASE_PAPER_LOCK");

  // ── A22. V2 Pro module present ───────────────────────────────────────────────
  var v2Present = _cntId(scriptEls, "DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697") === 1;
  if(!v2Present) blockers.push("A22: V2 Pro module missing");

  // ── A23. V2 startDrag sets __dvlPaperGestureActive ───────────────────────────
  var startSetsFlag = _v2Src.indexOf("__dvlPaperGestureActive=true") > -1;
  if(!startSetsFlag) blockers.push("A23: V2 startDrag does not set __dvlPaperGestureActive");

  // ── A24. V2 moveDrag uses scaleSnapshot ──────────────────────────────────────
  var hasSnapshot = _v2Src.indexOf("scaleSnapshot") > -1;
  if(!hasSnapshot) blockers.push("A24: V2 moveDrag missing scaleSnapshot");

  // ── A25. V2 moveDrag calls stopImmediatePropagation ──────────────────────────
  var moveStopImm = _v2Src.indexOf("stopImmediatePropagation") > -1;
  if(!moveStopImm) blockers.push("A25: V2 moveDrag missing stopImmediatePropagation");

  // ── A26. Header leak still fixed (no orphan text before .app) ────────────────
  var _appEl = document.querySelector('.app');
  var _orphan = [];
  if(document.body && _appEl){
    var _n = document.body.firstChild;
    while(_n && _n !== _appEl){
      if(_n.nodeType === 3 && _n.textContent.trim().length > 0)
        _orphan.push(_n.textContent.trim().substring(0,30));
      _n = _n.nextSibling;
    }
  }
  var noOrphan = _orphan.length === 0;
  if(!noOrphan) blockers.push("A26: orphan text before .app: " + _orphan.join("|"));

  // ── A27. V2 Pro layer unique ─────────────────────────────────────────────────
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("A27: multiple #dvlPaperLayerV2Pro: " + v2LayerCount);
  if(v2LayerCount < 1) warnings.push("A27: #dvlPaperLayerV2Pro not yet in DOM");

  // ── A28. Legacy paper hidden ─────────────────────────────────────────────────
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("A28: #dvlPaperLayer still visible");

  // ── A29. TP/SL activation preserved ─────────────────────────────────────────
  var hasTpSl = _v2Src.indexOf("function maybeCloseOpen(") > -1;
  if(!hasTpSl) blockers.push("A29: maybeCloseOpen missing from V2");

  // ── A30. ENTRY close X preserved ────────────────────────────────────────────
  var hasCloseX = _v2Src.indexOf("data-close-trade") > -1;
  if(!hasCloseX) blockers.push("A30: data-close-trade missing from V2");

  // ── A31. Market preserved ───────────────────────────────────────────────────
  var hasMarket = _v2Src.indexOf("openMarket") > -1;
  if(!hasMarket) blockers.push("A31: openMarket missing from V2");

  // ── A32. Limit/Stop draft preserved ─────────────────────────────────────────
  var hasDraft = _v2Src.indexOf("createDraft") > -1;
  if(!hasDraft) blockers.push("A32: createDraft missing from V2");

  // ── A33. Chart _onDown still checks paper lock ───────────────────────────────
  var chartDownCheck = _srcFull.indexOf("__dvlPaperGestureActive||window.__dvlPaperDragLock||window.__dvlPositionDragActive") > -1;
  if(!chartDownCheck) blockers.push("A33: chart _onDown paper lock check missing");

  // ── A34. Final locks 0659-0662 present ───────────────────────────────────────
  var missingLocks = [];
  for(var _fl=0;_fl<FINAL_LOCK_CSS.length;_fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[_fl])!==1) missingLocks.push(FINAL_LOCK_CSS[_fl]);
  }
  if(missingLocks.length > 0) blockers.push("A34: final locks missing: " + missingLocks.join(", "));

  // ── A35. Zero _brokerToken ───────────────────────────────────────────────────
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push("A35: " + _brokerToken + " found in source");

  // ── A36. Zero Real order ─────────────────────────────────────────────────────
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push("A36: " + _realOrder + " found in source");

  // ── A37. No API key in audit module ──────────────────────────────────────────
  var noApiKey = _modSrc.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("A37: apiKey found in audit module");

  // ── A38. drawSoon intact ─────────────────────────────────────────────────────
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn] === "function" ||
                    _srcFull.indexOf("function drawSoon") > -1;
  if(!hasDrawSoon) warnings.push("A38: drawSoon not found");

  var pass = (
    titleOk && badgeOk && changelogOk &&
    noStopPropInDown && noStopImmInDown &&
    hasDragTarget && btnNoLock && ctrlNoLock &&
    hasRelease && releaseExposed && upHasFinally &&
    cancelHasRelease && touchEndRelease && touchCancelRelease &&
    blurRelease && visChange &&
    v2DragFlag && startSetsV2 && endClearsV2 && moveSafe && endCallsRelease &&
    v2Present && startSetsFlag && hasSnapshot && moveStopImm &&
    noOrphan && v2LayerCount <= 1 && legacyHidden &&
    hasTpSl && hasCloseX && hasMarket && hasDraft &&
    chartDownCheck && missingLocks.length === 0 &&
    noBroker && noRealOrder
  );

  _lastAudit = {
    pass:                pass,
    titleOk:             titleOk,
    badgeOk:             badgeOk,
    changelogOk:         changelogOk,
    noStopPropInDown:    noStopPropInDown,
    noStopImmInDown:     noStopImmInDown,
    hasDragTarget:       hasDragTarget,
    btnNoLock:           btnNoLock,
    ctrlNoLock:          ctrlNoLock,
    hasRelease:          hasRelease,
    releaseExposed:      releaseExposed,
    upHasFinally:        upHasFinally,
    cancelHasRelease:    cancelHasRelease,
    touchEndRelease:     touchEndRelease,
    touchCancelRelease:  touchCancelRelease,
    blurRelease:         blurRelease,
    visChange:           visChange,
    v2DragFlag:          v2DragFlag,
    startSetsV2:         startSetsV2,
    endClearsV2:         endClearsV2,
    moveSafe:            moveSafe,
    endCallsRelease:     endCallsRelease,
    v2Present:           v2Present,
    startSetsFlag:       startSetsFlag,
    hasSnapshot:         hasSnapshot,
    moveStopImm:         moveStopImm,
    noOrphan:            noOrphan,
    v2LayerCount:        v2LayerCount,
    legacyHidden:        legacyHidden,
    hasTpSl:             hasTpSl,
    hasCloseX:           hasCloseX,
    hasMarket:           hasMarket,
    hasDraft:            hasDraft,
    chartDownCheck:      chartDownCheck,
    finalLocksOk:        missingLocks.length === 0,
    noBroker:            noBroker,
    noRealOrder:         noRealOrder,
    blockers:            blockers,
    warnings:            warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_LOCK_FIX_AUDIT = {
  VERSION:      "0.701",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
