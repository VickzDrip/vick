/* ============================================================================
   DVL FVG Firewall — Beta 1.220
   Order-Flow FVG indicator: geometry + flow-based scoring (VALID/WEAK/FAKE) +
   mitigation tracking. Plugs into the REAL indicator registry, the REAL
   drawPriceSection overlay pipeline and the DVL settings-standard shell.

   Performance contract (must not regress vs 1.215):
     • detect new FVGs only on candle close (incremental, cached by id)
     • footprint from real server data (window._dvlFpCache) or honest OHLCV
       reconstruction — cached per source-candle
     • classify once per source candle; score cached on the zone
     • mitigation updated only for zones near price, on close / throttled tick
     • renderer draws only visible zones, reuses geometry, one central rAF
     • no polling timers, no mutation observers, no draw()/drawSoon() wrappers,
       no recompute on pan / zoom / crosshair
   ==========================================================================*/
(function(){
  "use strict";
  if(window.DVL_FVG_FIREWALL_API) return;

  /* ── DVL_FVG_SETTINGS — all defaults in one place ─────────────────────── */
  var DEFAULTS = {
    on:false,
    /* Core */
    sourceCandle:"middle",      // middle | displacement | three
    sizeMode:"atr",             // atr | ticks | percent
    minSize:"small",            // all | tiny | small | medium | large | custom
    customSize:0.5,
    extendBars:60,
    maxActiveZones:80,
    barsToScan:600,
    /* Flow */
    dataSource:"auto",          // auto | aggTrades | lowerTf | reconstructed
    cellMode:"auto",            // auto | ticks | price | atrFraction
    cellSize:0,
    maxCells:20,
    lowerTf:"1m",
    useReconstruction:true,
    /* Classification */
    validThreshold:75,
    weakThreshold:50,
    minRelVol:0.8,
    minDominance:1.3,
    maxOppositeShare:0.45,
    useDelta:true,
    wDominance:25, wDelta:20, wOpposite:15, wDisplace:15, wRelVol:10, wAbsorb:10, wPoc:5,
    qualityPenalty:8,
    /* Mitigation */
    mitigationMode:"fill50",    // touch | fill50 | closeMid | fullFill
    respectAtr:0.5,
    hideMitigated:false,
    stopExtend:true,
    /* Visual */
    showValid:true, showWeak:true, showFake:false,
    showLabels:true, showMidline:true, showTooltip:true, extendRight:true,
    opacity:0.14, border:0.5
  };

  var SIZE_PRESET = { all:0, tiny:0.1, small:0.35, medium:0.8, large:1.6 };
  var EPS = 1e-9;

  /* ── pure helpers (shared by worker + main thread) ────────────────────── */
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function fmtVol(v){
    v = Number(v)||0; var s = v<0?"-":""; v=Math.abs(v);
    if(v>=1e9) return s+(v/1e9).toFixed(1)+"B";
    if(v>=1e6) return s+(v/1e6).toFixed(1)+"M";
    if(v>=1e3) return s+(v/1e3).toFixed(1)+"K";
    return s+v.toFixed(0);
  }

  /* Reconstruct / read flow for one source candle. Returns cells + volumes +
     dataQuality. `cacheBS` is the real {b,s} from _dvlFpCache when present. */
  function buildFlow(payload){
    var c = payload.candle, cfg = payload.cfg, cacheBS = payload.cacheBS;
    var maxCells = Math.max(4, Math.min(120, cfg.maxCells||20));
    var high=+c.high, low=+c.low, open=+c.open, close=+c.close, vol=+c.volume||0;
    var range = Math.max(high-low, EPS);
    var body = Math.abs(close-open);
    var closeLoc = clamp((close-low)/range, 0, 1);
    var buy, sell, quality, tradeCount;
    if(cacheBS && (cacheBS.b>0 || cacheBS.s>0)){
      buy = +cacheBS.b||0; sell = +cacheBS.s||0;
      if(!(vol>0)) vol = buy+sell;
      quality = "AGG_TRADES";
      tradeCount = cacheBS.n>0 ? cacheBS.n : Math.max(1, Math.round((buy+sell)/Math.max(range,EPS)));
    }else{
      // honest reconstruction from OHLCV: buyers dominate when close near high
      var buyFrac = clamp(0.15 + 0.7*closeLoc, 0.05, 0.95);
      buy = vol*buyFrac; sell = vol*(1-buyFrac);
      quality = "RECONSTRUCTED";
      tradeCount = 0;
    }
    var total = buy+sell;
    // adaptive price cells with a close-weighted profile (volume clusters near
    // the aggressive close); POC = densest cell.
    var nCells = maxCells;
    if(cfg.cellMode==="auto") nCells = Math.max(6, Math.min(maxCells, Math.round(range/(range/maxCells))));
    nCells = Math.max(4, Math.min(120, nCells));
    var cells = new Array(nCells), sumW=0, i;
    var pocPrice = low + closeLoc*range;
    var spread = range*0.35 + EPS;
    for(i=0;i<nCells;i++){
      var pLow = low + range*(i/nCells), pHigh = low + range*((i+1)/nCells), pMid=(pLow+pHigh)/2;
      var d = (pMid-pocPrice)/spread;
      var w = Math.exp(-0.5*d*d) + 0.08;   // gaussian around POC + floor
      sumW += w;
      cells[i] = { priceLow:pLow, priceHigh:pHigh, w:w, buyVolume:0, sellVolume:0, delta:0, totalVolume:0, tradeCount:0 };
    }
    var pocIdx=0, pocVol=-1;
    for(i=0;i<nCells;i++){
      var frac = cells[i].w/sumW;
      cells[i].buyVolume = buy*frac;
      cells[i].sellVolume = sell*frac;
      cells[i].totalVolume = total*frac;
      cells[i].delta = cells[i].buyVolume - cells[i].sellVolume;
      cells[i].tradeCount = Math.round((tradeCount||0)*frac);
      delete cells[i].w;
      if(cells[i].totalVolume>pocVol){ pocVol=cells[i].totalVolume; pocIdx=i; }
    }
    var pocPos = pocIdx < nCells/3 ? "Lower" : (pocIdx >= 2*nCells/3 ? "Upper" : "Middle");
    return { buy:buy, sell:sell, total:total, delta:buy-sell, quality:quality, tradeCount:tradeCount,
             cells:cells, poc:pocPos, pocIdx:pocIdx, closeLoc:closeLoc, body:body, range:range };
  }

  /* Full per-zone metric + score computation. Pure: same code path on worker
     and main thread. payload = {dir, candle, cacheBS, atr, avgVol, cfg}. */
  function computeZone(payload){
    var cfg = payload.cfg, dir = payload.dir, c = payload.candle;
    var flow = buildFlow(payload);
    var atr = Math.max(+payload.atr||0, EPS);
    var avgVol = Math.max(+payload.avgVol||0, EPS);
    var range = flow.range, body = flow.body, total = flow.total, delta = flow.delta;
    var bull = dir==="bull";

    var dominance = bull ? flow.buy/Math.max(flow.sell,EPS) : flow.sell/Math.max(flow.buy,EPS);
    var oppositeShare = total>0 ? (bull ? flow.sell/total : flow.buy/total) : 1;
    var relativeVolume = total/avgVol;
    var bodyRatio = body/Math.max(range,EPS);
    var closeLocation = bull ? flow.closeLoc : (1-flow.closeLoc);
    var bodyAtr = body/atr, rangeAtr = range/atr;
    var displacement = clamp((bodyAtr/1.5)*0.5 + bodyRatio*0.3 + clamp(relativeVolume/2,0,1)*0.2, 0, 1);
    var displacementAtr = bodyAtr;
    // absorption: opposite-side wick with the close finishing the right way
    var upperWick = (c.high - Math.max(c.open,c.close))/Math.max(range,EPS);
    var lowerWick = (Math.min(c.open,c.close) - c.low)/Math.max(range,EPS);
    var absorption = bull ? clamp(lowerWick*1.6*closeLocation,0,1) : clamp(upperWick*1.6*closeLocation,0,1);
    var deltaRatio = total>0 ? delta/total : 0;         // [-1,1]
    var favDelta = bull ? deltaRatio : -deltaRatio;      // positive = supportive

    // weighted score
    var pDom = cfg.wDominance * clamp((dominance-1)/(Math.max(cfg.minDominance,1.01)*2-1),0,1);
    var pDelta = cfg.useDelta ? cfg.wDelta * clamp(favDelta/0.5,0,1) : cfg.wDelta*0.5;
    var pOpp = cfg.wOpposite * clamp((cfg.maxOppositeShare-oppositeShare)/Math.max(cfg.maxOppositeShare,EPS),0,1);
    var pDisp = cfg.wDisplace * displacement;
    var pRel = cfg.wRelVol * clamp((relativeVolume-cfg.minRelVol)/Math.max(2-cfg.minRelVol,EPS),0,1);
    var pAbs = cfg.wAbsorb * absorption;
    var pocFav = (flow.poc==="Middle") ? 0.6 : ((bull && flow.poc==="Upper")||(!bull && flow.poc==="Lower") ? 1 : 0.2);
    var pPoc = cfg.wPoc * pocFav;
    var score = pDom+pDelta+pOpp+pDisp+pRel+pAbs+pPoc;

    // penalties
    if(favDelta < 0) score -= Math.abs(favDelta)*15;                 // delta contrário
    if(relativeVolume < 0.6) score -= (0.6-relativeVolume)*12;       // volume muito baixo
    var advWick = bull ? upperWick : lowerWick;                      // pavio contra a direção
    if(advWick > 0.5) score -= (advWick-0.5)*16;
    if(dominance < cfg.minDominance) score -= (cfg.minDominance-dominance)*6;
    if(flow.quality==="RECONSTRUCTED") score -= cfg.qualityPenalty;  // fonte estimada
    if((flow.tradeCount||0)>0 && flow.tradeCount < 20) score -= 3;   // poucos trades reais

    score = Math.round(clamp(score,0,100));
    var cls = score>=cfg.validThreshold ? "VALID" : (score>=cfg.weakThreshold ? "WEAK" : "FAKE");

    return {
      metrics:{
        buyVolume:flow.buy, sellVolume:flow.sell, totalVolume:total, delta:delta,
        dominance:dominance, oppositeShare:oppositeShare, relativeVolume:relativeVolume,
        displacement:displacement, displacementAtr:displacementAtr, bodyRatio:bodyRatio,
        closeLocation:closeLocation, pocPosition:flow.poc, absorptionScore:absorption,
        fillSpeed:null, tradeCount:flow.tradeCount
      },
      cells:flow.cells, quality:flow.quality, score:score, cls:cls
    };
  }

  window.__DVL_FVG_PURE = { buildFlow:buildFlow, computeZone:computeZone, clamp:clamp, fmtVol:fmtVol };

  /* ── DVL_FVG_STORAGE ──────────────────────────────────────────────────── */
  var KEY = "dvl_fvg_firewall_1220";
  var state = (function(){
    var s = {}; try{ s = JSON.parse(localStorage.getItem(KEY)||"{}"); }catch(_){}
    var out = {}; for(var k in DEFAULTS) out[k]=DEFAULTS[k];
    if(s && typeof s==="object") for(var k2 in s){ if(k2 in DEFAULTS) out[k2]=s[k2]; }
    return out;
  })();
  var saveT=0;
  function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(_){} },120); onStateChanged(); }
  function reset(){ for(var k in DEFAULTS) state[k]=DEFAULTS[k]; try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(_){} onStateChanged(); if(panel) renderPanel(); }

  /* ── engine data (per symbol+tf cache) ────────────────────────────────── */
  var zonesByKey = {};        // "SYM|TF" -> { list:[zones], scannedTo:time }
  var curKey = "";
  var recomputeRAF = 0, dirty = false, lastTickMitig = 0;

  /* These app globals are declared with `let` (klines/interval/symbol/ticker),
     so they live in the shared global lexical scope, NOT on window. Reach them
     by bare identifier with a typeof guard — the same pattern the app uses. */
  function gsym(){ try{ if(typeof symbol!=="undefined" && symbol) return String(symbol); }catch(_){} try{ if(window.ticker&&window.ticker.symbol) return String(window.ticker.symbol); }catch(_){} return "?"; }
  function gtf(){ try{ if(typeof interval!=="undefined" && interval) return String(interval); }catch(_){} return "1m"; }
  function keyOf(){ return gsym()+"|"+gtf(); }
  function candles(){ try{ if(Array.isArray(window.klines)) return window.klines; }catch(_){} try{ if(typeof klines!=="undefined" && Array.isArray(klines)) return klines; }catch(_){} return []; }
  function lastPrice(){ try{ if(typeof ticker!=="undefined" && ticker && ticker.lastPrice>0) return Number(ticker.lastPrice); }catch(_){} try{ if(window.ticker&&window.ticker.lastPrice>0) return Number(window.ticker.lastPrice); }catch(_){} return 0; }
  function bucket(){ var k=keyOf(); if(!zonesByKey[k]) zonesByKey[k]={ list:[], scannedTo:0 }; return zonesByKey[k]; }

  function minSizeValue(cfg,atr,price){
    var base = cfg.minSize==="custom" ? (+cfg.customSize||0) : (SIZE_PRESET[cfg.minSize]||0);
    if(cfg.sizeMode==="atr") return base*atr;
    if(cfg.sizeMode==="percent") return (base/100)*price;   // base treated as %
    if(cfg.sizeMode==="ticks"){ var tick=Math.max(price*0.00001,EPS); return base*100*tick; }
    return base*atr;
  }

  function atrAt(cs,i,len){
    len = len||14; var s=Math.max(1,i-len+1), n=0, sum=0;
    for(var k=s;k<=i;k++){ var p=cs[k-1]||cs[k]; var tr=Math.max(cs[k].high-cs[k].low, Math.abs(cs[k].high-p.close), Math.abs(cs[k].low-p.close)); sum+=tr; n++; }
    return n? sum/n : (cs[i].high-cs[i].low);
  }
  function avgVolAt(cs,i,len){ len=len||20; var s=Math.max(0,i-len), n=0, sum=0; for(var k=s;k<i;k++){ sum+=(+cs[k].volume||0); n++; } return n? sum/n : (+cs[i].volume||1); }

  /* DVL_FVG_DETECTOR + orchestration: scan only NEW closed candles. */
  function scan(){
    if(!state.on) return;
    var cs = candles(); var n = cs.length;
    if(n<3) return;
    var b = bucket();
    var cfg = state;
    // only scan closed candles (exclude the forming last candle)
    var lastClosed = n-1;
    var barMs = n>=2 ? (+cs[n-1].time - +cs[n-2].time) : 0;
    if(barMs>0 && (+cs[n-1].time + barMs) > Date.now()) lastClosed = n-2;
    if(lastClosed < 2) return;
    var startIdx = 2;
    var scanFloor = Math.max(2, n - (cfg.barsToScan||600));
    if(b.scannedTo>0){
      // resume just after the last scanned source candle
      for(var j=lastClosed;j>=2;j--){ if(+cs[j].time <= b.scannedTo){ startIdx=j+1; break; } }
    }
    if(startIdx < scanFloor) startIdx = scanFloor;
    var existing = {}; for(var e=0;e<b.list.length;e++) existing[b.list[e].id]=1;
    for(var i=Math.max(2,startIdx); i<=lastClosed; i++){
      var a2=cs[i-2], mid=cs[i-1], cur=cs[i];
      if(!a2||!mid||!cur) continue;
      var atr = atrAt(cs,i,14) || (cur.high-cur.low) || EPS;
      var price = +cur.close||+cur.high||1;
      var minSz = minSizeValue(cfg,atr,price);
      var dir=null, top=0, bottom=0;
      if(+cur.low > +a2.high){ dir="bull"; top=+cur.low; bottom=+a2.high; }
      else if(+cur.high < +a2.low){ dir="bear"; top=+a2.low; bottom=+cur.high; }
      if(!dir) continue;
      var size = top-bottom;
      if(size <= 0) continue;
      if(cfg.minSize!=="all" && size < minSz) continue;
      var id = dir+"|"+(+cur.time);
      if(existing[id]) continue;
      var srcCandle = cfg.sourceCandle==="displacement" ? cur : (cfg.sourceCandle==="three" ? mid : mid);
      var cacheBS = null;
      try{ if(window._dvlFpCache && window._dvlFpCache.get) cacheBS = window._dvlFpCache.get(+srcCandle.time)||window._dvlFpCache.get(+cur.time)||null; }catch(_){}
      var res = computeZone({ dir:dir, candle:srcCandle, cacheBS:cacheBS, atr:atr, avgVol:avgVolAt(cs,i,20), cfg:cfg });
      var zone = {
        id:id, dir:dir, top:top, bottom:bottom, mid:(top+bottom)/2, size:size,
        createdIdx:i, createdTime:+cur.time, srcTime:+srcCandle.time, atr:atr,
        metrics:res.metrics, cells:res.cells, quality:res.quality, score:res.score, cls:res.cls,
        state:"ACTIVE", touched:false, touchIdx:null, extendStop:null, reScored:false
      };
      b.list.push(zone);
      existing[id]=1;
    }
    b.scannedTo = +cs[lastClosed].time;
    // prune to maxActiveZones (keep newest by createdTime)
    if(b.list.length > cfg.maxActiveZones){
      b.list.sort(function(x,y){ return x.createdTime-y.createdTime; });
      b.list.splice(0, b.list.length-cfg.maxActiveZones);
    }
    mitigateAll(cs, lastClosed, true);
  }

  /* DVL_FVG_MITIGATION_ENGINE — only zones near price, cheap state machine. */
  function mitigateAll(cs, lastClosed, onClose){
    if(!state.on) return;
    var b = bucket(); var cfg = state;
    var price = lastPrice(); if(!(price>0)){ try{ price = +cs[lastClosed].close; }catch(_){ price = 0; } }
    if(!(price>0)) price = +cs[lastClosed].close;
    var atr = cs.length? atrAt(cs,lastClosed,14): 0;
    for(var i=0;i<b.list.length;i++){
      var z=b.list[i];
      if(z.state==="MITIGATED"||z.state==="FAILED") continue;
      var near = price >= z.bottom-atr*3 && price <= z.top+atr*3;
      if(!near && !onClose) continue;
      var inside = price>=z.bottom && price<=z.top;
      var bull = z.dir==="bull";
      if(inside && !z.touched){ z.touched=true; z.touchIdx=lastClosed; if(z.state==="ACTIVE") z.state="TOUCHED";
        var age = lastClosed - z.createdIdx;
        if(!z.reScored && age<=1){ z.score=Math.max(0,z.score-6); z.cls = z.score>=cfg.validThreshold?"VALID":(z.score>=cfg.weakThreshold?"WEAK":"FAKE"); z.metrics.fillSpeed=age; z.reScored=true; }
      }
      // mitigation by mode
      var mitig=false;
      if(cfg.mitigationMode==="touch") mitig = inside;
      else if(cfg.mitigationMode==="fill50") mitig = bull ? price<=z.mid : price>=z.mid;
      else if(cfg.mitigationMode==="closeMid") mitig = onClose && (bull ? +cs[lastClosed].close<=z.mid : +cs[lastClosed].close>=z.mid);
      else if(cfg.mitigationMode==="fullFill") mitig = bull ? price<=z.bottom : price>=z.top;
      // failed: a close fully through the zone against its direction
      var failed = onClose && (bull ? +cs[lastClosed].close < z.bottom : +cs[lastClosed].close > z.top);
      if(failed){ z.state="FAILED"; continue; }
      if(mitig){ z.state="MITIGATED"; continue; }
      // respected: touched then reacted respectAtr in favour
      if(z.touched && z.state==="TOUCHED"){
        var react = bull ? (price - z.top) : (z.bottom - price);
        if(react >= (cfg.respectAtr||0.5)*atr) z.state="RESPECTED";
      }
    }
  }

  /* ── recompute scheduling (single rAF, coalesced) ─────────────────────── */
  function requestRecompute(){ dirty=true; if(recomputeRAF) return; recomputeRAF=requestAnimationFrame(function(){ recomputeRAF=0; if(!dirty) return; dirty=false; try{ scan(); }catch(_){} try{ if(typeof window.drawSoon==="function") window.drawSoon(); }catch(_){} }); }

  function onStateChanged(){ updateItem(); if(state.on){ maybeFetchFlow(); requestRecompute(); } else { try{ if(typeof window.drawSoon==="function") window.drawSoon(); }catch(_){} } }

  /* opportunistically upgrade flow quality to real footprint when ON */
  var lastFlowFetch=0;
  function maybeFetchFlow(){
    if(!state.on) return;
    try{
      var hasReal = window._dvlFpCache && window._dvlFpCache.size>0;
      if(hasReal) return;
      if(typeof window.fetchFootprintData!=="function") return;
      var now=Date.now(); if(now-lastFlowFetch < 15000) return; lastFlowFetch=now;
      Promise.resolve(window.fetchFootprintData()).then(function(){ var b=bucket(); b.list=[]; b.scannedTo=0; requestRecompute(); }).catch(function(){});
    }catch(_){}
  }

  /* ── DVL_FVG_RENDERER — overlay hook, visible-only, cached geometry ────── */
  var hitRects = [];  // {x0,y0,x1,y1,zone} for tooltip hit-testing
  function bsearchTime(view, t){
    var lo=0, hi=view.length-1, ans=-1;
    while(lo<=hi){ var m=(lo+hi)>>1; if(+view[m].time<=t){ ans=m; lo=m+1; } else hi=m-1; }
    return ans;
  }
  function classColors(dir,cls){
    var bull = dir==="bull";
    var base = bull ? [22,199,132] : [235,80,90];
    var a = cls==="VALID"?1 : (cls==="WEAK"?0.8:0.45);
    return { rgb:base, a:a };
  }
  function draw(ctx, o){
    hitRects.length = 0;
    if(!state.on) return;
    if(keyOf()!==curKey){ curKey=keyOf(); requestRecompute(); }
    var b = zonesByKey[curKey]; if(!b || !b.list.length) return;
    var view=o.view, x=o.x, y=o.y, x0=o.x0, x1=o.x1, y0=o.y0, y1=o.y1, slotOffset=o.slotOffset, cfg=state;
    if(!view.length) return;
    var vFirst=+view[0].time, vLast=+view[view.length-1].time;
    ctx.save();
    ctx.font = "700 9px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textBaseline="middle";
    var shown=0;
    for(var i=b.list.length-1;i>=0;i--){
      var z=b.list[i];
      if(z.cls==="VALID" && !cfg.showValid) continue;
      if(z.cls==="WEAK" && !cfg.showWeak) continue;
      if(z.cls==="FAKE" && !cfg.showFake) continue;
      if(cfg.hideMitigated && (z.state==="MITIGATED"||z.state==="FAILED")) continue;
      if(z.createdTime > vLast) continue;
      // left x: locate created candle in view (clamp if scrolled off left)
      var lx;
      if(z.createdTime < vFirst) lx = x0;
      else { var vi=bsearchTime(view, z.createdTime); lx = vi>=0 ? x(slotOffset+vi) : x0; }
      var rx;
      if(cfg.extendRight && !(cfg.stopExtend && (z.state==="MITIGATED"||z.state==="FAILED"))) rx = x1;
      else { var endT=z.createdTime; var evi=bsearchTime(view,endT); var extra=Math.min(cfg.extendBars, view.length-1-(evi<0?0:evi)); rx = x(slotOffset+((evi<0?0:evi)+Math.max(2,extra))); if(rx>x1)rx=x1; }
      if(rx<=x0 || lx>=x1) continue;
      if(lx<x0) lx=x0; if(rx>x1) rx=x1;
      var ty=y(z.top), by=y(z.bottom);
      if(ty>by){ var tmp=ty; ty=by; by=tmp; }
      if(by<y0 || ty>y1) continue;
      var cc=classColors(z.dir,z.cls);
      var fillA = cfg.opacity * (z.cls==="FAKE"?0.5:1) * ((z.state==="MITIGATED"||z.state==="FAILED")?0.5:1);
      ctx.fillStyle = "rgba("+cc.rgb[0]+","+cc.rgb[1]+","+cc.rgb[2]+","+fillA+")";
      ctx.fillRect(lx, ty, rx-lx, Math.max(1,by-ty));
      ctx.lineWidth = z.cls==="VALID"?1.1:0.6;
      ctx.strokeStyle = "rgba("+cc.rgb[0]+","+cc.rgb[1]+","+cc.rgb[2]+","+(cfg.border*cc.a)+")";
      ctx.strokeRect(lx+0.5, ty+0.5, Math.max(1,rx-lx-1), Math.max(1,by-ty-1));
      if(cfg.showMidline){ var my=y(z.mid); ctx.save(); ctx.setLineDash([3,3]); ctx.strokeStyle="rgba("+cc.rgb[0]+","+cc.rgb[1]+","+cc.rgb[2]+","+(0.4*cc.a)+")"; ctx.beginPath(); ctx.moveTo(lx,my); ctx.lineTo(rx,my); ctx.stroke(); ctx.restore(); }
      if(cfg.showLabels && (by-ty)>12){
        var sign=z.dir==="bull"?"+":"-";
        var lbl="FVG"+sign+" "+z.score;
        ctx.fillStyle = "rgba("+cc.rgb[0]+","+cc.rgb[1]+","+cc.rgb[2]+",0.95)";
        ctx.fillText(lbl, lx+4, ty+8);
        if((by-ty)>26){ ctx.fillStyle="rgba(200,214,208,0.75)"; ctx.fillText("Δ "+(z.metrics.delta>=0?"+":"")+fmtVol(z.metrics.delta), lx+4, ty+19); }
      }
      hitRects.push({ x0:lx, y0:ty, x1:rx, y1:by, zone:z });
      shown++;
      if(shown>=cfg.maxActiveZones) break;
    }
    ctx.restore();
  }
  window.DVLFvgFirewallDraw = draw;

  /* ── tooltip (hover desktop / tap mobile) — hit-test cached rects only ──── */
  var tipEl=null, tipRAF=0;
  function ensureTip(){ if(tipEl) return tipEl; tipEl=document.createElement("div"); tipEl.id="dvlFvgTooltip"; tipEl.style.cssText="position:fixed;z-index:100050;pointer-events:none;display:none;min-width:150px;max-width:230px;padding:8px 9px;border-radius:9px;background:rgba(6,16,12,.96);border:1px solid rgba(129,166,151,.28);color:#dcebe4;font:600 10px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5)"; document.body.appendChild(tipEl); return tipEl; }
  function hideTip(){ if(tipEl) tipEl.style.display="none"; }
  function fmtTip(z){
    var m=z.metrics, bull=z.dir==="bull";
    var q = z.quality==="AGG_TRADES"?"AggTrades":(z.quality==="LOWER_TF"?"Lower TF":(z.quality==="REAL_TRADES"?"Real Trades":"Estimated flow"));
    var rows = [
      (bull?"Bullish":"Bearish")+" FVG",
      "Score: "+z.score+"/100 · "+z.cls,
      "Buy: "+fmtVol(m.buyVolume)+"  Sell: "+fmtVol(m.sellVolume),
      "Delta: "+(m.delta>=0?"+":"")+fmtVol(m.delta),
      "Dominance: "+m.dominance.toFixed(2)+"  Opp: "+Math.round(m.oppositeShare*100)+"%",
      "Rel Vol: "+m.relativeVolume.toFixed(1)+"x  Disp: "+m.displacementAtr.toFixed(1)+" ATR",
      "POC: "+m.pocPosition+"  Data: "+q,
      "Status: "+z.state.charAt(0)+z.state.slice(1).toLowerCase()
    ];
    return rows.map(function(r,i){ return i===0?("<b style=\"color:"+(bull?"#16c784":"#eb5560")+"\">"+r+"</b>"):("<div>"+r+"</div>"); }).join("");
  }
  function onMove(ev){
    if(!state.on || !state.showTooltip){ hideTip(); return; }
    if(window.__dvlDragging || (window.crosshair&&window.crosshair.dragging)) return;
    if(tipRAF) return;
    tipRAF=requestAnimationFrame(function(){
      tipRAF=0;
      var cv=canvasEl(); if(!cv){ hideTip(); return; }
      var r=cv.getBoundingClientRect();
      var px=ev.clientX-r.left, py=ev.clientY-r.top, hit=null;
      for(var i=hitRects.length-1;i>=0;i--){ var h=hitRects[i]; if(px>=h.x0&&px<=h.x1&&py>=h.y0&&py<=h.y1){ hit=h.zone; break; } }
      if(!hit){ hideTip(); return; }
      var t=ensureTip(); t.innerHTML=fmtTip(hit); t.style.display="block";
      var tx=ev.clientX+14, ty=ev.clientY+14;
      var tw=t.offsetWidth, th=t.offsetHeight, vw=window.innerWidth, vh=window.innerHeight;
      if(tx+tw>vw-6) tx=ev.clientX-tw-14; if(ty+th>vh-6) ty=vh-th-6;
      t.style.left=tx+"px"; t.style.top=ty+"px";
    });
  }
  function canvasEl(){ try{ return document.getElementById("chart")||document.querySelector("canvas.chart")||document.querySelector("#chartCanvas")||document.querySelector("canvas"); }catch(_){ return null; } }
  function bindTooltip(){ var cv=canvasEl(); if(!cv||cv.__dvlFvgTip) return; cv.__dvlFvgTip=1; cv.addEventListener("pointermove", onMove, {passive:true}); cv.addEventListener("pointerleave", hideTip, {passive:true}); }

  /* ── event wiring into the app's existing event bus (no new timers) ────── */
  function hookEvents(){
    try{ window.addEventListener("chart:draw", function(){ if(state.on && keyOf()!==curKey){ curKey=keyOf(); requestRecompute(); } }, {passive:true}); }catch(_){}
    try{ window.addEventListener("dvl-safe-asset-selected-0804", function(){ if(state.on){ curKey=""; maybeFetchFlow(); requestRecompute(); } hideTip(); }, {passive:true}); }catch(_){}
    try{ window.addEventListener("dvl:paper-price", function(){ if(!state.on) return; var now=Date.now(); if(now-lastTickMitig<400) return; lastTickMitig=now; var cs=candles(); if(cs.length>=3) try{ mitigateAll(cs, cs.length-1, false); }catch(_){} }, {passive:true}); }catch(_){}
    try{ document.addEventListener("visibilitychange", function(){ if(!document.hidden && state.on) requestRecompute(); }, {passive:true}); }catch(_){}
  }

  /* ── public API ───────────────────────────────────────────────────────── */
  window.DVL_FVG_FIREWALL_API = {
    getActiveZones:function(){ var b=zonesByKey[keyOf()]; return b?b.list.filter(function(z){return z.state!=="MITIGATED"&&z.state!=="FAILED";}).map(cloneZone):[]; },
    getZonesForSymbol:function(sym,timeframe){ var b=zonesByKey[(sym||gsym())+"|"+(timeframe||gtf())]; return b?b.list.map(cloneZone):[]; },
    getNearestZone:function(price){ var b=zonesByKey[keyOf()]; if(!b) return null; var best=null,bd=Infinity; for(var i=0;i<b.list.length;i++){ var z=b.list[i]; var d=Math.min(Math.abs(price-z.top),Math.abs(price-z.bottom),Math.abs(price-z.mid)); if(d<bd){bd=d;best=z;} } return best?cloneZone(best):null; },
    getBestZones:function(limit){ var b=zonesByKey[keyOf()]; if(!b) return []; return b.list.slice().sort(function(a,c){return c.score-a.score;}).slice(0,limit||5).map(cloneZone); },
    getZoneById:function(id){ var b=zonesByKey[keyOf()]; if(!b) return null; for(var i=0;i<b.list.length;i++) if(b.list[i].id===id) return cloneZone(b.list[i]); return null; },
    isOn:function(){ return !!state.on; },
    on:function(){ return !!state.on; },
    setOn:function(v){ state.on = (v===undefined? !state.on : !!v); save(); },
    openPanel:function(){ try{ openPanel(); }catch(_){} },
    open:function(){ try{ openPanel(); }catch(_){} },
    refresh:function(){ requestRecompute(); },
    get state(){ return state; },
    getState:function(){ var o={}; for(var k in state) o[k]=state[k]; return o; }
  };
  function cloneZone(z){ return { id:z.id, dir:z.dir, top:z.top, bottom:z.bottom, mid:z.mid, size:z.size, score:z.score, cls:z.cls, state:z.state, quality:z.quality, createdTime:z.createdTime, metrics:z.metrics }; }

  /* ── indicator menu item (matches Spike Zones registration) ───────────── */
  var panel=null;
  function updateItem(){ var st=document.getElementById("dvlFvgState"); if(st){ st.textContent=state.on?"ON":"OFF"; st.setAttribute("aria-label", state.on?"DVL FVG Firewall ON":"DVL FVG Firewall OFF"); st.classList.toggle("is-on", !!state.on); } }
  function insertItem(){
    var menu=document.getElementById("indicatorDropdown");
    if(!menu || document.getElementById("dvlFvgFirewallItem")) return;
    var item=document.createElement("div");
    item.id="dvlFvgFirewallItem";
    item.className="indicatorItem dvl-fvg-indicator-item";
    item.innerHTML='<span class="indicatorFxMark">FV</span><span><b>DVL FVG Firewall</b><small>order flow · smart money</small></span><i class="dvl-vt-state" id="dvlFvgState">OFF</i>';
    var sz=document.getElementById("dvlSpikeZonesItem");
    if(sz && sz.parentNode) sz.parentNode.insertBefore(item, sz.nextSibling);
    else { var head=menu.querySelector(".indicatorDropHead"); if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling); else menu.appendChild(item); }
    var pill=item.querySelector("#dvlFvgState");
    if(pill) pill.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); state.on=!state.on; save(); });
    item.addEventListener("click", function(ev){ ev.stopPropagation(); openPanel(); });
    updateItem();
  }

  /* ── settings panel (DVL standard shell + custom-control upgrade) ─────── */
  function ensurePanel(){
    if(panel) return panel;
    panel=document.createElement("div");
    panel.id="dvlFvgPanel";
    panel.className="dvl-vt-panel dvl-fvg-panel";
    panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>DVL FVG Firewall</b><small>order flow FVG scoring</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-reset-icon" id="dvlFvgReset" type="button" aria-label="Reset DVL FVG Firewall">↻</button><button class="dvl-vt-close" id="dvlFvgClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlFvgBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", function(ev){ ev.stopPropagation(); }, true);
    panel.querySelector("#dvlFvgClose").addEventListener("click", closePanel);
    panel.querySelector("#dvlFvgReset").addEventListener("click", reset);
    return panel;
  }
  function openPanel(){ ensurePanel(); try{ var wrap=document.getElementById("fxIndicatorWrap"); if(wrap) wrap.classList.remove("is-open"); }catch(_){} panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }

  function optSel(id,key,list){ var o=list.map(function(v){ return '<option value="'+v.v+'" '+(state[key]===v.v?"selected":"")+'>'+v.l+'</option>'; }).join(""); return '<select id="'+id+'" class="dvl-vt-select">'+o+'</select>'; }
  function fnum(id,key,mn,mx,step){ return '<input id="'+id+'" class="dvl-vt-input" type="number" min="'+mn+'" max="'+mx+'" step="'+step+'" value="'+state[key]+'">'; }
  function fld(label,ctrl){ return '<div class="dvl-vt-field"><label>'+label+'</label>'+ctrl+'</div>'; }

  function renderPanel(){
    ensurePanel();
    var body=panel.querySelector("#dvlFvgBody");
    body.innerHTML=''+
      section("Core",
        fld("Indicator",'<label class="dvl-switch"><input id="fvgOn" type="checkbox" '+(state.on?"checked":"")+'><i></i><b></b></label>')+
        fld("Source",optSel("fvgSource","sourceCandle",[{v:"middle",l:"Middle Candle"},{v:"displacement",l:"Displacement"},{v:"three",l:"Three Candle"}]))+
        fld("Size Mode",optSel("fvgSizeMode","sizeMode",[{v:"atr",l:"ATR"},{v:"ticks",l:"Ticks"},{v:"percent",l:"Percent"}]))+
        fld("Min Size",optSel("fvgMinSize","minSize",[{v:"all",l:"All"},{v:"tiny",l:"Tiny+"},{v:"small",l:"Small+"},{v:"medium",l:"Medium+"},{v:"large",l:"Large+"},{v:"custom",l:"Custom"}]))+
        fld("Custom Size",fnum("fvgCustomSize","customSize",0,50,0.05))+
        fld("Extend Bars",fnum("fvgExtendBars","extendBars",5,500,5))+
        fld("Max Zones",fnum("fvgMaxActiveZones","maxActiveZones",5,400,5))+
        fld("Bars Scan",fnum("fvgBarsToScan","barsToScan",100,5000,50))
      )+
      section("Flow",
        fld("Data Source",optSel("fvgDataSource","dataSource",[{v:"auto",l:"Auto"},{v:"aggTrades",l:"AggTrades"},{v:"lowerTf",l:"Lower TF"},{v:"reconstructed",l:"Reconstructed"}]))+
        fld("Cell Mode",optSel("fvgCellMode","cellMode",[{v:"auto",l:"Auto"},{v:"ticks",l:"Ticks"},{v:"price",l:"Price"},{v:"atrFraction",l:"ATR Fraction"}]))+
        fld("Max Cells",fnum("fvgMaxCells","maxCells",4,120,1))+
        fld("Reconstruction",'<label class="dvl-switch"><input id="fvgUseReconstruction" type="checkbox" '+(state.useReconstruction?"checked":"")+'><i></i><b></b></label>')
      )+
      section("Classification",
        fld("Valid ≥",fnum("fvgValidThreshold","validThreshold",50,100,1))+
        fld("Weak ≥",fnum("fvgWeakThreshold","weakThreshold",1,90,1))+
        fld("Min Rel Vol",fnum("fvgMinRelVol","minRelVol",0.1,5,0.1))+
        fld("Min Dominance",fnum("fvgMinDominance","minDominance",1,10,0.1))+
        fld("Max Opp Share",fnum("fvgMaxOppositeShare","maxOppositeShare",0.1,1,0.05))+
        fld("Use Delta",'<label class="dvl-switch"><input id="fvgUseDelta" type="checkbox" '+(state.useDelta?"checked":"")+'><i></i><b></b></label>')
      )+
      section("Weights",
        fld("Dominance",fnum("fvgWDominance","wDominance",0,50,1))+
        fld("Delta",fnum("fvgWDelta","wDelta",0,50,1))+
        fld("Opposite",fnum("fvgWOpposite","wOpposite",0,50,1))+
        fld("Displace",fnum("fvgWDisplace","wDisplace",0,50,1))+
        fld("Rel Vol",fnum("fvgWRelVol","wRelVol",0,50,1))+
        fld("Absorption",fnum("fvgWAbsorb","wAbsorb",0,50,1))+
        fld("POC",fnum("fvgWPoc","wPoc",0,50,1))
      )+
      section("Mitigation",
        fld("Mode",optSel("fvgMitigationMode","mitigationMode",[{v:"touch",l:"Touch"},{v:"fill50",l:"50% Fill"},{v:"closeMid",l:"Close Mid"},{v:"fullFill",l:"Full Fill"}]))+
        fld("Respect ATR",fnum("fvgRespectAtr","respectAtr",0,3,0.05))+
        fld("Hide Mitigated",'<label class="dvl-switch"><input id="fvgHideMitigated" type="checkbox" '+(state.hideMitigated?"checked":"")+'><i></i><b></b></label>')+
        fld("Stop Extend",'<label class="dvl-switch"><input id="fvgStopExtend" type="checkbox" '+(state.stopExtend?"checked":"")+'><i></i><b></b></label>')
      )+
      section("Visual",
        fld("Show VALID",'<label class="dvl-switch"><input id="fvgShowValid" type="checkbox" '+(state.showValid?"checked":"")+'><i></i><b></b></label>')+
        fld("Show WEAK",'<label class="dvl-switch"><input id="fvgShowWeak" type="checkbox" '+(state.showWeak?"checked":"")+'><i></i><b></b></label>')+
        fld("Show FAKE",'<label class="dvl-switch"><input id="fvgShowFake" type="checkbox" '+(state.showFake?"checked":"")+'><i></i><b></b></label>')+
        fld("Labels",'<label class="dvl-switch"><input id="fvgShowLabels" type="checkbox" '+(state.showLabels?"checked":"")+'><i></i><b></b></label>')+
        fld("Midline",'<label class="dvl-switch"><input id="fvgShowMidline" type="checkbox" '+(state.showMidline?"checked":"")+'><i></i><b></b></label>')+
        fld("Tooltip",'<label class="dvl-switch"><input id="fvgShowTooltip" type="checkbox" '+(state.showTooltip?"checked":"")+'><i></i><b></b></label>')+
        fld("Extend Right",'<label class="dvl-switch"><input id="fvgExtendRight" type="checkbox" '+(state.extendRight?"checked":"")+'><i></i><b></b></label>')+
        fld("Opacity",fnum("fvgOpacity","opacity",0.02,0.6,0.01))+
        fld("Border",fnum("fvgBorder","border",0.05,1,0.05))
      )+
      '<div class="dvl-sz-mini-note">Real footprint via server aggTrades when available; otherwise honest reconstruction (Estimated flow). Detection on candle close, cached scoring, visible-only render.</div>';
    bindPanel();
    try{ if(window.DVLIndicatorCustomControls && typeof window.DVLIndicatorCustomControls.upgrade==="function") window.DVLIndicatorCustomControls.upgrade(panel); }catch(_){}
  }
  function section(title,inner){ return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>'+title+'</span></div><div class="dvl-vt-grid">'+inner+'</div></div>'; }

  function bindPanel(){
    var map={
      fvgOn:["on","check"], fvgSource:["sourceCandle","text"], fvgSizeMode:["sizeMode","text"], fvgMinSize:["minSize","text"],
      fvgCustomSize:["customSize","num"], fvgExtendBars:["extendBars","int"], fvgMaxActiveZones:["maxActiveZones","int"], fvgBarsToScan:["barsToScan","int"],
      fvgDataSource:["dataSource","text"], fvgCellMode:["cellMode","text"], fvgMaxCells:["maxCells","int"], fvgUseReconstruction:["useReconstruction","check"],
      fvgValidThreshold:["validThreshold","int"], fvgWeakThreshold:["weakThreshold","int"], fvgMinRelVol:["minRelVol","num"], fvgMinDominance:["minDominance","num"],
      fvgMaxOppositeShare:["maxOppositeShare","num"], fvgUseDelta:["useDelta","check"],
      fvgWDominance:["wDominance","int"], fvgWDelta:["wDelta","int"], fvgWOpposite:["wOpposite","int"], fvgWDisplace:["wDisplace","int"], fvgWRelVol:["wRelVol","int"], fvgWAbsorb:["wAbsorb","int"], fvgWPoc:["wPoc","int"],
      fvgMitigationMode:["mitigationMode","text"], fvgRespectAtr:["respectAtr","num"], fvgHideMitigated:["hideMitigated","check"], fvgStopExtend:["stopExtend","check"],
      fvgShowValid:["showValid","check"], fvgShowWeak:["showWeak","check"], fvgShowFake:["showFake","check"], fvgShowLabels:["showLabels","check"],
      fvgShowMidline:["showMidline","check"], fvgShowTooltip:["showTooltip","check"], fvgExtendRight:["extendRight","check"], fvgOpacity:["opacity","num"], fvgBorder:["border","num"]
    };
    var rescanKeys={ sourceCandle:1,sizeMode:1,minSize:1,customSize:1,barsToScan:1,dataSource:1,cellMode:1,maxCells:1,useReconstruction:1,
      validThreshold:1,weakThreshold:1,minRelVol:1,minDominance:1,maxOppositeShare:1,useDelta:1,
      wDominance:1,wDelta:1,wOpposite:1,wDisplace:1,wRelVol:1,wAbsorb:1,wPoc:1,qualityPenalty:1,mitigationMode:1,respectAtr:1 };
    Object.keys(map).forEach(function(id){
      var el=panel.querySelector("#"+id); if(!el) return;
      var key=map[id][0], type=map[id][1];
      var sync=function(){
        if(type==="check") state[key]=!!el.checked;
        else if(type==="int") state[key]=parseInt(el.value,10)||DEFAULTS[key]||0;
        else if(type==="num") state[key]=Number(el.value)||DEFAULTS[key]||0;
        else state[key]=el.value;
        if(rescanKeys[key]){ var b=bucket(); b.list=[]; b.scannedTo=0; }
        save();
        requestRecompute();
      };
      el.addEventListener("change", sync);
      el.addEventListener("input", sync);
    });
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function boot(){ insertItem(); hookEvents(); bindTooltip(); if(state.on){ maybeFetchFlow(); requestRecompute(); } }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", function(){ setTimeout(boot,0); }, {once:true});
  else setTimeout(boot,0);
  // re-insert item if the dropdown is rebuilt after boot
  try{ window.addEventListener("dvl:indicators-rendered", insertItem, {passive:true}); }catch(_){}
})();
