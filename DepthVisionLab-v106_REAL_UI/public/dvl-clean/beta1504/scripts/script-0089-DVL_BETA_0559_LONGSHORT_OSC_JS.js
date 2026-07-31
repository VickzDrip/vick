(function(){
  "use strict";

  /*
    Built from the uploaded dvl_longshort_v325.js base:
    - lsParse() logic maps Binance/CoinGlass long-short account responses;
    - default source is Binance public futures globalLongShortAccountRatio;
    - same DVL oscillator mechanics as Open Interest.
  */

  const KEY = "dvl_longshort_oscillator_v2";
  const CACHE = { key:"", data:[], fetching:false, ts:0, src:"", err:"" };
  const DEFAULTS = {
    on:false,
    mode:"global",
    maLen:14,
    center:null,
    range:null
  };

  let state = load();
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
if(state.center != null && !Number.isFinite(Number(state.center))) state.center = null;
    if(state.range != null) state.range = clamp(Number(state.range) || 0, 0.0001, 1000);
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

  function period(){
    try{ return typeof intervalToPeriod === "function" ? intervalToPeriod(interval) : "5m"; }
    catch(_){ return "5m"; }
  }

  function arrFromResp(j){
    if(Array.isArray(j)) return j;
    if(Array.isArray(j?.data)) return j.data;
    if(Array.isArray(j?.data?.list)) return j.data.list;
    if(Array.isArray(j?.data?.items)) return j.data.items;
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

  function parseLS(arr){
    return arr.map(o => {
      const t = tsOf(o);
      const ratio = nval(o, ["longShortRatio","ratio","long_short_ratio","longShort",1]);
      let long = nval(o, ["longAccount","longAccountRatio","longRatio","long",2]);
      let short = nval(o, ["shortAccount","shortAccountRatio","shortRatio","short",3]);

      if(long > 1) long /= 100;
      if(short > 1) short /= 100;

      if(!long && !short && ratio > 0){
        long = ratio / (1 + ratio);
        short = 1 / (1 + ratio);
      }

      return {
        t,
        ratio:ratio || ((short > 0) ? long / short : 0),
        long,
        short
      };
    }).filter(d => d.t && d.ratio > 0)
      .sort((a,b) => a.t - b.t);
  }

  async function fetchJson(url, opts){
    const r = await fetch(url, Object.assign({cache:"no-store"}, opts || {}));
    if(!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  }

  /* MEXC has no real long/short ratio, so for MEXC-only assets we derive a
     sentiment PROXY from the REAL funding-rate series the backend samples:
     positive funding = longs pay shorts = long-heavy crowd. This is NOT the
     true long/short ratio — the panel watermark says "proxy funding" so it's
     never mistaken for the real thing. */
  async function fetchMexcLsProxy(){
    try{
      const j = await fetchJson("/api/dvl/scanner/mexc-derivs?symbol=" + encodeURIComponent(sym()));
      const pts = (j && Array.isArray(j.funding)) ? j.funding : [];
      if(pts.length < 2) return [];
      return pts.map(p => {
        const t = +p.time, fr = +p.value;
        const long = Math.min(0.99, Math.max(0.01, 0.5 + Math.max(-0.49, Math.min(0.49, fr * 100))));
        const short = 1 - long;
        return { t, ratio: long / Math.max(short, 0.0001), long, short };
      }).filter(d => d.t && d.ratio > 0).sort((a,b)=>a.t-b.t);
    }catch(_){ return []; }
  }

  async function ensureData(force=false, allowOff=false){
    if(!on() && !allowOff) return;

    const p = period();
    const mode = state.mode === "top" ? "top" : "global";
    const key = ["binance", mode, sym(), p].join("|");

    if(!force && CACHE.key === key && CACHE.data.length && Date.now() - CACHE.ts < 45000) return;
    if(CACHE.fetching) return;

    CACHE.fetching = true;
    CACHE.err = "";
    updateRow();

    try{
      const _lsEndpoint = mode === "top" ? "topLongShortAccountRatio" : "globalLongShortAccountRatio";
      const _lsBase = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");
      const _lsPMs = (typeof periodToMs==="function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p]||300000;
      const _lsNow = Date.now();
      const _lsUrl = (n) => _lsBase + "/" + _lsEndpoint + "?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0?"&endTime="+(_lsNow-n*500*_lsPMs):"");
      const _bbP3 = (typeof periodToBybitPeriod==="function") ? periodToBybitPeriod(p) : "5min";
      const _bbUrl3 = (n) => "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=" + encodeURIComponent(sym()) + "&period=" + _bbP3 + "&limit=200" + (n>0?"&endTime="+(_lsNow-n*200*_lsPMs):"");
      const _useBybit = mode !== "top";
      const [_lsR0,_lsR1,_lsR2,_bbR0,_bbR1,_bbR2] = await Promise.all([
        fetchJson(_lsUrl(0)),
        fetchJson(_lsUrl(1)).catch(()=>[]),
        fetchJson(_lsUrl(2)).catch(()=>[]),
        _useBybit?fetchJson(_bbUrl3(0)).catch(()=>null):Promise.resolve(null),
        _useBybit?fetchJson(_bbUrl3(1)).catch(()=>null):Promise.resolve(null),
        _useBybit?fetchJson(_bbUrl3(2)).catch(()=>null):Promise.resolve(null)
      ]);
      const _lsSeen=new Set();
      const _bnArr=[arrFromResp(_lsR0),arrFromResp(_lsR1),arrFromResp(_lsR2)].filter(Array.isArray).flatMap(a=>a).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_lsSeen.has(k))return false;_lsSeen.add(k);return true;});
      const _bbSeen=new Set();
      const _bbList3=[_bbR0,_bbR1,_bbR2].flatMap(r=>(Array.isArray(r?.result?.list)?r.result.list:[])).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_bbSeen.has(k))return false;_bbSeen.add(k);return true;});
      const _bbMap3=new Map(_bbList3.map(x=>[+x.timestamp,x]));
      const arr=_bnArr.map(x=>{const bb=_bbMap3.get(+x.timestamp);if(!bb)return x;const lng=(+x.longAccount+(+bb.buyRatio))/2,sht=1-lng;return{...x,longAccount:lng,shortAccount:sht,longShortRatio:lng/Math.max(sht,0.0001)};});
      let data = parseLS(arr);
      let srcLabel = (mode === "top" ? "TOP TRADERS" : "GLOBAL");

      if(!data.length){
        /* No Binance long/short for this symbol (MEXC-only) → funding-based
           sentiment PROXY (clearly labelled, not the real long/short ratio). */
        const mx = await fetchMexcLsProxy();
        if(!mx.length) throw new Error("NO DATA");
        data = mx;
        srcLabel = "MEXC · proxy funding";
      }

      CACHE.key = key;
      CACHE.data = data;
      CACHE.ts = Date.now();
      CACHE.src = srcLabel;
      CACHE.err = "";

      try{
        lsHist = data.map(d => ({ time:d.t, ratio:d.ratio, long:d.long, short:d.short }));
      }catch(_){}
    }catch(e){
      CACHE.err = String(e && e.message || e);
      CACHE.data = [];
      try{ lsHist = []; }catch(_){}
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
    const b = window.__dvlOscillatorPanelBounds && window.__dvlOscillatorPanelBounds.longShort;
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
    const data = CACHE.data || [];
    if(!data.length || !view.length) return [];
    const out = [];
    for(let i=0; i<view.length; i++){
      const d = valueAt(data, Number(view[i].time));
      if(d) out.push(d);
    }
    return out;
  }

  function autoScale(vals){
    /*
      CoinGlass-like tight scale:
      use only the visible L/S ratios, not a huge fixed 0.45..1.85 band.
    */
    if(!vals.length) return {min:1.38,max:1.48,center:1.43,range:.10};

    let min = Math.min(...vals.map(v => Number(v.ratio)).filter(Number.isFinite));
    let max = Math.max(...vals.map(v => Number(v.ratio)).filter(Number.isFinite));

    if(!Number.isFinite(min) || !Number.isFinite(max)){
      return {min:1.38,max:1.48,center:1.43,range:.10};
    }

    let span = Math.max(max - min, 0.006);
    const pad = Math.max(span * .28, 0.004);
    min -= pad;
    max += pad;

    return { min, max, center:(min+max)/2, range:max-min };
  }

  function currentScale(vals){
    if(Number.isFinite(Number(state.center)) && Number.isFinite(Number(state.range)) && Number(state.range) > 0){
      const center = Number(state.center);
      const range = Number(state.range);

      /*
        Protect the CoinGlass line from old/bad manual zoom values.
        A huge range makes the line unreadable/flat.
      */
      if(range <= 0.35){
        return { min:center-range/2, max:center+range/2, center, range };
      }
    }

    return autoScale(vals);
  }

  function yMap(m, v, sc){
    return m.y1 - (v - sc.min) / Math.max(sc.max - sc.min, 0.000001) * (m.y1 - m.y0);
  }

  function valueAtY(y, m, sc){
    return sc.max - (y - m.y0) / Math.max(m.y1 - m.y0, 1) * (sc.max - sc.min);
  }

  function fmt(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return "--";
    return n.toFixed(4);
  }

  function xForIndex(i, m, win){
    const slots = Math.max(2, win.totalSlots || 2);
    const slotOffset = __dvlSlotOffset(win, win.candles || []);
    return m.x0 + (slotOffset + i) / (slots-1) * (m.x1-m.x0);
  }

  function basePanel(ctx, m, title, right, kind){
    ctx.save();

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
    ctx.fillText(fmt(value), tx + tagW/2, yy);
  }

  function draw(ctx, padL, padR, top, h, w){
    window.__dvlOscillatorPanelBounds = window.__dvlOscillatorPanelBounds || {};
    window.__dvlOscillatorPanelBounds.longShort = { top, h, w, padL, padR };

    if(!CACHE.fetching && on()) ensureData(false);

    const m = panelMetrics(padL, padR, top, h, w);
    const win = oscillatorWindow();
    const view = win.candles || [];
    const vals = valuesForVisible(view);
    const allScale = vals.length ? vals : (CACHE.data || []).slice(-160);
    const sc = currentScale(allScale);

    const last = vals.length ? vals[vals.length-1] : (CACHE.data || []).at(-1);
    const prev = vals.length > 1 ? vals[vals.length-2] : ((CACHE.data || []).length > 1 ? (CACHE.data || []).at(-2) : last);
    const delta = last && prev ? (last.ratio - prev.ratio) : 0;
    const kind = last ? (delta > 0 ? "bull" : delta < 0 ? "bear" : (last.ratio > 1.03 ? "bull" : last.ratio < .97 ? "bear" : "neutral")) : "neutral";
    const right = last ? (fmt(last.ratio)) : (CACHE.fetching ? "LOADING" : "NO DATA");

    ctx.save();
    basePanel(ctx, m, "Long/Short Ratio", right, kind);

    ctx.save();
    ctx.beginPath();
    ctx.rect(m.x0, m.y0, m.x1-m.x0, Math.max(1, m.y1-m.y0));
    ctx.clip();

    const mid = yMap(m, 1, sc);

    ctx.strokeStyle = "rgba(45,196,174,.30)";
    ctx.setLineDash([4,6]);
    ctx.beginPath();
    ctx.moveTo(m.x0, mid);
    ctx.lineTo(m.x1, mid);
    ctx.stroke();
    ctx.setLineDash([]);

    if(vals.length){
      const points = [];
      for(let i=0; i<view.length; i++){
        const d = valueAt(CACHE.data, Number(view[i].time));
        if(!d) continue;
        const xx = xForIndex(i, m, win);
        const yy = yMap(m, d.ratio, sc);
        if(!Number.isFinite(xx) || !Number.isFinite(yy)) continue;
        if(xx < m.x0 - 14 || xx > m.x1 + 14) continue;
        points.push({x:xx, y:yy, ratio:d.ratio, long:d.long, short:d.short});
      }

      /*
        CoinGlass-style Long/Short Ratio:
        no columns; the moving ratio line is the reading.
        Rising segments = longs entering / shorts exiting.
        Falling segments = shorts entering / longs exiting.
      */
      if(points.length > 1){
        const baseY = yMap(m, 1, sc);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 1.55;
        ctx.strokeStyle = "rgba(45,196,174,.92)";
        ctx.shadowColor = "rgba(45,196,174,.18)";
        ctx.shadowBlur = 3;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for(let i=1; i<points.length; i++){
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        ctx.shadowBlur = 0;

        const lastPoint = points[points.length - 1];
        ctx.fillStyle = "rgba(45,196,174,.96)";
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // MA line
      const _lsMALen = Math.max(2, Math.round(state.maLen) || 14);
      if(_lsMALen && CACHE.data.length >= 2){
        const _ratios = CACHE.data.map(d => d.ratio);
        const _prefix = new Array(_ratios.length+1).fill(0);
        for(let i=0;i<_ratios.length;i++) _prefix[i+1]=_prefix[i]+_ratios[i];
        const _idxMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));
        ctx.beginPath();
        ctx.strokeStyle = "#ff9f43";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        let _started = false;
        for(let i=0;i<view.length;i++){
          const d = valueAt(CACHE.data, Number(view[i].time));
          if(!d) continue;
          const idx = _idxMap.get(d.t);
          if(idx===undefined) continue;
          const st2 = Math.max(0, idx-_lsMALen+1);
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
      ctx.fillText(CACHE.src || "GLOBAL", m.x0 + 8, m.y1 - 5);
    }else{
      ctx.fillStyle = "rgba(127,145,167,.72)";
      ctx.font = "800 9px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(CACHE.fetching ? "loading real Long/Short…" : "real Long/Short unavailable", m.x0 + 18, (m.y0 + m.y1)/2);
    }

    ctx.restore();

    ctx.font = "9.2px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(165,170,168,.72)";
    for(let i=0; i<=4; i++){
      const v = sc.max - (sc.max - sc.min) * i / 4;
      ctx.fillText(fmt(v), m.x1 + m.labelGap, yMap(m, v, sc));
    }

    if(last) drawScaleTag(ctx, m, last.ratio, sc);
    ctx.restore();
  }

  let panel = null;
  function ensurePanel(){
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "dvlLSPanel";
    panel.className = "dvl-vt-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title"><b>DVL Long/Short Ratio</b><small>Long/Short · real data</small></div>
        <div class="dvl-vt-head-actions">
          <button class="dvl-vt-close" id="dvlLSPanelClose" type="button">×</button>
        </div>
      </div>
      <div class="dvl-vt-body" id="dvlLSPanelBody"></div>
    `;
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlLSPanelClose").addEventListener("click", closePanel);
    return panel;
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }
  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlLSPanelBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlLSOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Mode</label><select id="dvlLSMode" class="dvl-vt-select"><option value="global" ${state.mode==="global"?"selected":""}>Global</option><option value="top" ${state.mode==="top"?"selected":""}>Top Traders</option></select></div>
          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlLSMALen" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.maLen||14}"></div>
        </div>
      </div>
    `;
    const onCb = panel.querySelector("#dvlLSOn");
    if(onCb) onCb.addEventListener("change", () => { state.on = onCb.checked; save(); if(state.on) ensureData(true); });
    const modeEl = panel.querySelector("#dvlLSMode");
    if(modeEl) modeEl.addEventListener("change", () => { state.mode = modeEl.value; save(); });
    const maInp = panel.querySelector("#dvlLSMALen");
    if(maInp) maInp.addEventListener("change", () => { const v=Math.max(2,Math.min(500,Math.round(+maInp.value)||14)); maInp.value=v; state.maLen=v; save(); });
  }

  function updateRow(){
    const st = document.getElementById("dvlLongShortOscState");
    if(st){
      st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";
      st.classList.toggle("is-on", !!state.on);
      st.setAttribute("aria-label", "DVL Long Short " + (state.on ? "ON" : "OFF"));
    }
    const cb = document.getElementById("dvlLSOn");
    if(cb && cb.checked !== !!state.on) cb.checked = !!state.on;
  }

  function insertRow(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu) return;

    let item = document.getElementById("dvlLongShortOscItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlLongShortOscItem";
      item.className = "indicatorItem dvl-ls-indicator-item";
      item.innerHTML = `
        <span class="indicatorFxMark">LS</span>
        <span><b>DVL Long/Short Ratio</b><small>Long/Short · real data</small></span>
        <i class="dvl-vt-state" id="dvlLongShortOscState">ON</i>
      `;

      const after = document.getElementById("dvlOpenInterestOscItem") || document.getElementById("dvlVolumeItem") || document.getElementById("dvlMovingAveragesItem");
      if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);
      else{
        const head = menu.querySelector(".indicatorDropHead");
        if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling);
        else menu.appendChild(item);
      }
    }

    if(!item.dataset.dvl559Bound){
      item.dataset.dvl559Bound = "1";
      const toggle = () => {
        state.on = !state.on;
        save();
        if(state.on) ensureData(true);
      };

      const pill = item.querySelector("#dvlLongShortOscState");
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
    const next = clamp(oldRange * factor, 0.0001, 1000);
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
    if(pointers.has(ev.pointerId)) pointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});

    if(pointers.size >= 2){
      /*
        Do not fight the main 0.487 pinch engine.
        Let the canvas chart handler own every two-finger zoom.
      */
      pinch = null;
      drag = null;
      pointers.clear();
      return;
    }

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
      state.range = clamp(Number(drag.range) * Math.exp(dy * 0.0075), 0.0001, 1000);
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

  function boot(){
    insertRow();
    updateRow();

    const c = canvas();
    if(c && !c.dataset.dvl559LsBound){
      c.dataset.dvl559LsBound = "1";
      c.addEventListener("wheel", onWheel, {capture:true, passive:false});
      c.addEventListener("pointerdown", onPointerDown, {capture:true, passive:false});
      c.addEventListener("pointermove", onPointerMove, {capture:true, passive:false});
      c.addEventListener("pointerup", onPointerUp, {capture:true, passive:false});
      c.addEventListener("pointercancel", onPointerUp, {capture:true, passive:false});
      c.addEventListener("pointerleave", onPointerUp, {capture:true, passive:false});
    }

    ensureData(false);
    setInterval(() => { if(state.on) ensureData(false); }, 45000);

    if(typeof drawSoon === "function") drawSoon();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLLongShortOscillator = {
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
