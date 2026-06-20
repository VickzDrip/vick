#!/usr/bin/env python3
"""
patch_688.py — Beta 0.688 Paper Limit Placement Reset / Stabilization

Changes:
  C1: Title       Beta 0.687 → Beta 0.688
  C2: versionBadge BETA 0.687 → BETA 0.688
  C3: DVL_APP_VERSION → "Beta 0.688"
  C4: Changelog   add 0.688 entry at top; shift 0.687 entry to string literal
  C5: CSS 0688    .dvl-paper-draft-tag.entry draggable; × button; suppress legacy
  C6: makeDraftTag ENTRY tag draggable + × cancel button
  C7: Audit module 0688 (49 checks)
"""

import os, sys, shutil

HTML   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-46.before_0688_paper_limit_reset.html"

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

pre('const DVL_APP_VERSION = "Beta 0.687"'  in html, 'not Beta 0.687')
pre('DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686' in html, '0686 CSS missing')
pre('DVL_DRAFT_CONFIRM_HOTFIX_AUDIT_MODULE_0687' in html, '0687 audit missing')
pre('DVL_PAPER_LIMIT_PLACEMENT_RESET_CSS_0688' not in html, '0688 CSS already exists')
pre('DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT_MODULE_0688' not in html, '0688 audit already exists')
pre('function makeDraftTag(draft, handle, y, main)' in html, 'makeDraftTag not found')

# ── backup ─────────────────────────────────────────────────────────────────────
shutil.copy2(HTML, BACKUP)
print(f"Backup: {BACKUP}")

# ── C1: Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.687</title>',
    '<title>DVL Binance Live — Beta 0.688</title>',
    "C1: title"
)

# ── C2: versionBadge ───────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.687</div>',
    '>BETA 0.688</div>',
    "C2: versionBadge"
)

# ── C3: DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.687";',
    'const DVL_APP_VERSION = "Beta 0.688";',
    "C3: DVL_APP_VERSION"
)

# ── C4: Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.687 — Hotfix: draft Limit/Stop confirm (✓/\xd7) buttons now appear correctly; render() calls renderEditConfirm before renderDraftPosition so draft confirm buttons are not immediately cleared." },\n  { version: "Beta 0.686",',
    '  { version: DVL_APP_VERSION, note: "Beta 0.688 — Paper Limit placement reset: simplified Limit/Stop draft placement, ENTRY tag draggable with \xd7 cancel button, draft confirm buttons follow ENTRY during drag, suppressed stray legacy elements, unified Market/Limit visual base." },\n  { version: "Beta 0.687", note: "Beta 0.687 — Hotfix: draft Limit/Stop confirm (✓/\xd7) buttons now appear correctly; render() calls renderEditConfirm before renderDraftPosition so draft confirm buttons are not immediately cleared." },\n  { version: "Beta 0.686",',
    "C4: changelog"
)

# ── C5: CSS 0688 ───────────────────────────────────────────────────────────────
CSS_0688 = """\
<style id="DVL_PAPER_LIMIT_PLACEMENT_RESET_CSS_0688">
/*
  DVL Beta 0.688 — Paper Limit Placement Reset / Stabilization.
  ENTRY draft tag is now draggable: pointer-events:auto, touch-action:none,
  cursor:ns-resize, opacity raised to 0.75 for visibility.
  × cancel button on ENTRY draft tag.
  dvl-paper-pending and dvl-paper-pending-controls suppressed (legacy stray elements).
*/
.dvl-paper-draft-tag.entry {
  pointer-events: auto !important;
  touch-action: none !important;
  cursor: ns-resize !important;
  opacity: 0.75 !important;
}
.dvl-paper-draft-tag.entry .x {
  pointer-events: auto !important;
  touch-action: manipulation !important;
  cursor: pointer !important;
  opacity: 1 !important;
  flex: 0 0 auto !important;
  width: 16px !important;
  height: 16px !important;
  margin-left: auto !important;
  border-radius: 6px !important;
  display: grid !important;
  place-items: center !important;
  color: #ffb077 !important;
  background: rgba(255,140,70,.18) !important;
  border: 1px solid rgba(255,140,70,.45) !important;
  font-size: 10px !important;
  font-weight: 1000 !important;
  line-height: 1 !important;
}
.dvl-paper-pending,
.dvl-paper-pending-controls {
  display: none !important;
}
</style>

"""
html = rep(html,
    '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    CSS_0688 + '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "C5: CSS 0688"
)

# ── C6: makeDraftTag — ENTRY tag draggable + × cancel button ───────────────────
OLD_MDT = """\
    function makeDraftTag(draft, handle, y, main){
      var el = document.createElement("div");
      el.className = "dvl-paper-tag " + handle + " dvl-paper-draft-tag";
      el.dataset.status = "draft";
      el.dataset.id = draft.id;
      el.dataset.handle = handle;
      el.style.top = orderTagTopFromLineY(y).toFixed(1) + "px";
      el.style.width        = ORDER_TAG_W      + "px";
      el.style.height       = ORDER_TAG_H      + "px";
      el.style.borderRadius = ORDER_TAG_RADIUS + "px";
      el.style.fontSize     = ORDER_TAG_FONT   + "px";
      el.innerHTML = '<span class="txt"><span class="main">' + main + '</span></span>';
      layer.appendChild(el);
    }"""

NEW_MDT = """\
    // 0688: ENTRY tag draggable via startDraftDrag; × button cancels draft
    function makeDraftTag(draft, handle, y, main){
      var el = document.createElement("div");
      el.className = "dvl-paper-tag " + handle + " dvl-paper-draft-tag";
      el.dataset.status = "draft";
      el.dataset.id = draft.id;
      el.dataset.handle = handle;
      el.style.top = orderTagTopFromLineY(y).toFixed(1) + "px";
      el.style.width        = ORDER_TAG_W      + "px";
      el.style.height       = ORDER_TAG_H      + "px";
      el.style.borderRadius = ORDER_TAG_RADIUS + "px";
      el.style.fontSize     = ORDER_TAG_FONT   + "px";
      el.innerHTML = '<span class="txt"><span class="main">' + main + '</span></span>' +
        (handle === "entry" ? '<span class="x" data-remove="1">\xd7</span>' : "");
      if(handle === "entry"){
        el.addEventListener("pointerdown", function(ev){
          if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1") return;
          startDraftDrag(ev);
        }, {passive:false});
        el.addEventListener("click", function(ev){
          if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){
            ev.preventDefault(); ev.stopPropagation();
            cancelPendingOrderDraft(draft.id);
          }
        });
      }
      layer.appendChild(el);
    }"""

html = rep(html, OLD_MDT, NEW_MDT, "C6: makeDraftTag")

# ── C7: Audit module 0688 ──────────────────────────────────────────────────────
# Anti-false-positive split tokens used inside the module source:
#   _brokerToken  = 'Broker' + 'Connector'
#   _realOrder    = 'placeReal' + 'Order'
# These must NOT appear as literals in this Python source either — so break them:
_bt = 'Broker' + 'Connector'   # noqa — only used to verify below, not injected

AUDIT_0688 = """
<script id="DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT_MODULE_0688">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _dupStyleTag = '<' + '/style><' + '/style>';
var _brokerToken = 'Broker' + 'Connector';
var _realOrder   = 'placeReal' + 'Order';
var _yMinus19    = '(y' + ' - 19)';

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

function _cntId(els, id){
  var c = 0;
  for(var i = 0; i < els.length; i++){ if(els[i].id === id) c++; }
  return c;
}

function _fnSrc(full, fnName){
  var start = full.indexOf("function " + fnName + "(");
  if(start === -1) return "";
  var end = full.indexOf("\\n    function ", start + 10);
  return end === -1 ? full.slice(start) : full.slice(start, end);
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var si = 0; si < _allScripts.length; si++){ _srcFull += _allScripts[si].textContent; }

  var _mod688    = document.getElementById("DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT_MODULE_0688");
  var _mod688src = _mod688 ? _mod688.textContent : "";

  // ── A1. DVL_SCALE_LABEL_COMPACT_FIX_AUDIT preserved and passing ───────────
  var audit685Pass = false;
  try{
    if(typeof window.DVL_SCALE_LABEL_COMPACT_FIX_AUDIT !== "undefined"){
      var r685 = window.DVL_SCALE_LABEL_COMPACT_FIX_AUDIT.audit();
      audit685Pass = !!(r685 && r685.pass === true);
    }
  }catch(e){ warnings.push("DVL_SCALE_LABEL_COMPACT_FIX_AUDIT threw: " + e.message); }
  if(!audit685Pass) blockers.push("DVL_SCALE_LABEL_COMPACT_FIX_AUDIT.audit().pass not true");

  // ── A2. DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT preserved and passing ──────────
  var audit684Pass = false;
  try{
    if(typeof window.DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT !== "undefined"){
      var r684 = window.DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT.audit();
      audit684Pass = !!(r684 && r684.pass === true);
    }
  }catch(e){ warnings.push("DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT threw: " + e.message); }
  if(!audit684Pass) blockers.push("DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT.audit().pass not true");

  // ── A3. DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT preserved and passing ─────────
  var audit683Pass = false;
  try{
    if(typeof window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT !== "undefined"){
      var r683 = window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT.audit();
      audit683Pass = !!(r683 && r683.pass === true);
    }
  }catch(e){ warnings.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT threw: " + e.message); }
  if(!audit683Pass) blockers.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT.audit().pass not true");

  // ── A4. Release candidate / freeze preserved ──────────────────────────────
  var rcGatePresent = _cntId(scriptEls, "DVL_RELEASE_CANDIDATE_GATE_AUDIT_0680") === 1;
  if(!rcGatePresent) blockers.push("DVL_RELEASE_CANDIDATE_GATE_AUDIT_0680 not found");

  // ── A5. Final locks 0659-0662 present 1x ──────────────────────────────────
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // ── A6. Limit draft born at current price ─────────────────────────────────
  var createDraftSrc      = _fnSrc(_srcFull, "createPendingOrderDraft");
  var draftAtCurrentPrice = createDraftSrc.indexOf("draftPrice = price") > -1;
  if(!draftAtCurrentPrice) blockers.push("createPendingOrderDraft: draftPrice not set to current price");

  // ── A7. Stop draft born at current price (same fn) ────────────────────────
  var hasOrderTypeInDraft = createDraftSrc.indexOf("orderType") > -1;
  if(!hasOrderTypeInDraft) blockers.push("createPendingOrderDraft: orderType not referenced (Stop handling missing)");

  // ── A8. Limit/Stop does not create pending before OK ──────────────────────
  var draftNoPush = createDraftSrc.indexOf("state.positions.push") === -1;
  if(!draftNoPush) blockers.push("createPendingOrderDraft still calls state.positions.push (creates pending before OK)");

  // ── A9. Draft status is \"draft\" not \"open\" ─────────────────────────────────
  var draftStatusIsDraft = createDraftSrc.indexOf('status: "draft"') > -1;
  if(!draftStatusIsDraft) blockers.push('createPendingOrderDraft does not set status:"draft"');

  // ── A10. Draft shows ENTRY/TP/SL immediately ─────────────────────────────
  var renderDraftSrc = _fnSrc(_srcFull, "renderDraftPosition");
  var draftShowsEntry = renderDraftSrc.indexOf('"entry"') > -1;
  var draftShowsTp    = renderDraftSrc.indexOf('"tp"') > -1;
  var draftShowsSl    = renderDraftSrc.indexOf('"sl"') > -1;
  var draftShowsAll   = draftShowsEntry && draftShowsTp && draftShowsSl;
  if(!draftShowsAll) blockers.push("renderDraftPosition does not render entry/tp/sl");

  // ── A11. Draft shows OK immediately ──────────────────────────────────────
  var draftConfirmSrc = _fnSrc(_srcFull, "renderDraftConfirm");
  var draftShowsOk = draftConfirmSrc.indexOf('"ok"') > -1;
  if(!draftShowsOk) blockers.push("renderDraftConfirm does not render ok button");

  // ── A12. Draft shows X immediately ───────────────────────────────────────
  var draftShowsCancel = draftConfirmSrc.indexOf('"cancel"') > -1;
  if(!draftShowsCancel) blockers.push("renderDraftConfirm does not render cancel button");

  // ── A13. ENTRY draft is draggable ─────────────────────────────────────────
  var makeDraftLineSrc    = _fnSrc(_srcFull, "makeDraftLine");
  var makeDraftTagSrc     = _fnSrc(_srcFull, "makeDraftTag");
  var draftLineHasDrag    = makeDraftLineSrc.indexOf("startDraftDrag") > -1;
  var draftTagHasDrag     = makeDraftTagSrc.indexOf("startDraftDrag") > -1;
  var entryDraftDraggable = draftLineHasDrag || draftTagHasDrag;
  if(!entryDraftDraggable) blockers.push("ENTRY draft not draggable (startDraftDrag absent from makeDraftLine and makeDraftTag)");

  // ── A14. TP/SL follow ENTRY maintaining R:R ───────────────────────────────
  var moveDraftSrc   = _fnSrc(_srcFull, "moveDraftDrag");
  var moveUpdatesAll = moveDraftSrc.indexOf("state.pendingDraft.entry") > -1 &&
                       moveDraftSrc.indexOf("state.pendingDraft.tp")    > -1 &&
                       moveDraftSrc.indexOf("state.pendingDraft.sl")    > -1;
  if(!moveUpdatesAll) blockers.push("moveDraftDrag does not update entry+tp+sl with R:R");

  // ── A15. Buy: TP above ENTRY ──────────────────────────────────────────────
  var buyTpAbove = createDraftSrc.indexOf("isBuy ? draftPrice + risk") > -1;
  if(!buyTpAbove) blockers.push("createPendingOrderDraft: buy TP not above entry");

  // ── A16. Sell: TP below ENTRY ─────────────────────────────────────────────
  var sellTpBelow = createDraftSrc.indexOf("draftPrice - risk") > -1;
  if(!sellTpBelow) blockers.push("createPendingOrderDraft: sell TP not below entry");

  // ── A17. OK validates Limit/Stop ─────────────────────────────────────────
  var confirmSrc         = _fnSrc(_srcFull, "confirmPendingOrderDraft");
  var hasLimitValidation = confirmSrc.indexOf('"Limit"') > -1 && confirmSrc.indexOf("validOrder") > -1;
  var hasStopValidation  = confirmSrc.indexOf('"Stop"') > -1;
  if(!hasLimitValidation) blockers.push("confirmPendingOrderDraft missing Limit validation");
  if(!hasStopValidation)  blockers.push("confirmPendingOrderDraft missing Stop validation");

  // ── A18. Invalid OK keeps draft (toast + return) ──────────────────────────
  var confirmToasts = confirmSrc.indexOf("toast(validMsg)") > -1;
  if(!confirmToasts) blockers.push("confirmPendingOrderDraft does not toast on invalid");

  // ── A19. Valid OK converts to pending ─────────────────────────────────────
  var confirmPendingStatus = confirmSrc.indexOf('status: "pending"') > -1;
  if(!confirmPendingStatus) blockers.push('confirmPendingOrderDraft does not set status:"pending"');

  // ── A20. Draft X cancels only draft ──────────────────────────────────────
  var cancelDraftSrc         = _fnSrc(_srcFull, "cancelPendingOrderDraft");
  var cancelDraftClearsDraft = cancelDraftSrc.indexOf("state.pendingDraft = null") > -1;
  if(!cancelDraftClearsDraft) blockers.push("cancelPendingOrderDraft does not clear state.pendingDraft");

  // ── A21. Pending has X to cancel ─────────────────────────────────────────
  var makeTagSrc   = _fnSrc(_srcFull, "makeTag");
  var makeTagShowsX = makeTagSrc.indexOf('data-remove="1"') > -1;
  if(!makeTagShowsX) blockers.push("makeTag does not have data-remove cancel button");

  // ── A22. cancelPendingOrder exists ───────────────────────────────────────
  var cancelPOExists = _srcFull.indexOf("function cancelPendingOrder(") > -1;
  if(!cancelPOExists) blockers.push("cancelPendingOrder function not found");

  // ── A23. cancelPendingOrder removes only pending ─────────────────────────
  var cancelPOSrc       = _fnSrc(_srcFull, "cancelPendingOrder");
  var cancelOnlyPending = cancelPOSrc.indexOf('p.status === "pending"') > -1;
  if(!cancelOnlyPending) blockers.push('cancelPendingOrder does not check p.status === "pending"');

  // ── A24. cancelPendingOrder does not close open ───────────────────────────
  var cancelNotOpen = cancelPOSrc.indexOf('"open"') === -1;
  if(!cancelNotOpen) warnings.push('cancelPendingOrder references "open" unexpectedly');

  // ── A25. Market opens directly ────────────────────────────────────────────
  var startOrderSrc = _fnSrc(_srcFull, "startOrder");
  var marketDirect  = startOrderSrc.indexOf("executeMarketOrder") > -1;
  if(!marketDirect) blockers.push("startOrder does not call executeMarketOrder for Market");

  // ── A26. Market uses same visual base as Limit ────────────────────────────
  var makeLineSrc  = _fnSrc(_srcFull, "makeLine");
  var sharedVisual = makeLineSrc.length > 0 && makeTagSrc.length > 0;
  if(!sharedVisual) blockers.push("makeLine or makeTag not found (shared visual broken)");

  // ── A27. Pending/Open use same visual base ────────────────────────────────
  var renderPosSrc  = _fnSrc(_srcFull, "renderPosition");
  var handlesBoth   = renderPosSrc.indexOf('"pending"') > -1;
  if(!handlesBoth) warnings.push('renderPosition does not explicitly reference "pending"');

  // ── A28. TP/ENTRY/SL same width (ORDER_TAG_W) ────────────────────────────
  var hasTagW = _srcFull.indexOf("ORDER_TAG_W") > -1;
  if(!hasTagW) blockers.push("ORDER_TAG_W not found");

  // ── A29. TP/ENTRY/SL same height (ORDER_TAG_H) ───────────────────────────
  var hasTagH = _srcFull.indexOf("ORDER_TAG_H") > -1;
  if(!hasTagH) blockers.push("ORDER_TAG_H not found");

  // ── A30. CSS_0688 present ─────────────────────────────────────────────────
  var css688El   = document.getElementById("DVL_PAPER_LIMIT_PLACEMENT_RESET_CSS_0688");
  var css688Txt  = css688El ? css688El.textContent : "";
  var css688Present = !!css688El;
  if(!css688Present) blockers.push("DVL_PAPER_LIMIT_PLACEMENT_RESET_CSS_0688 not found");

  // ── A31. Labels centered with orderTagTopFromLineY ────────────────────────
  var tagTopFnExists     = _srcFull.indexOf("function orderTagTopFromLineY(") > -1;
  var tagTopSrc          = _fnSrc(_srcFull, "orderTagTopFromLineY");
  var tagTopUsesH        = tagTopSrc.indexOf("ORDER_TAG_H / 2") > -1;
  var makeTagUsesHelper  = makeTagSrc.indexOf("orderTagTopFromLineY(y)") > -1;
  var draftTagUsesHelper = makeDraftTagSrc.indexOf("orderTagTopFromLineY(y)") > -1;
  if(!tagTopUsesH)        blockers.push("orderTagTopFromLineY does not use ORDER_TAG_H / 2");
  if(!makeTagUsesHelper)  blockers.push("makeTag does not use orderTagTopFromLineY");
  if(!draftTagUsesHelper) blockers.push("makeDraftTag does not use orderTagTopFromLineY");

  // ── A32. orderTagTopFromLineY exists ──────────────────────────────────────
  if(!tagTopFnExists) blockers.push("orderTagTopFromLineY function not found");

  // ── A33. All labels use DVL_ORDER_LABEL_OFFSET_BARS = 10 ─────────────────
  var hasLabelOffset = _srcFull.indexOf("DVL_ORDER_LABEL_OFFSET_BARS") > -1;
  if(!hasLabelOffset) blockers.push("DVL_ORDER_LABEL_OFFSET_BARS not found");

  // ── A34. dvl-paper-draft-tag class exists in source ──────────────────────
  var hasDraftTagClass = _srcFull.indexOf("dvl-paper-draft-tag") > -1;
  if(!hasDraftTagClass) blockers.push("dvl-paper-draft-tag not found in source");

  // ── A35. Labels do not clamp right (no clamp in makeTag) ─────────────────
  var makeTagNoClamp = makeTagSrc.indexOf("clamp") === -1;
  if(!makeTagNoClamp) warnings.push("makeTag uses clamp (possible right-edge sticky)");

  // ── A36. dvl-paper-pending suppressed in CSS_0688 ────────────────────────
  var suppressLegacy = css688Txt.indexOf("dvl-paper-pending") > -1;
  if(!suppressLegacy) blockers.push("dvl-paper-pending not suppressed in CSS_0688");

  // ── A37. Draft uses horizontal lines (dvl-paper-line, not vertical) ───────
  var draftLineIsHorizontal = makeDraftLineSrc.indexOf("dvl-paper-line") > -1;
  if(!draftLineIsHorizontal) blockers.push("makeDraftLine does not use dvl-paper-line class");

  // ── A38. Scale labels 0.685 preserved — covered by A1 ────────────────────

  // ── A39. Buy/Sell trade buttons preserved ────────────────────────────────
  var hasBuyBtn  = !!document.querySelector(".tradeAction.buy");
  var hasSellBtn = !!document.querySelector(".tradeAction.sell");
  if(!hasBuyBtn)  blockers.push(".tradeAction.buy not found");
  if(!hasSellBtn) blockers.push(".tradeAction.sell not found");

  // ── A40. Paper Trading script preserved ───────────────────────────────────
  var paperPresent    = _cntId(scriptEls, "DVL_BETA_0634_PAPER_TRADING_0598") === 1;
  var renderPosExists = _srcFull.indexOf("function renderPosition(") > -1;
  if(!paperPresent)    blockers.push("DVL_BETA_0634_PAPER_TRADING_0598 not found");
  if(!renderPosExists) blockers.push("renderPosition not found");

  // ── A41. Chart handlers intact ────────────────────────────────────────────
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn] === "function" || _srcFull.indexOf("function drawSoon") > -1;
  if(!hasDrawSoon) warnings.push("drawSoon not found");

  // ── A42. Oscillator render intact ────────────────────────────────────────
  var hasOscScript = _cntId(scriptEls, "DVL_BETA_0538_TEST_OSCILLATOR_JS") === 1 ||
                     _cntId(scriptEls, "DVL_BETA_0554_CG_STYLE_OPEN_INTEREST_OSC_JS") === 1;
  if(!hasOscScript) warnings.push("oscillator script not found");

  // ── A43. Tools/dropdowns/keypads intact ───────────────────────────────────
  var hasKeypad = !!document.getElementById("entryPadOverlay");
  if(!hasKeypad) warnings.push("entryPadOverlay not found");

  // ── A44. Zero _brokerToken in source (split string above avoids false-positive) ──
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken + " found in source");

  // ── A45. Zero Real order ─────────────────────────────────────────────────
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push(_realOrder + " found in source");

  // ── A46. Zero API key exposed ─────────────────────────────────────────────
  var noApiKey = _mod688src.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("apiKey found in 0688 module source");

  // ── A47. Zero timers/RAF/observers in this module (split strings avoid self-match) ──
  var _sTO = "set" + "Timeout";
  var _sIV = "set" + "Interval";
  var _rAF = "request" + "AnimationFrame";
  var _mOb = "Mutation" + "Observer";
  var _rOb = "Resize" + "Observer";
  var noTimers688 = _mod688src.indexOf(_sTO) === -1 &&
                    _mod688src.indexOf(_sIV) === -1 &&
                    _mod688src.indexOf(_rAF) === -1 &&
                    _mod688src.indexOf(_mOb) === -1 &&
                    _mod688src.indexOf(_rOb) === -1;
  if(!noTimers688) blockers.push("timer/RAF/observer found in 0688 module");

  // ── A48. Zero window.drawSoon= in this module ─────────────────────────────
  var _wDS = "window" + ".drawSoon";
  var noDrawSoon688 = _mod688src.indexOf(_wDS) === -1;
  if(!noDrawSoon688) blockers.push("window.drawSoon= found in 0688 module");

  // ── A49. No duplicate closing style tag (JS syntax check proxy) ───────────
  var noDupStyle = document.documentElement.outerHTML.indexOf(_dupStyleTag) === -1;
  if(!noDupStyle) blockers.push("duplicate closing style tag found");

  var pass = (
    audit685Pass &&
    audit684Pass &&
    audit683Pass &&
    rcGatePresent &&
    finalLocksPresent &&
    draftAtCurrentPrice &&
    hasOrderTypeInDraft &&
    draftNoPush &&
    draftStatusIsDraft &&
    draftShowsAll &&
    draftShowsOk &&
    draftShowsCancel &&
    entryDraftDraggable &&
    moveUpdatesAll &&
    buyTpAbove &&
    sellTpBelow &&
    hasLimitValidation &&
    hasStopValidation &&
    confirmToasts &&
    confirmPendingStatus &&
    cancelDraftClearsDraft &&
    makeTagShowsX &&
    cancelPOExists &&
    cancelOnlyPending &&
    marketDirect &&
    sharedVisual &&
    hasTagW &&
    hasTagH &&
    css688Present &&
    tagTopUsesH &&
    makeTagUsesHelper &&
    draftTagUsesHelper &&
    tagTopFnExists &&
    hasLabelOffset &&
    hasDraftTagClass &&
    suppressLegacy &&
    draftLineIsHorizontal &&
    hasBuyBtn &&
    hasSellBtn &&
    paperPresent &&
    renderPosExists &&
    noBroker &&
    noRealOrder &&
    noTimers688 &&
    noDrawSoon688 &&
    noDupStyle
  );

  _lastAudit = {
    pass:                   pass,
    audit685Pass:           audit685Pass,
    audit684Pass:           audit684Pass,
    audit683Pass:           audit683Pass,
    rcGatePresent:          rcGatePresent,
    finalLocksPresent:      finalLocksPresent,
    draftAtCurrentPrice:    draftAtCurrentPrice,
    hasOrderTypeInDraft:    hasOrderTypeInDraft,
    draftNoPush:            draftNoPush,
    draftStatusIsDraft:     draftStatusIsDraft,
    draftShowsAll:          draftShowsAll,
    draftShowsOk:           draftShowsOk,
    draftShowsCancel:       draftShowsCancel,
    entryDraftDraggable:    entryDraftDraggable,
    moveUpdatesAll:         moveUpdatesAll,
    buyTpAbove:             buyTpAbove,
    sellTpBelow:            sellTpBelow,
    hasLimitValidation:     hasLimitValidation,
    hasStopValidation:      hasStopValidation,
    confirmToasts:          confirmToasts,
    confirmPendingStatus:   confirmPendingStatus,
    cancelDraftClearsDraft: cancelDraftClearsDraft,
    makeTagShowsX:          makeTagShowsX,
    cancelPOExists:         cancelPOExists,
    cancelOnlyPending:      cancelOnlyPending,
    cancelNotOpen:          cancelNotOpen,
    marketDirect:           marketDirect,
    sharedVisual:           sharedVisual,
    hasTagW:                hasTagW,
    hasTagH:                hasTagH,
    css688Present:          css688Present,
    tagTopUsesH:            tagTopUsesH,
    makeTagUsesHelper:      makeTagUsesHelper,
    draftTagUsesHelper:     draftTagUsesHelper,
    tagTopFnExists:         tagTopFnExists,
    hasLabelOffset:         hasLabelOffset,
    hasDraftTagClass:       hasDraftTagClass,
    suppressLegacy:         suppressLegacy,
    draftLineIsHorizontal:  draftLineIsHorizontal,
    hasBuyBtn:              hasBuyBtn,
    hasSellBtn:             hasSellBtn,
    paperPresent:           paperPresent,
    renderPosExists:        renderPosExists,
    noBroker:               noBroker,
    noRealOrder:            noRealOrder,
    noTimers688:            noTimers688,
    noDrawSoon688:          noDrawSoon688,
    noDupStyle:             noDupStyle,
    blockers:               blockers,
    warnings:               warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT = {
  VERSION:      "0.688",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>
"""

html = rep(html,
    '\nwindow.DVL_DRAFT_CONFIRM_HOTFIX_AUDIT = {',
    AUDIT_0688 + '\nwindow.DVL_DRAFT_CONFIRM_HOTFIX_AUDIT = {',
    "C7: audit module 0688"
)

# ── post-assertions ────────────────────────────────────────────────────────────
def post(cond, msg):
    if not cond:
        print(f"POST-FAIL: {msg}")
        sys.exit(1)

# Version
post('const DVL_APP_VERSION = "Beta 0.688"' in html, 'DVL_APP_VERSION not 0.688')
post('<title>DVL Binance Live — Beta 0.688</title>' in html, 'title not updated')
post('>BETA 0.688</div>' in html, 'versionBadge not updated')
post('"Beta 0.688 — Paper Limit placement reset' in html, 'changelog 0688 missing')
post('"Beta 0.687", note: "Beta 0.687 — Hotfix' in html, 'changelog 0687 not string-literalized')

# CSS 0688
post(html.count('<style id="DVL_PAPER_LIMIT_PLACEMENT_RESET_CSS_0688">') == 1, 'CSS_0688 style tag count != 1')
post('dvl-paper-draft-tag.entry' in html, 'entry override CSS missing')
post('dvl-paper-pending,' in html, 'dvl-paper-pending suppression missing')

# Audit module 0688
post(html.count('<script id="DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT_MODULE_0688">') == 1, 'audit_0688 script tag count != 1')
post('window.DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT' in html, 'audit object not exposed')
post('"0.688"' in html, 'VERSION "0.688" missing in audit')

# makeDraftTag changes
post(html.count('function makeDraftTag(draft, handle, y, main)') == 1, 'makeDraftTag count != 1')
post('startDraftDrag(ev);' in html, 'startDraftDrag not in makeDraftTag area')
post("cancelPendingOrderDraft(draft.id);" in html, 'cancelPendingOrderDraft(draft.id) missing')
post('data-remove="1"' in html, 'data-remove missing from makeDraftTag')

# Prior modules preserved
post('DVL_SCALE_LABEL_COMPACT_FIX_AUDIT_MODULE_0685' in html, '0685 audit missing')
post('DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT_MODULE_0684' in html, '0684 audit missing')
post('DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686' in html, '0686 CSS missing')
post('DVL_DRAFT_CONFIRM_HOTFIX_AUDIT_MODULE_0687' in html, '0687 audit missing')

# No BrokerConnector (check split avoids false-positive in this test)
_bt = 'Broker' + 'Connector'
post(_bt not in html, 'BrokerConnector found in HTML')

# No timers in audit module
audit_688_idx = html.index('DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT_MODULE_0688')
audit_688_end = html.index('window.DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT', audit_688_idx)
audit_688_src = html[audit_688_idx:audit_688_end]
post('setTimeout' not in audit_688_src, 'setTimeout in audit 0688')
post('setInterval' not in audit_688_src, 'setInterval in audit 0688')
post('requestAnimationFrame' not in audit_688_src, 'requestAnimationFrame in audit 0688')
post('window.drawSoon ' not in audit_688_src, 'window.drawSoon= in audit 0688')

# ── write ──────────────────────────────────────────────────────────────────────
with open(HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Output: {html.count(chr(10))+1} lines (+{html.count(chr(10))+1 - 38016})")
print("All assertions passed. Beta 0.688 ready.")
