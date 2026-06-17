# patch_628.py — Beta 0.628
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.627)
#
# DVL Flow Event Bubbles V2:
#  • Presets: Clean / Normal / Scanner (custom dropdown, no native select)
#  • Suspect mini-bubbles: 6 new suspect event types, smaller + transparent
#  • Custom stepper controls: no native <input type="number">
#  • Custom dropdown: no native <select>
#  • Panel background: rgba(2,12,24,.96) — more solid
#  • 2-layer rendering: strong events + suspect events
#  • Cache key updated to include new state fields
#
# VERSION: 0.627 → 0.628

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes  = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    fixes.append(label)
    return html.replace(old, new)

# ── 1. CSS: dvl-feb-panel background mais sólido ─────────────────────────────
html = rep(html,
    '.dvl-feb-panel{\n'
    '  width:min(390px,calc(100vw - 10px))!important;\n'
    '  max-height:min(80svh,700px)!important;\n'
    '}',

    '.dvl-feb-panel{\n'
    '  width:min(390px,calc(100vw - 10px))!important;\n'
    '  max-height:min(80svh,700px)!important;\n'
    '  background:rgba(2,12,24,.96)!important;\n'
    '}',

    'CSS: dvl-feb-panel background rgba(2,12,24,.96)'
)

# ── 2. CSS: stepper + dropdown + mode-bar (inserir após .dvl-feb-status-line.is-info) ──
html = rep(html,
    '.dvl-feb-status-line.is-info{ color:rgba(100,180,255,.7); }',

    '.dvl-feb-status-line.is-info{ color:rgba(100,180,255,.7); }\n'
    '.dvl-feb-step-wrap{ display:flex; align-items:center; gap:3px; width:100%; }\n'
    '.dvl-feb-step-btn{ background:rgba(24,168,255,.12)!important; border:1px solid rgba(24,168,255,.24)!important; color:rgba(180,210,255,.9)!important; border-radius:7px!important; width:26px!important; height:26px!important; font-size:17px!important; line-height:1!important; cursor:pointer; display:flex!important; align-items:center; justify-content:center; padding:0!important; flex-shrink:0; touch-action:manipulation; font-weight:400!important; }\n'
    '.dvl-feb-step-btn:active{ background:rgba(24,168,255,.32)!important; }\n'
    '.dvl-feb-step-val{ flex:1; text-align:center; font-size:12px; color:rgba(200,230,255,.9); font-variant-numeric:tabular-nums; min-width:0; }\n'
    '.dvl-drop-wrap{ position:relative; }\n'
    '.dvl-drop-btn{ width:100%; background:rgba(8,20,38,.9); border:1px solid rgba(94,135,178,.28); color:rgba(200,230,255,.9); border-radius:9px; padding:5px 10px; font-size:12px; cursor:pointer; text-align:left; display:flex; align-items:center; justify-content:space-between; gap:6px; touch-action:manipulation; }\n'
    '.dvl-drop-arr{ font-size:9px; opacity:.55; flex-shrink:0; }\n'
    '.dvl-drop-list{ display:none; position:absolute; top:calc(100% + 3px); left:0; right:0; z-index:100001; background:rgba(2,10,22,.98); border:1px solid rgba(24,215,255,.22); border-radius:10px; padding:4px; box-shadow:0 8px 32px rgba(0,0,0,.7); }\n'
    '.dvl-drop-list.is-open{ display:block; }\n'
    '.dvl-drop-item{ width:100%; background:transparent; border:none; color:rgba(200,230,255,.8); padding:7px 10px; font-size:12px; text-align:left; cursor:pointer; border-radius:7px; display:block; touch-action:manipulation; }\n'
    '.dvl-drop-item:active{ background:rgba(24,168,255,.15); }\n'
    '.dvl-drop-item.is-cur{ color:#18d8ff; font-weight:600; }\n'
    '.dvl-feb-mode-bar{ display:flex; gap:5px; padding:6px 0 8px; }\n'
    '.dvl-feb-mode-btn{ flex:1; padding:7px 0; border-radius:9px; font-size:11px; font-weight:600; letter-spacing:.03em; cursor:pointer; background:rgba(8,20,38,.8); border:1px solid rgba(94,135,178,.18); color:rgba(140,175,220,.55); touch-action:manipulation; }\n'
    '.dvl-feb-mode-btn.is-cur{ background:rgba(24,168,255,.16); border-color:rgba(24,168,255,.48); color:#18d8ff; }',

    'CSS: stepper + dropdown + mode-bar'
)

# ── 3. Substituir todo o bloco FEB com o script V2 ───────────────────────────
FEB_OPEN  = '<script id="DVL_BETA_0625_FLOW_EVENT_BUBBLES_JS">'
FEB_CLOSE = '</script>'

si = html.find(FEB_OPEN)
if si == -1:
    errors.append('NOT FOUND: FEB script block open tag')
else:
    ei = html.find(FEB_CLOSE, si + len(FEB_OPEN))
    if ei == -1:
        errors.append('NOT FOUND: FEB script block close tag')
    else:
        NEW_SCRIPT = r"""<script id="DVL_BETA_0625_FLOW_EVENT_BUBBLES_JS">
(function(){
"use strict";

// ── Constants ─────────────────────────────────────────────────────────────
const STORE_KEY="dvl_flow_event_bubbles_v1";
const PALETTE=["#13dc8d","#00e5cc","#4db8ff","#18a8ff","#7b5fff","#b44fff",
               "#ff4a61","#ff8c42","#ffd700","#ffffff","#ff6b35","#c0c0c0",
               "#ed4c67","#00d2d3","#54a0ff","#5f27cd"];

const PRESETS={
  Clean:  {showSuspect:false,showOnlyStrong:true, minScore:62,strongScore:75,suspectScore:999,
            len:50,minVolZ:1.20,minOIZ:0.80,minDeltaZ:0.80,minMoveATR:0.35,
            enableMerge:true,mergeBars:3,mergeATR:0.35},
  Normal: {showSuspect:true, showOnlyStrong:false,minScore:55,strongScore:75,suspectScore:48,
            len:40,minVolZ:0.95,minOIZ:0.60,minDeltaZ:0.60,minMoveATR:0.25,
            enableMerge:true,mergeBars:4,mergeATR:0.45},
  Scanner:{showSuspect:true, showOnlyStrong:false,minScore:45,strongScore:70,suspectScore:40,
            len:30,minVolZ:0.70,minOIZ:0.35,minDeltaZ:0.35,minMoveATR:0.15,
            enableMerge:true,mergeBars:4,mergeATR:0.50}
};

const DEFAULTS={
  on:false, mode:"Clean",
  len:50, atrLen:14,
  minScore:62, strongScore:75, suspectScore:999,
  minVolZ:1.20, minOIZ:0.80, minDeltaZ:0.80, minMoveATR:0.35,
  useOI:true, useDelta:true, useLS:false,
  showLabels:false, showOnlyStrong:true, showSuspect:false,
  suspectBubbleMax:8, suspectOpacity:0.32,
  visDistLimit:true, visDistATR:8.0,
  bubbleMin:4, bubbleMax:22, bubbleOpacity:0.72,
  enableMerge:true, mergeBars:3, mergeATR:0.35,
  confirmMode:"confirmed",
  showBuyAggr:true, showSellAggr:true, showLongFlush:true,
  showShortSqz:true, showLongTrap:true, showShortTrap:true,
  showBuyAbs:true, showSellAbs:true,
  ratioHigh:1.55, ratioLow:0.75,
  clrBuyAggr:"#13dc8d", clrSellAggr:"#ff4a61", clrLongFlush:"#4db8ff",
  clrShortSqz:"#00e5cc", clrLongTrap:"#b44fff", clrShortTrap:"#7b5fff",
  clrBuyAbs:"#18a8ff", clrSellAbs:"#ff8c42"
};

// ── State ─────────────────────────────────────────────────────────────────
let state=Object.assign({},DEFAULTS);
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(_){}}
function load(){
  try{
    const s=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");
    Object.keys(DEFAULTS).forEach(k=>{if(k in s) state[k]=s[k];});
  }catch(_){}
}
load();

// ── Safe globals ──────────────────────────────────────────────────────────
function gKlines(){return(typeof klines!=="undefined"&&Array.isArray(klines))?klines:[];}
function gOI(){    return(typeof oiHist!=="undefined"&&Array.isArray(oiHist))?oiHist:[];}
function gLS(){    return(typeof lsHist!=="undefined"&&Array.isArray(lsHist))?lsHist:[];}
function gSym(){   return typeof symbol!=="undefined"?symbol:"";}
function gIv(){    return typeof interval!=="undefined"?interval:"";}

// ── Math ──────────────────────────────────────────────────────────────────
function clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}

function smaFast(arr,len){
  const n=arr.length,out=new Array(n).fill(NaN);let s=0;
  for(let i=0;i<n;i++){
    s+=arr[i];if(i>=len)s-=arr[i-len];
    if(i>=len-1)out[i]=s/len;
  }
  return out;
}

function stdevFast(arr,smaArr,len){
  const n=arr.length,out=new Array(n).fill(NaN);
  for(let i=len-1;i<n;i++){
    const m=smaArr[i];if(!isFinite(m))continue;
    let sq=0;for(let j=i-len+1;j<=i;j++)sq+=(arr[j]-m)**2;
    out[i]=Math.sqrt(sq/len);
  }
  return out;
}

function normStr(v,thr,mx){return v<=thr?0:v>=mx?1:(v-thr)/(mx-thr);}

function calcATR(kls,len){
  const n=kls.length,tr=new Array(n).fill(0);
  for(let i=1;i<n;i++){
    const hl=kls[i].high-kls[i].low;
    const hc=Math.abs(kls[i].high-kls[i-1].close);
    const lc=Math.abs(kls[i].low-kls[i-1].close);
    tr[i]=Math.max(hl,hc,lc);
  }
  return smaFast(tr,len);
}

function bsearch(data,t){
  if(!data||!data.length)return null;
  if(t<=data[0].time)return data[0];
  if(t>=data[data.length-1].time)return data[data.length-1];
  let lo=0,hi=data.length-1;
  while(lo<hi){const mid=(lo+hi+1)>>1;if(data[mid].time<=t)lo=mid;else hi=mid-1;}
  return data[lo];
}

// ── Computation ───────────────────────────────────────────────────────────
let _cache={key:"",events:[]};

function cacheKey(kls){
  const oi=gOI(),ls=gLS();
  const oiSig=oi.length?oi[oi.length-1].time:0;
  const lsSig=ls.length?ls[ls.length-1].time:0;
  return[gSym(),gIv(),kls.length,oi.length,oiSig,ls.length,lsSig,
         state.on,state.mode,state.minScore,state.strongScore,state.suspectScore,
         state.len,state.showOnlyStrong,state.showSuspect].join("_");
}

function mergeEvs(evs,maxR){
  if(evs.length<=1)return evs;
  const used=new Uint8Array(evs.length),out=[];
  for(let i=0;i<evs.length;i++){
    if(used[i])continue;
    const e=evs[i],grp=[e];used[i]=1;
    for(let j=i+1;j<evs.length;j++){
      if(used[j])continue;
      const e2=evs[j];
      if(e2.type!==e.type)continue;
      if(Math.abs(e2.candleIdx-e.candleIdx)>state.mergeBars)continue;
      if(Math.abs(e2.close-e.close)>state.mergeATR*e.atrV)continue;
      grp.push(e2);used[j]=1;
    }
    const best=grp.reduce((a,b)=>a.score>b.score?a:b);
    const rm=Math.min(maxR||1.25,1+(grp.length-1)*0.1);
    out.push({...best,count:grp.length,radiusMult:rm});
  }
  return out;
}

function computeAll(kls){
  const n=kls.length;
  const len=Math.max(5,state.len);
  const atrLen=Math.max(2,state.atrLen);
  const minReq=Math.max(len,atrLen)+2;
  if(n<minReq+2)return[];

  const vols=kls.map(k=>k.volume||0);
  const volSMA=smaFast(vols,len);
  const volSTD=stdevFast(vols,volSMA,len);

  // Vol Delta = 2×buyVol − vol (approx. of buyVol − sellVol, NOT Net Delta Open)
  const deltaAvailData=n>0&&kls[0].buyVolume!==undefined;
  const deltas=kls.map(k=>deltaAvailData?(2*(k.buyVolume||0)-(k.volume||0)):0);
  const dDelta=deltas.map((d,i)=>i===0?0:d-deltas[i-1]);
  const dDeltaSMA=smaFast(dDelta,len);
  const dDeltaSTD=stdevFast(dDelta,dDeltaSMA,len);

  const atrArr=calcATR(kls,atrLen);

  const oiArr=gOI();
  const dOIPct=new Array(n).fill(0);
  const oiHasData=new Array(n).fill(false);
  if(state.useOI&&oiArr.length>1){
    for(let i=1;i<n;i++){
      const d0=bsearch(oiArr,kls[i-1].time);
      const d1=bsearch(oiArr,kls[i].time);
      if(d0&&d1&&d0!==d1){
        const prev=d0.qty||d0.value||0,curr=d1.qty||d1.value||0;
        if(prev>0){dOIPct[i]=(curr-prev)/prev*100;oiHasData[i]=true;}
      }
    }
  }
  const dOISMA=smaFast(dOIPct,len);
  const dOISTD=stdevFast(dOIPct,dOISMA,len);

  const lsArr=gLS();
  const lsRatios=new Array(n).fill(1);
  const lsHasData=new Array(n).fill(false);
  if(state.useLS&&lsArr.length){
    for(let i=0;i<n;i++){
      const d=bsearch(lsArr,kls[i].time);
      if(d&&d.ratio&&isFinite(d.ratio)){lsRatios[i]=d.ratio;lsHasData[i]=true;}
    }
  }
  const lsSMA=smaFast(lsRatios,len);
  const lsSTD=stdevFast(lsRatios,lsSMA,len);

  const PRIO_S=["LONG_FLUSH","SHORT_SQUEEZE","BUY_ABSORPTION","SELL_ABSORPTION",
                "BUY_AGGRESSION","SELL_AGGRESSION","LONG_TRAP","SHORT_TRAP"];
  const PRIO_Q=["SUSPECT_FLUSH","SUSPECT_SQUEEZE","SUSPECT_ABSORPTION_LOW",
                "SUSPECT_ABSORPTION_HIGH","SUSPECT_BUY_PRESSURE","SUSPECT_SELL_PRESSURE"];
  const LB=5;
  const strongEvs=[],suspectEvs=[];

  for(let i=minReq;i<n;i++){
    const k=kls[i],pk=kls[i-1];
    const atrV=atrArr[i];
    if(!atrV||!isFinite(atrV))continue;

    const bull=k.close>k.open,bear=k.close<k.open;
    const body=Math.abs(k.close-k.open);
    const rng=Math.max(k.high-k.low,0.000001);
    const closePos=(k.close-k.low)/rng;
    const upWick=k.high-Math.max(k.open,k.close);
    const loWick=Math.min(k.open,k.close)-k.low;
    const moveATR=Math.abs(k.close-pk.close)/Math.max(atrV,0.000001);

    const volZ=volSTD[i]>0?(k.volume-volSMA[i])/volSTD[i]:0;

    const oiAvail=state.useOI&&oiHasData[i];
    const dOI=oiAvail?dOIPct[i]:0;
    const oiZ=(oiAvail&&dOISTD[i]>0)?(dOI-dOISMA[i])/dOISTD[i]:0;

    const deltaAvail=state.useDelta&&deltaAvailData&&dDeltaSTD[i]>0;
    const dD=dDelta[i];
    const deltaZ=deltaAvail?(dD-dDeltaSMA[i])/dDeltaSTD[i]:0;

    const lsAvail=state.useLS&&lsHasData[i]&&lsSTD[i]>0;
    const ratio=lsAvail?lsRatios[i]:1;
    const ratioZ=lsAvail?(ratio-lsSMA[i])/lsSTD[i]:0;

    let wV=30,wO=oiAvail?25:0,wD=deltaAvail?25:0,wM=15,wL=lsAvail?5:0;
    const wSum=wV+wO+wD+wM+wL||1;
    const sc=(
      normStr(Math.abs(volZ),state.minVolZ,3.5)*wV+
      normStr(Math.abs(oiZ),state.minOIZ,3.0)*wO+
      normStr(Math.abs(deltaZ),state.minDeltaZ,3.0)*wD+
      normStr(moveATR,state.minMoveATR,1.8)*wM+
      normStr(Math.abs(ratioZ),1.0,2.5)*wL
    )/wSum*100;

    const mV=state.minVolZ,mO=state.minOIZ,mD=state.minDeltaZ,mM=state.minMoveATR;
    let addedStrong=false;

    // ── STRONG EVENTS ────────────────────────────────────────────────────
    if(sc>=state.strongScore){
      const cands=[];

      if(state.showLongFlush&&bear&&volZ>=mV&&oiAvail&&dOI<0&&oiZ<=-mO&&moveATR>=mM){
        if(state.confirmMode==="live"){
          cands.push({type:"LONG_FLUSH",score:sc,idx:i});
        }else if(i+1<n){
          const nk=kls[i+1];
          const nDD=dDelta[i+1];
          const nDZ=dDeltaSTD[i+1]>0?(nDD-dDeltaSMA[i+1])/dDeltaSTD[i+1]:0;
          const nRng=Math.max(nk.high-nk.low,0.000001);
          if((nDD>0&&nDZ>=mD)||(nk.close>nk.open&&(nk.close-nk.low)/nRng>=0.5))
            cands.push({type:"LONG_FLUSH",score:sc,idx:i});
        }
      }

      if(state.showShortSqz&&bull&&volZ>=mV&&oiAvail&&dOI<0&&oiZ<=-mO&&moveATR>=mM&&deltaAvail&&dD>0&&deltaZ>=mD)
        cands.push({type:"SHORT_SQUEEZE",score:sc,idx:i});

      if(state.showBuyAbs&&deltaAvail&&volZ>=mV&&(dD<0||deltaZ<-mD)&&
         (loWick>=body*0.8||closePos>=0.55)&&(!oiAvail||dOI>=0))
        cands.push({type:"BUY_ABSORPTION",score:sc,idx:i});

      if(state.showSellAbs&&deltaAvail&&volZ>=mV&&(dD>0||deltaZ>mD)&&
         (upWick>=body*0.8||closePos<=0.45)&&(!oiAvail||dOI>=0))
        cands.push({type:"SELL_ABSORPTION",score:sc,idx:i});

      if(state.showBuyAggr&&bull&&volZ>=mV&&oiAvail&&dOI>0&&oiZ>=mO&&
         deltaAvail&&dD>0&&deltaZ>=mD&&moveATR>=mM)
        cands.push({type:"BUY_AGGRESSION",score:sc,idx:i});

      if(state.showSellAggr&&bear&&volZ>=mV&&oiAvail&&dOI>0&&oiZ>=mO&&
         deltaAvail&&dD<0&&deltaZ<=-mD&&moveATR>=mM)
        cands.push({type:"SELL_AGGRESSION",score:sc,idx:i});

      if(state.showLongTrap&&oiAvail&&dOI>0&&oiZ>=mO){
        const rHi=Math.max(...kls.slice(Math.max(0,i-LB),i).map(c=>c.high));
        const lsTrap=!lsAvail||ratio>=state.ratioHigh||ratioZ>=1.2;
        const dWeak=!deltaAvail||dD<0||deltaZ<0;
        const noFol=upWick>=body*0.5||closePos<0.5;
        if(lsTrap&&dWeak&&noFol&&k.high>=rHi*0.998)
          cands.push({type:"LONG_TRAP",score:sc*0.85,idx:i});
      }

      if(state.showShortTrap&&oiAvail&&dOI>0&&oiZ>=mO){
        const rLo=Math.min(...kls.slice(Math.max(0,i-LB),i).map(c=>c.low));
        const lsTrap=!lsAvail||ratio<=state.ratioLow||ratioZ<=-1.2;
        const dWeak=!deltaAvail||dD>0||deltaZ>0;
        const noFol=loWick>=body*0.5||closePos>0.5;
        if(lsTrap&&dWeak&&noFol&&k.low<=rLo*1.002)
          cands.push({type:"SHORT_TRAP",score:sc*0.85,idx:i});
      }

      if(cands.length){
        cands.sort((a,b)=>{
          if(Math.abs(a.score-b.score)>=15)return b.score-a.score;
          return PRIO_S.indexOf(a.type)-PRIO_S.indexOf(b.type);
        });
        const ev=cands[0];
        strongEvs.push({
          candleIdx:ev.idx,type:ev.type,score:ev.score,atrV,suspect:false,
          time:kls[ev.idx].time,high:kls[ev.idx].high,
          low:kls[ev.idx].low,close:kls[ev.idx].close
        });
        addedStrong=true;
      }
    }

    // ── SUSPECT EVENTS ────────────────────────────────────────────────────
    if(!addedStrong&&state.showSuspect&&sc>=state.suspectScore&&sc<state.strongScore){
      const cands=[];

      // SUSPECT_FLUSH: preço cai + volume + OI diminui
      if((bear||k.close<kls[Math.max(0,i-3)].low)&&volZ>=mV*0.75&&
         (dOI<0||oiZ<0)&&moveATR>=mM*0.75)
        cands.push({type:"SUSPECT_FLUSH",score:sc,idx:i});

      // SUSPECT_SQUEEZE: preço sobe + volume + OI diminui
      if((bull||k.close>kls[Math.max(0,i-3)].high)&&volZ>=mV*0.75&&
         (dOI<0||oiZ<0)&&moveATR>=mM*0.75)
        cands.push({type:"SUSPECT_SQUEEZE",score:sc,idx:i});

      // SUSPECT_ABSORPTION_LOW: volume + loWick + delta negativo
      if(volZ>=mV*0.75&&(loWick>=body*0.6||closePos>=0.55)&&
         (!deltaAvail||dD<0||deltaZ<0)&&(i+1>=n||kls[i+1].close>=k.low*0.998))
        cands.push({type:"SUSPECT_ABSORPTION_LOW",score:sc,idx:i});

      // SUSPECT_ABSORPTION_HIGH: volume + upWick + delta positivo
      if(volZ>=mV*0.75&&(upWick>=body*0.6||closePos<=0.45)&&
         (!deltaAvail||dD>0||deltaZ>0)&&(i+1>=n||kls[i+1].close<=k.high*1.002))
        cands.push({type:"SUSPECT_ABSORPTION_HIGH",score:sc,idx:i});

      // SUSPECT_BUY_PRESSURE: bull + volume + pelo menos 2 de 3
      if((bull||closePos>=0.55)&&volZ>=mV*0.75){
        const c1=dOI>0||oiZ>0;
        const c2=deltaAvail&&(dD>0||deltaZ>0);
        const c3=moveATR>=mM*0.75;
        if((+c1)+(+c2)+(+c3)>=2)
          cands.push({type:"SUSPECT_BUY_PRESSURE",score:sc,idx:i});
      }

      // SUSPECT_SELL_PRESSURE: bear + volume + pelo menos 2 de 3
      if((bear||closePos<=0.45)&&volZ>=mV*0.75){
        const c1=dOI>0||oiZ>0;
        const c2=deltaAvail&&(dD<0||deltaZ<0);
        const c3=moveATR>=mM*0.75;
        if((+c1)+(+c2)+(+c3)>=2)
          cands.push({type:"SUSPECT_SELL_PRESSURE",score:sc,idx:i});
      }

      if(cands.length){
        cands.sort((a,b)=>{
          if(Math.abs(a.score-b.score)>=15)return b.score-a.score;
          return PRIO_Q.indexOf(a.type)-PRIO_Q.indexOf(b.type);
        });
        const ev=cands[0];
        suspectEvs.push({
          candleIdx:ev.idx,type:ev.type,score:ev.score,atrV,suspect:true,
          time:kls[ev.idx].time,high:kls[ev.idx].high,
          low:kls[ev.idx].low,close:kls[ev.idx].close
        });
      }
    }
  }

  const mergedStrong=state.enableMerge?mergeEvs(strongEvs,1.25):strongEvs;
  const mergedSuspect=state.enableMerge?mergeEvs(suspectEvs,1.15):suspectEvs;
  // Suspect rendered first (behind), strong on top
  return[...mergedSuspect,...mergedStrong];
}

// ── Draw ──────────────────────────────────────────────────────────────────
const ABOVE=new Set(["SELL_AGGRESSION","SELL_ABSORPTION","LONG_TRAP"]);
const SABOVE=new Set(["SUSPECT_SELL_PRESSURE","SUSPECT_ABSORPTION_HIGH"]);
const AOFF={BUY_AGGRESSION:0.10,SELL_AGGRESSION:0.10,LONG_FLUSH:0.14,
            SHORT_SQUEEZE:0.12,LONG_TRAP:0.14,SHORT_TRAP:0.14,
            BUY_ABSORPTION:0.12,SELL_ABSORPTION:0.12};
const SAOFF={SUSPECT_BUY_PRESSURE:0.06,SUSPECT_SELL_PRESSURE:0.06,
             SUSPECT_FLUSH:0.08,SUSPECT_SQUEEZE:0.08,
             SUSPECT_ABSORPTION_LOW:0.06,SUSPECT_ABSORPTION_HIGH:0.06};
const CLR={BUY_AGGRESSION:"clrBuyAggr",SELL_AGGRESSION:"clrSellAggr",
           LONG_FLUSH:"clrLongFlush",SHORT_SQUEEZE:"clrShortSqz",
           LONG_TRAP:"clrLongTrap",SHORT_TRAP:"clrShortTrap",
           BUY_ABSORPTION:"clrBuyAbs",SELL_ABSORPTION:"clrSellAbs"};
const SCLR={SUSPECT_BUY_PRESSURE:"#13dc8d",SUSPECT_SELL_PRESSURE:"#ff4a61",
            SUSPECT_FLUSH:"#4db8ff",SUSPECT_SQUEEZE:"#00e5cc",
            SUSPECT_ABSORPTION_LOW:"#18a8ff",SUSPECT_ABSORPTION_HIGH:"#ff8c42"};
const LBLS={BUY_AGGRESSION:"BUY",SELL_AGGRESSION:"SELL",LONG_FLUSH:"FLUSH",
            SHORT_SQUEEZE:"SQZ",LONG_TRAP:"LTRAP",SHORT_TRAP:"STRAP",
            BUY_ABSORPTION:"ABS",SELL_ABSORPTION:"ABS"};
const SLBLS={SUSPECT_BUY_PRESSURE:"sBUY",SUSPECT_SELL_PRESSURE:"sSELL",
             SUSPECT_FLUSH:"sFLUSH",SUSPECT_SQUEEZE:"sSQZ",
             SUSPECT_ABSORPTION_LOW:"sABS",SUSPECT_ABSORPTION_HIGH:"sABS"};

function hexA(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return"rgba("+r+","+g+","+b+","+a+")";
}

function bRad(score){
  const t=clamp((score-state.strongScore)/(100-state.strongScore),0,1);
  return clamp(state.bubbleMin+(state.bubbleMax-state.bubbleMin)*t,state.bubbleMin,state.bubbleMax);
}

function bRadSuspect(score){
  const rng=Math.max(state.strongScore-state.suspectScore,1);
  const t=clamp((score-state.suspectScore)/rng,0,1);
  return clamp(state.bubbleMin+(state.suspectBubbleMax-state.bubbleMin)*t,
               state.bubbleMin,state.suspectBubbleMax);
}

function draw(ctx,cfg){
  if(!state.on)return;
  if(!cfg||!cfg.win||!cfg.view||!cfg.view.length)return;
  const kls=gKlines();if(!kls.length)return;

  const key=cacheKey(kls);
  if(_cache.key!==key){
    _cache.key=key;
    try{_cache.events=computeAll(kls);}catch(_){_cache.events=[];}
  }
  if(!_cache.events.length)return;

  const{view,win,x,y,x0,x1,y0,y1,slotOffset}=cfg;
  const lastClose=kls[kls.length-1]?.close||0;

  ctx.save();
  ctx.beginPath();ctx.rect(x0,y0,x1-x0,y1-y0);ctx.clip();

  for(const ev of _cache.events){
    const li=ev.candleIdx-win.start;
    if(li<-2||li>=view.length+2)continue;
    const candle=kls[ev.candleIdx];if(!candle)continue;

    if(state.visDistLimit&&ev.atrV>0){
      if(Math.abs(lastClose-candle.close)>state.visDistATR*ev.atrV)continue;
    }

    const sx=x(slotOffset+li);
    if(sx<x0-40||sx>x1+4)continue;

    if(ev.suspect){
      const above=SABOVE.has(ev.type);
      const off=(SAOFF[ev.type]||0.06)*ev.atrV;
      const py=above?y(candle.high+off):y(candle.low-off);
      if(py<y0-40||py>y1+40)continue;

      let r=bRadSuspect(ev.score);
      if(ev.radiusMult)r=Math.min(state.suspectBubbleMax,r*ev.radiusMult);
      const hex=SCLR[ev.type]||"#ffffff";
      ctx.beginPath();ctx.arc(sx,py,r,0,Math.PI*2);
      ctx.fillStyle=hexA(hex,state.suspectOpacity);
      ctx.fill();

      if(state.showLabels){
        const lbl=SLBLS[ev.type]||ev.type;
        const fs=clamp(Math.round(r*0.65),6,9);
        ctx.font="bold "+fs+"px system-ui,sans-serif";
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillStyle=hexA(hex,Math.min(1,state.suspectOpacity+0.3));
        ctx.shadowBlur=0;
        ctx.fillText(lbl,sx,above?py-r-5:py+r+5);
      }
    } else {
      const above=ABOVE.has(ev.type);
      const off=(AOFF[ev.type]||0.10)*ev.atrV;
      const py=above?y(candle.high+off):y(candle.low-off);
      if(py<y0-40||py>y1+40)continue;

      let r=bRad(ev.score);
      if(ev.radiusMult)r=Math.min(state.bubbleMax*1.25,r*ev.radiusMult);
      const hex=state[CLR[ev.type]]||DEFAULTS[CLR[ev.type]]||"#ffffff";
      ctx.beginPath();ctx.arc(sx,py,r,0,Math.PI*2);
      ctx.fillStyle=hexA(hex,state.bubbleOpacity);ctx.fill();

      if(ev.score>85){
        ctx.save();ctx.shadowBlur=7;ctx.shadowColor=hex;
        ctx.beginPath();ctx.arc(sx,py,r,0,Math.PI*2);
        ctx.strokeStyle=hexA(hex,0.45);ctx.lineWidth=1.5;ctx.stroke();
        ctx.restore();
      }

      if(state.showLabels){
        const lbl=ev.count>1?((LBLS[ev.type]||ev.type)+" x"+ev.count):(LBLS[ev.type]||ev.type);
        const fs=clamp(Math.round(r*0.7),7,10);
        ctx.font="bold "+fs+"px system-ui,sans-serif";
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillStyle="#ffffff";ctx.shadowBlur=0;
        ctx.fillText(lbl,sx,above?py-r-7:py+r+7);
      }
    }
  }
  ctx.restore();
}

// ── Panel ─────────────────────────────────────────────────────────────────
let panel=null;

function ensurePanel(){
  if(panel)return panel;
  panel=document.createElement("div");
  panel.id="dvlFebPanel";
  panel.className="dvl-vt-panel dvl-feb-panel";
  panel.innerHTML=
    '<div class="dvl-vt-head">'
    +'<div class="dvl-vt-title"><b>DVL Flow Event Bubbles</b><small>V2 — composite flow overlay</small></div>'
    +'<div class="dvl-vt-head-actions">'
    +'<button class="dvl-vt-reset-icon" id="dvlFebReset" type="button" aria-label="Reset">&#8635;</button>'
    +'<button class="dvl-vt-close" id="dvlFebClose" type="button">&times;</button>'
    +'</div></div>'
    +'<div class="dvl-vt-body" id="dvlFebBody"></div>';
  document.body.appendChild(panel);
  panel.addEventListener("pointerdown",e=>{
    if(!e.target.closest(".dvl-drop-wrap"))
      panel.querySelectorAll(".dvl-drop-list.is-open").forEach(l=>l.classList.remove("is-open"));
    e.stopPropagation();
  },true);
  panel.querySelector("#dvlFebClose").addEventListener("click",closePanel);
  panel.querySelector("#dvlFebReset").addEventListener("click",resetAll);
  return panel;
}

function openPanel(){ensurePanel();panel.classList.add("is-open");renderPanel();}
function closePanel(){if(panel)panel.classList.remove("is-open");}

// ── Render helpers ────────────────────────────────────────────────────────
function chk(b){return b?"checked":"";}
function fld(lbl,inner){return`<div class="dvl-vt-field"><label>${lbl}</label>${inner}</div>`;}
function sw(id,val){return`<label class="dvl-switch"><input id="${id}" type="checkbox" ${chk(val)}><i></i><b></b></label>`;}

function stepFld(id,val,min,max,step,dec){
  const dv=dec>0?(+val).toFixed(dec):String(val);
  return`<div class="dvl-feb-step-wrap">`+
    `<button class="dvl-feb-step-btn dvl-feb-step-dec" type="button" data-id="${id}" data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${dec}">−</button>`+
    `<span class="dvl-feb-step-val" id="${id}Val">${dv}</span>`+
    `<button class="dvl-feb-step-btn dvl-feb-step-inc" type="button" data-id="${id}" data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${dec}">+</button>`+
    `</div>`;
}

function dropFld(id,opts,cur){
  const lbl=opts.find(([v])=>v===cur)?.[1]||cur;
  const items=opts.map(([v,l])=>`<button class="dvl-drop-item${v===cur?" is-cur":""}" type="button" data-val="${v}">${l}</button>`).join("");
  return`<div class="dvl-drop-wrap" id="${id}Wrap">`+
    `<button class="dvl-drop-btn" type="button" id="${id}">${lbl}<i class="dvl-drop-arr">▾</i></button>`+
    `<div class="dvl-drop-list" id="${id}List">${items}</div>`+
    `</div>`;
}

function clrBtn(id,val){
  return`<div class="dvl-feb-clr-field"><button id="${id}" class="dvl-feb-clr-swatch" type="button" style="background:${val}" data-clr="${val}" aria-label="Choose color"></button></div>`;
}

function openPalette(btn,stateKey){
  document.querySelectorAll(".dvl-feb-pal").forEach(p=>p.remove());
  const pal=document.createElement("div");pal.className="dvl-feb-pal";
  PALETTE.forEach(clr=>{
    const cell=document.createElement("button");
    cell.type="button";
    cell.className="dvl-feb-pal-cell"+(clr===state[stateKey]?" is-cur":"");
    cell.style.background=clr;cell.title=clr;
    cell.addEventListener("click",()=>{
      state[stateKey]=clr;btn.style.background=clr;btn.dataset.clr=clr;
      _cache.key="";save();if(typeof drawSoon==="function")drawSoon();pal.remove();
    });
    pal.appendChild(cell);
  });
  btn.parentNode.appendChild(pal);
  const onOut=e=>{if(!pal.contains(e.target)&&e.target!==btn){pal.remove();document.removeEventListener("pointerdown",onOut,true);}};
  setTimeout(()=>document.addEventListener("pointerdown",onOut,true),0);
}

function dataStatus(){
  const oiOk=gOI().length>0,lsOk=gLS().length>0;
  const kls=gKlines();const klOk=kls.length>0&&kls[0].buyVolume!==undefined;
  const msgs=[];
  if(!oiOk)msgs.push({t:"OI data unavailable — open interest signals disabled",info:false});
  if(!lsOk)msgs.push({t:"L/S data unavailable — long/short ratio signals disabled",info:false});
  if(!klOk)msgs.push({t:"Vol Delta data unavailable — delta signals disabled",info:false});
  if(klOk)msgs.push({t:"Vol Delta = 2×buyVol − vol (approx., not Net Delta Open)",info:true});
  if(!msgs.length)return"";
  return'<div class="dvl-feb-status">'+msgs.map(m=>'<div class="dvl-feb-status-line'+(m.info?" is-info":"")+'">'+m.t+'</div>').join("")+'</div>';
}

function modeBar(){
  return'<div class="dvl-feb-mode-bar">'+
    ["Clean","Normal","Scanner"].map(m=>
      `<button class="dvl-feb-mode-btn${state.mode===m?" is-cur":""}" type="button" data-preset="${m}">${m}</button>`
    ).join("")+
    '</div>';
}

function renderPanel(){
  ensurePanel();
  const b=panel.querySelector("#dvlFebBody");
  b.innerHTML=modeBar()+dataStatus()+`
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>General</span></div>
    <div class="dvl-vt-grid">
      ${fld("Enable",sw("febOn",state.on))}
      ${fld("Min Score",stepFld("febMinScore",state.minScore,0,99,1,0))}
      ${fld("Strong Score",stepFld("febStrongScore",state.strongScore,0,99,1,0))}
      ${fld("Show Labels",sw("febLabels",state.showLabels))}
      ${fld("Only Strong",sw("febOnlyStrong",state.showOnlyStrong))}
      ${fld("Confirm Mode",dropFld("febConfirm",[["confirmed","Confirmed"],["live","Live"]],state.confirmMode))}
      ${fld("Vis ATR Limit",sw("febVisLimit",state.visDistLimit))}
      ${fld("Vis ATR Radius",stepFld("febVisATR",state.visDistATR,1,50,0.5,1))}
    </div>
  </div>
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>Suspect Events</span></div>
    <div class="dvl-vt-grid">
      ${fld("Show Suspect",sw("febShowSuspect",state.showSuspect))}
      ${fld("Suspect Score",stepFld("febSuspScore",state.suspectScore,0,99,1,0))}
      ${fld("Suspect Bub Max",stepFld("febSuspBubMax",state.suspectBubbleMax,2,16,1,0))}
      ${fld("Suspect Opacity",stepFld("febSuspOpac",state.suspectOpacity,0.05,1,0.05,2))}
    </div>
  </div>
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>Data</span></div>
    <div class="dvl-vt-grid">
      ${fld("Open Interest",sw("febUseOI",state.useOI))}
      ${fld("Vol Delta (approx.)",sw("febUseDelta",state.useDelta))}
      ${fld("Long/Short Ratio",sw("febUseLS",state.useLS))}
    </div>
  </div>
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>Events</span></div>
    <div class="dvl-vt-grid">
      ${fld("Buy Aggression",sw("febShowBA",state.showBuyAggr))}
      ${fld("Sell Aggression",sw("febShowSA",state.showSellAggr))}
      ${fld("Long Flush",sw("febShowLF",state.showLongFlush))}
      ${fld("Short Squeeze",sw("febShowSS",state.showShortSqz))}
      ${fld("Long Trap",sw("febShowLT",state.showLongTrap))}
      ${fld("Short Trap",sw("febShowST",state.showShortTrap))}
      ${fld("Buy Absorption",sw("febShowBAbs",state.showBuyAbs))}
      ${fld("Sell Absorption",sw("febShowSAbs",state.showSellAbs))}
    </div>
  </div>
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>Scoring</span></div>
    <div class="dvl-vt-grid">
      ${fld("Length",stepFld("febLen",state.len,5,500,5,0))}
      ${fld("ATR Length",stepFld("febAtrLen",state.atrLen,2,100,1,0))}
      ${fld("Min Vol Z",stepFld("febMinVolZ",state.minVolZ,0.1,5,0.05,2))}
      ${fld("Min OI Z",stepFld("febMinOIZ",state.minOIZ,0.1,5,0.05,2))}
      ${fld("Min Delta Z",stepFld("febMinDZ",state.minDeltaZ,0.1,5,0.05,2))}
      ${fld("Min Move ATR",stepFld("febMinMoveATR",state.minMoveATR,0.05,5,0.05,2))}
    </div>
  </div>
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>Merge</span></div>
    <div class="dvl-vt-grid">
      ${fld("Enable Merge",sw("febMerge",state.enableMerge))}
      ${fld("Merge Bars",stepFld("febMergeBars",state.mergeBars,1,20,1,0))}
      ${fld("Merge ATR",stepFld("febMergeATR",state.mergeATR,0.05,5,0.05,2))}
    </div>
  </div>
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>Style</span></div>
    <div class="dvl-vt-grid">
      ${fld("Bubble Min",stepFld("febBubMin",state.bubbleMin,2,20,1,0))}
      ${fld("Bubble Max",stepFld("febBubMax",state.bubbleMax,4,40,1,0))}
      ${fld("Opacity",stepFld("febOpacity",state.bubbleOpacity,0.05,1,0.05,2))}
    </div>
  </div>
  <div class="dvl-vt-section">
    <div class="dvl-vt-section-title"><span>Colors</span></div>
    <div class="dvl-vt-grid">
      ${fld("Buy Aggr",clrBtn("febClrBA",state.clrBuyAggr))}
      ${fld("Sell Aggr",clrBtn("febClrSA",state.clrSellAggr))}
      ${fld("Long Flush",clrBtn("febClrLF",state.clrLongFlush))}
      ${fld("Short Sqz",clrBtn("febClrSS",state.clrShortSqz))}
      ${fld("Long Trap",clrBtn("febClrLT",state.clrLongTrap))}
      ${fld("Short Trap",clrBtn("febClrST",state.clrShortTrap))}
      ${fld("Buy Abs",clrBtn("febClrBAbs",state.clrBuyAbs))}
      ${fld("Sell Abs",clrBtn("febClrSAbs",state.clrSellAbs))}
    </div>
  </div>`;
  bindPanel();
}

// ── Binding ───────────────────────────────────────────────────────────────
const STEPPER_CFG={
  febMinScore:   ["minScore",      0,  99,  1,    0],
  febStrongScore:["strongScore",   0,  99,  1,    0],
  febSuspScore:  ["suspectScore",  0,  99,  1,    0],
  febVisATR:     ["visDistATR",    1,  50,  0.5,  1],
  febLen:        ["len",           5, 500,  5,    0],
  febAtrLen:     ["atrLen",        2, 100,  1,    0],
  febMinVolZ:    ["minVolZ",     0.1,   5,  0.05, 2],
  febMinOIZ:     ["minOIZ",      0.1,   5,  0.05, 2],
  febMinDZ:      ["minDeltaZ",   0.1,   5,  0.05, 2],
  febMinMoveATR: ["minMoveATR", 0.05,   5,  0.05, 2],
  febMergeBars:  ["mergeBars",    1,  20,   1,    0],
  febMergeATR:   ["mergeATR",  0.05,   5,  0.05, 2],
  febBubMin:     ["bubbleMin",    2,  20,   1,    0],
  febBubMax:     ["bubbleMax",    4,  40,   1,    0],
  febOpacity:    ["bubbleOpacity",0.05, 1,  0.05, 2],
  febSuspBubMax: ["suspectBubbleMax",2,16,  1,    0],
  febSuspOpac:   ["suspectOpacity",0.05,1,  0.05, 2]
};

const COLOR_KEYS={
  febClrBA:"clrBuyAggr",febClrSA:"clrSellAggr",
  febClrLF:"clrLongFlush",febClrSS:"clrShortSqz",
  febClrLT:"clrLongTrap",febClrST:"clrShortTrap",
  febClrBAbs:"clrBuyAbs",febClrSAbs:"clrSellAbs"
};

const TOGGLE_CFG={
  febOn:["on",false],febLabels:["showLabels",false],
  febOnlyStrong:["showOnlyStrong",true],febShowSuspect:["showSuspect",true],
  febVisLimit:["visDistLimit",false],
  febUseOI:["useOI",true],febUseDelta:["useDelta",true],febUseLS:["useLS",true],
  febShowBA:["showBuyAggr",true],febShowSA:["showSellAggr",true],
  febShowLF:["showLongFlush",true],febShowSS:["showShortSqz",true],
  febShowLT:["showLongTrap",true],febShowST:["showShortTrap",true],
  febShowBAbs:["showBuyAbs",true],febShowSAbs:["showSellAbs",true],
  febMerge:["enableMerge",true]
};

const RECOMPUTE_KEYS=new Set(["len","atrLen","minScore","strongScore","suspectScore",
  "minVolZ","minOIZ","minDeltaZ","minMoveATR","useOI","useDelta","useLS",
  "enableMerge","mergeBars","mergeATR","confirmMode","showOnlyStrong","showSuspect",
  "showBuyAggr","showSellAggr","showLongFlush","showShortSqz",
  "showLongTrap","showShortTrap","showBuyAbs","showSellAbs"]);

function applyPreset(name){
  const p=PRESETS[name];if(!p)return;
  Object.assign(state,p);state.mode=name;
  _cache.key="";save();
  if(typeof drawSoon==="function")drawSoon();
}

function bindPanel(){
  // Steppers
  panel.querySelectorAll(".dvl-feb-step-btn").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      const id=btn.dataset.id;
      const cfg=STEPPER_CFG[id];if(!cfg)return;
      const[key,mn,mx,st,dc]=cfg;
      const isInc=btn.classList.contains("dvl-feb-step-inc");
      const v=isInc
        ?Math.min(mx,+(state[key]+st).toFixed(dc))
        :Math.max(mn,+(state[key]-st).toFixed(dc));
      state[key]=v;
      const valEl=panel.querySelector("#"+id+"Val");
      if(valEl)valEl.textContent=dc>0?v.toFixed(dc):String(v);
      if(RECOMPUTE_KEYS.has(key))_cache.key="";
      save();if(typeof drawSoon==="function")drawSoon();
    });
  });

  // Toggles
  Object.keys(TOGGLE_CFG).forEach(id=>{
    const el=panel.querySelector("#"+id);if(!el)return;
    const[key,recompute]=TOGGLE_CFG[id];
    el.addEventListener("change",()=>{
      state[key]=!!el.checked;
      if(recompute)_cache.key="";
      save();if(typeof drawSoon==="function")drawSoon();
    });
  });

  // Dropdowns
  panel.querySelectorAll(".dvl-drop-btn").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      const list=panel.querySelector("#"+btn.id+"List");if(!list)return;
      const wasOpen=list.classList.contains("is-open");
      panel.querySelectorAll(".dvl-drop-list.is-open").forEach(l=>l.classList.remove("is-open"));
      if(!wasOpen)list.classList.add("is-open");
    });
  });
  panel.querySelectorAll(".dvl-drop-list").forEach(list=>{
    list.querySelectorAll(".dvl-drop-item").forEach(item=>{
      item.addEventListener("click",e=>{
        e.stopPropagation();
        const val=item.dataset.val;
        const btnId=list.id.replace("List","");
        const btn=panel.querySelector("#"+btnId);
        // update label text (first text node)
        if(btn){
          const textNode=[...btn.childNodes].find(n=>n.nodeType===3);
          if(textNode)textNode.textContent=item.textContent;
        }
        list.querySelectorAll(".dvl-drop-item").forEach(it=>it.classList.toggle("is-cur",it===item));
        list.classList.remove("is-open");
        // map dropdown id to state key
        if(btnId==="febConfirm"){state.confirmMode=val;_cache.key="";}
        save();if(typeof drawSoon==="function")drawSoon();
      });
    });
  });

  // Mode bar
  panel.querySelectorAll(".dvl-feb-mode-btn").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      const name=btn.dataset.preset;
      applyPreset(name);
      renderPanel(); // re-render to reflect new values
    });
  });

  // Color palette
  Object.keys(COLOR_KEYS).forEach(id=>{
    const btn=panel.querySelector("#"+id);if(!btn)return;
    btn.addEventListener("click",()=>openPalette(btn,COLOR_KEYS[id]));
  });
}

function resetAll(){
  Object.assign(state,DEFAULTS);_cache.key="";
  save();renderPanel();if(typeof drawSoon==="function")drawSoon();
}

// ── Menu ──────────────────────────────────────────────────────────────────
function updatePill(){
  const p=document.getElementById("dvlFebState");
  if(p)p.classList.toggle("is-on",!!state.on);
}

function insertRow(){
  const menu=document.getElementById("indicatorDropdown");
  if(!menu||document.getElementById("dvlFebItem"))return;
  const item=document.createElement("div");
  item.id="dvlFebItem";item.className="indicatorItem";
  item.innerHTML=
    '<span class="indicatorFxMark">FEB</span>'
    +'<span><b>DVL Flow Event Bubbles</b><small>V2 — composite flow overlay</small></span>'
    +'<i class="dvl-vt-state'+(state.on?" is-on":"")+'" id="dvlFebState"></i>';
  const sz=document.getElementById("dvlSpikeZonesItem");
  if(sz&&sz.parentNode)sz.parentNode.insertBefore(item,sz.nextSibling);
  else{const h=menu.querySelector(".indicatorDropHead");if(h&&h.nextSibling)menu.insertBefore(item,h.nextSibling);else menu.appendChild(item);}
  const pill=item.querySelector("#dvlFebState");
  if(pill)pill.addEventListener("click",ev=>{
    ev.preventDefault();ev.stopPropagation();
    state.on=!state.on;updatePill();save();
    if(typeof drawSoon==="function")drawSoon();
  });
  item.addEventListener("click",ev=>{ev.stopPropagation();openPanel();});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",insertRow);
else setTimeout(insertRow,0);

window.DVLFlowEventBubbles={on:()=>!!state.on,setOn:v=>{state.on=!!v;save();},
  refresh:()=>{_cache.key="";},get state(){return Object.assign({},state);}};
window.DVLFlowEventBubblesDraw=function(ctx,cfg){try{draw(ctx,cfg);}catch(_){}};
})();
</script>"""
        fixes.append('FEB V2 script (presets + suspect events + custom controls)')
        html = html[:si] + NEW_SCRIPT + html[ei+len(FEB_CLOSE):]

# ── 4. Version bump 0.627 → 0.628 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.627";',
    'const DVL_APP_VERSION = "Beta 0.628";',
    'DVL_APP_VERSION 0.627→0.628'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: FEB 7 fixes — palette picker, strict conditions, typeof guards, showOnlyStrong, same-type merge, cache key + vol delta label." },',
    '{ version: DVL_APP_VERSION, note: "Feature: FEB V2 — presets Clean/Normal/Scanner + suspect mini-bubbles + stronger mechanics." },\n'
    '  { version: "Beta 0.627", note: "Bugfix: FEB 7 fixes — palette picker, strict conditions, typeof guards, showOnlyStrong, same-type merge, cache key + vol delta label." },',
    'DVL_CHANGELOG 0.628'
)
html = rep(html,
    'BETA 0.627</div>',
    'BETA 0.628</div>',
    'versionBadge 0.627→0.628'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.627</title>',
    '<title>DVL Binance Live — Beta 0.628</title>',
    'title 0.627→0.628'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.627",',
    '  window.DVLVolumeProfile = { version:"0.628",',
    'DVLVolumeProfile version 0.628'
)

# ── Result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  ', e)
    print('Aborting write.')
    sys.exit(1)
else:
    print('All checks passed.')

print('Applied (%d fixes):' % len(fixes))
for f in fixes: print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

print()
print('Written to', DST)
print('Total lines after patch: %d' % (html.count('\n') + 1))
