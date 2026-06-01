#!/usr/bin/env python3
"""Beta 0.074 — Deterministic backtest: seeded PRNG + cache"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.073', 'Beta 0.074')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.074\n  - Fix: Clarity and Flow filters now use numeric thresholds',
    '''Beta 0.074
  - Fix: deterministic backtest — replaced Math.random() with Mulberry32 PRNG
    seeded from FNV-1a hash of config (same params → same result every time).
  - Added _btCache keyed by config hash; repeated runs skip re-computation.
  - Optimizer combos each get their own derived seed — ranking is stable.
  - Added DEMO DATA badge + "Results are deterministic" note in Backtest results.
  - Real-data path stubbed: _backtestReal() checks window.S.candles + HVN Signals;
    auto-promoted to REAL DATA when ≥ 50 candles available.

Beta 0.073
  - Fix: Clarity and Flow filters now use numeric thresholds''',
    1
)

# ── 3. DEMO badge in Backtest results HTML ───────────────────────────────────
html = html.replace(
    '      <div id="dvlSTResults" style="display:none;margin-top:4px">\n'
    '        <div class="dvl-st-sl" style="margin-top:16px">RESULTADOS</div>',
    '      <div id="dvlSTResults" style="display:none;margin-top:4px">\n'
    '        <div style="display:flex;align-items:center;gap:7px;margin-top:16px 0 4px">'
    '<span class="dvl-st-sl" style="margin:0">RESULTADOS</span>'
    '<span id="dvlSTDataBadge" style="font-size:7px;font-weight:700;letter-spacing:.1em;'
    'background:rgba(255,180,0,.1);color:#ffb400;border:1px solid rgba(255,180,0,.28);'
    'border-radius:3px;padding:2px 5px;text-transform:uppercase">DEMO DATA</span></div>'
    '<div id="dvlSTDetNote" style="font-size:8px;color:#344a62;margin:3px 0 8px;'
    'letter-spacing:.03em">Results are deterministic for the selected parameters.</div>',
    1
)

# ── 4. replace engine: seeded PRNG + cache + deterministic _backtest ─────────
OLD_ENGINE = r"""/* ── mock backtest engine ──────────────────────────────────────────── */
function _rnd(a,b){return Math.random()*(b-a)+a;}
function _ri(a,b){return Math.floor(_rnd(a,b+1));}

/* parse numeric clarity/flow threshold — returns numeric or null */
function _parseThresh(v){if(v===null||v===undefined||v==='off')return null;var n=parseFloat(v);return isNaN(n)?null:n;}

function _backtest(cfg){
  var ws=parseFloat(cfg.wickSens)||45;
  var clarity=_parseThresh(cfg.trend);
  var flow=_parseThresh(cfg.flow);
  /* threshold strength scales: bigger absolute value = stricter filter = fewer trades, better quality */
  var tradesBase=_ri(130,210);
  if(clarity!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.45,Math.abs(clarity)/120)));
  if(flow!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.35,Math.abs(flow)/120)));
  var trades=Math.max(20,tradesBase);
  var wr=0.50;
  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;
  /* clarity modifiers */
  if(clarity!==null){
    if(clarity>0){wr+=clarity>=30?0.08:clarity>=20?0.06:0.03;}/* positive threshold: LONG quality */
    else{wr+=Math.abs(clarity)>=10?0.07:0.03;}/* negative threshold: SHORT quality */
  }
  /* flow modifiers */
  if(flow!==null){
    if(flow>0){wr+=flow>=30?0.06:flow>=20?0.04:0.02;}
    else{wr+=Math.abs(flow)>=10?0.05:0.02;}
  }
  wr+=_rnd(-0.03,0.03);
  wr=Math.max(0.36,Math.min(0.78,wr));

  var wins=Math.round(trades*wr);
  var losses=Math.round(trades*(1-wr)*0.84);
  var be=trades-wins-losses;
  var riskPct=parseFloat(cfg.risk)||1.0;
  var avgW=_rnd(1.2,1.9),avgL=_rnd(0.7,1.1);
  var pf=Math.max(0.5,Math.min(3.6,(avgW*wr)/(avgL*(1-wr))));
  var ret=(wins*avgW-losses*avgL)*riskPct;
  ret=Math.max(-22,Math.min(42,ret));
  var dd=-_rnd(1.8,8.5);

  /* equity curve */
  var eq=[100];
  for(var i=0;i<trades;i++){
    var prev=eq[eq.length-1];
    var chg=Math.random()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));
    eq.push(Math.max(40,prev+chg));
  }

  var longs=_ri(Math.floor(trades*.42),Math.ceil(trades*.62));
  var shorts=trades-longs;
  var lwR=wr+_rnd(-0.06,0.06),swR=wr+_rnd(-0.06,0.06);
  return{
    trades:trades,wins:wins,losses:losses,be:be,
    wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
    dd:dd.toFixed(2),ret:(ret>=0?'+':'')+ret.toFixed(2),
    avg:((ret/trades)>=0?'+':'')+(ret/trades).toFixed(2),
    eq:eq,longs:longs,shorts:shorts,
    lwR:(lwR*100).toFixed(1),swR:(swR*100).toFixed(1),
    bestDir:lwR>swR?'LONG':'SHORT',
    bestSess:['Asia','London','New York'][_ri(0,2)],
    cfg:cfg
  };
}"""

NEW_ENGINE = r"""/* ── deterministic backtest engine (Beta 0.074) ─────────────────── */

/* Mulberry32 seeded PRNG — same seed → same sequence always */
function _mkRng(seed){
  var s=seed>>>0;
  return function(){
    s=s+0x6D2B79F5|0;
    var t=Math.imul(s^s>>>15,1|s);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}

/* FNV-1a hash of config fields → stable numeric seed */
function _hashCfg(cfg){
  var str=JSON.stringify([
    cfg.wickSens,cfg.trend,cfg.flow,cfg.nextHVN,
    cfg.sl,cfg.tp,cfg.risk,cfg.be,
    cfg.period||'30',cfg.tf||'5m',cfg.pair||'BTC/USDT',
    cfg.close||'outside',cfg.cons||5
  ]);
  var h=0x811c9dc5>>>0;
  for(var i=0;i<str.length;i++){
    h^=str.charCodeAt(i);
    h=Math.imul(h,0x01000193)>>>0;
  }
  return h;
}

/* result cache keyed by config hash — same params never re-computed */
var _btCache={};

/* parse numeric clarity/flow threshold — returns numeric or null */
function _parseThresh(v){if(v===null||v===undefined||v==='off')return null;var n=parseFloat(v);return isNaN(n)?null:n;}

/* attempt real backtest using actual candles + HVN signals if available */
function _backtestReal(cfg){
  try{
    var candles=window.S&&window.S.candles;
    var signals=window.S&&window.S.hvnSignals;
    if(!candles||candles.length<50)return null;
    if(!signals||!signals.length)return null;
    /* ── real path — iterate signals, walk candles ── */
    var riskPct=parseFloat(cfg.risk)||1.0;
    var slMode=cfg.sl||'wick';
    var tpMode=cfg.tp||'hvn';
    var maxCandles=40;
    var trades=[],eq=[100];
    signals.forEach(function(sig){
      if(!sig||!sig.entryPrice)return;
      var entry=sig.entryPrice;
      var isLong=sig.side==='LONG';
      /* SL */
      var sl;
      if(slMode==='wick'){sl=isLong?sig.candle.low:sig.candle.high;}
      else if(slMode==='hvn'){var zone=sig.hvnZone||{lo:entry*0.998,hi:entry*1.002};sl=isLong?zone.lo:zone.hi;}
      else{var atr=entry*0.005;sl=isLong?entry-atr:entry+atr;}
      var slDist=Math.abs(entry-sl)||entry*0.002;
      /* TP */
      var tp;
      if(tpMode==='1r'){tp=isLong?entry+slDist:entry-slDist;}
      else if(tpMode==='1.5r'){tp=isLong?entry+slDist*1.5:entry-slDist*1.5;}
      else if(tpMode==='2r'){tp=isLong?entry+slDist*2:entry-slDist*2;}
      else{/* next HVN */var nz=sig.nextHvnZone||{lo:entry*(isLong?1.012:0.988)};tp=isLong?nz.lo:nz.hi||entry*(isLong?1.012:0.988);}
      /* walk candles */
      var sigIdx=candles.findIndex(function(c){return c.t>=sig.timestamp;});
      if(sigIdx<0)return;
      var outcome='timeout',exitPrice=entry;
      for(var k=sigIdx+1;k<Math.min(sigIdx+maxCandles,candles.length);k++){
        var c=candles[k];
        if(isLong){
          if(c.l<=sl){outcome='loss';exitPrice=sl;break;}
          if(c.h>=tp){outcome='win';exitPrice=tp;break;}
        }else{
          if(c.h>=sl){outcome='loss';exitPrice=sl;break;}
          if(c.l<=tp){outcome='win';exitPrice=tp;break;}
        }
      }
      var pnl=(isLong?(exitPrice-entry)/entry:(entry-exitPrice)/entry)*100*riskPct;
      trades.push({outcome:outcome,pnl:pnl});
      var prev=eq[eq.length-1];
      eq.push(Math.max(10,prev+pnl));
    });
    if(!trades.length)return null;
    var wins=trades.filter(function(t){return t.outcome==='win';}).length;
    var losses=trades.filter(function(t){return t.outcome==='loss';}).length;
    var be=trades.filter(function(t){return t.outcome==='timeout';}).length;
    var totalPnl=trades.reduce(function(a,t){return a+t.pnl;},0);
    var grossW=trades.filter(function(t){return t.pnl>0;}).reduce(function(a,t){return a+t.pnl;},0);
    var grossL=Math.abs(trades.filter(function(t){return t.pnl<0;}).reduce(function(a,t){return a+t.pnl;},0));
    var wr=wins/trades.length;
    var pf=grossL>0?grossW/grossL:grossW>0?9.99:0;
    var minEq=Math.min.apply(null,eq);
    var maxEqBefore=eq.reduce(function(a,v,i){return i>0?Math.max(a,eq[i-1]):a;},eq[0]);
    var dd=((minEq-maxEqBefore)/maxEqBefore*100);
    return{
      trades:trades.length,wins:wins,losses:losses,be:be,
      wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
      dd:dd.toFixed(2),ret:(totalPnl>=0?'+':'')+totalPnl.toFixed(2),
      avg:((totalPnl/trades.length)>=0?'+':'')+(totalPnl/trades.length).toFixed(2),
      eq:eq,longs:0,shorts:0,lwR:'—',swR:'—',
      bestDir:'—',bestSess:'—',cfg:cfg,isReal:true
    };
  }catch(e){return null;}
}

function _backtest(cfg){
  /* try real data first */
  var real=_backtestReal(cfg);
  if(real)return real;

  /* seeded deterministic mock */
  var seed=_hashCfg(cfg);
  var rng=_mkRng(seed);
  function rnd(a,b){return rng()*(b-a)+a;}
  function ri(a,b){return Math.floor(rnd(a,b+0.9999));}

  var ws=parseFloat(cfg.wickSens)||45;
  var clarity=_parseThresh(cfg.trend);
  var flow=_parseThresh(cfg.flow);

  var tradesBase=ri(130,210);
  if(clarity!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.45,Math.abs(clarity)/120)));
  if(flow!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.35,Math.abs(flow)/120)));
  var trades=Math.max(20,tradesBase);

  var wr=0.50;
  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;
  if(clarity!==null){
    if(clarity>0){wr+=clarity>=30?0.08:clarity>=20?0.06:0.03;}
    else{wr+=Math.abs(clarity)>=10?0.07:0.03;}
  }
  if(flow!==null){
    if(flow>0){wr+=flow>=30?0.06:flow>=20?0.04:0.02;}
    else{wr+=Math.abs(flow)>=10?0.05:0.02;}
  }
  wr+=rnd(-0.03,0.03);
  wr=Math.max(0.36,Math.min(0.78,wr));

  var wins=Math.round(trades*wr);
  var losses=Math.round(trades*(1-wr)*0.84);
  var be=trades-wins-losses;
  var riskPct=parseFloat(cfg.risk)||1.0;
  var avgW=rnd(1.2,1.9),avgL=rnd(0.7,1.1);
  var pf=Math.max(0.5,Math.min(3.6,(avgW*wr)/(avgL*(1-wr))));
  var ret=(wins*avgW-losses*avgL)*riskPct;
  ret=Math.max(-22,Math.min(42,ret));
  var dd=-rnd(1.8,8.5);

  var eq=[100];
  for(var i=0;i<trades;i++){
    var prev=eq[eq.length-1];
    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));
    eq.push(Math.max(40,prev+chg));
  }

  var longs=ri(Math.floor(trades*.42),Math.ceil(trades*.62));
  var shorts=trades-longs;
  var lwR=wr+rnd(-0.06,0.06),swR=wr+rnd(-0.06,0.06);
  return{
    trades:trades,wins:wins,losses:losses,be:be,
    wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
    dd:dd.toFixed(2),ret:(ret>=0?'+':'')+ret.toFixed(2),
    avg:((ret/trades)>=0?'+':'')+(ret/trades).toFixed(2),
    eq:eq,longs:longs,shorts:shorts,
    lwR:(lwR*100).toFixed(1),swR:(swR*100).toFixed(1),
    bestDir:lwR>swR?'LONG':'SHORT',
    bestSess:['Asia','London','New York'][ri(0,2)],
    cfg:cfg,isReal:false
  };
}

/* cache wrapper */
function _cachedBacktest(cfg){
  var k=''+_hashCfg(cfg);
  if(_btCache[k])return _btCache[k];
  var r=_backtest(cfg);
  _btCache[k]=r;
  return r;
}"""

assert OLD_ENGINE in html, "OLD_ENGINE block not found"
html = html.replace(OLD_ENGINE, NEW_ENGINE, 1)

# ── 5. run button uses _cachedBacktest + shows real/demo badge ──────────────
OLD_RUN = "      var res=_backtest(cfg);\n      _renderResults(res);"
NEW_RUN = ("      var res=_cachedBacktest(cfg);\n"
           "      _renderResults(res);\n"
           "      /* update data badge */\n"
           "      var db=_g('dvlSTDataBadge');\n"
           "      if(db){if(res.isReal){db.textContent='REAL DATA';db.style.background='rgba(0,200,100,.08)';db.style.color='#00c864';db.style.borderColor='rgba(0,200,100,.25)';}else{db.textContent='DEMO DATA';db.style.background='rgba(255,180,0,.1)';db.style.color='#ffb400';db.style.borderColor='rgba(255,180,0,.28)';}}")
assert OLD_RUN in html, "OLD_RUN not found"
html = html.replace(OLD_RUN, NEW_RUN, 1)

# ── 6. optimizer uses _cachedBacktest ───────────────────────────────────────
OLD_OPT_CALL = "    var r=_backtest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0});"
NEW_OPT_CALL = "    var r=_cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons});"
assert OLD_OPT_CALL in html, "OLD_OPT_CALL not found"
html = html.replace(OLD_OPT_CALL, NEW_OPT_CALL, 1)

# ── 7. save & done ──────────────────────────────────────────────────────────
with open(src, 'w', encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.074 — deterministic backtest applied')
