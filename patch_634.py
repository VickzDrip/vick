#!/usr/bin/env python3
"""
patch_634.py  —  DVL Beta 0.633 → 0.634
Paper Trading overlay (inspirado no Beta 0.334):
  - Buy/Sell abrem posição com SL/TP automático (ATR-based)
  - Linha de entrada (azul tracejada), TP (verde), SL (vermelho) no gráfico
  - Zonas coloridas suaves entre entrada e TP/SL
  - Tags de preço na escala direita
  - TP/SL arrastáveis com OK/Cancel
  - × na label de entrada fecha a posição
  - Tira de status abaixo dos botões Buy/Sell (Entry/SL/TP/PnL)
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

# ── 1. Version bump ───────────────────────────────────────────────────────────
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
    '{ version: DVL_APP_VERSION, note: "Feature: Paper Trading — TP/SL arrastáveis no gráfico, zonas coloridas, tags, histórico." },\n  { version: "Beta 0.633", note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },',
    "changelog entry"
)

# ── 2. Replace _toggleDemoPos handlers with DVL_PAPER delegation ──────────────
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
    """// ── Paper Trading Buy/Sell (delegado para DVL_PAPER) ──────────────────────
document.getElementById('dvlBuyBtn')?.addEventListener('click', ()=>{
  if(window.DVL_PAPER) DVL_PAPER._quickOrder('buy');
  else showToast('Paper Trading a inicializar...');
});
document.getElementById('dvlSellBtn')?.addEventListener('click', ()=>{
  if(window.DVL_PAPER) DVL_PAPER._quickOrder('sell');
  else showToast('Paper Trading a inicializar...');
});""",
    "replace _toggleDemoPos with DVL_PAPER handlers"
)

# ── 3. Add DVL_PAPER drawOverlay call after existing drawDemoPosition call ────
html = rep(html,
    '  drawDemoPosition(ctx, {x0, x1, y0, y1, y, last});\n\n  window.__dvlLastCrossCfg = {',
    '  drawDemoPosition(ctx, {x0, x1, y0, y1, y, last});\n  if(window.DVL_PAPER) DVL_PAPER.drawOverlay(ctx, w, h, y, last, x0, x1, y0, y1);\n\n  window.__dvlLastCrossCfg = {',
    "inject DVL_PAPER drawOverlay call"
)

# ── 4. Hook onTick into _fastPoll after ticker update ────────────────────────
html = rep(html,
    '      if(els.lastPrice) els.lastPrice.textContent = fmtPrice(+tk.lastPrice);\n      const ch = +tk.priceChangePercent||0;',
    '      if(els.lastPrice) els.lastPrice.textContent = fmtPrice(+tk.lastPrice);\n      if(window.DVL_PAPER) DVL_PAPER.onTick(+tk.lastPrice, symbol);\n      const ch = +tk.priceChangePercent||0;',
    "hook onTick in _fastPoll"
)

# ── 5. Inject full DVL_PAPER script block before </body> ──────────────────────
DVL_PAPER_SCRIPT = r"""<script id="DVL_BETA_0634_PAPER_TRADE">
(function(){
'use strict';

// ── State ──────────────────────────────────────────────────────────────────
var SK = 'dvl_paper_v3';
var _drag = null;
var _scRef = null;
var _drawCache = [];
var _pendingMod = null;
var _uidN = 1;

var DEF_ACC = {balance:10000, initialBalance:10000, realizedPnl:0, currency:'USDT'};
var DEF_SET = {
  leverage:1, feePct:0.05, slippagePct:0.02,
  riskPct:1, autoRR:1.5, autoSLMode:'atr',
  autoSLAtrMult:1.5, autoSLPct:0.3
};

var ST = {
  account: null,
  positions: [],
  history: [],
  settings: null
};

// ── Helpers ────────────────────────────────────────────────────────────────
function _sym(){ return window.symbol || 'BTCUSDT'; }

function _price(){
  var p = Number(window.ticker && window.ticker.lastPrice ? window.ticker.lastPrice : 0);
  if(!p && window.klines && window.klines.length)
    p = Number(window.klines[window.klines.length-1].close || 0);
  return p || 0;
}

function _uid(){ return 'pt'+(Date.now()%1000000000)+'_'+(++_uidN); }

function _save(){
  try{
    localStorage.setItem(SK, JSON.stringify({
      account:ST.account, positions:ST.positions,
      history:ST.history, settings:ST.settings
    }));
  }catch(e){}
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
  _initDefault();
}

function _initDefault(){
  ST.account   = Object.assign({}, DEF_ACC);
  ST.positions = []; ST.history = [];
  ST.settings  = Object.assign({}, DEF_SET);
}

function _upnl(pos){
  var px = _price(); if(!px) return 0;
  return pos.side==='long'
    ? (px - pos.entryPrice) * pos.qty
    : (pos.entryPrice - px) * pos.qty;
}

function _getATR(){
  var kl = window.klines;
  if(!kl || kl.length < 14) return null;
  var cs = kl.slice(-14);
  var trs = cs.map(function(c, i){
    if(!i) return c.high - c.low;
    var p = cs[i-1];
    return Math.max(c.high-c.low, Math.abs(c.high-p.close), Math.abs(c.low-p.close));
  });
  return trs.reduce(function(a,b){return a+b;}, 0) / trs.length;
}

function _autoSLTP(side, entry){
  var set = ST.settings;
  var dist;
  if(set.autoSLMode === 'atr'){
    var atr = _getATR();
    dist = atr ? atr * set.autoSLAtrMult : entry * set.autoSLPct / 100;
  } else {
    dist = entry * set.autoSLPct / 100;
  }
  dist = Math.max(dist, entry * 0.001);
  return side === 'long'
    ? {sl: entry - dist, tp: entry + dist * set.autoRR}
    : {sl: entry + dist, tp: entry - dist * set.autoRR};
}

function _applySlip(price, side){
  var s = ST.settings.slippagePct / 100;
  return side === 'buy' ? price*(1+s) : price*(1-s);
}
function _fee(notional){ return notional * ST.settings.feePct / 100; }
function _liqPrice(pos){
  var lev = pos.leverage || 1;
  return pos.side === 'long'
    ? pos.entryPrice * (1 - 1/lev + 0.005)
    : pos.entryPrice * (1 + 1/lev - 0.005);
}

function _f(n, d){ if(n==null||isNaN(n)) return '—'; d=d!=null?d:2; return (n<0?'-':'')+Math.abs(n).toFixed(d); }
function _fp(n){ if(n==null||isNaN(n)) return '—'; return (n>0?'+':'')+n.toFixed(2); }
function _fPrice(n){
  if(n==null||isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ── Open / Close positions ─────────────────────────────────────────────────
function _doOpen(p){
  var set = ST.settings;
  var notional = p.entryPrice * p.qty;
  var margin   = notional / (set.leverage || 1);
  var fee      = _fee(notional);
  ST.account.balance -= fee;
  var pos = {
    id: _uid(), symbol: p.symbol || _sym(),
    side: p.side, entryPrice: p.entryPrice, qty: p.qty,
    notional: notional, leverage: set.leverage || 1, margin: margin,
    stopLoss: p.sl || null, takeProfit: p.tp || null,
    openFee: fee, unrealizedPnl: 0, roe: 0,
    openedAt: Date.now(), status: 'open'
  };
  pos.liquidationPrice = _liqPrice(pos);
  ST.positions.push(pos);
  _save(); _updateStrip();
  if(window.drawSoon) drawSoon();
  return pos;
}

function _doClose(posId, reason, exitPx){
  var idx = ST.positions.findIndex(function(p){return p.id===posId;});
  if(idx < 0) return null;
  var pos = ST.positions[idx];
  exitPx = exitPx || _price();
  if(!exitPx) return null;
  var gross = pos.side==='long'
    ? (exitPx - pos.entryPrice) * pos.qty
    : (pos.entryPrice - exitPx) * pos.qty;
  var closeFee = _fee(exitPx * pos.qty);
  var net  = gross - closeFee - (pos.openFee || 0);
  var roe  = pos.margin > 0 ? net / pos.margin * 100 : 0;
  ST.history.push({
    id:_uid(), symbol:pos.symbol, side:pos.side,
    entryPrice:pos.entryPrice, exitPrice:exitPx, qty:pos.qty,
    netPnl:net, roe:roe,
    openedAt:pos.openedAt, closedAt:Date.now(), reason:reason||'manual'
  });
  ST.account.balance += net;
  ST.account.realizedPnl = (ST.account.realizedPnl||0) + net;
  ST.positions.splice(idx, 1);
  _pendingMod = null;
  _save(); _updateStrip();
  if(window.drawSoon) drawSoon();
  var label = reason==='tp'?'Take Profit' : reason==='sl'?'Stop Loss' : 'Fechado';
  var s = net>=0?'+':'';
  if(window.showToast) showToast(label+' '+s+_f(net)+' USDT  ROE '+_fp(roe)+'%');
  return net;
}

// ── Quick Order (Buy/Sell buttons) ────────────────────────────────────────
function _quickOrder(side){
  var px  = _price();
  var sym = _sym();
  if(!px){ if(window.showToast) showToast('Aguardando preço...'); return; }

  // Close opposite side
  ST.positions.filter(function(p){
    return p.symbol===sym && p.status==='open' &&
           ((side==='buy'&&p.side==='short')||(side==='sell'&&p.side==='long'));
  }).forEach(function(p){ _doClose(p.id,'manual',px); });

  // Toggle: same side already open → close it
  var same = ST.positions.filter(function(p){
    return p.symbol===sym && p.status==='open' &&
           ((side==='buy'&&p.side==='long')||(side==='sell'&&p.side==='short'));
  });
  if(same.length){ same.forEach(function(p){_doClose(p.id,'manual',px);}); return; }

  // Open new position
  var fill = _applySlip(px, side);
  var dirn = side==='buy' ? 'long' : 'short';
  var auto = _autoSLTP(dirn, fill);
  var slDist = Math.abs(fill - auto.sl);
  var qty = slDist > 0
    ? (ST.settings.riskPct / 100 * ST.account.balance) / slDist
    : 0.001;
  qty = Math.max(0.001, qty);
  _doOpen({symbol:sym, side:dirn, entryPrice:fill, qty:qty, sl:auto.sl, tp:auto.tp});
  if(window.showToast) showToast((dirn==='long'?'Long':'Short')+' '+sym+' @ '+_f(fill,2));
}

// ── onTick: update PnL + check SL/TP ─────────────────────────────────────
var _canLo = {}, _canHi = {};

function onTick(price, sym){
  sym = sym || _sym();
  if(!price || isNaN(price)) return;
  _canLo[sym] = (_canLo[sym]===undefined) ? price : Math.min(_canLo[sym], price);
  _canHi[sym] = (_canHi[sym]===undefined) ? price : Math.max(_canHi[sym], price);
  var lo = _canLo[sym], hi = _canHi[sym];
  var changed = false;
  for(var i = ST.positions.length-1; i >= 0; i--){
    var pos = ST.positions[i];
    if(pos.symbol !== sym) continue;
    pos.unrealizedPnl = _upnl(pos);
    pos.roe = pos.margin > 0 ? pos.unrealizedPnl / pos.margin * 100 : 0;
    if(window._dvlPaperDragging || (_pendingMod && _pendingMod.posId===pos.id)){
      changed = true; continue;
    }
    var tp  = pos.takeProfit != null ? +pos.takeProfit : null;
    var sl  = pos.stopLoss   != null ? +pos.stopLoss   : null;
    var validTP = tp!=null && (pos.side==='long' ? tp>pos.entryPrice : tp<pos.entryPrice);
    var hitTP   = validTP && (pos.side==='long' ? hi>=tp : lo<=tp);
    var hitSL   = sl!=null && (pos.side==='long' ? lo<=sl : hi>=sl);
    if(hitTP){ _doClose(pos.id,'tp',tp); continue; }
    if(hitSL){ _doClose(pos.id,'sl',sl); continue; }
    changed = true;
  }
  if(changed) _updateStrip();
}

// ── Button active state ───────────────────────────────────────────────────
function _updateBtnState(){
  var sym = _sym();
  var buyBtn = document.getElementById('dvlBuyBtn');
  var selBtn = document.getElementById('dvlSellBtn');
  var hasLong  = ST.positions.some(function(p){return p.symbol===sym&&p.side==='long';});
  var hasShort = ST.positions.some(function(p){return p.symbol===sym&&p.side==='short';});
  if(buyBtn) buyBtn.classList.toggle('is-active', hasLong);
  if(selBtn) selBtn.classList.toggle('is-active', hasShort);
}

// ── Summary strip ─────────────────────────────────────────────────────────
function _updateStrip(){
  _updateBtnState();
  var strip = document.getElementById('dvlPaperStrip');
  if(!strip) return;
  var sym  = _sym();
  var poss = ST.positions.filter(function(p){return p.symbol===sym;});
  if(!poss.length){ strip.style.display='none'; return; }
  var pos  = poss[0];
  var upnl = pos.unrealizedPnl || _upnl(pos);
  var clr  = pos.side==='long' ? '#13dc8d' : '#ff4a61';
  strip.style.display = 'flex';
  strip.innerHTML =
    '<span class="dps-side" style="color:'+clr+'">'+(pos.side==='long'?'LONG':'SHORT')+'</span>'+
    '<span class="dps-k">Entry</span><span class="dps-v">'+_f(pos.entryPrice,2)+'</span>'+
    '<span class="dps-k">SL</span><span class="dps-v neg">'+(pos.stopLoss!=null?_f(pos.stopLoss,2):'—')+'</span>'+
    '<span class="dps-k">TP</span><span class="dps-v pos">'+(pos.takeProfit!=null?_f(pos.takeProfit,2):'—')+'</span>'+
    '<span class="dps-pnl '+(upnl>=0?'pos':'neg')+'">'+_fp(upnl)+' USDT</span>'+
    '<button class="dps-close" onclick="window.DVL_PAPER&&DVL_PAPER._closeAll()">×</button>';
}

function _closeAll(){
  var sym = _sym(), px = _price();
  ST.positions.filter(function(p){return p.symbol===sym;})
    .forEach(function(p){_doClose(p.id,'manual',px);});
}

// ── Canvas overlay helpers ─────────────────────────────────────────────────
function _rr(ctx, x, y, w, h, r){
  r = Math.min(r||6, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

function _alphaColor(color, alpha){
  return color.replace(/[\d.]+\)$/, alpha+')');
}

function _drawScaleTag(ctx, xR, y, color, text){
  if(y==null || !isFinite(y)) return;
  ctx.save();
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  var padX=6, h2=18;
  var w = Math.max(60, ctx.measureText(text).width + padX*2);
  var x = xR+3, yy = Math.round(y - h2/2);
  _rr(ctx, x, yy, w, h2, 4);
  ctx.fillStyle = _alphaColor(color, '0.90');
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = '#05080d';
  ctx.shadowColor = 'rgba(255,255,255,0.15)';
  ctx.shadowBlur = 1;
  ctx.fillText(text, x+w-padX, y);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.restore();
}

function _drawSoftZone(ctx, x0z, x1z, yA, yB, color){
  if(yA==null || yB==null || !isFinite(yA) || !isFinite(yB)) return;
  var yt = Math.min(yA,yB), h = Math.abs(yA-yB);
  if(h < 3) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x0z, Math.max(-2, yt), x1z-x0z, Math.min(h, 9999));
  ctx.restore();
}

function _drawLineLabel(ctx, xR, y, bgColor, borderColor, text, posId, field, hasClose){
  ctx.save();
  ctx.font = 'bold 9px monospace';
  ctx.textBaseline = 'middle';
  var maxW   = Math.min(210, Math.max(90, xR-12));
  var closeW = hasClose ? 22 : 0;
  var tw = Math.min(ctx.measureText(text).width, maxW-closeW-14);
  var lw = Math.min(maxW, tw+14+closeW), lh=21;
  var lx = xR-lw-5, ly = y-lh/2;
  if(lx < 4) lx = 4;
  _rr(ctx, lx, ly, lw, lh, 6);
  ctx.fillStyle = bgColor || 'rgba(4,10,20,.92)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = borderColor || 'rgba(80,160,255,.9)';
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(lx+6, ly+2, lw-12-closeW, lh-4);
  ctx.clip();
  ctx.fillStyle = 'rgba(235,245,255,.96)';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,.75)';
  ctx.shadowBlur = 3;
  ctx.fillText(text, lx+7, y);
  ctx.restore();
  if(hasClose){
    var cx = lx+lw-closeW;
    ctx.beginPath();
    ctx.moveTo(cx, ly+3); ctx.lineTo(cx, ly+lh-3);
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,90,1)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×', cx+closeW/2, y);
  }
  _drawCache.push({x:lx, y:ly, w:lw, h:lh, posId:posId, field:field, hasClose:hasClose, lineY:y});
  if(field==='tp' || field==='sl')
    _drawCache.push({x:0, y:y-14, w:xR, h:28, posId:posId, field:field, hasClose:false, lineY:y});
  ctx.restore();
}

// ── Main canvas overlay ────────────────────────────────────────────────────
function drawOverlay(ctx, W, H, yFn, lastPrice, x0, x1, y0, y1){
  var sym = _sym();
  var positions = ST.positions.filter(function(p){return p.symbol===sym;});
  if(!positions.length && !_pendingMod) return;
  var xR = x1;
  _drawCache = [];

  // Update scale ref for dragging price←→pixel conversion
  if(positions.length){
    var rp0 = positions[0].entryPrice;
    var ry0  = yFn(rp0), ry1 = yFn(rp0*1.001);
    if(ry1 !== ry0)
      _scRef = {refY:ry0, refP:rp0, dpDy:(rp0*1.001-rp0)/(ry1-ry0)};
  }

  ctx.save();

  positions.forEach(function(pos){
    var yE  = yFn(pos.entryPrice);
    var ySL = pos.stopLoss   != null ? yFn(pos.stopLoss)   : null;
    var yTP = pos.takeProfit != null ? yFn(pos.takeProfit) : null;
    var isLong = pos.side === 'long';
    var upnl   = pos.unrealizedPnl || _upnl(pos);
    var feeRate = ST.settings.feePct / 100;

    var estTP = pos.takeProfit != null
      ? (isLong ? (pos.takeProfit-pos.entryPrice)*pos.qty : (pos.entryPrice-pos.takeProfit)*pos.qty)
        - pos.takeProfit*pos.qty*feeRate - (pos.openFee||0)
      : null;
    var estSL = pos.stopLoss != null
      ? (isLong ? (pos.stopLoss-pos.entryPrice)*pos.qty : (pos.entryPrice-pos.stopLoss)*pos.qty)
        - pos.stopLoss*pos.qty*feeRate - (pos.openFee||0)
      : null;

    // Soft color zones behind candles
    if(yTP != null) _drawSoftZone(ctx, x0, xR-4, yE, yTP, 'rgba(0,190,100,.055)');
    if(ySL != null) _drawSoftZone(ctx, x0, xR-4, yE, ySL, 'rgba(230,70,70,.052)');

    // TP line
    if(yTP != null && yTP>=-10 && yTP<=H+10){
      ctx.lineWidth=1; ctx.setLineDash([]); ctx.strokeStyle='rgba(0,200,100,.75)';
      ctx.beginPath(); ctx.moveTo(x0,yTP); ctx.lineTo(xR,yTP); ctx.stroke();
      var tpTxt = 'TP ' + (estTP!=null ? _fp(estTP)+' USDT' : '—');
      _drawLineLabel(ctx,xR,yTP,'rgba(0,30,20,.85)','rgba(0,200,100,1)',tpTxt,pos.id,'tp',false);
      _drawScaleTag(ctx,xR,yTP,'rgba(0,200,100,1)',_fPrice(pos.takeProfit));
    }

    // SL line
    if(ySL != null && ySL>=-10 && ySL<=H+10){
      ctx.lineWidth=1; ctx.setLineDash([]); ctx.strokeStyle='rgba(220,80,50,.75)';
      ctx.beginPath(); ctx.moveTo(x0,ySL); ctx.lineTo(xR,ySL); ctx.stroke();
      var slTxt = 'SL ' + (estSL!=null ? _fp(estSL)+' USDT' : '—');
      _drawLineLabel(ctx,xR,ySL,'rgba(30,10,5,.85)','rgba(220,100,70,1)',slTxt,pos.id,'sl',false);
      _drawScaleTag(ctx,xR,ySL,'rgba(220,80,50,1)',_fPrice(pos.stopLoss));
    }

    // Entry line (dashed blue with × close button)
    if(yE>=-10 && yE<=H+10){
      ctx.lineWidth=1.5; ctx.setLineDash([4,3]); ctx.strokeStyle='rgba(80,160,255,.75)';
      ctx.beginPath(); ctx.moveTo(x0,yE); ctx.lineTo(xR,yE); ctx.stroke();
      ctx.setLineDash([]);
      var eTxt = 'ENTRY ' + _fp(upnl) + ' USDT';
      _drawLineLabel(ctx,xR,yE,'rgba(5,20,50,.9)','rgba(80,160,255,1)',eTxt,pos.id,'entry',true);
      _drawScaleTag(ctx,xR,yE,'rgba(80,160,255,1)',_fPrice(pos.entryPrice));
    }
  });

  // Pending modification preview (after drag, before OK/Cancel)
  if(_pendingMod && _pendingMod.fields){
    var lf  = _pendingMod.lastField || Object.keys(_pendingMod.fields)[0];
    var lv  = _pendingMod.fields[lf] && _pendingMod.fields[lf].newVal;
    var pmY = yFn(lv);
    if(pmY>=-10 && pmY<=H+10){
      Object.keys(_pendingMod.fields).forEach(function(f){
        var val = _pendingMod.fields[f].newVal;
        var yy  = yFn(val);
        if(yy<-10 || yy>H+10) return;
        var col = f==='tp' ? 'rgba(0,255,140,.75)' : 'rgba(255,110,80,.75)';
        ctx.lineWidth=1; ctx.setLineDash([2,3]); ctx.strokeStyle=col;
        ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(xR,yy); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font='bold 9px monospace'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
        ctx.shadowColor='rgba(0,0,0,.9)'; ctx.shadowBlur=4; ctx.fillStyle=col;
        ctx.fillText(f==='tp'?'TP':'SL', x0+6, yy-3);
        _drawScaleTag(ctx,xR,yy, f==='tp'?'rgba(0,255,140,1)':'rgba(255,110,80,1)', _fPrice(val));
        ctx.shadowBlur=0; ctx.shadowColor='transparent';
      });
      // OK / Cancel buttons
      var bW=42, bH=18;
      var btnY = (pmY+bH+16 < H) ? (pmY+12) : (pmY-bH-12);
      var bY   = Math.round(btnY);
      var confirmX = xR-bW*2-7, cancelX = xR-bW-4;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(0,155,72,.88)'; _rr(ctx,confirmX,bY,bW,bH,7); ctx.fill();
      ctx.lineWidth=1; ctx.strokeStyle='rgba(36,224,120,.65)'; ctx.stroke();
      ctx.font='bold 9px monospace'; ctx.fillStyle='#efffef';
      ctx.shadowColor='rgba(0,0,0,.85)'; ctx.shadowBlur=3;
      ctx.fillText('OK', confirmX+bW/2, bY+bH/2);
      ctx.fillStyle='rgba(155,28,28,.88)'; _rr(ctx,cancelX,bY,bW,bH,7); ctx.fill();
      ctx.lineWidth=1; ctx.strokeStyle='rgba(255,86,104,.65)'; ctx.stroke();
      ctx.fillStyle='#ffefef';
      ctx.fillText('Cancel', cancelX+bW/2, bY+bH/2);
      ctx.shadowBlur=0; ctx.shadowColor='transparent';
      _drawCache.push({x:confirmX,y:bY,w:bW,h:bH,posId:'_mod',field:'mod_confirm',hasClose:false,lineY:pmY});
      _drawCache.push({x:cancelX, y:bY,w:bW,h:bH,posId:'_mod',field:'mod_cancel', hasClose:false,lineY:pmY});
    }
  }

  ctx.restore();
  _updateStrip();
}

// ── Pending mod confirm / cancel ───────────────────────────────────────────
function _confirmMod(){
  if(!_pendingMod) return;
  _pendingMod = null;
  _save(); if(window.drawSoon) drawSoon();
}

function _cancelMod(){
  if(!_pendingMod) return;
  var pm = _pendingMod; _pendingMod = null;
  var p  = ST.positions.find(function(p){return p.id===pm.posId;});
  if(p && pm.fields){
    Object.keys(pm.fields).forEach(function(f){
      var ov = pm.fields[f].origVal;
      if(f==='tp') p.takeProfit = ov; else p.stopLoss = ov;
    });
  }
  if(window.drawSoon) drawSoon();
}

// ── Drag system ────────────────────────────────────────────────────────────
function _initDrag(canvas){
  function _getY(e){ var t=e.touches?e.touches[0]:e; var r=canvas.getBoundingClientRect(); return t.clientY-r.top; }
  function _getX(e){ var t=e.touches?e.touches[0]:e; var r=canvas.getBoundingClientRect(); return t.clientX-r.left; }

  function _start(e){
    var cy=_getY(e), cx=_getX(e);

    // 1. Pending mod OK / Cancel buttons
    for(var mi=0; mi<_drawCache.length; mi++){
      var mb = _drawCache[mi];
      if(mb.posId==='_mod' && cx>=mb.x && cx<=mb.x+mb.w && cy>=mb.y && cy<=mb.y+mb.h){
        e.preventDefault(); e.stopPropagation();
        if(mb.field==='mod_confirm') _confirmMod(); else _cancelMod();
        return;
      }
    }

    // 2. Close (×) buttons on entry labels
    for(var i=0; i<_drawCache.length; i++){
      var b = _drawCache[i];
      if(b.posId!=='_mod' && b.hasClose && cx>=b.x+b.w-24 && cx<=b.x+b.w && cy>=b.y && cy<=b.y+b.h){
        e.preventDefault(); e.stopPropagation();
        _doClose(b.posId, 'manual');
        return;
      }
    }

    // 3. TP / SL drag handles
    if(!_scRef) return;
    for(var j=0; j<_drawCache.length; j++){
      var bb = _drawCache[j];
      if(bb.posId==='_mod') continue;
      if((bb.field==='tp'||bb.field==='sl') && Math.abs(cy-bb.lineY)<=14){
        e.preventDefault(); e.stopPropagation();
        var pos = ST.positions.find(function(p){return p.id===bb.posId;});
        var ov  = pos ? (bb.field==='tp' ? pos.takeProfit : pos.stopLoss) : null;
        _drag = {posId:bb.posId, field:bb.field, startY:cy, origVal:ov};
        window._dvlPaperDragging = true;
        return;
      }
    }
  }

  function _move(e){
    if(!_drag || !_scRef) return;
    e.preventDefault(); e.stopPropagation();
    var cy       = _getY(e);
    var newPrice = _scRef.refP + (cy - _scRef.refY) * _scRef.dpDy;
    var pos      = ST.positions.find(function(p){return p.id===_drag.posId;});
    if(!pos) return;
    if(_drag.field==='tp') pos.takeProfit = newPrice; else pos.stopLoss = newPrice;
    if(window.drawSoon) drawSoon();
  }

  function _end(){
    window._dvlPaperDragging = false;
    if(!_drag) return;
    var pos    = ST.positions.find(function(p){return p.id===_drag.posId;});
    var newVal = pos ? (_drag.field==='tp' ? pos.takeProfit : pos.stopLoss) : null;
    if(newVal != null && newVal !== _drag.origVal){
      if(!_pendingMod || _pendingMod.posId !== _drag.posId)
        _pendingMod = {posId:_drag.posId, lastField:_drag.field, fields:{}};
      _pendingMod.lastField = _drag.field;
      if(!_pendingMod.fields[_drag.field])
        _pendingMod.fields[_drag.field] = {origVal:_drag.origVal, newVal:newVal};
      else
        _pendingMod.fields[_drag.field].newVal = newVal;
    }
    _drag = null;
    if(window.drawSoon) drawSoon();
  }

  canvas.addEventListener('mousedown',  _start);
  canvas.addEventListener('mousemove',  _move);
  canvas.addEventListener('mouseup',    _end);
  canvas.addEventListener('touchstart', _start, {passive:false});
  canvas.addEventListener('touchmove',  _move,  {passive:false});
  canvas.addEventListener('touchend',   _end);
}

// ── DOM injection (CSS + summary strip + drag init) ───────────────────────
function _injectUI(){
  // CSS
  var style = document.createElement('style');
  style.textContent =
    '#dvlPaperStrip{' +
    '  display:none;align-items:center;gap:5px;padding:4px 10px;' +
    '  font-size:9px;font-family:monospace;font-weight:600;letter-spacing:.3px;' +
    '  background:rgba(4,12,24,.88);' +
    '  border-top:1px solid rgba(40,70,110,.22);' +
    '  border-bottom:1px solid rgba(40,70,110,.22);' +
    '  flex-wrap:wrap;' +
    '}' +
    '#dvlPaperStrip .dps-side{font-size:10px;font-weight:900;letter-spacing:.6px;margin-right:2px;}' +
    '#dvlPaperStrip .dps-k{color:rgba(130,160,200,.65);}' +
    '#dvlPaperStrip .dps-v{color:rgba(210,230,255,.92);}' +
    '#dvlPaperStrip .dps-v.pos{color:#13dc8d;}' +
    '#dvlPaperStrip .dps-v.neg{color:#ff4a61;}' +
    '#dvlPaperStrip .dps-pnl{margin-left:auto;font-size:10px;}' +
    '#dvlPaperStrip .dps-pnl.pos{color:#13dc8d;}' +
    '#dvlPaperStrip .dps-pnl.neg{color:#ff4a61;}' +
    '#dvlPaperStrip .dps-close{' +
    '  margin-left:4px;width:18px;height:18px;border-radius:50%;' +
    '  border:1px solid rgba(255,74,97,.35);background:rgba(255,74,97,.10);' +
    '  color:#ff4a61;cursor:pointer;font-size:13px;line-height:1;' +
    '  display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
    '}' +
    '#dvlPaperStrip .dps-close:hover{background:rgba(255,74,97,.28);}';
  document.head.appendChild(style);

  // Summary strip: inject after the Buy/Sell button row
  var sellBtn = document.getElementById('dvlSellBtn');
  if(sellBtn){
    var rowDiv = sellBtn.parentNode;          // panelRowTop or equivalent wrapper
    var strip  = document.createElement('div');
    strip.id   = 'dvlPaperStrip';
    if(rowDiv && rowDiv.parentNode){
      rowDiv.parentNode.insertBefore(strip, rowDiv.nextSibling);
    } else {
      document.body.appendChild(strip);
    }
  }

  // Attach drag listener to chart canvas
  var canvas = document.getElementById('chart');
  if(canvas) _initDrag(canvas);

  // Refresh strip for any restored positions
  _updateStrip();
}

// ── Init ───────────────────────────────────────────────────────────────────
_load();
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _injectUI);
} else {
  _injectUI();
}

// ── Public API ─────────────────────────────────────────────────────────────
window.DVL_PAPER = {
  drawOverlay  : drawOverlay,
  onTick       : onTick,
  _quickOrder  : _quickOrder,
  _closeAll    : _closeAll,
  getPositions : function(){ return ST.positions.slice(); },
  getHistory   : function(){ return ST.history.slice(); },
  getBalance   : function(){ return ST.account && ST.account.balance; }
};

})();
</script>

</body>
</html>"""

html = rep(html,
    '\n</body>\n</html>',
    '\n' + DVL_PAPER_SCRIPT,
    "inject DVL_PAPER script block"
)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n✓ patch_634 aplicado — {SRC}")
