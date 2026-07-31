(function(){
  "use strict";

  /*
    Adapted from uploaded dvl_spike_zones.js.
    Core kept: rolling volume average, volume ATR excess levels, source selection, merge, smart spacing,
    proximity grouping, HVS estimate and needle zone refinement.
  */
  const KEY = "dvl_spike_zones_v2";
  const TF_OPTIONS = ["chart","15s","30s","1m","3m","5m","15m","30m","1h","2h","4h","6h","12h","1d"];
  const SOURCE_OPTIONS = ["body","full","wick_dom","hvs"];
  const NEEDLE_MODE = ["inside","only","off"];
  const PALETTE = ["#5a96ff","#00d7ff","#00f5c8","#ffbc00","#ff37f5","#ff5a00","#ff334d","#b400ff","#fff000","#ffffff","#13dc8d","#7f91a7"];
  const DEFAULTS = {
    on:false,
    tf:"chart",
    histBars:1500,
    minLevel:1,
    sens:1.0,
    volMA:20,
    maxZones:200,
    source:"hvs",
    mergeDist:0.15,
    expire:0,
    maxTests:3,
    fillOpacity:0.16,
    borderOpacity:0.70,
    sourceOpacity:0.65,
    showSource:true,
    showLabels:false,
    spacingOn:true,
    spacingAtr:0.10,
    needleOn:true,
    needleMode:"inside",
    needleCapture:0.22,
    needleMinAtr:0.03,
    needleMaxAtr:0.18,
    proxOn:false,
    proxDist:0.35,
    colors:["#5a96ff","#00d7ff","#00f5c8","#ffbc00","#ff37f5"]
  };

  let state = load();
  let panel = null;
  let palette = null;
  let paletteIdx = null;
  let cacheKey = "";
  let cacheZones = [];
  let ext = { key:"", data:null, loading:false, error:null, loaded:0, want:0, ts:0, fallback:false };

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function tfMs(tf){
    if(tf === "chart"){
      try{ tf = typeof interval !== "undefined" ? interval : "1m"; }catch(_){ tf = "1m"; }
    }
    const m = String(tf || "1m").match(/^(\d+)(m|h|d|w)$/);
    if(!m) return 60000;
    const n = Math.max(1, Number(m[1]) || 1);
    const u = m[2];
    return u === "m" ? n*60000 : u === "h" ? n*3600000 : u === "d" ? n*86400000 : n*604800000;
  }
  function hexToRgb(h){
    h = String(h || "").replace("#","");
    if(h.length === 3) h = h.split("").map(x => x+x).join("");
    const n = parseInt(h, 16);
    if(!Number.isFinite(n)) return {r:24,g:215,b:255};
    return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
  }
  function rgba(c,a){ const r=hexToRgb(c); return `rgba(${r.r},${r.g},${r.b},${a})`; }
  function nf(v){
    v=Number(v)||0; const a=Math.abs(v);
    if(a>=1e9) return (a/1e9).toFixed(1)+"B";
    if(a>=1e6) return (a/1e6).toFixed(1)+"M";
    if(a>=1e3) return (a/1e3).toFixed(0)+"K";
    return v.toFixed(0);
  }
  function sym(){
    try{ return typeof symbol !== "undefined" ? symbol : "BTCUSDT"; }catch(_){ return "BTCUSDT"; }
  }
  function currentInterval(){
    try{ return typeof interval !== "undefined" ? interval : "1m"; }catch(_){ return "1m"; }
  }

  function normalize(s){
    const out = clone(DEFAULTS);
    if(s && typeof s === "object") Object.assign(out, s);
    out.on = out.on !== false;
    out.tf = TF_OPTIONS.includes(out.tf) ? out.tf : "chart";
    out.histBars = clamp(parseInt(out.histBars,10)||1500, 200, 5000);
    out.minLevel = clamp(parseInt(out.minLevel,10)||1, 1, 5);
    out.sens = clamp(Number(out.sens)||1, .3, 5);
    out.volMA = clamp(parseInt(out.volMA,10)||20, 3, 2000);
    out.maxZones = clamp(parseInt(out.maxZones,10)||80, 5, 500);
    out.source = SOURCE_OPTIONS.includes(out.source) ? out.source : "hvs";
    out.mergeDist = clamp(Number(out.mergeDist)||0, 0, 2);
    out.expire = clamp(parseInt(out.expire,10)||0, 0, 2000);
    out.maxTests = clamp(parseInt(out.maxTests,10)||3, 1, 20);
    out.fillOpacity = clamp(Number(out.fillOpacity)||.16, .01, 1);
    out.borderOpacity = clamp(Number(out.borderOpacity)||.70, .01, 1);
    out.sourceOpacity = clamp(Number(out.sourceOpacity)||.65, .01, 1);
    out.showSource = !!out.showSource;
    out.showLabels = !!out.showLabels;
    out.spacingOn = !!out.spacingOn;
    out.spacingAtr = clamp(Number(out.spacingAtr)||.25, 0, 3);
    out.needleOn = !!out.needleOn;
    out.needleMode = NEEDLE_MODE.includes(out.needleMode) ? out.needleMode : "inside";
    out.needleCapture = clamp(Number(out.needleCapture)||.22, .05, .60);
    out.needleMinAtr = clamp(Number(out.needleMinAtr)||.03, .005, .5);
    out.needleMaxAtr = clamp(Number(out.needleMaxAtr)||.18, .01, 1);
    out.proxOn = !!out.proxOn;
    out.proxDist = clamp(Number(out.proxDist)||1, .1, 5);
    out.colors = Array.isArray(out.colors) ? out.colors.slice(0,5) : DEFAULTS.colors.slice();
    while(out.colors.length < 5) out.colors.push(DEFAULTS.colors[out.colors.length]);
    out.colors = out.colors.map((c,i)=>/^#[0-9a-f]{6}$/i.test(String(c||"")) ? c : DEFAULTS.colors[i]);
    return out;
  }

  function load(){
    try{ return normalize(JSON.parse(localStorage.getItem(KEY) || "null")); }
    catch(_){ return clone(DEFAULTS); }
  }
  function save(){
    state = normalize(state);
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    cacheKey = "";
    updateItem();
    if(typeof drawSoon === "function") drawSoon();
    else if(typeof draw === "function") draw();
  }
  function reset(){
    state = clone(DEFAULTS);
    cacheKey = "";
    save();
    renderPanel();
  }

  function localCandles(){
    try{
      return klines.map((k,i)=>({
        t:Number(k.time), o:Number(k.open), h:Number(k.high), l:Number(k.low), c:Number(k.close), v:Number(k.volume)||0, index:i
      }));
    }catch(_){ return []; }
  }

  function targetTf(){
    return state.tf === "chart" ? currentInterval() : state.tf;
  }

  async function fetchTf(force){
    const tf = targetTf();
    const want = clamp(parseInt(state.histBars,10) || 1500, 200, 5000);
    const key = sym()+"|"+tf+"|"+want;

    if(!force && ext.key === key && ext.loading) return;
    if(!force && ext.key === key && Array.isArray(ext.data) && ext.data.length) return;

    ext = { key, data:null, loading:true, error:null, loaded:0, want, ts:Date.now(), fallback:false };
    updateSpikeStatus();

    try{
      let rows = null;

      /*
        Use the platform historical loader first.
        This is important because the chart already has a robust paginated Binance loader.
        Direct fetch is only fallback.
      */
      if(typeof fetchKlinesHistory === "function"){
        rows = await fetchKlinesHistory(sym(), tf, want);
      }

      if(!Array.isArray(rows) || !rows.length){
        let base = "https://fapi.binance.com";
        try{ if(typeof BINANCE !== "undefined") base = BINANCE; }catch(_){}

        let remaining = want;
        let endTime = null;
        let all = [];
        let guard = 0;

        while(remaining > 0 && guard < 5){
          const limit = Math.min(1500, remaining);
          let url = base + "/fapi/v1/klines?symbol=" + encodeURIComponent(sym()) + "&interval=" + encodeURIComponent(tf) + "&limit=" + limit;
          if(endTime != null) url += "&endTime=" + encodeURIComponent(endTime);

          const res = await fetch(url, {cache:"no-store"});
          const d = await res.json();
          if(!Array.isArray(d) || !d.length) break;

          all = d.concat(all);
          remaining -= d.length;
          guard += 1;

          const firstOpen = Number(d[0][0]);
          if(!Number.isFinite(firstOpen) || d.length < limit) break;
          endTime = firstOpen - 1;
        }

        rows = all;
      }

      const seen = new Set();
      ext.data = (Array.isArray(rows) ? rows : [])
        .map((x)=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],index:0}))
        .filter(c => Number.isFinite(c.t) && Number.isFinite(c.h) && Number.isFinite(c.l) && !seen.has(c.t) && seen.add(c.t))
        .sort((a,b)=>a.t-b.t)
        .map((c,i)=>Object.assign(c,{index:i}));

      ext.loaded = ext.data.length;
      ext.error = ext.loaded ? null : "empty";

    }catch(err){
      console.warn("DVL Spike Zones independent history fetch error", err);
      ext.data = null;
      ext.loaded = 0;
      ext.error = err && err.message ? err.message : "fetch error";
      setTimeout(function(){ try{ fetchTf(true); }catch(_){} }, 3500);
    }finally{
      ext.loading = false;
      cacheKey = "";
      updateSpikeStatus();
      if(typeof drawSoon === "function") drawSoon();
      else if(typeof draw === "function") draw();
    }
  }

  function platformRealHistoryFallback(){
    /*
      Fallback is NOT the visible window.
      It is the complete real klines array already loaded by the platform.
      This prevents endless Waiting when content:// or mobile browser blocks direct API fetch.
    */
    const lc = localCandles();
    if(Array.isArray(lc) && lc.length >= 50){
      return lc.map((c,i)=>Object.assign({}, c, { index:i }));
    }
    return [];
  }

  function sourceCandles(){
    fetchTf(false);

    if(Array.isArray(ext.data) && ext.data.length){
      ext.fallback = false;
      return ext.data;
    }

    const fallback = platformRealHistoryFallback();
    if(fallback.length){
      ext.fallback = true;
      ext.loaded = fallback.length;
      ext.error = null;
      updateSpikeStatus();
      return fallback;
    }

    return [];
  }

  function updateSpikeStatus(){
    const el = document.getElementById("dvlSzHistoryStatus");
    if(!el) return;

    if(Array.isArray(ext.data) && ext.data.length){
      el.textContent = "Independent history: " + ext.data.length + " candles · " + targetTf() + " · cap " + state.maxZones;
      el.classList.remove("is-loading");
      return;
    }

    const fallback = platformRealHistoryFallback();
    if(fallback.length){
      el.textContent = "Using full real chart history: " + fallback.length + " candles · cap " + state.maxZones;
      el.classList.remove("is-loading");
      return;
    }

    if(ext.loading){
      el.textContent = "Loading real history…";
      el.classList.add("is-loading");
      return;
    }

    el.classList.remove("is-loading");

    if(ext.error){
      el.textContent = "API history blocked/empty · waiting for platform candles";
      return;
    }

    el.textContent = "Waiting for real candles…";
  }

  function hvsEstimate(c, atr){
    const range = c.h - c.l;
    if(range <= 0) return null;
    const bHi = Math.max(c.o,c.c), bLo = Math.min(c.o,c.c), bR = bHi - bLo;
    const uw = c.h - bHi, lw = bLo - c.l;
    const isBull = c.c >= c.o;
    const bScore = (bR/range) * 1.10;
    const uwScore = uw > range*.12 ? (uw/range) * (isBull ? .70 : 1.50) : 0;
    const lwScore = lw > range*.12 ? (lw/range) * (isBull ? 1.50 : .70) : 0;
    let lo, hi, poc;
    if(bScore >= uwScore && bScore >= lwScore){
      poc = c.c;
      const hw = Math.max(bR*.55, atr*.04);
      lo = Math.max(c.l, poc - hw); hi = Math.min(c.h, poc + hw);
    }else if(uwScore >= lwScore){
      hi = c.h; lo = c.h - uw*.54; poc = (hi + lo)/2;
    }else{
      lo = c.l; hi = c.l + lw*.54; poc = (hi + lo)/2;
    }
    if(hi <= lo){ const m=(hi+lo)/2; hi=m+atr*.06; lo=m-atr*.06; }
    return {hi, lo, poc};
  }

  function needleEstimate(c, atr, rawHi, rawLo){
    const range = c.h - c.l;
    if(range <= 0 || atr <= 0) return null;
    const bHi = Math.max(c.o,c.c), bLo = Math.min(c.o,c.c), bR = bHi - bLo;
    const uw = c.h - bHi, lw = bLo - c.l;
    const isBull = c.c >= c.o;
    function intersect(aLo,aHi,bLo2,bHi2){
      const lo = Math.max(aLo,bLo2), hi = Math.min(aHi,bHi2);
      return hi > lo ? {lo,hi,mid:(lo+hi)/2} : null;
    }
    const regions = [];
    const body = bR > 0 ? intersect(bLo,bHi,rawLo,rawHi) : null;
    if(body) regions.push({ ...body, score:(body.hi-body.lo)/range*1.15 + (1-Math.abs(body.mid-c.c)/range)*.2, poc:c.c });
    const up = uw > 0 ? intersect(bHi,c.h,rawLo,rawHi) : null;
    if(up) regions.push({ ...up, score:(up.hi-up.lo)/range*(isBull?.45:1.70) + (uw > bR*2 ? .35 : 0), poc:c.h-uw*.25 });
    const low = lw > 0 ? intersect(c.l,bLo,rawLo,rawHi) : null;
    if(low) regions.push({ ...low, score:(low.hi-low.lo)/range*(isBull?1.70:.45) + (lw > bR*2 ? .35 : 0), poc:c.l+lw*.25 });
    if(!regions.length) return null;
    regions.sort((a,b)=>b.score-a.score);
    const best = regions[0];
    let half = Math.max(atr*state.needleMinAtr*.5, (best.hi-best.lo)*.4);
    half = Math.min(half, atr*(state.needleMinAtr+state.needleMaxAtr)/4);
    const center = clamp(best.poc, best.lo, best.hi);
    let hi = Math.min(center + half, rawHi), lo = Math.max(center - half, rawLo);
    const minH = atr*state.needleMinAtr, maxH = atr*state.needleMaxAtr;
    let h = hi - lo;
    if(h < minH){ const m=(hi+lo)/2; hi=Math.min(m+minH/2,rawHi); lo=Math.max(m-minH/2,rawLo); }
    if(h > maxH){ const m=(hi+lo)/2; hi=Math.min(m+maxH/2,rawHi); lo=Math.max(m-maxH/2,rawLo); }
    if(hi <= lo) return null;
    return {hi, lo, mid:(hi+lo)/2, score:best.score};
  }

  function detect(cs){
    const n = cs.length;
    if(n < 12) return [];
    const volLen = state.volMA, atrLen = 14;
    const volMA = new Array(n).fill(0);
    const volATR = new Array(n).fill(0);
    const atr = new Array(n).fill(0);
    let vs=0, vas=0, trs=0;

    for(let i=0;i<n;i++){
      vs += cs[i].v;
      if(i >= volLen) vs -= cs[i-volLen].v;
      volMA[i] = vs / Math.min(i+1, volLen);

      const vd = i > 0 ? Math.abs(cs[i].v - cs[i-1].v) : 0;
      vas += vd;
      if(i >= volLen){
        const old = i-volLen;
        vas -= old > 0 ? Math.abs(cs[old].v - cs[old-1].v) : 0;
      }
      volATR[i] = vas / Math.min(i+1, volLen);

      const pc = i > 0 ? cs[i-1].c : cs[i].o;
      const tr = Math.max(cs[i].h-cs[i].l, Math.abs(cs[i].h-pc), Math.abs(cs[i].l-pc));
      trs += tr;
      if(i >= atrLen){
        const oc = cs[i-atrLen], op = i > atrLen ? cs[i-atrLen-1].c : oc.o;
        trs -= Math.max(oc.h-oc.l, Math.abs(oc.h-op), Math.abs(oc.l-op));
      }
      atr[i] = trs / Math.min(i+1, atrLen);
    }

    const out = [];
    const warm = atrLen;
    for(let i=warm;i<n;i++){
      const c = cs[i], vm = volMA[i] || 1, va = volATR[i] || 0, at = atr[i] || Math.max(c.h-c.l, 1);
      if(c.v <= vm) continue;
      const ex = va > 0 ? (c.v - vm) / va : 0;
      const s = state.sens;
      let lvl = ex>=20*s?10:ex>=15*s?9:ex>=11*s?8:ex>=8*s?7:ex>=6*s?6:ex>=4.8*s?5:ex>=3.6*s?4:ex>=2.4*s?3:ex>=1.2*s?2:1;
      lvl = lvl>=10?5:lvl>=9?4:lvl>=7?3:lvl>=5?2:lvl>=2?1:0;
      if(lvl < state.minLevel) continue;

      let hi, lo;
      if(state.source === "body"){
        hi = Math.max(c.o,c.c); lo = Math.min(c.o,c.c);
      }else if(state.source === "full"){
        hi = c.h; lo = c.l;
      }else if(state.source === "wick_dom"){
        const uw = c.h - Math.max(c.o,c.c), lw = Math.min(c.o,c.c) - c.l;
        if(uw > lw){ hi = c.h; lo = Math.max(c.o,c.c); }
        else { hi = Math.min(c.o,c.c); lo = c.l; }
      }else{
        const hvs = hvsEstimate(c, at);
        if(hvs){ hi = hvs.hi; lo = hvs.lo; }
        else { hi = Math.max(c.o,c.c); lo = Math.min(c.o,c.c); }
      }
      if(hi <= lo){ const m=(c.o+c.c)/2; hi=m+at*.01; lo=m-at*.01; }

      if(state.source !== "body" && at > 0 && (hi-lo) > at*1.5){
        const m = (Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;
        hi = m + at*.75; lo = m - at*.75;
      }

      const needle = state.needleOn ? needleEstimate(c, at, hi, lo) : null;
      out.push({
        id:i, srcIdx:i, srcTs:c.t, level:lvl, rawScore:ex, hi, lo, mid:(hi+lo)/2,
        dir:c.c>c.o?"bull":c.c<c.o?"bear":"neutral", vol:c.v, atr:at,
        needleHi:needle?needle.hi:null, needleLo:needle?needle.lo:null, needleMid:needle?needle.mid:null,
        needleScore:needle?needle.score:0
      });
    }

    out.sort((a,b)=>b.srcIdx-a.srcIdx);
    return finalize(merge(out), cs);
  }

  function zoneScore(z){
    return z.level*100000 + (z.rawScore||0)*1000 + (z.vol||0)/1000 + (z.needleScore||0)*300;
  }

  function merge(zones){
    if(!zones.length || state.mergeDist <= 0) return zones;
    const used = new Uint8Array(zones.length), merged = [];
    for(let i=0;i<zones.length;i++){
      if(used[i]) continue;
      const z = Object.assign({}, zones[i], {srcIdxs:[zones[i].srcIdx]});
      const mt = (z.atr || 1) * state.mergeDist;
      for(let j=i+1;j<zones.length;j++){
        if(used[j]) continue;
        const o = zones[j];
        if(o.lo <= z.hi + mt && o.hi >= z.lo - mt){
          used[j]=1;
          z.srcIdxs.push(o.srcIdx);
          z.hi = Math.max(z.hi,o.hi); z.lo = Math.min(z.lo,o.lo); z.mid = (z.hi+z.lo)/2;
          if(o.level > z.level || zoneScore(o) > zoneScore(z)){
            z.level = Math.max(z.level,o.level);
            z.rawScore = Math.max(z.rawScore,o.rawScore);
            z.vol = Math.max(z.vol,o.vol);
          }
          if((o.needleScore||0) > (z.needleScore||0)){
            z.needleHi=o.needleHi; z.needleLo=o.needleLo; z.needleMid=o.needleMid; z.needleScore=o.needleScore;
          }
        }
      }
      merged.push(z);
    }
    return merged;
  }

  function finalize(zones, cs){
    const now = cs.length-1;
    const final = [];
    zones.forEach(z=>{
      z.age = Math.max(0, now - Math.min(z.srcIdx, now));
      if(state.expire > 0 && z.age > state.expire) return;
      let tests = 0;
      const end = Math.min(cs.length-1, z.srcIdx + (state.expire || 250) + 5);
      for(let k=z.srcIdx+1;k<=end;k++){
        const c = cs[k];
        if(c && c.l <= z.hi && c.h >= z.lo) tests++;
      }
      z.tests = tests;
      z.status = tests === 0 ? "fresh" : tests < state.maxTests ? "tested" : "weakened";
      final.push(z);
    });

    let out = final;
    if(state.spacingOn) out = spacing(out);
    if(state.proxOn) out = proximity(out);

    /*
      Keep more zones across the real historical range.
      Do not take only the strongest zones globally, because that can hide nearly all
      zones in the currently visible area.
    */
    out.sort((a,b)=>b.srcIdx-a.srcIdx);
    return out.slice(0, state.maxZones);
  }

  function spacing(zones){
    if(zones.length < 2) return zones;
    const avgAtr = zones.reduce((a,z)=>a+(z.atr||0),0)/zones.length || 1;
    const minGap = avgAtr * state.spacingAtr;
    const by = zones.slice().sort((a,b)=>zoneScore(b)-zoneScore(a));
    const keep = [];
    by.forEach(z=>{
      if(!keep.some(k=>Math.abs(k.mid-z.mid)<minGap)) keep.push(z);
    });
    return keep;
  }

  function proximity(zones){
    if(zones.length < 2) return zones;
    const avgAtr = zones.reduce((a,z)=>a+(z.atr||0),0)/zones.length || 1;
    const thresh = avgAtr * state.proxDist;
    const sorted = zones.slice().sort((a,b)=>a.lo-b.lo);
    const used = new Uint8Array(sorted.length), out = [];
    for(let i=0;i<sorted.length;i++){
      if(used[i]) continue;
      used[i]=1;
      let z = Object.assign({}, sorted[i]);
      let count = 1;
      for(let j=i+1;j<sorted.length;j++){
        if(used[j]) continue;
        const o = sorted[j];
        if(o.lo <= z.hi + thresh && o.hi >= z.lo - thresh){
          used[j]=1; count++;
          z.hi = Math.max(z.hi,o.hi); z.lo = Math.min(z.lo,o.lo); z.mid=(z.hi+z.lo)/2;
          if(zoneScore(o)>zoneScore(z)){
            z.level=Math.max(z.level,o.level); z.vol=Math.max(z.vol,o.vol); z.rawScore=Math.max(z.rawScore,o.rawScore);
            z.needleHi=o.needleHi; z.needleLo=o.needleLo; z.needleMid=o.needleMid; z.needleScore=o.needleScore;
          }
          z.srcIdx = Math.min(z.srcIdx,o.srcIdx);
          z.srcTs = Math.min(z.srcTs,o.srcTs);
        }
      }
      if(count>1){ z.isProxMerged = true; z.proxCount = count; }
      out.push(z);
    }
    return out;
  }

  function findChartIndexByTime(ts){
    try{
      const arr = klines;
      if(!arr || !arr.length) return NaN;

      const first = Number(arr[0].time);
      const last = Number(arr[arr.length-1].time);
      const step = tfMs("chart");

      /*
        Independent history can be older than currently loaded chart candles.
        Older zones are still real: render them from the left visible edge.
        Future/non-loaded zones are ignored.
      */
      if(ts < first) return -1000000000;
      if(ts > last + step) return Infinity;

      let lo=0, hi=arr.length-1;
      while(lo<hi){
        const m=(lo+hi)>>1;
        if(Number(arr[m].time) < ts) lo=m+1;
        else hi=m;
      }
      if(lo>0 && Math.abs(Number(arr[lo-1].time)-ts) < Math.abs(Number(arr[lo].time)-ts)) lo--;
      return lo;
    }catch(_){ return NaN; }
  }

  function compute(){
    const cs = sourceCandles();
    if(!cs || cs.length < 12) return [];
    let s = "BTCUSDT", tf = state.tf;
    try{ s = sym(); }catch(_){}
    const last = cs[cs.length-1];
    const key = [
      s, tf, cs.length, last ? last.t : 0, last ? last.v : 0,
      state.minLevel,state.sens,state.volMA,state.maxZones,state.source,state.mergeDist,state.expire,state.maxTests,
      state.fillOpacity,state.borderOpacity,state.showSource,state.showLabels,state.spacingOn,state.spacingAtr,
      state.needleOn,state.needleMode,state.needleCapture,state.needleMinAtr,state.needleMaxAtr,state.proxOn,state.proxDist,
      state.colors.join(",")
    ].join("|");
    if(key === cacheKey) return cacheZones;
    cacheZones = detect(cs);
    cacheKey = key;
    return cacheZones;
  }

  function draw(ctx, cfg){
    if(!state.on || !cfg || !cfg.win) return;
    const zones = compute();
    if(!zones.length) return;

    const rpLimit = cfg.x1 - 4;
    const leftLimit = cfg.x0;
    const visibleStart = cfg.win.start;
    const visibleEnd = cfg.win.end;

    ctx.save();
    zones.forEach(z=>{
      const sourceIdx = findChartIndexByTime(z.srcTs);
      if(!Number.isFinite(sourceIdx) && sourceIdx !== -1000000000) return;
      if(sourceIdx === Infinity || sourceIdx > visibleEnd + 2) return;

      const local = sourceIdx - visibleStart;
      let xL = sourceIdx <= visibleStart ? leftLimit : cfg.x(cfg.slotOffset + local - .5);
      const xR = rpLimit;
      if(xL < leftLimit) xL = leftLimit;
      if(xL >= xR) return;

      const yTop = cfg.y(z.hi), yBot = cfg.y(z.lo);
      if(yTop >= cfg.y1 || yBot <= cfg.y0) return;

      const color = state.colors[clamp(z.level,1,5)-1] || state.colors[4];
      let fill = state.fillOpacity, border = state.borderOpacity;
      if(z.status === "weakened"){ fill *= .42; border *= .42; }
      else if(z.status === "tested"){ fill *= .76; border *= .76; }

      const onlyNeedle = state.needleOn && state.needleMode === "only" && z.needleHi != null && z.needleLo != null;

      if(!onlyNeedle){
        ctx.fillStyle = rgba(color, fill);
        ctx.fillRect(xL, yTop, xR-xL, Math.max(1, yBot-yTop));
        ctx.lineWidth = z.level >= 5 ? 2 : z.level >= 3 ? 1.35 : 1;
        ctx.setLineDash(z.status === "weakened" ? [3,3] : []);
        ctx.strokeStyle = rgba(color, border);
        ctx.beginPath();
        ctx.moveTo(xL,yTop); ctx.lineTo(xR,yTop);
        ctx.moveTo(xL,yBot); ctx.lineTo(xR,yBot);
        ctx.stroke();
        ctx.setLineDash([]);

        if(yBot-yTop > 3){
          ctx.lineWidth = .6;
          ctx.setLineDash([2,3]);
          ctx.strokeStyle = rgba(color, border*.45);
          const ym = (yTop+yBot)/2;
          ctx.beginPath(); ctx.moveTo(xL,ym); ctx.lineTo(xR,ym); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      if(state.needleOn && state.needleMode !== "off" && z.needleHi != null && z.needleLo != null){
        let ny1 = clamp(cfg.y(z.needleHi), yTop, yBot-1);
        let ny2 = clamp(cfg.y(z.needleLo), yTop+1, yBot);
        if(ny2-ny1 < 2){ const m=(ny1+ny2)/2; ny1=m-1; ny2=m+1; }
        ctx.fillStyle = rgba(color, Math.min(.98, state.fillOpacity*2.8));
        ctx.fillRect(xL, ny1, xR-xL, Math.max(1, ny2-ny1));
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(color, Math.min(.98, state.borderOpacity*1.55));
        ctx.beginPath(); ctx.moveTo(xL,ny1); ctx.lineTo(xR,ny1); ctx.moveTo(xL,ny2); ctx.lineTo(xR,ny2); ctx.stroke();
      }

      if(state.showLabels){
        const ym = state.needleOn && z.needleMid ? cfg.y(z.needleMid) : (yTop+yBot)/2;
        const lbl = "L" + z.level + (state.tf !== "chart" ? " · " + state.tf.toUpperCase() : "") + " · $" + nf(z.vol);
        ctx.font = "800 9px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rgba(color, Math.min(1, border*1.1));
        ctx.fillText(lbl, xL + 5, ym);
      }

      if(state.showSource && sourceIdx >= visibleStart-2 && sourceIdx <= visibleEnd+2){
        const c = localCandles()[sourceIdx];
        if(c){
          const cx = cfg.x(cfg.slotOffset + local);
          ctx.save();
          ctx.shadowColor = rgba(color, .55);
          ctx.shadowBlur = z.level >= 3 ? 4 : 2;
          ctx.strokeStyle = rgba(color, state.sourceOpacity);
          ctx.lineWidth = z.level >= 4 ? 1.6 : 1.1;
          ctx.beginPath();
          ctx.moveTo(cx, cfg.y(c.h));
          ctx.lineTo(cx, cfg.y(c.l));
          ctx.stroke();
          ctx.restore();
        }
      }
    });
    ctx.restore();
  }

  function updateItem(){
    const st = document.getElementById("dvlSzState");
    if(st){
      st.textContent = state.on ? "ON" : "OFF";
      st.setAttribute("aria-label", state.on ? "DVL Spike Zones ON" : "DVL Spike Zones OFF");
      st.classList.toggle("is-on", !!state.on);
    }
  }

  function insertItem(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu || document.getElementById("dvlSpikeZonesItem")) return;

    const item = document.createElement("div");
    item.id = "dvlSpikeZonesItem";
    item.className = "indicatorItem dvl-sz-indicator-item";
    item.innerHTML = `
      <span class="indicatorFxMark">SZ</span>
      <span><b>DVL Spike Zones</b><small>overlay</small></span>
      <i class="dvl-vt-state" id="dvlSzState">ON</i>
    `;

    const vt = document.getElementById("dvlVolumeTraceItem");
    if(vt && vt.parentNode) vt.parentNode.insertBefore(item, vt.nextSibling);
    else {
      const head = menu.querySelector(".indicatorDropHead");
      if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling);
      else menu.appendChild(item);
    }

    const pill = item.querySelector("#dvlSzState");
    if(pill){
      pill.addEventListener("click", ev => {
        ev.preventDefault(); ev.stopPropagation();
        state.on = !state.on;
        save();
      });
    }

    item.addEventListener("click", ev => {
      ev.stopPropagation();
      openPanel();
    });

    updateItem();
  }

  function ensurePanel(){
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "dvlSpikeZonesPanel";
    panel.className = "dvl-vt-panel dvl-sz-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title"><b>DVL Spike Zones</b><small>volume imbalance zones</small></div>
        <div class="dvl-vt-head-actions">
          <button class="dvl-vt-reset-icon" id="dvlSzReset" type="button" aria-label="Reset DVL Spike Zones">↻</button>
          <button class="dvl-vt-close" id="dvlSzClose" type="button">×</button>
        </div>
      </div>
      <div class="dvl-vt-body" id="dvlSzBody"></div>
    `;
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlSzClose").addEventListener("click", closePanel);
    panel.querySelector("#dvlSzReset").addEventListener("click", reset);
    return panel;
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }

  function opts(list, current){
    return list.map(v=>{
      const label = v === "chart" ? "Chart TF" : v === "wick_dom" ? "Dominant Wick" : v === "hvs" ? "HV Segment" : v === "inside" ? "Inside" : v === "only" ? "Only Needle" : v === "off" ? "Off" : v;
      return `<option value="${v}" ${v===current?"selected":""}>${label}</option>`;
    }).join("");
  }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlSzBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="szOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>TF</label><select id="szTf" class="dvl-vt-select">${opts(TF_OPTIONS,state.tf)}</select></div>
          <div class="dvl-vt-field"><label>Source</label><select id="szSource" class="dvl-vt-select">${opts(SOURCE_OPTIONS,state.source)}</select></div>
          <div class="dvl-vt-field"><label>Min Level</label><input id="szMinLevel" class="dvl-vt-input" type="number" min="1" max="5" step="1" value="${state.minLevel}"></div>
          <div class="dvl-vt-field"><label>Sens</label><input id="szSens" class="dvl-vt-input" type="number" min="0.3" max="5" step="0.1" value="${state.sens}"></div>
          <div class="dvl-vt-field"><label>Vol MA</label><input id="szVolMA" class="dvl-vt-input" type="number" min="3" max="2000" step="1" value="${state.volMA}"></div>
          <div class="dvl-vt-field"><label>Max Zones</label><input id="szMaxZones" class="dvl-vt-input" type="number" min="5" max="500" step="1" value="${state.maxZones}"></div>
          <div class="dvl-vt-field"><label>Real History</label><input id="szHistBars" class="dvl-vt-input" type="number" min="200" max="5000" step="100" value="${state.histBars}"></div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Visual</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Labels</label><label class="dvl-switch"><input id="szLabels" type="checkbox" ${state.showLabels?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Source Mark</label><label class="dvl-switch"><input id="szSourceMark" type="checkbox" ${state.showSource?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Needle</label><label class="dvl-switch"><input id="szNeedleOn" type="checkbox" ${state.needleOn?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Needle Mode</label><select id="szNeedleMode" class="dvl-vt-select">${opts(NEEDLE_MODE,state.needleMode)}</select></div>
          <div class="dvl-vt-field"><label>Fill</label><input id="szFillOpacity" class="dvl-vt-input" type="number" min="0.01" max="1" step="0.01" value="${state.fillOpacity}"></div>
          <div class="dvl-vt-field"><label>Border</label><input id="szBorderOpacity" class="dvl-vt-input" type="number" min="0.01" max="1" step="0.01" value="${state.borderOpacity}"></div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Filter</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Merge ATR</label><input id="szMerge" class="dvl-vt-input" type="number" min="0" max="2" step="0.01" value="${state.mergeDist}"></div>
          <div class="dvl-vt-field"><label>Expire 0=OFF</label><input id="szExpire" class="dvl-vt-input" type="number" min="0" max="2000" step="10" value="${state.expire}"></div>
          <div class="dvl-vt-field"><label>Max Tests</label><input id="szMaxTests" class="dvl-vt-input" type="number" min="1" max="20" step="1" value="${state.maxTests}"></div>
          <div class="dvl-vt-field"><label>Spacing</label><label class="dvl-switch"><input id="szSpacingOn" type="checkbox" ${state.spacingOn?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Spacing ATR</label><input id="szSpacingAtr" class="dvl-vt-input" type="number" min="0" max="3" step="0.01" value="${state.spacingAtr}"></div>
          <div class="dvl-vt-field"><label>Proximity</label><label class="dvl-switch"><input id="szProxOn" type="checkbox" ${state.proxOn?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Prox ATR</label><input id="szProxDist" class="dvl-vt-input" type="number" min="0.1" max="5" step="0.1" value="${state.proxDist}"></div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Levels</span></div>
        <div class="dvl-sz-color-grid">
          ${state.colors.map((c,i)=>`
            <div class="dvl-sz-color-cell">
              <b>L${i+1}</b>
              <button type="button" class="dvl-sz-color-btn" data-color="${i}" aria-label="Level ${i+1} color"><i style="background:${c}"></i></button>
            </div>
          `).join("")}
        </div>
        <div class="dvl-sz-mini-note">Based on uploaded Spike Zones logic: volume excess, ATR spacing, merge and needle core.</div>
        <div class="dvl-sz-history-status" id="dvlSzHistoryStatus">Waiting for real history…</div>
      </div>
    `;

    bindPanel();

    try{
      if(window.DVLIndicatorCustomControls && typeof window.DVLIndicatorCustomControls.upgrade === "function"){
        window.DVLIndicatorCustomControls.upgrade(panel);
      }
    }catch(_){}
  }

  function bindPanel(){
    const map = {
      szOn:["on","check"], szTf:["tf","text"], szSource:["source","text"], szMinLevel:["minLevel","int"],
      szSens:["sens","num"], szVolMA:["volMA","int"], szMaxZones:["maxZones","int"], szHistBars:["histBars","int"],
      szLabels:["showLabels","check"], szSourceMark:["showSource","check"], szNeedleOn:["needleOn","check"], szNeedleMode:["needleMode","text"],
      szFillOpacity:["fillOpacity","num"], szBorderOpacity:["borderOpacity","num"], szMerge:["mergeDist","num"], szExpire:["expire","int"],
      szMaxTests:["maxTests","int"], szSpacingOn:["spacingOn","check"], szSpacingAtr:["spacingAtr","num"], szProxOn:["proxOn","check"], szProxDist:["proxDist","num"]
    };
    Object.keys(map).forEach(id=>{
      const el = panel.querySelector("#"+id);
      if(!el) return;
      const [key,type] = map[id];
      const sync = () => {
        if(type === "check") state[key] = !!el.checked;
        else if(type === "int") state[key] = parseInt(el.value,10) || DEFAULTS[key] || 1;
        else if(type === "num") state[key] = Number(el.value) || DEFAULTS[key] || 0;
        else state[key] = el.value;
        if(key === "tf" || key === "histBars"){
          ext = { key:"", data:null, loading:false, error:null, loaded:0, want:0, ts:0, fallback:false };
          save();
          fetchTf(true);
          return;
        }
        save();
      };
      el.addEventListener("change", sync);
      el.addEventListener("input", sync);
    });

    panel.querySelectorAll(".dvl-sz-color-btn").forEach(btn=>{
      btn.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        openPalette(Number(btn.dataset.color), btn);
      });
    });
  }

  function ensurePalette(){
    if(palette) return palette;
    palette = document.createElement("div");
    palette.id = "dvlSzPalette";
    palette.className = "dvl-sz-palette";
    palette.innerHTML = `<div class="dvl-sz-palette-grid">${PALETTE.map(c=>`<button type="button" class="dvl-sz-swatch" data-color="${c}" style="background:${c}"></button>`).join("")}</div>`;
    document.body.appendChild(palette);
    palette.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    palette.addEventListener("click", ev=>{
      const sw = ev.target.closest(".dvl-sz-swatch");
      if(!sw || paletteIdx == null) return;
      state.colors[paletteIdx] = sw.dataset.color;
      save();
      renderPanel();
      closePalette();
    });
    return palette;
  }
  function openPalette(idx, anchor){
    ensurePalette();
    paletteIdx = idx;
    const r = anchor.getBoundingClientRect();
    const w = 154;
    palette.style.left = Math.max(5, Math.min(window.innerWidth - w - 5, r.left)) + "px";
    palette.style.top = Math.min(window.innerHeight - 180, r.bottom + 5) + "px";
    palette.classList.add("is-open");
  }
  function closePalette(){
    if(palette) palette.classList.remove("is-open");
    paletteIdx = null;
  }

  function boot(){
    insertItem();
    updateItem();
    fetchTf(false);
    setInterval(function(){
      updateSpikeStatus();
      if(!ext.loading && (!ext.data || !ext.data.length)) fetchTf(false);
    }, 2500);
    document.addEventListener("pointerdown", ev=>{
      if(palette && !ev.target.closest(".dvl-sz-palette") && !ev.target.closest(".dvl-sz-color-btn")) closePalette();
    }, true);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLSpikeZones = {
    version:"0.577",
    get state(){ return state; },
    open:openPanel,
    reset,
    draw,
    fetchHistory:function(){ return fetchTf(true); },
    status:function(){ return { key:ext.key, loading:ext.loading, loaded:ext.loaded || (ext.data ? ext.data.length : 0), fallback:!!ext.fallback, error:ext.error || null }; },
    invalidate:function(){ cacheKey = ""; ext = { key:"", data:null, loading:false, error:null, loaded:0, want:0, ts:0, fallback:false }; fetchTf(true); }
  };
  window.DVLSpikeZonesDraw = draw;
})();
