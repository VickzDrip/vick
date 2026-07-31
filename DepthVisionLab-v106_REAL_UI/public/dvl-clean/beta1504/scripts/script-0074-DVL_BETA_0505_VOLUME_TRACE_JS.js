(function(){
  "use strict";

  const VT_KEY = "dvl_volume_trace_v1";

  const DEFAULTS = {
    on:false,
    visualStyle:"horizontal",
    detectionTf:"1s",
    sideFilter:"all",
    buyerColor:"#10df77",
    sellerColor:"#ff3037",
    avgLen:20,
    lastCandles:120,
    clusterOn:true,
    clusterMaxCandles:1,
    clusterMaxPricePct:0.18,
    clusterMinLevel:4,
    clusterStrongOnly:true,
    clusterStyle:"traceZone",
    levels:[
      {on:true, name:"Level 1", mult:1, color:"#10df77", opacity:0.34, thickness:2, length:18, glow:false, glowPower:6},
      {on:true, name:"Level 2", mult:2, color:"#0abe60", opacity:0.42, thickness:3, length:24, glow:false, glowPower:8},
      {on:true, name:"Level 3", mult:3, color:"#13dc8d", opacity:0.52, thickness:4, length:32, glow:true, glowPower:10},
      {on:true, name:"Level 4", mult:4, color:"#f3c768", opacity:0.66, thickness:5, length:44, glow:true, glowPower:14},
      {on:true, name:"Level 5", mult:5, color:"#ff4a61", opacity:0.76, thickness:7, length:58, glow:true, glowPower:18}
    ]
  };

  let state = loadState();
  let panel = null;

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clampLocal(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function mergeDefaults(obj){
    const out = clone(DEFAULTS);
    obj = obj || {};
    Object.assign(out, obj);
    out.levels = DEFAULTS.levels.map((lvl, i) => Object.assign({}, lvl, (obj.levels && obj.levels[i]) || {}));
    out.buyerColor = out.buyerColor || "#13dc8d";
    out.sellerColor = out.sellerColor || "#ff4a61";
    out.avgLen = clampLocal(Number(out.avgLen) || 20, 2, 500);
    out.lastCandles = clampLocal(Number(out.lastCandles) || 120, 1, 5000);
    out.clusterMaxCandles = clampLocal(Number(out.clusterMaxCandles) || 1, 0, 20);
    out.clusterMaxPricePct = clampLocal(Number(out.clusterMaxPricePct) || 0.18, 0, 20);
    out.clusterMinLevel = clampLocal(Number(out.clusterMinLevel) || 4, 1, 5);
    return out;
  }
  function loadState(){
    try{
      return mergeDefaults(JSON.parse(localStorage.getItem(VT_KEY) || "null"));
    }catch(_){
      return clone(DEFAULTS);
    }
  }
  function saveState(){
    try{ localStorage.setItem(VT_KEY, JSON.stringify(state)); }catch(_){}
    updateIndicatorItem();
    if(typeof drawSoon === "function") drawSoon();
  }
  function resetState(){
    state = clone(DEFAULTS);
    saveState();
    renderPanel();
  }
  function hexToRgbaVT(hex, alpha){
    hex = String(hex || "").replace("#","").trim();
    if(hex.length === 3) hex = hex.split("").map(ch => ch + ch).join("");
    if(hex.length !== 6) return "rgba(16,223,119," + alpha + ")";
    const num = parseInt(hex,16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }
  function roundRectVT(ctx, x, y, w, h, r){
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
  }
  function avgVolumeAt(idx){
    const source = Array.isArray(window.klines) ? window.klines : (typeof klines !== "undefined" ? klines : []);
    const len = clampLocal(Number(state.avgLen) || 20, 2, 500);
    const start = Math.max(0, idx - len);
    let sum = 0, count = 0;
    for(let i=start; i<idx; i++){
      const v = Number(source[i]?.volume ?? source[i]?.v);
      if(Number.isFinite(v)){
        sum += v;
        count++;
      }
    }
    if(!count){
      for(let i=Math.max(0, idx-len); i<=idx; i++){
        const v = Number(source[i]?.volume ?? source[i]?.v);
        if(Number.isFinite(v)){
          sum += v;
          count++;
        }
      }
    }
    return count ? sum / count : 0;
  }
  function highestLevel(ratio){
    let best = 0;
    for(let i=0; i<state.levels.length; i++){
      const lvl = state.levels[i];
      if(!lvl.on) continue;
      const m = Math.max(0.01, Number(lvl.mult) || (i+1));
      if(ratio >= m) best = i + 1;
    }
    return best;
  }
  function eventBand(c, lvl){
    const o = Number(c.open ?? c.o);
    const h = Number(c.high ?? c.h);
    const l = Number(c.low ?? c.l);
    const cl = Number(c.close ?? c.c);
    const range = Math.max(Math.abs(h - l), Math.abs(cl) * 0.0001, 1);
    const bodyLow = Math.min(o, cl);
    const bodyHigh = Math.max(o, cl);
    const up = cl >= o;

    let center = up ? bodyHigh - (bodyHigh - bodyLow) * .25 : bodyLow + (bodyHigh - bodyLow) * .25;
    if(!Number.isFinite(center) || center <= 0) center = (h + l) / 2;

    let pad = range * (0.010 + lvl * 0.004);
    let low = center - pad;
    let high = center + pad;

    if(lvl >= 4){
      const lowerBand = Math.min(bodyLow, (h + l) / 2);
      const upperBand = Math.max(bodyLow, (h + l) / 2);
      low = Math.min(low, lowerBand);
      high = Math.max(high, upperBand);
      center = (low + high) / 2;
    }

    return {price:center, low, high};
  }
  function buildEvents(cfg){
    const source = Array.isArray(window.klines) ? window.klines : (typeof klines !== "undefined" ? klines : []);
    if(!source.length || !cfg.view || !cfg.view.length) return [];

    const start = Math.max(0, cfg.win.start - Math.max(2, Number(state.clusterMaxCandles) || 0) - 2);
    const end = Math.min(source.length, cfg.win.end + 2);
    const events = [];

    for(let gi=start; gi<end; gi++){
      const c = source[gi];
      if(!c) continue;
      const vol = Number(c.volume ?? c.v);
      const avg = avgVolumeAt(gi);
      if(!Number.isFinite(vol) || !Number.isFinite(avg) || avg <= 0) continue;

      const ratio = vol / avg;
      const lvl = highestLevel(ratio);
      if(!lvl) continue;

      const oSide = Number(c.open ?? c.o);
      const cSide = Number(c.close ?? c.c);
      const side = cSide >= oSide ? "buyer" : "seller";
      if(state.sideFilter && state.sideFilter !== "all" && side !== state.sideFilter) continue;

      const b = eventBand(c, lvl);
      events.push({
        gi,
        level:lvl,
        side,
        ratio,
        price:b.price,
        low:b.low,
        high:b.high
      });

      if(lvl >= 5){
        const o = Number(c.open ?? c.o);
        const cl = Number(c.close ?? c.c);
        const h = Number(c.high ?? c.h);
        const l = Number(c.low ?? c.l);
        const mid = (o + cl) / 2;
        const r = Math.max(h - l, Math.abs(cl) * .0001, 1);
        events.push({
          gi,
          level:4,
          side,
          ratio:Math.max(4, ratio * .82),
          price:mid,
          low:mid - r * .018,
          high:mid + r * .018
        });
      }
    }

    return events;
  }
  function clusterEvents(events){
    if(!state.clusterOn) return events.map(e => ({events:[e], level:e.level, low:e.low, high:e.high, gi:e.gi, price:e.price}));
    const minLevel = Number(state.clusterMinLevel) || 4;
    const maxCandles = Number(state.clusterMaxCandles) || 0;
    const maxPct = Number(state.clusterMaxPricePct) || 0;
    const grouped = [];
    const used = new Set();

    for(let i=0; i<events.length; i++){
      if(used.has(i)) continue;
      const base = events[i];
      const group = [base];
      used.add(i);

      for(let j=i+1; j<events.length; j++){
        if(used.has(j)) continue;
        const e = events[j];
        const strongOk = !state.clusterStrongOnly || (base.level >= minLevel && e.level >= minLevel);
        const candleOk = Math.abs(e.gi - base.gi) <= maxCandles;
        const pct = Math.abs(e.price - base.price) / Math.max(Math.abs(base.price), 1) * 100;
        const priceOk = pct <= maxPct;
        if(strongOk && candleOk && priceOk){
          group.push(e);
          used.add(j);
        }
      }

      const low = Math.min(...group.map(e => e.low));
      const high = Math.max(...group.map(e => e.high));
      const level = Math.max(...group.map(e => e.level));
      const gi = Math.round(group.reduce((a,e)=>a+e.gi,0) / group.length);
      const price = group.reduce((a,e)=>a+e.price,0) / group.length;
      const buyers = group.filter(e => e.side === "buyer").length;
      const sellers = group.length - buyers;
      const side = buyers >= sellers ? "buyer" : "seller";
      const mixed = buyers > 0 && sellers > 0;
      grouped.push({events:group, level, side, mixed, buyers, sellers, low, high, gi, price});
    }

    return grouped;
  }
  function drawTrace(ctx, xA, xB, y, style, isCluster){
    const color = style.color || "#10df77";
    ctx.save();
    ctx.globalAlpha = clampLocal(Number(style.opacity) || .5, .05, 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, Number(style.thickness) || 3) * (isCluster ? 1.25 : 1);
    ctx.lineCap = "round";
    if(style.glow){
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(2, Number(style.glowPower) || 10) * (isCluster ? 1.25 : 1);
    }
    ctx.beginPath();
    ctx.moveTo(xA, y);
    ctx.lineTo(xB, y);
    ctx.stroke();
    ctx.restore();
  }
  function drawBubble(ctx, x, y, style, isCluster){
    const color = style.color || "#10df77";
    const r = (Number(style.thickness) || 3) * (isCluster ? 2.8 : 2.1) + 3;
    ctx.save();
    ctx.globalAlpha = clampLocal(Number(style.opacity) || .5, .05, 1);
    if(style.glow){
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(2, Number(style.glowPower) || 10);
    }
    ctx.fillStyle = hexToRgbaVT(color, .42);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function drawZone(ctx, xA, xB, yA, yB, style, strong){
    const color = style.color || "#10df77";
    const top = Math.min(yA, yB);
    const h = Math.max(4, Math.abs(yB - yA));
    ctx.save();
    ctx.globalAlpha = clampLocal((Number(style.opacity) || .5) * (strong ? .55 : .38), .06, .55);
    ctx.fillStyle = color;
    if(style.glow){
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(2, Number(style.glowPower) || 10) * .8;
    }
    roundRectVT(ctx, xA, top, xB - xA, h, Math.min(8, h/2));
    ctx.fill();
    ctx.restore();
  }


  window.DVLVolumeTraceDraw = function(ctx, cfg){
    try{
      if(!state.on || !cfg || !cfg.view || !cfg.view.length) return;
      const events = buildEvents(cfg);
      if(!events.length) return;

      const groups = clusterEvents(events);
      const rightLimit = cfg.x1 - 4;
      const leftLimit = cfg.x0 + 4;

      groups.forEach(g => {
        const lvl = clampLocal(g.level, 1, 5);
        const style = Object.assign({}, state.levels[lvl - 1] || state.levels[0]);
        style.color = g.side === "seller" ? state.sellerColor : state.buyerColor;
        const localIndex = g.gi - cfg.win.start;
        if(localIndex < -2 || localIndex > cfg.view.length + 2) return;

        const cx = cfg.x(cfg.slotOffset + localIndex);
        if(cx < leftLimit - 80 || cx > rightLimit + 80) return;

        const cy = cfg.y(g.price);
        const yTop = cfg.y(g.high);
        const yBot = cfg.y(g.low);
        if(cy < cfg.y0 - 20 || cy > cfg.y1 + 20) return;

        const isCluster = g.events.length > 1 && Math.max(...g.events.map(e=>e.level)) >= (Number(state.clusterMinLevel) || 4);
        const visual = isCluster ? state.clusterStyle : state.visualStyle;

        const baseLen = Math.max(6, Number(style.length) || 24);
        const len = baseLen * (isCluster ? 1.75 : 1);
        const xA = clampLocal(cx - len / 2, leftLimit, rightLimit);
        const xB = clampLocal(cx + len / 2, leftLimit, rightLimit);
        const zXA = clampLocal(cx - len * .62, leftLimit, rightLimit);
        const zXB = clampLocal(cx + len * .62, leftLimit, rightLimit);

        if(visual === "softZone" || visual === "traceZone" || visual === "wideTrace"){
          drawZone(ctx, zXA, zXB, yTop, yBot, style, isCluster);
        }

        if(visual === "bubble" || visual === "both" || visual === "bigBubble" || visual === "traceZone"){
          drawBubble(ctx, cx, cy, style, isCluster || visual === "bigBubble");
        }

        if(visual === "horizontal" || visual === "both" || visual === "wideTrace" || visual === "traceZone"){
          drawTrace(ctx, xA, xB, cy, style, isCluster || visual === "wideTrace");
        }

        if(isCluster){
          const tagX = clampLocal(xB + 15, leftLimit + 16, rightLimit - 16);
          drawSideTag(ctx, tagX, cy, g.side, !!g.mixed, true);
        }else if(visual === "bubble" || visual === "both" || lvl >= 4){
          const tagX = clampLocal(xB + 12, leftLimit + 14, rightLimit - 14);
          drawSideTag(ctx, tagX, cy, g.side, false, false);
        }
      });
    }catch(err){
      console.warn("DVL Volume Trace draw error", err);
    }
  };

  function insertIndicatorItem(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu || document.getElementById("dvlVolumeTraceItem")) return;

    const item = document.createElement("div");
    item.id = "dvlVolumeTraceItem";
    item.className = "indicatorItem dvl-vt-indicator-item";
    item.innerHTML = `
      <span class="indicatorFxMark">VT</span>
      <span><b>DVL Volume Trace</b><small>overlay</small></span>
      <i class="dvl-vt-state" id="dvlVtState">ON</i>
    `;

    const head = menu.querySelector(".indicatorDropHead");
    if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling);
    else menu.appendChild(item);

    const statePill = item.querySelector("#dvlVtState");
    if(statePill){
      statePill.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        state.on = !state.on;
        saveState();
      });
    }

    item.addEventListener("click", ev => {
      ev.stopPropagation();
      openPanel();
    });

    updateIndicatorItem();
  }
  function updateIndicatorItem(){
    const st = document.getElementById("dvlVtState");
    if(st){
      st.textContent = state.on ? "ON" : "OFF";
      st.setAttribute("aria-label", state.on ? "DVL Volume Trace ON" : "DVL Volume Trace OFF");
      st.classList.toggle("is-on", !!state.on);
    }
  }
  function openPanel(){
    ensurePanel();
    panel.classList.add("is-open");
    renderPanel();
  }
  function closePanel(){
    if(panel) panel.classList.remove("is-open");
  }
  function ensurePanel(){
    if(panel) return;
    panel = document.createElement("div");
    panel.id = "dvlVolumeTracePanel";
    panel.className = "dvl-vt-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title">
          <b>DVL Volume Trace</b>
          <small>lower-timeframe volume traces on candles</small>
        </div>
        <div class="dvl-vt-head-actions">
          <button class="dvl-vt-reset-icon" id="dvlVtResetHead" type="button" aria-label="Reset DVL Volume Trace">↻</button>
          <button class="dvl-vt-close" id="dvlVtClose" type="button">×</button>
        </div>
      </div>
      <div class="dvl-vt-body" id="dvlVtBody"></div>
    `;
    document.body.appendChild(panel);

    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    document.getElementById("dvlVtClose").addEventListener("click", closePanel);
    const resetHead = document.getElementById("dvlVtResetHead");
    if(resetHead) resetHead.addEventListener("click", resetState);
  }
  function tfOptions(){
    return [
      ["1s","1 second"],["5s","5 seconds"],["15s","15 seconds"],["30s","30 seconds"],
      ["1m","1 minute"],["2m","2 minutes"],["5m","5 minutes"],["10m","10 minutes"],
      ["15m","15 minutes"],["30m","30 minutes"],["1h","1 hour"],["2h","2 hours"],
      ["4h","4 hours"],["6h","6 hours"],["12h","12 hours"],["1d","1 day"]
    ].map(([v,t]) => `<option value="${v}" ${state.detectionTf===v?"selected":""}>${t}</option>`).join("");
  }
  function sideOptions(value){
    const opts = [
      ["all","All flow"],
      ["buyer","Buyers only"],
      ["seller","Sellers only"]
    ];
    return opts.map(([v,t]) => `<option value="${v}" ${value===v?"selected":""}>${t}</option>`).join("");
  }

  function styleOptions(value){
    const opts = [
      ["horizontal","Horizontal Trace"],
      ["bubble","Bubble"],
      ["both","Bubble + Horizontal Trace"],
      ["softZone","Soft Cluster Zone"],
      ["wideTrace","Wide Horizontal Trace"]
    ];
    return opts.map(([v,t]) => `<option value="${v}" ${value===v?"selected":""}>${t}</option>`).join("");
  }
  function clusterStyleOptions(value){
    const opts = [
      ["bigBubble","Big Bubble"],
      ["wideTrace","Wide Horizontal Trace"],
      ["softZone","Soft Zone"],
      ["traceZone","Trace + Bubble"]
    ];
    return opts.map(([v,t]) => `<option value="${v}" ${value===v?"selected":""}>${t}</option>`).join("");
  }
  function levelHTML(lvl, i){
    const n = i + 1;
    return `
      <div class="dvl-vt-level dvl-vt-level-tile" data-level="${i}">
        <div class="dvl-vt-tile-top">
          <span class="dvl-vt-tile-name">L${n}</span>
          <label class="dvl-vt-tile-toggle">
            <input type="checkbox" data-k="on" ${lvl.on ? "checked" : ""}>
          </label>
        </div>
        <div class="dvl-vt-tile-bottom">
          <span class="dvl-vt-mini-x">×</span>
          <input class="dvl-vt-input dvl-vt-tile-input" data-k="mult" type="number" min="0.1" step="0.1" value="${lvl.mult}">
        </div>
      </div>
    `;
  }
  function escapeHTML(str){
    return String(str ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }
  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlVtBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlVtOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Style</label><select id="dvlVtVisualStyle" class="dvl-vt-select">${styleOptions(state.visualStyle)}</select></div>
          <div class="dvl-vt-field"><label>Detection TF</label><select id="dvlVtDetectionTf" class="dvl-vt-select">${tfOptions()}</select></div>
          <div class="dvl-vt-field"><label>Side</label><select id="dvlVtSideFilter" class="dvl-vt-select">${sideOptions(state.sideFilter)}</select></div>
          <div class="dvl-vt-field"><label>Avg Len</label><input id="dvlVtAvgLen" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.avgLen}"></div>
          <div class="dvl-vt-field"><label>Last Candles</label><input id="dvlVtLastCandles" class="dvl-vt-input" type="number" min="1" max="5000" step="1" value="${state.lastCandles}"></div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Colors</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Buyer</label><button id="dvlVtBuyerColorBtn" type="button" class="dvl-vt-input" style="background:${state.buyerColor};height:32px;cursor:pointer;border-radius:11px"></button><input id="dvlVtBuyerColor" type="color" value="${state.buyerColor}" style="opacity:0;position:absolute;pointer-events:none"></div>
          <div class="dvl-vt-field"><label>Seller</label><button id="dvlVtSellerColorBtn" type="button" class="dvl-vt-input" style="background:${state.sellerColor};height:32px;cursor:pointer;border-radius:11px"></button><input id="dvlVtSellerColor" type="color" value="${state.sellerColor}" style="opacity:0;position:absolute;pointer-events:none"></div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Cluster</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Cluster</label><label class="dvl-switch"><input id="dvlVtClusterOn" type="checkbox" ${state.clusterOn?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Style</label><select id="dvlVtClusterStyle" class="dvl-vt-select">${clusterStyleOptions(state.clusterStyle)}</select></div>
          <div class="dvl-vt-field"><label>Max Candles</label><input id="dvlVtClusterCandles" class="dvl-vt-input" type="number" min="0" max="20" step="1" value="${state.clusterMaxCandles}"></div>
          <div class="dvl-vt-field"><label>Price %</label><input id="dvlVtClusterPrice" class="dvl-vt-input" type="number" min="0" max="20" step="0.01" value="${state.clusterMaxPricePct}"></div>
          <div class="dvl-vt-field"><label>Min Level</label><input id="dvlVtClusterMin" class="dvl-vt-input" type="number" min="1" max="5" step="1" value="${state.clusterMinLevel}"></div>
          <div class="dvl-vt-field"><label>Strong Only</label><label class="dvl-switch"><input id="dvlVtStrongOnly" type="checkbox" ${state.clusterStrongOnly?"checked":""}><i></i><b></b></label></div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Levels</span></div>
        <div class="dvl-vt-grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">
          ${state.levels.map((lvl,i) => levelHTML(lvl,i)).join("")}
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
    const on = document.getElementById("dvlVtOn");
    const visual = document.getElementById("dvlVtVisualStyle");
    const tf = document.getElementById("dvlVtDetectionTf");
    const sideFilter = document.getElementById("dvlVtSideFilter");
    const avg = document.getElementById("dvlVtAvgLen");
    const lastCandles = document.getElementById("dvlVtLastCandles");
    const buyerColor = document.getElementById("dvlVtBuyerColor");
    const sellerColor = document.getElementById("dvlVtSellerColor");
    const cOn = document.getElementById("dvlVtClusterOn");
    const cStyle = document.getElementById("dvlVtClusterStyle");
    const cCandles = document.getElementById("dvlVtClusterCandles");
    const cPrice = document.getElementById("dvlVtClusterPrice");
    const cMin = document.getElementById("dvlVtClusterMin");
    const strong = document.getElementById("dvlVtStrongOnly");

    const syncGeneral = () => {
      state.on = !!on.checked;
      state.visualStyle = visual.value;
      state.detectionTf = tf.value;
      state.sideFilter = sideFilter ? sideFilter.value : "all";
      state.avgLen = clampLocal(Number(avg.value) || 20, 2, 500);
      state.lastCandles = clampLocal(Number(lastCandles ? lastCandles.value : state.lastCandles) || 120, 1, 5000);
      state.buyerColor = buyerColor ? buyerColor.value : (state.buyerColor || "#13dc8d");
      state.sellerColor = sellerColor ? sellerColor.value : (state.sellerColor || "#ff4a61");
      state.clusterOn = !!cOn.checked;
      state.clusterStyle = cStyle.value;
      state.clusterMaxCandles = clampLocal(Number(cCandles.value) || 0, 0, 20);
      state.clusterMaxPricePct = clampLocal(Number(cPrice.value) || 0, 0, 20);
      state.clusterMinLevel = clampLocal(Number(cMin.value) || 4, 1, 5);
      state.clusterStrongOnly = !!strong.checked;
      saveState();
    };

    [on, visual, tf, sideFilter, avg, lastCandles, buyerColor, sellerColor, cOn, cStyle, cCandles, cPrice, cMin, strong].forEach(el => {
      if(!el) return;
      el.addEventListener("change", syncGeneral);
      el.addEventListener("input", syncGeneral);
    });

    const buyerBtn = document.getElementById("dvlVtBuyerColorBtn");
    const sellerBtn = document.getElementById("dvlVtSellerColorBtn");
    if(buyerBtn && buyerColor) buyerBtn.addEventListener("click", () => buyerColor.click());
    if(sellerBtn && sellerColor) sellerBtn.addEventListener("click", () => sellerColor.click());

    /* Reset is fixed in the panel header by DVL_PROJECT_RULES.indicatorReset. */

    document.querySelectorAll(".dvl-vt-level").forEach(card => {
      const i = Number(card.dataset.level);
      const lvl = state.levels[i];

      card.querySelectorAll("[data-k]").forEach(input => {
        input.addEventListener("input", () => {
          const k = input.dataset.k;
          if(k === "on" || k === "glow") lvl[k] = !!input.checked;
          else if(k === "name") lvl[k] = input.value || `Level ${i+1}`;
          else lvl[k] = Number(input.value);

          if(k === "opacity"){
            const val = input.closest(".dvl-vt-range-wrap")?.querySelector(".dvl-vt-range-val");
            if(val) val.textContent = Math.round(Number(input.value) * 100) + "%";
          }

          saveState();
        });

        input.addEventListener("change", () => {
          saveState();
        });
      });
});
  }
  function boot(){
    insertIndicatorItem();
    ensurePanel();
    updateIndicatorItem();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLVolumeTrace = {
    version:"0.880",
    get state(){ return state; },
    open: openPanel,
    reset: resetState,
    save: saveState
  };
})();
