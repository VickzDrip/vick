(function(){
  "use strict";

  const STOR_KEY = "dvl_vol_profile_v1";
  const DEFAULTS = {
    on: false,
    rows: 120,
    rowLayout: "rows",
    ticksPerRow: 2,
    widthPct: 0.18,
    opacity: 0.46,
    valueAreaPct: 0.70,
    vpTF: 'visible',
    lockViewport: true,
    colorBuy:  "#13dc8d",
    colorSell: "#ff4a61",
    colorPOC:  "#f3c768",
    colorVAH: "#13dc8d",
    colorVAL: "#ff4a61",
    showPOC: true,
    showVAH: true,
    showVAL: true,
    showLabels: true,
    // Beta 1.294 — antiga Sessão 2 virou Previous Week fixo (sem variantes).
    // Mantemos as chaves s2* por compatibilidade com preferências já salvas.
    s2on: false,
    s2tf: '1w', // legado/compatibilidade; não aparece mais no painel e não altera a semana anterior
    s2showPOC: true, s2showVAH: true, s2showVAL: true,
    s2colorPOC: "#ffd700", s2colorVAH: "#00e5cc", s2colorVAL: "#b44fff",
    // Beta 1.223 — customização de linha (Stage 1 do VP Avançado)
    lineStyleCur: 'dashed',  lineWidthCur: 1.4,
    lineStyleS2:  'dashdot', lineWidthS2:  1.4,
    labelMode: 'short',      // full | short | price | hidden
    labelPrice: false,       // acrescenta o preço ao lado do nome
    // Developing Profile — sessão em curso
    devOn: false, devTF: '1d',
    devShowPOC: true, devShowVAH: true, devShowVAL: true,
    devColorPOC: "#38e0ff", devColorVAH: "#7ad7ff", devColorVAL: "#4aa8ff",
    devStyle: 'solid', devWidth: 1.6,
    // Beta 1.225 — Overnight Profile + timezone (Stage 3)
    onOn: false, onStartH: 0, onStartM: 0, onEndH: 8, onEndM: 0,
    onTZ: 'UTC', onSession: 'current', onDeveloping: true,
    onShowPOC: true, onShowVAH: true, onShowVAL: true,
    onColorPOC: "#c08bff", onColorVAH: "#9a6cff", onColorVAL: "#7a4fff",
    onStyle: 'dashed', onWidth: 1.4,
    // Beta 1.250 — tamanho da fonte dos labels + sessão Previous Day (dia anterior)
    labelFontPx: 8,
    pdOn: false, pdTZ: 'UTC',
    pdShowPOC: true, pdShowVAH: true, pdShowVAL: true,
    pdColorPOC: "#ffa94d", pdColorVAH: "#ffd08a", pdColorVAL: "#ff924d",
    pdStyle: 'dashed', pdWidth: 1.4,
    // Colunas robustas
    colRadius: 1
  };

  let state = Object.assign({}, DEFAULTS);
  try{ Object.assign(state, JSON.parse(localStorage.getItem(STOR_KEY)||"{}")); }catch(_){}
  // Beta 1.295 — remove preferências e histórico das funções retiradas.
  if(state.__vp1295Cleanup!==1){
    ["trailOn","trailColor","trailWidth","trailStyle","trailOpacity","trailMaxPts",
     "vmOn","vmDepth","vmGlow","vmColor","vmMinGrowth","vmMinDelta","vmBySide","__vmBySideMig"].forEach(k=>{ try{ delete state[k]; }catch(_){} });
    state.__vp1295Cleanup=1;
    try{ localStorage.removeItem("dvl_vp_mem_v1"); localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){}
  }

  // Beta 1.294 — Developing continua configurável, mas esta build começa em Daily.
  // Migração única: depois disso o usuário pode trocar normalmente pelas variantes.
  if(state.__vp1294DevDailyMig!==1){
    state.devTF='1d';
    state.__vp1294DevDailyMig=1;
    try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){}
  }

  // Beta 1.301 — colunas menos arredondadas. Migração única para 1px;
  // depois o usuário pode escolher entre 0 e 3 no painel.
  if(state.__vp1301RadiusMig!==1){
    state.colRadius=1;
    state.__vp1301RadiusMig=1;
    try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){}
  }else state.colRadius=Math.max(0,Math.min(3,Number(state.colRadius)||0));

  if(state.lockViewport === undefined){
    state.lockViewport = true;
    try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){}
  }
  state.rowLayout=state.rowLayout==="ticks"?"ticks":"rows";
  state.ticksPerRow=Math.max(1,Math.min(100000,Math.round(Number(state.ticksPerRow)||2)));

  function save(){ try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){} }
  function on(){ return !!state.on; }
  function setOn(v){
    const next=!!v;
    if(next && !state.on) resetVPPrimaryAnchor1334();
    state.on=next;
    save();
    updateRow();
    if(typeof drawSoon==='function') drawSoon();
  }

  // ── VP Timeframe: opções, bases, cache e fetch ────────────────────────────
  const VP_TF_OPTS = [
    {v:'visible',l:'Range Visível'},
    {v:'1h', l:'1h'},  {v:'2h', l:'2h'},  {v:'4h', l:'4h'},
    {v:'6h', l:'6h'},  {v:'8h', l:'8h'},  {v:'12h',l:'12h'},
    {v:'1d', l:'1 Dia'},{v:'3d', l:'3 Dias'},{v:'1w', l:'1 Semana'},
  ];
  const VP_TF_OPTS_S2 = VP_TF_OPTS.filter(o => o.v !== 'visible');
  const VP_BASE_TF = {
    '1h' :{base:'1m',  ms:3600000   },
    '2h' :{base:'3m',  ms:7200000   },
    '4h' :{base:'5m',  ms:14400000  },
    '6h' :{base:'5m',  ms:21600000  },
    '8h' :{base:'15m', ms:28800000  },
    '12h':{base:'15m', ms:43200000  },
    '1d' :{base:'30m', ms:86400000  },
    '3d' :{base:'1h',  ms:259200000 },
    '1w' :{base:'4h',  ms:604800000 },
  };
  let vpKCache      = null;
  let vpKFetching   = false;
  let vpStableLevels = {poc:null, vah:null, val:null, sym:null, tf:null};
  let vpKCache2     = null;
  let vpKFetching2  = false;
  let vpStableLevels2 = {poc:null, vah:null, val:null, sym:null, tf:null};


  // Beta 1.334 — âncora estável do VP principal. O modo Range Visível deixa de
  // trocar o conjunto de candles toda vez que o usuário faz zoom/pan. A janela
  // só muda quando o usuário pede Reancorar, troca ativo/TF, religa o indicador
  // ou quando nasce uma nova vela enquanto a âncora acompanha o mercado ao vivo.
  let vpPrimaryAnchor1334={key:"",start:0,end:0,count:0,followLive:false,sourceLen:0,sourceRef:null,view:null,firstTime:0,lastTime:0};
  function resetVPPrimaryAnchor1334(){
    vpPrimaryAnchor1334={key:"",start:0,end:0,count:0,followLive:false,sourceLen:0,sourceRef:null,view:null,firstTime:0,lastTime:0};
    vpStableLevels={poc:null,vah:null,val:null,sym:null,tf:null};
    try{ if(typeof __dvlVPCache1210!=="undefined") __dvlVPCache1210.primary=null; }catch(_){}
  }
  function vpPrimaryAllCandles1334(defaultView){
    try{ if(typeof klines!=="undefined" && Array.isArray(klines) && klines.length) return klines; }catch(_){}
    return Array.isArray(defaultView)?defaultView:[];
  }
  function vpPrimaryCapture1334(defaultView,sym,cfg){
    const all=vpPrimaryAllCandles1334(defaultView),win=(cfg&&cfg.win)||{};
    const tfChart=(typeof interval!=="undefined"?String(interval||""):"");
    const key=String(sym||"")+"|"+tfChart;
    let start=Number.isFinite(+win.start)?Math.floor(+win.start):Math.max(0,all.length-(defaultView?defaultView.length:0));
    let end=Number.isFinite(+win.end)?Math.ceil(+win.end):all.length;
    start=Math.max(0,Math.min(all.length-1,start));
    end=Math.max(start+1,Math.min(all.length,end));
    const count=Math.max(1,end-start);
    let offset=0;try{offset=Number(chartOffsetCandles||0);}catch(_){}
    const followLive=end>=all.length-2 && offset<=0.75;
    const view=all.slice(start,end);
    vpPrimaryAnchor1334={key,start,end,count,followLive,sourceLen:all.length,sourceRef:all,view,
      firstTime:+(view[0]&&view[0].time)||0,lastTime:+(view[view.length-1]&&view[view.length-1].time)||0};
    return view;
  }
  function vpPrimaryLockedView1334(defaultView,sym,cfg){
    if(state.lockViewport===false) return {klines:defaultView,own:false,scopeKey:"visible-dynamic"};
    const all=vpPrimaryAllCandles1334(defaultView);
    const tfChart=(typeof interval!=="undefined"?String(interval||""):"");
    const key=String(sym||"")+"|"+tfChart;
    let a=vpPrimaryAnchor1334;
    if(!a.view || !a.view.length || a.key!==key || !all.length) return {klines:vpPrimaryCapture1334(defaultView,sym,cfg),own:true,scopeKey:"visible-locked"};
    // Se a fonte foi recarregada/substituída, reencontra a janela pelos timestamps.
    if(a.sourceRef!==all || a.sourceLen>all.length){
      let st=0,en=all.length;
      if(a.firstTime){st=all.findIndex(c=>(+c.time||0)>=a.firstTime);if(st<0)st=0;}
      if(a.lastTime){const j=all.findIndex(c=>(+c.time||0)>a.lastTime);en=j<0?all.length:j;}
      a.start=Math.max(0,Math.min(all.length-1,st));a.end=Math.max(a.start+1,Math.min(all.length,en));
    }
    // Acompanhamento ao vivo: conserva a mesma quantidade de candles e apenas
    // desloca a janela quando uma nova vela real entra, nunca por zoom/pan.
    if(a.followLive && all.length>a.sourceLen){
      a.end=all.length;
      a.start=Math.max(0,a.end-a.count);
    }
    a.end=Math.max(a.start+1,Math.min(all.length,a.end));
    a.start=Math.max(0,Math.min(a.end-1,a.start));
    a.view=all.slice(a.start,a.end);
    a.sourceLen=all.length;
    a.sourceRef=all;
    a.firstTime=+(a.view[0]&&a.view[0].time)||0;
    a.lastTime=+(a.view[a.view.length-1]&&a.view[a.view.length-1].time)||0;
    return {klines:a.view,own:true,scopeKey:"visible-locked|"+a.firstTime+"|"+a.lastTime};
  }
  function resolvePrimaryVPKlines1334(defaultView,sym,cfg){
    const tf=state.vpTF||"visible";
    if(tf==="visible") return vpPrimaryLockedView1334(defaultView,sym,cfg);
    const r=resolveVPKlines(defaultView,sym);
    if(!r.own && state.lockViewport!==false){
      const locked=vpPrimaryLockedView1334(defaultView,sym,cfg);
      locked.scopeKey=tf+"-fallback|"+(locked.scopeKey||"");
      return locked;
    }
    return {klines:r.klines,own:r.own,scopeKey:tf};
  }
  function vpDataBounds1334(view){
    let lo=Infinity,hi=-Infinity;
    for(const c of (view||[])){
      const l=+c.low,h=+c.high;
      if(Number.isFinite(l)&&l<lo)lo=l;
      if(Number.isFinite(h)&&h>hi)hi=h;
    }
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||!(hi>lo))return null;
    const pad=Math.max((hi-lo)*0.005,Math.abs(hi)*1e-8,1e-8);
    return {min:lo-pad,max:hi+pad};
  }

  function pathRoundLeft(ctx,x,y,w,h,r){
    r=Math.max(0,Math.min(r||0,h/2,w/2));
    ctx.beginPath();
    if(r<=0.5){ ctx.rect(x,y,w,h); return; }
    ctx.moveTo(x+r,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  async function fetchVPKlines(sym, tf){
    const cfg = VP_BASE_TF[tf];
    if(!cfg || !sym) return null;
    const now  = Date.now();
    const cur  = Math.floor(now / cfg.ms) * cfg.ms;
    const from = cur - cfg.ms;
    const url  = 'https://fapi.binance.com/fapi/v1/klines?symbol='+sym
               + '&interval='+cfg.base+'&startTime='+from+'&limit=1500';
    try{
      const r = await fetch(url);
      if(!r.ok) return null;
      const d = await r.json();
      if(!Array.isArray(d)) return null;
      return d.map(x=>({
        time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],
        volume:+x[5],buyVolume:+x[9]
      }));
    }catch(_){ return null; }
  }

  function resolveVPKlines(defaultView, sym){
    const tf = state.vpTF || 'visible';
    if(tf === 'visible' || !sym) return {klines:defaultView, own:false};
    const cfg  = VP_BASE_TF[tf];
    const now  = Date.now();
    const periodStart = cfg ? Math.floor(now / cfg.ms) * cfg.ms : 0;
    const ok = vpKCache
      && vpKCache.sym === sym && vpKCache.tf === tf
      && vpKCache.periodStart === periodStart
      && Array.isArray(vpKCache.klines) && vpKCache.klines.length
      && (now - vpKCache.ts) < 60000;
    if(!ok && !vpKFetching){
      vpKFetching = true;
      fetchVPKlines(sym, tf).then(kl=>{
        vpKCache = {sym, tf, klines:kl||[], ts:Date.now(), periodStart};
        vpKFetching = false;
        if(kl && kl.length && typeof drawSoon==='function') drawSoon();
      }).catch(()=>{ vpKFetching=false; });
    }
    if(vpKCache && vpKCache.sym===sym && vpKCache.tf===tf && vpKCache.klines.length){
      return {klines:vpKCache.klines, own:true};
    }
    return {klines:defaultView, own:false};
  }

  // Beta 1.294 — Previous Week fixo: semana ANTERIOR fechada,
  // de segunda 00:00 a segunda 00:00 no mesmo timezone do Previous Day.
  // Reaproveita os campos s2* apenas para compatibilidade visual/armazenamento.
  function vpPrevWeekWindow(){
    const tz=vpPrevDayTZ();
    const now=Date.now(), p=vpTzParts(tz,now);
    // Dia da semana da DATA LOCAL (0=domingo...6=sábado), sem depender do offset.
    const localDayUTC=Date.UTC(p.y,p.mo-1,p.d);
    const dow=new Date(localDayUTC).getUTCDay();
    const sinceMonday=(dow+6)%7;
    const thisMondayDate=new Date(localDayUTC - sinceMonday*86400000);
    const ty=thisMondayDate.getUTCFullYear(), tm=thisMondayDate.getUTCMonth()+1, td=thisMondayDate.getUTCDate();
    const end=vpTzLocalToTs(tz,ty,tm,td,0,0);
    const prevMondayDate=new Date(Date.UTC(ty,tm-1,td)-7*86400000);
    const sy=prevMondayDate.getUTCFullYear(), sm=prevMondayDate.getUTCMonth()+1, sd=prevMondayDate.getUTCDate();
    const start=vpTzLocalToTs(tz,sy,sm,sd,0,0);
    return {start,end,tz};
  }

  function resolveVPKlinesPrevWeek(sym){
    sym=sym||'';
    const w=vpPrevWeekWindow();
    const baseTF='4h';
    const key=sym+'|PW|'+w.start+'|'+w.end+'|'+baseTF;
    const now=Date.now();
    const fresh=vpKCache2 && vpKCache2.key===key
      && Array.isArray(vpKCache2.klines) && vpKCache2.klines.length
      && (now-vpKCache2.ts)<600000; // semana fechada: cache longo
    if(!fresh && !vpKFetching2 && sym){
      vpKFetching2=true;
      fetchVPRange(sym, baseTF, w.start, w.end).then(kl=>{
        const filt=(kl||[]).filter(c=>c.time>=w.start && c.time<w.end);
        vpKCache2={key, klines:filt, ts:Date.now(), w};
        vpKFetching2=false;
        if(filt.length && typeof drawSoon==='function') drawSoon();
      }).catch(()=>{ vpKFetching2=false; });
    }
    if(vpKCache2 && vpKCache2.key===key && vpKCache2.klines.length){
      return {klines:vpKCache2.klines, own:true, w, key};
    }
    return {klines:null, own:false, w, key};
  }

  // Beta 1.224 — Developing Profile: klines da SESSÃO em curso (período do devTF,
  // do início do período até agora → perfil que "se desenvolve" ao vivo).
  let vpKCacheDev=null, vpKFetchingDev=false;
  let vpStableLevelsDev={poc:null,vah:null,val:null,sym:null,tf:null};
  function resolveVPKlinesDev(defaultView, sym){
    const tf=state.devTF||'1d';
    if(!sym) return {klines:defaultView, own:false, periodStart:0};
    const cfg=VP_BASE_TF[tf];
    if(!cfg) return {klines:defaultView, own:false, periodStart:0};
    const now=Date.now();
    const periodStart=Math.floor(now/cfg.ms)*cfg.ms;
    const ok=vpKCacheDev && vpKCacheDev.sym===sym && vpKCacheDev.tf===tf
      && vpKCacheDev.periodStart===periodStart
      && Array.isArray(vpKCacheDev.klines) && vpKCacheDev.klines.length
      && (now-vpKCacheDev.ts)<30000;
    if(!ok && !vpKFetchingDev){
      vpKFetchingDev=true;
      fetchVPKlines(sym, tf).then(kl=>{
        vpKCacheDev={sym, tf, klines:kl||[], ts:Date.now(), periodStart};
        vpKFetchingDev=false;
        if(kl && kl.length && typeof drawSoon==='function') drawSoon();
      }).catch(()=>{ vpKFetchingDev=false; });
    }
    if(vpKCacheDev && vpKCacheDev.sym===sym && vpKCacheDev.tf===tf && vpKCacheDev.klines.length){
      return {klines:vpKCacheDev.klines, own:true, periodStart};
    }
    return {klines:defaultView, own:false, periodStart};
  }

  // Value area (POC + expansão) a partir dos buckets — reutilizável.
  function vpValueArea(buy, sell, rows, vaPct){
    let maxB=0, tot=0, pocIdx=0;
    for(let i=0;i<rows;i++){ const t=buy[i]+sell[i]; tot+=t; if(t>maxB){maxB=t;pocIdx=i;} }
    if(!maxB) return null;
    const target=tot*Math.max(0.01,Math.min(1,vaPct||0.70));
    let vol=buy[pocIdx]+sell[pocIdx], lo=pocIdx, hi=pocIdx;
    while(vol<target && (lo>0 || hi<rows-1)){
      const nLo=lo>0?buy[lo-1]+sell[lo-1]:0, nHi=hi<rows-1?buy[hi+1]+sell[hi+1]:0;
      if(nHi>=nLo){ hi++; vol+=buy[hi]+sell[hi]; } else { lo--; vol+=buy[lo]+sell[lo]; }
    }
    return {pocIdx, lo, hi};
  }

  // ── Overnight Profile (Beta 1.225) — janela por timezone, cruza meia-noite ─
  function vpResolveTZ(){
    const z=state.onTZ||'UTC';
    if(z==='UTC'||z==='Exchange') return 'UTC';
    if(z==='Local'){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }catch(_){ return 'UTC'; } }
    return z;
  }
  // partes Y/M/D/H/M da data local do timezone para um timestamp
  function vpTzParts(tz, at){
    try{
      const dtf=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const m={}; dtf.formatToParts(new Date(at)).forEach(p=>{ if(p.type!=='literal') m[p.type]=+p.value; });
      return {y:m.year,mo:m.month,d:m.day,h:m.hour,mi:m.minute,s:m.second};
    }catch(_){ const dd=new Date(at); return {y:dd.getUTCFullYear(),mo:dd.getUTCMonth()+1,d:dd.getUTCDate(),h:dd.getUTCHours(),mi:dd.getUTCMinutes(),s:dd.getUTCSeconds()}; }
  }
  function vpTzOffsetMs(tz, at){ const p=vpTzParts(tz,at); const asUTC=Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi,p.s); return asUTC-at; }
  // converte "data local do tz (y/mo/d hh:mm)" para timestamp absoluto
  function vpTzLocalToTs(tz,y,mo,d,hh,mm){ const naive=Date.UTC(y,mo-1,d,hh,mm); const off=vpTzOffsetMs(tz,naive); return naive-off; }
  function vpOvernightWindow(){
    const tz=vpResolveTZ();
    const sh=Math.max(0,Math.min(23,+state.onStartH||0)), sm=Math.max(0,Math.min(59,+state.onStartM||0));
    const eh=Math.max(0,Math.min(23,+state.onEndH||0)),  em=Math.max(0,Math.min(59,+state.onEndM||0));
    const now=Date.now(), p=vpTzParts(tz,now);
    let start=vpTzLocalToTs(tz,p.y,p.mo,p.d,sh,sm);
    let end  =vpTzLocalToTs(tz,p.y,p.mo,p.d,eh,em);
    if(end<=start) end+=86400000;                 // cruza a meia-noite
    if(now<start){ start-=86400000; end-=86400000; } // ainda não começou hoje → sessão de ontem
    if((state.onSession||'current')==='previous'){ start-=86400000; end-=86400000; }
    const inProgress=now>=start && now<end;
    return {start,end,inProgress,tz};
  }
  async function fetchVPRange(sym, baseTF, start, end){
    const url='https://fapi.binance.com/fapi/v1/klines?symbol='+sym+'&interval='+baseTF
             +'&startTime='+start+'&endTime='+(end+1)+'&limit=1000';
    try{
      const r=await fetch(url); if(!r.ok) return null;
      const d=await r.json(); if(!Array.isArray(d)) return null;
      return d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5],buyVolume:+x[9]}));
    }catch(_){ return null; }
  }
  let vpKCacheON=null, vpKFetchingON=false;
  let vpStableLevelsON={poc:null,vah:null,val:null,key:null};
  function vpOvernightBaseTF(durMs){ if(durMs<=6*3600000) return '3m'; if(durMs<=12*3600000) return '5m'; return '15m'; }
  function resolveVPKlinesOvernight(sym){
    sym=sym||'';
    const w=vpOvernightWindow();
    const endEff=(state.onDeveloping!==false && w.inProgress)?Date.now():w.end;
    const baseTF=vpOvernightBaseTF(w.end-w.start);
    const key=sym+'|'+w.start+'|'+w.end+'|'+baseTF+'|'+(w.inProgress&&state.onDeveloping!==false?'live':'frozen');
    const now=Date.now();
    const fresh=vpKCacheON && vpKCacheON.key===key && (now-vpKCacheON.ts)<30000;
    if(!fresh && !vpKFetchingON && sym){
      vpKFetchingON=true;
      fetchVPRange(sym, baseTF, w.start, endEff).then(kl=>{
        const filt=(kl||[]).filter(c=>c.time>=w.start && c.time<=endEff);
        vpKCacheON={key, klines:filt, ts:Date.now(), w};
        vpKFetchingON=false;
        if(filt.length && typeof drawSoon==='function') drawSoon();
      }).catch(()=>{ vpKFetchingON=false; });
    }
    if(vpKCacheON && vpKCacheON.key===key && vpKCacheON.klines.length) return {klines:vpKCacheON.klines, w, key};
    return {klines:null, w, key};
  }

  // ── Previous Day Profile (Beta 1.250) — VP do DIA ANTERIOR (00:00→24:00) ──
  function vpPrevDayTZ(){
    const z=state.pdTZ||'UTC';
    if(z==='UTC'||z==='Exchange') return 'UTC';
    if(z==='Local'){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }catch(_){ return 'UTC'; } }
    return z;
  }
  function vpPrevDayWindow(){
    const tz=vpPrevDayTZ();
    const now=Date.now(), p=vpTzParts(tz,now);
    const todayStart=vpTzLocalToTs(tz,p.y,p.mo,p.d,0,0);   // hoje 00:00 (tz)
    const yp=vpTzParts(tz, todayStart-3600000);            // 1h antes → ontem (robusto a DST)
    const start=vpTzLocalToTs(tz,yp.y,yp.mo,yp.d,0,0);     // ontem 00:00
    const end=todayStart;                                  // ontem 24:00 = hoje 00:00
    return {start,end,tz};
  }
  let vpKCachePD=null, vpKFetchingPD=false;
  let vpStableLevelsPD={poc:null,vah:null,val:null,key:null};
  function resolveVPKlinesPrevDay(sym){
    sym=sym||'';
    const w=vpPrevDayWindow();
    const baseTF=vpOvernightBaseTF(w.end-w.start);   // ~24h → 15m
    const key=sym+'|PD|'+w.start+'|'+w.end+'|'+baseTF;
    const now=Date.now();
    const fresh=vpKCachePD && vpKCachePD.key===key && (now-vpKCachePD.ts)<120000;   // dia fechado → cache longo
    if(!fresh && !vpKFetchingPD && sym){
      vpKFetchingPD=true;
      fetchVPRange(sym, baseTF, w.start, w.end).then(kl=>{
        const filt=(kl||[]).filter(c=>c.time>=w.start && c.time<w.end);
        vpKCachePD={key, klines:filt, ts:Date.now(), w};
        vpKFetchingPD=false;
        if(filt.length && typeof drawSoon==='function') drawSoon();
      }).catch(()=>{ vpKFetchingPD=false; });
    }
    if(vpKCachePD && vpKCachePD.key===key && vpKCachePD.klines.length) return {klines:vpKCachePD.klines, w, key};
    return {klines:null, w, key};
  }


  function vpGrid1345(view,priceMin,priceMax,requestedRows,sym){
    const api=window.DVLVPRowLayout1345;
    const result=api&&api.resolve?api.resolve({
      mode:state.rowLayout,rows:requestedRows,ticksPerRow:state.ticksPerRow,
      min:priceMin,max:priceMax,symbol:sym,candles:view,maxRows:12000
    }):null;
    return result||{mode:"rows",min:priceMin,max:priceMax,rows:Math.max(1,Math.round(requestedRows)||120),ppr:(priceMax-priceMin)/Math.max(1,Math.round(requestedRows)||120)};
  }

  // ── Volume Profile computation (triangular close-peaked) ─────────────────
  function computeVP(view, priceMin, priceMax, rows){
    const buy  = new Float64Array(rows);
    const sell = new Float64Array(rows);
    const range = priceMax - priceMin;
    if(range <= 0) return { buy, sell };

    function fill(lo, hi, bv, sv, peakAt){
      const lo2 = Math.max(lo, priceMin);
      const hi2 = Math.min(hi, priceMax);
      if(lo2 >= hi2) return;
      const loI = Math.max(0,      Math.floor((lo2 - priceMin) / range * rows));
      const hiI = Math.min(rows-1, Math.floor((hi2 - priceMin) / range * rows));
      const n = hiI - loI + 1;
      if(n === 1){ buy[loI] += bv; sell[loI] += sv; return; }
      if(peakAt === undefined){
        for(let i = loI; i <= hiI; i++){ buy[i] += bv/n; sell[i] += sv/n; }
        return;
      }
      // Triangular: peak at close, linear falloff toward body edges
      const pkI = Math.max(loI, Math.min(hiI,
        Math.floor((Math.max(lo2, Math.min(hi2, peakAt)) - priceMin) / range * rows)));
      const w = new Float64Array(n); let wsum = 0;
      for(let k = 0; k < n; k++){
        const i = loI + k;
        const d = i === pkI ? 1
                : i <  pkI  ? (pkI > loI ? (i - loI) / (pkI - loI) : 0)
                            : (pkI < hiI ? (hiI - i) / (hiI - pkI) : 0);
        w[k] = d + 0.12; wsum += w[k];
      }
      for(let k = 0; k < n; k++){
        buy[loI+k]  += bv * w[k] / wsum;
        sell[loI+k] += sv * w[k] / wsum;
      }
    }

    for(const c of view){
      const vol  = Number(c.volume)||0;
      if(!vol) continue;
      const bVol = Math.min(Number(c.buyVolume)||0, vol);
      const sVol = Math.max(0, vol - bVol);
      const hi    = Number(c.high),  lo    = Number(c.low);
      const op    = Number(c.open),  cl    = Number(c.close);
      const bodyH = Math.max(op, cl), bodyL = Math.min(op, cl);
      const fullR = hi - lo;
      const bodyR = bodyH - bodyL;

      if(bodyR > 0 && fullR > 0){
        // 70% corpo (triangular peaked at close), 30% wicks (uniforme)
        const bW = 0.70, wW = 0.30;
        fill(bodyL, bodyH, bVol*bW, sVol*bW, cl);
        const upW = hi - bodyH, dnW = bodyL - lo;
        const totalW = upW + dnW;
        if(totalW > 0){
          if(upW > 0) fill(bodyH, hi,   bVol*wW*(upW/totalW), sVol*wW*(upW/totalW));
          if(dnW > 0) fill(lo,    bodyL, bVol*wW*(dnW/totalW), sVol*wW*(dnW/totalW));
        }
      } else {
        fill(lo, hi, bVol, sVol);
      }
    }
    return { buy, sell };
  }

  /* Beta 1.210 — Volume Profile was one of the heaviest overlays because it
     redistributed every candle through up to 500 price buckets on every draw.
     Cache exact results; while pan/zoom is active reuse the last stable profile
     and let the existing final release repaint compute the new one. Live-candle
     changes are rate-limited to 180ms, while identical data is reused forever. */
  const __dvlVPCache1210={primary:null,secondary:null};
  function __dvlVPDataSig1210(view){
    if(!view || !view.length) return "0";
    const a=view[0],z=view[view.length-1];
    return [view.length,a.time,z.time,z.open,z.high,z.low,z.close,z.volume,z.buyVolume].join("|");
  }
  function __dvlVPComputed1210(slot,view,vpMin,vpMax,rows,scope){
    const now=performance.now();
    const prev=__dvlVPCache1210[slot];
    if(window.__dvlChartInteracting && prev) return prev;
    const dataSig=__dvlVPDataSig1210(view);
    const geomSig=[scope,rows,Number(vpMin).toPrecision(12),Number(vpMax).toPrecision(12),view&&view.length].join("|");
    const exactSig=geomSig+"|"+dataSig;
    if(prev && prev.exactSig===exactSig) return prev;
    if(prev && prev.geomSig===geomSig && (now-prev.at)<180) return prev;
    const raw=computeVP(view,vpMin,vpMax,rows);
    const next={buy:raw.buy,sell:raw.sell,vpMin:vpMin,vpMax:vpMax,rows:rows,geomSig:geomSig,exactSig:exactSig,at:now};
    __dvlVPCache1210[slot]=next;
    return next;
  }

  // ── Line style helpers (Beta 1.223 / 1.294) ─────────────────────────────
  // Estilo/espessura por grupo (Current, Previous Week) + modo de label. Não mexe
  // no cálculo de distribuição/sessão — só na renderização das linhas.
  function vpDashFor(style, w){
    w = Math.max(1, +w || 1.4);
    if(style === 'solid')   return [];
    if(style === 'dotted')  return [1, Math.max(3, Math.round(w*2.5))];
    if(style === 'dashdot') return [Math.round(w*5), Math.round(w*3), 1, Math.round(w*3)];
    return [Math.round(w*4), Math.round(w*3)]; // dashed (default)
  }
  function vpSetLevelStyle(ctx, grp){
    const w = grp==='s2' ? (+state.lineWidthS2||1.4) : (+state.lineWidthCur||1.4);
    const s = grp==='s2' ? (state.lineStyleS2||'dashdot') : (state.lineStyleCur||'dashed');
    ctx.lineWidth = w;
    ctx.setLineDash(vpDashFor(s, w));
  }
  function vpFmtPrice(p){
    p = +p; if(!isFinite(p)) return '';
    if(p >= 1000) return p.toFixed(1);
    if(p >= 1)    return p.toFixed(2);
    return p.toPrecision(4);
  }
  // Retorna o texto do label conforme o modo, ou null se não deve mostrar.
  // Beta 1.250 — tamanho da fonte dos labels do VP (configurável)
  function vpLabelFont(){ var s=Math.max(6,Math.min(20,+state.labelFontPx||8)); return "700 "+s+"px system-ui"; }
  function vpLevelLabel(shortName, price){
    if(state.showLabels === false) return null;
    const m = state.labelMode || 'short';
    if(m === 'hidden') return null;
    if(m === 'price')  return vpFmtPrice(price);
    let t = shortName;                 // full e short usam o nome (POC/VAH/VAL)
    if(state.labelPrice) t += ' ' + vpFmtPrice(price);
    return t;
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(ctx, cfg){
    if(!on()) return;
    const { view, x0, x1, y0, y1, min, max } = cfg;
    const vpWin = cfg.win || {};
    if(!view || !view.length || min === undefined || max === undefined) return;
    const priceRange = max - min;
    if(priceRange <= 0) return;

    const requestedRows = Math.max(20, Math.min(500, Math.round(state.rows)||120));
    const sym = cfg.symbol || '';
    const __primary1334=resolvePrimaryVPKlines1334(view,sym,cfg);
    const vpView=__primary1334.klines||[];
    if(!vpView.length)return;
    // Nunca usar min/max da câmera para criar os buckets. Esses limites mudam
    // com o zoom vertical e faziam POC/VAH/VAL e o corpo inteiro respirarem.
    const __bounds1334=vpDataBounds1334(vpView);
    if(!__bounds1334)return;
    const __grid1345=vpGrid1345(vpView,__bounds1334.min,__bounds1334.max,requestedRows,sym);
    const rows=__grid1345.rows;
    let vpMin=__grid1345.min,vpMax=__grid1345.max;
    let __vpComp1210=__dvlVPComputed1210("primary",vpView,vpMin,vpMax,rows,[sym,state.vpTF||"visible",__primary1334.scopeKey||"",state.lockViewport===false?0:1,state.rowLayout,state.ticksPerRow].join("|"));
    vpMin=__vpComp1210.vpMin;
    vpMax=__vpComp1210.vpMax;
    const vpRange = vpMax - vpMin || 1;
    const buyB=__vpComp1210.buy, sellB=__vpComp1210.sell;

    let maxBucket = 0, totalVol = 0, pocIdx = 0;
    for(let i = 0; i < rows; i++){
      const t = buyB[i] + sellB[i];
      totalVol += t;
      if(t > maxBucket){ maxBucket = t; pocIdx = i; }
    }
    if(!maxBucket) return;

    // Value Area (70% do volume total, expandindo do POC)
    const vaTarget = totalVol * Math.max(0.01, Math.min(1, state.valueAreaPct||0.70));
    let vaVol = buyB[pocIdx] + sellB[pocIdx];
    let vaLo = pocIdx, vaHi = pocIdx;
    while(vaVol < vaTarget && (vaLo > 0 || vaHi < rows-1)){
      const nLo = vaLo > 0       ? buyB[vaLo-1]+sellB[vaLo-1] : 0;
      const nHi = vaHi < rows-1  ? buyB[vaHi+1]+sellB[vaHi+1] : 0;
      if(nHi >= nLo){ vaHi++; vaVol += buyB[vaHi]+sellB[vaHi]; }
      else           { vaLo--; vaVol += buyB[vaLo]+sellB[vaLo]; }
    }

    const vpW  = Math.min(220, Math.max(40, (x1-x0) * (state.widthPct||0.18)));
    const vpX0 = x1 - vpW;
    const chartRange  = max - min;
    const pricePerRow = vpRange / rows;
    const rowY = i => y0 + (max - (vpMin + i * pricePerRow)) / chartRange * (y1 - y0);
    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));
    const cBuy  = state.colorBuy  || "#13dc8d";
    const cSell = state.colorSell || "#ff4a61";

    // Histerese: POC/VAH/VAL só movem > 1.5 buckets (evita flickering no drag)
    const rowP   = p => y0 + (max - p) / chartRange * (y1 - y0);
    const curTF  = state.vpTF || 'visible';
    if(vpStableLevels.sym !== sym || vpStableLevels.tf !== curTF){
      vpStableLevels = {poc:null, vah:null, val:null, sym, tf:curTF};
    }
    const hyst   = pricePerRow * 1.5;
    const newPoc = vpMin + (pocIdx + 0.5) * pricePerRow;
    const newVah = vpMin + (vaHi + 1)     * pricePerRow;
    const newVal = vpMin +  vaLo           * pricePerRow;
    if(vpStableLevels.poc===null||Math.abs(newPoc-vpStableLevels.poc)>hyst) vpStableLevels.poc=newPoc;
    if(vpStableLevels.vah===null||Math.abs(newVah-vpStableLevels.vah)>hyst) vpStableLevels.vah=newVah;
    if(vpStableLevels.val===null||Math.abs(newVal-vpStableLevels.val)>hyst) vpStableLevels.val=newVal;
    try{window.__DVL_VP_DEBUG_1334={locked:state.lockViewport!==false,tf:curTF,count:vpView.length,first:+(vpView[0]&&vpView[0].time)||0,last:+(vpView[vpView.length-1]&&vpView[vpView.length-1].time)||0,min:vpMin,max:vpMax,poc:vpStableLevels.poc,vah:vpStableLevels.vah,val:vpStableLevels.val,rowLayout:__grid1345.mode,rows:rows,tickSize:__grid1345.tickSize,ticksPerRow:__grid1345.effectiveTicks||null,requestedTicks:__grid1345.requestedTicks||null,capped:!!__grid1345.capped,visualRows:Math.min(rows,requestedRows),visualGrouped:__grid1345.mode==="ticks"&&rows>requestedRows};}catch(_){}

    const colR = Math.max(0, Math.min(3, Number(state.colRadius)||0));
    ctx.save();
    try {

    // ── Bars: cálculo exato por tick, densidade visual proporcional ───────
    // Em Ticks Per Row podem existir milhares de buckets subpixel. Eles
    // continuam intactos para POC/VAH/VAL/LVNs, mas o render agrupa apenas
    // a apresentação para manter a mesma leitura visual de Number of Rows.
    const __visual1346=(window.DVLVPRowLayout1345&&window.DVLVPRowLayout1345.visualize)
      ? window.DVLVPRowLayout1345.visualize({mode:__grid1345.mode,rows,buy:buyB,sell:sellB,min:vpMin,ppr:pricePerRow,visualRows:requestedRows})
      : null;
    const __drawRows1346=__visual1346?__visual1346.rows:rows;
    const __drawBuy1346=__visual1346?__visual1346.buy:buyB;
    const __drawSell1346=__visual1346?__visual1346.sell:sellB;
    const __drawMax1346=__visual1346&&__visual1346.maxBucket>0?__visual1346.maxBucket:maxBucket;
    const __groupSize1346=__visual1346?__visual1346.groupSize:1;
    for(let i = 0; i < __drawRows1346; i++){
      const total = __drawBuy1346[i] + __drawSell1346[i];
      if(!total) continue;
      const bw    = (total / __drawMax1346) * vpW;
      if(bw < 0.5) continue;
      const buyW  = Math.max(0, Math.min(bw, (__drawBuy1346[i] / total) * bw));
      const sellW = Math.max(0, bw - buyW);
      const rawLo1346=i*__groupSize1346;
      const rawHi1346=Math.min(rows,(i+1)*__groupSize1346)-1;
      const priceLo = vpMin + rawLo1346 * pricePerRow;
      const priceHi = vpMin + (rawHi1346 + 1) * pricePerRow;
      if(priceHi < min || priceLo > max) continue;
      const pyTop = y0 + (max - Math.min(priceHi, max)) / chartRange * (y1 - y0);
      const pyBot = y0 + (max - Math.max(priceLo, min)) / chartRange * (y1 - y0);
      const py  = pyTop;
      const bH  = Math.max(0.5, pyBot - pyTop);
      const r   = Math.min(colR, bH/2, bw/2);
      const inVA  = rawHi1346 >= vaLo && rawLo1346 <= vaHi;
      ctx.globalAlpha = inVA ? op : op * 0.55;
      if(sellW > 0){
        ctx.fillStyle = cSell;
        pathRoundLeft(ctx, x1 - bw, py, sellW, bH, r); ctx.fill();
      }
      if(buyW > 0){
        ctx.fillStyle = cBuy;
        pathRoundLeft(ctx, x1 - buyW, py, buyW, bH, sellW>0?0:r); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // ── POC ───────────────────────────────────────────────────────────────
    if(state.showPOC !== false){
      const pocY = rowP(vpStableLevels.poc);
      const pocDom = buyB[pocIdx] >= sellB[pocIdx] ? cBuy : cSell;
      ctx.strokeStyle = state.colorPOC || pocDom;
      vpSetLevelStyle(ctx, 'cur');
      ctx.beginPath(); ctx.moveTo(x0, pocY); ctx.lineTo(x1, pocY); ctx.stroke();
      ctx.setLineDash([]);
      if(window.dvlRegisterScaleLabel) window.dvlRegisterScaleLabel({value:vpStableLevels.poc,color:state.colorPOC||"#f3c768",label:"POC"});
      const _lPOC = vpLevelLabel("POC", vpStableLevels.poc);
      if(_lPOC){
        ctx.fillStyle    = state.colorPOC || "#f3c768";
        ctx.font         = vpLabelFont();
        ctx.textAlign    = "right";
        ctx.textBaseline = "bottom";
        ctx.globalAlpha  = 0.9;
        ctx.fillText(_lPOC, vpX0 - 2, pocY);
        ctx.globalAlpha  = 1;
      }
    }

    // ── VAH ───────────────────────────────────────────────────────────────
    if(state.showVAH !== false){
      const vahY = rowP(vpStableLevels.vah);
      ctx.strokeStyle = state.colorVAH || "#13dc8d";
      vpSetLevelStyle(ctx, 'cur');
      ctx.beginPath(); ctx.moveTo(x0, vahY); ctx.lineTo(x1, vahY); ctx.stroke();
      ctx.setLineDash([]);
      if(window.dvlRegisterScaleLabel) window.dvlRegisterScaleLabel({value:vpStableLevels.vah,color:state.colorVAH||"#13dc8d",label:"VAH"});
      const _lVAH = vpLevelLabel("VAH", vpStableLevels.vah);
      if(_lVAH){
        ctx.fillStyle    = state.colorVAH || "#13dc8d";
        ctx.font         = vpLabelFont();
        ctx.textAlign    = "right";
        ctx.textBaseline = "bottom";
        ctx.globalAlpha  = 0.9;
        ctx.fillText(_lVAH, vpX0 - 2, vahY);
        ctx.globalAlpha  = 1;
      }
    }

    // ── VAL ───────────────────────────────────────────────────────────────
    if(state.showVAL !== false){
      const valY = rowP(vpStableLevels.val);
      ctx.strokeStyle = state.colorVAL || "#ff4a61";
      vpSetLevelStyle(ctx, 'cur');
      ctx.beginPath(); ctx.moveTo(x0, valY); ctx.lineTo(x1, valY); ctx.stroke();
      ctx.setLineDash([]);
      if(window.dvlRegisterScaleLabel) window.dvlRegisterScaleLabel({value:vpStableLevels.val,color:state.colorVAL||"#ff4a61",label:"VAL"});
      const _lVAL = vpLevelLabel("VAL", vpStableLevels.val);
      if(_lVAL){
        ctx.fillStyle    = state.colorVAL || "#ff4a61";
        ctx.font         = vpLabelFont();
        ctx.textAlign    = "right";
        ctx.textBaseline = "top";
        ctx.globalAlpha  = 0.9;
        ctx.fillText(_lVAL, vpX0 - 2, valY);
        ctx.globalAlpha  = 1;
      }
    }

    // ── Previous Week fixo: W-POC / W-VAH / W-VAL (sem barras) ─────────────
    if(state.s2on !== false){
      const pw=resolveVPKlinesPrevWeek(sym);
      const pView=pw.klines;
      if(pView && pView.length){
        let pMin=Infinity, pMax=-Infinity;
        for(const c of pView){
          if(+c.low<pMin) pMin=+c.low;
          if(+c.high>pMax) pMax=+c.high;
        }
        if(isFinite(pMin) && isFinite(pMax) && pMax>pMin){
          const pad=(pMax-pMin)*0.005;
          pMin-=pad; pMax+=pad;
          const pGrid1345=vpGrid1345(pView,pMin,pMax,requestedRows,sym);
          const pRows=pGrid1345.rows;pMin=pGrid1345.min;pMax=pGrid1345.max;
          let pComp=__dvlVPComputed1210(
            "secondary", pView, pMin, pMax, pRows,
            [sym,"previousWeek",pw.key||"",state.rowLayout,state.ticksPerRow].join("|")
          );
          pMin=pComp.vpMin; pMax=pComp.vpMax;
          const pRange=pMax-pMin||1;
          const buy2=pComp.buy, sell2=pComp.sell;
          let max2=0, tot2=0, poc2Idx=0;
          for(let i=0;i<pRows;i++){
            const t=buy2[i]+sell2[i];
            tot2+=t;
            if(t>max2){ max2=t; poc2Idx=i; }
          }
          if(max2>0){
            const va2Target=tot2*Math.max(0.01,Math.min(1,state.valueAreaPct||0.70));
            let va2Vol=buy2[poc2Idx]+sell2[poc2Idx], va2Lo=poc2Idx, va2Hi=poc2Idx;
            while(va2Vol<va2Target && (va2Lo>0 || va2Hi<pRows-1)){
              const nLo2=va2Lo>0?buy2[va2Lo-1]+sell2[va2Lo-1]:0;
              const nHi2=va2Hi<pRows-1?buy2[va2Hi+1]+sell2[va2Hi+1]:0;
              if(nHi2>=nLo2){ va2Hi++; va2Vol+=buy2[va2Hi]+sell2[va2Hi]; }
              else{ va2Lo--; va2Vol+=buy2[va2Lo]+sell2[va2Lo]; }
            }
            const ppr=pRange/pRows;
            const stableKey=pw.key||"previousWeek";
            if(vpStableLevels2.sym!==sym || vpStableLevels2.tf!==stableKey){
              vpStableLevels2={poc:null,vah:null,val:null,sym,tf:stableKey};
            }
            const hy=ppr*1.5;
            const nP=pMin+(poc2Idx+0.5)*ppr;
            const nH=pMin+(va2Hi+1)*ppr;
            const nL=pMin+va2Lo*ppr;
            if(vpStableLevels2.poc===null||Math.abs(nP-vpStableLevels2.poc)>hy) vpStableLevels2.poc=nP;
            if(vpStableLevels2.vah===null||Math.abs(nH-vpStableLevels2.vah)>hy) vpStableLevels2.vah=nH;
            if(vpStableLevels2.val===null||Math.abs(nL-vpStableLevels2.val)>hy) vpStableLevels2.val=nL;

            const drawWLine=(show,color,price,name,baseline)=>{
              if(show===false || price==null) return;
              if(window.dvlRegisterScaleLabel) window.dvlRegisterScaleLabel({value:price,color:color,label:name});
              const yy=rowP(price);
              ctx.strokeStyle=color;
              vpSetLevelStyle(ctx,'s2');
              ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(x1,yy); ctx.stroke();
              ctx.setLineDash([]);
              const lbl=vpLevelLabel(name,price);
              if(lbl){
                ctx.fillStyle=color; ctx.font=vpLabelFont(); ctx.textAlign="left";
                ctx.textBaseline=baseline; ctx.globalAlpha=0.9;
                ctx.fillText(lbl,x0+3,yy); ctx.globalAlpha=1;
              }
            };
            drawWLine(state.s2showPOC,state.s2colorPOC||"#ffd700",vpStableLevels2.poc,"W-POC","bottom");
            drawWLine(state.s2showVAH,state.s2colorVAH||"#00e5cc",vpStableLevels2.vah,"W-VAH","bottom");
            drawWLine(state.s2showVAL,state.s2colorVAL||"#b44fff",vpStableLevels2.val,"W-VAL","top");
          }
        }
      }
    }

    // ── Developing Profile (Beta 1.224) — perfil da sessão em curso, ao vivo ─
    if(state.devOn){
      const dv = resolveVPKlinesDev(view, sym);
      const dView = dv.klines;
      if(dView && dView.length){
        let dMin=min, dMax=max;
        if(dv.own){ dMin=Infinity; dMax=-Infinity; for(const c of dView){ if(+c.low<dMin)dMin=+c.low; if(+c.high>dMax)dMax=+c.high; } const pad=(dMax-dMin)*0.005; dMin-=pad; dMax+=pad; }
        if(isFinite(dMin) && isFinite(dMax) && dMax>dMin){
          const dGrid1345=vpGrid1345(dView,dMin,dMax,requestedRows,sym);
          dMin=dGrid1345.min;dMax=dGrid1345.max;const dRows=dGrid1345.rows;
          const dcomp=computeVP(dView, dMin, dMax, dRows);
          const va=vpValueArea(dcomp.buy, dcomp.sell, dRows, state.valueAreaPct||0.70);
          if(va){
            const ppr=(dMax-dMin)/dRows;
            const curDevTF=state.devTF||'1d';
            if(vpStableLevelsDev.sym!==sym || vpStableLevelsDev.tf!==curDevTF){ vpStableLevelsDev={poc:null,vah:null,val:null,sym,tf:curDevTF}; }
            const hy=ppr*1.5;
            const nP=dMin+(va.pocIdx+0.5)*ppr, nH=dMin+(va.hi+1)*ppr, nL=dMin+va.lo*ppr;
            if(vpStableLevelsDev.poc===null||Math.abs(nP-vpStableLevelsDev.poc)>hy) vpStableLevelsDev.poc=nP;
            if(vpStableLevelsDev.vah===null||Math.abs(nH-vpStableLevelsDev.vah)>hy) vpStableLevelsDev.vah=nH;
            if(vpStableLevelsDev.val===null||Math.abs(nL-vpStableLevelsDev.val)>hy) vpStableLevelsDev.val=nL;
            const dW=Math.max(1,+state.devWidth||1.6), dDash=vpDashFor(state.devStyle||'solid', dW);
            const drawDevLine=(show,color,price,name,baseline)=>{
              if(show===false) return;
              if(window.dvlRegisterScaleLabel && price!=null) window.dvlRegisterScaleLabel({value:price,color:color,label:name});
              const yy=rowP(price);
              ctx.strokeStyle=color; ctx.lineWidth=dW; ctx.setLineDash(dDash);
              ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(x1,yy); ctx.stroke(); ctx.setLineDash([]);
              const l=vpLevelLabel(name, price);
              if(l){ ctx.fillStyle=color; ctx.font=vpLabelFont(); ctx.textAlign="right"; ctx.textBaseline=baseline; ctx.globalAlpha=0.9; ctx.fillText(l, x1-2, yy); ctx.globalAlpha=1; }
            };
            drawDevLine(state.devShowPOC, state.devColorPOC||"#38e0ff", vpStableLevelsDev.poc, "D-POC", "bottom");
            drawDevLine(state.devShowVAH, state.devColorVAH||"#7ad7ff", vpStableLevelsDev.vah, "D-VAH", "bottom");
            drawDevLine(state.devShowVAL, state.devColorVAL||"#4aa8ff", vpStableLevelsDev.val, "D-VAL", "top");
          }
        }
      }
    }

    // ── Overnight Profile (Beta 1.225) — janela por timezone ────────────────
    if(state.onOn){
      const ov=resolveVPKlinesOvernight(sym);
      const oView=ov.klines;
      if(oView && oView.length){
        let oMin=Infinity,oMax=-Infinity;
        for(const c of oView){ if(+c.low<oMin)oMin=+c.low; if(+c.high>oMax)oMax=+c.high; }
        if(isFinite(oMin) && isFinite(oMax) && oMax>oMin){
          const pad=(oMax-oMin)*0.005; oMin-=pad; oMax+=pad;
          const oGrid1345=vpGrid1345(oView,oMin,oMax,requestedRows,sym);
          oMin=oGrid1345.min;oMax=oGrid1345.max;const oRows=oGrid1345.rows;
          const oc=computeVP(oView, oMin, oMax, oRows);
          const va=vpValueArea(oc.buy, oc.sell, oRows, state.valueAreaPct||0.70);
          if(va){
            const ppr=(oMax-oMin)/oRows;
            if(vpStableLevelsON.key!==ov.key){ vpStableLevelsON={poc:null,vah:null,val:null,key:ov.key}; }
            const hy=ppr*1.5;
            const nP=oMin+(va.pocIdx+0.5)*ppr, nH=oMin+(va.hi+1)*ppr, nL=oMin+va.lo*ppr;
            if(vpStableLevelsON.poc===null||Math.abs(nP-vpStableLevelsON.poc)>hy) vpStableLevelsON.poc=nP;
            if(vpStableLevelsON.vah===null||Math.abs(nH-vpStableLevelsON.vah)>hy) vpStableLevelsON.vah=nH;
            if(vpStableLevelsON.val===null||Math.abs(nL-vpStableLevelsON.val)>hy) vpStableLevelsON.val=nL;
            const oW=Math.max(1,+state.onWidth||1.4), oDash=vpDashFor(state.onStyle||'dashed', oW);
            const drawOnLine=(show,color,price,name,baseline)=>{
              if(show===false) return;
              if(window.dvlRegisterScaleLabel && price!=null) window.dvlRegisterScaleLabel({value:price,color:color,label:name});
              const yy=rowP(price);
              ctx.strokeStyle=color; ctx.lineWidth=oW; ctx.setLineDash(oDash);
              ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(x1,yy); ctx.stroke(); ctx.setLineDash([]);
              const l=vpLevelLabel(name, price);
              if(l){ ctx.fillStyle=color; ctx.font=vpLabelFont(); ctx.textAlign="left"; ctx.textBaseline=baseline; ctx.globalAlpha=0.9; ctx.fillText(l, x0+40, yy); ctx.globalAlpha=1; }
            };
            drawOnLine(state.onShowPOC, state.onColorPOC||"#c08bff", vpStableLevelsON.poc, "O-POC", "bottom");
            drawOnLine(state.onShowVAH, state.onColorVAH||"#9a6cff", vpStableLevelsON.vah, "O-VAH", "bottom");
            drawOnLine(state.onShowVAL, state.onColorVAL||"#7a4fff", vpStableLevelsON.val, "O-VAL", "top");
          }
        }
      }
    }

    // ── Previous Day Profile (Beta 1.250) — PD POC / PD VAH / PD VAL ─────────
    if(state.pdOn){
      const pd=resolveVPKlinesPrevDay(sym);
      const pView=pd.klines;
      if(pView && pView.length){
        let pMin=Infinity,pMax=-Infinity;
        for(const c of pView){ if(+c.low<pMin)pMin=+c.low; if(+c.high>pMax)pMax=+c.high; }
        if(isFinite(pMin) && isFinite(pMax) && pMax>pMin){
          const pad=(pMax-pMin)*0.005; pMin-=pad; pMax+=pad;
          const pdGrid1345=vpGrid1345(pView,pMin,pMax,requestedRows,sym);
          pMin=pdGrid1345.min;pMax=pdGrid1345.max;const pdRows=pdGrid1345.rows;
          const pc=computeVP(pView, pMin, pMax, pdRows);
          const va=vpValueArea(pc.buy, pc.sell, pdRows, state.valueAreaPct||0.70);
          if(va){
            const ppr=(pMax-pMin)/pdRows;
            if(vpStableLevelsPD.key!==pd.key){ vpStableLevelsPD={poc:null,vah:null,val:null,key:pd.key}; }
            const hy=ppr*1.5;
            const nP=pMin+(va.pocIdx+0.5)*ppr, nH=pMin+(va.hi+1)*ppr, nL=pMin+va.lo*ppr;
            if(vpStableLevelsPD.poc===null||Math.abs(nP-vpStableLevelsPD.poc)>hy) vpStableLevelsPD.poc=nP;
            if(vpStableLevelsPD.vah===null||Math.abs(nH-vpStableLevelsPD.vah)>hy) vpStableLevelsPD.vah=nH;
            if(vpStableLevelsPD.val===null||Math.abs(nL-vpStableLevelsPD.val)>hy) vpStableLevelsPD.val=nL;
            const pW=Math.max(1,+state.pdWidth||1.4), pDash=vpDashFor(state.pdStyle||'dashed', pW);
            const drawPdLine=(show,color,price,name,baseline)=>{
              if(show===false || !(price>0)) return;
              if(window.dvlRegisterScaleLabel) window.dvlRegisterScaleLabel({value:price,color:color,label:name});
              const yy=rowP(price);
              ctx.strokeStyle=color; ctx.lineWidth=pW; ctx.setLineDash(pDash);
              ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(x1,yy); ctx.stroke(); ctx.setLineDash([]);
              const l=vpLevelLabel(name, price);
              if(l){ ctx.fillStyle=color; ctx.font=vpLabelFont(); ctx.textAlign="left"; ctx.textBaseline=baseline; ctx.globalAlpha=0.92; ctx.fillText(l, x0+3, yy); ctx.globalAlpha=1; }
            };
            drawPdLine(state.pdShowPOC, state.pdColorPOC||"#ffa94d", vpStableLevelsPD.poc, "PD POC", "bottom");
            drawPdLine(state.pdShowVAH, state.pdColorVAH||"#ffd08a", vpStableLevelsPD.vah, "PD VAH", "bottom");
            drawPdLine(state.pdShowVAL, state.pdColorVAL||"#ff924d", vpStableLevelsPD.val, "PD VAL", "top");
          }
        }
      }
    }

    } finally { ctx.restore(); }
  }

  // ── Settings panel ────────────────────────────────────────────────────────
  let panel = null;
  function ensurePanel(){
    if(panel && document.contains(panel)) return;
    panel = document.createElement("div");
    panel.id = "dvlVPPanel";
    panel.className = "dvl-vt-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title"><b>Volume Profile</b><small>range visível · POC / VAH / VAL</small></div>
        <div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlVPClose" type="button">×</button></div>
      </div>
      <div class="dvl-vt-body" id="dvlVPBody"></div>
    `;
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlVPClose").addEventListener("click", closePanel);
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }

  const VP_STYLE_OPTS=[["solid","Sólida"],["dashed","Tracejada"],["dotted","Pontilhada"],["dashdot","Traço-ponto"]];
  const VP_LABEL_OPTS=[["full","Full"],["short","Short"],["price","Price Only"],["hidden","Hidden"]];
  const VP_ROW_LAYOUT_OPTS=[["rows","Number of Rows"],["ticks","Ticks Per Row"]];
  const VP_PALETTE=["#10df77","#13dc8d","#2ee6a6","#a7f542","#f3c768","#ffcf5a",
                    "#ff9f43","#ff4a61","#ff3037","#ff6b8f","#b86cff","#9a5cff",
                    "#38e0ff","#3fa9ff","#1e6bff","#2a4bff","#7fb8ff","#00c2d1",
                    "#ffffff","#c9f7de","#ffd700","#c0c0c0"];
  function openVPPalette(btn,key){
    document.querySelectorAll(".dvl-feb-pal").forEach(p=>p.remove());
    const pal=document.createElement("div");pal.className="dvl-feb-pal";
    VP_PALETTE.forEach(clr=>{
      const cell=document.createElement("button");
      cell.type="button";
      cell.className="dvl-feb-pal-cell"+(clr===state[key]?" is-cur":"");
      cell.style.background=clr;cell.title=clr;
      cell.addEventListener("click",()=>{
        state[key]=clr;btn.style.background=clr;btn.dataset.clr=clr;
        save();if(typeof drawSoon==="function")drawSoon();pal.remove();
      });
      pal.appendChild(cell);
    });
    btn.parentNode.appendChild(pal);
    const onOut=e=>{if(!pal.contains(e.target)&&e.target!==btn){pal.remove();document.removeEventListener("pointerdown",onOut,true);}};
    setTimeout(()=>document.addEventListener("pointerdown",onOut,true),0);
  }
  function cField(id,lbl,key){
    const val=state[key]||"#10df77";
    return `<div class="dvl-vt-field"><label>${lbl}</label><div class="dvl-feb-clr-field"><button id="${id}" class="dvl-feb-clr-swatch" type="button" style="background:${val}" data-clr="${val}" aria-label="${lbl}"></button></div></div>`;
  }
  function vpStepFld(id,val,min,max,step,dec){
    const dv=dec>0?(+val).toFixed(dec):String(val);
    return `<div class="dvl-feb-step-wrap">`
      +`<button class="dvl-feb-step-btn dvl-feb-step-dec" type="button" data-id="${id}" data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${dec}">−</button>`
      +`<span class="dvl-feb-step-val" id="${id}Val">${dv}</span>`
      +`<button class="dvl-feb-step-btn dvl-feb-step-inc" type="button" data-id="${id}" data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${dec}">+</button>`
      +`</div>`;
  }
  function vpDropFld(id,opts,cur){
    const lbl=opts.find(([v])=>v===cur)?.[1]||cur;
    const items=opts.map(([v,l])=>`<button class="dvl-drop-item${v===cur?" is-cur":""}" type="button" data-val="${v}">${l}</button>`).join("");
    return `<div class="dvl-drop-wrap" id="${id}Wrap">`
      +`<button class="dvl-drop-btn" type="button" id="${id}">${lbl}<i class="dvl-drop-arr">▾</i></button>`
      +`<div class="dvl-drop-list" id="${id}List">${items}</div>`
      +`</div>`;
  }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlVPBody");
    const vpTicksMode1345=state.rowLayout==="ticks";
    const vpRowValue1345=vpTicksMode1345?state.ticksPerRow:Math.round(state.rows||120);
    const vpRowMin1345=vpTicksMode1345?1:20, vpRowMax1345=vpTicksMode1345?100000:500, vpRowStep1345=vpTicksMode1345?1:10;
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Geral</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="dvlVPOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Labels</label><label class="dvl-switch"><input id="dvlVPLabels" type="checkbox" ${state.showLabels!==false?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Travar ao zoom/pan</label><label class="dvl-switch"><input id="dvlVPLockViewport" type="checkbox" ${state.lockViewport!==false?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field" style="grid-column:1/-1"><label>Âncora</label><button id="dvlVPReanchor" class="dvl-drop-btn" type="button" style="min-width:148px;justify-content:center">Reancorar no range atual</button></div>
          <div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label>Rows Layout</label>${vpDropFld("dvlVPRowLayout",VP_ROW_LAYOUT_OPTS,state.rowLayout||'rows')}</div>
          <div class="dvl-vt-field"><label>Row Size</label>${vpStepFld("dvlVPRowSize",vpRowValue1345,vpRowMin1345,vpRowMax1345,vpRowStep1345,0)}</div>
          <div class="dvl-vt-field"><label>Métrica</label><strong style="font-size:9px;color:var(--dvl-muted,#8ea0af);font-weight:800">${vpTicksMode1345?'ticks por faixa':'quantidade de faixas'}</strong></div>
          <div class="dvl-vt-field"><label>Largura %</label>${vpStepFld("dvlVPWPct",Math.round((state.widthPct||0.18)*100),5,60,1,0)}</div>
          <div class="dvl-vt-field"><label>Arredondamento</label>${vpStepFld("dvlVPColRadius",Math.round(state.colRadius||0),0,3,1,0)}</div>
          <div class="dvl-vt-field"><label>Opacidade %</label>${vpStepFld("dvlVPOp",Math.round((state.opacity||0.46)*100),5,100,5,0)}</div>
          <div class="dvl-vt-field"><label>Value Area %</label>${vpStepFld("dvlVPVAPct",Math.round((state.valueAreaPct||0.70)*100),10,100,5,0)}</div>
          <div class="dvl-vt-field"><label>Fonte dos textos (px)</label>${vpStepFld("dvlVPLabelFont",Math.round(state.labelFontPx||8),6,20,1,0)}</div>
          <div class="dvl-vt-field"><label>Preço no label</label><label class="dvl-switch"><input id="dvlVPLabelPrice" type="checkbox" ${state.labelPrice?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label style="white-space:nowrap">Label</label>${vpDropFld("dvlVPLabelMode",VP_LABEL_OPTS,(state.labelMode||'short'))}</div>
          <div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label style="white-space:nowrap">Timeframe do VP</label>${vpDropFld("dvlVPTF",VP_TF_OPTS.map(o=>[o.v,o.l]),(state.vpTF||'visible'))}</div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Cores das Barras</span></div>
        <div class="dvl-vt-grid">
          ${cField("dvlVPCBuy","Buy (verde)","colorBuy")}
          ${cField("dvlVPCSell","Sell (vermelho)","colorSell")}
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>POC / VAH / VAL</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>POC</label><label class="dvl-switch"><input id="dvlVPPOC" type="checkbox" ${state.showPOC!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCPOC","Cor POC","colorPOC")}
          <div class="dvl-vt-field"><label>VAH</label><label class="dvl-switch"><input id="dvlVPVAH" type="checkbox" ${state.showVAH!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCVAH","Cor VAH","colorVAH")}
          <div class="dvl-vt-field"><label>VAL</label><label class="dvl-switch"><input id="dvlVPVAL" type="checkbox" ${state.showVAL!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCVAL","Cor VAL","colorVAL")}
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>${vpDropFld("dvlVPStyleCur",VP_STYLE_OPTS,(state.lineStyleCur||'dashed'))}</div>
          <div class="dvl-vt-field"><label>Espessura</label>${vpStepFld("dvlVPWCur",(+state.lineWidthCur||1.4),1,4,0.5,1)}</div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Previous Week — semana anterior (W-POC/W-VAH/W-VAL)</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="dvlVPS2On" type="checkbox" ${state.s2on!==false?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>W-POC</label><label class="dvl-switch"><input id="dvlVPS2POC" type="checkbox" ${state.s2showPOC!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCS2POC","Cor W-POC","s2colorPOC")}
          <div class="dvl-vt-field"><label>W-VAH</label><label class="dvl-switch"><input id="dvlVPS2VAH" type="checkbox" ${state.s2showVAH!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCS2VAH","Cor W-VAH","s2colorVAH")}
          <div class="dvl-vt-field"><label>W-VAL</label><label class="dvl-switch"><input id="dvlVPS2VAL" type="checkbox" ${state.s2showVAL!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCS2VAL","Cor W-VAL","s2colorVAL")}
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>${vpDropFld("dvlVPStyleS2",VP_STYLE_OPTS,(state.lineStyleS2||'dashdot'))}</div>
          <div class="dvl-vt-field"><label>Espessura</label>${vpStepFld("dvlVPWS2",(+state.lineWidthS2||1.4),1,4,0.5,1)}</div>
          <div class="dvl-vt-field" style="grid-column:1/-1"><label>Período</label><b style="font-size:9px;color:#9fb3c8">Semana anterior fechada · usa o timezone do Previous Day</b></div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Developing — sessão em curso (ao vivo)</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="dvlVPDevOn" type="checkbox" ${state.devOn?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>D-POC</label><label class="dvl-switch"><input id="dvlVPDevPOC" type="checkbox" ${state.devShowPOC!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCDevPOC","Cor D-POC","devColorPOC")}
          <div class="dvl-vt-field"><label>D-VAH</label><label class="dvl-switch"><input id="dvlVPDevVAH" type="checkbox" ${state.devShowVAH!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCDevVAH","Cor D-VAH","devColorVAH")}
          <div class="dvl-vt-field"><label>D-VAL</label><label class="dvl-switch"><input id="dvlVPDevVAL" type="checkbox" ${state.devShowVAL!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCDevVAL","Cor D-VAL","devColorVAL")}
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>${vpDropFld("dvlVPStyleDev",VP_STYLE_OPTS,(state.devStyle||'solid'))}</div>
          <div class="dvl-vt-field"><label>Espessura</label>${vpStepFld("dvlVPWDev",(+state.devWidth||1.6),1,4,0.5,1)}</div>
          <div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label style="white-space:nowrap">Sessão (timeframe)</label>${vpDropFld("dvlVPDevTF",VP_TF_OPTS_S2.map(o=>[o.v,o.l]),(state.devTF||'1d'))}</div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Overnight — janela por timezone</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="dvlVPOnOn" type="checkbox" ${state.onOn?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Developing</label><label class="dvl-switch"><input id="dvlVPOnDev" type="checkbox" ${state.onDeveloping!==false?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Início — hora</label>${vpStepFld("dvlVPOnSH",Math.round(state.onStartH||0),0,23,1,0)}</div>
          <div class="dvl-vt-field"><label>Início — min</label>${vpStepFld("dvlVPOnSM",Math.round(state.onStartM||0),0,55,5,0)}</div>
          <div class="dvl-vt-field"><label>Fim — hora</label>${vpStepFld("dvlVPOnEH",Math.round(state.onEndH||8),0,23,1,0)}</div>
          <div class="dvl-vt-field"><label>Fim — min</label>${vpStepFld("dvlVPOnEM",Math.round(state.onEndM||0),0,55,5,0)}</div>
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Timezone</label>${vpDropFld("dvlVPOnTZ",[["UTC","UTC"],["Exchange","Exchange"],["Local","Local"],["Europe/Brussels","Bruxelas"],["America/New_York","New York"]],(state.onTZ||'UTC'))}</div>
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Sessão</label>${vpDropFld("dvlVPOnSess",[["current","Atual"],["previous","Anterior"]],(state.onSession||'current'))}</div>
          <div class="dvl-vt-field"><label>O-POC</label><label class="dvl-switch"><input id="dvlVPOnPOC" type="checkbox" ${state.onShowPOC!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCOnPOC","Cor O-POC","onColorPOC")}
          <div class="dvl-vt-field"><label>O-VAH</label><label class="dvl-switch"><input id="dvlVPOnVAH" type="checkbox" ${state.onShowVAH!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCOnVAH","Cor O-VAH","onColorVAH")}
          <div class="dvl-vt-field"><label>O-VAL</label><label class="dvl-switch"><input id="dvlVPOnVAL" type="checkbox" ${state.onShowVAL!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCOnVAL","Cor O-VAL","onColorVAL")}
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>${vpDropFld("dvlVPStyleOn",VP_STYLE_OPTS,(state.onStyle||'dashed'))}</div>
          <div class="dvl-vt-field"><label>Espessura</label>${vpStepFld("dvlVPWOn",(+state.onWidth||1.4),1,4,0.5,1)}</div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Previous Day — dia anterior (PD POC/VAH/VAL)</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="dvlVPPdOn" type="checkbox" ${state.pdOn?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Timezone</label>${vpDropFld("dvlVPPdTZ",[["UTC","UTC"],["Exchange","Exchange"],["Local","Local"],["America/New_York","New York"],["Europe/Brussels","Bruxelas"]],(state.pdTZ||'UTC'))}</div>
          <div class="dvl-vt-field"><label>PD POC</label><label class="dvl-switch"><input id="dvlVPPdPOC" type="checkbox" ${state.pdShowPOC!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCPdPOC","Cor PD POC","pdColorPOC")}
          <div class="dvl-vt-field"><label>PD VAH</label><label class="dvl-switch"><input id="dvlVPPdVAH" type="checkbox" ${state.pdShowVAH!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCPdVAH","Cor PD VAH","pdColorVAH")}
          <div class="dvl-vt-field"><label>PD VAL</label><label class="dvl-switch"><input id="dvlVPPdVAL" type="checkbox" ${state.pdShowVAL!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCPdVAL","Cor PD VAL","pdColorVAL")}
          <div class="dvl-vt-field" style="flex-direction:column;align-items:flex-start;gap:4px"><label>Estilo</label>${vpDropFld("dvlVPStylePd",VP_STYLE_OPTS,(state.pdStyle||'dashed'))}</div>
          <div class="dvl-vt-field"><label>Espessura</label>${vpStepFld("dvlVPWPd",(+state.pdWidth||1.4),1,4,0.5,1)}</div>
        </div>
      </div>
    `;

    // Toggles
    function bSw(id,fn){const el=body.querySelector("#"+id);if(el)el.addEventListener("change",()=>{fn(el.checked);save();if(typeof drawSoon==="function")drawSoon();});}
    bSw("dvlVPOn",    v=>{if(v&&!state.on)resetVPPrimaryAnchor1334();state.on=v;updateRow();});
    bSw("dvlVPLabels",v=>{state.showLabels=v;});
    bSw("dvlVPLockViewport",v=>{state.lockViewport=v;resetVPPrimaryAnchor1334();});
    const __reanchor1334=body.querySelector("#dvlVPReanchor");
    if(__reanchor1334)__reanchor1334.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();resetVPPrimaryAnchor1334();if(typeof drawSoon==='function')drawSoon();});
    bSw("dvlVPPOC",   v=>{state.showPOC=v;});
    bSw("dvlVPVAH",   v=>{state.showVAH=v;});
    bSw("dvlVPVAL",   v=>{state.showVAL=v;});
    bSw("dvlVPS2On",  v=>{state.s2on=v; vpKCache2=null; vpStableLevels2={poc:null,vah:null,val:null,sym:null,tf:null};});
    bSw("dvlVPS2POC", v=>{state.s2showPOC=v;});
    bSw("dvlVPS2VAH", v=>{state.s2showVAH=v;});
    bSw("dvlVPS2VAL", v=>{state.s2showVAL=v;});
    bSw("dvlVPLabelPrice", v=>{state.labelPrice=v;});
    bSw("dvlVPDevOn",  v=>{state.devOn=v;});
    bSw("dvlVPDevPOC", v=>{state.devShowPOC=v;});
    bSw("dvlVPDevVAH", v=>{state.devShowVAH=v;});
    bSw("dvlVPDevVAL", v=>{state.devShowVAL=v;});
    bSw("dvlVPOnOn",  v=>{state.onOn=v; vpKCacheON=null; vpStableLevelsON={poc:null,vah:null,val:null,key:null};});
    bSw("dvlVPOnDev", v=>{state.onDeveloping=v; vpKCacheON=null;});
    bSw("dvlVPOnPOC", v=>{state.onShowPOC=v;});
    bSw("dvlVPOnVAH", v=>{state.onShowVAH=v;});
    bSw("dvlVPOnVAL", v=>{state.onShowVAL=v;});
    bSw("dvlVPPdOn",  v=>{state.pdOn=v; vpKCachePD=null; vpStableLevelsPD={poc:null,vah:null,val:null,key:null};});
    bSw("dvlVPPdPOC", v=>{state.pdShowPOC=v;});
    bSw("dvlVPPdVAH", v=>{state.pdShowVAH=v;});
    bSw("dvlVPPdVAL", v=>{state.pdShowVAL=v;});
    // Steppers
    const VP_STEP={
      dvlVPRowSize: v=>{if(state.rowLayout==="ticks")state.ticksPerRow=Math.max(1,Math.min(100000,Math.round(v)));else state.rows=Math.max(20,Math.min(500,Math.round(v)));},
      dvlVPWPct: v=>{state.widthPct=Math.max(0.05,Math.min(0.60,v/100));},
      dvlVPColRadius: v=>{state.colRadius=Math.max(0,Math.min(3,Math.round(v)));},
      dvlVPLabelFont: v=>{state.labelFontPx=Math.max(6,Math.min(20,Math.round(v)));},
      dvlVPWPd: v=>{state.pdWidth=Math.max(1,Math.min(4,v));},
      dvlVPOp:   v=>{state.opacity=Math.max(0.05,Math.min(1,v/100));},
      dvlVPVAPct:v=>{state.valueAreaPct=Math.max(0.10,Math.min(1,v/100));},
      dvlVPWCur: v=>{state.lineWidthCur=Math.max(1,Math.min(4,v));},
      dvlVPWS2:  v=>{state.lineWidthS2 =Math.max(1,Math.min(4,v));},
      dvlVPWDev: v=>{state.devWidth=Math.max(1,Math.min(4,v));},
      dvlVPWOn:v=>{state.onWidth=Math.max(1,Math.min(4,v));},
      dvlVPOnSH:v=>{state.onStartH=Math.max(0,Math.min(23,Math.round(v)));vpKCacheON=null;vpStableLevelsON={poc:null,vah:null,val:null,key:null};},
      dvlVPOnSM:v=>{state.onStartM=Math.max(0,Math.min(59,Math.round(v)));vpKCacheON=null;vpStableLevelsON={poc:null,vah:null,val:null,key:null};},
      dvlVPOnEH:v=>{state.onEndH=Math.max(0,Math.min(23,Math.round(v)));vpKCacheON=null;vpStableLevelsON={poc:null,vah:null,val:null,key:null};},
      dvlVPOnEM:v=>{state.onEndM=Math.max(0,Math.min(59,Math.round(v)));vpKCacheON=null;vpStableLevelsON={poc:null,vah:null,val:null,key:null};}
    };
    function applyVPStep1345(id,v){
      if(VP_STEP[id])VP_STEP[id](v);
      if(id==="dvlVPRowSize"){
        try{__dvlVPCache1210.primary=null;__dvlVPCache1210.secondary=null;}catch(_){}
        vpStableLevels={poc:null,vah:null,val:null,sym:null,tf:null};
        vpStableLevels2={poc:null,vah:null,val:null,sym:null,tf:null};
      }
      save();if(typeof drawSoon==="function")drawSoon();
    }
    body.querySelectorAll(".dvl-feb-step-btn").forEach(btn=>{
      btn.addEventListener("click",e=>{
        e.stopPropagation();
        const id=btn.dataset.id;
        const step=parseFloat(btn.dataset.step),mn=parseFloat(btn.dataset.min),mx=parseFloat(btn.dataset.max),dc=parseInt(btn.dataset.dec);
        const isInc=btn.classList.contains("dvl-feb-step-inc");
        const valEl=body.querySelector("#"+id+"Val");if(!valEl)return;
        const cur=parseFloat(valEl.textContent)||0;
        const v=isInc?Math.min(mx,+(cur+step).toFixed(dc)):Math.max(mn,+(cur-step).toFixed(dc));
        valEl.textContent=dc>0?v.toFixed(dc):String(v);
        applyVPStep1345(id,v);
      });
    });
    if(window.DVLVPRowLayout1345)window.DVLVPRowLayout1345.bindEditable(body,applyVPStep1345);
    // Dropdown
    body.querySelectorAll(".dvl-drop-btn").forEach(btn=>{
      btn.addEventListener("click",e=>{
        e.stopPropagation();
        const list=body.querySelector("#"+btn.id+"List");if(!list)return;
        const wasOpen=list.classList.contains("is-open");
        body.querySelectorAll(".dvl-drop-list.is-open").forEach(l=>l.classList.remove("is-open"));
        if(!wasOpen)list.classList.add("is-open");
      });
    });
    body.querySelectorAll(".dvl-drop-item").forEach(item=>{
      item.addEventListener("click",e=>{
        e.stopPropagation();
        const val=item.dataset.val;
        const listEl=item.closest(".dvl-drop-list");
        const btnId=listEl.id.replace("List","");
        const btn=body.querySelector("#"+btnId);
        if(btn){const tn=[...btn.childNodes].find(n=>n.nodeType===3);if(tn)tn.textContent=item.textContent;}
        listEl.querySelectorAll(".dvl-drop-item").forEach(i=>i.classList.toggle("is-cur",i===item));
        listEl.classList.remove("is-open");
        if(btnId==="dvlVPTF"){state.vpTF=val;vpKCache=null;resetVPPrimaryAnchor1334();}
        if(btnId==="dvlVPRowLayout"){
          state.rowLayout=val==="ticks"?"ticks":"rows";
          try{__dvlVPCache1210.primary=null;__dvlVPCache1210.secondary=null;}catch(_){}
          save();renderPanel();if(typeof drawSoon==="function")drawSoon();return;
        }
        if(btnId==="dvlVPLabelMode"){state.labelMode=val;}
        if(btnId==="dvlVPStyleCur"){state.lineStyleCur=val;}
        if(btnId==="dvlVPStyleS2"){state.lineStyleS2=val;}
        if(btnId==="dvlVPStyleDev"){state.devStyle=val;}
        if(btnId==="dvlVPDevTF"){state.devTF=val;vpKCacheDev=null;vpStableLevelsDev={poc:null,vah:null,val:null,sym:null,tf:null};}
        if(btnId==="dvlVPStyleOn"){state.onStyle=val;}
        if(btnId==="dvlVPStylePd"){state.pdStyle=val;}
        if(btnId==="dvlVPPdTZ"){state.pdTZ=val;vpKCachePD=null;vpStableLevelsPD={poc:null,vah:null,val:null,key:null};vpKCache2=null;vpStableLevels2={poc:null,vah:null,val:null,sym:null,tf:null};}
        if(btnId==="dvlVPOnTZ"){state.onTZ=val;vpKCacheON=null;vpStableLevelsON={poc:null,vah:null,val:null,key:null};}
        if(btnId==="dvlVPOnSess"){state.onSession=val;vpKCacheON=null;vpStableLevelsON={poc:null,vah:null,val:null,key:null};}
        save();if(typeof drawSoon==="function")drawSoon();
      });
    });
    // Color palette
    const VP_CLR={dvlVPCBuy:"colorBuy",dvlVPCSell:"colorSell",dvlVPCPOC:"colorPOC",dvlVPCVAH:"colorVAH",dvlVPCVAL:"colorVAL",dvlVPCS2POC:"s2colorPOC",dvlVPCS2VAH:"s2colorVAH",dvlVPCS2VAL:"s2colorVAL",dvlVPCDevPOC:"devColorPOC",dvlVPCDevVAH:"devColorVAH",dvlVPCDevVAL:"devColorVAL",dvlVPCOnPOC:"onColorPOC",dvlVPCOnVAH:"onColorVAH",dvlVPCOnVAL:"onColorVAL",dvlVPCPdPOC:"pdColorPOC",dvlVPCPdVAH:"pdColorVAH",dvlVPCPdVAL:"pdColorVAL"};
    body.querySelectorAll(".dvl-feb-clr-swatch").forEach(btn=>{
      const key=VP_CLR[btn.id];if(!key)return;
      btn.addEventListener("click",()=>openVPPalette(btn,key));
    });
    // Fechar dropdowns ao clicar fora
    body.addEventListener("pointerdown",e=>{
      if(!e.target.closest(".dvl-drop-wrap"))body.querySelectorAll(".dvl-drop-list.is-open").forEach(l=>l.classList.remove("is-open"));
    });
  }

  // ── Indicator row ─────────────────────────────────────────────────────────
  function updateRow(){
    const st = document.getElementById("dvlVPState");
    if(st){ st.textContent=state.on?"ON":"OFF"; st.classList.toggle("is-on",!!state.on); }
  }

  function insertRow(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu) return;
    let item = document.getElementById("dvlVolProfileItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlVolProfileItem";
      item.className = "indicatorItem";
      item.innerHTML = `
        <span class="indicatorFxMark">VP</span>
        <span><b>Volume Profile</b><small>range visível · POC / VAH / VAL</small></span>
        <i class="dvl-vt-state" id="dvlVPState">ON</i>
      `;
      const after = document.getElementById("dvlTickVolumeItem")||document.getElementById("dvlDeltaVolumeItem");
      if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);
      else menu.appendChild(item);
    }
    if(!item.dataset.dvlVPBound){
      item.dataset.dvlVPBound = "1";
      const pill = item.querySelector("#dvlVPState");
      if(pill) pill.addEventListener("click", ev=>{ ev.preventDefault(); ev.stopPropagation(); setOn(!state.on); });
      item.addEventListener("click", ev=>{ ev.stopPropagation(); openPanel(); });
    }
    updateRow();
  }

  function boot(){ insertRow(); updateRow(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLVolumeProfile = { version:"1.347", on, setOn, draw, openPanel,
    get state(){ return Object.assign({}, state); },
    // Beta 1.229 — níveis atuais para confluência (Smart Delta etc.)
    getLevels:function(){ function pk(o){ return o&&o.poc!=null?{poc:o.poc,vah:o.vah,val:o.val}:null; } const pw=(state.s2on!==false?pk(vpStableLevels2):null); return { current:pk(vpStableLevels), previous:pw, previousWeek:pw, developing:(state.devOn?pk(vpStableLevelsDev):null), overnight:(state.onOn?pk(vpStableLevelsON):null), previousDay:(state.pdOn?pk(vpStableLevelsPD):null) }; }
  };
  window.DVLVolumeProfileDraw = function(ctx, cfg){ try{ draw(ctx, cfg); }catch(_){} };

})();
