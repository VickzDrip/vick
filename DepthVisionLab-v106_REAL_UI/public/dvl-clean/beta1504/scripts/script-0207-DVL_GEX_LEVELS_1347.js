(function(){
  "use strict";
  const STORE_KEY="dvl_gex_levels_v1";
  const DEFAULTS={
    on:false,auto:true,refreshSec:60,zones:true,zoneOpacity:.055,labels:true,
    showFlip:true,showMaxPain:true,show1dMax:true,show1dMin:true,
    manualFlip:0,manualMaxPain:0,manual1dMax:0,manual1dMin:0,
    colorFlip:"#ff9f43",colorMaxPain:"#3fa9ff",color1dMax:"#f3c768",color1dMin:"#f3c768",
    lineWidth:1.4
  };
  let state=Object.assign({},DEFAULTS);
  try{Object.assign(state,JSON.parse(localStorage.getItem(STORE_KEY)||"{}")||{});}catch(_){}
  state.refreshSec=Math.max(15,Math.min(900,Math.round(+state.refreshSec||60)));
  state.zoneOpacity=Math.max(0,Math.min(.25,+state.zoneOpacity||.055));
  let live={flip:0,maxPain:0,oneDayMax:0,oneDayMin:0,netGex:NaN,updatedAt:0,stale:false,availability:"",source:"",asset:"BTC"};
  let status={kind:"warn",text:"Aguardando primeira atualização"};
  let fetching=false,timer=0,lastAsset="",panel=null;
  function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(_){} }
  function on(){return !!state.on;}
  function requestDraw(){try{if(typeof drawSoon==="function")drawSoon();}catch(_){} }
  function setOn(v){state.on=!!v;save();updateRow();schedule(true);requestDraw();}
  function assetFromSymbol(sym){sym=String(sym||"").toUpperCase();if(sym.includes("ETH"))return"ETH";if(sym.includes("SOL"))return"SOL";return"BTC";}
  function activeSymbol(){try{return typeof symbol!=="undefined"?symbol:"BTCUSDT";}catch(_){return"BTCUSDT";}}
  function num(v){if(typeof v==="string")v=v.replace(/[$,%\s]/g,"").replace(/,/g,"");v=Number(v);return Number.isFinite(v)?v:NaN;}
  function norm(k){return String(k||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
  function flatten(x,path,out,seen,depth){
    if(depth>9||x==null)return; if(typeof x!=="object"){out.push({path,n:norm(path),value:x});return;}
    if(seen.has(x))return;seen.add(x);
    if(Array.isArray(x)){for(let i=0;i<Math.min(x.length,300);i++)flatten(x[i],path+"."+i,out,seen,depth+1);return;}
    for(const k of Object.keys(x))flatten(x[k],path?path+"."+k:k,out,seen,depth+1);
  }
  function pickFlat(out,names,priceLike){
    const exact=names.map(norm);
    let candidates=[];
    for(const e of out){const v=num(e.value);if(!Number.isFinite(v))continue;if(priceLike&&(!(v>100)||v>10000000))continue;const tail=norm(e.path.split(".").pop());let score=-1;for(const n of exact){if(tail===n)score=Math.max(score,100);else if(e.n.endsWith(n))score=Math.max(score,80);else if(e.n.includes(n))score=Math.max(score,50);}if(score>=0)candidates.push({score,path:e.path,v});}
    candidates.sort((a,b)=>b.score-a.score||a.path.length-b.path.length);return candidates.length?candidates[0].v:NaN;
  }
  function scanNamedLevels(x,res,depth,seen){
    if(depth>9||x==null||typeof x!=="object"||seen.has(x))return;seen.add(x);
    if(Array.isArray(x)){for(const q of x.slice(0,300))scanNamedLevels(q,res,depth+1,seen);return;}
    const label=norm(x.label||x.name||x.title||x.type||x.key||x.levelName||"");
    const v=num(x.price??x.value??x.level??x.strike??x.y);
    if(label&&Number.isFinite(v)&&v>100&&v<10000000){
      if(label.includes("maxpain"))res.maxPain=v;
      else if(label.includes("gammaflip")||label==="flip"||label.includes("zerogamma"))res.flip=v;
      else if(label.includes("1dmax")||label.includes("onedaymax")||label.includes("expectedhigh"))res.oneDayMax=v;
      else if(label.includes("1dmin")||label.includes("onedaymin")||label.includes("expectedlow"))res.oneDayMin=v;
    }
    for(const k of Object.keys(x))scanNamedLevels(x[k],res,depth+1,seen);
  }
  function parsePayload(payload){
    const out=[];flatten(payload,"",out,new WeakSet(),0);const res={};scanNamedLevels(payload,res,0,new WeakSet());
    res.flip=res.flip||pickFlat(out,["gammaFlip","flip","zeroGamma","gammaZero","zeroGammaLevel"],true);
    res.maxPain=res.maxPain||pickFlat(out,["maxPain","maxPainStrike","painStrike"],true);
    res.oneDayMax=res.oneDayMax||pickFlat(out,["1dMax","oneDayMax","dayMax","expectedHigh","impliedHigh","upperExpectedMove"],true);
    res.oneDayMin=res.oneDayMin||pickFlat(out,["1dMin","oneDayMin","dayMin","expectedLow","impliedLow","lowerExpectedMove"],true);
    res.netGex=pickFlat(out,["netGex","netGamma","totalGex","dealerGamma"],false);
    const ts=pickFlat(out,["dataTimestamp","computedAt","updatedAt","timestamp"],false);res.updatedAt=Number.isFinite(ts)?ts:Date.now();
    const staleEntry=out.find(e=>norm(e.path).endsWith("stale"));res.stale=!!(staleEntry&&staleEntry.value===true);
    const av=out.find(e=>norm(e.path).endsWith("availability"));res.availability=av?String(av.value||""):"";
    return res;
  }
  async function fetchJSON(url){
    const ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),10000);
    try{const r=await fetch(url,{cache:"no-store",mode:"cors",credentials:"omit",headers:{Accept:"application/json"},signal:ctrl.signal});if(!r.ok)throw new Error("HTTP "+r.status);return await r.json();}finally{clearTimeout(to);}
  }
  /* resolve a base do backend do DVL (mesma origem/host do scanner) */
  function dvlApi(p){try{const br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023;if(br&&typeof br.api==="function")return br.api(p);}catch(_){}return p;}
  /* 1) BACKEND same-origin: contrato já normalizado (sem CORS, sem chave no cliente) */
  async function fetchFromBackend(asset){
    const b=await fetchJSON(dvlApi("/api/dvl/gex-levels?asset="+asset));
    if(!b||b.ok!==true)throw new Error("backend gex not ok");
    const found=[b.flip,b.maxPain,b.oneDayMax,b.oneDayMin].filter(v=>Number.isFinite(v)&&v>0).length;
    if(!found&&!Number.isFinite(b.netGex))throw new Error("backend gex vazio");
    return {flip:+b.flip||0,maxPain:+b.maxPain||0,oneDayMax:+b.oneDayMax||0,oneDayMin:+b.oneDayMin||0,
      netGex:Number.isFinite(b.netGex)?b.netGex:NaN,stale:!!b.stale,availability:b.availability||"",
      source:b.source||"DVL backend",found:found};
  }
  async function refresh(force){
    if(fetching||!state.auto||(!state.on&&!force))return;
    fetching=true;status={kind:"warn",text:"Atualizando níveis GEX…"};renderStatus();
    const asset=assetFromSymbol(activeSymbol());lastAsset=asset;
    /* PRIORIDADE 1 — backend same-origin do DVL (sem CORS, sem chave no cliente).
       stale-while-revalidate: só troca 'live' quando a nova resposta chega. */
    try{
      const bk=await fetchFromBackend(asset);
      live={flip:bk.flip,maxPain:bk.maxPain,oneDayMax:bk.oneDayMax,oneDayMin:bk.oneDayMin,netGex:bk.netGex,updatedAt:Date.now(),stale:bk.stale,availability:bk.availability,source:bk.source,asset};
      status={kind:bk.stale?"warn":"ok",text:(bk.stale?"GEX parcial/stale":"GEX atualizado")+" · "+asset+(bk.found?(" · "+bk.found+" níveis"):"")};
      fetching=false;renderStatus();renderPanelValues();requestDraw();schedule(false);return;
    }catch(_bkErr){ /* backend indisponível → tenta API direta abaixo */ }
    /* PRIORIDADE 2 — API direta do GEX Monitor (fallback opcional, pode falhar por CORS) */
    const hosts=["https://www.gexmonitor.com","https://gexmonitor.com"];
    let latest=null,pain=null,used="";
    for(const host of hosts){
      try{
        const rs=await Promise.allSettled([
          fetchJSON(host+"/api/gex-latest?asset="+asset+"&summary=true&lite=true"),
          fetchJSON(host+"/api/max-pain?asset="+asset+"&range=latest")
        ]);
        if(rs[0].status==="fulfilled")latest=rs[0].value;
        if(rs[1].status==="fulfilled")pain=rs[1].value;
        if(latest||pain){used=host;break;}
      }catch(_){}
    }
    try{
      let merged={};if(latest)Object.assign(merged,parsePayload(latest));if(pain){const p=parsePayload(pain);for(const k of Object.keys(p))if((k==="maxPain"&&p[k])||merged[k]==null||!Number.isFinite(merged[k]))merged[k]=p[k];}
      const found=[merged.flip,merged.maxPain,merged.oneDayMax,merged.oneDayMin].filter(v=>Number.isFinite(v)&&v>0).length;
      if(found){live={flip:+merged.flip||0,maxPain:+merged.maxPain||0,oneDayMax:+merged.oneDayMax||0,oneDayMin:+merged.oneDayMin||0,netGex:Number.isFinite(merged.netGex)?merged.netGex:NaN,updatedAt:Date.now(),stale:!!merged.stale,availability:merged.availability||"",source:used||"GEX Monitor",asset};status={kind:live.stale?"warn":"ok",text:(live.stale?"Dados recebidos, marcados como stale":"GEX atualizado")+" · "+asset+" · "+found+" níveis"};}
      else status={kind:"error",text:"API respondeu, mas não encontrei Flip/Max Pain/1D. Valores manuais continuam ativos."};
    }catch(e){status={kind:"error",text:"Falha ao interpretar API. Valores manuais continuam ativos."};}
    if(!latest&&!pain)status={kind:"error",text:"Backend GEX indisponível · usando manual"};
    fetching=false;renderStatus();renderPanelValues();requestDraw();schedule(false);
  }
  function schedule(immediate){clearTimeout(timer);if(!state.auto||!state.on)return;if(immediate)setTimeout(()=>refresh(true),20);timer=setTimeout(()=>refresh(true),state.refreshSec*1000);}
  function activeLevels(){return{
    flip:state.auto&&live.flip>0?live.flip:+state.manualFlip||0,
    maxPain:state.auto&&live.maxPain>0?live.maxPain:+state.manualMaxPain||0,
    oneDayMax:state.auto&&live.oneDayMax>0?live.oneDayMax:+state.manual1dMax||0,
    oneDayMin:state.auto&&live.oneDayMin>0?live.oneDayMin:+state.manual1dMin||0,
    netGex:state.auto?live.netGex:NaN,stale:state.auto&&live.stale
  };}
  function fmt(v){try{return typeof fmtPrice==="function"?fmtPrice(v):Number(v).toLocaleString("pt-BR",{maximumFractionDigits:2});}catch(_){return String(Math.round(v*100)/100);}}
  function rr(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,h/2,w/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
  function draw(ctx,cfg){
    if(!state.on||!ctx||!cfg||typeof cfg.y!=="function")return;
    const L=activeLevels(),last=cfg.view&&cfg.view.length?+cfg.view[cfg.view.length-1].close:0;
    ctx.save();try{
      ctx.beginPath();ctx.rect(cfg.x0,cfg.y0,cfg.x1-cfg.x0,cfg.y1-cfg.y0);ctx.clip();
      if(state.zones&&L.flip>0){const fy=cfg.y(L.flip),a=Math.max(0,Math.min(.25,+state.zoneOpacity||.055));if(fy>cfg.y0&&fy<cfg.y1){ctx.fillStyle="rgba(19,220,141,"+a+")";ctx.fillRect(cfg.x0,cfg.y0,cfg.x1-cfg.x0,Math.max(0,fy-cfg.y0));ctx.fillStyle="rgba(255,74,97,"+a+")";ctx.fillRect(cfg.x0,fy,cfg.x1-cfg.x0,Math.max(0,cfg.y1-fy));}}
      const levels=[];
      if(state.show1dMax&&L.oneDayMax>0)levels.push({name:"1D MAX",v:L.oneDayMax,c:state.color1dMax||"#f3c768",dash:[6,4]});
      if(state.showMaxPain&&L.maxPain>0)levels.push({name:"MAX PAIN",v:L.maxPain,c:state.colorMaxPain||"#3fa9ff",dash:[]});
      if(state.showFlip&&L.flip>0)levels.push({name:"FLIP",v:L.flip,c:state.colorFlip||"#ff9f43",dash:[7,4]});
      if(state.show1dMin&&L.oneDayMin>0)levels.push({name:"1D MIN",v:L.oneDayMin,c:state.color1dMin||"#f3c768",dash:[6,4]});
      const labels=[];for(const q of levels){const yy=cfg.y(q.v);if(yy<cfg.y0-8||yy>cfg.y1+8)continue;ctx.strokeStyle=q.c;ctx.lineWidth=Math.max(.5,+state.lineWidth||1.4);ctx.setLineDash(q.dash);ctx.globalAlpha=.94;ctx.beginPath();ctx.moveTo(cfg.x0,yy+.5);ctx.lineTo(cfg.x1-3,yy+.5);ctx.stroke();labels.push({q,y:yy});}
      if(state.labels&&labels.length){labels.sort((a,b)=>a.y-b.y);let prev=-1e9;for(const z of labels){z.ly=Math.max(z.y,prev+14);z.ly=Math.min(cfg.y1-8,z.ly);prev=z.ly;}ctx.font="900 9px system-ui";ctx.textAlign="right";ctx.textBaseline="middle";ctx.setLineDash([]);for(const z of labels){const text=z.q.name+"  "+fmt(z.q.v),w=Math.ceil(ctx.measureText(text).width)+12,x=cfg.x1-6,y=z.ly;if(Math.abs(y-z.y)>2){ctx.strokeStyle=z.q.c;ctx.globalAlpha=.6;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-w-5,z.y);ctx.lineTo(x-w-5,y);ctx.lineTo(x-w+1,y);ctx.stroke();}ctx.globalAlpha=.92;ctx.fillStyle="rgba(3,10,8,.88)";rr(ctx,x-w,y-7,w,14,5);ctx.fill();ctx.strokeStyle=z.q.c;ctx.globalAlpha=.75;ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=z.q.c;ctx.fillText(text,x-6,y);}}
      let regime="GEX";let col="#91a6ba";if(Number.isFinite(L.netGex)){let gv=L.netGex,a=Math.abs(gv),vs=(gv>=0?"+":"−")+(a>=1e9?(a/1e9).toFixed(2)+"B":a>=1e6?(a/1e6).toFixed(1)+"M":a>=1e3?(a/1e3).toFixed(0)+"K":String(Math.round(a)));regime=(gv>=0?"G+ · REJEIÇÃO":"G− · EXPANSÃO")+" · "+vs;col=gv>=0?"#13dc8d":"#ff4a61";}else if(L.flip>0&&last>0){regime=last>=L.flip?"ACIMA DO FLIP":"ABAIXO DO FLIP";col=last>=L.flip?"#13dc8d":"#ff4a61";}if(L.stale)regime+=" · STALE";
      ctx.setLineDash([]);ctx.font="900 9px system-ui";const bw=Math.ceil(ctx.measureText(regime).width)+14,bx=cfg.x0+7,by=cfg.y0+7;ctx.fillStyle="rgba(3,10,8,.84)";rr(ctx,bx,by,bw,17,6);ctx.fill();ctx.strokeStyle=col;ctx.globalAlpha=.75;ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=col;ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(regime,bx+7,by+8.5);
    }finally{ctx.restore();}
  }
  function step(id,val,min,max,st,dec){const v=dec?(+val).toFixed(dec):String(Math.round(+val||0));return'<div class="dvl-feb-step-wrap"><button class="dvl-feb-step-btn dvl-feb-step-dec" type="button" data-id="'+id+'" data-step="'+st+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'">−</button><span class="dvl-feb-step-val" id="'+id+'Val">'+v+'</span><button class="dvl-feb-step-btn dvl-feb-step-inc" type="button" data-id="'+id+'" data-step="'+st+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'">+</button></div>';}
  function check(id,label,onv){return'<label class="dvl-vt-check"><span>'+label+'</span><input id="'+id+'" type="checkbox" '+(onv?'checked':'')+'></label>';}
  function ensurePanel(){if(panel&&document.contains(panel))return panel;panel=document.createElement("div");panel.id="dvlGEXPanel";panel.className="dvl-vt-panel dvl-gex-panel";panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>DVL GEX Levels</b><small>Flip · Max Pain · faixa implícita 1D</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-reset-icon" id="dvlGEXReset" type="button">↻</button><button class="dvl-vt-close" id="dvlGEXClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlGEXBody"></div>';document.body.appendChild(panel);panel.addEventListener("pointerdown",e=>e.stopPropagation(),true);panel.querySelector("#dvlGEXClose").addEventListener("click",closePanel);panel.querySelector("#dvlGEXReset").addEventListener("click",()=>{state=Object.assign({},DEFAULTS);live={flip:0,maxPain:0,oneDayMax:0,oneDayMin:0,netGex:NaN,updatedAt:0,stale:false,availability:"",source:"",asset:"BTC"};save();renderPanel();updateRow();schedule(true);requestDraw();});return panel;}
  function renderStatus(){if(!panel)return;const e=panel.querySelector("#dvlGEXStatus");if(e){e.className="dvl-gex-status is-"+status.kind;e.textContent=status.text;}}
  function renderPanelValues(){if(!panel||!panel.classList.contains("is-open"))return;for(const [id,v] of [["gexFlip",activeLevels().flip],["gexPain",activeLevels().maxPain],["gex1DMax",activeLevels().oneDayMax],["gex1DMin",activeLevels().oneDayMin]]){const e=panel.querySelector("#"+id+"Live");if(e)e.textContent=v>0?fmt(v):"—";}}
  function renderPanel(){ensurePanel();const b=panel.querySelector("#dvlGEXBody");b.innerHTML=''
    +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Fonte</span></div><div class="dvl-vt-grid">'
    +'<div class="dvl-vt-field">'+check("gexOn","Indicador",state.on)+'</div><div class="dvl-vt-field">'+check("gexAuto","API automática",state.auto)+'</div>'
    +'<div class="dvl-vt-field"><label>Atualização (s)</label>'+step("gexRefresh",state.refreshSec,15,900,15,0)+'</div>'
    +'<div class="dvl-vt-field"><label>Ação</label><button class="dvl-vt-action" id="dvlGEXRefreshNow" type="button">Atualizar agora</button></div>'
    +'<div class="dvl-vt-field full"><div id="dvlGEXStatus" class="dvl-gex-status is-'+status.kind+'">'+status.text+'</div></div></div></div>'
    +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Níveis</span></div><div class="dvl-vt-grid">'
    +'<div class="dvl-vt-field">'+check("gexShowFlip","Flip",state.showFlip)+'</div><div class="dvl-vt-field"><label>Ativo</label><strong id="gexFlipLive" style="font-size:10px;color:#ff9f43">—</strong></div><div class="dvl-vt-field full"><label>Manual Flip</label>'+step("gexFlip",state.manualFlip,0,10000000,50,2)+'</div>'
    +'<div class="dvl-vt-field">'+check("gexShowPain","Max Pain",state.showMaxPain)+'</div><div class="dvl-vt-field"><label>Ativo</label><strong id="gexPainLive" style="font-size:10px;color:#3fa9ff">—</strong></div><div class="dvl-vt-field full"><label>Manual Max Pain</label>'+step("gexPain",state.manualMaxPain,0,10000000,50,2)+'</div>'
    +'<div class="dvl-vt-field">'+check("gexShow1DMax","1D Max",state.show1dMax)+'</div><div class="dvl-vt-field"><label>Ativo</label><strong id="gex1DMaxLive" style="font-size:10px;color:#f3c768">—</strong></div><div class="dvl-vt-field full"><label>Manual 1D Max</label>'+step("gex1DMax",state.manual1dMax,0,10000000,50,2)+'</div>'
    +'<div class="dvl-vt-field">'+check("gexShow1DMin","1D Min",state.show1dMin)+'</div><div class="dvl-vt-field"><label>Ativo</label><strong id="gex1DMinLive" style="font-size:10px;color:#f3c768">—</strong></div><div class="dvl-vt-field full"><label>Manual 1D Min</label>'+step("gex1DMin",state.manual1dMin,0,10000000,50,2)+'</div></div></div>'
    +'<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Visual</span></div><div class="dvl-vt-grid">'
    +'<div class="dvl-vt-field">'+check("gexZones","Zonas do Flip",state.zones)+'</div><div class="dvl-vt-field">'+check("gexLabels","Labels",state.labels)+'</div>'
    +'<div class="dvl-vt-field"><label>Opacidade zonas %</label>'+step("gexZoneOpacity",Math.round(state.zoneOpacity*100),0,25,1,0)+'</div><div class="dvl-vt-field"><label>Espessura</label>'+step("gexLineWidth",state.lineWidth,.5,4,.5,1)+'</div></div></div>';
    const bools={gexOn:"on",gexAuto:"auto",gexShowFlip:"showFlip",gexShowPain:"showMaxPain",gexShow1DMax:"show1dMax",gexShow1DMin:"show1dMin",gexZones:"zones",gexLabels:"labels"};for(const id of Object.keys(bools)){const e=b.querySelector("#"+id);if(e)e.addEventListener("change",()=>{state[bools[id]]=!!e.checked;if(id==="gexOn")updateRow();save();schedule(true);renderPanelValues();requestDraw();});}
    function apply(id,v){if(id==="gexRefresh")state.refreshSec=Math.round(v);else if(id==="gexFlip")state.manualFlip=v;else if(id==="gexPain")state.manualMaxPain=v;else if(id==="gex1DMax")state.manual1dMax=v;else if(id==="gex1DMin")state.manual1dMin=v;else if(id==="gexZoneOpacity")state.zoneOpacity=v/100;else if(id==="gexLineWidth")state.lineWidth=v;save();schedule(false);renderPanelValues();requestDraw();}
    b.querySelectorAll(".dvl-feb-step-btn").forEach(x=>x.addEventListener("click",()=>{const id=x.dataset.id,min=+x.dataset.min,max=+x.dataset.max,st=+x.dataset.step,dec=+x.dataset.dec,e=b.querySelector("#"+id+"Val");let v=+(e.textContent||0);v=Math.max(min,Math.min(max,v+(x.classList.contains("dvl-feb-step-inc")?st:-st)));e.textContent=dec?v.toFixed(dec):String(Math.round(v));apply(id,v);}));
    if(window.DVLVPRowLayout1345)window.DVLVPRowLayout1345.bindEditable(b,apply);
    b.querySelector("#dvlGEXRefreshNow").addEventListener("click",()=>refresh(true));renderStatus();renderPanelValues();
  }
  function openPanel(){ensurePanel();panel.classList.add("is-open");renderPanel();}
  function closePanel(){if(panel)panel.classList.remove("is-open");}
  function updateRow(){const p=document.getElementById("dvlGEXState");if(p){p.textContent=state.on?"ON":"OFF";p.classList.toggle("is-on",state.on);}}
  function insertRow(){const menu=document.getElementById("indicatorDropdown");if(!menu)return;let item=document.getElementById("dvlGEXItem");if(!item){item=document.createElement("div");item.id="dvlGEXItem";item.className="indicatorItem";item.innerHTML='<span class="indicatorFxMark">GX</span><span><b>DVL GEX Levels</b><small>Flip · Max Pain · 1D range</small></span><i class="dvl-vt-state" id="dvlGEXState">OFF</i>';const after=document.getElementById("dvlFixedRangeVPItem");if(after&&after.parentNode)after.parentNode.insertBefore(item,after.nextSibling);else menu.appendChild(item);}if(!item.dataset.bound){item.dataset.bound="1";const p=item.querySelector("#dvlGEXState");if(p)p.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setOn(!state.on);});item.addEventListener("click",e=>{e.stopPropagation();openPanel();});}updateRow();}
  function boot(){insertRow();updateRow();schedule(true);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  window.DVLGEXLevelsDraw=draw;
  window.DVLGEXLevels={version:"1.347",on,setOn,draw,open:openPanel,openPanel,refresh:()=>refresh(true),get state(){return Object.assign({},state);},get levels(){return activeLevels();}};
})();
