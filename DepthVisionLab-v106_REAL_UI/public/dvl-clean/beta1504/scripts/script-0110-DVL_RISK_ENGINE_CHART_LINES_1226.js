/* ============================================================================
   DVL_RISK_ENGINE_CHART_LINES — Beta 1.226
   Linhas interativas de planejamento (Entry / Take Profit / Stop Loss) do DVL
   Risk Engine. Lêem e escrevem o MESMO estado central (window.DVL_RISK_ENGINE_UI
   .getPlan / dragLine / commitLine) — não são ordens nem posições.

   Render: as linhas são desenhadas no CANVAS do gráfico via o hook
   window.DVLRiskLinesDraw (alinhadas ao preço, acompanham pan/zoom).
   Drag: faixas DOM invisíveis (grab strips) sobre cada linha capturam o ponteiro
   (área de toque generosa no mobile), travam o pan durante o arrasto e convertem
   a posição em preço pela MESMA escala legada do gráfico.
   ==========================================================================*/
(function(){
  "use strict";
  if(window.__DVL_RISK_LINES_1226__) return;
  window.__DVL_RISK_LINES_1226__ = true;

  var COLORS = { entry:"#4ea3ff", tp:"#16c784", stop:"#ff4a61" };
  var GRAB_PX = 14;                 // meia-altura da faixa de toque
  var lastLines = null;             // {entry:{y,price},stop,tp} da última render (CSS px)
  var drag = null;                  // {field, pointerId}
  var layer = null, strips = {};

  function api(){ return window.DVL_RISK_ENGINE_UI || null; }
  function wrap(){ return document.getElementById("chartWrap") || document.querySelector(".canvasWrap"); }

  // Escala de preço legada (mesma que o Paper Trading usa) — CSS px.
  function scaleInfo(){
    var w = wrap(); if(!w) return null;
    var H = w.clientHeight||1, W = w.clientWidth||1;
    var a = { y0:4, y1:Math.max(40,H-24) };
    try{ if(typeof __dvlLegacyPriceArea==="function") a = __dvlLegacyPriceArea(H); }catch(_){}
    var sc=null; try{ if(typeof visible==="function" && typeof scale==="function") sc = scale(visible().cs, H); }catch(_){}
    if(!sc || typeof sc.y!=="function") return null;
    var rw=70; try{ if(typeof RP==="function") rw = Math.max(70, Number(RP())||70); }catch(_){}
    function priceToY(p){ var y=sc.y(Number(p)); return Number.isFinite(y)?y:null; }
    function yToPrice(y){ try{ if(typeof priceFromY==="function") return priceFromY(y,H,sc); }catch(_){} var span=Math.max(1,a.y1-a.y0); return sc.lo+(1-(Number(y)-a.y0)/span)*(sc.hi-sc.lo); }
    return { wrap:w, W:W, H:H, top:a.y0, bottom:a.y1, rightW:rw, plotRight:Math.max(1,W-rw), priceToY:priceToY, yToPrice:yToPrice };
  }

  function fmtP(v){ v=Number(v); if(!Number.isFinite(v)) return "--"; if(Math.abs(v)>=1000) return v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); if(Math.abs(v)>=1) return v.toFixed(2); return v.toPrecision(5); }
  function fmtMoney(v){ v=Number(v); if(!Number.isFinite(v)) return ""; var s=v>0?"+":(v<0?"-":""); return s+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function roundRectPath(ctx,x,y,w,h,radius){ var rr=Math.min(radius,h/2,w/2); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
  /* Beta 1.356 — caixa de label grande (LOT/NET/R:R + badges) desenhada à esquerda da escala. */
  function drawLabelBox(ctx, rightX, yy, r, alpha){
    var _mob=false; try{ _mob=window.innerWidth<=760; }catch(_){}
    var padX=_mob?5:6, padY=_mob?3:3.5, gap=1.5, bfs=_mob?7.5:8.5, li, ln, maxW=0, totalH=padY*2, metrics=[];
    for(li=0; li<r.lines.length; li++){ ln=r.lines[li]; ctx.font=(ln.strong?"800 ":"700 ")+ln.s+"px system-ui"; var w=ctx.measureText(ln.t).width; metrics.push({t:ln.t,s:ln.s,strong:ln.strong}); if(w>maxW)maxW=w; totalH+=ln.s+(li>0?gap:0); }
    var badgeTxt=(r.badges&&r.badges.length)?r.badges.join(" · "):"";
    if(badgeTxt){ ctx.font="800 "+bfs+"px system-ui"; var bw=ctx.measureText(badgeTxt).width; if(bw>maxW)maxW=bw; totalH+=bfs+gap+1; }
    var boxW=maxW+padX*2, boxH=totalH, bx=rightX-boxW, by=yy-boxH/2;
    ctx.globalAlpha=alpha*0.9; roundRectPath(ctx,bx,by,boxW,boxH,5); ctx.fillStyle="rgba(6,12,18,0.9)"; ctx.fill();
    ctx.lineWidth=1.1; ctx.strokeStyle=r.color; ctx.globalAlpha=alpha; ctx.stroke();
    var ty=by+padY; ctx.textAlign="left"; ctx.textBaseline="top";
    for(li=0; li<metrics.length; li++){ var m=metrics[li]; ctx.font=(m.strong?"800 ":"700 ")+m.s+"px system-ui"; ctx.fillStyle=m.strong?"#ffffff":r.color; ctx.globalAlpha=alpha*(m.strong?1:0.95); ctx.fillText(m.t, bx+padX, ty); ty+=m.s+gap; }
    if(badgeTxt){ ctx.font="800 "+bfs+"px system-ui"; ctx.fillStyle=r.color; ctx.globalAlpha=alpha*0.9; ctx.fillText(badgeTxt, bx+padX, ty); }
    ctx.globalAlpha=alpha;
  }

  /* ── Canvas draw hook (chamado dentro do drawPriceSection) ─────────────── */
  function draw(ctx, cfg){
    lastLines = null;
    var A = api(); if(!A || typeof A.getPlan!=="function"){ hideStrips(); return; }
    var plan = A.getPlan();
    if(!plan || !plan.visible){ hideStrips(); return; }
    if(!(plan.entry>0)){ hideStrips(); return; }
    var x0=cfg.x0, x1=cfg.x1, y=cfg.y, min=cfg.min, max=cfg.max;
    if(min===undefined || max===undefined || max<=min) return;
    var cur = { };
    /* Beta 1.356 — labels grandes estilo Risk Express (LOT em destaque na Entry,
       NET em $ no SL/TP, R:R e badges). Mesma fonte de verdade (getPlan). */
    var mob = false; try{ mob = window.innerWidth<=760; }catch(_){}
    function moneyAbs(v){ v=Number(v); if(!Number.isFinite(v)) return "--"; return "$"+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
    var lotTxt = plan.lot!=null ? Number(plan.lot).toFixed(plan.lotDecimals) : "--";
    var eBadges=[]; if(plan.capReason==="NOTIONAL_CAPPED"||plan.capReason==="LOT_CAPPED") eBadges.push("CAP"); if(plan.costHigh) eBadges.push("CUSTO"); if(!plan.valid) eBadges=["AJUSTE SL"];
    var tBadges=[]; if(plan.tpManual) tBadges.push("MANUAL");
    var rows = [
      { f:"entry", price:plan.entry, color:COLORS.entry, solid:true, badges:eBadges, lines:[
        {t:"ENTRY "+fmtP(plan.entry), s:mob?8.5:9.5},
        {t:"LOT "+lotTxt, s:mob?12:13, strong:true},
        {t:"RISCO "+moneyAbs(plan.netLoss!=null?plan.netLoss:plan.actualRisk), s:mob?8.5:9.5}
      ]},
      { f:"tp", price:plan.tp, color:COLORS.tp, solid:false, badges:tBadges, lines:[
        {t:"TP "+fmtP(plan.tp)+"  1:"+(plan.netRR!=null?Number(plan.netRR).toFixed(2):"--"), s:mob?8.5:9.5},
        {t:(plan.netProfit!=null?"+"+moneyAbs(plan.netProfit):"--")+" NET", s:mob?10:11, strong:true}
      ]},
      { f:"stop", price:plan.stop, color:COLORS.stop, solid:false, badges:[], lines:[
        {t:"SL "+fmtP(plan.stop), s:mob?8.5:9.5},
        {t:"-"+moneyAbs(plan.netLoss!=null?plan.netLoss:plan.actualRisk)+" NET", s:mob?10:11, strong:true}
      ]}
    ];
    ctx.save();
    var alpha = plan.valid ? 1 : 0.6;
    for(var i=0;i<rows.length;i++){
      var r=rows[i]; if(!(r.price>0)) continue;
      var yy = y(r.price); if(!Number.isFinite(yy)) continue;
      ctx.globalAlpha = alpha*(plan.valid?0.95:0.7);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.solid ? (mob?2:2.2) : (mob?1.5:1.8);
      ctx.setLineDash(r.solid ? [] : [6,4]);
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
      ctx.setLineDash([]);
      drawLabelBox(ctx, x1-5, yy, r, alpha);
      cur[r.f] = { price:r.price, color:r.color };
    }
    ctx.globalAlpha=1;
    ctx.restore();
    // grava posições em CSS px (via escala legada) para os grab strips
    var si = scaleInfo();
    if(si){
      lastLines = {};
      ["entry","tp","stop"].forEach(function(f){
        if(cur[f]){ var cy=si.priceToY(cur[f].price); if(cy!=null) lastLines[f]={ y:cy, price:cur[f].price, color:cur[f].color }; }
      });
      positionStrips(si);
    }
  }

  /* ── DOM grab strips (alvo de toque + drag) ───────────────────────────── */
  function ensureLayer(){
    if(layer && document.body.contains(layer)) return layer;
    var w=wrap(); if(!w) return null;
    layer = document.createElement("div");
    layer.id = "dvlRiskLinesLayer";
    layer.style.cssText = "position:absolute;inset:0;z-index:46;pointer-events:none;overflow:hidden";
    ["entry","tp","stop"].forEach(function(f){
      var s=document.createElement("div");
      s.className="dvlRiskGrab"; s.dataset.field=f;
      s.style.cssText="position:absolute;left:0;right:0;height:"+(GRAB_PX*2)+"px;transform:translateY(-50%);pointer-events:none;cursor:ns-resize;touch-action:none;display:none";
      layer.appendChild(s); strips[f]=s;
      s.addEventListener("pointerdown", onDown, {passive:false});
    });
    if(getComputedStyle(w).position==="static") w.style.position="relative";
    w.appendChild(layer);
    return layer;
  }
  function positionStrips(si){
    if(!ensureLayer()) return;
    ["entry","tp","stop"].forEach(function(f){
      var s=strips[f]; if(!s) return;
      var ln = lastLines && lastLines[f];
      if(ln && Number.isFinite(ln.y) && ln.y>=si.top-GRAB_PX && ln.y<=si.bottom+GRAB_PX){
        s.style.display="block"; s.style.top=ln.y+"px";
        s.style.pointerEvents = "auto";
        s.style.right = si.rightW+"px";  // não cobrir a escala de preço
      } else {
        s.style.display="none"; s.style.pointerEvents="none";
      }
    });
  }
  function hideStrips(){ ["entry","tp","stop"].forEach(function(f){ if(strips[f]){ strips[f].style.display="none"; strips[f].style.pointerEvents="none"; } }); }

  function onDown(ev){
    var A=api(); if(!A) return;
    var f=ev.currentTarget.dataset.field;
    drag = { field:f, pointerId:ev.pointerId };
    try{ ev.currentTarget.setPointerCapture(ev.pointerId); }catch(_){}
    try{ window.__dvlChartInteracting = true; }catch(_){}
    window.__dvlRiskLineDragging = true;
    ev.preventDefault(); ev.stopPropagation();
    document.addEventListener("pointermove", onMove, {passive:false, capture:true});
    document.addEventListener("pointerup", onUp, {passive:false, capture:true});
    document.addEventListener("pointercancel", onUp, {passive:false, capture:true});
  }
  var moveRAF=0, pendingPrice=null;
  function onMove(ev){
    if(!drag) return;
    ev.preventDefault(); ev.stopPropagation();
    var si=scaleInfo(); if(!si) return;
    var rect=si.wrap.getBoundingClientRect();
    var yy = ev.clientY - rect.top;
    yy = Math.max(si.top, Math.min(si.bottom, yy));
    pendingPrice = si.yToPrice(yy);
    if(moveRAF) return;
    moveRAF = requestAnimationFrame(function(){
      moveRAF=0;
      var A=api(); if(A && drag && pendingPrice>0){ try{ A.dragLine(drag.field, pendingPrice); }catch(_){} }
    });
  }
  function onUp(ev){
    if(!drag) return;
    ev.preventDefault(); ev.stopPropagation();
    if(moveRAF){ cancelAnimationFrame(moveRAF); moveRAF=0; }
    var A=api();
    if(A && pendingPrice>0){ try{ A.dragLine(drag.field, pendingPrice); }catch(_){} }
    if(A){ try{ A.commitLine(); }catch(_){} }
    try{ ev.currentTarget && ev.currentTarget.releasePointerCapture && ev.currentTarget.releasePointerCapture(drag.pointerId); }catch(_){}
    drag=null; pendingPrice=null;
    window.__dvlRiskLineDragging = false;
    try{ window.__dvlChartInteracting = false; }catch(_){}
    document.removeEventListener("pointermove", onMove, {capture:true});
    document.removeEventListener("pointerup", onUp, {capture:true});
    document.removeEventListener("pointercancel", onUp, {capture:true});
    try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){}
  }

  window.DVLRiskLinesDraw = function(ctx,cfg){ try{ draw(ctx,cfg); }catch(_){} };

  // esconder as faixas quando as linhas somem
  try{ window.addEventListener("dvl:risk-lines-visible", function(e){ if(e&&e.detail&&!e.detail.visible) hideStrips(); if(typeof drawSoon==="function") drawSoon(); }, {passive:true}); }catch(_){}
  try{ window.addEventListener("dvl-safe-asset-selected-0804", function(){ if(typeof drawSoon==="function") drawSoon(); }, {passive:true}); }catch(_){}

  // API pública mínima (para o painel / testes)
  window.DVL_RISK_ENGINE_CHART_LINES = {
    version: "1.226",
    lastLines: function(){ return lastLines; },
    isDragging: function(){ return !!drag; },
    hide: hideStrips
  };
})();
