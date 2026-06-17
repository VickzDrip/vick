# patch_623.py — Beta 0.623
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.622)
#
# FIX — OI oscillator: barras idênticas no 1m
#
#   O period() do OI mapeia intervalToPeriod("1m") → "5m".
#   Binance OI mínimo disponível é 5m. Ao renderizar no 1m,
#   valueAt(CACHE.data, candle.time) retorna o MESMO ponto de OI
#   para 5 candles de 1m consecutivos (09:00, 09:01, ..., 09:04
#   → todos retornam o OI das 09:00). Resultado: 5 barras idênticas.
#
#   SOLUÇÃO — Bars: agrupar candles com mesmo OI timestamp e desenhar
#   UMA barra que cobre todo o período (largura × 5 no 1m).
#   SOLUÇÃO — MA line: skip candles com mesmo OI timestamp para evitar
#   a linha "escada" (5 segmentos horizontais idênticos).
#
#   No 5m e acima, cada OI ponto = 1 candle → comportamento idêntico
#   ao anterior. Só afeta visualmente timeframes < período do OI.
#
# VERSION: 0.622 → 0.623

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

# ── 1. Bars: uma barra por período de OI (agrupa candles repetidos) ───────────
html = rep(html,
    '      for(let i=0; i<view.length; i++){\n'
    '        const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '        if(!d) continue;\n'
    '\n'
    '        const xx = xForIndex(i, m, win);\n'
    '        if(xx < m.x0 - 12 || xx > m.x1 + 12) continue;\n'
    '\n'
    '        const yo = yMap(m, d.open, sc);\n'
    '        const yc = yMap(m, d.close, sc);\n'
    '        const yh = yMap(m, d.high, sc);\n'
    '        const yl = yMap(m, d.low, sc);\n'
    '        const bull = d.close >= d.open;\n'
    '\n'
    '        ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '        ctx.lineWidth = 1;\n'
    '        ctx.beginPath();\n'
    '        ctx.moveTo(xx, yh);\n'
    '        ctx.lineTo(xx, yl);\n'
    '        ctx.stroke();\n'
    '\n'
    '        const bodyTop = Math.min(yo, yc);\n'
    '        const bodyH = Math.max(2, Math.abs(yc - yo));\n'
    '\n'
    '        ctx.fillStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '        ctx.fillRect(xx-bw/2, bodyTop, bw, bodyH);\n'
    '        ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '        ctx.strokeRect(xx-bw/2, bodyTop, bw, bodyH);\n'
    '      }',

    '      // Uma barra por período OI: agrupa candles 1m com mesmo timestamp de OI\n'
    '      { let ii = 0;\n'
    '        while(ii < view.length){\n'
    '          const d = valueAt(CACHE.data, Number(view[ii].time));\n'
    '          if(!d){ ii++; continue; }\n'
    '          let endII = ii;\n'
    '          while(endII+1 < view.length){\n'
    '            const nd = valueAt(CACHE.data, Number(view[endII+1].time));\n'
    '            if(!nd || nd.t !== d.t) break;\n'
    '            endII++;\n'
    '          }\n'
    '          const xxL = xForIndex(ii,    m, win);\n'
    '          const xxR = xForIndex(endII, m, win);\n'
    '          const xxC = (xxL + xxR) / 2;\n'
    '          const hw  = Math.max(bw/2, (xxR - xxL)/2 + bw/2);\n'
    '          if(xxC < m.x0 - hw - 4 || xxC > m.x1 + hw + 4){ ii = endII+1; continue; }\n'
    '          const yo = yMap(m, d.open,  sc);\n'
    '          const yc = yMap(m, d.close, sc);\n'
    '          const yh = yMap(m, d.high,  sc);\n'
    '          const yl = yMap(m, d.low,   sc);\n'
    '          const bull = d.close >= d.open;\n'
    '          ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '          ctx.lineWidth = 1;\n'
    '          ctx.beginPath();\n'
    '          ctx.moveTo(xxC, yh);\n'
    '          ctx.lineTo(xxC, yl);\n'
    '          ctx.stroke();\n'
    '          const bodyTop = Math.min(yo, yc);\n'
    '          const bodyH = Math.max(2, Math.abs(yc - yo));\n'
    '          ctx.fillStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '          ctx.fillRect(xxC - hw, bodyTop, hw*2, bodyH);\n'
    '          ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '          ctx.strokeRect(xxC - hw, bodyTop, hw*2, bodyH);\n'
    '          ii = endII+1;\n'
    '        }\n'
    '      }',

    'OI bars: one bar per OI period (group 1m candles)'
)

# ── 2. MA line: skip candles repetidos (mesmo timestamp de OI) ────────────────
html = rep(html,
    '        let _started = false;\n'
    '        for(let i=0;i<view.length;i++){\n'
    '          const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '          if(!d) continue;\n'
    '          const idx = _idxMap.get(d.t);\n'
    '          if(idx===undefined) continue;\n'
    '          const st2 = Math.max(0, idx-_maLen+1);\n'
    '          const avg = (_prefix[idx+1]-_prefix[st2])/(idx-st2+1);\n'
    '          const xx2 = xForIndex(i, m, win);\n'
    '          const yy2 = yMap(m, avg, sc);\n'
    '          if(!_started){ ctx.moveTo(xx2,yy2); _started=true; } else ctx.lineTo(xx2,yy2);\n'
    '        }\n'
    '        if(_started) ctx.stroke();',

    '        let _started = false, _lastMAT = null;\n'
    '        for(let i=0;i<view.length;i++){\n'
    '          const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '          if(!d || d.t === _lastMAT) continue;\n'
    '          _lastMAT = d.t;\n'
    '          const idx = _idxMap.get(d.t);\n'
    '          if(idx===undefined) continue;\n'
    '          const st2 = Math.max(0, idx-_maLen+1);\n'
    '          const avg = (_prefix[idx+1]-_prefix[st2])/(idx-st2+1);\n'
    '          const xx2 = xForIndex(i, m, win);\n'
    '          const yy2 = yMap(m, avg, sc);\n'
    '          if(!_started){ ctx.moveTo(xx2,yy2); _started=true; } else ctx.lineTo(xx2,yy2);\n'
    '        }\n'
    '        if(_started) ctx.stroke();',

    'OI MA line: skip duplicate OI timestamps'
)

# ── 3. Version bump 0.622 → 0.623 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.622";',
    'const DVL_APP_VERSION = "Beta 0.623";',
    'DVL_APP_VERSION 0.622→0.623'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: Kline WebSocket — candle em formação atualizado em tempo real." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: OI oscillator — uma barra por período (sem repetição no 1m)." },\n'
    '  { version: "Beta 0.622", note: "Feature: Kline WebSocket — candle em formação atualizado em tempo real." },',
    'DVL_CHANGELOG 0.623'
)
html = rep(html,
    'BETA 0.622</div>',
    'BETA 0.623</div>',
    'versionBadge 0.622→0.623'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.622</title>',
    '<title>DVL Binance Live — Beta 0.623</title>',
    'title 0.622→0.623'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.622",',
    '  window.DVLVolumeProfile = { version:"0.623",',
    'DVLVolumeProfile version 0.623'
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
