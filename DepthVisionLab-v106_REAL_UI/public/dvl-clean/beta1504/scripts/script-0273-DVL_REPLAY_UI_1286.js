/* DVL Replay Pro — UI (Fase 1). Botão na hotbar + barra de controle acima do rodapé.
   Toda a lógica de dados/relógio está no engine in-scope (window.DVLReplay / DVLReplayClock);
   aqui é só transporte: play/pause, velocidade, passo, timeline, reiniciar, encerrar + teclado. */
(function(){
  "use strict";
  if(window.__DVL_REPLAY_UI_ON) return; window.__DVL_REPLAY_UI_ON=true;
  var SPEEDS=[0.25,0.5,1,2,5,10,25];
  var bar=null, btn=null, unsub=null;

  function eng(){ return window.DVLReplay; }
  function fmtTs(ts){ if(!ts) return "--"; var d=new Date(ts);
    var p=function(n){return ("0"+n).slice(-2);};
    return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes()); }

  /* botão fica DENTRO das configurações do gráfico (⚙️): #dvlReplaySettingsBtn */
  function ensureBtn(){
    var b=document.getElementById("dvlReplaySettingsBtn");
    if(b && !b.__dvlBound){ b.__dvlBound=true; b.addEventListener("click",function(){ closeChartSettings(); toggle(); }); }
    btn=b; return b;
  }
  function closeChartSettings(){ try{ var pnl=document.getElementById("chartSettingsPanel"); if(pnl){ pnl.classList.remove("is-open"); pnl.setAttribute("aria-hidden","true"); } }catch(_){} }

  function ensureBar(){
    /* dedupe: o layout do app pode clonar nós; manter só o #dvlReplayBar completo (com .play) */
    var all=[].slice.call(document.querySelectorAll("#dvlReplayBar"));
    var built=all.filter(function(b){ return b.querySelector(".play"); });
    all.forEach(function(b){ if(built.indexOf(b)<0) b.remove(); });        // remove clones vazios
    if(built.length){ for(var i=1;i<built.length;i++) built[i].remove(); bar=built[0]; bar.classList.add("dvlReplayBar");
      if(!bar.__dvlBound){ wireBar(bar); bar.__dvlBound=true; } return bar; }
    bar=document.createElement("div"); bar.id="dvlReplayBar"; bar.className="dvlReplayBar";
    bar.innerHTML=''
      +'<button class="restart" title="Reiniciar (R)">⟳</button>'
      +'<div class="sep"></div>'
      +'<button class="prev" title="Candle anterior (←)">◀</button>'
      +'<button class="play" title="Play/Pause (Espaço)">▶ Play</button>'
      +'<button class="next" title="Próximo candle (→)">▶❘</button>'
      +'<div class="sep"></div>'
      +'<div id="dvlReplaySpeedWrap"><button class="speed" title="Velocidade">1x ▾</button>'
        +'<div id="dvlReplaySpeedMenu"></div></div>'
      +'<div class="sep"></div>'
      +'<div class="rp-track" title="Timeline"><div class="rail"></div><div class="fill"></div><div class="knob"></div></div>'
      +'<div class="rp-clock">--</div>'
      +'<div class="sep"></div>'
      +'<button class="exit" title="Encerrar (Esc)">✕</button>';
    document.body.appendChild(bar);
    wireBar(bar); bar.__dvlBound=true;
    return bar;
  }
  function wireBar(bar){
    function own(ev){
      try{ if(ev.pointerId!=null){ if(!(window.__DVL_REPLAY_UI_POINTER_IDS instanceof Set))window.__DVL_REPLAY_UI_POINTER_IDS=new Set(); window.__DVL_REPLAY_UI_POINTER_IDS.add(ev.pointerId); window.__dvlReplayUIPointerLock=true; } }catch(_){}
      try{ ev.preventDefault(); }catch(_){}
      try{ ev.stopPropagation(); }catch(_){}
    }
    function releaseOwn(ev){
      try{ if(ev.pointerId!=null&&window.__DVL_REPLAY_UI_POINTER_IDS instanceof Set){window.__DVL_REPLAY_UI_POINTER_IDS.delete(ev.pointerId);if(!window.__DVL_REPLAY_UI_POINTER_IDS.size)window.__dvlReplayUIPointerLock=false;} }catch(_){}
    }
    function bindPress(btn,action){
      if(!btn)return;var pid=null,sx=0,sy=0,armed=false;
      btn.addEventListener('pointerdown',function(ev){if(ev.pointerType==='mouse'&&ev.button!==0)return;own(ev);pid=ev.pointerId;sx=ev.clientX;sy=ev.clientY;armed=true;btn.classList.add('is-pressed');try{btn.setPointerCapture(pid);}catch(_){}},{passive:false});
      btn.addEventListener('pointerup',function(ev){if(!armed||pid!==ev.pointerId)return;own(ev);var moved=Math.hypot((ev.clientX||0)-sx,(ev.clientY||0)-sy);armed=false;btn.classList.remove('is-pressed');try{btn.releasePointerCapture(pid);}catch(_){}releaseOwn(ev);pid=null;if(moved<=18)action(ev);},{passive:false});
      btn.addEventListener('pointercancel',function(ev){own(ev);armed=false;btn.classList.remove('is-pressed');releaseOwn(ev);pid=null;},{passive:false});
      /* Android dispara um click sintético com detail=0 depois do pointerup.
         Ele NÃO pode executar novamente o comando. */
      btn.addEventListener('click',function(ev){try{ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}catch(_){}},{capture:true,passive:false});
      /* Acessibilidade de teclado sem depender do click sintético. */
      btn.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){try{ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}catch(_){}action(ev);}},{capture:true,passive:false});
      btn.addEventListener('contextmenu',function(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();},{capture:true,passive:false});
    }
    bar.addEventListener('pointerdown',function(ev){try{if(!(window.__DVL_REPLAY_UI_POINTER_IDS instanceof Set))window.__DVL_REPLAY_UI_POINTER_IDS=new Set();window.__DVL_REPLAY_UI_POINTER_IDS.add(ev.pointerId);window.__dvlReplayUIPointerLock=true;}catch(_){}},{capture:true,passive:true});
    bar.addEventListener('contextmenu',function(ev){ev.preventDefault();ev.stopPropagation();},{passive:false});
    bindPress(bar.querySelector('.restart'),function(){eng()&&eng().restart();});
    bindPress(bar.querySelector('.prev'),function(){eng()&&eng().step(-1);});
    bindPress(bar.querySelector('.next'),function(){eng()&&eng().step(1);});
    bindPress(bar.querySelector('.play'),togglePlay);
    bindPress(bar.querySelector('.exit'),doExit);
    var sm=bar.querySelector('#dvlReplaySpeedMenu');
    sm.innerHTML=SPEEDS.map(function(s){return '<button type="button" data-sp="'+s+'">'+s+'x</button>';}).join('');
    bindPress(bar.querySelector('.speed'),function(){sm.classList.toggle('is-open');});
    sm.querySelectorAll('[data-sp]').forEach(function(b){bindPress(b,function(){eng()&&eng().setSpeed(+b.getAttribute('data-sp'));sm.classList.remove('is-open');});});
    document.addEventListener('pointerdown',function(ev){try{if(ev.target&&ev.target.closest&&ev.target.closest('#dvlReplayBar'))return;}catch(_){}sm.classList.remove('is-open');},{capture:true,passive:true});
    var track=bar.querySelector('.rp-track'),dragging=false,pid=null;
    function seekAt(clientX){var r=track.getBoundingClientRect();var f=Math.max(0,Math.min(1,(clientX-r.left)/Math.max(1,r.width)));if(eng())eng().seekFrac(f);}
    track.addEventListener('pointerdown',function(ev){if(ev.pointerType==='mouse'&&ev.button!==0)return;own(ev);dragging=true;pid=ev.pointerId;track.classList.add('is-dragging');try{track.setPointerCapture(pid);}catch(_){}seekAt(ev.clientX);},{passive:false});
    track.addEventListener('pointermove',function(ev){if(!dragging||ev.pointerId!==pid)return;own(ev);seekAt(ev.clientX);},{passive:false});
    function endTrack(ev){if(!dragging||ev.pointerId!==pid)return;own(ev);dragging=false;track.classList.remove('is-dragging');try{track.releasePointerCapture(pid);}catch(_){}releaseOwn(ev);pid=null;}
    track.addEventListener('pointerup',endTrack,{passive:false});track.addEventListener('pointercancel',endTrack,{passive:false});
    track.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();},{passive:false});
  }

  function render(st){
    if(!bar||!st) return;
    var pb=bar.querySelector(".play"); if(pb) pb.textContent = st.playing ? "⏸ Pause" : (st.atEnd ? "↻ Repetir" : "▶ Play");
    var prev=bar.querySelector(".prev"),next=bar.querySelector(".next");
    if(prev) prev.disabled=!!st.atStart;
    if(next) next.disabled=!!st.atEnd;
    var sp=bar.querySelector(".speed"); if(sp) sp.textContent = st.speed+"x ▾";
    bar.querySelectorAll("#dvlReplaySpeedMenu [data-sp]").forEach(function(b){ b.classList.toggle("is-on", +b.getAttribute("data-sp")===st.speed); });
    var span=(st.total-1-st.minIdx)||1; var f=Math.max(0,Math.min(1,(st.cursor-st.minIdx)/span));
    var fill=bar.querySelector(".fill"), knob=bar.querySelector(".knob");
    if(fill) fill.style.width=(f*100)+"%"; if(knob) knob.style.left=(f*100)+"%";
    var clk=bar.querySelector(".rp-clock"); if(clk) clk.textContent = fmtTs(st.curTs)+(st.atEnd?" · fim":"");
    if(handle){
      handle.classList.toggle("has-pending",!!st.editing);
      var ca=handle.querySelector(".dvlReplayLineActions .cancel"); if(ca) ca.disabled=!st.editing;
    }
  }

  function togglePlay(){ var e=eng(); if(!e) return; var st=e.status(); if(st.playing) e.pause(); else e.play(); }

  /* ── linha vertical de início: alça DOM invisível por cima do gráfico (as camadas do
     chart não roubam mais o pointer). A alça segue a linha; só ela é arrastável. ── */
  var dragLine=false, handle=null, syncRAF=0, dragPointerId=null, dragRAF=0, pendingClientX=null;
  function canvasEl(){ return document.getElementById("chart")||document.querySelector("canvas"); }
  function queueLineSeek(clientX){
    pendingClientX=clientX;
    if(dragRAF) return;
    dragRAF=requestAnimationFrame(function(){
      dragRAF=0;
      var x=pendingClientX; pendingClientX=null;
      var e=eng(); if(e&&x!=null) e.setStartByClientX(x);
    });
  }
  function ensureHandle(){
    if(handle) return handle;
    handle=document.createElement("div"); handle.id="dvlReplayLineHandle"; handle.setAttribute("aria-label","Arrastar início do replay");
    handle.innerHTML='<div class="dvlReplayLineActions"><button class="cancel" type="button" title="Cancelar mudança" aria-label="Cancelar mudança">✕</button><button class="confirm" type="button" title="Confirmar mudança" aria-label="Confirmar mudança">✓</button></div>';
    document.body.appendChild(handle);
    var actions=handle.querySelector(".dvlReplayLineActions");
    ["pointerdown","pointerup","pointercancel","mousedown","mouseup","touchstart","touchend"].forEach(function(type){ actions.addEventListener(type,function(ev){ ev.stopPropagation(); }); });
    actions.addEventListener("click",function(ev){ ev.stopPropagation(); });
    actions.querySelector(".confirm").addEventListener("click",function(ev){ ev.preventDefault();ev.stopPropagation();finishDrag();var e=eng();if(e&&e.confirmStartEdit)e.confirmStartEdit(); });
    actions.querySelector(".cancel").addEventListener("click",function(ev){ ev.preventDefault();ev.stopPropagation();finishDrag();var e=eng();if(e&&e.cancelStartEdit)e.cancelStartEdit(); });
    handle.addEventListener("pointerdown",onHandleDown,{capture:true,passive:false});
    handle.addEventListener("pointermove",onHandleMove,{capture:true,passive:false});
    handle.addEventListener("pointerup",onHandleUp,{capture:true,passive:false});
    handle.addEventListener("pointercancel",onHandleUp,{capture:true,passive:false});
    // Fallback para WebViews Android que interrompem Pointer Events durante o gesto.
    handle.addEventListener("touchstart",onTouchStart,{capture:true,passive:false});
    handle.addEventListener("touchmove",onTouchMove,{capture:true,passive:false});
    handle.addEventListener("touchend",onTouchEnd,{capture:true,passive:false});
    handle.addEventListener("touchcancel",onTouchEnd,{capture:true,passive:false});
    return handle;
  }
  function beginDrag(clientX, pointerId){
    if(dragLine) return;
    var editor=eng(); if(editor&&editor.beginStartEdit) editor.beginStartEdit();
    dragLine=true; dragPointerId=pointerId==null?null:pointerId;
    window.__dvlReplayLineDragActive=true;
    document.body.classList.add("dvl-replay-dragging");
    if(handle) handle.classList.add("is-dragging");
    try{ if(handle&&dragPointerId!=null) handle.setPointerCapture(dragPointerId); }catch(_){}
    document.addEventListener("pointermove",onDocMove,true);
    document.addEventListener("pointerup",onDocUp,true);
    document.addEventListener("pointercancel",onDocUp,true);
    queueLineSeek(clientX);
  }
  function finishDrag(ev){
    if(!dragLine) return;
    if(ev){ try{ev.preventDefault();ev.stopPropagation();}catch(_){} }
    dragLine=false;
    window.__dvlReplayLineDragActive=false;
    document.body.classList.remove("dvl-replay-dragging");
    if(handle) handle.classList.remove("is-dragging");
    if(handle&&dragPointerId!=null){ try{ if(handle.hasPointerCapture(dragPointerId)) handle.releasePointerCapture(dragPointerId); }catch(_){} }
    dragPointerId=null;
    document.removeEventListener("pointermove",onDocMove,true);
    document.removeEventListener("pointerup",onDocUp,true);
    document.removeEventListener("pointercancel",onDocUp,true);
    if(dragRAF){ cancelAnimationFrame(dragRAF); dragRAF=0; }
    if(pendingClientX!=null){ var x=pendingClientX; pendingClientX=null; var e=eng(); if(e)e.setStartByClientX(x); }
  }
  function onHandleDown(ev){
    if(ev.target&&ev.target.closest&&ev.target.closest(".dvlReplayLineActions")) return;
    var e=eng(); if(!e||!e.status().active||!e.status().selecting) return;
    if(ev.button!=null&&ev.button!==0&&ev.pointerType!=="touch") return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    beginDrag(ev.clientX,ev.pointerId);
  }
  function onHandleMove(ev){
    if(!dragLine||(dragPointerId!=null&&ev.pointerId!==dragPointerId)) return;
    ev.preventDefault(); ev.stopPropagation(); queueLineSeek(ev.clientX);
  }
  function onHandleUp(ev){
    if(!dragLine||(dragPointerId!=null&&ev.pointerId!==dragPointerId)) return;
    finishDrag(ev);
  }
  function onTouchStart(ev){
    if(window.PointerEvent||dragLine||!ev.touches||!ev.touches.length) return;
    var e=eng(); if(!e||!e.status().active||!e.status().selecting) return;
    ev.preventDefault();ev.stopPropagation();beginDrag(ev.touches[0].clientX,null);
  }
  function onTouchMove(ev){ if(!dragLine||!ev.touches||!ev.touches.length)return;ev.preventDefault();ev.stopPropagation();queueLineSeek(ev.touches[0].clientX); }
  function onTouchEnd(ev){ if(!window.PointerEvent&&dragLine)finishDrag(ev); }
  /* Fallback em captura: se o dedo começar visualmente sobre a linha antes da alça
     sincronizar, o gesto ainda é assumido pelo Replay. Fora dessa faixa, pan normal. */
  function onDocDown(ev){
    if(ev.target&&ev.target.closest&&ev.target.closest('#dvlReplayBar,#dvlReplayLineHandle,#dvlReplayConfirm,#dvlReplaySettingsBtn,#dvlReplaySpeedMenu')) return;
    if(dragLine) return;
    var e=eng(); if(!e||!e.status().active||!e.status().selecting) return;
    var cv=canvasEl(), lx=window.__DVL_REPLAY_LINE_X, cfg=window.__DVL_DRAWCFG;
    if(!cv||lx==null||!cfg) return;
    var rect=cv.getBoundingClientRect(), x=ev.clientX-rect.left, y=ev.clientY-rect.top;
    if(y<(+cfg.y0||0)-12||y>(+cfg.y1||rect.height)+12) return;
    if(Math.abs(x-lx)>42) return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    ensureHandle();beginDrag(ev.clientX,ev.pointerId);
  }
  function onDocMove(ev){
    if(!dragLine||(dragPointerId!=null&&ev.pointerId!==dragPointerId)) return;
    ev.preventDefault();ev.stopPropagation();queueLineSeek(ev.clientX);
  }
  function onDocUp(ev){
    if(!dragLine||(dragPointerId!=null&&ev.pointerId!==dragPointerId)) return;
    finishDrag(ev);
  }
  function syncHandle(){
    syncRAF=requestAnimationFrame(syncHandle);
    var h=handle;if(!h)return;
    var e=eng(),cfg=window.__DVL_DRAWCFG,cv=canvasEl(),lx=window.__DVL_REPLAY_LINE_X;
    var show=e&&e.status().active&&e.status().selecting&&lx!=null&&cfg&&cv;
    if(!show){if(h.style.display!=="none")h.style.display="none";return;}
    var rect=cv.getBoundingClientRect();
    h.style.display="block";
    h.style.left=(rect.left+lx-38)+"px";
    h.style.top=(rect.top+(cfg.y0||0))+"px";
    h.style.height=Math.max(30,(cfg.y1||rect.height)-(cfg.y0||0))+"px";
  }
  function bindLine(){ensureHandle();if(!syncRAF)syncHandle();document.addEventListener("pointerdown",onDocDown,true);}
  function unbindLine(){
    finishDrag();
    document.removeEventListener("pointerdown",onDocDown,true);
    if(syncRAF){cancelAnimationFrame(syncRAF);syncRAF=0;}
    if(dragRAF){cancelAnimationFrame(dragRAF);dragRAF=0;}
    if(handle)handle.style.display="none";
  }

  /* ── diálogo de confirmação DVL (sem confirm nativo) ── */
  var dlg=null;
  function ensureDialog(){
    if(dlg) return dlg;
    dlg=document.createElement("div"); dlg.id="dvlReplayConfirm";
    dlg.innerHTML='<div class="box"><h4>Encerrar Replay</h4><p>Voltar ao tempo real? A simulação atual será descartada.</p><div class="row"><button class="cancel">Cancelar</button><button class="ok">Encerrar</button></div></div>';
    document.body.appendChild(dlg);
    ["pointerdown","pointerup","pointercancel","mousedown","mouseup","touchstart","touchend"].forEach(function(type){ dlg.addEventListener(type,function(e){ e.stopPropagation(); }); });
    dlg.addEventListener("click",function(e){ if(e.target===dlg) hideDialog(); });
    return dlg;
  }
  function showDialog(onOk){
    ensureDialog(); dlg.classList.add("on");
    var ok=dlg.querySelector(".ok"), ca=dlg.querySelector(".cancel");
    ok.onclick=function(){ hideDialog(); onOk(); };
    ca.onclick=hideDialog;
  }
  function hideDialog(){ if(dlg) dlg.classList.remove("on"); }

  function ensureMark(){ var m=document.getElementById("dvlReplayMark"); if(!m){ m=document.createElement("div"); m.id="dvlReplayMark"; m.textContent="replay"; document.body.appendChild(m); } return m; }

  function doExit(){
    var e=eng(); if(!e) return;
    showDialog(function(){ e.exit(); close(); });
  }
  function open(){
    var e=eng(); if(!e){ alert("Replay indisponível: gráfico ainda carregando."); return; }
    if(!e.status().active){ if(!e.start()){ alert("Poucos candles carregados para o Replay. Aguarde o gráfico."); return; } }
    ensureBar().classList.add("is-open");
    ensureMark().classList.add("on");
    if(btn) btn.classList.add("is-on");
    bindLine();
    if(unsub) unsub(); unsub=e.onUpdate(render); render(e.status());
    document.addEventListener("keydown",onKey,true);
  }
  function close(){
    hideDialog(); unbindLine();
    if(bar) bar.classList.remove("is-open");
    var m=document.getElementById("dvlReplayMark"); if(m) m.classList.remove("on");
    if(btn) btn.classList.remove("is-on");
    if(unsub){ unsub(); unsub=null; }
    document.removeEventListener("keydown",onKey,true);
  }
  function toggle(){ var e=eng(); if(e&&e.status().active){ doExit(); } else { open(); } }

  function onKey(ev){
    var e=eng(); if(!e||!e.status().active) return;
    var tag=(ev.target&&ev.target.tagName||"").toLowerCase();
    if(tag==="input"||tag==="textarea"||tag==="button"||tag==="select"||ev.target.isContentEditable) return;
    if(dlg&&dlg.classList.contains("on")){ if(ev.key==="Escape"){ ev.preventDefault(); ev.stopPropagation(); hideDialog(); } return; }
    if(ev.code==="Space"){ ev.preventDefault(); ev.stopPropagation(); togglePlay(); }
    else if(ev.key==="ArrowRight"){ ev.preventDefault(); ev.stopPropagation(); e.step(1); }
    else if(ev.key==="ArrowLeft"){ ev.preventDefault(); ev.stopPropagation(); e.step(-1); }
    else if(ev.key==="r"||ev.key==="R"){ ev.preventDefault(); ev.stopPropagation(); e.restart(); }
    else if(ev.key==="Escape"){ ev.preventDefault(); ev.stopPropagation(); doExit(); }
  }

  function boot(){ ensureBtn(); setInterval(ensureBtn, 2500); }   // re-hospeda se o layout reconstruir a hotbar
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
