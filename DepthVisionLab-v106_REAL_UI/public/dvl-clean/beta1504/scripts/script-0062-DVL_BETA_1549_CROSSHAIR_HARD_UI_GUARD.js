(function(){
"use strict";
if(window.__DVL_BETA_1549_CROSSHAIR_HARD_UI_GUARD__)return;
window.__DVL_BETA_1549_CROSSHAIR_HARD_UI_GUARD__=true;

var raf=0,lastEv=null,clearRAF=0;

function q(id){return document.getElementById(id)}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function visible(el){
  if(!el||el===document.documentElement||el===document.body)return false;
  try{
    var s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)!==0&&r.width>2&&r.height>2;
  }catch(_){return false}
}
function looksUi(el){
  if(!el)return false;
  var s=String(el.id||"")+" "+String(el.className||"")+" "+String(el.getAttribute&&el.getAttribute("role")||"");
  s=s.toLowerCase();
  return /(dvl1b|drop|dropdown|menu|list|indicator|asset|tfmore|candle|draw|panel|modal|dialog|palette|select|drawer|context|settings|numberpad|keypad|order|symbol|favorite|toolbar|header|button|toast)/.test(s);
}
function htmlUiOpen(){
  var c=String(document.documentElement.className||"").toLowerCase();
  return /\bdvl1b-[a-z0-9_-]*open\b/.test(c) || /\bmodal-open\b/.test(c) || /\bmenu-open\b/.test(c);
}
function hasOpenUi(){
  if(htmlUiOpen())return true;
  var sel=".is-open,.show,[aria-expanded='true'],[aria-hidden='false'],[data-state='open'],[data-open='true'],[open]";
  try{
    var a=document.querySelectorAll(sel);
    for(var i=0;i<a.length;i++){
      var el=a[i];
      if(!visible(el)||!looksUi(el))continue;
      if(el.id&&/^dvlCross15/.test(el.id))continue;
      if(el.id==="dvlTimeline1546")continue;
      return true;
    }
  }catch(_){}
  return false;
}
function eventOnUi(ev){
  try{
    var el=ev&&ev.target;
    if(el&&el.closest){
      if(el.closest("#chartWrap canvas,#chart"))return false;
      if(el.closest("[data-dvl-ui],#DVL_UI_OVERLAY_PHASE_1B,#dvlDesktopChartContextMenu,.dvl-drop-wrap,.dvl-drop-list,.dropdown,.dropdown-menu,.menu,.indicatorDropdown,.assetDropdown,.tfMoreMenu,.candleTypeMenu,.assetToolsMenu,.chartSettingsPanel,.dvl-vt-panel,.dvl-custom-menu,.dvl-custom-select,.dvl-custom-color,.bottomNav,.tradeDrawer,button,select,input,textarea,[role='menu'],[role='listbox'],[role='dialog']"))return true;
    }
  }catch(_){}
  try{
    var top=document.elementFromPoint(ev.clientX,ev.clientY);
    if(top&&top.closest){
      if(top.closest("#chartWrap canvas,#chart"))return false;
      if(top.closest("[data-dvl-ui],#DVL_UI_OVERLAY_PHASE_1B,#dvlDesktopChartContextMenu,.dvl-drop-wrap,.dvl-drop-list,.dropdown,.dropdown-menu,.menu,.indicatorDropdown,.assetDropdown,.tfMoreMenu,.candleTypeMenu,.assetToolsMenu,.chartSettingsPanel,.dvl-vt-panel,.dvl-custom-menu,.dvl-custom-select,.dvl-custom-color,.bottomNav,.tradeDrawer,button,select,input,textarea,[role='menu'],[role='listbox'],[role='dialog']"))return true;
    }
  }catch(_){}
  return false;
}
function inPricePanel(ev){
  var w=wrap(),cfg=window.__dvlLastCrossCfg||window.__DVL_DRAWCFG||{};
  if(!w||!ev)return false;
  var r=w.getBoundingClientRect();
  if(ev.clientX<r.left||ev.clientX>r.right)return false;
  var y=ev.clientY-r.top;
  var y0=num(cfg.y0); if(y0===null)y0=0;
  var y1=num(cfg.y1);
  if(y1===null){try{if(typeof dvlPricePanelBottom==="function")y1=Number(dvlPricePanelBottom(r.height))}catch(_){}}
  if(y1===null)y1=Math.max(0,r.height-24);
  return y>=y0&&y<=y1;
}
function blocked(ev){
  return eventOnUi(ev)||hasOpenUi()||!inPricePanel(ev);
}
function setBlocked(on){
  document.documentElement.classList.toggle("dvl-crosshair-ui-block",!!on);
}
function scheduleCanvasClear(){
  if(clearRAF)return;
  clearRAF=requestAnimationFrame(function(){
    clearRAF=0;
    try{if(typeof hideCrosshair==="function")hideCrosshair()}catch(_){}
    try{if(typeof drawSoon==="function")drawSoon();else if(typeof requestDraw==="function")requestDraw()}catch(_){}
  });
}
function hideAll(){
  setBlocked(true);
  ["dvlCross1540","dvlCross1541V","dvlCross1541H","dvlCross1541P","dvlCross1542PriceTag","dvlCross1543Tag","dvlCross1544TimeTag"].forEach(function(id){
    var e=q(id); if(e){e.style.display="none";e.style.visibility="hidden";e.style.opacity="0";}
  });
  var root=q("dvlCrosshairDom1205");
  if(root)root.classList.add("dvl-hidden");
  try{if(typeof crosshair!=="undefined"&&crosshair){crosshair.visible=false;crosshair.active=false}}catch(_){}
  try{if(window.S)S._cross=null}catch(_){}
  scheduleCanvasClear();
}
function stop(ev){
  try{ev.stopImmediatePropagation()}catch(_){}
  try{ev.stopPropagation()}catch(_){}
}
function hardMove(ev){
  lastEv=ev;
  if(blocked(ev)){hideAll();stop(ev);return}
  setBlocked(false);
}
function softHide(ev){
  lastEv=ev;
  if(blocked(ev))hideAll();
}
function tick(){
  raf=0;
  if(lastEv&&blocked(lastEv))hideAll();
}
function boot(){
  var st=document.createElement("style");
  st.id="DVL_BETA_1549_CROSSHAIR_UI_GUARD_STYLE";
  st.textContent=[
    "#dvlCross1540,#dvlCross1541V,#dvlCross1541H,#dvlCross1541P,#dvlCross1542PriceTag,#dvlCross1543Tag,#dvlCross1544TimeTag,#dvlCrosshairDom1205{z-index:90000!important}",
    "html.dvl-crosshair-ui-block #dvlCross1540,html.dvl-crosshair-ui-block #dvlCross1541V,html.dvl-crosshair-ui-block #dvlCross1541H,html.dvl-crosshair-ui-block #dvlCross1541P,html.dvl-crosshair-ui-block #dvlCross1542PriceTag,html.dvl-crosshair-ui-block #dvlCross1543Tag,html.dvl-crosshair-ui-block #dvlCross1544TimeTag,html.dvl-crosshair-ui-block #dvlCrosshairDom1205{display:none!important;visibility:hidden!important;opacity:0!important}"
  ].join("\n");
  document.head.appendChild(st);

  window.addEventListener("pointermove",hardMove,{capture:true,passive:true});
  window.addEventListener("mousemove",hardMove,{capture:true,passive:true});
  window.addEventListener("touchmove",hardMove,{capture:true,passive:true});

  window.addEventListener("pointerdown",softHide,{capture:true,passive:true});
  window.addEventListener("click",function(ev){softHide(ev);setTimeout(function(){if(hasOpenUi())hideAll()},40)},{capture:true,passive:true});
  window.addEventListener("blur",hideAll,{passive:true});

  setInterval(function(){
    if(hasOpenUi())hideAll();
    else if(lastEv&&!blocked(lastEv))setBlocked(false);
    if(!raf)raf=requestAnimationFrame(tick);
  },120);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
