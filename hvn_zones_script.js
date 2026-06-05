(function(){
  function E(id){return document.getElementById(id)}
  function nFmt(v){
    v=Number(v)||0;const a=Math.abs(v);const s=v<0?'-':'';
    if(a>=1e9)return s+(a/1e9).toFixed(2)+'B';
    if(a>=1e6)return s+(a/1e6).toFixed(1)+'M';
    if(a>=1e3)return s+(a/1e3).toFixed(0)+'K';
    return s+Math.round(a);
  }
  function priceFmt(v){return v>=1000?v.toLocaleString('en-US',{maximumFractionDigits:0}):v.toFixed(2);}
  function numVal(id,def){const n=E(id);if(!n)return def;const v=parseFloat(n.value);return Number.isFinite(v)?v:def;}

  function getSettings(cs){
    var bktPct=Math.max(0.01,numVal('vzBucket',0.1));
    var bktAtr=Math.max(0,numVal('vzBucketAtr',0));
    if(bktAtr>0&&cs&&cs.length>=14){
      var _atrs=calcATR(cs,14);var _lastAtr=_atrs.filter(function(v){return v!=null;}).at(-1)||0;
      var _lastP=cs.at(-1).c||0;
      if(_lastAtr>0&&_lastP>0)bktPct=Math.max(0.01,_lastAtr*bktAtr/_lastP*100);
    }
    return{
      bucketPct:bktPct,
      topN:Math.max(1,Math.min(30,numVal('vzTopN',12))),
      minTouch:Math.max(1,Math.round(numVal('vzMinTouch',2))),
      mergeGap:Math.max(0,Math.round(numVal('vzMerge',0))),
      extend:Math.max(0,Math.round(numVal('vzExtend',20))),
      color:E('vzColor')?.value||'#f59e0b',
      bucketAtr:bktAtr
    };
  }

  function hexToRgb(hex){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return{r,g,b};
  }

  let _vzCache=null, _vzCacheKey='';

  // ── Multi-TF candle fetch ──
  let _vzExtCandles=null, _vzExtKey='', _vzExtFetching=false;

  function getVZCandles(){
    const sel=E('vzTf');
    const vzTf=sel?sel.value:'';
    if(!vzTf||vzTf===S.tf) return S.candles;
    const wantKey=`${S.sym}|${vzTf}`;
    if(_vzExtKey===wantKey&&_vzExtCandles) return _vzExtCandles;
    if(!_vzExtFetching||_vzExtKey!==wantKey){
      _vzExtFetching=true; _vzExtKey=wantKey; _vzExtCandles=null;
      fetch(`${API}/api/v3/klines?symbol=${S.sym}&interval=${vzTf}&limit=1000`)
        .then(r=>r.ok?r.json():Promise.reject(r.status))
        .then(d=>{
          if(_vzExtKey!==wantKey) return;
          _vzExtCandles=d.map(klineToCandle);
          _vzExtFetching=false; _vzCacheKey='';
          if(typeof drawSoon==='function') drawSoon();
        })
        .catch(e=>{_vzExtFetching=false;console.warn('HVN TF fetch:',e);});
    }
    return S.candles;
  }

  // ── HVN bucket computation ──
  function computeHVN(cs,bucketPct,topN,minTouch,mergeGap){
    if(cs.length<2) return[];
    const lastPrice=cs[cs.length-1].c;
    const bucketSize=lastPrice*bucketPct/100;
    if(bucketSize<=0) return[];
    let priceMin=Infinity,priceMax=-Infinity;
    for(const c of cs){if(c.l<priceMin)priceMin=c.l;if(c.h>priceMax)priceMax=c.h;}
    const nBuckets=Math.min(8000,Math.ceil((priceMax-priceMin)/bucketSize)+1);
    const vols=new Float64Array(nBuckets);
    const buyV=new Float64Array(nBuckets);
    const sellV=new Float64Array(nBuckets);
    const tchs=new Uint32Array(nBuckets);
    for(const c of cs){
      const dv=c.v*c.c;
      const range=c.h-c.l;
      const bf=range>0?(c.c-c.l)/range:0.5;
      const sf=1-bf;
      const loIdx=Math.max(0,Math.floor((c.l-priceMin)/bucketSize));
      const hiIdx=Math.min(nBuckets-1,Math.floor((c.h-priceMin)/bucketSize));
      if(loIdx===hiIdx){
        vols[loIdx]+=dv;buyV[loIdx]+=dv*bf;sellV[loIdx]+=dv*sf;tchs[loIdx]++;
      }else{
        const inv=range>0?1/range:1/(hiIdx-loIdx+1);
        for(let b=loIdx;b<=hiIdx;b++){
          const bLo=priceMin+b*bucketSize,bHi=bLo+bucketSize;
          const frac=(Math.min(c.h,bHi)-Math.max(c.l,bLo))*(range>0?inv:1);
          const bdv=dv*frac;
          vols[b]+=bdv;buyV[b]+=bdv*bf;sellV[b]+=bdv*sf;tchs[b]++;
        }
      }
    }
    const buckets=[];
    for(let i=0;i<nBuckets;i++)
      if(tchs[i]>=minTouch&&vols[i]>0) buckets.push({i,vol:vols[i],bv:buyV[i],sv:sellV[i],touches:tchs[i]});
    if(!buckets.length) return[];
    const byVol=[...buckets].sort((a,b)=>b.vol-a.vol);
    const minSep=Math.max(1,Math.floor(nBuckets/(topN*1.5)));
    const selIdx=[];
    for(const b of byVol){
      if(selIdx.every(i=>Math.abs(b.i-i)>=minSep)) selIdx.push(b.i);
      if(selIdx.length>=topN*2) break;
    }
    if(!selIdx.length) return[];
    const topSet=new Set(selIdx);
    const top=buckets.filter(b=>topSet.has(b.i)).sort((a,b)=>a.i-b.i);
    if(!top.length) return[];
    const zones=[];
    let lastI=top[0].i;
    let zn={lo:priceMin+top[0].i*bucketSize,hi:priceMin+(top[0].i+1)*bucketSize,
            totalVol:top[0].vol,totalBuyVol:top[0].bv,totalSellVol:top[0].sv,totalTouches:top[0].touches};
    for(let k=1;k<top.length;k++){
      const b=top[k];
      if(b.i-lastI<=mergeGap+1){
        zn.hi=priceMin+(b.i+1)*bucketSize;
        zn.totalVol+=b.vol;zn.totalBuyVol+=b.bv;zn.totalSellVol+=b.sv;zn.totalTouches+=b.touches;
      }else{
        zones.push(zn);
        zn={lo:priceMin+b.i*bucketSize,hi:priceMin+(b.i+1)*bucketSize,
            totalVol:b.vol,totalBuyVol:b.bv,totalSellVol:b.sv,totalTouches:b.touches};
      }
      lastI=b.i;
    }
    zones.push(zn);
    zones.sort((a,b)=>a.totalVol-b.totalVol);
    return{hvn:zones.slice(-topN),rawBuckets:{priceMin,bucketSize,nBuckets,bvArr:buyV,svArr:sellV,tchs}};
  }

  // ── Draw ──
  function drawVolZones(ctx,W,H,V,sc,x){
    if(!window.S||!S.inds.volZones||!S.candles.length) return;
    const vzTfSel=E('vzTf');const vzTf=vzTfSel?vzTfSel.value:'';
    const cs=getVZCandles();
    const{bucketPct,topN,minTouch,mergeGap,extend,color}=getSettings(cs);
    const lastIdx=cs.length-1;

    const key=`${cs.length}|${cs[0]?.t||0}|${S.sym}|${vzTf||S.tf}|${bucketPct}|${topN}|${minTouch}|${mergeGap}`;
    if(key!==_vzCacheKey){_vzCache=computeHVN(cs,bucketPct,topN,minTouch,mergeGap);_vzCacheKey=key;}
    const cache=_vzCache;
    if(!cache?.hvn?.length) return;
    const{hvn:zones}=cache;

    const rgb=hexToRgb(color);
    const vspan=S.view.end-S.view.start;
    const cw=CW(W);
    const bw=cw/vspan;
    const xRight=Math.min(W-RP(),x(lastIdx)+extend*bw);
    const xLeft=0;
    const maxVol=zones[zones.length-1].totalVol;

    ctx.save();
    window.__ETX_SKIP_COLORMAP=true;

    for(let zi=0;zi<zones.length;zi++){
      const{hi,lo,totalVol,totalTouches}=zones[zi];
      const rel=maxVol>0?totalVol/maxVol:1;
      const mid=(hi+lo)/2;
      const y1=sc.y(hi),y2=sc.y(lo),ym=sc.y(mid);
      const boxH=Math.max(1,y2-y1);

      if(xRight<=xLeft||y2<PT||y1>H-PB) continue;

      ctx.fillStyle=`rgba(${rgb.r},${rgb.g},${rgb.b},${(0.03+0.10*rel).toFixed(3)})`;
      ctx.fillRect(xLeft,y1,xRight-xLeft,boxH);

      ctx.strokeStyle=`rgba(${rgb.r},${rgb.g},${rgb.b},${(0.25+0.45*rel).toFixed(3)})`;
      ctx.lineWidth=rel>0.7?1.5:1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(xLeft,y1);ctx.lineTo(xRight,y1);
      ctx.moveTo(xLeft,y2);ctx.lineTo(xRight,y2);
      ctx.stroke();

      if(boxH>12){
        ctx.strokeStyle=`rgba(${rgb.r},${rgb.g},${rgb.b},${(0.15+0.28*rel).toFixed(3)})`;
        ctx.lineWidth=1;ctx.setLineDash([3,5]);
        ctx.beginPath();ctx.moveTo(xLeft,ym);ctx.lineTo(xRight,ym);ctx.stroke();
        ctx.setLineDash([]);
      }

      if(boxH>8){
        ctx.textBaseline='middle';
        ctx.font=`${rel>0.5?'bold ':''}9px monospace`;
        ctx.fillStyle=`rgba(${rgb.r},${rgb.g},${rgb.b},${(0.55+0.30*rel).toFixed(3)})`;
        ctx.fillText(`HVN ${priceFmt(mid)} | $${nFmt(totalVol)} | ${totalTouches}t`,xLeft+6,ym);
      }
    }

    window.__ETX_SKIP_COLORMAP=false;
    ctx.restore();
  }

  window.__drawVolZones=drawVolZones;
  window.__hvnZones=()=>_vzCache?.hvn;
  /* expose zone computation for MTF HVN Signals */
  window.__dvlComputeHVNFromCS=function(cs){
    var s=getSettings(cs);
    var r=computeHVN(cs,s.bucketPct,s.topN,s.minTouch,s.mergeGap);
    return r?r.hvn||[]:[]; };

  // ── Event wiring ──
  const VZ_INPUTS=new Set(['vzBucket','vzBucketAtr','vzTopN','vzMinTouch','vzMerge','vzExtend','vzColor','vzTf']);

  function vzRedraw(){if(typeof drawSoon==='function')drawSoon();}

  document.addEventListener('input',function(ev){
    if(!VZ_INPUTS.has(ev.target?.id)) return;
    if(ev.target.id==='vzColor'){const sw=E('vzColorSwatch');if(sw)sw.style.background=ev.target.value;}
    vzRedraw();
  });
  document.addEventListener('change',function(ev){
    const id=ev.target?.id;
    if(!VZ_INPUTS.has(id)) return;
    if(id==='vzTf'){_vzExtCandles=null;_vzExtKey='';_vzExtFetching=false;_vzCacheKey='';}
    vzRedraw();
  });

  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);
  var _ptMaIds=new Set(['ptDeltaMA','ptPressureMA','ptPulseMA']);
  function _ptMaRd(){_cfgCache=null;if(typeof drawSoon==='function')drawSoon();}
  document.addEventListener('input',function(ev){if(_ptMaIds.has(ev.target&&ev.target.id))_ptMaRd();});
  document.addEventListener('change',function(ev){if(_ptMaIds.has(ev.target&&ev.target.id))_ptMaRd();});
})();
