(function(){
  "use strict";

  if(window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722) return;

  var state = {
    mode: "demo",
    activeTab: "open",
    panelOpen: false,
    activeNav: "trade"
  };

  var tabs = [
    { key: "open", label: "Abertas" },
    { key: "pending", label: "Pendentes" },
    { key: "histórico", label: "Histórico" }
  ];

  var tabKeys = ["open","pending","history"];
  var tabLabels = ["Abertas","Pendentes","Histórico"];

  var navKeys = ["home","markets","trade","positions","watchlist"];
  var navLabels = ["Copilot","Alertas","Trade","Positions","Watchlist"];

  var data = {
    open: [],
    pending: [],
    history: []
  };

  function elById(id){ return document.getElementById(id); }

  function syncFromAdapter(){
    if(state.mode === "real"){ data.open=[]; data.pending=[]; data.history=[]; return; }
    var rows=window.DVL_POSITIONS_ADAPTER?window.DVL_POSITIONS_ADAPTER.readOrders():{open:[],pending:[],history:[]};
    data.open=rows.open;
    data.pending=rows.pending;
    data.history=rows.history;
  }

  function svgIcon(name){
    var icons = {
      home: '<svg class="dvlCopilotLogo0974" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="5.2" y="7.2" width="13.6" height="10.8" rx="4"/><path d="M12 7.2V4.6"/><circle class="bot-dot" cx="12" cy="3.9" r="1.1"/><circle class="bot-eye" cx="9.55" cy="12.2" r="1.05"/><circle class="bot-eye" cx="14.45" cy="12.2" r="1.05"/><path d="M9.8 15.1c1.25.9 3.15.9 4.4 0"/><path d="M5.2 11.1H3.8M20.2 11.1h-1.4"/></g></svg>',
      markets: '<span class="dvlAlertsBell1620"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.2 7.5-2.2 7.5h16.4S18 14.5 18 8.5z"/><path d="M10.3 20.2a2 2 0 0 0 3.4 0"/></svg><i id="dvlAlertsNavBadge1620" class="dvlAlertsNavBadge"></i></span>',
      trade: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
      positions: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16H6z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>',
      watchlist: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.7l2.5 5.1 5.6.8-4 3.9.95 5.5L12 16.4 7.05 19l.95-5.5-4-3.9 5.5-.8L12 3.7z"/></svg>'
    };
    return icons[name] || "";
  }

  function oldNavBtn(index){
    var btns = document.querySelectorAll(".bottomNav .navItem");
    return btns[index] || null;
  }

  function bridgeClick(el){
    if(!el) return false;
    try{ el.click(); return true; }catch(e){ return false; }
  }

  function syncTradeState(){
    var drawer = document.querySelector(".tradeDrawer");
    document.body.classList.toggle("dvl-trade-v2-open", !!(drawer && drawer.classList.contains("is-open")));
  }

  function tradeOpen(){
    var drawer = document.querySelector(".tradeDrawer");
    return !!(drawer && drawer.classList.contains("is-open"));
  }

  function watchlistOpen(){
    var drawer = elById("assetFavoritesDrawer");
    var panel = elById("dvlWatchlistPanel");
    return !!(
      (drawer && drawer.classList.contains("is-open")) ||
      (panel && panel.classList.contains("is-open"))
    );
  }

  function closeTradeIfOpen(){
    var drawer = document.querySelector(".tradeDrawer");
    var oldTrade = elById("tradeNavBtn");
    if(drawer && drawer.classList.contains("is-open") && oldTrade){
      bridgeClick(oldTrade);
    }
    document.body.classList.remove("dvl-trade-v2-open");
  }

  function closeScannerIfOpen(){
    try{
      if(!scannerOpen()) return;
      if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 && typeof window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close === "function"){
        window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close();
      }else{
        var p = elById("dvlScannerPanel0780");
        var b = elById("scannerNavBtn");
        if(p) p.classList.remove("is-open");
        if(b) b.classList.remove("active");
        document.body.classList.remove("dvlScannerOpen080");
        try{ window.dispatchEvent(new CustomEvent("dvl:scanner-state-change",{detail:{open:false,source:"nav-v2-close-scanner"}})); }catch(_){}
      }
    }catch(_){}
  }

  function closeWatchlistIfOpen(){
    try{
      if(!watchlistOpen()) return;

      // Beta 0.973: close the REAL visible Watchlist panel first.
      // The visible panel in the current UI is #dvlWatchlistPanel, not only
      // the older #assetFavoritesDrawer bridge.
      if(typeof window.closeWatchlistPanel === "function"){
        window.closeWatchlistPanel();
      }else{
        var wlPanel = elById("dvlWatchlistPanel");
        if(wlPanel) wlPanel.classList.remove("is-open");
      }

      if(typeof window.closeAssetFavorites === "function"){
        window.closeAssetFavorites();
      }else if(typeof closeAssetFavorites === "function"){
        closeAssetFavorites();
      }else{
        var drawer = elById("assetFavoritesDrawer");
        var btn = elById("assetsNavBtn");
        if(drawer){
          drawer.classList.remove("is-open");
          drawer.setAttribute("aria-hidden","true");
        }
        if(btn) btn.classList.remove("active");
      }

      try{ window.dispatchEvent(new CustomEvent("dvl:watchlist-state-change",{detail:{open:false,source:"nav-v2-close-real-watchlist"}})); }catch(_){}
    }catch(_){}
  }

  function setActiveNav(key){
    state.activeNav = key || state.activeNav || "trade";
    renderNav();
  }

  function activeNavKey(){
    if(window.DVL_ALERTS_HUB_API && typeof window.DVL_ALERTS_HUB_API.isOn === "function" && window.DVL_ALERTS_HUB_API.isOn()) return "markets";
    if(state.panelOpen) return "positions";
    if(watchlistOpen()) return "watchlist";
    if(tradeOpen()) return "trade";
    return state.activeNav || "trade";
  }

  function renderShell(){
    if(elById("dvlBottomNavV2")) return;

    var navHtml = "";
    for(var i=0; i<navKeys.length; i++){
      navHtml += '<button class="dvlNavV2Btn" type="button" data-dvl-nav-key="' + navKeys[i] + '" aria-label="' + navLabels[i] + '">' + svgIcon(navKeys[i]) + '<span>' + navLabels[i] + '</span></button>';
    }

    var nav = document.createElement("nav");
    nav.id = "dvlBottomNavV2";
    nav.setAttribute("data-dvl-ui","true");
    nav.setAttribute("aria-label","DVL bottom navigation v2");
    nav.innerHTML = navHtml;

    var homebar = document.createElement("div");
    homebar.id = "dvlBottomHomebarV2";

    var panel = document.createElement("section");
    panel.id = "dvlPositionsPanelV2";
    panel.setAttribute("data-dvl-ui","true");
    panel.setAttribute("aria-label","Positions panel");
    panel.innerHTML =
      '<div class="dvlPosV2Grip"></div>' +
      '<header class="dvlPosV2Head">' +
        '<h2 class="dvlPosV2Title">Positions</h2>' +
        '<div class="dvlPosV2Mode"><div class="dvlPosV2ModeToggle" id="dvlPosV2ModeToggle"></div></div>' +
      '</header>' +
      '<div class="dvlPosV2Tabs" id="dvlPosV2Tabs"></div>' +
      '<div class="dvlPosV2List" id="dvlPosV2List"></div>';

    document.body.appendChild(panel);
    document.body.appendChild(nav);
    document.body.appendChild(homebar);
    document.body.classList.add("dvl-positions-v2-active");
    document.body.classList.add("dvl-footer-v2-single");

    renderAll();
    bindEvents();
  }

  function renderModes(){
    var modeToggle = elById("dvlPosV2ModeToggle");
    if(!modeToggle) return;
    var modes = ["demo","real"];
    var labels = ["Demo","Real"];
    var html = "";
    for(var i=0; i<modes.length; i++){
      html += '<button class="dvlPosV2ModeBtn' + (state.mode === modes[i] ? " is-active" : "") + '" type="button" data-dvl-mode="' + modes[i] + '">' + labels[i] + '</button>';
    }
    modeToggle.innerHTML = html;
    window.DVL_ACCOUNT_MODE = state.mode;
  }

  function renderTabs(){
    var holder = elById("dvlPosV2Tabs");
    if(!holder) return;
    var html = "";
    for(var i=0; i<tabKeys.length; i++){
      html += '<button class="dvlPosV2Tab' + (state.activeTab === tabKeys[i] ? " is-active" : "") + '" type="button" data-dvl-tab="' + tabKeys[i] + '">' + tabLabels[i] + '</button>';
    }
    holder.innerHTML = html;
  }

  function tokenGlyph(coin){
    if(coin === "btc") return "B";
    if(coin === "eth") return "E";
    return "";
  }

  function renderList(){
    syncFromAdapter();
    var list = elById("dvlPosV2List");
    if(!list) return;
    var rows = data[state.activeTab] || [];
    if(!rows.length){
      list.innerHTML = '<div class="dvlPosV2Empty">Nenhum item nesta aba</div>';
      return;
    }
    var html = "";
    for(var i=0; i<rows.length; i++){
      var row = rows[i];
      var lower = String(row.side).toLowerCase();
      var sideClass = (lower.indexOf("short") !== -1 || lower.indexOf("sell") !== -1) ? "short" : "long";
      html +=
        '<article class="dvlPosV2Card" data-dvl-symbol="' + row.symbol + '" data-dvl-status="' + state.activeTab + '" data-dvl-order-id="' + (row.id||"") + '">' +
          '<div class="dvlPosV2Token ' + row.coin + '">' + tokenGlyph(row.coin) + '</div>' +
          '<div class="dvlPosV2Pair">' +
            '<b>' + row.symbol + '</b>' +
            '<div class="dvlPosV2Tags">' +
              '<span class="dvlPosV2Tag ' + sideClass + '">' + row.side + '</span>' +
              '<span class="dvlPosV2Tag lev">' + row.leverage + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="dvlPosV2Col"><span>Entrada</span><b>' + row.entry + '</b></div>' +
          '<div class="dvlPosV2Col"><span>Preço atual</span><b>' + row.current + '</b></div>' +
          '<div class="dvlPosV2Pnl ' + row.direction + '">' +
            '<span>PnL (USDT)</span>' +
            '<b>' + row.pnl + '</b>' +
            '<small>' + row.pct + '</small>' +
          '</div>' +
          (state.activeTab === "pending" ?
            '<button class="dvlPosV2Del" type="button" data-dvl-del-id="' + (row.id||"") + '">×</button>' :
            '<div class="dvlPosV2Next"></div>') +
        '</article>';
    }
    list.innerHTML = html;
  }

  function scannerOpen(){
    try{
      var p = elById("dvlScannerPanel0780");
      return !!(document.body.classList.contains("dvlScannerOpen080") || (p && p.classList.contains("is-open")));
    }catch(_){
      return false;
    }
  }

  function renderNav(){
    var active = activeNavKey();
    var btns = document.querySelectorAll(".dvlNavV2Btn");
    for(var i=0; i<btns.length; i++){
      var key = btns[i].getAttribute("data-dvl-nav-key");
      var on = key === active;
      btns[i].classList.toggle("is-active", on);
      btns[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    var panel = elById("dvlPositionsPanelV2");
    if(panel) panel.classList.toggle("is-open", !!state.panelOpen);
  }

  function renderAll(){
    renderModes();
    renderTabs();
    renderList();
    renderNav();
  }

  function bindEvents(){
    var nav = elById("dvlBottomNavV2");
    if(nav && !nav.dataset.bound){
      nav.dataset.bound = "1";
      nav.addEventListener("click", function(ev){
        var btn = ev.target.closest ? ev.target.closest("[data-dvl-nav-key]") : null;
        if(!btn) return;
        var key = btn.getAttribute("data-dvl-nav-key");

        if(key === "trade"){
          try{ if(window.DVL_COPILOT_PAGE_0974) window.DVL_COPILOT_PAGE_0974.close(); }catch(_){}
          closeScannerIfOpen();
          closeWatchlistIfOpen();
          state.panelOpen = false;
          state.activeNav = "trade";
          renderNav();
          bridgeClick(elById("tradeNavBtn"));
          syncTradeState();
          setTimeout(renderNav, 0);
          setTimeout(renderNav, 180);
          return;
        }
        if(key === "positions"){
          try{ if(window.DVL_COPILOT_PAGE_0974) window.DVL_COPILOT_PAGE_0974.close(); }catch(_){}
          closeScannerIfOpen();
          closeWatchlistIfOpen();
          closeTradeIfOpen();
          state.panelOpen = !state.panelOpen;
          state.activeNav = state.panelOpen ? "positions" : "trade";
          if(state.panelOpen) renderList();
          renderNav();
          return;
        }
        if(key === "watchlist"){
          try{ if(window.DVL_COPILOT_PAGE_0974) window.DVL_COPILOT_PAGE_0974.close(); }catch(_){}
          closeScannerIfOpen();
          closeTradeIfOpen();
          state.panelOpen = false;
          state.activeNav = "watchlist";
          renderNav();
          bridgeClick(elById("assetsNavBtn")) || bridgeClick(oldNavBtn(4));
          setTimeout(renderNav, 0);
          setTimeout(renderNav, 180);
          return;
        }
        if(key === "home"){
          // Beta 1.638 — o botão "home" agora é o "Lab" (X-Ray). O estado de
          // aberto/fechado vem do próprio Lab, não das classes antigas do Copilot
          // (que faziam UI do Copilot vazar — VRSI card, live-context, etc).
          var copilotWasOpen = !!(window.DVL_LAB && typeof window.DVL_LAB.isOpen === "function" && window.DVL_LAB.isOpen()) ||
            document.body.classList.contains("dvlCopilotOpen0974") ||
            !!(document.getElementById("dvlCopilotPage0974") && document.getElementById("dvlCopilotPage0974").classList.contains("is-open"));

          if(copilotWasOpen){
            try{
              if(window.DVL_COPILOT_PAGE_0974 && typeof window.DVL_COPILOT_PAGE_0974.close === "function"){
                window.DVL_COPILOT_PAGE_0974.close();
              }
            }catch(_){}
            state.activeNav = "trade";
            renderNav();
            setTimeout(renderNav, 0);
            setTimeout(renderNav, 180);
            return;
          }

          closeScannerIfOpen();
          closeWatchlistIfOpen();
          closeTradeIfOpen();
          state.panelOpen = false;
          state.activeNav = "home";
          renderNav();
          try{
            if(window.DVL_COPILOT_PAGE_0974 && typeof window.DVL_COPILOT_PAGE_0974.open === "function"){
              window.DVL_COPILOT_PAGE_0974.open();
            }else{
              bridgeClick(oldNavBtn(0));
            }
          }catch(_){
            bridgeClick(oldNavBtn(0));
          }
          setTimeout(renderNav, 0);
          setTimeout(renderNav, 180);
          return;
        }
        if(key === "markets"){
          /* Beta 1.620 — este botão agora é "Alertas" (DVL Alerts Hub), não mais
             o Scanner. Abre/fecha o hub central de alertas. */
          try{ if(window.DVL_COPILOT_PAGE_0974) window.DVL_COPILOT_PAGE_0974.close(); }catch(_){}
          closeWatchlistIfOpen();
          closeTradeIfOpen();
          state.panelOpen = false;
          state.activeNav = "markets";
          renderNav();
          try{
            if(window.DVL_ALERTS_HUB_API && typeof window.DVL_ALERTS_HUB_API.toggle === "function") window.DVL_ALERTS_HUB_API.toggle();
          }catch(_){}
          setTimeout(renderNav, 0);
          setTimeout(renderNav, 180);
        }
      });
    }

    var panel = elById("dvlPositionsPanelV2");
    if(panel && !panel.dataset.bound){
      panel.dataset.bound = "1";
      panel.addEventListener("click", function(ev){
        var modeBtn = ev.target.closest ? ev.target.closest("[data-dvl-mode]") : null;
        if(modeBtn){
          state.mode = modeBtn.getAttribute("data-dvl-mode");
          renderModes();
          renderList();
          return;
        }
        var tabBtn = ev.target.closest ? ev.target.closest("[data-dvl-tab]") : null;
        if(tabBtn){
          state.activeTab = tabBtn.getAttribute("data-dvl-tab");
          renderTabs();
          renderList();
          return;
        }
        var delBtn = ev.target.closest ? ev.target.closest("[data-dvl-del-id]") : null;
        if(delBtn){
          var delId = delBtn.getAttribute("data-dvl-del-id");
          if(delId && window.DVL_PAPER_TRADING_V2_PRO) window.DVL_PAPER_TRADING_V2_PRO.cancelPaperOrder(delId);
          renderList();
        }
      });
    }

    var _taBtns = document.querySelectorAll(".tradeAction.buy, .tradeAction.sell");
    for(var _ti=0;_ti<_taBtns.length;_ti++){
      (function(_btn){
        if(_btn.dataset.dvlLimitBound) return;
        _btn.dataset.dvlLimitBound = "1";
        _btn.addEventListener("click", function(){
          var _ol = document.getElementById("orderTypeLabel");
          var _ot = _ol ? _ol.textContent.trim() : "";
          if(_ot === "Market") return;
          var _dr=document.querySelector(".tradeDrawer"); if(_dr) _dr.classList.remove("is-open");
          document.body.classList.remove("dvl-trade-v2-open");
        }, false);
      })(_taBtns[_ti]);
    }

    if(!document.__dvlPositionsOutsideBound){
      document.__dvlPositionsOutsideBound = true;
      document.addEventListener("click", function(ev){
        if(!state.panelOpen) return;
        // composedPath() captures the event path at dispatch time,
        // before renderTabs()/renderList() can detach the clicked element.
        var path = ev.composedPath ? ev.composedPath() : [];
        var panelEl = elById("dvlPositionsPanelV2");
        var navEl   = elById("dvlBottomNavV2");
        var detEl   = elById("dvlPositionDetailsV2");
        var tradeEl = document.querySelector(".tradeDrawer");
        function _inPath(el){ return !!el && path.indexOf(el) !== -1; }
        if(!_inPath(panelEl) && !_inPath(navEl) && !_inPath(detEl) && !_inPath(tradeEl)){
          state.panelOpen = false;
          renderNav();
        }
      }, false);
    }

    if(!window.__dvlScannerNavV2StateBound0970){
      window.__dvlScannerNavV2StateBound0970 = true;
      window.addEventListener("dvl:scanner-state-change", function(ev){
        try{
          if(ev && ev.detail && ev.detail.open){
            state.panelOpen = false;
            state.activeNav = "markets";
          }else if(state.activeNav === "markets"){
            state.activeNav = "trade";
          }
        }catch(_){}
        renderNav();
      }, true);
      window.addEventListener("dvl:bottom-nav-set-active", function(ev){
        try{ if(ev && ev.detail && ev.detail.key) setActiveNav(ev.detail.key); }catch(_){}
      }, true);
      window.addEventListener("dvl:watchlist-state-change", function(ev){
        try{
          if(ev && ev.detail && ev.detail.open){
            closeScannerIfOpen();
            closeTradeIfOpen();
            state.panelOpen = false;
            state.activeNav = "watchlist";
          }else if(state.activeNav === "watchlist"){
            state.activeNav = "trade";
          }
        }catch(_){}
        renderNav();
      }, true);
    }
  }

  function updateOldLabels(){
    var assets = elById("assetsNavBtn");
    if(assets){
      var sp = assets.querySelector("span");
      if(sp) sp.textContent = "Watchlist";
      assets.setAttribute("aria-label","Watchlist");
    }
  }

  window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722 = {
    state: state,
    data: data,
    open: function(){ closeScannerIfOpen(); closeWatchlistIfOpen(); closeTradeIfOpen(); state.panelOpen = true; state.activeNav = "positions"; renderNav(); },
    close: function(){ state.panelOpen = false; if(state.activeNav === "positions") state.activeNav = "trade"; renderNav(); },
    setMode: function(mode){ state.mode = mode === "real" ? "real" : "demo"; renderModes(); },
    setTab: function(tab){ state.activeTab = tab; renderTabs(); renderList(); },
    refresh: function(){ if(state.panelOpen) renderList(); }
  };

  window.DVL_BOTTOM_NAV_SINGLETON_0970 = {
    version:"0.970",
    officialRootId:"dvlBottomNavV2",
    legacyFooterMode:"hidden-bridge-only",
    keys:navKeys.slice(),
    state:state,
    setActive:setActiveNav,
    render:renderNav,
    closeScanner:closeScannerIfOpen,
    closeWatchlist:closeWatchlistIfOpen,
    closeTrade:closeTradeIfOpen,
    replaceItem:function(key,label,svg){
      var btn = document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="'+key+'"]');
      if(!btn) return false;
      if(svg) {
        var old = btn.querySelector("svg");
        if(old) old.outerHTML = svg;
        else btn.insertAdjacentHTML("afterbegin", svg);
      }
      if(label){
        btn.setAttribute("aria-label", label);
        var span = btn.querySelector("span");
        if(span) span.textContent = label;
      }
      return true;
    },
    audit:function(){
      var legacy = document.querySelector("nav.bottomNav,.bottomNav");
      var root = elById("dvlBottomNavV2");
      return {
        version:"0.970",
        officialFooter:!!root,
        legacyFooterPresent:!!legacy,
        legacyFooterHidden:!!(legacy && getComputedStyle(legacy).display === "none"),
        activeNav:activeNavKey(),
        scannerLogo:!!document.querySelector('#dvlBottomNavV2 [data-dvl-nav-key="markets"] .dvlScannerLogo0969'),
        pass:!!root
      };
    }
  };

  updateOldLabels();
  renderShell();
})();
