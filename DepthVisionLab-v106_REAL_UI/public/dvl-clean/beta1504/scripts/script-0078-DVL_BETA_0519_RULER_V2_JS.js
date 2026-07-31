(function(){
  "use strict";

  const STORAGE_KEY = "DVL_RULER_V2_ITEMS";
  let mode = false;
  let phase = "seekStart";
  let current = null;
  let draft = null;
  let rulers = load();
  let selected = null;
  let pointer = null;
  let drag = null;
  let layer = null;
  let svg = null;
  let ctxBar = null;
  let raf = 0;
  let prevActivate = null;

  function setInputLock(on){
    window.__dvlRulerV2InputLock = !!on;
    try{
      document.documentElement.classList.toggle("dvl-ruler-v2-active", !!on);
    }catch(_){}
  }

  function syncInputLock(){
    setInputLock(!!(mode || pointer || drag || selected != null));
  }

  function chartWrap(){
    return document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  }

  function clampLocal(v,a,b){
    return Math.max(a, Math.min(b, v));
  }

  function plotBounds(rect){
    const left = typeof PL === "number" ? PL : 0;
    const top = typeof PT === "number" ? PT : 0;
    const rp = typeof RP === "function" ? RP() : 55;
    const bottom = typeof PB === "number" ? PB : 24;
    return {
      left,
      top,
      right:Math.max(left + 1, rect.width - rp),
      bottom:Math.max(top + 1, rect.height - bottom),
      W:rect.width,
      H:rect.height
    };
  }

  function visibleScale(H){
    try{
      if(typeof scale === "function" && typeof visible === "function"){
        return scale(visible().cs, H);
      }
    }catch(_){}
    return { lo:0, hi:1, y:function(v){ return H/2; } };
  }

  function pointFromClient(clientX, clientY, useMagnet = true){
    try{
      if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromClient === "function"){
        const p = window.DVL_TOOL_POINT_MODEL.pointFromClient(clientX, clientY, { tool:"ruler", clamp:true, snap:!!useMagnet });
        if(p) return { x:p.x, y:p.y, idx:p.idx ?? p.index, price:p.price, snapped:!!p.snapped, snapKind:p.snapKind };
      }
    }catch(_){}
    try{
      if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.pointFromClient === "function"){
        const p = window.DVL_CHART_MODEL.pointFromClient(clientX, clientY, { clamp:true, snap:!!useMagnet });
        if(p) return { x:p.x, y:p.y, idx:p.idx ?? p.index, price:p.price, snapped:!!p.snapped, snapKind:p.snapKind };
      }
    }catch(_){}
    const wrap = chartWrap();
    if(!wrap || !window.S || !S.view) return null;
    const rect = wrap.getBoundingClientRect();
    const b = plotBounds(rect);
    const x = clampLocal(clientX - rect.left, b.left, b.right);
    const y = clampLocal(clientY - rect.top, b.top, b.bottom);
    const idx = typeof idxFromX === "function" ? idxFromX(x, b.W) : 0;
    const sc = visibleScale(b.H);
    const price = typeof priceFromY === "function" ? priceFromY(y, b.H, sc) : 0;
    return useMagnet ? applyToolMagnet({ x, y, idx, price }) : { x, y, idx, price };
  }

  function pointFromLocal(x, y, useMagnet = true){
    try{
      if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === "function"){
        const p = window.DVL_TOOL_POINT_MODEL.pointFromLocal(x, y, { tool:"ruler", clamp:true, snap:!!useMagnet });
        if(p) return { x:p.x, y:p.y, idx:p.idx ?? p.index, price:p.price, snapped:!!p.snapped, snapKind:p.snapKind };
      }
    }catch(_){}
    try{
      if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.pointFromLocal === "function"){
        const p = window.DVL_CHART_MODEL.pointFromLocal(x, y, { clamp:true, snap:!!useMagnet });
        if(p) return { x:p.x, y:p.y, idx:p.idx ?? p.index, price:p.price, snapped:!!p.snapped, snapKind:p.snapKind };
      }
    }catch(_){}
    const wrap = chartWrap();
    if(!wrap || !window.S || !S.view) return null;
    const rect = wrap.getBoundingClientRect();
    const b = plotBounds(rect);
    x = clampLocal(x, b.left, b.right);
    y = clampLocal(y, b.top, b.bottom);
    const idx = typeof idxFromX === "function" ? idxFromX(x, b.W) : 0;
    const sc = visibleScale(b.H);
    const price = typeof priceFromY === "function" ? priceFromY(y, b.H, sc) : 0;
    return useMagnet ? applyToolMagnet({ x, y, idx, price }) : { x, y, idx, price };
  }

  function applyToolMagnet(p){
    try{
      if(window.DVL_TOOL_MAGNET && typeof window.DVL_TOOL_MAGNET.snapRulerPoint === "function"){
        const sp = window.DVL_TOOL_MAGNET.snapRulerPoint(p);
        if(sp && sp.snapped){
          return { x:sp.x, y:sp.y, idx:sp.idx, price:sp.price, snapped:true, snapKind:sp.snapKind };
        }
      }
    }catch(_){}
    return p;
  }

  function project(p){
    try{
      if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.toScreen === "function"){
        const sp = window.DVL_TOOL_POINT_MODEL.toScreen(p, { tool:"ruler" });
        if(sp){
          const cs = window.DVL_CHART_MODEL && window.DVL_CHART_MODEL.buildCoordinateSystem ? window.DVL_CHART_MODEL.buildCoordinateSystem() : null;
          if(cs) return { x:sp.x, y:sp.y, W:cs.W, H:cs.H, left:cs.left, right:cs.right, top:cs.top, bottom:cs.bottom };
        }
      }
    }catch(_){}
    try{
      if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.buildCoordinateSystem === "function"){
        const cs = window.DVL_CHART_MODEL.buildCoordinateSystem();
        if(cs && p){
          const x = cs.indexToX(Number(p.idx ?? p.index));
          const y = cs.priceToY(Number(p.price));
          return { x, y, W:cs.W, H:cs.H, left:cs.left, right:cs.right, top:cs.top, bottom:cs.bottom };
        }
      }
    }catch(_){}
    const wrap = chartWrap();
    if(!wrap || !p || !window.S || !S.view) return null;
    const rect = wrap.getBoundingClientRect();
    const b = plotBounds(rect);
    const span = Math.max(0.35, S.view.end - S.view.start);
    let cw = b.right - b.left;
    try{ if(typeof CW === "function") cw = CW(b.W); }catch(_){}
    const x = b.left + (Number(p.idx) - S.view.start + 0.5) * cw / span;
    const sc = visibleScale(b.H);
    const y = sc.y(Number(p.price));
    return { x, y, W:b.W, H:b.H, left:b.left, right:b.right, top:b.top, bottom:b.bottom };
  }

  function save(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(rulers)); }catch(_){}
  }

  function load(){
    try{
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(r => r && r.p1 && r.p2) : [];
    }catch(_){
      return [];
    }
  }

  function clearLegacyRuler(){
    try{
      if(window.S){
        S._rulers = [];
        S._rulerNew = null;
        S._rulerSelected = null;
        if(S.tool === "ruler") S.tool = null;
      }
    }catch(_){}
    try{
      const old = document.getElementById("dvlRulerCtxBar");
      if(old) old.classList.remove("is-open");
    }catch(_){}
  }

  function ensureLayer(){
    const wrap = chartWrap();
    if(!wrap) return null;
    if(getComputedStyle(wrap).position === "static") wrap.style.position = "relative";

    if(!layer){
      layer = document.createElement("div");
      layer.id = "dvlRulerV2Layer";
      layer.className = "dvl-ruler-v2-layer";
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "dvl-ruler-v2-svg");
      layer.appendChild(svg);
      wrap.appendChild(layer);
    }

    if(!ctxBar){
      ctxBar = document.createElement("div");
      ctxBar.id = "dvlRulerV2CtxBar";
      ctxBar.className = "dvlDrawCtxBar dvlRulerV2CtxBar";
      ctxBar.innerHTML = '<button id="dvlRulerV2Gear" type="button" aria-label="Ruler settings"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button><button id="dvlRulerV2Delete" class="dvlRulerV2Delete" type="button" aria-label="Delete ruler"></button>';
      wrap.appendChild(ctxBar);
      ctxBar.addEventListener("pointerdown", function(ev){
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }, true);

      const del = ctxBar.querySelector("#dvlRulerV2Delete");
      if(del){
        del.addEventListener("click", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          if(selected != null && rulers[selected]){
            rulers.splice(selected, 1);
            selected = null;
            save();
            render();
            syncInputLock();
          }
        });
      }

      const gear = ctxBar.querySelector("#dvlRulerV2Gear");
      if(gear){
        gear.addEventListener("click", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          gear.classList.toggle("is-active");
          try{
            if(typeof setChartSettings === "function") setChartSettings(true);
            else if(window.setChartSettings) window.setChartSettings(true);
          }catch(_){}
        });
      }
    }

    return layer;
  }

  function syncCtx(){
    ensureLayer();
    if(ctxBar) ctxBar.classList.toggle("is-open", selected != null && !!rulers[selected] && !mode);
  }

  function svgEl(name, attrs){
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
  }

  function lineDistance(px, py, ax, ay, bx, by){
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx*dx + dy*dy;
    if(l2 <= 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax)*dx + (py - ay)*dy) / l2;
    t = clampLocal(t, 0, 1);
    return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
  }

  function hitTest(point){
    if(!point) return null;
    for(let i = rulers.length - 1; i >= 0; i--){
      const r = rulers[i];
      const a = project(r.p1);
      const b = project(r.p2);
      if(!a || !b) continue;
      if(Math.hypot(point.x - a.x, point.y - a.y) <= 16) return { index:i, part:"p1" };
      if(Math.hypot(point.x - b.x, point.y - b.y) <= 16) return { index:i, part:"p2" };
      if(lineDistance(point.x, point.y, a.x, a.y, b.x, b.y) <= 13) return { index:i, part:"body" };
    }
    return null;
  }

  function drawOne(r, isSelected, isDraft){
    const a = project(r.p1);
    const b = project(r.p2);
    if(!a || !b || !svg) return;

    const up = b.y < a.y;
    const group = svgEl("g", { "class": `${isSelected ? "dvl-ruler-v2-selected" : ""}`.trim() });
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.max(1, Math.abs(b.x - a.x));
    const h = Math.max(1, Math.abs(b.y - a.y));

    group.appendChild(svgEl("rect", {
      x, y, width:w, height:h,
      rx:4,
      "class": up ? "dvl-ruler-v2-band-up" : "dvl-ruler-v2-band-down",
      opacity: isDraft ? ".72" : "1"
    }));

    group.appendChild(svgEl("line", { x1:a.x, y1:a.top, x2:a.x, y2:a.bottom, "class":"dvl-ruler-v2-guide", opacity:isDraft?".55":".42" }));
    group.appendChild(svgEl("line", { x1:b.x, y1:b.top, x2:b.x, y2:b.bottom, "class":"dvl-ruler-v2-guide", opacity:isDraft?".65":".48" }));
    group.appendChild(svgEl("line", { x1:a.x, y1:a.y, x2:b.x, y2:b.y, "class": up ? "dvl-ruler-v2-line-up" : "dvl-ruler-v2-line-down", opacity:isDraft?".75":".94" }));

    // Beta 0.965 — label persistente do Ruler.
    // Mantém drawings da 0.958 intactos; só não deixa o label sumir ao clicar fora.
    if(true){
      /* % = variação real sobre o preço inicial. NÃO usar Math.max(...,1) no
         denominador: isso travava a conta em ativos abaixo de $1 (quase toda
         cripto de MEXC — AIOT 0.037, ZBT 0.097…), dividindo por 1 em vez do
         preço, então a % saía ~0 e arredondava pra 0.00%. Guarda só contra
         preço exatamente 0. */
      const p1p = Math.abs(Number(r.p1.price));
      const pct = p1p > 1e-12 ? ((Number(r.p2.price) - Number(r.p1.price)) / p1p) * 100 : 0;
      const candles = Math.abs(Math.round(Number(r.p2.idx) - Number(r.p1.idx)));
      const pctLabel = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      const barsLabel = `${candles} bars`;

      /*
        Label rule:
        - show only for selected/draft ruler;
        - keep inside the visible part of the ruler body;
        - never clamp a hidden/off-screen ruler label into the chart corner.
      */
      const boxLeft = Math.min(a.x, b.x);
      const boxRight = Math.max(a.x, b.x);
      const boxTop = Math.min(a.y, b.y);
      const boxBottom = Math.max(a.y, b.y);
      const visibleLeft = Math.max(boxLeft, a.left + 2);
      const visibleRight = Math.min(boxRight, a.right - 2);
      const visibleTop = Math.max(boxTop, a.top + 2);
      const visibleBottom = Math.min(boxBottom, a.bottom - 2);

      if(visibleRight - visibleLeft >= 44 && visibleBottom - visibleTop >= 20){
        const lx = (visibleLeft + visibleRight) / 2;
        const ly = (visibleTop + visibleBottom) / 2;

        group.appendChild(svgEl("rect", { x:lx - 34, y:ly - 16, width:68, height:32, rx:8, "class":"dvl-ruler-v2-label-bg", opacity:isDraft?".74":"1" }));

        const tx1 = svgEl("text", { x:lx, y:ly - 5, "class":"dvl-ruler-v2-label-text dvl-ruler-v2-label-pct" });
        tx1.textContent = pctLabel;
        group.appendChild(tx1);

        const tx2 = svgEl("text", { x:lx, y:ly + 8, "class":"dvl-ruler-v2-label-text dvl-ruler-v2-label-bars" });
        tx2.textContent = barsLabel;
        group.appendChild(tx2);
      }
    }

    group.appendChild(svgEl("circle", { cx:a.x, cy:a.y, r:isSelected?5.2:4.6, "class":"dvl-ruler-v2-handle-start" }));
    group.appendChild(svgEl("circle", { cx:b.x, cy:b.y, r:isSelected?5.2:4.6, "class": up ? "dvl-ruler-v2-handle-end-up" : "dvl-ruler-v2-handle-end-down" }));

    svg.appendChild(group);
  }

  function render(){
    ensureLayer();
    clearLegacyRuler();
    if(!svg) return;

    const wrap = chartWrap();
    if(!wrap) return;
    const rect = wrap.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    svg.innerHTML = "";

    rulers.forEach((r, i) => drawOne(r, i === selected, false));

    if(draft && current){
      drawOne({ p1:draft.p1, p2:current }, true, true);
    }

    if(mode && current){
      const p = project(current);
      if(p){
        svg.appendChild(svgEl("line", { x1:p.x, y1:p.top, x2:p.x, y2:p.bottom, "class":"dvl-ruler-v2-cross-v" }));
        svg.appendChild(svgEl("line", { x1:p.left, y1:p.y, x2:p.right, y2:p.y, "class":"dvl-ruler-v2-cross-h" }));
        svg.appendChild(svgEl("circle", { cx:p.x, cy:p.y, r:4.2, "class":"dvl-ruler-v2-cross-dot" }));
      }
    }

    syncCtx();
  }

  function requestRender(){
    if(raf) return;
    raf = requestAnimationFrame(function(){
      raf = 0;
      render();
    });
  }

  function start(){
    ensureLayer();
    clearLegacyRuler();
    mode = true;
    syncInputLock();
    phase = "seekStart";
    draft = null;
    selected = null;

    const wrap = chartWrap();
    if(wrap){
      const r = wrap.getBoundingClientRect();
      current = pointFromClient(r.left + (r.width - (typeof RP === "function" ? RP() : 55)) / 2, r.top + r.height / 2);
    }

    try{
      if(typeof closeMobilePanel === "function") closeMobilePanel();
      if(typeof window.dvlCloseDrawToolsMenu === "function") window.dvlCloseDrawToolsMenu();
    }catch(_){}

    requestRender();
  }

  function cancel(){
    mode = false;
    phase = "seekStart";
    draft = null;
    pointer = null;
    drag = null;
    syncInputLock();
    requestRender();
  }

  function confirmPoint(){
    if(!current) return;

    if(phase === "seekStart"){
      draft = { p1:{ idx:current.idx, price:current.price } };
      phase = "seekEnd";
      requestRender();
      return;
    }

    if(phase === "seekEnd" && draft){
      const p2 = { idx:current.idx, price:current.price };
      if(Math.abs(p2.idx - draft.p1.idx) < 0.05 && Math.abs(p2.price - draft.p1.price) < Math.abs(draft.p1.price) * 0.00001){
        p2.idx = draft.p1.idx + 1;
      }
      rulers.push({ p1:draft.p1, p2, createdAt:Date.now() });
      selected = rulers.length - 1;
      save();
      mode = false;
      phase = "seekStart";
      draft = null;
      syncInputLock();
      requestRender();
    }
  }

  function isInChartTarget(target){
    const wrap = chartWrap();
    return !!(wrap && target && wrap.contains(target));
  }

  function isControlTarget(target){
    return !!(target && target.closest && target.closest(".dvlRulerV2CtxBar,.assetToolsShell,.assetToolsMenu,.dvl-vt-panel,.indicatorDropdown,.dvl-custom-menu,.dvl-keypad,.dvl-color-palette"));
  }

  function block(ev){
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }

  function onPointerDown(ev){
    if(!ev.isPrimary && ev.pointerType !== "mouse") return;
    if(!isInChartTarget(ev.target) || isControlTarget(ev.target)) return;

    const p = pointFromClient(ev.clientX, ev.clientY, !!mode);
    if(!p) return;

    if(mode){
      setInputLock(true);
      try{
        if(ev.target && ev.target.setPointerCapture){
          ev.target.setPointerCapture(ev.pointerId);
        }
      }catch(_){}

      const wrap = chartWrap();
      const rect = wrap.getBoundingClientRect();
      const base = project(current) || p;
      pointer = {
        id:ev.pointerId,
        x:ev.clientX,
        y:ev.clientY,
        startLocalX:ev.clientX - rect.left,
        startLocalY:ev.clientY - rect.top,
        crossStartX:base.x,
        crossStartY:base.y,
        moved:false
      };
      requestRender();
      block(ev);
      return;
    }

    const hit = hitTest(p);
    if(hit){
      setInputLock(true);
      selected = hit.index;
      const r = rulers[hit.index];
      drag = {
        id:ev.pointerId,
        part:hit.part,
        index:hit.index,
        last:p,
        startX:ev.clientX,
        startY:ev.clientY,
        moved:false
      };
      syncCtx();
      requestRender();
      block(ev);
    }else if(selected != null){
      selected = null;
      syncCtx();
      syncInputLock();
      requestRender();
    }
  }

  function onPointerMove(ev){
    if(pointer && ev.pointerId === pointer.id && mode){
      const wrap = chartWrap();
      if(!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const localX = ev.clientX - rect.left;
      const localY = ev.clientY - rect.top;
      const nx = pointer.crossStartX + (localX - pointer.startLocalX);
      const ny = pointer.crossStartY + (localY - pointer.startLocalY);
      const p = pointFromLocal(nx, ny);
      if(!p) return;
      pointer.moved = pointer.moved || Math.hypot(ev.clientX - pointer.x, ev.clientY - pointer.y) > 7;
      current = p;
      requestRender();
      block(ev);
      return;
    }

    if(drag && ev.pointerId === drag.id){
      const p = pointFromClient(ev.clientX, ev.clientY, drag.part !== "body");
      const r = rulers[drag.index];
      if(!p || !r) return;
      drag.moved = true;

      if(drag.part === "p1"){
        r.p1 = { idx:p.idx, price:p.price };
      }else if(drag.part === "p2"){
        r.p2 = { idx:p.idx, price:p.price };
      }else{
        const di = p.idx - drag.last.idx;
        const dp = p.price - drag.last.price;
        r.p1 = { idx:r.p1.idx + di, price:r.p1.price + dp };
        r.p2 = { idx:r.p2.idx + di, price:r.p2.price + dp };
        drag.last = p;
      }

      save();
      requestRender();
      block(ev);
    }
  }

  function onPointerUp(ev){
    if(pointer && ev.pointerId === pointer.id && mode){
      const wasTap = !pointer.moved;
      pointer = null;

      if(wasTap){
        /* Tap confirms the current cross position. Do not force the ruler cross to jump under the finger. */
        confirmPoint();
      }else{
        requestRender();
      }

      syncInputLock();
      block(ev);
      return;
    }

    if(drag && ev.pointerId === drag.id){
      drag = null;
      save();
      requestRender();
      syncInputLock();
      block(ev);
    }
  }

  function patchActivation(){
    prevActivate = window.__dvlActivateApprovedTool;
    window.__dvlActivateApprovedTool = function(id){
      if(id === "ruler"){
        start();
        return true;
      }

      if(mode) cancel();

      if(typeof prevActivate === "function"){
        return prevActivate.apply(this, arguments);
      }
      return false;
    };
  }

  function patchDraw(){
    try{
      if(typeof draw === "function" && !draw.__dvlRulerV2Patched){
        const oldDraw = draw;
        draw = function(){
          const r = oldDraw.apply(this, arguments);
          requestRender();
          return r;
        };
        draw.__dvlRulerV2Patched = true;
      }
    }catch(_){}

    try{
      if(typeof drawSoon === "function" && !drawSoon.__dvlRulerV2Patched){
        const oldDrawSoon = drawSoon;
        drawSoon = function(){
          const r = oldDrawSoon.apply(this, arguments);
          requestRender();
          return r;
        };
        drawSoon.__dvlRulerV2Patched = true;
      }
    }catch(_){}
  }

  function boot(){
    ensureLayer();
    clearLegacyRuler();
    patchActivation();
    patchDraw();

    document.addEventListener("pointerdown", onPointerDown, { capture:true, passive:false });
    document.addEventListener("pointermove", onPointerMove, { capture:true, passive:false });
    document.addEventListener("pointerup", onPointerUp, { capture:true, passive:false });
    document.addEventListener("pointercancel", onPointerUp, { capture:true, passive:false });

    window.addEventListener("resize", requestRender, { passive:true });

    /* Legacy ruler runtime was removed in 0.876; do not keep forcing a 350ms
       cleanup/render loop because it creates unnecessary mobile jank while dragging. */
    requestRender();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLRulerV2 = {
    version:"0.880",
    start,
    cancel,
    render,
    isPointerOverRuler:function(clientX, clientY){
      try{
        return !!hitTest(pointFromClient(clientX, clientY, false));
      }catch(_){
        return false;
      }
    },
    get mode(){ return mode; },
    get phase(){ return phase; },
    get rulers(){ return rulers.slice(); },
    clear:function(){
      rulers = [];
      selected = null;
      save();
      render();
      syncInputLock();
    }
  };
})();
