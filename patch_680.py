#!/usr/bin/env python3
"""patch_680.py — implements Beta 0.680: Release Candidate Gate."""
import sys, shutil, os, subprocess, tempfile

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-38.before_0680_release_candidate_gate.html"

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

# ── Step 1: version bump → 0.680 ─────────────────────────────────────────────

html = rep(html,
    '<title>DVL Binance Live — Beta 0.679</title>',
    '<title>DVL Binance Live — Beta 0.680</title>',
    'title-bump')

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.679";',
    'const DVL_APP_VERSION = "Beta 0.680";',
    'version-const-bump')

html = rep(html,
    '>BETA 0.679</div>',
    '>BETA 0.680</div>',
    'badge-bump')

# ── Step 2: changelog ─────────────────────────────────────────────────────────

old_cl = '  { version: DVL_APP_VERSION, note: "Beta 0.679 — Optimized baseline freeze: froze the post-cleanup stable base after 0.678 verified readyForOptimizedBaselineFreeze." },'
new_cl = (
    '  { version: DVL_APP_VERSION, note: "Beta 0.680 — Release candidate gate: certified the optimized baseline as stable and ready for new feature work." },\n'
    '  { version: "Beta 0.679", note: "Beta 0.679 — Optimized baseline freeze: froze the post-cleanup stable base after 0.678 verified readyForOptimizedBaselineFreeze." },'
)
html = rep(html, old_cl, new_cl, 'changelog-update')

# ── Step 3: insert DVL_RELEASE_CANDIDATE_GATE_CSS_0680 ───────────────────────

CSS_ANCHOR = '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">'

CSS_0680 = '''\n\n<style id="DVL_RELEASE_CANDIDATE_GATE_CSS_0680">
/*
  DVL Beta 0.680 — Release candidate gate.
  Certified the optimized post-cleanup baseline as stable and ready for new feature work.
  No selectors, no properties, no visual change.
*/
</style>'''

html = rep(html, CSS_ANCHOR, CSS_0680 + CSS_ANCHOR, 'insert-css-0680')

# ── Step 4: insert DVL_RELEASE_CANDIDATE_GATE_MODULE_0680 ────────────────────

MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0680 = '''

<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _p            = "get" + "Migrated";
var _shimScanTxt  = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";
var _clsContains  = "classList" + ".contains('";
var _clsAdd       = "classList" + ".add('";

var NEXT_ALLOWED_WORK = [
  "Paper Trading refinements",
  "Broker Connector read-only",
  "Real Mode architecture",
  "Bybit integration foundation",
  "Binance/MEXC connector preparation",
  "New indicators/features"
];

var RETIRED_IDS = [
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674"
];

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

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
  var versionOk = version === "Beta 0.680";
  if (!versionOk) blockers.push("app version mismatch: " + version);

  // 2. DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679 present
  var obfPresent = _cntId(scriptEls, "DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679") === 1;
  if (!obfPresent) blockers.push("DVL_OPTIMIZED_BASELINE_FREEZE_MODULE_0679 not found");

  // 3-4. Optimized baseline freeze audit
  var optimizedBaselinePass         = false;
  var optimizedBaselineRC           = false;
  try {
    if (typeof window.DVL_OPTIMIZED_BASELINE_FREEZE !== "undefined") {
      var obf = window.DVL_OPTIMIZED_BASELINE_FREEZE.audit();
      optimizedBaselinePass = !!(obf && obf.pass === true);
      optimizedBaselineRC   = !!(obf && obf.readyForReleaseCandidate === true);
    }
  } catch(e) { warnings.push("DVL_OPTIMIZED_BASELINE_FREEZE err: " + e.message); }
  if (!optimizedBaselinePass) blockers.push("DVL_OPTIMIZED_BASELINE_FREEZE.audit().pass not true");
  if (!optimizedBaselineRC)   blockers.push("DVL_OPTIMIZED_BASELINE_FREEZE.audit().readyForReleaseCandidate not true");

  // 5. DVL_SAFE_HISTORICAL_AUDIT_CLEANUP
  var safeCleanupPass = false;
  try {
    if (typeof window.DVL_SAFE_HISTORICAL_AUDIT_CLEANUP !== "undefined") {
      var r1 = window.DVL_SAFE_HISTORICAL_AUDIT_CLEANUP.audit();
      safeCleanupPass = !!(r1 && r1.pass === true);
    }
  } catch(e) { warnings.push("DVL_SAFE_HISTORICAL_AUDIT_CLEANUP err: " + e.message); }
  if (!safeCleanupPass) warnings.push("DVL_SAFE_HISTORICAL_AUDIT_CLEANUP.audit() not passing");

  // 6. DVL_POST_CLEANUP_INVENTORY
  var postInventoryPass = false;
  try {
    if (typeof window.DVL_POST_CLEANUP_INVENTORY !== "undefined") {
      var r2 = window.DVL_POST_CLEANUP_INVENTORY.audit();
      postInventoryPass = !!(r2 && r2.pass === true);
    }
  } catch(e) { warnings.push("DVL_POST_CLEANUP_INVENTORY err: " + e.message); }
  if (!postInventoryPass) warnings.push("DVL_POST_CLEANUP_INVENTORY.audit() not passing");

  // 7. DVL_AUDIT_CHAIN_RECONCILIATION
  var auditChainPass = false;
  try {
    if (typeof window.DVL_AUDIT_CHAIN_RECONCILIATION !== "undefined") {
      var r3 = window.DVL_AUDIT_CHAIN_RECONCILIATION.audit();
      auditChainPass = !!(r3 && r3.pass === true);
    }
  } catch(e) { warnings.push("DVL_AUDIT_CHAIN_RECONCILIATION err: " + e.message); }
  if (!auditChainPass) warnings.push("DVL_AUDIT_CHAIN_RECONCILIATION.audit() not passing");

  // 8. DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT
  var shimRemovalPass = false;
  try {
    if (typeof window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT !== "undefined") {
      var r4 = window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT.audit();
      shimRemovalPass = !!(r4 && r4.pass === true);
    }
  } catch(e) { warnings.push("DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT err: " + e.message); }
  if (!shimRemovalPass) warnings.push("DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT.audit() not passing");

  // 9. DVL_BASELINE_FREEZE
  var baselinePass = false;
  try {
    if (typeof window.DVL_BASELINE_FREEZE !== "undefined") {
      var r5 = window.DVL_BASELINE_FREEZE.audit();
      baselinePass = !!(r5 && r5.pass === true);
    }
  } catch(e) { warnings.push("DVL_BASELINE_FREEZE err: " + e.message); }
  if (!baselinePass) warnings.push("DVL_BASELINE_FREEZE.audit() not passing");

  var activeAuditChainPass = safeCleanupPass && postInventoryPass && auditChainPass && shimRemovalPass && baselinePass;

  // 10. Layout stable (baseline freeze audit running)
  var layoutStable = (
    typeof window.DVL_BASELINE_FREEZE !== "undefined" &&
    typeof window.DVL_BASELINE_FREEZE.audit === "function" &&
    baselinePass
  );

  // 11. Final locks 0659-0662 present exactly 1x
  var missingLocks = [];
  for (var fl = 0; fl < FINAL_LOCK_CSS.length; fl++) {
    if (_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if (!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // 12. Retired 0673/0674 still absent
  var stillPresent = [];
  for (var r = 0; r < RETIRED_IDS.length; r++) {
    var rid = RETIRED_IDS[r];
    if (_cntId(scriptEls, rid) > 0 || _cntId(styleEls, rid) > 0) stillPresent.push(rid);
  }
  var retiredAbsent = stillPresent.length === 0;
  if (!retiredAbsent) blockers.push("retired modules still present: " + stillPresent.join(", "));

  // 13-17. Button System preserved
  var btnObj       = window.DVL_BUTTON_SYSTEM;
  var btnPresent   = typeof btnObj !== "undefined";
  var btnAuditFn   = btnPresent && typeof btnObj.audit    === "function";
  var btnRefreshFn = btnPresent && typeof btnObj.refresh  === "function";
  var btnListByFn  = btnPresent && typeof btnObj.listByRole === "function";
  var btnAuditObj  = false;
  try { if (btnAuditFn) { var ba = btnObj.audit(); btnAuditObj = typeof ba === "object" && ba !== null; } } catch(e) {}
  var btnClean = btnPresent && typeof btnObj[_p + "FooterButtons"] === "undefined";
  var buttonSystemClean = btnPresent && btnAuditFn && btnRefreshFn && btnListByFn && btnAuditObj && btnClean;
  if (!btnPresent)              blockers.push("window.DVL_BUTTON_SYSTEM missing");
  if (btnPresent && !btnClean)  blockers.push("DVL_BUTTON_SYSTEM still exposes shim fn");

  // 18-19. Button System source scan
  var _btnBlockFound  = false;
  var _migratedGone   = true;
  var _tokenGone      = true;
  var _bs_marker = "// ===== DVL_BUTTON_SYSTEM_MODULE_" + "0655 =====";
  var _allScripts = document.querySelectorAll('script');
  for (var s = 0; s < _allScripts.length; s++) {
    var _txt = _allScripts[s].textContent;
    if (_txt.indexOf(_bs_marker) > -1) {
      _btnBlockFound = true;
      if (_txt.indexOf(_shimScanTxt)   > -1) _migratedGone = false;
      if (_txt.indexOf(_migratedToken) > -1) _tokenGone    = false;
      break;
    }
  }
  if (!_btnBlockFound)  blockers.push("DVL_BUTTON_SYSTEM_MODULE_0655 block not found");
  if (!_migratedGone)   blockers.push("shim fn text still in Button System block");
  if (!_tokenGone)      blockers.push("migration token still in Button System block");

  // 20. data-dvl-button
  var dataDvlButtonOk = document.querySelectorAll('[data-dvl-button]').length > 0;
  if (!dataDvlButtonOk) warnings.push("data-dvl-button not found in DOM");

  // 21. dvl-btn-* functional classes
  var dvlBtnOk = !!document.querySelector('.dvl-btn-footer, .dvl-btn-header, .dvl-btn-keypad');
  if (!dvlBtnOk) warnings.push("dvl-btn-* classes not found");

  // 22-27. Key system presence (read-only)
  var buySellOk = !!document.getElementById('dvlBuyBtn') && !!document.getElementById('dvlSellBtn');
  var paperProtected = typeof window.DVL_PAPER_LAYER_ANCHOR !== "undefined";
  var tpSlOk    = !!document.querySelector('.tradeDrawer, [data-trade-drawer], #tradeDrawer');
  var chartProtected = !!document.querySelector('canvas') || typeof window.DVL_RUNTIME_INTEGRATION_AUDIT !== "undefined";
  var oscOk     = typeof window.DVL_OSCILLATOR_BOUNDS_PUBLISHER !== "undefined";
  var toolsOk   = typeof window.DVL_FEATURE_GATE_AUDIT !== "undefined";

  if (!buySellOk)       warnings.push("Buy/Sell buttons not found");
  if (!tpSlOk)          warnings.push("tradeDrawer not found");
  if (!paperProtected)  warnings.push("DVL_PAPER_LAYER_ANCHOR not found");
  if (!chartProtected)  warnings.push("canvas/chart not found");
  if (!oscOk)           warnings.push("DVL_OSCILLATOR_BOUNDS_PUBLISHER not found");
  if (!toolsOk)         warnings.push("DVL_FEATURE_GATE_AUDIT not found");

  var pass = (
    versionOk &&
    obfPresent &&
    optimizedBaselinePass &&
    optimizedBaselineRC &&
    finalLocksPresent &&
    retiredAbsent &&
    buttonSystemClean &&
    _btnBlockFound &&
    _migratedGone &&
    _tokenGone
  );

  var readyForFeatureWork = pass;
  var releaseCandidate    = pass;

  _lastAudit = {
    version:              version,
    pass:                 pass,
    readyForFeatureWork:  readyForFeatureWork,
    releaseCandidate:     releaseCandidate,
    blockers:             blockers,
    warnings:             warnings,
    optimizedBaselinePass: optimizedBaselinePass,
    activeAuditChainPass: activeAuditChainPass,
    layoutStable:         layoutStable,
    paperProtected:       paperProtected,
    chartProtected:       chartProtected,
    buttonSystemClean:    buttonSystemClean,
    nextAllowedWork:      NEXT_ALLOWED_WORK
  };
  return _lastAudit;
}

function getLastAudit() { return _lastAudit; }
function run() { _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_RELEASE_CANDIDATE_GATE = {
  VERSION:      "0.680",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>'''

html = rep(html, MOD_ANCHOR, MOD_0680 + '\n\n' + MOD_ANCHOR.lstrip('\n'), 'insert-module-0680')

# ── Assertions ────────────────────────────────────────────────────────────────
print("\n— Assertions —")

# A1-A3: version
assertEq('<title>DVL Binance Live — Beta 0.680</title>' in html, 'A1-title-0680')
assertEq('"Beta 0.680"' in html,                                  'A2-version-const-0680')
assertEq('>BETA 0.680</div>' in html,                             'A3-badge-0680')

# A4-A5: changelog
assertEq('"Beta 0.680 — Release candidate gate:' in html,         'A4-changelog-0680')
assertEq('"Beta 0.679", note: "Beta 0.679 —' in html,             'A5-changelog-0679-preserved')

# A6-A7: new CSS and module once
assertEq(html.count('<style id="DVL_RELEASE_CANDIDATE_GATE_CSS_0680">') == 1,    'A6-css-0680-once')
assertEq(html.count('<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">') == 1, 'A7-module-0680-once')

# Extract module 0680 source
m680_start = html.index('<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">')
m680_end   = html.index('</script>', m680_start) + len('</script>')
m680       = html[m680_start:m680_end]

# A8: VERSION string
assertEq('VERSION:      "0.680"' in m680 or 'VERSION: "0.680"' in m680, 'A8-version-0680-in-module')

# A9: functions exposed
assertEq('audit:' in m680,        'A9a-audit-exposed')
assertEq('run:' in m680,          'A9b-run-exposed')
assertEq('getLastAudit:' in m680, 'A9c-getLastAudit-exposed')

# A10-A12: pass / readyForFeatureWork / releaseCandidate in module code
assertEq('pass' in m680,                  'A10-pass-in-module')
assertEq('readyForFeatureWork' in m680,   'A11-readyForFeatureWork-in-module')
assertEq('releaseCandidate' in m680,      'A12-releaseCandidate-in-module')

# A13-A14: optimized baseline freeze references
assertEq('DVL_OPTIMIZED_BASELINE_FREEZE' in m680,       'A13-obf-referenced')
assertEq('readyForReleaseCandidate' in m680,             'A14-readyForReleaseCandidate-checked')

# A15-A19: audit chain references
assertEq('DVL_SAFE_HISTORICAL_AUDIT_CLEANUP' in m680,   'A15-chain-safeCleanup')
assertEq('DVL_POST_CLEANUP_INVENTORY' in m680,           'A16-chain-postInventory')
assertEq('DVL_AUDIT_CHAIN_RECONCILIATION' in m680,       'A17-chain-auditChain')
assertEq('DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT' in m680, 'A18-chain-shimRemoval')
assertEq('DVL_BASELINE_FREEZE' in m680,                  'A19-chain-baselineFreeze')

# A20: final locks in HTML 1x each
assertEq(html.count('<style id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659">') == 1,       'A20a-lock0659-1x')
assertEq(html.count('<style id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660">') == 1,     'A20b-lock0660-1x')
assertEq(html.count('<style id="DVL_CHROME_FINAL_LOCK_CSS_0661">') == 1,            'A20c-lock0661-1x')
assertEq(html.count('<style id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662">') == 1, 'A20d-lock0662-1x')

# A21: retired still absent
assertEq('<script id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673">' not in html, 'A21a-retired-mod-0673-absent')
assertEq('<style id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673">' not in html,           'A21b-retired-css-0673-absent')
assertEq('<script id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674">' not in html,           'A21c-retired-mod-0674-absent')
assertEq('<style id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674">' not in html,               'A21d-retired-css-0674-absent')

# A22: DVL_BUTTON_SYSTEM_MODULE_0655 marker present after </head>
head_end = html.index('</head>')
assertEq('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====' in html[head_end:], 'A22-btn-module-0655-present')

# A23: DVL_BUTTON_SYSTEM_MODULE_0680 NOT present
assertEq('DVL_BUTTON_SYSTEM_MODULE_0680' not in html, 'A23-no-btn-module-0680')

# A24-A25: getMigrated / dvl-btn-migrated- absent from btn block
bsm_start  = html.index('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====', head_end)
bsm_export = html.index('window.DVL_BUTTON_SYSTEM = {', bsm_start)
bsm_block  = html[bsm_start:bsm_export]
assertEq('getMigrated' not in bsm_block,       'A24-no-getMigrated-in-btn-0655')
assertEq('dvl-btn-migrated-' not in bsm_block, 'A25-no-migratedToken-in-btn-0655')

# A26-A31: key system identifiers intact
assertEq('id="dvlBuyBtn"' in html and 'id="dvlSellBtn"' in html, 'A26-buySell-intact')
assertEq('startOrder' in html,            'A27-startOrder-intact')
assertEq('startOrder("buy")' in html,     'A28-paperOrder-intact')
assertEq('drawSoon' in html[head_end:],   'A29-chart-drawSoon-intact')
assertEq('DVL_OSCILLATOR_BOUNDS_PUBLISHER' in html, 'A30-oscillator-intact')
assertEq('dvl-btn-keypad' in html,        'A31-tools-keypad-intact')

# A32: no DVL_TODO_0680
assertEq('DVL_TODO_0680' not in html, 'A32-no-todo-0680')

# A33: no nested <script> in module
inner_m680 = m680[len('<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">'):]
assertEq('<script' not in inner_m680, 'A33-no-nested-script')

# A34: no window.drawSoon = in module
assertEq('window.drawSoon' not in m680, 'A34-no-drawSoon-in-module')

# A35: no timers/RAF/observers
assertEq('setTimeout'            not in m680, 'A35a-no-setTimeout')
assertEq('setInterval'           not in m680, 'A35b-no-setInterval')
assertEq('requestAnimationFrame' not in m680, 'A35c-no-rAF')
assertEq('MutationObserver'      not in m680, 'A35d-no-MutationObserver')
assertEq('ResizeObserver'        not in m680, 'A35e-no-ResizeObserver')

# A36: no DOM mutations
assertEq('classList.add('    not in m680, 'A36a-no-classListAdd-literal')
assertEq('classList.remove(' not in m680, 'A36b-no-classListRemove')
assertEq('.setAttribute('    not in m680, 'A36c-no-setAttribute')
assertEq('.innerHTML ='      not in m680, 'A36d-no-innerHTML-assign')
assertEq('.textContent ='    not in m680, 'A36e-no-textContent-assign')

# A37: JS syntax check
js_src = m680
js_src = js_src.replace('<script id="DVL_RELEASE_CANDIDATE_GATE_MODULE_0680">', '')
js_src = js_src.replace('</script>', '')
tmp = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
tmp.write(js_src)
tmp.close()
r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
assertEq(r.returncode == 0, 'A37-js-syntax-ok' + ('' if r.returncode == 0 else ': ' + r.stderr.strip()))

# nextAllowedWork in module
assertEq('nextAllowedWork' in m680,             'EXTRA-nextAllowedWork-in-module')
assertEq('Paper Trading refinements' in m680,   'EXTRA-nextWork-paper')
assertEq('Real Mode architecture' in m680,      'EXTRA-nextWork-realMode')
assertEq('Bybit integration foundation' in m680,'EXTRA-nextWork-bybit')

# ── write ─────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nAll assertions passed. Written → {SRC}")
print(f"Lines: {html.count(chr(10))+1}")
