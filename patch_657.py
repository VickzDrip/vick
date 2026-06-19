#!/usr/bin/env python3
"""patch_657.py — Beta 0.657 / Phase 2.1: DVL_LAYOUT_ASSERTIONS_MODULE_0657 (read-only assertions)."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-17.before_0657_layout_assertions.html"

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
    "<title>DVL Binance Live — Beta 0.656</title>",
    "<title>DVL Binance Live — Beta 0.657</title>",
    "title 0.656→0.657")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.656<",
    ">BETA 0.657<",
    "static badge 0.656→0.657")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.656";',
    'const DVL_APP_VERSION = "Beta 0.657";',
    "DVL_APP_VERSION 0.656→0.657")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.656 — Phase 2.0: contrato/auditoria de layout read-only para chart, Paper Trading, osciladores e trade drawer." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.657 — Phase 2.1: auditoria read-only de assertions do Layout Contract para detectar gaps, sobreposições e divergências de dimensões sem alterar visual." },\n  { version: "Beta 0.656", note: "Phase 2.0: contrato/auditoria de layout read-only para chart, Paper Trading, osciladores e trade drawer." },',
    "changelog 0.657 entry")

# ── 5. CSS block ──────────────────────────────────────────────────────────────
html = rep(html,
    "/* DVL Beta 0.656 — Phase 2.0: layout contract diagnostics.\n   Read-only/visual-neutral. No layout or visual properties. */\n</style>\n\n<style>\n:root{",
    "/* DVL Beta 0.656 — Phase 2.0: layout contract diagnostics.\n   Read-only/visual-neutral. No layout or visual properties. */\n</style>\n\n<style id=\"DVL_LAYOUT_ASSERTIONS_CSS_0657\">\n/* DVL Beta 0.657 — Phase 2.1: layout assertions diagnostics.\n   Read-only/visual-neutral. No layout, color, spacing, z-index, radius, padding, height or width properties. */\n</style>\n\n<style>\n:root{",
    "insert DVL_LAYOUT_ASSERTIONS_CSS_0657")

# ── 6. Layout assertions module ───────────────────────────────────────────────
NEW_MODULE = """
// ===== DVL_LAYOUT_ASSERTIONS_MODULE_0657 =====
(function(){
"use strict";

var _lastAudit = null;

function getExpectedContract(){
  return {
    header:               55,
    assetHotbar:          50,
    chartToolbar:         30,
    footerMenu:           57,
    footerButtons:        55,
    rightPriceScaleWidth: 70,
    tradeDrawerMaxHeight: 150
  };
}

function computeSectionMismatches(expected, staticSizes){
  var mismatches = [];
  if(!staticSizes) return mismatches;
  var keys = Object.keys(expected);
  for(var i = 0; i < keys.length; i++){
    var k = keys[i];
    if(typeof staticSizes[k] === 'number' && staticSizes[k] !== expected[k]){
      mismatches.push({
        key:      k,
        expected: expected[k],
        actual:   staticSizes[k],
        diff:     staticSizes[k] - expected[k]
      });
    }
  }
  return mismatches;
}

function safeNum(val){
  return (typeof val === 'number' && isFinite(val)) ? val : null;
}

function computeGap(a, b){
  if(a == null || b == null) return null;
  return b - a;
}

function audit(){
  var expected = getExpectedContract();
  var staticSizes = window.DVL_SECTION_SIZES_PX || null;
  var mismatches = computeSectionMismatches(expected, staticSizes);
  var recommendations = [];

  var snap = null;
  if(window.DVL_LAYOUT_CONTRACT && typeof window.DVL_LAYOUT_CONTRACT.measure === 'function'){
    try{ snap = window.DVL_LAYOUT_CONTRACT.measure(); }catch(_){}
  }

  var chartBottom     = snap && snap.chart    && snap.chart.exists    ? safeNum(snap.chart.bottom)     : null;
  var footerTop       = snap && snap.footer   && snap.footer.exists   ? safeNum(snap.footer.top)       : null;
  var toolbarBottom   = snap && snap.toolbar  && snap.toolbar.exists  ? safeNum(snap.toolbar.bottom)   : null;
  var canvasTop       = snap && snap.canvasWrap && snap.canvasWrap.exists ? safeNum(snap.canvasWrap.top) : null;
  var drawerBottom    = snap && snap.tradeDrawerSheet && snap.tradeDrawerSheet.exists ? safeNum(snap.tradeDrawerSheet.bottom) : null;
  var footerBottom    = snap && snap.footer   && snap.footer.exists   ? safeNum(snap.footer.bottom)    : null;

  var chartFooterGapPx      = computeGap(chartBottom, footerTop);
  var toolbarCanvasGapPx    = computeGap(toolbarBottom, canvasTop);
  var drawerFooterOverlapPx = (drawerBottom != null && footerTop != null) ? drawerBottom - footerTop : null;

  var oscillatorCount  = snap ? snap.oscillators.length : 0;
  var paperLayerExists = snap ? snap.paperLayer.exists  : false;
  var paperLineCount   = snap ? snap.paperLines.length  : 0;
  var tradeDrawerExists = snap ? snap.tradeDrawer.exists : false;

  // Section size mismatch recommendations
  for(var m = 0; m < mismatches.length; m++){
    var mm = mismatches[m];
    recommendations.push(
      "MISMATCH: " + mm.key + " is " + mm.actual + "px in DVL_SECTION_SIZES_PX but expected " + mm.expected + "px (diff=" + mm.diff + "). Do NOT fix in this phase."
    );
  }

  // Gap diagnostics
  if(chartFooterGapPx != null && Math.abs(chartFooterGapPx) > 2){
    recommendations.push("GAP: chart bottom to footer top = " + chartFooterGapPx.toFixed(1) + "px (expected ~0). Investigate in next phase.");
  }
  if(toolbarCanvasGapPx != null && Math.abs(toolbarCanvasGapPx) > 2){
    recommendations.push("GAP: toolbar bottom to canvasWrap top = " + toolbarCanvasGapPx.toFixed(1) + "px (expected ~0). Investigate in next phase.");
  }
  if(drawerFooterOverlapPx != null && drawerFooterOverlapPx > 2){
    recommendations.push("OVERLAP: tradeDrawerSheet bottom overlaps footer top by " + drawerFooterOverlapPx.toFixed(1) + "px. Investigate in next phase.");
  }
  if(oscillatorCount > 0){
    recommendations.push("INFO: " + oscillatorCount + " oscillator panel(s) detected. Measure impact on canvasWrap height if layout is off.");
  }

  var result = {
    version:              "0.657",
    noLayoutMutation:     true,
    expected:             expected,
    staticSectionSizes:   staticSizes,
    sectionSizeMismatches: mismatches,
    snapshot:             snap,
    chartFooterGapPx:     chartFooterGapPx,
    toolbarCanvasGapPx:   toolbarCanvasGapPx,
    drawerFooterOverlapPx: drawerFooterOverlapPx,
    oscillatorCount:      oscillatorCount,
    paperLayerExists:     paperLayerExists,
    paperLineCount:       paperLineCount,
    tradeDrawerExists:    tradeDrawerExists,
    recommendations:      recommendations
  };

  _lastAudit = result;
  return result;
}

function getLastAudit(){
  return _lastAudit;
}

window.DVL_LAYOUT_ASSERTIONS = {
  VERSION:             "0.657",
  getExpectedContract: getExpectedContract,
  audit:               audit,
  getLastAudit:        getLastAudit
};

})();

"""

html = rep(html,
    "  getLastSnapshot:      getLastSnapshot\n};\n\n})();\n\nwindow.DVL_SECTION_SIZES_PX = {",
    "  getLastSnapshot:      getLastSnapshot\n};\n\n})();" + NEW_MODULE + "window.DVL_SECTION_SIZES_PX = {",
    "insert DVL_LAYOUT_ASSERTIONS_MODULE_0657")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_657 applied: title, badge, DVL_APP_VERSION, changelog 0.657, DVL_LAYOUT_ASSERTIONS_CSS_0657, DVL_LAYOUT_ASSERTIONS_MODULE_0657")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.657</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.656</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.657";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.656";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.657<" in content, "FAIL: static badge"
assert ">BETA 0.656<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.657 — Phase 2.1: auditoria read-only de assertions do Layout Contract para detectar gaps, sobreposições e divergências de dimensões sem alterar visual.' in content, "FAIL: changelog 0.657"
assert '"Beta 0.656", note: "Phase 2.0:' in content, "FAIL: 0.656 changelog preserved"

# 3. CSS block
assert '<style id="DVL_LAYOUT_ASSERTIONS_CSS_0657">' in content, "FAIL: CSS tag"
assert 'Phase 2.1: layout assertions diagnostics' in content, "FAIL: CSS comment"

# 4. Module present exactly once
assert content.count("DVL_LAYOUT_ASSERTIONS_MODULE_0657") == 1, "FAIL: module count != 1"

# 5. window.DVL_LAYOUT_ASSERTIONS
assert 'window.DVL_LAYOUT_ASSERTIONS = {' in content, "FAIL: window.DVL_LAYOUT_ASSERTIONS"
assert 'VERSION:             "0.657",' in content, "FAIL: VERSION"

# 6. All three functions
assert "function getExpectedContract()" in content, "FAIL: getExpectedContract()"
assert "function audit()" in content, "FAIL: audit()"
assert "function getLastAudit()" in content, "FAIL: getLastAudit()"

# 7. getExpectedContract values
assert "rightPriceScaleWidth: 70," in content, "FAIL: rightPriceScaleWidth expected 70"
assert "tradeDrawerMaxHeight: 150" in content, "FAIL: tradeDrawerMaxHeight expected 150"

# 8. audit() fields
assert "noLayoutMutation:     true," in content, "FAIL: noLayoutMutation"
assert "sectionSizeMismatches:" in content, "FAIL: sectionSizeMismatches"
assert "chartFooterGapPx:" in content, "FAIL: chartFooterGapPx"
assert "toolbarCanvasGapPx:" in content, "FAIL: toolbarCanvasGapPx"
assert "drawerFooterOverlapPx:" in content, "FAIL: drawerFooterOverlapPx"
assert "oscillatorCount:" in content, "FAIL: oscillatorCount"
assert "paperLayerExists:" in content, "FAIL: paperLayerExists"
assert "paperLineCount:" in content, "FAIL: paperLineCount"
assert "tradeDrawerExists:" in content, "FAIL: tradeDrawerExists"
assert "recommendations:" in content, "FAIL: recommendations"

# 9. Uses DVL_LAYOUT_CONTRACT.measure()
assert "DVL_LAYOUT_CONTRACT.measure" in content, "FAIL: DVL_LAYOUT_CONTRACT.measure not used"

# 10. Exports
assert "getExpectedContract: getExpectedContract," in content, "FAIL: getExpectedContract exported"
assert "audit:               audit," in content, "FAIL: audit exported"
assert "getLastAudit:        getLastAudit" in content, "FAIL: getLastAudit exported"

# 11. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_BUTTON_SYSTEM_MODULE_0656" not in content, "FAIL: wrongly created 0656"
assert "DVL_BUTTON_SYSTEM_MODULE_0657" not in content, "FAIL: wrongly created 0657"

# 12. No nested script
assert '<script id="DVL_LAYOUT_ASSERTIONS' not in content, "FAIL: nested script"
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script button"

# 13. Zero DVL_TODO_0657
assert "DVL_TODO_0657" not in content, "FAIL: DVL_TODO_0657 remaining"

# 14. Read-only checks within new module slice
la_start = content.index("DVL_LAYOUT_ASSERTIONS_MODULE_0657")
sec_idx  = content.index("window.DVL_SECTION_SIZES_PX")
module_slice = content[la_start:sec_idx]
assert "ResizeObserver"    not in module_slice, "FAIL: ResizeObserver in assertions module"
assert "MutationObserver"  not in module_slice, "FAIL: MutationObserver in assertions module"
assert "requestAnimationFrame" not in module_slice, "FAIL: rAF in assertions module"
assert "setInterval"       not in module_slice, "FAIL: setInterval in assertions module"
assert "setTimeout"        not in module_slice, "FAIL: setTimeout in assertions module"
assert "style.height"      not in module_slice, "FAIL: style.height mutation"
assert "style.width"       not in module_slice, "FAIL: style.width mutation"
assert "classList.add"     not in module_slice, "FAIL: classList.add"
assert "classList.remove"  not in module_slice, "FAIL: classList.remove"
assert "classList.toggle"  not in module_slice, "FAIL: classList.toggle"

# 15. Prior migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-timeframe",
            "dvl-btn-migrated-header", "dvl-btn-migrated-icon",
            "dvl-btn-migrated-menu", "dvl-btn-migrated-panel",
            "dvl-btn-migrated-order-option", "dvl-btn-migrated-keypad",
            "dvl-btn-migrated-asset-favorite", "dvl-btn-migrated-asset-dropdown",
            "dvl-btn-migrated-indicator-dropdown", "dvl-btn-migrated-tools",
            "dvl-btn-migrated-paper-confirm", "dvl-btn-migrated-paper-edit",
            "dvl-btn-migrated-drawer", "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 16. Buy/Sell HTML untouched
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 17. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 18. DVL_SECTION_SIZES_PX rightPriceScaleWidth unchanged at 55
assert "rightPriceScaleWidth: 55," in content, "FAIL: rightPriceScaleWidth changed (must stay 55 this phase)"

print("[OK] all 52 assertions passed — 0657 clean, DVL_LAYOUT_ASSERTIONS_MODULE_0657 read-only, prior modules preserved")
