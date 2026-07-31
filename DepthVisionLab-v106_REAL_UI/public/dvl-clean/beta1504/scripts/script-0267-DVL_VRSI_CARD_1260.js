/* Beta 1.260 — Copilot: card do NOVO modelo VP + RSI-V (substitui os cards do ML
   antigo, que foram removidos do backend). Lê /vrsi-model (combos aprendidos por
   TF) e /vrsi-backtest (backtest financeiro). Só leitura. */
(function(){
  "use strict";
  if(window.__DVL_VRSI_CARD_ON) return; window.__DVL_VRSI_CARD_ON=true;
  /* esconde os cards antigos (Aprendizado ML + Backtest financeiro do pump) —
     via <style> (pega elementos futuros) + imperativo (pega os já montados). */
  function injectHideStyle(){ try{ if(document.getElementById("dvlVrsiHideOld")) return; var st=document.createElement("style"); st.id="dvlVrsiHideOld"; st.textContent=".dvlCp1024MlPanel,.dvlBt1040Panel{display:none!important}"; (document.head||document.documentElement).appendChild(st); }catch(_){} }
  function hideOld(){ try{ var els=document.querySelectorAll(".dvlCp1024MlPanel,.dvlBt1040Panel,.dvlCpBt1124,#dvlCpPm1120Card,[data-dvl-cp-section='pumpModel']"); for(var i=0;i<els.length;i++) els[i].style.display="none"; }catch(_){} }
  injectHideStyle();

  function api(p){ try{ var br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023; if(br&&typeof br.api==="function") return br.api(p); }catch(_){} return p; }
  function esc(v){ return String(v==null?"":v).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }
  function isOpen(){ try{ return document.body.classList.contains("dvlCopilotOpen0974") || !!(document.getElementById("dvlCopilotPage0974")&&document.getElementById("dvlCopilotPage0974").classList.contains("is-open")); }catch(_){ return false; } }

  var DATA={model:null,bt:{ "1m":null, "5m":null }};
  function pull(){
    if(!isOpen()) return;
    fetch(api("/api/dvl/scanner/vrsi-model"),{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(j){ if(j){DATA.model=j; render();} }).catch(function(){});
    ["1m","5m"].forEach(function(tf){
      fetch(api("/api/dvl/scanner/vrsi-backtest?tf="+tf),{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(j){ if(j){DATA.bt[tf]=j; render();} }).catch(function(){});
    });
  }

  function mount(){
    var page=document.getElementById("dvlCopilotPage0974"); if(!page) return null;
    var el=document.getElementById("dvlVrsiCard");
    if(!el){
      el=document.createElement("section"); el.id="dvlVrsiCard"; el.className="dvlCp0976Panel";
      el.style.cssText="margin:10px 0;padding:12px 14px;border-radius:14px;background:linear-gradient(180deg,rgba(8,20,14,.92),rgba(4,14,10,.92));border:1px solid rgba(16,223,119,.22);color:#dcebe4;font:600 12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif";
      var anchor=page.querySelector(".dvlCp0976Panel:not(#dvlVrsiCard)");
      if(anchor&&anchor.parentNode) anchor.parentNode.insertBefore(el,anchor);
      else page.insertBefore(el, page.firstChild);
    }
    return el;
  }

  function zoneName(z){ return z==="val"?"VAL":(z==="vah"?"VAH":(z==="poc"?"POC":esc(z))); }
  function confTag(mc){ mc=Number(mc)||1; return mc>1 ? ' · <b style="color:#20e6ba">confl. '+mc+' sessões</b>' : ''; }
  function combo(c){
    if(!c) return '<span style="color:#7f9c8e">sem combo confiável ainda</span>';
    return 'sessão <b>'+esc(c.session)+'</b> · zona <b>'+zoneName(c.zone)+'</b> · prox '+esc(c.prox)+'×ATR · SL '+esc(c.slAtr)+'×ATR · RSI '+esc(c.rsiThresh)+confTag(c.minConf)+' · alvo <b>'+esc(c.tp)+'</b>'
      +'<br><span style="color:#8aa99b">treino '+esc(c.trainRet)+'% · teste '+esc(c.testRet)+'% · acerto '+esc(c.winRate)+'% · '+esc(c.trades)+' trades</span>';
  }
  /* Quando não há combo que GENERALIZE, mostra o melhor candidato (diag) com status
     honesto — explica por que o lado está "off" em vez de deixar em branco. */
  function sideStatus(best, diag, sideCount){
    if(best) return combo(best);
    if(diag && diag.combos){
      if(diag.session==null) return '<span style="color:#7f9c8e">avaliando '+esc(diag.combos)+' combos… ('+esc(sideCount||0)+' amostras)</span>';
      var neg=(Number(diag.testRet)<0||Number(diag.trainRet)<0);
      var why=neg?'melhor combo ainda PERDE out-of-sample no regime atual':'quase lá — poucos trades no teste';
      return '<span style="color:#f4b942">aguardando · '+why+'</span>'
        +'<br><span style="color:#8aa99b">melhor: '+esc(diag.session)+'/'+zoneName(diag.zone)+' · prox '+esc(diag.prox)+' · SL '+esc(diag.slAtr)+' · RSI '+esc(diag.rsiThresh)+(Number(diag.minConf)>1?(' · confl.'+esc(diag.minConf)):'')+' · alvo '+esc(diag.tp)
        +' · treino '+esc(diag.trainRet)+'% · teste '+esc(diag.testRet)+'% · acerto '+esc(diag.winRate)+'% · '+esc(diag.testTrades)+'t · '+esc(sideCount||0)+' amostras</span>';
    }
    return '<span style="color:#7f9c8e">coletando setups reais…</span>';
  }
  function money(v){ v=Number(v); if(!isFinite(v)) return "--"; return "$"+v.toFixed(0); }
  function btLine(bt,side){
    var r=bt&&bt[side]; if(!r) return "";
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:1px 0"><span style="color:#9fb6ab">'+side.toUpperCase()+'</span><b style="color:'+(r.returnPct>=0?"#16c784":"#ff4a61")+'">'+money(r.account)+' ('+(r.returnPct>=0?"+":"")+Number(r.returnPct).toFixed(1)+'%)</b><span style="color:#8aa99b">acerto '+Number(r.winRate).toFixed(0)+'% · DD '+Number(r.maxDrawdownPct).toFixed(0)+'% · '+r.trades+'t</span></div>';
  }

  function tfBlock(tf){
    var m=DATA.model&&DATA.model.tfs&&DATA.model.tfs[tf];
    var bt=DATA.bt[tf];
    var head='<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px"><b style="color:#10df77">'+tf+'</b><span style="color:#8aa99b;font-size:11px">'+(m?esc(m.samples)+' amostras':'—')+'</span></div>';
    if(!m||!m.ready) return head+'<div style="color:#8aa99b;font-size:11px">coletando setups reais… o modelo aprende quando tiver amostras resolvidas suficientes.</div>';
    var dg=m.diag||{}, sd=m.sides||{};
    var body='<div style="font-size:11px;margin-bottom:3px"><span style="color:#13dc8d">COMPRA (VAL→POC):</span> '+sideStatus(m.long, dg.long, sd.long)+'</div>'
            +'<div style="font-size:11px"><span style="color:#ff6b81">VENDA (VAH→POC):</span> '+sideStatus(m.short, dg.short, sd.short)+'</div>';
    var btHtml = bt&&bt.ready ? ('<div style="margin-top:6px;padding-top:5px;border-top:1px solid rgba(129,166,151,.16)"><div style="color:#7f9c8e;font-size:10px;margin-bottom:2px">BACKTEST FINANCEIRO · $1000 · risco 1%/trade</div>'+btLine(bt,"long")+btLine(bt,"short")+'</div>') : '';
    return head+body+btHtml;
  }

  function render(){
    var el=mount(); if(!el) return;
    el.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:13px;color:#eafff4">Modelo VP + RSI-V</b><span style="color:#7f9c8e;font-size:10px">aprende sua estratégia real · só leitura</span></div>'
      +'<div style="color:#8aa99b;font-size:10.5px;margin-bottom:6px">RSI vzinho numa zona de VP → alvo no POC, stop por ATR além da zona. Aprende, out-of-sample, qual sessão/zona/limiar/stop/alvo rende mais — por timeframe.</div>'
      +tfBlock("1m")+tfBlock("5m");
    el.style.display="block";
  }

  var _t=null;
  function loop(){ try{ injectHideStyle(); hideOld(); if(isOpen()) pull(); }catch(_){} }
  function boot(){ injectHideStyle(); hideOld(); setInterval(loop, 30000); loop(); try{ window.addEventListener("dvl:copilot-open",function(){ setTimeout(function(){ hideOld(); render(); pull(); },50); }); }catch(_){}
    /* também tenta renderizar/pull logo que o Copilot abrir por clique */
    document.addEventListener("click",function(){ setTimeout(function(){ if(isOpen()){ render(); pull(); } },200); },true);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
