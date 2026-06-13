(function DVL_SPIKE_ZONES(){
  'use strict';

  /* ── Utilities ── */
  var E=function(id){return document.getElementById(id);};
  function nv(id,def){var n=E(id);if(!n)return def;var v=parseFloat(n.value);return Number.isFinite(v)?v:def;}
  function bv(id,def){var n=E(id);return n?n.checked:!!def;}
  function sv(id,def){var n=E(id);return n?n.value:(def||'');}
  function clp(v,a,b){return Math.max(a,Math.min(b,v));}
  function _nf(v){v=Number(v)||0;var a=Math.abs(v);if(a>=1e9)return(a/1e9).toFixed(1)+'B';if(a>=1e6)return(a/1e6).toFixed(1)+'M';if(a>=1e3)return(a/1e3).toFixed(0)+'K';return v.toFixed(0);}
  function _tfMs(tf){var n=parseInt(tf)||1;tf=tf||'';var u=tf.slice(-1).toLowerCase();if(u==='s')return n*1000;if(u==='m')return n*60000;if(u==='h')return n*3600000;if(u==='d')return n*86400000;if(u==='w')return n*604800000;return 60000;}

  /* ── Level colors L1-L5 ── */
  var COL=[null,
    {r:90, g:150,b:255},  /* L1  bright blue    */
    {r:0,  g:215,b:255},  /* L2  vivid cyan     */
    {r:0,  g:245,b:200},  /* L3  vivid mint     */
    {r:255,g:188,b:0  },  /* L4  bright amber   */
    {r:255,g:55, b:245},  /* L5  vivid pink     */
    {r:255,g:90, b:0  },  /* L6  fiery orange   */
    {r:255,g:15, b:15 },  /* L7  alarm red      */
    {r:180,g:0,  b:255},  /* L8  electric violet*/
    {r:255,g:240,b:0  },  /* L9  electric yellow*/
    {r:255,g:255,b:255}   /* L10 pure white     */
  ];
  function hexToRgb(h){h=h.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    return(isNaN(r)||isNaN(g)||isNaN(b))?null:{r:r,g:g,b:b};}

  /* ── State ── */
  var _cache=null,_cKey='';
  var _extC=null,_extK='',_extF=false;    /* main TF candles   */
  var _extPages=[],_extEndT=0,_extRem=0;  /* pagination state  */
  var _nestC=null,_nestK='',_nestF=false; /* nested TF candles */

  /* ── Config ── */
  function _cfg(){
    return{
      minLevel:  clp(parseInt(sv('szMinLevel','1'))||1,1,5),
      sens:      clp(nv('szSens',1.0),0.3,5),
      maxZones:  clp(parseInt(sv('szMaxZones','50'))||50,5,1000),
      source:    sv('szSource','body'),
      volMA:     clp(parseInt(sv('szVolMA','20'))||20,3,200),
      mergeDist: clp(nv('szMerge',0.15),0,2),
      expire:    clp(parseInt(sv('szExpire','250'))||0,0,2000),
      maxTests:  clp(parseInt(sv('szMaxTests','3'))||3,1,20),
      hlOn:      bv('szHlOn',true),
      showLabels: bv('szLabOn',false),
      labVol:    bv('szLabVol',true),
      labTF:     bv('szLabTF',true),
      labSt:     bv('szLabSt',true),
      colMode:   sv('szColMode','hybrid'),
      tf:        sv('szTf',''),
      extend:    clp(nv('szExtend',20),0,200),
      nested:    sv('szNested',''),
      nestMinLvl:clp(parseInt(sv('szNestMinLvl','1'))||1,1,5),
      nestMax:   clp(parseInt(sv('szNestMax','5'))||5,1,20),
      showNested:bv('szShowNested',true),
      nestOp:    clp(nv('szNestOp',0.6),0.1,1),
      nestStyle: sv('szNestStyle','dashed'),
      hvsDomMin: clp(parseFloat(sv('szHvsDomMin','0.30'))||0.30,0.10,0.80),
      hvsWidth:  sv('szHvsWidth','auto'),
      hvsSens:   sv('szHvsSens','medium'),
      spacingOn:      bv('szSpacingOn',true),
      spacingAtr:     clp(nv('szSpacingAtr',0.25),0,3),
      spacingHeight:  clp(nv('szSpacingHeight',1.2),0,5),
      spacingTicks:   clp(nv('szSpacingTicks',4),0,100),
      spacingMtfMult: clp(nv('szSpacingMtfMult',1.5),1,5),
      colorL1:  sv('szColorL1','#5a96ff'),
      colorL2:  sv('szColorL2','#00d7ff'),
      colorL3:  sv('szColorL3','#00f5c8'),
      colorL4:  sv('szColorL4','#ffbc00'),
      colorL5:  sv('szColorL5','#ff37f5'),

      fillOpacity:   clp(nv('szFillOpacity',0.16),0.01,1),
      borderOpacity: clp(nv('szBorderOpacity',0.70),0.01,1),
      sourceOpacity: clp(nv('szSourceOpacity',0.65),0.01,1),
      needleOn:    bv('szNeedleOn',true),
      needleCapt:  clp(nv('szNeedleCapture',0.22),0.05,0.60),
      needleMinA:  clp(nv('szNeedleMinAtr',0.03),0.005,0.5),
      needleMaxA:  clp(nv('szNeedleMaxAtr',0.18),0.01,1.0),
      needleMinPx: clp(nv('szNeedleMinPx',2),1,20),
      needleFP:    bv('szNeedlePreferFP',true),
      needleEst:   bv('szNeedleEstimate',true),
      showGhost:   bv('szShowRawGhost',false),
      ghostOp:     clp(nv('szRawGhostOp',0.05),0.01,0.30),
      needleMode:  sv('szNeedleMode','inside'),
      onlyNeedle:  bv('szOnlyNeedle',false),
      proxOn:      bv('szProxOn',true),
      proxDist:    clp(nv('szProxDist',1.0),0.1,5),
      proxColor:   sv('szProxColor','#f59e0b'),
      histDays:    Math.max(7,parseInt(sv('szHistoryDays','90'))||90)
    };
  }

  /* ── Candle getters ── */
  var _API='https://api.binance.com';
  function _kl(x){return{t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()};}

  function _getCandles(){
    var tf=sv('szTf','');
    if(!tf||tf===window.S.tf)return window.S.candles;
    var hDays=Math.max(7,parseInt(sv('szHistoryDays','90'))||90);
    var msBar=_tfMs(tf);
    /* cap: 5000 barras máx (5 páginas × 1000) para não sobrecarregar */
    var targetBars=Math.min(5000,msBar>0?Math.ceil(hDays*86400000/msBar):1000);
    var wk=S.sym+'|'+tf+'|'+hDays;
    if(_extK===wk&&_extC)return _extC;
    if(!_extF||_extK!==wk){
      _extF=true;_extK=wk;_extC=null;_extPages=[];
      _extEndT=Date.now();_extRem=targetBars;
      _extFetchPage(wk);
    }
    return window.S.candles; /* usa candles do chart enquanto carrega */
  }

  function _extFetchPage(wk){
    if(_extK!==wk)return; /* request obsoleto */
    var parts=wk.split('|'),sym=parts[0],tf=parts[1];
    var lim=Math.min(1000,_extRem);
    if(lim<=0){_extFetchDone(wk);return;}
    var url=_API+'/api/v3/klines?symbol='+sym+'&interval='+tf
            +'&limit='+lim+'&endTime='+_extEndT;
    fetch(url)
      .then(function(r){return r.ok?r.json():Promise.reject();})
      .then(function(d){
        if(_extK!==wk)return;
        if(!d||!d.length){_extFetchDone(wk);return;}
        /* prepend: dados mais antigos vêm à frente */
        _extPages=d.concat(_extPages);
        _extRem-=d.length;
        /* atualiza progressivamente — primeira página já renderiza */
        _extC=_extPages.map(_kl);
        _cKey='';if(typeof drawSoon==='function')drawSoon();
        if(d.length>=lim&&_extRem>0){
          _extEndT=d[0][0]-1; /* antes da barra mais antiga carregada */
          setTimeout(function(){_extFetchPage(wk);},280);
        } else {
          _extF=false;
        }
      })
      .catch(function(){
        if(_extPages.length){_extC=_extPages.map(_kl);_cKey='';if(typeof drawSoon==='function')drawSoon();}
        _extF=false;
      });
  }

  function _extFetchDone(wk){
    if(_extK!==wk)return;
    _extF=false;
    if(_extPages.length){_extC=_extPages.map(_kl);_cKey='';if(typeof drawSoon==='function')drawSoon();}
  }

  function _getNestedCandles(nestTF){
    if(!nestTF)return null;
    var wk=S.sym+'|'+nestTF+'|n';
    if(_nestK===wk&&_nestC)return _nestC;
    if(!_nestF||_nestK!==wk){
      _nestF=true;_nestK=wk;_nestC=null;
      fetch(_API+'/api/v3/klines?symbol='+S.sym+'&interval='+nestTF+'&limit=1000')
        .then(function(r){return r.ok?r.json():Promise.reject();})
        .then(function(d){if(_nestK!==wk)return;_nestC=d.map(_kl);_nestF=false;_cKey='';if(typeof drawSoon==='function')drawSoon();})
        .catch(function(){_nestF=false;});
    }
    return null;
  }

  /* ── High Volume Segment helpers ── */
  function _hvsLoc(c,lo,hi){
    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),mid=(hi+lo)/2;
    if(mid>bHi)return'upperWick';if(mid<bLo)return'lowerWick';return'body';
  }

  function _hvsFromFP(c,cfg){
    /* Use real footprint data if available */
    var fp=c.fp;if(!fp||fp.size<3)return null;
    var entries=[];
    fp.forEach(function(vd,p){
      var v=vd&&typeof vd==='object'?(+(vd.buy||0)+ +(vd.sell||0)):+vd||0;
      if(v>0)entries.push({p:+p,v:v});
    });
    if(entries.length<3)return null;
    entries.sort(function(a,b){return a.p-b.p;});
    var tot=entries.reduce(function(s,e){return s+e.v;},0);
    if(!tot)return null;
    var pIdx=0;for(var k=1;k<entries.length;k++)if(entries[k].v>entries[pIdx].v)pIdx=k;
    var poc=entries[pIdx].p,cv=entries[pIdx].v,lo_=pIdx,hi_=pIdx;
    var minD=cfg.hvsDomMin||0.30;
    while(cv/tot<minD){
      var aL=lo_>0?entries[lo_-1].v:0,aH=hi_<entries.length-1?entries[hi_+1].v:0;
      if(!aL&&!aH)break;
      if(aL>=aH&&lo_>0){lo_--;cv+=entries[lo_].v;}
      else if(hi_<entries.length-1){hi_++;cv+=entries[hi_].v;}
      else if(lo_>0){lo_--;cv+=entries[lo_].v;}
      else break;
    }
    var cLo=entries[lo_].p,cHi=entries[hi_].p;
    if(cHi<=cLo)cHi=cLo+c.atr*0.02||cLo*(1+1e-4);
    return{hi:cHi,lo:cLo,pocPrice:poc,location:_hvsLoc(c,cLo,cHi),source:'footprint',volPct:cv/tot};
  }

  function _hvsEstimate(c,at,cfg){
    /* Directional density scoring: bull spike -> lower wick/body absorbs buying;
       bear spike -> upper wick/body absorbs selling. Score each region and pick best. */
    var range=c.h-c.l;if(range<1e-12)return null;
    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),bR=bHi-bLo;
    var uw=c.h-bHi,lw=bLo-c.l;
    var bPct=bR/range,uwPct=uw/range,lwPct=lw/range;
    var sens=cfg.hvsSens||'medium';
    var wickCapture=sens==='high'?0.42:sens==='low'?0.68:0.54;
    var isBull=c.c>=c.o;
    /* body always has baseline volume; wicks weighted by candle direction */
    var bScore=bPct*1.10;
    var uwScore=uwPct>0.12?uwPct*(isBull?0.70:1.50):0; /* bear: upper wick = distribution vol */
    var lwScore=lwPct>0.12?lwPct*(isBull?1.50:0.70):0; /* bull: lower wick = absorption vol  */
    var loc,hi,lo,poc;
    if(bScore>=uwScore&&bScore>=lwScore){
      loc='body';poc=c.c;
      var hw=Math.max(bR*0.55,at*0.04);
      hi=Math.min(c.h,poc+hw);lo=Math.max(c.l,poc-hw);
    }else if(uwScore>=lwScore){
      loc='upperWick';hi=c.h;lo=c.h-uw*wickCapture;poc=(hi+lo)/2;
    }else{
      loc='lowerWick';lo=c.l;hi=c.l+lw*wickCapture;poc=(hi+lo)/2;
    }
    if(hi<=lo){var m=(hi+lo)/2;hi=m+at*0.06;lo=m-at*0.06;}
    var vPct=Math.max(bPct,uwPct,lwPct);
    return{hi:hi,lo:lo,pocPrice:poc||((hi+lo)/2),location:loc,source:'estimated',volPct:vPct};
  }

  function _computeHVS(c,at,cfg){
    var r=_hvsFromFP(c,cfg)||_hvsEstimate(c,at,cfg);
    if(!r)return null;
    /* apply width override */
    var w=cfg.hvsWidth||'auto';
    if(w!=='auto'){
      var h=w==='narrow'?at*0.12:w==='wide'?at*0.35:at*0.21;
      r.hi=r.pocPrice+h;r.lo=r.pocPrice-h;
    }
    r.segmentHigh=r.hi;r.segmentLow=r.lo;r.segmentVolPct=r.volPct;
    return r;
  }

  /* ── Needle Volume Zone Refinement ── */

  /* Try footprint data: expand from POC until capturing needleCapt% of zone volume */
  function _needleFromFP(c,cfg,rawHi,rawLo){
    var fp=c.fp;if(!fp||fp.size<2)return null;
    var entries=[];
    fp.forEach(function(vd,p){
      p=+p;if(p<rawLo||p>rawHi)return;
      var v=vd&&typeof vd==='object'?(+(vd.buy||0)+(+vd.sell||0)):+vd||0;
      if(v>0)entries.push({p:p,v:v});
    });
    if(entries.length<2)return null;
    entries.sort(function(a,b){return a.p-b.p;});
    var tot=entries.reduce(function(s,e){return s+e.v;},0);if(!tot)return null;
    var pi=0;for(var k=1;k<entries.length;k++)if(entries[k].v>entries[pi].v)pi=k;
    var poc=entries[pi].p,cv=entries[pi].v,lo_=pi,hi_=pi;
    while(cv/tot<cfg.needleCapt){
      var aL=lo_>0?entries[lo_-1].v:0,aH=hi_<entries.length-1?entries[hi_+1].v:0;
      if(!aL&&!aH)break;
      if(aL>=aH&&lo_>0){lo_--;cv+=entries[lo_].v;}
      else if(hi_<entries.length-1){hi_++;cv+=entries[hi_].v;}
      else if(lo_>0){lo_--;cv+=entries[lo_].v;}else break;
    }
    var nLo=entries[lo_].p,nHi=entries[hi_].p;
    if(nHi<=nLo){var m=(nHi+nLo)/2;nHi=m*(1+1e-4);nLo=m*(1-1e-4);}
    return{hi:nHi,lo:nLo,mid:(nHi+nLo)/2,poc:poc,source:'footprint',volPct:cv/tot,
      confidence:Math.min(1,0.6+cv/tot*0.4)};
  }

  /* Estimate needle from OHLCV: score body/upper-wick/lower-wick regions */
  function _needleEstimate(c,at,cfg,rawHi,rawLo){
    var range=c.h-c.l;if(range<1e-12||at<1e-12)return null;
    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),bR=bHi-bLo;
    var uw=c.h-bHi,lw=bLo-c.l;
    var isBull=c.c>=c.o,isDoji=bR<range*0.08;
    function intersect(aLo,aHi,bLo2,bHi2){var iLo=Math.max(aLo,bLo2),iHi=Math.min(aHi,bHi2);return iHi>iLo?{lo:iLo,hi:iHi,mid:(iLo+iHi)/2}:null;}
    var regions=[];
    /* body */
    var bodyInt=bR>0?intersect(bLo,bHi,rawLo,rawHi):null;
    if(bodyInt){
      var sc2=(bodyInt.hi-bodyInt.lo)/range*1.15+(isDoji?0.30:0);
      sc2+=(1-Math.abs(bodyInt.mid-c.c)/range)*0.20;
      regions.push({lo:bodyInt.lo,hi:bodyInt.hi,mid:bodyInt.mid,score:sc2,poc:c.c});
    }
    /* upper wick */
    var uwInt=uw>0?intersect(bHi,c.h,rawLo,rawHi):null;
    if(uwInt){
      var sc2=(uwInt.hi-uwInt.lo)/range*(isBull?0.45:1.70);
      if(uw>bR*2)sc2+=0.35;if(!isBull&&uw>range*0.4)sc2+=0.20;
      regions.push({lo:uwInt.lo,hi:uwInt.hi,mid:uwInt.mid,score:sc2,poc:c.h-uw*0.25});
    }
    /* lower wick */
    var lwInt=lw>0?intersect(c.l,bLo,rawLo,rawHi):null;
    if(lwInt){
      var sc2=(lwInt.hi-lwInt.lo)/range*(isBull?1.70:0.45);
      if(lw>bR*2)sc2+=0.35;if(isBull&&lw>range*0.4)sc2+=0.20;
      regions.push({lo:lwInt.lo,hi:lwInt.hi,mid:lwInt.mid,score:sc2,poc:c.l+lw*0.25});
    }
    if(!regions.length)return null;
    regions.sort(function(a,b){return b.score-a.score;});
    var best=regions[0];
    var hH=Math.max(at*cfg.needleMinA*0.5,(best.hi-best.lo)*0.4);
    hH=Math.min(hH,at*(cfg.needleMinA+cfg.needleMaxA)/4);
    var center=Math.max(best.lo,Math.min(best.hi,best.poc));
    var nHi=Math.min(center+hH,rawHi),nLo=Math.max(center-hH,rawLo);
    if(nHi<=nLo){nHi=best.hi;nLo=best.lo;}
    return{hi:nHi,lo:nLo,mid:(nHi+nLo)/2,poc:center,source:'estimated',volPct:best.score,
      confidence:Math.min(0.75,0.25+best.score*0.50)};
  }

  /* Combine: footprint > estimate; apply ATR min/max; clamp to raw zone */
  function _refineToNeedleZone(c,at,cfg,rawHi,rawLo){
    var r=null;
    if(cfg.needleFP)r=_needleFromFP(c,cfg,rawHi,rawLo);
    if(!r&&cfg.needleEst)r=_needleEstimate(c,at,cfg,rawHi,rawLo);
    if(!r)return null;
    r.hi=Math.min(r.hi,rawHi);r.lo=Math.max(r.lo,rawLo);
    var h=r.hi-r.lo;
    var minH=at*cfg.needleMinA,maxH=at*cfg.needleMaxA;
    if(h<minH){var m=(r.hi+r.lo)/2;r.hi=Math.min(m+minH/2,rawHi);r.lo=Math.max(m-minH/2,rawLo);}
    if(h>maxH){var m=(r.hi+r.lo)/2;r.hi=Math.min(m+maxH/2,rawHi);r.lo=Math.max(m-maxH/2,rawLo);}
    if(r.hi<=r.lo){var m=(rawHi+rawLo)/2;r.hi=m+minH/2;r.lo=m-minH/2;}
    r.mid=(r.hi+r.lo)/2;
    return r;
  }

  /* Score para selecionar melhor needle durante merge */
  function _needleScore(z){
    return (z.needleSource==='footprint'?10000000:0)
      +((z.level||0)*100000)
      +((z.rawScore||0)*1000)
      +((z.vol||0)/1000)
      +((z.needleConfidence||0)*5000)
      +((z.needleVolPct||0)*2000);
  }

  /* ── Core spike detection (works for main and nested) ── */
  function _detectAndBuild(cs, baseOffset, fullCs, cfg, isNested){
    var n=cs.length;
    if(n<(isNested?2:10))return[];

    /* adaptive periods for small nested sets */
    var MA_P=isNested?Math.max(2,Math.min(5,n-1)):(cfg.volMA||20);
    var ATR_P=isNested?Math.max(2,Math.min(5,n-1)):14;

    /* volume MA */
    var volMA=new Float64Array(n),vs=0;
    for(var i=0;i<n;i++){vs+=cs[i].v;if(i>=MA_P)vs-=cs[i-MA_P].v;volMA[i]=vs/Math.min(i+1,MA_P);}

    /* volume ATR = rolling mean of |v[i] - v[i-1]| */
    var volATR=new Float64Array(n),vaS=0;
    for(var i=0;i<n;i++){
      var vd=i>0?Math.abs(cs[i].v-cs[i-1].v):0;
      vaS+=vd;if(i>=MA_P)vaS-=(i-MA_P>0?Math.abs(cs[i-MA_P].v-cs[i-MA_P-1].v):0);
      volATR[i]=vaS/Math.min(i+1,MA_P);
    }

    /* price ATR (still needed for zone sizing) */
    var atrArr=new Float64Array(n),atrSum=0;
    for(var i=0;i<n;i++){
      var c=cs[i],pc=i>0?cs[i-1].c:c.o;
      var tr=Math.max(c.h-c.l,Math.abs(c.h-pc),Math.abs(c.l-pc));
      atrSum+=tr;
      if(i>=ATR_P){var oc=cs[i-ATR_P],op2=i>ATR_P?cs[i-ATR_P-1].c:oc.o;atrSum-=Math.max(oc.h-oc.l,Math.abs(oc.h-op2),Math.abs(oc.l-op2));}
      atrArr[i]=atrSum/Math.min(i+1,ATR_P);
    }

    /* level thresholds: (vol - volMA) / volATR vs multiples of 1.5 scaled by sens */
    var s=cfg.sens||1;
    var WARMUP=isNested?0:Math.max(MA_P,ATR_P);
    var minLvl=isNested?cfg.nestMinLvl:cfg.minLevel;
    var candidates=[];

    for(var i=WARMUP;i<n;i++){
      var c=cs[i],vm=volMA[i]||1,at=atrArr[i]||1,va=volATR[i];
      var uw=c.h-Math.max(c.o,c.c),lw=Math.min(c.o,c.c)-c.l;
      if(c.v<=vm)continue; /* must be above average volume */
      var ex=va>0?(c.v-vm)/va:0; /* excess in volATR units */
      var level=ex>=24.0*s?10:ex>=18.0*s?9:ex>=13.5*s?8:ex>=10.0*s?7:ex>=7.5*s?6:ex>=6.0*s?5:ex>=4.5*s?4:ex>=3.0*s?3:ex>=1.5*s?2:1;
      /* compress: L3-4→1, L5-6→2, L7-8→3, L9→4, L10→5; L1-2→0 filtered */
      level=level>=10?5:level>=9?4:level>=7?3:level>=5?2:level>=3?1:0;
      if(level<minLvl)continue;
      var dir=c.c>c.o?'bull':c.c<c.o?'bear':'neutral';
      var hi,lo,hvsMeta=null,hvsOnly=(cfg.source==='hvs_only');
      if(hvsOnly||cfg.source==='hvs'){
        var _hvs=_computeHVS(c,at,cfg);
        if(_hvs&&_hvs.volPct>=cfg.hvsDomMin){hi=_hvs.hi;lo=_hvs.lo;hvsMeta=_hvs;}
        else{hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);hvsMeta={pocPrice:(c.o+c.c)/2,location:'body',source:'fallback',volPct:0};}
      }
      else if(cfg.source==='body'){hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);}
      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h;lo=Math.max(c.o,c.c);}else{hi=Math.min(c.o,c.c);lo=c.l;}}
      else{hi=c.h;lo=c.l;}
      /* doji fallback: body stays at mid±tiny; others use at*0.01 */
      if(hi<=lo){if(cfg.source==='body'){var _bm=(c.o+c.c)/2;hi=_bm+(at*0.002||0.01);lo=_bm-(at*0.002||0.01);}else{lo=hi-at*0.01;}}
      /* ATR cap skipped in hvs_only and body — body must stay at open/close */
      if(!hvsOnly&&cfg.source!=='body'&&at>0&&(hi-lo)>at*1.5){var _zm=(Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;hi=_zm+at*0.75;lo=_zm-at*0.75;}
      var rawHi=hi,rawLo=lo;
      /* body clamp: final zone must never exceed the candle open/close */
      if(cfg.source==='body'){rawHi=Math.min(rawHi,Math.max(c.o,c.c));rawLo=Math.max(rawLo,Math.min(c.o,c.c));hi=rawHi;lo=rawLo;}
      var _needle=(cfg.needleOn||cfg.onlyNeedle)?_refineToNeedleZone(c,at,cfg,rawHi,rawLo):null;
      /* z.hi/z.lo = zona principal (fonte bruta); needle = miolo separado */
      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,
        level:level,rawScore:ex,hi:rawHi,lo:rawLo,mid:(rawHi+rawLo)/2,
        dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta,hvsOnly:hvsOnly,
        rawHi:rawHi,rawLo:rawLo,
        needleHi:_needle?_needle.hi:null,
        needleLo:_needle?_needle.lo:null,
        needleMid:_needle?_needle.mid:null,
        needlePoc:_needle?_needle.poc:null,
        needleSource:_needle?_needle.source:'none',
        needleVolPct:_needle?_needle.volPct:0,
        needleConfidence:_needle?_needle.confidence:0});
    }
    if(!candidates.length)return[];

    /* sort newest first for merge priority */
    candidates.sort(function(a,b){return b.srcIdx-a.srcIdx;});

    /* merge overlapping/nearby (skipped for hvs_only — each core stays independent) */
    var _isHvsOnly=candidates.length>0&&candidates[0].hvsOnly;
    var used=new Uint8Array(candidates.length),merged=[];
    for(var i=0;i<candidates.length;i++){
      if(used[i])continue;
      var z=Object.assign({},candidates[i]);
      z.srcIdxs=[z.srcIdx];
      if(!_isHvsOnly&&cfg.mergeDist>0){
        var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);
        for(var j=i+1;j<candidates.length;j++){
          if(used[j])continue;
          var z2=candidates[j];
          var _z2rHi=z2.rawHi||z2.hi,_z2rLo=z2.rawLo||z2.lo;
          var _z1rHi=z.rawHi||z.hi,_z1rLo=z.rawLo||z.lo;
          if(_z2rLo<=_z1rHi+mt&&_z2rHi>=_z1rLo-mt){
            used[j]=1;
            z.srcIdxs.push(z2.srcIdx);
            /* zona principal: expande normalmente */
            z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;
            z.rawHi=Math.max(z.rawHi||z.hi,z2.rawHi||z2.hi);
            z.rawLo=Math.min(z.rawLo||z.lo,z2.rawLo||z2.lo);
            if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}
            /* needle: preserva melhor por _needleScore */
            if(_needleScore(z2)>_needleScore(z)){
              z.needleHi=z2.needleHi;z.needleLo=z2.needleLo;z.needleMid=z2.needleMid;
              z.needlePoc=z2.needlePoc;z.needleSource=z2.needleSource;
              z.needleVolPct=z2.needleVolPct;z.needleConfidence=z2.needleConfidence;
            }
            z.vol=Math.max(z.vol,z2.vol);
          }
        }
      }
      merged.push(z);
    }

    /* status & expiry (skip for nested) */
    var fc=fullCs||cs;
    var now=fc.length-1;
    var final_=[];
    for(var zi=0;zi<merged.length;zi++){
      var z=merged[zi];
      if(isNested){z.age=0;z.tests=0;z.isRecent=true;z.status='fresh';final_.push(z);continue;}
      z.age=now-Math.min(z.srcIdx,now);
      if(cfg.expire>0&&z.age>cfg.expire)continue;
      var tests=0,chkS=Math.min(fc.length-1,z.srcIdx+1),chkE=Math.min(fc.length-1,z.srcIdx+(cfg.expire||250)+5);
      for(var k=chkS;k<=chkE&&k<fc.length;k++){var ck=fc[k];if(ck.l<=z.hi&&ck.h>=z.lo)tests++;}
      z.tests=tests;z.isRecent=z.age<50;
      z.status=tests===0?'fresh':tests<cfg.maxTests?'tested':'weakened';
      final_.push(z);
    }

    final_.sort(function(a,b){var ld=b.level-a.level;return ld!==0?ld:b.srcIdx-a.srcIdx;});
    return final_.slice(0,isNested?cfg.nestMax:cfg.maxZones);
  }

  /* ── Proximity Group: agrupa zonas visualmente próximas (post-cache) ── */
  function _proximityGroup(zones,cfg){
    if(!cfg.proxOn||zones.length<2)return zones;
    var atrSum=0,atrN=0;
    for(var i=0;i<zones.length;i++){if(zones[i].atr>0){atrSum+=zones[i].atr;atrN++;}}
    if(atrN===0)return zones;
    var thresh=(atrSum/atrN)*cfg.proxDist;
    var sorted=zones.slice().sort(function(a,b){return a.lo-b.lo;});
    var used=new Uint8Array(sorted.length),result=[];
    for(var i=0;i<sorted.length;i++){
      if(used[i])continue;
      used[i]=1;
      var gHi=sorted[i].hi,gLo=sorted[i].lo,group=[i];
      /* expand transitivamente até nenhum vizinho novo */
      var chg=true;
      while(chg){
        chg=false;
        for(var j=0;j<sorted.length;j++){
          if(used[j])continue;
          if(sorted[j].lo<=gHi+thresh&&sorted[j].hi>=gLo-thresh){
            used[j]=1;group.push(j);
            gHi=Math.max(gHi,sorted[j].hi);gLo=Math.min(gLo,sorted[j].lo);chg=true;
          }
        }
      }
      if(group.length===1){result.push(sorted[i]);continue;}
      /* mescla grupo numa zona conlfuência */
      var z0=Object.assign({},sorted[group[0]]);
      z0.srcIdxs=z0.srcIdxs?z0.srcIdxs.slice():[z0.srcIdx];
      for(var k=1;k<group.length;k++){
        var oz=sorted[group[k]];
        /* body: preserve best zone bounds; other sources: expand to union */
        if(cfg.source==='body'){if((oz.rawScore||0)>(z0.rawScore||0)||(oz.level>z0.level)){z0.hi=oz.hi;z0.lo=oz.lo;}}else{z0.hi=Math.max(z0.hi,oz.hi);z0.lo=Math.min(z0.lo,oz.lo);}
        z0.level=Math.max(z0.level,oz.level);
        z0.vol=Math.max(z0.vol,oz.vol);
        if((oz.rawScore||0)>(z0.rawScore||0))z0.rawScore=oz.rawScore;
        /* srcIdx mais antigo = borda esquerda mais longe */
        if(oz.srcIdx<z0.srcIdx){z0.srcIdx=oz.srcIdx;z0.srcTs=oz.srcTs;}
        if(oz.srcIdxs)z0.srcIdxs=z0.srcIdxs.concat(oz.srcIdxs);
        else if(oz.srcIdx!=null)z0.srcIdxs.push(oz.srcIdx);
        if(_needleScore(oz)>_needleScore(z0)){
          z0.needleHi=oz.needleHi;z0.needleLo=oz.needleLo;
          z0.needleMid=oz.needleMid;z0.needlePoc=oz.needlePoc;
          z0.needleSource=oz.needleSource;
          z0.needleVolPct=oz.needleVolPct;z0.needleConfidence=oz.needleConfidence;
        }
      }
      z0.mid=(z0.hi+z0.lo)/2;
      z0.isProxMerged=true;z0.proxCount=group.length;
      result.push(z0);
    }
    result.sort(function(a,b){return b.level-a.level;});
    return result;
  }

  /* ── Nested zones: per main zone, find inner spikes ── */
  function _computeNested(mainZones,nestCs,mainTfMs,nestCfg){
    var allNested=[];
    for(var zi=0;zi<mainZones.length;zi++){
      var mz=mainZones[zi];
      var t0=mz.srcTs,t1=t0+mainTfMs;
      var inner=[];
      for(var i=0;i<nestCs.length;i++){var c=nestCs[i];if(c.t>=t0&&c.t<t1)inner.push(c);}
      if(inner.length<2)continue;
      var izones=_detectAndBuild(inner,0,inner,nestCfg,true);
      for(var j=0;j<izones.length;j++){izones[j].isNested=true;izones[j].parentId=mz.id;allNested.push(izones[j]);}
    }
    return allNested;
  }

  /* ── ATR Smart Spacing: multi-param filter, keeps best zone per region ── */
  function _applyAtrSmartSpacing(zones,cfg,isMTF){
    if(zones.length<2)return zones;
    var mult=isMTF?(cfg.spacingMtfMult||1.5):1.0;
    var sAtr=(cfg.spacingAtr||0.25)*mult;
    var sH=(cfg.spacingHeight||1.2)*mult;
    var sT=(cfg.spacingTicks||4)*mult;
    /* compute averages for minGap */
    var sumAtr=0,sumH=0;
    for(var k=0;k<zones.length;k++){sumAtr+=zones[k].atr||0;sumH+=(zones[k].hi-zones[k].lo);}
    var avgAtr=sumAtr/zones.length,avgH=sumH/zones.length;
    var tick=avgAtr>0?avgAtr*0.01:0.01;
    function _zScore(z){
      return z.level*100000
        +(z.rawScore||0)*1000
        +((z.hvsMeta&&z.hvsMeta.volPct)||0)*500
        +((z.hvsMeta&&z.hvsMeta.source==='footprint')?500:0)
        +(z.srcIdx||0)
        +(z.vol||0)/1e8;
    }
    var byPri=zones.slice().sort(function(a,b){return _zScore(b)-_zScore(a);});
    var kept=[];
    for(var i=0;i<byPri.length;i++){
      var z=byPri[i];
      var minGap=Math.max(avgAtr*sAtr,avgH*sH,tick*sT);
      var ok=true;
      for(var j=0;j<kept.length;j++){
        if(Math.abs(z.mid-kept[j].mid)<minGap){ok=false;break;}
      }
      if(ok)kept.push(z);
    }
    kept.sort(function(a,b){var ld=b.level-a.level;return ld!==0?ld:b.srcIdx-a.srcIdx;});
    return kept;
  }

  /* ── Main compute ── */
  function _computeAll(cs,cfg,nestCs){
    var base=0;
    var sl=cs; /* scan full history — no maxScan limit */
    var main=_detectAndBuild(sl,base,cs,cfg,false);
    var _afterDetect=main.length;
    var _isMTF=!!(cfg.tf&&cfg.tf!==S.tf);
    if(cfg.spacingOn&&main.length>1)main=_applyAtrSmartSpacing(main,cfg,_isMTF);
    var _afterSpacing=main.length;
    var nested=[];
    if(nestCs&&nestCs.length>=2&&cfg.nested&&main.length){
      var mainTfMs=_tfMs(cfg.tf||S.tf);
      nested=_computeNested(main,nestCs,mainTfMs,cfg);
      if(cfg.spacingOn&&nested.length>1)nested=_applyAtrSmartSpacing(nested,cfg,false);
    }
    /* diagnóstico sempre visível no console */
    try{console.log('[SZ] candles='+cs.length
      +' detect='+_afterDetect
      +' afterSpacing='+_afterSpacing
      +' final='+main.length
      +' maxZones='+cfg.maxZones
      +' expire='+cfg.expire
      +' spacingOn='+cfg.spacingOn
      +' tf='+(cfg.tf||S.tf)
      +' histDays='+cfg.histDays);}catch(_){}
    return{main:main,nested:nested};
  }

  /* ── Draw ── */
  function drawSpikeZones(ctx,W,H,V,sc,x,bw){
    if(!window.S||!S.inds.spikeZones||!S.candles.length)return;
    var cfg=_cfg();
    var cs=_getCandles();
    if(!cs||cs.length<10)return;

    /* resolve nested TF */
    var nestTF='';
    if(cfg.nested){
      nestTF=cfg.nested==='same'?S.tf:cfg.nested;
      if(nestTF===(cfg.tf||S.tf))nestTF=''; /* disable if identical to main */
    }
    var nestCs=nestTF?_getNestedCandles(nestTF):null;

    /* cache key */
    var tf=cfg.tf||S.tf;
    var ck=[cs.length,cs[0]?cs[0].t:0,S.sym,tf,
            cfg.minLevel,cfg.sens,cfg.volMA,
            cfg.maxZones,cfg.source,
            cfg.hvsDomMin,cfg.hvsWidth,cfg.hvsSens,
            cfg.mergeDist,cfg.expire,cfg.maxTests,
            nestTF,cfg.nestMinLvl,cfg.nestMax,
            nestCs?nestCs.length:0,
            cfg.spacingOn,cfg.spacingAtr,cfg.spacingHeight,cfg.spacingTicks,cfg.spacingMtfMult,
            cfg.needleOn?1:0,cfg.needleCapt,cfg.needleMinA,cfg.needleMaxA,cfg.needleFP?1:0,cfg.needleEst?1:0,cfg.onlyNeedle?1:0,
            cfg.histDays].join('|');

    if(_cKey!==ck){
      _cache=_computeAll(cs,cfg,nestCs);_cKey=ck;
      if(window.S)window.S.spikeZones=_cache.main;
      /* needle diagnostics — fires ao recomputar quando needleOn */
      if(cfg.needleOn&&typeof console!=='undefined'&&console.table&&(_cache.main||[]).length){
        try{console.table((_cache.main||[]).slice(0,10).map(function(z){
          var rH=(z.rawHi||z.hi)-(z.rawLo||z.lo);
          var nH=z.needleHi!=null?z.needleHi-z.needleLo:null;
          return{level:z.level,age:z.age,status:z.status,
            zoneH:rH.toFixed?rH.toFixed(4):rH,
            needleH:nH!=null?(nH.toFixed?nH.toFixed(4):nH):'—',
            needleSource:z.needleSource||'none',
            conf:(z.needleConfidence||0).toFixed?z.needleConfidence.toFixed(2):'—'};
        }));}catch(_){}
      }
      if(window.__debugSpikeZones&&typeof console!=='undefined'&&console.table&&(_cache.main||[]).length){
        try{console.table((_cache.main||[]).slice(0,25).map(function(z){
          var bH=z.hi-z.lo;
          return{level:z.level,srcIdx:z.srcIdx,age:z.age,
            hi:z.hi.toFixed?z.hi.toFixed(5):z.hi,
            lo:z.lo.toFixed?z.lo.toFixed(5):z.lo,
            height:bH.toFixed?bH.toFixed(5):bH,
            merged:z.isProxMerged||false,
            proxN:z.proxCount||1,
            source:cfg.source};
        }));}catch(_){}
      }
    }

    var main=(_cache&&_cache.main)||[];
    var nested=(_cache&&_cache.nested)||[];
    if(!main.length&&!nested.length)return;
    /* proximity group — post-cache, puramente visual */
    if(cfg.proxOn&&main.length>1)main=_proximityGroup(main,cfg);
    var proxC=cfg.proxOn&&cfg.proxColor?hexToRgb(cfg.proxColor)||null:null;

    var rp=typeof RP==='function'?RP():68;
    var xL=0,bwPx=typeof bw==='number'?bw:4;
    var xR=W-rp-2;/* extend: zonas chegam ao limite direito do chart — szExtend desc. */var _szExtIgn=cfg.extend;
    var usingMTF=cfg.tf&&cfg.tf!==S.tf;
    var expBound=cfg.expire>0?cfg.expire:250;
    /* timestamp-based x lookup for MTF zones */
    function _xByTs(ts){
      var cs2=S.candles;if(!cs2||!cs2.length)return 0;
      var lo=0,hi=cs2.length-1;
      while(lo<hi){var m2=(lo+hi)>>1;if(cs2[m2].t<ts)lo=m2+1;else hi=m2;}
      if(lo>0&&Math.abs(cs2[lo-1].t-ts)<Math.abs(cs2[lo].t-ts))lo--;
      return Math.max(0,x(lo)-bwPx*0.5);
    }

    ctx.textBaseline='middle'; /* ensures vertical centering for all text */
    var isHvsOnlyDraw=main.length>0&&!!main[0].hvsOnly;
    /* build color array from user inputs (fallback to COL defaults) */
    var cols=[null];
    for(var _li=1;_li<=5;_li++){var _hx=cfg['colorL'+_li];cols.push(_hx?hexToRgb(_hx)||COL[_li]:COL[_li]);}

    /* ══ MAIN ZONES ══ */
    for(var zi=0;zi<main.length;zi++){
      var z=main[zi];
      var y1=sc.y(z.hi),y2=sc.y(z.lo);
      if(y1>=H||y2<=0)continue;
      var boxH=Math.max(1,y2-y1);
      var col=(z.isProxMerged&&proxC)?proxC:(cols[z.level]||cols[5]);
      var recency=Math.max(0,1-(z.age/expBound));
      var lf=z.level/10;
      xL=usingMTF?_xByTs(z.srcTs):Math.max(0,x(z.srcIdx)-bwPx*0.5);
      if(xL>=xR)continue; /* source candle is off-screen to the right */

      /* ghost zone (raw zone before needle refinement) */
      if(cfg.showGhost&&z.rawHi&&z.rawLo&&z.rawHi>z.rawLo){
        var gy1=sc.y(z.rawHi),gy2=sc.y(z.rawLo);
        if(gy1<H&&gy2>0){
          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(cfg.ghostOp).toFixed(3)+')';
          ctx.fillRect(xL,gy1,xR-xL,Math.max(1,gy2-gy1));
          ctx.lineWidth=0.5;ctx.setLineDash([1,4]);
          ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(cfg.ghostOp*2.5).toFixed(3)+')';
          ctx.beginPath();ctx.moveTo(xL,gy1);ctx.lineTo(xR,gy1);
          ctx.moveTo(xL,gy2);ctx.lineTo(xR,gy2);ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      /* ── opacity from user config ── */
      var fillOp=cfg.fillOpacity,strOp=cfg.borderOpacity;
      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}
      else if(z.status==='tested'){fillOp*=0.76;strOp*=0.76;}
      /* 'only' mode: zona principal vira fundo quase invisível */
      var _nMode=cfg.needleOn?(cfg.needleMode||'inside'):'off';
      if(_nMode==='only'&&z.needleHi!=null){
        fillOp*=0.12;strOp*=0.20;
      }

      if(isHvsOnlyDraw){
        /* HVS-ONLY: tight inner core box — no parent zone, clean premium visual */
        var coreH=Math.max(2,boxH);
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(fillOp*2.2).toFixed(3)+')';
        ctx.fillRect(xL,y1,xR-xL,coreH);
        ctx.lineWidth=1.5;ctx.setLineDash([]);
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(0.95,strOp*1.4).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();
        ctx.lineWidth=1;
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.70).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();
        ctx.lineWidth=1.5;
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(0.9,strOp*1.2).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL+bwPx*0.5,y1);ctx.lineTo(xL+bwPx*0.5,y2);ctx.stroke();
        if(z.level>=3&&recency>0.4){
          ctx.save();ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.60)';ctx.shadowBlur=4;
          ctx.lineWidth=1;ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+',0.50)';
          ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();
          ctx.restore();ctx.setLineDash([]);
        }
        if(cfg.showLabels&&coreH>4){
          var ym=y1+coreH/2;
          var hvsLbl=(z.hvsMeta&&z.hvsMeta.source==='footprint'?'HV CORE':'~HV CORE')+' L'+z.level;
          ctx.font='bold 6px monospace';ctx.textAlign='left';
          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.2).toFixed(3)+')';
          ctx.fillText(hvsLbl,xL+5,ym);
          if(cfg.labVol&&z.vol>0){
            ctx.font='6px monospace';
            ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.75).toFixed(3)+')';
            ctx.fillText(' $'+_nf(z.vol),xL+5+ctx.measureText(hvsLbl).width,ym);
          }
        }
        if(cfg.showLabels&&coreH>4){
          ctx.font='bold 6px monospace';ctx.textAlign='right';
          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';
          ctx.fillText('L'+z.level,W-rp-3,y1+coreH/2);
        }
      } else {
      var _conY=y1+boxH/2;/* concentration label y-center */
      if(!cfg.onlyNeedle){
      /* fill */
      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fillOp.toFixed(3)+')';
      ctx.fillRect(xL,y1,xR-xL,boxH);

      /* borders */
      ctx.lineWidth=z.level>=5?2.5:z.level>=3?1.5:1;
      ctx.setLineDash(z.status==='weakened'?[3,3]:[]);
      ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+strOp.toFixed(3)+')';
      ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();
      ctx.setLineDash([]);
      /* center line — dashed */
      if(boxH>3){ctx.lineWidth=0.6;ctx.setLineDash([2,3]);ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.45).toFixed(3)+')';ctx.beginPath();ctx.moveTo(xL,y1+boxH/2);ctx.lineTo(xR,y1+boxH/2);ctx.stroke();ctx.setLineDash([]);}

      /* glow for fresh L3+ recent zones */
      if(z.status==='fresh'&&z.level>=3&&recency>0.5){
        ctx.save();
        ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.55)';ctx.shadowBlur=5;
        ctx.lineWidth=1;ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.5).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();
        ctx.restore();ctx.setLineDash([]);
      }
      }/* end !onlyNeedle */

      /* ── Needle Volume Core — miolo interno de maior concentração ── */
      if((cfg.onlyNeedle||_nMode!=='off')&&z.needleHi!=null&&z.needleLo!=null){
        var ny1=sc.y(z.needleHi),ny2=sc.y(z.needleLo);
        /* clamp dentro da zona principal */
        ny1=Math.max(y1,Math.min(y2-1,ny1));
        ny2=Math.min(y2,Math.max(y1+1,ny2));
        /* altura mínima visual */
        var _nMinPx=Math.max(2,cfg.needleMinPx||2);
        if(ny2-ny1<_nMinPx){var _nc=(ny1+ny2)/2;
          ny1=Math.max(y1,_nc-_nMinPx/2);ny2=Math.min(y2,_nc+_nMinPx/2);}
        var _nH=Math.max(1,ny2-ny1);
        /* fill do miolo — opacidade alta */
        var _nFillOp=Math.min(0.98,cfg.fillOpacity*2.8);
        var _nStrOp=Math.min(0.98,cfg.borderOpacity*1.6);
        if(z.status==='weakened'){_nFillOp*=0.55;_nStrOp*=0.55;}
        else if(z.status==='tested'){_nFillOp*=0.85;_nStrOp*=0.85;}
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+_nFillOp.toFixed(3)+')';
        ctx.fillRect(xL,ny1,xR-xL,_nH);
        if(cfg.onlyNeedle)_conY=ny1+_nH/2;
        /* bordas top/bottom do miolo */
        ctx.lineWidth=1;ctx.setLineDash([]);
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+_nStrOp.toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,ny1);ctx.lineTo(xR,ny1);
        ctx.moveTo(xL,ny2);ctx.lineTo(xR,ny2);ctx.stroke();
        /* glow sutil no miolo se alta confiança */
        if(z.needleConfidence>0.5&&z.status==='fresh'){
          ctx.save();
          ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.45)';ctx.shadowBlur=4;
          ctx.lineWidth=1;
          ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(_nStrOp*0.6).toFixed(3)+')';
          ctx.beginPath();ctx.moveTo(xL,ny1);ctx.lineTo(xR,ny1);ctx.stroke();
          ctx.restore();ctx.setLineDash([]);
        }
      } else if(cfg.onlyNeedle){
        /* onlyNeedle fallback: thin mid box (needle data not available) */
        var _fbH=Math.max(3,Math.round(boxH*0.18));
        var _fbY=Math.round(y1+boxH/2-_fbH/2);
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(0.92,cfg.fillOpacity*2.2).toFixed(3)+')';
        ctx.fillRect(xL,_fbY,xR-xL,_fbH);
        ctx.lineWidth=1;ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(0.92,cfg.borderOpacity*1.4).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,_fbY);ctx.lineTo(xR,_fbY);ctx.moveTo(xL,_fbY+_fbH);ctx.lineTo(xR,_fbY+_fbH);ctx.stroke();
      }

      /* label — perfectly centred (textBaseline=middle) */
      if(cfg.showLabels){
        var ym=_conY; /* zone mid, or needle mid in onlyNeedle mode */
        ctx.font='bold 7px monospace';ctx.textAlign='left';
        var parts=['L'+z.level];
        if(cfg.labTF&&usingMTF)parts.push(tf.toUpperCase());
        if(z.hvsMeta&&z.hvsMeta.source!=='fallback')parts.push(z.hvsMeta.source==='footprint'?'HV':'~HV');
        if(cfg.needleOn&&z.needleHi!=null)parts.push(z.needleSource==='footprint'?'FP':'N');
        if(cfg.labVol&&z.vol>0)parts.push('$'+_nf(z.vol));
        var lbl=parts.join(' · ');
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.15).toFixed(3)+')';
        ctx.fillText(lbl,xL+5,ym);
        if(cfg.labSt&&boxH>8){
          var stX=xL+5+ctx.measureText(lbl).width+5;
          var st='',sc2='';
          if(z.status==='fresh'&&z.isRecent){st='NEW';sc2='rgba(0,220,110,0.92)';}
          else if(z.status==='tested'){st='TESTED';sc2='rgba(235,162,32,0.82)';}
          else if(z.status==='weakened'){st='WEAK';sc2='rgba(155,90,90,0.78)';}
          if(st){ctx.font='7px monospace';ctx.fillStyle=sc2;ctx.fillText(st,stX,ym);}
        }
      }

      /* right-edge level indicator */
      if(cfg.showLabels&&boxH>4){
        ctx.font='bold 7px monospace';ctx.textAlign='right';
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';
        ctx.fillText('L'+z.level,W-rp-3,_conY);
      }
      } /* end normal mode */
    }

    /* debug needle: contorno ciano — ativar com: window.__szDbgNeedle=true */
    if(window.__szDbgNeedle){
      for(var _dzi=0;_dzi<main.length;_dzi++){
        var _dz=main[_dzi];
        if(!cfg.needleOn||_dz.needleHi==null)continue;
        var _dy1=sc.y(_dz.needleHi),_dy2=sc.y(_dz.needleLo);
        if(_dy1>=H||_dy2<=0)continue;
        var _dxL=usingMTF?_xByTs(_dz.srcTs):Math.max(0,x(_dz.srcIdx)-bwPx*0.5);
        ctx.save();
        ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
        ctx.strokeStyle='rgba(0,220,255,0.75)';
        ctx.strokeRect(_dxL,_dy1,xR-_dxL,Math.max(2,_dy2-_dy1));
        ctx.restore();
      }
    }

    /* ══ NESTED ZONES ══ */
    if(cfg.showNested&&nested.length){
      var nop=cfg.nestOp||0.6,nSt=cfg.nestStyle||'dashed';
      var nestTFLbl=nestTF?nestTF.toUpperCase():'';
      var _nMtfMs=_tfMs(cfg.tf||S.tf),_nFirst=S.candles[0]?S.candles[0].t:0;
      for(var zi=0;zi<nested.length;zi++){
        var z=nested[zi];
        var y1=sc.y(z.hi),y2=sc.y(z.lo);
        if(y1>=H||y2<=0)continue;
        var boxH=Math.max(1,y2-y1);
        var col=cols[z.level]||cols[5];
        var lf=z.level/10;
        var fOp=cfg.fillOpacity*nop,sOp=Math.min(1,cfg.borderOpacity*nop);
        xL=_nMtfMs>0?Math.max(0,x((z.srcTs-_nFirst)/_nMtfMs)-bwPx*0.5):0;
        if(xL>=xR)continue;

        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fOp.toFixed(3)+')';
        ctx.fillRect(xL,y1,xR-xL,boxH);

        ctx.lineWidth=1;
        ctx.setLineDash(nSt==='dashed'?[2,3]:[]);
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+sOp.toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);
        if(nSt!=='thin'){ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);}
        ctx.stroke();ctx.setLineDash([]);
        /* center line — dashed */
        if(boxH>3){ctx.lineWidth=0.5;ctx.setLineDash([2,3]);ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(sOp*0.45).toFixed(3)+')';ctx.beginPath();ctx.moveTo(xL,y1+boxH/2);ctx.lineTo(xR,y1+boxH/2);ctx.stroke();ctx.setLineDash([]);}

        /* nested label — centred */
        if(cfg.showLabels&&boxH>5){
          ctx.font='7px monospace';ctx.textAlign='left';
          var nLbl='iL'+z.level+(cfg.labTF&&nestTFLbl?' · '+nestTFLbl:'');
          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,sOp*1.1).toFixed(3)+')';
          ctx.fillText(nLbl,xL+4,y1+boxH/2);
        }
      }
    }

    /* ══ SOURCE CANDLE HIGHLIGHTS (current TF only) ══ */
    if(cfg.hlOn&&!usingMTF){
      ctx.textAlign='center';
      for(var zi=0;zi<main.length;zi++){
        var z=main[zi];
        var srcs=z.srcIdxs&&z.srcIdxs.length?z.srcIdxs:[z.srcIdx];
        for(var _si=0;_si<srcs.length;_si++){
          var si=srcs[_si],isPrimary=(_si===0);
          if(si<0||si>=S.candles.length||si<V.a-2||si>V.b+2)continue;
          var c=S.candles[si];if(!c)continue;
          var col=cols[z.level]||cols[5];
          var cx=x(si),chy=sc.y(c.h),cly=sc.y(c.l);
          var isUp=c.c>=c.o;
          /* primary: full opacity; merged: 55% */
          var hlOp=cfg.sourceOpacity*(isPrimary?1.0:0.6);

          ctx.save();
          ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+','+(isPrimary?'0.55':'0.28')+')';ctx.shadowBlur=isPrimary?2:1;
          ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+hlOp.toFixed(3)+')';
          ctx.lineWidth=isPrimary?1.5:1;ctx.setLineDash([]);
          ctx.beginPath();ctx.moveTo(cx,chy);ctx.lineTo(cx,cly);ctx.stroke();
          ctx.restore();ctx.setLineDash([]);

          /* triangle above/below candle tip */
          var triY=isUp?chy-3:cly+3,triD=isUp?-1:1;
          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(hlOp*1.1).toFixed(3)+')';
          ctx.beginPath();ctx.moveTo(cx-3.5,triY);ctx.lineTo(cx+3.5,triY);ctx.lineTo(cx,triY+triD*5);ctx.closePath();ctx.fill();

          /* label: primary = S3, merged candles = ·3 */
          if(cfg.showLabels){
            var lblY=isUp?chy-10:cly+13;
            ctx.font='bold 7px monospace';
            ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,hlOp+0.15).toFixed(3)+')';
            ctx.fillText(isPrimary?'S'+z.level:'·'+z.level,cx,lblY);
          }
        }
      }
      ctx.textAlign='left';
    }

    /* reset ctx state */
    ctx.lineWidth=1;ctx.setLineDash([]);ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.shadowBlur=0;ctx.shadowColor='transparent';
  }

  /* ── Exports ── */
  window.__drawSpikeZones=drawSpikeZones;
  window.__szInvalidate=function(){_cKey='';_extC=null;_extK='';_extF=false;_extPages=[];_extEndT=0;_extRem=0;_nestC=null;_nestK='';_nestF=false;};

  /* ── Event wiring ── */
  var SZ_IDS=new Set([
    'szSens','szVolMA','szMinLevel','szMaxZones',
    'szSource','szMerge','szExpire','szMaxTests',
    'szHvsDomMin','szHvsWidth','szHvsSens',
    'szHlOn','szLabOn','szLabVol','szLabTF','szLabSt','szColMode','szTf','szExtend',
    'szNested','szNestMinLvl','szNestMax','szShowNested','szNestOp','szNestStyle',
  'szSpacingOn','szSpacingAtr','szSpacingHeight','szSpacingTicks','szSpacingMtfMult',
  'szColorL1','szColorL2','szColorL3','szColorL4','szColorL5',
  'szFillOpacity','szBorderOpacity','szSourceOpacity',
  'szOnlyNeedle','szNeedleOn','szNeedleCapture','szNeedleMinAtr','szNeedleMaxAtr','szNeedleMinPx',
  'szNeedlePreferFP','szNeedleEstimate','szShowRawGhost','szRawGhostOp','szNeedleMode',
  'szHistoryDays',
  'szProxOn','szProxDist','szProxColor'
  ]);
  function _szRd(){_cKey='';if(typeof drawSoon==='function')drawSoon();}

  document.addEventListener('input',function(ev){
    if(!SZ_IDS.has(ev.target&&ev.target.id))return;
    _szRd();
  });
  document.addEventListener('change',function(ev){
    var id=ev.target&&ev.target.id;
    if(!SZ_IDS.has(id))return;
    if(id==='szTf'||id==='szHistoryDays'){_extC=null;_extK='';_extF=false;_extPages=[];_extEndT=0;_extRem=0;}
    if(id==='szNested'||id==='szNestMinLvl'||id==='szNestMax'){_nestC=null;_nestK='';_nestF=false;}
    _szRd();
  });

  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);

})();