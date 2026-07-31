/* Plots the same read-at-a-glance labels the user already reads by eye —
   OI subindo/caindo, LSR subindo/caindo, RSI recuperando (o "V") — directly
   on top of each indicator's OWN panel (OI / LSR / Exhaustion RSI), for
   whatever symbol/panel is currently open and visible. 100% client-side:
   reads only the data each oscillator already has in memory
   (window.DVLOpenInterestOscillator / DVLLongShortOscillator /
   DVLExhaustionRSI — their .cache/.computeValues(), gated by their own
   .on() state), so this makes ZERO network requests of its own and adds
   no Binance load at all. Hooked once from the main oscillator draw loop
   (drawLabels(ctx, padL), called every frame after the panels render),
   reading fresh panel coordinates from window.__dvlOscillatorPanelBounds. */
(function(){
  "use strict";
  if(window.DVL_LIVE_READING_LABELS_1027) return;

  var SLOPE_TH = .035; // % move between first/second-half averages before calling it up/down (same threshold as the existing trend() helper elsewhere in the app)

  function val(o,keys){
    for(var i=0;i<keys.length;i++){ var k=keys[i]; if(o && o[k]!=null){ var n=+o[k]; if(isFinite(n)) return n; } }
    return NaN;
  }
  function trend(arr,keys){
    if(!Array.isArray(arr) || arr.length<6) return {dir:"unknown"};
    var vals=arr.map(function(x){ return val(x,keys); }).filter(function(v){ return isFinite(v)&&v>0; }).slice(-12);
    if(vals.length<6) return {dir:"unknown"};
    var half=Math.max(3,Math.floor(vals.length/2)), a=vals.slice(0,half), b=vals.slice(half);
    function avg(x){ return x.reduce(function(s,v){ return s+v; },0)/Math.max(1,x.length); }
    var avga=avg(a), avgb=avg(b), pct = avga ? ((avgb-avga)/avga)*100 : 0;
    return { dir: pct>SLOPE_TH ? "up" : (pct<-SLOPE_TH ? "down" : "flat") };
  }

  function oiReading(){
    try{
      var osc=window.DVLOpenInterestOscillator;
      if(!osc || typeof osc.on!=="function" || !osc.on()) return null;
      var t=trend((osc.cache && osc.cache.data) || [], ["close","value"]);
      if(t.dir==="unknown") return null;
      if(t.dir==="up") return { text:"OI subindo", color:"#10df77" };
      if(t.dir==="down") return { text:"OI caindo", color:"#ff3037" };
      return { text:"OI estável", color:"#9aa0a6" };
    }catch(_){ return null; }
  }
  function lsrReading(){
    try{
      var osc=window.DVLLongShortOscillator;
      if(!osc || typeof osc.on!=="function" || !osc.on()) return null;
      var t=trend((osc.cache && osc.cache.data) || [], ["ratio"]);
      if(t.dir==="unknown") return null;
      /* LSR falling is the favourable side (matches the LSR arrow-colour
         convention fixed earlier this session) — green marks THAT
         direction, not "up". */
      if(t.dir==="down") return { text:"LSR caindo", color:"#10df77" };
      if(t.dir==="up") return { text:"LSR subindo", color:"#ff3037" };
      return { text:"LSR estável", color:"#9aa0a6" };
    }catch(_){ return null; }
  }
  function rsiReading(){
    try{
      var osc=window.DVLExhaustionRSI;
      if(!osc || typeof osc.on!=="function" || !osc.on() || typeof osc.computeValues!=="function") return null;
      var recent=(osc.computeValues()||[]).slice(-20);
      if(recent.length<6) return null;
      var minV=Infinity, minIdx=-1;
      recent.forEach(function(v,i){ var n=Number(v&&v.value); if(isFinite(n)&&n<minV){ minV=n; minIdx=i; } });
      var lastV=Number(recent[recent.length-1] && recent[recent.length-1].value);
      if(!isFinite(minV) || !isFinite(lastV)) return null;
      /* "The V": the low was oversold-ish and the line has since climbed
         back off it (not still sitting on the bottom). */
      if(minIdx>=0 && minIdx<recent.length-1 && minV<=35 && (lastV-minV)>=5) return { text:"RSI recuperando (V)", color:"#10df77" };
      if(lastV<=30) return { text:"RSI sobrevenda", color:"#f2c94c" };
      return { text:"RSI neutro", color:"#9aa0a6" };
    }catch(_){ return null; }
  }

  function drawTag(ctx, xRight, yBottom, r){
    ctx.save();
    ctx.font = "800 9px system-ui";
    var label="● "+r.text;
    var tw=ctx.measureText(label).width;
    var boxH=15, boxW=tw+10;
    var boxX=xRight-boxW, boxY=yBottom-boxH;
    ctx.fillStyle="rgba(4,14,10,.75)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle="rgba(255,255,255,.06)";
    ctx.lineWidth=1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.textAlign="left";
    ctx.textBaseline="middle";
    ctx.fillStyle=r.color;
    ctx.fillText(label, boxX+5, boxY+boxH/2);
    ctx.restore();
  }

  function drawLabels(ctx, padL, padR, w){
    try{
      var bounds=window.__dvlOscillatorPanelBounds || {};
      var oi=bounds.openInterest, ls=bounds.longShort, rsi=bounds.DVLExhaustionRSI;
      var xRight=(Number(w)||0)-(Number(padR)||0)-8;

      if(oi && isFinite(oi.top) && isFinite(oi.h)){
        var r1=oiReading();
        if(r1) drawTag(ctx, xRight, oi.top+oi.h-6, r1);
      }
      if(ls && isFinite(ls.top) && isFinite(ls.h)){
        var r2=lsrReading();
        if(r2) drawTag(ctx, xRight, ls.top+ls.h-6, r2);
      }
      if(rsi && isFinite(rsi.top) && isFinite(rsi.bottom)){
        var r3=rsiReading();
        if(r3) drawTag(ctx, xRight, rsi.bottom-6, r3);
      }
    }catch(_){}
  }

  window.DVL_LIVE_READING_LABELS_1027={
    version:"2.0",
    drawLabels:drawLabels,
    audit:function(){ return { oi:oiReading(), lsr:lsrReading(), rsi:rsiReading(), bounds:window.__dvlOscillatorPanelBounds||null }; }
  };
})();
