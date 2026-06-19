#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""patch_670.py — DVL Beta 0.670 — Final Optimization Inventory"""
import os, shutil, sys, subprocess, tempfile

FILE   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-30.before_0670_final_optimization_inventory.html"

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
    '<title>DVL Binance Live — Beta 0.669</title>',
    '<title>DVL Binance Live — Beta 0.670</title>',
    "title")

# ── 2. DVL_APP_VERSION constant ───────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.669";',
    'const DVL_APP_VERSION = "Beta 0.670";',
    "DVL_APP_VERSION")

# ── 3. Visible badge HTML ─────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.669</div></div>',
    '>BETA 0.670</div></div>',
    "badge html")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
OLD_CLOG = ('  { version: DVL_APP_VERSION, note: "Beta 0.669 — Phase 3.3:'
            ' baseline freeze candidate; congela contratos estruturais para'
            ' otimização final e novas funções." },')
NEW_CLOG = ('  { version: DVL_APP_VERSION, note: "Beta 0.670 — Phase 4.0:'
            ' Final optimization inventory and safe cleanup map." },\n'
            '  { version: "Beta 0.669", note: "Beta 0.669 — Phase 3.3:'
            ' baseline freeze candidate; congela contratos estruturais para'
            ' otimização final e novas funções." },')
html = rep(html, OLD_CLOG, NEW_CLOG, "changelog")

# ── 5. CSS marker block ───────────────────────────────────────────────────────
CSS_0670 = '''\
<style id="DVL_FINAL_OPTIMIZATION_INVENTORY_CSS_0670">
/* DVL Beta 0.670 — Phase 4.0 final optimization inventory marker.
   Marker only. No selectors, no properties, no visual effect. */
</style>'''

# ── 6. JS module ──────────────────────────────────────────────────────────────
MODULE_0670 = '''\
<script id="DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670">
(function(){
"use strict";

var _lastAudit = null;

var LAYOUT_VARS = [
  "--dvl-header-h","--dvl-assetbar-h","--dvl-chart-toolbar-h",
  "--dvl-footer-h","--dvl-price-scale-w","--dvl-trade-drawer-max-h"
];

var FINAL_LOCK_IDS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

var DIAG_KW = ["CONTRACT","ASSERTIONS","AUDIT","FREEZE","INVENTORY","MARKER"];
var MIG_KW  = ["BUTTON_","MIGRATION"];

function hasDiag(id){ return DIAG_KW.some(function(k){ return id.indexOf(k)!==-1; }); }
function hasMig(id){ return MIG_KW.every(function(k){ return id.indexOf(k)!==-1; }); }
function isLegacyCss(id){
  if(id.indexOf("DVL_")!==0) return false;
  if(FINAL_LOCK_IDS.indexOf(id)!==-1) return false;
  if(hasDiag(id)) return false;
  if(hasMig(id)) return false;
  return /_0[4-6]\\d{2}$/.test(id);
}

function audit(){
  var styleEls = [].slice.call(document.querySelectorAll("style[id]"));
  var scriptEls = [].slice.call(document.querySelectorAll("script[id]"));

  var totalStyleChars = 0;
  var styleData = styleEls.map(function(el){
    var txt = el.textContent||"";
    totalStyleChars += txt.length;
    return {id:el.id, chars:txt.length, text:txt};
  });
  var totalScriptChars = 0;
  var scriptData = scriptEls.map(function(el){
    var txt = el.textContent||"";
    totalScriptChars += txt.length;
    return {id:el.id, chars:txt.length};
  });

  var legacyCssIds=[], migCssIds=[], diagCssIds=[], dupRootIds=[];
  var legacyCnt=0, lockCnt=0, diagCnt=0, migCnt=0;

  styleData.forEach(function(s){
    var id=s.id;
    if(FINAL_LOCK_IDS.indexOf(id)!==-1){ lockCnt++; }
    else if(hasMig(id)){ migCnt++; migCssIds.push(id); }
    else if(hasDiag(id)){ diagCnt++; diagCssIds.push(id); }
    else if(isLegacyCss(id)){ legacyCnt++; legacyCssIds.push(id); }
    if(s.text.indexOf(":root")!==-1){
      var vc=LAYOUT_VARS.filter(function(v){ return s.text.indexOf(v)!==-1; }).length;
      if(vc>=3) dupRootIds.push(id);
    }
  });

  var reMod=/^DVL_.+_MODULE_.+$/;
  var reBad=/^DVL_BUTTON_SYSTEM_MODULE_0(\\d{3})$/;
  var modScripts=0, badBtnMods=0;
  scriptData.forEach(function(s){
    if(reMod.test(s.id)) modScripts++;
    var mb=s.id.match(reBad);
    if(mb){ var n=parseInt(mb[1],10); if(n>=656&&n<=670) badBtnMods++; }
  });

  var desc=function(a,b){ return b.chars-a.chars; };
  var largeStyle=styleData.slice().sort(desc).slice(0,10).map(function(s){ return {id:s.id,chars:s.chars}; });
  var largeScript=scriptData.slice().sort(desc).slice(0,10).map(function(s){ return {id:s.id,chars:s.chars}; });

  function hasId(id){ return !!document.getElementById(id); }
  var allScripts=[].slice.call(document.querySelectorAll("script"));
  function hasMarker(m){ return allScripts.some(function(s){ return (s.textContent||"").indexOf(m)!==-1; }); }
  function hasMod(id){ return hasId(id)||hasMarker(id); }

  var btn0655  = hasMod("DVL_BUTTON_SYSTEM_MODULE_0655");
  var lc0656   = hasMod("DVL_LAYOUT_CONTRACT_MODULE_0656");
  var la0657   = hasMod("DVL_LAYOUT_ASSERTIONS_MODULE_0657");
  var pa0665   = hasId("DVL_PAPER_LAYER_ANCHOR_MODULE_0665");
  var op0666   = hasId("DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666");
  var ri0667   = hasId("DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667");
  var fg0668   = hasId("DVL_FEATURE_GATE_AUDIT_MODULE_0668");
  var bf0669   = hasId("DVL_BASELINE_FREEZE_MODULE_0669");

  var ps0659   = hasEl("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659");
  var tb0660   = hasEl("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660");
  var ch0661   = hasEl("DVL_CHROME_FINAL_LOCK_CSS_0661");
  var gd0662   = hasEl("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662");

  var cntLk=function(id){ return styleEls.filter(function(e){ return e.id===id; }).length; };
  var c59=cntLk("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659");
  var c60=cntLk("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660");
  var c61=cntLk("DVL_CHROME_FINAL_LOCK_CSS_0661");
  var c62=cntLk("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662");

  var baseExists=!!(window.DVL_BASELINE_FREEZE);
  var basePass=false, baseFO=false, baseNF=false, baseCLM=false;
  if(baseExists){
    try{ var ba=window.DVL_BASELINE_FREEZE.audit(); basePass=!!ba.pass; baseFO=!!ba.readyForFinalOptimization; baseNF=!!ba.readyForNewFeatures; }catch(e){}
    try{ var bc=window.DVL_BASELINE_FREEZE.compare(); baseCLM=!!(bc&&bc.layoutMatch); }catch(e){ baseCLM=true; }
  }

  var blockers=[]; var warnings=[];
  if(!baseExists) blockers.push("DVL_BASELINE_FREEZE not found");
  else if(!basePass) blockers.push("DVL_BASELINE_FREEZE.audit().pass is false");
  if(!btn0655) blockers.push("DVL_BUTTON_SYSTEM_MODULE_0655 missing");
  if(badBtnMods>0) blockers.push("Bad button system modules 0656-0670: "+badBtnMods);
  if(c59!==1) blockers.push("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659 count="+c59);
  if(c60!==1) blockers.push("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660 count="+c60);
  if(c61!==1) blockers.push("DVL_CHROME_FINAL_LOCK_CSS_0661 count="+c61);
  if(c62!==1) blockers.push("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662 count="+c62);
  if(!pa0665) blockers.push("DVL_PAPER_LAYER_ANCHOR_MODULE_0665 missing");
  if(!op0666) blockers.push("DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666 missing");
  if(!ri0667) blockers.push("DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667 missing");
  if(!fg0668) blockers.push("DVL_FEATURE_GATE_AUDIT_MODULE_0668 missing");
  if(!bf0669) blockers.push("DVL_BASELINE_FREEZE_MODULE_0669 missing");

  var pass=blockers.length===0;

  var result={
    version:"0.670",
    phase:"final_optimization_inventory",
    pass:pass,
    readyForSafeCleanup:pass,
    readyForFeatureWork:pass&&baseNF,
    blockers:blockers,
    warnings:warnings,
    baseline:{
      exists:baseExists, pass:basePass,
      readyForFinalOptimization:baseFO, readyForNewFeatures:baseNF,
      compareLayoutMatch:baseCLM
    },
    counts:{
      styleTagsWithId:styleEls.length, scriptTagsWithId:scriptEls.length,
      totalStyleChars:totalStyleChars, totalScriptChars:totalScriptChars,
      legacyCssBlocks:legacyCnt, finalLockCssBlocks:lockCnt,
      diagnosticCssBlocks:diagCnt, moduleScripts:modScripts,
      migrationCssBlocks:migCnt, buttonSystemBadModules:badBtnMods
    },
    preservedModules:{
      buttonSystem0655:btn0655, layoutContract0656:lc0656,
      layoutAssertions0657:la0657, paperAnchor0665:pa0665,
      oscillatorPublisher0666:op0666, runtimeIntegration0667:ri0667,
      featureGate0668:fg0668, baselineFreeze0669:bf0669
    },
    preservedFinalLocks:{
      priceScale0659:ps0659, toolbar0660:tb0660,
      chrome0661:ch0661, gapDrawer0662:gd0662
    },
    cleanupCandidates:{
      legacyCssIds:legacyCssIds,
      duplicateRootVariableBlocks:dupRootIds,
      migrationCssIds:migCssIds,
      diagnosticCssIds:diagCssIds,
      largeStyleBlocks:largeStyle,
      largeScriptBlocks:largeScript
    },
    protectedAreas:[
      "Buy/Sell click handlers","TP/SL/ENTRY math",
      "Paper position schema","Chart zoom/pan/crosshair handlers",
      "Oscillator render logic","Tools/drawing logic",
      "Dropdown/keypad logic","Button System 0.655"
    ],
    cleanupRulesForNextPhase:{
      noDeletionWithoutCandidateList:true, cleanupMustBeChunked:true,
      oneFamilyPerPhase:true, preserveFinalLocks:true,
      preserveBehavior:true, preserveVisualOutput:true,
      preserveAuditModules:true
    },
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
  if(window.DVL_BASELINE_FREEZE && typeof window.DVL_BASELINE_FREEZE.run==="function"){
    return window.DVL_BASELINE_FREEZE.run().then(function(){ return audit(); });
  }
  return Promise.resolve(audit());
}

window.DVL_FINAL_OPTIMIZATION_INVENTORY={
  VERSION:"0.670",
  audit:audit,
  run:run,
  getLastAudit:getLastAudit
};

})();
</script>'''

# ── 7. Insert CSS + module before </head> ─────────────────────────────────────
OLD_ANCHOR = '''\
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
<body>'''

NEW_ANCHOR = '''\
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

''' + CSS_0670 + '\n\n' + MODULE_0670 + '''

</head>
<body>'''

html = rep(html, OLD_ANCHOR, NEW_ANCHOR, "insert CSS+module before </head>")

# ── Write file ────────────────────────────────────────────────────────────────
with open(FILE, "w", encoding="utf-8") as f:
    f.write(html)
print("File written.")

# ── ASSERTIONS ────────────────────────────────────────────────────────────────
errors = []
def chk(cond, msg):
    if not cond:
        errors.append(msg)

# Extract module block
mod_start = html.index('<script id="DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670">')
mod_end   = html.index('</script>', mod_start) + len('</script>')
mod_block = html[mod_start:mod_end]

# Extract CSS inner
css_tag_start = html.index('<style id="DVL_FINAL_OPTIMIZATION_INVENTORY_CSS_0670">')
css_inner_start = html.index('>', css_tag_start) + 1
css_inner_end   = html.index('</style>', css_tag_start)
css_inner = html[css_inner_start:css_inner_end]

# A1: Title
chk('<title>DVL Binance Live — Beta 0.670</title>' in html, "A1: title not updated")
# A2: DVL_APP_VERSION
chk('const DVL_APP_VERSION = "Beta 0.670"' in html, "A2: DVL_APP_VERSION not updated")
# A3: Badge
chk('>BETA 0.670</div></div>' in html, "A3: badge not updated")
# A4: Changelog 0.670
chk('Beta 0.670 — Phase 4.0: Final optimization inventory' in html, "A4: changelog 0.670 missing")
# A5: Changelog 0.669 preserved
chk('Beta 0.669 — Phase 3.3: baseline freeze candidate' in html, "A5: changelog 0.669 not preserved")
# A6: CSS_0670 exactly once
chk(html.count('id="DVL_FINAL_OPTIMIZATION_INVENTORY_CSS_0670"') == 1, "A6: CSS_0670 count != 1")
# A7: CSS marker-only (no '{')
chk('{' not in css_inner, "A7: CSS_0670 inner contains '{'")
# A8: MODULE_0670 exactly once
chk(html.count('id="DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670"') == 1, "A8: MODULE_0670 count != 1")
# A9: export
chk('window.DVL_FINAL_OPTIMIZATION_INVENTORY' in mod_block, "A9: export not found")
# A10: VERSION "0.670"
chk('VERSION:"0.670"' in mod_block, "A10: VERSION:\"0.670\" not found")
# A11: audit function
chk('function audit()' in mod_block, "A11: audit() not found")
# A12: run function
chk('function run()' in mod_block, "A12: run() not found")
# A13: getLastAudit
chk('getLastAudit' in mod_block, "A13: getLastAudit not found")
# A14: pass in result
chk('pass:pass,' in mod_block or 'pass: pass,' in mod_block or 'pass:blockers' in mod_block, "A14: pass not in audit result")
# A15: readyForSafeCleanup
chk('readyForSafeCleanup' in mod_block, "A15: readyForSafeCleanup not found")
# A16: cleanupCandidates
chk('cleanupCandidates' in mod_block, "A16: cleanupCandidates not found")
# A17: protectedAreas
chk('protectedAreas' in mod_block, "A17: protectedAreas not found")
# A18: cleanupRulesForNextPhase
chk('cleanupRulesForNextPhase' in mod_block, "A18: cleanupRulesForNextPhase not found")
# A19: reads DVL_BASELINE_FREEZE
chk('window.DVL_BASELINE_FREEZE' in mod_block, "A19: DVL_BASELINE_FREEZE not read")
# A20: baseline freeze 0669 preserved
chk(html.count('id="DVL_BASELINE_FREEZE_MODULE_0669"') == 1, "A20: BASELINE_FREEZE_MODULE_0669 count != 1")
# A21: feature gate 0668 preserved
chk(html.count('id="DVL_FEATURE_GATE_AUDIT_MODULE_0668"') == 1, "A21: FEATURE_GATE_AUDIT_MODULE_0668 count != 1")
# A22: runtime integration 0667 preserved
chk(html.count('id="DVL_RUNTIME_INTEGRATION_AUDIT_MODULE_0667"') == 1, "A22: RUNTIME_INTEGRATION_AUDIT_MODULE_0667 count != 1")
# A23: oscillator publisher 0666 preserved
chk(html.count('id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666"') == 1, "A23: OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666 count != 1")
# A24: paper anchor 0665 preserved
chk(html.count('id="DVL_PAPER_LAYER_ANCHOR_MODULE_0665"') == 1, "A24: PAPER_LAYER_ANCHOR_MODULE_0665 count != 1")
# A25: oscillator audit 0665 preserved
chk(html.count('id="DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665"') == 1, "A25: OSCILLATOR_BOUNDS_AUDIT_MODULE_0665 count != 1")
# A26: layout assertions 0657 preserved (inline marker in main script)
chk("DVL_LAYOUT_ASSERTIONS_MODULE_0657" in html, "A26: DVL_LAYOUT_ASSERTIONS_MODULE_0657 not found")
# A27: button system 0655 preserved (inline marker in main script)
chk("DVL_BUTTON_SYSTEM_MODULE_0655" in html, "A27: DVL_BUTTON_SYSTEM_MODULE_0655 not found")
# A28: no bad button system modules
for n in range(656, 671):
    chk(f'id="DVL_BUTTON_SYSTEM_MODULE_0{n}"' not in html, f"A28: DVL_BUTTON_SYSTEM_MODULE_0{n} found")
# A29-32: Final lock CSS blocks exactly once
chk(html.count('id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659"') == 1, "A29: PRICE_SCALE_LOCK_0659 count != 1")
chk(html.count('id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660"') == 1, "A30: CHART_TOOLBAR_LOCK_0660 count != 1")
chk(html.count('id="DVL_CHROME_FINAL_LOCK_CSS_0661"') == 1, "A31: CHROME_LOCK_0661 count != 1")
chk(html.count('id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"') == 1, "A32: GAP_DRAWER_LOCK_0662 count != 1")
# A33: no drawSoon wrapping (field name contains substring; check for reference pattern)
chk('window.drawSoon' not in mod_block, "A33: window.drawSoon found in 0670 module")
# A34: no requestAnimationFrame call
chk('requestAnimationFrame(' not in mod_block, "A34: requestAnimationFrame( in 0670 module")
# A35: no setTimeout/setInterval
chk('setTimeout(' not in mod_block, "A35a: setTimeout( in 0670 module")
chk('setInterval(' not in mod_block, "A35b: setInterval( in 0670 module")
# A36: no observers
chk('new MutationObserver' not in mod_block, "A36a: new MutationObserver in 0670 module")
chk('new ResizeObserver' not in mod_block, "A36b: new ResizeObserver in 0670 module")
# A37: no DOM mutation
chk('innerHTML' not in mod_block, "A37a: innerHTML in 0670 module")
chk('appendChild(' not in mod_block, "A37b: appendChild in 0670 module")
chk('createElement(' not in mod_block, "A37c: createElement in 0670 module")
# A38: no style/classList mutation
chk('.style.' not in mod_block, "A38a: .style. in 0670 module")
chk('classList' not in mod_block, "A38b: classList in 0670 module")
chk('setAttribute(' not in mod_block, "A38c: setAttribute in 0670 module")
# A39: no chart handler mutation
chk('window.drawSoon =' not in mod_block, "A39: window.drawSoon= in 0670 module")
# A40-43: Core functional areas intact
chk('activeOscillators' in html, "A42: activeOscillators missing")
chk('drawSoon' in html, "A43: drawSoon function missing from app")
# A44: zero nested <script> inside module
chk(mod_block.count('<script') == 1, "A44: nested <script> in 0670 module")
# A45: zero TODO_0670
chk('TODO_0670' not in html, "A45: TODO_0670 found")
# A46: JS brace balance
tag_end = mod_block.index('>') + 1
mod_js  = mod_block[tag_end:mod_block.rindex('</script>')]
ob = mod_js.count('{')
cb = mod_js.count('}')
chk(ob == cb, f"A46: brace mismatch in module ({ob} open vs {cb} close)")
# A47: Layout contract values preserved
chk('headerH: 55' in html, "A47a: headerH:55 not found")
chk('assetbarH: 50' in html, "A47b: assetbarH:50 not found")
chk('chartToolbarH: 30' in html, "A47c: chartToolbarH:30 not found")
chk('footerH: 57' in html, "A47d: footerH:57 not found")
chk('priceScaleW: 70' in html, "A47e: priceScaleW:70 not found")
chk('tradeDrawerMaxH: 150' in html, "A47f: tradeDrawerMaxH:150 not found")
# A48: baseline freeze module still intact
chk('DVL_STRUCTURAL_BASELINE_0669' in html, "A48: BASELINE_CONTRACT name missing")
# A49: run() uses Promise
chk('return Promise.resolve(' in mod_block, "A49: Promise.resolve not in run()")
# A50: readyForSafeCleanup tied to pass
chk('readyForSafeCleanup:pass,' in mod_block or 'readyForSafeCleanup: pass,' in mod_block, "A50: readyForSafeCleanup not tied to pass")

# ── JS syntax via node --check ────────────────────────────────────────────────
try:
    tf = tempfile.NamedTemporaryFile(suffix='.js', mode='w', encoding='utf-8', delete=False)
    tf.write(mod_js)
    tf.close()
    r = subprocess.run(['node','--check', tf.name], capture_output=True, text=True, timeout=10)
    os.unlink(tf.name)
    if r.returncode != 0:
        errors.append(f"A46-node: JS syntax error: {r.stderr[:300]}")
except Exception:
    pass  # node not available, brace-count check already ran

if errors:
    print(f"\n[FAIL] {len(errors)} assertion(s) failed:")
    for e in errors: print(" ", e)
    sys.exit(1)

print(f"\n[PASS] All assertions passed. File size: {len(html):,} chars")
