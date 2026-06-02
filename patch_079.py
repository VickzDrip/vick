#!/usr/bin/env python3
"""Beta 0.079 — Live Stats: Trend Clarity + DVL Flow valores reais em tempo real"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.078', 'Beta 0.079')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.079\n  - hvnSigTF / stTf now control which TIMEFRAME',
    '''Beta 0.079
  - Live Stats: Trend Clarity e DVL Flow agora mostram valores reais do
    oscilador (última vela). Os draw functions armazenam o valor corrente
    em window.__dvlClarNow e window.__dvlFlowNow; _syncLiveStats lê e
    atualiza os elementos com cor por estado (bull/bear/neutral).
    Atualização automática a cada 800ms quando o painel está aberto.

Beta 0.078
  - hvnSigTF / stTf now control which TIMEFRAME''',
    1
)

# ── 3. Store Trend Clarity current value globally after computing lastVal ─────
OLD_CLAR_LASTVAL = (
    "  const lastVal=vals.length?vals[vals.length-1]:0;\n"
    "  const ci=(S._crossIdx!=null)?S._crossIdx:null;\n"
    "  const displayVal=(ci!=null&&vals[ci]!=null)?vals[ci]:lastVal;\n"
    "  const state=displayVal>=25?'bull':displayVal<=-25?'bear':'neutral';\n"
    "  _dvlDrawOscBase(ctx,L,'TREND CLARITY'"
)

NEW_CLAR_LASTVAL = (
    "  const lastVal=vals.length?vals[vals.length-1]:0;\n"
    "  window.__dvlClarNow=lastVal;\n"
    "  const ci=(S._crossIdx!=null)?S._crossIdx:null;\n"
    "  const displayVal=(ci!=null&&vals[ci]!=null)?vals[ci]:lastVal;\n"
    "  const state=displayVal>=25?'bull':displayVal<=-25?'bear':'neutral';\n"
    "  _dvlDrawOscBase(ctx,L,'TREND CLARITY'"
)

assert OLD_CLAR_LASTVAL in html, "Trend Clarity lastVal line not found"
html = html.replace(OLD_CLAR_LASTVAL, NEW_CLAR_LASTVAL, 1)

# ── 4. Store DVL Flow current value globally after computing lastVal ──────────
OLD_FLOW_LASTVAL = (
    "  const lastVal=osc[osc.length-1]||0;\n"
    "  const displayVal=(ci!=null&&osc[ci]!=null)?osc[ci]:lastVal;\n"
    "  const state=displayVal>=20?'bull':displayVal<=-20?'bear':'neutral';\n"
    "  _dvlDrawOscBase(ctx,L,'DVL FLOW'"
)

NEW_FLOW_LASTVAL = (
    "  const lastVal=osc[osc.length-1]||0;\n"
    "  window.__dvlFlowNow=lastVal;\n"
    "  const displayVal=(ci!=null&&osc[ci]!=null)?osc[ci]:lastVal;\n"
    "  const state=displayVal>=20?'bull':displayVal<=-20?'bear':'neutral';\n"
    "  _dvlDrawOscBase(ctx,L,'DVL FLOW'"
)

assert OLD_FLOW_LASTVAL in html, "DVL Flow lastVal line not found"
html = html.replace(OLD_FLOW_LASTVAL, NEW_FLOW_LASTVAL, 1)

# ── 5. Replace _syncLivePrice with full _syncLiveStats ────────────────────────
OLD_SYNC_PRICE = (
    "/* live price */\n"
    "function _syncLivePrice(){\n"
    "  try{\n"
    "    var el=_g('dvlSTLivePrice');if(!el)return;\n"
    "    var p=window.S&&window.S.candles&&window.S.candles.length?window.S.candles[window.S.candles.length-1].c:null;\n"
    "    if(p)el.textContent=p>999?p.toFixed(0):p.toFixed(2);\n"
    "  }catch(_){}\n"
    "}"
)

NEW_SYNC_PRICE = (
    "/* live stats: price + Trend Clarity + DVL Flow */\n"
    "function _syncLiveStats(){\n"
    "  try{\n"
    "    var prEl=_g('dvlSTLivePrice');\n"
    "    if(prEl){\n"
    "      var p=window.S&&window.S.candles&&window.S.candles.length?window.S.candles[window.S.candles.length-1].c:null;\n"
    "      if(p)prEl.textContent=p>999?p.toFixed(0):p.toFixed(2);\n"
    "    }\n"
    "    var clarEl=_g('dvlSTMktTrend');\n"
    "    if(clarEl){\n"
    "      var cv=window.__dvlClarNow;\n"
    "      if(cv!=null&&!isNaN(cv)){\n"
    "        clarEl.textContent=(cv>=0?'+':'')+Math.round(cv);\n"
    "        clarEl.className='dvl-st-dv'+(cv>=25?' pos':cv<=-25?' neg':'');\n"
    "      }\n"
    "    }\n"
    "    var flowEl=_g('dvlSTMktFlow');\n"
    "    if(flowEl){\n"
    "      var fv=window.__dvlFlowNow;\n"
    "      if(fv!=null&&!isNaN(fv)){\n"
    "        flowEl.textContent=(fv>=0?'+':'')+Math.round(fv);\n"
    "        flowEl.className='dvl-st-dv'+(fv>=20?' pos':fv<=-20?' neg':'');\n"
    "      }\n"
    "    }\n"
    "  }catch(_){}\n"
    "}\n"
    "function _syncLivePrice(){_syncLiveStats();}"
)

assert OLD_SYNC_PRICE in html, "_syncLivePrice not found"
html = html.replace(OLD_SYNC_PRICE, NEW_SYNC_PRICE, 1)

# ── 6. Update open() to call _syncLiveStats ───────────────────────────────────
html = html.replace(
    "  _syncLivePrice();\n}",
    "  _syncLiveStats();\n}",
    1
)

# ── 7. Add setInterval for live updates when panel is visible ─────────────────
OLD_TAB_SWITCH = "/* tab switching */\nvar TAB_MAP={backtest:'dvlSTTabBacktest'"

NEW_TAB_SWITCH = (
    "/* live stats auto-refresh */\n"
    "setInterval(function(){\n"
    "  var panel=_g('dvlSTPanel');\n"
    "  if(panel&&panel.classList.contains('show'))_syncLiveStats();\n"
    "},800);\n"
    "\n"
    "/* tab switching */\n"
    "var TAB_MAP={backtest:'dvlSTTabBacktest'"
)

assert OLD_TAB_SWITCH in html, "tab switch comment not found"
html = html.replace(OLD_TAB_SWITCH, NEW_TAB_SWITCH, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.079 applied')
