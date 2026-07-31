(function(){
  "use strict";

  /*
    DVL 0.494 Long/Short v2 — built from zero.
    It does NOT use S.drawings longpos/shortpos for interaction.
    It uses its own overlay layer above the chart, so the chart canvas never receives
    pointer events while a Long/Short object is being placed or edited.
  */

  var positions = [];
  var mode = null;
  var selectedId = null;
  var drag = null;
  var lastKey = "";
  var renderQueued = false;
  var layer = null;
  var controlbar = null;
  var settings = null;
  var prevActivate = null;
  var lastRenderSignature = "";
  var runtimeUnsubs = [];

  var MIN_WIDTH = 72;
  var MAX_WIDTH = 240;
  var DEFAULT_WIDTH = 118;
  var DRAG_SENS = 1.00;

  function byId(id){ return document.getElementById(id); }
  function chartWrap(){ return byId("chartWrap") || document.querySelector(".canvasWrap"); }
  function priceScaleW(){
    try{ if(typeof RP === "function") return RP(); }catch(_){}
    try{ if(typeof PRICE_SCALE_W === "number") return PRICE_SCALE_W; }catch(_){}
    return 55;
  }
  function clampLocal(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function appSymbol(){
    try{ if(typeof symbol !== "undefined") return String(symbol || "BTCUSDT"); }catch(_){}
    try{ if(window.S && S.sym) return String(S.sym); }catch(_){}
    return "BTCUSDT";
  }
  function storageKey(){ return "dvl_ls_v2_" + appSymbol() + "_ALLTF"; }
  function uid(){ return Date.now() + Math.floor(Math.random() * 1000000); }
  function fmt(v){
    try{ if(typeof fmtPrice === "function") return fmtPrice(v); }catch(_){}
    return Number(v).toFixed(2);
  }
  function pctAbsFromEntry(entry, price){
    entry = Number(entry);
    price = Number(price);
    if(!Number.isFinite(entry) || !Number.isFinite(price) || entry === 0) return "0.00%";
    return Math.abs(((price - entry) / entry) * 100).toFixed(2) + "%";
  }
  function rrValue(pos){
    var entry = Number(pos.entry);
    var target = Number(pos.target);
    var stop = Number(pos.stop);
    var risk = Math.abs(entry - stop);
    var reward = Math.abs(target - entry);
    if(!Number.isFinite(risk) || risk <= 0 || !Number.isFinite(reward)) return "0.00";
    return (reward / risk).toFixed(2);
  }
  function compactDvlNumber(v, maxDigits){
    v = Number(v);
    if(!Number.isFinite(v)) v = 0;
    var abs = Math.abs(v);
    var suffix = "";
    if(abs >= 1000000){
      v = v / 1000000;
      suffix = "M";
    }else if(abs >= 1000){
      v = v / 1000;
      suffix = "K";
    }
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDigits || 2
    }) + suffix;
  }
  function money(v){
    v = Number(v);
    if(!Number.isFinite(v)) v = 0;
    var sign = v > 0 ? "+" : v < 0 ? "-" : "";
    return sign + compactDvlNumber(Math.abs(v), 2);
  }
  function num2(v){
    return compactDvlNumber(v, 2);
  }
  function qtyText(v){
    v = Number(v);
    if(!Number.isFinite(v)) v = 0;
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 4
    });
  }
  function lsQty(pos){
    var entry = Math.abs(Number(pos.entry));
    var qty = Number(pos.qty || pos.sizeQty || pos.contracts);
    if(Number.isFinite(qty) && qty > 0) return qty;

    var size = 0;
    try{
      if(window.S && Number.isFinite(Number(S.tradeSize))) size = Number(S.tradeSize);
      if(window.S && Number.isFinite(Number(S.orderSize))) size = Number(S.orderSize);
      if(window.S && Number.isFinite(Number(S.size))) size = Number(S.size);
      if(window.S && S.paper && Number.isFinite(Number(S.paper.size))) size = Number(S.paper.size);
    }catch(_){}

    var input = document.querySelector("#sizeInput,#tradeSizeInput,[data-size-input]");
    if(input && Number.isFinite(Number(String(input.value || input.textContent || "").replace(",", ".")))){
      size = Number(String(input.value || input.textContent || "").replace(",", "."));
    }

    if(!(size > 0)) size = 100;
    return entry > 0 ? size / entry : size;
  }
  function tvLabelData(pos){
    var entry = Number(pos.entry);
    var target = Number(pos.target);
    var stop = Number(pos.stop);
    var qty = lsQty(pos);
    var isLong = pos.type === "long";

    var tpPnl = (isLong ? (target - entry) : (entry - target)) * qty;
    var slPnl = (isLong ? (stop - entry) : (entry - stop)) * qty;
    var riskValue = Math.abs(slPnl);
    var tpNotional = Math.abs(target * qty);
    var slNotional = Math.abs(stop * qty);

    return {
      tp: money(tpPnl) + " (" + pctAbsFromEntry(entry, target) + ")<br>" + num2(tpNotional),
      entry: num2(riskValue) + " ~ " + qtyText(qty) + "<br>" + rrValue(pos),
      sl: money(slPnl) + " (" + pctAbsFromEntry(entry, stop) + ")<br>" + num2(slNotional)
    };
  }
  function getChartScale(){
    var wrap = chartWrap();
    if(!wrap || !window.S || !Array.isArray(S.candles) || !S.candles.length) return null;

    try{ if(typeof __dvlSyncLegacyState === "function") __dvlSyncLegacyState(); }catch(_){}

    var W = wrap.clientWidth || 1;
    var H = wrap.clientHeight || 1;
    var cs = null;

    try{
      if(typeof visible === "function" && typeof scale === "function"){
        var sc = scale(visible().cs, H);
        var span = Math.max(0.35, S.view.end - S.view.start);
        var left = typeof PL === "number" ? PL : 0;
        var rightPad = priceScaleW();
        var cw = Math.max(1, W - left - rightPad);
        var topPad = typeof PT === "number" ? PT : 4;
        var bottomPad = typeof PB === "number" ? PB : 24;
        cs = {
          W: W,
          H: H,
          left: left,
          right: W - rightPad,
          top: topPad,
          bottom: H - bottomPad,
          span: span,
          xI: function(i){ return left + (Number(i) - S.view.start + 0.5) * cw / span; },
          iX: function(x){ return S.view.start + (Number(x) - left) * span / cw - 0.5; },
          yP: function(p){ return sc.y(Number(p)); },
          pY: function(y){ return sc.lo + (1 - (Number(y) - topPad) / Math.max(H - topPad - bottomPad, 1)) * (sc.hi - sc.lo); },
          lo: sc.lo,
          hi: sc.hi
        };
      }
    }catch(_){}

    return cs;
  }
  function pointFromEvent(ev){
    var wrap = chartWrap();
    if(!wrap) return null;
    var r = wrap.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function pointToChart(p){
    var cs = getChartScale();
    if(!cs) return null;
    return {
      index: cs.iX(clampLocal(p.x, cs.left, cs.right)),
      price: cs.pY(clampLocal(p.y, cs.top, cs.bottom))
    };
  }
  function selected(){
    return positions.find(function(p){ return p.id === selectedId; }) || null;
  }
  function save(){
    try{
      localStorage.setItem(storageKey(), JSON.stringify(positions));
    }catch(_){}
  }
  function load(){
    var key = storageKey();
    lastKey = key;
    lastRenderSignature = "";
    try{
      var arr = JSON.parse(localStorage.getItem(key) || "[]");
      positions = Array.isArray(arr) ? arr.filter(valid).map(normalize) : [];
    }catch(_){
      positions = [];
    }
    selectedId = null;
    render();
  }
  function valid(p){
    return p && (p.type === "long" || p.type === "short") &&
      Number.isFinite(+p.x) &&
      Number.isFinite(+p.entry) &&
      Number.isFinite(+p.target) &&
      Number.isFinite(+p.stop);
  }
  function ensureStyleCfg(p){
    p.styleCfg = p.styleCfg || {};
    if(!p.styleCfg.profitColor) p.styleCfg.profitColor = "#18b08e";
    if(!p.styleCfg.entryColor) p.styleCfg.entryColor = "#117766";
    if(!p.styleCfg.lossColor) p.styleCfg.lossColor = "#ef4055";
    p.styleCfg.bgOpacity = clampLocal(Number(p.styleCfg.bgOpacity), 0.10, 1);
    if(!Number.isFinite(p.styleCfg.bgOpacity) || p.styleCfg.bgOpacity <= 0) p.styleCfg.bgOpacity = 0.70;
    return p.styleCfg;
  }
  function hexToRgba(hex, alpha){
    hex = String(hex || "").replace("#", "").trim();
    if(hex.length === 3){
      hex = hex.split("").map(function(ch){ return ch + ch; }).join("");
    }
    if(hex.length !== 6) return "rgba(17,119,102," + alpha + ")";
    var num = parseInt(hex, 16);
    var r = (num >> 16) & 255;
    var g = (num >> 8) & 255;
    var b = num & 255;
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }
  function normalize(p){
    p.x = +p.x;
    p.entry = +p.entry;
    p.target = +p.target;
    p.stop = +p.stop;
    p.width = clampLocal(Number(p.width) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
    p.visible = p.visible !== false;
    p.labels = p.labels !== false;
    ensureStyleCfg(p);
    return p;
  }
  function migrateLegacy(){
    if(!window.S || !Array.isArray(S.drawings)) return;
    var migrated = false;
    var next = [];

    S.drawings.forEach(function(d){
      if(d && (d.type === "longpos" || d.type === "shortpos")){
        positions.push(normalize({
          id: d.id || uid(),
          type: d.type === "longpos" ? "long" : "short",
          x: Number(d.x1) || 0,
          entry: Number(d.entry),
          target: Number(d.target),
          stop: Number(d.stop),
          width: Number(d.style && d.style.fixedPixelWidth) || DEFAULT_WIDTH,
          visible: d.visible !== false,
          labels: true,
          createdAt: d.createdAt || Date.now()
        }));
        migrated = true;
      }else{
        next.push(d);
      }
    });

    if(migrated){
      S.drawings = next;
      try{ window.__dvlSelectId && window.__dvlSelectId(null); }catch(_){}
      try{ window.__dvlSaveDrawings && window.__dvlSaveDrawings(); }catch(_){}
      save();
    }
  }
  function ensureLayer(){
    var wrap = chartWrap();
    if(!wrap) return null;

    if(getComputedStyle(wrap).position === "static"){
      wrap.style.position = "relative";
    }

    layer = byId("dvlLsLayer");
    if(!layer){
      layer = document.createElement("div");
      layer.id = "dvlLsLayer";
      layer.className = "dvl-ls-layer";
      wrap.appendChild(layer);
    }

    controlbar = byId("dvlLsControlbar");
    if(!controlbar){
      controlbar = document.createElement("div");
      controlbar.id = "dvlLsControlbar";
      controlbar.className = "dvl-ls-controlbar";
      controlbar.innerHTML =
        '<button type="button" id="dvlLsGear" aria-label="Settings">' +
          '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 0 1-4 0v-.06a1.7 1.7 0 0 0-1-.6a1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 0 1 0-4h.06a1.7 1.7 0 0 0 .6-1a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 0 1 4 0v.06a1.7 1.7 0 0 0 1 .6a1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 9c.23.31.43.65.6 1H20a2 2 0 0 1 0 4h-.06a1.7 1.7 0 0 0-.6 1Z"/></svg>' +
        '</button>' +
        '<button type="button" id="dvlLsRemove" class="dvl-ls-remove" aria-label="Remove"><svg viewBox="0 0 24 24"></svg></button>';
      wrap.appendChild(controlbar);

      controlbar.addEventListener("pointerdown", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }, {capture:true, passive:false});

      byId("dvlLsGear").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        toggleSettings();
      });

      byId("dvlLsRemove").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        removeSelected();
      });
    }

    settings = byId("dvlLsSettings");
    if(!settings){
      settings = document.createElement("div");
      settings.id = "dvlLsSettings";
      settings.className = "dvl-ls-settings";
      settings.innerHTML =
        '<div class="dvl-ls-settings-title">LONG / SHORT</div>' +
        '<div class="dvl-ls-setting-row">' +
          '<button type="button" id="dvlLsWidthMinus">−</button>' +
          '<button type="button" id="dvlLsWidthPlus">+</button>' +
        '</div>' +
        '<label class="dvl-ls-setting-check" for="dvlLsLabelsCheck">' +
          '<span>Labels</span>' +
          '<input type="checkbox" id="dvlLsLabelsCheck" checked />' +
        '</label>' +
        '<div class="dvl-ls-setting-label">Backgrounds</div>' +
        '<div class="dvl-ls-color-grid">' +
          '<button type="button" class="dvl-ls-color-btn" id="dvlLsProfitColorBtn"><span>TP BG</span><i id="dvlLsProfitColorSwatch"></i></button>' +
          '<button type="button" class="dvl-ls-color-btn" id="dvlLsEntryColorBtn"><span>ENTRY BG</span><i id="dvlLsEntryColorSwatch"></i></button>' +
          '<button type="button" class="dvl-ls-color-btn" id="dvlLsLossColorBtn"><span>SL BG</span><i id="dvlLsLossColorSwatch"></i></button>' +
        '</div>' +
        '<input type="color" id="dvlLsProfitColor" value="#18b08e" style="display:none" />' +
        '<input type="color" id="dvlLsEntryColor" value="#117766" style="display:none" />' +
        '<input type="color" id="dvlLsLossColor" value="#ef4055" style="display:none" />' +
        '<div class="dvl-ls-setting-label">Opacity</div>' +
        '<div class="dvl-ls-range-wrap">' +
          '<input type="range" class="dvl-ls-range" id="dvlLsBgOpacity" min="0.10" max="1" step="0.05" value="0.70" />' +
          '<span class="dvl-ls-range-val" id="dvlLsBgOpacityVal">70%</span>' +
        '</div>';
      wrap.appendChild(settings);

      settings.addEventListener("pointerdown", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }, {capture:true, passive:false});

      byId("dvlLsWidthMinus").addEventListener("click", function(){
        var p = selected();
        if(!p) return;
        p.width = clampLocal((Number(p.width) || DEFAULT_WIDTH) - 12, MIN_WIDTH, MAX_WIDTH);
        save();
        render();
      });

      byId("dvlLsWidthPlus").addEventListener("click", function(){
        var p = selected();
        if(!p) return;
        p.width = clampLocal((Number(p.width) || DEFAULT_WIDTH) + 12, MIN_WIDTH, MAX_WIDTH);
        save();
        render();
      });

      byId("dvlLsLabelsCheck").addEventListener("change", function(){
        var p = selected();
        if(!p) return;
        p.labels = !!this.checked;
        save();
        render();
      });

      function syncLsStyleInputs(){
        var p = selected();
        if(!p) return;
        var cfg = ensureStyleCfg(p);

        var profitColor = byId("dvlLsProfitColor");
        var entryColor = byId("dvlLsEntryColor");
        var lossColor = byId("dvlLsLossColor");
        var bgOpacity = byId("dvlLsBgOpacity");
        var bgOpacityVal = byId("dvlLsBgOpacityVal");
        var profitSwatch = byId("dvlLsProfitColorSwatch");
        var entrySwatch = byId("dvlLsEntryColorSwatch");
        var lossSwatch = byId("dvlLsLossColorSwatch");

        if(profitColor) profitColor.value = cfg.profitColor;
        if(entryColor) entryColor.value = cfg.entryColor;
        if(lossColor) lossColor.value = cfg.lossColor;
        if(bgOpacity) bgOpacity.value = String(cfg.bgOpacity);
        if(bgOpacityVal) bgOpacityVal.textContent = Math.round(cfg.bgOpacity * 100) + "%";
        if(profitSwatch) profitSwatch.style.background = cfg.profitColor;
        if(entrySwatch) entrySwatch.style.background = cfg.entryColor;
        if(lossSwatch) lossSwatch.style.background = cfg.lossColor;
      }

      byId("dvlLsProfitColorBtn").addEventListener("click", function(){ byId("dvlLsProfitColor").click(); });
      byId("dvlLsEntryColorBtn").addEventListener("click", function(){ byId("dvlLsEntryColor").click(); });
      byId("dvlLsLossColorBtn").addEventListener("click", function(){ byId("dvlLsLossColor").click(); });

      byId("dvlLsProfitColor").addEventListener("input", function(){
        var p = selected(); if(!p) return;
        ensureStyleCfg(p).profitColor = this.value;
        save(); render(); syncLsStyleInputs();
      });

      byId("dvlLsEntryColor").addEventListener("input", function(){
        var p = selected(); if(!p) return;
        ensureStyleCfg(p).entryColor = this.value;
        save(); render(); syncLsStyleInputs();
      });

      byId("dvlLsLossColor").addEventListener("input", function(){
        var p = selected(); if(!p) return;
        ensureStyleCfg(p).lossColor = this.value;
        save(); render(); syncLsStyleInputs();
      });

      byId("dvlLsBgOpacity").addEventListener("input", function(){
        var p = selected(); if(!p) return;
        ensureStyleCfg(p).bgOpacity = clampLocal(Number(this.value), 0.10, 1);
        var bgOpacityVal = byId("dvlLsBgOpacityVal");
        if(bgOpacityVal) bgOpacityVal.textContent = Math.round(ensureStyleCfg(p).bgOpacity * 100) + "%";
        save(); render();
      });
    }

    return layer;
  }
  function requestRender(){
    if(window.DVLRuntime && typeof window.DVLRuntime.invalidate === "function"){
      window.DVLRuntime.invalidate("long-short", render);
      return;
    }
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function(){
      renderQueued = false;
      render();
    });
  }
  function cssPx(v){ return Math.round(v * 10) / 10 + "px"; }
  function renderSignature(cs){
    var viewStart = "";
    var viewEnd = "";
    try{
      viewStart = Number(S && S.view && S.view.start);
      viewEnd = Number(S && S.view && S.view.end);
    }catch(_){}

    var posSig = positions.map(function(p){
      var cfg = ensureStyleCfg(p);
      return [
        p.id, p.type, p.x, p.entry, p.target, p.stop, p.width,
        p.visible !== false ? 1 : 0, p.labels !== false ? 1 : 0,
        cfg.profitColor, cfg.entryColor, cfg.lossColor, cfg.bgOpacity
      ].join(",");
    }).join(";");

    return [
      storageKey(), selectedId || "", mode || "",
      cs.W, cs.H, cs.left, cs.right, cs.top, cs.bottom,
      Number(cs.lo).toPrecision(12), Number(cs.hi).toPrecision(12),
      viewStart, viewEnd, posSig
    ].join("|");
  }
  function boxMetrics(pos, cs){
    var w = clampLocal(Number(pos.width) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
    var x = clampLocal(cs.xI(pos.x), cs.left, Math.max(cs.left, cs.right - w));
    var entryY = cs.yP(pos.entry);
    var tpY = cs.yP(pos.target);
    var slY = cs.yP(pos.stop);
    var top = Math.min(entryY, tpY, slY);
    var bottom = Math.max(entryY, tpY, slY);
    var h = Math.max(18, bottom - top);
    return {
      x: x,
      y: top,
      w: w,
      h: h,
      entryY: entryY - top,
      tpY: tpY - top,
      slY: slY - top,
      absEntryY: entryY,
      absTpY: tpY,
      absSlY: slY,
      midY: ((entryY + tpY + slY) / 3) - top
    };
  }
  function render(){
    var l = ensureLayer();
    if(!l) return;

    var key = storageKey();
    if(key !== lastKey){
      load();
      return;
    }

    var cs = getChartScale();
    if(!cs){
      if(l.childNodes.length) l.replaceChildren();
      lastRenderSignature = "";
      syncControls();
      return;
    }

    l.classList.toggle("is-placing", !!mode);
    positions = positions.filter(valid).map(normalize);

    var sig = renderSignature(cs);
    if(sig === lastRenderSignature){
      syncControls();
      return;
    }
    lastRenderSignature = sig;
    l.replaceChildren();

    positions.forEach(function(pos){
      if(pos.visible === false) return;
      var m = boxMetrics(pos, cs);
      var tv = tvLabelData(pos);
      var cfg = ensureStyleCfg(pos);

      if(m.x > cs.right + 80 || m.x + m.w < cs.left - 80 || m.y > cs.bottom + 80 || m.y + m.h < cs.top - 80){
        return;
      }

      var el = document.createElement("div");
      el.className = "dvl-ls-box" + (pos.id === selectedId ? " is-selected" : "") + (pos.labels === false ? " labels-off" : "") + " " + (pos.type === "long" ? "is-long" : "is-short");
      el.dataset.id = String(pos.id);
      el.style.left = cssPx(m.x);
      el.style.top = cssPx(m.y);
      el.style.width = cssPx(m.w);
      el.style.height = cssPx(m.h);

      var profitTop = Math.min(m.entryY, m.tpY);
      var profitH = Math.max(1, Math.abs(m.tpY - m.entryY));
      var lossTop = Math.min(m.entryY, m.slY);
      var lossH = Math.max(1, Math.abs(m.slY - m.entryY));

      el.innerHTML =
        '<div class="dvl-ls-zone dvl-ls-profit" style="top:'+cssPx(profitTop)+';height:'+cssPx(profitH)+';background:'+hexToRgba(cfg.profitColor, cfg.bgOpacity)+'"></div>' +
        '<div class="dvl-ls-zone dvl-ls-loss" style="top:'+cssPx(lossTop)+';height:'+cssPx(lossH)+';background:'+hexToRgba(cfg.lossColor, cfg.bgOpacity)+'"></div>' +
        '<div class="dvl-ls-line tp" style="top:'+cssPx(m.tpY)+'"></div>' +
        '<div class="dvl-ls-line entry" style="top:'+cssPx(m.entryY)+'"></div>' +
        '<div class="dvl-ls-line sl" style="top:'+cssPx(m.slY)+'"></div>' +
        '<div class="dvl-ls-tag tp" style="top:'+cssPx(m.tpY)+';background:'+hexToRgba(cfg.lossColor, cfg.bgOpacity)+'">'+tv.tp+'</div>' +
        '<div class="dvl-ls-tag entry" style="top:'+cssPx(m.entryY)+';background:'+hexToRgba(cfg.entryColor, cfg.bgOpacity)+'">'+tv.entry+'</div>' +
        '<div class="dvl-ls-tag sl" style="top:'+cssPx(m.slY)+';background:'+hexToRgba(cfg.profitColor, cfg.bgOpacity)+'">'+tv.sl+'</div>' +
        '<div class="dvl-ls-handle tp" data-handle="target" style="left:0;top:'+cssPx(m.tpY)+'"></div>' +
        '<div class="dvl-ls-handle entry" data-handle="entry" style="left:0;top:'+cssPx(m.entryY)+'"></div>' +
        '<div class="dvl-ls-handle sl" data-handle="stop" style="left:0;top:'+cssPx(m.slY)+'"></div>' +
        '<div class="dvl-ls-handle right" data-handle="width" style="left:'+cssPx(m.w)+';top:'+cssPx(m.midY)+'"></div>';

      l.appendChild(el);
    });

    syncControls();
  }
  function syncControls(){
    ensureLayer();
    var p = selected();
    var open = !!p;
    if(controlbar) controlbar.classList.toggle("is-open", open);
    if(!open && settings) settings.classList.remove("is-open");
    var labelsCheck = byId("dvlLsLabelsCheck");
    if(labelsCheck && p) labelsCheck.checked = p.labels !== false;
    try{
      if(open && typeof syncLsStyleInputs === "function") syncLsStyleInputs();
    }catch(_){}
  }
  function toggleSettings(){
    ensureLayer();
    if(!selected()) return;
    settings.classList.toggle("is-open");
  }
  function removeSelected(){
    if(!selectedId) return;
    positions = positions.filter(function(p){ return p.id !== selectedId; });
    selectedId = null;
    save();
    render();
  }
  function createPosition(type, point){
    var chartPoint = pointToChart(point);
    var cs = getChartScale();
    if(!chartPoint || !cs) return;

    var price = chartPoint.price;
    var risk = Math.max(Math.abs(price) * 0.002, Math.abs(cs.hi - cs.lo) * 0.035, 1);
    var isLong = type === "long";

    var maxCreateX = cs.iX(Math.max(cs.left, cs.right - DEFAULT_WIDTH));
    var minCreateX = cs.iX(cs.left);

    var pos = normalize({
      id: uid(),
      type: isLong ? "long" : "short",
      x: clampLocal(chartPoint.index, minCreateX, maxCreateX),
      entry: price,
      target: isLong ? price + risk : price - risk,
      stop: isLong ? price - risk : price + risk,
      width: DEFAULT_WIDTH,
      visible: true,
      labels: true,
      createdAt: Date.now()
    });

    positions.push(pos);
    selectedId = pos.id;
    mode = null;
    if(window.S){
      S.drawingToolActive = false;
      S.tool = null;
      S._posDraft = null;
    }
    try{ if(typeof hideCrosshair === "function") hideCrosshair(); }catch(_){}
    save();
    render();
  }
  function startMode(type){
    mode = type === "short" ? "short" : "long";
    selectedId = null;
    if(window.S){
      S.tool = null;
      S._posDraft = null;
      S.drawingToolActive = true;
    }
    try{
      if(typeof __dvlCenterLegacyCross === "function") __dvlCenterLegacyCross();
    }catch(_){}
    requestRender();
  }
  function cancelMode(){
    mode = null;
    if(window.S){
      S.drawingToolActive = false;
      S.tool = null;
      S._posDraft = null;
    }
    requestRender();
  }
  function startDrag(ev, pos, handle){
    if(!pos) return;
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    selectedId = pos.id;
    var p = pointFromEvent(ev);
    if(!p) return;

    drag = {
      pointerId: ev.pointerId,
      pos: pos,
      handle: handle || "body",
      startX: p.x,
      startY: p.y,
      orig: JSON.parse(JSON.stringify(pos))
    };

    try{
      if((handle || "body") === "entry"){
        document.querySelectorAll(".dvl-ls-entry-magnet").forEach(function(el){ el.classList.remove("is-active"); });
        var activeMagnet = ev.target && ev.target.closest ? ev.target.closest(".dvl-ls-entry-magnet") : null;
        if(activeMagnet) activeMagnet.classList.add("is-active");
      }
    }catch(_){}

    window.__dvlPositionDragActive = true;
    window.__dvlLongShortV2Dragging = true;

    try{ ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); }catch(_){}
    render();
  }
  function applyDrag(ev){
    if(!drag || drag.pointerId !== ev.pointerId) return;
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    var cs = getChartScale();
    var p = pointFromEvent(ev);
    if(!cs || !p) return;

    var pos = drag.pos;
    var orig = drag.orig;
    var dx = (p.x - drag.startX) * DRAG_SENS;
    var dp = (cs.pY(p.y) - cs.pY(drag.startY)) * DRAG_SENS;
    var di = (cs.iX(p.x) - cs.iX(drag.startX)) * DRAG_SENS;
    var minRisk = Math.max(Math.abs(orig.entry) * 0.0002, Math.abs(cs.hi - cs.lo) * 0.006, 0.01);

    if(drag.handle === "body"){
      var bodyWidth = clampLocal(Number(orig.width) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH);
      var minXIndex = cs.iX(cs.left);
      var maxXIndex = cs.iX(Math.max(cs.left, cs.right - bodyWidth));
      pos.x = clampLocal(orig.x + di, minXIndex, maxXIndex);
      pos.entry = orig.entry + dp;
      pos.target = orig.target + dp;
      pos.stop = orig.stop + dp;
    }else if(drag.handle === "width"){
      var currentXPixel = clampLocal(cs.xI(pos.x), cs.left, cs.right);
      var maxAllowedW = Math.max(MIN_WIDTH, cs.right - currentXPixel);
      pos.width = clampLocal(orig.width + dx, MIN_WIDTH, Math.min(MAX_WIDTH, maxAllowedW));
    }else if(drag.handle === "entry"){
      pos.entry = orig.entry + dp;
      normalizeDirection(pos, minRisk);
    }else if(drag.handle === "target"){
      pos.target = orig.target + dp;
      normalizeDirection(pos, minRisk);
    }else if(drag.handle === "stop"){
      pos.stop = orig.stop + dp;
      normalizeDirection(pos, minRisk);
    }

    requestRender();
  }
  function normalizeDirection(pos, minRisk){
    if(pos.type === "long"){
      if(pos.target <= pos.entry + minRisk) pos.target = pos.entry + minRisk;
      if(pos.stop >= pos.entry - minRisk) pos.stop = pos.entry - minRisk;
    }else{
      if(pos.target >= pos.entry - minRisk) pos.target = pos.entry - minRisk;
      if(pos.stop <= pos.entry + minRisk) pos.stop = pos.entry + minRisk;
    }
  }
  function endDrag(ev){
    if(!drag || drag.pointerId !== ev.pointerId) return;
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    drag = null;
    try{
      document.querySelectorAll(".dvl-ls-entry-magnet.is-active").forEach(function(el){ el.classList.remove("is-active"); });
    }catch(_){}
    window.__dvlPositionDragActive = false;
    window.__dvlLongShortV2Dragging = false;
    save();
    render();
  }
  function bindEvents(){
    ensureLayer();

    layer.addEventListener("pointerdown", function(ev){
      var target = ev.target;
      var handle = target && target.dataset ? target.dataset.handle : "";
      var box = target && target.closest ? target.closest(".dvl-ls-box") : null;

      if(box){
        var pos = positions.find(function(p){ return String(p.id) === String(box.dataset.id); });
        startDrag(ev, pos, handle || "body");
        return;
      }

      if(mode){
        createPosition(mode, pointFromEvent(ev));
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }
    }, {capture:true, passive:false});

    window.addEventListener("pointermove", function(ev){
      if(drag) applyDrag(ev);
    }, {capture:true, passive:false});

    window.addEventListener("pointerup", function(ev){
      if(drag) endDrag(ev);
    }, {capture:true, passive:false});

    window.addEventListener("pointercancel", function(ev){
      if(drag) endDrag(ev);
    }, {capture:true, passive:false});

    document.addEventListener("pointerdown", function(ev){
      if(drag) return;
      var wrap = chartWrap();
      if(!wrap || !wrap.contains(ev.target)) return;

      var t = ev.target;
      var keepSelected = !!(t && t.closest && t.closest(".dvl-ls-box,.dvl-ls-entry-magnet,.dvl-ls-controlbar,.dvl-ls-settings,.assetToolsShell,.assetToolsMenu"));
      if(keepSelected) return;

      if(mode) return;

      if(selectedId){
        selectedId = null;
        if(settings) settings.classList.remove("is-open");
        if(controlbar) controlbar.classList.remove("is-open");
        render();
      }
    }, true);

    document.addEventListener("keydown", function(ev){
      if(ev.key === "Escape"){
        if(mode) cancelMode();
        else if(selectedId){ selectedId = null; render(); }
      }
      if((ev.key === "Delete" || ev.key === "Backspace") && selectedId){
        removeSelected();
      }
    });
  }
  function patchActivation(){
    prevActivate = window.__dvlActivateApprovedTool;

    window.__dvlActivateApprovedTool = function(id){
      if(id === "long" || id === "short"){
        startMode(id);
        return true;
      }

      cancelMode();

      if(typeof prevActivate === "function"){
        return prevActivate.apply(this, arguments);
      }

      return false;
    };
  }
  function bindRuntimeLifecycle(){
    var rt = window.DVLRuntime;

    if(rt && typeof rt.installDrawBridge === "function"){
      rt.installDrawBridge();
      if(typeof rt.on === "function"){
        runtimeUnsubs.push(rt.on("chart:draw", requestRender));
        runtimeUnsubs.push(rt.on("layout:change", requestRender));
      }
    }else{
      try{
        if(typeof window.draw === "function" && !window.draw.__dvlLsV2DrawBridge){
          var oldDraw = window.draw;
          window.draw = function(){
            var result = oldDraw.apply(this, arguments);
            requestRender();
            return result;
          };
          window.draw.__dvlLsV2DrawBridge = true;
        }
      }catch(_){}
    }

    window.addEventListener("resize", requestRender, {passive:true});
    window.addEventListener("storage", function(ev){
      if(ev && ev.key === storageKey()) load();
    }, {passive:true});
  }
  function cleanOldRuntime(){
    if(window.S){
      S.tool = (S.tool === "long" || S.tool === "short") ? null : S.tool;
      S._posDraft = null;
    }
    var domLayer = byId("dvlPosDomLayer");
    if(domLayer) domLayer.remove();

    document.querySelectorAll(".assetToolsMenuHead small,.dvl-tool-hint,.dvl-drawing-hint,.toolHint,.drawHint").forEach(function(el){
      el.textContent = "";
      el.style.display = "none";
    });
  }
  function boot(){
    ensureLayer();
    cleanOldRuntime();
    load();
    migrateLegacy();
    patchActivation();
    bindRuntimeLifecycle();
    bindEvents();
    requestRender();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.__dvlLongShortV2 = {
    version: "0.505-event-driven",
    get mode(){ return mode; },
    get selectedId(){ return selectedId; },
    get positions(){ return positions.slice(); },
    deselect: function(){
      selectedId = null;
      if(settings) settings.classList.remove("is-open");
      if(controlbar) controlbar.classList.remove("is-open");
      render();
    },
    render: render,
    save: save,
    load: load,
    diagnostics: function(){
      return {
        storageKey: storageKey(),
        positions: positions.length,
        selectedId: selectedId,
        mode: mode,
        renderSignature: lastRenderSignature,
        runtime: !!window.DVLRuntime
      };
    }
  };
})();
