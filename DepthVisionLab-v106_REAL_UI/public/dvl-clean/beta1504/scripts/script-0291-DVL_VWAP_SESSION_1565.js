/* script-0291-DVL_VWAP_SESSION_1565.js
   VWAP Session — VWAP com reset por sessão (diária/semanal/mensal, UTC) traçado
   sobre o preço, com bandas de desvio-padrão opcionais (±1σ / ±2σ) e preenchimento.
   Segue o padrão do módulo de Moving Averages (script-0079): item no menu de
   indicadores, painel de settings dvl-vt-*, storage em localStorage e um hook de
   desenho window.DVLVwapSessionDraw chamado pelo render do chart (script-0064). */
(function(){
  "use strict";

  const KEY = "dvl_vwap_session_v1";
  const ANCHORS = [["daily","Diário"],["weekly","Semanal"],["monthly","Mensal"]];
  const STYLES = ["solid","dashed","dotted"];
  const PALETTE = ["#f5c542","#22d3ee","#a855f7","#ef4444","#34d399","#60a5fa","#f97316","#e879f9","#4ade80","#fb7185","#ffffff","#7f91a7"];
  const DEFAULTS = {
    on:false,
    anchor:"daily",
    color:"#f5c542", width:2, style:"solid",
    showLabel:true,
    bandsOn:false, band2On:false, mult1:1, mult2:2,
    bandColor:"#8aa0b6", fillOn:false
  };

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function normalize(s){
    const o = clone(DEFAULTS);
    if(s && typeof s === "object"){
      o.on = !!s.on;
      o.anchor = ["daily","weekly","monthly"].includes(s.anchor) ? s.anchor : "daily";
      o.color = /^#[0-9a-f]{6}$/i.test(String(s.color||"")) ? s.color : DEFAULTS.color;
      o.width = clamp(Number(s.width)||DEFAULTS.width, 1, 6);
      o.style = STYLES.includes(s.style) ? s.style : "solid";
      o.showLabel = s.showLabel !== false;
      o.bandsOn = !!s.bandsOn;
      o.band2On = !!s.band2On;
      o.mult1 = clamp(Number(s.mult1)||1, 0.1, 10);
      o.mult2 = clamp(Number(s.mult2)||2, 0.1, 10);
      o.bandColor = /^#[0-9a-f]{6}$/i.test(String(s.bandColor||"")) ? s.bandColor : DEFAULTS.bandColor;
      o.fillOn = !!s.fillOn;
    }
    return o;
  }
  function load(){ try{ return normalize(JSON.parse(localStorage.getItem(KEY)||"null")); }catch(_){ return clone(DEFAULTS); } }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){} updateItem(); redraw(); }
  function reset(){ state = clone(DEFAULTS); computed = null; save(); renderPanel(); }
  function redraw(){ if(typeof drawSoon === "function") drawSoon(); }

  let state = load();
  let panel = null, palette = null, paletteKey = null;

  /* ---------- fonte de candles (H+L+C)/3 + volume, com mirror leve ---------- */
  let src = {ref:null, len:0, rows:[]};
  function candles(){
    try{
      if(!Array.isArray(klines)) return [];
      const n = klines.length;
      if(src.ref!==klines || src.len!==n){
        const rows = new Array(n);
        for(let i=0;i<n;i++){
          const c = klines[i];
          const tp = (Number(c.high)+Number(c.low)+Number(c.close))/3;
          rows[i] = {tp:tp, v:Number(c.volume)||0, time:Number(c.time)};
        }
        src = {ref:klines, len:n, rows:rows};
      }else if(n){
        const c = klines[n-1], r = src.rows[n-1];
        const tp = (Number(c.high)+Number(c.low)+Number(c.close))/3, v = Number(c.volume)||0, t = Number(c.time);
        if(!r || r.tp!==tp || r.v!==v || r.time!==t) src.rows[n-1] = {tp:tp, v:v, time:t};
      }
      return src.rows;
    }catch(_){}
    return [];
  }

  /* ---------- id de sessão (UTC) ---------- */
  function sessionId(t, mode){
    const d = new Date(t);
    if(mode==="weekly"){
      const day = (d.getUTCDay()+6)%7; // Mon=0..Sun=6
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()-day);
    }
    if(mode==="monthly") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  /* ---------- cálculo VWAP + bandas (reset por sessão) ---------- */
  let computed = null; // {sig, vwap, sd}
  function compute(cs, mode){
    const n = cs.length;
    const vwap = new Array(n).fill(null);
    const sd   = new Array(n).fill(null);
    let cumV=0, cumPV=0, cumP2V=0, curId=null;
    for(let i=0;i<n;i++){
      const id = sessionId(cs[i].time, mode);
      if(id!==curId){ cumV=0; cumPV=0; cumP2V=0; curId=id; }
      const tp = cs[i].tp, v = cs[i].v;
      cumV += v; cumPV += tp*v; cumP2V += tp*tp*v;
      if(cumV>0){
        const vw = cumPV/cumV;
        vwap[i] = vw;
        sd[i] = Math.sqrt(Math.max(0, cumP2V/cumV - vw*vw));
      }
    }
    return {vwap, sd};
  }
  function series(cs){
    const n = cs.length;
    const last = n ? cs[n-1] : null;
    const sig = [state.anchor, n, last ? (last.time+"_"+last.tp+"_"+last.v) : "0"].join("|");
    if(!computed || computed.sig !== sig){
      const r = compute(cs, state.anchor);
      computed = {sig, vwap:r.vwap, sd:r.sd};
    }
    return computed;
  }

  /* ---------- desenho (hook chamado pelo render do chart) ---------- */
  function polyline(ctx, cfg, cs, valAt, start, end, leftLimit, rightLimit){
    ctx.beginPath();
    let down = false;
    for(let j=start;j<=end;j++){
      const v = valAt(j);
      if(v==null || !Number.isFinite(v)){ down=false; continue; }
      const local = j - cfg.win.start;
      const px = cfg.x(cfg.slotOffset + local);
      const py = cfg.y(v);
      if(px < leftLimit-20 || px > rightLimit+20 || py < cfg.y0-40 || py > cfg.y1+40){ down=false; continue; }
      if(!down){ ctx.moveTo(px, py); down=true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  function draw(ctx, cfg){
    try{
      if(!state.on || !cfg || !cfg.win) return;
      const cs = candles();
      if(!cs.length) return;
      const s = series(cs);
      const vwap = s.vwap, sd = s.sd;

      const start = Math.max(0, Math.floor(cfg.win.start) - 2);
      const end   = Math.min(cs.length - 1, Math.ceil(cfg.win.end) + 2);
      const rightLimit = cfg.x1 - 4, leftLimit = cfg.x0 + 2;

      ctx.save();
      ctx.lineJoin = "round"; ctx.lineCap = "round";

      // Preenchimento entre as bandas 1σ
      if(state.bandsOn && state.fillOn){
        const up = j => (vwap[j]!=null ? vwap[j] + state.mult1*sd[j] : null);
        const lo = j => (vwap[j]!=null ? vwap[j] - state.mult1*sd[j] : null);
        ctx.beginPath();
        let started = false, firstJ = -1, lastJ = -1;
        for(let j=start;j<=end;j++){
          const v = up(j); if(v==null) continue;
          const px = cfg.x(cfg.slotOffset + (j-cfg.win.start)), py = cfg.y(v);
          if(!started){ ctx.moveTo(px,py); started=true; firstJ=j; } else ctx.lineTo(px,py);
          lastJ = j;
        }
        if(started){
          for(let j=lastJ;j>=firstJ;j--){
            const v = lo(j); if(v==null) continue;
            const px = cfg.x(cfg.slotOffset + (j-cfg.win.start)), py = cfg.y(v);
            ctx.lineTo(px,py);
          }
          ctx.closePath();
          ctx.globalAlpha = 0.07; ctx.fillStyle = state.bandColor; ctx.fill(); ctx.globalAlpha = 1;
        }
      }

      // Bandas (linhas)
      if(state.bandsOn){
        ctx.strokeStyle = state.bandColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4,4]);
        polyline(ctx, cfg, cs, j => (vwap[j]!=null ? vwap[j]+state.mult1*sd[j] : null), start, end, leftLimit, rightLimit);
        polyline(ctx, cfg, cs, j => (vwap[j]!=null ? vwap[j]-state.mult1*sd[j] : null), start, end, leftLimit, rightLimit);
        if(state.band2On){
          ctx.globalAlpha = 0.7;
          polyline(ctx, cfg, cs, j => (vwap[j]!=null ? vwap[j]+state.mult2*sd[j] : null), start, end, leftLimit, rightLimit);
          polyline(ctx, cfg, cs, j => (vwap[j]!=null ? vwap[j]-state.mult2*sd[j] : null), start, end, leftLimit, rightLimit);
          ctx.globalAlpha = 1;
        }
        ctx.setLineDash([]);
      }

      // Linha VWAP principal
      ctx.strokeStyle = state.color;
      ctx.lineWidth = Math.max(1, Number(state.width)||2);
      if(state.style==="dashed") ctx.setLineDash([6,4]);
      else if(state.style==="dotted") ctx.setLineDash([2,3]);
      else ctx.setLineDash([]);
      polyline(ctx, cfg, cs, j => vwap[j], start, end, leftLimit, rightLimit);
      ctx.setLineDash([]);

      // Label no último valor visível
      if(state.showLabel){
        let li=-1, lv=null;
        for(let j=end;j>=start;j--){ if(vwap[j]!=null && Number.isFinite(vwap[j])){ li=j; lv=vwap[j]; break; } }
        if(li>=0){
          /* Beta 1.597 — registra a linha na ESCALA (pílula VWAP + preço, na cor),
             de-colidida junto das outras. O núcleo desenha na canaleta. */
          if(window.dvlRegisterScaleLabel) window.dvlRegisterScaleLabel({value:lv, color:state.color, label:"VWAP"});
          const py = cfg.y(lv);
          if(py>cfg.y0 && py<cfg.y1){
            const label = "VWAP";
            ctx.font = "900 8px system-ui";
            const tw = ctx.measureText(label).width;
            const lx = Math.max(leftLimit, rightLimit - tw - 7);
            ctx.fillStyle = "rgba(3,10,20,.72)";
            if(typeof roundRect === "function") roundRect(ctx, lx-3, py-7, tw+7, 14, 5, true, false, "rgba(3,10,20,.72)");
            else ctx.fillRect(lx-3, py-7, tw+7, 14);
            ctx.fillStyle = state.color;
            ctx.textBaseline = "middle";
            ctx.fillText(label, lx, py);
          }
        }
      }

      ctx.restore();
    }catch(_){}
  }

  /* ---------- item no menu de indicadores ---------- */
  function updateItem(){
    const st = document.getElementById("dvlVwapSessionState");
    if(st){ st.textContent = state.on ? "ON" : "OFF"; st.classList.toggle("is-on", !!state.on); }
  }
  // Coloca o item SEMPRE num ponto visível: logo após as Moving Averages
  // (topo da lista). Nunca no fim — o .indicatorDropdown tem overflow:hidden
  // sem scroll, então itens no fim ficam cortados fora da tela no mobile.
  function placeItem(menu, item){
    const ma = document.getElementById("dvlMovingAveragesItem");
    if(ma && ma.parentNode){
      if(ma.nextSibling !== item) ma.parentNode.insertBefore(item, ma.nextSibling);
      return;
    }
    const head = menu.querySelector(".indicatorDropHead");
    if(head && head.parentNode){
      if(head.nextSibling !== item) menu.insertBefore(item, head.nextSibling);
    } else if(menu.firstChild !== item){
      menu.insertBefore(item, menu.firstChild);
    }
  }
  function insertItem(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu) return;
    let item = document.getElementById("dvlVwapSessionItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlVwapSessionItem";
      item.className = "indicatorItem dvl-vwap-indicator-item";
      item.innerHTML =
        '<span class="indicatorFxMark">VW</span>' +
        '<span><b>VWAP Session</b><small>overlay · reset por sessão</small></span>' +
        '<i class="dvl-vt-state" id="dvlVwapSessionState">OFF</i>';
      const pill = item.querySelector("#dvlVwapSessionState");
      if(pill) pill.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); state.on = !state.on; save(); });
      item.addEventListener("click", ev => { ev.stopPropagation(); openPanel(); });
    }
    placeItem(menu, item); // insere ou re-encaixa ao lado das MAs
    updateItem();
  }

  /* ---------- painel de settings ---------- */
  function ensurePanel(){
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "dvlVwapSessionPanel";
    panel.className = "dvl-vt-panel dvl-vwap-panel";
    panel.setAttribute("data-dvl-ui","true");
    panel.innerHTML =
      '<div class="dvl-vt-head"><div class="dvl-vt-title"><b>VWAP Session</b><small>DVL overlay · reset por sessão</small></div>' +
      '<div class="dvl-vt-head-actions"><button class="dvl-vt-reset-icon" id="dvlVwapReset" type="button" aria-label="Reset">↻</button>' +
      '<button class="dvl-vt-close" id="dvlVwapClose" type="button">×</button></div></div>' +
      '<div class="dvl-vt-body" id="dvlVwapBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlVwapClose").addEventListener("click", closePanel);
    panel.querySelector("#dvlVwapReset").addEventListener("click", reset);
    return panel;
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }
  function opts(list, cur){ return list.map(v => '<option value="'+v+'"'+(String(v)===String(cur)?" selected":"")+'>'+v+'</option>').join(""); }
  function anchorOpts(cur){ return ANCHORS.map(a => '<option value="'+a[0]+'"'+(a[0]===cur?" selected":"")+'>'+a[1]+'</option>').join(""); }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlVwapBody");
    body.innerHTML =
      '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Geral</span></div>' +
      '<div class="dvl-vt-grid">' +
        '<div class="dvl-vt-field"><label>Indicador</label><label class="dvl-switch"><input id="vwOn" type="checkbox"'+(state.on?" checked":"")+'><i></i><b></b></label></div>' +
        '<div class="dvl-vt-field"><label>Sessão</label><select class="dvl-vt-select" id="vwAnchor">'+anchorOpts(state.anchor)+'</select></div>' +
        '<div class="dvl-vt-field"><label>Cor</label><button type="button" class="dvl-ma-color-btn" data-clr="color"><i style="background:'+state.color+'"></i></button></div>' +
        '<div class="dvl-vt-field"><label>Espessura</label><select class="dvl-vt-select" id="vwWidth">'+opts(["1","1.5","2","2.5","3","4"], String(state.width))+'</select></div>' +
        '<div class="dvl-vt-field"><label>Traço</label><select class="dvl-vt-select" id="vwStyle">'+opts(STYLES, state.style)+'</select></div>' +
        '<div class="dvl-vt-field"><label>Rótulo</label><label class="dvl-switch"><input id="vwLabel" type="checkbox"'+(state.showLabel?" checked":"")+'><i></i><b></b></label></div>' +
      '</div></div>' +
      '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Bandas de desvio (σ)</span></div>' +
      '<div class="dvl-vt-grid">' +
        '<div class="dvl-vt-field"><label>Bandas ±1σ</label><label class="dvl-switch"><input id="vwBands" type="checkbox"'+(state.bandsOn?" checked":"")+'><i></i><b></b></label></div>' +
        '<div class="dvl-vt-field"><label>Mult. 1</label><input class="dvl-vt-input" id="vwMult1" type="number" min="0.1" max="10" step="0.1" value="'+state.mult1+'"></div>' +
        '<div class="dvl-vt-field"><label>Bandas ±2σ</label><label class="dvl-switch"><input id="vwBands2" type="checkbox"'+(state.band2On?" checked":"")+'><i></i><b></b></label></div>' +
        '<div class="dvl-vt-field"><label>Mult. 2</label><input class="dvl-vt-input" id="vwMult2" type="number" min="0.1" max="10" step="0.1" value="'+state.mult2+'"></div>' +
        '<div class="dvl-vt-field"><label>Cor bandas</label><button type="button" class="dvl-ma-color-btn" data-clr="bandColor"><i style="background:'+state.bandColor+'"></i></button></div>' +
        '<div class="dvl-vt-field"><label>Preencher</label><label class="dvl-switch"><input id="vwFill" type="checkbox"'+(state.fillOn?" checked":"")+'><i></i><b></b></label></div>' +
      '</div></div>';

    const bind = (id, fn) => { const e = body.querySelector("#"+id); if(e) e.addEventListener("change", fn); };
    bind("vwOn", e => { state.on = !!e.target.checked; save(); });
    bind("vwAnchor", e => { state.anchor = e.target.value; computed = null; save(); });
    bind("vwWidth", e => { state.width = Number(e.target.value)||2; save(); });
    bind("vwStyle", e => { state.style = e.target.value; save(); });
    bind("vwLabel", e => { state.showLabel = !!e.target.checked; save(); });
    bind("vwBands", e => { state.bandsOn = !!e.target.checked; save(); });
    bind("vwBands2", e => { state.band2On = !!e.target.checked; save(); });
    bind("vwFill", e => { state.fillOn = !!e.target.checked; save(); });
    bind("vwMult1", e => { state.mult1 = clamp(Number(e.target.value)||1, 0.1, 10); save(); });
    bind("vwMult2", e => { state.mult2 = clamp(Number(e.target.value)||2, 0.1, 10); save(); });
    body.querySelectorAll(".dvl-ma-color-btn").forEach(b => b.addEventListener("click", ev => { ev.stopPropagation(); openPalette(b, b.dataset.clr); }));
    updateItem();
  }

  function openPalette(btn, key){
    closePalette();
    paletteKey = key;
    palette = document.createElement("div");
    palette.className = "dvl-ma-palette dvl-vwap-palette";
    palette.style.cssText = "position:fixed;z-index:100000;display:flex;flex-wrap:wrap;gap:6px;max-width:180px;padding:8px;border-radius:10px;background:rgba(14,10,26,.97);border:1px solid rgba(176,107,255,.4);box-shadow:0 8px 24px rgba(0,0,0,.5);";
    PALETTE.forEach(c => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.style.cssText = "width:20px;height:20px;border-radius:5px;border:1px solid rgba(255,255,255,.25);cursor:pointer;background:"+c+";";
      cell.addEventListener("click", () => { state[paletteKey] = c; save(); renderPanel(); closePalette(); });
      palette.appendChild(cell);
    });
    document.body.appendChild(palette);
    const r = btn.getBoundingClientRect();
    palette.style.left = Math.min(window.innerWidth-190, r.left) + "px";
    palette.style.top  = (r.bottom+6) + "px";
    setTimeout(() => document.addEventListener("pointerdown", outsidePalette, true), 0);
  }
  function outsidePalette(e){ if(palette && !palette.contains(e.target) && !(e.target.closest && e.target.closest(".dvl-ma-color-btn"))) closePalette(); }
  function closePalette(){ if(palette){ try{ palette.remove(); }catch(_){} palette=null; } document.removeEventListener("pointerdown", outsidePalette, true); }

  /* ---------- boot resiliente ---------- */
  function homed(){
    const item = document.getElementById("dvlVwapSessionItem");
    const ma = document.getElementById("dvlMovingAveragesItem");
    return !!(item && ma && item.previousSibling === ma);
  }
  function boot(){
    let tries = 0;
    (function attempt(){
      insertItem();
      if(homed()) return;                 // só para quando está do lado das MAs
      if(tries++ < 80) setTimeout(attempt, 250);   // ~20s
    })();
    try{
      const mo = new MutationObserver(() => { if(!homed()) insertItem(); });
      mo.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(() => { try{ mo.disconnect(); }catch(_){} }, 30000);
    }catch(_){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  /* Beta 1.626 — valores atuais (VWAP + bandas) para o DVL Alerts Hub
     (fonte "Cruzamentos"). Beta 1.628: o VWAP é calculado a partir dos candles
     (série pura, memoizada), independente de o overlay estar ligado. Assim os
     alertas de cruzamento continuam funcionando mesmo com o VWAP desligado. */
  function currentLevels(){
    try{
      const cs = candles(); if(!cs || !cs.length) return null;
      const s = series(cs);
      let vwap=null, sd=null;
      for(let j=cs.length-1;j>=0;j--){ if(s.vwap[j]!=null && Number.isFinite(s.vwap[j])){ vwap=s.vwap[j]; sd=s.sd[j]; break; } }
      if(vwap==null) return null;
      sd = Number.isFinite(sd)?sd:0;
      return {
        vwap:vwap,
        upper1: vwap + state.mult1*sd, lower1: vwap - state.mult1*sd,
        upper2: vwap + state.mult2*sd, lower2: vwap - state.mult2*sd,
        bandsOn: !!state.bandsOn, band2On: !!state.band2On
      };
    }catch(_){ return null; }
  }

  window.DVLVwapSessionDraw = draw;
  window.DVLVwapSession = {
    get state(){ return Object.assign({}, state); },
    on: () => !!state.on,
    setOn: v => { state.on = !!v; save(); },
    open: openPanel,
    openPanel: openPanel,
    levels: currentLevels,
    save: save, load: () => { state = load(); computed = null; updateItem(); redraw(); }
  };
})();
