(function(){
"use strict";
if(window.__DVL_BETA_1545_GRID_ALIGNED_TIMELINE__)return;
window.__DVL_BETA_1545_GRID_ALIGNED_TIMELINE__=true;

var lastSig="";

function q(id){return document.getElementById(id)}
function num(v){v=Number(v);return Number.isFinite(v)?v:null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pad(v){return String(v).padStart(2,"0")}
function dayKey(ts){var d=new Date(ts);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function isDaily(){
  try{return interval==="1d"||interval==="3d"||interval==="1w"}catch(_){return false}
}
function fmtTime(ts,withDate){
  var d=new Date(Number(ts));
  if(!Number.isFinite(d.getTime()))return "";
  var dd=pad(d.getDate()),mm=pad(d.getMonth()+1),hh=pad(d.getHours()),mi=pad(d.getMinutes());
  if(isDaily())return dd+"/"+mm;
  return withDate ? dd+"/"+mm+" "+hh+":"+mi : hh+":"+mi;
}
function timelineTimeAt(globalIndex){
  try{
    if(typeof __dvlTimelineTimeAtIndex1322==="function"){
      var t=Number(__dvlTimelineTimeAtIndex1322(globalIndex));
      if(Number.isFinite(t))return t;
    }
  }catch(_){}

  try{
    var arr=Array.isArray(klines)?klines:[];
    if(!arr.length)return NaN;
    var step=60000;
    try{if(typeof intervalMs==="function")step=Math.max(1,Number(intervalMs(interval))||60000)}catch(_){}
    var last=arr.length-1;

    if(globalIndex<=0){
      var t0=Number(arr[0]&&(arr[0].time||arr[0].t));
      return Number.isFinite(t0)?t0+globalIndex*step:NaN;
    }
    if(globalIndex>=last){
      var tz=Number(arr[last]&&(arr[last].time||arr[last].t));
      return Number.isFinite(tz)?tz+(globalIndex-last)*step:NaN;
    }

    var lo=Math.max(0,Math.min(last,Math.floor(globalIndex)));
    var hi=Math.max(0,Math.min(last,lo+1));
    var f=Math.max(0,Math.min(1,globalIndex-lo));
    var a=Number(arr[lo]&&(arr[lo].time||arr[lo].t));
    var b=Number(arr[hi]&&(arr[hi].time||arr[hi].t));
    if(Number.isFinite(a)&&Number.isFinite(b)&&b>a)return a+(b-a)*f;
    if(Number.isFinite(a))return a+f*step;
  }catch(_){}

  return NaN;
}
function getWindow(){
  try{if(typeof visibleWindow==="function")return visibleWindow()}catch(_){}
  return null;
}
function gridRight(cssW){
  try{
    var cfg=window.__dvlLastCrossCfg||window.__DVL_DRAWCFG||{};
    var x1=num(cfg.x1);
    if(x1!==null&&x1>40&&x1<cssW)return x1;
  }catch(_){}
  return Math.max(1,cssW-55);
}
function globalIndexForSlot(win,slot){
  var left=num(win&&win.leftEdgeIndex);
  if(left!==null)return left+slot;

  var start=num(win&&win.start); if(start===null)start=0;
  var off=0;
  try{if(typeof __dvlSlotOffset==="function")off=Number(__dvlSlotOffset(win,(win&&win.candles)||[]))||0}catch(_){}
  return start+(slot-off);
}
function paint(force){
  try{
    var c=q("dvlPermanentTimeline1324");
    var wrap=q("chartWrap")||document.querySelector(".canvasWrap");
    if(!c||!wrap)return;

    var wr=wrap.getBoundingClientRect();
    var cssW=Math.max(1,Math.round(wr.width));
    var cssH=20;
    var dpr=Math.max(1,Math.min(window.devicePixelRatio||1,2));
    var win=getWindow();
    if(!win)return;

    var slots=Math.max(2,Number(win.totalSlots)||Number(chartViewCount)||2);
    var plotL=0;
    var plotR=gridRight(cssW);
    var plotW=Math.max(1,plotR-plotL);
    var cols=7;

    var sig=[
      cssW,cssH,dpr,
      Number(win.leftEdgeIndex||0).toFixed(4),
      Number(win.totalSlots||0).toFixed(4),
      String(typeof interval!=="undefined"?interval:""),
      String((window.__dvlLastCrossCfg&&window.__dvlLastCrossCfg.x1)||"")
    ].join("|");

    if(!force&&sig===lastSig)return;
    lastSig=sig;

    c.style.setProperty("height","20px","important");
    c.style.setProperty("min-height","20px","important");
    c.style.setProperty("max-height","20px","important");
    c.style.setProperty("bottom","0","important");
    c.style.setProperty("top","auto","important");

    var pw=Math.round(cssW*dpr),ph=Math.round(cssH*dpr);
    if(c.width!==pw)c.width=pw;
    if(c.height!==ph)c.height=ph;

    var ctx=c.getContext("2d",{alpha:false});
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssW,cssH);

    ctx.fillStyle="#020806";
    ctx.fillRect(0,0,cssW,cssH);

    ctx.strokeStyle="rgba(122,155,145,.34)";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(plotL+.5,.5);
    ctx.lineTo(cssW-.5,.5);
    ctx.stroke();

    var marks=[];
    for(var i=0;i<=cols;i++){
      var frac=i/cols;
      var slot=frac*Math.max(1,slots-1);
      var gi=globalIndexForSlot(win,slot);
      var ts=timelineTimeAt(gi);
      if(!Number.isFinite(ts))continue;
      var x=plotL+frac*plotW;
      marks.push({i:i,x:x,ts:ts});
    }

    ctx.strokeStyle="rgba(122,155,145,.18)";
    ctx.beginPath();
    marks.forEach(function(m){
      ctx.moveTo(Math.round(m.x)+.5,0);
      ctx.lineTo(Math.round(m.x)+.5,5);
    });
    ctx.stroke();

    ctx.font="10px system-ui";
    ctx.textBaseline="middle";
    ctx.fillStyle="rgba(198,216,207,.94)";

    var lastRight=-9999;
    var lastDay="";
    for(var k=0;k<marks.length;k++){
      var m=marks[k];
      var dk=dayKey(m.ts);
      var withDate=(k===0)||isDaily()||(lastDay&&dk!==lastDay);
      var text=fmtTime(m.ts,withDate);
      if(!text)continue;

      var w=ctx.measureText(text).width;
      var align="center";
      var x=m.x;

      if(k===0){align="left";x=plotL+4}
      else if(k===marks.length-1){align="right";x=plotR-4}

      var left=align==="left"?x:(align==="right"?x-w:x-w/2);
      var right=align==="left"?x+w:(align==="right"?x:x+w/2);

      if(k!==0&&k!==marks.length-1&&left<lastRight+10){
        lastDay=dk;
        continue;
      }

      ctx.textAlign=align;
      ctx.fillStyle=withDate?"rgba(0,230,138,.96)":"rgba(198,216,207,.94)";
      ctx.fillText(text,x,11);
      lastRight=right;
      lastDay=dk;
    }
  }catch(e){
    try{console.warn("[DVL 1.545 timeline]",e)}catch(_){}
  }
}

function install(){
  var old=null;
  try{old=window.dvlPaintPermanentTimeline1324}catch(_){}
  if(typeof old==="function"&&!old.__dvl1545Wrapped){
    var wrapped=function(force){
      var r;
      try{r=old.apply(this,arguments)}catch(e){try{console.warn(e)}catch(_){}}
      try{paint(true)}catch(_){}
      return r;
    };
    wrapped.__dvl1545Wrapped=true;
    window.dvlPaintPermanentTimeline1324=wrapped;
  }

  try{
    if(window.DVL_TIMELINE_1324&&typeof window.DVL_TIMELINE_1324.paint==="function"&&!window.DVL_TIMELINE_1324.__dvl1545Wrapped){
      var op=window.DVL_TIMELINE_1324.paint;
      window.DVL_TIMELINE_1324.paint=function(){var r=op.apply(this,arguments);paint(true);return r};
      window.DVL_TIMELINE_1324.__dvl1545Wrapped=true;
    }
  }catch(_){}

  paint(true);
  setTimeout(function(){paint(true)},250);
  setTimeout(function(){paint(true)},1200);
}

window.addEventListener("resize",function(){lastSig="";paint(true)},{passive:true});
window.addEventListener("orientationchange",function(){lastSig="";paint(true)},{passive:true});
document.addEventListener("wheel",function(){lastSig="";requestAnimationFrame(function(){paint(true)})},{capture:true,passive:true});
document.addEventListener("pointerup",function(){lastSig="";requestAnimationFrame(function(){paint(true)})},{capture:true,passive:true});

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
else install();
})();
