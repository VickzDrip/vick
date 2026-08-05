(function(){
"use strict";
if(window.__DVL_BETA_1550_NATIVE_SCOPED_CROSSHAIR__)return;
window.__DVL_BETA_1550_NATIVE_SCOPED_CROSSHAIR__=true;

var raf=0,lastEv=null;

function q(id){return document.getElementById(id)}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function nativeCross(){try{if(typeof crosshair!=="undefined"&&crosshair)return crosshair}catch(_){}return null}
function fmtPriceSafe(v){try{if(typeof fmtPrice==="function")return fmtPrice(v)}catch(_){}return Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
function pad(v){return String(v).padStart(2,"0")}
function fmtTime(ts){var d=new Date(Number(ts));if(!Number.isFinite(d.getTime()))return "";return pad(d.getDate())+"/"+pad(d.getMonth()+1)+" "+pad(d.getHours())+":"+pad(d.getMinutes())}

function cfg(){return window.__dvlLastCrossCfg||window.__DVL_DRAWCFG||{}}

function hasOpenUi(){
  if(/\bdvl1b-[a-z0-9_-]*open\b/.test(String(document.documentElement.className||"")))return true;
  var sel=".dvl-drop-list.is-open,.assetDropdown.is-open,.tfMoreWrap.is-open,.candleTypeWrap.is-open,.fxIndicatorWrap.is-open,.assetToolsShell.is-open,.chartSettingsPanel.is-open,.dvl-vt-panel.is-open,.dvl-custom-menu.is-open,.dvl-custom-select.is-open,.dvl-custom-color.is-open,.orderTypeWrap.is-open,.tradeDrawer.is-open,#dvlDesktopChartContextMenu.is-open";
  try{return !!document.querySelector(sel)}catch(_){return false}
}
function onUi(ev){
  try{
    var t=ev&&ev.target;
    if(!t||!t.closest)return false;
    if(t.closest("#chartWrap canvas,#chart"))return false;
    return !!t.closest("[data-dvl-ui],#DVL_UI_OVERLAY_PHASE_1B,.dvl-drop-wrap,.dvl-drop-list,.assetDropdown,.tfMoreMenu,.candleTypeMenu,.indicatorDropdown,.assetToolsMenu,.chartSettingsPanel,.dvl-vt-panel,.bottomNav,.tradeDrawer,button,select,input,textarea,[role='menu'],[role='listbox'],[role='dialog']");
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

function ensure(){
  var w=wrap(); if(!w)return null;
  if(getComputedStyle(w).position==="static")w.style.position="relative";

  var st=q("DVL_BETA_1550_NATIVE_SCOPED_CROSSHAIR_STYLE");
  if(!st){
    st=document.createElement("style");
    st.id="DVL_BETA_1550_NATIVE_SCOPED_CROSSHAIR_STYLE";
    st.textContent=[
      "#chartWrap,#chartWrap canvas,#chart{cursor:crosshair!important}",
      "#dvlCross1540,#dvlCross1541V,#dvlCross1541H,#dvlCross1541P,#dvlCross1542PriceTag,#dvlCross1543Tag,#dvlCross1544TimeTag{display:none!important;visibility:hidden!important;opacity:0!important}",
      "#dvlCrosshairDom1205{z-index:92!important;pointer-events:none!important;overflow:hidden!important}",
      "#dvlCrosshairDom1205 .dvl-x-price,#dvlCrosshairDom1205 .dvl-x-time{display:none!important}",
      "#dvlCross1550Price{position:absolute;z-index:96;pointer-events:none;display:none;width:75px;height:22px;box-sizing:border-box;padding:2px 4px;text-align:center;border-radius:3px;background:#00e68a;color:#03140d;font:900 11.5px/12px system-ui;box-shadow:0 0 0 1px rgba(0,0,0,.35)}",
      "#dvlCross1550Time{position:absolute;z-index:96;pointer-events:none;display:none;height:18px;box-sizing:border-box;padding:0 7px;text-align:center;border-radius:3px;border:1px solid rgba(0,230,138,.44);background:rgba(4,12,8,.98);color:#eef8f2;font:850 9px/17px system-ui;white-space:nowrap;box-shadow:0 0 0 1px rgba(0,0,0,.28)}",
      "html.dvl-cross1550-block #dvlCrosshairDom1205,html.dvl-cross1550-block #dvlCross1550Price,html.dvl-cross1550-block #dvlCross1550Time{display:none!important;visibility:hidden!important;opacity:0!important}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function child(id){
    var e=q(id);
    if(!e){e=document.createElement("div");e.id=id;w.appendChild(e)}
    return e;
  }
  return {w:w,price:child("dvlCross1550Price"),time:child("dvlCross1550Time")};
}
function hide(){
  document.documentElement.classList.add("dvl-cross1550-block");
  ["dvlCross1550Price","dvlCross1550Time"].forEach(function(id){var e=q(id);if(e)e.style.display="none"});
  var root=q("dvlCrosshairDom1205"); if(root)root.classList.add("dvl-hidden");
  try{if(typeof crosshair!=="undefined"&&crosshair){crosshair.visible=false;crosshair.active=false}}catch(_){}
}
function priceAtY(c,y){
  var y0=num(c.y0),y1=num(c.y1),mn=num(c.min),mx=num(c.max);
  if(y0!==null&&y1!==null&&mn!==null&&mx!==null&&y1!==y0)return mx-((y-y0)/Math.max(1,y1-y0))*(mx-mn);
  return null;
}
function timeAtX(c,x,W){
  try{
    if(typeof __dvlTimelineTimeAtIndex1322==="function"&&typeof idxFromX==="function"){
      var ts=Number(__dvlTimelineTimeAtIndex1322(idxFromX(x,W)));
      if(Number.isFinite(ts))return ts;
    }
  }catch(_){}
  var v=c.view;
  if(!Array.isArray(v)||!v.length)return NaN;
  var x0=num(c.x0); if(x0===null)x0=0;
  var x1=num(c.x1); if(x1===null)x1=Math.max(1,W-80);
  var total=Number(c.win&&c.win.totalSlots)||v.length||2;
  var slot=((x-x0)/Math.max(x1-x0,1))*Math.max(total-1,1);
  var off=num(c.slotOffset); if(off===null)off=0;
  var idx=Math.round(slot-off);
  var step=60000; try{if(typeof intervalMs==="function")step=Math.max(1,Number(intervalMs(interval))||60000)}catch(_){}
  if(idx>=0&&idx<v.length)return Number(v[idx].time);
  if(idx<0)return Number(v[0].time)+idx*step;
  return Number(v[v.length-1].time)+(idx-v.length+1)*step;
}
function paint(){
  raf=0;
  var ui=ensure(),w=wrap(),c=cfg(),ch=nativeCross();
  if(!ui||!w||!ch||!ch.visible){return}
  var r=w.getBoundingClientRect();

  var y0=num(c.y0); if(y0===null)y0=0;
  var y1=num(c.y1); if(y1===null)y1=Math.max(0,r.height-24);
  var x0=num(c.x0); if(x0===null)x0=0;
  var x1=num(c.x1); if(x1===null)x1=Math.max(1,r.width-80);

  var x=clamp(num(ch.x)||0,x0,x1);
  var y=clamp(num(ch.y)||0,y0,y1);

  var root=q("dvlCrosshairDom1205");
  if(root){
    root.style.setProperty("z-index","92","important");
    var v=root.querySelector(".dvl-x-v");
    var h=root.querySelector(".dvl-x-h");
    if(v){
      var _yB=y1; try{ if(typeof dvlCrossPanelBottom==="function"){ var _cb=Number(dvlCrossPanelBottom(r.height)); if(Number.isFinite(_cb)&&_cb>_yB)_yB=_cb; } }catch(_){}
      v.style.setProperty("top",Math.round(y0)+"px","important");
      v.style.setProperty("height",Math.round(_yB-y0)+"px","important");   // vertical atravessa o painel do oscilador (RSI)
    }
    if(h)h.style.setProperty("width",Math.round(x1-x0)+"px","important");
  }

  var p=priceAtY(c,y);
  if(p!==null){
    ui.price.textContent=fmtPriceSafe(p);
    ui.price.style.left=Math.round(clamp(x1+3,0,r.width-77))+"px";
    ui.price.style.top=Math.round(clamp(y-11,y0+2,y1-24))+"px";
    ui.price.style.display="block";
    ui.price.style.visibility="visible";
    ui.price.style.opacity="1";
  }

  var ts=timeAtX(c,x,r.width);
  if(Number.isFinite(ts)){
    var txt=fmtTime(ts),tw=Math.max(72,Math.min(150,18+txt.length*5.8));
    ui.time.textContent=txt;
    ui.time.style.width=Math.round(tw)+"px";
    ui.time.style.left=Math.round(clamp(x-tw/2,x0+2,x1-tw-2))+"px";
    ui.time.style.top=Math.round(r.height-19)+"px";
    ui.time.style.display="block";
    ui.time.style.visibility="visible";
    ui.time.style.opacity="1";
  }
}
function schedule(){
  if(!raf)raf=requestAnimationFrame(function(){requestAnimationFrame(paint)});
}
function move(ev){
  lastEv=ev;
  if(blocked(ev)){hide();return}
  document.documentElement.classList.remove("dvl-cross1550-block");
  schedule();
}
function boot(){
  ensure();
  document.addEventListener("pointermove",move,{capture:true,passive:true});
  document.addEventListener("mousemove",move,{capture:true,passive:true});
  document.addEventListener("mouseleave",hide,{capture:true,passive:true});
  window.addEventListener("blur",hide,{passive:true});
  document.addEventListener("click",function(){setTimeout(function(){if(lastEv&&blocked(lastEv))hide()},40)},{capture:true,passive:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
