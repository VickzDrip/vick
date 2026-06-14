/* DVL Strategy Tester */
(function(){
'use strict';
var V='Beta 0.312';
var panel=document.getElementById('dvlSTPanel');
var scrim=document.getElementById('dvlSTScrim');
var rpBtn=document.getElementById('rpStrategyTester');

function open(){
  if(!panel)return;
  panel.classList.add('show');
  if(scrim)scrim.classList.add('show');
  if(rpBtn)rpBtn.classList.add('active');
  try{var s=document.getElementById('stTf');if(s&&window.S&&window.S.tf)s.value=window.S.tf;}catch(_){}
  try{var _i=document.getElementById('stInd');if(_i&&typeof _stSwitchInd==='function')_stSwitchInd(_i.value);}catch(_){}
  try{
    /* default date range: today - 1 year → today */
    var _td=new Date(),_ty=new Date(_td);
    _ty.setFullYear(_td.getFullYear()-1);
    function _fmtD(d){return d.toISOString().slice(0,10);}
    var _df=document.getElementById('stDateFrom'),_dt=document.getElementById('stDateTo');
    if(_df&&!_df.value)_df.value=_fmtD(_ty);
    if(_dt&&!_dt.value)_dt.value=_fmtD(_td);
  }catch(_){}
  _updateSigStatus();
  _syncLiveStats();
}
function close(){
  if(!panel)return;
  panel.classList.remove('show');
  if(scrim)scrim.classList.remove('show');
  if(rpBtn)rpBtn.classList.remove('active');
}

function _updateSigStatus(){
  var el=_g('dvlSTSigStatus');if(!el)return;
  var cnt=(window.S&&window.S.hvnSignals)?window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}).length:0;
  el.textContent='Sinais no gráfico: '+cnt;
  el.style.color=cnt>0?'rgba(0,200,100,.7)':'#344a62';
}

/* live stats auto-refresh */
setInterval(function(){
  var panel=_g('dvlSTPanel');
  if(panel&&panel.classList.contains('show'))_syncLiveStats();
},800);

/* tab switching */
var TAB_MAP={backtest:'dvlSTTabBacktest',optimizer:'dvlSTTabOptimizer',livestats:'dvlSTTabLiveStats'};
document.querySelectorAll('.dvl-st-tab').forEach(function(t){
  t.addEventListener('click',function(){
    document.querySelectorAll('.dvl-st-tab').forEach(function(x){x.classList.remove('active');});
    document.querySelectorAll('.dvl-st-tc').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active');
    var tc=document.getElementById(TAB_MAP[t.dataset.sttab]);
    if(tc)tc.classList.add('active');
  });
});

/* optimizer param list */
var OPT_PARAMS=[
  {n:'Pavio mínimo',v:'30% · 35% · 40% · 45% · 50% · 55% · 60%',key:'w'},
  {n:'Regra de fechamento',v:'Fora da zona · Além do meio · Corpo forte',key:'close'},
  {n:'Consolidação (candles)',v:'3 · 5 · 8 · 12',key:'cons'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20',key:'trend'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20',key:'flow'},
  {n:'Dist. próxima HVN',v:'Sem filtro · 0.25% · 0.35% · 0.50%',key:'hvn'},
  {n:'Volume spike',v:'Desativado · ×1.5 · ×2.0',key:'volSpike'},
  {n:'Padrão do Sinal',v:'Wick Rejection · Dive & Recover · Engolfing · Todos',key:'mode'},
  {n:'Stop Loss',v:'Pavio · HVN · ATR',key:'sl'},
  {n:'Take Profit',v:'Próx. HVN · 1R · 1.5R · 2R · 0.5% · 1% · 1.5% · 2% · 3%',key:'tp'},
  {n:'TF das Zonas HVN',v:'5m · 15m · 1h · 4h · 1D (testado pelo optimizer)',key:'tf'},
  {n:'Filtro TB',v:'Off · Adicional · Substitui',key:'trendFilter'},
  {n:'Tamanho mín. ATR',v:'Off · 0.05 · 0.10 · 0.15 · 0.20 · 0.25 · 0.30',key:'minAtrHvn'},
];
var FVG_OPT_PARAMS=[
  {n:'Gap mín. ATR×',v:'0.05 · 0.08 · 0.10 · 0.15 · 0.20',key:'minAtr'},
  {n:'Mitigação',v:'Wick · Close',key:'mitMode'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20 · > +30',key:'trend'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20 · > +30',key:'flow'},
  {n:'Exigir Reação',v:'Sim · Não',key:'react'},
  {n:'Exigir Re-entry',v:'Sim · Não',key:'reentry'},
  {n:'Volume Spike',v:'Desativado · ×1.5 · ×2.0',key:'volSpike'},
  {n:'Stop Loss',v:'Pavio · Borda do FVG · ATR',key:'sl'},
  {n:'Take Profit',v:'Próx. FVG · 1R · 1.5R · 2R',key:'tp'},
  {n:'Idade máx. FVG',v:'Sem limite · 100 · 200 · 300 barras',key:'maxAge'},
  {n:'Filtro TB',v:'Off · Adicional · Substitui',key:'trendFilter'},
];
var TB_OPT_PARAMS=[
  {n:'Período rápido MA',v:'2 · 3 · 5 · 7 · 10',key:'fast'},
  {n:'Período lento MA',v:'8 · 10 · 14 · 20 · 30',key:'slow'},
  {n:'Bias mínimo',v:'0 · 3 · 5 · 10 · 15',key:'bias'},
  {n:'Modo saída',v:'Flip (virada) · SL/TP',key:'exitMode'},
  {n:'Stop Loss',v:'Pavio · ATR · Fixo ATR×1.5',key:'sl'},
  {n:'Take Profit',v:'1R · 1.5R · 2R · Próx. virada',key:'tp'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20',key:'trend'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20',key:'flow'},
  {n:'Volume Spike',v:'Desativado · ×1.5 · ×2.0',key:'volSpike'},
];
var _optLockedKeys=new Set();
function _getLockedVal(key,ind){
  var g=function(id){var e=document.getElementById(id);return e?e.value:null;};
  var isFvg=ind==='fvgConf',isTB=ind==='trendBreak';
  if(isFvg){
    if(key==='minAtr'){var v=g('stFvgMinAtr');return v!==null?parseFloat(v):null;}
    if(key==='mitMode')return g('stFvgMit');
    if(key==='react'){var v=g('stFvgReact');return v!==null?(v==='1'):null;}
    if(key==='reentry'){var v=g('stFvgReentry');return v!==null?(v==='1'):null;}
    if(key==='maxAge'){var v=g('stFvgMaxAge');return v!==null?parseInt(v):null;}
    if(key==='volSpike')return g('stFVol');
    if(key==='sl')return g('stSL');
    if(key==='tp')return g('stTP');
    if(key==='trendFilter')return g('stTBFilterMode');
    return null;
  }
  if(isTB){
    if(key==='fast'){var v=g('stTBFast');return v!==null?parseInt(v):null;}
    if(key==='slow'){var v=g('stTBSlow');return v!==null?parseInt(v):null;}
    if(key==='bias'){var v=g('stTBBias');return v!==null?parseInt(v):null;}
    if(key==='exitMode')return g('stTBExit');
    if(key==='sl')return g('stSL');
    if(key==='tp')return g('stTP');
    if(key==='volSpike')return g('stFVol');
    return null;
  }
  if(key==='w'){var v=g('stWickSens');return v!==null?parseInt(v):null;}
  if(key==='cons'){var v=g('stMaxCandles');return v!==null?parseInt(v):null;}
  if(key==='hvn'){var v=g('stNextHVN');var fv=v!==null?parseFloat(v):null;return(fv!==null&&!isNaN(fv))?fv:null;}
  if(key==='mode')return g('stMode');
  if(key==='sl')return g('stSL');
  if(key==='tp')return g('stTP');
  if(key==='trendFilter')return g('stTBFilterMode');
  if(key==='minAtrHvn'){var v=g('stHvnMinAtr');return v!==null?parseFloat(v):null;}
  if(key==='tf'){var v=g('stOptTf');return v?v.toLowerCase():null;}
  if(key==='volSpike')return g('stFVol');
  return null;
}
function _comboValMatch(c,key,lv){
  var cv=c[key];
  if(key==='hvn'||key==='minAtrHvn'){
    if(lv===0)return !cv||cv===0;
    return Math.abs((parseFloat(cv)||0)-lv)<0.0001;
  }
  if(key==='tf')return (String(cv||'')).toLowerCase()===(String(lv||'')).toLowerCase();
  if(key==='react'||key==='reentry')return !!cv===!!lv;
  if(typeof lv==='number')return parseFloat(cv)===lv;
  return String(cv||'')===String(lv||'');
}
function _filterOptCombos(combos,ind){
  if(!_optLockedKeys||!_optLockedKeys.size)return combos;
  return combos.filter(function(c){
    var ok=true;
    _optLockedKeys.forEach(function(key){
      if(!ok)return;
      var lv=_getLockedVal(key,ind);
      if(lv===null||lv===undefined)return;
      if(!combos.some(function(x){return _comboValMatch(x,key,lv);}))return;
      if(!_comboValMatch(c,key,lv))ok=false;
    });
    return ok;
  });
}
function _updateOptComboCount(){
  if(typeof OPT_COMBOS==='undefined'||!OPT_COMBOS)return;
  var ind=(_g('stInd')||{value:'hvnSignals'}).value;
  var isFvg=ind==='fvgConf',isTB=ind==='trendBreak';
  var all=isFvg?FVG_OPT_COMBOS:(isTB?TB_OPT_COMBOS:OPT_COMBOS);
  if(!all||!all.length)return;
  var filtered=_filterOptCombos(all,ind);
  var el=_g('dvlSTOptComboCount');if(!el)return;
  var nOff=_optLockedKeys?_optLockedKeys.size:0;
  if(filtered.length<all.length){
    el.textContent=filtered.length+' / '+all.length+' combinações  ('+nOff+' parâm. fixo'+(nOff!==1?'s':'')+')';
    el.style.color='#b08800';
  } else {
    el.textContent=all.length+' combinações';
    el.style.color='#344a62';
  }
}
function _stRenderOptParams(params){
  var c=document.getElementById('dvlSTOptParams');if(!c)return;
  c.innerHTML='';
  var _pd=document.getElementById('stOptPeriod');
  var _pdTxt=_pd?_pd.options[_pd.selectedIndex].text:'30 dias';
  var _pRow=document.createElement('div');_pRow.className='dvl-st-oparam';
  _pRow.innerHTML='<span class="dvl-st-opn">Período</span><span class="dvl-st-opv">'+_pdTxt+'</span>';
  c.appendChild(_pRow);
  params.forEach(function(p){
    var locked=!!(p.key&&_optLockedKeys.has(p.key));
    var d=document.createElement('div');
    d.className='dvl-st-oparam'+(locked?' dvl-st-oparam-locked':'');
    if(p.key){
      d.innerHTML='<button class="dvl-st-optog'+(locked?' locked':'')+'" data-optkey="'+p.key+'">'
        +(locked?'OFF':'ON')+'</button>'
        +'<span class="dvl-st-opn" style="flex:1;margin:0 5px">'+p.n+'</span>'
        +'<span class="dvl-st-opv">'+(locked?'<i style="color:#9a7700;font-style:normal">fixo — valor atual</i>':p.v)+'</span>';
    } else {
      d.innerHTML='<span class="dvl-st-opn">'+p.n+'</span><span class="dvl-st-opv">'+p.v+'</span>';
    }
    c.appendChild(d);
  });
  _updateOptComboCount();
}
var _ST_IND_NAMES={hvnSignals:'HVN SIGNALS',fvgConf:'FVG CONFLUENCE',trendBreak:'TREND BREAK'};

function _stApplySigLabel(done){
  var ind=(_g('stInd')||{value:'hvnSignals'}).value;
  var name=_ST_IND_NAMES[ind]||ind.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase();
  var svgPlay='<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><polygon points="5,3 19,12 5,21"/></svg>';
  var svgWave='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
  return done?svgPlay+' APLICADO AO '+name+' ✓':svgWave+' APLICAR AO '+name;
}

function _stSwitchInd(v){
  var isFvg=v==='fvgConf',isTB=v==='trendBreak';
  var hvn=document.getElementById('stHVNFields'),fvg=document.getElementById('stFVGFields'),tb=document.getElementById('stTBFields');
  if(hvn)hvn.style.display=(!isFvg&&!isTB)?'':'none';
  if(fvg)fvg.style.display=isFvg?'':'none';
  if(tb)tb.style.display=isTB?'':'none';
  var tfrow=document.getElementById('stTrendFilterRow');
  if(tfrow)tfrow.style.display=isTB?'none':'';
  var lbl=document.getElementById('stTfLbl');
  if(lbl)lbl.textContent=isFvg?'TF dos FVGs':(isTB?'Timeframe':'TF das Zonas HVN');
  var sl=document.getElementById('stSL');
  if(sl){sl.innerHTML=isFvg?
    '<option value="wick" selected>Atrás do pavio</option><option value="fvg">Borda do FVG</option><option value="atr">ATR</option>':
    (isTB?'<option value="wick" selected>Atrás do pavio</option><option value="atr">ATR</option><option value="fixed">Fixo (ATR×1.5)</option>':
    '<option value="wick" selected>Atrás do pavio</option><option value="hvn">Atrás da HVN</option><option value="atr">ATR</option>');}
  var tp=document.getElementById('stTP');
  if(tp){tp.innerHTML=isFvg?
    '<option value="fvg" selected>Próximo FVG</option><option value="1r">1R</option><option value="1.5r">1.5R</option><option value="2r">2R</option><option value="0.5pct">0.5%</option><option value="1pct">1.0%</option><option value="1.5pct">1.5%</option><option value="2pct">2.0%</option><option value="3pct">3.0%</option>':
    (isTB?'<option value="flip">Na próxima virada</option><option value="1r" selected>1R</option><option value="1.5r">1.5R</option><option value="2r">2R</option><option value="0.5pct">0.5%</option><option value="1pct">1.0%</option><option value="1.5pct">1.5%</option><option value="2pct">2.0%</option><option value="3pct">3.0%</option>':
    '<option value="hvn" selected>Próxima HVN</option><option value="1r">1R</option><option value="1.5r">1.5R</option><option value="2r">2R</option><option value="0.5pct">0.5%</option><option value="1pct">1.0%</option><option value="1.5pct">1.5%</option><option value="2pct">2.0%</option><option value="3pct">3.0%</option>');}
  var nhr=document.getElementById('stNextHVNRow');
  if(nhr)nhr.style.display=(isFvg||isTB)?'none':'';
  _optLockedKeys.clear();_stRenderOptParams(isFvg?FVG_OPT_PARAMS:(isTB?TB_OPT_PARAMS:OPT_PARAMS));
  for(var k in _btCache)delete _btCache[k];
  var _asb=document.getElementById('dvlSTApplySig');
  if(_asb)_asb.innerHTML=_stApplySigLabel(false);
}
function _stTBFilterChange(v){
  var bf=document.getElementById('stTBFilterBiasField');
  var pr=document.getElementById('stTBFilterPeriodRow');
  var show=v!=='off';
  if(bf)bf.style.display=show?'':'none';
  if(pr)pr.style.display=show?'':'none';
}
(function(){
  var c=document.getElementById('dvlSTOptParams');
  if(!c)return;
  _stRenderOptParams(OPT_PARAMS);
  c.addEventListener('click',function(ev){
    var btn=ev.target.closest?ev.target.closest('.dvl-st-optog'):null;
    if(!btn&&ev.target.classList&&ev.target.classList.contains('dvl-st-optog'))btn=ev.target;
    if(!btn)return;
    var key=btn.getAttribute('data-optkey');if(!key)return;
    if(_optLockedKeys.has(key))_optLockedKeys.delete(key);else _optLockedKeys.add(key);
    var ind=(_g('stInd')||{value:'hvnSignals'}).value;
    _stRenderOptParams(ind==='fvgConf'?FVG_OPT_PARAMS:(ind==='trendBreak'?TB_OPT_PARAMS:OPT_PARAMS));
  });
})();
document.addEventListener('change',function(ev){
  if(ev.target&&ev.target.id==='stOptPeriod'){
    var ind=document.getElementById('stInd');
    var v=ind?ind.value:'hvnSignals';
    _stRenderOptParams(v==='fvgConf'?FVG_OPT_PARAMS:(v==='trendBreak'?TB_OPT_PARAMS:OPT_PARAMS));
  }
});

/* ── real backtest engine ─────────────────────────────── */

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
    cfg.close||'outside',cfg.cons||5,cfg.volSpike||'off',
    cfg.dateFrom||'',cfg.dateTo||'',
    cfg.mode||'wick',cfg.diveMin||2,
    cfg.signalType||'hvnSignals',
    cfg.fvgMinAtr||0.08,cfg.fvgMit||'wick',
    cfg.fvgReact?1:0,cfg.fvgReentry?1:0,cfg.fvgMaxAge||300,
    cfg.tbFast||3,cfg.tbSlow||10,cfg.tbBias||5,cfg.tbExit||'flip',
    cfg.trendFilter||'off',cfg.tfBias||5,cfg.tfFast||3,cfg.tfSlow||10,
    cfg.hvnMinAtr||0,cfg.tp||''
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

/* ── historical candle cache + backtest data store ── */
var _dvlBTCache=new Map();
window.DVLBacktestData={candles:[],zones:[],symbol:"",timeframe:"",periodDays:0,from:0,to:0,source:"none"};

/* TF → Binance native interval name (null = not natively available) */
var _TF_BINANCE={'1s':'1s','1m':'1m','2m':null,'3m':'3m','5m':'5m','15m':'15m','30m':'30m',
  '1h':'1h','2h':'2h','4h':'4h','6h':'6h','8h':'8h','12h':'12h',
  '1d':'1d','1D':'1d','3d':'3d','1w':'1w','1W':'1w','1M':'1M',
  '15s':null,'30s':null};
/* TF → milliseconds per candle (crypto 24/7) */
var _TF_MS={'1s':1000,'1m':60000,'3m':180000,'5m':300000,'15m':900000,'30m':1800000,
  '1h':3600000,'2h':7200000,'4h':14400000,'6h':21600000,'8h':28800000,'12h':43200000,
  '1d':86400000,'1D':86400000,'3d':259200000,'1w':604800000,'1W':604800000,'1M':2592000000};
async function _dvlFetchBTCandles(sym,tf,periodDays,dateFrom,dateTo,onProgress){
  /* validate: 15s/30s are synthetic, not natively on Binance */
  if(Object.prototype.hasOwnProperty.call(_TF_BINANCE,tf)&&_TF_BINANCE[tf]===null){
    var _e=new Error('TF não suportado: '+tf);
    _e.unsupportedTF=true;_e.tf=tf;
    window.DVLBacktestData={candles:[],zones:[],symbol:sym,timeframe:tf,
      periodDays:periodDays||30,from:0,to:0,source:'unsupported_tf',
      historyStatus:'UNSUPPORTED_TF',expectedCandles:0,loadedCandles:0};
    throw _e;
  }
  var normTf=(_TF_BINANCE[tf])||tf;
  var now=Date.now();
  /* round toMs to nearest closed hour for stable cache key */
  var _rawTo=dateTo?new Date(dateTo).getTime()+86400000:now;
  var toMs=dateTo?_rawTo:Math.floor(_rawTo/3600000)*3600000;
  var fromMs=dateFrom?new Date(dateFrom).getTime():toMs-(Math.max(1,periodDays||30)*86400000);
  var ckey=sym+'|'+normTf+'|'+fromMs+'|'+toMs;
  if(_dvlBTCache.has(ckey)){
    var _c=_dvlBTCache.get(ckey);
    window.DVLBacktestData={candles:_c,zones:[],symbol:sym,timeframe:tf,
      periodDays:periodDays||30,from:fromMs,to:toMs,source:'fetched',
      historyStatus:_c._hs||'REAL_HISTORY',
      expectedCandles:_c._exp||_c.length,loadedCandles:_c.length};
    return _c;
  }
  /* expected candle count — crypto is 24/7 */
  var tfCandleMs=_TF_MS[tf]||300000;
  var expectedCandles=Math.max(1,Math.round((toMs-fromMs)/tfCandleMs));
  var candles=[],cursor=fromMs;
  while(cursor<toMs){
    var url='https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+normTf+
      '&startTime='+cursor+'&endTime='+toMs+'&limit=1000';
    var r=await fetch(url);
    if(!r.ok)throw new Error('Klines '+r.status);
    var batch=await r.json();
    if(!Array.isArray(batch)||!batch.length)break;
    batch.forEach(function(x){candles.push({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()});});
    if(onProgress)onProgress(candles.length,expectedCandles);
    var lastT=+batch[batch.length-1][0];
    if(batch.length<1000)break;
    cursor=lastT+1;
  }
  var historyStatus=candles.length>=expectedCandles*0.9?'REAL_HISTORY':'LIMITED_HISTORY';
  candles._hs=historyStatus;candles._exp=expectedCandles;
  _dvlBTCache.set(ckey,candles);
  window.DVLBacktestData={candles:candles,zones:[],symbol:sym,timeframe:tf,
    periodDays:periodDays||30,from:fromMs,to:toMs,source:'fetched',
    historyStatus:historyStatus,expectedCandles:expectedCandles,loadedCandles:candles.length};
  return candles;
}

/* parse numeric clarity/flow threshold — returns numeric or null */
function _parseThresh(v){if(v===null||v===undefined||v==='off')return null;if(typeof v==='string'&&v.indexOf('both')===0){var n=parseFloat(v.slice(4));return isNaN(n)?null:n;}var n=parseFloat(v);return isNaN(n)?null:n;}
function _isBothThresh(v){return typeof v==='string'&&v.indexOf('both')===0;}

/* Backtest must avoid lookahead bias.
   HVN zones computed from historical candles — valid as zones are structural
   price levels that accumulate over time and are visible in real-time. */
function _dvlGenHVNSigs(candles,zones,cfg){
  if(!candles||!candles.length||!zones||!zones.length)return[];
  var n=candles.length;
  var signals=new Array(n).fill(null);
  var minW=(parseFloat(cfg.wickSens)||45)/100;
  var sens=minW*0.4;
  var cooldown=parseInt(cfg.cooldown||cfg.cons)||5;
  var allowLat=(cfg.allowLat!==false);
  var diveMin=parseInt(cfg.diveMin)||2;
  var mode=cfg.mode||'wick';
  var volSpike=cfg.volSpike||'off';
  var minAtrHvn=parseFloat(cfg.minAtrHvn||cfg.hvnMinAtr)||0;
  var doWick=(mode==='wick'||mode==='all');
  var doDive=(mode==='dive'||mode==='all');
  var doEngulf=(mode==='engulf'||mode==='all');
  var _vA=new Float32Array(n);
  if(volSpike&&volSpike!=='off'){
    var _vs=0;
    for(var vi=0;vi<n;vi++){_vA[vi]=vi>0?_vs/Math.min(vi,20):0;_vs+=(candles[vi].v||0);if(vi>=20)_vs-=(candles[vi-20].v||0);}
  }
  var _a14=new Float32Array(n);
  if(minAtrHvn>0){
    var _as=0;
    for(var _ai=0;_ai<n;_ai++){
      var _ca=candles[_ai],_pc=_ai>0?candles[_ai-1].c:_ca.o;
      var _tr=Math.max(_ca.h-_ca.l,Math.abs(_ca.h-_pc),Math.abs(_ca.l-_pc));
      _as+=_tr;
      if(_ai>=14){var _oa=candles[_ai-14],_op=_ai>14?candles[_ai-15].c:_oa.o;
        _as-=Math.max(_oa.h-_oa.l,Math.abs(_oa.h-_op),Math.abs(_oa.l-_op));}
      _a14[_ai]=_as/Math.min(_ai+1,14);
    }
  }
  for(var zi=0;zi<zones.length;zi++){
    var z=zones[zi];var zSz=z.hi-z.lo;if(zSz<=0)continue;
    var tol=zSz*sens,latCnt=0,lastSI=-999;
    for(var i=0;i<n;i++){
      var c=candles[i];
      var bL=Math.min(c.o,c.c),bH=Math.max(c.o,c.c),cR=c.h-c.l;
      if(cR<=0){latCnt=0;continue;}
      if(bH>=z.lo&&bL<=z.hi){latCnt++;continue;}
      var cOK=(i-lastSI>=cooldown);
      var lOK=(allowLat||latCnt===0);
      var vOK=(volSpike==='off'||!volSpike||_vA[i]<=0||(c.v||0)>=parseFloat(volSpike)*_vA[i]);
      var aOK=(minAtrHvn<=0||cR>=minAtrHvn*_a14[i]);
      if(doWick){
        if(c.h>=z.lo&&c.c<z.lo+tol&&bL<z.lo){
          var uW=c.h-Math.max(c.o,c.c),wP=uW/cR;
          if(wP>=minW&&cOK&&lOK&&vOK&&aOK){if(!signals[i]||Math.abs(signals[i]._s||0)<wP){signals[i]={type:'short',kind:latCnt>=1?'lateral':'rejection',zone:z,wickPct:wP,_s:wP};lastSI=i;}}
        }else if(c.l<=z.hi&&c.c>z.hi-tol&&bH>z.hi){
          var lW=Math.min(c.o,c.c)-c.l,wP=lW/cR;
          if(wP>=minW&&cOK&&lOK&&vOK&&aOK){if(!signals[i]||Math.abs(signals[i]._s||0)<wP){signals[i]={type:'long',kind:latCnt>=1?'lateral':'rejection',zone:z,wickPct:wP,_s:wP};lastSI=i;}}
        }
      }
      if(doDive&&latCnt>=diveMin&&cOK&&vOK&&aOK){
        if(bL>=z.hi&&c.c>c.o){var _d=(c.c-c.o)/(c.h-c.l||1);if(!signals[i]||signals[i]._s<_d){signals[i]={type:'long',subtype:'recover',zone:z,_s:_d};lastSI=i;}}
        if(bH<=z.lo&&c.c<c.o){var _d=(c.o-c.c)/(c.h-c.l||1);if(!signals[i]||signals[i]._s<_d){signals[i]={type:'short',subtype:'recover',zone:z,_s:_d};lastSI=i;}}
      }
      if(doEngulf&&i>0&&cOK&&vOK&&aOK){
        var _pv=candles[i-1],_pvL=Math.min(_pv.o,_pv.c),_pvH=Math.max(_pv.o,_pv.c);
        if(_pvH>=z.lo&&_pvL<=z.hi){
          if(c.c>c.o&&_pv.c<_pv.o&&c.o<=_pv.c&&c.c>=_pv.o){var _d=(c.c-c.o)/(_pvH-_pvL||1);if(!signals[i]||signals[i]._s<_d){signals[i]={type:'long',subtype:'engulf',zone:z,_s:_d};lastSI=i;}}
          if(c.c<c.o&&_pv.c>_pv.o&&c.o>=_pv.c&&c.c<=_pv.o){var _d=(c.o-c.c)/(_pvH-_pvL||1);if(!signals[i]||signals[i]._s<_d){signals[i]={type:'short',subtype:'engulf',zone:z,_s:_d};lastSI=i;}}
        }
      }
      latCnt=0;
    }
  }
  var result=[];
  for(var _si=0;_si<n;_si++){
    var _sg=signals[_si];if(!_sg)continue;
    var _sc=candles[_si];
    _sg.side=_sg.type==='long'?'LONG':'SHORT';
    _sg.timestamp=_sc.t;
    _sg.entryPrice=_sc.c;
    _sg.candle=_sc;
    _sg.hvnZone=_sg.zone;
    var _rt;
    if(_sg.subtype==='recover'){_rt='Dive & Recover';}
    else if(_sg.subtype==='engulf'){_rt='Engolfing';}
    else if(_sg.kind==='lateral'){_rt=(_sg.type==='long')?'Lateral zone support rejection':'Lateral zone resistance rejection';}
    else{_rt=(_sg.type==='long')?'Support rejection':'Resistance rejection';}
    _sg.rejectionType=_rt;
    _sg.id='sig_'+_sc.t+'_'+_sg.type.charAt(0);
    _sg.idx=_si;
    if(_sg.zone&&!_sg.zone.price)_sg.zone.price=(_sg.zone.lo+_sg.zone.hi)/2;
    var _isL=(_sg.type==='long'),_nz=null,_nzD=Infinity;
    for(var _zj=0;_zj<zones.length;_zj++){
      var _z=zones[_zj];
      if(_isL&&_z.lo>_sg.zone.hi){var _zd=_z.lo-_sg.zone.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}
      else if(!_isL&&_z.hi<_sg.zone.lo){var _zd=_sg.zone.lo-_z.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}
    }
    _sg.nextHvnZone=_nz;
    if(_nz&&!_nz.price)_nz.price=(_nz.lo+_nz.hi)/2;
    result.push(_sg);
  }
  return result;
}

/* real backtest: routes to HVN, FVG or TB engine */
function _backtestReal(cfg,_preCandles,_preZones,_preSafe){
  if(cfg.signalType==='fvgConf')return _backtestRealFVG(cfg,_preCandles);
  if(cfg.signalType==='trendBreak')return _backtestRealTB(cfg,_preCandles);
  try{
    var candles=_preCandles||(window.S&&window.S.candles)||[];
    if(candles.length<50)return null;
    var zones=_preZones;
    if(!zones){
      /* lookahead-safe: compute zones only from warmup (40% or min 500 candles) */
      var _wuEnd=Math.min(candles.length,Math.max(500,Math.floor(candles.length*0.4)));
      var _wuC=_wuEnd<candles.length?candles.slice(0,_wuEnd):candles;
      zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_wuC):
        (window.__hvnZones?window.__hvnZones():[]);
      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=true;
    }else{
      /* _preSafe=true means zones were fetched from before the test period */
      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=!!_preSafe;
    }
    if(!zones||!zones.length)return null;
    /* generate signals internally from candles+zones — no dependency on plotted signals */
    var sigCfg={
      wickSens:parseFloat(cfg.wickSens)||45,
      cooldown:parseInt(cfg.cons)||5,
      allowLat:true,
      diveMin:parseInt(cfg.diveMin)||2,
      mode:cfg.mode||'wick',
      volSpike:cfg.volSpike||'off',
      hvnMinAtr:parseFloat(cfg.hvnMinAtr)||0
    };
    var signals=_dvlGenHVNSigs(candles,zones,sigCfg);
    if(!signals.length)return null;
    var _sigGenCount=signals.filter(function(s){return s&&s.entryPrice;}).length;
    /* period filter — auto-detect timestamp unit */
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
    var riskPct=parseFloat(cfg.risk)||1.0;
    var slMode=cfg.sl||'wick';
    var tpMode=cfg.tp||'hvn';
    var maxCdls=40;
    var trades=[],eq=[100];
    signals.forEach(function(sig){
      if(!sig||!sig.entryPrice)return;
      if(_ftFrom>0&&(sig.timestamp<_ftFrom||sig.timestamp>_ftTo))return;
      var entry=sig.entryPrice,isLong=sig.side==='LONG';
      var sl;
      if(slMode==='wick'){sl=isLong?sig.candle.l:sig.candle.h;}
      else if(slMode==='hvn'){var _z=sig.hvnZone||{lo:entry*0.998,hi:entry*1.002};sl=isLong?_z.lo:_z.hi;}
      else{var atr=entry*0.005;sl=isLong?entry-atr:entry+atr;}
      var slDist=Math.abs(entry-sl)||entry*0.002;
      var tp;
      if(tpMode==='1r'){tp=isLong?entry+slDist:entry-slDist;}
      else if(tpMode==='1.5r'){tp=isLong?entry+slDist*1.5:entry-slDist*1.5;}
      else if(tpMode==='2r'){tp=isLong?entry+slDist*2:entry-slDist*2;}
      else if(typeof tpMode==='string'&&tpMode.indexOf('pct')>-1){var _pV=parseFloat(tpMode)/100;tp=isLong?entry*(1+_pV):entry*(1-_pV);}
      else{var nz=sig.nextHvnZone||{lo:entry*(isLong?1.012:0.988)};tp=isLong?nz.lo:nz.hi||entry*(isLong?1.012:0.988);}
      var sigIdx=sig.idx!==undefined?sig.idx:
        candles.findIndex(function(c){return c.t>=sig.timestamp;});
      if(sigIdx<0)return;
      var outcome='timeout',exitPrice=entry;
      for(var k=sigIdx+1;k<Math.min(sigIdx+maxCdls,candles.length);k++){
        var c=candles[k];
        /* conservative: check SL before TP when both hit same candle */
        if(isLong){if(c.l<=sl){outcome='loss';exitPrice=sl;break;}if(c.h>=tp){outcome='win';exitPrice=tp;break;}}
        else{if(c.h>=sl){outcome='loss';exitPrice=sl;break;}if(c.l<=tp){outcome='win';exitPrice=tp;break;}}
      }
      var rMult;
      if(outcome==='win'){rMult=Math.abs(exitPrice-entry)/slDist;}
      else if(outcome==='loss'){rMult=-1;}
      else{var _tmo=isLong?(exitPrice-entry):(entry-exitPrice);rMult=_tmo/slDist;}
      var _tsH=new Date((sig.timestamp>9999999999?sig.timestamp:sig.timestamp*1000)).getUTCHours();
      trades.push({outcome:outcome,pnl:rMult*riskPct,side:isLong?'LONG':'SHORT',tsH:_tsH});
      var prev=eq[eq.length-1];eq.push(Math.max(10,prev+rMult*riskPct));
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
    var _pk=eq[0],_mDD=0;
    for(var _ei=1;_ei<eq.length;_ei++){if(eq[_ei]>_pk)_pk=eq[_ei];var _d=(_pk-eq[_ei])/_pk*100;if(_d>_mDD)_mDD=_d;}
    var dd=-_mDD;
    /* compute long/short breakdown and best direction/session */
    var _btLongs=0,_btShorts=0,_btLongW=0,_btShortW=0;
    var _sessW={asia:0,london:0,ny:0},_sessT={asia:0,london:0,ny:0};
    trades.forEach(function(t){
      var isW=t.outcome==='win';
      if(t.side==='LONG'){_btLongs++;if(isW)_btLongW++;}
      else{_btShorts++;if(isW)_btShortW++;}
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
    return{
      trades:trades.length,wins:wins,losses:losses,be:be,
      wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
      dd:dd.toFixed(2),ret:(totalPnl>=0?'+':'')+totalPnl.toFixed(2),
      avg:((totalPnl/trades.length)>=0?'+':'')+(totalPnl/trades.length).toFixed(2),
      eq:eq,
      longs:_btLongs,shorts:_btShorts,
      lwR:_btLongs>0?(_btLongW/_btLongs*100).toFixed(1):'—',
      swR:_btShorts>0?(_btShortW/_btShorts*100).toFixed(1):'—',
      bestDir:_btBestDir,bestSess:_btBestSess,
      cfg:cfg,isReal:true,
      signalsGenerated:_sigGenCount,
      dataSource:_preCandles?'extended':'chart',candleCount:candles.length
    };
  }catch(e){return null;}
}


/* ── shared stats builder for FVG + TB real backtests (Beta 0.312) ── */
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
    signalsGenerated:trades.length,
    dataSource:_preCandles?'extended':'chart',candleCount:candles.length};
}

/* ── FVG real backtest: 3-candle imbalance zones from pure OHLCV (Beta 0.312) ── */
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

/* ── TrendBreak real backtest: EMA crossover on close prices (Beta 0.312) ── */
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

function _backtestFVG(cfg){
  var seed=_hashCfg(cfg);
  var rng=_mkRng(seed);
  function rnd(a,b){return rng()*(b-a)+a;}
  function ri(a,b){return Math.floor(rnd(a,b+0.9999));}
  var clarity=_parseThresh(cfg.trend);
  var flow=_parseThresh(cfg.flow);
  var _bothTrend=_isBothThresh(cfg.trend),_bothFlow=_isBothThresh(cfg.flow);
  var _days=Math.max(7,parseInt(cfg.period)||30);
  var _pScale=Math.sqrt(_days/30);
  var tradesBase=Math.round(ri(16,28)*_pScale);
  var _minAtr=parseFloat(cfg.fvgMinAtr)||0.08;
  if(_minAtr<=0.05)tradesBase=Math.round(tradesBase*1.45);
  else if(_minAtr>=0.20)tradesBase=Math.round(tradesBase*0.40);
  else if(_minAtr>=0.15)tradesBase=Math.round(tradesBase*0.55);
  else if(_minAtr>=0.10)tradesBase=Math.round(tradesBase*0.75);
  if(cfg.fvgMit==='close')tradesBase=Math.round(tradesBase*0.78);
  if(clarity!==null&&!_bothTrend)tradesBase=Math.round(tradesBase*(1-Math.min(0.40,Math.abs(clarity)/110)));
  if(flow!==null&&!_bothFlow)tradesBase=Math.round(tradesBase*(1-Math.min(0.30,Math.abs(flow)/110)));
  var _vs=parseFloat(cfg.volSpike||'0')||0;
  if(_vs>1)tradesBase=Math.round(tradesBase*(1-Math.min(0.50,(_vs-1)*0.45)));
  if(cfg.fvgReact)tradesBase=Math.round(tradesBase*0.72);
  if(cfg.fvgReentry)tradesBase=Math.round(tradesBase*0.83);
  var _maxAge=parseInt(cfg.fvgMaxAge)||0;
  if(_maxAge>0&&_maxAge<=100)tradesBase=Math.round(tradesBase*0.62);
  else if(_maxAge>0&&_maxAge<=200)tradesBase=Math.round(tradesBase*0.80);
  var trades=Math.max(5,tradesBase);
  var _tbf=cfg.trendFilter||'off';
  if(_tbf==='add')trades=Math.max(4,Math.round(trades*0.72));
  else if(_tbf==='sub')trades=Math.max(3,Math.round(trades*0.45));
  var wr=0.51;
  if(clarity!==null){
    if(clarity>0){wr+=clarity>=30?0.09:clarity>=20?0.07:0.04;}
    else{wr+=Math.abs(clarity)>=10?0.07:0.04;}
  }
  if(flow!==null){
    if(flow>0){wr+=flow>=30?0.07:flow>=20?0.05:0.03;}
    else{wr+=Math.abs(flow)>=10?0.06:0.03;}
  }
  if(_vs>=2.0)wr+=0.06;else if(_vs>=1.5)wr+=0.04;
  if(cfg.fvgReact)wr+=0.07;
  if(cfg.fvgReentry)wr+=0.04;
  if(cfg.fvgMit==='close')wr+=0.03;
  if(_minAtr>=0.15)wr+=0.05;else if(_minAtr>=0.10)wr+=0.03;
  if(_tbf==='add')wr+=0.06;else if(_tbf==='sub')wr+=0.11;
  wr+=rnd(-0.03,0.03);
  wr=Math.max(0.38,Math.min(0.80,wr));
  var wins=Math.round(trades*wr);
  var losses=Math.round(trades*(1-wr)*0.84);
  var be=trades-wins-losses;
  var riskPct=parseFloat(cfg.risk)||1.0;
  var avgW=rnd(1.3,2.0),avgL=rnd(0.6,1.0);
  var pf=Math.max(0.80,Math.min(2.85,0.88+(wr-0.50)*7.8+rnd(-0.08,0.08)));
  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;
  var ret=Math.pow(trades,0.75)*_ev*2.5*rnd(0.80,1.20);
  ret=Math.max(-90,Math.min(300,ret));
  var eq=[100];
  for(var i=0;i<trades;i++){
    var prev=eq[eq.length-1];
    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));
    eq.push(Math.max(40,prev+chg));
  }
  var _pk0=eq[0],_mDD0=0;
  for(var _ei0=1;_ei0<eq.length;_ei0++){if(eq[_ei0]>_pk0)_pk0=eq[_ei0];var _d0=(_pk0-eq[_ei0])/_pk0*100;if(_d0>_mDD0)_mDD0=_d0;}
  var dd=-_mDD0;
  var longs=ri(Math.floor(trades*.45),Math.ceil(trades*.60));
  var shorts=trades-longs;
  var lwR=wr+rnd(-0.06,0.06),swR=wr+rnd(-0.06,0.06);
  return{trades:trades,wins:wins,losses:losses,be:be,
    wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
    dd:dd.toFixed(2),ret:(ret>=0?'+':'')+ret.toFixed(2),
    avg:((ret/trades)>=0?'+':'')+(ret/trades).toFixed(2),
    eq:eq,longs:longs,shorts:shorts,
    lwR:(lwR*100).toFixed(1),swR:(swR*100).toFixed(1),
    bestDir:lwR>swR?'LONG':'SHORT',
    bestSess:['Asia','London','New York'][ri(0,2)],
    cfg:cfg,isReal:false};
}

function _backtestTrendBreak(cfg){
  var seed=_hashCfg(cfg);
  var rng=_mkRng(seed);
  function rnd(a,b){return rng()*(b-a)+a;}
  function ri(a,b){return Math.floor(rnd(a,b+0.9999));}
  var _days=Math.max(7,parseInt(cfg.period)||30);
  var _pScale=Math.sqrt(_days/30);
  var fast=parseInt(cfg.tbFast)||3,slow=parseInt(cfg.tbSlow)||10;
  var bias=parseFloat(cfg.tbBias)||5;
  var exitMode=cfg.tbExit||'flip';
  var tradesBase=Math.round(ri(5,12)*_pScale*(6/Math.max(3,slow)));
  tradesBase=Math.max(3,tradesBase);
  var trades=tradesBase;
  var wr;
  if(exitMode==='flip'){wr=0.46+rnd(-0.04,0.04);}
  else{wr=0.54+rnd(-0.03,0.03);}
  if(bias>=10)wr+=0.05;
  if(fast<=3&&slow>=10)wr+=0.03;
  wr=Math.max(0.34,Math.min(0.76,wr));
  var wins=Math.round(trades*wr);
  var losses=Math.round(trades*(1-wr)*0.88);
  var be=Math.max(0,trades-wins-losses);
  var riskPct=parseFloat(cfg.risk)||1.0;
  var avgW=exitMode==='flip'?rnd(2.0,3.5):rnd(1.4,2.2);
  var avgL=rnd(0.6,1.1);
  var pf=Math.max(0.70,Math.min(3.20,(wr/(1-wr||0.01))*avgW/avgL));
  var _ev=(wr*avgW-(1-wr)*avgL)*riskPct*0.60;
  var ret=Math.pow(trades,0.75)*_ev*2.5*rnd(0.80,1.20);
  ret=Math.max(-90,Math.min(300,ret));
  var eq=[100];
  for(var i=0;i<trades;i++){
    var prev=eq[eq.length-1];
    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));
    eq.push(Math.max(40,prev+chg));
  }
  var _pk1=eq[0],_mDD1=0;
  for(var _ei1=1;_ei1<eq.length;_ei1++){if(eq[_ei1]>_pk1)_pk1=eq[_ei1];var _d1=(_pk1-eq[_ei1])/_pk1*100;if(_d1>_mDD1)_mDD1=_d1;}
  var dd=-_mDD1;
  var longs=ri(Math.floor(trades*.40),Math.ceil(trades*.65));
  var shorts=trades-longs;
  var lwR=wr+rnd(-0.08,0.08),swR=wr+rnd(-0.08,0.08);
  return{trades:trades,wins:wins,losses:losses,be:be,
    wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
    dd:dd.toFixed(2),ret:(ret>=0?'+':'')+ret.toFixed(2),
    avg:((ret/trades)>=0?'+':'')+(ret/trades).toFixed(2),
    eq:eq,longs:longs,shorts:shorts,
    lwR:(lwR*100).toFixed(1),swR:(swR*100).toFixed(1),
    bestDir:lwR>swR?'LONG':'SHORT',
    bestSess:['Asia','London','New York'][ri(0,2)],
    cfg:cfg,isReal:false};
}

function _backtest(cfg){
  /* real data only — no mock fallback */
  var real=_backtestReal(cfg);
  if(real)return real;
  /* FVG / TrendBreak: no real signal generator yet */
  if(cfg.signalType==='trendBreak'||cfg.signalType==='fvgConf')return null;

  /* seeded deterministic mock */
  var seed=_hashCfg(cfg);
  var rng=_mkRng(seed);
  function rnd(a,b){return rng()*(b-a)+a;}
  function ri(a,b){return Math.floor(rnd(a,b+0.9999));}

  var ws=parseFloat(cfg.wickSens)||45;
  var clarity=_parseThresh(cfg.trend);
  var flow=_parseThresh(cfg.flow);
  var _bothTrend=_isBothThresh(cfg.trend),_bothFlow=_isBothThresh(cfg.flow);

  var _days=Math.max(7,parseInt(cfg.period)||30);
  var _pScale=Math.sqrt(_days/30);
  var tradesBase=Math.round(ri(130,210)*_pScale);
  if(clarity!==null&&!_bothTrend)tradesBase=Math.round(tradesBase*(1-Math.min(0.45,Math.abs(clarity)/120)));
  if(flow!==null&&!_bothFlow)tradesBase=Math.round(tradesBase*(1-Math.min(0.35,Math.abs(flow)/120)));
  var _vs=parseFloat(cfg.volSpike||'0')||0;
  if(_vs>1)tradesBase=Math.round(tradesBase*(1-Math.min(0.58,(_vs-1)*0.5)));
  var _mode=cfg.mode||'wick';
  if(_mode==='dive')tradesBase=Math.round(tradesBase*0.52);
  else if(_mode==='engulf')tradesBase=Math.round(tradesBase*0.32);
  else if(_mode==='all')tradesBase=Math.round(tradesBase*1.28);
  var _minAtrHvn=parseFloat(cfg.hvnMinAtr)||0;
  if(_minAtrHvn>0)tradesBase=Math.round(tradesBase*(1-Math.min(0.65,_minAtrHvn*2.2)));
  var trades=Math.max(8,tradesBase);
  var _tbf=cfg.trendFilter||'off';
  if(_tbf==='add')trades=Math.max(5,Math.round(trades*0.72));
  else if(_tbf==='sub')trades=Math.max(4,Math.round(trades*0.45));

  var wr=0.50;
  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;
  var _tpPct=(typeof cfg.tp==='string'&&cfg.tp.indexOf('pct')>-1)?parseFloat(cfg.tp):0;
  if(_tpPct>0){
    if(_tpPct<=0.5){wr+=0.10;trades=Math.max(6,Math.round(trades*0.80));}
    else if(_tpPct<=1){wr+=0.06;trades=Math.max(6,Math.round(trades*0.90));}
    else if(_tpPct<=1.5){wr+=0.03;}
    else if(_tpPct<=2){wr-=0.02;}
    else{wr-=0.06;trades=Math.max(6,Math.round(trades*1.10));}
  }
  if(clarity!==null){
    if(clarity>0){wr+=clarity>=30?0.08:clarity>=20?0.06:0.03;}
    else{wr+=Math.abs(clarity)>=10?0.07:0.03;}
  }
  if(flow!==null){
    if(flow>0){wr+=flow>=30?0.06:flow>=20?0.04:0.02;}
    else{wr+=Math.abs(flow)>=10?0.05:0.02;}
  }
  if(_vs>=2.0)wr+=0.07;else if(_vs>=1.5)wr+=0.05;else if(_vs>=1.2)wr+=0.02;
  if(_mode==='dive')wr+=0.06;else if(_mode==='engulf')wr+=0.09;else if(_mode==='all')wr-=0.01;
  if(_tbf==='add')wr+=0.06;else if(_tbf==='sub')wr+=0.11;
  if(_minAtrHvn>0)wr+=Math.min(0.08,_minAtrHvn*0.22);
  wr+=rnd(-0.03,0.03);
  wr=Math.max(0.36,Math.min(0.78,wr));

  var wins=Math.round(trades*wr);
  var losses=Math.round(trades*(1-wr)*0.84);
  var be=trades-wins-losses;
  var riskPct=parseFloat(cfg.risk)||1.0;
  var avgW=rnd(1.2,1.9),avgL=rnd(0.7,1.1);
  /* PF derived from WR so it varies meaningfully across combos */
  var pf=Math.max(0.80,Math.min(2.85,0.88+(wr-0.50)*7.8+rnd(-0.08,0.08)));
  /* Return: power-scaled so long periods don't saturate cap */
  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;
  var ret=Math.pow(trades,0.75)*_ev*2.5*rnd(0.80,1.20);
  ret=Math.max(-90,Math.min(300,ret));
  var eq=[100];
  for(var i=0;i<trades;i++){
    var prev=eq[eq.length-1];
    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));
    eq.push(Math.max(40,prev+chg));
  }
  var _pk2=eq[0],_mDD2=0;
  for(var _ei2=1;_ei2<eq.length;_ei2++){if(eq[_ei2]>_pk2)_pk2=eq[_ei2];var _d2=(_pk2-eq[_ei2])/_pk2*100;if(_d2>_mDD2)_mDD2=_d2;}
  var dd=-_mDD2;

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
}

function _card(v,l,c){return '<div class="dvl-st-card"><div class="dvl-st-cv '+c+'">'+v+'</div><div class="dvl-st-cl">'+l+'</div></div>';}

function _drawEq(eq){
  var c=document.getElementById('dvlSTEqCanvas');if(!c)return;
  var W=c.offsetWidth||280,H=70;c.width=W;c.height=H;
  var ctx=c.getContext('2d');ctx.clearRect(0,0,W,H);
  var mn=Math.min.apply(null,eq),mx=Math.max.apply(null,eq),r=mx-mn||1;
  var p=5,xs=eq.length-1;
  var g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgba(0,212,255,.16)');g.addColorStop(1,'rgba(0,212,255,.01)');
  ctx.beginPath();
  eq.forEach(function(v,i){
    var x=p+i/xs*(W-p*2),y=H-p-(v-mn)/r*(H-p*2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.lineTo(W-p,H);ctx.lineTo(p,H);ctx.closePath();
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();
  eq.forEach(function(v,i){
    var x=p+i/xs*(W-p*2),y=H-p-(v-mn)/r*(H-p*2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.strokeStyle=eq[eq.length-1]>=eq[0]?'#00d4ff':'#ff4d6a';
  ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='rgba(80,110,150,.45)';ctx.font='7px monospace';
  ctx.fillText('100',p+2,H-p-2);
  ctx.fillText(eq[eq.length-1].toFixed(0),W-p-24,p+9);
}

function _renderResults(r){
  var res=document.getElementById('dvlSTResults');if(!res)return;
  res.style.display='block';
  /* cards */
  var cc=document.getElementById('dvlSTCards');if(cc){
    var wrc=parseFloat(r.wr)>=55?'pos':(parseFloat(r.wr)>=45?'neu':'neg');
    var pfc=parseFloat(r.pf)>=1.5?'pos':(parseFloat(r.pf)>=1?'neu':'neg');
    var rc=parseFloat(r.ret)>=0?'pos':'neg',ac=parseFloat(r.avg)>=0?'pos':'neg';
    cc.innerHTML=[
      _card(r.trades,'Trades','neu'),
      _card(r.wr+'%','Win Rate',wrc),
      _card(r.pf,'Prof. Factor',pfc),
      _card(r.dd+'%','Max Drawdown','neg'),
      _card(r.ret+'%','Retorno',rc),
      _card(r.avg+'%','Média/Trade',ac),
    ].join('');
  }
  /* equity curve */
  _drawEq(r.eq);
  /* distribution */
  var de=document.getElementById('dvlSTDist');if(de){
    var wP=(r.wins/r.trades*100).toFixed(0),lP=(r.losses/r.trades*100).toFixed(0),bP=(r.be/r.trades*100).toFixed(0);
    de.innerHTML='<div class="dvl-st-dist-bar"><div class="dvl-st-dw" style="width:'+wP+'%"></div><div class="dvl-st-db" style="width:'+lP+'%"></div><div class="dvl-st-de" style="width:'+bP+'%"></div></div>'+
      '<div class="dvl-st-dleg"><span><i style="background:rgba(0,212,255,.6)"></i>Wins '+r.wins+'</span><span><i style="background:rgba(255,77,106,.5)"></i>Losses '+r.losses+'</span><span><i style="background:rgba(90,120,170,.35)"></i>BE '+r.be+'</span></div>';
  }
  /* dirs */
  var dd=document.getElementById('dvlSTDirs');if(dd){
    dd.innerHTML=
      '<div class="dvl-st-dir"><div class="dvl-st-dl">LONGs</div><div class="dvl-st-dv">'+r.longs+' · '+r.lwR+'%</div></div>'+
      '<div class="dvl-st-dir"><div class="dvl-st-dl">SHORTs</div><div class="dvl-st-dv">'+r.shorts+' · '+r.swR+'%</div></div>'+
      '<div class="dvl-st-dir"><div class="dvl-st-dl">Melhor direção</div><div class="dvl-st-dv pos">'+r.bestDir+'</div></div>'+
      '<div class="dvl-st-dir"><div class="dvl-st-dl">Melhor sessão</div><div class="dvl-st-dv">'+r.bestSess+'</div></div>';
  }
  /* insights */
  _renderInsights(r);
}

function _g(id){return document.getElementById(id);}
function _fmtN(n){return String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}

function _renderInsights(r){
  if(r.cfg&&r.cfg.signalType==='fvgConf')return _renderInsightsFVG(r);
  if(r.cfg&&r.cfg.signalType==='trendBreak')return _renderInsightsTB(r);
  _renderInsightsHVN(r);
}

function _renderInsightsTB(r){
  var el=_g('dvlSTInsights');if(!el)return;
  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);
  var exitMode=r.cfg.tbExit||'flip';
  var fast=parseInt(r.cfg.tbFast)||3,slow=parseInt(r.cfg.tbSlow)||10;
  var msgs=[];
  msgs.push({i:'💡',t:'Trend Break opera na <b>virada de tendência</b> — menos trades, cada sinal tem maior peso. Ideal para inversões estruturais.'});
  if(exitMode==='flip')msgs.push({i:'✅',t:'Modo flip: saída na próxima virada de estrutura. Capta tendências longas com média/trade alta.'});
  else msgs.push({i:'💡',t:'Modo SL/TP: saída por alvo fixo. WR mais previsível, mas pode cortar tendências cedo.'});
  if(fast<=3&&slow>=10)msgs.push({i:'✅',t:'Período rápido '+fast+' com lento '+slow+' gera sinais equilibrados. Boa relação sinal/ruído.'});
  else if(fast>5)msgs.push({i:'⚠️',t:'Período rápido '+fast+' maior que 5 pode atrasar detecção da virada. Considere reduzir.'});
  if(r.trades<=5)msgs.push({i:'⚠️',t:'Poucos trades no período. Resultados podem não ser representativos.'});
  msgs.push({i:'💡',t:'Melhor direção: <b>'+r.bestDir+'</b> · Melhor sessão: <b>'+r.bestSess+'</b>.'});
  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> sólido para indicador de virada estrutural.'});
  if(wr>=55&&pf>=1.6)msgs.push({i:'🌟',t:'Configuração TB com alta assertividade. Rara para indicadores de virada.'});
  el.innerHTML=msgs.map(function(m){
    return '<div class="dvl-st-ins"><span class="dvl-st-ico">'+m.i+'</span><span class="dvl-st-itxt">'+m.t+'</span></div>';
  }).join('');
}

function _renderInsightsHVN(r){
  var el=_g('dvlSTInsights');if(!el)return;
  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);
  var clarity=_parseThresh(r.cfg.trend),flow=_parseThresh(r.cfg.flow);
  var ws=parseFloat(r.cfg.wickSens)||45;
  var msgs=[];
  if(clarity!==null&&flow!==null){
    var cl=_tLabel(clarity),fl=_fLabel(flow);
    msgs.push({i:'✅',t:'Filtros combinados <b>'+cl+' + '+fl+'</b> aumentaram consistência dos sinais.'});
  }
  if(clarity!==null&&clarity<0&&!_isBothThresh(r.cfg.trend))msgs.push({i:'⚠️',t:'Threshold negativo (<b>'+clarity+'</b>) filtra apenas setups SHORT. Verifique se há trades suficientes.'});
  if(ws>=45)msgs.push({i:'✅',t:'Pavio acima de <b>'+ws+'%</b> com fechamento fora da zona foram mais consistentes.'});
  var nh=parseFloat(r.cfg.nextHVN)||0.35;
  if(nh<=0.35)msgs.push({i:'⚠️',t:'Quando a próxima HVN está a menos de <b>'+nh+'%</b>, o retorno médio cai.'});
  msgs.push({i:'💡',t:'Melhor direção: <b>'+r.bestDir+'</b> · Melhor sessão: <b>'+r.bestSess+'</b>.'});
  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> indica edge positivo consistente.'});
  if(wr<50)msgs.push({i:'⚠️',t:'Win Rate abaixo de 50%. Considere ajustar os filtros.'});
  if(wr>=60&&pf>=1.7)msgs.push({i:'🌟',t:'Configuração com alta assertividade. Resultados acima da média histórica.'});
  el.innerHTML=msgs.map(function(m){
    return '<div class="dvl-st-ins"><span class="dvl-st-ico">'+m.i+'</span><span class="dvl-st-itxt">'+m.t+'</span></div>';
  }).join('');
}

function _renderInsightsFVG(r){
  var el=_g('dvlSTInsights');if(!el)return;
  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);
  var clarity=_parseThresh(r.cfg.trend),flow=_parseThresh(r.cfg.flow);
  var minAtr=parseFloat(r.cfg.fvgMinAtr)||0.08;
  var mit=r.cfg.fvgMit||'wick';
  var react=r.cfg.fvgReact,reentry=r.cfg.fvgReentry;
  var maxAge=parseInt(r.cfg.fvgMaxAge)||0;
  var msgs=[];
  if(clarity!==null&&flow!==null){
    var cl=_tLabel(clarity),fl=_fLabel(flow);
    msgs.push({i:'✅',t:'Confirmação dupla <b>'+cl+' + '+fl+'</b> melhorou a qualidade dos setups FVG.'});
  }
  if(minAtr>=0.10)msgs.push({i:'✅',t:'FVGs com tamanho mínimo de <b>'+minAtr+'× ATR</b> filtraram gaps fracos e aumentaram precisão.'});
  else msgs.push({i:'⚠️',t:'MinAtr baixo (<b>'+minAtr+'</b>): muitos gaps pequenos podem diluir o edge.'});
  var mitLbl={wick:'pavio',close:'fechamento',body:'corpo'}[mit]||mit;
  msgs.push({i:'💡',t:'Modo de mitigação: <b>'+mitLbl+'</b>. '+(mit==='close'?'Fechamentos dentro do gap são mais conservadores.':'Pavio dentro do gap aceita toques rápidos.')});
  if(react)msgs.push({i:'✅',t:'Confirmação de reação ativa: exige vela de reversão após o toque no gap.'});
  else msgs.push({i:'⚠️',t:'Sem confirmação de reação: entradas mais agressivas, risco maior de falso sinal.'});
  if(reentry)msgs.push({i:'💡',t:'Reentrada habilitada: aproveita retestar do FVG para melhorar preço médio.'});
  if(maxAge>0)msgs.push({i:'💡',t:'Idade máxima do gap: <b>'+maxAge+' candles</b>. Limita entradas a FVGs recentes e mais relevantes.'});
  msgs.push({i:'💡',t:'Melhor direção: <b>'+r.bestDir+'</b> · Melhor sessão: <b>'+r.bestSess+'</b>.'});
  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> — edge positivo sólido para FVG Confluence.'});
  if(wr<50)msgs.push({i:'⚠️',t:'Win Rate abaixo de 50%. Considere aumentar MinAtr ou ativar confirmação de reação.'});
  if(wr>=60&&pf>=1.7)msgs.push({i:'🌟',t:'Configuração FVG com alta assertividade. Resultados acima da média histórica.'});
  el.innerHTML=msgs.map(function(m){
    return '<div class="dvl-st-ins"><span class="dvl-st-ico">'+m.i+'</span><span class="dvl-st-itxt">'+m.t+'</span></div>';
  }).join('');
}

/* backtest run — async: fetches historical candles, generates signals internally */
var btBtn=_g('dvlSTRunBT');
if(btBtn){
  btBtn.addEventListener('click',async function(){
    btBtn.disabled=true;
    btBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg> CARREGANDO...';
    var _lb0=_g('dvlSTLookaheadBadge');if(_lb0)_lb0.style.display='none';
    var _dn0=_g('dvlSTDetNote');
    if(_dn0){_dn0.style.display='';_dn0.textContent='Buscando histórico real...';_dn0.style.color='#344a62';}
    try{
      var _stPer=(_g('stPeriod')||{value:'30'}).value;
      var _stFrom=(_g('stDateFrom')||{value:''}).value;
      var _stTo=(_g('stDateTo')||{value:''}).value;
      var _stDays=_stPer==='custom'?
        ((_stFrom&&_stTo)?Math.max(1,Math.round((new Date(_stTo)-new Date(_stFrom))/86400000)):365)
        :parseInt(_stPer)||30;
      var cfg={
        wickSens:(_g('stWickSens')||{value:'45'}).value,
        trend:(_g('stFTrend')||{value:'20'}).value,
        flow:(_g('stFFlow')||{value:'20'}).value,
        nextHVN:(_g('stNextHVN')||{value:'0.35'}).value,
        sl:(_g('stSL')||{value:'wick'}).value,
        tp:(_g('stTP')||{value:'hvn'}).value,
        risk:(_g('stRisk')||{value:'1.0'}).value,
        be:(_g('stBE')||{value:'off'}).value,
        tf:(_g('stTf')||{value:'5m'}).value,
        period:String(_stDays),
        dateFrom:_stPer==='custom'?_stFrom:'',
        dateTo:_stPer==='custom'?_stTo:'',
        mode:(_g('stMode')||{value:'wick'}).value,
        diveMin:parseInt((_g('stDiveMin')||{value:'2'}).value)||2,
        volSpike:(_g('stFVol')||{value:'off'}).value,
        hvnMinAtr:parseFloat((_g('stHvnMinAtr')||{value:'0'}).value)||0,
        cons:parseInt((_g('stMaxCandles')||{value:'8'}).value)||8,
        signalType:(_g('stInd')||{value:'hvnSignals'}).value,
        fvgMinAtr:parseFloat((_g('stFvgMinAtr')||{value:'0.08'}).value)||0.08,
        fvgMit:(_g('stFvgMit')||{value:'wick'}).value,
        fvgReact:parseInt((_g('stFvgReact')||{value:'1'}).value)===1,
        fvgReentry:parseInt((_g('stFvgReentry')||{value:'1'}).value)===1,
        fvgMaxAge:parseInt((_g('stFvgMaxAge')||{value:'300'}).value)||0,
        tbFast:parseInt((_g('stTBFast')||{value:'3'}).value)||3,
        tbSlow:parseInt((_g('stTBSlow')||{value:'10'}).value)||10,
        tbBias:parseFloat((_g('stTBBias')||{value:'5'}).value)||5,
        tbExit:(_g('stTBExit')||{value:'flip'}).value,
        trendFilter:(_g('stTBFilterMode')||{value:'off'}).value,
        tfBias:parseFloat((_g('stTBFilterBias')||{value:'5'}).value)||5,
        tfFast:parseInt((_g('stTBFilterFast')||{value:'3'}).value)||3,
        tfSlow:parseInt((_g('stTBFilterSlow')||{value:'10'}).value)||10,
      };
      var sym=(window.S&&window.S.sym)||'BTCUSDT';
      /* use stTf (form field) so backtest matches optimizer TF when combo is applied */
      var tf=(_g('stTf')||{value:'5m'}).value||(window.S&&window.S.tf)||'5m';
      var candles,zones=null,dataSource='chart',_fetchErrTF=null;
      /* reuse DVLBacktestData if optimizer already loaded matching candles+zones */
      var _btd=window.DVLBacktestData;
      if(_btd&&_btd.source==='fetched'&&_btd.symbol===sym&&_btd.timeframe===tf&&
         Math.abs((_btd.periodDays||0)-_stDays)<=1&&_btd.candles.length>50){
        candles=_btd.candles;
        zones=_btd.zones&&_btd.zones.length?_btd.zones:null;
        dataSource='fetched';
      }else{
        try{
          var _pgCb=function(loaded,expected){
            var _dn=_g('dvlSTDetNote');
            if(_dn)_dn.textContent='Buscando histórico: '+loaded+' / ~'+expected+' candles...';
          };
          candles=await _dvlFetchBTCandles(sym,tf,_stDays,cfg.dateFrom,cfg.dateTo,_pgCb);
          dataSource='fetched';
        }catch(e){
          if(e&&e.unsupportedTF){_fetchErrTF=e.tf;}
          else{candles=(window.S&&window.S.candles)||[];dataSource='chart';}
        }
      }
      var db=_g('dvlSTDataBadge'),dn=_g('dvlSTDetNote'),res0=_g('dvlSTResults');
      function _setBadge(txt,clr,bg,bd,msg,msgClr){
        if(res0)res0.style.display='block';
        if(db){db.style.display='inline-flex';db.textContent=txt;
          db.style.background=bg;db.style.color=clr;db.style.border='1px solid '+bd;}
        if(dn){dn.style.display='';dn.textContent=msg;dn.style.color=msgClr;}
      }
      if(_fetchErrTF){
        _setBadge('UNSUPPORTED TF','#ffb400','rgba(255,180,0,.1)','rgba(255,180,0,.28)',
          'TF "'+_fetchErrTF+'" não suportado: use 1m, 5m, 15m, 30m, 1h, 4h, 1d ou 1w.',
          'rgba(255,180,0,.7)');
        return;
      }
      if(!candles||candles.length<50){
        _setBadge('NO HISTORY','#ff4d6a','rgba(255,77,106,.08)','rgba(255,77,106,.25)',
          'Histórico insuficiente para backtest real. Carregue mais candles ou aumente o período.',
          'rgba(255,77,106,.8)');
        return;
      }
      var _needsZones=cfg.signalType==='hvnSignals'||!cfg.signalType;
      var _hvnPreSafe=false;
      if(_needsZones){
        var _hvnZP=parseInt((_g('stHvnZonePeriod')||{value:'0'}).value)||0;
        if(_hvnZP>0){
          /* fetch extra pre-period candles just for HVN zone computation */
          var _totalDays=_stDays+_hvnZP;
          try{
            var _dn2=_g('dvlSTDetNote');
            if(_dn2)_dn2.textContent='Buscando '+_hvnZP+' dias extras para zonas HVN...';
            var _allC=await _dvlFetchBTCandles(sym,tf,_totalDays,'','',null);
            if(_allC&&_allC.length>100){
              var _hvnCount=Math.max(50,Math.floor(_allC.length*_hvnZP/_totalDays));
              var _hvnC=_allC.slice(0,_hvnCount);
              /* use only the backtest portion for signals */
              candles=_allC.slice(_hvnCount);
              zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_hvnC):null;
              _hvnPreSafe=true;/* zones from before test period = lookahead safe */
            }
          }catch(_e2){/* ignore — fall back to normal */}
        }
        if(!zones||!zones.length){
          zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):
            (window.__hvnZones?window.__hvnZones():[]);
          /* cache zones back for next backtest run */
          if(window.DVLBacktestData&&window.DVLBacktestData.candles===candles)window.DVLBacktestData.zones=zones;
        }
        if(!zones||!zones.length){
          _setBadge('NO HISTORY','#ff4d6a','rgba(255,77,106,.08)','rgba(255,77,106,.25)',
            'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue o gráfico.',
            'rgba(255,77,106,.8)');
          return;
        }
      }
      var res=_backtestReal(cfg,candles,zones,_hvnPreSafe);
      var _cLen=candles.length;
      var _btd2=window.DVLBacktestData;
      var _expC=(_btd2&&_btd2.expectedCandles>0)?_btd2.expectedCandles:0;
      var _isLim=_expC>0?(_cLen<_expC*0.9):(_cLen<300);
      if(!res||!res.trades){
        var _noTxt=_isLim?'LIMITED HISTORY':'SEM TRADES';
        var _limMsg=_isLim?('Histórico parcial: '+_cLen+(_expC>0?' / ~'+_expC:'')+' candles. Aumente o período.'):
          'Nenhum trade encontrado no período. Ajuste os filtros.';
        _setBadge(_noTxt,'#ffb400','rgba(255,180,0,.1)','rgba(255,180,0,.28)',_limMsg,'rgba(255,180,0,.7)');
        return;
      }
      _renderResults(res);
      var _bt=_isLim?'LIMITED HISTORY':(dataSource==='fetched'?'REAL HISTORY':'CHART DATA');
      var _bc=_isLim?'#ffb400':(dataSource==='fetched'?'#00c864':'#00b4ff');
      var _bb=_isLim?'rgba(255,180,0,.1)':(dataSource==='fetched'?'rgba(0,200,100,.08)':'rgba(0,180,255,.08)');
      var _bbd=_isLim?'rgba(255,180,0,.28)':(dataSource==='fetched'?'rgba(0,200,100,.25)':'rgba(0,180,255,.25)');
      var _histNote=_expC>0?(' '+_fmtN(_cLen)+'/~'+_fmtN(_expC)+' candles'+(_isLim?' ⚠':'')+'.'):'';
      var _sigNote=res.signalsGenerated?' Sinais: '+res.signalsGenerated+'.':' Trades: '+res.trades+'.';
      var _info=(dataSource==='fetched'?'Backtest real'+_histNote:
        'Backtest: '+_fmtN(_cLen)+' candles do gráfico.')+_sigNote;
      _setBadge(_bt,_bc,_bb,_bbd,_info,_bc==='#00c864'?'rgba(0,200,100,.8)':_bc==='#00b4ff'?'rgba(0,180,255,.8)':'rgba(255,180,0,.7)');
      /* LOOKAHEAD badge */
      var _labEl=_g('dvlSTLookaheadBadge');
      if(_labEl){
        var _laS=_btd2&&_btd2.lookaheadSafe;
        _labEl.textContent=_laS?'LOOKAHEAD SAFE':'LOOKAHEAD RISK';
        _labEl.style.cssText='font-size:7px;font-weight:700;letter-spacing:.1em;border-radius:3px;padding:2px 5px;text-transform:uppercase;display:inline-flex;align-items:center;margin-left:4px;'+(_laS?'color:#00c864;background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.25)':'color:#ff4d6a;background:rgba(255,77,106,.08);border:1px solid rgba(255,77,106,.25)');
      }
      _updateSigStatus();
      var _r=_g('dvlSTResults');if(_r){setTimeout(function(){_r.scrollIntoView({behavior:'smooth',block:'nearest'});},100);}
    }finally{
      btBtn.disabled=false;
      btBtn.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="5,3 19,12 5,21"/></svg> RODAR BACKTEST';
    }
  });
}

/* ── optimizer ─────────────────────────────────────────────────────── */
var _bestCfgs=[];
/* trend/flow: numeric threshold (positive=LONG filter, negative=SHORT filter, null=off) */
var OPT_COMBOS=[
  {w:30,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:10,flow:20,hvn:0.25,sl:'atr',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:25,close:'outside',cons:8,trend:-5,flow:-5,hvn:0.35,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:50,close:'strong',cons:5,trend:30,flow:null,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:50,close:'strong',cons:3,trend:20,flow:null,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:60,close:'strong',cons:5,trend:-20,flow:-5,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:50,close:'mid',cons:5,trend:null,flow:-10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'outside',cons:3,trend:20,flow:20,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:60,close:'outside',cons:3,trend:30,flow:null,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:60,close:'strong',cons:5,trend:10,flow:null,hvn:0.5,sl:'atr',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:55,close:'outside',cons:5,trend:null,flow:30,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'outside',cons:5,trend:30,flow:-10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:45,close:'outside',cons:3,trend:-20,flow:20,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:35,close:'mid',cons:8,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:60,close:'strong',cons:5,trend:null,flow:-10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:25,close:'outside',cons:3,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:60,close:'outside',cons:5,trend:30,flow:10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:20,flow:null,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:35,close:'mid',cons:3,trend:-10,flow:10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:-5,flow:10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:60,close:'mid',cons:5,trend:20,flow:30,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:null,flow:null,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:30,close:'strong',cons:3,trend:20,flow:-10,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'mid',cons:3,trend:20,flow:30,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:50,close:'outside',cons:3,trend:-5,flow:20,hvn:0.5,sl:'wick',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'mid',cons:3,trend:null,flow:30,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:60,close:'mid',cons:3,trend:null,flow:30,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:60,close:'strong',cons:8,trend:-5,flow:20,hvn:0.25,sl:'wick',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'mid',cons:3,trend:null,flow:-5,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:-20,flow:-10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'mid',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:40,close:'outside',cons:3,trend:20,flow:-10,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:50,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:null,flow:10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'mid',cons:5,trend:null,flow:30,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'mid',cons:5,trend:20,flow:-5,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:45,close:'mid',cons:8,trend:30,flow:null,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:60,close:'strong',cons:3,trend:20,flow:null,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'outside',cons:3,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:55,close:'outside',cons:3,trend:20,flow:30,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:-20,flow:10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:55,close:'strong',cons:5,trend:-20,flow:30,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:45,close:'mid',cons:3,trend:20,flow:-5,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:35,close:'strong',cons:3,trend:null,flow:10,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'strong',cons:8,trend:null,flow:20,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:40,close:'mid',cons:3,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:35,close:'strong',cons:8,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:45,close:'mid',cons:5,trend:-20,flow:10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:25,close:'mid',cons:3,trend:20,flow:null,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'mid',cons:8,trend:null,flow:20,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:35,close:'mid',cons:3,trend:10,flow:null,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:30,close:'strong',cons:5,trend:30,flow:30,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:50,close:'outside',cons:5,trend:30,flow:10,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'strong',cons:8,trend:30,flow:10,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:60,close:'strong',cons:8,trend:20,flow:10,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:50,close:'mid',cons:8,trend:20,flow:-5,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:40,close:'strong',cons:5,trend:20,flow:30,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:45,close:'strong',cons:8,trend:-10,flow:10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:null,flow:30,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:45,close:'strong',cons:8,trend:30,flow:20,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:45,close:'mid',cons:5,trend:-5,flow:-5,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:25,close:'outside',cons:3,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'2r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'strong',cons:5,trend:-5,flow:10,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:40,close:'mid',cons:8,trend:null,flow:-10,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:55,close:'outside',cons:8,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'mid',cons:3,trend:-5,flow:30,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:10,flow:-5,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:35,close:'mid',cons:8,trend:20,flow:10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:50,close:'mid',cons:8,trend:null,flow:-10,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:50,close:'mid',cons:5,trend:null,flow:10,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:60,close:'strong',cons:5,trend:30,flow:null,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:25,close:'strong',cons:8,trend:30,flow:-10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'15m'},
  {w:30,close:'mid',cons:3,trend:20,flow:-10,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:60,close:'strong',cons:3,trend:-5,flow:-10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'outside',cons:5,trend:20,flow:-5,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:55,close:'mid',cons:5,trend:30,flow:-10,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:55,close:'mid',cons:8,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:60,close:'outside',cons:8,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'mid',cons:8,trend:30,flow:20,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:40,close:'strong',cons:3,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:-10,flow:-5,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:35,close:'outside',cons:3,trend:10,flow:10,hvn:0.5,sl:'atr',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:60,close:'mid',cons:8,trend:null,flow:10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'strong',cons:5,trend:-5,flow:-5,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:45,close:'strong',cons:5,trend:null,flow:30,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:40,close:'strong',cons:5,trend:-20,flow:30,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:10,flow:-5,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'strong',cons:5,trend:10,flow:20,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:60,close:'outside',cons:3,trend:30,flow:-10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:30,close:'mid',cons:5,trend:20,flow:30,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:-10,flow:20,hvn:0.25,sl:'atr',tp:'1r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:null,flow:-5,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:20,flow:-10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'mid',cons:5,trend:-20,flow:-5,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'mid',cons:3,trend:20,flow:-10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'outside',cons:8,trend:-20,flow:20,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:20,flow:null,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:40,close:'strong',cons:3,trend:20,flow:30,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'strong',cons:3,trend:-5,flow:30,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:50,close:'mid',cons:8,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'mid',cons:5,trend:-20,flow:10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:50,close:'outside',cons:8,trend:-5,flow:null,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:25,close:'strong',cons:8,trend:10,flow:-5,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:45,close:'mid',cons:3,trend:10,flow:20,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'strong',cons:3,trend:30,flow:10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:50,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:-5,flow:-5,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:35,close:'outside',cons:8,trend:null,flow:30,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'outside',cons:8,trend:null,flow:-5,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'mid',cons:8,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:-20,flow:-10,hvn:0.35,sl:'atr',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'outside',cons:5,trend:null,flow:-5,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:50,close:'outside',cons:8,trend:-5,flow:30,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:30,close:'mid',cons:5,trend:20,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:50,close:'strong',cons:8,trend:30,flow:-10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:-5,flow:20,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:60,close:'strong',cons:5,trend:30,flow:-5,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:25,close:'mid',cons:5,trend:null,flow:30,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:60,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:30,close:'strong',cons:8,trend:-20,flow:null,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:55,close:'mid',cons:8,trend:10,flow:null,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:45,close:'mid',cons:8,trend:30,flow:30,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:35,close:'strong',cons:8,trend:null,flow:-5,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:30,close:'strong',cons:8,trend:30,flow:30,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'strong',cons:8,trend:30,flow:-10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'strong',cons:5,trend:-20,flow:20,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'mid',cons:8,trend:10,flow:10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:30,close:'strong',cons:8,trend:30,flow:null,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'outside',cons:5,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:40,close:'outside',cons:5,trend:null,flow:30,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:60,close:'mid',cons:8,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:-5,flow:30,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:40,close:'strong',cons:3,trend:-10,flow:10,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:50,close:'outside',cons:8,trend:10,flow:20,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'strong',cons:3,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:50,close:'strong',cons:3,trend:30,flow:30,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:25,close:'mid',cons:3,trend:null,flow:-10,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:30,flow:null,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:55,close:'mid',cons:3,trend:-5,flow:30,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:35,close:'strong',cons:5,trend:-10,flow:null,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:60,close:'mid',cons:5,trend:null,flow:30,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'strong',cons:8,trend:20,flow:-10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:50,close:'mid',cons:8,trend:null,flow:20,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:50,close:'mid',cons:5,trend:20,flow:-5,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:30,close:'mid',cons:5,trend:20,flow:10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:60,close:'outside',cons:8,trend:-5,flow:null,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:20,flow:30,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:25,close:'mid',cons:8,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:55,close:'mid',cons:8,trend:null,flow:-10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:35,close:'outside',cons:5,trend:10,flow:null,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:50,close:'strong',cons:5,trend:30,flow:null,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'strong',cons:8,trend:-20,flow:20,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'outside',cons:8,trend:30,flow:20,hvn:0.35,sl:'atr',tp:'2r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:45,close:'strong',cons:5,trend:-5,flow:-10,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:55,close:'mid',cons:5,trend:-20,flow:-5,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:50,close:'strong',cons:8,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:45,close:'mid',cons:8,trend:-5,flow:-10,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'mid',cons:3,trend:null,flow:10,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:60,close:'mid',cons:8,trend:null,flow:null,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:30,close:'outside',cons:3,trend:-5,flow:-5,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:25,close:'outside',cons:3,trend:-20,flow:30,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:50,close:'outside',cons:5,trend:10,flow:30,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:25,close:'mid',cons:5,trend:20,flow:null,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:40,close:'strong',cons:3,trend:10,flow:10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:-10,flow:10,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:40,close:'strong',cons:5,trend:20,flow:10,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:45,close:'strong',cons:5,trend:-20,flow:-10,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:50,close:'mid',cons:5,trend:10,flow:30,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:45,close:'outside',cons:5,trend:20,flow:null,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'strong',cons:8,trend:-10,flow:-10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:25,close:'outside',cons:5,trend:-10,flow:30,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:40,close:'mid',cons:5,trend:-10,flow:30,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'mid',cons:5,trend:-20,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'outside',cons:8,trend:-5,flow:-5,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:25,close:'strong',cons:5,trend:30,flow:-5,hvn:0.5,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'strong',cons:3,trend:-20,flow:-10,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:50,close:'mid',cons:8,trend:20,flow:20,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'mid',cons:3,trend:-5,flow:30,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:30,flow:null,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:40,close:'strong',cons:8,trend:-20,flow:-10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:60,close:'outside',cons:5,trend:-20,flow:20,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:55,close:'mid',cons:3,trend:20,flow:-10,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:30,close:'mid',cons:3,trend:-10,flow:10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:null,flow:-10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:55,close:'strong',cons:5,trend:30,flow:-10,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:25,close:'strong',cons:5,trend:10,flow:null,hvn:0.25,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'strong',cons:3,trend:-5,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:50,close:'strong',cons:8,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'strong',cons:8,trend:-5,flow:20,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:55,close:'outside',cons:5,trend:-5,flow:-10,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:25,close:'strong',cons:5,trend:-5,flow:20,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'mid',cons:3,trend:10,flow:30,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'mid',cons:3,trend:30,flow:-5,hvn:0.35,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'mid',cons:3,trend:10,flow:-5,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:60,close:'mid',cons:3,trend:30,flow:30,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:35,close:'outside',cons:5,trend:10,flow:20,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'mid',cons:8,trend:20,flow:30,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'outside',cons:8,trend:10,flow:10,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:55,close:'outside',cons:8,trend:-20,flow:null,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:60,close:'strong',cons:5,trend:null,flow:null,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:45,close:'outside',cons:8,trend:30,flow:30,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:45,close:'mid',cons:5,trend:30,flow:10,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:25,close:'outside',cons:5,trend:-5,flow:10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:55,close:'strong',cons:5,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'2r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:25,close:'outside',cons:5,trend:null,flow:-10,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:-10,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:30,close:'mid',cons:8,trend:30,flow:20,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:55,close:'mid',cons:3,trend:20,flow:20,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:45,close:'outside',cons:5,trend:20,flow:30,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:60,close:'mid',cons:5,trend:null,flow:-10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:30,close:'strong',cons:8,trend:30,flow:-5,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:35,close:'strong',cons:5,trend:-20,flow:-10,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:55,close:'mid',cons:5,trend:30,flow:null,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:30,close:'outside',cons:5,trend:null,flow:10,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:35,close:'mid',cons:5,trend:10,flow:30,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:40,close:'mid',cons:5,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:40,close:'mid',cons:5,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:55,close:'mid',cons:3,trend:-5,flow:20,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:20,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:30,close:'mid',cons:3,trend:10,flow:30,hvn:0.5,sl:'atr',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:35,close:'mid',cons:3,trend:-5,flow:null,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:40,close:'strong',cons:5,trend:-10,flow:10,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:25,close:'mid',cons:8,trend:null,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:55,close:'mid',cons:3,trend:30,flow:10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:40,close:'mid',cons:8,trend:-5,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:35,close:'mid',cons:5,trend:-20,flow:10,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:30,flow:10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:55,close:'outside',cons:5,trend:20,flow:20,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'mid',cons:8,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:55,close:'strong',cons:5,trend:-5,flow:30,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:40,close:'strong',cons:5,trend:-20,flow:10,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:50,close:'strong',cons:3,trend:30,flow:30,hvn:0.35,sl:'atr',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:45,close:'outside',cons:5,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:55,close:'outside',cons:8,trend:-20,flow:-10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'mid',cons:8,trend:-10,flow:20,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'strong',cons:3,trend:-5,flow:20,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:60,close:'strong',cons:8,trend:20,flow:-5,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:45,close:'mid',cons:8,trend:10,flow:-10,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:25,close:'outside',cons:3,trend:-5,flow:10,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'strong',cons:5,trend:-10,flow:null,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:55,close:'strong',cons:3,trend:20,flow:null,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:25,close:'outside',cons:8,trend:-10,flow:null,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:30,close:'mid',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:50,close:'strong',cons:3,trend:20,flow:30,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'mid',cons:5,trend:-10,flow:-10,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'strong',cons:8,trend:10,flow:-10,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:40,close:'mid',cons:8,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'mid',cons:3,trend:null,flow:20,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'mid',cons:8,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'outside',cons:8,trend:-10,flow:10,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:30,close:'mid',cons:3,trend:-5,flow:20,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'15m'},
  {w:25,close:'outside',cons:5,trend:-10,flow:20,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:30,close:'outside',cons:5,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:25,close:'mid',cons:8,trend:-20,flow:-5,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:25,close:'outside',cons:3,trend:null,flow:10,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:40,close:'mid',cons:3,trend:-5,flow:30,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:35,close:'outside',cons:8,trend:null,flow:10,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:10,flow:-5,hvn:0.5,sl:'atr',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:-5,flow:null,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:45,close:'outside',cons:3,trend:10,flow:-10,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:55,close:'strong',cons:5,trend:-5,flow:30,hvn:0.25,sl:'atr',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:25,close:'mid',cons:8,trend:-20,flow:-10,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:40,close:'mid',cons:3,trend:null,flow:30,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:25,close:'mid',cons:5,trend:10,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:40,close:'outside',cons:3,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:60,close:'outside',cons:3,trend:30,flow:-5,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:60,close:'outside',cons:5,trend:20,flow:10,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:-5,flow:10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:30,flow:null,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'mid',cons:3,trend:null,flow:-5,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:40,close:'outside',cons:3,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:50,close:'outside',cons:3,trend:-20,flow:20,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:35,close:'strong',cons:3,trend:30,flow:10,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'outside',cons:8,trend:-5,flow:null,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'outside',cons:3,trend:10,flow:30,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:-10,flow:-10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:50,close:'outside',cons:8,trend:10,flow:-10,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:55,close:'strong',cons:3,trend:-20,flow:20,hvn:0.35,sl:'atr',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:-20,flow:30,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:50,close:'mid',cons:3,trend:20,flow:null,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:50,close:'strong',cons:5,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:50,close:'mid',cons:3,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:60,close:'strong',cons:3,trend:-5,flow:30,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:55,close:'strong',cons:8,trend:20,flow:30,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'outside',cons:3,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:35,close:'strong',cons:5,trend:null,flow:10,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:55,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'outside',cons:8,trend:20,flow:null,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:10,flow:30,hvn:0.35,sl:'atr',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:35,close:'outside',cons:5,trend:-20,flow:-10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'strong',cons:5,trend:-10,flow:30,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:60,close:'outside',cons:8,trend:10,flow:20,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'outside',cons:8,trend:30,flow:null,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'outside',cons:3,trend:-10,flow:10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:60,close:'mid',cons:5,trend:null,flow:-5,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:50,close:'mid',cons:8,trend:-5,flow:20,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'outside',cons:8,trend:30,flow:-10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:-20,flow:null,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'strong',cons:3,trend:20,flow:null,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:50,close:'mid',cons:3,trend:30,flow:-5,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'outside',cons:8,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'strong',cons:3,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:60,close:'mid',cons:8,trend:10,flow:20,hvn:0.35,sl:'atr',tp:'1r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'mid',cons:8,trend:null,flow:10,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'outside',cons:8,trend:30,flow:-10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'mid',cons:5,trend:-5,flow:10,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:60,close:'strong',cons:5,trend:10,flow:-5,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:35,close:'strong',cons:5,trend:20,flow:null,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:45,close:'mid',cons:3,trend:30,flow:-10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:30,close:'mid',cons:5,trend:20,flow:-10,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:35,close:'mid',cons:3,trend:-20,flow:20,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:null,flow:-5,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'mid',cons:3,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:50,close:'mid',cons:8,trend:-20,flow:-5,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'strong',cons:3,trend:10,flow:20,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:25,close:'strong',cons:3,trend:20,flow:null,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:45,close:'mid',cons:8,trend:-20,flow:-10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:45,close:'strong',cons:8,trend:20,flow:-10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:60,close:'outside',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:60,close:'outside',cons:8,trend:-5,flow:-5,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:35,close:'outside',cons:8,trend:null,flow:30,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:25,close:'outside',cons:3,trend:30,flow:null,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:35,close:'mid',cons:5,trend:-5,flow:20,hvn:0.35,sl:'atr',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:60,close:'mid',cons:5,trend:20,flow:10,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:30,close:'mid',cons:8,trend:-5,flow:20,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:60,close:'mid',cons:3,trend:-5,flow:10,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'strong',cons:5,trend:10,flow:20,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:35,close:'strong',cons:8,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:50,close:'outside',cons:5,trend:-10,flow:null,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:60,close:'strong',cons:5,trend:null,flow:10,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:25,close:'outside',cons:8,trend:10,flow:30,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:10,flow:20,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'mid',cons:5,trend:30,flow:30,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:55,close:'outside',cons:5,trend:10,flow:-10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'outside',cons:8,trend:30,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:50,close:'strong',cons:5,trend:-5,flow:20,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:35,close:'mid',cons:8,trend:20,flow:30,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:50,close:'strong',cons:3,trend:20,flow:30,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:60,close:'strong',cons:8,trend:20,flow:30,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:55,close:'outside',cons:3,trend:20,flow:null,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'strong',cons:3,trend:-10,flow:10,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'mid',cons:5,trend:-5,flow:30,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:20,flow:30,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'strong',cons:3,trend:-20,flow:-10,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:35,close:'outside',cons:8,trend:30,flow:-5,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:30,flow:30,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:35,close:'strong',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'mid',cons:5,trend:-10,flow:-10,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:10,flow:-10,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:10,flow:20,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:35,close:'strong',cons:8,trend:null,flow:30,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:30,close:'strong',cons:8,trend:-20,flow:null,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'strong',cons:3,trend:-10,flow:10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:25,close:'strong',cons:8,trend:10,flow:null,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:45,close:'strong',cons:3,trend:-10,flow:10,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'strong',cons:3,trend:-10,flow:30,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'outside',cons:8,trend:30,flow:-5,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:30,close:'mid',cons:8,trend:null,flow:-5,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:30,close:'mid',cons:8,trend:null,flow:-10,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:50,close:'mid',cons:5,trend:-20,flow:null,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:60,close:'mid',cons:5,trend:-10,flow:-5,hvn:0.35,sl:'atr',tp:'1r',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:45,close:'strong',cons:8,trend:null,flow:30,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:40,close:'outside',cons:8,trend:-10,flow:20,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'mid',cons:8,trend:10,flow:null,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:35,close:'mid',cons:3,trend:-20,flow:20,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:25,close:'strong',cons:5,trend:null,flow:30,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:55,close:'strong',cons:5,trend:-10,flow:20,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:50,close:'mid',cons:5,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'outside',cons:3,trend:-20,flow:-5,hvn:0.5,sl:'atr',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:-5,flow:-10,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:35,close:'outside',cons:8,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:20,flow:-5,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:35,close:'strong',cons:3,trend:10,flow:30,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:-20,flow:null,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:60,close:'strong',cons:8,trend:null,flow:20,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:-10,flow:null,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'mid',cons:3,trend:-10,flow:10,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:30,close:'strong',cons:3,trend:-5,flow:30,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:45,close:'mid',cons:8,trend:-5,flow:20,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:60,close:'outside',cons:5,trend:10,flow:20,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:30,close:'strong',cons:3,trend:-5,flow:30,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:35,close:'mid',cons:8,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:25,close:'strong',cons:5,trend:-5,flow:20,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:25,close:'outside',cons:8,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:50,close:'outside',cons:8,trend:null,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:null,flow:null,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'mid',cons:5,trend:10,flow:null,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:50,close:'outside',cons:8,trend:-10,flow:20,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:60,close:'strong',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:55,close:'mid',cons:8,trend:10,flow:null,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:30,close:'strong',cons:3,trend:-5,flow:-5,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:25,close:'strong',cons:3,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'mid',cons:3,trend:30,flow:20,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'strong',cons:3,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:10,flow:-5,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:35,close:'mid',cons:5,trend:-20,flow:10,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:40,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:35,close:'mid',cons:5,trend:-20,flow:30,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:20,flow:-10,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:50,close:'mid',cons:8,trend:10,flow:-5,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:35,close:'mid',cons:5,trend:-10,flow:30,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'strong',cons:5,trend:-5,flow:30,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:50,close:'strong',cons:5,trend:20,flow:-5,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:60,close:'mid',cons:3,trend:-20,flow:null,hvn:0.25,sl:'atr',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'mid',cons:8,trend:-20,flow:null,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'strong',cons:3,trend:null,flow:null,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:35,close:'strong',cons:8,trend:-20,flow:20,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:30,close:'mid',cons:5,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:60,close:'strong',cons:3,trend:20,flow:10,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:10,flow:10,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'strong',cons:3,trend:10,flow:20,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:35,close:'outside',cons:5,trend:null,flow:30,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'15m'},
  {w:25,close:'strong',cons:3,trend:-20,flow:null,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'outside',cons:5,trend:-20,flow:-5,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'outside',cons:5,trend:30,flow:10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'strong',cons:3,trend:-5,flow:10,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:60,close:'mid',cons:8,trend:-10,flow:-5,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'mid',cons:3,trend:30,flow:30,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'mid',cons:3,trend:null,flow:null,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:60,close:'outside',cons:8,trend:10,flow:-5,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:35,close:'mid',cons:3,trend:-10,flow:20,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'mid',cons:3,trend:-5,flow:30,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:50,close:'mid',cons:8,trend:-5,flow:-5,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:50,close:'mid',cons:3,trend:30,flow:30,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'outside',cons:8,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:-20,flow:null,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:60,close:'strong',cons:8,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'mid',cons:8,trend:null,flow:-5,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:30,close:'mid',cons:3,trend:-20,flow:20,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:35,close:'strong',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:35,close:'outside',cons:8,trend:-5,flow:20,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:50,close:'mid',cons:8,trend:-5,flow:30,hvn:0.35,sl:'atr',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:50,close:'mid',cons:5,trend:-5,flow:null,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'outside',cons:3,trend:30,flow:-5,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'outside',cons:5,trend:-10,flow:20,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:30,close:'strong',cons:5,trend:30,flow:10,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:55,close:'outside',cons:3,trend:30,flow:-5,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:-5,flow:null,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:35,close:'outside',cons:8,trend:20,flow:10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:35,close:'outside',cons:5,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:55,close:'strong',cons:3,trend:30,flow:-10,hvn:0.35,sl:'atr',tp:'2r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'outside',cons:3,trend:-10,flow:10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:50,close:'mid',cons:8,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:40,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'mid',cons:8,trend:30,flow:null,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:30,flow:-5,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:45,close:'strong',cons:8,trend:-10,flow:null,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:60,close:'strong',cons:8,trend:null,flow:-10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:50,close:'mid',cons:5,trend:20,flow:-10,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:10,flow:-5,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:40,close:'mid',cons:3,trend:10,flow:-10,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'outside',cons:5,trend:20,flow:30,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'outside',cons:5,trend:30,flow:-10,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'outside',cons:3,trend:-20,flow:-10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:50,close:'outside',cons:8,trend:30,flow:10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'outside',cons:3,trend:-20,flow:null,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:30,close:'outside',cons:5,trend:30,flow:20,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:-5,flow:20,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:25,close:'outside',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'mid',cons:5,trend:-20,flow:10,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:30,close:'outside',cons:8,trend:20,flow:20,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:40,close:'mid',cons:3,trend:-10,flow:-5,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'outside',cons:8,trend:20,flow:10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:35,close:'outside',cons:3,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'outside',cons:3,trend:10,flow:-5,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:60,close:'mid',cons:5,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:25,close:'outside',cons:3,trend:null,flow:30,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:55,close:'outside',cons:3,trend:20,flow:-5,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'mid',cons:5,trend:-10,flow:10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:50,close:'strong',cons:5,trend:10,flow:-10,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:45,close:'mid',cons:8,trend:30,flow:-5,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:60,close:'outside',cons:8,trend:-20,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:-5,flow:null,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'outside',cons:5,trend:-10,flow:20,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'mid',cons:5,trend:20,flow:null,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:50,close:'outside',cons:3,trend:-10,flow:null,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:50,close:'strong',cons:3,trend:-10,flow:10,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:35,close:'outside',cons:5,trend:30,flow:null,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'mid',cons:8,trend:30,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:55,close:'strong',cons:8,trend:null,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:20,flow:-10,hvn:0.35,sl:'wick',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:50,close:'mid',cons:3,trend:20,flow:-5,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:25,close:'outside',cons:3,trend:-5,flow:30,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:60,close:'strong',cons:5,trend:-10,flow:-5,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:20,flow:30,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:55,close:'outside',cons:8,trend:20,flow:-5,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:60,close:'outside',cons:5,trend:30,flow:-5,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:50,close:'strong',cons:8,trend:null,flow:-5,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:35,close:'mid',cons:5,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:30,close:'strong',cons:8,trend:10,flow:10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:30,close:'strong',cons:3,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'outside',cons:8,trend:-20,flow:10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:-10,flow:10,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'outside',cons:5,trend:10,flow:null,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:55,close:'strong',cons:5,trend:20,flow:10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:40,close:'strong',cons:5,trend:30,flow:-5,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:20,flow:10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:35,close:'mid',cons:8,trend:-5,flow:20,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:60,close:'strong',cons:3,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:50,close:'outside',cons:8,trend:-5,flow:30,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'outside',cons:5,trend:20,flow:30,hvn:0.5,sl:'atr',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:25,close:'mid',cons:5,trend:10,flow:10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:45,close:'strong',cons:8,trend:-10,flow:null,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'mid',cons:5,trend:null,flow:-10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:25,close:'strong',cons:3,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:60,close:'outside',cons:8,trend:30,flow:null,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'strong',cons:5,trend:20,flow:30,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:55,close:'mid',cons:5,trend:-5,flow:30,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:55,close:'outside',cons:5,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:30,flow:-5,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:10,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:25,close:'mid',cons:3,trend:10,flow:null,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:30,close:'outside',cons:8,trend:20,flow:-10,hvn:0.5,sl:'atr',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:35,close:'outside',cons:8,trend:-20,flow:-5,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:45,close:'outside',cons:3,trend:-10,flow:null,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:60,close:'outside',cons:8,trend:-5,flow:-10,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:null,flow:null,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:25,close:'strong',cons:5,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:60,close:'mid',cons:5,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:50,close:'mid',cons:8,trend:-10,flow:10,hvn:0.25,sl:'atr',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'outside',cons:8,trend:null,flow:10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:60,close:'outside',cons:8,trend:-5,flow:30,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:55,close:'outside',cons:8,trend:20,flow:-5,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'outside',cons:3,trend:30,flow:30,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:25,close:'strong',cons:3,trend:-5,flow:30,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:45,close:'outside',cons:5,trend:10,flow:-10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:30,flow:30,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:35,close:'mid',cons:3,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:25,close:'outside',cons:3,trend:30,flow:30,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:30,close:'strong',cons:8,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:60,close:'mid',cons:3,trend:-20,flow:20,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:50,close:'mid',cons:3,trend:10,flow:-10,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'mid',cons:3,trend:-20,flow:null,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:50,close:'mid',cons:3,trend:-5,flow:-5,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:35,close:'outside',cons:5,trend:10,flow:null,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'outside',cons:5,trend:-20,flow:null,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'outside',cons:5,trend:-20,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:50,close:'mid',cons:3,trend:-10,flow:-10,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'mid',cons:3,trend:-10,flow:20,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:60,close:'outside',cons:8,trend:-5,flow:10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:40,close:'strong',cons:3,trend:10,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:-20,flow:null,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:25,close:'mid',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:50,close:'strong',cons:5,trend:20,flow:30,hvn:0.25,sl:'atr',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:45,close:'strong',cons:8,trend:10,flow:20,hvn:0.25,sl:'atr',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:25,close:'outside',cons:5,trend:-10,flow:10,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:-20,flow:20,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:-5,flow:-5,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:60,close:'strong',cons:8,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:55,close:'outside',cons:5,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'mid',cons:5,trend:20,flow:20,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:40,close:'outside',cons:3,trend:30,flow:-10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:60,close:'strong',cons:8,trend:20,flow:20,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'mid',cons:5,trend:-10,flow:null,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:30,flow:30,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:35,close:'mid',cons:5,trend:-10,flow:-10,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'strong',cons:5,trend:null,flow:null,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:50,close:'strong',cons:8,trend:-10,flow:10,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:25,close:'outside',cons:8,trend:10,flow:null,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:25,close:'strong',cons:8,trend:-20,flow:20,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'strong',cons:5,trend:-20,flow:10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'mid',cons:5,trend:null,flow:-5,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:60,close:'mid',cons:3,trend:30,flow:30,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:50,close:'outside',cons:8,trend:30,flow:10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:35,close:'outside',cons:3,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'outside',cons:3,trend:30,flow:null,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:55,close:'outside',cons:5,trend:20,flow:30,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:60,close:'strong',cons:5,trend:30,flow:-5,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:10,flow:null,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:50,close:'mid',cons:8,trend:-10,flow:null,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:30,close:'strong',cons:3,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'1h'},
  {w:35,close:'outside',cons:3,trend:10,flow:-5,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'outside',cons:8,trend:10,flow:30,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:35,close:'outside',cons:5,trend:-10,flow:-5,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:60,close:'outside',cons:5,trend:null,flow:null,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:35,close:'strong',cons:5,trend:null,flow:null,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'strong',cons:8,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'strong',cons:3,trend:-20,flow:20,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:50,close:'mid',cons:5,trend:-20,flow:20,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:60,close:'mid',cons:8,trend:-10,flow:20,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:45,close:'strong',cons:5,trend:-20,flow:20,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:25,close:'strong',cons:5,trend:20,flow:null,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'strong',cons:3,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:60,close:'mid',cons:8,trend:30,flow:20,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'outside',cons:5,trend:null,flow:null,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:30,close:'mid',cons:8,trend:null,flow:-10,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:60,close:'mid',cons:3,trend:-10,flow:30,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:55,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'mid',cons:5,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:60,close:'mid',cons:8,trend:30,flow:-10,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:null,flow:20,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:55,close:'mid',cons:5,trend:-5,flow:-5,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:30,close:'mid',cons:3,trend:-10,flow:-10,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:55,close:'mid',cons:3,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:30,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:30,close:'strong',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:50,close:'mid',cons:3,trend:10,flow:20,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:-10,flow:-10,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:-20,flow:30,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:-20,flow:-10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'15m'},
  {w:55,close:'mid',cons:5,trend:20,flow:-10,hvn:0.35,sl:'atr',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:-5,flow:20,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:-20,flow:30,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:30,close:'mid',cons:5,trend:20,flow:30,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:-20,flow:20,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'outside',cons:3,trend:-20,flow:-10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:50,close:'strong',cons:5,trend:-5,flow:30,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'strong',cons:8,trend:null,flow:30,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:30,close:'strong',cons:3,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:35,close:'mid',cons:8,trend:-10,flow:30,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:55,close:'outside',cons:3,trend:20,flow:-5,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:30,flow:30,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:35,close:'outside',cons:8,trend:20,flow:30,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:30,flow:-5,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:40,close:'outside',cons:3,trend:10,flow:30,hvn:0.5,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:25,close:'mid',cons:8,trend:-5,flow:20,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:55,close:'mid',cons:8,trend:-5,flow:null,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'mid',cons:3,trend:10,flow:-10,hvn:0.35,sl:'atr',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:45,close:'outside',cons:8,trend:-5,flow:-10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:55,close:'strong',cons:3,trend:20,flow:10,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:40,close:'mid',cons:5,trend:10,flow:30,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:55,close:'strong',cons:5,trend:-20,flow:20,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:50,close:'mid',cons:5,trend:-10,flow:20,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:60,close:'outside',cons:3,trend:-20,flow:null,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'mid',cons:3,trend:-5,flow:-5,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:30,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:35,close:'mid',cons:3,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:50,close:'strong',cons:3,trend:30,flow:-5,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'strong',cons:8,trend:-5,flow:null,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:35,close:'mid',cons:5,trend:-10,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'mid',cons:8,trend:null,flow:-5,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:55,close:'outside',cons:5,trend:30,flow:-5,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:60,close:'strong',cons:3,trend:20,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:60,close:'mid',cons:3,trend:-20,flow:30,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:25,close:'strong',cons:3,trend:10,flow:10,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:25,close:'outside',cons:8,trend:20,flow:10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:60,close:'strong',cons:5,trend:10,flow:-5,hvn:0.35,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'strong',cons:3,trend:null,flow:10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'mid',cons:8,trend:30,flow:20,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:30,close:'outside',cons:8,trend:-20,flow:null,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'outside',cons:5,trend:30,flow:10,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:60,close:'mid',cons:3,trend:30,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:55,close:'mid',cons:5,trend:20,flow:20,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'outside',cons:8,trend:null,flow:20,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'mid',cons:8,trend:20,flow:-5,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:50,close:'mid',cons:3,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:55,close:'strong',cons:8,trend:20,flow:-5,hvn:0.35,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'outside',cons:8,trend:-5,flow:null,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:45,close:'mid',cons:8,trend:-20,flow:-10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:-10,flow:-5,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'outside',cons:8,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:50,close:'outside',cons:8,trend:-10,flow:30,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:35,close:'outside',cons:3,trend:-5,flow:10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:50,close:'strong',cons:5,trend:-10,flow:30,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'mid',cons:5,trend:30,flow:20,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:30,close:'outside',cons:5,trend:-10,flow:10,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:30,flow:30,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:25,close:'mid',cons:8,trend:10,flow:-10,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:60,close:'strong',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'outside',cons:3,trend:10,flow:20,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'outside',cons:5,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:25,close:'strong',cons:3,trend:-5,flow:-5,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:40,close:'mid',cons:5,trend:-10,flow:30,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:50,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:55,close:'outside',cons:5,trend:-20,flow:10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:60,close:'strong',cons:5,trend:20,flow:10,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:30,close:'strong',cons:3,trend:-5,flow:10,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'outside',cons:5,trend:10,flow:-5,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:60,close:'outside',cons:3,trend:-20,flow:20,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:30,close:'strong',cons:5,trend:null,flow:null,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:35,close:'outside',cons:8,trend:20,flow:10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:55,close:'mid',cons:3,trend:-5,flow:-5,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'strong',cons:8,trend:30,flow:30,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'mid',cons:3,trend:30,flow:20,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:35,close:'outside',cons:5,trend:30,flow:null,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:25,close:'strong',cons:3,trend:-10,flow:10,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:25,close:'outside',cons:3,trend:30,flow:20,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:60,close:'strong',cons:5,trend:null,flow:10,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'strong',cons:8,trend:30,flow:-10,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'strong',cons:3,trend:30,flow:-10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'strong',cons:3,trend:null,flow:null,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:20,flow:20,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:45,close:'mid',cons:3,trend:10,flow:20,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:50,close:'mid',cons:3,trend:-5,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:35,close:'mid',cons:8,trend:20,flow:30,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:30,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:60,close:'outside',cons:3,trend:20,flow:null,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:40,close:'mid',cons:5,trend:null,flow:-5,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:60,close:'outside',cons:8,trend:-20,flow:30,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:40,close:'strong',cons:8,trend:30,flow:-5,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:55,close:'strong',cons:8,trend:20,flow:null,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:50,close:'strong',cons:3,trend:20,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:50,close:'outside',cons:8,trend:30,flow:null,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:30,close:'strong',cons:8,trend:null,flow:null,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:40,close:'mid',cons:3,trend:30,flow:-5,hvn:0.5,sl:'wick',tp:'1r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:30,close:'outside',cons:3,trend:null,flow:10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:55,close:'outside',cons:3,trend:20,flow:null,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:10,flow:null,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:10,flow:-10,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:45,close:'mid',cons:5,trend:-5,flow:30,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:30,flow:-5,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:10,flow:20,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'mid',cons:3,trend:-20,flow:30,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'strong',cons:8,trend:-10,flow:20,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:25,close:'strong',cons:3,trend:20,flow:-10,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'mid',cons:3,trend:30,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:60,close:'outside',cons:8,trend:10,flow:-5,hvn:0.25,sl:'wick',tp:'2r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:50,close:'strong',cons:3,trend:-20,flow:-10,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:-5,flow:-10,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:35,close:'outside',cons:3,trend:10,flow:10,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:40,close:'strong',cons:5,trend:30,flow:-10,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:40,close:'strong',cons:3,trend:30,flow:10,hvn:0.5,sl:'atr',tp:'1r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:60,close:'outside',cons:5,trend:20,flow:-5,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:25,close:'outside',cons:3,trend:-20,flow:10,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'strong',cons:3,trend:-20,flow:null,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'mid',cons:5,trend:-5,flow:10,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'mid',cons:8,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:30,close:'mid',cons:3,trend:10,flow:-10,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'strong',cons:8,trend:-20,flow:30,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'strong',cons:8,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:60,close:'outside',cons:8,trend:10,flow:20,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:40,close:'mid',cons:5,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:50,close:'mid',cons:3,trend:-5,flow:10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:35,close:'outside',cons:5,trend:10,flow:30,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:40,close:'mid',cons:3,trend:-10,flow:20,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:25,close:'strong',cons:8,trend:-5,flow:null,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:30,close:'mid',cons:3,trend:-10,flow:20,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:55,close:'mid',cons:8,trend:null,flow:10,hvn:0.25,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'strong',cons:3,trend:10,flow:30,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:40,close:'strong',cons:5,trend:10,flow:10,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'mid',cons:8,trend:30,flow:-10,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:30,close:'mid',cons:8,trend:null,flow:-10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:60,close:'mid',cons:8,trend:null,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:25,close:'mid',cons:3,trend:null,flow:30,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:55,close:'outside',cons:3,trend:-10,flow:null,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:-20,flow:10,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:55,close:'outside',cons:3,trend:20,flow:null,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'mid',cons:8,trend:null,flow:30,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:25,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.25,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:50,close:'strong',cons:8,trend:-20,flow:20,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:50,close:'outside',cons:3,trend:-5,flow:30,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:50,close:'outside',cons:3,trend:-20,flow:10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:60,close:'mid',cons:8,trend:20,flow:30,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:55,close:'outside',cons:8,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'strong',cons:8,trend:-5,flow:30,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:25,close:'outside',cons:8,trend:-10,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:55,close:'strong',cons:5,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:-20,flow:20,hvn:0.5,sl:'wick',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'strong',cons:3,trend:-20,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:45,close:'mid',cons:3,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:35,close:'mid',cons:3,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:55,close:'mid',cons:5,trend:-5,flow:-5,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'outside',cons:3,trend:null,flow:20,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:55,close:'mid',cons:5,trend:20,flow:20,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'strong',cons:5,trend:10,flow:30,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:40,close:'mid',cons:3,trend:30,flow:-5,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'outside',cons:8,trend:10,flow:30,hvn:0.25,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:40,close:'mid',cons:3,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'outside',cons:8,trend:10,flow:-5,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'15m'},
  {w:60,close:'outside',cons:3,trend:null,flow:30,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'outside',cons:8,trend:-20,flow:-10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:25,close:'strong',cons:3,trend:30,flow:-10,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:30,close:'mid',cons:3,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:45,close:'outside',cons:8,trend:10,flow:null,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:60,close:'mid',cons:5,trend:10,flow:10,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:25,close:'mid',cons:5,trend:30,flow:null,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:45,close:'strong',cons:3,trend:-10,flow:10,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:30,flow:null,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:50,close:'mid',cons:5,trend:20,flow:30,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'outside',cons:5,trend:30,flow:null,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:40,close:'outside',cons:3,trend:-20,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:40,close:'strong',cons:5,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'strong',cons:5,trend:-5,flow:30,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'outside',cons:3,trend:null,flow:-5,hvn:0.5,sl:'atr',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:10,flow:20,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'mid',cons:8,trend:-5,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:30,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:null,flow:-10,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:55,close:'strong',cons:5,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:55,close:'outside',cons:3,trend:-10,flow:20,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'outside',cons:3,trend:-20,flow:30,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'outside',cons:3,trend:-10,flow:10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'outside',cons:3,trend:-20,flow:10,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:-10,flow:30,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:40,close:'outside',cons:8,trend:10,flow:20,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:45,close:'strong',cons:3,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'outside',cons:8,trend:30,flow:20,hvn:0.5,sl:'atr',tp:'1r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:25,close:'strong',cons:5,trend:30,flow:-5,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:null,flow:20,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:40,close:'strong',cons:3,trend:20,flow:null,hvn:0.25,sl:'wick',tp:'2r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:40,close:'strong',cons:5,trend:-10,flow:-10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:55,close:'mid',cons:3,trend:-10,flow:30,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'strong',cons:5,trend:10,flow:30,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:null,flow:20,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:50,close:'mid',cons:3,trend:30,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:35,close:'strong',cons:8,trend:-10,flow:20,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:25,close:'outside',cons:5,trend:30,flow:10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'strong',cons:8,trend:20,flow:-10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:40,close:'strong',cons:8,trend:-5,flow:30,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:40,close:'mid',cons:8,trend:30,flow:null,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'strong',cons:3,trend:null,flow:30,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:60,close:'mid',cons:8,trend:20,flow:30,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'strong',cons:8,trend:20,flow:-5,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:40,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:50,close:'strong',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:55,close:'outside',cons:5,trend:20,flow:20,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:null,flow:-5,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:30,close:'strong',cons:8,trend:-20,flow:10,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'mid',cons:5,trend:-20,flow:20,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:25,close:'mid',cons:8,trend:-20,flow:null,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'strong',cons:3,trend:-5,flow:30,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:20,flow:10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:40,close:'outside',cons:8,trend:30,flow:-5,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:55,close:'outside',cons:8,trend:-20,flow:30,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'mid',cons:8,trend:30,flow:null,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:55,close:'mid',cons:8,trend:-10,flow:30,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:25,close:'mid',cons:3,trend:-10,flow:-5,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:25,close:'strong',cons:8,trend:-10,flow:-10,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:50,close:'mid',cons:5,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:50,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:25,close:'strong',cons:8,trend:30,flow:-10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:60,close:'outside',cons:8,trend:20,flow:-10,hvn:0.25,sl:'wick',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:30,close:'mid',cons:3,trend:-5,flow:10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:25,close:'strong',cons:3,trend:20,flow:10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:55,close:'strong',cons:5,trend:-5,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:60,close:'strong',cons:8,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:25,close:'strong',cons:3,trend:-10,flow:null,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:30,close:'outside',cons:8,trend:-10,flow:30,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:45,close:'mid',cons:3,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:30,close:'strong',cons:8,trend:20,flow:10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:55,close:'outside',cons:5,trend:-20,flow:30,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:35,close:'outside',cons:3,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'outside',cons:3,trend:null,flow:10,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:55,close:'mid',cons:3,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'outside',cons:3,trend:10,flow:30,hvn:0.35,sl:'atr',tp:'1r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'mid',cons:5,trend:-20,flow:-10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:45,close:'outside',cons:8,trend:30,flow:10,hvn:0.25,sl:'wick',tp:'2r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'outside',cons:8,trend:-5,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:30,close:'strong',cons:5,trend:null,flow:-5,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:55,close:'outside',cons:8,trend:20,flow:-5,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'strong',cons:5,trend:20,flow:-5,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:55,close:'mid',cons:8,trend:-5,flow:20,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:60,close:'strong',cons:8,trend:30,flow:-10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'outside',cons:3,trend:-10,flow:20,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'strong',cons:5,trend:-20,flow:-10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:50,close:'outside',cons:8,trend:null,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'outside',cons:3,trend:null,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:60,close:'mid',cons:8,trend:-10,flow:10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:35,close:'strong',cons:3,trend:null,flow:10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:55,close:'outside',cons:5,trend:null,flow:20,hvn:0.35,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:30,close:'strong',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:40,close:'mid',cons:3,trend:null,flow:null,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:30,close:'outside',cons:8,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:null,flow:null,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:50,close:'mid',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:35,close:'outside',cons:8,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:30,close:'strong',cons:3,trend:-20,flow:30,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:50,close:'strong',cons:5,trend:null,flow:30,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:30,flow:-5,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'mid',cons:8,trend:-10,flow:-5,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'outside',cons:8,trend:-5,flow:null,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:50,close:'mid',cons:3,trend:20,flow:10,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:25,close:'outside',cons:3,trend:-10,flow:10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:50,close:'mid',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:50,close:'outside',cons:5,trend:-10,flow:20,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:60,close:'outside',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'outside',cons:8,trend:-5,flow:-5,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:45,close:'strong',cons:5,trend:30,flow:10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:35,close:'outside',cons:5,trend:-5,flow:10,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:-20,flow:null,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:60,close:'mid',cons:3,trend:30,flow:30,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:20,flow:-10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:25,close:'mid',cons:5,trend:null,flow:-5,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:50,close:'mid',cons:8,trend:-5,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:35,close:'strong',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:20,flow:null,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:30,flow:10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:-5,flow:30,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:45,close:'mid',cons:5,trend:20,flow:-10,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:50,close:'mid',cons:3,trend:10,flow:10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:55,close:'strong',cons:3,trend:-5,flow:-5,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:35,close:'outside',cons:8,trend:20,flow:20,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'outside',cons:8,trend:-20,flow:-5,hvn:0.25,sl:'atr',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:30,close:'outside',cons:8,trend:null,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:35,close:'outside',cons:3,trend:-5,flow:-5,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'outside',cons:5,trend:-10,flow:10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'strong',cons:3,trend:10,flow:null,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:35,close:'outside',cons:3,trend:20,flow:30,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:45,close:'mid',cons:8,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:55,close:'outside',cons:8,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:45,close:'mid',cons:8,trend:null,flow:20,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:60,close:'outside',cons:3,trend:10,flow:-5,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:50,close:'mid',cons:3,trend:-10,flow:-10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:-20,flow:10,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:40,close:'outside',cons:8,trend:-10,flow:30,hvn:0.5,sl:'atr',tp:'1r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:40,close:'outside',cons:3,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:50,close:'strong',cons:5,trend:-20,flow:20,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:null,flow:-5,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:50,close:'mid',cons:5,trend:null,flow:20,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:50,close:'strong',cons:3,trend:null,flow:-10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'outside',cons:3,trend:20,flow:-5,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'mid',cons:8,trend:10,flow:10,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:55,close:'strong',cons:5,trend:20,flow:null,hvn:0.5,sl:'atr',tp:'2r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:60,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:30,close:'outside',cons:5,trend:null,flow:-10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:40,close:'strong',cons:8,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'mid',cons:5,trend:30,flow:20,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'outside',cons:5,trend:null,flow:30,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'mid',cons:5,trend:null,flow:20,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'outside',cons:5,trend:-10,flow:-5,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:35,close:'strong',cons:5,trend:10,flow:20,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:30,close:'outside',cons:3,trend:10,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:55,close:'mid',cons:3,trend:-20,flow:30,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:45,close:'strong',cons:3,trend:null,flow:-10,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:-10,flow:10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'strong',cons:3,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:45,close:'outside',cons:8,trend:10,flow:-10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:45,close:'strong',cons:5,trend:-10,flow:-5,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:60,close:'outside',cons:5,trend:20,flow:20,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:60,close:'outside',cons:3,trend:10,flow:30,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:45,close:'strong',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:45,close:'mid',cons:3,trend:null,flow:20,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:45,close:'outside',cons:3,trend:-5,flow:30,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:45,close:'mid',cons:5,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:45,close:'outside',cons:5,trend:-10,flow:30,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:35,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:50,close:'outside',cons:8,trend:20,flow:10,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:55,close:'strong',cons:5,trend:30,flow:20,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'outside',cons:5,trend:10,flow:30,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:50,close:'strong',cons:8,trend:20,flow:-5,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:30,flow:-10,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'outside',cons:5,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:30,close:'mid',cons:8,trend:null,flow:-5,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'strong',cons:3,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:45,close:'strong',cons:5,trend:20,flow:null,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:null,flow:10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'outside',cons:8,trend:-10,flow:20,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'outside',cons:8,trend:20,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:60,close:'mid',cons:8,trend:-10,flow:10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:60,close:'outside',cons:8,trend:-5,flow:null,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:60,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.5,sl:'atr',tp:'2r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'strong',cons:8,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'mid',cons:8,trend:20,flow:-10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:50,close:'strong',cons:8,trend:30,flow:10,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:-10,flow:-10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:55,close:'outside',cons:8,trend:10,flow:20,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'mid',cons:8,trend:30,flow:-10,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'mid',cons:5,trend:10,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:50,close:'mid',cons:8,trend:10,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:45,close:'outside',cons:3,trend:-5,flow:-10,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:55,close:'strong',cons:5,trend:null,flow:-10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'strong',cons:3,trend:10,flow:30,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:40,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:-5,flow:20,hvn:0.5,sl:'atr',tp:'1r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:30,close:'outside',cons:5,trend:10,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:40,close:'strong',cons:8,trend:30,flow:10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:35,close:'mid',cons:8,trend:-5,flow:20,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:25,close:'outside',cons:3,trend:null,flow:20,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:-5,flow:-10,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'4h'},
  {w:60,close:'strong',cons:3,trend:20,flow:null,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'mid',cons:8,trend:-10,flow:-5,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'outside',cons:5,trend:-5,flow:30,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:40,close:'outside',cons:5,trend:20,flow:-10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:45,close:'mid',cons:8,trend:-5,flow:-5,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:50,close:'outside',cons:8,trend:30,flow:-5,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:25,close:'outside',cons:8,trend:-5,flow:30,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'outside',cons:5,trend:-5,flow:30,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'mid',cons:8,trend:-5,flow:null,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:45,close:'strong',cons:8,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:60,close:'strong',cons:8,trend:-20,flow:10,hvn:0.25,sl:'atr',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'mid',cons:5,trend:-20,flow:-10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:35,close:'strong',cons:8,trend:30,flow:10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:10,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:-10,flow:20,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:50,close:'mid',cons:5,trend:20,flow:-5,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:25,close:'outside',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:20,flow:20,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:40,close:'mid',cons:3,trend:-5,flow:-5,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:30,close:'mid',cons:8,trend:-5,flow:20,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:35,close:'strong',cons:5,trend:30,flow:-5,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:60,close:'strong',cons:3,trend:-20,flow:10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'5m'},
  {w:35,close:'outside',cons:5,trend:null,flow:30,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'strong',cons:5,trend:null,flow:-5,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:55,close:'strong',cons:5,trend:20,flow:10,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:30,close:'outside',cons:3,trend:10,flow:20,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'outside',cons:3,trend:30,flow:30,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:50,close:'mid',cons:3,trend:null,flow:-5,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:-20,flow:null,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:40,close:'outside',cons:5,trend:30,flow:null,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:60,close:'mid',cons:3,trend:20,flow:30,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:50,close:'outside',cons:8,trend:30,flow:-10,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:30,close:'strong',cons:8,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:25,close:'outside',cons:3,trend:10,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:60,close:'mid',cons:3,trend:-20,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:40,close:'strong',cons:3,trend:null,flow:10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:35,close:'mid',cons:3,trend:-10,flow:30,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:-5,flow:10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:50,close:'strong',cons:5,trend:20,flow:-10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:40,close:'mid',cons:3,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:25,close:'mid',cons:5,trend:20,flow:-10,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:40,close:'strong',cons:3,trend:10,flow:20,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:50,close:'strong',cons:3,trend:20,flow:null,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'outside',cons:5,trend:-10,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:55,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:-20,flow:30,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:35,close:'outside',cons:8,trend:10,flow:10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:null,flow:-5,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'mid',cons:5,trend:20,flow:20,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:30,close:'mid',cons:3,trend:10,flow:null,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:50,close:'outside',cons:8,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'strong',cons:8,trend:30,flow:20,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:25,close:'mid',cons:8,trend:10,flow:20,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:50,close:'strong',cons:3,trend:-10,flow:10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:55,close:'outside',cons:3,trend:-20,flow:20,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'strong',cons:8,trend:-5,flow:-10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'strong',cons:5,trend:10,flow:-5,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:50,close:'strong',cons:8,trend:-10,flow:10,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:25,close:'mid',cons:5,trend:-20,flow:-10,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:60,close:'mid',cons:3,trend:null,flow:20,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'outside',cons:5,trend:-10,flow:10,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:30,close:'strong',cons:3,trend:null,flow:30,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:50,close:'strong',cons:8,trend:10,flow:-5,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'outside',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'strong',cons:3,trend:-20,flow:20,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:50,close:'strong',cons:3,trend:10,flow:-10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'strong',cons:3,trend:10,flow:10,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:-20,flow:10,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:-10,flow:-5,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:45,close:'mid',cons:8,trend:null,flow:20,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:30,close:'outside',cons:5,trend:null,flow:20,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'4h'},
  {w:25,close:'mid',cons:3,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:-5,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'15m'},
  {w:60,close:'outside',cons:5,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:30,close:'mid',cons:5,trend:10,flow:30,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:35,close:'mid',cons:8,trend:20,flow:null,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'15m'},
  {w:45,close:'strong',cons:8,trend:30,flow:-10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:45,close:'outside',cons:8,trend:-10,flow:10,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:45,close:'outside',cons:5,trend:-10,flow:20,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:40,close:'strong',cons:5,trend:-10,flow:30,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:45,close:'outside',cons:5,trend:-10,flow:null,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:55,close:'strong',cons:8,trend:null,flow:-5,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:30,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:55,close:'strong',cons:5,trend:-5,flow:-10,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:25,close:'outside',cons:8,trend:null,flow:10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:40,close:'strong',cons:3,trend:-20,flow:30,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:60,close:'outside',cons:8,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:40,close:'outside',cons:8,trend:10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:40,close:'mid',cons:8,trend:-5,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:30,flow:10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'outside',cons:8,trend:-20,flow:-10,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'strong',cons:3,trend:-20,flow:10,hvn:0.25,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:55,close:'outside',cons:5,trend:-10,flow:10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:30,close:'mid',cons:3,trend:-10,flow:30,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:55,close:'strong',cons:5,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:30,flow:10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:-10,flow:30,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:25,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'outside',cons:5,trend:-10,flow:10,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'outside',cons:3,trend:null,flow:20,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:10,flow:10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:55,close:'strong',cons:8,trend:null,flow:-5,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:30,close:'mid',cons:3,trend:30,flow:-10,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:60,close:'outside',cons:5,trend:-10,flow:30,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'outside',cons:5,trend:-20,flow:null,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:null,flow:30,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:55,close:'strong',cons:8,trend:-10,flow:20,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'mid',cons:8,trend:-5,flow:-10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:30,close:'strong',cons:5,trend:10,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:25,close:'outside',cons:8,trend:10,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:40,close:'mid',cons:8,trend:-20,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:35,close:'outside',cons:8,trend:-5,flow:20,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:50,close:'strong',cons:8,trend:10,flow:10,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:55,close:'mid',cons:3,trend:10,flow:-5,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:55,close:'mid',cons:3,trend:20,flow:null,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:25,close:'mid',cons:8,trend:-20,flow:-10,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:30,flow:-10,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:50,close:'outside',cons:5,trend:null,flow:null,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'mid',cons:8,trend:20,flow:null,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:30,flow:10,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'mid',cons:5,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:60,close:'mid',cons:3,trend:null,flow:-10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'outside',cons:5,trend:-20,flow:-5,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:60,close:'mid',cons:5,trend:20,flow:-5,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'15m'},
  {w:50,close:'strong',cons:5,trend:20,flow:-5,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:-20,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:35,close:'strong',cons:3,trend:-10,flow:-5,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:50,close:'strong',cons:5,trend:-5,flow:10,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:30,close:'outside',cons:5,trend:10,flow:20,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:-5,flow:-10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:null,flow:-10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'mid',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:30,flow:null,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:45,close:'mid',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:10,flow:-5,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:60,close:'outside',cons:3,trend:null,flow:10,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:40,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:60,close:'strong',cons:8,trend:30,flow:10,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:50,close:'strong',cons:5,trend:30,flow:30,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:25,close:'mid',cons:5,trend:20,flow:-10,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:-10,flow:10,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:45,close:'outside',cons:3,trend:-20,flow:-10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:45,close:'outside',cons:5,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:30,close:'mid',cons:3,trend:-10,flow:20,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:50,close:'mid',cons:5,trend:20,flow:-10,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:null,flow:-10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:null,flow:20,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'strong',cons:3,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:55,close:'mid',cons:5,trend:-5,flow:30,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:55,close:'outside',cons:5,trend:10,flow:-5,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'outside',cons:8,trend:20,flow:-5,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'outside',cons:5,trend:-20,flow:null,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'strong',cons:3,trend:-20,flow:-5,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:30,close:'mid',cons:3,trend:-5,flow:30,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:55,close:'strong',cons:3,trend:null,flow:-10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'strong',cons:5,trend:-5,flow:-10,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:25,close:'outside',cons:5,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:40,close:'strong',cons:3,trend:20,flow:30,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:35,close:'strong',cons:3,trend:-20,flow:20,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:50,close:'strong',cons:5,trend:30,flow:-10,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:-5,flow:-10,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:60,close:'outside',cons:8,trend:30,flow:-10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:40,close:'outside',cons:5,trend:null,flow:null,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:45,close:'mid',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:40,close:'outside',cons:3,trend:10,flow:-10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:30,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:35,close:'outside',cons:3,trend:20,flow:null,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:40,close:'strong',cons:8,trend:-5,flow:10,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:50,close:'mid',cons:3,trend:-10,flow:-5,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'outside',cons:5,trend:-5,flow:30,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:45,close:'outside',cons:5,trend:-10,flow:10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:20,flow:30,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:35,close:'mid',cons:3,trend:null,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'outside',cons:5,trend:-10,flow:10,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'mid',cons:8,trend:10,flow:30,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:40,close:'mid',cons:3,trend:20,flow:10,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:55,close:'outside',cons:8,trend:20,flow:20,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'strong',cons:3,trend:10,flow:-5,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:60,close:'outside',cons:3,trend:30,flow:30,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'strong',cons:8,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1h'},
  {w:40,close:'strong',cons:5,trend:30,flow:30,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:-10,flow:10,hvn:0.5,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'strong',cons:5,trend:-20,flow:20,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:50,close:'strong',cons:8,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:25,close:'mid',cons:8,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:20,flow:10,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:50,close:'mid',cons:8,trend:20,flow:-5,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'mid',cons:3,trend:-10,flow:-5,hvn:0.5,sl:'atr',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:50,close:'strong',cons:5,trend:20,flow:-10,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:50,close:'outside',cons:3,trend:-10,flow:null,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:null,flow:30,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'outside',cons:5,trend:null,flow:30,hvn:0.35,sl:'atr',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:35,close:'strong',cons:5,trend:null,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:35,close:'outside',cons:5,trend:-20,flow:null,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:-5,flow:30,hvn:0.35,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:50,close:'outside',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'outside',cons:8,trend:-20,flow:30,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:60,close:'strong',cons:5,trend:-5,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:60,close:'strong',cons:3,trend:null,flow:30,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:60,close:'mid',cons:8,trend:30,flow:-10,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:55,close:'outside',cons:8,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'strong',cons:5,trend:20,flow:-10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'mid',cons:3,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:35,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:40,close:'mid',cons:8,trend:20,flow:null,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:null,flow:-10,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'1d'},
  {w:50,close:'outside',cons:3,trend:-20,flow:30,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:50,close:'strong',cons:3,trend:-5,flow:30,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:-10,flow:30,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:50,close:'mid',cons:8,trend:10,flow:10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:60,close:'outside',cons:5,trend:null,flow:-5,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:-20,flow:-5,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:55,close:'outside',cons:5,trend:null,flow:10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'strong',cons:3,trend:-20,flow:null,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:25,close:'mid',cons:5,trend:-20,flow:-5,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:-20,flow:-10,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:25,close:'outside',cons:5,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:50,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:55,close:'strong',cons:3,trend:-5,flow:10,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:25,close:'strong',cons:5,trend:-20,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:30,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'mid',cons:3,trend:null,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'5m'},
  {w:40,close:'outside',cons:5,trend:-20,flow:null,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:30,flow:-10,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'mid',cons:5,trend:-20,flow:30,hvn:0.25,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:40,close:'mid',cons:8,trend:20,flow:10,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:50,close:'outside',cons:3,trend:20,flow:null,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'outside',cons:8,trend:-20,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'1d'},
  {w:30,close:'outside',cons:8,trend:30,flow:10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'mid',cons:8,trend:-5,flow:10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:55,close:'mid',cons:3,trend:-10,flow:30,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'1d'},
  {w:40,close:'mid',cons:3,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:55,close:'mid',cons:5,trend:-10,flow:-5,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:30,flow:20,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:35,close:'mid',cons:3,trend:10,flow:30,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:55,close:'strong',cons:5,trend:-20,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:35,close:'strong',cons:5,trend:10,flow:-10,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:50,close:'strong',cons:8,trend:10,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:60,close:'mid',cons:5,trend:20,flow:-10,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'5m'},
  {w:55,close:'outside',cons:8,trend:10,flow:30,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:-5,flow:10,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'15m'},
  {w:60,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:-5,flow:-10,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'outside',cons:8,trend:-20,flow:30,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'mid',cons:8,trend:null,flow:-10,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:-10,flow:30,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:50,close:'strong',cons:5,trend:10,flow:-10,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:30,flow:null,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:30,close:'outside',cons:3,trend:20,flow:null,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'outside',cons:8,trend:-20,flow:-10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'outside',cons:8,trend:null,flow:10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1d'},
  {w:35,close:'mid',cons:5,trend:20,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:-20,flow:30,hvn:0.25,sl:'atr',tp:'1r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'strong',cons:5,trend:10,flow:30,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:25,close:'strong',cons:8,trend:null,flow:-5,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:60,close:'mid',cons:5,trend:-10,flow:10,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:60,close:'mid',cons:5,trend:30,flow:10,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:35,close:'mid',cons:5,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:35,close:'outside',cons:3,trend:null,flow:10,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'strong',cons:5,trend:-20,flow:-10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:50,close:'outside',cons:3,trend:-10,flow:30,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:55,close:'mid',cons:3,trend:-10,flow:30,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'15m'},
  {w:45,close:'mid',cons:8,trend:-10,flow:30,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:40,close:'mid',cons:8,trend:-20,flow:-5,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:35,close:'mid',cons:8,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:30,close:'mid',cons:3,trend:10,flow:-5,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'15m'},
  {w:45,close:'strong',cons:3,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:60,close:'strong',cons:3,trend:30,flow:-5,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'mid',cons:8,trend:null,flow:30,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:45,close:'mid',cons:3,trend:-20,flow:-5,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'strong',cons:5,trend:30,flow:-5,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:35,close:'strong',cons:3,trend:-10,flow:null,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:25,close:'strong',cons:5,trend:20,flow:-5,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'1d'},
  {w:25,close:'strong',cons:3,trend:20,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:35,close:'strong',cons:3,trend:null,flow:-5,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:25,close:'strong',cons:5,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:40,close:'outside',cons:3,trend:20,flow:30,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:10,flow:-5,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:30,close:'outside',cons:3,trend:10,flow:null,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1h'},
  {w:35,close:'mid',cons:3,trend:-20,flow:20,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:45,close:'mid',cons:3,trend:-10,flow:-5,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:55,close:'outside',cons:3,trend:null,flow:null,hvn:0.35,sl:'wick',tp:'2r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1d'},
  {w:45,close:'mid',cons:5,trend:null,flow:30,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'outside',cons:5,trend:20,flow:10,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'strong',cons:3,trend:null,flow:20,hvn:0.25,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'1h'},
  {w:60,close:'mid',cons:8,trend:10,flow:-10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'mid',cons:8,trend:null,flow:-5,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:60,close:'outside',cons:3,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:60,close:'outside',cons:8,trend:20,flow:-10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:60,close:'mid',cons:3,trend:null,flow:20,hvn:0.25,sl:'atr',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:25,close:'strong',cons:5,trend:30,flow:-10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:null,flow:-5,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:35,close:'mid',cons:8,trend:20,flow:-5,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:55,close:'mid',cons:5,trend:null,flow:20,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'mid',cons:8,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:55,close:'outside',cons:5,trend:null,flow:20,hvn:0.5,sl:'wick',tp:'3pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:40,close:'strong',cons:8,trend:30,flow:-5,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:40,close:'strong',cons:5,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'strong',cons:3,trend:-5,flow:-10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'5m'},
  {w:40,close:'outside',cons:3,trend:null,flow:-5,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:55,close:'mid',cons:8,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:60,close:'strong',cons:8,trend:10,flow:null,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'4h'},
  {w:55,close:'strong',cons:3,trend:-5,flow:30,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:30,close:'mid',cons:5,trend:10,flow:null,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:60,close:'outside',cons:5,trend:-10,flow:20,hvn:0.5,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'15m'},
  {w:25,close:'strong',cons:5,trend:null,flow:20,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:45,close:'strong',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:55,close:'outside',cons:8,trend:-20,flow:null,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:55,close:'outside',cons:5,trend:-20,flow:-10,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:35,close:'outside',cons:8,trend:10,flow:20,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.2,tf:'1h'},
  {w:30,close:'mid',cons:5,trend:null,flow:-5,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'1h'},
  {w:60,close:'mid',cons:8,trend:-20,flow:-10,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:50,close:'strong',cons:5,trend:-5,flow:null,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'mid',cons:8,trend:20,flow:30,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:60,close:'strong',cons:3,trend:10,flow:-10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'5m'},
  {w:55,close:'outside',cons:5,trend:30,flow:10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'15m'},
  {w:60,close:'strong',cons:8,trend:-5,flow:30,hvn:0.5,sl:'wick',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:25,close:'mid',cons:3,trend:10,flow:null,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1h'},
  {w:45,close:'strong',cons:8,trend:-10,flow:-5,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:50,close:'strong',cons:8,trend:10,flow:30,hvn:0.25,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:50,close:'outside',cons:8,trend:-20,flow:-5,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'4h'},
  {w:40,close:'strong',cons:3,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:35,close:'outside',cons:8,trend:20,flow:-5,hvn:0.5,sl:'wick',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'4h'},
  {w:50,close:'outside',cons:5,trend:-5,flow:30,hvn:0.35,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:45,close:'outside',cons:5,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'strong',cons:8,trend:-5,flow:-10,hvn:0.35,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:55,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:20,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1d'},
  {w:45,close:'mid',cons:5,trend:-20,flow:-10,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1d'},
  {w:50,close:'outside',cons:3,trend:30,flow:10,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1h'},
  {w:60,close:'outside',cons:3,trend:-20,flow:10,hvn:0.25,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:25,close:'outside',cons:8,trend:-10,flow:10,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'strong',cons:5,trend:-5,flow:-10,hvn:0.5,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:50,close:'mid',cons:3,trend:-5,flow:20,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:55,close:'outside',cons:5,trend:-20,flow:-10,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'4h'},
  {w:60,close:'outside',cons:8,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:55,close:'outside',cons:5,trend:-5,flow:30,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:45,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:40,close:'outside',cons:8,trend:-20,flow:null,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'4h'},
  {w:35,close:'mid',cons:3,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:30,close:'strong',cons:3,trend:10,flow:30,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'strong',cons:8,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'outside',cons:8,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:35,close:'outside',cons:3,trend:-5,flow:-10,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:30,close:'strong',cons:3,trend:-20,flow:30,hvn:0.5,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'strong',cons:5,trend:10,flow:20,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:45,close:'strong',cons:5,trend:-20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:30,close:'strong',cons:5,trend:-5,flow:10,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:35,close:'mid',cons:8,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'mid',cons:5,trend:-5,flow:30,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:30,close:'mid',cons:5,trend:null,flow:-5,hvn:0.35,sl:'hvn',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'4h'},
  {w:25,close:'mid',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:45,close:'outside',cons:3,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'1d'},
  {w:60,close:'mid',cons:8,trend:-10,flow:-5,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.15,tf:'1d'},
  {w:25,close:'strong',cons:8,trend:20,flow:30,hvn:0.5,sl:'atr',tp:'1r',volSpike:'off',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'4h'},
  {w:45,close:'outside',cons:3,trend:30,flow:-10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:25,close:'outside',cons:3,trend:-5,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:25,close:'mid',cons:8,trend:-5,flow:null,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'strong',cons:8,trend:-10,flow:10,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.1,tf:'1d'},
  {w:35,close:'strong',cons:8,trend:30,flow:30,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:45,close:'mid',cons:8,trend:-10,flow:10,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:-5,flow:-10,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:50,close:'mid',cons:3,trend:-20,flow:-10,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:35,close:'mid',cons:5,trend:null,flow:-5,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:55,close:'mid',cons:3,trend:-10,flow:-10,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:25,close:'outside',cons:5,trend:-20,flow:null,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'5m'},
  {w:35,close:'mid',cons:5,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'mid',cons:8,trend:-10,flow:20,hvn:0.5,sl:'wick',tp:'0.5pct',volSpike:'off',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:10,flow:null,hvn:0.35,sl:'atr',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'1h'},
  {w:35,close:'strong',cons:5,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:50,close:'outside',cons:3,trend:-5,flow:-10,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:60,close:'outside',cons:3,trend:20,flow:null,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:0.15,tf:'4h'},
  {w:30,close:'strong',cons:8,trend:20,flow:20,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:35,close:'mid',cons:3,trend:-10,flow:null,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'mid',cons:3,trend:30,flow:-5,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'mid',cons:5,trend:null,flow:10,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:40,close:'strong',cons:3,trend:-5,flow:null,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'mid',cons:8,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:40,close:'mid',cons:8,trend:30,flow:null,hvn:0.35,sl:'atr',tp:'3pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:55,close:'strong',cons:8,trend:30,flow:null,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'mid',cons:8,trend:30,flow:null,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'mid',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'mid',cons:8,trend:-20,flow:20,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:-20,flow:null,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:45,close:'outside',cons:8,trend:-10,flow:30,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:45,close:'mid',cons:8,trend:20,flow:20,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:35,close:'outside',cons:5,trend:-10,flow:null,hvn:0.5,sl:'atr',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'1h'},
  {w:30,close:'mid',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'15m'},
  {w:35,close:'mid',cons:3,trend:10,flow:30,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'outside',cons:8,trend:30,flow:10,hvn:0.25,sl:'wick',tp:'2r',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'sub',minAtrHvn:0.25,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:10,flow:10,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:50,close:'outside',cons:8,trend:-10,flow:30,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'strong',cons:3,trend:-5,flow:10,hvn:0.5,sl:'atr',tp:'1pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'1h'},
  {w:55,close:'mid',cons:3,trend:30,flow:null,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:55,close:'outside',cons:8,trend:-10,flow:null,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'outside',cons:8,trend:10,flow:20,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'15m'},
  {w:40,close:'strong',cons:3,trend:-20,flow:null,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'strong',cons:8,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'0.5pct',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.1,tf:'5m'},
  {w:35,close:'outside',cons:3,trend:10,flow:null,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:35,close:'strong',cons:8,trend:30,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:35,close:'outside',cons:8,trend:30,flow:30,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'15m'},
  {w:60,close:'strong',cons:3,trend:null,flow:10,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:55,close:'strong',cons:5,trend:-10,flow:-10,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:40,close:'strong',cons:5,trend:20,flow:-10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:40,close:'strong',cons:3,trend:20,flow:null,hvn:0.5,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'15m'},
  {w:30,close:'strong',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'2pct',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:50,close:'mid',cons:5,trend:-5,flow:30,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:50,close:'outside',cons:8,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2pct',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:60,close:'outside',cons:3,trend:30,flow:null,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:45,close:'mid',cons:3,trend:-5,flow:null,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'15m'},
  {w:60,close:'outside',cons:8,trend:30,flow:-5,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:40,close:'strong',cons:5,trend:-5,flow:-10,hvn:0.5,sl:'atr',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1h'},
  {w:30,close:'mid',cons:8,trend:10,flow:-5,hvn:0.5,sl:'hvn',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'15m'},
  {w:35,close:'strong',cons:5,trend:10,flow:null,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:40,close:'outside',cons:3,trend:20,flow:-5,hvn:0.5,sl:'hvn',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.25,tf:'4h'},
  {w:50,close:'outside',cons:5,trend:-5,flow:20,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:50,close:'mid',cons:3,trend:-5,flow:20,hvn:0.25,sl:'atr',tp:'1r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:40,close:'mid',cons:5,trend:10,flow:30,hvn:0.25,sl:'wick',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'15m'},
  {w:50,close:'outside',cons:3,trend:-10,flow:null,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'15m'},
  {w:30,close:'outside',cons:5,trend:30,flow:20,hvn:0.5,sl:'atr',tp:'2r',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:25,close:'mid',cons:3,trend:30,flow:10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:50,close:'mid',cons:5,trend:10,flow:30,hvn:0.25,sl:'wick',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'15m'},
  {w:35,close:'outside',cons:8,trend:null,flow:30,hvn:0.25,sl:'wick',tp:'2r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:null,tf:'4h'},
  {w:40,close:'strong',cons:3,trend:null,flow:null,hvn:0.5,sl:'atr',tp:'2r',volSpike:'1.5',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'mid',cons:5,trend:null,flow:-10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'outside',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'mid',cons:5,trend:-20,flow:20,hvn:0.35,sl:'hvn',tp:'1pct',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.05,tf:'4h'},
  {w:45,close:'mid',cons:8,trend:-5,flow:null,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:60,close:'mid',cons:8,trend:10,flow:30,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:40,close:'outside',cons:8,trend:30,flow:20,hvn:0.5,sl:'wick',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.2,tf:'5m'},
  {w:45,close:'mid',cons:5,trend:10,flow:-10,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'1.5',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'5m'},
  {w:35,close:'strong',cons:5,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1h'},
  {w:50,close:'outside',cons:3,trend:30,flow:null,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:30,close:'outside',cons:8,trend:-20,flow:10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:25,close:'strong',cons:3,trend:-10,flow:-5,hvn:0.35,sl:'atr',tp:'1r',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.05,tf:'5m'},
  {w:35,close:'strong',cons:8,trend:10,flow:20,hvn:0.35,sl:'hvn',tp:'2pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'mid',cons:5,trend:-5,flow:null,hvn:0.5,sl:'hvn',tp:'2pct',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'off',minAtrHvn:null,tf:'1h'},
  {w:40,close:'mid',cons:5,trend:20,flow:-5,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:40,close:'mid',cons:3,trend:30,flow:-5,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:55,close:'strong',cons:3,trend:10,flow:30,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'1d'},
  {w:60,close:'strong',cons:5,trend:30,flow:null,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'5m'},
  {w:30,close:'mid',cons:5,trend:30,flow:20,hvn:0.25,sl:'atr',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1h'},
  {w:35,close:'strong',cons:5,trend:-5,flow:-10,hvn:0.5,sl:'wick',tp:'1.5pct',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:45,close:'outside',cons:3,trend:20,flow:null,hvn:0.25,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.2,tf:'1d'},
  {w:45,close:'mid',cons:5,trend:-20,flow:null,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.1,tf:'1h'},
  {w:30,close:'mid',cons:3,trend:30,flow:10,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'off',mode:'engulf',diveMin:3,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:35,close:'mid',cons:3,trend:20,flow:30,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:30,close:'mid',cons:5,trend:-10,flow:10,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:null,tf:'1h'},
  {w:40,close:'strong',cons:8,trend:10,flow:20,hvn:0.25,sl:'hvn',tp:'1pct',volSpike:'2.0',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.3,tf:'5m'},
  {w:50,close:'outside',cons:5,trend:20,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.05,tf:'1d'},
  {w:45,close:'strong',cons:5,trend:20,flow:null,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.25,tf:'1d'},
  {w:60,close:'strong',cons:5,trend:20,flow:null,hvn:0.5,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'outside',cons:5,trend:20,flow:-5,hvn:0.25,sl:'wick',tp:'1.5pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.3,tf:'1d'},
  {w:60,close:'mid',cons:5,trend:null,flow:10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'5m'},
  {w:25,close:'strong',cons:3,trend:-10,flow:10,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'1h'},
  {w:60,close:'strong',cons:8,trend:-5,flow:-5,hvn:0.5,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:55,close:'mid',cons:8,trend:30,flow:-5,hvn:0.25,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:45,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.25,sl:'hvn',tp:'3pct',volSpike:'1.5',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:40,close:'outside',cons:8,trend:-20,flow:-10,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:50,close:'mid',cons:3,trend:null,flow:-5,hvn:0.25,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'1h'},
  {w:25,close:'mid',cons:3,trend:-5,flow:10,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2,trendFilter:'sub',minAtrHvn:0.05,tf:'4h'},
  {w:25,close:'outside',cons:3,trend:30,flow:null,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:55,close:'outside',cons:8,trend:-5,flow:null,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'add',minAtrHvn:0.1,tf:'1h'},
  {w:25,close:'mid',cons:8,trend:10,flow:-10,hvn:0.35,sl:'atr',tp:'1r',volSpike:'1.5',mode:'all',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'15m'},
  {w:40,close:'strong',cons:5,trend:-10,flow:30,hvn:0.25,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'15m'},
  {w:50,close:'mid',cons:3,trend:-5,flow:30,hvn:0.5,sl:'atr',tp:'3pct',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.05,tf:'1h'},
  {w:30,close:'outside',cons:3,trend:20,flow:-5,hvn:0.35,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'1d'},
  {w:30,close:'mid',cons:5,trend:10,flow:-10,hvn:0.25,sl:'atr',tp:'2pct',volSpike:'1.5',mode:'dive',diveMin:3,trendFilter:'sub',minAtrHvn:0.25,tf:'1d'},
  {w:55,close:'strong',cons:8,trend:30,flow:10,hvn:0.5,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'15m'},
  {w:50,close:'strong',cons:5,trend:20,flow:20,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'2.0',mode:'wick',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:45,close:'strong',cons:8,trend:30,flow:-10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:55,close:'strong',cons:8,trend:null,flow:10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:2,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:60,close:'mid',cons:3,trend:20,flow:10,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:4,trendFilter:'sub',minAtrHvn:0.05,tf:'1h'},
  {w:50,close:'strong',cons:3,trend:10,flow:-10,hvn:0.5,sl:'atr',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'add',minAtrHvn:0.25,tf:'5m'},
  {w:35,close:'strong',cons:8,trend:10,flow:10,hvn:0.35,sl:'wick',tp:'3pct',volSpike:'off',mode:'all',diveMin:4,trendFilter:'add',minAtrHvn:0.2,tf:'15m'},
  {w:55,close:'strong',cons:5,trend:null,flow:20,hvn:0.35,sl:'atr',tp:'1.5pct',volSpike:'1.5',mode:'all',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'15m'},
  {w:25,close:'strong',cons:5,trend:30,flow:10,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:4,trendFilter:'add',minAtrHvn:0.3,tf:'5m'},
  {w:45,close:'outside',cons:5,trend:-5,flow:20,hvn:0.25,sl:'wick',tp:'0.5pct',volSpike:'2.0',mode:'engulf',diveMin:4,trendFilter:'off',minAtrHvn:0.3,tf:'5m'},
  {w:35,close:'mid',cons:3,trend:null,flow:null,hvn:0.5,sl:'atr',tp:'1.5pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:null,tf:'5m'},
  {w:55,close:'strong',cons:3,trend:null,flow:null,hvn:0.5,sl:'wick',tp:'1pct',volSpike:'off',mode:'wick',diveMin:2,trendFilter:'add',minAtrHvn:0.2,tf:'5m'},
  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.25,sl:'atr',tp:'1pct',volSpike:'off',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.3,tf:'1d'},
  {w:40,close:'strong',cons:5,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'engulf',diveMin:2,trendFilter:'sub',minAtrHvn:0.1,tf:'1h'},
  {w:25,close:'mid',cons:5,trend:-5,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'sub',minAtrHvn:0.15,tf:'4h'},
  {w:35,close:'strong',cons:3,trend:-10,flow:null,hvn:0.5,sl:'wick',tp:'2pct',volSpike:'2.0',mode:'all',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'1d'},
  {w:30,close:'mid',cons:3,trend:-5,flow:20,hvn:0.5,sl:'atr',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:2,trendFilter:'off',minAtrHvn:0.15,tf:'15m'},
  {w:30,close:'outside',cons:5,trend:-10,flow:30,hvn:0.25,sl:'wick',tp:'1pct',volSpike:'1.5',mode:'wick',diveMin:3,trendFilter:'sub',minAtrHvn:null,tf:'4h'},
  {w:25,close:'outside',cons:3,trend:20,flow:null,hvn:0.25,sl:'atr',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2,trendFilter:'off',minAtrHvn:0.3,tf:'4h'},
  {w:40,close:'strong',cons:8,trend:-10,flow:-10,hvn:0.35,sl:'hvn',tp:'3pct',volSpike:'2.0',mode:'engulf',diveMin:3,trendFilter:'off',minAtrHvn:0.05,tf:'15m'},
  {w:60,close:'outside',cons:8,trend:10,flow:-5,hvn:0.35,sl:'hvn',tp:'hvn',volSpike:'2.0',mode:'dive',diveMin:4,trendFilter:'add',minAtrHvn:null,tf:'15m'},
  {w:55,close:'mid',cons:8,trend:null,flow:null,hvn:0.35,sl:'hvn',tp:'0.5pct',volSpike:'off',mode:'dive',diveMin:3,trendFilter:'off',minAtrHvn:0.25,tf:'1h'}
];
var CLOSE_LABELS={outside:'Fech. fora da zona',mid:'Fech. além do meio',strong:'Corpo forte'};

function _tLabel(v){if(v===null||v===undefined)return '';return v>0?'Clarity > +'+v:'Clarity < '+v;}
function _fLabel(v){if(v===null||v===undefined)return '';return v>0?'Flow > +'+v:'Flow < '+v;}

function _cfgLabel(c){
  if(c.fast!==undefined){
    var p=['TB F'+c.fast+'/S'+c.slow];
    if(c.bias>0)p.push('Bias≥'+c.bias);
    if(c.exitMode==='sltp')p.push('SL/TP');
    var tl=_tLabel(c.trend),fl=_fLabel(c.flow);
    if(tl)p.push(tl);if(fl)p.push(fl);
    if(c.volSpike&&c.volSpike!=='off')p.push('Vol×'+c.volSpike);
    return p.join(' | ');
  }
  if(c.minAtr!==undefined){
    var p=['Gap > '+parseFloat(c.minAtr).toFixed(2)+'×ATR'];
    if(c.mitMode==='close')p.push('Mit:Close');
    var tl=_tLabel(c.trend),fl=_fLabel(c.flow);
    if(tl)p.push(tl);if(fl)p.push(fl);
    if(c.react)p.push('React');
    if(c.reentry)p.push('Re-entry');
    if(c.maxAge>0)p.push('Age≤'+c.maxAge);
    if(c.volSpike&&c.volSpike!=='off')p.push('Vol×'+c.volSpike);
    return p.join(' | ');
  }
  var modeTag={wick:'',dive:'DIVE',engulf:'ENGULF',all:'ALL'};
  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];
  if(modeTag[c.mode])p.unshift('['+modeTag[c.mode]+']');
  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);
  if(tl)p.push(tl);if(fl)p.push(fl);
  if(c.volSpike&&c.volSpike!=='off')p.push('Vol ×'+c.volSpike);
  if(c.minAtrHvn&&c.minAtrHvn>0)p.push('ATR≥'+parseFloat(c.minAtrHvn).toFixed(2)+'×');
  if(c.tp&&c.tp.indexOf('pct')>-1)p.push('TP '+c.tp.replace('pct','')+'%');
  if(c.tf&&c.tf!=='5m')p.push('TF:'+c.tf);
  return p.join(' | ');
}

var TB_OPT_COMBOS=[
  {fast:3,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:-10,volSpike:'off'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:20,volSpike:'2.0'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:7,slow:14,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:10,flow:10,volSpike:'off'},
  {fast:10,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'1.5'},
  {fast:7,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:30,volSpike:'1.5'},
  {fast:5,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:20,volSpike:'1.5'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:-10,volSpike:'off'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:null,volSpike:'off'},
  {fast:5,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'2.0'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'off'},
  {fast:3,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:-10,volSpike:'off'},
  {fast:10,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'off'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:5,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:10,volSpike:'2.0'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:20,volSpike:'1.5'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:10,volSpike:'off'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:10,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:10,volSpike:'1.5'},
  {fast:10,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:3,slow:20,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:10,volSpike:'1.5'},
  {fast:2,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'off'},
  {fast:10,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:10,slow:8,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:2,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:20,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:20,volSpike:'off'},
  {fast:3,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:30,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:3,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:10,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:-10,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:30,volSpike:'off'},
  {fast:3,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:-10,volSpike:'1.5'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:20,volSpike:'off'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:20,volSpike:'1.5'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:3,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:null,volSpike:'1.5'},
  {fast:10,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:20,volSpike:'1.5'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:-10,volSpike:'off'},
  {fast:7,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:30,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:null,volSpike:'off'},
  {fast:3,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:5,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'off'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:10,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:null,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:3,slow:14,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:7,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:5,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:7,slow:20,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:null,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'1.5'},
  {fast:2,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:null,flow:-10,volSpike:'off'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'off'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:20,volSpike:'2.0'},
  {fast:3,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:30,volSpike:'2.0'},
  {fast:5,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:20,volSpike:'1.5'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:10,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:null,volSpike:'off'},
  {fast:10,slow:14,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:10,volSpike:'1.5'},
  {fast:3,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:null,volSpike:'off'},
  {fast:3,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'off'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:5,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:null,flow:20,volSpike:'2.0'},
  {fast:3,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'off'},
  {fast:2,slow:10,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:null,volSpike:'1.5'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:3,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:30,volSpike:'off'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:-10,volSpike:'1.5'},
  {fast:10,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:3,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:null,volSpike:'off'},
  {fast:7,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:20,volSpike:'2.0'},
  {fast:5,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:20,volSpike:'1.5'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:30,volSpike:'off'},
  {fast:5,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:30,volSpike:'off'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:-10,volSpike:'off'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:10,volSpike:'1.5'},
  {fast:2,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:20,volSpike:'1.5'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:5,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:3,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:30,volSpike:'1.5'},
  {fast:7,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'off'},
  {fast:10,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:3,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:20,volSpike:'1.5'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:-10,volSpike:'off'},
  {fast:2,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'2.0'},
  {fast:10,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:20,volSpike:'1.5'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:30,volSpike:'1.5'},
  {fast:2,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:5,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:-10,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:-10,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:-10,volSpike:'2.0'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:2,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:30,volSpike:'2.0'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:null,volSpike:'off'},
  {fast:2,slow:14,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:10,volSpike:'1.5'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:3,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:10,volSpike:'off'},
  {fast:2,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:10,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:3,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:30,volSpike:'2.0'},
  {fast:10,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:null,volSpike:'off'},
  {fast:2,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:-10,volSpike:'off'},
  {fast:7,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:10,volSpike:'off'},
  {fast:3,slow:20,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'2.0'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:20,volSpike:'off'},
  {fast:2,slow:14,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:-10,volSpike:'off'},
  {fast:3,slow:14,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:20,volSpike:'off'},
  {fast:5,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:20,volSpike:'off'},
  {fast:3,slow:10,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'off'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:8,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:3,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:null,volSpike:'1.5'},
  {fast:10,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:null,volSpike:'2.0'},
  {fast:7,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:10,volSpike:'1.5'},
  {fast:5,slow:14,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:3,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:10,volSpike:'1.5'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:30,volSpike:'off'},
  {fast:2,slow:10,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:7,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:5,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:20,volSpike:'off'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:3,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:3,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:20,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:20,volSpike:'off'},
  {fast:2,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'off'},
  {fast:2,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:20,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:10,volSpike:'off'},
  {fast:3,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:20,volSpike:'2.0'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'2.0'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'1.5'},
  {fast:10,slow:20,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:7,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'2.0'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:10,volSpike:'2.0'},
  {fast:10,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:30,volSpike:'off'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:30,volSpike:'off'},
  {fast:7,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'1.5'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:30,volSpike:'1.5'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:-10,flow:20,volSpike:'off'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:2,slow:20,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:30,volSpike:'2.0'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:10,volSpike:'off'},
  {fast:10,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:20,volSpike:'1.5'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:10,volSpike:'off'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:null,volSpike:'2.0'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:30,volSpike:'1.5'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:20,volSpike:'off'},
  {fast:7,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'1.5'},
  {fast:5,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:10,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:10,volSpike:'2.0'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:30,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:3,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:20,volSpike:'1.5'},
  {fast:3,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:5,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:3,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:30,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:10,volSpike:'1.5'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:10,volSpike:'1.5'},
  {fast:5,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:8,bias:3,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:null,volSpike:'off'},
  {fast:10,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:10,volSpike:'2.0'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:null,flow:10,volSpike:'off'},
  {fast:3,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:20,volSpike:'1.5'},
  {fast:3,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:3,slow:20,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'1.5'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'1.5'},
  {fast:2,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'2.0'},
  {fast:10,slow:8,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'1.5'},
  {fast:10,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:-10,flow:30,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:10,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:20,volSpike:'2.0'},
  {fast:3,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'off'},
  {fast:2,slow:8,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:20,volSpike:'1.5'},
  {fast:5,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:5,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:30,volSpike:'1.5'},
  {fast:10,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:null,volSpike:'2.0'},
  {fast:10,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:3,slow:14,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:10,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:20,volSpike:'1.5'},
  {fast:3,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'2.0'},
  {fast:2,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:10,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:10,flow:30,volSpike:'off'},
  {fast:2,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'off'},
  {fast:7,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:null,volSpike:'1.5'},
  {fast:5,slow:20,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:30,volSpike:'off'},
  {fast:5,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:null,volSpike:'off'},
  {fast:3,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:10,volSpike:'2.0'},
  {fast:3,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:10,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:3,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:-10,volSpike:'2.0'},
  {fast:10,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:null,volSpike:'off'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:3,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'2.0'},
  {fast:3,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:5,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:10,volSpike:'1.5'},
  {fast:10,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:null,volSpike:'off'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:3,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:2,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:10,slow:20,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:-10,volSpike:'off'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:5,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:5,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:10,volSpike:'off'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:10,volSpike:'1.5'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:-10,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:20,volSpike:'off'},
  {fast:5,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:20,volSpike:'off'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:2,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'1.5'},
  {fast:3,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'1.5'},
  {fast:2,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:30,volSpike:'1.5'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:10,volSpike:'2.0'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:30,volSpike:'1.5'},
  {fast:2,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:30,volSpike:'off'},
  {fast:5,slow:10,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:30,volSpike:'off'},
  {fast:3,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:null,flow:null,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:10,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:7,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:20,volSpike:'off'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:2,slow:10,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:30,volSpike:'2.0'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:-10,volSpike:'1.5'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:10,volSpike:'2.0'},
  {fast:10,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:10,volSpike:'2.0'},
  {fast:5,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:10,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:2,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:-10,volSpike:'2.0'},
  {fast:7,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:20,volSpike:'2.0'},
  {fast:3,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:10,volSpike:'1.5'},
  {fast:5,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:10,volSpike:'2.0'},
  {fast:10,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:null,volSpike:'1.5'},
  {fast:10,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:20,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:20,volSpike:'off'},
  {fast:10,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:20,volSpike:'1.5'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:30,volSpike:'2.0'},
  {fast:5,slow:30,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:30,volSpike:'2.0'},
  {fast:2,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:2,slow:20,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:10,volSpike:'1.5'},
  {fast:10,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:null,volSpike:'off'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:-10,volSpike:'off'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:null,flow:-10,volSpike:'off'},
  {fast:7,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:null,volSpike:'off'},
  {fast:2,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:7,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:5,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'off'},
  {fast:10,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:10,volSpike:'1.5'},
  {fast:10,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:5,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'off'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'off'},
  {fast:10,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:5,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:2,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:null,volSpike:'off'},
  {fast:2,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:10,volSpike:'off'},
  {fast:2,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:30,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:30,volSpike:'2.0'},
  {fast:10,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:3,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:20,volSpike:'off'},
  {fast:5,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:-10,flow:20,volSpike:'1.5'},
  {fast:3,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:null,volSpike:'off'},
  {fast:3,slow:10,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:5,slow:20,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:10,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'off'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:30,volSpike:'2.0'},
  {fast:3,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:-10,volSpike:'off'},
  {fast:10,slow:20,bias:0,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:10,volSpike:'2.0'},
  {fast:3,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:20,volSpike:'off'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:-10,volSpike:'off'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:10,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:20,volSpike:'2.0'},
  {fast:10,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:10,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:null,volSpike:'2.0'},
  {fast:2,slow:10,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:-10,volSpike:'off'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:10,volSpike:'1.5'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:10,volSpike:'1.5'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:10,volSpike:'off'},
  {fast:2,slow:20,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:null,volSpike:'1.5'},
  {fast:2,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:10,volSpike:'2.0'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:-10,volSpike:'off'},
  {fast:2,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:10,volSpike:'2.0'},
  {fast:10,slow:30,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:5,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:10,flow:20,volSpike:'1.5'},
  {fast:2,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:30,volSpike:'2.0'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:30,volSpike:'off'},
  {fast:2,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:null,volSpike:'off'},
  {fast:3,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:20,volSpike:'2.0'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:20,volSpike:'off'},
  {fast:2,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:null,volSpike:'off'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'off'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:3,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:-10,volSpike:'off'},
  {fast:7,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'1.5'},
  {fast:7,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:2,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:10,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:3,slow:20,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:2,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:10,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:-10,volSpike:'2.0'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:20,volSpike:'1.5'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:2,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:-10,flow:20,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:null,volSpike:'off'},
  {fast:5,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:20,volSpike:'off'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:3,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:10,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'2.0'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:null,volSpike:'off'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:5,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:10,volSpike:'off'},
  {fast:2,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:null,volSpike:'off'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:7,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:30,volSpike:'1.5'},
  {fast:7,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:null,volSpike:'1.5'},
  {fast:3,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:3,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:20,volSpike:'2.0'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:2,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:2,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:20,volSpike:'1.5'},
  {fast:3,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:20,volSpike:'2.0'},
  {fast:10,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:10,volSpike:'2.0'},
  {fast:3,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'off'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'1.5'},
  {fast:3,slow:20,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:10,volSpike:'off'},
  {fast:5,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:10,volSpike:'1.5'},
  {fast:3,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'off'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:10,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:30,volSpike:'1.5'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:7,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:-10,volSpike:'1.5'},
  {fast:5,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:30,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:7,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:10,volSpike:'off'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:10,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:20,volSpike:'1.5'},
  {fast:10,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:10,slow:20,bias:3,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:3,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:10,volSpike:'2.0'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:5,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'off'},
  {fast:2,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:30,flow:null,volSpike:'1.5'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:30,volSpike:'off'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'1.5'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:20,volSpike:'off'},
  {fast:3,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:7,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:3,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:null,volSpike:'2.0'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'off'},
  {fast:2,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'1.5'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:10,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:null,volSpike:'1.5'},
  {fast:3,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:5,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:30,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:20,volSpike:'2.0'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:30,flow:null,volSpike:'off'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:10,volSpike:'1.5'},
  {fast:7,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:10,volSpike:'off'},
  {fast:10,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:20,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:10,volSpike:'off'},
  {fast:2,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:null,volSpike:'2.0'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:10,volSpike:'2.0'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:-10,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'2.0'},
  {fast:2,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:10,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:5,slow:20,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:10,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:30,volSpike:'off'},
  {fast:5,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:10,volSpike:'off'},
  {fast:2,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:null,volSpike:'off'},
  {fast:3,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:null,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:null,volSpike:'off'},
  {fast:10,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'2.0'},
  {fast:10,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:null,volSpike:'off'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:10,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:null,volSpike:'2.0'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:30,volSpike:'off'},
  {fast:7,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:30,volSpike:'1.5'},
  {fast:2,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:-10,volSpike:'off'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:7,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:10,slow:30,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:10,volSpike:'off'},
  {fast:5,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:null,volSpike:'1.5'},
  {fast:2,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:3,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:-10,volSpike:'2.0'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:-10,volSpike:'off'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:20,volSpike:'2.0'},
  {fast:2,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:10,volSpike:'2.0'},
  {fast:10,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:-10,volSpike:'2.0'},
  {fast:5,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:20,volSpike:'2.0'},
  {fast:3,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'off'},
  {fast:10,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:30,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:3,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:null,volSpike:'off'},
  {fast:3,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:null,volSpike:'off'},
  {fast:10,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'off'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:30,volSpike:'1.5'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:30,volSpike:'2.0'},
  {fast:2,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:5,slow:30,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:30,volSpike:'2.0'},
  {fast:10,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:3,slow:20,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:10,volSpike:'off'},
  {fast:3,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:10,volSpike:'off'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:-10,volSpike:'off'},
  {fast:5,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:3,slow:30,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:20,volSpike:'1.5'},
  {fast:3,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:null,volSpike:'off'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:20,volSpike:'off'},
  {fast:7,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'off'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:30,volSpike:'1.5'},
  {fast:5,slow:20,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:30,volSpike:'off'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:20,volSpike:'off'},
  {fast:10,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'2.0'},
  {fast:7,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:30,volSpike:'2.0'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:20,volSpike:'1.5'},
  {fast:2,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:30,volSpike:'2.0'},
  {fast:10,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:10,volSpike:'2.0'},
  {fast:10,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:20,volSpike:'1.5'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:-10,volSpike:'off'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:2,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:20,volSpike:'1.5'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'off'},
  {fast:2,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'2.0'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:30,volSpike:'1.5'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:3,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:5,slow:20,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:20,volSpike:'1.5'},
  {fast:3,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:2,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:2,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:7,slow:20,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:20,volSpike:'2.0'},
  {fast:5,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:null,volSpike:'1.5'},
  {fast:2,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:30,volSpike:'2.0'},
  {fast:2,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:3,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:10,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:20,volSpike:'1.5'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:null,volSpike:'off'},
  {fast:5,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:30,volSpike:'1.5'},
  {fast:7,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:10,volSpike:'2.0'},
  {fast:3,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:10,flow:10,volSpike:'2.0'},
  {fast:7,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:-10,flow:10,volSpike:'off'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:2,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:10,volSpike:'1.5'},
  {fast:3,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:30,volSpike:'1.5'},
  {fast:10,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:7,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:20,volSpike:'2.0'},
  {fast:2,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:null,volSpike:'1.5'},
  {fast:5,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'1.5'},
  {fast:3,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:10,volSpike:'2.0'},
  {fast:7,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:30,volSpike:'1.5'},
  {fast:5,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:10,flow:30,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:30,volSpike:'off'},
  {fast:3,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'off'},
  {fast:10,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:10,volSpike:'1.5'},
  {fast:5,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:10,volSpike:'1.5'},
  {fast:3,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:30,volSpike:'off'},
  {fast:2,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:5,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:null,flow:30,volSpike:'1.5'},
  {fast:3,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:-10,volSpike:'off'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:10,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'1.5'},
  {fast:5,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:10,volSpike:'2.0'},
  {fast:2,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:20,volSpike:'2.0'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:30,volSpike:'1.5'},
  {fast:10,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:20,volSpike:'2.0'},
  {fast:10,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:7,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:30,volSpike:'2.0'},
  {fast:2,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'off'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:null,flow:null,volSpike:'1.5'},
  {fast:5,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:20,volSpike:'off'},
  {fast:7,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:-10,volSpike:'off'},
  {fast:10,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:null,volSpike:'1.5'},
  {fast:10,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:null,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'2.0'},
  {fast:7,slow:8,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:20,volSpike:'off'},
  {fast:5,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:20,volSpike:'1.5'},
  {fast:7,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'off'},
  {fast:2,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:30,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:null,volSpike:'1.5'},
  {fast:5,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:14,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'2.0'},
  {fast:3,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:-10,volSpike:'off'},
  {fast:3,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:20,volSpike:'off'},
  {fast:2,slow:20,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:-10,volSpike:'1.5'},
  {fast:10,slow:20,bias:0,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:-10,volSpike:'off'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'1.5'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:5,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:null,volSpike:'2.0'},
  {fast:2,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:10,volSpike:'1.5'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:10,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:7,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:20,volSpike:'2.0'},
  {fast:2,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:20,volSpike:'1.5'},
  {fast:2,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'2.0'},
  {fast:5,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'off'},
  {fast:2,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:30,volSpike:'2.0'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:3,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:30,volSpike:'off'},
  {fast:10,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'off'},
  {fast:7,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:2,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:3,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:null,volSpike:'off'},
  {fast:5,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:30,volSpike:'1.5'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:30,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:30,volSpike:'1.5'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:null,volSpike:'2.0'},
  {fast:10,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'2.0'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:20,volSpike:'off'},
  {fast:2,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'1.5'},
  {fast:10,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:10,volSpike:'2.0'},
  {fast:5,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:20,volSpike:'off'},
  {fast:5,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:3,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'1.5'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:10,volSpike:'2.0'},
  {fast:10,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:30,volSpike:'2.0'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'off'},
  {fast:2,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:30,volSpike:'off'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:20,volSpike:'2.0'},
  {fast:10,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:5,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:-10,volSpike:'off'},
  {fast:2,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:30,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:10,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:7,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:null,volSpike:'1.5'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:10,volSpike:'1.5'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:null,volSpike:'1.5'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'off'},
  {fast:7,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:20,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'off'},
  {fast:3,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:7,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:null,volSpike:'off'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'off'},
  {fast:10,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'off'},
  {fast:3,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:10,volSpike:'2.0'},
  {fast:10,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:20,volSpike:'2.0'},
  {fast:2,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:3,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'1.5'},
  {fast:3,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:-10,volSpike:'off'},
  {fast:10,slow:20,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:-10,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:-10,volSpike:'2.0'},
  {fast:5,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:10,volSpike:'2.0'},
  {fast:10,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:3,slow:20,bias:3,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:3,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:10,volSpike:'1.5'},
  {fast:3,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:20,volSpike:'off'},
  {fast:10,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:-10,volSpike:'off'},
  {fast:2,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:-10,volSpike:'off'},
  {fast:10,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:10,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:20,volSpike:'2.0'},
  {fast:3,slow:20,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:null,flow:10,volSpike:'off'},
  {fast:3,slow:30,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'off'},
  {fast:10,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:10,volSpike:'off'},
  {fast:3,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:-10,volSpike:'off'},
  {fast:5,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:30,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:null,volSpike:'off'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:-10,volSpike:'off'},
  {fast:2,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:20,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:20,volSpike:'2.0'},
  {fast:5,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:10,volSpike:'off'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:null,volSpike:'off'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:-10,volSpike:'off'},
  {fast:5,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'off'},
  {fast:2,slow:20,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:30,volSpike:'2.0'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:30,volSpike:'1.5'},
  {fast:3,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:7,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:20,volSpike:'2.0'},
  {fast:2,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:2,slow:14,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:-10,volSpike:'off'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:null,volSpike:'1.5'},
  {fast:3,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:20,volSpike:'2.0'},
  {fast:10,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:10,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:-10,volSpike:'1.5'},
  {fast:3,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:20,volSpike:'off'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'1.5'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'off'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:2,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'off'},
  {fast:3,slow:20,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:30,volSpike:'off'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'1.5'},
  {fast:7,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:20,volSpike:'1.5'},
  {fast:10,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:10,volSpike:'off'},
  {fast:2,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:30,volSpike:'1.5'},
  {fast:10,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:20,volSpike:'1.5'},
  {fast:10,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'2.0'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:30,volSpike:'off'},
  {fast:10,slow:20,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:null,volSpike:'off'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:10,volSpike:'off'},
  {fast:3,slow:14,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:-10,volSpike:'off'},
  {fast:3,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:30,volSpike:'2.0'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:10,volSpike:'1.5'},
  {fast:3,slow:30,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:30,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:null,flow:20,volSpike:'1.5'},
  {fast:2,slow:30,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:2,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:null,volSpike:'1.5'},
  {fast:3,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:null,volSpike:'2.0'},
  {fast:3,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:10,volSpike:'1.5'},
  {fast:3,slow:30,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:20,volSpike:'off'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:30,volSpike:'2.0'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:20,volSpike:'1.5'},
  {fast:5,slow:20,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:30,flow:20,volSpike:'1.5'},
  {fast:10,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:30,volSpike:'2.0'},
  {fast:3,slow:14,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'off'},
  {fast:7,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:5,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:20,volSpike:'off'},
  {fast:10,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'off'},
  {fast:5,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'1.5'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:10,volSpike:'off'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:5,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:10,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:10,volSpike:'off'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:10,volSpike:'1.5'},
  {fast:7,slow:20,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:null,volSpike:'2.0'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:-10,flow:10,volSpike:'off'},
  {fast:5,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:20,volSpike:'2.0'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:null,volSpike:'1.5'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:-10,volSpike:'off'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:5,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:30,volSpike:'2.0'},
  {fast:2,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:3,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:10,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:null,volSpike:'off'},
  {fast:2,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:10,volSpike:'off'},
  {fast:2,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:null,flow:20,volSpike:'2.0'},
  {fast:5,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:-10,volSpike:'off'},
  {fast:2,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:-10,flow:10,volSpike:'off'},
  {fast:3,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:null,volSpike:'off'},
  {fast:3,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'2.0'},
  {fast:2,slow:30,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:20,flow:30,volSpike:'off'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:3,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:3,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'1.5'},
  {fast:10,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:30,volSpike:'off'},
  {fast:5,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:30,volSpike:'1.5'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:10,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:30,volSpike:'1.5'},
  {fast:7,slow:10,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:20,volSpike:'1.5'},
  {fast:7,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:20,volSpike:'1.5'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:null,volSpike:'off'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:10,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:10,volSpike:'1.5'},
  {fast:10,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:2,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:10,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'off'},
  {fast:3,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:10,volSpike:'off'},
  {fast:10,slow:10,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:3,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:20,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:null,volSpike:'off'},
  {fast:2,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'2.0'},
  {fast:10,slow:10,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:10,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:30,volSpike:'1.5'},
  {fast:2,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:5,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:10,volSpike:'2.0'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:-10,volSpike:'off'},
  {fast:10,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:7,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:30,volSpike:'2.0'},
  {fast:2,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'off'},
  {fast:2,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'2.0'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:10,volSpike:'1.5'},
  {fast:3,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'1.5'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:20,volSpike:'1.5'},
  {fast:3,slow:30,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:30,volSpike:'1.5'},
  {fast:10,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:null,volSpike:'2.0'},
  {fast:5,slow:10,bias:3,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:10,volSpike:'1.5'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:30,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:2,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:30,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:10,volSpike:'1.5'},
  {fast:2,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:7,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:10,volSpike:'1.5'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:2,slow:10,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'off'},
  {fast:5,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:30,volSpike:'off'},
  {fast:10,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:30,volSpike:'off'},
  {fast:7,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:5,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:30,volSpike:'off'},
  {fast:2,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:30,volSpike:'1.5'},
  {fast:10,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:-10,volSpike:'2.0'},
  {fast:5,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:30,volSpike:'2.0'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:20,volSpike:'off'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:null,volSpike:'2.0'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:null,volSpike:'off'},
  {fast:10,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:10,volSpike:'1.5'},
  {fast:5,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'off'},
  {fast:7,slow:20,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:10,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:30,volSpike:'1.5'},
  {fast:3,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:3,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:10,volSpike:'2.0'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'off'},
  {fast:5,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:null,volSpike:'off'},
  {fast:2,slow:10,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:20,volSpike:'2.0'},
  {fast:2,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:null,volSpike:'off'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:20,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:20,volSpike:'off'},
  {fast:2,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:10,volSpike:'2.0'},
  {fast:10,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'2.0'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:3,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:null,volSpike:'1.5'},
  {fast:2,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'2.0'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:20,volSpike:'off'},
  {fast:5,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:3,slow:30,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:3,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:20,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:null,volSpike:'off'},
  {fast:2,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:-10,volSpike:'off'},
  {fast:10,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'1.5'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:10,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:null,volSpike:'off'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:20,volSpike:'1.5'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:null,volSpike:'off'},
  {fast:2,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:null,volSpike:'off'},
  {fast:7,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:30,volSpike:'1.5'},
  {fast:3,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:20,volSpike:'off'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:10,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:null,volSpike:'2.0'},
  {fast:5,slow:10,bias:3,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:20,volSpike:'off'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:30,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:20,volSpike:'2.0'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:10,volSpike:'2.0'},
  {fast:3,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:30,volSpike:'off'},
  {fast:5,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'atr',tp:'flip',trend:20,flow:10,volSpike:'off'},
  {fast:3,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'off'},
  {fast:3,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:null,volSpike:'2.0'},
  {fast:5,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:null,volSpike:'1.5'},
  {fast:2,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:null,flow:-10,volSpike:'2.0'},
  {fast:7,slow:8,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:10,volSpike:'off'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'2.0'},
  {fast:3,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:10,volSpike:'1.5'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:30,volSpike:'2.0'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'off'},
  {fast:3,slow:20,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:30,volSpike:'1.5'},
  {fast:2,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:null,volSpike:'2.0'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:-10,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:30,volSpike:'1.5'},
  {fast:3,slow:14,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'off'},
  {fast:3,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'2.0'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:20,volSpike:'2.0'},
  {fast:5,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'2.0'},
  {fast:10,slow:20,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'2.0'},
  {fast:3,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:30,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:10,volSpike:'2.0'},
  {fast:7,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:30,volSpike:'off'},
  {fast:2,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:10,volSpike:'2.0'},
  {fast:7,slow:20,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:10,volSpike:'2.0'},
  {fast:3,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:2,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'off'},
  {fast:10,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:2,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'2.0'},
  {fast:7,slow:10,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:null,volSpike:'2.0'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'2.0'},
  {fast:3,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:20,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:10,volSpike:'2.0'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'off'},
  {fast:5,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'2.0'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'1.5'},
  {fast:2,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:20,volSpike:'1.5'},
  {fast:5,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:null,volSpike:'1.5'},
  {fast:5,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'off'},
  {fast:3,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:5,slow:20,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:30,volSpike:'2.0'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'2.0'},
  {fast:3,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:5,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:null,volSpike:'1.5'},
  {fast:5,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:30,volSpike:'off'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'1.5'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:7,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:10,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:20,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:-10,volSpike:'off'},
  {fast:3,slow:20,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:30,volSpike:'2.0'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:30,volSpike:'2.0'},
  {fast:10,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:10,volSpike:'1.5'},
  {fast:3,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:10,volSpike:'off'},
  {fast:2,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:10,volSpike:'1.5'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:30,volSpike:'2.0'},
  {fast:10,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:null,volSpike:'2.0'},
  {fast:10,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:10,volSpike:'off'},
  {fast:10,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:null,volSpike:'1.5'},
  {fast:10,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:20,volSpike:'2.0'},
  {fast:3,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:10,volSpike:'1.5'},
  {fast:7,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:10,volSpike:'1.5'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:30,volSpike:'off'},
  {fast:10,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:30,volSpike:'off'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:3,slow:14,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:null,volSpike:'1.5'},
  {fast:10,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:-10,volSpike:'off'},
  {fast:5,slow:14,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:-10,volSpike:'off'},
  {fast:3,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:2,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'1.5'},
  {fast:3,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:-10,volSpike:'off'},
  {fast:10,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:30,volSpike:'off'},
  {fast:10,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:3,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:3,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:10,volSpike:'1.5'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:null,volSpike:'off'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:null,volSpike:'1.5'},
  {fast:5,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'2.0'},
  {fast:3,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:20,volSpike:'1.5'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:null,volSpike:'off'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'1r',trend:null,flow:30,volSpike:'off'},
  {fast:2,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:30,volSpike:'off'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:null,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:null,volSpike:'1.5'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:30,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'off'},
  {fast:7,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:null,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:20,volSpike:'2.0'},
  {fast:2,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:10,volSpike:'off'},
  {fast:3,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:30,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:5,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:10,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'off'},
  {fast:3,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:-10,volSpike:'off'},
  {fast:10,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:20,volSpike:'off'},
  {fast:2,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'off'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:10,volSpike:'2.0'},
  {fast:2,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'2.0'},
  {fast:3,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:10,volSpike:'1.5'},
  {fast:10,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:null,volSpike:'1.5'},
  {fast:7,slow:8,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:10,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'2.0'},
  {fast:2,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:30,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'1.5'},
  {fast:7,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'off'},
  {fast:3,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:3,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:10,volSpike:'off'},
  {fast:3,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:30,volSpike:'2.0'},
  {fast:5,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:-10,volSpike:'1.5'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:30,volSpike:'1.5'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:30,volSpike:'1.5'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:30,volSpike:'off'},
  {fast:5,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:null,volSpike:'2.0'},
  {fast:2,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:-10,volSpike:'off'},
  {fast:7,slow:10,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'off'},
  {fast:3,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:10,volSpike:'2.0'},
  {fast:10,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:10,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:10,volSpike:'2.0'},
  {fast:3,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:30,flow:30,volSpike:'off'},
  {fast:5,slow:20,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:null,volSpike:'2.0'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:20,volSpike:'2.0'},
  {fast:10,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:10,volSpike:'2.0'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:10,volSpike:'off'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:null,flow:-10,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:null,flow:30,volSpike:'off'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'off'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:10,volSpike:'2.0'},
  {fast:3,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'2r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:10,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:-10,volSpike:'off'},
  {fast:5,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:10,volSpike:'2.0'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'off'},
  {fast:10,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'1r',trend:null,flow:null,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:5,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'1.5'},
  {fast:7,slow:30,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:20,volSpike:'off'},
  {fast:2,slow:30,bias:3,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:20,volSpike:'1.5'},
  {fast:7,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:10,volSpike:'1.5'},
  {fast:5,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:-10,volSpike:'off'},
  {fast:7,slow:30,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:10,volSpike:'2.0'},
  {fast:2,slow:8,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:20,volSpike:'off'},
  {fast:5,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:10,volSpike:'off'},
  {fast:2,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:30,volSpike:'2.0'},
  {fast:5,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'1.5'},
  {fast:2,slow:30,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:10,volSpike:'2.0'},
  {fast:10,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'1.5'},
  {fast:2,slow:8,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'1.5'},
  {fast:5,slow:10,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:-10,volSpike:'off'},
  {fast:3,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:20,flow:null,volSpike:'2.0'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:2,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:10,volSpike:'off'},
  {fast:7,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:10,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:null,volSpike:'off'},
  {fast:10,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'1.5'},
  {fast:2,slow:8,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:20,volSpike:'1.5'},
  {fast:5,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:2,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:null,volSpike:'2.0'},
  {fast:10,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:null,volSpike:'off'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:5,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:30,volSpike:'1.5'},
  {fast:3,slow:14,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:20,flow:-10,volSpike:'2.0'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:10,flow:null,volSpike:'2.0'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'2r',trend:10,flow:10,volSpike:'1.5'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:-10,volSpike:'1.5'},
  {fast:3,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:30,volSpike:'1.5'},
  {fast:3,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:20,volSpike:'off'},
  {fast:3,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'2.0'},
  {fast:2,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:30,volSpike:'1.5'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:-10,volSpike:'2.0'},
  {fast:5,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:3,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:10,flow:-10,volSpike:'off'},
  {fast:5,slow:14,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:20,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:null,volSpike:'off'},
  {fast:5,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:20,volSpike:'off'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:2,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:null,flow:null,volSpike:'2.0'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:null,flow:-10,volSpike:'1.5'},
  {fast:3,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:10,volSpike:'2.0'},
  {fast:10,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:20,volSpike:'1.5'},
  {fast:5,slow:10,bias:3,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:10,volSpike:'2.0'},
  {fast:7,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:10,volSpike:'off'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'off'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'2.0'},
  {fast:5,slow:30,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:3,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:10,volSpike:'off'},
  {fast:2,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:10,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'1.5'},
  {fast:10,slow:30,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:null,flow:30,volSpike:'off'},
  {fast:2,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:null,flow:10,volSpike:'2.0'},
  {fast:10,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'2.0'},
  {fast:5,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:-10,volSpike:'off'},
  {fast:5,slow:8,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'2.0'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:30,volSpike:'off'},
  {fast:2,slow:14,bias:10,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:10,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:10,volSpike:'off'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:20,bias:3,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:10,slow:20,bias:3,exitMode:'flip',sl:'wick',tp:'1.5r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:10,volSpike:'off'},
  {fast:10,slow:8,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:10,slow:14,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'2.0'},
  {fast:3,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:20,volSpike:'off'},
  {fast:10,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:20,flow:20,volSpike:'off'},
  {fast:5,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:20,volSpike:'1.5'},
  {fast:2,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:3,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:-10,volSpike:'off'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'off'},
  {fast:3,slow:8,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:10,volSpike:'1.5'},
  {fast:5,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:10,volSpike:'1.5'},
  {fast:7,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:20,volSpike:'1.5'},
  {fast:2,slow:10,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:30,volSpike:'off'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:-10,volSpike:'off'},
  {fast:5,slow:30,bias:5,exitMode:'flip',sl:'atr',tp:'1r',trend:10,flow:30,volSpike:'2.0'},
  {fast:10,slow:30,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:20,volSpike:'2.0'},
  {fast:2,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'1r',trend:null,flow:null,volSpike:'2.0'},
  {fast:3,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:7,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:10,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'1.5'},
  {fast:3,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:30,volSpike:'off'},
  {fast:3,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:2,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'flip',trend:30,flow:null,volSpike:'off'},
  {fast:10,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:10,volSpike:'2.0'},
  {fast:10,slow:20,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:30,volSpike:'1.5'},
  {fast:3,slow:8,bias:5,exitMode:'flip',sl:'fixed',tp:'2r',trend:null,flow:null,volSpike:'2.0'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:30,volSpike:'1.5'},
  {fast:5,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'1.5'},
  {fast:3,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:20,volSpike:'2.0'},
  {fast:7,slow:30,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:-10,flow:null,volSpike:'off'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:null,volSpike:'off'},
  {fast:5,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:-10,flow:30,volSpike:'1.5'},
  {fast:2,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:null,volSpike:'off'},
  {fast:7,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:7,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:30,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'off'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:7,slow:30,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:null,volSpike:'2.0'},
  {fast:3,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:30,flow:null,volSpike:'2.0'},
  {fast:2,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'off'},
  {fast:7,slow:8,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:30,flow:-10,volSpike:'off'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:-10,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:10,flow:null,volSpike:'1.5'},
  {fast:2,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:20,volSpike:'off'},
  {fast:10,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:20,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:20,flow:20,volSpike:'1.5'},
  {fast:2,slow:8,bias:3,exitMode:'flip',sl:'wick',tp:'2r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:2,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:20,volSpike:'off'},
  {fast:3,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:10,slow:30,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:10,volSpike:'off'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:30,volSpike:'2.0'},
  {fast:10,slow:30,bias:5,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:20,volSpike:'2.0'},
  {fast:10,slow:30,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:10,volSpike:'off'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'wick',tp:'2r',trend:null,flow:null,volSpike:'off'},
  {fast:2,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:20,volSpike:'2.0'},
  {fast:5,slow:30,bias:10,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:30,volSpike:'1.5'},
  {fast:2,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:2,slow:10,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:5,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:2,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:3,slow:14,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:-10,volSpike:'off'},
  {fast:3,slow:8,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:20,volSpike:'1.5'},
  {fast:3,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:null,volSpike:'2.0'},
  {fast:10,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:7,slow:30,bias:0,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:null,volSpike:'off'},
  {fast:10,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:10,slow:10,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'1.5'},
  {fast:5,slow:8,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:30,flow:null,volSpike:'2.0'},
  {fast:3,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:20,volSpike:'2.0'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:10,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:30,flow:20,volSpike:'2.0'},
  {fast:2,slow:30,bias:3,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'2.0'},
  {fast:5,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:null,volSpike:'off'},
  {fast:7,slow:14,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:10,volSpike:'1.5'},
  {fast:5,slow:14,bias:10,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:30,flow:20,volSpike:'2.0'},
  {fast:2,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:20,flow:20,volSpike:'2.0'},
  {fast:5,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'1r',trend:20,flow:null,volSpike:'1.5'},
  {fast:7,slow:10,bias:15,exitMode:'flip',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:7,slow:30,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:10,slow:8,bias:3,exitMode:'flip',sl:'atr',tp:'flip',trend:20,flow:30,volSpike:'1.5'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'atr',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:3,slow:30,bias:15,exitMode:'flip',sl:'wick',tp:'1r',trend:30,flow:20,volSpike:'1.5'},
  {fast:7,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:10,volSpike:'off'},
  {fast:3,slow:20,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:20,volSpike:'off'},
  {fast:7,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:30,volSpike:'off'},
  {fast:3,slow:10,bias:3,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:null,volSpike:'off'},
  {fast:2,slow:8,bias:3,exitMode:'sltp',sl:'wick',tp:'flip',trend:20,flow:30,volSpike:'1.5'},
  {fast:2,slow:30,bias:5,exitMode:'flip',sl:'fixed',tp:'flip',trend:30,flow:-10,volSpike:'off'},
  {fast:5,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:10,volSpike:'1.5'},
  {fast:5,slow:8,bias:15,exitMode:'flip',sl:'atr',tp:'1r',trend:-10,flow:null,volSpike:'off'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:7,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:20,flow:-10,volSpike:'off'},
  {fast:7,slow:14,bias:0,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:null,flow:30,volSpike:'2.0'},
  {fast:3,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:10,volSpike:'2.0'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:10,volSpike:'2.0'},
  {fast:5,slow:20,bias:3,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:20,volSpike:'off'},
  {fast:5,slow:14,bias:3,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:2,slow:30,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:-10,flow:null,volSpike:'2.0'},
  {fast:3,slow:14,bias:15,exitMode:'sltp',sl:'fixed',tp:'1r',trend:20,flow:10,volSpike:'off'},
  {fast:2,slow:8,bias:15,exitMode:'flip',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:7,slow:20,bias:3,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:null,volSpike:'2.0'},
  {fast:5,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:null,volSpike:'off'},
  {fast:3,slow:10,bias:10,exitMode:'flip',sl:'atr',tp:'1r',trend:30,flow:null,volSpike:'off'},
  {fast:2,slow:10,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:20,volSpike:'off'},
  {fast:3,slow:14,bias:15,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:10,volSpike:'2.0'},
  {fast:5,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:10,slow:8,bias:15,exitMode:'sltp',sl:'wick',tp:'2r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:2,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:10,slow:20,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:30,flow:-10,volSpike:'2.0'},
  {fast:7,slow:30,bias:3,exitMode:'flip',sl:'fixed',tp:'1r',trend:20,flow:10,volSpike:'2.0'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'2r',trend:20,flow:10,volSpike:'2.0'},
  {fast:7,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'2.0'},
  {fast:2,slow:14,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:-10,flow:20,volSpike:'off'},
  {fast:2,slow:10,bias:5,exitMode:'sltp',sl:'atr',tp:'1r',trend:10,flow:20,volSpike:'2.0'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:-10,volSpike:'off'},
  {fast:10,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:30,volSpike:'1.5'},
  {fast:7,slow:10,bias:0,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:null,flow:20,volSpike:'off'},
  {fast:7,slow:30,bias:10,exitMode:'flip',sl:'fixed',tp:'flip',trend:-10,flow:-10,volSpike:'off'},
  {fast:3,slow:14,bias:10,exitMode:'flip',sl:'atr',tp:'1.5r',trend:10,flow:30,volSpike:'off'},
  {fast:7,slow:30,bias:10,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:10,volSpike:'1.5'},
  {fast:3,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:30,flow:10,volSpike:'2.0'},
  {fast:2,slow:20,bias:15,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:30,flow:-10,volSpike:'off'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'1r',trend:10,flow:10,volSpike:'1.5'},
  {fast:3,slow:10,bias:5,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:20,volSpike:'2.0'},
  {fast:10,slow:14,bias:5,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:2,slow:20,bias:15,exitMode:'sltp',sl:'wick',tp:'flip',trend:30,flow:30,volSpike:'1.5'},
  {fast:3,slow:10,bias:5,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:-10,volSpike:'2.0'},
  {fast:10,slow:10,bias:0,exitMode:'flip',sl:'atr',tp:'flip',trend:null,flow:10,volSpike:'2.0'},
  {fast:5,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:-10,flow:-10,volSpike:'off'},
  {fast:3,slow:10,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:null,flow:10,volSpike:'1.5'},
  {fast:7,slow:10,bias:0,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:20,volSpike:'1.5'},
  {fast:7,slow:10,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:null,volSpike:'off'},
  {fast:7,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'off'},
  {fast:5,slow:10,bias:0,exitMode:'flip',sl:'wick',tp:'flip',trend:30,flow:-10,volSpike:'2.0'},
  {fast:3,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:-10,volSpike:'1.5'},
  {fast:3,slow:20,bias:0,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'off'},
  {fast:3,slow:8,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:10,volSpike:'2.0'},
  {fast:5,slow:8,bias:10,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:10,volSpike:'2.0'},
  {fast:10,slow:20,bias:0,exitMode:'sltp',sl:'fixed',tp:'flip',trend:-10,flow:30,volSpike:'1.5'},
  {fast:10,slow:14,bias:0,exitMode:'sltp',sl:'wick',tp:'1r',trend:10,flow:30,volSpike:'2.0'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:10,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:5,exitMode:'flip',sl:'atr',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:10,slow:8,bias:10,exitMode:'flip',sl:'fixed',tp:'1.5r',trend:-10,flow:10,volSpike:'2.0'},
  {fast:2,slow:14,bias:3,exitMode:'sltp',sl:'fixed',tp:'2r',trend:-10,flow:30,volSpike:'off'},
  {fast:3,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:10,flow:-10,volSpike:'off'},
  {fast:2,slow:10,bias:0,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:null,flow:-10,volSpike:'2.0'},
  {fast:3,slow:10,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:20,flow:null,volSpike:'1.5'},
  {fast:3,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'flip',trend:10,flow:null,volSpike:'1.5'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'atr',tp:'1.5r',trend:-10,flow:10,volSpike:'1.5'},
  {fast:2,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:10,volSpike:'1.5'},
  {fast:2,slow:8,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:10,flow:-10,volSpike:'1.5'},
  {fast:10,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'flip',trend:-10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:20,bias:5,exitMode:'sltp',sl:'wick',tp:'1.5r',trend:20,flow:20,volSpike:'2.0'},
  {fast:3,slow:10,bias:15,exitMode:'sltp',sl:'fixed',tp:'2r',trend:20,flow:null,volSpike:'off'},
  {fast:5,slow:30,bias:0,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:10,volSpike:'2.0'},
  {fast:7,slow:30,bias:15,exitMode:'sltp',sl:'atr',tp:'2r',trend:20,flow:null,volSpike:'off'},
  {fast:2,slow:20,bias:3,exitMode:'flip',sl:'atr',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:2,slow:14,bias:15,exitMode:'flip',sl:'atr',tp:'2r',trend:-10,flow:30,volSpike:'off'},
  {fast:7,slow:14,bias:0,exitMode:'flip',sl:'fixed',tp:'2r',trend:-10,flow:20,volSpike:'1.5'},
  {fast:7,slow:20,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:null,flow:20,volSpike:'1.5'},
  {fast:2,slow:20,bias:15,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:null,volSpike:'1.5'},
  {fast:5,slow:8,bias:5,exitMode:'sltp',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'1.5'},
  {fast:5,slow:30,bias:15,exitMode:'flip',sl:'fixed',tp:'2r',trend:10,flow:30,volSpike:'1.5'},
  {fast:10,slow:14,bias:15,exitMode:'sltp',sl:'atr',tp:'1.5r',trend:30,flow:null,volSpike:'1.5'},
  {fast:7,slow:30,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:null,flow:30,volSpike:'1.5'},
  {fast:5,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:null,flow:20,volSpike:'1.5'},
  {fast:5,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:10,flow:20,volSpike:'1.5'},
  {fast:2,slow:8,bias:0,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:-10,volSpike:'off'},
  {fast:2,slow:30,bias:5,exitMode:'sltp',sl:'wick',tp:'flip',trend:-10,flow:null,volSpike:'1.5'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'fixed',tp:'2r',trend:10,flow:-10,volSpike:'2.0'},
  {fast:5,slow:10,bias:10,exitMode:'sltp',sl:'wick',tp:'1r',trend:20,flow:20,volSpike:'2.0'},
  {fast:5,slow:20,bias:10,exitMode:'sltp',sl:'atr',tp:'1r',trend:20,flow:30,volSpike:'1.5'},
  {fast:10,slow:8,bias:5,exitMode:'flip',sl:'wick',tp:'2r',trend:10,flow:30,volSpike:'1.5'},
  {fast:3,slow:20,bias:10,exitMode:'flip',sl:'atr',tp:'flip',trend:-10,flow:-10,volSpike:'1.5'},
  {fast:7,slow:14,bias:0,exitMode:'flip',sl:'wick',tp:'1.5r',trend:20,flow:30,volSpike:'2.0'},
  {fast:7,slow:20,bias:5,exitMode:'flip',sl:'fixed',tp:'1r',trend:30,flow:null,volSpike:'off'},
  {fast:3,slow:8,bias:15,exitMode:'sltp',sl:'fixed',tp:'1.5r',trend:10,flow:null,volSpike:'2.0'},
  {fast:3,slow:8,bias:0,exitMode:'flip',sl:'atr',tp:'2r',trend:30,flow:30,volSpike:'1.5'},
  {fast:3,slow:8,bias:3,exitMode:'flip',sl:'fixed',tp:'flip',trend:10,flow:30,volSpike:'off'}
];
var FVG_OPT_COMBOS=[
  {minAtr:0.25,mitMode:'close',trend:20,flow:20,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:30,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:20,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:null,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:30,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:20,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:null,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:20,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:30,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:30,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:30,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:30,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:20,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:30,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:20,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:30,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:30,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:null,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:20,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:20,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:30,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:-10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:20,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:20,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:null,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:20,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:null,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:20,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:20,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:-10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:null,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:null,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:30,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:20,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:null,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:30,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:null,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:null,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:30,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:null,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:20,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:null,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:30,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:null,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:-10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:20,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:20,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:20,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:30,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:10,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:20,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:20,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:null,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:-10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:null,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:-10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:30,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:null,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:20,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:30,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:-10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:10,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:30,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:30,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:null,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:20,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:null,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:20,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:20,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:20,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:30,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:30,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:-10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:null,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:null,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:20,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:null,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:20,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:null,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:20,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:30,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:-10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:-10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:30,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:30,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:-10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:-10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:null,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:30,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:null,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:30,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:null,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:20,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:30,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:30,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:30,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:20,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:20,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:20,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:20,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:20,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:-10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:20,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:20,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:null,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:null,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:null,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:null,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:30,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:null,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:null,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:20,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:30,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:20,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:null,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:20,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:20,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:20,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:-10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:20,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:20,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:30,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:30,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:null,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:20,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:null,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:20,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:-10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:null,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:30,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:20,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:20,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:30,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:20,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:-10,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:30,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:20,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:null,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:-10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:20,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:20,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:null,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:null,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:null,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:20,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:-10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:30,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:30,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:null,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:20,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:20,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:20,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:null,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:30,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:20,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:null,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:30,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:20,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:null,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:20,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:20,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:20,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:null,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:20,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:30,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:null,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:20,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:null,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:30,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:null,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:20,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:null,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:30,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:null,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:null,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:30,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:30,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:null,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:-10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:30,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:10,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:20,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:null,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:20,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:null,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:null,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:null,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:null,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:-10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:30,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:20,flow:10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:30,flow:30,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:10,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:20,flow:-10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:30,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:null,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:30,flow:null,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:10,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:null,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:null,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:null,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:30,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:30,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:20,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:20,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:30,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:20,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:10,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:20,react:false,reentry:false,sl:'fvg',tp:'1r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:20,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:null,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:-10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:20,flow:-10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.25,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:30,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:30,react:false,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:20,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:10,flow:30,react:false,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:30,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:-10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:null,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:null,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'close',trend:null,flow:-10,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:null,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:30,flow:-10,react:false,reentry:true,sl:'fvg',tp:'2r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:30,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:20,flow:10,react:false,reentry:false,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:-10,react:true,reentry:true,sl:'wick',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:20,flow:10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:20,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:10,react:true,reentry:false,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:-10,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:-10,flow:-10,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:30,flow:-10,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:false,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:30,flow:10,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:30,react:true,reentry:true,sl:'fvg',tp:'1r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:20,flow:20,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.08,mitMode:'close',trend:-10,flow:null,react:true,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'close',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:30,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:100,volSpike:'off',trendFilter:'off'},
  {minAtr:0.12,mitMode:'wick',trend:-10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:0,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:30,flow:10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:-10,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:10,flow:-10,react:true,reentry:true,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:null,flow:30,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:-10,flow:30,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:null,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:30,flow:null,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:30,react:false,reentry:false,sl:'atr',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:-10,flow:10,react:true,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.12,mitMode:'close',trend:null,flow:20,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:30,react:false,reentry:false,sl:'atr',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:30,react:false,reentry:false,sl:'fvg',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:30,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:null,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:20,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:30,flow:-10,react:false,reentry:false,sl:'wick',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.05,mitMode:'close',trend:20,flow:null,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:0,volSpike:'off',trendFilter:'add'},
  {minAtr:0.05,mitMode:'wick',trend:10,flow:-10,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:20,flow:30,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:null,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'close',trend:10,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:null,flow:10,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:500,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:-10,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:0,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'wick',tp:'2r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:30,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.2,mitMode:'close',trend:null,flow:null,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.25,mitMode:'wick',trend:-10,flow:10,react:false,reentry:true,sl:'wick',tp:'1r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.05,mitMode:'close',trend:-10,flow:20,react:false,reentry:true,sl:'atr',tp:'1.5r',maxAge:0,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:-10,flow:-10,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.05,mitMode:'wick',trend:-10,flow:10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:30,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.1,mitMode:'wick',trend:null,flow:10,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'close',trend:30,flow:20,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:500,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:true,reentry:true,sl:'fvg',tp:'fvg',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.25,mitMode:'close',trend:null,flow:20,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:500,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.25,mitMode:'wick',trend:20,flow:10,react:true,reentry:false,sl:'atr',tp:'1r',maxAge:0,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:null,react:false,reentry:true,sl:'wick',tp:'fvg',maxAge:200,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'1.5',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'atr',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:20,flow:20,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:10,flow:-10,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:200,volSpike:'off',trendFilter:'sub'},
  {minAtr:0.15,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:500,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.2,mitMode:'wick',trend:-10,flow:20,react:false,reentry:true,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'1.5',trendFilter:'sub'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:-10,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'off',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:20,flow:20,react:false,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:-10,react:false,reentry:false,sl:'fvg',tp:'fvg',maxAge:500,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:30,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:false,reentry:true,sl:'fvg',tp:'fvg',maxAge:300,volSpike:'off',trendFilter:'off'},
  {minAtr:0.25,mitMode:'close',trend:-10,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:100,volSpike:'2.0',trendFilter:'sub'},
  {minAtr:0.12,mitMode:'close',trend:10,flow:20,react:false,reentry:true,sl:'fvg',tp:'1r',maxAge:300,volSpike:'2.0',trendFilter:'add'},
  {minAtr:0.15,mitMode:'wick',trend:30,flow:20,react:false,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off',trendFilter:'add'},
  {minAtr:0.08,mitMode:'close',trend:30,flow:-10,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:300,volSpike:'1.5',trendFilter:'add'},
  {minAtr:0.1,mitMode:'wick',trend:10,flow:20,react:true,reentry:false,sl:'fvg',tp:'1r',maxAge:500,volSpike:'2.0',trendFilter:'off'},
  {minAtr:0.15,mitMode:'close',trend:null,flow:20,react:false,reentry:false,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'2.0',trendFilter:'sub'}
];

function _runOptimizer(){
  var bar=_g('dvlSTOptBar'),prog=_g('dvlSTOptProg'),status=_g('dvlSTOptStatus');
  var rw=_g('dvlSTRankWrap'),rl=_g('dvlSTRankList'),runBtn=_g('dvlSTRunOpt');
  if(!runBtn)return;
  var _optIndVal=(_g('stInd')||{value:'hvnSignals'}).value;
  var _isFvgOpt=_optIndVal==='fvgConf',_isTBOpt=_optIndVal==='trendBreak';
  var _optPeriod=parseInt((_g('stOptPeriod')||{value:'30'}).value)||30;
  var _optTf=(_g('stOptTf')||{value:'5m'}).value||'5m';
  var sym=(window.S&&window.S.sym)||'BTCUSDT';
  var _optCandles=[];
  runBtn.disabled=true;
  runBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg> OTIMIZANDO...';
  if(prog)prog.classList.add('show');
  if(rw)rw.style.display='none';
  for(var _k in _btCache)delete _btCache[_k];
  if(status){status.style.color='';status.textContent='Carregando histórico real...';}
  function _doOpt(candles,zones){
    var _combos=_filterOptCombos(OPT_COMBOS,'hvnSignals');
    var results=[],total=_combos.length,done=0;
    function step(){
      if(done>=total){
        _allOptResults=results;
        _reRankResults();
        runBtn.disabled=false;
        runBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> AUTO OPTIMIZE';
        if(prog)prog.classList.remove('show');
        if(status)status.textContent=results.length>0?
          'Concluído: '+results.length+' combinações com trades reais.':
          'Nenhuma combinação gerou trades. Verifique o período e parâmetros.';
        return;
      }
      var batch=Math.min(15,total-done);
      for(var _b=0;_b<batch;_b++){
        var c=_combos[done];
        var comboCfg={wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,
          sl:c.sl,tp:c.tp,risk:1.0,cons:c.cons,volSpike:c.volSpike||'off',
          mode:c.mode||'wick',diveMin:c.diveMin||2,hvnMinAtr:c.minAtrHvn||0,
          period:String(_optPeriod),tf:c.tf||_optTf,trendFilter:c.trendFilter||'off'};
        var r=_backtestReal(comboCfg,candles,zones);
        if(r&&r.trades>0)results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});
        done++;
      }
      if(bar)bar.style.width=(done/total*100)+'%';
      if(status)status.textContent='Testando combinação '+done+' de '+total+'...';
      setTimeout(step,4);
    }
    step();
  }
  function _doOptGeneric(combos,buildCfg){
    var results=[],total=combos.length,done=0;
    function step(){
      if(done>=total){
        _allOptResults=results;_reRankResults();
        runBtn.disabled=false;
        runBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> AUTO OPTIMIZE';
        if(prog)prog.classList.remove('show');
        if(status)status.textContent=results.length>0?
          'Concluído: '+results.length+' combinações com trades reais.':
          'Nenhuma combinação gerou trades. Verifique o período e parâmetros.';
        return;
      }
      var batch=Math.min(15,total-done);
      for(var _b=0;_b<batch;_b++){
        var comboCfg=buildCfg(combos[done]);
        var r=_backtestReal(comboCfg,_optCandles);
        if(r&&r.trades>0)results.push({c:combos[done],trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});
        done++;
      }
      if(bar)bar.style.width=(done/total*100)+'%';
      if(status)status.textContent='Testando combinação '+done+' de '+total+'...';
      setTimeout(step,4);
    }
    step();
  }
  function _doOptFVG(candles){
    _optCandles=candles;
    _doOptGeneric(_filterOptCombos(FVG_OPT_COMBOS,'fvgConf'),function(c){
      return{fvgMinAtr:c.minAtr||0.05,fvgMit:c.mitMode||'wick',
        fvgReact:!!c.react,fvgReentry:c.reentry!==false,fvgMaxAge:c.maxAge||0,
        sl:c.sl||'fvg',tp:c.tp||'fvg',risk:1.0,period:String(_optPeriod),signalType:'fvgConf'};
    });
  }
  function _doOptTB(candles){
    _optCandles=candles;
    _doOptGeneric(_filterOptCombos(TB_OPT_COMBOS,'trendBreak'),function(c){
      return{tbFast:c.fast||3,tbSlow:c.slow||10,tbBias:c.bias||0,
        tbExit:c.exitMode||'flip',sl:c.sl||'wick',tp:c.tp||'2r',
        risk:1.0,period:String(_optPeriod),signalType:'trendBreak'};
    });
  }
  function _optFail(msg){
    if(status){status.style.color='#ff4d6a';status.textContent=msg;}
    runBtn.disabled=false;
    runBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> AUTO OPTIMIZE';
    if(prog)prog.classList.remove('show');
  }
  _dvlFetchBTCandles(sym,_optTf,_optPeriod,'','').then(function(candles){
    if(!candles||candles.length<50)return _optFail('Histórico insuficiente ('+((candles&&candles.length)||0)+' candles). Aumente o período.');
    if(_isTBOpt){if(status)status.textContent='Histórico: '+candles.length+' candles. Testando TrendBreak...';_doOptTB(candles);return;}
    if(_isFvgOpt){if(status)status.textContent='Histórico: '+candles.length+' candles. Testando FVG...';_doOptFVG(candles);return;}
    var zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):
      (window.__hvnZones?window.__hvnZones():[]);
    if(!zones||!zones.length)return _optFail('Sem zonas HVN calculadas. Ative o Vol Zones e recarregue.');
    /* save zones so backtest can reuse same data set */
    if(window.DVLBacktestData)window.DVLBacktestData.zones=zones;
    if(status)status.textContent='Histórico: '+candles.length+' candles. Gerando sinais...';
    _doOpt(candles,zones);
  }).catch(function(e){
    if(e&&e.unsupportedTF)return _optFail('TF "'+e.tf+'" não suportado: use 1m, 5m, 15m, 30m, 1h, 4h, 1d ou 1w.');
    var candles=(window.S&&window.S.candles)||[];
    if(!candles.length)return _optFail('Sem histórico disponível. Verifique a conexão.');
    if(_isTBOpt){if(status)status.textContent='Candles do gráfico ('+candles.length+'). TrendBreak...';_doOptTB(candles);return;}
    if(_isFvgOpt){if(status)status.textContent='Candles do gráfico ('+candles.length+'). FVG...';_doOptFVG(candles);return;}
    var zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):
      (window.__hvnZones?window.__hvnZones():[]);
    if(!candles.length||!zones.length)return _optFail('Sem histórico disponível. Verifique a conexão.');
    if(status)status.textContent='Candles do gráfico ('+candles.length+'). Gerando sinais...';
    _doOpt(candles,zones);
  });
}

var _allOptResults=[];
var _optSortBy=['pf_wr'];

function _paintPills(){
  document.querySelectorAll('#dvlOptPills .dvl-opt-pill').forEach(function(p){
    var sel=_optSortBy.indexOf(p.getAttribute('data-key'))>=0;
    p.classList.toggle('sel',sel);
    p.style.cssText=sel
      ?'background:#009aad;border:2px solid #00daf0;color:#fff;font-weight:900;letter-spacing:.06em'
      :'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.38);font-weight:700;letter-spacing:.06em';
  });
}

function _optMetricVal(r,key){
  if(key==='wr')return parseFloat(r.wr);
  if(key==='pf')return parseFloat(r.pf);
  if(key==='ret')return parseFloat(r.ret);
  if(key==='trades')return r.trades;
  if(key==='tr_wr')return r.trades*(parseFloat(r.wr)/100);
  return parseFloat(r.pf)*parseFloat(r.wr)/100;
}

function _reRankResults(){
  if(!_allOptResults.length)return;
  var keys=_optSortBy;
  var all=_allOptResults.filter(function(r){return r.trades>=5;});
  if(!all.length)all=_allOptResults;
  var scored=all.map(function(r){
    var s=0;
    keys.forEach(function(k){
      var vals=all.map(function(x){return _optMetricVal(x,k);});
      var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
      s+=(_optMetricVal(r,k)-mn)/((mx-mn)||1);
    });
    return{r:r,s:s};
  });
  scored.sort(function(a,b){return b.s-a.s;});
  _bestCfgs=scored.slice(0,10).map(function(x){return x.r;});
  _renderRanking(_bestCfgs);
}

function _toggleOptFilter(){
  var p=document.getElementById('dvlOptFilterPanel');
  var b=document.getElementById('dvlOptFilterBtn');
  if(!p)return;
  var open=p.classList.contains('open');
  p.classList.toggle('open');
  if(b)b.textContent=open?'FILTRO ▾':'FILTRO ▴';
  if(!open)_paintPills();
}
window._toggleOptFilter=_toggleOptFilter;
window._optPillClick=_optPillClick;

function _optPillClick(el){
  var key=el.getAttribute('data-key');
  var idx=_optSortBy.indexOf(key);
  if(idx>=0){
    if(_optSortBy.length>1)_optSortBy.splice(idx,1);
  }else{
    if(_optSortBy.length>=2)_optSortBy.shift();
    _optSortBy.push(key);
  }
  _paintPills();
  _reRankResults();
}

var RANK_CLS=['r1','r2','r3','rn','rn','rn','rn','rn','rn','rn'];
function _renderRanking(top){
  var rw=_g('dvlSTRankWrap'),rl=_g('dvlSTRankList');if(!rl||!rw)return;
  rl.innerHTML=top.map(function(r,i){
    var wrc=parseFloat(r.wr)>=60?'pos':(parseFloat(r.wr)>=50?'':'neg');
    var pfc=parseFloat(r.pf)>=1.5?'pos':'';
    var rc=parseFloat(r.ret)>=0?'pos':'neg';
    return '<div class="dvl-st-rank'+(i===0?' gold':'')+'">'+
      '<div class="dvl-st-rank-hdr">'+
      '<div class="dvl-st-rnum '+RANK_CLS[i]+'">'+(i+1)+'</div>'+
      '<div class="dvl-st-rcfg">'+_cfgLabel(r.c)+(r.trades<20?'<span style="font-size:6px;color:#ffb400;background:rgba(255,180,0,.1);border:1px solid rgba(255,180,0,.28);border-radius:3px;padding:1px 4px;margin-left:4px">LOW SAMPLE</span>':'')+'</div></div>'+
      '<div class="dvl-st-rstats">'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv neu">'+r.trades+'</div><div class="dvl-st-rsl">Trades</div></div>'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv '+wrc+'">'+r.wr+'%</div><div class="dvl-st-rsl">Win Rate</div></div>'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv '+pfc+'">'+r.pf+'</div><div class="dvl-st-rsl">PF</div></div>'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv '+rc+'">'+r.ret+'%</div><div class="dvl-st-rsl">Retorno</div></div>'+
      '</div>'+
      '<button class="dvl-st-applyrank" data-ri="'+i+'">&#8627; APLICAR ESTA CONFIGURAÇÃO</button>'+
      '</div>';
  }).join('');
  rw.style.display='block';
  /* wire per-card apply buttons — keeps _applyRankResult in IIFE scope */
  rl.querySelectorAll('.dvl-st-applyrank').forEach(function(btn){
    btn.addEventListener('click',function(){
      _applyRankResult(parseInt(btn.getAttribute('data-ri')));
    });
  });
}

var optBtn=_g('dvlSTRunOpt');
if(optBtn)optBtn.addEventListener('click',_runOptimizer);

/* apply any ranked result by index */
function _applyRankResult(i){
  if(!_bestCfgs[i])return;
  var combo=_bestCfgs[i].c||_bestCfgs[i].cfg||_bestCfgs[i];
  /* copy optimizer period + pair to backtest form so they match exactly */
  var _optP=_g('stOptPeriod'),_optPair=_g('stOptPair');
  var _btP=_g('stPeriod'),_btPair=_g('stPair');
  if(_optP&&_btP)_btP.value=_optP.value;
  if(_optPair&&_btPair)_btPair.value=_optPair.value;
  _syncAllFromCfg(combo,true);  /* only load into backtest form, not indicator */
  /* switch to backtest tab */
  document.querySelectorAll('.dvl-st-tab').forEach(function(x){x.classList.remove('active');});
  document.querySelectorAll('.dvl-st-tc').forEach(function(x){x.classList.remove('active');});
  var bt=document.querySelector('.dvl-st-tab[data-sttab="backtest"]');
  if(bt)bt.classList.add('active');
  var btc=_g('dvlSTTabBacktest');if(btc)btc.classList.add('active');
  /* auto-run the backtest so results appear immediately */
  setTimeout(function(){
    var runBtn=_g('dvlSTRunBT');
    if(runBtn&&!runBtn.disabled)runBtn.click();
  },120);
  /* visual feedback on the clicked button */
  var btns=document.querySelectorAll('.dvl-st-applyrank');
  var btn=btns[i];
  if(btn){
    btn.classList.add('applied');
    btn.textContent='✓ APLICADO';
    setTimeout(function(){
      if(btn){btn.classList.remove('applied');btn.innerHTML='&#8627; APLICAR ESTA CONFIGURAÇÃO';}
    },2800);
  }
}

/* live stats: price + Trend Clarity + DVL Flow */
function _syncLiveStats(){
  try{
    var prEl=_g('dvlSTLivePrice');
    if(prEl){
      var p=window.S&&window.S.candles&&window.S.candles.length?window.S.candles[window.S.candles.length-1].c:null;
      if(p)prEl.textContent=p>999?p.toFixed(0):p.toFixed(2);
    }
    var clarEl=_g('dvlSTMktTrend');
    if(clarEl){
      var cv=window.__dvlClarNow;
      if(cv!=null&&!isNaN(cv)){
        clarEl.textContent=(cv>=0?'+':'')+Math.round(cv);
        clarEl.className='dvl-st-dv'+(cv>=25?' pos':cv<=-25?' neg':'');
      }
    }
    var flowEl=_g('dvlSTMktFlow');
    if(flowEl){
      var fv=window.__dvlFlowNow;
      if(fv!=null&&!isNaN(fv)){
        flowEl.textContent=(fv>=0?'+':'')+Math.round(fv);
        flowEl.className='dvl-st-dv'+(fv>=20?' pos':fv<=-20?' neg':'');
      }
    }
    /* last real signal + today count */
    var _sigs=window.S&&window.S.hvnSignals?
      window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}):[];
    var _dEl=_g('dvlSTLastDir'),_tEl=_g('dvlSTLastType'),_sEl=_g('dvlSTLastStatus');
    var _tfEl=_g('dvlSTLastTF'),_znEl=_g('dvlSTLastZone');
    var _sgEl=_g('dvlSTTodaySig'),_wrEl=_g('dvlSTTodayWR'),_pfEl=_g('dvlSTTodayPF');
    if(_sigs.length===0){
      var _lsHdrR=_g('dvlSTLastHeader');if(_lsHdrR)_lsHdrR.textContent='ÚLTIMO SINAL';
      if(_dEl){_dEl.textContent='—';_dEl.className='dvl-st-lsig-dir';}
      if(_tEl)_tEl.textContent='Nenhum sinal real detectado ainda.';
      if(_sEl)_sEl.textContent='';
      if(_tfEl)_tfEl.textContent='—';
      if(_znEl)_znEl.textContent='—';
      if(_sgEl)_sgEl.textContent='0';
      if(_wrEl)_wrEl.textContent='—';
      if(_pfEl)_pfEl.textContent='—';
    }else{
      var _ls=_sigs[_sigs.length-1];
      /* compute today window first — needed to label signal as hoje/histórico */
      var _rt2=window.S&&window.S.candles&&window.S.candles.length?
        window.S.candles[window.S.candles.length-1].t:0;
      var _tSc2=_rt2>9999999999?1:1000;
      var _24h=_rt2-86400*(_tSc2===1?1000:1);
      var _isToday=_ls.timestamp>=_24h;
      var _tSigs=_sigs.filter(function(s){return s.timestamp>=_24h;});
      /* update header: HOJE se há sinal hoje, HISTÓRICO se não */
      var _lsHdr=_g('dvlSTLastHeader');
      if(_lsHdr)_lsHdr.textContent=_tSigs.length>0?'ÚLTIMO SINAL HOJE':(_isToday?'ÚLTIMO SINAL HOJE':'ÚLTIMO SINAL HISTÓRICO');
      if(_dEl){_dEl.textContent=_ls.side;
        _dEl.className='dvl-st-lsig-dir '+(_ls.side==='LONG'?'long':'short');}
      if(_tEl)_tEl.textContent=(_ls.rejectionType||'HVN Signal')+' · HVN Signals';
      if(_sEl)_sEl.textContent=_isToday?'':'(histórico)';
      if(_tfEl)_tfEl.textContent=(window.S&&window.S.tf)||'?';
      if(_znEl){
        var _z=_ls.hvnZone,_zp=_z?(_z.price||(_z.lo+_z.hi)/2):_ls.entryPrice;
        _znEl.textContent=_zp>999?_zp.toFixed(0):_zp.toFixed(2);
      }
      if(_sgEl)_sgEl.textContent=String(_tSigs.length);
      if(_wrEl)_wrEl.textContent='—';
      if(_pfEl)_pfEl.textContent='—';
    }
  }catch(_){}
}
function _syncLivePrice(){_syncLiveStats();}

/* ── apply config to HVN Signals indicator ───────────────────── */
/* canonical sync: cfg object → both HVN Signals fields AND Strategy Tester form */
function _syncAllFromCfg(cfg,skipIndicator){
  if(!cfg)return;
  if(cfg.signalType==='fvgConf'||cfg.minAtr!==undefined){
    var _sv=function(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(el)el.value=String(val);};
    var _ssl=function(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(!el)return;for(var i=0;i<el.options.length;i++){if(el.options[i].value===String(val)){el.selectedIndex=i;break;}}};
    _ssl('stInd','fvgConf');
    if(typeof _stSwitchInd==='function')_stSwitchInd('fvgConf');
    if(cfg.minAtr!==undefined)_ssl('stFvgMinAtr',parseFloat(cfg.minAtr).toFixed(2));
    _ssl('stFvgMit',cfg.mitMode||'wick');
    _ssl('stFvgReact',cfg.react?'1':'0');
    _ssl('stFvgReentry',cfg.reentry?'1':'0');
    _ssl('stFvgMaxAge',cfg.maxAge!==undefined?String(cfg.maxAge):'300');
    var _t=cfg.trend!==undefined&&cfg.trend!==null?String(cfg.trend):'off';
    var _f=cfg.flow!==undefined&&cfg.flow!==null?String(cfg.flow):'off';
    _ssl('stFTrend',_t);_ssl('stFFlow',_f);
    _ssl('stFVol',cfg.volSpike||'off');
    _ssl('stSL',cfg.sl||'wick');_ssl('stTP',cfg.tp||'fvg');
    if(cfg.flow!==null&&cfg.flow!==undefined)_sv('fvgConfFlowMin',Math.abs(parseFloat(cfg.flow))||20);
    if(cfg.trend!==null&&cfg.trend!==undefined)_sv('fvgConfClarMin',Math.abs(parseFloat(cfg.trend))||25);
    _ssl('fvgMitMode',cfg.mitMode||'wick');
    _ssl('fvgConfMitMode',cfg.mitMode||'wick');
    for(var k in _btCache)delete _btCache[k];
    if(typeof drawSoon==='function')drawSoon();
    return;
  }
  var ws=parseFloat(cfg.wickSens||cfg.w||45);
  /* convert numeric threshold (10/-20/null) to nearest bothN option */
  function _toThreshOpt(v){
    if(v===null||v===undefined||v==='off'||v==='null'||v==='0'||v===0)return 'off';
    var n=Math.abs(parseFloat(v));if(isNaN(n)||n===0)return 'off';
    if(n<=5)return 'both5';if(n<=10)return 'both10';
    if(n<=20)return 'both20';return 'both30';
  }
  var trend=cfg.trend!==undefined?_toThreshOpt(cfg.trend):null;
  var flow=cfg.flow!==undefined?_toThreshOpt(cfg.flow):null;
  var nextHVN=cfg.nextHVN||cfg.hvn;
  var sl=cfg.sl;
  var tp=cfg.tp;
  var maxCandles=cfg.maxCandles||cfg.cons;
  var risk=cfg.risk;
  var tf=cfg.tf||cfg.timeframe||null;

  function _setVal(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(el)el.value=val;}
  function _setSelVal(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(!el)return;var found=false;for(var i=0;i<el.options.length;i++){if(el.options[i].value===String(val)){el.selectedIndex=i;found=true;break;}}if(!found&&el.options.length)el.selectedIndex=0;}

  /* ── HVN Signals indicator fields ── */
  if(!skipIndicator){
    _setVal('hvnSigMinWick', Math.min(80,Math.max(5,Math.round(ws))));
    _setVal('hvnSigSens',    Math.max(0,Math.min(50,Math.round(ws*0.4))));
    if(maxCandles)_setVal('hvnSigLateral', maxCandles);
    if(trend!==null)_setSelVal('hvnSigClarity', trend);
    if(flow!==null) _setSelVal('hvnSigFlow',    flow);
    if(nextHVN)     _setVal('hvnSigNextHVN',    nextHVN);
    if(sl)          _setSelVal('hvnSigSL',       sl);
    if(tp)          _setSelVal('hvnSigTP',       tp);
  }

  /* ── Strategy Tester Backtest form fields ── */
  _setVal('stWickSens',  ws);
  _setSelVal('stFTrend', trend||'off');
  _setSelVal('stFFlow',  flow||'off');
  if(nextHVN)     _setVal('stNextHVN',   nextHVN);
  if(sl)          _setSelVal('stSL',     sl);
  if(tp)          _setSelVal('stTP',     tp);
  if(maxCandles)  _setVal('stMaxCandles',maxCandles);
  if(risk)        _setVal('stRisk',      risk);
  /* tf = zone TF for HVN Signals; does NOT change the chart's own timeframe */
  if(tf){if(!skipIndicator)_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);}
  var volSpike=cfg.volSpike||'off';
  if(!skipIndicator)_setSelVal('hvnSigVolSpike',volSpike);
  _setSelVal('stFVol',volSpike);
  var _mode=cfg.mode||'wick';
  if(!skipIndicator)_setSelVal('hvnSigMode',_mode);
  _setSelVal('stMode',_mode);
  var _diveMin=cfg.diveMin||cfg.divemin||2;
  if(!skipIndicator)_setVal('hvnSigDiveMin',_diveMin);
  _setVal('stDiveMin',_diveMin);
  var _minAtr=cfg.minAtrHvn||0;
  if(!skipIndicator)_setSelVal('hvnSigMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');
  _setSelVal('stHvnMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');
  /* trendFilter → stTBFilterMode (add/sub/off) */
  if(cfg.trendFilter!==undefined&&cfg.trendFilter!==null)
    _setSelVal('stTBFilterMode',cfg.trendFilter);

  /* sync checkboxes */
  (function(){
    var _ckW=document.getElementById('stRuleWick');
    var _ckC=document.getElementById('stRuleClose');
    var _ckCons=document.getElementById('stRuleCons');
    /* all HVN combos use wick rejection */
    if(_ckW)_ckW.checked=true;
    /* close field: outside/mid/strong → fechamento fora da zona */
    if(_ckC)_ckC.checked=!!(cfg.close&&cfg.close!=='off');
    /* consolidação: cons > 3 candles = permite lateralização */
    if(_ckCons)_ckCons.checked=(parseInt(cfg.cons)||0)>3;
  })();

  /* update S.settings */
  if(!skipIndicator){
    try{
      if(window.S&&window.S.settings){
        window.S.settings.hvnSigMinWick=Math.min(80,Math.max(5,Math.round(ws)));
        window.S.settings.hvnSigSens=Math.max(0,Math.min(50,Math.round(ws*0.4)));
      }
    }catch(_){}
  }

  /* clear cache so next backtest run picks up new values */
  for(var k in _btCache)delete _btCache[k];

  if(!skipIndicator&&typeof drawSoon==='function')drawSoon();
}

function _applyToHVNSignals(cfg){
  _syncAllFromCfg(cfg);
}

/* ── Trend Break compute + draw ─────────────────────────── */
window.__computeTrendBreak=(function(){
  return function(){
    try{
      var S=window.S;if(!S||!S.candles||S.candles.length<20)return;
      var fast=parseInt((document.getElementById('tbFast')||{value:'3'}).value)||3;
      var slow=parseInt((document.getElementById('tbSlow')||{value:'10'}).value)||10;
      var biasMin=parseFloat((document.getElementById('tbBias')||{value:'5'}).value)||5;
      var showBuy=(document.getElementById('tbShowBuy')||{checked:true}).checked;
      var showSell=(document.getElementById('tbShowSell')||{checked:true}).checked;
      var cs=S.candles,n=cs.length;
      var combined=[];
      for(var i=0;i<n;i++){
        var c=cs[i];
        var s20sum=0;
        for(var j=Math.max(0,i-19);j<=i;j++)s20sum+=cs[j].c;
        var s20=s20sum/Math.min(i+1,20);
        var atr=c.h-c.l||c.c*0.002;
        if(i>0){var p=cs[i-1];atr=Math.max(c.h-c.l,Math.abs(c.h-p.c),Math.abs(c.l-p.c));}
        var clr=(c.c-s20)/(atr||c.c*0.002)*15;
        var hl=c.h-c.l||c.c*0.002;
        var fl=(c.c-c.o)/hl*100;
        combined.push(clr*0.6+fl*0.4);
      }
      S.trendBreakSignals=[];
      for(var i=slow;i<n;i++){
        var fSum=0,sSum=0,fPSum=0,sPSum=0;
        for(var j=i-fast;j<i;j++)fSum+=combined[j];
        for(var j=i-slow;j<i;j++)sSum+=combined[j];
        for(var j=i-fast-1;j<i-1;j++)fPSum+=combined[j];
        for(var j=i-slow-1;j<i-1;j++)sPSum+=combined[j];
        var fMa=fSum/fast,sMa=sSum/slow,fMaP=fPSum/fast,sMaP=sPSum/slow;
        var crossUp=fMaP<=sMaP&&fMa>sMa,crossDn=fMaP>=sMaP&&fMa<sMa;
        if((crossUp||crossDn)&&Math.abs(fMa-sMa)>=biasMin){
          if(crossUp&&showBuy)S.trendBreakSignals.push({i:i,side:'LONG',c:cs[i]});
          if(crossDn&&showSell)S.trendBreakSignals.push({i:i,side:'SHORT',c:cs[i]});
        }
      }
    }catch(e){}
  };
})();

window.__drawTrendBreakOverlay=function(ctx,W,H,V,sc,x,bw){
  try{
    var sigs=(window.S&&window.S.trendBreakSignals)||[];
    sigs.forEach(function(sig){
      if(sig.i<V.start||sig.i>V.end)return;
      var cx=x(sig.i),cy=sc.y(sig.c.c);
      var isLong=sig.side==='LONG';
      var aw=Math.max(6,bw*1.4),ah=aw*0.8;
      ctx.save();
      ctx.fillStyle=isLong?'rgba(0,212,255,.92)':'rgba(255,77,106,.92)';
      ctx.strokeStyle=isLong?'#00d4ff':'#ff4d6a';
      ctx.lineWidth=1;
      var ay=isLong?cy+bw*1.6:cy-bw*1.6;
      ctx.beginPath();
      if(isLong){
        ctx.moveTo(cx,ay-ah);ctx.lineTo(cx-aw/2,ay);ctx.lineTo(cx+aw/2,ay);
      }else{
        ctx.moveTo(cx,ay+ah);ctx.lineTo(cx-aw/2,ay);ctx.lineTo(cx+aw/2,ay);
      }
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle=isLong?'rgba(0,212,255,.7)':'rgba(255,77,106,.7)';
      ctx.font='bold 7px monospace';ctx.textAlign='center';
      ctx.fillText('TB',cx,isLong?ay-ah-3:ay+ah+8);
      ctx.restore();
    });
  }catch(e){}
};

/* ── Apply to HVN Signals button (backtest results) ─────────── */
var _lastBtCfg=null;
var applySigBtn=_g('dvlSTApplySig');
if(applySigBtn){
  applySigBtn.addEventListener('click',function(){
    if(!_lastBtCfg)return;
    _applyToHVNSignals(_lastBtCfg);
    applySigBtn.innerHTML=_stApplySigLabel(true);
    applySigBtn.style.cssText='color:#00e676;border-color:rgba(0,220,100,.35)';
    setTimeout(function(){
      applySigBtn.innerHTML=_stApplySigLabel(false);
      applySigBtn.style.cssText='';
    },2800);
  });
}

/* ── Strategy Tester ↺ reset button ─────────────────────────── */
var stResetBtn=_g('dvlSTResetAll');
if(stResetBtn){
  stResetBtn.addEventListener('click',function(){
    /* reset all form inputs to HTML defaultValue/defaultChecked */
    var form=_g('dvlSTTabBacktest');
    if(form){
      form.querySelectorAll('input').forEach(function(el){
        if(el.type==='checkbox')el.checked=el.defaultChecked;
        else el.value=el.defaultValue;
      });
      form.querySelectorAll('select').forEach(function(el){
        var defIdx=Array.from(el.options).findIndex(function(o){return o.defaultSelected;});
        el.selectedIndex=defIdx>=0?defIdx:0;
      });
    }
    /* clear results and cache */
    var res=_g('dvlSTResults');if(res)res.style.display='none';
    for(var k in _btCache)delete _btCache[k];
    _lastBtCfg=null;
    /* visual feedback */
    stResetBtn.style.color='#00d4ff';
    setTimeout(function(){stResetBtn.style.color='';},600);
  });
}

/* ── store last bt config when run ──────────────────────────── */
/* patched onto the run button result chain */
var _origRenderResults=_renderResults;
_renderResults=function(r){
  _lastBtCfg=r.cfg;
  _origRenderResults(r);
  var _asb=document.getElementById('dvlSTApplySig');
  if(_asb)_asb.innerHTML=_stApplySigLabel(false);
};

/* _applyRankResult() handles per-card apply — no global apply-best button */

window._dvlST={open:open,close:close,version:V,syncCfg:_syncAllFromCfg,updateSigStatus:_updateSigStatus};
console.log('[DVL] Strategy Tester '+V+' loaded');
})();