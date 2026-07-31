/* ── DVL Risk Management Express ────────────────────────────────────────────
   Camada RÁPIDA de interação sobre o Risk Engine commission-aware (1.355). NÃO
   recalcula nada: chama a MESMA API pública (DVL_RISK_ENGINE_UI) que alimenta o
   painel completo, então lote/TP/risco são idênticos aos dois. Só planejamento
   e cópia — nunca envia ordem. Reaproveita as linhas Entry/TP/SL já existentes
   (DVL_RISK_ENGINE_CHART_LINES). Botão flutuante arrastável + mini-toolbar. */
(function(){
  "use strict";
  if(window.DVL_RISK_EXPRESS) return;
  var LS="dvl.risk.express.v1";
  var st=(function(){ try{ return Object.assign({btn:null},JSON.parse(localStorage.getItem(LS)||"{}")); }catch(_){ return {btn:null}; } })();
  function save(){ try{ localStorage.setItem(LS,JSON.stringify(st)); }catch(_){} }
  function api(){ return window.DVL_RISK_ENGINE_UI||null; }
  var active=false, panelHidden=false, btn=null, bar=null, poll=0;

  function fmtLot(p){ return (p&&p.lot!=null)?Number(p.lot).toFixed(p.lotDecimals):"--"; }

  /* ── botão flutuante ── */
  function buildButton(){
    if(btn) return;
    btn=document.createElement("button");
    btn.id="dvlRmExpressBtn"; btn.type="button"; btn.className="side-buy"; btn.setAttribute("aria-label","Risk Express");
    btn.innerHTML='<span class="dvlRmxIcon">🛡</span><span class="dvlRmxSide" id="dvlRmxSideBadge">BUY</span>';
    document.body.appendChild(btn);
    if(st.btn&&Number.isFinite(st.btn.left)&&Number.isFinite(st.btn.top)){ btn.style.left=st.btn.left+"px"; btn.style.top=st.btn.top+"px"; btn.style.right="auto"; btn.style.bottom="auto"; }
    var downXY=null, moved=false, dragging=false, lp=0, off=null;
    btn.addEventListener("pointerdown",function(e){
      downXY={x:e.clientX,y:e.clientY}; moved=false; dragging=false;
      var r=btn.getBoundingClientRect(); off={dx:e.clientX-r.left,dy:e.clientY-r.top};
      try{ btn.setPointerCapture(e.pointerId); }catch(_){}
      lp=setTimeout(function(){ lp=0; if(!moved){ dragging=false; openFull(); } },560);
    });
    btn.addEventListener("pointermove",function(e){
      if(!downXY) return;
      if(Math.hypot(e.clientX-downXY.x,e.clientY-downXY.y)>6){ moved=true; dragging=true; if(lp){clearTimeout(lp);lp=0;} }
      if(dragging){
        var x=Math.max(4,Math.min(window.innerWidth-52,e.clientX-off.dx));
        var yy=Math.max(4,Math.min(window.innerHeight-52,e.clientY-off.dy));
        btn.style.left=x+"px"; btn.style.top=yy+"px"; btn.style.right="auto"; btn.style.bottom="auto";
      }
    });
    btn.addEventListener("pointerup",function(e){
      if(lp){ clearTimeout(lp); lp=0; }
      try{ btn.releasePointerCapture(e.pointerId); }catch(_){}
      if(dragging){ var r=btn.getBoundingClientRect(); st.btn={left:Math.round(r.left),top:Math.round(r.top)}; save(); }
      else if(!moved){ fabTap(); }
      downXY=null; moved=false; dragging=false;
    });
  }

  /* ── mini-toolbar ── */
  function buildBar(){
    if(bar) return;
    bar=document.createElement("div"); bar.id="dvlRmxToolbar"; bar.setAttribute("data-dvl-ui","true");
    bar.innerHTML=''
      +'<div class="dvlRmxGrip" id="dvlRmxGrip" title="Arrastar painel" aria-label="Arrastar painel">⠿</div>'
      +'<div class="dvlRmxLot"><b id="dvlRmxLot">--</b><small>LOTE MT5</small></div>'
      +'<div class="dvlRmxBadges"><span class="cap" id="dvlRmxBadgeCap">NOCIONAL LIMITADO</span><span class="cost" id="dvlRmxBadgeCost">CUSTO ALTO</span><span class="manual" id="dvlRmxBadgeManual">TP MANUAL</span><span class="invalid" id="dvlRmxBadgeInvalid">AJUSTE SL</span></div>'
      +'<div class="dvlRmxSeg"><button type="button" class="buy" data-rmx-side="buy">BUY</button><button type="button" class="sell" data-rmx-side="sell">SELL</button></div>'
      +'<div class="dvlRmxChips" id="dvlRmxChips"><button type="button" data-rmx-risk="cash:100">$100</button><button type="button" data-rmx-risk="cash:250">$250</button><button type="button" data-rmx-risk="cash:500">$500</button><button type="button" data-rmx-risk="percent:0.5">0,5%</button><button type="button" data-rmx-risk="percent:1">1%</button></div>'
      +'<div class="dvlRmxStep"><button type="button" id="dvlRmxRRDec">−</button><div><b id="dvlRmxRR">1:1,00</b><small>Net R:R</small></div><button type="button" id="dvlRmxRRInc">+</button></div>'
      +'<button type="button" class="dvlRmxBtn tp" id="dvlRmxTpBtn">AUTO<small>TP</small></button>'
      +'<button type="button" class="dvlRmxBtn copy" id="dvlRmxCopyBtn">Copiar<small>lote</small></button>'
      +'<button type="button" class="dvlRmxBtn" id="dvlRmxResetBtn">Reset<small>auto</small></button>'
      +'<button type="button" class="dvlRmxBtn hide" id="dvlRmxHideBtn">⌄<small>ocultar</small></button>'
      +'<button type="button" class="dvlRmxBtn close" id="dvlRmxCloseBtn">✕<small>fechar</small></button>';
    document.body.appendChild(bar);
    /* trava o pan do gráfico ao tocar na toolbar, MAS deixa passar na alça (⠿)
       pro handler de arraste do painel receber o pointerdown. */
    bar.addEventListener("pointerdown",function(e){ if(e.target&&e.target.closest&&e.target.closest("#dvlRmxGrip")) return; e.stopPropagation(); },true);
    bar.querySelectorAll("[data-rmx-side]").forEach(function(b){ b.addEventListener("click",function(){ var A=api(); if(A&&A.setSide){ A.setSide(b.dataset.rmxSide); dispatch("side-change",{side:b.dataset.rmxSide}); refresh(); } }); });
    bar.querySelectorAll("[data-rmx-risk]").forEach(function(b){ b.addEventListener("click",function(){ var A=api(); if(!A||!A.setRisk) return; var p=b.dataset.rmxRisk.split(":"); A.setRisk(p[0],Number(p[1])); refresh(); }); });
    q("dvlRmxRRDec").addEventListener("click",function(){ stepRR(-0.25); });
    q("dvlRmxRRInc").addEventListener("click",function(){ stepRR(0.25); });
    q("dvlRmxTpBtn").addEventListener("click",function(){ var A=api(); if(A&&A.resetTpAuto){ A.resetTpAuto(); refresh(); } });
    q("dvlRmxCopyBtn").addEventListener("click",function(){ var A=api(); if(A&&A.copyLot){ A.copyLot(); dispatch("copy-lot",{}); } });
    q("dvlRmxResetBtn").addEventListener("click",function(){ var A=api(); if(A){ if(A.resetTpAuto)A.resetTpAuto(); if(A.setLinesVisible)A.setLinesVisible(true); refresh(); } });
    q("dvlRmxHideBtn").addEventListener("click",function(){ hidePanel(); });
    q("dvlRmxCloseBtn").addEventListener("click",function(){ deactivate(); });
    makeBarDraggable();
    applyBarPos();
  }
  /* arrastar o painel pela alça (⠿) — não interfere nos botões; posição persiste. */
  function makeBarDraggable(){
    var grip=q("dvlRmxGrip"); if(!grip) return;
    var down=null, off=null, moved=false;
    grip.addEventListener("pointerdown",function(e){ e.preventDefault(); e.stopPropagation(); var r=bar.getBoundingClientRect(); off={dx:e.clientX-r.left,dy:e.clientY-r.top}; down={x:e.clientX,y:e.clientY}; moved=false; try{ grip.setPointerCapture(e.pointerId); }catch(_){} });
    grip.addEventListener("pointermove",function(e){ if(!down) return; if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>3) moved=true; if(moved){ var w=bar.offsetWidth,h=bar.offsetHeight; var x=Math.max(4,Math.min(window.innerWidth-w-4,e.clientX-off.dx)); var yy=Math.max(4,Math.min(window.innerHeight-h-4,e.clientY-off.dy)); bar.style.left=x+"px"; bar.style.top=yy+"px"; bar.style.right="auto"; bar.style.bottom="auto"; bar.style.transform="none"; } });
    grip.addEventListener("pointerup",function(e){ try{ grip.releasePointerCapture(e.pointerId); }catch(_){} if(moved){ var r=bar.getBoundingClientRect(); st.barPos={left:Math.round(r.left),top:Math.round(r.top)}; save(); } down=null; moved=false; });
  }
  function applyBarPos(){ if(!bar) return; if(st.barPos&&Number.isFinite(st.barPos.left)&&Number.isFinite(st.barPos.top)){ var w=bar.offsetWidth||280,h=bar.offsetHeight||80; var x=Math.max(4,Math.min(window.innerWidth-w-4,st.barPos.left)); var yy=Math.max(4,Math.min(window.innerHeight-h-4,st.barPos.top)); bar.style.left=x+"px"; bar.style.top=yy+"px"; bar.style.right="auto"; bar.style.bottom="auto"; bar.style.transform="none"; } }
  function q(id){ return document.getElementById(id); }
  function stepRR(d){ var A=api(); if(!A) return; var p=A.getPlan?A.getPlan():{}; var cur=Number(p.netRRTarget)||1; var v=Math.max(0.25,Math.round((cur+d)*100)/100); if(A.setNetRR){ A.setNetRR(v); refresh(); } }

  function dispatch(name,detail){ try{ window.dispatchEvent(new CustomEvent("dvl:risk-express:"+name,{detail:detail||{}})); }catch(_){} }

  function openFull(){ var A=api(); if(A&&A.open){ try{ A.open(); }catch(_){} } }

  /* 3 estados: OFF · ATIVO(painel visível) · ATIVO(painel oculto, só linhas).
     Toque no botão flutuante: OFF→ativa · painel oculto→mostra · painel visível→oculta.
     "⌄ ocultar": esconde o painel mantendo as linhas. "✕ fechar": desliga tudo. */
  function activate(){
    active=true; panelHidden=false;
    var A=api(); if(A&&A.activateExpress){ try{ A.activateExpress(); }catch(_){} }
    buildBar(); applyBarPos(); bar.classList.add("open");
    st.active=true; st.panelHidden=false; save();
    dispatch("activate",{}); refresh(); startPoll();
  }
  function deactivate(){
    active=false; panelHidden=false;
    var A=api(); if(A&&A.setLinesVisible){ try{ A.setLinesVisible(false); }catch(_){} }
    if(bar) bar.classList.remove("open");
    st.active=false; st.panelHidden=false; save();
    dispatch("close",{}); refresh(); startPoll();
  }
  function hidePanel(){
    if(!active) return; panelHidden=true;
    if(bar) bar.classList.remove("open");
    st.panelHidden=true; save();
    dispatch("panel-hidden",{}); refresh();
  }
  function showPanel(){
    if(!active) return; panelHidden=false;
    buildBar(); applyBarPos(); bar.classList.add("open");
    st.panelHidden=false; save();
    dispatch("panel-shown",{}); refresh(); startPoll();
  }
  /* toque no botão flutuante */
  function fabTap(){ if(!active) activate(); else if(panelHidden) showPanel(); else hidePanel(); }
  /* compat: toggle() liga/desliga por completo (usado por API externa/testes) */
  function toggle(){ if(active) deactivate(); else activate(); }

  function refresh(){
    var A=api(); if(!A||!A.getPlan) return; var p=A.getPlan();
    if(btn){
      btn.classList.toggle("active",active);
      btn.classList.toggle("panel-hidden",active&&panelHidden);
      btn.title=active?(panelHidden?"Mostrar painel Risk Express":"Ocultar painel (mantém as linhas)"):"Risk Express";
      var side=(p&&p.side==="sell")?"sell":"buy";
      btn.classList.toggle("side-sell",side==="sell"); btn.classList.toggle("side-buy",side==="buy");
      var sb=q("dvlRmxSideBadge"); if(sb) sb.textContent=side.toUpperCase();
    }
    if(!bar||!bar.classList.contains("open")) return;
    q("dvlRmxLot").textContent=fmtLot(p);
    var side=(p&&p.side==="sell")?"sell":"buy";
    bar.querySelectorAll("[data-rmx-side]").forEach(function(b){ b.classList.toggle("on",b.dataset.rmxSide===side); });
    bar.querySelectorAll("[data-rmx-risk]").forEach(function(b){ var pr=b.dataset.rmxRisk.split(":"); var on=(pr[0]===(p.riskMode||"cash"))&&Math.abs(Number(pr[1])-Number(p.riskValue))<1e-9; b.classList.toggle("on",on); });
    q("dvlRmxRR").textContent="1:"+(Number(p.netRRTarget)||1).toFixed(2);
    var tpb=q("dvlRmxTpBtn"); tpb.firstChild.textContent=p.tpManual?"MANUAL":"AUTO"; tpb.classList.toggle("manual",!!p.tpManual);
    setBadge("dvlRmxBadgeCap",p.capReason==="NOTIONAL_CAPPED"||p.capReason==="LOT_CAPPED");
    setBadge("dvlRmxBadgeCost",!!p.costHigh);
    setBadge("dvlRmxBadgeManual",!!p.tpManual);
    setBadge("dvlRmxBadgeInvalid",p.valid===false);
  }
  function setBadge(id,on){ var e=q(id); if(e) e.classList.toggle("on",!!on); }

  function startPoll(){ if(poll){ clearInterval(poll); poll=0; } if(active){ poll=setInterval(refresh,300); } }

  /* re-sincroniza quando o painel/preço muda */
  ["dvl:risk-source-change","dvl:paper-price","dvl:risk-lines-visible","dvl-safe-asset-selected-0804"].forEach(function(ev){ try{ window.addEventListener(ev,function(){ if(active) refresh(); },{passive:true}); }catch(_){} });

  function boot(){ buildButton(); if(st.active){ /* não reabre linhas em preço antigo automaticamente; só o botão volta */ } refresh(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();

  window.DVL_RISK_EXPRESS={ active:function(){return active;}, panelHidden:function(){return panelHidden;}, toggle:toggle, open:activate, close:deactivate, hidePanel:hidePanel, showPanel:showPanel, refresh:refresh };
})();
