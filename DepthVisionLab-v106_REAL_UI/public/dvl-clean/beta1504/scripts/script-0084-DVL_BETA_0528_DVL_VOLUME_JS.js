(function(){
  "use strict";

  const KEY = "dvl_volume_indicator_v1";
  const PALETTE = ["#10df77","#13dc8d","#2ee6a6","#a7f542","#f3c768","#ff9f43","#ff4a61","#ff3037","#ff6b8f","#b86cff","#ffffff","#c9f7de"];
  const DEFAULTS = {
    on:false,
    maOn:true,
    maLength:20,
    ma2On:true,
    maLength2:50,
    height:2.0,
    opacity:0.28,
    maOpacity:0.88,
    ma2Opacity:0.72,
    bullColor:"#10df77",
    bearColor:"#ff3037",
    maColor:"#10df77",
    ma2Color:"#f3c768",
    highlightOutsideVA:true,
    highVolumeMult:1.0,
    outsideVAColor:"#ffd321"
  };

  let state = load();
  let panel = null;
  let palette = null;
  let paletteTarget = null;

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function hexOk(v){ return /^#[0-9a-f]{6}$/i.test(String(v || "")); }
  function hexToRgb(h){
    h = String(h || "").replace("#","");
    if(h.length === 3) h = h.split("").map(x=>x+x).join("");
    const n = parseInt(h,16);
    if(!Number.isFinite(n)) return {r:24,g:215,b:255};
    return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
  }
  function rgba(hex, op){
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${clamp(Number(op)||0,0,1).toFixed(3)})`;
  }

  function normalize(s){
    const out = Object.assign(clone(DEFAULTS), s || {});
    out.on = out.on !== false;
    out.maOn = out.maOn !== false;
    out.maLength = clamp(parseInt(out.maLength,10)||20, 1, 2000);
    out.ma2On = out.ma2On !== false;
    out.maLength2 = clamp(parseInt(out.maLength2,10)||50, 1, 2000);
    out.height = clamp(Number(out.height)||DEFAULTS.height, 0.25, 5);
    out.opacity = clamp(Number(out.opacity)||DEFAULTS.opacity, .01, 1);
    out.maOpacity = clamp(Number(out.maOpacity)||DEFAULTS.maOpacity, .01, 1);
    out.ma2Opacity = clamp(Number(out.ma2Opacity)||DEFAULTS.ma2Opacity, .01, 1);
    out.bullColor = hexOk(out.bullColor) ? out.bullColor : DEFAULTS.bullColor;
    out.bearColor = hexOk(out.bearColor) ? out.bearColor : DEFAULTS.bearColor;
    out.maColor = hexOk(out.maColor) ? out.maColor : DEFAULTS.maColor;
    out.ma2Color = hexOk(out.ma2Color) ? out.ma2Color : DEFAULTS.ma2Color;
    out.highlightOutsideVA = out.highlightOutsideVA !== false;
    out.highVolumeMult = clamp(Number(out.highVolumeMult)||DEFAULTS.highVolumeMult, .50, 5);
    const legacyYellow = s && hexOk(s.spikeFlatColor) ? s.spikeFlatColor : null;
    out.outsideVAColor = hexOk(out.outsideVAColor) ? out.outsideVAColor : (legacyYellow || DEFAULTS.outsideVAColor);
    delete out.highlightSpikeFlat; delete out.spikeFlatColor;
    return out;
  }

  function load(){
    try{ return normalize(JSON.parse(localStorage.getItem(KEY) || "null")); }
    catch(_){ return clone(DEFAULTS); }
  }

  /* O scanner continua usando as MESMAS médias exibidas pelo DVL Volume.
     A nova coloração por Value Area é somente visual e não altera o motor do scanner. */
  let _maSyncT = null;
  function syncScannerMa(){
    clearTimeout(_maSyncT);
    _maSyncT = setTimeout(function(){
      try{
        const p1 = Math.max(1, Math.round(Number(state.maLength) || 20));
        const p2 = Math.max(1, Math.round(Number(state.maLength2) || 50));
        window.dispatchEvent(new CustomEvent("dvl:scanner-config-change", {
          detail: { engine: { maPeriod1: p1, maPeriod2: p2 } }
        }));
      }catch(_){}
    }, 400);
  }

  function save(){
    state = normalize(state);
    _outsideVACache = null;
    _volumeSeriesCache = null;
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){}
    updateItem();
    syncScannerMa();
    if(typeof drawSoon === "function") drawSoon();
    else if(typeof draw === "function") draw();
  }

  function reset(){
    state = clone(DEFAULTS);
    save();
    renderPanel();
  }

  function updateItem(){
    const st = document.getElementById("dvlVolState");
    if(st){
      st.textContent = state.on ? "ON" : "OFF";
      st.setAttribute("aria-label", state.on ? "DVL Volume ON" : "DVL Volume OFF");
      st.classList.toggle("is-on", !!state.on);
    }
  }

  function insertItem(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu || document.getElementById("dvlVolumeItem")) return;

    const item = document.createElement("div");
    item.id = "dvlVolumeItem";
    item.className = "indicatorItem dvl-vol-indicator-item";
    item.innerHTML = `
      <span class="indicatorFxMark">VOL</span>
      <span><b>DVL Volume</b><small>overlay</small></span>
      <i class="dvl-vt-state" id="dvlVolState">ON</i>
    `;

    const vt = document.getElementById("dvlVolumeTraceItem");
    if(vt && vt.parentNode) vt.parentNode.insertBefore(item, vt);
    else {
      const head = menu.querySelector(".indicatorDropHead");
      if(head && head.nextSibling) menu.insertBefore(item, head.nextSibling);
      else menu.appendChild(item);
    }

    const pill = item.querySelector("#dvlVolState");
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
    panel.id = "dvlVolumePanel";
    panel.className = "dvl-vt-panel dvl-vol-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title"><b>DVL Volume</b><small>official chart volume</small></div>
        <div class="dvl-vt-head-actions">
          <button class="dvl-vt-reset-icon" id="dvlVolReset" type="button" aria-label="Reset DVL Volume">↻</button>
          <button class="dvl-vt-close" id="dvlVolClose" type="button">×</button>
        </div>
      </div>
      <div class="dvl-vt-body" id="dvlVolBody"></div>
    `;

    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlVolClose").addEventListener("click", closePanel);
    panel.querySelector("#dvlVolReset").addEventListener("click", reset);
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

  function colorCard(key, title){
    return `
      <div class="dvl-vol-color-card">
        <b>${title}</b>
        <button type="button" class="dvl-vol-color-btn" data-color="${key}">
          <span>${state[key]}</span><i style="background:${state[key]}"></i>
        </button>
      </div>
    `;
  }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlVolBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field">
            <label>Indicator</label>
            <label class="dvl-switch"><input id="dvlVolOn" type="checkbox" ${state.on ? "checked" : ""}><i></i><b></b></label>
          </div>
          <div class="dvl-vt-field">
            <label>Opacity</label>
            <input id="dvlVolOpacity" class="dvl-vt-input" type="number" min="0.01" max="1" step="0.01" value="${state.opacity}">
          </div>
          <div class="dvl-vt-field">
            <label>MA</label>
            <label class="dvl-switch"><input id="dvlVolMaOn" type="checkbox" ${state.maOn ? "checked" : ""}><i></i><b></b></label>
          </div>
          <div class="dvl-vt-field">
            <label>Height</label>
            <input id="dvlVolHeight" class="dvl-vt-input" type="number" min="0.25" max="5" step="0.05" value="${state.height}">
          </div>
          <div class="dvl-vt-field">
            <label>MA Len</label>
            <input id="dvlVolMaLength" class="dvl-vt-input" type="number" min="1" max="2000" step="1" value="${state.maLength}">
          </div>
          <div class="dvl-vt-field">
            <label>MA Opacity</label>
            <input id="dvlVolMaOpacity" class="dvl-vt-input" type="number" min="0.01" max="1" step="0.01" value="${state.maOpacity}">
          </div>
          <div class="dvl-vt-field">
            <label>MA2</label>
            <label class="dvl-switch"><input id="dvlVolMa2On" type="checkbox" ${state.ma2On ? "checked" : ""}><i></i><b></b></label>
          </div>
          <div class="dvl-vt-field">
            <label>MA2 Len</label>
            <input id="dvlVolMaLength2" class="dvl-vt-input" type="number" min="1" max="2000" step="1" value="${state.maLength2}">
          </div>
          <div class="dvl-vt-field">
            <label>MA2 Opacity</label>
            <input id="dvlVolMa2Opacity" class="dvl-vt-input" type="number" min="0.01" max="1" step="0.01" value="${state.ma2Opacity}">
          </div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>VP da sessão · Value Area 40%</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field">
            <label>Colorir candles</label>
            <label class="dvl-switch"><input id="dvlVolOutsideVAOn" type="checkbox" ${state.highlightOutsideVA ? "checked" : ""}><i></i><b></b></label>
          </div>
          <div class="dvl-vt-field">
            <label>Volume x média</label>
            <input id="dvlVolHighMult" class="dvl-vt-input" type="number" min="0.50" max="5" step="0.05" value="${state.highVolumeMult}">
          </div>
          <div class="dvl-vt-field" style="grid-column:1/-1;align-items:flex-start;gap:5px">
            <label>Regra</label>
            <strong style="font-size:9px;line-height:1.35;color:var(--dvl-muted,#8ea0af);font-weight:800">Sessão do Fixed Range VP · candle fechado · corpo e fechamento fora da VA fixa de 40% · volume acima da maior MA</strong>
          </div>
        </div>
      </div>

      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Colors</span></div>
        <div class="dvl-vol-color-grid">
          ${colorCard("bullColor", "Bull Volume")}
          ${colorCard("bearColor", "Bear Volume")}
          ${colorCard("maColor", "MA Line")}
          ${colorCard("ma2Color", "MA2 Line")}
          ${colorCard("outsideVAColor", "Volume alto fora VA")}
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
    const map = {
      dvlVolOn:["on","check"],
      dvlVolOpacity:["opacity","num"],
      dvlVolHeight:["height","num"],
      dvlVolMaOn:["maOn","check"],
      dvlVolMaLength:["maLength","int"],
      dvlVolMaOpacity:["maOpacity","num"],
      dvlVolMa2On:["ma2On","check"],
      dvlVolMaLength2:["maLength2","int"],
      dvlVolMa2Opacity:["ma2Opacity","num"],
      dvlVolOutsideVAOn:["highlightOutsideVA","check"],
      dvlVolHighMult:["highVolumeMult","num"]
    };

    Object.keys(map).forEach(id=>{
      const el = panel.querySelector("#"+id);
      if(!el) return;
      const [key,type] = map[id];
      const sync = () => {
        if(type === "check") state[key] = !!el.checked;
        else if(type === "int") state[key] = parseInt(el.value,10) || DEFAULTS[key] || 1;
        else state[key] = Number(el.value) || DEFAULTS[key] || 0;
        save();
      };
      el.addEventListener("change", sync);
      el.addEventListener("input", sync);
    });

    panel.querySelectorAll(".dvl-vol-color-btn").forEach(btn=>{
      btn.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        openPalette(btn.dataset.color, btn);
      });
    });
  }

  function ensurePalette(){
    if(palette) return palette;
    palette = document.createElement("div");
    palette.id = "dvlVolPalette";
    palette.className = "dvl-vol-palette";
    palette.innerHTML = `<div class="dvl-vol-palette-grid">${PALETTE.map(c=>`<button type="button" class="dvl-vol-swatch" data-color="${c}" style="background:${c}"></button>`).join("")}</div>`;
    document.body.appendChild(palette);
    palette.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    palette.addEventListener("click", ev=>{
      const sw = ev.target.closest(".dvl-vol-swatch");
      if(!sw || !paletteTarget) return;
      state[paletteTarget] = sw.dataset.color;
      save();
      renderPanel();
      closePalette();
    });
    return palette;
  }

  function openPalette(target, anchor){
    ensurePalette();
    paletteTarget = target;
    const r = anchor.getBoundingClientRect();
    const w = 154;
    palette.style.left = Math.max(5, Math.min(window.innerWidth - w - 5, r.left)) + "px";
    palette.style.top = Math.min(window.innerHeight - 180, r.bottom + 5) + "px";
    palette.classList.add("is-open");
  }

  function closePalette(){
    if(palette) palette.classList.remove("is-open");
    paletteTarget = null;
  }

  function volumeMa(values, len){
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for(let i=0;i<values.length;i++){
      sum += values[i] || 0;
      if(i >= len) sum -= values[i-len] || 0;
      if(i >= len - 1) out[i] = sum / len;
    }
    return out;
  }

  /* Beta 1.312: as séries deixam de ser reconstruídas em todo draw. Quando só
     o volume da vela atual muda, atualizamos apenas o último ponto das MAs. */
  let _volumeSeriesCache = null;
  function lastMaValue(values,len,index){
    if(index < len-1) return null;
    let sum=0;
    for(let i=index-len+1;i<=index;i++) sum += Number(values[i])||0;
    return sum/len;
  }
  function getVolumeSeries(){
    let src=[];
    try{ src=Array.isArray(klines)?klines:[]; }catch(_){ src=[]; }
    const n=src.length;
    const len1=clamp(parseInt(state.maLength,10)||20,1,2000);
    const len2=clamp(parseInt(state.maLength2,10)||50,1,2000);
    const firstT=n?(Number(src[0].time)||0):0;
    const lastT=n?(Number(src[n-1].time)||0):0;
    const lastV=n?(Number(src[n-1].volume)||0):0;
    let c=_volumeSeriesCache;
    const sameShape=!!(c&&c.src===src&&c.n===n&&c.firstT===firstT&&c.lastT===lastT&&c.len1===len1&&c.len2===len2);
    if(!sameShape){
      const vols=new Array(n);
      for(let i=0;i<n;i++) vols[i]=Number(src[i].volume)||0;
      c={src,n,firstT,lastT,lastV,len1,len2,vols,ma1:volumeMa(vols,len1),ma2:volumeMa(vols,len2)};
      _volumeSeriesCache=c;
      return c;
    }
    if(c.lastV!==lastV&&n){
      c.lastV=lastV;c.vols[n-1]=lastV;
      c.ma1[n-1]=lastMaValue(c.vols,len1,n-1);
      c.ma2[n-1]=lastMaValue(c.vols,len2,n-1);
    }
    return c;
  }

  const SESSION_VA_PCT = 0.40;
  let _outsideVACache = null;

  function getSessionProfiles(){
    try{
      const api=window.DVLFixedRangeVP;
      if(api&&typeof api.getAnalysisProfiles==="function")return api.getAnalysisProfiles()||[];
      if(api&&typeof api.getProfiles==="function")return api.getProfiles()||[];
    }catch(_){}
    return [];
  }

  function valueAreaFor(profile,pct){
    if(!profile||!profile.bins||!profile.bins.length)return null;
    const bins=profile.bins,n=bins.length;
    let total=0,poc=Number.isFinite(profile.pocIdx)?profile.pocIdx:0,max=-Infinity;
    for(let i=0;i<n;i++){const v=Number(bins[i])||0;total+=v;if(v>max){max=v;poc=i;}}
    if(!(total>0)||!(profile.ppr>0))return null;
    const target=total*clamp(Number(pct)||SESSION_VA_PCT,.10,1);
    let lo=poc,hi=poc,acc=Number(bins[poc])||0;
    while(acc<target&&(lo>0||hi<n-1)){
      const lv=lo>0?(Number(bins[lo-1])||0):-1;
      const hv=hi<n-1?(Number(bins[hi+1])||0):-1;
      if(hv>=lv){hi++;acc+=Number(bins[hi])||0;}else{lo--;acc+=Number(bins[lo])||0;}
    }
    return {val:Number(profile.min)+lo*Number(profile.ppr),vah:Number(profile.min)+(hi+1)*Number(profile.ppr)};
  }

  function lastClosedIndex(src){
    const n=src.length;if(!n)return -1;
    let last=n-1;
    if(n>=2){
      const barMs=Number(src[n-1].time)-Number(src[n-2].time);
      if(barMs>0&&(Number(src[n-1].time)+barMs)>Date.now())last=n-2;
    }
    return last;
  }

  function computeOutsideVATimes(){
    try{
      const src=Array.isArray(klines)?klines:[];
      if(!src.length)return new Set();
      const series=getVolumeSeries();
      const lastEligible=lastClosedIndex(src);
      if(lastEligible<0)return new Set();
      const closedT=Number(src[lastEligible].time)||0;
      const closedV=Number(src[lastEligible].volume)||0;
      const mult=clamp(Number(state.highVolumeMult)||1,.50,5);
      const now=(typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();

      /* Fast path: candleColorFor pode ser chamado centenas de vezes no mesmo
         frame. Não consulta profiles nem recria arrays durante esta janela. */
      if(_outsideVACache&&_outsideVACache.lastEligible===lastEligible&&_outsideVACache.closedT===closedT&&_outsideVACache.closedV===closedV&&_outsideVACache.ma1===state.maLength&&_outsideVACache.ma2===state.maLength2&&_outsideVACache.mult===mult&&now<_outsideVACache.verifyAfter){
        return _outsideVACache.set;
      }

      const profiles=getSessionProfiles();
      if(!profiles.length){
        const empty=new Set();
        _outsideVACache={lastEligible,closedT,closedV,ma1:state.maLength,ma2:state.maLength2,mult,refs:[],set:empty,verifyAfter:now+1200};
        return empty;
      }
      const refs=profiles.map(item=>item&&item.main).filter(Boolean);
      const cacheOk=_outsideVACache&&_outsideVACache.lastEligible===lastEligible&&_outsideVACache.closedT===closedT&&_outsideVACache.closedV===closedV&&_outsideVACache.ma1===state.maLength&&_outsideVACache.ma2===state.maLength2&&_outsideVACache.mult===mult&&_outsideVACache.refs.length===refs.length&&_outsideVACache.refs.every((p,i)=>p===refs[i]);
      if(cacheOk){_outsideVACache.verifyAfter=now+1200;return _outsideVACache.set;}

      const sessionRows=[];
      for(let pi=0;pi<profiles.length;pi++){
        const item=profiles[pi];
        if(!item||!item.main||!item.window)continue;
        const va=valueAreaFor(item.main,SESSION_VA_PCT);if(!va)continue;
        sessionRows.push({start:Number(item.window.start)||0,end:Number(item.window.end)||Number(item.window.effectiveEnd)||0,va});
      }
      sessionRows.sort((a,b)=>a.start-b.start);
      const flagged=new Set();
      let si=0;
      for(let i=0;i<=lastEligible;i++){
        const d=src[i],t=Number(d.time)||0;
        while(si<sessionRows.length&&t>=sessionRows[si].end)si++;
        const session=si<sessionRows.length&&t>=sessionRows[si].start&&t<sessionRows[si].end?sessionRows[si]:null;
        if(!session)continue;
        const ref=Math.max(Number(series.ma1[i])||0,Number(series.ma2[i])||0);if(!(ref>0))continue;
        if((Number(d.volume)||0)<ref*mult)continue;
        const op=Number(d.open),cl=Number(d.close),mid=(op+cl)/2;
        if((cl>session.va.vah&&mid>session.va.vah)||(cl<session.va.val&&mid<session.va.val))flagged.add(t);
      }
      _outsideVACache={lastEligible,closedT,closedV,ma1:state.maLength,ma2:state.maLength2,mult,refs,set:flagged,verifyAfter:now+1200};
      return flagged;
    }catch(_){return _outsideVACache&&_outsideVACache.set?_outsideVACache.set:new Set();}
  }

  function outsideVAColorFor(candleOrTime){
    if(!state.on||!state.highlightOutsideVA)return null;
    const t=typeof candleOrTime==="object"&&candleOrTime?candleOrTime.time:candleOrTime;
    return computeOutsideVATimes().has(t)?state.outsideVAColor:null;
  }

  function draw(ctx, cfg){
    if(!state.on || !cfg || !cfg.view || !cfg.view.length) return;

    const view = cfg.view;
    const volMax = Math.max(Number(cfg.volMax) || 1, 1);
    const baseVolH = Math.max(Number(cfg.volH) || 1, 1);
    const panelH = Math.max(1, Number(cfg.y1) - Number(cfg.y0));
    const volH = Math.min(baseVolH * clamp(Number(state.height) || 1, 0.25, 5), panelH * 0.46);

    ctx.save();
    const outsideSet=state.highlightOutsideVA?computeOutsideVATimes():null;

    for(let i=0;i<view.length;i++){
      const d=view[i],cx=cfg.x(cfg.slotOffset+i);
      if(cx<cfg.x0-cfg.candleW||cx>cfg.x1+cfg.candleW)continue;
      const up=Number(d.close)>=Number(d.open);
      const outsideVA=!!(outsideSet&&outsideSet.has(d.time));
      const color=outsideVA?state.outsideVAColor:(up?state.bullColor:state.bearColor);
      const barOpacity=outsideVA?Math.max(state.opacity,0.85):state.opacity;
      const vh=Math.min(volH,(Number(d.volume)||0)/volMax*volH);
      ctx.fillStyle=rgba(color,barOpacity);
      ctx.fillRect(cx-cfg.candleW/2,cfg.y1-vh,cfg.candleW,vh);
    }

    if(state.maOn || state.ma2On){
      const series=getVolumeSeries(),vols=series.vols;
      const start=Math.max(0,Math.floor(cfg.win.start));
      const end=Math.min(vols.length-1,Math.ceil(cfg.win.end));

      function drawMaLine(maArr,color,opacity){
        let maMax=Math.max(volMax,1);
        for(let i=start;i<=end;i++){const v=maArr[i];if(Number.isFinite(v)&&v>maMax)maMax=v;}
        ctx.beginPath();
        let down = false;
        for(let gi=start; gi<=end; gi++){
          const v = maArr[gi];
          if(v == null || !Number.isFinite(v)){ down = false; continue; }
          const local = gi - cfg.win.start;
          const px = cfg.x(cfg.slotOffset + local);
          const py = cfg.y1 - (v / maMax) * volH;
          if(px < cfg.x0 - 10 || px > cfg.x1 + 10){ down = false; continue; }
          if(!down){ ctx.moveTo(px, py); down = true; }
          else ctx.lineTo(px, py);
        }
        ctx.lineWidth = 1.35;
        ctx.strokeStyle = rgba(color, opacity);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      }

      if(state.ma2On){
        const len2 = clamp(parseInt(state.maLength2,10)||50, 1, 2000);
        drawMaLine(series.ma2, state.ma2Color, state.ma2Opacity);
      }
      if(state.maOn){
        const len = clamp(parseInt(state.maLength,10)||20, 1, 2000);
        drawMaLine(series.ma1, state.maColor, state.maOpacity);
      }
    }

    ctx.restore();
  }

  function boot(){
    insertItem();
    updateItem();
    /* Sincroniza as médias do scanner com as do DVL Volume no load (cobre quem
       tem um maLength salvo diferente do padrão). Atrasado pra dar tempo do
       bridge do scanner ficar ativo. */
    setTimeout(syncScannerMa, 2500);
    document.addEventListener("pointerdown", ev=>{
      if(palette && !ev.target.closest(".dvl-vol-palette") && !ev.target.closest(".dvl-vol-color-btn")) closePalette();
    }, true);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLVolume = {
    version:"0.580",
    get state(){ return state; },
    open:openPanel,
    reset,
    draw,
    setMaPeriods(p1, p2){
      if(p1 && Number.isFinite(+p1)) state.maLength = clamp(+p1|0, 1, 2000);
      if(p2 && Number.isFinite(+p2)) state.maLength2 = clamp(+p2|0, 1, 2000);
      _outsideVACache=null;
      _volumeSeriesCache=null;
      save();
    },
    candleColorFor:outsideVAColorFor,
    getSessionValueAreas(){
      return getSessionProfiles().map(item=>({window:item.window,valueArea:valueAreaFor(item.main,SESSION_VA_PCT)})).filter(x=>x.valueArea);
    }
  };
  window.DVLVolumeDraw = draw;
})();
