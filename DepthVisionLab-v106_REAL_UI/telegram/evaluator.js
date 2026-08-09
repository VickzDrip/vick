"use strict";
/* DVL Telegram Alerts V2 - server-side evaluator.
   Evaluates every Alerts Hub source while the browser is closed. Crosses use
   closed candles; Liquidity Bands keeps its intrabar grab semantics. */

const _repo = require("./repo");
const _messages = require("./messages");

const LOOP_MS = 5000;
const KLINE_TTL = 4500;
const DEPTH_TTL = 4000;
const BINANCE_KLINES = "https://api.binance.com/api/v3/klines";
const BINANCE_DEPTH = "https://api.binance.com/api/v3/depth";
const SOURCES = new Set(["price", "smartdelta", "exr", "liqbands", "ma", "vp", "cross"]);
const TITLES = { price:"Preco", smartdelta:"Smart Delta", exr:"RSI Exhaustion", liqbands:"Liquidity Bands", ma:"Medias Moveis", vp:"Volume Profile", cross:"Cruzamento" };

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function finite(v, d) { v = Number(v); return Number.isFinite(v) ? v : d; }
function fmt(p) { p = Number(p); if (!Number.isFinite(p)) return "?"; return p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 2 }) : p >= 1 ? p.toFixed(2) : p.toPrecision(5); }
function short(s) { return String(s || "").replace(/USDT$/, ""); }
function normTf(tf) { tf = String(tf || "1m"); return tf === "1D" ? "1d" : tf; }
function tfMs(tf) {
  const m = String(tf || "").match(/^(\d+)([smhdw])$/i);
  if (!m) return 60000;
  return Number(m[1]) * ({ s:1000, m:60000, h:3600000, d:86400000, w:604800000 })[m[2].toLowerCase()];
}
function tfMinutes(tf) { return Math.max(1, Math.round(tfMs(tf) / 60000)); }
function serverEvaluable(rule) { return !!(rule && SOURCES.has(rule.source)); }

async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs || 10000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) { return null; }
  finally { clearTimeout(to); }
}
async function defaultFetchKlines(symbol, interval, limit) {
  return fetchJson(BINANCE_KLINES + "?symbol=" + encodeURIComponent(symbol) + "&interval=" + encodeURIComponent(normTf(interval)) + "&limit=" + Math.min(1000, limit || 500));
}
async function defaultFetchDepth(symbol) {
  return fetchJson(BINANCE_DEPTH + "?symbol=" + encodeURIComponent(symbol) + "&limit=500", 8000);
}

function normalizeRows(raw, interval, at) {
  if (!Array.isArray(raw)) return [];
  const iv = tfMs(interval), now = finite(at, Date.now());
  return raw.map(x => {
    if (Array.isArray(x)) {
      return { time:+x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4], volume:+x[5]||0,
        closeTime:+x[6]||(+x[0]+iv-1), buyVolume:+x[9]||0, isClosed:(+x[6]||(+x[0]+iv-1)) < now };
    }
    const time = finite(x.openTime, finite(x.time, finite(x.t, 0)));
    const volume = finite(x.volume, finite(x.v, 0));
    const buyVolume = finite(x.buyVolume, finite(x.buy, 0));
    return { time, open:finite(x.open, x.o), high:finite(x.high, x.h), low:finite(x.low, x.l), close:finite(x.close, x.c),
      volume, buyVolume, closeTime:finite(x.closeTime, time + iv - 1), isClosed:x.isClosed === true || finite(x.closeTime, time + iv - 1) < now };
  }).filter(x => Number.isFinite(x.time) && Number.isFinite(x.close)).sort((a,b) => a.time-b.time);
}
function closedRows(rows, at) { const now = finite(at, Date.now()); return (rows || []).filter(x => x.isClosed || x.closeTime < now); }

function calcSMA(cs,p){ const n=cs.length,r=new Array(n).fill(null);let s=0;for(let i=0;i<n;i++){s+=cs[i].close;if(i>=p)s-=cs[i-p].close;if(i>=p-1)r[i]=s/p;}return r; }
function calcEMA(cs,p){ const n=cs.length,r=new Array(n).fill(null),k=2/(p+1);let e=0,on=false;for(let i=0;i<n;i++){if(!on){if(i<p-1)continue;let s=0;for(let j=i-p+1;j<=i;j++)s+=cs[j].close;e=s/p;on=true;}else e=cs[i].close*k+e*(1-k);r[i]=e;}return r; }
function calcWMA(cs,p){ const n=cs.length,r=new Array(n).fill(null),d=p*(p+1)/2;for(let i=p-1;i<n;i++){let s=0;for(let j=0;j<p;j++)s+=(p-j)*cs[i-j].close;r[i]=s/d;}return r; }
function calcVWMA(cs,p){ const n=cs.length,r=new Array(n).fill(null);for(let i=p-1;i<n;i++){let pv=0,v=0;for(let j=0;j<p;j++){const z=cs[i-j].volume||1;pv+=cs[i-j].close*z;v+=z;}r[i]=v?pv/v:cs[i].close;}return r; }
function calcRMA(cs,p){ const n=cs.length,r=new Array(n).fill(null),a=1/p;let e=0,on=false;for(let i=0;i<n;i++){if(!on){if(i<p-1)continue;let s=0;for(let j=i-p+1;j<=i;j++)s+=cs[j].close;e=s/p;on=true;}else e=cs[i].close*a+e*(1-a);r[i]=e;}return r; }
function synthRows(values){ return values.map(v => ({close:v == null ? 0 : v, volume:1})); }
function calcHMA(cs,p){const h=Math.max(2,Math.round(Math.sqrt(p))),h2=Math.max(2,Math.round(p/2)),w1=calcWMA(cs,p),w2=calcWMA(cs,h2),r=calcWMA(synthRows(w1.map((v,i)=>v!=null&&w2[i]!=null?2*w2[i]-v:null)),h);for(let i=0;i<r.length;i++)if(w1[i]==null||w2[i]==null)r[i]=null;return r;}
function calcDEMA(cs,p){const e1=calcEMA(cs,p),e2=calcEMA(synthRows(e1),p);return e1.map((v,i)=>v!=null&&e2[i]!=null?2*v-e2[i]:null);}
function calcTEMA(cs,p){const e1=calcEMA(cs,p),e2=calcEMA(synthRows(e1),p),e3=calcEMA(synthRows(e2),p);return e1.map((v,i)=>v!=null&&e2[i]!=null&&e3[i]!=null?3*v-3*e2[i]+e3[i]:null);}
function calcLSMA(cs,p){const n=cs.length,r=new Array(n).fill(null);for(let i=p-1;i<n;i++){let sx=0,sy=0,sxy=0,sx2=0;for(let j=0;j<p;j++){const y=cs[i-p+1+j].close;sx+=j;sy+=y;sxy+=j*y;sx2+=j*j;}const d=p*sx2-sx*sx;if(!d)r[i]=sy/p;else{const sl=(p*sxy-sx*sy)/d,ic=(sy-sl*sx)/p;r[i]=ic+sl*(p-1);}}return r;}
function calcKAMA(cs,p){const n=cs.length,r=new Array(n).fill(null),fast=2/3,slow=2/31;let k=0;for(let i=0;i<n;i++){if(i<p)continue;if(i===p)k=cs[i-1].close;const ch=Math.abs(cs[i].close-cs[i-p].close);let vol=0;for(let j=1;j<=p;j++)vol+=Math.abs(cs[i-j+1].close-cs[i-j].close);const er=vol?ch/vol:0,sc=Math.pow(er*(fast-slow)+slow,2);k+=sc*(cs[i].close-k);r[i]=k;}return r;}
function calcMA(cs,p,type){p=Math.max(1,Math.round(p||20));switch(type){case"EMA":return calcEMA(cs,p);case"WMA":return calcWMA(cs,p);case"VWMA":return calcVWMA(cs,p);case"RMA":return calcRMA(cs,p);case"HMA":return calcHMA(cs,p);case"DEMA":return calcDEMA(cs,p);case"TEMA":return calcTEMA(cs,p);case"LSMA":return calcLSMA(cs,p);case"KAMA":return calcKAMA(cs,p);default:return calcSMA(cs,p);}}

function sessionId(t, mode){const d=new Date(t);if(mode==="weekly"){const day=(d.getUTCDay()+6)%7;return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day);}if(mode==="monthly")return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());}
function calcVwap(cs,cfg){const vw=new Array(cs.length).fill(null),sd=new Array(cs.length).fill(null);let cv=0,pv=0,p2=0,id=null;for(let i=0;i<cs.length;i++){const nid=sessionId(cs[i].time,(cfg&&cfg.anchor)||"daily");if(nid!==id){cv=0;pv=0;p2=0;id=nid;}const tp=(cs[i].high+cs[i].low+cs[i].close)/3,v=cs[i].volume||0;cv+=v;pv+=tp*v;p2+=tp*tp*v;if(cv){vw[i]=pv/cv;sd[i]=Math.sqrt(Math.max(0,p2/cv-vw[i]*vw[i]));}}return{vwap:vw,sd};}
function maSpec(ctx, idx){return ((ctx&&ctx.ma)||[]).find(m=>Number(m.idx)===Number(idx))||null;}
function lineSeries(id, rows, ctx){
  if(id==="price")return rows.map(x=>x.close);
  if(String(id).startsWith("ma:")){const m=maSpec(ctx,String(id).slice(3));return m?calcMA(rows,m.period,m.type):null;}
  if(String(id).startsWith("vwap")){const v=calcVwap(rows,(ctx&&ctx.vwap)||{}),m1=finite(ctx&&ctx.vwap&&ctx.vwap.mult1,1),m2=finite(ctx&&ctx.vwap&&ctx.vwap.mult2,2);return v.vwap.map((x,i)=>x==null?null:id==="vwap"?x:id==="vwap_u1"?x+m1*v.sd[i]:id==="vwap_l1"?x-m1*v.sd[i]:id==="vwap_u2"?x+m2*v.sd[i]:x-m2*v.sd[i]);}
  if(String(id).startsWith("vp_")){const k=String(id).slice(3),v=ctx&&ctx.vp&&ctx.vp.levels&&ctx.vp.levels[k];return Number.isFinite(Number(v))?rows.map(()=>Number(v)):null;}
  return null;
}

function rsiSeries(rows,p){const r=new Array(rows.length).fill(50);for(let i=p;i<rows.length;i++){let g=0,l=0;for(let j=i-p+1;j<=i;j++){const d=rows[j].close-rows[j-1].close;if(d>=0)g+=d;else l-=d;}const ag=g/p,al=l/p;r[i]=al<=1e-9?(ag>0?100:50):100-100/(1+ag/al);}return r;}
function resample(rows,mins){const ms=mins*60000,map=new Map();for(const c of rows){const t=Math.floor(c.time/ms)*ms;let b=map.get(t);if(!b){b={time:t,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume};map.set(t,b);}else{b.high=Math.max(b.high,c.high);b.low=Math.min(b.low,c.low);b.close=c.close;b.volume+=c.volume;}}return Array.from(map.values()).sort((a,b)=>a.time-b.time);}
function volumeRatio(cs,i,len){let s=0,n=0;for(let j=Math.max(0,i-len+1);j<=i;j++){s+=cs[j].volume||0;n++;}return (cs[i].volume||0)/Math.max(n?s/n:1,1e-9);}
function exPressure(cs,i,dir,cfg){if(i<7)return 0;const c=cs[i],range=c.high-c.low;if(range<=0)return 0;const prior=cs[i-5]||cs[0],vr=volumeRatio(cs,i,cfg.mtfVolMaLen||20),spike=Math.max(0,Math.min(1,(vr-1)/(Math.max(1.05,cfg.mtfVolSpikeAt||2.5)-1)));if(dir==="up"){const wick=(c.high-Math.max(c.open,c.close))/range,weak=1-(c.close-c.low)/range;return clamp((c.close>prior.close?1:0)*(wick*.5+weak*.5)*(.15+.85*spike),0,1);}const wick=(Math.min(c.open,c.close)-c.low)/range,strong=(c.close-c.low)/range;return clamp((c.close<prior.close?1:0)*(wick*.5+strong*.5)*(.15+.85*spike),0,1);}
function idxAt(a,t){let lo=0,hi=a.length-1,r=-1;while(lo<=hi){const m=(lo+hi)>>1;if(a[m].time<=t){r=m;lo=m+1;}else hi=m-1;}return r;}
function calcExr(rows,one,cfg,tf){
  cfg=cfg||{};const base=rsiSeries(rows,Math.max(2,Math.round(cfg.mtfRsiLen||14))),cur=tfMinutes(tf),lad=[1,2,3,4,5,10,15,30,60].filter(x=>x<=cur).slice(-5),mult=cfg.arionMult||[1,2,3,4,5,6,7,8,9,10],enabled=cfg.arionSpikeLevels||new Array(10).fill(true);
  const data=lad.map(x=>{const cs=x===cur?rows:resample(one||[],x),up=[],dn=[],lev=[];for(let i=0;i<cs.length;i++){up[i]=exPressure(cs,i,"up",cfg);dn[i]=exPressure(cs,i,"down",cfg);const vr=volumeRatio(cs,i,cfg.mtfVolMaLen||20);let l=0;for(let j=0;j<10;j++)if(vr>=finite(mult[j],j+1))l=j+1;lev[i]=l;}return{cs,up,dn,lev};});
  return rows.map((c,i)=>{let us=0,ds=0,ws=0;for(let k=0;k<data.length;k++){const d=data[k],ix=idxAt(d.cs,c.time);if(ix<0)continue;const w=data.length-k,l=d.lev[ix],ok=!cfg.arionSpikeLevelWeight||(l>0&&enabled[l-1]!==false),lw=cfg.arionSpikeLevelWeight?l:1;us+=(ok?d.up[ix]*lw:0)*w;ds+=(ok?d.dn[ix]*lw:0)*w;ws+=w;}const raw=ws?(us-ds)/ws:0,cap=cfg.proExtendedScale===false?(cfg.arionSpikeLevelWeight?3:1):10,ext=cfg.proExtendedScale===false?0:Math.max(25,finite(cfg.proExtension,100));return clamp(base[i]+clamp(raw,-cap,cap)*Math.max(0,finite(cfg.mtfPush,18)),-ext,100+ext);});
}

function smartFeature(cs,i){const c=cs[i],o=c.open,h=c.high,l=c.low,cl=c.close,vol=c.volume,range=Math.max(h-l,1e-9),body=Math.abs(cl-o),bodyPct=body/range,upWick=(h-Math.max(o,cl))/range,dnWick=(Math.min(o,cl)-l)/range,closePos=(cl-l)/range,dir=cl>o?1:(cl<o?-1:0);let n=Math.max(1,Math.min(20,i)),s=0;for(let k=i-n;k<i;k++)s+=cs[k]?cs[k].volume:0;const avgVol=n?s/n:vol||1,volSpike=vol/Math.max(avgVol,1e-9),prev=cs[i-1]||c;let atr=0,an=0;for(let a=Math.max(1,i-13);a<=i;a++){const pc=cs[a-1]||cs[a];atr+=Math.max(cs[a].high-cs[a].low,Math.abs(cs[a].high-pc.close),Math.abs(cs[a].low-pc.close));an++;}atr=an?atr/an:range;const velocity=Math.abs(cl-prev.close)/Math.max(atr,1e-9);let hi=-Infinity,lo=Infinity;for(let f=Math.max(0,i-6);f<i;f++){hi=Math.max(hi,cs[f].high);lo=Math.min(lo,cs[f].low);}const flatPrior=clamp(1-((hi-lo)/Math.max(atr*3,1e-9)),0,1),postFlatSpike=clamp((volSpike-1)/2,0,1)*flatPrior;let deltaRatio;if(Number.isFinite(c.buyVolume)&&vol>0)deltaRatio=clamp((2*c.buyVolume-vol)/vol,-1,1);else deltaRatio=clamp((closePos-.5)*2+dir*.2,-1,1);return{o,h,l,c:cl,vol,range,bodyPct,upWick,dnWick,closePos,dir,volSpike,velocity,postFlatSpike,deltaRatio,rawDeltaVol:deltaRatio*vol,absorption:clamp(volSpike/2,0,1)*clamp(1-bodyPct,0,1),rejection:Math.max(upWick,dnWick)*clamp(volSpike/1.5,0,1)};}
function smartScore(f,prevVol,prevVel,cfg){const sign=f.deltaRatio>0?1:(f.deltaRatio<0?-1:f.dir),cv=clamp((f.volSpike-1)/2,0,1)*100,cb=clamp(f.bodyPct/.7,0,1)*100,cc=(sign>=0?f.closePos:1-f.closePos)*100,cd=clamp(Math.abs(f.deltaRatio)/.6,0,1)*100,ca=clamp(f.absorption,0,1)*100,cs=clamp(f.postFlatSpike+clamp((f.volSpike-1)/2,0,1)*.5,0,1)*100,cw=100-clamp((sign>=0?f.upWick:f.dnWick)/.5,0,1)*100;let confidence=clamp(cv*.20+cb*.16+cc*.16+cd*.18+ca*.10+cs*.10+cw*.10,0,100);const mag=clamp((cb*.3+cc*.25+cd*.3+cv*.15)/100,0,1),delta=Math.round(sign*mag*100),conflict=(Math.sign(f.deltaRatio||f.dir)!==Math.sign(f.c-f.o)&&f.bodyPct>.2)||(f.upWick>.33&&f.dnWick>.33);let continuation=(clamp((f.volSpike-1)/2,0,1)*100*.28+clamp(Math.abs(f.deltaRatio)/.6,0,1)*100*.24+clamp(f.bodyPct/.7,0,1)*100*.20+clamp(f.postFlatSpike,0,1)*100*.14+clamp(f.absorption,0,1)*100*.14)*(conflict?.7:1);const vd=prevVol?clamp((prevVol-f.vol)/prevVol,0,1):0,vel=prevVel?clamp((prevVel-f.velocity)/prevVel,0,1):0,exhaustion=clamp(Math.max(f.upWick,f.dnWick)/.5,0,1)*34+vd*24+f.rejection*24+vel*18;confidence=Math.round(clamp(confidence,0,100));continuation=Math.round(clamp(continuation,0,100));const th=finite(cfg&&cfg.thNeutral,18),cls=conflict?"indef":delta>=th?"buy":delta<=-th?"sell":"neutral";return{delta,confidence,continuation,exhaustion:Math.round(clamp(exhaustion,0,100)),cls};}
function calcSmart(rows,cfg){const out=new Array(rows.length).fill(null);let pv=0,pvel=0;for(let i=1;i<rows.length;i++){const f=smartFeature(rows,i);out[i]=smartScore(f,pv,pvel,cfg||{});pv=f.vol;pvel=f.velocity;}return out;}

function dominantWall(levels,mid,cfg,side){const range=mid*finite(cfg.rangePct,.6)/100,valid=(levels||[]).map(x=>({p:+x[0],n:+x[0]*+x[1]})).filter(x=>Number.isFinite(x.p)&&Number.isFinite(x.n)&&(side>0?x.p>mid&&x.p<=mid+range:x.p<mid&&x.p>=mid-range));if(!valid.length)return null;let best=valid[0],sum=0;for(const x of valid){sum+=x.n;if(x.n>best.n)best=x;}const avg=sum/valid.length;if(best.n<finite(cfg.minNotional,50000)||best.n<finite(cfg.wallStrength,2.2)*avg)return null;return best;}

function makeEvaluator(opts) {
  opts=opts||{};const repo=opts.repo||_repo,messages=opts.messages||_messages,fetchKlines=opts.fetchKlines||defaultFetchKlines,fetchDepth=opts.fetchDepth||defaultFetchDepth,now=opts.now||Date.now,klineTtl=opts.klineTtl==null?KLINE_TTL:opts.klineTtl,depthTtl=opts.depthTtl==null?DEPTH_TTL:opts.depthTtl;
  const kcache=new Map(),dcache=new Map(),priceHist=new Map(),lbMem=new Map();let timer=null,running=false;

  async function getRows(symbol,tf,limit){tf=normTf(tf);const key=symbol+"|"+tf,c=kcache.get(key),need=Math.min(1000,Math.max(20,limit||500));if(c&&now()-c.t<klineTtl&&(c.requested>=need||c.rows.length>=need))return c.rows;let raw=null;if((tf==="15s"||tf==="30s")&&opts.subsecond){try{const e=opts.subsecond.getEngine(symbol);if(e)raw=e.getSnapshot(tf,0,now(),Math.min(5000,need));}catch(_){}}else raw=await fetchKlines(symbol,tf,need);const rows=normalizeRows(raw,tf,now());if(rows.length)kcache.set(key,{t:now(),rows,requested:need});return rows;}
  async function getDepth(symbol){const c=dcache.get(symbol);if(c&&now()-c.t<depthTtl)return c.data;const d=await fetchDepth(symbol);if(d&&Array.isArray(d.bids)&&Array.isArray(d.asks))dcache.set(symbol,{t:now(),data:d});return d;}
  function state(uid,r){return repo.getEvalState(uid,r.id)||{};}
  function historyWindow(rows,ctx){const n=Math.max(50,Math.min(1000,Math.round(finite(ctx&&ctx.historyCount,620))));return rows.length>n?rows.slice(-n):rows;}
  function patch(uid,r,p,persist){return repo.setEvalState(uid,r.id,p,persist);}
  function canFire(uid,r,dir,bar){const st=state(uid,r),mode=r.rearm||"time";if(mode==="bar"||mode==="bar_dir"){if(bar!=null&&st.lastBar===bar){if(mode==="bar"||(dir||"")===(st.lastDir||""))return false;}return true;}return !(st.lastFired&&(now()-st.lastFired)<((r.cooldownSec||0)*1000));}
  function fire(it,ev,suppress){if(!canFire(it.userId,it.rule,ev.dir,ev.barTime))return false;patch(it.userId,it.rule,{lastFired:now(),lastBar:ev.barTime,lastDir:ev.dir||""});if(suppress)return false;const title=TITLES[it.rule.source]||it.rule.source,text=messages.alertText({symbol:ev.symbol,timeframe:ev.tf,source:it.rule.source,title,message:ev.message,price:ev.price});const triggerId="srv2:"+it.userId+":"+it.rule.id+":"+(ev.barTime||now())+":"+(ev.dir||"");repo.enqueue({triggerId,alertId:it.rule.id,dvlUserId:it.userId,text,destinationId:it.conn.telegram_chat_id});repo.addHistory(it.userId,{msg:ev.message,ts:now(),tf:ev.tf,sym:ev.symbol,source:it.rule.source,dir:ev.dir});return true;}
  function readyClosed(it,rows){const c=closedRows(rows,now());if(c.length<2)return null;const bar=c[c.length-1].time,st=state(it.userId,it.rule);if(st.lastEvalBar==null){patch(it.userId,it.rule,{lastEvalBar:bar},false);return null;}if(st.lastEvalBar===bar)return null;return{rows:c,bar,prev:c.length-2,cur:c.length-1};}
  function closeDone(it,bar){patch(it.userId,it.rule,{lastEvalBar:bar},false);}
  function crossed(a0,b0,a1,b1){const p=a0-b0,c=a1-b1;if(p<0&&c>=0)return"up";if(p>0&&c<=0)return"down";return null;}
  function dirAllowed(r,d){return !r.dir||r.dir==="any"||r.dir===d;}

  async function evalClosedLines(it,suppress){const r=it.rule,ctx=it.context||{},symbol=r.symbol||ctx.chartSymbol||"BTCUSDT",tf=normTf(r.evalTf||r.tf||ctx.chartTf||"1m"),ma=r.source==="ma"?maSpec(ctx,r.params&&r.params.maId):null,limit=Math.min(1000,Math.max(300,ma?ma.period*3:0));const all=await getRows(symbol,tf,limit),x=readyClosed(it,all);if(!x)return;let a,b,labelA,labelB;
    const view=historyWindow(x.rows,ctx),cur=view.length-1,prev=view.length-2;if(r.source==="price"){if(r.signal==="pct_fast"){closeDone(it,x.bar);return;}a=view.map(z=>z.close);b=view.map(()=>Number(r.level));labelA="Preco";labelB=fmt(r.level);}else if(r.source==="ma"){if(!ma){closeDone(it,x.bar);return;}a=view.map(z=>z.close);b=calcMA(view,ma.period,ma.type);labelA="Preco";labelB=ma.type+" "+ma.period;}else if(r.source==="cross"){a=lineSeries(r.params&&r.params.lhs,view,ctx);b=lineSeries(r.params&&r.params.rhs,view,ctx);labelA=(r.params&&r.params.lhs)||"A";labelB=(r.params&&r.params.rhs)||"B";}if(a&&b&&Number.isFinite(a[prev])&&Number.isFinite(b[prev])&&Number.isFinite(a[cur])&&Number.isFinite(b[cur])){const d=crossed(a[prev],b[prev],a[cur],b[cur]);let allowed=dirAllowed(r,d);if(r.source==="price"&&r.signal==="cross_up")allowed=d==="up";if(r.source==="price"&&r.signal==="cross_down")allowed=d==="down";if(d&&allowed)fire(it,{dir:d,price:view[cur].close,symbol,tf,barTime:x.bar,message:labelA+" cruzou "+(d==="up"?"ACIMA":"ABAIXO")+" de "+labelB},suppress);}closeDone(it,x.bar);}

  function pushPrice(symbol,p){let h=priceHist.get(symbol);if(!h){h=[];priceHist.set(symbol,h);}const t=now(),last=h[h.length-1];if(last&&last.t===t)last.p=p;else h.push({t,p});while(h.length&&h[0].t<t-300000)h.shift();return h;}
  async function evalPct(it,suppress){const r=it.rule,ctx=it.context||{},symbol=r.symbol||ctx.chartSymbol||"BTCUSDT",tf=normTf(r.evalTf||r.tf||ctx.chartTf||"1m"),rows=await getRows(symbol,"1m",20);if(!rows.length)return;const p=rows[rows.length-1].close,h=pushPrice(symbol,p),want=now()-60000;let ref=null;for(const z of h){if(z.t<=want)ref=z.p;else break;}if(ref==null&&h.length&&h[0].t<=now()-45000)ref=h[0].p;if(ref&&ref>0){const ch=(p-ref)/ref*100,d=ch>=0?"up":"down";if(Math.abs(ch)>=Math.abs(Number(r.level)||0)&&dirAllowed(r,d))fire(it,{dir:d,price:p,symbol,tf,barTime:rows[rows.length-1].time,message:"Movimento rapido "+(ch>=0?"+":"")+ch.toFixed(2)+"% em ~1min ("+short(symbol)+")"},suppress);}}

  async function evalVp(it,suppress){const r=it.rule,ctx=it.context||{},symbol=r.symbol||ctx.chartSymbol||"BTCUSDT",tf=normTf(r.evalTf||r.tf||ctx.chartTf||"1m"),rows=await getRows(symbol,tf,300),x=readyClosed(it,rows);if(!x)return;const lv=(ctx.vp&&ctx.vp.levels)||{},which=(r.params&&r.params.level)||"all",keys=which==="all"?["poc","vah","val"]:[which],c=x.rows[x.cur],p=x.rows[x.prev].close;for(const k of keys){const level=Number(lv[k]);if(!Number.isFinite(level))continue;const touched=c.low<=level&&c.high>=level;if(touched&&((p<level&&c.high>=level)||(p>level&&c.low<=level)||p===level)){const d=c.close>=level?"up":"down";fire(it,{dir:d,price:c.close,symbol,tf,barTime:x.bar,message:"Preco bateu no "+k.toUpperCase()+" do VP ("+fmt(level)+")"},suppress);break;}}closeDone(it,x.bar);}

  async function evalSmart(it,suppress){const r=it.rule,ctx=it.context||{},cfg=ctx.smartdelta||{},symbol=r.symbol||ctx.chartSymbol||"BTCUSDT",tf=normTf(r.evalTf||r.tf||ctx.chartTf||"1m"),rows=await getRows(symbol,tf,Math.max(180,finite(ctx.historyCount,620))),x=readyClosed(it,rows);if(!x)return;const view=historyWindow(x.rows,ctx),cur=view.length-1,s=calcSmart(view,cfg)[cur];if(s){const strong=Math.abs(s.delta)>=finite(cfg.alertDelta,60)&&s.confidence>=finite(cfg.alertConf,70),buy=strong&&s.cls==="buy",sell=strong&&s.cls==="sell",confl=strong&&s.continuation>=Math.min(90,finite(cfg.alertConf,70));let ok=r.signal==="signal_buy"?buy:r.signal==="signal_sell"?sell:r.signal==="confluence"?confl:false;if(ok){const d=s.cls==="sell"?"down":"up",kind=r.signal==="confluence"?"Confluencia forte":"Smart Delta "+(d==="up"?"COMPRA":"VENDA")+" forte";fire(it,{dir:d,price:view[cur].close,symbol,tf,barTime:x.bar,message:kind+" · Delta "+(s.delta>0?"+":"")+s.delta+" · Conf "+s.confidence+"% · Cont "+s.continuation+"%"},suppress);}}closeDone(it,x.bar);}

  async function evalExr(it,suppress){const r=it.rule,ctx=it.context||{},cfg=ctx.exr||{},symbol=r.symbol||ctx.chartSymbol||"BTCUSDT",tf=normTf(cfg.calculationTF&&cfg.calculationTF!=="Chart"?cfg.calculationTF:(r.evalTf||r.tf||ctx.chartTf||"1m")),rows=closedRows(await getRows(symbol,tf,900),now()),one=tf==="1m"?rows:closedRows(await getRows(symbol,"1m",1000),now());if(rows.length<2)return;const bar=rows[rows.length-1].time,st=state(it.userId,r);if(st.lastEvalBar===bar)return;const view=historyWindow(rows,ctx),cur=view.length-1,vals=calcExr(view,one,cfg,tf),v=vals[cur],upper=finite(cfg.upperZoneLevel,60),lower=finite(cfg.lowerZoneLevel,35),zone=v>=upper?1:v<=lower?-1:0;if(st.lastEvalBar==null){patch(it.userId,r,{exrZone:zone,lastEvalBar:bar},false);return;}const old=finite(st.exrZone,0);if(zone!==0&&zone!==old){const signal=zone>0?"exhaustion_up":"exhaustion_down";if(r.signal===signal||r.signal==="exhaustion_any"){const d=zone>0?"down":"up";fire(it,{dir:d,price:view[cur].close,symbol,tf,barTime:bar,message:zone>0?"RSI Exhaustion: exaustao de TOPO - possivel reversao":"RSI Exhaustion: exaustao de FUNDO - possivel reversao"},suppress);}}patch(it.userId,r,{exrZone:zone,lastEvalBar:bar},false);}

  async function evalLiquidity(it,suppress){const r=it.rule,ctx=it.context||{},cfg=ctx.liqbands||{},symbol=r.symbol||ctx.chartSymbol||"BTCUSDT",tf=normTf(r.evalTf||r.tf||ctx.chartTf||"1m"),rows=await getRows(symbol,tf,80);if(!rows.length)return;const c=rows[rows.length-1],depth=await getDepth(symbol);if(!depth)return;const key=symbol+"|"+finite(cfg.rangePct,.6)+"|"+finite(cfg.minNotional,50000)+"|"+finite(cfg.smoothBars,8),mem=lbMem.get(key)||{u:null,l:null},wu=dominantWall(depth.asks,c.close,cfg,1),wl=dominantWall(depth.bids,c.close,cfg,-1),a=finite(cfg.smoothBars,8)>0?2/(finite(cfg.smoothBars,8)+1):1;if(wu)mem.u=mem.u==null?wu.p:mem.u+a*(wu.p-mem.u);if(wl)mem.l=mem.l==null?wl.p:mem.l+a*(wl.p-mem.l);lbMem.set(key,mem);if(mem.u==null||mem.l==null)return;const up=c.high>=mem.u&&c.close<mem.u,dn=c.low<=mem.l&&c.close>mem.l,st=state(it.userId,r),fresh=st.lbBar!==c.time;if(st.lbReady){if(r.signal==="grab_up"&&up&&(fresh||!st.lbUp))fire(it,{dir:"down",price:c.close,symbol,tf,barTime:c.time,message:"Liquidity Bands: buscou liquidez em CIMA (ask) - possivel reversao"},suppress);if(r.signal==="grab_down"&&dn&&(fresh||!st.lbDown))fire(it,{dir:"up",price:c.close,symbol,tf,barTime:c.time,message:"Liquidity Bands: buscou liquidez em BAIXO (bid) - possivel reversao"},suppress);}patch(it.userId,r,{lbReady:true,lbBar:c.time,lbUp:up,lbDown:dn},false);}

  async function evalRule(it,suppress){const r=it.rule;if(r.source==="price"&&r.signal==="pct_fast")return evalPct(it,suppress);if(r.source==="price"||r.source==="ma"||r.source==="cross")return evalClosedLines(it,suppress);if(r.source==="vp")return evalVp(it,suppress);if(r.source==="smartdelta")return evalSmart(it,suppress);if(r.source==="exr")return evalExr(it,suppress);if(r.source==="liqbands")return evalLiquidity(it,suppress);}
  async function tick(){if(running)return;running=true;try{for(const it of repo.listEvalRules()){if(!serverEvaluable(it.rule))continue;try{await evalRule(it,repo.isClientActive(it.userId));}catch(e){if(opts.onError)opts.onError(e,it);}}}finally{running=false;}}
  return{tick,start(){if(!timer)timer=setInterval(tick,LOOP_MS);if(timer&&timer.unref)timer.unref();return this;},stop(){if(timer){clearInterval(timer);timer=null;}},health(){return{running,timer:!!timer,sources:Array.from(SOURCES),klineCaches:kcache.size,depthCaches:dcache.size};}};
}

module.exports={makeEvaluator,serverEvaluable,_pure:{normalizeRows,closedRows,calcMA,calcVwap,lineSeries,rsiSeries,resample,calcExr,calcSmart,dominantWall,tfMs}};
