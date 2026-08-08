(function(){
  "use strict";

  var BOT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="5.2" y="7.2" width="13.6" height="10.8" rx="4"/><path d="M12 7.2V4.6"/><circle class="bot-dot" cx="12" cy="3.9" r="1.1"/><circle class="bot-eye" cx="9.55" cy="12.2" r="1.05"/><circle class="bot-eye" cx="14.45" cy="12.2" r="1.05"/><path d="M9.8 15.1c1.25.9 3.15.9 4.4 0"/><path d="M5.2 11.1H3.8M20.2 11.1h-1.4"/></g></svg>';

  function ensure(){
    var p = document.getElementById("dvlCopilotPage0974");
    if(p) return p;

    p = document.createElement("section");
    p.id = "dvlCopilotPage0974";
    p.setAttribute("aria-label","DVL Copilot");
    p.innerHTML =
      '<div class="dvlCp0974Shell">' +
        '<div class="dvlCp0974Top">' +
          '<div class="dvlCp0974Bot">' + BOT_SVG + '</div>' +
          '<div class="dvlCp0974Title"><b>DVL Copilot</b><span>IA de leitura, contexto e scanner — execução bloqueada</span></div>' +
          '<button class="dvlCp0974Close" type="button" aria-label="Fechar Copilot">×</button>' +
        '</div>' +
        '<section class="dvlCp0974Hero">' +
          '<small>● Online em modo análise</small>' +
          '<h2>Centro inteligente do DepthVisionLab</h2>' +
          '<p>O Copilot organiza leitura de mercado, risco, sinais, contexto e navegação. Ele não executa trades nem envia ordens automaticamente.</p>' +
          '<div class="dvlCp0974StateLine"><span>Ativo atual</span><b data-dvl-cp-symbol>BTC/USDT</b></div>' +
          '<div class="dvlCp0974Actions">' +
            '<button class="dvlCp0974Action" type="button" data-dvl-cp-action="scanner">⌁ Abrir Scanner</button>' +
            '<button class="dvlCp0974Action secondary" type="button" data-dvl-cp-action="trade">↔ Voltar ao gráfico</button>' +
          '</div>' +
        '</section>' +
        '<div class="dvlCp0974Grid">' +
          '<article class="dvlCp0974Card"><i>AI</i><b>Visão geral</b><span>Resumo do ativo, volatilidade, tendência, liquidez e contexto operacional.</span></article>' +
          '<article class="dvlCp0974Card"><i>↗</i><b>Oportunidades</b><span>Lista de setups relevantes detectados por leitura de candle, volume e zonas.</span></article>' +
          '<article class="dvlCp0974Card"><i>!</i><b>Ativos a evitar</b><span>Mercados sujos, spread ruim, baixa leitura ou risco fora do padrão.</span></article>' +
          '<article class="dvlCp0974Card"><i>⌁</i><b>Scanner DVL</b><span>Atalhos para sinais em tempo real e priorização dos ativos mais limpos.</span></article>' +
          '<article class="dvlCp0974Card wide"><i>◎</i><b>Desempenho e contexto</b><span>Em breve: métricas do treino, acertos por setup, disciplina, replay e evolução por ativo.</span>' +
            '<div class="dvlCp0974List">' +
              '<div class="dvlCp0974Row" data-dvl-cp-action="trade"><div class="dvlCp0974Coin">B</div><div><b data-dvl-cp-symbol-row>BTC/USDT</b><span>Contexto atual pronto para análise</span></div><em class="dvlCp0974Tag">Monitorar</em></div>' +
              '<div class="dvlCp0974Row" data-dvl-cp-action="scanner"><div class="dvlCp0974Coin">S</div><div><b>Scanner</b><span>Fonte principal de oportunidades</span></div><em class="dvlCp0974Tag">Abrir</em></div>' +
              '<div class="dvlCp0974Row" data-dvl-cp-action="watchlist"><div class="dvlCp0974Coin">★</div><div><b>Watchlist</b><span>Ativos favoritos e observação rápida</span></div><em class="dvlCp0974Tag">Abrir</em></div>' +
              '<div class="dvlCp0974Row" data-dvl-cp-action="bot"><div class="dvlCp0974Coin">⊘</div><div><b>Bot Soon</b><span>Execução automática continua bloqueada</span></div><em class="dvlCp0974Tag dvlCp0974Locked">Bloqueado</em></div>' +
            '</div>' +
          '</article>' +
        '</div>' +
      '</div>';

    document.body.appendChild(p);
    p.querySelector(".dvlCp0974Close").addEventListener("click", close, false);
    p.addEventListener("click", function(ev){
      var t = ev.target && ev.target.closest ? ev.target.closest("[data-dvl-cp-action]") : null;
      if(!t) return;
      ev.preventDefault();
      ev.stopPropagation();
      handleAction(t.getAttribute("data-dvl-cp-action"));
    }, false);
    return p;
  }

  function setHomeActive(on){
    try{
      var root = window.DVL_BOTTOM_NAV_SINGLETON_0970;
      if(root && root.state){
        root.state.activeNav = on ? "home" : "trade";
        if(typeof root.render === "function") root.render();
      }
      var btn = document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="home"]');
      if(btn){
        btn.classList.toggle("is-active", !!on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
    }catch(_){}
  }

  function closeOthers(){
    try{ if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 && typeof window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close === "function") window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close(); }catch(_){}
    try{ if(window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722 && typeof window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722.close === "function") window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722.close(); }catch(_){}
    try{ if(window.closeWatchlistPanel) window.closeWatchlistPanel(); }catch(_){}
    try{
      var dr = document.querySelector(".tradeDrawer");
      var oldT = document.getElementById("tradeNavBtn");
      if(dr && dr.classList.contains("is-open") && oldT) oldT.click();
    }catch(_){}
  }

  function currentDisplaySymbol(){
    try{
      var st = document.getElementById("symbolText");
      var raw = st ? (st.textContent || "").trim() : "";
      if(raw) return raw.indexOf("/") >= 0 ? raw : raw.replace(/USDT$/,"/USDT");
    }catch(_){}
    try{
      if(window.symbol) return String(window.symbol).replace(/USDT$/,"/USDT");
    }catch(_){}
    return "BTC/USDT";
  }

  function refreshSymbol(){
    try{
      var val = currentDisplaySymbol();
      document.querySelectorAll("[data-dvl-cp-symbol],[data-dvl-cp-symbol-row]").forEach(function(el){
        el.textContent = val;
      });
    }catch(_){}
  }

  function openScanner(){
    close();
    try{
      if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 && typeof window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.open === "function"){
        window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.open();
      }else{
        var b = document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="markets"]');
        if(b) b.click();
      }
    }catch(_){}
  }

  function openTrade(){
    close();
    try{
      if(window.DVL_BOTTOM_NAV_SINGLETON_0970 && window.DVL_BOTTOM_NAV_SINGLETON_0970.state){
        window.DVL_BOTTOM_NAV_SINGLETON_0970.state.activeNav = "trade";
        if(typeof window.DVL_BOTTOM_NAV_SINGLETON_0970.render === "function") window.DVL_BOTTOM_NAV_SINGLETON_0970.render();
      }
    }catch(_){}
  }

  function openWatchlist(){
    close();
    try{
      var b = document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="watchlist"]');
      if(b) b.click();
    }catch(_){}
  }

  function botLocked(){
    try{
      var msg = "Bot Soon bloqueado: Copilot não executa trades automaticamente.";
      if(typeof toast === "function") toast(msg);
      else if(typeof dvlShowToast === "function") dvlShowToast(msg);
      else console.info("[DVL Copilot]", msg);
    }catch(_){}
  }

  function handleAction(action){
    if(action === "scanner") return openScanner();
    if(action === "trade") return openTrade();
    if(action === "watchlist") return openWatchlist();
    if(action === "bot") return botLocked();
  }

  function open(){
    closeOthers();
    /* Beta 1.635 — o botão "Copilot" virou "Lab" (X-Ray Lab). Em vez de abrir a
       antiga página do Copilot, este botão agora abre o Lab (chips + camadas +
       overlay). A classe no body é mantida só para a lógica de TOGGLE da nav
       continuar detectando "aberto/fechado". */
    try{ if(window.DVL_LAB && typeof window.DVL_LAB.open === "function") window.DVL_LAB.open(); }catch(_){}
    /* Beta 1.638 — NÃO seta mais a classe dvlCopilotOpen0974 no body: outros
       módulos do Copilot (VRSI card, live-context, pump) reagiam a ela e vazavam
       UI antiga por cima do Lab. O toggle da nav agora lê DVL_LAB.isOpen(). */
    setHomeActive(true);
    try{ window.dispatchEvent(new CustomEvent("dvl:copilot-state-change",{detail:{open:true}})); }catch(_){}
  }

  function close(){
    try{ if(window.DVL_LAB && typeof window.DVL_LAB.close === "function") window.DVL_LAB.close(); }catch(_){}
    var p = document.getElementById("dvlCopilotPage0974");
    if(p) p.classList.remove("is-open");
    document.body.classList.remove("dvlCopilotOpen0974");
    setHomeActive(false);
    try{ window.dispatchEvent(new CustomEvent("dvl:copilot-state-change",{detail:{open:false}})); }catch(_){}
  }

  function boot(){
    /* Beta 1.638 — o Copilot foi substituído pelo Lab: garante que a página antiga
       do Copilot NUNCA apareça, mesmo se algum módulo legado tentar abri-la. */
    try{
      if(!document.getElementById("dvlLabHideCopilot0638")){
        var _hs=document.createElement("style"); _hs.id="dvlLabHideCopilot0638";
        _hs.textContent="#dvlCopilotPage0974{display:none!important}";
        (document.head||document.documentElement).appendChild(_hs);
      }
    }catch(_){}
    ensure();

    try{
      if(window.DVL_BOTTOM_NAV_SINGLETON_0970 && typeof window.DVL_BOTTOM_NAV_SINGLETON_0970.replaceItem === "function"){
        // Beta 1.635 — "Copilot" → "Lab" (X-Ray Lab). Ícone de béquer/laboratório.
        window.DVL_BOTTOM_NAV_SINGLETON_0970.replaceItem("home","Lab",'<svg class="dvlLabLogo0635" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 3v6l-4.2 7.3A2 2 0 0 0 7.5 19h9a2 2 0 0 0 1.7-2.7L14 9V3"/><path d="M7.7 14h8.6"/></g></svg>');
      }
    }catch(_){}

    window.addEventListener("dvl:scanner-state-change", close, true);
    window.addEventListener("dvl:watchlist-state-change", close, true);
    /* Beta 1.635 — quando o Lab é fechado pela própria UI dele (swipe/chip), sincroniza
       a nav (tira o destaque do botão e limpa a classe de toggle do body). */
    window.addEventListener("dvl:lab-state-change", function(ev){
      try{
        if(ev && ev.detail && ev.detail.open === false){
          document.body.classList.remove("dvlCopilotOpen0974");
          setHomeActive(false);
        }
      }catch(_){}
    }, true);

    try{
      var st = document.getElementById("symbolText");
      if(st){
        var mo = new MutationObserver(refreshSymbol);
        mo.observe(st,{childList:true,characterData:true,subtree:true});
      }
    }catch(_){}
    refreshSymbol();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_PAGE_0974 = {
    version:"0.974",
    open:open,
    close:close,
    ensure:ensure,
    audit:function(){
      var p = document.getElementById("dvlCopilotPage0974");
      var btn = document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="home"]');
      return {
        version:"0.974",
        pageFound:!!p,
        homeRenamedToCopilot:!!(btn && /Copilot/i.test(btn.textContent || "")),
        robotIconFound:!!(btn && btn.querySelector(".dvlCopilotLogo0974")),
        executionBlocked:true,
        safeActionsBridge:true,
        scannerActionFound:!!(p && p.querySelector('[data-dvl-cp-action="scanner"]')),
        tradeActionFound:!!(p && p.querySelector('[data-dvl-cp-action="trade"]')),
        watchlistActionFound:!!(p && p.querySelector('[data-dvl-cp-action="watchlist"]')),
        botLockedActionFound:!!(p && p.querySelector('[data-dvl-cp-action="bot"]')),
        currentSymbol:currentDisplaySymbol(),
        bottomNavPreserved:!!document.getElementById("dvlBottomNavV2"),
        pass:!!(p && btn && btn.querySelector(".dvlCopilotLogo0974"))
      };
    }
  };

  window.DVL_COPILOT_PAGE_AUDIT = function(){
    return window.DVL_COPILOT_PAGE_0974.audit();
  };
})();
