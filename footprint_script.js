// ════════════════════════════════════════════════════════════════
//  FOOTPRINT CANDLES — script completo
//  DepthVisionLab v106
// ════════════════════════════════════════════════════════════════

// ── Settings reader ──────────────────────────────────────────────
function fpCfg(){
  return{
    detail:     (el('fpDetail')?.value)||'auto',
    mode:       (el('fpMode')?.value)||'all',
    minCov:     clamp(+(el('fpMinCov')?.value)||0.15,0,1),
    rowThresh:  clamp(+(el('fpRowThresh')?.value)||8,0,50)/100,
    imbalRatio: Math.max(1.2,+(el('fpImbalRatio')?.value)||2.5),
    showStacked:el('fpShowStacked')?el('fpShowStacked').checked:true,
    stackedMin: Math.max(2,+(el('fpStackedMin')?.value)||2),
    requireReal:el('fpRequireReal')?el('fpRequireReal').checked:true,
    showWickAbs:el('fpWickAbs')?el('fpWickAbs').checked:true,
    wickMinPct:  clamp(+(el('fpWickMinPct')?.value)||30,5,80)/100,
    maxFpScale:  Math.max(1,+(el('fpMaxScale')?.value)||3)
  };
}

// ── Coverage category (real / partial / synthetic) ───────────────
function getCovCategory(c){
  const cov=candleTradeCoverage(c);
  if(cov>=0.35)return{cat:'real',    cov,alpha:1.00};
  if(cov>=0.10)return{cat:'partial', cov,alpha:0.62};
  return        {cat:'synthetic',    cov,alpha:0.35};
}

// ── Shape-based buy-pressure estimate (fallback quando não há FP real) ──
function footprintPressure(c){
  const range=Math.max(1e-9,c.h-c.l),body=(c.c-c.o)/range,closePos=(c.c-c.l)/range;
  let br=0.50+body*0.35+(closePos-0.5)*0.22;
  if((c.buy+c.sell)>0)br=br*0.35+(c.buy/(c.buy+c.sell))*0.65;
  return clamp(br,0.12,0.88);
}

// ── Coverage fraction ─────────────────────────────────────────────
function candleTradeCoverage(c){
  const fpTotal=[...c.fp.values()].reduce((a,r)=>a+(+r.buy||0)+(+r.sell||0),0);
  const v=Math.max(0,+c.v||0);
  return v>0?fpTotal/v:0;
}

// ── Continuous price ladder ───────────────────────────────────────
// Sempre retorna exatamente n rows de c.h até c.l; buckets vazios inclusos.
// Formato: [centerPrice, {buy, sell, synthetic, empty, lowConf?}]
function _buildLadder(c,maxRows){
  const n=clamp(Math.round(maxRows),4,36);
  const range=Math.max(1e-9,c.h-c.l);
  const step=range/n;
  const buckets=Array.from({length:n},(_,i)=>{
    const cp=c.h-(i+0.5)*step;
    return[cp,{buy:0,sell:0,synthetic:false,empty:true}];
  });
  let fpTotal=0;
  if(c.fp&&c.fp.size>0){
    for(const[p,r] of c.fp){
      const price=+p;
      if(!isFinite(price))continue;
      const bi=clamp(Math.floor((c.h-price)/step),0,n-1);
      const bkt=buckets[bi][1];
      bkt.buy+=(+r.buy||0);bkt.sell+=(+r.sell||0);
      bkt.empty=false;fpTotal+=(+r.buy||0)+(+r.sell||0);
    }
  }
  const candleVol=Math.max(0,+c.v||0);
  if(fpTotal<candleVol*0.035){
    // Distribuição sintética em todos os buckets
    const buyRatio=footprintPressure(c),bodyMid=(c.o+c.c)/2,close=c.c;
    let wsum=0;
    const ws=buckets.map(([cp])=>{
      const dBody=Math.abs(cp-bodyMid)/range,dClose=Math.abs(cp-close)/range;
      const w=0.45+Math.exp(-dBody*5.5)*1.2+Math.exp(-dClose*8)*.75;
      wsum+=w;return w;
    });
    buckets.forEach(([cp,r],i)=>{
      const vol=candleVol*ws[i]/Math.max(1e-9,wsum);
      const rowBias=(cp-c.l)/range-.5;
      const lb=clamp(buyRatio+rowBias*(c.c>=c.o?.10:-.10),.08,.92);
      r.buy=vol*lb;r.sell=vol*(1-lb);r.synthetic=true;r.empty=false;
    });
  }else if(candleVol>0&&fpTotal>0){
    const maxScale=Math.max(1,+(el('fpMaxScale')?.value)||3);
    const k=clamp(candleVol/fpTotal,0.18,maxScale);
    const lowConf=(candleVol/fpTotal)>maxScale;
    for(const[,r] of buckets){if(!r.empty){r.buy*=k;r.sell*=k;if(lowConf)r.lowConf=true;}}
  }
  return buckets;
}

// ── Cached FP rows ────────────────────────────────────────────────
function getCachedFPRows(c,maxRows){
  const key=maxRows+'|'+(c.fp?.size||0)+'|'+Math.round((c.buy||0)*1e4)+'|'+Math.round((c.sell||0)*1e4)+'|'+Math.round((c.v||0)*1e4)+'|'+(c.__fpVer||0);
  if(!c.__fpRowsCache)c.__fpRowsCache=Object.create(null);
  if(c.__fpRowsCache[key])return c.__fpRowsCache[key];
  return(c.__fpRowsCache[key]=_buildLadder(c,maxRows));
}

// Backwards-compat alias (usado por HVN Reactions IIFE e custom code)
function normalizedFootprintRows(c,maxRows=18){return getCachedFPRows(c,maxRows);}

// ── Per-row imbalance + stacked runs ─────────────────────────────
function computeRowImbalances(rows,imbalRatio){
  const result=rows.map(([_,r])=>{
    const tot=r.buy+r.sell;
    if(!tot)return{flag:null,synthetic:r.synthetic,stackRun:0,stackDir:null};
    const br=r.buy/Math.max(1e-9,r.sell),sr=r.sell/Math.max(1e-9,r.buy);
    return{flag:br>=imbalRatio?'bull':sr>=imbalRatio?'bear':null,synthetic:r.synthetic,stackRun:0,stackDir:null};
  });
  let runDir=null,runLen=0;
  for(let i=0;i<result.length;i++){
    const f=result[i].flag;
    if(f&&f===runDir)runLen++;else{runDir=f;runLen=f?1:0;}
    result[i].stackRun=runLen;result[i].stackDir=runDir;
  }
  return result;
}

// ── footprintStatsInZone — utility para HVN Reactions ─────────────
function footprintStatsInZone(c,zoneLo,zoneHi){
  const rows=getCachedFPRows(c,40);
  const cov=candleTradeCoverage(c);
  const fpc=fpCfg();
  const zoneRows=rows.filter(([p])=>p>=zoneLo&&p<=zoneHi);
  let buy=0,sell=0,maxBuyRow=0,maxSellRow=0,imbalanceRows=0,stackedBuy=0,stackedSell=0,runBuy=0,runSell=0;
  for(const[_,r]of zoneRows){
    buy+=r.buy;sell+=r.sell;
    if(r.buy>maxBuyRow)maxBuyRow=r.buy;
    if(r.sell>maxSellRow)maxSellRow=r.sell;
    const tot=r.buy+r.sell;
    if(tot>0){
      const br=r.buy/Math.max(1e-9,r.sell),sr=r.sell/Math.max(1e-9,r.buy);
      if(br>=fpc.imbalRatio){imbalanceRows++;runBuy++;runSell=0;}
      else if(sr>=fpc.imbalRatio){imbalanceRows++;runSell++;runBuy=0;}
      else{runBuy=0;runSell=0;}
    }
    stackedBuy=Math.max(stackedBuy,runBuy);stackedSell=Math.max(stackedSell,runSell);
  }
  const total=buy+sell;
  const allSyn=!zoneRows.length||zoneRows.every(([,r])=>r.synthetic);
  return{buy,sell,total,delta:buy-sell,
    buyShare:total?buy/total:0.5,sellShare:total?sell/total:0.5,
    maxBuyRow,maxSellRow,imbalanceRows,stackedBuy,stackedSell,
    coverage:cov,real:cov>=0.10&&!allSyn};
}
window.footprintStatsInZone=footprintStatsInZone;

// ── Region stats: terço superior / meio / inferior ────────────────
function footprintRegionStats(c){
  const range=Math.max(1e-9,c.h-c.l);
  const topLo=c.h-range/3,botHi=c.l+range/3;
  const cov=candleTradeCoverage(c);
  const real=cov>=0.10;
  const rows=getCachedFPRows(c,24);
  const reg={top:{buy:0,sell:0},mid:{buy:0,sell:0},bot:{buy:0,sell:0}};
  for(const[p,r] of rows){
    const zone=p>=topLo?'top':p<=botHi?'bot':'mid';
    reg[zone].buy+=r.buy;reg[zone].sell+=r.sell;
  }
  for(const z of Object.values(reg)){
    z.total=z.buy+z.sell;z.delta=z.buy-z.sell;
    z.buyShare=z.total?z.buy/z.total:0.5;z.sellShare=z.total?z.sell/z.total:0.5;
  }
  return{...reg,coverage:cov,real};
}

// ── Wick absorption detector ──────────────────────────────────────
// Retorna {upper, lower, storyLabel, upperWick, lowerWick, closePos}
//
// Labels:
//   B.TRAP   — pavio alto + compra no topo + preço rejeitado (compradores presos)
//   SELL ABS — pavio alto + venda absorbeu no topo
//   S.TRAP   — pavio baixo + venda no fundo + preço rejeitado (vendedores presos)
//   BUY ABS  — pavio baixo + compra absorbeu no fundo
//   BOTH ABS — absorção nos dois pavios
function detectWickAbsorption(c,regions,fpc){
  const range=Math.max(1e-9,c.h-c.l);
  const upperWick=(c.h-Math.max(c.o,c.c))/range;
  const lowerWick=(Math.min(c.o,c.c)-c.l)/range;
  const closePos=(c.c-c.l)/range;
  const minWick=fpc.wickMinPct;
  const cov=regions.coverage;
  const canSignal=!fpc.requireReal||cov>=0.10;

  let upper=false,lower=false;
  if(canSignal&&upperWick>=minWick&&closePos<=0.55){
    if(regions.top.total>0)upper=true;
  }
  if(canSignal&&lowerWick>=minWick&&closePos>=0.45){
    if(regions.bot.total>0)lower=true;
  }

  let storyLabel=null;
  if(upper&&lower)      {storyLabel='BOTH ABS';}
  else if(upper)        {storyLabel=regions.top.buyShare>=0.52?'B.TRAP':'SELL ABS';}
  else if(lower)        {storyLabel=regions.bot.sellShare>=0.52?'S.TRAP':'BUY ABS';}
  return{upper,lower,storyLabel,upperWick,lowerWick,closePos};
}
window.footprintRegionStats=footprintRegionStats;

// ════════════════════════════════════════════════════════════════
//  DRAW FUNCTIONS
// ════════════════════════════════════════════════════════════════

// ── Mini tier: delta overlay somente ────────────────────────────
function _fpDrawMini(ctx,c,rows,xx,top,bot,hh,bw,realDelta,covAlpha){
  const w=Math.max(6,bw*.82),left=xx-w/2;
  const buyTot=rows.reduce((a,[_,r])=>a+r.buy,0),sellTot=rows.reduce((a,[_,r])=>a+r.sell,0);
  const total=Math.max(1,buyTot+sellTot);
  ctx.globalAlpha=covAlpha;
  ctx.fillStyle='rgba(5,9,20,.65)';ctx.fillRect(left,top,w,hh);
  ctx.strokeStyle=realDelta>=0?'rgba(0,200,150,.65)':'rgba(255,115,45,.65)';ctx.lineWidth=1.1;ctx.strokeRect(left,top,w,hh);
  const mid=top+hh*(sellTot/total);
  ctx.fillStyle='rgba(255,115,45,.15)';ctx.fillRect(left+1,top,w-2,Math.max(1,mid-top));
  ctx.fillStyle='rgba(0,200,150,.15)';ctx.fillRect(left+1,mid,w-2,Math.max(1,bot-mid));
  ctx.globalAlpha=1;
}

// ── Normal tier: escada contínua + barras, sem texto ────────────
function _fpDrawNormal(ctx,c,rows,xx,top,bot,hh,bw,maxRow,realDelta,covAlpha,fpc,sc){
  const boxW=clamp(bw*2.5,44,100),left=xx-boxW/2;
  const n=rows.length,rowH=hh/Math.max(1,n);
  ctx.globalAlpha=covAlpha;
  ctx.fillStyle='rgba(5,9,20,.75)';ctx.fillRect(left,top,boxW,hh);
  ctx.strokeStyle=realDelta>=0?'rgba(0,195,140,.45)':'rgba(220,90,45,.45)';ctx.lineWidth=.9;ctx.strokeRect(left,top,boxW,hh);
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,bot);ctx.stroke();
  const imbs=computeRowImbalances(rows,fpc.imbalRatio);
  const halfW=boxW/2-2,mid=left+boxW/2;
  rows.forEach(([,r],ri)=>{
    const ry=top+ri*rowH;
    if(r.empty){
      ctx.fillStyle='rgba(20,30,50,.22)';ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);
      return;
    }
    const tot=r.buy+r.sell,pwr=clamp(tot/maxRow,0,1);
    if(pwr<fpc.rowThresh*.5){
      ctx.fillStyle='rgba(20,30,50,.28)';ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);
      return;
    }
    const fa=clamp(.14+pwr*.36,.10,.58);
    ctx.fillStyle=`rgba(255,115,45,${fa})`;ctx.fillRect(left+1,ry+1,clamp(r.sell/Math.max(1e-9,tot),0,1)*halfW,rowH-2);
    ctx.fillStyle=`rgba(0,200,150,${fa})`;ctx.fillRect(mid,ry+1,clamp(r.buy/Math.max(1e-9,tot),0,1)*halfW,rowH-2);
    const imb=imbs[ri];
    if(imb?.flag&&!r.synthetic){
      ctx.fillStyle=imb.flag==='bull'?'rgba(0,212,212,.55)':'rgba(240,110,35,.55)';
      ctx.fillRect(left+1,ry,boxW-2,2);
    }
    if(fpc.showStacked&&imb?.stackRun>=fpc.stackedMin&&imb.stackDir&&!r.synthetic){
      ctx.fillStyle=imb.stackDir==='bull'?'rgba(0,220,220,.42)':'rgba(255,100,35,.42)';
      ctx.fillRect(imb.stackDir==='bull'?left+boxW-4:left+1,ry,3,rowH);
    }
  });
  ctx.globalAlpha=1;
  _fpDrawSpine(ctx,c,xx,top,bot,sc);
}

// ── Full tier: escada contínua com números + wick absorption ─────
function _fpDrawFull(ctx,c,rows,xx,top,bot,hh,bw,maxRow,realDelta,covAlpha,fpc,sc,wickAbs){
  const boxW=clamp(bw*2.75,54,116),left=xx-boxW/2;
  const n=rows.length,rowH=hh/Math.max(1,n);
  const fontSize=rowH>=13?9:rowH>=9?8:7;
  const canShowText=rowH>=6;
  ctx.globalAlpha=covAlpha;
  ctx.fillStyle='rgba(5,9,20,.78)';ctx.fillRect(left,top,boxW,hh);
  ctx.strokeStyle=realDelta>=0?'rgba(0,180,130,.55)':'rgba(210,85,45,.55)';ctx.lineWidth=.95;ctx.strokeRect(left,top,boxW,hh);
  ctx.strokeStyle='rgba(255,255,255,.10)';ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,bot);ctx.stroke();
  const imbs=computeRowImbalances(rows,fpc.imbalRatio);
  const halfW=boxW/2-2,mid=left+boxW/2;
  const range=Math.max(1e-9,c.h-c.l);
  const topThird=c.h-range/3,botThird=c.l+range/3;
  rows.forEach(([price,r],ri)=>{
    const ry=top+ri*rowH;
    const yc=ry+rowH*.5;
    const inUpper=!!(wickAbs?.upper&&price>=topThird);
    const inLower=!!(wickAbs?.lower&&price<=botThird);
    if(r.empty){
      if(inUpper)      {ctx.fillStyle='rgba(255,110,35,.15)'; ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);}
      else if(inLower) {ctx.fillStyle='rgba(0,200,230,.10)';  ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);}
      else             {ctx.fillStyle='rgba(5,9,20,.50)';     ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);}
      ctx.strokeStyle='rgba(30,42,64,.28)';ctx.lineWidth=.3;ctx.strokeRect(left+1,ry,boxW-2,rowH-0.5);
      return;
    }
    const tot=r.buy+r.sell,pwr=clamp(tot/maxRow,0,1);
    const isWeak=pwr<fpc.rowThresh;
    const imbal=(r.buy-r.sell)/Math.max(1e-9,tot);
    const baseAlpha=clamp(.10+pwr*.42,.10,.60);
    ctx.fillStyle='rgba(5,9,20,.70)';ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);
    if(!isWeak){
      ctx.fillStyle=imbal>=0?`rgba(0,200,150,${baseAlpha})`:`rgba(255,115,45,${baseAlpha})`;
      ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);
    }
    // Tint de zona de absorção
    if(inUpper){
      const ta=clamp(.18+pwr*.22,.14,.44);
      ctx.fillStyle=`rgba(255,110,35,${ta})`;ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);
    }else if(inLower){
      const ta=clamp(.18+pwr*.22,.14,.44);
      ctx.fillStyle=`rgba(0,210,240,${ta})`;ctx.fillRect(left+1,ry,boxW-2,rowH-0.5);
    }
    if(tot>0){
      const fa=isWeak?clamp(.08+pwr*.20,.06,.28):clamp(.20+pwr*.40,.18,.68);
      ctx.fillStyle=`rgba(255,115,45,${fa})`;ctx.fillRect(left+1,ry+1,clamp(r.sell/tot,0,1)*halfW,rowH-2);
      ctx.fillStyle=`rgba(0,200,150,${fa})`;ctx.fillRect(mid,ry+1,clamp(r.buy/tot,0,1)*halfW,rowH-2);
    }
    ctx.strokeStyle='rgba(30,42,64,.55)';ctx.lineWidth=.4;ctx.strokeRect(left+1,ry,boxW-2,rowH-0.5);
    ctx.strokeStyle='rgba(80,100,140,.40)';ctx.beginPath();ctx.moveTo(mid,ry);ctx.lineTo(mid,ry+rowH-0.5);ctx.stroke();
    if(canShowText&&tot>0){
      const sellCol=r.sell>r.buy
        ?(isWeak?`rgba(255,130,70,${clamp(.5+pwr*.5,.45,.95)}`:'rgba(255,130,70,1)')
        :(isWeak?`rgba(130,140,160,${clamp(.35+pwr*.3,.30,.65)}`:'rgba(160,170,190,.80)');
      const buyCol=r.buy>r.sell
        ?(isWeak?`rgba(0,210,150,${clamp(.5+pwr*.5,.45,.95)}`:'rgba(0,220,160,1)')
        :(isWeak?`rgba(130,140,160,${clamp(.35+pwr*.3,.30,.65)}`:'rgba(160,170,190,.80)');
      ctx.font=`bold ${fontSize}px monospace`;
      ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=isWeak?2:3;
      ctx.textAlign='center';
      ctx.fillStyle=sellCol;ctx.fillText(fmtVolClean(r.sell*price),left+boxW*.25,yc+.5);
      ctx.fillStyle=buyCol; ctx.fillText(fmtVolClean(r.buy*price), left+boxW*.75,yc+.5);
      ctx.shadowBlur=0;
    }
    const imb=imbs[ri];
    if(imb?.flag&&!r.synthetic){
      ctx.fillStyle=imb.flag==='bull'?'rgba(0,212,212,.55)':'rgba(240,110,35,.55)';
      ctx.fillRect(left+2,ry,boxW-4,2);
    }
    if(fpc.showStacked&&imb?.stackRun>=fpc.stackedMin&&imb.stackDir&&!r.synthetic){
      ctx.fillStyle=imb.stackDir==='bull'?'rgba(0,220,220,.40)':'rgba(255,100,35,.40)';
      ctx.fillRect(imb.stackDir==='bull'?left+boxW-4:left+1,ry,3,rowH);
    }
  });
  ctx.globalAlpha=1;
  _fpDrawSpine(ctx,c,xx,top,bot,sc);
  if(boxW>62){
    const footerA=candleTradeCoverage(c)>=0.10?1:0.45;
    ctx.globalAlpha=footerA;ctx.font='bold 9px monospace';ctx.textAlign='center';
    ctx.fillStyle='rgba(5,9,20,.92)';ctx.fillRect(left,bot+2,boxW,15);
    const story=wickAbs?.storyLabel;
    if(story){
      // B.TRAP=amber  SELL ABS=orange  S.TRAP=purple  BUY ABS=cyan  BOTH ABS=yellow
      const lc=story==='BUY ABS' ?'#00d4ff'
               :story==='SELL ABS'?'#ff7832'
               :story==='B.TRAP'  ?'#ff9a3c'
               :story==='S.TRAP'  ?'#c87cff'
               :'#e0c040';
      ctx.strokeStyle=lc+'bb';ctx.lineWidth=1.1;ctx.strokeRect(left,bot+2,boxW,15);
      ctx.shadowColor='rgba(0,0,0,.90)';ctx.shadowBlur=3;
      ctx.fillStyle=lc;ctx.fillText(story,xx,bot+11);
      ctx.shadowBlur=0;
    }else{
      ctx.strokeStyle=realDelta>=0?'rgba(0,175,120,.65)':'rgba(200,80,45,.65)';ctx.lineWidth=.7;ctx.strokeRect(left,bot+2,boxW,15);
      ctx.shadowColor='rgba(0,0,0,.90)';ctx.shadowBlur=2;
      ctx.fillStyle=realDelta>=0?'#00d494':'#ff7832';
      ctx.fillText('Δ '+(realDelta>=0?'+':'')+fmtVolClean(Math.abs(realDelta)*c.c),xx,bot+11);
      ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1;
  }
  if(covAlpha<0.60){
    ctx.globalAlpha=.35;ctx.font='7px monospace';ctx.textAlign='left';
    ctx.fillStyle='rgba(200,200,200,1)';ctx.fillText('~',left+2,top+7);
    ctx.globalAlpha=1;
  }
}

// ── Shared spine draw ────────────────────────────────────────────
function _fpDrawSpine(ctx,c,xx,top,bot,sc){
  const bull=c.c>=c.o,col=bull?'#00d494':'#ff7832';
  ctx.strokeStyle=col;ctx.lineWidth=2.1;
  ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,bot);ctx.stroke();
  const yt=sc.y(Math.max(c.o,c.c)),yb=sc.y(Math.min(c.o,c.c));
  ctx.fillStyle='rgba(5,9,20,.65)';ctx.fillRect(xx-2,yt,4,Math.max(2,yb-yt));
  ctx.strokeStyle=col;ctx.strokeRect(xx-2,yt,4,Math.max(2,yb-yt));
}

// ── Main draw entry point ────────────────────────────────────────
function drawFootprint(ctx,V,sc,x,bw){
  const fpc=fpCfg();
  const lastLimit=fpc.mode==='last'?90:9999;
  ctx.save();
  ctx.textAlign='center';ctx.textBaseline='middle';
  V.cs.forEach((c,j)=>{
    const i=V.a+j,xx=x(i),top=sc.y(c.h),bot=sc.y(c.l),hh=Math.max(2,bot-top);
    const covInfo=getCovCategory(c);
    const realDelta=(+c.buy||0)-(+c.sell||0);
    let tier;
    if(fpc.detail==='minimal')       tier='mini';
    else if(fpc.detail==='full')     tier=hh>=45?'full':'normal';
    else if(fpc.detail==='balanced') tier=hh>=30?'normal':'mini';
    else                             tier=(bw<18||hh<45)?'mini':bw<42?'normal':'full';
    if(V.n>lastLimit&&tier==='full') tier='normal';
    const mr=tier==='full'  ?Math.max(8,Math.min(22,Math.floor(hh/9)))
             :tier==='normal'?Math.max(6,Math.min(16,Math.floor(hh/10)))
             :8;
    const rows=getCachedFPRows(c,mr);
    const maxRow=Math.max(1,...rows.map(([_,r])=>r.buy+r.sell));
    if(tier==='mini')
      _fpDrawMini(ctx,c,rows,xx,top,bot,hh,bw,realDelta,covInfo.alpha);
    else if(tier==='normal')
      _fpDrawNormal(ctx,c,rows,xx,top,bot,hh,bw,maxRow,realDelta,covInfo.alpha,fpc,sc);
    else{
      const wickAbs=fpc.showWickAbs?detectWickAbsorption(c,footprintRegionStats(c),fpc):null;
      _fpDrawFull(ctx,c,rows,xx,top,bot,hh,bw,maxRow,realDelta,covInfo.alpha,fpc,sc,wickAbs);
    }
  });
  ctx.fillStyle='rgba(0,212,255,.82)';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='9px monospace';
  ctx.fillText('FOOTPRINT · ESQ=S / DIR=B · volume em USDT',PL+6,PT+25);
  ctx.restore();
}
