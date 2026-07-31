(function(){
  "use strict";
  if(window.DVLVPRowLayout1345)return;
  const tickBySymbol=Object.create(null);
  let exchangeInfoLoading=null;

  function normSymbol(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}
  function cleanTick(v){v=Number(v);return isFinite(v)&&v>0?v:null;}
  function decimalsOf(v){
    const s=String(v);
    if(/[eE]/.test(s)){
      const m=s.match(/^[-+]?(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
      if(!m)return 0;
      return Math.max(0,(m[2]||"").length-(Number(m[3])||0));
    }
    const p=s.indexOf(".");return p<0?0:s.length-p-1;
  }
  function inferTick(candles){
    let maxDec=0, seen=0;
    const arr=Array.isArray(candles)?candles:[];
    for(let i=Math.max(0,arr.length-180);i<arr.length;i++){
      const c=arr[i]||{};
      for(const k of ["open","high","low","close"]){
        const v=Number(c[k]);if(!isFinite(v))continue;
        maxDec=Math.max(maxDec,Math.min(12,decimalsOf(v)));seen++;
      }
    }
    if(!seen)return .01;
    return Math.pow(10,-maxDec);
  }
  function loadExchangeInfo(){
    if(exchangeInfoLoading)return exchangeInfoLoading;
    exchangeInfoLoading=fetch("https://fapi.binance.com/fapi/v1/exchangeInfo",{cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject(new Error("exchangeInfo "+r.status)))
      .then(j=>{
        const list=j&&Array.isArray(j.symbols)?j.symbols:[];
        for(const s of list){
          const sym=normSymbol(s&&s.symbol);if(!sym)continue;
          const fs=Array.isArray(s.filters)?s.filters:[];
          const pf=fs.find(f=>f&&f.filterType==="PRICE_FILTER");
          const tick=cleanTick(pf&&pf.tickSize);
          if(tick)tickBySymbol[sym]=tick;
        }
        try{if(typeof drawSoon==="function")drawSoon();}catch(_){}
        return tickBySymbol;
      }).catch(()=>tickBySymbol);
    return exchangeInfoLoading;
  }
  function tickSize(symbol,candles){
    const sym=normSymbol(symbol);
    const known=cleanTick(tickBySymbol[sym]);
    if(known)return known;
    loadExchangeInfo();
    return inferTick(candles);
  }
  function resolve(o){
    o=o||{};
    let min=Number(o.min),max=Number(o.max);
    if(!isFinite(min)||!isFinite(max)||max<=min)return null;
    const mode=o.mode==="ticks"?"ticks":"rows";
    if(mode!=="ticks"){
      const rows=Math.max(1,Math.min(Number(o.maxRows)||12000,Math.round(Number(o.rows)||120)));
      return {mode:"rows",min,max,rows,ppr:(max-min)/rows,tickSize:tickSize(o.symbol,o.candles),requestedTicks:null,effectiveTicks:null,capped:false};
    }
    const tick=Math.max(Number.EPSILON,tickSize(o.symbol,o.candles));
    const requestedTicks=Math.max(1,Math.round(Number(o.ticksPerRow)||2));
    const maxRows=Math.max(100,Math.round(Number(o.maxRows)||12000));
    let effectiveTicks=requestedTicks;
    let step=tick*effectiveTicks;
    let eps=step*1e-8;
    let alignedMin=Math.floor((min+eps)/step)*step;
    let alignedMax=Math.ceil((max-eps)/step)*step;
    if(!(alignedMax>alignedMin))alignedMax=alignedMin+step;
    let rows=Math.max(1,Math.round((alignedMax-alignedMin)/step));
    let capped=false;
    if(rows>maxRows){
      effectiveTicks=requestedTicks*Math.ceil(rows/maxRows);
      step=tick*effectiveTicks;eps=step*1e-8;
      alignedMin=Math.floor((min+eps)/step)*step;
      alignedMax=Math.ceil((max-eps)/step)*step;
      if(!(alignedMax>alignedMin))alignedMax=alignedMin+step;
      rows=Math.max(1,Math.round((alignedMax-alignedMin)/step));
      capped=true;
    }
    alignedMax=alignedMin+rows*step;
    return {mode:"ticks",min:alignedMin,max:alignedMax,rows,ppr:step,tickSize:tick,requestedTicks,effectiveTicks,capped};
  }
  function visualize(o){
    o=o||{};
    const rawRows=Math.max(0,Math.round(Number(o.rows)||0));
    const mode=o.mode==="ticks"?"ticks":"rows";
    const visualRows=Math.max(20,Math.min(500,Math.round(Number(o.visualRows)||120)));
    const groupSize=mode==="ticks"&&rawRows>visualRows?Math.ceil(rawRows/visualRows):1;
    const rows=rawRows?Math.ceil(rawRows/groupSize):0;
    const aggregate=(src)=>{
      const out=new Float64Array(rows);
      if(!src||!rows)return out;
      const n=Math.min(rawRows,Number(src.length)||0);
      for(let i=0;i<n;i++)out[Math.floor(i/groupSize)]+=Number(src[i])||0;
      return out;
    };
    const buy=aggregate(o.buy),sell=aggregate(o.sell);
    let bins=o.bins?aggregate(o.bins):new Float64Array(rows);
    if(!o.bins&&(o.buy||o.sell))for(let i=0;i<rows;i++)bins[i]=buy[i]+sell[i];
    const delta=aggregate(o.delta);
    let maxBucket=0,maxDelta=0;
    for(let i=0;i<rows;i++){
      if(bins[i]>maxBucket)maxBucket=bins[i];
      const ad=Math.abs(delta[i]);if(ad>maxDelta)maxDelta=ad;
    }
    return {
      mode,rows,rawRows,visualRows,groupSize,buy,sell,bins,delta,maxBucket,maxDelta,
      min:Number(o.min)||0,rawPpr:Number(o.ppr)||0,
      groupOf:(idx)=>Math.max(0,Math.min(Math.max(0,rows-1),Math.floor((Number(idx)||0)/groupSize))),
      rawLo:(g)=>Math.max(0,Math.min(rawRows,Math.floor(Number(g)||0)*groupSize)),
      rawHi:(g)=>Math.max(-1,Math.min(rawRows-1,(Math.floor(Number(g)||0)+1)*groupSize-1))
    };
  }

  function bindEditable(root,apply){
    if(!root||typeof apply!=="function")return;
    root.querySelectorAll(".dvl-feb-step-val").forEach(el=>{
      if(el.dataset.dvlDirect1345==="1")return;
      const id=String(el.id||"").replace(/Val$/,"");
      const btn=root.querySelector('.dvl-feb-step-btn[data-id="'+id+'"]');
      if(!id||!btn)return;
      el.dataset.dvlDirect1345="1";
      el.contentEditable="true";el.tabIndex=0;el.setAttribute("role","spinbutton");el.setAttribute("inputmode","decimal");
      let old=el.textContent;
      const finish=(cancel)=>{
        if(cancel){el.textContent=old;return;}
        let raw=String(el.textContent||"").trim().replace(",",".");
        let v=Number(raw),mn=Number(btn.dataset.min),mx=Number(btn.dataset.max),dec=Math.max(0,Number(btn.dataset.dec)||0);
        if(!isFinite(v))v=Number(old)||0;
        v=Math.max(mn,Math.min(mx,v));
        const shown=dec?v.toFixed(dec):String(Math.round(v));
        el.textContent=shown;old=shown;apply(id,Number(shown));
      };
      el.addEventListener("focus",()=>{old=el.textContent;try{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);}catch(_){}});
      el.addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();el.blur();}else if(e.key==="Escape"){e.preventDefault();finish(true);el.blur();}});
      el.addEventListener("blur",()=>finish(false));
      el.addEventListener("pointerdown",e=>e.stopPropagation());
    });
  }
  window.DVLVPRowLayout1345={version:"1.347",resolve,visualize,tickSize,loadExchangeInfo,bindEditable,get ticks(){return Object.assign({},tickBySymbol);}};
  loadExchangeInfo();
})();
