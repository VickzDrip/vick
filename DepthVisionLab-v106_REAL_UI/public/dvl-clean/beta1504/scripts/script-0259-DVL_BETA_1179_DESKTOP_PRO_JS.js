(function(){
  "use strict";
  if(window.DVL_DESKTOP_PRO_1179) return;

  var MQ = window.matchMedia("(min-width:1100px) and (hover:hover) and (pointer:fine)");
  var PANEL_KEY = "DVL_DESKTOP_PANEL_WIDTH_1179";
  var resizeState = null;
  var hoverRAF = 0;
  var lastCursorMode = "";
  var _dvlLastHoverEv = null;
  function _dvlHoverFlush(){ hoverRAF = 0; var e = _dvlLastHoverEv; if(e) { try{ onHover(e); }catch(_){} } }
  /* Beta 1.197 — one rect read for the whole hover event. Previously
     updateCursor() + priceScaleHit() + timeScaleHit() + crosshair each called
     getBoundingClientRect(), forcing multiple synchronous layouts per mousemove. */
  var __dvlDesktopRectCache = null, __dvlDesktopRectAt = 0;
  function desktopRect(c){
    var now=(window.performance&&performance.now)?performance.now():Date.now();
    if(__dvlDesktopRectCache && now-__dvlDesktopRectAt<250) return __dvlDesktopRectCache;
    __dvlDesktopRectCache=c.getBoundingClientRect();
    __dvlDesktopRectAt=now;
    return __dvlDesktopRectCache;
  }
  function invalidateDesktopRect(){ __dvlDesktopRectCache=null; }

  function active(){ return !!MQ.matches; }
  function canvas(){ return document.getElementById("chart"); }
  function isEditableTarget(t){
    return !!(t && (t.closest && t.closest("input,textarea,select,[contenteditable='true']")));
  }
  function localY(ev,c){ var r=desktopRect(c); return ev.clientY-r.top; }
  function inOscillatorPanel(ev,c){
    try{
      var y=localY(ev,c), b=window.__dvlOscillatorPanelBounds||{};
      return Object.keys(b).some(function(k){
        var p=b[k]||{};
        var top=Number(p.top), bottom=Number(p.bottom);
        if(!Number.isFinite(bottom) && Number.isFinite(top) && Number.isFinite(Number(p.h))) bottom=top+Number(p.h);
        return Number.isFinite(top)&&Number.isFinite(bottom)&&y>=top&&y<=bottom;
      });
    }catch(_){ return false; }
  }
  function priceScaleHit(ev,c){
    var r=desktopRect(c);
    var w=(typeof window.DVL_PRICE_SCALE_W==="number"?window.DVL_PRICE_SCALE_W:70);
    return ev.clientX>=r.right-w;
  }
  function timeScaleHit(ev,c){
    var r=desktopRect(c);
    var h=24;
    try{ if(typeof dvlMainTimeScaleHeight==="function") h=Math.max(20,Number(dvlMainTimeScaleHeight())||24); }catch(_){ }
    return ev.clientY>=r.bottom-h;
  }
  function requestDraw(){ try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){ } }
  function clampView(){ try{ if(typeof clampChartViewport==="function") clampChartViewport(); }catch(_){ } }

  function installWidth(){
    try{
      var v=parseInt(localStorage.getItem(PANEL_KEY)||"",10);
      if(Number.isFinite(v)) document.documentElement.style.setProperty("--dvl-desktop-panel-w",Math.max(340,Math.min(680,v))+"px");
    }catch(_){ }
  }

  function ensureResizeHandles(){
    if(!active()) return;
    ["dvlCopilotPage0974","dvlScannerPanel0780","dvlPositionsPanelV2","dvlWatchlistPanel","tradeDrawer"].forEach(function(id){
      var p=document.getElementById(id);
      if(!p || p.querySelector(":scope > .dvlDesktopPanelResizeHandle")) return;
      var h=document.createElement("div");
      h.className="dvlDesktopPanelResizeHandle";
      h.setAttribute("aria-hidden","true");
      h.addEventListener("pointerdown",function(ev){
        if(!active()) return;
        ev.preventDefault(); ev.stopPropagation();
        resizeState={id:ev.pointerId};
        try{ h.setPointerCapture(ev.pointerId); }catch(_){ }
        document.body.classList.add("dvl-desktop-panel-resizing");
      },{passive:false});
      h.addEventListener("pointermove",function(ev){
        if(!resizeState || resizeState.id!==ev.pointerId) return;
        var w=Math.max(340,Math.min(680,window.innerWidth-ev.clientX));
        document.documentElement.style.setProperty("--dvl-desktop-panel-w",w+"px");
        try{ localStorage.setItem(PANEL_KEY,String(Math.round(w))); }catch(_){ }
        requestDraw();
      },{passive:true});
      function end(ev){
        if(!resizeState || resizeState.id!==ev.pointerId) return;
        resizeState=null;
        document.body.classList.remove("dvl-desktop-panel-resizing");
      }
      h.addEventListener("pointerup",end,{passive:true});
      h.addEventListener("pointercancel",end,{passive:true});
      p.prepend(h);
    });
  }

  /* Beta 1.211 — Desktop Pro owns wheel in capture phase and calls
     stopImmediatePropagation(), so setupChartInteractions() never receives the
     desktop wheel. The old interaction flag therefore stayed false during wheel
     zoom, keeping full DPR/glow and forcing visible-range calculations every
     notch. Own the complete interaction lifetime here. */
  var __dvlDesktopWheelEnd1211=0;
  function __dvlDesktopWheelInteracting1211(){
    window.__dvlChartInteracting=true;
    if(__dvlDesktopWheelEnd1211){ clearTimeout(__dvlDesktopWheelEnd1211); __dvlDesktopWheelEnd1211=0; }
    __dvlDesktopWheelEnd1211=setTimeout(function(){
      __dvlDesktopWheelEnd1211=0;
      var pointerBusy=false;
      try{
        pointerBusy=!!(
          (typeof chartDragState!=="undefined" && chartDragState) ||
          (typeof chartPinchState!=="undefined" && chartPinchState) ||
          (typeof chartPointers!=="undefined" && chartPointers && chartPointers.size)
        );
      }catch(_){}
      /* Do not release a pointer gesture that started while the wheel debounce
         was pending. The pointer owner will finish the interaction itself. */
      if(pointerBusy) return;
      window.__dvlChartInteracting=false;
      requestDraw();
    },160);
  }
  try{ window.addEventListener("blur",function(){
    if(__dvlDesktopWheelEnd1211){ clearTimeout(__dvlDesktopWheelEnd1211); __dvlDesktopWheelEnd1211=0; }
    if(window.__dvlChartInteracting){ window.__dvlChartInteracting=false; requestDraw(); }
  },{passive:true}); }catch(_){}

  function normalizeWheel(ev){
    var d=Number(ev.deltaY)||Number(ev.deltaX)||0;
    if(ev.deltaMode===1) d*=16;
    else if(ev.deltaMode===2) d*=window.innerHeight;
    return Math.max(-260,Math.min(260,d));
  }

  function onWheel(ev){
    if(!active()) return;
    var c=canvas();
    if(!c || !ev.composedPath().includes(c)) return;
    if(inOscillatorPanel(ev,c)) return; // each oscillator keeps its own scale logic
    if(window.__dvlPaperGestureActive||window.__dvlPaperDragLock||window.__dvlPositionDragActive) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    __dvlDesktopWheelInteracting1211();
    var d=normalizeWheel(ev);

    try{
      if(ev.shiftKey){
        var r=desktopRect(c);
        var scale=(typeof window.DVL_PRICE_SCALE_W==="number"?window.DVL_PRICE_SCALE_W:70);
        var count=(typeof chartViewCount==="number"?chartViewCount:140);
        var spacing=Math.max(.25,(r.width-scale)/Math.max(1,count-1));
        chartOffsetCandles -= d/spacing;
        clampView(); requestDraw();
        return;
      }

      var factor=Math.exp(d*.00115);
      factor=Math.max(.72,Math.min(1.38,factor));
      if(priceScaleHit(ev,c) || ev.altKey){
        if(typeof zoomPriceScaleAt==="function") zoomPriceScaleAt(ev.clientY,factor);
      }else if(typeof zoomChartAt==="function"){
        zoomChartAt(ev.clientX,factor);
      }
    }catch(_){ }
  }

  function hoverZone(ev,c){
    var r=desktopRect(c);
    var scaleW=(typeof window.DVL_PRICE_SCALE_W==="number"?window.DVL_PRICE_SCALE_W:70);
    var onPrice=ev.clientX>=r.right-scaleW;
    var scaleH=24;
    try{ if(typeof dvlMainTimeScaleHeight==="function") scaleH=Math.max(20,Number(dvlMainTimeScaleHeight())||24); }catch(_){ }
    var onTime=!onPrice && ev.clientY>=r.bottom-scaleH;
    return {onPrice:onPrice,onTime:onTime};
  }

  function applyCursorMode(mode){
    if(mode===lastCursorMode) return;
    lastCursorMode=mode;
    document.body.classList.toggle("dvl-desktop-price-scale",mode==="price");
    document.body.classList.toggle("dvl-desktop-time-scale",mode==="time");
  }

  function onHover(ev){
    if(!active() || ev.pointerType!=="mouse") return;
    var c=canvas(); if(!c) return;
    var zone=hoverZone(ev,c);
    var cachedRect=desktopRect(c);
    var onDivider=false;
    try{
      var divApi=window.DVL_OSC_DIVIDER_RELEASE_1184;
      if(divApi && typeof divApi.hoverFromDesktop==="function") onDivider=!!divApi.hoverFromDesktop(ev,cachedRect);
    }catch(_){}
    applyCursorMode(zone.onPrice?"price":(zone.onTime?"time":"chart"));
    if(ev.buttons!==0 || zone.onPrice || onDivider) return;

    try{
      window.__dvlDesktopHoverCrosshair=true;
      if(typeof setCrosshairFromClient==="function") setCrosshairFromClient(ev.clientX,ev.clientY);

      /* Drawing preview shares this SAME coalesced hover frame. No extra
         mousemove/pointermove listeners and no second coordinate read. */
      if(typeof dvlDrawingModeActive==="function" && dvlDrawingModeActive()){
        if(typeof window.DVL_APPROVED_DRAWING_HOVER_1205==="function"){
          window.DVL_APPROVED_DRAWING_HOVER_1205(ev.clientX,ev.clientY);
        }
      }
    }catch(_){ }
  }

  function clearHover(){
    lastCursorMode="";
    document.body.classList.remove("dvl-desktop-price-scale","dvl-desktop-time-scale","dvl-desktop-chart-dragging");
    try{ if(!window.__dvlDesktopCrosshairPinned && typeof hideCrosshair==="function") hideCrosshair(); }catch(_){ }
  }

  function autoFit(){
    try{ if(typeof autoScaleCurrent20==="function") autoScaleCurrent20(); }catch(_){ }
  }
  function resetTime(){
    try{
      chartViewCount=140;
      chartOffsetCandles=-24;
      clampView(); requestDraw();
    }catch(_){ }
  }
  function goLive(){
    try{ chartOffsetCandles=-24; clampView(); requestDraw(); }catch(_){ }
  }

  function ensureContextMenu(){
    var m=document.getElementById("dvlDesktopChartContextMenu");
    if(m) return m;
    m=document.createElement("div");
    m.id="dvlDesktopChartContextMenu";
    m.setAttribute("data-dvl-ui","true");
    m.innerHTML=''
      +'<button type="button" data-act="fit"><span>Auto-enquadrar preço</span><kbd>Duplo clique</kbd></button>'
      +'<button type="button" data-act="live"><span>Voltar ao preço atual</span><kbd>Home</kbd></button>'
      +'<button type="button" data-act="reset"><span>Resetar zoom do tempo</span><kbd>Alt+R</kbd></button>'
      +'<button type="button" data-act="undo"><span>Desfazer</span><kbd>Ctrl+Z</kbd></button>'
      +'<button type="button" data-act="redo"><span>Refazer</span><kbd>Ctrl+Y</kbd></button>';
    m.addEventListener("click",function(ev){
      var b=ev.target.closest("button[data-act]"); if(!b) return;
      var a=b.getAttribute("data-act");
      if(a==="fit") autoFit();
      if(a==="live") goLive();
      if(a==="reset") resetTime();
      if(a==="undo") try{ if(typeof window.__dvlUndo==="function") window.__dvlUndo(); }catch(_){ }
      if(a==="redo") try{ if(typeof window.__dvlRedo==="function") window.__dvlRedo(); }catch(_){ }
      closeContext();
    });
    document.body.appendChild(m);
    return m;
  }
  function closeContext(){ var m=document.getElementById("dvlDesktopChartContextMenu"); if(m) m.classList.remove("is-open"); }
  function openContext(ev){
    if(!active()) return;
    var c=canvas(); if(!c) return;
    ev.preventDefault(); ev.stopPropagation();
    var m=ensureContextMenu();
    var mw=220,mh=190;
    m.style.left=Math.max(8,Math.min(window.innerWidth-mw-8,ev.clientX))+"px";
    m.style.top=Math.max(8,Math.min(window.innerHeight-mh-8,ev.clientY))+"px";
    m.classList.add("is-open");
  }

  function showHint(){
    if(!active() || document.getElementById("dvlDesktopMouseHint")) return;
    var h=document.createElement("div");
    h.id="dvlDesktopMouseHint";
    h.textContent="Roda: zoom · Shift+roda: tempo · arrastar: mover · botão direito: menu";
    document.body.appendChild(h);
    requestAnimationFrame(function(){ h.classList.add("is-showing"); });
    setTimeout(function(){ h.classList.remove("is-showing"); },6500);
    setTimeout(function(){ try{ h.remove(); }catch(_){ } },7200);
  }

  function bind(){
    var c=canvas();
    if(!c || c.dataset.dvlDesktop1179Bound) return;
    c.dataset.dvlDesktop1179Bound="1";
    window.__dvlDesktopHoverCrosshair=true;
    try{ window.addEventListener("resize",invalidateDesktopRect,{passive:true}); }catch(_){ }
    try{ window.addEventListener("scroll",invalidateDesktopRect,{passive:true,capture:true}); }catch(_){ }
    try{ if(window.ResizeObserver) new ResizeObserver(invalidateDesktopRect).observe(c); }catch(_){ }

    window.addEventListener("wheel",onWheel,{capture:true,passive:false});
    /* Beta 1.199 — COALESCE o hover em rAF. onHover roda o cursor + crosshair,
       e o pointermove dispara na TAXA DO MOUSE (mouse gamer = até 1000 eventos/s),
       NÃO nos 60fps da tela. Rodar isso 1000x/s (cada um mexendo classes/estado)
       era o "algo sendo reescrito" que travava só ao mover o mouse. O hoverRAF já
       existia pra isso mas nunca foi ligado — agora processamos no máximo 1 evento
       por frame, usando o último. O crosshair continua acompanhando (60fps). */
    c.addEventListener("pointermove", function(ev){
      _dvlLastHoverEv = ev;
      if(!hoverRAF) hoverRAF = requestAnimationFrame(_dvlHoverFlush);
    }, {passive:true});
    c.addEventListener("pointerleave",function(){
      if(hoverRAF){ try{ cancelAnimationFrame(hoverRAF); }catch(_){ } hoverRAF=0; }
      _dvlLastHoverEv=null;
      clearHover();
    },{passive:true});
    c.addEventListener("pointerdown",function(ev){
      if(active()&&ev.pointerType==="mouse"&&ev.button===0) document.body.classList.add("dvl-desktop-chart-dragging");
      closeContext();
    },{passive:true});
    window.addEventListener("pointerup",function(){ document.body.classList.remove("dvl-desktop-chart-dragging"); },{passive:true});
    c.addEventListener("dblclick",function(ev){
      if(!active()) return;
      ev.preventDefault();
      if(priceScaleHit(ev,c) || timeScaleHit(ev,c)) autoFit();
      else autoFit();
    },{passive:false});
    c.addEventListener("contextmenu",openContext,{passive:false});

    document.addEventListener("pointerdown",function(ev){
      if(!ev.target.closest || !ev.target.closest("#dvlDesktopChartContextMenu")) closeContext();
    },{capture:true,passive:true});

    document.addEventListener("keydown",function(ev){
      if(!active() || isEditableTarget(ev.target)) return;
      if(ev.key==="Escape"){
        closeContext();
        try{ if(typeof hideCrosshair==="function") hideCrosshair(); }catch(_){ }
      }else if(ev.key==="Delete"){
        var del=document.getElementById("dvlDrawDelete");
        if(del && getComputedStyle(del).display!=="none") del.click();
      }else if(ev.key==="Home"){
        ev.preventDefault(); goLive();
      }else if(ev.altKey && String(ev.key).toLowerCase()==="r"){
        ev.preventDefault(); resetTime();
      }
    });
  }

  function enhanceNavTitles(){
    document.querySelectorAll("#dvlBottomNavV2 .dvlNavV2Btn").forEach(function(b){
      var s=b.querySelector("span"); if(s&&!b.title) b.title=s.textContent.trim();
    });
  }

  function init(){
    if(!active()) return;
    document.documentElement.classList.add("dvl-desktop-pro-1179");
    installWidth();
    bind();
    ensureResizeHandles();
    enhanceNavTitles();
    showHint();
    requestDraw();
  }

  var __dvlDesktopMoRAF=0;
  var mo=new MutationObserver(function(){
    if(!active() || __dvlDesktopMoRAF) return;
    __dvlDesktopMoRAF=requestAnimationFrame(function(){
      __dvlDesktopMoRAF=0;
      ensureResizeHandles();
      enhanceNavTitles();
    });
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  MQ.addEventListener && MQ.addEventListener("change",function(){ if(MQ.matches) init(); else clearHover(); });

  window.DVL_DESKTOP_PRO_1179={
    version:"1.181",
    init:init,
    resetTimeZoom:resetTime,
    autoFit:autoFit,
    goLive:goLive,
    audit:function(){
      return {
        active:active(),
        headerHeight:getComputedStyle(document.documentElement).getPropertyValue("--dvl-desktop-header-h").trim(),
        railFound:!!document.getElementById("dvlBottomNavV2"),
        canvasBound:!!(canvas()&&canvas().dataset.dvlDesktop1179Bound),
        hoverCrosshair:!!window.__dvlDesktopHoverCrosshair,
        contextMenu:!!document.getElementById("dvlDesktopChartContextMenu"),
        resizeHandles:document.querySelectorAll(".dvlDesktopPanelResizeHandle").length
      };
    }
  };
})();
