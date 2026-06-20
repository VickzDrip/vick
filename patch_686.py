"""
DVL Binance Live — Beta 0.686 patch
Paper Trading Placement Flow Fix
"""
import os, sys, shutil

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"

# ── helpers ──────────────────────────────────────────────────────────────────

def rep(html, old, new, label):
    count = html.count(old)
    if count != 1:
        print(f"FAIL [{label}]: found {count}x (expected 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

# ── load ─────────────────────────────────────────────────────────────────────

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

orig_lines = len(html.splitlines())
print(f"Input: {orig_lines} lines")

# ── backup ───────────────────────────────────────────────────────────────────

backup = SRC.replace("index.html", "index-44.before_0686_paper_placement_flow_fix.html")
shutil.copy2(SRC, backup)
print(f"Backup: {backup}")

# ═══════════════════════════════════════════════════════════════════════════════
# C1 — Version: DVL_APP_VERSION
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.685";',
    'const DVL_APP_VERSION = "Beta 0.686";',
    "C1-version-constant"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C2 — Version: <title>
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<title>DVL Binance Live — Beta 0.685</title>',
    '<title>DVL Binance Live — Beta 0.686</title>',
    "C2-title"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C3 — Version: header badge
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '">BETA 0.685</div>',
    '">BETA 0.686</div>',
    "C3-badge"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C4 — Changelog: add 0686 entry, push 0685 down
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.685 — Scale label compact fix: standardized current price and oscillator scale labels to fit the 70px right scale without card-like oversized boxes." },\n  { version: "Beta 0.684",',
    '  { version: DVL_APP_VERSION, note: "Beta 0.686 — Paper Trading Placement Flow Fix: draft spawns at current price, ENTRY draggable, pending orders cancelable with ×, labels centered on lines." },\n  { version: "Beta 0.685", note: "Beta 0.685 — Scale label compact fix: standardized current price and oscillator scale labels to fit the 70px right scale without card-like oversized boxes." },\n  { version: "Beta 0.684",',
    "C4-changelog"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C5 — CSS marker 0686 (insert between 0685 CSS and 0672 audit script)
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '  All changes are Canvas-side; this marker records the beta boundary.\n*/\n</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    '  All changes are Canvas-side; this marker records the beta boundary.\n*/\n</style>\n\n<style id="DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686">\n/*\n  DVL Beta 0.686 — Paper Trading Placement Flow Fix.\n  Draft born at current price; user drags ENTRY to desired price.\n  Pending confirmed orders show cancel on all handles.\n  Labels vertically centered on lines via orderTagTopFromLineY(y).\n*/\n.dvl-paper-draft-hit {\n  position: absolute !important;\n  left: 0 !important;\n  right: 54px !important;\n  height: 24px !important;\n  margin-top: -12px !important;\n  pointer-events: auto !important;\n  touch-action: none !important;\n  background: transparent !important;\n  cursor: ns-resize !important;\n  z-index: 18 !important;\n}\n</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "C5-css-0686"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C6 — state: add draftDrag: null
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '      pending: null,\n      pendingDraft: null\n    };',
    '      pending: null,\n      pendingDraft: null,\n      draftDrag: null\n    };',
    "C6-state-draftDrag"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C7 — add orderTagTopFromLineY helper after ORDER_TAG_FONT constant
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '    var ORDER_TAG_FONT   = 11;\n\n    function makeDraftLine',
    '    var ORDER_TAG_FONT   = 11;\n\n    function orderTagTopFromLineY(y){\n      return Math.round(y - ORDER_TAG_H / 2);\n    }\n\n    function makeDraftLine',
    "C7-orderTagTopFromLineY"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C8 — makeDraftLine: add ENTRY hit element for drag
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    (
        '    function makeDraftLine(draft, handle, y){\n'
        '      var visual = document.createElement("div");\n'
        '      visual.className = "dvl-paper-line " + handle + " dvl-paper-draft-line";\n'
        '      visual.dataset.status = "draft";\n'
        '      visual.dataset.id = draft.id;\n'
        '      visual.style.top = y.toFixed(1) + "px";\n'
        '      visual.style.pointerEvents = "none";\n'
        '      layer.appendChild(visual);\n'
        '    }'
    ),
    (
        '    function makeDraftLine(draft, handle, y){\n'
        '      var visual = document.createElement("div");\n'
        '      visual.className = "dvl-paper-line " + handle + " dvl-paper-draft-line";\n'
        '      visual.dataset.status = "draft";\n'
        '      visual.dataset.id = draft.id;\n'
        '      visual.style.top = y.toFixed(1) + "px";\n'
        '      visual.style.pointerEvents = "none";\n'
        '      layer.appendChild(visual);\n'
        '      if(handle === "entry"){\n'
        '        var hit = document.createElement("div");\n'
        '        hit.className = "dvl-paper-draft-hit entry";\n'
        '        hit.style.top = y.toFixed(1) + "px";\n'
        '        hit.dataset.id = draft.id;\n'
        '        hit.addEventListener("pointerdown", function(ev){ startDraftDrag(ev); }, {passive:false});\n'
        '        layer.appendChild(hit);\n'
        '      }\n'
        '    }'
    ),
    "C8-makeDraftLine-hit"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C9 — makeDraftTag: replace hardcoded (y-19) with orderTagTopFromLineY
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '      el.style.top = (y - 19).toFixed(1) + "px";\n      el.style.width        = ORDER_TAG_W      + "px";',
    '      el.style.top = orderTagTopFromLineY(y).toFixed(1) + "px";\n      el.style.width        = ORDER_TAG_W      + "px";',
    "C9-makeDraftTag-top"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C10 — makeTag: replace hardcoded (y-19) with orderTagTopFromLineY
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '      el.style.top = (y - 19).toFixed(1) + "px";\n      el.dataset.id = pos.id;',
    '      el.style.top = orderTagTopFromLineY(y).toFixed(1) + "px";\n      el.dataset.id = pos.id;',
    "C10-makeTag-top"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C11 — makeTag: X button for pending orders + correct click handler
# The old string targets makeTag specifically (uses `el.addEventListener` not `fixedLabel.addEventListener`,
# and ends with `layer.appendChild(el);\n    }` which is unique to makeTag)
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    (
        '        (handle === "entry" ? \'<span class="x" data-remove="1">×</span>\' : "");\n'
        '      el.addEventListener("pointerdown", function(ev){\n'
        '        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1") return;\n'
        '\n'
        '        const canDragHandle = handle !== "entry" || pos.status === "pending";\n'
        '        if(!canDragHandle) return;\n'
        '\n'
        '        startPaperDrag(ev, pos.id, handle);\n'
        '      }, {passive:false});\n'
        '      el.addEventListener("click", function(ev){\n'
        '        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){\n'
        '          ev.preventDefault();\n'
        '          ev.stopPropagation();\n'
        '          removePosition(pos.id);\n'
        '        }\n'
        '      });\n'
        '      layer.appendChild(el);\n'
        '    }'
    ),
    (
        '        (pos.status === "pending" || handle === "entry" ? \'<span class="x" data-remove="1">×</span>\' : "");\n'
        '      el.addEventListener("pointerdown", function(ev){\n'
        '        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1") return;\n'
        '\n'
        '        const canDragHandle = handle !== "entry" || pos.status === "pending";\n'
        '        if(!canDragHandle) return;\n'
        '\n'
        '        startPaperDrag(ev, pos.id, handle);\n'
        '      }, {passive:false});\n'
        '      el.addEventListener("click", function(ev){\n'
        '        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){\n'
        '          ev.preventDefault();\n'
        '          ev.stopPropagation();\n'
        '          if(pos.status === "pending"){\n'
        '            cancelPendingOrder(pos.id);\n'
        '          }else{\n'
        '            removePosition(pos.id);\n'
        '          }\n'
        '        }\n'
        '      });\n'
        '      layer.appendChild(el);\n'
        '    }'
    ),
    "C11-makeTag-x-button"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C12 — createPendingOrderDraft: remove offset, draft born at current price
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    (
        '    function createPendingOrderDraft(side){\n'
        '      const price = lastPrice();\n'
        '      if(!(price > 0)){ toast("Aguardando preço"); return; }\n'
        '      const offset = price * 0.002;\n'
        '      const isLimit = state.orderType === "Limit";\n'
        '      const isBuy = side === "buy";\n'
        '      // Limit: buy below market, sell above; Stop: buy above market, sell below\n'
        '      const draftPrice = isLimit\n'
        '        ? (isBuy ? price - offset : price + offset)\n'
        '        : (isBuy ? price + offset : price - offset);'
    ),
    (
        '    function createPendingOrderDraft(side){\n'
        '      const price = lastPrice();\n'
        '      if(!(price > 0)){ toast("Aguardando preço"); return; }\n'
        '      const isLimit = state.orderType === "Limit";\n'
        '      const isBuy = side === "buy";\n'
        '      // Draft born at current price; user drags ENTRY to desired position\n'
        '      const draftPrice = price;'
    ),
    "C12-createPendingOrderDraft-noOffset"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C13 — Add startDraftDrag / moveDraftDrag / endDraftDrag before startOrder
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '    function startOrder(side){',
    (
        '    function startDraftDrag(ev){\n'
        '      if(!state.pendingDraft) return;\n'
        '      var si = scaleInfo();\n'
        '      if(!si) return;\n'
        '      ev.preventDefault();\n'
        '      ev.stopPropagation();\n'
        '      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();\n'
        '      var rect = dom.wrap.getBoundingClientRect();\n'
        '      var y = ev.clientY - rect.top;\n'
        '      state.draftDrag = {\n'
        '        pointerId: ev.pointerId,\n'
        '        startPrice: si.pY(y),\n'
        '        origEntry: Number(state.pendingDraft.entry),\n'
        '        origTp:    Number(state.pendingDraft.tp),\n'
        '        origSl:    Number(state.pendingDraft.sl)\n'
        '      };\n'
        '      window.__dvlPaperDragging = true;\n'
        '      document.documentElement.classList.add("dvl-paper-dragging");\n'
        '      try{\n'
        '        ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId);\n'
        '      }catch(_){}\n'
        '    }\n'
        '\n'
        '    function moveDraftDrag(ev){\n'
        '      if(!state.draftDrag || !state.pendingDraft) return;\n'
        '      if(state.draftDrag.pointerId != null && ev.pointerId != null && state.draftDrag.pointerId !== ev.pointerId) return;\n'
        '      ev.preventDefault();\n'
        '      ev.stopPropagation();\n'
        '      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();\n'
        '      var si = scaleInfo();\n'
        '      if(!si) return;\n'
        '      var rect = dom.wrap.getBoundingClientRect();\n'
        '      var y = ev.clientY - rect.top;\n'
        '      var curPrice = si.pY(y);\n'
        '      var dp = curPrice - state.draftDrag.startPrice;\n'
        '      state.pendingDraft.entry = state.draftDrag.origEntry + dp;\n'
        '      state.pendingDraft.tp    = state.draftDrag.origTp    + dp;\n'
        '      state.pendingDraft.sl    = state.draftDrag.origSl    + dp;\n'
        '      render();\n'
        '    }\n'
        '\n'
        '    function endDraftDrag(){\n'
        '      if(!state.draftDrag) return;\n'
        '      state.draftDrag = null;\n'
        '      window.__dvlPaperDragging = false;\n'
        '      document.documentElement.classList.remove("dvl-paper-dragging");\n'
        '      render();\n'
        '    }\n'
        '\n'
        '    function startOrder(side){'
    ),
    "C13-draftDrag-fns"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C14 — confirmPendingOrderDraft: add side/type validation
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    (
        '    function confirmPendingOrderDraft(id){\n'
        '      if(!state.pendingDraft) return;\n'
        '      if(id && String(state.pendingDraft.id) !== String(id)) return;\n'
        '      const pos = Object.assign({}, state.pendingDraft, { status: "pending" });\n'
        '      state.positions.push(pos);\n'
        '      state.pendingDraft = null;\n'
        '      save();\n'
        '      render();\n'
        '    }'
    ),
    (
        '    function confirmPendingOrderDraft(id){\n'
        '      if(!state.pendingDraft) return;\n'
        '      if(id && String(state.pendingDraft.id) !== String(id)) return;\n'
        '      var draft = state.pendingDraft;\n'
        '      var live  = lastPrice();\n'
        '      if(live > 0){\n'
        '        var dEntry = Number(draft.entry);\n'
        '        var dType  = draft.orderType || state.orderType;\n'
        '        var dSide  = draft.side;\n'
        '        var validOrder = true;\n'
        '        var validMsg   = "";\n'
        '        if(dType === "Limit"){\n'
        '          if(dSide === "buy"  && !(dEntry < live)){ validOrder = false; validMsg = "Limit Buy: entrada deve estar abaixo do preço atual"; }\n'
        '          if(dSide === "sell" && !(dEntry > live)){ validOrder = false; validMsg = "Limit Sell: entrada deve estar acima do preço atual"; }\n'
        '        }else if(dType === "Stop"){\n'
        '          if(dSide === "buy"  && !(dEntry > live)){ validOrder = false; validMsg = "Stop Buy: entrada deve estar acima do preço atual"; }\n'
        '          if(dSide === "sell" && !(dEntry < live)){ validOrder = false; validMsg = "Stop Sell: entrada deve estar abaixo do preço atual"; }\n'
        '        }\n'
        '        if(!validOrder){ toast(validMsg); render(); return; }\n'
        '      }\n'
        '      const pos = Object.assign({}, draft, { status: "pending" });\n'
        '      state.positions.push(pos);\n'
        '      state.pendingDraft = null;\n'
        '      save();\n'
        '      render();\n'
        '    }'
    ),
    "C14-confirmPendingOrderDraft-validation"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C15 — Add cancelPendingOrder after cancelPendingOrderDraft
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    (
        '    function cancelPendingOrderDraft(id){\n'
        '      if(!state.pendingDraft) return;\n'
        '      if(id && String(state.pendingDraft.id) !== String(id)) return;\n'
        '      state.pendingDraft = null;\n'
        '      render();\n'
        '    }\n'
        '\n'
        '    function fillPendingOrderIfTriggered'
    ),
    (
        '    function cancelPendingOrderDraft(id){\n'
        '      if(!state.pendingDraft) return;\n'
        '      if(id && String(state.pendingDraft.id) !== String(id)) return;\n'
        '      state.pendingDraft = null;\n'
        '      render();\n'
        '    }\n'
        '\n'
        '    function cancelPendingOrder(orderId){\n'
        '      state.positions = state.positions.filter(function(p){\n'
        '        return !(String(p.id) === String(orderId) && p.status === "pending");\n'
        '      });\n'
        '      save();\n'
        '      render();\n'
        '    }\n'
        '\n'
        '    function fillPendingOrderIfTriggered'
    ),
    "C15-cancelPendingOrder"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C16 — Add draftDrag window event listeners after existing paper drag listeners
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    (
        '    window.addEventListener("mouseup", function(){\n'
        '      if(state.drag) endPaperDrag();\n'
        '      levDrag = false;\n'
        '    }, {passive:true, capture:true});\n'
        '\n'
        '    bind(dom.entryCard, "click", openPad);'
    ),
    (
        '    window.addEventListener("mouseup", function(){\n'
        '      if(state.drag) endPaperDrag();\n'
        '      levDrag = false;\n'
        '    }, {passive:true, capture:true});\n'
        '\n'
        '    window.addEventListener("pointermove", function(ev){\n'
        '      if(!state.draftDrag) return;\n'
        '      moveDraftDrag(ev);\n'
        '    }, {passive:false, capture:true});\n'
        '    window.addEventListener("pointerup", function(){\n'
        '      if(state.draftDrag) endDraftDrag();\n'
        '    }, {passive:true, capture:true});\n'
        '    window.addEventListener("pointercancel", function(){\n'
        '      if(state.draftDrag) endDraftDrag();\n'
        '    }, {passive:true, capture:true});\n'
        '    window.addEventListener("touchend", function(){\n'
        '      if(state.draftDrag) endDraftDrag();\n'
        '    }, {passive:true, capture:true});\n'
        '    window.addEventListener("mouseup", function(){\n'
        '      if(state.draftDrag) endDraftDrag();\n'
        '    }, {passive:true, capture:true});\n'
        '\n'
        '    bind(dom.entryCard, "click", openPad);'
    ),
    "C16-draftDrag-event-listeners"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C17 — Audit module 0686 (insert before </head>)
# ═══════════════════════════════════════════════════════════════════════════════
_AUDIT_0686 = r'''
<script id="DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT_MODULE_0686">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _dupStyleTag  = '<' + '/style><' + '/style>';
var _brokerToken  = 'Broker' + 'Connector';
var _yMinus19     = '(y' + ' - 19)';
var _priceOffset  = 'price' + ' * 0.002';

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
  var start = full.indexOf("function " + fnName);
  if(start === -1) return "";
  var end = full.indexOf("\n    function ", start + 10);
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

  var _mod686 = document.getElementById("DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT_MODULE_0686");
  var _mod686src = _mod686 ? _mod686.textContent : "";

  // ── CSS & module presence ─────────────────────────────────────────────────

  // A1. CSS_0686 present 1x
  var css686Present = _cntId(styleEls, "DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686") === 1;
  if(!css686Present) blockers.push("DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686 not found");

  // A2. Audit module 0686 present 1x
  var mod686Present = _cntId(scriptEls, "DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT_MODULE_0686") === 1;
  if(!mod686Present) blockers.push("DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT_MODULE_0686 not 1x");

  // A3. No duplicate closing style tag
  var noDupStyle = document.documentElement.outerHTML.indexOf(_dupStyleTag) === -1;
  if(!noDupStyle) blockers.push("duplicate closing style tag found");

  // ── Version ───────────────────────────────────────────────────────────────

  // A4. DVL_APP_VERSION === "Beta 0.686"
  var versionOk = (typeof window.DVL_APP_VERSION !== "undefined") && window.DVL_APP_VERSION === "Beta 0.686";
  if(!versionOk) blockers.push("DVL_APP_VERSION !== 'Beta 0.686' (got: " + window.DVL_APP_VERSION + ")");

  // ── createPendingOrderDraft — no offset ──────────────────────────────────

  // A5. createPendingOrderDraft does NOT use price offset
  var createDraftSrc = _fnSrc(_srcFull, "createPendingOrderDraft");
  var draftNoOffset  = createDraftSrc.indexOf(_priceOffset) === -1;
  if(!draftNoOffset) blockers.push("createPendingOrderDraft still uses price * 0.002 offset");

  // A6. createPendingOrderDraft sets draftPrice = price (born at current price)
  var draftAtCurrentPrice = createDraftSrc.indexOf("draftPrice = price") > -1;
  if(!draftAtCurrentPrice) blockers.push("createPendingOrderDraft: draftPrice not set to current price");

  // ── confirmPendingOrderDraft — validation ─────────────────────────────────

  // A7. confirmPendingOrderDraft has Limit validation
  var confirmSrc = _fnSrc(_srcFull, "confirmPendingOrderDraft");
  var hasLimitValidation = confirmSrc.indexOf('"Limit"') > -1 && confirmSrc.indexOf("validOrder") > -1;
  if(!hasLimitValidation) blockers.push("confirmPendingOrderDraft missing Limit validation");

  // A8. confirmPendingOrderDraft has Stop validation
  var hasStopValidation = confirmSrc.indexOf('"Stop"') > -1;
  if(!hasStopValidation) blockers.push("confirmPendingOrderDraft missing Stop validation");

  // A9. confirmPendingOrderDraft toasts on invalid (calls toast + return)
  var confirmToasts = confirmSrc.indexOf("toast(validMsg)") > -1;
  if(!confirmToasts) blockers.push("confirmPendingOrderDraft does not toast on invalid");

  // A10. confirmPendingOrderDraft still sets status:"pending" (0.684 invariant)
  var confirmPendingStatus = confirmSrc.indexOf('status: "pending"') > -1;
  if(!confirmPendingStatus) blockers.push('confirmPendingOrderDraft does not set status:"pending"');

  // ── cancelPendingOrder ────────────────────────────────────────────────────

  // A11. cancelPendingOrder function exists
  var cancelPendingOrderExists = _srcFull.indexOf("function cancelPendingOrder") > -1;
  if(!cancelPendingOrderExists) blockers.push("cancelPendingOrder function not found");

  // A12. cancelPendingOrder only removes status === "pending"
  var cancelPOSrc        = _fnSrc(_srcFull, "cancelPendingOrder");
  var cancelOnlyPending  = cancelPOSrc.indexOf('p.status === "pending"') > -1;
  if(!cancelOnlyPending) blockers.push('cancelPendingOrder does not check p.status === "pending"');

  // A13. cancelPendingOrder does NOT match "open" positions
  var cancelNotOpen = cancelPOSrc.indexOf('"open"') === -1;
  if(!cancelNotOpen) warnings.push('cancelPendingOrder references "open" unexpectedly');

  // ── orderTagTopFromLineY ──────────────────────────────────────────────────

  // A14. orderTagTopFromLineY function exists
  var tagTopFnExists = _srcFull.indexOf("function orderTagTopFromLineY") > -1;
  if(!tagTopFnExists) blockers.push("orderTagTopFromLineY function not found");

  // A15. orderTagTopFromLineY uses ORDER_TAG_H / 2
  var tagTopSrc     = _fnSrc(_srcFull, "orderTagTopFromLineY");
  var tagTopUsesH   = tagTopSrc.indexOf("ORDER_TAG_H / 2") > -1;
  if(!tagTopUsesH) blockers.push("orderTagTopFromLineY does not use ORDER_TAG_H / 2");

  // ── makeTag / makeDraftTag ────────────────────────────────────────────────

  // A16. makeTag uses orderTagTopFromLineY (source check)
  var makeTagSrc        = _fnSrc(_srcFull, "makeTag");
  var makeTagUsesHelper = makeTagSrc.indexOf("orderTagTopFromLineY(y)") > -1;
  if(!makeTagUsesHelper) blockers.push("makeTag does not use orderTagTopFromLineY");

  // A17. makeTag does NOT use hardcoded (y - 19)
  var makeTagNoY19 = makeTagSrc.indexOf(_yMinus19) === -1;
  if(!makeTagNoY19) blockers.push("makeTag still uses (y - 19) hardcoded offset");

  // A18. makeDraftTag uses orderTagTopFromLineY (source check)
  var makeDraftTagSrc     = _fnSrc(_srcFull, "makeDraftTag");
  var draftTagUsesHelper  = makeDraftTagSrc.indexOf("orderTagTopFromLineY(y)") > -1;
  if(!draftTagUsesHelper) blockers.push("makeDraftTag does not use orderTagTopFromLineY");

  // A19. makeDraftTag does NOT use hardcoded (y - 19)
  var makeDraftTagNoY19 = makeDraftTagSrc.indexOf(_yMinus19) === -1;
  if(!makeDraftTagNoY19) blockers.push("makeDraftTag still uses (y - 19) hardcoded offset");

  // A20. makeTag shows X for pending orders (checks pos.status === "pending")
  var makeTagShowsXForPending = makeTagSrc.indexOf('pos.status === "pending"') > -1;
  if(!makeTagShowsXForPending) blockers.push('makeTag does not check pos.status === "pending" for X button');

  // A21. makeTag click calls cancelPendingOrder for pending
  var makeTagCallsCancelPending = makeTagSrc.indexOf("cancelPendingOrder(pos.id)") > -1;
  if(!makeTagCallsCancelPending) blockers.push("makeTag does not call cancelPendingOrder for pending orders");

  // A22. makeTag still calls removePosition for non-pending
  var makeTagCallsRemove = makeTagSrc.indexOf("removePosition(pos.id)") > -1;
  if(!makeTagCallsRemove) blockers.push("makeTag does not call removePosition (non-pending path missing)");

  // ── makeDraftLine ENTRY hit ───────────────────────────────────────────────

  // A23. makeDraftLine adds dvl-paper-draft-hit for ENTRY
  var makeDraftLineSrc     = _fnSrc(_srcFull, "makeDraftLine");
  var draftLineHasHit      = makeDraftLineSrc.indexOf("dvl-paper-draft-hit") > -1;
  if(!draftLineHasHit) blockers.push("makeDraftLine does not add dvl-paper-draft-hit");

  // A24. makeDraftLine calls startDraftDrag
  var draftLineCallsDrag = makeDraftLineSrc.indexOf("startDraftDrag(ev)") > -1;
  if(!draftLineCallsDrag) blockers.push("makeDraftLine does not call startDraftDrag");

  // ── Draft drag functions ──────────────────────────────────────────────────

  // A25. startDraftDrag exists
  var startDraftDragExists = _srcFull.indexOf("function startDraftDrag") > -1;
  if(!startDraftDragExists) blockers.push("startDraftDrag function not found");

  // A26. moveDraftDrag exists
  var moveDraftDragExists = _srcFull.indexOf("function moveDraftDrag") > -1;
  if(!moveDraftDragExists) blockers.push("moveDraftDrag function not found");

  // A27. endDraftDrag exists
  var endDraftDragExists = _srcFull.indexOf("function endDraftDrag") > -1;
  if(!endDraftDragExists) blockers.push("endDraftDrag function not found");

  // A28. startDraftDrag sets state.draftDrag
  var startDraftSrc    = _fnSrc(_srcFull, "startDraftDrag");
  var startSetsDraft   = startDraftSrc.indexOf("state.draftDrag = {") > -1;
  if(!startSetsDraft) blockers.push("startDraftDrag does not set state.draftDrag");

  // A29. moveDraftDrag updates pendingDraft.entry (ENTRY follows drag)
  var moveDraftSrc   = _fnSrc(_srcFull, "moveDraftDrag");
  var moveUpdatesEntry = moveDraftSrc.indexOf("state.pendingDraft.entry") > -1;
  if(!moveUpdatesEntry) blockers.push("moveDraftDrag does not update pendingDraft.entry");

  // A30. moveDraftDrag updates pendingDraft.tp (TP follows with R:R)
  var moveUpdatesTp = moveDraftSrc.indexOf("state.pendingDraft.tp") > -1;
  if(!moveUpdatesTp) blockers.push("moveDraftDrag does not update pendingDraft.tp");

  // A31. moveDraftDrag updates pendingDraft.sl (SL follows with R:R)
  var moveUpdatesSl = moveDraftSrc.indexOf("state.pendingDraft.sl") > -1;
  if(!moveUpdatesSl) blockers.push("moveDraftDrag does not update pendingDraft.sl");

  // A32. endDraftDrag clears state.draftDrag
  var endDraftSrc    = _fnSrc(_srcFull, "endDraftDrag");
  var endClearsDraft = endDraftSrc.indexOf("state.draftDrag = null") > -1;
  if(!endClearsDraft) blockers.push("endDraftDrag does not clear state.draftDrag");

  // A33. state.draftDrag initialized in state object
  var draftDragInState = _srcFull.indexOf("draftDrag: null") > -1;
  if(!draftDragInState) blockers.push("state.draftDrag not initialized");

  // ── CSS_0686 content ──────────────────────────────────────────────────────

  // A34. dvl-paper-draft-hit class in CSS_0686
  var css686El  = document.getElementById("DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686");
  var css686Txt = css686El ? css686El.textContent : "";
  var draftHitInCSS = css686Txt.indexOf("dvl-paper-draft-hit") > -1;
  if(!draftHitInCSS) blockers.push("dvl-paper-draft-hit not found in CSS_0686");

  // A35. cursor:ns-resize in CSS_0686 (drag hint)
  var draftHitCursor = css686Txt.indexOf("ns-resize") > -1;
  if(!draftHitCursor) warnings.push("ns-resize cursor not in CSS_0686");

  // ── Prior patches preserved ───────────────────────────────────────────────

  // A36. DVL_SCALE_LABEL_COMPACT_FIX_AUDIT passes (0.685 chain)
  var audit685Pass = false;
  try{
    if(typeof window.DVL_SCALE_LABEL_COMPACT_FIX_AUDIT !== "undefined"){
      var r685 = window.DVL_SCALE_LABEL_COMPACT_FIX_AUDIT.audit();
      audit685Pass = !!(r685 && r685.pass === true);
    }
  }catch(e){ warnings.push("DVL_SCALE_LABEL_COMPACT_FIX_AUDIT threw: " + e.message); }
  if(!audit685Pass) blockers.push("DVL_SCALE_LABEL_COMPACT_FIX_AUDIT.audit().pass not true");

  // A37. Final locks 0659-0662 preserved
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // A38. DVL_BUTTON_SYSTEM preserved
  var btnSysOk = typeof window.DVL_BUTTON_SYSTEM !== "undefined";
  if(!btnSysOk) blockers.push("DVL_BUTTON_SYSTEM not found");

  // A39. renderDraftPosition exists (0.684 preserved)
  var renderDraftExists = _srcFull.indexOf("function renderDraftPosition") > -1;
  if(!renderDraftExists) blockers.push("renderDraftPosition not found (0.684 broken)");

  // A40. createPendingOrderDraft exists
  var createDraftExists = _srcFull.indexOf("function createPendingOrderDraft") > -1;
  if(!createDraftExists) blockers.push("createPendingOrderDraft not found");

  // A41. cancelPendingOrderDraft exists (draft cancel preserved)
  var cancelDraftExists = _srcFull.indexOf("function cancelPendingOrderDraft") > -1;
  if(!cancelDraftExists) blockers.push("cancelPendingOrderDraft not found");

  // A42. renderPosition exists (paper trading)
  var renderPosExists = _srcFull.indexOf("function renderPosition") > -1;
  if(!renderPosExists) blockers.push("renderPosition not found (Paper Trading broken)");

  // A43. Zero _brokerToken in source (split string above avoids false-positive)
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken + " found in source");

  // A44. Zero timers/RAF/observers in this module source
  var noTimers686 = _mod686src.indexOf("setTimeout") === -1 &&
                    _mod686src.indexOf("setInterval") === -1 &&
                    _mod686src.indexOf("requestAnimationFrame") === -1 &&
                    _mod686src.indexOf("MutationObserver") === -1 &&
                    _mod686src.indexOf("ResizeObserver") === -1;
  if(!noTimers686) blockers.push("timer/RAF/observer found in 0686 module");

  // A45. Zero window.drawSoon= in this module source
  var noDrawSoon686 = _mod686src.indexOf("window.drawSoon") === -1;
  if(!noDrawSoon686) blockers.push("window.drawSoon= found in 0686 module");

  // A46. createPendingOrderDraft does NOT push to positions (0.684 invariant)
  var draftNoPush = createDraftSrc.indexOf("state.positions.push") === -1;
  if(!draftNoPush) blockers.push("createPendingOrderDraft still calls state.positions.push");

  var pass = (
    css686Present &&
    mod686Present &&
    noDupStyle &&
    versionOk &&
    draftNoOffset &&
    draftAtCurrentPrice &&
    hasLimitValidation &&
    hasStopValidation &&
    confirmToasts &&
    confirmPendingStatus &&
    cancelPendingOrderExists &&
    cancelOnlyPending &&
    tagTopFnExists &&
    tagTopUsesH &&
    makeTagUsesHelper &&
    makeTagNoY19 &&
    draftTagUsesHelper &&
    makeDraftTagNoY19 &&
    makeTagShowsXForPending &&
    makeTagCallsCancelPending &&
    makeTagCallsRemove &&
    draftLineHasHit &&
    draftLineCallsDrag &&
    startDraftDragExists &&
    moveDraftDragExists &&
    endDraftDragExists &&
    startSetsDraft &&
    moveUpdatesEntry &&
    moveUpdatesTp &&
    moveUpdatesSl &&
    endClearsDraft &&
    draftDragInState &&
    draftHitInCSS &&
    audit685Pass &&
    finalLocksPresent &&
    btnSysOk &&
    renderDraftExists &&
    createDraftExists &&
    cancelDraftExists &&
    renderPosExists &&
    noBroker &&
    noTimers686 &&
    noDrawSoon686 &&
    draftNoPush
  );

  _lastAudit = {
    pass:                     pass,
    css686Present:            css686Present,
    mod686Present:            mod686Present,
    noDupStyle:               noDupStyle,
    versionOk:                versionOk,
    draftNoOffset:            draftNoOffset,
    draftAtCurrentPrice:      draftAtCurrentPrice,
    hasLimitValidation:       hasLimitValidation,
    hasStopValidation:        hasStopValidation,
    confirmToasts:            confirmToasts,
    confirmPendingStatus:     confirmPendingStatus,
    cancelPendingOrderExists: cancelPendingOrderExists,
    cancelOnlyPending:        cancelOnlyPending,
    cancelNotOpen:            cancelNotOpen,
    tagTopFnExists:           tagTopFnExists,
    tagTopUsesH:              tagTopUsesH,
    makeTagUsesHelper:        makeTagUsesHelper,
    makeTagNoY19:             makeTagNoY19,
    draftTagUsesHelper:       draftTagUsesHelper,
    makeDraftTagNoY19:        makeDraftTagNoY19,
    makeTagShowsXForPending:  makeTagShowsXForPending,
    makeTagCallsCancelPending:makeTagCallsCancelPending,
    makeTagCallsRemove:       makeTagCallsRemove,
    draftLineHasHit:          draftLineHasHit,
    draftLineCallsDrag:       draftLineCallsDrag,
    startDraftDragExists:     startDraftDragExists,
    moveDraftDragExists:      moveDraftDragExists,
    endDraftDragExists:       endDraftDragExists,
    startSetsDraft:           startSetsDraft,
    moveUpdatesEntry:         moveUpdatesEntry,
    moveUpdatesTp:            moveUpdatesTp,
    moveUpdatesSl:            moveUpdatesSl,
    endClearsDraft:           endClearsDraft,
    draftDragInState:         draftDragInState,
    draftHitInCSS:            draftHitInCSS,
    draftHitCursor:           draftHitCursor,
    audit685Pass:             audit685Pass,
    finalLocksPresent:        finalLocksPresent,
    btnSysOk:                 btnSysOk,
    renderDraftExists:        renderDraftExists,
    createDraftExists:        createDraftExists,
    cancelDraftExists:        cancelDraftExists,
    renderPosExists:          renderPosExists,
    noBroker:                 noBroker,
    noTimers686:              noTimers686,
    noDrawSoon686:            noDrawSoon686,
    draftNoPush:              draftNoPush,
    blockers:                 blockers,
    warnings:                 warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT = {
  VERSION:      "0.686",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>
'''

html = rep(html,
    'window.DVL_SCALE_LABEL_COMPACT_FIX_AUDIT = {\n  VERSION:      "0.685",\n  audit:        audit,\n  run:          run,\n  getLastAudit: getLastAudit\n};\n\n})();\n</script>\n\n</head>',
    'window.DVL_SCALE_LABEL_COMPACT_FIX_AUDIT = {\n  VERSION:      "0.685",\n  audit:        audit,\n  run:          run,\n  getLastAudit: getLastAudit\n};\n\n})();\n</script>\n' + _AUDIT_0686 + '\n</head>',
    "C17-audit-module-0686"
)

# ═══════════════════════════════════════════════════════════════════════════════
# Write output
# ═══════════════════════════════════════════════════════════════════════════════
with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

new_lines = len(html.splitlines())
print(f"Output: {new_lines} lines (+{new_lines - orig_lines})")

# ═══════════════════════════════════════════════════════════════════════════════
# POST-ASSERTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def chk(cond, msg):
    if not cond:
        print(f"ASSERT FAIL: {msg}")
        sys.exit(1)

# Version
chk('"Beta 0.686"' in html, "POST: DVL_APP_VERSION not 0.686")
chk('Beta 0.686</title>' in html, "POST: title not 0.686")
chk('>BETA 0.686</div>' in html, "POST: badge not 0.686")
chk('"Beta 0.685"' not in html or 'version: "Beta 0.685"' in html,
    "POST: Beta 0.685 leaked beyond changelog entry")

# CSS 0686
chk('id="DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686"' in html, "POST: CSS_0686 not found")
chk(html.count('id="DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686"') == 1, "POST: CSS_0686 not unique")
chk("dvl-paper-draft-hit" in html, "POST: dvl-paper-draft-hit not in HTML")

# Audit module 0686
chk('id="DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT_MODULE_0686"' in html, "POST: audit module_0686 not found")
chk(html.count('id="DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT_MODULE_0686"') == 1, "POST: audit module_0686 not unique")

# No duplicate style close
_dupClose = '</style></style>'
chk(_dupClose not in html, "POST: duplicate </style> found")

# createPendingOrderDraft - no offset
_prOff = 'price * 0.002'
# Check in the createPendingOrderDraft function body specifically
_cpod_start = html.find('function createPendingOrderDraft(')
_cpod_end   = html.find('\n    function ', _cpod_start + 10) if _cpod_start != -1 else -1
_cpod_src   = html[_cpod_start:_cpod_end] if _cpod_start != -1 and _cpod_end != -1 else ""
chk(_prOff not in _cpod_src, "POST: price * 0.002 still in createPendingOrderDraft")
chk('draftPrice = price' in _cpod_src, "POST: draftPrice = price not in createPendingOrderDraft")

# confirmPendingOrderDraft - validation
_conf_start = html.find('function confirmPendingOrderDraft(')
_conf_end   = html.find('\n    function ', _conf_start + 10) if _conf_start != -1 else -1
_conf_src   = html[_conf_start:_conf_end] if _conf_start != -1 and _conf_end != -1 else ""
chk('"Limit"' in _conf_src and 'validOrder' in _conf_src, "POST: Limit validation not in confirmPendingOrderDraft")
chk('"Stop"' in _conf_src, "POST: Stop validation not in confirmPendingOrderDraft")
chk('toast(validMsg)' in _conf_src, "POST: toast(validMsg) not in confirmPendingOrderDraft")
chk('status: "pending"' in _conf_src, 'POST: status:"pending" not in confirmPendingOrderDraft')

# cancelPendingOrder
chk('function cancelPendingOrder(' in html, "POST: cancelPendingOrder not found")
_cpo_start = html.find('function cancelPendingOrder(')
_cpo_end   = html.find('\n    function ', _cpo_start + 10) if _cpo_start != -1 else -1
_cpo_src   = html[_cpo_start:_cpo_end] if _cpo_start != -1 and _cpo_end != -1 else ""
chk('p.status === "pending"' in _cpo_src, 'POST: cancelPendingOrder missing p.status === "pending"')

# orderTagTopFromLineY
chk('function orderTagTopFromLineY' in html, "POST: orderTagTopFromLineY not found")
chk('ORDER_TAG_H / 2' in html, "POST: ORDER_TAG_H / 2 not found")

# makeTag uses helper, not hardcoded y-19
_mt_start = html.find('function makeTag(')
_mt_end   = html.find('\n    function ', _mt_start + 10) if _mt_start != -1 else -1
_mt_src   = html[_mt_start:_mt_end] if _mt_start != -1 and _mt_end != -1 else ""
chk('orderTagTopFromLineY(y)' in _mt_src, "POST: makeTag does not use orderTagTopFromLineY")
chk('(y - 19)' not in _mt_src, "POST: (y - 19) still in makeTag")
chk('pos.status === "pending"' in _mt_src, "POST: makeTag missing pending X button check")
chk('cancelPendingOrder(pos.id)' in _mt_src, "POST: makeTag missing cancelPendingOrder call")
chk('removePosition(pos.id)' in _mt_src, "POST: makeTag missing removePosition call")

# makeDraftTag uses helper, not hardcoded y-19
_mdt_start = html.find('function makeDraftTag(')
_mdt_end   = html.find('\n    function ', _mdt_start + 10) if _mdt_start != -1 else -1
_mdt_src   = html[_mdt_start:_mdt_end] if _mdt_start != -1 and _mdt_end != -1 else ""
chk('orderTagTopFromLineY(y)' in _mdt_src, "POST: makeDraftTag does not use orderTagTopFromLineY")
chk('(y - 19)' not in _mdt_src, "POST: (y - 19) still in makeDraftTag")

# makeDraftLine adds ENTRY hit
_mdl_start = html.find('function makeDraftLine(')
_mdl_end   = html.find('\n    function ', _mdl_start + 10) if _mdl_start != -1 else -1
_mdl_src   = html[_mdl_start:_mdl_end] if _mdl_start != -1 and _mdl_end != -1 else ""
chk('dvl-paper-draft-hit' in _mdl_src, "POST: dvl-paper-draft-hit not in makeDraftLine")
chk('startDraftDrag(ev)' in _mdl_src, "POST: startDraftDrag not called in makeDraftLine")

# Draft drag functions
chk('function startDraftDrag(' in html, "POST: startDraftDrag not found")
chk('function moveDraftDrag(' in html, "POST: moveDraftDrag not found")
chk('function endDraftDrag(' in html, "POST: endDraftDrag not found")
chk('draftDrag: null' in html, "POST: state.draftDrag not initialized")

_sdd_start = html.find('function startDraftDrag(')
_sdd_end   = html.find('\n    function ', _sdd_start + 10) if _sdd_start != -1 else -1
_sdd_src   = html[_sdd_start:_sdd_end] if _sdd_start != -1 and _sdd_end != -1 else ""
chk('state.draftDrag = {' in _sdd_src, "POST: startDraftDrag does not set state.draftDrag")

_mdd_start = html.find('function moveDraftDrag(')
_mdd_end   = html.find('\n    function ', _mdd_start + 10) if _mdd_start != -1 else -1
_mdd_src   = html[_mdd_start:_mdd_end] if _mdd_start != -1 and _mdd_end != -1 else ""
chk('state.pendingDraft.entry' in _mdd_src, "POST: moveDraftDrag missing entry update")
chk('state.pendingDraft.tp' in _mdd_src, "POST: moveDraftDrag missing tp update")
chk('state.pendingDraft.sl' in _mdd_src, "POST: moveDraftDrag missing sl update")

_edd_start = html.find('function endDraftDrag(')
_edd_end   = html.find('\n    function ', _edd_start + 10) if _edd_start != -1 else -1
_edd_src   = html[_edd_start:_edd_end] if _edd_start != -1 and _edd_end != -1 else ""
chk('state.draftDrag = null' in _edd_src, "POST: endDraftDrag does not clear draftDrag")

# Prior patches preserved
chk('id="DVL_SCALE_LABEL_COMPACT_FIX_CSS_0685"' in html, "POST: CSS_0685 missing")
chk('id="DVL_PAPER_DRAFT_LABEL_POLISH_CSS_0684"' in html, "POST: CSS_0684 missing")
chk('id="DVL_SCALE_LABEL_COMPACT_FIX_AUDIT_MODULE_0685"' in html, "POST: audit_0685 missing")
chk('id="DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT_MODULE_0684"' in html, "POST: audit_0684 missing")
chk('function renderDraftPosition' in html, "POST: renderDraftPosition missing")
chk('function renderPosition' in html, "POST: renderPosition missing")
chk('function cancelPendingOrderDraft' in html, "POST: cancelPendingOrderDraft missing")

# Anti-false-positive
_broker = 'Broker' + 'Connector'
chk(_broker not in html, f"POST: {_broker} found in HTML")

print(f"\nAll assertions passed. Beta 0.686 ready ({new_lines} lines).")
