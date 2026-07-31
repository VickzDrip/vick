(function(){
  "use strict";

  /*
    Rebuilt from the uploaded dvl_open_interest_longshort.js base:
    - parse OI into candle-like open/high/low/close points;
    - use Binance public futures data by default;
    - keep CoinGlass-friendly source/period structure for future API key support;
    - draw OI as clean candlesticks, not the ugly line/bar hybrid.
  */

  const KEY = "dvl_cg_style_open_interest_v1";
  const CACHE = { key:"", data:[], fetching:false, ts:0, src:"", err:"" };
  let _liveOI  = new Map(); // 1m live OI: t(ms) → {t,openC,highC,lowC,closeC,openU,highU,lowU,closeU}
  let _liveSym = '';
  const DEFAULTS = {
    on:true,
    source:"binance",
    unit:"usd",
    maLen:20,
    viewCount:140,
    offset:-24,
    center:null,
    range:null
  };

  let state = load();
  /* NÃO force ligado no boot. Isto RESSUSCITAVA o DVL AGG OI toda vez: você
     desligava, recarregava e ele voltava (e ainda regravava on:true no
     localStorage, então nem Salvar segurava). O padrão (DEFAULTS.on) já liga
     pra quem nunca mexeu; quem DESLIGOU de propósito tem que continuar
     desligado. */
  let drag = null;
  let pointers = new Map();
  let pinch = null;

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function load(){
    try{
      return Object.assign(clone(DEFAULTS), JSON.parse(localStorage.getItem(KEY) || "null") || {});
    }catch(_){
      return clone(DEFAULTS);
    }
  }

  function save(redraw=true){
    const len = Array.isArray(klines) ? klines.length : 0;
    state.viewCount = clamp(Number(state.viewCount) || DEFAULTS.viewCount, 20, Math.max(50, len + 240));
    state.offset = clamp(Number(state.offset) || DEFAULTS.offset, -Math.max(160, state.viewCount), Math.max(0, len - 20));
    if(state.center != null && !Number.isFinite(Number(state.center))) state.center = null;
    if(state.range != null) state.range = clamp(Number(state.range) || 0, 0.0001, 1e15);
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    updateRow();
    if(redraw){
      if(typeof drawSoon === "function") drawSoon();
      else if(typeof draw === "function") draw();
    }
  }

  function on(){ return !!state.on; }
  function setOn(v){
    state.on = !!v;
    save();
    if(state.on) ensureData(true);
  }

  function sym(){
    try{ return String(symbol || "BTCUSDT").toUpperCase(); }catch(_){ return "BTCUSDT"; }
  }

  function coin(){
    return sym().replace(/USDT|USD|PERP|BUSD/gi,"") || "BTC";
  }

  function period(){
    try{ return typeof intervalToPeriod === "function" ? intervalToPeriod(interval) : "5m"; }
    catch(_){ return "5m"; }
  }

  function arrFromResp(j){
    if(Array.isArray(j)) return j;
    if(Array.isArray(j?.data)) return j.data;
    if(Array.isArray(j?.data?.list)) return j.data.list;
    if(Array.isArray(j?.result)) return j.result;
    return [];
  }

  function tsOf(o){
    if(Array.isArray(o)) return +o[0] || +o.t || 0;
    return +(o.timestamp || o.time || o.t || o.date || o.createTime || 0);
  }

  function nval(o, keys){
    if(Array.isArray(o)){
      for(const i of keys){
        const v = +o[i];
        if(Number.isFinite(v)) return v;
      }
      return 0;
    }
    for(const k of keys){
      const v = +o[k];
      if(Number.isFinite(v)) return v;
    }
    return 0;
  }

  function parseOI(arr, isCoinGlass){
    const useCoins = state.unit === "coins";
    const parsed = arr.map((o, idx) => {
      const t = tsOf(o);

      let open = nval(o, ["open","o",1]);
      let high = nval(o, ["high","h",2]);
      let low = nval(o, ["low","l",3]);
      let close = nval(o, ["close","c","value","sumOpenInterestValue",4]);
      let qty = nval(o, ["sumOpenInterest","openInterest","qty","coin",5]);
      let usd = 0;

      if(!isCoinGlass){
        const usdV = nval(o, ["sumOpenInterestValue","value","close","c"]);
        const coinV = nval(o, ["sumOpenInterest","openInterest","qty"]);
        const prev = idx && arr[idx-1] ? arr[idx-1] : null;
        usd = usdV;
        qty = coinV;
        close = useCoins ? coinV : usdV;
        open = prev ? (useCoins ? nval(prev,["sumOpenInterest","openInterest","qty"]) : nval(prev,["sumOpenInterestValue","value","close","c"])) : close;
        high = Math.max(open, close);
        low = Math.min(open, close);
      }

      if(!open) open = idx && arr[idx-1] ? nval(arr[idx-1], isCoinGlass ? ["close","c","value",4] : ["sumOpenInterestValue","value","close","c"]) : close;
      if(!high) high = Math.max(open, close);
      if(!low) low = Math.min(open, close);

      return { t, open, high, low, close, qty, usd };
    }).filter(d => d.t && Number.isFinite(d.close) && d.close > 0)
      .sort((a,b) => a.t - b.t);

    return parsed;
  }

  async function fetchJson(url, opts){
    const r = await fetch(url, Object.assign({cache:"no-store"}, opts || {}));
    if(!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  }

  /* MEXC-only assets have no Binance OI. Pull the REAL DVL Open Interest
     candles the backend builds from MEXC holdVol snapshots — genuine OHLC per
     the CHART timeframe (open/high/low/close of holdVol in the bucket), with
     unit conversion applied server-side via the per-asset contractSize:
       contracts = holdVol · base = holdVol×contractSize · usdt = base×fairPrice
     History grows forward from when sampling started; closed candles are
     immutable. Returns the same row shape parseOI() produces. */
  async function fetchMexcOiSeries(){
    try{
      const tf = (typeof interval === "string" && interval) ? interval : period();
      const unit = state.unit === "coins" ? "base" : (state.unit === "usd" ? "usdt" : (state.unit || "contracts"));
      const j = await fetchJson("/api/dvl/scanner/mexc-oi?symbol=" + encodeURIComponent(sym())
        + "&tf=" + encodeURIComponent(tf) + "&unit=" + encodeURIComponent(unit) + "&limit=600");
      const cs = (j && Array.isArray(j.candles)) ? j.candles : [];
      if(cs.length < 2) return [];
      return cs.map(c => {
        const t = +c.time, open = +c.open, high = +c.high, low = +c.low, close = +c.close;
        return { t, open, high, low, close, qty: close, usd: close };
      }).filter(d => d.t && Number.isFinite(d.close) && d.close > 0).sort((a,b)=>a.t-b.t);
    }catch(_){ return []; }
  }

  async function ensureData(force=false, allowOff=false){
    if(!on() && !allowOff) return;
    const p = period();
    /* include the chart interval so switching TF always refetches — the MEXC
       OI candles are aggregated to the CHART timeframe, and two intervals can
       map to the same Binance period() otherwise (1m & 3m → "5m"). */
    const key = ["binance", sym(), p, state.unit, (typeof interval==="string"?interval:"")].join("|");

    if(!force && CACHE.key === key && CACHE.data.length && Date.now() - CACHE.ts < 45000) return;
    if(CACHE.fetching) return;

    CACHE.fetching = true;
    CACHE.err = "";
    updateRow();

    try{
      const _oiBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");
      const _oiPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;
      const _oiNow = Date.now();
      const _oiUrl = (n) => _oiBase + "/openInterestHist?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_oiNow-n*500*_oiPMs):"");
      const [_oiR0,_oiR1,_oiR2] = await Promise.all([fetchJson(_oiUrl(0)),fetchJson(_oiUrl(1)).catch(()=>[]),fetchJson(_oiUrl(2)).catch(()=>[])]);
      const _oiSeen=new Set();
      const arr = [arrFromResp(_oiR0),arrFromResp(_oiR1),arrFromResp(_oiR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_oiSeen.has(k))return false;_oiSeen.add(k);return true;});
      let data = parseOI(arr, false);
      let srcLabel = "AGREGADO";

      if(!data.length){
        /* Binance has no OI for this symbol (e.g. a MEXC-only asset) → use the
           REAL MEXC OI series the backend samples from holdVol over time. */
        const mx = await fetchMexcOiSeries();
        if(!mx.length) throw new Error("NO DATA");
        data = mx;
        srcLabel = "MEXC";
      }

      // Sub-period wicks: fetch finer-grained OI to derive real intra-candle
      // high/low. Only exists for the Binance source — skip for the MEXC series.
      const _subPMap={"15m":"5m","30m":"5m","1h":"15m","2h":"30m","4h":"1h","6h":"1h","12h":"4h","1d":"4h"};
      const _subP = srcLabel === "AGREGADO" ? _subPMap[p] : null;
      if(_subP){
        try{
          const _subUrl2=(n)=>_oiBase+"/openInterestHist?symbol="+encodeURIComponent(sym())+"&period="+encodeURIComponent(_subP)+"&limit=500"+(n>0?"&endTime="+(_oiNow-n*500*_oiPMs):"");
          const [_s0,_s1,_s2]=await Promise.all([fetchJson(_subUrl2(0)).catch(()=>[]),fetchJson(_subUrl2(1)).catch(()=>[]),fetchJson(_subUrl2(2)).catch(()=>[])]);
          const _subSeen2=new Set();
          const _subArr=[arrFromResp(_s0),arrFromResp(_s1),arrFromResp(_s2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_subSeen2.has(k))return false;_subSeen2.add(k);return true;});
          const _useC=state.unit==="coins";
          const _subByMain=new Map();
          for(const x of _subArr){
            const tSub=+x.timestamp;
            const mainT=Math.ceil(tSub/_oiPMs)*_oiPMs;
            if(!_subByMain.has(mainT))_subByMain.set(mainT,[]);
            _subByMain.get(mainT).push(_useC?+x.sumOpenInterest:+x.sumOpenInterestValue);
          }
          for(const d of data){
            const sv=_subByMain.get(d.t);
            if(sv&&sv.length>=2){
              const all=[d.open,d.close,...sv];
              d.high=Math.max(...all);
              d.low=Math.min(...all);
            }
          }
        }catch(_){}
      }

      CACHE.key = key;
      CACHE.data = data;
      CACHE.ts = Date.now();
      CACHE.src = srcLabel;
      CACHE.err = "";

      try{
        oiHist = data.map(d => ({ time:d.t, value:d.usd||d.close, qty:d.qty }));
        derivativesDataReal = true;
      }catch(_){}
    }catch(e){
      CACHE.err = String(e && e.message || e);
      CACHE.data = [];
      try{
        oiHist = [];
        derivativesDataReal = false;
      }catch(_){}
    }finally{
      CACHE.fetching = false;
      updateRow();
      if(typeof drawSoon === "function") drawSoon();
    }
  }

  function canvas(){ return document.getElementById("chart"); }

  function panelMetrics(padL, padR, top, h, w){
    const scaleW = (typeof PRICE_SCALE_W !== "undefined" ? PRICE_SCALE_W : 55);
    const labelGap = (typeof PRICE_LABEL_GAP !== "undefined" ? PRICE_LABEL_GAP : 2);
    const labelW = (typeof PRICE_LABEL_W !== "undefined" ? PRICE_LABEL_W : scaleW - 4);
    const x0 = padL;
    const x1 = w - padR;
    const y0 = top + 4;
    const y1 = top + h - 6;
    return { padL, padR, top, h, w, scaleW, labelGap, labelW, x0, x1, y0, y1, scaleX0:x1+labelGap, scaleX1:x1+labelGap+labelW };
  }

  function metricsFromBounds(rect){
    const b = window.__dvlOscillatorPanelBounds && window.__dvlOscillatorPanelBounds.openInterest;
    if(!b || !Number.isFinite(b.top) || !Number.isFinite(b.h)) return null;
    return panelMetrics(0, 55, b.top, b.h, rect.width);
  }

  function localPoint(ev){
    const c = canvas();
    if(!c) return null;
    const r = c.getBoundingClientRect();
    return { x:ev.clientX-r.left, y:ev.clientY-r.top, rect:r };
  }

  function isInsidePanel(ev){
    if(!on()) return false;
    const p = localPoint(ev);
    if(!p) return false;
    const m = metricsFromBounds(p.rect);
    return !!(m && p.y >= m.top && p.y <= m.top + m.h);
  }

  function isOnScale(ev){
    const p = localPoint(ev);
    if(!p) return false;
    const m = metricsFromBounds(p.rect);
    return !!(m && p.y >= m.top && p.y <= m.top + m.h && p.x >= m.x1 - 10);
  }

  function visibleRange(){
    const len = Array.isArray(klines) ? klines.length : 0;
    const end = len + Number(state.offset || 0);
    const start = end - Number(state.viewCount || 140);
    return { start, end, len };
  }

    function oscillatorWindow(){
    try{
      if(typeof visibleWindow === "function") return visibleWindow();
    }catch(_){}

    const count = (typeof chartViewCount !== "undefined" ? chartViewCount : 140);
    return {
      candles:[],
      totalSlots:count,
      futureSlots:0,
      start:0,
      end:0
    };
  }


  function candleSpacing(m){
    /*
      Horizontal pan speed must match the main chart.
      Use the main chartViewCount as the source of truth.
    */
    const count = (typeof chartViewCount !== "undefined" ? chartViewCount : 140);
    return Math.max(1, (m.x1 - m.x0) / Math.max(count, 1));
  }

  function currentStep(){
    try{ return typeof intervalMs === "function" ? intervalMs(interval) : 60_000; }
    catch(_){ return 60_000; }
  }

  function valueAt(data, t){
    if(!data || !data.length) return null;
    /* No data before the first collected point → return null (empty), not the
       first point. Otherwise a short series (e.g. a MEXC asset whose OI/funding
       collection just started) stretches its first bar across the whole
       pre-collection region and the MA/line dives across the gap. */
    if(t < data[0].t) return null;
    if(t >= data[data.length-1].t) return data[data.length-1];
    let lo = 0, hi = data.length - 1;
    while(lo < hi){
      const mid = (lo + hi + 1) >> 1;
      if(data[mid].t <= t) lo = mid;
      else hi = mid - 1;
    }
    return data[lo];
  }

  function valuesForVisible(view){
    if(!view.length) return [];
    const out = [];
    for(let i=0; i<view.length; i++){
      const d = bestOI(Number(view[i].time));
      if(d) out.push(d);
    }
    return out;
  }

  // Retorna dado de OI para o instante t: prioriza live 1m, fallback histórico 5m
  function bestOI(t){
    const live = _liveOI.get(t);
    if(live){
      const useCoins = state.unit === 'coins';
      return {
        t:      live.t,
        open:   useCoins ? live.openC  : (live.openU  || live.openC),
        high:   useCoins ? live.highC  : (live.highU  || live.highC),
        low:    useCoins ? live.lowC   : (live.lowU   || live.lowC),
        close:  useCoins ? live.closeC : (live.closeU || live.closeC),
        qty:    live.closeC,
        usd:    live.closeU
      };
    }
    return valueAt(CACHE.data, t);
  }

  // Série mesclada (histórico 5m + live 1m) para cálculo de MA
  function mergedSeries(){
    const hist = CACHE.data || [];
    const live = Array.from(_liveOI.values())
      .sort((a,b)=>a.t-b.t)
      .map(lv=>{
        const useCoins = state.unit==='coins';
        return { t:lv.t,
          open:  useCoins?lv.openC :(lv.openU ||lv.openC),
          high:  useCoins?lv.highC :(lv.highU ||lv.highC),
          low:   useCoins?lv.lowC  :(lv.lowU  ||lv.lowC),
          close: useCoins?lv.closeC:(lv.closeU||lv.closeC) };
      });
    if(!live.length) return hist;
    const cutT = live[0].t;
    return [...hist.filter(d=>d.t < cutT), ...live];
  }

  // Poll OI em tempo real → barras de 1m
  async function _pollLiveOI(){
    try{
      const s = sym();
      const r = await fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol='+s);
      const d = await r.json();
      if(!d || !d.openInterest) return;
      const coinQty = +d.openInterest;
      if(!coinQty) return;
      const price = (typeof ticker!=='undefined' && +ticker?.lastPrice)
                 || (Array.isArray(klines)&&klines.length ? +klines.at(-1).close : 0);
      const usdVal = price ? coinQty * price : 0;
      if(s !== _liveSym){ _liveOI.clear(); _liveSym = s; }
      const t = Math.floor(Date.now()/60000)*60000;
      const prev = _liveOI.get(t);
      if(prev){
        prev.closeC = coinQty; prev.highC = Math.max(prev.highC,coinQty); prev.lowC = Math.min(prev.lowC,coinQty);
        prev.closeU = usdVal;  prev.highU = Math.max(prev.highU,usdVal);  prev.lowU = Math.min(prev.lowU,usdVal);
      } else {
        let prevT = t-60000; let pBar = null;
        while(!pBar && prevT > t-600000){ pBar=_liveOI.get(prevT); prevT-=60000; }
        const oC = pBar?pBar.closeC:coinQty, oU = pBar?pBar.closeU:usdVal;
        _liveOI.set(t,{ t,
          openC:oC, highC:Math.max(oC,coinQty), lowC:Math.min(oC,coinQty), closeC:coinQty,
          openU:oU, highU:Math.max(oU,usdVal),  lowU:Math.min(oU,usdVal),  closeU:usdVal });
        if(_liveOI.size > 300) _liveOI.delete([..._liveOI.keys()][0]);
      }
      if(typeof drawSoon==='function') drawSoon();
    }catch(_){}
  }

  function autoScale(vals){
    if(!vals.length) return {min:0,max:1,center:.5,range:1};
    const pts=[];
    for(const v of vals){
      pts.push(v.low||v.close, v.open||v.close, v.close, v.high||v.close);
    }
    pts.sort((a,b)=>a-b);
    const n=pts.length;
    const i02=Math.max(0,Math.floor(n*0.02));
    const i98=Math.min(n-1,Math.ceil(n*0.98)-1);
    let min=pts[i02];
    let max=pts[i98];
    const r=(max-min)||Math.max(1,max*.002);
    min-=r*.16;
    max+=r*.16;
    return {min,max,center:(min+max)/2,range:max-min};
  }

  function currentScale(vals){
    if(Number.isFinite(Number(state.center)) && Number.isFinite(Number(state.range)) && Number(state.range) > 0){
      const center = Number(state.center);
      const range = Number(state.range);
      return { min:center-range/2, max:center+range/2, center, range };
    }
    return autoScale(vals);
  }

  function yMap(m, v, sc){
    return m.y1 - (v - sc.min) / Math.max(sc.max - sc.min, 0.000001) * (m.y1 - m.y0);
  }

  function valueAtY(y, m, sc){
    return sc.max - (y - m.y0) / Math.max(m.y1 - m.y0, 1) * (sc.max - sc.min);
  }

  function fmtMoney(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return "--";
    const a = Math.abs(n);
    if(a >= 1e12) return "$" + (n/1e12).toFixed(2) + "T";
    if(a >= 1e9) return "$" + (n/1e9).toFixed(2) + "B";
    if(a >= 1e6) return "$" + (n/1e6).toFixed(1) + "M";
    if(a >= 1e3) return "$" + (n/1e3).toFixed(0) + "K";
    return "$" + n.toFixed(0);
  }

  function fmtCoins(v){
    const n=Number(v);
    if(!Number.isFinite(n))return"--";
    const a=Math.abs(n);
    if(a>=1e6)return(n/1e6).toFixed(2)+"M";
    if(a>=1e3)return(n/1e3).toFixed(1)+"K";
    return n.toFixed(2);
  }
  function fmtScale(v){
    return state.unit==="coins" ? fmtCoins(v) : fmtMoney(v);
  }

  function basePanel(ctx, m, title, right, kind){
    ctx.save();

    /*
      Keep the oscillator panel on the official DVL background.
      No separate title/header box: title is only a compact overlay.
    */
    ctx.fillStyle = "#020806";
    ctx.fillRect(0, m.top, m.w, m.h);

    ctx.strokeStyle = "rgba(64,105,145,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, m.top + .5);
    ctx.lineTo(m.w, m.top + .5);
    ctx.stroke();

    ctx.strokeStyle = "rgba(122,155,145,.092)";
    ctx.lineWidth = .85;
    for(let n=1; n<=3; n++){
      const y = m.y0 + (m.y1-m.y0)*n/4;
      ctx.beginPath();
      ctx.moveTo(m.x0, y);
      ctx.lineTo(m.x1, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#020806";
    ctx.fillRect(m.x1, m.top, m.w - m.x1, m.h);

    ctx.strokeStyle = "rgba(64,105,145,.26)";
    ctx.beginPath();
    ctx.moveTo(m.x1 + .5, m.top);
    ctx.lineTo(m.x1 + .5, m.top + m.h);
    ctx.stroke();

    const headY = m.y0 + 12;

    ctx.font = "850 9px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(223,238,255,.84)";
    ctx.fillText(title, m.x0 + 18, headY);

    ctx.font = "800 9px system-ui";
    ctx.textAlign = "right";
    ctx.fillStyle = kind === "bear" ? "rgba(255,95,110,.88)" : kind === "bull" ? "rgba(0,220,190,.88)" : "rgba(135,155,185,.86)";
    ctx.fillText(right || "", m.x1 - 8, headY);

    ctx.restore();
  }

  function xForIndex(i, m, win){
    const slots = Math.max(2, win.totalSlots || 2);
    const slotOffset = __dvlSlotOffset(win, win.candles || []);
    return m.x0 + (slotOffset + i) / (slots-1) * (m.x1-m.x0);
  }

  function drawScaleTag(ctx, m, value, sc){
    const yy = clamp(yMap(m, value, sc), m.y0 + 18, m.y1 - 18);
    const tx = m.x1 + m.labelGap;
    const tagW = m.labelW;
    const tagH = DVL_SCALE_LABEL_H;

    if(typeof roundRect === "function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#10df77");
    else{
      ctx.fillStyle = "#10df77";
      ctx.fillRect(tx, yy-tagH/2, tagW, tagH);
    }

    ctx.fillStyle = "#02120b";
    ctx.font = "900 " + DVL_SCALE_LABEL_FONT + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fmtScale(value), tx + tagW/2, yy);
  }

  function draw(ctx, padL, padR, top, h, w){
    window.__dvlOscillatorPanelBounds = window.__dvlOscillatorPanelBounds || {};
    window.__dvlOscillatorPanelBounds.openInterest = { top, h, w, padL, padR };

    if(!CACHE.fetching && on()) ensureData(false);

    const m = panelMetrics(padL, padR, top, h, w);
    const win = oscillatorWindow();
    const view = win.candles || [];
    const vals = valuesForVisible(view);
    const allScale = vals.length ? vals : (CACHE.data || []).slice(-160);
    const sc = currentScale(allScale);

    const last = vals.length ? vals[vals.length-1] : (CACHE.data || []).at(-1);
    const prev = vals.length > 1 ? vals[vals.length-2] : ((CACHE.data || []).length > 1 ? (CACHE.data || []).at(-2) : last);
    const pct = last && prev && prev.close ? ((last.close - prev.close) / prev.close * 100) : 0;
    const kind = pct > 0 ? "bull" : pct < 0 ? "bear" : "neutral";
    const right = last ? ((state.unit==="coins"?fmtCoins(last.close)+" "+coin():fmtMoney(last.close)) + " " + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%") : (CACHE.fetching ? "LOADING" : "NO DATA");

    ctx.save();
    basePanel(ctx, m, "DVL AGG OI", right, kind);

    ctx.save();
    ctx.beginPath();
    ctx.rect(m.x0, m.y0, m.x1-m.x0, Math.max(1, m.y1-m.y0));
    ctx.clip();

    if(vals.length){
      const bw = Math.max(3.5, Math.min(11, ((m.x1-m.x0)/Math.max(1, win.totalSlots || view.length || 80))*0.72));

      // Uma barra por período OI: agrupa candles com mesmo timestamp (1m se live, 5m se histórico)
      { let ii = 0;
        while(ii < view.length){
          const d = bestOI(Number(view[ii].time));
          if(!d){ ii++; continue; }
          let endII = ii;
          while(endII+1 < view.length){
            const nd = bestOI(Number(view[endII+1].time));
            if(!nd || nd.t !== d.t) break;
            endII++;
          }
          const xxL = xForIndex(ii,    m, win);
          const xxR = xForIndex(endII, m, win);
          const xxC = (xxL + xxR) / 2;
          const hw  = Math.max(bw/2, (xxR - xxL)/2 + bw/2);
          if(xxC < m.x0 - hw - 4 || xxC > m.x1 + hw + 4){ ii = endII+1; continue; }
          const yo = yMap(m, d.open,  sc);
          const yc = yMap(m, d.close, sc);
          const yh = yMap(m, d.high,  sc);
          const yl = yMap(m, d.low,   sc);
          const bull = d.close >= d.open;
          ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(xxC, yh);
          ctx.lineTo(xxC, yl);
          ctx.stroke();
          const bodyTop = Math.min(yo, yc);
          const bodyH = Math.max(2, Math.abs(yc - yo));
          ctx.fillStyle = bull ? "#13dc8d" : "#ff4a61";
          ctx.fillRect(xxC - hw, bodyTop, hw*2, bodyH);
          ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";
          ctx.strokeRect(xxC - hw, bodyTop, hw*2, bodyH);
          ii = endII+1;
        }
      }

      // MA line (usa série mesclada: histórico 5m + live 1m)
      const _maLen = Math.max(2, Math.round(state.maLen) || 20);
      const _maSrc = mergedSeries();
      if(_maLen && _maSrc.length >= 2){
        const _closes = _maSrc.map(d=>d.close);
        const _prefix = new Array(_closes.length+1).fill(0);
        for(let i=0;i<_closes.length;i++) _prefix[i+1]=_prefix[i]+_closes[i];
        const _idxMap = new Map(_maSrc.map((d,i)=>[d.t,i]));
        ctx.beginPath();
        ctx.strokeStyle = "#d9b26a"; /* DVL theme (no blue/navy) — matches the price MA */
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        let _started = false, _lastMAT = null;
        for(let i=0;i<view.length;i++){
          const d = bestOI(Number(view[i].time));
          if(!d || d.t === _lastMAT) continue;
          _lastMAT = d.t;
          const idx = _idxMap.get(d.t);
          if(idx===undefined) continue;
          const st2 = Math.max(0, idx-_maLen+1);
          const avg = (_prefix[idx+1]-_prefix[st2])/(idx-st2+1);
          const xx2 = xForIndex(i, m, win);
          const yy2 = yMap(m, avg, sc);
          if(!_started){ ctx.moveTo(xx2,yy2); _started=true; } else ctx.lineTo(xx2,yy2);
        }
        if(_started) ctx.stroke();
      }

      ctx.fillStyle = "rgba(120,145,180,.78)";
      ctx.font = "760 8px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(CACHE.src || "AGREGADO", m.x0 + 8, m.y1 - 5);
    }else{
      ctx.fillStyle = "rgba(127,145,167,.72)";
      ctx.font = "800 9px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(CACHE.fetching ? "loading real Open Interest…" : "real Open Interest unavailable", m.x0 + 18, (m.y0 + m.y1)/2);
    }

    ctx.restore();

    ctx.font = "9.2px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(165,170,168,.72)";
    for(let i=0; i<=4; i++){
      const v = sc.max - (sc.max - sc.min) * i / 4;
      ctx.fillText(fmtScale(v), m.x1 + m.labelGap, yMap(m, v, sc));
    }

    if(last) drawScaleTag(ctx, m, last.close, sc);
    ctx.restore();
  }

  let panel = null;
  function ensurePanel(){
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "dvlOIPanel";
    panel.className = "dvl-vt-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title"><b>DVL Open Interest</b><small>AGG OI candles · real data</small></div>
        <div class="dvl-vt-head-actions">
          <button class="dvl-vt-close" id="dvlOIPanelClose" type="button">×</button>
        </div>
      </div>
      <div class="dvl-vt-body" id="dvlOIPanelBody"></div>
    `;
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlOIPanelClose").addEventListener("click", closePanel);
    return panel;
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }
  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlOIPanelBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlOIOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Medida</label><select id="dvlOIUnit" class="dvl-vt-select"><option value="usd" ${(state.unit||"usd")==="usd"?"selected":""}>USDT ($)</option><option value="coins" ${state.unit==="coins"?"selected":""}>Moeda base</option><option value="contracts" ${state.unit==="contracts"?"selected":""}>Contratos</option></select></div>
          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlOIMALenPanel" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.maLen||20}"></div>
        </div>
      </div>
    `;
    const onCb = panel.querySelector("#dvlOIOn");
    if(onCb) onCb.addEventListener("change", () => { state.on = onCb.checked; save(); if(state.on) ensureData(true); });
    const unitEl = panel.querySelector("#dvlOIUnit");
    if(unitEl) unitEl.addEventListener("change", () => { state.unit=unitEl.value; state.center=null; state.range=null; save(); ensureData(true); });
    const maInp = panel.querySelector("#dvlOIMALenPanel");
    if(maInp) maInp.addEventListener("change", () => { const v=Math.max(2,Math.min(500,Math.round(+maInp.value)||20)); maInp.value=v; state.maLen=v; save(); });
  }

  function updateRow(){
    const st = document.getElementById("dvlOpenInterestOscState");
    if(st){
      st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";
      st.classList.toggle("is-on", !!state.on);
      st.setAttribute("aria-label", "DVL Open Interest " + (state.on ? "ON" : "OFF"));
    }
    const cb = document.getElementById("dvlOIOn");
    if(cb && cb.checked !== !!state.on) cb.checked = !!state.on;
  }

  function insertRow(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu) return;

    let item = document.getElementById("dvlOpenInterestOscItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlOpenInterestOscItem";
      item.className = "indicatorItem dvl-oi-indicator-item";
      item.innerHTML = `
        <span class="indicatorFxMark">OI</span>
        <span><b>DVL Open Interest</b><small>AGG OI candles · real data</small></span>
        <i class="dvl-vt-state" id="dvlOpenInterestOscState">ON</i>
      `;

      const after = document.getElementById("dvlVolumeItem") || document.getElementById("dvlMovingAveragesItem");
      if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);
      else{
        const head = menu.querySelector(".indicatorDropHead");
        if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling);
        else menu.appendChild(item);
      }
    }else{
      const small = item.querySelector("small");
      if(small) small.textContent = "AGG OI candles · real data";
    }

    if(!item.dataset.dvl554Bound){
      item.dataset.dvl554Bound = "1";
      const toggle = () => {
        state.on = !state.on;
        save();
        if(state.on) ensureData(true);
      };

      const pill = item.querySelector("#dvlOpenInterestOscState");
      if(pill){
        pill.addEventListener("click", ev => {
          ev.preventDefault(); ev.stopPropagation();
          toggle();
        });
      }

      item.addEventListener("click", ev => {
        ev.stopPropagation();
        openPanel();
      });
    }

    updateRow();
  }

  function block(ev){
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }

  function fitToCurrent(){
    state.center = null;
    state.range = null;
    save();
  }

    function zoomXAt(clientX, factor){
    if(typeof zoomChartAt === "function"){
      zoomChartAt(clientX, factor);
    }
  }


  function zoomYAt(clientY, factor){
    const c = canvas();
    if(!c) return;
    const r = c.getBoundingClientRect();
    const m = metricsFromBounds(r);
    if(!m) return;

    const view = oscillatorWindow().candles || [];
    const vals = valuesForVisible(view);
    const sc = currentScale(vals.length ? vals : (CACHE.data || []).slice(-160));
    const y = clamp(clientY - r.top, m.y0, m.y1);
    const anchor = valueAtY(y, m, sc);

    const oldRange = sc.range || (sc.max-sc.min) || 1;
    const next = clamp(oldRange * factor, 0.0001, 1e15);
    const ratio = (sc.center + oldRange/2 - anchor) / oldRange;

    state.range = next;
    state.center = anchor + next * ratio - next / 2;
    save();
  }

  function onWheel(ev){
    if(!isInsidePanel(ev)) return;
    const factor = ev.deltaY < 0 ? 0.88 : 1.16;
    if(isOnScale(ev)) zoomYAt(ev.clientY, factor);
    else zoomXAt(ev.clientX, factor);
    block(ev);
  }

  function onPointerDown(ev){
    /*
      Shared oscillator dividers are owned by DVLTestOscillator.
      Open Interest must not steal the shared divider touch.
    */
    try{
      if(window.DVLTestOscillator && typeof window.DVLTestOscillator.isOnStackDivider === "function" && window.DVLTestOscillator.isOnStackDivider(ev)){
        return;
      }
    }catch(_){}

    if(!isInsidePanel(ev)) return;

    const c = canvas();
    const r = c.getBoundingClientRect();
    const m = metricsFromBounds(r);
    if(!m) return;

    const view = oscillatorWindow().candles || [];
    const vals = valuesForVisible(view);
    const sc = currentScale(vals.length ? vals : (CACHE.data || []).slice(-160));
    const scaleHit = isOnScale(ev);

    try{ c.setPointerCapture?.(ev.pointerId); }catch(_){}
    pointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});

    /*
      Pinch belongs only to the main chart zoom engine from Beta 0.487.
      Oscillators must not handle 2-finger gestures, otherwise zoom trembles/bugs.
    */
    if(pointers.size >= 2){
      pinch = null;
      drag = null;
      pointers.clear();
      return;
    }

drag = {
      id:ev.pointerId,
      x:ev.clientX,
      y:ev.clientY,
      offset:state.offset,
      globalOffset:(typeof chartOffsetCandles !== "undefined" ? chartOffsetCandles : state.offset),
      center:sc.center,
      range:sc.range || (sc.max-sc.min) || 1,
      onScale:scaleHit,
      cross:(typeof crosshair !== "undefined" && crosshair.visible && !scaleHit),
      crossMoved:false,
      startCrossX:(typeof crosshair !== "undefined" && crosshair.visible ? crosshair.x : ev.clientX - r.left),
      startCrossY:(typeof crosshair !== "undefined" && crosshair.visible ? crosshair.y : ev.clientY - r.top),
      m
    };

    block(ev);
  }

  function onPointerMove(ev){
    if(!drag || drag.id !== ev.pointerId) return;

    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;

    if(drag.cross){
      if(Math.hypot(dx, dy) > 3) drag.crossMoved = true;
      if(drag.crossMoved && typeof moveCrosshairByDelta === "function"){
        try{
          crossDragState = {
            startPointerX: drag.x,
            startPointerY: drag.y,
            startCrossX: drag.startCrossX,
            startCrossY: drag.startCrossY,
            moved:true,
            fromVisibleCross:true
          };
          moveCrosshairByDelta(dx, dy);
        }catch(_){}
      }
      block(ev);
      return;
    }

    if(drag.onScale){
      state.range = clamp(Number(drag.range) * Math.exp(dy * 0.0075), 0.0001, 1e15);
      state.center = Number(drag.center);
      try{ const c = canvas(); if(c) c.style.cursor = "ns-resize"; }catch(_){}
    }else{
      const sp = candleSpacing(drag.m);

      if(typeof chartOffsetCandles !== "undefined"){
        chartOffsetCandles = Number(drag.globalOffset) + (dx / sp) * (typeof CHART_DRAG_SENSITIVITY !== "undefined" ? CHART_DRAG_SENSITIVITY : 1);
        if(typeof clampChartViewport === "function") clampChartViewport();
      }

      state.center = Number(drag.center) + dy * ((Number(drag.range) || 1) / Math.max(drag.m.y1 - drag.m.y0, 1));
    }

    save();
    block(ev);
  }

  function onPointerUp(ev){
    if(drag && drag.id === ev.pointerId){
      if(drag.cross && !drag.crossMoved && typeof hideCrosshair === "function"){
        try{ hideCrosshair(); }catch(_){}
      }
      drag = null;
    }

    try{ const c = canvas(); if(c) c.style.cursor = ""; }catch(_){}
    try{
      if(typeof crosshair !== "undefined") crosshair.active = false;
      if(typeof crossDragState !== "undefined") crossDragState = null;
    }catch(_){}

    if(pointers.has(ev.pointerId)) pointers.delete(ev.pointerId);
    if(pointers.size < 2) pinch = null;

    block(ev);
  }

  function migrateTestsOff(){
    try{
      const mig = "dvl_oi_0554_tests_off_migrated";
      if(localStorage.getItem(mig) === "1") return;

      const t1 = JSON.parse(localStorage.getItem("dvl_test_oscillator_v1") || "null") || {};
      t1.on = false;
      localStorage.setItem("dvl_test_oscillator_v1", JSON.stringify(t1));

      const t2 = JSON.parse(localStorage.getItem("dvl_test2_oscillator_v1") || "null") || {};
      t2.on = false;
      localStorage.setItem("dvl_test2_oscillator_v1", JSON.stringify(t2));

      localStorage.setItem(mig, "1");
    }catch(_){}
  }

  function boot(){
    migrateTestsOff();
    insertRow();
    updateRow();

    const c = canvas();
    if(c && !c.dataset.dvl554OiBound){
      c.dataset.dvl554OiBound = "1";
      c.addEventListener("wheel", onWheel, {capture:true, passive:false});
      c.addEventListener("pointerdown", onPointerDown, {capture:true, passive:false});
      c.addEventListener("pointermove", onPointerMove, {capture:true, passive:false});
      c.addEventListener("pointerup", onPointerUp, {capture:true, passive:false});
      c.addEventListener("pointercancel", onPointerUp, {capture:true, passive:false});
      c.addEventListener("pointerleave", onPointerUp, {capture:true, passive:false});
    }

    ensureData(false);
    setInterval(() => { if(state.on) ensureData(false); }, 45000);
    _pollLiveOI();
    setInterval(_pollLiveOI, 15000);

    if(typeof drawSoon === "function") drawSoon();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLOpenInterestOscillator = {
    version:"0.941",
    on,
    setOn,
    draw,
    open:openPanel,
    openPanel:openPanel,
    close:closePanel,
    refresh:function(){ return ensureData(true); },
    prime:function(){ return ensureData(false, true); },
    fitToCurrent,
    reset:fitToCurrent,
    get state(){ return Object.assign({}, state); },
    get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data || []).slice() }); }
  };
})();
