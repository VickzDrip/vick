(function(){
  "use strict";
  if(window.DVLFVGMagnetIFVG) return;

  const KEY="dvl_fvg_magnet_ifvg_v1";
  const DEFAULTS={
    on:false,
    targetTF:"15m",
    entryTF:"1m",
    direction:"auto",
    targetLookback:120,
    entryLookback:240,
    signalMaxAge:30,
    minGapAtr:0.05,
    minRR:1.0,
    singleUseTarget:false,
    showTarget:true,
    showIFVG:true,
    showTrade:true,
    showLabels:true,
    showStatus:true
  };
  const TARGET_TFS=["15m","30m","1h","4h"];
  const ENTRY_TFS=["1m","3m","5m"];
  const TF_MS={"1m":60000,"3m":180000,"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"4h":14400000};
  const DATA={key:"",entry:[],target:[],fetching:false,error:"",updated:0};
  let state=load(),panel=null,analysisCache=null;

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function normalize(s){
    const o=Object.assign(clone(DEFAULTS),s||{});
    o.on=!!o.on;
    o.targetTF=TARGET_TFS.includes(o.targetTF)?o.targetTF:"15m";
    o.entryTF=ENTRY_TFS.includes(o.entryTF)?o.entryTF:"1m";
    o.direction=["auto","above","below"].includes(o.direction)?o.direction:"auto";
    o.targetLookback=clamp(Math.round(+o.targetLookback||120),20,500);
    o.entryLookback=clamp(Math.round(+o.entryLookback||240),40,1000);
    o.signalMaxAge=clamp(Math.round(+o.signalMaxAge||30),1,200);
    o.minGapAtr=clamp(+o.minGapAtr||0.05,0,2);
    o.minRR=clamp(+o.minRR||1,0.1,10);
    o.singleUseTarget=!!o.singleUseTarget;
    o.showTarget=o.showTarget!==false;o.showIFVG=o.showIFVG!==false;o.showTrade=o.showTrade!==false;o.showLabels=o.showLabels!==false;o.showStatus=o.showStatus!==false;
    return o;
  }
  function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||"null"));}catch(_){return clone(DEFAULTS);}}
  function save(){state=normalize(state);analysisCache=null;try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}updateRow();rerenderModern();safeDraw();}
  function reset(){state=clone(DEFAULTS);analysisCache=null;save();renderPanel();}
  function safeDraw(){try{if(typeof drawSoon==="function")drawSoon();}catch(_){} }
  function rerenderModern(){try{const a=window.DVL_PHASE1B_INDICATORS_MENU_0813_API;if(a&&typeof a.render==="function")a.render();}catch(_){} }
  function toast(msg){try{if(typeof showToast==="function")return showToast(msg);}catch(_){} }
  function on(){return !!state.on;}
  function setOn(v){state.on=!!v;save();if(state.on)ensureData(true);return true;}
  function replayActive(){try{return !!(window.DVLReplay&&window.DVLReplay.status&&window.DVLReplay.status().active);}catch(_){return false;}}
  function getSymbol(){try{return String(window.currentSymbol||((typeof currentSymbol!=="undefined")?currentSymbol:"")||"BTCUSDT").replace("/","").toUpperCase();}catch(_){return "BTCUSDT";}}
  function getChartTF(){try{return String((typeof interval!=="undefined"&&interval)||"1m");}catch(_){return "1m";}}
  function chartData(){try{return Array.isArray(klines)?klines:[];}catch(_){return [];}}
  function cleanCandles(a){return (Array.isArray(a)?a:[]).map(c=>({time:+c.time,open:+c.open,high:+c.high,low:+c.low,close:+c.close,volume:+c.volume||0})).filter(c=>isFinite(c.time)&&isFinite(c.open)&&isFinite(c.high)&&isFinite(c.low)&&isFinite(c.close)).sort((a,b)=>a.time-b.time);}
  function parseRemote(rows){return (Array.isArray(rows)?rows:[]).map(r=>({time:+r[0],open:+r[1],high:+r[2],low:+r[3],close:+r[4],volume:+r[5]||0})).filter(c=>isFinite(c.time)&&isFinite(c.close));}
  function aggregate(candles,tf){
    const ms=TF_MS[tf]||900000,map=new Map();
    for(const c of candles){const t=Math.floor(c.time/ms)*ms;let b=map.get(t);if(!b){b={time:t,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume||0};map.set(t,b);}else{b.high=Math.max(b.high,c.high);b.low=Math.min(b.low,c.low);b.close=c.close;b.volume+=(c.volume||0);}}
    return Array.from(map.values()).sort((a,b)=>a.time-b.time);
  }
  function sources(){
    const ctf=getChartTF(),chart=cleanCandles(chartData()),replay=replayActive();
    let entry=(ctf===state.entryTF)?chart:DATA.entry;
    let target=(ctf===state.targetTF)?chart:DATA.target;
    if(entry.length&&TF_MS[state.targetTF]>=TF_MS[state.entryTF]&&TF_MS[state.targetTF]%TF_MS[state.entryTF]===0) target=aggregate(entry,state.targetTF);
    if(replay&&ctf!==state.entryTF){entry=[];target=[];}
    return {entry:entry||[],target:target||[],chartTF:ctf,replay};
  }
  async function fetchKlines(sym,tf){
    const url="https://fapi.binance.com/fapi/v1/klines?symbol="+encodeURIComponent(sym)+"&interval="+encodeURIComponent(tf)+"&limit=1000";
    const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);return parseRemote(await r.json());
  }
  async function ensureData(force){
    if(!state.on||replayActive())return;
    const sym=getSymbol(),key=sym+"|"+state.entryTF+"|"+state.targetTF;
    if(DATA.key!==key){DATA.key=key;DATA.entry=[];DATA.target=[];DATA.updated=0;analysisCache=null;}
    if(DATA.fetching)return;
    if(!force&&Date.now()-DATA.updated<25000)return;
    DATA.fetching=true;DATA.error="";
    try{
      const [entry,target]=await Promise.all([fetchKlines(sym,state.entryTF),fetchKlines(sym,state.targetTF)]);
      if(entry.length)DATA.entry=entry;if(target.length)DATA.target=target;DATA.updated=Date.now();analysisCache=null;safeDraw();renderStatusOnly();
    }catch(e){DATA.error=String(e&&e.message||e);}
    finally{DATA.fetching=false;renderStatusOnly();}
  }

  function atrValues(candles,period){
    const out=new Array(candles.length).fill(0);let sum=0,queue=[];
    for(let i=0;i<candles.length;i++){
      const c=candles[i],pc=i?candles[i-1].close:c.close,tr=Math.max(c.high-c.low,Math.abs(c.high-pc),Math.abs(c.low-pc));
      queue.push(tr);sum+=tr;if(queue.length>period)sum-=queue.shift();out[i]=sum/queue.length;
    }
    return out;
  }
  function fvgCandidates(candles,lookback){
    const n=candles.length,atr=atrValues(candles,14),start=Math.max(2,n-lookback),out=[];
    for(let i=start;i<n;i++){
      const a=candles[i-2],c=candles[i],minSize=(atr[i]||0)*state.minGapAtr;
      if(c.low>a.high){const lower=a.high,upper=c.low;if(upper-lower>=minSize)out.push({kind:"bull",lower,upper,createdAt:c.time,index:i});}
      if(c.high<a.low){const lower=c.high,upper=a.low;if(upper-lower>=minSize)out.push({kind:"bear",lower,upper,createdAt:c.time,index:i});}
    }
    return out;
  }
  function activeTargets(candles){
    const out=[],n=candles.length;
    for(const g of fvgCandidates(candles,state.targetLookback)){
      let lower=g.lower,upper=g.upper,filled=false;
      if(g.kind==="bull"){
        let remainUpper=upper;
        for(let j=g.index+1;j<n;j++){const lo=candles[j].low;if(lo<=lower){filled=true;break;}if(lo<remainUpper)remainUpper=lo;}
        upper=remainUpper;
      }else{
        let remainLower=lower;
        for(let j=g.index+1;j<n;j++){const hi=candles[j].high;if(hi>=upper){filled=true;break;}if(hi>remainLower)remainLower=hi;}
        lower=remainLower;
      }
      if(!filled&&upper>lower)out.push(Object.assign({},g,{lower,upper}));
    }
    return out;
  }
  function chooseTarget(candles,price){
    const all=activeTargets(candles),choices=[];
    for(const g of all){
      if(g.lower>price&&state.direction!=="below")choices.push(Object.assign({},g,{side:"above",direction:"long",distance:g.lower-price,targetPrice:g.lower}));
      else if(g.upper<price&&state.direction!=="above")choices.push(Object.assign({},g,{side:"below",direction:"short",distance:price-g.upper,targetPrice:g.upper}));
    }
    choices.sort((a,b)=>a.distance-b.distance||b.createdAt-a.createdAt);
    return {selected:choices[0]||null,count:choices.length,all};
  }
  function ifvgEvents(candles){
    const out=[],n=candles.length;
    for(const g of fvgCandidates(candles,state.entryLookback)){
      let breakIndex=-1,dir="";
      for(let j=g.index+1;j<n;j++){
        if(g.kind==="bear"&&candles[j].close>g.upper){breakIndex=j;dir="long";break;}
        if(g.kind==="bull"&&candles[j].close<g.lower){breakIndex=j;dir="short";break;}
      }
      if(breakIndex<0)continue;
      let invalid=false,invalidTime=0;
      for(let j=breakIndex+1;j<n;j++){
        if(dir==="long"&&candles[j].close<g.lower){invalid=true;invalidTime=candles[j].time;break;}
        if(dir==="short"&&candles[j].close>g.upper){invalid=true;invalidTime=candles[j].time;break;}
      }
      out.push(Object.assign({},g,{direction:dir,breakIndex,breakTime:candles[breakIndex].time,entry:candles[breakIndex].close,age:n-1-breakIndex,invalid,invalidTime}));
    }
    return out;
  }
  function activeIFVGs(candles){return ifvgEvents(candles).filter(g=>!g.invalid).sort((a,b)=>b.breakIndex-a.breakIndex);}
  function analyze(){
    const S=sources(),entry=S.entry,target=S.target;
    const key=[getSymbol(),state.targetTF,state.entryTF,state.direction,state.targetLookback,state.entryLookback,state.signalMaxAge,state.minGapAtr,state.minRR,state.singleUseTarget,entry.length,entry.at(-1)?.time,target.length,target.at(-1)?.time].join("|");
    if(analysisCache&&analysisCache.key===key)return analysisCache.value;
    let value={ready:false,status:"Carregando dados",sources:S,target:null,ifvg:null,signal:null,targetCount:0};
    if(entry.length<20||target.length<5){value.status=S.replay&&S.chartTF!==state.entryTF?"Replay: use o gráfico em "+state.entryTF:(DATA.fetching?"Carregando "+state.entryTF+" / "+state.targetTF:"Dados insuficientes");analysisCache={key,value};return value;}
    const price=entry.at(-1).close,T=chooseTarget(target,price);value.ready=true;value.target=T.selected;value.targetCount=T.count;
    if(!T.selected){value.status="Sem FVG "+state.targetTF+" não preenchido "+(state.direction==="above"?"acima":state.direction==="below"?"abaixo":"próximo");analysisCache={key,value};return value;}
    if(state.singleUseTarget){
      const used=ifvgEvents(entry).filter(g=>g.direction===T.selected.direction&&g.breakTime>=T.selected.createdAt).sort((a,b)=>a.breakIndex-b.breakIndex);
      const first=used[0]||null;
      if(first&&first.invalid){value.status="FVG já utilizado · primeiro IFVG invalidado";value.targetConsumed=true;analysisCache={key,value};return value;}
      if(first&&first.age>state.signalMaxAge){value.status="FVG já utilizado por IFVG antigo";value.targetConsumed=true;analysisCache={key,value};return value;}
      value.ifvg=first;
    }else{
      const candidates=activeIFVGs(entry).filter(g=>g.direction===T.selected.direction&&g.breakTime>=T.selected.createdAt&&g.age<=state.signalMaxAge);
      value.ifvg=candidates[0]||null;
    }
    if(!value.ifvg){value.status=(T.selected.direction==="long"?"Alvo acima":"Alvo abaixo")+" · aguardando IFVG "+state.entryTF;analysisCache={key,value};return value;}
    const g=value.ifvg,entryPrice=g.entry,stop=g.direction==="long"?g.lower:g.upper,targetPrice=T.selected.targetPrice;
    const risk=g.direction==="long"?entryPrice-stop:stop-entryPrice,reward=g.direction==="long"?targetPrice-entryPrice:entryPrice-targetPrice,rr=risk>0?reward/risk:0;
    const valid=risk>0&&reward>0&&rr>=state.minRR;
    value.signal={direction:g.direction,entry:entryPrice,stop,target:targetPrice,rr,valid,time:g.breakTime,age:g.age};
    value.status=valid?(g.direction==="long"?"LONG":"SHORT")+" confirmado · R:R "+rr.toFixed(2):"IFVG encontrado · R:R "+rr.toFixed(2)+" abaixo do mínimo";
    analysisCache={key,value};return value;
  }

  function timeToX(ts,cfg){
    const v=cfg.view||[];if(!v.length)return NaN;const n=v.length;
    if(n===1)return cfg.x(cfg.slotOffset||0);
    const t0=+v[0].time,tn=+v[n-1].time;
    let pos=0;
    if(ts<=t0){const dt=Math.max(1,+v[1].time-t0);pos=(ts-t0)/dt;}
    else if(ts>=tn){const dt=Math.max(1,tn-(+v[n-2].time));pos=n-1+(ts-tn)/dt;}
    else{let lo=0,hi=n-1;while(lo+1<hi){const m=(lo+hi)>>1;if(+v[m].time<=ts)lo=m;else hi=m;}const a=+v[lo].time,b=+v[hi].time;pos=lo+(ts-a)/Math.max(1,b-a);}
    return cfg.x((cfg.slotOffset||0)+pos);
  }
  function drawTag(ctx,text,x,y,color,align){ctx.save();ctx.font = "800 9px system-ui";const w=ctx.measureText(text).width+10,h=18;let bx=align==="right"?x-w:x;bx=clamp(bx,2,Math.max(2,ctx.canvas.width-w-2));ctx.fillStyle="rgba(4,12,17,.88)";ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx,y-h+2,w,h,6);else ctx.rect(bx,y-h+2,w,h);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(text,bx+5,y-h/2+2);ctx.restore();}
  function drawLine(ctx,cfg,price,x0,color,dash,label){const yy=cfg.y(price);if(yy<cfg.y0-4||yy>cfg.y1+4)return;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.35;ctx.setLineDash(dash||[]);ctx.beginPath();ctx.moveTo(Math.max(cfg.x0,x0),yy);ctx.lineTo(cfg.x1-3,yy);ctx.stroke();ctx.setLineDash([]);if(state.showLabels)drawTag(ctx,label,cfg.x1-5,yy-2,color,"right");ctx.restore();}
  function draw(ctx,cfg){
    if(!state.on||!cfg||!cfg.y)return;const A=analyze();if(!A.ready){if(state.showStatus){ctx.save();drawTag(ctx,A.status,cfg.x0+8,cfg.y0+25,"#8fa5b5","left");ctx.restore();}return;}
    const T=A.target;if(!T)return;const long=T.direction==="long",targetColor=long?"#18e09b":"#ff5b70",ifvgColor=long?"#35d9ff":"#ff9b35";
    ctx.save();
    if(state.showTarget){const tx=Math.max(cfg.x0,timeToX(T.createdAt,cfg)),yt=cfg.y(T.upper),yb=cfg.y(T.lower),top=Math.min(yt,yb),h=Math.max(2,Math.abs(yb-yt));ctx.fillStyle=long?"rgba(24,224,155,.13)":"rgba(255,91,112,.13)";ctx.strokeStyle=long?"rgba(24,224,155,.75)":"rgba(255,91,112,.75)";ctx.setLineDash([6,4]);ctx.fillRect(tx,top,Math.max(2,cfg.x1-tx),h);ctx.strokeRect(tx+.5,top+.5,Math.max(1,cfg.x1-tx-1),Math.max(1,h-1));ctx.setLineDash([]);if(state.showLabels)drawTag(ctx,state.targetTF+" FVG TARGET "+(long?"↑":"↓"),cfg.x1-6,top-3,targetColor,"right");}
    if(A.ifvg&&state.showIFVG){const g=A.ifvg,gx=Math.max(cfg.x0,timeToX(g.createdAt,cfg)),yt=cfg.y(g.upper),yb=cfg.y(g.lower),top=Math.min(yt,yb),h=Math.max(2,Math.abs(yb-yt));ctx.fillStyle=long?"rgba(53,217,255,.14)":"rgba(255,155,53,.14)";ctx.strokeStyle=ifvgColor;ctx.setLineDash([3,3]);ctx.fillRect(gx,top,Math.max(2,cfg.x1-gx),h);ctx.strokeRect(gx+.5,top+.5,Math.max(1,cfg.x1-gx-1),Math.max(1,h-1));ctx.setLineDash([]);if(state.showLabels)drawTag(ctx,state.entryTF+" IFVG "+(long?"LONG":"SHORT"),cfg.x1-6,top-3,ifvgColor,"right");}
    if(A.signal&&state.showTrade){const s=A.signal,sx=Math.max(cfg.x0,timeToX(s.time,cfg));drawLine(ctx,cfg,s.entry,sx,"#eaf4ef",[],"ENTRY");drawLine(ctx,cfg,s.stop,sx,"#ff4a61",[5,4],"SL");drawLine(ctx,cfg,s.target,sx,"#19e69a",[7,4],"TP · R:R "+s.rr.toFixed(2));const py=cfg.y(s.entry);ctx.fillStyle=s.valid?targetColor:"#ffd321";ctx.beginPath();if(long){ctx.moveTo(sx,py-9);ctx.lineTo(sx-5,py-1);ctx.lineTo(sx+5,py-1);}else{ctx.moveTo(sx,py+9);ctx.lineTo(sx-5,py+1);ctx.lineTo(sx+5,py+1);}ctx.closePath();ctx.fill();}
    if(state.showStatus)drawTag(ctx,A.status,cfg.x0+8,cfg.y0+25,A.signal&&A.signal.valid?targetColor:"#ffd321","left");
    ctx.restore();
  }

  function updateRow(){const st=document.getElementById("dvlFVGMagnetState");if(st){st.textContent=state.on?"ON":"OFF";st.classList.toggle("is-on",state.on);}}
  function insertRow(){const menu=document.getElementById("indicatorDropdown");if(!menu)return;let item=document.getElementById("dvlFVGMagnetItem");if(!item){item=document.createElement("div");item.id="dvlFVGMagnetItem";item.className="indicatorItem";item.innerHTML='<span class="indicatorFxMark">IF</span><span><b>DVL FVG Magnet IFVG</b><small>HTF target · LTF trigger · R:R</small></span><i class="dvl-vt-state" id="dvlFVGMagnetState">OFF</i>';const after=document.getElementById("dvlFvgFirewallItem")||document.getElementById("dvlFixedRangeVPItem");if(after&&after.parentNode)after.parentNode.insertBefore(item,after.nextSibling);else menu.appendChild(item);}if(!item.dataset.bound){item.dataset.bound="1";item.querySelector("#dvlFVGMagnetState").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setOn(!state.on);});item.addEventListener("click",e=>{e.stopPropagation();openPanel();});}updateRow();}
  function toggle(id,label,checked){return `<div class="dvl-vt-field"><label>${label}</label><label class="dvl-switch"><input id="${id}" type="checkbox" ${checked?"checked":""}><i></i><b></b></label></div>`;}
  function num(id,label,val,min,max,step){return `<div class="dvl-vt-field"><label>${label}</label><input id="${id}" class="dvl-vt-input" type="number" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;}
  function chips(key,items,current){return `<div class="dvl-ifvg-chips">${items.map(([v,l])=>`<button type="button" data-ifvg-set="${key}" data-value="${v}" class="${String(v)===String(current)?"is-on":""}">${l}</button>`).join("")}</div>`;}
  function ensurePanel(){if(panel&&document.contains(panel))return panel;panel=document.createElement("div");panel.id="dvlFVGMagnetPanel";panel.className="dvl-vt-panel dvl-ifvg-panel";panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>DVL FVG Magnet IFVG</b><small>alvo HTF · gatilho LTF · risco definido</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-reset-icon" id="dvlFVGMagnetReset" type="button" aria-label="Reset">↻</button><button class="dvl-vt-close" id="dvlFVGMagnetClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlFVGMagnetBody"></div>';document.body.appendChild(panel);panel.addEventListener("pointerdown",e=>e.stopPropagation(),true);panel.querySelector("#dvlFVGMagnetClose").addEventListener("click",closePanel);panel.querySelector("#dvlFVGMagnetReset").addEventListener("click",reset);return panel;}
  function openPanel(){ensurePanel();panel.classList.add("is-open");renderPanel();ensureData(false);}
  function closePanel(){if(panel)panel.classList.remove("is-open");}
  function statusHTML(){const a=analyze();return `<div class="dvl-ifvg-status"><b>${a.status}</b><span>${DATA.fetching?"Atualizando dados…":DATA.error?("API: "+DATA.error):(a.targetCount?`${a.targetCount} alvo(s) elegível(is)`:"Motor ativo")}</span></div>`;}
  function renderStatusOnly(){if(!panel)return;const s=panel.querySelector("#dvlFVGMagnetStatus");if(s)s.innerHTML=statusHTML();}
  function renderPanel(){ensurePanel();const b=panel.querySelector("#dvlFVGMagnetBody");b.innerHTML=`
    <div id="dvlFVGMagnetStatus">${statusHTML()}</div>
    <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>1. Motor</span></div><div class="dvl-vt-grid">${toggle("dvlIFOn","Indicador",state.on)}${toggle("dvlIFStatus","Status no gráfico",state.showStatus)}${toggle("dvlIFLabels","Labels",state.showLabels)}</div></div>
    <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>2. Timeframes</span></div><label class="dvl-ifvg-label">Alvo / magnet</label>${chips("targetTF",TARGET_TFS.map(x=>[x,x]),state.targetTF)}<label class="dvl-ifvg-label">Entrada / IFVG</label>${chips("entryTF",ENTRY_TFS.map(x=>[x,x]),state.entryTF)}</div>
    <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>3. Direção do alvo</span></div>${chips("direction",[["auto","Automático"],["above","Somente acima"],["below","Somente abaixo"]],state.direction)}</div>
    <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>4. Filtros</span></div><div class="dvl-vt-grid">${num("dvlIFTargetLookback","Alvo: candles",state.targetLookback,20,500,1)}${num("dvlIFEntryLookback","IFVG: candles",state.entryLookback,40,1000,1)}${num("dvlIFSignalAge","Idade máxima",state.signalMaxAge,1,200,1)}${num("dvlIFGapATR","Gap mínimo ATR",state.minGapAtr,0,2,0.01)}${num("dvlIFMinRR","R:R mínimo",state.minRR,0.1,10,0.1)}${toggle("dvlIFSingleUse","Usar cada FVG uma vez",state.singleUseTarget)}</div></div>
    <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>5. Visual</span></div><div class="dvl-vt-grid">${toggle("dvlIFTarget","Zona alvo",state.showTarget)}${toggle("dvlIFZone","Zona IFVG",state.showIFVG)}${toggle("dvlIFTrade","Entry / SL / TP",state.showTrade)}</div></div>`;bindPanel();}
  function bindPanel(){
    const map={dvlIFOn:["on","check"],dvlIFStatus:["showStatus","check"],dvlIFLabels:["showLabels","check"],dvlIFTargetLookback:["targetLookback","num"],dvlIFEntryLookback:["entryLookback","num"],dvlIFSignalAge:["signalMaxAge","num"],dvlIFGapATR:["minGapAtr","num"],dvlIFMinRR:["minRR","num"],dvlIFSingleUse:["singleUseTarget","check"],dvlIFTarget:["showTarget","check"],dvlIFZone:["showIFVG","check"],dvlIFTrade:["showTrade","check"]};
    Object.entries(map).forEach(([id,[key,type]])=>{const e=panel.querySelector("#"+id);if(!e)return;e.addEventListener("change",()=>{if(key==="on"){setOn(e.checked);e.checked=state.on;}else{state[key]=type==="check"?e.checked:+e.value;save();renderStatusOnly();}});});
    panel.querySelectorAll("[data-ifvg-set]").forEach(e=>e.addEventListener("click",()=>{state[e.dataset.ifvgSet]=e.dataset.value;save();ensureData(true);renderPanel();}));
  }
  function boot(){insertRow();updateRow();if(state.on)ensureData(false);setInterval(()=>{if(state.on&&!replayActive())ensureData(false);},30000);safeDraw();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();

  window.DVLFVGMagnetIFVG={version:"1.1",on,setOn,open:openPanel,openPanel,close:closePanel,reset,refresh:()=>ensureData(true),getAnalysis:analyze,get state(){return clone(state);}};
  window.DVLFVGMagnetIFVGDraw=draw;
})();
