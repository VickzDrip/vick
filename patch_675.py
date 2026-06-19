#!/usr/bin/env python3
"""
patch_675.py — Beta 0.675: Remove getMigratedXxx() shims from DVL_BUTTON_SYSTEM

Changes:
  1. Version/title/badge updated to Beta 0.675
  2. Changelog entry added (above 0.674)
  3. Remove 16 getMigratedXxx() function declarations from DVL_BUTTON_SYSTEM_MODULE_0655
  4. Remove audit() vars that called shims (menuEls, panelControlEls, orderOptionEls, drawerEls,
     paperConfirmMigrated, paperEditConfirmMigrated, assetFavoriteMigrated,
     assetDropdownMigrated, indicatorDropdownMigrated)
  5. Remove shim-dependent fields from audit() return object
  6. Remove getMigratedXxx exports from window.DVL_BUTTON_SYSTEM
  7. Add DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675 (marker-only)
  8. Add DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675
"""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "index-35.before_0675_shim_removal.html"

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
    '<title>DVL Binance Live — Beta 0.674</title>',
    '<title>DVL Binance Live — Beta 0.675</title>',
    "title")

# ─────────────────────────────────────────────────────────────────────────────
# 2. DVL_APP_VERSION
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.674";',
    'const DVL_APP_VERSION = "Beta 0.675";',
    "DVL_APP_VERSION")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Static badge
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.674</div>',
    '>BETA 0.675</div>',
    "badge-text")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Changelog
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.674 — Button System shim consumer audit: verified external usage before removing legacy getMigratedXxx compatibility shims." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.675 — Removed legacy getMigratedXxx Button System shims after 0.674 confirmed no external consumers." },\n  { version: "Beta 0.674", note: "Beta 0.674 — Button System shim consumer audit: verified external usage before removing legacy getMigratedXxx compatibility shims." },',
    "changelog-0675")

# ─────────────────────────────────────────────────────────────────────────────
# 5. Remove 16 getMigratedXxx() function declarations
# ─────────────────────────────────────────────────────────────────────────────
_shim_names = [
    'getMigratedFooterButtons',
    'getMigratedTimeframeButtons',
    'getMigratedHeaderButtons',
    'getMigratedIconButtons',
    'getMigratedMenuButtons',
    'getMigratedPanelButtons',
    'getMigratedOrderOptionButtons',
    'getMigratedKeypadButtons',
    'getMigratedAssetFavoriteButtons',
    'getMigratedAssetDropdownButtons',
    'getMigratedIndicatorDropdownButtons',
    'getMigratedToolsButtons',
    'getMigratedPaperConfirmButtons',
    'getMigratedPaperEditConfirmButtons',
    'getMigratedDrawerButtons',
    'getMigratedTradeActionButtons',
]
_shim_funcs = '\n\n'.join(f"function {n}(){{\n  return [];\n}}" for n in _shim_names)

html = rep(html,
    _shim_funcs + '\n\nfunction audit(){',
    'function audit(){',
    "remove-16-shim-functions")

# ─────────────────────────────────────────────────────────────────────────────
# 6. Remove audit() shim var declarations — block 1 (menuEls, panelControlEls, orderOptionEls)
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    "  var menuEls = getMigratedMenuButtons();\n"
    "  var panelControlEls = getMigratedPanelButtons();\n"
    "  var allPanelEls = listByRole('panel');\n"
    "  var panelControlMigrated = panelControlEls.length;\n"
    "  var orderOptionEls = getMigratedOrderOptionButtons();",

    "  var allPanelEls = listByRole('panel');",
    "audit-remove-menuEls-block")

# ─────────────────────────────────────────────────────────────────────────────
# 7. Remove audit() shim var — drawerEls
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    "  var drawerEls = getMigratedDrawerButtons();\n"
    "  var drawerTotal = 0;",

    "  var drawerTotal = 0;",
    "audit-remove-drawerEls")

# ─────────────────────────────────────────────────────────────────────────────
# 8. Remove audit() shim var declarations — block 2 (paper/asset/indicator migrated)
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    "  var paperConfirmMigrated = getMigratedPaperConfirmButtons().length;\n"
    "  var paperEditConfirmMigrated = getMigratedPaperEditConfirmButtons().length;\n"
    "  var assetFavoriteMigrated = getMigratedAssetFavoriteButtons().length;\n"
    "  var assetDropdownMigrated = getMigratedAssetDropdownButtons().length;\n"
    "  var indicatorDropdownMigrated = getMigratedIndicatorDropdownButtons().length;\n"
    "  return {",

    "  return {",
    "audit-remove-migrated-vars")

# ─────────────────────────────────────────────────────────────────────────────
# 9. Remove return object: menuTotal, menuMigrated, panelControlMigrated, drawerMigrated
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    "    menuTotal:                 getMigratedMenuButtons().length,\n"
    "    menuMigrated:              menuEls.length,\n"
    "    panelControlTotal:         allPanelEls.length,\n"
    "    panelControlMigrated:      panelControlMigrated,\n"
    "    drawerTotal:               drawerTotal,\n"
    "    drawerMigrated:            drawerEls.length,",

    "    panelControlTotal:         allPanelEls.length,\n"
    "    drawerTotal:               drawerTotal,",
    "return-remove-menuTotal-block")

# ─────────────────────────────────────────────────────────────────────────────
# 10. Remove return object: orderOptionMigrated
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    "    orderOptionTotal:          orderOptionTotal,\n"
    "    orderOptionMigrated:       orderOptionEls.length,",

    "    orderOptionTotal:          orderOptionTotal,",
    "return-remove-orderOptionMigrated")

# ─────────────────────────────────────────────────────────────────────────────
# 11. Remove return object: paperConfirmMigrated, paperEditConfirmMigrated,
#     assetFavoriteMigrated, assetDropdownMigrated, indicatorDropdownMigrated
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    "    paperConfirmTotal:         paperConfirmTotal,\n"
    "    paperConfirmMigrated:      paperConfirmMigrated,\n"
    "    paperEditConfirmTotal:     paperEditConfirmTotal,\n"
    "    paperEditConfirmMigrated:  paperEditConfirmMigrated,\n"
    "    assetFavoriteTotal:        assetFavoriteTotal,\n"
    "    assetFavoriteMigrated:     assetFavoriteMigrated,\n"
    "    assetDropdownTotal:        assetDropdownTotal,\n"
    "    assetDropdownMigrated:     assetDropdownMigrated,\n"
    "    indicatorDropdownTotal:    indicatorDropdownTotal,\n"
    "    indicatorDropdownMigrated: indicatorDropdownMigrated",

    "    paperConfirmTotal:         paperConfirmTotal,\n"
    "    paperEditConfirmTotal:     paperEditConfirmTotal,\n"
    "    assetFavoriteTotal:        assetFavoriteTotal,\n"
    "    assetDropdownTotal:        assetDropdownTotal,\n"
    "    indicatorDropdownTotal:    indicatorDropdownTotal",
    "return-remove-migrated-fields")

# ─────────────────────────────────────────────────────────────────────────────
# 12. Remove getMigratedXxx exports from window.DVL_BUTTON_SYSTEM
# ─────────────────────────────────────────────────────────────────────────────
_export_block = (
    "  listByRole:                        listByRole,\n"
    "  getMigratedFooterButtons:          getMigratedFooterButtons,\n"
    "  getMigratedTimeframeButtons:       getMigratedTimeframeButtons,\n"
    "  getMigratedHeaderButtons:          getMigratedHeaderButtons,\n"
    "  getMigratedIconButtons:            getMigratedIconButtons,\n"
    "  getMigratedMenuButtons:            getMigratedMenuButtons,\n"
    "  getMigratedPanelButtons:           getMigratedPanelButtons,\n"
    "  getMigratedOrderOptionButtons:     getMigratedOrderOptionButtons,\n"
    "  getMigratedKeypadButtons:          getMigratedKeypadButtons,\n"
    "  getMigratedAssetFavoriteButtons:   getMigratedAssetFavoriteButtons,\n"
    "  getMigratedAssetDropdownButtons:   getMigratedAssetDropdownButtons,\n"
    "  getMigratedIndicatorDropdownButtons: getMigratedIndicatorDropdownButtons,\n"
    "  getMigratedToolsButtons:           getMigratedToolsButtons,\n"
    "  getMigratedPaperConfirmButtons:    getMigratedPaperConfirmButtons,\n"
    "  getMigratedPaperEditConfirmButtons: getMigratedPaperEditConfirmButtons,\n"
    "  getMigratedDrawerButtons:          getMigratedDrawerButtons,\n"
    "  getMigratedTradeActionButtons:     getMigratedTradeActionButtons,\n"
    "  audit:                             audit,"
)
html = rep(html,
    _export_block,
    "  listByRole:                        listByRole,\n"
    "  audit:                             audit,",
    "export-remove-getMigrated-block")

# ─────────────────────────────────────────────────────────────────────────────
# 13. Add DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675 (marker-only)
# ─────────────────────────────────────────────────────────────────────────────
CSS_0675 = (
    '\n\n<style id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675">\n'
    '/*\n'
    '  DVL Beta 0.675 — Button System shim removal.\n'
    '  Removed legacy getMigratedXxx() shims from DVL_BUTTON_SYSTEM after 0.674 confirmed no external consumers.\n'
    '  No selectors, no properties, no visual change.\n'
    '*/\n'
    '</style>'
)

html = rep(html,
    '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    '</style>' + CSS_0675 + '\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "insert-CSS_0675")

# ─────────────────────────────────────────────────────────────────────────────
# 14. Add DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675
#
#     Anti-false-positive rules:
#     - Old shim names built by concatenation
#     - "dvl-btn-migrated-" built by concatenation
#     - Marker strings split
# ─────────────────────────────────────────────────────────────────────────────
MODULE_0675 = (
    '\n\n<script id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675">\n'
    '(function(){\n'
    '"use strict";\n'
    '\n'
    'var _lastAudit = null;\n'
    '\n'
    '// Anti-false-positive: old shim names by concat\n'
    'var _p = "get" + "Migrated";\n'
    'var _oldShimNames = [\n'
    '  _p+"FooterButtons",    _p+"TimeframeButtons", _p+"HeaderButtons",\n'
    '  _p+"IconButtons",      _p+"MenuButtons",      _p+"PanelButtons",\n'
    '  _p+"OrderOptionButtons", _p+"KeypadButtons",\n'
    '  _p+"AssetFavoriteButtons", _p+"AssetDropdownButtons",\n'
    '  _p+"IndicatorDropdownButtons", _p+"ToolsButtons",\n'
    '  _p+"PaperConfirmButtons", _p+"PaperEditConfirmButtons",\n'
    '  _p+"DrawerButtons",    _p+"TradeActionButtons"\n'
    '];\n'
    '\n'
    '// Anti-false-positive: migration token by concat\n'
    'var _migratedToken = "dvl-btn-" + "migrated-";\n'
    'var _getMigratedText = "get" + "Migrated";\n'
    'var _clsContains = "classList" + ".contains(\'";\n'
    'var _clsAdd      = "classList" + ".add(\'";\n'
    'var _containsMigrated = _clsContains + _migratedToken;\n'
    'var _addMigrated      = _clsAdd + _migratedToken;\n'
    '\n'
    '// Marker strings split\n'
    'var _BS_START = "// ===== DVL_BUTTON_SYSTEM_MODULE_" + "0655 =====";\n'
    'var _BS_END   = "// ===== DVL_LAYOUT_CONTRACT_MODULE_" + "0656 =====";\n'
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
    '  // 2. MODULE_0674 present (pre-removal history)\n'
    '  var mod0674Present = _cntId(scriptEls,"DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674")===1;\n'
    '\n'
    '  // 3. window.DVL_BUTTON_SYSTEM exists\n'
    '  var btnSystemPresent = typeof bs!=="undefined" && bs!==null;\n'
    '\n'
    '  // 4-6. Core functions preserved\n'
    '  var auditFn  = btnSystemPresent && typeof bs.audit==="function";\n'
    '  var refreshFn= btnSystemPresent && typeof bs.refresh==="function";\n'
    '  var listByFn = btnSystemPresent && typeof bs.listByRole==="function";\n'
    '\n'
    '  // 7. No getMigratedXxx in window.DVL_BUTTON_SYSTEM\n'
    '  var shimsPurged = true; var shimsStillPresent = [];\n'
    '  if(btnSystemPresent){\n'
    '    for(var s=0;s<_oldShimNames.length;s++){\n'
    '      if(typeof bs[_oldShimNames[s]]==="function"){\n'
    '        shimsPurged=false; shimsStillPresent.push(_oldShimNames[s]);\n'
    '      }\n'
    '    }\n'
    '  }\n'
    '\n'
    '  // 8-11. Button system block text checks\n'
    '  var btnBlock = _getBtnBlock();\n'
    '  var btnBlockFound = btnBlock!==null;\n'
    '  var noGetMigratedInBlock  = btnBlockFound ? (btnBlock.indexOf(_getMigratedText)===-1) : false;\n'
    '  var noMigratedTokenInBlock = btnBlockFound ? (btnBlock.indexOf(_migratedToken)===-1) : false;\n'
    '  var noContainsMigrated    = btnBlockFound ? (btnBlock.indexOf(_containsMigrated)===-1) : false;\n'
    '  var noAddMigrated         = btnBlockFound ? (btnBlock.indexOf(_addMigrated)===-1) : false;\n'
    '\n'
    '  // 12-14. audit() still functional\n'
    '  var auditResult = null;\n'
    '  var auditReturnsObj = false;\n'
    '  var registeredIsNum = false;\n'
    '  var rolesIsObj = false;\n'
    '  if(auditFn){\n'
    '    try{\n'
    '      auditResult = bs.audit();\n'
    '      auditReturnsObj = typeof auditResult==="object" && auditResult!==null;\n'
    '      registeredIsNum = auditReturnsObj && typeof auditResult.registered==="number";\n'
    '      rolesIsObj      = auditReturnsObj && typeof auditResult.roles==="object" && auditResult.roles!==null;\n'
    '    }catch(e){}\n'
    '  }\n'
    '\n'
    '  // 15. data-dvl-button still applied\n'
    '  var dvlBtnAttr = document.querySelectorAll("[data-dvl-button=\\"true\\"]").length > 0;\n'
    '\n'
    '  // 16. Functional classes still applied\n'
    '  var _funcClasses = ["dvl-btn","dvl-btn-footer","dvl-btn-header","dvl-btn-icon",\n'
    '    "dvl-btn-panel","dvl-btn-trade","dvl-btn-dropdown","dvl-btn-keypad","dvl-btn-tools","dvl-btn-paper"];\n'
    '  var funcClassesOk = false;\n'
    '  try{\n'
    '    var _fc = 0;\n'
    '    for(var f=0;f<_funcClasses.length;f++){\n'
    '      if(document.getElementsByClassName(_funcClasses[f]).length>0) _fc++;\n'
    '    }\n'
    '    funcClassesOk = _fc>0;\n'
    '  }catch(e){}\n'
    '\n'
    '  // 17. DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT — may be retired after shim removal\n'
    '  var dead0673Pass = false; var dead0673Retired = false;\n'
    '  try{\n'
    '    var _d = window.DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT;\n'
    '    if(_d && typeof _d.audit==="function"){\n'
    '      var _dr = _d.audit();\n'
    '      if(_dr.pass){ dead0673Pass=true; }\n'
    '      else if(_dr.shimCount===0){ dead0673Retired=true; }\n'
    '    }\n'
    '  }catch(e){ dead0673Retired=true; }\n'
    '\n'
    '  // 18-21. Active prior audits\n'
    '  var htmlCleanupPass=false, cssCleanupPass=false, baselinePass=false, inventoryPass=false;\n'
    '  try{ htmlCleanupPass=!!(window.DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT&&window.DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT.audit().pass); }catch(e){}\n'
    '  try{ cssCleanupPass=!!(window.DVL_SAFE_CSS_CLEANUP_AUDIT&&window.DVL_SAFE_CSS_CLEANUP_AUDIT.audit().pass); }catch(e){}\n'
    '  try{ baselinePass=!!(window.DVL_BASELINE_FREEZE&&window.DVL_BASELINE_FREEZE.audit().pass); }catch(e){}\n'
    '  try{ inventoryPass=!!(window.DVL_FINAL_OPTIMIZATION_INVENTORY&&window.DVL_FINAL_OPTIMIZATION_INVENTORY.audit().pass); }catch(e){}\n'
    '\n'
    '  // 22. Layout matches baseline\n'
    '  var layoutMatch=false;\n'
    '  try{ var _c=window.DVL_BASELINE_FREEZE&&window.DVL_BASELINE_FREEZE.compare(); layoutMatch=!!((_c)&&_c.layoutMatch); }catch(e){}\n'
    '\n'
    '  // 23. Final locks 0659-0662\n'
    '  var _lockIds=["DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659","DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660","DVL_CHROME_FINAL_LOCK_CSS_0661","DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"];\n'
    '  var finalLocksOk=true; var finalLocksMissing=[];\n'
    '  for(var f=0;f<_lockIds.length;f++){\n'
    '    if(_cntId(styleEls,_lockIds[f])!==1){ finalLocksOk=false; finalLocksMissing.push(_lockIds[f]); }\n'
    '  }\n'
    '\n'
    '  // 24. Protected modules 0655-0674\n'
    '  var _modIds=[\n'
    '    "DVL_BASELINE_FREEZE_MODULE_0669","DVL_FINAL_OPTIMIZATION_INVENTORY_MODULE_0670",\n'
    '    "DVL_SAFE_CSS_CLEANUP_AUDIT_MODULE_0671","DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672",\n'
    '    "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673",\n'
    '    "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674"\n'
    '  ];\n'
    '  var _cssIds=[\n'
    '    "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673",\n'
    '    "DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674",\n'
    '    "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675"\n'
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
    '  // 25. readyForPostShimCleanup\n'
    '  var activeAuditsPass = htmlCleanupPass&&cssCleanupPass&&baselinePass&&inventoryPass;\n'
    '  var systemFunctional = btnSystemPresent&&auditFn&&refreshFn&&listByFn&&auditReturnsObj&&registeredIsNum&&rolesIsObj;\n'
    '  var readyForPostShimCleanup = shimsPurged&&systemFunctional&&activeAuditsPass&&layoutMatch&&protectedOk;\n'
    '\n'
    '  var blockers=[];\n'
    '  if(!btn0655Present)       blockers.push("DVL_BUTTON_SYSTEM_MODULE_0655 not found");\n'
    '  if(!mod0674Present)       blockers.push("DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674 not found");\n'
    '  if(!btnSystemPresent)     blockers.push("window.DVL_BUTTON_SYSTEM not defined");\n'
    '  if(!auditFn)              blockers.push("DVL_BUTTON_SYSTEM.audit not a function");\n'
    '  if(!refreshFn)            blockers.push("DVL_BUTTON_SYSTEM.refresh not a function");\n'
    '  if(!listByFn)             blockers.push("DVL_BUTTON_SYSTEM.listByRole not a function");\n'
    '  if(!shimsPurged)          blockers.push("Shims still present: "+shimsStillPresent.join(", "));\n'
    '  if(!btnBlockFound)        blockers.push("Button system block not found");\n'
    '  if(!noGetMigratedInBlock)  blockers.push("getMigrated text still in button system block");\n'
    '  if(!noMigratedTokenInBlock) blockers.push("dvl-btn-migrated- still in button system block");\n'
    '  if(!noContainsMigrated)   blockers.push("classList.contains(dvl-btn-migrated- still present");\n'
    '  if(!noAddMigrated)        blockers.push("cls-add(dvl-btn-migrated-) still in btn block");\n'
    '  if(!auditReturnsObj)      blockers.push("DVL_BUTTON_SYSTEM.audit() did not return object");\n'
    '  if(!registeredIsNum)      blockers.push("audit().registered is not a number");\n'
    '  if(!rolesIsObj)           blockers.push("audit().roles is not an object");\n'
    '  if(!htmlCleanupPass)      blockers.push("DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT did not pass");\n'
    '  if(!cssCleanupPass)       blockers.push("DVL_SAFE_CSS_CLEANUP_AUDIT did not pass");\n'
    '  if(!baselinePass)         blockers.push("DVL_BASELINE_FREEZE did not pass");\n'
    '  if(!inventoryPass)        blockers.push("DVL_FINAL_OPTIMIZATION_INVENTORY did not pass");\n'
    '  if(!layoutMatch)          blockers.push("Layout does not match frozen baseline");\n'
    '  if(!finalLocksOk)         blockers.push("Final locks missing: "+finalLocksMissing.join(", "));\n'
    '  if(!protectedOk)          blockers.push("Protected modules missing: "+protectedMissing.join(", "));\n'
    '\n'
    '  return {\n'
    '    version: "0.675",\n'
    '    blockers: blockers,\n'
    '    pass: blockers.length===0,\n'
    '    readyForPostShimCleanup: readyForPostShimCleanup,\n'
    '    btn0655Present: btn0655Present,\n'
    '    mod0674Present: mod0674Present,\n'
    '    btnSystemPresent: btnSystemPresent,\n'
    '    auditFn: auditFn,\n'
    '    refreshFn: refreshFn,\n'
    '    listByFn: listByFn,\n'
    '    shimsPurged: shimsPurged,\n'
    '    shimsStillPresent: shimsStillPresent,\n'
    '    btnBlockFound: btnBlockFound,\n'
    '    noGetMigratedInBlock: noGetMigratedInBlock,\n'
    '    noMigratedTokenInBlock: noMigratedTokenInBlock,\n'
    '    noContainsMigrated: noContainsMigrated,\n'
    '    noAddMigrated: noAddMigrated,\n'
    '    auditReturnsObj: auditReturnsObj,\n'
    '    registeredIsNum: registeredIsNum,\n'
    '    rolesIsObj: rolesIsObj,\n'
    '    dvlBtnAttr: dvlBtnAttr,\n'
    '    funcClassesOk: funcClassesOk,\n'
    '    dead0673Pass: dead0673Pass,\n'
    '    dead0673Retired: dead0673Retired,\n'
    '    htmlCleanupPass: htmlCleanupPass,\n'
    '    cssCleanupPass: cssCleanupPass,\n'
    '    baselinePass: baselinePass,\n'
    '    inventoryPass: inventoryPass,\n'
    '    layoutMatch: layoutMatch,\n'
    '    finalLocksOk: finalLocksOk,\n'
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
    'window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT={\n'
    '  VERSION:"0.675",\n'
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
    '})();\n</script>' + MODULE_0675 + '\n\n</head>\n<body>',
    "insert-MODULE_0675")

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

# 1-5. Version
chk("A01 title=0.675",      '<title>DVL Binance Live — Beta 0.675</title>' in html)
chk("A02 appversion=0.675", 'const DVL_APP_VERSION = "Beta 0.675";' in html)
chk("A03 badge=0.675",      '>BETA 0.675</div>' in html)
chk("A04 changelog-0675",   '"Beta 0.675 — Removed legacy getMigratedXxx Button System shims' in html)
chk("A05 changelog-0674",   '"Beta 0.674", note: "Beta 0.674 — Button System shim consumer audit:' in html)

# 6-9. New blocks
chk("A06 CSS_0675-once",    html.count('id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675"') == 1)
chk("A07 MODULE_0675-once", html.count('id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675"') == 1)
chk("A08 window-audit-0675", 'window.DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT=' in html)
chk("A09 version-field",    'VERSION:"0.675"' in html)

# Extract module for checks
mod_start = html.index('id="DVL_BUTTON_SYSTEM_SHIM_REMOVAL_AUDIT_MODULE_0675"')
mod_end   = html.index('</script>', mod_start) + len('</script>')
mod_block = html[mod_start:mod_end]
chk("A09b audit-run-getLastAudit-in-mod", 'function audit(){' in mod_block and 'function run(){' in mod_block and 'function getLastAudit()' in mod_block)

# 10-12. Button system block — search AFTER </head>
start_marker = '// ===== DVL_BUTTON_SYSTEM_MODULE_0655 ====='
end_marker   = '// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 ====='
head_end = html.index('</head>')
bstart = html.index(start_marker, head_end)
bend   = html.index(end_marker, bstart)
btn_block = html[bstart:bend]

chk("A10 btn-block-preserved",     start_marker in btn_block)
chk("A11 zero-getMigrated-in-block", 'getMigrated' not in btn_block)
chk("A12 zero-dvl-btn-migrated-in-block", 'dvl-btn-migrated-' not in btn_block)

# 13. No getMigratedXxx in export
chk("A13 getMigrated-not-in-export",
    'getMigratedFooterButtons:' not in btn_block and
    'getMigratedTradeActionButtons:' not in btn_block)

# 14-16. Core functions preserved in block
chk("A14 audit-preserved",   'function audit(){' in btn_block)
chk("A15 refresh-preserved", 'function refresh(' in btn_block)
chk("A16 listByRole-preserved", 'function listByRole(' in btn_block)

# 17-18. audit() return has registered and roles
chk("A17 registered-in-return", 'registered:                registry.length,' in btn_block)
chk("A18 roles-in-return",      'roles:                     getRoleCounts(),' in btn_block)

# 19. data-dvl-button preserved
chk("A19 data-dvl-button",  "el.setAttribute('data-dvl-button', 'true');" in btn_block)

# 20. Functional classes preserved
chk("A20 dvl-btn-class",       "el.classList.add('dvl-btn');" in btn_block)
chk("A20b dvl-btn-footer",     "el.classList.add('dvl-btn-footer');" in btn_block)
chk("A20c dvl-btn-trade",      "el.classList.add('dvl-btn-trade');" in btn_block)
chk("A20d dvl-btn-panel",      "el.classList.add('dvl-btn-panel');" in btn_block)
chk("A20e dvl-btn-keypad",     "el.classList.add('dvl-btn-keypad');" in btn_block)
chk("A20f dvl-btn-paper",      "el.classList.add('dvl-btn-paper');" in btn_block)
chk("A20g dvl-btn-tools",      "el.classList.add('dvl-btn-tools');" in btn_block)
chk("A20h dvl-btn-dropdown",   "el.classList.add('dvl-btn-dropdown');" in btn_block)

# 21-24. Preserved prior blocks
chk("A21 CSS_0674-once",    html.count('id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_CSS_0674"') == 1)
chk("A22 MODULE_0674-once", html.count('id="DVL_BUTTON_SYSTEM_SHIM_CONSUMER_AUDIT_MODULE_0674"') == 1)
chk("A23 CSS_0673-once",    html.count('id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673"') == 1)
chk("A24 MODULE_0673-once", html.count('id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673"') == 1)
chk("A25 CSS_0672-once",    html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672"') == 1)
chk("A26 MODULE_0672-once", html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672"') == 1)

# 25. Final locks
chk("A27 lock-0659", html.count('id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659"') == 1)
chk("A28 lock-0660", html.count('id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660"') == 1)
chk("A29 lock-0661", html.count('id="DVL_CHROME_FINAL_LOCK_CSS_0661"') == 1)
chk("A30 lock-0662", html.count('id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"') == 1)

# 27-31. Module-level prohibitions
chk("A31 no-DVL_BUTTON_SYSTEM_MODULE_0675", 'DVL_BUTTON_SYSTEM_MODULE_0675' not in html)
chk("A32 no-DVL_TODO_0675",                 'DVL_TODO_0675' not in html)
chk("A33 no-nested-script",                 '<script>' not in mod_block)
chk("A34 no-drawSoon-in-mod",               'drawSoon' not in mod_block)
chk("A35 no-setTimeout-in-mod",             'setTimeout' not in mod_block)
chk("A36 no-setInterval-in-mod",            'setInterval' not in mod_block)
chk("A37 no-requestAnimationFrame-in-mod",  'requestAnimationFrame' not in mod_block)
chk("A38 no-MutationObserver-in-mod",       'MutationObserver' not in mod_block)
chk("A39 no-ResizeObserver-in-mod",         'ResizeObserver' not in mod_block)

# No DOM mutation in audit
chk("A40 no-setAttribute-in-mod",  'setAttribute' not in mod_block)
chk("A41 no-classList-add-in-mod",  'classList.add' not in mod_block)
chk("A42 no-classList-remove-in-mod", 'classList.remove' not in mod_block)

# Anti-false-positive checks
chk("A43 no-literal-getMigratedFooter-in-mod",
    '"getMigratedFooterButtons"' not in mod_block)
chk("A44 concat-prefix-in-mod", '"get" + "Migrated"' in mod_block)
chk("A45 migratedToken-concat-in-mod", '"dvl-btn-" + "migrated-"' in mod_block)

# Version cleanup
chk("A46 no-old-title",   '<title>DVL Binance Live — Beta 0.674</title>' not in html)
chk("A47 no-old-version", 'const DVL_APP_VERSION = "Beta 0.674";' not in html)

# window.DVL_BUTTON_SYSTEM export still has audit/refresh/listByRole
chk("A48 audit-in-export",   'audit:                             audit,' in btn_block)
chk("A49 refresh-in-export",  'refresh:                           refresh,' in btn_block)
chk("A50 listByRole-in-export", 'listByRole:                        listByRole,' in btn_block)

# Buy/Sell logic untouched (check for tradeAction in btn block)
chk("A51 tradeAction-intact", "el.classList.contains('tradeAction')" in btn_block)
chk("A52 buy-sell-intact",    "el.classList.contains('buy')" in btn_block)

# readyForPostShimCleanup field in module
chk("A53 readyForPostShimCleanup-field", 'readyForPostShimCleanup:' in mod_block)

# JS syntax: no obvious breaks (check no unclosed string in btn block)
chk("A54 btn-block-ends-properly",
    'window.DVL_BUTTON_SYSTEM = {' in btn_block)

print()
if errors:
    print(f"FAILED {len(errors)} assertion(s): {errors}")
    sys.exit(1)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print(f"getMigrated in full file: {html.count('getMigrated')}")
print(f"getMigrated in btn block: {btn_block.count('getMigrated')}")
print(f"All 54 assertions passed. Written → {SRC}")
