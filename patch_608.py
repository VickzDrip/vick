# patch_608.py — Beta 0.608
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.607)
#
# FIXES — "só vejo o de 1 minuto, mais abaixo que isso não":
#
#   O coletor VPS (/api/ticks/bars) não tem histórico suficiente → fetchTickBars
#   retorna [] → Volume Trace e TV não têm dados de 1s.
#
#   SOLUÇÃO: WebSocket aggTrade em tempo real direto da Binance.
#
#   1. TV IIFE: adiciona agregador WebSocket para wss://fstream.binance.com
#      ws/{symbol}@aggTrade — agrega trades chegando em barras de 1s no mapa
#      WS_MAP (mantém últimas 2h). Reconecta automaticamente quando o símbolo
#      muda. Exporta liveBars(t0,t1) via window.DVLTickVolume.liveBars.
#
#   2. TV draw(): usa liveBars como fallback quando CACHE.bars (VPS) está vazio.
#
#   3. Volume Trace fetchTickBars: cadeia VPS → liveBars (TV WebSocket).
#      Se VPS retornar vazio, usa as barras ao vivo do TV.
#
# VERSION: 0.607 → 0.608

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

# ── 1. TV IIFE: WebSocket aggTrade aggregator + export liveBars ───────────────
html = rep(html,
    '  window.DVLTickVolume = {\n'
    '    version:"0.599",\n'
    '    on,\n'
    '    setOn,\n'
    '    draw,\n'
    '    refresh: fitToCurrent,\n'
    '    fitToCurrent,\n'
    '    reset: fitToCurrent,\n'
    '    openPanel,\n'
    '    get state(){ return Object.assign({}, state); },\n'
    '    get cache(){ return Object.assign({}, CACHE, { bars:(CACHE.bars||[]).slice() }); }\n'
    '  };',

    '  // ── WebSocket aggTrade live aggregator (1s bars) ──────────────────────\n'
    '  const WS_MAP = new Map();\n'
    '  let _ws = null, _wsSym = null, _wsLastDraw = 0;\n'
    '\n'
    '  function _wsAgg(ts, qty, isBuy){\n'
    '    const k = Math.floor(ts/1000)*1000;\n'
    '    let b = WS_MAP.get(k);\n'
    '    if(!b){ b={ts:k,buyVol:0,sellVol:0,delta:0,trades:0}; WS_MAP.set(k,b); }\n'
    '    if(isBuy){ b.buyVol+=qty; b.delta+=qty; } else { b.sellVol+=qty; b.delta-=qty; }\n'
    '    b.trades++;\n'
    '  }\n'
    '\n'
    '  function _wsPrune(){\n'
    '    const cut = Date.now()-7_200_000;\n'
    '    for(const k of WS_MAP.keys()){ if(k<cut) WS_MAP.delete(k); }\n'
    '  }\n'
    '\n'
    '  function _wsConnect(){\n'
    '    const s=(window.currentSymbol||"BTCUSDT").toLowerCase();\n'
    '    if(_wsSym===s && _ws && _ws.readyState<2) return;\n'
    '    if(_ws){ try{ _ws.close(); }catch(_){} }\n'
    '    _wsSym=s; WS_MAP.clear();\n'
    '    try{\n'
    '      _ws=new WebSocket("wss://fstream.binance.com/ws/"+s+"@aggTrade");\n'
    '      _ws.onmessage=ev=>{\n'
    '        try{\n'
    '          const d=JSON.parse(ev.data);\n'
    '          if(d.e!=="aggTrade") return;\n'
    '          _wsAgg(Number(d.T),parseFloat(d.q)||0,!d.m);\n'
    '          _wsPrune();\n'
    '          const now=Date.now();\n'
    '          if(now-_wsLastDraw>500){ _wsLastDraw=now; if(typeof drawSoon==="function") drawSoon(); }\n'
    '        }catch(_){}\n'
    '      };\n'
    '      _ws.onerror=()=>{}; _ws.onclose=()=>{ _ws=null; };\n'
    '    }catch(_){}\n'
    '  }\n'
    '\n'
    '  function liveBars(t0,t1){\n'
    '    const out=[];\n'
    '    for(const b of WS_MAP.values()){ if(b.ts>=t0&&b.ts<=t1) out.push(b); }\n'
    '    return out.sort((a,b)=>a.ts-b.ts);\n'
    '  }\n'
    '\n'
    '  _wsConnect();\n'
    '  setInterval(_wsConnect,8000);\n'
    '\n'
    '  window.DVLTickVolume = {\n'
    '    version:"0.608",\n'
    '    on,\n'
    '    setOn,\n'
    '    draw,\n'
    '    refresh: fitToCurrent,\n'
    '    fitToCurrent,\n'
    '    reset: fitToCurrent,\n'
    '    openPanel,\n'
    '    liveBars,\n'
    '    get state(){ return Object.assign({}, state); },\n'
    '    get cache(){ return Object.assign({}, CACHE, { bars:(CACHE.bars||[]).slice() }); }\n'
    '  };',

    'TV: WebSocket aggTrade aggregator + liveBars export'
)

# ── 2. TV draw(): rawBars fallback para liveBars quando VPS vazio ─────────────
html = rep(html,
    '    const rawBars = CACHE.bars.filter(b => b.ts >= t0 && b.ts <= t1);',

    '    const vpsRaw = CACHE.bars.filter(b => b.ts >= t0 && b.ts <= t1);\n'
    '    const rawBars = vpsRaw.length > 0 ? vpsRaw : liveBars(t0, t1);',

    'TV draw: rawBars fallback para liveBars'
)

# ── 3. Volume Trace fetchTickBars: VPS → liveBars fallback ───────────────────
html = rep(html,
    '  async function fetchTickBars(symbolName, start, end){\n'
    '    const url = "/api/ticks/bars?symbol="+encodeURIComponent(symbolName)+"&from="+start+"&to="+end;\n'
    '    const r = await fetch(url);\n'
    '    if(!r.ok) throw new Error("HTTP "+r.status);\n'
    '    const bars = await r.json();\n'
    '    if(!Array.isArray(bars)) return [];\n'
    '    return bars.map(b => ({\n'
    '      time: b.ts,\n'
    '      volume: (b.buyVol||0) + (b.sellVol||0),\n'
    '      buyVolume: b.buyVol||0,\n'
    '      sellVolume: b.sellVol||0,\n'
    '      low:0, high:0, close:0\n'
    '    }));\n'
    '  }',

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

    'VT fetchTickBars: cadeia VPS → liveBars WS'
)

# ── Version bump 0.607 → 0.608 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.607";',
    'const DVL_APP_VERSION = "Beta 0.608";',
    'DVL_APP_VERSION 0.607→0.608'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: VT lower-TF fallback ao draw klines-based quando sem tick data; range 2h; anti-spam TTL." },',
    '{ version: DVL_APP_VERSION, note: "Feature: WebSocket aggTrade ao vivo (1s bars) — TV e Volume Trace usam barras Binance em tempo real sem depender do coletor VPS." },\n'
    '  { version: "Beta 0.607", note: "Bugfix: VT fallback klines-based; range 2h; anti-spam TTL." },',
    'DVL_CHANGELOG 0.608'
)
html = rep(html,
    'BETA 0.607</div>',
    'BETA 0.608</div>',
    'versionBadge 0.607→0.608'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.607</title>',
    '<title>DVL Binance Live — Beta 0.608</title>',
    'title 0.607→0.608'
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
