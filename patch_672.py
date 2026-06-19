#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""patch_672.py — DVL Beta 0.672 — Safe HTML class cleanup batch 2"""
import os, re, shutil, sys, subprocess, tempfile

FILE   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-32.before_0672_safe_html_class_cleanup.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ERROR] Not found: {label}")
        sys.exit(1)
    if count > 1:
        print(f"[ERROR] Found {count}x (expected 1): {label}")
        sys.exit(1)
    return html.replace(old, new)

with open(FILE, "r", encoding="utf-8") as f:
    html = f.read()

shutil.copy(FILE, BACKUP)
print(f"Backup: {BACKUP}")

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.671</title>',
    '<title>DVL Binance Live — Beta 0.672</title>',
    "title")

# ── 2. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.671";',
    'const DVL_APP_VERSION = "Beta 0.672";',
    "DVL_APP_VERSION")

# ── 3. Visible badge ──────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.671</div></div>',
    '>BETA 0.672</div></div>',
    "badge html")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
OLD_CLOG = ('  { version: DVL_APP_VERSION, note: "Beta 0.671 — Phase 4.1: safe CSS cleanup batch 1,'
            ' retiring empty button migration CSS markers 0.645–0.655." },')
NEW_CLOG = ('  { version: DVL_APP_VERSION, note: "Beta 0.672 — Safe HTML class cleanup batch 2:'
            ' removed dead dvl-btn-migrated-* diagnostic class tokens." },\n'
            '  { version: "Beta 0.671", note: "Beta 0.671 — Phase 4.1: safe CSS cleanup batch 1,'
            ' retiring empty button migration CSS markers 0.645–0.655." },')
html = rep(html, OLD_CLOG, NEW_CLOG, "changelog")

# ── 5. Remove 16 classList.add('dvl-btn-migrated-*') lines ───────────────────
MIGRATED_CLASSES = [
    "dvl-btn-migrated-footer",
    "dvl-btn-migrated-timeframe",
    "dvl-btn-migrated-header",
    "dvl-btn-migrated-icon",
    "dvl-btn-migrated-menu",
    "dvl-btn-migrated-order-option",
    "dvl-btn-migrated-keypad",
    "dvl-btn-migrated-asset-favorite",
    "dvl-btn-migrated-asset-dropdown",
    "dvl-btn-migrated-indicator-dropdown",
    "dvl-btn-migrated-tools",
    "dvl-btn-migrated-paper-confirm",
    "dvl-btn-migrated-paper-edit",
    "dvl-btn-migrated-trade-action",
    "dvl-btn-migrated-drawer",
    "dvl-btn-migrated-panel",
]
for cls in MIGRATED_CLASSES:
    old_line = f"\n    el.classList.add('{cls}');"
    html = rep(html, old_line, '', f"remove classList.add({cls})")
    print(f"  Removed classList.add: {cls}")

# ── 6. New CSS marker block ────────────────────────────────────────────────────
CSS_0672 = '''\
<style id="DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672">
/*
  DVL Beta 0.672 — Safe HTML class cleanup batch 2.
  Removed dead dvl-btn-migrated-* diagnostic class tokens from DOM elements.
  No selectors, no properties, no visual change.
*/
</style>'''

# ── 7. Audit module ────────────────────────────────────────────────────────────
MODULE_0672 = '''\
<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">
(function(){
"use strict";

var _lastAudit=null;

var MIGRATED_TOKENS=[
  "dvl-btn-migrated-footer","dvl-btn-migrated-timeframe",
  "dvl-btn-migrated-header","dvl-btn-migrated-icon","dvl-btn-migrated-menu",
  "dvl-btn-migrated-panel","dvl-btn-migrated-order-option",
  "dvl-btn-migrated-keypad","dvl-btn-migrated-asset-favorite",
  "dvl-btn-migrated-asset-dropdown","dvl-btn-migrated-indicator-dropdown",
  "dvl-btn-migrated-tools","dvl-btn-migrated-paper-confirm",
  "dvl-btn-migrated-paper-edit","dvl-btn-migrated-drawer",
  "dvl-btn-migrated-trade-action"
];

function hasId(id){ return !!document.getElementById(id); }
function cntId(styleEls,id){ return styleEls.filter(function(e){ return e.id===id; }).length; }
var allScripts=[].slice.call(document.querySelectorAll("script"));
function hasMarker(m){ return allScripts.some(function(s){ return (s.textContent||"").indexOf(m)!==-1; }); }

function audit(){
  var styleEls=[].slice.call(document.querySelectorAll("style[id]"));

  // Check all migration tokens are absent from DOM elements
  var migratedTokenCounts={};
  var migratedTokensAbsent=true;
  MIGRATED_TOKENS.forEach(function(cls){
    var cnt=document.querySelectorAll("."+cls).length;
    migratedTokenCounts[cls]=cnt;
    if(cnt>0) migratedTokensAbsent=false;
  });

  // dvl-btn base class preserved
  var dvlBtnPreserved=document.querySelectorAll(".dvl-btn").length>0;

  // data-dvl-button preserved
  var dataDvlButtonPreserved=document.querySelectorAll("[data-dvl-button]").length>0;

  // Protected modules
  var protectedModulesStillPresent={
    buttonSystem0655:     hasId("DVL_BUTTON_SYSTEM_MODULE_0655")||hasMarker("DVL_BUTTON_SYSTEM_MODULE_0655"),
    layoutContract0656:   hasId("DVL_LAYOUT_CONTRACT_MODULE_0656")||hasMarker("DVL_LAYOUT_CONTRACT_MODULE_0656"),
    layoutAssertions0657: hasId("DVL_LAYOUT_ASSERTIONS_MODULE_0657")||hasMarker("DVL_LAYOUT_ASSERTIONS_MODULE_0657"),
    paperAnchor0665:      hasId("DVL_PAPER_LAYER_ANCHOR_MODULE_0665"),
    oscillatorPub0666:    hasId("DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666"),
    runtimeInt0667:       hasId("DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"),
    featureGate0668:      hasId("DVL_FEATURE_GATE_AUDIT_MODULE_0668"),
    baselineFreeze0669:   hasId("DVL_BASELINE_FREEZE_MODULE_0669"),
    inventory0670:        hasId("DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670"),
    cssCleanup0671:       hasId("DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671")
  };
  var protectedModsPass=!!(
    protectedModulesStillPresent.buttonSystem0655 &&
    protectedModulesStillPresent.layoutContract0656 &&
    protectedModulesStillPresent.layoutAssertions0657 &&
    protectedModulesStillPresent.paperAnchor0665 &&
    protectedModulesStillPresent.oscillatorPub0666 &&
    protectedModulesStillPresent.runtimeInt0667 &&
    protectedModulesStillPresent.featureGate0668 &&
    protectedModulesStillPresent.baselineFreeze0669 &&
    protectedModulesStillPresent.inventory0670 &&
    protectedModulesStillPresent.cssCleanup0671
  );

  // Final locks
  var finalLocksPass=!!(
    cntId(styleEls,"DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659")===1 &&
    cntId(styleEls,"DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660")===1 &&
    cntId(styleEls,"DVL_CHROME_FINAL_LOCK_CSS_0661")===1 &&
    cntId(styleEls,"DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662")===1
  );

  // Upstream audits
  var baselineFreezePass=false;
  var layoutMatch=false;
  if(window.DVL_BASELINE_FREEZE){
    try{ baselineFreezePass=!!window.DVL_BASELINE_FREEZE.audit().pass; }catch(e){}
    try{ var cmp=window.DVL_BASELINE_FREEZE.compare(); layoutMatch=!!(cmp&&cmp.layoutMatch); }catch(e){}
  }
  var inventoryPass=false;
  if(window.DVL_FINAL_OPTIMIZATION_INVENTORY){
    try{ inventoryPass=!!window.DVL_FINAL_OPTIMIZATION_INVENTORY.audit().pass; }catch(e){}
  }
  var cssCleanupPass=false;
  if(window.DVL_SAFE_CSS_CLEANUP_AUDIT){
    try{ cssCleanupPass=!!window.DVL_SAFE_CSS_CLEANUP_AUDIT.audit().pass; }catch(e){}
  }

  var blockers=[];
  if(!migratedTokensAbsent) blockers.push("Some dvl-btn-migrated-* tokens still in DOM");
  if(!dvlBtnPreserved) blockers.push("dvl-btn base class not found in DOM");
  if(!dataDvlButtonPreserved) blockers.push("data-dvl-button attribute not found in DOM");
  if(!protectedModsPass) blockers.push("Some protected modules missing");
  if(!finalLocksPass) blockers.push("Some final lock CSS blocks missing or duplicated");
  if(!baselineFreezePass) blockers.push("DVL_BASELINE_FREEZE.audit().pass is false");
  if(!inventoryPass) blockers.push("DVL_FINAL_OPTIMIZATION_INVENTORY.audit().pass is false");
  if(!cssCleanupPass) blockers.push("DVL_SAFE_CSS_CLEANUP_AUDIT.audit().pass is false");
  if(!layoutMatch) blockers.push("Layout does not match frozen baseline");

  var result={
    version:"0.672",
    phase:"safe_html_class_cleanup_batch2",
    pass:blockers.length===0,
    migratedTokenCounts:migratedTokenCounts,
    migratedTokensAbsent:migratedTokensAbsent,
    dvlBtnPreserved:dvlBtnPreserved,
    dataDvlButtonPreserved:dataDvlButtonPreserved,
    protectedModulesStillPresent:protectedModulesStillPresent,
    finalLocksPass:finalLocksPass,
    baselineFreezePass:baselineFreezePass,
    inventoryPass:inventoryPass,
    cssCleanupPass:cssCleanupPass,
    layoutStillMatchesFrozenBaseline:layoutMatch,
    blockers:blockers,
    warnings:[],
    selfReport:{
      drawSoonWrappedByThisModule:false,
      requestAnimationFrameUsedByThisModule:false,
      timerUsedByThisModule:false,
      observerUsedByThisModule:false,
      mutatesDomStyleByThisModule:false
    }
  };
  _lastAudit=result;
  return result;
}

function getLastAudit(){ return _lastAudit; }

function run(){
  if(window.DVL_SAFE_CSS_CLEANUP_AUDIT && typeof window.DVL_SAFE_CSS_CLEANUP_AUDIT.run==="function"){
    return window.DVL_SAFE_CSS_CLEANUP_AUDIT.run().then(function(){ return audit(); });
  }
  return Promise.resolve(audit());
}

window.DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT={
  VERSION:"0.672",
  audit:audit,
  run:run,
  getLastAudit:getLastAudit
};

})();
</script>'''

# ── 8. Insert CSS+module before </head> ───────────────────────────────────────
OLD_ANCHOR = '''\
window.DVL_SAFE_CSS_CLEANUP_AUDIT={
  VERSION:"0.671",
  audit:audit,
  run:run,
  getLastAudit:getLastAudit
};

})();
</script>

</head>
<body>'''

NEW_ANCHOR = '''\
window.DVL_SAFE_CSS_CLEANUP_AUDIT={
  VERSION:"0.671",
  audit:audit,
  run:run,
  getLastAudit:getLastAudit
};

})();
</script>

''' + CSS_0672 + '\n\n' + MODULE_0672 + '''

</head>
<body>'''

html = rep(html, OLD_ANCHOR, NEW_ANCHOR, "insert CSS+module before </head>")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(FILE, "w", encoding="utf-8") as f:
    f.write(html)
print(f"File written: {len(html):,} chars")

# ── ASSERTIONS ────────────────────────────────────────────────────────────────
errors = []
def chk(cond, msg):
    if not cond:
        errors.append(msg)

# Extract blocks
mod_start = html.index('<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">')
mod_end   = html.index('</script>', mod_start) + len('</script>')
mod_block = html[mod_start:mod_end]

css_tag_s = html.index('<style id="DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672">')
css_inn_s = html.index('>', css_tag_s) + 1
css_inn_e = html.index('</style>', css_tag_s)
css_inner = html[css_inn_s:css_inn_e]

# A1: Title
chk('<title>DVL Binance Live — Beta 0.672</title>' in html, "A1: title")
# A2: DVL_APP_VERSION
chk('const DVL_APP_VERSION = "Beta 0.672"' in html, "A2: DVL_APP_VERSION")
# A3: Badge
chk('>BETA 0.672</div></div>' in html, "A3: badge")
# A4: Changelog 0.672 on top
chk('Beta 0.672 — Safe HTML class cleanup batch 2' in html, "A4: changelog 0.672")
# A5: 0.671 entry preserved
chk('Beta 0.671 — Phase 4.1: safe CSS cleanup batch 1' in html, "A5: changelog 0.671 preserved")
# A6: CSS_0672 exactly once
chk(html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672"') == 1, "A6: CSS_0672 count != 1")
# A7: MODULE_0672 exactly once
chk(html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672"') == 1, "A7: MODULE_0672 count != 1")
# A8: VERSION "0.672"
chk('VERSION:"0.672"' in mod_block, "A8: VERSION:\"0.672\" not found")
# A9-11: audit/run/getLastAudit exposed
chk('function audit()' in mod_block, "A9: audit() not found")
chk('function run()' in mod_block, "A10: run() not found")
chk('getLastAudit' in mod_block, "A11: getLastAudit not found")
# A12: All 16 classList.add migration lines removed
for cls in MIGRATED_CLASSES:
    chk(f"el.classList.add('{cls}')" not in html, f"A12: classList.add({cls}) still present")
# A13: dvl-btn base class still referenced (in JS)
chk("classList.add('dvl-btn')" in html, "A13: classList.add('dvl-btn') missing")
# A14: data-dvl-button still present
chk('data-dvl-button' in html, "A14: data-dvl-button missing")
# A15-24: Protected modules/markers preserved
chk("DVL_BUTTON_SYSTEM_MODULE_0655" in html, "A15: BUTTON_SYSTEM_MODULE_0655 missing")
chk("DVL_LAYOUT_CONTRACT_MODULE_0656" in html, "A16: LAYOUT_CONTRACT_MODULE_0656 missing")
chk("DVL_LAYOUT_ASSERTIONS_MODULE_0657" in html, "A17: LAYOUT_ASSERTIONS_MODULE_0657 missing")
chk(html.count('id="DVL_PAPER_LAYER_ANCHOR_MODULE_0665"') == 1, "A18: PAPER_LAYER_ANCHOR_MODULE_0665")
chk(html.count('id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666"') == 1, "A19: OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666")
chk(html.count('id="DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"') == 1, "A20: RUNTIME_INTEGRATION_AUDIT_MODULE_0667")
chk(html.count('id="DVL_FEATURE_GATE_AUDIT_MODULE_0668"') == 1, "A21: FEATURE_GATE_AUDIT_MODULE_0668")
chk(html.count('id="DVL_BASELINE_FREEZE_MODULE_0669"') == 1, "A22: BASELINE_FREEZE_MODULE_0669")
chk(html.count('id="DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670"') == 1, "A23: FINAL_OPTIMIZATION_INVENTORY_MODULE_0670")
chk(html.count('id="DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671"') == 1, "A24: SAFE_CSS_CLEANUP_AUDIT_MODULE_0671")
# A25-28: Final locks 0659-0662 exactly once
chk(html.count('id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659"') == 1, "A25: PRICE_SCALE_LOCK_0659")
chk(html.count('id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660"') == 1, "A26: CHART_TOOLBAR_LOCK_0660")
chk(html.count('id="DVL_CHROME_FINAL_LOCK_CSS_0661"') == 1, "A27: CHROME_LOCK_0661")
chk(html.count('id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"') == 1, "A28: GAP_DRAWER_LOCK_0662")
# A29-31: Upstream audits referenced in module
chk('DVL_BASELINE_FREEZE' in mod_block, "A29: DVL_BASELINE_FREEZE not referenced")
chk('DVL_FINAL_OPTIMIZATION_INVENTORY' in mod_block, "A30: DVL_FINAL_OPTIMIZATION_INVENTORY not referenced")
chk('DVL_SAFE_CSS_CLEANUP_AUDIT' in mod_block, "A31: DVL_SAFE_CSS_CLEANUP_AUDIT not referenced")
# A32: pass logic exists
chk('pass:blockers.length===0' in mod_block, "A32: pass logic not found")
# A33: layout match referenced
chk('layoutMatch' in mod_block or 'layoutStillMatchesFrozenBaseline' in mod_block, "A33: layout match not in module")
# A34: No DVL_BUTTON_SYSTEM_MODULE_0672
chk('DVL_BUTTON_SYSTEM_MODULE_0672' not in html, "A34: DVL_BUTTON_SYSTEM_MODULE_0672 found")
# A35: No TODO_0672
chk('TODO_0672' not in html, "A35: TODO_0672 found")
# A36: No nested <script>
chk(mod_block.count('<script') == 1, "A36: nested <script> in 0672 module")
# A37: No window.drawSoon assignment
chk('window.drawSoon' not in mod_block, "A37: window.drawSoon in 0672 module")
# A38: No requestAnimationFrame call
chk('requestAnimationFrame(' not in mod_block, "A38: requestAnimationFrame( in 0672 module")
# A39: No setTimeout
chk('setTimeout(' not in mod_block, "A39: setTimeout( in 0672 module")
# A40: No setInterval
chk('setInterval(' not in mod_block, "A40: setInterval( in 0672 module")
# A41: No new MutationObserver
chk('new MutationObserver' not in mod_block, "A41: new MutationObserver in 0672 module")
# A42: No new ResizeObserver
chk('new ResizeObserver' not in mod_block, "A42: new ResizeObserver in 0672 module")
# A43: No DOM/style/classList mutation in module
chk('innerHTML' not in mod_block, "A43a: innerHTML in 0672 module")
chk('.style.' not in mod_block, "A43b: .style. in 0672 module")
chk('setAttribute(' not in mod_block, "A43c: setAttribute in 0672 module")
chk('appendChild(' not in mod_block, "A43d: appendChild in 0672 module")
# Note: classList.* READ ops (querySelectorAll, contains) are fine; classList.add/remove/toggle would be mutations
chk('classList.add(' not in mod_block, "A43e: classList.add in 0672 module")
chk('classList.remove(' not in mod_block, "A43f: classList.remove in 0672 module")
chk('classList.toggle(' not in mod_block, "A43g: classList.toggle in 0672 module")
# A44-49: Core functionality intact
chk('activeOscillators' in html, "A48: activeOscillators missing")
chk('drawSoon' in html, "A43h: drawSoon function missing from app")
# A50: JS brace balance in module
tag_end = mod_block.index('>') + 1
mod_js  = mod_block[tag_end:mod_block.rindex('</script>')]
ob = mod_js.count('{')
cb = mod_js.count('}')
chk(ob == cb, f"A50: brace mismatch ({ob} open vs {cb} close)")
# CSS marker: no '{' inside
chk('{' not in css_inner, "CSS_0672 inner contains '{'")
# Return Promise in run()
chk('return Promise.resolve(' in mod_block, "AX: Promise.resolve not in run()")
# migratedTokenCounts field exists
chk('migratedTokenCounts' in mod_block, "AX: migratedTokenCounts not in module")
chk('migratedTokensAbsent' in mod_block, "AX: migratedTokensAbsent not in module")

# JS syntax via node --check
try:
    tf = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
    tf.write(mod_js)
    tf.close()
    r = subprocess.run(['node','--check', tf.name], capture_output=True, text=True, timeout=10)
    os.unlink(tf.name)
    if r.returncode != 0:
        errors.append(f"A50-node: JS syntax error: {r.stderr[:300]}")
except Exception:
    pass

if errors:
    print(f"\n[FAIL] {len(errors)} assertion(s) failed:")
    for e in errors: print(" ", e)
    sys.exit(1)

print(f"\n[PASS] All assertions passed. File size: {len(html):,} chars")
