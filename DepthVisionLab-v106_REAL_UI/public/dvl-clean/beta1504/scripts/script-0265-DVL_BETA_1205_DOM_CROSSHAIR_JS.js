(function(){
"use strict";
if(window.DVL_DOM_CROSSHAIR_1205) return;
var base=document.getElementById("chart"), wrap=document.getElementById("chartWrap");
if(!base||!wrap) return;
var root=document.getElementById("dvlCrosshairDom1205");
if(!root){
  root=document.createElement("div"); root.id="dvlCrosshairDom1205"; root.className="dvl-hidden";
  root.innerHTML='<i class="dvl-x-v"></i><i class="dvl-x-h"></i><i class="dvl-x-dot"></i><span class="dvl-x-price"></span><span class="dvl-x-time"></span>';
  base.insertAdjacentElement("afterend",root);
}
var v=root.children[0], h=root.children[1], dot=root.children[2], price=root.children[3], time=root.children[4];
var raf=0, rectCache=null, rectAt=0;
var lastCandle=-2147483648, lastTime="", lastPrice="", lastVisible=false, lastTimeWidth=56, lastPlotW=-1, lastFullBottom=-1;
var MQ=window.matchMedia("(min-width:1100px) and (hover:hover) and (pointer:fine)");
function now(){return (window.performance&&performance.now)?performance.now():Date.now();}
function active(){return !!(MQ.matches&&document.documentElement.classList.contains("dvl-desktop-pro-1179"));}
function rect(){var n=now();if(rectCache&&n-rectAt<400)return rectCache;rectCache=base.getBoundingClientRect();rectAt=n;return rectCache;}
function invalidate(){rectCache=null;}
function hide(){
  if(raf){try{cancelAnimationFrame(raf);}catch(_){}raf=0;}
  if(!lastVisible)return;
  lastVisible=false;root.classList.add("dvl-hidden");
}
function setText(el,txt,kind){
  if(kind==="price"){if(txt===lastPrice)return;lastPrice=txt;}
  else{if(txt===lastTime)return;lastTime=txt;lastTimeWidth=Math.max(56,Math.min(140,14+String(txt).length*5.6));}
  el.textContent=txt;
}
function paintFromStateNow(){
  if(raf){try{cancelAnimationFrame(raf);}catch(_){}raf=0;}
  try{
    if(!active()||typeof crosshair==="undefined"||!crosshair.visible){hide();return;}
    var r=rect(),cfg=window.__dvlLastCrossCfg;if(!cfg){hide();return;}
    var ps=(typeof PRICE_SCALE_W==="number"?PRICE_SCALE_W:55);
    var x=Math.max(0,Math.min(r.width-ps,crosshair.x||0));
    var fullBottom=(typeof dvlCrossPanelBottom==="function"?dvlCrossPanelBottom(r.height):r.height);
    var y=Math.max(0,Math.min(fullBottom,crosshair.y||0));
    if(!lastVisible){lastVisible=true;root.classList.remove("dvl-hidden");}
    var plotW=Math.max(0,r.width-ps);
    if(fullBottom!==lastFullBottom){lastFullBottom=fullBottom;v.style.height=Math.max(0,fullBottom)+"px";}
    if(plotW!==lastPlotW){lastPlotW=plotW;h.style.width=plotW+"px";}
    var rx=Math.round(x),ry=Math.round(y);
    v.style.transform="translate3d("+rx+"px,0,0)";
    h.style.transform="translate3d(0,"+ry+"px,0)";
    dot.style.transform="translate3d("+rx+"px,"+ry+"px,0)";

    var inside=y>=cfg.y0&&y<=cfg.y1;
    if(inside){
      var p=cfg.max-((y-cfg.y0)/Math.max(cfg.y1-cfg.y0,1))*(cfg.max-cfg.min);
      var pt=(typeof fmtPrice==="function"?fmtPrice(p):String(p));setText(price,pt,"price");
      var pw=Math.max(50,Math.min(75,ps-5,r.width-2));
      var px=Math.max(1,Math.min((cfg.x1||0)+2,r.width-pw-1));
      var py=Math.max((cfg.y0||0)+1,Math.min((cfg.y1||fullBottom)-23,y-11));
      price.style.width=pw+"px";
      price.style.maxWidth=pw+"px";
      price.style.display="flex";
      price.style.transform="translate3d("+Math.round(px)+"px,"+Math.round(py)+"px,0)";
    }else price.style.display="none";

    var slotRaw=((x-cfg.x0)/Math.max(cfg.x1-cfg.x0,1))*Math.max(cfg.win.totalSlots-1,1);
    var candleIdx=Math.round(slotRaw-cfg.slotOffset),tt="";
    if(candleIdx!==lastCandle){
      lastCandle=candleIdx;
      if(candleIdx>=0&&candleIdx<cfg.view.length)tt=chartDateTimeLabel(cfg.view[candleIdx].time);
      else if(candleIdx>=cfg.view.length&&cfg.view.length){
        var futureSteps=candleIdx-cfg.view.length+1;
        tt=chartDateTimeLabel(cfg.view[cfg.view.length-1].time+futureSteps*intervalMs(interval));
      }
      setText(time,tt,"time");
    }else tt=lastTime;
    if(tt){
      time.style.display="flex";
      var tw=lastTimeWidth,scaleH=(typeof dvlMainTimeScaleHeight==="function"?dvlMainTimeScaleHeight():20);
      var tx=Math.max((cfg.x0||0)+2,Math.min((cfg.x1||r.width)-tw-2,x-tw/2));
      var ty=(cfg.y1||0)+Math.max(0,(scaleH-18)/2);
      time.style.transform="translate3d("+Math.round(tx)+"px,"+Math.round(ty)+"px,0)";
    }else time.style.display="none";
  }catch(_){hide();}
}
function scheduleFromState(){if(!raf)raf=requestAnimationFrame(paintFromStateNow);}
try{new ResizeObserver(function(){invalidate();scheduleFromState();}).observe(base);}catch(_){}
window.addEventListener("resize",invalidate,{passive:true});
window.addEventListener("scroll",invalidate,{passive:true,capture:true});
window.DVL_DOM_CROSSHAIR_1205={
  version:"1.205",root:root,active:active,rect:rect,invalidate:invalidate,
  paintFromStateNow:paintFromStateNow,scheduleFromState:scheduleFromState,hide:hide
};
})();
