# patch_343.py — Beta 0.343
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.342)
#
# Fixes:
#  1. Remove checkVersion() calls on focus/visibilitychange/pageshow/online/interval
#     in both DVL_FORCE_UPDATE_MANAGER IIFEs — replace with lightweight canvas redraw
#     on visibilitychange only.  forceReloadToLatest() is already a no-op; these
#     calls just waste network round-trips.
#  2. Fix CoinGlass eye/gear buttons: remove h.eye=null; h.gear=null; from
#     updateChartButtons() in Beta 0.334 — those null assignments corrupt
#     window._dvlCgOscHit between draw frames.
#  3. Fix CoinGlass indicator-tab card HTML: injectCards() still injects the old
#     .ind-head/.dvl-icd-ico/.ind-copy/.ind-actions structure; Beta 0.328 CSS
#     targets .dvl-icd-head/.dvl-icd-icon/.dvl-icd-info/.dvl-icd-ctrl.
#     Update the injected HTML to use the correct class names and native SVG icons
#     so cards look correct immediately (Beta 0.328 normalizeCard() still runs too).
#  4. Version bump: 0.342 → 0.343

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

# ── 1. Replace checkVersion event listeners in both DVL_FORCE_UPDATE_MANAGER IIFEs ──
# Both copies are byte-identical → rep_all covers them.
OLD_LISTENERS = (
    '  window.addEventListener("pageshow", function(e){ if(e.persisted) checkVersion("pageshow-bfcache"); else checkVersion("pageshow"); });\n'
    '  window.addEventListener("focus", function(){ checkVersion("focus"); });\n'
    '  window.addEventListener("online", function(){ checkVersion("online"); });\n'
    '  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible") checkVersion("visible"); });\n'
    '  document.addEventListener("DOMContentLoaded", function(){\n'
    '    localStorage.setItem("dvl_loaded_version", window.DVL_APP_VERSION || LOCAL_VERSION);\n'
    '    checkVersion("DOMContentLoaded");\n'
    '  });\n'
    '\n'
    '  setInterval(function(){ checkVersion("interval"); }, window.innerWidth > 900 ? 30000 : 45000);'
)
NEW_LISTENERS = (
    '  /* visibility redraw only — no version check, no reload (forceReloadToLatest is a no-op) */\n'
    '  document.addEventListener("visibilitychange", function(){\n'
    '    if(!document.hidden){ requestAnimationFrame(function(){ try{if(window.drawSoon)window.drawSoon();}catch(_){} }); }\n'
    '  });\n'
    '  document.addEventListener("DOMContentLoaded", function(){\n'
    '    localStorage.setItem("dvl_loaded_version", window.DVL_APP_VERSION || LOCAL_VERSION);\n'
    '  });\n'
    '  /* pageshow/focus/online/interval checkVersion calls removed — polling is pointless since forceReloadToLatest is stubbed */'
)
html = rep_all(html, OLD_LISTENERS, NEW_LISTENERS, 'remove checkVersion event listeners (both update manager copies)')

# ── 2. Fix CoinGlass buttons: remove destructive h.eye=null; h.gear=null; ──────
html = rep(html,
    '      if(h){ if(h.eye) saved.eye=Object.assign({},h.eye); if(h.gear) saved.gear=Object.assign({},h.gear); window.__dvl334CgBoxes[k]=saved; h.eye=null; h.gear=null; }',
    '      if(h){ if(h.eye) saved.eye=Object.assign({},h.eye); if(h.gear) saved.gear=Object.assign({},h.gear); window.__dvl334CgBoxes[k]=saved; }',
    'Beta 0.334 updateChartButtons: remove h.eye=null; h.gear=null'
)

# ── 3a. Fix CG OI card HTML in injectCards() ────────────────────────────────────
html = rep(html,
    '<div class="ind-card dvl-icd dvl325-cg-card" data-card="cgOpenInterest" data-dvl-cat="clareza">\n'
    '  <div class="ind-head"><div class="dvl-icd-ico">OI</div><div class="ind-copy"><div class="name">CG Aggregated Open Interest</div><div class="ind-sub">Open interest candles</div></div><div class="ind-actions"><div class="row" data-ind="cgOpenInterest"><span class="switch"></span></div><button class="gear" data-settings="cgOpenInterest" title="Configurar CG OI">&#9881;</button><button class="dvl-star" data-star="cgOpenInterest" type="button">★</button></div></div>',
    '<div class="ind-card dvl-icd dvl325-cg-card dvl328-cg-card" data-card="cgOpenInterest" data-dvl-cat="clareza">\n'
    '  <div class="dvl-icd-head"><div class="dvl-icd-icon" style="--ic-bg:rgba(34,211,238,.12);--ic-cl:#22d3ee"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.5V5.8"/><path d="M3 5.8l3.2 2.5L9 4.5l3 5 3-3.2"/><path d="M15 6.3v7.2"/><rect x="2.2" y="11.2" width="2.2" height="3.2" rx=".6" fill="currentColor" opacity=".20"/><rect x="7.9" y="8" width="2.2" height="6.4" rx=".6" fill="currentColor" opacity=".20"/><rect x="13.6" y="9.8" width="2.2" height="4.6" rx=".6" fill="currentColor" opacity=".20"/></svg></div><div class="dvl-icd-info"><div class="dvl-icd-name name">CG Open Interest</div><div class="dvl-icd-meta"><span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg">OI CANDLES</span></div></div><div class="dvl-icd-ctrl"><div class="row" data-ind="cgOpenInterest"><span class="switch"></span></div><button class="gear" data-settings="cgOpenInterest" title="Configurar CG OI">&#9881;</button><button class="dvl-star" data-star="cgOpenInterest" type="button">★</button></div></div>',
    'injectCards() OI: ind-head → dvl-icd-head with native structure'
)

# ── 3b. Fix CG L/S card HTML in injectCards() ───────────────────────────────────
html = rep(html,
    '<div class="ind-card dvl-icd dvl325-cg-card" data-card="cgLongShort" data-dvl-cat="clareza">\n'
    '  <div class="ind-head"><div class="dvl-icd-ico">L/S</div><div class="ind-copy"><div class="name">CG Long/Short Ratio</div><div class="ind-sub">Accounts ratio</div></div><div class="ind-actions"><div class="row" data-ind="cgLongShort"><span class="switch"></span></div><button class="gear" data-settings="cgLongShort" title="Configurar CG Long/Short">&#9881;</button><button class="dvl-star" data-star="cgLongShort" type="button">★</button></div></div>',
    '<div class="ind-card dvl-icd dvl325-cg-card dvl328-cg-card" data-card="cgLongShort" data-dvl-cat="clareza">\n'
    '  <div class="dvl-icd-head"><div class="dvl-icd-icon" style="--ic-bg:rgba(45,212,191,.12);--ic-cl:#2dd4bf"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h8.5"/><path d="M9 2.8L11.5 5 9 7.2"/><path d="M15 13H6.5"/><path d="M9 10.8L6.5 13 9 15.2"/><path d="M4.3 9h9.4" stroke-opacity=".35"/></svg></div><div class="dvl-icd-info"><div class="dvl-icd-name name">CG Taker L/S</div><div class="dvl-icd-meta"><span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg">TAKER RATIO</span></div></div><div class="dvl-icd-ctrl"><div class="row" data-ind="cgLongShort"><span class="switch"></span></div><button class="gear" data-settings="cgLongShort" title="Configurar CG Long/Short">&#9881;</button><button class="dvl-star" data-star="cgLongShort" type="button">★</button></div></div>',
    'injectCards() L/S: ind-head → dvl-icd-head with native structure'
)

# ── 4. Version bump: 0.342 → 0.343 ──────────────────────────────────────────────
# DVL_APP_VERSION assignment (both copies)
html = rep_all(html,
    'window.DVL_APP_VERSION = "Beta 0.342";',
    'window.DVL_APP_VERSION = "Beta 0.343";',
    'DVL_APP_VERSION 0.342→0.343'
)

# Object.defineProperty value (both copies)
html = rep_all(html,
    'value:"Beta 0.342",writable:false,configurable:false,enumerable:true',
    'value:"Beta 0.343",writable:false,configurable:false,enumerable:true',
    'Object.defineProperty value 0.342→0.343'
)

# LOCAL_VERSION (both copies)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.342";',
    'const LOCAL_VERSION = "Beta 0.343";',
    'LOCAL_VERSION 0.342→0.343'
)

# VER in Beta 0.334 script (unique)
html = rep(html,
    "  const VER='Beta 0.342';",
    "  const VER='Beta 0.343';",
    'VER 0.342→0.343'
)

# Changelog note
html = rep(html,
    "'Beta 0.342: Locked DVL_APP_VERSION (Object.defineProperty), removed all cleanReload/location.reload from logo handlers.'",
    "'Beta 0.343: Removed checkVersion event listeners (focus/pageshow/online/interval), fixed CG button null race, native CG card HTML.'",
    'changelog note 0.343'
)

# ── result ────────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 3:
        print('Too many errors — aborting write.')
        exit(1)
else:
    print('All replacements succeeded.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print()
print('Written to', DST)
print()
print('Beta 0.343 changes:')
print('  - checkVersion() calls on focus/pageshow/online/setInterval removed from both update managers')
print('  - visibilitychange now does lightweight canvas redraw only (drawSoon via rAF)')
print('  - updateChartButtons() h.eye=null; h.gear=null; removed — _dvlCgOscHit no longer corrupted')
print('  - injectCards() OI card: uses dvl-icd-head/dvl-icd-icon/dvl-icd-info/dvl-icd-ctrl from the start')
print('  - injectCards() L/S card: same native structure, correct SVG icons, badges NATIVO + TAKER RATIO')
print('  - Version: Beta 0.343')
