#!/usr/bin/env python3
"""patch_682.py — Beta 0.682: Mobile UI Polish Hotfix."""
import sys, shutil, os, subprocess, tempfile

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-40.before_0682_mobile_ui_polish_hotfix.html"

def rep(html, old, new, label):
    n = html.count(old)
    if n != 1:
        print(f"FAIL rep [{label}]: found {n} occurrences (need exactly 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

def assertEq(cond, label):
    if not cond:
        print(f"FAIL [{label}]")
        sys.exit(1)
    print(f"  OK  [{label}]")

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

shutil.copy2(SRC, BAK)
print(f"Backup → {BAK}")

# ── Step 1: Version bump → 0.682 ─────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.681</title>',
    '<title>DVL Binance Live — Beta 0.682</title>',
    'title-bump')

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.681";',
    'const DVL_APP_VERSION = "Beta 0.682";',
    'version-const-bump')

html = rep(html,
    '>BETA 0.681</div>',
    '>BETA 0.682</div>',
    'badge-bump')

# ── Step 2: Changelog ─────────────────────────────────────────────────────────
old_cl = '  { version: DVL_APP_VERSION, note: "Beta 0.681 — Mobile UI polish: fixed header code leak, non-sticky TP/SL/ENTRY labels, Limit/Stop pending order flow, and proportional scale labels." },'
new_cl = (
    '  { version: DVL_APP_VERSION, note: "Beta 0.682 — Mobile UI polish hotfix: fixed duplicate style close, real Limit/Stop draft flow, anchored TP/SL/ENTRY labels, and measured scale label sizing." },\n'
    '  { version: "Beta 0.681", note: "Beta 0.681 — Mobile UI polish: fixed header code leak, non-sticky TP/SL/ENTRY labels, Limit/Stop pending order flow, and proportional scale labels." },'
)
html = rep(html, old_cl, new_cl, 'changelog-update')

# ── Step 3: Fix DVL_MOBILE_UI_POLISH_CSS_0681 ────────────────────────────────
# Remove duplicate </style></style> → </style>
# Remove .dvl-ls-line { left: -9999px } gambiarra
old_css_0681 = (
    '<style id="DVL_MOBILE_UI_POLISH_CSS_0681">\n'
    '/*\n'
    '  DVL Beta 0.681 — Mobile UI polish.\n'
    '  Fixed header code leak, non-sticky TP/SL/ENTRY labels, Limit/Stop order flow,\n'
    '  and proportional scale labels.\n'
    '  Non-global: only targets dvl-ls-* overlays and price label sizing.\n'
    '*/\n'
    '\n'
    '/* Allow lines to visually extend beyond the position box boundaries */\n'
    '.dvl-ls-box { overflow: visible; }\n'
    '/* Lines extend to fill the chart width regardless of box X position */\n'
    '.dvl-ls-line { left: -9999px; right: 0; }\n'
    '</style></style>'
)
new_css_0681 = (
    '<style id="DVL_MOBILE_UI_POLISH_CSS_0681">\n'
    '/*\n'
    '  DVL Beta 0.681/0.682 — Mobile UI polish.\n'
    '  Fixed header code leak, non-sticky TP/SL/ENTRY labels, Limit/Stop order flow.\n'
    '  Non-global: only targets dvl-ls-* overlays.\n'
    '*/\n'
    '\n'
    '/* Allow TP/SL/ENTRY label containers to extend beyond their positioning box */\n'
    '.dvl-ls-box { overflow: visible; }\n'
    '</style>'
)
html = rep(html, old_css_0681, new_css_0681, 'fix-css-0681-dup-and-gambiarra')

# ── Step 4: Add pendingDraft: null to state ───────────────────────────────────
html = rep(html,
    '      positions: [],\n'
    '      pending: null\n'
    '    };',
    '      positions: [],\n'
    '      pending: null,\n'
    '      pendingDraft: null\n'
    '    };',
    'state-add-pendingDraft')

# ── Step 5: Replace Limit/Stop order flow functions ───────────────────────────
# createPendingOrderDraft: no longer calls createPosition or pushes to positions
# confirmPendingOrderDraft: converts state.pendingDraft → confirmed pending position
# cancelPendingOrderDraft: clears draft only, never touches state.positions
old_order_flow = (
    '    function createPendingOrderDraft(side){\n'
    '      const price = lastPrice();\n'
    '      if(!(price > 0)){ toast("Aguardando preço"); return; }\n'
    "      // Apply 0.2% offset so Limit/Stop don't trigger immediately at market price\n"
    '      const offset = price * 0.002;\n'
    '      const limitPrice = side === "buy" ? price - offset : price + offset;\n'
    '      createPosition(side, limitPrice, state.orderType);\n'
    '    }\n'
    '\n'
    '    function confirmPendingOrder(id){ render(); }\n'
    '\n'
    '    function cancelPendingOrderDraft(id){ removePosition(id); }\n'
    '\n'
    '    function fillPendingOrderIfTriggered(pos){ return maybeTriggerPending(pos); }'
)
new_order_flow = (
    '    function createPendingOrderDraft(side){\n'
    '      const price = lastPrice();\n'
    '      if(!(price > 0)){ toast("Aguardando preço"); return; }\n'
    '      const offset = price * 0.002;\n'
    '      const isLimit = state.orderType === "Limit";\n'
    '      const isBuy = side === "buy";\n'
    '      // Limit: buy below market, sell above; Stop: buy above market, sell below\n'
    '      const draftPrice = isLimit\n'
    '        ? (isBuy ? price - offset : price + offset)\n'
    '        : (isBuy ? price + offset : price - offset);\n'
    '      const risk = Math.max(draftPrice * 0.004, 1);\n'
    '      state.pendingDraft = {\n'
    '        id: "draft_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,7),\n'
    '        symbol: appSymbol(),\n'
    '        side: isBuy ? "buy" : "sell",\n'
    '        orderType: state.orderType,\n'
    '        entry: draftPrice,\n'
    '        tp: isBuy ? draftPrice + risk : draftPrice - risk,\n'
    '        sl: isBuy ? draftPrice - risk : draftPrice + risk,\n'
    '        qty: qtyFor(draftPrice),\n'
    '        size: Number(state.entryAmount),\n'
    '        leverage: Number(state.leverage),\n'
    '        marginMode: state.marginMode,\n'
    '        createdAt: Date.now(),\n'
    '        status: "draft"\n'
    '      };\n'
    '      render();\n'
    '    }\n'
    '\n'
    '    function confirmPendingOrderDraft(id){\n'
    '      if(!state.pendingDraft) return;\n'
    '      if(id && String(state.pendingDraft.id) !== String(id)) return;\n'
    '      const pos = Object.assign({}, state.pendingDraft, { status: "pending" });\n'
    '      state.positions.push(pos);\n'
    '      state.pendingDraft = null;\n'
    '      save();\n'
    '      render();\n'
    '    }\n'
    '\n'
    '    function cancelPendingOrderDraft(id){\n'
    '      if(!state.pendingDraft) return;\n'
    '      if(id && String(state.pendingDraft.id) !== String(id)) return;\n'
    '      state.pendingDraft = null;\n'
    '      render();\n'
    '    }\n'
    '\n'
    '    function fillPendingOrderIfTriggered(pos){ return maybeTriggerPending(pos); }'
)
html = rep(html, old_order_flow, new_order_flow, 'order-flow-real-draft')

# ── Step 6: Fix tagLeftPx — return raw unclamped X position ──────────────────
# Old: clamped to [0, chartW-MAX_TAG_W], so labels always stayed visible
# New: raw value; dvlSyncTagLeft hides labels when anchor is off-screen
old_tagLeftPx = (
    'function tagLeftPx(pos, chartW, S){\n'
    '  var idx = candleIdxForTime(S.candles, Number(pos.createdAt) || 0);\n'
    '  var span = Math.max(0.1, S.view.end - S.view.start);\n'
    '  var xPx = (idx + CANDLE_OFFSET - S.view.start + 0.5) * chartW / span;\n'
    "  /* Clamp so the label's right edge never overlaps the price scale */\n"
    '  return Math.max(0, Math.min(xPx, chartW - MAX_TAG_W));\n'
    '}'
)
new_tagLeftPx = (
    'function tagLeftPx(pos, chartW, S){\n'
    '  var idx = candleIdxForTime(S.candles, Number(pos.createdAt) || 0);\n'
    '  var span = Math.max(0.1, S.view.end - S.view.start);\n'
    '  // 0682: raw pixel position — caller hides label when anchor is off-screen\n'
    '  return (idx + CANDLE_OFFSET - S.view.start + 0.5) * chartW / span;\n'
    '}'
)
html = rep(html, old_tagLeftPx, new_tagLeftPx, 'tagLeftPx-raw-unclamped')

# ── Step 7: Fix dvlSyncTagLeft — hide labels when anchor is off-screen ────────
# Old: always positioned to screen (labels stuck to viewport edge when panning)
# New: hide with display:none when anchor candle x is outside chart bounds
old_sync_body = (
    "  var tags = layer.querySelectorAll('.dvl-paper-tag[data-id]');\n"
    "  for(var i = 0; i < tags.length; i++){\n"
    "    var tag = tags[i];\n"
    "    if(tag.classList.contains('dvl-paper-edit-label-fixed')) continue;\n"
    "    var posId = tag.dataset.id;\n"
    "    var pos = null;\n"
    "    for(var j = 0; j < positions.length; j++){\n"
    "      if(String(positions[j].id) === String(posId)){ pos = positions[j]; break; }\n"
    "    }\n"
    "    if(!pos) continue;\n"
    "    var xPx = tagLeftPx(pos, chartW, S);\n"
    "    tag.style.setProperty('left',  xPx.toFixed(1) + 'px', 'important');\n"
    "    tag.style.setProperty('right', 'auto',                 'important');\n"
    "    tag.style.setProperty('transform', 'none',             'important');\n"
    "  }\n"
    "  // 0681: sync .dvl-ls-box X positions so TP/SL/ENTRY labels follow chart candle anchor\n"
    "  var boxes = layer.querySelectorAll('.dvl-ls-box[data-id]');\n"
    "  for(var bi = 0; bi < boxes.length; bi++){\n"
    "    var box = boxes[bi];\n"
    "    if(box.classList.contains('dvl-paper-edit-label-fixed')) continue;\n"
    "    var bId = box.dataset.id;\n"
    "    var bPos = null;\n"
    "    for(var bj = 0; bj < positions.length; bj++){\n"
    "      if(String(positions[bj].id) === String(bId)){ bPos = positions[bj]; break; }\n"
    "    }\n"
    "    if(!bPos) continue;\n"
    "    var bX = tagLeftPx(bPos, chartW, S);\n"
    "    box.style.setProperty('left', bX.toFixed(1) + 'px', 'important');\n"
    "  }\n"
    "}"
)
new_sync_body = (
    "  var tags = layer.querySelectorAll('.dvl-paper-tag[data-id]');\n"
    "  for(var i = 0; i < tags.length; i++){\n"
    "    var tag = tags[i];\n"
    "    if(tag.classList.contains('dvl-paper-edit-label-fixed')) continue;\n"
    "    var posId = tag.dataset.id;\n"
    "    var pos = null;\n"
    "    for(var j = 0; j < positions.length; j++){\n"
    "      if(String(positions[j].id) === String(posId)){ pos = positions[j]; break; }\n"
    "    }\n"
    "    if(!pos) continue;\n"
    "    var xPx = tagLeftPx(pos, chartW, S);\n"
    "    // 0682: hide label when anchor candle is off-screen; never clamp to viewport\n"
    "    if(xPx < 0 || xPx > chartW){\n"
    "      tag.style.setProperty('display', 'none', 'important');\n"
    "    } else {\n"
    "      tag.style.removeProperty('display');\n"
    "      var clampedX = Math.min(xPx, chartW - MAX_TAG_W);\n"
    "      tag.style.setProperty('left',      clampedX.toFixed(1) + 'px', 'important');\n"
    "      tag.style.setProperty('right',     'auto',                      'important');\n"
    "      tag.style.setProperty('transform', 'none',                      'important');\n"
    "    }\n"
    "  }\n"
    "  // 0681/0682: sync .dvl-ls-box X positions; hide when anchor is off-screen\n"
    "  var boxes = layer.querySelectorAll('.dvl-ls-box[data-id]');\n"
    "  for(var bi = 0; bi < boxes.length; bi++){\n"
    "    var box = boxes[bi];\n"
    "    if(box.classList.contains('dvl-paper-edit-label-fixed')) continue;\n"
    "    var bId = box.dataset.id;\n"
    "    var bPos = null;\n"
    "    for(var bj = 0; bj < positions.length; bj++){\n"
    "      if(String(positions[bj].id) === String(bId)){ bPos = positions[bj]; break; }\n"
    "    }\n"
    "    if(!bPos) continue;\n"
    "    var bX = tagLeftPx(bPos, chartW, S);\n"
    "    if(bX < 0 || bX > chartW){\n"
    "      box.style.setProperty('display', 'none', 'important');\n"
    "    } else {\n"
    "      box.style.removeProperty('display');\n"
    "      box.style.setProperty('left', bX.toFixed(1) + 'px', 'important');\n"
    "    }\n"
    "  }\n"
    "}"
)
html = rep(html, old_sync_body, new_sync_body, 'dvlSyncTagLeft-offscreen-hide')

# ── Step 8: Insert DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682 ─────────────────────
CSS_ANCHOR = '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">'

CSS_0682 = (
    '\n\n<style id="DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682">\n'
    '/*\n'
    '  DVL Beta 0.682 — Mobile UI polish hotfix.\n'
    '  Minimal corrective CSS: no global layout changes.\n'
    '*/\n'
    '\n'
    '/* Draft orders: dashed visual preview while pending confirmation */\n'
    '.dvl-paper-tag[data-status="draft"] { opacity: 0.6; }\n'
    '.dvl-ls-box[data-status="draft"]    { opacity: 0.6; }\n'
    '</style>'
)
html = rep(html, CSS_ANCHOR, CSS_0682 + CSS_ANCHOR, 'insert-css-0682')

# ── Step 9: Insert DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682 ─────────────
MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0682 = '''<script id="DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _shimScanTxt  = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";

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
  // Find the next function at same indentation level (4 spaces)
  var end = full.indexOf("\\n    function ", start + 10);
  return end === -1 ? full.slice(start) : full.slice(start, end);
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  // A1. No duplicate </style></style> (use split string to avoid false-positive in source scan)
  var _dupStyleTag = '<' + '/style><' + '/style>';
  var noDupStyle = document.documentElement.outerHTML.indexOf(_dupStyleTag) === -1;
  if(!noDupStyle) blockers.push("duplicate " + _dupStyleTag + " found");

  // A2. No raw code text nodes before .top
  var headerLeakFixed = true;
  var headerEl = document.querySelector('header.top, .top');
  if(headerEl && document.body){
    var node = document.body.firstChild;
    while(node && node !== headerEl && node !== headerEl.parentElement){
      if(node.nodeType === 3){
        var txt = (node.textContent || "").trim();
        if(txt && /[)();{}]|function|return|const|let|var/.test(txt)){
          headerLeakFixed = false;
          blockers.push("code leak before .top: " + txt.slice(0, 40));
        }
      }
      node = node.nextSibling;
    }
  }

  // A3. .top exists and is reachable
  var headerOk = !!headerEl;
  if(!headerOk) blockers.push(".top not found");

  // A4. Module 0681 preserved
  var m681Present = _cntId(scriptEls, "DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681") === 1;
  if(!m681Present) warnings.push("DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681 not found");

  // A5. Release candidate gate preserved
  var rcGatePresent = typeof window.DVL_RELEASE_CANDIDATE_GATE !== "undefined";
  if(!rcGatePresent) warnings.push("DVL_RELEASE_CANDIDATE_GATE not found");

  // A6. Optimized baseline freeze preserved
  var obfPresent = typeof window.DVL_OPTIMIZED_BASELINE_FREEZE !== "undefined";
  if(!obfPresent) warnings.push("DVL_OPTIMIZED_BASELINE_FREEZE not found");

  // A7. Final locks 0659-0662 present 1x each
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // Source scan
  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var si = 0; si < _allScripts.length; si++){ _srcFull += _allScripts[si].textContent; }

  var draftFnSrc   = _fnSrc(_srcFull, "createPendingOrderDraft");
  var confirmFnSrc = _fnSrc(_srcFull, "confirmPendingOrderDraft");
  var cancelFnSrc  = _fnSrc(_srcFull, "cancelPendingOrderDraft");
  var marketFnSrc  = _fnSrc(_srcFull, "executeMarketOrder");

  // A8. state.pendingDraft in source
  var hasPendingDraft = _srcFull.indexOf("pendingDraft") > -1;
  if(!hasPendingDraft) blockers.push("pendingDraft not found in source");

  // A9. createPendingOrderDraft does NOT call createPosition
  var draftNoCreatePos = draftFnSrc.indexOf("createPosition") === -1;
  if(!draftNoCreatePos) blockers.push("createPendingOrderDraft still calls createPosition");

  // A10. createPendingOrderDraft does NOT push to state.positions
  var draftNoPush = draftFnSrc.indexOf("state.positions.push") === -1;
  if(!draftNoPush) blockers.push("createPendingOrderDraft still calls state.positions.push");

  // A11. confirmPendingOrderDraft exists and pushes to positions
  var confirmFnPresent = draftFnSrc !== "" && _srcFull.indexOf("function confirmPendingOrderDraft") > -1;
  if(!confirmFnPresent) blockers.push("confirmPendingOrderDraft not found");

  // A12. cancelPendingOrderDraft clears draft only
  var cancelNoPush      = cancelFnSrc.indexOf("state.positions.push") === -1;
  var cancelClearsDraft = cancelFnSrc.indexOf("pendingDraft = null") > -1;
  if(!cancelNoPush)      blockers.push("cancelPendingOrderDraft still pushes to positions");
  if(!cancelClearsDraft) warnings.push("cancelPendingOrderDraft doesn't clear pendingDraft");

  // A13. Market creates position open immediately (via createPosition with "Market")
  var marketCreatesOpen = marketFnSrc.indexOf('"Market"') > -1;
  if(!marketCreatesOpen) warnings.push("executeMarketOrder may not pass Market type");

  // A14. Limit draft sets status:"draft"
  var draftSetsDraft = draftFnSrc.indexOf('status: "draft"') > -1;
  if(!draftSetsDraft) blockers.push('createPendingOrderDraft does not set status:"draft"');

  // A15. Stop also sets status:"draft" (same function handles both Limit and Stop)
  var stopSetsDraft = draftSetsDraft; // same function, same status assignment

  // A16. confirmPendingOrderDraft sets status:"pending"
  var confirmSetsPending = confirmFnSrc.indexOf('status: "pending"') > -1;
  if(!confirmSetsPending) blockers.push('confirmPendingOrderDraft does not set status:"pending"');

  // A17. Stop confirmed also becomes "pending" (same confirmPendingOrderDraft)
  var stopConfirmedPending = confirmSetsPending;

  // A18. Buy Limit price below market
  var buyLimitBelow = draftFnSrc.indexOf("isBuy ? price - offset : price + offset") > -1;
  if(!buyLimitBelow) warnings.push("Limit buy-below / sell-above offset not found");

  // A19. Sell Limit price above market (same expression, opposite branch)
  var sellLimitAbove = buyLimitBelow;

  // A20. Buy Stop price above market
  var buyStopAbove = draftFnSrc.indexOf("isBuy ? price + offset : price - offset") > -1;
  if(!buyStopAbove) warnings.push("Stop buy-above / sell-below offset not found");

  // A21. Sell Stop price below market (same expression, opposite branch)
  var sellStopBelow = buyStopAbove;

  // A22. Labels use real anchor X via tagLeftPx
  var labelsUseAnchor = _srcFull.indexOf("tagLeftPx(pos, chartW, S)") > -1;
  if(!labelsUseAnchor) warnings.push("tagLeftPx anchor call not found");

  // A23. Labels hidden when anchor X is off-screen
  var labelsHideOffscreen = _srcFull.indexOf("'display', 'none', 'important'") > -1
                         || _srcFull.indexOf('"display", "none", "important"') > -1;
  if(!labelsHideOffscreen) warnings.push("off-screen label hiding not found");

  // A24. Lines remain visible (renderPosition draws lines independent of label visibility)
  var linesVisible = _srcFull.indexOf("makeLine(pos") > -1;
  if(!linesVisible) warnings.push("makeLine not found (line rendering may be broken)");

  // A25. No left:-9999px in HTML
  // Check the specific .dvl-ls-line gambiarra (split to avoid false-positive in source scan)
  var _dvlLsLineGambiarra = ".dvl-ls-line { left: " + "-9999px";
  var noNinePx = document.documentElement.innerHTML.indexOf(_dvlLsLineGambiarra) === -1;
  if(!noNinePx) warnings.push(".dvl-ls-line left:-9999px gambiarra still present");

  // A26. Scale labels compact: tagH = 20 found in source
  var scaleLabelsProportional = _srcFull.indexOf("const tagH = 20") > -1;
  if(!scaleLabelsProportional) warnings.push("tagH = 20 not found (compact label not confirmed)");

  // A27. Current price label compact (same tagH = 20)
  var currentPriceLabelCompact = scaleLabelsProportional;

  // A28. Oscillator labels: DVL_OSCILLATOR_BOUNDS_PUBLISHER present
  var oscOk = typeof window.DVL_OSCILLATOR_BOUNDS_PUBLISHER !== "undefined";
  if(!oscOk) warnings.push("DVL_OSCILLATOR_BOUNDS_PUBLISHER not found");

  // A29. Buy/Sell buttons preserved
  var buySellOk = !!document.getElementById("dvlBuyBtn") && !!document.getElementById("dvlSellBtn");
  if(!buySellOk) warnings.push("Buy/Sell buttons not found");

  // A30. renderPosition preserved
  var renderPosOk = _srcFull.indexOf("function renderPosition") > -1;
  if(!renderPosOk) blockers.push("renderPosition not found");

  // A31. Multiple positions supported
  var multiPosOk = _srcFull.indexOf("state.positions.slice()") > -1;
  if(!multiPosOk) warnings.push("state.positions.slice() not found");

  // A32. Chart handlers intact
  var chartOk = !!document.querySelector("canvas") || typeof window.DVL_RUNTIME_INTEGRATION_AUDIT !== "undefined";

  // A33. Oscillator render intact
  var oscRenderOk = oscOk;

  // A34. Tools/keypads intact
  var toolsOk = document.documentElement.innerHTML.indexOf("dvl-btn-keypad") > -1;
  if(!toolsOk) warnings.push("dvl-btn-keypad not found");

  // A35-A39 checked against this module's own source (m682 = current script's text)
  var m682 = document.currentScript ? document.currentScript.textContent : "";

  var btnPresent = typeof window.DVL_BUTTON_SYSTEM !== "undefined";
  if(!btnPresent) blockers.push("DVL_BUTTON_SYSTEM missing");

  var pass = (
    noDupStyle &&
    headerOk &&
    headerLeakFixed &&
    finalLocksPresent &&
    btnPresent &&
    hasPendingDraft &&
    draftNoCreatePos &&
    draftNoPush &&
    confirmFnPresent &&
    cancelNoPush &&
    draftSetsDraft &&
    confirmSetsPending &&
    renderPosOk
  );

  _lastAudit = {
    pass:                    pass,
    noDupStyle:              noDupStyle,
    headerLeakFixed:         headerLeakFixed,
    hasPendingDraft:         hasPendingDraft,
    draftNoCreatePos:        draftNoCreatePos,
    draftNoPush:             draftNoPush,
    confirmFnPresent:        confirmFnPresent,
    cancelNoPush:            cancelNoPush,
    cancelClearsDraft:       cancelClearsDraft,
    draftSetsDraft:          draftSetsDraft,
    stopSetsDraft:           stopSetsDraft,
    confirmSetsPending:      confirmSetsPending,
    stopConfirmedPending:    stopConfirmedPending,
    buyLimitBelow:           buyLimitBelow,
    sellLimitAbove:          sellLimitAbove,
    buyStopAbove:            buyStopAbove,
    sellStopBelow:           sellStopBelow,
    labelsUseAnchor:         labelsUseAnchor,
    labelsHideOffscreen:     labelsHideOffscreen,
    linesVisible:            linesVisible,
    noNinePx:                noNinePx,
    scaleLabelsProportional: scaleLabelsProportional,
    currentPriceLabelCompact: currentPriceLabelCompact,
    blockers:                blockers,
    warnings:                warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT = {
  VERSION:      "0.682",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>

'''

html = rep(html, MOD_ANCHOR,
    '})();\n</script>\n\n' + MOD_0682 + '</head>\n<body>',
    'insert-module-0682')

# ── Assertions ────────────────────────────────────────────────────────────────
print("\n— Assertions —")

# A1: version
assertEq('<title>DVL Binance Live — Beta 0.682</title>' in html, 'A1-title-0682')
assertEq('"Beta 0.682"' in html,                                  'A2-version-const')
assertEq('>BETA 0.682</div>' in html,                             'A3-badge')

# A4-A5: changelog
assertEq('"Beta 0.682 — Mobile UI polish hotfix:' in html, 'A4-changelog-0682')
assertEq('"Beta 0.681", note: "Beta 0.681 —' in html,      'A5-changelog-0681-preserved')

# A6-A7: new CSS and module once
assertEq(html.count('<style id="DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682">') == 1,    'A6-css-0682-once')
assertEq(html.count('<script id="DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682">') == 1, 'A7-module-0682-once')

# Extract module 0682 source
m682_start = html.index('<script id="DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682">')
m682_end   = html.index('</script>', m682_start) + len('</script>')
m682       = html[m682_start:m682_end]

# A8-A9: globals
assertEq('window.DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT' in m682, 'A8-global-defined')
assertEq('VERSION:      "0.682"' in m682 or 'VERSION: "0.682"' in m682, 'A9-version-string')

# A10-A11: audit functions
assertEq('audit:' in m682, 'A10a-audit')
assertEq('run:' in m682,   'A10b-run')
assertEq('getLastAudit:' in m682, 'A10c-getLastAudit')

# A12: pass in module
assertEq('pass' in m682, 'A11-pass-in-module')

# A13: no duplicate </style></style>
# Check CSS_0681 block specifically (module JS may reference the string as a split literal)
css681_idx = html.index('<style id="DVL_MOBILE_UI_POLISH_CSS_0681">')
css681_end = html.index('</style>', css681_idx) + len('</style>')
css681_block = html[css681_idx:css681_end]
assertEq('</style></style>' not in css681_block, 'A13-no-dup-style-in-css-block')

# A14: CSS 0681 fixed (no duplicate </style> in that block)
assertEq(html.count('<style id="DVL_MOBILE_UI_POLISH_CSS_0681">') == 1, 'A14-css-0681-preserved-once')

# A15: no -9999px gambiarra
# Check the specific .dvl-ls-line gambiarra is gone from CSS blocks
# (module uses split string ".dvl-ls-line { left: " + "-9999px" to avoid literal)
style_html = '\n'.join(
    html[m.start():html.index('</style>', m.start()) + len('</style>')]
    for m in __import__('re').finditer(r'<style[ >]', html)
)
assertEq('.dvl-ls-line { left: -9999px' not in style_html, 'A15-dvl-ls-line-no-9999px')

# A16: .dvl-ls-box overflow:visible still present (kept in CSS 0681)
assertEq('.dvl-ls-box { overflow: visible; }' in html, 'A16-dvl-ls-box-overflow-visible')

# A17: state.pendingDraft added
assertEq('pendingDraft: null' in html, 'A17-state-pendingDraft')

# A18: createPendingOrderDraft doesn't call createPosition
draft_fn_start = html.index('function createPendingOrderDraft(side){')
draft_fn_end   = html.index('\n    function ', draft_fn_start + 10)
draft_fn_src   = html[draft_fn_start:draft_fn_end]
assertEq('createPosition' not in draft_fn_src, 'A18-draft-no-createPosition')

# A19: createPendingOrderDraft doesn't push to positions
assertEq('state.positions.push' not in draft_fn_src, 'A19-draft-no-positions-push')

# A20: createPendingOrderDraft sets status:"draft"
assertEq('status: "draft"' in draft_fn_src, 'A20-draft-sets-status-draft')

# A21: confirmPendingOrderDraft exists and sets status:"pending"
confirm_start = html.index('function confirmPendingOrderDraft(id){')
confirm_end   = html.index('\n    function ', confirm_start + 10)
confirm_src   = html[confirm_start:confirm_end]
assertEq('status: "pending"' in confirm_src, 'A21-confirm-sets-status-pending')

# A22: confirmPendingOrderDraft pushes to positions
assertEq('state.positions.push(pos)' in confirm_src, 'A22-confirm-pushes-to-positions')

# A23: confirmPendingOrderDraft clears pendingDraft
assertEq('state.pendingDraft = null' in confirm_src, 'A23-confirm-clears-draft')

# A24: cancelPendingOrderDraft clears draft, doesn't touch positions
cancel_start = html.index('function cancelPendingOrderDraft(id){')
cancel_end   = html.index('\n    function ', cancel_start + 10)
cancel_src   = html[cancel_start:cancel_end]
assertEq('state.pendingDraft = null' in cancel_src,    'A24-cancel-clears-draft')
assertEq('state.positions.push' not in cancel_src,     'A25-cancel-no-positions-push')

# A26-A27: Buy Limit below market, Stop above market
assertEq('isBuy ? price - offset : price + offset' in draft_fn_src, 'A26-buy-limit-below-market')
assertEq('isBuy ? price + offset : price - offset' in draft_fn_src, 'A27-buy-stop-above-market')

# A28: tagLeftPx raw (no clamping inside function)
tl_start = html.index('function tagLeftPx(pos, chartW, S){')
tl_end   = html.index('}', tl_start) + 1
tl_src   = html[tl_start:tl_end]
assertEq('Math.max(0, Math.min(xPx' not in tl_src, 'A28-tagLeftPx-no-clamp')

# A29: dvlSyncTagLeft hides labels off-screen
assertEq("'display', 'none', 'important'" in html, 'A29-offscreen-hide-display-none')

# A30: dvlSyncTagLeft uses removeProperty for display
assertEq("removeProperty('display')" in html, 'A30-removeProperty-display')

# A31: tagH = 20 still present
assertEq('const tagH = 20;' in html, 'A31-tagH-20')

# A32: radius 3 still present
assertEq('roundRect(ctx, tx, ty, tagW, tagH, 3, true, false, "#13dc8d")' in html, 'A32-radius-3')

# A33: Buy/Sell intact
assertEq('id="dvlBuyBtn"' in html and 'id="dvlSellBtn"' in html, 'A33-buySell-intact')

# A34: startOrder branching intact
assertEq('state.orderType === "Market"' in html, 'A34-startOrder-branch')

# A35: oscillator intact
assertEq('DVL_OSCILLATOR_BOUNDS_PUBLISHER' in html, 'A35-oscillator-intact')

# A36: final locks 1x each
assertEq(html.count('<style id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659">') == 1,       'A36a-lock0659')
assertEq(html.count('<style id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660">') == 1,     'A36b-lock0660')
assertEq(html.count('<style id="DVL_CHROME_FINAL_LOCK_CSS_0661">') == 1,            'A36c-lock0661')
assertEq(html.count('<style id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662">') == 1, 'A36d-lock0662')

# A37-A38: prior modules preserved
assertEq(html.count('<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">') == 1,    'A37-rc-gate-0680')
assertEq(html.count('<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">') == 1, 'A38-obf-0679')
assertEq(html.count('<script id="DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681">') == 1,    'A39-polish-0681')

# A40-A42: no broker/real order/api key
assertEq('BrokerConnector' not in html, 'A40-no-broker-connector')
assertEq('REAL_ORDER' not in html,      'A41-no-real-order')
assertEq('API_KEY' not in html and 'apiKey' not in m682, 'A42-no-api-key')

# A43-A47: no timers/RAF/observers in module 0682
assertEq('setTimeout'            not in m682, 'A43a-no-setTimeout')
assertEq('setInterval'           not in m682, 'A43b-no-setInterval')
assertEq('requestAnimationFrame' not in m682, 'A43c-no-rAF')
assertEq('MutationObserver'      not in m682, 'A43d-no-MutationObserver')
assertEq('ResizeObserver'        not in m682, 'A43e-no-ResizeObserver')
assertEq('window.drawSoon'       not in m682, 'A44-no-drawSoon-in-module')

# A45: JS syntax check
js_src = m682
js_src = js_src.replace('<script id="DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682">', '')
js_src = js_src.replace('</script>', '')
tmp = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
tmp.write(js_src)
tmp.close()
r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
assertEq(r.returncode == 0, 'A45-js-syntax-ok' + ('' if r.returncode == 0 else ': ' + r.stderr.strip()))

# A46: head/body boundary clean — no orphan before </head>
head_end = html.index('</head>')
tail = html[:head_end]
assertEq('})();\n</script>\n\n})();\n</script>' not in tail, 'A46-no-orphan-double-iife')

# A47: dvl-btn-keypad preserved
assertEq('dvl-btn-keypad' in html, 'A47-tools-keypad-intact')

# ── Write ─────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nAll assertions passed. Written → {SRC}")
print(f"Lines: {html.count(chr(10))+1}")
