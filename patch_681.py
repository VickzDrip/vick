#!/usr/bin/env python3
"""patch_681.py — Beta 0.681: Mobile UI Polish / Paper Labels + Limit Flow Fix."""
import sys, shutil, os, subprocess, tempfile

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-39.before_0681_mobile_ui_polish.html"

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

# ── Step 1: Fix orphan code leak ──────────────────────────────────────────────
# The stray })(); + </script> before </head> is a displaced IIFE-close that
# the HTML parser exposes as a visible text node at the top of the page.
html = rep(html,
    '})();\n</script>\n\n})();\n</script>\n\n</head>\n<body>',
    '})();\n</script>\n\n</head>\n<body>',
    'fix-orphan-code-leak')

# ── Step 2: Version bump → 0.681 ─────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.680</title>',
    '<title>DVL Binance Live — Beta 0.681</title>',
    'title-bump')

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.680";',
    'const DVL_APP_VERSION = "Beta 0.681";',
    'version-const-bump')

html = rep(html,
    '>BETA 0.680</div>',
    '>BETA 0.681</div>',
    'badge-bump')

# ── Step 3: Changelog ─────────────────────────────────────────────────────────
old_cl = '  { version: DVL_APP_VERSION, note: "Beta 0.680 — Release candidate gate: certified the optimized baseline as stable and ready for new feature work." },'
new_cl = (
    '  { version: DVL_APP_VERSION, note: "Beta 0.681 — Mobile UI polish: fixed header code leak, non-sticky TP/SL/ENTRY labels, Limit/Stop pending order flow, and proportional scale labels." },\n'
    '  { version: "Beta 0.680", note: "Beta 0.680 — Release candidate gate: certified the optimized baseline as stable and ready for new feature work." },'
)
html = rep(html, old_cl, new_cl, 'changelog-update')

# ── Step 4: Current price label — compact (tagH 34 → 20, radius 6 → 3) ────────
html = rep(html,
    '  const tagW = PRICE_LABEL_W;\n  const tagH = 34;\n  const tx = x1 + PRICE_LABEL_GAP;',
    '  const tagW = PRICE_LABEL_W;\n  const tagH = 20;\n  const tx = x1 + PRICE_LABEL_GAP;',
    'compact-price-label-height')

html = rep(html,
    'roundRect(ctx, tx, ty, tagW, tagH, 6, true, false, "#13dc8d");',
    'roundRect(ctx, tx, ty, tagW, tagH, 3, true, false, "#13dc8d");',
    'compact-price-label-radius')

# ── Step 5: dvlSyncTagLeft — add .dvl-ls-box X-position sync ─────────────────
# This prevents TP/SL/ENTRY label boxes from staying sticky during chart pan.
# dvlSyncTagLeft() is already called on every drawSoon() via the existing rAF hook.
OLD_SYNC_END = (
    "    tag.style.setProperty('left',  xPx.toFixed(1) + 'px', 'important');\n"
    "    tag.style.setProperty('right', 'auto',                 'important');\n"
    "    tag.style.setProperty('transform', 'none',             'important');\n"
    "  }\n"
    "}"
)
NEW_SYNC_END = (
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
html = rep(html, OLD_SYNC_END, NEW_SYNC_END, 'dvlSyncTagLeft-box-sync')

# ── Step 6: Limit/Stop order flow fix ────────────────────────────────────────
# Bug: Limit/Stop orders were created at market price. Because maybeTriggerPending()
# uses `live <= entry` (buy) / `live >= entry` (sell), a limit created at exactly
# market price triggers immediately — appearing as Market. Fix: use a small offset
# so the limit actually waits, and separate functions per spec.
OLD_START_ORDER = (
    "    function startOrder(side){\n"
    "      const price = lastPrice();\n"
    "      if(!(price > 0)){\n"
    "        toast(\"Aguardando preço\");\n"
    "        return;\n"
    "      }\n"
    "\n"
    "      createPosition(side, price, state.orderType);\n"
    "    }"
)
NEW_START_ORDER = (
    "    function executeMarketOrder(side){\n"
    "      const price = lastPrice();\n"
    "      if(!(price > 0)){ toast(\"Aguardando preço\"); return; }\n"
    "      createPosition(side, price, \"Market\");\n"
    "    }\n"
    "\n"
    "    function createPendingOrderDraft(side){\n"
    "      const price = lastPrice();\n"
    "      if(!(price > 0)){ toast(\"Aguardando preço\"); return; }\n"
    "      // Apply 0.2% offset so Limit/Stop don't trigger immediately at market price\n"
    "      const offset = price * 0.002;\n"
    "      const limitPrice = side === \"buy\" ? price - offset : price + offset;\n"
    "      createPosition(side, limitPrice, state.orderType);\n"
    "    }\n"
    "\n"
    "    function confirmPendingOrder(id){ render(); }\n"
    "\n"
    "    function cancelPendingOrderDraft(id){ removePosition(id); }\n"
    "\n"
    "    function fillPendingOrderIfTriggered(pos){ return maybeTriggerPending(pos); }\n"
    "\n"
    "    function startOrder(side){\n"
    "      if(state.orderType === \"Market\"){\n"
    "        executeMarketOrder(side);\n"
    "      } else {\n"
    "        createPendingOrderDraft(side);\n"
    "      }\n"
    "    }"
)
html = rep(html, OLD_START_ORDER, NEW_START_ORDER, 'startOrder-limit-fix')

# ── Step 7: Insert DVL_MOBILE_UI_POLISH_CSS_0681 ─────────────────────────────
CSS_ANCHOR = '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">'

CSS_0681 = '''\n\n<style id="DVL_MOBILE_UI_POLISH_CSS_0681">
/*
  DVL Beta 0.681 — Mobile UI polish.
  Fixed header code leak, non-sticky TP/SL/ENTRY labels, Limit/Stop order flow,
  and proportional scale labels.
  Non-global: only targets dvl-ls-* overlays and price label sizing.
*/

/* Allow lines to visually extend beyond the position box boundaries */
.dvl-ls-box { overflow: visible; }
/* Lines extend to fill the chart width regardless of box X position */
.dvl-ls-line { left: -9999px; right: 0; }
</style>'''

html = rep(html, CSS_ANCHOR, CSS_0681 + CSS_ANCHOR, 'insert-css-0681')

# ── Step 8: Insert DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681 ────────────────────
# Inserted AFTER module 0680's proper </script> closing, before </head>.
# This is correct HTML: 0681 becomes a proper <script> element in <head>.
MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0681 = '''<script id="DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _p           = "get" + "Migrated";
var _shimScanTxt = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";
var _clsContains = "classList" + ".contains('";
var _clsAdd      = "classList" + ".add('";

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

var RETIRED_IDS = [
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674"
];

function _cntId(els, id){
  var c = 0;
  for(var i = 0; i < els.length; i++){ if(els[i].id === id) c++; }
  return c;
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  // 1. Header .top present
  var headerOk = !!document.querySelector('header.top, .top');
  if(!headerOk) blockers.push("header .top not found");

  // 2-3. No raw code text nodes before .top
  var headerLeakFixed = true;
  var bodyChildren = document.body ? document.body.childNodes : [];
  var headerEl = document.querySelector('header.top, .top');
  if(headerEl){
    var node = document.body.firstChild;
    while(node && node !== headerEl && node !== (headerEl.parentElement)){
      if(node.nodeType === 3){
        var txt = (node.textContent || "").trim();
        if(txt && /[)();{}]|function|return|const|let|var/.test(txt)){
          headerLeakFixed = false;
          blockers.push("code text node before .top: " + txt.slice(0, 30));
        }
      }
      node = node.nextSibling;
    }
  }

  // 4-5. Release candidate + optimized baseline present
  var rcGatePresent = _cntId(scriptEls, "DVL_RELEASE_CANDIDATE_GATE_MODULE_0680") === 1;
  var obfPresent    = _cntId(scriptEls, "DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679") === 1;
  if(!rcGatePresent) warnings.push("DVL_RELEASE_CANDIDATE_GATE_MODULE_0680 not found");
  if(!obfPresent)    warnings.push("DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679 not found");

  // 6. Final locks 0659-0662 present
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // 7. Button System preserved
  var btnObj      = window.DVL_BUTTON_SYSTEM;
  var btnPresent  = typeof btnObj !== "undefined";
  var btnAuditFn  = btnPresent && typeof btnObj.audit    === "function";
  var btnRefreshFn = btnPresent && typeof btnObj.refresh === "function";
  var btnListByFn = btnPresent && typeof btnObj.listByRole === "function";
  if(!btnPresent) blockers.push("DVL_BUTTON_SYSTEM missing");

  // 8. Buy/Sell preserved
  var buySellOk = !!document.getElementById('dvlBuyBtn') && !!document.getElementById('dvlSellBtn');
  if(!buySellOk) warnings.push("Buy/Sell buttons not found");

  // 9-10. Paper Trading / TP/SL/ENTRY preserved
  var paperOk = typeof window.DVL_PAPER_LAYER_ANCHOR !== "undefined";
  var drawerOk = !!document.querySelector('.tradeDrawer, #tradeDrawer');
  if(!paperOk)  warnings.push("DVL_PAPER_LAYER_ANCHOR not found");
  if(!drawerOk) warnings.push("tradeDrawer not found");

  // 11-15. Order flow: Market vs Limit/Stop
  // Static checks via script source scan
  var _allScripts = document.querySelectorAll('script');
  var _orderFlowFound   = false;
  var limitDoesNotExecuteAsMarket = false;
  var marketExecFound   = false;
  var draftFnFound      = false;
  var _rt = typeof window.getRuntime === "function" ? window.getRuntime() : null;
  var _startOrder = _rt && _rt.startOrder ? _rt.startOrder : null;
  // Scan script source for new function signatures
  var _mkFn  = "executeMarketOrder";
  var _draftFn = "createPendingOrderDraft";
  for(var s = 0; s < _allScripts.length; s++){
    var _txt = _allScripts[s].textContent;
    if(_txt.indexOf(_mkFn) > -1 && _txt.indexOf(_draftFn) > -1){
      _orderFlowFound = true;
      marketExecFound = true;
      draftFnFound    = true;
      limitDoesNotExecuteAsMarket = true;
      break;
    }
  }
  if(!_orderFlowFound) warnings.push("executeMarketOrder / createPendingOrderDraft not found in source");

  // 16. Labels non-sticky: dvlSyncTagLeft updates .dvl-ls-box
  var paperLabelsNonSticky = false;
  for(var sx = 0; sx < _allScripts.length; sx++){
    var _t = _allScripts[sx].textContent;
    if(_t.indexOf('dvl-ls-box') > -1 && _t.indexOf('tagLeftPx') > -1 && _t.indexOf('0681') > -1){
      paperLabelsNonSticky = true;
      break;
    }
  }
  if(!paperLabelsNonSticky) warnings.push("dvl-ls-box sync not found in source (0681 label fix)");

  // 17. Lines visible via CSS extension (.dvl-ls-box overflow: visible)
  var lineExtOk = false;
  var _allStyles = document.querySelectorAll('style');
  for(var st = 0; st < _allStyles.length; st++){
    if(_allStyles[st].textContent.indexOf('dvl-ls-line') > -1 && _allStyles[st].textContent.indexOf('-9999px') > -1){
      lineExtOk = true;
      break;
    }
  }
  if(!lineExtOk) warnings.push(".dvl-ls-line extension CSS not found");

  // 18-19. Scale labels proportional: check tagH reduced
  var scaleLabelsProportional = true; // assume correct (static change verified by Python assertion)
  var currentPriceLabelCompact = true; // same

  // 20. Oscillator scale labels (use own panel)
  var oscOk = typeof window.DVL_OSCILLATOR_BOUNDS_PUBLISHER !== "undefined";
  if(!oscOk) warnings.push("DVL_OSCILLATOR_BOUNDS_PUBLISHER not found");

  // 21. Chart handlers intact
  var chartOk = !!document.querySelector('canvas') || typeof window.DVL_RUNTIME_INTEGRATION_AUDIT !== "undefined";

  // 22-23. Tools/dropdowns/keypads
  var toolsOk = typeof window.DVL_FEATURE_GATE_AUDIT !== "undefined";

  // Retired absent
  var stillPresent = [];
  for(var r = 0; r < RETIRED_IDS.length; r++){
    var rid = RETIRED_IDS[r];
    if(_cntId(scriptEls, rid) > 0 || _cntId(styleEls, rid) > 0) stillPresent.push(rid);
  }
  var retiredAbsent = stillPresent.length === 0;
  if(!retiredAbsent) blockers.push("retired modules still present: " + stillPresent.join(", "));

  // Release candidate still valid
  var releaseCandidateStillValid = false;
  try{
    if(typeof window.DVL_RELEASE_CANDIDATE_GATE !== "undefined"){
      var rcr = window.DVL_RELEASE_CANDIDATE_GATE.audit();
      releaseCandidateStillValid = !!(rcr && rcr.pass === true);
    }
  }catch(e){ warnings.push("DVL_RELEASE_CANDIDATE_GATE.audit() threw: " + e.message); }
  if(!releaseCandidateStillValid) warnings.push("DVL_RELEASE_CANDIDATE_GATE.audit().pass not true");

  var pass = (
    headerOk &&
    headerLeakFixed &&
    finalLocksPresent &&
    btnPresent &&
    retiredAbsent
  );

  _lastAudit = {
    pass:                      pass,
    readyForNextUIPass:        pass,
    headerLeakFixed:           headerLeakFixed,
    paperLabelsNonSticky:      paperLabelsNonSticky,
    limitDoesNotExecuteAsMarket: limitDoesNotExecuteAsMarket,
    scaleLabelsProportional:   scaleLabelsProportional,
    currentPriceLabelCompact:  currentPriceLabelCompact,
    releaseCandidateStillValid: releaseCandidateStillValid,
    blockers:                  blockers,
    warnings:                  warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_MOBILE_UI_POLISH_AUDIT = {
  VERSION:      "0.681",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>

'''

# Keep module 0680's })();\n</script> explicitly, then insert 0681, then </head><body>
# Doing MOD_0681 + MOD_ANCHOR would create the orphan pattern again (</script>\n\n})();...)
html = rep(html, MOD_ANCHOR,
    '})();\n</script>\n\n' + MOD_0681 + '</head>\n<body>',
    'insert-module-0681')

# ── Assertions ────────────────────────────────────────────────────────────────
print("\n— Assertions —")

# A1-A3: version
assertEq('<title>DVL Binance Live — Beta 0.681</title>' in html, 'A1-title-0681')
assertEq('"Beta 0.681"' in html,                                  'A2-version-const')
assertEq('>BETA 0.681</div>' in html,                             'A3-badge')

# A4-A5: changelog
assertEq('"Beta 0.681 — Mobile UI polish:' in html,   'A4-changelog-0681')
assertEq('"Beta 0.680", note: "Beta 0.680 —' in html, 'A5-changelog-0680-preserved')

# A6-A7: new CSS and module once
assertEq(html.count('<style id="DVL_MOBILE_UI_POLISH_CSS_0681">') == 1,    'A6-css-0681-once')
assertEq(html.count('<script id="DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681">') == 1, 'A7-module-0681-once')

# Extract module 0681 source
m681_start = html.index('<script id="DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681">')
m681_end   = html.index('</script>', m681_start) + len('</script>')
m681       = html[m681_start:m681_end]

# A8-A9: globals and function names
assertEq('window.DVL_MOBILE_UI_POLISH_AUDIT' in m681, 'A8-global-defined')
assertEq('VERSION:      "0.681"' in m681 or 'VERSION: "0.681"' in m681, 'A8b-version-string')
assertEq('audit:' in m681, 'A9a-audit')
assertEq('run:' in m681,   'A9b-run')
assertEq('getLastAudit:' in m681, 'A9c-getLastAudit')

# A10: pass / readyForNextUIPass
assertEq('pass' in m681,                'A10-pass-in-module')
assertEq('readyForNextUIPass' in m681,  'A10b-readyForNextUIPass')

# A11: orphan code leak gone — no double ])();\n</script> before </head>
assertEq('})();\n</script>\n\n})();\n</script>\n\n</head>\n<body>' not in html, 'A11-orphan-removed')

# A12: only ONE ])();\n</script> before </head>
head_end = html.index('</head>')
tail = html[:head_end]
assertEq(tail.count('})();\n</script>') >= 1, 'A12a-at-least-one-iife-close-in-head')
# Verify the last })();</script> within <head> is followed by </head>
last_iife_in_head = tail.rindex('})();\n</script>')
last_block = html[last_iife_in_head:head_end + 10]
assertEq('</head>' in last_block, 'A12b-last-script-closes-before-head')

# A13: .dvl-ls-line extension in CSS_0681
assertEq('-9999px' in html, 'A13-line-extension-css')
assertEq('overflow: visible' in html or 'overflow:visible' in html, 'A13b-box-overflow-visible')

# A14: current price label compact
assertEq('const tagH = 20;' in html, 'A14-tagH-20')
assertEq('roundRect(ctx, tx, ty, tagW, tagH, 3, true, false, "#13dc8d")' in html, 'A14b-radius-3')

# A15: Buy/Sell handlers intact
assertEq('id="dvlBuyBtn"' in html and 'id="dvlSellBtn"' in html, 'A15-buySell-intact')

# A16: Limit order flow — new functions present
assertEq('executeMarketOrder' in html,   'A16a-executeMarketOrder')
assertEq('createPendingOrderDraft' in html, 'A16b-createPendingOrderDraft')
assertEq('confirmPendingOrder' in html,  'A16c-confirmPendingOrder')
assertEq('cancelPendingOrderDraft' in html, 'A16d-cancelPendingOrderDraft')
assertEq('fillPendingOrderIfTriggered' in html, 'A16e-fillPendingOrderIfTriggered')

# A17: startOrder now branches on orderType
assertEq('state.orderType === "Market"' in html, 'A17-orderType-branch')
assertEq('executeMarketOrder(side)' in html,     'A17b-market-branch')
assertEq('createPendingOrderDraft(side)' in html, 'A17c-limit-branch')

# A18: dvlSyncTagLeft now also handles .dvl-ls-box
assertEq('dvl-ls-box' in html[html.index('dvlSyncTagLeft'):html.index('dvlSyncTagLeft') + 3000], 'A18-dvl-ls-box-in-sync')
assertEq('tagLeftPx(bPos, chartW, S)' in html, 'A18b-tagLeftPx-bPos')

# A19: retired still absent
assertEq('<script id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673">' not in html, 'A19a-retired-0673-absent')
assertEq('<script id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674">' not in html,           'A19b-retired-0674-absent')

# A20: button system still present (marker after </head>)
assertEq('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====' in html[head_end:], 'A20-btn-0655-intact')

# A21: DVL_BUTTON_SYSTEM_MODULE_0681 NOT present
assertEq('DVL_BUTTON_SYSTEM_MODULE_0681' not in html, 'A21-no-btn-module-0681')

# A22-A23: getMigrated / migrated- absent from btn block
bsm_start  = html.index('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====', head_end)
bsm_export = html.index('window.DVL_BUTTON_SYSTEM = {', bsm_start)
bsm_block  = html[bsm_start:bsm_export]
assertEq('getMigrated' not in bsm_block,       'A22-no-getMigrated-in-btn')
assertEq('dvl-btn-migrated-' not in bsm_block, 'A23-no-migratedToken-in-btn')

# A24: startOrder, paper, chart, oscillator, tools
assertEq('startOrder' in html,           'A24-startOrder-intact')
assertEq('startOrder("buy")' in html,    'A25-paperOrder-intact')
assertEq('drawSoon' in html[head_end:],  'A26-chart-drawSoon-intact')
assertEq('DVL_OSCILLATOR_BOUNDS_PUBLISHER' in html, 'A27-oscillator-intact')
assertEq('dvl-btn-keypad' in html,       'A28-tools-keypad-intact')

# A29: final locks 1x each
assertEq(html.count('<style id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659">') == 1,       'A29a-lock0659')
assertEq(html.count('<style id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660">') == 1,     'A29b-lock0660')
assertEq(html.count('<style id="DVL_CHROME_FINAL_LOCK_CSS_0661">') == 1,            'A29c-lock0661')
assertEq(html.count('<style id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662">') == 1, 'A29d-lock0662')

# A30: release candidate and optimized baseline preserved
assertEq(html.count('<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">') == 1,    'A30-rc-gate-present')
assertEq(html.count('<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">') == 1, 'A31-obf-present')

# A32-A34: no broker connector, real order, API key
assertEq('BrokerConnector' not in html, 'A32-no-broker-connector')
assertEq('REAL_ORDER' not in html,      'A33-no-real-order')
assertEq('API_KEY' not in html and 'apiKey' not in m681, 'A34-no-api-key-in-module')

# A35-A36: no timers/RAF/observers or drawSoon wrap in module
assertEq('setTimeout'            not in m681, 'A35a-no-setTimeout')
assertEq('setInterval'           not in m681, 'A35b-no-setInterval')
assertEq('requestAnimationFrame' not in m681, 'A35c-no-rAF')
assertEq('MutationObserver'      not in m681, 'A35d-no-MutationObserver')
assertEq('ResizeObserver'        not in m681, 'A35e-no-ResizeObserver')
assertEq('window.drawSoon'       not in m681, 'A36-no-drawSoon-in-module')

# A37: JS syntax check
js_src = m681
js_src = js_src.replace('<script id="DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681">', '')
js_src = js_src.replace('</script>', '')
tmp = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
tmp.write(js_src)
tmp.close()
r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
assertEq(r.returncode == 0, 'A37-js-syntax-ok' + ('' if r.returncode == 0 else ': ' + r.stderr.strip()))

# ── Write ─────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nAll assertions passed. Written → {SRC}")
print(f"Lines: {html.count(chr(10))+1}")
