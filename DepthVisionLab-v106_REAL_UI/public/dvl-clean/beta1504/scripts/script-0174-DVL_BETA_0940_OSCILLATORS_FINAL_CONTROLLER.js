(function(){
  "use strict";

  var OSCS = [
    { key:"dv",  label:"Delta Volume",  api:"DVLDeltaVolume",           row:"dvlDeltaVolumeItem",     pill:"dvlDeltaVolumeState" },
    { key:"arion", label:"ARION Zone Profile", api:"DVLArionZoneProfile", row:"dvlArionItem", pill:"dvlArionState" },
    { key:"exr", label:"RSI Exhaustion Pro", api:"DVLExhaustionRSI",         row:"dvlExhaustionRSIItem",   pill:"dvlExhaustionRSIState" }
  ];

  function api(name){
    try{ return window[name] || null; }catch(_){ return null; }
  }

  function isOn(o){
    var a = api(o.api);
    try{ return !!(a && typeof a.on === "function" && a.on()); }catch(_){}
    try{ return !!(a && a.state && a.state.on); }catch(_){}
    return false;
  }

  function refreshActive(){
    OSCS.forEach(function(o){
      var a = api(o.api);
      if(!a || !isOn(o)) return;
      try{
        if(typeof a.refresh === "function") a.refresh();
        else if(typeof a.fetch === "function") a.fetch(false);
      }catch(_){}
    });
    try{ if(typeof drawSoon === "function") drawSoon(); }catch(_){}
  }

  function hookMenuRefresh(){
    if(window.__dvlOsc940MenuHooked) return;
    window.__dvlOsc940MenuHooked = true;

    document.addEventListener("click", function(ev){
      var t = ev.target;
      if(!t || !t.closest) return;
      var hit = t.closest("[data-ind-toggle], #dvlOpenInterestOscState, #dvlLongShortOscState, #dvlNetLongState, #dvlNetShortState, #dvlNetDeltaState, #dvlDeltaVolumeState, #dvlArionState, #dvlExhaustionRSIState");
      if(!hit) return;
      setTimeout(refreshActive, 90);
      setTimeout(function(){
        try{
          if(window.DVL_PHASE1B_INDICATORS_MENU_0813_API && typeof window.DVL_PHASE1B_INDICATORS_MENU_0813_API.render === "function"){
            window.DVL_PHASE1B_INDICATORS_MENU_0813_API.render();
          }
        }catch(_){}
      }, 130);
    }, true);
  }

  function rowInfo(o){
    var a = api(o.api);
    var row = document.getElementById(o.row);
    var pill = document.getElementById(o.pill);
    return {
      key:o.key,
      label:o.label,
      api:o.api,
      apiAvailable:!!a,
      on:isOn(o),
      rowAvailable:!!row,
      pillAvailable:!!pill,
      directOpenPanel:!!(a && typeof a.openPanel === "function"),
      directOpen:!!(a && typeof a.open === "function"),
      refreshAvailable:!!(a && (typeof a.refresh === "function" || typeof a.fetch === "function")),
      cacheRows:(function(){
        try{
          var c = a && a.cache;
          if(c && Array.isArray(c.data)) return c.data.length;
        }catch(_){}
        return null;
      })()
    };
  }

  function audit(){
    var rows = OSCS.map(rowInfo);
    var bounds = window.__dvlOscillatorPanelBounds || {};
    return {
      version:"0.941",
      noApiTouch:true,
      noFallbackTouch:true,
      appVersion:window.DVL_APP_VERSION || null,
      menuApiAvailable:!!window.DVL_PHASE1B_INDICATORS_MENU_0813_API,
      rows:rows,
      allDirectOpenPanel:rows.every(function(r){ return r.directOpenPanel; }),
      allRefreshable:rows.every(function(r){ return r.refreshAvailable; }),
      active:rows.filter(function(r){ return r.on; }).map(function(r){ return r.key; }),
      panelBoundsKeys:Object.keys(bounds),
      currentApiSource:window.DVL_API_STATUS && window.DVL_API_STATUS.source || null,
      currentFallback:!!(window.DVL_API_STATUS && window.DVL_API_STATUS.fallback),
      pass:rows.every(function(r){ return r.apiAvailable && r.directOpenPanel && r.refreshAvailable; })
    };
  }

  function boot(){
    hookMenuRefresh();
    setTimeout(refreshActive, 150);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_OSCILLATORS_FINAL_CONTROLLER = {
    version:"0.941",
    refreshActive:refreshActive,
    audit:audit
  };
  window.DVL_OSCILLATORS_FINAL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var os = audit();
    base.oscillatorsFinalController = os;
    base.oscillatorsFinalControllerAvailable = true;
    base.pass = !!(base.pass !== false && os.pass !== false);
    return base;
  };
})();
