/* script-0290-DVL_MANUAL_FIXED_RANGE_VP_1390.js
   Fixed Range VP - Manual: 1 VP sobre range escolhido no grafico.
   Drop-in autocontido p/ build modular (beta1504+). Resiliente a ordem de carga:
   funciona carregado antes OU depois de script-0095-DVL_FIXED_RANGE_VP_1308.js. */
(function(){
  "use strict";
  /* CSS injetado via JS (build modular nao usa <style> inline) */
  (function(){try{if(document.getElementById("DVL_MANUAL_FRVP_STYLE_1390"))return;var s=document.createElement("style");s.id="DVL_MANUAL_FRVP_STYLE_1390";s.textContent=`#dvlManualFRVPSelOverlay{background:rgba(120,80,220,.06);border:1px dashed rgba(176,107,255,.55);box-sizing:border-box;}
#dvlManualFRVPSelHint{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(14,10,26,.92);color:#e9def7;font:800 11px system-ui;padding:7px 12px;border-radius:9px;border:1px solid rgba(176,107,255,.5);white-space:nowrap;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.4);}
#dvlManualFRVPToast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(14,10,26,.95);color:#e9def7;font:800 12px system-ui;padding:9px 16px;border-radius:10px;border:1px solid rgba(176,107,255,.5);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:99999;}
#dvlManualFRVPToast.is-show{opacity:1;transform:translateX(-50%) translateY(0);}
#dvlManualFRVPPanel .dvl-vt-btn-primary{background:linear-gradient(180deg,#b06bff,#8a3fe0);color:#fff;border:none;font:800 11px system-ui;padding:8px 14px;border-radius:9px;cursor:pointer;}
#dvlManualFRVPPanel .dvl-vt-btn-primary:active{transform:translateY(1px);}
#dvlManualFRVPPanel .dvl-vt-btn-ghost{background:transparent;color:#c7b8e6;border:1px solid rgba(176,107,255,.4);font:800 11px system-ui;padding:8px 14px;border-radius:9px;cursor:pointer;}
#dvlManualFRVPFab{position:fixed;right:14px;bottom:104px;display:none;flex-direction:column;gap:8px;z-index:99997;align-items:center;touch-action:none;user-select:none;-webkit-user-select:none;}
#dvlManualFRVPFab.is-on{display:flex;}
#dvlManualFRVPFab.is-dragging{opacity:.92;cursor:grabbing;}
.dvl-mfrvp-fab-btn{width:46px;height:46px;border-radius:14px;border:1px solid rgba(16,223,119,.55);background:linear-gradient(180deg,rgba(18,26,23,.96),rgba(12,18,16,.96));color:#10df77;cursor:grab;box-shadow:0 5px 16px rgba(0,0,0,.45),inset 0 0 0 1px rgba(16,223,119,.08);display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}
.dvl-mfrvp-fab-btn svg{display:block;pointer-events:none;}
.dvl-mfrvp-fab-btn.dvl-mfrvp-fab-sel:active{transform:scale(.96);}
.dvl-mfrvp-fab-btn.dvl-mfrvp-fab-sel{box-shadow:0 5px 18px rgba(0,0,0,.5),0 0 0 1px rgba(16,223,119,.14),0 0 14px rgba(16,223,119,.18);}
.dvl-mfrvp-fab-btn.dvl-mfrvp-fab-clear{width:38px;height:38px;border-radius:12px;color:#ff6b7d;border-color:rgba(255,90,110,.5);box-shadow:0 4px 12px rgba(0,0,0,.4);}
.dvl-mfrvp-fab-btn.dvl-mfrvp-fab-clear.is-disabled{opacity:.3;pointer-events:none;}`;(document.head||document.documentElement).appendChild(s);}catch(_){}})();
  /* DVL Beta 1.390 — Fixed Range VP MANUAL.
     Igual ao Fixed Range VP, porém gera UM ÚNICO profile e o usuário escolhe
     de onde até onde ele é plotado (seleção manual no gráfico).
     Módulo 100% isolado: NÃO altera o pipeline de desenho (faz wrap do
     window.DVLFixedRangeVPDraw já existente) e usa os próprios candles do
     gráfico (klines) como fonte de dados. */

  const STORE_KEY="dvl_manual_frvp_v1";
  const DEFAULTS={
    on:false,
    startTime:0, endTime:0,
    rows:100, rowLayout:"rows", ticksPerRow:2,
    widthPct:0.42, anchorMode:"origin",
    profileColor:"#b06bff", opacity:0.42, valueAreaPct:0.70, colRadius:1,
    deltaOn:false, deltaWidthPct:0.24, deltaOpacity:0.78,
    deltaBuyColor:"#13dc8d", deltaSellColor:"#ff4a61",
    lvnOn:false, lvnCount:2, lvnLabels:true,
    lvnBelowColor:"#f3c768", lvnAboveColor:"#3fa9ff",
    lvnLineStyle:"dotted", lvnLineWidth:1.0, lvnOpacity:0.88,
    extendRight:true,
    showPOC:true, showVAH:true, showVAL:true,
    colorPOC:"#f3c768", colorVAH:"#13dc8d", colorVAL:"#ff4a61",
    lineStyle:"dashed", lineWidth:1.4,
    labels:true, labelFontPx:8,
    rangeColor:"#b06bff"
  };

  let state=Object.assign({},DEFAULTS);
  try{const s=localStorage.getItem(STORE_KEY);if(s)Object.assign(state,JSON.parse(s)||{});}catch(_){}
  state.rows=Math.max(20,Math.min(300,Math.round(+state.rows)||100));
  state.rowLayout=state.rowLayout==="ticks"?"ticks":"rows";
  state.anchorMode=state.anchorMode==="end"?"end":"origin";
  state.ticksPerRow=Math.max(1,Math.min(100000,Math.round(+state.ticksPerRow)||2));
  state.colRadius=Math.max(0,Math.min(3,+state.colRadius||0));
  function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(_){}}
  function on(){return !!state.on;}
  function hasRange(){return +state.startTime>0&&+state.endTime>0&&+state.endTime!==+state.startTime;}
  function redraw(){if(typeof drawSoon==="function")drawSoon();}
  function setOn(v){state.on=!!v;save();updateRow();redraw();}
  function resetState(){state=Object.assign({},DEFAULTS);save();profileCache=null;updateRow();renderPanel();redraw();}

  const STYLE_OPTS=[["solid","Sólida"],["dashed","Tracejada"],["dotted","Pontilhada"],["dashdot","Traço-ponto"]];
  const ANCHOR_OPTS=[["origin","Início do range"],["end","Fim do range"]];
  const ROW_LAYOUT_OPTS=[["rows","Number of Rows"],["ticks","Ticks Per Row"]];
  const PALETTE=["#10df77","#13dc8d","#2ee6a6","#38e0ff","#3fa9ff","#1e6bff","#7fb8ff","#00c2d1","#f3c768","#ffcf5a","#ff9f43","#ff4a61","#ff6b8f","#b86cff","#b06bff","#9a5cff","#ffffff","#c0c0c0"];

  /* ---------- helpers de desenho (cópias locais, isoladas) ---------- */
  function dash(style,w){w=Math.max(1,+w||1);if(style==="solid")return[];if(style==="dotted")return[1,Math.max(3,w*2.5)];if(style==="dashdot")return[w*5,w*3,1,w*3];return[w*4,w*3];}
  function roundRectLeft(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,h/2,w/2));ctx.beginPath();if(r<.5){ctx.rect(x,y,w,h);return;}ctx.moveTo(x+r,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
  function roundRectRight(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,h/2,w/2));ctx.beginPath();if(r<.5){ctx.rect(x,y,w,h);return;}ctx.moveTo(x,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x,y+h);ctx.closePath();}

  /* ---------- fonte de dados: candles do próprio gráfico ---------- */
  function chartCandles(){try{return (typeof klines!=="undefined"&&Array.isArray(klines))?klines:[];}catch(_){return [];}}
  function chartStepMs(all){all=all||chartCandles();let sum=0,n=0;for(let i=Math.max(1,all.length-128);i<all.length;i++){const d=(+all[i].time||0)-(+all[i-1].time||0);if(d>0){sum+=d;n++;}}return n?Math.max(1,Math.round(sum/n)):60000;}
  function indexAtTime(t,side){
    const all=chartCandles();if(!all.length||!isFinite(+t))return NaN;t=+t;side=side==="ceil"?"ceil":"floor";
    const n=all.length,first=+(all[0]&&all[0].time)||0,last=+(all[n-1]&&all[n-1].time)||first,step=chartStepMs(all);
    if(t<first){const q=(t-first)/step;return side==="ceil"?Math.ceil(q):Math.floor(q);}
    if(t>last){const q=(t-last)/step;return (n-1)+(side==="ceil"?Math.ceil(q):Math.floor(q));}
    let lo=0,hi=n;while(lo<hi){const m=(lo+hi)>>1;if((+all[m].time||0)<t)lo=m+1;else hi=m;}
    if(side==="ceil")return Math.max(0,Math.min(n-1,lo));
    if(lo<n&&(+all[lo].time||0)===t)return lo;
    return Math.max(0,Math.min(n-1,lo-1));
  }
  function xAtIndex(cfg,index){if(!cfg||!cfg.win||typeof cfg.x!=="function"||!isFinite(+index))return NaN;return cfg.x((+index)-(+cfg.win.leftEdgeIndex||0));}
  function indexFromLocalX(cfg,lx){if(!cfg||typeof cfg.x!=="function")return NaN;const a=cfg.x(0),b=cfg.x(1),step=b-a;if(!isFinite(step)||step===0)return NaN;return (lx-a)/step+(+((cfg.win||{}).leftEdgeIndex)||0);}
  function timeFromLocalX(cfg,lx){
    const all=chartCandles();if(!all.length)return NaN;
    let idx=indexFromLocalX(cfg,lx);if(!isFinite(idx))return NaN;
    idx=Math.round(idx);idx=Math.max(0,Math.min(all.length-1,idx));
    return +all[idx].time||NaN;
  }

  /* ---------- cálculo do profile (mesma distribuição do Fixed Range VP) ---------- */
  let profileCache=null;
  function findLVNCandidates(bins,min,ppr){
    const n=bins?bins.length:0;if(n<7)return [];
    const smooth=new Float64Array(n);let maxVol=0;
    for(let i=0;i<n;i++){const a=i>0?bins[i-1]:bins[i],b=bins[i],c=i<n-1?bins[i+1]:bins[i];smooth[i]=(a+b*2+c)/4;if(smooth[i]>maxVol)maxVol=smooth[i];}
    if(!(maxVol>0))return [];
    const edge=Math.max(2,Math.round(n*.025)),side=Math.max(5,Math.round(n*.18));
    const raw=[];
    for(let i=edge;i<n-edge;i++){
      const v=smooth[i];if(v>smooth[i-1]||v>smooth[i+1])continue;
      let leftPeak=0,rightPeak=0,leftSum=0,rightSum=0,leftN=0,rightN=0;
      for(let j=Math.max(edge,i-side);j<i;j++){leftPeak=Math.max(leftPeak,smooth[j]);leftSum+=smooth[j];leftN++;}
      for(let j=i+1;j<=Math.min(n-edge-1,i+side);j++){rightPeak=Math.max(rightPeak,smooth[j]);rightSum+=smooth[j];rightN++;}
      if(!leftN||!rightN)continue;
      const bridge=Math.min(leftPeak,rightPeak);if(bridge<maxVol*.008)continue;
      const depth=Math.max(0,1-v/Math.max(bridge,1e-12));
      const leftAvg=leftSum/leftN,rightAvg=rightSum/rightN,avgBridge=Math.min(leftAvg,rightAvg);
      const avgDepth=Math.max(0,1-v/Math.max(avgBridge,1e-12));
      if(depth<.12&&avgDepth<.08)continue;
      const prominence=Math.min(1,bridge/maxVol);
      const balance=Math.min(leftPeak,rightPeak)/Math.max(leftPeak,rightPeak,1e-12);
      const score=depth*.54+avgDepth*.18+prominence*.18+balance*.10;
      raw.push({idx:i,price:min+(i+.5)*ppr,score,depth,volume:v});
    }
    raw.sort((a,b)=>b.score-a.score);
    const picked=[],minSep=Math.max(3,Math.round(n*.06));
    for(const c of raw){if(picked.every(p=>Math.abs(p.idx-c.idx)>=minSep))picked.push(c);if(picked.length>=12)break;}
    return picked;
  }
  function computeProfile(candles,requestedRows,vaPct,sym){
    if(!candles||!candles.length)return null;
    let min=Infinity,max=-Infinity;for(const c of candles){if(+c.low<min)min=+c.low;if(+c.high>max)max=+c.high;}
    if(!isFinite(min)||!isFinite(max)||max<=min)return null;
    if(state.rowLayout!=="ticks"){const pad=(max-min)*0.004;min-=pad;max+=pad;}
    const grid=window.DVLVPRowLayout1345&&window.DVLVPRowLayout1345.resolve?window.DVLVPRowLayout1345.resolve({mode:state.rowLayout,rows:requestedRows,ticksPerRow:state.ticksPerRow,min,max,symbol:sym,candles,maxRows:12000}):null;
    const rows=grid?grid.rows:Math.max(1,Math.round(requestedRows)||100);
    if(grid){min=grid.min;max=grid.max;}
    const range=max-min;
    const bins=new Float64Array(rows),buyBins=new Float64Array(rows),sellBins=new Float64Array(rows);
    function fillInto(target,lo,hi,vol,peak){
      lo=Math.max(lo,min);hi=Math.min(hi,max);if(!(hi>lo)||!(vol>0))return;
      const a=Math.max(0,Math.min(rows-1,Math.floor((lo-min)/range*rows)));
      const b=Math.max(0,Math.min(rows-1,Math.floor((hi-min)/range*rows)));
      const n=b-a+1;if(n<=1){target[a]+=vol;return;}
      const pk=Math.max(a,Math.min(b,Math.floor((Math.max(lo,Math.min(hi,peak))-min)/range*rows)));
      let sum=0;const weights=new Float64Array(n);
      for(let k=0;k<n;k++){const i=a+k;const d=i===pk?1:(i<pk?(pk>a?(i-a)/(pk-a):0):(pk<b?(b-i)/(b-pk):0));weights[k]=d+0.14;sum+=weights[k];}
      for(let k=0;k<n;k++)target[a+k]+=vol*weights[k]/sum;
    }
    function distribute(target,c,vol){
      if(!(vol>0))return;const lo=+c.low,hi=+c.high,op=+c.open,cl=+c.close;const bl=Math.min(op,cl),bh=Math.max(op,cl);const body=Math.max(0,bh-bl),full=Math.max(0,hi-lo);
      if(body>0&&full>0){fillInto(target,bl,bh,vol*0.72,cl);const up=Math.max(0,hi-bh),dn=Math.max(0,bl-lo),w=up+dn;if(w>0){if(up)fillInto(target,bh,hi,vol*0.28*(up/w),(bh+hi)/2);if(dn)fillInto(target,lo,bl,vol*0.28*(dn/w),(lo+bl)/2);}}
      else fillInto(target,lo,hi,vol,cl);
    }
    for(const c of candles){
      const v=+c.volume||0;if(!v)continue;let buy=+c.buyVolume,sell=+c.sellVolume;
      if(!(buy>=0)){buy=NaN;}
      if(!(buy>=0)||!(sell>=0)){if(buy>=0&&!(sell>=0))sell=Math.max(0,v-buy);}
      if(!(buy>=0)||!(sell>=0)||buy+sell<=0){const lo=+c.low,hi=+c.high,cl=+c.close,op=+c.open;const full=Math.max(1e-12,hi-lo);const closePos=Math.max(0,Math.min(1,(cl-lo)/full));const bodyBias=Math.max(-1,Math.min(1,(cl-op)/full));const buyShare=Math.max(.08,Math.min(.92,.25+.50*closePos+.25*Math.max(0,bodyBias)));buy=v*buyShare;sell=v-buy;}
      else{const sum=buy+sell;if(sum>0&&Math.abs(sum-v)>v*.01){const k=v/sum;buy*=k;sell*=k;}}
      distribute(bins,c,v);distribute(buyBins,c,buy);distribute(sellBins,c,sell);
    }
    let total=0,maxBucket=0,pocIdx=0,maxDelta=0;const deltaBins=new Float64Array(rows);
    for(let i=0;i<rows;i++){total+=bins[i];if(bins[i]>maxBucket){maxBucket=bins[i];pocIdx=i;}const d=buyBins[i]-sellBins[i];deltaBins[i]=d;if(Math.abs(d)>maxDelta)maxDelta=Math.abs(d);}
    if(!maxBucket)return null;const target=total*Math.max(.1,Math.min(1,vaPct));let vol=bins[pocIdx],lo=pocIdx,hi=pocIdx;
    while(vol<target&&(lo>0||hi<rows-1)){const lv=lo>0?bins[lo-1]:-1,hv=hi<rows-1?bins[hi+1]:-1;if(hv>=lv){hi++;vol+=bins[hi];}else{lo--;vol+=bins[lo];}}
    const ppr=range/rows;
    return {bins,buyBins,sellBins,deltaBins,min,max,maxBucket,maxDelta,pocIdx,poc:min+(pocIdx+.5)*ppr,vah:min+(hi+1)*ppr,val:min+lo*ppr,vaLo:lo,vaHi:hi,ppr,rows,rowLayout:grid?grid.mode:"rows",lvns:findLVNCandidates(bins,min,ppr)};
  }
  function currentProfile(cfg){
    if(!hasRange())return null;
    const a=Math.min(+state.startTime,+state.endTime),b=Math.max(+state.startTime,+state.endTime);
    const all=chartCandles();if(!all.length)return null;
    // Range em CANDLES reais: inclui candles cuja abertura está dentro do range.
    const candles=all.filter(c=>{const t=+c.time||0;return t>=a&&t<=b;});
    if(candles.length<1)return null;
    const lastT=+candles[candles.length-1].time||b;
    const sig=[a,b,candles.length,lastT,state.rows,state.rowLayout,state.ticksPerRow,state.valueAreaPct].join("|");
    if(profileCache&&profileCache.sig===sig)return profileCache;
    let sym="";try{sym=typeof symbol!=="undefined"?String(symbol||""):"";}catch(_){}
    const rows=Math.max(20,Math.min(300,Math.round(state.rows)||100));
    const p=computeProfile(candles,rows,Math.max(.1,Math.min(1,+state.valueAreaPct||.70)),sym);
    if(!p)return null;
    profileCache={sig,p,startTime:a,endTime:b};
    return profileCache;
  }

  /* ---------- layout de x (bloco preso ao range) ---------- */
  function xBounds(cfg){
    const a=Math.min(+state.startTime,+state.endTime),b=Math.max(+state.startTime,+state.endTime);
    const startIdx=indexAtTime(a,"ceil"),endIdx=indexAtTime(b,"floor");
    let si=startIdx,ei=endIdx;if(isFinite(si)&&isFinite(ei)&&ei<si)ei=si;
    const xa=xAtIndex(cfg,si),xb=xAtIndex(cfg,ei);
    if(!isFinite(xa)||!isFinite(xb))return null;
    return {x0:Math.min(xa,xb),x1:Math.max(xa,xb),startIdx:si,endIdx:ei};
  }
  function calcLayout(bounds){
    const span=Math.max(1,bounds.x1-bounds.x0);
    const profileRatio=Math.max(.05,Math.min(.90,+state.widthPct||.42));
    const deltaRatio=Math.max(.05,Math.min(.55,+state.deltaWidthPct||.24));
    let profileW=Math.max(.75,Math.min(600,span*profileRatio));
    let deltaW=state.deltaOn?Math.max(.75,Math.min(400,span*deltaRatio)):0;
    let dividerGap=state.deltaOn?Math.min(4,Math.max(.5,span*.018)):0;
    let totalW=profileW+deltaW+dividerGap;
    const cap=Math.max(1,span*.98);
    if(totalW>cap){const available=Math.max(.5,cap-dividerGap),pair=Math.max(.0001,profileW+deltaW),k=available/pair;profileW*=k;deltaW*=k;totalW=profileW+deltaW+dividerGap;}
    const atOrigin=(state.anchorMode||"origin")!=="end";
    // Profile fica ANCORADO na borda do range, independente do delta.
    // Ligar/desligar o delta NÃO move mais o profile: o delta cresce para a
    // ESQUERDA do profile (para fora), em vez de empurrar o profile todo.
    const profileX0=atOrigin?bounds.x0:(bounds.x1-profileW);
    const dividerX=profileX0-(state.deltaOn?dividerGap:0);
    const blockX=state.deltaOn?(dividerX-deltaW):profileX0;
    return {span,profileW,deltaW,dividerGap,totalW,blockX,dividerX,profileX0};
  }
  function nodeTipX(p,layout,idx){
    if(!p||!layout||!isFinite(idx))return layout?layout.profileX0:NaN;
    idx=Math.max(0,Math.min((p.bins?p.bins.length:1)-1,Math.round(idx)));
    const vol=+(p.bins&&p.bins[idx])||0,mx=+p.maxBucket||0,bw=mx>0?(vol/mx)*layout.profileW:0;
    return layout.profileX0+Math.max(0.5,bw);
  }

  /* ---------- desenho ---------- */
  function drawRangeMarkers(ctx,cfg,bounds){
    const col=state.rangeColor||"#b06bff";
    ctx.save();ctx.globalAlpha=.9;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.setLineDash([4,3]);
    [bounds.x0,bounds.x1].forEach(xx=>{if(xx<cfg.x0-2||xx>cfg.x1+2)return;ctx.beginPath();ctx.moveTo(xx,cfg.y0);ctx.lineTo(xx,cfg.y1);ctx.stroke();});
    ctx.setLineDash([]);ctx.globalAlpha=.16;ctx.fillStyle=col;
    const bx0=Math.max(cfg.x0,bounds.x0),bx1=Math.min(cfg.x1,bounds.x1);
    if(bx1>bx0){ctx.fillRect(bx0,cfg.y0,bx1-bx0,4);}
    ctx.restore();
  }
  function drawProfile(ctx,cfg,p,bounds){
    const layout=calcLayout(bounds);
    const {profileW,deltaW,dividerX,profileX0}=layout;
    const bodyLeft=Math.min(layout.blockX,profileX0),bodyRight=Math.max(profileX0+profileW,dividerX);
    const color=state.profileColor||"#b06bff",op=Math.max(.03,Math.min(1,+state.opacity||.42)),r=Math.max(0,Math.min(3,+state.colRadius||0));
    ctx.save();
    if(bodyRight>=cfg.x0&&bodyLeft<=cfg.x1){
      ctx.fillStyle=color;
      for(let i=0;i<p.rows;i++){
        const vol=p.bins[i];if(!vol)continue;const bw=(vol/p.maxBucket)*profileW;if(bw<.5)continue;
        const plo=p.min+i*p.ppr,phi=p.min+(i+1)*p.ppr;const yt=cfg.y(phi),yb=cfg.y(plo);
        if((yt<cfg.y0&&yb<cfg.y0)||(yt>cfg.y1&&yb>cfg.y1))continue;
        const y=Math.min(yt,yb),h=Math.max(.5,Math.abs(yb-yt));const inVA=i>=p.vaLo&&i<=p.vaHi;
        ctx.globalAlpha=inVA?op:op*.42;roundRectRight(ctx,profileX0,y,bw,h,Math.min(r,h/2,bw/2));ctx.fill();
      }
      if(state.deltaOn&&p.maxDelta>0){
        const dop=Math.max(.05,Math.min(1,+state.deltaOpacity||.78));
        for(let i=0;i<p.rows;i++){
          const d=p.deltaBins[i];if(!d)continue;const bw=(Math.abs(d)/p.maxDelta)*deltaW;if(bw<.5)continue;
          const plo=p.min+i*p.ppr,phi=p.min+(i+1)*p.ppr;const yt=cfg.y(phi),yb=cfg.y(plo);
          if((yt<cfg.y0&&yb<cfg.y0)||(yt>cfg.y1&&yb>cfg.y1))continue;
          const y=Math.min(yt,yb),h=Math.max(.5,Math.abs(yb-yt));const inVA=i>=p.vaLo&&i<=p.vaHi;
          ctx.globalAlpha=inVA?dop:dop*.55;ctx.fillStyle=d>=0?(state.deltaBuyColor||"#13dc8d"):(state.deltaSellColor||"#ff4a61");
          roundRectLeft(ctx,dividerX-bw,y,bw,h,Math.min(r,h/2,bw/2));ctx.fill();
        }
        const yTop=Math.max(cfg.y0,Math.min(cfg.y(p.max),cfg.y(p.min))),yBot=Math.min(cfg.y1,Math.max(cfg.y(p.max),cfg.y(p.min)));
        ctx.globalAlpha=.58;ctx.strokeStyle="rgba(142,174,190,.55)";ctx.lineWidth=1;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(dividerX,yTop);ctx.lineTo(dividerX,yBot);ctx.stroke();
      }
    }
    // Linhas POC/VAH/VAL
    ctx.globalAlpha=1;const lw=+state.lineWidth||1.4,lineDash=dash(state.lineStyle||"dashed",lw);ctx.lineWidth=lw;ctx.setLineDash(lineDash);
    const lineX1=state.extendRight?cfg.x1-4:Math.min(cfg.x1-4,bounds.x1);
    const line=(show,price,lineColor,name,idx)=>{
      const lineX0=Math.max(cfg.x0,nodeTipX(p,layout,idx));if(show===false||!(price>0)||lineX0>=lineX1)return;
      const y=cfg.y(price);if(y<cfg.y0||y>cfg.y1)return;
      ctx.strokeStyle=lineColor;ctx.beginPath();ctx.moveTo(lineX0,y);ctx.lineTo(lineX1,y);ctx.stroke();
      if(state.labels){ctx.setLineDash([]);ctx.fillStyle=lineColor;ctx.globalAlpha=.94;ctx.font="700 "+Math.max(6,Math.min(14,+state.labelFontPx||8))+"px system-ui";ctx.textAlign="right";ctx.textBaseline="bottom";ctx.fillText(name,lineX1-2,y-2);ctx.globalAlpha=1;ctx.setLineDash(lineDash);}
    };
    line(state.showPOC,p.poc,state.colorPOC||"#f3c768","POC",p.pocIdx);
    line(state.showVAH,p.vah,state.colorVAH||"#13dc8d","VAH",p.vaHi);
    line(state.showVAL,p.val,state.colorVAL||"#ff4a61","VAL",p.vaLo);
    ctx.setLineDash([]);
    // LVN
    if(state.lvnOn&&Array.isArray(p.lvns)&&p.lvns.length){
      const viewLast=cfg.view&&cfg.view.length?cfg.view[cfg.view.length-1]:null;const cur=+(viewLast&&viewLast.close)||p.poc;
      const cnt=Math.max(1,Math.min(8,Math.round(state.lvnCount)||2));
      const lvw=Math.max(.5,Math.min(5,+state.lvnLineWidth||1)),alpha=Math.max(.08,Math.min(1,+state.lvnOpacity||.88));
      ctx.lineWidth=lvw;ctx.setLineDash(dash(state.lvnLineStyle||"dotted",lvw));ctx.font="800 "+Math.max(6,Math.min(14,+state.labelFontPx||8))+"px system-ui";ctx.textAlign="right";
      for(const node of p.lvns.slice(0,cnt)){
        const price=+node.price;if(!(price>0))continue;const y=cfg.y(price);if(y<cfg.y0||y>cfg.y1)continue;
        const isAbove=price>cur,color=isAbove?(state.lvnAboveColor||"#3fa9ff"):(state.lvnBelowColor||"#f3c768"),label=isAbove?"LVN UP":"LVN DOWN";
        const x0=Math.max(cfg.x0,nodeTipX(p,layout,node.idx));if(x0>=lineX1)continue;
        ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(lineX1,y);ctx.stroke();
        if(state.lvnLabels!==false){ctx.setLineDash([]);ctx.globalAlpha=Math.min(1,alpha+.08);ctx.fillStyle=color;ctx.textBaseline="bottom";ctx.fillText(label,lineX1-2,y-2);ctx.setLineDash(dash(state.lvnLineStyle||"dotted",lvw));}
      }
    }
    ctx.restore();
  }
  function drawPreview(ctx,cfg){
    if(!sel.active)return;
    const col=state.rangeColor||"#b06bff";
    const xa=isFinite(sel.aX)?sel.aX:null,xb=isFinite(sel.bX)?sel.bX:null;
    ctx.save();ctx.strokeStyle=col;ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.globalAlpha=.95;
    [xa,xb].forEach(xx=>{if(xx==null)return;ctx.beginPath();ctx.moveTo(xx,cfg.y0);ctx.lineTo(xx,cfg.y1);ctx.stroke();});
    if(xa!=null&&xb!=null){const l=Math.min(xa,xb),rr=Math.max(xa,xb);ctx.setLineDash([]);ctx.globalAlpha=.14;ctx.fillStyle=col;ctx.fillRect(l,cfg.y0,rr-l,cfg.y1-cfg.y0);}
    ctx.restore();
  }
  let lastCfg=null;
  function draw(ctx,cfg){
    if(!cfg||!cfg.view||!cfg.view.length)return;
    lastCfg=cfg;
    ctx.save();
    try{
      ctx.beginPath();ctx.rect(cfg.x0,cfg.y0,cfg.x1-cfg.x0,cfg.y1-cfg.y0);ctx.clip();
      if(sel.active)drawPreview(ctx,cfg);
      if(state.on&&hasRange()){
        const bounds=xBounds(cfg);
        if(bounds&&bounds.x1-bounds.x0>=2){
          const pc=currentProfile(cfg);
          drawRangeMarkers(ctx,cfg,bounds);
          if(pc&&pc.p)drawProfile(ctx,cfg,pc.p,bounds);
          if(!sel.active)drawEdgeHandles(ctx,cfg,bounds);
        }
      }
    }finally{ctx.restore();}
  }

  /* ---------- alças nas bordas: arraste o início/fim do range já fixado ----------
     Depois de fixar o profile dá pra continuar ajustando: arrastar a alça do FIM
     empurra o endTime pra frente (mantendo o início fixo) e o profile recalcula.
     Só captura o gesto quando o ponteiro encosta numa borda (tolerância pequena),
     então o pan normal do gráfico continua funcionando no resto do chart. */
  const EDGE_TOL=13, EDGE_H=22, EDGE_HW=3;
  let edgeDrag=null;
  function drawEdgeHandles(ctx,cfg,bounds){
    const col=state.rangeColor||"#b06bff";
    const y=cfg.y0+1,hh=Math.min(EDGE_H,Math.max(12,(cfg.y1-cfg.y0)*0.06));
    [[bounds.x0,"start"],[bounds.x1,"end"]].forEach(function(pair){
      const xx=pair[0],edge=pair[1];
      if(xx<cfg.x0-8||xx>cfg.x1+8)return;
      const active=!!(edgeDrag&&edgeDrag.edge===edge);
      ctx.save();
      ctx.globalAlpha=active?1:.9;ctx.fillStyle=col;
      ctx.fillRect(xx-EDGE_HW,y,EDGE_HW*2,hh);
      ctx.globalAlpha=active?1:.85;ctx.fillStyle="rgba(255,255,255,.92)";
      ctx.fillRect(xx-.6,y+3,1.2,hh-6);
      ctx.restore();
    });
  }
  function edgeAt(lx,ly,cfg){
    if(!cfg)return null;
    if(ly<cfg.y0-6||ly>cfg.y1+6)return null;
    const bounds=xBounds(cfg);if(!bounds)return null;
    const dEnd=Math.abs(lx-bounds.x1),dStart=Math.abs(lx-bounds.x0);
    if(dEnd<=EDGE_TOL&&dEnd<=dStart)return{edge:"end"};
    if(dStart<=EDGE_TOL)return{edge:"start"};
    return null;
  }
  function onEdgeDown(ev){
    if(edgeDrag||sel.active||!state.on||!hasRange()||!lastCfg)return;
    if(ev.pointerType==="mouse"&&ev.button!==0)return;
    const cv=canvasEl();if(!cv)return;
    const r=cv.getBoundingClientRect();
    const lx=ev.clientX-r.left,ly=ev.clientY-r.top;
    const hit=edgeAt(lx,ly,lastCfg);if(!hit)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    const a=Math.min(+state.startTime,+state.endTime),b=Math.max(+state.startTime,+state.endTime);
    edgeDrag={edge:hit.edge,pid:ev.pointerId,fixedTime:hit.edge==="end"?a:b};
    try{cv.setPointerCapture&&cv.setPointerCapture(ev.pointerId);}catch(_){}
    window.addEventListener("pointermove",onEdgeMove,true);
    window.addEventListener("pointerup",onEdgeUp,true);
    window.addEventListener("pointercancel",onEdgeUp,true);
    document.documentElement.style.cursor="ew-resize";
    redraw();
  }
  function onEdgeMove(ev){
    if(!edgeDrag)return;
    if(ev.pointerType==="mouse"&&typeof ev.buttons==="number"&&ev.buttons===0){onEdgeUp(ev);return;}
    ev.preventDefault();ev.stopPropagation();
    const cfg=lastCfg,cv=canvasEl();if(!cfg||!cv)return;
    const r=cv.getBoundingClientRect();
    let moving=timeFromLocalX(cfg,ev.clientX-r.left);
    if(!isFinite(moving))return;
    const step=Math.max(1,chartStepMs());
    if(edgeDrag.edge==="end"){moving=Math.max(moving,edgeDrag.fixedTime+step);state.startTime=edgeDrag.fixedTime;state.endTime=moving;}
    else{moving=Math.min(moving,edgeDrag.fixedTime-step);state.endTime=edgeDrag.fixedTime;state.startTime=moving;}
    profileCache=null;redraw();
  }
  function onEdgeUp(){
    window.removeEventListener("pointermove",onEdgeMove,true);
    window.removeEventListener("pointerup",onEdgeUp,true);
    window.removeEventListener("pointercancel",onEdgeUp,true);
    document.documentElement.style.cursor="";
    if(!edgeDrag)return;
    edgeDrag=null;profileCache=null;save();updateRow();
    try{if(panel&&panel.classList.contains("is-open"))renderPanel();}catch(_){}
    redraw();
  }
  function installEdgeDrag(){
    window.addEventListener("pointerdown",onEdgeDown,true);
    window.addEventListener("blur",function(){if(edgeDrag){edgeDrag=null;document.documentElement.style.cursor="";save();redraw();}},true);
    document.addEventListener("visibilitychange",function(){if(document.hidden&&edgeDrag){edgeDrag=null;document.documentElement.style.cursor="";save();redraw();}});
  }

  /* ---------- seleção do range (overlay sobre o canvas) ---------- */
  const sel={active:false,aX:NaN,bX:NaN,aTime:0,awaitingSecond:false,downX:0,overlay:null};
  function canvasEl(){try{return document.getElementById("chart")||document.querySelector("canvas");}catch(_){return null;}}
  function startSelect(){
    if(sel.active)return;const cv=canvasEl();if(!cv||!lastCfg){toast("Abra o gráfico antes de selecionar.");return;}
    sel.active=true;sel.aX=NaN;sel.bX=NaN;sel.aTime=0;sel.awaitingSecond=false;
    const ov=document.createElement("div");ov.id="dvlManualFRVPSelOverlay";sel.overlay=ov;
    positionOverlay();
    ov.style.cursor="crosshair";ov.style.zIndex="60";ov.style.touchAction="none";
    ov.innerHTML='<div id="dvlManualFRVPSelHint">Toque no início e no fim do range (ou arraste)</div>';
    document.body.appendChild(ov);
    ov.addEventListener("pointerdown",onSelDown);
    ov.addEventListener("pointermove",onSelMove);
    ov.addEventListener("pointerup",onSelUp);
    window.addEventListener("resize",positionOverlay);
    window.addEventListener("scroll",positionOverlay,true);
    updateHint();updateFab();
  }
  function positionOverlay(){
    const cv=canvasEl();if(!cv||!sel.overlay)return;const r=cv.getBoundingClientRect();
    const o=sel.overlay.style;o.position="fixed";o.left=r.left+"px";o.top=r.top+"px";o.width=r.width+"px";o.height=r.height+"px";
  }
  function localXFromEvent(ev){const cv=canvasEl();if(!cv)return NaN;const r=cv.getBoundingClientRect();return ev.clientX-r.left;}
  function onSelDown(ev){
    ev.preventDefault();ev.stopPropagation();
    const lx=localXFromEvent(ev);sel.downX=lx;
    if(!sel.awaitingSecond){sel.aX=lx;sel.bX=lx;}
    else{sel.bX=lx;}
    redraw();
  }
  function onSelMove(ev){
    ev.preventDefault();ev.stopPropagation();
    const lx=localXFromEvent(ev);
    if(!sel.awaitingSecond){if(isFinite(sel.aX))sel.bX=lx;}
    else{sel.bX=lx;}
    redraw();
  }
  function onSelUp(ev){
    ev.preventDefault();ev.stopPropagation();
    const lx=localXFromEvent(ev);
    const moved=Math.abs(lx-sel.downX);
    if(!sel.awaitingSecond){
      if(moved>6){ // arraste: início→fim num gesto só
        finalizeSelection(sel.aX,lx);return;
      }
      // toque simples: fixa o primeiro ponto e aguarda o segundo
      sel.aX=sel.downX;sel.bX=sel.downX;sel.awaitingSecond=true;updateHint();redraw();return;
    }
    // segundo toque
    finalizeSelection(sel.aX,lx);
  }
  function finalizeSelection(xA,xB){
    const cfg=lastCfg;if(!cfg){cancelSelect();return;}
    let tA=timeFromLocalX(cfg,xA),tB=timeFromLocalX(cfg,xB);
    if(!isFinite(tA)||!isFinite(tB)||tA===tB){toast("Range inválido. Tente novamente.");cancelSelect();return;}
    state.startTime=Math.min(tA,tB);state.endTime=Math.max(tA,tB);state.on=true;
    profileCache=null;save();cancelSelect();updateRow();renderPanel();redraw();
    toast("Range definido ✓");
  }
  function cancelSelect(){
    sel.active=false;sel.awaitingSecond=false;sel.aX=NaN;sel.bX=NaN;
    if(sel.overlay){try{sel.overlay.remove();}catch(_){}sel.overlay=null;}
    window.removeEventListener("resize",positionOverlay);
    window.removeEventListener("scroll",positionOverlay,true);
    updateFab();redraw();
  }
  function updateHint(){const h=sel.overlay&&sel.overlay.querySelector("#dvlManualFRVPSelHint");if(h)h.textContent=sel.awaitingSecond?"Agora toque no FIM do range":"Toque no início e no fim do range (ou arraste)";}
  function clearRange(){state.startTime=0;state.endTime=0;profileCache=null;save();updateRow();renderPanel();redraw();}
  let toastEl=null,toastTmr=null;
  function toast(msg){
    if(!toastEl){toastEl=document.createElement("div");toastEl.id="dvlManualFRVPToast";document.body.appendChild(toastEl);}
    toastEl.textContent=msg;toastEl.classList.add("is-show");
    clearTimeout(toastTmr);toastTmr=setTimeout(()=>toastEl&&toastEl.classList.remove("is-show"),1800);
  }

  /* ---------- painel ---------- */
  let panel=null;
  function ensurePanel(){
    if(panel&&document.contains(panel))return;
    panel=document.createElement("div");panel.id="dvlManualFRVPPanel";panel.className="dvl-vt-panel dvl-vp-panel";
    panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>Fixed Range VP · Manual</b><small>1 profile · range escolhido por você</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlManualFRVPReset" type="button" title="Reset">↻</button><button class="dvl-vt-close" id="dvlManualFRVPClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlManualFRVPBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown",e=>e.stopPropagation(),true);
    panel.querySelector("#dvlManualFRVPClose").addEventListener("click",closePanel);
    panel.querySelector("#dvlManualFRVPReset").addEventListener("click",resetState);
  }
  function openPanel(){ensurePanel();panel.classList.add("is-open");renderPanel();}
  function closePanel(){if(panel)panel.classList.remove("is-open");}
  function stepFld(id,val,min,max,step,dec){const v=dec?(+val).toFixed(dec):String(val);return '<div class="dvl-feb-step-wrap"><button class="dvl-feb-step-btn dvl-feb-step-dec" type="button" data-id="'+id+'" data-step="'+step+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'">−</button><span class="dvl-feb-step-val" id="'+id+'Val">'+v+'</span><button class="dvl-feb-step-btn dvl-feb-step-inc" type="button" data-id="'+id+'" data-step="'+step+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'">+</button></div>';}
  function dropFld(id,opts,cur){const l=(opts.find(o=>o[0]===cur)||[cur,cur])[1];return '<div class="dvl-drop-wrap" id="'+id+'Wrap"><button class="dvl-drop-btn" type="button" id="'+id+'">'+l+'<i class="dvl-drop-arr">▾</i></button><div class="dvl-drop-list" id="'+id+'List">'+opts.map(o=>'<button class="dvl-drop-item'+(o[0]===cur?' is-cur':'')+'" type="button" data-val="'+o[0]+'">'+o[1]+'</button>').join('')+'</div></div>';}
  function colorFld(id,label,key){const v=state[key]||"#b06bff";return '<div class="dvl-vt-field"><label>'+label+'</label><div class="dvl-feb-clr-field"><button id="'+id+'" class="dvl-feb-clr-swatch" type="button" style="background:'+v+'" data-key="'+key+'"></button></div></div>';}
  function openPalette(btn,key){document.querySelectorAll(".dvl-feb-pal").forEach(p=>p.remove());const p=document.createElement("div");p.className="dvl-feb-pal";PALETTE.forEach(c=>{const b=document.createElement("button");b.type="button";b.className="dvl-feb-pal-cell"+(c===state[key]?" is-cur":"");b.style.background=c;b.addEventListener("click",()=>{state[key]=c;btn.style.background=c;save();redraw();p.remove();});p.appendChild(b);});btn.parentNode.appendChild(p);setTimeout(()=>document.addEventListener("pointerdown",function out(e){if(!p.contains(e.target)&&e.target!==btn){p.remove();document.removeEventListener("pointerdown",out,true);}},true),0);}
  function rangeLabel(){
    if(!hasRange())return "nenhum range definido";
    try{const fmt=t=>{const d=new Date(+t);return d.toLocaleString([], {month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});};return fmt(Math.min(state.startTime,state.endTime))+" → "+fmt(Math.max(state.startTime,state.endTime));}catch(_){return "range definido";}
  }
  function renderPanel(){
    ensurePanel();const body=panel.querySelector("#dvlManualFRVPBody");
    const ticksMode=state.rowLayout==="ticks";
    const rowValue=ticksMode?state.ticksPerRow:state.rows;
    const rowMin=ticksMode?1:20,rowMax=ticksMode?100000:300,rowStep=ticksMode?1:10;
    body.innerHTML=''
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Range</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="mfrOn" type="checkbox" '+(state.on?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:6px"><label>Seleção</label><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="mfrSelect" type="button" class="dvl-vt-btn-primary">📐 Selecionar no gráfico</button><button id="mfrClear" type="button" class="dvl-vt-btn-ghost">Limpar</button></div></div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1"><label>Range atual</label><strong style="font-size:9px;color:var(--dvl-muted,#8ea0af);font-weight:800">'+rangeLabel()+'</strong></div>'
      +'</div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Geral</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label>Rows Layout</label>'+dropFld("mfrRowLayout",ROW_LAYOUT_OPTS,state.rowLayout||"rows")+'</div>'
      +'<div class="dvl-vt-field"><label>Row Size</label>'+stepFld("mfrRowSize",rowValue,rowMin,rowMax,rowStep,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Largura %</label>'+stepFld("mfrWidth",Math.round(state.widthPct*100),5,90,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Opacidade %</label>'+stepFld("mfrOpacity",Math.round(state.opacity*100),5,100,5,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Value Area %</label>'+stepFld("mfrVA",Math.round(state.valueAreaPct*100),10,100,5,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Arredondamento</label>'+stepFld("mfrRadius",state.colRadius,0,3,1,0)+'</div>'
      +'<div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Âncora</label>'+dropFld("mfrAnchor",ANCHOR_OPTS,state.anchorMode||"origin")+'</div>'
      +colorFld("mfrProfileColor","Cor do VP","profileColor")+'</div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Delta</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Delta</label><label class="dvl-switch"><input id="mfrDeltaOn" type="checkbox" '+(state.deltaOn?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Largura %</label>'+stepFld("mfrDeltaWidth",Math.round(state.deltaWidthPct*100),5,55,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Opacidade %</label>'+stepFld("mfrDeltaOpacity",Math.round(state.deltaOpacity*100),5,100,5,0)+'</div>'
      +colorFld("mfrDeltaBuyColor","Compradores","deltaBuyColor")+colorFld("mfrDeltaSellColor","Vendedores","deltaSellColor")+'</div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Linhas</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Estende p/ direita</label><label class="dvl-switch"><input id="mfrExtend" type="checkbox" '+(state.extendRight!==false?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Labels</label><label class="dvl-switch"><input id="mfrLabels" type="checkbox" '+(state.labels?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>POC</label><label class="dvl-switch"><input id="mfrPOC" type="checkbox" '+(state.showPOC!==false?'checked':'')+'><i></i><b></b></label></div>'+colorFld("mfrPOCColor","Cor POC","colorPOC")
      +'<div class="dvl-vt-field"><label>VAH</label><label class="dvl-switch"><input id="mfrVAH" type="checkbox" '+(state.showVAH!==false?'checked':'')+'><i></i><b></b></label></div>'+colorFld("mfrVAHColor","Cor VAH","colorVAH")
      +'<div class="dvl-vt-field"><label>VAL</label><label class="dvl-switch"><input id="mfrVAL" type="checkbox" '+(state.showVAL!==false?'checked':'')+'><i></i><b></b></label></div>'+colorFld("mfrVALColor","Cor VAL","colorVAL")
      +'<div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>'+dropFld("mfrLineStyle",STYLE_OPTS,state.lineStyle)+'</div><div class="dvl-vt-field"><label>Espessura</label>'+stepFld("mfrLineWidth",state.lineWidth,1,4,.5,1)+'</div></div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Low Volume Nodes (LVN)</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="mfrLVNOn" type="checkbox" '+(state.lvnOn?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Quantidade</label>'+stepFld("mfrLVNCount",state.lvnCount,1,8,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Labels</label><label class="dvl-switch"><input id="mfrLVNLabels" type="checkbox" '+(state.lvnLabels!==false?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Opacidade %</label>'+stepFld("mfrLVNOpacity",Math.round(state.lvnOpacity*100),10,100,5,0)+'</div>'
      +colorFld("mfrLVNBelowColor","LVN abaixo","lvnBelowColor")+colorFld("mfrLVNAboveColor","LVN acima","lvnAboveColor")
      +'<div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>'+dropFld("mfrLVNStyle",STYLE_OPTS,state.lvnLineStyle)+'</div><div class="dvl-vt-field"><label>Espessura</label>'+stepFld("mfrLVNWidth",state.lvnLineWidth,.5,5,.5,1)+'</div></div></div>';

    const boolMap={mfrOn:"on",mfrDeltaOn:"deltaOn",mfrExtend:"extendRight",mfrLabels:"labels",mfrPOC:"showPOC",mfrVAH:"showVAH",mfrVAL:"showVAL",mfrLVNOn:"lvnOn",mfrLVNLabels:"lvnLabels"};
    Object.keys(boolMap).forEach(id=>{const e=body.querySelector("#"+id);if(e)e.addEventListener("change",()=>{state[boolMap[id]]=!!e.checked;if(id==="mfrOn")updateRow();save();redraw();});});
    const stepMap={mfrWidth:["widthPct",.01],mfrOpacity:["opacity",.01],mfrVA:["valueAreaPct",.01],mfrRadius:["colRadius",1],mfrDeltaWidth:["deltaWidthPct",.01],mfrDeltaOpacity:["deltaOpacity",.01],mfrLineWidth:["lineWidth",1],mfrLVNCount:["lvnCount",1],mfrLVNOpacity:["lvnOpacity",.01],mfrLVNWidth:["lvnLineWidth",1]};
    function applyStep(id,shown){
      if(id==="mfrRowSize"){if(state.rowLayout==="ticks")state.ticksPerRow=Math.max(1,Math.min(100000,Math.round(shown)));else state.rows=Math.max(20,Math.min(300,Math.round(shown)));profileCache=null;save();redraw();return;}
      const m=stepMap[id];if(!m)return;state[m[0]]=shown*m[1];if(id==="mfrVA")profileCache=null;save();redraw();
    }
    body.querySelectorAll(".dvl-feb-step-btn").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.id;const min=+b.dataset.min,max=+b.dataset.max,st=+b.dataset.step,dec=+b.dataset.dec;let shown=+(body.querySelector("#"+id+"Val").textContent||0);shown=Math.max(min,Math.min(max,shown+(b.classList.contains("dvl-feb-step-inc")?st:-st)));body.querySelector("#"+id+"Val").textContent=dec?shown.toFixed(dec):String(Math.round(shown));applyStep(id,shown);}));
    body.querySelectorAll(".dvl-drop-btn").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();const l=body.querySelector("#"+btn.id+"List");body.querySelectorAll(".dvl-drop-list.is-open").forEach(x=>{if(x!==l)x.classList.remove("is-open");});l.classList.toggle("is-open");}));
    body.querySelectorAll(".dvl-drop-item").forEach(it=>it.addEventListener("click",e=>{e.stopPropagation();const list=it.closest(".dvl-drop-list"),id=list.id.replace("List",""),val=it.dataset.val,btn=body.querySelector("#"+id);if(btn){const n=[...btn.childNodes].find(x=>x.nodeType===3);if(n)n.textContent=it.textContent;}list.classList.remove("is-open");if(id==="mfrRowLayout"){state.rowLayout=val==="ticks"?"ticks":"rows";profileCache=null;save();renderPanel();redraw();return;}if(id==="mfrAnchor")state.anchorMode=val==="end"?"end":"origin";if(id==="mfrLineStyle")state.lineStyle=val;if(id==="mfrLVNStyle")state.lvnLineStyle=val;save();redraw();}));
    body.querySelectorAll(".dvl-feb-clr-swatch").forEach(b=>b.addEventListener("click",()=>openPalette(b,b.dataset.key)));
    body.addEventListener("pointerdown",e=>{if(!e.target.closest(".dvl-drop-wrap"))body.querySelectorAll(".dvl-drop-list.is-open").forEach(x=>x.classList.remove("is-open"));});
    const selBtn=body.querySelector("#mfrSelect");if(selBtn)selBtn.addEventListener("click",()=>{closePanel();startSelect();});
    const clrBtn=body.querySelector("#mfrClear");if(clrBtn)clrBtn.addEventListener("click",clearRange);
  }

  function updateRow(){const p=document.getElementById("dvlManualFRVPState");if(p){p.textContent=state.on?"ON":"OFF";p.classList.toggle("is-on",!!state.on);}updateFab();}
  // Botão flutuante: aparece quando o indicador está ON. Ícone de Volume
  // Profile abre a seleção de range; ✕ limpa. Arrastável (posição salva).
  // Some ao desativar o indicador.
  let fab=null,fabDrag=null,fabJustDragged=false;
  const FAB_POS_KEY="dvl_manual_frvp_fab_pos";
  // Ícone de Volume Profile: barras horizontais (POC = a mais longa).
  const VP_ICON='<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true"><g fill="currentColor"><rect x="3" y="3.5" width="8" height="2.3" rx="1.1"/><rect x="3" y="7.6" width="13" height="2.3" rx="1.1"/><rect x="3" y="11.7" width="18" height="2.3" rx="1.1"/><rect x="3" y="15.8" width="10" height="2.3" rx="1.1"/><rect x="3" y="19.9" width="5.5" height="2.3" rx="1.1"/></g></svg>';
  const CLEAR_ICON='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';
  function clampFab(){
    if(!fab)return;const r=fab.getBoundingClientRect();const m=6;
    if(r.width===0&&r.height===0)return; // escondido: sem dimensões, não dá pra clampar
    let left=parseFloat(fab.style.left),top=parseFloat(fab.style.top);
    if(!isFinite(left)||!isFinite(top))return;
    left=Math.max(m,Math.min(window.innerWidth-r.width-m,left));
    top=Math.max(m,Math.min(window.innerHeight-r.height-m,top));
    fab.style.left=left+"px";fab.style.top=top+"px";
  }
  function applyFabPos(){
    if(!fab)return;
    try{const p=JSON.parse(localStorage.getItem(FAB_POS_KEY)||"null");
      if(p&&isFinite(p.left)&&isFinite(p.top)){fab.style.left=p.left+"px";fab.style.top=p.top+"px";fab.style.right="auto";fab.style.bottom="auto";clampFab();}
    }catch(_){}
  }
  function ensureFab(){
    if(fab&&document.body.contains(fab))return;
    fab=document.createElement("div");fab.id="dvlManualFRVPFab";fab.setAttribute("data-dvl-ui","true");
    fab.innerHTML='<button type="button" class="dvl-mfrvp-fab-btn dvl-mfrvp-fab-sel" title="Selecionar range no gráfico (arraste para mover)" aria-label="Selecionar range">'+VP_ICON+'</button><button type="button" class="dvl-mfrvp-fab-btn dvl-mfrvp-fab-clear" title="Limpar range" aria-label="Limpar range">'+CLEAR_ICON+'</button>';
    document.body.appendChild(fab);
    applyFabPos();
    fab.addEventListener("pointerdown",onFabDown,true);
    fab.querySelector(".dvl-mfrvp-fab-sel").addEventListener("click",function(e){e.preventDefault();e.stopPropagation();if(fabJustDragged)return;startSelect();});
    fab.querySelector(".dvl-mfrvp-fab-clear").addEventListener("click",function(e){e.preventDefault();e.stopPropagation();if(fabJustDragged)return;clearRange();});
    window.addEventListener("resize",clampFab);
  }
  function onFabDown(e){
    e.stopPropagation();
    const r=fab.getBoundingClientRect();
    fabDrag={sx:e.clientX,sy:e.clientY,ox:r.left,oy:r.top,moved:false,pid:e.pointerId};
    window.addEventListener("pointermove",onFabMove,true);
    window.addEventListener("pointerup",onFabUp,true);
    window.addEventListener("pointercancel",onFabUp,true);
  }
  function onFabMove(e){
    if(!fabDrag)return;
    const dx=e.clientX-fabDrag.sx,dy=e.clientY-fabDrag.sy;
    if(!fabDrag.moved&&Math.abs(dx)+Math.abs(dy)<6)return;
    fabDrag.moved=true;fab.classList.add("is-dragging");
    e.preventDefault();e.stopPropagation();
    fab.style.left=(fabDrag.ox+dx)+"px";fab.style.top=(fabDrag.oy+dy)+"px";
    fab.style.right="auto";fab.style.bottom="auto";
  }
  function onFabUp(e){
    window.removeEventListener("pointermove",onFabMove,true);
    window.removeEventListener("pointerup",onFabUp,true);
    window.removeEventListener("pointercancel",onFabUp,true);
    if(fabDrag&&fabDrag.moved){
      clampFab();fab.classList.remove("is-dragging");
      try{localStorage.setItem(FAB_POS_KEY,JSON.stringify({left:parseFloat(fab.style.left),top:parseFloat(fab.style.top)}));}catch(_){}
      fabJustDragged=true;                       // ignora o 'click' que vem logo após o arrasto
      setTimeout(function(){fabJustDragged=false;},0);
    }
    fabDrag=null;
  }
  function updateFab(){
    try{
      ensureFab();
      const vis=!!state.on && !sel.active;
      fab.classList.toggle("is-on",vis);
      const clr=fab.querySelector(".dvl-mfrvp-fab-clear");
      if(clr)clr.classList.toggle("is-disabled",!hasRange());
      if(vis)clampFab(); // agora visível: garante que não ficou fora da tela
    }catch(_){}
  }
  function insertRow(){
    const menu=document.getElementById("indicatorDropdown");if(!menu)return;
    let item=document.getElementById("dvlManualFixedRangeVPItem");
    if(!item){
      item=document.createElement("div");item.id="dvlManualFixedRangeVPItem";item.className="indicatorItem";
      item.innerHTML='<span class="indicatorFxMark">FRM</span><span><b>Fixed Range VP · Manual</b><small>1 VP · range que você escolhe</small></span><i class="dvl-vt-state" id="dvlManualFRVPState">OFF</i>';
      const after=document.getElementById("dvlFixedRangeVPItem");
      if(after&&after.parentNode)after.parentNode.insertBefore(item,after.nextSibling);else menu.appendChild(item);
    }
    if(!item.dataset.bound){item.dataset.bound="1";const p=item.querySelector("#dvlManualFRVPState");if(p)p.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setOn(!state.on);});item.addEventListener("click",e=>{e.stopPropagation();openPanel();});}
    updateRow();
  }
  // Inserção resiliente: tenta agora e re-tenta até o menu de indicadores existir
  // (no build modular a ordem de carregamento não é garantida).
  function boot(){
    let tries=0;
    (function attempt(){
      insertRow();updateRow();
      if(document.getElementById("dvlManualFixedRangeVPItem"))return;
      if(tries++<60)setTimeout(attempt,250);
    })();
    try{
      const mo=new MutationObserver(()=>{ if(!document.getElementById("dvlManualFixedRangeVPItem"))insertRow(); });
      mo.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>{try{mo.disconnect();}catch(_){}} ,20000);
    }catch(_){}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  installEdgeDrag();

  /* ---------- registro do draw: WRAP resiliente à ORDEM de carga ---------- */
  /* draw() do MANUAL sempre roda depois do session Fixed Range VP, esteja ele
     definido antes OU depois deste módulo. Usa getter/setter para capturar
     qualquer atribuição futura de window.DVLFixedRangeVPDraw (ex.: o próprio
     script-0095 sendo carregado depois deste). */
  (function installWrap(){
    let inner=window.DVLFixedRangeVPDraw;
    function combined(ctx,cfg){
      if(typeof inner==="function"){try{inner(ctx,cfg);}catch(_){}}
      try{draw(ctx,cfg);}catch(e){try{console.warn("[DVL Manual Fixed Range VP]",e);}catch(_){}}
    }
    try{
      Object.defineProperty(window,"DVLFixedRangeVPDraw",{
        configurable:true,
        get(){return combined;},
        set(v){inner=v;}
      });
    }catch(_){
      const prev=(typeof inner==="function")?inner:null;
      window.DVLFixedRangeVPDraw=function(ctx,cfg){
        if(prev){try{prev(ctx,cfg);}catch(_){}}
        try{draw(ctx,cfg);}catch(e){try{console.warn("[DVL Manual Fixed Range VP]",e);}catch(_){}}
      };
    }
  })();

  window.DVLManualFixedRangeVP={version:"1.390",on,setOn,openPanel,startSelect,clearRange,get state(){return Object.assign({},state);}};
})();
