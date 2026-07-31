(function(){
"use strict";
if(window.DVL_PAPER_EXECUTION_ENGINE)return;

window.DVL_LAST_PRICE_BY_SYMBOL=window.DVL_LAST_PRICE_BY_SYMBOL||{};

window.DVL_DEMO_FEE_CONFIG=window.DVL_DEMO_FEE_CONFIG||{makerFeeRate:0.0002,takerFeeRate:0.0005};

window.DVL_DEMO_WALLET=window.DVL_DEMO_WALLET||{version:'0.764',balance:10000,availableBalance:10000,usedMargin:0,equity:10000,unrealizedPnl:0,realizedPnl:0,totalFees:0};

(function(){try{var raw=localStorage.getItem('DVL_DEMO_WALLET_0764');if(raw){var d=JSON.parse(raw);if(d&&typeof d.balance==='number'){var w=window.DVL_DEMO_WALLET;w.balance=d.balance;w.availableBalance=d.availableBalance;w.usedMargin=d.usedMargin||0;w.realizedPnl=d.realizedPnl||0;w.totalFees=d.totalFees||0;}}}catch(_){}})();

function saveDemoWallet(){try{var w=window.DVL_DEMO_WALLET;localStorage.setItem('DVL_DEMO_WALLET_0764',JSON.stringify({balance:w.balance,availableBalance:w.availableBalance,usedMargin:w.usedMargin,realizedPnl:w.realizedPnl,totalFees:w.totalFees}));}catch(_){}}
window.saveDemoWallet=saveDemoWallet;

window.DVL_PAPER_EXECUTION_ENGINE={version:'0.764',lastPriceBySymbol:window.DVL_LAST_PRICE_BY_SYMBOL,watchedSymbols:[],running:false,ws:null};
window.DVL_PAPER_REALTIME_ENGINE=window.DVL_PAPER_EXECUTION_ENGINE;

var _PFX='dvl_paper_v2_pro_0695_';

function normalizeSymbol(sym){if(!sym)return'';return String(sym).replace('/','').replace('-','').toUpperCase();}
function rawCurSym(){try{if(typeof window.symbol!=='undefined'&&window.symbol)return normalizeSymbol(window.symbol);}catch(_){}return'';}
function readSymbolOrders(sym){try{var a=JSON.parse(localStorage.getItem(_PFX+sym)||'[]');return Array.isArray(a)?a.filter(function(o){return o&&o.id&&o.status!=='draft';}):[]; }catch(_){return[];}}
function writeSymbolOrders(sym,orders){try{localStorage.setItem(_PFX+sym,JSON.stringify(orders));}catch(_){}}

function getAllPaperOrdersSafe(){
  try{var V2=window.DVL_PAPER_TRADING_V2_PRO;if(V2&&typeof V2.getAllOrders==='function')return V2.getAllOrders();}catch(_){}
  var _all=[],_rk=_PFX+'symbols',_seen={};
  try{for(var _k=0;_k<localStorage.length;_k++){var _lk=localStorage.key(_k);if(!_lk||_lk.indexOf(_PFX)!==0||_lk===_rk)continue;try{var _la=JSON.parse(localStorage.getItem(_lk)||'[]');if(Array.isArray(_la))_la.forEach(function(o){if(o&&o.id&&!_seen[o.id]){_seen[o.id]=true;_all.push(o);}});}catch(_){}}}catch(_){}
  return _all;
}

function getPaperSymbolsToWatch(){
  var _s={};
  try{var store=window.DVL_PAPER_TRADE_STORE;if(store){(store.pendingOrders||[]).forEach(function(o){if(o.symbol)_s[normalizeSymbol(o.symbol)]=1;});(store.openPositions||[]).forEach(function(o){if(o.symbol)_s[normalizeSymbol(o.symbol)]=1;});}}catch(_){}
  try{getAllPaperOrdersSafe().forEach(function(o){if(o.symbol&&(o.status==='pending'||o.status==='open'))_s[normalizeSymbol(o.symbol)]=1;});}catch(_){}
  try{var _cs=rawCurSym();if(_cs)_s[_cs]=1;}catch(_){}
  return Object.keys(_s);
}

function calcPaperPnl(order,lastPrice){
  var side=String(order.side||'').toLowerCase();
  var entry=Number(order.entry);
  var qty=Number(order.qty||order.size||1);
  if(!Number.isFinite(entry)||!Number.isFinite(lastPrice))return{pnl:null,pnlPct:null};
  var diff=(side==='buy'||side==='long')?(lastPrice-entry):(entry-lastPrice);
  return{pnl:diff*qty,pnlPct:entry?(diff/entry)*100:0};
}

function getFeeRate(order){
  var cfg=window.DVL_DEMO_FEE_CONFIG||{makerFeeRate:0.0002,takerFeeRate:0.0005};
  var type=String(order.orderType||order.type||'market').toLowerCase();
  if(type.indexOf('limit')>=0)return cfg.makerFeeRate;
  return cfg.takerFeeRate;
}

function calcFee(qty,price,feeRate){
  var n=Number(qty||0)*Number(price||0);
  return(Number.isFinite(n)&&n>0)?n*feeRate:0;
}

function applyEntryFee(order){
  if(!order||order._feesApplied)return;
  order._feesApplied=true;
  var feeRate=getFeeRate(order);
  var qty=Number(order.qty||order.size||0);
  var price=Number(order.entryExecuted||order.entry||0);
  if(!qty||!price)return;
  var fee=calcFee(qty,price,feeRate);
  var notional=qty*price;
  var leverage=Number(order.leverage)||1;
  var margin=notional/leverage;
  order.entryFee=fee;order.requiredMargin=margin;
  var w=window.DVL_DEMO_WALLET;
  w.balance=Math.max(0,w.balance-fee);
  w.usedMargin+=margin;
  w.totalFees+=fee;
  w.availableBalance=Math.max(0,w.balance-w.usedMargin);
  saveDemoWallet();
}

function positionsPanelVisible1204(){
  var p=document.getElementById('dvlPositionsPanelV2');
  if(!p)return false;
  return p.classList.contains('is-open')||p.classList.contains('open')||p.getAttribute('aria-hidden')==='false';
}
function renderPositionsPanelRealtime(){
  if(!positionsPanelVisible1204())return;
  try{if(typeof window.DVL_POSITIONS_REFRESH==='function')window.DVL_POSITIONS_REFRESH();}catch(_){}
}

function addTradeToHistoryDeduped(trade){
  var store=window.DVL_PAPER_TRADE_STORE;if(!store||!trade)return;
  store.tradeHistory=(store.tradeHistory||[]).filter(function(t){return t.id!==trade.id;});
  store.tradeHistory.push(trade);
  while(store.tradeHistory.length>store.maxHistory)store.tradeHistory.shift();
  try{if(typeof window.savePaperTradeStore==='function')window.savePaperTradeStore();}catch(_){}
}
window.addTradeToHistory=addTradeToHistoryDeduped;

var _closing={};
var _walletHandled={};
function closePaperTradeToHistory(order,exitPrice,reason,now){
  if(!order||_closing[order.id])return;
  _closing[order.id]=true;
  now=now||Date.now();
  exitPrice=Number(exitPrice);
  var sym=normalizeSymbol(order.symbol);
  var pnlData=calcPaperPnl(order,exitPrice);
  var grossPnl=Number.isFinite(pnlData.pnl)?pnlData.pnl:0;
  var entryFee=Number(order.entryFee||0);
  var feeRate=getFeeRate(order);
  var qty=Number(order.qty||order.size||0);
  var exitFee=calcFee(qty,exitPrice,feeRate);
  var netPnl=grossPnl-entryFee-exitFee;
  var entryPrice=Number(order.entry)||1;
  var netPnlPct=qty>0?netPnl/(entryPrice*qty)*100:0;
  var closed={};
  for(var _ck in order)if(Object.prototype.hasOwnProperty.call(order,_ck))closed[_ck]=order[_ck];
  closed.status='closed';closed.exitPrice=exitPrice;closed.closedPrice=exitPrice;
  closed.closedAt=now;closed.closeReason=reason;
  closed.grossPnl=grossPnl;closed.entryFee=entryFee;closed.exitFee=exitFee;
  closed.totalFee=entryFee+exitFee;
  closed.netPnl=netPnl;closed.netPnlPct=netPnlPct;
  closed.realizedPnl=netPnl;closed.realizedPnlPct=netPnlPct;
  var w=window.DVL_DEMO_WALLET;
  var margin=Number(order.requiredMargin||0);
  w.balance+=netPnl;
  w.usedMargin=Math.max(0,w.usedMargin-margin);
  w.totalFees+=exitFee;
  w.realizedPnl+=netPnl;
  w.availableBalance=Math.max(0,w.balance-w.usedMargin);
  saveDemoWallet();
  _walletHandled[order.id]=true;
  addTradeToHistoryDeduped(closed);
  /* Remove this order id from EVERY per-symbol slot. O pedido pode ter sido
     gravado sob uma chave crua/legada (V2 salva por rawSym()) e não pela chave
     normalizada — se removêssemos só de um slot, ele voltava a aparecer aberto
     no próximo sweep. Varre todos os slots pra fechar de vez. */
  try{
    for(var _pk=0;_pk<localStorage.length;_pk++){
      var _lk=localStorage.key(_pk);
      if(!_lk||_lk.indexOf(_PFX)!==0||_lk===_PFX+'symbols')continue;
      try{
        var _arr=JSON.parse(localStorage.getItem(_lk)||'[]');
        if(!Array.isArray(_arr))continue;
        var _f=_arr.filter(function(o){return o&&o.id!==order.id;});
        if(_f.length!==_arr.length)localStorage.setItem(_lk,JSON.stringify(_f));
      }catch(_){}
    }
  }catch(_){}
  try{var V2=window.DVL_PAPER_TRADING_V2_PRO;var _st=V2&&V2.getState();if(_st&&Array.isArray(_st.orders))_st.orders=_st.orders.filter(function(o){return o&&o.id!==order.id;});}catch(_){}
  try{if(typeof window.syncPaperStoreFromOrders==='function')window.syncPaperStoreFromOrders();}catch(_){}
  try{if(typeof window.savePaperTradeStore==='function')window.savePaperTradeStore();}catch(_){}
  renderPositionsPanelRealtime();
  try{window.dispatchEvent(new CustomEvent('dvl:paper-v2-close',{detail:{id:order.id,symbol:sym,reason:reason}}));}catch(_){}
  delete _closing[order.id];
}

function processPendingOrderExecution(order,price,now){
  var side=String(order.side||'').toLowerCase();
  var type=String(order.orderType||order.type||'limit').toLowerCase();
  var entry=Number(order.entry);
  if(!Number.isFinite(entry)||entry<=0)return false;
  var triggered=false;
  if(side==='buy'&&type.indexOf('stop')<0&&price<=entry)triggered=true;
  if(side==='sell'&&type.indexOf('stop')<0&&price>=entry)triggered=true;
  if(side==='buy'&&type.indexOf('stop')>=0&&price>=entry)triggered=true;
  if(side==='sell'&&type.indexOf('stop')>=0&&price<=entry)triggered=true;
  if(!triggered)return false;
  order.status='open';order.activatedAt=now;order.openedAt=now;order.entryExecuted=entry;
  applyEntryFee(order);
  return true;
}

function processOpenPositionExecution(order,price,now){
  var side=String(order.side||'').toLowerCase();
  var tp=Number(order.tp);var sl=Number(order.sl);
  var reason=null,exitPrice=null;
  if(side==='buy'||side==='long'){
    if(Number.isFinite(tp)&&tp>0&&price>=tp){reason='TP';exitPrice=tp;}
    else if(Number.isFinite(sl)&&sl>0&&price<=sl){reason='SL';exitPrice=sl;}
  }else{
    if(Number.isFinite(tp)&&tp>0&&price<=tp){reason='TP';exitPrice=tp;}
    else if(Number.isFinite(sl)&&sl>0&&price>=sl){reason='SL';exitPrice=sl;}
  }
  if(!reason)return false;
  closePaperTradeToHistory(order,exitPrice,reason,now);
  return true;
}

window.processPendingOrderRealtime=processPendingOrderExecution;
window.processOpenPositionRealtime=processOpenPositionExecution;

function updateWalletEquity(){
  var w=window.DVL_DEMO_WALLET;
  var total=0;
  try{
    var orders=getAllPaperOrdersSafe();
    for(var _i=0;_i<orders.length;_i++){
      var o=orders[_i];
      if(o&&o.status==='open'){
        var sym=normalizeSymbol(o.symbol);
        var lp=window.DVL_LAST_PRICE_BY_SYMBOL[sym];
        if(lp&&Number.isFinite(lp.price)&&lp.price>0){var pd=calcPaperPnl(o,lp.price);if(Number.isFinite(pd.pnl))total+=pd.pnl;}
      }
    }
  }catch(_){}
  w.unrealizedPnl=total;
  w.equity=w.balance+total;
}

var _tickBusy={};
function processPaperSymbolExecution(symbol,price,now){
  symbol=normalizeSymbol(symbol);
  if(!symbol||!Number.isFinite(price)||price<=0)return;
  if(_tickBusy[symbol])return;
  _tickBusy[symbol]=true;
  now=now||Date.now();
  try{
    var curSym=rawCurSym();
    var orders;
    if(symbol===curSym){
      try{var V2=window.DVL_PAPER_TRADING_V2_PRO;var _vs=V2&&V2.getState();orders=(_vs&&Array.isArray(_vs.orders))?_vs.orders.filter(function(o){return o&&o.status!=='draft';}):readSymbolOrders(symbol);}catch(_){orders=readSymbolOrders(symbol);}
    }else{
      orders=readSymbolOrders(symbol);
    }
    var changed=false;
    orders.filter(function(o){return o&&o.status==='pending';}).forEach(function(order){
      if(processPendingOrderExecution(order,price,now)){
        changed=true;
        if(!processOpenPositionExecution(order,price,now)){
          if(symbol===curSym){
            try{var V2b=window.DVL_PAPER_TRADING_V2_PRO;var _vs2=V2b&&V2b.getState();if(_vs2&&Array.isArray(_vs2.orders)){for(var _j=0;_j<_vs2.orders.length;_j++){if(_vs2.orders[_j]&&_vs2.orders[_j].id===order.id){_vs2.orders[_j]=order;break;}}}}catch(_){}
          }else{
            var fresh=readSymbolOrders(symbol);
            for(var _fi=0;_fi<fresh.length;_fi++){if(fresh[_fi]&&fresh[_fi].id===order.id){fresh[_fi]=order;break;}}
            writeSymbolOrders(symbol,fresh);
          }
        }
      }
    });
    orders.filter(function(o){return o&&o.status==='open';}).forEach(function(order){
      processOpenPositionExecution(order,price,now);
    });
    if(changed){try{if(typeof window.syncPaperStoreFromOrders==='function')window.syncPaperStoreFromOrders();}catch(_){}}
  }catch(_){}
  _tickBusy[symbol]=false;
}

var _paperTickBuckets1204=Object.create(null),_paperTickTimer1204=0;
function flushPaperTicks1204(){
  _paperTickTimer1204=0;
  var buckets=_paperTickBuckets1204;_paperTickBuckets1204=Object.create(null);
  Object.keys(buckets).forEach(function(symbol){
    var b=buckets[symbol],points=[];
    function add(price,time){
      if(!(price>0))return;
      for(var i=0;i<points.length;i++)if(points[i].price===price&&points[i].time===time)return;
      points.push({price:price,time:time});
    }
    add(b.first,b.firstTime);add(b.min,b.minTime);add(b.max,b.maxTime);add(b.last,b.lastTime);
    points.sort(function(a,c){return a.time-c.time;});
    for(var i=0;i<points.length;i++)processPaperSymbolExecution(symbol,points[i].price,points[i].time);
    var detail={symbol:symbol,price:b.last,time:b.lastTime};
    try{window.dispatchEvent(new CustomEvent('dvl:paper-price',{detail:detail}));}catch(_){}
    if(positionsPanelVisible1204()){
      try{if(typeof window.maybeUpdateOpenPositionDetail==='function')window.maybeUpdateOpenPositionDetail(symbol);}catch(_){}
    }
  });
  updateWalletEquity();
  renderPositionsPanelRealtime();
}
function onPaperPriceTick(symbol,price,time){
  symbol=normalizeSymbol(symbol);price=Number(price);time=Number(time)||Date.now();
  if(!symbol||!Number.isFinite(price)||price<=0)return;
  window.DVL_LAST_PRICE_BY_SYMBOL[symbol]={price:price,time:time};
  var b=_paperTickBuckets1204[symbol];
  if(!b)b=_paperTickBuckets1204[symbol]={first:price,firstTime:time,min:price,minTime:time,max:price,maxTime:time,last:price,lastTime:time};
  else{
    b.last=price;b.lastTime=time;
    if(price<b.min){b.min=price;b.minTime=time;}
    if(price>b.max){b.max=price;b.maxTime=time;}
  }
  if(!_paperTickTimer1204)_paperTickTimer1204=setTimeout(flushPaperTicks1204,50);
}

window.onPaperSymbolPrice=onPaperPriceTick;
window.onPaperPriceTick=onPaperPriceTick;
window.getPaperSymbolsToMonitor=getPaperSymbolsToWatch;
window.getPaperSymbolsToWatch=getPaperSymbolsToWatch;
window.processPaperRealtimeTick=processPaperSymbolExecution;
window.processPaperSymbolExecution=processPaperSymbolExecution;
window.calcPaperPnl=calcPaperPnl;
window.closePaperTradeToHistory=closePaperTradeToHistory;
window.renderPositionsPanelRealtime=renderPositionsPanelRealtime;
window.getAllPaperOrdersSafe=getAllPaperOrdersSafe;

/* Current chart price arrives from the feed itself; no 1s DOM/candle polling is
   needed for normal operation. The maintenance loop below remains a fallback. */
window.addEventListener('dvl:chart-price',function(ev){
  try{var d=ev&&ev.detail||{};var s=normalizeSymbol(d.symbol||rawCurSym());if(s&&Number(d.price)>0)onPaperPriceTick(s,Number(d.price),Number(d.time)||Date.now());}catch(_){}
},{passive:true});

// Apply fee for market orders on creation (pending orders get fee on activation)
window.addEventListener('dvl:paper-position',function(ev){
  try{
    var pos=ev&&ev.detail;if(!pos||!pos.id)return;
    if(String(pos.status||'').toLowerCase()!=='open')return;
    var V2=window.DVL_PAPER_TRADING_V2_PRO;var _vs=V2&&V2.getState();
    if(!_vs||!Array.isArray(_vs.orders))return;
    for(var _i=0;_i<_vs.orders.length;_i++){if(_vs.orders[_i]&&String(_vs.orders[_i].id)===String(pos.id)){applyEntryFee(_vs.orders[_i]);break;}}
  }catch(_){}
},false);

// Sync wallet for V2 Pro native closes (e.g. built-in TP/SL render)
window.addEventListener('dvl:paper-v2-close',function(ev){
  try{
    var detail=ev&&ev.detail;if(!detail||!detail.id)return;
    if(_walletHandled[detail.id]){delete _walletHandled[detail.id];return;}
    // V2 Pro closed this order natively — update wallet
    var V2=window.DVL_PAPER_TRADING_V2_PRO;var _vs=V2&&V2.getState();
    if(!_vs||!Array.isArray(_vs.orders))return;
    var order=null;
    for(var _i=0;_i<_vs.orders.length;_i++){if(_vs.orders[_i]&&String(_vs.orders[_i].id)===String(detail.id)){order=_vs.orders[_i];break;}}
    if(!order||order.status!=='closed')return;
    var exitPrice=Number(order.exitPrice||order.closedPrice||detail.price||0);
    if(!exitPrice)return;
    var entryFee=Number(order.entryFee||0);
    var qty=Number(order.qty||order.size||0);
    var exitFee=calcFee(qty,exitPrice,getFeeRate(order));
    var grossPnl=Number(order.realizedPnl||detail.pnl||0);
    var netPnl=grossPnl-entryFee-exitFee;
    var w=window.DVL_DEMO_WALLET;
    var margin=Number(order.requiredMargin||0);
    w.balance+=netPnl;
    w.usedMargin=Math.max(0,w.usedMargin-margin);
    w.totalFees+=exitFee;
    w.realizedPnl+=netPnl;
    w.availableBalance=Math.max(0,w.balance-w.usedMargin);
    order.netPnl=netPnl;order.exitFee=exitFee;order.totalFee=entryFee+exitFee;
    order.grossPnl=grossPnl;order.realizedPnl=netPnl;
    saveDemoWallet();
  }catch(_){}
},false);

var _ws=null,_wsSymbols=[];

function connectPaperWS(symbols){
  if(!symbols||!symbols.length)return;
  if(_ws){try{_ws.close();}catch(_){}_ws=null;}
  var streams=symbols.map(function(s){return s.toLowerCase()+'@aggTrade';}).join('/');
  var url='wss://stream.binance.com:9443/stream?streams='+streams;
  try{
    var ws=new WebSocket(url);
    ws.onmessage=function(ev){try{var msg=JSON.parse(ev.data);var d=msg.data||msg;if(d&&d.s&&d.p)onPaperPriceTick(d.s,parseFloat(d.p),d.T||Date.now());}catch(_){}};
    ws.onopen=function(){window.DVL_PAPER_EXECUTION_ENGINE.running=true;_wsSymbols=symbols.slice();};
    ws.onerror=function(){};
    ws.onclose=function(){_ws=null;window.DVL_PAPER_EXECUTION_ENGINE.running=false;};
    _ws=ws;window.DVL_PAPER_EXECUTION_ENGINE.ws=_ws;
  }catch(e){}
}

// window.ticker is a local IIFE var — never on window. Use window.S.candles instead.
function getChartLivePrice(){
  try{if(window.ticker&&Number(window.ticker.lastPrice)>0)return Number(window.ticker.lastPrice);}catch(_){}
  try{
    if(window.S&&Array.isArray(window.S.candles)&&window.S.candles.length){
      var _lc=window.S.candles[window.S.candles.length-1];
      var _lp=Number(_lc.close||_lc.c);
      if(_lp>0)return _lp;
    }
  }catch(_){}
  return 0;
}

function ensureRealtimeSubscriptions(){
  var curSym=rawCurSym();
  try{var _cp=getChartLivePrice();if(curSym&&_cp>0)window.DVL_LAST_PRICE_BY_SYMBOL[curSym]={price:_cp,time:Date.now()};}catch(_){}
  var all=getPaperSymbolsToWatch();
  var nonCur=all.filter(function(s){return s!==curSym;});
  if(!nonCur.length){if(_ws){try{_ws.close();}catch(_){}_ws=null;_wsSymbols=[];}return;}
  if(_ws&&_ws.readyState===1){
    var same=_wsSymbols.length===nonCur.length;
    if(same){for(var _si=0;_si<nonCur.length;_si++){if(_wsSymbols.indexOf(nonCur[_si])<0){same=false;break;}}}
    if(same)return;
  }
  connectPaperWS(nonCur);
}

function fetchPaperPricesREST(){
  var curSym=rawCurSym();
  // Current symbol is fed by dvl:chart-price. REST is only a fallback for
  // non-current symbols whose dedicated WebSocket is unavailable.
  // For non-current symbols: only fetch if WS is down
  var nonCurSymbols=getPaperSymbolsToWatch().filter(function(s){return s!==curSym;});
  if(!nonCurSymbols.length)return;
  if(!(_ws&&_ws.readyState===1)){
    try{
      fetch('https://api.binance.com/api/v3/ticker/price?symbols='+encodeURIComponent(JSON.stringify(nonCurSymbols)),{cache:'no-store'})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(data){if(Array.isArray(data))data.forEach(function(item){if(item.symbol&&item.price)onPaperPriceTick(item.symbol,parseFloat(item.price),Date.now());});})
        .catch(function(){});
    }catch(_){}
  }
  /* Fallback MEXC: a Binance só tem os símbolos listados nela — um ativo só-MEXC
     (ex.: ANSEM) nunca vinha, e ainda por cima UM símbolo inválido no lote fazia
     a Binance rejeitar o request INTEIRO (então nem o TRX vinha) → "Preço atual --"
     e PnL "--". Aqui, pra todo símbolo aberto que continua SEM preço fresco, a
     gente puxa do mapa de preços da MEXC pelo backend (indexado por "BASE_USDT")
     — a mesma fonte que o resto do app usa. */
  var needMexc=nonCurSymbols.some(function(s){
    var lp=window.DVL_LAST_PRICE_BY_SYMBOL[normalizeSymbol(s)];
    return !(lp&&Number.isFinite(lp.price)&&lp.price>0&&(Date.now()-(lp.time||0))<15000);
  });
  if(needMexc){
    try{
      fetch('/api/dvl/scanner/mexc-price',{cache:'no-store'})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(j){
          if(!j||!j.prices)return;
          nonCurSymbols.forEach(function(s){
            var base=normalizeSymbol(s).replace(/USDT$/,'');
            var p=Number(j.prices[base+'_USDT']);
            if(Number.isFinite(p)&&p>0)onPaperPriceTick(s,p,Date.now());
          });
        }).catch(function(){});
    }catch(_){}
  }
}

/* Sweep EVERY open position against its latest cached price so TP/SL fecha de
   verdade — mesmo em posição de outro ativo (não o do gráfico) e independente
   de qual feed trouxe o preço ou de qual slot o pedido está gravado. Antes o
   TP/SL só era checado no tick do próprio símbolo; se o tick não chegasse (ou
   caísse num slot com chave diferente), a posição ficava aberta mesmo depois de
   bater o alvo. Aqui varremos TODOS os pedidos abertos toda vez. */
function sweepOpenPositionsTpSl(){
  try{
    var open=getAllPaperOrdersSafe().filter(function(o){return o&&o.status==='open';});
    for(var i=0;i<open.length;i++){
      var o=open[i];
      var nsym=normalizeSymbol(o.symbol);
      var lp=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[nsym];
      var p=lp&&Number(lp.price)>0?Number(lp.price):0;
      if(p>0) processOpenPositionExecution(o,p,Date.now());
    }
  }catch(_){}
}
window.sweepOpenPositionsTpSl=sweepOpenPositionsTpSl;

// Beta 1.204: low-frequency safety maintenance only while paper orders exist.
setInterval(function(){
  try{
    if(document.hidden)return;
    var orders=getAllPaperOrdersSafe();
    var active=orders.some(function(o){return o&&(o.status==='open'||o.status==='pending');});
    if(!active){if(positionsPanelVisible1204())renderPositionsPanelRealtime();return;}
    var curSym=rawCurSym(),lp=curSym&&window.DVL_LAST_PRICE_BY_SYMBOL[curSym];
    if(curSym&&(!lp||(Date.now()-(lp.time||0))>2500)){
      var fallbackPrice=getChartLivePrice();
      if(fallbackPrice>0)onPaperPriceTick(curSym,fallbackPrice,Date.now());
    }
    sweepOpenPositionsTpSl();
    updateWalletEquity();
    renderPositionsPanelRealtime();
  }catch(_){}
},2000);

// Subscription/REST fallback runs only for active non-current orders.
setInterval(function(){
  try{
    if(document.hidden)return;
    var orders=getAllPaperOrdersSafe();
    var active=orders.some(function(o){return o&&(o.status==='open'||o.status==='pending');});
    if(!active){ensureRealtimeSubscriptions();return;}
    ensureRealtimeSubscriptions();fetchPaperPricesREST();
  }catch(_){}
},5000);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureRealtimeSubscriptions,{once:true});
else ensureRealtimeSubscriptions();

})();
