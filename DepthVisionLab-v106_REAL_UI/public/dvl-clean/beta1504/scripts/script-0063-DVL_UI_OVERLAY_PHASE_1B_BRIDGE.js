/* Phase 1B bridge (inline, same document): wires only SAFE controls to the
   real functions. Visual-only otherwise. No timers/observers used. */
(function(){
  "use strict";
  var root = document.getElementById("DVL_UI_OVERLAY_PHASE_1B");
  if(!root) return; /* inline UI missing -> leave old app fully visible */

  /* Only hide old chrome once the new UI is confirmed present. */
  try{ document.documentElement.classList.add("dvl-ui-1b-active"); }catch(_e){}

  function curSym(){ try{ if(typeof symbol !== "undefined" && symbol) return symbol; }catch(_e){} try{ if(window.symbol) return window.symbol; }catch(_e){} return null; }
  function fmtSym(s){ if(!s) return null; s=String(s); var i=s.indexOf("USDT"); return (i>0)? (s.slice(0,i)+"/USDT") : s; }

  /* reflect current real symbol + active timeframe */
  try{ var st=document.getElementById("dvl1b_symbolText"); var cs=fmtSym(curSym()); if(st && cs) st.textContent=cs; }catch(_e){}
  try{
    var iv=(typeof interval!=="undefined")?interval:(window.interval||null);
    if(iv){ /* TF active init — markActiveTf() handles this below */ }
  }catch(_e){}

  /* SAVE -> saveProfile() */
  var sv=document.getElementById("dvl1b_saveBtn");
  if(sv) sv.addEventListener("click", function(){
    try{ if(typeof saveProfile==="function") saveProfile(); else if(window.saveProfile) window.saveProfile(); }catch(_e){}
    try{ sv.classList.remove("dvl1b-pulse"); void sv.offsetWidth; sv.classList.add("dvl1b-pulse"); }catch(_e){}
  }, false);

  /* WATCHLIST -> toggleAssetFavorites() opens/closes the favorites panel */
  var fav=document.getElementById("dvl1b_favBtn");
  if(fav) fav.addEventListener("click", function(){
    try{ if(typeof toggleAssetFavorites==="function") toggleAssetFavorites(); else if(window.toggleAssetFavorites) window.toggleAssetFavorites(); }catch(_e){}
  }, false);

  /* ── TF scroll picker (0.713): all 13 TFs, setIntervalUi for any, scroll-into-view ── */
  var tfs=root.querySelectorAll(".dvl1b-tf");
  function markActiveTf(tf){ try{ Array.prototype.forEach.call(tfs,function(b){ b.classList.remove("is-active"); }); var a=root.querySelector('.dvl1b-tf[data-tf="'+tf+'"]'); if(a){ a.classList.add("is-active"); try{ a.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"}); }catch(_e){} } }catch(_e){} }
  Array.prototype.forEach.call(tfs, function(btn){
    btn.addEventListener("click", function(){
      var tf=btn.getAttribute("data-tf");
      if(!tf) return;
      try{ if(typeof setIntervalUi==="function") setIntervalUi(tf); else if(window.setIntervalUi) window.setIntervalUi(tf); }catch(_e){}
      markActiveTf(tf);
    }, false);
  });
  try{ var ivTf=(typeof interval!=="undefined")?interval:(window.interval||null); if(ivTf) markActiveTf(ivTf); }catch(_e){}

  /* ── Phase 2A: Velas (candle type) — custom DVL dropdown -> old setCandleMode ── */
  var cWrap=document.getElementById("dvl1b_candleWrap");
  var cBtn=document.getElementById("dvl1b_candleBtn");
  var cMenu=document.getElementById("dvl1b_candleMenu");
  var cLabel=document.getElementById("dvl1b_candleLabel");
  var CANDLE_OK={candles:1,hollow:1,heikin:1,footprint:1,renko:1};
  function candleLabelFor(m){ return ({candles:"Velas",hollow:"Hollow",heikin:"Heikin Ashi",footprint:"Footprint",renko:"Renko"})[m] || "Velas"; }
  function curCandle(){ try{ if(typeof getCandleMode==="function") return getCandleMode(); }catch(_e){} try{ if(window.getCandleMode) return window.getCandleMode(); }catch(_e){} try{ if(typeof candleMode!=="undefined") return candleMode; }catch(_e){} return null; }
  function closeCandle(){ if(cWrap) cWrap.classList.remove("is-open"); if(cBtn){ cBtn.classList.remove("dvl1b-open"); cBtn.setAttribute("aria-expanded","false"); } if(cMenu) cMenu.setAttribute("aria-hidden","true"); }
  function markCandle(){ if(!cMenu) return; var cur=curCandle(); try{ var items=cMenu.querySelectorAll(".dvl1b-menu-item"); Array.prototype.forEach.call(items,function(it){ it.classList.toggle("is-active", !it.classList.contains("is-disabled") && it.getAttribute("data-candle")===cur); }); }catch(_e){} if(cLabel && cur && CANDLE_OK[cur]) cLabel.textContent=candleLabelFor(cur); }
  function openCandle(){ if(!cWrap||!cBtn||!cMenu) return; try{ var r=cBtn.getBoundingClientRect(); cMenu.style.left=Math.round(r.left)+"px"; cMenu.style.top=Math.round(r.bottom+6)+"px"; }catch(_e){} cWrap.classList.add("is-open"); cBtn.classList.add("dvl1b-open"); cBtn.setAttribute("aria-expanded","true"); cMenu.setAttribute("aria-hidden","false"); markCandle(); }
  if(cBtn) cBtn.addEventListener("click", function(e){ e.stopPropagation(); if(cWrap && cWrap.classList.contains("is-open")) closeCandle(); else openCandle(); }, false);
  if(cMenu) cMenu.addEventListener("click", function(e){ var it=e.target&&e.target.closest?e.target.closest(".dvl1b-menu-item"):null; if(!it) return; if(it.classList.contains("is-disabled")){ return; } var m=it.getAttribute("data-candle"); if(CANDLE_OK[m]){ try{ if(typeof setCandleMode==="function") setCandleMode(m); else if(window.setCandleMode) window.setCandleMode(m); }catch(_e){} } closeCandle(); markCandle(); }, false);
  document.addEventListener("click", function(e){ if(cWrap && cWrap.classList.contains("is-open") && !cWrap.contains(e.target)) closeCandle(); }, false);

  /* ── Phase 2B: Indicators — open the OLD indicators dropdown (reuse old DOM + fns) ── */
  var indBtn=document.getElementById("dvl1b_indBtn");
  var indOpen=false;
  function indWrap(){ return document.getElementById("fxIndicatorWrap"); }
  function positionInd(){ var w=indWrap(); if(!w||!indBtn) return; try{ var r=indBtn.getBoundingClientRect(); var W=Math.min(310,Math.max(240,(window.innerWidth||360)-18)), vw=window.innerWidth||360; var left=Math.max(8, Math.min(Math.round(r.left), vw-W-8)); w.style.left=left+"px"; w.style.top=Math.round(r.bottom)+"px"; w.style.width=W+"px"; }catch(_e){} }
  function closeInd(){ indOpen=false; try{ document.documentElement.classList.remove("dvl1b-ind-open"); }catch(_e){} if(indBtn) indBtn.classList.remove("dvl1b-open"); try{ if(typeof closeIndicatorsDropdown==="function") closeIndicatorsDropdown(); else if(window.closeIndicatorsDropdown) window.closeIndicatorsDropdown(); }catch(_e){} var w=indWrap(); if(w){ w.style.left=""; w.style.top=""; w.style.width=""; } }
  function openInd(){ try{ document.documentElement.classList.add("dvl1b-ind-open"); }catch(_e){} positionInd(); try{ if(typeof openIndicatorsDropdown==="function") openIndicatorsDropdown(); else if(window.openIndicatorsDropdown) window.openIndicatorsDropdown(); }catch(_e){} if(indBtn) indBtn.classList.add("dvl1b-open"); indOpen=true; positionInd(); }
  if(indBtn) indBtn.addEventListener("click", function(e){ e.stopPropagation(); if(indOpen) closeInd(); else openInd(); }, false);
  document.addEventListener("click", function(e){ if(!indOpen) return; var w=indWrap(); var inDrop=w && w.contains(e.target); var inBtn=indBtn && indBtn.contains(e.target); if(!inDrop && !inBtn) closeInd(); }, false);

  /* ── Phase 2C: Desenhos — open the OLD drawing tools menu (reuse old DOM + fns) ── */
  var drawBtn=document.getElementById("dvl1b_drawBtn");
  var drawOpen=false;
  function drawShell(){ return document.getElementById("assetToolsShell"); }
  function positionDraw(){ var shell=drawShell(); if(!shell||!drawBtn) return; try{ var r=drawBtn.getBoundingClientRect(); var vw=window.innerWidth||360; shell.style.top=Math.round(r.bottom)+"px"; shell.style.right=Math.max(8, vw-Math.round(r.right))+"px"; shell.style.width="0"; shell.style.height="0"; }catch(_e){} }
  function closeDraw(){ drawOpen=false; try{ document.documentElement.classList.remove("dvl1b-draw-open"); }catch(_e){} if(drawBtn) drawBtn.classList.remove("dvl1b-open"); try{ if(typeof window.dvlCloseDrawToolsMenu==="function") window.dvlCloseDrawToolsMenu(); else{ var sh=drawShell(); var mn=document.getElementById("assetToolsMenu"); var gr=document.getElementById("assetToolsGear"); if(sh) sh.classList.remove("is-open"); if(mn) mn.setAttribute("aria-hidden","true"); if(gr) gr.setAttribute("aria-expanded","false"); } }catch(_e){} var sh=drawShell(); if(sh){ sh.style.top=""; sh.style.right=""; sh.style.width=""; sh.style.height=""; } }
  function openDraw(){ try{ document.documentElement.classList.add("dvl1b-draw-open"); }catch(_e){} positionDraw(); try{ var sh=drawShell(); var mn=document.getElementById("assetToolsMenu"); var gr=document.getElementById("assetToolsGear"); if(sh) sh.classList.add("is-open"); if(mn) mn.setAttribute("aria-hidden","false"); if(gr) gr.setAttribute("aria-expanded","true"); }catch(_e){} if(drawBtn) drawBtn.classList.add("dvl1b-open"); drawOpen=true; positionDraw(); }
  if(drawBtn) drawBtn.addEventListener("click", function(e){ e.stopPropagation(); if(drawOpen) closeDraw(); else openDraw(); }, false);
  document.addEventListener("click", function(e){ if(!drawOpen) return; var sh=drawShell(); var inSh=sh&&sh.contains(e.target); var inBtn=drawBtn&&drawBtn.contains(e.target); if(!inSh&&!inBtn) closeDraw(); }, false);

  /* ── Symbol button — move #assetDropdown to body to escape display:none .marketRow ── */
  (function(){
    var symBtn=document.getElementById("dvl1b_symbolBtn");
    if(!symBtn) return;
    var dvlDDOpen=false, ddHome=null;
    function getDD(){ return document.getElementById("assetDropdown"); }
    function dvlOpen(){
      var dd=getDD(); if(!dd) return;
      if(!ddHome) ddHome=dd.parentElement;
      document.body.appendChild(dd);
      try{ if(typeof openAssetDropdown==="function") openAssetDropdown();
           else if(window.openAssetDropdown) window.openAssetDropdown(); }catch(_e){}
      var _st=document.getElementById("dvl1b_symbolText"),_ns=fmtSym(curSym());
      if(_st&&_ns) _st.textContent=_ns;
      try{ if(typeof syncCurrentAssetLetterIcon==="function") syncCurrentAssetLetterIcon(curSym()||"BTCUSDT"); }catch(_){}
      var r=symBtn.getBoundingClientRect();
      var vw=window.innerWidth;
      dd.style.setProperty("position","fixed","important");
      dd.style.setProperty("top",Math.round(r.bottom+6)+"px","important");
      dd.style.setProperty("z-index","999999","important");
      if(vw<600){
        dd.style.setProperty("left","8px","important");
        dd.style.setProperty("right","8px","important");
        dd.style.setProperty("width","auto","important");
      } else {
        var left=Math.round(r.left);
        dd.style.setProperty("left",left+"px","important");
        dd.style.setProperty("right","auto","important");
        dd.style.setProperty("width","auto","important");
      }
      dvlDDOpen=true;
    }
    function dvlClose(){
      var dd=getDD();
      try{ if(typeof closeAssetDropdown==="function") closeAssetDropdown();
           else if(window.closeAssetDropdown) window.closeAssetDropdown(); }catch(_e){}
      if(dd){
        if(ddHome) ddHome.appendChild(dd);
        ["position","left","top","right","z-index","width"].forEach(function(p){ dd.style.removeProperty(p); });
      }
      dvlDDOpen=false;
    }
    symBtn.addEventListener("click",function(e){
      e.stopPropagation();
      if(dvlDDOpen) dvlClose(); else dvlOpen();
    },false);
    document.addEventListener("click",function(e){
      if(!dvlDDOpen) return;
      var dd=getDD();
      if(dd&&dd.contains(e.target)){
        if(e.target&&e.target.closest&&e.target.closest(".assetPick,.assetOption")){
          Promise.resolve().then(function(){
            var _st2=document.getElementById("dvl1b_symbolText"),_ns2=fmtSym(curSym());
            if(_st2&&_ns2) _st2.textContent=_ns2;
            try{ if(typeof syncCurrentAssetLetterIcon==="function") syncCurrentAssetLetterIcon(curSym()||"BTCUSDT"); }catch(_){}
            dvlDDOpen=false;
          });
        }
        return;
      }
      if(symBtn&&symBtn.contains(e.target)) return;
      dvlClose();
    },true);
  })();

  /* ── Settings button — open/close chart settings panel ── */
  var settBtn=document.getElementById("dvl1b_settingsBtn");
  if(settBtn) settBtn.addEventListener("click", function(e){
    e.stopPropagation();
    try{
      var isOpen=(typeof chartSettingsOpen!=="undefined")?chartSettingsOpen:(window.chartSettingsOpen||false);
      if(typeof setChartSettings==="function") setChartSettings(!isOpen);
      else if(window.setChartSettings) window.setChartSettings(!isOpen);
    }catch(_e){}
  }, false);

  /* ── TF dropdown (0.783) — self-contained, mirrors Velas pattern ── */
  (function(){
    var _tfWrap=document.getElementById("dvl1b_tfDropWrap");
    var _tfBtn=document.getElementById("dvl1b_tfDropBtn");
    if(!_tfBtn)return;
    var _tfOpen=false;
    var _tfTouch=0;

    window.dvlTfClose0783=function(){
      var menu=document.getElementById("dvl1b_tfDropMenu");
      if(_tfWrap)_tfWrap.classList.remove("is-open");
      if(_tfBtn){_tfBtn.classList.remove("dvl1b-open");_tfBtn.setAttribute("aria-expanded","false");}
      if(menu){menu.setAttribute("aria-hidden","true");menu.style.display="";}
      _tfOpen=false;
    };

    function _doOpenTf(){
      var menu=document.getElementById("dvl1b_tfDropMenu");
      if(!_tfWrap||!_tfBtn||!menu)return;
      if(typeof window.renderTfDropdown==="function")try{window.renderTfDropdown();}catch(_e){}
      try{var r=_tfBtn.getBoundingClientRect();menu.style.left=Math.round(r.left)+"px";menu.style.top=Math.round(r.bottom+6)+"px";}catch(_e){}
      _tfWrap.classList.add("is-open");
      menu.style.display="block";
      _tfBtn.classList.add("dvl1b-open");
      _tfBtn.setAttribute("aria-expanded","true");
      menu.setAttribute("aria-hidden","false");
      _tfOpen=true;
    }

    _tfBtn.addEventListener("touchend",function(e){
      _tfTouch=Date.now();
      e.preventDefault();
      e.stopPropagation();
      if(_tfOpen)window.dvlTfClose0783();else _doOpenTf();
    },{capture:false,passive:false});

    _tfBtn.addEventListener("click",function(e){
      if(Date.now()-_tfTouch<600)return;
      e.stopPropagation();
      if(_tfOpen)window.dvlTfClose0783();else _doOpenTf();
    },false);

    document.addEventListener("click",function(e){
      if(!_tfOpen)return;
      if(_tfWrap&&_tfWrap.contains(e.target))return;
      window.dvlTfClose0783();
    },false);
  })();

  /* Console helper: toggle the new UI on/off (also restores old chrome). */
  window.DVL_UI_1B_SET = function(on){
    try{
      root.style.display = on ? "" : "none";
      document.documentElement.classList.toggle("dvl-ui-1b-active", !!on);
    }catch(_e){}
  };
})();
