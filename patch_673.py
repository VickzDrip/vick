#!/usr/bin/env python3
"""
patch_673.py — Beta 0.673: Safe Button System Dead Diagnostic Cleanup

Changes:
  1. Version/title/badge updated to Beta 0.673
  2. Changelog entry added (above 0.672)
  3. 16 getMigratedXxx() bodies replaced with return [] shims
  4. audit() migration loops/checks removed (keep xxxMigrated vars at 0)
  5. Add DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673 (marker-only)
  6. Add DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673
"""

import shutil, sys, os

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "index-33.before_0673_button_system_dead_diagnostic_cleanup.html"

def rep(html, old, new, label):
    n = html.count(old)
    if n != 1:
        print(f"FAIL rep [{label}]: found {n} occurrences (expected 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

# ── Read ──────────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    html = f.read()

# ── Backup ───────────────────────────────────────────────────────────────────
shutil.copy(SRC, BAK)
print(f"Backup → {BAK}")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Title
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.672</title>',
    '<title>DVL Binance Live — Beta 0.673</title>',
    "title")

# ─────────────────────────────────────────────────────────────────────────────
# 2. DVL_APP_VERSION const
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.672";',
    'const DVL_APP_VERSION = "Beta 0.673";',
    "DVL_APP_VERSION")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Static badge text
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.672</div>',
    '>BETA 0.673</div>',
    "badge-text")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Changelog entry (insert above 0.672)
# ─────────────────────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.672 — Safe HTML class cleanup batch 2: removed dead dvl-btn-migrated-* diagnostic class tokens." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.673 — Safe Button System cleanup: removed dead dvl-btn-migrated-* references from Button System while preserving compatibility shims." },\n  { version: "Beta 0.672", note: "Beta 0.672 — Safe HTML class cleanup batch 2: removed dead dvl-btn-migrated-* diagnostic class tokens." },',
    "changelog-0673")

# ─────────────────────────────────────────────────────────────────────────────
# 5. getMigratedXxx() shims — replace all 16 function bodies
# ─────────────────────────────────────────────────────────────────────────────

html = rep(html,
    "function getMigratedFooterButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-footer') &&\n       el.classList.contains('navItem')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedFooterButtons(){\n  return [];\n}",
    "shim-getMigratedFooterButtons")

html = rep(html,
    "function getMigratedTimeframeButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-timeframe') &&\n       el.classList.contains('tfBtn')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedTimeframeButtons(){\n  return [];\n}",
    "shim-getMigratedTimeframeButtons")

html = rep(html,
    "function getMigratedHeaderButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-header')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedHeaderButtons(){\n  return [];\n}",
    "shim-getMigratedHeaderButtons")

html = rep(html,
    "function getMigratedIconButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-icon')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedIconButtons(){\n  return [];\n}",
    "shim-getMigratedIconButtons")

html = rep(html,
    "function getMigratedMenuButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-menu')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedMenuButtons(){\n  return [];\n}",
    "shim-getMigratedMenuButtons")

html = rep(html,
    "function getMigratedPanelButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-panel') &&\n       (el.classList.contains('panelBtn') ||\n        el.classList.contains('panelToggle') ||\n        el.classList.contains('panelCloseX'))) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedPanelButtons(){\n  return [];\n}",
    "shim-getMigratedPanelButtons")

html = rep(html,
    "function getMigratedOrderOptionButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-order-option') &&\n       el.classList.contains('orderTypeOption')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedOrderOptionButtons(){\n  return [];\n}",
    "shim-getMigratedOrderOptionButtons")

html = rep(html,
    "function getMigratedKeypadButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-keypad')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedKeypadButtons(){\n  return [];\n}",
    "shim-getMigratedKeypadButtons")

html = rep(html,
    "function getMigratedAssetFavoriteButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-asset-favorite')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedAssetFavoriteButtons(){\n  return [];\n}",
    "shim-getMigratedAssetFavoriteButtons")

html = rep(html,
    "function getMigratedAssetDropdownButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-asset-dropdown')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedAssetDropdownButtons(){\n  return [];\n}",
    "shim-getMigratedAssetDropdownButtons")

html = rep(html,
    "function getMigratedIndicatorDropdownButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-indicator-dropdown')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedIndicatorDropdownButtons(){\n  return [];\n}",
    "shim-getMigratedIndicatorDropdownButtons")

html = rep(html,
    "function getMigratedToolsButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-tools')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedToolsButtons(){\n  return [];\n}",
    "shim-getMigratedToolsButtons")

html = rep(html,
    "function getMigratedPaperConfirmButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-paper-confirm')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedPaperConfirmButtons(){\n  return [];\n}",
    "shim-getMigratedPaperConfirmButtons")

html = rep(html,
    "function getMigratedPaperEditConfirmButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-paper-edit')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedPaperEditConfirmButtons(){\n  return [];\n}",
    "shim-getMigratedPaperEditConfirmButtons")

html = rep(html,
    "function getMigratedDrawerButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-drawer') &&\n       el.classList.contains('drawerBtn')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedDrawerButtons(){\n  return [];\n}",
    "shim-getMigratedDrawerButtons")

html = rep(html,
    "function getMigratedTradeActionButtons(){\n  var result = [];\n  for(var i = 0; i < registry.length; i++){\n    var el = registry[i];\n    if(el.classList.contains('dvl-btn-migrated-trade-action') &&\n       el.classList.contains('tradeAction')) result.push(el);\n  }\n  return result;\n}",
    "function getMigratedTradeActionButtons(){\n  return [];\n}",
    "shim-getMigratedTradeActionButtons")

# ─────────────────────────────────────────────────────────────────────────────
# 6. audit() cleanup — remove migration counting loops
# ─────────────────────────────────────────────────────────────────────────────

# 6a. footer migration loop
html = rep(html,
    "  var footerMigrated = 0;\n  for(var i = 0; i < footerEls.length; i++){\n    if(footerEls[i].classList.contains('dvl-btn-migrated-footer')) footerMigrated++;\n  }",
    "  var footerMigrated = 0;",
    "audit-footer-loop")

# 6b. timeframe migration loop
html = rep(html,
    "  var timeframeMigrated = 0;\n  for(var i = 0; i < timeframeEls.length; i++){\n    if(timeframeEls[i].classList.contains('dvl-btn-migrated-timeframe')) timeframeMigrated++;\n  }",
    "  var timeframeMigrated = 0;",
    "audit-timeframe-loop")

# 6c. header migration loop
html = rep(html,
    "  var headerMigrated = 0;\n  for(var i = 0; i < headerEls.length; i++){\n    if(headerEls[i].classList.contains('dvl-btn-migrated-header')) headerMigrated++;\n  }",
    "  var headerMigrated = 0;",
    "audit-header-loop")

# 6d. icon migration loop
html = rep(html,
    "  var iconMigrated = 0;\n  for(var i = 0; i < iconEls.length; i++){\n    if(iconEls[i].classList.contains('dvl-btn-migrated-icon')) iconMigrated++;\n  }",
    "  var iconMigrated = 0;",
    "audit-icon-loop")

# 6e. dropdown loop — keep only orderTypeOption
html = rep(html,
    "  for(var i = 0; i < allDropdownEls.length; i++){\n    var el = allDropdownEls[i];\n    if(el.classList.contains('orderTypeOption')) orderOptionTotal++;\n    if(el.classList.contains('dvl-btn-migrated-asset-favorite')) assetFavoriteTotal++;\n    if(el.classList.contains('dvl-btn-migrated-asset-dropdown')) assetDropdownTotal++;\n    if(el.classList.contains('dvl-btn-migrated-indicator-dropdown')) indicatorDropdownTotal++;\n  }",
    "  for(var i = 0; i < allDropdownEls.length; i++){\n    var el = allDropdownEls[i];\n    if(el.classList.contains('orderTypeOption')) orderOptionTotal++;\n  }",
    "audit-dropdown-loop")

# 6f. keypad migration loop
html = rep(html,
    "  var keypadMigrated = 0;\n  for(var i = 0; i < keypadEls.length; i++){\n    if(keypadEls[i].classList.contains('dvl-btn-migrated-keypad')) keypadMigrated++;\n  }",
    "  var keypadMigrated = 0;",
    "audit-keypad-loop")

# 6g. tools migration loop
html = rep(html,
    "  var toolsMigrated = 0;\n  for(var i = 0; i < toolsEls.length; i++){\n    if(toolsEls[i].classList.contains('dvl-btn-migrated-tools')) toolsMigrated++;\n  }",
    "  var toolsMigrated = 0;",
    "audit-tools-loop")

# 6h. paper loop — keep variable declarations, remove loop
html = rep(html,
    "  var paperConfirmTotal = 0;\n  var paperEditConfirmTotal = 0;\n  for(var i = 0; i < paperEls.length; i++){\n    var el = paperEls[i];\n    if(el.classList.contains('dvl-btn-migrated-paper-confirm')) paperConfirmTotal++;\n    if(el.classList.contains('dvl-btn-migrated-paper-edit')) paperEditConfirmTotal++;\n  }",
    "  var paperConfirmTotal = 0;\n  var paperEditConfirmTotal = 0;",
    "audit-paper-loop")

# 6i. trade action migration line (remove just this one line inside the loop)
html = rep(html,
    "      if(el.classList.contains('dvl-btn-migrated-trade-action')) tradeActionMigrated++;\n      if(el.classList.contains('buy')) buyTradeActionTotal++;",
    "      if(el.classList.contains('buy')) buyTradeActionTotal++;",
    "audit-trade-migration-line")

# ─────────────────────────────────────────────────────────────────────────────
# 7. Add DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673 (marker-only)
#    Insert between CSS_0672 end and AUDIT_MODULE_0672 start
# ─────────────────────────────────────────────────────────────────────────────
# Note: the anchor pattern uses the full CSS_0672 comment to be unique
CSS_0673 = (
    '\n\n<style id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673">\n'
    '/*\n'
    '  DVL Beta 0.673 — Button System dead diagnostic cleanup.\n'
    '  Removed dead dvl-btn-migrated-* references from DVL_BUTTON_SYSTEM_MODULE_0655.\n'
    '  No selectors, no properties, no visual change.\n'
    '*/\n'
    '</style>'
)

html = rep(html,
    '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    '</style>' + CSS_0673 + '\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "insert-CSS_0673")

# ─────────────────────────────────────────────────────────────────────────────
# 8. Add DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673
#    Insert after MODULE_0672 closes and before </head>
#
#    IMPORTANT: The marker strings are split in the JS source so they don't
#    appear as literal strings in the HTML, preventing false-positive matches
#    when searching for the button system block boundaries.
# ─────────────────────────────────────────────────────────────────────────────
MODULE_0673 = (
    '\n\n<script id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673">\n'
    '(function(){\n'
    '"use strict";\n'
    '\n'
    'var _lastAudit = null;\n'
    '\n'
    '// Marker strings split to avoid literal appearance in HTML source\n'
    'var _BS_START = "// ===== DVL_BUTTON_SYSTEM_MODULE_" + "0655 =====";\n'
    'var _BS_END   = "// ===== DVL_LAYOUT_CONTRACT_MODULE_" + "0656 =====";\n'
    '\n'
    'function getBtnSystemBlock(){\n'
    '  var scripts = document.querySelectorAll("script");\n'
    '  for(var i = 0; i < scripts.length; i++){\n'
    '    var txt = scripts[i].textContent || "";\n'
    '    var start = txt.indexOf(_BS_START);\n'
    '    if(start === -1) continue;\n'
    '    var end = txt.indexOf(_BS_END, start);\n'
    '    if(end !== -1) return txt.slice(start, end);\n'
    '  }\n'
    '  return null;\n'
    '}\n'
    '\n'
    'function cntId(col, id){\n'
    '  var n = 0;\n'
    '  for(var i = 0; i < col.length; i++) if(col[i].id === id) n++;\n'
    '  return n;\n'
    '}\n'
    '\n'
    'function audit(){\n'
    '  var styleEls  = document.querySelectorAll("style");\n'
    '  var scriptEls = document.querySelectorAll("script");\n'
    '\n'
    '  var btnBlock = getBtnSystemBlock();\n'
    '  var btnBlockFound = btnBlock !== null;\n'
    '  var migratedTokensInBtnBlock = btnBlockFound\n'
    '    ? (btnBlock.indexOf("dvl-btn-migrated-") !== -1)\n'
    '    : null;\n'
    '\n'
    '  var shimCount = 0;\n'
    '  if(btnBlockFound){\n'
    '    var shimNames = [\n'
    '      "getMigratedFooterButtons",\n'
    '      "getMigratedTimeframeButtons",\n'
    '      "getMigratedHeaderButtons",\n'
    '      "getMigratedIconButtons",\n'
    '      "getMigratedMenuButtons",\n'
    '      "getMigratedPanelButtons",\n'
    '      "getMigratedOrderOptionButtons",\n'
    '      "getMigratedKeypadButtons",\n'
    '      "getMigratedAssetFavoriteButtons",\n'
    '      "getMigratedAssetDropdownButtons",\n'
    '      "getMigratedIndicatorDropdownButtons",\n'
    '      "getMigratedToolsButtons",\n'
    '      "getMigratedPaperConfirmButtons",\n'
    '      "getMigratedPaperEditConfirmButtons",\n'
    '      "getMigratedDrawerButtons",\n'
    '      "getMigratedTradeActionButtons"\n'
    '    ];\n'
    '    for(var s = 0; s < shimNames.length; s++){\n'
    '      if(btnBlock.indexOf("function " + shimNames[s] + "(){\\n  return [];\\n}") !== -1) shimCount++;\n'
    '    }\n'
    '  }\n'
    '\n'
    '  var cssPresentOnce       = cntId(styleEls,  "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673") === 1;\n'
    '  var modulePresentOnce    = cntId(scriptEls, "DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673") === 1;\n'
    '  var prevCssPresentOnce   = cntId(styleEls,  "DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672") === 1;\n'
    '  var prevModPresentOnce   = cntId(scriptEls, "DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672") === 1;\n'
    '  var btnSystemPresent     = typeof window.DVL_BUTTON_SYSTEM !== "undefined";\n'
    '\n'
    '  var blockers = [];\n'
    '  if(!btnBlockFound)           blockers.push("DVL_BUTTON_SYSTEM_MODULE_0655 block not found");\n'
    '  if(migratedTokensInBtnBlock) blockers.push("dvl-btn-migrated- tokens still in button system block");\n'
    '  if(shimCount !== 16)         blockers.push("Expected 16 getMigrated shims, found " + shimCount);\n'
    '  if(!cssPresentOnce)          blockers.push("DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673 not found exactly once");\n'
    '  if(!modulePresentOnce)       blockers.push("DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673 not found exactly once");\n'
    '  if(!prevCssPresentOnce)      blockers.push("DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672 not found exactly once");\n'
    '  if(!prevModPresentOnce)      blockers.push("DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672 not found exactly once");\n'
    '  if(!btnSystemPresent)        blockers.push("window.DVL_BUTTON_SYSTEM not defined");\n'
    '\n'
    '  return {\n'
    '    version: "0.673",\n'
    '    blockers: blockers,\n'
    '    pass: blockers.length === 0,\n'
    '    btnBlockFound: btnBlockFound,\n'
    '    migratedTokensInBtnBlock: migratedTokensInBtnBlock,\n'
    '    shimCount: shimCount,\n'
    '    cssPresentOnce: cssPresentOnce,\n'
    '    modulePresentOnce: modulePresentOnce,\n'
    '    prevCssPresentOnce: prevCssPresentOnce,\n'
    '    prevModPresentOnce: prevModPresentOnce,\n'
    '    btnSystemPresent: btnSystemPresent\n'
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
    'window.DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT={\n'
    '  VERSION:"0.673",\n'
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
    '})();\n</script>' + MODULE_0673 + '\n\n</head>\n<body>',
    "insert-MODULE_0673")

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
chk("A01 title=0.673",    '<title>DVL Binance Live — Beta 0.673</title>' in html)
chk("A02 appversion=0.673", 'const DVL_APP_VERSION = "Beta 0.673";' in html)
chk("A03 badge=0.673",    '>BETA 0.673</div>' in html)
chk("A04 changelog-0673", '"Beta 0.673 — Safe Button System cleanup:' in html)
chk("A05 changelog-0672-preserved", '"Beta 0.672", note: "Beta 0.672 — Safe HTML class cleanup' in html)

# New blocks
chk("A06 CSS_0673-once",    html.count('id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_CSS_0673"') == 1)
chk("A07 MODULE_0673-once", html.count('id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673"') == 1)
chk("A08 window-audit-0673", 'window.DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT=' in html)

# Button system block — search AFTER </head> to avoid MODULE_0673 string literals
start_marker = '// ===== DVL_BUTTON_SYSTEM_MODULE_0655 ====='
end_marker   = '// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 ====='
head_end = html.index('</head>')
bstart = html.index(start_marker, head_end)
bend   = html.index(end_marker, bstart)
btn_block = html[bstart:bend]

chk("A09 no-dvl-btn-migrated-in-btn-block", 'dvl-btn-migrated-' not in btn_block)

# Shims
shim_names = [
    "getMigratedFooterButtons",
    "getMigratedTimeframeButtons",
    "getMigratedHeaderButtons",
    "getMigratedIconButtons",
    "getMigratedMenuButtons",
    "getMigratedPanelButtons",
    "getMigratedOrderOptionButtons",
    "getMigratedKeypadButtons",
    "getMigratedAssetFavoriteButtons",
    "getMigratedAssetDropdownButtons",
    "getMigratedIndicatorDropdownButtons",
    "getMigratedToolsButtons",
    "getMigratedPaperConfirmButtons",
    "getMigratedPaperEditConfirmButtons",
    "getMigratedDrawerButtons",
    "getMigratedTradeActionButtons",
]
for idx, name in enumerate(shim_names, start=10):
    shim = f"function {name}(){{\n  return [];\n}}"
    chk(f"A{idx:02d} shim-{name}", shim in btn_block)

# audit() shape preserved in btn block
chk("A26 audit-function-present",    'function audit(){' in btn_block)
chk("A27 footerMigrated-var",        'var footerMigrated = 0;' in btn_block)
chk("A28 timeframeMigrated-var",     'var timeframeMigrated = 0;' in btn_block)
chk("A29 headerMigrated-var",        'var headerMigrated = 0;' in btn_block)
chk("A30 iconMigrated-var",          'var iconMigrated = 0;' in btn_block)
chk("A31 keypadMigrated-var",        'var keypadMigrated = 0;' in btn_block)
chk("A32 toolsMigrated-var",         'var toolsMigrated = 0;' in btn_block)
chk("A33 tradeActionMigrated-var",   'var tradeActionMigrated = 0;' in btn_block)
chk("A34 buy-check-kept",            "el.classList.contains('buy')" in btn_block)
chk("A35 sell-check-kept",           "el.classList.contains('sell')" in btn_block)
chk("A36 orderTypeOption-kept",      "el.classList.contains('orderTypeOption')" in btn_block)
chk("A37 drawerBtn-check-kept",      "el.classList.contains('drawerBtn')" in btn_block)
chk("A38 tradeAction-check-kept",    "el.classList.contains('tradeAction')" in btn_block)

# Preserved blocks
chk("A39 CSS_0672-once",     html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_CSS_0672"') == 1)
chk("A40 MODULE_0672-once",  html.count('id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672"') == 1)
chk("A41 BTN_SYSTEM-export", 'window.DVL_BUTTON_SYSTEM = {' in btn_block)
chk("A42 getMigrated-exports-in-block",
    'getMigratedFooterButtons:          getMigratedFooterButtons,' in btn_block)
chk("A43 init-function",     'function init(){' in btn_block)
chk("A44 layout-contract-marker", '// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 =====' in html)

# No forbidden APIs in MODULE_0673 (extract the module source)
mod_start = html.index('id="DVL_BUTTON_SYSTEM_DEAD_DIAGNOSTIC_CLEANUP_AUDIT_MODULE_0673"')
mod_end   = html.index('</script>', mod_start) + len('</script>')
mod_block = html[mod_start:mod_end]
chk("A45 no-setTimeout-in-module",         'setTimeout' not in mod_block)
chk("A46 no-setInterval-in-module",        'setInterval' not in mod_block)
chk("A47 no-requestAnimationFrame-module",  'requestAnimationFrame' not in mod_block)
chk("A48 no-MutationObserver-module",       'MutationObserver' not in mod_block)
chk("A49 no-ResizeObserver-module",         'ResizeObserver' not in mod_block)
chk("A50 no-drawSoon-module",              'drawSoon' not in mod_block)

# Version clean-up checks
chk("A51 no-old-version-const",   'const DVL_APP_VERSION = "Beta 0.672";' not in html)
chk("A52 no-old-title",           '<title>DVL Binance Live — Beta 0.672</title>' not in html)
chk("A53 0.672-in-changelog",     '"Beta 0.672"' in html)

# Marker strings split in module (not literal in HTML source)
chk("A54 marker-split-in-module",
    '"0655 ======"' not in mod_block and
    '"// ===== DVL_BUTTON_SYSTEM_MODULE_0655 ======"' not in mod_block)

print()
if errors:
    print(f"FAILED {len(errors)} assertion(s): {errors}")
    sys.exit(1)

# ── Write ─────────────────────────────────────────────────────────────────────
with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

final_migrated_count = html.count('dvl-btn-migrated-')
print(f"dvl-btn-migrated- occurrences in full file: {final_migrated_count}")
print(f"dvl-btn-migrated- occurrences in btn block: {btn_block.count('dvl-btn-migrated-')}")
print(f"All 54 assertions passed. Written → {SRC}")
