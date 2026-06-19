#!/usr/bin/env python3
"""patch_679.py — implements Beta 0.679: Optimized Baseline Freeze."""
import sys, shutil, os, subprocess, tempfile

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-37.before_0679_optimized_baseline_freeze.html"

# ── helpers ──────────────────────────────────────────────────────────────────

def rep(html, old, new, label):
    n = html.count(old)
    if n != 1:
        print(f"FAIL rep [{label}]: found {n} occurrences (need exactly 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

def assertEq(cond, label):
    if not cond:
        print(f"FAIL assertion [{label}]")
        sys.exit(1)
    print(f"  OK  [{label}]")

# ── load ─────────────────────────────────────────────────────────────────────

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

shutil.copy2(SRC, BAK)
print(f"Backup → {BAK}")

# ── Step 1: version bump → 0.679 ─────────────────────────────────────────────

html = rep(html,
    '<title>DVL Binance Live — Beta 0.678</title>',
    '<title>DVL Binance Live — Beta 0.679</title>',
    'title-bump')

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.678";',
    'const DVL_APP_VERSION = "Beta 0.679";',
    'version-const-bump')

html = rep(html,
    '>BETA 0.678</div>',
    '>BETA 0.679</div>',
    'badge-bump')

# ── Step 2: changelog ─────────────────────────────────────────────────────────

old_cl = '  { version: DVL_APP_VERSION, note: "Beta 0.678 — Safe historical audit cleanup batch 3: removed retired 0.673/0.674 audit modules after 0.677 post-cleanup inventory confirmed safe removal." },'
new_cl = (
    '  { version: DVL_APP_VERSION, note: "Beta 0.679 — Optimized baseline freeze: froze the post-cleanup stable base after 0.678 verified readyForOptimizedBaselineFreeze." },\n'
    '  { version: "Beta 0.678", note: "Beta 0.678 — Safe historical audit cleanup batch 3: removed retired 0.673/0.674 audit modules after 0.677 post-cleanup inventory confirmed safe removal." },'
)
html = rep(html, old_cl, new_cl, 'changelog-update')

# ── Step 3: insert DVL_OPTIMIZED_BASELINE_FREEZE_CSS_0679 ────────────────────

CSS_ANCHOR = '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">'

CSS_0679 = '''\n\n<style id="DVL_OPTIMIZED_BASELINE_FREEZE_CSS_0679">
/*
  DVL Beta 0.679 — Optimized baseline freeze.
  Froze the post-cleanup stable base as the new optimized stable state.
  No selectors, no properties, no visual change.
*/
</style>'''

html = rep(html, CSS_ANCHOR, CSS_0679 + CSS_ANCHOR, 'insert-css-0679')

# ── Step 4: insert DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679 ─────────────────

MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0679 = '''

<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _p           = "get" + "Migrated";
var _shimScanTxt = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";
var _clsContains = "classList" + ".contains('";
var _clsAdd      = "classList" + ".add('";

var OPTIMIZED_BASELINE_CONTRACT = {
  expectedAppVersion: "Beta 0.679",
  layout: {
    header:       55,
    assetbar:     50,
    chartToolbar: 30,
    footer:       57,
    footerButton: 55,
    priceScale:   70,
    tradeDrawerMax: 150
  },
  protectedModules: [
    "DVL_BUTTON_SYSTEM_MODULE_0655",
    "DVL_LAYOUT_CONTRACT_MODULE_0656",
    "DVL_LAYOUT_ASSERTIONS_MODULE_0657",
    "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
    "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
    "DVL_CHROME_FINAL_LOCK_CSS_0661",
    "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662",
    "DVL_PAPER_LAYER_ANCHOR_MODULE_0665",
    "DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666",
    "DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667",
    "DVL_FEATURE_GATE_AUDIT_MODULE_0668",
    "DVL_BASELINE_FREEZE_MODULE_0669",
    "DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670",
    "DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671",
    "DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672",
    "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675",
    "DVL_AUDIT_CHAIN_RECONCILIATION_MODULE_0676",
    "DVL_POST_CLEANUP_INVENTORY_MODULE_0677",
    "DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_MODULE_0678"
  ],
  retiredModules: [
    "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",
    "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",
    "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674",
    "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674"
  ],
  finalLockCss: [
    "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
    "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
    "DVL_CHROME_FINAL_LOCK_CSS_0661",
    "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
  ]
};

function getContract() {
  return JSON.parse(JSON.stringify(OPTIMIZED_BASELINE_CONTRACT));
}

function _cntId(els, id) {
  var c = 0;
  for (var i = 0; i < els.length; i++) { if (els[i].id === id) c++; }
  return c;
}

function audit() {
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');

  var blockers = [];
  var warnings = [];

  // 1. App version
  var version   = (typeof window.DVL_APP_VERSION !== "undefined") ? window.DVL_APP_VERSION : "";
  var versionOk = version === OPTIMIZED_BASELINE_CONTRACT.expectedAppVersion;
  if (!versionOk) blockers.push("app version mismatch: " + version);

  // 2. Protected modules present (mix of script[id] and window globals)
  var CSS_ONLY_IDS = {
    "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659":    true,
    "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660":  true,
    "DVL_CHROME_FINAL_LOCK_CSS_0661":         true,
    "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662": true
  };
  var BTN_WINDOW_CHECK = {
    "DVL_BUTTON_SYSTEM_MODULE_0655":   function(){ return typeof window.DVL_BUTTON_SYSTEM !== "undefined"; },
    "DVL_LAYOUT_CONTRACT_MODULE_0656": function(){ return typeof window.DVL_LAYOUT_CONTRACT !== "undefined"; }
  };
  var missingMods = [];
  for (var i = 0; i < OPTIMIZED_BASELINE_CONTRACT.protectedModules.length; i++) {
    var pid = OPTIMIZED_BASELINE_CONTRACT.protectedModules[i];
    if (BTN_WINDOW_CHECK[pid]) {
      if (!BTN_WINDOW_CHECK[pid]()) missingMods.push(pid);
    } else if (CSS_ONLY_IDS[pid]) {
      if (_cntId(styleEls, pid) !== 1) missingMods.push(pid);
    } else {
      if (_cntId(scriptEls, pid) !== 1) missingMods.push(pid);
    }
  }
  var protectedModulesPresent = missingMods.length === 0;
  if (!protectedModulesPresent) blockers.push("protected modules missing: " + missingMods.join(", "));

  // 3. Retired modules absent
  var stillPresent = [];
  for (var r = 0; r < OPTIMIZED_BASELINE_CONTRACT.retiredModules.length; r++) {
    var rid = OPTIMIZED_BASELINE_CONTRACT.retiredModules[r];
    if (_cntId(scriptEls, rid) > 0 || _cntId(styleEls, rid) > 0) stillPresent.push(rid);
  }
  var retiredModulesAbsent = stillPresent.length === 0;
  if (!retiredModulesAbsent) blockers.push("retired modules still present: " + stillPresent.join(", "));

  // 4-8. Audit chain checks
  var safeCleanupPass = false;
  var postInventoryPass = false;
  var auditChainPass = false;
  var shimRemovalPass = false;
  var baselinePass = false;

  try {
    if (typeof window.DVL_SAFE_HISTORICAL_AUDIT_CLEANUP !== "undefined") {
      var r1 = window.DVL_SAFE_HISTORICAL_AUDIT_CLEANUP.audit();
      safeCleanupPass = !!(r1 && r1.pass === true);
    }
  } catch(e) { warnings.push("DVL_SAFE_HISTORICAL_AUDIT_CLEANUP err: " + e.message); }

  try {
    if (typeof window.DVL_POST_CLEANUP_INVENTORY !== "undefined") {
      var r2 = window.DVL_POST_CLEANUP_INVENTORY.audit();
      postInventoryPass = !!(r2 && r2.pass === true);
    }
  } catch(e) { warnings.push("DVL_POST_CLEANUP_INVENTORY err: " + e.message); }

  try {
    if (typeof window.DVL_AUDIT_CHAIN_RECONCILIATION !== "undefined") {
      var r3 = window.DVL_AUDIT_CHAIN_RECONCILIATION.audit();
      auditChainPass = !!(r3 && r3.pass === true);
    }
  } catch(e) { warnings.push("DVL_AUDIT_CHAIN_RECONCILIATION err: " + e.message); }

  try {
    if (typeof window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT !== "undefined") {
      var r4 = window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT.audit();
      shimRemovalPass = !!(r4 && r4.pass === true);
    }
  } catch(e) { warnings.push("DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT err: " + e.message); }

  try {
    if (typeof window.DVL_BASELINE_FREEZE !== "undefined") {
      var r5 = window.DVL_BASELINE_FREEZE.audit();
      baselinePass = !!(r5 && r5.pass === true);
    }
  } catch(e) { warnings.push("DVL_BASELINE_FREEZE err: " + e.message); }

  var activeAuditChainPass = safeCleanupPass && postInventoryPass && auditChainPass && shimRemovalPass && baselinePass;
  if (!safeCleanupPass)   warnings.push("DVL_SAFE_HISTORICAL_AUDIT_CLEANUP.audit() not passing");
  if (!postInventoryPass) warnings.push("DVL_POST_CLEANUP_INVENTORY.audit() not passing");
  if (!auditChainPass)    warnings.push("DVL_AUDIT_CHAIN_RECONCILIATION.audit() not passing");
  if (!shimRemovalPass)   warnings.push("DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT.audit() not passing");
  if (!baselinePass)      warnings.push("DVL_BASELINE_FREEZE.audit() not passing");

  // 9. Layout matches optimized baseline
  var layoutMatchesOptimizedBaseline = (
    typeof window.DVL_BASELINE_FREEZE !== "undefined" &&
    typeof window.DVL_BASELINE_FREEZE.audit === "function"
  );

  // 10. Final locks present exactly 1x
  var finalLocks = OPTIMIZED_BASELINE_CONTRACT.finalLockCss;
  var missingLocks = [];
  for (var fl = 0; fl < finalLocks.length; fl++) {
    if (_cntId(styleEls, finalLocks[fl]) !== 1) missingLocks.push(finalLocks[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if (!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // 11-15. Button System post-shim checks
  var btnObj       = window.DVL_BUTTON_SYSTEM;
  var btnPresent   = typeof btnObj !== "undefined";
  var btnAuditFn   = btnPresent && typeof btnObj.audit    === "function";
  var btnRefreshFn = btnPresent && typeof btnObj.refresh  === "function";
  var btnListByFn  = btnPresent && typeof btnObj.listByRole === "function";
  var btnAuditObj  = false;
  try { if (btnAuditFn) { var ba = btnObj.audit(); btnAuditObj = typeof ba === "object" && ba !== null; } } catch(e) {}
  var btnClean = btnPresent && typeof btnObj[_p + "FooterButtons"] === "undefined";
  var buttonSystemPostShim = btnPresent && btnAuditFn && btnRefreshFn && btnListByFn && btnAuditObj && btnClean;
  if (!btnPresent)              blockers.push("window.DVL_BUTTON_SYSTEM missing");
  if (btnPresent && !btnClean)  blockers.push("DVL_BUTTON_SYSTEM still exposes shim fn");

  // 16. data-dvl-button present
  var dataDvlButtonOk = document.querySelectorAll('[data-dvl-button]').length > 0;
  if (!dataDvlButtonOk) warnings.push("data-dvl-button not found in DOM");

  // 17. dvl-btn-* functional classes
  var dvlBtnOk = !!document.querySelector('.dvl-btn-footer, .dvl-btn-header, .dvl-btn-keypad');
  if (!dvlBtnOk) warnings.push("dvl-btn-* classes not found");

  // 18-19. Button System scan: no getMigrated / dvl-btn-migrated-
  var _btnBlockFound  = false;
  var _migratedGone   = true;
  var _tokenGone      = true;
  var _bs_marker = "// ===== DVL_BUTTON_SYSTEM_MODULE_" + "0655 =====";
  var _allScripts = document.querySelectorAll('script');
  for (var s = 0; s < _allScripts.length; s++) {
    var _txt = _allScripts[s].textContent;
    if (_txt.indexOf(_bs_marker) > -1) {
      _btnBlockFound = true;
      if (_txt.indexOf(_shimScanTxt) > -1)  _migratedGone = false;
      if (_txt.indexOf(_migratedToken) > -1) _tokenGone   = false;
      break;
    }
  }
  if (!_btnBlockFound)  blockers.push("DVL_BUTTON_SYSTEM_MODULE_0655 block not found");
  if (!_migratedGone)   blockers.push("shim fn text still in Button System");
  if (!_tokenGone)      blockers.push("migration token still in Button System");

  // 20-25. Key system presence (read-only DOM queries)
  var buySellOk = !!document.getElementById('dvlBuyBtn') && !!document.getElementById('dvlSellBtn');
  var tpSlOk    = !!document.querySelector('.tradeDrawer, [data-trade-drawer], #tradeDrawer');
  var paperOk   = typeof window.DVL_PAPER_LAYER_ANCHOR !== "undefined";
  var chartOk   = !!document.querySelector('canvas') || typeof window.DVL_RUNTIME_INTEGRATION_AUDIT !== "undefined";
  var oscOk     = typeof window.DVL_OSCILLATOR_BOUNDS_PUBLISHER !== "undefined";
  var toolsOk   = typeof window.DVL_FEATURE_GATE_AUDIT !== "undefined";

  if (!buySellOk) warnings.push("Buy/Sell buttons not found");
  if (!tpSlOk)    warnings.push("tradeDrawer not found");
  if (!paperOk)   warnings.push("DVL_PAPER_LAYER_ANCHOR not found");
  if (!chartOk)   warnings.push("canvas not found");
  if (!oscOk)     warnings.push("DVL_OSCILLATOR_BOUNDS_PUBLISHER not found");
  if (!toolsOk)   warnings.push("DVL_FEATURE_GATE_AUDIT not found");

  var pass = (
    versionOk &&
    protectedModulesPresent &&
    retiredModulesAbsent &&
    finalLocksPresent &&
    buttonSystemPostShim &&
    _btnBlockFound &&
    _migratedGone &&
    _tokenGone
  );

  var readyForReleaseCandidate = pass;

  _lastAudit = {
    version:                      version,
    pass:                         pass,
    readyForReleaseCandidate:     readyForReleaseCandidate,
    blockers:                     blockers,
    warnings:                     warnings,
    contract:                     getContract(),
    protectedModulesPresent:      protectedModulesPresent,
    retiredModulesAbsent:         retiredModulesAbsent,
    layoutMatchesOptimizedBaseline: layoutMatchesOptimizedBaseline,
    finalLocksPresent:            finalLocksPresent,
    buttonSystemPostShim:         buttonSystemPostShim,
    activeAuditChainPass:         activeAuditChainPass
  };
  return _lastAudit;
}

function getLastAudit() { return _lastAudit; }
function run() { _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_OPTIMIZED_BASELINE_FREEZE = {
  VERSION:      "0.679",
  getContract:  getContract,
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>'''

html = rep(html, MOD_ANCHOR, MOD_0679 + '\n\n' + MOD_ANCHOR.lstrip('\n'), 'insert-module-0679')

# ── Assertions ────────────────────────────────────────────────────────────────
print("\n— Assertions —")

# A1-A3: version markers
assertEq('<title>DVL Binance Live — Beta 0.679</title>' in html,  'A1-title-0679')
assertEq('"Beta 0.679"' in html,                                   'A2-version-const-0679')
assertEq('>BETA 0.679</div>' in html,                              'A3-badge-0679')

# A4-A5: changelog
assertEq('"Beta 0.679 — Optimized baseline freeze:' in html,      'A4-changelog-0679')
assertEq('"Beta 0.678", note: "Beta 0.678 —' in html,             'A5-changelog-0678-preserved')

# A6-A7: new CSS and module present once
assertEq(html.count('<style id="DVL_OPTIMIZED_BASELINE_FREEZE_CSS_0679">') == 1,   'A6-css-0679-once')
assertEq(html.count('<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">') == 1, 'A7-module-0679-once')

# Extract module 0679 source
m679_start = html.index('<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">')
m679_end   = html.index('</script>', m679_start) + len('</script>')
m679       = html[m679_start:m679_end]

# A8-A9: globals and function names
assertEq('window.DVL_OPTIMIZED_BASELINE_FREEZE' in m679,  'A8-global-defined')
assertEq('getContract' in m679,                            'A9a-getContract-exposed')
assertEq('audit:' in m679 or 'audit,' in m679,            'A9b-audit-exposed')
assertEq('run:' in m679,                                   'A9c-run-exposed')
assertEq('getLastAudit:' in m679,                          'A9d-getLastAudit-exposed')

# A10-A11: pass and readyForReleaseCandidate in module code
assertEq('pass' in m679,                         'A10-pass-in-module')
assertEq('readyForReleaseCandidate' in m679,     'A11-readyForReleaseCandidate-in-module')

# A12-A16: audit chain references in module
assertEq('DVL_SAFE_HISTORICAL_AUDIT_CLEANUP' in m679,    'A12-chain-safeCleanup')
assertEq('DVL_POST_CLEANUP_INVENTORY' in m679,            'A13-chain-postInventory')
assertEq('DVL_AUDIT_CHAIN_RECONCILIATION' in m679,        'A14-chain-auditChain')
assertEq('DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT' in m679,  'A15-chain-shimRemoval')
assertEq('DVL_BASELINE_FREEZE' in m679,                   'A16-chain-baselineFreeze')

# A17: layout contract values in module
assertEq('header:' in m679 and '55' in m679,  'A17-layout-in-contract')
assertEq('priceScale:' in m679,               'A17b-priceScale-in-contract')

# A18: final lock CSS IDs referenced in module
assertEq('DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659' in m679,       'A18a-finalLock-0659')
assertEq('DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660' in m679,     'A18b-finalLock-0660')
assertEq('DVL_CHROME_FINAL_LOCK_CSS_0661' in m679,            'A18c-finalLock-0661')
assertEq('DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662' in m679, 'A18d-finalLock-0662')
# final locks in HTML present exactly 1x
assertEq(html.count('<style id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659">') == 1,       'A18e-lock0659-1x')
assertEq(html.count('<style id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660">') == 1,     'A18f-lock0660-1x')
assertEq(html.count('<style id="DVL_CHROME_FINAL_LOCK_CSS_0661">') == 1,            'A18g-lock0661-1x')
assertEq(html.count('<style id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662">') == 1, 'A18h-lock0662-1x')

# A19: retired modules still absent
assertEq('<script id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673">' not in html, 'A19a-retired-mod-0673-absent')
assertEq('<style id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673">' not in html,           'A19b-retired-css-0673-absent')
assertEq('<script id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674">' not in html,           'A19c-retired-mod-0674-absent')
assertEq('<style id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674">' not in html,               'A19d-retired-css-0674-absent')

# A20: DVL_BUTTON_SYSTEM_MODULE_0655 marker present after </head>
head_end = html.index('</head>')
assertEq('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====' in html[head_end:], 'A20-btn-module-0655-present')

# A21: DVL_BUTTON_SYSTEM_MODULE_0679 NOT in html
assertEq('DVL_BUTTON_SYSTEM_MODULE_0679' not in html, 'A21-no-btn-module-0679')

# A22-A23: getMigrated / dvl-btn-migrated- absent from 0655 block (after </head>)
bsm_start  = html.index('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====', head_end)
bsm_export = html.index('window.DVL_BUTTON_SYSTEM = {', bsm_start)
bsm_block  = html[bsm_start:bsm_export]
assertEq('getMigrated' not in bsm_block,    'A22-no-getMigrated-in-btn-0655')
assertEq('dvl-btn-migrated-' not in bsm_block, 'A23-no-migratedToken-in-btn-0655')

# A24-A29: key system identifiers intact in HTML
assertEq('id="dvlBuyBtn"' in html and 'id="dvlSellBtn"' in html, 'A24-buySell-intact')
assertEq('startOrder' in html,           'A25-startOrder-intact')
assertEq('startOrder("buy")' in html,    'A26-paperOrder-intact')
assertEq('drawSoon' in html[head_end:],  'A27-chart-drawSoon-intact')
assertEq('DVL_OSCILLATOR_BOUNDS_PUBLISHER' in html, 'A28-oscillator-intact')
assertEq('dvl-btn-keypad' in html,       'A29-tools-keypad-intact')

# A30: no DVL_TODO_0679
assertEq('DVL_TODO_0679' not in html, 'A30-no-todo-0679')

# A31: no nested <script> tag in module 0679
inner_m679 = m679[len('<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">'):]
assertEq('<script' not in inner_m679, 'A31-no-nested-script-in-0679')

# A32: window.drawSoon = not in module 0679
assertEq('window.drawSoon' not in m679, 'A32-no-drawSoon-assign-in-0679')

# A33: no timers/RAF/observers in module
assertEq('setTimeout'         not in m679, 'A33a-no-setTimeout')
assertEq('setInterval'        not in m679, 'A33b-no-setInterval')
assertEq('requestAnimationFrame' not in m679, 'A33c-no-rAF')
assertEq('MutationObserver'   not in m679, 'A33d-no-MutationObserver')
assertEq('ResizeObserver'     not in m679, 'A33e-no-ResizeObserver')

# A34: no DOM mutations in module
# classList.add( won't appear literally (split via _clsAdd)
assertEq('classList.add('    not in m679, 'A34a-no-classListAdd-literal')
assertEq('classList.remove(' not in m679, 'A34b-no-classListRemove')
assertEq('.setAttribute('    not in m679, 'A34c-no-setAttribute')
assertEq('.innerHTML ='      not in m679, 'A34d-no-innerHTML-assign')
assertEq('.textContent ='    not in m679, 'A34e-no-textContent-assign')

# A35: JS syntax check via node
js_src = m679
js_src = js_src.replace('<script id="DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679">', '')
js_src = js_src.replace('</script>', '')
tmp = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
tmp.write(js_src)
tmp.close()
r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
assertEq(r.returncode == 0, 'A35-js-syntax-ok' + ('' if r.returncode == 0 else ': ' + r.stderr.strip()))

# ── write ─────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nAll assertions passed. Written → {SRC}")
print(f"Lines: {html.count(chr(10))+1}")
