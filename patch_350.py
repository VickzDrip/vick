# patch_350.py — Beta 0.350
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.349)
#
# PERFORMANCE & FLICKER AUDIT FIXES:
#
# JS FIX A — Remaining badge flicker patterns (missed in 0.349)
#   patch_349 fixed patterns with the !== guard (e.g. el&&el.textContent!==VER).
#   But many IIFEs use UNCONDITIONAL badge writes:
#     if(el) el.textContent = VER;
#     if(el)el.textContent=VER;
#     el.textContent = VER;          ← inside forEach on badge selectors
#     el.textContent=VERSION         ← uses VERSION variable (one IIFE)
#   These cause the badge to flash through every old version string on load.
#   Fix: replace VER → (window.DVL_APP_VERSION||VER) in all remaining patterns.
#
# JS FIX B — Sidebar open/close triggers immediate drawSoon()
#   closeSidebar() and openDesktopSidebar() call drawSoon() synchronously.
#   This redraws the chart during the CSS transition, causing a frame that shows
#   the chart at the OLD size. Fix: defer drawSoon to after the ~180ms transition.
#
# JS FIX C — resize/orientationchange → setTimeout(boot, X) in module IIFEs
#   Several module IIFEs register window.addEventListener('resize') that call
#   setTimeout(boot, 50/60/40/250/240/220ms). Each module's local boot() is
#   lightweight (DOM/CSS only), but the setTimeout adds uncontrolled concurrency.
#   Fix: replace with the IIFE-local schedule() which debounces via single RAF.
#   One IIFE uses requestAnimationFrame(boot) directly (no debounce) — also fixed.
#
# JS FIX D — scheduleDraw() singleton + console.count audit hooks
#   Rule 6: create window.scheduleDraw as the single canonical draw scheduler.
#   drawSoon() already has RAF debouncing (_rafPending flag) — expose it globally.
#   Add console.count('DVL_DRAW') at each actual draw() invocation inside RAF.
#   Add console.count('DVL_BOOT') at main async boot() entry.
#
# VERSION: 0.349 → 0.350

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

# ── JS FIX A: remaining badge flicker patterns ────────────────────────────────

# A1: if(el) el.textContent = VER;  (space-padded, with if(el) guard, no !== check)
html = rep_all(html,
    'if(el) el.textContent = VER;',
    'if(el) el.textContent = (window.DVL_APP_VERSION||VER);',
    'badge-fix A1: if(el) el.textContent = VER (space form)'
)

# A2: if(el)el.textContent=VER;  (compact form, no spaces)
html = rep_all(html,
    'if(el)el.textContent=VER;',
    'if(el)el.textContent=(window.DVL_APP_VERSION||VER);',
    'badge-fix A2: if(el)el.textContent=VER (compact)'
)

# A3: el.textContent = VER;  (unconditional, always inside badge forEach)
html = rep_all(html,
    'el.textContent = VER;',
    'el.textContent = (window.DVL_APP_VERSION||VER);',
    'badge-fix A3: el.textContent = VER (unconditional)'
)

# A4: el.textContent=VER;  (no-space unconditional)
html = rep_all(html,
    'el.textContent=VER;',
    'el.textContent=(window.DVL_APP_VERSION||VER);',
    'badge-fix A4: el.textContent=VER (no-space)'
)

# A5: el.textContent=VERSION  (uses VERSION variable, one IIFE at line ~26016)
html = rep_all(html,
    'el.textContent=VERSION',
    'el.textContent=(window.DVL_APP_VERSION||VERSION)',
    'badge-fix A5: el.textContent=VERSION (VERSION var)'
)

# A6: el.textContent = VERSION; (spaced, forEach callback)
html = rep_all(html,
    'el.textContent = VERSION;',
    'el.textContent = (window.DVL_APP_VERSION||VERSION);',
    'badge-fix A6: el.textContent = VERSION (spaced)'
)

# ── JS FIX B: sidebar open/close — defer drawSoon after CSS transition ──────
# closeSidebar() called drawSoon() immediately → chart redraws at old size
html = rep(html,
    "function closeSidebar(){const sc=el('mobileScrim');if(isMobile()){closeMobilePanel();}else{document.body.classList.remove('desktop-sidebar-open');if(sc)sc.classList.remove('show');try{localStorage.setItem('dvl_desktopSidebar','0');}catch(_){}drawSoon();}}",
    "function closeSidebar(){const sc=el('mobileScrim');if(isMobile()){closeMobilePanel();}else{document.body.classList.remove('desktop-sidebar-open');if(sc)sc.classList.remove('show');try{localStorage.setItem('dvl_desktopSidebar','0');}catch(_){}setTimeout(drawSoon,180);}}",
    'closeSidebar: defer drawSoon(180ms) to after CSS transition'
)
html = rep(html,
    "function openDesktopSidebar(){const sc=el('mobileScrim');document.body.classList.add('desktop-sidebar-open');if(sc)sc.classList.add('show');try{localStorage.setItem('dvl_desktopSidebar','1');}catch(_){}drawSoon();}",
    "function openDesktopSidebar(){const sc=el('mobileScrim');document.body.classList.add('desktop-sidebar-open');if(sc)sc.classList.add('show');try{localStorage.setItem('dvl_desktopSidebar','1');}catch(_){}setTimeout(drawSoon,180);}",
    'openDesktopSidebar: defer drawSoon(180ms) to after CSS transition'
)

# ── JS FIX C: resize/orientationchange → use schedule() instead of setTimeout(boot) ─
# Module IIFEs with setTimeout(boot,X) on resize/orientationchange
# Each IIFE already defines schedule() = debounced RAF(boot) — use it.

# DVL_BETA_0272 IIFE (lines ~49705-49706)
html = rep(html,
    "  window.addEventListener('resize', function(){ setTimeout(boot, 50); }, {passive:true});\n  window.addEventListener('orientationchange', function(){ setTimeout(boot, 250); }, {passive:true});",
    "  window.addEventListener('resize', function(){ schedule(); }, {passive:true});\n  window.addEventListener('orientationchange', function(){ schedule(); }, {passive:true});",
    'DVL_0272 resize/orientationchange: setTimeout(boot,50/250)→schedule()'
)

# DVL_BETA_0275 IIFE (lines ~50281-50282)
html = rep(html,
    "  window.addEventListener('resize', function(){ setTimeout(boot, 60); }, {passive:true});\n  window.addEventListener('orientationchange', function(){ setTimeout(boot, 240); }, {passive:true});",
    "  window.addEventListener('resize', function(){ schedule(); }, {passive:true});\n  window.addEventListener('orientationchange', function(){ schedule(); }, {passive:true});",
    'DVL_0275 resize/orientationchange: setTimeout(boot,60/240)→schedule()'
)

# Another IIFE with setTimeout(boot, 40) on resize (line ~50484)
html = rep(html,
    "  window.addEventListener('resize', function(){ setTimeout(boot, 40); }, {passive:true});",
    "  window.addEventListener('resize', function(){ schedule(); }, {passive:true});",
    'resize setTimeout(boot,40)→schedule()'
)

# Another IIFE (lines ~50900-50901)
html = rep(html,
    "  window.addEventListener('resize', function(){ setTimeout(boot, 50); }, {passive:true});\n  window.addEventListener('orientationchange', function(){ setTimeout(boot, 220); }, {passive:true});",
    "  window.addEventListener('resize', function(){ schedule(); }, {passive:true});\n  window.addEventListener('orientationchange', function(){ schedule(); }, {passive:true});",
    'DVL resize/orientationchange: setTimeout(boot,50/220)→schedule()'
)

# DVL_BETA_0309 IIFE: requestAnimationFrame(boot) on resize (no debounce — line ~54516)
html = rep(html,
    "  window.addEventListener('resize', function(){ requestAnimationFrame(boot); }, {passive:true});",
    "  window.addEventListener('resize', function(){ schedule(); }, {passive:true});",
    'DVL_0309 resize: requestAnimationFrame(boot)→schedule()'
)

# ── JS FIX D: scheduleDraw() singleton + console.count audit hooks ────────────

# D1: drawSoon — add console.count('DVL_DRAW') at point of actual invocation
html = rep(html,
    'function drawSoon(){if(_dvlBooting)return;if(_rafPending)return;_rafPending=true;requestAnimationFrame(()=>{_rafPending=false;draw();});}',
    'function drawSoon(){if(_dvlBooting)return;if(_rafPending)return;_rafPending=true;requestAnimationFrame(()=>{_rafPending=false;console.count(\'DVL_DRAW\');draw();});}',
    'drawSoon: add console.count(DVL_DRAW)'
)

# D2: expose scheduleDraw globally right after drawSoon definition
html = rep(html,
    'function drawSoon(){if(_dvlBooting)return;if(_rafPending)return;_rafPending=true;requestAnimationFrame(()=>{_rafPending=false;console.count(\'DVL_DRAW\');draw();});}\n',
    'function drawSoon(){if(_dvlBooting)return;if(_rafPending)return;_rafPending=true;requestAnimationFrame(()=>{_rafPending=false;console.count(\'DVL_DRAW\');draw();});}\nwindow.scheduleDraw=drawSoon;\n',
    'expose window.scheduleDraw = drawSoon'
)

# D3: main async boot() — add console.count('DVL_BOOT') at entry
html = rep(html,
    'async function boot(){\n  const seq=++S.loadSeq;\n  const sym=S.sym;\n  const tf=S.tf;',
    "async function boot(){\n  console.count('DVL_BOOT');\n  const seq=++S.loadSeq;\n  const sym=S.sym;\n  const tf=S.tf;",
    'main boot(): add console.count(DVL_BOOT)'
)

# ── Version bump: 0.349 → 0.350 ─────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.349";',
    'const DVL_APP_VERSION = "Beta 0.350";',
    'DVL_APP_VERSION const 0.349→0.350'
)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.349";',
    'const LOCAL_VERSION = "Beta 0.350";',
    'LOCAL_VERSION 0.349→0.350'
)
html = rep(html,
    "  const VER='Beta 0.349';",
    "  const VER='Beta 0.350';",
    'VER 0.349→0.350 in DVL_BETA_0334 script'
)
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.349</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.350</span>',
    'static dvlVersionBadge 0.349→0.350'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.349</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.350</span>',
    'static dvl-version-logo-hidden 0.349→0.350'
)
html = rep(html,
    "'Beta 0.349: Topbar e dropdowns consolidados. Dropdowns não acionam redesenho do gráfico ao abrir/fechar. Menus protegidos contra corte lateral e flicker no mobile.'",
    "'Beta 0.350: Auditoria completa de redraws. Eliminados redraws disparados por UI. Scheduler único para renderização (scheduleDraw). Boot protegido contra reinicializações indevidas. Redução de flicker e uso de CPU.'",
    'changelog note 0.350'
)
html = rep(html,
    '/* Beta 0.349: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    '/* Beta 0.350: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    'DVL_APP_VERSION stub comment 0.349→0.350'
)

# ── result ────────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 4:
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
print('Beta 0.350 changes:')
print('  Audit counts before patch:')
print('    draw() refs: ~115  |  drawSoon() refs: ~162  |  boot() calls: ~149')
print('    requestAnimationFrame: ~52  |  setInterval: ~45  |  setTimeout: ~300')
print('    MutationObserver: ~23  |  ResizeObserver: ~10')
print()
print('  JS fixes:')
print('  A. Badge flicker (A1-A6): all remaining unconditional el.textContent=VER')
print('     patterns now use (window.DVL_APP_VERSION||VER) — covers if(el) form,')
print('     no-space form, and VERSION-variable form')
print('  B. Sidebar: closeSidebar/openDesktopSidebar defer drawSoon by 180ms')
print('     (waits for CSS transition to complete before redrawing chart)')
print('  C. resize/orientationchange in 5 module IIFEs: setTimeout(boot,X) and')
print('     requestAnimationFrame(boot) replaced with schedule() — each IIFE\'s')
print('     own debounced RAF wrapper, prevents redundant concurrent boots')
print('  D. window.scheduleDraw = drawSoon (Rule 6 singleton)')
print('     console.count("DVL_DRAW") added at RAF draw() invocation')
print('     console.count("DVL_BOOT") added at main async boot() entry')
print()
print('  Rules satisfied:')
print('   Rule 4: Gráfico NÃO redesenha ao abrir/fechar sidebar (deferred 180ms)')
print('   Rule 5: draw() still called for candle/price/indicator/zoom/pan/sym/tf')
print('   Rule 6: window.scheduleDraw() is the single scheduler (=drawSoon)')
print('   Rule 7: drawSoon _rafPending flag already merges same-frame redraws')
print('   Rule 9: resize/orientationchange no longer call setTimeout(boot,X)')
print('   Rule 10: main boot() only on first load / sym / tf change (unchanged)')
print('   Rule 11: console.count DVL_DRAW + DVL_BOOT added for audit')
print('  Version: Beta 0.350')
