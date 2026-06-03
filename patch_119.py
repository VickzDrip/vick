#!/usr/bin/env python3
"""Beta 0.119 — Strategy Tester: LONGS/SHORTS + sync completo ao aplicar combo do Optimizer

Problemas corrigidos:
  1. _backtestReal não calculava LONGS/SHORTS nem MELHOR DIREÇÃO/SESSÃO
     → trades salvos sem {side, tsH} → longs:0, bestDir:'—'
  2. _syncAllFromCfg não sincronizava trendFilter → stTBFilterMode
  3. _applyRankResult não copiava período e par do Optimizer para o Backtest
     → após aplicar combo, stPeriod e stPair podiam diferir do que o optimizer usou

Correções:
  A. trade push inclui side + hora UTC (tsH) para cálculo de sessão
  B. loop pós-trades: calcular longsCount, shortsCount, lwR, swR, bestDir, bestSess
  C. return block: usar valores calculados em vez de 0/'—'
  D. _syncAllFromCfg: adicionar sync de trendFilter → stTBFilterMode
  E. _applyRankResult: copiar stOptPeriod → stPeriod e stOptPair → stPair antes de chamar _syncAllFromCfg
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ───────────────────────────────────────────────────────────
OLD_V = "var V='Beta 0.118';"
NEW_V = "var V='Beta 0.119';"
assert OLD_V in html, 'version string not found'
html = html.replace(OLD_V, NEW_V, 1)

# ── 2. HTML comment ───────────────────────────────────────────────────────────
OLD_CMT = '<!-- DVL_STRATEGY_TESTER v0.118 -->'
NEW_CMT = '<!-- DVL_STRATEGY_TESTER v0.119 -->'
assert OLD_CMT in html
html = html.replace(OLD_CMT, NEW_CMT, 1)

# ── 3. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = (
    'Beta 0.118\n'
    '  - Corrigir diverg\xeancia Backtest vs Optimizer:\n'
)
NEW_LOG = (
    'Beta 0.119\n'
    '  - Backtest real: LONGS/SHORTS e Melhor Dire\xe7\xe3o/Sess\xe3o agora calculados\n'
    '  - _syncAllFromCfg: trendFilter → stTBFilterMode sincronizado\n'
    '  - Aplicar combo: copia per\xedodo e par do Optimizer para o Backtest\n'
    'Beta 0.118\n'
    '  - Corrigir diverg\xeancia Backtest vs Optimizer:\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── A. trade push: add side + tsHour ─────────────────────────────────────────
OLD_PUSH = (
    '      trades.push({outcome:outcome,pnl:rMult*riskPct});\n'
    '      var prev=eq[eq.length-1];eq.push(Math.max(10,prev+rMult*riskPct));\n'
)
NEW_PUSH = (
    '      var _tsH=new Date((sig.timestamp>9999999999?sig.timestamp:sig.timestamp*1000)).getUTCHours();\n'
    '      trades.push({outcome:outcome,pnl:rMult*riskPct,side:isLong?\'LONG\':\'SHORT\',tsH:_tsH});\n'
    '      var prev=eq[eq.length-1];eq.push(Math.max(10,prev+rMult*riskPct));\n'
)
assert OLD_PUSH in html, 'trade push block not found'
html = html.replace(OLD_PUSH, NEW_PUSH, 1)

# ── B+C. insert computation + fix return block ────────────────────────────────
OLD_BEFORE_RET = (
    '    var dd=-_mDD;\n'
    '    return{\n'
    '      trades:trades.length,wins:wins,losses:losses,be:be,\n'
    '      wr:(wr*100).toFixed(2),pf:pf.toFixed(2),\n'
    '      dd:dd.toFixed(2),ret:(totalPnl>=0?\'%2b\':\'\')+totalPnl.toFixed(2),\n'
    '      avg:((totalPnl/trades.length)>=0?\'+\':\'\')+\n'
    '          (totalPnl/trades.length).toFixed(2),\n'
    '      eq:eq,longs:0,shorts:0,lwR:\'—\',swR:\'—\',\n'
    '      bestDir:\'—\',bestSess:\'—\',cfg:cfg,isReal:true,\n'
    '      dataSource:_preCandles?\'extended\':\'chart\',candleCount:candles.length\n'
    '    };\n'
)
# The actual string might have + not %2b, let me try finding it another way
# Let me check what the actual string looks like
assert '    var dd=-_mDD;\n    return{\n      trades:trades.length' in html, 'dd/return anchor not found'

OLD_RET_INNER = (
    '      eq:eq,longs:0,shorts:0,lwR:\'—\',swR:\'—\',\n'
    '      bestDir:\'—\',bestSess:\'—\',cfg:cfg,isReal:true,\n'
    '      dataSource:_preCandles?\'extended\':\'chart\',candleCount:candles.length\n'
)
NEW_RET_INNER = (
    '      eq:eq,\n'
    '      longs:_btLongs,shorts:_btShorts,\n'
    '      lwR:_btLongs>0?(_btLongW/_btLongs*100).toFixed(1):\'—\',\n'
    '      swR:_btShorts>0?(_btShortW/_btShorts*100).toFixed(1):\'—\',\n'
    '      bestDir:_btBestDir,bestSess:_btBestSess,\n'
    '      cfg:cfg,isReal:true,\n'
    '      dataSource:_preCandles?\'extended\':\'chart\',candleCount:candles.length\n'
)
assert OLD_RET_INNER in html, 'return inner block not found'
html = html.replace(OLD_RET_INNER, NEW_RET_INNER, 1)

# insert computation before return
OLD_DD_RET = '    var dd=-_mDD;\n    return{\n      trades:trades.length,'
NEW_DD_RET = (
    '    var dd=-_mDD;\n'
    '    /* compute long/short breakdown and best direction/session */\n'
    '    var _btLongs=0,_btShorts=0,_btLongW=0,_btShortW=0;\n'
    '    var _sessW={asia:0,london:0,ny:0},_sessT={asia:0,london:0,ny:0};\n'
    '    trades.forEach(function(t){\n'
    '      var isW=t.outcome===\'win\';\n'
    '      if(t.side===\'LONG\'){_btLongs++;if(isW)_btLongW++;}\n'
    '      else{_btShorts++;if(isW)_btShortW++;}\n'
    '      var h=t.tsH||0;\n'
    '      if(h>=0&&h<8){_sessT.asia++;if(isW)_sessW.asia++;}\n'
    '      if(h>=8&&h<16){_sessT.london++;if(isW)_sessW.london++;}\n'
    '      if(h>=13&&h<22){_sessT.ny++;if(isW)_sessW.ny++;}\n'
    '    });\n'
    '    var _btBestDir=_btLongs>0&&_btShorts>0?\n'
    '      ((_btLongW/_btLongs)>=(_btShortW/_btShorts)?\'LONG\':\'SHORT\'):\n'
    '      (_btLongs>0?\'LONG\':_btShorts>0?\'SHORT\':\'—\');\n'
    '    var _btSessWR={asia:_sessT.asia>0?_sessW.asia/_sessT.asia:0,\n'
    '      london:_sessT.london>0?_sessW.london/_sessT.london:0,\n'
    '      ny:_sessT.ny>0?_sessW.ny/_sessT.ny:0};\n'
    '    var _btBestSess=\'—\';\n'
    '    if(_sessT.asia>0||_sessT.london>0||_sessT.ny>0){\n'
    '      var _bsArr=Object.keys(_btSessWR).filter(function(k){return _sessT[k]>0;});\n'
    '      _bsArr.sort(function(a,b){return _btSessWR[b]-_btSessWR[a];});\n'
    '      var _bsMap={asia:\'\xc1sia\',london:\'Londres\',ny:\'Nova York\'};\n'
    '      _btBestSess=_bsMap[_bsArr[0]]||\'—\';\n'
    '    }\n'
    '    return{\n'
    '      trades:trades.length,'
)
assert OLD_DD_RET in html, 'dd/return line not found'
html = html.replace(OLD_DD_RET, NEW_DD_RET, 1)

# ── D. _syncAllFromCfg: sync trendFilter → stTBFilterMode ────────────────────
OLD_SYNC_END = (
    '  var _minAtr=cfg.minAtrHvn||0;\n'
    '  if(!skipIndicator)_setSelVal(\'hvnSigMinAtr\',_minAtr>0?parseFloat(_minAtr).toFixed(2):\'0\');\n'
    '  _setSelVal(\'stHvnMinAtr\',_minAtr>0?parseFloat(_minAtr).toFixed(2):\'0\');\n'
    '\n'
    '  /* update S.settings */\n'
)
NEW_SYNC_END = (
    '  var _minAtr=cfg.minAtrHvn||0;\n'
    '  if(!skipIndicator)_setSelVal(\'hvnSigMinAtr\',_minAtr>0?parseFloat(_minAtr).toFixed(2):\'0\');\n'
    '  _setSelVal(\'stHvnMinAtr\',_minAtr>0?parseFloat(_minAtr).toFixed(2):\'0\');\n'
    '  /* trendFilter → stTBFilterMode (add/sub/off) */\n'
    '  if(cfg.trendFilter!==undefined&&cfg.trendFilter!==null)\n'
    '    _setSelVal(\'stTBFilterMode\',cfg.trendFilter);\n'
    '\n'
    '  /* update S.settings */\n'
)
assert OLD_SYNC_END in html, '_syncAllFromCfg minAtrHvn block not found'
html = html.replace(OLD_SYNC_END, NEW_SYNC_END, 1)

# ── E. _applyRankResult: copy period+pair from Optimizer to Backtest ──────────
OLD_APPLY = (
    'function _applyRankResult(i){\n'
    '  if(!_bestCfgs[i])return;\n'
    '  var combo=_bestCfgs[i].c||_bestCfgs[i].cfg||_bestCfgs[i];\n'
    '  _syncAllFromCfg(combo,true);  /* only load into backtest form, not indicator */\n'
)
NEW_APPLY = (
    'function _applyRankResult(i){\n'
    '  if(!_bestCfgs[i])return;\n'
    '  var combo=_bestCfgs[i].c||_bestCfgs[i].cfg||_bestCfgs[i];\n'
    '  /* copy optimizer period + pair to backtest form so they match exactly */\n'
    '  var _optP=_g(\'stOptPeriod\'),_optPair=_g(\'stOptPair\');\n'
    '  var _btP=_g(\'stPeriod\'),_btPair=_g(\'stPair\');\n'
    '  if(_optP&&_btP)_btP.value=_optP.value;\n'
    '  if(_optPair&&_btPair)_btPair.value=_optPair.value;\n'
    '  _syncAllFromCfg(combo,true);  /* only load into backtest form, not indicator */\n'
)
assert OLD_APPLY in html, '_applyRankResult block not found'
html = html.replace(OLD_APPLY, NEW_APPLY, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.119 applied')
