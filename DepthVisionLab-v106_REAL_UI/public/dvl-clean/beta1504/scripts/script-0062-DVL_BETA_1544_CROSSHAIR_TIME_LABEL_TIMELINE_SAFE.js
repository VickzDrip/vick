(function(){
"use strict";
if(window.__DVL_BETA_1544_CROSSHAIR_TIME_LABEL_TIMELINE_SAFE__)return;
window.__DVL_BETA_1544_CROSSHAIR_TIME_LABEL_TIMELINE_SAFE__=true;

var raf=0,lastEv=null,hover=false;

function q(id){return document.getElementById(id)}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function nativeCross(){try{if(typeof crosshair!=="undefined"&&crosshair)return crosshair}catch(_){}return null}

function fallbackDate(ts){
  var d=new Date(Number(ts));
  if(!Number.isFinite(d.getTime()))return "";
  var dd=String(d.getDate()).padStart(2,"0");
  var mm=String(d.getMonth()+1).padStart(2,"0");
  var hh=String(d.getHours()).padStart(2,"0");
  var mi=String(d.getMinutes()).padStart(2,"0");
  var ss=String(d.getSeconds()).padStart(2,"0");
  return dd+"/"+mm+" "+hh+":"+mi+":"+ss;
}
function fmtTime(ts){
  try{if(typeof chartDateTimeLabel==="function")return chartDateTimeLabel(ts)}catch(_){}
  return fallbackDate(ts);
}
function stepMs(){
  try{if(typeof intervalMs==="function")return Math.max(1,Number(intervalMs(interval))||60000)}catch(_){}
  return 60000;
}
function timeAtX(localX,cfg,W){
  var x0=num(cfg.x0); if(x0===null)x0=0;
  var x1=num(cfg.x1); if(x1===null)x1=Math.max(1,W-80);
  localX=clamp(localX,x0,x1);

  try{
    if(typeof __dvlTimelineTimeAtIndex1322==="function" && typeof idxFromX==="function"){
      var idx=idxFromX(localX,W);
      var ts=Number(__dvlTimelineTimeAtIndex1322(idx));
      if(Number.isFinite(ts))return ts;
    }
  }catch(_){}

  var view=cfg.view;
  if(!Array.isArray(view)||!view.length)return NaN;

  var total=1;
  try{total=Math.max(Number(cfg.win&&cfg.win.totalSlots)||view.length,2)}catch(_){total=Math.max(view.length,2)}
  var slotRaw=((localX-x0)/Math.max(x1-x0,1))*Math.max(total-1,1);
  var off=num(cfg.slotOffset); if(off===null)off=0;
  var candleIdx=Math.round(slotRaw-off);

  if(candleIdx>=0 && candleIdx<view.length){
    var t=Number(view[candleIdx].time);
    if(Number.isFinite(t))return t;
  }

  var st=stepMs();
  if(candleIdx<0){
    var first=Number(view[0].time);
    if(Number.isFinite(first))return first+candleIdx*st;
  }

  var last=Number(view[view.length-1].time);
  if(Number.isFinite(last))return last+(candleIdx-view.length+1)*st;

  return NaN;
}
function ensure(){
  var st=q("DVL_BETA_1544_TIME_LABEL_STYLE");
  if(!st){
    st=document.createElement("style");
    st.id="DVL_BETA_1544_TIME_LABEL_STYLE";
    st.textContent=[
      "#chartWrap,#chartWrap canvas,#chart{cursor:crosshair!important}",
      "#chartWrap{--dvl-timeline-clearance-1346:20px!important}",
      "#chartWrap>#dvlPermanentTimeline1324{height:20px!important;min-height:20px!important;max-height:20px!important;bottom:0!important;top:auto!important;z-index:88!important;pointer-events:none!important}",
      "#dvlCross1544TimeTag{position:fixed;z-index:2147483647;pointer-events:none;display:none;height:18px;box-sizing:border-box;padding:0 7px;text-align:center;border-radius:3px;border:1px solid rgba(0,230,138,.44);background:rgba(4,12,8,.98);color:#eef8f2;font:850 9px/17px system-ui;white-space:nowrap;box-shadow:0 0 0 1px rgba(0,0,0,.28);transform:translateZ(0)}"
    ].join("\n");
    document.head.appendChild(st);
  }

  var e=q("dvlCross1544TimeTag");
  if(!e){e=document.createElement("div");e.id="dvlCross1544TimeTag";document.body.appendChild(e)}
  return e;
}
function syncTimeline(){
  try{
    var t=q("dvlPermanentTimeline1324");
    if(t){
      t.style.setProperty("height","20px","important");
      t.style.setProperty("min-height","20px","important");
      t.style.setProperty("max-height","20px","important");
      t.style.setProperty("bottom","0","important");
      t.style.setProperty("top","auto","important");
    }
  }catch(_){}
}
function paint(){
  raf=0;
  var w=wrap(),tag=ensure();
  syncTimeline();

  if(!w){tag.style.display="none";return}
  var r=w.getBoundingClientRect(),cfg=window.__dvlLastCrossCfg||{},ch=nativeCross();

  if(lastEv){
    hover=lastEv.clientX>=r.left&&lastEv.clientX<=r.right&&lastEv.clientY>=r.top&&lastEv.clientY<=r.bottom;
  }
  if(!hover&&!(ch&&ch.visible)){tag.style.display="none";return}

  var x=ch&&ch.visible?num(ch.x):null;
  if(x===null&&lastEv)x=lastEv.clientX-r.left;
  if(x===null){tag.style.display="none";return}

  var x0=num(cfg.x0); if(x0===null)x0=0;
  var x1=num(cfg.x1); if(x1===null)x1=Math.max(1,r.width-80);
  x=clamp(x,x0,x1);

  var ts=timeAtX(x,cfg,r.width);
  if(!Number.isFinite(ts)){tag.style.display="none";return}

  var txt=fmtTime(ts);
  if(!txt){tag.style.display="none";return}

  tag.textContent=txt;
  var tw=Math.max(70,Math.min(160,18+String(txt).length*5.8));
  tag.style.width=Math.round(tw)+"px";

  var left=clamp(r.left+x-tw/2,r.left+2,r.left+x1-tw-2);
  var top=r.bottom-19;

  tag.style.left=Math.round(left)+"px";
  tag.style.top=Math.round(top)+"px";
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
document.addEventListener("mouseleave",function(){hover=false;var t=q("dvlCross1544TimeTag");if(t)t.style.display="none"},{capture:true,passive:true});
window.addEventListener("blur",function(){hover=false;var t=q("dvlCross1544TimeTag");if(t)t.style.display="none"},{passive:true});
window.addEventListener("resize",function(){syncTimeline();schedule()},{passive:true});
ensure();syncTimeline();setTimeout(syncTimeline,300);setTimeout(syncTimeline,1200);
})();
