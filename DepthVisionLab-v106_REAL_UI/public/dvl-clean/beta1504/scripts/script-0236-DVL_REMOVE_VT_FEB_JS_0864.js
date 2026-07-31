(function(){
  "use strict";
  if(window.DVL_REMOVE_VT_FEB_0864) return;
  window.DVL_REMOVE_VT_FEB_0864 = true;

  var removedIds = [
    "dvlVolumeTraceItem",
    "dvlFebItem",
    "dvlVolumeTracePanel",
    "dvlFebPanel"
  ];

  function noop(){}
  function falseFn(){ return false; }

  function removedApi(){
    return {
      removed:true,
      on:falseFn,
      setOn:noop,
      set:noop,
      open:noop,
      openPanel:noop,
      close:noop,
      reset:noop,
      refresh:noop,
      draw:noop,
      get state(){ return { on:false, removed:true }; }
    };
  }

  function removeDom(){
    removedIds.forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function disableApis(){
    try{ window.DVLVolumeTrace = removedApi(); }catch(_){}
    try{ window.DVLVolumeTraceDraw = noop; }catch(_){}
    try{ window.DVLFlowEventBubbles = removedApi(); }catch(_){}
    try{ window.DVLFlowEventBubblesDraw = noop; }catch(_){}
  }

  function cleanupStorage(){
    try{
      var keys = [];
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(!k) continue;
        if(/volume.?trace|flow.?event.?bubbles|feb|dvl_vt/i.test(k)) keys.push(k);
      }
      keys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(_){} });
    }catch(_){}
  }

  function renderIndicators(){
    try{
      var ui = window.DVL_PHASE1B_INDICATORS_MENU_0813_API;
      if(ui && typeof ui.render === "function") ui.render();
    }catch(_){}
  }

  function hardRemove(){
    disableApis();
    removeDom();
    renderIndicators();
    try{ if(typeof drawSoon === "function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){}
  }

  function boot(){
    cleanupStorage();
    hardRemove();

    /* Beta 1.208 — removed the 80×/50 ms boot storm and body-wide observer.
       Two bounded follow-ups cover late legacy injection without scanning every DOM mutation. */
    setTimeout(hardRemove, 350);
    setTimeout(hardRemove, 1400);
    document.addEventListener("click",function(ev){
      var b=ev.target&&ev.target.closest?ev.target.closest("#dvl1bIndicatorsBtn,[data-dvl-open-indicators]"):null;
      if(b) setTimeout(hardRemove,0);
    },true);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  }else{
    boot();
  }
})();
