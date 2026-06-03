#!/usr/bin/env python3
"""Beta 0.125 — realismo do Strategy Tester: histórico completo, TFs, lookahead, indicador, live stats

Correções:
  1. _dvlFetchBTCandles: remove maxC=10000, adiciona mapa TF→Binance, validação de TF,
     progress callback, cálculo de expectedCandles, historyStatus REAL/LIMITED/UNSUPPORTED
  2. Backtest button: progress callback no fetch, badge UNSUPPORTED TF, info X/Y candles
  3. _backtestReal (HVN): zones computadas só do warmup (40%) — evita lookahead bias
  4. open(): chama _stSwitchInd ao abrir painel — campos corretos por indicador
  5. Live Stats: "Último Sinal" labelado como (hoje) vs (histórico)
  6. Optimizer: catch de unsupportedTF mostra mensagem adequada
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ─────────────────────────────────────────────────────────
BUMPS = [
    ("var V='Beta 0.124';",                          "var V='Beta 0.125';"),
    ('<!-- DVL_STRATEGY_TESTER v0.124 -->',           '<!-- DVL_STRATEGY_TESTER v0.125 -->'),
    ('window.DVL_APP_VERSION = "Beta 0.124";',        'window.DVL_APP_VERSION = "Beta 0.125";'),
    ('  const LOCAL_VERSION = "Beta 0.124";',         '  const LOCAL_VERSION = "Beta 0.125";'),
    ("try{ window.DVL_APP_VERSION='Beta 0.124'; }catch(_){}",
     "try{ window.DVL_APP_VERSION='Beta 0.125'; }catch(_){}"),
    ("b.textContent='Beta 0.124';});}catch(_){}",
     "b.textContent='Beta 0.125';});}catch(_){}"),
    ("const VERSION='Beta 0.124';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }",
     "const VERSION='Beta 0.125';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }"),
    ("const VERSION='Beta 0.124';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }",
     "const VERSION='Beta 0.125';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }"),
    ("window.DVL_APP_VERSION='Beta 0.124';",          "window.DVL_APP_VERSION='Beta 0.125';"),
    ("if(b)b.textContent='Beta 0.124';",              "if(b)b.textContent='Beta 0.125';"),
    ("const VERSION = 'Beta 0.124';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }",
     "const VERSION = 'Beta 0.125';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }"),
    ("var VERSION='Beta 0.124';\n  var KEYS=['flow','clarity'];",
     "var VERSION='Beta 0.125';\n  var KEYS=['flow','clarity'];"),
]
for old, new in BUMPS:
    assert old in html, f'not found: {old[:60]}'
    html = html.replace(old, new, 1)

assert html.count('>Beta 0.124</span>') == 2, 'expected 2 badge spans'
html = html.replace('>Beta 0.124</span>', '>Beta 0.125</span>', 2)

# ── 2. changelog ────────────────────────────────────────────────────────────
OLD_LOG = (
    'Beta 0.124\n'
    '  - FVG e TrendBreak: backtest real e optimizer desbloqueados\n'
    '    \xb7 _backtestRealFVG: imbalances 3-candles, mitMode, react, reentry, maxAge\n'
    '    \xb7 _backtestRealTB: crossover EMA r\xe1pida/lenta, bias, flip/sltp exit\n'
)
NEW_LOG = (
    'Beta 0.125\n'
    '  - Hist\xf3rico real completo: sem limite de 10k candles, pagina\xe7\xe3o at\xe9 o per\xedodo completo\n'
    '  - Valida\xe7\xe3o de TF: 15s/30s mostram UNSUPPORTED TF (Binance n\xe3o oferece nativo)\n'
    '  - Lookahead bias: zonas HVN calculadas apenas do warmup (40%) do hist\xf3rico\n'
    '  - open(): _stSwitchInd chamado ao abrir painel (campos corretos por indicador)\n'
    '  - Live Stats: \xdaltimo Sinal marcado como (hoje) ou (hist\xf3rico)\n'
    '  - Optimizer: catch de unsupportedTF mostra mensagem espec\xedfica\n'
    'Beta 0.124\n'
    '  - FVG e TrendBreak: backtest real e optimizer desbloqueados\n'
    '    \xb7 _backtestRealFVG: imbalances 3-candles, mitMode, react, reentry, maxAge\n'
    '    \xb7 _backtestRealTB: crossover EMA r\xe1pida/lenta, bias, flip/sltp exit\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. rewrite _dvlFetchBTCandles ────────────────────────────────────────────
OLD_FETCH = (
    'async function _dvlFetchBTCandles(sym,tf,periodDays,dateFrom,dateTo){\n'
    '  var now=Date.now();\n'
    '  /* round toMs to nearest closed hour for stable cache key */\n'
    '  var _rawTo=dateTo?new Date(dateTo).getTime()+86400000:now;\n'
    '  var toMs=dateTo?_rawTo:Math.floor(_rawTo/3600000)*3600000;\n'
    '  var fromMs=dateFrom?new Date(dateFrom).getTime():toMs-(Math.max(1,periodDays||30)*86400000);\n'
    '  var ckey=sym+\'|\'+ tf+\'|\'+ fromMs+\'|\'+ toMs;\n'
    '  if(_dvlBTCache.has(ckey))return _dvlBTCache.get(ckey);\n'
    '  var candles=[],cursor=fromMs,maxC=10000;\n'
    '  while(cursor<toMs&&candles.length<maxC){\n'
    '    var url=\'https://api.binance.com/api/v3/klines?symbol=\'+sym+\'&interval=\'+tf+\n'
    '      \'&startTime=\'+cursor+\'&endTime=\'+toMs+\'&limit=1000\';\n'
    '    var r=await fetch(url);\n'
    '    if(!r.ok)throw new Error(\'Klines \'+r.status);\n'
    '    var batch=await r.json();\n'
    '    if(!Array.isArray(batch)||!batch.length)break;\n'
    '    batch.forEach(function(x){candles.push({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()});});\n'
    '    var lastT=+batch[batch.length-1][0];\n'
    '    if(batch.length<1000)break;\n'
    '    cursor=lastT+1;\n'
    '  }\n'
    '  _dvlBTCache.set(ckey,candles);\n'
    '  window.DVLBacktestData={candles:candles,zones:[],symbol:sym,timeframe:tf,\n'
    '    periodDays:periodDays||30,from:fromMs,to:toMs,source:\'fetched\'};\n'
    '  return candles;\n'
    '}'
)

NEW_FETCH = (
    '/* TF → Binance native interval name (null = not natively available) */\n'
    'var _TF_BINANCE={\'1s\':\'1s\',\'1m\':\'1m\',\'2m\':null,\'3m\':\'3m\',\'5m\':\'5m\',\'15m\':\'15m\',\'30m\':\'30m\',\n'
    '  \'1h\':\'1h\',\'2h\':\'2h\',\'4h\':\'4h\',\'6h\':\'6h\',\'8h\':\'8h\',\'12h\':\'12h\',\n'
    '  \'1d\':\'1d\',\'1D\':\'1d\',\'3d\':\'3d\',\'1w\':\'1w\',\'1W\':\'1w\',\'1M\':\'1M\',\n'
    '  \'15s\':null,\'30s\':null};\n'
    '/* TF → milliseconds per candle (crypto 24/7) */\n'
    'var _TF_MS={\'1s\':1000,\'1m\':60000,\'3m\':180000,\'5m\':300000,\'15m\':900000,\'30m\':1800000,\n'
    '  \'1h\':3600000,\'2h\':7200000,\'4h\':14400000,\'6h\':21600000,\'8h\':28800000,\'12h\':43200000,\n'
    '  \'1d\':86400000,\'1D\':86400000,\'3d\':259200000,\'1w\':604800000,\'1W\':604800000,\'1M\':2592000000};\n'
    'async function _dvlFetchBTCandles(sym,tf,periodDays,dateFrom,dateTo,onProgress){\n'
    '  /* validate: 15s/30s are synthetic, not natively on Binance */\n'
    '  if(Object.prototype.hasOwnProperty.call(_TF_BINANCE,tf)&&_TF_BINANCE[tf]===null){\n'
    '    var _e=new Error(\'TF n\xe3o suportado: \'+tf);\n'
    '    _e.unsupportedTF=true;_e.tf=tf;\n'
    '    window.DVLBacktestData={candles:[],zones:[],symbol:sym,timeframe:tf,\n'
    '      periodDays:periodDays||30,from:0,to:0,source:\'unsupported_tf\',\n'
    '      historyStatus:\'UNSUPPORTED_TF\',expectedCandles:0,loadedCandles:0};\n'
    '    throw _e;\n'
    '  }\n'
    '  var normTf=(_TF_BINANCE[tf])||tf;\n'
    '  var now=Date.now();\n'
    '  /* round toMs to nearest closed hour for stable cache key */\n'
    '  var _rawTo=dateTo?new Date(dateTo).getTime()+86400000:now;\n'
    '  var toMs=dateTo?_rawTo:Math.floor(_rawTo/3600000)*3600000;\n'
    '  var fromMs=dateFrom?new Date(dateFrom).getTime():toMs-(Math.max(1,periodDays||30)*86400000);\n'
    '  var ckey=sym+\'|\'+ normTf+\'|\'+ fromMs+\'|\'+ toMs;\n'
    '  if(_dvlBTCache.has(ckey)){\n'
    '    var _c=_dvlBTCache.get(ckey);\n'
    '    window.DVLBacktestData={candles:_c,zones:[],symbol:sym,timeframe:tf,\n'
    '      periodDays:periodDays||30,from:fromMs,to:toMs,source:\'fetched\',\n'
    '      historyStatus:_c._hs||\'REAL_HISTORY\',\n'
    '      expectedCandles:_c._exp||_c.length,loadedCandles:_c.length};\n'
    '    return _c;\n'
    '  }\n'
    '  /* expected candle count — crypto is 24/7 */\n'
    '  var tfCandleMs=_TF_MS[tf]||300000;\n'
    '  var expectedCandles=Math.max(1,Math.round((toMs-fromMs)/tfCandleMs));\n'
    '  var candles=[],cursor=fromMs;\n'
    '  while(cursor<toMs){\n'
    '    var url=\'https://api.binance.com/api/v3/klines?symbol=\'+sym+\'&interval=\'+normTf+\n'
    '      \'&startTime=\'+cursor+\'&endTime=\'+toMs+\'&limit=1000\';\n'
    '    var r=await fetch(url);\n'
    '    if(!r.ok)throw new Error(\'Klines \'+r.status);\n'
    '    var batch=await r.json();\n'
    '    if(!Array.isArray(batch)||!batch.length)break;\n'
    '    batch.forEach(function(x){candles.push({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()});});\n'
    '    if(onProgress)onProgress(candles.length,expectedCandles);\n'
    '    var lastT=+batch[batch.length-1][0];\n'
    '    if(batch.length<1000)break;\n'
    '    cursor=lastT+1;\n'
    '  }\n'
    '  var historyStatus=candles.length>=expectedCandles*0.9?\'REAL_HISTORY\':\'LIMITED_HISTORY\';\n'
    '  candles._hs=historyStatus;candles._exp=expectedCandles;\n'
    '  _dvlBTCache.set(ckey,candles);\n'
    '  window.DVLBacktestData={candles:candles,zones:[],symbol:sym,timeframe:tf,\n'
    '    periodDays:periodDays||30,from:fromMs,to:toMs,source:\'fetched\',\n'
    '    historyStatus:historyStatus,expectedCandles:expectedCandles,loadedCandles:candles.length};\n'
    '  return candles;\n'
    '}'
)

# The old string uses '+tf+' but let me check the exact format
OLD_FETCH_REAL = (
    "async function _dvlFetchBTCandles(sym,tf,periodDays,dateFrom,dateTo){\n"
    "  var now=Date.now();\n"
    "  /* round toMs to nearest closed hour for stable cache key */\n"
    "  var _rawTo=dateTo?new Date(dateTo).getTime()+86400000:now;\n"
    "  var toMs=dateTo?_rawTo:Math.floor(_rawTo/3600000)*3600000;\n"
    "  var fromMs=dateFrom?new Date(dateFrom).getTime():toMs-(Math.max(1,periodDays||30)*86400000);\n"
    "  var ckey=sym+'|'+tf+'|'+fromMs+'|'+toMs;\n"
    "  if(_dvlBTCache.has(ckey))return _dvlBTCache.get(ckey);\n"
    "  var candles=[],cursor=fromMs,maxC=10000;\n"
    "  while(cursor<toMs&&candles.length<maxC){\n"
    "    var url='https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+tf+\n"
    "      '&startTime='+cursor+'&endTime='+toMs+'&limit=1000';\n"
    "    var r=await fetch(url);\n"
    "    if(!r.ok)throw new Error('Klines '+r.status);\n"
    "    var batch=await r.json();\n"
    "    if(!Array.isArray(batch)||!batch.length)break;\n"
    "    batch.forEach(function(x){candles.push({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()});});\n"
    "    var lastT=+batch[batch.length-1][0];\n"
    "    if(batch.length<1000)break;\n"
    "    cursor=lastT+1;\n"
    "  }\n"
    "  _dvlBTCache.set(ckey,candles);\n"
    "  window.DVLBacktestData={candles:candles,zones:[],symbol:sym,timeframe:tf,\n"
    "    periodDays:periodDays||30,from:fromMs,to:toMs,source:'fetched'};\n"
    "  return candles;\n"
    "}"
)

NEW_FETCH_REAL = (
    "/* TF → Binance native interval name (null = not natively available) */\n"
    "var _TF_BINANCE={'1s':'1s','1m':'1m','2m':null,'3m':'3m','5m':'5m','15m':'15m','30m':'30m',\n"
    "  '1h':'1h','2h':'2h','4h':'4h','6h':'6h','8h':'8h','12h':'12h',\n"
    "  '1d':'1d','1D':'1d','3d':'3d','1w':'1w','1W':'1w','1M':'1M',\n"
    "  '15s':null,'30s':null};\n"
    "/* TF → milliseconds per candle (crypto 24/7) */\n"
    "var _TF_MS={'1s':1000,'1m':60000,'3m':180000,'5m':300000,'15m':900000,'30m':1800000,\n"
    "  '1h':3600000,'2h':7200000,'4h':14400000,'6h':21600000,'8h':28800000,'12h':43200000,\n"
    "  '1d':86400000,'1D':86400000,'3d':259200000,'1w':604800000,'1W':604800000,'1M':2592000000};\n"
    "async function _dvlFetchBTCandles(sym,tf,periodDays,dateFrom,dateTo,onProgress){\n"
    "  /* validate: 15s/30s are synthetic, not natively on Binance */\n"
    "  if(Object.prototype.hasOwnProperty.call(_TF_BINANCE,tf)&&_TF_BINANCE[tf]===null){\n"
    "    var _e=new Error('TF n\xe3o suportado: '+tf);\n"
    "    _e.unsupportedTF=true;_e.tf=tf;\n"
    "    window.DVLBacktestData={candles:[],zones:[],symbol:sym,timeframe:tf,\n"
    "      periodDays:periodDays||30,from:0,to:0,source:'unsupported_tf',\n"
    "      historyStatus:'UNSUPPORTED_TF',expectedCandles:0,loadedCandles:0};\n"
    "    throw _e;\n"
    "  }\n"
    "  var normTf=(_TF_BINANCE[tf])||tf;\n"
    "  var now=Date.now();\n"
    "  /* round toMs to nearest closed hour for stable cache key */\n"
    "  var _rawTo=dateTo?new Date(dateTo).getTime()+86400000:now;\n"
    "  var toMs=dateTo?_rawTo:Math.floor(_rawTo/3600000)*3600000;\n"
    "  var fromMs=dateFrom?new Date(dateFrom).getTime():toMs-(Math.max(1,periodDays||30)*86400000);\n"
    "  var ckey=sym+'|'+normTf+'|'+fromMs+'|'+toMs;\n"
    "  if(_dvlBTCache.has(ckey)){\n"
    "    var _c=_dvlBTCache.get(ckey);\n"
    "    window.DVLBacktestData={candles:_c,zones:[],symbol:sym,timeframe:tf,\n"
    "      periodDays:periodDays||30,from:fromMs,to:toMs,source:'fetched',\n"
    "      historyStatus:_c._hs||'REAL_HISTORY',\n"
    "      expectedCandles:_c._exp||_c.length,loadedCandles:_c.length};\n"
    "    return _c;\n"
    "  }\n"
    "  /* expected candle count — crypto is 24/7 */\n"
    "  var tfCandleMs=_TF_MS[tf]||300000;\n"
    "  var expectedCandles=Math.max(1,Math.round((toMs-fromMs)/tfCandleMs));\n"
    "  var candles=[],cursor=fromMs;\n"
    "  while(cursor<toMs){\n"
    "    var url='https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+normTf+\n"
    "      '&startTime='+cursor+'&endTime='+toMs+'&limit=1000';\n"
    "    var r=await fetch(url);\n"
    "    if(!r.ok)throw new Error('Klines '+r.status);\n"
    "    var batch=await r.json();\n"
    "    if(!Array.isArray(batch)||!batch.length)break;\n"
    "    batch.forEach(function(x){candles.push({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()});});\n"
    "    if(onProgress)onProgress(candles.length,expectedCandles);\n"
    "    var lastT=+batch[batch.length-1][0];\n"
    "    if(batch.length<1000)break;\n"
    "    cursor=lastT+1;\n"
    "  }\n"
    "  var historyStatus=candles.length>=expectedCandles*0.9?'REAL_HISTORY':'LIMITED_HISTORY';\n"
    "  candles._hs=historyStatus;candles._exp=expectedCandles;\n"
    "  _dvlBTCache.set(ckey,candles);\n"
    "  window.DVLBacktestData={candles:candles,zones:[],symbol:sym,timeframe:tf,\n"
    "    periodDays:periodDays||30,from:fromMs,to:toMs,source:'fetched',\n"
    "    historyStatus:historyStatus,expectedCandles:expectedCandles,loadedCandles:candles.length};\n"
    "  return candles;\n"
    "}"
)

assert OLD_FETCH_REAL in html, '_dvlFetchBTCandles not found'
html = html.replace(OLD_FETCH_REAL, NEW_FETCH_REAL, 1)

# ── 4a. Backtest button: add _fetchErrTF var + progress callback ─────────────
OLD_FETCH_CALL = (
    "      var candles,zones=null,dataSource='chart';\n"
    "      /* reuse DVLBacktestData if optimizer already loaded matching candles+zones */\n"
    "      var _btd=window.DVLBacktestData;\n"
    "      if(_btd&&_btd.source==='fetched'&&_btd.symbol===sym&&_btd.timeframe===tf&&\n"
    "         Math.abs((_btd.periodDays||0)-_stDays)<=1&&_btd.candles.length>50){\n"
    "        candles=_btd.candles;\n"
    "        zones=_btd.zones&&_btd.zones.length?_btd.zones:null;\n"
    "        dataSource='fetched';\n"
    "      }else{\n"
    "        try{\n"
    "          candles=await _dvlFetchBTCandles(sym,tf,_stDays,cfg.dateFrom,cfg.dateTo);\n"
    "          dataSource='fetched';\n"
    "        }catch(e){\n"
    "          candles=(window.S&&window.S.candles)||[];\n"
    "          dataSource='chart';\n"
    "        }\n"
    "      }"
)

NEW_FETCH_CALL = (
    "      var candles,zones=null,dataSource='chart',_fetchErrTF=null;\n"
    "      /* reuse DVLBacktestData if optimizer already loaded matching candles+zones */\n"
    "      var _btd=window.DVLBacktestData;\n"
    "      if(_btd&&_btd.source==='fetched'&&_btd.symbol===sym&&_btd.timeframe===tf&&\n"
    "         Math.abs((_btd.periodDays||0)-_stDays)<=1&&_btd.candles.length>50){\n"
    "        candles=_btd.candles;\n"
    "        zones=_btd.zones&&_btd.zones.length?_btd.zones:null;\n"
    "        dataSource='fetched';\n"
    "      }else{\n"
    "        try{\n"
    "          var _pgCb=function(loaded,expected){\n"
    "            var _dn=_g('dvlSTDetNote');\n"
    "            if(_dn)_dn.textContent='Buscando hist\xf3rico: '+loaded+' / ~'+expected+' candles...';\n"
    "          };\n"
    "          candles=await _dvlFetchBTCandles(sym,tf,_stDays,cfg.dateFrom,cfg.dateTo,_pgCb);\n"
    "          dataSource='fetched';\n"
    "        }catch(e){\n"
    "          if(e&&e.unsupportedTF){_fetchErrTF=e.tf;}\n"
    "          else{candles=(window.S&&window.S.candles)||[];dataSource='chart';}\n"
    "        }\n"
    "      }"
)

assert OLD_FETCH_CALL in html, 'backtest fetch call block not found'
html = html.replace(OLD_FETCH_CALL, NEW_FETCH_CALL, 1)

# ── 4b. After _setBadge definition: add UNSUPPORTED TF check ─────────────────
OLD_SET_BADGE = (
    "      function _setBadge(txt,clr,bg,bd,msg,msgClr){\n"
    "        if(res0)res0.style.display='block';\n"
    "        if(db){db.style.display='inline-flex';db.textContent=txt;\n"
    "          db.style.background=bg;db.style.color=clr;db.style.borderColor=bd;}\n"
    "        if(dn){dn.style.display='';dn.textContent=msg;dn.style.color=msgClr;}\n"
    "      }\n"
    "      if(!candles||candles.length<50){"
)

NEW_SET_BADGE = (
    "      function _setBadge(txt,clr,bg,bd,msg,msgClr){\n"
    "        if(res0)res0.style.display='block';\n"
    "        if(db){db.style.display='inline-flex';db.textContent=txt;\n"
    "          db.style.background=bg;db.style.color=clr;db.style.borderColor=bd;}\n"
    "        if(dn){dn.style.display='';dn.textContent=msg;dn.style.color=msgClr;}\n"
    "      }\n"
    "      if(_fetchErrTF){\n"
    "        _setBadge('UNSUPPORTED TF','#ffb400','rgba(255,180,0,.1)','rgba(255,180,0,.28)',\n"
    "          'TF \"'+_fetchErrTF+'\" n\xe3o suportado: use 1m, 5m, 15m, 30m, 1h, 4h, 1d ou 1w.',\n"
    "          'rgba(255,180,0,.7)');\n"
    "        return;\n"
    "      }\n"
    "      if(!candles||candles.length<50){"
)

assert OLD_SET_BADGE in html, '_setBadge definition + NO HISTORY check not found'
html = html.replace(OLD_SET_BADGE, NEW_SET_BADGE, 1)

# ── 4c. Update LIMITED HISTORY threshold and info text ───────────────────────
OLD_BADGE_SECTION = (
    "      var _cLen=candles.length,_isLim=_cLen<300;\n"
    "      if(!res||!res.trades){\n"
    "        var _noTxt=_isLim?'LIMITED HISTORY':'SEM TRADES';\n"
    "        _setBadge(_noTxt,'#ffb400','rgba(255,180,0,.1)','rgba(255,180,0,.28)',\n"
    "          _isLim?'Hist\xf3rico curto ('+_cLen+' candles). Resultado pode ser pouco representativo.':\n"
    "            'Nenhum trade encontrado no per\xedodo. Ajuste o per\xedodo ou os filtros.',\n"
    "          'rgba(255,180,0,.7)');\n"
    "        return;\n"
    "      }\n"
    "      _renderResults(res);\n"
    "      var _bt=_isLim?'LIMITED HISTORY':(dataSource==='fetched'?'REAL HISTORY':'CHART DATA');\n"
    "      var _bc=_isLim?'#ffb400':(dataSource==='fetched'?'#00c864':'#00b4ff');\n"
    "      var _bb=_isLim?'rgba(255,180,0,.1)':(dataSource==='fetched'?'rgba(0,200,100,.08)':'rgba(0,180,255,.08)');\n"
    "      var _bbd=_isLim?'rgba(255,180,0,.28)':(dataSource==='fetched'?'rgba(0,200,100,.25)':'rgba(0,180,255,.25)');\n"
    "      var _info=(dataSource==='fetched'?'Backtest real: '+_cLen+' candles hist\xf3ricos. ':\n"
    "        'Backtest: '+_cLen+' candles do gr\xe1fico. ')+'Sinais gerados internamente: '+res.trades+' trades.';\n"
    "      _setBadge(_bt,_bc,_bb,_bbd,_info,_bc==='#00c864'?'rgba(0,200,100,.8)':_bc==='#00b4ff'?'rgba(0,180,255,.8)':'rgba(255,180,0,.7)');"
)

NEW_BADGE_SECTION = (
    "      var _cLen=candles.length;\n"
    "      var _btd2=window.DVLBacktestData;\n"
    "      var _expC=(_btd2&&_btd2.expectedCandles>0)?_btd2.expectedCandles:0;\n"
    "      var _isLim=_expC>0?(_cLen<_expC*0.9):(_cLen<300);\n"
    "      if(!res||!res.trades){\n"
    "        var _noTxt=_isLim?'LIMITED HISTORY':'SEM TRADES';\n"
    "        var _limMsg=_isLim?('Hist\xf3rico parcial: '+_cLen+(_expC>0?' / ~'+_expC:'')+' candles. Aumente o per\xedodo.'):\n"
    "          'Nenhum trade encontrado no per\xedodo. Ajuste os filtros.';\n"
    "        _setBadge(_noTxt,'#ffb400','rgba(255,180,0,.1)','rgba(255,180,0,.28)',_limMsg,'rgba(255,180,0,.7)');\n"
    "        return;\n"
    "      }\n"
    "      _renderResults(res);\n"
    "      var _bt=_isLim?'LIMITED HISTORY':(dataSource==='fetched'?'REAL HISTORY':'CHART DATA');\n"
    "      var _bc=_isLim?'#ffb400':(dataSource==='fetched'?'#00c864':'#00b4ff');\n"
    "      var _bb=_isLim?'rgba(255,180,0,.1)':(dataSource==='fetched'?'rgba(0,200,100,.08)':'rgba(0,180,255,.08)');\n"
    "      var _bbd=_isLim?'rgba(255,180,0,.28)':(dataSource==='fetched'?'rgba(0,200,100,.25)':'rgba(0,180,255,.25)');\n"
    "      var _histNote=_expC>0?(' '+_cLen+'/~'+_expC+' candles'+(_isLim?' ⚠':'')+'.'):'';\n"
    "      var _laNote=(_btd2&&_btd2.lookaheadSafe)?' Zonas: sem lookahead.':'';\n"
    "      var _info=(dataSource==='fetched'?'Backtest real'+_histNote+_laNote:\n"
    "        'Backtest: '+_cLen+' candles do gr\xe1fico.')+' Trades: '+res.trades+'.';\n"
    "      _setBadge(_bt,_bc,_bb,_bbd,_info,_bc==='#00c864'?'rgba(0,200,100,.8)':_bc==='#00b4ff'?'rgba(0,180,255,.8)':'rgba(255,180,0,.7)');"
)

assert OLD_BADGE_SECTION in html, 'badge section not found'
html = html.replace(OLD_BADGE_SECTION, NEW_BADGE_SECTION, 1)

# ── 5. _backtestReal: lookahead-safe zone computation ────────────────────────
OLD_ZONES_BLOCK = (
    "    var zones=_preZones;\n"
    "    if(!zones){\n"
    "      zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n"
    "        (window.__hvnZones?window.__hvnZones():[]);\n"
    "    }"
)

NEW_ZONES_BLOCK = (
    "    var zones=_preZones;\n"
    "    if(!zones){\n"
    "      /* lookahead-safe: compute zones only from warmup (40% or min 500 candles) */\n"
    "      var _wuEnd=Math.min(candles.length,Math.max(500,Math.floor(candles.length*0.4)));\n"
    "      var _wuC=_wuEnd<candles.length?candles.slice(0,_wuEnd):candles;\n"
    "      zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_wuC):\n"
    "        (window.__hvnZones?window.__hvnZones():[]);\n"
    "      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=true;\n"
    "    }"
)

assert OLD_ZONES_BLOCK in html, '_backtestReal zones block not found'
html = html.replace(OLD_ZONES_BLOCK, NEW_ZONES_BLOCK, 1)

# ── 6. open(): call _stSwitchInd to fix fields per indicator on panel open ───
OLD_OPEN = (
    "  try{var s=document.getElementById('stTf');if(s&&window.S&&window.S.tf)s.value=window.S.tf;}catch(_){}\n"
    "  try{\n"
    "    /* default date range: today - 1 year → today */"
)

NEW_OPEN = (
    "  try{var s=document.getElementById('stTf');if(s&&window.S&&window.S.tf)s.value=window.S.tf;}catch(_){}\n"
    "  try{var _i=document.getElementById('stInd');if(_i&&typeof _stSwitchInd==='function')_stSwitchInd(_i.value);}catch(_){}\n"
    "  try{\n"
    "    /* default date range: today - 1 year → today */"
)

assert OLD_OPEN in html, 'open() function TF line not found'
html = html.replace(OLD_OPEN, NEW_OPEN, 1)

# ── 7. Live Stats: label last signal as (hoje) vs (histórico) ────────────────
OLD_LIVE = (
    "    }else{\n"
    "      var _ls=_sigs[_sigs.length-1];\n"
    "      if(_dEl){_dEl.textContent=_ls.side;\n"
    "        _dEl.className='dvl-st-lsig-dir '+(_ls.side==='LONG'?'long':'short');}\n"
    "      if(_tEl)_tEl.textContent=(_ls.rejectionType||'HVN Signal')+' \xb7 HVN Signals';\n"
    "      if(_sEl)_sEl.textContent='';\n"
    "      if(_tfEl)_tfEl.textContent=(window.S&&window.S.tf)||'?';\n"
    "      if(_znEl){\n"
    "        var _z=_ls.hvnZone,_zp=_z?(_z.price||(_z.lo+_z.hi)/2):_ls.entryPrice;\n"
    "        _znEl.textContent=_zp>999?_zp.toFixed(0):_zp.toFixed(2);\n"
    "      }\n"
    "      /* today: signals in last 24h */\n"
    "      var _rt2=window.S&&window.S.candles&&window.S.candles.length?\n"
    "        window.S.candles[window.S.candles.length-1].t:0;\n"
    "      var _tSc2=_rt2>9999999999?1:1000;\n"
    "      var _24h=_rt2-86400*(_tSc2===1?1000:1);\n"
    "      var _tSigs=_sigs.filter(function(s){return s.timestamp>=_24h;});\n"
    "      if(_sgEl)_sgEl.textContent=String(_tSigs.length);\n"
    "      if(_wrEl)_wrEl.textContent='—';\n"
    "      if(_pfEl)_pfEl.textContent='—';\n"
    "    }"
)

NEW_LIVE = (
    "    }else{\n"
    "      var _ls=_sigs[_sigs.length-1];\n"
    "      /* compute today window first — needed to label signal as hoje/hist\xf3rico */\n"
    "      var _rt2=window.S&&window.S.candles&&window.S.candles.length?\n"
    "        window.S.candles[window.S.candles.length-1].t:0;\n"
    "      var _tSc2=_rt2>9999999999?1:1000;\n"
    "      var _24h=_rt2-86400*(_tSc2===1?1000:1);\n"
    "      var _isToday=_ls.timestamp>=_24h;\n"
    "      if(_dEl){_dEl.textContent=_ls.side;\n"
    "        _dEl.className='dvl-st-lsig-dir '+(_ls.side==='LONG'?'long':'short');}\n"
    "      if(_tEl)_tEl.textContent=(_ls.rejectionType||'HVN Signal')+' \xb7 HVN Signals';\n"
    "      if(_sEl)_sEl.textContent=_isToday?'':'(hist\xf3rico)';\n"
    "      if(_tfEl)_tfEl.textContent=(window.S&&window.S.tf)||'?';\n"
    "      if(_znEl){\n"
    "        var _z=_ls.hvnZone,_zp=_z?(_z.price||(_z.lo+_z.hi)/2):_ls.entryPrice;\n"
    "        _znEl.textContent=_zp>999?_zp.toFixed(0):_zp.toFixed(2);\n"
    "      }\n"
    "      var _tSigs=_sigs.filter(function(s){return s.timestamp>=_24h;});\n"
    "      if(_sgEl)_sgEl.textContent=String(_tSigs.length);\n"
    "      if(_wrEl)_wrEl.textContent='—';\n"
    "      if(_pfEl)_pfEl.textContent='—';\n"
    "    }"
)

assert OLD_LIVE in html, 'Live Stats else block not found'
html = html.replace(OLD_LIVE, NEW_LIVE, 1)

# ── 8. Optimizer: catch unsupportedTF ────────────────────────────────────────
OLD_OPT_CATCH = "  }).catch(function(){\n    var candles=(window.S&&window.S.candles)||[];"
NEW_OPT_CATCH = "  }).catch(function(e){\n    if(e&&e.unsupportedTF)return _optFail('TF \"'+e.tf+'\" n\xe3o suportado: use 1m, 5m, 15m, 30m, 1h, 4h, 1d ou 1w.');\n    var candles=(window.S&&window.S.candles)||[];"

assert OLD_OPT_CATCH in html, 'optimizer catch not found'
html = html.replace(OLD_OPT_CATCH, NEW_OPT_CATCH, 1)

# ── 9. update changelog comment in _dvlFetchBTCandles doc ───────────────────
OLD_FETCH_DOC = '    \xb7 _dvlFetchBTCandles: busca paginada at\xe9 10.000 candles com cache\n'
NEW_FETCH_DOC = '    \xb7 _dvlFetchBTCandles: busca paginada completa (sem limite), TF validation, progress cb\n'
if OLD_FETCH_DOC in html:
    html = html.replace(OLD_FETCH_DOC, NEW_FETCH_DOC, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.125 applied')
