# patch_601.py — Beta 0.601
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.600)
#
# BUGFIX: DVLDeltaVolume e DVLTickVolume mostravam "Sem candles visíveis" / "No delta data"
#   - oscillatorWindow() chamava window.dvlGetOscillatorWindow() que não existe
#   - A função correta é visibleWindow() (mesma usada pelo OI e LS)
#   Fix: substituir window.dvlGetOscillatorWindow por visibleWindow
#
# VERSION: 0.600 → 0.601

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes  = []

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

# ── 1. Delta Volume: corrigir oscillatorWindow ────────────────────────────────
html = rep(html,
    '  function oscillatorWindow(){\n'
    '    try{ return (typeof window.dvlGetOscillatorWindow==="function") ? window.dvlGetOscillatorWindow() : {}; }catch(_){ return {}; }\n'
    '  }\n'
    '\n'
    '  function xForIndex(i, m, win){\n'
    '    const total = (win.candles||[]).length;',

    '  function oscillatorWindow(){\n'
    '    try{ if(typeof visibleWindow==="function") return visibleWindow(); }catch(_){}\n'
    '    const count = (typeof chartViewCount!=="undefined" ? chartViewCount : 140);\n'
    '    return { candles:[], totalSlots:count, futureSlots:0, start:0, end:0 };\n'
    '  }\n'
    '\n'
    '  function xForIndex(i, m, win){\n'
    '    const total = (win.candles||[]).length;',

    'DV oscillatorWindow: visibleWindow()'
)

# ── 2. Tick Volume: corrigir oscillatorWindow ─────────────────────────────────
html = rep(html,
    '  function oscillatorWindow(){\n'
    '    try{ return (typeof window.dvlGetOscillatorWindow==="function") ? window.dvlGetOscillatorWindow() : {}; }catch(_){ return {}; }\n'
    '  }\n'
    '\n'
    '  function draw(ctx, padL, padR, top, h, w){\n'
    '    if(!on()) return;',

    '  function oscillatorWindow(){\n'
    '    try{ if(typeof visibleWindow==="function") return visibleWindow(); }catch(_){}\n'
    '    const count = (typeof chartViewCount!=="undefined" ? chartViewCount : 140);\n'
    '    return { candles:[], totalSlots:count, futureSlots:0, start:0, end:0 };\n'
    '  }\n'
    '\n'
    '  function draw(ctx, padL, padR, top, h, w){\n'
    '    if(!on()) return;',

    'TV oscillatorWindow: visibleWindow()'
)

# ── Version bump 0.600 → 0.601 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.600";',
    'const DVL_APP_VERSION = "Beta 0.601";',
    'DVL_APP_VERSION 0.600→0.601'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Badge BETA vira botao de hard refresh — toque forca reload com cache-busting no mobile." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: DVLDeltaVolume e DVLTickVolume oscillatorWindow chamava funcao inexistente — corrigido para visibleWindow()." },\n'
    '  { version: "Beta 0.600", note: "Badge BETA = hard refresh no mobile." },',
    'DVL_CHANGELOG 0.601'
)
html = rep(html,
    'BETA 0.600</div>',
    'BETA 0.601</div>',
    'versionBadge 0.600→0.601'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.600</title>',
    '<title>DVL Binance Live — Beta 0.601</title>',
    'title 0.600→0.601'
)

# ── Result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  ', e)
    print('Aborting write.')
    sys.exit(1)
else:
    print('All checks passed.')

print('Applied (%d fixes):' % len(fixes))
for f in fixes: print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

print()
print('Written to', DST)
print('Total lines after patch: %d' % (html.count('\n') + 1))
