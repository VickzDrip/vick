(function(){
  "use strict";

  var BOT = '<svg class="dvlCp0976BotSvg" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="5.2" y="7.2" width="13.6" height="10.8" rx="4"/><path d="M12 7.2V4.6"/><circle class="bot-dot" cx="12" cy="3.9" r="1.1"/><circle class="bot-eye" cx="9.55" cy="12.2" r="1.05"/><circle class="bot-eye" cx="14.45" cy="12.2" r="1.05"/><path d="M9.8 15.1c1.25.9 3.15.9 4.4 0"/><path d="M5.2 11.1H3.8M20.2 11.1h-1.4"/></g></svg>';

  function candles(pattern){
    var map = {
      up:[12,18,10,22,16,26,32],
      mixed:[16,23,13,20,14,25,19],
      down:[30,25,21,18,22,14,10],
      break:[9,14,11,18,23,19,30]
    };
    var arr = map[pattern] || map.mixed;
    return '<div class="dvlCp0976MiniCandles">' + arr.map(function(h,i){
      var red = (pattern === "down") ? i < 5 : (i === 1 || i === 4);
      return '<i class="dvlCp0976Candle '+(red?'r':'')+'" style="height:'+h+'px"></i>';
    }).join('') + '</div>';
  }

  function bars(n,total){
    total = total || 7;
    var out = '<span class="dvlCp0976BarsSmall">';
    for(var i=0;i<total;i++) out += '<i class="'+(i<n?'on':'')+'"></i>';
    return out + '</span>';
  }

  function dots(n,total){
    total = total || 5;
    var out = '<div class="dvlCp0976Dots">';
    for(var i=0;i<total;i++) out += '<i class="'+(i<n?'on':'')+'"></i>';
    return out + '</div>';
  }

  function currentSymbol(){
    try{
      var st = document.getElementById("symbolText");
      var raw = st ? (st.textContent || "").trim() : "";
      if(raw) return raw.indexOf("/") >= 0 ? raw : raw.replace(/USDT$/,"/USDT");
    }catch(_){}
    return "BTC/USDT";
  }

  function render(){
    var sym = currentSymbol();
    return '' +
      '<div class="dvlCp0976Shell">' +
        '<header class="dvlCp0976Header">' +
          '<div class="dvlCp0976BrandIcon">' + BOT + '</div>' +
          '<div class="dvlCp0976Title"><b>DVL <span>COPILOT PRO</span></b><small><i class="dvlCp0976Dot"></i> IA ativa · Analisando 12 indicadores</small></div>' +
          '<button class="dvlCp0976CircleBtn has-dot" type="button" data-dvl-cp-action="scanner" aria-label="Alertas"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></button>' +
          '<button class="dvlCp0976CircleBtn" type="button" data-dvl-cp-action="trade" aria-label="Configurações"><svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 0 1-4 0v-.06a1.7 1.7 0 0 0-1-.6a1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 0 1 0-4h.06a1.7 1.7 0 0 0 .6-1a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 0 1 4 0v.06a1.7 1.7 0 0 0 1 .6a1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 9c.23.31.43.65.6 1H20a2 2 0 0 1 0 4h-.06a1.7 1.7 0 0 0-.6 1Z"/></svg></button>' +
        '</header>' +

        '<section class="dvlCp0976Hero">' +
          '<div class="dvlCp0976Radar"><span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span><div class="dvlCp0976RadarBot">' + BOT + '</div></div>' +
          '<div class="dvlCp0976HeroCopy">' +
            '<div class="dvlCp0976Regime"><small>Regime</small><b data-dvl-cp-live-regime>Tendencial ↗</b></div>' +
            '<span class="dvlCp0976Kicker">Visão de mercado</span>' +
            '<h2>Convicção Alta</h2>' +
            '<p>Fluxo comprador dominante, OI em expansão e liquidez estável criando boas condições para movimentos de continuação.</p>' +
            '<div class="dvlCp0976Confidence"><span>Nível de convicção</span><div class="dvlCp0976Bars"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></div><b class="dvlCp0976Score">8<small>/10</small></b></div>' +
          '</div>' +
        '</section>' +

        '<section class="dvlCp0976SignalGrid">' +
          '<article class="dvlCp0976Signal"><div class="dvlCp0976SignalTop"><i class="dvlCp0976Icon">↗</i><span>Tendência</span></div><b>Alta</b>'+dots(4)+'</article>' +
          '<article class="dvlCp0976Signal"><div class="dvlCp0976SignalTop"><i class="dvlCp0976Icon">↗</i><span>Fluxo</span></div><b>Comprador</b>'+dots(4)+'</article>' +
          '<article class="dvlCp0976Signal"><div class="dvlCp0976SignalTop"><i class="dvlCp0976Icon">↗</i><span>OI</span></div><b>Crescente</b>'+dots(4)+'</article>' +
          '<article class="dvlCp0976Signal"><div class="dvlCp0976SignalTop"><i class="dvlCp0976Icon">ϟ</i><span>Momentum</span></div><b>Forte</b>'+dots(4)+'</article>' +
          '<article class="dvlCp0976Signal warn"><div class="dvlCp0976SignalTop"><i class="dvlCp0976Icon">◌</i><span>Liquidez</span></div><b>Estável</b>'+dots(3)+'</article>' +
          '<article class="dvlCp0976Signal risk"><div class="dvlCp0976SignalTop"><i class="dvlCp0976Icon">◇</i><span>Risco</span></div><b>Moderado</b>'+dots(2)+'</article>' +
        '</section>' +

        '<section class="dvlCp0976Panel">' +
          '<div class="dvlCp0976SectionHead"><b><i>✦</i> Oportunidades da IA</b><button type="button" data-dvl-cp-action="scanner">Top 3</button></div>' +
          '<div class="dvlCp0976OppList">' +
            opp(1,'SOL/USDT','Setup: Spike + Continuação','82','sol','S','up') +
            opp(2,'AVAX/USDT','Setup: Reteste + Break','76','avax','A','mixed') +
            opp(3,'LINK/USDT','Setup: Acúmulo + Break','71','link','L','mixed') +
          '</div>' +
        '</section>' +

        '<section class="dvlCp0976Panel">' +
          '<div class="dvlCp0976SectionHead dvlCp0979ScannerHead"><b><i class="dvlCp0979ScannerTitleIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 17.9A9.6 9.6 0 1 1 19.8 17.9"/><path d="M7.05 17.9a6.75 6.75 0 1 1 9.9 0"/><path d="M12 12l5.35-3.2"/><circle class="scan-dot" cx="12" cy="12" r="1.65"/><path d="M12 4.1v1.55M4.1 12h1.55M18.35 12h1.55"/><path d="M8.2 15.8l-1.15 1.15M15.8 15.8l1.15 1.15"/></g></svg></i> Scanner inteligente</b><button type="button" data-dvl-cp-action="scanner">Ver scanner completo ›</button></div>' +
          '<div class="dvlCp0976ScannerTable">' +
            '<div class="dvlCp0976ScanRow head"><div>#</div><div>Ativo</div><div>Spike</div><div>Tempo</div><div>Status</div></div>' +
            scan(1,'MATIC/USDT','78',6,'agora','Pós-flat','', 'up') +
            scan(2,'DOT/USDT','63',5,'2m','Limpo','', 'mixed') +
            scan(3,'XRP/USDT','61',5,'5m','Formando','yellow', 'mixed') +
            scan(4,'ARB/USDT','55',4,'9m','Acúmulo','', 'up') +
            scan(5,'ASTR/USDT','49',4,'14m','Pré-break','', 'mixed') +
            scan(6,'SUI/USDT','46',4,'22m','Observar','gray', 'mixed') +
          '</div>' +
          '<div class="dvlCp0976Foot"><span><i class="dvlCp0976Dot"></i> Atualizado agora há pouco</span><span>Filtros ativos: <b>3</b></span></div>' +
        '</section>' +

        '<section class="dvlCp0976Panel dvlCp0976Avoid">' +
          '<div class="dvlCp0976SectionHead dvlCp0979AvoidHead"><b><i class="dvlCp0979AvoidTitleIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 21 19.3H3L12 3.2Z"/><path d="M12 8.6v5.1"/><path d="M12 17.1h.01"/></g></svg></i> Ativos a evitar</b><span class="link">Ver todos ›</span></div>' +
          '<div class="dvlCp0976AvoidGrid">' +
            avoid('ADA/USDT','Risco elevado','A') +
            avoid('TON/USDT','Fragilidade no fluxo','T') +
            avoid('BNB/USDT','Overheated','B') +
          '</div>' +
        '</section>' +

        '<section class="dvlCp0976BotSoon">' +
          '<div class="dvlCp0976BotBadge">' + BOT + '</div>' +
          '<div class="dvlCp0976BotText"><b>DVL BOT <span class="dvlCp0976Soon">SOON</span></b><p>Automação, alertas inteligentes e backtests avançados.<br>Execução de trade segue bloqueada nesta versão.</p></div>' +
          '<button class="dvlCp0976More" type="button" data-dvl-cp-action="bot">Saiba mais ›</button>' +
        '</section>' +
      '</div>';
  }

  function opp(rank,pair,setup,pct,coinCls,coin,pattern){
    return '<div class="dvlCp0976Opp" data-dvl-cp-action="trade"><div class="dvlCp0976Rank">'+rank+'</div><div class="dvlCp0976Coin '+coinCls+'">'+coin+'</div><div class="dvlCp0976Pair"><b>'+pair+'</b><small>'+setup+'</small></div><div class="dvlCp0976Pct">'+pct+'%<small>Confiança</small></div>'+candles(pattern)+'<div class="dvlCp0976Long">LONG</div><div class="dvlCp0976Chevron">›</div></div>';
  }

  function scan(rank,pair,score,barsN,age,status,statusCls,pattern){
    // Beta 0.979: mini Scanner clean — sem logos e sem estrelas de favorito.
    return '<div class="dvlCp0976ScanRow"><div>'+rank+'</div><div class="dvlCp0976AssetCell"><b>'+pair+'</b></div><div>'+score+bars(barsN)+'</div><div class="dvlCp0976Age">'+age+'</div><div><span class="dvlCp0976Status '+(statusCls||'')+'">'+status+'</span></div></div>';
  }

  function avoid(pair,reason,coin){
    return '<div class="dvlCp0976AvoidItem"><div class="dvlCp0976Coin">'+coin+'</div><div><b>'+pair+'</b><small>'+reason+'</small></div><div class="dvlCp0976Down">⌄</div></div>';
  }

  function install(){
    var page = document.getElementById("dvlCopilotPage0974");
    if(!page){
      try{ if(window.DVL_COPILOT_PAGE_0974 && typeof window.DVL_COPILOT_PAGE_0974.ensure === "function") page = window.DVL_COPILOT_PAGE_0974.ensure(); }catch(_){}
    }
    if(!page) return false;
    if(page.dataset.dvlCopilotPro0976 === "1") return true;
    page.dataset.dvlCopilotPro0976 = "1";
    page.innerHTML = render();

    page.addEventListener("click", function(ev){
      var t = ev.target && ev.target.closest ? ev.target.closest("[data-dvl-cp-action]") : null;
      if(!t) return;
      var act = t.getAttribute("data-dvl-cp-action");
      if(act === "scanner"){
        try{ if(window.DVL_COPILOT_PAGE_0974) window.DVL_COPILOT_PAGE_0974.close(); }catch(_){}
        try{
          if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 && typeof window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.open === "function") window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.open();
          else document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="markets"]')?.click();
        }catch(_){}
      }else if(act === "trade"){
        try{ if(window.DVL_COPILOT_PAGE_0974) window.DVL_COPILOT_PAGE_0974.close(); }catch(_){}
        try{
          var root = window.DVL_BOTTOM_NAV_SINGLETON_0970;
          if(root && root.state){ root.state.activeNav = "trade"; if(typeof root.render === "function") root.render(); }
        }catch(_){}
      }else if(act === "bot"){
        try{
          var msg = "Bot Soon bloqueado: Copilot não executa trades automaticamente.";
          if(typeof toast === "function") toast(msg);
          else console.info("[DVL Copilot]", msg);
        }catch(_){}
      }
    }, false);

    return true;
  }

  function boot(){
    install();
    setTimeout(install,0);
    setTimeout(install,250);
    setTimeout(install,900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_PRO_PAGE_0976 = {
    version:"0.976",
    install:install,
    audit:function(){
      var p = document.getElementById("dvlCopilotPage0974");
      return {
        version:"0.976",
        pageFound:!!p,
        proLayoutInstalled:!!(p && p.dataset.dvlCopilotPro0976 === "1"),
        convictionBlock:!!(p && /Convicção Alta/i.test(p.textContent || "")),
        aiOpportunities:!!(p && /Oportunidades da IA/i.test(p.textContent || "")),
        smartScanner:!!(p && /Scanner inteligente/i.test(p.textContent || "")),
        spikeAgeColumn:!!(p && /Há qt tempo/i.test(p.textContent || "")),
        avoidAssets:!!(p && /Ativos a evitar/i.test(p.textContent || "")),
        botBlocked:!!(p && /Execução de trade segue bloqueada/i.test(p.textContent || "")),
        noTradeExecution:true,
        pass:!!(p && p.dataset.dvlCopilotPro0976 === "1")
      };
    }
  };

  window.DVL_COPILOT_PRO_PAGE_AUDIT = function(){
    return window.DVL_COPILOT_PRO_PAGE_0976.audit();
  };
})();
