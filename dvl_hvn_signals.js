/* HVN Signals — Beta 0.312
   Pure chart-overlay indicator: detects LONG/SHORT when a candle wick touches an
   HVN zone then the candle closes back out (rejection). No oscillator, no panel,
   no histogram — only LONG/SHORT labels drawn directly on the main chart canvas.

   Signal rules:
     SHORT: upper wick >= zone.lo  AND  close < zone.lo + tolerance  (resistance rejection)
     LONG:  lower wick <= zone.hi  AND  close > zone.hi - tolerance  (support rejection)
   Lateral: N+ candles with body overlapping zone → next rejection also fires a signal. */
(function(){
  'use strict';

  /* ── Config ──────────────────────────────────────────────────────────────── */
  function _cfg(){
    var g=function(id){return document.getElementById(id);};
    var labelSizeMap={small:8,medium:10,large:12};
    var lsKey=g('hvnSigLabelSize')?.value||'medium';
    return {
      showLong  : g('hvnSigShowLong')?.checked !== false,
      showShort : g('hvnSigShowShort')?.checked !== false,
      sens      : Math.max(0,Math.min(50,parseFloat(g('hvnSigSens')?.value)||20))/100,
      minWickPct: Math.max(0,Math.min(80,parseFloat(g('hvnSigMinWick')?.value)||25))/100,
      cooldown  : Math.max(1,parseInt(g('hvnSigCooldown')?.value)||5),
      allowLat  : g('hvnSigAllowLateral')?.checked !== false,
      lateralMax: Math.max(1,parseInt(g('hvnSigLateral')?.value)||5),
      labelFs   : labelSizeMap[lsKey]||10,
      labelStyle: g('hvnSigLabelStyle')?.value||'both',
      longColor : g('hvnSigLongColor')?.value||'#00d2c8',
      shortColor: g('hvnSigShortColor')?.value||'#ff4a64',
      sl        : g('hvnSigSL')?.value||'wick',
      tp        : g('hvnSigTP')?.value||'hvn',
      tf        : g('hvnSigTF')?.value||'5m',
      volSpike  : g('hvnSigVolSpike')?.value||'off',
      mode      : g('hvnSigMode')?.value||'wick',
      diveMin   : Math.max(1,parseInt(g('hvnSigDiveMin')?.value)||2),
      minAtrHvn : Math.max(0,parseFloat(g('hvnSigMinAtr')?.value)||0),
    };
  }

  /* ── Signal computation ───────────────────────────────────────────────────── */
  var _hvnMTFZoneCache={};

  function _getZonesForTF(cfg){
    var chartTf=(window.S&&window.S.tf)||'5m';
    var hvnTf=cfg.tf||chartTf;
    if(hvnTf===chartTf) return window.__hvnZones?.()||[];
    var sym=(window.S&&window.S.sym)||'BTCUSDT';
    var mtfKey=sym+'|'+hvnTf;
    var mtfEntry=window.__mtfCandleCache&&window.__mtfCandleCache.get(mtfKey);
    if(mtfEntry&&mtfEntry.candles&&mtfEntry.candles.length>10){
      var ck=mtfKey+'|'+mtfEntry.candles.length+'|'+mtfEntry.ts;
      if(!_hvnMTFZoneCache[mtfKey]||_hvnMTFZoneCache[mtfKey].k!==ck){
        var zz=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(mtfEntry.candles):[];
        _hvnMTFZoneCache[mtfKey]={zones:zz,k:ck};
      }
      return _hvnMTFZoneCache[mtfKey].zones;
    }
    /* async fetch — first call loads data, returns current zones as fallback */
    if(typeof fetchKlinesForTF==='function'&&!window.__hvnMTFFetching){
      window.__hvnMTFFetching=true;
      fetchKlinesForTF(sym,hvnTf,500).then(function(cs){
        if(!window.__mtfCandleCache)window.__mtfCandleCache=new Map();
        window.__mtfCandleCache.set(mtfKey,{candles:cs,ts:Date.now(),sym:sym,tf:hvnTf});
        window.__hvnMTFFetching=false;
        if(typeof drawSoon==='function')drawSoon();
      }).catch(function(){window.__hvnMTFFetching=false;});
    }
    return window.__hvnZones?.()||[];
  }

  function computeHVNSignals(){
    if(!window.S||!S.inds||!S.inds.hvnSignals){if(window.S)S.hvnSignals=[];return;}
    var cs=S.candles;
    if(!cs||cs.length<4){S.hvnSignals=[];return;}
    var cfg=_cfg();
    var zones=_getZonesForTF(cfg);
    if(!zones.length){S.hvnSignals=[];return;}

    var n=cs.length;
    // signals[i] = null | { type:'long'|'short', kind:'rejection'|'lateral', zone, wickPct }
    var signals=new Array(n).fill(null);

    /* rolling 20-candle vol avg, excl. current candle — used for spike filter */
    var _volAvg=new Float32Array(n);
    if(cfg.volSpike&&cfg.volSpike!=='off'){
      var _vsSum=0;
      for(var vi=0;vi<n;vi++){
        _volAvg[vi]=vi>0?_vsSum/Math.min(vi,20):0;
        _vsSum+=(cs[vi].v||0);
        if(vi>=20)_vsSum-=(cs[vi-20].v||0);
      }
    }

    /* ATR-14 for minAtrHvn filter */
    var _atr14=new Float32Array(n);
    if(cfg.minAtrHvn>0){
      var _atrSum=0;
      for(var _ai=0;_ai<n;_ai++){
        var _ca=cs[_ai],_pc=_ai>0?cs[_ai-1].c:_ca.o;
        var _tr=Math.max(_ca.h-_ca.l,Math.abs(_ca.h-_pc),Math.abs(_ca.l-_pc));
        _atrSum+=_tr;
        if(_ai>=14){var _oa=cs[_ai-14],_op=_ai>14?cs[_ai-15].c:_oa.o;
          _atrSum-=Math.max(_oa.h-_oa.l,Math.abs(_oa.h-_op),Math.abs(_oa.l-_op));}
        _atr14[_ai]=_atrSum/Math.min(_ai+1,14);
      }
    }

    var doWick=(cfg.mode==='wick'||cfg.mode==='all');
    var doDive=(cfg.mode==='dive'||cfg.mode==='all');
    var doEngulf=(cfg.mode==='engulf'||cfg.mode==='all');

    for(var zi=0;zi<zones.length;zi++){
      var z=zones[zi];
      var zSize=z.hi-z.lo;
      if(zSize<=0)continue;

      var tol=zSize*cfg.sens;          // how far inside the zone the close may be
      var lateralCount=0;
      var lastSignalIdx=-999;

      for(var i=0;i<n;i++){
        var c=cs[i];
        var bodyLo=Math.min(c.o,c.c);
        var bodyHi=Math.max(c.o,c.c);
        var candleRange=c.h-c.l;
        if(candleRange<=0){lateralCount=0;continue;}

        var bodyInZone=(bodyHi>=z.lo&&bodyLo<=z.hi);

        if(bodyInZone){
          // Body is inside zone — count as lateral candle
          lateralCount++;
          continue;
        }

        var coolOK=(i-lastSignalIdx>=cfg.cooldown);
        var latOK=(cfg.allowLat||lateralCount===0);
        var volOK=(cfg.volSpike==='off'||!cfg.volSpike||_volAvg[i]<=0||(c.v||0)>=parseFloat(cfg.volSpike)*_volAvg[i]);
        var atrOK=(cfg.minAtrHvn<=0||candleRange>=cfg.minAtrHvn*_atr14[i]);

        // ── WICK REJECTION ────────────────────────────────────────────────────
        if(doWick){
          if(cfg.showShort&&c.h>=z.lo&&c.c<z.lo+tol&&bodyLo<z.lo){
            var upperWick=c.h-Math.max(c.o,c.c);
            var wickPct=upperWick/candleRange;
            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK&&atrOK){
              var isLat=(lateralCount>=1);
              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){
                signals[i]={type:'short',kind:isLat?'lateral':'rejection',
                            zone:z,wickPct:wickPct,_strength:wickPct};
              }
              lastSignalIdx=i;
            }
          } else if(cfg.showLong&&c.l<=z.hi&&c.c>z.hi-tol&&bodyHi>z.hi){
            var lowerWick=Math.min(c.o,c.c)-c.l;
            var wickPct=lowerWick/candleRange;
            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK&&atrOK){
              var isLat=(lateralCount>=1);
              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){
                signals[i]={type:'long',kind:isLat?'lateral':'rejection',
                            zone:z,wickPct:wickPct,_strength:wickPct};
              }
              lastSignalIdx=i;
            }
          }
        }

        // ── DIVE & RECOVER: N candles inside zone, then close back outside ────
        if(doDive&&lateralCount>=cfg.diveMin&&coolOK&&volOK&&atrOK){
          if(cfg.showLong&&bodyLo>=z.hi&&c.c>c.o){ // exits zone upward, bullish body
            var _ds=(c.c-c.o)/(c.h-c.l||1);
            if(!signals[i]||signals[i]._strength<_ds){
              signals[i]={type:'long',subtype:'recover',zone:z,_strength:_ds};
              lastSignalIdx=i;
            }
          }
          if(cfg.showShort&&bodyHi<=z.lo&&c.c<c.o){ // exits zone downward, bearish body
            var _ds=(c.o-c.c)/(c.h-c.l||1);
            if(!signals[i]||signals[i]._strength<_ds){
              signals[i]={type:'short',subtype:'recover',zone:z,_strength:_ds};
              lastSignalIdx=i;
            }
          }
        }

        // ── ENGOLFING NA ZONA: prev body in zone, curr engolfs prev ───────
        if(doEngulf&&i>0&&coolOK&&volOK&&atrOK){
          var _pv=cs[i-1];
          var _pvLo=Math.min(_pv.o,_pv.c),_pvHi=Math.max(_pv.o,_pv.c);
          if(_pvHi>=z.lo&&_pvLo<=z.hi){ // previous candle was in zone
            if(cfg.showLong&&c.c>c.o&&_pv.c<_pv.o&&c.o<=_pv.c&&c.c>=_pv.o){ // bull engulf
              var _ds=(c.c-c.o)/(_pvHi-_pvLo||1);
              if(!signals[i]||signals[i]._strength<_ds){
                signals[i]={type:'long',subtype:'engulf',zone:z,_strength:_ds};
                lastSignalIdx=i;
              }
            }
            if(cfg.showShort&&c.c<c.o&&_pv.c>_pv.o&&c.o>=_pv.c&&c.c<=_pv.o){ // bear engulf
              var _ds=(c.o-c.c)/(_pvHi-_pvLo||1);
              if(!signals[i]||signals[i]._strength<_ds){
                signals[i]={type:'short',subtype:'engulf',zone:z,_strength:_ds};
                lastSignalIdx=i;
              }
            }
          }
        }

        lateralCount=0;
      }
    }

    /* enrich signals with fields required by _backtestReal */
    for(var _si=0;_si<n;_si++){
      var _sg=signals[_si];if(!_sg)continue;
      var _sc=cs[_si];
      _sg.side=_sg.type==='long'?'LONG':'SHORT';
      _sg.timestamp=_sc.t;
      _sg.entryPrice=_sc.c;
      _sg.candle=_sc;
      _sg.hvnZone=_sg.zone;
      var _rt;
      if(_sg.subtype==='recover'){_rt='Dive & Recover';}
      else if(_sg.subtype==='engulf'){_rt='Engolfing';}
      else if(_sg.kind==='lateral'){_rt=(_sg.type==='long')?'Lateral zone support rejection':'Lateral zone resistance rejection';}
      else{_rt=(_sg.type==='long')?'Support rejection':'Resistance rejection';}
      _sg.rejectionType=_rt;
      _sg.id='sig_'+_sc.t+'_'+_sg.type.charAt(0);
      _sg.idx=_si;
      if(_sg.zone&&!_sg.zone.price)_sg.zone.price=(_sg.zone.lo+_sg.zone.hi)/2;
      var _isL=_sg.type==='long',_nz=null,_nzD=Infinity;
      for(var _zj=0;_zj<zones.length;_zj++){
        var _z=zones[_zj];
        if(_isL&&_z.lo>_sg.zone.hi){var _zd=_z.lo-_sg.zone.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}
        else if(!_isL&&_z.hi<_sg.zone.lo){var _zd=_sg.zone.lo-_z.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}
      }
      _sg.nextHvnZone=_nz;
      if(_nz&&!_nz.price)_nz.price=(_nz.lo+_nz.hi)/2;
    }
    S.hvnSignals=signals;
    /* notify Strategy Tester */
    try{if(window._dvlST&&typeof window._dvlST.updateSigStatus==='function')window._dvlST.updateSigStatus();}catch(_){}
  }

  /* ── Rounded-rect helper ─────────────────────────────────────────────────── */
  function _rr(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  /* ── Draw one signal ─────────────────────────────────────────────────────── */
  function _drawSignal(ctx,sig,c,cx,sc,W,H,cfg,PB){
    var PT=8;
    var isLong=(sig.type==='long');
    var _sub=sig.subtype||'wick';
    /* color palette per subtype */
    var bc,glowC,fillC,textC,label;
    if(_sub==='recover'){
      bc=isLong?'#00e5a0':'#ff8c42';
      glowC=isLong?'rgba(0,229,160,.38)':'rgba(255,140,66,.38)';
      fillC=isLong?'rgba(0,60,40,.60)':'rgba(80,30,0,.60)';
      textC=isLong?'rgba(0,240,168,.97)':'rgba(255,152,80,.97)';
      label=isLong?'↑ RECOVER':'↓ RECOVER';
    } else if(_sub==='engulf'){
      bc=isLong?'#60c0ff':'#d966ff';
      glowC=isLong?'rgba(96,192,255,.38)':'rgba(217,102,255,.38)';
      fillC=isLong?'rgba(10,40,80,.60)':'rgba(50,0,80,.60)';
      textC=isLong?'rgba(130,210,255,.97)':'rgba(230,140,255,.97)';
      label=isLong?'↑ ENGULF':'↓ ENGULF';
    } else {
      bc=isLong?cfg.longColor:cfg.shortColor;
      glowC=isLong?'rgba(0,200,190,.4)':'rgba(255,50,80,.4)';
      fillC=isLong?'rgba(0,50,46,.58)':'rgba(76,10,22,.58)';
      textC=isLong?'rgba(0,255,230,.97)':'rgba(255,100,118,.97)';
      label=isLong?'LONG':'SHORT';
    }
    var csf=window.innerWidth>900?1.35:1.0;
    var fs=Math.round(cfg.labelFs*csf);
    var showLabel=(cfg.labelStyle==='label'||cfg.labelStyle==='both');
    var showArrow=(cfg.labelStyle==='arrow'||cfg.labelStyle==='both');

    ctx.font='bold '+fs+'px monospace';
    var tW=ctx.measureText(label).width;
    var lW=showLabel?Math.ceil(tW)+16:0;
    var lH=showLabel?Math.round(fs*1.9):0;
    var rad=4;
    var tSz=Math.round(4*csf);  // triangle half-base
    var triH=Math.round(5*csf); // triangle height
    var gap=3;
    var space=2;

    if(isLong){
      var anchorY=sc.y(c.l);
      var triTipY=anchorY+gap;
      var triBaseY=triTipY+triH;
      var lY=showLabel?triBaseY+space:triTipY;
      if(showLabel&&lY+lH>H-PB-2)return;
      if(!showLabel&&triTipY+triH>H-PB-2)return;
      var lX=cx-lW/2;

      ctx.shadowColor=glowC;ctx.shadowBlur=7;
      if(showArrow){
        ctx.fillStyle=bc;
        ctx.beginPath();
        ctx.moveTo(cx,triTipY);ctx.lineTo(cx-tSz,triBaseY);ctx.lineTo(cx+tSz,triBaseY);
        ctx.closePath();ctx.fill();
      }
      ctx.shadowBlur=0;
      if(showLabel){
        _rr(ctx,lX,lY,lW,lH,rad);
        ctx.fillStyle=fillC;ctx.fill();
        ctx.strokeStyle=bc;ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=textC;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(label,cx,lY+lH/2);
      }

    } else {
      var anchorY=sc.y(c.h);
      var triTipY=anchorY-gap;
      var triBaseY=triTipY-triH;
      var lY=showLabel?triBaseY-space-lH:triBaseY-triH;
      if(showLabel&&lY<PT+2)return;
      if(!showLabel&&triTipY-triH<PT+2)return;
      var lX=cx-lW/2;

      ctx.shadowColor=glowC;ctx.shadowBlur=7;
      if(showArrow){
        ctx.fillStyle=bc;
        ctx.beginPath();
        ctx.moveTo(cx,triTipY);ctx.lineTo(cx-tSz,triBaseY);ctx.lineTo(cx+tSz,triBaseY);
        ctx.closePath();ctx.fill();
      }
      ctx.shadowBlur=0;
      if(showLabel){
        _rr(ctx,lX,lY,lW,lH,rad);
        ctx.fillStyle=fillC;ctx.fill();
        ctx.strokeStyle=bc;ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=textC;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(label,cx,lY+lH/2);
      }
    }
    ctx.shadowBlur=0;
  }

  /* ── Chart overlay draw ──────────────────────────────────────────────────── */
  function _computeSLTP(sig,c,cfg,zones){
    var isLong=(sig.type==='long');
    var entry=c.c;
    var sl;
    var slMode=cfg.sl||'wick';
    if(slMode==='wick'){sl=isLong?c.l:c.h;}
    else if(slMode==='hvn'){sl=isLong?sig.zone.lo:sig.zone.hi;}
    else{var zs=sig.zone.hi-sig.zone.lo;sl=isLong?entry-zs*1.5:entry+zs*1.5;}
    var risk=Math.abs(entry-sl)||entry*0.002;
    var tp;
    var tpMode=cfg.tp||'hvn';
    if(tpMode==='1r'){tp=isLong?entry+risk:entry-risk;}
    else if(tpMode==='1.5r'){tp=isLong?entry+risk*1.5:entry-risk*1.5;}
    else if(tpMode==='2r'){tp=isLong?entry+risk*2:entry-risk*2;}
    else{
      var nearest=null;
      for(var zi=0;zi<zones.length;zi++){
        var z=zones[zi];var zm=(z.lo+z.hi)/2;
        if(isLong&&zm>entry&&(nearest===null||zm<nearest))nearest=zm;
        else if(!isLong&&zm<entry&&(nearest===null||zm>nearest))nearest=zm;
      }
      tp=nearest!==null?nearest:(isLong?entry+risk:entry-risk);
    }
    return{sl:sl,tp:tp};
  }

  function drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw){
    if(!window.S||!S.inds.hvnSignals||!S.candles.length)return;
    var signals=S.hvnSignals;
    if(!signals||!signals.length)return;
    var cfg=_cfg();
    var rp=window.RP?window.RP():68;
    var right=W-rp;
    var PB=window._dvlLastPB||10;
    var allCandles=S.candles;
    ctx.save();
    ctx.beginPath();ctx.rect(0,8,right,H-8-PB);ctx.clip();

    /* SL/TP dashed lines — drawn first so labels appear on top */
    var _zones=window.__hvnZones?(window.__hvnZones()||[]):[];
    ctx.lineWidth=0.85;
    for(var ii=V.a;ii<=V.b&&ii<signals.length;ii++){
      var sig=signals[ii];if(!sig)continue;
      var c=allCandles[ii];if(!c)continue;
      var sx0=x(ii);
      if(sx0<-200||sx0>right+40)continue;
      var sltp=_computeSLTP(sig,c,cfg,_zones);
      var isLong=(sig.type==='long');
      var endIdx=Math.min(ii+40,allCandles.length-1);
      for(var jj=ii+1;jj<=endIdx;jj++){
        var cj=allCandles[jj];if(!cj)break;
        if(isLong){if(cj.l<=sltp.sl||cj.h>=sltp.tp){endIdx=jj;break;}}
        else{if(cj.h>=sltp.sl||cj.l<=sltp.tp){endIdx=jj;break;}}
      }
      var lx=Math.max(sx0-bw*0.4,0);
      var rx=Math.min(x(endIdx)+bw*0.4,right);
      if(rx<=lx)continue;
      ctx.setLineDash([3,5]);
      var slY=sc.y(sltp.sl);
      ctx.strokeStyle='rgba(255,70,90,0.42)';
      ctx.beginPath();ctx.moveTo(lx,slY);ctx.lineTo(rx,slY);ctx.stroke();
      var tpY=sc.y(sltp.tp);
      ctx.strokeStyle='rgba(0,210,140,0.38)';
      ctx.beginPath();ctx.moveTo(lx,tpY);ctx.lineTo(rx,tpY);ctx.stroke();
    }
    ctx.setLineDash([]);ctx.lineWidth=1;

    /* signal labels */
    for(var i=V.a;i<=V.b&&i<signals.length;i++){
      var sig=signals[i];if(!sig)continue;
      var c=allCandles[i];if(!c)continue;
      var cx=x(i);
      if(cx<-40||cx>right+40)continue;
      _drawSignal(ctx,sig,c,cx,sc,W,H,cfg,PB);
    }
    ctx.restore();
  }

  /* ── Exports ─────────────────────────────────────────────────────────────── */
  window.__computeHVNSignals     = computeHVNSignals;
  window.__drawHVNSignalsOverlay = drawHVNSignalsOverlay;

  /* ── Redraw on settings change ───────────────────────────────────────────── */
  ['hvnSigShowLong','hvnSigShowShort','hvnSigSens','hvnSigMinWick','hvnSigCooldown',
   'hvnSigAllowLateral','hvnSigLateral','hvnSigLabelSize','hvnSigLabelStyle',
   'hvnSigLongColor','hvnSigShortColor','hvnSigClarity','hvnSigFlow',
   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF','hvnSigVolSpike','hvnSigMode','hvnSigDiveMin'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('input',function(){if(typeof drawSoon==='function')drawSoon();});
    if(el)el.addEventListener('change',function(){
      /* when zone TF changes, reset MTF fetch flag so new fetch runs */
      if(id==='hvnSigTF')window.__hvnMTFFetching=false;
      if(typeof drawSoon==='function')drawSoon();
    });
  });

})();