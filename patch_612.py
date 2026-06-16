# patch_612.py — Beta 0.612
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.611)
#
# FIX — OI candles achatados quando há candle outlier na janela visível:
#
#   autoScale(vals) usa Math.min/Math.max absolutas sobre todos os valores
#   OHLC visíveis. Um único candle com queda/subida muito grande (ex.:
#   liquidação repentina de OI) puxa o range inteiro, achatando todos os
#   demais candles visualmente.
#
#   O canvas já tem ctx.clip() antes do desenho dos candles (linha 26530),
#   então candles que ultrapassem o topo/fundo do panel são cortados —
#   sem vazamento visual.
#
#   SOLUÇÃO: percentil p2/p98 sobre todos os pontos OHLC visíveis.
#   Apenas 4% dos valores mais extremos são excluídos do cálculo de escala.
#   Candles outlier continuam sendo desenhados, mas cortados pela borda do panel.
#
# VERSION: 0.611 → 0.612

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

# ── 1. autoScale: min/max absoluto → percentil p2/p98 ────────────────────────
html = rep(html,
    '  function autoScale(vals){\n'
    '    if(!vals.length) return {min:0,max:1,center:.5,range:1};\n'
    '    let min = Math.min(...vals.map(v => Math.min(v.low || v.close, v.open || v.close, v.close)));\n'
    '    let max = Math.max(...vals.map(v => Math.max(v.high || v.close, v.open || v.close, v.close)));\n'
    '    const r = (max - min) || Math.max(1, max * .002);\n'
    '    min -= r * .16;\n'
    '    max += r * .16;\n'
    '    return { min, max, center:(min+max)/2, range:max-min };\n'
    '  }',

    '  function autoScale(vals){\n'
    '    if(!vals.length) return {min:0,max:1,center:.5,range:1};\n'
    '    const pts=[];\n'
    '    for(const v of vals){\n'
    '      pts.push(v.low||v.close, v.open||v.close, v.close, v.high||v.close);\n'
    '    }\n'
    '    pts.sort((a,b)=>a-b);\n'
    '    const n=pts.length;\n'
    '    const i02=Math.max(0,Math.floor(n*0.02));\n'
    '    const i98=Math.min(n-1,Math.ceil(n*0.98)-1);\n'
    '    let min=pts[i02];\n'
    '    let max=pts[i98];\n'
    '    const r=(max-min)||Math.max(1,max*.002);\n'
    '    min-=r*.16;\n'
    '    max+=r*.16;\n'
    '    return {min,max,center:(min+max)/2,range:max-min};\n'
    '  }',

    'autoScale: min/max absoluto → percentil p2/p98'
)

# ── 2. Version bump 0.611 → 0.612 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.611";',
    'const DVL_APP_VERSION = "Beta 0.612";',
    'DVL_APP_VERSION 0.611→0.612'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: 1s nativo Binance + resample para 5s/10s/15s/30s — evita travamento do chart via aggTrades." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: OI autoScale percentil p2/p98 — candle outlier nao mais achata os demais." },\n'
    '  { version: "Beta 0.611", note: "Bugfix: 1s nativo Binance + resample para 5s/10s/15s/30s — evita travamento do chart." },',
    'DVL_CHANGELOG 0.612'
)
html = rep(html,
    'BETA 0.611</div>',
    'BETA 0.612</div>',
    'versionBadge 0.611→0.612'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.611</title>',
    '<title>DVL Binance Live — Beta 0.612</title>',
    'title 0.611→0.612'
)
html = rep(html,
    '    version:"0.611",',
    '    version:"0.612",',
    'DVLTickVolume version 0.611→0.612'
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
