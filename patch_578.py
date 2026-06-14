# patch_578.py — Beta 0.578
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.577)
#         DepthVisionLab-v106_REAL_UI/server.js
#
# FIXES:
#   A. 15s/30s timeframes via real Binance aggTrades
#      - parseTimeframe(): add 's' unit support
#      - historyLimitForInterval(): add 15s/30s entries
#      - timeframeSortValue(): sort seconds correctly in hotbar
#      - fetchKlinesFromAggTrades(): new function, main scope
#      - fetchKlinesSmart(): route unit==='s' to aggTrades path
#
#   B. Footprint candles with real buy/sell data
#      - window._dvlFpCache: Map(candleTime -> {b, s, total})
#      - fetchFootprintData(): calls local /api/footprint
#      - setCandleMode(): trigger fetch when mode='footprint'
#      - renderer: use real ratio from cache, fallback to 62/38
#
#   C. server.js tfToMs: add 's' unit for /api/footprint endpoint
#
#   VERSION: 0.577 → 0.578

import sys, re

HTML = 'DepthVisionLab-v106_REAL_UI/public/index.html'
SRV  = 'DepthVisionLab-v106_REAL_UI/server.js'

html = open(HTML, 'r', encoding='utf-8').read()
srv  = open(SRV,  'r', encoding='utf-8').read()

errors = []
fixes  = []

def rep(src, old, new, label):
    if old not in src:
        errors.append('NOT FOUND: ' + label)
        return src
    c = src.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return src
    fixes.append(label)
    return src.replace(old, new)

# ── A1: parseTimeframe — add 's' unit ────────────────────────────────────────
html = rep(html,
    "function parseTimeframe(iv){\n"
    "  const m = String(iv || \"1m\").trim().match(/^(\\d+)(m|h|d|w)$/);\n"
    "  if(!m) return { value:1, unit:\"m\", ms:60_000 };\n"
    "  const value = Math.max(1, Number(m[1]) || 1);\n"
    "  const unit = m[2];\n"
    "  const unitMs = unit === \"m\" ? 60_000 : unit === \"h\" ? 3_600_000 : unit === \"d\" ? 86_400_000 : 7 * 86_400_000;\n"
    "  return { value, unit, ms:value * unitMs };\n"
    "}",

    "function parseTimeframe(iv){\n"
    "  const m = String(iv || \"1m\").trim().match(/^(\\d+)(s|m|h|d|w)$/);\n"
    "  if(!m) return { value:1, unit:\"m\", ms:60_000 };\n"
    "  const value = Math.max(1, Number(m[1]) || 1);\n"
    "  const unit = m[2];\n"
    "  const unitMs = unit === \"s\" ? 1_000 : unit === \"m\" ? 60_000 : unit === \"h\" ? 3_600_000 : unit === \"d\" ? 86_400_000 : 7 * 86_400_000;\n"
    "  return { value, unit, ms:value * unitMs };\n"
    "}",
    'parseTimeframe: add seconds unit support'
)

# ── A2: historyLimitForInterval — add 15s/30s ────────────────────────────────
html = rep(html,
    'function historyLimitForInterval(iv){\n'
    '  if(iv === "1m") return 4500;\n'
    '  if(iv === "3m") return 4500;',

    'function historyLimitForInterval(iv){\n'
    '  if(iv === "15s") return 1200;\n'
    '  if(iv === "30s") return 1200;\n'
    '  if(iv === "1m") return 4500;\n'
    '  if(iv === "3m") return 4500;',
    'historyLimitForInterval: add 15s/30s (1200 candles = 5-10 min history)'
)

# ── A3: timeframeSortValue — sort seconds correctly ──────────────────────────
html = rep(html,
    'function timeframeSortValue(tf){\n'
    '  const m = String(tf || "").trim().toLowerCase().match(/^(\\d+)(m|h|d|w)$/);\n'
    '  if(!m) return Number.MAX_SAFE_INTEGER;\n'
    '  const n = Math.max(1, Number(m[1]) || 1);\n'
    '  const unit = m[2];\n'
    '  if(unit === "m") return n;',

    'function timeframeSortValue(tf){\n'
    '  const m = String(tf || "").trim().toLowerCase().match(/^(\\d+)(s|m|h|d|w)$/);\n'
    '  if(!m) return Number.MAX_SAFE_INTEGER;\n'
    '  const n = Math.max(1, Number(m[1]) || 1);\n'
    '  const unit = m[2];\n'
    '  if(unit === "s") return n / 60;\n'
    '  if(unit === "m") return n;',
    'timeframeSortValue: sort seconds TFs before minutes in hotbar'
)

# ── A4+A5: fetchKlinesFromAggTrades + fetchKlinesSmart routing ───────────────
html = rep(html,
    'async function fetchKlinesSmart(sym, iv, targetLimit){\n'
    '  if(isNativeTimeframe(iv)){\n'
    '    return await fetchKlinesHistory(sym, iv, targetLimit);\n'
    '  }',

    # Insert fetchKlinesFromAggTrades before fetchKlinesSmart, then patch the function
    'async function fetchKlinesFromAggTrades(sym, iv, targetLimit){\n'
    '  const tfMs = intervalMs(iv);\n'
    '  const end = Date.now();\n'
    '  const start = end - tfMs * (targetLimit + 20);\n'
    '  const buckets = new Map();\n'
    '  let cursor = start;\n'
    '  let guard = 0;\n'
    '  while(cursor < end && guard < 30){\n'
    '    guard++;\n'
    '    const url = BINANCE + "/fapi/v1/aggTrades?symbol=" + encodeURIComponent(sym)\n'
    '      + "&startTime=" + Math.floor(cursor)\n'
    '      + "&endTime=" + Math.floor(end)\n'
    '      + "&limit=1000";\n'
    '    let batch;\n'
    '    try{ batch = await jget(url); }catch(e){ break; }\n'
    '    if(!Array.isArray(batch) || !batch.length) break;\n'
    '    batch.forEach(tr => {\n'
    '      const t = Number(tr.T), p = Number(tr.p), q = Number(tr.q) || 0;\n'
    '      if(!Number.isFinite(t) || !Number.isFinite(p) || !q) return;\n'
    '      const bt = Math.floor(t / tfMs) * tfMs;\n'
    '      let b = buckets.get(bt);\n'
    '      if(!b){ b = {time:bt,open:p,high:p,low:p,close:p,volume:0,buyVol:0,sellVol:0}; buckets.set(bt,b); }\n'
    '      b.high = Math.max(b.high, p); b.low = Math.min(b.low, p); b.close = p;\n'
    '      b.volume += q;\n'
    '      if(tr.m) b.sellVol += q; else b.buyVol += q;\n'
    '    });\n'
    '    const lastT = Number(batch[batch.length-1].T);\n'
    '    if(!Number.isFinite(lastT) || lastT <= cursor) break;\n'
    '    cursor = lastT + 1;\n'
    '    if(batch.length < 1000) break;\n'
    '    await new Promise(r => setTimeout(r, 80));\n'
    '  }\n'
    '  // Build footprint cache for this fetch\n'
    '  if(!window._dvlFpCache) window._dvlFpCache = new Map();\n'
    '  const result = Array.from(buckets.values()).sort((a,b) => a.time - b.time).slice(-targetLimit);\n'
    '  result.forEach(c => { window._dvlFpCache.set(c.time, {b:c.buyVol, s:c.sellVol, total:c.volume}); });\n'
    '  return result.map(c => [c.time, String(c.open), String(c.high), String(c.low), String(c.close), String(c.volume), c.time+tfMs-1, String(c.volume)]);\n'
    '}\n'
    '\n'
    'async function fetchKlinesSmart(sym, iv, targetLimit){\n'
    '  if(isNativeTimeframe(iv)){\n'
    '    return await fetchKlinesHistory(sym, iv, targetLimit);\n'
    '  }\n'
    '  const _parsed = parseTimeframe(iv);\n'
    '  if(_parsed.unit === "s"){\n'
    '    return await fetchKlinesFromAggTrades(sym, iv, targetLimit);\n'
    '  }',
    '15s/30s: fetchKlinesFromAggTrades + fetchKlinesSmart routing'
)

# ── B1: footprint cache global + fetchFootprintData function ─────────────────
# Inject after the global `let interval = "1m";` line
html = rep(html,
    'let interval = "1m";',
    'let interval = "1m";\n'
    'window._dvlFpCache = new Map();\n'
    'async function fetchFootprintData(){\n'
    '  if(!klines.length) return;\n'
    '  const start = klines[0].time;\n'
    '  const end = Date.now();\n'
    '  const price = klines.at(-1)?.close || 60000;\n'
    '  const tick = Math.max(0.01, parseFloat((price * 0.00015).toPrecision(2)));\n'
    '  try{\n'
    '    const data = await jget("/api/footprint?start="+start+"&end="+end+"&interval="+encodeURIComponent(interval)+"&tick="+tick);\n'
    '    if(!Array.isArray(data)) return;\n'
    '    data.forEach(d => { window._dvlFpCache.set(d.t, {b:d.b||0, s:d.s||0, total:(d.b||0)+(d.s||0)}); });\n'
    '  }catch(e){ console.warn("[DVL] footprint fetch:", e.message); }\n'
    '}',
    'footprint: global cache + fetchFootprintData() via /api/footprint'
)

# ── B2: setCandleMode — fetch real footprint on mode change ──────────────────
html = rep(html,
    'function setCandleMode(mode){\n'
    '  candleMode = ["candles","hollow","footprint","heikin","renko"].includes(mode) ? mode : "candles";\n'
    '  if(els.candleTypeLabel) els.candleTypeLabel.textContent = candleModeLabel(candleMode);\n'
    '  if(els.candleTypeOptions){\n'
    '    els.candleTypeOptions.forEach(btn => {\n'
    '      btn.classList.toggle("activeCandleType", btn.dataset.candleMode === candleMode);\n'
    '    });\n'
    '  }\n'
    '  closeCandleTypeMenu();\n'
    '  drawSoon();\n'
    '}',

    'function setCandleMode(mode){\n'
    '  candleMode = ["candles","hollow","footprint","heikin","renko"].includes(mode) ? mode : "candles";\n'
    '  if(els.candleTypeLabel) els.candleTypeLabel.textContent = candleModeLabel(candleMode);\n'
    '  if(els.candleTypeOptions){\n'
    '    els.candleTypeOptions.forEach(btn => {\n'
    '      btn.classList.toggle("activeCandleType", btn.dataset.candleMode === candleMode);\n'
    '    });\n'
    '  }\n'
    '  closeCandleTypeMenu();\n'
    '  if(candleMode === "footprint") fetchFootprintData();\n'
    '  drawSoon();\n'
    '}',
    'setCandleMode: trigger fetchFootprintData() when mode=footprint'
)

# ── B3: renderer — use real fp cache ratio, fallback to 62/38 ────────────────
html = rep(html,
    '    } else if(candleMode === "footprint"){\n'
    '      const left = cx - candleW / 2;\n'
    '      const buyW = candleW * (up ? .62 : .38);\n'
    '      const sellW = candleW - buyW;',

    '    } else if(candleMode === "footprint"){\n'
    '      const left = cx - candleW / 2;\n'
    '      const _fpd = window._dvlFpCache && window._dvlFpCache.get(c.time);\n'
    '      const _buyRatio = (_fpd && _fpd.total > 0) ? Math.max(.05, Math.min(.95, _fpd.b / _fpd.total)) : (up ? .62 : .38);\n'
    '      const buyW = candleW * _buyRatio;\n'
    '      const sellW = candleW - buyW;',
    'footprint renderer: use real buy/sell ratio from _dvlFpCache, fallback 62/38'
)

# ── B4: also refresh footprint cache on loadAll success ──────────────────────
html = rep(html,
    '    derivativesDataReal = Array.isArray(oi) && oi.length > 0;\n'
    '    updateHeader();\n'
    '    els.loading.classList.add("hidden");\n'
    '    drawSoon();',

    '    derivativesDataReal = Array.isArray(oi) && oi.length > 0;\n'
    '    updateHeader();\n'
    '    els.loading.classList.add("hidden");\n'
    '    if(candleMode === "footprint") fetchFootprintData();\n'
    '    drawSoon();',
    'loadAll: refresh footprint cache after successful data load'
)

# ── C: server.js tfToMs — add seconds support ────────────────────────────────
srv = rep(srv,
    "function tfToMs(tf) {\n"
    "  const m = String(tf).match(/^(\\d+)([mhd])$/);\n"
    "  if (!m) return 300000;\n"
    "  const unit = { m: 60000, h: 3600000, d: 86400000 }[m[2]] || 60000;\n"
    "  return parseInt(m[1]) * unit;\n"
    "}",

    "function tfToMs(tf) {\n"
    "  const m = String(tf).match(/^(\\d+)([smhd])$/);\n"
    "  if (!m) return 300000;\n"
    "  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]] || 60000;\n"
    "  return parseInt(m[1]) * unit;\n"
    "}",
    'server.js tfToMs: add seconds unit (for /api/footprint with 15s/30s)'
)

# ── Version bump 0.577 → 0.578 ──────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.577";',
    'const DVL_APP_VERSION = "Beta 0.578";',
    'DVL_APP_VERSION 0.577→0.578'
)

# ── Result ────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  ', e)
    if len(errors) > 2:
        print('Aborting write.')
        sys.exit(1)
else:
    print('All checks passed.')

if fixes:
    print('Applied (%d):' % len(fixes))
    for f in fixes: print('  +', f)

open(HTML, 'w', encoding='utf-8').write(html)
open(SRV,  'w', encoding='utf-8').write(srv)

print()
print('Written:', HTML)
print('Written:', SRV)
print('Lines HTML:', html.count('\n') + 1)
