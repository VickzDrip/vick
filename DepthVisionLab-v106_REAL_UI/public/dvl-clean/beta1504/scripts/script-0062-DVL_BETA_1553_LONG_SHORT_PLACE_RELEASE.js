(function(){
  "use strict";

  if(window.DVL_BETA_1553_LONG_SHORT_PLACE_RELEASE) return;
  window.DVL_BETA_1553_LONG_SHORT_PLACE_RELEASE = true;

  var placingNow = false;
  var lastPlaceAt = 0;

  function chartWrap(){
    return document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  }

  function lsLayer(){
    return document.getElementById("dvlLsLayer") || document.querySelector(".dvl-ls-layer");
  }

  function activeMode(){
    try{
      var api = window.__dvlLongShortV2;
      var m = api && api.mode;
      if(m === "long" || m === "short") return m;
    }catch(_){}

    try{
      if(window.S){
        if(S.tool === "long" || S.tool === "short") return S.tool;
        if(S._posDraft && (S._posDraft.type === "long" || S._posDraft.type === "short")){
          return S._posDraft.type;
        }
      }
    }catch(_){}

    return "";
  }

  function insideChart(ev){
    var wrap = chartWrap();
    if(!wrap || !ev) return false;
    var r = wrap.getBoundingClientRect();
    return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  }

  function isUiTarget(t){
    if(!t || !t.closest) return false;
    return !!t.closest(
      ".assetToolsShell,.assetToolsMenu,.dvl-ls-box,.dvl-ls-controlbar,.dvl-ls-settings,.dvl-ls-entry-magnet," +
      ".dvl-pv2p-tag,.dvl-pv2p-controls,.dvl-pv2p-btn,.dvl-paper-panel," +
      ".dropdown,.menu,.popover,.modal,[role='menu'],[role='dialog'],button,input,select,textarea,a"
    );
  }

  function block(ev){
    try{ ev.preventDefault(); }catch(_){}
    try{ ev.stopPropagation(); }catch(_){}
    try{ ev.stopImmediatePropagation(); }catch(_){}
  }

  function pressLayerAt(ev){
    var layer = lsLayer();
    var api = window.__dvlLongShortV2;

    try{
      if(!layer && api && typeof api.render === "function"){
        api.render();
        layer = lsLayer();
      }
    }catch(_){}

    if(!layer) return false;

    placingNow = true;
    try{
      var E = typeof window.PointerEvent === "function" ? window.PointerEvent : window.MouseEvent;
      var pe = new E("pointerdown", {
        bubbles:true,
        cancelable:true,
        clientX:ev.clientX,
        clientY:ev.clientY,
        button:0,
        buttons:1,
        pointerId:ev.pointerId || 1,
        pointerType:ev.pointerType || "mouse"
      });
      layer.dispatchEvent(pe);
    }catch(_){
      try{
        var me = new MouseEvent("pointerdown", {
          bubbles:true,
          cancelable:true,
          clientX:ev.clientX,
          clientY:ev.clientY,
          button:0,
          buttons:1
        });
        layer.dispatchEvent(me);
      }catch(__){}
    }finally{
      placingNow = false;
    }

    return true;
  }

  function escapeStuckMode(){
    try{
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key:"Escape",
        code:"Escape",
        bubbles:true,
        cancelable:true
      }));
    }catch(_){}
  }

  function place(ev){
    if(placingNow) return;
    if(Date.now() - lastPlaceAt < 180) return;

    var mode = activeMode();
    if(mode !== "long" && mode !== "short") return;
    if(!insideChart(ev)) return;
    if(isUiTarget(ev.target)) return;

    lastPlaceAt = Date.now();

    pressLayerAt(ev);

    if(activeMode()){
      try{
        if(typeof window.__dvlCreateApprovedPosition === "function"){
          window.__dvlCreateApprovedPosition(mode, ev);
        }
      }catch(_){}
      escapeStuckMode();
    }

    try{
      if(window.S){
        if(S.tool === "long" || S.tool === "short") S.tool = null;
        if(S._posDraft && (S._posDraft.type === "long" || S._posDraft.type === "short")) S._posDraft = null;
        S.drawingToolActive = false;
      }
    }catch(_){}

    try{ if(typeof window.drawSoon === "function") window.drawSoon(); }catch(_){}
    block(ev);
  }

  function install(){
    if(document.__dvlBeta1553LsReleaseInstalled) return;
    document.__dvlBeta1553LsReleaseInstalled = true;

    document.addEventListener("pointerdown", place, {capture:true, passive:false});
    document.addEventListener("click", place, {capture:true, passive:false});
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", install, {once:true});
  }else{
    install();
  }
})();
