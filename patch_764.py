#!/usr/bin/env python3
"""patch_764.py — Beta 0.764: Demo Wallet + Realtime Execution Engine."""
import sys

PATH = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label, expect=1):
    count = html.count(old)
    if count != expect:
        print(f"ABORT [{label}] — expected {expect} occ, got {count}")
        sys.exit(1)
    html = html.replace(old, new, expect)
    print(f"  OK: {label}")
    return html

def rep_script(html, old_id, new_content, label):
    """Replace entire <script id="old_id">...</script> block."""
    start_tag = f'<script id="{old_id}">'
    si = html.find(start_tag)
    if si < 0:
        print(f"ABORT [{label}] — script id not found: {old_id}")
        sys.exit(1)
    ei = html.find('</script>', si)
    if ei < 0:
        print(f"ABORT [{label}] — closing </script> not found")
        sys.exit(1)
    ei += len('</script>')
    print(f"  OK: {label}")
    return html[:si] + new_content + html[ei:]

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_764.py — Beta 0.764 ===")

# ── 1. Version bumps ────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.763</title>',
    '<title>DVL Binance Live — Beta 0.764</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.763";',
    'const DVL_APP_VERSION = "Beta 0.764";', "version const")

html = rep(html,
    '>BETA 0.763</span>',
    '>BETA 0.764</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.763 — Positions detail actions fix: position details now open from the clicked trade id with real store data, Positions and detail PnL refresh in real time, View on chart switches to the position symbol, TP/SL move button was removed, partial close opens a percentage panel, and close position works across symbols." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.764 — Demo wallet and realtime execution: Paper TP/SL and pending orders now execute in real time across symbols without opening the asset, Demo balance uses margin like real trading, Tax was renamed to Fee, and entry/exit fees now affect PnL, equity and trade history." },\n  { version: "Beta 0.763", note: "Beta 0.763 — Positions detail actions fix: position details now open from the clicked trade id with real store data, Positions and detail PnL refresh in real time, View on chart switches to the position symbol, TP/SL move button was removed, partial close opens a percentage panel, and close position works across symbols." },',
    "changelog")

# ── 2. Audit bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0763_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0764_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.763"',
    'window.DVL_APP_VERSION==="Beta 0.764"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.763' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.764' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.763")===-1) blockers.push("A2: title missing 0.763")',
    'indexOf("0.764")===-1) blockers.push("A2: title missing 0.764")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0763_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0764_AUDIT_MODULE";', "audit name bump")

# A103: buildRealRow doesn't exist — update to check renderPositionDetail
html = rep(html,
    'if(t.indexOf("buildRealRow")===-1) blockers.push("A103: details panel missing buildRealRow");',
    'if(t.indexOf("renderPositionDetail")===-1) blockers.push("A103: details panel missing renderPositionDetail");',
    "audit A103 fix")

# ── 3. Tax → Fee ────────────────────────────────────────────────────────────
html = rep(html,
    '<button class="panelBtn">Tax <span class="tiny">0.10%</span></button>',
    '<button class="panelBtn">Fee <span class="tiny">0.05%</span></button>',
    "tax to fee")

# ── 4. Replace 0762 engine with 0764 execution engine ───────────────────────
NEW_ENGINE = '''<script id="DVL_PAPER_EXECUTION_ENGINE_MODULE_0764">
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

function renderPositionsPanelRealtime(){try{if(typeof window.DVL_POSITIONS_REFRESH==='function')window.DVL_POSITIONS_REFRESH();}catch(_){}}

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
  var lsOrds=readSymbolOrders(sym).filter(function(o){return o&&o.id!==order.id;});
  writeSymbolOrders(sym,lsOrds);
  try{var V2=window.DVL_PAPER_TRADING_V2_PRO;if(V2&&normalizeSymbol(rawCurSym())===sym){var _st=V2.getState();if(_st&&Array.isArray(_st.orders))_st.orders=_st.orders.filter(function(o){return o&&o.id!==order.id;});}}catch(_){}
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

function onPaperPriceTick(symbol,price,time){
  symbol=normalizeSymbol(symbol);price=Number(price);
  if(!symbol||!Number.isFinite(price)||price<=0)return;
  window.DVL_LAST_PRICE_BY_SYMBOL[symbol]={price:price,time:time||Date.now()};
  processPaperSymbolExecution(symbol,price,time||Date.now());
  try{if(typeof window.maybeUpdateOpenPositionDetail==='function')window.maybeUpdateOpenPositionDetail(symbol);}catch(_){}
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

function ensureRealtimeSubscriptions(){
  var curSym=rawCurSym();
  try{if(curSym&&window.ticker&&Number(window.ticker.lastPrice)>0)window.DVL_LAST_PRICE_BY_SYMBOL[curSym]={price:Number(window.ticker.lastPrice),time:Date.now()};}catch(_){}
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
  if(_ws&&_ws.readyState===1)return;
  var curSym=rawCurSym();
  var symbols=getPaperSymbolsToWatch().filter(function(s){return s!==curSym;});
  if(!symbols.length)return;
  try{
    fetch('https://api.binance.com/api/v3/ticker/price?symbols='+encodeURIComponent(JSON.stringify(symbols)),{cache:'no-store'})
      .then(function(r){return r.json();})
      .then(function(data){if(Array.isArray(data))data.forEach(function(item){if(item.symbol&&item.price)onPaperPriceTick(item.symbol,parseFloat(item.price),Date.now());});})
      .catch(function(){});
  }catch(_){}
}

// 1s: push current symbol price + update wallet equity
setInterval(function(){
  try{
    var curSym=rawCurSym();
    if(curSym&&window.ticker&&Number(window.ticker.lastPrice)>0){
      onPaperPriceTick(curSym,Number(window.ticker.lastPrice),Date.now());
    }
    updateWalletEquity();
    renderPositionsPanelRealtime();
  }catch(_){}
},1000);

// 3s: manage WebSocket subscriptions + REST fallback for non-current symbols
setInterval(function(){
  try{ensureRealtimeSubscriptions();fetchPaperPricesREST();}catch(_){}
},3000);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureRealtimeSubscriptions,{once:true});
else ensureRealtimeSubscriptions();

})();
</script>'''

html = rep_script(html, 'DVL_PAPER_REALTIME_ENGINE_MODULE_0762', NEW_ENGINE, "replace engine 0762→0764")

# ── 5. Update wallet module to use DVL_DEMO_WALLET ──────────────────────────
NEW_WALLET = '''<script id="DVL_DEMO_WALLET_MODULE_0738">
(function(){
"use strict";
if(window.DVL_DEMO_WALLET_0738) return;

function calcWallet(){
  var w=window.DVL_DEMO_WALLET;
  if(w)return Number.isFinite(w.equity)?w.equity:(Number.isFinite(w.balance)?w.balance:10000);
  return 10000;
}

function updateDisplay(){
  var el=document.getElementById("dvlWalletValue");
  if(!el) return;
  var w=calcWallet();
  el.textContent=w.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}

function resetWallet(){
  var v2=window.DVL_PAPER_TRADING_V2_PRO;
  if(v2){
    try{ var st=v2.getState(); if(st){ st.orders=[]; st.selectedId=null; st.drag=null; st.edit=null; } }catch(_){}
    try{
      var keys=[];
      for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
      for(var j=0;j<keys.length;j++) if(String(keys[j]).indexOf("dvl_paper_v2_pro_0695_")===0) try{ localStorage.removeItem(keys[j]); }catch(_){}
    }catch(_){}
    try{ v2.render(); }catch(_){}
  }
  try{localStorage.removeItem('DVL_DEMO_WALLET_0764');}catch(_){}
  var w=window.DVL_DEMO_WALLET;
  if(w){w.balance=10000;w.availableBalance=10000;w.usedMargin=0;w.equity=10000;w.unrealizedPnl=0;w.realizedPnl=0;w.totalFees=0;}
  var store=window.DVL_PAPER_TRADE_STORE;
  if(store){store.pendingOrders=[];store.openPositions=[];store.tradeHistory=[];}
  try{ if(typeof window.savePaperTradeStore==='function')window.savePaperTradeStore(); }catch(_){}
  try{ if(window.DVL_POSITIONS_REFRESH) window.DVL_POSITIONS_REFRESH(); }catch(_){}
  updateDisplay();
}

function addStyles(){
  if(document.getElementById("DVL_DEMO_WALLET_STYLE_0740")) return;
  var s=document.createElement("style");
  s.id="DVL_DEMO_WALLET_STYLE_0740";
  s.textContent=
    ".dvlDemoReset{background:none!important;border:none!important;color:var(--orange)!important;"
    "opacity:.60!important;cursor:pointer!important;font-size:16px!important;line-height:1!important;"
    "padding:0!important;display:inline-flex!important;align-items:center!important;"
    "justify-content:center!important;align-self:stretch!important;aspect-ratio:1!important;"
    "margin-left:4px!important;}"
    ".dvlDemoReset:hover,.dvlDemoReset:active{opacity:1!important;}";
  (document.head||document.documentElement).appendChild(s);
}

function init(){
  addStyles();
  var btn=document.getElementById("dvlDemoResetBtn");
  if(btn) btn.addEventListener("click",function(ev){ ev.preventDefault(); ev.stopPropagation(); resetWallet(); },false);
  window.addEventListener("dvl:paper-v2-close", updateDisplay, false);
  updateDisplay();
}

window.DVL_DEMO_WALLET_0738={calc:calcWallet,reset:resetWallet,update:updateDisplay};

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
</script>
</body>
</html>'''

html = rep_script(html, 'DVL_DEMO_WALLET_MODULE_0738', NEW_WALLET, "update wallet module")

# ── 6. Insert 0764 audit module before 0763 audit ───────────────────────────
AUDIT_0764 = '''<script id="DVL_DEMO_WALLET_REALTIME_EXECUTION_AUDIT_MODULE_0764">
(function(){
"use strict";
window.DVL_DEMO_WALLET_REALTIME_EXECUTION_AUDIT_0764={run:function(){
  var bl=[];
  if(document.title.indexOf('0.764')<0)bl.push('01: title missing 0.764');
  if(document.body.innerHTML.indexOf('BETA 0.764')<0)bl.push('02: badge missing 0.764');
  if(document.body.innerHTML.indexOf('Beta 0.764')<0)bl.push('03: changelog missing 0.764');
  if(!window.DVL_PAPER_EXECUTION_ENGINE)bl.push('04: DVL_PAPER_EXECUTION_ENGINE missing');
  if(!window.DVL_LAST_PRICE_BY_SYMBOL)bl.push('05: DVL_LAST_PRICE_BY_SYMBOL missing');
  if(typeof window.getPaperSymbolsToWatch==='undefined'&&typeof window.getPaperSymbolsToMonitor==='undefined')bl.push('06: getPaperSymbolsToWatch missing');
  if(typeof window.processPendingOrderRealtime!=='function')bl.push('07: processPendingOrderRealtime missing');
  if(typeof window.processOpenPositionRealtime!=='function')bl.push('08: processOpenPositionRealtime missing');
  if(typeof window.onPaperSymbolPrice!=='function'&&typeof window.onPaperPriceTick!=='function')bl.push('09: price tick function missing');
  if(typeof window.processPaperRealtimeTick!=='function'&&typeof window.processPaperSymbolExecution!=='function')bl.push('10: symbol execution function missing');
  if(typeof window.renderPositionsPanelRealtime!=='function')bl.push('11: renderPositionsPanelRealtime missing');
  if(!window.DVL_PAPER_TRADE_STORE)bl.push('12: DVL_PAPER_TRADE_STORE missing');
  if(typeof window.closePaperTradeToHistory!=='function')bl.push('13: closePaperTradeToHistory missing');
  if(!window.DVL_DEMO_WALLET)bl.push('15: DVL_DEMO_WALLET missing');
  var w=window.DVL_DEMO_WALLET;
  if(w){
    if(typeof w.balance!=='number')bl.push('16: wallet.balance not a number');
    if(typeof w.availableBalance!=='number')bl.push('17: wallet.availableBalance not a number');
    if(typeof w.usedMargin!=='number')bl.push('18: wallet.usedMargin not a number');
    if(typeof w.equity!=='number')bl.push('19: wallet.equity not a number');
    if(typeof w.unrealizedPnl!=='number')bl.push('20: wallet.unrealizedPnl not a number');
    if(typeof w.realizedPnl!=='number')bl.push('21: wallet.realizedPnl not a number');
    if(typeof w.totalFees!=='number')bl.push('22: wallet.totalFees not a number');
  }
  if(typeof window.addTradeToHistory!=='function')bl.push('26: addTradeToHistory missing');
  try{var pd=window.calcPaperPnl({side:'buy',entry:100,qty:1},110);if(!pd||Math.abs((pd.pnl||0)-10)>0.001)bl.push('23: calcPaperPnl buy incorrect');}catch(e){bl.push('23: calcPaperPnl threw');}
  try{var pd2=window.calcPaperPnl({side:'sell',entry:100,qty:1},90);if(!pd2||Math.abs((pd2.pnl||0)-10)>0.001)bl.push('24: calcPaperPnl sell incorrect');}catch(e){bl.push('24: calcPaperPnl sell threw');}
  if(document.body.innerHTML.indexOf('>Fee <span class="tiny">')<0)bl.push('34: Fee button missing');
  if(document.body.innerHTML.indexOf('>Tax <span')>=0)bl.push('33: Tax button still present - should be Fee');
  if(!window.DVL_DEMO_FEE_CONFIG)bl.push('35: DVL_DEMO_FEE_CONFIG missing');
  var fc=window.DVL_DEMO_FEE_CONFIG;
  if(fc){
    if(Math.abs(fc.makerFeeRate-0.0002)>1e-9)bl.push('36: makerFeeRate should be 0.0002');
    if(Math.abs(fc.takerFeeRate-0.0005)>1e-9)bl.push('37: takerFeeRate should be 0.0005');
  }
  try{var r=window.processPendingOrderRealtime({side:'buy',orderType:'Limit',entry:1.0},0.99,Date.now());if(!r)bl.push('09b: buy limit should trigger at price<=entry');}catch(e){bl.push('09c: processPendingOrderRealtime threw');}
  try{var r2=window.processPendingOrderRealtime({side:'sell',orderType:'Limit',entry:1.0},1.01,Date.now());if(!r2)bl.push('09d: sell limit should trigger at price>=entry');}catch(e){bl.push('09e: sell limit threw');}
  try{var r3=window.processPendingOrderRealtime({side:'buy',orderType:'stop',entry:1.0},1.01,Date.now());if(!r3)bl.push('09f: buy stop should trigger at price>=entry');}catch(e){bl.push('09g: buy stop threw');}
  try{var r4=window.processPendingOrderRealtime({side:'sell',orderType:'stop',entry:1.0},0.99,Date.now());if(!r4)bl.push('09h: sell stop should trigger at price<=entry');}catch(e){bl.push('09i: sell stop threw');}
  try{var fn=String(window.closePaperTradeToHistory||'');
    if(fn.indexOf('grossPnl')<0)bl.push('28: closePaperTradeToHistory missing grossPnl');
    if(fn.indexOf('entryFee')<0)bl.push('29: closePaperTradeToHistory missing entryFee');
    if(fn.indexOf('exitFee')<0)bl.push('30: closePaperTradeToHistory missing exitFee');
    if(fn.indexOf('totalFee')<0)bl.push('31: closePaperTradeToHistory missing totalFee');
    if(fn.indexOf('netPnl')<0)bl.push('32: closePaperTradeToHistory missing netPnl');
  }catch(_){}
  try{var fn2=String(window.processPendingOrderRealtime||'');if(fn2.indexOf('applyEntryFee')<0)bl.push('25: processPendingOrderRealtime missing applyEntryFee call');}catch(_){}
  try{var _store=window.DVL_PAPER_TRADE_STORE;if(_store){var _th=_store.tradeHistory||[];if(_th.length>100)bl.push('39: tradeHistory exceeds 100');var _ids={};var _dup=false;_th.forEach(function(t){if(t&&t.id){if(_ids[t.id])_dup=true;_ids[t.id]=true;}});if(_dup)bl.push('40: tradeHistory has duplicate ids');}}catch(e){}
  if(!window.DVL_POSITION_DETAILS_PANEL_0724)bl.push('41: DVL_POSITION_DETAILS_PANEL_0724 missing - 0.763 regression');
  if(typeof window.DVL_POSITIONS_REFRESH!=='function')bl.push('42: DVL_POSITIONS_REFRESH missing');
  if(typeof window.saveDemoWallet!=='function')bl.push('43: saveDemoWallet missing');
  if(window.DVL_PAPER_EXECUTION_ENGINE&&window.DVL_PAPER_EXECUTION_ENGINE.version!=='0.764')bl.push('04b: engine version is not 0.764');
  if(document.body.innerHTML.toLowerCase().indexOf('broker connector')>=0)bl.push('44: Broker Connector found — must not exist');
  return{pass:bl.length===0,blockers:bl,version:'0.764',checks:46};
}};
})();
</script>

'''

html = rep(html,
    '<script id="DVL_POSITIONS_DETAIL_ACTIONS_AUDIT_MODULE_0763">',
    AUDIT_0764 + '<script id="DVL_POSITIONS_DETAIL_ACTIONS_AUDIT_MODULE_0763">',
    "insert 0764 audit module")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
