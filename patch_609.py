# patch_609.py — Beta 0.609
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.608)
#
# FIXES — Volume Trace Detection TF "30 seconds" não gera bubbles:
#
#   1. liveBars(t0,t1) retornava sempre barras de 1s independente do
#      detectionTf configurado. Quando VT usa "30s", buildLowerEvents
#      recebe 30× mais barras — cada uma com 1/30 do volume — gerando
#      eventos ruidosos ou nenhum evento útil.
#
#      SOLUÇÃO: liveBars(t0,t1,aggMs) — novo parâmetro `aggMs` agrega
#      os buckets de 1s do WS_MAP em barras do TF alvo antes de retornar.
#
#   2. fetchTickBars não passava tfMs ao liveBars.
#      SOLUÇÃO: fetchTickBars(symbolName, start, end, tfMs) — repassa
#      tfMs ao liveBars no fallback WS.
#
#   3. loadLowerData não passava tfMs ao fetchTickBars.
#      SOLUÇÃO: fetchTickBars(sym(), rangeStart, rangeEnd, tfMs).
#
#   4. lower-TF draw: quando events=[] mas cache.data não vazio, retornava
#      sem mostrar nada. Fallback _origVTDraw (klines-based) também não era
#      chamado — o usuário via tela limpa sem nenhum bubble.
#      SOLUÇÃO: se events.length===0, chamar _origVTDraw como fallback.
#
# VERSION: 0.608 → 0.609

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

# ── 1. liveBars: parâmetro aggMs para agregar 1s→TF alvo ─────────────────────
html = rep(html,
    '  function liveBars(t0,t1){\n'
    '    const out=[];\n'
    '    for(const b of WS_MAP.values()){ if(b.ts>=t0&&b.ts<=t1) out.push(b); }\n'
    '    return out.sort((a,b)=>a.ts-b.ts);\n'
    '  }',

    '  function liveBars(t0,t1,aggMs){\n'
    '    aggMs = (aggMs && aggMs > 1000) ? aggMs : 1000;\n'
    '    if(aggMs <= 1000){\n'
    '      const out=[];\n'
    '      for(const b of WS_MAP.values()){ if(b.ts>=t0&&b.ts<=t1) out.push(b); }\n'
    '      return out.sort((a,b)=>a.ts-b.ts);\n'
    '    }\n'
    '    const map=new Map();\n'
    '    for(const b of WS_MAP.values()){\n'
    '      if(b.ts<t0||b.ts>t1) continue;\n'
    '      const k=Math.floor(b.ts/aggMs)*aggMs;\n'
    '      let a=map.get(k);\n'
    '      if(!a){ a={ts:k,buyVol:0,sellVol:0,delta:0,trades:0}; map.set(k,a); }\n'
    '      a.buyVol+=b.buyVol; a.sellVol+=b.sellVol; a.delta+=b.delta; a.trades+=b.trades;\n'
    '    }\n'
    '    return Array.from(map.values()).sort((a,b)=>a.ts-b.ts);\n'
    '  }',

    'liveBars: aggMs aggregation'
)

# ── 2. fetchTickBars: aceita tfMs e repassa ao liveBars ───────────────────────
html = rep(html,
    '  async function fetchTickBars(symbolName, start, end){\n'
    '    // 1) Tenta VPS coletor\n'
    '    try{\n'
    '      const url = "/api/ticks/bars?symbol="+encodeURIComponent(symbolName)+"&from="+start+"&to="+end;\n'
    '      const r = await fetch(url);\n'
    '      if(r.ok){\n'
    '        const bars = await r.json();\n'
    '        if(Array.isArray(bars) && bars.length){\n'
    '          return bars.map(b=>({\n'
    '            time:b.ts, volume:(b.buyVol||0)+(b.sellVol||0),\n'
    '            buyVolume:b.buyVol||0, sellVolume:b.sellVol||0,\n'
    '            low:0, high:0, close:0\n'
    '          }));\n'
    '        }\n'
    '      }\n'
    '    }catch(_){}\n'
    '    // 2) Fallback: barras ao vivo via WebSocket do TV\n'
    '    const tv=window.DVLTickVolume;\n'
    '    if(tv && typeof tv.liveBars==="function"){\n'
    '      return tv.liveBars(start,end).map(b=>({\n'
    '        time:b.ts, volume:(b.buyVol||0)+(b.sellVol||0),\n'
    '        buyVolume:b.buyVol||0, sellVolume:b.sellVol||0,\n'
    '        low:0, high:0, close:0\n'
    '      }));\n'
    '    }\n'
    '    return [];\n'
    '  }',

    '  async function fetchTickBars(symbolName, start, end, tfMs){\n'
    '    // 1) Tenta VPS coletor\n'
    '    try{\n'
    '      const url = "/api/ticks/bars?symbol="+encodeURIComponent(symbolName)+"&from="+start+"&to="+end;\n'
    '      const r = await fetch(url);\n'
    '      if(r.ok){\n'
    '        const bars = await r.json();\n'
    '        if(Array.isArray(bars) && bars.length){\n'
    '          return bars.map(b=>({\n'
    '            time:b.ts, volume:(b.buyVol||0)+(b.sellVol||0),\n'
    '            buyVolume:b.buyVol||0, sellVolume:b.sellVol||0,\n'
    '            low:0, high:0, close:0\n'
    '          }));\n'
    '        }\n'
    '      }\n'
    '    }catch(_){}\n'
    '    // 2) Fallback: barras ao vivo via WebSocket do TV\n'
    '    const tv=window.DVLTickVolume;\n'
    '    if(tv && typeof tv.liveBars==="function"){\n'
    '      return tv.liveBars(start,end,tfMs).map(b=>({\n'
    '        time:b.ts, volume:(b.buyVol||0)+(b.sellVol||0),\n'
    '        buyVolume:b.buyVol||0, sellVolume:b.sellVol||0,\n'
    '        low:0, high:0, close:0\n'
    '      }));\n'
    '    }\n'
    '    return [];\n'
    '  }',

    'fetchTickBars: repassa tfMs ao liveBars'
)

# ── 3. loadLowerData: passa tfMs ao fetchTickBars ────────────────────────────
html = rep(html,
    '      if(parsed.unit === "s"){\n'
    '        data = await fetchTickBars(sym(), rangeStart, rangeEnd);\n'
    '      }else{',

    '      if(parsed.unit === "s"){\n'
    '        data = await fetchTickBars(sym(), rangeStart, rangeEnd, tfMs);\n'
    '      }else{',

    'loadLowerData: passa tfMs ao fetchTickBars'
)

# ── 4. lower-TF draw: fallback _origVTDraw quando events vazio ───────────────
html = rep(html,
    '    const data = cache.data || [];\n'
    '    if(!data.length){ if(_origVTDraw) _origVTDraw(ctx, cfg); return; }\n'
    '\n'
    '    const events = buildLowerEvents(state, cfg);\n'
    '    if(!events.length) return;',

    '    const data = cache.data || [];\n'
    '    if(!data.length){ if(_origVTDraw) _origVTDraw(ctx, cfg); return; }\n'
    '\n'
    '    const events = buildLowerEvents(state, cfg);\n'
    '    if(!events.length){ if(_origVTDraw) _origVTDraw(ctx, cfg); return; }',

    'lower-TF draw: fallback _origVTDraw quando events vazio'
)

# ── Version bump 0.608 → 0.609 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.608";',
    'const DVL_APP_VERSION = "Beta 0.609";',
    'DVL_APP_VERSION 0.608→0.609'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: WebSocket aggTrade ao vivo (1s bars) — TV e Volume Trace usam barras Binance em tempo real sem depender do coletor VPS." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: VT liveBars agrega 1s→TF alvo (aggMs); fetchTickBars passa tfMs; fallback _origVTDraw quando events vazio." },\n'
    '  { version: "Beta 0.608", note: "Feature: WebSocket aggTrade ao vivo (1s bars); TV e VT usam Binance WS sem VPS." },',
    'DVL_CHANGELOG 0.609'
)
html = rep(html,
    'BETA 0.608</div>',
    'BETA 0.609</div>',
    'versionBadge 0.608→0.609'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.608</title>',
    '<title>DVL Binance Live — Beta 0.609</title>',
    'title 0.608→0.609'
)
html = rep(html,
    '    version:"0.608",',
    '    version:"0.609",',
    'DVLTickVolume version 0.608→0.609'
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
