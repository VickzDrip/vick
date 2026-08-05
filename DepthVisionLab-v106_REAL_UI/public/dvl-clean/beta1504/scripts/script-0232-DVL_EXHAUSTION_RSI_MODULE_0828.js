(function(){
  "use strict";
  if(window.DVLExhaustionRSI) return;

  var KEY = "DVL_EXHAUSTION_RSI_0828";
  var TF_OPTIONS = ["Chart","1m","3m","5m","15m","30m","1h","4h","1D"];
  var cache = { key:"", data:null, loading:false, error:null, ts:0 };
  var panel = null;

  var DEFAULTS = {
    on:false,
    calculationTF:"Chart",
    mtfVolSpikeAt:2.5,
    arionSpikeLevelWeight:false,
    arionSpikeLevels:[true,true,true,true,true,true,true,true,true,true],
    proExtendedScale:true,
    proExtension:100,
    proLevelStep:25,
    mtfVolMaLen:20,
    mtfPush:18,
    mtfRsiLen:14,
    impulseLength:8,
    atrLength:14,
    minImpulseATR:1.20,
    volumeMALength:20,
    volumeSpikeMultiplier:1.60,
    minWickPct:0.34,
    maxBodyPct:0.56,
    weakClosePct:0.34,
    absorptionStrength:1.00,
    minVolumeForAbsorption:1.35,
    maxRangeATRForAbsorption:0.78,
    smoothingLength:5,
    decayToNeutral:0.16,
    buyExhaustionWeight:1.00,
    sellExhaustionWeight:1.00,
    volumeWeight:1.00,
    wickWeight:1.00,
    absorptionWeight:1.00,
    impulseWeight:1.00,
    showUpperZone:true,
    showLowerZone:true,
    upperZoneLevel:60,
    lowerZoneLevel:35,
    midlineLevel:50,
    lineWidth:2,
    glowStrength:0.55,
    bullExhaustionColor:"#ff4a61",
    bearExhaustionColor:"#10df77",
    neutralLineColor:"#b9c7c1",
    autoFitPanel:true
  };

  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function finite(v,d,min,max){
    v = Number(v);
    if(!Number.isFinite(v)) v = d;
    if(Number.isFinite(min)) v = Math.max(min,v);
    if(Number.isFinite(max)) v = Math.min(max,v);
    return v;
  }
  function bool(v,d){ return typeof v === "boolean" ? v : d; }
  function normalize(s){
    var o = clone(DEFAULTS);
    if(s && typeof s === "object") Object.assign(o,s);
    o.on = !!o.on;
    o.calculationTF = TF_OPTIONS.indexOf(o.calculationTF) >= 0 ? o.calculationTF : "Chart";
    o.mtfVolSpikeAt = finite(o.mtfVolSpikeAt,2.5,1.3,8);
    o.arionSpikeLevelWeight = bool(o.arionSpikeLevelWeight,false);
    if(!Array.isArray(o.arionSpikeLevels) || o.arionSpikeLevels.length !== 10){
      o.arionSpikeLevels = [true,true,true,true,true,true,true,true,true,true];
    }else{
      o.arionSpikeLevels = o.arionSpikeLevels.slice(0,10).map(function(v){ return !!v; });
    }
    o.proExtendedScale = bool(o.proExtendedScale,true);
    o.proExtension = Math.round(finite(o.proExtension,100,25,500));
    o.proLevelStep = Math.round(finite(o.proLevelStep,25,5,100));
    o.mtfVolMaLen = Math.round(finite(o.mtfVolMaLen,20,3,5000));
    o.mtfPush = Math.round(finite(o.mtfPush,18,0,40));
    o.mtfRsiLen = Math.round(finite(o.mtfRsiLen,14,2,50));
    o.impulseLength = Math.round(finite(o.impulseLength,8,2,80));
    o.atrLength = Math.round(finite(o.atrLength,14,3,100));
    o.minImpulseATR = finite(o.minImpulseATR,1.20,0.10,8);
    o.volumeMALength = Math.round(finite(o.volumeMALength,20,3,5000));
    o.volumeSpikeMultiplier = finite(o.volumeSpikeMultiplier,1.60,1,8);
    o.minWickPct = finite(o.minWickPct,0.34,0.02,0.95);
    o.maxBodyPct = finite(o.maxBodyPct,0.56,0.05,1);
    o.weakClosePct = finite(o.weakClosePct,0.34,0.02,0.95);
    o.absorptionStrength = finite(o.absorptionStrength,1,0,3);
    o.minVolumeForAbsorption = finite(o.minVolumeForAbsorption,1.35,1,8);
    o.maxRangeATRForAbsorption = finite(o.maxRangeATRForAbsorption,0.78,0.05,3);
    o.smoothingLength = Math.round(finite(o.smoothingLength,5,1,50));
    o.decayToNeutral = finite(o.decayToNeutral,0.16,0,1);
    ["buyExhaustionWeight","sellExhaustionWeight","volumeWeight","wickWeight","absorptionWeight","impulseWeight"].forEach(function(k){
      o[k] = finite(o[k],DEFAULTS[k],0,3);
    });
    o.showUpperZone = bool(o.showUpperZone,true);
    o.showLowerZone = bool(o.showLowerZone,true);
    o.autoFitPanel = bool(o.autoFitPanel,true);
    o.upperZoneLevel = finite(o.upperZoneLevel,80,50,100);
    o.lowerZoneLevel = finite(o.lowerZoneLevel,20,0,50);
    o.midlineLevel = finite(o.midlineLevel,50,0,100);
    o.lineWidth = finite(o.lineWidth,2,1,5);
    o.glowStrength = finite(o.glowStrength,0.55,0,1);
    ["bullExhaustionColor","bearExhaustionColor","neutralLineColor"].forEach(function(k){
      if(!/^#[0-9a-f]{6}$/i.test(String(o[k]||""))) o[k] = DEFAULTS[k];
    });
    return o;
  }

  var state = load();

  function load(){
    try{ return normalize(JSON.parse(localStorage.getItem(KEY) || "null")); }
    catch(_){ return clone(DEFAULTS); }
  }
  function save(){
    state = normalize(state);
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    cache.key = "";
    renderPanel();
    drawSoonSafe();
  }
  function reset(){
    state = clone(DEFAULTS);
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    cache.key = "";
    renderPanel();
    drawSoonSafe();
  }
  function drawSoonSafe(){
    try{ if(typeof drawSoon === "function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){}
    try{
      if(window.DVL_PHASE1B_INDICATORS_MENU_0813_API && typeof window.DVL_PHASE1B_INDICATORS_MENU_0813_API.render === "function"){
        window.DVL_PHASE1B_INDICATORS_MENU_0813_API.render();
      }
    }catch(_){}
  }
  function on(){ return !!state.on; }
  function setOn(v){ state.on = !!v; save(); if(state.on) fetchTf(false); }
  function set(k,v){ state[k] = v; save(); if(k === "calculationTF") fetchTf(true); }
  function sym(){
    try{ return typeof symbol !== "undefined" ? symbol : "BTCUSDT"; }catch(_){ return "BTCUSDT"; }
  }
  function chartTf(){
    try{ return typeof interval !== "undefined" ? interval : "1m"; }catch(_){ return "1m"; }
  }
  function tfApi(tf){
    tf = String(tf || "Chart");
    if(tf === "Chart") return chartTf();
    if(tf === "1D") return "1d";
    return tf;
  }
  function tfMs(tf){
    tf = tfApi(tf);
    // Aceita SEGUNDOS (15s/30s) além de m/h/d. Antes o regex ignorava o sufixo
    // "s" e caía no default 60000 (1 min): no gráfico 15s/30s o closeTime das
    // velas (filtro em normalizeRows) e o mapeamento do draw (bounds/step por
    // tfMs(chartTf())) ficavam errados -> série descartada / linha nao plotava.
    var m = String(tf).match(/^(\d+)(s|m|h|d)$/i);
    if(!m) return 60000;
    var n = Math.max(1, Number(m[1]) || 1), u = m[2].toLowerCase();
    return u === "s" ? n*1000 : u === "m" ? n*60000 : u === "h" ? n*3600000 : n*86400000;
  }

  function closeTime(c, tf){
    return Number(c.time) + tfMs(tf);
  }
  function normalizeRows(rows, tf){
    var now = Date.now();
    return (Array.isArray(rows) ? rows : []).map(function(x){
      if(Array.isArray(x)){
        return {time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]};
      }
      return {time:+x.time,open:+x.open,high:+x.high,low:+x.low,close:+x.close,volume:+x.volume};
    }).filter(function(c){
      return Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.high) &&
             Number.isFinite(c.low) && Number.isFinite(c.close) && Number.isFinite(c.volume) &&
             now >= closeTime(c, tf) - 250;
    }).sort(function(a,b){ return a.time - b.time; });
  }

  async function fetchTf(force){
    if(state.calculationTF === "Chart") return;
    var tf = tfApi(state.calculationTF);
    var key = sym() + "|" + tf + "|900";
    if(!force && cache.loading) return;
    if(!force && cache.key === key && Array.isArray(cache.data) && cache.data.length && Date.now() - cache.ts < 25000) return;

    cache = {key:key,data:cache.data,loading:true,error:null,ts:Date.now()};
    try{
      var rows = null;
      if(typeof fetchKlinesSmart === "function"){
        rows = await fetchKlinesSmart(sym(), tf, 900);
      }else if(typeof fetchKlinesHistory === "function"){
        rows = await fetchKlinesHistory(sym(), tf, 900);
      }else{
        var base = "https://fapi.binance.com";
        try{ if(typeof BINANCE !== "undefined") base = BINANCE; }catch(_){}
        var r = await fetch(base + "/fapi/v1/klines?symbol=" + encodeURIComponent(sym()) + "&interval=" + encodeURIComponent(tf) + "&limit=900", {cache:"no-store"});
        rows = await r.json();
      }
      cache.data = normalizeRows(rows, tf);
      cache.error = cache.data.length ? null : "empty";
      cache.ts = Date.now();
    }catch(err){
      cache.error = err && err.message ? err.message : "fetch error";
      cache.data = null;
      setTimeout(function(){ if(state.on) fetchTf(true); }, 3500);
    }finally{
      cache.loading = false;
      drawSoonSafe();
    }
  }

  function sourceCandles(){
    var tf = state.calculationTF;
    if(tf === "Chart"){
      try{ return normalizeRows(klines || [], chartTf()); }catch(_){ return []; }
    }
    fetchTf(false);
    /* Only consume the cache if it actually belongs to the CURRENT
       symbol+TF — right after switching assets the fetch above is already
       in flight but hasn't landed yet, and the cache still holds the
       PREVIOUS symbol's candles. Returning those would silently blend a
       different asset's data into this one's reading until the fetch
       resolves (looks like the oscillator is slow/wrong to adapt). */
    var expectedKey = sym() + "|" + tfApi(tf) + "|900";
    if(cache.key === expectedKey && Array.isArray(cache.data) && cache.data.length) return cache.data;
    return [];
  }

  function sma(values, i, len, key){
    var sum = 0, n = 0;
    for(var j=Math.max(0,i-len+1); j<=i; j++){
      var v = key ? Number(values[j][key]) : Number(values[j]);
      if(Number.isFinite(v)){ sum += v; n++; }
    }
    return n ? sum/n : 0;
  }

  function trueRange(c,p){
    if(!p) return Math.max(0, c.high - c.low);
    return Math.max(c.high-c.low, Math.abs(c.high-p.close), Math.abs(c.low-p.close));
  }

  /* ── DVL Multi-TF Exhaustion RSI (Beta 1.028) ──────────────────────────
     Pushes the current-TF RSI toward the extreme zones using exhaustion
     detected on up to 5 SMALLER timeframes (equal weight, no divergence).
     TF ladder examples: 5m→[1,2,3,4,5], 1h→[5m,10m,15m,30m,1h]. */
  var MTF_LADDER=[1,2,3,4,5,10,15,30,60];
  var MTF_PUSH=18;
  var MTF_RSI_LEN=14;
  var oneMinCache={sym:"",data:null,loading:false,ts:0};
  function mtfLadder(curMin){ return MTF_LADDER.filter(function(m){return m<=curMin;}).slice(-5); }
  async function fetch1m(force){
    var s=sym();
    if(!force && oneMinCache.sym===s && Array.isArray(oneMinCache.data) && oneMinCache.data.length && Date.now()-oneMinCache.ts<25000) return;
    if(oneMinCache.loading) return;
    oneMinCache.loading=true;
    try{
      var rows=null;
      if(typeof fetchKlinesSmart==="function"){ rows=await fetchKlinesSmart(s,"1m",1500); }
      else{
        var base="https://fapi.binance.com"; try{ if(typeof BINANCE!=="undefined") base=BINANCE; }catch(_){}
        var r=await fetch(base+"/fapi/v1/klines?symbol="+encodeURIComponent(s)+"&interval=1m&limit=1500",{cache:"no-store"}); rows=await r.json();
      }
      var norm=normalizeRows(rows,"1m");
      if(norm.length){ oneMinCache.sym=s; oneMinCache.data=norm; oneMinCache.ts=Date.now(); }
    }catch(_){ } finally{ oneMinCache.loading=false; drawSoonSafe(); }
  }
  /* Reamostra 1m → `minutes` por RELÓGIO (floor(time/msv)), não por índice do
     array. O jeito antigo (one.slice(i,i+minutes) a partir de 0) reagrupava
     velas diferentes toda vez que a janela de 1m mudava (refetch a cada ~25s),
     então a exaustão de TODAS as barras históricas mudava e a linha do RSI
     ficava se mexendo. Com bucket por relógio, a barra 09:00–09:15 sempre tem
     as mesmas velas de 1m, então o oscilador fica estável entre atualizações. */
  function mtfResample(one, minutes){
    var msv=minutes*60000, map=Object.create(null), order=[];
    for(var i=0;i<one.length;i++){
      var c=one[i]; if(!c) continue;
      var bt=Math.floor(Number(c.time)/msv)*msv;
      var b=map[bt];
      if(!b){ map[bt]={time:bt, open:c.open, high:c.high, low:c.low, close:c.close, volume:Number(c.volume)||0}; order.push(bt); }
      else{
        if(c.high>b.high) b.high=c.high;
        if(c.low<b.low) b.low=c.low;
        b.close=c.close;               // `one` é ascendente → última vela do bucket
        b.volume+=Number(c.volume)||0;
      }
    }
    order.sort(function(a,b){return a-b;});
    var out=[]; for(var k=0;k<order.length;k++) out.push(map[order[k]]);
    return out;
  }
  function mtfRsi(closes, period){
    var out=new Array(closes.length).fill(50);
    for(var i=period;i<closes.length;i++){
      var gg=0,ll=0; for(var j=i-period+1;j<=i;j++){var d=closes[j]-closes[j-1]; if(d>=0)gg+=d; else ll-=d;}
      var ag=gg/period, al=ll/period; out[i]= al<=1e-9 ? (ag>0?100:50) : 100-100/(1+ag/al);
    }
    return out;
  }
  /* Classifica o volume do candle menor na mesma escada N1–N10 do ARION.
     Usa os multiplicadores atuais do ARION quando disponíveis; caso contrário,
     mantém a escada padrão 1x…10x. O estado ON/OFF dos níveis de zona do ARION
     não interfere aqui — usamos somente a inteligência de classificação. */
  function arionSpikeConfig(){
    var mult=[1,2,3,4,5,6,7,8,9,10];
    try{
      var api=window.DVLArionZoneProfile;
      var st=api&&api.state;
      if(st&&Array.isArray(st.mult)&&st.mult.length>=10){
        mult=st.mult.slice(0,10).map(function(v,i){v=Number(v);return Number.isFinite(v)&&v>0?v:i+1;});
      }
    }catch(_){}
    return mult;
  }
  function arionSpikeLevel(volRatio,mult){
    var level=0,r=Number(volRatio)||0,m=mult||arionSpikeConfig();
    for(var i=0;i<10;i++) if(r>=Number(m[i]||i+1)) level=i+1;
    return level;
  }
  function arionSpikeLevelEnabled(level){
    level=Math.round(Number(level)||0);
    if(level<1 || level>10) return false;
    var levels=Array.isArray(state.arionSpikeLevels)?state.arionSpikeLevels:null;
    return !levels || levels[level-1] !== false;
  }
  function mtfVolumeRatio(cs,idx){
    if(!cs||idx<0||!cs[idx]) return 0;
    var maLen=Math.max(3,Math.round(state.mtfVolMaLen||20));
    var st=Math.max(0,idx-(maLen-1)),sum=0,nn=0;
    for(var j=st;j<=idx;j++){sum+=Number(cs[j].volume)||0;nn++;}
    return (Number(cs[idx].volume)||0)/Math.max(nn?sum/nn:1,1e-9);
  }
  function mtfExh(cs, idx, dir){
    if(idx<7) return 0; var last=cs[idx]; var range=last.high-last.low; if(range<=0) return 0;
    var prior=cs[idx-5]||cs[0];
    var volRatio=mtfVolumeRatio(cs,idx);
    /* Pico de volume: volume atual vs. média configurada. "spikeAt" =
       quantas vezes a média conta como pico TOTAL (=1). Menor = mais sensível. */
    var spikeAt=Math.max(1.05,(state.mtfVolSpikeAt||2.5));
    var volSpike=Math.max(0,Math.min(1,(volRatio-1)/(spikeAt-1)));
    if(dir==="up"){
      var uw=(last.high-Math.max(last.open,last.close))/range; var weak=1-(last.close-last.low)/range;
      return Math.max(0,Math.min(1,(last.close>prior.close?1:0)*(uw*0.5+weak*0.5)*(0.15+0.85*volSpike)));
    }
    var lw=(Math.min(last.open,last.close)-last.low)/range; var strong=(last.close-last.low)/range;
    return Math.max(0,Math.min(1,(last.close<prior.close?1:0)*(lw*0.5+strong*0.5)*(0.15+0.85*volSpike)));
  }
  function mtfIdxAt(arr, t){ var lo=0,hi=arr.length-1,r=-1; while(lo<=hi){var m=(lo+hi)>>1; if(arr[m].time<=t){r=m;lo=m+1;}else hi=m-1;} return r; }
  var _mtfCache = { sig: "", struct: "", out: null, at: 0 };
  function mtfComputeValues(){
    var rows = sourceCandles();
    if(!rows.length) return [];
    try{ fetch1m(false); }catch(_){}   // mantém o 1m quente (throttled) mesmo em cache hit
    var closes = rows.map(function(c){ return c.close; });
    var rsiLen = Math.max(2, Math.round(state.mtfRsiLen || MTF_RSI_LEN));
    var pushGain = Math.max(0, Number(state.mtfPush != null ? state.mtfPush : MTF_PUSH));
    /* Same stale-symbol guard as sourceCandles(): only use the 1m cache
       once it's confirmed to belong to the symbol we're computing for. */
    var one = (oneMinCache.sym===sym() && oneMinCache.data && oneMinCache.data.length) ? oneMinCache.data : null;
    /* ── Beta 1.196/1.198 — CACHE + THROTTLE. mtfComputeValues resampla o 1m
       inteiro em 5 TFs e recalcula a exaustão de TODA barra — pesadíssimo. A
       1.196 cacheou por assinatura, mas eu incluía o ÚLTIMO CLOSE nela: com o
       preço ao vivo pingando várias vezes por segundo, a assinatura mudava toda
       hora → recomputo total a cada tick → 100% de CPU (ainda mais com o RSI
       ligado pros sinais de V). Agora separo "estrutura" (vela nova, mudança de
       1m ou de parâmetro → recomputa NA HORA) do preço ao vivo (mesma estrutura,
       só o close mexendo → recomputa no MÁXIMO ~3x/s). Arrastando/zoomando
       continua cache hit. O valor do RSI fica no máximo ~300ms atrás do preço,
       imperceptível. */
    var lastR = rows[rows.length - 1];
    var arionMult=arionSpikeConfig();
    var arionLevelSig=Array.isArray(state.arionSpikeLevels)?state.arionSpikeLevels.map(function(v){return v?"1":"0";}).join(""):"1111111111";
    var arionSig=state.arionSpikeLevelWeight?("on:"+arionMult.join(",")+":"+arionLevelSig):"off";
    var proSig=state.proExtendedScale?("pro:"+state.proExtension+":"+state.proLevelStep):"classic";
    var struct = rows.length + "|" + lastR.time
               + "|" + (one ? one.length : 0) + "|" + (one ? one[one.length-1].time : 0)
               + "|" + rsiLen + "|" + pushGain + "|" + state.calculationTF + "|" + arionSig + "|" + proSig;
    var sig = struct + "|" + lastR.close + "|" + (one ? one[one.length-1].close : 0);
    var nowP = (window.performance && performance.now) ? performance.now() : Date.now();
    if(_mtfCache.out){
      if(_mtfCache.sig === sig) return _mtfCache.out;                                   // nada mudou
      if(_mtfCache.struct === struct && (nowP - _mtfCache.at) < 300) return _mtfCache.out; // só o preço ao vivo → throttle ~3x/s
    }
    var base = mtfRsi(closes, rsiLen);
    try{
      var curMin = Math.max(1, Math.round(tfMs(state.calculationTF)/60000));
      var tfs = mtfLadder(curMin);
      var tfData = null;
      if(one && tfs.length){
        tfData = tfs.map(function(tf){
          var cs = (tf===curMin) ? rows : mtfResample(one, tf);
          var up = cs.map(function(_,i){ return mtfExh(cs,i,"up"); });
          var dn = cs.map(function(_,i){ return mtfExh(cs,i,"down"); });
          var level = state.arionSpikeLevelWeight ? cs.map(function(_,i){return arionSpikeLevel(mtfVolumeRatio(cs,i),arionMult);}) : null;
          return { cs:cs, up:up, dn:dn, level:level };
        });
      }
      var out=[];
      for(var i=0;i<rows.length;i++){
        var upN=0, dnN=0;
        if(tfData){
          /* Peso decrescente suave: o TF mais rápido (a antecipação) pesa mais.
             tfs está em ordem crescente (menor→maior), então k=0 = menor TF = maior peso. */
          var us=0, ds=0, wsum=0;
          for(var k=0;k<tfData.length;k++){
            var d=tfData[k]; var ix=mtfIdxAt(d.cs, rows[i].time); if(ix<0) continue;
            var w=tfData.length-k;
            var levelNow=state.arionSpikeLevelWeight?Math.max(0,Number(d.level&&d.level[ix])||0):1;
            var levelAllowed=!state.arionSpikeLevelWeight || arionSpikeLevelEnabled(levelNow);
            /* O nível ARION agora é filtro E peso real. Ex.: deixando apenas N5
               ligado, N1–N4 e N6–N10 não entram; um N5 multiplica o score por 5.
               Não fazemos clamp por TF em 1, porque isso tornava a mudança sutil.
               A proteção acontece no delta agregado logo antes do Push. */
            var upScore=levelAllowed ? d.up[ix]*(state.arionSpikeLevelWeight?levelNow:1) : 0;
            var dnScore=levelAllowed ? d.dn[ix]*(state.arionSpikeLevelWeight?levelNow:1) : 0;
            us+=upScore*w; ds+=dnScore*w; wsum+=w;
          }
          if(wsum>0){ upN=us/wsum; dnN=ds/wsum; }
        }
        var rawWeightedDelta=upN-dnN;
        /* RSI Exhaustion Pro: o motor ARION já entregou uma pressão por nível.
           No modo clássico mantemos a antiga proteção ±3 e o universo 0–100.
           No modo Pro preservamos até ±10 níveis de pressão e deixamos o valor
           ultrapassar 100/0 dentro da extensão configurada. Assim um N8/N10
           realmente abre distância de um N2/N3, em vez de todos baterem no teto. */
        var deltaCap=state.proExtendedScale?10:(state.arionSpikeLevelWeight?3:1);
        var weightedDelta=Math.max(-deltaCap,Math.min(deltaCap,rawWeightedDelta));
        var proExt=state.proExtendedScale?Math.max(25,Number(state.proExtension)||100):0;
        var proLo=state.proExtendedScale?-proExt:0;
        var proHi=state.proExtendedScale?100+proExt:100;
        var val=Math.max(proLo,Math.min(proHi, base[i] + weightedDelta*pushGain));
        out.push({ time:rows[i].time, value:val, buy:upN, sell:dnN, volRatio:1, arionPressure:weightedDelta });
      }
      _mtfCache.out = out; _mtfCache.sig = sig; _mtfCache.struct = struct; _mtfCache.at = nowP;
      return out;
    }catch(_){
      var fb = rows.map(function(c,i){ return { time:c.time, value:base[i], buy:0, sell:0, volRatio:1 }; });
      _mtfCache.out = fb; _mtfCache.sig = sig; _mtfCache.struct = struct; _mtfCache.at = nowP;
      return fb;
    }
  }

  function computeValues(){
    return mtfComputeValues();
    /* ── legacy exhaustion series kept below but unreached ── */
    var rows = sourceCandles();
    if(!rows.length) return [];
    var s = state;
    var tr = rows.map(function(c,i){ return trueRange(c, rows[i-1]); });
    var out = [];
    var prev = 50;
    var alpha = 2 / (Math.max(1,s.smoothingLength) + 1);

    for(var i=0;i<rows.length;i++){
      var c = rows[i], p = rows[Math.max(0, i - s.impulseLength)];
      var range = Math.max(c.high - c.low, 1e-12);
      var body = Math.abs(c.close - c.open);
      var bodyPct = body / range;
      var atr = Math.max(sma(tr, i, s.atrLength), 1e-12);
      var volMA = Math.max(sma(rows, i, s.volumeMALength, "volume"), 1e-12);
      var volRatio = c.volume / volMA;
      var volScore = clamp((volRatio - 1) / Math.max(0.25, s.volumeSpikeMultiplier - 1), 0, 1);

      var upMove = c.close - p.close;
      var downMove = p.close - c.close;
      var upATR = upMove / atr;
      var downATR = downMove / atr;
      var impUp = clamp((upATR - s.minImpulseATR * 0.55) / Math.max(0.20, s.minImpulseATR), 0, 1);
      var impDn = clamp((downATR - s.minImpulseATR * 0.55) / Math.max(0.20, s.minImpulseATR), 0, 1);

      var upperWick = c.high - Math.max(c.open,c.close);
      var lowerWick = Math.min(c.open,c.close) - c.low;
      var upperPct = upperWick / range;
      var lowerPct = lowerWick / range;
      var closeFromHigh = (c.high - c.close) / range;
      var closeFromLow = (c.close - c.low) / range;

      var wickBuy = clamp((upperPct - s.minWickPct * 0.72) / Math.max(0.05, 1 - s.minWickPct), 0, 1);
      var wickSell = clamp((lowerPct - s.minWickPct * 0.72) / Math.max(0.05, 1 - s.minWickPct), 0, 1);
      var weakBuy = clamp((closeFromHigh - s.weakClosePct * 0.72) / Math.max(0.05, 1 - s.weakClosePct), 0, 1);
      var weakSell = clamp((closeFromLow - s.weakClosePct * 0.72) / Math.max(0.05, 1 - s.weakClosePct), 0, 1);
      var bodyReject = clamp((s.maxBodyPct - bodyPct) / Math.max(0.05, s.maxBodyPct), 0, 1);

      var rangeATR = range / atr;
      var absVol = clamp((volRatio - 1) / Math.max(0.25, s.minVolumeForAbsorption - 1), 0, 1);
      var absRange = clamp((s.maxRangeATRForAbsorption - rangeATR) / Math.max(0.05, s.maxRangeATRForAbsorption), 0, 1);
      var absorption = clamp(absVol * (0.35 + 0.65 * absRange) * s.absorptionStrength, 0, 1);

      var wSum = Math.max(0.01, s.impulseWeight + s.volumeWeight + s.wickWeight + s.absorptionWeight + 0.72);
      var buyRaw = (
        s.impulseWeight * impUp +
        s.volumeWeight * volScore +
        s.wickWeight * ((wickBuy + weakBuy) / 2) +
        s.absorptionWeight * (absorption * (0.35 + 0.65 * Math.max(wickBuy, weakBuy))) +
        0.72 * bodyReject
      ) / wSum;

      var sellRaw = (
        s.impulseWeight * impDn +
        s.volumeWeight * volScore +
        s.wickWeight * ((wickSell + weakSell) / 2) +
        s.absorptionWeight * (absorption * (0.35 + 0.65 * Math.max(wickSell, weakSell))) +
        0.72 * bodyReject
      ) / wSum;

      var buyGate = clamp(0.12 + impUp * 0.72 + volScore * 0.22, 0, 1);
      var sellGate = clamp(0.12 + impDn * 0.72 + volScore * 0.22, 0, 1);
      var buy = clamp(buyRaw * buyGate * s.buyExhaustionWeight, 0, 1);
      var sell = clamp(sellRaw * sellGate * s.sellExhaustionWeight, 0, 1);

      var target = 50 + (buy * 50) - (sell * 50);
      var dominant = Math.max(buy,sell);

      /*
        Normal candles decay back to neutral; clean continuation without rejection
        does not keep the line pinned in extremes.
      */
      if(dominant < 0.10){
        target = 50;
      }else{
        target = target + (50 - target) * clamp(s.decayToNeutral * (1 - dominant), 0, 0.85);
      }

      prev = prev + alpha * (target - prev);
      if(dominant < 0.18) prev += (50 - prev) * s.decayToNeutral * 0.35;

      out.push({
        time:c.time,
        value:clamp(prev,0,100),
        buy:buy,
        sell:sell,
        volRatio:volRatio
      });
    }
    return out;
  }

  function proUniverse(){
    var ext=state.proExtendedScale?Math.max(25,Number(state.proExtension)||100):0;
    return {lo:state.proExtendedScale?-ext:0, hi:state.proExtendedScale?100+ext:100};
  }
  function proLevels(){
    if(!state.proExtendedScale) return {up:[],down:[]};
    var u=proUniverse(), step=Math.max(5,Math.round(Number(state.proLevelStep)||25));
    var up=[],down=[];
    for(var v=100+step;v<=u.hi+1e-9;v+=step) up.push(v);
    if(!up.length || up[up.length-1]!==u.hi) up.push(u.hi);
    for(var d=0-step;d>=u.lo-1e-9;d-=step) down.push(d);
    if(!down.length || down[down.length-1]!==u.lo) down.push(u.lo);
    return {up:up,down:down};
  }
  function yScale(v,y0,y1){ var u=proUniverse(); return y1 - (clamp(v,u.lo,u.hi)-u.lo) / Math.max(u.hi-u.lo,1e-12) * (y1-y0); }

  function yScaleFit(v,y0,y1,lo,hi){
    lo = Number(lo); hi = Number(hi);
    if(!(Number.isFinite(lo) && Number.isFinite(hi) && hi > lo)){
      lo = 0; hi = 100;
    }
    return y1 - (clamp(v,lo,hi) - lo) / Math.max(hi - lo, 1e-12) * (y1-y0);
  }

  function autoFitRange(values, upper, lower, mid, x0, x1, chartCfg){
    var universe=proUniverse();
    if(!state.autoFitPanel || !Array.isArray(values) || !values.length){
      return universe;
    }

    var visible = [];
    for(var i=0;i<values.length;i++){
      var vx = xForTime(values[i].time, chartCfg);
      if(Number.isFinite(vx) && vx >= x0 - 12 && vx <= x1 + 12){
        visible.push(Number(values[i].value));
      }
    }

    if(!visible.length) return {lo:0,hi:100};

    /* O núcleo clássico 0–100 permanece sempre no enquadramento. A escala só
       abre espaço acima/abaixo quando um excesso Pro realmente aparece. */
    visible.push(Number(upper), Number(lower), Number(mid), 0, 100);

    var lo = Math.min.apply(null, visible);
    var hi = Math.max.apply(null, visible);
    if(!(Number.isFinite(lo) && Number.isFinite(hi))) return {lo:0,hi:100};
    if(lo>=0 && hi<=100) return {lo:0,hi:100};

    var minSpan = 100;
    var span = Math.max(hi - lo, minSpan);
    var center = (hi + lo) / 2;
    lo = center - span / 2;
    hi = center + span / 2;

    var pad = Math.max(5, span * 0.10);
    lo -= pad; hi += pad;
    lo = Math.max(universe.lo, Math.floor(lo));
    hi = Math.min(universe.hi, Math.ceil(hi));

    /* Não corta o range RSI normal mesmo quando o movimento visível está todo
       concentrado em um extremo. */
    lo = Math.min(lo,0);
    hi = Math.max(hi,100);
    return {lo:lo, hi:hi};
  }

  function xForTime(t, chartCfg){
    if(!chartCfg || !Array.isArray(chartCfg.view) || !chartCfg.view.length || typeof chartCfg.x !== "function") return NaN;
    var view = chartCfg.view;
    if(t < view[0].time - tfMs(chartTf()) || t > view[view.length-1].time + tfMs(chartTf()) * 2) return NaN;

    var lo = 0, hi = view.length - 1, idx = 0;
    while(lo <= hi){
      var mid = (lo + hi) >> 1;
      if(view[mid].time <= t){ idx = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    var step = Math.max(1, tfMs(chartTf()));
    var frac = clamp((t - view[idx].time) / step, 0, 0.95);
    return chartCfg.x((chartCfg.slotOffset || 0) + idx + frac);
  }

  function exrHexRgb(hex){
    var s=String(hex||"").trim();
    if(/^#[0-9a-f]{3}$/i.test(s)) s="#"+s[1]+s[1]+s[2]+s[2]+s[3]+s[3];
    var m=/^#([0-9a-f]{6})$/i.exec(s); if(!m) return null;
    var n=parseInt(m[1],16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
  }
  function exrMixColor(a,b,t){
    var A=exrHexRgb(a),B=exrHexRgb(b); if(!A||!B) return a;
    t=Math.max(0,Math.min(1,Number(t)||0));
    var r=Math.round(A.r+(B.r-A.r)*t),g=Math.round(A.g+(B.g-A.g)*t),bl=Math.round(A.b+(B.b-A.b)*t);
    return "rgb("+r+","+g+","+bl+")";
  }
  function exrColorRgb(c){
    var h=exrHexRgb(c); if(h) return h;
    var m=/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(String(c||""));
    return m?{r:+m[1],g:+m[2],b:+m[3]}:null;
  }
  function exrAlpha(c,a){
    var v=exrColorRgb(c); a=Math.max(0,Math.min(1,Number(a)||0));
    return v?"rgba("+Math.round(v.r)+","+Math.round(v.g)+","+Math.round(v.b)+","+a+")":c;
  }
  function proVisualStrength(v){
    if(!state.proExtendedScale) return 0;
    var ext=Math.max(25,Number(state.proExtension)||100);
    if(v>100) return Math.max(0,Math.min(1,(v-100)/ext));
    if(v<0) return Math.max(0,Math.min(1,(-v)/ext));
    return 0;
  }
  /* Beta 1.340 — Escada de Estágios sem neon. A direção mantém uma única
     cor semântica; a PROFUNDIDADE é comunicada por estágio discreto T1/T2...
     ou F1/F2..., faixa separada, hachura, espessura, badge e trilho lateral.
     O renderer não usa shadowBlur/shadowColor. */
  function proStage(v){
    if(!state.proExtendedScale) return {side:"",n:0,label:"",strength:0};
    var step=Math.max(5,Number(state.proLevelStep)||25);
    var ext=Math.max(step,Number(state.proExtension)||100);
    var maxStage=Math.max(1,Math.ceil(ext/step));
    if(v>100){
      var n=Math.max(1,Math.min(maxStage,Math.ceil((v-100)/step)));
      return {side:"T",n:n,label:"T"+n,strength:n/maxStage};
    }
    if(v<0){
      var n2=Math.max(1,Math.min(maxStage,Math.ceil((-v)/step)));
      return {side:"F",n:n2,label:"F"+n2,strength:n2/maxStage};
    }
    return {side:"",n:0,label:"",strength:0};
  }
  function colorAt(v){
    if(v>100 || v>=state.upperZoneLevel) return state.bullExhaustionColor;
    if(v<0 || v<=state.lowerZoneLevel) return state.bearExhaustionColor;
    return state.neutralLineColor;
  }

  function draw(ctx,padL,padR,panelTop,panelHeight,w){
    if(!on()) return;

    var x0 = padL, x1 = w - padR;
    var y0 = panelTop + 8, y1 = panelTop + panelHeight - 22;
    if(y1 <= y0 + 20) return;

    var upper = state.upperZoneLevel, lower = state.lowerZoneLevel, mid = state.midlineLevel;
    var values = computeValues();
    /* Beta 1.190 — "vzinhos" do RSI → sinais de compra/venda no PREÇO.
       Detecta um pivô (V) do RSI dentro das zonas e publica os sinais; o
       gráfico de preço lê __dvlRsiVSignals e desenha os triângulos.
       • vale-V na zona sobrevendida (verde) → COMPRA → triângulo pra CIMA.
       • pico (Λ) na zona sobrecomprada (vermelho) → VENDA → triângulo pra BAIXO.
       O pivô confirma na vela seguinte (precisa de i+1), então nunca "repinta". */
    try{
      var _vsig = {};
      /* Beta 1.192 — V/Λ de EXAUSTÃO de verdade (não pivô solto no meio da
         tendência). O sinal é uma EXCURSÃO na zona: o RSI ENTRA na zona
         (sobrecompra/sobrevenda), registra o extremo, e o sinal só CONFIRMA
         quando ele SAI da zona (a reversão aconteceu). Assim, numa subida em
         escada — RSI fica no vermelho fazendo topos maiores — NÃO dispara
         venda nenhuma até o RSI realmente sair do vermelho. O triângulo fica
         no topo/fundo da excursão (o vértice do Λ/V). Um sinal por excursão. */
      var _inUp=false, _pkV=-Infinity, _pkT=null;   // excursão sobrecomprada → venda
      var _inDn=false, _vlV=Infinity,  _vlT=null;   // excursão sobrevendida → compra
      for(var _pi=0;_pi<values.length;_pi++){
        var _v=values[_pi].value; if(!Number.isFinite(_v)) continue;
        // sobrecompra (Λ → venda)
        if(_v>=upper){
          if(!_inUp){ _inUp=true; _pkV=_v; _pkT=values[_pi].time; }
          else if(_v>_pkV){ _pkV=_v; _pkT=values[_pi].time; }
        }else if(_inUp){
          if(_pkT!=null) _vsig[_pkT]="down";   // saiu do vermelho → reversão confirmada
          _inUp=false; _pkV=-Infinity; _pkT=null;
        }
        // sobrevenda (V → compra)
        if(_v<=lower){
          if(!_inDn){ _inDn=true; _vlV=_v; _vlT=values[_pi].time; }
          else if(_v<_vlV){ _vlV=_v; _vlT=values[_pi].time; }
        }else if(_inDn){
          if(_vlT!=null) _vsig[_vlT]="up";      // saiu do verde → reversão confirmada
          _inDn=false; _vlV=Infinity; _vlT=null;
        }
      }
      window.__dvlRsiVSignals = _vsig;
      window.__dvlRsiVColors  = { up: state.bearExhaustionColor, down: state.bullExhaustionColor };
    }catch(_){}
    var chartCfg = window.__dvlLastCrossCfg || null;
    var fit = autoFitRange(values, upper, lower, mid, x0, x1, chartCfg);
    var scaleLo = fit.lo, scaleHi = fit.hi;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0,y0,x1-x0,Math.max(1,y1-y0));
    ctx.clip();

    ctx.fillStyle = "rgba(2,8,6,.36)";
    ctx.fillRect(x0,y0,x1-x0,y1-y0);

    /* Escada visual discreta: cada estágio é uma faixa independente. Além do
       preenchimento, desenhamos hachuras mais densas conforme a profundidade.
       Assim T1/T2/T3 e F1/F2/F3 continuam distinguíveis até em tela pequena,
       brilho baixo ou para quem não percebe variações sutis de tonalidade. */
    if(state.proExtendedScale){
      function stageBand(vA,vB,side,n){
        var loV=Math.max(scaleLo,Math.min(vA,vB)), hiV=Math.min(scaleHi,Math.max(vA,vB));
        if(hiV<=loV) return;
        var yyA=yScaleFit(hiV,y0,y1,scaleLo,scaleHi), yyB=yScaleFit(loV,y0,y1,scaleLo,scaleHi);
        var top=Math.min(yyA,yyB), h=Math.abs(yyB-yyA), c=side==="T"?state.bullExhaustionColor:state.bearExhaustionColor;
        ctx.fillStyle=exrAlpha(c,Math.min(.30,.055+n*.045));
        ctx.fillRect(x0,top,x1-x0,h);
        if(!window.__dvlChartInteracting){
          ctx.save();
          ctx.beginPath(); ctx.rect(x0,top,x1-x0,h); ctx.clip();
          ctx.strokeStyle=exrAlpha(c,Math.min(.46,.11+n*.06));
          ctx.lineWidth=Math.min(2,0.65+n*.18);
          var gap=Math.max(5,13-n*1.4);
          for(var xx=x0-h;xx<x1+h;xx+=gap){
            ctx.beginPath(); ctx.moveTo(xx,top+h); ctx.lineTo(xx+h,top); ctx.stroke();
          }
          if(n>=3){
            ctx.strokeStyle=exrAlpha(c,Math.min(.32,.08+n*.045));
            for(var xx2=x0;xx2<x1+h;xx2+=gap*1.35){
              ctx.beginPath(); ctx.moveTo(xx2,top); ctx.lineTo(xx2-h,top+h); ctx.stroke();
            }
          }
          ctx.restore();
          ctx.save();
          ctx.font="900 9px system-ui"; ctx.textAlign="right"; ctx.textBaseline="middle";
          ctx.fillStyle=exrAlpha(c,.52+Math.min(.36,n*.08));
          ctx.fillText((side==="T"?"TOP ":"FUNDO ")+n,x1-7,top+h/2);
          ctx.restore();
        }
      }
      var _pl=proLevels(), _prev=100;
      for(var _pu=0;_pu<_pl.up.length;_pu++){ var _uv=_pl.up[_pu]; stageBand(_prev,_uv,"T",_pu+1); _prev=_uv; }
      _prev=0;
      for(var _pd=0;_pd<_pl.down.length;_pd++){ var _dv=_pl.down[_pd]; stageBand(_prev,_dv,"F",_pd+1); _prev=_dv; }
    }

    if(state.showUpperZone){
      var yu = yScaleFit(upper,y0,y1,scaleLo,scaleHi);
      var upperCap=state.proExtendedScale?Math.min(100,scaleHi):scaleHi;
      var yUpperCap=yScaleFit(upperCap,y0,y1,scaleLo,scaleHi);
      var gr = ctx.createLinearGradient(0,yUpperCap,0,yu);
      gr.addColorStop(0,"rgba(255,74,97,.18)");
      gr.addColorStop(1,"rgba(255,74,97,.04)");
      ctx.fillStyle = gr;
      ctx.fillRect(x0,Math.min(yUpperCap,yu),x1-x0,Math.abs(yu-yUpperCap));
    }
    if(state.showLowerZone){
      var yl = yScaleFit(lower,y0,y1,scaleLo,scaleHi);
      var lowerFloor=state.proExtendedScale?Math.max(0,scaleLo):scaleLo;
      var yLowerFloor=yScaleFit(lowerFloor,y0,y1,scaleLo,scaleHi);
      var gg = ctx.createLinearGradient(0,yl,0,yLowerFloor);
      gg.addColorStop(0,"rgba(16,223,119,.04)");
      gg.addColorStop(1,"rgba(16,223,119,.18)");
      ctx.fillStyle = gg;
      ctx.fillRect(x0,Math.min(yl,yLowerFloor),x1-x0,Math.abs(yLowerFloor-yl));
    }

    function hline(v, color, dash, width, alpha){
      if(v < scaleLo || v > scaleHi) return;
      var y = yScaleFit(v,y0,y1,scaleLo,scaleHi);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha==null?1:alpha;
      ctx.lineWidth = width==null?(v === mid ? 1 : .85):width;
      if(dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(x0,y);
      ctx.lineTo(x1,y);
      ctx.stroke();
      ctx.restore();
    }

    hline(upper,"rgba(255,74,97,.33)",[5,5]);
    hline(100,"rgba(255,74,97,.62)",[3,3]);
    hline(mid,"rgba(210,228,221,.22)",[7,7]);
    hline(0,"rgba(16,223,119,.62)",[3,3]);
    hline(lower,"rgba(16,223,119,.33)",[5,5]);
    if(state.proExtendedScale){
      var _lv=proLevels();
      _lv.up.forEach(function(v,idx){ hline(v,state.bullExhaustionColor,idx%2?[7,4]:[2,4],1.05+idx*0.30,0.52+Math.min(.40,idx*.10)); });
      _lv.down.forEach(function(v,idx){ hline(v,state.bearExhaustionColor,idx%2?[7,4]:[2,4],1.05+idx*0.30,0.52+Math.min(.40,idx*.10)); });
    }

    if(values.length){
      var pts = [];
      for(var i=0;i<values.length;i++){
        var vx = xForTime(values[i].time, chartCfg);
        if(Number.isFinite(vx) && vx >= x0 - 10 && vx <= x1 + 10){
          pts.push({x:vx,y:yScaleFit(values[i].value,y0,y1,scaleLo,scaleHi),v:values[i].value,buy:values[i].buy,sell:values[i].sell});
        }
      }

      if(pts.length >= 2){
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if(window.__dvlChartInteracting && typeof Path2D !== "undefined"){
          /* Durante pan/zoom, agrupa os segmentos nas três cores reais do
             EXR e rasteriza em poucos strokes. As hachuras e badges ficam em
             pausa até o gesto terminar para proteger o FPS dos demais módulos. */
          var _exrPaths=Object.create(null);
          for(var sidx=1;sidx<pts.length;sidx++){
            var a=pts[sidx-1], b=pts[sidx];
            var segMax=Math.max(a.v,b.v), segMin=Math.min(a.v,b.v);
            var extremeV=segMax>100?segMax:(segMin<0?segMin:(segMax>=state.upperZoneLevel?segMax:(segMin<=state.lowerZoneLevel?segMin:(a.v+b.v)/2)));
            var col=colorAt(extremeV);
            var p=_exrPaths[col]||(_exrPaths[col]=new Path2D());
            p.moveTo(a.x,a.y); p.lineTo(b.x,b.y);
          }
          ctx.lineWidth=state.lineWidth;
          ctx.globalAlpha=.94;

          Object.keys(_exrPaths).forEach(function(col){ ctx.strokeStyle=col; ctx.stroke(_exrPaths[col]); });
        }else{
          for(var sidx=1;sidx<pts.length;sidx++){
            var a=pts[sidx-1], b=pts[sidx];
            /* Colorir pelo extremo do segmento, não pela média: se qualquer
               ponta cruza a zona (upper/lower), o segmento inteiro conta como
               sobrecompra/sobrevenda — antes a média dos dois pontos podia
               ficar dentro da faixa neutra mesmo com a linha visivelmente
               ultrapassando a zona. */
            var segMax = Math.max(a.v,b.v), segMin = Math.min(a.v,b.v);
            var extremeV = segMax>100?segMax:(segMin<0?segMin:(segMax>=state.upperZoneLevel?segMax:(segMin<=state.lowerZoneLevel?segMin:(a.v+b.v)/2)));
            var col = colorAt(extremeV);
            var strong = Math.max(a.buy,a.sell,b.buy,b.sell);
            /* A exaustão bruta raramente passa de ~0.45, então amplia pra usar
               toda a faixa: assim o "estouro" dos TFs rápidos fica ÓBVIO. */
            var viz = Math.max(0, Math.min(1, strong * 2.4));
            var proViz = Math.max(proVisualStrength(a.v),proVisualStrength(b.v));
            var _sa=proStage(a.v),_sb=proStage(b.v),_stageN=Math.max(_sa.n,_sb.n);
            var visualForce = Math.max(viz,proViz);
            ctx.strokeStyle = col;
            ctx.lineWidth = Number(state.lineWidth||2) + _stageN * 0.85;
            ctx.globalAlpha = 0.84 + 0.16 * visualForce;
            /* Um único stroke por segmento: o estágio continua legível pela
               espessura, faixa, badge e trilho, sem glow ou under-stroke. */
            ctx.beginPath();
            ctx.moveTo(a.x,a.y);
            ctx.lineTo(b.x,b.y);
            ctx.stroke();
          }
        }
        ctx.restore();

        /* Badge apenas em picos/fundos locais — não polui cada ponto. O texto
           Tn/Fn elimina qualquer dúvida sobre a profundidade alcançada. */
        if(!window.__dvlChartInteracting && state.proExtendedScale){
          ctx.save();
          var _lastBadgeX=-1e9,_badgeCount=0;
          for(var _mi=1;_mi<pts.length-1 && _badgeCount<40;_mi++){
            var _mp=pts[_mi],_st=proStage(_mp.v); if(!_st.n) continue;
            var _isPeak=_st.side==="T"&&_mp.v>=pts[_mi-1].v&&_mp.v>pts[_mi+1].v;
            var _isTrough=_st.side==="F"&&_mp.v<=pts[_mi-1].v&&_mp.v<pts[_mi+1].v;
            if(!(_isPeak||_isTrough) || _mp.x-_lastBadgeX<34) continue;
            var _mc=colorAt(_mp.v),_bw=22,_bh=15,_bx=_mp.x-_bw/2,_by=_st.side==="T"?_mp.y-21:_mp.y+6;
            _by=clamp(_by,y0+2,y1-_bh-2);

            if(typeof roundRect==="function") roundRect(ctx,_bx,_by,_bw,_bh,4,true,false,_mc);
            else{ctx.fillStyle=_mc;ctx.fillRect(_bx,_by,_bw,_bh);}

            ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(_st.label,_mp.x,_by+_bh/2+.5);
            _lastBadgeX=_mp.x;_badgeCount++;
          }
          ctx.restore();
        }

        /*
          Extreme tip marker:
          only appears at the latest visible point when EXR is overbought/oversold.
          No labels, no arrows, no chart-main pollution.
        */
        var tip = pts[pts.length - 1];
        var tipViz = tip ? Math.max(Math.max(0, Math.min(1, Math.max(tip.buy, tip.sell) * 2.4)),proVisualStrength(tip.v)) : 0;
        /* Pulso no candle atual: dispara na zona OU quando os TFs rápidos estão
           acelerando forte (tipViz alto), mesmo antes de chegar na zona. */
        if(tip && (tip.v >= upper || tip.v <= lower || tipViz > 0.45)){
          var dotColor = colorAt(tip.v);
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.fillStyle = dotColor;
          ctx.strokeStyle = "rgba(2,8,6,.88)";
          ctx.lineWidth = 1.25;

          var _tipStage=proStage(tip.v),_tipR=Math.max(3.2,2.8+Number(state.lineWidth||2))+tipViz*3;
          ctx.beginPath(); ctx.arc(tip.x,tip.y,_tipR,0,Math.PI*2); ctx.fill();

          if(_tipStage.n){
            ctx.strokeStyle=dotColor; ctx.globalAlpha=.72; ctx.lineWidth=1;
            for(var _rr=1;_rr<=Math.min(4,_tipStage.n);_rr++){
              ctx.beginPath();ctx.arc(tip.x,tip.y,_tipR+_rr*2.7,0,Math.PI*2);ctx.stroke();
            }
          }
          ctx.restore();
        }
      }
    }

    ctx.restore();

    ctx.save();
    ctx.font = "800 9px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(220,238,229,.62)";
    var tfLabel = state.calculationTF === "Chart" ? "Chart" : state.calculationTF;
    ctx.fillText("DVL RSI Exhaustion Pro · " + tfLabel, x0 + 8, y0 + 6);

    // DVL 0.939 — proper right scale column for EXR.
    // Previously the values were printed inside the plot, so visually it looked
    // like the oscillator had no scale.
    var scaleW = (typeof PRICE_SCALE_W !== "undefined" ? PRICE_SCALE_W : padR);
    var labelGap = (typeof PRICE_LABEL_GAP !== "undefined" ? PRICE_LABEL_GAP : 2);
    var labelW = (typeof PRICE_LABEL_W !== "undefined" ? PRICE_LABEL_W : Math.max(42, scaleW - 4));
    var scaleX = x1 + labelGap;

    ctx.fillStyle = "#020806";
    ctx.fillRect(x1, panelTop, Math.max(1, w - x1), panelHeight);

    ctx.strokeStyle = "rgba(64,105,145,.26)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1 + .5, panelTop);
    ctx.lineTo(x1 + .5, panelTop + panelHeight);
    ctx.stroke();

    /* Trilho lateral de estágios: blocos físicos separados, não um gradiente. */
    if(state.proExtendedScale){
      var _rail=proLevels(),_railX=x1+2,_railW=5,_rp=100;
      _rail.up.forEach(function(v,idx){
        var a=Math.max(scaleLo,Math.min(_rp,v)),b=Math.min(scaleHi,Math.max(_rp,v));
        if(b>a){var ya=yScaleFit(b,y0,y1,scaleLo,scaleHi),yb=yScaleFit(a,y0,y1,scaleLo,scaleHi);ctx.fillStyle=exrAlpha(state.bullExhaustionColor,.28+Math.min(.58,(idx+1)*.14));ctx.fillRect(_railX,Math.min(ya,yb),_railW,Math.max(1,Math.abs(yb-ya)-1));}
        _rp=v;
      });
      _rp=0;
      _rail.down.forEach(function(v,idx){
        var a=Math.max(scaleLo,Math.min(_rp,v)),b=Math.min(scaleHi,Math.max(_rp,v));
        if(b>a){var ya=yScaleFit(b,y0,y1,scaleLo,scaleHi),yb=yScaleFit(a,y0,y1,scaleLo,scaleHi);ctx.fillStyle=exrAlpha(state.bearExhaustionColor,.28+Math.min(.58,(idx+1)*.14));ctx.fillRect(_railX,Math.min(ya,yb),_railW,Math.max(1,Math.abs(yb-ya)-1));}
        _rp=v;
      });
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(220,238,229,.50)";
    ctx.font = "800 9px system-ui";

    function exrScaleLabel(v){
      if(v < scaleLo || v > scaleHi) return;
      var yy = yScaleFit(v,y0,y1,scaleLo,scaleHi);
      ctx.save();
      var _slStage=proStage(v);
      ctx.fillStyle=_slStage.n?colorAt(v):"rgba(220,238,229,.50)";
      ctx.font=_slStage.n?"950 9px system-ui":"800 9px system-ui";
      ctx.fillText((_slStage.n?_slStage.label+" ":"")+String(Math.round(v)), scaleX, yy);
      ctx.restore();
    }

    var _labelCandidates=[scaleHi,100,mid,0,scaleLo];
    if(state.proExtendedScale){ var _pls=proLevels(); _labelCandidates=_labelCandidates.concat(_pls.up,_pls.down); }
    var _seen=Object.create(null), _lastY=-1e9;
    _labelCandidates=_labelCandidates.filter(function(v){
      v=Math.round(Number(v)); if(!Number.isFinite(v) || v<scaleLo || v>scaleHi || _seen[v]) return false;
      _seen[v]=1; return true;
    }).sort(function(a,b){return b-a;});
    _labelCandidates.forEach(function(v){
      var yy=yScaleFit(v,y0,y1,scaleLo,scaleHi);
      if(Math.abs(yy-_lastY)>=10 || v===scaleHi || v===scaleLo){ exrScaleLabel(v); _lastY=yy; }
    });

    if(values.length){
      var exrLast = values[values.length - 1];
      if(exrLast && Number.isFinite(Number(exrLast.value))){
        var tagVal = Number(exrLast.value);
        var tagY = clamp(yScaleFit(tagVal,y0,y1,scaleLo,scaleHi), y0 + 12, y1 - 12);
        var tagH = (typeof DVL_SCALE_LABEL_H !== "undefined" ? DVL_SCALE_LABEL_H : 20);
        var tagR = (typeof DVL_SCALE_LABEL_RADIUS !== "undefined" ? DVL_SCALE_LABEL_RADIUS : 6);
        ctx.save();
        var tagColor=colorAt(tagVal);
        if(typeof roundRect === "function") roundRect(ctx, scaleX, tagY - tagH/2, labelW, tagH, tagR, true, false, tagColor);
        else{
          ctx.fillStyle = tagColor;
          ctx.fillRect(scaleX, tagY - tagH/2, labelW, tagH);
        }
        ctx.fillStyle = "#02120b";
        ctx.font = "900 " + (typeof DVL_SCALE_LABEL_FONT !== "undefined" ? DVL_SCALE_LABEL_FONT : 10) + "px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        var _tagStage=proStage(tagVal);
        ctx.fillText((_tagStage.n?_tagStage.label+" · ":"")+String(Math.round(tagVal)), scaleX + labelW/2, tagY);
        ctx.restore();
      }
    }

    if(state.calculationTF !== "Chart" && cache.loading && (!cache.data || !cache.data.length)){
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,211,33,.72)";
      ctx.font = "850 10px system-ui";
      ctx.fillText("loading " + state.calculationTF + " closed candles", (x0+x1)/2, (y0+y1)/2);
    }
    ctx.restore();

    window.__dvlOscillatorPanelBounds = window.__dvlOscillatorPanelBounds || {};
    window.__dvlOscillatorPanelBounds.DVLExhaustionRSI = {top:panelTop,bottom:panelTop+panelHeight};
  }

  function choice(k,val,label){
    return '<button class="dvl-exr-choice '+(String(state[k])===String(val)?"is-active":"")+'" type="button" data-exr-set="'+k+'" data-exr-val="'+val+'">'+label+'</button>';
  }
  function toggle(k){
    return '<button class="dvl-exr-toggle '+(state[k]?"is-on":"")+'" type="button" data-exr-toggle="'+k+'">'+(state[k]?"ON":"OFF")+'</button>';
  }
  function arionLevelChoices(){
    var levels=Array.isArray(state.arionSpikeLevels)?state.arionSpikeLevels:[true,true,true,true,true,true,true,true,true,true];
    var all=levels.every(function(v){return !!v;});
    var html='<div class="dvl-exr-levels">';
    html+='<button class="dvl-exr-level '+(all?"is-active":"")+'" type="button" data-exr-level-all="1">TODOS</button>';
    for(var i=0;i<10;i++) html+='<button class="dvl-exr-level '+(levels[i]?"is-active":"")+'" type="button" data-exr-level="'+(i+1)+'">N'+(i+1)+'</button>';
    return html+'</div>';
  }
  function step(k,min,max,st,suf){
    var v = Number(state[k]);
    if(!Number.isFinite(v)) v = Number(DEFAULTS[k]) || 0;
    var txt = Math.abs(st) < 1 ? Number(v).toFixed(2).replace(/\.?0+$/,"" ) : String(Math.round(v));
    return '<div class="dvl-exr-step" data-exr-step="'+k+'" data-min="'+min+'" data-max="'+max+'" data-step="'+st+'"><button type="button" data-dir="-1">−</button><label class="dvl-exr-step-value"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-exr-input="'+k+'" value="'+txt+'"><em>'+(suf||"")+'</em></label><button type="button" data-dir="1">+</button></div>';
  }
  function field(label, body, full){
    return '<div class="dvl-exr-field '+(full?"full":"")+'"><label>'+label+'</label>'+body+'</div>';
  }
  function section(title, body){
    return '<div class="dvl-exr-section"><h4>'+title+'</h4><div class="dvl-exr-grid">'+body+'</div></div>';
  }
  function swatches(k, arr){
    return '<div class="dvl-exr-swatches">'+arr.map(function(c){
      return '<button class="dvl-exr-swatch '+(state[k]===c?"is-active":"")+'" type="button" data-exr-color="'+k+'" data-exr-val="'+c+'" style="background:'+c+'"></button>';
    }).join("")+'</div>';
  }

  function ensurePanel(){
    if(panel) return panel;
    panel = document.createElement("div");
    panel.className = "dvl-exr-panel";
    panel.id = "dvlExhaustionRSIPanel0828";
    panel.setAttribute("data-dvl-ui","true");
    document.body.appendChild(panel);

    panel.addEventListener("click", function(e){
      var t=e.target;
      var close=t.closest("[data-exr-close]");
      var rst=t.closest("[data-exr-reset]");
      var set=t.closest("[data-exr-set]");
      var tog=t.closest("[data-exr-toggle]");
      var stepEl=t.closest("[data-exr-step]");
      var dir=t.closest("[data-dir]");
      var col=t.closest("[data-exr-color]");
      var lvl=t.closest("[data-exr-level]");
      var lvlAll=t.closest("[data-exr-level-all]");
      if(close||rst||set||tog||(stepEl&&dir)||col||lvl||lvlAll){
        e.preventDefault(); e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      if(close){ closePanel(); return; }
      if(rst){ reset(); return; }
      if(set){ setState(set.getAttribute("data-exr-set"), set.getAttribute("data-exr-val")); return; }
      if(tog){ setState(tog.getAttribute("data-exr-toggle"), !state[tog.getAttribute("data-exr-toggle")]); return; }
      if(col){ setState(col.getAttribute("data-exr-color"), col.getAttribute("data-exr-val")); return; }
      if(lvlAll){
        var current=Array.isArray(state.arionSpikeLevels)?state.arionSpikeLevels.slice(0,10):[true,true,true,true,true,true,true,true,true,true];
        var turnOn=!current.every(function(v){return !!v;});
        setState("arionSpikeLevels",[turnOn,turnOn,turnOn,turnOn,turnOn,turnOn,turnOn,turnOn,turnOn,turnOn]);
        return;
      }
      if(lvl){
        var idx=Math.max(0,Math.min(9,(Number(lvl.getAttribute("data-exr-level"))||1)-1));
        var nextLevels=Array.isArray(state.arionSpikeLevels)?state.arionSpikeLevels.slice(0,10):[true,true,true,true,true,true,true,true,true,true];
        while(nextLevels.length<10) nextLevels.push(true);
        nextLevels[idx]=!nextLevels[idx];
        setState("arionSpikeLevels",nextLevels);
        return;
      }
      if(stepEl && dir){
        var k=stepEl.getAttribute("data-exr-step");
        var mn=Number(stepEl.getAttribute("data-min"));
        var mx=Number(stepEl.getAttribute("data-max"));
        var st=Number(stepEl.getAttribute("data-step"));
        var d=Number(dir.getAttribute("data-dir"));
        var next=Number(state[k]) + d*st;
        if(!Number.isFinite(next)) next=Number(DEFAULTS[k])||mn;
        next=clamp(next,mn,mx);
        setState(k, Number(next.toFixed(4)));
      }
    }, true);

    function commitDirectInput(input){
      if(!input || input.dataset.exrCommitted === "1") return;
      var stepEl=input.closest("[data-exr-step]");
      if(!stepEl) return;
      var k=stepEl.getAttribute("data-exr-step");
      var mn=Number(stepEl.getAttribute("data-min"));
      var mx=Number(stepEl.getAttribute("data-max"));
      var st=Number(stepEl.getAttribute("data-step")) || 1;
      var raw=String(input.value||"").trim().replace(",",".");
      var next=Number(raw);
      if(!Number.isFinite(next)){ renderPanel(); return; }
      next=clamp(next,mn,mx);
      if(st>=1) next=Math.round(next);
      else next=Number((Math.round(next/st)*st).toFixed(4));
      input.dataset.exrCommitted="1";
      setState(k,next);
    }
    panel.addEventListener("focusin",function(e){
      var input=e.target.closest&&e.target.closest("[data-exr-input]");
      if(input){ try{ input.select(); }catch(_){} }
    },true);
    panel.addEventListener("keydown",function(e){
      var input=e.target.closest&&e.target.closest("[data-exr-input]");
      if(!input) return;
      e.stopPropagation();
      if(e.key==="Enter"){ e.preventDefault(); commitDirectInput(input); }
      else if(e.key==="Escape"){ e.preventDefault(); renderPanel(); }
    },true);
    panel.addEventListener("focusout",function(e){
      var input=e.target.closest&&e.target.closest("[data-exr-input]");
      if(input) commitDirectInput(input);
    },true);
    return panel;
  }

  function setState(k,v){
    if(k === "calculationTF") cache.key = "";
    state[k] = v;
    save();
    if(k === "calculationTF") fetchTf(true);
  }

  function renderPanel(){
    if(!panel || !panel.classList.contains("is-open")) return;

    /*
      Preserve the settings scroll position.
      Before this, every +/− or toggle rebuilt innerHTML and jumped the body back to top.
    */
    var oldBody = panel.querySelector(".dvl-exr-body");
    var oldScrollTop = oldBody ? oldBody.scrollTop : 0;
    var oldScrollLeft = oldBody ? oldBody.scrollLeft : 0;

    var tfChoices = TF_OPTIONS.map(function(t){ return choice("calculationTF",t,t); }).join("");
    panel.innerHTML =
      '<div class="dvl-exr-head">'+
        '<span class="dvl-exr-head-mark">EXR</span>'+
        '<span class="dvl-exr-title"><b>DVL RSI Exhaustion Pro</b><small>RSI multi-TF expandido · níveis além de 0/100</small></span>'+
        '<button class="dvl-exr-icon" type="button" data-exr-reset aria-label="Reset">↻</button>'+
        '<button class="dvl-exr-icon" type="button" data-exr-close aria-label="Fechar">×</button>'+
      '</div>'+
      '<div class="dvl-exr-body">'+
        section("Base",
          field("Indicador", '<button class="dvl-exr-toggle '+(state.on?"is-on":"")+'" type="button" data-exr-toggle="on">'+(state.on?"ON":"OFF")+'</button>')+
          field("Calculation TF", '<div class="dvl-exr-choices">'+tfChoices+'</div>', true)
        )+
        section("Motor",
          field("RSI Length", step("mtfRsiLen",2,50,1))+
          field("Push (força)", step("mtfPush",0,40,1))+
          field("Volume MA", step("mtfVolMaLen",3,5000,1))+
          field("Volume Spike ×", step("mtfVolSpikeAt",1.3,8,0.1,"x"))+
          field("Peso ARION N1–N10", toggle("arionSpikeLevelWeight"), true)+
          field("Níveis ARION aceitos", arionLevelChoices(), true)
        )+
        section("Escala Pro",
          field("Ir além de 0/100", toggle("proExtendedScale"), true)+
          field("Extensão além dos limites", step("proExtension",25,500,25))+
          field("Passo entre níveis", step("proLevelStep",5,100,5))
        )+
        section("Zonas",
          field("Upper Zone Level", step("upperZoneLevel",50,100,1))+
          field("Lower Zone Level", step("lowerZoneLevel",0,50,1))
        )+
        '<div class="dvl-exr-note">O RSI normal continua sendo a base central de 0–100. Com <b>Escala Pro</b> ligada, a pressão dos timeframes menores pode ultrapassar 100 nos topos e cair abaixo de 0 nos fundos. A extensão define o teto/chão máximo (ex.: 100 gera −100 até 200) e o passo cria níveis graduados (125, 150… / −25, −50…). Cada nível vira um estágio inequívoco <b>TOP 1, TOP 2…</b> ou <b>FUNDO 1, FUNDO 2…</b>, com faixa hachurada, espessura, trilho lateral e badge nos extremos. O desenho não usa neon nem glow, reduzindo o peso do canvas sem depender de tonalidades próximas. <b>Peso ARION N1–N10</b> continua opcional: níveis desligados valem zero e níveis ativos multiplicam o spike antes do Push, permitindo separar um N10 absurdo de um N2 comum. O auto-fit mantém o núcleo 0–100 visível e só expande quando houver excesso real.</div>'+
      '</div>';

    var newBody = panel.querySelector(".dvl-exr-body");
    if(newBody){
      newBody.scrollTop = oldScrollTop;
      newBody.scrollLeft = oldScrollLeft;
      requestAnimationFrame(function(){
        try{
          newBody.scrollTop = oldScrollTop;
          newBody.scrollLeft = oldScrollLeft;
        }catch(_){}
      });
    }
  }

  function openPanel(){
    ensurePanel();
    panel.classList.add("is-open");
    renderPanel();
  }
  function closePanel(){
    if(panel) panel.classList.remove("is-open");
  }

  window.DVLExhaustionRSI = {
    on:on,
    setOn:setOn,
    set:set,
    state:state,
    draw:draw,
    open:openPanel,
    openPanel:openPanel,
    close:closePanel,
    reset:reset,
    computeValues:computeValues,
    fetch:function(force){ fetchTf(!!force); }
  };

  /* Beta 1.208 — indicator network work pauses while hidden or during direct chart interaction. */
  setInterval(function(){
    if(document.hidden || window.__dvlChartInteracting || !state.on) return;
    if(state.calculationTF !== "Chart") fetchTf(false);
    fetch1m(false);   /* keep 1m data warm for the multi-TF push */
  }, 8000);

})();
