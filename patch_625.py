# patch_625.py — Beta 0.625
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.624)
#
# ADD — DVL Flow Event Bubbles
#
#   Overlay no gráfico principal que plota bolhas visuais em candles onde
#   houve evento anormal de fluxo composto (Preço + Volume + OI + Net Delta
#   + Long/Short Ratio opcional).
#
#   Tipos de evento: BUY_AGGRESSION, SELL_AGGRESSION, LONG_FLUSH,
#   SHORT_SQUEEZE, LONG_TRAP, SHORT_TRAP, BUY_ABSORPTION, SELL_ABSORPTION.
#
#   Score ponderado 0-100; apenas eventos >= minScore (default 62) são plotados.
#   Merge de bolhas próximas. Limite visual por ATR. Confirmação não-repaint
#   para LONG_FLUSH. Painel de config completo no padrão DVL.
#
# VERSION: 0.624 → 0.625

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

# ── 1. Draw call in drawPriceSection ─────────────────────────────────────────
html = rep(html,
    '  if(window.DVLVolumeProfileDraw){\n'
    '    window.DVLVolumeProfileDraw(ctx, {\n'
    '      view, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max, symbol\n'
    '    });\n'
    '  }\n'
    '\n'
    '  ctx.restore();',

    '  if(window.DVLVolumeProfileDraw){\n'
    '    window.DVLVolumeProfileDraw(ctx, {\n'
    '      view, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max, symbol\n'
    '    });\n'
    '  }\n'
    '\n'
    '  if(window.DVLFlowEventBubblesDraw){\n'
    '    window.DVLFlowEventBubblesDraw(ctx, { view, win, x, y, x0, x1, y0, y1, slotOffset, candleW });\n'
    '  }\n'
    '\n'
    '  ctx.restore();',

    'drawPriceSection: add DVLFlowEventBubblesDraw call'
)

# ── 2. CSS for FEB panel ──────────────────────────────────────────────────────
html = rep(html,
    '.dvl-sz-panel{\n'
    '  width:min(336px,calc(100vw - 10px))!important;\n'
    '  max-height:min(62svh,520px)!important;\n'
    '}',

    '.dvl-sz-panel{\n'
    '  width:min(336px,calc(100vw - 10px))!important;\n'
    '  max-height:min(62svh,520px)!important;\n'
    '}\n'
    '\n'
    '.dvl-feb-panel{\n'
    '  width:min(390px,calc(100vw - 10px))!important;\n'
    '  max-height:min(80svh,700px)!important;\n'
    '}\n'
    '.dvl-feb-panel .dvl-vt-body{\n'
    '  max-height:calc(min(80svh,700px) - 44px)!important;\n'
    '  overflow-y:auto;\n'
    '  padding:6px 8px 12px!important;\n'
    '}\n'
    '.dvl-feb-panel .dvl-vt-grid{\n'
    '  grid-template-columns:repeat(2,minmax(0,1fr))!important;\n'
    '  gap:5px!important;\n'
    '}\n'
    '.dvl-feb-status{\n'
    '  background:rgba(255,160,0,.08);\n'
    '  border:1px solid rgba(255,160,0,.22);\n'
    '  border-radius:8px;\n'
    '  padding:7px 10px;\n'
    '  margin-bottom:8px;\n'
    '}\n'
    '.dvl-feb-status-line{\n'
    '  font-size:10px;\n'
    '  color:rgba(255,190,60,.9);\n'
    '  line-height:1.55;\n'
    '}\n'
    '.dvl-feb-color{\n'
    '  padding:2px 4px!important;\n'
    '  cursor:pointer;\n'
    '  height:32px!important;\n'
    '}',

    'CSS: DVL Flow Event Bubbles panel'
)

# ── 3. IIFE script tag before </body> ─────────────────────────────────────────
FEB_SCRIPT = r"""
<script id="DVL_BETA_0625_FLOW_EVENT_BUBBLES_JS">
(function(){
  "use strict";

  const STORE_KEY = "dvl_flow_event_bubbles_v1";
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
    const sy=typeof symbol!=="undefined"?symbol:"";
    const iv=typeof interval!=="undefined"?interval:"";
    return sy+"_"+iv+"_"+kls.length+"_"+state.on+"_"+state.minScore+"_"+state.len;
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

    // Net delta from buyVolume (= buyVol - sellVol = 2*buyVol - vol)
    const deltas=kls.map(k=>2*(k.buyVolume||0)-(k.volume||0));
    const dDelta=deltas.map((d,i)=>i===0?0:d-deltas[i-1]);
    const dDeltaSMA=smaFast(dDelta,len);
    const dDeltaSTD=stdevFast(dDelta,dDeltaSMA,len);

    // ATR
    const atrArr=calcATR(kls,atrLen);

    // OI — aligned to kline timestamps via binary search on oiHist
    const oiArr=Array.isArray(oiHist)?oiHist:[];
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
    const lsArr=Array.isArray(lsHist)?lsHist:[];
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

      const deltaAvail=state.useDelta&&dDeltaSTD[i]>0;
      const dD=dDelta[i];
      const deltaZ=deltaAvail?(dD-dDeltaSMA[i])/dDeltaSTD[i]:0;

      const lsAvail=state.useLS&&lsHasData[i]&&lsSTD[i]>0;
      const ratio=lsAvail?lsRatios[i]:1;
      const ratioZ=lsAvail?(ratio-lsSMA[i])/lsSTD[i]:0;

      // Weighted score
      let wV=30,wO=oiAvail?25:0,wD=deltaAvail?25:0,wM=15,wL=lsAvail?5:0;
      const wSum=wV+wO+wD+wM+wL||1;

      const sc=(
        normStr(Math.abs(volZ),state.minVolZ,3.5)*wV +
        normStr(Math.abs(oiZ),state.minOIZ,3.0)*wO +
        normStr(Math.abs(deltaZ),state.minDeltaZ,3.0)*wD +
        normStr(moveATR,state.minMoveATR,1.8)*wM +
        normStr(Math.abs(ratioZ),1.0,2.5)*wL
      )/wSum*100;

      if(sc<state.minScore) continue;

      const cands=[];
      const mV=state.minVolZ, mO=state.minOIZ, mD=state.minDeltaZ, mM=state.minMoveATR;

      // 1. LONG_FLUSH
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

      // 2. SHORT_SQUEEZE
      if(state.showShortSqz && bull && volZ>=mV && oiAvail && dOI<0 && oiZ<=-mO && moveATR>=mM && (dD>0||deltaZ>0)){
        cands.push({type:"SHORT_SQUEEZE",score:sc,idx:i});
      }

      // 3. BUY_ABSORPTION
      if(state.showBuyAbs && volZ>=mV && (!deltaAvail||dD<0||deltaZ<-mD) &&
         (loWick>=body*0.8||closePos>=0.55) && (!oiAvail||dOI>=0)){
        cands.push({type:"BUY_ABSORPTION",score:sc,idx:i});
      }

      // 4. SELL_ABSORPTION
      if(state.showSellAbs && volZ>=mV && (!deltaAvail||dD>0||deltaZ>mD) &&
         (upWick>=body*0.8||closePos<=0.45) && (!oiAvail||dOI>=0)){
        cands.push({type:"SELL_ABSORPTION",score:sc,idx:i});
      }

      // 5. BUY_AGGRESSION
      if(state.showBuyAggr && bull && volZ>=mV &&
         (!oiAvail||(dOI>0&&oiZ>=mO)) &&
         (!deltaAvail||(dD>0&&deltaZ>=mD)) && moveATR>=mM){
        cands.push({type:"BUY_AGGRESSION",score:sc,idx:i});
      }

      // 6. SELL_AGGRESSION
      if(state.showSellAggr && bear && volZ>=mV &&
         (!oiAvail||(dOI>0&&oiZ>=mO)) &&
         (!deltaAvail||(dD<0&&deltaZ<=-mD)) && moveATR>=mM){
        cands.push({type:"SELL_AGGRESSION",score:sc,idx:i});
      }

      // 7. LONG_TRAP
      if(state.showLongTrap && oiAvail && dOI>0 && oiZ>=mO){
        const rHi=Math.max(...kls.slice(Math.max(0,i-LB),i).map(c=>c.high));
        const lsTrap=!lsAvail||ratio>=state.ratioHigh||ratioZ>=1.2;
        const dWeak=!deltaAvail||dD<0||deltaZ<0;
        const noFol=upWick>=body*0.5||closePos<0.5;
        if(lsTrap&&dWeak&&noFol&&k.high>=rHi*0.998)
          cands.push({type:"LONG_TRAP",score:sc*0.85,idx:i});
      }

      // 8. SHORT_TRAP
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
      const dir=DIR[e.type];
      for(let j=i+1;j<evs.length;j++){
        if(used[j]) continue;
        const e2=evs[j];
        if(DIR[e2.type]!==dir) continue;
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
    const kls=Array.isArray(klines)?klines:[];
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
  function colInp(id,val){ return `<input id="${id}" class="dvl-vt-input dvl-feb-color" type="color" value="${val}">`; }

  function dataStatus(){
    const oiOk=Array.isArray(oiHist)&&oiHist.length>0;
    const lsOk=Array.isArray(lsHist)&&lsHist.length>0;
    const klOk=Array.isArray(klines)&&klines.length>0&&klines[0].buyVolume!==undefined;
    const msgs=[];
    if(!oiOk) msgs.push("OI data unavailable — open interest signals disabled");
    if(!lsOk) msgs.push("L/S data unavailable — long/short ratio signals disabled");
    if(!klOk) msgs.push("Net Delta unavailable — delta signals disabled");
    if(!msgs.length) return "";
    return '<div class="dvl-feb-status">'+msgs.map(m=>'<div class="dvl-feb-status-line">'+m+'</div>').join("")+'</div>';
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
        ${fld("Net Delta",sw("febUseDelta",state.useDelta))}
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
        ${fld("Buy Aggr",colInp("febClrBA",state.clrBuyAggr))}
        ${fld("Sell Aggr",colInp("febClrSA",state.clrSellAggr))}
        ${fld("Long Flush",colInp("febClrLF",state.clrLongFlush))}
        ${fld("Short Sqz",colInp("febClrSS",state.clrShortSqz))}
        ${fld("Long Trap",colInp("febClrLT",state.clrLongTrap))}
        ${fld("Short Trap",colInp("febClrST",state.clrShortTrap))}
        ${fld("Buy Abs",colInp("febClrBAbs",state.clrBuyAbs))}
        ${fld("Sell Abs",colInp("febClrSAbs",state.clrSellAbs))}
      </div>
    </div>`;
    bindPanel();
  }

  const RECOMPUTE_KEYS=new Set(["len","atrLen","minScore","minVolZ","minOIZ","minDeltaZ",
    "minMoveATR","useOI","useDelta","useLS","enableMerge","mergeBars","mergeATR","confirmMode",
    "showBuyAggr","showSellAggr","showLongFlush","showShortSqz","showLongTrap",
    "showShortTrap","showBuyAbs","showSellAbs"]);

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
      febBubMin:["bubbleMin","num"],febBubMax:["bubbleMax","num"],febOpacity:["bubbleOpacity","num"],
      febClrBA:["clrBuyAggr","text"],febClrSA:["clrSellAggr","text"],
      febClrLF:["clrLongFlush","text"],febClrSS:["clrShortSqz","text"],
      febClrLT:["clrLongTrap","text"],febClrST:["clrShortTrap","text"],
      febClrBAbs:["clrBuyAbs","text"],febClrSAbs:["clrSellAbs","text"]
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
    if(p) p.textContent=state.on?"ON":"OFF";
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
      +'<i class="dvl-vt-state" id="dvlFebState">'+(state.on?"ON":"OFF")+'</i>';
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
</script>
"""

html = rep(html,
    '\n</body>\n</html>',
    FEB_SCRIPT + '\n</body>\n</html>',
    'insert DVLFlowEventBubbles script tag'
)

# ── 4. Version bump 0.624 → 0.625 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.624";',
    'const DVL_APP_VERSION = "Beta 0.625";',
    'DVL_APP_VERSION 0.624→0.625'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: OI live poll 1m — dados reais de OI em 1m via polling real-time." },',
    '{ version: DVL_APP_VERSION, note: "Feature: DVL Flow Event Bubbles — overlay de eventos compostos de fluxo." },\n'
    '  { version: "Beta 0.624", note: "Feature: OI live poll 1m — dados reais de OI em 1m via polling real-time." },',
    'DVL_CHANGELOG 0.625'
)
html = rep(html,
    'BETA 0.624</div>',
    'BETA 0.625</div>',
    'versionBadge 0.624→0.625'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.624</title>',
    '<title>DVL Binance Live — Beta 0.625</title>',
    'title 0.624→0.625'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.624",',
    '  window.DVLVolumeProfile = { version:"0.625",',
    'DVLVolumeProfile version 0.625'
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
