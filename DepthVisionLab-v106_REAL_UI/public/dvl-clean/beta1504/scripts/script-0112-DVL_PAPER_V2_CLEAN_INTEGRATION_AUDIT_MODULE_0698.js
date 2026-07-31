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

  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var si=0;si<_allScripts.length;si++){ _srcFull+=_allScripts[si].textContent; }

  var _mod698    = document.getElementById("DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698");
  var _mod698src = _mod698 ? _mod698.textContent : "";

  // A1. DVL_PAPER_V2_PRO_ENABLED is true
  var v2ProEnabled = window.DVL_PAPER_V2_PRO_ENABLED === true;
  if(!v2ProEnabled) blockers.push("DVL_PAPER_V2_PRO_ENABLED !== true");

  // A2. html has dvl-paper-v2-pro-enabled class
  var v2ProClass = document.documentElement.classList.contains("dvl-paper-v2-pro-enabled");
  if(!v2ProClass) blockers.push("html missing dvl-paper-v2-pro-enabled class");

  // A3. #dvlPaperLayerV2Pro exists
  var v2ProLayer = document.getElementById("dvlPaperLayerV2Pro");
  if(!v2ProLayer) blockers.push("#dvlPaperLayerV2Pro not found");

  // A4. V2 Pro module script present exactly once
  var v2ModPresent = _cntId(scriptEls, "DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697") === 1;
  if(!v2ModPresent) blockers.push("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697 not found");

  // A5. V2 Pro CSS present exactly once
  var v2CssPresent = _cntId(styleEls, "DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697") === 1;
  if(!v2CssPresent) blockers.push("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697 not found");

  // A6. Legacy paper layer hidden
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("#dvlPaperLayer is still visible");

  // A7. No visible .dvl-paper-tag elements
  var paperTags = document.querySelectorAll(".dvl-paper-tag");
  var noVisibleTags = true;
  for(var pi=0;pi<paperTags.length;pi++){
    if(getComputedStyle(paperTags[pi]).display !== "none"){ noVisibleTags=false; break; }
  }
  if(!noVisibleTags) warnings.push(".dvl-paper-tag elements still visible");

  // A8. No visible .dvl-paper-line elements
  var paperLines = document.querySelectorAll(".dvl-paper-line");
  var noVisibleLines = true;
  for(var li=0;li<paperLines.length;li++){
    if(getComputedStyle(paperLines[li]).display !== "none"){ noVisibleLines=false; break; }
  }
  if(!noVisibleLines) warnings.push(".dvl-paper-line elements still visible");

  // A9. No .dvl-paper-edit-confirm-fixed active
  var noFixedConfirm = !document.querySelector(".dvl-paper-edit-confirm-fixed");
  if(!noFixedConfirm) blockers.push(".dvl-paper-edit-confirm-fixed still active");

  // A10. No .dvl-paper-edit-label-fixed active
  var noFixedLabel = !document.querySelector(".dvl-paper-edit-label-fixed");
  if(!noFixedLabel) blockers.push(".dvl-paper-edit-label-fixed still active");

  // A11. No .dvl-paper-draft-tag in DOM
  var noDraftTag = !document.querySelector(".dvl-paper-draft-tag");
  if(!noDraftTag) warnings.push(".dvl-paper-draft-tag still in DOM");

  // A12. V2 Pro layer inside chart wrapper
  var wrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  var layerInsideWrap = !!(v2ProLayer && wrap && v2ProLayer.parentElement === wrap);
  if(!layerInsideWrap) warnings.push("#dvlPaperLayerV2Pro not inside chart wrapper yet (normal before install)");

  // A13. TP/SL activation function present
  var hasTpSlActivation = _srcFull.indexOf("function maybeCloseOpen(") > -1;
  if(!hasTpSlActivation) blockers.push("maybeCloseOpen not found in source");

  // A14. ENTRY close X present
  var hasCloseX = _srcFull.indexOf("data-close-trade") > -1;
  if(!hasCloseX) blockers.push("data-close-trade (ENTRY close X) not found");

  // A15. TP/SL edit OK/X present
  var hasEditConfirm = _srcFull.indexOf("confirmTpSlEdit") > -1 &&
                       _srcFull.indexOf("cancelTpSlEdit") > -1;
  if(!hasEditConfirm) blockers.push("confirmTpSlEdit/cancelTpSlEdit not found");

  // A16. Draft confirm/cancel present
  var hasDraftConfirm = _srcFull.indexOf("confirmDraft") > -1 &&
                        _srcFull.indexOf("cancelPaperOrder") > -1;
  if(!hasDraftConfirm) blockers.push("confirmDraft/cancelPaperOrder not found");

  // A17. V2 Pro does not use position:fixed
  var v2ModEl  = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697");
  var v2ModSrc = v2ModEl ? v2ModEl.textContent : "";
  var noFixedInV2 = v2ModSrc.indexOf("position:fixed") === -1 &&
                    v2ModSrc.indexOf("position: fixed") === -1;
  if(!noFixedInV2) blockers.push("V2 Pro module uses position:fixed");

  // A18. V2 Pro does not append to document.body
  var noBodyAppend = v2ModSrc.indexOf("document.body.append") === -1 &&
                     v2ModSrc.indexOf("document.body.insert") === -1;
  if(!noBodyAppend) blockers.push("V2 Pro appends to document.body");

  // A19. Legacy suppressor set
  var legacySuppressed = window.__DVL_PAPER_LEGACY_SUPPRESSED__ === true;
  if(!legacySuppressed) warnings.push("__DVL_PAPER_LEGACY_SUPPRESSED__ not set");

  // A20. window.DVL_PAPER_TRADING_V2_PRO exposed
  var v2ApiExposed = typeof window.DVL_PAPER_TRADING_V2_PRO === "object" &&
                     window.DVL_PAPER_TRADING_V2_PRO !== null;
  if(!v2ApiExposed) blockers.push("window.DVL_PAPER_TRADING_V2_PRO not exposed");

  // A21. V2 audit API exposed
  var v2AuditExposed = typeof window.DVL_PAPER_TRADING_V2_TV_PRO_AUDIT === "object";
  if(!v2AuditExposed) blockers.push("window.DVL_PAPER_TRADING_V2_TV_PRO_AUDIT not exposed");

  // A22. Final locks 0659-0662 present
  var missingLocks = [];
  for(var fl=0;fl<FINAL_LOCK_CSS.length;fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[fl])!==1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  if(missingLocks.length>0) blockers.push("final locks missing: "+missingLocks.join(", "));

  // A23. Release candidate gate preserved
  var rcGate = _cntId(scriptEls,"DVL_RELEASE_CANDIDATE_GATE_AUDIT_0680")===1;
  if(!rcGate) blockers.push("DVL_RELEASE_CANDIDATE_GATE_AUDIT_0680 not found");

  // A24. Zero _brokerToken in source (split string above avoids self-match)
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken+" found in source");

  // A25. Zero Real order in source
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push(_realOrder+" found in source");

  // A26. No API key in this audit module
  var noApiKey = _mod698src.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("apiKey found in 0698 audit module");

  // A27. Buy/Sell buttons exist
  var hasBuyBtn  = !!document.querySelector(".tradeAction.buy");
  var hasSellBtn = !!document.querySelector(".tradeAction.sell");
  if(!hasBuyBtn)  blockers.push(".tradeAction.buy not found");
  if(!hasSellBtn) blockers.push(".tradeAction.sell not found");

  // A28. Old paper script still present (passive, suppressed)
  var oldPaperPassive = _cntId(scriptEls,"DVL_BETA_0634_PAPER_TRADING_0598")===1;
  if(!oldPaperPassive) warnings.push("DVL_BETA_0634_PAPER_TRADING_0598 not found");

  // A29. Chart draw function intact (split to avoid literal)
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn]==="function" ||
                    _srcFull.indexOf("function drawSoon")>-1;
  if(!hasDrawSoon) warnings.push("drawSoon not found");

  // A30. Oscillator script preserved
  var hasOscScript = _cntId(scriptEls,"DVL_BETA_0538_TEST_OSCILLATOR_JS")===1 ||
                     _cntId(scriptEls,"DVL_BETA_0554_CG_STYLE_OPEN_INTEREST_OSC_JS")===1;
  if(!hasOscScript) warnings.push("oscillator script not found");

  // A31. Keypads/tools intact
  var hasKeypad = !!document.getElementById("entryPadOverlay");
  if(!hasKeypad) warnings.push("entryPadOverlay not found");

  // A32. V2 Pro CSS uses 1px lines
  var v2CssEl  = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697");
  var v2CssSrc = v2CssEl ? v2CssEl.textContent : "";
  var has1pxLine = v2CssSrc.indexOf("1px solid") > -1;
  if(!has1pxLine) warnings.push("V2 Pro CSS missing 1px solid line rule");

  // A33. No duplicate V2 Pro layer
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("multiple #dvlPaperLayerV2Pro found: "+v2LayerCount);

  var pass = (
    v2ProEnabled && v2ProClass && !!v2ProLayer && v2ModPresent && v2CssPresent &&
    legacyHidden && noFixedConfirm && noFixedLabel &&
    hasTpSlActivation && hasCloseX && hasEditConfirm && hasDraftConfirm &&
    noFixedInV2 && noBodyAppend && v2ApiExposed && v2AuditExposed &&
    missingLocks.length===0 && rcGate && noBroker && noRealOrder &&
    hasBuyBtn && hasSellBtn && v2LayerCount <= 1
  );

  _lastAudit = {
    pass:              pass,
    v2ProEnabled:      v2ProEnabled,
    v2ProClass:        v2ProClass,
    v2ProLayer:        !!v2ProLayer,
    v2ModPresent:      v2ModPresent,
    v2CssPresent:      v2CssPresent,
    legacyHidden:      legacyHidden,
    noFixedConfirm:    noFixedConfirm,
    noFixedLabel:      noFixedLabel,
    noDraftTag:        noDraftTag,
    layerInsideWrap:   layerInsideWrap,
    hasTpSlActivation: hasTpSlActivation,
    hasCloseX:         hasCloseX,
    hasEditConfirm:    hasEditConfirm,
    hasDraftConfirm:   hasDraftConfirm,
    noFixedInV2:       noFixedInV2,
    noBodyAppend:      noBodyAppend,
    legacySuppressed:  legacySuppressed,
    v2ApiExposed:      v2ApiExposed,
    v2AuditExposed:    v2AuditExposed,
    finalLocksOk:      missingLocks.length===0,
    rcGate:            rcGate,
    noBroker:          noBroker,
    noRealOrder:       noRealOrder,
    hasBuyBtn:         hasBuyBtn,
    hasSellBtn:        hasSellBtn,
    oldPaperPassive:   oldPaperPassive,
    has1pxLine:        has1pxLine,
    v2LayerCount:      v2LayerCount,
    blockers:          blockers,
    warnings:          warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT = {
  VERSION:      "0.698",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
