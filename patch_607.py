# patch_607.py — Beta 0.607
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.606)
#
# FIXES — Volume Trace "bubbles não aparecem nos segundos":
#
#   Causa raiz: o script lower-TF sobreescreve window.DVLVolumeTraceDraw
#   completamente. Quando o coletor de ticks não tem dados (cache.data=[]),
#   o draw retorna imediatamente sem mostrar NADA — matando até os bubbles
#   klines-based que funcionavam no draw original.
#
#   1. VT lower-TF: salva referência ao draw original (_origVTDraw) ANTES
#      de sobreescrever. Quando tick data está vazia → chama _origVTDraw
#      como fallback (mostra bubbles de klines enquanto aguarda tick data).
#
#   2. VT loadLowerData: limita rangeStart a máximo 2h antes de rangeEnd
#      para unit="s" — o coletor só guarda histórico recente.
#
#   3. VT loadLowerData: remove require de cache.data.length no check de
#      frescor — sem isso, fetch vazio disparava novo fetch em todo draw.
#      Agora qualquer fetch recente (com ou sem dados) aguarda o TTL (12s).
#
# VERSION: 0.606 → 0.607

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

# ── 1. VT loadLowerData: range 2h + anti-spam TTL ────────────────────────────
html = rep(html,
    '    const startIndex = Math.max(0, cfg.win.start - 3);\n'
    '    const endIndex = Math.min(chart.length - 1, cfg.win.end + 3);\n'
    '    const rangeStart = Math.max(0, Number(chart[startIndex]?.time || chart[0].time) - avgPad);\n'
    '    const rangeEnd = Number(chart[endIndex]?.time || chart.at(-1).time) + currentTfMs;\n'
    '\n'
    '    const key = sym() + "|" + tf + "|" + Math.floor(rangeStart / 10_000) + "|" + Math.floor(rangeEnd / 10_000);\n'
    '\n'
    '    const fresh = cache.key === key && (Date.now() - cache.lastFetch) < TTL_MS && cache.data.length;\n'
    '    if(fresh || cache.loading) return;',

    '    const startIndex = Math.max(0, cfg.win.start - 3);\n'
    '    const endIndex = Math.min(chart.length - 1, cfg.win.end + 3);\n'
    '    const rangeEnd = Number(chart[endIndex]?.time || chart.at(-1).time) + currentTfMs;\n'
    '    const rawStart = Math.max(0, Number(chart[startIndex]?.time || chart[0].time) - avgPad);\n'
    '    // Para "s": limita a 2h — coletor de ticks não mantém histórico maior\n'
    '    const rangeStart = (parseTf(tf).unit === "s")\n'
    '      ? Math.max(rawStart, rangeEnd - 7_200_000)\n'
    '      : rawStart;\n'
    '\n'
    '    const key = sym() + "|" + tf + "|" + Math.floor(rangeStart / 10_000) + "|" + Math.floor(rangeEnd / 10_000);\n'
    '\n'
    '    // Qualquer fetch recente (com ou sem dados) aguarda o TTL — evita spam\n'
    '    const alreadyFetched = cache.key === key && (Date.now() - cache.lastFetch) < TTL_MS;\n'
    '    if(alreadyFetched || cache.loading) return;',

    'VT loadLowerData: range 2h + anti-spam TTL'
)

# ── 2. VT lower-TF: salva origDraw + fallback quando sem tick data ─────────────
html = rep(html,
    '  window.DVLVolumeTraceDraw = function(ctx, cfg){\n'
    '    const state = vtState();\n'
    '    if(!state || !state.on || !cfg || !cfg.view || !cfg.view.length) return;\n'
    '\n'
    '    loadLowerData(state, cfg);\n'
    '\n'
    '    const data = cache.data || [];\n'
    '    if(!data.length) return;',

    '  // Guarda o draw klines-based original para usar como fallback\n'
    '  const _origVTDraw = typeof window.DVLVolumeTraceDraw === "function" ? window.DVLVolumeTraceDraw : null;\n'
    '\n'
    '  window.DVLVolumeTraceDraw = function(ctx, cfg){\n'
    '    const state = vtState();\n'
    '    if(!state || !state.on || !cfg || !cfg.view || !cfg.view.length) return;\n'
    '\n'
    '    loadLowerData(state, cfg);\n'
    '\n'
    '    const data = cache.data || [];\n'
    '    if(!data.length){ if(_origVTDraw) _origVTDraw(ctx, cfg); return; }',

    'VT lower-TF: _origVTDraw fallback'
)

# ── Version bump 0.606 → 0.607 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.606";',
    'const DVL_APP_VERSION = "Beta 0.607";',
    'DVL_APP_VERSION 0.606→0.607'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: TV timestamp (sem *1000); TV OI model (basePanel+panelMetrics); VT 1s usa /api/ticks/bars em vez de aggTrades; VT price fallback ao midpoint do candle pai." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: VT lower-TF fallback ao draw klines-based quando sem tick data; range 2h; anti-spam TTL." },\n'
    '  { version: "Beta 0.606", note: "Bugfix: TV timestamp; TV OI model; VT 1s usa /api/ticks/bars; VT price fallback." },',
    'DVL_CHANGELOG 0.607'
)
html = rep(html,
    'BETA 0.606</div>',
    'BETA 0.607</div>',
    'versionBadge 0.606→0.607'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.606</title>',
    '<title>DVL Binance Live — Beta 0.607</title>',
    'title 0.606→0.607'
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
