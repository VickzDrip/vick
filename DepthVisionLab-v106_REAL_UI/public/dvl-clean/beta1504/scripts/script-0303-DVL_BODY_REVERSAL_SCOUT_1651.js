/* DVL Body Reversal Scout 1.653
   Closed-candle, OHLC-only exhaustion watch for 15s/30s candles.
   Signals are informational and never place or manage orders.
   DVL_BODY_REVERSAL_NATIVE_REGISTRY_1653 uses the native 0813 menu registry. */
(function(root, makeEngine){
  "use strict";

  const Engine = makeEngine();
  if(typeof module === "object" && module.exports) module.exports = Engine;
  if(!root || !root.document) return;
  if(root.DVLBodyReversalScout) return;

  const KEY = "DVL_BODY_REVERSAL_SCOUT_1651";
  const SCRIPT_ID = "DVL_BODY_REVERSAL_SCOUT_1651";
  const DEFAULTS = {
    on:false,
    sourceTf:"30s",
    sensitivity:"balanced",
    projectTo5m:true,
    showLabels:true,
    color:"#ff9f1c",
    historyLimit:8000
  };

  let state = load();
  let panel = null;
  let computeCache = {sig:"", signals:[]};
  let sourceCache = {key:"", rows:[], loading:false, error:"", fetchedAt:0, attemptedAt:0};

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function normalizeState(raw){
    const out = clone(DEFAULTS);
    if(raw && typeof raw === "object") Object.assign(out, raw);
    out.on = !!out.on;
    out.sourceTf = out.sourceTf === "15s" ? "15s" : "30s";
    out.sensitivity = ["early","balanced","strict"].includes(out.sensitivity) ? out.sensitivity : "balanced";
    out.projectTo5m = out.projectTo5m !== false;
    out.showLabels = out.showLabels !== false;
    out.color = /^#[0-9a-f]{6}$/i.test(String(out.color || "")) ? out.color : DEFAULTS.color;
    out.historyLimit = Math.max(2000, Math.min(10000, Math.round(Number(out.historyLimit) || DEFAULTS.historyLimit)));
    return out;
  }
  function load(){
    try{ return normalizeState(JSON.parse(localStorage.getItem(KEY) || "null")); }
    catch(_){ return clone(DEFAULTS); }
  }
  function save(){
    state = normalizeState(state);
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    computeCache.sig = "";
    updateRows();
    renderPanel();
    redraw();
  }
  function reset(){
    state = clone(DEFAULTS);
    sourceCache = {key:"", rows:[], loading:false, error:"", fetchedAt:0, attemptedAt:0};
    save();
    if(state.on) fetchSource(true);
  }
  function redraw(){
    try{
      if(root.DVL_RENDER_SCHEDULER && typeof root.DVL_RENDER_SCHEDULER.request === "function") root.DVL_RENDER_SCHEDULER.request();
      else if(typeof drawSoon === "function") drawSoon();
      else if(root.drawSoon) root.drawSoon();
    }catch(_){}
  }
  function currentSymbol(){
    try{ return String(typeof symbol !== "undefined" ? symbol : "BTCUSDT").toUpperCase(); }
    catch(_){ return "BTCUSDT"; }
  }
  function currentTf(){
    try{ return String(typeof interval !== "undefined" ? interval : "5m"); }
    catch(_){ return "5m"; }
  }
  function chartRows(){
    try{ return Array.isArray(klines) ? klines : []; }
    catch(_){ return []; }
  }
  function rowTime(c){ return Number(c && (c.time ?? c.openTime ?? c.t)); }
  function normalizeFeedRow(c){
    return {
      time:rowTime(c),
      open:Number(c && (c.open ?? c.o)),
      high:Number(c && (c.high ?? c.h)),
      low:Number(c && (c.low ?? c.l)),
      close:Number(c && (c.close ?? c.c)),
      volume:Number(c && (c.volume ?? c.baseVolume ?? c.v)) || 0,
      isClosed:c && typeof c.isClosed === "boolean" ? c.isClosed : undefined
    };
  }
  function mergeRows(oldRows, newRows, limit){
    const byTime = new Map();
    (Array.isArray(oldRows) ? oldRows : []).forEach(c => { const t=rowTime(c); if(Number.isFinite(t)) byTime.set(t, normalizeFeedRow(c)); });
    (Array.isArray(newRows) ? newRows : []).forEach(c => { const n=normalizeFeedRow(c); if(Number.isFinite(n.time)) byTime.set(n.time,n); });
    return Array.from(byTime.values()).sort((a,b) => a.time-b.time).slice(-limit);
  }

  async function fetchSource(deep){
    if(!state.on) return;
    const key = currentSymbol() + "|" + state.sourceTf;
    if(sourceCache.loading) return;
    const now = Date.now();
    if(!deep && sourceCache.key === key && now-sourceCache.fetchedAt < 8000) return;
    if(!deep && now-sourceCache.attemptedAt < 3000) return;
    sourceCache.loading = true;
    sourceCache.attemptedAt = now;
    const limit = deep || sourceCache.key !== key || sourceCache.rows.length < 1000 ? state.historyLimit : 600;
    try{
      const url = "/api/market/candles?symbol=" + encodeURIComponent(currentSymbol()) +
        "&interval=" + encodeURIComponent(state.sourceTf) + "&limit=" + limit;
      const response = await fetch(url, {cache:"no-store"});
      if(!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if(!payload || payload.ok !== true || !Array.isArray(payload.candles) || !payload.candles.length){
        throw new Error(payload && payload.status ? payload.status : "sem historico");
      }
      const incoming = payload.candles.map(normalizeFeedRow);
      const base = sourceCache.key === key ? sourceCache.rows : [];
      sourceCache.rows = mergeRows(base, incoming, state.historyLimit);
      sourceCache.key = key;
      sourceCache.error = "";
      sourceCache.fetchedAt = Date.now();
      computeCache.sig = "";
    }catch(err){
      sourceCache.error = String(err && err.message || err || "erro").slice(0,120);
      /* One guarded fallback. It is used only when the same-origin recorder has
         no engine for the selected asset. */
      try{
        if(typeof fetchKlinesSmart === "function"){
          const fallback = await fetchKlinesSmart(currentSymbol(), state.sourceTf, Math.min(1200, limit));
          if(Array.isArray(fallback) && fallback.length){
            sourceCache.rows = mergeRows([], fallback, state.historyLimit);
            sourceCache.key = key;
            sourceCache.error = "historico parcial";
            sourceCache.fetchedAt = Date.now();
            computeCache.sig = "";
          }
        }
      }catch(_){}
    }finally{
      sourceCache.loading = false;
      renderPanel();
      redraw();
    }
  }

  function sourceRows(){
    const local = chartRows();
    if(currentTf() === state.sourceTf && local.length) return local;
    const key = currentSymbol() + "|" + state.sourceTf;
    if(sourceCache.key === key && sourceCache.rows.length) return sourceCache.rows;
    fetchSource(true);
    return [];
  }

  function computedSignals(){
    const rows = sourceRows();
    if(!rows.length) return [];
    const last = rows[rows.length-1] || {};
    const prev = rows[rows.length-2] || {};
    const sig = [currentSymbol(),state.sourceTf,state.sensitivity,rows.length,rowTime(last),last.close,last.high,last.low,rowTime(prev)].join("|");
    if(computeCache.sig !== sig){
      computeCache = {
        sig:sig,
        signals:Engine.computeSignals(rows, {
          sourceTf:state.sourceTf,
          sensitivity:state.sensitivity,
          now:Date.now()
        })
      };
      root.__DVL_BODY_REVERSAL_SIGNALS_1651 = computeCache.signals;
    }
    return computeCache.signals;
  }

  function triangle(ctx, x, y, size, direction){
    ctx.beginPath();
    if(direction === "down"){
      ctx.moveTo(x, y + size);
      ctx.lineTo(x - size, y - size);
      ctx.lineTo(x + size, y - size);
    }else{
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
    }
    ctx.closePath();
  }

  function draw(ctx, cfg){
    try{
      if(!state.on || !cfg || !cfg.win || typeof cfg.x !== "function" || typeof cfg.y !== "function") return;
      const chartTf = currentTf();
      const chartMs = Engine.tfMs(chartTf);
      if(!(chartMs > 0) || chartMs > 300000) return;
      if(!state.projectTo5m && chartTf !== state.sourceTf) return;

      const rows = chartRows();
      const signals = computedSignals();
      if(!rows.length || !signals.length) return;
      const mapped = Engine.mapSignals(signals, rows, chartTf, 300000);
      if(!mapped.length) return;

      const start = Number(cfg.win.start) || 0;
      const end = Number(cfg.win.end);
      const slotOffset = Number(cfg.slotOffset) || 0;
      const candleW = Math.max(1, Number(cfg.candleW) || 4);
      const visibleCount = Number.isFinite(end) ? Math.max(1,end-start) : 100;
      const drawText = state.showLabels && visibleCount <= 140 && candleW >= 4;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.fillStyle = state.color;
      ctx.strokeStyle = "rgba(4,8,12,.96)";
      ctx.lineWidth = 1.25;

      mapped.forEach(m => {
        if(m.hostIndex < start-1 || (Number.isFinite(end) && m.hostIndex > end+1)) return;
        const local = m.hostIndex - start;
        const px = cfg.x(slotOffset + local);
        if(px < cfg.x0-20 || px > cfg.x1+20) return;
        const size = Math.max(4.5, Math.min(7, candleW * .42));
        const isDown = m.direction === "down";
        const anchorPrice = isDown ? Number(m.host.high) : Number(m.host.low);
        if(!Number.isFinite(anchorPrice)) return;
        const baseY = cfg.y(anchorPrice) + (isDown ? -10 : 10);
        triangle(ctx, px, baseY, size, m.direction);
        ctx.fill();
        ctx.stroke();

        if(drawText){
          const label = "REV " + state.sourceTf;
          ctx.font = "800 8px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = isDown ? "bottom" : "top";
          ctx.fillStyle = state.color;
          ctx.fillText(label, px, baseY + (isDown ? -size-3 : size+3));
          ctx.fillStyle = state.color;
        }
      });
      ctx.restore();
    }catch(err){
      root.__DVL_BODY_REVERSAL_DRAW_ERROR_1651 = String(err && err.message || err);
    }
  }

  function ensureStyle(){
    if(document.getElementById(SCRIPT_ID + "_STYLE")) return;
    const style = document.createElement("style");
    style.id = SCRIPT_ID + "_STYLE";
    style.textContent =
      ".dvl-brs-panel{position:fixed;z-index:100030;top:64px;right:14px;width:min(326px,calc(100vw - 20px));max-height:72vh;overflow:auto;display:none;background:#07100d;border:1px solid rgba(255,159,28,.38);border-radius:7px;box-shadow:0 18px 50px rgba(0,0,0,.65);color:#edf7f2;font:12px system-ui,sans-serif}"+
      ".dvl-brs-panel.is-open{display:block}.dvl-brs-head{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid rgba(160,190,178,.16)}"+
      ".dvl-brs-head b{font-size:13px}.dvl-brs-head small{display:block;color:#8ca198;font-size:9px;margin-top:2px}.dvl-brs-head button{border:0;background:transparent;color:#a9bbb4;font-size:21px;cursor:pointer}"+
      ".dvl-brs-body{padding:11px}.dvl-brs-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dvl-brs-field{min-height:46px;padding:7px;border:1px solid rgba(150,180,168,.14);border-radius:6px;background:#091410}"+
      ".dvl-brs-field>label{display:block;color:#8ea39b;font-size:9px;margin-bottom:6px}.dvl-brs-field select{width:100%;height:26px;background:#07100d;color:#eaf5f0;border:1px solid rgba(255,159,28,.28);border-radius:5px;padding:0 6px}"+
      ".dvl-brs-check{display:flex!important;align-items:center;gap:7px;color:#eaf5f0!important;font-size:11px!important;margin:2px 0 0!important}.dvl-brs-check input{accent-color:#ff9f1c}.dvl-brs-note{margin:10px 1px 0;color:#90a49b;font-size:9px;line-height:1.45}.dvl-brs-status{margin-top:8px;color:#ffb547;font:700 9px ui-monospace,monospace}"+
      ".dvl-brs-reset{height:28px;margin-top:10px;padding:0 10px;border:1px solid rgba(255,159,28,.30);border-radius:5px;background:#0a1712;color:#ffc26c;cursor:pointer}"+
      ".dvl-brs-menu-row{box-sizing:border-box;width:100%;min-height:44px;display:flex;align-items:center;gap:10px;padding:7px 9px;border:0;border-bottom:1px solid rgba(145,177,164,.12);background:transparent;color:#eaf5f0;text-align:left;cursor:pointer}"+
      ".dvl-brs-menu-row:hover{background:rgba(255,159,28,.07)}.dvl-brs-mark{display:grid;place-items:center;width:30px;height:30px;border:1px solid rgba(255,159,28,.42);border-radius:5px;color:#ff9f1c;font:900 10px system-ui}"+
      ".dvl-brs-copy{min-width:0;flex:1}.dvl-brs-copy b{display:block;font-size:11px}.dvl-brs-copy small{display:block;margin-top:2px;color:#81968d;font-size:9px}.dvl-brs-state{color:#758a81;font:800 9px system-ui}.dvl-brs-state.is-on{color:#ffad3d}"+
      "@media(max-width:600px){.dvl-brs-panel{top:54px;right:6px;width:calc(100vw - 12px);max-height:75vh}}";
    document.head.appendChild(style);
  }

  function ensurePanel(){
    ensureStyle();
    if(panel) return panel;
    panel = document.createElement("section");
    panel.id = "dvlBodyReversalScoutPanel";
    panel.className = "dvl-brs-panel";
    panel.setAttribute("data-dvl-ui","true");
    panel.innerHTML = '<div class="dvl-brs-head"><div><b>Body Reversal Scout</b><small>candles fechados de 15s / 30s</small></div><button type="button" aria-label="Fechar">&times;</button></div><div class="dvl-brs-body"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector(".dvl-brs-head button").addEventListener("click", closePanel);
    renderPanel();
    return panel;
  }
  function openPanel(){ ensurePanel().classList.add("is-open"); renderPanel(); if(state.on) fetchSource(true); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }
  function renderPanel(){
    if(!panel) return;
    const body = panel.querySelector(".dvl-brs-body");
    const localRows = currentTf() === state.sourceTf ? chartRows().length : 0;
    const cachedRows = sourceCache.key === currentSymbol()+"|"+state.sourceTf ? sourceCache.rows.length : 0;
    const count = localRows || cachedRows;
    const status = sourceCache.loading ? "carregando..." : (count ? count+" candles "+state.sourceTf : (sourceCache.error || "aguardando dados"));
    body.innerHTML =
      '<div class="dvl-brs-grid">'+
        '<div class="dvl-brs-field"><label>Indicador</label><label class="dvl-brs-check"><input id="brsOn" type="checkbox"'+(state.on?' checked':'')+'> Ativo</label></div>'+
        '<div class="dvl-brs-field"><label>Fonte intrabar</label><select id="brsTf"><option value="30s"'+(state.sourceTf==='30s'?' selected':'')+'>30 segundos</option><option value="15s"'+(state.sourceTf==='15s'?' selected':'')+'>15 segundos</option></select></div>'+
        '<div class="dvl-brs-field"><label>Sensibilidade</label><select id="brsSensitivity"><option value="early"'+(state.sensitivity==='early'?' selected':'')+'>Antecipada</option><option value="balanced"'+(state.sensitivity==='balanced'?' selected':'')+'>Equilibrada</option><option value="strict"'+(state.sensitivity==='strict'?' selected':'')+'>Rigorosa</option></select></div>'+
        '<div class="dvl-brs-field"><label>Projetar</label><label class="dvl-brs-check"><input id="brsProject" type="checkbox"'+(state.projectTo5m?' checked':'')+'> Ate 5m</label></div>'+
        '<div class="dvl-brs-field"><label>Marcador</label><label class="dvl-brs-check"><span style="color:'+state.color+';font-size:16px">&#9650;</span> Laranja</label></div>'+
        '<div class="dvl-brs-field"><label>Texto</label><label class="dvl-brs-check"><input id="brsLabels" type="checkbox"'+(state.showLabels?' checked':'')+'> REV '+state.sourceTf+'</label></div>'+
      '</div>'+
      '<div class="dvl-brs-status">'+status+'</div>'+
      '<div class="dvl-brs-note">Marca exaustao possivel apos uma sequencia de corpos dominantes em extremo local. Usa somente OHLC fechado, sem olhar candles futuros.</div>'+
      '<button class="dvl-brs-reset" id="brsReset" type="button">Restaurar padrao</button>';
    body.querySelector("#brsOn").addEventListener("change", e => { state.on=!!e.target.checked; save(); if(state.on) fetchSource(true); });
    body.querySelector("#brsTf").addEventListener("change", e => { state.sourceTf=e.target.value; sourceCache={key:"",rows:[],loading:false,error:"",fetchedAt:0,attemptedAt:0}; save(); if(state.on) fetchSource(true); });
    body.querySelector("#brsSensitivity").addEventListener("change", e => { state.sensitivity=e.target.value; save(); });
    body.querySelector("#brsProject").addEventListener("change", e => { state.projectTo5m=!!e.target.checked; save(); });
    body.querySelector("#brsLabels").addEventListener("change", e => { state.showLabels=!!e.target.checked; save(); });
    body.querySelector("#brsReset").addEventListener("click", reset);
  }

  function menuRow(id){
    const row = document.createElement("button");
    row.type = "button";
    row.id = id;
    row.className = "dvl-brs-menu-row";
    row.setAttribute("data-dvl-ui","true");
    row.innerHTML = '<span class="dvl-brs-mark">BR</span><span class="dvl-brs-copy"><b>Body Reversal Scout</b><small>corpos dominantes &middot; 15s/30s</small></span><i class="dvl-brs-state">OFF</i>';
    row.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); openPanel(); });
    return row;
  }
  function updateRows(){
    document.querySelectorAll(".dvl-brs-state").forEach(el => {
      el.textContent = state.on ? "ON" : "OFF";
      el.classList.toggle("is-on", state.on);
    });
  }
  function insertLegacyRow(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu || document.getElementById("dvlBodyReversalScoutLegacyItem")) return;
    const row = menuRow("dvlBodyReversalScoutLegacyItem");
    const vwap = document.getElementById("dvlVwapSessionItem");
    if(vwap && vwap.parentNode === menu) menu.insertBefore(row, vwap.nextSibling);
    else menu.appendChild(row);
    updateRows();
  }
  function bootMenu(){
    ensureStyle();
    insertLegacyRow();
  }

  root.DVLBodyReversalScoutDraw = draw;
  root.DVLBodyReversalScout = {
    get state(){ return Object.assign({},state); },
    on:() => !!state.on,
    setOn:v => { state.on=!!v; save(); if(state.on) fetchSource(true); },
    open:openPanel,
    openPanel:openPanel,
    refresh:() => fetchSource(true),
    signals:computedSignals,
    engine:Engine
  };

  setInterval(() => { if(state.on && currentTf() !== state.sourceTf) fetchSource(false); }, 9000);
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootMenu);
  else bootMenu();

})(typeof window !== "undefined" ? window : null, function(){
  "use strict";

  const PROFILES = {
    early:    {run:2,minBody:.64,maxEdgeWick:.22,minImpulse:1.05,lookback:5,cooldown:5},
    balanced: {run:3,minBody:.70,maxEdgeWick:.18,minImpulse:1.35,lookback:8,cooldown:8},
    strict:   {run:3,minBody:.76,maxEdgeWick:.14,minImpulse:1.75,lookback:12,cooldown:12}
  };
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function tfMs(tf){
    const m = String(tf || "").match(/^(\d+)(s|m|h|d)$/i);
    if(!m) return 0;
    const n = Math.max(1,Number(m[1])||1), u=m[2].toLowerCase();
    return u==="s"?n*1000:u==="m"?n*60000:u==="h"?n*3600000:n*86400000;
  }
  function normalize(rows){
    return (Array.isArray(rows)?rows:[]).map(c => ({
      time:Number(c && (c.time ?? c.openTime ?? c.t)),
      open:Number(c && (c.open ?? c.o)),
      high:Number(c && (c.high ?? c.h)),
      low:Number(c && (c.low ?? c.l)),
      close:Number(c && (c.close ?? c.c)),
      volume:Number(c && (c.volume ?? c.baseVolume ?? c.v))||0,
      isClosed:c && typeof c.isClosed === "boolean" ? c.isClosed : undefined
    })).filter(c => Number.isFinite(c.time)&&Number.isFinite(c.open)&&Number.isFinite(c.high)&&Number.isFinite(c.low)&&Number.isFinite(c.close)&&c.high>=c.low).sort((a,b)=>a.time-b.time);
  }
  function median(values){
    const a=(Array.isArray(values)?values:[]).filter(Number.isFinite).sort((x,y)=>x-y);
    if(!a.length) return 0;
    const m=a.length>>1;
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function range(c){ return Math.max(0,Number(c.high)-Number(c.low)); }
  function bodyPct(c){ const r=range(c); return r>0?Math.abs(Number(c.close)-Number(c.open))/r:0; }
  function direction(c){ return c.close>c.open?1:c.close<c.open?-1:0; }
  function profile(name){ return Object.assign({},PROFILES[name]||PROFILES.balanced); }

  function computeSignals(rows, opts){
    opts=opts||{};
    const sourceTf=opts.sourceTf==="15s"?"15s":"30s";
    const step=tfMs(sourceTf);
    const now=Number.isFinite(Number(opts.now))?Number(opts.now):Date.now();
    const cfg=Object.assign(profile(opts.sensitivity),opts.profile||{});
    const cs=normalize(rows).filter(c => c.isClosed===true || (c.isClosed!==false && now>=c.time+step-1));
    const out=[];
    let lastSignalIndex=-Infinity;
    const warmup=Math.max(20,cfg.lookback,cfg.run+1);

    for(let i=warmup;i<cs.length;i++){
      const c=cs[i], dir=direction(c);
      if(!dir) continue;
      const firstIndex=i-cfg.run+1;
      if(firstIndex<0 || i-lastSignalIndex<cfg.cooldown) continue;

      let validRun=true, bodySum=0, rangeSum=0;
      for(let j=firstIndex;j<=i;j++){
        const cur=cs[j], bp=bodyPct(cur), rr=range(cur);
        if(direction(cur)!==dir || bp<cfg.minBody || !(rr>0)){ validRun=false; break; }
        if(j>firstIndex){
          const prev=cs[j-1];
          if(dir>0 && !(cur.close>prev.close)){ validRun=false; break; }
          if(dir<0 && !(cur.close<prev.close)){ validRun=false; break; }
        }
        bodySum+=bp; rangeSum+=rr;
      }
      if(!validRun) continue;

      const rr=range(c);
      const edgeWick=dir>0?(c.high-c.close)/Math.max(rr,1e-12):(c.close-c.low)/Math.max(rr,1e-12);
      if(edgeWick>cfg.maxEdgeWick) continue;

      const priorRanges=[];
      for(let j=Math.max(0,firstIndex-20);j<firstIndex;j++){ const r=range(cs[j]); if(r>0) priorRanges.push(r); }
      const medRange=median(priorRanges);
      if(!(medRange>0) || rangeSum/cfg.run<medRange*.55) continue;
      const impulse=Math.abs(c.close-cs[firstIndex].open)/medRange;
      if(impulse<cfg.minImpulse) continue;

      let extreme=true;
      for(let j=Math.max(0,firstIndex-cfg.lookback);j<firstIndex;j++){
        if(dir>0 && c.high<cs[j].high){ extreme=false; break; }
        if(dir<0 && c.low>cs[j].low){ extreme=false; break; }
      }
      if(!extreme) continue;

      const avgBody=bodySum/cfg.run;
      const bodyStrength=clamp((avgBody-cfg.minBody)/Math.max(.01,1-cfg.minBody),0,1);
      const impulseStrength=clamp((impulse-cfg.minImpulse)/Math.max(.25,cfg.minImpulse),0,1);
      const edgeStrength=clamp(1-edgeWick/Math.max(.01,cfg.maxEdgeWick),0,1);
      const score=Math.round(clamp(64+bodyStrength*14+impulseStrength*13+edgeStrength*9,64,99));
      out.push({
        time:c.time,
        closeTime:c.time+step,
        sourceTf:sourceTf,
        sourceMs:step,
        direction:dir>0?"down":"up",
        impulseDirection:dir>0?"up":"down",
        score:score,
        price:dir>0?c.high:c.low,
        bodyPct:avgBody,
        impulseATR:impulse
      });
      lastSignalIndex=i;
    }
    return out;
  }

  function mapSignals(signals, chartRows, chartTf, maxChartMs){
    const chartMs=tfMs(chartTf), maxMs=Number(maxChartMs)||300000;
    if(!(chartMs>0) || chartMs>maxMs) return [];
    const rows=normalize(chartRows);
    if(!rows.length) return [];
    const byTime=new Map();
    rows.forEach((c,i)=>byTime.set(c.time,{host:c,index:i}));
    const grouped=new Map();
    (Array.isArray(signals)?signals:[]).forEach(s => {
      const sourceMs=Number(s.sourceMs)||tfMs(s.sourceTf);
      if(!(sourceMs>0) || !Number.isFinite(Number(s.time))) return;
      const knownAt=Number(s.time)+sourceMs-1;
      const hostTime=Math.floor(knownAt/chartMs)*chartMs;
      const found=byTime.get(hostTime);
      if(!found) return;
      const item=Object.assign({},s,{hostTime:hostTime,hostIndex:found.index,host:found.host});
      const prev=grouped.get(hostTime);
      if(!prev || Number(item.score)>Number(prev.score)) grouped.set(hostTime,item);
    });
    return Array.from(grouped.values()).sort((a,b)=>a.hostTime-b.hostTime);
  }

  return {PROFILES:PROFILES,tfMs:tfMs,normalize:normalize,median:median,bodyPct:bodyPct,computeSignals:computeSignals,mapSignals:mapSignals};
});
