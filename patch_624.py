# patch_624.py — Beta 0.624
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.623)
#
# FIX — OI oscillator: dados ao vivo em 1m via polling real-time
#
#   Binance openInterestHist e Bybit open-interest ambos têm mínimo de 5min.
#   Não existe API pública gratuita com dados históricos de OI em 1m.
#
#   SOLUÇÃO: poll de `fapi.binance.com/fapi/v1/openInterest` a cada 15s
#   (mesmo cadência do kline refresh). Cada snapshot acumula barras de 1m:
#     - Dentro do mesmo minuto: atualiza close/high/low
#     - Novo minuto: push de nova barra (open = close anterior)
#   Resulta em dados reais de 1m para o período desde que o usuário abriu
#   o chart. Histórico anterior continua em 5m (barras largas do 0.623).
#
#   bestOI(t): prioriza dado ao vivo (1m) sobre histórico (5m) para cada
#   candle. Bars e MA line usam bestOI em vez de valueAt(CACHE.data, ...).
#   MA é computado sobre série mesclada (histórico + live) para consistência.
#
# VERSION: 0.623 → 0.624

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

# ── 1. Adicionar _liveOI map após CACHE no OI IIFE ───────────────────────────
html = rep(html,
    '  const KEY = "dvl_cg_style_open_interest_v1";\n'
    '  const CACHE = { key:"", data:[], fetching:false, ts:0, src:"", err:"" };',

    '  const KEY = "dvl_cg_style_open_interest_v1";\n'
    '  const CACHE = { key:"", data:[], fetching:false, ts:0, src:"", err:"" };\n'
    '  let _liveOI  = new Map(); // 1m live OI: t(ms) → {t,openC,highC,lowC,closeC,openU,highU,lowU,closeU}\n'
    '  let _liveSym = \'\';',

    'OI IIFE: add _liveOI map'
)

# ── 2. Substituir valuesForVisible + adicionar bestOI + mergedSeries + _pollLiveOI ─
# Anchor: uses end of valuesForVisible + start of OI autoScale (unique: no comment block)
html = rep(html,
    '  function valuesForVisible(view){\n'
    '    const data = CACHE.data || [];\n'
    '    if(!data.length || !view.length) return [];\n'
    '    const out = [];\n'
    '    for(let i=0; i<view.length; i++){\n'
    '      const d = valueAt(data, Number(view[i].time));\n'
    '      if(d) out.push(d);\n'
    '    }\n'
    '    return out;\n'
    '  }\n'
    '\n'
    '  function autoScale(vals){\n'
    '    if(!vals.length) return {min:0,max:1,center:.5,range:1};',

    '  function valuesForVisible(view){\n'
    '    if(!view.length) return [];\n'
    '    const out = [];\n'
    '    for(let i=0; i<view.length; i++){\n'
    '      const d = bestOI(Number(view[i].time));\n'
    '      if(d) out.push(d);\n'
    '    }\n'
    '    return out;\n'
    '  }\n'
    '\n'
    '  // Retorna dado de OI para o instante t: prioriza live 1m, fallback histórico 5m\n'
    '  function bestOI(t){\n'
    '    const live = _liveOI.get(t);\n'
    '    if(live){\n'
    '      const useCoins = state.unit === \'coins\';\n'
    '      return {\n'
    '        t:      live.t,\n'
    '        open:   useCoins ? live.openC  : (live.openU  || live.openC),\n'
    '        high:   useCoins ? live.highC  : (live.highU  || live.highC),\n'
    '        low:    useCoins ? live.lowC   : (live.lowU   || live.lowC),\n'
    '        close:  useCoins ? live.closeC : (live.closeU || live.closeC),\n'
    '        qty:    live.closeC,\n'
    '        usd:    live.closeU\n'
    '      };\n'
    '    }\n'
    '    return valueAt(CACHE.data, t);\n'
    '  }\n'
    '\n'
    '  // Série mesclada (histórico 5m + live 1m) para cálculo de MA\n'
    '  function mergedSeries(){\n'
    '    const hist = CACHE.data || [];\n'
    '    const live = Array.from(_liveOI.values())\n'
    '      .sort((a,b)=>a.t-b.t)\n'
    '      .map(lv=>{\n'
    '        const useCoins = state.unit===\'coins\';\n'
    '        return { t:lv.t,\n'
    '          open:  useCoins?lv.openC :(lv.openU ||lv.openC),\n'
    '          high:  useCoins?lv.highC :(lv.highU ||lv.highC),\n'
    '          low:   useCoins?lv.lowC  :(lv.lowU  ||lv.lowC),\n'
    '          close: useCoins?lv.closeC:(lv.closeU||lv.closeC) };\n'
    '      });\n'
    '    if(!live.length) return hist;\n'
    '    const cutT = live[0].t;\n'
    '    return [...hist.filter(d=>d.t < cutT), ...live];\n'
    '  }\n'
    '\n'
    '  // Poll OI em tempo real → barras de 1m\n'
    '  async function _pollLiveOI(){\n'
    '    try{\n'
    '      const s = sym();\n'
    '      const r = await fetch(\'https://fapi.binance.com/fapi/v1/openInterest?symbol=\'+s);\n'
    '      const d = await r.json();\n'
    '      if(!d || !d.openInterest) return;\n'
    '      const coinQty = +d.openInterest;\n'
    '      if(!coinQty) return;\n'
    '      const price = (typeof ticker!==\'undefined\' && +ticker?.lastPrice)\n'
    '                 || (Array.isArray(klines)&&klines.length ? +klines.at(-1).close : 0);\n'
    '      const usdVal = price ? coinQty * price : 0;\n'
    '      if(s !== _liveSym){ _liveOI.clear(); _liveSym = s; }\n'
    '      const t = Math.floor(Date.now()/60000)*60000;\n'
    '      const prev = _liveOI.get(t);\n'
    '      if(prev){\n'
    '        prev.closeC = coinQty; prev.highC = Math.max(prev.highC,coinQty); prev.lowC = Math.min(prev.lowC,coinQty);\n'
    '        prev.closeU = usdVal;  prev.highU = Math.max(prev.highU,usdVal);  prev.lowU = Math.min(prev.lowU,usdVal);\n'
    '      } else {\n'
    '        let prevT = t-60000; let pBar = null;\n'
    '        while(!pBar && prevT > t-600000){ pBar=_liveOI.get(prevT); prevT-=60000; }\n'
    '        const oC = pBar?pBar.closeC:coinQty, oU = pBar?pBar.closeU:usdVal;\n'
    '        _liveOI.set(t,{ t,\n'
    '          openC:oC, highC:Math.max(oC,coinQty), lowC:Math.min(oC,coinQty), closeC:coinQty,\n'
    '          openU:oU, highU:Math.max(oU,usdVal),  lowU:Math.min(oU,usdVal),  closeU:usdVal });\n'
    '        if(_liveOI.size > 300) _liveOI.delete([..._liveOI.keys()][0]);\n'
    '      }\n'
    '      if(typeof drawSoon===\'function\') drawSoon();\n'
    '    }catch(_){}\n'
    '  }\n'
    '\n'
    '  function autoScale(vals){\n'
    '    if(!vals.length) return {min:0,max:1,center:.5,range:1};',

    'OI: bestOI + mergedSeries + _pollLiveOI'
)

# ── 3. Bars loop: valueAt(CACHE.data, ...) → bestOI(...) ──────────────────────
html = rep(html,
    '      // Uma barra por período OI: agrupa candles 1m com mesmo timestamp de OI\n'
    '      { let ii = 0;\n'
    '        while(ii < view.length){\n'
    '          const d = valueAt(CACHE.data, Number(view[ii].time));\n'
    '          if(!d){ ii++; continue; }\n'
    '          let endII = ii;\n'
    '          while(endII+1 < view.length){\n'
    '            const nd = valueAt(CACHE.data, Number(view[endII+1].time));',

    '      // Uma barra por período OI: agrupa candles com mesmo timestamp (1m se live, 5m se histórico)\n'
    '      { let ii = 0;\n'
    '        while(ii < view.length){\n'
    '          const d = bestOI(Number(view[ii].time));\n'
    '          if(!d){ ii++; continue; }\n'
    '          let endII = ii;\n'
    '          while(endII+1 < view.length){\n'
    '            const nd = bestOI(Number(view[endII+1].time));',

    'OI bars loop: use bestOI'
)

# ── 4. MA line: usar mergedSeries + bestOI ────────────────────────────────────
html = rep(html,
    '      // MA line\n'
    '      const _maLen = Math.max(2, Math.round(state.maLen) || 20);\n'
    '      if(_maLen && CACHE.data.length >= 2){\n'
    '        const _closes = CACHE.data.map(d=>d.close);\n'
    '        const _prefix = new Array(_closes.length+1).fill(0);\n'
    '        for(let i=0;i<_closes.length;i++) _prefix[i+1]=_prefix[i]+_closes[i];\n'
    '        const _idxMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));\n'
    '        ctx.beginPath();\n'
    '        ctx.strokeStyle = "#4db8ff";\n'
    '        ctx.lineWidth = 1.5;\n'
    '        ctx.setLineDash([]);\n'
    '        let _started = false, _lastMAT = null;\n'
    '        for(let i=0;i<view.length;i++){\n'
    '          const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '          if(!d || d.t === _lastMAT) continue;\n'
    '          _lastMAT = d.t;\n'
    '          const idx = _idxMap.get(d.t);\n'
    '          if(idx===undefined) continue;\n'
    '          const st2 = Math.max(0, idx-_maLen+1);\n'
    '          const avg = (_prefix[idx+1]-_prefix[st2])/(idx-st2+1);\n'
    '          const xx2 = xForIndex(i, m, win);\n'
    '          const yy2 = yMap(m, avg, sc);\n'
    '          if(!_started){ ctx.moveTo(xx2,yy2); _started=true; } else ctx.lineTo(xx2,yy2);\n'
    '        }\n'
    '        if(_started) ctx.stroke();\n'
    '      }',

    '      // MA line (usa série mesclada: histórico 5m + live 1m)\n'
    '      const _maLen = Math.max(2, Math.round(state.maLen) || 20);\n'
    '      const _maSrc = mergedSeries();\n'
    '      if(_maLen && _maSrc.length >= 2){\n'
    '        const _closes = _maSrc.map(d=>d.close);\n'
    '        const _prefix = new Array(_closes.length+1).fill(0);\n'
    '        for(let i=0;i<_closes.length;i++) _prefix[i+1]=_prefix[i]+_closes[i];\n'
    '        const _idxMap = new Map(_maSrc.map((d,i)=>[d.t,i]));\n'
    '        ctx.beginPath();\n'
    '        ctx.strokeStyle = "#4db8ff";\n'
    '        ctx.lineWidth = 1.5;\n'
    '        ctx.setLineDash([]);\n'
    '        let _started = false, _lastMAT = null;\n'
    '        for(let i=0;i<view.length;i++){\n'
    '          const d = bestOI(Number(view[i].time));\n'
    '          if(!d || d.t === _lastMAT) continue;\n'
    '          _lastMAT = d.t;\n'
    '          const idx = _idxMap.get(d.t);\n'
    '          if(idx===undefined) continue;\n'
    '          const st2 = Math.max(0, idx-_maLen+1);\n'
    '          const avg = (_prefix[idx+1]-_prefix[st2])/(idx-st2+1);\n'
    '          const xx2 = xForIndex(i, m, win);\n'
    '          const yy2 = yMap(m, avg, sc);\n'
    '          if(!_started){ ctx.moveTo(xx2,yy2); _started=true; } else ctx.lineTo(xx2,yy2);\n'
    '        }\n'
    '        if(_started) ctx.stroke();\n'
    '      }',

    'OI MA line: use mergedSeries + bestOI'
)

# ── 5. boot(): iniciar poll de OI ao vivo ─────────────────────────────────────
html = rep(html,
    '    ensureData(false);\n'
    '    setInterval(() => { if(state.on) ensureData(false); }, 45000);\n'
    '\n'
    '    if(typeof drawSoon === "function") drawSoon();\n'
    '  }\n'
    '\n'
    '  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n'
    '  else boot();\n'
    '\n'
    '  window.DVLOpenInterestOscillator = {',

    '    ensureData(false);\n'
    '    setInterval(() => { if(state.on) ensureData(false); }, 45000);\n'
    '    _pollLiveOI();\n'
    '    setInterval(_pollLiveOI, 15000);\n'
    '\n'
    '    if(typeof drawSoon === "function") drawSoon();\n'
    '  }\n'
    '\n'
    '  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n'
    '  else boot();\n'
    '\n'
    '  window.DVLOpenInterestOscillator = {',

    'OI boot(): start _pollLiveOI'
)

# ── 6. Version bump 0.623 → 0.624 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.623";',
    'const DVL_APP_VERSION = "Beta 0.624";',
    'DVL_APP_VERSION 0.623→0.624'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: OI oscillator — uma barra por período (sem repetição no 1m)." },',
    '{ version: DVL_APP_VERSION, note: "Feature: OI live poll 1m — dados reais de OI em 1m via polling real-time." },\n'
    '  { version: "Beta 0.623", note: "Bugfix: OI oscillator — uma barra por período (sem repetição no 1m)." },',
    'DVL_CHANGELOG 0.624'
)
html = rep(html,
    'BETA 0.623</div>',
    'BETA 0.624</div>',
    'versionBadge 0.623→0.624'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.623</title>',
    '<title>DVL Binance Live — Beta 0.624</title>',
    'title 0.623→0.624'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.623",',
    '  window.DVLVolumeProfile = { version:"0.624",',
    'DVLVolumeProfile version 0.624'
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
