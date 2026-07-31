(function(){
  "use strict";

  const STORE_KEY="dvl_fixed_range_vp_v2";
  const LEGACY_STORE_KEY="dvl_fixed_range_vp_v1";
  const DEFAULTS={
    on:false,
    profiles:4,
    sessionType:"newyork",
    timezone:"America/New_York",
    startH:9,startM:30,endH:16,endM:0,
    includeCurrent:true,
    extendProfile2:false,
    extendProfile3:false,
    extendProfile4:false,
    extendProfile5:false,
    rows:100,
    rowLayout:"rows",
    ticksPerRow:2,
    widthPct:0.32,
    placement:"right",
    anchorMode:"origin",
    profileColor:"#38e0ff",
    opacity:0.42,
    valueAreaPct:0.70,
    colRadius:1,
    deltaOn:false,
    deltaWidthPct:0.24,
    deltaOpacity:0.78,
    deltaBuyColor:"#13dc8d",
    deltaSellColor:"#ff4a61",
    lvnOn:true,
    lvnCount:2,
    lvnLabels:true,
    lvnExtendOn:false,
    lvnExtendProfiles:2,
    lvnBelowColor:"#f3c768",
    lvnAboveColor:"#3fa9ff",
    lvnLineStyle:"dotted",
    lvnLineWidth:1.0,
    lvnOpacity:0.88,
    showPOC:true,showVAH:true,showVAL:true,
    colorPOC:"#f3c768",colorVAH:"#13dc8d",colorVAL:"#ff4a61",
    lineStyle:"dashed",lineWidth:1.4,
    labels:false,labelFontPx:8,
    overnightOn:false,
    ovLines:true,ovLineStyle:"dotted",ovLineWidth:1.0
  };

  let state=Object.assign({},DEFAULTS);
  try{
    const savedV2=localStorage.getItem(STORE_KEY);
    if(savedV2){
      Object.assign(state,JSON.parse(savedV2)||{});
    }else{
      // Beta 1.341 — não importa sessão, timezone nem horários da chave antiga.
      // Somente preferências visuais seguras são reaproveitadas.
      const legacy=JSON.parse(localStorage.getItem(LEGACY_STORE_KEY)||"{}")||{};
      const safeVisualKeys=[
        "on","profiles","extendProfile2","extendProfile3","extendProfile4","extendProfile5",
        "rows","rowLayout","ticksPerRow","widthPct","placement","profileColor","opacity","valueAreaPct","colRadius",
        "deltaOn","deltaWidthPct","deltaOpacity","deltaBuyColor","deltaSellColor",
        "lvnOn","lvnCount","lvnLabels","lvnExtendOn","lvnExtendProfiles",
        "lvnBelowColor","lvnAboveColor","lvnLineStyle","lvnLineWidth","lvnOpacity",
        "showPOC","showVAH","showVAL","colorPOC","colorVAH","colorVAL",
        "lineStyle","lineWidth","labels","labelFontPx","overnightOn",
        "ovLines","ovLineStyle","ovLineWidth"
      ];
      for(const k of safeVisualKeys)if(Object.prototype.hasOwnProperty.call(legacy,k))state[k]=legacy[k];
      state.__frvp1341Isolated=1;
      localStorage.setItem(STORE_KEY,JSON.stringify(state));
    }
    // A chave v1 era compartilhada por todos os HTMLs. Limpá-la uma vez faz
    // versões antigas voltarem aos defaults, em vez de herdarem horários errados.
    if(localStorage.getItem("dvl_frvp_v1_cleaned_1341")!=="1"){
      localStorage.removeItem(LEGACY_STORE_KEY);
      localStorage.setItem("dvl_frvp_v1_cleaned_1341","1");
    }
  }catch(_){}
  // Beta 1.301 — colunas mais retas, sem perder a personalização.
  if(state.__frvp1301RadiusMig!==1){state.colRadius=1;state.__frvp1301RadiusMig=1;try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(_){}}
  else state.colRadius=Math.max(0,Math.min(3,+state.colRadius||0));
  delete state.ovWidthPct; delete state.ovOpacity;
  state.profiles=Math.max(1,Math.min(5,Math.round(+state.profiles)||4));
  state.rowLayout=state.rowLayout==="ticks"?"ticks":"rows";
  state.anchorMode=state.anchorMode==="end"?"end":"origin";
  state.ticksPerRow=Math.max(1,Math.min(100000,Math.round(+state.ticksPerRow)||2));
  state.lvnExtendProfiles=Math.max(1,Math.min(4,Math.round(+state.lvnExtendProfiles)||2));
  function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(_){}}
  function resetState(){state=Object.assign({},DEFAULTS);save();clearCaches();updateRow();if(typeof drawSoon==="function")drawSoon();renderPanel();}
  function on(){return !!state.on;}
  function setOn(v){state.on=!!v;save();updateRow();if(typeof drawSoon==="function")drawSoon();}

  const SESSION_OPTS=[
    ["daily","Daily"],["weekly","Weekly"],["asia","Asia"],["london","London"],
    ["newyork","New York"],["overnight","Overnight"],["custom","Custom"]
  ];
  const TZ_OPTS=[
    ["UTC","UTC"],["Local","Local"],["Europe/Brussels","Bruxelas"],
    ["Europe/London","London"],["America/New_York","New York"]
  ];
  const STYLE_OPTS=[["solid","Sólida"],["dashed","Tracejada"],["dotted","Pontilhada"],["dashdot","Traço-ponto"]];
  const PLACE_OPTS=[["right","Direita"],["left","Esquerda"]];
  const ANCHOR_OPTS=[["origin","Candle inicial"],["end","Candle final"]];
  const ROW_LAYOUT_OPTS=[["rows","Number of Rows"],["ticks","Ticks Per Row"]];
  const PALETTE=["#10df77","#13dc8d","#2ee6a6","#38e0ff","#3fa9ff","#1e6bff","#7fb8ff","#00c2d1","#f3c768","#ffcf5a","#ff9f43","#ff4a61","#ff6b8f","#b86cff","#9a5cff","#ffffff","#c0c0c0"];

  const INTERVALS=[
    {v:"1m",ms:60000},{v:"3m",ms:180000},{v:"5m",ms:300000},{v:"15m",ms:900000},
    {v:"30m",ms:1800000},{v:"1h",ms:3600000},{v:"2h",ms:7200000},{v:"4h",ms:14400000},
    {v:"6h",ms:21600000},{v:"8h",ms:28800000},{v:"12h",ms:43200000},{v:"1d",ms:86400000}
  ];

  let dataCache=null;
  let dataFetching=false;
  let profileCache=null;
  // Último pacote completo aceito fora de pan/zoom. O Fixed Range nunca troca
  // cálculo, sessão ou âncora no meio de um gesto de câmera.
  let lastStableProfileItems=null;
  function clearCaches(){dataCache=null;profileCache=null;lastStableProfileItems=null;dataFetching=false;}

  function resolveTZ(z){
    if(z==="Local"){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";}catch(_){return "UTC";}}
    return z||"UTC";
  }
  function tzParts(tz,at){
    try{
      const f=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour12:false,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
      const m={};f.formatToParts(new Date(at)).forEach(p=>{if(p.type!=="literal")m[p.type]=+p.value;});
      return {y:m.year,mo:m.month,d:m.day,h:m.hour===24?0:m.hour,mi:m.minute,s:m.second};
    }catch(_){const d=new Date(at);return {y:d.getUTCFullYear(),mo:d.getUTCMonth()+1,d:d.getUTCDate(),h:d.getUTCHours(),mi:d.getUTCMinutes(),s:d.getUTCSeconds()};}
  }
  function tzOffsetMs(tz,at){const p=tzParts(tz,at);return Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi,p.s)-at;}
  function localToTs(tz,y,mo,d,h,mi){
    const naive=Date.UTC(y,mo-1,d,h,mi);let off=tzOffsetMs(tz,naive);let ts=naive-off;
    const p=tzParts(tz,ts);
    if(p.y!==y||p.mo!==mo||p.d!==d||p.h!==h||p.mi!==mi){off=tzOffsetMs(tz,ts);ts=naive-off;}
    return ts;
  }
  function dateShift(y,mo,d,days){const q=new Date(Date.UTC(y,mo-1,d)+days*86400000);return {y:q.getUTCFullYear(),mo:q.getUTCMonth()+1,d:q.getUTCDate()};}

  function applyPreset(type){
    if(type==="daily"){state.timezone="UTC";state.startH=0;state.startM=0;state.endH=0;state.endM=0;state.anchorMode="origin";}
    else if(type==="asia"){state.timezone="UTC";state.startH=0;state.startM=0;state.endH=8;state.endM=0;}
    else if(type==="london"){state.timezone="Europe/London";state.startH=8;state.startM=0;state.endH=16;state.endM=30;}
    else if(type==="newyork"){state.timezone="America/New_York";state.startH=9;state.startM=30;state.endH=16;state.endM=0;}
    else if(type==="overnight"){state.timezone="America/New_York";state.startH=18;state.startM=0;state.endH=9;state.endM=30;}
    else if(type==="weekly"){state.timezone="UTC";}
  }

  function dayWindow(tz,date,spec){
    const s=localToTs(tz,date.y,date.mo,date.d,spec.sh,spec.sm);
    let endDate=date;
    const crosses=(spec.eh*60+spec.em)<=(spec.sh*60+spec.sm);
    if(crosses)endDate=dateShift(date.y,date.mo,date.d,1);
    const e=localToTs(tz,endDate.y,endDate.mo,endDate.d,spec.eh,spec.em);
    return {start:s,end:e};
  }
  function weeklyWindows(now,count,includeCurrent,tz){
    const p=tzParts(tz,now);const localUTC=Date.UTC(p.y,p.mo-1,p.d);const dow=new Date(localUTC).getUTCDay();
    const monday=dateShift(p.y,p.mo,p.d,-((dow+6)%7));const out=[];
    for(let i=0;i<count+3;i++){
      const d0=dateShift(monday.y,monday.mo,monday.d,-7*i);const d1=dateShift(d0.y,d0.mo,d0.d,7);
      const start=localToTs(tz,d0.y,d0.mo,d0.d,0,0),end=localToTs(tz,d1.y,d1.mo,d1.d,0,0);
      if((includeCurrent?start<=now:end<=now))out.push({start,end,effectiveEnd:Math.min(end,now),labelDate:d0});
      if(out.length>=count)break;
    }
    return out;
  }
  function sessionWindows(now){
    const count=Math.max(1,Math.min(5,Math.round(state.profiles)||4));
    const tz=resolveTZ(state.timezone);
    if(state.sessionType==="weekly")return weeklyWindows(now,count,state.includeCurrent!==false,tz);
    const p=tzParts(tz,now);const spec={sh:+state.startH||0,sm:+state.startM||0,eh:+state.endH||0,em:+state.endM||0};
    const out=[];
    for(let i=0;i<count+8;i++){
      const d=dateShift(p.y,p.mo,p.d,-i);const w=dayWindow(tz,d,spec);
      if((state.includeCurrent!==false?w.start<=now:w.end<=now))out.push({start:w.start,end:w.end,effectiveEnd:Math.min(w.end,now),labelDate:d});
      if(out.length>=count)break;
    }
    return out;
  }
  // Overnight oficial da sessão de New York: 18:00 do dia anterior → 09:30 do dia da sessão.
  // É fixo e independe do timezone ou dos horários escolhidos para o profile principal.
  function overnightForNewYorkSession(main){
    const tz="America/New_York";
    const p=tzParts(tz,main.start);
    const sessionDate={y:p.y,mo:p.mo,d:p.d};
    const previousDate=dateShift(sessionDate.y,sessionDate.mo,sessionDate.d,-1);
    const start=localToTs(tz,previousDate.y,previousDate.mo,previousDate.d,18,0);
    const end=localToTs(tz,sessionDate.y,sessionDate.mo,sessionDate.d,9,30);
    return {start,end,effectiveEnd:end,timezone:tz};
  }

  function chooseInterval(spanMs){
    for(const i of INTERVALS){if(spanMs/i.ms<=1200)return i.v;}
    return "1d";
  }
  async function fetchRange(sym,interval,start,end){
    const url="https://fapi.binance.com/fapi/v1/klines?symbol="+encodeURIComponent(sym)+"&interval="+interval+"&startTime="+Math.floor(start)+"&endTime="+Math.floor(end+1)+"&limit=1500";
    try{const r=await fetch(url);if(!r.ok)return null;const d=await r.json();if(!Array.isArray(d))return null;return d.map(x=>{const volume=+x[5]||0;let buy=+x[9];if(!isFinite(buy)||buy<0)buy=NaN;let sell=isFinite(buy)?Math.max(0,volume-buy):NaN;return {time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume,buyVolume:buy,sellVolume:sell};});}catch(_){return null;}
  }
  function ensureData(sym,windows,ovWindows){
    if(!sym||!windows.length)return null;
    const all=windows.concat(ovWindows||[]);const start=Math.min.apply(null,all.map(w=>w.start));const end=Math.max.apply(null,all.map(w=>w.effectiveEnd||w.end));
    const live=windows.some(w=>(w.end||0)>Date.now());
    const endKey=live?Math.floor(end/15000)*15000:end;
    const interval=chooseInterval(Math.max(60000,end-start));const baseKey=[sym,start,interval].join("|"),key=[baseKey,endKey].join("|");
    const ttl=live?20000:300000;
    const compatible=!!(dataCache&&dataCache.baseKey===baseKey&&Array.isArray(dataCache.klines)&&dataCache.klines.length);
    const fresh=compatible&&dataCache.key===key&&(Date.now()-dataCache.ts)<ttl;
    if(!fresh&&!dataFetching){
      dataFetching=true;
      fetchRange(sym,interval,start,end).then(kl=>{
        if(Array.isArray(kl)&&kl.length){dataCache={key,baseKey,klines:kl,ts:Date.now(),interval,start,end,symbol:sym};profileCache=null;}
        dataFetching=false;if(typeof drawSoon==="function")drawSoon();
      }).catch(()=>{dataFetching=false;});
    }
    // Stale-while-revalidate: nunca apaga o VP enquanto o pacote novo está chegando.
    if(compatible)return dataCache;
    return null;
  }

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
      const leftAvg=leftSum/leftN,rightAvg=rightSum/rightN;
      const avgBridge=Math.min(leftAvg,rightAvg);
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
    const grid1345=window.DVLVPRowLayout1345&&window.DVLVPRowLayout1345.resolve?window.DVLVPRowLayout1345.resolve({mode:state.rowLayout,rows:requestedRows,ticksPerRow:state.ticksPerRow,min,max,symbol:sym,candles,maxRows:12000}):null;
    const rows=grid1345?grid1345.rows:Math.max(1,Math.round(requestedRows)||100);
    if(grid1345){min=grid1345.min;max=grid1345.max;}
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
      if(!(buy>=0)||!(sell>=0)||buy+sell<=0){const lo=+c.low,hi=+c.high,cl=+c.close,op=+c.open;const full=Math.max(1e-12,hi-lo);const closePos=Math.max(0,Math.min(1,(cl-lo)/full));const bodyBias=Math.max(-1,Math.min(1,(cl-op)/full));const buyShare=Math.max(.08,Math.min(.92,.25+.50*closePos+.25*Math.max(0,bodyBias)));buy=v*buyShare;sell=v-buy;}
      else{const sum=buy+sell;if(sum>0&&Math.abs(sum-v)>v*.01){const k=v/sum;buy*=k;sell*=k;}}
      distribute(bins,c,v);distribute(buyBins,c,buy);distribute(sellBins,c,sell);
    }
    let total=0,maxBucket=0,pocIdx=0,maxDelta=0;const deltaBins=new Float64Array(rows);
    for(let i=0;i<rows;i++){total+=bins[i];if(bins[i]>maxBucket){maxBucket=bins[i];pocIdx=i;}const d=buyBins[i]-sellBins[i];deltaBins[i]=d;if(Math.abs(d)>maxDelta)maxDelta=Math.abs(d);}
    if(!maxBucket)return null;const target=total*Math.max(.1,Math.min(1,vaPct));let vol=bins[pocIdx],lo=pocIdx,hi=pocIdx;
    while(vol<target&&(lo>0||hi<rows-1)){const lv=lo>0?bins[lo-1]:-1,hv=hi<rows-1?bins[hi+1]:-1;if(hv>=lv){hi++;vol+=bins[hi];}else{lo--;vol+=bins[lo];}}
    const ppr=range/rows;
    return {bins,buyBins,sellBins,deltaBins,min,max,maxBucket,maxDelta,pocIdx,poc:min+(pocIdx+.5)*ppr,vah:min+(hi+1)*ppr,val:min+lo*ppr,vaLo:lo,vaHi:hi,ppr,rows,rowLayout:grid1345?grid1345.mode:"rows",tickSize:grid1345&&grid1345.tickSize,ticksPerRow:grid1345&&grid1345.effectiveTicks,requestedTicks:grid1345&&grid1345.requestedTicks,capped:!!(grid1345&&grid1345.capped),lvns:findLVNCandidates(bins,min,ppr)};
  }
  function bundleIntervalMs(bundle){
    const v=bundle&&bundle.interval;
    const hit=INTERVALS.find(i=>i.v===v);
    return hit?hit.ms:60000;
  }
  function profilesFor(bundle,windows,ovWindows){
    const sig=[bundle.key,state.rows,state.rowLayout,state.ticksPerRow,state.valueAreaPct,state.overnightOn?1:0].join("|");
    const interacting=!!window.__dvlChartInteracting;

    // Mesmo que um fetch termine durante o zoom, mantenha o pacote inteiro
    // anterior. Isso impede POC/VAH/VAL, bins e posição do profile de mudarem
    // no meio do gesto.
    if(interacting&&Array.isArray(lastStableProfileItems)&&lastStableProfileItems.length){
      return lastStableProfileItems;
    }
    if(profileCache&&profileCache.sig===sig){
      lastStableProfileItems=profileCache.items;
      return profileCache.items;
    }

    const rows=Math.max(20,Math.min(300,Math.round(state.rows)||100));
    const va=Math.max(.1,Math.min(1,+state.valueAreaPct||.70));
    const now=Date.now();
    const step=bundleIntervalMs(bundle);
    const items=windows.map((w,i)=>{
      const main=bundle.klines.filter(c=>c.time>=w.start&&c.time<(w.effectiveEnd||w.end));
      const ov=state.overnightOn&&ovWindows[i]?bundle.klines.filter(c=>c.time>=ovWindows[i].start&&c.time<ovWindows[i].end):[];

      // Sessão atual: posição visual no fechamento do último candle realmente
      // disponível, não em Date.now (fracionário) nem no fim futuro da sessão.
      // Assim o zoom só transforma a câmera; não altera a âncora do Fixed Range.
      const isCurrent=(+w.start||0)<=now&&now<(+w.end||0);
      const lastMain=main.length?main[main.length-1]:null;
      let anchorEnd=+w.end||+w.effectiveEnd||0;
      if(isCurrent&&lastMain&&isFinite(+lastMain.time)){
        anchorEnd=Math.min(+w.end||Infinity,(+lastMain.time)+step);
      }
      if(!isFinite(anchorEnd)||anchorEnd<=0)anchorEnd=+w.effectiveEnd||+w.end||0;

      return {window:w,anchorEnd,main:computeProfile(main,rows,va,bundle.symbol||""),overnight:computeProfile(ov,rows,va,bundle.symbol||""),ovWindow:ovWindows[i]||null};
    });
    profileCache={sig,items};
    lastStableProfileItems=items;
    return items;
  }

  function dash(style,w){w=Math.max(1,+w||1);if(style==="solid")return[];if(style==="dotted")return[1,Math.max(3,w*2.5)];if(style==="dashdot")return[w*5,w*3,1,w*3];return[w*4,w*3];}
  function roundRectLeft(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,h/2,w/2));ctx.beginPath();if(r<.5){ctx.rect(x,y,w,h);return;}ctx.moveTo(x+r,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
  function roundRectRight(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,h/2,w/2));ctx.beginPath();if(r<.5){ctx.rect(x,y,w,h);return;}ctx.moveTo(x,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x,y+h);ctx.closePath();}
  function timeIndex(view,t,after){let lo=0,hi=view.length;while(lo<hi){const m=(lo+hi)>>1;if((+view[m].time||0)<t)lo=m+1;else hi=m;}return after?lo:Math.max(0,lo-1);}
  // Beta 1.324 — âncora temporal global. O VP não depende mais do slice
  // local de candles, que muda durante o zoom. A sessão usa o mesmo índice
  // contínuo global do chart, portanto start/end permanecem presos ao tempo.
  function globalIndexAtTime1324(t){
    const all=(typeof klines!=="undefined"&&Array.isArray(klines))?klines:[];
    if(!all.length||!isFinite(t))return NaN;
    const n=all.length,first=+(all[0]&&all[0].time)||0,last=+(all[n-1]&&all[n-1].time)||first;
    let step=0,seen=0;for(let i=Math.max(1,n-96);i<n;i++){const d=(+all[i].time||0)-(+all[i-1].time||0);if(d>0){step+=d;seen++;}}
    step=seen?step/seen:Math.max(1,(typeof intervalMs==="function"?intervalMs(interval):60000)||60000);
    if(t<=first)return (t-first)/step;
    if(t>=last)return (n-1)+(t-last)/step;
    let lo=0,hi=n;while(lo<hi){const m=(lo+hi)>>1;if((+all[m].time||0)<t)lo=m+1;else hi=m;}
    const b=Math.max(1,Math.min(n-1,lo)),a=b-1,ta=+all[a].time||first,tb=+all[b].time||ta+step;
    return a+(tb>ta?(t-ta)/(tb-ta):0);
  }
  function xAtTime(cfg,t){
    const win=cfg&&cfg.win;
    const gi=globalIndexAtTime1324(t);
    if(win&&isFinite(gi)&&isFinite(+win.leftEdgeIndex)&&typeof cfg.x==="function")return cfg.x(gi-(+win.leftEdgeIndex));
    // fallback somente para ambientes antigos sem continuousIndexWindow
    const v=cfg.view||[];if(!v.length)return NaN;const n=v.length,first=+v[0].time||0,last=+v[n-1].time||first;
    const step=Math.max(1,(typeof intervalMs==="function"?intervalMs(interval):60000)||60000);let idx=0;
    if(t<=first)idx=(t-first)/step;else if(t>=last)idx=(n-1)+(t-last)/step;else{const hi=timeIndex(v,t,true),lo=Math.max(0,hi-1),ta=+v[lo].time||first,tb=+v[Math.min(n-1,hi)].time||ta+step;idx=lo+(tb>ta?(t-ta)/(tb-ta):0);}
    return cfg.x((+cfg.slotOffset||0)+idx);
  }
  // Beta 1.344 — Fixed Range preso ao candle, não a uma coordenada temporal
  // interpolada. O mesmo índice global usado pelas velas é usado pelo profile.
  function chartCandles1344(){
    try{return (typeof klines!=="undefined"&&Array.isArray(klines))?klines:[];}catch(_){return [];}
  }
  function chartStepMs1344(all){
    all=all||chartCandles1344();
    let sum=0,n=0;
    for(let i=Math.max(1,all.length-128);i<all.length;i++){
      const d=(+all[i].time||0)-(+all[i-1].time||0);
      if(d>0){sum+=d;n++;}
    }
    if(n)return Math.max(1,Math.round(sum/n));
    try{return Math.max(1,(typeof intervalMs==="function"?intervalMs(interval):60000)||60000);}catch(_){return 60000;}
  }
  function chartIndexAtTime1344(t,side){
    const all=chartCandles1344();
    if(!all.length||!isFinite(+t))return NaN;
    t=+t;side=side==="ceil"?"ceil":"floor";
    const n=all.length,first=+(all[0]&&all[0].time)||0,last=+(all[n-1]&&all[n-1].time)||first;
    const step=chartStepMs1344(all);

    // Fora do histórico carregado, extrapola em CANDLES INTEIROS. Isso mantém
    // sessões futuras/antigas presas à mesma grade do timeframe do gráfico.
    if(t<first){
      const q=(t-first)/step;
      return side==="ceil"?Math.ceil(q):Math.floor(q);
    }
    if(t>last){
      const q=(t-last)/step;
      return (n-1)+(side==="ceil"?Math.ceil(q):Math.floor(q));
    }

    let lo=0,hi=n;
    while(lo<hi){const m=(lo+hi)>>1;if((+all[m].time||0)<t)lo=m+1;else hi=m;}
    if(side==="ceil")return Math.max(0,Math.min(n-1,lo));
    if(lo<n&&(+all[lo].time||0)===t)return lo;
    return Math.max(0,Math.min(n-1,lo-1));
  }
  function xAtChartIndex1344(cfg,index){
    const win=cfg&&cfg.win;
    if(!win||!isFinite(+index)||!isFinite(+win.leftEdgeIndex)||typeof cfg.x!=="function")return NaN;
    return cfg.x((+index)-(+win.leftEdgeIndex));
  }
  function xBounds(cfg,w,anchorEnd){
    const v=cfg.view||[];if(!v.length)return null;
    const startTs=+w.start||0;
    const endTs=isFinite(+anchorEnd)&&+anchorEnd>0?+anchorEnd:(+w.effectiveEnd||+w.end||0);

    // Primeiro candle cuja abertura pertence à sessão.
    const startIndex=chartIndexAtTime1344(startTs,"ceil");
    // Último candle REAL já existente no gráfico e pertencente ao range. O -1
    // evita cair no primeiro candle da sessão seguinte quando endTs coincide
    // exatamente com sua abertura. Nunca extrapola o profile atual para o futuro.
    const all1344=chartCandles1344();
    const lastChartTs=all1344.length?(+all1344[all1344.length-1].time||endTs):endTs;
    const endTarget=Math.min(endTs-1,lastChartTs);
    let endIndex=chartIndexAtTime1344(Math.max(startTs,endTarget),"floor");
    if(isFinite(startIndex)&&isFinite(endIndex)&&endIndex<startIndex)endIndex=startIndex;

    const xa=xAtChartIndex1344(cfg,startIndex),xb=xAtChartIndex1344(cfg,endIndex);
    if(!isFinite(xa)||!isFinite(xb))return null;
    const x0=Math.min(xa,xb),x1=Math.max(xa,xb);
    const edgePad=20;
    return {
      x0,x1,anchorEnd:endTs,
      startIndex,endIndex,
      startCandleTime:(chartCandles1344()[startIndex]&&+chartCandles1344()[startIndex].time)||startTs,
      endCandleTime:(chartCandles1344()[endIndex]&&+chartCandles1344()[endIndex].time)||endTs,
      exactCandleAnchor:true,
      bodyVisible:x1>=cfg.x0-edgePad&&x0<=cfg.x1+edgePad,
      beforeView:x1<cfg.x0-edgePad,
      afterView:x0>cfg.x1+edgePad
    };
  }
  const OVERNIGHT_PURPLE="#b86cff";
  function calcProfileLayout(bounds){
    const span=Math.max(1,bounds.x1-bounds.x0);
    // Beta 1.343 — a largura pertence à sessão, não à tela.
    // O percentual configurado acompanha o mesmo transform dos candles.
    // Assim o profile encolhe ao afastar e cresce ao aproximar, sempre
    // permanecendo dentro do Fixed Range correspondente.
    const profileRatio=Math.max(.05,Math.min(.70,+state.widthPct||.32));
    const deltaRatio=Math.max(.05,Math.min(.55,+state.deltaWidthPct||.24));
    let profileW=Math.max(.75,Math.min(180,span*profileRatio));
    let deltaW=state.deltaOn?Math.max(.75,Math.min(160,span*deltaRatio)):0;
    let dividerGap=state.deltaOn?Math.min(4,Math.max(.5,span*.018)):0;
    let totalW=profileW+deltaW+dividerGap;
    const cap=Math.max(1,span*.92);
    if(totalW>cap){
      const available=Math.max(.5,cap-dividerGap);
      const pair=Math.max(.0001,profileW+deltaW);
      const k=available/pair;
      profileW*=k;
      deltaW*=k;
      totalW=profileW+deltaW+dividerGap;
    }
    // Beta 1.347 — a âncora temporal é um candle real da sessão.
    // origin: o bloco nasce no primeiro candle e cresce para a direita.
    // end: o bloco termina no último candle e cresce para a esquerda.
    const atOrigin=(state.anchorMode||"origin")!=="end";
    const anchor=atOrigin?bounds.x0:bounds.x1;
    const blockX=atOrigin?anchor:anchor-totalW;
    const dividerX=blockX+deltaW+(state.deltaOn?Math.min(2,dividerGap*.5):0);
    const profileX0=blockX+deltaW+dividerGap;
    return {span,profileW,deltaW,dividerGap,totalW,blockX,dividerX,profileX0,anchorX:anchor,anchorMode:atOrigin?"origin":"end",sessionRelative:true};
  }
  const __frVisualCache1346=new WeakMap();
  function visualProfile1346(p){
    if(!p||typeof p!=="object")return null;
    const target=Math.max(20,Math.min(500,Math.round(Number(state.rows)||120)));
    const sig=[p.rowLayout,p.rows,p.min,p.ppr,target].join("|");
    const old=__frVisualCache1346.get(p);if(old&&old.sig===sig)return old.data;
    const api=window.DVLVPRowLayout1345;
    const data=api&&api.visualize?api.visualize({mode:p.rowLayout,rows:p.rows,bins:p.bins,buy:p.buyBins,sell:p.sellBins,delta:p.deltaBins,min:p.min,ppr:p.ppr,visualRows:target}):null;
    const out=data||{rows:p.rows,rawRows:p.rows,groupSize:1,bins:p.bins,buy:p.buyBins,sell:p.sellBins,delta:p.deltaBins,maxBucket:p.maxBucket,maxDelta:p.maxDelta,groupOf:(i)=>i};
    __frVisualCache1346.set(p,{sig,data:out});return out;
  }
  function nodeTipX(p,layout,idx){
    if(!p||!layout||!isFinite(idx))return layout?layout.profileX0:NaN;
    idx=Math.max(0,Math.min((p.bins?.length||1)-1,Math.round(idx)));
    const vis=visualProfile1346(p);
    const vi=vis&&vis.groupOf?vis.groupOf(idx):idx;
    const vol=+((vis&&vis.bins&&vis.bins[vi])||(p.bins&&p.bins[idx])||0);
    const mx=+(vis&&vis.maxBucket)||+p.maxBucket||0;
    const bw=mx>0?(vol/mx)*layout.profileW:0;
    return layout.profileX0+Math.max(0.5,bw);
  }
  function idxForPrice(p,price){
    if(!p||!(price>0)||!(p.ppr>0))return NaN;
    return Math.max(0,Math.min((p.bins?.length||1)-1,Math.floor((price-p.min)/p.ppr)));
  }
  function drawOvernightNodeCap(ctx,cfg,p,layout,idx,price){
    if(!p||!layout||!(price>0)||!isFinite(idx))return NaN;
    idx=Math.max(0,Math.min((p.bins?.length||1)-1,Math.round(idx)));
    const vis=visualProfile1346(p),vi=vis&&vis.groupOf?vis.groupOf(idx):idx;
    const vol=+((vis&&vis.bins&&vis.bins[vi])||(p.bins&&p.bins[idx])||0),mx=+(vis&&vis.maxBucket)||+p.maxBucket||0,ratio=mx>0?Math.max(0,Math.min(1,vol/mx)):0;
    const capW=6+ratio*16,anchorX=layout.profileX0+layout.profileW+2;
    const y=cfg.y(price),h=Math.max(2,Math.min(5,Math.abs(cfg.y(price-p.ppr*.45)-cfg.y(price+p.ppr*.45))));
    if(y>=cfg.y0-6&&y<=cfg.y1+6){ctx.save();ctx.globalAlpha=.92;ctx.fillStyle=OVERNIGHT_PURPLE;roundRectRight(ctx,anchorX-capW,y-h/2,capW,h,Math.min(1.5,h/2));ctx.fill();ctx.restore();}
    return anchorX;
  }
  function profileLinesReachPresent(index){
    if(index===0)return true;
    return !!state["extendProfile"+(index+1)];
  }
  function drawMainProfile(ctx,cfg,p,bounds,reachPresent,nextBounds,profileNumber){
    if(!p||!bounds||bounds.x1-bounds.x0<4)return;
    const {profileW,deltaW,dividerGap,totalW,blockX,dividerX,profileX0}=calcProfileLayout(bounds);
    const bodyLeft=Math.min(blockX,profileX0),bodyRight=Math.max(profileX0+profileW,dividerX);
    const bodyVisible=bodyRight>=cfg.x0&&bodyLeft<=cfg.x1;
    const color=state.profileColor||"#38e0ff",op=Math.max(.03,Math.min(1,+state.opacity||.42)),r=Math.max(0,Math.min(3,+state.colRadius||0));
    ctx.save();
    if(bodyVisible){
      const vis=visualProfile1346(p);
      const visRows=vis?vis.rows:p.bins.length,groupSize=vis?vis.groupSize:1;
      const visBins=vis?vis.bins:p.bins,visMax=vis&&vis.maxBucket>0?vis.maxBucket:p.maxBucket;
      ctx.fillStyle=color;
      for(let i=0;i<visRows;i++){
        const vol=visBins[i];if(!vol)continue;const bw=(vol/visMax)*profileW;if(bw<.5)continue;const rawLo=i*groupSize,rawHi=Math.min(p.rows,(i+1)*groupSize)-1;const plo=p.min+rawLo*p.ppr,phi=p.min+(rawHi+1)*p.ppr;const yt=cfg.y(phi),yb=cfg.y(plo);if((yt<cfg.y0&&yb<cfg.y0)||(yt>cfg.y1&&yb>cfg.y1))continue;const y=Math.min(yt,yb),h=Math.max(.5,Math.abs(yb-yt));const inVA=rawHi>=p.vaLo&&rawLo<=p.vaHi;ctx.globalAlpha=inVA?op:op*.42;roundRectRight(ctx,profileX0,y,bw,h,Math.min(r,h/2,bw/2));ctx.fill();
      }
      const visDelta=vis?vis.delta:p.deltaBins,visMaxDelta=vis&&vis.maxDelta>0?vis.maxDelta:p.maxDelta;
      if(state.deltaOn&&visMaxDelta>0){
        const dop=Math.max(.05,Math.min(1,+state.deltaOpacity||.78));
        for(let i=0;i<visRows;i++){
          const d=visDelta[i];if(!d)continue;const bw=(Math.abs(d)/visMaxDelta)*deltaW;if(bw<.5)continue;const rawLo=i*groupSize,rawHi=Math.min(p.rows,(i+1)*groupSize)-1;const plo=p.min+rawLo*p.ppr,phi=p.min+(rawHi+1)*p.ppr;const yt=cfg.y(phi),yb=cfg.y(plo);if((yt<cfg.y0&&yb<cfg.y0)||(yt>cfg.y1&&yb>cfg.y1))continue;const y=Math.min(yt,yb),h=Math.max(.5,Math.abs(yb-yt));const inVA=rawHi>=p.vaLo&&rawLo<=p.vaHi;ctx.globalAlpha=inVA?dop:dop*.55;ctx.fillStyle=d>=0?(state.deltaBuyColor||"#13dc8d"):(state.deltaSellColor||"#ff4a61");roundRectLeft(ctx,dividerX-bw,y,bw,h,Math.min(r,h/2,bw/2));ctx.fill();
        }
        const yTop=Math.max(cfg.y0,Math.min(cfg.y(p.max),cfg.y(p.min))),yBot=Math.min(cfg.y1,Math.max(cfg.y(p.max),cfg.y(p.min)));ctx.globalAlpha=.58;ctx.strokeStyle="rgba(142,174,190,.55)";ctx.lineWidth=1;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(dividerX,yTop);ctx.lineTo(dividerX,yBot);ctx.stroke();
      }
    }
    // Somente o profile atual projeta até a extrema direita.
    // Profiles antigos param quando nasce o profile mais novo seguinte.
    const isCurrent=profileNumber===1;
    ctx.globalAlpha=1;const lw=+state.lineWidth||1.4,ls=isCurrent?"solid":(state.lineStyle||"dashed"),lineDash=dash(ls,lw);ctx.lineWidth=lw;ctx.setLineDash(lineDash);
    const forwardRaw=reachPresent?cfg.x1-4:(nextBounds&&isFinite(nextBounds.x0)?nextBounds.x0-8:bounds.x1+18);
    const lineX1=Math.min(cfg.x1-4,forwardRaw);
    const suffix=reachPresent&&profileNumber>1?" "+profileNumber:"";
    const line=(show,price,lineColor,name,base,idx)=>{const lineX0=Math.max(cfg.x0,nodeTipX(p,{profileX0,profileW},idx));if(show===false||!(price>0)||lineX0>=lineX1)return;const y=cfg.y(price);if(y<cfg.y0||y>cfg.y1)return;ctx.strokeStyle=lineColor;ctx.beginPath();ctx.moveTo(lineX0,y);ctx.lineTo(lineX1,y);ctx.stroke();if(state.labels){ctx.setLineDash([]);ctx.fillStyle=lineColor;ctx.globalAlpha=.94;ctx.font="700 "+Math.max(6,Math.min(14,+state.labelFontPx||8))+"px system-ui";ctx.textAlign="right";ctx.textBaseline="bottom";ctx.fillText(name+suffix,lineX1-2,y-2);ctx.globalAlpha=1;ctx.setLineDash(lineDash);}};
    line(state.showPOC,p.poc,state.colorPOC||"#f3c768","POC","bottom",p.pocIdx);line(state.showVAH,p.vah,state.colorVAH||"#13dc8d","VAH","bottom",p.vaHi);line(state.showVAL,p.val,state.colorVAL||"#ff4a61","VAL","top",p.vaLo);ctx.setLineDash([]);ctx.restore();
  }
  function drawOvernightLines(ctx,cfg,p,bounds,reachPresent,nextBounds,mainProfile,profileNumber){
    if(!p||!bounds||state.ovLines===false)return;const lw=+state.ovLineWidth||1,ls=state.ovLineStyle||"dotted";
    const layout=calcProfileLayout(bounds);
    // Overnight projeta apenas até o node real do profile principal da mesma sessão.
    const forwardRaw=reachPresent?cfg.x1-4:(nextBounds&&isFinite(nextBounds.x0)?nextBounds.x0-8:bounds.x1+18);
    const lineX1=Math.min(cfg.x1-4,forwardRaw);
    const isCurrent=profileNumber===1,currentLs=isCurrent?"solid":ls,lineDash=dash(currentLs,lw),suffix=reachPresent&&profileNumber>1?" "+profileNumber:"";
    ctx.save();ctx.lineWidth=lw;ctx.setLineDash(lineDash);
    const line=(show,price,name,base)=>{if(show===false||!(price>0))return;const y=cfg.y(price);if(y<cfg.y0||y>cfg.y1)return;const mainIdx=idxForPrice(mainProfile,price);const anchor=nodeTipX(mainProfile,layout,mainIdx);const lineX0=Math.max(cfg.x0,anchor);if(!isFinite(lineX0)||lineX0>=lineX1)return;ctx.strokeStyle=OVERNIGHT_PURPLE;ctx.globalAlpha=.95;ctx.beginPath();ctx.moveTo(lineX0,y);ctx.lineTo(lineX1,y);ctx.stroke();if(state.labels){ctx.setLineDash([]);ctx.fillStyle=OVERNIGHT_PURPLE;ctx.font="700 "+Math.max(6,Math.min(14,+state.labelFontPx||8))+"px system-ui";ctx.textAlign="right";ctx.textBaseline="bottom";ctx.fillText("ON "+name+suffix,lineX1-2,y-2);ctx.setLineDash(lineDash);}};
    line(state.showPOC,p.poc,"POC","bottom");line(state.showVAH,p.vah,"VAH","bottom");line(state.showVAL,p.val,"VAL","top");ctx.restore();
  }

  function drawLVNLines(ctx,cfg,entries,currentPrice){
    if(state.lvnOn===false||!(currentPrice>0))return;
    const count=Math.max(1,Math.min(8,Math.round(state.lvnCount)||2));
    const drawable=entries.filter(e=>e.bounds&&e.item&&e.item.main);if(!drawable.length)return;
    const currentEntry=drawable.find(e=>e.index===0);
    const targetX=currentEntry?currentEntry.bounds.x1:Math.max.apply(null,drawable.map(e=>e.bounds.x1));
    const extendCount=state.lvnExtendOn?Math.max(1,Math.min(11,Math.round(state.lvnExtendProfiles)||2)):0;
    const lw=Math.max(.5,Math.min(5,+state.lvnLineWidth||1));
    const ls=state.lvnLineStyle||"dotted",alpha=Math.max(.08,Math.min(1,+state.lvnOpacity||.88));
    const aboveColor=state.lvnAboveColor||"#3fa9ff",belowColor=state.lvnBelowColor||"#f3c768";
    const fontPx=Math.max(6,Math.min(14,+state.labelFontPx||8));
    ctx.save();ctx.lineWidth=lw;ctx.setLineDash(dash(ls,lw));ctx.font="800 "+fontPx+"px system-ui";ctx.textAlign="right";
    for(const e of entries.slice().reverse()){
      const p=e.item&&e.item.main,b=e.bounds;if(!p||!b||!Array.isArray(p.lvns)||!p.lvns.length)continue;
      const shouldExtend=!!(state.lvnExtendOn&&e.index>0&&e.index<=extendCount);
      const layout=calcProfileLayout(b);
      const rawX1=shouldExtend?Math.max(b.x1,targetX):b.x1;
      const x1=Math.min(cfg.x1-4,rawX1);if(x1<=cfg.x0+1)continue;
      const lvns=p.lvns.slice(0,count);
      for(const node of lvns){
        const price=+node.price;if(!(price>0))continue;const y=cfg.y(price);if(y<cfg.y0||y>cfg.y1)continue;
        const isAbove=price>currentPrice,color=isAbove?aboveColor:belowColor,label=isAbove?"LVN UP":"LVN DOWN";
        const x0=Math.max(cfg.x0,nodeTipX(p,layout,node.idx)); if(x0>=x1)continue;
        ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();
        if(state.lvnLabels!==false){ctx.setLineDash([]);ctx.globalAlpha=Math.min(1,alpha+.08);ctx.fillStyle=color;ctx.textBaseline="bottom";ctx.fillText(label,x1-2,y-2);ctx.setLineDash(dash(ls,lw));}
      }
    }
    ctx.restore();
  }

  function draw(ctx,cfg){
    if(!state.on||!cfg||!cfg.view||!cfg.view.length)return;const now=Date.now();const windows=sessionWindows(now);if(!windows.length)return;const ovs=state.overnightOn&&state.sessionType!=="overnight"?windows.map(w=>overnightForNewYorkSession(w)):windows.map(()=>null);const bundle=ensureData(cfg.symbol||"",windows,ovs.filter(Boolean));if(!bundle)return;const items=profilesFor(bundle,windows,ovs);
    const entries=items.map((item,index)=>({item,index,bounds:xBounds(cfg,item.window,item.anchorEnd)}));
    for(let i=0;i<entries.length;i++)entries[i].nextBounds=i>0?entries[i-1].bounds:null;
    try{window.__DVL_FRVP_DEBUG_1344=entries.map(e=>e.bounds?{profile:e.index+1,x0:e.bounds.x0,x1:e.bounds.x1,startIndex:e.bounds.startIndex,endIndex:e.bounds.endIndex,startCandleTime:e.bounds.startCandleTime,endCandleTime:e.bounds.endCandleTime,exactCandleAnchor:true,rowLayout:e.item&&e.item.main&&e.item.main.rowLayout,rows:e.item&&e.item.main&&e.item.main.rows,tickSize:e.item&&e.item.main&&e.item.main.tickSize,ticksPerRow:e.item&&e.item.main&&e.item.main.ticksPerRow,requestedTicks:e.item&&e.item.main&&e.item.main.requestedTicks,capped:!!(e.item&&e.item.main&&e.item.main.capped),layout:calcProfileLayout(e.bounds)}:null);window.__DVL_FRVP_DEBUG_1324=window.__DVL_FRVP_DEBUG_1344;}catch(_){}
    const liveCandle=bundle.klines&&bundle.klines.length?bundle.klines[bundle.klines.length-1]:null;
    const viewLast=cfg.view&&cfg.view.length?cfg.view[cfg.view.length-1]:null;
    const currentPrice=+(liveCandle&&liveCandle.close)||+(viewLast&&viewLast.close)||0;
    ctx.save();try{ctx.beginPath();ctx.rect(cfg.x0,cfg.y0,cfg.x1-cfg.x0,cfg.y1-cfg.y0);ctx.clip();for(const e of entries.slice().reverse()){const b=e.bounds;if(!b)continue;const reachPresent=profileLinesReachPresent(e.index);const profileNumber=e.index+1;if(e.item.main)drawMainProfile(ctx,cfg,e.item.main,b,reachPresent,e.nextBounds,profileNumber);if(e.item.overnight)drawOvernightLines(ctx,cfg,e.item.overnight,b,reachPresent,e.nextBounds,e.item.main,profileNumber);}drawLVNLines(ctx,cfg,entries,currentPrice);}finally{ctx.restore();}
  }

  let panel=null;
  function ensurePanel(){
    if(panel&&document.contains(panel))return;panel=document.createElement("div");panel.id="dvlFRVPPanel";panel.className="dvl-vt-panel dvl-vp-panel";
    panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>Fixed Range VP</b><small>máx. 5 · Profile 1 = atual</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlFRVPReset" type="button" title="Reset">↻</button><button class="dvl-vt-close" id="dvlFRVPClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlFRVPBody"></div>';
    document.body.appendChild(panel);panel.addEventListener("pointerdown",e=>e.stopPropagation(),true);panel.querySelector("#dvlFRVPClose").addEventListener("click",closePanel);panel.querySelector("#dvlFRVPReset").addEventListener("click",resetState);
  }
  function openPanel(){ensurePanel();panel.classList.add("is-open");renderPanel();}
  function closePanel(){if(panel)panel.classList.remove("is-open");}
  function stepFld(id,val,min,max,step,dec){const v=dec?(+val).toFixed(dec):String(val);return '<div class="dvl-feb-step-wrap"><button class="dvl-feb-step-btn dvl-feb-step-dec" type="button" data-id="'+id+'" data-step="'+step+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'">−</button><span class="dvl-feb-step-val" id="'+id+'Val">'+v+'</span><button class="dvl-feb-step-btn dvl-feb-step-inc" type="button" data-id="'+id+'" data-step="'+step+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'">+</button></div>';}
  function dropFld(id,opts,cur){const l=(opts.find(o=>o[0]===cur)||[cur,cur])[1];return '<div class="dvl-drop-wrap" id="'+id+'Wrap"><button class="dvl-drop-btn" type="button" id="'+id+'">'+l+'<i class="dvl-drop-arr">▾</i></button><div class="dvl-drop-list" id="'+id+'List">'+opts.map(o=>'<button class="dvl-drop-item'+(o[0]===cur?' is-cur':'')+'" type="button" data-val="'+o[0]+'">'+o[1]+'</button>').join('')+'</div></div>';}
  function colorFld(id,label,key){const v=state[key]||"#38e0ff";return '<div class="dvl-vt-field"><label>'+label+'</label><div class="dvl-feb-clr-field"><button id="'+id+'" class="dvl-feb-clr-swatch" type="button" style="background:'+v+'" data-key="'+key+'"></button></div></div>';}
  function openPalette(btn,key){document.querySelectorAll(".dvl-feb-pal").forEach(p=>p.remove());const p=document.createElement("div");p.className="dvl-feb-pal";PALETTE.forEach(c=>{const b=document.createElement("button");b.type="button";b.className="dvl-feb-pal-cell"+(c===state[key]?" is-cur":"");b.style.background=c;b.addEventListener("click",()=>{state[key]=c;btn.style.background=c;save();if(typeof drawSoon==="function")drawSoon();p.remove();});p.appendChild(b);});btn.parentNode.appendChild(p);setTimeout(()=>document.addEventListener("pointerdown",function out(e){if(!p.contains(e.target)&&e.target!==btn){p.remove();document.removeEventListener("pointerdown",out,true);}},true),0);}

  function renderPanel(){
    ensurePanel();const body=panel.querySelector("#dvlFRVPBody");
    const frTicksMode1345=state.rowLayout==="ticks";
    const frRowValue1345=frTicksMode1345?state.ticksPerRow:state.rows;
    const frRowMin1345=frTicksMode1345?1:20,frRowMax1345=frTicksMode1345?100000:300,frRowStep1345=frTicksMode1345?1:10;
    body.innerHTML=''
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Geral</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="frOn" type="checkbox" '+(state.on?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Profiles</label>'+stepFld("frCount",state.profiles,1,5,1,0)+'</div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label>Rows Layout</label>'+dropFld("frRowLayout",ROW_LAYOUT_OPTS,state.rowLayout||"rows")+'</div>'
      +'<div class="dvl-vt-field"><label>Row Size</label>'+stepFld("frRowSize",frRowValue1345,frRowMin1345,frRowMax1345,frRowStep1345,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Métrica</label><strong style="font-size:9px;color:var(--dvl-muted,#8ea0af);font-weight:800">'+(frTicksMode1345?'ticks por faixa':'quantidade de faixas')+'</strong></div>'
      +'<div class="dvl-vt-field"><label>Largura %</label>'+stepFld("frWidth",Math.round(state.widthPct*100),5,70,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Opacidade %</label>'+stepFld("frOpacity",Math.round(state.opacity*100),5,100,5,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Value Area %</label>'+stepFld("frVA",Math.round(state.valueAreaPct*100),10,100,5,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Arredondamento</label>'+stepFld("frRadius",state.colRadius,0,3,1,0)+'</div>'
      +'<div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Âncora temporal</label>'+dropFld("frAnchor",ANCHOR_OPTS,state.anchorMode||"origin")+'</div>'
      +colorFld("frProfileColor","Cor do VP","profileColor")+'</div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Delta dos profiles</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Delta</label><label class="dvl-switch"><input id="frDeltaOn" type="checkbox" '+(state.deltaOn?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Largura %</label>'+stepFld("frDeltaWidth",Math.round(state.deltaWidthPct*100),5,55,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Opacidade %</label>'+stepFld("frDeltaOpacity",Math.round(state.deltaOpacity*100),5,100,5,0)+'</div>'
      +colorFld("frDeltaBuyColor","Compradores","deltaBuyColor")+colorFld("frDeltaSellColor","Vendedores","deltaSellColor")
      +'<div class="dvl-vt-field" style="grid-column:1/-1"><label>Layout</label><strong style="font-size:10px;color:var(--dvl-muted,#8ea0af);font-weight:800">DELTA &nbsp;|&nbsp; PROFILE</strong></div></div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Sessão repetida</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label>Sessão</label>'+dropFld("frSession",SESSION_OPTS,state.sessionType)+'</div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label>Timezone</label>'+dropFld("frTZ",TZ_OPTS,state.timezone)+'</div>'
      +'<div class="dvl-vt-field"><label>Início hora</label>'+stepFld("frSH",state.startH,0,23,1,0)+'</div><div class="dvl-vt-field"><label>Início min</label>'+stepFld("frSM",state.startM,0,55,5,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Fim hora</label>'+stepFld("frEH",state.endH,0,23,1,0)+'</div><div class="dvl-vt-field"><label>Fim min</label>'+stepFld("frEM",state.endM,0,55,5,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Incluir atual</label><label class="dvl-switch"><input id="frCurrent" type="checkbox" '+(state.includeCurrent!==false?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1"><label>Janela resolvida</label><strong style="font-size:9px;color:var(--dvl-muted,#8ea0af);font-weight:800">'+(state.sessionType==="daily"?'Daily = 00:00 → 00:00 · '+state.timezone+' · '+((state.anchorMode||"origin")==="origin"?'preso no candle de abertura':'preso no candle final'):'Perfil preso ao '+((state.anchorMode||"origin")==="origin"?'primeiro':'último')+' candle real da sessão')+'</strong></div></div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Linhas até o presente</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field" style="grid-column:1/-1"><label>Profile 1 · Atual</label><strong style="font-size:9px;color:var(--green,#13dc8d);font-weight:900">SEMPRE ATIVO</strong></div>'
      +'<div class="dvl-vt-field"><label>Profile 2</label><label class="dvl-switch"><input id="frExtendP2" type="checkbox" '+(state.extendProfile2?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Profile 3</label><label class="dvl-switch"><input id="frExtendP3" type="checkbox" '+(state.extendProfile3?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Profile 4</label><label class="dvl-switch"><input id="frExtendP4" type="checkbox" '+(state.extendProfile4?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Profile 5</label><label class="dvl-switch"><input id="frExtendP5" type="checkbox" '+(state.extendProfile5?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1"><label>Regra</label><strong style="font-size:9px;color:var(--dvl-muted,#8ea0af);font-weight:800">ON = POC / VAH / VAL e linhas ON seguem até o presente</strong></div></div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Linhas</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Labels</label><label class="dvl-switch"><input id="frLabels" type="checkbox" '+(state.labels?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Fonte px</label>'+stepFld("frFont",state.labelFontPx,6,14,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>POC</label><label class="dvl-switch"><input id="frPOC" type="checkbox" '+(state.showPOC!==false?'checked':'')+'><i></i><b></b></label></div>'+colorFld("frPOCColor","Cor POC","colorPOC")
      +'<div class="dvl-vt-field"><label>VAH</label><label class="dvl-switch"><input id="frVAH" type="checkbox" '+(state.showVAH!==false?'checked':'')+'><i></i><b></b></label></div>'+colorFld("frVAHColor","Cor VAH","colorVAH")
      +'<div class="dvl-vt-field"><label>VAL</label><label class="dvl-switch"><input id="frVAL" type="checkbox" '+(state.showVAL!==false?'checked':'')+'><i></i><b></b></label></div>'+colorFld("frVALColor","Cor VAL","colorVAL")
      +'<div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>'+dropFld("frLineStyle",STYLE_OPTS,state.lineStyle)+'</div><div class="dvl-vt-field"><label>Espessura</label>'+stepFld("frLineWidth",state.lineWidth,1,4,.5,1)+'</div></div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Low Volume Nodes (LVN)</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="frLVNOn" type="checkbox" '+(state.lvnOn!==false?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Por profile</label>'+stepFld("frLVNCount",state.lvnCount,1,8,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Labels</label><label class="dvl-switch"><input id="frLVNLabels" type="checkbox" '+(state.lvnLabels!==false?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Estender</label><label class="dvl-switch"><input id="frLVNExtendOn" type="checkbox" '+(state.lvnExtendOn?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Qtd. anteriores</label>'+stepFld("frLVNExtendProfiles",state.lvnExtendProfiles,1,4,1,0)+'</div>'
      +'<div class="dvl-vt-field"><label>Opacidade %</label>'+stepFld("frLVNOpacity",Math.round(state.lvnOpacity*100),10,100,5,0)+'</div>'
      +colorFld("frLVNBelowColor","LVN abaixo","lvnBelowColor")+colorFld("frLVNAboveColor","LVN acima","lvnAboveColor")
      +'<div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>'+dropFld("frLVNStyle",STYLE_OPTS,state.lvnLineStyle)+'</div><div class="dvl-vt-field"><label>Espessura</label>'+stepFld("frLVNWidth",state.lvnLineWidth,.5,5,.5,1)+'</div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1"><label>Extensão</label><strong style="font-size:9px;color:var(--dvl-muted,#8ea0af);font-weight:800">Exclui o atual · 2 = penúltimo + antepenúltimo</strong></div></div></div>'
      +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Overnight da sessão New York</span></div><div class="dvl-vt-grid">'
      +'<div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="frOvOn" type="checkbox" '+(state.overnightOn?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field"><label>Linhas ON</label><label class="dvl-switch"><input id="frOvLines" type="checkbox" '+(state.ovLines!==false?'checked':'')+'><i></i><b></b></label></div>'
      +'<div class="dvl-vt-field" style="grid-column:1/-1"><label>Janela fixa</label><strong style="font-size:10px;color:var(--dvl-muted,#8ea0af);font-weight:800">18:00 → 09:30 · America/New_York</strong></div>'
      +'<div class="dvl-vt-field"><label>Cor ON</label><span style="width:22px;height:22px;border-radius:6px;background:#b86cff;border:1px solid rgba(255,255,255,.16);display:inline-block"></span></div>'
      +'<div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo ON</label>'+dropFld("frOvStyle",STYLE_OPTS,state.ovLineStyle)+'</div><div class="dvl-vt-field"><label>Espessura ON</label>'+stepFld("frOvLineWidth",state.ovLineWidth,1,3,.5,1)+'</div></div></div>';

    const boolMap={frOn:"on",frCurrent:"includeCurrent",frExtendP2:"extendProfile2",frExtendP3:"extendProfile3",frExtendP4:"extendProfile4",frExtendP5:"extendProfile5",frDeltaOn:"deltaOn",frLabels:"labels",frPOC:"showPOC",frVAH:"showVAH",frVAL:"showVAL",frLVNOn:"lvnOn",frLVNLabels:"lvnLabels",frLVNExtendOn:"lvnExtendOn",frOvOn:"overnightOn",frOvLines:"ovLines"};
    Object.keys(boolMap).forEach(id=>{const e=body.querySelector("#"+id);if(e)e.addEventListener("change",()=>{state[boolMap[id]]=!!e.checked;if(id==="frOn")updateRow();if(id==="frCurrent"||id==="frOvOn")clearCaches();save();if(typeof drawSoon==="function")drawSoon();});});
    const stepMap={frCount:["profiles",1],frWidth:["widthPct",.01],frOpacity:["opacity",.01],frVA:["valueAreaPct",.01],frRadius:["colRadius",1],frDeltaWidth:["deltaWidthPct",.01],frDeltaOpacity:["deltaOpacity",.01],frSH:["startH",1],frSM:["startM",1],frEH:["endH",1],frEM:["endM",1],frFont:["labelFontPx",1],frLineWidth:["lineWidth",1],frLVNCount:["lvnCount",1],frLVNExtendProfiles:["lvnExtendProfiles",1],frLVNOpacity:["lvnOpacity",.01],frLVNWidth:["lvnLineWidth",1],frOvLineWidth:["ovLineWidth",1]};
    function applyFRStep1345(id,shown){
      if(id==="frRowSize"){
        if(state.rowLayout==="ticks")state.ticksPerRow=Math.max(1,Math.min(100000,Math.round(shown)));
        else state.rows=Math.max(20,Math.min(300,Math.round(shown)));
        clearCaches();save();if(typeof drawSoon==="function")drawSoon();return;
      }
      const m=stepMap[id];if(!m)return;
      state[m[0]]=shown*m[1];
      if(["frCount","frVA","frSH","frSM","frEH","frEM"].includes(id))clearCaches();
      save();if(typeof drawSoon==="function")drawSoon();
    }
    body.querySelectorAll(".dvl-feb-step-btn").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.id;const min=+b.dataset.min,max=+b.dataset.max,st=+b.dataset.step,dec=+b.dataset.dec;let shown=+(body.querySelector("#"+id+"Val").textContent||0);shown=Math.max(min,Math.min(max,shown+(b.classList.contains("dvl-feb-step-inc")?st:-st)));body.querySelector("#"+id+"Val").textContent=dec?shown.toFixed(dec):String(Math.round(shown));applyFRStep1345(id,shown);}));
    if(window.DVLVPRowLayout1345)window.DVLVPRowLayout1345.bindEditable(body,applyFRStep1345);
    body.querySelectorAll(".dvl-drop-btn").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();const l=body.querySelector("#"+btn.id+"List");body.querySelectorAll(".dvl-drop-list.is-open").forEach(x=>{if(x!==l)x.classList.remove("is-open");});l.classList.toggle("is-open");}));
    body.querySelectorAll(".dvl-drop-item").forEach(it=>it.addEventListener("click",e=>{e.stopPropagation();const list=it.closest(".dvl-drop-list"),id=list.id.replace("List",""),val=it.dataset.val,btn=body.querySelector("#"+id);if(btn){const n=[...btn.childNodes].find(x=>x.nodeType===3);if(n)n.textContent=it.textContent;}list.classList.remove("is-open");if(id==="frSession"){state.sessionType=val;if(val!=="custom")applyPreset(val);clearCaches();renderPanel();return;}if(id==="frRowLayout"){state.rowLayout=val==="ticks"?"ticks":"rows";clearCaches();save();renderPanel();if(typeof drawSoon==="function")drawSoon();return;}if(id==="frTZ"){state.timezone=val;clearCaches();}if(id==="frAnchor")state.anchorMode=val==="end"?"end":"origin";if(id==="frLineStyle")state.lineStyle=val;if(id==="frLVNStyle")state.lvnLineStyle=val;if(id==="frOvStyle")state.ovLineStyle=val;save();if(typeof drawSoon==="function")drawSoon();}));
    body.querySelectorAll(".dvl-feb-clr-swatch").forEach(b=>b.addEventListener("click",()=>openPalette(b,b.dataset.key)));
    body.addEventListener("pointerdown",e=>{if(!e.target.closest(".dvl-drop-wrap"))body.querySelectorAll(".dvl-drop-list.is-open").forEach(x=>x.classList.remove("is-open"));});
  }

  function updateRow(){const p=document.getElementById("dvlFRVPState");if(p){p.textContent=state.on?"ON":"OFF";p.classList.toggle("is-on",!!state.on);}}
  function insertRow(){const menu=document.getElementById("indicatorDropdown");if(!menu)return;let item=document.getElementById("dvlFixedRangeVPItem");if(!item){item=document.createElement("div");item.id="dvlFixedRangeVPItem";item.className="indicatorItem";item.innerHTML='<span class="indicatorFxMark">FR</span><span><b>Fixed Range VP</b><small>Delta | Profile · LVN</small></span><i class="dvl-vt-state" id="dvlFRVPState">OFF</i>';const after=document.getElementById("dvlVolProfileItem");if(after&&after.parentNode)after.parentNode.insertBefore(item,after.nextSibling);else menu.appendChild(item);}if(!item.dataset.bound){item.dataset.bound="1";const p=item.querySelector("#dvlFRVPState");if(p)p.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setOn(!state.on);});item.addEventListener("click",e=>{e.stopPropagation();openPanel();});}updateRow();}
  function boot(){insertRow();updateRow();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();

  function getAnalysisProfiles(){
    try{
      const now=Date.now(),windows=sessionWindows(now);if(!windows.length)return [];
      const ovs=state.overnightOn&&state.sessionType!=="overnight"?windows.map(w=>overnightForNewYorkSession(w)):windows.map(()=>null);
      let sym="";try{sym=typeof symbol!=="undefined"?String(symbol||""):"";}catch(_){}
      const bundle=ensureData(sym,windows,ovs.filter(Boolean));
      if(bundle)return profilesFor(bundle,windows,ovs).slice();
      return profileCache&&profileCache.items?profileCache.items.slice():[];
    }catch(_){return profileCache&&profileCache.items?profileCache.items.slice():[];}
  }
  window.DVLFixedRangeVP={version:"1.347",on,setOn,draw,openPanel,get state(){return Object.assign({},state);},getProfiles:function(){return profileCache&&profileCache.items?profileCache.items.slice():[];},getAnalysisProfiles};
  window.DVLFixedRangeVPDraw=function(ctx,cfg){try{draw(ctx,cfg);}catch(e){try{console.warn("[DVL Fixed Range VP]",e);}catch(_){}}};
})();
