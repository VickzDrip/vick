(function(){
  "use strict";

  const TTL_MS = 12_000;
  const cache = {
    key:"",
    loading:false,
    data:[],
    rangeStart:0,
    rangeEnd:0,
    lastFetch:0
  };

  function vtState(){
    try{
      return window.DVLVolumeTrace && window.DVLVolumeTrace.state ? window.DVLVolumeTrace.state : null;
    }catch(_){
      return null;
    }
  }

  function rows(){
    try{
      if(typeof klines !== "undefined" && Array.isArray(klines)) return klines;
    }catch(_){}
    return [];
  }

  function sym(){
    try{
      if(typeof symbol !== "undefined") return symbol;
    }catch(_){}
    return "BTCUSDT";
  }

  function chartInterval(){
    try{
      if(typeof interval !== "undefined") return interval;
    }catch(_){}
    return "1m";
  }

  function parseTf(tf){
    const m = String(tf || "1m").trim().match(/^(\d+)(s|m|h|d|w)$/);
    if(!m) return {value:1, unit:"m", ms:60_000};
    const value = Math.max(1, Number(m[1]) || 1);
    const unit = m[2];
    const unitMs = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 604_800_000;
    return {value, unit, ms:value * unitMs};
  }

  function clamp(v,a,b){
    return Math.max(a, Math.min(b, v));
  }

  function rgba(hex, a){
    hex = String(hex || "").replace("#","").trim();
    if(hex.length === 3) hex = hex.split("").map(ch => ch + ch).join("");
    if(hex.length !== 6) return "rgba(16,223,119," + a + ")";
    const n = parseInt(hex, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function roundRect(ctx, x, y, w, h, r){
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

  function binanceBase(){
    try{
      if(typeof BINANCE !== "undefined") return BINANCE;
    }catch(_){}
    return "https://fapi.binance.com";
  }

  async function getJson(url){
    try{
      if(typeof jget === "function") return await jget(url);
    }catch(_){}
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  function nativeIv(tf){
    return ["1m","3m","5m","15m","30m","1h","2h","4h","6h","8h","12h","1d","3d","1w"].includes(tf);
  }

  function baseIv(tf){
    const p = parseTf(tf);
    if(nativeIv(tf)) return tf;
    if(p.unit === "m") return "1m";
    if(p.unit === "h") return "1h";
    return "1d";
  }

  function resample(base, tf){
    const targetMs = parseTf(tf).ms;
    const buckets = new Map();

    base.forEach(c => {
      const t = Number(c.time);
      if(!Number.isFinite(t)) return;
      const bt = Math.floor(t / targetMs) * targetMs;
      let b = buckets.get(bt);
      if(!b){
        b = {
          time:bt,
          open:c.open,
          high:c.high,
          low:c.low,
          close:c.close,
          volume:0,
          buyVolume:0,
          sellVolume:0
        };
        buckets.set(bt, b);
      }
      b.high = Math.max(b.high, c.high);
      b.low = Math.min(b.low, c.low);
      b.close = c.close;
      b.volume += c.volume;
      b.buyVolume += c.buyVolume || 0;
      b.sellVolume += c.sellVolume || 0;
    });

    return Array.from(buckets.values()).sort((a,b) => a.time - b.time).map(c => {
      c.side = (c.buyVolume || 0) >= (c.sellVolume || 0) ? "buyer" : "seller";
      return c;
    });
  }

  async function fetchKlinesLower(symbolName, tf, start, end){
    const parsed = parseTf(tf);
    const iv = nativeIv(tf) ? tf : baseIv(tf);
    const baseMs = parseTf(iv).ms;
    const out = [];
    let cursor = Math.max(0, start);
    let guard = 0;

    while(cursor < end && guard < 12){
      guard++;
      const url = binanceBase() + "/fapi/v1/klines?symbol=" + encodeURIComponent(symbolName) +
        "&interval=" + encodeURIComponent(iv) +
        "&startTime=" + Math.floor(cursor) +
        "&endTime=" + Math.floor(end) +
        "&limit=1500";

      const batch = await getJson(url);
      if(!Array.isArray(batch) || !batch.length) break;

      batch.forEach(r => {
        const vol = Number(r[5]) || 0;
        const buy = Number(r[9]) || 0;
        out.push({
          time:Number(r[0]),
          open:Number(r[1]),
          high:Number(r[2]),
          low:Number(r[3]),
          close:Number(r[4]),
          volume:vol,
          buyVolume:buy,
          sellVolume:Math.max(0, vol - buy),
          side:buy >= Math.max(0, vol - buy) ? "buyer" : "seller"
        });
      });

      const lastT = Number(batch[batch.length - 1][0]);
      if(!Number.isFinite(lastT)) break;
      cursor = lastT + baseMs;
      if(batch.length < 1500) break;
    }

    const cleaned = out
      .filter(c => Number.isFinite(c.time) && c.time >= start && c.time <= end)
      .sort((a,b) => a.time - b.time);

    if(parsed.unit === "s" || nativeIv(tf)) return cleaned;
    return resample(cleaned, tf).filter(c => c.time >= start && c.time <= end);
  }

  async function fetchAggTradeCandles(symbolName, tf, start, end){
    const tfMs = parseTf(tf).ms;
    const buckets = new Map();
    let cursor = Math.max(0, start);
    let guard = 0;

    while(cursor < end && guard < 10){
      guard++;
      const url = binanceBase() + "/fapi/v1/aggTrades?symbol=" + encodeURIComponent(symbolName) +
        "&startTime=" + Math.floor(cursor) +
        "&endTime=" + Math.floor(end) +
        "&limit=1000";

      const batch = await getJson(url);
      if(!Array.isArray(batch) || !batch.length) break;

      batch.forEach(tr => {
        const t = Number(tr.T);
        const p = Number(tr.p);
        const q = Number(tr.q) || 0;
        if(!Number.isFinite(t) || !Number.isFinite(p) || !q) return;

        const bt = Math.floor(t / tfMs) * tfMs;
        let b = buckets.get(bt);
        const tradeSide = tr.m ? "seller" : "buyer";

        if(!b){
          b = {
            time:bt,
            open:p,
            high:p,
            low:p,
            close:p,
            volume:0,
            buyVolume:0,
            sellVolume:0
          };
          buckets.set(bt, b);
        }

        b.high = Math.max(b.high, p);
        b.low = Math.min(b.low, p);
        b.close = p;
        b.volume += q;
        if(tradeSide === "buyer") b.buyVolume += q;
        else b.sellVolume += q;
      });

      const lastT = Number(batch[batch.length - 1].T);
      if(!Number.isFinite(lastT) || lastT <= cursor) break;
      cursor = lastT + 1;

      if(batch.length < 1000) break;
    }

    return Array.from(buckets.values()).sort((a,b) => a.time - b.time).map(c => {
      c.side = (c.buyVolume || 0) >= (c.sellVolume || 0) ? "buyer" : "seller";
      return c;
    });
  }

  async function fetchTickBars(symbolName, start, end, tfMs){
    // 1) Tenta VPS coletor
    try{
      const url = "/api/ticks/bars?symbol="+encodeURIComponent(symbolName)+"&from="+start+"&to="+end;
      const r = await fetch(url);
      if(r.ok){
        const bars = await r.json();
        if(Array.isArray(bars) && bars.length){
          return bars.map(b=>({
            time:b.ts, volume:(b.buyVol||0)+(b.sellVol||0),
            buyVolume:b.buyVol||0, sellVolume:b.sellVol||0,
            low:0, high:0, close:0
          }));
        }
      }
    }catch(_){}
    // 2) Fallback: barras ao vivo via WebSocket do TV
    const tv=window.DVLTickVolume;
    if(tv && typeof tv.liveBars==="function"){
      return tv.liveBars(start,end,tfMs).map(b=>({
        time:b.ts, volume:(b.buyVol||0)+(b.sellVol||0),
        buyVolume:b.buyVol||0, sellVolume:b.sellVol||0,
        low:0, high:0, close:0
      }));
    }
    return [];
  }

  async function loadLowerData(state, cfg){
    const chart = rows();
    if(!chart.length || !cfg || !cfg.win) return;

    const tf = state.detectionTf || "1s";
    const tfMs = parseTf(tf).ms;
    const currentTfMs = parseTf(chartInterval()).ms;
    const avgPad = Math.max(2, Number(state.avgLen) || 20) * tfMs;

    const startIndex = Math.max(0, cfg.win.start - 3);
    const endIndex = Math.min(chart.length - 1, cfg.win.end + 3);
    const rangeEnd = Number(chart[endIndex]?.time || chart.at(-1).time) + currentTfMs;
    const rawStart = Math.max(0, Number(chart[startIndex]?.time || chart[0].time) - avgPad);
    // Para "s": limita a 2h — coletor de ticks não mantém histórico maior
    const rangeStart = (parseTf(tf).unit === "s")
      ? Math.max(rawStart, rangeEnd - 7_200_000)
      : rawStart;

    const key = sym() + "|" + tf + "|" + Math.floor(rangeStart / 10_000) + "|" + Math.floor(rangeEnd / 10_000);

    // Qualquer fetch recente (com ou sem dados) aguarda o TTL — evita spam
    const alreadyFetched = cache.key === key && (Date.now() - cache.lastFetch) < TTL_MS;
    if(alreadyFetched || cache.loading) return;

    cache.loading = true;
    cache.key = key;
    cache.rangeStart = rangeStart;
    cache.rangeEnd = rangeEnd;

    try{
      const parsed = parseTf(tf);
      let data = [];
      if(parsed.unit === "s"){
        data = await fetchTickBars(sym(), rangeStart, rangeEnd, tfMs);
      }else{
        data = await fetchKlinesLower(sym(), tf, rangeStart, rangeEnd);
      }

      cache.data = Array.isArray(data) ? data : [];
      cache.lastFetch = Date.now();
    }catch(err){
      console.warn("DVL Volume Trace lower-TF fetch error", err);
      cache.data = [];
      cache.lastFetch = Date.now();
    }finally{
      cache.loading = false;
      try{
        if(typeof drawSoon === "function") drawSoon();
      }catch(_){}
    }
  }

  function avgLowerVolume(data, idx, len){
    const start = Math.max(0, idx - len);
    let sum = 0, count = 0;
    for(let i=start; i<idx; i++){
      const v = Number(data[i]?.volume);
      if(Number.isFinite(v)){
        sum += v;
        count++;
      }
    }
    return count ? sum / count : 0;
  }

  function levelForRatio(state, ratio){
    let best = 0;
    for(let i=0; i<state.levels.length; i++){
      const lvl = state.levels[i];
      if(!lvl || !lvl.on) continue;
      const m = Math.max(.01, Number(lvl.mult) || (i + 1));
      if(ratio >= m) best = i + 1;
    }
    return best;
  }

  function findParentIndex(chart, t, chartMs){
    let lo = 0, hi = chart.length - 1, ans = -1;
    while(lo <= hi){
      const mid = (lo + hi) >> 1;
      const mt = Number(chart[mid].time);
      if(mt <= t){
        ans = mid;
        lo = mid + 1;
      }else{
        hi = mid - 1;
      }
    }
    if(ans < 0) return -1;
    const start = Number(chart[ans].time);
    if(t >= start && t < start + chartMs) return ans;
    return -1;
  }

  function buildLowerEvents(state, cfg){
    const chart = rows();
    const data = cache.data || [];
    if(!chart.length || !data.length || !cfg || !cfg.win) return [];

    const len = clamp(Number(state.avgLen) || 20, 2, 500);
    const chartMs = parseTf(chartInterval()).ms;
    const events = [];

    for(let i=0; i<data.length; i++){
      const c = data[i];
      if(!c || c.time < cache.rangeStart || c.time > cache.rangeEnd) continue;

      const avg = avgLowerVolume(data, i, len);
      if(!avg || avg <= 0) continue;

      const ratio = Number(c.volume) / avg;
      const level = levelForRatio(state, ratio);
      if(!level) continue;

      const side = (c.buyVolume || 0) >= (c.sellVolume || 0) ? "buyer" : "seller";
      if(state.sideFilter && state.sideFilter !== "all" && state.sideFilter !== side) continue;

      const parentGi = findParentIndex(chart, Number(c.time), chartMs);
      if(parentGi < cfg.win.start - 3 || parentGi > cfg.win.end + 3) continue;

      const lastLimit = clamp(Number(state.lastCandles) || 120, 1, 5000);
      const newestAllowedIndex = chart.length - lastLimit;
      if(parentGi < newestAllowedIndex) continue;

      const parent = chart[parentGi];
      const pLow = Number(parent?.low);
      const pHigh = Number(parent?.high);
      const mid = (pLow + pHigh) / 2;
      const low  = (c.low||0)  ? clamp(Math.min(Number(c.low),Number(c.high)),pLow,pHigh) : mid;
      const high = (c.high||0) ? clamp(Math.max(Number(c.low),Number(c.high)),pLow,pHigh) : mid;
      const priceRaw = (c.close||0) ? (Number(c.close)*2+Number(c.high)+Number(c.low))/4 : mid;
      const price = clamp(priceRaw, pLow, pHigh);

      events.push({
        gi:parentGi,
        time:Number(c.time),
        level,
        ratio,
        side,
        buyVolume:Number(c.buyVolume) || 0,
        sellVolume:Number(c.sellVolume) || 0,
        volume:Number(c.volume) || 0,
        price,
        low,
        high
      });
    }

    return events;
  }

  function clusterEvents(state, events){
    if(!state.clusterOn) return events.map(e => ({
      events:[e],
      level:e.level,
      side:e.side,
      buyVolume:e.buyVolume,
      sellVolume:e.sellVolume,
      low:e.low,
      high:e.high,
      gi:e.gi,
      price:e.price
    }));

    const minLevel = Number(state.clusterMinLevel) || 4;
    const maxCandles = Number(state.clusterMaxCandles) || 0;
    const maxPct = Number(state.clusterMaxPricePct) || 0;
    const used = new Set();
    const groups = [];

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
        const priceOk = Math.abs(e.price - base.price) / Math.max(Math.abs(base.price), 1) * 100 <= maxPct;

        if(strongOk && candleOk && priceOk){
          group.push(e);
          used.add(j);
        }
      }

      const level = Math.max(...group.map(e => e.level));
      const low = Math.min(...group.map(e => e.low));
      const high = Math.max(...group.map(e => e.high));
      const gi = Math.round(group.reduce((a,e) => a + e.gi, 0) / group.length);
      const price = group.reduce((a,e) => a + e.price, 0) / group.length;
      const buyVolume = group.reduce((a,e) => a + (e.buyVolume || 0), 0);
      const sellVolume = group.reduce((a,e) => a + (e.sellVolume || 0), 0);
      const side = buyVolume >= sellVolume ? "buyer" : "seller";

      groups.push({events:group, level, side, buyVolume, sellVolume, low, high, gi, price});
    }

    return groups;
  }

  function drawTrace(ctx, xA, xB, y, style, strong){
    const color = style.color;
    ctx.save();
    ctx.globalAlpha = clamp(Number(style.opacity) || .5, .05, 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, Number(style.thickness) || 3) * (strong ? 1.25 : 1);
    ctx.lineCap = "round";
    if(style.glow){
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(2, Number(style.glowPower) || 10) * (strong ? 1.25 : 1);
    }
    ctx.beginPath();
    ctx.moveTo(xA, y);
    ctx.lineTo(xB, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBubble(ctx, x, y, style, strong){
    const color = style.color;
    const r = (Number(style.thickness) || 3) * (strong ? 2.8 : 2.1) + 3;
    ctx.save();
    ctx.globalAlpha = clamp(Number(style.opacity) || .5, .05, 1);
    if(style.glow){
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(2, Number(style.glowPower) || 10);
    }
    ctx.fillStyle = rgba(color, .42);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawZone(ctx, xA, xB, yA, yB, style, strong){
    const color = style.color;
    const top = Math.min(yA, yB);
    const h = Math.max(4, Math.abs(yB - yA));
    ctx.save();
    ctx.globalAlpha = clamp((Number(style.opacity) || .5) * (strong ? .55 : .38), .06, .55);
    ctx.fillStyle = color;
    if(style.glow){
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(2, Number(style.glowPower) || 10) * .8;
    }
    roundRect(ctx, xA, top, xB - xA, h, Math.min(8, h/2));
    ctx.fill();
    ctx.restore();
  }

  // Guarda o draw klines-based original para usar como fallback
  const _origVTDraw = typeof window.DVLVolumeTraceDraw === "function" ? window.DVLVolumeTraceDraw : null;

  window.DVLVolumeTraceDraw = function(ctx, cfg){
    const state = vtState();
    if(!state || !state.on || !cfg || !cfg.view || !cfg.view.length) return;

    loadLowerData(state, cfg);

    const data = cache.data || [];
    if(!data.length){ if(_origVTDraw) _origVTDraw(ctx, cfg); return; }

    const events = buildLowerEvents(state, cfg);
    if(!events.length){ if(_origVTDraw) _origVTDraw(ctx, cfg); return; }

    const groups = clusterEvents(state, events);
    const rightLimit = cfg.x1 - 4;
    const leftLimit = cfg.x0 + 4;

    groups.forEach(g => {
      const lvl = clamp(g.level, 1, 5);
      const base = state.levels[lvl - 1] || state.levels[0] || {};
      const style = Object.assign({}, base);
      style.color = g.side === "seller" ? (state.sellerColor || "#ff4a61") : (state.buyerColor || "#13dc8d");

      const localIndex = g.gi - cfg.win.start;
      if(localIndex < -2 || localIndex > cfg.view.length + 2) return;

      const cx = cfg.x(cfg.slotOffset + localIndex);
      if(cx < leftLimit - 90 || cx > rightLimit + 90) return;

      const cy = cfg.y(g.price);
      const yTop = cfg.y(g.high);
      const yBot = cfg.y(g.low);
      if(cy < cfg.y0 - 30 || cy > cfg.y1 + 30) return;

      const isCluster = g.events.length > 1 && Math.max(...g.events.map(e => e.level)) >= (Number(state.clusterMinLevel) || 4);
      const visual = isCluster ? state.clusterStyle : state.visualStyle;

      const baseLen = Math.max(6, Number(style.length) || 24);
      const len = baseLen * (isCluster ? 1.75 : 1);
      const xA = clamp(cx - len / 2, leftLimit, rightLimit);
      const xB = clamp(cx + len / 2, leftLimit, rightLimit);
      const zXA = clamp(cx - len * .62, leftLimit, rightLimit);
      const zXB = clamp(cx + len * .62, leftLimit, rightLimit);

      if(visual === "softZone" || visual === "traceZone" || visual === "wideTrace"){
        drawZone(ctx, zXA, zXB, yTop, yBot, style, isCluster);
      }

      if(visual === "bubble" || visual === "both" || visual === "bigBubble" || visual === "traceZone"){
        drawBubble(ctx, cx, cy, style, isCluster || visual === "bigBubble");
      }

      if(visual === "horizontal" || visual === "both" || visual === "wideTrace" || visual === "traceZone"){
        drawTrace(ctx, xA, xB, cy, style, isCluster || visual === "wideTrace");
      }
    });
  };

  if(window.DVLVolumeTrace){
    window.DVLVolumeTrace.lowerTfOnly = true;
    window.DVLVolumeTrace.lowerTfCache = cache;
    window.DVLVolumeTrace.version = "0.577";
  }
})();
