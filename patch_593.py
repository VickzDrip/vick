# patch_593.py — Beta 0.593
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.592)
#
# FEATURE: OI — Coins/USD toggle + real wicks via sub-period data
#   1. parseOI: detect state.unit, build OHLC in coins or USD, store .usd always
#   2. oiHist: always use USD value (backward compat)
#   3. ensureData: fetch sub-period OI in parallel, derive real high/low wicks
#   4. fmtCoins + fmtScale: coins format (K/M without $)
#   5. draw() right label: show "BTC" when in coins mode
#   6. renderPanel: add Measure select (USD / Coins)
#
# VERSION: 0.592 → 0.593

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

# ── 1. parseOI: unit-aware OHLC + store .usd ─────────────────────────────────
html = rep(html,
    '  function parseOI(arr, isCoinGlass){\n'
    '    const parsed = arr.map((o, idx) => {\n'
    '      const t = tsOf(o);\n'
    '\n'
    '      let open = nval(o, ["open","o",1]);\n'
    '      let high = nval(o, ["high","h",2]);\n'
    '      let low = nval(o, ["low","l",3]);\n'
    '      let close = nval(o, ["close","c","value","sumOpenInterestValue",4]);\n'
    '      let qty = nval(o, ["sumOpenInterest","openInterest","qty","coin",5]);\n'
    '\n'
    '      if(!isCoinGlass){\n'
    '        close = nval(o, ["sumOpenInterestValue","value","close","c"]);\n'
    '        qty = nval(o, ["sumOpenInterest","openInterest","qty"]);\n'
    '        open = idx && arr[idx-1] ? nval(arr[idx-1], ["sumOpenInterestValue","value","close","c"]) : close;\n'
    '        high = Math.max(open, close);\n'
    '        low = Math.min(open, close);\n'
    '      }\n'
    '\n'
    '      if(!open) open = idx && arr[idx-1] ? nval(arr[idx-1], isCoinGlass ? ["close","c","value",4] : ["sumOpenInterestValue","value","close","c"]) : close;\n'
    '      if(!high) high = Math.max(open, close);\n'
    '      if(!low) low = Math.min(open, close);\n'
    '\n'
    '      return { t, open, high, low, close, qty };\n'
    '    }).filter(d => d.t && Number.isFinite(d.close) && d.close > 0)\n'
    '      .sort((a,b) => a.t - b.t);\n'
    '\n'
    '    return parsed;\n'
    '  }',

    '  function parseOI(arr, isCoinGlass){\n'
    '    const useCoins = state.unit === "coins";\n'
    '    const parsed = arr.map((o, idx) => {\n'
    '      const t = tsOf(o);\n'
    '\n'
    '      let open = nval(o, ["open","o",1]);\n'
    '      let high = nval(o, ["high","h",2]);\n'
    '      let low = nval(o, ["low","l",3]);\n'
    '      let close = nval(o, ["close","c","value","sumOpenInterestValue",4]);\n'
    '      let qty = nval(o, ["sumOpenInterest","openInterest","qty","coin",5]);\n'
    '      let usd = 0;\n'
    '\n'
    '      if(!isCoinGlass){\n'
    '        const usdV = nval(o, ["sumOpenInterestValue","value","close","c"]);\n'
    '        const coinV = nval(o, ["sumOpenInterest","openInterest","qty"]);\n'
    '        const prev = idx && arr[idx-1] ? arr[idx-1] : null;\n'
    '        usd = usdV;\n'
    '        qty = coinV;\n'
    '        close = useCoins ? coinV : usdV;\n'
    '        open = prev ? (useCoins ? nval(prev,["sumOpenInterest","openInterest","qty"]) : nval(prev,["sumOpenInterestValue","value","close","c"])) : close;\n'
    '        high = Math.max(open, close);\n'
    '        low = Math.min(open, close);\n'
    '      }\n'
    '\n'
    '      if(!open) open = idx && arr[idx-1] ? nval(arr[idx-1], isCoinGlass ? ["close","c","value",4] : ["sumOpenInterestValue","value","close","c"]) : close;\n'
    '      if(!high) high = Math.max(open, close);\n'
    '      if(!low) low = Math.min(open, close);\n'
    '\n'
    '      return { t, open, high, low, close, qty, usd };\n'
    '    }).filter(d => d.t && Number.isFinite(d.close) && d.close > 0)\n'
    '      .sort((a,b) => a.t - b.t);\n'
    '\n'
    '    return parsed;\n'
    '  }',

    'OI parseOI unit-aware + usd field'
)

# ── 2. oiHist update: always USD value ───────────────────────────────────────
html = rep(html,
    '        oiHist = data.map(d => ({ time:d.t, value:d.close, qty:d.qty }));',
    '        oiHist = data.map(d => ({ time:d.t, value:d.usd||d.close, qty:d.qty }));',
    'OI oiHist always USD'
)

# ── 3. ensureData: sub-period wicks ──────────────────────────────────────────
html = rep(html,
    '      const data = parseOI(arr, false);\n'
    '\n'
    '      if(!data.length) throw new Error("NO DATA");\n'
    '\n'
    '      CACHE.key = key;\n'
    '      CACHE.data = data;\n'
    '      CACHE.ts = Date.now();\n'
    '      CACHE.src = "BINANCE";',

    '      const data = parseOI(arr, false);\n'
    '\n'
    '      if(!data.length) throw new Error("NO DATA");\n'
    '\n'
    '      // Sub-period wicks: fetch finer-grained OI to derive real intra-candle high/low\n'
    '      const _subPMap={"15m":"5m","30m":"5m","1h":"15m","2h":"30m","4h":"1h","6h":"1h","12h":"4h","1d":"4h"};\n'
    '      const _subP=_subPMap[p];\n'
    '      if(_subP){\n'
    '        try{\n'
    '          const _subUrl2=(n)=>_oiBase+"/openInterestHist?symbol="+encodeURIComponent(sym())+"&period="+encodeURIComponent(_subP)+"&limit=500"+(n>0?"&endTime="+(_oiNow-n*500*_oiPMs):"");\n'
    '          const [_s0,_s1,_s2]=await Promise.all([fetchJson(_subUrl2(0)).catch(()=>[]),fetchJson(_subUrl2(1)).catch(()=>[]),fetchJson(_subUrl2(2)).catch(()=>[])]);\n'
    '          const _subSeen2=new Set();\n'
    '          const _subArr=[arrFromResp(_s0),arrFromResp(_s1),arrFromResp(_s2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_subSeen2.has(k))return false;_subSeen2.add(k);return true;});\n'
    '          const _useC=state.unit==="coins";\n'
    '          const _subByMain=new Map();\n'
    '          for(const x of _subArr){\n'
    '            const tSub=+x.timestamp;\n'
    '            const mainT=Math.ceil(tSub/_oiPMs)*_oiPMs;\n'
    '            if(!_subByMain.has(mainT))_subByMain.set(mainT,[]);\n'
    '            _subByMain.get(mainT).push(_useC?+x.sumOpenInterest:+x.sumOpenInterestValue);\n'
    '          }\n'
    '          for(const d of data){\n'
    '            const sv=_subByMain.get(d.t);\n'
    '            if(sv&&sv.length>=2){\n'
    '              const all=[d.open,d.close,...sv];\n'
    '              d.high=Math.max(...all);\n'
    '              d.low=Math.min(...all);\n'
    '            }\n'
    '          }\n'
    '        }catch(_){}\n'
    '      }\n'
    '\n'
    '      CACHE.key = key;\n'
    '      CACHE.data = data;\n'
    '      CACHE.ts = Date.now();\n'
    '      CACHE.src = "BINANCE";',

    'OI ensureData sub-period wicks'
)

# ── 4. fmtCoins + fmtScale update ────────────────────────────────────────────
html = rep(html,
    '  function fmtScale(v){\n'
    '    return fmtMoney(v);\n'
    '  }',

    '  function fmtCoins(v){\n'
    '    const n=Number(v);\n'
    '    if(!Number.isFinite(n))return"--";\n'
    '    const a=Math.abs(n);\n'
    '    if(a>=1e6)return(n/1e6).toFixed(2)+"M";\n'
    '    if(a>=1e3)return(n/1e3).toFixed(1)+"K";\n'
    '    return n.toFixed(2);\n'
    '  }\n'
    '  function fmtScale(v){\n'
    '    return state.unit==="coins" ? fmtCoins(v) : fmtMoney(v);\n'
    '  }',

    'OI fmtCoins + fmtScale unit-aware'
)

# ── 5. draw() right label: unit-aware format ──────────────────────────────────
html = rep(html,
    '    const right = last ? (fmtMoney(last.close) + " " + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%") : (CACHE.fetching ? "LOADING" : "NO DATA");',
    '    const right = last ? ((state.unit==="coins"?fmtCoins(last.close)+" BTC":fmtMoney(last.close)) + " " + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%") : (CACHE.fetching ? "LOADING" : "NO DATA");',
    'OI draw right label unit-aware'
)

# ── 6. renderPanel: add Measure (USD/Coins) select ───────────────────────────
html = rep(html,
    '    body.innerHTML = `\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>General</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlOIOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>\n'
    '          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlOIMALenPanel" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.maLen||20}"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '    `;\n'
    '    const onCb = panel.querySelector("#dvlOIOn");\n'
    '    if(onCb) onCb.addEventListener("change", () => { state.on = onCb.checked; save(); if(state.on) ensureData(true); });\n'
    '    const maInp = panel.querySelector("#dvlOIMALenPanel");\n'
    '    if(maInp) maInp.addEventListener("change", () => { const v=Math.max(2,Math.min(500,Math.round(+maInp.value)||20)); maInp.value=v; state.maLen=v; save(); });\n'
    '  }',

    '    body.innerHTML = `\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>General</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlOIOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>\n'
    '          <div class="dvl-vt-field"><label>Measure</label><select id="dvlOIUnit" class="dvl-vt-select"><option value="usd" ${(state.unit||"usd")==="usd"?"selected":""}>USD ($)</option><option value="coins" ${state.unit==="coins"?"selected":""}>Coins (BTC)</option></select></div>\n'
    '          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlOIMALenPanel" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.maLen||20}"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '    `;\n'
    '    const onCb = panel.querySelector("#dvlOIOn");\n'
    '    if(onCb) onCb.addEventListener("change", () => { state.on = onCb.checked; save(); if(state.on) ensureData(true); });\n'
    '    const unitEl = panel.querySelector("#dvlOIUnit");\n'
    '    if(unitEl) unitEl.addEventListener("change", () => { state.unit=unitEl.value; state.center=null; state.range=null; save(); ensureData(true); });\n'
    '    const maInp = panel.querySelector("#dvlOIMALenPanel");\n'
    '    if(maInp) maInp.addEventListener("change", () => { const v=Math.max(2,Math.min(500,Math.round(+maInp.value)||20)); maInp.value=v; state.maLen=v; save(); });\n'
    '  }',

    'OI renderPanel Measure select'
)

# ── Version bump 0.592 → 0.593 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.592";',
    'const DVL_APP_VERSION = "Beta 0.593";',
    'DVL_APP_VERSION 0.592→0.593'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "L/S: media movel (MA) laranja adicionada sobre a linha do ratio, periodo configuravel no painel. Default 14." },',
    '{ version: DVL_APP_VERSION, note: "OI: seletor Coins/USD no painel; pavios reais via dados sub-periodo (fmtCoins). L/S MA mantida." },\n'
    '  { version: "Beta 0.592", note: "L/S: MA laranja sobre ratio, periodo configuravel." },',
    'DVL_CHANGELOG 0.593'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.592</div>',
    '<div class="beta" id="versionBadge">BETA 0.593</div>',
    'versionBadge 0.592→0.593'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.592</title>',
    '<title>DVL Binance Live — Beta 0.593</title>',
    'title 0.592→0.593'
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
