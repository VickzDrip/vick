#!/usr/bin/env python3
"""
patch_634.py  —  DVL Beta 0.633 → 0.634
Paper Trading integrado no painel existente (zero HTML novo):
  - Wallet card mostra saldo paper + PnL total
  - Entry card (já editável) = USDT a arriscar
  - Leverage slider (já existe) = alavancagem da posição
  - Buy → abre Long / fecha Long se já aberto
  - Sell → abre Short / fecha Short se já aberto
  - Long Liq / Short Liq = quando posição aberta: Liq + PnL
  - Canvas: ENTRY (azul), TP (verde), SL (vermelho) arrastáveis
  - Zero elementos HTML criados; zero modificação de layout
"""
import sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ERRO] NOT FOUND: {label}")
        sys.exit(1)
    if count > 1:
        print(f"[ERRO] AMBIGUOUS ({count}x): {label}")
        sys.exit(1)
    print(f"[OK] {label}")
    return html.replace(old, new, 1)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

# ── 1. Version bump ──────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.633";',
    'const DVL_APP_VERSION = "Beta 0.634";',
    "version constant"
)
html = rep(html,
    '>BETA 0.633</div>',
    '>BETA 0.634</div>',
    "version badge HTML"
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },',
    '{ version: DVL_APP_VERSION, note: "Feature: Paper Trading integrado no painel — Wallet, Liq, PnL, TP/SL no canvas." },\n  { version: "Beta 0.633", note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },',
    "changelog entry"
)

# ── 2. Adicionar IDs no Wallet card para atualização dinâmica ────────────────
html = rep(html,
    '          <div class="metricValue">1,716.45</div>\n          <div class="metricSub">USDT</div>',
    '          <div class="metricValue" id="ptWalletVal">1,716.45</div>\n          <div class="metricSub" id="ptWalletSub">USDT</div>',
    "wallet card IDs"
)

# ── 3. Hook DVL_PAPER.syncPanel() no final de syncTradePanel() ───────────────
html = rep(html,
    '  updateLiquidationPrices();\n}\n\nfunction updateLiquidationPrices(){',
    '  updateLiquidationPrices();\n  if(window.DVL_PAPER) DVL_PAPER.syncPanel();\n}\n\nfunction updateLiquidationPrices(){',
    "hook syncPanel in syncTradePanel"
)

# ── 4. Substituir _toggleDemoPos pelos handlers DVL_PAPER ────────────────────
html = rep(html,
    """// ── Demo position (Buy / Sell) ─────────────────────────────────────────────
function _toggleDemoPos(dir){
  const price = Number(ticker?.lastPrice || klines.at(-1)?.close || 0);
  if(!price){ showToast('Aguardando preço...'); return; }
  demoPos = (demoPos && demoPos.dir === dir) ? null : { dir, price };
  const buyBtn = document.getElementById('dvlBuyBtn');
  const selBtn = document.getElementById('dvlSellBtn');
  if(buyBtn) buyBtn.classList.toggle('is-active', !!demoPos && demoPos.dir === 'long');
  if(selBtn) selBtn.classList.toggle('is-active', !!demoPos && demoPos.dir === 'short');
  drawSoon();
}
document.getElementById('dvlBuyBtn')?.addEventListener('click', ()=>_toggleDemoPos('long'));
document.getElementById('dvlSellBtn')?.addEventListener('click', ()=>_toggleDemoPos('short'));""",
    """// ── Paper Trading Buy/Sell ──────────────────────────────────────────────────
document.getElementById('dvlBuyBtn')?.addEventListener('click', ()=>{
  if(window.DVL_PAPER) DVL_PAPER._trade('buy');
  else showToast('Paper Trading a inicializar...');
});
document.getElementById('dvlSellBtn')?.addEventListener('click', ()=>{
  if(window.DVL_PAPER) DVL_PAPER._trade('sell');
  else showToast('Paper Trading a inicializar...');
});""",
    "replace _toggleDemoPos with DVL_PAPER"
)

# ── 5. Adicionar chamada drawOverlay logo após drawDemoPosition ───────────────
html = rep(html,
    '  drawDemoPosition(ctx, {x0, x1, y0, y1, y, last});\n\n  window.__dvlLastCrossCfg = {',
    '  drawDemoPosition(ctx, {x0, x1, y0, y1, y, last});\n  if(window.DVL_PAPER) DVL_PAPER.drawOverlay(ctx, w, h, y, last, x0, x1, y0, y1);\n\n  window.__dvlLastCrossCfg = {',
    "inject DVL_PAPER drawOverlay call"
)

# ── 6. Hook onTick no _fastPoll ──────────────────────────────────────────────
html = rep(html,
    '      if(els.lastPrice) els.lastPrice.textContent = fmtPrice(+tk.lastPrice);\n      const ch = +tk.priceChangePercent||0;',
    '      if(els.lastPrice) els.lastPrice.textContent = fmtPrice(+tk.lastPrice);\n      if(window.DVL_PAPER) DVL_PAPER.onTick(+tk.lastPrice, symbol);\n      const ch = +tk.priceChangePercent||0;',
    "hook onTick in _fastPoll"
)

# ── 7. Script DVL_PAPER — pure canvas overlay + hooks no painel existente ─────
PAPER_SCRIPT = r"""<script id="DVL_BETA_0634_PAPER_TRADE">
(function(){
'use strict';

/* ═══════════════════════════════════════════════════════
   DVL Paper Trading — Beta 0.634
   Integra no painel existente, canvas overlay puro.
   ═══════════════════════════════════════════════════════ */

var SK = 'dvl_paper_v3';
var _drag=null, _scRef=null, _drawCache=[], _pendingMod=null, _uidN=1;

var DEF_ACC = {balance:10000, initialBalance:10000, realizedPnl:0};
var DEF_SET = {feePct:0.05, slippagePct:0.02, autoRR:1.5, autoSLMode:'atr', autoSLAtrMult:1.5, autoSLPct:0.3};
var ST = {account:null, positions:[], history:[], settings:null};

/* ── Helpers básicos ── */
function _sym(){ return window.symbol || 'BTCUSDT'; }
function _price(){
  var p = Number(window.ticker && window.ticker.lastPrice ? window.ticker.lastPrice : 0);
  if(!p && window.klines && window.klines.length) p = Number(window.klines[window.klines.length-1].close || 0);
  return p || 0;
}
function _lev(){ return Math.max(1, Math.round(Number(window.leverage) || 1)); }
function _amount(){ return Math.max(1, Number(window.entryAmount) || 100); }
function _uid(){ return 'pt'+(Date.now()%1000000000)+'_'+(++_uidN); }
function _f(n,d){ if(n==null||isNaN(n))return '—'; d=d!=null?d:2; return (n<0?'-':'')+Math.abs(n).toFixed(d); }
function _fp(n){ if(n==null||isNaN(n))return '—'; return (n>0?'+':'')+n.toFixed(2); }
function _fP(n){ if(n==null||isNaN(n))return '—'; return Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _toast(msg){ if(window.showToast) showToast(msg); }

/* ── Persistência ── */
function _save(){
  try{ localStorage.setItem(SK, JSON.stringify({account:ST.account, positions:ST.positions, history:ST.history, settings:ST.settings})); }catch(e){}
}
function _load(){
  try{
    var d = localStorage.getItem(SK);
    if(d){ d = JSON.parse(d);
      ST.account  = Object.assign({}, DEF_ACC, d.account||{});
      ST.positions = d.positions||[];
      ST.history   = d.history||[];
      ST.settings  = Object.assign({}, DEF_SET, d.settings||{});
      return;
    }
  }catch(e){}
  ST.account = Object.assign({},DEF_ACC); ST.positions=[]; ST.history=[];
  ST.settings = Object.assign({},DEF_SET);
}

/* ── Cálculos ── */
function _upnl(pos){
  var px=_price(); if(!px) return 0;
  return pos.side==='long'?(px-pos.entryPrice)*pos.qty:(pos.entryPrice-px)*pos.qty;
}
function _totalUpnl(){
  return ST.positions.reduce(function(s,p){ return s+(_upnl(p)||0); },0);
}
function _fee(n){ return n*ST.settings.feePct/100; }
function _liqPrice(pos){
  var lev=pos.leverage||1;
  return pos.side==='long'?pos.entryPrice*(1-1/lev+0.005):pos.entryPrice*(1+1/lev-0.005);
}
function _getATR(){
  var kl=window.klines; if(!kl||kl.length<14) return null;
  var cs=kl.slice(-14);
  var trs=cs.map(function(c,i){
    if(!i) return c.high-c.low;
    var p=cs[i-1]; return Math.max(c.high-c.low,Math.abs(c.high-p.close),Math.abs(c.low-p.close));
  });
  return trs.reduce(function(a,b){return a+b;},0)/trs.length;
}
function _autoSLTP(side,entry){
  var set=ST.settings, dist;
  if(set.autoSLMode==='atr'){ var atr=_getATR(); dist=atr?atr*set.autoSLAtrMult:entry*set.autoSLPct/100; }
  else dist=entry*set.autoSLPct/100;
  dist=Math.max(dist,entry*0.001);
  return side==='long'?{sl:entry-dist,tp:entry+dist*set.autoRR}:{sl:entry+dist,tp:entry-dist*set.autoRR};
}
function _applySlip(px,side){ var s=ST.settings.slippagePct/100; return side==='buy'?px*(1+s):px*(1-s); }

/* ── Open/Close posição ── */
function _doOpen(p){
  var fee=_fee(p.entryPrice*p.qty);
  ST.account.balance-=fee;
  var pos={
    id:_uid(), symbol:p.symbol||_sym(), side:p.side,
    entryPrice:p.entryPrice, qty:p.qty,
    notional:p.entryPrice*p.qty, leverage:p.lev||1, margin:p.margin||0,
    stopLoss:p.sl||null, takeProfit:p.tp||null,
    openFee:fee, unrealizedPnl:0, roe:0,
    openedAt:Date.now(), status:'open'
  };
  pos.liquidationPrice=_liqPrice(pos);
  ST.positions.push(pos);
  _save(); _updBtns(); syncPanel();
  if(window.drawSoon) drawSoon();
  return pos;
}
function _doClose(posId,reason,exitPx){
  var idx=ST.positions.findIndex(function(p){return p.id===posId;});
  if(idx<0) return null;
  var pos=ST.positions[idx];
  exitPx=exitPx||_price(); if(!exitPx) return null;
  var gross=pos.side==='long'?(exitPx-pos.entryPrice)*pos.qty:(pos.entryPrice-exitPx)*pos.qty;
  var closeFee=_fee(exitPx*pos.qty), net=gross-closeFee-(pos.openFee||0);
  var roe=pos.margin>0?net/pos.margin*100:0;
  ST.history.push({id:_uid(),symbol:pos.symbol,side:pos.side,entryPrice:pos.entryPrice,exitPrice:exitPx,qty:pos.qty,netPnl:net,roe:roe,openedAt:pos.openedAt,closedAt:Date.now(),reason:reason||'manual'});
  ST.account.balance+=net; ST.account.realizedPnl=(ST.account.realizedPnl||0)+net;
  ST.positions.splice(idx,1); _pendingMod=null;
  _save(); _updBtns(); syncPanel();
  if(window.drawSoon) drawSoon();
  var lbl=reason==='tp'?'Take Profit':reason==='sl'?'Stop Loss':'Fechado';
  _toast(lbl+' '+(net>=0?'+':'')+_f(net)+' USDT  ROE '+_fp(roe)+'%');
  return net;
}

/* ── Trade: usa entryAmount + leverage do painel existente ── */
function _trade(side){
  var px=_price(), sym=_sym();
  if(!px){ _toast('Aguardando preco...'); return; }
  var lev=_lev(), amount=_amount();
  /* fechar lado oposto */
  ST.positions.filter(function(p){
    return p.symbol===sym&&((side==='buy'&&p.side==='short')||(side==='sell'&&p.side==='long'));
  }).forEach(function(p){ _doClose(p.id,'manual',px); });
  /* toggle: mesmo lado já aberto → fecha */
  var same=ST.positions.filter(function(p){
    return p.symbol===sym&&((side==='buy'&&p.side==='long')||(side==='sell'&&p.side==='short'));
  });
  if(same.length){ same.forEach(function(p){ _doClose(p.id,'manual',px); }); return; }
  /* abrir nova posição */
  var fill=_applySlip(px,side);
  var notional=amount*lev, qty=notional/fill;
  var margin=amount; /* margin = entryAmount (já é a margem em USDT) */
  var dirn=side==='buy'?'long':'short';
  var auto=_autoSLTP(dirn,fill);
  _doOpen({symbol:sym,side:dirn,entryPrice:fill,qty:qty,lev:lev,margin:margin,sl:auto.sl,tp:auto.tp});
  _toast((dirn==='long'?'▲ Long':'▼ Short')+' '+sym+' @ '+_fP(fill)+'  x'+lev+'  $'+_f(notional,0));
}

/* ── onTick: checagem SL/TP + update PnL ── */
var _canLo={}, _canHi={};
function onTick(price,sym){
  sym=sym||_sym(); if(!price||isNaN(price)) return;
  _canLo[sym]=(_canLo[sym]===undefined)?price:Math.min(_canLo[sym],price);
  _canHi[sym]=(_canHi[sym]===undefined)?price:Math.max(_canHi[sym],price);
  var lo=_canLo[sym], hi=_canHi[sym];
  var changed=false;
  for(var i=ST.positions.length-1;i>=0;i--){
    var pos=ST.positions[i]; if(pos.symbol!==sym) continue;
    pos.unrealizedPnl=_upnl(pos); pos.roe=pos.margin>0?pos.unrealizedPnl/pos.margin*100:0;
    if(window._dvlPaperDragging||(_pendingMod&&_pendingMod.posId===pos.id)){ changed=true; continue; }
    var tp=pos.takeProfit!=null?+pos.takeProfit:null, sl=pos.stopLoss!=null?+pos.stopLoss:null;
    var validTP=tp!=null&&(pos.side==='long'?tp>pos.entryPrice:tp<pos.entryPrice);
    var hitTP=validTP&&(pos.side==='long'?hi>=tp:lo<=tp);
    var hitSL=sl!=null&&(pos.side==='long'?lo<=sl:hi>=sl);
    if(hitTP){ _doClose(pos.id,'tp',tp); continue; }
    if(hitSL){ _doClose(pos.id,'sl',sl); continue; }
    changed=true;
  }
  if(changed) syncPanel();
}

/* ── Atualiza estado visual dos botões Buy/Sell ── */
function _updBtns(){
  var sym=_sym();
  var bb=document.getElementById('dvlBuyBtn'), sb=document.getElementById('dvlSellBtn');
  var hasL=ST.positions.some(function(p){return p.symbol===sym&&p.side==='long';});
  var hasS=ST.positions.some(function(p){return p.symbol===sym&&p.side==='short';});
  if(bb) bb.classList.toggle('is-active',hasL);
  if(sb) sb.classList.toggle('is-active',hasS);
}

/* ── syncPanel: atualiza Wallet + Liq no painel existente ── */
function syncPanel(){
  var upnlTotal=_totalUpnl();
  /* Wallet card */
  var wv=document.getElementById('ptWalletVal');
  var ws=document.getElementById('ptWalletSub');
  if(wv) wv.textContent=_f(ST.account.balance,2);
  if(ws){
    if(upnlTotal!==0){
      ws.textContent=(upnlTotal>0?'+':'')+_f(upnlTotal,2)+' USDT';
      ws.style.color=upnlTotal>0?'#13dc8d':'#ff4a61';
      ws.style.fontWeight='700';
    } else {
      ws.textContent='USDT'; ws.style.color=''; ws.style.fontWeight='';
    }
  }
  /* Long Liq / Short Liq: override com dados reais quando posição aberta */
  var sym=_sym();
  var posL=ST.positions.find(function(p){return p.symbol===sym&&p.side==='long';});
  var posS=ST.positions.find(function(p){return p.symbol===sym&&p.side==='short';});
  var llEl=document.getElementById('longLiq');
  var slEl=document.getElementById('shortLiq');
  if(posL&&llEl){
    var upnl=posL.unrealizedPnl||_upnl(posL);
    llEl.textContent='Liq '+_fP(posL.liquidationPrice||0)+'  '+(upnl>=0?'+':'')+_f(upnl,2)+' USDT';
    llEl.style.color=upnl>=0?'#13dc8d':'#ff4a61';
  } else if(llEl){ llEl.style.color=''; }
  if(posS&&slEl){
    var upnl=posS.unrealizedPnl||_upnl(posS);
    slEl.textContent='Liq '+_fP(posS.liquidationPrice||0)+'  '+(upnl>=0?'+':'')+_f(upnl,2)+' USDT';
    slEl.style.color=upnl>=0?'#13dc8d':'#ff4a61';
  } else if(slEl){ slEl.style.color=''; }
}

/* ═══════════════════════════════════════════════════════
   Canvas overlay — ENTRY / TP / SL
   ═══════════════════════════════════════════════════════ */

function _rr(ctx,x,y,w,h,r){
  r=Math.min(r||5,Math.abs(w)/2,Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

/* Tag na escala de preços (direita) */
function _scaleTag(ctx,xR,y,bg,border,text){
  if(!isFinite(y)) return;
  ctx.save();
  ctx.font='bold 9px monospace'; ctx.textBaseline='middle'; ctx.textAlign='left';
  var padX=5, h=18, w=Math.max(66,ctx.measureText(text).width+padX*2+4);
  var x=xR+2, yy=Math.round(y-h/2);
  _rr(ctx,x,yy,w,h,4);
  ctx.fillStyle=bg; ctx.fill();
  ctx.lineWidth=1; ctx.strokeStyle=border; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.96)';
  ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=2;
  ctx.fillText(text,x+padX,y);
  ctx.shadowBlur=0; ctx.shadowColor='transparent';
  ctx.restore();
}

/* Label flutuante no gráfico (perto da linha, à esquerda da escala) */
function _lineLabel(ctx,xR,y,bg,border,text,posId,field,hasClose){
  if(!isFinite(y)) return;
  ctx.save();
  ctx.font='bold 9px monospace'; ctx.textBaseline='middle';
  var closeW=hasClose?22:0;
  var tw=ctx.measureText(text).width;
  var lw=Math.min(210,tw+16+closeW), lh=20;
  var lx=xR-lw-6, ly=y-lh/2;
  if(lx<4) lx=4;
  _rr(ctx,lx,ly,lw,lh,5);
  ctx.fillStyle=bg; ctx.fill();
  ctx.lineWidth=1; ctx.strokeStyle=border; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.rect(lx+5,ly+2,lw-10-closeW,lh-4); ctx.clip();
  ctx.fillStyle='rgba(240,250,255,.97)'; ctx.textAlign='left';
  ctx.shadowColor='rgba(0,0,0,.65)'; ctx.shadowBlur=2;
  ctx.fillText(text,lx+7,y);
  ctx.restore();
  if(hasClose){
    var cx=lx+lw-closeW;
    ctx.beginPath(); ctx.moveTo(cx,ly+3); ctx.lineTo(cx,ly+lh-3);
    ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='rgba(255,110,70,1)';
    ctx.font='bold 12px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('×',cx+closeW/2,y);
  }
  _drawCache.push({x:lx,y:ly,w:lw,h:lh,posId:posId,field:field,hasClose:hasClose,lineY:y});
  if(field==='tp'||field==='sl')
    _drawCache.push({x:0,y:y-14,w:xR,h:28,posId:posId,field:field,hasClose:false,lineY:y});
  ctx.restore();
}

function _softZone(ctx,x0z,x1z,yA,yB,color){
  if(!isFinite(yA)||!isFinite(yB)) return;
  var yt=Math.min(yA,yB), h=Math.abs(yA-yB); if(h<2) return;
  ctx.save(); ctx.fillStyle=color;
  ctx.fillRect(x0z,Math.max(-2,yt),x1z-x0z,Math.min(h,9999));
  ctx.restore();
}

function drawOverlay(ctx,W,H,yFn,lastPrice,x0,x1,y0,y1){
  var sym=_sym();
  var positions=ST.positions.filter(function(p){return p.symbol===sym;});
  if(!positions.length&&!_pendingMod) return;
  var xR=x1;
  _drawCache=[];

  /* atualiza referência de escala para drag */
  if(positions.length){
    var rp0=positions[0].entryPrice;
    var ry0=yFn(rp0), ry1=yFn(rp0*1.001);
    if(ry1!==ry0) _scRef={refY:ry0,refP:rp0,dpDy:(rp0*1.001-rp0)/(ry1-ry0)};
  }

  ctx.save();

  positions.forEach(function(pos){
    var yE  = yFn(pos.entryPrice);
    var ySL = pos.stopLoss   != null ? yFn(pos.stopLoss)   : null;
    var yTP = pos.takeProfit != null ? yFn(pos.takeProfit) : null;
    var isLong=pos.side==='long';
    var upnl =pos.unrealizedPnl||_upnl(pos);
    var feeR =ST.settings.feePct/100;
    var estTP=pos.takeProfit!=null?(isLong?(pos.takeProfit-pos.entryPrice)*pos.qty:(pos.entryPrice-pos.takeProfit)*pos.qty)-pos.takeProfit*pos.qty*feeR-(pos.openFee||0):null;
    var estSL=pos.stopLoss!=null  ?(isLong?(pos.stopLoss  -pos.entryPrice)*pos.qty:(pos.entryPrice-pos.stopLoss  )*pos.qty)-pos.stopLoss  *pos.qty*feeR-(pos.openFee||0):null;

    /* zonas suaves */
    if(yTP!=null) _softZone(ctx,x0,xR,yE,yTP,'rgba(0,180,90,.06)');
    if(ySL!=null) _softZone(ctx,x0,xR,yE,ySL,'rgba(220,60,55,.06)');

    /* TP */
    if(yTP!=null&&yTP>=-10&&yTP<=H+10){
      ctx.lineWidth=1; ctx.setLineDash([]); ctx.strokeStyle='rgba(0,195,95,.72)';
      ctx.beginPath(); ctx.moveTo(x0,yTP); ctx.lineTo(xR,yTP); ctx.stroke();
      _lineLabel(ctx,xR,yTP,'rgba(0,38,18,.90)','rgba(0,195,95,.9)',
        'TP '+(estTP!=null?_fp(estTP)+' USDT':'—'),pos.id,'tp',false);
      _scaleTag(ctx,xR,yTP,'rgba(0,130,62,.92)','rgba(0,195,95,1)',_fP(pos.takeProfit));
    }

    /* SL */
    if(ySL!=null&&ySL>=-10&&ySL<=H+10){
      ctx.lineWidth=1; ctx.setLineDash([]); ctx.strokeStyle='rgba(215,72,45,.72)';
      ctx.beginPath(); ctx.moveTo(x0,ySL); ctx.lineTo(xR,ySL); ctx.stroke();
      _lineLabel(ctx,xR,ySL,'rgba(34,8,4,.90)','rgba(215,90,58,.9)',
        'SL '+(estSL!=null?_fp(estSL)+' USDT':'—'),pos.id,'sl',false);
      _scaleTag(ctx,xR,ySL,'rgba(148,44,22,.92)','rgba(215,72,45,1)',_fP(pos.stopLoss));
    }

    /* ENTRY (dashed blue, × para fechar) */
    if(yE>=-10&&yE<=H+10){
      ctx.lineWidth=1.5; ctx.setLineDash([5,4]); ctx.strokeStyle='rgba(58,148,255,.72)';
      ctx.beginPath(); ctx.moveTo(x0,yE); ctx.lineTo(xR,yE); ctx.stroke();
      ctx.setLineDash([]);
      _lineLabel(ctx,xR,yE,'rgba(5,18,50,.92)','rgba(58,148,255,.9)',
        'ENTRY '+_fp(upnl)+' USDT',pos.id,'entry',true);
      _scaleTag(ctx,xR,yE,'rgba(18,48,128,.92)','rgba(58,148,255,1)',_fP(pos.entryPrice));
    }
  });

  /* preview de modificação pendente (após drag, antes de OK/Cancel) */
  if(_pendingMod&&_pendingMod.fields){
    var lf=_pendingMod.lastField||Object.keys(_pendingMod.fields)[0];
    var lv=_pendingMod.fields[lf]&&_pendingMod.fields[lf].newVal;
    if(lv!=null){
      var pmY=yFn(lv);
      if(pmY>=-10&&pmY<=H+10){
        Object.keys(_pendingMod.fields).forEach(function(f){
          var val=_pendingMod.fields[f].newVal; var yy=yFn(val);
          if(yy<-10||yy>H+10) return;
          var col=f==='tp'?'rgba(0,255,130,.72)':'rgba(255,100,68,.72)';
          ctx.lineWidth=1; ctx.setLineDash([2,3]); ctx.strokeStyle=col;
          ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(xR,yy); ctx.stroke(); ctx.setLineDash([]);
          ctx.font='bold 9px monospace'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
          ctx.shadowColor='rgba(0,0,0,.9)'; ctx.shadowBlur=4; ctx.fillStyle=col;
          ctx.fillText(f==='tp'?'TP':'SL',x0+6,yy-3);
          _scaleTag(ctx,xR,yy,f==='tp'?'rgba(0,120,58,.9)':'rgba(130,40,18,.9)',f==='tp'?'rgba(0,255,130,1)':'rgba(255,100,68,1)',_fP(val));
          ctx.shadowBlur=0; ctx.shadowColor='transparent';
        });
        /* botões OK / Cancel */
        var bW=42,bH=18,bY=Math.round((pmY+bH+16<H)?pmY+12:pmY-bH-12);
        var cX=xR-bW*2-7, cnX=xR-bW-4;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='rgba(0,145,65,.90)'; _rr(ctx,cX,bY,bW,bH,7); ctx.fill();
        ctx.lineWidth=1; ctx.strokeStyle='rgba(0,220,110,.65)'; ctx.stroke();
        ctx.font='bold 9px monospace'; ctx.fillStyle='#e6ffe6';
        ctx.shadowColor='rgba(0,0,0,.8)'; ctx.shadowBlur=3;
        ctx.fillText('OK',cX+bW/2,bY+bH/2);
        ctx.fillStyle='rgba(140,24,24,.90)'; _rr(ctx,cnX,bY,bW,bH,7); ctx.fill();
        ctx.lineWidth=1; ctx.strokeStyle='rgba(255,78,92,.65)'; ctx.stroke();
        ctx.fillStyle='#ffe6e6'; ctx.fillText('Cancel',cnX+bW/2,bY+bH/2);
        ctx.shadowBlur=0; ctx.shadowColor='transparent';
        _drawCache.push({x:cX, y:bY,w:bW,h:bH,posId:'_mod',field:'mod_confirm',hasClose:false,lineY:pmY});
        _drawCache.push({x:cnX,y:bY,w:bW,h:bH,posId:'_mod',field:'mod_cancel', hasClose:false,lineY:pmY});
      }
    }
  }

  ctx.restore();
}

/* ── Confirm / Cancel mod pendente ── */
function _confirmMod(){ if(!_pendingMod)return; _pendingMod=null; _save(); if(window.drawSoon)drawSoon(); }
function _cancelMod(){
  if(!_pendingMod)return;
  var pm=_pendingMod; _pendingMod=null;
  var p=ST.positions.find(function(p){return p.id===pm.posId;});
  if(p&&pm.fields) Object.keys(pm.fields).forEach(function(f){var ov=pm.fields[f].origVal;if(f==='tp')p.takeProfit=ov;else p.stopLoss=ov;});
  if(window.drawSoon)drawSoon();
}

/* ── Drag system no canvas ── */
function _initDrag(canvas){
  function _y(e){var t=e.touches?e.touches[0]:e,r=canvas.getBoundingClientRect();return t.clientY-r.top;}
  function _x(e){var t=e.touches?e.touches[0]:e,r=canvas.getBoundingClientRect();return t.clientX-r.left;}

  function _start(e){
    var cy=_y(e),cx=_x(e);
    /* 1 — OK/Cancel de mod pendente */
    for(var mi=0;mi<_drawCache.length;mi++){
      var mb=_drawCache[mi];
      if(mb.posId==='_mod'&&cx>=mb.x&&cx<=mb.x+mb.w&&cy>=mb.y&&cy<=mb.y+mb.h){
        e.preventDefault();e.stopPropagation();
        if(mb.field==='mod_confirm')_confirmMod();else _cancelMod();return;
      }
    }
    /* 2 — × fechar posição */
    for(var i=0;i<_drawCache.length;i++){
      var b=_drawCache[i];
      if(b.posId!=='_mod'&&b.hasClose&&cx>=b.x+b.w-24&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){
        e.preventDefault();e.stopPropagation();_doClose(b.posId,'manual');return;
      }
    }
    /* 3 — drag TP/SL */
    if(!_scRef)return;
    for(var j=0;j<_drawCache.length;j++){
      var bb=_drawCache[j];if(bb.posId==='_mod')continue;
      if((bb.field==='tp'||bb.field==='sl')&&Math.abs(cy-bb.lineY)<=14){
        e.preventDefault();e.stopPropagation();
        var pos=ST.positions.find(function(p){return p.id===bb.posId;});
        var ov=pos?(bb.field==='tp'?pos.takeProfit:pos.stopLoss):null;
        _drag={posId:bb.posId,field:bb.field,origVal:ov};
        window._dvlPaperDragging=true;return;
      }
    }
  }

  function _move(e){
    if(!_drag||!_scRef)return;
    e.preventDefault();e.stopPropagation();
    var newP=_scRef.refP+(_y(e)-_scRef.refY)*_scRef.dpDy;
    var pos=ST.positions.find(function(p){return p.id===_drag.posId;});
    if(!pos)return;
    if(_drag.field==='tp')pos.takeProfit=newP;else pos.stopLoss=newP;
    if(window.drawSoon)drawSoon();
  }

  function _end(){
    window._dvlPaperDragging=false;
    if(!_drag)return;
    var pos=ST.positions.find(function(p){return p.id===_drag.posId;});
    var nv=pos?(_drag.field==='tp'?pos.takeProfit:pos.stopLoss):null;
    if(nv!=null&&nv!==_drag.origVal){
      if(!_pendingMod||_pendingMod.posId!==_drag.posId)_pendingMod={posId:_drag.posId,lastField:_drag.field,fields:{}};
      _pendingMod.lastField=_drag.field;
      if(!_pendingMod.fields[_drag.field])_pendingMod.fields[_drag.field]={origVal:_drag.origVal,newVal:nv};
      else _pendingMod.fields[_drag.field].newVal=nv;
    }
    _drag=null;if(window.drawSoon)drawSoon();
  }

  canvas.addEventListener('mousedown',_start);
  canvas.addEventListener('mousemove',_move);
  canvas.addEventListener('mouseup',_end);
  canvas.addEventListener('touchstart',_start,{passive:false});
  canvas.addEventListener('touchmove',_move,{passive:false});
  canvas.addEventListener('touchend',_end);
}

/* ── Init: apenas canvas drag + sync inicial ── */
function _init(){
  var canvas=document.getElementById('chart');
  if(canvas) _initDrag(canvas);
  _updBtns(); syncPanel();
}

_load();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_init);
else _init();

/* ── API pública ── */
window.DVL_PAPER={
  drawOverlay : drawOverlay,
  onTick      : onTick,
  syncPanel   : syncPanel,
  _trade      : _trade,
  getPositions: function(){ return ST.positions.slice(); },
  getBalance  : function(){ return ST.account && ST.account.balance; }
};

})();
</script>

</body>
</html>"""

html = rep(html,
    '\n</body>\n</html>',
    '\n' + PAPER_SCRIPT,
    "inject DVL_PAPER script"
)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n✓ patch_634 aplicado — {SRC}")
