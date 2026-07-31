(function(){
  "use strict";

  const STOR_KEY = "dvlDeltaVol_v1";
  const DV_TF_LIST = ["chart","1m","3m","5m","15m","30m","1h","4h","1d"];
  const DEFAULTS = { on:false, maLen:0, tf:"chart" };

  let state = Object.assign({}, DEFAULTS);
  (function(){ try{ const s=JSON.parse(localStorage.getItem(STOR_KEY)||"{}"); Object.assign(state,s); if(DV_TF_LIST.indexOf(state.tf)<0) state.tf="chart"; }catch(_){} })();
  function save(){ try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){} }

  function on(){ return !!state.on; }
  function setOn(v){ state.on=!!v; save(); if(state.on){ try{ ensureData(true); }catch(_){} } if(typeof drawSoon==="function") drawSoon(); }

  const CACHE = { key:null, data:[], fetching:false, error:null, source:null };

  function sym(){ try{ return (window.currentSymbol||"BTCUSDT").toUpperCase(); }catch(_){ return "BTCUSDT"; } }
  function period(){
    if(!state.tf||state.tf==="chart")
      try{ return (typeof interval!=="undefined"?interval:null)||"5m"; }catch(_){ return "5m"; }
    return state.tf;
  }

  function periodMs(tf){
    const map={ "1m":60000,"3m":180000,"5m":300000,"15m":900000,"30m":1800000,
                "1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"8h":28800000,
                "12h":43200000,"1d":86400000,"3d":259200000,"1w":604800000 };
    return map[tf] || 3600000;
  }

  function cacheKey(){ return sym()+"|"+period(); }

  async function fetchPage(symbol, limit, endTime){
    const endpoints = (Array.isArray(window.DVL_REAL_MARKET_ENDPOINTS) && window.DVL_REAL_MARKET_ENDPOINTS.length)
      ? window.DVL_REAL_MARKET_ENDPOINTS
      : [{ name:"BINANCE_FUTURES_MAIN", base:(typeof BINANCE !== "undefined" ? BINANCE : "https://fapi.binance.com"), klinePath:"/fapi/v1/klines", market:"futures" }];

    const errors = [];
    for(const ep of endpoints){
      try{
        let url = ep.base + (ep.klinePath || "/fapi/v1/klines") + "?symbol=" + encodeURIComponent(symbol) + "&interval=1m&limit=" + limit;
        if(endTime) url += "&endTime=" + endTime;
        const rows = (typeof jget === "function") ? await jget(url) : await (await fetch(url, {cache:"no-store"})).json();
        if(Array.isArray(rows) && rows.length){
          CACHE.source = ep.name || ep.base || "REAL";
          return rows;
        }
        errors.push((ep.name || ep.base) + ":empty");
      }catch(e){
        errors.push((ep.name || ep.base) + ":" + String(e && e.message || e).slice(0, 120));
      }
    }
    throw new Error("DeltaVol real fetch failed [" + errors.join(" | ") + "]");
  }

  function deriveFromChartKlines(pMs){
    const src = Array.isArray(window.klines) ? window.klines : [];
    const map = new Map();

    for(const c of src){
      const t = Number(c && c.time);
      if(!Number.isFinite(t)) continue;
      const bucketTime = Math.floor(t / pMs) * pMs;
      let b = map.get(bucketTime);
      if(!b){ b = { t:bucketTime, buy:0, sell:0, delta:0 }; map.set(bucketTime, b); }

      const vol = Number(c.volume ?? c.vol ?? 0);
      if(!(vol > 0)) continue;

      let buyVol = NaN, sellVol = NaN;
      const fp = (window._dvlFpCache && typeof window._dvlFpCache.get === "function")
        ? (window._dvlFpCache.get(t) || window._dvlFpCache.get(bucketTime))
        : null;

      if(fp && Number.isFinite(Number(fp.b)) && Number.isFinite(Number(fp.s))){
        buyVol = Number(fp.b);
        sellVol = Number(fp.s);
      }else{
        const o = Number(c.open), h = Number(c.high), l = Number(c.low), cl = Number(c.close);
        const range = Math.max(Math.abs(h - l), 1e-9);
        const body = Math.abs(cl - o);
        const bias = Math.min(1, body / range);
        let share = 0.5 + (cl >= o ? 1 : -1) * Math.min(0.45, 0.16 + bias * 0.34);
        share = Math.max(0.05, Math.min(0.95, share));
        buyVol = vol * share;
        sellVol = vol - buyVol;
      }

      b.buy += buyVol;
      b.sell += sellVol;
      b.delta += (buyVol - sellVol);
    }

    return Array.from(map.values()).sort((a,b) => a.t - b.t);
  }

  function parseKlines(rows, pMs){
    const map = new Map();
    for(const k of rows){
      const t1m = Number(k[0]);
      const pKey = Math.floor(t1m / pMs) * pMs;
      let b = map.get(pKey);
      if(!b){ b={ t:pKey, buy:0, sell:0, delta:0 }; map.set(pKey, b); }
      const vol = parseFloat(k[5]);
      const buyVol = parseFloat(k[9]);
      const sellVol = vol - buyVol;
      b.buy += buyVol;
      b.sell += sellVol;
      b.delta += (buyVol - sellVol);
    }
    return map;
  }

  async function ensureData(force){
    const key = cacheKey();
    if(!force && CACHE.key === key && Array.isArray(CACHE.data) && CACHE.data.length) return;
    if(CACHE.fetching) return;
    CACHE.fetching = true;
    CACHE.error = null;
    const sym_ = sym();
    const pMs = periodMs(period());

    try{
      const LIMIT = 1500;
      const pages = [];
      let endTime = null;

      for(let p=0; p<3; p++){
        const rows = await fetchPage(sym_, LIMIT, endTime);
        if(!rows || !rows.length) break;
        pages.push(...rows);
        endTime = Number(rows[0][0]) - 1;
        if(rows.length < LIMIT) break;
      }

      let sorted = [];
      if(pages.length){
        const map = parseKlines(pages, pMs);
        sorted = Array.from(map.values()).sort((a,b)=>a.t-b.t);
      }

      if(!sorted.length){
        sorted = deriveFromChartKlines(pMs);
        if(sorted.length) CACHE.source = "CHART_DERIVED";
      }

      CACHE.key = key;
      CACHE.data = sorted;
    }catch(e){
      CACHE.error = String(e && e.message || e);
      CACHE.key = key;
      CACHE.data = deriveFromChartKlines(pMs);
      if(CACHE.data.length && !CACHE.source) CACHE.source = "CHART_DERIVED";
    }finally{
      CACHE.fetching = false;
      if(typeof drawSoon === "function") drawSoon();
    }
  }

  function panelMetrics(padL, padR, top, h, w){
    const scaleW  = (typeof PRICE_SCALE_W  !=="undefined" ? PRICE_SCALE_W  : 55);
    const labelGap= (typeof PRICE_LABEL_GAP!=="undefined" ? PRICE_LABEL_GAP : 2);
    const labelW  = (typeof PRICE_LABEL_W  !=="undefined" ? PRICE_LABEL_W   : scaleW - 4);
    const x0 = padL, x1 = w - padR;
    const y0 = top + 4, y1 = top + h - 6;
    return { padL, padR, top, h, w, scaleW, labelGap, labelW, x0, x1, y0, y1,
             scaleX0:x1+labelGap, scaleX1:x1+labelGap+labelW };
  }

  function oscillatorWindow(){
    try{ if(typeof visibleWindow==="function") return visibleWindow(); }catch(_){}
    const count = (typeof chartViewCount!=="undefined" ? chartViewCount : 140);
    return { candles:[], totalSlots:count, futureSlots:0, start:0, end:0 };
  }

  function xForIndex(i, m, win){
    const slots = Math.max(2, win.totalSlots || 2);
    const slotOffset = __dvlSlotOffset(win, win.candles || []);
    return m.x0 + (slotOffset + i) / (slots - 1) * (m.x1 - m.x0);
  }

  function yMap(m, v, sc){
    return m.y1 - (v - sc.min) / Math.max(sc.max - sc.min, 0.000001) * (m.y1 - m.y0);
  }

  function barScale(data){
    if(!data.length) return { min:0, max:1, absMax:1 };
    let absMax = 0;
    for(const d of data) if(Math.abs(d.delta)>absMax) absMax=Math.abs(d.delta);
    if(!absMax) absMax=1;
    return { min:-absMax*1.05, max:absMax*1.05, absMax };
  }

  function valueAt(arr, t){
    let lo=0, hi=arr.length-1;
    while(lo<=hi){ const mid=(lo+hi)>>1; if(arr[mid].t===t) return arr[mid]; else if(arr[mid].t<t) lo=mid+1; else hi=mid-1; }
    return null;
  }

  function fmtDelta(v){
    const a = Math.abs(v);
    const s = a>=1e6?(a/1e6).toFixed(1)+"M": a>=1e3?(a/1e3).toFixed(1)+"K": Math.round(a).toString();
    return v < 0 ? "-"+s : s;
  }

  function basePanel(ctx, m, title, right, kind){
    ctx.save();
    ctx.fillStyle = "#020806";
    ctx.fillRect(0, m.top, m.w, m.h);
    ctx.strokeStyle = "rgba(64,105,145,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, m.top + .5); ctx.lineTo(m.w, m.top + .5); ctx.stroke();
    ctx.strokeStyle = "rgba(122,155,145,.092)"; ctx.lineWidth = .85;
    for(let n=1; n<=3; n++){
      const y = m.y0 + (m.y1-m.y0)*n/4;
      ctx.beginPath(); ctx.moveTo(m.x0, y); ctx.lineTo(m.x1, y); ctx.stroke();
    }
    ctx.fillStyle = "#020806"; ctx.fillRect(m.x1, m.top, m.w-m.x1, m.h);
    ctx.strokeStyle = "rgba(64,105,145,.26)";
    ctx.beginPath(); ctx.moveTo(m.x1+.5, m.top); ctx.lineTo(m.x1+.5, m.top+m.h); ctx.stroke();
    const headY = m.y0 + 12;
    ctx.font = "850 9px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(223,238,255,.84)"; ctx.fillText(title, m.x0 + 18, headY);
    ctx.font = "800 9px system-ui"; ctx.textAlign = "right";
    ctx.fillStyle = kind==="bear"?"rgba(255,95,110,.88)":kind==="bull"?"rgba(0,220,190,.88)":"rgba(135,155,185,.86)";
    ctx.fillText(right || "", m.x1 - 8, headY);
    ctx.restore();
  }

  function drawScaleTag(ctx, m, value, sc){
    const yy = Math.max(m.y0+18, Math.min(m.y1-18, yMap(m, value, sc)));
    const tx = m.x1 + m.labelGap, tagW = m.labelW, tagH = DVL_SCALE_LABEL_H;
    if(typeof roundRect==="function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#10df77");
    else{ ctx.fillStyle="#10df77"; ctx.fillRect(tx, yy-tagH/2, tagW, tagH); }
    ctx.fillStyle="#02120b"; ctx.font="900 " + DVL_SCALE_LABEL_FONT + "px system-ui";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(fmtDelta(value), tx+tagW/2, yy);
  }

  function draw(ctx, padL, padR, top, h, w){
    if(!CACHE.fetching && on()) ensureData(false);

    const m = panelMetrics(padL, padR, top, h, w);
    const win = oscillatorWindow();
    const view = win.candles || [];

    const visibleData = [];
    for(const c of view){ const d = valueAt(CACHE.data, Number(c.time)); if(d) visibleData.push(d); }
    const sc = barScale(visibleData.length ? visibleData : CACHE.data.slice(-160));
    const last = visibleData.length ? visibleData[visibleData.length-1] : CACHE.data.at(-1);
    const kind = !last ? "neutral" : last.delta > 0 ? "bull" : last.delta < 0 ? "bear" : "neutral";

    const effTF = state.tf==="chart"?"chart→"+period():period();
    const rightText = last ? fmtDelta(last.delta) : (CACHE.fetching ? "LOADING" : (CACHE.error ? "NO DATA" : "0"));
    ctx.save();
    basePanel(ctx, m, "DELTA VOL "+effTF, rightText, kind);

    if(!visibleData.length){
      ctx.fillStyle="rgba(120,145,180,.65)"; ctx.font = "800 9px system-ui";
      ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillText(CACHE.fetching?"Loading Delta Volume…":"No delta data", m.x0+18, (m.y0+m.y1)/2);
      ctx.restore(); return;
    }

    ctx.save();
    ctx.beginPath(); ctx.rect(m.x0, m.y0, m.x1-m.x0, Math.max(1, m.y1-m.y0)); ctx.clip();

    const zero = yMap(m, 0, sc);
    const bw = Math.max(2, Math.min(11, ((m.x1-m.x0) / Math.max(1, win.totalSlots || view.length || 80)) * 0.72));

    for(let i=0; i<view.length; i++){
      const d = valueAt(CACHE.data, Number(view[i].time));
      if(!d) continue;
      const xx = xForIndex(i, m, win);
      if(xx < m.x0-12 || xx > m.x1+12) continue;
      const yy = yMap(m, d.delta, sc);
      const barTop = Math.min(yy, zero), barH = Math.max(1, Math.abs(yy-zero));
      ctx.fillStyle = d.delta >= 0 ? "rgba(46,213,115,.82)" : "rgba(255,71,87,.82)";
      ctx.fillRect(xx-bw/2, barTop, bw, barH);
    }

    ctx.strokeStyle="rgba(120,145,180,.35)"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(m.x0,zero); ctx.lineTo(m.x1,zero); ctx.stroke();
    ctx.setLineDash([]);

    if(state.maLen >= 2 && CACHE.data.length >= 2){
      const maLen = Math.max(2, Math.round(state.maLen));
      const allD = CACHE.data.map(d=>d.delta);
      const pfx = new Array(allD.length+1).fill(0);
      for(let i=0;i<allD.length;i++) pfx[i+1]=pfx[i]+allD[i];
      const iMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));
      ctx.beginPath(); ctx.strokeStyle="#ffd32a"; ctx.lineWidth=1.5; let ok=false;
      for(let i=0;i<view.length;i++){
        const d=valueAt(CACHE.data,Number(view[i].time)); if(!d) continue;
        const idx=iMap.get(d.t); if(idx===undefined) continue;
        const st=Math.max(0,idx-maLen+1), avg=(pfx[idx+1]-pfx[st])/(idx-st+1);
        const xx=xForIndex(i,m,win), yy=yMap(m,avg,sc);
        if(!ok){ctx.moveTo(xx,yy);ok=true;}else ctx.lineTo(xx,yy);
      }
      if(ok) ctx.stroke();
    }

    ctx.restore();

    ctx.font="9.2px system-ui"; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillStyle="rgba(165,170,168,.72)";
    for(let i=0; i<=4; i++){
      const v = sc.max - (sc.max-sc.min)*i/4;
      ctx.fillText(fmtDelta(v), m.x1+m.labelGap, yMap(m,v,sc));
    }
    if(last) drawScaleTag(ctx, m, last.delta, sc);

    ctx.font="760 8px system-ui";
    ctx.textAlign="left"; ctx.textBaseline="bottom";
    ctx.fillStyle="rgba(120,145,180,.78)";
    ctx.fillText(CACHE.source || (CACHE.fetching ? "LOADING REAL" : (CACHE.error ? "CHART DERIVED" : "REAL")), m.x0 + 8, m.y1 - 5);

    ctx.restore();
  }

  function fitToCurrent(){ ensureData(true); }

  // ── Panel ──────────────────────────────────────────────────────────────────
  let panel = null;
  let item  = null;

  function ensurePanel(){
    if(panel && document.contains(panel)) return;
    panel = document.createElement("div");
    panel.id = "dvlDvPanel";
    panel.className = "dvl-vt-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title"><b>DVL Delta Volume</b><small>buy/sell delta por TF</small></div>
        <div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlDvClose" type="button">×</button></div>
      </div>
      <div class="dvl-vt-body" id="dvlDvBody"></div>
    `;
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlDvClose").addEventListener("click", closePanel);
  }

  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlDvBody");
    const tfChips = DV_TF_LIST.map(tf =>
      `<button class="dvl-dv-tf-chip${state.tf===tf?" is-sel":""}" type="button" data-dv-tf="${tf}">${tf}</button>`
    ).join("");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlDvOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlDvMALen" class="dvl-vt-input" type="number" min="0" max="500" step="1" value="${state.maLen||0}" placeholder="0=off"></div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Timeframe</span></div>
        <div class="dvl-dv-tf-chips">${tfChips}</div>
        <p style="font-size:11px;color:#6b7d74;margin:6px 0 0;">"chart" usa o mesmo TF do gráfico principal automaticamente</p>
      </div>
    `;
    const onCb = panel.querySelector("#dvlDvOn");
    if(onCb) onCb.addEventListener("change", ()=>{ state.on=onCb.checked; save(); updateRow(); if(typeof drawSoon==="function") drawSoon(); });
    const maInp = panel.querySelector("#dvlDvMALen");
    if(maInp) maInp.addEventListener("change", ()=>{ const v=Math.max(0,Math.min(500,Math.round(+maInp.value)||0)); maInp.value=v; state.maLen=v; save(); });
    panel.querySelectorAll("[data-dv-tf]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        state.tf=btn.dataset.dvTf;
        save();
        CACHE.key=null; /* force refetch with new TF */
        panel.querySelectorAll("[data-dv-tf]").forEach(b=>b.classList.toggle("is-sel",b.dataset.dvTf===state.tf));
        if(typeof drawSoon==="function") drawSoon();
      });
    });
  }

  // ── Indicator row ─────────────────────────────────────────────────────────
  function updateRow(){
    const st = document.getElementById("dvlDeltaVolumeState");
    if(st){ st.textContent = state.on ? "ON" : "OFF"; st.classList.toggle("is-on", !!state.on); }
  }

  function insertRow(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu) return;
    let item = document.getElementById("dvlDeltaVolumeItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlDeltaVolumeItem";
      item.className = "indicatorItem";
      item.innerHTML = `
        <span class="indicatorFxMark">DV</span>
        <span><b>DVL Delta Volume</b><small>buy/sell delta · TF selecionável</small></span>
        <i class="dvl-vt-state" id="dvlDeltaVolumeState">ON</i>
      `;
      const after = document.getElementById("dvlLongShortOscItem") || document.getElementById("dvlOpenInterestOscItem");
      if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);
      else menu.appendChild(item);
    }
    if(!item.dataset.dvlDvBound){
      item.dataset.dvlDvBound = "1";
      const pill = item.querySelector("#dvlDeltaVolumeState");
      if(pill) pill.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        state.on = !state.on;
        save();
        updateRow();
        if(state.on){
          try{ ensureData(true); }catch(_){}
        }
        if(typeof drawSoon === "function") drawSoon();
      });
      item.addEventListener("click", ev=>{ ev.stopPropagation(); openPanel(); });
    }
    updateRow();
  }

  function boot(){
    insertRow();
    updateRow();
    if(typeof drawSoon === "function") drawSoon();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLDeltaVolume = {
    version:"0.941",
    on,
    setOn,
    draw,
    open:openPanel,
    openPanel:openPanel,
    close:closePanel,
    refresh:function(){ return ensureData(true); },
    fitToCurrent,
    reset:fitToCurrent,
    get state(){ return Object.assign({}, state); },
    get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data||[]).slice() }); }
  };
})();
