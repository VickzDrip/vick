(function(){
  "use strict";
  if(window.DVL_SCANNER_EXCHANGE_FILTER_1022) return;

  var VERSION = "1.022";
  var PANEL_ID = "dvlScannerPanel0780";
  var state = {
    exchange: null
  };
  var originalApi = null;
  var originalMethods = {};

  function page(){ return document.getElementById(PANEL_ID); }
  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function loadPref(){ try{ return localStorage.getItem("dvlScannerExchange1022") || ""; }catch(_){ return ""; } }
  function savePref(v){ try{ localStorage.setItem("dvlScannerExchange1022", v); }catch(_){ } }

  function isApiCandidate(obj){
    return !!(obj && typeof obj === "object" && obj !== window.DVL_SCANNER_PRO_FORCE_OPEN_1013 && (typeof obj.rows === "function" || typeof obj.rawRows === "function" || typeof obj.refresh === "function"));
  }

  function detectBinanceApi(){
    var names = [
      "DVL_BINANCE_VOLUME_SPIKE_SCANNER_0780",
      "DVL_BINANCE_VOLUME_SPIKE_SCANNER",
      "DVL_BINANCE_SCANNER_PRO",
      "DVL_BINANCE_SCANNER",
      "DVL_BINANCE_FUTURES_SCANNER",
      "DVL_VOLUME_SPIKE_SCANNER_BINANCE",
      "DVL_SCANNER_BINANCE_0780"
    ];
    for(var i=0;i<names.length;i++){
      var api = window[names[i]];
      if(isApiCandidate(api)) return api;
    }
    return null;
  }

  function detectMexcApi(){
    if(isApiCandidate(window.__DVL_SCANNER_MEXC_ORIGINAL_1022)) return window.__DVL_SCANNER_MEXC_ORIGINAL_1022;
    if(isApiCandidate(window.__DVL_SCANNER_ORIGINAL_1013)) return window.__DVL_SCANNER_ORIGINAL_1013;
    if(isApiCandidate(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_ORIGINAL_0780)) return window.DVL_MEXC_VOLUME_SPIKE_SCANNER_ORIGINAL_0780;
    return null;
  }

  function preferredExchange(){
    var pref = loadPref();
    if(pref === "binance" || pref === "mexc") return pref;
    return detectBinanceApi() ? "binance" : "mexc";
  }

  function ensureState(){
    if(!state.exchange) state.exchange = preferredExchange();
    return state.exchange;
  }

  function currentApiMeta(){
    var wanted = ensureState();
    var binance = detectBinanceApi();
    var mexc = detectMexcApi();
    if(wanted === "binance"){
      if(binance) return { key:"binance", api:binance, live:true, fallback:false };
      return { key:"mexc", api:mexc, live:!!mexc, fallback:true };
    }
    if(mexc) return { key:"mexc", api:mexc, live:true, fallback:false };
    return { key: binance ? "binance" : "mexc", api: binance || mexc, live: !!(binance || mexc), fallback:false };
  }

  function route(name, argsLike){
    var args = Array.prototype.slice.call(argsLike || []);
    var meta = currentApiMeta();
    if(meta.key === "binance" && meta.api && typeof meta.api[name] === "function"){
      return meta.api[name].apply(meta.api, args);
    }
    var fn = originalMethods[name];
    if(typeof fn === "function") return fn.apply(originalApi, args);
    if(meta.api && typeof meta.api[name] === "function") return meta.api[name].apply(meta.api, args);
    return undefined;
  }

  function installRouter(){
    var api = detectMexcApi();
    if(!api) return false;
    originalApi = api;
    if(!window.__DVL_SCANNER_MEXC_ORIGINAL_1022) window.__DVL_SCANNER_MEXC_ORIGINAL_1022 = api;
    if(api.__dvl1022RouterInstalled) return true;
    ["rows","rawRows","refresh","setTF","setTimeframe","setFilter"].forEach(function(name){
      if(typeof api[name] === "function"){
        originalMethods[name] = api[name];
        api[name] = function(){ return route(name, arguments); };
      }
    });
    api.__dvl1022RouterInstalled = true;
    return true;
  }

  function filterMenu(){ return document.getElementById("dvlScan1013FilterMenu"); }

  function exchangeLabel(key){ return key === "binance" ? "Binance" : "MEXC"; }

  function ensureExchangeUI(){
    var menu = filterMenu();
    if(!menu) return false;
    if(!q('[data-dvl-scan1022-group="exchange"]', menu)){
      var block = document.createElement('div');
      block.className = 'dvlScan1015FilterBlock dvlScan1022FilterBlock';
      block.innerHTML = '<label>Corretora</label>'
        + '<div class="dvlScan1013FilterChips dvlScan1022ExchangeChips" data-dvl-scan1022-group="exchange">'
        +   '<button type="button" data-dvl-scan1022-exchange="binance">Binance</button>'
        +   '<button type="button" data-dvl-scan1022-exchange="mexc">MEXC</button>'
        + '</div>'
        + '<div class="dvlScan1022ExchangeHint" data-dvl-scan1022-hint></div>';
      var firstBlock = menu.querySelector('.dvlScan1015FilterBlock');
      if(firstBlock) firstBlock.insertAdjacentElement('afterend', block);
      else menu.appendChild(block);
    }
    syncExchangeUI();
    return true;
  }

  function syncExchangeUI(){
    var menu = filterMenu();
    if(!menu) return;
    var wanted = ensureState();
    var meta = currentApiMeta();
    qa('[data-dvl-scan1022-exchange]', menu).forEach(function(btn){
      btn.classList.toggle('is-on', btn.getAttribute('data-dvl-scan1022-exchange') === wanted);
    });
    var hint = q('[data-dvl-scan1022-hint]', menu);
    if(hint){
      var fallback = wanted === 'binance' && meta.key !== 'binance';
      hint.className = 'dvlScan1022ExchangeHint ' + (fallback ? 'is-fallback' : 'is-live');
      if(fallback){
        hint.innerHTML = 'Binance ainda não está disponível neste HTML. <b>Fallback ativo: MEXC</b>.';
      }else{
        hint.innerHTML = 'Fonte selecionada: <b>' + esc(exchangeLabel(meta.key)) + '</b>';
      }
    }
  }

  function refreshScanner(){
    try{
      var proxy = window.DVL_SCANNER_PRO_FORCE_OPEN_1013;
      if(proxy && typeof proxy.render === 'function') proxy.render();
      var meta = currentApiMeta();
      if(meta.api && typeof meta.api.refresh === 'function'){
        var out = meta.api.refresh();
        if(out && typeof out.then === 'function') out.finally(function(){ try{ if(proxy && typeof proxy.render === 'function') proxy.render(); }catch(_){ } });
      }
    }catch(_){ }
    setTimeout(syncExchangeUI, 50);
    setTimeout(syncExchangeUI, 250);
  }

  function setExchange(next){
    next = next === 'mexc' ? 'mexc' : 'binance';
    state.exchange = next;
    savePref(next);
    syncExchangeUI();
    try{
      var meta = currentApiMeta();
      if(meta.api){
        if(typeof meta.api.setFilter === 'function') meta.api.setFilter({ exchange: next, venue: next, source: next });
        if(typeof meta.api.setVenue === 'function') meta.api.setVenue(next);
        if(typeof meta.api.setExchange === 'function') meta.api.setExchange(next);
      }
      window.dispatchEvent(new CustomEvent('dvl:scanner-exchange-change', { detail:{ exchange:next, source:'scanner-1022' } }));
    }catch(_){ }
    refreshScanner();
  }

  function patchHeaderLabel(){
    var p = page();
    if(!p) return;
    var small = q('.dvlScan1013Title small', p);
    var meta = currentApiMeta();
    if(small){
      small.innerHTML = 'Scanner ao vivo <i></i> futuros <i></i> ' + esc(exchangeLabel(meta.key));
    }
  }

  function patchOpenRender(){
    var proxy = window.DVL_SCANNER_PRO_FORCE_OPEN_1013;
    if(!proxy || proxy.__dvl1022Wrapped) return false;
    var oOpen = typeof proxy.open === 'function' ? proxy.open : null;
    var oRender = typeof proxy.render === 'function' ? proxy.render : null;
    var oToggle = typeof proxy.toggle === 'function' ? proxy.toggle : null;
    if(oOpen){
      proxy.open = function(){
        var out = oOpen.apply(this, arguments);
        setTimeout(function(){ ensureExchangeUI(); patchHeaderLabel(); syncExchangeUI(); }, 40);
        setTimeout(function(){ ensureExchangeUI(); patchHeaderLabel(); syncExchangeUI(); }, 250);
        return out;
      };
    }
    if(oRender){
      proxy.render = function(){
        var out = oRender.apply(this, arguments);
        setTimeout(function(){ ensureExchangeUI(); patchHeaderLabel(); syncExchangeUI(); }, 20);
        return out;
      };
    }
    if(oToggle){
      proxy.toggle = function(){
        var out = oToggle.apply(this, arguments);
        setTimeout(function(){ ensureExchangeUI(); patchHeaderLabel(); syncExchangeUI(); }, 40);
        return out;
      };
    }
    proxy.__dvl1022Wrapped = true;
    return true;
  }

  function onClick(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-dvl-scan1022-exchange]') : null;
    if(!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    setExchange(btn.getAttribute('data-dvl-scan1022-exchange'));
  }

  function tick(){
    installRouter();
    patchOpenRender();
    ensureExchangeUI();
    patchHeaderLabel();
    syncExchangeUI();
  }

  function boot(){
    ensureState();
    installRouter();
    patchOpenRender();
    ensureExchangeUI();
    patchHeaderLabel();
    syncExchangeUI();
    document.addEventListener('click', onClick, true);
    window.addEventListener('resize', function(){ setTimeout(tick, 60); });
    window.addEventListener('dvl:scanner-state-change', function(){ setTimeout(tick, 60); }, true);
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(tick,60); }, true);
    setTimeout(tick, 250);
    setTimeout(tick, 900);
  }

  window.DVL_SCANNER_EXCHANGE_FILTER_1022 = {
    version: VERSION,
    state: state,
    setExchange: setExchange,
    sync: tick,
    audit: function(){
      tick();
      var menu = filterMenu();
      var meta = currentApiMeta();
      return {
        version: VERSION,
        exchangeSelected: ensureState(),
        activeSource: meta.key,
        fallback: !!meta.fallback,
        binanceAvailable: !!detectBinanceApi(),
        mexcAvailable: !!detectMexcApi(),
        exchangeButtons: menu ? qa('[data-dvl-scan1022-exchange]', menu).length : 0,
        pass: !!(menu && qa('[data-dvl-scan1022-exchange]', menu).length >= 2)
      };
    }
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
