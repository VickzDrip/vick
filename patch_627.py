# patch_627.py — Beta 0.627
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.626)
#
# FIX 1 — Substituir <input type="color"> por palette picker customizada DVL
# FIX 2 — Renomear "Net Delta" para "Vol Delta (approx.)" e deixar claro que
#          é 2×buyVol-vol, NÃO o Net Delta Open do CoinGlass
# FIX 3 — Condições de evento estritas: desabilitar tipo quando dado necessário
#          está ausente (sem relaxamento de filtros)
# FIX 4 — Proteger todos os acessos a globais com typeof
# FIX 5 — Implementar showOnlyStrong (score efetivo ≥ 75 quando ativado)
# FIX 6 — Merge: somente mesmo tipo de evento (não misturar tipos)
# FIX 7 — Cache key inclui fingerprint de OI e L/S (length + último timestamp)
#
# VERSION: 0.626 → 0.627

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

# ── 1. CSS: substituir .dvl-feb-color por palette picker CSS ─────────────────
html = rep(html,
    '.dvl-feb-color{\n'
    '  padding:2px 4px!important;\n'
    '  cursor:pointer;\n'
    '  height:32px!important;\n'
    '}',

    '.dvl-feb-clr-field{ position:relative; }\n'
    '.dvl-feb-clr-swatch{ width:100%; height:32px; border-radius:11px; border:1px solid rgba(94,135,178,.24); cursor:pointer; display:block; }\n'
    '.dvl-feb-pal{ position:absolute; top:calc(100% + 4px); left:0; z-index:100000; background:rgba(3,10,20,.97); border:1px solid rgba(24,215,255,.28); border-radius:12px; padding:8px; display:grid; grid-template-columns:repeat(4,1fr); gap:5px; width:150px; }\n'
    '.dvl-feb-pal-cell{ width:28px; height:28px; border-radius:7px; border:2px solid transparent; cursor:pointer; }\n'
    '.dvl-feb-pal-cell.is-cur{ border-color:rgba(255,255,255,.85); }',

    'CSS: palette picker (.dvl-feb-clr-*)'
)

# ── 2. CSS: adicionar .dvl-feb-status-line.is-info ───────────────────────────
html = rep(html,
    '.dvl-feb-status-line{\n'
    '  font-size:10px;\n'
    '  color:rgba(255,190,60,.9);\n'
    '  line-height:1.55;\n'
    '}',

    '.dvl-feb-status-line{\n'
    '  font-size:10px;\n'
    '  color:rgba(255,190,60,.9);\n'
    '  line-height:1.55;\n'
    '}\n'
    '.dvl-feb-status-line.is-info{ color:rgba(100,180,255,.7); }',

    'CSS: .dvl-feb-status-line.is-info'
)

# ── 3. Substituir todo o bloco do script FEB (abordagem find/replace) ─────────
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

  const STORE_KEY = "dvl_flow_event_bubbles_v1";
  const PALETTE = ["#13dc8d","#00e5cc","#4db8ff","#18a8ff","#7b5fff","#b44fff",
                   "#ff4a61","#ff8c42","#ffd700","#ffffff","#ff6b35","#c0c0c0",
                   "#ed4c67","#00d2d3","#54a0ff","#5f27cd"];
  const DEFAULTS = {
    on:false, len:50, atrLen:14, minScore:62,
    minVolZ:1.20, minOIZ:0.80, minDeltaZ:0.80, minMoveATR:0.35,
    useOI:true, useDelta:true, useLS:false,
    showLabels:false, showOnlyStrong:true,
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

  let state = Object.assign({}, DEFAULTS);
  function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(_){} }
  function load(){
    try{
      const s = JSON.parse(localStorage.getItem(STORE_KEY)||"{}");
      Object.keys(DEFAULTS).forEach(k=>{ if(k in s) state[k]=s[k]; });
    }catch(_){}
  }
  load();

  // Safe global accessors — never throws if var is not yet declared
  function gKlines(){ return (typeof klines!=="undefined"&&Array.isArray(klines))?klines:[]; }
  function gOI(){     return (typeof oiHist!=="undefined"&&Array.isArray(oiHist))?oiHist:[]; }
  function gLS(){     return (typeof lsHist!=="undefined"&&Array.isArray(lsHist))?lsHist:[]; }
  function gSym(){    return typeof symbol!=="undefined"?symbol:""; }
  function gIv(){     return typeof interval!=="undefined"?interval:""; }

  // ── Math ──────────────────────────────────────────────────────────────────
  function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }

  function smaFast(arr, len){
    const n=arr.length, out=new Array(n).fill(NaN);
    let s=0;
    for(let i=0;i<n;i++){
      s+=arr[i];
      if(i>=len) s-=arr[i-len];
      if(i>=len-1) out[i]=s/len;
    }
    return out;
  }

  function stdevFast(arr, smaArr, len){
    const n=arr.length, out=new Array(n).fill(NaN);
    for(let i=len-1;i<n;i++){
      const m=smaArr[i];
      if(!isFinite(m)) continue;
      let sq=0;
      for(let j=i-len+1;j<=i;j++) sq+=(arr[j]-m)**2;
      out[i]=Math.sqrt(sq/len);
    }
    return out;
  }

  function normStr(v, thr, mx){ return v<=thr?0:v>=mx?1:(v-thr)/(mx-thr); }

  function calcATR(kls, len){
    const n=kls.length, tr=new Array(n).fill(0);
    for(let i=1;i<n;i++){
      const hl=kls[i].high-kls[i].low;
      const hc=Math.abs(kls[i].high-kls[i-1].close);
      const lc=Math.abs(kls[i].low-kls[i-1].close);
      tr[i]=Math.max(hl,hc,lc);
    }
    return smaFast(tr, len);
  }

  function bsearch(data, t){
    if(!data||!data.length) return null;
    if(t<=data[0].time) return data[0];
    if(t>=data[data.length-1].time) return data[data.length-1];
    let lo=0, hi=data.length-1;
    while(lo<hi){ const mid=(lo+hi+1)>>1; if(data[mid].time<=t) lo=mid; else hi=mid-1; }
    return data[lo];
  }

  // ── Event Computation ─────────────────────────────────────────────────────
  let _cache = { key:"", events:[] };

  function cacheKey(kls){
    const oi=gOI(), ls=gLS();
    const oiSig=oi.length?oi[oi.length-1].time:0;
    const lsSig=ls.length?ls[ls.length-1].time:0;
    return [gSym(),gIv(),kls.length,oi.length,oiSig,ls.length,lsSig,
            state.on,state.minScore,state.len,state.showOnlyStrong].join("_");
  }

  function computeAll(kls){
    const n=kls.length;
    const len=Math.max(5,state.len);
    const atrLen=Math.max(2,state.atrLen);
    const minReq=Math.max(len,atrLen)+2;
    if(n<minReq+2) return [];

    // Volume
    const vols=kls.map(k=>k.volume||0);
    const volSMA=smaFast(vols,len);
    const volSTD=stdevFast(vols,volSMA,len);

    // Vol Delta = 2×buyVol − vol (approx. of buyVol − sellVol)
    // This is NOT "Net Delta Open" from CoinGlass — it is derived from kline data only
    const deltaAvailData=n>0&&kls[0].buyVolume!==undefined;
    const deltas=kls.map(k=>deltaAvailData?(2*(k.buyVolume||0)-(k.volume||0)):0);
    const dDelta=deltas.map((d,i)=>i===0?0:d-deltas[i-1]);
    const dDeltaSMA=smaFast(dDelta,len);
    const dDeltaSTD=stdevFast(dDelta,dDeltaSMA,len);

    // ATR
    const atrArr=calcATR(kls,atrLen);

    // OI — aligned to kline timestamps via binary search on oiHist
    const oiArr=gOI();
    const dOIPct=new Array(n).fill(0);
    const oiHasData=new Array(n).fill(false);
    if(state.useOI && oiArr.length>1){
      for(let i=1;i<n;i++){
        const d0=bsearch(oiArr,kls[i-1].time);
        const d1=bsearch(oiArr,kls[i].time);
        if(d0&&d1&&d0!==d1){
          const prev=d0.qty||d0.value||0;
          const curr=d1.qty||d1.value||0;
          if(prev>0){ dOIPct[i]=(curr-prev)/prev*100; oiHasData[i]=true; }
        }
      }
    }
    const dOISMA=smaFast(dOIPct,len);
    const dOISTD=stdevFast(dOIPct,dOISMA,len);

    // Long/Short Ratio
    const lsArr=gLS();
    const lsRatios=new Array(n).fill(1);
    const lsHasData=new Array(n).fill(false);
    if(state.useLS && lsArr.length){
      for(let i=0;i<n;i++){
        const d=bsearch(lsArr,kls[i].time);
        if(d&&d.ratio&&isFinite(d.ratio)){ lsRatios[i]=d.ratio; lsHasData[i]=true; }
      }
    }
    const lsSMA=smaFast(lsRatios,len);
    const lsSTD=stdevFast(lsRatios,lsSMA,len);

    const PRIO=["LONG_FLUSH","SHORT_SQUEEZE","BUY_ABSORPTION","SELL_ABSORPTION",
                "BUY_AGGRESSION","SELL_AGGRESSION","LONG_TRAP","SHORT_TRAP"];
    const LB=5;
    const events=[];

    for(let i=minReq;i<n;i++){
      const k=kls[i], pk=kls[i-1];
      const atrV=atrArr[i];
      if(!atrV||!isFinite(atrV)) continue;

      const bull=k.close>k.open, bear=k.close<k.open;
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

      // Weighted score — weights collapse to 0 when data is absent
      let wV=30,wO=oiAvail?25:0,wD=deltaAvail?25:0,wM=15,wL=lsAvail?5:0;
      const wSum=wV+wO+wD+wM+wL||1;

      const sc=(
        normStr(Math.abs(volZ),state.minVolZ,3.5)*wV +
        normStr(Math.abs(oiZ),state.minOIZ,3.0)*wO +
        normStr(Math.abs(deltaZ),state.minDeltaZ,3.0)*wD +
        normStr(moveATR,state.minMoveATR,1.8)*wM +
        normStr(Math.abs(ratioZ),1.0,2.5)*wL
      )/wSum*100;

      // showOnlyStrong raises effective threshold to 75
      const effectiveMin=state.showOnlyStrong?Math.max(state.minScore,75):state.minScore;
      if(sc<effectiveMin) continue;

      const cands=[];
      const mV=state.minVolZ, mO=state.minOIZ, mD=state.minDeltaZ, mM=state.minMoveATR;

      // 1. LONG_FLUSH — requires OI data
      if(state.showLongFlush && bear && volZ>=mV && oiAvail && dOI<0 && oiZ<=-mO && moveATR>=mM){
        if(state.confirmMode==="live"){
          cands.push({type:"LONG_FLUSH",score:sc,idx:i});
        } else if(i+1<n){
          const nk=kls[i+1];
          const nDD=dDelta[i+1];
          const nDZ=dDeltaSTD[i+1]>0?(nDD-dDeltaSMA[i+1])/dDeltaSTD[i+1]:0;
          const nRng=Math.max(nk.high-nk.low,0.000001);
          const nClose50=(nk.close-nk.low)/nRng>=0.5;
          if((nDD>0&&nDZ>=mD)||(nk.close>nk.open&&nClose50)){
            cands.push({type:"LONG_FLUSH",score:sc,idx:i});
          }
        }
      }

      // 2. SHORT_SQUEEZE — requires OI and Vol Delta data
      if(state.showShortSqz && bull && volZ>=mV && oiAvail && dOI<0 && oiZ<=-mO && moveATR>=mM && deltaAvail && dD>0 && deltaZ>=mD){
        cands.push({type:"SHORT_SQUEEZE",score:sc,idx:i});
      }

      // 3. BUY_ABSORPTION — requires Vol Delta data (bearish delta on bullish price action)
      if(state.showBuyAbs && deltaAvail && volZ>=mV && (dD<0||deltaZ<-mD) &&
         (loWick>=body*0.8||closePos>=0.55) && (!oiAvail||dOI>=0)){
        cands.push({type:"BUY_ABSORPTION",score:sc,idx:i});
      }

      // 4. SELL_ABSORPTION — requires Vol Delta data (bullish delta on bearish price action)
      if(state.showSellAbs && deltaAvail && volZ>=mV && (dD>0||deltaZ>mD) &&
         (upWick>=body*0.8||closePos<=0.45) && (!oiAvail||dOI>=0)){
        cands.push({type:"SELL_ABSORPTION",score:sc,idx:i});
      }

      // 5. BUY_AGGRESSION — requires OI and Vol Delta data
      if(state.showBuyAggr && bull && volZ>=mV && oiAvail && dOI>0 && oiZ>=mO &&
         deltaAvail && dD>0 && deltaZ>=mD && moveATR>=mM){
        cands.push({type:"BUY_AGGRESSION",score:sc,idx:i});
      }

      // 6. SELL_AGGRESSION — requires OI and Vol Delta data
      if(state.showSellAggr && bear && volZ>=mV && oiAvail && dOI>0 && oiZ>=mO &&
         deltaAvail && dD<0 && deltaZ<=-mD && moveATR>=mM){
        cands.push({type:"SELL_AGGRESSION",score:sc,idx:i});
      }

      // 7. LONG_TRAP — requires OI data
      if(state.showLongTrap && oiAvail && dOI>0 && oiZ>=mO){
        const rHi=Math.max(...kls.slice(Math.max(0,i-LB),i).map(c=>c.high));
        const lsTrap=!lsAvail||ratio>=state.ratioHigh||ratioZ>=1.2;
        const dWeak=!deltaAvail||dD<0||deltaZ<0;
        const noFol=upWick>=body*0.5||closePos<0.5;
        if(lsTrap&&dWeak&&noFol&&k.high>=rHi*0.998)
          cands.push({type:"LONG_TRAP",score:sc*0.85,idx:i});
      }

      // 8. SHORT_TRAP — requires OI data
      if(state.showShortTrap && oiAvail && dOI>0 && oiZ>=mO){
        const rLo=Math.min(...kls.slice(Math.max(0,i-LB),i).map(c=>c.low));
        const lsTrap=!lsAvail||ratio<=state.ratioLow||ratioZ<=-1.2;
        const dWeak=!deltaAvail||dD>0||deltaZ>0;
        const noFol=loWick>=body*0.5||closePos>0.5;
        if(lsTrap&&dWeak&&noFol&&k.low<=rLo*1.002)
          cands.push({type:"SHORT_TRAP",score:sc*0.85,idx:i});
      }

      if(!cands.length) continue;

      cands.sort((a,b)=>{
        if(Math.abs(a.score-b.score)>=15) return b.score-a.score;
        return PRIO.indexOf(a.type)-PRIO.indexOf(b.type);
      });

      const ev=cands[0];
      events.push({
        candleIdx:ev.idx, type:ev.type, score:ev.score, atrV,
        time:kls[ev.idx].time, high:kls[ev.idx].high,
        low:kls[ev.idx].low, close:kls[ev.idx].close
      });
    }

    return state.enableMerge ? mergeEvs(events) : events;
  }

  const DIR={
    BUY_AGGRESSION:"bull",LONG_FLUSH:"bull",SHORT_SQUEEZE:"bull",
    BUY_ABSORPTION:"bull",SHORT_TRAP:"bull",
    SELL_AGGRESSION:"bear",SELL_ABSORPTION:"bear",LONG_TRAP:"bear"
  };

  function mergeEvs(evs){
    if(evs.length<=1) return evs;
    const used=new Uint8Array(evs.length), out=[];
    for(let i=0;i<evs.length;i++){
      if(used[i]) continue;
      const e=evs[i], grp=[e]; used[i]=1;
      for(let j=i+1;j<evs.length;j++){
        if(used[j]) continue;
        const e2=evs[j];
        if(e2.type !== e.type) continue;
        if(Math.abs(e2.candleIdx-e.candleIdx)>state.mergeBars) continue;
        if(Math.abs(e2.close-e.close)>state.mergeATR*e.atrV) continue;
        grp.push(e2); used[j]=1;
      }
      const best=grp.reduce((a,b)=>a.score>b.score?a:b);
      out.push({...best,count:grp.length,radiusMult:Math.min(1.25,1+(grp.length-1)*0.1)});
    }
    return out;
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  const ABOVE=new Set(["SELL_AGGRESSION","SELL_ABSORPTION","LONG_TRAP"]);
  const AOFF={BUY_AGGRESSION:0.10,SELL_AGGRESSION:0.10,LONG_FLUSH:0.14,
              SHORT_SQUEEZE:0.12,LONG_TRAP:0.14,SHORT_TRAP:0.14,
              BUY_ABSORPTION:0.12,SELL_ABSORPTION:0.12};
  const LBLS={BUY_AGGRESSION:"BUY",SELL_AGGRESSION:"SELL",LONG_FLUSH:"FLUSH",
              SHORT_SQUEEZE:"SQZ",LONG_TRAP:"LTRAP",SHORT_TRAP:"STRAP",
              BUY_ABSORPTION:"ABS",SELL_ABSORPTION:"ABS"};
  const CLR={BUY_AGGRESSION:"clrBuyAggr",SELL_AGGRESSION:"clrSellAggr",
             LONG_FLUSH:"clrLongFlush",SHORT_SQUEEZE:"clrShortSqz",
             LONG_TRAP:"clrLongTrap",SHORT_TRAP:"clrShortTrap",
             BUY_ABSORPTION:"clrBuyAbs",SELL_ABSORPTION:"clrSellAbs"};

  function hexA(hex,a){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return "rgba("+r+","+g+","+b+","+a+")";
  }

  function bRad(score){
    const t=clamp((score-state.minScore)/(100-state.minScore),0,1);
    return clamp(state.bubbleMin+(state.bubbleMax-state.bubbleMin)*t,state.bubbleMin,state.bubbleMax);
  }

  function draw(ctx, cfg){
    if(!state.on) return;
    if(!cfg||!cfg.win||!cfg.view||!cfg.view.length) return;
    const kls=gKlines();
    if(!kls.length) return;

    const key=cacheKey(kls);
    if(_cache.key!==key){
      _cache.key=key;
      try{ _cache.events=computeAll(kls); }catch(_){ _cache.events=[]; }
    }
    if(!_cache.events.length) return;

    const {view,win,x,y,x0,x1,y0,y1,slotOffset}=cfg;
    const lastClose=kls[kls.length-1]?.close||0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0,y0,x1-x0,y1-y0);
    ctx.clip();

    for(const ev of _cache.events){
      const li=ev.candleIdx-win.start;
      if(li<-2||li>=view.length+2) continue;
      const candle=kls[ev.candleIdx];
      if(!candle) continue;

      if(state.visDistLimit&&ev.atrV>0){
        if(Math.abs(lastClose-candle.close)>state.visDistATR*ev.atrV) continue;
      }

      const sx=x(slotOffset+li);
      if(sx<x0-40||sx>x1+4) continue;

      const above=ABOVE.has(ev.type);
      const py=above
        ? y(candle.high+ev.atrV*(AOFF[ev.type]||0.10))
        : y(candle.low -ev.atrV*(AOFF[ev.type]||0.10));
      if(py<y0-40||py>y1+40) continue;

      let r=bRad(ev.score);
      if(ev.radiusMult) r=Math.min(state.bubbleMax*1.25,r*ev.radiusMult);

      const hex=state[CLR[ev.type]]||DEFAULTS[CLR[ev.type]]||"#ffffff";
      ctx.beginPath();
      ctx.arc(sx,py,r,0,Math.PI*2);
      ctx.fillStyle=hexA(hex,state.bubbleOpacity);
      ctx.fill();

      if(ev.score>85){
        ctx.save();
        ctx.shadowBlur=7;
        ctx.shadowColor=hex;
        ctx.beginPath();
        ctx.arc(sx,py,r,0,Math.PI*2);
        ctx.strokeStyle=hexA(hex,0.45);
        ctx.lineWidth=1.5;
        ctx.stroke();
        ctx.restore();
      }

      if(state.showLabels){
        const lbl=ev.count>1
          ?((LBLS[ev.type]||ev.type)+" x"+ev.count)
          :(LBLS[ev.type]||ev.type);
        const fs=clamp(Math.round(r*0.7),7,10);
        ctx.font="bold "+fs+"px system-ui,sans-serif";
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillStyle="#ffffff";
        ctx.shadowBlur=0;
        ctx.fillText(lbl,sx,above?py-r-7:py+r+7);
      }
    }
    ctx.restore();
  }

  // ── Settings Panel ────────────────────────────────────────────────────────
  let panel=null;

  function ensurePanel(){
    if(panel) return panel;
    panel=document.createElement("div");
    panel.id="dvlFebPanel";
    panel.className="dvl-vt-panel dvl-feb-panel";
    panel.innerHTML=
      '<div class="dvl-vt-head">'
      +'<div class="dvl-vt-title"><b>DVL Flow Event Bubbles</b><small>composite flow overlay</small></div>'
      +'<div class="dvl-vt-head-actions">'
      +'<button class="dvl-vt-reset-icon" id="dvlFebReset" type="button" aria-label="Reset">&#8635;</button>'
      +'<button class="dvl-vt-close" id="dvlFebClose" type="button">&times;</button>'
      +'</div></div>'
      +'<div class="dvl-vt-body" id="dvlFebBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown",ev=>ev.stopPropagation(),true);
    panel.querySelector("#dvlFebClose").addEventListener("click",closePanel);
    panel.querySelector("#dvlFebReset").addEventListener("click",resetAll);
    return panel;
  }

  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }

  function chk(b){ return b?"checked":""; }
  function selOpt(pairs,cur){ return pairs.map(([v,l])=>`<option value="${v}"${v===cur?" selected":""}>${l}</option>`).join(""); }
  function fld(lbl,inner){ return `<div class="dvl-vt-field"><label>${lbl}</label>${inner}</div>`; }
  function sw(id,val){ return `<label class="dvl-switch"><input id="${id}" type="checkbox" ${chk(val)}><i></i><b></b></label>`; }
  function numInp(id,val,min,max,step){ return `<input id="${id}" class="dvl-vt-input" type="number" min="${min}" max="${max}" step="${step}" value="${val}">`; }
  function clrBtn(id,val){
    return `<div class="dvl-feb-clr-field"><button id="${id}" class="dvl-feb-clr-swatch" type="button" style="background:${val}" data-clr="${val}" aria-label="Choose color"></button></div>`;
  }

  function openPalette(btn, stateKey){
    document.querySelectorAll(".dvl-feb-pal").forEach(p=>p.remove());
    const pal=document.createElement("div");
    pal.className="dvl-feb-pal";
    PALETTE.forEach(clr=>{
      const cell=document.createElement("button");
      cell.type="button";
      cell.className="dvl-feb-pal-cell"+(clr===state[stateKey]?" is-cur":"");
      cell.style.background=clr;
      cell.title=clr;
      cell.addEventListener("click",()=>{
        state[stateKey]=clr;
        btn.style.background=clr;
        btn.dataset.clr=clr;
        _cache.key="";
        save();
        if(typeof drawSoon==="function") drawSoon();
        pal.remove();
      });
      pal.appendChild(cell);
    });
    btn.parentNode.appendChild(pal);
    const onOut=e=>{
      if(!pal.contains(e.target)&&e.target!==btn){ pal.remove(); document.removeEventListener("pointerdown",onOut,true); }
    };
    setTimeout(()=>document.addEventListener("pointerdown",onOut,true),0);
  }

  function dataStatus(){
    const oiOk=gOI().length>0;
    const lsOk=gLS().length>0;
    const kls=gKlines();
    const klOk=kls.length>0&&kls[0].buyVolume!==undefined;
    const msgs=[];
    if(!oiOk) msgs.push({t:"OI data unavailable — open interest signals disabled",info:false});
    if(!lsOk) msgs.push({t:"L/S data unavailable — long/short ratio signals disabled",info:false});
    if(!klOk) msgs.push({t:"Vol Delta data unavailable — delta signals disabled",info:false});
    if(klOk) msgs.push({t:"Vol Delta = 2×buyVol − vol (approx., not Net Delta Open)",info:true});
    if(!msgs.length) return "";
    return '<div class="dvl-feb-status">'+msgs.map(m=>'<div class="dvl-feb-status-line'+(m.info?" is-info":"")+'">'+(m.t)+'</div>').join("")+'</div>';
  }

  function renderPanel(){
    ensurePanel();
    const b=panel.querySelector("#dvlFebBody");
    b.innerHTML=dataStatus()+`
    <div class="dvl-vt-section">
      <div class="dvl-vt-section-title"><span>General</span></div>
      <div class="dvl-vt-grid">
        ${fld("Enable",sw("febOn",state.on))}
        ${fld("Min Score",numInp("febMinScore",state.minScore,0,99,1))}
        ${fld("Show Labels",sw("febLabels",state.showLabels))}
        ${fld("Only Strong",sw("febOnlyStrong",state.showOnlyStrong))}
        ${fld("Confirm Mode",`<select id="febConfirm" class="dvl-vt-select">${selOpt([["confirmed","Confirmed"],["live","Live"]],state.confirmMode)}</select>`)}
        ${fld("Vis ATR Limit",sw("febVisLimit",state.visDistLimit))}
        ${fld("Vis ATR Radius",numInp("febVisATR",state.visDistATR,1,50,0.5))}
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
        ${fld("Length",numInp("febLen",state.len,5,500,1))}
        ${fld("ATR Length",numInp("febAtrLen",state.atrLen,2,100,1))}
        ${fld("Min Vol Z",numInp("febMinVolZ",state.minVolZ,0.1,5,0.05))}
        ${fld("Min OI Z",numInp("febMinOIZ",state.minOIZ,0.1,5,0.05))}
        ${fld("Min Delta Z",numInp("febMinDZ",state.minDeltaZ,0.1,5,0.05))}
        ${fld("Min Move ATR",numInp("febMinMoveATR",state.minMoveATR,0.05,5,0.05))}
      </div>
    </div>
    <div class="dvl-vt-section">
      <div class="dvl-vt-section-title"><span>Merge</span></div>
      <div class="dvl-vt-grid">
        ${fld("Enable Merge",sw("febMerge",state.enableMerge))}
        ${fld("Merge Bars",numInp("febMergeBars",state.mergeBars,1,20,1))}
        ${fld("Merge ATR",numInp("febMergeATR",state.mergeATR,0.05,5,0.05))}
      </div>
    </div>
    <div class="dvl-vt-section">
      <div class="dvl-vt-section-title"><span>Style</span></div>
      <div class="dvl-vt-grid">
        ${fld("Bubble Min",numInp("febBubMin",state.bubbleMin,2,20,1))}
        ${fld("Bubble Max",numInp("febBubMax",state.bubbleMax,4,40,1))}
        ${fld("Opacity",numInp("febOpacity",state.bubbleOpacity,0.05,1,0.01))}
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

  const COLOR_KEYS={
    febClrBA:"clrBuyAggr", febClrSA:"clrSellAggr",
    febClrLF:"clrLongFlush", febClrSS:"clrShortSqz",
    febClrLT:"clrLongTrap", febClrST:"clrShortTrap",
    febClrBAbs:"clrBuyAbs", febClrSAbs:"clrSellAbs"
  };

  const RECOMPUTE_KEYS=new Set(["len","atrLen","minScore","minVolZ","minOIZ","minDeltaZ",
    "minMoveATR","useOI","useDelta","useLS","enableMerge","mergeBars","mergeATR","confirmMode",
    "showBuyAggr","showSellAggr","showLongFlush","showShortSqz","showLongTrap",
    "showShortTrap","showBuyAbs","showSellAbs","showOnlyStrong"]);

  function bindPanel(){
    const MAP={
      febOn:["on","check"],febMinScore:["minScore","num"],febLabels:["showLabels","check"],
      febOnlyStrong:["showOnlyStrong","check"],febConfirm:["confirmMode","text"],
      febVisLimit:["visDistLimit","check"],febVisATR:["visDistATR","num"],
      febUseOI:["useOI","check"],febUseDelta:["useDelta","check"],febUseLS:["useLS","check"],
      febShowBA:["showBuyAggr","check"],febShowSA:["showSellAggr","check"],
      febShowLF:["showLongFlush","check"],febShowSS:["showShortSqz","check"],
      febShowLT:["showLongTrap","check"],febShowST:["showShortTrap","check"],
      febShowBAbs:["showBuyAbs","check"],febShowSAbs:["showSellAbs","check"],
      febLen:["len","int"],febAtrLen:["atrLen","int"],
      febMinVolZ:["minVolZ","num"],febMinOIZ:["minOIZ","num"],
      febMinDZ:["minDeltaZ","num"],febMinMoveATR:["minMoveATR","num"],
      febMerge:["enableMerge","check"],febMergeBars:["mergeBars","int"],febMergeATR:["mergeATR","num"],
      febBubMin:["bubbleMin","num"],febBubMax:["bubbleMax","num"],febOpacity:["bubbleOpacity","num"]
    };
    Object.keys(MAP).forEach(id=>{
      const el=panel.querySelector("#"+id);
      if(!el) return;
      const[key,type]=MAP[id];
      const sync=()=>{
        if(type==="check") state[key]=!!el.checked;
        else if(type==="int") state[key]=parseInt(el.value,10)||DEFAULTS[key];
        else state[key]=el.value||DEFAULTS[key];
        if(RECOMPUTE_KEYS.has(key)) _cache.key="";
        save();
        if(typeof drawSoon==="function") drawSoon();
      };
      el.addEventListener("change",sync);
      el.addEventListener("input",sync);
    });
    Object.keys(COLOR_KEYS).forEach(id=>{
      const btn=panel.querySelector("#"+id);
      if(!btn) return;
      btn.addEventListener("click",()=>openPalette(btn, COLOR_KEYS[id]));
    });
  }

  function resetAll(){
    Object.assign(state,DEFAULTS);
    _cache.key="";
    save();
    renderPanel();
    if(typeof drawSoon==="function") drawSoon();
  }

  // ── Menu Item ─────────────────────────────────────────────────────────────
  function updatePill(){
    const p=document.getElementById("dvlFebState");
    if(p) p.classList.toggle("is-on",!!state.on);
  }

  function insertRow(){
    const menu=document.getElementById("indicatorDropdown");
    if(!menu||document.getElementById("dvlFebItem")) return;
    const item=document.createElement("div");
    item.id="dvlFebItem";
    item.className="indicatorItem";
    item.innerHTML=
      '<span class="indicatorFxMark">FEB</span>'
      +'<span><b>DVL Flow Event Bubbles</b><small>composite flow overlay</small></span>'
      +'<i class="dvl-vt-state'+(state.on?' is-on':'')+'" id="dvlFebState"></i>';
    const sz=document.getElementById("dvlSpikeZonesItem");
    if(sz&&sz.parentNode) sz.parentNode.insertBefore(item,sz.nextSibling);
    else{ const h=menu.querySelector(".indicatorDropHead"); if(h&&h.nextSibling) menu.insertBefore(item,h.nextSibling); else menu.appendChild(item); }
    const pill=item.querySelector("#dvlFebState");
    if(pill) pill.addEventListener("click",ev=>{
      ev.preventDefault(); ev.stopPropagation();
      state.on=!state.on; updatePill(); save();
      if(typeof drawSoon==="function") drawSoon();
    });
    item.addEventListener("click",ev=>{ ev.stopPropagation(); openPanel(); });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",insertRow);
  else setTimeout(insertRow,0);

  window.DVLFlowEventBubbles={ on:()=>!!state.on, setOn:v=>{ state.on=!!v; save(); },
    refresh:()=>{ _cache.key=""; }, get state(){ return Object.assign({},state); } };
  window.DVLFlowEventBubblesDraw=function(ctx,cfg){ try{ draw(ctx,cfg); }catch(_){} };
})();
</script>"""
        fixes.append('FEB script block rewrite (7 fixes)')
        html = html[:si] + NEW_SCRIPT + html[ei+len(FEB_CLOSE):]

# ── 4. Version bump 0.626 → 0.627 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.626";',
    'const DVL_APP_VERSION = "Beta 0.627";',
    'DVL_APP_VERSION 0.626→0.627'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: FEB toggle ON/OFF + liquidation lines OFF por padrão." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: FEB 7 fixes — palette picker, strict conditions, typeof guards, showOnlyStrong, same-type merge, cache key + vol delta label." },\n'
    '  { version: "Beta 0.626", note: "Bugfix: FEB toggle ON/OFF + liquidation lines OFF por padrão." },',
    'DVL_CHANGELOG 0.627'
)
html = rep(html,
    'BETA 0.626</div>',
    'BETA 0.627</div>',
    'versionBadge 0.626→0.627'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.626</title>',
    '<title>DVL Binance Live — Beta 0.627</title>',
    'title 0.626→0.627'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.626",',
    '  window.DVLVolumeProfile = { version:"0.627",',
    'DVLVolumeProfile version 0.627'
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
