/* ── DVL Performance HUD (Beta 1.186) — DESLIGADO por padrão ──────────────────
   Ferramenta de MEDIÇÃO da fluidez (não muda nada do app). Custo ZERO quando
   off: sem loop, só dois listeners triviais. Mobile intocado (só aparece quando
   você liga). O overlay não bloqueia toque (pointer-events:none).

   LIGAR/DESLIGAR:
     • Desktop: aperte a tecla  P  três vezes rápido (<1,2s).
     • Mobile: toque 3x rápido com DOIS dedos.
     • URL: adicione  ?perf=1  (força ligar) ou  ?perf=0  (força desligar).
   O estado persiste no aparelho (localStorage).

   O QUE MOSTRA:
     • FPS + tempo de frame (mediana e máximo) — o sinal CONFIÁVEL da fluidez.
     • jank: nº de frames acima de 50ms na janela (travadas visíveis).
     • long tasks: bloqueios de main-thread >50ms (via PerformanceObserver).
     • draw(): custo do render global — best-effort (só pega redraws chamados de
       fora do bloco onde draw() é definido; se não pegar, o FPS/frame já basta). */
(function(){
  "use strict";
  /* Beta 1.188 — ?glow=0 força o glow desligado SEMPRE (mesmo parado), pra
     medir o custo do brilho no HUD; ?glow=1 remove a força. */
  try{
    if(/[?&]glow=0/.test(location.search)) window.__dvlGlowForceOff = true;
    if(/[?&]glow=1/.test(location.search)) window.__dvlGlowForceOff = false;
  }catch(_){}
  var KEY="DVL_PERF_HUD";
  function want(){
    try{
      if(/[?&]perf=1/.test(location.search)) return true;
      if(/[?&]perf=0/.test(location.search)) return false;
      return localStorage.getItem(KEY)==="1";
    }catch(_){ return false; }
  }

  var on=false, hud=null, raf=0;
  var last=0, frames=[], lastRender=0;
  var drawMs=[], drawCount=0, drawWrapped=false, wrapOrig=null;
  var lastDC=0, lastDCt=0;
  var lt=[], po=null;

  function med(a){ if(!a.length) return 0; var s=a.slice().sort(function(x,y){return x-y;}); return s[Math.floor(s.length/2)]; }
  function mx(a){ return a.length? a.reduce(function(m,x){return x>m?x:m;},0):0; }
  function f1(n){ return (Math.round(n*10)/10).toFixed(1); }

  function wrapDraw(){
    if(drawWrapped || typeof window.draw!=="function") return;
    wrapOrig=window.draw;
    window.draw=function(){
      var t=performance.now();
      try{ return wrapOrig.apply(this,arguments); }
      finally{ var d=performance.now()-t; drawMs.push(d); if(drawMs.length>120) drawMs.shift(); drawCount++; }
    };
    drawWrapped=true;
  }
  function unwrapDraw(){ if(drawWrapped && wrapOrig){ try{ window.draw=wrapOrig; }catch(_){} wrapOrig=null; drawWrapped=false; } }

  function loop(now){
    if(!on) return;
    if(last) { var dt=now-last; if(dt>0){ frames.push(dt); if(frames.length>90) frames.shift(); } }
    last=now;
    raf=requestAnimationFrame(loop);
    if(now-lastRender>250){ paint(now); lastRender=now; }
  }

  function paint(now){
    if(!hud) return;
    var fm=med(frames), fmax=mx(frames);
    var fps=fm? Math.round(1000/fm):0;
    var jank=0; for(var i=0;i<frames.length;i++) if(frames[i]>50) jank++;
    var dps=0; if(lastDCt) dps=Math.round((drawCount-lastDC)/Math.max(0.001,(now-lastDCt)/1000));
    lastDC=drawCount; lastDCt=now;
    var ltN=lt.length, ltSum=0; for(var j=0;j<lt.length;j++) ltSum+=lt[j];
    var mem=""; try{ if(performance.memory) mem=" · heap "+Math.round(performance.memory.usedJSHeapSize/1048576)+"MB"; }catch(_){}
    var col=fps>=50?"#3ad07a":(fps>=30?"#e6c14b":"#e6584b");
    hud.innerHTML=
      '<b style="color:'+col+'">'+fps+' FPS</b> &nbsp;frame '+f1(fm)+'ms <span style="opacity:.6">(máx '+f1(fmax)+')</span><br>'+
      'jank&gt;50ms: <b>'+jank+'</b>/'+frames.length+' &nbsp;·&nbsp; longtask: <b>'+ltN+'</b> ('+Math.round(ltSum)+'ms)<br>'+
      'draw(): '+(drawWrapped?(f1(med(drawMs))+'ms méd · '+f1(mx(drawMs))+'ms máx · '+dps+'x/s'):'<span style="opacity:.6">não capturado (use FPS)</span>')+
      mem+
      '<br><span style="opacity:.55">DVL Perf · v'+(window.DVL_APP_VERSION||"")+' · P·P·P p/ fechar</span>';
    lt.length=0;
  }

  function start(){
    if(on) return; on=true;
    frames=[]; drawMs=[]; last=0; lastRender=0; lastDC=0; lastDCt=0; lt=[];
    wrapDraw();
    try{
      if(!po && window.PerformanceObserver){
        po=new PerformanceObserver(function(list){ if(!on) return; var es=list.getEntries(); for(var i=0;i<es.length;i++) lt.push(es[i].duration); });
        po.observe({entryTypes:["longtask"]});
      }
    }catch(_){}
    if(!hud){
      hud=document.createElement("div");
      hud.id="dvlPerfHud";
      hud.style.cssText="position:fixed;top:8px;left:8px;z-index:2147483647;pointer-events:none;"+
        "font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#d8f0e6;"+
        "background:rgba(6,12,18,.84);border:1px solid rgba(120,200,160,.35);border-radius:9px;"+
        "padding:7px 10px;box-shadow:0 6px 22px rgba(0,0,0,.55);white-space:nowrap;letter-spacing:.2px;";
      (document.body||document.documentElement).appendChild(hud);
    }
    hud.style.display="block";
    raf=requestAnimationFrame(loop);
    try{ localStorage.setItem(KEY,"1"); }catch(_){}
  }

  function stop(){
    on=false;
    if(raf){ cancelAnimationFrame(raf); raf=0; }
    if(hud) hud.style.display="none";
    unwrapDraw();
    try{ localStorage.setItem(KEY,"0"); }catch(_){}
  }
  function syncToggleUI(){ try{ var t=document.getElementById("dvlPerfPropsToggle"); if(t) t.checked=on; }catch(_){} }
  function toggle(){ on?stop():start(); syncToggleUI(); }

  /* Beta 1.361 — o painel de performance ("Propriedades") agora liga/desliga
     APENAS pelo botão nas Configurações do gráfico (⚙️). Os antigos gestos
     (P×3 no desktop, 3 toques com 2 dedos no mobile) foram removidos porque
     disparavam sem querer durante o uso/arraste. ?perf=1/0 na URL ainda força. */
  function bindSettingsToggle(){
    var t=document.getElementById("dvlPerfPropsToggle");
    if(!t || t.__dvlBound) return;
    t.__dvlBound=true;
    t.checked=on;
    t.addEventListener("change", function(){ if(t.checked) start(); else stop(); syncToggleUI(); });
  }

  function boot(){ bindSettingsToggle(); if(want()) start(); else { try{ if(/[?&]perf=0/.test(location.search)) localStorage.setItem(KEY,"0"); }catch(_){} } syncToggleUI(); }
  if(document.readyState==="complete" || document.readyState==="interactive") setTimeout(boot,900);
  else window.addEventListener("DOMContentLoaded", function(){ setTimeout(boot,900); });

  window.DVLPerfHUD={ start:start, stop:stop, toggle:toggle, get on(){return on;} };
})();
