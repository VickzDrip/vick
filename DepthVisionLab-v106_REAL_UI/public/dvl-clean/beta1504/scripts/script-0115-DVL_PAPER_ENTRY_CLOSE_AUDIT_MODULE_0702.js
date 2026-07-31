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

  var _selfId = "DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702";
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

  // ── A1. Title Beta 0.702 ─────────────────────────────────────────────────────
  var titleOk = document.title.indexOf("0.702") > -1;
  if(!titleOk) blockers.push("A1: title not 0.702: " + document.title);

  // ── A2. Badge BETA 0.875 ──────────────────────────────────────────────────────
  var badge = document.getElementById("versionBadge");
  var badgeOk = badge && badge.textContent.indexOf("0.702") > -1;
  if(!badgeOk) blockers.push("A2: badge not 0.702");

  // ── A3. Changelog 0.702 at top ────────────────────────────────────────────────
  var changelogOk = typeof window.DVL_CHANGELOG !== "undefined" &&
    window.DVL_CHANGELOG.length > 0 &&
    window.DVL_CHANGELOG[0].note &&
    window.DVL_CHANGELOG[0].note.indexOf("0.702") > -1;
  if(!changelogOk) blockers.push("A3: changelog 0.702 not at top");

  // ── A4. closeOrCancelPaperOrder exists in V2 ─────────────────────────────────
  var hasClose = _v2Src.indexOf("closeOrCancelPaperOrder") > -1;
  if(!hasClose) blockers.push("A4: closeOrCancelPaperOrder missing from V2");

  // ── A5. closeOrCancelPaperOrder splices from state.orders ────────────────────
  var hasSpli = _v2Src.indexOf("state.orders.splice") > -1;
  if(!hasSpli) blockers.push("A5: state.orders.splice missing from closeOrCancelPaperOrder");

  // ── A6. X handler calls closeOrCancelPaperOrder (not closePaperTrade) ────────
  var xCallsNew = _v2Src.indexOf("closeOrCancelPaperOrder(o.id)") > -1;
  if(!xCallsNew) blockers.push("A6: ENTRY X handler does not call closeOrCancelPaperOrder");

  // ── A7. closeOrCancelPaperOrder clears state.drag ────────────────────────────
  var clearsDrag = _v2Src.indexOf("state.drag=null") > -1;
  if(!clearsDrag) blockers.push("A7: closeOrCancelPaperOrder does not null state.drag");

  // ── A8. closeOrCancelPaperOrder clears state.edit ────────────────────────────
  var clearsEdit = _v2Src.indexOf("state.edit=null") > -1;
  if(!clearsEdit) blockers.push("A8: closeOrCancelPaperOrder does not null state.edit");

  // ── A9. closeOrCancelPaperOrder calls DVL_RELEASE_PAPER_LOCK ─────────────────
  var closeClearsLock = (function(){
    var idx = _v2Src.indexOf("function closeOrCancelPaperOrder");
    if(idx < 0) return false;
    var end = _v2Src.indexOf("}", idx);
    return _v2Src.substring(idx, end+1).indexOf("DVL_RELEASE_PAPER_LOCK") > -1;
  })();
  if(!closeClearsLock) blockers.push("A9: closeOrCancelPaperOrder does not call DVL_RELEASE_PAPER_LOCK");

  // ── A10. _isPaperDragTarget excludes dvl-pv2p-close ──────────────────────────
  var guardExcludesClose = _guardSrc.indexOf("dvl-pv2p-close") > -1;
  if(!guardExcludesClose) blockers.push("A10: guard _isPaperDragTarget missing dvl-pv2p-close exclusion");

  // ── A11. Exclusions checked BEFORE drag targets in guard ─────────────────────
  var guardExclFirst = (function(){
    var idx = _guardSrc.indexOf("_isPaperDragTarget");
    var body = _guardSrc.substring(idx, _guardSrc.indexOf("function _activateLock"));
    var closeIdx = body.indexOf("dvl-pv2p-close");
    var hitIdx = body.indexOf("dvl-pv2p-hit");
    return closeIdx > -1 && hitIdx > -1 && closeIdx < hitIdx;
  })();
  if(!guardExclFirst) blockers.push("A11: guard checks exclusions after drag targets (wrong order)");

  // ── A12. X click has stopImmediatePropagation ────────────────────────────────
  var xHasStop = (function(){
    var idx = _v2Src.indexOf("closeOrCancelPaperOrder(o.id)");
    if(idx < 0) return false;
    var before = _v2Src.substring(Math.max(0, idx-200), idx);
    return before.indexOf("stopImmediatePropagation") > -1;
  })();
  if(!xHasStop) blockers.push("A12: ENTRY X click missing stopImmediatePropagation");

  // ── A13. DVL_RELEASE_PAPER_LOCK is a function ─────────────────────────────────
  var releaseOk = typeof window.DVL_RELEASE_PAPER_LOCK === "function";
  if(!releaseOk) blockers.push("A13: window.DVL_RELEASE_PAPER_LOCK not a function");

  // ── A14. Guard lock fix 0701 still present ───────────────────────────────────
  var guardPresent = _cntId(scriptEls, "DVL_PAPER_LOCK_FIX_GUARD_0701") === 1;
  if(!guardPresent) blockers.push("A14: DVL_PAPER_LOCK_FIX_GUARD_0701 missing");

  // ── A15. _onPaperDown has no stopPropagation ──────────────────────────────────
  var noStopProp = _guardSrc.indexOf("ev.stopPropagation()") === -1;
  if(!noStopProp) blockers.push("A15: guard still has ev.stopPropagation in _onPaperDown");

  // ── A16. Guard handles touchend/touchcancel ───────────────────────────────────
  var guardTouch = _guardSrc.indexOf("touchend") > -1 && _guardSrc.indexOf("touchcancel") > -1;
  if(!guardTouch) blockers.push("A16: guard missing touchend/touchcancel");

  // ── A17. startDrag skips X button (data-close-trade check) ───────────────────
  var startSkipsX = _v2Src.indexOf("closeTrade") > -1;
  if(!startSkipsX) blockers.push("A17: pointerdown handler missing close-trade skip");

  // ── A18. TP drag preserved (startDrag in V2) ─────────────────────────────────
  var hasStartDrag = _v2Src.indexOf("function startDrag") > -1 ||
                     _v2Src.indexOf("startDrag(ev)") > -1;
  if(!hasStartDrag) blockers.push("A18: startDrag missing from V2");

  // ── A19. SL drag preserved ───────────────────────────────────────────────────
  var hasSL = _v2Src.indexOf("'sl'") > -1 || _v2Src.indexOf('"sl"') > -1;
  if(!hasSL) blockers.push("A19: SL kind missing from V2");

  // ── A20. ENTRY drag preserved ────────────────────────────────────────────────
  var hasEntry = _v2Src.indexOf("'entry'") > -1 || _v2Src.indexOf('"entry"') > -1;
  if(!hasEntry) blockers.push("A20: entry kind missing from V2");

  // ── A21. TP/SL edit OK/X preserved ──────────────────────────────────────────
  var hasEditOkX = _v2Src.indexOf("confirmTpSlEdit") > -1;
  if(!hasEditOkX) blockers.push("A21: confirmTpSlEdit missing from V2");

  // ── A22. Header leak still fixed ────────────────────────────────────────────
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
  if(!noOrphan) blockers.push("A22: orphan text before .app: " + _orphan.join("|"));

  // ── A23. V2 Pro layer unique ─────────────────────────────────────────────────
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("A23: multiple #dvlPaperLayerV2Pro: " + v2LayerCount);
  if(v2LayerCount < 1) warnings.push("A23: #dvlPaperLayerV2Pro not yet in DOM");

  // ── A24. Legacy paper hidden ─────────────────────────────────────────────────
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("A24: #dvlPaperLayer still visible");

  // ── A25. Final locks 0659-0662 present ───────────────────────────────────────
  var missingLocks = [];
  for(var _fl=0;_fl<FINAL_LOCK_CSS.length;_fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[_fl])!==1) missingLocks.push(FINAL_LOCK_CSS[_fl]);
  }
  if(missingLocks.length > 0) blockers.push("A25: final locks missing: " + missingLocks.join(", "));

  // ── A26. Zero _brokerToken ───────────────────────────────────────────────────
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push("A26: " + _brokerToken + " found in source");

  // ── A27. Zero Real order ─────────────────────────────────────────────────────
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push("A27: " + _realOrder + " found in source");

  // ── A28. No API key in audit module ──────────────────────────────────────────
  var noApiKey = _modSrc.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("A28: apiKey found in audit module");

  // ── A29. drawSoon intact ─────────────────────────────────────────────────────
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn] === "function" ||
                    _srcFull.indexOf("function drawSoon") > -1;
  if(!hasDrawSoon) warnings.push("A29: drawSoon not found");

  var pass = (
    titleOk && badgeOk && changelogOk &&
    hasClose && hasSpli && xCallsNew &&
    clearsDrag && clearsEdit && closeClearsLock &&
    guardExcludesClose && guardExclFirst &&
    xHasStop && releaseOk &&
    guardPresent && noStopProp && guardTouch &&
    startSkipsX && hasStartDrag && hasSL && hasEntry && hasEditOkX &&
    noOrphan && v2LayerCount <= 1 && legacyHidden &&
    missingLocks.length === 0 && noBroker && noRealOrder
  );

  _lastAudit = {
    pass:               pass,
    titleOk:            titleOk,
    badgeOk:            badgeOk,
    changelogOk:        changelogOk,
    hasClose:           hasClose,
    hasSpli:            hasSpli,
    xCallsNew:          xCallsNew,
    clearsDrag:         clearsDrag,
    clearsEdit:         clearsEdit,
    closeClearsLock:    closeClearsLock,
    guardExcludesClose: guardExcludesClose,
    guardExclFirst:     guardExclFirst,
    xHasStop:           xHasStop,
    releaseOk:          releaseOk,
    guardPresent:       guardPresent,
    noStopProp:         noStopProp,
    guardTouch:         guardTouch,
    startSkipsX:        startSkipsX,
    hasStartDrag:       hasStartDrag,
    hasSL:              hasSL,
    hasEntry:           hasEntry,
    hasEditOkX:         hasEditOkX,
    noOrphan:           noOrphan,
    v2LayerCount:       v2LayerCount,
    legacyHidden:       legacyHidden,
    finalLocksOk:       missingLocks.length === 0,
    noBroker:           noBroker,
    noRealOrder:        noRealOrder,
    blockers:           blockers,
    warnings:           warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_ENTRY_CLOSE_AUDIT = {
  VERSION:      "0.702",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
