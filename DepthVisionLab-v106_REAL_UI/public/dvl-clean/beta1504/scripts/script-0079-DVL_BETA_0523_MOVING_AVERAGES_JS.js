(function(){
  "use strict";

  /* Imported/adapted from uploaded dvl_moving_averages.js: SMA, EMA, WMA, VWMA, RMA, HMA, DEMA, TEMA, LSMA, KAMA. */
  const KEY = "dvl_maSettings_v2";
  const TYPES = ["SMA","EMA","WMA","VWMA","RMA","HMA","DEMA","TEMA","LSMA","KAMA"];
  const STYLES = ["solid","dashed","dotted"];
  const PALETTE = ["#22d3ee","#f59e0b","#a855f7","#ef4444","#34d399","#60a5fa","#f97316","#e879f9","#4ade80","#fb7185","#ffffff","#7f91a7"];
  const DEFAULTS = {
    on:false,
    showLabels:false,
    items:[
      {enabled:true, period:20,  type:"SMA", color:"#22d3ee", width:2, style:"solid"},
      {enabled:false,period:50,  type:"SMA", color:"#f59e0b", width:2, style:"solid"},
      {enabled:false,period:100, type:"SMA", color:"#a855f7", width:2, style:"solid"},
      {enabled:false,period:200, type:"SMA", color:"#ef4444", width:2, style:"solid"},
      {enabled:false,period:10,  type:"SMA", color:"#34d399", width:1, style:"solid"},
      {enabled:false,period:21,  type:"SMA", color:"#60a5fa", width:1, style:"solid"},
      {enabled:false,period:34,  type:"SMA", color:"#f97316", width:1, style:"solid"},
      {enabled:false,period:55,  type:"SMA", color:"#e879f9", width:1, style:"solid"},
      {enabled:false,period:89,  type:"SMA", color:"#4ade80", width:1, style:"solid"},
      {enabled:false,period:144, type:"SMA", color:"#fb7185", width:1, style:"solid"}
    ]
  };

  let state = load();
  try{
    const migKey = "dvl_spike_zones_v533_migrated";
    if(localStorage.getItem(migKey) !== "1"){
      if(Number(state.expire) === 250) state.expire = 0;
      if(Number(state.maxZones) === 80) state.maxZones = 200;
      if(Number(state.spacingAtr) === 0.25) state.spacingAtr = 0.10;
      if(state.proxOn === true && Number(state.proxDist) === 1.0) state.proxOn = false;
      localStorage.setItem(migKey, "1");
      try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    }
  }catch(_){}
  let panel = null;
  let palette = null;
  let paletteIndex = null;
  let cache = new Map();

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function normalize(s){
    const out = clone(DEFAULTS);
    if(s && typeof s === "object"){
      out.on = s.on !== false;
      out.showLabels = !!s.showLabels;
      if(Array.isArray(s.items)){
        out.items = DEFAULTS.items.map((d,i)=>Object.assign({}, d, s.items[i] || {}));
      }
    }
    out.items.forEach((m,i)=>{
      m.enabled = !!m.enabled;
      m.period = clamp(parseInt(m.period || DEFAULTS.items[i].period, 10) || DEFAULTS.items[i].period, 1, 999);
      m.type = TYPES.includes(m.type) ? m.type : "SMA";
      m.color = /^#[0-9a-f]{6}$/i.test(String(m.color || "")) ? m.color : DEFAULTS.items[i].color;
      m.width = clamp(Number(m.width) || DEFAULTS.items[i].width, 1, 6);
      m.style = STYLES.includes(m.style) ? m.style : "solid";
    });
    return out;
  }

  function load(){
    try{
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      var obj = normalize(raw);
      /*
        0.832 migration: old default was 80/20. New default requested by user is 60/35.
        Only migrate untouched old defaults; custom levels remain preserved.
      */
      if(raw && Number(raw.upperZoneLevel) === 80 && Number(raw.lowerZoneLevel) === 20){
        obj.upperZoneLevel = 60;
        obj.lowerZoneLevel = 35;
        try{ localStorage.setItem(KEY, JSON.stringify(obj)); }catch(_m){}
      }
      return obj;
    }
    catch(_){ return clone(DEFAULTS); }
  }

  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    updateItem();
    if(typeof drawSoon === "function") drawSoon();
    else if(typeof draw === "function") draw();
  }

  function reset(){
    state = clone(DEFAULTS);
    cache.clear();
    save();
    renderPanel();
  }

  /* Beta 1.210 — the MA value arrays were cached, but their input source was
     still rebuilt with klines.map() on every draw. Keep a lightweight mirror
     and mutate only its live final row while the source array/length is stable. */
  let __dvlMaSourceCache1210={ref:null,len:0,rows:[]};
  function candles(){
    try{
      if(!Array.isArray(klines)) return [];
      const n=klines.length;
      if(__dvlMaSourceCache1210.ref!==klines || __dvlMaSourceCache1210.len!==n){
        const rows=new Array(n);
        for(let i=0;i<n;i++){
          const c=klines[i];
          rows[i]={c:Number(c.close),v:Number(c.volume)||1,time:Number(c.time)};
        }
        __dvlMaSourceCache1210={ref:klines,len:n,rows:rows};
      }else if(n){
        const c=klines[n-1],r=__dvlMaSourceCache1210.rows[n-1];
        const nc=Number(c.close),nv=Number(c.volume)||1,nt=Number(c.time);
        if(!r || r.c!==nc || r.v!==nv || r.time!==nt) __dvlMaSourceCache1210.rows[n-1]={c:nc,v:nv,time:nt};
      }
      return __dvlMaSourceCache1210.rows;
    }catch(_){}
    return [];
  }

  function calcSMA(cs,p){
    const n=cs.length,res=new Array(n).fill(null); let sum=0;
    for(let i=0;i<n;i++){
      sum+=cs[i].c;
      if(i>=p) sum-=cs[i-p].c;
      if(i>=p-1) res[i]=sum/p;
    }
    return res;
  }

  function calcEMA(cs,p){
    const n=cs.length,res=new Array(n).fill(null),k=2/(p+1); let ema=0,started=false;
    for(let i=0;i<n;i++){
      if(!started){
        if(i<p-1) continue;
        let s=0; for(let j=i-p+1;j<=i;j++) s+=cs[j].c;
        ema=s/p; started=true; res[i]=ema;
      }else{
        ema=cs[i].c*k+ema*(1-k); res[i]=ema;
      }
    }
    return res;
  }

  function calcWMA(cs,p){
    const n=cs.length,res=new Array(n).fill(null),denom=p*(p+1)/2;
    for(let i=p-1;i<n;i++){
      let ws=0; for(let j=0;j<p;j++) ws+=(p-j)*cs[i-j].c;
      res[i]=ws/denom;
    }
    return res;
  }

  function calcVWMA(cs,p){
    const n=cs.length,res=new Array(n).fill(null);
    for(let i=p-1;i<n;i++){
      let pv=0,v=0;
      for(let j=0;j<p;j++){ pv+=cs[i-j].c*(cs[i-j].v||1); v+=cs[i-j].v||1; }
      res[i]=v>0?pv/v:cs[i].c;
    }
    return res;
  }

  function calcRMA(cs,p){
    const n=cs.length,res=new Array(n).fill(null),a=1/p; let rma=0,started=false;
    for(let i=0;i<n;i++){
      if(!started){
        if(i<p-1) continue;
        let s=0; for(let j=i-p+1;j<=i;j++) s+=cs[j].c;
        rma=s/p; started=true; res[i]=rma;
      }else{
        rma=cs[i].c*a+rma*(1-a); res[i]=rma;
      }
    }
    return res;
  }

  function calcHMA(cs,p){
    const h=Math.max(2,Math.round(Math.sqrt(p)));
    const h2=Math.max(2,Math.round(p/2));
    const w1=calcWMA(cs,p),w2=calcWMA(cs,h2),n=cs.length;
    const synth=[];
    for(let i=0;i<n;i++) synth.push({c:(w1[i]!=null&&w2[i]!=null)?2*w2[i]-w1[i]:0,v:1});
    const raw=calcWMA(synth,h);
    for(let i=0;i<n;i++){ if(w1[i]==null||w2[i]==null) raw[i]=null; }
    return raw;
  }

  function calcDEMA(cs,p){
    const e1=calcEMA(cs,p),n=cs.length,synth=[];
    for(let i=0;i<n;i++) synth.push({c:e1[i]||0,v:1});
    const e2=calcEMA(synth,p),res=new Array(n).fill(null);
    for(let i=0;i<n;i++){ if(e1[i]!=null&&e2[i]!=null) res[i]=2*e1[i]-e2[i]; }
    return res;
  }

  function calcTEMA(cs,p){
    const e1=calcEMA(cs,p),n=cs.length,s1=[],s2=[];
    for(let i=0;i<n;i++) s1.push({c:e1[i]||0,v:1});
    const e2=calcEMA(s1,p);
    for(let i=0;i<n;i++) s2.push({c:e2[i]||0,v:1});
    const e3=calcEMA(s2,p),res=new Array(n).fill(null);
    for(let i=0;i<n;i++){ if(e1[i]!=null&&e2[i]!=null&&e3[i]!=null) res[i]=3*e1[i]-3*e2[i]+e3[i]; }
    return res;
  }

  function calcLSMA(cs,p){
    const n=cs.length,res=new Array(n).fill(null);
    for(let i=p-1;i<n;i++){
      let sx=0,sy=0,sxy=0,sx2=0;
      for(let j=0;j<p;j++){
        const xv=j,yv=cs[i-p+1+j].c;
        sx+=xv; sy+=yv; sxy+=xv*yv; sx2+=xv*xv;
      }
      const den=p*sx2-sx*sx;
      if(den===0){ res[i]=sy/p; continue; }
      const sl=(p*sxy-sx*sy)/den,ic=(sy-sl*sx)/p;
      res[i]=ic+sl*(p-1);
    }
    return res;
  }

  function calcKAMA(cs,p){
    const n=cs.length,res=new Array(n).fill(null),fast=2/3,slow=2/31; let kama=0;
    for(let i=0;i<n;i++){
      if(i<p) continue;
      if(i===p) kama=cs[i-1].c;
      const change=Math.abs(cs[i].c-cs[i-p].c); let vol=0;
      for(let j=1;j<=p;j++) vol+=Math.abs(cs[i-j+1].c-cs[i-j].c);
      const er=vol>0?change/vol:0,sc=Math.pow(er*(fast-slow)+slow,2);
      kama+=sc*(cs[i].c-kama); res[i]=kama;
    }
    return res;
  }

  function calcMA(cs,p,type){
    if(p<1||!cs||cs.length<2) return new Array((cs||[]).length).fill(null);
    switch(type){
      case "EMA": return calcEMA(cs,p);
      case "WMA": return calcWMA(cs,p);
      case "VWMA": return calcVWMA(cs,p);
      case "RMA": return calcRMA(cs,p);
      case "HMA": return calcHMA(cs,p);
      case "DEMA": return calcDEMA(cs,p);
      case "TEMA": return calcTEMA(cs,p);
      case "LSMA": return calcLSMA(cs,p);
      case "KAMA": return calcKAMA(cs,p);
      default: return calcSMA(cs,p);
    }
  }

  function cached(cs,p,type){
    const last = cs[cs.length-1]?.c || 0;
    let s = "BTCUSDT", tf = "1m";
    try{ s = typeof symbol !== "undefined" ? symbol : s; }catch(_){}
    try{ tf = typeof interval !== "undefined" ? interval : tf; }catch(_){}
    const key = s+"|"+tf+"|"+p+"|"+type+"|"+cs.length+"|"+last.toFixed(2);
    if(cache.has(key)) return cache.get(key);
    const vals = calcMA(cs,p,type);
    cache.set(key, vals);
    if(cache.size > 80) cache.delete(cache.keys().next().value);
    return vals;
  }

  function updateItem(){
    const st = document.getElementById("dvlMaState");
    if(st){
      st.textContent = state.on ? "ON" : "OFF";
      st.setAttribute("aria-label", state.on ? "Moving Averages ON" : "Moving Averages OFF");
      st.classList.toggle("is-on", !!state.on);
    }
  }

  function insertItem(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu || document.getElementById("dvlMovingAveragesItem")) return;

    const item = document.createElement("div");
    item.id = "dvlMovingAveragesItem";
    item.className = "indicatorItem dvl-ma-indicator-item";
    item.innerHTML = `
      <span class="indicatorFxMark">MA</span>
      <span><b>Moving Averages</b><small>overlay</small></span>
      <i class="dvl-vt-state" id="dvlMaState">ON</i>
    `;

    const vt = document.getElementById("dvlVolumeTraceItem");
    if(vt && vt.parentNode) vt.parentNode.insertBefore(item, vt.nextSibling);
    else {
      const head = menu.querySelector(".indicatorDropHead");
      if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling);
      else menu.appendChild(item);
    }

    const pill = item.querySelector("#dvlMaState");
    if(pill){
      pill.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        state.on = !state.on;
        save();
      });
    }

    item.addEventListener("click", ev => {
      ev.stopPropagation();
      openPanel();
    });

    updateItem();
  }

  function ensurePanel(){
    if(panel) return panel;

    panel = document.createElement("div");
    panel.id = "dvlMovingAveragesPanel";
    panel.className = "dvl-vt-panel dvl-ma-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title">
          <b>Moving Averages</b>
          <small>DVL overlay · 10 averages</small>
        </div>
        <div class="dvl-vt-head-actions">
          <button class="dvl-vt-reset-icon" id="dvlMaReset" type="button" aria-label="Reset Moving Averages">↻</button>
          <button class="dvl-vt-close" id="dvlMaClose" type="button">×</button>
        </div>
      </div>
      <div class="dvl-vt-body" id="dvlMaBody"></div>
    `;
    document.body.appendChild(panel);

    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlMaClose").addEventListener("click", closePanel);
    panel.querySelector("#dvlMaReset").addEventListener("click", reset);

    return panel;
  }

  function openPanel(){
    ensurePanel();
    panel.classList.add("is-open");
    renderPanel();
  }

  function closePanel(){
    if(panel) panel.classList.remove("is-open");
  }

  function options(list, current){
    return list.map(v => `<option value="${v}" ${v===current?"selected":""}>${v}</option>`).join("");
  }

  function card(m, i){
    const n = i + 1;
    return `
      <div class="dvl-ma-line" data-ma="${i}">
        <label class="dvl-ma-mini-check" aria-label="MA${n} ON/OFF">
          <input type="checkbox" data-k="enabled" ${m.enabled ? "checked" : ""}>
          <i></i>
        </label>
        <div class="dvl-ma-row-name">MA${n}</div>
        <input class="dvl-vt-input dvl-ma-period" data-k="period" type="number" min="1" max="999" step="1" value="${m.period}">
        <select class="dvl-vt-select dvl-ma-type" data-k="type">${options(TYPES, m.type)}</select>
        <button type="button" class="dvl-ma-color-btn dvl-ma-color-mini" data-color-btn="${i}" aria-label="MA${n} color">
          <i style="background:${m.color}"></i>
        </button>
        <select class="dvl-vt-select dvl-ma-width" data-k="width">${options(["1","1.5","2","2.5","3","4","5","6"], String(m.width))}</select>
        <select class="dvl-vt-select dvl-ma-style" data-k="style">${options(STYLES, m.style)}</select>
      </div>
    `;
  }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlMaBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field">
            <label>Indicator</label>
            <label class="dvl-switch">
              <input id="dvlMaOn" type="checkbox" ${state.on ? "checked" : ""}>
              <i></i><b></b>
            </label>
          </div>
          <div class="dvl-vt-field">
            <label>Labels</label>
            <label class="dvl-switch dvl-ma-show-labels">
              <input id="dvlMaLabels" type="checkbox" ${state.showLabels ? "checked" : ""}>
              <i></i><b></b>
            </label>
          </div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Averages</span></div>
        <div class="dvl-ma-list">
          ${state.items.map(card).join("")}
        </div>
      </div>
    `;

    bindPanel();

    try{
      if(window.DVLIndicatorCustomControls && typeof window.DVLIndicatorCustomControls.upgrade === "function"){
        window.DVLIndicatorCustomControls.upgrade(panel);
      }
    }catch(_){}
  }

  function bindPanel(){
    const on = panel.querySelector("#dvlMaOn");
    const labels = panel.querySelector("#dvlMaLabels");

    if(on) on.addEventListener("change", () => { state.on = !!on.checked; save(); });
    if(labels) labels.addEventListener("change", () => { state.showLabels = !!labels.checked; save(); });

    panel.querySelectorAll(".dvl-ma-line").forEach(cardEl => {
      const idx = Number(cardEl.dataset.ma);
      const m = state.items[idx];
      if(!m) return;

      cardEl.querySelectorAll("[data-k]").forEach(el => {
        const k = el.dataset.k;
        const sync = () => {
          if(k === "enabled") m.enabled = !!el.checked;
          else if(k === "period") m.period = clamp(parseInt(el.value, 10) || m.period, 1, 999);
          else if(k === "width") m.width = clamp(Number(el.value) || m.width, 1, 6);
          else if(k === "type") m.type = TYPES.includes(el.value) ? el.value : "SMA";
          else if(k === "style") m.style = STYLES.includes(el.value) ? el.value : "solid";
          cache.clear();
          save();
          renderPanel();
        };
        el.addEventListener("change", sync);
        el.addEventListener("input", () => {
          if(k === "period" || k === "width") sync();
        });
      });

      const colorBtn = cardEl.querySelector("[data-color-btn]");
      if(colorBtn) colorBtn.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        openPalette(idx, colorBtn);
      });
    });
  }

  function ensurePalette(){
    if(palette) return palette;
    palette = document.createElement("div");
    palette.id = "dvlMaPalette";
    palette.className = "dvl-ma-palette";
    palette.innerHTML = `<div class="dvl-ma-color-grid">${PALETTE.map(c => `<button type="button" class="dvl-ma-swatch" data-color="${c}" style="background:${c}"></button>`).join("")}</div>`;
    document.body.appendChild(palette);
    palette.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    palette.addEventListener("click", ev => {
      const sw = ev.target.closest(".dvl-ma-swatch");
      if(!sw || paletteIndex == null) return;
      const m = state.items[paletteIndex];
      if(m){
        m.color = sw.dataset.color;
        cache.clear();
        save();
        renderPanel();
      }
      closePalette();
    });
    return palette;
  }

  function openPalette(idx, anchor){
    ensurePalette();
    paletteIndex = idx;
    const r = anchor.getBoundingClientRect();
    const w = 154;
    palette.style.left = Math.max(5, Math.min(window.innerWidth - w - 5, r.left)) + "px";
    palette.style.top = Math.min(window.innerHeight - 180, r.bottom + 5) + "px";
    palette.classList.add("is-open");
  }

  function closePalette(){
    if(palette) palette.classList.remove("is-open");
    paletteIndex = null;
  }

  function draw(ctx, cfg){
    try{
      if(!state.on || !cfg || !cfg.win) return;
      const cs = candles();
      if(!cs.length) return;

      const start = Math.max(0, Math.floor(cfg.win.start) - 2);
      const end = Math.min(cs.length - 1, Math.ceil(cfg.win.end) + 2);
      const rightLimit = cfg.x1 - 4;
      const leftLimit = cfg.x0 + 2;

      ctx.save();

      state.items.forEach(m => {
        if(!m.enabled || m.period < 1) return;
        const vals = cached(cs, m.period, m.type);
        if(!vals || !vals.length) return;

        ctx.strokeStyle = m.color;
        ctx.lineWidth = Math.max(1, Number(m.width) || 1);
        if(m.style === "dashed") ctx.setLineDash([6,4]);
        else if(m.style === "dotted") ctx.setLineDash([2,3]);
        else ctx.setLineDash([]);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.beginPath();
        let down = false;
        for(let j=start;j<=end;j++){
          const v = vals[j];
          if(v == null || !Number.isFinite(v)){ down = false; continue; }
          const local = j - cfg.win.start;
          const px = cfg.x(cfg.slotOffset + local);
          const py = cfg.y(v);
          if(px < leftLimit - 20 || px > rightLimit + 20 || py < cfg.y0 - 18 || py > cfg.y1 + 18){
            down = false;
            continue;
          }
          if(!down){ ctx.moveTo(px, py); down = true; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if(state.showLabels){
          let lastIdx = -1, lastVal = null;
          for(let j=end;j>=start;j--){
            if(vals[j] != null && Number.isFinite(vals[j])){ lastIdx = j; lastVal = vals[j]; break; }
          }
          if(lastIdx >= 0){
            const py = cfg.y(lastVal);
            if(py > cfg.y0 && py < cfg.y1){
              const label = m.type + m.period;
              ctx.font = "900 8px system-ui";
              const tw = ctx.measureText(label).width;
              const lx = Math.max(leftLimit, rightLimit - tw - 7);
              ctx.fillStyle = "rgba(3,10,20,.72)";
              if(typeof roundRect === "function") roundRect(ctx, lx - 3, py - 7, tw + 7, 14, 5, true, false, "rgba(3,10,20,.72)");
              else ctx.fillRect(lx - 3, py - 7, tw + 7, 14);
              ctx.fillStyle = m.color;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(label, lx, py);
            }
          }
        }
      });

      ctx.restore();
    }catch(err){
      console.warn("DVL Moving Averages draw error", err);
    }
  }

  function boot(){
    insertItem();
    updateItem();

    document.addEventListener("pointerdown", ev => {
      if(palette && !ev.target.closest(".dvl-ma-palette") && !ev.target.closest(".dvl-ma-color-btn")) closePalette();
    }, true);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLMovingAverages = {
    version:"0.577",
    get state(){ return state; },
    open:openPanel,
    reset,
    draw
  };
  window.DVLMovingAveragesDraw = draw;
})();
