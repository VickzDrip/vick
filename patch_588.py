# patch_588.py — Beta 0.588
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.587)
#
# FIX 1: OI agregado Binance + Bybit
#   Bybit open-interest usa /v5/market/open-interest (intervalTime=).
#   Retorna openInterest em BTC (contratos); convertido para USD usando
#   o close price do kline correspondente. Somado ao sumOpenInterestValue
#   da Binance. Label CACHE.src atualizado para "BINANCE+BYBIT".
#
# FIX 2: Spike Zones — warmup desnecessariamente longo
#   warm = Math.max(volLen, atrLen) → com volMA=1000, warmup=1000 candles.
#   volMA já lida com warmup parcial internamente (divide por min(i+1,volLen)).
#   Fix: warm = atrLen (14). Zonas detectadas a partir do candle 14,
#   independente do volMA configurado.
#
# VERSION: 0.587 → 0.588

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

# ── FIX 1a: loadAll — add Bybit OI fetches + merge ───────────────────────────
html = rep(html,
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
    '    { const _s=new Set(); oiHist=[oi0,oi1,oi2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;}).map(x=>({time:+x.timestamp,value:+x.sumOpenInterestValue,qty:+x.sumOpenInterest})); }',

    '    const _bbP = periodToBybitPeriod(period);\n'
    '    const _bbUrl = (n) => "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=" + encodeURIComponent(symbol) + "&period=" + _bbP + "&limit=200" + (n>0?"&endTime="+(_now-n*200*_pMs):"");\n'
    '    const _bbOIUrl = (n) => "https://api.bybit.com/v5/market/open-interest?category=linear&symbol=" + encodeURIComponent(symbol) + "&intervalTime=" + _bbP + "&limit=200" + (n>0?"&endTime="+(_now-n*200*_pMs):"");\n'
    '    const [k, t, oi0, oi1, oi2, ls0, ls1, ls2, bb0, bb1, bb2, boi0, boi1, boi2] = await Promise.all([\n'
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
    '      jget(_bbUrl(2)).catch(()=>null),\n'
    '      jget(_bbOIUrl(0)).catch(()=>null),\n'
    '      jget(_bbOIUrl(1)).catch(()=>null),\n'
    '      jget(_bbOIUrl(2)).catch(()=>null)\n'
    '    ]);\n'
    '    klines = k.map(x => ({\n'
    '      time:x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4], volume:+x[5], quoteVolume:+x[7]\n'
    '    }));\n'
    '    ticker = t;\n'
    '    assetTickerMap[symbol] = t;\n'
    '    refreshAssetTickers(true);\n'
    '    {\n'
    '      const _s=new Set();\n'
    '      const _bnOI=[oi0,oi1,oi2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;});\n'
    '      const _s2=new Set();\n'
    '      const _bboiList=[boi0,boi1,boi2].flatMap(r=>(Array.isArray(r?.result?.list)?r.result.list:[])).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s2.has(k))return false;_s2.add(k);return true;});\n'
    '      const _bboiMap=new Map(_bboiList.map(x=>[+x.timestamp,x]));\n'
    '      const _pm=new Map(klines.map(k=>[k.time,k.close]));\n'
    '      oiHist=_bnOI.map(x=>{const bb=_bboiMap.get(+x.timestamp);if(!bb)return{time:+x.timestamp,value:+x.sumOpenInterestValue,qty:+x.sumOpenInterest};const pr=_pm.get(+x.timestamp)||0;const bbUSD=pr?(+bb.openInterest*pr):0;return{time:+x.timestamp,value:+x.sumOpenInterestValue+bbUSD,qty:+x.sumOpenInterest+(+bb.openInterest)};});\n'
    '    }',

    'loadAll OI Binance+Bybit merge'
)

# ── FIX 1b: OI oscillator ensureData — add Bybit OI + merge ──────────────────
html = rep(html,
    '    try{\n'
    '      const _oiBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");\n'
    '      const _oiPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;\n'
    '      const _oiNow = Date.now();\n'
    '      const _oiUrl = (n) => _oiBase + "/openInterestHist?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_oiNow-n*500*_oiPMs):"");\n'
    '      const [_oiR0,_oiR1,_oiR2] = await Promise.all([fetchJson(_oiUrl(0)),fetchJson(_oiUrl(1)).catch(()=>[]),fetchJson(_oiUrl(2)).catch(()=>[])]);\n'
    '      const _oiSeen=new Set();\n'
    '      const arr = [arrFromResp(_oiR0),arrFromResp(_oiR1),arrFromResp(_oiR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_oiSeen.has(k))return false;_oiSeen.add(k);return true;});\n'
    '      const data = parseOI(arr, false);\n'
    '\n'
    '      if(!data.length) throw new Error("NO DATA");\n'
    '\n'
    '      CACHE.key = key;\n'
    '      CACHE.data = data;\n'
    '      CACHE.ts = Date.now();\n'
    '      CACHE.src = "BINANCE";\n'
    '      CACHE.err = "";\n'
    '\n'
    '      try{\n'
    '        oiHist = data.map(d => ({ time:d.t, value:d.close, qty:d.qty }));\n'
    '        derivativesDataReal = true;\n'
    '      }catch(_){}',

    '    try{\n'
    '      const _oiBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");\n'
    '      const _oiPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;\n'
    '      const _oiNow = Date.now();\n'
    '      const _oiUrl = (n) => _oiBase + "/openInterestHist?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_oiNow-n*500*_oiPMs):"");\n'
    '      const _bbOIP = (typeof periodToBybitPeriod==="function") ? periodToBybitPeriod(p) : "5min";\n'
    '      const _bbOIU = (n) => "https://api.bybit.com/v5/market/open-interest?category=linear&symbol=" + encodeURIComponent(sym()) + "&intervalTime=" + _bbOIP + "&limit=200" + (n>0?"&endTime="+(_oiNow-n*200*_oiPMs):"");\n'
    '      const [_oiR0,_oiR1,_oiR2,_bbOR0,_bbOR1,_bbOR2] = await Promise.all([\n'
    '        fetchJson(_oiUrl(0)),fetchJson(_oiUrl(1)).catch(()=>[]),fetchJson(_oiUrl(2)).catch(()=>[]),\n'
    '        fetchJson(_bbOIU(0)).catch(()=>null),fetchJson(_bbOIU(1)).catch(()=>null),fetchJson(_bbOIU(2)).catch(()=>null)\n'
    '      ]);\n'
    '      const _oiSeen=new Set();\n'
    '      const arr = [arrFromResp(_oiR0),arrFromResp(_oiR1),arrFromResp(_oiR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_oiSeen.has(k))return false;_oiSeen.add(k);return true;});\n'
    '      const data = parseOI(arr, false);\n'
    '      const _bbOISeen=new Set();\n'
    '      const _bbOIList=[_bbOR0,_bbOR1,_bbOR2].flatMap(r=>(Array.isArray(r?.result?.list)?r.result.list:[])).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_bbOISeen.has(k))return false;_bbOISeen.add(k);return true;});\n'
    '      const _bbOIMap=new Map(_bbOIList.map(x=>[+x.timestamp,x]));\n'
    '      const _kls=typeof klines!=="undefined"?klines:[];\n'
    '      const _pm=new Map(_kls.map(k=>[k.time,k.close]));\n'
    '      let _bbOK=false;\n'
    '      const dataFinal=data.map(d=>{const bb=_bbOIMap.get(d.t);if(!bb)return d;const pr=_pm.get(d.t)||0;if(!pr)return d;_bbOK=true;return{...d,close:d.close+(+bb.openInterest*pr),qty:d.qty+(+bb.openInterest)};});\n'
    '\n'
    '      if(!dataFinal.length) throw new Error("NO DATA");\n'
    '\n'
    '      CACHE.key = key;\n'
    '      CACHE.data = dataFinal;\n'
    '      CACHE.ts = Date.now();\n'
    '      CACHE.src = _bbOK ? "BINANCE+BYBIT" : "BINANCE";\n'
    '      CACHE.err = "";\n'
    '\n'
    '      try{\n'
    '        oiHist = dataFinal.map(d => ({ time:d.t, value:d.close, qty:d.qty }));\n'
    '        derivativesDataReal = true;\n'
    '      }catch(_){}',

    'OI oscillator ensureData Binance+Bybit merge'
)

# ── FIX 2: Spike Zones — warmup = atrLen only ────────────────────────────────
html = rep(html,
    '    const out = [];\n'
    '    const warm = Math.max(volLen, atrLen);\n'
    '    for(let i=warm;i<n;i++){',

    '    const out = [];\n'
    '    const warm = atrLen;\n'
    '    for(let i=warm;i<n;i++){',

    'spike zones warm = atrLen (not max(volLen,atrLen))'
)

# ── Version bump 0.587 → 0.588 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.587";',
    'const DVL_APP_VERSION = "Beta 0.588";',
    'DVL_APP_VERSION 0.587→0.588'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Long/Short Ratio agregado Binance + Bybit: merge por timestamp com media 50/50 do longPct. Bybit so no modo global. Fallback automatico para Binance se Bybit falhar." },',
    '{ version: DVL_APP_VERSION, note: "OI agregado Binance+Bybit: openInterest Bybit (BTC) convertido para USD via preco do kline e somado ao sumOpenInterestValue da Binance. Spike Zones: warmup reduzido para atrLen(14) — com volMA=1000 o indicador nao exigia mais 1000 candles de warmup." },\n'
    '  { version: "Beta 0.587", note: "Long/Short Ratio agregado Binance + Bybit: merge por timestamp 50/50. Bybit so no modo global." },',
    'DVL_CHANGELOG 0.588'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.587</div>',
    '<div class="beta" id="versionBadge">BETA 0.588</div>',
    'versionBadge 0.587→0.588'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.587</title>',
    '<title>DVL Binance Live — Beta 0.588</title>',
    'title 0.587→0.588'
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
