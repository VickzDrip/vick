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
    {r:75, g:100,b:158},  /* L1 steel blue  */
    {r:10, g:185,b:215},  /* L2 cyan        */
    {r:0,  g:205,b:172},  /* L3 teal        */
    {r:235,g:162,b:32},   /* L4 golden      */
    {r:205,g:50, b:205}   /* L5 magenta     */
  ];

  /* ── State ── */
  var _cache=null,_cKey='';
  var _extC=null,_extK='',_extF=false;    /* main TF candles   */
  var _nestC=null,_nestK='',_nestF=false; /* nested TF candles */

  /* ── Config ── */
  function _cfg(){
    return{
      minLevel:  clp(parseInt(sv('szMinLevel','3'))||3,1,5),
      sens:      clp(nv('szSens',1.0),0.3,5),
      maxZones:  clp(parseInt(sv('szMaxZones','50'))||50,5,1000),
      source:    sv('szSource','body'),
      volMA:     clp(parseInt(sv('szVolMA','20'))||20,3,200),
      mergeDist: clp(nv('szMerge',0.15),0,2),
      expire:    clp(parseInt(sv('szExpire','250'))||0,0,2000),
      maxTests:  clp(parseInt(sv('szMaxTests','3'))||3,1,20),
      hlOn:      bv('szHlOn',true),
      labOn:     bv('szLabOn',true),
      labVol:    bv('szLabVol',true),
      labTF:     bv('szLabTF',true),
      labSt:     bv('szLabSt',true),
      colMode:   sv('szColMode','hybrid'),
      tf:        sv('szTf',''),
      extend:    clp(nv('szExtend',20),0,200),
      nested:    sv('szNested',''),
      nestMinLvl:clp(parseInt(sv('szNestMinLvl','3'))||3,1,5),
      nestMax:   clp(parseInt(sv('szNestMax','5'))||5,1,20),
      showNested:bv('szShowNested',true),
      nestOp:    clp(nv('szNestOp',0.6),0.1,1),
      nestStyle: sv('szNestStyle','dashed'),
      hvsDomMin: clp(parseFloat(sv('szHvsDomMin','0.30'))||0.30,0.10,0.80),
      hvsWidth:  sv('szHvsWidth','auto'),
      hvsSens:   sv('szHvsSens','medium')
    };
  }

  /* ── Candle getters ── */
  var _API='https://api.binance.com';
  function _kl(x){return{t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()};}

  function _getCandles(){
    var tf=sv('szTf','');
    if(!tf||tf===window.S.tf)return window.S.candles;
    var wk=S.sym+'|'+tf;
    if(_extK===wk&&_extC)return _extC;
    if(!_extF||_extK!==wk){
      _extF=true;_extK=wk;_extC=null;
      fetch(_API+'/api/v3/klines?symbol='+S.sym+'&interval='+tf+'&limit=1000')
        .then(function(r){return r.ok?r.json():Promise.reject();})
        .then(function(d){if(_extK!==wk)return;_extC=d.map(_kl);_extF=false;_cKey='';if(typeof drawSoon==='function')drawSoon();})
        .catch(function(){_extF=false;});
    }
    return window.S.candles;
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
    /* Heuristic estimation when no footprint */
    var range=c.h-c.l;if(range<1e-12)return null;
    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),bR=bHi-bLo;
    var uw=c.h-bHi,lw=bLo-c.l;
    var bPct=bR/range,uwPct=uw/range,lwPct=lw/range;
    var sens=cfg.hvsSens||'medium';
    var wickCapture=sens==='high'?0.42:sens==='low'?0.68:0.54;
    var loc,hi,lo,poc;
    if(bPct>0.40){
      loc='body';poc=c.c;
      var hw=Math.max(bR*0.55,at*0.04);
      hi=Math.min(c.h,poc+hw);lo=Math.max(c.l,poc-hw);
    }else if(uwPct>lwPct&&uwPct>0.28){
      loc='upperWick';hi=c.h;lo=c.h-uw*wickCapture;poc=(hi+lo)/2;
    }else if(lwPct>uwPct&&lwPct>0.28){
      loc='lowerWick';lo=c.l;hi=c.l+lw*wickCapture;poc=(hi+lo)/2;
    }else{
      loc='body';hi=bHi;lo=bLo;poc=(hi+lo)/2;
      if(hi<=lo){hi=poc+at*0.08;lo=poc-at*0.08;}
    }
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
      var level=ex>=6.0*s?5:ex>=4.5*s?4:ex>=3.0*s?3:ex>=1.5*s?2:1;
      if(level<minLvl)continue;
      var dir=c.c>c.o?'bull':c.c<c.o?'bear':'neutral';
      var hi,lo,hvsMeta=null;
      if(cfg.source==='body'){hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);}
      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h;lo=Math.max(c.o,c.c);}else{hi=Math.min(c.o,c.c);lo=c.l;}}
      else if(cfg.source==='hvs'){
        var _hvs=_computeHVS(c,at,cfg);
        if(_hvs&&_hvs.volPct>=cfg.hvsDomMin){hi=_hvs.hi;lo=_hvs.lo;hvsMeta=_hvs;}
        else{hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);hvsMeta={pocPrice:(c.o+c.c)/2,location:'body',source:'fallback',volPct:0};}
      }
      else{hi=c.h;lo=c.l;}
      if(hi<=lo)lo=hi-at*0.01;
      /* cap zone height at 1.5×ATR — prevents absurdly large zones from spike candles */
      if(at>0&&(hi-lo)>at*1.5){var _zm=(Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;hi=_zm+at*0.75;lo=_zm-at*0.75;}
      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:ex,hi:hi,lo:lo,mid:(hi+lo)/2,dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta});
    }
    if(!candidates.length)return[];

    /* sort newest first for merge priority */
    candidates.sort(function(a,b){return b.srcIdx-a.srcIdx;});

    /* merge overlapping/nearby */
    var used=new Uint8Array(candidates.length),merged=[];
    for(var i=0;i<candidates.length;i++){
      if(used[i])continue;
      var z=Object.assign({},candidates[i]);
      z.srcIdxs=[z.srcIdx]; /* track all merged source candles */
      var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);
      for(var j=i+1;j<candidates.length;j++){
        if(used[j])continue;
        var z2=candidates[j];
        if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){
          used[j]=1;
          z.srcIdxs.push(z2.srcIdx);
          if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}
          z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;z.vol=Math.max(z.vol,z2.vol);
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

  /* ── Main compute ── */
  function _computeAll(cs,cfg,nestCs){
    var base=0;
    var sl=cs; /* scan full history — no maxScan limit */
    var main=_detectAndBuild(sl,base,cs,cfg,false);
    var nested=[];
    if(nestCs&&nestCs.length>=2&&cfg.nested&&main.length){
      var mainTfMs=_tfMs(cfg.tf||S.tf);
      nested=_computeNested(main,nestCs,mainTfMs,cfg);
    }
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
            nestCs?nestCs.length:0].join('|');

    if(_cKey!==ck){
      _cache=_computeAll(cs,cfg,nestCs);_cKey=ck;
      if(window.S)window.S.spikeZones=_cache.main;
    }

    var main=(_cache&&_cache.main)||[];
    var nested=(_cache&&_cache.nested)||[];
    if(!main.length&&!nested.length)return;

    var rp=typeof RP==='function'?RP():68;
    var xL=0,bwPx=typeof bw==='number'?bw:4;
    var xR=W-rp+Math.min(cfg.extend*bwPx,80);
    var usingMTF=cfg.tf&&cfg.tf!==S.tf;
    var expBound=cfg.expire>0?cfg.expire:250;

    ctx.textBaseline='middle'; /* ensures vertical centering for all text */

    /* ══ MAIN ZONES ══ */
    for(var zi=0;zi<main.length;zi++){
      var z=main[zi];
      var y1=sc.y(z.hi),y2=sc.y(z.lo);
      if(y1>=H||y2<=0)continue;
      var boxH=Math.max(1,y2-y1);
      var col=COL[z.level]||COL[5];
      var recency=Math.max(0,1-(z.age/expBound));
      var lf=z.level/5;
      xL=Math.max(0,x(z.srcIdx)-bwPx*0.5); /* start at source candle, never extend left */
      if(xL>=xR)continue; /* source candle is off-screen to the right */

      /* ── opacity by mode (stronger than v0.132) ── */
      var fillOp,strOp;
      if(cfg.colMode==='level'){
        fillOp=0.06+0.11*lf;
        strOp=Math.min(0.88,0.32+0.45*lf);
      }else if(cfg.colMode==='recency'){
        fillOp=0.03+0.15*recency;
        strOp=Math.min(0.88,0.16+0.68*recency);
      }else{
        fillOp=0.045+0.065*lf+0.075*recency;
        strOp=Math.min(0.84,0.28+0.32*lf+0.26*recency);
      }
      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}
      else if(z.status==='tested'){fillOp*=0.76;strOp*=0.76;}

      /* fill */
      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fillOp.toFixed(3)+')';
      ctx.fillRect(xL,y1,xR-xL,boxH);

      /* borders */
      ctx.lineWidth=z.level>=4?1.5:1;
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

      /* label — perfectly centred (textBaseline=middle) */
      if(cfg.labOn){
        var ym=y1+boxH/2; /* exact vertical centre */
        ctx.font='bold 7px monospace';ctx.textAlign='left';
        var parts=['L'+z.level];
        if(cfg.labTF&&usingMTF)parts.push(tf.toUpperCase());
        if(z.hvsMeta&&z.hvsMeta.source!=='fallback')parts.push(z.hvsMeta.source==='footprint'?'HV':'~HV');
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
      if(boxH>4){
        ctx.font='bold 7px monospace';ctx.textAlign='right';
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';
        ctx.fillText('L'+z.level,W-rp-3,y1+boxH/2);
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
        var col=COL[z.level]||COL[5];
        var lf=z.level/5;
        var fOp=nop*(0.02+0.04*lf),sOp=nop*(0.22+0.32*lf);
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
        if(cfg.labOn&&boxH>5){
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
          var col=COL[z.level]||COL[5];
          var cx=x(si),chy=sc.y(c.h),cly=sc.y(c.l);
          var isUp=c.c>=c.o;
          /* primary: full opacity; merged: 55% */
          var hlOp=isPrimary?0.32+0.45*(z.level/5):0.20+0.28*(z.level/5);

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
          var lblY=isUp?chy-10:cly+13;
          ctx.font='bold 7px monospace';
          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,hlOp+0.15).toFixed(3)+')';
          ctx.fillText(isPrimary?'S'+z.level:'·'+z.level,cx,lblY);
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
  window.__szInvalidate=function(){_cKey='';_extC=null;_extK='';_extF=false;_nestC=null;_nestK='';_nestF=false;};

  /* ── Event wiring ── */
  var SZ_IDS=new Set([
    'szSens','szVolMA','szMinLevel','szMaxZones',
    'szSource','szMerge','szExpire','szMaxTests',
    'szHvsDomMin','szHvsWidth','szHvsSens',
    'szHlOn','szLabOn','szLabVol','szLabTF','szLabSt','szColMode','szTf','szExtend',
    'szNested','szNestMinLvl','szNestMax','szShowNested','szNestOp','szNestStyle'
  ]);
  function _szRd(){_cKey='';if(typeof drawSoon==='function')drawSoon();}

  document.addEventListener('input',function(ev){
    if(!SZ_IDS.has(ev.target&&ev.target.id))return;
    _szRd();
  });
  document.addEventListener('change',function(ev){
    var id=ev.target&&ev.target.id;
    if(!SZ_IDS.has(id))return;
    if(id==='szTf'){_extC=null;_extK='';_extF=false;}
    if(id==='szNested'||id==='szNestMinLvl'||id==='szNestMax'){_nestC=null;_nestK='';_nestF=false;}
    _szRd();
  });

  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);

})();
