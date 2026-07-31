(function(){
  "use strict";
  if(window.DVL_INDICATOR_REGISTRY_STANDARDIZER_0829) return;
  window.DVL_INDICATOR_REGISTRY_STANDARDIZER_0829 = true;

  function api(){
    return window.DVLExhaustionRSI || null;
  }

  function drawSoonSafe(){
    try{ if(typeof drawSoon === "function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){}
  }

  function renderPhaseMenu(){
    try{
      var ui = window.DVL_PHASE1B_INDICATORS_MENU_0813_API;
      if(ui && typeof ui.render === "function") ui.render();
    }catch(_){}
  }

  function isOn(){
    try{
      var a = api();
      if(a && typeof a.on === "function") return !!a.on();
      if(a && a.state) return !!a.state.on;
    }catch(_){}
    return false;
  }

  function setOn(v){
    var a = api();
    if(!a) return;
    try{
      if(typeof a.setOn === "function") a.setOn(!!v);
      else if(typeof a.set === "function") a.set("on", !!v);
      else if(a.state) a.state.on = !!v;
    }catch(_){}
    updateRow();
    renderPhaseMenu();
    drawSoonSafe();
  }

  function openPanel(){
    var a = api();
    if(!a) return;
    try{
      if(typeof a.openPanel === "function") a.openPanel();
      else if(typeof a.open === "function") a.open();
    }catch(_){}
  }

  function updateRow(){
    var st = document.getElementById("dvlExhaustionRSIState");
    if(st){
      var on = isOn();
      st.textContent = on ? "ON" : "OFF";
      st.classList.toggle("is-on", on);
      st.setAttribute("aria-label", "DVL RSI Exhaustion Pro " + (on ? "ON" : "OFF"));
    }

    var row = document.getElementById("dvlExhaustionRSIItem");
    if(row){
      row.classList.toggle("is-active", isOn());
      row.classList.remove("is-soon");
    }
  }

  function insertRow(){
    var menu = document.getElementById("indicatorDropdown");
    if(!menu) return false;

    var item = document.getElementById("dvlExhaustionRSIItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlExhaustionRSIItem";
      item.className = "indicatorItem dvl-exr-indicator-item";
      item.setAttribute("data-indicator-action", "dvl-exhaustion-rsi");
      item.innerHTML = [
        '<span class="indicatorFxMark">EXR</span>',
        '<span><b>DVL RSI Exhaustion Pro</b><small>multi-TF exhaustion · escala além de 0/100</small></span>',
        '<i class="dvl-vt-state" id="dvlExhaustionRSIState">OFF</i>'
      ].join("");
    }

    /*
      Standard placement:
      volume / OI / LSR / delta / Exhaustion RSI / overlays.
      This is the real legacy Indicators table, not just the Phase 1B wrapper.
    */
    var after =
      document.getElementById("dvlDeltaVolumeItem") ||
      document.getElementById("dvlLongShortOscItem") ||
      document.getElementById("dvlOpenInterestOscItem") ||
      document.getElementById("dvlVolumeItem");

    if(after && after.parentNode === menu && after.nextSibling !== item){
      menu.insertBefore(item, after.nextSibling);
    }else if(!item.parentNode){
      var before =
        document.getElementById("dvlVolProfileItem") ||
        document.getElementById("dvlVolumeTraceItem") ||
        document.getElementById("dvlSpikeZonesItem") ||
        menu.querySelector(".indicatorItem.is-soon");
      if(before && before.parentNode === menu) menu.insertBefore(item, before);
      else{
        var head = menu.querySelector(".indicatorDropHead");
        if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling);
        else menu.appendChild(item);
      }
    }

    if(!item.dataset.dvlExr0829Bound){
      item.dataset.dvlExr0829Bound = "1";

      item.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        openPanel();
      }, true);

      var pill = item.querySelector("#dvlExhaustionRSIState");
      if(pill){
        pill.addEventListener("click", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          setOn(!isOn());
        }, true);
      }
    }

    updateRow();
    return true;
  }

  function exposeRegistry(){
    window.DVLIndicatorRegistry = window.DVLIndicatorRegistry || {};
    window.DVLIndicatorRegistry.ExhaustionRSI = {
      key:"exr",
      id:"dvlExhaustionRSIItem",
      title:"DVL Exhaustion RSI",
      api:"DVLExhaustionRSI",
      insertRow:insertRow,
      updateRow:updateRow,
      open:openPanel,
      setOn:setOn,
      on:isOn
    };
  }

  function boot(){
    exposeRegistry();
    insertRow();
    updateRow();
    renderPhaseMenu();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  }else{
    boot();
  }

  /* Beta 1.208 — no permanent document-wide observer and no 10-second retry storm.
     Retry only at the moments when the compact Indicators surface is likely to exist. */
  setTimeout(boot, 280);
  setTimeout(boot, 1100);
  try{
    var root = document.getElementById("dvl1bIndicatorMenu0813") || document.body;
    var mo = new MutationObserver(function(){
      boot();
      if(document.getElementById("dvlExhaustionRSIItem")){
        try{ mo.disconnect(); }catch(_){}
      }
    });
    if(root) mo.observe(root, {childList:true, subtree:true});
    setTimeout(function(){ try{ mo.disconnect(); }catch(_){} }, 3000);
  }catch(_){}
  document.addEventListener("click",function(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest("#dvl1bIndicatorsBtn,[data-dvl-open-indicators]"):null;
    if(b) setTimeout(boot,0);
  },true);

})();
