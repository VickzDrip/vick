(function(){
"use strict";
if(window.__DVL_BETA_1548_CROSSHAIR_UI_DROPDOWN_GUARD__)return;
window.__DVL_BETA_1548_CROSSHAIR_UI_DROPDOWN_GUARD__=true;

var raf=0,lastEv=null;

var UI_SELECTOR=[
  "[data-dvl-ui]",
  "#DVL_UI_OVERLAY_PHASE_1B",
  "#dvlDesktopChartContextMenu",
  "#indicatorDropdown",
  "#dvlTimeline1546",
  ".dvl-drop-wrap",
  ".dvl-drop-list",
  ".dvl-drop-btn",
  ".dvl-drop-item",
  ".dropdown",
  ".dropdown-menu",
  ".dropdownMenu",
  ".menu",
  ".context-menu",
  ".indicatorItem",
  ".dvl1b-menu",
  ".dvl1b-dropdown",
  ".dvl1b-list",
  ".dvl1b-symbol",
  ".dvl1b-row1",
  ".dvl1b-row2",
  ".dvlPanel",
  ".dvl-modal",
  ".modal",
  ".toast",
  ".tradeDrawer",
  ".bottomNav",
  ".chartScaleControls",
  "button",
  "select",
  "input",
  "textarea",
  "[role='menu']",
  "[role='listbox']",
  "[role='dialog']"
].join(",");

var OPEN_SELECTOR=[
  ".dvl-drop-list.is-open",
  ".dropdown.open",
  ".dropdown-menu.show",
  ".dropdownMenu.show",
  ".is-open",
  ".show",
  "[aria-expanded='true']",
  "#dvlDesktopChartContextMenu.is-open",
  "#indicatorDropdown.is-open"
].join(",");

function q(id){return document.getElementById(id)}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}

function hideAll(){
  [
    "dvlCross1541V","dvlCross1541H","dvlCross1541P",
    "dvlCross1542PriceTag",
    "dvlCross1543Tag",
    "dvlCross1544TimeTag"
  ].forEach(function(id){
    var e=q(id); if(e)e.style.display="none";
  });

  var root=q("dvlCrosshairDom1205");
  if(root)root.classList.add("dvl-hidden");

  try{
    if(typeof crosshair!=="undefined"&&crosshair){
      crosshair.visible=false;
      crosshair.active=false;
    }
  }catch(_){}

  try{if(window.S)S._cross=null}catch(_){}
}

function visible(el){
  if(!el)return false;
  try{
    var st=getComputedStyle(el);
    if(st.display==="none"||st.visibility==="hidden"||Number(st.opacity)===0)return false;
    var r=el.getBoundingClientRect();
    return r.width>1&&r.height>1;
  }catch(_){return false}
}

function hasOpenUi(){
  try{
    var list=document.querySelectorAll(OPEN_SELECTOR);
    for(var i=0;i<list.length;i++){
      var el=list[i];
      if(!visible(el))continue;
      if(el.id==="dvlTimeline1546")continue;
      if(el.id&&/^dvlCross15/.test(el.id))continue;
      return true;
    }
  }catch(_){}
  return false;
}

function eventOnUi(ev){
  try{
    var el=ev&&ev.target;
    if(el&&el.closest&&el.closest(UI_SELECTOR)){
      if(el.closest("#chartWrap canvas,#chart")) return false;
      return true;
    }
  }catch(_){}

  try{
    if(ev&&document.elementFromPoint){
      var top=document.elementFromPoint(ev.clientX,ev.clientY);
      if(top&&top.closest&&top.closest(UI_SELECTOR)){
        if(top.closest("#chartWrap canvas,#chart")) return false;
        return true;
      }
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

  if(y1===null){
    try{if(typeof dvlPricePanelBottom==="function")y1=Number(dvlPricePanelBottom(r.height))}catch(_){}
  }
  if(y1===null)y1=Math.max(0,r.height-24);

  return y>=y0&&y<=y1;
}

function shouldBlock(ev){
  if(eventOnUi(ev))return true;
  if(hasOpenUi())return true;
  if(!inPricePanel(ev))return true;
  return false;
}

function guardSetCross(){
  try{
    if(typeof window.setCrosshairFromClient!=="function")return;
    if(window.setCrosshairFromClient.__dvl1548Guard)return;

    var old=window.setCrosshairFromClient;
    var guarded=function(clientX,clientY){
      var ev={clientX:clientX,clientY:clientY,target:document.elementFromPoint(clientX,clientY)};
      if(shouldBlock(ev)){
        hideAll();
        return;
      }
      return old.apply(this,arguments);
    };
    guarded.__dvl1548Guard=true;
    window.setCrosshairFromClient=guarded;
  }catch(_){}
}

function tick(){
  raf=0;
  guardSetCross();
  if(lastEv&&shouldBlock(lastEv))hideAll();
}

function onMove(ev){
  lastEv=ev;
  if(shouldBlock(ev)){
    hideAll();
    return;
  }
  if(!raf)raf=requestAnimationFrame(tick);
}

function boot(){
  guardSetCross();

  document.addEventListener("pointermove",onMove,{capture:true,passive:true});
  document.addEventListener("pointerdown",function(ev){
    lastEv=ev;
    if(shouldBlock(ev))hideAll();
  },{capture:true,passive:true});
  document.addEventListener("mouseover",onMove,{capture:true,passive:true});
  document.addEventListener("mouseleave",hideAll,{capture:true,passive:true});
  window.addEventListener("blur",hideAll,{passive:true});

  setInterval(function(){
    guardSetCross();
    if(hasOpenUi())hideAll();
  },300);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
