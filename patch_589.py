# patch_589.py — Beta 0.589
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.588)
#
# REVERT: OI Bybit merge (bugado — unidade openInterest da Bybit ambigua,
#   provavelmente ja em USDT para contratos lineares, mas eu multiplicava
#   pelo preco → valores explodiram e bugaram as colunas).
#   OI volta a ser so Binance ate unidade ser confirmada.
#   Spike zones fix do 0.588 mantido.
#
# VERSION: 0.588 → 0.589

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

# ── 1. loadAll: remove Bybit OI fetches, restore simple Binance OI block ──────
html = rep(html,
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

    'loadAll: revert Bybit OI (restore Binance-only)'
)

# ── 2. OI oscillator ensureData: revert Bybit OI, restore Binance-only ────────
html = rep(html,
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

    'OI oscillator: revert Bybit OI (restore Binance-only)'
)

# ── Version bump 0.588 → 0.589 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.588";',
    'const DVL_APP_VERSION = "Beta 0.589";',
    'DVL_APP_VERSION 0.588→0.589'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "OI agregado Binance+Bybit: openInterest Bybit (BTC) convertido para USD via preco do kline e somado ao sumOpenInterestValue da Binance. Spike Zones: warmup reduzido para atrLen(14) — com volMA=1000 o indicador nao exigia mais 1000 candles de warmup." },',
    '{ version: DVL_APP_VERSION, note: "Revert OI Bybit (unidade openInterest ambigua causou bug nas colunas). OI volta a Binance-only. Spike Zones warmup fix mantido." },\n'
    '  { version: "Beta 0.588", note: "OI Bybit revertido. Spike Zones: warm=atrLen(14) em vez de max(volLen,atrLen)." },',
    'DVL_CHANGELOG 0.589'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.588</div>',
    '<div class="beta" id="versionBadge">BETA 0.589</div>',
    'versionBadge 0.588→0.589'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.588</title>',
    '<title>DVL Binance Live — Beta 0.589</title>',
    'title 0.588→0.589'
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
