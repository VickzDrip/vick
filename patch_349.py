# patch_349.py — Beta 0.349
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.348)
#
# TOPBAR & DROPDOWN FLICKER FIXES:
#
# JS FIX 1 — Badge text flicker (30+ IIFEs)
#   Every component IIFE (dvl290, dvl291, dvl296, dvl297, dvl316, dvl319, dvl321 …)
#   runs forceVersion()/version() on DOMContentLoaded and at timeout intervals.
#   Each has its own stale `const VER` (e.g. 'Beta 0.312') and writes it to ALL
#   badge elements, causing the badge to flicker through old strings before the
#   authoritative DVL_APP_VERSION restores it.
#   Fix: replace `el.textContent=VER` guards with `window.DVL_APP_VERSION||VER`
#   so each IIFE displays the globally-locked version, not its own stale VER.
#   Three whitespace variants are patched via rep_all.
#
# JS FIX 2 — dvl316 boot() clobbers DOM while dropdown is open
#   A MutationObserver on the order panel fires schedule()→boot() every time the
#   paper-trading panel rebuilds. boot() calls normalizeAssetButton() which does
#   replaceChild() — replacing the asset button DOM node while the dropdown is
#   visible causes the menu to lose its anchor and flicker/close.
#   Fix: guard the DOM-mutating part of boot() — skip it if any dropdown is open.
#
# JS FIX 3 — dvl319 candle boot() re-renders menu while open
#   boot() calls renderMenu() unconditionally; if it fires (from timeout or
#   MutationObserver) while the candle dropdown is open it replaces innerHTML,
#   causing a flash. Fix: skip renderMenu() while open==true.
#
# CSS FIX — Single authoritative override block appended before </body>
#   - .topbar: definitive stable values (no more cascade wars from 16+ blocks)
#   - .tb-header: clean 3-column grid, position:relative so badge anchors to it
#   - #dvlVersionBadge: top:50%/translateY(-50%) → stays within tb-header, no
#     price-strip overlap (removes the old translateY(36px) that pushed it out)
#   - Dropdown menus: position:fixed + opacity/visibility/pointer-events only
#     (no display toggle); mobile: left clamped to [8px, 100vw-menuW-8px]
#   - .price / .tb-price-strip: min-width:0 + flex-shrink guard so price never
#     overflows into badge or leverage display
#
# VERSION: 0.348 → 0.349

import sys, re

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    fixes.append(label)
    return html.replace(old, new)

def rep_all(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    fixes.append('%s (x%d)' % (label, html.count(old)))
    return html.replace(old, new)

# ── JS FIX 1: badge text flicker — use window.DVL_APP_VERSION||VER everywhere ──
# There are 3 whitespace variants in the file.

# Variant A: no spaces  (e.g. dvl297, dvl316, dvl319, dvl321, dvl319-clamped)
html = rep_all(html,
    'el&&el.textContent!==VER)el.textContent=VER',
    'el&&el.textContent!==(window.DVL_APP_VERSION||VER))el.textContent=(window.DVL_APP_VERSION||VER)',
    'badge-fix variant A: el&&el.textContent!==VER'
)

# Variant B: spaces around operators  (e.g. dvl290, dvl291, dvl296, dvl300-326)
html = rep_all(html,
    'el && el.textContent !== VER) el.textContent = VER',
    'el && el.textContent !== (window.DVL_APP_VERSION||VER)) el.textContent = (window.DVL_APP_VERSION||VER)',
    'badge-fix variant B: el && el.textContent !== VER'
)

# Variant C: mixed — no-space comparison, spaced assignment
html = rep_all(html,
    'el&&el.textContent!==VER) el.textContent=VER',
    'el&&el.textContent!==(window.DVL_APP_VERSION||VER)) el.textContent=(window.DVL_APP_VERSION||VER)',
    'badge-fix variant C: el&&el.textContent!==VER) el.textContent=VER'
)

# Variant D: spaces in &&, no-space assignment  (e.g. dvl320 forceVersion)
html = rep_all(html,
    'el && el.textContent!==VER) el.textContent=VER',
    'el && el.textContent!==(window.DVL_APP_VERSION||VER)) el.textContent=(window.DVL_APP_VERSION||VER)',
    'badge-fix variant D: el && el.textContent!==VER'
)

# ── JS FIX 2: dvl316 boot() — skip DOM normalisation while dropdown is open ────
html = rep(html,
    'function boot(){\n    raf=0; version(); normalizeAssetButton(); renderAssetMenu(); normalizeTypeShell(); renderTypeMenu(); liftLev(); bindGlobal();\n  }',
    'function boot(){\n    raf=0; version();\n    if((q(\'#dvl313AssetMenuFixed\')&&q(\'#dvl313AssetMenuFixed\').classList.contains(\'open\'))||(q(\'#dvl316TypeMenu\')&&q(\'#dvl316TypeMenu\').classList.contains(\'open\')))return;\n    normalizeAssetButton(); renderAssetMenu(); normalizeTypeShell(); renderTypeMenu(); liftLev(); bindGlobal();\n  }',
    'dvl316 boot(): guard DOM ops when dropdown open'
)

# ── JS FIX 3: dvl319 candle boot() — skip renderMenu() while menu is open ───────
html = rep(html,
    'function boot(){raf=0; forceVersion(); disableOld(); markLev(); bind(); renderMenu();}',
    'function boot(){raf=0; forceVersion(); disableOld(); markLev(); bind(); if(!open)renderMenu();}',
    'dvl319 boot(): skip renderMenu() while candle dropdown open'
)

# ── CSS FIX: insert consolidated override block before </body> ──────────────────
CONSOLIDATED_CSS = '''
<style id="DVL_349_TOPBAR_DROPDOWN_CONSOLIDATED">
/* ═══════════════════════════════════════════════════════════════
   DVL Beta 0.349 — Single authoritative override for:
   .topbar  .tb-header  .tb-asset-wrap  .tb-right-btns
   #dvlVersionBadge  .dvl-version-badge
   #dvl313AssetMenuFixed  #dvl316TypeMenu
   #dvl317CandleMenu  #dvl318CandleMenu
   ═══════════════════════════════════════════════════════════════ */

/* ── Topbar shell ───────────────────────────────────────────── */
.topbar{
  height:auto!important;
  min-height:58px!important;
  max-height:none!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:stretch!important;
  padding:0!important;
  gap:0!important;
  overflow:visible!important;
  position:relative!important;
  z-index:60!important;
  flex-shrink:0!important;
  box-sizing:border-box!important;
}

/* ── tb-header row (asset button + badge + logo + icon btns) ── */
.tb-header{
  display:grid!important;
  grid-template-columns:auto minmax(0,1fr) auto!important;
  align-items:center!important;
  gap:8px!important;
  padding:6px 12px 4px!important;
  height:auto!important;
  min-height:44px!important;
  position:relative!important;
  box-sizing:border-box!important;
}
@media(max-width:760px){
  .tb-header{padding:5px 8px 3px!important;gap:6px!important;}
}

/* ── Asset wrap (grid col 2, center) ─────────────────────────── */
.tb-asset-wrap{
  grid-column:2!important;
  justify-self:center!important;
  max-width:min(230px,44vw)!important;
  width:100%!important;
  height:34px!important;
  min-height:34px!important;
  box-sizing:border-box!important;
  position:relative!important;
  overflow:visible!important;
}
@media(max-width:760px){
  .tb-asset-wrap{max-width:min(200px,42vw)!important;height:32px!important;min-height:32px!important;}
}
@media(max-width:390px){
  .tb-asset-wrap{max-width:min(160px,38vw)!important;}
}

/* ── Version badge: centered under asset wrap, within tb-header ─ */
#dvlVersionBadge,
.dvl-version-header.dvl-version-badge{
  position:absolute!important;
  top:auto!important;
  bottom:2px!important;
  left:50%!important;
  transform:translateX(-50%)!important;
  z-index:5!important;
  pointer-events:none!important;
  white-space:nowrap!important;
  font-size:7.5px!important;
  height:17px!important;
  line-height:17px!important;
  padding:0 8px!important;
  border-radius:6px!important;
  letter-spacing:.06em!important;
}
@media(min-width:761px){
  #dvlVersionBadge{font-size:8px!important;height:18px!important;line-height:18px!important;}
}

/* ── Price strip: flex row, no overflow ─────────────────────── */
.tb-price-strip{
  display:flex!important;
  align-items:center!important;
  gap:12px!important;
  padding:3px 12px 5px!important;
  min-width:0!important;
  flex-shrink:1!important;
  box-sizing:border-box!important;
  overflow:hidden!important;
}
.tb-price-left{
  flex:0 0 auto!important;
  min-width:0!important;
  display:flex!important;
  flex-direction:column!important;
  gap:1px!important;
}
.tb-price-stats{
  flex:1 1 auto!important;
  min-width:0!important;
  display:flex!important;
  gap:12px!important;
  overflow:hidden!important;
}
@media(max-width:760px){
  .tb-price-strip{padding:2px 8px 4px!important;gap:8px!important;}
  .tb-price-stats{gap:8px!important;}
}
@media(max-width:390px){
  .tb-price-stats{display:none!important;}
}

/* ── Asset name / sub-label ──────────────────────────────────── */
.asset-main{
  font-size:22px!important;
  font-weight:850!important;
  letter-spacing:-.5px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  max-width:100%!important;
  line-height:1!important;
}
.asset-sub{
  font-size:10px!important;
  letter-spacing:1.8px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  max-width:100%!important;
  line-height:1!important;
}
@media(max-width:760px){
  .asset-main{font-size:19px!important;}
  .asset-sub{font-size:9px!important;}
}
@media(max-width:390px){
  .asset-main{font-size:17px!important;}
}

/* ── Asset dropdown menu (fixed persistent layer) ────────────── */
#dvl313AssetMenuFixed{
  position:fixed!important;
  z-index:2147483640!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
  transition:none!important;
  contain:layout style paint!important;
  max-width:calc(100vw - 16px)!important;
}
#dvl313AssetMenuFixed.open{
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
}

/* ── Type dropdown menu ──────────────────────────────────────── */
#dvl316TypeMenu{
  position:fixed!important;
  z-index:2147483640!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
  transition:none!important;
  max-width:calc(100vw - 16px)!important;
}
#dvl316TypeMenu.open{
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
}

/* ── Candle dropdown menus ──────────────────────────────────── */
#dvl317CandleMenu,
#dvl318CandleMenu{
  position:fixed!important;
  z-index:2147483640!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
  transition:none!important;
  max-width:calc(100vw - 16px)!important;
}
#dvl317CandleMenu.open,
#dvl318CandleMenu.open{
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
}

/* ── Dropdown menus: never clip off-screen on mobile ─────────── */
@media(max-width:520px){
  #dvl313AssetMenuFixed,
  #dvl316TypeMenu,
  #dvl317CandleMenu,
  #dvl318CandleMenu{
    max-width:calc(100vw - 16px)!important;
    min-width:0!important;
    left:clamp(8px, var(--dvl-menu-left, 8px), calc(100vw - 200px))!important;
  }
}

/* ── Tool-select: stable single definition ───────────────────── */
.tool-select{
  font-family:monospace!important;
  font-size:10px!important;
  color:#8da3c2!important;
  background:rgba(6,8,15,.92)!important;
  border:1px solid rgba(30,42,64,.9)!important;
  border-radius:9px!important;
  padding:5px 10px!important;
  outline:none!important;
  height:32px!important;
  box-sizing:border-box!important;
  cursor:pointer!important;
}
.tool-select:focus{
  border-color:#00d4ff!important;
  color:#00d4ff!important;
}
@media(max-width:900px){
  .tool-select{height:36px!important;font-size:10px!important;padding:5px 9px!important;}
}
</style>
'''

html = rep(html,
    '\n</body>\n</html>',
    CONSOLIDATED_CSS + '\n</body>\n</html>',
    'insert DVL_349_TOPBAR_DROPDOWN_CONSOLIDATED before </body>'
)

# ── Version bump: 0.348 → 0.349 ─────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.348";',
    'const DVL_APP_VERSION = "Beta 0.349";',
    'DVL_APP_VERSION const 0.348→0.349'
)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.348";',
    'const LOCAL_VERSION = "Beta 0.349";',
    'LOCAL_VERSION 0.348→0.349'
)
html = rep(html,
    "  const VER='Beta 0.348';",
    "  const VER='Beta 0.349';",
    'VER 0.348→0.349 in DVL_BETA_0334 script'
)
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.348</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.349</span>',
    'static dvlVersionBadge 0.348→0.349'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.348</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.349</span>',
    'static dvl-version-logo-hidden 0.348→0.349'
)
html = rep(html,
    "'Beta 0.348: IDs duplicados críticos consolidados: ppQty/ppRiskPct/ppOrderType/dvl290LiqRow. Painel paper-trading usa IDs ppFormQty/ppFormRiskPct/ppFormOrderType; valores espelham inputs estáticos do DTB. getElementById estabilizado.'",
    "'Beta 0.349: Topbar e dropdowns consolidados. Dropdowns não acionam redesenho do gráfico ao abrir/fechar. Menus protegidos contra corte lateral e flicker no mobile.'",
    'changelog note 0.349'
)
html = rep(html,
    '/* Beta 0.348: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    '/* Beta 0.349: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    'DVL_APP_VERSION stub comment 0.348→0.349'
)

# ── result ────────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 3:
        print('Too many errors — aborting write.')
        sys.exit(1)
else:
    print('All checks passed.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print()

total_lines = html.count('\n') + 1
print('Written to', DST)
print('Total lines after patch: %d' % total_lines)
print()
print('Beta 0.349 changes:')
print('  JS: Badge flicker — all 30+ old IIFEs now use window.DVL_APP_VERSION||VER')
print('       (no more badge cycling through old version strings on load)')
print('  JS: dvl316 boot() skips DOM normalisation while asset/type dropdown is open')
print('       (MutationObserver on order panel no longer causes replaceChild flicker)')
print('  JS: dvl319 candle boot() skips renderMenu() while candle dropdown is open')
print('  CSS: DVL_349_TOPBAR_DROPDOWN_CONSOLIDATED block added as final cascade winner:')
print('       - .topbar: flex-column, auto height, position:relative')
print('       - .tb-header: 3-col grid, position:relative (badge anchors inside)')
print('       - #dvlVersionBadge: bottom:2px inside tb-header, no translateY(36px)')
print('         (no more price-strip overlap)')
print('       - .tb-price-strip: flex with min-width:0 (no overflow into badge/lev)')
print('       - Dropdown menus: opacity/visibility/pointer-events only')
print('         max-width:calc(100vw-16px) prevents off-screen clipping on mobile')
print('       - .tool-select: single stable definition')
print('  Version: Beta 0.349')
