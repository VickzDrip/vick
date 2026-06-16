# patch_610.py — Beta 0.610
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.609)
#
# FEATURE — Timeframes de segundos no seletor de gráfico:
#
#   Adiciona "1s","5s","10s","15s","30s" à availableTimeframes.
#   A infraestrutura já existe:
#     - parseTimeframe("30s") → {unit:"s", ms:30000}
#     - fetchKlinesSmart → fetchKlinesFromAggTrades para unit=s
#     - sortTimeframesAscending lida com "s"
#     - historyLimitForInterval já tem "15s","30s"
#   Faltava apenas expor os TFs na lista e corrigir o regex
#   de favoritos (que bloqueava "s" ao salvar no localStorage).
#
#   1. availableTimeframes: adiciona 1s,5s,10s,15s,30s no início.
#   2. favoriteTimeframes regex: /^[1-9]\d*(m|h|d|w)$/ → aceita "s".
#   3. historyLimitForInterval: limites para 1s,5s,10s.
#   4. TF_OPTIONS (spike zones): adiciona 15s,30s.
#
# VERSION: 0.609 → 0.610

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

# ── 1. availableTimeframes: adiciona TFs de segundos ─────────────────────────
html = rep(html,
    'let availableTimeframes = Array.from(new Set([\n'
    '  "1m","2m","3m","4m","5m","6m","7m","8m","10m","12m","15m","20m","30m","45m",\n'
    '  "1h","2h","3h","4h","6h","8h","12h",\n'
    '  "1d","2d","3d","1w",\n'
    '  ...customTimeframes\n'
    ']));',

    'let availableTimeframes = Array.from(new Set([\n'
    '  "1s","5s","10s","15s","30s",\n'
    '  "1m","2m","3m","4m","5m","6m","7m","8m","10m","12m","15m","20m","30m","45m",\n'
    '  "1h","2h","3h","4h","6h","8h","12h",\n'
    '  "1d","2d","3d","1w",\n'
    '  ...customTimeframes\n'
    ']));',

    'availableTimeframes: adiciona 1s,5s,10s,15s,30s'
)

# ── 2. favoriteTimeframes regex: aceita "s" ────────────────────────────────────
html = rep(html,
    'const valid = Array.isArray(parsed) ? parsed.filter(tf => /^[1-9]\\d*(m|h|d|w)$/.test(String(tf))) : [];',
    'const valid = Array.isArray(parsed) ? parsed.filter(tf => /^[1-9]\\d*(s|m|h|d|w)$/.test(String(tf))) : [];',
    'favoriteTimeframes regex: aceita "s"'
)

# ── 3. historyLimitForInterval: limites para 1s, 5s, 10s ─────────────────────
html = rep(html,
    'function historyLimitForInterval(iv){\n'
    '  if(iv === "15s") return 1200;\n'
    '  if(iv === "30s") return 1200;\n'
    '  if(iv === "1m") return 4500;',

    'function historyLimitForInterval(iv){\n'
    '  if(iv === "1s")  return 600;\n'
    '  if(iv === "5s")  return 720;\n'
    '  if(iv === "10s") return 720;\n'
    '  if(iv === "15s") return 1200;\n'
    '  if(iv === "30s") return 1200;\n'
    '  if(iv === "1m") return 4500;',

    'historyLimitForInterval: 1s,5s,10s'
)

# ── 4. TF_OPTIONS (spike zones): adiciona 15s, 30s ───────────────────────────
html = rep(html,
    'const TF_OPTIONS = ["chart","1m","3m","5m","15m","30m","1h","2h","4h","6h","12h","1d"];',
    'const TF_OPTIONS = ["chart","15s","30s","1m","3m","5m","15m","30m","1h","2h","4h","6h","12h","1d"];',
    'TF_OPTIONS: adiciona 15s,30s'
)

# ── Version bump 0.609 → 0.610 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.609";',
    'const DVL_APP_VERSION = "Beta 0.610";',
    'DVL_APP_VERSION 0.609→0.610'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: VT liveBars agrega 1s→TF alvo (aggMs); fetchTickBars passa tfMs; fallback _origVTDraw quando events vazio." },',
    '{ version: DVL_APP_VERSION, note: "Feature: TFs de segundos (1s/5s/10s/15s/30s) no seletor de gráfico." },\n'
    '  { version: "Beta 0.609", note: "Bugfix: VT liveBars aggMs; fetchTickBars tfMs; _origVTDraw fallback quando events vazio." },',
    'DVL_CHANGELOG 0.610'
)
html = rep(html,
    'BETA 0.609</div>',
    'BETA 0.610</div>',
    'versionBadge 0.609→0.610'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.609</title>',
    '<title>DVL Binance Live — Beta 0.610</title>',
    'title 0.609→0.610'
)
html = rep(html,
    '    version:"0.609",',
    '    version:"0.610",',
    'DVLTickVolume version 0.609→0.610'
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
