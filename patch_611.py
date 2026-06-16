# patch_611.py — Beta 0.611
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.610)
#
# FIX — TFs de segundos travando o gráfico:
#
#   patch_610 adicionou 1s/5s/10s/15s/30s ao seletor. Ao selecionar
#   qualquer um deles, fetchKlinesSmart roteia para
#   fetchKlinesFromAggTrades — que busca aggTrades 1000 por vez com
#   guard<30 iterações. Para BTCUSDT (500+ trades/s), isso trava o
#   loadAll() por vários segundos, congelando o chart, zerando klines
#   e deixando o TV sem dados ("nem mostra nada").
#
#   SOLUÇÃO:
#   1. Adiciona "1s" a nativeTimeframes → fetchKlinesHistory direto
#      via /fapi/v1/klines?interval=1s (suportado pela Binance Futures).
#   2. baseIntervalForTimeframe para unit "s" → retorna "1s", não "1m".
#      Assim 5s/10s/15s/30s usam resampleKlineRows a partir de klines 1s.
#   3. Remove o if(_parsed.unit === "s") → fetchKlinesFromAggTrades
#      em fetchKlinesSmart; 5s/30s etc. passam pelo caminho resample normal.
#
# VERSION: 0.610 → 0.611

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

# ── 1. nativeTimeframes: adiciona "1s" ───────────────────────────────────────
html = rep(html,
    'const nativeTimeframes = ["1m","3m","5m","15m","30m","1h","2h","4h","6h","8h","12h","1d","3d","1w"];',
    'const nativeTimeframes = ["1s","1m","3m","5m","15m","30m","1h","2h","4h","6h","8h","12h","1d","3d","1w"];',
    'nativeTimeframes: adiciona "1s"'
)

# ── 2. baseIntervalForTimeframe: "s" → "1s" (não "1m") ───────────────────────
html = rep(html,
    'function baseIntervalForTimeframe(iv){\n'
    '  if(isNativeTimeframe(iv)) return iv;\n'
    '  const parsed = parseTimeframe(iv);\n'
    '  if(parsed.unit === "m") return "1m";\n'
    '  if(parsed.unit === "h") return "1h";\n'
    '  if(parsed.unit === "d" || parsed.unit === "w") return "1d";\n'
    '  return "1m";\n'
    '}',

    'function baseIntervalForTimeframe(iv){\n'
    '  if(isNativeTimeframe(iv)) return iv;\n'
    '  const parsed = parseTimeframe(iv);\n'
    '  if(parsed.unit === "s") return "1s";\n'
    '  if(parsed.unit === "m") return "1m";\n'
    '  if(parsed.unit === "h") return "1h";\n'
    '  if(parsed.unit === "d" || parsed.unit === "w") return "1d";\n'
    '  return "1m";\n'
    '}',

    'baseIntervalForTimeframe: "s" → "1s"'
)

# ── 3. fetchKlinesSmart: remove caminho aggTrades para unit "s" ───────────────
html = rep(html,
    '  const _parsed = parseTimeframe(iv);\n'
    '  if(_parsed.unit === "s"){\n'
    '    return await fetchKlinesFromAggTrades(sym, iv, targetLimit);\n'
    '  }\n'
    '\n'
    '  const baseIv = baseIntervalForTimeframe(iv);',

    '  const baseIv = baseIntervalForTimeframe(iv);',

    'fetchKlinesSmart: remove fetchKlinesFromAggTrades para "s"'
)

# ── Version bump 0.610 → 0.611 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.610";',
    'const DVL_APP_VERSION = "Beta 0.611";',
    'DVL_APP_VERSION 0.610→0.611'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: TFs de segundos (1s/5s/10s/15s/30s) no seletor de gráfico." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: 1s nativo Binance + resample para 5s/10s/15s/30s — evita travamento do chart via aggTrades." },\n'
    '  { version: "Beta 0.610", note: "Feature: TFs de segundos (1s/5s/10s/15s/30s) no seletor." },',
    'DVL_CHANGELOG 0.611'
)
html = rep(html,
    'BETA 0.610</div>',
    'BETA 0.611</div>',
    'versionBadge 0.610→0.611'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.610</title>',
    '<title>DVL Binance Live — Beta 0.611</title>',
    'title 0.610→0.611'
)
html = rep(html,
    '    version:"0.610",',
    '    version:"0.611",',
    'DVLTickVolume version 0.610→0.611'
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
