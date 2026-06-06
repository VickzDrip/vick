#!/usr/bin/env python3
"""patch_178.py — Beta 0.178: DVL Paper Trading Engine (Nível 2)

Motor completo de paper trading:
- Conta simulada (balance, equity, unrealized/realized PNL, margin)
- Ordens: Market Buy/Sell, Limit Buy/Sell, Stop Market, Close, Cancel
- Posição única por símbolo com SL/TP automático conservador
- Execução realista: slippage + taxa aplicados
- Overlay no gráfico: linha entrada, SL, TP, área PNL, label PNL live
- Painel flutuante 4 abas: Trade / Posição / Histórico / Stats
- Persistência localStorage completa
- Badge PAPER sempre visível
- API pública: DVL_PAPER.placeOrder/closePosition/updateStops/getAccount/...
- Hooks: tick (aggTrade) + candle close (kline) + draw overlay
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.177') >= 10, f'Beta 0.177 not found (count={html.count("Beta 0.177")})'
html = html.replace('Beta 0.177', 'Beta 0.178')

# ── 1. Botão PAPER na toolbar (antes do gear) ─────────────────────────────────
OLD_GEAR_BTN = '        <button class="tb-icon-btn" id="gearMenuBtn" title="Ferramentas"'
assert OLD_GEAR_BTN in html, 'gear button anchor not found'
html = html.replace(OLD_GEAR_BTN,
    '        <button class="tb-icon-btn" id="paperTradingBtn" title="Paper Trading"\n'
    '          onclick="window.DVL_PAPER&&DVL_PAPER.togglePanel()"\n'
    '          style="position:relative;">\n'
    '          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n'
    '            <line x1="12" y1="1" x2="12" y2="23"/>\n'
    '            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>\n'
    '          </svg>\n'
    '          <span id="paperTradingBadge" style="display:none;position:absolute;top:2px;right:2px;'
    'width:6px;height:6px;background:#ff9f0a;border-radius:50%;"></span>\n'
    '        </button>\n'
    '        <button class="tb-icon-btn" id="gearMenuBtn" title="Ferramentas"',
    1
)

# ── 2. Hook no draw(): overlay antes do drawCrosshair ─────────────────────────
OLD_CROSSHAIR = 'drawCrosshair(ctx,W,H,sc,x,V);if(!_dvlDrawn)'
assert OLD_CROSSHAIR in html, 'drawCrosshair anchor not found'
html = html.replace(OLD_CROSSHAIR,
    'if(window.DVL_PAPER&&DVL_PAPER.enabled)DVL_PAPER.drawOverlay(ctx,W,H,sc,V,bw||4);'
    'drawCrosshair(ctx,W,H,sc,x,V);if(!_dvlDrawn)',
    1
)

# ── 3. Hook no aggTrade (tick de preço) ───────────────────────────────────────
OLD_AGGTRADE = (
    '    }else if(m.stream.includes(\'@aggTrade\')){\n'
    '      addAggTrade(d,true,seq);\n'
    '    }'
)
assert OLD_AGGTRADE in html, 'aggTrade hook anchor not found'
html = html.replace(OLD_AGGTRADE,
    '    }else if(m.stream.includes(\'@aggTrade\')){\n'
    '      addAggTrade(d,true,seq);\n'
    '      if(window.DVL_PAPER&&DVL_PAPER.enabled&&d&&d.p)DVL_PAPER.onTick(+d.p);\n'
    '    }',
    1
)

# ── 4. Hook no push de candle fechado ─────────────────────────────────────────
# Âncora: else if(!last||c.t>last.t){ S.candles.push(c);
OLD_CANDLE_PUSH = (
    '  }else if(!last||c.t>last.t){\n'
    '    S.candles.push(c);\n'
    '    var _lMax=_dvlMaxCandles();'
)
assert OLD_CANDLE_PUSH in html, 'candle push anchor not found'
html = html.replace(OLD_CANDLE_PUSH,
    '  }else if(!last||c.t>last.t){\n'
    '    S.candles.push(c);\n'
    '    if(window.DVL_PAPER&&DVL_PAPER.enabled)DVL_PAPER.onCandleClose(c);\n'
    '    var _lMax=_dvlMaxCandles();',
    1
)

# ── 5. Injecto HTML + CSS + JS antes de </body> ───────────────────────────────
OLD_BODY_END = '</body>\n</html>'
assert OLD_BODY_END in html, '</body> anchor not found'

PAPER_ENGINE = r"""
<!-- ═══════════════════════════════════════════════════════════════
     DVL PAPER TRADING ENGINE — Beta 0.178
     ════════════════════════════════════════════════════════════ -->
<style id="dvlPaperCSS">
#dvlPaperPanel{position:fixed;right:0;top:50px;width:264px;background:#020508;border-left:1px solid #1e2a40;border-bottom:1px solid #1e2a40;z-index:190;display:none;flex-direction:column;max-height:calc(100vh - 50px);font-family:monospace;}
#dvlPaperPanel.pp-open{display:flex;}
.pp-hdr{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #1e2a40;flex-shrink:0;background:#030609;}
.pp-badge{font-size:8px;font-weight:900;letter-spacing:2px;color:#ff9f0a;background:rgba(255,159,10,.1);border:1px solid rgba(255,159,10,.35);border-radius:3px;padding:2px 5px;}
.pp-tabs{display:flex;border-bottom:1px solid #1e2a40;flex-shrink:0;}
.pp-tab{flex:1;font-family:monospace;font-size:9px;color:#4a6580;background:none;border:none;border-bottom:2px solid transparent;padding:5px 2px;cursor:pointer;letter-spacing:.04em;}
.pp-tab.on{color:#00d4ff;border-bottom-color:#00d4ff;}
.pp-body{overflow-y:auto;flex:1;padding:8px 10px;scrollbar-width:thin;scrollbar-color:#1e2a40 transparent;}
.pp-sec{margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #0a1018;}
.pp-sec:last-child{border-bottom:none;margin-bottom:0;}
.pp-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:10px;}
.pp-k{color:#4a6580;}
.pp-v{color:#c8d8f0;}
.pp-v.pos{color:#00e676;}
.pp-v.neg{color:#ff3d57;}
.pp-v.neu{color:#ff9f0a;}
.pp-btns{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:6px 0;}
.pp-btn{font-family:monospace;font-size:10px;border-radius:3px;padding:7px 4px;cursor:pointer;border:1px solid;font-weight:700;letter-spacing:.04em;transition:opacity .1s;}
.pp-btn:hover{opacity:.8;}
.pp-btn.buy{background:rgba(0,230,118,.12);color:#00e676;border-color:rgba(0,230,118,.35);}
.pp-btn.sell{background:rgba(255,61,87,.12);color:#ff3d57;border-color:rgba(255,61,87,.35);}
.pp-btn.cls{background:rgba(255,159,10,.1);color:#ff9f0a;border-color:rgba(255,159,10,.3);grid-column:span 2;}
.pp-btn.cncl{background:rgba(74,101,128,.1);color:#6a8faf;border-color:rgba(74,101,128,.25);grid-column:span 2;font-size:9px;}
.pp-btn.rst{background:rgba(255,61,87,.06);color:#cc4455;border-color:rgba(255,61,87,.18);grid-column:span 2;font-size:9px;}
.pp-inp-row{display:flex;align-items:center;justify-content:space-between;padding:2px 0;font-size:10px;gap:4px;}
.pp-lbl{color:#4a6580;flex-shrink:0;}
.pp-inp{background:#060810;border:1px solid #1e2a40;color:#c8d8f0;border-radius:3px;padding:3px 5px;font-family:monospace;font-size:10px;width:90px;text-align:right;}
.pp-inp:focus{outline:none;border-color:#00d4ff;}
.pp-sel{background:#060810;border:1px solid #1e2a40;color:#c8d8f0;border-radius:3px;padding:3px 4px;font-family:monospace;font-size:10px;}
.pp-ord-row{padding:3px 0;border-bottom:1px solid #080e18;font-size:9px;display:flex;justify-content:space-between;align-items:center;}
.pp-hist-row{padding:3px 0;border-bottom:1px solid #080e18;font-size:9px;}
.pp-stat-row{display:flex;justify-content:space-between;padding:2px 0;font-size:10px;}
.pp-stat-k{color:#4a6580;}
.pp-stat-v{color:#c8d8f0;font-family:monospace;}
#dvlPaperNotif{position:fixed;bottom:38px;left:50%;transform:translateX(-50%);background:rgba(3,6,9,.96);border:1px solid rgba(255,159,10,.3);color:rgba(255,200,50,.9);font-size:10px;font-family:monospace;padding:5px 14px;border-radius:4px;pointer-events:none;opacity:0;transition:opacity .3s;z-index:9997;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.6);}
</style>

<div id="dvlPaperPanel">
  <div class="pp-hdr">
    <div style="display:flex;align-items:center;gap:6px;">
      <span class="pp-badge">PAPER</span>
      <span style="font-size:9px;color:#5a7090;letter-spacing:1px;">DVL Trading Sim</span>
    </div>
    <button style="background:none;border:none;color:#4a6580;cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;"
            onclick="window.DVL_PAPER&&DVL_PAPER.togglePanel()">✕</button>
  </div>
  <div class="pp-tabs">
    <button class="pp-tab on" id="ppT_trade" onclick="DVL_PAPER.setTab('trade')">Trade</button>
    <button class="pp-tab" id="ppT_pos"   onclick="DVL_PAPER.setTab('pos')">Posição</button>
    <button class="pp-tab" id="ppT_hist"  onclick="DVL_PAPER.setTab('hist')">Hist.</button>
    <button class="pp-tab" id="ppT_stats" onclick="DVL_PAPER.setTab('stats')">Stats</button>
  </div>
  <div class="pp-body" id="ppBody"></div>
</div>
<div id="dvlPaperNotif"></div>

<script>
/* ═══════════════════════════════════════════════════════════════
   DVL PAPER TRADING ENGINE — Beta 0.178
   ═══════════════════════════════════════════════════════════════ */
window.DVL_PAPER = (function(){
  'use strict';

  var SK = 'dvl_paper_v2';
  var _tab = 'trade';
  var _renderTimer = null;

  /* ── Defaults ── */
  var DEF_ACC = {balance:10000,initialBalance:10000,realizedPnl:0,currency:'USDT'};
  var DEF_SET = {leverage:1,feePct:0.05,slippagePct:0.02,riskMode:'percent',
                 riskPct:1,fixedSize:0.001,intrabarMode:'conservative'};

  /* ── State ── */
  var ST = {
    enabled: false,
    account: null,
    position: null,
    pendingOrders: [],
    history: [],
    settings: null
  };

  /* ── UID ── */
  var _uidN = 1;
  function _uid(){ return 'pt'+(Date.now()%1e9)+'_'+(++_uidN); }

  /* ── Current price ── */
  function _price(){
    if(window.S&&S.candles&&S.candles.length) return S.candles[S.candles.length-1].c;
    return null;
  }
  function _sym(){ return window.S?S.sym:'?'; }

  /* ── Persist ── */
  function _save(){
    try{ localStorage.setItem(SK,JSON.stringify({
      enabled:ST.enabled, account:ST.account, position:ST.position,
      pendingOrders:ST.pendingOrders, history:ST.history, settings:ST.settings
    })); }catch(e){}
  }
  function _load(){
    try{
      var d=localStorage.getItem(SK);
      if(d){ d=JSON.parse(d);
        ST.enabled=!!d.enabled;
        ST.account=Object.assign({},DEF_ACC,d.account||{});
        ST.position=d.position||null;
        ST.pendingOrders=d.pendingOrders||[];
        ST.history=d.history||[];
        ST.settings=Object.assign({},DEF_SET,d.settings||{});
        return;
      }
    }catch(e){}
    _initDefault();
  }
  function _initDefault(){
    ST.account=Object.assign({},DEF_ACC);
    ST.position=null; ST.pendingOrders=[]; ST.history=[];
    ST.settings=Object.assign({},DEF_SET);
  }

  /* ── Math helpers ── */
  function _upnl(pos,price){
    if(!pos)return 0; price=price||_price(); if(!price)return 0;
    return pos.side==='long'?(price-pos.entryPrice)*pos.qty:(pos.entryPrice-price)*pos.qty;
  }
  function _equity(){ return ST.account.balance+_upnl(ST.position); }
  function _roe(pos){ return pos&&pos.margin?_upnl(pos)/pos.margin*100:0; }
  function _liqPrice(pos){
    var lev=pos.leverage||1;
    return pos.side==='long'?pos.entryPrice*(1-1/lev+0.005):pos.entryPrice*(1+1/lev-0.005);
  }
  function _applySlip(price,side){
    var s=ST.settings.slippagePct/100;
    return side==='buy'?price*(1+s):price*(1-s);
  }
  function _fee(notional){ return notional*ST.settings.feePct/100; }

  /* ── Qty from risk ── */
  function _autoQty(price,sl){
    var set=ST.settings;
    if(set.riskMode==='percent'&&sl!=null&&sl!==0){
      var risk=ST.account.balance*set.riskPct/100;
      var rpu=Math.abs(price-sl);
      if(rpu>0) return risk/rpu;
    }
    return set.fixedSize||0.001;
  }

  /* ── Format ── */
  function _f(n,d){ if(n==null||isNaN(n))return '—'; d=d!=null?d:2; return (n<0?'-':'')+Math.abs(n).toFixed(d); }
  function _fp(n){ if(n==null||isNaN(n))return '—'; return (n>0?'+':'')+n.toFixed(2); }
  function _fPct(n){ return n!=null?(n>0?'+':'')+n.toFixed(2)+'%':'—'; }

  /* ── Notify ── */
  function _notif(msg){
    var el=document.getElementById('dvlPaperNotif'); if(!el)return;
    el.textContent=msg; el.style.opacity='1';
    clearTimeout(el._t); el._t=setTimeout(function(){el.style.opacity='0';},3500);
  }

  /* ════════════════════════════════════════════
     ORDENS
     ════════════════════════════════════════════ */
  function placeOrder(p){
    /* p: {side,type,qty,price,triggerPrice,sl,tp,source} */
    if(!ST.enabled){_notif('⚠ Ative o Paper Trading primeiro'); return null;}
    var px=_price(); if(!px){_notif('⚠ Sem preço'); return null;}
    var side=p.side||'buy';
    var type=p.type||'market';
    var qty=p.qty&&p.qty>0?p.qty:_autoQty(p.price||px,p.sl);
    if(qty<=0){_notif('⚠ Qty inválida'); return null;}
    var ord={id:_uid(),symbol:_sym(),side:side,type:type,qty:qty,
             price:p.price||null,triggerPrice:p.triggerPrice||null,
             sl:p.sl||null,tp:p.tp||null,
             status:'pending',createdAt:Date.now(),filledAt:null,
             fee:0,slippage:0,source:p.source||'manual'};
    if(type==='market') return _execMarket(ord,px);
    ST.pendingOrders.push(ord); _save(); _render();
    _notif((side==='buy'?'📋 Limit Buy':'📋 Limit Sell')+' @ '+_f(ord.price));
    return ord;
  }

  function _execMarket(ord,px){
    px=px||_price(); if(!px)return null;
    var fill=_applySlip(px,ord.side);
    ord.slippage=Math.abs(fill-px); ord.price=fill;
    ord.filledAt=Date.now(); ord.status='filled';
    var notional=fill*ord.qty;
    var fee=_fee(notional); ord.fee=fee;
    /* fechar posição oposta */
    var pos=ST.position;
    if(pos&&pos.symbol===ord.symbol){
      var isClose=(pos.side==='long'&&ord.side==='sell')||(pos.side==='short'&&ord.side==='buy');
      if(isClose){
        _doClose('manual',fill);
        _save(); _render(); if(window.drawSoon)drawSoon();
        return ord;
      }
    }
    /* abrir nova */
    _doOpen({side:ord.side==='buy'?'long':'short',entryPrice:fill,qty:ord.qty,fee:fee,sl:ord.sl,tp:ord.tp});
    _save(); _render(); if(window.drawSoon)drawSoon();
    _notif((ord.side==='buy'?'🟢 Long':'🔴 Short')+' @ '+_f(fill)+'  qty='+ord.qty.toFixed(4));
    return ord;
  }

  function _doOpen(p){
    var set=ST.settings;
    var notional=p.entryPrice*p.qty;
    var margin=notional/(set.leverage||1);
    var fee=p.fee||_fee(notional);
    ST.account.balance-=fee;
    ST.position={
      id:_uid(), symbol:_sym(),
      side:p.side, entryPrice:p.entryPrice, qty:p.qty,
      notional:notional, leverage:set.leverage||1, margin:margin,
      stopLoss:p.sl||null, takeProfit:p.tp||null,
      openFee:fee, unrealizedPnl:0, realizedPnl:0, roe:0,
      openedAt:Date.now(), status:'open'
    };
    ST.position.liquidationPrice=_liqPrice(ST.position);
  }

  function _doClose(reason,exitPx){
    var pos=ST.position; if(!pos)return null;
    exitPx=exitPx||_price(); if(!exitPx)return null;
    var gross=pos.side==='long'?(exitPx-pos.entryPrice)*pos.qty:(pos.entryPrice-exitPx)*pos.qty;
    var closeFee=_fee(exitPx*pos.qty);
    var net=gross-closeFee-(pos.openFee||0);
    var roe=pos.margin>0?net/pos.margin*100:0;
    var trade={id:_uid(),symbol:pos.symbol,side:pos.side,
      entryPrice:pos.entryPrice,exitPrice:exitPx,qty:pos.qty,
      fee:closeFee+(pos.openFee||0),grossPnl:gross,netPnl:net,roe:roe,
      openedAt:pos.openedAt,closedAt:Date.now(),
      duration:Date.now()-pos.openedAt,reason:reason||'manual'};
    ST.history.push(trade);
    ST.account.balance+=net;
    ST.account.realizedPnl+=net;
    ST.position=null;
    _save(); _render(); if(window.drawSoon)drawSoon();
    var s=net>=0?'+':'';
    _notif((reason==='tp'?'✅ TP hit':reason==='sl'?'🛑 SL hit':
            reason==='liq'?'💀 Liquidada':'📤 Fechada')+
           '  '+s+_f(net)+' USDT  ROE '+_fPct(roe));
    return trade;
  }

  function cancelOrder(id){
    var i=ST.pendingOrders.findIndex(function(o){return o.id===id;});
    if(i>=0){ST.pendingOrders.splice(i,1);_save();_render();}
  }

  function updateStops(p){
    if(!ST.position)return;
    if(p.sl!==undefined)ST.position.stopLoss=p.sl;
    if(p.tp!==undefined)ST.position.takeProfit=p.tp;
    _save(); _render(); if(window.drawSoon)drawSoon();
  }

  /* ════════════════════════════════════════════
     TICK & CANDLE HOOKS
     ════════════════════════════════════════════ */
  function onTick(price){
    var pos=ST.position; if(!pos)return;
    pos.unrealizedPnl=_upnl(pos,price);
    pos.roe=pos.margin>0?pos.unrealizedPnl/pos.margin*100:0;
    /* liquidação */
    if(pos.liquidationPrice){
      var liqHit=pos.side==='long'?price<=pos.liquidationPrice:price>=pos.liquidationPrice;
      if(liqHit){_doClose('liq',pos.liquidationPrice);return;}
    }
    if(_renderTimer)return;
    _renderTimer=setTimeout(function(){_renderTimer=null;_renderLive();},200);
  }

  function onCandleClose(c){
    /* pending orders */
    for(var i=ST.pendingOrders.length-1;i>=0;i--){
      var o=ST.pendingOrders[i];
      if(o.type==='limit'){
        var hit=(o.side==='buy'&&c.l<=o.price)||(o.side==='sell'&&c.h>=o.price);
        if(hit){ST.pendingOrders.splice(i,1);_execMarket(Object.assign({},o,{type:'market'}));}
      } else if(o.type==='stop'){
        var hit2=(o.side==='buy'&&c.h>=o.triggerPrice)||(o.side==='sell'&&c.l<=o.triggerPrice);
        if(hit2){ST.pendingOrders.splice(i,1);_execMarket(Object.assign({},o,{type:'market',price:o.triggerPrice}));}
      }
    }
    /* SL/TP */
    var pos=ST.position; if(!pos)return;
    var sl=pos.stopLoss,tp=pos.takeProfit;
    var hitSL=sl!=null&&(pos.side==='long'?c.l<=sl:c.h>=sl);
    var hitTP=tp!=null&&(pos.side==='long'?c.h>=tp:c.l<=tp);
    if(hitSL&&hitTP){
      var mode=ST.settings.intrabarMode||'conservative';
      if(mode==='optimistic') _doClose('tp',tp);
      else if(mode==='closeBased'){
        var cpnl=pos.side==='long'?(c.c-pos.entryPrice)*pos.qty:(pos.entryPrice-c.c)*pos.qty;
        _doClose(cpnl>=0?'tp':'sl',cpnl>=0?tp:sl);
      } else _doClose('sl',sl);
    } else if(hitSL) _doClose('sl',sl);
    else if(hitTP) _doClose('tp',tp);
  }

  /* ════════════════════════════════════════════
     STATS
     ════════════════════════════════════════════ */
  function calcStats(){
    var h=ST.history; if(!h.length)return{totalTrades:0,wins:0,losses:0,winrate:'—',
      totalPnl:0,avgWin:0,avgLoss:0,profitFactor:'—',maxDD:'—',best:0,worst:0};
    var wins=h.filter(function(t){return t.netPnl>0;});
    var loss=h.filter(function(t){return t.netPnl<=0;});
    var gW=wins.reduce(function(s,t){return s+t.netPnl;},0);
    var gL=Math.abs(loss.reduce(function(s,t){return s+t.netPnl;},0));
    /* max drawdown */
    var bal=ST.account.initialBalance,pk=bal,maxDD=0;
    h.forEach(function(t){bal+=t.netPnl;if(bal>pk)pk=bal;var dd=(pk-bal)/pk*100;if(dd>maxDD)maxDD=dd;});
    return{
      totalTrades:h.length, wins:wins.length, losses:loss.length,
      winrate:h.length?(wins.length/h.length*100).toFixed(1)+'%':'—',
      totalPnl:h.reduce(function(s,t){return s+t.netPnl;},0),
      avgWin:wins.length?gW/wins.length:0,
      avgLoss:loss.length?gL/loss.length:0,
      profitFactor:gL>0?(gW/gL).toFixed(2):'∞',
      maxDD:maxDD.toFixed(2)+'%',
      best:h.reduce(function(b,t){return t.netPnl>b?t.netPnl:b;},-Infinity),
      worst:h.reduce(function(w,t){return t.netPnl<w?t.netPnl:w;},Infinity)
    };
  }

  /* ════════════════════════════════════════════
     CANVAS OVERLAY
     ════════════════════════════════════════════ */
  function drawOverlay(ctx,W,H,sc,lastPrice,bwPx){
    var pos=ST.position; if(!pos&&!ST.pendingOrders.length)return;
    var rp=typeof RP==='function'?RP():68;
    var xL=0, xR=W-rp-2;
    ctx.save();
    ctx.font='bold 9px monospace';

    if(pos){
      var yE=sc.y(pos.entryPrice);
      var ySL=pos.stopLoss!=null?sc.y(pos.stopLoss):null;
      var yTP=pos.takeProfit!=null?sc.y(pos.takeProfit):null;
      var isLong=pos.side==='long';
      var upnl=pos.unrealizedPnl||0;
      var pnlColor=upnl>=0?'rgba(0,230,118,1)':'rgba(255,61,87,1)';

      /* ── Área TP ── */
      if(yTP!=null){
        var tpTop=isLong?yTP:yE, tpBot=isLong?yE:yTP;
        ctx.fillStyle='rgba(0,230,118,0.07)';
        ctx.fillRect(xL,tpTop,xR-xL,tpBot-tpTop);
      }
      /* ── Área SL ── */
      if(ySL!=null){
        var slTop=isLong?yE:ySL, slBot=isLong?ySL:yE;
        ctx.fillStyle='rgba(255,61,87,0.07)';
        ctx.fillRect(xL,slTop,xR-xL,slBot-slTop);
      }

      /* ── Linha entrada ── */
      ctx.setLineDash([4,3]);
      ctx.lineWidth=1.5;
      ctx.strokeStyle='rgba(200,216,240,0.6)';
      ctx.beginPath();ctx.moveTo(xL,yE);ctx.lineTo(xR,yE);ctx.stroke();
      ctx.setLineDash([]);

      /* ── Linha SL ── */
      if(ySL!=null){
        ctx.lineWidth=1;ctx.strokeStyle='rgba(255,61,87,0.75)';
        ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(xL,ySL);ctx.lineTo(xR,ySL);ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle='rgba(255,61,87,0.85)';
        ctx.textAlign='right';
        ctx.fillText('SL '+_f(pos.stopLoss,4),xR-4,ySL-3);
      }

      /* ── Linha TP ── */
      if(yTP!=null){
        ctx.lineWidth=1;ctx.strokeStyle='rgba(0,230,118,0.75)';
        ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(xL,yTP);ctx.lineTo(xR,yTP);ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle='rgba(0,230,118,0.85)';
        ctx.textAlign='right';
        ctx.fillText('TP '+_f(pos.takeProfit,4),xR-4,yTP-3);
      }

      /* ── Label entrada + PNL ── */
      ctx.textAlign='left';
      var entryLbl=(isLong?'▲ LONG':'▼ SHORT')+' '+_f(pos.entryPrice,4);
      ctx.fillStyle='rgba(200,216,240,0.9)';
      ctx.fillText(entryLbl,xL+6,yE-4);

      /* PNL badge */
      var pnlTxt=_fp(upnl)+' USDT  '+_fPct(_roe(pos));
      var tw=ctx.measureText(pnlTxt).width+12;
      var bx=xL+6, by=yE+4, bh=14;
      ctx.fillStyle=upnl>=0?'rgba(0,230,118,0.18)':'rgba(255,61,87,0.18)';
      ctx.fillRect(bx,by,tw,bh);
      ctx.strokeStyle=pnlColor;ctx.lineWidth=0.5;
      ctx.strokeRect(bx,by,tw,bh);
      ctx.fillStyle=pnlColor;
      ctx.fillText(pnlTxt,bx+6,by+9);

      /* ── Botão Close (X) ── */
      var cx=xR-18, cy=yE;
      ctx.fillStyle='rgba(255,159,10,0.15)';
      ctx.fillRect(cx-6,cy-7,14,14);
      ctx.fillStyle='rgba(255,159,10,0.9)';
      ctx.textAlign='center';
      ctx.fillText('✕',cx+1,cy+4);
      ctx.textAlign='left';
    }

    /* ── Pending orders ── */
    for(var i=0;i<ST.pendingOrders.length;i++){
      var ord=ST.pendingOrders[i];
      if(!ord.price)continue;
      var yO=sc.y(ord.price);
      if(yO<0||yO>H)continue;
      ctx.lineWidth=1;
      ctx.strokeStyle=ord.side==='buy'?'rgba(0,230,118,0.5)':'rgba(255,61,87,0.5)';
      ctx.setLineDash([2,4]);
      ctx.beginPath();ctx.moveTo(xL,yO);ctx.lineTo(xR,yO);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=ord.side==='buy'?'rgba(0,230,118,0.8)':'rgba(255,61,87,0.8)';
      ctx.fillText((ord.side==='buy'?'Limit Buy':'Limit Sell')+' '+_f(ord.price,4),xL+6,yO-3);
    }

    ctx.restore();
  }

  /* ════════════════════════════════════════════
     PANEL RENDER
     ════════════════════════════════════════════ */
  function _render(){
    var body=document.getElementById('ppBody'); if(!body)return;
    var tabs=['trade','pos','hist','stats'];
    tabs.forEach(function(t){
      var el=document.getElementById('ppT_'+t);
      if(el)el.className='pp-tab'+(t===_tab?' on':'');
    });
    if(_tab==='trade') body.innerHTML=_renderTrade();
    else if(_tab==='pos') body.innerHTML=_renderPos();
    else if(_tab==='hist') body.innerHTML=_renderHist();
    else if(_tab==='stats') body.innerHTML=_renderStats();
  }

  function _renderLive(){
    if(_tab==='trade'||_tab==='pos'){
      var body=document.getElementById('ppBody'); if(!body)return;
      if(_tab==='trade') body.innerHTML=_renderTrade();
      else body.innerHTML=_renderPos();
    }
  }

  function _pnlCls(n){ return n>0?'pos':n<0?'neg':''; }

  function _renderTrade(){
    var acc=ST.account, pos=ST.position, set=ST.settings;
    var eq=_equity(), upnl=pos?pos.unrealizedPnl||0:0;
    var h='<div class="pp-sec">';
    h+='<div class="pp-row"><span class="pp-k">Balance</span><span class="pp-v">'+_f(acc.balance)+' USDT</span></div>';
    h+='<div class="pp-row"><span class="pp-k">Equity</span><span class="pp-v '+_pnlCls(eq-acc.initialBalance)+'">'+_f(eq)+' USDT</span></div>';
    h+='<div class="pp-row"><span class="pp-k">Unreal. PNL</span><span class="pp-v '+_pnlCls(upnl)+'">'+_fp(upnl)+' USDT</span></div>';
    h+='<div class="pp-row"><span class="pp-k">Real. PNL</span><span class="pp-v '+_pnlCls(acc.realizedPnl)+'">'+_fp(acc.realizedPnl)+' USDT</span></div>';
    h+='</div>';
    /* Order form */
    h+='<div class="pp-sec">';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Tipo</span>';
    h+='<select class="pp-sel" id="ppOrderType"><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Risco %</span>';
    h+='<input class="pp-inp" id="ppRiskPct" type="number" min="0.1" max="100" step="0.1" value="'+set.riskPct+'"></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Qty (manual)</span>';
    h+='<input class="pp-inp" id="ppQty" type="number" min="0" step="0.0001" placeholder="auto"></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Preço limit/stop</span>';
    h+='<input class="pp-inp" id="ppLimitPx" type="number" step="0.01" placeholder="atual"></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Stop Loss</span>';
    h+='<input class="pp-inp" id="ppSL" type="number" step="0.01" placeholder="0"></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Take Profit</span>';
    h+='<input class="pp-inp" id="ppTP" type="number" step="0.01" placeholder="0"></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Alavancagem</span>';
    h+='<input class="pp-inp" id="ppLev" type="number" min="1" max="125" step="1" value="'+set.leverage+'"></div>';
    h+='<div class="pp-btns">';
    h+='<button class="pp-btn buy" onclick="DVL_PAPER._submitOrder(\'buy\')">🟢 Long / Buy</button>';
    h+='<button class="pp-btn sell" onclick="DVL_PAPER._submitOrder(\'sell\')">🔴 Short / Sell</button>';
    if(pos){
      h+='<button class="pp-btn cls" onclick="DVL_PAPER._closeNow()">📤 Fechar Posição</button>';
    }
    if(ST.pendingOrders.length){
      h+='<button class="pp-btn cncl" onclick="DVL_PAPER._cancelAll()">🗑 Cancelar Ordens ('+ST.pendingOrders.length+')</button>';
    }
    h+='</div></div>';
    /* Config */
    h+='<div class="pp-sec">';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Taxa %</span>';
    h+='<input class="pp-inp" id="ppFee" type="number" min="0" max="1" step="0.01" value="'+set.feePct+'"></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Slippage %</span>';
    h+='<input class="pp-inp" id="ppSlip" type="number" min="0" max="1" step="0.01" value="'+set.slippagePct+'"></div>';
    h+='<div class="pp-inp-row"><span class="pp-lbl">Intrabar</span>';
    h+='<select class="pp-sel" id="ppIntrabar">';
    ['conservative','optimistic','closeBased'].forEach(function(m){
      h+='<option value="'+m+'"'+(set.intrabarMode===m?' selected':'')+'>'+m+'</option>';
    });
    h+='</select></div>';
    h+='<button class="pp-btn rst" style="width:100%;margin-top:6px;" onclick="DVL_PAPER._resetConfirm()">🗑 Reset Conta</button>';
    h+='</div>';
    return h;
  }

  function _renderPos(){
    var pos=ST.position;
    var h='<div class="pp-sec">';
    if(!pos){
      h+='<div style="color:#4a6580;font-size:10px;text-align:center;padding:16px 0;">Sem posição aberta</div>';
    } else {
      var upnl=pos.unrealizedPnl||0, roe=pos.roe||0;
      var px=_price()||pos.entryPrice;
      h+='<div class="pp-row"><span class="pp-k">Símbolo</span><span class="pp-v">'+pos.symbol+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Lado</span><span class="pp-v '+(pos.side==='long'?'pos':'neg')+'">'+(pos.side==='long'?'▲ LONG':'▼ SHORT')+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Entrada</span><span class="pp-v">'+_f(pos.entryPrice,4)+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Preço atual</span><span class="pp-v">'+_f(px,4)+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Qty</span><span class="pp-v">'+pos.qty.toFixed(4)+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Notional</span><span class="pp-v">'+_f(pos.notional)+' USDT</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Margin</span><span class="pp-v">'+_f(pos.margin)+' USDT</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Leverage</span><span class="pp-v">'+pos.leverage+'×</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Unreal. PNL</span><span class="pp-v '+_pnlCls(upnl)+'">'+_fp(upnl)+' USDT</span></div>';
      h+='<div class="pp-row"><span class="pp-k">ROE</span><span class="pp-v '+_pnlCls(roe)+'">'+_fPct(roe)+'</span></div>';
      h+='<div class="pp-row"><span class="pp-k">Liq. Price</span><span class="pp-v neg">'+_f(pos.liquidationPrice,4)+'</span></div>';
      h+='</div><div class="pp-sec">';
      h+='<div class="pp-inp-row"><span class="pp-lbl">Stop Loss</span>';
      h+='<input class="pp-inp" id="ppEditSL" type="number" step="0.01" value="'+(pos.stopLoss||'')+'"></div>';
      h+='<div class="pp-inp-row"><span class="pp-lbl">Take Profit</span>';
      h+='<input class="pp-inp" id="ppEditTP" type="number" step="0.01" value="'+(pos.takeProfit||'')+'"></div>';
      h+='<div class="pp-btns">';
      h+='<button class="pp-btn buy" style="grid-column:span 1;" onclick="DVL_PAPER._updateStopsFromUI()">💾 Salvar SL/TP</button>';
      h+='<button class="pp-btn cls" style="grid-column:span 1;" onclick="DVL_PAPER._closeNow()">📤 Fechar</button>';
      h+='</div>';
    }
    h+='</div>';
    /* Pending orders */
    if(ST.pendingOrders.length){
      h+='<div class="pp-sec">';
      h+='<div style="font-size:8px;color:#4a6580;letter-spacing:.1em;margin-bottom:4px;">ORDENS PENDENTES</div>';
      ST.pendingOrders.forEach(function(o){
        h+='<div class="pp-ord-row">';
        h+='<span style="color:'+(o.side==='buy'?'#00e676':'#ff3d57')+'">'+o.side.toUpperCase()+' '+o.type+'</span>';
        h+='<span style="color:#c8d8f0">'+_f(o.price,4)+'</span>';
        h+='<span style="color:#ff3d57;cursor:pointer;" onclick="DVL_PAPER.cancelOrder(\''+o.id+'\')">✕</span>';
        h+='</div>';
      });
      h+='</div>';
    }
    return h;
  }

  function _renderHist(){
    var h='<div class="pp-sec">';
    if(!ST.history.length){
      h+='<div style="color:#4a6580;font-size:10px;text-align:center;padding:16px 0;">Sem trades fechados</div>';
      return h+'</div>';
    }
    var recent=ST.history.slice().reverse().slice(0,30);
    recent.forEach(function(t){
      var pnlCls=t.netPnl>0?'pos':'neg';
      var dur=Math.round(t.duration/1000);
      var durStr=dur>3600?Math.floor(dur/3600)+'h':dur>60?Math.floor(dur/60)+'m':dur+'s';
      h+='<div class="pp-hist-row">';
      h+='<div style="display:flex;justify-content:space-between;">';
      h+='<span style="color:'+(t.side==='long'?'#00e676':'#ff3d57')+'">'+(t.side==='long'?'▲':'▼')+' '+t.symbol+'</span>';
      h+='<span class="pp-v '+pnlCls+'">'+_fp(t.netPnl)+' USDT</span>';
      h+='</div>';
      h+='<div style="display:flex;justify-content:space-between;color:#4a6580;font-size:8px;margin-top:1px;">';
      h+='<span>'+_f(t.entryPrice,4)+' → '+_f(t.exitPrice,4)+'</span>';
      h+='<span>'+t.reason.toUpperCase()+'  '+durStr+'</span>';
      h+='</div>';
      h+='</div>';
    });
    return h+'</div>';
  }

  function _renderStats(){
    var s=calcStats();
    var totalPnl=s.totalPnl;
    var h='<div class="pp-sec">';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Total Trades</span><span class="pp-stat-v">'+s.totalTrades+'</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Wins / Losses</span><span class="pp-stat-v"><span style="color:#00e676">'+s.wins+'</span> / <span style="color:#ff3d57">'+s.losses+'</span></span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Winrate</span><span class="pp-stat-v" style="color:'+(parseFloat(s.winrate)>=50?'#00e676':'#ff3d57')+'">'+s.winrate+'</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Net PNL</span><span class="pp-stat-v '+(totalPnl>=0?'pos':'neg')+'">'+_fp(totalPnl)+' USDT</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Avg Win</span><span class="pp-stat-v pos">'+_f(s.avgWin)+'</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Avg Loss</span><span class="pp-stat-v neg">-'+_f(s.avgLoss)+'</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Profit Factor</span><span class="pp-stat-v">'+s.profitFactor+'</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Max Drawdown</span><span class="pp-stat-v neg">'+s.maxDD+'</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Best Trade</span><span class="pp-stat-v pos">'+_fp(s.best)+' USDT</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Worst Trade</span><span class="pp-stat-v neg">'+_fp(s.worst)+' USDT</span></div>';
    h+='</div>';
    /* Account */
    h+='<div class="pp-sec">';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Saldo inicial</span><span class="pp-stat-v">'+_f(ST.account.initialBalance)+' USDT</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Saldo atual</span><span class="pp-stat-v">'+_f(ST.account.balance)+' USDT</span></div>';
    h+='<div class="pp-stat-row"><span class="pp-stat-k">Total ganho</span><span class="pp-stat-v '+(ST.account.realizedPnl>=0?'pos':'neg')+'">'+_fp(ST.account.realizedPnl)+' USDT</span></div>';
    h+='</div>';
    return h;
  }

  /* ── UI helpers ── */
  function _getInput(id){ var el=document.getElementById(id); return el?el.value.trim():null; }
  function _getNum(id,fallback){ var v=parseFloat(_getInput(id)); return isNaN(v)?fallback:v; }

  /* Submit order from trade form */
  DVL_PAPER_submitOrder = function(side){
    /* save settings from form */
    var set=ST.settings;
    var riskPct=_getNum('ppRiskPct',set.riskPct);
    var lev=_getNum('ppLev',set.leverage);
    var fee=_getNum('ppFee',set.feePct);
    var slip=_getNum('ppSlip',set.slippagePct);
    var intrabar=_getInput('ppIntrabar')||set.intrabarMode;
    set.riskPct=riskPct; set.leverage=lev; set.feePct=fee;
    set.slippagePct=slip; set.intrabarMode=intrabar;
    var type=_getInput('ppOrderType')||'market';
    var qty=_getNum('ppQty',0); if(qty<=0)qty=null;
    var limitPx=_getNum('ppLimitPx',0); if(limitPx<=0)limitPx=null;
    var sl=_getNum('ppSL',0); if(sl<=0)sl=null;
    var tp=_getNum('ppTP',0); if(tp<=0)tp=null;
    placeOrder({side:side,type:type,qty:qty,price:limitPx,triggerPrice:limitPx,sl:sl,tp:tp});
  };

  function _closeNow(){ _doClose('manual'); }
  function _cancelAll(){ ST.pendingOrders=[]; _save(); _render(); if(window.drawSoon)drawSoon(); }
  function _resetConfirm(){
    if(confirm('🗑 Resetar conta Paper Trading?\n\nTodo o histórico e posições serão apagados.')){
      _initDefault(); ST.enabled=true; _save(); _render(); if(window.drawSoon)drawSoon();
      _notif('✅ Conta resetada — saldo: '+DEF_ACC.balance+' USDT');
    }
  }
  function _updateStopsFromUI(){
    var sl=_getNum('ppEditSL',null); if(sl&&sl<=0)sl=null;
    var tp=_getNum('ppEditTP',null); if(tp&&tp<=0)tp=null;
    updateStops({sl:sl,tp:tp});
    _notif('SL/TP actualizado');
  }

  /* ── Tab switch ── */
  function setTab(t){ _tab=t; _render(); }

  /* ── Panel toggle ── */
  function togglePanel(){
    var p=document.getElementById('dvlPaperPanel'); if(!p)return;
    var isOpen=p.classList.toggle('pp-open');
    if(isOpen){
      if(!ST.enabled){ ST.enabled=true; _save(); }
      var badge=document.getElementById('paperTradingBadge');
      if(badge)badge.style.display='block';
      _render();
    }
  }

  /* ── Canvas click — close button ── */
  function _onCanvasClick(e){
    if(!ST.position||!ST.enabled)return;
    var canvas=e.target;
    var rect=canvas.getBoundingClientRect();
    var cx=e.clientX-rect.left, cy=e.clientY-rect.top;
    var W=canvas.width/window.devicePixelRatio||canvas.offsetWidth;
    var rp=typeof RP==='function'?RP():68;
    var xR=W-rp-2;
    /* close button area */
    if(!window.S||!S.candles||!S.view)return;
    var pos=ST.position;
    if(!pos)return;
    var sc=window._dvlSc||null;
    if(!sc||!sc.y)return;
    var yE=sc.y(pos.entryPrice);
    var bx=xR-24, by=yE-7, bw=14, bh=14;
    if(cx>=bx&&cx<=bx+bw&&cy>=by&&cy<=by+bh){
      _doClose('manual');
    }
  }

  /* ── Init ── */
  function init(){
    _load();
    /* expose internal funcs for onclick */
    var pub=window.DVL_PAPER;
    pub._submitOrder=DVL_PAPER_submitOrder;
    pub._closeNow=_closeNow;
    pub._cancelAll=_cancelAll;
    pub._resetConfirm=_resetConfirm;
    pub._updateStopsFromUI=_updateStopsFromUI;
    /* canvas click for close btn */
    var cv=document.getElementById('mainCanvas')||document.querySelector('#chartWrap canvas');
    if(cv)cv.addEventListener('click',_onCanvasClick);
    /* badge */
    if(ST.enabled){
      var badge=document.getElementById('paperTradingBadge');
      if(badge)badge.style.display='block';
    }
    console.log('[DVL Paper] Engine v0.178 ready — balance:',ST.account.balance,ST.account.currency);
  }

  /* ── Public API ── */
  return {
    get enabled(){ return ST.enabled; },
    init:init, setTab:setTab, togglePanel:togglePanel,
    placeOrder:placeOrder, cancelOrder:cancelOrder,
    openPosition:function(p){ _doOpen(p); _save(); _render(); if(window.drawSoon)drawSoon(); },
    closePosition:function(p){ _doClose((p&&p.reason)||'manual',(p&&p.price)||null); },
    updateStops:updateStops,
    onTick:onTick, onCandleClose:onCandleClose,
    drawOverlay:drawOverlay,
    getAccount:function(){ return Object.assign({},ST.account,{equity:_equity()}); },
    getPosition:function(sym){ return ST.position&&(!sym||ST.position.symbol===sym)?ST.position:null; },
    getHistory:function(){ return ST.history.slice(); },
    calculateStats:calcStats,
    _submitOrder:null, _closeNow:null, _cancelAll:null, _resetConfirm:null, _updateStopsFromUI:null
  };
})();

/* ── Auto-init após DOM ready ── */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){DVL_PAPER.init();});
}else{
  setTimeout(function(){DVL_PAPER.init();},200);
}
</script>
"""

html = html.replace(OLD_BODY_END, PAPER_ENGINE + '\n' + OLD_BODY_END, 1)

# ── 6. Expor _dvlSc para o click handler do canvas ────────────────────────────
# O draw() já tem sc local — precisamos de o expor para o handler de click
OLD_DRAW_SC = 'var sc=S.view;'
# Há várias ocorrências de var sc= no código. Vou procurar a que está dentro de draw()
# com o contexto específico do draw principal
OLD_DRAW_START = 'function draw(){'
count_draw = html.count(OLD_DRAW_START)
assert count_draw >= 1, f'draw() not found'

# Adicionar exposição do sc no draw — depois da linha que cria sc
OLD_SC_EXPOSE = (
    'if(!indicatorsReady)return;\n'
    '  if(!S.candles||!S.candles.length)return;'
)
if OLD_SC_EXPOSE in html:
    html = html.replace(OLD_SC_EXPOSE,
        'if(!indicatorsReady)return;\n'
        '  if(!S.candles||!S.candles.length)return;\n'
        '  if(window.DVL_PAPER&&DVL_PAPER.enabled)window._dvlSc=S.view;',
        1
    )

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_178.py applied — Beta 0.178')
print('  DVL Paper Trading Engine completo')
print('  Botão $ na toolbar (toggle painel)')
print('  4 abas: Trade / Posição / Histórico / Stats')
print('  Ordens: Market, Limit, Stop + SL/TP automático')
print('  Overlay no gráfico: linhas entrada/SL/TP, área PNL, label live')
print('  Persistência localStorage completa')
print('  Hooks: tick (aggTrade), candle close, draw overlay')
print('  API pública: DVL_PAPER.placeOrder/closePosition/updateStops/...')
