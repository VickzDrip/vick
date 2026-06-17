# patch_622.py — Beta 0.622
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.621)
#
# FIX — Candle em formação atualizado em tempo real via WebSocket de klines
#
#   O app só atualizava os candles via polling REST a cada 15 segundos.
#   Resultado: ao abrir um novo candle, por até 15s o candle exibia os
#   valores do fetch anterior — parecendo uma "cópia" do candle anterior.
#   No 1m isso era especialmente visível (candles todos idênticos até o
#   próximo poll).
#
#   SOLUÇÃO: WebSocket `<symbol>@kline_<interval>` da Binance Futures.
#   - Cada mensagem de kline atualiza klines[last] em tempo real (OHLCV,
#     volume, buyVolume), sem esperar os 15s.
#   - Se o tempo do kline WS for maior que o último candle em klines,
#     um novo candle é adicionado (ex: candle fechou entre polls).
#   - O polling de 15s é mantido para dados históricos e sincronização.
#   - Reconecta automaticamente a cada 5s se symbol ou interval mudou.
#   - Mensagens stale (symbol/interval antigo) são descartadas em runtime.
#   - Só ativa para timeframes nativos da Binance (nativeTimeframes[]).
#   - Redraws throttled a 200ms para não saturar o canvas.
#
# VERSION: 0.621 → 0.622

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

# ── 1. Chamar _klWsConnect() após loadAll() atualizar klines ─────────────────
html = rep(html,
    '    derivativesDataReal = oiHist.length > 0;\n'
    '    updateHeader();\n'
    '    els.loading.classList.add("hidden");\n'
    '    if(candleMode === "footprint") fetchFootprintData();\n'
    '    drawSoon();\n'
    '  }catch(err){',

    '    derivativesDataReal = oiHist.length > 0;\n'
    '    updateHeader();\n'
    '    els.loading.classList.add("hidden");\n'
    '    if(candleMode === "footprint") fetchFootprintData();\n'
    '    drawSoon();\n'
    '    if(typeof _klWsConnect===\'function\') _klWsConnect();\n'
    '  }catch(err){',

    'loadAll(): call _klWsConnect after klines update'
)

# ── 2. WebSocket de klines após o timer de polling ───────────────────────────
html = rep(html,
    'timer = setInterval(()=>loadAll(true), 15000);\n'
    'setInterval(()=>refreshAssetTickers(true), 10000);\n'
    'setInterval(drawSoon, 1000);',

    'timer = setInterval(()=>loadAll(true), 15000);\n'
    'setInterval(()=>refreshAssetTickers(true), 10000);\n'
    'setInterval(drawSoon, 1000);\n'
    '\n'
    '// ── Kline WebSocket: candle em formação em tempo real ───────────────────\n'
    'let _klWs = null, _klWsSym = null, _klWsIv = null, _klWsLastDraw = 0;\n'
    '\n'
    'function _klWsConnect(){\n'
    '  const s  = (symbol  || \'BTCUSDT\').toUpperCase();\n'
    '  const iv = (interval|| \'5m\');\n'
    '  if(!isNativeTimeframe(iv)){\n'
    '    if(_klWs){ try{_klWs.close();}catch(_){} _klWs=null; }\n'
    '    return;\n'
    '  }\n'
    '  if(_klWsSym===s && _klWsIv===iv && _klWs && _klWs.readyState<2) return;\n'
    '  if(_klWs){ try{ _klWs.close(); }catch(_){} _klWs=null; }\n'
    '  _klWsSym=s; _klWsIv=iv;\n'
    '  try{\n'
    '    _klWs = new WebSocket(\'wss://fstream.binance.com/ws/\'+s.toLowerCase()+\'@kline_\'+iv);\n'
    '    _klWs.onmessage = ev => {\n'
    '      try{\n'
    '        const msg = JSON.parse(ev.data);\n'
    '        if(msg.e !== \'kline\') return;\n'
    '        const k = msg.k;\n'
    '        // Descarta mensagens stale se symbol/interval mudou\n'
    '        if(k.s !== (symbol||\'BTCUSDT\').toUpperCase() || k.i !== (interval||\'5m\')) return;\n'
    '        const t = +k.t;\n'
    '        const entry = { time:t, open:+k.o, high:+k.h, low:+k.l, close:+k.c,\n'
    '                        volume:+k.v, quoteVolume:+k.q, buyVolume:+k.V };\n'
    '        if(klines.length && klines[klines.length-1].time === t){\n'
    '          Object.assign(klines[klines.length-1], entry);\n'
    '        } else if(!klines.length || t > klines[klines.length-1].time){\n'
    '          klines.push(entry);\n'
    '        }\n'
    '        const now = Date.now();\n'
    '        if(now-_klWsLastDraw > 200){ _klWsLastDraw=now; drawSoon(); }\n'
    '      }catch(_){}\n'
    '    };\n'
    '    _klWs.onerror = ()=>{};\n'
    '    _klWs.onclose = ()=>{ _klWs=null; };\n'
    '  }catch(_){}\n'
    '}\n'
    '\n'
    '_klWsConnect();\n'
    'setInterval(_klWsConnect, 5000);',

    'kline WebSocket real-time forming candle'
)

# ── 3. Version bump 0.621 → 0.622 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.621";',
    'const DVL_APP_VERSION = "Beta 0.622";',
    'DVL_APP_VERSION 0.621→0.622'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: POC/VAH/VAL hysteresis — sem flickering ao arrastar o gráfico." },',
    '{ version: DVL_APP_VERSION, note: "Feature: Kline WebSocket — candle em formação atualizado em tempo real." },\n'
    '  { version: "Beta 0.621", note: "Bugfix: POC/VAH/VAL hysteresis — sem flickering ao arrastar o gráfico." },',
    'DVL_CHANGELOG 0.622'
)
html = rep(html,
    'BETA 0.621</div>',
    'BETA 0.622</div>',
    'versionBadge 0.621→0.622'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.621</title>',
    '<title>DVL Binance Live — Beta 0.622</title>',
    'title 0.621→0.622'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.621",',
    '  window.DVLVolumeProfile = { version:"0.622",',
    'DVLVolumeProfile version 0.622'
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
