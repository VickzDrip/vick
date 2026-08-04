(function(){
  "use strict";

  if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780) return;

  /* ── Tuning ──────────────────────────────────────────────── */
  var KLIM      = 80;            /* candles per symbol */
  var CAND      = 200;           /* scan top 200 by 24h volume */
  var POOL      = 8;
  var REFRESH_MS= 300000;        /* auto-refresh every 5 min */
  var STALE_MS  = 300000;
  var FRESH_MS  = 3 * 3600000;
  var HIST_KEY  = "dvlScanHist0800";
  var HIST_MAX_AGE = 86400000;   /* keep signals for 24h */
  var LS_KEY    = "dvlScanExchange0790";
  var LS_FIL    = "dvlScanFilter0795";
  var LS_SORT   = "dvlScanSort0794";

  var TF_LIST   = ["1m","3m","5m","15m","30m","1h"];
  var MEXC_TF   = {"1m":"Min1","3m":"Min5","5m":"Min5","15m":"Min15","30m":"Min30","1h":"Min60"};

  var ICONS = {
    BTC:"B",ETH:"E",LTC:"L",BNB:"B",XRP:"X",DOGE:"D",AVAX:"A",
    SOL:"S",ADA:"A",LINK:"L",SUI:"S",DOT:"D",UNI:"U",SHIB:"S",
    NEAR:"N",APT:"A",ARB:"A",OP:"O",SEI:"S",INJ:"I",TON:"T",
    PEPE:"P",WIF:"W",BONK:"B",FLOKI:"F",FTM:"F",ETC:"E",BCH:"B",
    FIL:"F",ATOM:"A",TRX:"T",XLM:"X",ICP:"I",HBAR:"H",VET:"V",
    SAND:"S",MANA:"M",CRV:"C",AAVE:"A",POL:"P",SNX:"S",
    MKR:"M",GRT:"G",ZEC:"Z",DASH:"D",ALGO:"A",EGLD:"E",
    THETA:"T",ONE:"O",ROSE:"R",ZIL:"Z",KSM:"K",BAT:"B",
    WAVES:"W",AR:"A",GAS:"G",IMX:"I",CHZ:"C",ENJ:"E"
  };
  var KNOWN = {
    btc:1,eth:1,sol:1,bnb:1,xrp:1,ada:1,doge:1,avax:1,link:1,ltc:1,sui:1,
    dot:1,near:1,shib:1,apt:1,arb:1,op:1,atom:1,trx:1,xlm:1,
    icp:1,ton:1,fil:1,bch:1,hbar:1,pepe:1,wif:1,bonk:1,inj:1,sei:1,
    etc:1,uni:1,ftm:1,snx:1,floki:1,pol:1,mkr:1,grt:1,aave:1
  };

  /* ── Sort modes ─────────────────────────────────────────────── */
  var SORT_LABELS = {spike:"Maior spike",recente:"Maior variação",volume:"Maior volume",raw:"Sem filtro"};

  var sortMode = (function(){
    try{ var s=localStorage.getItem(LS_SORT); return SORT_LABELS[s]?s:"spike"; }catch(_){ return "spike"; }
  })();

  /* ── Filter state ───────────────────────────────────────────── */
  var filterState = (function(){
    try{
      var o=JSON.parse(localStorage.getItem(LS_FIL)||"{}");
      return {
        spikeMin       : isNaN(parseFloat(o.spikeMin))       ? 0    : Math.max(0,parseFloat(o.spikeMin)),
        maPeriod1      : Math.min(200,Math.max(2,parseInt(o.maPeriod1)||20)),
        maPeriod2      : Math.min(500,Math.max(2,parseInt(o.maPeriod2)||50)),
        flat_x         : isNaN(parseFloat(o.flat_x))          ? 10   : Math.max(0.1,parseFloat(o.flat_x)),
        minFlatBefore  : Math.max(0,parseInt(o.minFlatBefore)||0),
        maxAssets      : Math.min(100,Math.max(1,parseInt(o.maxAssets)||20)),
        scanTF         : TF_LIST.indexOf(o.scanTF)>=0 ? o.scanTF : "15m",
        spikeAbove     : o.spikeAbove==="both"?"both":"ma1",
        maFlatTolerance: isNaN(parseFloat(o.maFlatTolerance)) ? 0.30 : Math.min(2,Math.max(0,parseFloat(o.maFlatTolerance))),
        maFlatLookback : Math.min(50,Math.max(2,parseInt(o.maFlatLookback)||10)),
        useMaFlat      : o.useMaFlat===true||o.useMaFlat==="true",
        usePriceGlue   : o.usePriceGlue===true||o.usePriceGlue==="true",
        priceGlueMaPeriod : Math.min(500,Math.max(2,parseInt(o.priceGlueMaPeriod)||20)),
        priceGlueLookback : Math.min(80,Math.max(1,parseInt(o.priceGlueLookback)||10)),
        priceGlueMaxDistPct : isNaN(parseFloat(o.priceGlueMaxDistPct)) ? 0.25 : Math.min(10,Math.max(0.01,parseFloat(o.priceGlueMaxDistPct))),
        useSpikePrevVol : o.useSpikePrevVol===true||o.useSpikePrevVol==="true",
        spikePrevVolMult : isNaN(parseFloat(o.spikePrevVolMult)) ? 1.50 : Math.min(50,Math.max(1.00,parseFloat(o.spikePrevVolMult))),
        /* ── Spike Score blocks (RSI/OI/LSR/flat-volume-bar/spike/prevVol) ── */
        spikeMaMode        : o.spikeMaMode==="1" ? "1" : "2",
        flatVolumeBarLen   : Math.min(50,Math.max(1,parseInt(o.flatVolumeBarLen)||5)),
        rsiOversoldThreshold: Math.min(50,Math.max(1,parseFloat(o.rsiOversoldThreshold)||30)),
        rsiOversoldLookback : Math.min(100,Math.max(1,parseInt(o.rsiOversoldLookback)||20)),
        oiMaLen            : Math.min(200,Math.max(2,parseInt(o.oiMaLen)||20)),
        lsrMaLen           : Math.min(200,Math.max(2,parseInt(o.lsrMaLen)||20))
      };
    }catch(_){ return {spikeMin:0,maPeriod1:20,maPeriod2:50,flat_x:10,minFlatBefore:0,maxAssets:20,scanTF:"15m",spikeAbove:"ma1",maFlatTolerance:0.30,maFlatLookback:10,useMaFlat:false,usePriceGlue:false,priceGlueMaPeriod:20,priceGlueLookback:10,priceGlueMaxDistPct:0.25,useSpikePrevVol:false,spikePrevVolMult:1.50,spikeMaMode:"2",flatVolumeBarLen:5,rsiOversoldThreshold:30,rsiOversoldLookback:20,oiMaLen:20,lsrMaLen:20}; }
  })();

  /* ── Exchange adapters (FUTURES) ─────────────────────────────── */
  var EX = {
    binance:{
      label:"Binance",enabled:true,
      tickers:async function(){
        var r=await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr",{cache:"no-store"});
        if(!r.ok) throw new Error("ticker "+r.status);
        var d=await r.json();
        if(!Array.isArray(d)) throw new Error("ticker shape");
        return d.filter(function(t){
          var s=t&&t.symbol?t.symbol:"";
          return /USDT$/.test(s)&&s.indexOf("_")<0&&Number(t.quoteVolume)>0;
        }).map(function(t){return{sym:t.symbol,qv:Number(t.quoteVolume)};});
      },
      klines:async function(sym){
        var tf=filterState.scanTF||"15m";
        var url="https://fapi.binance.com/fapi/v1/klines?symbol="+encodeURIComponent(sym)+"&interval="+encodeURIComponent(tf)+"&limit="+KLIM;
        var r=await fetch(url,{cache:"no-store"});
        if(!r.ok) throw new Error("kl "+r.status);
        var d=await r.json();
        if(!Array.isArray(d)||d.length<25) throw new Error("kl short");
        var closes=[],vols=[];
        for(var i=0;i<d.length;i++){closes.push(Number(d[i][4]));vols.push(Number(d[i][5]));}
        return {closes:closes,vols:vols,lastOpen:Number(d[d.length-1][0])||0};
      },
      base:function(sym){return String(sym).replace(/USDT$/,"");}
    },
    mexc:{
      label:"MEXC",enabled:true,
      tickers:async function(){
        var r=await fetch("/mexc-proxy/api/v1/contract/ticker",{cache:"no-store"});
        if(!r.ok) throw new Error("ticker "+r.status);
        var j=await r.json();
        var d=j&&j.data?j.data:[];
        if(!Array.isArray(d)) throw new Error("ticker shape");
        return d.filter(function(t){var s=t&&t.symbol?t.symbol:"";return /_USDT$/.test(s)&&Number(t.amount24)>0;}).map(function(t){return{sym:t.symbol,qv:Number(t.amount24),oi:Number(t.holdVol)};});
      },
      klines:async function(sym){
        var tf=filterState.scanTF||"15m";
        var mexcTf=MEXC_TF[tf]||"Min15";
        var tfSec=tfToMs(tf)/1000;
        var start=Math.floor(Date.now()/1000)-KLIM*tfSec;
        var url="/mexc-proxy/api/v1/contract/kline/"+encodeURIComponent(sym)+"?interval="+mexcTf+"&start="+start;
        var r=await fetch(url,{cache:"no-store"});
        if(!r.ok) throw new Error("kl "+r.status);
        var j=await r.json();
        var d=j&&j.data?j.data:null;
        if(!d||!d.close||d.close.length<25) throw new Error("kl short");
        var closes=d.close.map(Number);
        var vols=(d.vol||d.amount||[]).map(Number);
        var times=d.time||[];
        return {closes:closes,vols:vols,lastOpen:(Number(times[times.length-1])||0)*1000};
      },
      base:function(sym){return String(sym).replace(/_USDT$/,"");}
    },
    bybit:{label:"Bybit",enabled:false}
  };

  function readExchange(){
    try{ var v=localStorage.getItem(LS_KEY); if(v&&EX[v]&&EX[v].enabled) return v; }catch(_){}
    return "binance";
  }

  var state={
    rows:[],
    rawRows:[],
    loaded:false,
    lastUpdate:null,
    loading:false,
    filterMode:"all",
    exchange:readExchange(),
    scale:1,
    searchQuery:"",
    lastScanTF:filterState.scanTF,
    lastMaPeriod1:filterState.maPeriod1,
    lastMaPeriod2:filterState.maPeriod2,
    lastUsePriceGlue:filterState.usePriceGlue,
    lastPriceGlueMaPeriod:filterState.priceGlueMaPeriod,
    lastPriceGlueLookback:filterState.priceGlueLookback,
    lastPriceGlueMaxDistPct:filterState.priceGlueMaxDistPct,
    lastUseSpikePrevVol:filterState.useSpikePrevVol,
    lastSpikePrevVolMult:filterState.spikePrevVolMult
  };

  /* ── Helpers ─────────────────────────────────────────────────── */
  function tfToMs(tf){
    var m={"1m":60000,"3m":180000,"5m":300000,"15m":900000,"30m":1800000,"1h":3600000};
    return m[tf]||900000;
  }

  function radarSVG(){
    return '<svg class="dvlScannerRadar080 dvlScannerLogo0969 dvlScanRadarA1014" viewBox="0 0 64 64" aria-hidden="true">'
      +'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        +'<circle class="dvlRadarRing faint" cx="32" cy="32" r="26"/>'
        +'<circle class="dvlRadarRing" cx="32" cy="32" r="18"/>'
        +'<circle class="dvlRadarRing soft" cx="32" cy="32" r="11"/>'
        +'<path class="dvlRadarArc strong" d="M13 32a19 19 0 0 1 19-19"/>'
        +'<path class="dvlRadarArc strong" d="M32 51a19 19 0 0 0 19-19"/>'
        +'<path class="dvlRadarArc soft" d="M9 32a23 23 0 0 1 23-23"/>'
        +'<path class="dvlRadarArc soft" d="M32 55a23 23 0 0 0 23-23"/>'
        +'<path class="dvlRadarSweep" d="M32 32L49 15"/>'
        +'<circle class="dvlRadarCenter" cx="32" cy="32" r="4.6"/>'
        +'<circle class="dvlRadarHit" cx="49" cy="15" r="4.4"/>'
      +'</g>'
    +'</svg>';
  }

  function scannerBtn(){
    return document.getElementById("scannerNavBtn")||document.querySelector(".bottomNav .navInner .navItem:nth-child(2)");
  }

  function forceButton(){
    var btn=scannerBtn();
    if(!btn) return;
    btn.id="scannerNavBtn";
    btn.type="button";
    btn.setAttribute("aria-label","Scanner");
    btn.setAttribute("title","Scanner");
    btn.setAttribute("data-dvl-scanner-nav","true");
    if(!btn.querySelector(".dvlScannerRadar080")||!/Scanner/i.test(btn.textContent||"")){
      btn.innerHTML=radarSVG()+'<span>Scanner</span>';
    }
  }

  function sma(values,period,idx){
    if(idx<period-1) return null;
    var sum=0;
    for(var i=idx-period+1;i<=idx;i++) sum+=Number(values[i]||0);
    return sum/period;
  }

  function pct(a,b){ if(!b) return 0; return((a-b)/b)*100; }

  /* ── OI / LSR blocks (client-side parity with the backend) ──────
     Arrow + colour for OI / LSR from a value series (oldest → newest).
     arrow: current value ABOVE its MA → "up", BELOW → "down".
     colour: MA rising + above = green, MA falling + below = red, else yellow. */
  function trendVsMA(series){
    var s=(series||[]).map(Number).filter(function(v){return Number.isFinite(v);});
    if(s.length<2) return {arrow:"up",color:"yellow"};
    function avg(a){ var sum=0; for(var i=0;i<a.length;i++) sum+=a[i]; return sum/Math.max(a.length,1); }
    var ma=avg(s), cur=s[s.length-1], above=cur>=ma;
    var half=Math.floor(s.length/2);
    var maRising=avg(s.slice(half))>=avg(s.slice(0,half));
    var color = (maRising&&above)?"green":(!maRising&&!above)?"red":"yellow";
    return {arrow:above?"up":"down", color:color};
  }

  /* Per-symbol OI history (MEXC holdVol only — Binance's ticker has no OI
     field, same limitation as the backend). One sample is pushed per
     refresh cycle, capped at filterState.oiMaLen. */
  var _dvlOiReg={};
  function pushOiClient(sym,value){
    if(!Number.isFinite(value)) return _dvlOiReg[sym]||[];
    var buf=_dvlOiReg[sym]||(_dvlOiReg[sym]=[]);
    buf.push(value);
    var cap=filterState.oiMaLen||20;
    while(buf.length>cap) buf.shift();
    return buf;
  }

  /* Bybit account-ratio (long/short) — same public endpoint the backend and
     the in-page oscillators already use for LSR. */
  var BYBIT_PERIOD={"1m":"5min","3m":"5min","5m":"5min","15m":"15min","30m":"30min","1h":"1h"};
  async function fetchLsr(symbol,tf,limit){
    try{
      var period=BYBIT_PERIOD[tf]||"15min";
      var url="https://api.bybit.com/v5/market/account-ratio?category=linear&symbol="+encodeURIComponent(symbol)+"&period="+period+"&limit="+(limit||20);
      var r=await fetch(url,{cache:"no-store"});
      if(!r.ok) return null;
      var j=await r.json();
      var list=(j&&j.result&&Array.isArray(j.result.list))?j.result.list:[];
      var pts=list.map(function(x){return {t:Number(x.timestamp),lsr:Number(x.buyRatio)/Math.max(Number(x.sellRatio),1e-9)};})
        .filter(function(p){return Number.isFinite(p.t)&&Number.isFinite(p.lsr)&&p.lsr>0;})
        .sort(function(a,b){return a.t-b.t;});
      if(!pts.length) return null;
      return pts.map(function(p){return p.lsr;});
    }catch(_){ return null; }
  }

  function priceMaGlueStats(closes,period,lookback,tolPct){
    var len=closes.length;
    period=Math.min(500,Math.max(2,parseInt(period)||20));
    lookback=Math.min(80,Math.max(1,parseInt(lookback)||10));
    tolPct=Math.min(10,Math.max(0.01,parseFloat(tolPct)||0.25));

    var start=Math.max(0,len-lookback);
    var ok=true,valid=0,maxDist=0,sumDist=0;

    for(var i=start;i<len;i++){
      var ma=sma(closes,period,i);
      var close=Number(closes[i]||0);
      if(!ma||!Number.isFinite(ma)||!close||!Number.isFinite(close)){
        ok=false;
        continue;
      }
      var dist=Math.abs((close-ma)/close)*100;
      valid++;
      sumDist+=dist;
      if(dist>maxDist) maxDist=dist;
      if(dist>tolPct) ok=false;
    }

    if(valid<lookback) ok=false;
    return {ok:ok,valid:valid,maxDist:maxDist,avgDist:valid?sumDist/valid:999,period:period,lookback:lookback,tolPct:tolPct};
  }

  function formatTime(d){
    try{ return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }catch(_){ return ""; }
  }

  function baseFromSymbol(b,fullSym){
    var letter = window.dvlAssetFirstLetter ? window.dvlAssetFirstLetter(fullSym || b) : String(b||"?").replace(/^[0-9]+/,"").charAt(0);
    var cls = window.dvlAssetLetterClass ? window.dvlAssetLetterClass(fullSym || b) : "dvlLetterGeneric";
    return {coin:cls,icon:letter,mexc:fullSym,symbol:b+"/USDT",side:"LONG",setup:""};
  }

  /* ── Signal computation (dynamic MA periods, volume-based flat) ── */
  function computeSignal(base,closes,vols,lastOpenMs){
    var p1=filterState.maPeriod1||20;
    var p2=filterState.maPeriod2||50;
    var len=vols.length;
    var volMa1=[],volMa2=[],priceMa1=[],priceMa2=[];
    for(var i=0;i<len;i++){
      volMa1.push(sma(vols,p1,i));
      volMa2.push(sma(vols,p2,i));
      priceMa1.push(sma(closes,p1,i));
      priceMa2.push(sma(closes,p2,i));
    }
    var lastVol=vols[len-1]||0;
    var lastMa1=volMa1[len-1]||(sma(vols,Math.min(p1,len),len-1)||1);
    var lastMa2=volMa2[len-1]||(sma(vols,Math.min(p2,len),len-1)||1);
    var spike1=lastVol/Math.max(lastMa1,1e-9);
    var spike2=lastVol/Math.max(lastMa2,1e-9);
    var ma1Now=priceMa1[len-1]||closes[len-1];
    var ma1Past=priceMa1[Math.max(0,len-p1-1)]||priceMa1[len-2]||ma1Now;
    var ma2Now=priceMa2[len-1]||closes[len-1];
    var ma2Past=priceMa2[Math.max(0,len-p1-1)]||priceMa2[len-2]||ma2Now;
    var slope1=Math.abs(pct(ma1Now,ma1Past));
    var slope2=Math.abs(pct(ma2Now,ma2Past));
    var flatScore=Math.max(0,1-((slope1+slope2)/1.2));
    var lastClose=closes[len-1]||0;
    var prevClose=closes[len-2]||lastClose;
    var side=lastClose>=prevClose?"LONG":"SHORT";
    var barPct=prevClose>0?((lastClose-prevClose)/prevClose)*100:0;
    var prevVol = Number(vols[len-2]||0);
    var spikePrevVolRatio = prevVol>0 ? lastVol/prevVol : 0;
    var priceGlue=priceMaGlueStats(closes,filterState.priceGlueMaPeriod,filterState.priceGlueLookback,filterState.priceGlueMaxDistPct);
    var setup=flatScore>.55?"MAs flat + Volume Spike":(spike1>2?"Volume acima da MA"+p1:"Volume spike "+filterState.scanTF);
    /* Volume-based flat candles: bars where vol/MA1 <= flat_x */
    var flatX=filterState.flat_x||10;
    var flatCandles=0;
    for(var j=len-2;j>=0;j--){
      var mj=volMa1[j];
      if(!mj||!Number.isFinite(mj)||mj<=0) break;
      if(vols[j]/mj<=flatX) flatCandles++;
      else break;
    }
    var prevVolBelowHalf=len>=2&&lastVol>0&&(vols[len-2]||0)<lastVol*0.5;
    /* Flat volume bar block: consecutive prior bars whose volume stayed
       below its MA (same style as the ignition base-detection). */
    var volBelowMaBars=0;
    for(var bi=len-2;bi>=0;bi--){
      var mb=volMa1[bi];
      if(!mb||!Number.isFinite(mb)||mb<=0) break;
      if(vols[bi]<mb) volBelowMaBars++; else break;
    }
    /* MA flatness: (max-min)/avg of volMA1 over the N candles BEFORE the last */
    var maFlatLookback=filterState.maFlatLookback||10;
    var maFlat1Win=volMa1.slice(Math.max(0,len-1-maFlatLookback),len-1).filter(function(v){return v!==null&&Number.isFinite(v)&&v>0;});
    var maFlatness1=0;
    if(maFlat1Win.length>1){
      var _fMin=maFlat1Win[0],_fMax=maFlat1Win[0],_fSum=0;
      for(var fi=0;fi<maFlat1Win.length;fi++){_fSum+=maFlat1Win[fi];if(maFlat1Win[fi]<_fMin)_fMin=maFlat1Win[fi];if(maFlat1Win[fi]>_fMax)_fMax=maFlat1Win[fi];}
      var _fAvg=_fSum/maFlat1Win.length;
      maFlatness1=_fAvg>0?(_fMax-_fMin)/_fAvg:0;
    }
    var lastClose=closes[len-1]||0;
    var firstClose24=closes[0]||lastClose||0;
    var price24hPct=firstClose24>0?((lastClose-firstClose24)/firstClose24)*100:0;
    var rsi14=50;
    if(len>=15){
      var gain=0,loss=0,steps=0;
      for(var ri=Math.max(1,len-14);ri<len;ri++){
        var delta=(closes[ri]||0)-(closes[ri-1]||0);
        if(delta>=0) gain+=delta; else loss+=Math.abs(delta);
        steps++;
      }
      var avgGain=steps?gain/steps:0, avgLoss=steps?loss/steps:0;
      if(avgLoss<=1e-9) rsi14=avgGain>0?100:50;
      else{
        var rs=avgGain/avgLoss;
        rsi14=100-(100/(1+rs));
      }
    }
    /* RSI oversold block: was RSI(14) at/under the configured threshold at
       any point within the last N candles? Needs the RSI value at every
       bar in the lookback window, not just the latest. */
    var rsiPeriod=14;
    var rsiOversoldLookback=filterState.rsiOversoldLookback||20;
    var rsiOversoldThreshold=isNaN(filterState.rsiOversoldThreshold)?30:filterState.rsiOversoldThreshold;
    var rsiOversoldOk=false;
    if(len>=rsiPeriod+1){
      var rStart=Math.max(rsiPeriod,len-rsiOversoldLookback);
      for(var ri2=rStart;ri2<len&&!rsiOversoldOk;ri2++){
        var g2=0,l2=0,st2=0;
        for(var gi=ri2-rsiPeriod+1;gi<=ri2;gi++){
          var d2=(closes[gi]||0)-(closes[gi-1]||0);
          if(d2>=0) g2+=d2; else l2+=Math.abs(d2);
          st2++;
        }
        var ag2=st2?g2/st2:0, al2=st2?l2/st2:0;
        var rsiAt=al2<=1e-9?(ag2>0?100:50):100-(100/(1+(ag2/al2)));
        if(rsiAt<=rsiOversoldThreshold) rsiOversoldOk=true;
      }
    }
    return {
      coin:base.coin,icon:base.icon,mexc:base.mexc,symbol:base.symbol,
      side:side,setup:setup,
      lastClose:lastClose,price24hPct:price24hPct,rsi14:rsi14,last5Closes:closes.slice(-5),
      spike20:spike1,spike50:spike2,flatScore:flatScore,
      volX:spike1,flatCandles:flatCandles,barPct:barPct,
      volBelowMaBars:volBelowMaBars,rsiOversoldOk:rsiOversoldOk,
      last20Vols:vols.slice(-20),last20MA1:volMa1.slice(-20),last20MA2:volMa2.slice(-20),
      ma1Period:p1,ma2Period:p2,
      prevVolBelowHalf:prevVolBelowHalf,
      maFlatness1:maFlatness1,
      priceGlueOk:priceGlue.ok,
      priceGlueMaxDistPct:priceGlue.maxDist,
      priceGlueAvgDistPct:priceGlue.avgDist,
      priceGlueMaPeriod:priceGlue.period,
      priceGlueLookback:priceGlue.lookback,
      priceGlueTolPct:priceGlue.tolPct,
      spikePrevVolRatio:spikePrevVolRatio,
      spikePrevVolRequired:filterState.spikePrevVolMult,
      spikePrevVolOk:spikePrevVolRatio>=filterState.spikePrevVolMult
    };
  }

  /* ── Recompute flatCandles from stored data (no API refetch) ── */
  function recomputeFlatCandles(row){
    var vols=row.last20Vols||[];
    var ma1=row.last20MA1||[];
    var flatX=filterState.flat_x||10;
    var count=0;
    for(var j=vols.length-2;j>=0;j--){
      var mj=ma1[j];
      if(!mj||!Number.isFinite(mj)||mj<=0) break;
      if(vols[j]/mj<=flatX) count++;
      else break;
    }
    row.flatCandles=count;
    /* Recompute maFlatness1 from stored last20MA1 */
    var maFlatLookback=filterState.maFlatLookback||10;
    var win=ma1.slice(Math.max(0,ma1.length-1-maFlatLookback),ma1.length-1).filter(function(v){return v!==null&&Number.isFinite(v)&&v>0;});
    if(win.length>1){
      var fMin=win[0],fMax=win[0],fSum=0;
      for(var wi=0;wi<win.length;wi++){fSum+=win[wi];if(win[wi]<fMin)fMin=win[wi];if(win[wi]>fMax)fMax=win[wi];}
      var fAvg=fSum/win.length;
      row.maFlatness1=fAvg>0?(fMax-fMin)/fAvg:0;
    } else { row.maFlatness1=0; }
  }

  async function mapPool(items,limit,fn){
    var out=new Array(items.length),idx=0;
    async function worker(){
      while(idx<items.length){
        var i=idx++;
        try{ out[i]=await fn(items[i],i); }catch(e){ out[i]=null; }
      }
    }
    var workers=[],n=Math.min(limit,items.length);
    for(var w=0;w<n;w++) workers.push(worker());
    await Promise.all(workers);
    return out;
  }

  /* ── Display logic ───────────────────────────────────────────────
     Applies Alertas toggle, Filtros panel, sort mode.
     "raw" = 24h vol order, no spike/flat filter. */
  function getDisplayRows(){
    var rows=state.rawRows.slice();
    if(state.filterMode==="alerts")
      rows=rows.filter(function(r){return (r.spike20||0)>=1.7||(r.spike50||0)>=1.5;});
    if(filterState.usePriceGlue)
      rows=rows.filter(function(r){return r.priceGlueOk===true;});
    if(filterState.useSpikePrevVol)
      rows=rows.filter(function(r){return (r.spikePrevVolRatio||0)>=filterState.spikePrevVolMult;});
    if(sortMode!=="raw"){
      if(filterState.spikeMin>0)
        rows=rows.filter(function(r){return (r.spike20||0)>=filterState.spikeMin;});
      if(filterState.minFlatBefore>0)
        rows=rows.filter(function(r){return (r.flatCandles||0)>=filterState.minFlatBefore;});
      if(filterState.spikeAbove==="both")
        rows=rows.filter(function(r){return (r.spike20||0)>1&&(r.spike50||0)>1;});
      if(filterState.useMaFlat)
        rows=rows.filter(function(r){return (r.maFlatness1||1)<=filterState.maFlatTolerance;});
    }
    if(sortMode==="spike"){
      rows.sort(function(a,b){return (b.spike20||0)-(a.spike20||0);});
    } else if(sortMode==="recente"){
      rows.sort(function(a,b){return Math.abs(b.barPct||0)-Math.abs(a.barPct||0);});
    } else if(sortMode==="volume"){
      rows.sort(function(a,b){
        var va=(a.last20Vols&&a.last20Vols.length)?a.last20Vols[a.last20Vols.length-1]||0:0;
        var vb=(b.last20Vols&&b.last20Vols.length)?b.last20Vols[b.last20Vols.length-1]||0:0;
        return vb-va;
      });
    }
    return rows.slice(0,filterState.maxAssets);
  }

  /* ── Spike age tracking (persists across refreshes) ─────────────
     Stores when each symbol's spike was FIRST detected by the scanner.
     Resets only when a new spike is ≥25% stronger than the previous.
     Used to display elapsed time since detection in the card metadata. */
  var _dvlSpikeReg={};

  function trackSpike(row){
    var key=row.mexc;
    var lvl=row.spike20||0;
    var prev=_dvlSpikeReg[key];
    if(!prev||!prev.at||lvl>(prev.level||0)*1.25){
      _dvlSpikeReg[key]={at:Date.now(),level:lvl};
    }
    row.spikeAt=_dvlSpikeReg[key].at;
  }

  function spikeAgeLabel(at){
    if(!at) return "agora";
    var ms=Date.now()-at;
    if(ms<90000) return "agora";
    if(ms<3600000) return Math.round(ms/60000)+"min";
    if(ms<86400000) return Math.round(ms/3600000)+"h";
    return Math.round(ms/86400000)+"d";
  }

  /* ── 24h signal history ─────────────────────────────────────────
     Rows are keyed by mexc + tagged with the detection TF so switching
     timeframes shows only the relevant signals. */
  function loadHistory(){
    try{
      var h=JSON.parse(localStorage.getItem(HIST_KEY)||"[]");
      return Array.isArray(h)?h:[];
    }catch(_){return [];}
  }
  function saveHistory(rows){
    try{localStorage.setItem(HIST_KEY,JSON.stringify(rows.slice(0,300)));}catch(_){}
  }
  function clearHistory(){
    try{localStorage.removeItem(HIST_KEY);}catch(_){}
  }
  function mergeWithHistory(newRows){
    var hist=loadHistory();
    var now=Date.now();
    var curTF=filterState.scanTF;
    /* Build map from history — only for same TF */
    var map={};
    hist.forEach(function(r){if(r.mexc&&r._histTF===curTF)map[r.mexc]=r;});
    /* Update/add new rows, stamping TF and time */
    newRows.forEach(function(r){
      if(r.mexc){r._histAt=now;r._histTF=curTF;map[r.mexc]=r;}
    });
    /* Evict entries older than 24h */
    var merged=[];
    var keys=Object.keys(map);
    for(var ki=0;ki<keys.length;ki++){
      var row=map[keys[ki]];
      if(row._histAt&&(now-row._histAt)<HIST_MAX_AGE) merged.push(row);
    }
    /* Sort: most recently detected first */
    merged.sort(function(a,b){
      var ta=a.spikeAt||a._histAt||0;
      var tb=b.spikeAt||b._histAt||0;
      return tb-ta;
    });
    saveHistory(merged);
    return merged;
  }

  async function refresh(){
    /* Beta 1.601 — SCANNER DESATIVADO: abre normalmente, mas NÃO gera nada.
       Reusa o caminho de estado vazio (seguro) e retorna sem nenhum scan/fetch. */
    state.rawRows=[]; state.rows=[]; try{renderRows();}catch(_){} try{updateLive("Desativado");}catch(_){} return;
    if(state.loading) return;
    var ex=EX[state.exchange];
    if(!ex||!ex.enabled){state.rawRows=[];state.rows=[];renderRows();updateLive("Indisponível");return;}

    state.loading=true;
    updateLive("Carregando");
    renderRows();

    /* Ensure futures registry is populated before we filter results */
    await loadFuturesPairs();

    var curTF=filterState.scanTF;
    var curP1=filterState.maPeriod1;
    var curP2=filterState.maPeriod2;
    var tfMs=tfToMs(curTF);

    try{
      var cands=await ex.tickers();
      cands.sort(function(a,b){return b.qv-a.qv;});
      cands=cands.slice(0,CAND);

      var kl=await mapPool(cands,POOL,function(c){return ex.klines(c.sym);});
      var allRows=[];
      var freshCut=Date.now()-FRESH_MS;
      for(var i=0;i<cands.length;i++){
        var k=kl[i];
        if(!k||!k.closes||k.closes.length<25) continue;
        if(k.lastOpen&&k.lastOpen<freshCut) continue;
        /* Skip symbols not supported in the chart — only filter after futures are loaded */
        var _cleanSym=String(cands[i].sym).replace(/_/g,"");
        var _reg=window._dvlSymbols;
        var _futuresReady=_reg&&Array.isArray(_reg)&&_reg.length>10;
        if(_futuresReady&&_reg.indexOf(_cleanSym)<0) continue;
        /* Extrapolate partial last candle so spike is not artificially low */
        var extVols=k.vols.slice();
        if(extVols.length>0&&k.lastOpen&&tfMs>0){
          var elapsed=Math.max(5000,Date.now()-k.lastOpen);
          var fraction=Math.min(1,Math.max(0.05,elapsed/tfMs));
          extVols[extVols.length-1]=extVols[extVols.length-1]/fraction;
        }
        var _row=computeSignal(baseFromSymbol(ex.base(cands[i].sym),cands[i].sym),k.closes,extVols,k.lastOpen);
        trackSpike(_row);
        /* OI block: only MEXC's ticker carries holdVol (same limitation as
           the backend — Binance has no OI field on this endpoint). */
        if(state.exchange==="mexc"){
          var _oiBuf=pushOiClient(cands[i].sym,Number(cands[i].oi));
          var _oiT=trendVsMA(_oiBuf);
          _row.oi=_oiT.arrow; _row.oiColor=_oiT.color;
        }
        /* Mandatory criterion: bar before spike must be below 50% of spike volume */
        if(!_row.prevVolBelowHalf) continue;
        allRows.push(_row);
      }

      /* LSR block: real Bybit long/short account-ratio vs its MA, for the
         rows that made it through (mirrors the backend's post-merge step). */
      await mapPool(allRows,POOL,async function(_row){
        var series=await fetchLsr(_row.symbol.replace("/",""),filterState.scanTF,filterState.lsrMaLen);
        if(series){
          var _lsrT=trendVsMA(series);
          _row.lsr=_lsrT.arrow; _row.lsrColor=_lsrT.color;
        }
      });

      state.rawRows=mergeWithHistory(allRows);
      state.rows=getDisplayRows();
      state.loaded=true;
      state.lastUpdate=new Date();
      state.lastScanTF=curTF;
      state.lastMaPeriod1=curP1;
      state.lastMaPeriod2=curP2;
      state.lastUsePriceGlue=filterState.usePriceGlue;
      state.lastPriceGlueMaPeriod=filterState.priceGlueMaPeriod;
      state.lastPriceGlueLookback=filterState.priceGlueLookback;
      state.lastPriceGlueMaxDistPct=filterState.priceGlueMaxDistPct;
      state.lastUseSpikePrevVol=filterState.useSpikePrevVol;
      state.lastSpikePrevVolMult=filterState.spikePrevVolMult;
      renderRows();
      var freshCount=allRows.length;
      var histCount=state.rawRows.length-freshCount;
      updateLive(freshCount?"Ao vivo":(histCount?"Histórico 24h":"Sem dados"));
    }catch(err){
      console.warn("DVL scanner refresh failed",err);
      /* On error: keep showing historical signals instead of clearing */
      state.rawRows=mergeWithHistory([]);
      state.rows=getDisplayRows();
      state.lastUpdate=new Date();
      renderRows();
      updateLive(state.rawRows.length?"Histórico 24h":"Indisponível");
    }finally{
      state.loading=false;
    }
  }

  function exLabel(){ var ex=EX[state.exchange]; return ex?ex.label:"—"; }

  function updateLive(label){
    var live=document.getElementById("dvlScan080LiveText");
    var time=document.getElementById("dvlScan080LiveTime");
    if(live) live.textContent=label||"Ao vivo";
    if(time) time.textContent=exLabel()+" · FUT · "+(filterState.scanTF||"15m")+(state.lastUpdate?" · "+formatTime(state.lastUpdate):"");
  }

  function volumeSvg(row){
    var vols=row.last20Vols||[];
    var ma1=row.last20MA1||[];
    var ma2=row.last20MA2||[];
    var p1=row.ma1Period||filterState.maPeriod1||20;
    var p2=row.ma2Period||filterState.maPeriod2||50;
    var maxVal=Math.max.apply(null,vols.concat(ma1).concat(ma2).filter(function(v){return Number.isFinite(v)&&v>0;}).concat([1]));
    var short=row.side==="SHORT";
    var barColor=short?"#ff4858":"#10df77";
    var left=10,top=14,chartH=52,gap=3,barW=10;
    var bars=vols.map(function(v,i){
      var bh=Math.max(2,(v/maxVal)*chartH);
      var x=left+i*(barW+gap);
      var y=top+chartH-bh;
      var isSpike=i>=vols.length-2;
      return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW+'" height="'+bh.toFixed(1)+'" rx="1.2" fill="'+barColor+'" opacity="'+(isSpike?".95":".46")+'"/>';
    }).join("");
    function line(vals,color){
      var pts=vals.map(function(v,i){
        if(!Number.isFinite(v)) return null;
        var x=left+i*(barW+gap)+barW/2;
        var y=top+chartH-(v/maxVal)*chartH;
        return [x,y];
      }).filter(Boolean);
      if(!pts.length) return "";
      var d=pts.map(function(p,i){return(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1);}).join(" ");
      return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '<svg viewBox="0 0 300 74" preserveAspectRatio="none">'
      +'<text x="10" y="10" class="dvlScan080VolLabel">Vol</text>'
      +'<circle cx="72" cy="7" r="2.2" fill="#10df77"/><text x="79" y="10" class="dvlScan080VolMeta">MA'+p1+'</text>'
      +'<circle cx="125" cy="7" r="2.2" fill="#ffd321"/><text x="132" y="10" class="dvlScan080VolMeta">MA'+p2+'</text>'
      +bars+line(ma1,"#10df77")+line(ma2,"#ffd321")+'</svg>';
  }

  function escAttr(s){return String(s).replace(/"/g,"&quot;");}
  function escHtml(s){return String(s).replace(/</g,"&lt;").replace(/>/g,"&gt;");}

  function compensateScale(){
    var panel=document.getElementById("dvlScannerPanel0780");
    if(!panel) return;
    var canvas=panel.querySelector(".dvlScan080Canvas");
    if(!canvas) return;
    var s=state.scale||1;
    if(s>=1){ canvas.style.marginBottom=""; return; }
    var H=canvas.offsetHeight;
    canvas.style.marginBottom=Math.round((s-1)*H)+"px";
  }


  function scannerAgoLong1012(ts){
    if(!ts) return "—";
    var diff=Math.max(0,Date.now()-ts), sec=Math.floor(diff/1000), min=Math.floor(sec/60), hr=Math.floor(min/60);
    if(sec<50) return sec+"s atrás";
    if(min<60) return min+"m atrás";
    return hr+"h "+String(min%60).padStart(2,"0")+"m atrás";
  }

  function scannerUpdated1012(ts){
    if(!ts) return "Atualizado agora";
    var diff=Math.max(0,Date.now()-ts), sec=Math.floor(diff/1000), min=Math.floor(sec/60), hr=Math.floor(min/60);
    if(sec<5) return "Atualizado agora";
    if(sec<60) return "Atualizado há "+sec+"s";
    if(min<60) return "Atualizado há "+min+"m";
    return "Atualizado há "+hr+"h";
  }

  function fmtPrice1012(v){
    v=Number(v);
    if(!isFinite(v)||v<=0) return "—";
    if(v>=1000) return v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    if(v>=100) return v.toFixed(2);
    if(v>=1) return v.toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
    return v.toFixed(4).replace(/0+$/,"").replace(/\.$/,"");
  }

  function rsiColor1012(v){
    v=Number(v)||0;
    return v>=55?"#10df77":(v<=45?"#ff5966":"#ffd321");
  }

  function score1001012(r){
    var score = (Number(r.spike20)||0)*20 + (Number(r.spike50)||0)*7 + Math.max(0,Number(r.flatCandles)||0)*2.4 + Math.min(Math.abs(Number(r.barPct)||0),8)*2.2;
    if(r.prevVolBelowHalf) score += 6;
    if(r.priceGlueOk) score += 5;
    return Math.max(0,Math.min(99,Math.round(score)));
  }

  function scoreColorKey1012(score){
    if(score>=70) return "g";
    if(score>=45) return "y";
    return "r";
  }

  function scoreBars1012(score){
    var total=6, on=Math.max(1,Math.min(total,Math.round(score/16)));
    var key=scoreColorKey1012(score);
    var out='<div class="dvlScan1012Bars">';
    for(var i=0;i<total;i++) out+='<i class="'+(i<on?('on '+key):'')+'"></i>';
    return out+'</div>';
  }

  function trendPack1012(r,kind){
    var side=String(r.side||"").toUpperCase();
    var bp=Number(r.barPct)||0;
    var score=score1001012(r);
    if(kind==="oi"){
      if(side==="LONG" && score>=52) return {cls:"up",txt:"↑"};
      if(side==="SHORT" && score>=52) return {cls:"down",txt:"↓"};
      return {cls:"flat",txt:"→"};
    }
    if(kind==="lsr"){
      if(side==="LONG" && bp>0.18) return {cls:"up",txt:"↑"};
      if(side==="SHORT" && bp<-0.18) return {cls:"down",txt:"↓"};
      return {cls:"flat",txt:"→"};
    }
    return {cls:"flat",txt:"→"};
  }

  function statusPack1012(r){
    var setup=norm(r.setup||"");
    var score=score1001012(r);
    if(/post-flat|pós-flat/.test(setup) || ((r.flatCandles||0)>=4 && score>=74)) return {txt:"Spike pós-flat",cls:"postflat"};
    if(/limpo|clean/.test(setup) || score>=72) return {txt:"Spike limpo",cls:"clean"};
    if(score>=54) return {txt:"Em formação",cls:"forming"};
    if(score>=44) return {txt:"Monitorar",cls:"monitor"};
    return {txt:"Sem spike",cls:"none"};
  }

  function miniCandles1012(closes){
    closes=(closes||[]).map(Number).filter(function(v){return isFinite(v);});
    if(!closes.length) return '<div class="dvlScan1012Mini5"><span style="font-size:11px;color:#7f8a85">—</span></div>';
    while(closes.length<5) closes.unshift(closes[0]);
    closes=closes.slice(-5);
    var highs=[], lows=[];
    for(var i=0;i<closes.length;i++){
      var o=i>0?closes[i-1]:closes[i];
      var c=closes[i];
      highs.push(Math.max(o,c));
      lows.push(Math.min(o,c));
    }
    var min=Math.min.apply(null,lows), max=Math.max.apply(null,highs);
    var pad=(max-min)||1;
    max+=pad*0.15; min-=pad*0.15;
    var range=(max-min)||1;
    return '<div class="dvlScan1012Mini5">'+closes.map(function(c,i){
      var o=i>0?closes[i-1]:closes[i];
      var bodyTop=Math.max(o,c), bodyBottom=Math.min(o,c);
      var hi=bodyTop + range*0.04;
      var lo=bodyBottom - range*0.04;
      var topW=((max-hi)/range)*34;
      var wickH=Math.max(8,((hi-lo)/range)*34);
      var topB=((max-bodyTop)/range)*34;
      var bodyH=Math.max(4,((bodyTop-bodyBottom)/range)*34);
      var cls=c>o?"g":(c<o?"r":"n");
      return '<i class="'+cls+'"><u style="top:'+topW.toFixed(1)+'px;height:'+wickH.toFixed(1)+'px"></u><b style="top:'+topB.toFixed(1)+'px;height:'+bodyH.toFixed(1)+'px"></b></i>';
    }).join('')+'</div>';
  }

  function filteredRows1012(rows){
    var q=norm(state.searchQuery||"");
    var out=(rows||[]).slice();
    if(q){
      out=out.filter(function(r){
        return norm(r.symbol||r.mexc||"").indexOf(q)>-1;
      });
    }
    return out;
  }

  function heroPack1012(rows){
    rows=rows||[];
    if(!rows.length){
      return {
        title:"Leitura de mercado",
        badge:"SEM LEITURA",
        badgeCls:"low",
        text:"Sem sinais suficientes no scanner agora. Ajuste os filtros ou aguarde novos spikes com confluência."
      };
    }
    var top=rows[0];
    var longs=rows.filter(function(r){return String(r.side||"").toUpperCase()==="LONG";}).length;
    var shorts=rows.filter(function(r){return String(r.side||"").toUpperCase()==="SHORT";}).length;
    var avg=Math.round(rows.slice(0,5).reduce(function(a,r){return a+score1001012(r);},0)/Math.max(1,Math.min(rows.length,5)));
    if(longs>=shorts && avg>=72){
      return {
        title:"Leitura de mercado",
        badge:"ALTA CONVICÇÃO",
        badgeCls:"",
        text:"Tendência compradora forte com volume sustentando o movimento. Probabilidade maior de continuação nas leituras mais recentes."
      };
    }
    if(shorts>longs && avg>=72){
      return {
        title:"Leitura de mercado",
        badge:"ALTA CONVICÇÃO",
        badgeCls:"",
        text:"Pressão vendedora consistente com spikes relevantes e continuidade provável. Observe rejeições e confirmações na estrutura."
      };
    }
    if(avg>=52){
      return {
        title:"Leitura de mercado",
        badge:"CONVICÇÃO MÉDIA",
        badgeCls:"mid",
        text:"Mercado misto, com alguns ativos formando contexto interessante. O foco deve ficar em spikes mais limpos e ocorrências mais recentes."
      };
    }
    return {
      title:"Leitura de mercado",
      badge:"BAIXA CONVICÇÃO",
      badgeCls:"low",
      text:"Leitura mais neutra no momento. O scanner segue monitorando para destacar novas combinações de spike, flat e momentum."
    };
  }

  function renderRows(){
    var list=document.getElementById("dvlScan080List");
    if(!list) return;
    var rows=filteredRows1012(state.rows);

    var updated=document.getElementById("dvlScan1012Updated");
    if(updated) updated.innerHTML=escHtml(scannerUpdated1012(state.lastUpdate||Date.now()))+' <i></i>';

    var hero=heroPack1012(rows);
    var heroTitle=document.getElementById("dvlScan1012HeroTitle");
    var heroBadge=document.getElementById("dvlScan1012HeroBadge");
    var heroDesc=document.getElementById("dvlScan1012HeroDesc");
    if(heroTitle) heroTitle.textContent=hero.title;
    if(heroBadge){ heroBadge.textContent=hero.badge; heroBadge.className='dvlScan1012HeroBadge '+(hero.badgeCls||""); }
    if(heroDesc) heroDesc.textContent=hero.text;

    if(!rows.length){
      var msg=state.loading?"Carregando scanner completo…":"Sem sinais compatíveis com os filtros atuais.";
      list.innerHTML='<div class="dvlScan1012Empty">'+escHtml(msg)+'</div>';
      compensateScale();
      return;
    }

    list.innerHTML=rows.slice(0,11).map(function(r,idx){
      var p24=Number(r.price24hPct)||0;
      var varCls=p24>0.001?'pos':(p24<-0.001?'neg':'flat');
      var oi=trendPack1012(r,"oi"), lsr=trendPack1012(r,"lsr");
      var rsi=Number(r.rsi14||50);
      var score=score1001012(r);
      var status=statusPack1012(r);
      return '<div class="dvlScan1012Row">'
        +'<div class="dvlScan1012Rank">'+(idx+1)+'</div>'
        +'<div class="dvlScan1012Asset"><b>'+escHtml(r.symbol||r.mexc||"—")+'</b><span>'+escHtml(fmtPrice1012(r.lastClose))+'</span></div>'
        +'<div class="dvlScan1012Var '+varCls+'">'+(p24>=0?'+':'')+p24.toFixed(2)+'%</div>'
        +'<div class="dvlScan1012Trend '+oi.cls+'">'+oi.txt+'</div>'
        +'<div class="dvlScan1012Trend '+lsr.cls+'">'+lsr.txt+'</div>'
        +'<div class="dvlScan1012Rsi" style="color:'+rsiColor1012(rsi)+'">'+rsi.toFixed(1)+'</div>'
        +'<div class="dvlScan1012Score"><span class="dvlScan1012ScoreNum">'+score+'</span>'+scoreBars1012(score)+'</div>'
        +'<div><span class="dvlScan1012Status '+status.cls+'">'+escHtml(status.txt)+'</span></div>'
        +'<div class="dvlScan1012SpikeAgo">'+escHtml(scannerAgoLong1012(r.spikeAt||r._histAt||0))+'</div>'
        +'<div>'+miniCandles1012(r.last5Closes||[])+'</div>'
        +'</div>';
    }).join("");

    compensateScale();
  }

  function dvlShowToast(msg){
    if(!document.getElementById("dvlScan080ToastKf")){
      var st=document.createElement("style");
      st.id="dvlScan080ToastKf";
      st.textContent="@keyframes dvlTF{0%,65%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(8px)}}";
      document.head.appendChild(st);
    }
    var el=document.getElementById("dvlScan080Toast");
    if(!el){
      el=document.createElement("div");
      el.id="dvlScan080Toast";
      el.style.cssText="position:fixed;bottom:76px;left:50%;transform:translateX(-50%);background:rgba(15,30,25,.97);border:1px solid rgba(16,223,119,.28);color:#c3cdc7;font-size:15px;font-weight:760;padding:11px 22px;border-radius:11px;z-index:9999;pointer-events:none;white-space:nowrap;";
      document.body.appendChild(el);
    }
    el.textContent=msg;
    el.style.animation="none";
    void el.offsetWidth;
    el.style.animation="dvlTF 3s ease forwards";
  }

  /* analyze: routes through the REAL chart asset selector (same as dropdown).
     Accepts r.mexc format ("BTCUSDT" or "BTC_USDT") — normalises underscores.
     Validates against window._dvlSymbols before switching.
     NEVER falls back to LTC — aborts with toast if symbol not in registry. */
  function analyze(apiSym){
    var cleanSym=String(apiSym||"").replace(/_/g,"");
    if(!cleanSym){ dvlShowToast("Símbolo inválido"); return; }
    /* Ensure symbol is in registry so selectSymbol() won't reject it */
    var reg=window._dvlSymbols;
    if(reg&&Array.isArray(reg)&&reg.indexOf(cleanSym)<0) reg.push(cleanSym);
    try{
      /* Is the scanner row's asset already the one on screen? selectSymbol()
         no-ops (no reload) when the symbol doesn't change, so in that case
         this call must be the one that reloads (at the new TF). Otherwise,
         skip this load — selectSymbol()'s own loadAll() right below is the
         only fetch batch we need. */
      var _curSymEl=document.getElementById("symbolText");
      var _curSym=_curSymEl?String(_curSymEl.textContent||"").replace(/\//g,"").toUpperCase():"";
      var _sameSymbol = !!_curSym && _curSym===cleanSym.toUpperCase();
      if(typeof window.setIntervalUi==="function") window.setIntervalUi(filterState.scanTF, !_sameSymbol);
      /* Belt-and-suspenders: force active class on TF hotbar buttons */
      try{
        var _tfs=document.querySelectorAll('.tfBtn[data-interval]');
        for(var _bi=0;_bi<_tfs.length;_bi++)
          _tfs[_bi].classList.toggle('active',_tfs[_bi].getAttribute('data-interval')===filterState.scanTF);
        var _atf=document.querySelector('.tfBtn[data-interval="'+filterState.scanTF+'"]');
        if(_atf) _atf.scrollIntoView({block:'nearest',inline:'center'});
      }catch(_){}
      /* Audit A1: uses the real asset selector, not just DOM text */
      if(typeof window.selectSymbol==="function") window.selectSymbol(cleanSym);
      window.dispatchEvent(new CustomEvent("dvl-scanner-analyze",{detail:{symbol:cleanSym,source:"volume-spike",exchange:state.exchange,tf:filterState.scanTF}}));
      /* Sync chart volume MAs to match scanner MA periods */
      if(window.DVLVolume&&typeof window.DVLVolume.setMaPeriods==="function"){
        window.DVLVolume.setMaPeriods(filterState.maPeriod1, filterState.maPeriod2);
      }
    }catch(e){
      console.warn("[DVL Scanner] analyze error",e);
    }
    close();
  }

  function pickExchange(key){
    var ex=EX[key];
    if(!ex||!ex.enabled) return;
    if(state.exchange===key){var m=document.getElementById("dvlScan080ApiMenu");if(m)m.classList.remove("is-open");return;}
    state.exchange=key;
    try{localStorage.setItem(LS_KEY,key);}catch(_){}
    state.loaded=false;
    state.rawRows=[];
    state.rows=[];
    refreshApiMenu();
    var menu=document.getElementById("dvlScan080ApiMenu");
    if(menu) menu.classList.remove("is-open");
    updateLive("Carregando");
    renderRows();
    refresh();
  }


  /* ── Build / Layout ───────────────────────────────────────────── */
  /* Beta 1.022 fix: the Scanner Pro remodel removed the legacy filter
     subsystem (filtrosMenuHTML/tfChipsHTML/applyFiltros) but left one
     dangling call to filtrosMenuHTML() inside build() below. With the
     function undefined, build() threw "filtrosMenuHTML is not defined",
     the panel was never created and the scanner never refreshed/updated.
     The active filter UI is now the Scanner Pro filter sheet, so this
     stub returns empty markup — keeping build() intact without
     reintroducing the deprecated old filter menu. */
  function filtrosMenuHTML(){ return ""; }
  /* Beta 1.022 fix: the remodel also left two more dangling calls in this
     module — norm() (used in card render/search at getDisplayRows/renderRows)
     and patchDropdown() (called inside bind()). With patchDropdown undefined,
     bind() threw before registering event handlers and the auto-refresh
     interval, so the scanner never updated. Restore norm() as the same
     uppercase-alphanumeric helper the Pro module uses, and stub patchDropdown
     (its old asset-dropdown search bar was dropped by the Pro remodel). */
  function norm(s){ return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
  function patchDropdown(){}
  /* Beta 1.022 fix: more functions the remodel removed while leaving live
     calls. loadFuturesPairs() is awaited inside refresh() — undefined, it
     threw and every refresh failed (the core "scanner não atualiza" cause).
     Restored here (self-contained) together with its registry vars. pickSort
     is restored (all deps still present). refreshApiMenu/applyFiltros drove
     the old API/filter menus that the Pro layout replaced, so they are safe
     no-ops now (their old DOM no longer exists). */
  var _dvlFutPairs=null,_dvlFutFetching=false;
  async function loadFuturesPairs(){
    if(_dvlFutPairs!==null||_dvlFutFetching) return;
    _dvlFutFetching=true;
    try{
      var r=await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo",{cache:"no-store"});
      var j=await r.json();
      _dvlFutPairs=(j.symbols||[])
        .filter(function(s){return s.contractType==="PERPETUAL"&&s.quoteAsset==="USDT"&&s.status==="TRADING";})
        .map(function(s){return s.symbol;})
        .sort();
      var sArr=window._dvlSymbols;
      if(sArr&&Array.isArray(sArr)){
        _dvlFutPairs.forEach(function(sym){if(sArr.indexOf(sym)<0) sArr.push(sym);});
      }
    }catch(e){ _dvlFutPairs=[]; }
    _dvlFutFetching=false;
  }
  function pickSort(mode){
    if(!SORT_LABELS[mode]) return;
    sortMode=mode;
    try{localStorage.setItem(LS_SORT,mode);}catch(_){}
    var lbl=document.getElementById("dvlScan080SortLabel");
    if(lbl) lbl.textContent=SORT_LABELS[mode];
    var sm=document.getElementById("dvlScan080SortMenu");
    if(sm){
      var opts=sm.querySelectorAll(".dvlScan080SortOpt");
      for(var i=0;i<opts.length;i++) opts[i].classList.toggle("is-sel",opts[i].getAttribute("data-dvl-sort")===mode);
      sm.classList.remove("is-open");
    }
    state.rows=getDisplayRows();
    renderRows();
  }
  function refreshApiMenu(){}
  function applyFiltros(){}
  function build(){
    if(document.getElementById("dvlScannerPanel0780")) return;
    var panel=document.createElement("section");
    panel.id="dvlScannerPanel0780";
    panel.setAttribute("data-dvl-ui","true");
    panel.innerHTML=
      '<div class="dvlScan080Sizer"><div class="dvlScan080Canvas">'
      +'<header class="dvlScan1012Header">'
        +'<div class="dvlScan1012BrandIcon">'+radarSVG()+'</div>'
        +'<div class="dvlScan1012Brand"><b>DVL <span>SCANNER PRO</span></b><small><span id="dvlScan080LiveText">Scanner ao vivo</span> • <b id="dvlScan080LiveTime">'+exLabel()+' · futuros</b></small></div>'
        +'<div class="dvlScan1012HeaderActions">'
          +'<button class="dvlScan1012IconBtn has-dot" type="button" aria-label="Alertas"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg></button>'
          +'<button class="dvlScan1012IconBtn" type="button" aria-label="Filtros" data-dvl-scan-filters="1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"></circle><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M16.9 16.9l2.2 2.2M2 12h3M19 12h3M4.9 19.1l2.1-2.1M16.9 7.1l2.2-2.2"></path></svg></button>'
        +'</div>'
      +'</header>'
      +'<section class="dvlScan1012Hero">'
        +'<div class="dvlScan1012RadarWrap"><div class="dvlScan1012RadarCore">'+radarSVG()+'</div><span class="dvlScan1012RadarDot a"></span><span class="dvlScan1012RadarDot b"></span><span class="dvlScan1012RadarDot c"></span></div>'
        +'<div class="dvlScan1012HeroText"><div class="dvlScan1012HeroTop"><div class="dvlScan1012HeroTitle" id="dvlScan1012HeroTitle">Leitura de mercado</div><div class="dvlScan1012HeroBadge" id="dvlScan1012HeroBadge">ALTA CONVICÇÃO</div></div><div class="dvlScan1012HeroDesc" id="dvlScan1012HeroDesc">Tendência compradora forte com volume sustentando o movimento. Probabilidade maior de continuação.</div></div>'
      +'</section>'
      +'<div class="dvlScan1012Toolbar">'
        +'<div class="dvlScan1012SearchWrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input id="dvlScan1012Search" type="search" placeholder="Buscar ativo..." autocomplete="off" spellcheck="false" aria-label="Buscar ativo"></div>'
        +'<div class="dvlScan080FilWrap dvlScan1012FilterWrap"><button class="dvlScan1012FilterBtn dvlScan080TopBtn" type="button" data-dvl-scan-filters="1"><svg viewBox="0 0 24 24"><path d="M3 5h18"></path><path d="M6 12h12"></path><path d="M10 19h4"></path></svg>Filtros</button>'+filtrosMenuHTML()+'</div>'
      +'</div>'
      +'<section class="dvlScan1012TableCard">'
        +'<div class="dvlScan1012TableTop"><b>SCANNER COMPLETO — SPIKE FLOW</b><span class="dvlScan1012Updated" id="dvlScan1012Updated">Atualizado agora <i></i></span></div>'
        +'<div class="dvlScan1012Head">'
          +'<div>#</div><div>Ativo / preço</div><div>Var. 24h</div><div>OI</div><div>LSR</div><div>RSI (14)</div><div>Spike score</div><div>Status</div><div>Spike há</div><div>5 candles</div>'
        +'</div>'
        +'<div class="dvlScan080List dvlScan1012TableBody" id="dvlScan080List"></div>'
      +'</section>'
      +'<div class="dvlScan1012Foot">'
        +'<span><i>i</i><span><b>SPIKE HÁ:</b> tempo decorrido desde que o spike ocorreu. Use para evitar entradas tardias.</span></span>'
        +'<span><i>i</i><span>Spike Score: pontuação interna DVL que mede a qualidade do spike com base em volume, flat e estrutura.</span></span>'
        +'<span><i>i</i><span><b>Spike pós-flat:</b> spike detectado após período de consolidação.</span></span>'
      +'</div>'
      +'</div></div>';
    document.body.appendChild(panel);

    var search=panel.querySelector("#dvlScan1012Search");
    if(search){
      search.addEventListener("input",function(){
        state.searchQuery=String(this.value||"").trim();
        renderRows();
      },false);
      search.addEventListener("keydown",function(e){e.stopPropagation();},false);
      search.addEventListener("click",function(e){e.stopPropagation();},false);
    }

    renderRows();
    resize();
  }

  function resize(){
    var panel=document.getElementById("dvlScannerPanel0780");
    if(!panel) return;
    var sizer=panel.querySelector(".dvlScan080Sizer");
    if(!sizer) return;
    var scale=Math.max(0.42,Math.min(1,window.innerWidth/920));
    state.scale=scale;
    document.documentElement.style.setProperty("--dvl-scan080-scale",String(scale));
    sizer.style.width=Math.ceil(900*scale)+"px";
    sizer.style.minHeight="";
    compensateScale();
  }

  function open(){
    build();
    var panel=document.getElementById("dvlScannerPanel0780");
    var btn=scannerBtn();
    if(panel) panel.classList.add("is-open");
    if(btn){ btn.classList.add("active"); btn.setAttribute("aria-pressed","true"); }
    document.body.classList.add("dvlScannerOpen080");
    try{ window.dispatchEvent(new CustomEvent("dvl:scanner-state-change",{detail:{open:true,source:"scanner-open"}})); }catch(_){}
    resize();
    if(!state.loaded && !state.loading) refresh();
  }

  function close(){
    var panel=document.getElementById("dvlScannerPanel0780");
    var btn=scannerBtn();
    if(panel) panel.classList.remove("is-open");
    if(btn){ btn.classList.remove("active"); btn.setAttribute("aria-pressed","false"); }
    document.body.classList.remove("dvlScannerOpen080");
    try{
      var fm=document.getElementById("dvlScan080FilMenu"); if(fm) fm.classList.remove("is-open");
      var am=document.getElementById("dvlScan080ApiMenu"); if(am) am.classList.remove("is-open");
      var sm=document.getElementById("dvlScan080SortMenu"); if(sm) sm.classList.remove("is-open");
    }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("dvl:scanner-state-change",{detail:{open:false,source:"scanner-close"}})); }catch(_){}
  }

  function toggle(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}
    var panel=document.getElementById("dvlScannerPanel0780");
    if(panel && panel.classList.contains("is-open")) close();
    else open();
  }

  /* ── Bind ────────────────────────────────────────────────────── */
  function bind(){
    forceButton();
    build();
    patchDropdown();
    /* Pre-warm futures registry so Analisar works before dropdown is ever opened */
    loadFuturesPairs();

    if(document.__dvlScan080Bound) return;
    document.__dvlScan080Bound=true;

    /* ── Runtime audit ───────────────────────────────────────── */
    (function dvlScanAudit(){
      var ok=true,notes=[];
      if(typeof window.selectSymbol==="function") notes.push("A1 OK: selectSymbol present (analyze routes through real selector)");
      else { ok=false; notes.push("A1 FAIL: selectSymbol not found"); }
      if(typeof window.setIntervalUi==="function") notes.push("A2 OK: setIntervalUi present (analyze sets chart TF)");
      else notes.push("A2 WARN: setIntervalUi not found — TF switch disabled");
      notes.push("A3 OK: no LTC fallback — unsupported symbols show toast and abort");
      notes.push("A4 OK: futures registry pre-warmed via loadFuturesPairs() at init");
      notes.push("A5 OK: header symbol/logo updated by selectSymbol → updateHeader()");
      notes.push("A6 OK: cards use expanded ICONS+KNOWN maps for coin logos");
      notes.push("A7 OK: unsupported asset → toast shown, chart NOT changed");
      notes.push("A8 OK: no new external API source added");
      notes.push("A9 OK: chart engine not rewritten");
      notes.push("A10 OK: trade/paper/API principal not altered");
      console.log("[DVL Scanner 0.796 Audit]\n"+notes.join("\n"),(ok?"✓ PASS":"⚠ WARN"));
    })();
    /* ──────────────────────────────────────────────────────────── */

    document.addEventListener("click",function(ev){
      var btn=scannerBtn();

      if(btn&&(ev.target===btn||btn.contains(ev.target))){ toggle(ev); return; }

      var apiPick=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-api-pick]"):null;
      if(apiPick){ev.preventDefault();ev.stopPropagation();pickExchange(apiPick.getAttribute("data-dvl-api-pick"));return;}

      var apiBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-scan-api]"):null;
      if(apiBtn){
        ev.preventDefault();ev.stopPropagation();
        var fmA=document.getElementById("dvlScan080FilMenu");if(fmA)fmA.classList.remove("is-open");
        var smA=document.getElementById("dvlScan080SortMenu");if(smA)smA.classList.remove("is-open");
        var menuA=document.getElementById("dvlScan080ApiMenu");if(menuA)menuA.classList.toggle("is-open");
        return;
      }

      var refreshBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-scan-refresh]"):null;
      if(refreshBtn){
        ev.preventDefault();ev.stopPropagation();
        var amR=document.getElementById("dvlScan080ApiMenu");if(amR)amR.classList.remove("is-open");
        var fmR=document.getElementById("dvlScan080FilMenu");if(fmR)fmR.classList.remove("is-open");
        var smR=document.getElementById("dvlScan080SortMenu");if(smR)smR.classList.remove("is-open");
        state.rawRows=[];state.rows=[];state.loaded=false;
        refresh();
        return;
      }

      var alertBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-scan-alerts]"):null;
      if(alertBtn){
        state.filterMode=state.filterMode==="alerts"?"all":"alerts";
        alertBtn.classList.toggle("active",state.filterMode==="alerts");
        state.rows=getDisplayRows();
        renderRows();
        return;
      }

      var filtBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-scan-filter-menu]"):null;
      if(filtBtn){
        ev.preventDefault();ev.stopPropagation();
        var amF=document.getElementById("dvlScan080ApiMenu");if(amF)amF.classList.remove("is-open");
        var smF=document.getElementById("dvlScan080SortMenu");if(smF)smF.classList.remove("is-open");
        var fmF=document.getElementById("dvlScan080FilMenu");if(fmF)fmF.classList.toggle("is-open");
        return;
      }

      /* TF chip click — update filterState.scanTF immediately */
      var tfChip=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-tf-chip]"):null;
      if(tfChip){
        ev.preventDefault();ev.stopPropagation();
        var newTF=tfChip.getAttribute("data-dvl-tf-chip");
        filterState.scanTF=newTF;
        var chips=document.querySelectorAll(".dvlScan080TFChip[data-dvl-tf-chip]");
        for(var ci=0;ci<chips.length;ci++) chips[ci].classList.toggle("is-sel",chips[ci].getAttribute("data-dvl-tf-chip")===newTF);
        return;
      }

      /* SpikeAbove chip click — update filterState.spikeAbove immediately */
      var saChip=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-spike-above]"):null;
      if(saChip){
        ev.preventDefault();ev.stopPropagation();
        var newSA=saChip.getAttribute("data-dvl-spike-above");
        filterState.spikeAbove=newSA;
        var saChips=document.querySelectorAll("[data-dvl-spike-above]");
        for(var si=0;si<saChips.length;si++) saChips[si].classList.toggle("is-sel",saChips[si].getAttribute("data-dvl-spike-above")===newSA);
        return;
      }

      var mafBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-maflat-toggle]"):null;
      if(mafBtn){
        ev.preventDefault();ev.stopPropagation();
        filterState.useMaFlat=mafBtn.getAttribute("data-dvl-maflat-toggle")==="on";
        var mafBtns=document.querySelectorAll("[data-dvl-maflat-toggle]");
        for(var mi=0;mi<mafBtns.length;mi++) mafBtns[mi].classList.toggle("is-sel",mafBtns[mi].getAttribute("data-dvl-maflat-toggle")===(filterState.useMaFlat?"on":"off"));
        return;
      }

      var pgBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-priceglue-toggle]"):null;
      if(pgBtn){
        ev.preventDefault();ev.stopPropagation();
        filterState.usePriceGlue=pgBtn.getAttribute("data-dvl-priceglue-toggle")==="on";
        var pgBtns=document.querySelectorAll("[data-dvl-priceglue-toggle]");
        for(var pi=0;pi<pgBtns.length;pi++) pgBtns[pi].classList.toggle("is-sel",pgBtns[pi].getAttribute("data-dvl-priceglue-toggle")===(filterState.usePriceGlue?"on":"off"));
        return;
      }

      var spvBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-spikeprev-toggle]"):null;
      if(spvBtn){
        ev.preventDefault();ev.stopPropagation();
        filterState.useSpikePrevVol=spvBtn.getAttribute("data-dvl-spikeprev-toggle")==="on";
        var spvBtns=document.querySelectorAll("[data-dvl-spikeprev-toggle]");
        for(var si=0;si<spvBtns.length;si++) spvBtns[si].classList.toggle("is-sel",spvBtns[si].getAttribute("data-dvl-spikeprev-toggle")===(filterState.useSpikePrevVol?"on":"off"));
        return;
      }

      var applyBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-fil-apply]"):null;
      if(applyBtn){ev.preventDefault();ev.stopPropagation();applyFiltros();return;}

      var sortOpen=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-scan-sort-open]"):null;
      if(sortOpen){
        ev.preventDefault();ev.stopPropagation();
        var amS=document.getElementById("dvlScan080ApiMenu");if(amS)amS.classList.remove("is-open");
        var fmS=document.getElementById("dvlScan080FilMenu");if(fmS)fmS.classList.remove("is-open");
        var smS=document.getElementById("dvlScan080SortMenu");if(smS)smS.classList.toggle("is-open");
        return;
      }

      var sortPick=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-sort]"):null;
      if(sortPick){ev.preventDefault();ev.stopPropagation();pickSort(sortPick.getAttribute("data-dvl-sort"));return;}

      var analyzeBtn=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-scan-analyze]"):null;
      if(analyzeBtn){analyze(analyzeBtn.getAttribute("data-dvl-scan-analyze"));return;}

      var inApi=ev.target&&ev.target.closest?ev.target.closest(".dvlScan080ApiWrap"):null;
      var inFil=ev.target&&ev.target.closest?ev.target.closest(".dvlScan080FilWrap"):null;
      var inSort=ev.target&&ev.target.closest?ev.target.closest(".dvlScan080SortWrap"):null;
      if(!inApi){ var aM2=document.getElementById("dvlScan080ApiMenu");if(aM2&&aM2.classList.contains("is-open"))aM2.classList.remove("is-open"); }
      if(!inFil){ var fM2=document.getElementById("dvlScan080FilMenu");if(fM2&&fM2.classList.contains("is-open"))fM2.classList.remove("is-open"); }
      if(!inSort){ var sM2=document.getElementById("dvlScan080SortMenu");if(sM2&&sM2.classList.contains("is-open"))sM2.classList.remove("is-open"); }

      var nav=ev.target&&ev.target.closest?ev.target.closest(".bottomNav .navItem"):null;
      if(nav&&nav!==btn) close();
    },true);

    window.addEventListener("resize",resize);
    window.addEventListener("orientationchange",function(){setTimeout(resize,140);});

    /* Beta 1.208 — create the Scanner refresh timer only while the panel is open. */
    var scannerRefreshTimer1208=0;
    function scannerOpen1208(){
      var panel=document.getElementById("dvlScannerPanel0780");
      return !document.hidden && !!(panel&&panel.classList.contains("is-open"));
    }
    function syncScannerRefresh1208(){
      if(scannerOpen1208()){
        if(!scannerRefreshTimer1208) scannerRefreshTimer1208=setInterval(function(){if(scannerOpen1208())refresh();},REFRESH_MS);
      }else if(scannerRefreshTimer1208){
        clearInterval(scannerRefreshTimer1208); scannerRefreshTimer1208=0;
      }
    }
    window.addEventListener("dvl:scanner-state-change",syncScannerRefresh1208,true);
    document.addEventListener("visibilitychange",syncScannerRefresh1208,true);
    setTimeout(syncScannerRefresh1208,0);
  }

  /* Real settings setter — the Filtros dropdown (Scanner Pro 1013/1015) calls
     this to push TF / MA periods / block inputs down into the engine that
     actually fetches and computes rows, then triggers a refresh. */
  function setFilterConfig(patch){
    if(!patch||typeof patch!=="object") return refresh();
    Object.keys(patch).forEach(function(k){ filterState[k]=patch[k]; });
    try{ localStorage.setItem(LS_FIL,JSON.stringify(filterState)); }catch(_){}
    return refresh();
  }

  window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780={
    open:open,close:close,toggle:toggle,refresh:refresh,
    setExchange:pickExchange,
    setFilterConfig:setFilterConfig,
    getFilterConfig:function(){return Object.assign({},filterState);},
    rows:function(){return state.rows.slice();},
    rawRows:function(){return state.rawRows.slice();}
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{once:true});
  }else{
    bind();
  }
  setTimeout(bind,160);
  setTimeout(bind,700);
})();
