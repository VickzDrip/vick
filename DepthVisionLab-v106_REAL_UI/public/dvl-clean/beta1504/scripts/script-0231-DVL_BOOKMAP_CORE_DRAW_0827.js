(function(){
  "use strict";
  if(window.DVL_BOOKMAP_CORE_DRAW_0827_READY) return;
  window.DVL_BOOKMAP_CORE_DRAW_0827_READY = true;

  var cache = { key:"", bids:[], asks:[], ts:0, fetching:false, err:"" };
  var MIN_FETCH_MS = 1050;

  function api(){
    return window.DVL_BOOKMAP_ZONES_0813 || window.DVL_BOOKMAP_ZONES_0812 || window.DVL_BOOKMAP_ZONES_0808 || null;
  }

  function finite(v,d,min,max){
    v = Number(v);
    if(!Number.isFinite(v)) v = d;
    if(Number.isFinite(min)) v = Math.max(min, v);
    if(Number.isFinite(max)) v = Math.min(max, v);
    return v;
  }

  function settings(){
    var a = api();
    var s = (a && (a.settings || a.state)) ? (a.settings || a.state) : {};
    return {
      on: !!s.on,
      source: s.source === "spot" ? "spot" : "futures",
      depth: [20,100,500].indexOf(Number(s.depth)) >= 0 ? Number(s.depth) : 500,
      sensitivity: ["low","medium","high"].indexOf(s.sensitivity) >= 0 ? s.sensitivity : "medium",
      maxZones: finite(s.maxZones, 10, 3, 18),
      heightPx: finite(s.heightPx, 7, 3, 16),
      labels: false,
      glow: s.glow !== false,
      maxDistATR: !!s.maxDistATR,
      atrDistance: finite(s.atrDistance, 5, 1, 20),
      opacity: finite(s.opacity, 0.46, 0.14, 0.72)
    };
  }

  function symbolName(){
    try{ if(typeof symbol !== "undefined" && symbol) return String(symbol).toUpperCase().replace(/[^A-Z0-9]/g,""); }catch(_){}
    try{ if(window.symbol) return String(window.symbol).toUpperCase().replace(/[^A-Z0-9]/g,""); }catch(_){}
    return "BTCUSDT";
  }

  function depthUrl(){
    var s = settings();
    var limit = Math.max(20, Math.min(1000, Number(s.depth) || 500));
    var pair = symbolName();
    if(s.source === "spot") return "https://api.binance.com/api/v3/depth?symbol=" + pair + "&limit=" + limit;
    return "https://fapi.binance.com/fapi/v1/depth?symbol=" + pair + "&limit=" + limit;
  }

  function depthKey(){
    var s = settings();
    return symbolName() + "|" + s.source + "|" + s.depth;
  }

  function toLevel(row){
    var price = Number(row && row[0]);
    var qty = Number(row && row[1]);
    if(!(price > 0 && qty > 0)) return null;
    return { price:price, qty:qty, notional:price * qty };
  }

  function drawSoonSafe(){
    try{ if(typeof drawSoon === "function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){}
  }

  async function fetchDepth(force){
    var s = settings();
    if(!s.on) return;

    var now = Date.now();
    var k = depthKey();

    if(!force && cache.fetching) return;
    if(!force && cache.key === k && now - cache.ts < MIN_FETCH_MS) return;

    cache.fetching = true;
    cache.key = k;

    try{
      var r = await fetch(depthUrl(), { cache:"no-store" });
      if(!r.ok) throw new Error("HTTP " + r.status);
      var j = await r.json();

      cache.bids = (Array.isArray(j.bids) ? j.bids : []).map(toLevel).filter(Boolean);
      cache.asks = (Array.isArray(j.asks) ? j.asks : []).map(toLevel).filter(Boolean);
      cache.ts = Date.now();
      cache.err = "";
      drawSoonSafe();
    }catch(err){
      cache.err = err && err.message ? err.message : String(err || "error");
      cache.ts = Date.now();
      console.warn("[DVL Bookmap Refined 0.826]", cache.err);
      drawSoonSafe();
    }finally{
      cache.fetching = false;
    }
  }

  function currentPrice(cfg){
    try{ if(typeof ticker !== "undefined" && ticker && Number(ticker.lastPrice) > 0) return Number(ticker.lastPrice); }catch(_){}
    try{ if(window.ticker && Number(window.ticker.lastPrice) > 0) return Number(window.ticker.lastPrice); }catch(_){}
    try{ if(typeof marketEntryPrice !== "undefined" && Number(marketEntryPrice) > 0) return Number(marketEntryPrice); }catch(_){}
    if(cfg && Array.isArray(cfg.view) && cfg.view.length){
      var last = cfg.view[cfg.view.length - 1];
      if(Number(last.close) > 0) return Number(last.close);
    }
    if(cfg && Number.isFinite(cfg.min) && Number.isFinite(cfg.max)) return (cfg.min + cfg.max) / 2;
    return 0;
  }

  function seed(price){
    var x = Math.sin(Number(price) * 127.131 + 17.17) * 43758.5453;
    return x - Math.floor(x);
  }

  function visibleLevels(side, isBid, cfg){
    var price = currentPrice(cfg);
    var visibleMin = Math.min(Number(cfg.min), Number(cfg.max));
    var visibleMax = Math.max(Number(cfg.min), Number(cfg.max));
    var range = Math.max(visibleMax - visibleMin, 1e-9);
    var pad = range * 0.40;

    var rows = side.filter(function(o){
      if(!(o.price > 0 && o.qty > 0)) return false;
      if(price > 0){
        if(isBid && o.price > price) return false;
        if(!isBid && o.price < price) return false;
      }
      return o.price >= visibleMin - pad && o.price <= visibleMax + pad;
    }).map(function(o){
      return { price:o.price, qty:o.qty, notional:o.notional, isBid:isBid, dist:price > 0 ? Math.abs(o.price-price) : 0 };
    });

    if(!rows.length && side.length && price > 0){
      rows = side.map(function(o){
        return { price:o.price, qty:o.qty, notional:o.notional, isBid:isBid, dist:Math.abs(o.price-price) };
      }).sort(function(a,b){ return a.dist - b.dist; }).slice(0, 160);
    }

    return rows;
  }

  function fmt(v){
    v = Number(v);
    if(!Number.isFinite(v)) return "--";
    if(v >= 1000) return v.toFixed(1);
    if(v >= 10) return v.toFixed(2);
    if(v >= 1) return v.toFixed(4);
    return v.toFixed(6);
  }

  function drawRounded(ctx,x,y,w,h,r){
    r = Math.max(0, Math.min(r, h/2, w/2));
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
    ctx.closePath();
  }

  function levelStrength(z, maxN){
    var base = Math.max(0.015, Math.min(1, z.notional / Math.max(maxN, 1)));
    return Math.pow(base, 0.50);
  }

  function drawBaseFog(ctx,cfg){
    var cp = currentPrice(cfg);
    if(!(cp > 0)) return;
    var ycp = cfg.y(cp);
    if(!Number.isFinite(ycp)) return;

    var x0 = cfg.x0 + 4;
    var x1 = cfg.x1 - 7;
    var profileW = 0;
    var heatEnd = x1 - profileW + 4;

    var red = ctx.createLinearGradient(0, cfg.y0, 0, ycp);
    red.addColorStop(0, "rgba(255,74,97,.095)");
    red.addColorStop(.55, "rgba(255,74,97,.052)");
    red.addColorStop(1, "rgba(255,74,97,0)");

    ctx.fillStyle = red;
    ctx.fillRect(x0, cfg.y0, heatEnd - x0, Math.max(0, ycp - cfg.y0));

    var green = ctx.createLinearGradient(0, ycp, 0, cfg.y1);
    green.addColorStop(0, "rgba(16,223,119,0)");
    green.addColorStop(.45, "rgba(16,223,119,.055)");
    green.addColorStop(1, "rgba(16,223,119,.095)");

    ctx.fillStyle = green;
    ctx.fillRect(x0, ycp, heatEnd - x0, Math.max(0, cfg.y1 - ycp));
  }

  function drawMicroTexture(ctx,cfg,levels,maxN){
    var s = settings();
    var x0 = cfg.x0 + 4;
    var x1 = cfg.x1 - 7;
    var profileW = 0;
    var heatEnd = x1 - profileW + 4;
    var chartW = Math.max(1, heatEnd - x0);

    /*
      The texture is intentionally made of many thin real-depth strips.
      No giant rectangles: the glow comes from accumulation.
    */
    levels.forEach(function(z){
      var yy = cfg.y(z.price);
      if(!Number.isFinite(yy) || yy < cfg.y0 - 20 || yy > cfg.y1 + 20) return;

      var st = levelStrength(z, maxN);
      var rgb = z.isBid ? "16,223,119" : "255,74,97";
      var n1 = seed(z.price);
      var n2 = seed(z.price + 19);
      var n3 = seed(z.price + 73);

      var h = Math.max(0.75, Math.min(5.8, 0.75 + st * 5.0));
      var alpha = Math.max(0.018, Math.min(0.22, (0.026 + st * 0.19) * s.opacity * 1.55));

      var segs = st > 0.42 ? 3 : 2;
      for(var i=0;i<segs;i++){
        var startRatio = Math.min(0.78, Math.max(0.0, (i * 0.17) + (i === 0 ? n1 * 0.26 : n2 * 0.19)));
        var endRatio = Math.min(1.0, startRatio + 0.28 + n3 * 0.28 + st * 0.24);
        var sx = x0 + chartW * startRatio;
        var ex = x0 + chartW * endRatio;
        if(ex <= sx + 5) continue;

        var grad = ctx.createLinearGradient(sx,0,ex,0);
        grad.addColorStop(0, "rgba(" + rgb + ",0)");
        grad.addColorStop(0.34, "rgba(" + rgb + "," + (alpha * 0.58).toFixed(3) + ")");
        grad.addColorStop(0.78, "rgba(" + rgb + "," + alpha.toFixed(3) + ")");
        grad.addColorStop(1, "rgba(" + rgb + ",0)");

        ctx.fillStyle = grad;
        ctx.globalAlpha = 1;
        ctx.fillRect(sx, yy - h/2, ex - sx, h);
      }

      if(st > 0.22){
        var lineStart = x0 + chartW * (0.45 + n2 * 0.18);
        var lineEnd = heatEnd - 2;
        ctx.globalAlpha = Math.min(0.50, alpha + 0.11);
        ctx.strokeStyle = "rgba(" + rgb + "," + Math.min(0.52, alpha + 0.15).toFixed(3) + ")";
        ctx.lineWidth = st > 0.60 ? 1.05 : 0.65;
        ctx.beginPath();
        ctx.moveTo(lineStart, yy);
        ctx.lineTo(lineEnd, yy);
        ctx.stroke();
      }
    });
  }

  function drawStrongLines(ctx,cfg,levels,maxN){
    var s = settings();
    var x0 = cfg.x0 + 4;
    var x1 = cfg.x1 - 7;
    var profileW = 0;
    var heatEnd = x1 - profileW + 4;
    var chartW = Math.max(1, heatEnd - x0);

    var strong = levels.slice()
      .sort(function(a,b){ return b.notional - a.notional; })
      .slice(0, Math.max(5, Math.min(12, s.maxZones + 2)));

    strong.forEach(function(z,idx){
      var yy = cfg.y(z.price);
      if(!Number.isFinite(yy) || yy < cfg.y0 - 26 || yy > cfg.y1 + 26) return;

      var st = levelStrength(z, maxN);
      var rgb = z.isBid ? "16,223,119" : "255,74,97";
      var h = Math.max(3.0, Math.min(10.5, (Number(s.heightPx) || 7) * (0.42 + st * 0.55)));
      var alpha = Math.max(0.12, Math.min(0.47, (0.15 + st * 0.35) * s.opacity * 1.18));
      var left = x0 + chartW * (0.12 + seed(z.price) * 0.27);
      var end = heatEnd;

      var grad = ctx.createLinearGradient(left,0,end,0);
      grad.addColorStop(0, "rgba(" + rgb + ",0)");
      grad.addColorStop(0.35, "rgba(" + rgb + "," + (alpha * 0.44).toFixed(3) + ")");
      grad.addColorStop(0.84, "rgba(" + rgb + "," + alpha.toFixed(3) + ")");
      grad.addColorStop(1, "rgba(" + rgb + "," + (alpha * 0.28).toFixed(3) + ")");

      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(left, yy - h/2, end - left, h);

      ctx.globalAlpha = Math.min(0.88, alpha + 0.20);
      ctx.strokeStyle = "rgba(" + rgb + ",.88)";
      ctx.lineWidth = st > 0.72 ? 1.55 : 1.05;
      if(s.glow){
        ctx.shadowColor = "rgba(" + rgb + ",.58)";
        ctx.shadowBlur = 6 + st * 10;
      }
      ctx.beginPath();
      ctx.moveTo(left + chartW * 0.10, yy);
      ctx.lineTo(end, yy);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  function drawProfileDisabled0827(ctx,cfg,levels,maxN){
    var x1 = cfg.x1 - 8;
    var profileW = 0;
    var profileX = x1 - profileW;
    var binH = Math.max(1.45, Math.min(3.8, (cfg.y1 - cfg.y0) / 190));

    ctx.save();
    levels.forEach(function(z){
      var yy = cfg.y(z.price);
      if(!Number.isFinite(yy) || yy < cfg.y0 - 18 || yy > cfg.y1 + 18) return;

      var st = Math.max(0.02, Math.min(1, z.notional / Math.max(maxN,1)));
      var power = Math.pow(st, 0.52);
      var w = Math.max(2, profileW * power);
      var rgb = z.isBid ? "16,223,119" : "255,74,97";

      ctx.globalAlpha = 0.13 + power * 0.42;
      ctx.fillStyle = "rgba(" + rgb + ",1)";
      ctx.fillRect(x1 - w, yy - binH/2, w, binH);

      ctx.globalAlpha = 0.075;
      ctx.fillStyle = "rgba(190,205,198,1)";
      ctx.fillRect(profileX - 5, yy - binH/2, Math.max(1.5, w * 0.36), binH);
    });
    ctx.restore();
  }

  function compactLabelText(isBid, rank){
    if(rank === 0) return isBid ? "Top Buy" : "Top Sell";
    if(rank === 1) return "Very Strong";
    return "";
  }

  function drawCompactTagsDisabled0827(ctx,cfg,levels){
    var s = settings();
    if(!s.labels) return;

    var profileW = 0;
    var placed = [];

    var picks = levels.slice().sort(function(a,b){ return b.notional - a.notional; }).slice(0, 5);
    picks.forEach(function(z,rank){
      var text = compactLabelText(z.isBid, rank);
      if(!text) return;

      var yy = cfg.y(z.price);
      if(!Number.isFinite(yy)) return;

      for(var i=0;i<placed.length;i++){
        if(Math.abs(placed[i]-yy) < 34) return;
      }
      placed.push(yy);

      var rgb = z.isBid ? "16,223,119" : "255,74,97";
      var boxW = text === "Very Strong" ? 70 : 60;
      var boxH = 20;
      var x = cfg.x1 - profileW - boxW - 14;
      var y = yy - boxH/2;

      ctx.save();
      ctx.globalAlpha = 0.64;
      ctx.fillStyle = "rgba(2,8,6,.68)";
      drawRounded(ctx,x,y,boxW,boxH,6);
      ctx.fill();

      ctx.globalAlpha = 0.70;
      ctx.strokeStyle = "rgba(" + rgb + ",.86)";
      ctx.lineWidth = 1;
      drawRounded(ctx,x,y,boxW,boxH,6);
      ctx.stroke();

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(" + rgb + ",1)";
      ctx.font = "820 8.5px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + boxW/2, y + boxH/2);
      ctx.restore();
    });
  }

  function drawWaiting(ctx,cfg){
    var price = currentPrice(cfg);
    if(!(price > 0)) return;
    var yy = cfg.y ? cfg.y(price) : NaN;
    if(!Number.isFinite(yy)) return;

    var x0 = cfg.x0 + (cfg.x1-cfg.x0) * 0.22;
    var x1 = cfg.x1 - Math.max(42, Math.min(66, (cfg.x1-cfg.x0) * 0.12));
    var h = 9;

    ctx.save();
    var grad = ctx.createLinearGradient(x0,0,x1,0);
    grad.addColorStop(0,"rgba(255,211,33,0)");
    grad.addColorStop(.70,"rgba(255,211,33,.18)");
    grad.addColorStop(1,"rgba(255,211,33,.06)");
    ctx.fillStyle = grad;
    ctx.fillRect(x0, yy - h/2, x1 - x0, h);

    ctx.font = "800 9px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,211,33,.68)";
    ctx.fillText(cache.err ? "API" : "loading", x1 - 4, yy - h/2 - 6);
    ctx.restore();
  }

  function drawTitle(ctx,cfg,text,color){
    /*
      Tiny title only, tucked under OHLC area. Avoid overlapping candle/header text.
    */
    ctx.save();
    ctx.globalAlpha = .54;
    ctx.font = "800 9px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = color || "rgba(16,223,119,.62)";
    ctx.fillText(text, cfg.x0 + 8, cfg.y0 + 22);
    ctx.restore();
  }

  window.DVL_BOOKMAP_CORE_DRAW_0827 = function(ctx,cfg){
    var s = settings();
    if(!s.on) return;
    if(!ctx || !cfg || typeof cfg.y !== "function") return;

    fetchDepth(false);

    ctx.save();
    ctx.beginPath();
    ctx.rect(cfg.x0, cfg.y0, Math.max(1,cfg.x1-cfg.x0), Math.max(1,cfg.y1-cfg.y0));
    ctx.clip();

    var asks = visibleLevels(cache.asks, false, cfg);
    var bids = visibleLevels(cache.bids, true, cfg);
    var levels = asks.concat(bids);

    if(!levels.length){
      drawWaiting(ctx,cfg);
      drawTitle(ctx,cfg, cache.err ? "BOOKMAP · API" : "BOOKMAP · loading", cache.err ? "rgba(255,211,33,.58)" : "rgba(16,223,119,.52)");
      ctx.restore();
      return;
    }

    var maxN = levels.reduce(function(m,o){ return Math.max(m, o.notional); }, 1);

    drawBaseFog(ctx,cfg);
    drawMicroTexture(ctx,cfg,levels,maxN);
    drawStrongLines(ctx,cfg,levels,maxN);

    drawTitle(ctx,cfg,"BOOKMAP · lines · " + cache.bids.length + "/" + cache.asks.length, "rgba(16,223,119,.42)");

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  window.DVL_BOOKMAP_DRAW_BRIDGE_0827 = {
    kick:function(force){ fetchDepth(!!force); drawSoonSafe(); },
    draw:window.DVL_BOOKMAP_CORE_DRAW_0827,
    cache:cache
  };

  window.DVL_BOOKMAP_DRAW_BRIDGE_0825 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;
  window.DVL_BOOKMAP_DRAW_BRIDGE_0824 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;
  window.DVL_BOOKMAP_DRAW_BRIDGE_0823 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;
  window.DVL_BOOKMAP_DRAW_BRIDGE_0822 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;
  window.DVL_BOOKMAP_DRAW_BRIDGE_0821 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;
  window.DVL_BOOKMAP_DRAW_BRIDGE_0820 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;
  window.DVL_BOOKMAP_DRAW_BRIDGE_0814 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;
  window.DVL_BOOKMAP_DRAW_BRIDGE_0812 = window.DVL_BOOKMAP_DRAW_BRIDGE_0827;

  /* Beta 1.208 — fetch depth without forcing a second redundant full-chart redraw.
     fetchDepth() already invalidates the chart only after fresh data/error arrives. */
  setInterval(function(){
    if(document.hidden || window.__dvlChartInteracting || !settings().on) return;
    fetchDepth(false);
  },1800);

  try{
    if(settings().on) fetchDepth(true);
    drawSoonSafe();
  }catch(_){}
})();
