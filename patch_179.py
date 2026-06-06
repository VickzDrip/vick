#!/usr/bin/env python3
"""patch_179.py — Beta 0.179: Paper Trading Engine — rewrite completo
Multi-posição, sem netting, overlay TV-style, drag TP/SL, botões flutuantes.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.178') >= 10, f'Beta 0.178 count={html.count("Beta 0.178")}'
html = html.replace('Beta 0.178', 'Beta 0.179')

# ── 1. Hook onTick: passar símbolo ────────────────────────────────────────────
OLD_TICK = "if(window.DVL_PAPER&&DVL_PAPER.enabled&&d&&d.p)DVL_PAPER.onTick(+d.p);"
assert OLD_TICK in html, 'onTick hook not found'
html = html.replace(OLD_TICK,
    "if(window.DVL_PAPER&&DVL_PAPER.enabled&&d&&d.p)DVL_PAPER.onTick(+d.p,d.s||'');", 1)

# ── 2. Hook onCandleClose: passar símbolo ─────────────────────────────────────
OLD_CANDLE = "if(window.DVL_PAPER&&DVL_PAPER.enabled)DVL_PAPER.onCandleClose(c);"
assert OLD_CANDLE in html, 'onCandleClose hook not found'
html = html.replace(OLD_CANDLE,
    "if(window.DVL_PAPER&&DVL_PAPER.enabled)DVL_PAPER.onCandleClose(c,window.S&&S.sym||'');", 1)

# ── 3. Substituir bloco completo do engine ────────────────────────────────────
OLD_START = ('<!-- ═════════════'
             '═════════════'
             '═════════════'
             '═════════════'
             '═══════════\n'
             '     DVL PAPER TRADING ENGINE — Beta 0.179')
OLD_END = ("if(document.readyState==='loading'){\n"
           "  document.addEventListener('DOMContentLoaded',function(){DVL_PAPER.init();});\n"
           "}else{\n"
           "  setTimeout(function(){DVL_PAPER.init();},200);\n"
           "}\n"
           "</script>")

assert OLD_START in html, 'engine start anchor not found'
assert OLD_END in html, 'engine end anchor not found'

idx_s = html.index(OLD_START)
idx_e = html.index(OLD_END) + len(OLD_END)

NEW_BLOCK = """\
<!-- DVL PAPER TRADING ENGINE — Beta 0.179 -->
<style id="dvlPaperCSS">
#dvlPaperPanel{position:fixed;right:0;top:50px;width:272px;background:#020508;border-left:1px solid #1a2636;border-bottom:1px solid #1a2636;z-index:190;display:none;flex-direction:column;max-height:calc(100vh - 50px);font-family:monospace;box-shadow:-4px 0 20px rgba(0,0,0,.7);}
#dvlPaperPanel.pp-open{display:flex;}
.pp-hdr{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #1a2636;flex-shrink:0;background:#030609;}
.pp-badge{font-size:8px;font-weight:900;letter-spacing:2px;color:#ff9f0a;background:rgba(255,159,10,.1);border:1px solid rgba(255,159,10,.35);border-radius:3px;padding:2px 5px;}
.pp-tabs{display:flex;border-bottom:1px solid #1a2636;flex-shrink:0;}
.pp-tab{flex:1;font-family:monospace;font-size:9px;color:#4a6580;background:none;border:none;border-bottom:2px solid transparent;padding:5px 2px;cursor:pointer;letter-spacing:.04em;}
.pp-tab.on{color:#00d4ff;border-bottom-color:#00d4ff;}
.pp-body{overflow-y:auto;flex:1;padding:8px 10px;scrollbar-width:thin;scrollbar-color:#1a2636 transparent;}
.pp-sec{margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #0a1018;}
.pp-sec:last-child{border-bottom:none;margin-bottom:0;}
.pp-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:10px;}
.pp-k{color:#4a6580;}.pp-v{color:#c8d8f0;}
.pp-v.pos{color:#00e676;}.pp-v.neg{color:#ff3d57;}.pp-v.neu{color:#ff9f0a;}
.pp-btns{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:6px 0;}
.pp-btn{font-family:monospace;font-size:10px;border-radius:3px;padding:8px 4px;cursor:pointer;border:1px solid;font-weight:700;letter-spacing:.03em;transition:opacity .1s;}
.pp-btn:hover{opacity:.8;}
.pp-btn.buy{background:rgba(0,200,90,.13);color:#00e676;border-color:rgba(0,200,90,.4);}
.pp-btn.sell{background:rgba(220,50,60,.13);color:#ff3d57;border-color:rgba(220,50,60,.4);}
.pp-btn.cls{background:rgba(255,159,10,.1);color:#ff9f0a;border-color:rgba(255,159,10,.3);grid-column:span 2;}
.pp-btn.cncl{background:rgba(74,101,128,.1);color:#6a8faf;border-color:rgba(74,101,128,.25);grid-column:span 2;font-size:9px;}
.pp-btn.rst{background:rgba(255,61,87,.06);color:#cc4455;border-color:rgba(255,61,87,.18);font-size:9px;}
.pp-btn.full{grid-column:span 2;}
.pp-inp-row{display:flex;align-items:center;justify-content:space-between;padding:2px 0;font-size:10px;gap:4px;}
.pp-lbl{color:#4a6580;flex-shrink:0;}
.pp-inp{background:#060810;border:1px solid #1a2636;color:#c8d8f0;border-radius:3px;padding:3px 5px;font-family:monospace;font-size:10px;width:88px;text-align:right;}
.pp-inp:focus{outline:none;border-color:#00d4ff;}
.pp-sel{background:#060810;border:1px solid #1a2636;color:#c8d8f0;border-radius:3px;padding:3px 4px;font-family:monospace;font-size:10px;}
.pp-pos-card{background:#060d18;border:1px solid #1a2636;border-radius:4px;padding:6px 8px;margin-bottom:5px;}
.pp-pos-side-L{color:#00e676;font-weight:700;}.pp-pos-side-S{color:#ff3d57;font-weight:700;}
.pp-ord-row{padding:3px 0;border-bottom:1px solid #080e18;font-size:9px;display:flex;justify-content:space-between;align-items:center;}
.pp-hist-row{padding:3px 0;border-bottom:1px solid #080e18;font-size:9px;}
.pp-stat-row{display:flex;justify-content:space-between;padding:2px 0;font-size:10px;}
.pp-stat-k{color:#4a6580;}.pp-stat-v{color:#c8d8f0;font-family:monospace;}
#dvlPaperNotif{position:fixed;bottom:38px;left:50%;transform:translateX(-50%);background:rgba(3,6,9,.96);border:1px solid rgba(255,159,10,.3);color:rgba(255,200,50,.9);font-size:10px;font-family:monospace;padding:5px 14px;border-radius:4px;pointer-events:none;opacity:0;transition:opacity .3s;z-index:9997;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.6);}
#ppQuickBtns{position:fixed;top:90px;left:4px;z-index:185;display:none;flex-direction:column;gap:3px;}
#ppQuickBtns.pp-qvis{display:flex;}
.pp-qrow{display:flex;gap:3px;}
.pp-qbtn{font-family:monospace;font-size:10px;font-weight:700;border-radius:3px;padding:5px 10px;cursor:pointer;border:1px solid;letter-spacing:.02em;white-space:nowrap;}
.pp-qbtn.buy{background:rgba(0,180,80,.18);color:#00e676;border-color:rgba(0,200,90,.5);}
.pp-qbtn.sell{background:rgba(200,40,50,.18);color:#ff3d57;border-color:rgba(220,60,60,.5);}
.pp-qctl{font-family:monospace;font-size:11px;background:rgba(10,20,40,.7);border:1px solid #1a2636;color:#5a7090;border-radius:3px;padding:4px 7px;cursor:pointer;}
.pp-qctl:hover{color:#c8d8f0;}
</style>

<div id="dvlPaperPanel">
  <div class="pp-hdr">
    <div style="display:flex;align-items:center;gap:6px;">
      <span class="pp-badge">PAPER</span>
      <span style="font-size:9px;color:#5a7090;letter-spacing:1px;">DVL Trading Sim</span>
    </div>
    <button style="background:none;border:none;color:#4a6580;cursor:pointer;font-size:14px;line-height:1;padding:2px 6px;" onclick="window.DVL_PAPER&&DVL_PAPER.togglePanel()">x</button>
  </div>
  <div class="pp-tabs">
    <button class="pp-tab on" id="ppT_trade" onclick="DVL_PAPER.setTab('trade')">Trade</button>
    <button class="pp-tab" id="ppT_pos"   onclick="DVL_PAPER.setTab('pos')">Positions</button>
    <button class="pp-tab" id="ppT_hist"  onclick="DVL_PAPER.setTab('hist')">History</button>
    <button class="pp-tab" id="ppT_stats" onclick="DVL_PAPER.setTab('stats')">Stats</button>
  </div>
  <div class="pp-body" id="ppBody"></div>
</div>

<div id="ppQuickBtns">
  <div class="pp-qrow">
    <button class="pp-qbtn buy" id="ppQBuy"  onclick="window.DVL_PAPER&&DVL_PAPER._quickOrder('buy')">Buy Market</button>
    <button class="pp-qbtn sell" id="ppQSell" onclick="window.DVL_PAPER&&DVL_PAPER._quickOrder('sell')">Sell Market</button>
  </div>
  <div class="pp-qrow">
    <button class="pp-qctl" id="ppQEye"  onclick="window.DVL_PAPER&&DVL_PAPER._toggleQuick()" title="Hide buttons">o</button>
    <button class="pp-qctl" onclick="window.DVL_PAPER&&DVL_PAPER.togglePanel()" title="Settings">s</button>
  </div>
</div>
<div id="dvlPaperNotif"></div>

<script>
window.DVL_PAPER=(function(){
'use strict';
var SK='dvl_paper_v2';
var _tab='trade';
var _renderTimer=null;
var _drag=null;
var _scRef=null;
var _drawCache=[];

var DEF_ACC={balance:10000,initialBalance:10000,realizedPnl:0,currency:'USDT'};
var DEF_SET={
  leverage:1,feePct:0.05,slippagePct:0.02,
  riskMode:'percent',riskPct:1,fixedSize:0.001,
  intrabarMode:'conservative',
  autoSLTP:true,autoRR:1.0,autoSLMode:'atr',
  autoSLAtrMult:1.0,autoSLPct:0.25,
  orderType:'market'
};

var ST={
  enabled:false,
  account:null,
  positions:[],
  pendingOrders:[],
  history:[],
  settings:null,
  lastPriceBySymbol:{},
  quickVisible:true
};

var _uidN=1;
function _uid(){return 'pt'+(Date.now()%1e9)+'_'+(++_uidN);}

function _sym(){return window.S?S.sym:'?';}
function _price(sym){
  sym=sym||_sym();
  if(ST.lastPriceBySymbol[sym])return ST.lastPriceBySymbol[sym];
  if(window.S&&S.sym===sym&&S.candles&&S.candles.length)return S.candles[S.candles.length-1].c;
  return null;
}

function _save(){
  try{localStorage.setItem(SK,JSON.stringify({
    enabled:ST.enabled,account:ST.account,positions:ST.positions,
    pendingOrders:ST.pendingOrders,history:ST.history,settings:ST.settings,
    lastPriceBySymbol:ST.lastPriceBySymbol,quickVisible:ST.quickVisible
  }));}catch(e){}
}
function _load(){
  try{
    var d=localStorage.getItem(SK);
    if(d){d=JSON.parse(d);
      ST.enabled=!!d.enabled;
      ST.account=Object.assign({},DEF_ACC,d.account||{});
      ST.positions=d.positions||[];
      ST.pendingOrders=d.pendingOrders||[];
      ST.history=d.history||[];
      ST.settings=Object.assign({},DEF_SET,d.settings||{});
      ST.lastPriceBySymbol=d.lastPriceBySymbol||{};
      ST.quickVisible=d.quickVisible!==false;
      return;
    }
  }catch(e){}
  _initDefault();
}
function _initDefault(){
  ST.account=Object.assign({},DEF_ACC);
  ST.positions=[];ST.pendingOrders=[];ST.history=[];
  ST.settings=Object.assign({},DEF_SET);
  ST.lastPriceBySymbol={};ST.quickVisible=true;
}

function _upnl(pos){
  var px=_price(pos.symbol);if(!px)return 0;
  return pos.side==='long'?(px-pos.entryPrice)*pos.qty:(pos.entryPrice-px)*pos.qty;
}
function _equity(){
  return ST.account.balance+ST.positions.reduce(function(s,p){return s+(p.unrealizedPnl||0);},0);
}
function _liqPrice(pos){
  var lev=pos.leverage||1;
  return pos.side==='long'?pos.entryPrice*(1-1/lev+0.005):pos.entryPrice*(1+1/lev-0.005);
}
function _applySlip(price,side){
  var s=ST.settings.slippagePct/100;
  return side==='buy'?price*(1+s):price*(1-s);
}
function _fee(notional){return notional*ST.settings.feePct/100;}

function _getATR(){
  if(!window.S||!S.candles||S.candles.length<14)return null;
  var cs=S.candles.slice(-14);
  var trs=cs.map(function(c,i){
    if(!i)return c.h-c.l;
    var p=cs[i-1];
    return Math.max(c.h-c.l,Math.abs(c.h-p.c),Math.abs(c.l-p.c));
  });
  return trs.reduce(function(a,b){return a+b;},0)/trs.length;
}

function _autoSLTP(side,entry){
  var set=ST.settings;
  var dist;
  if(set.autoSLMode==='atr'){var atr=_getATR();dist=atr?atr*set.autoSLAtrMult:entry*set.autoSLPct/100;}
  else{dist=entry*set.autoSLPct/100;}
  dist=Math.max(dist,entry*0.001);
  var sl,tp;
  if(side==='long'){sl=entry-dist;tp=entry+dist*set.autoRR;}
  else{sl=entry+dist;tp=entry-dist*set.autoRR;}
  return{sl:sl,tp:tp};
}

function _autoQty(price,sl){
  var set=ST.settings;
  if(set.riskMode==='percent'&&sl!=null&&sl!==0){
    var risk=ST.account.balance*set.riskPct/100;
    var rpu=Math.abs(price-sl);
    if(rpu>0)return risk/rpu;
  }
  return set.fixedSize||0.001;
}

function _f(n,d){if(n==null||isNaN(n))return '—';d=d!=null?d:2;return (n<0?'-':'')+Math.abs(n).toFixed(d);}
function _fp(n){if(n==null||isNaN(n))return '—';return (n>0?'+':'')+n.toFixed(2);}
function _fPct(n){return n!=null?(n>0?'+':'')+n.toFixed(2)+'%':'—';}
function _pnlCls(n){return n>0?'pos':n<0?'neg':'';}

function _notif(msg){
  var el=document.getElementById('dvlPaperNotif');if(!el)return;
  el.textContent=msg;el.style.opacity='1';
  clearTimeout(el._t);el._t=setTimeout(function(){el.style.opacity='0';},3500);
}

/* ── ORDERS ── */
function placeOrder(p){
  if(!ST.enabled){_notif('Paper Trading not active');return null;}
  var px=_price();if(!px){_notif('No price available');return null;}
  var side=p.side||'buy',type=p.type||'market';
  var sl=p.sl||null,tp=p.tp||null;
  if(!sl&&!tp&&ST.settings.autoSLTP){
    var auto=_autoSLTP(side==='buy'?'long':'short',p.price||px);
    sl=auto.sl;tp=auto.tp;
  }
  var qty=p.qty&&p.qty>0?p.qty:_autoQty(p.price||px,sl);
  if(qty<=0){_notif('Invalid qty');return null;}
  var ord={
    id:_uid(),symbol:_sym(),side:side,type:type,qty:qty,
    price:p.price||null,triggerPrice:p.triggerPrice||null,
    sl:sl,tp:tp,status:'pending',createdAt:Date.now()
  };
  if(type==='market')return _execMarket(ord,px);
  ST.pendingOrders.push(ord);_save();_render();
  _notif((side==='buy'?'Buy':'Sell')+' '+type+' @ '+_f(ord.price));
  return ord;
}

function _execMarket(ord,px){
  px=px||_price();if(!px)return null;
  var fill=_applySlip(px,ord.side);
  var notional=fill*ord.qty;
  var fee=_fee(notional);
  var side=ord.side==='buy'?'long':'short';
  var pos=_doOpen({symbol:ord.symbol,side:side,entryPrice:fill,qty:ord.qty,fee:fee,sl:ord.sl,tp:ord.tp});
  _save();_render();if(window.drawSoon)drawSoon();
  _notif((side==='long'?'Long':'Short')+' @ '+_f(fill,4)+'  qty='+ord.qty.toFixed(4));
  return ord;
}

function _doOpen(p){
  var set=ST.settings;
  var notional=p.entryPrice*p.qty;
  var margin=notional/(set.leverage||1);
  var fee=p.fee||_fee(notional);
  ST.account.balance-=fee;
  var pos={
    id:_uid(),symbol:p.symbol||_sym(),
    side:p.side,entryPrice:p.entryPrice,qty:p.qty,
    notional:notional,leverage:set.leverage||1,margin:margin,
    stopLoss:p.sl||null,takeProfit:p.tp||null,
    openFee:fee,unrealizedPnl:0,realizedPnl:0,roe:0,
    openedAt:Date.now(),status:'open'
  };
  pos.liquidationPrice=_liqPrice(pos);
  ST.positions.push(pos);
  return pos;
}

function _doClose(posId,reason,exitPx){
  var idx=ST.positions.findIndex(function(p){return p.id===posId;});
  if(idx<0)return null;
  var pos=ST.positions[idx];
  exitPx=exitPx||_price(pos.symbol);if(!exitPx)return null;
  var gross=pos.side==='long'?(exitPx-pos.entryPrice)*pos.qty:(pos.entryPrice-exitPx)*pos.qty;
  var closeFee=_fee(exitPx*pos.qty);
  var net=gross-closeFee-(pos.openFee||0);
  var roe=pos.margin>0?net/pos.margin*100:0;
  var trade={
    id:_uid(),symbol:pos.symbol,side:pos.side,
    entryPrice:pos.entryPrice,exitPrice:exitPx,qty:pos.qty,
    fee:closeFee+(pos.openFee||0),grossPnl:gross,netPnl:net,roe:roe,
    openedAt:pos.openedAt,closedAt:Date.now(),
    duration:Date.now()-pos.openedAt,reason:reason||'manual'
  };
  ST.history.push(trade);
  ST.account.balance+=net;
  ST.account.realizedPnl+=net;
  ST.positions.splice(idx,1);
  _save();_render();if(window.drawSoon)drawSoon();
  var s=net>=0?'+':'';
  _notif((reason==='tp'?'Take Profit':reason==='sl'?'Stop Loss':reason==='liq'?'Liquidated':'Closed')+
    '  '+s+_f(net)+' USDT  ROE '+_fPct(roe));
  return trade;
}

function cancelOrder(id){
  var i=ST.pendingOrders.findIndex(function(o){return o.id===id;});
  if(i>=0){ST.pendingOrders.splice(i,1);_save();_render();}
}

function updateStops(posId,p){
  var pos=ST.positions.find(function(x){return x.id===posId;});
  if(!pos)return;
  if(p.sl!==undefined)pos.stopLoss=p.sl;
  if(p.tp!==undefined)pos.takeProfit=p.tp;
  _save();_render();if(window.drawSoon)drawSoon();
}

/* ── TICK & CANDLE ── */
function onTick(price,sym){
  sym=sym||_sym();
  ST.lastPriceBySymbol[sym]=price;
  var changed=false;
  for(var i=ST.positions.length-1;i>=0;i--){
    var pos=ST.positions[i];
    if(pos.symbol!==sym)continue;
    pos.unrealizedPnl=_upnl(pos);
    pos.roe=pos.margin>0?pos.unrealizedPnl/pos.margin*100:0;
    if(pos.liquidationPrice){
      var liqHit=pos.side==='long'?price<=pos.liquidationPrice:price>=pos.liquidationPrice;
      if(liqHit){_doClose(pos.id,'liq',pos.liquidationPrice);continue;}
    }
    changed=true;
  }
  if(changed&&!_renderTimer)_renderTimer=setTimeout(function(){_renderTimer=null;_renderLive();},200);
}

function onCandleClose(c,sym){
  sym=sym||_sym();
  for(var i=ST.pendingOrders.length-1;i>=0;i--){
    var o=ST.pendingOrders[i];
    if(o.symbol!==sym)continue;
    var hit=false;
    if(o.type==='limit')hit=(o.side==='buy'&&c.l<=o.price)||(o.side==='sell'&&c.h>=o.price);
    else if(o.type==='stop')hit=(o.side==='buy'&&c.h>=(o.triggerPrice||o.price))||(o.side==='sell'&&c.l<=(o.triggerPrice||o.price));
    if(hit){ST.pendingOrders.splice(i,1);_execMarket(Object.assign({},o,{type:'market'}),o.price||(o.triggerPrice||c.c));}
  }
  var poss=ST.positions.filter(function(p){return p.symbol===sym&&p.status==='open';});
  for(var j=0;j<poss.length;j++){
    var pos=poss[j];
    var sl=pos.stopLoss,tp=pos.takeProfit;
    var hitSL=sl!=null&&(pos.side==='long'?c.l<=sl:c.h>=sl);
    var hitTP=tp!=null&&(pos.side==='long'?c.h>=tp:c.l<=tp);
    if(hitSL&&hitTP){
      var mode=ST.settings.intrabarMode;
      if(mode==='optimistic')_doClose(pos.id,'tp',tp);
      else if(mode==='closeBased'){var cp=pos.side==='long'?(c.c-pos.entryPrice)*pos.qty:(pos.entryPrice-c.c)*pos.qty;_doClose(pos.id,cp>=0?'tp':'sl',cp>=0?tp:sl);}
      else _doClose(pos.id,'sl',sl);
    } else if(hitSL)_doClose(pos.id,'sl',sl);
    else if(hitTP)_doClose(pos.id,'tp',tp);
  }
}

/* ── STATS ── */
function calcStats(){
  var h=ST.history;
  if(!h.length)return{totalTrades:0,wins:0,losses:0,winrate:'—',totalPnl:0,avgWin:0,avgLoss:0,profitFactor:'—',maxDD:'—',best:0,worst:0};
  var wins=h.filter(function(t){return t.netPnl>0;}),loss=h.filter(function(t){return t.netPnl<=0;});
  var gW=wins.reduce(function(s,t){return s+t.netPnl;},0);
  var gL=Math.abs(loss.reduce(function(s,t){return s+t.netPnl;},0));
  var bal=ST.account.initialBalance,pk=bal,maxDD=0;
  h.forEach(function(t){bal+=t.netPnl;if(bal>pk)pk=bal;var dd=(pk-bal)/pk*100;if(dd>maxDD)maxDD=dd;});
  return{
    totalTrades:h.length,wins:wins.length,losses:loss.length,
    winrate:(wins.length/h.length*100).toFixed(1)+'%',
    totalPnl:h.reduce(function(s,t){return s+t.netPnl;},0),
    avgWin:wins.length?gW/wins.length:0,
    avgLoss:loss.length?gL/loss.length:0,
    profitFactor:gL>0?(gW/gL).toFixed(2):'∞',
    maxDD:maxDD.toFixed(2)+'%',
    best:h.reduce(function(b,t){return t.netPnl>b?t.netPnl:b;},-Infinity),
    worst:h.reduce(function(w,t){return t.netPnl<w?t.netPnl:w;},Infinity)
  };
}

/* ── CANVAS OVERLAY (TV-style) ── */
function drawOverlay(ctx,W,H,sc,lastPrice,bwPx){
  var sym=_sym();
  var positions=ST.positions.filter(function(p){return p.symbol===sym;});
  var orders=ST.pendingOrders.filter(function(o){return o.symbol===sym;});
  if(!positions.length&&!orders.length)return;
  var rp=typeof RP==='function'?RP():68;
  var xR=W-rp-2;
  _drawCache=[];

  /* Update scale ref for drag */
  if(positions.length){
    var _rp0=positions[0].entryPrice;
    var _ry0=sc.y(_rp0);
    var _rp1=_rp0*1.001;
    var _ry1=sc.y(_rp1);
    if(_ry1!==_ry0)_scRef={refY:_ry0,refP:_rp0,dpDy:(_rp1-_rp0)/(_ry1-_ry0)};
  }

  ctx.save();
  ctx.font='bold 9px monospace';

  positions.forEach(function(pos){
    var px=_price(sym)||pos.entryPrice;
    var yE=sc.y(pos.entryPrice);
    var ySL=pos.stopLoss!=null?sc.y(pos.stopLoss):null;
    var yTP=pos.takeProfit!=null?sc.y(pos.takeProfit):null;
    var isLong=pos.side==='long';
    var upnl=pos.unrealizedPnl||_upnl(pos);

    /* estimated PNL at TP/SL */
    var feeRate=ST.settings.feePct/100;
    var estTP=pos.takeProfit!=null?(isLong?(pos.takeProfit-pos.entryPrice)*pos.qty:(pos.entryPrice-pos.takeProfit)*pos.qty)-(pos.takeProfit*pos.qty*feeRate)-(pos.openFee||0):null;
    var estSL=pos.stopLoss!=null?(isLong?(pos.stopLoss-pos.entryPrice)*pos.qty:(pos.entryPrice-pos.stopLoss)*pos.qty)-(pos.stopLoss*pos.qty*feeRate)-(pos.openFee||0):null;

    /* fill areas */
    if(yTP!=null){
      var tpTop=isLong?yTP:yE,tpBot=isLong?yE:yTP;
      if(tpBot>tpTop){ctx.fillStyle='rgba(0,210,100,.07)';ctx.fillRect(0,tpTop,xR,tpBot-tpTop);}
    }
    if(ySL!=null){
      var slTop=isLong?yE:ySL,slBot=isLong?ySL:yE;
      if(slBot>slTop){ctx.fillStyle='rgba(220,60,40,.07)';ctx.fillRect(0,slTop,xR,slBot-slTop);}
    }

    /* TP line */
    if(yTP!=null&&yTP>=-10&&yTP<=H+10){
      ctx.lineWidth=1;ctx.setLineDash([]);
      ctx.strokeStyle='rgba(0,200,100,.75)';
      ctx.beginPath();ctx.moveTo(0,yTP);ctx.lineTo(xR,yTP);ctx.stroke();
      var tpTxt=pos.qty.toFixed(3)+(estTP!=null?'  '+_fp(estTP)+' USDT':'  TP');
      _drawLineLabel(ctx,xR,yTP,'rgba(0,30,20,.85)','rgba(0,200,100,1)',tpTxt,pos.id,'tp',false);
    }

    /* SL line */
    if(ySL!=null&&ySL>=-10&&ySL<=H+10){
      ctx.lineWidth=1;ctx.setLineDash([]);
      ctx.strokeStyle='rgba(220,80,50,.75)';
      ctx.beginPath();ctx.moveTo(0,ySL);ctx.lineTo(xR,ySL);ctx.stroke();
      var slTxt=pos.qty.toFixed(3)+(estSL!=null?'  '+_fp(estSL)+' USDT':'  SL');
      _drawLineLabel(ctx,xR,ySL,'rgba(30,10,5,.85)','rgba(220,100,70,1)',slTxt,pos.id,'sl',false);
    }

    /* Entry line */
    if(yE>=-10&&yE<=H+10){
      ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
      ctx.strokeStyle='rgba(80,160,255,.75)';
      ctx.beginPath();ctx.moveTo(0,yE);ctx.lineTo(xR,yE);ctx.stroke();
      ctx.setLineDash([]);
      var eTxt=(isLong?'L ':'S ')+pos.qty.toFixed(3)+'  '+_fp(upnl)+' USDT  '+_fPct(pos.roe||0);
      _drawLineLabel(ctx,xR,yE,'rgba(5,20,50,.9)','rgba(80,160,255,1)',eTxt,pos.id,'entry',true);
    }
  });

  /* pending orders */
  orders.forEach(function(o){
    if(!o.price)return;
    var yO=sc.y(o.price);if(yO<-10||yO>H+10)return;
    var col=o.side==='buy'?'rgba(0,200,100,.5)':'rgba(200,60,40,.5)';
    ctx.lineWidth=1;ctx.strokeStyle=col;ctx.setLineDash([2,4]);
    ctx.beginPath();ctx.moveTo(0,yO);ctx.lineTo(xR,yO);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=col.replace('.5','.85');ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillText((o.side==='buy'?'Buy':'Sell')+' '+o.type+' '+_f(o.price,4),6,yO-3);
  });

  ctx.restore();
}

function _drawLineLabel(ctx,xR,y,bgColor,borderColor,text,posId,field,hasClose){
  ctx.font='bold 9px monospace';
  ctx.textBaseline='alphabetic';
  var tw=ctx.measureText(text).width;
  var closeW=hasClose?18:0;
  var lw=tw+10+closeW,lh=15;
  var lx=xR-lw-4,ly=y-lh/2;
  ctx.fillStyle=bgColor;ctx.fillRect(lx,ly,lw,lh);
  ctx.fillStyle=borderColor;ctx.fillRect(lx,ly,2,lh);
  ctx.fillStyle=borderColor;ctx.textAlign='left';
  ctx.fillText(text,lx+5,ly+lh-3);
  if(hasClose){
    ctx.fillStyle='rgba(200,100,50,.85)';
    ctx.fillText('x',lx+lw-14,ly+lh-3);
  }
  _drawCache.push({x:lx,y:ly,w:lw,h:lh,posId:posId,field:field,hasClose:hasClose,lineY:y});
}

/* ── DRAG TP/SL ── */
function _initDrag(canvas){
  function _getY(e){
    var t=e.touches?e.touches[0]:e;
    var r=canvas.getBoundingClientRect();
    return t.clientY-r.top;
  }
  function _getX(e){
    var t=e.touches?e.touches[0]:e;
    var r=canvas.getBoundingClientRect();
    return t.clientX-r.left;
  }
  function _start(e){
    if(!ST.enabled||!_scRef)return;
    var cy=_getY(e),cx=_getX(e);
    /* check close buttons first */
    for(var i=0;i<_drawCache.length;i++){
      var b=_drawCache[i];
      if(b.hasClose&&cx>=b.x+b.w-18&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){
        e.preventDefault();_doClose(b.posId,'manual');return;
      }
    }
    /* check drag handles for TP/SL */
    for(var j=0;j<_drawCache.length;j++){
      var bb=_drawCache[j];
      if((bb.field==='tp'||bb.field==='sl')&&Math.abs(cy-bb.lineY)<=10){
        e.preventDefault();
        _drag={posId:bb.posId,field:bb.field,startY:cy};
        return;
      }
    }
  }
  function _move(e){
    if(!_drag||!_scRef)return;
    e.preventDefault();
    var cy=_getY(e);
    var newPrice=_scRef.refP+(cy-_scRef.refY)*_scRef.dpDy;
    var pos=ST.positions.find(function(p){return p.id===_drag.posId;});
    if(!pos)return;
    if(_drag.field==='tp')pos.takeProfit=newPrice;
    else pos.stopLoss=newPrice;
    if(window.drawSoon)drawSoon();
  }
  function _end(){
    if(!_drag)return;
    _save();_drag=null;
  }
  canvas.addEventListener('mousedown',_start);
  canvas.addEventListener('mousemove',_move);
  canvas.addEventListener('mouseup',_end);
  canvas.addEventListener('touchstart',_start,{passive:false});
  canvas.addEventListener('touchmove',_move,{passive:false});
  canvas.addEventListener('touchend',_end);
}

/* ── PANEL RENDER ── */
function _render(){
  var body=document.getElementById('ppBody');if(!body)return;
  ['trade','pos','hist','stats'].forEach(function(t){
    var el=document.getElementById('ppT_'+t);
    if(el)el.className='pp-tab'+(t===_tab?' on':'');
  });
  if(_tab==='trade')body.innerHTML=_renderTrade();
  else if(_tab==='pos')body.innerHTML=_renderPos();
  else if(_tab==='hist')body.innerHTML=_renderHist();
  else body.innerHTML=_renderStats();
}

function _renderLive(){
  if(_tab==='trade'||_tab==='pos'){
    var body=document.getElementById('ppBody');if(!body)return;
    if(_tab==='trade')body.innerHTML=_renderTrade();
    else body.innerHTML=_renderPos();
  }
}

function _orderTypeLbl(){
  var t=(ST.settings&&ST.settings.orderType)||'market';
  return t.charAt(0).toUpperCase()+t.slice(1);
}

function _renderTrade(){
  var acc=ST.account,set=ST.settings;
  var eq=_equity(),upnlTotal=ST.positions.reduce(function(s,p){return s+(p.unrealizedPnl||0);},0);
  var h='<div class="pp-sec">';
  h+='<div class="pp-row"><span class="pp-k">Balance</span><span class="pp-v">'+_f(acc.balance)+' USDT</span></div>';
  h+='<div class="pp-row"><span class="pp-k">Equity</span><span class="pp-v '+_pnlCls(eq-acc.initialBalance)+'">'+_f(eq)+' USDT</span></div>';
  h+='<div class="pp-row"><span class="pp-k">Unrealized PNL</span><span class="pp-v '+_pnlCls(upnlTotal)+'">'+_fp(upnlTotal)+' USDT</span></div>';
  h+='<div class="pp-row"><span class="pp-k">Realized PNL</span><span class="pp-v '+_pnlCls(acc.realizedPnl)+'">'+_fp(acc.realizedPnl)+' USDT</span></div>';
  h+='</div><div class="pp-sec">';
  var lbl=_orderTypeLbl();
  h+='<div class="pp-inp-row"><span class="pp-lbl">Order Type</span>';
  h+='<select class="pp-sel" id="ppOrderType" onchange="DVL_PAPER._onTypeChange(this.value)">';
  ['market','limit','stop'].forEach(function(t){
    h+='<option value="'+t+'"'+(set.orderType===t?' selected':'')+'>'+t.charAt(0).toUpperCase()+t.slice(1)+'</option>';
  });
  h+='</select></div>';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Risk %</span><input class="pp-inp" id="ppRiskPct" type="number" min="0.1" max="100" step="0.1" value="'+set.riskPct+'"></div>';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Manual Qty</span><input class="pp-inp" id="ppQty" type="number" min="0" step="0.0001" placeholder="auto"></div>';
  if(set.orderType!=='market'){
    h+='<div class="pp-inp-row"><span class="pp-lbl">Limit/Stop Price</span><input class="pp-inp" id="ppLimitPx" type="number" step="0.01" placeholder="current"></div>';
  }
  h+='<div class="pp-inp-row"><span class="pp-lbl">Stop Loss</span><input class="pp-inp" id="ppSL" type="number" step="0.01" placeholder="auto"></div>';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Take Profit</span><input class="pp-inp" id="ppTP" type="number" step="0.01" placeholder="auto"></div>';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Leverage</span><input class="pp-inp" id="ppLev" type="number" min="1" max="125" step="1" value="'+set.leverage+'"></div>';
  h+='<div class="pp-btns">';
  h+='<button class="pp-btn buy" id="ppBuyBtn" onclick="DVL_PAPER._submitOrder(\'buy\')">Buy '+lbl+'</button>';
  h+='<button class="pp-btn sell" id="ppSellBtn" onclick="DVL_PAPER._submitOrder(\'sell\')">Sell '+lbl+'</button>';
  if(ST.pendingOrders.filter(function(o){return o.symbol===_sym();}).length){
    h+='<button class="pp-btn cncl full" onclick="DVL_PAPER._cancelAll()">Cancel All Orders</button>';
  }
  h+='</div></div>';
  h+='<div class="pp-sec">';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Fee %</span><input class="pp-inp" id="ppFee" type="number" min="0" max="1" step="0.01" value="'+set.feePct+'"></div>';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Slippage %</span><input class="pp-inp" id="ppSlip" type="number" min="0" max="1" step="0.01" value="'+set.slippagePct+'"></div>';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Intrabar Mode</span>';
  h+='<select class="pp-sel" id="ppIntrabar">';
  ['conservative','optimistic','closeBased'].forEach(function(m){
    h+='<option value="'+m+'"'+(set.intrabarMode===m?' selected':'')+'>'+m+'</option>';
  });
  h+='</select></div>';
  h+='<div class="pp-inp-row"><span class="pp-lbl">Auto SL/TP</span>';
  h+='<select class="pp-sel" id="ppAutoSLTP"><option value="1"'+(set.autoSLTP?' selected':'')+'>On</option><option value="0"'+(!set.autoSLTP?' selected':'')+'>Off</option></select></div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px;">';
  h+='<button class="pp-btn rst" onclick="DVL_PAPER._resetConfirm()">Reset Account</button>';
  h+='</div></div>';
  return h;
}

function _renderPos(){
  var sym=_sym();
  var symPos=ST.positions.filter(function(p){return p.symbol===sym;});
  var h='';
  /* account summary */
  h+='<div class="pp-sec">';
  h+='<div class="pp-row"><span class="pp-k">Balance</span><span class="pp-v">'+_f(ST.account.balance)+' USDT</span></div>';
  h+='<div class="pp-row"><span class="pp-k">Equity</span><span class="pp-v">'+_f(_equity())+' USDT</span></div>';
  h+='</div>';
  if(!symPos.length){
    h+='<div style="color:#4a6580;font-size:10px;text-align:center;padding:12px 0;">No open positions for '+sym+'</div>';
  } else {
    symPos.forEach(function(pos){
      var upnl=pos.unrealizedPnl||0;
      var sideClass=pos.side==='long'?'pp-pos-side-L':'pp-pos-side-S';
      h+='<div class="pp-pos-card">';
      h+='<div class="pp-row"><span class="'+sideClass+'">'+(pos.side==='long'?'LONG':'SHORT')+'</span>';
      h+='<span class="pp-v '+_pnlCls(upnl)+'" style="font-size:11px;font-weight:700;">'+_fp(upnl)+' USDT  '+_fPct(pos.roe||0)+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Entry</span><span class="pp-v">'+_f(pos.entryPrice,4)+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Qty / Notional</span><span class="pp-v">'+pos.qty.toFixed(4)+'  /  '+_f(pos.notional)+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Liq.</span><span class="pp-v neg">'+_f(pos.liquidationPrice,4)+'</span></div>';
      h+='<div class="pp-inp-row" style="margin-top:4px;"><span class="pp-lbl">SL</span><input class="pp-inp" id="ppSL_'+pos.id+'" type="number" step="0.01" value="'+(pos.stopLoss||'')+'"></div>';
      h+='<div class="pp-inp-row"><span class="pp-lbl">TP</span><input class="pp-inp" id="ppTP_'+pos.id+'" type="number" step="0.01" value="'+(pos.takeProfit||'')+'"></div>';
      h+='<div class="pp-btns" style="margin-top:4px;">';
      h+='<button class="pp-btn buy" onclick="DVL_PAPER._updateStopsFromUI(\''+pos.id+'\')">Save SL/TP</button>';
      h+='<button class="pp-btn sell" onclick="DVL_PAPER._closePos(\''+pos.id+'\')">Close</button>';
      h+='</div></div>';
    });
  }
  /* pending */
  var symOrd=ST.pendingOrders.filter(function(o){return o.symbol===sym;});
  if(symOrd.length){
    h+='<div class="pp-sec" style="margin-top:8px;">';
    h+='<div style="font-size:8px;color:#4a6580;letter-spacing:.1em;margin-bottom:4px;">PENDING ORDERS</div>';
    symOrd.forEach(function(o){
      h+='<div class="pp-ord-row">';
      h+='<span style="color:'+(o.side==='buy'?'#00e676':'#ff3d57')+'">'+o.side.toUpperCase()+' '+o.type+'</span>';
      h+='<span style="color:#c8d8f0">'+_f(o.price,4)+'</span>';
      h+='<span style="color:#ff3d57;cursor:pointer;padding:0 4px;" onclick="DVL_PAPER.cancelOrder(\''+o.id+'\')">x</span>';
      h+='</div>';
    });
    h+='</div>';
  }
  return h;
}

function _renderHist(){
  var h='<div class="pp-sec">';
  if(!ST.history.length){
    return h+'<div style="color:#4a6580;font-size:10px;text-align:center;padding:16px 0;">No closed trades</div></div>';
  }
  ST.history.slice().reverse().slice(0,30).forEach(function(t){
    var dur=Math.round(t.duration/1000);
    var ds=dur>3600?Math.floor(dur/3600)+'h':dur>60?Math.floor(dur/60)+'m':dur+'s';
    h+='<div class="pp-hist-row">';
    h+='<div style="display:flex;justify-content:space-between;">';
    h+='<span style="color:'+(t.side==='long'?'#00e676':'#ff3d57')+'">'+t.symbol+' '+(t.side==='long'?'L':'S')+'</span>';
    h+='<span class="pp-v '+_pnlCls(t.netPnl)+'">'+_fp(t.netPnl)+' USDT</span></div>';
    h+='<div style="display:flex;justify-content:space-between;color:#4a6580;font-size:8px;margin-top:1px;">';
    h+='<span>'+_f(t.entryPrice,4)+' → '+_f(t.exitPrice,4)+'</span>';
    h+='<span>'+t.reason.toUpperCase()+'  '+ds+'</span></div></div>';
  });
  return h+'</div>';
}

function _renderStats(){
  var s=calcStats();
  var h='<div class="pp-sec">';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Total Trades</span><span class="pp-stat-v">'+s.totalTrades+'</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Wins / Losses</span><span class="pp-stat-v"><span style="color:#00e676">'+s.wins+'</span> / <span style="color:#ff3d57">'+s.losses+'</span></span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Winrate</span><span class="pp-stat-v '+(parseFloat(s.winrate)>=50?'pos':'neg')+'">'+s.winrate+'</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Net PNL</span><span class="pp-stat-v '+_pnlCls(s.totalPnl)+'">'+_fp(s.totalPnl)+' USDT</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Avg Win</span><span class="pp-stat-v pos">'+_f(s.avgWin)+'</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Avg Loss</span><span class="pp-stat-v neg">'+_f(s.avgLoss)+'</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Profit Factor</span><span class="pp-stat-v">'+s.profitFactor+'</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Max Drawdown</span><span class="pp-stat-v neg">'+s.maxDD+'</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Best Trade</span><span class="pp-stat-v pos">'+_fp(s.best)+' USDT</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Worst Trade</span><span class="pp-stat-v neg">'+_fp(s.worst)+' USDT</span></div>';
  h+='</div><div class="pp-sec">';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Initial Balance</span><span class="pp-stat-v">'+_f(ST.account.initialBalance)+' USDT</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Current Balance</span><span class="pp-stat-v">'+_f(ST.account.balance)+' USDT</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Realized PNL</span><span class="pp-stat-v '+_pnlCls(ST.account.realizedPnl)+'">'+_fp(ST.account.realizedPnl)+' USDT</span></div>';
  h+='<div class="pp-stat-row"><span class="pp-stat-k">Open Positions</span><span class="pp-stat-v">'+ST.positions.length+'</span></div>';
  h+='</div>';
  return h;
}

/* ── UI helpers ── */
function _getInput(id){var el=document.getElementById(id);return el?el.value.trim():null;}
function _getNum(id,fallback){var v=parseFloat(_getInput(id));return isNaN(v)?fallback:v;}

function _saveSettings(){
  var set=ST.settings;
  var rp=_getNum('ppRiskPct',set.riskPct);if(!isNaN(rp))set.riskPct=rp;
  var lev=_getNum('ppLev',set.leverage);if(!isNaN(lev))set.leverage=Math.max(1,lev);
  var fee=_getNum('ppFee',set.feePct);if(!isNaN(fee))set.feePct=fee;
  var slip=_getNum('ppSlip',set.slippagePct);if(!isNaN(slip))set.slippagePct=slip;
  var ib=_getInput('ppIntrabar');if(ib)set.intrabarMode=ib;
  var asl=_getInput('ppAutoSLTP');if(asl)set.autoSLTP=asl==='1';
  var ot=_getInput('ppOrderType');if(ot)set.orderType=ot;
}

function _submitOrder(side){
  _saveSettings();
  var set=ST.settings;
  var type=set.orderType||'market';
  var qty=_getNum('ppQty',0);if(qty<=0)qty=null;
  var limitPx=_getNum('ppLimitPx',0);if(limitPx<=0)limitPx=null;
  var sl=_getNum('ppSL',0);if(sl<=0)sl=null;
  var tp=_getNum('ppTP',0);if(tp<=0)tp=null;
  placeOrder({side:side,type:type,qty:qty,price:limitPx,triggerPrice:limitPx,sl:sl,tp:tp});
}

function _quickOrder(side){
  _saveSettings();
  placeOrder({side:side,type:ST.settings.orderType||'market'});
}

function _onTypeChange(type){
  ST.settings.orderType=type;
  var lbl=type.charAt(0).toUpperCase()+type.slice(1);
  ['ppBuyBtn','ppSellBtn'].forEach(function(id,i){
    var el=document.getElementById(id);
    if(el)el.textContent=(i===0?'Buy ':'Sell ')+lbl;
  });
  ['ppQBuy','ppQSell'].forEach(function(id,i){
    var el=document.getElementById(id);
    if(el)el.textContent=(i===0?'Buy ':'Sell ')+lbl;
  });
  _render();
}

function _closePos(posId){_doClose(posId,'manual');}
function _cancelAll(){
  var sym=_sym();
  ST.pendingOrders=ST.pendingOrders.filter(function(o){return o.symbol!==sym;});
  _save();_render();if(window.drawSoon)drawSoon();
}
function _resetConfirm(){
  if(confirm('Reset Paper Trading account?\n\nAll positions, orders and history will be cleared.')){
    _initDefault();ST.enabled=true;_save();_render();if(window.drawSoon)drawSoon();
    _notif('Account reset — balance: '+DEF_ACC.balance+' USDT');
  }
}
function _updateStopsFromUI(posId){
  var sl=_getNum('ppSL_'+posId,null);if(sl&&sl<=0)sl=null;
  var tp=_getNum('ppTP_'+posId,null);if(tp&&tp<=0)tp=null;
  updateStops(posId,{sl:sl,tp:tp});
  _notif('SL/TP updated');
}

function setTab(t){_tab=t;_render();}

function togglePanel(){
  var p=document.getElementById('dvlPaperPanel');if(!p)return;
  var isOpen=p.classList.toggle('pp-open');
  if(isOpen){
    if(!ST.enabled){ST.enabled=true;_save();}
    var badge=document.getElementById('paperTradingBadge');
    if(badge)badge.style.display='block';
    _render();
  }
}

function _toggleQuick(){
  ST.quickVisible=!ST.quickVisible;
  _save();_updateQuickVis();
}
function _updateQuickVis(){
  var qb=document.getElementById('ppQuickBtns');
  if(!qb)return;
  if(ST.enabled&&ST.quickVisible)qb.classList.add('pp-qvis');
  else qb.classList.remove('pp-qvis');
  var eye=document.getElementById('ppQEye');
  if(eye)eye.style.opacity=ST.quickVisible?'1':'0.4';
}

/* ── panel close on outside click ── */
function _initOutsideClick(){
  document.addEventListener('mousedown',function(e){
    if(!ST.enabled)return;
    var panel=document.getElementById('dvlPaperPanel');
    if(!panel||!panel.classList.contains('pp-open'))return;
    if(_drag)return;
    var btn=document.getElementById('paperTradingBtn');
    var qb=document.getElementById('ppQuickBtns');
    if(!panel.contains(e.target)&&!(btn&&btn.contains(e.target))&&!(qb&&qb.contains(e.target))){
      panel.classList.remove('pp-open');
    }
  },{passive:true});
}

/* ── INIT ── */
function init(){
  _load();
  _updateQuickVis();
  var cv=document.getElementById('mainCanvas')||document.querySelector('#chartWrap canvas')||document.querySelector('canvas');
  if(cv)_initDrag(cv);
  _initOutsideClick();
  if(ST.enabled){
    var badge=document.getElementById('paperTradingBadge');
    if(badge)badge.style.display='block';
  }
  console.log('[DVL Paper] v0.179 ready — balance:',ST.account.balance,ST.account.currency);
}

/* ── PUBLIC API ── */
return{
  get enabled(){return ST.enabled;},
  init:init,setTab:setTab,togglePanel:togglePanel,
  placeOrder:placeOrder,cancelOrder:cancelOrder,
  openPosition:function(p){_doOpen(p);_save();_render();if(window.drawSoon)drawSoon();},
  closePosition:function(posId,reason,price){_doClose(posId,reason||'manual',price||null);},
  updateStops:updateStops,
  onTick:onTick,onCandleClose:onCandleClose,
  drawOverlay:drawOverlay,
  getAccount:function(){return Object.assign({},ST.account,{equity:_equity()});},
  getPositions:function(sym){return ST.positions.filter(function(p){return !sym||p.symbol===sym;});},
  getAllPositions:function(){return ST.positions.slice();},
  getPositionById:function(id){return ST.positions.find(function(p){return p.id===id;})||null;},
  getHistory:function(){return ST.history.slice();},
  getSymbolPnL:function(sym){return ST.positions.filter(function(p){return p.symbol===sym;}).reduce(function(s,p){return s+(p.unrealizedPnl||0);},0);},
  calculateStats:calcStats,
  _submitOrder:_submitOrder,_quickOrder:_quickOrder,_closePos:_closePos,
  _cancelAll:_cancelAll,_resetConfirm:_resetConfirm,
  _updateStopsFromUI:_updateStopsFromUI,_toggleQuick:_toggleQuick,_onTypeChange:_onTypeChange
};
})();

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){DVL_PAPER.init();});
}else{
  setTimeout(function(){DVL_PAPER.init();},200);
}
</script>"""

html = html[:idx_s] + NEW_BLOCK + html[idx_e:]

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_179.py applied — Beta 0.179')
print('  Multi-position: ST.positions[] (sem netting)')
print('  PNL por simbolo: lastPriceBySymbol{}')
print('  Overlay TV-style: areas TP/SL, labels com PNL estimado')
print('  Drag TP/SL no canvas (mouse + touch)')
print('  Botoes flutuantes Buy/Sell no grafico')
print('  Auto SL/TP 1:1 (ATR ou %)')
print('  Painel fecha ao clicar fora')
print('  Sem emojis')
