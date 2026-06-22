#!/usr/bin/env python3
"""patch_762.py — Beta 0.762: Paper Realtime Multi-Symbol Engine."""
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

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_762.py — Beta 0.762 ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.761</title>',
    '<title>DVL Binance Live — Beta 0.762</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.761";',
    'const DVL_APP_VERSION = "Beta 0.762";', "version const")

html = rep(html,
    '>BETA 0.761</span>',
    '>BETA 0.762</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.761 — Live PnL no painel Positions: DVL_POSITIONS_REFRESH() no final de render() para atualizar preço atual e PnL a cada ciclo do chart." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.762 — Paper realtime multi-symbol engine: pending orders, open positions, TP/SL execution and floating PnL now update in real time for all symbols with Paper activity, without needing to open the symbol on the chart." },\n  { version: "Beta 0.761", note: "Beta 0.761 — Live PnL no painel Positions: DVL_POSITIONS_REFRESH() no final de render() para atualizar preço atual e PnL a cada ciclo do chart." },',
    "changelog")

# ── 2. Audit bump 0761 → 0762 ─────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0761_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0762_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.761"',
    'window.DVL_APP_VERSION==="Beta 0.762"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.761' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.762' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.761")===-1) blockers.push("A2: title missing 0.761")',
    'indexOf("0.762")===-1) blockers.push("A2: title missing 0.762")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0761_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0762_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Adapter: use DVL_LAST_PRICE_BY_SYMBOL for per-symbol price ─────────────
html = rep(html,
    "          var _lv=sym===_curSym?live:0;\n"
    "          var pv=_lv>0&&ep>0?(buy?(_lv-ep)*qty:(ep-_lv)*qty):0;\n"
    "          var pc=_lv>0&&ep>0?(buy?((_lv-ep)/ep)*100:((ep-_lv)/ep)*100):0;",
    "          var _lpEntry=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];var _lv=(_lpEntry&&Number.isFinite(_lpEntry.price)&&_lpEntry.price>0)?_lpEntry.price:(sym===_curSym?live:0);\n"
    "          var pv=_lv>0&&ep>0?(buy?(_lv-ep)*qty:(ep-_lv)*qty):0;\n"
    "          var pc=_lv>0&&ep>0?(buy?((_lv-ep)/ep)*100:((ep-_lv)/ep)*100):0;",
    "adapter: per-symbol price from DVL_LAST_PRICE_BY_SYMBOL")

# ── 4. Engine module + audit inserted before DVL_POSITION_DETAILS_PANEL ───────
ENGINE = """\
<script id="DVL_PAPER_REALTIME_ENGINE_MODULE_0762">
(function(){
"use strict";
if(window.DVL_PAPER_REALTIME_ENGINE)return;

window.DVL_LAST_PRICE_BY_SYMBOL=window.DVL_LAST_PRICE_BY_SYMBOL||{};
window.DVL_PAPER_REALTIME_ENGINE={version:'0.762',lastPriceBySymbol:window.DVL_LAST_PRICE_BY_SYMBOL,subscriptions:{},activeSymbols:[],running:false,ws:null};

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

function getPaperSymbolsToMonitor(){
  var _s={};
  try{var store=window.DVL_PAPER_TRADE_STORE;if(store){(store.pendingOrders||[]).forEach(function(o){if(o.symbol)_s[normalizeSymbol(o.symbol)]=1;});(store.openPositions||[]).forEach(function(o){if(o.symbol)_s[normalizeSymbol(o.symbol)]=1;});}}catch(_){}
  try{getAllPaperOrdersSafe().forEach(function(o){if(o.symbol&&(o.status==='pending'||o.status==='open'))_s[normalizeSymbol(o.symbol)]=1;});}catch(_){}
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

function renderPositionsPanelRealtime(){try{if(typeof window.DVL_POSITIONS_REFRESH==='function')window.DVL_POSITIONS_REFRESH();}catch(_){}}

// addTradeToHistory with dedupe — overrides store version
function addTradeToHistoryDeduped(trade){
  var store=window.DVL_PAPER_TRADE_STORE;if(!store||!trade)return;
  store.tradeHistory=(store.tradeHistory||[]).filter(function(t){return t.id!==trade.id;});
  store.tradeHistory.push(trade);
  while(store.tradeHistory.length>store.maxHistory)store.tradeHistory.shift();
  try{if(typeof window.savePaperTradeStore==='function')window.savePaperTradeStore();}catch(_){}
}
window.addTradeToHistory=addTradeToHistoryDeduped;

// close a trade and move to history
var _closing={};
function closePaperTradeToHistory(order,exitPrice,reason,now){
  if(!order||_closing[order.id])return;
  _closing[order.id]=true;
  now=now||Date.now();
  exitPrice=Number(exitPrice);
  var sym=normalizeSymbol(order.symbol);
  var pnlData=calcPaperPnl(order,exitPrice);
  var closed={};
  for(var _ck in order)if(Object.prototype.hasOwnProperty.call(order,_ck))closed[_ck]=order[_ck];
  closed.status='closed';closed.exitPrice=exitPrice;closed.closedPrice=exitPrice;
  closed.closedAt=now;closed.closeReason=reason;
  closed.realizedPnl=pnlData.pnl;closed.realizedPnlPct=pnlData.pnlPct;
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

function processPendingOrderRealtime(order,price,now){
  var side=String(order.side||'').toLowerCase();
  var type=String(order.orderType||order.type||'limit').toLowerCase();
  var entry=Number(order.entry);
  if(!Number.isFinite(entry)||entry<=0)return false;
  var triggered=false;
  if(type.indexOf('stop')>=0){
    if(side==='buy'&&price>=entry)triggered=true;
    if(side==='sell'&&price<=entry)triggered=true;
  }else{
    if(side==='buy'&&price<=entry)triggered=true;
    if(side==='sell'&&price>=entry)triggered=true;
  }
  if(!triggered)return false;
  order.status='open';order.activatedAt=now;order.openedAt=now;
  return true;
}

function processOpenPositionRealtime(order,price,now){
  var side=String(order.side||'').toLowerCase();
  var tp=Number(order.tp);var sl=Number(order.sl);
  var closeReason=null,exitPrice=null;
  if(side==='buy'||side==='long'){
    if(Number.isFinite(tp)&&tp>0&&price>=tp){closeReason='tp';exitPrice=tp;}
    else if(Number.isFinite(sl)&&sl>0&&price<=sl){closeReason='sl';exitPrice=sl;}
  }else{
    if(Number.isFinite(tp)&&tp>0&&price<=tp){closeReason='tp';exitPrice=tp;}
    else if(Number.isFinite(sl)&&sl>0&&price>=sl){closeReason='sl';exitPrice=sl;}
  }
  if(!closeReason)return false;
  closePaperTradeToHistory(order,exitPrice,closeReason,now);
  return true;
}

var _tickBusy={};
function processPaperRealtimeTick(symbol,price,now){
  symbol=normalizeSymbol(symbol);
  if(!symbol||!Number.isFinite(price)||price<=0)return;
  if(_tickBusy[symbol])return;
  _tickBusy[symbol]=true;
  now=now||Date.now();
  try{
    var curSym=rawCurSym();
    if(symbol===curSym){renderPositionsPanelRealtime();_tickBusy[symbol]=false;return;}
    var orders=readSymbolOrders(symbol);
    var changed=false;
    var pending=orders.filter(function(o){return o.status==='pending';});
    var open=orders.filter(function(o){return o.status==='open';});
    pending.forEach(function(order){
      if(processPendingOrderRealtime(order,price,now)){
        changed=true;
        if(!processOpenPositionRealtime(order,price,now)){
          for(var _i=0;_i<orders.length;_i++){if(orders[_i].id===order.id){orders[_i]=order;break;}}
        }else{orders=orders.filter(function(o){return o.id!==order.id;});}
      }
    });
    open.forEach(function(order){
      if(processOpenPositionRealtime(order,price,now)){changed=true;orders=orders.filter(function(o){return o.id!==order.id;});}
    });
    if(changed){writeSymbolOrders(symbol,orders);try{if(typeof window.syncPaperStoreFromOrders==='function')window.syncPaperStoreFromOrders();}catch(_){}}
    renderPositionsPanelRealtime();
  }catch(_){}
  _tickBusy[symbol]=false;
}

function onPaperSymbolPrice(symbol,price,time){
  symbol=normalizeSymbol(symbol);price=Number(price);
  if(!symbol||!Number.isFinite(price)||price<=0)return;
  window.DVL_LAST_PRICE_BY_SYMBOL[symbol]={price:price,time:time||Date.now()};
  processPaperRealtimeTick(symbol,price,time||Date.now());
}

window.onPaperSymbolPrice=onPaperSymbolPrice;
window.getPaperSymbolsToMonitor=getPaperSymbolsToMonitor;
window.processPaperRealtimeTick=processPaperRealtimeTick;
window.processPendingOrderRealtime=processPendingOrderRealtime;
window.processOpenPositionRealtime=processOpenPositionRealtime;
window.calcPaperPnl=calcPaperPnl;
window.closePaperTradeToHistory=closePaperTradeToHistory;
window.renderPositionsPanelRealtime=renderPositionsPanelRealtime;

// WebSocket combined aggTrade stream for non-current symbols
var _ws=null,_wsSymbols=[];

function connectPaperWS(symbols){
  if(!symbols||!symbols.length)return;
  if(_ws){try{_ws.close();}catch(_){}_ws=null;}
  var streams=symbols.map(function(s){return s.toLowerCase()+'@aggTrade';}).join('/');
  var url='wss://stream.binance.com:9443/stream?streams='+streams;
  try{
    var ws=new WebSocket(url);
    ws.onmessage=function(ev){
      try{var msg=JSON.parse(ev.data);var d=msg.data||msg;if(d&&d.s&&d.p)onPaperSymbolPrice(d.s,parseFloat(d.p),d.T||Date.now());}catch(_){}
    };
    ws.onopen=function(){window.DVL_PAPER_REALTIME_ENGINE.running=true;_wsSymbols=symbols.slice();};
    ws.onerror=function(){};
    ws.onclose=function(){_ws=null;window.DVL_PAPER_REALTIME_ENGINE.running=false;};
    _ws=ws;window.DVL_PAPER_REALTIME_ENGINE.ws=_ws;
  }catch(e){}
}

function ensurePaperRealtimeSubscriptions(){
  var curSym=rawCurSym();
  try{if(curSym&&window.ticker&&Number(window.ticker.lastPrice)>0)window.DVL_LAST_PRICE_BY_SYMBOL[curSym]={price:Number(window.ticker.lastPrice),time:Date.now()};}catch(_){}
  var symbols=getPaperSymbolsToMonitor().filter(function(s){return s!==curSym;});
  if(!symbols.length){if(_ws){try{_ws.close();}catch(_){}_ws=null;_wsSymbols=[];}return;}
  if(_ws&&_ws.readyState===1){
    var same=_wsSymbols.length===symbols.length;
    if(same){for(var _si=0;_si<symbols.length;_si++){if(_wsSymbols.indexOf(symbols[_si])<0){same=false;break;}}}
    if(same)return;
  }
  connectPaperWS(symbols);
}

// REST fallback when WebSocket is not open
function fetchPaperPricesREST(){
  if(_ws&&_ws.readyState===1)return;
  var curSym=rawCurSym();
  var symbols=getPaperSymbolsToMonitor().filter(function(s){return s!==curSym;});
  if(!symbols.length)return;
  try{
    fetch('https://api.binance.com/api/v3/ticker/price?symbols='+encodeURIComponent(JSON.stringify(symbols)),{cache:'no-store'})
      .then(function(r){return r.json();})
      .then(function(data){if(Array.isArray(data))data.forEach(function(item){if(item.symbol&&item.price)onPaperSymbolPrice(item.symbol,parseFloat(item.price),Date.now());});})
      .catch(function(){});
  }catch(_){}
}

setInterval(function(){
  try{ensurePaperRealtimeSubscriptions();fetchPaperPricesREST();renderPositionsPanelRealtime();}catch(_){}
},3000);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensurePaperRealtimeSubscriptions,{once:true});
else ensurePaperRealtimeSubscriptions();

})();
</script>

"""

AUDIT = """\
<script id="DVL_PAPER_REALTIME_MULTI_SYMBOL_AUDIT_MODULE_0762">
(function(){
"use strict";
window.DVL_PAPER_REALTIME_MULTI_SYMBOL_AUDIT_0762={run:function(){
  var bl=[];
  if(document.title.indexOf('0.762')<0)bl.push('01: title missing 0.762');
  if(document.body.innerHTML.indexOf('BETA 0.762')<0)bl.push('02: badge missing BETA 0.762');
  if(document.body.innerHTML.indexOf('Beta 0.762')<0)bl.push('03: changelog missing 0.762');
  if(!window.DVL_PAPER_REALTIME_ENGINE)bl.push('04: DVL_PAPER_REALTIME_ENGINE missing');
  if(!window.DVL_LAST_PRICE_BY_SYMBOL)bl.push('05: DVL_LAST_PRICE_BY_SYMBOL missing');
  if(typeof window.getPaperSymbolsToMonitor!=='function')bl.push('06: getPaperSymbolsToMonitor missing');
  if(typeof window.calcPaperPnl!=='function')bl.push('07: calcPaperPnl missing');
  if(!window.DVL_PAPER_TRADE_STORE)bl.push('07b: DVL_PAPER_TRADE_STORE missing');
  if(typeof window.DVL_POSITIONS_REFRESH!=='function')bl.push('08: DVL_POSITIONS_REFRESH missing');
  try{var syms=window.getPaperSymbolsToMonitor();if(!Array.isArray(syms))bl.push('07c: getPaperSymbolsToMonitor did not return array');}catch(e){bl.push('07c: getPaperSymbolsToMonitor threw');}
  if(typeof window.onPaperSymbolPrice!=='function')bl.push('11: onPaperSymbolPrice missing');
  if(typeof window.processPaperRealtimeTick!=='function')bl.push('12: processPaperRealtimeTick missing');
  if(typeof window.processPendingOrderRealtime!=='function')bl.push('13: processPendingOrderRealtime missing');
  if(typeof window.processOpenPositionRealtime!=='function')bl.push('14: processOpenPositionRealtime missing');
  try{if(!window.processPendingOrderRealtime({side:'buy',type:'limit',entry:1.0},0.99,Date.now()))bl.push('15: buy limit not triggered at price<=entry');}catch(e){bl.push('15: buy limit test error:'+e);}
  try{if(!window.processPendingOrderRealtime({side:'sell',type:'limit',entry:1.0},1.01,Date.now()))bl.push('16: sell limit not triggered at price>=entry');}catch(e){bl.push('16: sell limit test error');}
  try{if(!window.processPendingOrderRealtime({side:'buy',type:'stop',entry:1.0},1.01,Date.now()))bl.push('17: buy stop not triggered at price>=entry');}catch(e){bl.push('17: buy stop test error');}
  try{if(!window.processPendingOrderRealtime({side:'sell',type:'stop',entry:1.0},0.99,Date.now()))bl.push('18: sell stop not triggered at price<=entry');}catch(e){bl.push('18: sell stop test error');}
  try{var _hLong=false;var _ah=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aLTP')_hLong=true;};window.processOpenPositionRealtime({id:'_aLTP',side:'buy',entry:1.0,tp:1.1,sl:0.9,symbol:'TESTUSDT',qty:1},1.11,Date.now());window.addTradeToHistory=_ah;if(!_hLong)bl.push('19: long TP not fired');}catch(e){bl.push('19: long TP test error');}
  try{var _hLS=false;var _ah2=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aLSL')_hLS=true;};window.processOpenPositionRealtime({id:'_aLSL',side:'buy',entry:1.0,tp:1.1,sl:0.9,symbol:'TESTUSDT',qty:1},0.89,Date.now());window.addTradeToHistory=_ah2;if(!_hLS)bl.push('20: long SL not fired');}catch(e){bl.push('20: long SL test error');}
  try{var _hST=false;var _ah3=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aSTP')_hST=true;};window.processOpenPositionRealtime({id:'_aSTP',side:'sell',entry:1.0,tp:0.9,sl:1.1,symbol:'TESTUSDT',qty:1},0.89,Date.now());window.addTradeToHistory=_ah3;if(!_hST)bl.push('21: short TP not fired');}catch(e){bl.push('21: short TP test error');}
  try{var _hSS=false;var _ah4=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aSSL')_hSS=true;};window.processOpenPositionRealtime({id:'_aSSL',side:'sell',entry:1.0,tp:0.9,sl:1.1,symbol:'TESTUSDT',qty:1},1.11,Date.now());window.addTradeToHistory=_ah4;if(!_hSS)bl.push('22: short SL not fired');}catch(e){bl.push('22: short SL test error');}
  try{var pnl=window.calcPaperPnl({side:'buy',entry:100,qty:1},110);if(!pnl||Math.abs((pnl.pnl||0)-10)>0.001)bl.push('23: calcPaperPnl buy result incorrect');}catch(e){bl.push('23: calcPaperPnl test error');}
  try{var pnl2=window.calcPaperPnl({side:'sell',entry:100,qty:1},90);if(!pnl2||Math.abs((pnl2.pnl||0)-10)>0.001)bl.push('24: calcPaperPnl sell result incorrect');}catch(e){bl.push('24: calcPaperPnl sell test error');}
  if(!window.DVL_LAST_PRICE_BY_SYMBOL||typeof window.DVL_LAST_PRICE_BY_SYMBOL!=='object')bl.push('25: DVL_LAST_PRICE_BY_SYMBOL not an object');
  if(typeof window.closePaperTradeToHistory!=='function')bl.push('29: closePaperTradeToHistory missing');
  try{var _store=window.DVL_PAPER_TRADE_STORE;if(_store){var _th=_store.tradeHistory||[];var _ids={};var _dup=false;_th.forEach(function(t){if(t&&t.id){if(_ids[t.id])_dup=true;_ids[t.id]=true;}});if(_dup)bl.push('30: tradeHistory has duplicate ids');if(_store.tradeHistory&&_store.tradeHistory.length>100)bl.push('31: tradeHistory exceeds 100');}}catch(e){}
  if(!window.DVL_PAPER_REALTIME_ENGINE||!window.DVL_PAPER_REALTIME_ENGINE.version)bl.push('04b: engine version missing');
  else if(window.DVL_PAPER_REALTIME_ENGINE.version!=='0.762')bl.push('04c: engine version is not 0.762');
  if(!window.DVL_PAPER_TRADE_STORE||typeof window.DVL_PAPER_TRADE_STORE.pendingOrders==='undefined')bl.push('36: store.pendingOrders not accessible');
  if(!window.DVL_PAPER_TRADE_STORE||typeof window.DVL_PAPER_TRADE_STORE.openPositions==='undefined')bl.push('37: store.openPositions not accessible');
  if(typeof window.renderPositionsPanelRealtime!=='function')bl.push('38: renderPositionsPanelRealtime missing');
  return{pass:bl.length===0,blockers:bl,version:'0.762',checks:39};
}};
})();
</script>

"""

html = rep(html,
    '  updateOldLabels();\n  renderShell();\n})();\n</script>\n\n<script id="DVL_POSITION_DETAILS_PANEL_MODULE_0724">',
    '  updateOldLabels();\n  renderShell();\n})();\n</script>\n\n' + ENGINE + AUDIT + '<script id="DVL_POSITION_DETAILS_PANEL_MODULE_0724">',
    "insert realtime engine + audit modules")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
