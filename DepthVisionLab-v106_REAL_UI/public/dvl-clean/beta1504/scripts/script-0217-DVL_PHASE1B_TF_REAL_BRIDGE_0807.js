(function(){
  "use strict";
  if(window.DVL_PHASE1B_TF_REAL_BRIDGE_0807) return;
  window.DVL_PHASE1B_TF_REAL_BRIDGE_0807 = true;

  var FALLBACK_TFS = ["1s","5s","10s","15s","30s","1m","2m","3m","4m","5m","6m","7m","8m","10m","12m","15m","20m","30m","45m","1h","2h","3h","4h","6h","8h","12h","1d","2d","3d","1w","1mo"];
  var DEFAULT_FAVS = ["1m","5m","15m","1h"];
  var HOLD_MS = 610;

  function tfValue(tf){
    var m = String(tf || "").trim().toLowerCase().match(/^(\d+)(s|mo|m|h|d|w)$/);
    if(!m) return Number.MAX_SAFE_INTEGER;
    var n = Math.max(1, Number(m[1]) || 1);
    var u = m[2];
    if(u === "s") return n / 60;
    if(u === "m") return n;
    if(u === "h") return n * 60;
    if(u === "d") return n * 1440;
    if(u === "w") return n * 10080;
    if(u === "mo") return n * 43200;
    return Number.MAX_SAFE_INTEGER;
  }

  function uniqueSorted(list){
    var seen = {};
    return (Array.isArray(list) ? list : [])
      .map(function(tf){ return String(tf || "").trim().toLowerCase(); })
      .filter(function(tf){ return /^[1-9]\d*(s|mo|m|h|d|w)$/.test(tf); })
      .filter(function(tf){ if(seen[tf]) return false; seen[tf] = true; return true; })
      .sort(function(a,b){ return tfValue(a) - tfValue(b) || a.localeCompare(b); });
  }

  function getAvailable(){
    try{
      if(typeof availableTimeframes !== "undefined" && Array.isArray(availableTimeframes) && availableTimeframes.length){
        return uniqueSorted(availableTimeframes);
      }
    }catch(_){}
    return uniqueSorted(FALLBACK_TFS);
  }

  function getFavorites(){
    var available = getAvailable();
    try{
      if(typeof favoriteTimeframes !== "undefined" && Array.isArray(favoriteTimeframes) && favoriteTimeframes.length){
        return uniqueSorted(favoriteTimeframes).filter(function(tf){ return available.indexOf(tf) >= 0; });
      }
    }catch(_){}
    try{
      var parsed = JSON.parse(localStorage.getItem("DVL_FAVORITE_TIMEFRAMES") || "[]");
      if(Array.isArray(parsed) && parsed.length){
        return uniqueSorted(parsed).filter(function(tf){ return available.indexOf(tf) >= 0; });
      }
    }catch(_){}
    return DEFAULT_FAVS.filter(function(tf){ return available.indexOf(tf) >= 0; });
  }

  function setFavorites(next){
    var available = getAvailable();
    next = uniqueSorted(next).filter(function(tf){ return available.indexOf(tf) >= 0; });
    if(!next.length) next = ["1m"].filter(function(tf){ return available.indexOf(tf) >= 0; });
    if(!next.length) next = [available[0]];

    try{ favoriteTimeframes = next.slice(); }catch(_){}
    try{ localStorage.setItem("DVL_FAVORITE_TIMEFRAMES", JSON.stringify(next)); }catch(_){}
    try{ if(typeof saveFavoriteTimeframes === "function") saveFavoriteTimeframes(); }catch(_){}
    return next;
  }

  function isFav(tf){
    return getFavorites().indexOf(String(tf || "").toLowerCase()) >= 0;
  }

  function label(tf){
    tf = String(tf || "").trim().toLowerCase();
    return tf.replace("h","H").replace("d","D").replace("w","W");
  }

  function activeTf(){
    try{ if(typeof interval !== "undefined" && interval) return String(interval).toLowerCase(); }catch(_){}
    try{ if(window.interval) return String(window.interval).toLowerCase(); }catch(_){}
    return "1m";
  }

  function closeTf(){
    try{ if(typeof window.dvlTfClose0783 === "function") window.dvlTfClose0783(); }catch(_){}
    var wrap = document.getElementById("dvl1b_tfDropWrap");
    var btn = document.getElementById("dvl1b_tfDropBtn");
    var menu = document.getElementById("dvl1b_tfDropMenu");
    if(wrap) wrap.classList.remove("is-open");
    if(btn){ btn.classList.remove("dvl1b-open"); btn.setAttribute("aria-expanded","false"); }
    if(menu){ menu.setAttribute("aria-hidden","true"); menu.style.display = ""; }
  }

  function applyTf(tf){
    tf = norm(tf);
    if(getAvailable().indexOf(tf) < 0) return;
    var apiTf = (tf === "1mo") ? "1M" : tf;

    try{
      if(typeof setIntervalUi === "function") setIntervalUi(apiTf);
      else if(window.setIntervalUi) window.setIntervalUi(apiTf);
    }catch(err){
      console.warn("[DVL 0.807] setIntervalUi failed", err);
    }

    setTimeout(renderAll, 0);
    setTimeout(renderAll, 120);
  }

  function toggleFav(tf){
    tf = norm(tf);
    var favs = getFavorites();
    var idx = favs.indexOf(tf);
    if(idx >= 0){
      if(favs.length <= 1) return;
      favs.splice(idx, 1);
    }else{
      favs.push(tf);
    }
    setFavorites(favs);
    renderAll();
  }

  function bindHoldClick(el, tf, onTap){
    var timer = null;
    var held = false;

    el.addEventListener("pointerdown", function(ev){
      held = false;
      clearTimeout(timer);
      timer = setTimeout(function(){
        held = true;
        toggleFav(tf);
      }, HOLD_MS);
    }, {passive:true});

    ["pointerup","pointercancel","pointerleave"].forEach(function(evt){
      el.addEventListener(evt, function(){ clearTimeout(timer); }, {passive:true});
    });

    el.addEventListener("click", function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      if(held) return;
      onTap(tf);
    }, true);
  }

  function renderHotbar(){
    var scroll = document.getElementById("dvl1b_tfScroll");
    if(!scroll) return;

    var act = activeTf();
    var favs = getFavorites();
    scroll.innerHTML = "";

    favs.forEach(function(tf){
      var btn = document.createElement("button");
      btn.className = "dvl1b-tf" + (tf === act ? " is-active" : "");
      btn.type = "button";
      btn.setAttribute("data-tf", tf);
      btn.setAttribute("title", "Toque para abrir · segure para desfavoritar");
      btn.textContent = label(tf);
      bindHoldClick(btn, tf, function(t){ applyTf(t); });
      scroll.appendChild(btn);
    });

    var activeBtn = scroll.querySelector('.dvl1b-tf[data-tf="' + act + '"]');
    if(activeBtn){
      try{ activeBtn.scrollIntoView({block:"nearest", inline:"center", behavior:"smooth"}); }catch(_){}
    }
  }

  function addGroup(menu, title){
    var hdr = document.createElement("div");
    hdr.className = "dvl1b-tfDropGroup";
    hdr.textContent = title;
    menu.appendChild(hdr);
  }

  function groupFor(tf){
    if(/s$/.test(tf)) return "Segundos";
    if(/m$/.test(tf)) return "Minutos";
    if(/h$/.test(tf)) return "Horas";
    if(/d$/.test(tf)) return "Dias";
    if(/w$/.test(tf)) return "Semanas";
    return "Outros";
  }

  function renderDropdown(){
    var menu = document.getElementById("dvl1b_tfDropMenu");
    if(!menu) return;

    var act = activeTf();
    var available = getAvailable();
    var lastGroup = "";
    menu.innerHTML = "";

    available.forEach(function(tf){
      var g = groupFor(tf);
      if(g !== lastGroup){
        addGroup(menu, g);
        lastGroup = g;
      }

      var item = document.createElement("button");
      item.className = "dvl1b-tfDropItem" + (tf === act ? " is-active" : "");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.setAttribute("data-dvl1b-tf", tf);
      item.setAttribute("title", "Toque para abrir · segure para " + (isFav(tf) ? "desfavoritar" : "favoritar"));

      var lbl = document.createElement("span");
      lbl.className = "dvl1b-tfDropLabel";
      lbl.textContent = label(tf);
      item.appendChild(lbl);

      var star = document.createElement("span");
      star.className = "dvl1b-tfDropStar" + (isFav(tf) ? " is-fav" : "");
      star.setAttribute("aria-hidden", "true");
      star.textContent = isFav(tf) ? "★" : "☆";
      item.appendChild(star);

      bindHoldClick(item, tf, function(t){
        applyTf(t);
        closeTf();
      });

      menu.appendChild(item);
    });
  }

  function renderAll(){
    renderHotbar();
    renderDropdown();
  }

  // Public bridge names expected by the Phase 1B header click handler.
  window.DVL_RENDER_1B_TF_HOTBAR = renderHotbar;
  window.DVL_RENDER_1B_TF_DROPDOWN = renderDropdown;
  window.DVL_CLOSE_1B_TF_DROPDOWN = closeTf;
  window.renderTfHotbarFavorites = renderHotbar;
  window.renderTfDropdown = renderDropdown;

  // Hook existing real state mutations so visible Phase 1B always reflects the real engine.
  if(typeof window.__dvl807TfWrapDone === "undefined"){
    window.__dvl807TfWrapDone = true;

    try{
      var oldSetIntervalUi = setIntervalUi;
      if(typeof oldSetIntervalUi === "function"){
        setIntervalUi = function(iv){
          var out = oldSetIntervalUi.apply(this, arguments);
          setTimeout(renderAll, 0);
          return out;
        };
      }
    }catch(_){}

    try{
      var oldToggleFavoriteTimeframe = toggleFavoriteTimeframe;
      if(typeof oldToggleFavoriteTimeframe === "function"){
        toggleFavoriteTimeframe = function(tf){
          var out = oldToggleFavoriteTimeframe.apply(this, arguments);
          setTimeout(renderAll, 0);
          return out;
        };
      }
    }catch(_){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", renderAll, {once:true});
  }else{
    renderAll();
  }
  setTimeout(renderAll, 180);
  setTimeout(renderAll, 900);
})();
