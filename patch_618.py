# patch_618.py — Beta 0.618
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.617)
#
# FIX 1 — VP computeVP: distribuição triangular peaked at close (sem flatlines)
#   A distribuição body-weighted (0.617) ainda distribuía volume UNIFORMEMENTE
#   dentro do corpo (bv/n para cada bucket). Um candle com corpo largo cria
#   um plateau flat em toda a faixa do corpo.
#   SOLUÇÃO: distribuição triangular dentro do corpo, com pico no preço de
#   fechamento (close). Volume decresce linearmente do close para as extremidades
#   do corpo. Wicks mantêm distribuição uniforme (já recebem só 30%).
#
# FIX 2 — vpX0 undefined: labels POC/VAH/VAL não apareciam
#   ctx.fillText("POC", vpX0 - 2, pocY) usava vpX0 que nunca foi definido.
#   NaN como coordenada X → canvas ignora silenciosamente.
#   SOLUÇÃO: const vpX0 = x1 - vpW logo após definir vpW.
#
# VERSION: 0.617 → 0.618

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

# ── 1. computeVP: triangular close-peaked ─────────────────────────────────────
html = rep(html,
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

    '  // ── Volume Profile computation (triangular close-peaked) ─────────────────\n'
    '  function computeVP(view, priceMin, priceMax, rows){\n'
    '    const buy  = new Float64Array(rows);\n'
    '    const sell = new Float64Array(rows);\n'
    '    const range = priceMax - priceMin;\n'
    '    if(range <= 0) return { buy, sell };\n'
    '\n'
    '    function fill(lo, hi, bv, sv, peakAt){\n'
    '      const lo2 = Math.max(lo, priceMin);\n'
    '      const hi2 = Math.min(hi, priceMax);\n'
    '      if(lo2 >= hi2) return;\n'
    '      const loI = Math.max(0,      Math.floor((lo2 - priceMin) / range * rows));\n'
    '      const hiI = Math.min(rows-1, Math.floor((hi2 - priceMin) / range * rows));\n'
    '      const n = hiI - loI + 1;\n'
    '      if(n === 1){ buy[loI] += bv; sell[loI] += sv; return; }\n'
    '      if(peakAt === undefined){\n'
    '        for(let i = loI; i <= hiI; i++){ buy[i] += bv/n; sell[i] += sv/n; }\n'
    '        return;\n'
    '      }\n'
    '      // Triangular: peak at close, linear falloff toward body edges\n'
    '      const pkI = Math.max(loI, Math.min(hiI,\n'
    '        Math.floor((Math.max(lo2, Math.min(hi2, peakAt)) - priceMin) / range * rows)));\n'
    '      const w = new Float64Array(n); let wsum = 0;\n'
    '      for(let k = 0; k < n; k++){\n'
    '        const i = loI + k;\n'
    '        const d = i === pkI ? 1\n'
    '                : i <  pkI  ? (pkI > loI ? (i - loI) / (pkI - loI) : 0)\n'
    '                            : (pkI < hiI ? (hiI - i) / (hiI - pkI) : 0);\n'
    '        w[k] = d + 0.12; wsum += w[k];\n'
    '      }\n'
    '      for(let k = 0; k < n; k++){\n'
    '        buy[loI+k]  += bv * w[k] / wsum;\n'
    '        sell[loI+k] += sv * w[k] / wsum;\n'
    '      }\n'
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
    '        // 70% corpo (triangular peaked at close), 30% wicks (uniforme)\n'
    '        const bW = 0.70, wW = 0.30;\n'
    '        fill(bodyL, bodyH, bVol*bW, sVol*bW, cl);\n'
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

    'computeVP: triangular close-peaked (sem flatlines)'
)

# ── 2. Definir vpX0: labels POC/VAH/VAL passam a aparecer ────────────────────
html = rep(html,
    '    const vpW  = Math.min(150, Math.max(40, (x1-x0) * (state.widthPct||0.18)));\n'
    '    const barH = (y1 - y0) / rows;',

    '    const vpW  = Math.min(150, Math.max(40, (x1-x0) * (state.widthPct||0.18)));\n'
    '    const vpX0 = x1 - vpW;\n'
    '    const barH = (y1 - y0) / rows;',

    'vpX0 = x1 - vpW (fix labels POC/VAH/VAL)'
)

# ── 3. Version bump 0.617 → 0.618 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.617";',
    'const DVL_APP_VERSION = "Beta 0.618";',
    'DVL_APP_VERSION 0.617→0.618'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: VP body-weighted (sem flatlines) + clamp sell/buyW (sem artefatos visuais)." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: VP triangular close-peaked (sem flatlines) + fix labels POC/VAH/VAL." },\n'
    '  { version: "Beta 0.617", note: "Bugfix: VP body-weighted + clamp sell/buyW (sem artefatos visuais)." },',
    'DVL_CHANGELOG 0.618'
)
html = rep(html,
    'BETA 0.617</div>',
    'BETA 0.618</div>',
    'versionBadge 0.617→0.618'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.617</title>',
    '<title>DVL Binance Live — Beta 0.618</title>',
    'title 0.617→0.618'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.617",',
    '  window.DVLVolumeProfile = { version:"0.618",',
    'DVLVolumeProfile version 0.618'
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
