# patch_586.py — Beta 0.586
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.585)
#
# FIX: OI e Long/Short Ratio mostram pouco historico (500 pontos max da API).
#
# ROOT CAUSE:
#   Binance openInterestHist e globalLongShortAccountRatio tem limit=500 max.
#   Para 5m: 500 × 5min = ~41h. Para 1h: 500h = ~20 dias.
#   Quando o usuario da scroll para a esquerda no grafico, os osciladores
#   ficam em branco porque nao ha dados mais antigos.
#
# FIX:
#   Paginar 3 requests paralelos (limit=500 cada, endTime escalonado) e
#   fazer merge/dedup ordenado por timestamp. Resultado: 1500 pontos de
#   historico (~125h em 5m, ~62 dias em 1h, ~6 anos em 1d).
#   Feito nos 3 lugares que buscam dados:
#     1. loadAll() — carga inicial
#     2. OI oscillator ensureData()
#     3. LS oscillator ensureData()
#   Adiciona periodToMs(p) como helper global.
#
# VERSION: 0.585 → 0.586

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

# ── 1. Add periodToMs helper right after intervalToPeriod ─────────────────────
html = rep(html,
    'function intervalToPeriod(iv){\n'
    '  if(iv === "1m" || iv === "2m" || iv === "3m" || iv === "4m" || iv === "5m" || iv === "6m" || iv === "7m" || iv === "8m" || iv === "10m" || iv === "12m") return "5m";\n'
    '  if(iv === "15m" || iv === "20m") return "15m";\n'
    '  if(iv === "30m" || iv === "45m") return "30m";\n'
    '  if(iv === "1h" || iv === "2h" || iv === "3h" || iv === "4h" || iv === "6h" || iv === "8h" || iv === "12h") return isNativeTimeframe(iv) ? iv : "1h";\n'
    '  if(iv === "1d" || iv === "2d" || iv === "3d" || iv === "1w") return "1d";\n'
    '  return "5m";\n'
    '}',

    'function intervalToPeriod(iv){\n'
    '  if(iv === "1m" || iv === "2m" || iv === "3m" || iv === "4m" || iv === "5m" || iv === "6m" || iv === "7m" || iv === "8m" || iv === "10m" || iv === "12m") return "5m";\n'
    '  if(iv === "15m" || iv === "20m") return "15m";\n'
    '  if(iv === "30m" || iv === "45m") return "30m";\n'
    '  if(iv === "1h" || iv === "2h" || iv === "3h" || iv === "4h" || iv === "6h" || iv === "8h" || iv === "12h") return isNativeTimeframe(iv) ? iv : "1h";\n'
    '  if(iv === "1d" || iv === "2d" || iv === "3d" || iv === "1w") return "1d";\n'
    '  return "5m";\n'
    '}\n'
    'function periodToMs(p){\n'
    '  const m={"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000};\n'
    '  return m[p]||300000;\n'
    '}',

    'add periodToMs helper'
)

# ── 2. loadAll: 3-page parallel fetch for OI and LS ───────────────────────────
html = rep(html,
    '    const [k, t, oi, ls] = await Promise.all([\n'
    '      fetchKlinesSmart(symbol, interval, historyLimitForInterval(interval)),\n'
    '      jget(`${BINANCE}/fapi/v1/ticker/24hr?symbol=${symbol}`),\n'
    '      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500`),\n'
    '      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500`)\n'
    '    ]);\n'
    '    klines = k.map(x => ({\n'
    '      time:x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4], volume:+x[5], quoteVolume:+x[7]\n'
    '    }));\n'
    '    ticker = t;\n'
    '    assetTickerMap[symbol] = t;\n'
    '    refreshAssetTickers(true);\n'
    '    oiHist = Array.isArray(oi) ? oi.map(x => ({ time:+x.timestamp, value:+x.sumOpenInterestValue, qty:+x.sumOpenInterest })) : [];\n'
    '    lsHist = Array.isArray(ls) ? ls.map(x => ({ time:+x.timestamp, ratio:+x.longShortRatio, long:+x.longAccount, short:+x.shortAccount })) : [];\n'
    '    derivativesDataReal = Array.isArray(oi) && oi.length > 0;',

    '    const _pMs = periodToMs(period), _now = Date.now();\n'
    '    const [k, t, oi0, oi1, oi2, ls0, ls1, ls2] = await Promise.all([\n'
    '      fetchKlinesSmart(symbol, interval, historyLimitForInterval(interval)),\n'
    '      jget(`${BINANCE}/fapi/v1/ticker/24hr?symbol=${symbol}`),\n'
    '      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500`),\n'
    '      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-500*_pMs}`).catch(()=>[]),\n'
    '      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-1000*_pMs}`).catch(()=>[]),\n'
    '      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500`),\n'
    '      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-500*_pMs}`).catch(()=>[]),\n'
    '      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-1000*_pMs}`).catch(()=>[])\n'
    '    ]);\n'
    '    klines = k.map(x => ({\n'
    '      time:x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4], volume:+x[5], quoteVolume:+x[7]\n'
    '    }));\n'
    '    ticker = t;\n'
    '    assetTickerMap[symbol] = t;\n'
    '    refreshAssetTickers(true);\n'
    '    { const _s=new Set(); oiHist=[oi0,oi1,oi2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;}).map(x=>({time:+x.timestamp,value:+x.sumOpenInterestValue,qty:+x.sumOpenInterest})); }\n'
    '    { const _s=new Set(); lsHist=[ls0,ls1,ls2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;}).map(x=>({time:+x.timestamp,ratio:+x.longShortRatio,long:+x.longAccount,short:+x.shortAccount})); }\n'
    '    derivativesDataReal = oiHist.length > 0;',

    'loadAll OI+LS 3-page pagination'
)

# ── 3. OI oscillator ensureData: 3-page fetch ─────────────────────────────────
html = rep(html,
    '      const url = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data") +\n'
    '        "/openInterestHist?symbol=" + encodeURIComponent(sym()) +\n'
    '        "&period=" + encodeURIComponent(p) +\n'
    '        "&limit=500";\n'
    '\n'
    '      const arr = arrFromResp(await fetchJson(url));\n'
    '      const data = parseOI(arr, false);',

    '      const _oiBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");\n'
    '      const _oiPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;\n'
    '      const _oiNow = Date.now();\n'
    '      const _oiUrl = (n) => _oiBase + "/openInterestHist?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_oiNow-n*500*_oiPMs):"");\n'
    '      const [_oiR0,_oiR1,_oiR2] = await Promise.all([fetchJson(_oiUrl(0)),fetchJson(_oiUrl(1)).catch(()=>[]),fetchJson(_oiUrl(2)).catch(()=>[])]);\n'
    '      const _oiSeen=new Set();\n'
    '      const arr = [arrFromResp(_oiR0),arrFromResp(_oiR1),arrFromResp(_oiR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_oiSeen.has(k))return false;_oiSeen.add(k);return true;});\n'
    '      const data = parseOI(arr, false);',

    'OI oscillator ensureData 3-page'
)

# ── 4. LS oscillator ensureData: 3-page fetch ─────────────────────────────────
html = rep(html,
    '      const endpoint = mode === "top" ? "topLongShortAccountRatio" : "globalLongShortAccountRatio";\n'
    '      const url = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data") +\n'
    '        "/" + endpoint +\n'
    '        "?symbol=" + encodeURIComponent(sym()) +\n'
    '        "&period=" + encodeURIComponent(p) +\n'
    '        "&limit=500";\n'
    '\n'
    '      const arr = arrFromResp(await fetchJson(url));\n'
    '      const data = parseLS(arr);',

    '      const _lsEndpoint = mode === "top" ? "topLongShortAccountRatio" : "globalLongShortAccountRatio";\n'
    '      const _lsBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");\n'
    '      const _lsPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;\n'
    '      const _lsNow = Date.now();\n'
    '      const _lsUrl = (n) => _lsBase + "/" + _lsEndpoint + "?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_lsNow-n*500*_lsPMs):"");\n'
    '      const [_lsR0,_lsR1,_lsR2] = await Promise.all([fetchJson(_lsUrl(0)),fetchJson(_lsUrl(1)).catch(()=>[]),fetchJson(_lsUrl(2)).catch(()=>[])]);\n'
    '      const _lsSeen=new Set();\n'
    '      const arr = [arrFromResp(_lsR0),arrFromResp(_lsR1),arrFromResp(_lsR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_lsSeen.has(k))return false;_lsSeen.add(k);return true;});\n'
    '      const data = parseLS(arr);',

    'LS oscillator ensureData 3-page'
)

# ── 5. Version bump 0.585 → 0.586 ─────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.585";',
    'const DVL_APP_VERSION = "Beta 0.586";',
    'DVL_APP_VERSION 0.585→0.586'
)

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Fix critico: setupChartInteractions() nunca era chamada (a chamada sumiu na refatoracao do 0.583). Grafico nao respondia a nenhum toque." },',
    '{ version: DVL_APP_VERSION, note: "OI e Long/Short Ratio: paginacao 3x500=1500 pontos em requests paralelos com endTime escalonado. Historico ~3x maior em todos os timeframes." },\n'
    '  { version: "Beta 0.585", note: "Fix critico: setupChartInteractions() nunca era chamada (a chamada sumiu na refatoracao do 0.583). Grafico nao respondia a nenhum toque." },',
    'DVL_CHANGELOG 0.586'
)

html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.585</div>',
    '<div class="beta" id="versionBadge">BETA 0.586</div>',
    'versionBadge 0.585→0.586'
)

html = rep(html,
    '<title>DVL Binance Live — Beta 0.585</title>',
    '<title>DVL Binance Live — Beta 0.586</title>',
    'title 0.585→0.586'
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

total_lines = html.count('\n') + 1
print()
print('Written to', DST)
print('Total lines after patch: %d' % total_lines)
