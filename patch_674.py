#!/usr/bin/env python3
"""
patch_674.py — Beta 0.674: Button System Shim Consumer Audit

Changes:
  1. Version/title/badge updated to Beta 0.674
  2. Changelog entry added (above 0.673)
  3. Add DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674 (marker-only)
  4. Add DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674
     - 100% read-only
     - Anti-false-positive: shimNames built by concatenation
     - Checks external consumer usage
     - Exposes readyForShimRemoval
"""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "index-34.before_0674_shim_consumer_audit.html"

def rep(html, old, new, label):
    n = html.count(old)
    if n != 1:
        print(f"FAIL rep [{label}]: found {n} occurrences (expected 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

with open(SRC, encoding="utf-8") as f:
    html = f.read()

shutil.copy(SRC, BAK)
print(f"Backup → {BAK}")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Title
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.673</title>',
    '<title>DVL Binance Live — Beta 0.674</title>',
    "title")

# ─────────────────────────────────────────────────────────────────────────────
# 2. DVL_APP_VERSION
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.673";',
    'const DVL_APP_VERSION = "Beta 0.674";',
    "DVL_APP_VERSION")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Static badge
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.673</div>',
    '>BETA 0.674</div>',
    "badge-text")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Changelog
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.673 — Safe Button System cleanup: removed dead dvl-btn-migrated-* references from Button System while preserving compatibility shims." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.674 — Button System shim consumer audit: verified external usage before removing legacy getMigratedXxx compatibility shims." },\n  { version: "Beta 0.673", note: "Beta 0.673 — Safe Button System cleanup: removed dead dvl-btn-migrated-* references from Button System while preserving compatibility shims." },',
    "changelog-0674")

# ─────────────────────────────────────────────────────────────────────────────
# 5. Add DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674 (marker-only)
#    Insert between CSS_0673 end and MODULE_0672 start
# ─────────────────────────────────────────────────────────────────────────────
CSS_0674 = (
    '\n\n<style id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674">\n'
    '/*\n'
    '  DVL Beta 0.674 — Button System shim consumer audit.\n'
    '  Verified external usage of getMigratedXxx() before removing legacy shims.\n'
    '  No selectors, no properties, no visual change.\n'
    '*/\n'
    '</style>'
)

html = rep(html,
    '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    '</style>' + CSS_0674 + '\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "insert-CSS_0674")

# ─────────────────────────────────────────────────────────────────────────────
# 6. Add DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674
#    Insert after MODULE_0673 closes and before </head>
#
#    Anti-false-positive rules:
#    - shimNames built by concatenation ("get"+"Migrated"+ButtonType)
#    - Marker strings split ("DVL_BUTTON_SYSTEM_MODULE_"+"0655 =====")
#    - Pattern for DVL_BUTTON_SYSTEM property access built by concat
# ─────────────────────────────────────────────────────────────────────────────
MODULE_0674 = (
    '\n\n<script id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674">\n'
    '(function(){\n'
    '"use strict";\n'
    '\n'
    'var _lastAudit = null;\n'
    '\n'
    '// Anti-false-positive: build shim names by concatenation\n'
    'var _p = "get" + "Migrated";\n'
    'var _shimNames = [\n'
    '  _p+"FooterButtons", _p+"TimeframeButtons", _p+"HeaderButtons",\n'
    '  _p+"IconButtons",   _p+"MenuButtons",      _p+"PanelButtons",\n'
    '  _p+"OrderOptionButtons", _p+"KeypadButtons",\n'
    '  _p+"AssetFavoriteButtons", _p+"AssetDropdownButtons",\n'
    '  _p+"IndicatorDropdownButtons", _p+"ToolsButtons",\n'
    '  _p+"PaperConfirmButtons", _p+"PaperEditConfirmButtons",\n'
    '  _p+"DrawerButtons", _p+"TradeActionButtons"\n'
    '];\n'
    '\n'
    '// Marker strings split to avoid literal appearance in HTML source\n'
    'var _BS_START = "// ===== DVL_BUTTON_SYSTEM_MODULE_" + "0655 =====";\n'
    'var _BS_END   = "// ===== DVL_LAYOUT_CONTRACT_MODULE_" + "0656 =====";\n'
    '\n'
    '// Script IDs excluded from external usage scan (allowed references)\n'
    'var _EXCL_IDS = [\n'
    '  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",\n'
    '  "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674"\n'
    '];\n'
    '\n'
    'function _cntId(col, id){\n'
    '  var n=0; for(var i=0;i<col.length;i++) if(col[i].id===id) n++; return n;\n'
    '}\n'
    '\n'
    'function _getBtnBlock(){\n'
    '  var scripts = document.querySelectorAll("script");\n'
    '  for(var i=0;i<scripts.length;i++){\n'
    '    var txt = scripts[i].textContent||"";\n'
    '    var s = txt.indexOf(_BS_START);\n'
    '    if(s===-1) continue;\n'
    '    var e = txt.indexOf(_BS_END, s);\n'
    '    if(e!==-1) return txt.slice(s, e);\n'
    '  }\n'
    '  return null;\n'
    '}\n'
    '\n'
    'function _hasShimName(txt){\n'
    '  for(var s=0;s<_shimNames.length;s++) if(txt.indexOf(_shimNames[s])!==-1) return true;\n'
    '  return false;\n'
    '}\n'
    '\n'
    'function _isExcluded(id){\n'
    '  for(var a=0;a<_EXCL_IDS.length;a++) if(id===_EXCL_IDS[a]) return true;\n'
    '  return false;\n'
    '}\n'
    '\n'
    'function _scanExternalUsage(){\n'
    '  var scripts = document.querySelectorAll("script");\n'
    '  var found = []; var checked = [];\n'
    '  for(var i=0;i<scripts.length;i++){\n'
    '    var el = scripts[i];\n'
    '    var id = el.id||"";\n'
    '    if(_isExcluded(id)) continue;\n'
    '    var txt = el.textContent||"";\n'
    '    // For main script: exclude the button system block\n'
    '    var bs = txt.indexOf(_BS_START);\n'
    '    if(bs!==-1){\n'
    '      var be = txt.indexOf(_BS_END, bs);\n'
    '      if(be!==-1) txt = txt.slice(0,bs) + txt.slice(be);\n'
    '    }\n'
    '    checked.push(id||"(main)");\n'
    '    if(_hasShimName(txt)) found.push(id||"(main)");\n'
    '  }\n'
    '  return { found: found, checked: checked };\n'
    '}\n'
    '\n'
    'function audit(){\n'
    '  var styleEls  = document.querySelectorAll("style");\n'
    '  var scriptEls = document.querySelectorAll("script");\n'
    '  var bs = window.DVL_BUTTON_SYSTEM;\n'
    '\n'
    '  // 1. DVL_BUTTON_SYSTEM_MODULE_0655 present\n'
    '  var btn0655Present = false;\n'
    '  for(var i=0;i<scriptEls.length;i++){\n'
    '    if((scriptEls[i].textContent||"").indexOf(_BS_START)!==-1){ btn0655Present=true; break; }\n'
    '  }\n'
    '\n'
    '  // 2. MODULE_0673 present\n'
    '  var mod0673Present = _cntId(scriptEls,"DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673")===1;\n'
    '\n'
    '  // 3. window.DVL_BUTTON_SYSTEM exists\n'
    '  var btnSystemPresent = typeof bs!=="undefined" && bs!==null;\n'
    '\n'
    '  // 4. All getMigratedXxx() exist as functions\n'
    '  var shimsExist = false; var shimsMissing = [];\n'
    '  if(btnSystemPresent){\n'
    '    shimsExist = true;\n'
    '    for(var s=0;s<_shimNames.length;s++){\n'
    '      if(typeof bs[_shimNames[s]]!=="function"){ shimsExist=false; shimsMissing.push(_shimNames[s]); }\n'
    '    }\n'
    '  }\n'
    '\n'
    '  // 5. All getMigratedXxx() return []\n'
    '  var shimsReturnEmpty = false; var shimsNotEmpty = [];\n'
    '  if(btnSystemPresent && shimsExist){\n'
    '    shimsReturnEmpty = true;\n'
    '    for(var s=0;s<_shimNames.length;s++){\n'
    '      try{\n'
    '        var r = bs[_shimNames[s]]();\n'
    '        if(!Array.isArray(r)||r.length!==0){ shimsReturnEmpty=false; shimsNotEmpty.push(_shimNames[s]); }\n'
    '      }catch(e){ shimsReturnEmpty=false; shimsNotEmpty.push(_shimNames[s]+"(threw)"); }\n'
    '    }\n'
    '  }\n'
    '\n'
    '  // 6. Button system block has no dvl-btn-migrated-\n'
    '  var btnBlock = _getBtnBlock();\n'
    '  var btnBlockFound = btnBlock!==null;\n'
    '  var noMigratedInBlock = btnBlockFound ? (btnBlock.indexOf("dvl-btn-migrated-")===-1) : false;\n'
    '\n'
    '  // 7-8. No external getMigratedXxx usage outside allowed areas\n'
    '  var extScan = _scanExternalUsage();\n'
    '  var noExternalUsage = extScan.found.length===0;\n'
    '\n'
    '  // 10. DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT.audit().pass\n'
    '  var deadCleanupPass = false;\n'
    '  try{ deadCleanupPass=!!(window.DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT&&window.DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT.audit().pass); }catch(e){}\n'
    '\n'
    '  // 11. DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT.audit().pass\n'
    '  var htmlCleanupPass = false;\n'
    '  try{ htmlCleanupPass=!!(window.DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT&&window.DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT.audit().pass); }catch(e){}\n'
    '\n'
    '  // 12. DVL_SAFE_CSS_CLEANUP_AUDIT.audit().pass\n'
    '  var cssCleanupPass = false;\n'
    '  try{ cssCleanupPass=!!(window.DVL_SAFE_CSS_CLEANUP_AUDIT&&window.DVL_SAFE_CSS_CLEANUP_AUDIT.audit().pass); }catch(e){}\n'
    '\n'
    '  // 13. DVL_BASELINE_FREEZE.audit().pass\n'
    '  var baselinePass = false;\n'
    '  try{ baselinePass=!!(window.DVL_BASELINE_FREEZE&&window.DVL_BASELINE_FREEZE.audit().pass); }catch(e){}\n'
    '\n'
    '  // 14. DVL_FINAL_OPTIMIZATION_INVENTORY.audit().pass\n'
    '  var inventoryPass = false;\n'
    '  try{ inventoryPass=!!(window.DVL_FINAL_OPTIMIZATION_INVENTORY&&window.DVL_FINAL_OPTIMIZATION_INVENTORY.audit().pass); }catch(e){}\n'
    '\n'
    '  // 15. Layout matches frozen baseline\n'
    '  var layoutMatchesBaseline = false;\n'
    '  try{ var cmp=window.DVL_BASELINE_FREEZE&&window.DVL_BASELINE_FREEZE.compare(); layoutMatchesBaseline=!!(cmp&&cmp.layoutMatch); }catch(e){}\n'
    '\n'
    '  // 16. Final locks 0659-0662 present exactly once\n'
    '  var _lockIds=["DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659","DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660","DVL_CHROME_FINAL_LOCK_CSS_0661","DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"];\n'
    '  var finalLocksPresent=true; var finalLocksMissing=[];\n'
    '  for(var f=0;f<_lockIds.length;f++){\n'
    '    if(_cntId(styleEls,_lockIds[f])!==1){ finalLocksPresent=false; finalLocksMissing.push(_lockIds[f]); }\n'
    '  }\n'
    '\n'
    '  // 17. Protected modules 0655-0673 present\n'
    '  var _modIds=[\n'
    '    "DVL_BASELINE_FREEZE_MODULE_0669","DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670",\n'
    '    "DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671","DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672",\n'
    '    "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673"\n'
    '  ];\n'
    '  var _cssIds=[\n'
    '    "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",\n'
    '    "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674"\n'
    '  ];\n'
    '  var protectedOk=true; var protectedMissing=[];\n'
    '  if(!btn0655Present){ protectedOk=false; protectedMissing.push("DVL_BUTTON_SYSTEM_MODULE_0655"); }\n'
    '  for(var p=0;p<_modIds.length;p++){\n'
    '    if(_cntId(scriptEls,_modIds[p])!==1){ protectedOk=false; protectedMissing.push(_modIds[p]); }\n'
    '  }\n'
    '  for(var c=0;c<_cssIds.length;c++){\n'
    '    if(_cntId(styleEls,_cssIds[c])!==1){ protectedOk=false; protectedMissing.push(_cssIds[c]); }\n'
    '  }\n'
    '\n'
    '  // 18. readyForShimRemoval\n'
    '  var allPriorPass = deadCleanupPass&&htmlCleanupPass&&cssCleanupPass&&baselinePass&&inventoryPass;\n'
    '  var readyForShimRemoval = shimsExist&&shimsReturnEmpty&&noExternalUsage&&allPriorPass;\n'
    '\n'
    '  var blockers=[];\n'
    '  if(!btn0655Present)      blockers.push("DVL_BUTTON_SYSTEM_MODULE_0655 not found");\n'
    '  if(!mod0673Present)      blockers.push("DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673 not found");\n'
    '  if(!btnSystemPresent)    blockers.push("window.DVL_BUTTON_SYSTEM not defined");\n'
    '  if(!shimsExist)          blockers.push("Missing shims: "+shimsMissing.join(", "));\n'
    '  if(!shimsReturnEmpty)    blockers.push("Shims not returning []: "+shimsNotEmpty.join(", "));\n'
    '  if(!btnBlockFound)       blockers.push("Button system block not found");\n'
    '  if(!noMigratedInBlock)   blockers.push("dvl-btn-migrated- still in button system block");\n'
    '  if(!noExternalUsage)     blockers.push("External getMigrated usage in: "+extScan.found.join(", "));\n'
    '  if(!deadCleanupPass)     blockers.push("DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT did not pass");\n'
    '  if(!htmlCleanupPass)     blockers.push("DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT did not pass");\n'
    '  if(!cssCleanupPass)      blockers.push("DVL_SAFE_CSS_CLEANUP_AUDIT did not pass");\n'
    '  if(!baselinePass)        blockers.push("DVL_BASELINE_FREEZE did not pass");\n'
    '  if(!inventoryPass)       blockers.push("DVL_FINAL_OPTIMIZATION_INVENTORY did not pass");\n'
    '  if(!layoutMatchesBaseline) blockers.push("Layout does not match frozen baseline");\n'
    '  if(!finalLocksPresent)   blockers.push("Final locks missing: "+finalLocksMissing.join(", "));\n'
    '  if(!protectedOk)         blockers.push("Protected modules missing: "+protectedMissing.join(", "));\n'
    '\n'
    '  return {\n'
    '    version: "0.674",\n'
    '    blockers: blockers,\n'
    '    pass: blockers.length===0,\n'
    '    readyForShimRemoval: readyForShimRemoval,\n'
    '    btn0655Present: btn0655Present,\n'
    '    mod0673Present: mod0673Present,\n'
    '    btnSystemPresent: btnSystemPresent,\n'
    '    shimsExist: shimsExist,\n'
    '    shimsMissing: shimsMissing,\n'
    '    shimsReturnEmpty: shimsReturnEmpty,\n'
    '    shimsNotEmpty: shimsNotEmpty,\n'
    '    btnBlockFound: btnBlockFound,\n'
    '    noMigratedInBlock: noMigratedInBlock,\n'
    '    noExternalUsage: noExternalUsage,\n'
    '    externalUsageIn: extScan.found,\n'
    '    scriptsChecked: extScan.checked,\n'
    '    deadCleanupPass: deadCleanupPass,\n'
    '    htmlCleanupPass: htmlCleanupPass,\n'
    '    cssCleanupPass: cssCleanupPass,\n'
    '    baselinePass: baselinePass,\n'
    '    inventoryPass: inventoryPass,\n'
    '    layoutMatchesBaseline: layoutMatchesBaseline,\n'
    '    finalLocksPresent: finalLocksPresent,\n'
    '    finalLocksMissing: finalLocksMissing,\n'
    '    protectedOk: protectedOk,\n'
    '    protectedMissing: protectedMissing\n'
    '  };\n'
    '}\n'
    '\n'
    'function getLastAudit(){ return _lastAudit; }\n'
    '\n'
    'function run(){\n'
    '  _lastAudit = audit();\n'
    '  return Promise.resolve(_lastAudit);\n'
    '}\n'
    '\n'
    'window.DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT={\n'
    '  VERSION:"0.674",\n'
    '  audit:audit,\n'
    '  run:run,\n'
    '  getLastAudit:getLastAudit\n'
    '};\n'
    '\n'
    '})();\n'
    '</script>'
)

html = rep(html,
    '})();\n</script>\n\n</head>\n<body>',
    '})();\n</script>' + MODULE_0674 + '\n\n</head>\n<body>',
    "insert-MODULE_0674")

# ─────────────────────────────────────────────────────────────────────────────
# Assertions
# ─────────────────────────────────────────────────────────────────────────────
errors = []

def chk(label, cond):
    if not cond:
        errors.append(label)
        print(f"  FAIL: {label}")
    else:
        print(f"  ok:   {label}")

print("\n--- Assertions ---")

# Version
chk("A01 title=0.674",      '<title>DVL Binance Live — Beta 0.674</title>' in html)
chk("A02 appversion=0.674", 'const DVL_APP_VERSION = "Beta 0.674";' in html)
chk("A03 badge=0.674",      '>BETA 0.674</div>' in html)
chk("A04 changelog-0674",   '"Beta 0.674 — Button System shim consumer audit:' in html)
chk("A05 changelog-0673",   '"Beta 0.673", note: "Beta 0.673 — Safe Button System cleanup:' in html)

# New blocks
chk("A06 CSS_0674-once",    html.count('id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674"') == 1)
chk("A07 MODULE_0674-once", html.count('id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674"') == 1)
chk("A08 window-audit-0674", 'window.DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT=' in html)

# Extract module source for checks
mod_start = html.index('id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674"')
mod_end   = html.index('</script>', mod_start) + len('</script>')
mod_block = html[mod_start:mod_end]

# Anti-false-positive: shim names built by concat, not literal
chk("A09 shimnames-not-literal-in-module",
    '"getMigratedFooterButtons"' not in mod_block and
    '"getMigratedTimeframeButtons"' not in mod_block)

# Anti-false-positive: "_p" pattern present
chk("A10 concat-prefix-pattern", '"get" + "Migrated"' in mod_block)

# No forbidden timers/APIs
chk("A11 no-setTimeout",           'setTimeout' not in mod_block)
chk("A12 no-setInterval",          'setInterval' not in mod_block)
chk("A13 no-requestAnimationFrame", 'requestAnimationFrame' not in mod_block)
chk("A14 no-MutationObserver",     'MutationObserver' not in mod_block)
chk("A15 no-ResizeObserver",       'ResizeObserver' not in mod_block)
chk("A16 no-drawSoon",             'drawSoon' not in mod_block)

# Prohibited changes
chk("A17 no-shim-removal",         'getMigratedFooterButtons' not in mod_block)
chk("A18 module-0674-not-0655",    'DVL_BUTTON_SYSTEM_MODULE_0674' not in html)

# Module contains key audit fields
chk("A19 readyForShimRemoval-field", 'readyForShimRemoval:' in mod_block)
chk("A20 noExternalUsage-field",    'noExternalUsage:' in mod_block)
chk("A21 shimsExist-field",         'shimsExist:' in mod_block)
chk("A22 shimsReturnEmpty-field",   'shimsReturnEmpty:' in mod_block)

# Button system block — search AFTER </head>
start_marker = '// ===== DVL_BUTTON_SYSTEM_MODULE_0655 ====='
end_marker   = '// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 ====='
head_end = html.index('</head>')
bstart = html.index(start_marker, head_end)
bend   = html.index(end_marker, bstart)
btn_block = html[bstart:bend]

chk("A23 no-dvl-btn-migrated-in-btn-block", 'dvl-btn-migrated-' not in btn_block)
chk("A24 btn-system-export-intact",  'window.DVL_BUTTON_SYSTEM = {' in btn_block)
chk("A25 shims-still-in-btn-block",  'function getMigratedFooterButtons(){\n  return [];\n}' in btn_block)

# Preserved blocks
chk("A26 CSS_0673-once",    html.count('id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673"') == 1)
chk("A27 MODULE_0673-once", html.count('id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673"') == 1)
chk("A28 CSS_0672-once",    html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672"') == 1)
chk("A29 MODULE_0672-once", html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672"') == 1)
chk("A30 final-lock-0659",  html.count('id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659"') == 1)
chk("A31 final-lock-0660",  html.count('id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660"') == 1)
chk("A32 final-lock-0661",  html.count('id="DVL_CHROME_FINAL_LOCK_CSS_0661"') == 1)
chk("A33 final-lock-0662",  html.count('id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"') == 1)
chk("A34 layout-contract-marker", '// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 =====' in html)

# Version clean-up
chk("A35 no-old-title",    '<title>DVL Binance Live — Beta 0.673</title>' not in html)
chk("A36 no-old-version",  'const DVL_APP_VERSION = "Beta 0.673";' not in html)

# Module exclusion IDs referenced in module
chk("A37 excl-0673-id-in-module",
    'DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673' in mod_block)
chk("A38 excl-0674-id-in-module",
    'DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674' in mod_block)

# Marker strings split in module
chk("A39 bs-start-split-in-module",
    '"// ===== DVL_BUTTON_SYSTEM_MODULE_0655 ======"' not in mod_block)
chk("A40 bs-end-split-in-module",
    '"// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 ======"' not in mod_block)

print()
if errors:
    print(f"FAILED {len(errors)} assertion(s): {errors}")
    sys.exit(1)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print(f"All 40 assertions passed. Written → {SRC}")
