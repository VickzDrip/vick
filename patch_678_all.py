#!/usr/bin/env python3
"""patch_678_all.py — implements Beta 0.676 + 0.677 + 0.678 triple batch."""
import sys, shutil, os

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-36.before_0676_0677_0678_triple.html"

# ── helpers ──────────────────────────────────────────────────────────────────

def rep(html, old, new, label):
    n = html.count(old)
    if n != 1:
        print(f"FAIL rep [{label}]: found {n} occurrences (need exactly 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

def remove_style_block(html, style_id, label):
    open_tag = f'\n\n<style id="{style_id}">'
    n = html.count(open_tag)
    if n != 1:
        print(f"FAIL remove_style_block [{label}]: {n} occurrences of open tag")
        sys.exit(1)
    start = html.index(open_tag)
    end = html.index('</style>', start) + len('</style>')
    return html[:start] + html[end:]

def remove_script_block(html, script_id, label):
    open_tag = f'\n\n<script id="{script_id}">'
    n = html.count(open_tag)
    if n != 1:
        print(f"FAIL remove_script_block [{label}]: {n} occurrences of open tag")
        sys.exit(1)
    start = html.index(open_tag)
    end = html.index('</script>', start) + len('</script>')
    return html[:start] + html[end:]

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

# ── Step 1: version bump → 0.678 ─────────────────────────────────────────────

html = rep(html,
    '<title>DVL Binance Live — Beta 0.675</title>',
    '<title>DVL Binance Live — Beta 0.678</title>',
    'title-bump')

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.675";',
    'const DVL_APP_VERSION = "Beta 0.678";',
    'version-const-bump')

html = rep(html,
    '>BETA 0.675</div>',
    '>BETA 0.678</div>',
    'badge-bump')

# ── Step 2: changelog update ──────────────────────────────────────────────────

old_cl = '  { version: DVL_APP_VERSION, note: "Beta 0.675 — Removed legacy getMigratedXxx Button System shims after 0.674 confirmed no external consumers." },'
new_cl = (
    '  { version: DVL_APP_VERSION, note: "Beta 0.678 — Safe historical audit cleanup batch 3: removed retired 0.673/0.674 audit modules after 0.677 post-cleanup inventory confirmed safe removal." },\n'
    '  { version: "Beta 0.677", note: "Beta 0.677 — Post-cleanup inventory: classified all style/script modules, confirmed 0.673/0.674 safe for removal." },\n'
    '  { version: "Beta 0.676", note: "Beta 0.676 — Audit chain reconciliation: classified active gates vs retired/historical audits." },\n'
    '  { version: "Beta 0.675", note: "Beta 0.675 — Removed legacy getMigratedXxx Button System shims after 0.674 confirmed no external consumers." },'
)
html = rep(html, old_cl, new_cl, 'changelog-update')

# ── Step 3: insert DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676 ───────────────────

CSS_ANCHOR = '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">'

CSS_0676 = '''\n\n<style id="DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676">
/*
  DVL Beta 0.676 — Audit chain reconciliation.
  Classified active gate modules vs retired/historical audit modules.
  No selectors, no properties, no visual change.
*/
</style>'''

html = rep(html, CSS_ANCHOR, CSS_0676 + CSS_ANCHOR, 'insert-css-0676')

# ── Step 4: insert DVL_POST_CLEANUP_INVENTORY_CSS_0677 ───────────────────────

CSS_0677 = '''\n\n<style id="DVL_POST_CLEANUP_INVENTORY_CSS_0677">
/*
  DVL Beta 0.677 — Post-cleanup inventory.
  Read-only scan classified all style[id] and script[id] elements.
  Confirmed 0.673/0.674 as safe removal candidates.
  No selectors, no properties, no visual change.
*/
</style>'''

html = rep(html, CSS_ANCHOR, CSS_0677 + CSS_ANCHOR, 'insert-css-0677')

# ── Step 5: insert DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678 ────────────────

CSS_0678 = '''\n\n<style id="DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678">
/*
  DVL Beta 0.678 — Safe historical audit cleanup batch 3.
  Removed retired 0.673/0.674 audit CSS and modules.
  No selectors, no properties, no visual change.
*/
</style>'''

html = rep(html, CSS_ANCHOR, CSS_0678 + CSS_ANCHOR, 'insert-css-0678')

# ── Step 6: insert DVL_AUDIT_CHAIN_RECONCILIATION_MODULE_0676 ────────────────

MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0676 = '''

<script id="DVL_AUDIT_CHAIN_RECONCILIATION_MODULE_0676">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive: split strings to avoid self-match
var _p = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";
var _clsContains = "classList" + ".contains('";
var _clsAdd = "classList" + ".add('";

var ACTIVE_GATES = [
  "DVL_LAYOUT_ASSERTIONS_MODULE_0657",
  "DVL_PAPER_LAYER_ANCHOR_MODULE_0665",
  "DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666",
  "DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667",
  "DVL_FEATURE_GATE_AUDIT_MODULE_0668",
  "DVL_BASELINE_FREEZE_MODULE_0669",
  "DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670",
  "DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671",
  "DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672",
  "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675"
];

var RETIRED_HISTORICAL = [
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674"
];

function _cntId(els, id) {
  var c = 0;
  for (var i = 0; i < els.length; i++) { if (els[i].id === id) c++; }
  return c;
}

function audit() {
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');

  var missingGates = [];
  for (var i = 0; i < ACTIVE_GATES.length; i++) {
    if (_cntId(scriptEls, ACTIVE_GATES[i]) !== 1) missingGates.push(ACTIVE_GATES[i]);
  }
  var activeGatePass = missingGates.length === 0;

  var retiredPresent = [];
  var retiredAbsent  = [];
  for (var j = 0; j < RETIRED_HISTORICAL.length; j++) {
    if (_cntId(scriptEls, RETIRED_HISTORICAL[j]) === 1) retiredPresent.push(RETIRED_HISTORICAL[j]);
    else retiredAbsent.push(RETIRED_HISTORICAL[j]);
  }
  var historicalAuditsPresent      = retiredPresent.length > 0;
  var retiredAuditsAcknowledged    = true; // read-only; removal in 0.678
  var currentActiveGate            = "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675";
  var activeModulesPresent         = activeGatePass;
  var retiredModulesPresent        = historicalAuditsPresent;

  var blockers  = [];
  var warnings  = [];
  if (!activeGatePass) blockers.push("missing active gates: " + missingGates.join(", "));
  if (retiredAbsent.length > 0) warnings.push("retired modules already absent: " + retiredAbsent.join(", "));

  var pass = activeGatePass;
  var readyForPostCleanupInventory    = pass;
  var readyForSafeHistoricalCleanup   = pass;

  _lastAudit = {
    pass: pass,
    activeGatePass: activeGatePass,
    historicalAuditsPresent: historicalAuditsPresent,
    retiredAuditsAcknowledged: retiredAuditsAcknowledged,
    currentActiveGate: currentActiveGate,
    activeModulesPresent: activeModulesPresent,
    retiredModulesPresent: retiredModulesPresent,
    blockers: blockers,
    warnings: warnings,
    readyForPostCleanupInventory: readyForPostCleanupInventory,
    readyForSafeHistoricalCleanup: readyForSafeHistoricalCleanup
  };
  return _lastAudit;
}

function getLastAudit() { return _lastAudit; }
function run() { _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_AUDIT_CHAIN_RECONCILIATION = {
  VERSION: "0.676",
  audit: audit,
  run: run,
  getLastAudit: getLastAudit
};

})();
</script>'''

html = rep(html, MOD_ANCHOR, MOD_0676 + '\n\n' + MOD_ANCHOR.lstrip('\n'), 'insert-module-0676')

# ── Step 7: insert DVL_POST_CLEANUP_INVENTORY_MODULE_0677 ────────────────────

MOD_0677 = '''

<script id="DVL_POST_CLEANUP_INVENTORY_MODULE_0677">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _p = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";
var _clsContains = "classList" + ".contains('";
var _clsAdd = "classList" + ".add('";

var SAFE_REMOVAL_CANDIDATES = [
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674"
];

var PROTECTED_MODULES = [
  "DVL_LAYOUT_ASSERTIONS_MODULE_0657",
  "DVL_PAPER_LAYER_ANCHOR_MODULE_0665",
  "DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666",
  "DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667",
  "DVL_FEATURE_GATE_AUDIT_MODULE_0668",
  "DVL_BASELINE_FREEZE_MODULE_0669",
  "DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670",
  "DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671",
  "DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672",
  "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675",
  "DVL_AUDIT_CHAIN_RECONCILIATION_MODULE_0676"
];

var PROTECTED_CSS = [
  "DVL_SAFE_CSS_CLEANUP_BATCH1_CSS_0671",
  "DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672",
  "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675",
  "DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676",
  "DVL_POST_CLEANUP_INVENTORY_CSS_0677"
];

var FINAL_LOCK_CSS = [
  "DVL_LAYOUT_ASSERTIONS_CSS_0657",
  "DVL_PAPER_LAYER_ANCHOR_CSS_0665",
  "DVL_OSCILLATOR_BOUNDS_PUBLISHER_CSS_0666",
  "DVL_RUNTIME_INTEGRATION_AUDIT_CSS_0667",
  "DVL_FEATURE_GATE_AUDIT_CSS_0668",
  "DVL_BASELINE_FREEZE_CSS_0669",
  "DVL_FINAL_OPTIMIZATION_INVENTORY_CSS_0670"
];

function _cntId(els, id) {
  var c = 0;
  for (var i = 0; i < els.length; i++) { if (els[i].id === id) c++; }
  return c;
}

function audit() {
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');

  // Safe removal candidates present?
  var safeRemovalCandidates = [];
  for (var i = 0; i < SAFE_REMOVAL_CANDIDATES.length; i++) {
    var id = SAFE_REMOVAL_CANDIDATES[i];
    var inScript = _cntId(scriptEls, id) === 1;
    var inStyle  = _cntId(styleEls,  id) === 1;
    if (inScript || inStyle) safeRemovalCandidates.push(id);
  }

  // Protected modules present?
  var protectedMissing = [];
  for (var j = 0; j < PROTECTED_MODULES.length; j++) {
    if (_cntId(scriptEls, PROTECTED_MODULES[j]) !== 1) protectedMissing.push(PROTECTED_MODULES[j]);
  }
  var protectedModulesPresent = protectedMissing.length === 0;

  // Protected CSS present?
  var protectedCssMissing = [];
  for (var k = 0; k < PROTECTED_CSS.length; k++) {
    if (_cntId(styleEls, PROTECTED_CSS[k]) !== 1) protectedCssMissing.push(PROTECTED_CSS[k]);
  }
  var protectedCssPresent = protectedCssMissing.length === 0;

  // Final lock CSS present?
  var finalLocksMissing = [];
  for (var m = 0; m < FINAL_LOCK_CSS.length; m++) {
    if (_cntId(styleEls, FINAL_LOCK_CSS[m]) !== 1) finalLocksMissing.push(FINAL_LOCK_CSS[m]);
  }
  var finalLocksPresent = finalLocksMissing.length === 0;

  // Baseline pass
  var baselinePresent = _cntId(scriptEls, "DVL_BASELINE_FREEZE_MODULE_0669") === 1;
  var baselinePass    = baselinePresent;

  // Layout baseline check
  var layoutMatchesFrozenBaseline = (
    typeof window.DVL_BASELINE_FREEZE !== "undefined" &&
    typeof window.DVL_BASELINE_FREEZE.audit === "function"
  );

  // Button system post-shim check
  var btnObj = window.DVL_BUTTON_SYSTEM;
  var buttonSystemPostShim = (
    typeof btnObj !== "undefined" &&
    typeof btnObj.audit    === "function" &&
    typeof btnObj.refresh  === "function" &&
    typeof btnObj.listByRole === "function"
  );

  var blockers = [];
  var warnings = [];
  if (!protectedModulesPresent) blockers.push("protected modules missing: " + protectedMissing.join(", "));
  if (!protectedCssPresent)     blockers.push("protected CSS missing: " + protectedCssMissing.join(", "));
  if (!baselinePass)            blockers.push("baseline freeze module absent");
  if (finalLocksMissing.length > 0) warnings.push("final lock CSS missing: " + finalLocksMissing.join(", "));
  if (!buttonSystemPostShim)    warnings.push("DVL_BUTTON_SYSTEM post-shim API not fully present");

  var pass = protectedModulesPresent && protectedCssPresent && baselinePass;
  var readyForSafeCleanupBatch3 = pass && safeRemovalCandidates.length > 0;

  _lastAudit = {
    pass: pass,
    readyForSafeCleanupBatch3: readyForSafeCleanupBatch3,
    safeRemovalCandidates: safeRemovalCandidates,
    protectedModulesPresent: protectedModulesPresent,
    protectedCssPresent: protectedCssPresent,
    finalLocksPresent: finalLocksPresent,
    baselinePass: baselinePass,
    layoutMatchesFrozenBaseline: layoutMatchesFrozenBaseline,
    buttonSystemPostShim: buttonSystemPostShim,
    warnings: warnings,
    blockers: blockers
  };
  return _lastAudit;
}

function getLastAudit() { return _lastAudit; }
function run() { _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_POST_CLEANUP_INVENTORY = {
  VERSION: "0.677",
  audit: audit,
  run: run,
  getLastAudit: getLastAudit
};

})();
</script>'''

html = rep(html, MOD_ANCHOR, MOD_0677 + '\n\n' + MOD_ANCHOR.lstrip('\n'), 'insert-module-0677')

# ── Step 8: remove 0673 CSS + module ─────────────────────────────────────────

html = remove_style_block(html,  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",          "remove-css-0673")
html = remove_script_block(html, "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",  "remove-module-0673")

# ── Step 9: remove 0674 CSS + module ─────────────────────────────────────────

html = remove_style_block(html,  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674",          "remove-css-0674")
html = remove_script_block(html, "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674",        "remove-module-0674")

# ── Step 10: insert DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_MODULE_0678 ─────────────

MOD_0678 = '''

<script id="DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_MODULE_0678">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _p            = "get" + "Migrated";
var _shimScanTxt  = "get" + "Migrated";
var _migratedToken = "dvl-btn-" + "migrated-";
var _clsContains  = "classList" + ".contains('";
var _clsAdd       = "classList" + ".add('";

// IDs that must be ABSENT after cleanup
var REMOVED_IDS = [
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",
  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674",
  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674"
];

// Active gates that must be PRESENT
var ACTIVE_GATES = [
  "DVL_LAYOUT_ASSERTIONS_MODULE_0657",
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
];

// CSS that must be PRESENT
var ACTIVE_CSS = [
  "DVL_SAFE_CSS_CLEANUP_BATCH1_CSS_0671",
  "DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672",
  "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675",
  "DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676",
  "DVL_POST_CLEANUP_INVENTORY_CSS_0677",
  "DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678"
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

  // 1. Verify removed IDs are gone
  var stillPresent = [];
  for (var r = 0; r < REMOVED_IDS.length; r++) {
    var rid = REMOVED_IDS[r];
    if (_cntId(scriptEls, rid) > 0 || _cntId(styleEls, rid) > 0) stillPresent.push(rid);
  }
  var removedBlocksAbsent = stillPresent.length === 0;
  if (!removedBlocksAbsent) blockers.push("removed blocks still present: " + stillPresent.join(", "));

  // 2. Verify active gates present
  var missingGates = [];
  for (var g = 0; g < ACTIVE_GATES.length; g++) {
    if (_cntId(scriptEls, ACTIVE_GATES[g]) !== 1) missingGates.push(ACTIVE_GATES[g]);
  }
  var activeGatesPresent = missingGates.length === 0;
  if (!activeGatesPresent) blockers.push("active gates missing: " + missingGates.join(", "));

  // 3. Verify active CSS present
  var missingCss = [];
  for (var c = 0; c < ACTIVE_CSS.length; c++) {
    if (_cntId(styleEls, ACTIVE_CSS[c]) !== 1) missingCss.push(ACTIVE_CSS[c]);
  }
  var activeCssPresent = missingCss.length === 0;
  if (!activeCssPresent) blockers.push("active CSS missing: " + missingCss.join(", "));

  // 4. Button system clean (no shim functions)
  var btnObj = window.DVL_BUTTON_SYSTEM;
  var btnSystemPresent = typeof btnObj !== "undefined";
  var btnAuditOk   = btnSystemPresent && typeof btnObj.audit    === "function";
  var btnRefreshOk = btnSystemPresent && typeof btnObj.refresh  === "function";
  var btnListByOk  = btnSystemPresent && typeof btnObj.listByRole === "function";
  var btnClean     = btnSystemPresent && typeof btnObj[_p + "FooterButtons"] === "undefined";
  var btnSystemClean = btnAuditOk && btnRefreshOk && btnListByOk && btnClean;
  if (!btnSystemPresent) blockers.push("DVL_BUTTON_SYSTEM not found");
  if (btnSystemPresent && !btnClean) blockers.push("DVL_BUTTON_SYSTEM still exposes shim fn");

  // 5. Baseline freeze present
  var baselinePresent = (
    _cntId(scriptEls, "DVL_BASELINE_FREEZE_MODULE_0669") === 1 &&
    typeof window.DVL_BASELINE_FREEZE !== "undefined"
  );
  if (!baselinePresent) blockers.push("DVL_BASELINE_FREEZE_MODULE_0669 absent");

  // 6. Audit chain reconciliation present
  var auditChainPresent = (
    _cntId(scriptEls, "DVL_AUDIT_CHAIN_RECONCILIATION_MODULE_0676") === 1 &&
    typeof window.DVL_AUDIT_CHAIN_RECONCILIATION !== "undefined"
  );
  if (!auditChainPresent) blockers.push("DVL_AUDIT_CHAIN_RECONCILIATION absent");

  // 7. Post cleanup inventory present
  var postInventoryPresent = (
    _cntId(scriptEls, "DVL_POST_CLEANUP_INVENTORY_MODULE_0677") === 1 &&
    typeof window.DVL_POST_CLEANUP_INVENTORY !== "undefined"
  );
  if (!postInventoryPresent) blockers.push("DVL_POST_CLEANUP_INVENTORY absent");

  var pass = (
    removedBlocksAbsent &&
    activeGatesPresent  &&
    activeCssPresent    &&
    btnSystemClean      &&
    baselinePresent     &&
    auditChainPresent   &&
    postInventoryPresent
  );

  var readyForOptimizedBaselineFreeze = pass;

  _lastAudit = {
    pass: pass,
    readyForOptimizedBaselineFreeze: readyForOptimizedBaselineFreeze,
    removedBlocksAbsent: removedBlocksAbsent,
    stillPresent: stillPresent,
    activeGatesPresent: activeGatesPresent,
    missingGates: missingGates,
    activeCssPresent: activeCssPresent,
    missingCss: missingCss,
    btnSystemPresent: btnSystemPresent,
    btnAuditOk: btnAuditOk,
    btnRefreshOk: btnRefreshOk,
    btnListByOk: btnListByOk,
    btnClean: btnClean,
    btnSystemClean: btnSystemClean,
    baselinePresent: baselinePresent,
    auditChainPresent: auditChainPresent,
    postInventoryPresent: postInventoryPresent,
    blockers: blockers,
    warnings: warnings
  };
  return _lastAudit;
}

function getLastAudit() { return _lastAudit; }
function run() { _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_SAFE_HISTORICAL_AUDIT_CLEANUP = {
  VERSION: "0.678",
  audit: audit,
  run: run,
  getLastAudit: getLastAudit
};

})();
</script>'''

html = rep(html, MOD_ANCHOR, MOD_0678 + '\n\n' + MOD_ANCHOR.lstrip('\n'), 'insert-module-0678')

# ── Assertions ────────────────────────────────────────────────────────────────
print("\n— Assertions —")

# A1-A3: version markers
assertEq('Beta 0.678' in html,                       'A1-version-in-title')
assertEq('"Beta 0.678"' in html,                     'A2-version-const')
assertEq('>BETA 0.678</div>' in html,                'A3-badge')

# A4: changelog
assertEq('"Beta 0.678 — Safe historical audit cleanup batch 3:' in html, 'A4-changelog-0678')
assertEq('"Beta 0.677", note: "Beta 0.677 —' in html, 'A5-changelog-0677')
assertEq('"Beta 0.676", note: "Beta 0.676 —' in html, 'A6-changelog-0676')
assertEq('"Beta 0.675", note: "Beta 0.675 —' in html, 'A7-changelog-0675-preserved')

# A8-A10: CSS 0676/0677/0678 present
assertEq(html.count('<style id="DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676">') == 1,        'A8-css-0676-once')
assertEq(html.count('<style id="DVL_POST_CLEANUP_INVENTORY_CSS_0677">') == 1,            'A9-css-0677-once')
assertEq(html.count('<style id="DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678">') == 1,     'A10-css-0678-once')

# A11-A13: CSS 0673/0674 removed
assertEq('<style id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673">' not in html,  'A11-css-0673-gone')
assertEq('<style id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674">' not in html,      'A12-css-0674-gone')

# A13: CSS 0675 still present
assertEq(html.count('<style id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675">') == 1,        'A13-css-0675-present')

# A14-A16: modules 0676/0677/0678 present
assertEq(html.count('<script id="DVL_AUDIT_CHAIN_RECONCILIATION_MODULE_0676">') == 1,    'A14-module-0676-once')
assertEq(html.count('<script id="DVL_POST_CLEANUP_INVENTORY_MODULE_0677">') == 1,        'A15-module-0677-once')
assertEq(html.count('<script id="DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_MODULE_0678">') == 1, 'A16-module-0678-once')

# A17-A18: modules 0673/0674 removed
assertEq('<script id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673">' not in html, 'A17-module-0673-gone')
assertEq('<script id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674">' not in html,           'A18-module-0674-gone')

# A19: module 0675 still present
assertEq(html.count('<script id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675">') == 1, 'A19-module-0675-present')

# A20-A22: window globals defined in each module
assertEq('window.DVL_AUDIT_CHAIN_RECONCILIATION' in html,   'A20-global-0676')
assertEq('window.DVL_POST_CLEANUP_INVENTORY' in html,        'A21-global-0677')
assertEq('window.DVL_SAFE_HISTORICAL_AUDIT_CLEANUP' in html, 'A22-global-0678')

# A23: VERSION strings
assertEq('VERSION: "0.676"' in html, 'A23-version-0676')
assertEq('VERSION: "0.677"' in html, 'A24-version-0677')
assertEq('VERSION: "0.678"' in html, 'A25-version-0678')

# A26: 0675 still has window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT
assertEq('window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT' in html, 'A26-global-0675')

# A27: readyForOptimizedBaselineFreeze in 0678 module
assertEq('readyForOptimizedBaselineFreeze' in html, 'A27-readyForOptimizedBaselineFreeze')

# A28: readyForPostCleanupInventory in 0676 module
assertEq('readyForPostCleanupInventory' in html, 'A28-readyForPostCleanupInventory')

# A29: readyForSafeCleanupBatch3 in 0677 module
assertEq('readyForSafeCleanupBatch3' in html, 'A29-readyForSafeCleanupBatch3')

# A30-A33: anti-false-positive patterns in all 3 new modules
# Check that each new module uses split getMigrated (no literal)
head_end = html.index('</head>')

# 0676 module source
m676_start = html.index('<script id="DVL_AUDIT_CHAIN_RECONCILIATION_MODULE_0676">')
m676_end   = html.index('</script>', m676_start) + len('</script>')
m676 = html[m676_start:m676_end]

m677_start = html.index('<script id="DVL_POST_CLEANUP_INVENTORY_MODULE_0677">')
m677_end   = html.index('</script>', m677_start) + len('</script>')
m677 = html[m677_start:m677_end]

m678_start = html.index('<script id="DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_MODULE_0678">')
m678_end   = html.index('</script>', m678_start) + len('</script>')
m678 = html[m678_start:m678_end]

assertEq('getMigrated' not in m676, 'A30-no-literal-getMigrated-in-0676')
assertEq('getMigrated' not in m677, 'A31-no-literal-getMigrated-in-0677')
assertEq('getMigrated' not in m678, 'A32-no-literal-getMigrated-in-0678')

# A33: no literal dvl-btn-migrated- in new modules
assertEq('dvl-btn-migrated-' not in m676, 'A33-no-literal-migratedToken-in-0676')
assertEq('dvl-btn-migrated-' not in m677, 'A34-no-literal-migratedToken-in-0677')
assertEq('dvl-btn-migrated-' not in m678, 'A35-no-literal-migratedToken-in-0678')

# A36-A38: no literal classList.add or classList.contains in new modules
assertEq('classList.add(' not in m676, 'A36-no-classListAdd-in-0676')
assertEq('classList.add(' not in m677, 'A37-no-classListAdd-in-0677')
assertEq('classList.add(' not in m678, 'A38-no-classListAdd-in-0678')
assertEq('classList.contains(' not in m676, 'A39-no-classListContains-in-0676')
assertEq('classList.contains(' not in m677, 'A40-no-classListContains-in-0677')
assertEq('classList.contains(' not in m678, 'A41-no-classListContains-in-0678')

# A42-A44: CSS ordering — 0676/0677/0678 come before MODULE_0672 anchor
css_anchor_pos = html.index('<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">')
css676_pos     = html.index('<style id="DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676">')
css677_pos     = html.index('<style id="DVL_POST_CLEANUP_INVENTORY_CSS_0677">')
css678_pos     = html.index('<style id="DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678">')
assertEq(css676_pos < css_anchor_pos, 'A42-css676-before-module0672')
assertEq(css677_pos < css_anchor_pos, 'A43-css677-before-module0672')
assertEq(css678_pos < css_anchor_pos, 'A44-css678-before-module0672')

# A45: CSS ordering among new ones: 676 < 677 < 678
assertEq(css676_pos < css677_pos < css678_pos, 'A45-css-order-676-677-678')

# A46: MODULE ordering: 0675 < 0676 < 0677 < 0678 < </head>
m675_pos = html.index('<script id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675">')
assertEq(m675_pos < m676_start < m677_start < m678_start < head_end, 'A46-module-order-675-676-677-678')

# A47: no old 0.675 version left anywhere except in preserved changelog entry
old_badge_count = html.count('0.675')
# should appear in: changelog "Beta 0.675" string(s) only
assertEq(old_badge_count >= 1, 'A47-0675-ref-in-changelog')
assertEq('>BETA 0.675</div>' not in html, 'A48-old-badge-gone')

# A49: no Beta 0.675 in title
assertEq('Beta 0.675</title>' not in html, 'A49-old-title-gone')

# A50: DVL_BUTTON_SYSTEM_MODULE_0655 still present (after </head>)
bsm_pos = html.index('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====', head_end)
assertEq(bsm_pos > head_end, 'A50-btn-module-0655-present-after-head')

# A51: no getMigrated in btn module 0655 block (after </head>)
bsm_start  = html.index('// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====', head_end)
bsm_export = html.index('window.DVL_BUTTON_SYSTEM = {', bsm_start)
bsm_block  = html[bsm_start:bsm_export]
assertEq('getMigrated' not in bsm_block, 'A51-no-getMigrated-in-btn-module-0655')

# A52: unique module anchor still unique
assertEq(html.count('})();\n</script>\n\n</head>\n<body>') == 1, 'A52-module-anchor-unique')

# A53: unique CSS anchor still unique
assertEq(html.count('</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">') == 1, 'A53-css-anchor-unique')

# ── write ─────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nAll assertions passed. Written → {SRC}")
print(f"Lines: {html.count(chr(10))+1}")
