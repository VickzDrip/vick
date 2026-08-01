/* script-0292-DVL_HLINE_1574.js
   Linha horizontal (price line) que percorre o gráfico todo. Cada linha é um
   elemento DOM (data-dvl-ui, então o chart cede o toque — mesmo protocolo do
   FAB/Long-Short), posicionado a cada frame pelo hook window.DVLHLinesDraw
   chamado no render do script-0064. Config por linha: cor, traço
   (sólida/tracejada/pontilhada), opacidade e espessura. Arrastável na vertical.
   Persistência por símbolo em localStorage. */
(function(){
  "use strict";
  if(window.DVL_HLINES_1574) return;
  window.DVL_HLINES_1574 = true;

  const PALETTE = ["#00d4ff","#f5c542","#13dc8d","#ff4a61","#b06bff","#ff9f1c","#22d3ee","#e879f9","#ffffff","#8aa0b6"];
  const DASHES = [["solid","Sólida"],["dashed","Tracejada"],["dotted","Pontilhada"]];
  const DEF = { color:"#00d4ff", dash:"solid", width:1.5, opacity:0.95 };

  /* CSS */
  (function(){try{
    if(document.getElementById("DVL_HLINE_STYLE_1574")) return;
    const s=document.createElement("style"); s.id="DVL_HLINE_STYLE_1574";
    s.textContent=`
#dvlHLineFab{position:fixed;right:14px;bottom:160px;width:46px;height:46px;border-radius:14px;z-index:99996;display:none;align-items:center;justify-content:center;border:1px solid rgba(0,212,255,.55);background:linear-gradient(180deg,rgba(16,24,30,.96),rgba(10,16,20,.96));color:#00d4ff;box-shadow:0 5px 16px rgba(0,0,0,.45);cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;}
#dvlHLineFab.is-on{display:flex;}
#dvlHLineFab svg{display:block;pointer-events:none;}
.dvl-hl-line{position:fixed;height:18px;margin-top:-9px;z-index:56;cursor:ns-resize;touch-action:none;-webkit-tap-highlight-color:transparent;}
.dvl-hl-line>i{position:absolute;left:0;right:0;top:9px;height:0;display:block;}
.dvl-hl-line.is-active>i{filter:drop-shadow(0 0 3px currentColor);}
.dvl-hl-tag{position:fixed;z-index:57;transform:translateY(-50%);font:800 10px/1 system-ui;padding:2px 6px;border-radius:4px;color:#03140d;cursor:pointer;touch-action:none;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4);}
.dvl-hl-del{margin-left:5px;font-weight:900;opacity:.85;}
`;(document.head||document.documentElement).appendChild(s);
  }catch(_){}})();

  /* ---------- estado por símbolo ---------- */
  function symKey(sym){ return "dvl_hlines_" + (sym||"GLOBAL"); }
  let curSym = null;
  let state = { lines:[], def:Object.assign({}, DEF) };

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function validColor(c){ return /^#[0-9a-f]{6}$/i.test(String(c||"")); }
  function normLine(l){
    return {
      id: l && l.id ? l.id : (Date.now()+Math.floor(Math.random()*1e6)),
      price: Number(l && l.price)||0,
      color: validColor(l&&l.color) ? l.color : DEF.color,
      dash: ["solid","dashed","dotted"].includes(l&&l.dash) ? l.dash : "solid",
      width: clamp(Number(l&&l.width)||DEF.width, 0.5, 8),
      opacity: clamp(Number(l&&l.opacity)!=null?Number(l.opacity):DEF.opacity, 0.05, 1)
    };
  }
  function load(sym){
    let raw=null; try{ raw=JSON.parse(localStorage.getItem(symKey(sym))||"null"); }catch(_){}
    const lines = Array.isArray(raw&&raw.lines) ? raw.lines.map(normLine).filter(l=>l.price>0) : [];
    const def = Object.assign({}, DEF, (raw&&raw.def)||{});
    if(!validColor(def.color)) def.color=DEF.color;
    state = { lines, def:{ color:def.color, dash:["solid","dashed","dotted"].includes(def.dash)?def.dash:"solid", width:clamp(Number(def.width)||DEF.width,0.5,8), opacity:clamp(Number(def.opacity)!=null?Number(def.opacity):DEF.opacity,0.05,1) } };
  }
  function save(){ try{ localStorage.setItem(symKey(curSym), JSON.stringify(state)); }catch(_){} }
  function redraw(){ if(typeof drawSoon==="function") drawSoon(); }

  /* ---------- geometria ---------- */
  let lastCfg=null;
  function canvasEl(){ try{ return document.getElementById("chart")||document.querySelector("canvas"); }catch(_){ return null; } }
  function priceFromY(cfg, localY){
    const mn=+cfg.min, mx=+cfg.max, y0=+cfg.y0, y1=+cfg.y1;
    if(!(y1>y0)||!isFinite(mn)||!isFinite(mx)) return NaN;
    return mx - ((clamp(localY,y0,y1)-y0)/(y1-y0))*(mx-mn);
  }

  /* ---------- elementos DOM por linha ---------- */
  let els = {}; // id -> {line, tag, i}
  function ensureEls(l){
    if(els[l.id]) return els[l.id];
    const line=document.createElement("div"); line.className="dvl-hl-line"; line.setAttribute("data-dvl-ui","true"); line.dataset.id=l.id;
    const i=document.createElement("i"); line.appendChild(i);
    const tag=document.createElement("div"); tag.className="dvl-hl-tag"; tag.setAttribute("data-dvl-ui","true"); tag.dataset.id=l.id;
    document.body.appendChild(line); document.body.appendChild(tag);
    line.addEventListener("pointerdown", ev=>startDrag(ev, l.id), true);
    tag.addEventListener("pointerdown", ev=>{ ev.stopPropagation(); }, true);
    tag.addEventListener("click", ev=>{
      ev.preventDefault(); ev.stopPropagation();
      if(ev.target && ev.target.classList && ev.target.classList.contains("dvl-hl-del")){ removeLine(l.id); return; }
      openPanel(l.id);
    });
    return (els[l.id]={line, tag, i});
  }
  function removeEls(id){ const e=els[id]; if(e){ try{e.line.remove();e.tag.remove();}catch(_){} delete els[id]; } }
  function hideAll(){ Object.keys(els).forEach(id=>{ els[id].line.style.display="none"; els[id].tag.style.display="none"; }); }

  function fmt(p){ try{ if(typeof fmtPrice==="function") return fmtPrice(p); }catch(_){} return Number(p).toFixed(2); }

  /* ---------- hook de desenho (posiciona os DOM cada frame) ---------- */
  function draw(ctx, cfg){
    try{
      lastCfg = cfg;
      // troca de símbolo → persiste e recarrega
      const sym = cfg && cfg.symbol;
      if(sym !== curSym){ if(curSym!=null) save(); curSym = sym; load(sym); Object.keys(els).forEach(removeEls); }
      const cv = canvasEl();
      if(!cv || !cfg){ hideAll(); return; }
      const r = cv.getBoundingClientRect();
      const left = r.left + cfg.x0, wpx = Math.max(0, cfg.x1 - cfg.x0);
      // remove órfãos
      Object.keys(els).forEach(id=>{ if(!state.lines.some(l=>String(l.id)===String(id))) removeEls(id); });
      state.lines.forEach(l=>{
        const yy = cfg.y(l.price);
        const e = ensureEls(l);
        if(!(yy>=cfg.y0-2 && yy<=cfg.y1+2)){ e.line.style.display="none"; e.tag.style.display="none"; return; }
        const top = r.top + yy;
        e.line.style.left = left+"px"; e.line.style.top = top+"px"; e.line.style.width = wpx+"px"; e.line.style.display="block";
        e.i.style.color = l.color;
        e.i.style.borderTop = Math.max(0.5,l.width)+"px "+l.dash+" "+l.color;
        e.i.style.opacity = l.opacity;
        e.tag.style.left = (left+wpx+3)+"px"; e.tag.style.top = top+"px"; e.tag.style.background = l.color; e.tag.style.display="block";
        e.tag.innerHTML = fmt(l.price)+'<span class="dvl-hl-del" title="Remover">×</span>';
      });
    }catch(_){ hideAll(); }
  }

  /* ---------- arrastar (vertical) ---------- */
  let drag=null;
  function startDrag(ev, id){
    if(drag) return;
    if(ev.pointerType==="mouse" && ev.button!==0) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    drag = { id, pid:ev.pointerId };
    window.__dvlPositionDragActive = true;
    const e=els[id]; if(e){ try{e.line.setPointerCapture&&e.line.setPointerCapture(ev.pointerId);}catch(_){} e.line.classList.add("is-active"); }
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
  }
  function onMove(ev){
    if(!drag) return;
    if(ev.pointerType==="mouse" && typeof ev.buttons==="number" && ev.buttons===0){ onUp(); return; }
    ev.preventDefault(); ev.stopPropagation();
    const cfg=lastCfg, cv=canvasEl(); if(!cfg||!cv) return;
    const r=cv.getBoundingClientRect();
    const p = priceFromY(cfg, ev.clientY - r.top);
    if(!isFinite(p)) return;
    const l = state.lines.find(x=>String(x.id)===String(drag.id));
    if(l){ l.price = p; redraw(); }
  }
  function onUp(){
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onUp, true);
    window.__dvlPositionDragActive = false;
    if(drag){ const e=els[drag.id]; if(e) e.line.classList.remove("is-active"); drag=null; save(); }
  }
  window.addEventListener("blur", ()=>{ if(drag) onUp(); }, true);

  /* ---------- criar / remover ---------- */
  function addLine(){
    const cfg=lastCfg;
    const price = cfg && isFinite(cfg.min) && isFinite(cfg.max) ? (cfg.min+cfg.max)/2 : 0;
    const l = normLine(Object.assign({ price }, state.def));
    state.lines.push(l); save(); redraw();
    setTimeout(()=>openPanel(l.id), 60);
    toast("Linha adicionada — arraste para posicionar");
  }
  function removeLine(id){ state.lines = state.lines.filter(l=>String(l.id)!==String(id)); removeEls(id); if(panelId===id) closePanel(); save(); redraw(); }

  /* ---------- FAB ---------- */
  let fab=null;
  function ensureFab(){
    if(fab && document.body.contains(fab)) return;
    fab=document.createElement("div"); fab.id="dvlHLineFab"; fab.setAttribute("data-dvl-ui","true"); fab.title="Adicionar linha horizontal";
    fab.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><line x1="12" y1="6" x2="12" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="15" x2="12" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    document.body.appendChild(fab);
    fab.classList.add("is-on");
    fab.addEventListener("click", ev=>{ ev.preventDefault(); ev.stopPropagation(); addLine(); });
  }

  /* ---------- toast ---------- */
  let toastEl=null, toastT=0;
  function toast(msg){
    if(!toastEl){ toastEl=document.createElement("div"); toastEl.style.cssText="position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(6,16,22,.96);color:#dff;font:800 12px system-ui;padding:9px 15px;border-radius:10px;border:1px solid rgba(0,212,255,.5);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:100000;"; document.body.appendChild(toastEl); }
    toastEl.textContent=msg; toastEl.style.opacity="1"; toastEl.style.transform="translateX(-50%) translateY(0)";
    clearTimeout(toastT); toastT=setTimeout(()=>{ toastEl.style.opacity="0"; toastEl.style.transform="translateX(-50%) translateY(10px)"; }, 1700);
  }

  /* ---------- painel de settings ---------- */
  let panel=null, panelId=null;
  function ensurePanel(){
    if(panel) return panel;
    panel=document.createElement("div"); panel.id="dvlHLinePanel"; panel.className="dvl-vt-panel dvl-hl-panel"; panel.setAttribute("data-dvl-ui","true");
    panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>Linha horizontal</b><small>estilo · cor · opacidade</small></div>'+
      '<div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlHLClose" type="button">×</button></div></div>'+
      '<div class="dvl-vt-body" id="dvlHLBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev=>ev.stopPropagation(), true);
    panel.querySelector("#dvlHLClose").addEventListener("click", closePanel);
    return panel;
  }
  function openPanel(id){ ensurePanel(); panelId=id; panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); panelId=null; }
  function target(){ return panelId!=null ? state.lines.find(l=>String(l.id)===String(panelId)) : null; }

  function renderPanel(){
    ensurePanel();
    const l = target(); const body = panel.querySelector("#dvlHLBody");
    if(!l){ body.innerHTML='<div style="padding:10px;color:#9fb;">Linha removida.</div>'; return; }
    const dashOpts = DASHES.map(d=>'<option value="'+d[0]+'"'+(d[0]===l.dash?" selected":"")+'>'+d[1]+'</option>').join("");
    const swatches = PALETTE.map(c=>'<button type="button" class="dvl-hl-sw" data-c="'+c+'" style="width:22px;height:22px;border-radius:5px;border:2px solid '+(c===l.color?"#fff":"rgba(255,255,255,.25)")+';background:'+c+';cursor:pointer;"></button>').join("");
    body.innerHTML=
      '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Preço</span></div>'+
      '<div class="dvl-vt-grid"><div class="dvl-vt-field" style="grid-column:1/-1"><label>Preço</label>'+
      '<input class="dvl-vt-input" id="hlPrice" type="number" step="any" value="'+l.price+'"></div></div></div>'+
      '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Estilo</span></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:6px;padding:2px 2px 8px">'+swatches+'</div>'+
      '<div class="dvl-vt-grid">'+
        '<div class="dvl-vt-field"><label>Traço</label><select class="dvl-vt-select" id="hlDash">'+dashOpts+'</select></div>'+
        '<div class="dvl-vt-field"><label>Espessura</label><input class="dvl-vt-input" id="hlWidth" type="number" min="0.5" max="8" step="0.5" value="'+l.width+'"></div>'+
        '<div class="dvl-vt-field" style="grid-column:1/-1"><label>Opacidade <b id="hlOpV">'+Math.round(l.opacity*100)+'%</b></label>'+
        '<input id="hlOpacity" type="range" min="5" max="100" step="1" value="'+Math.round(l.opacity*100)+'" style="width:100%"></div>'+
      '</div></div>'+
      '<div class="dvl-vt-section"><div style="display:flex;gap:8px;padding:4px 2px">'+
        '<button type="button" class="dvl-vt-btn-ghost" id="hlDefault">Salvar como padrão</button>'+
        '<button type="button" class="dvl-vt-btn-ghost" id="hlDelete" style="color:#ff6b7d;border-color:rgba(255,90,110,.5)">Remover linha</button>'+
      '</div></div>';

    body.querySelectorAll(".dvl-hl-sw").forEach(b=>b.addEventListener("click",()=>{ l.color=b.dataset.c; save(); renderPanel(); redraw(); }));
    const bind=(id,fn)=>{ const e=body.querySelector("#"+id); if(e) e.addEventListener("input",fn); };
    bind("hlPrice", e=>{ const v=Number(e.target.value); if(isFinite(v)){ l.price=v; save(); redraw(); } });
    bind("hlDash", e=>{ l.dash=e.target.value; save(); redraw(); });
    bind("hlWidth", e=>{ l.width=clamp(Number(e.target.value)||1.5,0.5,8); save(); redraw(); });
    bind("hlOpacity", e=>{ l.opacity=clamp(Number(e.target.value)/100,0.05,1); const o=body.querySelector("#hlOpV"); if(o)o.textContent=Math.round(l.opacity*100)+"%"; save(); redraw(); });
    body.querySelector("#hlDefault").addEventListener("click",()=>{ state.def={color:l.color,dash:l.dash,width:l.width,opacity:l.opacity}; save(); toast("Padrão salvo para novas linhas"); });
    body.querySelector("#hlDelete").addEventListener("click",()=>removeLine(l.id));
  }

  /* ---------- boot ---------- */
  function boot(){ ensureFab(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.DVLHLinesDraw = draw;
  window.DVLHLines = { add:addLine, open:openPanel, count:()=>state.lines.length };
})();
