(function(){
  "use strict";
  if(window.DVL_BOOKMAP_ZONES_MODULE_0808) return;
  window.DVL_BOOKMAP_ZONES_MODULE_0808 = true;

  var LS = "DVL_BOOKMAP_ZONES_0808";
  var DEF = {
    on:false,
    source:"futures",
    depth:100,
    sensitivity:"medium",
    maxZones:10,
    heightPx:7,
    labels:true,
    maxDistATR:true,
    atrDistance:5,
    opacity:0.52,
    glow:true
  };

  var s = Object.assign({}, DEF);
  try{
    var raw = localStorage.getItem(LS);
    if(raw) Object.assign(s, JSON.parse(raw));
  }catch(_){}

  var bids = new Map();
  var asks = new Map();
  var ws = null;
  var wsSymbol = "";
  var wsSource = "";
  var wsDepth = 0;
  var reconnectTimer = null;
  var lastDataTs = 0;
  var snapshotBusy = false;
  var panel = null;

  function save(){
    try{ localStorage.setItem(LS, JSON.stringify(s)); }catch(_){}
  }

  function ds(){
    try{ if(typeof drawSoon === "function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){}
  }

  function toast(msg){
    try{ if(typeof showToast === "function"){ showToast(msg); return; } }catch(_){}
    var t = document.getElementById("toast");
    if(t){
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(t.__bmz);
      t.__bmz = setTimeout(function(){ t.classList.remove("show"); }, 1800);
    }else{
      console.warn("[DVL Bookmap Zones]", msg);
    }
  }

  function sym(){
    try{ if(typeof symbol !== "undefined" && symbol) return String(symbol).toUpperCase().replace(/[^A-Z0-9]/g,""); }catch(_){}
    try{ if(window.currentSymbol) return String(window.currentSymbol).toUpperCase().replace(/[^A-Z0-9]/g,""); }catch(_){}
    try{ if(window.symbol) return String(window.symbol).toUpperCase().replace(/[^A-Z0-9]/g,""); }catch(_){}
    return "BTCUSDT";
  }

  function restUrl(symbol){
    var lim = Math.max(20, Math.min(1000, Number(s.depth) || 100));
    if(s.source === "spot") return "https://api.binance.com/api/v3/depth?symbol=" + symbol + "&limit=" + lim;
    return "https://fapi.binance.com/fapi/v1/depth?symbol=" + symbol + "&limit=" + lim;
  }

  function wsUrl(symbol){
    var lower = String(symbol).toLowerCase();
    if(s.source === "spot") return "wss://stream.binance.com:9443/ws/" + lower + "@depth20@500ms";
    return "wss://fstream.binance.com/ws/" + lower + "@depth20@500ms";
  }

  function clearBook(){
    bids.clear();
    asks.clear();
    lastDataTs = 0;
  }

  function applyLevels(map, arr){
    if(!Array.isArray(arr)) return;
    arr.forEach(function(lvl){
      var p = Number(lvl[0]);
      var q = Number(lvl[1]);
      if(!Number.isFinite(p) || !Number.isFinite(q)) return;
      if(q <= 0) map.delete(p);
      else map.set(p, q);
    });
  }

  async function loadSnapshot(){
    if(snapshotBusy || !s.on) return;
    snapshotBusy = true;
    try{
      var r = await fetch(restUrl(sym()), {cache:"no-store"});
      if(!r.ok) throw new Error("HTTP " + r.status);
      var j = await r.json();
      bids.clear();
      asks.clear();
      applyLevels(bids, j.bids || []);
      applyLevels(asks, j.asks || []);
      lastDataTs = Date.now();
      ds();
    }catch(err){
      console.warn("[DVL Bookmap Zones] snapshot", err && err.message ? err.message : err);
    }finally{
      snapshotBusy = false;
    }
  }

  function disconnect(){
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if(ws){
      try{ ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null; ws.close(); }catch(_){}
    }
    ws = null;
    wsSymbol = "";
  }

  function connect(){
    if(!s.on){
      disconnect();
      return;
    }
    var cur = sym();
    if(ws && wsSymbol === cur && wsSource === s.source && wsDepth === s.depth) return;

    disconnect();
    clearBook();
    wsSymbol = cur;
    wsSource = s.source;
    wsDepth = s.depth;

    loadSnapshot();

    try{
      ws = new WebSocket(wsUrl(cur));
      ws.onmessage = function(ev){
        try{
          var data = JSON.parse(ev.data);
          applyLevels(bids, data.b || data.bids || []);
          applyLevels(asks, data.a || data.asks || []);
          lastDataTs = Date.now();
          ds();
        }catch(err){
          console.warn("[DVL Bookmap Zones] ws parse", err);
        }
      };
      ws.onerror = function(){
        console.warn("[DVL Bookmap Zones] ws error");
      };
      ws.onclose = function(){
        ws = null;
        if(s.on){
          reconnectTimer = setTimeout(connect, 1800);
        }
      };
    }catch(err){
      console.warn("[DVL Bookmap Zones] ws", err);
      reconnectTimer = setTimeout(connect, 2200);
    }
  }

  function currentPrice(view){
    try{ if(typeof ticker !== "undefined" && ticker && Number(ticker.lastPrice) > 0) return Number(ticker.lastPrice); }catch(_){}
    try{ if(typeof marketEntryPrice !== "undefined" && Number(marketEntryPrice) > 0) return Number(marketEntryPrice); }catch(_){}
    try{ if(Array.isArray(view) && view.length) return Number(view[view.length - 1].close); }catch(_){}
    return 0;
  }

  function atr(view){
    if(!Array.isArray(view) || view.length < 2) return 0;
    var n = Math.min(14, view.length - 1);
    var sum = 0;
    for(var i = view.length - n; i < view.length; i++){
      var c = view[i];
      var p = view[i - 1];
      var h = Number(c.high), l = Number(c.low), pc = Number(p.close);
      sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }
    return sum / Math.max(1, n);
  }

  function sensitivityPct(){
    if(s.sensitivity === "low") return 0.18;
    if(s.sensitivity === "high") return 0.42;
    return 0.28;
  }

  function levelsForSide(map, isBid, view){
    var cur = currentPrice(view);
    var a = atr(view);
    var maxDist = s.maxDistATR && a > 0 ? a * (Number(s.atrDistance) || 5) : Infinity;
    var arr = Array.from(map.entries()).map(function(e){
      var price = Number(e[0]);
      var qty = Number(e[1]);
      return {price:price, qty:qty, notional:price * qty, isBid:isBid};
    }).filter(function(o){
      if(!(o.price > 0 && o.qty > 0)) return false;
      if(isBid && o.price > cur) return false;
      if(!isBid && o.price < cur) return false;
      return Math.abs(o.price - cur) <= maxDist;
    });

    arr.sort(function(a,b){ return b.notional - a.notional; });
    var topN = arr.slice(0, Math.max(20, Number(s.depth) || 100));
    var maxN = topN.reduce(function(m,o){ return Math.max(m, o.notional); }, 0);
    var minN = maxN * sensitivityPct();
    return topN
      .filter(function(o){ return o.notional >= minN; })
      .slice(0, Math.max(1, Math.floor(Number(s.maxZones) || 10)));
  }

  function fmtPrice(p){
    p = Number(p);
    if(!Number.isFinite(p)) return "--";
    if(p >= 1000) return p.toFixed(1);
    if(p >= 10) return p.toFixed(2);
    if(p >= 1) return p.toFixed(3);
    return p.toFixed(5);
  }

  function draw(ctx, cfg){
    if(!s.on) return;
    connect();
    var view = cfg && cfg.view;
    if(!Array.isArray(view) || !view.length) return;

    var bidLvls = levelsForSide(bids, true, view);
    var askLvls = levelsForSide(asks, false, view);
    var all = bidLvls.concat(askLvls);
    if(!all.length) return;

    var maxN = all.reduce(function(m,o){ return Math.max(m, o.notional); }, 1);
    var h = Math.max(3, Math.min(22, Number(s.heightPx) || 7));
    var baseOp = Math.max(0.08, Math.min(0.85, Number(s.opacity) || 0.52));

    ctx.save();
    ctx.beginPath();
    ctx.rect(cfg.x0, cfg.y0, cfg.x1 - cfg.x0, Math.max(1, cfg.y1 - cfg.y0));
    ctx.clip();

    all.forEach(function(z){
      var y = cfg.y(z.price);
      if(!Number.isFinite(y) || y < cfg.y0 - 30 || y > cfg.y1 + 30) return;
      var strength = Math.max(0.08, Math.min(1, z.notional / maxN));
      var widthRatio = 0.20 + strength * 0.80;
      var xStart = cfg.x1 - (cfg.x1 - cfg.x0) * widthRatio;
      var alpha = baseOp * (0.20 + strength * 0.80);
      var col = z.isBid ? "16,223,119" : "255,74,97";

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(" + col + ",1)";
      ctx.fillRect(xStart, y - h / 2, cfg.x1 - xStart, h);

      ctx.globalAlpha = Math.min(0.92, alpha + 0.18);
      ctx.strokeStyle = "rgba(" + col + ",1)";
      ctx.lineWidth = strength > .72 ? 1.5 : 1;
      if(s.glow && strength > .70){
        ctx.shadowColor = "rgba(" + col + ",.65)";
        ctx.shadowBlur = 8;
      }else{
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(cfg.x1, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if(s.labels && strength > .40){
        ctx.globalAlpha = Math.min(0.95, alpha + .32);
        ctx.font = (strength > .70 ? "900 " : "780 ") + "9px system-ui";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = z.isBid ? "#10df77" : "#ff4a61";
        ctx.fillText((z.isBid ? "B " : "A ") + fmtPrice(z.price), cfg.x1 - 4, y - h / 2 - 5);
      }
    });

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  window.DVLOrderBookImbalanceZonesDraw = draw;
  window.DVLBookmapZonesDraw = draw;

  function statePill(){
    var pill = document.getElementById("dvlBookmapState");
    if(!pill) return;
    pill.textContent = s.on ? "ON" : "OFF";
    pill.classList.toggle("is-on", !!s.on);
  }

  function insertRow(){
    var menu = document.getElementById("indicatorDropdown");
    if(!menu || document.getElementById("dvlBookmapItem")) return;

    var row = document.createElement("div");
    row.id = "dvlBookmapItem";
    row.className = "indicatorItem dvl-bmz-indicator-item is-live";
    row.innerHTML =
      '<span class="indicatorFxMark">BM</span>' +
      '<span><b>DVL Bookmap Zones</b><small>Order book heatmap</small></span>' +
      '<i class="dvl-bmz-state" id="dvlBookmapState"></i>';

    var first = menu.querySelector(".indicatorItem.is-soon");
    if(first) menu.insertBefore(row, first);
    else menu.appendChild(row);

    var pill = row.querySelector("#dvlBookmapState");
    if(pill){
      pill.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        setOn(!s.on);
      });
    }
    row.addEventListener("click", function(ev){
      if(pill && pill.contains(ev.target)) return;
      ev.stopPropagation();
      openPanel();
    });

    statePill();
  }

  function setOn(v){
    s.on = !!v;
    save();
    if(s.on) connect();
    else disconnect();
    statePill();
    renderPanel();
    ds();
  }

  function ensurePanel(){
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "dvlBookmapPanel";
    panel.className = "dvl-bmz-panel";
    panel.innerHTML =
      '<div class="dvl-bmz-head">' +
        '<div class="dvl-bmz-title"><b>DVL Bookmap Zones</b><small>Order book heatmap · Binance</small></div>' +
        '<button class="dvl-bmz-close" id="dvlBookmapClose" type="button">×</button>' +
      '</div>' +
      '<div class="dvl-bmz-body" id="dvlBookmapBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", function(ev){ ev.stopPropagation(); }, true);
    panel.querySelector("#dvlBookmapClose").addEventListener("click", function(){ panel.classList.remove("is-open"); });
    return panel;
  }

  function closeIndicators(){
    try{ if(typeof closeIndicatorsDropdown === "function") closeIndicatorsDropdown(); }catch(_){}
    try{ document.documentElement.classList.remove("dvl1b-ind-open"); }catch(_){}
    var b = document.getElementById("dvl1b_indBtn");
    if(b) b.classList.remove("dvl1b-open");
  }

  function openPanel(){
    closeIndicators();
    ensurePanel();
    renderPanel();
    panel.classList.add("is-open");
  }

  function btn(label, cls, attrs){
    return '<button class="' + cls + '" type="button" ' + (attrs || "") + '>' + label + '</button>';
  }

  function choice(name, value, label){
    var active = String(s[name]) === String(value);
    return btn(label, "dvl-bmz-choice" + (active ? " is-active" : ""), 'data-bmz-set="' + name + '" data-bmz-value="' + value + '"');
  }

  function toggle(name){
    return btn(s[name] ? "ON" : "OFF", "dvl-bmz-toggle" + (s[name] ? " is-on" : ""), 'data-bmz-toggle="' + name + '"');
  }

  function step(name, min, max, step, suffix){
    var val = Number(s[name]);
    return '<div class="dvl-bmz-step" data-bmz-step="' + name + '" data-min="' + min + '" data-max="' + max + '" data-step="' + step + '">' +
      '<button type="button" data-dir="-1">−</button><span>' + val + (suffix || "") + '</span><button type="button" data-dir="1">+</button>' +
    '</div>';
  }

  function field(lbl, html, full){
    return '<div class="dvl-bmz-field' + (full ? " full" : "") + '"><label>' + lbl + '</label>' + html + '</div>';
  }

  function renderPanel(){
    if(!panel) return;
    var body = panel.querySelector("#dvlBookmapBody");
    if(!body) return;
    body.innerHTML =
      '<div class="dvl-bmz-section"><div class="dvl-bmz-section-title">Geral</div><div class="dvl-bmz-grid">' +
        field("Indicador", toggle("on")) +
        field("Fonte", '<div class="dvl-bmz-choice-row">' + choice("source","futures","Futures") + choice("source","spot","Spot") + '</div>') +
        field("Depth", '<div class="dvl-bmz-choice-row three">' + choice("depth",20,"20") + choice("depth",100,"100") + choice("depth",500,"500") + '</div>') +
        field("Sensibilidade", '<div class="dvl-bmz-choice-row three">' + choice("sensitivity","low","Baixa") + choice("sensitivity","medium","Média") + choice("sensitivity","high","Alta") + '</div>') +
      '</div></div>' +
      '<div class="dvl-bmz-section"><div class="dvl-bmz-section-title">Visual</div><div class="dvl-bmz-grid">' +
        field("Máx zonas", step("maxZones",2,24,1)) +
        field("Altura", step("heightPx",3,18,1,"px")) +
        field("Labels", toggle("labels")) +
        field("Glow", toggle("glow")) +
        field("ATR limiter", toggle("maxDistATR")) +
        field("Distância ATR", step("atrDistance",1,20,1,"x")) +
        field("Opacidade", step("opacity",0.15,0.85,0.05)) +
      '</div><div class="dvl-bmz-note">As zonas são desenhadas atrás dos candles. Verde = bids fortes; vermelho = asks fortes. Se a corretora/API bloquear, o app não trava.</div></div>';
  }

  document.addEventListener("click", function(ev){
    var t = ev.target;
    var setBtn = t.closest ? t.closest("[data-bmz-set]") : null;
    if(setBtn){
      ev.preventDefault();
      ev.stopPropagation();
      var key = setBtn.getAttribute("data-bmz-set");
      var val = setBtn.getAttribute("data-bmz-value");
      if(key === "depth") val = Number(val);
      s[key] = val;
      save();
      disconnect();
      if(s.on) connect();
      renderPanel();
      ds();
      return;
    }

    var tog = t.closest ? t.closest("[data-bmz-toggle]") : null;
    if(tog){
      ev.preventDefault();
      ev.stopPropagation();
      var k = tog.getAttribute("data-bmz-toggle");
      if(k === "on") setOn(!s.on);
      else{
        s[k] = !s[k];
        save();
        renderPanel();
        ds();
      }
      return;
    }

    var stepBox = t.closest ? t.closest("[data-bmz-step]") : null;
    if(stepBox && t.closest("[data-dir]")){
      ev.preventDefault();
      ev.stopPropagation();
      var name = stepBox.getAttribute("data-bmz-step");
      var dir = Number(t.closest("[data-dir]").getAttribute("data-dir"));
      var min = Number(stepBox.getAttribute("data-min"));
      var max = Number(stepBox.getAttribute("data-max"));
      var st = Number(stepBox.getAttribute("data-step"));
      var next = Number(s[name]) + dir * st;
      next = Math.max(min, Math.min(max, next));
      s[name] = Number(next.toFixed(3));
      save();
      renderPanel();
      ds();
      return;
    }
  }, true);

  function init(){
    insertRow();
    statePill();
    if(s.on) connect();
  }

  document.addEventListener("visibilitychange", function(){
    if(document.hidden) disconnect();
    else if(s.on) connect();
  });

  window.addEventListener("beforeunload", disconnect);

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();

  window.DVL_BOOKMAP_ZONES_0808 = {
    settings:s,
    connect:connect,
    disconnect:disconnect,
    openPanel:openPanel,
    setOn:setOn,
    draw:draw
  };
})();
