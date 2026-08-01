(function(){
"use strict";
if(window.__DVL_BETA_1543_CROSSHAIR_NATIVE_PRICE_TAG__)return;
window.__DVL_BETA_1543_CROSSHAIR_NATIVE_PRICE_TAG__=true;

var raf=0,lastEv=null,hover=false;

function q(id){return document.getElementById(id)}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fmt(v){
  try{if(typeof fmtPrice==="function")return fmtPrice(v)}catch(_){}
  try{if(typeof priceFmt==="function")return priceFmt(v)}catch(_){}
  return Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function nativeCross(){
  try{if(typeof crosshair!=="undefined"&&crosshair)return crosshair}catch(_){}
  return null;
}
function ensure(){
  var st=q("DVL_BETA_1543_CROSSHAIR_TAG_STYLE");
  if(!st){
    st=document.createElement("style");
    st.id="DVL_BETA_1543_CROSSHAIR_TAG_STYLE";
    st.textContent=[
      "#chartWrap,#chartWrap canvas,#chart{cursor:crosshair!important}",
      "#dvlCross1543Tag{position:fixed;z-index:2147483647;pointer-events:none;display:none;width:75px;height:22px;box-sizing:border-box;padding:2px 4px;text-align:center;border-radius:3px;background:#00e68a;color:#03140d;font:900 11.5px/12px system-ui;box-shadow:0 0 0 1px rgba(0,0,0,.35);transform:translateZ(0)}"
    ].join("\n");
    document.head.appendChild(st);
  }
  var e=q("dvlCross1543Tag");
  if(!e){e=document.createElement("div");e.id="dvlCross1543Tag";document.body.appendChild(e)}
  return e;
}
function priceFromY1543(localY,H,cfg){
  var y0=num(cfg&&cfg.y0),y1=num(cfg&&cfg.y1),mn=num(cfg&&cfg.min),mx=num(cfg&&cfg.max);
  if(y0!==null&&y1!==null&&mn!==null&&mx!==null&&y1!==y0){
    return mx-((localY-y0)/Math.max(1,y1-y0))*(mx-mn);
  }
  try{
    if(typeof visible==="function"&&typeof scale==="function"&&typeof priceFromY==="function"){
      var sc=scale(visible().cs,H);
      var p=Number(priceFromY(localY,H,sc));
      if(Number.isFinite(p))return p;
    }
  }catch(_){}
  try{
    if(window.DVL_PRICE_SCALE_MODEL&&typeof window.DVL_PRICE_SCALE_MODEL.yToPrice==="function"){
      var p2=Number(window.DVL_PRICE_SCALE_MODEL.yToPrice(localY));
      if(Number.isFinite(p2))return p2;
    }
  }catch(_){}
  return null;
}
function paint(){
  raf=0;
  var w=wrap(),tag=ensure();
  if(!w){tag.style.display="none";return}
  var r=w.getBoundingClientRect(),cfg=window.__dvlLastCrossCfg||{},ch=nativeCross();

  if(lastEv){
    hover=lastEv.clientX>=r.left&&lastEv.clientX<=r.right&&lastEv.clientY>=r.top&&lastEv.clientY<=r.bottom;
  }
  if(!hover&&!(ch&&ch.visible)){tag.style.display="none";return}

  var y=ch&&ch.visible?num(ch.y):null;
  if(y===null&&lastEv)y=lastEv.clientY-r.top;
  if(y===null){tag.style.display="none";return}

  var y0=num(cfg.y0); if(y0===null)y0=0;
  var y1=num(cfg.y1); if(y1===null)y1=Math.max(0,r.height-24);
  y=clamp(y,y0,y1);

  var price=priceFromY1543(y,r.height,cfg);
  if(price===null){tag.style.display="none";return}

  var x1=num(cfg.x1);
  if(x1===null){
    var rp=80;try{if(typeof RP==="function")rp=Number(RP())||80}catch(_){}
    x1=Math.max(0,r.width-rp);
  }

  tag.textContent=fmt(price);
  tag.style.left=Math.round(clamp(r.left+x1+3,r.left,r.right-77))+"px";
  tag.style.top=Math.round(clamp(r.top+y-11,r.top+2,r.bottom-24))+"px";
  tag.style.display="block";
}
function schedule(){if(!raf)raf=requestAnimationFrame(paint)}
function move(ev){
  if(ev && ev.pointerType && ev.pointerType !== "mouse") return; // hover só no desktop
  lastEv=ev;
  try{window.__dvlDesktopHoverCrosshair=true}catch(_){}
  try{if(typeof setCrosshairFromClient==="function")setCrosshairFromClient(ev.clientX,ev.clientY)}catch(_){}
  schedule();
  requestAnimationFrame(schedule);
}
document.addEventListener("pointermove",move,{capture:true,passive:true});
document.addEventListener("mouseleave",function(){hover=false;var t=q("dvlCross1543Tag");if(t)t.style.display="none"},{capture:true,passive:true});
window.addEventListener("blur",function(){hover=false;var t=q("dvlCross1543Tag");if(t)t.style.display="none"},{passive:true});
ensure();
})();
