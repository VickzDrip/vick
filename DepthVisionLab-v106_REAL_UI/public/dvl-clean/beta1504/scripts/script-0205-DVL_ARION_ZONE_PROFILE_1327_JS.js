(function(){
  "use strict";
  if(window.DVLArionZoneProfile) return;

  const KEY="dvl_arion_zone_profile_mtf_v1";
  const TF_LIST=["chart","1m","3m","5m","15m","30m","1h","4h","1d"];
  const PALETTE=["#9aa4ad","#ffffff","#00be64","#0078ff","#00beff","#ffdc00","#ff9100","#ff5000","#ff0000","#7d00ff","#b900ff","#ff00ff","#1e50b4","#ff5a00","#f000ff","#10df77","#35e0ff","#ffd321"];
  const DEFAULTS={
    on:false,
    useFinancialVolume:false,
    colorCandles:true,
    colorVolume:true,
    selectionMode:"exact",
    useCustomTF:false,
    tf:"1h",
    maPeriod:50,
    maType:"SMA",
    showMA:true,
    mult:[1,2,3,4,5,6,7,8,9,10],
    enabled:[false,true,true,true,true,true,true,true,true,true],
    showZones:false,
    zoneType:"whole",
    zoneCount:150,
    zoneTransparency:90,
    showProfile:true,
    weightLevel:false,
    limitProfilePrice:true,
    profileRangePct:15,
    profileBins:40,
    profileWidth:50,
    profileDistance:5,
    profileAnchor:"right",
    profileSessionOffset:0,
    profileTransparency:30,
    showPOC:true,
    neutralColor:"#9aa4ad",
    maColor:"#ffffff",
    levelColors:["#00be64","#0078ff","#00beff","#ffdc00","#ff9100","#ff5000","#ff0000","#7d00ff","#b900ff","#ff00ff"],
    profileWeakColor:"#1e50b4",
    profileStrongColor:"#ff5a00",
    pocColor:"#f000ff",
    showRegions:true,
    regionCount:3,
    candlesLeft:300,
    limitRegionsPrice:true,
    maxRegionDistancePct:15,
    regionTransparency:88,
    regionStrongColor:"#ff9100"
  };

  let state=load();
  let panel=null,palette=null,paletteTarget=null;
  const ZONE_CACHE={key:null,data:[],fetching:false,error:null,source:"CHART"};
  let chartCalcCache=null,zoneCalcCache=null;

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function hexOk(v){return /^#[0-9a-f]{6}$/i.test(String(v||""));}
  function safeDraw(){try{if(typeof drawSoon==="function")drawSoon();}catch(_){}}
  function toast(msg){try{if(typeof showToast==="function"){showToast(msg);return;}}catch(_){} try{const t=document.getElementById("toast");if(t){t.textContent=msg;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),1800);}}catch(_){} }
  function rgb(h){h=String(h||"").replace("#","");const n=parseInt(h,16);return Number.isFinite(n)?{r:(n>>16)&255,g:(n>>8)&255,b:n&255}:{r:255,g:255,b:255};}
  function rgba(h,a){const c=rgb(h);return `rgba(${c.r},${c.g},${c.b},${clamp(Number(a)||0,0,1).toFixed(3)})`;}
  function mix(a,b,t){const A=rgb(a),B=rgb(b),q=clamp(t,0,1);const f=n=>Math.round(n).toString(16).padStart(2,"0");return "#"+f(A.r+(B.r-A.r)*q)+f(A.g+(B.g-A.g)*q)+f(A.b+(B.b-A.b)*q);}
  function fmt(v){const n=Math.abs(Number(v)||0);if(n>=1e9)return(n/1e9).toFixed(1)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return Math.round(n).toString();}

  function normalize(s){
    const o=Object.assign(clone(DEFAULTS),s||{});
    o.on=!!o.on;o.useFinancialVolume=!!o.useFinancialVolume;o.colorCandles=o.colorCandles!==false;o.colorVolume=o.colorVolume!==false;
    o.selectionMode=o.selectionMode==="fromMin"?"fromMin":"exact";o.useCustomTF=!!o.useCustomTF;o.tf=TF_LIST.includes(o.tf)?o.tf:"1h";
    o.maPeriod=clamp(Math.round(+o.maPeriod||50),1,1000);o.maType=["SMA","EMA","RMA","WMA"].includes(o.maType)?o.maType:"SMA";o.showMA=o.showMA!==false;
    o.mult=Array.from({length:10},(_,i)=>clamp(Number(o.mult&&o.mult[i])||i+1,.01,100));
    o.enabled=Array.from({length:10},(_,i)=>!!(o.enabled&&o.enabled[i]));
    o.showZones=!!o.showZones;o.zoneType=["whole","body","central"].includes(o.zoneType)?o.zoneType:"whole";o.zoneCount=clamp(Math.round(+o.zoneCount||150),10,350);o.zoneTransparency=clamp(Math.round(+o.zoneTransparency||90),0,100);
    o.showProfile=o.showProfile!==false;o.weightLevel=!!o.weightLevel;o.limitProfilePrice=o.limitProfilePrice!==false;o.profileRangePct=clamp(+o.profileRangePct||15,1,100);o.profileBins=clamp(Math.round(+o.profileBins||40),10,100);o.profileWidth=clamp(Math.round(+o.profileWidth||50),5,200);o.profileDistance=clamp(Math.round(+o.profileDistance||5),1,100);o.profileAnchor=["right","h1","h4","daily","weekly","asia","london","newyork","overnight"].includes(o.profileAnchor)?o.profileAnchor:"right";o.profileSessionOffset=+o.profileSessionOffset===1?1:0;o.profileTransparency=clamp(Math.round(+o.profileTransparency||30),0,100);o.showPOC=o.showPOC!==false;
    o.neutralColor=hexOk(o.neutralColor)?o.neutralColor:DEFAULTS.neutralColor;o.maColor=hexOk(o.maColor)?o.maColor:DEFAULTS.maColor;
    o.levelColors=Array.from({length:10},(_,i)=>hexOk(o.levelColors&&o.levelColors[i])?o.levelColors[i]:DEFAULTS.levelColors[i]);
    o.profileWeakColor=hexOk(o.profileWeakColor)?o.profileWeakColor:DEFAULTS.profileWeakColor;o.profileStrongColor=hexOk(o.profileStrongColor)?o.profileStrongColor:DEFAULTS.profileStrongColor;o.pocColor=hexOk(o.pocColor)?o.pocColor:DEFAULTS.pocColor;
    o.showRegions=o.showRegions!==false;o.regionCount=+o.regionCount===5?5:3;o.candlesLeft=clamp(Math.round(+o.candlesLeft||300),20,5000);o.limitRegionsPrice=o.limitRegionsPrice!==false;o.maxRegionDistancePct=clamp(+o.maxRegionDistancePct||15,1,100);o.regionTransparency=clamp(Math.round(+o.regionTransparency||88),0,100);o.regionStrongColor=hexOk(o.regionStrongColor)?o.regionStrongColor:DEFAULTS.regionStrongColor;
    return o;
  }
  function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||"null"));}catch(_){return clone(DEFAULTS);}}
  function save(){state=normalize(state);chartCalcCache=null;zoneCalcCache=null;try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){} updateRow();rerenderModern();safeDraw();}
  function reset(){state=clone(DEFAULTS);ZONE_CACHE.key=null;ZONE_CACHE.data=[];save();renderPanel();}
  function on(){return !!state.on;}
  function canEnable(){try{const l=window.DVL_OSCILLATOR_LIMIT_0941;return !l||typeof l.canEnable!=="function"||l.canEnable("arion");}catch(_){return true;}}
  function setOn(v){v=!!v;if(v&&!state.on&&!canEnable()){toast("Limite de 3 osciladores por vez");return false;}state.on=v;save();if(v&&state.useCustomTF)ensureZoneData(true);try{if(window.DVLForceChartLayoutSync1209)window.DVLForceChartLayoutSync1209();}catch(_){}return true;}
  function rerenderModern(){try{const a=window.DVL_PHASE1B_INDICATORS_MENU_0813_API;if(a&&typeof a.render==="function")a.render();}catch(_){} }

  function chartData(){try{return Array.isArray(klines)?klines:[];}catch(_){return [];}}
  function symbol(){try{return String(window.currentSymbol||((typeof currentSymbol!=="undefined")?currentSymbol:"")||((typeof symbol!=="undefined")?symbol:"")||"BTCUSDT").toUpperCase();}catch(_){return "BTCUSDT";}}
  function chartTF(){try{return String((typeof interval!=="undefined"&&interval)||"5m");}catch(_){return "5m";}}
  function tfMs(tf){const m={"1m":60000,"3m":180000,"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"4h":14400000,"1d":86400000};if(tf==="chart")try{return Math.max(1000,intervalMs(chartTF()));}catch(_){return 300000;}return m[tf]||3600000;}
  function effectiveTF(){return state.useCustomTF?(state.tf==="chart"?chartTF():state.tf):chartTF();}
  function volumeOf(c){const v=Number(c&&c.volume)||0;return state.useFinancialVolume?v*(Number(c&&c.close)||0):v;}
  function currentPrice(){const a=chartData();return Number(a.at(-1)&&a.at(-1).close)||Number(window.__dvlLiveChartPrice)||0;}
  function replayActive(){return !!window.__DVL_REPLAY_ACTIVE;}

  const ARION_SESSION_SPECS={
    daily:{tz:"UTC",sh:0,sm:0,eh:0,em:0},
    asia:{tz:"UTC",sh:0,sm:0,eh:8,em:0},
    london:{tz:"Europe/London",sh:8,sm:0,eh:16,em:30},
    newyork:{tz:"America/New_York",sh:9,sm:30,eh:16,em:0},
    overnight:{tz:"America/New_York",sh:18,sm:0,eh:9,em:30}
  };
  const ARION_TZ_FMT=new Map();
  function tzFmt(tz){let f=ARION_TZ_FMT.get(tz);if(!f){f=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});ARION_TZ_FMT.set(tz,f);}return f;}
  function tzParts(tz,ts){const out={};for(const q of tzFmt(tz).formatToParts(new Date(ts))){if(q.type!=="literal")out[q.type]=+q.value;}return{y:out.year,mo:out.month,d:out.day,h:out.hour,mi:out.minute,s:out.second};}
  function tzOffsetMs(tz,ts){const p=tzParts(tz,ts);return Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi,p.s)-ts;}
  function localToTs(tz,y,mo,d,h,mi){const naive=Date.UTC(y,mo-1,d,h,mi);let ts=naive-tzOffsetMs(tz,naive);const p=tzParts(tz,ts);if(p.y!==y||p.mo!==mo||p.d!==d||p.h!==h||p.mi!==mi)ts=naive-tzOffsetMs(tz,ts);return ts;}
  function shiftDate(y,mo,d,days){const q=new Date(Date.UTC(y,mo-1,d)+days*86400000);return{y:q.getUTCFullYear(),mo:q.getUTCMonth()+1,d:q.getUTCDate()};}
  function sessionDayWindow(type,date,now){const s=ARION_SESSION_SPECS[type];if(!s)return null;const start=localToTs(s.tz,date.y,date.mo,date.d,s.sh,s.sm);const crosses=(s.eh*60+s.em)<=(s.sh*60+s.sm);const ed=crosses?shiftDate(date.y,date.mo,date.d,1):date;const end=localToTs(s.tz,ed.y,ed.mo,ed.d,s.eh,s.em);return{type,start,end,effectiveEnd:Math.min(end,now),tz:s.tz};}
  function fixedIntervalWindow(type,now,offset){let span=0,start=0;if(type==="h1"){span=3600000;start=Math.floor(now/span)*span;}else if(type==="h4"){span=14400000;start=Math.floor(now/span)*span;}else if(type==="weekly"){span=7*86400000;const d=new Date(now),day=(d.getUTCDay()+6)%7;start=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day,0,0,0,0);}else return null;start-=Math.max(0,offset|0)*span;const end=start+span;return{type,start,end,effectiveEnd:Math.min(end,now),tz:"UTC"};}
  function selectedProfileSession(referenceTs){const type=state.profileAnchor;if(type==="right")return null;const now=Number(referenceTs)||Number(chartData().at(-1)&&chartData().at(-1).time)||Date.now();if(type==="h1"||type==="h4"||type==="weekly")return fixedIntervalWindow(type,now,state.profileSessionOffset);const spec=ARION_SESSION_SPECS[type];if(!spec)return null;const p=tzParts(spec.tz,now),windows=[];for(let i=0;i<12&&windows.length<=state.profileSessionOffset;i++){const d=shiftDate(p.y,p.mo,p.d,-i),w=sessionDayWindow(type,d,now);if(w&&w.start<=now)windows.push(w);}return windows[state.profileSessionOffset]||windows.at(-1)||null;}

  function aggregate(src,ms){
    const map=new Map();
    for(const c of src){const t=Number(c&&c.time);if(!Number.isFinite(t))continue;const bt=Math.floor(t/ms)*ms;let b=map.get(bt);if(!b){b={time:bt,open:+c.open,high:+c.high,low:+c.low,close:+c.close,volume:0};map.set(bt,b);}b.high=Math.max(b.high,+c.high);b.low=Math.min(b.low,+c.low);b.close=+c.close;b.volume+=Number(c.volume)||0;}
    return Array.from(map.values()).sort((a,b)=>a.time-b.time);
  }
  async function fetchPage(tf,limit,endTime){
    const eps=(Array.isArray(window.DVL_REAL_MARKET_ENDPOINTS)&&window.DVL_REAL_MARKET_ENDPOINTS.length)?window.DVL_REAL_MARKET_ENDPOINTS:[{base:(typeof BINANCE!=="undefined"?BINANCE:"https://fapi.binance.com"),klinePath:"/fapi/v1/klines",name:"BINANCE"}];
    const errs=[];
    for(const ep of eps){try{let u=ep.base+(ep.klinePath||"/fapi/v1/klines")+"?symbol="+encodeURIComponent(symbol())+"&interval="+encodeURIComponent(tf)+"&limit="+limit;if(endTime)u+="&endTime="+endTime;const rows=(typeof jget==="function")?await jget(u):await(await fetch(u,{cache:"no-store"})).json();if(Array.isArray(rows)&&rows.length){ZONE_CACHE.source=ep.name||"REAL";return rows;}errs.push((ep.name||ep.base)+":empty");}catch(e){errs.push((ep.name||ep.base)+":"+String(e&&e.message||e).slice(0,80));}}
    throw new Error(errs.join(" | "));
  }
  function parseRows(rows){return rows.map(k=>({time:+k[0],open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]})).filter(c=>Number.isFinite(c.time)).sort((a,b)=>a.time-b.time);}
  async function ensureZoneData(force){
    if(!state.useCustomTF||state.tf==="chart"||replayActive()){ZONE_CACHE.key="chart";ZONE_CACHE.data=state.useCustomTF&&state.tf!=="chart"?aggregate(chartData(),tfMs(state.tf)):chartData();ZONE_CACHE.source=replayActive()?"REPLAY CHART":"CHART";return ZONE_CACHE.data;}
    const key=symbol()+"|"+state.tf;if(!force&&ZONE_CACHE.key===key&&ZONE_CACHE.data.length)return ZONE_CACHE.data;if(ZONE_CACHE.fetching)return ZONE_CACHE.data;ZONE_CACHE.fetching=true;ZONE_CACHE.error=null;
    try{let all=[],end=null;for(let p=0;p<2;p++){const rows=await fetchPage(state.tf,1500,end);if(!rows.length)break;all.push(...rows);end=+rows[0][0]-1;if(rows.length<1500)break;}const dedupe=new Map(parseRows(all).map(c=>[c.time,c]));ZONE_CACHE.data=Array.from(dedupe.values()).sort((a,b)=>a.time-b.time);ZONE_CACHE.key=key;if(!ZONE_CACHE.data.length)throw new Error("empty");}
    catch(e){ZONE_CACHE.error=String(e&&e.message||e);ZONE_CACHE.data=aggregate(chartData(),tfMs(state.tf));ZONE_CACHE.key=key;ZONE_CACHE.source="CHART AGG";}
    finally{ZONE_CACHE.fetching=false;zoneCalcCache=null;safeDraw();}
    return ZONE_CACHE.data;
  }
  function zoneData(){if(!state.useCustomTF||state.tf==="chart")return chartData();if(replayActive())return aggregate(chartData(),tfMs(state.tf));if(!ZONE_CACHE.data.length&&!ZONE_CACHE.fetching)ensureZoneData(false);return ZONE_CACHE.data.length?ZONE_CACHE.data:aggregate(chartData(),tfMs(state.tf));}

  function movingAverage(vals,len,type){
    const n=vals.length,out=new Array(n).fill(null);if(!n)return out;len=Math.max(1,len|0);
    if(type==="EMA"||type==="RMA"){
      const alpha=type==="EMA"?2/(len+1):1/len;let sum=0,prev=null;
      for(let i=0;i<n;i++){const v=Number(vals[i])||0;if(i<len){sum+=v;if(i===len-1){prev=sum/len;out[i]=prev;}}else{prev=prev+alpha*(v-prev);out[i]=prev;}}
      return out;
    }
    if(type==="WMA"){
      let sum=0,weighted=0;for(let i=0;i<n;i++){const v=Number(vals[i])||0;if(i<len){sum+=v;weighted+=(i+1)*v;if(i===len-1)out[i]=weighted/(len*(len+1)/2);}else{const old=Number(vals[i-len])||0;weighted=weighted-sum+len*v;sum=sum-old+v;out[i]=weighted/(len*(len+1)/2);}}return out;
    }
    let sum=0;for(let i=0;i<n;i++){sum+=Number(vals[i])||0;if(i>=len)sum-=Number(vals[i-len])||0;if(i>=len-1)out[i]=sum/len;}return out;
  }
  function levelOf(vol,ma){if(!(ma>0))return 0;for(let i=9;i>=0;i--)if(vol>=ma*state.mult[i])return i+1;return 0;}
  function qualified(n){if(n<=0)return false;if(state.selectionMode==="exact")return !!state.enabled[n-1];let min=99;for(let i=0;i<10;i++)if(state.enabled[i]){min=i+1;break;}return min<99&&n>=min;}
  function zoneBounds(c){if(state.zoneType==="body")return{top:Math.max(+c.open,+c.close),bottom:Math.min(+c.open,+c.close)};if(state.zoneType==="central"){const r=(+c.high)-(+c.low);return{top:+c.low+r*.75,bottom:+c.low+r*.25};}return{top:+c.high,bottom:+c.low};}
  function closedLast(src,ms){if(!src.length)return-1;if(replayActive())return src.length-1;let i=src.length-1;if(Number(src[i].time)+ms>Date.now())i--;return i;}
  function calcSeries(src){
    const vals=src.map(volumeOf),ma=movingAverage(vals,state.maPeriod,state.maType),levels=new Array(src.length),byTime=new Map();for(let i=0;i<src.length;i++){levels[i]=levelOf(vals[i],ma[i]);byTime.set(Number(src[i].time),{vol:vals[i],ma:ma[i],level:levels[i]});}return{src,vals,ma,levels,byTime};
  }
  function settingsSig(kind){return [kind,state.useFinancialVolume,state.maPeriod,state.maType,state.selectionMode,state.mult.join(","),state.enabled.map(x=>x?1:0).join(""),state.zoneType,state.zoneCount,state.weightLevel,state.limitProfilePrice,state.profileRangePct,state.profileBins,state.profileAnchor,state.profileSessionOffset,state.limitRegionsPrice,state.maxRegionDistancePct,state.regionCount].join("|");}
  function seriesCache(src,kind){const n=src.length,last=src.at(-1)||{},sig=settingsSig(kind),now=performance.now();let c=kind==="chart"?chartCalcCache:zoneCalcCache;if(c&&c.src===src&&c.n===n&&c.lastT===+last.time&&c.lastV===+last.volume&&c.sig===sig&&now<c.until)return c;const s=calcSeries(src);c=Object.assign(s,{src,n,lastT:+last.time,lastV:+last.volume,sig,until:now+350});if(kind==="chart")chartCalcCache=c;else zoneCalcCache=c;return c;}
  function chartSeries(){return seriesCache(chartData(),"chart");}

  function zoneAnalysis(){
    const src=zoneData(),base=seriesCache(src,"zone"),referenceTs=Number(chartData().at(-1)&&chartData().at(-1).time)||Number(src.at(-1)&&src.at(-1).time)||Date.now(),anchorWindow=selectedProfileSession(referenceTs);if(base.analysis&&base.analysis.anchorKey===(anchorWindow?anchorWindow.start+"|"+anchorWindow.end:"right"))return base.analysis;const last=closedLast(src,tfMs(effectiveTF())),zones=[];for(let i=0;i<=last;i++){const n=base.levels[i];if(n>0&&qualified(n)){const z=zoneBounds(src[i]);zones.push({time:+src[i].time,top:z.top,bottom:z.bottom,level:n,color:state.levelColors[n-1]});}}
    const profileZones=(anchorWindow?zones.filter(z=>z.time>=anchorWindow.start&&z.time<anchorWindow.effectiveEnd):zones).slice(-state.zoneCount);
    const visibleZones=zones.slice(-state.zoneCount);
    let profile=null;const cp=currentPrice();if(profileZones.length){let min=Infinity,max=-Infinity;for(const z of profileZones){min=Math.min(min,z.bottom);max=Math.max(max,z.top);}if(state.limitProfilePrice&&cp>0){min=Math.max(min,cp*(1-state.profileRangePct/100));max=Math.min(max,cp*(1+state.profileRangePct/100));}if(Number.isFinite(min)&&Number.isFinite(max)&&max>min){const bins=state.profileBins,step=(max-min)/bins,values=new Array(bins).fill(0);for(const z of profileZones){let lo=clamp(Math.floor((z.bottom-min)/step),0,bins-1),hi=clamp(Math.floor((z.top-min)/step),0,bins-1);for(let b=lo;b<=hi;b++)values[b]+=state.weightLevel?z.level:1;}let maxV=0,poc=0;for(let i=0;i<bins;i++)if(values[i]>maxV){maxV=values[i];poc=i;}const selected=[];if(maxV>0&&state.showRegions){for(let r=0;r<state.regionCount;r++){let best=-1,idx=-1;for(let i=0;i<bins;i++){if(selected.includes(i))continue;const mid=min+step*(i+.5),dist=cp>0?Math.abs(mid-cp)/cp*100:0;if(state.limitRegionsPrice&&dist>state.maxRegionDistancePct)continue;if(values[i]>best){best=values[i];idx=i;}}if(idx>=0&&best>0)selected.push(idx);}}profile={min,max,step,values,maxV,poc,selected,zoneCount:profileZones.length};}}
    base.analysis={zones:visibleZones,profile,anchorWindow,anchorKey:anchorWindow?anchorWindow.start+"|"+anchorWindow.end:"right",source:ZONE_CACHE.source||"CHART",lastIndex:last};return base.analysis;
  }

  function globalIndexAtTime(t){const all=chartData();if(!all.length||!Number.isFinite(t))return NaN;const n=all.length,step=tfMs("chart"),first=+all[0].time,last=+all[n-1].time;if(t<=first)return(t-first)/step;if(t>=last)return(n-1)+(t-last)/step;let lo=0,hi=n;while(lo<hi){const m=(lo+hi)>>1;if(+all[m].time<t)lo=m+1;else hi=m;}const b=clamp(lo,1,n-1),a=b-1,ta=+all[a].time,tb=+all[b].time;return a+(tb>ta?(t-ta)/(tb-ta):0);}
  function xAtTime(cfg,t){const gi=globalIndexAtTime(t),win=cfg&&cfg.win;if(win&&Number.isFinite(gi)&&Number.isFinite(+win.leftEdgeIndex))return cfg.x(gi-(+win.leftEdgeIndex));const v=cfg.view||[];if(!v.length)return NaN;let lo=0,hi=v.length;while(lo<hi){const m=(lo+hi)>>1;if(+v[m].time<t)lo=m+1;else hi=m;}return cfg.x((+cfg.slotOffset||0)+clamp(lo,0,v.length-1));}

  function drawOverlay(ctx,cfg){
    if(!state.on||!cfg||!cfg.view||!cfg.view.length)return;const A=zoneAnalysis(),p=A.profile;if(!A.zones.length&&!p)return;ctx.save();ctx.beginPath();ctx.rect(cfg.x0,cfg.y0,cfg.x1-cfg.x0,cfg.y1-cfg.y0);ctx.clip();
    const slot=Math.max(2,Math.abs(cfg.x(1)-cfg.x(0))||6),lastTime=Number(chartData().at(-1)&&chartData().at(-1).time)||Date.now();let right;
    if(A.anchorWindow){const anchorTime=Number(A.anchorWindow.effectiveEnd)||Number(A.anchorWindow.end);right=xAtTime(cfg,anchorTime)+state.profileDistance*slot;}else{right=xAtTime(cfg,lastTime)+state.profileDistance*slot;right=clamp(right,cfg.x0+state.profileWidth+6,cfg.x1-4);}
    const profileVisible=Number.isFinite(right)&&right>=cfg.x0-state.profileWidth-6&&right<=cfg.x1+state.profileWidth+6;
    if(p&&profileVisible&&state.showRegions){for(let r=0;r<p.selected.length;r++){const idx=p.selected[r],top=p.min+p.step*(idx+1),bottom=p.min+p.step*idx,y0=cfg.y(top),y1=cfg.y(bottom),col=r===0?state.pocColor:state.regionStrongColor;ctx.fillStyle=rgba(col,1-state.regionTransparency/100);ctx.strokeStyle=rgba(col,.45);ctx.lineWidth=r===0?1.5:1;const sessionLeft=A.anchorWindow?xAtTime(cfg,A.anchorWindow.start):NaN;const left=Math.max(cfg.x0,Number.isFinite(sessionLeft)?sessionLeft:right-state.candlesLeft*slot);if(right>left){ctx.fillRect(left,Math.min(y0,y1),right-left,Math.max(1,Math.abs(y1-y0)));ctx.strokeRect(left,Math.min(y0,y1),right-left,Math.max(1,Math.abs(y1-y0)));}}}
    if(state.showZones){for(const z of A.zones){let xs=xAtTime(cfg,z.time);if(!Number.isFinite(xs)||xs>cfg.x1)continue;xs=Math.max(cfg.x0,xs);const yt=cfg.y(z.top),yb=cfg.y(z.bottom);if((yt<cfg.y0&&yb<cfg.y0)||(yt>cfg.y1&&yb>cfg.y1))continue;ctx.fillStyle=rgba(z.color,1-state.zoneTransparency/100);ctx.strokeStyle=rgba(z.color,.7);ctx.lineWidth=1;ctx.fillRect(xs,Math.min(yt,yb),cfg.x1-xs,Math.max(1,Math.abs(yb-yt)));ctx.strokeRect(xs,Math.min(yt,yb),cfg.x1-xs,Math.max(1,Math.abs(yb-yt)));}}
    if(p&&profileVisible&&state.showProfile&&p.maxV>0){for(let i=0;i<p.values.length;i++){const v=p.values[i];if(!(v>0))continue;const w=Math.max(1,v/p.maxV*state.profileWidth),top=p.min+p.step*(i+1),bottom=p.min+p.step*i,yt=cfg.y(top),yb=cfg.y(bottom),isP=i===p.poc&&state.showPOC,col=isP?state.pocColor:mix(state.profileWeakColor,state.profileStrongColor,v/p.maxV);ctx.fillStyle=rgba(col,1-state.profileTransparency/100);ctx.strokeStyle=rgba(col,isP?.95:.35);ctx.lineWidth=isP?2:0.7;ctx.fillRect(right-w,Math.min(yt,yb),w,Math.max(1,Math.abs(yb-yt)));ctx.strokeRect(right-w,Math.min(yt,yb),w,Math.max(1,Math.abs(yb-yt)));}}
    ctx.restore();
  }
  function candleColorFor(c){if(!state.on||!state.colorCandles||!c)return null;const row=chartSeries().byTime.get(Number(c.time));return row&&qualified(row.level)?state.levelColors[row.level-1]:null;}

  function panelMetrics(padL,padR,top,h,w){const x0=padL,x1=w-padR,y0=top+5,y1=top+h-7;return{x0,x1,y0,y1,top,h,w,labelGap:(typeof PRICE_LABEL_GAP!=="undefined"?PRICE_LABEL_GAP:2),labelW:(typeof PRICE_LABEL_W!=="undefined"?PRICE_LABEL_W:51)};}
  function oscWindow(){try{return visibleWindow();}catch(_){return{candles:[],totalSlots:100,start:0,end:0};}}
  function xFor(i,m,win){const slots=Math.max(2,win.totalSlots||2),off=typeof __dvlSlotOffset==="function"?__dvlSlotOffset(win,win.candles||[]):0;return m.x0+(off+i)/(slots-1)*(m.x1-m.x0);}
  function drawLine(ctx,pts,color,width){ctx.beginPath();let started=false;for(const q of pts){if(!q||!Number.isFinite(q.x)||!Number.isFinite(q.y)){started=false;continue;}if(!started){ctx.moveTo(q.x,q.y);started=true;}else ctx.lineTo(q.x,q.y);}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function draw(ctx,padL,padR,top,h,w){
    if(!state.on)return;const m=panelMetrics(padL,padR,top,h,w),win=oscWindow(),view=win.candles||[],S=chartSeries();ctx.save();ctx.fillStyle="#020806";ctx.fillRect(0,top,w,h);ctx.strokeStyle="rgba(150,180,168,.18)";ctx.beginPath();ctx.moveTo(0,top+.5);ctx.lineTo(w,top+.5);ctx.stroke();ctx.fillStyle="rgba(223,238,255,.86)";ctx.font="850 9px system-ui";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText("ARION ZONE PROFILE · "+effectiveTF(),m.x0+16,m.y0+11);
    const rows=[];let maxV=1;for(const c of view){const r=S.byTime.get(Number(c.time));rows.push(r||null);if(r){maxV=Math.max(maxV,r.vol,r.ma||0,(r.ma||0)*state.mult[4]);}}
    ctx.strokeStyle="rgba(122,155,145,.09)";ctx.lineWidth=1;for(let i=1;i<=3;i++){const yy=m.y0+(m.y1-m.y0)*i/4;ctx.beginPath();ctx.moveTo(m.x0,yy);ctx.lineTo(m.x1,yy);ctx.stroke();}
    ctx.save();ctx.beginPath();ctx.rect(m.x0,m.y0,m.x1-m.x0,m.y1-m.y0);ctx.clip();const bw=Math.max(2,Math.min(11,(m.x1-m.x0)/Math.max(1,win.totalSlots||view.length||80)*.72));
    for(let i=0;i<view.length;i++){const r=rows[i];if(!r)continue;const x=xFor(i,m,win),hh=r.vol/maxV*(m.y1-m.y0),col=state.colorVolume&&qualified(r.level)?state.levelColors[r.level-1]:state.neutralColor;ctx.fillStyle=rgba(col,state.colorVolume&&qualified(r.level)?.86:.28);ctx.fillRect(x-bw/2,m.y1-hh,bw,hh);}
    const levelLines=[];for(let n=1;n<=5;n++){const pts=[];for(let i=0;i<view.length;i++){const r=rows[i];pts.push(r&&r.ma!=null?{x:xFor(i,m,win),y:m.y1-(r.ma*state.mult[n-1]/maxV)*(m.y1-m.y0)}:null);}drawLine(ctx,pts,rgba(state.levelColors[n-1],.72),1);levelLines.push(pts);}
    if(state.showMA){const pts=[];for(let i=0;i<view.length;i++){const r=rows[i];pts.push(r&&r.ma!=null?{x:xFor(i,m,win),y:m.y1-(r.ma/maxV)*(m.y1-m.y0)}:null);}drawLine(ctx,pts,rgba(state.maColor,.95),1.5);}
    ctx.restore();ctx.fillStyle="rgba(165,170,168,.72)";ctx.font="9px system-ui";ctx.textAlign="left";ctx.fillText(fmt(maxV),m.x1+m.labelGap,m.y0+3);ctx.fillText("0",m.x1+m.labelGap,m.y1);const last=rows.filter(Boolean).at(-1);ctx.textAlign="right";ctx.font = "800 9px system-ui";ctx.fillStyle=last&&qualified(last.level)?state.levelColors[last.level-1]:"rgba(150,170,165,.75)";ctx.fillText(last?("N"+last.level+" · "+fmt(last.vol)):(ZONE_CACHE.fetching?"LOADING":"NO DATA"),m.x1-7,m.y0+11);ctx.restore();
  }

  function updateRow(){const st=document.getElementById("dvlArionState");if(st){st.textContent=state.on?"ON":"OFF";st.classList.toggle("is-on",state.on);}}
  function insertRow(){const menu=document.getElementById("indicatorDropdown");if(!menu)return;let item=document.getElementById("dvlArionItem");if(!item){item=document.createElement("div");item.id="dvlArionItem";item.className="indicatorItem";item.innerHTML='<span class="indicatorFxMark">AR</span><span><b>ARION Zone Profile MTF</b><small>zonas · profile · volume MTF</small></span><i class="dvl-vt-state" id="dvlArionState">OFF</i>';const after=document.getElementById("dvlDeltaVolumeItem")||document.getElementById("dvlVolumeItem");if(after&&after.parentNode)after.parentNode.insertBefore(item,after.nextSibling);else menu.appendChild(item);}if(!item.dataset.bound){item.dataset.bound="1";item.querySelector("#dvlArionState").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setOn(!state.on);});item.addEventListener("click",e=>{e.stopPropagation();openPanel();});}updateRow();}

  function toggle(id,label,checked){return `<div class="dvl-vt-field"><label>${label}</label><label class="dvl-switch"><input id="${id}" type="checkbox" ${checked?"checked":""}><i></i><b></b></label></div>`;}
  function num(id,label,val,min,max,step){return `<div class="dvl-vt-field"><label>${label}</label><input id="${id}" class="dvl-vt-input" type="number" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;}
  function chips(key,items,current){return `<div class="dvl-arion-chips">${items.map(([v,l])=>`<button type="button" data-arion-set="${key}" data-value="${v}" class="${String(v)===String(current)?"is-on":""}">${l}</button>`).join("")}</div>`;}
  function colorButton(key,label,color){return `<div class="dvl-arion-color"><label>${label}</label><button type="button" data-arion-color="${key}"><span>${color}</span><i style="background:${color}"></i></button></div>`;}
  function ensurePanel(){if(panel&&document.contains(panel))return panel;panel=document.createElement("div");panel.id="dvlArionPanel";panel.className="dvl-vt-panel dvl-arion-panel";panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>ARION Zone Profile MTF</b><small>zonas de volume · profile · painel MTF</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-reset-icon" id="dvlArionReset" type="button" aria-label="Reset">↻</button><button class="dvl-vt-close" id="dvlArionClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlArionBody"></div>';document.body.appendChild(panel);panel.addEventListener("pointerdown",e=>e.stopPropagation(),true);panel.querySelector("#dvlArionClose").addEventListener("click",closePanel);panel.querySelector("#dvlArionReset").addEventListener("click",reset);return panel;}
  function openPanel(){ensurePanel();panel.classList.add("is-open");renderPanel();}
  function closePanel(){if(panel)panel.classList.remove("is-open");closePalette();}
  function renderPanel(){ensurePanel();const b=panel.querySelector("#dvlArionBody");const levelRows=Array.from({length:10},(_,i)=>`<div class="dvl-arion-level"><b>N${i+1}</b><input class="dvl-vt-input" data-arion-mult="${i}" type="number" min="0.01" max="100" step="0.1" value="${state.mult[i]}"><label class="dvl-switch"><input data-arion-enabled="${i}" type="checkbox" ${state.enabled[i]?"checked":""}><i></i><b></b></label><button type="button" class="dvl-arion-mini-color" data-arion-color="levelColors.${i}" style="--c:${state.levelColors[i]}"></button></div>`).join("");const anchorControls=`<label class="dvl-arion-label">Âncora do Profile</label>${chips("profileAnchor",[["right","Preço atual"],["h1","1H"],["h4","4H"],["daily","Dia"],["weekly","1 Semana"],["asia","Ásia"],["london","Londres"],["newyork","Nova York"],["overnight","Overnight"]],state.profileAnchor)}${state.profileAnchor!=="right"?`<label class="dvl-arion-label">Sessão usada no cálculo</label>${chips("profileSessionOffset",[[0,"Atual"],[1,"Anterior"]],state.profileSessionOffset)}`:""}`;
    b.innerHTML=`
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>1. Geral</span></div><div class="dvl-vt-grid">${toggle("dvlArionOn","Indicador",state.on)}${toggle("dvlArionFinancial","Volume financeiro",state.useFinancialVolume)}${toggle("dvlArionCandles","Colorir candles",state.colorCandles)}${toggle("dvlArionVolumeColor","Colorir volume",state.colorVolume)}</div><label class="dvl-arion-label">Seleção dos níveis</label>${chips("selectionMode",[["exact","Faixa exata"],["fromMin","A partir do menor ligado"]],state.selectionMode)}</div>
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>2. Timeframe</span></div><div class="dvl-vt-grid">${toggle("dvlArionCustomTF","Timeframe personalizado",state.useCustomTF)}</div>${chips("tf",TF_LIST.map(x=>[x,x]),state.tf)}</div>
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>3. Média de Volume</span></div><div class="dvl-vt-grid">${num("dvlArionMaPeriod","Período",state.maPeriod,1,1000,1)}${toggle("dvlArionShowMA","Mostrar média",state.showMA)}</div><label class="dvl-arion-label">Tipo</label>${chips("maType",[["SMA","SMA"],["EMA","EMA"],["RMA","RMA"],["WMA","WMA"]],state.maType)}</div>
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>4–5. Multiplicadores e níveis</span></div><div class="dvl-arion-levels">${levelRows}</div></div>
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>6. Zonas</span></div><div class="dvl-vt-grid">${toggle("dvlArionZones","Mostrar zonas",state.showZones)}${num("dvlArionZoneCount","Quantidade",state.zoneCount,10,350,1)}${num("dvlArionZoneTransp","Transparência",state.zoneTransparency,0,100,1)}</div><label class="dvl-arion-label">Faixa da zona</label>${chips("zoneType",[["whole","Vela inteira"],["body","Somente corpo"],["central","50% central"]],state.zoneType)}</div>
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>7. Zone Profile</span></div><div class="dvl-vt-grid">${toggle("dvlArionProfile","Mostrar Profile",state.showProfile)}${toggle("dvlArionWeight","Ponderar nível",state.weightLevel)}${toggle("dvlArionLimitProfile","Limitar perto do preço",state.limitProfilePrice)}${toggle("dvlArionPOC","Destacar POC",state.showPOC)}${num("dvlArionProfileRange","Alcance %",state.profileRangePct,1,100,1)}${num("dvlArionBins","Faixas de preço",state.profileBins,10,100,1)}${num("dvlArionWidth","Largura máxima",state.profileWidth,5,200,1)}${num("dvlArionDistance","Distância à frente",state.profileDistance,1,100,1)}${num("dvlArionProfileTransp","Transparência",state.profileTransparency,0,100,1)}</div>${anchorControls}</div>
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>8. Cores</span></div><div class="dvl-arion-colors">${colorButton("neutralColor","Neutra",state.neutralColor)}${colorButton("maColor","Média",state.maColor)}${colorButton("profileWeakColor","Profile fraco",state.profileWeakColor)}${colorButton("profileStrongColor","Profile forte",state.profileStrongColor)}${colorButton("pocColor","POC",state.pocColor)}${colorButton("regionStrongColor","Região forte",state.regionStrongColor)}</div></div>
      <div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>9. Regiões Fortes</span></div><div class="dvl-vt-grid">${toggle("dvlArionRegions","Projetar para esquerda",state.showRegions)}${toggle("dvlArionLimitRegions","Limitar perto do preço",state.limitRegionsPrice)}${num("dvlArionCandlesLeft","Projeção candles",state.candlesLeft,20,5000,1)}${num("dvlArionMaxDist","Distância máxima %",state.maxRegionDistancePct,1,100,1)}${num("dvlArionRegionTransp","Transparência",state.regionTransparency,0,100,1)}</div><label class="dvl-arion-label">Quantidade</label>${chips("regionCount",[[3,"3"],[5,"5"]],state.regionCount)}</div>`;
    bindPanel();
  }
  function bindPanel(){
    const map={dvlArionOn:["on","check"],dvlArionFinancial:["useFinancialVolume","check"],dvlArionCandles:["colorCandles","check"],dvlArionVolumeColor:["colorVolume","check"],dvlArionCustomTF:["useCustomTF","check"],dvlArionMaPeriod:["maPeriod","num"],dvlArionShowMA:["showMA","check"],dvlArionZones:["showZones","check"],dvlArionZoneCount:["zoneCount","num"],dvlArionZoneTransp:["zoneTransparency","num"],dvlArionProfile:["showProfile","check"],dvlArionWeight:["weightLevel","check"],dvlArionLimitProfile:["limitProfilePrice","check"],dvlArionPOC:["showPOC","check"],dvlArionProfileRange:["profileRangePct","num"],dvlArionBins:["profileBins","num"],dvlArionWidth:["profileWidth","num"],dvlArionDistance:["profileDistance","num"],dvlArionProfileTransp:["profileTransparency","num"],dvlArionRegions:["showRegions","check"],dvlArionLimitRegions:["limitRegionsPrice","check"],dvlArionCandlesLeft:["candlesLeft","num"],dvlArionMaxDist:["maxRegionDistancePct","num"],dvlArionRegionTransp:["regionTransparency","num"]};
    Object.entries(map).forEach(([id,[key,type]])=>{const e=panel.querySelector("#"+id);if(!e)return;e.addEventListener("change",()=>{if(key==="on"){setOn(e.checked);e.checked=state.on;return;}state[key]=type==="check"?e.checked:+e.value;save();if(key==="useCustomTF"&&state.useCustomTF)ensureZoneData(true);});});
    panel.querySelectorAll("[data-arion-set]").forEach(e=>e.addEventListener("click",()=>{const k=e.dataset.arionSet,v=e.dataset.value;state[k]=(k==="regionCount"||k==="profileSessionOffset")?+v:v;save();if(k==="tf"&&state.useCustomTF)ensureZoneData(true);renderPanel();}));
    panel.querySelectorAll("[data-arion-mult]").forEach(e=>e.addEventListener("change",()=>{state.mult[+e.dataset.arionMult]=+e.value;save();}));
    panel.querySelectorAll("[data-arion-enabled]").forEach(e=>e.addEventListener("change",()=>{state.enabled[+e.dataset.arionEnabled]=e.checked;save();}));
    panel.querySelectorAll("[data-arion-color]").forEach(e=>e.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();openPalette(e.dataset.arionColor,e);}));
  }
  function ensurePalette(){if(palette)return palette;palette=document.createElement("div");palette.className="dvl-vol-palette";palette.id="dvlArionPalette";palette.innerHTML='<div class="dvl-vol-palette-grid">'+PALETTE.map(c=>`<button type="button" class="dvl-vol-swatch" data-color="${c}" style="background:${c}"></button>`).join("")+'</div>';document.body.appendChild(palette);palette.addEventListener("pointerdown",e=>e.stopPropagation(),true);palette.addEventListener("click",e=>{const sw=e.target.closest("[data-color]");if(!sw||!paletteTarget)return;setColor(paletteTarget,sw.dataset.color);closePalette();renderPanel();});return palette;}
  function setColor(key,color){if(key.startsWith("levelColors.")){state.levelColors[+key.split(".")[1]]=color;}else state[key]=color;save();}
  function openPalette(target,anchor){ensurePalette();paletteTarget=target;const r=anchor.getBoundingClientRect(),pw=154;palette.style.left=Math.max(5,Math.min(innerWidth-pw-5,r.left))+"px";palette.style.top=Math.min(innerHeight-180,r.bottom+5)+"px";palette.classList.add("is-open");}
  function closePalette(){if(palette)palette.classList.remove("is-open");paletteTarget=null;}

  function boot(){insertRow();updateRow();if(state.on&&state.useCustomTF)ensureZoneData(false);setInterval(()=>{if(state.on&&state.useCustomTF&&!replayActive())ensureZoneData(false);},45000);document.addEventListener("pointerdown",e=>{if(palette&&!e.target.closest("#dvlArionPalette")&&!e.target.closest("[data-arion-color]"))closePalette();},true);safeDraw();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();

  window.DVLArionZoneProfile={version:"1.2",on,setOn,draw,drawOverlay,open:openPanel,openPanel,close:closePanel,reset,refresh:()=>ensureZoneData(true),fitToCurrent:()=>{chartCalcCache=null;zoneCalcCache=null;safeDraw();},candleColorFor,get state(){return clone(state);},getAnalysis:zoneAnalysis};
  window.DVLArionZoneProfileDraw=drawOverlay;
})();
