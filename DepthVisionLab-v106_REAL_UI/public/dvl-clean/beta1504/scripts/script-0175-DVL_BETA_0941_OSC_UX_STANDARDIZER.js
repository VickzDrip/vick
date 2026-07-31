(function(){
  "use strict";
  var LIMIT = 3;
  var OSC_KEYS = ["oi","ls","dv","exr","arion"];
  var KEY_TO_API = {
    oi:"DVLOpenInterestOscillator",
    ls:"DVLLongShortOscillator",
    dv:"DVLDeltaVolume",
    exr:"DVLExhaustionRSI",
    arion:"DVLArionZoneProfile"
  };
  var PANEL_IDS = {
    dvlOIOn:"oi",
    dvlLSOn:"ls",
    dvlDvOn:"dv",
    dvlArionOn:"arion"
  };

  function toast(msg){
    try{ if(typeof window.showToast === "function"){ window.showToast(msg); return; } }catch(_){ }
    try{
      var t=document.getElementById('toast');
      if(t){ t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){ t.classList.remove('show'); }, 1700); return; }
    }catch(_){ }
    console.warn(msg);
  }
  function block(ev){
    if(!ev) return;
    if(ev.preventDefault) ev.preventDefault();
    if(ev.stopPropagation) ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }
  function api(key){
    try{ return window[KEY_TO_API[key]] || null; }catch(_){ return null; }
  }
  function isOn(key){
    var a = api(key);
    try{ if(a && typeof a.on === 'function') return !!a.on(); }catch(_){ }
    try{ if(a && a.state) return !!a.state.on; }catch(_){ }
    return false;
  }
  function activeKeys(){ return OSC_KEYS.filter(isOn); }
  function limitMsg(){ toast('Limite de 3 osciladores por vez'); }
  function canEnable(key){
    if(isOn(key)) return true;
    return activeKeys().length < LIMIT;
  }
  function setOn(key, v){
    var a = api(key);
    try{ if(a && typeof a.setOn === 'function'){ a.setOn(!!v); return true; } }catch(_){ }
    return false;
  }
  function rerenderMenu(){
    try{
      if(window.DVL_PHASE1B_INDICATORS_MENU_0813_API && typeof window.DVL_PHASE1B_INDICATORS_MENU_0813_API.render === 'function'){
        window.DVL_PHASE1B_INDICATORS_MENU_0813_API.render();
      }
    }catch(_){ }
  }
  function drawSoonSafe(){
    try{ if(typeof window.drawSoon === 'function') window.drawSoon(); }catch(_){ }
  }
  function sanitizeActive(){
    var active = activeKeys();
    if(active.length <= LIMIT) return;
    active.slice(LIMIT).forEach(function(k){ setOn(k, false); });
    limitMsg();
    rerenderMenu();
    drawSoonSafe();
  }
  function openBookmapPanel(){
    var bm = window.DVL_BOOKMAP_ZONES_0813 || window.DVL_BOOKMAP_ZONES_0812 || window.DVL_BOOKMAP_ZONES_0808;
    try{
      if(bm && typeof bm.openPanel === 'function'){ bm.openPanel(); return true; }
      if(bm && typeof bm.open === 'function'){ bm.open(); return true; }
    }catch(_){ }
    return false;
  }

  document.addEventListener('click', function(ev){
    var t = ev.target;
    if(!t || !t.closest) return;

    var bookRow = t.closest('[data-ind-key="bookmap"]');
    var indToggle = t.closest('[data-ind-toggle]');
    var indFav = t.closest('[data-ind-fav]');
    var indSec = t.closest('[data-ind-section]');
    if(bookRow && !indToggle && !indFav && !indSec){
      block(ev);
      openBookmapPanel();
      return;
    }

    if(indToggle){
      var key = indToggle.getAttribute('data-ind-toggle');
      if(OSC_KEYS.indexOf(key) >= 0 && !isOn(key) && !canEnable(key)){
        block(ev);
        limitMsg();
        return;
      }
    }

    var sw = t.closest('.dvl-switch');
    if(sw){
      var input = sw.querySelector('input[id]');
      if(input){
        var key2 = PANEL_IDS[input.id];
        if(key2 && !input.checked && !canEnable(key2)){
          block(ev);
          try{ input.checked = false; }catch(_){ }
          limitMsg();
          return;
        }
      }
    }

    var exrToggle = t.closest('[data-exr-toggle="on"]');
    if(exrToggle && !isOn('exr') && !canEnable('exr')){
      block(ev);
      limitMsg();
      return;
    }
  }, true);

  document.addEventListener('change', function(ev){
    var t = ev.target;
    if(!t || !t.id) return;
    var key = PANEL_IDS[t.id];
    if(!key) return;
    if(t.checked && activeKeys().length > LIMIT){
      try{ t.checked = false; }catch(_){ }
      setOn(key, false);
      limitMsg();
      rerenderMenu();
      drawSoonSafe();
    }
  }, true);

  function boot(){
    sanitizeActive();
    setTimeout(sanitizeActive, 300);
    setTimeout(rerenderMenu, 120);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  window.DVL_OSCILLATOR_LIMIT_0941 = {
    limit: LIMIT,
    activeKeys: activeKeys,
    canEnable: canEnable,
    sanitize: sanitizeActive,
    openBookmapPanel: openBookmapPanel,
    version: '0.941'
  };
})();
