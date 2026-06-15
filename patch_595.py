# patch_595.py — Beta 0.595
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.594)
#
# BUGFIX: OI e L/S não atualizam ao trocar de ativo
#   draw() só chamava ensureData() quando !CACHE.data.length
#   → ao trocar símbolo, dados do ativo anterior ficavam expostos
#   Fix: remover !CACHE.data.length — ensureData já checa o cache key internamente
#
# VERSION: 0.594 → 0.595

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

# ── 1. OI draw: sempre verifica ensureData (detecta mudança de símbolo) ───────
html = rep(html,
    '    if(!CACHE.data.length && !CACHE.fetching && on()) ensureData(false);\n'
    '\n'
    '    const m = panelMetrics(padL, padR, top, h, w);\n'
    '    const win = oscillatorWindow();\n'
    '    const view = win.candles || [];\n'
    '    const vals = valuesForVisible(view);\n'
    '    const allScale = vals.length ? vals : (CACHE.data || []).slice(-160);\n'
    '    const sc = currentScale(allScale);\n'
    '\n'
    '    const last = vals.length ? vals[vals.length-1] : (CACHE.data || []).at(-1);\n'
    '    const prev = vals.length > 1 ? vals[vals.length-2] : ((CACHE.data || []).length > 1 ? (CACHE.data || []).at(-2) : last);\n'
    '    const pct = last && prev && prev.close ? ((last.close - prev.close) / prev.close * 100) : 0;',

    '    if(!CACHE.fetching && on()) ensureData(false);\n'
    '\n'
    '    const m = panelMetrics(padL, padR, top, h, w);\n'
    '    const win = oscillatorWindow();\n'
    '    const view = win.candles || [];\n'
    '    const vals = valuesForVisible(view);\n'
    '    const allScale = vals.length ? vals : (CACHE.data || []).slice(-160);\n'
    '    const sc = currentScale(allScale);\n'
    '\n'
    '    const last = vals.length ? vals[vals.length-1] : (CACHE.data || []).at(-1);\n'
    '    const prev = vals.length > 1 ? vals[vals.length-2] : ((CACHE.data || []).length > 1 ? (CACHE.data || []).at(-2) : last);\n'
    '    const pct = last && prev && prev.close ? ((last.close - prev.close) / prev.close * 100) : 0;',

    'OI draw: ensureData sem guarda CACHE.data.length'
)

# ── 2. L/S draw: mesma correção ───────────────────────────────────────────────
html = rep(html,
    '    if(!CACHE.data.length && !CACHE.fetching && on()) ensureData(false);\n'
    '\n'
    '    const m = panelMetrics(padL, padR, top, h, w);\n'
    '    const win = oscillatorWindow();\n'
    '    const view = win.candles || [];\n'
    '    const vals = valuesForVisible(view);\n'
    '    const allScale = vals.length ? vals : (CACHE.data || []).slice(-160);\n'
    '    const sc = currentScale(allScale);\n'
    '\n'
    '    const last = vals.length ? vals[vals.length-1] : (CACHE.data || []).at(-1);\n'
    '    const prev = vals.length > 1 ? vals[vals.length-2] : ((CACHE.data || []).length > 1 ? (CACHE.data || []).at(-2) : last);\n'
    '    const delta = last && prev ? (last.ratio - prev.ratio) : 0;',

    '    if(!CACHE.fetching && on()) ensureData(false);\n'
    '\n'
    '    const m = panelMetrics(padL, padR, top, h, w);\n'
    '    const win = oscillatorWindow();\n'
    '    const view = win.candles || [];\n'
    '    const vals = valuesForVisible(view);\n'
    '    const allScale = vals.length ? vals : (CACHE.data || []).slice(-160);\n'
    '    const sc = currentScale(allScale);\n'
    '\n'
    '    const last = vals.length ? vals[vals.length-1] : (CACHE.data || []).at(-1);\n'
    '    const prev = vals.length > 1 ? vals[vals.length-2] : ((CACHE.data || []).length > 1 ? (CACHE.data || []).at(-2) : last);\n'
    '    const delta = last && prev ? (last.ratio - prev.ratio) : 0;',

    'LS draw: ensureData sem guarda CACHE.data.length'
)

# ── Version bump 0.594 → 0.595 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.594";',
    'const DVL_APP_VERSION = "Beta 0.595";',
    'DVL_APP_VERSION 0.594→0.595'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: Volume Trace renderPanel usava #dvlMaBody e HTML do MA — painel body ficava vazio. Corrigido para #dvlVtBody com HTML VT correto." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: OI e L/S nao atualizavam ao trocar de ativo — draw() so chamava ensureData quando sem dados; removida a guarda CACHE.data.length." },\n'
    '  { version: "Beta 0.594", note: "Bugfix: Volume Trace renderPanel body vazio (#dvlMaBody errado)." },',
    'DVL_CHANGELOG 0.595'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.594</div>',
    '<div class="beta" id="versionBadge">BETA 0.595</div>',
    'versionBadge 0.594→0.595'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.594</title>',
    '<title>DVL Binance Live — Beta 0.595</title>',
    'title 0.594→0.595'
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
