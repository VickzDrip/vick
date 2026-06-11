# patch_351.py — Beta 0.351
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.350)
#
# REAL DUPLICATION / FLICKER AUDIT — actual fixes (not theoretical):
#
# CRITICAL REGRESSION FROM 0.350:
#   0.350 replaced setTimeout(boot,X) with schedule() in 5 resize/orientation
#   handlers. But NONE of those IIFEs define schedule() in scope (verified:
#   DVL_0272 and DVL_0275 are ACTIVE and only define boot()). Result:
#   ReferenceError on every resize/orientationchange in the two active modules
#   (header/hotbar scaling + asset/leverage tuning) → "não atualiza direito".
#   FIX: revert all 8 handlers to a per-IIFE DEBOUNCED boot() (unique timer var
#   per IIFE so siblings don't cancel each other). This both fixes the crash AND
#   debounces (single trailing boot per module instead of raw setTimeout).
#
# PERFORMANCE (real active cost, measured via script-range audit):
#   - 0.350 added console.count('DVL_DRAW') on EVERY RAF draw and
#     console.count('DVL_BOOT') on every boot. console.count is genuinely slow
#     and ran per-frame → removed (Rule 10). Audit report kept in changelog.
#   - 500ms setInterval called drawSoon() unconditionally (2x/sec forever),
#     redrawing the chart + 4 active overlay wrappers even when price is idle.
#     The candle countdown is DOM-only (textContent) and does NOT need a canvas
#     redraw. FIX: gate drawSoon on an OHLC+count signature of the live candle —
#     countdown text still updates every tick; chart redraws only on real change.
#
# ACTIVE WRAPPER CHAIN (audited, for the record — left intact, each adds a
#   distinct overlay and is idempotency-guarded; collapsing them would drop
#   features, so NOT touched):
#     window.drawSoon active wrappers: dvl297, dvl298, dvl305, dvl310 (4)
#       (dvl296/304/306/311/312 wrappers live in application/disabled scripts —
#        dead, never execute, incl. the two requestAnimationFrame(boot) ones)
#     window.draw active wrappers: 7 (indicator-lab base + osc/coinglass overlays)
#
# VERSION: 0.350 → 0.351

import sys

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

# ── FIX 1: revert 0.350 schedule() regression — per-IIFE debounced boot() ──────
RZ = "window.addEventListener('resize', function(){ schedule(); }, {passive:true});"
OR = "window.addEventListener('orientationchange', function(){ schedule(); }, {passive:true});"

def deb(var):
    return ("clearTimeout(window.%s); window.%s=setTimeout(boot,150);" % (var, var))

def rz(var):
    return "window.addEventListener('resize', function(){ %s }, {passive:true});" % deb(var)

def orc(var):
    return "window.addEventListener('orientationchange', function(){ %s }, {passive:true});" % deb(var)

# DVL_0272 (ACTIVE) — resize + orientationchange
html = rep(html,
    "  [50,120,260,520,900,1350,1800,2600].forEach(function(ms){ setTimeout(boot, ms); });\n  " + RZ + "\n  " + OR,
    "  [50,120,260,520,900,1350,1800,2600].forEach(function(ms){ setTimeout(boot, ms); });\n  " + rz('__dvlRz272') + "\n  " + orc('__dvlRz272'),
    'DVL_0272 resize/orient: schedule()→debounced boot() (FIX regression, ACTIVE)'
)

# DVL_0273 (disabled, dead — fixed for correctness)
html = rep(html,
    "  [50,120,260,520,900,1400,2200,3200].forEach(function(ms){ setTimeout(boot, ms); });\n  " + RZ + "\n  " + OR,
    "  [50,120,260,520,900,1400,2200,3200].forEach(function(ms){ setTimeout(boot, ms); });\n  " + rz('__dvlRz273') + "\n  " + orc('__dvlRz273'),
    'DVL_0273 resize/orient: schedule()→debounced boot() (dead script)'
)

# DVL_0275 (ACTIVE) — resize only
html = rep(html,
    "  [80,220,500,900,1600].forEach(function(ms){ setTimeout(boot, ms); });\n  " + RZ,
    "  [80,220,500,900,1600].forEach(function(ms){ setTimeout(boot, ms); });\n  " + rz('__dvlRz275'),
    'DVL_0275 resize: schedule()→debounced boot() (FIX regression, ACTIVE)'
)

# DVL_0279 (disabled, dead) — anchored on the two preceding comment lines
html = rep(html,
    "  // DVL 0.285: disabled old order-card periodic rewrite\n  // /* DVL 0.295 disabled flicker interval: setInterval(function(){ syncOrderCard(); alignOrderPanel(); }, 1200); */\n  " + RZ + "\n  " + OR,
    "  // DVL 0.285: disabled old order-card periodic rewrite\n  // /* DVL 0.295 disabled flicker interval: setInterval(function(){ syncOrderCard(); alignOrderPanel(); }, 1200); */\n  " + rz('__dvlRz279') + "\n  " + orc('__dvlRz279'),
    'DVL_0279 resize/orient: schedule()→debounced boot() (dead script)'
)

# DVL_0309 (disabled, dead) — resize only, anchored on the two setTimeout(boot) above
html = rep(html,
    "  setTimeout(boot, 120);\n  setTimeout(boot, 450);\n  " + RZ,
    "  setTimeout(boot, 120);\n  setTimeout(boot, 450);\n  " + rz('__dvlRz309'),
    'DVL_0309 resize: schedule()→debounced boot() (dead script)'
)

# ── FIX 2: remove per-frame console.count audit hooks (Rule 10) ────────────────
html = rep(html,
    "_rafPending=false;console.count('DVL_DRAW');draw();",
    "_rafPending=false;draw();",
    'drawSoon: remove console.count(DVL_DRAW) per-frame cost'
)
html = rep(html,
    "async function boot(){\n  console.count('DVL_BOOT');\n  const seq=++S.loadSeq;",
    "async function boot(){\n  const seq=++S.loadSeq;",
    'main boot(): remove console.count(DVL_BOOT)'
)

# ── FIX 3: gate 500ms interval drawSoon on live-candle OHLC change ─────────────
html = rep(html,
    "setInterval(()=>{updateCandleCountdownV56();try{if(S&&S.candles&&S.candles.length)drawSoon()}catch(_){}},500);",
    "setInterval(()=>{updateCandleCountdownV56();try{if(S&&S.candles&&S.candles.length){const _lc=S.candles[S.candles.length-1];const _sig=_lc?(_lc.t+':'+_lc.c+':'+_lc.h+':'+_lc.l+':'+S.candles.length):'';if(_sig!==window.__dvlLastTickSig){window.__dvlLastTickSig=_sig;drawSoon();}}}catch(_){}},500);",
    '500ms interval: drawSoon only when live candle OHLC/count changes'
)

# ── Version bump: 0.350 → 0.351 ───────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.350";',
    'const DVL_APP_VERSION = "Beta 0.351";',
    'DVL_APP_VERSION const 0.350→0.351'
)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.350";',
    'const LOCAL_VERSION = "Beta 0.351";',
    'LOCAL_VERSION 0.350→0.351'
)
html = rep(html,
    "  const VER='Beta 0.350';",
    "  const VER='Beta 0.351';",
    'VER 0.350→0.351 in DVL_BETA_0334 script'
)
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.350</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.351</span>',
    'static dvlVersionBadge 0.350→0.351'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.350</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.351</span>',
    'static dvl-version-logo-hidden 0.350→0.351'
)
html = rep(html,
    "'Beta 0.350: Auditoria completa de redraws. Eliminados redraws disparados por UI. Scheduler único para renderização (scheduleDraw). Boot protegido contra reinicializações indevidas. Redução de flicker e uso de CPU.'",
    "'Beta 0.351: Corrigida regressão de resize do 0.350 (schedule indefinido em modulos ativos -> boot debounced). Removido console.count por frame. Interval de 500ms so redesenha quando a vela ao vivo muda (OHLC), nao a cada tick. Cadeia ativa de wrappers auditada: drawSoon=4 (dvl297/298/305/310), draw=7; wrappers em scripts application/disabled (dvl296/304/306/311/312) confirmados mortos. Reducao de CPU e flicker.'",
    'changelog note 0.351'
)
html = rep(html,
    '/* Beta 0.350: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    '/* Beta 0.351: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    'DVL_APP_VERSION stub comment 0.350→0.351'
)

# ── result ────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 0:
        print('Aborting write — fix anchors first.')
        sys.exit(1)
else:
    print('All checks passed.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

total_lines = html.count('\n') + 1
print()
print('Written to', DST)
print('Total lines after patch: %d' % total_lines)
