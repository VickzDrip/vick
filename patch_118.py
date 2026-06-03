#!/usr/bin/env python3
"""Beta 0.118 — Strategy Tester / Optimizer: corrigir divergência de resultados

Causas raiz corrigidas:
  1. Backtest usava S.tf (TF do gráfico) p/ fetch; Optimizer usava stOptTf → TFs diferentes
  2. Cache key com toMs=Date.now() ao milissegundo → nunca batia → candles diferentes
  3. Zonas HVN re-calculadas de candles distintos entre os dois fluxos

Correções:
  A. _dvlFetchBTCandles: arredonda toMs para a hora fechada (cache estável dentro da hora)
  B. Backtest: usa stTf (form) em vez de S.tf (gráfico)
  C. DVLBacktestData também armazena zones
  D. Optimizer: salva candles+zones em DVLBacktestData após carregar
  E. Backtest: reutiliza DVLBacktestData se sym+tf+period batem (mesmo conjunto que o optimizer usou)
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ───────────────────────────────────────────────────────────
OLD_V = "var V='Beta 0.117';"
NEW_V = "var V='Beta 0.118';"
assert OLD_V in html, 'IIFE version string not found'
html = html.replace(OLD_V, NEW_V, 1)

# ── 2. HTML comment ───────────────────────────────────────────────────────────
OLD_CMT = '<!-- DVL_STRATEGY_TESTER v0.117 -->'
NEW_CMT = '<!-- DVL_STRATEGY_TESTER v0.118 -->'
assert OLD_CMT in html
html = html.replace(OLD_CMT, NEW_CMT, 1)

# ── 3. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.117\n  - Strategy Tester: hist\xf3rico real paginado da Binance\n'
NEW_LOG = (
    'Beta 0.118\n'
    '  - Corrigir diverg\xeancia Backtest vs Optimizer:\n'
    '    \xb7 Backtest agora usa stTf (form) n\xe3o S.tf (gr\xe1fico)\n'
    '    \xb7 Cache key arredondado para hora fechada (cache est\xe1vel)\n'
    '    \xb7 DVLBacktestData armazena candles + zones\n'
    '    \xb7 Backtest reutiliza dados do Optimizer se sym/tf/per\xedodo batem\n'
    '    \xb7 Optimizer salva candles+zones em DVLBacktestData ap\xf3s carregar\n'
    'Beta 0.117\n'
    '  - Strategy Tester: hist\xf3rico real paginado da Binance\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── A. Fix _dvlFetchBTCandles: round toMs to nearest closed hour ──────────────
# This makes the cache key stable within a 1-hour window so that
# "run optimizer → apply combo → run backtest" reuses the same candle set.
OLD_FETCH = (
    'async function _dvlFetchBTCandles(sym,tf,periodDays,dateFrom,dateTo){\n'
    '  var now=Date.now();\n'
    '  var toMs=dateTo?new Date(dateTo).getTime()+86400000:now;\n'
    '  var fromMs=dateFrom?new Date(dateFrom).getTime():toMs-(Math.max(1,periodDays||30)*86400000);\n'
    '  var ckey=sym+\'|\'+tf+\'|\'+fromMs+\'|\'+toMs;\n'
)
NEW_FETCH = (
    'async function _dvlFetchBTCandles(sym,tf,periodDays,dateFrom,dateTo){\n'
    '  var now=Date.now();\n'
    '  /* round toMs to nearest closed hour for stable cache key */\n'
    '  var _rawTo=dateTo?new Date(dateTo).getTime()+86400000:now;\n'
    '  var toMs=dateTo?_rawTo:Math.floor(_rawTo/3600000)*3600000;\n'
    '  var fromMs=dateFrom?new Date(dateFrom).getTime():toMs-(Math.max(1,periodDays||30)*86400000);\n'
    '  var ckey=sym+\'|\'+tf+\'|\'+fromMs+\'|\'+toMs;\n'
)
assert OLD_FETCH in html, '_dvlFetchBTCandles signature not found'
html = html.replace(OLD_FETCH, NEW_FETCH, 1)

# ── B. DVLBacktestData: add zones + period fields ─────────────────────────────
OLD_DVLBT = (
    'window.DVLBacktestData={candles:[],symbol:"",timeframe:"",from:0,to:0,source:"none"};\n'
)
NEW_DVLBT = (
    'window.DVLBacktestData={candles:[],zones:[],symbol:"",timeframe:"",periodDays:0,from:0,to:0,source:"none"};\n'
)
assert OLD_DVLBT in html, 'DVLBacktestData init not found'
html = html.replace(OLD_DVLBT, NEW_DVLBT, 1)

# ── C. Store periodDays in DVLBacktestData when fetching ──────────────────────
OLD_STORE = (
    '  _dvlBTCache.set(ckey,candles);\n'
    '  window.DVLBacktestData={candles:candles,symbol:sym,timeframe:tf,from:fromMs,to:toMs,source:\'fetched\'};\n'
    '  return candles;\n'
    '}'
)
NEW_STORE = (
    '  _dvlBTCache.set(ckey,candles);\n'
    '  window.DVLBacktestData={candles:candles,zones:[],symbol:sym,timeframe:tf,\n'
    '    periodDays:periodDays||30,from:fromMs,to:toMs,source:\'fetched\'};\n'
    '  return candles;\n'
    '}'
)
assert OLD_STORE in html, 'DVLBacktestData store block not found'
html = html.replace(OLD_STORE, NEW_STORE, 1)

# ── D. Backtest button: use stTf (form) not S.tf (chart) ─────────────────────
OLD_BTN_TF = (
    '      var sym=(window.S&&window.S.sym)||\'BTCUSDT\';\n'
    '      var tf=(window.S&&window.S.tf)||\'5m\';\n'
    '      var candles,dataSource=\'chart\';\n'
    '      try{\n'
    '        candles=await _dvlFetchBTCandles(sym,tf,_stDays,cfg.dateFrom,cfg.dateTo);\n'
    '        dataSource=\'fetched\';\n'
    '      }catch(e){\n'
    '        candles=(window.S&&window.S.candles)||[];\n'
    '        dataSource=\'chart\';\n'
    '      }'
)
NEW_BTN_TF = (
    '      var sym=(window.S&&window.S.sym)||\'BTCUSDT\';\n'
    '      /* use stTf (form field) so backtest matches optimizer TF when combo is applied */\n'
    '      var tf=(_g(\'stTf\')||{value:\'5m\'}).value||(window.S&&window.S.tf)||\'5m\';\n'
    '      var candles,zones=null,dataSource=\'chart\';\n'
    '      /* reuse DVLBacktestData if optimizer already loaded matching candles+zones */\n'
    '      var _btd=window.DVLBacktestData;\n'
    '      if(_btd&&_btd.source===\'fetched\'&&_btd.symbol===sym&&_btd.timeframe===tf&&\n'
    '         Math.abs((_btd.periodDays||0)-_stDays)<=1&&_btd.candles.length>50){\n'
    '        candles=_btd.candles;\n'
    '        zones=_btd.zones&&_btd.zones.length?_btd.zones:null;\n'
    '        dataSource=\'fetched\';\n'
    '      }else{\n'
    '        try{\n'
    '          candles=await _dvlFetchBTCandles(sym,tf,_stDays,cfg.dateFrom,cfg.dateTo);\n'
    '          dataSource=\'fetched\';\n'
    '        }catch(e){\n'
    '          candles=(window.S&&window.S.candles)||[];\n'
    '          dataSource=\'chart\';\n'
    '        }\n'
    '      }'
)
assert OLD_BTN_TF in html, 'backtest button TF/candle block not found'
html = html.replace(OLD_BTN_TF, NEW_BTN_TF, 1)

# ── E. Backtest button: pass precomputed zones to _backtestReal ───────────────
OLD_BTN_ZONES = (
    '      var zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '        (window.__hvnZones?window.__hvnZones():[]);\n'
    '      if(!zones||!zones.length){\n'
    '        _setBadge(\'NO HISTORY\',\'#ff4d6a\',\'rgba(255,77,106,.08)\',\'rgba(255,77,106,.25)\',\n'
    '          \'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue o gr\xe1fico.\',\n'
    '          \'rgba(255,77,106,.8)\');\n'
    '        return;\n'
    '      }\n'
    '      var res=_backtestReal(cfg,candles,zones);\n'
)
NEW_BTN_ZONES = (
    '      if(!zones||!zones.length){\n'
    '        zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '          (window.__hvnZones?window.__hvnZones():[]);\n'
    '        /* cache zones back for next backtest run */\n'
    '        if(window.DVLBacktestData&&window.DVLBacktestData.candles===candles)window.DVLBacktestData.zones=zones;\n'
    '      }\n'
    '      if(!zones||!zones.length){\n'
    '        _setBadge(\'NO HISTORY\',\'#ff4d6a\',\'rgba(255,77,106,.08)\',\'rgba(255,77,106,.25)\',\n'
    '          \'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue o gr\xe1fico.\',\n'
    '          \'rgba(255,77,106,.8)\');\n'
    '        return;\n'
    '      }\n'
    '      var res=_backtestReal(cfg,candles,zones);\n'
)
assert OLD_BTN_ZONES in html, 'backtest zones block not found'
html = html.replace(OLD_BTN_ZONES, NEW_BTN_ZONES, 1)

# ── F. Optimizer: save zones in DVLBacktestData after computing ───────────────
OLD_OPT_ZONES = (
    "    if(!zones||!zones.length)return _optFail('Sem zonas HVN calculadas. Ative o Vol Zones e recarregue.');\n"
    "    if(status)status.textContent='Hist\xf3rico: '+candles.length+' candles. Gerando sinais...';\n"
    "    _doOpt(candles,zones);\n"
    "  }).catch(function(){\n"
)
NEW_OPT_ZONES = (
    "    if(!zones||!zones.length)return _optFail('Sem zonas HVN calculadas. Ative o Vol Zones e recarregue.');\n"
    "    /* save zones so backtest can reuse same data set */\n"
    "    if(window.DVLBacktestData)window.DVLBacktestData.zones=zones;\n"
    "    if(status)status.textContent='Hist\xf3rico: '+candles.length+' candles. Gerando sinais...';\n"
    "    _doOpt(candles,zones);\n"
    "  }).catch(function(){\n"
)
assert OLD_OPT_ZONES in html, 'optimizer zones save anchor not found'
html = html.replace(OLD_OPT_ZONES, NEW_OPT_ZONES, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.118 applied')
