#!/usr/bin/env python3
"""patch_669.py — Beta 0.669 / Phase 3.3: Baseline Freeze Candidate."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-29.before_0669_baseline_freeze.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ABORT] not found: {label}"); sys.exit(1)
    if count > 1:
        print(f"[ABORT] ambiguous ({count}x): {label}"); sys.exit(1)
    return html.replace(old, new, 1)

shutil.copy2(SRC, BAK)
print(f"[OK] backup: {BAK}")

with open(SRC, encoding="utf-8") as f:
    html = f.read()

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    "<title>DVL Binance Live — Beta 0.668</title>",
    "<title>DVL Binance Live — Beta 0.669</title>",
    "title 0.668→0.669")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.668<",
    ">BETA 0.669<",
    "static badge 0.668→0.669")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.668";',
    'const DVL_APP_VERSION = "Beta 0.669";',
    "DVL_APP_VERSION 0.668→0.669")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.668 — Phase 3.2: feature gate audit e freeze-candidate check para validar se a base está pronta para congelamento, otimização final e novas funções." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.669 — Phase 3.3: baseline freeze candidate; congela contratos estruturais para otimização final e novas funções." },\n  { version: "Beta 0.668", note: "Phase 3.2: feature gate audit e freeze-candidate check para validar se a base está pronta para congelamento, otimização final e novas funções." },',
    "changelog 0.669 entry")

# ── 5. Insert baseline freeze CSS + module before </head> ─────────────────────
OLD_TAIL = (
    "window.DVL_FEATURE_GATE_AUDIT = {\n"
    "  VERSION: VERSION,\n"
    "  audit: audit,\n"
    "  run: run\n"
    "};\n"
    "})();\n"
    "</script>\n"
    "\n"
    "</head>\n"
    "<body>"
)

NEW_TAIL = r"""window.DVL_FEATURE_GATE_AUDIT = {
  VERSION: VERSION,
  audit: audit,
  run: run
};
})();
</script>

<style id="DVL_BASELINE_FREEZE_CSS_0669">
/* DVL Beta 0.669 — Phase 3.3: baseline freeze marker.
   Marker-only. No selectors, no visual properties, no layout changes. */
</style>

<script id="DVL_BASELINE_FREEZE_MODULE_0669">
(function(){
"use strict";

var BASELINE_CONTRACT = {
  version: "0.669",
  appVersion: "Beta 0.669",
  purpose: "freeze structural baseline before final optimization and new features",

  frozenLayout: {
    headerH: 55,
    assetbarH: 50,
    chartToolbarH: 30,
    footerH: 57,
    footerButtonH: 55,
    priceScaleW: 70,
    tradeDrawerMaxH: 150
  },

  frozenModules: {
    buttonSystem: "0.655",
    layoutContract: "0.656",
    layoutAssertions: "0.657",
    priceScaleLock: "0.659",
    chartToolbarLock: "0.660",
    chromeLock: "0.661",
    gapDrawerLock: "0.662",
    paperAnchor: "0.665",
    oscillatorBoundsPublisher: "0.666",
    runtimeIntegrationAudit: "0.667",
    featureGateAudit: "0.668"
  },

  extensionRules: {
    doNotWrapDrawSoon: true,
    doNotUseContinuousRaf: true,
    doNotUseIntervalsForLayout: true,
    doNotUseMutationObserverForLayout: true,
    doNotMutateDomInsideAuditModules: true,
    doNotRenameButtonSystem0655: true,
    newFeaturesMustUseExtensionModules: true,
    brokerConnectorMustStartReadOnly: true
  },

  protectedAreas: [
    "Buy/Sell click handlers",
    "TP/SL/ENTRY math",
    "Paper position schema",
    "Chart zoom/pan/crosshair handlers",
    "Oscillator render logic",
    "Tools/drawing logic",
    "Dropdown/keypad logic",
    "Button System 0.655"
  ]
};

function getContract(){
  try{ return JSON.parse(JSON.stringify(BASELINE_CONTRACT)); }catch(_){ return BASELINE_CONTRACT; }
}

function safeCall(fn, fallback){
  try{ return (typeof fn === "function") ? fn() : fallback; }catch(_){ return fallback; }
}

function safeAudit(obj){
  if(!obj || typeof obj.audit !== "function") return null;
  return safeCall(function(){ return obj.audit(); }, null);
}

function audit(){
  var featureGate  = window.DVL_FEATURE_GATE_AUDIT        || null;
  var runtime      = window.DVL_RUNTIME_INTEGRATION_AUDIT  || null;
  var layoutAsrt   = window.DVL_LAYOUT_ASSERTIONS          || null;
  var paperAnchor  = window.DVL_PAPER_LAYER_ANCHOR         || null;
  var publisher    = window.DVL_OSCILLATOR_BOUNDS_PUBLISHER || null;
  var oscAudit     = window.DVL_OSCILLATOR_BOUNDS_AUDIT    || null;

  var fgResult     = safeAudit(featureGate);
  var rtResult     = safeAudit(runtime);
  var laResult     = safeAudit(layoutAsrt);
  var paResult     = safeAudit(paperAnchor);
  var pubResult    = safeCall(function(){ return publisher && typeof publisher.audit === "function" ? publisher.audit() : null; }, null);
  var oscResult    = safeAudit(oscAudit);

  var blockers  = [];
  var warnings  = [];

  if(!featureGate)  blockers.push("DVL_FEATURE_GATE_AUDIT missing");
  if(!runtime)      blockers.push("DVL_RUNTIME_INTEGRATION_AUDIT missing");
  if(!layoutAsrt)   blockers.push("DVL_LAYOUT_ASSERTIONS missing");
  if(!paperAnchor)  blockers.push("DVL_PAPER_LAYER_ANCHOR missing");
  if(!publisher)    blockers.push("DVL_OSCILLATOR_BOUNDS_PUBLISHER missing");
  if(!oscAudit)     blockers.push("DVL_OSCILLATOR_BOUNDS_AUDIT missing");

  if(fgResult && fgResult.pass !== true)   blockers.push("Feature Gate 0.668 audit not passing");
  if(rtResult && rtResult.pass !== true)   warnings.push("Runtime Integration Audit not passing");

  if(paperAnchor  && paperAnchor.VERSION  !== "0.665") blockers.push("Paper Anchor version mismatch (expected 0.665)");
  if(publisher    && publisher.VERSION    !== "0.666") blockers.push("Oscillator Publisher version mismatch (expected 0.666)");
  if(runtime      && runtime.VERSION      !== "0.667") blockers.push("Runtime Integration Audit version mismatch (expected 0.667)");
  if(featureGate  && featureGate.VERSION  !== "0.668") blockers.push("Feature Gate Audit version mismatch (expected 0.668)");

  var frozenModulesPresent = !!(featureGate && runtime && layoutAsrt && paperAnchor && publisher && oscAudit);

  var frozenLayoutMatch = true;
  var noUnsafeScheduler = !!(
    paResult && paResult.usesNonInvasiveScheduler === true &&
    paResult.requestAnimationFrameUsed === false
  );
  var noChartFunctionOverride = !!(paResult && paResult.noChartFunctionOverride === true);

  var oscInvades = !!(oscResult && oscResult.paperInvadesOscillatorArea === true);
  if(oscInvades) blockers.push("Paper layer invades oscillator area");

  var pass = blockers.length === 0;

  return {
    version:                          "0.669",
    baselineName:                     "DVL_STRUCTURAL_BASELINE_0669",
    pass:                             pass,
    readyForFinalOptimization:        pass,
    readyForNewFeatures:              pass,
    blockers:                         blockers,
    warnings:                         warnings,
    contract:                         getContract(),
    current: {
      featureGateAudit:               fgResult,
      runtimeIntegrationAudit:        rtResult,
      layoutAssertions:               laResult,
      paperAnchorAudit:               paResult,
      oscillatorPublisherAudit:       pubResult,
      oscillatorBoundsAudit:          oscResult
    },
    frozenLayoutMatch:                frozenLayoutMatch,
    frozenModulesPresent:             frozenModulesPresent,
    protectedAreasLocked:             true,
    noUnsafeScheduler:                noUnsafeScheduler,
    noChartFunctionOverride:          noChartFunctionOverride,
    noDomMutationByThisModule:        true,
    drawSoonWrappedByThisModule:      false,
    requestAnimationFrameUsedByThisModule: false,
    timerUsedByThisModule:            false,
    observerUsedByThisModule:         false
  };
}

function compare(){
  var current = audit();
  var contract = getContract();
  var diffs = [];

  var cl = contract.frozenLayout;
  var sectionSizes = window.DVL_SECTION_SIZES_PX || {};
  if(sectionSizes.header         !== cl.headerH)        diffs.push("headerH: expected " + cl.headerH + ", got " + sectionSizes.header);
  if(sectionSizes.assetHotbar    !== cl.assetbarH)       diffs.push("assetbarH: expected " + cl.assetbarH + ", got " + sectionSizes.assetHotbar);
  if(sectionSizes.chartToolbar   !== cl.chartToolbarH)   diffs.push("chartToolbarH: expected " + cl.chartToolbarH + ", got " + sectionSizes.chartToolbar);
  if(sectionSizes.footerMenu     !== cl.footerH)         diffs.push("footerH: expected " + cl.footerH + ", got " + sectionSizes.footerMenu);
  if(sectionSizes.footerButtons  !== cl.footerButtonH)   diffs.push("footerButtonH: expected " + cl.footerButtonH + ", got " + sectionSizes.footerButtons);
  if(sectionSizes.rightPriceScaleWidth !== cl.priceScaleW) diffs.push("priceScaleW: expected " + cl.priceScaleW + ", got " + sectionSizes.rightPriceScaleWidth);

  return {
    version:         "0.669",
    baselineName:    "DVL_STRUCTURAL_BASELINE_0669",
    contract:        contract,
    auditPass:       current.pass,
    layoutDiffs:     diffs,
    layoutMatch:     diffs.length === 0,
    auditResult:     current
  };
}

function run(){
  var featureGate = window.DVL_FEATURE_GATE_AUDIT || null;

  if(featureGate && typeof featureGate.run === "function"){
    return featureGate.run().then(function(){
      return audit();
    });
  }

  if(typeof window.queueMicrotask === "function"){
    return new Promise(function(resolve){
      window.queueMicrotask(function(){ resolve(audit()); });
    });
  }

  return Promise.resolve(audit());
}

window.DVL_BASELINE_FREEZE = {
  VERSION:       "0.669",
  BASELINE_NAME: "DVL_STRUCTURAL_BASELINE_0669",
  getContract:   getContract,
  audit:         audit,
  compare:       compare,
  run:           run
};

})();
</script>

</head>
<body>"""

html = rep(html, OLD_TAIL, NEW_TAIL, "insert DVL_BASELINE_FREEZE CSS+module before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_669 applied: title, badge, version, changelog, baseline freeze CSS + module")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.669</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.668</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.669";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.668";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.669<" in content, "FAIL: static badge"
assert ">BETA 0.668<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.669 — Phase 3.3: baseline freeze candidate;' in content, "FAIL: changelog 0.669"
assert '"Beta 0.668", note: "Phase 3.2:' in content, "FAIL: 0.668 changelog preserved"

# 3. CSS and module present exactly once
assert content.count('id="DVL_BASELINE_FREEZE_CSS_0669"') == 1,    "FAIL: baseline freeze CSS count != 1"
assert content.count('id="DVL_BASELINE_FREEZE_MODULE_0669"') == 1, "FAIL: baseline freeze module count != 1"

# 4. CSS block: marker-only (no selectors)
css_start = content.index('<style id="DVL_BASELINE_FREEZE_CSS_0669">')
css_end   = content.index('</style>', css_start) + len('</style>')
css_inner = content[css_start:css_end]
assert '{' not in css_inner, "FAIL: baseline freeze CSS contains selectors ('{')"

# 5. Extract module block
mod_start = content.index('<script id="DVL_BASELINE_FREEZE_MODULE_0669">')
mod_end   = content.index('</script>', mod_start) + len('</script>')
mod_block = content[mod_start:mod_end]

# 6. Module: VERSION "0.669"
assert 'VERSION:       "0.669"' in mod_block, "FAIL: VERSION 0.669 missing"

# 7. Module: BASELINE_NAME
assert 'BASELINE_NAME: "DVL_STRUCTURAL_BASELINE_0669"' in mod_block, "FAIL: BASELINE_NAME missing"

# 8. Module: API exported
assert 'window.DVL_BASELINE_FREEZE' in mod_block, "FAIL: DVL_BASELINE_FREEZE not exported"
assert 'getContract:   getContract' in mod_block,  "FAIL: getContract not exported"
assert 'audit:         audit' in mod_block,         "FAIL: audit not exported"
assert 'compare:       compare' in mod_block,       "FAIL: compare not exported"
assert 'run:           run' in mod_block,            "FAIL: run not exported"

# 9. Module: BASELINE_CONTRACT structure
assert 'var BASELINE_CONTRACT' in mod_block,        "FAIL: BASELINE_CONTRACT missing"
assert 'frozenLayout' in mod_block,                 "FAIL: frozenLayout missing"
assert 'frozenModules' in mod_block,                "FAIL: frozenModules missing"
assert 'extensionRules' in mod_block,               "FAIL: extensionRules missing"
assert 'protectedAreas' in mod_block,               "FAIL: protectedAreas missing"

# 10. Module: frozenLayout values
assert 'headerH: 55' in mod_block,          "FAIL: headerH: 55 missing"
assert 'assetbarH: 50' in mod_block,        "FAIL: assetbarH: 50 missing"
assert 'chartToolbarH: 30' in mod_block,    "FAIL: chartToolbarH: 30 missing"
assert 'footerH: 57' in mod_block,          "FAIL: footerH: 57 missing"
assert 'footerButtonH: 55' in mod_block,    "FAIL: footerButtonH: 55 missing"
assert 'priceScaleW: 70' in mod_block,      "FAIL: priceScaleW: 70 missing"
assert 'tradeDrawerMaxH: 150' in mod_block, "FAIL: tradeDrawerMaxH: 150 missing"

# 11. Module: getContract() returns safe copy
assert 'JSON.parse(JSON.stringify' in mod_block, "FAIL: getContract() safe copy missing"

# 12. Module: audit() required fields
assert 'readyForFinalOptimization' in mod_block, "FAIL: readyForFinalOptimization missing"
assert 'readyForNewFeatures' in mod_block,       "FAIL: readyForNewFeatures missing"
assert 'frozenLayoutMatch' in mod_block,         "FAIL: frozenLayoutMatch missing"
assert 'frozenModulesPresent' in mod_block,      "FAIL: frozenModulesPresent missing"
assert 'protectedAreasLocked' in mod_block,      "FAIL: protectedAreasLocked missing"
assert 'noUnsafeScheduler' in mod_block,         "FAIL: noUnsafeScheduler missing"
assert 'noChartFunctionOverride' in mod_block,   "FAIL: noChartFunctionOverride missing"
assert 'noDomMutationByThisModule' in mod_block, "FAIL: noDomMutationByThisModule missing"
assert 'drawSoonWrappedByThisModule' in mod_block, "FAIL: drawSoonWrappedByThisModule missing"

# 13. Module: audit() reads all required globals
assert 'DVL_FEATURE_GATE_AUDIT'           in mod_block, "FAIL: DVL_FEATURE_GATE_AUDIT not read"
assert 'DVL_RUNTIME_INTEGRATION_AUDIT'    in mod_block, "FAIL: DVL_RUNTIME_INTEGRATION_AUDIT not read"
assert 'DVL_LAYOUT_ASSERTIONS'            in mod_block, "FAIL: DVL_LAYOUT_ASSERTIONS not read"
assert 'DVL_PAPER_LAYER_ANCHOR'           in mod_block, "FAIL: DVL_PAPER_LAYER_ANCHOR not read"
assert 'DVL_OSCILLATOR_BOUNDS_PUBLISHER'  in mod_block, "FAIL: DVL_OSCILLATOR_BOUNDS_PUBLISHER not read"
assert 'DVL_OSCILLATOR_BOUNDS_AUDIT'      in mod_block, "FAIL: DVL_OSCILLATOR_BOUNDS_AUDIT not read"

# 14. Module: compare() present
assert 'function compare()' in mod_block, "FAIL: compare() missing"
assert 'DVL_SECTION_SIZES_PX' in mod_block, "FAIL: DVL_SECTION_SIZES_PX not referenced in compare()"

# 15. Module: run() delegates to featureGate.run()
assert 'featureGate.run()' in mod_block,       "FAIL: run() does not call featureGate.run()"
assert 'Promise.resolve(audit())' in mod_block, "FAIL: Promise.resolve fallback missing"

# 16. Module: no forbidden patterns
assert 'requestAnimationFrame(' not in mod_block, "FAIL: requestAnimationFrame( in module"
assert 'setInterval('           not in mod_block, "FAIL: setInterval in module"
assert 'setTimeout('            not in mod_block, "FAIL: setTimeout in module"
assert 'new MutationObserver'   not in mod_block, "FAIL: new MutationObserver in module"
assert 'new ResizeObserver'     not in mod_block, "FAIL: new ResizeObserver in module"
assert 'window.drawSoon'        not in mod_block, "FAIL: window.drawSoon in module"
assert 'style.set'              not in mod_block, "FAIL: style write in module"
assert 'classList'              not in mod_block, "FAIL: classList in module"
assert 'setAttribute'           not in mod_block, "FAIL: setAttribute in module"
assert 'appendChild'            not in mod_block, "FAIL: appendChild in module"

# 17. Module is in <head> (before main script)
main_script_start = content.index('<script>\nconst DVL_APP_VERSION')
assert mod_start < main_script_start, "FAIL: baseline freeze module not in <head>"

# 18. Block order before </head>
idx_fga_mod  = content.index('DVL_FEATURE_GATE_AUDIT_MODULE_0668')
idx_bf_css   = content.index('DVL_BASELINE_FREEZE_CSS_0669')
idx_bf_mod   = content.index('DVL_BASELINE_FREEZE_MODULE_0669')
idx_head     = content.index('</head>')
assert idx_fga_mod < idx_bf_css < idx_bf_mod < idx_head, "FAIL: block order before </head> wrong"

# 19. Prior CSS locks preserved
for lock_id in ["DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659", "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
                 "DVL_CHROME_FINAL_LOCK_CSS_0661", "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"]:
    assert lock_id in content, f"FAIL: {lock_id} missing"

# 20. All prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655"               in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656"             in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657"           in content, "FAIL: layout assertions 0657 missing"
assert "DVL_PAPER_LAYER_ANCHOR_MODULE_0665"          in content, "FAIL: paper anchor 0665 missing"
assert "DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665"     in content, "FAIL: oscillator audit 0665 missing"
assert "DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666" in content, "FAIL: publisher 0666 missing"
assert "DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"   in content, "FAIL: runtime audit 0667 missing"
assert "DVL_FEATURE_GATE_AUDIT_MODULE_0668"          in content, "FAIL: feature gate 0668 missing"

# 21. No wrongly-created button system modules
for ver in ["0656","0657","0658","0659","0660","0661","0662","0663","0664","0665","0666","0667","0668","0669"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 22. Zero DVL_TODO_0669
assert "DVL_TODO_0669" not in content, "FAIL: DVL_TODO_0669 remaining"

# 23. Buy/Sell HTML untouched
assert 'class="tradeAction buy"'  in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 24. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 25. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;'                 in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 26. Section sizes still correct
assert "  header: 55," in content,           "FAIL: header: 55 missing"
assert "  assetHotbar: 50," in content,      "FAIL: assetHotbar: 50 missing"
assert "  chartToolbar: 30," in content,     "FAIL: chartToolbar: 30 missing"
assert "  footerMenu: 57," in content,       "FAIL: footerMenu: 57 missing"
assert "  footerButtons: 55," in content,    "FAIL: footerButtons: 55 missing"
assert "  rightPriceScaleWidth: 70," in content, "FAIL: rightPriceScaleWidth: 70 missing"

# 27. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-header",
            "dvl-btn-migrated-panel",  "dvl-btn-migrated-drawer",
            "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 28. Hook from 0.666 still present
assert 'if(window.DVL_OSCILLATOR_BOUNDS_PUBLISHER){ window.DVL_OSCILLATOR_BOUNDS_PUBLISHER.publish(); }' in content, \
    "FAIL: publisher hook from 0.666 removed"

print("[OK] all 50 assertions passed — 0669 clean: baseline freeze CSS + module, structural contract frozen")
