(function(){
  "use strict";

  /*
    DVL Beta 0.980 — Copilot Modular Core
    ------------------------------------------------------------
    Objetivo:
    - deixar o Copilot pronto para receber novas sessões no futuro
    - separar HTML por section/template
    - padronizar botões/ações
    - manter a página visualmente igual à 0.979
    - sem execução automática de trades
  */

  var DVL_COPILOT_ICON_0980 = {
    bot:
      '<svg class="dvlCp0976BotSvg" viewBox="0 0 24 24" aria-hidden="true">' +
        '<g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="5.2" y="7.2" width="13.6" height="10.8" rx="4"/>' +
          '<path d="M12 7.2V4.6"/>' +
          '<circle class="bot-dot" cx="12" cy="3.9" r="1.1"/>' +
          '<circle class="bot-eye" cx="9.55" cy="12.2" r="1.05"/>' +
          '<circle class="bot-eye" cx="14.45" cy="12.2" r="1.05"/>' +
          '<path d="M9.8 15.1c1.25.9 3.15.9 4.4 0"/>' +
          '<path d="M5.2 11.1H3.8M20.2 11.1h-1.4"/>' +
        '</g>' +
      '</svg>',

    scanner:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M4.2 17.9A9.6 9.6 0 1 1 19.8 17.9"/>' +
          '<path d="M7.05 17.9a6.75 6.75 0 1 1 9.9 0"/>' +
          '<path d="M12 12l5.35-3.2"/>' +
          '<circle class="scan-dot" cx="12" cy="12" r="1.65"/>' +
          '<path d="M12 4.1v1.55M4.1 12h1.55M18.35 12h1.55"/>' +
          '<path d="M8.2 15.8l-1.15 1.15M15.8 15.8l1.15 1.15"/>' +
        '</g>' +
      '</svg>',

    avoid:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 3.2 21 19.3H3L12 3.2Z"/>' +
          '<path d="M12 8.6v5.1"/>' +
          '<path d="M12 17.1h.01"/>' +
        '</g>' +
      '</svg>'
  };

  var DVL_COPILOT_ACTIONS_0980 = {
    closeCopilot:function(){
      try{
        if(window.DVL_COPILOT_PAGE_0974 && typeof window.DVL_COPILOT_PAGE_0974.close === "function"){
          window.DVL_COPILOT_PAGE_0974.close();
        }
      }catch(_){}
    },

    openScanner:function(){
      this.closeCopilot();
      try{
        if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 && typeof window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.open === "function"){
          window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.open();
        }else{
          var b = document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="markets"]');
          if(b) b.click();
        }
      }catch(_){}
    },

    openTrade:function(){
      this.closeCopilot();
      try{
        var root = window.DVL_BOTTOM_NAV_SINGLETON_0970;
        if(root && root.state){
          root.state.activeNav = "trade";
          if(typeof root.render === "function") root.render();
        }
      }catch(_){}
    },

    botLocked:function(){
      try{
        var msg = "Bot Soon bloqueado: Copilot não executa trades automaticamente.";
        if(typeof toast === "function") toast(msg);
        else if(typeof dvlShowToast === "function") dvlShowToast(msg);
        else console.info("[DVL Copilot]", msg);
      }catch(_){}
    },

    handle:function(action){
      if(action === "scanner") return this.openScanner();
      if(action === "trade") return this.openTrade();
      if(action === "bot") return this.botLocked();
    }
  };

  function button0980(label, action, variant){
    return '<button class="dvlCp0980Btn '+(variant||"")+'" type="button" data-dvl-cp-action="'+action+'">'+label+'</button>';
  }

  function smallBars0980(n,total){
    total = total || 7;
    var out = '<span class="dvlCp0976BarsSmall">';
    for(var i=0;i<total;i++){
      out += '<i class="'+(i<n?'on':'')+'"></i>';
    }
    return out + '</span>';
  }

  function sectionHead0980(opts){
    opts = opts || {};
    var icon = opts.icon || "";
    var cls = opts.cls || "";
    var right = opts.right || "";
    return '<div class="dvlCp0976SectionHead '+cls+'">' +
      '<b>' + icon + ' ' + (opts.title || "") + '</b>' +
      right +
    '</div>';
  }

  function metricDots0980(n,total,extraClass){
    total = total || 5;
    var out = '<div class="dvlCp0976Dots '+(extraClass||"")+'">';
    for(var i=0;i<total;i++){
      out += '<i class="'+(i<n?'on':'')+'"></i>';
    }
    return out + '</div>';
  }

  function candles0980(pattern){
    var map = {
      up:[12,18,10,22,16,26,32],
      mixed:[16,23,13,20,14,25,19],
      down:[30,25,21,18,22,14,10]
    };
    var arr = map[pattern] || map.mixed;
    return '<div class="dvlCp0976MiniCandles">' + arr.map(function(h,i){
      var red = (pattern === "down") ? i < 5 : (i === 1 || i === 4);
      return '<i class="dvlCp0976Candle '+(red?'r':'')+'" style="height:'+h+'px"></i>';
    }).join('') + '</div>';
  }

  function templateHeader0980(){
    return '' +
      '<header class="dvlCp0976Header">' +
        '<div class="dvlCp0976BrandIcon">' + DVL_COPILOT_ICON_0980.bot + '</div>' +
        '<div class="dvlCp0976Title">' +
          '<b>DVL <span>COPILOT PRO</span></b>' +
          '<small><i class="dvlCp0976Dot"></i> <span data-dvl-cp-live-status>IA ativa · Analisando 12 indicadores</span></small>' +
        '</div>' +
        '<button class="dvlCp0976CircleBtn has-dot" type="button" data-dvl-cp-action="scanner" aria-label="Alertas">' +
          '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>' +
        '</button>' +
        '<button class="dvlCp0976CircleBtn" type="button" data-dvl-cp-action="trade" aria-label="Configurações">' +
          '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 0 1-4 0v-.06a1.7 1.7 0 0 0-1-.6a1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 0 1 0-4h.06a1.7 1.7 0 0 0 .6-1a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 0 1 4 0v.06a1.7 1.7 0 0 0 1 .6a1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 9c.23.31.43.65.6 1H20a2 2 0 0 1 0 4h-.06a1.7 1.7 0 0 0-.6 1Z"/></svg>' +
        '</button>' +
      '</header>';
  }

  function templateInsight0980(){
    return '' +
      '<section class="dvlCp0976Hero" data-dvl-cp-section="insight">' +
        '<div class="dvlCp0976Radar">' +
          '<span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span>' +
          '<div class="dvlCp0976RadarBot">' + DVL_COPILOT_ICON_0980.bot + '</div>' +
        '</div>' +
        '<div class="dvlCp0976HeroCopy">' +
          '<div class="dvlCp0976Regime"><small>Regime</small><b>Tendencial ↗</b></div>' +
          '<span class="dvlCp0976Kicker">Visão de mercado · <b data-dvl-cp-live-symbol>BTC/USDT</b></span>' +
          '<h2 data-dvl-cp-live-title>Convicção Alta</h2>' +
          '<p data-dvl-cp-live-text>Fluxo comprador dominante, OI em expansão e liquidez estável criando boas condições para movimentos de continuação.</p>' +
          '<div class="dvlCp0976Confidence">' +
            '<span>Convicção da IA</span><em class="dvlCp1008ConvictionTimer" data-dvl-conviction-timer>Atualizado <b data-dvl-conviction-age>0s</b></em>' +
            '<div class="dvlCp0976Bars" data-dvl-cp-live-bars><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></div>' +
            '<b class="dvlCp0976Score" data-dvl-cp-live-score>8<small>/10</small></b>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function templateOpportunities0980(){
    function row(rank,pair,setup,pct,coinCls,coin,pattern){
      var tf = rank === 1 ? "1m" : (rank === 2 ? "3m" : "5m");
      return '' +
        '<div class="dvlCp0976Opp" data-dvl-cp-top3-row="1">' +
          '<div class="dvlCp0976Rank">'+rank+'</div>' +
          '<div class="dvlCp0976Coin '+coinCls+'">'+coin+'</div>' +
          '<div class="dvlCp0976Pair"><span class="dvlCp1004PairLine"><b>'+pair+'</b><span class="dvlCp1004InlineTf" data-dvl-opp-inline-tf>'+tf+'</span></span><small>'+setup+'</small></div>' +
          '<div class="dvlCp0976Pct">'+pct+'%<small>Confiança</small></div>' +
          candles0980(pattern) +
          '<div class="dvlCp0976Long">LONG</div>' +
          '<div class="dvlCp0976Chevron">›</div>' +
        '</div>';
    }

    return '' +
      '<section class="dvlCp0976Panel" data-dvl-cp-section="opportunities">' +
        sectionHead0980({
          title:"Oportunidades da IA",
          cls:"dvlCp0983Top3Head",
          icon:'<i>✦</i>',
          right:'<span class="dvlCp0983Top3Badge">Top 3</span>'
        }) +
        '<div class="dvlCp0976OppList">' +
          row(1,"SOL/USDT","Setup: Spike + Continuação","82","sol","S","up") +
          row(2,"AVAX/USDT","Setup: Reteste + Break","76","avax","A","mixed") +
          row(3,"LINK/USDT","Setup: Acúmulo + Break","71","link","L","mixed") +
        '</div>' +
      '</section>';
  }

  function templateScanner0980(){
    function row(rank,pair,score,barsN,age,status,statusCls){
      return '' +
        '<div class="dvlCp0976ScanRow">' +
          '<div>'+rank+'</div>' +
          '<div class="dvlCp0976AssetCell"><b>'+pair+'</b></div>' +
          '<div>'+score+smallBars0980(barsN,6)+'</div>' +
          '<div class="dvlCp0976Age">'+age+'</div>' +
          '<div><span class="dvlCp0976Status '+(statusCls||'')+'">'+status+'</span></div>' +
        '</div>';
    }

    return '' +
      '<section class="dvlCp0976Panel" data-dvl-cp-section="scanner">' +
        sectionHead0980({
          title:"Scanner inteligente",
          cls:"dvlCp0979ScannerHead",
          icon:'<i class="dvlCp0979ScannerTitleIcon">'+DVL_COPILOT_ICON_0980.scanner+'</i>',
          right:'<button type="button" data-dvl-cp-action="scanner">Abrir Scanner ›</button>'
        }) +
        '<div class="dvlCp0983ScannerMiniNote">Resumo rápido do Scanner padrão</div>' +
        '<div class="dvlCp0976ScannerTable">' +
          '<div class="dvlCp0976ScanRow head"><div>#</div><div>Ativo</div><div>Spike</div><div>Tempo</div><div>Status</div></div>' +
          row(1,"MATIC/USDT","78",6,"agora","Pós-flat","") +
          row(2,"DOT/USDT","63",5,"2m","Limpo","") +
          row(3,"XRP/USDT","61",5,"5m","Formando","yellow") +
          row(4,"ARB/USDT","55",4,"9m","Acúmulo","") +
          row(5,"ASTR/USDT","49",4,"14m","Pré-break","") +
          row(6,"SUI/USDT","46",4,"22m","Observar","gray") +
        '</div>' +
        '<div class="dvlCp0976Foot">' +
          '<span><i class="dvlCp0976Dot"></i> Atualizado agora há pouco</span>' +
          '<span>Filtros ativos: <b>3</b></span>' +
        '</div>' +
      '</section>';
  }

  function templateAvoid0980(){
    function item(title,value,state){
      return '' +
        '<div class="dvlCp0985DecisionItem '+(state||"")+'">' +
          '<span>'+title+'</span>' +
          '<b>'+value+'</b>' +
        '</div>';
    }

    function check(text,cls){
      return '<i class="'+(cls||"")+'">'+text+'</i>';
    }

    return '' +
      '<section class="dvlCp0976Panel dvlCp0985DecisionPanel" data-dvl-cp-section="decision">' +
        sectionHead0980({
          title:"Checklist da IA",
          cls:"dvlCp0985DecisionHead",
          icon:'<i class="dvlCp0985DecisionIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 13.2 9 17.4 19.2 7.2"/><path d="M12 3.8a8.2 8.2 0 1 0 8.2 8.2"/></g></svg></i>',
          right:'<span class="dvlCp0985DecisionChip">Decisão</span>'
        }) +
        '<div class="dvlCp0985DecisionSub">Use o Top 3 como filtro. Aqui ficam as condições para validar a entrada.</div>' +
        '<div class="dvlCp0985DecisionGrid">' +
          item("Setup dominante","Continuação LONG","good") +
          item("Melhor entrada","Pullback ou rompimento","wait") +
          item("Risco atual","Moderado","neutral") +
          item("Invalidação","Perder estrutura + volume contra","risk") +
        '</div>' +
        '<div class="dvlCp0985ConfirmBox">' +
          '<div class="dvlCp0985ConfirmTitle">Confirmações antes da entrada</div>' +
          '<div class="dvlCp0985ConfirmTags">' +
            check("spike recente","good") +
            check("volume sustenta","good") +
            check("candle confirma","wait") +
            check("sem pullback violento","risk") +
          '</div>' +
        '</div>' +
        '<div class="dvlCp0985DecisionFoot"><span>Leitura gerada para o Top 3 atual</span><b>IA não executa trades</b></div>' +
      '</section>';
  }
  function templateBotSoon0980(){
    return '' +
      '<section class="dvlCp0976BotSoon" data-dvl-cp-section="bot-soon">' +
        '<div class="dvlCp0976BotBadge">' + DVL_COPILOT_ICON_0980.bot + '</div>' +
        '<div class="dvlCp0976BotText">' +
          '<b>DVL BOT <span class="dvlCp0976Soon">SOON</span></b>' +
          '<p>Automação, alertas inteligentes e backtests avançados.<br>Execução de trade segue bloqueada nesta versão.</p>' +
        '</div>' +
        button0980("Saiba mais ›","bot","dvlCp0980BotBtn") +
      '</section>';
  }

  var DVL_COPILOT_SECTION_REGISTRY_0980 = [
    { key:"header", render:templateHeader0980 },
    { key:"insight", render:templateInsight0980 },
    { key:"opportunities", render:templateOpportunities0980 },
    { key:"scanner", render:templateScanner0980 },
    { key:"avoid", render:templateAvoid0980 },
    { key:"botSoon", render:templateBotSoon0980 }
  ];

  function renderCopilot0980(){
    return '<div class="dvlCp0976Shell" data-dvl-copilot-core="0980">' +
      DVL_COPILOT_SECTION_REGISTRY_0980.map(function(section){
        return section.render();
      }).join('') +
    '</div>';
  }

  function install0980(){
    var page = document.getElementById("dvlCopilotPage0974");
    if(!page){
      try{
        if(window.DVL_COPILOT_PAGE_0974 && typeof window.DVL_COPILOT_PAGE_0974.ensure === "function"){
          page = window.DVL_COPILOT_PAGE_0974.ensure();
        }
      }catch(_){}
    }
    if(!page) return false;

    page.innerHTML = renderCopilot0980();
    page.dataset.dvlCopilotModularCore = "0980";

    if(!page.dataset.dvlCopilotModularBound){
      page.dataset.dvlCopilotModularBound = "1";
      page.addEventListener("click", function(ev){
        var t = ev.target && ev.target.closest ? ev.target.closest("[data-dvl-cp-action]") : null;
        if(!t) return;
        ev.preventDefault();
        ev.stopPropagation();
        DVL_COPILOT_ACTIONS_0980.handle(t.getAttribute("data-dvl-cp-action"));
      }, false);
    }

    return true;
  }

  function registerSection0980(section, afterKey){
    if(!section || !section.key || typeof section.render !== "function") return false;
    var exists = DVL_COPILOT_SECTION_REGISTRY_0980.some(function(s){ return s.key === section.key; });
    if(exists) return false;

    if(afterKey){
      var idx = DVL_COPILOT_SECTION_REGISTRY_0980.findIndex(function(s){ return s.key === afterKey; });
      if(idx >= 0){
        DVL_COPILOT_SECTION_REGISTRY_0980.splice(idx + 1, 0, section);
      }else{
        DVL_COPILOT_SECTION_REGISTRY_0980.push(section);
      }
    }else{
      DVL_COPILOT_SECTION_REGISTRY_0980.push(section);
    }

    install0980();
    return true;
  }

  function boot0980(){
    install0980();
    setTimeout(install0980,0);
    setTimeout(install0980,300);
    setTimeout(install0980,950);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot0980, {once:true});
  else boot0980();

  window.DVL_COPILOT_MODULAR_CORE_0980 = {
    version:"0.980",
    icons:DVL_COPILOT_ICON_0980,
    actions:DVL_COPILOT_ACTIONS_0980,
    sections:DVL_COPILOT_SECTION_REGISTRY_0980,
    button:button0980,
    render:renderCopilot0980,
    install:install0980,
    registerSection:registerSection0980,
    audit:function(){
      var page = document.getElementById("dvlCopilotPage0974");
      var root = page ? page.querySelector('[data-dvl-copilot-core="0980"]') : null;
      var sectionNodes = root ? root.querySelectorAll("[data-dvl-cp-section]") : [];
      var keys = DVL_COPILOT_SECTION_REGISTRY_0980.map(function(s){ return s.key; });
      return {
        version:"0.980",
        pageFound:!!page,
        modularRootFound:!!root,
        sectionRegistryKeys:keys,
        renderedSectionCount:sectionNodes.length,
        hasButtonFactory:typeof button0980 === "function",
        hasActionBridge:!!DVL_COPILOT_ACTIONS_0980,
        futureRegisterSectionApi:true,
        noTradeExecution:true,
        noOrdersSent:true,
        noDrawingsTouch:true,
        noIndicatorsTouch:true,
        noApiTouch:true,
        noFallbackTouch:true,
        pass:!!(page && root && sectionNodes.length >= 5)
      };
    }
  };

  window.DVL_COPILOT_MODULAR_CORE_AUDIT = function(){
    return window.DVL_COPILOT_MODULAR_CORE_0980.audit();
  };
})();
