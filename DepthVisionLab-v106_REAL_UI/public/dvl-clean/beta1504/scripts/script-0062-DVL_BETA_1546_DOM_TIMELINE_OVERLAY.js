(function(){
"use strict";
if(window.__DVL_BETA_1546_DOM_TIMELINE_OVERLAY__)return;
window.__DVL_BETA_1546_DOM_TIMELINE_OVERLAY__=true;

var raf=0,lastSig="";

function q(id){return document.getElementById(id)}
function wrap(){return q("chartWrap")||document.querySelector(".canvasWrap")||document.querySelector(".chartWrap")}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function pad(v){return String(v).padStart(2,"0")}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function isDaily(){try{return interval==="1d"||interval==="3d"||interval==="1w"}catch(_){return false}}
function dayKey(ts){var d=new Date(ts);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function fmt(ts,withDate){
  var d=new Date(Number(ts));
  if(!Number.isFinite(d.getTime()))return "";
  var dd=pad(d.getDate()),mm=pad(d.getMonth()+1),hh=pad(d.getHours()),mi=pad(d.getMinutes());
  if(isDaily())return dd+"/"+mm;
  return withDate ? dd+"/"+mm+" "+hh+":"+mi : hh+":"+mi;
}
function win(){
  try{if(typeof visibleWindow==="function")return visibleWindow()}catch(_){}
  return null;
}
function timeAtIndex(idx){
  try{
    if(typeof __dvlTimelineTimeAtIndex1322==="function"){
      var t=Number(__dvlTimelineTimeAtIndex1322(idx));
      if(Number.isFinite(t))return t;
    }
  }catch(_){}

  try{
    var arr=Array.isArray(klines)?klines:[];
    if(!arr.length)return NaN;
    var step=60000;
    try{if(typeof intervalMs==="function")step=Math.max(1,Number(intervalMs(interval))||60000)}catch(_){}
    var last=arr.length-1;

    if(idx<=0){
      var first=Number(arr[0]&&(arr[0].time||arr[0].t));
      return Number.isFinite(first)?first+idx*step:NaN;
    }
    if(idx>=last){
      var end=Number(arr[last]&&(arr[last].time||arr[last].t));
      return Number.isFinite(end)?end+(idx-last)*step:NaN;
    }

    var lo=Math.max(0,Math.min(last,Math.floor(idx)));
    var hi=Math.max(0,Math.min(last,lo+1));
    var f=Math.max(0,Math.min(1,idx-lo));
    var a=Number(arr[lo]&&(arr[lo].time||arr[lo].t));
    var b=Number(arr[hi]&&(arr[hi].time||arr[hi].t));
    if(Number.isFinite(a)&&Number.isFinite(b)&&b>a)return a+(b-a)*f;
    if(Number.isFinite(a))return a+f*step;
  }catch(_){}

  return NaN;
}
function plotRight(W){
  var cfg=window.__dvlLastCrossCfg||window.__DVL_DRAWCFG||{};
  var x1=num(cfg.x1);
  if(x1!==null&&x1>40&&x1<W)return x1;
  try{if(typeof RP==="function")return Math.max(1,W-(Number(RP())||80))}catch(_){}
  return Math.max(1,W-80);
}
function globalIndexForSlot(wi,slot){
  var left=num(wi&&wi.leftEdgeIndex);
  if(left!==null)return left+slot;

  var start=num(wi&&wi.start); if(start===null)start=0;
  var off=0;
  try{if(typeof __dvlSlotOffset==="function")off=Number(__dvlSlotOffset(wi,(wi&&wi.candles)||[]))||0}catch(_){}
  return start+(slot-off);
}
function ensure(){
  var st=q("DVL_BETA_1546_DOM_TIMELINE_STYLE");
  if(!st){
    st=document.createElement("style");
    st.id="DVL_BETA_1546_DOM_TIMELINE_STYLE";
    st.textContent=[
      "#dvlTimeline1546{position:fixed;height:20px;z-index:2147483200;pointer-events:none;background:#020806;border-top:1px solid rgba(122,155,145,.34);overflow:hidden;contain:layout style paint;display:none}",
      "#dvlTimeline1546 .tick{position:absolute;top:0;width:1px;height:5px;background:rgba(122,155,145,.22)}",
      "#dvlTimeline1546 .lbl{position:absolute;top:0;height:19px;line-height:19px;font:850 10px system-ui;color:rgba(205,220,214,.96);white-space:nowrap;text-shadow:0 1px 2px #000}",
      "#dvlTimeline1546 .date{color:#00e68a;font-weight:900}"
    ].join("\n");
    document.head.appendChild(st);
  }

  var e=q("dvlTimeline1546");
  if(!e){
    e=document.createElement("div");
    e.id="dvlTimeline1546";
    document.body.appendChild(e);
  }
  return e;
}
function clear(el){
  while(el.firstChild)el.removeChild(el.firstChild);
}
function addTick(el,x){
  var t=document.createElement("i");
  t.className="tick";
  t.style.left=Math.round(x)+"px";
  el.appendChild(t);
}
function addLabel(el,text,x,align,date){
  var s=document.createElement("span");
  s.className="lbl"+(date?" date":"");
  s.textContent=text;
  s.style.left=Math.round(x)+"px";
  if(align==="left")s.style.transform="translateX(4px)";
  else if(align==="right")s.style.transform="translateX(calc(-100% - 4px))";
  else s.style.transform="translateX(-50%)";
  el.appendChild(s);
}
function render(force){
  raf=0;
  var w=wrap(),el=ensure(),wi=win();
  if(!w||!wi){el.style.display="none";return}

  var r=w.getBoundingClientRect();
  var W=Math.max(1,Math.round(r.width));
  var R=plotRight(W);
  var slots=Math.max(2,Number(wi.totalSlots)||Number(chartViewCount)||2);
  var cols=7;

  var sig=[
    Math.round(r.left),Math.round(r.top),W,
    Number(wi.leftEdgeIndex||0).toFixed(4),
    Number(wi.totalSlots||0).toFixed(4),
    String(typeof interval!=="undefined"?interval:""),
    R
  ].join("|");

  if(!force&&sig===lastSig)return;
  lastSig=sig;

  el.style.left=Math.round(r.left)+"px";
  el.style.top=Math.round(r.bottom-20)+"px";
  el.style.width=W+"px";
  el.style.display="block";
  clear(el);

  var lastRight=-9999,lastDay="";
  for(var i=0;i<=cols;i++){
    var frac=i/cols;
    var x=frac*R;
    addTick(el,x);

    var slot=frac*Math.max(1,slots-1);
    var ts=timeAtIndex(globalIndexForSlot(wi,slot));
    if(!Number.isFinite(ts))continue;

    var dk=dayKey(ts);
    var withDate=i===0||isDaily()||(lastDay&&dk!==lastDay);
    var text=fmt(ts,withDate);
    if(!text)continue;

    var approxW=Math.max(38,Math.min(115,text.length*6));
    var left=i===0?x+4:(i===cols?x-approxW-4:x-approxW/2);
    var right=left+approxW;

    if(i!==0&&i!==cols&&left<lastRight+10){
      lastDay=dk;
      continue;
    }

    addLabel(el,text,x,i===0?"left":(i===cols?"right":"center"),withDate);
    lastRight=right;
    lastDay=dk;
  }
}
function schedule(force){
  if(force)lastSig="";
  if(!raf)raf=requestAnimationFrame(function(){render(!!force)});
}
function install(){
  ensure();
  schedule(true);
  setTimeout(function(){schedule(true)},250);
  setTimeout(function(){schedule(true)},1200);
  setInterval(function(){schedule(false)},1000);
}
window.addEventListener("resize",function(){schedule(true)},{passive:true});
window.addEventListener("orientationchange",function(){schedule(true)},{passive:true});
document.addEventListener("wheel",function(){schedule(true)},{capture:true,passive:true});
document.addEventListener("pointermove",function(){schedule(false)},{capture:true,passive:true});
document.addEventListener("pointerup",function(){schedule(true)},{capture:true,passive:true});

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
else install();
})();
