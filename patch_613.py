# patch_613.py — Beta 0.613
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.612)
#
# FIX — Candle outlier (ex.: crash de 1m) achatando toda a escala do chart:
#
#   drawPriceSection calcula candleMin/candleMax como Math.min/max absolutos
#   de TODOS os highs/lows visíveis. Um único candle com wick gigante (queda
#   brusca de 300+ pontos) força o eixo Y inteiro a expandir, achatando
#   todos os outros candles da janela.
#
#   O ctx.clip() em drawPriceSection (linha 15943) já limita o desenho ao
#   panel — candles que ultrapassem o range da escala ficam cortados na borda,
#   sem vazar para os oscillators abaixo.
#
#   SOLUÇÃO: p5/p95 percentile do array [lows..highs].
#   - 60 data pts (30 candles × 2): exclui 3 de cada extremo
#   - 200 data pts (100 candles × 2): exclui 10 de cada extremo
#   Candles outlier continuam sendo desenhados; apenas o wick excessivo é
#   cortado pelo ctx.clip() existente.
#
# VERSION: 0.612 → 0.613

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

# ── 1. Auto-scale do chart principal: min/max absoluto → p5/p95 ──────────────
html = rep(html,
    '  let candleMin = Math.min(...lows), candleMax = Math.max(...highs);\n'
    '\n'
    '  /*\n'
    '    Liquidation lines are overlays only.\n'
    '    They MUST NOT alter min/max, otherwise ON/OFF changes the chart zoom.\n'
    '    The vertical price scale is independent and can move/zoom infinitely.\n'
    '  */\n'
    '  const candleRange = (candleMax - candleMin) || Math.max(candleMax * .002, 1);\n'
    '\n'
    '  if(!priceScaleLocked || !Number.isFinite(priceViewCenter) || !Number.isFinite(priceViewRange)){\n'
    '    priceViewRange = candleRange * 1.16;\n'
    '    priceViewCenter = (candleMax + candleMin) / 2;\n'
    '  }',

    '  /*\n'
    '    Liquidation lines are overlays only.\n'
    '    They MUST NOT alter min/max, otherwise ON/OFF changes the chart zoom.\n'
    '    The vertical price scale is independent and can move/zoom infinitely.\n'
    '    Auto-scale usa p5/p95 para que um candle outlier nao domine o range.\n'
    '    O ctx.clip() em drawPriceSection corta wicks alem dos limites do panel.\n'
    '  */\n'
    '  if(!priceScaleLocked || !Number.isFinite(priceViewCenter) || !Number.isFinite(priceViewRange)){\n'
    '    const allPts=[...lows,...highs].sort((a,b)=>a-b);\n'
    '    const n=allPts.length;\n'
    '    const i05=Math.max(0,Math.floor(n*0.05));\n'
    '    const i95=Math.min(n-1,Math.ceil(n*0.95)-1);\n'
    '    const candleMin=allPts[i05];\n'
    '    const candleMax=allPts[i95];\n'
    '    const candleRange=(candleMax-candleMin)||Math.max(candleMax*.002,1);\n'
    '    priceViewRange=candleRange*1.16;\n'
    '    priceViewCenter=(candleMax+candleMin)/2;\n'
    '  }',

    'drawPriceSection: auto-scale p5/p95 (remove min/max absoluto)'
)

# ── 2. Version bump 0.612 → 0.613 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.612";',
    'const DVL_APP_VERSION = "Beta 0.613";',
    'DVL_APP_VERSION 0.612→0.613'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: OI autoScale percentil p2/p98 — candle outlier nao mais achata os demais." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: auto-scale do chart principal p5/p95 — candle outlier nao achata a janela." },\n'
    '  { version: "Beta 0.612", note: "Bugfix: OI autoScale p2/p98 — candle outlier no OI nao achata os demais." },',
    'DVL_CHANGELOG 0.613'
)
html = rep(html,
    'BETA 0.612</div>',
    'BETA 0.613</div>',
    'versionBadge 0.612→0.613'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.612</title>',
    '<title>DVL Binance Live — Beta 0.613</title>',
    'title 0.612→0.613'
)
html = rep(html,
    '    version:"0.612",',
    '    version:"0.613",',
    'DVLTickVolume version 0.612→0.613'
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
