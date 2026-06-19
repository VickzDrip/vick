#!/usr/bin/env python3
"""patch_656.py — Beta 0.656 / Phase 2.0: DVL_LAYOUT_CONTRACT_MODULE_0656 (read-only audit)."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-16.before_0656_layout_contract.html"

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
    "<title>DVL Binance Live — Beta 0.655</title>",
    "<title>DVL Binance Live — Beta 0.656</title>",
    "title 0.655→0.656")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.655<",
    ">BETA 0.656<",
    "static badge 0.655→0.656")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.655";',
    'const DVL_APP_VERSION = "Beta 0.656";',
    "DVL_APP_VERSION 0.655→0.656")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.655 — Phase 1.13: migração piloto visual-neutral dos botões Buy/Sell .tradeAction para o DVL_BUTTON_SYSTEM." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.656 — Phase 2.0: contrato/auditoria de layout read-only para chart, Paper Trading, osciladores e trade drawer." },\n  { version: "Beta 0.655", note: "Phase 1.13: migração piloto visual-neutral dos botões Buy/Sell .tradeAction para o DVL_BUTTON_SYSTEM." },',
    "changelog 0.656 entry")

# ── 5. CSS block ──────────────────────────────────────────────────────────────
html = rep(html,
    ".dvl-btn-migrated-trade-action {}\n</style>\n\n<style>\n:root{",
    ".dvl-btn-migrated-trade-action {}\n</style>\n\n<style id=\"DVL_LAYOUT_CONTRACT_CSS_0656\">\n/* DVL Beta 0.656 — Phase 2.0: layout contract diagnostics.\n   Read-only/visual-neutral. No layout or visual properties. */\n</style>\n\n<style>\n:root{",
    "insert DVL_LAYOUT_CONTRACT_CSS_0656")

# ── 6. Layout contract module (insert after BUTTON_SYSTEM_MODULE_0655 IIFE) ──
NEW_MODULE = """
// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 =====
(function(){
"use strict";

var _lastSnapshot = null;
var _baselines = {};

function getRect(el){
  if(!el) return { exists: false, top: null, left: null, right: null, bottom: null, width: null, height: null };
  var r = el.getBoundingClientRect();
  return {
    exists: true,
    top:    r.top,
    left:   r.left,
    right:  r.right,
    bottom: r.bottom,
    width:  r.width,
    height: r.height
  };
}

function getOscillators(){
  var selectors = ['.dvlOscillator', '.dvl-oscillator', '.oscillatorPanel',
                   '[data-dvl-oscillator]', '[data-oscillator-panel]'];
  var found = [];
  for(var s = 0; s < selectors.length; s++){
    var els = document.querySelectorAll(selectors[s]);
    for(var i = 0; i < els.length; i++) found.push(getRect(els[i]));
  }
  return found;
}

function getPaperLines(){
  var els = document.querySelectorAll('.dvl-paper-line');
  var result = [];
  for(var i = 0; i < els.length; i++) result.push(getRect(els[i]));
  return result;
}

function getPaperEditLabels(){
  var els = document.querySelectorAll('.dvl-paper-edit-label');
  var result = [];
  for(var i = 0; i < els.length; i++) result.push(getRect(els[i]));
  return result;
}

function measure(){
  var snap = {
    timestamp:       Date.now(),
    viewport:        { width: window.innerWidth, height: window.innerHeight },
    header:          getRect(document.querySelector('.top')),
    assetBar:        getRect(document.querySelector('.marketRow')),
    toolbar:         getRect(document.querySelector('.toolbar')),
    canvasWrap:      getRect(document.querySelector('.canvasWrap')),
    chart:           getRect(document.getElementById('chart')),
    footer:          getRect(document.querySelector('.bottomNav')),
    tradeDrawer:     getRect(document.querySelector('.tradeDrawer')),
    tradeDrawerSheet:getRect(document.querySelector('.tradeDrawerSheet')),
    paperLayer:      getRect(document.querySelector('.dvl-paper-layer')),
    paperLines:      getPaperLines(),
    paperEditLabels: getPaperEditLabels(),
    paperConfirm:    getRect(document.querySelector('.dvl-paper-confirm')),
    paperEditConfirm:getRect(document.querySelector('.dvl-paper-edit-confirm')),
    oscillators:     getOscillators()
  };
  _lastSnapshot = snap;
  return snap;
}

function audit(){
  var snap = measure();
  var bs = window.DVL_BUTTON_SYSTEM;
  var bsAudit = null;
  var tradeActionMigrated = 0;
  var drawerMigrated = 0;
  try{
    if(bs && typeof bs.audit === 'function'){
      bsAudit = bs.audit();
      tradeActionMigrated = bsAudit.tradeActionMigrated || 0;
      drawerMigrated = bsAudit.drawerMigrated || 0;
    }
  }catch(_){}
  return {
    version:              "0.656",
    chartExists:          snap.chart.exists,
    canvasWrapExists:     snap.canvasWrap.exists,
    footerExists:         snap.footer.exists,
    tradeDrawerExists:    snap.tradeDrawer.exists,
    paperLayerExists:     snap.paperLayer.exists,
    oscillatorCount:      snap.oscillators.length,
    buttonSystemExists:   !!(bs),
    buttonSystemFrozen:   !!(bs && bs.registry),
    tradeActionMigrated:  tradeActionMigrated,
    drawerMigrated:       drawerMigrated,
    noLayoutMutation:     true,
    snapshot:             snap
  };
}

function freezeBaseline(name){
  var key = name || "default";
  _baselines[key] = measure();
  return _baselines[key];
}

function compareWithBaseline(name){
  var key = name || "default";
  var base = _baselines[key];
  if(!base) return { error: "no baseline stored for: " + key };
  var now = measure();
  function diff(a, b, field){
    if(a == null || b == null) return null;
    return b - a;
  }
  return {
    canvasWrap: {
      heightDiff: diff(base.canvasWrap.height, now.canvasWrap.height),
      topDiff:    diff(base.canvasWrap.top,    now.canvasWrap.top),
      bottomDiff: diff(base.canvasWrap.bottom, now.canvasWrap.bottom)
    },
    chart: {
      heightDiff: diff(base.chart.height, now.chart.height),
      topDiff:    diff(base.chart.top,    now.chart.top),
      bottomDiff: diff(base.chart.bottom, now.chart.bottom)
    },
    footer: {
      topDiff:    diff(base.footer.top,    now.footer.top),
      bottomDiff: diff(base.footer.bottom, now.footer.bottom)
    },
    tradeDrawerSheet: {
      topDiff:    diff(base.tradeDrawerSheet.top,    now.tradeDrawerSheet.top),
      bottomDiff: diff(base.tradeDrawerSheet.bottom, now.tradeDrawerSheet.bottom),
      heightDiff: diff(base.tradeDrawerSheet.height, now.tradeDrawerSheet.height)
    },
    oscillatorCount: {
      before: base.oscillators.length,
      after:  now.oscillators.length,
      diff:   now.oscillators.length - base.oscillators.length
    }
  };
}

function getLastSnapshot(){
  return _lastSnapshot;
}

window.DVL_LAYOUT_CONTRACT = {
  VERSION:              "0.656",
  measure:              measure,
  audit:                audit,
  freezeBaseline:       freezeBaseline,
  compareWithBaseline:  compareWithBaseline,
  getLastSnapshot:      getLastSnapshot
};

})();

"""

html = rep(html,
    "})();\n\nwindow.DVL_SECTION_SIZES_PX = {",
    "})();" + NEW_MODULE + "window.DVL_SECTION_SIZES_PX = {",
    "insert DVL_LAYOUT_CONTRACT_MODULE_0656")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_656 applied: title, badge, DVL_APP_VERSION, changelog 0.656, DVL_LAYOUT_CONTRACT_CSS_0656, DVL_LAYOUT_CONTRACT_MODULE_0656")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. title
assert "<title>DVL Binance Live — Beta 0.656</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.655</title>" not in content, "FAIL: old title"

# 2. DVL_APP_VERSION
assert 'const DVL_APP_VERSION = "Beta 0.656";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.655";' not in content, "FAIL: old DVL_APP_VERSION"

# 3. Static badge
assert ">BETA 0.656<" in content, "FAIL: static badge"
assert ">BETA 0.655<" not in content, "FAIL: old static badge"

# 4. Changelog
assert 'Beta 0.656 — Phase 2.0: contrato/auditoria de layout read-only para chart, Paper Trading, osciladores e trade drawer.' in content, "FAIL: changelog 0.656"
assert '"Beta 0.655", note: "Phase 1.13:' in content, "FAIL: 0.655 changelog preserved"

# 5. CSS block
assert '<style id="DVL_LAYOUT_CONTRACT_CSS_0656">' in content, "FAIL: CSS block tag"
assert 'Phase 2.0: layout contract diagnostics' in content, "FAIL: CSS comment"

# 6. Module present exactly once
assert content.count("DVL_LAYOUT_CONTRACT_MODULE_0656") == 1, "FAIL: module count"

# 7. DVL_LAYOUT_CONTRACT export
assert "window.DVL_LAYOUT_CONTRACT = {" in content, "FAIL: window.DVL_LAYOUT_CONTRACT"
assert "VERSION:              \"0.656\"," in content, "FAIL: VERSION"

# 8. All five functions
assert "function measure()" in content, "FAIL: measure()"
assert "function audit()" in content, "FAIL: audit()"
assert "function freezeBaseline(" in content, "FAIL: freezeBaseline()"
assert "function compareWithBaseline(" in content, "FAIL: compareWithBaseline()"
assert "function getLastSnapshot()" in content, "FAIL: getLastSnapshot()"

# 9. measure exports
assert "measure:              measure," in content, "FAIL: measure exported"
assert "audit:                audit," in content, "FAIL: audit exported"
assert "freezeBaseline:       freezeBaseline," in content, "FAIL: freezeBaseline exported"
assert "compareWithBaseline:  compareWithBaseline," in content, "FAIL: compareWithBaseline exported"
assert "getLastSnapshot:      getLastSnapshot" in content, "FAIL: getLastSnapshot exported"

# 10. oscillator detection (defensive multi-selector)
assert ".dvlOscillator" in content, "FAIL: dvlOscillator selector"
assert ".dvl-oscillator" in content, "FAIL: dvl-oscillator selector"
assert ".oscillatorPanel" in content, "FAIL: oscillatorPanel selector"
assert "[data-dvl-oscillator]" in content, "FAIL: data-dvl-oscillator selector"
assert "[data-oscillator-panel]" in content, "FAIL: data-oscillator-panel selector"

# 11. noLayoutMutation: true
assert "noLayoutMutation:     true," in content, "FAIL: noLayoutMutation"

# 12. BUTTON_SYSTEM_MODULE_0655 preserved, 0656 NOT created
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system module 0655 missing"
assert "DVL_BUTTON_SYSTEM_MODULE_0656" not in content, "FAIL: button system module 0656 wrongly created"

# 13. No nested script
assert '<script id="DVL_LAYOUT_CONTRACT' not in content, "FAIL: nested script"
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script button"

# 14. Zero DVL_TODO_0656
assert "DVL_TODO_0656" not in content, "FAIL: DVL_TODO_0656 remaining"

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

# 17. No size classes applied in JS
assert "classList.add('dvl-btn-xs')" not in content, "FAIL: dvl-btn-xs applied"
assert "classList.add('dvl-btn-sm')" not in content, "FAIL: dvl-btn-sm applied"
assert "classList.add('dvl-btn-md')" not in content, "FAIL: dvl-btn-md applied"

# 18. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 19. No ResizeObserver / MutationObserver in new module (only in button system)
lc_idx = content.index("DVL_LAYOUT_CONTRACT_MODULE_0656")
sec_idx = content.index("window.DVL_SECTION_SIZES_PX")
module_slice = content[lc_idx:sec_idx]
assert "ResizeObserver" not in module_slice, "FAIL: ResizeObserver in contract module"
assert "MutationObserver" not in module_slice, "FAIL: MutationObserver in contract module"
assert "requestAnimationFrame" not in module_slice, "FAIL: rAF in contract module"
assert "setInterval" not in module_slice, "FAIL: setInterval in contract module"

# 20. No layout mutation in new module
assert "style.height" not in module_slice, "FAIL: style.height mutation in contract module"
assert "style.width" not in module_slice, "FAIL: style.width mutation in contract module"
assert "classList.add" not in module_slice, "FAIL: classList.add in contract module"

print("[OK] all 47 assertions passed — 0656 clean, DVL_LAYOUT_CONTRACT_MODULE_0656 read-only, Button System 0655 preserved")
