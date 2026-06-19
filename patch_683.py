#!/usr/bin/env python3
"""patch_683.py — Beta 0.683: HTML/CSS Structure Hotfix."""
import sys, shutil, os, subprocess, tempfile, re

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-41.before_0683_html_css_structure_hotfix.html"

STYLE_IDS_0675_0683 = [
    'DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675',
    'DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676',
    'DVL_POST_CLEANUP_INVENTORY_CSS_0677',
    'DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678',
    'DVL_OPTIMIZED_BASELINE_FREEZE_CSS_0679',
    'DVL_RELEASE_CANDIDATE_GATE_CSS_0680',
    'DVL_MOBILE_UI_POLISH_CSS_0681',
    'DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682',
    'DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683',
]

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

# ── Step 1: Version bump → 0.683 ─────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.682</title>',
    '<title>DVL Binance Live — Beta 0.683</title>',
    'title-bump')

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.682";',
    'const DVL_APP_VERSION = "Beta 0.683";',
    'version-const-bump')

html = rep(html,
    '>BETA 0.682</div>',
    '>BETA 0.683</div>',
    'badge-bump')

# ── Step 2: Changelog ─────────────────────────────────────────────────────────
old_cl = '  { version: DVL_APP_VERSION, note: "Beta 0.682 — Mobile UI polish hotfix: fixed duplicate style close, real Limit/Stop draft flow, anchored TP/SL/ENTRY labels, and measured scale label sizing." },'
new_cl = (
    '  { version: DVL_APP_VERSION, note: "Beta 0.683 — HTML/CSS structure hotfix: fixed nested/duplicated style closing around 0675–0682 markers without changing Paper logic." },\n'
    '  { version: "Beta 0.682", note: "Beta 0.682 — Mobile UI polish hotfix: fixed duplicate style close, real Limit/Stop draft flow, anchored TP/SL/ENTRY labels, and measured scale label sizing." },'
)
html = rep(html, old_cl, new_cl, 'changelog-update')

# ── Step 3: Fix DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675 ──────────────────────
# Bug: missing </style> before DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676.
# Source had two blank lines between end of 0675 content and start of 0676 tag,
# causing the browser to treat 0676's opening tag as raw text inside 0675.
html = rep(html,
    '*/\n\n\n<style id="DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676">',
    '*/\n</style>\n\n<style id="DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676">',
    'fix-0675-missing-close')

# ── Step 4a: Fix DVL_MOBILE_UI_POLISH_CSS_0681 ────────────────────────────────
# Bug: missing </style> before DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682 opens.
html = rep(html,
    '.dvl-ls-box { overflow: visible; }\n\n\n<style id="DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682">',
    '.dvl-ls-box { overflow: visible; }\n</style>\n\n<style id="DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682">',
    'fix-0681-missing-close')

# ── Step 4b: Fix duplicate </style></style> at end of 0682 block ─────────────
html = rep(html,
    '.dvl-ls-box[data-status="draft"]    { opacity: 0.6; }\n</style></style>',
    '.dvl-ls-box[data-status="draft"]    { opacity: 0.6; }\n</style>',
    'fix-0682-dup-close')

# ── Step 4c: Fix JS comment in module 0682 that contains literal </style></style> ──
# The audit module comment "// A1. No duplicate </style></style>..." introduced
# a literal </style></style> into the HTML source, creating a false-positive.
html = rep(html,
    '// A1. No duplicate </style></style> (use split string to avoid false-positive in source scan)',
    '// A1. No nested or duplicate closing style tag (split string in _dupStyleTag avoids false-positive)',
    'fix-mod0682-comment-literal')

# ── Step 5: Insert DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683 ────────────────────
# After fixes, 0682's </style> is followed by blank line + the 0672 audit script.
# Insert 0683 marker between them; the </style> here closes 0682 (kept explicit).
CSS_0683 = (
    '<style id="DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683">\n'
    '/*\n'
    '  DVL Beta 0.683 — HTML/CSS structure hotfix.\n'
    '  Corrected nested/duplicate style closings around 0675-0682 markers.\n'
    '  No selectors, no properties, no visual change.\n'
    '*/\n'
    '</style>'
)
html = rep(html,
    '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    '</style>\n\n' + CSS_0683 + '\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    'insert-css-0683')

# ── Step 6: Insert DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT_MODULE_0683 ───────────
MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0683 = '''<script id="DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT_MODULE_0683">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _shimScanTxt   = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";
var _dupStyleTag   = '<' + '/style><' + '/style>';
var _nestedStyleOpen = '<' + 'style id=';

var STYLE_IDS = [
  "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675",
  "DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676",
  "DVL_POST_CLEANUP_INVENTORY_CSS_0677",
  "DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678",
  "DVL_OPTIMIZED_BASELINE_FREEZE_CSS_0679",
  "DVL_RELEASE_CANDIDATE_GATE_CSS_0680",
  "DVL_MOBILE_UI_POLISH_CSS_0681",
  "DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682",
  "DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683"
];

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
  var end = full.indexOf("\\n    function ", start + 10);
  return end === -1 ? full.slice(start) : full.slice(start, end);
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  // 1. All style IDs 0675-0683 exist as real style[id] in DOM exactly 1x
  var allStylesPresent = true;
  var styleCountProblems = [];
  for(var i = 0; i < STYLE_IDS.length; i++){
    var cnt = _cntId(styleEls, STYLE_IDS[i]);
    if(cnt !== 1){
      allStylesPresent = false;
      styleCountProblems.push(STYLE_IDS[i] + ":" + cnt);
    }
  }
  if(!allStylesPresent) blockers.push("style count problems: " + styleCountProblems.join(", "));

  // 2. No style[id] contains nested <style id= in its textContent
  // 3. No style[id] contains </style><style or </style></style in its textContent
  var noNesting = true;
  var nestingProblems = [];
  for(var j = 0; j < styleEls.length; j++){
    var sel = styleEls[j];
    var txt = sel.textContent || "";
    if(txt.indexOf(_nestedStyleOpen) > -1){
      noNesting = false;
      nestingProblems.push(sel.id + ": contains nested style-open");
    }
    if(txt.indexOf(_dupStyleTag) > -1 || txt.indexOf('<' + '/style><' + 'style') > -1){
      noNesting = false;
      nestingProblems.push(sel.id + ": contains </style> sequence inside");
    }
  }
  if(!noNesting) blockers.push("nesting problems: " + nestingProblems.join("; "));

  // 4. No duplicate closing tag in document outer HTML
  var noDupClose = document.documentElement.outerHTML.indexOf(_dupStyleTag) === -1;
  if(!noDupClose) blockers.push("duplicate closing tag found in outerHTML");

  // 5-7. CSS 0681, 0682, 0683 each present 1x (subset of check #1, explicit)
  var css681 = _cntId(styleEls, "DVL_MOBILE_UI_POLISH_CSS_0681") === 1;
  var css682 = _cntId(styleEls, "DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682") === 1;
  var css683 = _cntId(styleEls, "DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683") === 1;
  if(!css681) blockers.push("DVL_MOBILE_UI_POLISH_CSS_0681 not 1x");
  if(!css682) blockers.push("DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682 not 1x");
  if(!css683) blockers.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683 not 1x");

  // 8. Module 0682 preserved
  var m682Present = _cntId(scriptEls, "DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682") === 1;
  if(!m682Present) warnings.push("DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682 not found");

  // 9. DVL_RELEASE_CANDIDATE_GATE preserved
  var rcGatePresent = typeof window.DVL_RELEASE_CANDIDATE_GATE !== "undefined";
  if(!rcGatePresent) warnings.push("DVL_RELEASE_CANDIDATE_GATE not found");

  // 10. DVL_OPTIMIZED_BASELINE_FREEZE preserved
  var obfPresent = typeof window.DVL_OPTIMIZED_BASELINE_FREEZE !== "undefined";
  if(!obfPresent) warnings.push("DVL_OPTIMIZED_BASELINE_FREEZE not found");

  // 11. Final locks 0659-0662 present 1x each
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // 12. DVL_BUTTON_SYSTEM_MODULE_0655 preserved
  var btn0655Present = _cntId(scriptEls, "DVL_BUTTON_SYSTEM_MODULE_0655") === 1;
  if(!btn0655Present) blockers.push("DVL_BUTTON_SYSTEM_MODULE_0655 not found");

  // 13. window.DVL_BUTTON_SYSTEM preserved
  var btnSysPresent = typeof window.DVL_BUTTON_SYSTEM !== "undefined";
  if(!btnSysPresent) blockers.push("window.DVL_BUTTON_SYSTEM not found");

  // 14. DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT.audit().pass === true
  var m682AuditPass = false;
  try{
    if(typeof window.DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT !== "undefined"){
      var r682 = window.DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT.audit();
      m682AuditPass = !!(r682 && r682.pass === true);
    }
  }catch(e){ warnings.push("DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT.audit() threw: " + e.message); }
  if(!m682AuditPass) warnings.push("DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT.audit().pass not true");

  // 15. Draft flow 0682 preserved (source scan)
  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var si = 0; si < _allScripts.length; si++){ _srcFull += _allScripts[si].textContent; }

  var draftFnSrc   = _fnSrc(_srcFull, "createPendingOrderDraft");
  var confirmFnSrc = _fnSrc(_srcFull, "confirmPendingOrderDraft");
  var cancelFnSrc  = _fnSrc(_srcFull, "cancelPendingOrderDraft");

  var hasPendingDraft  = _srcFull.indexOf("pendingDraft") > -1;
  var draftNoCreatePos = draftFnSrc.indexOf("createPosition") === -1;
  var draftNoPush      = draftFnSrc.indexOf("state.positions.push") === -1;
  var confirmExists    = _srcFull.indexOf("function confirmPendingOrderDraft") > -1;
  var confirmPending   = confirmFnSrc.indexOf('status: "pending"') > -1;
  var cancelClears     = cancelFnSrc.indexOf("pendingDraft = null") > -1;

  if(!hasPendingDraft)  blockers.push("pendingDraft not found in source");
  if(!draftNoCreatePos) blockers.push("createPendingOrderDraft still calls createPosition");
  if(!draftNoPush)      blockers.push("createPendingOrderDraft still pushes to positions");
  if(!confirmExists)    blockers.push("confirmPendingOrderDraft not found");
  if(!confirmPending)   blockers.push('confirmPendingOrderDraft does not set status:"pending"');

  // 16. Header .top present
  var headerEl = document.querySelector('header.top, .top');
  var headerOk = !!headerEl;
  if(!headerOk) blockers.push(".top not found");

  // 17. No raw code text nodes before .top
  var headerLeakFixed = true;
  if(headerEl && document.body){
    var node = document.body.firstChild;
    while(node && node !== headerEl && node !== headerEl.parentElement){
      if(node.nodeType === 3){
        var txt2 = (node.textContent || "").trim();
        if(txt2 && /[)();{}]|function|return|const|let|var/.test(txt2)){
          headerLeakFixed = false;
          blockers.push("code leak before .top: " + txt2.slice(0, 40));
        }
      }
      node = node.nextSibling;
    }
  }

  // 18. Zero Broker Connector (split string avoids false-positive in scan)
  var _brokerToken = "Broker" + "Connector";
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken + " found");

  var pass = (
    allStylesPresent &&
    noNesting &&
    noDupClose &&
    css681 && css682 && css683 &&
    finalLocksPresent &&
    btn0655Present &&
    btnSysPresent &&
    hasPendingDraft &&
    draftNoCreatePos &&
    draftNoPush &&
    confirmExists &&
    confirmPending &&
    headerOk &&
    headerLeakFixed
  );

  _lastAudit = {
    pass:               pass,
    allStylesPresent:   allStylesPresent,
    noNesting:          noNesting,
    noDupClose:         noDupClose,
    css681:             css681,
    css682:             css682,
    css683:             css683,
    m682AuditPass:      m682AuditPass,
    hasPendingDraft:    hasPendingDraft,
    draftNoCreatePos:   draftNoCreatePos,
    draftNoPush:        draftNoPush,
    confirmExists:      confirmExists,
    confirmPending:     confirmPending,
    cancelClears:       cancelClears,
    headerOk:           headerOk,
    headerLeakFixed:    headerLeakFixed,
    noBroker:           noBroker,
    blockers:           blockers,
    warnings:           warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT = {
  VERSION:      "0.683",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>

'''

html = rep(html, MOD_ANCHOR,
    '})();\n</script>\n\n' + MOD_0683 + '</head>\n<body>',
    'insert-module-0683')

# ── Assertions ────────────────────────────────────────────────────────────────
print("\n— Assertions —")

# A1-A3: version
assertEq('<title>DVL Binance Live — Beta 0.683</title>' in html, 'A1-title-0683')
assertEq('"Beta 0.683"' in html,                                  'A2-version-const')
assertEq('>BETA 0.683</div>' in html,                             'A3-badge')

# A4-A5: changelog
assertEq('"Beta 0.683 — HTML/CSS structure hotfix:' in html, 'A4-changelog-0683')
assertEq('"Beta 0.682", note: "Beta 0.682 —' in html,        'A5-changelog-0682-preserved')

# A6: zero </style></style> in full source
assertEq(html.count('</style></style>') == 0, 'A6-zero-dup-style-close')

# A7-A15: each style marker 0675-0683 present exactly 1x
for i, sid in enumerate(STYLE_IDS_0675_0683):
    tag = f'<style id="{sid}">'
    assertEq(html.count(tag) == 1, f'A{7+i}-style-{sid[-4:]}')

# A16: no style marker contains nested <style id= in its raw source content
for sid in STYLE_IDS_0675_0683:
    tag = f'<style id="{sid}">'
    start = html.index(tag) + len(tag)
    end   = html.index('</style>', start)
    inner = html[start:end]
    assertEq('<style id=' not in inner, f'A16-no-nesting-in-{sid[-4:]}')

# A17: module 0683 present 1x
assertEq(html.count('<script id="DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT_MODULE_0683">') == 1, 'A17-module-0683-once')

# Extract module 0683
m683_start = html.index('<script id="DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT_MODULE_0683">')
m683_end   = html.index('</script>', m683_start) + len('</script>')
m683       = html[m683_start:m683_end]

# A18: global and version
assertEq('window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT' in m683, 'A18-global-defined')
assertEq('VERSION:      "0.683"' in m683 or 'VERSION: "0.683"' in m683, 'A19-version-0683')

# A19-A20: module functions
assertEq('audit:' in m683, 'A20a-audit')
assertEq('run:' in m683,   'A20b-run')
assertEq('getLastAudit:' in m683, 'A20c-getLastAudit')

# A21: draft flow 0682 still present
draft_fn_start = html.index('function createPendingOrderDraft(side){')
draft_fn_end   = html.index('\n    function ', draft_fn_start + 10)
draft_fn_src   = html[draft_fn_start:draft_fn_end]
assertEq('createPosition' not in draft_fn_src,         'A21a-draft-no-createPosition')
assertEq('state.positions.push' not in draft_fn_src,   'A21b-draft-no-positions-push')
assertEq('status: "draft"' in draft_fn_src,            'A21c-draft-sets-status-draft')

confirm_start = html.index('function confirmPendingOrderDraft(id){')
confirm_end   = html.index('\n    function ', confirm_start + 10)
confirm_src   = html[confirm_start:confirm_end]
assertEq('status: "pending"' in confirm_src,           'A21d-confirm-sets-pending')
assertEq('state.positions.push(pos)' in confirm_src,   'A21e-confirm-pushes-pos')

# A22: prior audit modules preserved
assertEq(html.count('<script id="DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682">') == 1, 'A22a-mod0682-present')
assertEq(html.count('<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">') == 1,         'A22b-mod0680-present')
assertEq(html.count('<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">') == 1,      'A22c-mod0679-present')
assertEq(html.count('<script id="DVL_MOBILE_UI_POLISH_AUDIT_MODULE_0681">') == 1,         'A22d-mod0681-present')

# A23: header leak fixed — no orphan before </head>
head_end = html.index('</head>')
tail = html[:head_end]
assertEq('})();\n</script>\n\n})();\n</script>' not in tail, 'A23-no-orphan-iife')

# A24: final locks 1x each
assertEq(html.count('<style id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659">') == 1,       'A24a-lock0659')
assertEq(html.count('<style id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660">') == 1,     'A24b-lock0660')
assertEq(html.count('<style id="DVL_CHROME_FINAL_LOCK_CSS_0661">') == 1,            'A24c-lock0661')
assertEq(html.count('<style id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662">') == 1, 'A24d-lock0662')

# A25: button system preserved
assertEq('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====' in html[head_end:], 'A25-btn-0655')

# A26: buy/sell intact
assertEq('id="dvlBuyBtn"' in html and 'id="dvlSellBtn"' in html, 'A26-buySell')

# A27: paper order preserved
assertEq('function renderPosition' in html, 'A27-renderPosition')

# A28: chart + oscillator intact
assertEq('DVL_OSCILLATOR_BOUNDS_PUBLISHER' in html, 'A28-oscillator')
assertEq('dvl-btn-keypad' in html,                  'A29-keypads')

# A30: no broker/real/api
assertEq(('Broker' + 'Connector') not in html, 'A30-no-broker')
assertEq('REAL_ORDER' not in html,      'A31-no-real-order')
assertEq('API_KEY' not in html,         'A32-no-api-key')

# A33-A37: no timers/RAF/observers/drawSoon in module 0683
assertEq('setTimeout'            not in m683, 'A33a-no-setTimeout')
assertEq('setInterval'           not in m683, 'A33b-no-setInterval')
assertEq('requestAnimationFrame' not in m683, 'A33c-no-rAF')
assertEq('MutationObserver'      not in m683, 'A33d-no-MutationObserver')
assertEq('ResizeObserver'        not in m683, 'A33e-no-ResizeObserver')
assertEq('window.drawSoon'       not in m683, 'A34-no-drawSoon')

# A35: JS syntax check
js_src = m683
js_src = js_src.replace('<script id="DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT_MODULE_0683">', '')
js_src = js_src.replace('</script>', '')
tmp = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
tmp.write(js_src)
tmp.close()
r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
assertEq(r.returncode == 0, 'A35-js-syntax-ok' + ('' if r.returncode == 0 else ': ' + r.stderr.strip()))

# A36: CSS 0683 marker-only — no CSS selectors or properties
css683_start = html.index('<style id="DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683">')
css683_end   = html.index('</style>', css683_start) + len('</style>')
css683_inner = html[css683_start:css683_end]
assertEq('{' not in css683_inner and '}' not in css683_inner, 'A36-css-0683-marker-only')

# ── Static source checks (spec requirement) ───────────────────────────────────
print("\n— Static source checks —")
assertEq(html.count('</style></style>') == 0, 'S1-zero-dup-style-close')
for i, sid in enumerate(STYLE_IDS_0675_0683):
    assertEq(html.count(f'<style id="{sid}">') == 1, f'S{2+i}-count-{sid[-4:]}')
# No style block should contain another <style id= within its raw source content
for sid in STYLE_IDS_0675_0683:
    tag   = f'<style id="{sid}">'
    start = html.index(tag) + len(tag)
    end   = html.index('</style>', start)
    inner = html[start:end]
    assertEq('<style id=' not in inner, f'S11-no-nesting-{sid[-4:]}')

# ── Write ─────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nAll assertions passed. Written → {SRC}")
print(f"Lines: {html.count(chr(10))+1}")
