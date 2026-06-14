# patch_587.py — Beta 0.587
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.586)
#
# FEATURE: Long/Short Ratio agregado Binance + Bybit
#
# Busca globalLongShortAccountRatio da Binance E account-ratio da Bybit
# em paralelo (3 paginas cada = 6 requests total), faz merge por timestamp:
#   - Se ambas tem dado no mesmo timestamp: media 50/50 do longPct
#   - Se so Binance tem (Bybit CORS falhou ou gap): usa Binance puro
# Resultado: linha unica que representa um agregado cross-exchange.
# Bybit so e incluido no modo "global" (nao "top", que nao tem equivalente).
#
# Adiciona periodToBybitPeriod(p) helper global.
#
# VERSION: 0.586 → 0.587

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

# ── 1. Add periodToBybitPeriod after periodToMs ───────────────────────────────
html = rep(html,
    'function periodToMs(p){\n'
    '  const m={"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000};\n'
    '  return m[p]||300000;\n'
    '}',

    'function periodToMs(p){\n'
    '  const m={"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000};\n'
    '  return m[p]||300000;\n'
    '}\n'
    'function periodToBybitPeriod(p){\n'
    '  const m={"5m":"5min","15m":"15min","30m":"30min","1h":"1h","2h":"4h","4h":"4h","6h":"4h","12h":"1d","1d":"1d"};\n'
    '  return m[p]||"5min";\n'
    '}',

    'add periodToBybitPeriod helper'
)

# ── 2. loadAll: add Bybit LS fetch + merge ────────────────────────────────────
html = rep(html,
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

    '    const _pMs = periodToMs(period), _now = Date.now();\n'
    '    const _bbP = periodToBybitPeriod(period);\n'
    '    const _bbUrl = (n) => "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=" + encodeURIComponent(symbol) + "&period=" + _bbP + "&limit=200" + (n>0?"&endTime="+(_now-n*200*_pMs):"");\n'
    '    const [k, t, oi0, oi1, oi2, ls0, ls1, ls2, bb0, bb1, bb2] = await Promise.all([\n'
    '      fetchKlinesSmart(symbol, interval, historyLimitForInterval(interval)),\n'
    '      jget(`${BINANCE}/fapi/v1/ticker/24hr?symbol=${symbol}`),\n'
    '      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500`),\n'
    '      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-500*_pMs}`).catch(()=>[]),\n'
    '      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-1000*_pMs}`).catch(()=>[]),\n'
    '      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500`),\n'
    '      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-500*_pMs}`).catch(()=>[]),\n'
    '      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-1000*_pMs}`).catch(()=>[]),\n'
    '      jget(_bbUrl(0)).catch(()=>null),\n'
    '      jget(_bbUrl(1)).catch(()=>null),\n'
    '      jget(_bbUrl(2)).catch(()=>null)\n'
    '    ]);\n'
    '    klines = k.map(x => ({\n'
    '      time:x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4], volume:+x[5], quoteVolume:+x[7]\n'
    '    }));\n'
    '    ticker = t;\n'
    '    assetTickerMap[symbol] = t;\n'
    '    refreshAssetTickers(true);\n'
    '    { const _s=new Set(); oiHist=[oi0,oi1,oi2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;}).map(x=>({time:+x.timestamp,value:+x.sumOpenInterestValue,qty:+x.sumOpenInterest})); }\n'
    '    {\n'
    '      const _s=new Set();\n'
    '      const _bnLS=[ls0,ls1,ls2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;});\n'
    '      const _s2=new Set();\n'
    '      const _bbList=[bb0,bb1,bb2].flatMap(r=>(Array.isArray(r?.result?.list)?r.result.list:[])).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s2.has(k))return false;_s2.add(k);return true;});\n'
    '      const _bbMap=new Map(_bbList.map(x=>[+x.timestamp,x]));\n'
    '      lsHist=_bnLS.map(x=>{\n'
    '        const bb=_bbMap.get(+x.timestamp);\n'
    '        if(!bb) return {time:+x.timestamp,ratio:+x.longShortRatio,long:+x.longAccount,short:+x.shortAccount};\n'
    '        const lng=(+x.longAccount+(+bb.buyRatio))/2, sht=1-lng;\n'
    '        return {time:+x.timestamp,ratio:lng/Math.max(sht,0.0001),long:lng,short:sht};\n'
    '      });\n'
    '    }\n'
    '    derivativesDataReal = oiHist.length > 0;',

    'loadAll LS Binance+Bybit merge'
)

# ── 3. LS oscillator ensureData: add Bybit + merge ────────────────────────────
html = rep(html,
    '      const _lsEndpoint = mode === "top" ? "topLongShortAccountRatio" : "globalLongShortAccountRatio";\n'
    '      const _lsBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");\n'
    '      const _lsPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;\n'
    '      const _lsNow = Date.now();\n'
    '      const _lsUrl = (n) => _lsBase + "/" + _lsEndpoint + "?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_lsNow-n*500*_lsPMs):"");\n'
    '      const [_lsR0,_lsR1,_lsR2] = await Promise.all([fetchJson(_lsUrl(0)),fetchJson(_lsUrl(1)).catch(()=>[]),fetchJson(_lsUrl(2)).catch(()=>[])]);\n'
    '      const _lsSeen=new Set();\n'
    '      const arr = [arrFromResp(_lsR0),arrFromResp(_lsR1),arrFromResp(_lsR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_lsSeen.has(k))return false;_lsSeen.add(k);return true;});\n'
    '      const data = parseLS(arr);',

    '      const _lsEndpoint = mode === "top" ? "topLongShortAccountRatio" : "globalLongShortAccountRatio";\n'
    '      const _lsBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");\n'
    '      const _lsPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;\n'
    '      const _lsNow = Date.now();\n'
    '      const _lsUrl = (n) => _lsBase + "/" + _lsEndpoint + "?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_lsNow-n*500*_lsPMs):"");\n'
    '      const _bbP3 = (typeof periodToBybitPeriod==="function") ? periodToBybitPeriod(p) : "5min";\n'
    '      const _bbUrl3 = (n) => "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=" + encodeURIComponent(sym()) + "&period=" + _bbP3 + "&limit=200" + (n>0?"&endTime="+(_lsNow-n*200*_lsPMs):"");\n'
    '      const _useBybit = mode !== "top";\n'
    '      const [_lsR0,_lsR1,_lsR2,_bbR0,_bbR1,_bbR2] = await Promise.all([\n'
    '        fetchJson(_lsUrl(0)),\n'
    '        fetchJson(_lsUrl(1)).catch(()=>[]),\n'
    '        fetchJson(_lsUrl(2)).catch(()=>[]),\n'
    '        _useBybit?fetchJson(_bbUrl3(0)).catch(()=>null):Promise.resolve(null),\n'
    '        _useBybit?fetchJson(_bbUrl3(1)).catch(()=>null):Promise.resolve(null),\n'
    '        _useBybit?fetchJson(_bbUrl3(2)).catch(()=>null):Promise.resolve(null)\n'
    '      ]);\n'
    '      const _lsSeen=new Set();\n'
    '      const _bnArr=[arrFromResp(_lsR0),arrFromResp(_lsR1),arrFromResp(_lsR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_lsSeen.has(k))return false;_lsSeen.add(k);return true;});\n'
    '      const _bbSeen=new Set();\n'
    '      const _bbList3=[_bbR0,_bbR1,_bbR2].flatMap(r=>(Array.isArray(r?.result?.list)?r.result.list:[])).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_bbSeen.has(k))return false;_bbSeen.add(k);return true;});\n'
    '      const _bbMap3=new Map(_bbList3.map(x=>[+x.timestamp,x]));\n'
    '      const arr=_bnArr.map(x=>{const bb=_bbMap3.get(+x.timestamp);if(!bb)return x;const lng=(+x.longAccount+(+bb.buyRatio))/2,sht=1-lng;return{...x,longAccount:lng,shortAccount:sht,longShortRatio:lng/Math.max(sht,0.0001)};});\n'
    '      const data = parseLS(arr);',

    'LS oscillator ensureData Binance+Bybit merge'
)

# ── 4. Version bump 0.586 → 0.587 ─────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.586";',
    'const DVL_APP_VERSION = "Beta 0.587";',
    'DVL_APP_VERSION 0.586→0.587'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "OI e Long/Short Ratio: paginacao 3x500=1500 pontos em requests paralelos com endTime escalonado. Historico ~3x maior em todos os timeframes." },',
    '{ version: DVL_APP_VERSION, note: "Long/Short Ratio agregado Binance + Bybit: merge por timestamp com media 50/50 do longPct. Bybit so no modo global. Fallback automatico para Binance se Bybit falhar." },\n'
    '  { version: "Beta 0.586", note: "OI e Long/Short Ratio: paginacao 3x500=1500 pontos em requests paralelos. Historico ~3x maior em todos os timeframes." },',
    'DVL_CHANGELOG 0.587'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.586</div>',
    '<div class="beta" id="versionBadge">BETA 0.587</div>',
    'versionBadge 0.586→0.587'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.586</title>',
    '<title>DVL Binance Live — Beta 0.587</title>',
    'title 0.586→0.587'
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
