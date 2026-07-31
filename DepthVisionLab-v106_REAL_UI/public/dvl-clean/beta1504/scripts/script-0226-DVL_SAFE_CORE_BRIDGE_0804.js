(function(){
  "use strict";
  if(window.DVL_SAFE_CORE_BRIDGE_0804) return;

  /*
    Beta 0.804 — Safe Core Bridge
    Scope:
    - No visual redesign.
    - No chart-engine rewrite.
    - No trade/paper rewrite.
    - Fixes asset registry, icons, and Scanner → chart routing.
  */

  var FUTURES_INFO_URL = "https://fapi.binance.com/fapi/v1/exchangeInfo";
  var SUPPORTED_READY = false;
  var SUPPORTED_LOADING = null;
  var PATCHED_RENDER_DROPDOWN = false;
  var HEADER_OBSERVER = null;
  var SCANNER_OBSERVER = null;

  var ICONS = {
    BTC:{text:"B", label:"B", className:"dvlLetterBTC", wlClass:"dvlLetterBTC", scanClass:"dvlLetterBTC", name:"Bitcoin"},
    ETH:{text:"E", label:"E", className:"dvlLetterETH", wlClass:"dvlLetterETH", scanClass:"dvlLetterETH", name:"Ethereum"},
    SOL:{text:"S", label:"S", className:"dvlLetterSOL", wlClass:"dvlLetterSOL", scanClass:"dvlLetterSOL", name:"Solana"},
    BNB:{text:"B", label:"B", className:"dvlLetterBNB", wlClass:"dvlLetterBNB", scanClass:"dvlLetterBNB", name:"BNB"},
    XRP:{text:"X", label:"X", className:"dvlLetterXRP", wlClass:"dvlLetterXRP", scanClass:"dvlLetterXRP", name:"XRP"},
    ADA:{text:"A", label:"A", className:"dvlLetterADA", wlClass:"dvlLetterADA", scanClass:"dvlLetterADA", name:"Cardano"},
    DOGE:{text:"D", label:"D", className:"dvlLetterDOGE", wlClass:"dvlLetterDOGE", scanClass:"dvlLetterDOGE", name:"Dogecoin"},
    AVAX:{text:"A", label:"A", className:"dvlLetterAVAX", wlClass:"dvlLetterAVAX", scanClass:"dvlLetterAVAX", name:"Avalanche"},
    LINK:{text:"L", label:"L", className:"dvlLetterLINK", wlClass:"dvlLetterLINK", scanClass:"dvlLetterLINK", name:"Chainlink"},
    LTC:{text:"L", label:"L", className:"dvlLetterLTC", wlClass:"dvlLetterLTC", scanClass:"dvlLetterLTC", name:"Litecoin"}
  };

  function normSymbol(value){
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[_\-]/g, "")
      .replace("/", "");
  }

  function displaySymbol(sym){
    var s = normSymbol(sym);
    return /USDT$/.test(s) ? s.replace(/USDT$/, "/USDT") : s;
  }

  function baseOf(sym){
    return normSymbol(sym).replace(/USDT$/, "");
  }

  function getIcon(base){
    base = String(base || "").toUpperCase();
    var letter = window.dvlAssetFirstLetter ? window.dvlAssetFirstLetter(base) : ((base || "").replace(/^[0-9]+/,"").charAt(0) || "•");
    var c = window.dvlAssetLetterClass ? window.dvlAssetLetterClass(base) : "dvlLetterGeneric";
    return {text:letter,label:letter,className:c,wlClass:c,scanClass:c,name:base||"Asset"};
  }

  function ensureRegistry(){
    window.DVL_ASSET_REGISTRY = window.DVL_ASSET_REGISTRY || {};
    var arr = window._dvlSymbols;
    if(!arr || !Array.isArray(arr) || !arr.length){
      arr = ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT","LINKUSDT","LTCUSDT"];
      window._dvlSymbols = arr;
    }

    arr.forEach(function(sym){
      registerAsset(sym, true);
    });

    return window.DVL_ASSET_REGISTRY;
  }

  function registerAsset(sym, supported){
    var clean = normSymbol(sym);
    if(!clean || !/USDT$/.test(clean)) return null;
    var base = baseOf(clean);
    var icon = getIcon(base);

    window.DVL_ASSET_REGISTRY = window.DVL_ASSET_REGISTRY || {};
    if(!window.DVL_ASSET_REGISTRY[clean]){
      window.DVL_ASSET_REGISTRY[clean] = {
        symbol: clean,
        apiSymbol: clean,
        display: displaySymbol(clean),
        base: base,
        quote: "USDT",
        name: icon.name || base,
        iconText: icon.text,
        iconClass: icon.className,
        supportedInChart: supported !== false
      };
    }else{
      window.DVL_ASSET_REGISTRY[clean].apiSymbol = clean;
      window.DVL_ASSET_REGISTRY[clean].display = displaySymbol(clean);
      window.DVL_ASSET_REGISTRY[clean].base = base;
      window.DVL_ASSET_REGISTRY[clean].quote = "USDT";
      window.DVL_ASSET_REGISTRY[clean].iconText = icon.text;
      window.DVL_ASSET_REGISTRY[clean].iconClass = icon.className;
      if(supported !== undefined) window.DVL_ASSET_REGISTRY[clean].supportedInChart = supported !== false;
    }

    return window.DVL_ASSET_REGISTRY[clean];
  }

  function safeToast(msg){
    try{
      if(typeof window.showToast === "function"){ window.showToast(msg); return; }
    }catch(_){}
    var el = document.getElementById("toast");
    if(el){
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(el.__dvl0804T);
      el.__dvl0804T = setTimeout(function(){ el.classList.remove("show"); }, 2600);
      return;
    }
    console.warn("[DVL 0.804]", msg);
  }

  function isSymbolSupported(cleanSym){
    cleanSym = normSymbol(cleanSym);
    var arr = window._dvlSymbols;
    if(arr && Array.isArray(arr) && arr.indexOf(cleanSym) >= 0) return true;
    var asset = window.DVL_ASSET_REGISTRY && window.DVL_ASSET_REGISTRY[cleanSym];
    return !!(asset && asset.supportedInChart === true);
  }

  function loadSupportedPairs(){
    if(SUPPORTED_READY) return Promise.resolve(window._dvlSymbols || []);
    if(SUPPORTED_LOADING) return SUPPORTED_LOADING;

    ensureRegistry();

    SUPPORTED_LOADING = fetch(FUTURES_INFO_URL, {cache:"no-store"})
      .then(function(r){ return r.ok ? r.json() : Promise.reject(new Error("exchangeInfo " + r.status)); })
      .then(function(j){
        var pairs = [];
        if(j && Array.isArray(j.symbols)){
          pairs = j.symbols
            .filter(function(s){
              return s && s.contractType === "PERPETUAL" && s.quoteAsset === "USDT" && s.status === "TRADING";
            })
            .map(function(s){ return s.symbol; })
            .filter(Boolean)
            .sort();
        }
        if(!pairs.length) throw new Error("empty futures pairs");

        var arr = window._dvlSymbols;
        if(!arr || !Array.isArray(arr)){
          arr = [];
          window._dvlSymbols = arr;
        }
        pairs.forEach(function(sym){
          if(arr.indexOf(sym) < 0) arr.push(sym);
          registerAsset(sym, true);
        });

        SUPPORTED_READY = true;
        fixAssetDropdownIcons();
        return arr;
      })
      .catch(function(err){
        console.warn("[DVL Safe Core Bridge 0.804] pair load failed:", err && err.message ? err.message : err);
        SUPPORTED_READY = false;
        return window._dvlSymbols || [];
      });

    return SUPPORTED_LOADING;
  }

  function applyHeaderIcon(sym){
    var clean = normSymbol(sym);
    if(!clean){var txt=document.getElementById("symbolText")||document.getElementById("dvl1b_symbolText"); if(txt) clean=normSymbol(txt.textContent);}
    if(!clean) return;
    /* Idempotent guard — CRITICAL: this runs from a MutationObserver on
       #symbolText, and the body below writes #symbolText + rewrites the icon
       className. Without this guard each write re-triggers the observer, which
       loops and repaints the logo forever (the flick). If the header already
       shows this symbol, do nothing so the observer settles. */
    var _firstCoin=document.querySelector("#DVL_UI_OVERLAY_PHASE_1B .dvl1b-coin, #symbolBtn .btc, .symbolBtn .btc, .marketRow .btc");
    if(_firstCoin && _firstCoin.getAttribute("data-dvl-symbol")===clean && _firstCoin.classList.contains("dvlAssetLetterIcon")) return;
    var base=baseOf(clean), icon=getIcon(base), letter=icon.text||icon.label||(window.dvlAssetFirstLetter?window.dvlAssetFirstLetter(clean):base.charAt(0)), c=icon.className||(window.dvlAssetLetterClass?window.dvlAssetLetterClass(clean):"dvlLetterGeneric");
    var coins=document.querySelectorAll("#symbolBtn .btc, .symbolBtn .btc, .marketRow .btc, #DVL_UI_OVERLAY_PHASE_1B .dvl1b-coin");
    for(var i=0;i<coins.length;i++){var coin=coins[i];coin.textContent=letter;coin.className=(coin.classList.contains("dvl1b-coin")?"dvl1b-coin ":"btc ")+c+" dvlAssetLetterIcon dvlSafeIcon0804";coin.setAttribute("data-dvl-symbol",clean);coin.setAttribute("title",displaySymbol(clean));}
    var st=document.getElementById("symbolText"); if(st) st.textContent=displaySymbol(clean);
    var st2=document.getElementById("dvl1b_symbolText"); if(st2) st2.textContent=displaySymbol(clean);
  }

  function fixAssetDropdownIcons(){
    try{var opts=document.querySelectorAll(".assetOption[data-symbol]");for(var i=0;i<opts.length;i++){var sym=normSymbol(opts[i].getAttribute("data-symbol"));var base=baseOf(sym);var icon=getIcon(base);var letter=icon.text||icon.label||(window.dvlAssetFirstLetter?window.dvlAssetFirstLetter(sym):base.charAt(0));var c=icon.className||(window.dvlAssetLetterClass?window.dvlAssetLetterClass(sym):"dvlLetterGeneric");var coin=opts[i].querySelector(".assetCoin");if(coin){coin.textContent=letter;coin.className="assetCoin "+c+" dvlAssetLetterIcon dvlSafeIcon0804";coin.setAttribute("data-dvl-symbol",sym);}var label=opts[i].querySelector(".assetLabel small");var asset=window.DVL_ASSET_REGISTRY&&window.DVL_ASSET_REGISTRY[sym];if(label)label.textContent=asset&&asset.name?asset.name:sym;}}
    catch(err){console.warn("[DVL Safe Core Bridge 0.804] dropdown icon sync failed",err);}
  }

  function patchRenderAssetDropdown(){
    if(PATCHED_RENDER_DROPDOWN) return;
    if(typeof window.renderAssetDropdown !== "function") return;
    PATCHED_RENDER_DROPDOWN = true;

    var original = window.renderAssetDropdown;
    window.renderAssetDropdown = function(){
      var result = original.apply(this, arguments);
      try{ ensureRegistry(); fixAssetDropdownIcons(); }catch(_){}
      return result;
    };
  }

  function fixScannerCardIcons(){
    try{var cards=document.querySelectorAll("#dvlScannerPanel0780 .dvlScan080Card");for(var i=0;i<cards.length;i++){var raw=cards[i].getAttribute("data-mexc")||cards[i].getAttribute("data-symbol")||"";var clean=normSymbol(raw);if(!clean){var pair=cards[i].querySelector(".dvlScan080Pair");if(pair)clean=normSymbol(pair.textContent);}if(!clean)continue;var base=baseOf(clean), icon=getIcon(base), coin=cards[i].querySelector(".dvlScan080Coin");if(coin){coin.textContent=icon.label||icon.text||(window.dvlAssetFirstLetter?window.dvlAssetFirstLetter(clean):base.charAt(0));coin.className="dvlScan080Coin "+(icon.scanClass||icon.className||"dvlLetterGeneric")+" dvlAssetLetterIcon dvlSafeScanIcon0804";coin.setAttribute("data-dvl-symbol",clean);}}}
    catch(err){console.warn("[DVL Safe Core Bridge 0.804] scanner icon sync failed",err);}
  }

  function startScannerIconObserver(){
    if(SCANNER_OBSERVER) return;
    var panel = document.getElementById("dvlScannerPanel0780");
    if(!panel) return;

    SCANNER_OBSERVER = new MutationObserver(function(){
      fixScannerCardIcons();
    });
    SCANNER_OBSERVER.observe(panel, {childList:true, subtree:true});
    fixScannerCardIcons();
  }

  function syncAllIcons(){
    ensureRegistry();
    patchRenderAssetDropdown();
    fixAssetDropdownIcons();
    fixScannerCardIcons();
    applyHeaderIcon();
    startScannerIconObserver();
  }

  function selectAssetFromScanner(symbolLike){
    var clean = normSymbol(symbolLike);
    if(!clean){
      safeToast("Símbolo inválido");
      return Promise.resolve(false);
    }

    return loadSupportedPairs().then(function(){
      ensureRegistry();

      if(!isSymbolSupported(clean)){
        safeToast("Ativo não suportado no gráfico: " + displaySymbol(clean));
        return false;
      }

      var asset = registerAsset(clean, true);

      try{
        var interval = null;
        try{
          var scanApi = window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780;
          /* Keep TF unchanged unless the scanner itself already changed it. */
        }catch(_){}
        if(typeof window.selectSymbol === "function"){
          window.selectSymbol(clean);
        }else{
          safeToast("Seletor real do gráfico não encontrado");
          return false;
        }

        setTimeout(function(){ applyHeaderIcon(clean); fixAssetDropdownIcons(); }, 0);
        setTimeout(function(){ applyHeaderIcon(clean); fixAssetDropdownIcons(); }, 120);
        setTimeout(function(){ applyHeaderIcon(clean); fixAssetDropdownIcons(); }, 450);

        try{
          var panel = document.getElementById("dvlScannerPanel0780");
          if(panel) panel.classList.remove("is-open");
          var btn = document.getElementById("scannerNavBtn");
          if(btn){ btn.classList.remove("active"); btn.setAttribute("aria-pressed","false"); }
          document.body.classList.remove("dvlScannerOpen080");
          try{ window.dispatchEvent(new CustomEvent("dvl:scanner-state-change",{detail:{open:false,source:"scanner-select-asset"}})); }catch(_){}
        }catch(_){}

        window.dispatchEvent(new CustomEvent("dvl-safe-asset-selected-0804", {
          detail: {
            symbol: clean,
            display: asset.display,
            source: "scanner",
            version: "0.804"
          }
        }));

        return true;
      }catch(err){
        console.warn("[DVL Safe Core Bridge 0.804] select error", err);
        safeToast("Erro ao abrir ativo: " + displaySymbol(clean));
        return false;
      }
    });
  }

  function interceptScannerAnalyze(ev){
    var target = ev.target && ev.target.closest ? ev.target.closest("[data-dvl-scan-analyze]") : null;
    if(!target) return;

    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    var sym = target.getAttribute("data-dvl-scan-analyze") ||
      (target.closest(".dvlScan080Card") && target.closest(".dvlScan080Card").getAttribute("data-mexc")) ||
      "";

    selectAssetFromScanner(sym);
  }

  function initHeaderObserver(){
    if(HEADER_OBSERVER) return;
    var st = document.getElementById("symbolText");
    if(!st) return;
    HEADER_OBSERVER = new MutationObserver(function(){
      applyHeaderIcon(st.textContent);
    });
    HEADER_OBSERVER.observe(st, {characterData:true, childList:true, subtree:true});
    applyHeaderIcon(st.textContent);
  }

  function expose(){
    window.DVL_SAFE_CORE_BRIDGE_0804 = {
      version: "0.804",
      ensureRegistry: ensureRegistry,
      loadSupportedPairs: loadSupportedPairs,
      selectAssetFromScanner: selectAssetFromScanner,
      applyHeaderIcon: applyHeaderIcon,
      fixAssetDropdownIcons: fixAssetDropdownIcons,
      fixScannerCardIcons: fixScannerCardIcons,
      getIcon: getIcon
    };

    window.DVL_SELECT_ASSET_FROM_SCANNER = selectAssetFromScanner;

    var prevGet = window.getAssetIconMeta;
    window.getAssetIconMeta = function(symbol){
      var clean = normSymbol(symbol);
      var base = baseOf(clean);
      var icon = getIcon(base);
      if(!window.DVL_ASSET_REGISTRY || !window.DVL_ASSET_REGISTRY[clean]){
        registerAsset(clean, isSymbolSupported(clean));
      }
      if(icon) return {label:icon.label || icon.text || (window.dvlAssetFirstLetter ? window.dvlAssetFirstLetter(clean) : base.charAt(0)), className:icon.wlClass || icon.className || (window.dvlAssetLetterClass ? window.dvlAssetLetterClass(clean) : "dvlLetterGeneric"), name:icon.name || base};
      return typeof prevGet === "function" ? prevGet(symbol) : {label:(window.dvlAssetFirstLetter ? window.dvlAssetFirstLetter(clean) : (base || "?").replace(/^[0-9]+/,"").charAt(0) || "?"), className:(window.dvlAssetLetterClass ? window.dvlAssetLetterClass(clean) : "dvlLetterGeneric"), name:base || clean};
    };

    window.renderAssetIcon = function(symbol){
      var meta = window.getAssetIconMeta(symbol);
      return '<span class="dvlCoinIcon '+meta.className+'" aria-label="'+meta.name+'">'+meta.label+'</span>';
    };
  }

  function boot(){
    expose();
    ensureRegistry();
    patchRenderAssetDropdown();
    syncAllIcons();
    initHeaderObserver();

    /* Window capture runs before document-capture handlers already inside the scanner.
       This prevents the old analyze handler from pushing unsupported symbols or falling back. */
    window.addEventListener("click", interceptScannerAnalyze, true);

    loadSupportedPairs().then(function(){
      syncAllIcons();
    });

    setTimeout(syncAllIcons, 250);
    setTimeout(syncAllIcons, 900);
    setTimeout(syncAllIcons, 1800);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  }else{
    boot();
  }

})();
