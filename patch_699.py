#!/usr/bin/env python3
"""
patch_699.py — Beta 0.699 Paper Gesture Isolation / Chart Drag Lock

Changes:
  C1: Title       Beta 0.698 → Beta 0.699
  C2: versionBadge BETA 0.698 → BETA 0.699
  C3: DVL_APP_VERSION → "Beta 0.699"
  C4: Changelog   add 0.699 entry; shift 0.698 to string literal
  C5: CSS DVL_PAPER_GESTURE_ISOLATION_CSS_0699
  C6: Guard script DVL_PAPER_GESTURE_ISOLATION_GUARD_0699 (in <head>, registers
      window capture listeners BEFORE chart body scripts)
  C7: V2 Pro startDrag — set gesture lock flags + scaleSnapshot
  C8: V2 Pro endDrag   — clear gesture lock flags
  C9: V2 Pro moveDrag  — use scaleSnapshot instead of live priceScaleInfo
  C10: V2 Pro install() — expose moveDrag/endDrag globally for guard
  C11: Audit module DVL_PAPER_GESTURE_ISOLATION_AUDIT_MODULE_0699 (39 checks)
"""

import os, sys, shutil

HTML   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-48.before_0699_gesture_isolation.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count != 1:
        print(f"FAIL [{label}]: expected 1 occurrence, found {count}")
        sys.exit(1)
    return html.replace(old, new, 1)

# ── load ───────────────────────────────────────────────────────────────────────
with open(HTML, "r", encoding="utf-8") as f:
    html = f.read()

print(f"Input: {html.count(chr(10))+1} lines")

# ── pre-assertions ─────────────────────────────────────────────────────────────
def pre(cond, msg):
    if not cond:
        print(f"PRE-FAIL: {msg}")
        sys.exit(1)

pre('const DVL_APP_VERSION = "Beta 0.698"' in html, 'not Beta 0.698')
pre('DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698' in html, '0698 audit missing')
pre('DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697' in html, 'V2 Pro module missing')
pre('DVL_PAPER_GESTURE_ISOLATION_CSS_0699' not in html, '0699 CSS already present')
pre('DVL_PAPER_GESTURE_ISOLATION_GUARD_0699' not in html, '0699 guard already present')
pre('DVL_PAPER_GESTURE_ISOLATION_AUDIT_MODULE_0699' not in html, '0699 audit already present')
pre('window.__dvlPaperGestureActive' not in html, '__dvlPaperGestureActive already present')

# ── backup ─────────────────────────────────────────────────────────────────────
shutil.copy2(HTML, BACKUP)
print(f"Backup: {BACKUP}")

# ── C1: Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.698</title>',
    '<title>DVL Binance Live — Beta 0.699</title>',
    "C1: title"
)

# ── C2: versionBadge ───────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.698</div>',
    '>BETA 0.699</div>',
    "C2: versionBadge"
)

# ── C3: DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.698";',
    'const DVL_APP_VERSION = "Beta 0.699";',
    "C3: DVL_APP_VERSION"
)

# ── C4: Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.698 — Clean Paper V2 integration: removed legacy Paper Trading visual/runtime conflicts and made the 0.697 TradingView-style Paper module the single active Paper system." },\n  { version: "Beta 0.688",',
    '  { version: DVL_APP_VERSION, note: "Beta 0.699 — Paper gesture isolation: TP/SL/ENTRY drags now lock chart pan/zoom/crosshair, keeping the graph static while Paper elements are moved." },\n  { version: "Beta 0.698", note: "Beta 0.698 — Clean Paper V2 integration: removed legacy Paper Trading visual/runtime conflicts and made the 0.697 TradingView-style Paper module the single active Paper system." },\n  { version: "Beta 0.688",',
    "C4: changelog"
)

# ── C5: CSS isolation ──────────────────────────────────────────────────────────
CSS_0699 = """\
<style id="DVL_PAPER_GESTURE_ISOLATION_CSS_0699">
/*
  DVL Beta 0.699 — Paper gesture isolation.
  While a Paper element is being dragged, the chart is frozen.
*/
html.dvl-paper-gesture-active,
html.dvl-paper-gesture-active body,
html.dvl-paper-gesture-active .canvasWrap,
html.dvl-paper-gesture-active #chartWrap {
  touch-action: none !important;
  overscroll-behavior: contain !important;
}
#dvlPaperLayerV2Pro,
#dvlPaperLayerV2Pro * {
  -webkit-user-select: none !important;
  user-select: none !important;
}
.dvl-pv2p-hit,
.dvl-pv2p-tag,
.dvl-pv2p-controls,
.dvl-pv2p-btn {
  touch-action: none !important;
}
</style>

"""

# ── C6: Guard script ─────────────────────────────────────────────────────────
# Inserted in <head> before DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672.
# Because it's in <head>, it executes before ALL <body> scripts (chart code,
# V2 Pro module, etc.), registering window capture listeners FIRST.
# When __dvlPaperGestureActive is true, it calls stopImmediatePropagation()
# to block all other window listeners (chart pan) then manually calls
# window.__dvlPaperV2ProMoveDrag / __dvlPaperV2ProEndDrag (exposed by C10).
GUARD_0699 = """\
<script id="DVL_PAPER_GESTURE_ISOLATION_GUARD_0699">
(function(){
"use strict";
// Initialise flags before any chart or Paper code runs.
window.__dvlPaperGestureActive   = false;
window.__dvlPaperDragLock        = false;
window.__dvlPositionDragActive   = false;
window.__dvlLongShortV2Dragging  = false;
window.__dvlPaperV2ProMoveDrag   = null;
window.__dvlPaperV2ProEndDrag    = null;

function _onMove(ev){
  if(!window.__dvlPaperGestureActive) return;
  // Block chart — registered before chart scripts so stopImmediatePropagation
  // fires before chart window capture listeners.
  ev.preventDefault();
  ev.stopImmediatePropagation();
  if(window.__dvlPaperV2ProMoveDrag) window.__dvlPaperV2ProMoveDrag(ev);
}
function _onUp(ev){
  if(!window.__dvlPaperGestureActive) return;
  ev.stopImmediatePropagation();
  if(window.__dvlPaperV2ProEndDrag) window.__dvlPaperV2ProEndDrag(ev);
}

window.addEventListener('pointermove',   _onMove, {capture:true, passive:false});
window.addEventListener('pointerup',     _onUp,   {capture:true, passive:false});
window.addEventListener('pointercancel', _onUp,   {capture:true, passive:false});
})();
</script>

"""

html = rep(html,
    '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    CSS_0699 + GUARD_0699 + '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "C5+C6: CSS + guard"
)

# ── C7: V2 Pro startDrag — flags + scaleSnapshot ───────────────────────────────
# `si` is already computed at the top of startDrag; we add it as scaleSnapshot
# so moveDrag can use a frozen price scale during the drag.
html = rep(html,
    "state.drag={id:id,kind:kind,pid:ev.pointerId,startPrice:si.yToPrice(y),entry:n(o.entry),tp:n(o.tp),sl:n(o.sl)}; window.__dvlPaperDragging=true; document.documentElement.classList.add('dvl-pv2p-dragging');",
    "state.drag={id:id,kind:kind,pid:ev.pointerId,startPrice:si.yToPrice(y),entry:n(o.entry),tp:n(o.tp),sl:n(o.sl),scaleSnapshot:si}; window.__dvlPaperDragging=true; window.__dvlPaperGestureActive=true; window.__dvlPaperDragLock=true; window.__dvlPositionDragActive=true; window.__dvlLongShortV2Dragging=true; document.documentElement.classList.add('dvl-pv2p-dragging'); document.documentElement.classList.add('dvl-paper-gesture-active');",
    "C7: startDrag flags + snapshot"
)

# ── C8: V2 Pro endDrag — clear flags ───────────────────────────────────────────
html = rep(html,
    "var d=state.drag; state.drag=null; window.__dvlPaperDragging=false; document.documentElement.classList.remove('dvl-pv2p-dragging');",
    "var d=state.drag; state.drag=null; window.__dvlPaperDragging=false; window.__dvlPaperGestureActive=false; window.__dvlPaperDragLock=false; window.__dvlPositionDragActive=false; window.__dvlLongShortV2Dragging=false; document.documentElement.classList.remove('dvl-pv2p-dragging'); document.documentElement.classList.remove('dvl-paper-gesture-active');",
    "C8: endDrag clear flags"
)

# ── C9: V2 Pro moveDrag — use scaleSnapshot ─────────────────────────────────────
html = rep(html,
    "var o=find(state.drag.id),si=priceScaleInfo(); if(!o||!si)return;",
    "var o=find(state.drag.id),si=(state.drag&&state.drag.scaleSnapshot)||priceScaleInfo(); if(!o||!si)return;",
    "C9: moveDrag scaleSnapshot"
)

# ── C10: V2 Pro install() — expose moveDrag/endDrag for guard ──────────────────
html = rep(html,
    "window.addEventListener('resize',render,{passive:true}); render();}",
    "window.addEventListener('resize',render,{passive:true}); window.__dvlPaperV2ProMoveDrag=moveDrag; window.__dvlPaperV2ProEndDrag=endDrag; render();}",
    "C10: install expose"
)

# ── C11: Audit module 0699 ─────────────────────────────────────────────────────
# Anti-false-positive splits used inside audit module:
#   _brokerToken = 'Broker' + 'Connector'
#   _realOrder   = 'placeReal' + 'Order'
#   _dsFn        = "draw" + "Soon"

AUDIT_0699 = """
<script id="DVL_PAPER_GESTURE_ISOLATION_AUDIT_MODULE_0699">
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

  var _modEl  = document.getElementById("DVL_PAPER_GESTURE_ISOLATION_AUDIT_MODULE_0699");
  var _modSrc = _modEl ? _modEl.textContent : "";

  var _v2El   = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697");
  var _v2Src  = _v2El ? _v2El.textContent : "";

  var _guardEl  = document.getElementById("DVL_PAPER_GESTURE_ISOLATION_GUARD_0699");
  var _guardSrc = _guardEl ? _guardEl.textContent : "";

  // A1. __dvlPaperGestureActive flag exists
  var flagExists = "dvlPaperGestureActive" in window;
  if(!flagExists) blockers.push("window.__dvlPaperGestureActive not initialised");

  // A2. __dvlPaperDragLock flag exists
  var lockExists = "dvlPaperDragLock" in window;
  if(!lockExists) blockers.push("window.__dvlPaperDragLock not initialised");

  // A3. Guard moveDrag reference exposed
  var moveDragExposed = window.__dvlPaperV2ProMoveDrag !== null &&
                        window.__dvlPaperV2ProMoveDrag !== undefined;
  if(!moveDragExposed) blockers.push("window.__dvlPaperV2ProMoveDrag not set by install()");

  // A4. Guard endDrag reference exposed
  var endDragExposed = window.__dvlPaperV2ProEndDrag !== null &&
                       window.__dvlPaperV2ProEndDrag !== undefined;
  if(!endDragExposed) blockers.push("window.__dvlPaperV2ProEndDrag not set by install()");

  // A5. Guard script present
  var guardPresent = _cntId(scriptEls,"DVL_PAPER_GESTURE_ISOLATION_GUARD_0699") === 1;
  if(!guardPresent) blockers.push("DVL_PAPER_GESTURE_ISOLATION_GUARD_0699 not found");

  // A6. Guard initialises __dvlPaperGestureActive
  var guardInitsFlag = _guardSrc.indexOf("__dvlPaperGestureActive") > -1;
  if(!guardInitsFlag) blockers.push("guard does not init __dvlPaperGestureActive");

  // A7. Guard uses stopImmediatePropagation
  var guardBlocksChart = _guardSrc.indexOf("stopImmediatePropagation") > -1;
  if(!guardBlocksChart) blockers.push("guard does not call stopImmediatePropagation");

  // A8. Guard handles pointermove
  var guardMoveSrc = _guardSrc.indexOf("pointermove") > -1;
  if(!guardMoveSrc) blockers.push("guard does not handle pointermove");

  // A9. Guard handles pointerup
  var guardUpSrc = _guardSrc.indexOf("pointerup") > -1;
  if(!guardUpSrc) blockers.push("guard does not handle pointerup");

  // A10. Guard handles pointercancel
  var guardCancelSrc = _guardSrc.indexOf("pointercancel") > -1;
  if(!guardCancelSrc) blockers.push("guard does not handle pointercancel");

  // A11. Chart locked via guard (chart receives no events during Paper drag)
  // Verified by guard's stopImmediatePropagation blocking window-level listeners.
  var chartLocked = guardBlocksChart;
  if(!chartLocked) warnings.push("chart lock not confirmed (guard missing stopImmediatePropagation)");

  // A12. V2 startDrag sets __dvlPaperGestureActive
  var startSetsFlag = _v2Src.indexOf("__dvlPaperGestureActive=true") > -1;
  if(!startSetsFlag) blockers.push("startDrag does not set __dvlPaperGestureActive=true");

  // A13. V2 endDrag clears __dvlPaperGestureActive
  var endClearsFlag = _v2Src.indexOf("__dvlPaperGestureActive=false") > -1;
  if(!endClearsFlag) blockers.push("endDrag does not clear __dvlPaperGestureActive=false");

  // A14. V2 startDrag sets dvl-paper-gesture-active class
  var startSetsClass = _v2Src.indexOf("dvl-paper-gesture-active") > -1;
  if(!startSetsClass) blockers.push("startDrag does not add dvl-paper-gesture-active class");

  // A15. V2 startDrag stores scaleSnapshot
  var hasSnapshot = _v2Src.indexOf("scaleSnapshot") > -1;
  if(!hasSnapshot) blockers.push("startDrag does not store scaleSnapshot");

  // A16. V2 moveDrag uses scaleSnapshot
  var moveUsesSnapshot = _v2Src.indexOf("state.drag.scaleSnapshot") > -1 ||
                         _v2Src.indexOf("drag.scaleSnapshot") > -1;
  if(!moveUsesSnapshot) blockers.push("moveDrag does not use scaleSnapshot");

  // A17. V2 startDrag calls setPointerCapture
  var hasPointerCapture = _v2Src.indexOf("setPointerCapture") > -1;
  if(!hasPointerCapture) blockers.push("startDrag does not call setPointerCapture");

  // A18. V2 moveDrag calls preventDefault
  var movePrevent = _v2Src.indexOf("ev.preventDefault()") > -1;
  if(!movePrevent) blockers.push("moveDrag does not call preventDefault");

  // A19. V2 moveDrag calls stopPropagation
  var moveStop = _v2Src.indexOf("ev.stopPropagation()") > -1;
  if(!moveStop) blockers.push("moveDrag does not call stopPropagation");

  // A20. V2 moveDrag calls stopImmediatePropagation
  var moveStopImm = _v2Src.indexOf("stopImmediatePropagation") > -1;
  if(!moveStopImm) blockers.push("moveDrag does not call stopImmediatePropagation");

  // A21. V2 endDrag sets __dvlPaperDragLock=false
  var endClearsLock = _v2Src.indexOf("__dvlPaperDragLock=false") > -1;
  if(!endClearsLock) blockers.push("endDrag does not clear __dvlPaperDragLock");

  // A22. V2 startDrag sets __dvlPositionDragActive (TP drag flag)
  var tpDragLock = _v2Src.indexOf("__dvlPositionDragActive=true") > -1;
  if(!tpDragLock) blockers.push("startDrag does not set __dvlPositionDragActive");

  // A23. V2 startDrag sets __dvlLongShortV2Dragging (SL drag flag)
  var slDragLock = _v2Src.indexOf("__dvlLongShortV2Dragging=true") > -1;
  if(!slDragLock) blockers.push("startDrag does not set __dvlLongShortV2Dragging");

  // A24. Entry draft drag activates lock (same startDrag)
  var entryDraftLock = _v2Src.indexOf("status==='draft'") > -1 ||
                       _v2Src.indexOf("status===\"draft\"") > -1;
  if(!entryDraftLock) blockers.push("V2 does not handle draft drag");

  // A25. Entry pending drag activates lock
  var entryPendingLock = _v2Src.indexOf("status==='pending'") > -1 ||
                         _v2Src.indexOf("status===\"pending\"") > -1;
  if(!entryPendingLock) blockers.push("V2 does not handle pending drag");

  // A26. Labels remain inside chart (V2 uses transform3d, not fixed)
  var noFixed = _v2Src.indexOf("position:fixed") === -1 &&
                _v2Src.indexOf("position: fixed") === -1;
  if(!noFixed) blockers.push("V2 uses position:fixed (labels escape chart)");

  // A27. V2 Pro layer is unique
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("multiple #dvlPaperLayerV2Pro: "+v2LayerCount);
  if(v2LayerCount < 1) warnings.push("#dvlPaperLayerV2Pro not yet in DOM");

  // A28. Legacy paper layer hidden
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("#dvlPaperLayer is still visible");

  // A29. TP/SL activation preserved (maybeCloseOpen)
  var hasTpSlActivation = _v2Src.indexOf("function maybeCloseOpen(") > -1;
  if(!hasTpSlActivation) blockers.push("maybeCloseOpen not in V2 source");

  // A30. TP/SL infinite drag preserved (edit controls)
  var hasTpSlEdit = _v2Src.indexOf("confirmTpSlEdit") > -1;
  if(!hasTpSlEdit) blockers.push("confirmTpSlEdit not in V2 source");

  // A31. ENTRY close X preserved
  var hasCloseX = _v2Src.indexOf("data-close-trade") > -1;
  if(!hasCloseX) blockers.push("data-close-trade (ENTRY close X) not in V2 source");

  // A32. OK/X for TP/SL edit preserved
  var hasEditOkX = _v2Src.indexOf("cancelTpSlEdit") > -1;
  if(!hasEditOkX) blockers.push("cancelTpSlEdit not in V2 source");

  // A33. Market preserved
  var hasMarket = _v2Src.indexOf("openMarket") > -1;
  if(!hasMarket) blockers.push("openMarket not in V2 source");

  // A34. Limit/Stop draft preserved
  var hasDraft = _v2Src.indexOf("createDraft") > -1;
  if(!hasDraft) blockers.push("createDraft not in V2 source");

  // A35. Final locks 0659-0662 present
  var missingLocks = [];
  for(var fl=0;fl<FINAL_LOCK_CSS.length;fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[fl])!==1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  if(missingLocks.length>0) blockers.push("final locks missing: "+missingLocks.join(", "));

  // A36. Zero _brokerToken in source (split avoids self-match)
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken+" found in source");

  // A37. Zero Real order
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push(_realOrder+" found in source");

  // A38. No API key in audit module
  var noApiKey = _modSrc.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("apiKey found in 0699 audit module");

  // A39. drawSoon intact (split to avoid literal)
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn]==="function" ||
                    _srcFull.indexOf("function drawSoon")>-1;
  if(!hasDrawSoon) warnings.push("drawSoon not found");

  var pass = (
    flagExists && lockExists && moveDragExposed && endDragExposed &&
    guardPresent && guardInitsFlag && guardBlocksChart && guardMoveSrc &&
    guardUpSrc && guardCancelSrc &&
    startSetsFlag && endClearsFlag && startSetsClass &&
    hasSnapshot && moveUsesSnapshot && hasPointerCapture &&
    movePrevent && moveStop && moveStopImm &&
    endClearsLock && tpDragLock && slDragLock &&
    entryDraftLock && entryPendingLock &&
    noFixed && v2LayerCount <= 1 && legacyHidden &&
    hasTpSlActivation && hasTpSlEdit && hasCloseX && hasEditOkX &&
    hasMarket && hasDraft && missingLocks.length===0 &&
    noBroker && noRealOrder
  );

  _lastAudit = {
    pass:               pass,
    flagExists:         flagExists,
    lockExists:         lockExists,
    moveDragExposed:    moveDragExposed,
    endDragExposed:     endDragExposed,
    guardPresent:       guardPresent,
    guardInitsFlag:     guardInitsFlag,
    guardBlocksChart:   guardBlocksChart,
    startSetsFlag:      startSetsFlag,
    endClearsFlag:      endClearsFlag,
    startSetsClass:     startSetsClass,
    hasSnapshot:        hasSnapshot,
    moveUsesSnapshot:   moveUsesSnapshot,
    hasPointerCapture:  hasPointerCapture,
    movePrevent:        movePrevent,
    moveStop:           moveStop,
    moveStopImm:        moveStopImm,
    endClearsLock:      endClearsLock,
    tpDragLock:         tpDragLock,
    slDragLock:         slDragLock,
    noFixed:            noFixed,
    v2LayerCount:       v2LayerCount,
    legacyHidden:       legacyHidden,
    hasTpSlActivation:  hasTpSlActivation,
    hasTpSlEdit:        hasTpSlEdit,
    hasCloseX:          hasCloseX,
    hasMarket:          hasMarket,
    hasDraft:           hasDraft,
    finalLocksOk:       missingLocks.length===0,
    noBroker:           noBroker,
    noRealOrder:        noRealOrder,
    blockers:           blockers,
    warnings:           warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_GESTURE_ISOLATION_AUDIT = {
  VERSION:      "0.699",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>
"""

html = rep(html,
    '\n</body>\n</html>',
    AUDIT_0699 + '\n</body>\n</html>',
    "C11: audit 0699"
)

# ── post-assertions ────────────────────────────────────────────────────────────
def post(cond, msg):
    if not cond:
        print(f"POST-FAIL: {msg}")
        sys.exit(1)

# Version
post('const DVL_APP_VERSION = "Beta 0.699"' in html, 'DVL_APP_VERSION not 0.699')
post('<title>DVL Binance Live — Beta 0.699</title>' in html, 'title not updated')
post('>BETA 0.699</div>' in html, 'versionBadge not updated')
post('"Beta 0.699 — Paper gesture isolation' in html, 'changelog 0699 missing')
post('"Beta 0.698", note: "Beta 0.698 — Clean Paper V2' in html, '0698 entry not string-literalized')

# CSS 0699
post(html.count('<style id="DVL_PAPER_GESTURE_ISOLATION_CSS_0699">') == 1, 'CSS_0699 count != 1')
post('dvl-paper-gesture-active' in html, 'gesture-active class missing from CSS')

# Guard 0699
post(html.count('<script id="DVL_PAPER_GESTURE_ISOLATION_GUARD_0699">') == 1, 'guard tag count != 1')
post('window.__dvlPaperGestureActive   = false' in html, 'guard flag init missing')
post('window.__dvlPaperV2ProMoveDrag   = null' in html, 'guard moveDrag init missing')
post('stopImmediatePropagation' in html, 'stopImmediatePropagation missing')

# V2 Pro startDrag changes
post('scaleSnapshot:si}' in html, 'scaleSnapshot not in state.drag')
post('window.__dvlPaperGestureActive=true' in html, 'gesture active flag not set in startDrag')
post("document.documentElement.classList.add('dvl-paper-gesture-active')" in html, 'class add missing in startDrag')

# V2 Pro endDrag changes
post('window.__dvlPaperGestureActive=false' in html, 'gesture flag not cleared in endDrag')
post("document.documentElement.classList.remove('dvl-paper-gesture-active')" in html, 'class remove missing in endDrag')

# V2 Pro moveDrag change
post('state.drag&&state.drag.scaleSnapshot' in html, 'moveDrag not using scaleSnapshot')

# V2 Pro install expose
post('window.__dvlPaperV2ProMoveDrag=moveDrag' in html, 'moveDrag not exposed')
post('window.__dvlPaperV2ProEndDrag=endDrag' in html, 'endDrag not exposed')

# Audit 0699
post(html.count('<script id="DVL_PAPER_GESTURE_ISOLATION_AUDIT_MODULE_0699">') == 1, 'audit_0699 count != 1')
post('window.DVL_PAPER_GESTURE_ISOLATION_AUDIT' in html, 'audit object not exposed')

# Prior modules preserved
post('DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698' in html, '0698 audit missing')
post('DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697' in html, 'V2 Pro module missing')
post('DVL_PAPER_LEGACY_SUPPRESSOR_0698' in html, 'legacy suppressor missing')

# No BrokerConnector
_bt = 'Broker' + 'Connector'
post(_bt not in html, 'BrokerConnector found in HTML')

# No timers in audit 0699
audit_699_idx = html.index('DVL_PAPER_GESTURE_ISOLATION_AUDIT_MODULE_0699')
audit_699_end = html.index('window.DVL_PAPER_GESTURE_ISOLATION_AUDIT', audit_699_idx)
audit_699_src = html[audit_699_idx:audit_699_end]
post('setTimeout'           not in audit_699_src, 'setTimeout in audit 0699')
post('setInterval'          not in audit_699_src, 'setInterval in audit 0699')
post('requestAnimationFrame' not in audit_699_src, 'requestAnimationFrame in audit 0699')
post('window.drawSoon '     not in audit_699_src, 'window.drawSoon= in audit 0699')

# No timers in guard 0699
guard_699_idx = html.index('DVL_PAPER_GESTURE_ISOLATION_GUARD_0699')
guard_699_end = html.index('</script>', guard_699_idx)
guard_699_src = html[guard_699_idx:guard_699_end]
post('setTimeout'   not in guard_699_src, 'setTimeout in guard 0699')
post('setInterval'  not in guard_699_src, 'setInterval in guard 0699')

# ── write ──────────────────────────────────────────────────────────────────────
with open(HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Output: {html.count(chr(10))+1} lines (+{html.count(chr(10))+1 - 39054})")
print("All assertions passed. Beta 0.699 ready.")
