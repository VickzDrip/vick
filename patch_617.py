# patch_617.py — Beta 0.617
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.616)
#
# FIX 1 — Volume Profile: distribuição body-weighted (sem flatlines)
#   O algoritmo anterior distribuía volume uniformemente por todo o range
#   high-low de cada candle. Um crash candle com wick de 1600pts criava
#   um plateau plano em toda a faixa visível.
#   SOLUÇÃO: 70% do volume concentrado no corpo (open→close), 30% dividido
#   proporcionalmente entre upper wick e lower wick. Candles sem corpo
#   (doji) mantêm distribuição uniforme.
#
# FIX 2 — Bug visual: sellW negativo
#   Se buyB[i] > total por floating-point, bw - buyW < 0 → fillRect com
#   largura negativa → artefato visual.
#   SOLUÇÃO: clamp com Math.max(0, ...) em sellW e buyW.
#
# VERSION: 0.616 → 0.617

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

# ── 1. computeVP: distribuição body-weighted ──────────────────────────────────
html = rep(html,
    '  // ── Volume Profile computation ────────────────────────────────────────────\n'
    '  function computeVP(view, priceMin, priceMax, rows){\n'
    '    const buy  = new Float64Array(rows);\n'
    '    const sell = new Float64Array(rows);\n'
    '    const range = priceMax - priceMin;\n'
    '    if(range <= 0) return { buy, sell };\n'
    '    for(const c of view){\n'
    '      const vol  = Number(c.volume)||0;\n'
    '      if(!vol) continue;\n'
    '      const bVol = Math.min(Number(c.buyVolume)||0, vol);\n'
    '      const sVol = Math.max(0, vol - bVol);\n'
    '      const lo = Math.max(Number(c.low),  priceMin);\n'
    '      const hi = Math.min(Number(c.high), priceMax);\n'
    '      if(lo >= hi) continue;\n'
    '      const loI = Math.max(0,      Math.floor((lo - priceMin) / range * rows));\n'
    '      const hiI = Math.min(rows-1, Math.floor((hi - priceMin) / range * rows));\n'
    '      const n = hiI - loI + 1;\n'
    '      for(let i = loI; i <= hiI; i++){\n'
    '        buy[i]  += bVol / n;\n'
    '        sell[i] += sVol / n;\n'
    '      }\n'
    '    }\n'
    '    return { buy, sell };\n'
    '  }',

    '  // ── Volume Profile computation (body-weighted) ────────────────────────────\n'
    '  function computeVP(view, priceMin, priceMax, rows){\n'
    '    const buy  = new Float64Array(rows);\n'
    '    const sell = new Float64Array(rows);\n'
    '    const range = priceMax - priceMin;\n'
    '    if(range <= 0) return { buy, sell };\n'
    '\n'
    '    function fill(lo, hi, bv, sv){\n'
    '      const lo2 = Math.max(lo, priceMin);\n'
    '      const hi2 = Math.min(hi, priceMax);\n'
    '      if(lo2 >= hi2) return;\n'
    '      const loI = Math.max(0,      Math.floor((lo2 - priceMin) / range * rows));\n'
    '      const hiI = Math.min(rows-1, Math.floor((hi2 - priceMin) / range * rows));\n'
    '      const n = hiI - loI + 1;\n'
    '      for(let i = loI; i <= hiI; i++){ buy[i] += bv/n; sell[i] += sv/n; }\n'
    '    }\n'
    '\n'
    '    for(const c of view){\n'
    '      const vol  = Number(c.volume)||0;\n'
    '      if(!vol) continue;\n'
    '      const bVol = Math.min(Number(c.buyVolume)||0, vol);\n'
    '      const sVol = Math.max(0, vol - bVol);\n'
    '      const hi    = Number(c.high),  lo    = Number(c.low);\n'
    '      const op    = Number(c.open),  cl    = Number(c.close);\n'
    '      const bodyH = Math.max(op, cl), bodyL = Math.min(op, cl);\n'
    '      const fullR = hi - lo;\n'
    '      const bodyR = bodyH - bodyL;\n'
    '\n'
    '      if(bodyR > 0 && fullR > 0){\n'
    '        // 70% no corpo, 30% nos wicks proporcionalmente\n'
    '        const bW = 0.70, wW = 0.30;\n'
    '        fill(bodyL, bodyH, bVol*bW, sVol*bW);\n'
    '        const upW = hi - bodyH, dnW = bodyL - lo;\n'
    '        const totalW = upW + dnW;\n'
    '        if(totalW > 0){\n'
    '          if(upW > 0) fill(bodyH, hi,   bVol*wW*(upW/totalW), sVol*wW*(upW/totalW));\n'
    '          if(dnW > 0) fill(lo,    bodyL, bVol*wW*(dnW/totalW), sVol*wW*(dnW/totalW));\n'
    '        }\n'
    '      } else {\n'
    '        fill(lo, hi, bVol, sVol);\n'
    '      }\n'
    '    }\n'
    '    return { buy, sell };\n'
    '  }',

    'computeVP: body-weighted (70% corpo, 30% wicks)'
)

# ── 2. draw bars: clamp sellW/buyW para evitar widths negativas ───────────────
html = rep(html,
    '      const bw   = (total / maxBucket) * vpW;\n'
    '      const buyW = (buyB[i] / total) * bw;\n'
    '      const py   = y1 - (i+1) * barH;\n'
    '      const bH   = Math.max(0.8, barH);\n'
    '      const inVA = i >= vaLo && i <= vaHi;\n'
    '      ctx.globalAlpha = inVA ? op : op * 0.55;\n'
    '      // Sell (esquerda, vermelho)\n'
    '      ctx.fillStyle = cSell;\n'
    '      ctx.fillRect(x1 - bw, py, bw - buyW, bH);\n'
    '      // Buy (direita, verde — mais perto da escala)\n'
    '      ctx.fillStyle = cBuy;\n'
    '      ctx.fillRect(x1 - buyW, py, buyW, bH);',

    '      const bw    = (total / maxBucket) * vpW;\n'
    '      if(bw < 0.5) continue;\n'
    '      const buyW  = Math.max(0, Math.min(bw, (buyB[i] / total) * bw));\n'
    '      const sellW = Math.max(0, bw - buyW);\n'
    '      const py    = y1 - (i+1) * barH;\n'
    '      const bH    = Math.max(0.8, barH);\n'
    '      const inVA  = i >= vaLo && i <= vaHi;\n'
    '      ctx.globalAlpha = inVA ? op : op * 0.55;\n'
    '      // Sell (esquerda, vermelho)\n'
    '      if(sellW > 0){\n'
    '        ctx.fillStyle = cSell;\n'
    '        ctx.fillRect(x1 - bw, py, sellW, bH);\n'
    '      }\n'
    '      // Buy (direita, verde — mais perto da escala)\n'
    '      if(buyW > 0){\n'
    '        ctx.fillStyle = cBuy;\n'
    '        ctx.fillRect(x1 - buyW, py, buyW, bH);\n'
    '      }',

    'draw bars: clamp sellW/buyW, skip sub-pixel bars'
)

# ── 3. Version bump 0.616 → 0.617 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.616";',
    'const DVL_APP_VERSION = "Beta 0.617";',
    'DVL_APP_VERSION 0.616→0.617'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: VP barras com split buy/sell — buy na direita (verde), sell na esquerda (vermelho), POC cor dinamica." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: VP body-weighted (sem flatlines) + clamp sell/buyW (sem artefatos visuais)." },\n'
    '  { version: "Beta 0.616", note: "Feature: VP split buy/sell por barra + buyVolume nos klines." },',
    'DVL_CHANGELOG 0.617'
)
html = rep(html,
    'BETA 0.616</div>',
    'BETA 0.617</div>',
    'versionBadge 0.616→0.617'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.616</title>',
    '<title>DVL Binance Live — Beta 0.617</title>',
    'title 0.616→0.617'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.616",',
    '  window.DVLVolumeProfile = { version:"0.617",',
    'DVLVolumeProfile version 0.617'
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
