(function(){
"use strict";
if(window.__DVL_BETA_1551_REARM_NATIVE_CROSSHAIR__)return;
window.__DVL_BETA_1551_REARM_NATIVE_CROSSHAIR__=true;

var raf=0,lastEv=null;

function q(id){return document.getElementById(id)}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function cfg(){return window.__dvlLastCrossCfg||window.__DVL_DRAWCFG||{}}

function hasOpenUi(){
  if(/\bdvl1b-[a-z0-9_-]*open\b/.test(String(document.documentElement.className||"")))return true;
  try{
    return !!document.querySelector(".dvl-drop-list.is-open,.assetDropdown.is-open,.tfMoreWrap.is-open,.candleTypeWrap.is-open,.fxIndicatorWrap.is-open,.assetToolsShell.is-open,.chartSettingsPanel.is-open,.dvl-vt-panel.is-open,.tradeDrawer.is-open,#dvlDesktopChartContextMenu.is-open");
  }catch(_){return false}
}
function onUi(ev){
  try{
    var t=ev&&ev.target;
    if(!t||!t.closest)return false;
    if(t.closest("#chartWrap canvas,#chart"))return false;
    return !!t.closest("[data-dvl-ui],#DVL_UI_OVERLAY_PHASE_1B,.bottomNav,.tradeDrawer,button,select,input,textarea,[role='menu'],[role='listbox'],[role='dialog']");
  }catch(_){return false}
}
function inPricePanel(ev){
  var w=wrap(),c=cfg(); if(!w||!ev)return false;
  var r=w.getBoundingClientRect();
  if(ev.clientX<r.left||ev.clientX>r.right)return false;
  var y=ev.clientY-r.top;
  var y0=num(c.y0); if(y0===null)y0=0;
  var y1=num(c.y1);
  if(y1===null){try{if(typeof dvlPricePanelBottom==="function")y1=Number(dvlPricePanelBottom(r.height))}catch(_){}}
  if(y1===null)y1=Math.max(0,r.height-24);
  return y>=y0&&y<=y1;
}
function blocked(ev){return hasOpenUi()||onUi(ev)||!inPricePanel(ev)}

function hide(){
  document.documentElement.classList.add("dvl-cross1550-block");
  var root=q("dvlCrosshairDom1205"); if(root)root.classList.add("dvl-hidden");
  ["dvlCross1550Price","dvlCross1550Time"].forEach(function(id){var e=q(id);if(e)e.style.display="none"});
  try{if(typeof crosshair!=="undefined"&&crosshair){crosshair.visible=false;crosshair.active=false}}catch(_){}
}
function ensure(){
  var w=wrap(); if(!w)return null;
  if(getComputedStyle(w).position==="static")w.style.position="relative";

  var st=q("DVL_BETA_1551_CROSSHAIR_STYLE");
  if(!st){
    st=document.createElement("style");
    st.id="DVL_BETA_1551_CROSSHAIR_STYLE";
    st.textContent=[
      "#dvlCrosshairDom1205{z-index:92!important;pointer-events:none!important;overflow:hidden!important}",
      "#dvlCross1550Price,#dvlCross1550Time{z-index:96!important;pointer-events:none!important}",
      "#dvlCrosshairDom1205 .dvl-x-price,#dvlCrosshairDom1205 .dvl-x-time{display:none!important}"
    ].join("\n");
    document.head.appendChild(st);
  }
  return w;
}
function rearm(ev){
  try{window.__dvlDesktopHoverCrosshair=true}catch(_){}
  try{if(typeof setCrosshairFromClient==="function")setCrosshairFromClient(ev.clientX,ev.clientY)}catch(_){}
}
function clampNative(){
  var w=ensure(),c=cfg(),root=q("dvlCrosshairDom1205");
  if(!w||!root)return;
  var r=w.getBoundingClientRect();

  var y0=num(c.y0); if(y0===null)y0=0;
  var y1=num(c.y1); if(y1===null)y1=Math.max(0,r.height-24);
  var x1=num(c.x1); if(x1===null)x1=Math.max(1,r.width-80);

  root.classList.remove("dvl-hidden");
  root.style.setProperty("z-index","92","important");

  var v=root.querySelector(".dvl-x-v");
  var h=root.querySelector(".dvl-x-h");
  if(v){
    v.style.setProperty("top",Math.round(y0)+"px","important");
    v.style.setProperty("height",Math.round(y1-y0)+"px","important");
  }
  if(h)h.style.setProperty("width",Math.round(x1)+"px","important");
}
function paint(){
  raf=0;
  if(lastEv&&blocked(lastEv)){hide();return}
  document.documentElement.classList.remove("dvl-cross1550-block");
  clampNative();
}
function move(ev){
  lastEv=ev;
  if(blocked(ev)){hide();return}
  document.documentElement.classList.remove("dvl-cross1550-block");
  rearm(ev);
  if(!raf)raf=requestAnimationFrame(function(){requestAnimationFrame(paint)});
}
function boot(){
  ensure();
  document.addEventListener("pointermove",move,{capture:true,passive:true});
  document.addEventListener("mousemove",move,{capture:true,passive:true});
  document.addEventListener("mouseleave",hide,{capture:true,passive:true});
  window.addEventListener("blur",hide,{passive:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
