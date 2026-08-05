(function(){
"use strict";
if(window.__DVL_BETA_1547_CROSSHAIR_PRICE_PANEL_ONLY__)return;
window.__DVL_BETA_1547_CROSSHAIR_PRICE_PANEL_ONLY__=true;

var raf=0;

function q(id){return document.getElementById(id)}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function cfg(){return window.__dvlLastCrossCfg||window.__DVL_DRAWCFG||{}}
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

  try{if(typeof hideCrosshair==="function")hideCrosshair()}catch(_){}
}
function inPricePanel(ev){
  var w=wrap(), c=cfg();
  if(!w||!ev)return false;

  var r=w.getBoundingClientRect();
  var y=ev.clientY-r.top;

  var y0=num(c.y0); if(y0===null)y0=0;
  var y1=num(c.y1);
  if(y1===null){
    try{if(typeof dvlPricePanelBottom==="function")y1=Number(dvlPricePanelBottom(r.height))}catch(_){}
  }
  if(y1===null)y1=Math.max(0,r.height-24);

  return ev.clientX>=r.left && ev.clientX<=r.right && y>=y0 && y<=y1;
}
function clampNativeDom(){
  var w=wrap(), c=cfg(), root=q("dvlCrosshairDom1205");
  if(!w||!root)return;

  var r=w.getBoundingClientRect();
  var y0=num(c.y0); if(y0===null)y0=0;
  var y1=num(c.y1);
  if(y1===null){
    try{if(typeof dvlPricePanelBottom==="function")y1=Number(dvlPricePanelBottom(r.height))}catch(_){}
  }
  if(y1===null)y1=Math.max(0,r.height-24);

  /* Estende a linha VERTICAL até o fundo do painel do oscilador (RSI/etc.),
     se houver — assim o crosshair "atravessa" o painel inferior. A horizontal
     e o rótulo de preço seguem limitados ao painel de preço (y1). */
  var yBottom=y1;
  try{ if(typeof dvlCrossPanelBottom==="function"){ var cb=Number(dvlCrossPanelBottom(r.height)); if(Number.isFinite(cb)&&cb>yBottom) yBottom=cb; } }catch(_){}

  var h=Math.max(0,yBottom-y0);
  var v=root.querySelector(".dvl-x-v");
  var line=root.querySelector(".dvl-x-h");
  var dot=root.querySelector(".dvl-x-dot");

  if(v){
    v.style.setProperty("top",Math.round(y0)+"px","important");
    v.style.setProperty("height",Math.round(h)+"px","important");
  }
  if(line){
    line.style.setProperty("width",Math.max(0,Number(c.x1||r.width-80))+"px","important");
  }

  try{
    if(typeof crosshair!=="undefined"&&crosshair){
      var cy=num(crosshair.y);
      if(cy!==null&&(cy<y0||cy>y1)){
        root.classList.add("dvl-hidden");
        if(dot)dot.style.display="none";
      }else{
        if(dot)dot.style.display="";
      }
    }
  }catch(_){}
}
function installSetCrossGuard(){
  try{
    if(typeof window.setCrosshairFromClient!=="function")return;
    if(window.setCrosshairFromClient.__dvl1547Guard)return;

    var old=window.setCrosshairFromClient;
    var guarded=function(clientX,clientY){
      var ev={clientX:clientX,clientY:clientY};
      if(!inPricePanel(ev)){
        hideAll();
        return;
      }
      return old.apply(this,arguments);
    };
    guarded.__dvl1547Guard=true;
    window.setCrosshairFromClient=guarded;
  }catch(_){}
}
function afterMove(ev){
  if(!inPricePanel(ev)){
    hideAll();
    return;
  }
  clampNativeDom();
}
function schedule(ev){
  if(raf)return;
  raf=requestAnimationFrame(function(){
    raf=0;
    afterMove(ev);
    requestAnimationFrame(clampNativeDom);
  });
}

function boot(){
  installSetCrossGuard();
  document.addEventListener("pointermove",schedule,{capture:true,passive:true});
  document.addEventListener("pointerdown",schedule,{capture:true,passive:true});
  document.addEventListener("mouseleave",hideAll,{capture:true,passive:true});
  window.addEventListener("blur",hideAll,{passive:true});
  setInterval(function(){installSetCrossGuard();clampNativeDom()},800);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
