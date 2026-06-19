#!/usr/bin/env python3
"""patch_667.py — Beta 0.667 / Phase 3.1: Runtime Integration Audit for Paper + Oscillators."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-27.before_0667_runtime_integration_audit.html"

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
    "<title>DVL Binance Live — Beta 0.666</title>",
    "<title>DVL Binance Live — Beta 0.667</title>",
    "title 0.666→0.667")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.666<",
    ">BETA 0.667<",
    "static badge 0.666→0.667")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.666";',
    'const DVL_APP_VERSION = "Beta 0.667";',
    "DVL_APP_VERSION 0.666→0.667")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.666 — Phase 3.0: oscillator bounds publisher + safe Paper resync hook." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.667 — Phase 3.1: runtime integration audit for Paper layer, oscillator bounds publisher and safe resync pipeline." },\n  { version: "Beta 0.666", note: "Phase 3.0: oscillator bounds publisher + safe Paper resync hook." },',
    "changelog 0.667 entry")

# ── 5. Insert runtime integration audit CSS + module before </head> ───────────
OLD_TAIL = r"""window.DVL_OSCILLATOR_BOUNDS_PUBLISHER = {
  VERSION:        "0.666",
  publish:        publish,
  audit:          audit,
  getLastPublish: getLastPublish
};

})();
</script>

</head>
<body>"""

NEW_TAIL = r"""window.DVL_OSCILLATOR_BOUNDS_PUBLISHER = {
  VERSION:        "0.666",
  publish:        publish,
  audit:          audit,
  getLastPublish: getLastPublish
};

})();
</script>

<style id="DVL_RUNTIME_INTEGRATION_AUDIT_CSS_0667">
/* DVL Beta 0.667 — Phase 3.1: runtime integration audit marker only.
   No visual/layout properties here. This phase only audits the integration between:
   - DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666
   - DVL_PAPER_LAYER_ANCHOR_MODULE_0665
   - DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665
   Do not change Paper Trading math, Buy/Sell, TP/SL/ENTRY, chart draw math, oscillator rendering, tools, dropdowns or Button System. */
</style>

<script id="DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667">
(function(){
"use strict";

var VERSION = "0.667";

function safeCall(fn, fallback){
  try{
    return (typeof fn === "function") ? fn() : fallback;
  }catch(err){
    return fallback;
  }
}

function getPublisher(){
  return window.DVL_OSCILLATOR_BOUNDS_PUBLISHER || null;
}

function getPaperAnchor(){
  return window.DVL_PAPER_LAYER_ANCHOR || null;
}

function getOscAudit(){
  return window.DVL_OSCILLATOR_BOUNDS_AUDIT || null;
}

function getLayoutAudit(){
  return window.DVL_LAYOUT_ASSERTIONS || null;
}

function getLastPublish(){
  var mod = getPublisher();
  return mod && typeof mod.getLastPublish === "function" ? safeCall(function(){ return mod.getLastPublish(); }, null) : null;
}

function getLastSync(){
  var mod = getPaperAnchor();
  return mod && typeof mod.getLastSync === "function" ? safeCall(function(){ return mod.getLastSync(); }, null) : null;
}

function getOscAuditResult(){
  var mod = getOscAudit();
  return mod && typeof mod.audit === "function" ? safeCall(function(){ return mod.audit(); }, null) : null;
}

function getLayoutAuditResult(){
  var mod = getLayoutAudit();
  return mod && typeof mod.audit === "function" ? safeCall(function(){ return mod.audit(); }, null) : null;
}

function buildIssues(report){
  var issues = [];

  if(!report.publisherAvailable) issues.push("oscillator bounds publisher missing");
  if(!report.paperAnchorAvailable) issues.push("paper layer anchor missing");
  if(!report.oscillatorAuditAvailable) issues.push("oscillator bounds audit missing");
  if(!report.layoutAssertionsAvailable) issues.push("layout assertions missing");

  if(report.lastPublish && report.lastPublish.count > 0 && !report.lastPublish.top){
    issues.push("published oscillator bounds have count > 0 but no top");
  }

  if(report.oscillatorAudit && report.oscillatorAudit.paperInvadesOscillatorArea === true){
    issues.push("paper layer invades oscillator area");
  }

  if(report.oscillatorAudit && report.oscillatorAudit.paperFitsPricePane === false){
    issues.push("paper layer does not fit price pane");
  }

  if(report.layoutAudit && Array.isArray(report.layoutAudit.sectionSizeMismatches) && report.layoutAudit.sectionSizeMismatches.length){
    issues.push("layout section size mismatches detected");
  }

  if(report.lastSync && report.lastSync.clampApplied && typeof report.lastSync.localOscillatorTopPx === "number"){
    if(report.lastSync.localOscillatorTopPx < 40){
      issues.push("oscillator top is too close to chart top for safe paper clamp");
    }
  }

  return issues;
}

function audit(){
  var publisher = getPublisher();
  var anchor = getPaperAnchor();
  var oscAudit = getOscAudit();
  var layoutAudit = getLayoutAudit();

  var report = {
    version: VERSION,
    publisherAvailable: !!publisher,
    paperAnchorAvailable: !!anchor,
    oscillatorAuditAvailable: !!oscAudit,
    layoutAssertionsAvailable: !!layoutAudit,
    publisherVersion: publisher && publisher.VERSION ? publisher.VERSION : null,
    paperAnchorVersion: anchor && anchor.VERSION ? anchor.VERSION : null,
    oscillatorAuditVersion: oscAudit && oscAudit.VERSION ? oscAudit.VERSION : null,
    lastPublish: getLastPublish(),
    lastSync: getLastSync(),
    oscillatorAudit: getOscAuditResult(),
    layoutAudit: getLayoutAuditResult(),
    drawSoonWrappedByThisModule: false,
    requestAnimationFrameUsedByThisModule: false,
    timerUsedByThisModule: false,
    observerUsedByThisModule: false,
    mutatesDomStyleByThisModule: false
  };

  report.activeOscillatorBoundsDetected = !!(report.lastPublish && report.lastPublish.count > 0);
  report.paperClampDetected = !!(report.lastSync && report.lastSync.clampApplied === true);
  report.issues = buildIssues(report);
  report.pass = report.issues.length === 0;
  return report;
}

function run(){
  var publisher = getPublisher();
  var anchor = getPaperAnchor();

  if(publisher && typeof publisher.publish === "function"){
    safeCall(function(){ return publisher.publish(); }, null);
  }

  if(anchor && typeof anchor.scheduleSync === "function"){
    safeCall(function(){ return anchor.scheduleSync(); }, null);
  }

  if(typeof window.queueMicrotask === "function"){
    return new Promise(function(resolve){
      window.queueMicrotask(function(){
        resolve(audit());
      });
    });
  }

  return Promise.resolve(audit());
}

window.DVL_RUNTIME_INTEGRATION_AUDIT = {
  VERSION: VERSION,
  audit: audit,
  run: run,
  getLastPublish: getLastPublish,
  getLastSync: getLastSync
};
})();
</script>

</head>
<body>"""

html = rep(html, OLD_TAIL, NEW_TAIL, "insert DVL_RUNTIME_INTEGRATION_AUDIT CSS+module before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_667 applied: title, badge, version, changelog, runtime integration audit CSS + module")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.667</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.666</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.667";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.666";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.667<" in content, "FAIL: static badge"
assert ">BETA 0.666<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.667 — Phase 3.1: runtime integration audit for Paper layer, oscillator bounds publisher and safe resync pipeline.' in content, "FAIL: changelog 0.667"
assert '"Beta 0.666", note: "Phase 3.0:' in content, "FAIL: 0.666 changelog preserved"

# 3. New CSS and module present exactly once
assert content.count('id="DVL_RUNTIME_INTEGRATION_AUDIT_CSS_0667"') == 1,    "FAIL: audit CSS count != 1"
assert content.count('id="DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"') == 1, "FAIL: audit module count != 1"

# 4. Extract the new module block
mod_start = content.index('<script id="DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667">')
mod_end   = content.index('</script>', mod_start) + len('</script>')
mod_block = content[mod_start:mod_end]

# 5. Module: VERSION "0.667"
assert 'var VERSION = "0.667"' in mod_block, "FAIL: VERSION 0.667 missing from module"

# 6. Module: required API exported
assert 'window.DVL_RUNTIME_INTEGRATION_AUDIT' in mod_block, "FAIL: DVL_RUNTIME_INTEGRATION_AUDIT not exported"
assert 'audit: audit' in mod_block,            "FAIL: audit not exported"
assert 'run: run' in mod_block,                "FAIL: run not exported"
assert 'getLastPublish: getLastPublish' in mod_block, "FAIL: getLastPublish not exported"
assert 'getLastSync: getLastSync' in mod_block, "FAIL: getLastSync not exported"

# 7. Module: audit() and run() defined
assert 'function audit()' in mod_block, "FAIL: audit() missing"
assert 'function run()' in mod_block,   "FAIL: run() missing"

# 8. Module: run() returns a Promise
assert 'return new Promise' in mod_block,        "FAIL: run() does not return a Promise"
assert 'Promise.resolve(audit())' in mod_block,  "FAIL: Promise.resolve fallback missing"

# 9. Module: integration checks present
assert 'publisherAvailable' in mod_block,  "FAIL: publisherAvailable missing"
assert 'paperAnchorAvailable' in mod_block, "FAIL: paperAnchorAvailable missing"
assert 'oscillatorAuditAvailable' in mod_block, "FAIL: oscillatorAuditAvailable missing"
assert 'layoutAssertionsAvailable' in mod_block, "FAIL: layoutAssertionsAvailable missing"
assert 'paperInvadesOscillatorArea' in mod_block, "FAIL: paperInvadesOscillatorArea check missing"
assert 'paperFitsPricePane' in mod_block,  "FAIL: paperFitsPricePane check missing"
assert 'report.pass' in mod_block,         "FAIL: report.pass missing"
assert 'report.issues' in mod_block,       "FAIL: report.issues missing"

# 10. Module: self-reports as non-invasive
assert 'drawSoonWrappedByThisModule: false' in mod_block,              "FAIL: drawSoonWrappedByThisModule: false missing"
assert 'requestAnimationFrameUsedByThisModule: false' in mod_block,   "FAIL: requestAnimationFrameUsedByThisModule: false missing"
assert 'timerUsedByThisModule: false' in mod_block,                   "FAIL: timerUsedByThisModule: false missing"
assert 'observerUsedByThisModule: false' in mod_block,                "FAIL: observerUsedByThisModule: false missing"
assert 'mutatesDomStyleByThisModule: false' in mod_block,             "FAIL: mutatesDomStyleByThisModule: false missing"

# 11. Module: no forbidden patterns
assert 'requestAnimationFrame(' not in mod_block, "FAIL: requestAnimationFrame( in audit module"
assert 'setInterval('           not in mod_block, "FAIL: setInterval in audit module"
assert 'setTimeout('            not in mod_block, "FAIL: setTimeout in audit module"
assert 'MutationObserver'       not in mod_block, "FAIL: MutationObserver in audit module"
assert 'ResizeObserver'         not in mod_block, "FAIL: ResizeObserver in audit module"
assert 'window.drawSoon'        not in mod_block, "FAIL: window.drawSoon in audit module"
assert 'style.set'              not in mod_block, "FAIL: style write in audit module"
assert 'classList'              not in mod_block, "FAIL: classList in audit module"
assert 'setAttribute'           not in mod_block, "FAIL: setAttribute in audit module"
assert 'appendChild'            not in mod_block, "FAIL: appendChild in audit module"

# 12. Module is in <head> (before main script)
main_script_start = content.index('<script>\nconst DVL_APP_VERSION')
assert mod_start < main_script_start, "FAIL: audit module not in <head>"

# 13. Block order before </head>
idx_pub_mod  = content.index('DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666')
idx_ria_css  = content.index('DVL_RUNTIME_INTEGRATION_AUDIT_CSS_0667')
idx_ria_mod  = content.index('DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667')
idx_head     = content.index('</head>')
assert idx_pub_mod < idx_ria_css < idx_ria_mod < idx_head, "FAIL: block order before </head> wrong"

# 14. Prior CSS locks preserved
for lock_id in ["DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659", "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
                 "DVL_CHROME_FINAL_LOCK_CSS_0661", "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"]:
    assert lock_id in content, f"FAIL: {lock_id} missing"

# 15. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655"            in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656"          in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657"        in content, "FAIL: layout assertions 0657 missing"
assert "DVL_PAPER_LAYER_ANCHOR_MODULE_0665"       in content, "FAIL: paper anchor 0665 missing"
assert "DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665"  in content, "FAIL: oscillator audit 0665 missing"
assert "DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666" in content, "FAIL: publisher 0666 missing"

# 16. No wrongly-created button system modules
for ver in ["0656","0657","0658","0659","0660","0661","0662","0663","0664","0665","0666","0667"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 17. Zero DVL_TODO_0667
assert "DVL_TODO_0667" not in content, "FAIL: DVL_TODO_0667 remaining"

# 18. Buy/Sell HTML untouched
assert 'class="tradeAction buy"'  in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 19. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 20. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;'                in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 21. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-header",
            "dvl-btn-migrated-panel",  "dvl-btn-migrated-drawer",
            "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 22. Hook from 0.666 still present
assert 'if(window.DVL_OSCILLATOR_BOUNDS_PUBLISHER){ window.DVL_OSCILLATOR_BOUNDS_PUBLISHER.publish(); }' in content, \
    "FAIL: publisher hook from 0.666 removed"
assert 'if(window.DVL_PAPER_LAYER_ANCHOR && typeof window.DVL_PAPER_LAYER_ANCHOR.scheduleSync === "function"){ window.DVL_PAPER_LAYER_ANCHOR.scheduleSync(); }' in content, \
    "FAIL: scheduleSync hook from 0.666 removed"

print("[OK] all 43 assertions passed — 0667 clean: runtime integration audit CSS + module before </head>")
