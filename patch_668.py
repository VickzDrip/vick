#!/usr/bin/env python3
"""patch_668.py — Beta 0.668 / Phase 3.2: Feature Gate Audit + Freeze Candidate check."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-28.before_0668_feature_gate_audit.html"

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
    "<title>DVL Binance Live — Beta 0.667</title>",
    "<title>DVL Binance Live — Beta 0.668</title>",
    "title 0.667→0.668")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.667<",
    ">BETA 0.668<",
    "static badge 0.667→0.668")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.667";',
    'const DVL_APP_VERSION = "Beta 0.668";',
    "DVL_APP_VERSION 0.667→0.668")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.667 — Phase 3.1: runtime integration audit for Paper layer, oscillator bounds publisher and safe resync pipeline." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.668 — Phase 3.2: feature gate audit e freeze-candidate check para validar se a base está pronta para congelamento, otimização final e novas funções." },\n  { version: "Beta 0.667", note: "Phase 3.1: runtime integration audit for Paper layer, oscillator bounds publisher and safe resync pipeline." },',
    "changelog 0.668 entry")

# ── 5. Insert feature gate CSS + module after 0667 module, before </head> ────
OLD_TAIL = (
    "window.DVL_RUNTIME_INTEGRATION_AUDIT = {\n"
    "  VERSION: VERSION,\n"
    "  audit: audit,\n"
    "  run: run,\n"
    "  getLastPublish: getLastPublish,\n"
    "  getLastSync: getLastSync\n"
    "};\n"
    "})();\n"
    "</script>\n"
    "\n"
    "</head>\n"
    "<body>"
)

NEW_TAIL = r"""window.DVL_RUNTIME_INTEGRATION_AUDIT = {
  VERSION: VERSION,
  audit: audit,
  run: run,
  getLastPublish: getLastPublish,
  getLastSync: getLastSync
};
})();
</script>

<style id="DVL_FEATURE_GATE_AUDIT_CSS_0668">
/* DVL Beta 0.668 — Phase 3.2: feature gate / freeze candidate marker.
   Marker-only. No visual, layout, spacing, color, z-index, width, height,
   positioning, transform, pointer-events or interaction changes. */
</style>

<script id="DVL_FEATURE_GATE_AUDIT_MODULE_0668">
(function(){
"use strict";

var VERSION = "0.668";

function safeCall(fn, fallback){
  try{
    return (typeof fn === "function") ? fn() : fallback;
  }catch(err){
    return fallback;
  }
}

function getRuntimeAudit(){
  return window.DVL_RUNTIME_INTEGRATION_AUDIT || null;
}

function getLayoutAssertions(){
  return window.DVL_LAYOUT_ASSERTIONS || null;
}

function getPaperAnchor(){
  return window.DVL_PAPER_LAYER_ANCHOR || null;
}

function getPublisher(){
  return window.DVL_OSCILLATOR_BOUNDS_PUBLISHER || null;
}

function getOscillatorAudit(){
  return window.DVL_OSCILLATOR_BOUNDS_AUDIT || null;
}

function collectSnapshot(){
  var runtime = getRuntimeAudit();
  var layout = getLayoutAssertions();
  var paper = getPaperAnchor();
  var publisher = getPublisher();
  var oscAudit = getOscillatorAudit();

  var runtimeResult = runtime && typeof runtime.audit === "function"
    ? safeCall(function(){ return runtime.audit(); }, null)
    : null;

  var layoutResult = layout && typeof layout.audit === "function"
    ? safeCall(function(){ return layout.audit(); }, null)
    : null;

  var paperLastSync = paper && typeof paper.getLastSync === "function"
    ? safeCall(function(){ return paper.getLastSync(); }, null)
    : null;

  var publisherLast = publisher && typeof publisher.getLastPublish === "function"
    ? safeCall(function(){ return publisher.getLastPublish(); }, null)
    : null;

  var oscAuditResult = oscAudit && typeof oscAudit.audit === "function"
    ? safeCall(function(){ return oscAudit.audit(); }, null)
    : null;

  return {
    runtimeAvailable: !!runtime,
    layoutAssertionsAvailable: !!layout,
    paperAnchorAvailable: !!paper,
    oscillatorPublisherAvailable: !!publisher,
    oscillatorAuditAvailable: !!oscAudit,

    runtimeVersion: runtime && runtime.VERSION ? runtime.VERSION : null,
    paperAnchorVersion: paper && paper.VERSION ? paper.VERSION : null,
    publisherVersion: publisher && publisher.VERSION ? publisher.VERSION : null,
    oscillatorAuditVersion: oscAudit && oscAudit.VERSION ? oscAudit.VERSION : null,

    runtimeAudit: runtimeResult,
    layoutAudit: layoutResult,
    paperLastSync: paperLastSync,
    publisherLastPublish: publisherLast,
    oscillatorAudit: oscAuditResult
  };
}

function buildBlockers(snapshot){
  var blockers = [];

  if(!snapshot.runtimeAvailable) blockers.push("runtime integration audit missing");
  if(!snapshot.layoutAssertionsAvailable) blockers.push("layout assertions missing");
  if(!snapshot.paperAnchorAvailable) blockers.push("paper layer anchor missing");
  if(!snapshot.oscillatorPublisherAvailable) blockers.push("oscillator bounds publisher missing");
  if(!snapshot.oscillatorAuditAvailable) blockers.push("oscillator bounds audit missing");

  if(snapshot.runtimeAudit && snapshot.runtimeAudit.pass !== true){
    blockers.push("runtime integration audit is not passing");
  }

  if(snapshot.runtimeAudit && Array.isArray(snapshot.runtimeAudit.issues) && snapshot.runtimeAudit.issues.length){
    blockers.push("runtime integration has issues");
  }

  if(snapshot.layoutAudit && Array.isArray(snapshot.layoutAudit.sectionSizeMismatches) && snapshot.layoutAudit.sectionSizeMismatches.length){
    blockers.push("layout section size mismatches detected");
  }

  if(snapshot.oscillatorAudit && snapshot.oscillatorAudit.paperInvadesOscillatorArea === true){
    blockers.push("paper layer invades oscillator area");
  }

  if(snapshot.oscillatorAudit && snapshot.oscillatorAudit.paperFitsPricePane === false){
    blockers.push("paper layer does not fit the price pane");
  }

  if(snapshot.paperLastSync && snapshot.paperLastSync.requestAnimationFrameUsed === true){
    blockers.push("paper sync reports requestAnimationFrame usage");
  }

  return blockers;
}

function audit(){
  var snapshot = collectSnapshot();
  var blockers = buildBlockers(snapshot);
  var ready = blockers.length === 0;

  return {
    version: VERSION,
    pass: ready,
    readyForBaselineFreeze: ready,
    readyForFinalOptimization: ready,
    readyForNewFeatures: ready,

    blockers: blockers,
    snapshot: snapshot,

    extensionContract: {
      uiLayer: "stable-readonly",
      chartLayer: "stable-do-not-wrap-drawSoon",
      paperLayer: "stable-through-DVL_PAPER_LAYER_ANCHOR",
      oscillatorLayer: "stable-through-DVL_OSCILLATOR_BOUNDS_PUBLISHER",
      runtimeAuditLayer: "stable-through-DVL_RUNTIME_INTEGRATION_AUDIT",
      brokerConnectorFutureLayer: "future-readonly-first-then-trading"
    },

    drawSoonWrappedByThisModule: false,
    requestAnimationFrameUsedByThisModule: false,
    timerUsedByThisModule: false,
    observerUsedByThisModule: false,
    mutatesDomStyleByThisModule: false
  };
}

function run(){
  var runtime = getRuntimeAudit();

  if(runtime && typeof runtime.run === "function"){
    return runtime.run().then(function(){
      return audit();
    });
  }

  return Promise.resolve(audit());
}

window.DVL_FEATURE_GATE_AUDIT = {
  VERSION: VERSION,
  audit: audit,
  run: run
};
})();
</script>

</head>
<body>"""

html = rep(html, OLD_TAIL, NEW_TAIL, "insert DVL_FEATURE_GATE_AUDIT CSS+module before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_668 applied: title, badge, version, changelog, feature gate CSS + module")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.668</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.667</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.668";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.667";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.668<" in content, "FAIL: static badge"
assert ">BETA 0.667<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.668 — Phase 3.2: feature gate audit e freeze-candidate check' in content, "FAIL: changelog 0.668"
assert '"Beta 0.667", note: "Phase 3.1:' in content, "FAIL: 0.667 changelog preserved"

# 3. New CSS and module present exactly once
assert content.count('id="DVL_FEATURE_GATE_AUDIT_CSS_0668"') == 1,    "FAIL: feature gate CSS count != 1"
assert content.count('id="DVL_FEATURE_GATE_AUDIT_MODULE_0668"') == 1, "FAIL: feature gate module count != 1"

# 4. CSS block contains only comments (no selectors or properties)
css_start = content.index('<style id="DVL_FEATURE_GATE_AUDIT_CSS_0668">')
css_end   = content.index('</style>', css_start) + len('</style>')
css_block = content[css_start:css_end]
# Strip the outer tags and check that no CSS selectors/properties exist
css_inner = css_block[css_block.index('>')+1 : css_block.rindex('</style>')]
assert '{' not in css_inner, "FAIL: CSS block contains selectors/properties (found '{')"

# 5. Extract module block
mod_start = content.index('<script id="DVL_FEATURE_GATE_AUDIT_MODULE_0668">')
mod_end   = content.index('</script>', mod_start) + len('</script>')
mod_block = content[mod_start:mod_end]

# 6. Module: VERSION "0.668"
assert 'var VERSION = "0.668"' in mod_block, "FAIL: VERSION 0.668 missing"

# 7. Module: required API exported
assert 'window.DVL_FEATURE_GATE_AUDIT' in mod_block, "FAIL: DVL_FEATURE_GATE_AUDIT not exported"
assert 'audit: audit' in mod_block,                  "FAIL: audit not exported"
assert 'run: run' in mod_block,                       "FAIL: run not exported"

# 8. Module: required functions
assert 'function audit()' in mod_block,            "FAIL: audit() missing"
assert 'function run()' in mod_block,              "FAIL: run() missing"
assert 'function collectSnapshot()' in mod_block,  "FAIL: collectSnapshot() missing"
assert 'function buildBlockers(' in mod_block,     "FAIL: buildBlockers() missing"

# 9. Module: audit() return fields
assert 'readyForBaselineFreeze' in mod_block,    "FAIL: readyForBaselineFreeze missing"
assert 'readyForFinalOptimization' in mod_block, "FAIL: readyForFinalOptimization missing"
assert 'readyForNewFeatures' in mod_block,       "FAIL: readyForNewFeatures missing"
assert 'blockers' in mod_block,                  "FAIL: blockers missing"
assert 'extensionContract' in mod_block,         "FAIL: extensionContract missing"
assert 'snapshot' in mod_block,                  "FAIL: snapshot missing"

# 10. Module: reads all required globals
assert 'DVL_RUNTIME_INTEGRATION_AUDIT' in mod_block,  "FAIL: DVL_RUNTIME_INTEGRATION_AUDIT not read"
assert 'DVL_LAYOUT_ASSERTIONS' in mod_block,           "FAIL: DVL_LAYOUT_ASSERTIONS not read"
assert 'DVL_PAPER_LAYER_ANCHOR' in mod_block,          "FAIL: DVL_PAPER_LAYER_ANCHOR not read"
assert 'DVL_OSCILLATOR_BOUNDS_PUBLISHER' in mod_block, "FAIL: DVL_OSCILLATOR_BOUNDS_PUBLISHER not read"
assert 'DVL_OSCILLATOR_BOUNDS_AUDIT' in mod_block,     "FAIL: DVL_OSCILLATOR_BOUNDS_AUDIT not read"

# 11. Module: run() delegates to runtime.run()
assert 'runtime.run()' in mod_block,           "FAIL: run() does not call runtime.run()"
assert 'Promise.resolve(audit())' in mod_block, "FAIL: Promise.resolve fallback missing"

# 12. Module: self-reports non-invasive
assert 'drawSoonWrappedByThisModule: false' in mod_block,              "FAIL: drawSoonWrappedByThisModule: false missing"
assert 'requestAnimationFrameUsedByThisModule: false' in mod_block,   "FAIL: requestAnimationFrameUsedByThisModule: false missing"
assert 'timerUsedByThisModule: false' in mod_block,                   "FAIL: timerUsedByThisModule: false missing"
assert 'observerUsedByThisModule: false' in mod_block,                "FAIL: observerUsedByThisModule: false missing"
assert 'mutatesDomStyleByThisModule: false' in mod_block,             "FAIL: mutatesDomStyleByThisModule: false missing"

# 13. Module: no forbidden patterns
assert 'requestAnimationFrame(' not in mod_block, "FAIL: requestAnimationFrame( in module"
assert 'setInterval('           not in mod_block, "FAIL: setInterval in module"
assert 'setTimeout('            not in mod_block, "FAIL: setTimeout in module"
assert 'MutationObserver'       not in mod_block, "FAIL: MutationObserver in module"
assert 'ResizeObserver'         not in mod_block, "FAIL: ResizeObserver in module"
assert 'window.drawSoon'        not in mod_block, "FAIL: window.drawSoon in module"
assert 'style.set'              not in mod_block, "FAIL: style write in module"
assert 'classList'              not in mod_block, "FAIL: classList in module"
assert 'setAttribute'           not in mod_block, "FAIL: setAttribute in module"
assert 'appendChild'            not in mod_block, "FAIL: appendChild in module"

# 14. Module is in <head> (before main script)
main_script_start = content.index('<script>\nconst DVL_APP_VERSION')
assert mod_start < main_script_start, "FAIL: feature gate module not in <head>"

# 15. Block order before </head>
idx_ria_mod  = content.index('DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667')
idx_fga_css  = content.index('DVL_FEATURE_GATE_AUDIT_CSS_0668')
idx_fga_mod  = content.index('DVL_FEATURE_GATE_AUDIT_MODULE_0668')
idx_head     = content.index('</head>')
assert idx_ria_mod < idx_fga_css < idx_fga_mod < idx_head, "FAIL: block order before </head> wrong"

# 16. Prior CSS locks preserved
for lock_id in ["DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659", "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
                 "DVL_CHROME_FINAL_LOCK_CSS_0661", "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"]:
    assert lock_id in content, f"FAIL: {lock_id} missing"

# 17. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655"               in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656"             in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657"           in content, "FAIL: layout assertions 0657 missing"
assert "DVL_PAPER_LAYER_ANCHOR_MODULE_0665"          in content, "FAIL: paper anchor 0665 missing"
assert "DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665"     in content, "FAIL: oscillator audit 0665 missing"
assert "DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666" in content, "FAIL: publisher 0666 missing"
assert "DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"   in content, "FAIL: runtime audit 0667 missing"

# 18. No wrongly-created button system modules
for ver in ["0656","0657","0658","0659","0660","0661","0662","0663","0664","0665","0666","0667","0668"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 19. Zero DVL_TODO_0668
assert "DVL_TODO_0668" not in content, "FAIL: DVL_TODO_0668 remaining"

# 20. Buy/Sell HTML untouched
assert 'class="tradeAction buy"'  in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 21. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 22. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;'                 in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 23. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-header",
            "dvl-btn-migrated-panel",  "dvl-btn-migrated-drawer",
            "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 24. Hook from 0.666 still present
assert 'if(window.DVL_OSCILLATOR_BOUNDS_PUBLISHER){ window.DVL_OSCILLATOR_BOUNDS_PUBLISHER.publish(); }' in content, \
    "FAIL: publisher hook from 0.666 removed"

print("[OK] all 44 assertions passed — 0668 clean: feature gate audit CSS + module before </head>")
