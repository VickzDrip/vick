#!/usr/bin/env python3
"""Beta 0.124 — FVG e TrendBreak reais no Strategy Tester / Optimizer

Implementações:
  _backtestRealFVG: detecta imbalances 3-candles (OHLCV puro), simula entradas
    na zona com SL/TP configuráveis, respeita minAtr, mitMode, react, reentry, maxAge
  _backtestRealTB: crossover de EMA rápida/lenta nos fechamentos, bias filter,
    suporta exitMode='flip' (saída no próximo sinal oposto) e 'sltp' (SL+TP fixos)
  _btMakeResult: helper compartilhado de stats (wins/losses/PF/DD/LONG/SHORT/sessão)

Alterações:
  A. Inserir _btMakeResult + _backtestRealFVG + _backtestRealTB antes de _backtestFVG
  B. _backtestReal: routing signalType → dispatch para FVG ou TB
  C. Backtest button: skip zonas HVN para FVG/TrendBreak
  D. Optimizer: remover bloqueio FVG/TB; _doOptFVG + _doOptTB com seus combos
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump (todos os campos) ─────────────────────────────────────────
BUMPS = [
    ("var V='Beta 0.123';", "var V='Beta 0.124';"),
    ('<!-- DVL_STRATEGY_TESTER v0.123 -->', '<!-- DVL_STRATEGY_TESTER v0.124 -->'),
    ('window.DVL_APP_VERSION = "Beta 0.123";', 'window.DVL_APP_VERSION = "Beta 0.124";'),
    ('  const LOCAL_VERSION = "Beta 0.123";', '  const LOCAL_VERSION = "Beta 0.124";'),
    ("try{ window.DVL_APP_VERSION='Beta 0.123'; }catch(_){}", "try{ window.DVL_APP_VERSION='Beta 0.124'; }catch(_){}"),
    ("b.textContent='Beta 0.123';});}catch(_){}", "b.textContent='Beta 0.124';});}catch(_){}"),
    ("const VERSION='Beta 0.123';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }",
     "const VERSION='Beta 0.124';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }"),
    ("const VERSION='Beta 0.123';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }",
     "const VERSION='Beta 0.124';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }"),
    ("window.DVL_APP_VERSION='Beta 0.123';", "window.DVL_APP_VERSION='Beta 0.124';"),
    ("if(b)b.textContent='Beta 0.123';", "if(b)b.textContent='Beta 0.124';"),
    ("const VERSION = 'Beta 0.123';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }",
     "const VERSION = 'Beta 0.124';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }"),
    ("var VERSION='Beta 0.123';\n  var KEYS=['flow','clarity'];",
     "var VERSION='Beta 0.124';\n  var KEYS=['flow','clarity'];"),
]
for old, new in BUMPS:
    assert old in html, f'not found: {old[:60]}'
    html = html.replace(old, new, 1)
assert html.count('>Beta 0.123</span>') == 2
html = html.replace('>Beta 0.123</span>', '>Beta 0.124</span>', 2)

# ── 2. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.123\n  - _syncAllFromCfg: sincroniza checkboxes stRuleWick/stRuleClose/stRuleCons\n'
NEW_LOG = (
    'Beta 0.124\n'
    '  - FVG e TrendBreak: backtest real e optimizer desbloqueados\n'
    '    \xb7 _backtestRealFVG: imbalances 3-candles, mitMode, react, reentry, maxAge\n'
    '    \xb7 _backtestRealTB: crossover EMA r\xe1pida/lenta, bias, flip/sltp exit\n'
    'Beta 0.123\n'
    '  - _syncAllFromCfg: sincroniza checkboxes stRuleWick/stRuleClose/stRuleCons\n'
)
assert OLD_LOG in html
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── A. Insert _btMakeResult + _backtestRealFVG + _backtestRealTB ──────────────
NEW_FUNCS = r"""
/* ── shared stats builder for FVG + TB real backtests (Beta 0.124) ── */
function _btMakeResult(trades,eq,cfg,_preCandles,candles){
  var wins=trades.filter(function(t){return t.outcome==='win';}).length;
  var losses=trades.filter(function(t){return t.outcome==='loss';}).length;
  var be=trades.filter(function(t){return t.outcome==='timeout';}).length;
  var totalPnl=trades.reduce(function(a,t){return a+t.pnl;},0);
  var grossW=trades.filter(function(t){return t.pnl>0;}).reduce(function(a,t){return a+t.pnl;},0);
  var grossL=Math.abs(trades.filter(function(t){return t.pnl<0;}).reduce(function(a,t){return a+t.pnl;},0));
  var wr=wins/trades.length;
  var pf=grossL>0?grossW/grossL:grossW>0?9.99:0;
  var _pk=eq[0],_mDD=0;
  for(var _ei=1;_ei<eq.length;_ei++){if(eq[_ei]>_pk)_pk=eq[_ei];var _d=(_pk-eq[_ei])/_pk*100;if(_d>_mDD)_mDD=_d;}
  var dd=-_mDD;
  var _btLongs=0,_btShorts=0,_btLongW=0,_btShortW=0;
  var _sessW={asia:0,london:0,ny:0},_sessT={asia:0,london:0,ny:0};
  trades.forEach(function(t){
    var isW=t.outcome==='win';
    if(t.side==='LONG'){_btLongs++;if(isW)_btLongW++;}else{_btShorts++;if(isW)_btShortW++;}
    var h=t.tsH||0;
    if(h>=0&&h<8){_sessT.asia++;if(isW)_sessW.asia++;}
    if(h>=8&&h<16){_sessT.london++;if(isW)_sessW.london++;}
    if(h>=13&&h<22){_sessT.ny++;if(isW)_sessW.ny++;}
  });
  var _btBestDir=_btLongs>0&&_btShorts>0?
    ((_btLongW/_btLongs)>=(_btShortW/_btShorts)?'LONG':'SHORT'):
    (_btLongs>0?'LONG':_btShorts>0?'SHORT':'—');
  var _btSessWR={asia:_sessT.asia>0?_sessW.asia/_sessT.asia:0,
    london:_sessT.london>0?_sessW.london/_sessT.london:0,
    ny:_sessT.ny>0?_sessW.ny/_sessT.ny:0};
  var _btBestSess='—';
  if(_sessT.asia>0||_sessT.london>0||_sessT.ny>0){
    var _bsArr=Object.keys(_btSessWR).filter(function(k){return _sessT[k]>0;});
    _bsArr.sort(function(a,b){return _btSessWR[b]-_btSessWR[a];});
    var _bsMap={asia:'Ásia',london:'Londres',ny:'Nova York'};
    _btBestSess=_bsMap[_bsArr[0]]||'—';
  }
  return{trades:trades.length,wins:wins,losses:losses,be:be,
    wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
    dd:dd.toFixed(2),ret:(totalPnl>=0?'+':'')+totalPnl.toFixed(2),
    avg:((totalPnl/trades.length)>=0?'+':'')+(totalPnl/trades.length).toFixed(2),
    eq:eq,longs:_btLongs,shorts:_btShorts,
    lwR:_btLongs>0?(_btLongW/_btLongs*100).toFixed(1):'—',
    swR:_btShorts>0?(_btShortW/_btShorts*100).toFixed(1):'—',
    bestDir:_btBestDir,bestSess:_btBestSess,
    cfg:cfg,isReal:true,
    dataSource:_preCandles?'extended':'chart',candleCount:candles.length};
}

/* ── FVG real backtest: 3-candle imbalance zones from pure OHLCV (Beta 0.124) ── */
function _backtestRealFVG(cfg,_preCandles){
  try{
    var candles=_preCandles||(window.S&&window.S.candles)||[];
    if(candles.length<50)return null;
    var minAtrMult=parseFloat(cfg.fvgMinAtr)||0.05;
    var mitMode=cfg.fvgMit||'wick';
    var requireReact=!!cfg.fvgReact;
    var allowReentry=!!cfg.fvgReentry;
    var maxAge=parseInt(cfg.fvgMaxAge)||0;
    var slMode=cfg.sl||'fvg';
    var tpMode=cfg.tp||'fvg';
    var riskPct=parseFloat(cfg.risk)||1.0;
    var maxCdls=60;
    /* period filter */
    var _refT=candles[candles.length-1].t||0;
    var _tScale=_refT>9999999999?1:1000;
    var _ftFrom=0,_ftTo=Infinity;
    if(cfg.dateFrom&&cfg.dateTo){
      _ftFrom=new Date(cfg.dateFrom).getTime()/(_tScale===1?1:1000);
      _ftTo=(new Date(cfg.dateTo).getTime()+86400000)/(_tScale===1?1:1000);
    }else if(cfg.period){
      var _pdSec=Math.max(1,parseInt(cfg.period)||30)*86400;
      _ftTo=_refT;_ftFrom=_refT-(_tScale===1?_pdSec*1000:_pdSec);
    }
    /* ATR-14 helper */
    var _atrCache={};
    function _atr14(i){
      if(_atrCache[i])return _atrCache[i];
      var s=Math.max(1,i-14),sum=0,cnt=0;
      for(var k=s;k<=i;k++){
        var tr=Math.max(candles[k].h-candles[k].l,
          k>0?Math.abs(candles[k].h-candles[k-1].c):0,
          k>0?Math.abs(candles[k].l-candles[k-1].c):0);
        sum+=tr;cnt++;
      }
      return(_atrCache[i]=cnt>0?sum/cnt:candles[i].c*0.005);
    }
    /* detect FVG zones: 3-candle imbalance (visible after candle i+1 closes) */
    var fvgs=[];
    for(var i=1;i<candles.length-1;i++){
      var atrI=_atr14(i);
      if(candles[i+1].l>candles[i-1].h){
        var gap=candles[i+1].l-candles[i-1].h;
        if(gap>=atrI*minAtrMult)
          fvgs.push({side:'LONG',lo:candles[i-1].h,hi:candles[i+1].l,born:i+1,filled:false});
      }
      if(candles[i+1].h<candles[i-1].l){
        var gap=candles[i-1].l-candles[i+1].h;
        if(gap>=atrI*minAtrMult)
          fvgs.push({side:'SHORT',lo:candles[i+1].h,hi:candles[i-1].l,born:i+1,filled:false});
      }
    }
    if(!fvgs.length)return null;
    var trades=[],eq=[100],fi0=0;
    for(var ci=2;ci<candles.length;ci++){
      var c=candles[ci];
      if(_ftFrom>0&&(c.t<_ftFrom||c.t>_ftTo))continue;
      var taken=false;
      for(var fi=fi0;fi<fvgs.length&&!taken;fi++){
        var fvg=fvgs[fi];
        if(ci<=fvg.born)continue;
        if(maxAge>0&&(ci-fvg.born)>maxAge){fvg.filled=true;continue;}
        if(fvg.filled&&!allowReentry)continue;
        var isL=fvg.side==='LONG';
        var hit=mitMode==='wick'?
          (isL?(c.l<=fvg.hi&&c.l>=fvg.lo*0.999):(c.h>=fvg.lo&&c.h<=fvg.hi*1.001)):
          (isL?(c.c<=fvg.hi&&c.c>=fvg.lo):(c.c>=fvg.lo&&c.c<=fvg.hi));
        if(!hit)continue;
        if(requireReact&&ci+1<candles.length){
          var nxt=candles[ci+1];
          if(isL&&nxt.c<nxt.o)continue;
          if(!isL&&nxt.c>nxt.o)continue;
        }
        var entry=isL?fvg.hi:fvg.lo;
        var atrC=_atr14(ci);
        var sl=slMode==='wick'?(isL?c.l:c.h):slMode==='fvg'?(isL?fvg.lo:fvg.hi):(isL?entry-atrC:entry+atrC);
        var slDist=Math.abs(entry-sl)||entry*0.002;
        var tp=tpMode==='1r'?(isL?entry+slDist:entry-slDist):
          tpMode==='1.5r'?(isL?entry+slDist*1.5:entry-slDist*1.5):
          tpMode==='2r'?(isL?entry+slDist*2:entry-slDist*2):
          (isL?entry+slDist*2:entry-slDist*2);
        var outcome='timeout',exitPrice=entry;
        var startK=requireReact?ci+2:ci+1;
        for(var k=startK;k<Math.min(ci+maxCdls,candles.length);k++){
          var ck=candles[k];
          if(isL){if(ck.l<=sl){outcome='loss';exitPrice=sl;break;}if(ck.h>=tp){outcome='win';exitPrice=tp;break;}}
          else{if(ck.h>=sl){outcome='loss';exitPrice=sl;break;}if(ck.l<=tp){outcome='win';exitPrice=tp;break;}}
        }
        var rMult=outcome==='win'?Math.abs(exitPrice-entry)/slDist:outcome==='loss'?-1:
          (isL?(exitPrice-entry):(entry-exitPrice))/slDist;
        var tsH=new Date(c.t>9999999999?c.t:c.t*1000).getUTCHours();
        trades.push({outcome:outcome,pnl:rMult*riskPct,side:isL?'LONG':'SHORT',tsH:tsH});
        var prev=eq[eq.length-1];eq.push(Math.max(10,prev+rMult*riskPct));
        fvg.filled=true;taken=true;
      }
      while(fi0<fvgs.length&&fvgs[fi0].filled&&(!allowReentry))fi0++;
    }
    if(!trades.length)return null;
    return _btMakeResult(trades,eq,cfg,_preCandles,candles);
  }catch(e){return null;}
}

/* ── TrendBreak real backtest: EMA crossover on close prices (Beta 0.124) ── */
function _backtestRealTB(cfg,_preCandles){
  try{
    var candles=_preCandles||(window.S&&window.S.candles)||[];
    if(candles.length<50)return null;
    var fast=Math.max(2,parseInt(cfg.tbFast)||3);
    var slow=Math.max(fast+1,parseInt(cfg.tbSlow)||10);
    var biasMin=Math.max(0,parseFloat(cfg.tbBias)||0);
    var exitMode=cfg.tbExit||'flip';
    var slMode=cfg.sl||'wick';
    var tpMode=cfg.tp||'2r';
    var riskPct=parseFloat(cfg.risk)||1.0;
    /* period filter */
    var _refT=candles[candles.length-1].t||0;
    var _tScale=_refT>9999999999?1:1000;
    var _ftFrom=0,_ftTo=Infinity;
    if(cfg.dateFrom&&cfg.dateTo){
      _ftFrom=new Date(cfg.dateFrom).getTime()/(_tScale===1?1:1000);
      _ftTo=(new Date(cfg.dateTo).getTime()+86400000)/(_tScale===1?1:1000);
    }else if(cfg.period){
      var _pdSec=Math.max(1,parseInt(cfg.period)||30)*86400;
      _ftTo=_refT;_ftFrom=_refT-(_tScale===1?_pdSec*1000:_pdSec);
    }
    /* EMA of closes */
    function _ema(period){
      var k=2/(period+1),r=[candles[0].c];
      for(var i=1;i<candles.length;i++)r.push(candles[i].c*k+r[i-1]*(1-k));
      return r;
    }
    var fEma=_ema(fast),sEma=_ema(slow);
    /* ATR-14 */
    function _atr14(i){
      var s=Math.max(1,i-14),sum=0,cnt=0;
      for(var k=s;k<=i;k++){
        var tr=Math.max(candles[k].h-candles[k].l,
          k>0?Math.abs(candles[k].h-candles[k-1].c):0,
          k>0?Math.abs(candles[k].l-candles[k-1].c):0);
        sum+=tr;cnt++;
      }
      return cnt>0?sum/cnt:candles[i].c*0.005;
    }
    /* detect crossovers */
    var signals=[];
    for(var i=slow+1;i<candles.length;i++){
      if(_ftFrom>0&&(candles[i].t<_ftFrom||candles[i].t>_ftTo))continue;
      var pf=fEma[i-1],ps=sEma[i-1],cf=fEma[i],cs=sEma[i];
      var biasAmt=Math.abs(cf-cs)/cs*100;
      if(biasAmt<biasMin)continue;
      if(pf<=ps&&cf>cs)signals.push({idx:i,side:'LONG',c:candles[i]});
      else if(pf>=ps&&cf<cs)signals.push({idx:i,side:'SHORT',c:candles[i]});
    }
    if(!signals.length)return null;
    var trades=[],eq=[100];
    for(var si=0;si<signals.length;si++){
      var sig=signals[si];
      var isL=sig.side==='LONG';
      var entry=sig.c.c;
      var atrV=_atr14(sig.idx);
      var sl=slMode==='wick'?(isL?sig.c.l:sig.c.h):slMode==='atr'?(isL?entry-atrV:entry+atrV):(isL?entry-atrV*0.5:entry+atrV*0.5);
      var slDist=Math.abs(entry-sl)||entry*0.002;
      var tp=null;
      if(tpMode==='1r')tp=isL?entry+slDist:entry-slDist;
      else if(tpMode==='1.5r')tp=isL?entry+slDist*1.5:entry-slDist*1.5;
      else if(tpMode==='2r')tp=isL?entry+slDist*2:entry-slDist*2;
      else if(tpMode==='flip')tp=null;
      else tp=isL?entry+slDist*2:entry-slDist*2;
      var flipEnd=candles.length-1;
      if(exitMode==='flip'&&si+1<signals.length)flipEnd=signals[si+1].idx;
      var endK=Math.min(flipEnd,sig.idx+200);
      var outcome='timeout',exitPrice=entry;
      for(var k=sig.idx+1;k<=endK&&k<candles.length;k++){
        var ck=candles[k];
        if(isL){
          if(ck.l<=sl){outcome='loss';exitPrice=sl;break;}
          if(tp&&ck.h>=tp){outcome='win';exitPrice=tp;break;}
          if(exitMode==='flip'&&k===endK){exitPrice=ck.c;outcome=exitPrice>entry?'win':'loss';break;}
        }else{
          if(ck.h>=sl){outcome='loss';exitPrice=sl;break;}
          if(tp&&ck.l<=tp){outcome='win';exitPrice=tp;break;}
          if(exitMode==='flip'&&k===endK){exitPrice=ck.c;outcome=exitPrice<entry?'win':'loss';break;}
        }
      }
      var rMult=outcome==='win'?Math.abs(exitPrice-entry)/slDist:outcome==='loss'?-1:
        (isL?(exitPrice-entry):(entry-exitPrice))/slDist;
      var tsH=new Date(sig.c.t>9999999999?sig.c.t:sig.c.t*1000).getUTCHours();
      trades.push({outcome:outcome,pnl:rMult*riskPct,side:sig.side,tsH:tsH});
      var prev=eq[eq.length-1];eq.push(Math.max(10,prev+rMult*riskPct));
    }
    if(!trades.length)return null;
    return _btMakeResult(trades,eq,cfg,_preCandles,candles);
  }catch(e){return null;}
}

"""

OLD_FVG_MOCK = 'function _backtestFVG(cfg){\n  var seed=_hashCfg(cfg);\n'
assert OLD_FVG_MOCK in html, '_backtestFVG anchor not found'
html = html.replace(OLD_FVG_MOCK, NEW_FUNCS + OLD_FVG_MOCK, 1)

# ── B. _backtestReal: dispatch FVG / TB at top ────────────────────────────────
OLD_BT_REAL = (
    '/* real backtest: generates signals internally from candles+zones (Beta 0.117) */\n'
    'function _backtestReal(cfg,_preCandles,_preZones){\n'
    '  try{\n'
    '    var candles=_preCandles||(window.S&&window.S.candles)||[];\n'
)
NEW_BT_REAL = (
    '/* real backtest: generates signals internally from candles+zones (Beta 0.117) */\n'
    'function _backtestReal(cfg,_preCandles,_preZones){\n'
    '  if(cfg.signalType===\'fvgConf\')return _backtestRealFVG(cfg,_preCandles);\n'
    '  if(cfg.signalType===\'trendBreak\')return _backtestRealTB(cfg,_preCandles);\n'
    '  try{\n'
    '    var candles=_preCandles||(window.S&&window.S.candles)||[];\n'
)
assert OLD_BT_REAL in html, '_backtestReal opening not found'
html = html.replace(OLD_BT_REAL, NEW_BT_REAL, 1)

# ── C. Backtest button: skip zones for FVG/TB ─────────────────────────────────
OLD_ZONES_BLOCK = (
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
NEW_ZONES_BLOCK = (
    '      var _needsZones=cfg.signalType===\'hvnSignals\'||!cfg.signalType;\n'
    '      if(_needsZones){\n'
    '        if(!zones||!zones.length){\n'
    '          zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '            (window.__hvnZones?window.__hvnZones():[]);\n'
    '          /* cache zones back for next backtest run */\n'
    '          if(window.DVLBacktestData&&window.DVLBacktestData.candles===candles)window.DVLBacktestData.zones=zones;\n'
    '        }\n'
    '        if(!zones||!zones.length){\n'
    '          _setBadge(\'NO HISTORY\',\'#ff4d6a\',\'rgba(255,77,106,.08)\',\'rgba(255,77,106,.25)\',\n'
    '            \'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue o gr\xe1fico.\',\n'
    '            \'rgba(255,77,106,.8)\');\n'
    '          return;\n'
    '        }\n'
    '      }\n'
    '      var res=_backtestReal(cfg,candles,zones);\n'
)
assert OLD_ZONES_BLOCK in html, 'zones block not found'
html = html.replace(OLD_ZONES_BLOCK, NEW_ZONES_BLOCK, 1)

# ── D. Optimizer: remove FVG/TB block, add _doOptFVG/_doOptTB, update fetch ──

# D1. Remove early return for FVG/TB
OLD_EARLY = (
    '  if(_isFvgOpt||_isTBOpt){\n'
    '    if(status){status.style.color=\'#ff4d6a\';\n'
    '      status.textContent=\'Backtest real dispon\xedvel apenas para HVN Signals. FVG e TrendBreak em desenvolvimento.\';}\n'
    '    return;\n'
    '  }\n'
)
assert OLD_EARLY in html, 'optimizer FVG/TB early return not found'
html = html.replace(OLD_EARLY, '', 1)

# D2. Insert _doOptFVG and _doOptTB before _optFail
DONE_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12">'
            '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83'
            'l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 '
            '19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 '
            '0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 '
            '2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 '
            '1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65'
            ' 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> AUTO OPTIMIZE')

OLD_OPT_FAIL = '  function _optFail(msg){\n'
assert OLD_OPT_FAIL in html, '_optFail anchor not found'

NEW_DO_OPT_FVG_TB = (
    '  function _doOptGeneric(combos,buildCfg){\n'
    '    var results=[],total=combos.length,done=0;\n'
    '    function step(){\n'
    '      if(done>=total){\n'
    '        _allOptResults=results;_reRankResults();\n'
    '        runBtn.disabled=false;\n'
    "        runBtn.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" width=\"12\" height=\"12\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z\"/></svg> AUTO OPTIMIZE';\n"
    '        if(prog)prog.classList.remove(\'show\');\n'
    '        if(status)status.textContent=results.length>0?\n'
    '          \'Conclu\xeddo: \'+results.length+\' combina\xe7\xf5es com trades reais.\':\n'
    '          \'Nenhuma combina\xe7\xe3o gerou trades. Verifique o per\xedodo e par\xe2metros.\';\n'
    '        return;\n'
    '      }\n'
    '      var batch=Math.min(15,total-done);\n'
    '      for(var _b=0;_b<batch;_b++){\n'
    '        var comboCfg=buildCfg(combos[done]);\n'
    '        var r=_backtestReal(comboCfg,_optCandles);\n'
    '        if(r&&r.trades>0)results.push({c:combos[done],trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});\n'
    '        done++;\n'
    '      }\n'
    '      if(bar)bar.style.width=(done/total*100)+\'%\';\n'
    '      if(status)status.textContent=\'Testando combina\xe7\xe3o \'+done+\' de \'+total+\'...\';\n'
    '      setTimeout(step,4);\n'
    '    }\n'
    '    step();\n'
    '  }\n'
    '  function _doOptFVG(candles){\n'
    '    _optCandles=candles;\n'
    '    _doOptGeneric(FVG_OPT_COMBOS,function(c){\n'
    '      return{fvgMinAtr:c.minAtr||0.05,fvgMit:c.mitMode||\'wick\',\n'
    '        fvgReact:!!c.react,fvgReentry:c.reentry!==false,fvgMaxAge:c.maxAge||0,\n'
    '        sl:c.sl||\'fvg\',tp:c.tp||\'fvg\',risk:1.0,period:String(_optPeriod),signalType:\'fvgConf\'};\n'
    '    });\n'
    '  }\n'
    '  function _doOptTB(candles){\n'
    '    _optCandles=candles;\n'
    '    _doOptGeneric(TB_OPT_COMBOS,function(c){\n'
    '      return{tbFast:c.fast||3,tbSlow:c.slow||10,tbBias:c.bias||0,\n'
    '        tbExit:c.exitMode||\'flip\',sl:c.sl||\'wick\',tp:c.tp||\'2r\',\n'
    '        risk:1.0,period:String(_optPeriod),signalType:\'trendBreak\'};\n'
    '    });\n'
    '  }\n'
    '  function _optFail(msg){\n'
)
html = html.replace(OLD_OPT_FAIL, NEW_DO_OPT_FVG_TB, 1)

# D3. Need _optCandles variable declared near _optPeriod/_optTf
OLD_OPT_VARS = (
    '  var _optPeriod=parseInt((_g(\'stOptPeriod\')||{value:\'30\'}).value)||30;\n'
    '  var _optTf=(_g(\'stOptTf\')||{value:\'5m\'}).value||\'5m\';\n'
    '  var sym=(window.S&&window.S.sym)||\'BTCUSDT\';\n'
)
NEW_OPT_VARS = (
    '  var _optPeriod=parseInt((_g(\'stOptPeriod\')||{value:\'30\'}).value)||30;\n'
    '  var _optTf=(_g(\'stOptTf\')||{value:\'5m\'}).value||\'5m\';\n'
    '  var sym=(window.S&&window.S.sym)||\'BTCUSDT\';\n'
    '  var _optCandles=[];\n'
)
assert OLD_OPT_VARS in html, 'optimizer vars block not found'
html = html.replace(OLD_OPT_VARS, NEW_OPT_VARS, 1)

# D4. Update fetch callback to route FVG/TB (skip zones)
OLD_FETCH_CB = (
    '  _dvlFetchBTCandles(sym,_optTf,_optPeriod,\'\',\'\').then(function(candles){\n'
    '    var zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '      (window.__hvnZones?window.__hvnZones():[]);\n'
    '    if(!candles||candles.length<50)return _optFail(\'Hist\xf3rico insuficiente (\'+(('
    'candles&&candles.length)||0)+\' candles). Aumente o per\xedodo.\');\n'
    '    if(!zones||!zones.length)return _optFail(\'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue.\');\n'
    '    /* save zones so backtest can reuse same data set */\n'
    '    if(window.DVLBacktestData)window.DVLBacktestData.zones=zones;\n'
    '    if(status)status.textContent=\'Hist\xf3rico: \'+candles.length+\' candles. Gerando sinais...\';\n'
    '    _doOpt(candles,zones);\n'
    '  }).catch(function(){\n'
    '    var candles=(window.S&&window.S.candles)||[];\n'
    '    var zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '      (window.__hvnZones?window.__hvnZones():[]);\n'
    '    if(!candles.length||!zones.length)return _optFail(\'Sem hist\xf3rico dispon\xedvel. Verifique a conex\xe3o.\');\n'
    '    if(status)status.textContent=\'Candles do gr\xe1fico (\'+candles.length+\'). Gerando sinais...\';\n'
    '    _doOpt(candles,zones);\n'
    '  });\n'
)
NEW_FETCH_CB = (
    '  _dvlFetchBTCandles(sym,_optTf,_optPeriod,\'\',\'\').then(function(candles){\n'
    '    if(!candles||candles.length<50)return _optFail(\'Hist\xf3rico insuficiente (\'+(('
    'candles&&candles.length)||0)+\' candles). Aumente o per\xedodo.\');\n'
    '    if(_isTBOpt){if(status)status.textContent=\'Hist\xf3rico: \'+candles.length+\' candles. Testando TrendBreak...\';_doOptTB(candles);return;}\n'
    '    if(_isFvgOpt){if(status)status.textContent=\'Hist\xf3rico: \'+candles.length+\' candles. Testando FVG...\';_doOptFVG(candles);return;}\n'
    '    var zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '      (window.__hvnZones?window.__hvnZones():[]);\n'
    '    if(!zones||!zones.length)return _optFail(\'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue.\');\n'
    '    /* save zones so backtest can reuse same data set */\n'
    '    if(window.DVLBacktestData)window.DVLBacktestData.zones=zones;\n'
    '    if(status)status.textContent=\'Hist\xf3rico: \'+candles.length+\' candles. Gerando sinais...\';\n'
    '    _doOpt(candles,zones);\n'
    '  }).catch(function(){\n'
    '    var candles=(window.S&&window.S.candles)||[];\n'
    '    if(!candles.length)return _optFail(\'Sem hist\xf3rico dispon\xedvel. Verifique a conex\xe3o.\');\n'
    '    if(_isTBOpt){if(status)status.textContent=\'Candles do gr\xe1fico (\'+candles.length+\'). TrendBreak...\';_doOptTB(candles);return;}\n'
    '    if(_isFvgOpt){if(status)status.textContent=\'Candles do gr\xe1fico (\'+candles.length+\'). FVG...\';_doOptFVG(candles);return;}\n'
    '    var zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '      (window.__hvnZones?window.__hvnZones():[]);\n'
    '    if(!candles.length||!zones.length)return _optFail(\'Sem hist\xf3rico dispon\xedvel. Verifique a conex\xe3o.\');\n'
    '    if(status)status.textContent=\'Candles do gr\xe1fico (\'+candles.length+\'). Gerando sinais...\';\n'
    '    _doOpt(candles,zones);\n'
    '  });\n'
)
assert OLD_FETCH_CB in html, 'optimizer fetch callback not found'
html = html.replace(OLD_FETCH_CB, NEW_FETCH_CB, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.124 applied')
