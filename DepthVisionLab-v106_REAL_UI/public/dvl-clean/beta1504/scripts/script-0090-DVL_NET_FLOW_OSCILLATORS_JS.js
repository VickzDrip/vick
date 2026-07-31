/* DVL Net Short / DVL Net Delta — approximates CoinGlass's Net Long / Net
   Short / Net Delta panels using ONLY Binance's public futures API (no paid
   CoinGlass key): /futures/data/topLongShortPositionRatio gives the top
   traders' long/short split BY POSITION SIZE as a fraction (e.g. 0.65
   long / 0.35 short) — multiplying that fraction by the Open Interest we
   already fetch (window.DVLOpenInterestOscillator.cache) turns it into an
   approximate absolute Net Long / Net Short, same principle CoinGlass uses,
   just single-exchange instead of aggregated across many. Net Delta = Net
   Long − Net Short.

   Deliberately simpler than the OI/Long-Short oscillators above: no manual
   drag-to-pan/wheel-zoom state (auto-fit scale instead, same approach
   DVLExhaustionRSI already uses) — the ask was two readable oscillators
   with a configurable MA, not full custom zoom controls. */
(function(){
  "use strict";

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
  function sym(){ try{ return String(symbol || "BTCUSDT").toUpperCase(); }catch(_){ return "BTCUSDT"; } }
  function period(){ try{ return typeof intervalToPeriod === "function" ? intervalToPeriod(interval) : "5m"; }catch(_){ return "5m"; } }
  function canvas(){ try{ return document.querySelector(".canvasWrap canvas") || document.querySelector("canvas"); }catch(_){ return null; } }

  function arrFromResp(j){
    if(Array.isArray(j)) return j;
    if(Array.isArray(j?.data)) return j.data;
    if(Array.isArray(j?.data?.list)) return j.data.list;
    if(Array.isArray(j?.result)) return j.result;
    return [];
  }
  async function fetchJson(url){
    const r = await fetch(url, {cache:"no-store"});
    if(!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  }

  /* Same field names Binance reuses across all 3 long/short ratio
     endpoints (account-based, top-account, top-position) — longAccount/
     shortAccount/longShortRatio, just computed server-side by position
     size instead of account count for this particular endpoint. */
  function parsePositionRatio(arr){
    return arr.map(o => {
      const t = +(o.timestamp || o.time || 0);
      let ratio = +o.longShortRatio || 0;
      let long = +o.longAccount || 0;
      let short = +o.shortAccount || 0;
      if(long > 1) long /= 100;
      if(short > 1) short /= 100;
      if(!long && !short && ratio > 0){ long = ratio/(1+ratio); short = 1/(1+ratio); }
      return { t, long, short };
    }).filter(d => d.t && (d.long || d.short)).sort((a,b) => a.t - b.t);
  }

  function oiSeries(){
    try{
      const c = window.DVLOpenInterestOscillator && window.DVLOpenInterestOscillator.cache;
      return (c && Array.isArray(c.data)) ? c.data : [];
    }catch(_){ return []; }
  }
  function oiAt(oi, t){
    if(!oi.length) return null;
    if(t <= oi[0].t) return oi[0];
    if(t >= oi[oi.length-1].t) return oi[oi.length-1];
    let lo=0, hi=oi.length-1;
    while(lo<hi){ const mid=(lo+hi+1)>>1; if(oi[mid].t<=t) lo=mid; else hi=mid-1; }
    return oi[lo];
  }

  /* Joins the position-ratio series with the OI series (already fetched by
     the OI oscillator — no extra OI fetch here) to derive netLong/netShort/
     netDelta at each point. Requires the OI oscillator to have real data;
     if it's off or still loading, this just yields an empty series (drawn
     as "sem dados de OI" below) rather than fetching OI itself again. */
  function joinWithOI(ratioPoints){
    const oi = oiSeries();
    if(!oi.length) return [];
    const out = [];
    for(const p of ratioPoints){
      const o = oiAt(oi, p.t);
      if(!o) continue;
      const base = Number(o.close) || 0;
      const netLong = base * p.long;
      const netShort = base * p.short;
      out.push({ t:p.t, long:p.long, short:p.short, oi:base, netLong, netShort, netDelta: netLong - netShort });
    }
    return out;
  }

  function fmtMoney(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return "--";
    const a = Math.abs(n), sign = n < 0 ? "-" : "";
    if(a >= 1e12) return sign + "$" + (a/1e12).toFixed(2) + "T";
    if(a >= 1e9) return sign + "$" + (a/1e9).toFixed(2) + "B";
    if(a >= 1e6) return sign + "$" + (a/1e6).toFixed(1) + "M";
    if(a >= 1e3) return sign + "$" + (a/1e3).toFixed(0) + "K";
    return sign + "$" + a.toFixed(0);
  }

  function panelMetrics(padL, padR, top, h, w){
    const x0 = padL, x1 = w - padR, y0 = top + 4, y1 = top + h - 6;
    return { padL, padR, top, h, w, x0, x1, y0, y1, labelGap:2 };
  }
  function oscillatorWindow(){
    try{ if(typeof visibleWindow === "function") return visibleWindow(); }catch(_){}
    return { candles:[], totalSlots:(typeof chartViewCount !== "undefined" ? chartViewCount : 140), futureSlots:0, start:0, end:0 };
  }
  function xForIndex(i, m, win){
    const slots = Math.max(2, win.totalSlots || 2);
    const slotOffset = (typeof __dvlSlotOffset === "function") ? __dvlSlotOffset(win, win.candles || []) : 0;
    return m.x0 + (slotOffset + i) / (slots - 1) * (m.x1 - m.x0);
  }
  function valueAt(data, t){
    if(!data || !data.length) return null;
    /* No data before the first collected point → return null (empty), not the
       first point. Otherwise a short series (e.g. a MEXC asset whose OI/funding
       collection just started) stretches its first bar across the whole
       pre-collection region and the MA/line dives across the gap. */
    if(t < data[0].t) return null;
    if(t >= data[data.length-1].t) return data[data.length-1];
    let lo=0, hi=data.length-1;
    while(lo<hi){ const mid=(lo+hi+1)>>1; if(data[mid].t<=t) lo=mid; else hi=mid-1; }
    return data[lo];
  }
  function autoFitRange(values, key){
    if(!values.length) return { lo:-1, hi:1 };
    let lo=Infinity, hi=-Infinity;
    for(const v of values){ const n=v[key]; if(Number.isFinite(n)){ if(n<lo)lo=n; if(n>hi)hi=n; } }
    if(!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo:-1, hi:1 };
    const span = hi - lo || Math.max(Math.abs(hi)*0.1, 1);
    const pad = span * 0.14;
    return { lo: lo - pad, hi: hi + pad };
  }
  function yFor(v, y0, y1, lo, hi){
    const span = (hi - lo) || 1;
    return y1 - (v - lo) / span * (y1 - y0);
  }
  function basePanel(ctx, m, title, right, kind){
    ctx.save();
    ctx.fillStyle = "#020806";
    ctx.fillRect(0, m.top, m.w, m.h);
    ctx.strokeStyle = "rgba(64,105,145,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, m.top+.5); ctx.lineTo(m.w, m.top+.5); ctx.stroke();
    ctx.strokeStyle = "rgba(122,155,145,.092)";
    ctx.lineWidth = .85;
    for(let n=1;n<=3;n++){ const y=m.y0+(m.y1-m.y0)*n/4; ctx.beginPath(); ctx.moveTo(m.x0,y); ctx.lineTo(m.x1,y); ctx.stroke(); }
    ctx.fillStyle = "#020806";
    ctx.fillRect(m.x1, m.top, m.w - m.x1, m.h);
    ctx.strokeStyle = "rgba(64,105,145,.26)";
    ctx.beginPath(); ctx.moveTo(m.x1+.5, m.top); ctx.lineTo(m.x1+.5, m.top+m.h); ctx.stroke();
    const headY = m.y0 + 12;
    ctx.font = "850 9px system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(223,238,255,.84)";
    ctx.fillText(title, m.x0+18, headY);
    ctx.font = "800 9px system-ui";
    ctx.textAlign = "right";
    ctx.fillStyle = kind==="bear" ? "rgba(255,95,110,.88)" : kind==="bull" ? "rgba(0,220,190,.88)" : "rgba(135,155,185,.86)";
    ctx.fillText(right || "", m.x1-8, headY);
    ctx.restore();
  }

  /* Builds one oscillator (Net Short or Net Delta) sharing all the
     plumbing above; `cfg` supplies only what differs between the two. */
  function buildOscillator(cfg){
    const KEY = cfg.storageKey;
    const DEFAULTS = { on:false, maLen:20, maOn:true, lineColor:cfg.lineColor, maColor:"#ffd321" };
    const CACHE = { key:"", data:[], fetching:false, ts:0, src:"", err:"" };
    let state = load();
    let panel = null;

    function clone(v){ return JSON.parse(JSON.stringify(v)); }
    function load(){
      try{ return Object.assign(clone(DEFAULTS), JSON.parse(localStorage.getItem(KEY) || "null") || {}); }
      catch(_){ return clone(DEFAULTS); }
    }
    function save(){
      state.maLen = clamp(parseInt(state.maLen,10) || 20, 2, 500);
      try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
      updateRow();
      if(typeof drawSoon === "function") drawSoon(); else if(typeof draw === "function") draw();
    }
    function on(){ return !!state.on; }
    function setOn(v){ state.on = !!v; save(); if(state.on) ensureData(true); }

    async function ensureData(force, allowOff){
      if(!on() && !allowOff) return;
      const p = period();
      const key = ["binance", sym(), p].join("|");
      if(!force && CACHE.key === key && CACHE.data.length && Date.now() - CACHE.ts < 45000) return;
      if(CACHE.fetching) return;
      CACHE.fetching = true; CACHE.err = ""; updateRow();
      try{
        const base = (typeof DATA !== "undefined" ? DATA : "https://fapi.binance.com/futures/data");
        const pMs = (typeof periodToMs === "function") ? periodToMs(p) : {"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000}[p] || 300000;
        const now = Date.now();
        const url = (n) => base + "/topLongShortPositionRatio?symbol=" + encodeURIComponent(sym()) + "&period=" + encodeURIComponent(p) + "&limit=500" + (n>0 ? "&endTime="+(now-n*500*pMs) : "");
        const [r0,r1,r2] = await Promise.all([fetchJson(url(0)), fetchJson(url(1)).catch(()=>[]), fetchJson(url(2)).catch(()=>[])]);
        const seen = new Set();
        const arr = [arrFromResp(r0), arrFromResp(r1), arrFromResp(r2)].flat().sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{ const k=x.timestamp; if(seen.has(k)) return false; seen.add(k); return true; });
        const ratioPoints = parsePositionRatio(arr);
        const data = joinWithOI(ratioPoints);
        if(!data.length) throw new Error(oiSeries().length ? "NO DATA" : "SEM OI");
        CACHE.key = key; CACHE.data = data; CACHE.ts = Date.now(); CACHE.src = "AGREGADO"; CACHE.err = "";
      }catch(e){
        CACHE.err = String(e && e.message || e);
        CACHE.data = [];
      }finally{
        CACHE.fetching = false;
        updateRow();
        if(typeof drawSoon === "function") drawSoon();
      }
    }

    function draw(ctx, padL, padR, top, h, w){
      window.__dvlOscillatorPanelBounds = window.__dvlOscillatorPanelBounds || {};
      window.__dvlOscillatorPanelBounds[cfg.boundsKey] = { top, h, w, padL, padR };
      if(!on()) return;
      if(!CACHE.fetching && !CACHE.data.length) ensureData(false);

      const m = panelMetrics(padL, padR, top, h, w);
      const win = oscillatorWindow();
      const view = win.candles || [];
      const vals = [];
      for(let i=0;i<view.length;i++){ const d = valueAt(CACHE.data, Number(view[i].time)); if(d) vals.push(d); }
      const allScale = vals.length ? vals : (CACHE.data || []).slice(-160);
      const fit = autoFitRange(allScale, cfg.field);

      const last = vals.length ? vals[vals.length-1] : (CACHE.data || []).at(-1);
      const prev = vals.length > 1 ? vals[vals.length-2] : ((CACHE.data||[]).length > 1 ? (CACHE.data||[]).at(-2) : last);
      const trendUp = last && prev ? (last[cfg.field] > prev[cfg.field]) : null;
      const kind = trendUp == null ? "neutral" : (trendUp ? cfg.upKind : cfg.downKind);
      const right = last ? fmtMoney(last[cfg.field]) : (CACHE.fetching ? "LOADING" : (CACHE.err === "SEM OI" ? "SEM OI" : "NO DATA"));

      ctx.save();
      basePanel(ctx, m, cfg.title, right, kind);
      ctx.save();
      ctx.beginPath();
      ctx.rect(m.x0, m.y0, m.x1-m.x0, Math.max(1, m.y1-m.y0));
      ctx.clip();

      if(cfg.zeroLine){
        const zy = yFor(0, m.y0, m.y1, fit.lo, fit.hi);
        ctx.strokeStyle = "rgba(150,180,168,.30)";
        ctx.setLineDash([4,6]);
        ctx.beginPath(); ctx.moveTo(m.x0, zy); ctx.lineTo(m.x1, zy); ctx.stroke();
        ctx.setLineDash([]);
      }

      if(vals.length){
        const points = [];
        for(let i=0;i<view.length;i++){
          const d = valueAt(CACHE.data, Number(view[i].time));
          if(!d) continue;
          const xx = xForIndex(i, m, win);
          const yy = yFor(d[cfg.field], m.y0, m.y1, fit.lo, fit.hi);
          if(!Number.isFinite(xx) || !Number.isFinite(yy)) continue;
          if(xx < m.x0-14 || xx > m.x1+14) continue;
          points.push({x:xx, y:yy});
        }
        if(points.length > 1){
          ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 1.55;
          ctx.strokeStyle = state.lineColor || cfg.lineColor;
          ctx.shadowColor = (state.lineColor || cfg.lineColor) + "2e";
          ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
          for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
          ctx.stroke();
          ctx.shadowBlur = 0;
          const lp = points[points.length-1];
          ctx.fillStyle = state.lineColor || cfg.lineColor;
          ctx.beginPath(); ctx.arc(lp.x, lp.y, 2.4, 0, Math.PI*2); ctx.fill();
        }

        if(state.maOn && CACHE.data.length >= 2){
          const maLen = Math.max(2, Math.round(state.maLen) || 20);
          const seq = CACHE.data.map(d => d[cfg.field]);
          const prefix = new Array(seq.length+1).fill(0);
          for(let i=0;i<seq.length;i++) prefix[i+1] = prefix[i] + seq[i];
          const idxMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));
          ctx.beginPath();
          ctx.strokeStyle = state.maColor;
          ctx.lineWidth = 1.4;
          let started = false;
          for(let i=0;i<view.length;i++){
            const d = valueAt(CACHE.data, Number(view[i].time));
            if(!d) continue;
            const idx = idxMap.get(d.t);
            if(idx === undefined) continue;
            const st = Math.max(0, idx - maLen + 1);
            const avg = (prefix[idx+1] - prefix[st]) / (idx - st + 1);
            const xx = xForIndex(i, m, win);
            const yy = yFor(avg, m.y0, m.y1, fit.lo, fit.hi);
            if(!started){ ctx.moveTo(xx,yy); started = true; } else ctx.lineTo(xx,yy);
          }
          if(started) ctx.stroke();
        }

        ctx.fillStyle = "rgba(120,145,180,.78)";
        ctx.font = "760 8px system-ui";
        ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText(CACHE.src || "AGREGADO", m.x0+8, m.y1-5);
      }else{
        ctx.fillStyle = "rgba(127,145,167,.72)";
        ctx.font = "800 9px system-ui";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        const msg = CACHE.fetching ? ("carregando " + cfg.title + "…") : (CACHE.err === "SEM OI" ? "ligue o indicador DVL Open Interest primeiro" : (cfg.title + " indisponível"));
        ctx.fillText(msg, m.x0+18, (m.y0+m.y1)/2);
      }
      ctx.restore();

      ctx.font = "9.2px system-ui";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(165,170,168,.72)";
      for(let i=0;i<=4;i++){
        const v = fit.hi - (fit.hi - fit.lo) * i/4;
        ctx.fillText(fmtMoney(v), m.x1 + m.labelGap, yFor(v, m.y0, m.y1, fit.lo, fit.hi));
      }
      ctx.restore();
    }

    function updateRow(){
      const st = document.getElementById(cfg.stateId);
      if(st){
        st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";
        st.classList.toggle("is-on", !!state.on);
        st.setAttribute("aria-label", cfg.title + " " + (state.on ? "ON" : "OFF"));
      }
      const cb = panel && panel.querySelector("#" + cfg.onCheckboxId);
      if(cb && cb.checked !== !!state.on) cb.checked = !!state.on;
    }

    function insertRow(){
      const menu = document.getElementById("indicatorDropdown");
      if(!menu) return;
      let item = document.getElementById(cfg.rowId);
      if(!item){
        item = document.createElement("div");
        item.id = cfg.rowId;
        item.className = "indicatorItem " + cfg.itemClass;
        item.innerHTML = '<span class="indicatorFxMark">' + cfg.mark + '</span>'
          + '<span><b>' + cfg.title + '</b><small>' + cfg.sub + '</small></span>'
          + '<i class="dvl-vt-state" id="' + cfg.stateId + '">OFF</i>';
        const after = document.getElementById(cfg.afterRowId) || document.getElementById("dvlOpenInterestOscItem");
        if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);
        else menu.appendChild(item);
      }
      if(!item.dataset.dvlNetFlowBound){
        item.dataset.dvlNetFlowBound = "1";
        const pill = item.querySelector("#" + cfg.stateId);
        if(pill) pill.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); setOn(!state.on); });
        item.addEventListener("click", ev => { ev.stopPropagation(); openPanel(); });
      }
      updateRow();
    }

    function ensurePanel(){
      if(panel) return panel;
      panel = document.createElement("div");
      panel.id = cfg.panelId;
      panel.className = "dvl-vt-panel";
      panel.innerHTML = '<div class="dvl-vt-head">'
        + '<div class="dvl-vt-title"><b>' + cfg.title + '</b><small>' + cfg.sub + '</small></div>'
        + '<div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="' + cfg.panelId + 'Close" type="button">×</button></div>'
        + '</div><div class="dvl-vt-body" id="' + cfg.panelId + 'Body"></div>';
      document.body.appendChild(panel);
      panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
      panel.querySelector("#" + cfg.panelId + "Close").addEventListener("click", closePanel);
      return panel;
    }
    function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
    function closePanel(){ if(panel) panel.classList.remove("is-open"); }
    function renderPanel(){
      ensurePanel();
      const body = panel.querySelector("#" + cfg.panelId + "Body");
      body.innerHTML = '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>General</span></div>'
        + '<div class="dvl-vt-grid">'
        + '<div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="' + cfg.onCheckboxId + '" type="checkbox" ' + (state.on?"checked":"") + '><i></i><b></b></label></div>'
        + '<div class="dvl-vt-field"><label>MA</label><label class="dvl-switch"><input id="' + cfg.panelId + 'MaOn" type="checkbox" ' + (state.maOn?"checked":"") + '><i></i><b></b></label></div>'
        + '<div class="dvl-vt-field"><label>MA Length</label><input id="' + cfg.panelId + 'MaLen" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="' + (state.maLen||20) + '"></div>'
        + '</div></div>';
      const onCb = panel.querySelector("#" + cfg.onCheckboxId);
      if(onCb) onCb.addEventListener("change", () => { setOn(onCb.checked); });
      const maOnCb = panel.querySelector("#" + cfg.panelId + "MaOn");
      if(maOnCb) maOnCb.addEventListener("change", () => { state.maOn = maOnCb.checked; save(); });
      const maLenInp = panel.querySelector("#" + cfg.panelId + "MaLen");
      if(maLenInp) maLenInp.addEventListener("change", () => { const v = clamp(parseInt(maLenInp.value,10)||20, 2, 500); maLenInp.value = v; state.maLen = v; save(); });
    }

    function boot(){
      insertRow();
      updateRow();
      ensureData(false);
      setInterval(() => { if(state.on) ensureData(false); }, 45000);
      if(typeof drawSoon === "function") drawSoon();
    }
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    return {
      version:"1.0",
      on, setOn, draw,
      open:openPanel, openPanel, close:closePanel,
      refresh:function(){ return ensureData(true); },
      prime:function(){ return ensureData(false, true); },
      get state(){ return Object.assign({}, state); },
      get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data||[]).slice() }); }
    };
  }

  window.DVLNetLongOscillator = buildOscillator({
    storageKey:"dvl_netlong_oscillator_v1",
    boundsKey:"netLong",
    field:"netLong",
    title:"DVL Net Long",
    sub:"aprox. via Binance (posição × OI)",
    mark:"NL",
    lineColor:"#13dc8d",
    zeroLine:false,
    upKind:"bull",   // net long rising = more long conviction building
    downKind:"bear", // net long falling = longs leaving/covering
    rowId:"dvlNetLongItem",
    stateId:"dvlNetLongState",
    panelId:"dvlNetLongPanel",
    itemClass:"dvl-netlong-indicator-item",
    onCheckboxId:"dvlNetLongOn",
    afterRowId:"dvlLongShortOscItem"
  });

  window.DVLNetShortOscillator = buildOscillator({
    storageKey:"dvl_netshort_oscillator_v1",
    boundsKey:"netShort",
    field:"netShort",
    title:"DVL Net Short",
    sub:"aprox. via Binance (posição × OI)",
    mark:"NS",
    lineColor:"#ff4a61",
    zeroLine:false,
    upKind:"bear",   // net short rising = more short pressure building
    downKind:"bull", // net short falling = shorts leaving/covering
    rowId:"dvlNetShortItem",
    stateId:"dvlNetShortState",
    panelId:"dvlNetShortPanel",
    itemClass:"dvl-netshort-indicator-item",
    onCheckboxId:"dvlNetShortOn",
    afterRowId:"dvlNetLongItem"
  });

  window.DVLNetDeltaOscillator = buildOscillator({
    storageKey:"dvl_netdelta_oscillator_v1",
    boundsKey:"netDelta",
    field:"netDelta",
    title:"DVL Net Delta",
    sub:"aprox. via Binance (long − short × OI)",
    mark:"ND",
    lineColor:"#10df77",
    zeroLine:true,
    upKind:"bull",   // delta rising = buy side (longs or short-covering) winning
    downKind:"bear", // delta falling = sell side winning
    rowId:"dvlNetDeltaItem",
    stateId:"dvlNetDeltaState",
    panelId:"dvlNetDeltaPanel",
    itemClass:"dvl-netdelta-indicator-item",
    onCheckboxId:"dvlNetDeltaOn",
    afterRowId:"dvlNetShortItem"
  });
})();
