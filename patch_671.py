#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""patch_671.py — DVL Beta 0.671 — Safe CSS Cleanup Batch 1"""
import os, re, shutil, sys, subprocess, tempfile

FILE   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-31.before_0671_safe_css_cleanup_batch1.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ERROR] Not found: {label}")
        sys.exit(1)
    if count > 1:
        print(f"[ERROR] Found {count}x (expected 1): {label}")
        sys.exit(1)
    return html.replace(old, new)

def remove_style_block(html, style_id):
    """Remove <style id="style_id">...</style> including preceding blank line."""
    open_tag = f'<style id="{style_id}">'
    idx = html.find(open_tag)
    if idx == -1:
        print(f"[ERROR] Style block not found: {style_id}")
        sys.exit(1)
    end_idx = html.index('</style>', idx) + len('</style>')
    # include the preceding \n\n
    pre = idx
    while pre > 0 and html[pre - 1] == '\n':
        pre -= 1
    block = html[pre:end_idx]
    count = html.count(block)
    if count != 1:
        print(f"[ERROR] Block {style_id} found {count}x")
        sys.exit(1)
    return html.replace(block, '')

with open(FILE, "r", encoding="utf-8") as f:
    html = f.read()

shutil.copy(FILE, BACKUP)
print(f"Backup: {BACKUP}")

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.670</title>',
    '<title>DVL Binance Live — Beta 0.671</title>',
    "title")

# ── 2. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.670";',
    'const DVL_APP_VERSION = "Beta 0.671";',
    "DVL_APP_VERSION")

# ── 3. Visible badge ──────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.670</div></div>',
    '>BETA 0.671</div></div>',
    "badge html")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
OLD_CLOG = '  { version: DVL_APP_VERSION, note: "Beta 0.670 — Phase 4.0: Final optimization inventory and safe cleanup map." },'
NEW_CLOG = ('  { version: DVL_APP_VERSION, note: "Beta 0.671 — Phase 4.1: safe CSS cleanup batch 1,'
            ' retiring empty button migration CSS markers 0.645–0.655." },\n'
            '  { version: "Beta 0.670", note: "Beta 0.670 — Phase 4.0: Final optimization inventory and safe cleanup map." },')
html = rep(html, OLD_CLOG, NEW_CLOG, "changelog")

# ── 5. Remove 11 migration CSS blocks ─────────────────────────────────────────
RETIRED = [
    "DVL_BUTTON_FOOTER_MIGRATION_CSS_0645",
    "DVL_BUTTON_TIMEFRAME_MIGRATION_CSS_0646",
    "DVL_BUTTON_HEADER_MIGRATION_CSS_0647",
    "DVL_BUTTON_PANEL_MIGRATION_CSS_0648",
    "DVL_BUTTON_DROPDOWN_OPTION_MIGRATION_CSS_0649",
    "DVL_BUTTON_KEYPAD_MIGRATION_CSS_0650",
    "DVL_BUTTON_ASSET_INDICATOR_DROPDOWN_MIGRATION_CSS_0651",
    "DVL_BUTTON_TOOLS_MIGRATION_CSS_0652",
    "DVL_BUTTON_PAPER_CONFIRM_MIGRATION_CSS_0653",
    "DVL_BUTTON_DRAWER_MIGRATION_CSS_0654",
    "DVL_BUTTON_TRADE_ACTION_MIGRATION_CSS_0655",
]
for rid in RETIRED:
    html = remove_style_block(html, rid)
    print(f"  Removed: {rid}")

# ── 6. New CSS marker block ────────────────────────────────────────────────────
CSS_0671 = '''\
<style id="DVL_SAFE_CSS_CLEANUP_BATCH1_CSS_0671">
/*
  DVL Beta 0.671 — Safe CSS Cleanup Batch 1.
  Retired empty visual-neutral button migration CSS marker blocks 0.645–0.655.
  No selectors, no properties, no visual change.
*/
</style>'''

# ── 7. Audit module ────────────────────────────────────────────────────────────
MODULE_0671 = '''\
<script id="DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671">
(function(){
"use strict";

var _lastAudit=null;

var RETIRED_CSS_IDS=[
  "DVL_BUTTON_FOOTER_MIGRATION_CSS_0645",
  "DVL_BUTTON_TIMEFRAME_MIGRATION_CSS_0646",
  "DVL_BUTTON_HEADER_MIGRATION_CSS_0647",
  "DVL_BUTTON_PANEL_MIGRATION_CSS_0648",
  "DVL_BUTTON_DROPDOWN_OPTION_MIGRATION_CSS_0649",
  "DVL_BUTTON_KEYPAD_MIGRATION_CSS_0650",
  "DVL_BUTTON_ASSET_INDICATOR_DROPDOWN_MIGRATION_CSS_0651",
  "DVL_BUTTON_TOOLS_MIGRATION_CSS_0652",
  "DVL_BUTTON_PAPER_CONFIRM_MIGRATION_CSS_0653",
  "DVL_BUTTON_DRAWER_MIGRATION_CSS_0654",
  "DVL_BUTTON_TRADE_ACTION_MIGRATION_CSS_0655"
];

var MIG_CLASSES=[
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

  var retiredCssIdsAbsent=RETIRED_CSS_IDS.every(function(id){ return !document.getElementById(id); });
  var manifestCssPresent=cntId(styleEls,"DVL_SAFE_CSS_CLEANUP_BATCH1_CSS_0671")===1;

  var protectedCssStillPresent={
    touchGuard0639:       hasId("DVL_UI_TOUCH_GUARD_CSS_0639"),
    buttonSystem0641:     hasId("DVL_BUTTON_SYSTEM_CSS_0641"),
    buttonTokens0644:     hasId("DVL_BUTTON_TOKENS_CSS_0644"),
    priceScaleSync0658:   hasId("DVL_PRICE_SCALE_SYNC_CSS_0658"),
    priceScaleLock0659:   hasId("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659"),
    chartToolbarLock0660: hasId("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660"),
    chromeLock0661:       hasId("DVL_CHROME_FINAL_LOCK_CSS_0661"),
    gapDrawerLock0662:    hasId("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"),
    paperAnchorCss0663:   hasId("DVL_PAPER_LAYER_ANCHOR_CSS_0663"),
    inventoryCss0670:     hasId("DVL_FINAL_OPTIMIZATION_INVENTORY_CSS_0670")
  };
  var protectedCssPass=!!(
    protectedCssStillPresent.touchGuard0639 &&
    protectedCssStillPresent.buttonSystem0641 &&
    protectedCssStillPresent.buttonTokens0644 &&
    protectedCssStillPresent.priceScaleSync0658 &&
    protectedCssStillPresent.priceScaleLock0659 &&
    protectedCssStillPresent.chartToolbarLock0660 &&
    protectedCssStillPresent.chromeLock0661 &&
    protectedCssStillPresent.gapDrawerLock0662 &&
    protectedCssStillPresent.paperAnchorCss0663 &&
    protectedCssStillPresent.inventoryCss0670
  );

  var protectedModulesStillPresent={
    buttonSystem0655:     hasId("DVL_BUTTON_SYSTEM_MODULE_0655")||hasMarker("DVL_BUTTON_SYSTEM_MODULE_0655"),
    layoutContract0656:   hasId("DVL_LAYOUT_CONTRACT_MODULE_0656")||hasMarker("DVL_LAYOUT_CONTRACT_MODULE_0656"),
    layoutAssertions0657: hasId("DVL_LAYOUT_ASSERTIONS_MODULE_0657")||hasMarker("DVL_LAYOUT_ASSERTIONS_MODULE_0657"),
    paperAnchor0665:      hasId("DVL_PAPER_LAYER_ANCHOR_MODULE_0665"),
    oscillatorPub0666:    hasId("DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666"),
    runtimeInt0667:       hasId("DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"),
    featureGate0668:      hasId("DVL_FEATURE_GATE_AUDIT_MODULE_0668"),
    baselineFreeze0669:   hasId("DVL_BASELINE_FREEZE_MODULE_0669"),
    inventory0670:        hasId("DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670")
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
    protectedModulesStillPresent.inventory0670
  );

  var finalLocksStillPresent={
    priceScale0659: cntId(styleEls,"DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659")===1,
    toolbar0660:    cntId(styleEls,"DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660")===1,
    chrome0661:     cntId(styleEls,"DVL_CHROME_FINAL_LOCK_CSS_0661")===1,
    gapDrawer0662:  cntId(styleEls,"DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662")===1
  };
  var finalLocksPass=!!(
    finalLocksStillPresent.priceScale0659 &&
    finalLocksStillPresent.toolbar0660 &&
    finalLocksStillPresent.chrome0661 &&
    finalLocksStillPresent.gapDrawer0662
  );

  var buttonMigrationClassesStillInDom={};
  MIG_CLASSES.forEach(function(cls){
    buttonMigrationClassesStillInDom[cls]=document.querySelectorAll("."+cls).length;
  });

  var baselineFreezePass=false;
  var layoutStillMatchesFrozenBaseline=false;
  if(window.DVL_BASELINE_FREEZE){
    try{ baselineFreezePass=!!window.DVL_BASELINE_FREEZE.audit().pass; }catch(e){}
    try{ var cmp=window.DVL_BASELINE_FREEZE.compare(); layoutStillMatchesFrozenBaseline=!!(cmp&&cmp.layoutMatch); }catch(e){}
  }

  var inventoryPass=false;
  if(window.DVL_FINAL_OPTIMIZATION_INVENTORY){
    try{ inventoryPass=!!window.DVL_FINAL_OPTIMIZATION_INVENTORY.audit().pass; }catch(e){}
  }

  var blockers=[];
  if(!retiredCssIdsAbsent) blockers.push("Some retired CSS ids still present in DOM");
  if(!manifestCssPresent) blockers.push("DVL_SAFE_CSS_CLEANUP_BATCH1_CSS_0671 not found exactly once");
  if(!protectedCssPass) blockers.push("Some protected CSS blocks missing");
  if(!protectedModsPass) blockers.push("Some protected modules missing");
  if(!finalLocksPass) blockers.push("Some final lock CSS blocks missing or duplicated");
  if(!baselineFreezePass) blockers.push("DVL_BASELINE_FREEZE.audit().pass is false");
  if(!inventoryPass) blockers.push("DVL_FINAL_OPTIMIZATION_INVENTORY.audit().pass is false");
  if(!layoutStillMatchesFrozenBaseline) blockers.push("Layout does not match frozen baseline");

  var result={
    version:"0.671",
    phase:"safe_css_cleanup_batch1",
    pass:blockers.length===0,
    retiredCssIds:RETIRED_CSS_IDS,
    retiredCssIdsAbsent:retiredCssIdsAbsent,
    manifestCssPresent:manifestCssPresent,
    protectedCssStillPresent:protectedCssStillPresent,
    protectedModulesStillPresent:protectedModulesStillPresent,
    finalLocksStillPresent:finalLocksStillPresent,
    buttonMigrationClassesStillInDom:buttonMigrationClassesStillInDom,
    baselineFreezePass:baselineFreezePass,
    inventoryPass:inventoryPass,
    layoutStillMatchesFrozenBaseline:layoutStillMatchesFrozenBaseline,
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
  if(window.DVL_FINAL_OPTIMIZATION_INVENTORY && typeof window.DVL_FINAL_OPTIMIZATION_INVENTORY.run==="function"){
    return window.DVL_FINAL_OPTIMIZATION_INVENTORY.run().then(function(){ return audit(); });
  }
  return Promise.resolve(audit());
}

window.DVL_SAFE_CSS_CLEANUP_AUDIT={
  VERSION:"0.671",
  audit:audit,
  run:run,
  getLastAudit:getLastAudit
};

})();
</script>'''

# ── 8. Insert CSS+module before </head> ───────────────────────────────────────
OLD_ANCHOR = '''\
window.DVL_FINAL_OPTIMIZATION_INVENTORY={
  VERSION:"0.670",
  audit:audit,
  run:run,
  getLastAudit:getLastAudit
};

})();
</script>

</head>
<body>'''

NEW_ANCHOR = '''\
window.DVL_FINAL_OPTIMIZATION_INVENTORY={
  VERSION:"0.670",
  audit:audit,
  run:run,
  getLastAudit:getLastAudit
};

})();
</script>

''' + CSS_0671 + '\n\n' + MODULE_0671 + '''

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

# Extract module block
mod_start = html.index('<script id="DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671">')
mod_end   = html.index('</script>', mod_start) + len('</script>')
mod_block = html[mod_start:mod_end]

# Extract CSS inner
css_tag_s = html.index('<style id="DVL_SAFE_CSS_CLEANUP_BATCH1_CSS_0671">')
css_inn_s = html.index('>', css_tag_s) + 1
css_inn_e = html.index('</style>', css_tag_s)
css_inner = html[css_inn_s:css_inn_e]

# A1: Title
chk('<title>DVL Binance Live — Beta 0.671</title>' in html, "A1: title")
# A2: DVL_APP_VERSION
chk('const DVL_APP_VERSION = "Beta 0.671"' in html, "A2: DVL_APP_VERSION")
# A3: Badge
chk('>BETA 0.671</div></div>' in html, "A3: badge")
# A4: Changelog 0.671 on top, 0.670 preserved
chk('Beta 0.671 — Phase 4.1: safe CSS cleanup batch 1' in html, "A4: changelog 0.671")
chk('Beta 0.670 — Phase 4.0: Final optimization inventory' in html, "A4b: changelog 0.670 preserved")
# A5: CSS_0671 exactly once
chk(html.count('id="DVL_SAFE_CSS_CLEANUP_BATCH1_CSS_0671"') == 1, "A5: CSS_0671 count != 1")
# A6: MODULE_0671 exactly once
chk(html.count('id="DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671"') == 1, "A6: MODULE_0671 count != 1")
# A7: All 11 retired CSS ids absent
for rid in RETIRED:
    chk(f'id="{rid}"' not in html, f"A7: {rid} still present")
# A8: DVL_BUTTON_SYSTEM_MODULE_0655 marker still present (inline)
chk("DVL_BUTTON_SYSTEM_MODULE_0655" in html, "A8: BUTTON_SYSTEM_MODULE_0655 missing")
# A9: DVL_BUTTON_SYSTEM_CSS_0641 still present
chk('id="DVL_BUTTON_SYSTEM_CSS_0641"' in html, "A9: BUTTON_SYSTEM_CSS_0641 missing")
# A10: DVL_BUTTON_TOKENS_CSS_0644 still present
chk('id="DVL_BUTTON_TOKENS_CSS_0644"' in html, "A10: BUTTON_TOKENS_CSS_0644 missing")
# A11: DVL_UI_TOUCH_GUARD_CSS_0639 still present
chk('id="DVL_UI_TOUCH_GUARD_CSS_0639"' in html, "A11: UI_TOUCH_GUARD_CSS_0639 missing")
# A12: DVL_PRICE_SCALE_SYNC_CSS_0658 still present
chk('id="DVL_PRICE_SCALE_SYNC_CSS_0658"' in html, "A12: PRICE_SCALE_SYNC_CSS_0658 missing")
# A13: Final locks 0659-0662 exactly 1x each
chk(html.count('id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659"') == 1, "A13a: PRICE_SCALE_LOCK_0659")
chk(html.count('id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660"') == 1, "A13b: CHART_TOOLBAR_LOCK_0660")
chk(html.count('id="DVL_CHROME_FINAL_LOCK_CSS_0661"') == 1, "A13c: CHROME_LOCK_0661")
chk(html.count('id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"') == 1, "A13d: GAP_DRAWER_LOCK_0662")
# A14: DVL_PAPER_LAYER_ANCHOR_CSS_0663 still present
chk('id="DVL_PAPER_LAYER_ANCHOR_CSS_0663"' in html, "A14: PAPER_LAYER_ANCHOR_CSS_0663 missing")
# A15: Protected modules 0665-0670 still present
chk(html.count('id="DVL_PAPER_LAYER_ANCHOR_MODULE_0665"') == 1, "A15a: PAPER_LAYER_ANCHOR_MODULE_0665")
chk(html.count('id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666"') == 1, "A15b: OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666")
chk(html.count('id="DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"') == 1, "A15c: RUNTIME_INTEGRATION_AUDIT_MODULE_0667")
chk(html.count('id="DVL_FEATURE_GATE_AUDIT_MODULE_0668"') == 1, "A15d: FEATURE_GATE_AUDIT_MODULE_0668")
chk(html.count('id="DVL_BASELINE_FREEZE_MODULE_0669"') == 1, "A15e: BASELINE_FREEZE_MODULE_0669")
chk(html.count('id="DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670"') == 1, "A15f: FINAL_OPTIMIZATION_INVENTORY_MODULE_0670")
# A16: VERSION "0.671" in module
chk('VERSION:"0.671"' in mod_block, "A16: VERSION:\"0.671\" not found in module")
# A17: audit() exists and has pass logic
chk('function audit()' in mod_block, "A17: audit() function not found")
chk('pass:blockers.length===0' in mod_block, "A17b: pass logic not found")
# A18: baselineFreezePass reads DVL_BASELINE_FREEZE
chk('baselineFreezePass' in mod_block and 'DVL_BASELINE_FREEZE' in mod_block, "A18: baselineFreezePass logic missing")
# A19: inventoryPass reads DVL_FINAL_OPTIMIZATION_INVENTORY
chk('inventoryPass' in mod_block and 'DVL_FINAL_OPTIMIZATION_INVENTORY' in mod_block, "A19: inventoryPass logic missing")
# A20: layoutStillMatchesFrozenBaseline reads compare()
chk('layoutStillMatchesFrozenBaseline' in mod_block and 'compare()' in mod_block, "A20: layoutStillMatchesFrozenBaseline logic missing")
# A21: No window.drawSoon assignment
chk('window.drawSoon' not in mod_block, "A21: window.drawSoon found in 0671 module")
# A22: No requestAnimationFrame call
chk('requestAnimationFrame(' not in mod_block, "A22: requestAnimationFrame( found in 0671 module")
# A23: No setTimeout/setInterval
chk('setTimeout(' not in mod_block, "A23a: setTimeout( found in 0671 module")
chk('setInterval(' not in mod_block, "A23b: setInterval( found in 0671 module")
# A24: No observers
chk('new MutationObserver' not in mod_block, "A24a: new MutationObserver found in 0671 module")
chk('new ResizeObserver' not in mod_block, "A24b: new ResizeObserver found in 0671 module")
# A25: No DOM/style/classList mutation
chk('innerHTML' not in mod_block, "A25a: innerHTML in 0671 module")
chk('.style.' not in mod_block, "A25b: .style. in 0671 module")
chk('classList' not in mod_block, "A25c: classList in 0671 module")
chk('setAttribute(' not in mod_block, "A25d: setAttribute in 0671 module")
chk('appendChild(' not in mod_block, "A25e: appendChild in 0671 module")
# A26: No bad DVL_BUTTON_SYSTEM_MODULE_0656-0671
for n in range(656, 672):
    chk(f'id="DVL_BUTTON_SYSTEM_MODULE_0{n}"' not in html, f"A26: DVL_BUTTON_SYSTEM_MODULE_0{n} found")
# A27: Zero TODO_0671
chk('TODO_0671' not in html, "A27: TODO_0671 found")
# A28: JS brace balance
tag_end = mod_block.index('>') + 1
mod_js  = mod_block[tag_end:mod_block.rindex('</script>')]
ob = mod_js.count('{')
cb = mod_js.count('}')
chk(ob == cb, f"A28: brace mismatch ({ob} open vs {cb} close)")
# A29: CSS_0671 inner has no '{' (marker-only check)
chk('{' not in css_inner, "A29: CSS_0671 inner contains '{'")
# Additional: module has key fields
chk('retiredCssIds' in mod_block, "AX1: retiredCssIds not in module")
chk('retiredCssIdsAbsent' in mod_block, "AX2: retiredCssIdsAbsent not in module")
chk('manifestCssPresent' in mod_block, "AX3: manifestCssPresent not in module")
chk('protectedCssStillPresent' in mod_block, "AX4: protectedCssStillPresent not in module")
chk('protectedModulesStillPresent' in mod_block, "AX5: protectedModulesStillPresent not in module")
chk('finalLocksStillPresent' in mod_block, "AX6: finalLocksStillPresent not in module")
chk('buttonMigrationClassesStillInDom' in mod_block, "AX7: buttonMigrationClassesStillInDom not in module")
chk('return Promise.resolve(' in mod_block, "AX8: Promise.resolve not in run()")
# nested script check
chk(mod_block.count('<script') == 1, "AX9: nested <script> in 0671 module")

# JS syntax via node --check
try:
    tf = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
    tf.write(mod_js)
    tf.close()
    r = subprocess.run(['node','--check', tf.name], capture_output=True, text=True, timeout=10)
    os.unlink(tf.name)
    if r.returncode != 0:
        errors.append(f"A28-node: JS syntax error: {r.stderr[:300]}")
except Exception:
    pass

if errors:
    print(f"\n[FAIL] {len(errors)} assertion(s) failed:")
    for e in errors: print(" ", e)
    sys.exit(1)

print(f"\n[PASS] All assertions passed. File size: {len(html):,} chars")
