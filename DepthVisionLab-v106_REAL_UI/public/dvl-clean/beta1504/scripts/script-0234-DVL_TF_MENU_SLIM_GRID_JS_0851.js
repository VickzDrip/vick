(function(){
  "use strict";

  var BOOT_KEY = "DVL_TF_MENU_SLIM_GRID_0851";
  if(window[BOOT_KEY]) return;
  window[BOOT_KEY] = true;

  var TFS = ["15s","30s","1m","2m","3m","5m","10m","15m","20m","30m","45m","1h","2h","4h","6h","8h","12h","1d","3d","1w","1mo"];
  var STORAGE_KEY = "DVL_TF_FAVORITES_0851";
  var lastTouch = 0;
  var open = false;
  var cleaned = false;
  var HOLD_MS = 520;
  var holdBlockUntil = 0;
  var delegatedHold = {timer:null, el:null, tf:null, x:0, y:0, fired:false};

  function norm(tf){
    tf = String(tf || "").trim().toLowerCase();
    var m = tf.match(/^(\d+)(mo|s|m|h|d|w)$/);
    return m ? String(Math.max(1, Number(m[1]) || 1)) + m[2] : "5m";
  }
  function label(tf){
    return norm(tf).replace("mo","M").replace("h","H").replace("d","D").replace("w","W");
  }
  function sortTfs(list){
    var order = {};
    TFS.forEach(function(tf, i){ order[norm(tf)] = i; });
    return (list || []).map(norm).filter(function(tf, i, arr){
      return order.hasOwnProperty(tf) && arr.indexOf(tf) === i;
    }).sort(function(a,b){ return order[a] - order[b]; });
  }
  function loadFavs(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      var clean = sortTfs(Array.isArray(parsed) ? parsed : ["1m","3m","5m","15m","1h"]);
      if(clean.length) return clean;
    }catch(_){}
    return ["1m","3m","5m","15m","1h"];
  }
  function saveFavs(list){
    var clean = sortTfs(list);
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); }catch(_){}
    return clean;
  }
  /* Beta 1.382 — fixa 15s/30s na barra UMA vez (candles reais de subsegundo).
     Respeita o usuário depois: se ele remover, não volta (flag). */
  try{
    if(!localStorage.getItem("DVL_TF_SECONDS_PINNED_0851")){
      var _cur = loadFavs();
      var _need = ["15s","30s"].filter(function(t){ return _cur.indexOf(t) < 0; });
      if(_need.length) saveFavs(_need.concat(_cur));
      localStorage.setItem("DVL_TF_SECONDS_PINNED_0851","1");
    }
  }catch(_){}

  function btn(){ return document.getElementById("dvl1b_tfDropBtn"); }
  function wrap(){ return document.getElementById("dvl1b_tfDropWrap"); }
  function hotbar(){ return document.getElementById("dvl1b_tfScroll"); }

  function menu(){
    var m = document.getElementById("dvl1b_tfDropMenu");
    if(!m){
      m = document.createElement("div");
      m.id = "dvl1b_tfDropMenu";
      m.className = "dvl1b-menu dvl1b-tfDropMenu";
      m.setAttribute("role","menu");
      m.setAttribute("aria-hidden","true");
      document.body.appendChild(m);
    }
    m.classList.add("dvl-tf-menu-0846");
    if(m.parentElement !== document.body) document.body.appendChild(m);
    return m;
  }

  function getActiveTf(){
    try{ if(window.DVL_REAL_TIMEFRAME_STATE && window.DVL_REAL_TIMEFRAME_STATE.activeTf) return norm(window.DVL_REAL_TIMEFRAME_STATE.activeTf); }catch(_){}
    try{ if(typeof interval !== "undefined" && interval) return norm(interval); }catch(_){}
    try{ if(window.interval) return norm(window.interval); }catch(_){}
    try{ if(window.currentInterval) return norm(window.currentInterval); }catch(_){}
    return "5m";
  }

  function markActiveTf(tf){
    tf = norm(tf);
    try{
      document.querySelectorAll("#dvl1b_tfScroll .dvl1b-tf[data-tf]").forEach(function(b){
        b.classList.toggle("is-active", norm(b.getAttribute("data-tf")) === tf);
      });
    }catch(_){}
    try{
      menu().querySelectorAll(".dvl-tf-main0846[data-tf]").forEach(function(b){
        b.classList.toggle("is-active", norm(b.getAttribute("data-tf")) === tf);
      });
    }catch(_){}
  }

  function applyTf(tf){
    tf = norm(tf);
    try{
      if(typeof window.applyRealTimeframe === "function"){
        window.applyRealTimeframe(tf, {autosave:true});
      }else if(typeof applyRealTimeframe === "function"){
        applyRealTimeframe(tf, {autosave:true});
      }else if(typeof setIntervalUi === "function"){
        setIntervalUi(tf);
      }else if(window.setIntervalUi){
        window.setIntervalUi(tf);
      }
    }catch(err){
      console.warn("[DVL TF 0.846] apply failed", err);
      return false;
    }
    try{ if(typeof drawSoon === "function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){}
    markActiveTf(tf);
    renderTfHotbar();
    closeTfMenu();
    return false;
  }

  function isFav(tf){
    tf = norm(tf);
    return loadFavs().indexOf(tf) !== -1;
  }

  function toggleFavorite(tf){
    tf = norm(tf);
    var list = loadFavs().slice();
    var idx = list.indexOf(tf);
    if(idx === -1) list.push(tf);
    else list.splice(idx, 1);
    saveFavs(list);
    renderTfHotbar();
    renderTfMenu();
  }


  function blockGhostClick(ms){
    holdBlockUntil = Date.now() + (ms || 700);
  }

  function isGhostBlocked(){
    return Date.now() < holdBlockUntil;
  }


  function tfHoldTargetFromEvent(ev){
    if(!ev || !ev.target || !ev.target.closest) return null;

    /*
      Menu button: long press the TF body, not only the tiny star.
      Scroll button: long press the favorite itself to remove it from scroll.
    */
    var menuBtn = ev.target.closest("#dvl1b_tfDropMenu [data-tf-choice]");
    if(menuBtn) return {el:menuBtn, tf:menuBtn.getAttribute("data-tf-choice")};

    var hotBtn = ev.target.closest("#dvl1b_tfScroll .dvl1b-tf[data-tf]");
    if(hotBtn) return {el:hotBtn, tf:hotBtn.getAttribute("data-tf")};

    return null;
  }

  function eventPoint(ev){
    var p = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    return {x:Number(p && p.clientX) || 0, y:Number(p && p.clientY) || 0};
  }

  function clearDelegatedHold(removeClass){
    clearTimeout(delegatedHold.timer);
    delegatedHold.timer = null;
    if(removeClass && delegatedHold.el) delegatedHold.el.classList.remove("is-hold-arming");
    delegatedHold.el = null;
    delegatedHold.tf = null;
    delegatedHold.fired = false;
  }

  function delegatedHoldStart(ev){
    var target = tfHoldTargetFromEvent(ev);
    if(!target) return;

    var p = eventPoint(ev);
    clearDelegatedHold(true);

    delegatedHold.el = target.el;
    delegatedHold.tf = norm(target.tf);
    delegatedHold.x = p.x;
    delegatedHold.y = p.y;
    delegatedHold.fired = false;

    target.el.classList.add("is-hold-arming");

    delegatedHold.timer = setTimeout(function(){
      if(!delegatedHold.el || !delegatedHold.tf) return;

      delegatedHold.fired = true;
      blockGhostClick(1000);

      try{ if(navigator.vibrate) navigator.vibrate(22); }catch(_){}

      var el = delegatedHold.el;
      var tf = delegatedHold.tf;

      el.classList.remove("is-hold-arming");
      toggleFavorite(tf);

      /*
        Keep the menu open and update both places instantly.
        This is the direct favorite action; it must not apply the TF.
      */
      renderTfHotbar();
      if(open) renderTfMenu();

      clearDelegatedHold(false);
    }, 430);
  }

  function delegatedHoldMove(ev){
    if(!delegatedHold.timer || !delegatedHold.el) return;
    var p = eventPoint(ev);
    if(Math.abs(p.x - delegatedHold.x) > 18 || Math.abs(p.y - delegatedHold.y) > 18){
      clearDelegatedHold(true);
    }
  }

  function delegatedHoldEnd(ev){
    if(delegatedHold.fired || isGhostBlocked()){
      if(ev && ev.cancelable) ev.preventDefault();
      if(ev) ev.stopPropagation();
      if(ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      clearDelegatedHold(true);
      return false;
    }
    clearDelegatedHold(true);
  }

  function bindDelegatedHoldFavorites(){
    if(window.__dvlTfDelegatedHold0851) return;
    window.__dvlTfDelegatedHold0851 = true;

    /*
      Capture phase is the key: this runs before the old Phase 1B click/touch
      listeners and before the normal TF apply handler.
    */
    document.addEventListener("touchstart", delegatedHoldStart, {capture:true, passive:true});
    document.addEventListener("touchmove", delegatedHoldMove, {capture:true, passive:true});
    document.addEventListener("touchend", delegatedHoldEnd, {capture:true, passive:false});
    document.addEventListener("touchcancel", delegatedHoldEnd, {capture:true, passive:false});

    document.addEventListener("pointerdown", function(ev){
      if(ev.pointerType === "touch") return;
      delegatedHoldStart(ev);
    }, true);
    document.addEventListener("pointermove", function(ev){
      if(ev.pointerType === "touch") return;
      delegatedHoldMove(ev);
    }, true);
    document.addEventListener("pointerup", function(ev){
      if(ev.pointerType === "touch") return;
      delegatedHoldEnd(ev);
    }, true);
    document.addEventListener("pointercancel", function(ev){
      if(ev.pointerType === "touch") return;
      delegatedHoldEnd(ev);
    }, true);
  }

  function bindHoldFavorite(el, tf){
    if(!el || el.__dvlTfHoldFav0850) return;
    el.__dvlTfHoldFav0850 = true;

    var timer = null;
    var startX = 0;
    var startY = 0;
    var moved = false;

    function point(ev){
      var p = ev && ((ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev);
      return {x:Number(p && p.clientX) || 0, y:Number(p && p.clientY) || 0};
    }

    function clear(){
      clearTimeout(timer);
      timer = null;
      el.classList.remove("is-hold-arming");
    }

    function start(ev){
      moved = false;
      var p = point(ev);
      startX = p.x;
      startY = p.y;
      clearTimeout(timer);
      el.classList.add("is-hold-arming");

      timer = setTimeout(function(){
        if(moved) return;
        clear();
        blockGhostClick(850);
        try{ if(navigator.vibrate) navigator.vibrate(18); }catch(_){}
        toggleFavorite(tf);
      }, HOLD_MS);
    }

    function move(ev){
      if(!timer) return;
      var p = point(ev);
      if(Math.abs(p.x - startX) > 8 || Math.abs(p.y - startY) > 8){
        moved = true;
        clear();
      }
    }

    el.addEventListener("pointerdown", start, {passive:true});
    el.addEventListener("pointermove", move, {passive:true});
    ["pointerup","pointercancel","pointerleave"].forEach(function(evt){
      el.addEventListener(evt, clear, {passive:true});
    });

    el.addEventListener("touchstart", start, {capture:true, passive:true});
    el.addEventListener("touchmove", move, {capture:true, passive:true});
    ["touchend","touchcancel"].forEach(function(evt){
      el.addEventListener(evt, clear, {capture:true, passive:true});
    });
  }

  function bindHoldFavoritesInMenu(){
    try{
      menu().querySelectorAll("[data-tf-choice]").forEach(function(el){
        bindHoldFavorite(el, el.getAttribute("data-tf-choice"));
      });
    }catch(_){}
  }

  function bindHoldFavoritesInHotbar(){
    var sc = hotbar();
    if(!sc) return;
    try{
      sc.querySelectorAll(".dvl1b-tf[data-tf]").forEach(function(el){
        bindHoldFavorite(el, el.getAttribute("data-tf"));
      });
    }catch(_){}
  }

  function renderTfHotbar(){
    var sc = hotbar();
    if(!sc) return;
    var favs = loadFavs();
    var active = getActiveTf();

    if(!favs.length){
      sc.innerHTML = '<div class="dvl1b-tf placeholder-empty0846">sem fav</div>';
      return;
    }

    sc.innerHTML = favs.map(function(tf){
      return '<button class="dvl1b-tf ' + (norm(tf) === active ? 'is-active' : '') + '" type="button" data-tf="' + norm(tf) + '">' +
               '<span>' + label(tf) + '</span>' +
               '<span class="tf-fav-dot0846" aria-hidden="true"></span>' +
             '</button>';
    }).join("");

    bindHoldFavoritesInHotbar();
  }

  function renderTfMenu(){
    var m = menu();
    var active = getActiveTf();
    m.innerHTML = '<div class="dvl-tf-grid0846">' + TFS.map(function(tf){
      var n = norm(tf);
      var fav = isFav(n);
      return '' +
        '<div class="dvl-tf-tile0846">' +
          '<button class="dvl-tf-main0846 ' + (n === active ? 'is-active' : '') + '" type="button" data-tf-choice="' + n + '">' + label(n) + '</button>' +
          '<button class="dvl-tf-star0846 ' + (fav ? 'is-fav' : '') + '" type="button" aria-label="' + (fav ? 'Desfavoritar ' : 'Favoritar ') + label(n) + '" data-fav-toggle="' + n + '">' + (fav ? '★' : '☆') + '</button>' +
        '</div>';
    }).join("") + '</div>';

    bindHoldFavoritesInMenu();
    return m;
  }

  function positionTfMenu(){
    var b = btn();
    var m = menu();
    if(!b || !m) return;
    var r = b.getBoundingClientRect();
    var w = Math.min(348, (window.innerWidth || 360) - 18);
    var left = Math.max(8, Math.min(Math.round(r.left), (window.innerWidth || 360) - w - 8));
    var top = Math.round(r.bottom + 7);
    m.style.setProperty("left", left + "px", "important");
    m.style.setProperty("top", top + "px", "important");
  }

  function openTfMenu(){
    var m = renderTfMenu();
    var b = btn();
    var w = wrap();
    positionTfMenu();
    m.classList.add("is-open");
    m.style.setProperty("display","block","important");
    m.setAttribute("aria-hidden","false");
    if(w) w.classList.add("is-open");
    if(b){
      b.classList.add("dvl1b-open");
      b.setAttribute("aria-expanded","true");
    }
    open = true;
  }
  function closeTfMenu(){
    var m = menu();
    var b = btn();
    var w = wrap();
    m.classList.remove("is-open");
    m.style.setProperty("display","none","important");
    m.setAttribute("aria-hidden","true");
    if(w) w.classList.remove("is-open");
    if(b){
      b.classList.remove("dvl1b-open");
      b.setAttribute("aria-expanded","false");
    }
    open = false;
  }
  function toggleTfMenu(ev){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }
    if(open) closeTfMenu();
    else openTfMenu();
    return false;
  }

  function bindCleanButton(){
    var b = btn();
    if(!b) return false;

    if(!cleaned || !b.__dvlTfClean0846){
      var clone = b.cloneNode(true);
      clone.id = "dvl1b_tfDropBtn";
      clone.type = "button";
      clone.removeAttribute("data-tf");
      clone.__dvlTfClean0846 = true;
      b.parentNode.replaceChild(clone, b);
      b = clone;
      cleaned = true;
    }

    if(b.__dvlTfBound0846) return true;
    b.__dvlTfBound0846 = true;

    b.setAttribute("aria-haspopup","true");
    b.setAttribute("aria-expanded","false");
    b.onclick = null;

    /* Beta 1.181 — exactly one toggle per physical action. The previous
       onclick + capture click + pointerup stack toggled three times on PC. */
    b.addEventListener("touchend", function(ev){
      lastTouch = Date.now();
      return toggleTfMenu(ev);
    }, {capture:true, passive:false});

    b.addEventListener("click", function(ev){
      if(Date.now() - lastTouch < 700){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        return false;
      }
      return toggleTfMenu(ev);
    }, true);

    return true;
  }

  function bindMenu(){
    var m = menu();
    if(m.__dvlTfMenuBound0846) return;
    m.__dvlTfMenuBound0846 = true;

    m.addEventListener("click", function(ev){
      if(isGhostBlocked()){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        return false;
      }

      var fav = ev.target && ev.target.closest ? ev.target.closest("[data-fav-toggle]") : null;
      if(fav){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        toggleFavorite(fav.getAttribute("data-fav-toggle"));
        return false;
      }
      var item = ev.target && ev.target.closest ? ev.target.closest("[data-tf-choice]") : null;
      if(item){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        applyTf(item.getAttribute("data-tf-choice"));
        return false;
      }
    }, true);

    ["touchstart","touchend","pointerdown","pointerup"].forEach(function(evt){
      m.addEventListener(evt, function(ev){ ev.stopPropagation(); }, true);
    });
  }

  function bindHotbar(){
    var sc = hotbar();
    if(!sc || sc.__dvlTfHotbarBound0846) return;
    sc.__dvlTfHotbarBound0846 = true;

    sc.addEventListener("click", function(ev){
      if(isGhostBlocked()){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        return false;
      }

      var item = ev.target && ev.target.closest ? ev.target.closest(".dvl1b-tf[data-tf]") : null;
      if(!item) return;
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      applyTf(item.getAttribute("data-tf"));
    }, true);
  }

  function bindOutside(){
    if(window.__dvlTfOutside0846) return;
    window.__dvlTfOutside0846 = true;

    document.addEventListener("click", function(ev){
      if(!open) return;
      var b = btn(), m = menu();
      if((b && b.contains(ev.target)) || (m && m.contains(ev.target))) return;
      closeTfMenu();
    }, true);

    window.addEventListener("resize", function(){ if(open) positionTfMenu(); }, {passive:true});
    window.addEventListener("orientationchange", function(){ setTimeout(function(){ if(open) positionTfMenu(); }, 220); }, {passive:true});
  }

  function expose(){
    window.DVL_TF_MENU = {
      open: openTfMenu,
      close: closeTfMenu,
      toggle: toggleTfMenu,
      apply: applyTf,
      render: renderTfMenu,
      renderHotbar: renderTfHotbar,
      favorites: loadFavs,
      toggleFavorite: toggleFavorite,
      active: getActiveTf
    };
  }

  function boot(){
    menu();
    bindCleanButton();
    bindMenu();
    bindDelegatedHoldFavorites();
    renderTfHotbar();
    bindHoldFavoritesInHotbar();
    bindHotbar();
    bindOutside();
    markActiveTf(getActiveTf());
    expose();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  }else{
    boot();
  }

  setTimeout(boot, 250);
  setTimeout(boot, 900);
  setTimeout(boot, 1600);

  try{
    var mo = new MutationObserver(function(){
      bindCleanButton();
      bindHotbar();
      if(open) positionTfMenu();
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }catch(_){}
})();
