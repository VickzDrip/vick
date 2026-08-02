/* ──────────────────────────────────────────────────────────────────────────
   DVL Deep Heatmap — Beta 1.354
   Native MBP liquidity matrix + Volume Bubbles, inspired by the structural
   workflow of professional order-flow heatmaps. This is a new engine built on
   the untouched Beta 1.350 core. It records real Level-2 changes from the
   moment it connects; optional backend history is consumed when available.
   Replay Pro is read-only to this module and is never modified.
   ────────────────────────────────────────────────────────────────────────── */
(function(){
  "use strict";
  if(window.__DVL_DEEP_HEATMAP_1354) return;
  window.__DVL_DEEP_HEATMAP_1354 = true;

  var LS = "dvl.deep.heatmap.1354";
  var DEF = {
    on:false,
    source:"auto",                  // auto | futures | spot
    viewMode:"candles",             // candles | line | heatmap
    heatmap:true,
    bubbles:true,
    showConsumption:true,
    showConsumptionLabels:true,
    showPulls:false,
    liveFlow:true,                  // false = congela; para de acumular paredes ao vivo mas mantém as passadas
    bubbleMode:"split",             // split | delta | volume
    historyMinutes:120,
    sampleMs:650,
    spanPct:1.6,
    liquidityContrast:70,
    topContrast:99.5,
    heatOpacity:0.76,
    cellPx:2,
    consumptionSensitivity:62,
    consumptionMinNotional:25000,
    consumptionWindowMs:1600,
    minNotional:50000,
    filterMode:"auto",              // auto | manual
    bubblePercentile:98.5,
    bubbleScale:0.58,
    bubbleOpacity:0.58,
    groupingMs:900,
    showStatus:true,
    /* Níveis / memória de liquidez (persistent levels) */
    levelsOn:false,
    levelsMinRefills:1,
    levelsMinNotional:100000,
    levelsOpacity:0.30
  };

  function clean(s){
    var o={},k;
    s=s||{};
    for(k in DEF) o[k]=(k in s)?s[k]:DEF[k];
    if(["auto","futures","spot"].indexOf(o.source)<0)o.source=DEF.source;
    if(["candles","line","heatmap"].indexOf(o.viewMode)<0)o.viewMode=DEF.viewMode;
    if(["split","delta","volume"].indexOf(o.bubbleMode)<0)o.bubbleMode=DEF.bubbleMode;
    if(["auto","manual"].indexOf(o.filterMode)<0)o.filterMode=DEF.filterMode;
    o.on=!!o.on;o.heatmap=o.heatmap!==false;o.bubbles=o.bubbles!==false;o.showStatus=o.showStatus!==false;
    o.showConsumption=o.showConsumption!==false;o.showConsumptionLabels=o.showConsumptionLabels!==false;o.showPulls=!!o.showPulls;o.liveFlow=o.liveFlow!==false;
    o.historyMinutes=clampNum(o.historyMinutes,10,120,60);
    o.sampleMs=clampNum(o.sampleMs,400,2000,650);
    o.spanPct=clampNum(o.spanPct,0.4,5,1.6);
    o.liquidityContrast=clampNum(o.liquidityContrast,0,100,70);
    o.topContrast=clampNum(o.topContrast,90,99.9,99.5);
    o.heatOpacity=clampNum(o.heatOpacity,.2,1,.76);
    o.cellPx=clampNum(o.cellPx,1,5,2);
    o.consumptionSensitivity=clampNum(o.consumptionSensitivity,0,100,62);
    o.consumptionMinNotional=clampNum(o.consumptionMinNotional,5000,50000000,25000);
    o.consumptionWindowMs=clampNum(o.consumptionWindowMs,500,5000,1600);
    o.minNotional=clampNum(o.minNotional,0,50000000,50000);
    o.bubblePercentile=clampNum(o.bubblePercentile,80,99.9,98.5);
    o.bubbleScale=clampNum(o.bubbleScale,.25,2.5,.58);
    o.bubbleOpacity=clampNum(o.bubbleOpacity,.15,1,.58);
    o.groupingMs=clampNum(o.groupingMs,100,5000,900);
    o.levelsOn=!!o.levelsOn;
    o.levelsMinRefills=clampNum(o.levelsMinRefills,1,10,1);
    o.levelsMinNotional=clampNum(o.levelsMinNotional,5000,50000000,100000);
    o.levelsOpacity=clampNum(o.levelsOpacity,0.05,1,0.30);
    return o;
  }
  function clampNum(v,a,b,d){v=Number(v);if(!Number.isFinite(v))v=d;return Math.max(a,Math.min(b,v));}
  var st=clean((function(){try{return JSON.parse(localStorage.getItem(LS)||"{}");}catch(_){return {};}})());
  function save(){try{localStorage.setItem(LS,JSON.stringify(st));}catch(_){} }
  function safeDraw(){try{if(typeof window.drawSoon==="function")window.drawSoon();else if(typeof drawSoon==="function")drawSoon();}catch(_){} }
  function replayActive(){try{return !!(window.DVLReplay&&window.DVLReplay.status&&window.DVLReplay.status().active);}catch(_){return false;}}
  function gsym(){
    try{if(typeof symbol!=="undefined"&&symbol)return String(symbol).toUpperCase().replace(/[^A-Z0-9]/g,"");}catch(_){}
    try{if(window.symbol)return String(window.symbol).toUpperCase().replace(/[^A-Z0-9]/g,"");}catch(_){}
    return "BTCUSDT";
  }
  function backendApi(path){
    try{var b=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023;if(b&&typeof b.api==="function")return b.api(path);}catch(_){}
    return path;
  }
  function niceStep(v){
    v=Math.max(Number(v)||0,1e-12);
    var p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p,m;
    if(n<=1)m=1;else if(n<=2)m=2;else if(n<=2.5)m=2.5;else if(n<=5)m=5;else m=10;
    return m*p;
  }
  function priceDecimals(step){
    if(step>=1)return 0;
    var d=Math.ceil(-Math.log10(step))+1;
    return Math.max(0,Math.min(8,d));
  }
  function fmtN(n){
    n=Number(n)||0;
    if(n>=1e9)return (n/1e9).toFixed(1)+"B";
    if(n>=1e6)return (n/1e6).toFixed(1)+"M";
    if(n>=1e3)return (n/1e3).toFixed(0)+"K";
    return Math.round(n).toString();
  }

  var R={
    symbol:"",source:"",status:"OFF",err:"",connected:false,synced:false,
    ws:null,wsToken:0,retryTimer:0,sampleTimer:0,tradeSeedToken:0,depthSeedToken:0,
    bids:new Map(),asks:new Map(),lastUpdateId:0,buffer:[],mid:0,step:0,
    snapshots:[],snapVersion:0,lastSampleAt:0,
    trades:[],tradeVersion:0,historySeeded:0,
    consumption:[],consumptionVersion:0,lastConsumptionStats:{buy:0,sell:0,pulls:0,count:0},
    cache:{key:"",canvas:null,at:0},
    oldModules:null,lastDrawnBubbles:0,lastThreshold:0,lastDrawAt:0
  };

  function resetData(keepTrades){
    R.bids.clear();R.asks.clear();R.lastUpdateId=0;R.buffer=[];R.mid=0;R.step=0;
    R.snapshots=[];R.snapVersion++;R.cache.key="";R.synced=false;R.lastSampleAt=0;
    R.consumption=[];R.consumptionVersion++;R.lastConsumptionStats={buy:0,sell:0,pulls:0,count:0};
    if(!keepTrades){R.trades=[];R.tradeVersion++;R.historySeeded=0;}
  }
  function closeSocket(){
    clearTimeout(R.retryTimer);R.retryTimer=0;
    if(R.ws){try{R.ws.onopen=R.ws.onmessage=R.ws.onerror=R.ws.onclose=null;R.ws.close();}catch(_){}R.ws=null;}
    R.connected=false;R.synced=false;
  }
  function stopSampler(){clearInterval(R.sampleTimer);R.sampleTimer=0;}
  function stopFeed(){persistSnapshots();closeSocket();stopSampler();R.status=st.on?"PAUSED":"OFF";updateStatePill();}

  function sourceCfg(src,sym){
    var lo=sym.toLowerCase();
    if(src==="spot")return {
      src:"spot",
      ws:"wss://stream.binance.com:9443/stream?streams="+lo+"@depth@100ms/"+lo+"@aggTrade",
      rests:[
        "https://api.binance.com/api/v3/depth?symbol="+sym+"&limit=1000",
        "https://data-api.binance.vision/api/v3/depth?symbol="+sym+"&limit=1000"
      ]
    };
    return {
      src:"futures",
      ws:"wss://fstream.binance.com/stream?streams="+lo+"@depth@100ms/"+lo+"@aggTrade",
      rests:[
        "https://fapi.binance.com/fapi/v1/depth?symbol="+sym+"&limit=1000",
        "https://fapi1.binance.com/fapi/v1/depth?symbol="+sym+"&limit=1000",
        "https://fapi2.binance.com/fapi/v1/depth?symbol="+sym+"&limit=1000",
        "https://fapi3.binance.com/fapi/v1/depth?symbol="+sym+"&limit=1000"
      ]
    };
  }
  async function fetchJsonAny(urls){
    var errs=[];
    for(var i=0;i<urls.length;i++){
      try{
        var ctl=typeof AbortController!=="undefined"?new AbortController():null;
        var tm=ctl?setTimeout(function(){try{ctl.abort();}catch(_){}},6500):0;
        var r=await fetch(urls[i],{cache:"no-store",signal:ctl?ctl.signal:undefined});
        if(tm)clearTimeout(tm);
        if(!r.ok)throw new Error("HTTP "+r.status);
        return await r.json();
      }catch(e){errs.push(String(e&&e.message||e));}
    }
    throw new Error(errs.join(" | ")||"depth snapshot failed");
  }
  function applyLevels(map,arr){
    if(!Array.isArray(arr))return;
    for(var i=0;i<arr.length;i++){
      var p=Number(arr[i][0]),q=Number(arr[i][1]);
      if(!Number.isFinite(p)||!Number.isFinite(q))continue;
      if(q<=0)map.delete(p);else map.set(p,q);
    }
  }
  function trimBook(){
    if(R.bids.size>5000){
      var b=Array.from(R.bids.entries()).sort(function(a,z){return z[0]-a[0];}).slice(0,2200);R.bids=new Map(b);
    }
    if(R.asks.size>5000){
      var a=Array.from(R.asks.entries()).sort(function(x,z){return x[0]-z[0];}).slice(0,2200);R.asks=new Map(a);
    }
  }
  function bestBidAsk(){
    var bid=-Infinity,ask=Infinity;
    R.bids.forEach(function(q,p){if(q>0&&p>bid)bid=p;});
    R.asks.forEach(function(q,p){if(q>0&&p<ask)ask=p;});
    return {bid:bid,ask:ask};
  }
  function updateMidStep(){
    var ba=bestBidAsk(),m=(Number.isFinite(ba.bid)&&Number.isFinite(ba.ask))?(ba.bid+ba.ask)/2:0;
    if(!m){try{var ks=typeof klines!=="undefined"?klines:null;if(ks&&ks.length)m=Number(ks[ks.length-1].close)||0;}catch(_){} }
    if(!m)return;
    R.mid=m;
    if(!R.step){
      R.step=niceStep(m*(st.spanPct/100)/512);
      R.cache.key="";
    }
  }
  function ingestTrade(d){
    if(!d||d.e!=="aggTrade")return;
    var p=Number(d.p),q=Number(d.q),t=Number(d.T||d.E||Date.now());
    if(!Number.isFinite(p)||!Number.isFinite(q)||!Number.isFinite(t))return;
    var buy=!d.m,n=p*q;
    R.trades.push({t:t,p:p,n:n,buy:buy});
    if(R.trades.length>24000)R.trades.splice(0,R.trades.length-20000);
    R.tradeVersion++;
  }
  function applyDepthEvent(d){
    if(!d)return;
    applyLevels(R.bids,d.b||d.bids||[]);applyLevels(R.asks,d.a||d.asks||[]);
    if(Number.isFinite(Number(d.u)))R.lastUpdateId=Number(d.u);
    trimBook();updateMidStep();
  }
  function applyBufferedAfterSnapshot(){
    var last=R.lastUpdateId,started=false;
    R.buffer.sort(function(a,b){return Number(a.U||0)-Number(b.U||0);});
    for(var i=0;i<R.buffer.length;i++){
      var e=R.buffer[i],u=Number(e.u||0),U=Number(e.U||0);
      if(u<=last)continue;
      if(!started){
        if(U<=last+1&&u>=last+1)started=true;else continue;
      }
      applyDepthEvent(e);last=Number(e.u||last);
    }
    R.buffer=[];R.synced=true;R.status="LIVE "+R.source.toUpperCase();
    recordSnapshot(true);startSampler();safeDraw();updateStatePill();
  }
  function onDepth(d){
    if(!R.synced){R.buffer.push(d);if(R.buffer.length>800)R.buffer.splice(0,R.buffer.length-600);return;}
    var U=Number(d.U||0),u=Number(d.u||0);
    if(R.lastUpdateId&&U>R.lastUpdateId+1){
      R.status="RESYNC";R.synced=false;R.buffer=[d];syncSnapshot(R.wsToken,R.source);return;
    }
    if(u<=R.lastUpdateId)return;
    applyDepthEvent(d);
  }
  function handleMessage(raw){
    var m=raw&&raw.data?raw.data:raw;
    if(!m)return;
    if(m.e==="aggTrade")ingestTrade(m);
    else if(m.e==="depthUpdate"||m.b||m.a)onDepth(m);
  }
  async function syncSnapshot(token,src){
    var sym=R.symbol,cfg=sourceCfg(src,sym);
    try{
      var j=await fetchJsonAny(cfg.rests);
      if(token!==R.wsToken||!st.on||sym!==gsym())return;
      R.bids.clear();R.asks.clear();
      applyLevels(R.bids,j.bids||[]);applyLevels(R.asks,j.asks||[]);
      R.lastUpdateId=Number(j.lastUpdateId||0);updateMidStep();applyBufferedAfterSnapshot();
    }catch(e){
      if(token!==R.wsToken)return;
      R.err=String(e&&e.message||e);R.status="SNAPSHOT ERROR";updateStatePill();
      fallbackSource(token,src);
    }
  }
  function fallbackSource(token,src){
    if(token!==R.wsToken||!st.on)return;
    if(st.source==="auto"&&src==="futures"){
      setTimeout(function(){if(token===R.wsToken)openSource("spot");},500);
    }else scheduleReconnect();
  }
  function scheduleReconnect(){
    clearTimeout(R.retryTimer);
    R.retryTimer=setTimeout(function(){if(st.on&&!replayActive())connect(true);},3500);
  }
  function openSource(src){
    closeSocket();stopSampler();
    var sym=R.symbol=gsym(),cfg=sourceCfg(src,sym),token=++R.wsToken;
    R.source=src;R.status="CONNECTING "+src.toUpperCase();R.err="";R.buffer=[];R.synced=false;updateStatePill();
    var ws;
    try{ws=new WebSocket(cfg.ws);}catch(e){R.err=String(e);fallbackSource(token,src);return;}
    R.ws=ws;var got=false;
    var watchdog=setTimeout(function(){if(!got&&token===R.wsToken){try{ws.close();}catch(_){}fallbackSource(token,src);}},5500);
    ws.onopen=function(){if(token!==R.wsToken)return;R.connected=true;R.status="SYNCING "+src.toUpperCase();syncSnapshot(token,src);updateStatePill();};
    ws.onmessage=function(ev){
      if(token!==R.wsToken)return;got=true;clearTimeout(watchdog);
      try{handleMessage(JSON.parse(ev.data));}catch(_){}
    };
    ws.onerror=function(){};
    ws.onclose=function(){clearTimeout(watchdog);if(token!==R.wsToken)return;R.connected=false;R.synced=false;R.ws=null;R.status="RECONNECT";updateStatePill();fallbackSource(token,src);};
  }
  function connect(force){
    if(!st.on||replayActive())return;
    var sym=gsym();
    if(!force&&R.ws&&R.symbol===sym&&R.ws.readyState<2)return;
    if(R.symbol!==sym)resetData(false);
    R.symbol=sym;
    openSource(st.source==="spot"?"spot":"futures");
    seedTradeHistory();
    /* Beta 1.373 — primeiro restaura o book PROFUNDO que o usuário já acumulou ao
       vivo (IndexedDB): abre já com as paredes passadas de verdade. Só cai no seed
       RASO do servidor quando não há histórico local (1ª vez), pra não deixar o
       top-of-book do servidor sobrescrever as paredes profundas restauradas. */
    restoreSnapshots(gsym(),function(n){
      if(n>0){scheduleHistConsumption();safeDraw();}
      else seedDepthHistory();
    });
  }
  function startSampler(){
    stopSampler();
    R.sampleTimer=setInterval(function(){if(st.on&&!replayActive())recordSnapshot(false);},Math.round(st.sampleMs));
  }

  function encodeNotional(v){return Math.max(0,Math.min(65535,Math.round(Math.log1p(Math.max(0,v))*4096)));}
  function decodeNotional(code){code=Number(code)||0;return code>0?Math.expm1(code/4096):0;}
  function sideCodeAt(s,absIdx,side){
    if(!s)return 0;var i=absIdx-s.base;if(i<0||i>=512)return 0;
    if(side==="bid")return s.b?s.b[i]:(s.v?s.v[i]:0);
    if(side==="ask")return s.a?s.a[i]:(s.v?s.v[i]:0);
    return s.v?s.v[i]:Math.max(s.b?s.b[i]:0,s.a?s.a[i]:0);
  }
  function recentFlowMap(t0,t1){
    var map=new Map(),step=R.step||1;
    for(var i=R.trades.length-1;i>=0;i--){
      var tr=R.trades[i];if(tr.t<t0-st.consumptionWindowMs)break;if(tr.t>t1+120)continue;
      var abs=Math.floor(tr.p/step),x=map.get(abs);if(!x){x={buy:0,sell:0};map.set(abs,x);}
      if(tr.buy)x.buy+=tr.n;else x.sell+=tr.n;
    }
    return map;
  }
  function flowNear(map,abs,key){
    var n=0;for(var d=-1;d<=1;d++){var x=map.get(abs+d);if(x)n+=Number(x[key])||0;}return n;
  }
  function detectConsumption(prev,cur){
    if(!prev||!cur||!R.step)return;
    var t0=prev.t,t1=cur.t,flow=recentFlowMap(t0,t1),minN=st.consumptionMinNotional;
    var relNeed=.07+(100-st.consumptionSensitivity)/100*.38;
    var lo=Math.max(prev.base,cur.base),hi=Math.min(prev.base+512,cur.base+512),cand=[];
    for(var abs=lo;abs<hi;abs++){
      var pa=decodeNotional(sideCodeAt(prev,abs,"ask")),ca=decodeNotional(sideCodeAt(cur,abs,"ask"));
      if(pa>0){
        var da=pa-ca,ra=da/Math.max(1,pa),bf=flowNear(flow,abs,"buy");
        if(da>=minN&&ra>=relNeed){
          if(bf>=Math.max(5000,minN*.16,da*.09))cand.push({t:t1,p:(abs+.5)*R.step,side:"buy",book:"ask",kind:"consume",n:Math.min(da,bf),drop:da,flow:bf,strength:Math.min(1,ra*.9+Math.min(1,bf/Math.max(1,da))*.55)});
          else if(da>=minN*1.7)cand.push({t:t1,p:(abs+.5)*R.step,side:"ask",book:"ask",kind:"pull",n:da,drop:da,flow:0,strength:Math.min(1,ra)});
        }
      }
      var pb=decodeNotional(sideCodeAt(prev,abs,"bid")),cb=decodeNotional(sideCodeAt(cur,abs,"bid"));
      if(pb>0){
        var db=pb-cb,rb=db/Math.max(1,pb),sf=flowNear(flow,abs,"sell");
        if(db>=minN&&rb>=relNeed){
          if(sf>=Math.max(5000,minN*.16,db*.09))cand.push({t:t1,p:(abs+.5)*R.step,side:"sell",book:"bid",kind:"consume",n:Math.min(db,sf),drop:db,flow:sf,strength:Math.min(1,rb*.9+Math.min(1,sf/Math.max(1,db))*.55)});
          else if(db>=minN*1.7)cand.push({t:t1,p:(abs+.5)*R.step,side:"bid",book:"bid",kind:"pull",n:db,drop:db,flow:0,strength:Math.min(1,rb)});
        }
      }
    }
    cand.sort(function(a,b){if(a.kind!==b.kind)return a.kind==="consume"?-1:1;return b.n-a.n;});
    var consumed=0,pulled=0;
    for(var i=0;i<cand.length;i++){
      var e=cand[i];if(e.kind==="consume"){if(consumed>=10)continue;consumed++;}else{if(pulled>=6)continue;pulled++;}
      R.consumption.push(e);
    }
    var cutoff=t1-st.historyMinutes*60000;
    if(R.consumption.length>6000||R.consumption[0]&&R.consumption[0].t<cutoff)R.consumption=R.consumption.filter(function(e){return e.t>=cutoff;}).slice(-5000);
    if(cand.length)R.consumptionVersion++;
  }
  function recordSnapshot(force){
    if(!st.on||!R.synced||!R.step||!R.mid)return;
    /* liveFlow off = CONGELA: para de acrescentar/atualizar as paredes que se
       formam agora (o "fluxo"), mas as passadas já acumuladas continuam visíveis. */
    if(!st.liveFlow)return;
    var now=Date.now();if(!force&&now-R.lastSampleAt<Math.max(250,st.sampleMs*.72))return;R.lastSampleAt=now;
    var rows=512,center=Math.floor(R.mid/R.step),base=center-(rows>>1),bt=new Float64Array(rows),at=new Float64Array(rows);
    R.bids.forEach(function(q,p){var i=Math.floor(p/R.step)-base;if(i>=0&&i<rows)bt[i]+=p*q;});
    R.asks.forEach(function(q,p){var i=Math.floor(p/R.step)-base;if(i>=0&&i<rows)at[i]+=p*q;});
    var bv=new Uint16Array(rows),av=new Uint16Array(rows);
    for(var i=0;i<rows;i++){if(bt[i]>0)bv[i]=encodeNotional(bt[i]);if(at[i]>0)av[i]=encodeNotional(at[i]);}
    var snap={t:now,base:base,b:bv,a:av};detectConsumption(R.snapshots.length?R.snapshots[R.snapshots.length-1]:null,snap);R.snapshots.push(snap);
    var maxCols=Math.max(300,Math.round(st.historyMinutes*60000/st.sampleMs));
    if(R.snapshots.length>maxCols)R.snapshots.splice(0,R.snapshots.length-maxCols);
    R.snapVersion++;R.cache.key="";safeDraw();persistSnapshots();
  }

  function parseDepthHistory(j){
    /* aceita array cru [{time,bids,asks}] (formato do recorder do servidor DVL,
       ~16h de histórico) ou {snapshots}/{data}. Sem isso o mapa nunca semeava. */
    var arr=Array.isArray(j)?j:(j&&Array.isArray(j.snapshots))?j.snapshots:(j&&Array.isArray(j.data)?j.data:[]);
    if(!arr.length)return 0;
    var out=[];
    for(var k=0;k<arr.length;k++){
      var s=arr[k],t=Number(s.ts||s.time||s.t);if(!Number.isFinite(t))continue;
      var bids=s.bids||s.b||[],asks=s.asks||s.a||[],mid=Number(s.mid||0);
      if(!mid&&bids.length&&asks.length)mid=(Number(bids[0][0])+Number(asks[0][0]))/2;
      if(!mid)continue;
      if(!R.step)R.step=niceStep(mid*(st.spanPct/100)/512);
      var base=Math.floor(mid/R.step)-256,bt=new Float64Array(512),at=new Float64Array(512);
      for(var i=0;i<bids.length;i++){var bp=Number(bids[i][0]),bq=Number(bids[i][1]),br=Math.floor(bp/R.step)-base;if(br>=0&&br<512&&bp>0&&bq>0)bt[br]+=bp*bq;}
      for(var z=0;z<asks.length;z++){var ap=Number(asks[z][0]),aq=Number(asks[z][1]),ar=Math.floor(ap/R.step)-base;if(ar>=0&&ar<512&&ap>0&&aq>0)at[ar]+=ap*aq;}
      var bv=new Uint16Array(512),av=new Uint16Array(512);for(var q=0;q<512;q++){if(bt[q]>0)bv[q]=encodeNotional(bt[q]);if(at[q]>0)av[q]=encodeNotional(at[q]);}
      out.push({t:t,base:base,b:bv,a:av});
    }
    out.sort(function(a,b){return a.t-b.t;});
    if(out.length){R.snapshots=out.concat(R.snapshots.filter(function(s){return s.t>out[out.length-1].t;}));var max=Math.max(300,Math.round(st.historyMinutes*60000/st.sampleMs));if(R.snapshots.length>max)R.snapshots=R.snapshots.slice(-max);R.snapVersion++;R.cache.key="";}
    return out.length;
  }
  /* Beta 1.372 — roda a detecção de CONSUMO sobre o histórico semeado (2h), não
     só ao vivo. Assim os ▲/▼ aparecem no passado e dá pra ver se a liquidez
     (parede) que ficou fixa JÁ FOI PEGA ou não. Idempotente: reconstrói do
     conjunto atual de snapshots (que já inclui o que veio ao vivo). */
  var _histConsTimer=0;
  function rebuildConsumption(){
    if(!R.step||R.snapshots.length<2)return;
    R.consumption=[];
    for(var i=1;i<R.snapshots.length;i++) detectConsumption(R.snapshots[i-1],R.snapshots[i]);
    R.consumptionVersion++;
  }
  function scheduleHistConsumption(){ clearTimeout(_histConsTimer); _histConsTimer=setTimeout(function(){ _histConsTimer=0; try{ rebuildConsumption(); safeDraw(); }catch(_){} },550); }

  function seedDepthHistory(){
    var tok=++R.depthSeedToken,sym=R.symbol||gsym();
    var mins=Math.max(120,Math.round(st.historyMinutes));
    /* Beta 1.371 — usa o recorder de depth do PRÓPRIO servidor DVL (same-origin),
       que já tem MUITAS horas gravadas. Antes ia via backendApi (podia cair num
       backend recém-reiniciado com pouco histórico → parecia "recomeçar" a cada
       toque). Assim o mapa já abre com ~2h prontas toda vez, sem re-acumular.
       Fallback pro backendApi caso o same-origin não responda. */
    var soUrl="/api/depth_history?symbol="+encodeURIComponent(sym)+"&mins="+mins+"&levels=1000";
    var bkUrl=backendApi(soUrl);
    function apply(j){ if(tok!==R.depthSeedToken||sym!==gsym()||!j)return false; var n=parseDepthHistory(j); if(n>0)scheduleHistConsumption(); safeDraw(); return n>0; }
    fetch(soUrl,{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(apply(j))return;
      if(bkUrl!==soUrl) fetch(bkUrl,{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(apply).catch(function(){});
    }).catch(function(){
      if(bkUrl!==soUrl) fetch(bkUrl,{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(apply).catch(function(){});
    });
  }
  function seedTradeHistory(){
    var tok=++R.tradeSeedToken,sym=R.symbol||gsym();
    fetch(backendApi("/api/dvl/bubbles/history?symbol="+encodeURIComponent(sym)+"&mins="+Math.round(Math.max(30,st.historyMinutes))),{cache:"no-store"})
      .then(function(r){return r.ok?r.json():null;}).then(function(j){
        if(tok!==R.tradeSeedToken||sym!==gsym()||!j||!Array.isArray(j.groups))return;
        var hist=[];j.groups.forEach(function(g){var t=Number(g.ts),p=Number(g.price),b=Number(g.buyN)||0,s=Number(g.sellN)||0;if(!t||!p)return;if(b>0)hist.push({t:t+250,p:p,n:b,buy:true});if(s>0)hist.push({t:t+650,p:p,n:s,buy:false});});
        hist.sort(function(a,b){return a.t-b.t;});var end=hist.length?hist[hist.length-1].t:0;
        R.trades=hist.concat(R.trades.filter(function(x){return x.t>end;}));if(R.trades.length>24000)R.trades=R.trades.slice(-24000);R.historySeeded=hist.length;R.tradeVersion++;scheduleHistConsumption();safeDraw();
      }).catch(function(){});
  }

  /* ── Persistência local (IndexedDB) do book PROFUNDO acumulado ao vivo ──────
     Beta 1.373 — O feed ao vivo (spot @depth diff) acumula um book fundo, com as
     paredes até ±spanPct. Já o histórico do servidor é raso (top-of-book), então
     as paredes passadas "não apareciam" ao abrir — só o que se formava ao vivo no
     candle atual. Aqui gravamos os snapshots profundos que o próprio usuário
     formou ao vivo e restauramos na entrada, então ao abrir ele já tem o histórico
     REAL daquelas liquidezes passadas (do tempo em que o indicador ficou aberto),
     sem re-acumular. Usa IndexedDB (não localStorage) pra não estourar quota. */
  var _idb=null,_idbFail=false,_persistT=0;
  function idb(cb){
    if(_idbFail||typeof indexedDB==="undefined")return cb(null);
    if(_idb)return cb(_idb);
    try{
      var rq=indexedDB.open("dvlDeepHeatmap",1);
      rq.onupgradeneeded=function(){try{rq.result.createObjectStore("snaps",{keyPath:"sym"});}catch(_){}};
      rq.onsuccess=function(){_idb=rq.result;cb(_idb);};
      rq.onerror=function(){_idbFail=true;cb(null);};
    }catch(_){_idbFail=true;cb(null);}
  }
  function persistSnapshots(){
    if(!R.step||R.snapshots.length<2)return;
    clearTimeout(_persistT);
    _persistT=setTimeout(function(){_persistT=0;idb(function(db){
      if(!db)return;
      try{
        var cut=Date.now()-Math.max(30,st.historyMinutes)*60000;
        var snaps=R.snapshots.filter(function(s){return s.t>=cut;});
        if(snaps.length>1400)snaps=snaps.slice(-1400);
        if(!snaps.length)return;
        db.transaction("snaps","readwrite").objectStore("snaps").put({sym:R.symbol||gsym(),at:Date.now(),step:R.step,spanPct:st.spanPct,snaps:snaps});
      }catch(_){}
    });},1600);
  }
  function restoreSnapshots(sym,cb){
    idb(function(db){
      if(!db)return cb&&cb(0);
      try{
        var rq=db.transaction("snaps","readonly").objectStore("snaps").get(sym);
        rq.onsuccess=function(){
          var rec=rq.result;
          if(!rec||!rec.snaps||!rec.snaps.length||sym!==gsym())return cb&&cb(0);
          /* só restaura na mesma escala de preço (mesmo spanPct/step); senão as
             colunas não casariam com o eixo atual. */
          if(rec.spanPct!=null&&Math.abs(Number(rec.spanPct)-st.spanPct)>1e-6)return cb&&cb(0);
          var cut=Date.now()-Math.max(30,st.historyMinutes)*60000;
          var snaps=rec.snaps.filter(function(s){return s&&s.t>=cut&&s.b&&s.a;});
          if(!snaps.length)return cb&&cb(0);
          if(!R.step&&rec.step)R.step=rec.step;
          if(rec.step&&R.step&&Math.abs(rec.step-R.step)>1e-9)return cb&&cb(0);
          var end=snaps[snaps.length-1].t;
          R.snapshots=snaps.concat(R.snapshots.filter(function(s){return s.t>end;}));
          var max=Math.max(300,Math.round(st.historyMinutes*60000/st.sampleMs));
          if(R.snapshots.length>max)R.snapshots=R.snapshots.slice(-max);
          R.snapVersion++;R.cache.key="";
          cb&&cb(snaps.length);
        };
        rq.onerror=function(){cb&&cb(0);};
      }catch(_){cb&&cb(0);}
    });
  }

  function takeoverOld(){
    if(R.oldModules)return;
    var bb=window.DVL_BUBBLES_API,bm=window.DVL_BOOKMAP_ZONES_0813;
    R.oldModules={bb:!!(bb&&bb.on&&bb.on()),bm:!!(bm&&bm.on&&bm.on())};
    try{if(bb&&bb.setOn)bb.setOn(false);}catch(_){}
    try{if(bm&&bm.setOn)bm.setOn(false);}catch(_){}
  }
  function restoreOld(){
    if(!R.oldModules)return;
    var o=R.oldModules;R.oldModules=null;
    try{var bb=window.DVL_BUBBLES_API;if(bb&&bb.setOn)bb.setOn(!!o.bb);}catch(_){}
    try{var bm=window.DVL_BOOKMAP_ZONES_0813;if(bm&&bm.setOn)bm.setOn(!!o.bm);}catch(_){}
  }

  function setOn(v){
    st.on=(v===undefined?!st.on:!!v);save();
    if(st.on){takeoverOld();connect(true);}else{stopFeed();restoreOld();}
    updateStatePill();renderPanel();safeDraw();refreshIndicatorsMenu();
  }
  function setState(k,v,restart){
    st[k]=v;st=clean(st);save();R.cache.key="";
    if(k==="spanPct"){R.step=0;R.snapshots=[];R.snapVersion++;}
    if(restart&&st.on)connect(true);
    renderPanel();safeDraw();refreshIndicatorsMenu();
  }
  function reset(){var was=!!st.on;st=clean({on:was});save();resetData(false);if(st.on){takeoverOld();connect(true);}renderPanel();safeDraw();updateStatePill();}
  function refreshIndicatorsMenu(){try{var a=window.DVL_PHASE1B_INDICATORS_MENU_0813_API;if(a&&a.render)a.render();}catch(_){} }
  function updateStatePill(){
    var e=document.getElementById("dvlDeepHeatmapState");if(e){e.textContent=st.on?"ON":"OFF";e.classList.toggle("is-on",!!st.on);}
  }

  function intervalMsFromView(view){
    if(view&&view.length>1){var d=Number(view[view.length-1].time)-Number(view[view.length-2].time);if(d>0)return d;}
    try{var m={"1s":1000,"5s":5000,"15s":15000,"30s":30000,"1m":60000,"3m":180000,"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"1d":86400000};return m[String(interval)]||60000;}catch(_){return 60000;}
  }
  function slotToTime(slot,cfg){
    var view=cfg.view||[],off=Number(cfg.slotOffset)||0,local=slot-off,ms=intervalMsFromView(view);
    if(!view.length)return Date.now();
    if(local<=0)return Number(view[0].time)+local*ms;
    if(local>=view.length-1)return Number(view[view.length-1].time)+(local-(view.length-1))*ms;
    var i=Math.floor(local),f=local-i,t0=Number(view[i].time),t1=Number(view[i+1].time);return t0+(t1-t0)*f;
  }
  function timeToSlot(t,cfg){
    var v=cfg.view||[],off=Number(cfg.slotOffset)||0,ms=intervalMsFromView(v);if(!v.length)return off;
    var first=Number(v[0].time),last=Number(v[v.length-1].time);
    if(t<=first)return off+(t-first)/ms;
    if(t>=last)return off+v.length-1+(t-last)/ms;
    var lo=0,hi=v.length-1;
    while(lo+1<hi){var m=(lo+hi)>>1;if(Number(v[m].time)<=t)lo=m;else hi=m;}
    var t0=Number(v[lo].time),t1=Number(v[hi].time),f=(t-t0)/Math.max(1,t1-t0);return off+lo+f;
  }
  function snapshotAt(t,idxHint){
    var a=R.snapshots,n=a.length;if(!n)return null;
    if(t<a[0].t-Math.max(1000,st.sampleMs*1.5))return null;
    if(t<=a[0].t)return {a:a[0],b:a[0],f:0,i:0};
    if(t>=a[n-1].t)return {a:a[n-1],b:a[n-1],f:0,i:n-1};
    var lo=Math.max(0,Math.min(n-2,idxHint||0)),hi=n-1;
    if(a[lo].t>t){lo=0;}
    while(lo+1<hi){var m=(lo+hi)>>1;if(a[m].t<=t)lo=m;else hi=m;}
    var aa=a[lo],bb=a[hi],f=(t-aa.t)/Math.max(1,bb.t-aa.t);return {a:aa,b:bb,f:f,i:lo};
  }
  function codeAt(s,absIdx){return sideCodeAt(s,absIdx,"all");}

  var PALETTE=(function(){
    /* Rampa "hot" estilo DeepCharts: base teal dim (liquidez leve) → ciano →
       amarelo → laranja → VERMELHO nas paredes fortes. Assim dá pra ler pra onde
       a liquidez se acumula (parede) num olhar. (Verde/vermelho dos ▲/▼ de consumo
       são MARCADORES com forma própria, não a cor do campo.) */
    var stops=[
      [0.00,[0,0,0,0]],
      [0.04,[6,26,34,70]],
      [0.16,[10,58,80,140]],
      [0.34,[14,110,138,185]],
      [0.52,[24,168,168,212]],
      [0.66,[120,205,120,228]],
      [0.78,[236,206,74,240]],
      [0.90,[243,138,36,250]],
      [1.00,[252,58,46,255]]
    ],out=new Uint8ClampedArray(256*4);
    for(var i=0;i<256;i++){
      var n=i/255,a=stops[0],b=stops[stops.length-1];
      for(var j=1;j<stops.length;j++)if(n<=stops[j][0]){a=stops[j-1];b=stops[j];break;}
      var f=(n-a[0])/Math.max(.00001,b[0]-a[0]);
      for(var c=0;c<4;c++)out[i*4+c]=Math.round(a[1][c]+(b[1][c]-a[1][c])*f);
    }
    return out;
  })();
  function thresholds(cfg,t0,t1){
    var hist=new Uint32Array(512),count=0,a=R.snapshots;
    for(var i=0;i<a.length;i++){
      var s=a[i];if(s.t<t0||s.t>t1)continue;
      var stride=window.__dvlChartInteracting?8:4;
      for(var r=0;r<512;r+=stride){var code=codeAt(s,s.base+r);if(code){hist[Math.min(511,code>>7)]++;count++;}}
    }
    if(!count)return {low:1,top:65535};
    function q(p){var want=count*p,acc=0;for(var i=0;i<512;i++){acc+=hist[i];if(acc>=want)return i<<7;}return 65535;}
    return {low:q(.18),top:Math.max(q(st.topContrast/100),q(.75)+128)};
  }
  function buildHeatCanvas(cfg){
    var W=Math.max(1,cfg.x1-cfg.x0),H=Math.max(1,cfg.y1-cfg.y0),cell=Math.max(1,Number(st.cellPx)||2);
    var scale=window.__dvlChartInteracting?.72:1;
    var ow=Math.max(90,Math.ceil(W/cell*scale)),oh=Math.max(100,Math.ceil(H/cell*scale));
    var key=[R.symbol,R.snapVersion,Math.round(cfg.min/(R.step||1)),Math.round(cfg.max/(R.step||1)),Math.round(cfg.win.leftEdgeIndex*20),Math.round(cfg.win.rightEdgeIndex*20),ow,oh,st.liquidityContrast,st.topContrast,st.heatOpacity].join("|");
    var now=performance.now?performance.now():Date.now();
    if(R.cache.canvas&&R.cache.key===key)return R.cache.canvas;
    if(window.__dvlChartInteracting&&R.cache.canvas&&now-R.cache.at<70)return R.cache.canvas;
    var c=document.createElement("canvas");c.width=ow;c.height=oh;var cx=c.getContext("2d"),img=cx.createImageData(ow,oh),pix=img.data;
    if(!R.snapshots.length||!R.step){cx.putImageData(img,0,0);R.cache={key:key,canvas:c,at:now};return c;}
    var t0=slotToTime(0,cfg),t1=slotToTime(Math.max(1,cfg.win.totalSlots-1),cfg),thr=thresholds(cfg,t0,t1);
    var cut=st.liquidityContrast/100*.24,gamma=.62+(100-st.liquidityContrast)/100*.46;
    var hint=0;
    for(var ix=0;ix<ow;ix++){
      var slot=(ix/(ow-1))*Math.max(1,cfg.win.totalSlots-1),t=slotToTime(slot,cfg),pair=snapshotAt(t,hint);if(!pair)continue;hint=pair.i;
      for(var iy=0;iy<oh;iy++){
        var price=cfg.max-(iy+.5)/oh*(cfg.max-cfg.min),abs=Math.floor(price/R.step);
        var va=codeAt(pair.a,abs),vb=codeAt(pair.b,abs),v=va+(vb-va)*pair.f;if(v<=0)continue;
        var n=(v-thr.low)/Math.max(1,thr.top-thr.low);n=Math.max(0,Math.min(1,n));n=(n-cut)/Math.max(.001,1-cut);if(n<=0)continue;n=Math.pow(Math.min(1,n),gamma);
        var pi=Math.max(1,Math.min(255,Math.round(n*255))),di=(iy*ow+ix)*4,si=pi*4;
        pix[di]=PALETTE[si];pix[di+1]=PALETTE[si+1];pix[di+2]=PALETTE[si+2];pix[di+3]=Math.round(PALETTE[si+3]*st.heatOpacity);
      }
    }
    cx.putImageData(img,0,0);R.cache={key:key,canvas:c,at:now};return c;
  }
  function drawHeat(ctx,cfg){
    if(!st.heatmap||!R.snapshots.length||!R.step)return;
    var c=buildHeatCanvas(cfg);ctx.save();
    /* backdrop escuro (só na área do gráfico, ATRÁS das velas) pra o mapa
       "ressaltar" como no DeepCharts, sem apagar os candles que vêm por cima. */
    ctx.fillStyle="rgba(2,6,10,0.34)";ctx.fillRect(cfg.x0,cfg.y0,cfg.x1-cfg.x0,cfg.y1-cfg.y0);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(c,cfg.x0,cfg.y0,cfg.x1-cfg.x0,cfg.y1-cfg.y0);ctx.restore();
  }



  function visibleConsumption(cfg){
    if(!R.consumption.length)return [];
    var t0=slotToTime(0,cfg)-intervalMsFromView(cfg.view),t1=slotToTime(cfg.win.totalSlots-1,cfg)+intervalMsFromView(cfg.view);
    return R.consumption.filter(function(e){return e.t>=t0&&e.t<=t1&&e.p>=cfg.min&&e.p<=cfg.max&&(e.kind==="consume"||st.showPulls);});
  }
  function recentConsumptionStats(){
    var ref=R.snapshots.length?R.snapshots[R.snapshots.length-1].t:Date.now(),cut=ref-30000,buy=0,sell=0,pulls=0,count=0;
    for(var i=R.consumption.length-1;i>=0;i--){var e=R.consumption[i];if(e.t<cut)break;if(e.kind==="consume"){if(e.side==="buy")buy+=e.n;else sell+=e.n;count++;}else pulls+=e.n;}
    return R.lastConsumptionStats={buy:buy,sell:sell,pulls:pulls,count:count};
  }
  function consumptionLabel(e){
    if(e.kind==="pull")return (e.book==="ask"?"ASK RETIRADA ":"BID RETIRADA ")+fmtN(e.n);
    return e.side==="buy"?("COMPRA CONSOME ASK "+fmtN(e.n)):("VENDA CONSOME BID "+fmtN(e.n));
  }
  function drawConsumption(ctx,cfg){
    if(!st.showConsumption||!R.consumption.length)return;
    var ev=visibleConsumption(cfg),strong=ev.filter(function(e){return e.kind==="consume";}).sort(function(a,b){return b.n-a.n;}).slice(0,3);
    var labels=new Set(strong),mobile=window.innerWidth<760;
    ctx.save();ctx.textBaseline="middle";
    for(var i=0;i<ev.length;i++){
      var e=ev[i],x=cfg.x(timeToSlot(e.t,cfg)),y=cfg.y(e.p);if(x<cfg.x0-12||x>cfg.x1+12||y<cfg.y0-12||y>cfg.y1+12)continue;
      if(e.kind==="pull"){
        ctx.strokeStyle="rgba(172,184,193,.58)";ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.stroke();ctx.setLineDash([]);continue;
      }
      var buy=e.side==="buy",col=buy?"43,226,138":"255,82,107",a=.58+Math.min(.36,e.strength*.36);
      /* Dark bite marks the exact point where the resting band lost quantity. */
      ctx.fillStyle="rgba(1,6,10,.86)";ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x+6,y-5);ctx.lineTo(x+6,y+5);ctx.closePath();ctx.fill();
      ctx.strokeStyle="rgba("+col+","+a+")";ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.stroke();
      ctx.fillStyle="rgba("+col+","+a+")";ctx.beginPath();
      if(buy){ctx.moveTo(x,y-8);ctx.lineTo(x-4,y-2);ctx.lineTo(x+4,y-2);}else{ctx.moveTo(x,y+8);ctx.lineTo(x-4,y+2);ctx.lineTo(x+4,y+2);}ctx.closePath();ctx.fill();
      if(st.showConsumptionLabels&&labels.has(e)){
        var txt=consumptionLabel(e);ctx.font="850 "+(mobile?7.5:8.5)+"px system-ui";var tw=ctx.measureText(txt).width+10,tx=Math.min(cfg.x1-tw-3,x+8),ty=buy?y-15:y+15;
        ty=Math.max(cfg.y0+8,Math.min(cfg.y1-8,ty));ctx.fillStyle="rgba(2,7,10,.88)";ctx.fillRect(tx,ty-8,tw,16);ctx.strokeStyle="rgba("+col+",.60)";ctx.strokeRect(tx+.5,ty-7.5,tw-1,15);ctx.fillStyle="rgba("+col+",.98)";ctx.textAlign="left";ctx.fillText(txt,tx+5,ty);
      }
    }
    ctx.restore();
  }

  function visibleTradeGroups(cfg){
    var t0=slotToTime(0,cfg)-intervalMsFromView(cfg.view),t1=slotToTime(cfg.win.totalSlots-1,cfg)+intervalMsFromView(cfg.view),step=Math.max(R.step||0,niceStep((cfg.max-cfg.min)/Math.max(160,(cfg.y1-cfg.y0)/2)));
    var groups=new Map(),arr=[];
    for(var i=0;i<R.trades.length;i++){
      var tr=R.trades[i];if(tr.t<t0||tr.t>t1||tr.p<cfg.min||tr.p>cfg.max)continue;
      var tb=Math.floor(tr.t/st.groupingMs),pb=Math.round(tr.p/step),k=tb+"|"+pb,g=groups.get(k);
      if(!g){g={t:tb*st.groupingMs+st.groupingMs/2,p:pb*step,b:0,s:0,n:0,c:0};groups.set(k,g);arr.push(g);}
      if(tr.buy)g.b+=tr.n;else g.s+=tr.n;g.n+=tr.n;g.c++;
    }
    return arr;
  }
  function bubbleThreshold(groups){
    if(st.filterMode==="manual")return st.minNotional;
    if(groups.length<8)return 0;
    var a=groups.map(function(g){return g.n;}).sort(function(x,y){return x-y;}),i=Math.max(0,Math.min(a.length-1,Math.floor((st.bubblePercentile/100)*(a.length-1))));
    return a[i];
  }
  function drawSplitBubble(ctx,x,y,r,g){
    var total=Math.max(1,g.n),buyFrac=g.b/total,ang=-Math.PI/2,buyAng=Math.PI*2*buyFrac;
    if(g.b>0){ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,ang,ang+buyAng);ctx.closePath();ctx.fillStyle="rgba(43,226,138,"+st.bubbleOpacity+")";ctx.fill();}
    if(g.s>0){ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,ang+buyAng,ang+Math.PI*2);ctx.closePath();ctx.fillStyle="rgba(255,82,107,"+st.bubbleOpacity+")";ctx.fill();}
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle="rgba(2,8,12,.78)";ctx.lineWidth=Math.max(.7,r*.08);ctx.stroke();
  }
  function drawBubbles(ctx,cfg){
    if(!st.bubbles||!R.trades.length)return;
    var gs=visibleTradeGroups(cfg),thr=bubbleThreshold(gs);R.lastThreshold=thr;var max=thr;
    for(var i=0;i<gs.length;i++)if(gs[i].n>max)max=gs[i].n;
    gs=gs.filter(function(g){return g.n>=thr;}).sort(function(a,b){return b.n-a.n;}).slice(0,window.innerWidth<760?42:90);
    R.lastDrawnBubbles=gs.length;
    ctx.save();
    for(var z=gs.length-1;z>=0;z--){
      var g=gs[z],slot=timeToSlot(g.t,cfg),x=cfg.x(slot),y=cfg.y(g.p);if(x<cfg.x0-20||x>cfg.x1+20||y<cfg.y0-20||y>cfg.y1+20)continue;
      var rel=Math.max(.06,(g.n-thr)/Math.max(1,max-thr)),r=(2.4+Math.sqrt(rel)*11)*st.bubbleScale;if(window.innerWidth<760)r=Math.min(r,12);else r=Math.min(r,18);
      if(st.bubbleMode==="split")drawSplitBubble(ctx,x,y,r,g);
      else if(st.bubbleMode==="delta"){
        var d=(g.b-g.s)/Math.max(1,g.n),col=d>=0?"43,226,138":"255,82,107";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle="rgba("+col+","+st.bubbleOpacity+")";ctx.fill();ctx.strokeStyle="rgba(238,244,255,.55)";ctx.lineWidth=1;ctx.stroke();
      }else{
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle="rgba(244,238,105,"+(st.bubbleOpacity*.86)+")";ctx.fill();ctx.strokeStyle="rgba(255,255,255,.58)";ctx.lineWidth=1;ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawPriceLine(ctx,cfg){
    var v=cfg.drawView||cfg.view||[];if(!v.length)return;
    ctx.save();ctx.strokeStyle="rgba(231,239,255,.82)";ctx.lineWidth=1.15;ctx.beginPath();
    for(var i=0;i<v.length;i++){var xx=cfg.x(cfg.slotOffset+i),yy=cfg.y(Number(v[i].close));if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.stroke();
    var last=v[v.length-1],lx=cfg.x(cfg.slotOffset+v.length-1),ly=cfg.y(Number(last.close));ctx.fillStyle="#f2f5ff";ctx.beginPath();ctx.arc(lx,ly,2.2,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawStatus(ctx,cfg){
    if(!st.showStatus)return;
    var s=recentConsumptionStats(),dom=s.buy-s.sell,domTxt=Math.abs(dom)<1?"NEUTRO":(dom>0?"BUY +":"SELL +")+fmtN(Math.abs(dom));
    var line1="DEEP HEATMAP · "+(R.status||"")+" · "+R.snapshots.length+" cols";
    var line2=s.count?("30s  COMPRA→ASK "+fmtN(s.buy)+"  ·  VENDA→BID "+fmtN(s.sell)+"  ·  "+domTxt):"30s · SEM CONSUMO CONFIRMADO";
    ctx.save();ctx.textAlign="left";ctx.textBaseline="middle";ctx.font = "800 9px system-ui";
    var maxW=Math.max(ctx.measureText(line1).width,ctx.measureText(line2).width)+16,w=Math.min(cfg.x1-cfg.x0-16,maxW);
    ctx.fillStyle="rgba(2,7,11,.84)";ctx.fillRect(cfg.x0+8,cfg.y0+24,w,36);ctx.strokeStyle="rgba(139,167,190,.18)";ctx.strokeRect(cfg.x0+8.5,cfg.y0+24.5,w-1,35);
    ctx.fillStyle="rgba(206,224,239,.82)";ctx.fillText(line1,cfg.x0+15,cfg.y0+34);
    ctx.fillStyle=s.count?(dom>=0?"rgba(43,226,138,.96)":"rgba(255,82,107,.96)"):"rgba(151,168,179,.80)";ctx.fillText(line2,cfg.x0+15,cfg.y0+49);
    /* Tiny fixed legend: resting uses blue/yellow only; green/red are reserved for confirmed consumption. */
    var lx=cfg.x0+10,ly=cfg.y0+66;if(ly<cfg.y1-8){ctx.font="750 7px system-ui";ctx.fillStyle="rgba(18,151,188,.9)";ctx.fillRect(lx,ly-3,6,6);ctx.fillStyle="rgba(185,202,213,.78)";ctx.fillText("LIQUIDEZ",lx+9,ly);lx+=58;ctx.fillStyle="rgba(242,211,72,.95)";ctx.fillRect(lx,ly-3,6,6);ctx.fillStyle="rgba(185,202,213,.78)";ctx.fillText("FORTE",lx+9,ly);lx+=45;ctx.fillStyle="rgba(43,226,138,.95)";ctx.fillText("▲ BUY CONSOME ASK",lx,ly);lx+=94;ctx.fillStyle="rgba(255,82,107,.95)";ctx.fillText("▼ SELL CONSOME BID",lx,ly);}
    ctx.restore();
  }

  /* Beta 1.370 — faixa de preço DIRIGIDA PELOS DADOS pro modo Heatmap/Linha.
     No modo Candles o eixo é o do gráfico (fixo) → só mostra a liquidez perto do
     preço atual. Nos modos Heatmap/Linha, o eixo passa a cobrir o book de TODAS
     as colunas visíveis (união dos ranges), então o mapa PREENCHE a largura toda
     estilo DeepCharts, com escala de preço própria e a linha de preço por cima. */
  function computeHeatRange(cfg){
    if(!R.step||!R.snapshots.length) return {min:cfg.min,max:cfg.max};
    var t0=slotToTime(0,cfg), t1=slotToTime(Math.max(1,cfg.win.totalSlots-1),cfg);
    var mnB=Infinity,mxB=-Infinity,c=0;
    for(var i=R.snapshots.length-1;i>=0;i--){ var s=R.snapshots[i]; if(s.t<t0-120000)break; if(s.t>t1+120000)continue; if(s.base<mnB)mnB=s.base; if(s.base>mxB)mxB=s.base; c++; if(c>5000)break; }
    if(!c||!isFinite(mnB)) return {min:cfg.min,max:cfg.max};
    var min=mnB*R.step, max=(mxB+512)*R.step, pad=(max-min)*0.015;
    if(!(max>min)) return {min:cfg.min,max:cfg.max};
    return {min:min-pad, max:max+pad};
  }
  function drawHeatScale(ctx,cfg,rmin,rmax){
    ctx.save();ctx.font="700 8px system-ui";ctx.textAlign="right";ctx.textBaseline="middle";
    var n=7,dec=priceDecimals(R.step||1);
    for(var i=0;i<=n;i++){ var p=rmax-(rmax-rmin)*i/n, yy=cfg.y0+(cfg.y1-cfg.y0)*i/n;
      if(yy<cfg.y0+6||yy>cfg.y1-2) continue;
      var tx=Number(p).toLocaleString("en-US",{minimumFractionDigits:dec,maximumFractionDigits:dec}),w=ctx.measureText(tx).width+8;
      ctx.fillStyle="rgba(2,7,11,.72)";ctx.fillRect(cfg.x1-w-2,yy-7,w,14);
      ctx.fillStyle="rgba(200,216,230,.85)";ctx.fillText(tx,cfg.x1-6,yy); }
    ctx.restore();
  }
  window.DVLDeepHeatmapDraw=function(ctx,cfg){
    if(!st.on||replayActive()||st.viewMode!=="candles")return;
    try{drawHeat(ctx,cfg);drawStatus(ctx,cfg);R.lastDrawAt=Date.now();}catch(e){R.err=String(e&&e.message||e);}
  };
  window.DVLDeepHeatmapForegroundDraw=function(ctx,cfg){
    if(!st.on||replayActive())return;
    try{
      if(st.viewMode!=="candles"){
        var hr=computeHeatRange(cfg),Y0=cfg.y0,Y1=cfg.y1,rmin=hr.min,rmax=hr.max,span=Math.max(1e-9,rmax-rmin);
        var cfg2=Object.assign({},cfg,{min:rmin,max:rmax,y:function(p){return Y1-(p-rmin)/span*(Y1-Y0);}});
        ctx.save();ctx.fillStyle=st.viewMode==="heatmap"?"rgba(0,0,0,.96)":"rgba(0,0,0,.82)";ctx.fillRect(cfg.x0,cfg.y0,cfg.x1-cfg.x0,cfg.y1-cfg.y0);ctx.restore();
        drawHeat(ctx,cfg2);drawPriceLine(ctx,cfg2);drawHeatScale(ctx,cfg2,rmin,rmax);drawStatus(ctx,cfg2);
        drawConsumption(ctx,cfg2);drawBubbles(ctx,cfg2);
      } else {
        drawConsumption(ctx,cfg);drawBubbles(ctx,cfg);
      }
      R.lastDrawAt=Date.now();
    }catch(e){R.err=String(e&&e.message||e);}
  };

  /* ── Níveis / memória de liquidez (persistent levels) ─────────────────
     Detecta preços onde uma parede (>= levelsMinNotional) REAPARECE (refill/
     iceberg) >= levelsMinRefills vezes e crava uma FAIXA que sobrevive à
     retirada da ordem E ao desligar o heatmap ao vivo (o desenho depende só
     de st.levelsOn, nunca de st.on). Rompe quando o preço atravessa a faixa. */
  var LV={ledger:new Map(),sym:"",saveT:0,lastMid:0};
  function lvBandTol(price){return Math.max((R.step||1)*3, price*0.0004);}
  function lvKey(price){return Math.round(price/lvBandTol(price));}
  function lvStore(){return "DVL_DH_LEVELS_"+(gsym()||"GLOBAL");}
  function lvPrice(){ if(R.mid>0)return R.mid; try{ if(typeof klines!=="undefined"&&klines.length)return +klines[klines.length-1].close; }catch(_){ } return LV.lastMid; }
  function lvLoad(){
    LV.ledger=new Map(); LV.sym=gsym();
    try{ var raw=JSON.parse(localStorage.getItem(lvStore())||"null");
      if(raw&&raw.levels)raw.levels.forEach(function(l){ LV.ledger.set(l.k,{side:l.side,pLo:+l.pLo,pHi:+l.pHi,maxNotional:+l.maxNotional,refills:+l.refills,present:false,lastSeen:+l.lastSeen||0,firstSeen:+l.firstSeen||0,broken:!!l.broken}); });
    }catch(_){ }
  }
  function lvSave(){
    clearTimeout(LV.saveT);
    LV.saveT=setTimeout(function(){ LV.saveT=0;
      try{ var arr=[]; LV.ledger.forEach(function(v,k){ if(!v.broken&&v.refills>=1)arr.push({k:k,side:v.side,pLo:v.pLo,pHi:v.pHi,maxNotional:v.maxNotional,refills:v.refills,lastSeen:v.lastSeen,firstSeen:v.firstSeen,broken:v.broken}); });
        arr.sort(function(a,b){return (b.refills*b.maxNotional)-(a.refills*a.maxNotional);});
        if(arr.length>60)arr=arr.slice(0,60);
        localStorage.setItem(lvStore(),JSON.stringify({levels:arr}));
      }catch(_){ }
    },800);
  }
  function lvScanSide(map,side,minN){
    if(!map||!map.size)return [];
    var cells=[]; map.forEach(function(q,p){ var n=q*p; if(n>=minN)cells.push([p,n]); });
    if(!cells.length)return [];
    cells.sort(function(a,b){return a[0]-b[0];});
    var tol=lvBandTol(cells[0][0])*1.5, bands=[], cur=null;
    for(var i=0;i<cells.length;i++){ var p=cells[i][0],n=cells[i][1];
      if(cur&&(p-cur.pHi)<=tol){ cur.pHi=p; if(n>cur.peak)cur.peak=n; }
      else { if(cur)bands.push(cur); cur={pLo:p,pHi:p,peak:n,side:side}; } }
    if(cur)bands.push(cur);
    return bands;
  }
  function lvTick(){
    if(!st.levelsOn)return;
    if(gsym()!==LV.sym){ lvSave(); lvLoad(); }
    var minN=st.levelsMinNotional, now=Date.now(), mid=lvPrice();
    if(st.on && ((R.bids&&R.bids.size)||(R.asks&&R.asks.size)) && mid>0){
      var bands=lvScanSide(R.bids,"bid",minN).concat(lvScanSide(R.asks,"ask",minN));
      var seen={};
      bands.forEach(function(bd){
        var key=bd.side+":"+lvKey((bd.pLo+bd.pHi)/2); seen[key]=1;
        var e=LV.ledger.get(key);
        if(!e){ LV.ledger.set(key,{side:bd.side,pLo:bd.pLo,pHi:bd.pHi,maxNotional:bd.peak,refills:1,present:true,lastSeen:now,firstSeen:now,broken:false}); }
        else { if(!e.present)e.refills++; e.present=true; e.lastSeen=now; e.broken=false;
          if(bd.peak>e.maxNotional)e.maxNotional=bd.peak;
          /* Beta 1.584 — a faixa ACOMPANHA a extensão atual da parede (não mais a
             união histórica de todos os preços já vistos, que inchava o nível até
             virar um blobão cobrindo meia tela). Quando a ordem é retirada
             (present=false) mantém o último lugar como memória até o preço romper. */
          e.pLo=bd.pLo; e.pHi=bd.pHi; }
      });
      LV.ledger.forEach(function(e,key){ if(!seen[key])e.present=false; });
      LV.lastMid=mid;
    }
    if(mid>0){ LV.ledger.forEach(function(e){ if(e.broken)return;
      var mgn=Math.max((R.step||1)*2,(e.pHi-e.pLo)*0.6);
      if(e.side==="bid"&&mid<e.pLo-mgn)e.broken=true;
      else if(e.side==="ask"&&mid>e.pHi+mgn)e.broken=true;
    }); }
    if(LV.ledger.size>200){ var arr=[]; LV.ledger.forEach(function(v,k){arr.push([k,v]);});
      arr.sort(function(a,b){return (a[1].refills*a[1].maxNotional)-(b[1].refills*b[1].maxNotional);});
      for(var i=0;i<arr.length-140;i++)LV.ledger.delete(arr[i][0]); }
    lvSave();
  }
  function lvWipe(){ LV.ledger=new Map(); try{localStorage.removeItem(lvStore());}catch(_){ } safeDraw(); }
  window.DVLDeepHeatmapLevelsDraw=function(ctx,cfg){
    if(!st.levelsOn)return;
    try{
      if(gsym()!==LV.sym){ lvSave(); lvLoad(); }
      var minRef=st.levelsMinRefills, opBase=st.levelsOpacity;
      ctx.save();
      LV.ledger.forEach(function(e){
        if(e.broken||e.refills<minRef)return;
        var yA=cfg.y(e.pHi),yB=cfg.y(e.pLo),yTop=Math.min(yA,yB),yBot=Math.max(yA,yB);
        if(yBot<cfg.y0||yTop>cfg.y1)return;
        var yy=Math.max(cfg.y0,yTop),hh=Math.min(cfg.y1,yBot)-yy; if(hh<2)hh=2;
        var col=e.side==="bid"?[19,220,141]:[255,74,97];
        var strength=Math.min(1,(e.refills-minRef+1)/4)*0.6+Math.min(1,e.maxNotional/(st.levelsMinNotional*6))*0.4;
        var alpha=Math.max(0.05,Math.min(0.9,opBase*(0.5+strength)));
        ctx.fillStyle="rgba("+col[0]+","+col[1]+","+col[2]+","+alpha+")";
        ctx.fillRect(cfg.x0,yy,cfg.x1-cfg.x0,hh);
        ctx.strokeStyle="rgba("+col[0]+","+col[1]+","+col[2]+","+Math.min(1,alpha+0.35)+")";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(cfg.x0,yy+0.5);ctx.lineTo(cfg.x1,yy+0.5);ctx.moveTo(cfg.x0,yy+hh-0.5);ctx.lineTo(cfg.x1,yy+hh-0.5);ctx.stroke();
        ctx.fillStyle="rgba("+col[0]+","+col[1]+","+col[2]+",0.95)";ctx.font="700 9px system-ui";ctx.textAlign="right";ctx.textBaseline="middle";
        ctx.fillText("×"+e.refills,cfg.x1-6,yy+hh/2);
      });
      ctx.restore();
    }catch(err){R.err=String(err&&err.message||err);}
  };
  lvLoad();
  setInterval(lvTick,700);

  /* ── UI ─────────────────────────────────────────────────────────────── */
  var panel=null,panelTimer=0;
  function seg(label,key,opts){return '<div class="dvl-dh-field"><label>'+label+'</label><div class="dvl-dh-seg">'+opts.map(function(o){return '<button type="button" data-dhseg="'+key+'" data-val="'+o[0]+'" class="'+(String(st[key])===String(o[0])?'is-on':'')+'">'+o[1]+'</button>';}).join('')+'</div></div>';}
  function sw(label,key){return '<div class="dvl-dh-field"><label>'+label+'</label><label class="dvl-switch"><input type="checkbox" data-dhsw="'+key+'" '+(st[key]?'checked':'')+'><i></i><b></b></label></div>';}
  function step(label,key,min,max,inc,dec,suffix){var v=Number(st[key]),text=dec?v.toFixed(dec):String(Math.round(v));return '<div class="dvl-dh-field"><label>'+label+'</label><div class="dvl-dh-step" data-key="'+key+'" data-min="'+min+'" data-max="'+max+'" data-step="'+inc+'" data-dec="'+dec+'"><button type="button" data-dir="-1">−</button><span contenteditable="plaintext-only" inputmode="decimal" spellcheck="false">'+text+'</span><i>'+(suffix||'')+'</i><button type="button" data-dir="1">+</button></div></div>';}
  function statusLine(){
    var c=R.connected?'#58e5a4':'#f4b942';
    return '<b style="color:'+c+'">'+(R.status||'OFF')+'</b> · '+R.snapshots.length+' colunas · '+R.trades.length+' trades'+(R.historySeeded?' · '+R.historySeeded+' históricos':'')+(R.err?'<br><span style="color:#ff7588">'+String(R.err).slice(0,110)+'</span>':'');
  }
  function bodyHTML(){
    return '<div class="dvl-dh-power"><span><b>Motor Deep Heatmap</b><small>liquidez passiva + consumo confirmado</small></span><label class="dvl-switch"><input type="checkbox" data-dhpower '+(st.on?'checked':'')+'><i></i><b></b></label></div>'+ 
      '<div id="dvlDhStatus" class="dvl-dh-status">'+statusLine()+'</div>'+ 
      seg('Visual','viewMode',[["candles","Candles"],["line","Linha"],["heatmap","Heatmap"]])+ 
      seg('Fonte','source',[["auto","Auto"],["futures","Futures"],["spot","Spot"]])+ 
      sw('Heatmap de liquidez','heatmap')+sw('Fluxo ao vivo (paredes formando)','liveFlow')+sw('Consumo confirmado','showConsumption')+sw('Labels de consumo','showConsumptionLabels')+sw('Mostrar retiradas','showPulls')+sw('Volume Bubbles','bubbles')+
      step('Histórico (min)','historyMinutes',10,120,10,0,'m')+ 
      step('Amostra','sampleMs',400,2000,50,0,'ms')+ 
      step('Faixa vertical','spanPct',0.4,5,0.1,1,'%')+ 
      step('Contraste liquidez','liquidityContrast',0,100,2,0,'')+ 
      step('Topo forte','topContrast',90,99.9,0.1,1,'%')+ 
      step('Opacidade mapa','heatOpacity',0.2,1,0.05,2,'')+ 
      step('Pixel da matriz','cellPx',1,5,1,0,'px')+ 
      '<div class="dvl-dh-sub">CONSUMO DE LIQUIDEZ</div>'+ 
      step('Sensibilidade','consumptionSensitivity',0,100,2,0,'')+ 
      step('Mínimo consumido','consumptionMinNotional',5000,50000000,5000,0,' USDT')+ 
      step('Janela de confirmação','consumptionWindowMs',500,5000,100,0,'ms')+ 
      '<div class="dvl-dh-sub">VOLUME BUBBLES</div>'+seg('Modo','bubbleMode',[["split","Ask/Bid"],["delta","Delta"],["volume","Volume"]])+ 
      seg('Filtro','filterMode',[["auto","Auto"],["manual","Manual"]])+ 
      (st.filterMode==='manual'?step('Mínimo nocional','minNotional',0,50000000,25000,0,' USDT'):step('Percentil','bubblePercentile',80,99.9,0.5,1,'%'))+ 
      step('Tamanho','bubbleScale',0.25,2.5,0.05,2,'x')+step('Opacidade bubbles','bubbleOpacity',0.15,1,0.05,2,'')+ 
      step('Agrupamento','groupingMs',100,5000,100,0,'ms')+sw('Status no gráfico','showStatus')+
      '<div class="dvl-dh-sub">NÍVEIS / MEMÓRIA DE LIQUIDEZ</div>'+
      sw('Níveis persistentes','levelsOn')+
      step('Min. refills','levelsMinRefills',1,10,1,0,'x')+
      step('Min. notional','levelsMinNotional',5000,50000000,25000,0,' USDT')+
      step('Opacidade níveis','levelsOpacity',0.05,1,0.05,2,'')+
      '<div class="dvl-dh-note"><b>Leitura simples:</b> azul/ciano é liquidez parada; amarelo é liquidez forte. Verde aparece somente quando compras agressivas coincidem com redução da ASK. Vermelho aparece somente quando vendas agressivas coincidem com redução da BID. Redução sem trades compatíveis é tratada como retirada e fica cinza quando habilitada.</div>';
  }
  function commitStep(box,text){
    var key=box.dataset.key,min=Number(box.dataset.min),max=Number(box.dataset.max),dec=Number(box.dataset.dec)||0,v=Number(String(text).replace(',','.'));
    if(!Number.isFinite(v))v=Number(st[key]);v=Math.max(min,Math.min(max,v));v=Number(v.toFixed(dec));
    setState(key,v,key==='source'||key==='historyMinutes'||key==='sampleMs'||key==='spanPct');
  }
  function bindBody(b){
    var p=b.querySelector('[data-dhpower]');if(p)p.addEventListener('change',function(){setOn(p.checked);});
    b.querySelectorAll('[data-dhseg]').forEach(function(el){el.addEventListener('click',function(){var k=el.dataset.dhseg,v=el.dataset.val;setState(k,v,k==='source');});});
    b.querySelectorAll('[data-dhsw]').forEach(function(el){el.addEventListener('change',function(){setState(el.dataset.dhsw,el.checked,false);});});
    b.querySelectorAll('.dvl-dh-step').forEach(function(box){
      var val=box.querySelector('span'),old=val.textContent;
      box.querySelectorAll('button[data-dir]').forEach(function(bt){bt.addEventListener('click',function(){var stepN=Number(box.dataset.step),cur=Number(String(val.textContent).replace(',','.'));if(!Number.isFinite(cur))cur=Number(st[box.dataset.key]);commitStep(box,cur+Number(bt.dataset.dir)*stepN);});});
      val.addEventListener('focus',function(){old=val.textContent;try{document.execCommand('selectAll',false,null);}catch(_){}});
      val.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();commitStep(box,val.textContent);}else if(e.key==='Escape'){e.preventDefault();val.textContent=old;val.blur();}});
      val.addEventListener('blur',function(){commitStep(box,val.textContent);});
    });
  }
  function renderPanel(){if(!panel)return;var b=panel.querySelector('#dvlDeepHeatmapBody');if(b){b.innerHTML=bodyHTML();bindBody(b);} }
  function openPanel(){
    if(!panel){
      panel=document.createElement('div');panel.id='dvlDeepHeatmapPanel';panel.className='dvl-vt-panel dvl-dh-panel';
      panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>DVL Deep Heatmap</b><small>liquidity · confirmed consumption</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlDhReset" type="button" title="Restaurar">⟲</button><button class="dvl-vt-close" id="dvlDhClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlDeepHeatmapBody"></div>';
      document.body.appendChild(panel);panel.addEventListener('pointerdown',function(e){e.stopPropagation();},true);
      panel.querySelector('#dvlDhClose').addEventListener('click',function(){panel.classList.remove('is-open');clearInterval(panelTimer);});
      panel.querySelector('#dvlDhReset').addEventListener('click',reset);
    }
    if(!st.on)setOn(true);renderPanel();panel.classList.add('is-open');clearInterval(panelTimer);panelTimer=setInterval(function(){var e=panel&&panel.querySelector('#dvlDhStatus');if(e)e.innerHTML=statusLine();},900);
  }

  function testInject(){
    /* Manual diagnostic only; never called by boot or production paths. */
    try{
      var now=Date.now(),basePrice=64000,bar=60000;
      if(typeof klines!=="undefined"&&Array.isArray(klines)&&!klines.length){
        for(var i=0;i<150;i++){
          var t=now-(149-i)*bar,drift=Math.sin(i/10)*55+Math.sin(i/27)*85,op=basePrice+drift+(i?Math.sin((i-1)/10)*12:0),cl=basePrice+drift+Math.sin(i/3)*18;
          klines.push({time:t,open:op,high:Math.max(op,cl)+15+(i%7)*3,low:Math.min(op,cl)-14-(i%5)*3,close:cl,volume:80+(i%13)*12});
        }
      }
      R.symbol=gsym();R.mid=basePrice;R.step=2;R.snapshots=[];R.trades=[];R.consumption=[];
      for(var c=0;c<240;c++){
        var tm=now-(239-c)*15000,mid=basePrice+Math.sin(c/24)*95+Math.sin(c/8)*22,base=Math.floor(mid/R.step)-256,bv=new Uint16Array(512),av=new Uint16Array(512);
        var bidBands=[basePrice-132,basePrice-70],askBands=[basePrice+56,basePrice+126];
        for(var b=0;b<bidBands.length;b++){var br=Math.floor(bidBands[b]/R.step)-base;if(br>=0&&br<512&&c>(22+b*38))bv[br]=Math.min(65535,36500+b*5400+Math.round(Math.sin(c/13+b)*2600));}
        for(var a=0;a<askBands.length;a++){var ar=Math.floor(askBands[a]/R.step)-base;if(ar>=0&&ar<512&&c<(214-a*22))av[ar]=Math.min(65535,38000+a*5200+Math.round(Math.sin(c/15+a)*2500));}
        for(var z=0;z<512;z+=23){if((z+c)%43<2){if(z<256)bv[z]=Math.max(bv[z],10000+((z*c)%7000));else av[z]=Math.max(av[z],10000+((z*c)%7000));}}
        R.snapshots.push({t:tm,base:base,b:bv,a:av});
      }
      for(var q=0;q<150;q++){
        var tt=now-(149-q)*18000,pp=basePrice+Math.sin(q/12)*88+Math.sin(q/4)*15,n=14000+(q%19)*7500;
        R.trades.push({t:tt,p:pp,n:n,buy:(q%5!==0&&Math.sin(q/7)>-.25)});
      }
      R.consumption=[
        {t:now-210000,p:basePrice+56,side:"buy",book:"ask",kind:"consume",n:420000,strength:.92},
        {t:now-135000,p:basePrice-70,side:"sell",book:"bid",kind:"consume",n:285000,strength:.78},
        {t:now-55000,p:basePrice+126,side:"buy",book:"ask",kind:"consume",n:610000,strength:1},
        {t:now-18000,p:basePrice-132,side:"sell",book:"bid",kind:"consume",n:190000,strength:.70}
      ];
      R.snapVersion++;R.tradeVersion++;R.consumptionVersion++;R.status="TEST CONSUMPTION";R.connected=true;R.synced=true;R.cache.key="";safeDraw();
      return true;
    }catch(e){R.err=String(e&&e.message||e);return false;}
  }
  window.DVL_DEEP_HEATMAP_API={
    version:'1.354',isOn:function(){return !!st.on;},on:function(){return !!st.on;},setOn:setOn,
    openPanel:openPanel,open:openPanel,settings:st,_testInject:testInject,_rebuildConsumption:rebuildConsumption,
    _persist:persistSnapshots,_restore:restoreSnapshots,_wipeSnaps:function(){R.snapshots=[];R.snapVersion++;R.cache.key="";},
    _wipeLevels:lvWipe,_levels:function(){var a=[];LV.ledger.forEach(function(v,k){a.push(Object.assign({k:k},v));});return a;},_lvTick:lvTick,
    _injectBook:function(bids,asks,mid){R.bids=new Map(bids);R.asks=new Map(asks);if(mid)R.mid=mid;},
    debug:function(){return {on:st.on,symbol:R.symbol,source:R.source,status:R.status,connected:R.connected,synced:R.synced,step:R.step,snapshots:R.snapshots.length,trades:R.trades.length,historySeeded:R.historySeeded,consumptionEvents:R.consumption.length,consumption30s:R.lastConsumptionStats,lastThreshold:R.lastThreshold,lastDrawnBubbles:R.lastDrawnBubbles,error:R.err};}
  };

  function boot(){
    updateStatePill();
    try{window.addEventListener('dvl-safe-asset-selected-0804',function(){if(st.on){resetData(false);connect(true);}}, {passive:true});}catch(_){}
    try{document.addEventListener('visibilitychange',function(){if(document.hidden)stopFeed();else if(st.on&&!replayActive())connect(true);});}catch(_){}
    setInterval(function(){
      if(!st.on)return;
      if(replayActive()){if(R.ws)stopFeed();return;}
      if(!R.ws||R.symbol!==gsym())connect(true);
    },3500);
    if(st.on){takeoverOld();connect(true);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
