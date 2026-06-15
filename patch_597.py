# patch_597.py — Beta 0.597
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.596)
#
# BUGFIX: Delta Volume mostrava "No delta data" para sempre
#   1. CACHE.key era setado ANTES do fetch — ao falhar, ficava bloqueado (sem retry)
#   2. Sem drawSoon() no finally — mesmo com sucesso, gráfico não redesenhava
#
#   Fix: CACHE.key só é setado após fetch bem-sucedido (padrão igual ao OI)
#        drawSoon() adicionado no finally
#
# VERSION: 0.596 → 0.597

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

# ── 1. Fix Delta Volume ensureData: key after success + drawSoon ──────────────
html = rep(html,
    '  async function ensureData(force){\n'
    '    const key = cacheKey();\n'
    '    if(!force && CACHE.key === key) return;\n'
    '    if(CACHE.fetching) return;\n'
    '    CACHE.fetching = true;\n'
    '    CACHE.key = key;\n'
    '    const sym_ = sym();\n'
    '    const pMs = periodMs(period());\n'
    '    try{\n'
    '      const LIMIT = 1500;\n'
    '      const pages = [];\n'
    '      let endTime = null;\n'
    '      for(let p=0; p<3; p++){\n'
    '        const rows = await fetchPage(sym_, LIMIT, endTime);\n'
    '        if(!rows || !rows.length) break;\n'
    '        pages.push(...rows);\n'
    '        endTime = Number(rows[0][0]) - 1;\n'
    '        if(rows.length < LIMIT) break;\n'
    '      }\n'
    '      if(CACHE.key !== key){ CACHE.fetching=false; return; }\n'
    '      const map = parseKlines(pages, pMs);\n'
    '      const sorted = Array.from(map.values()).sort((a,b)=>a.t-b.t);\n'
    '      CACHE.data = sorted;\n'
    '    }catch(e){\n'
    '      if(CACHE.key === key) CACHE.data = [];\n'
    '    }finally{\n'
    '      CACHE.fetching = false;\n'
    '    }\n'
    '  }',

    '  async function ensureData(force){\n'
    '    const key = cacheKey();\n'
    '    if(!force && CACHE.key === key) return;\n'
    '    if(CACHE.fetching) return;\n'
    '    CACHE.fetching = true;\n'
    '    const sym_ = sym();\n'
    '    const pMs = periodMs(period());\n'
    '    try{\n'
    '      const LIMIT = 1500;\n'
    '      const pages = [];\n'
    '      let endTime = null;\n'
    '      for(let p=0; p<3; p++){\n'
    '        const rows = await fetchPage(sym_, LIMIT, endTime);\n'
    '        if(!rows || !rows.length) break;\n'
    '        pages.push(...rows);\n'
    '        endTime = Number(rows[0][0]) - 1;\n'
    '        if(rows.length < LIMIT) break;\n'
    '      }\n'
    '      const map = parseKlines(pages, pMs);\n'
    '      const sorted = Array.from(map.values()).sort((a,b)=>a.t-b.t);\n'
    '      CACHE.key = key;\n'
    '      CACHE.data = sorted;\n'
    '    }catch(e){\n'
    '      CACHE.data = [];\n'
    '    }finally{\n'
    '      CACHE.fetching = false;\n'
    '      if(typeof drawSoon === "function") drawSoon();\n'
    '    }\n'
    '  }',

    'DV ensureData: key pos-fetch + drawSoon'
)

# ── Version bump 0.596 → 0.597 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.596";',
    'const DVL_APP_VERSION = "Beta 0.597";',
    'DVL_APP_VERSION 0.596→0.597'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Delta Volume: novo oscilador, barras buy/sell/delta via klines 1m Binance Futures, agrupadas por periodo mae. MA opcional." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: Delta Volume nao carregava — CACHE.key setado antes do fetch bloqueava retry; sem drawSoon causava tela vazia apos fetch." },\n'
    '  { version: "Beta 0.596", note: "Delta Volume: oscilador buy/sell/delta via klines 1m." },',
    'DVL_CHANGELOG 0.597'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.596</div>',
    '<div class="beta" id="versionBadge">BETA 0.597</div>',
    'versionBadge 0.596→0.597'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.596</title>',
    '<title>DVL Binance Live — Beta 0.597</title>',
    'title 0.596→0.597'
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
