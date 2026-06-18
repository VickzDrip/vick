#!/usr/bin/env python3
"""
patch_639.py — DVL Beta 0.639 — Phase 0: UI/Touch Guard scaffold

Implements the DVL_TODO_0639 checklist from index-4_annotated_for_claude.html.
Phase 0 only creates the touch-guard scaffold and marks UI surfaces so that
buttons, panels, dropdowns, the number pad, paper-trading tags and tools do
NOT leak pointer events into the chart (pan/zoom/crosshair). The chart canvas
(#chart) keeps pan/pinch/zoom/crosshair working normally.

No visual change: only data-dvl-ui markers, a minimal tap-highlight CSS rule,
the DVL_TOUCH_GUARD module, and three guard consultations inside the chart
pointer handlers. No colors/layout/sizes/logic touched.

Blocks completed: 01,02,03,04,05,06,07,08,09,10,11,12,13,16.
Blocks satisfied by existing mechanics + marking (no risky edits): 14,15,17.
"""
import sys, pathlib

SRC = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
html = SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1:  print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── Block 01 — Title (DVL_VERSION_TITLE_0639) ────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.629</title>',
    '<title>DVL Binance Live — Beta 0.639</title>',
    "01 title")

# ── Block 02 — UI Touch Guard CSS (DVL_UI_TOUCH_GUARD_CSS_0639) ───────────────
# Dedicated minimal style block before the first :root token. Only tap-highlight
# removal + touch-action:manipulation on safe UI surfaces. Never targets #chart.
GUARD_CSS = """\
<style id="DVL_UI_TOUCH_GUARD_CSS_0639">
/* DVL Beta 0.639 — Phase 0 UI/touch guard (minimal, visual-neutral).
   Removes mobile tap-highlight on marked UI surfaces and keeps fast taps
   on safe buttons/menus. Does NOT affect #chart / canvas interactions. */
[data-dvl-ui="true"], [data-dvl-ui="true"] *{ -webkit-tap-highlight-color: transparent; }
[data-dvl-ui="true"] button,
[data-dvl-ui="true"] [role="button"],
.bottomNav button,
.tradeDrawer .panelBtn,
.tradeDrawer .tradeAction,
.orderTypeMenu .orderTypeOption,
.numberPadSheet button{ touch-action: manipulation; }
</style>
<style>
:root{"""
html = rep(html, '<style>\n:root{', GUARD_CSS, "02 guard css")

# ── Block 03 — Version + Changelog (DVL_VERSION_CHANGELOG_0639) ───────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.638";',
    'const DVL_APP_VERSION = "Beta 0.639";',
    "03 app version")
# Pin the existing 0.638 entry to its literal version, then add the 0.639 entry.
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: native DVL demo-position text removed; labels 10 candles right of creation; edit label stable." },',
    '  { version: DVL_APP_VERSION, note: "Phase 0: UI/touch guard scaffold e marcação de superfícies UI antes da padronização de botões." },\n'
    '  { version: "Beta 0.638", note: "Fix: native DVL demo-position text removed; labels 10 candles right of creation; edit label stable." },',
    "03 changelog")
# Static badge (JS also auto-sets it from DVL_APP_VERSION).
html = rep(html, '>BETA 0.638</div>', '>BETA 0.639</div>', "03 badge")

# ── Block 04 — Trade drawer UI surface (DVL_TRADE_DRAWER_UI_SURFACE_0639) ─────
html = rep(html,
    '<div class="tradeDrawer" id="tradeDrawer">',
    '<div class="tradeDrawer" id="tradeDrawer" data-dvl-ui="true">',
    "04 tradeDrawer")
html = rep(html,
    '<div class="tradeDrawer" id="tradeDrawer" data-dvl-ui="true">\n  <div class="tradeDrawerSheet">',
    '<div class="tradeDrawer" id="tradeDrawer" data-dvl-ui="true">\n  <div class="tradeDrawerSheet" data-dvl-ui="true">',
    "04 tradeDrawerSheet")
html = rep(html,
    '<div class="tradeDrawerBody">',
    '<div class="tradeDrawerBody" data-dvl-ui="true">',
    "04 tradeDrawerBody")

# ── Block 05 — Bottom nav UI surface (DVL_BOTTOM_NAV_UI_SURFACE_0639) ─────────
html = rep(html,
    '<nav class="bottomNav">',
    '<nav class="bottomNav" data-dvl-ui="true">',
    "05 bottomNav")

# ── Block 06 — Number pad UI surface (DVL_NUMBER_PAD_UI_SURFACE_0639) ─────────
html = rep(html,
    '<div class="numberPadOverlay" id="entryPadOverlay" aria-hidden="true">',
    '<div class="numberPadOverlay" id="entryPadOverlay" aria-hidden="true" data-dvl-ui="true">',
    "06 numberPadOverlay")
html = rep(html,
    '<div class="numberPadSheet" role="dialog" aria-modal="true" aria-label="Editar Entry">',
    '<div class="numberPadSheet" role="dialog" aria-modal="true" aria-label="Editar Entry" data-dvl-ui="true">',
    "06 numberPadSheet")

# ── Block 07 — Asset dropdown UI surface (DVL_ASSET_DROPDOWN_UI_SURFACE_0639) ─
html = rep(html,
    '<div class="assetDropdown" id="assetDropdown" aria-hidden="true"></div>',
    '<div class="assetDropdown" id="assetDropdown" aria-hidden="true" data-dvl-ui="true"></div>',
    "07 assetDropdown")

# ── Block 08 — Tools menu UI surface (DVL_TOOLS_MENU_UI_SURFACE_0639) ─────────
html = rep(html,
    '<div class="assetToolsMenu" id="assetToolsMenu" aria-hidden="true">',
    '<div class="assetToolsMenu" id="assetToolsMenu" aria-hidden="true" data-dvl-ui="true">',
    "08 assetToolsMenu")

# ── Block 09 — Indicator dropdown (DVL_INDICATOR_DROPDOWN_UI_SURFACE_0639) ────
html = rep(html,
    '<div class="indicatorDropdown" id="indicatorDropdown" aria-hidden="true">',
    '<div class="indicatorDropdown" id="indicatorDropdown" aria-hidden="true" data-dvl-ui="true">',
    "09 indicatorDropdown")

# ── Block 10 — Order type menu (DVL_ORDER_TYPE_MENU_UI_SURFACE_0639) ──────────
html = rep(html,
    '<div class="orderTypeMenu" id="orderTypeMenu" aria-hidden="true">',
    '<div class="orderTypeMenu" id="orderTypeMenu" aria-hidden="true" data-dvl-ui="true">',
    "10 orderTypeMenu")

# ── Block 11 — DVL_TOUCH_GUARD module (DVL_TOUCH_GUARD_MODULE_0639) ───────────
TOUCH_GUARD_MODULE = """\
/* ===== DVL_TOUCH_GUARD_MODULE_0639 =====
   Phase 0 scaffold. Identifies UI surfaces (buttons, panels, dropdowns, number
   pad, paper-trading tags/labels, tools menus) so taps on them do not leak into
   the chart as pan/zoom/crosshair. The chart canvas (#chart) and non-UI overlays
   keep interacting normally. Visual design is unchanged. */
(function(){
  "use strict";

  var UI_SELECTOR = [
    'button','input','select','textarea','[role="button"]','[data-dvl-ui="true"]',
    '.bottomNav','.tradeDrawer','.tradeDrawerSheet','.tradeDrawerBody',
    '.panelBtn','.panelMetric','.tradeAction','.panelToggle',
    '.numberPadOverlay','.numberPadSheet','.orderTypeMenu',
    '.indicatorDropdown','.assetDropdown','.assetToolsMenu','.candleTypeMenu',
    '.tfMoreMenu','.dvlDrawSettingsPanel','.dvlDrawCtxBar','.dvlTextPanel',
    '.dvl-paper-tag','.dvl-paper-edit-label-fixed','.dvl-paper-confirm',
    '.assetFavoritesDrawer','.assetFavoritesSheet'
  ].join(',');

  function evTarget(ev){
    if(!ev) return null;
    return ev.target || ev.srcElement || null;
  }

  /* The real chart canvas must always interact (pan/pinch/zoom/crosshair). */
  function isChartAllowedTarget(ev){
    var t = evTarget(ev);
    if(!t) return false;
    if(t.id === 'chart') return true;
    if(t.tagName && t.tagName.toUpperCase() === 'CANVAS' &&
       t.closest && t.closest('#chartWrap')) return true;
    return false;
  }

  /* True when the pointer's real target is (inside) a UI surface. */
  function isUiTarget(ev){
    var t = evTarget(ev);
    if(!t || !t.closest) return false;
    return !!t.closest(UI_SELECTOR);
  }

  /* The chart handlers consult this: block chart reaction for UI taps,
     never block a genuine canvas interaction. */
  function shouldBlockChartPointer(ev){
    if(isChartAllowedTarget(ev)) return false;
    return isUiTarget(ev);
  }

  /* Marks existing UI containers with data-dvl-ui="true" without visual change. */
  function markUiSurface(root){
    try{
      var scope = root || document;
      if(!scope.querySelectorAll) return;
      var nodes = scope.querySelectorAll(UI_SELECTOR);
      for(var i=0;i<nodes.length;i++){
        var n = nodes[i];
        if(!n || n.id === 'chart') continue;
        if(n.setAttribute && n.getAttribute('data-dvl-ui') !== 'true'){
          n.setAttribute('data-dvl-ui','true');
        }
      }
    }catch(_){}
  }

  function init(){ markUiSurface(document); }

  window.DVL_TOUCH_GUARD = {
    UI_SELECTOR: UI_SELECTOR,
    isUiTarget: isUiTarget,
    isChartAllowedTarget: isChartAllowedTarget,
    shouldBlockChartPointer: shouldBlockChartPointer,
    markUiSurface: markUiSurface,
    init: init
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();

window.DVL_SECTION_SIZES_PX = {"""
html = rep(html,
    'window.DVL_SECTION_SIZES_PX = {',
    TOUCH_GUARD_MODULE,
    "11 touch guard module")

# ── Block 12 — Integrate guard in chart interactions ─────────────────────────
#   (DVL_CHART_TOUCH_GUARD_INTEGRATION_0639)
# Only block pointers that are NOT already tracked as chart pointers, so an
# active pan/pinch/crosshair gesture is never interrupted mid-stream.
html = rep(html,
    '  function _onDown(ev){\n'
    '    if(window.__dvlPositionDragActive) return;\n',
    '  function _onDown(ev){\n'
    '    if(window.__dvlPositionDragActive) return;\n'
    '    /* DVL_CHART_TOUCH_GUARD_INTEGRATION_0639 — ignore UI-originated taps */\n'
    '    if(chartPointers.size === 0 && window.DVL_TOUCH_GUARD &&\n'
    '       window.DVL_TOUCH_GUARD.shouldBlockChartPointer(ev)) return;\n',
    "12 _onDown guard")

html = rep(html,
    '  function _onMove(ev){\n'
    '    if(window.__dvlPositionDragActive) return;\n'
    '    if(!chartPointers.has(ev.pointerId)) return;\n',
    '  function _onMove(ev){\n'
    '    if(window.__dvlPositionDragActive) return;\n'
    '    /* DVL_CHART_TOUCH_GUARD_INTEGRATION_0639 — ignore untracked UI pointers */\n'
    '    if(!chartPointers.has(ev.pointerId) && window.DVL_TOUCH_GUARD &&\n'
    '       window.DVL_TOUCH_GUARD.shouldBlockChartPointer(ev)) return;\n'
    '    if(!chartPointers.has(ev.pointerId)) return;\n',
    "12 _onMove guard")

html = rep(html,
    '  function _onEnd(ev){\n'
    '    if(!chartPointers.has(ev.pointerId)) return;\n',
    '  function _onEnd(ev){\n'
    '    /* DVL_CHART_TOUCH_GUARD_INTEGRATION_0639 — ignore untracked UI pointers */\n'
    '    if(!chartPointers.has(ev.pointerId) && window.DVL_TOUCH_GUARD &&\n'
    '       window.DVL_TOUCH_GUARD.shouldBlockChartPointer(ev)) return;\n'
    '    if(!chartPointers.has(ev.pointerId)) return;\n',
    "12 _onEnd guard")

# ── Block 16 — Expand drawing context guard (DVL_DRAW_CONTEXT_GUARD_0639) ─────
html = rep(html,
    "const _CTX_GUARD='#dvlDrawCtxBar,#dvlDrawSettingsPanel,#dvlDrawDelete,#viewBtnDock,#dvlMiniRefresh';",
    "const _CTX_GUARD='#dvlDrawCtxBar,#dvlDrawSettingsPanel,#dvlDrawDelete,#viewBtnDock,#dvlMiniRefresh,[data-dvl-ui=\"true\"]';",
    "16 _CTX_GUARD expand")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_639 applied ({len(_ok)} edits): {', '.join(_ok)}")
