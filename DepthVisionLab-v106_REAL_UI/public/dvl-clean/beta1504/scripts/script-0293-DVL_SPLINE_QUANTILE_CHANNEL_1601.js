/* script-0293-DVL_SPLINE_QUANTILE_CHANNEL_1601.js
   DVL Spline Quantile Channel — canal de regressão quantílica por spline cúbica
   truncada (3 curvas: superior/mediana/inferior) + projeção (forecast). Segue o
   padrão dos indicadores overlay (VWAP Session / MAs): item no menu de
   indicadores, painel dvl-vt-*, storage em localStorage e um hook de desenho
   window.DVLSplineQuantChannelDraw chamado pelo render do chart (script-0064).

   O cálculo pesado (IRLS quantílico) roda num Web Worker (solver isolado
   dvl-spline-quantile-solver-1601.js) com scheduler "somente-o-último" e token
   de geração, pra não travar o gráfico. Fallback main-thread se o worker falhar.
   Implementação INDEPENDENTE a partir da matemática (não é cópia do Pine). */
(function(){
  "use strict";

  const KEY = "dvl_spline_quant_v1";
  const SOLVER_FILE = "dvl-spline-quantile-solver-1601.js";
  const DEFAULTS = {
    on:false,
    length:300,          // nº de closes recentes usados no fit (janela)
    knots:3,             // nós internos da spline (1..15)
    iterations:100,      // iterações do IRLS (1..200)
    forecast:20,         // barras projetadas (0..100)
    upperQ:95,           // quantil superior em % (50..99)
    lowerQ:5,            // quantil inferior em % (1..50)
    upColor:"#22d3ee", midColor:"#f5c542", loColor:"#a855f7",
    width:2,
    fillOn:true,
    forecastOn:true
  };

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clampN(v,a,b,d){ v=Number(v); if(!Number.isFinite(v)) v=d; return Math.max(a,Math.min(b,v)); }
  function isHex(s){ return /^#[0-9a-f]{6}$/i.test(String(s||"")); }

  function normalize(s){
    const o = clone(DEFAULTS);
    if(s && typeof s==="object"){
      o.on = !!s.on;
      o.length = clampN(s.length,20,1000,DEFAULTS.length);
      o.knots = clampN(s.knots,1,15,DEFAULTS.knots);
      o.iterations = clampN(s.iterations,1,200,DEFAULTS.iterations);
      o.forecast = clampN(s.forecast,0,100,DEFAULTS.forecast);
      o.upperQ = clampN(s.upperQ,50,99,DEFAULTS.upperQ);
      o.lowerQ = clampN(s.lowerQ,1,50,DEFAULTS.lowerQ);
      o.upColor = isHex(s.upColor)?s.upColor:DEFAULTS.upColor;
      o.midColor = isHex(s.midColor)?s.midColor:DEFAULTS.midColor;
      o.loColor = isHex(s.loColor)?s.loColor:DEFAULTS.loColor;
      o.width = clampN(s.width,1,6,DEFAULTS.width);
      o.fillOn = s.fillOn!==false;
      o.forecastOn = s.forecastOn!==false;
    }
    return o;
  }
  function load(){ try{ return normalize(JSON.parse(localStorage.getItem(KEY)||"null")); }catch(_){ return clone(DEFAULTS); } }
  function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){} }

  let state = load();
  let panel = null;
  let lastResult = null;      // {upperHistory,medianHistory,lowerHistory,*Forecast, meta:{base,len,N}}
  let inflightMeta = null;

  function redraw(){ if(typeof drawSoon==="function"){ try{ drawSoon(); }catch(_){} } }

  /* ───────────────────────── fonte de closes ─────────────────────────────── */
  function readCloses(){
    if(typeof klines==="undefined" || !Array.isArray(klines) || klines.length<8) return null;
    const len = klines.length;
    const N = Math.min(state.length, len);
    const base = len - N;
    const closes = new Array(N);
    for(let i=0;i<N;i++){ const c = Number(klines[base+i] && klines[base+i].close); if(!Number.isFinite(c)) return null; closes[i]=c; }
    return { closes, base, len, N };
  }
  function workerConfig(){
    return {
      knots:state.knots, iterations:state.iterations, forecast:(state.forecastOn?state.forecast:0),
      upperQ:state.upperQ/100, medianQ:0.5, lowerQ:state.lowerQ/100
    };
  }

  /* ───────────────────────── worker + scheduler ──────────────────────────── */
  let worker = null, workerOk = false, busy = false, generation = 0, pendingJob = null;
  let debTimer = null, lastSig = "", inflightJob = null, lastErr = "";

  function mainThreadFit(job){
    try{
      if(window.DVLSplineSolver){
        const r = window.DVLSplineSolver.fit(job.closes, Object.assign({generation:job.generation}, job.config));
        if(r && r.generation===generation){ r.meta=job.meta; lastResult=r; redraw(); }
        return true;
      }
    }catch(e){ lastErr="mainfit:"+e; }
    return false;
  }

  // Captura o src DESTE script no load (document.currentScript é null depois).
  const THIS_SRC = (function(){ try{ return (document.currentScript && document.currentScript.src) || ""; }catch(_){ return ""; } })();
  function solverURL(){
    // Precisa ser ABSOLUTA: num Blob worker, importScripts com URL root-relative
    // ('/dvl-clean/...') é inválida (o blob: não tem host).
    try{ if(THIS_SRC) return THIS_SRC.replace(/[^\/?]*(\?.*)?$/, SOLVER_FILE); }catch(_){}
    try{ return location.origin + "/dvl-clean/beta1504/scripts/" + SOLVER_FILE; }catch(_){}
    return "/dvl-clean/beta1504/scripts/"+SOLVER_FILE;
  }
  let triedWorker = false;
  function initWorker(){
    if(worker) return workerOk;      // já criado
    if(triedWorker && !workerOk) return false;  // já tentou e falhou → usa fallback
    triedWorker = true;
    {
      try{
        const url = solverURL();
        const body =
          "self.__SOLVER_URL="+JSON.stringify(url)+";"+
          "try{ importScripts(self.__SOLVER_URL); }catch(e){ self.__importErr=String(e); }"+
          "self.onmessage=function(ev){"+
          "  var d=ev.data;"+
          "  if(!self.DVLSplineSolver){ self.postMessage({generation:d.generation, error:'no-solver:'+(self.__importErr||'')}); return; }"+
          "  try{ var r=self.DVLSplineSolver.fit(d.closes, Object.assign({generation:d.generation}, d.config)); self.postMessage(r); }"+
          "  catch(e){ self.postMessage({generation:d.generation, error:String(e)}); }"+
          "};";
        const blob = new Blob([body], {type:"application/javascript"});
        worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = onWorkerMessage;
        worker.onerror = function(){ workerOk=false; };
        workerOk = true;
      }catch(_){ worker=null; workerOk=false; }
    }
    return workerOk;
  }
  function onWorkerMessage(ev){
    const r = ev.data; busy=false;
    if(r && !r.error && r.generation===generation){ r.meta=inflightMeta; lastResult=r; redraw(); }
    else if(r && r.error){
      lastErr = "worker:"+r.error; workerOk=false;
      if(inflightJob) mainThreadFit(inflightJob);   // não perde o job: computa no main thread
    }
    inflightJob=null;
    flush();
  }
  function post(job){
    busy=true; inflightMeta=job.meta; inflightJob=job;
    if(workerOk && worker){
      try{ worker.postMessage({closes:job.closes, config:job.config, generation:job.generation}); return; }
      catch(e){ workerOk=false; lastErr="post:"+e; }
    }
    // sem worker → fallback main-thread síncrono (janela pequena → aceitável)
    busy=false; inflightJob=null;
    mainThreadFit(job);
  }
  function flush(){ if(busy||!pendingJob) return; const j=pendingJob; pendingJob=null; post(j); }
  function schedule(){
    const src = readCloses(); if(!src){ return; }
    generation++;
    pendingJob = { closes:src.closes, config:workerConfig(), generation, meta:{base:src.base, len:src.len, N:src.N} };
    flush();
  }
  function requestCompute(){
    if(debTimer) return;
    debTimer = setTimeout(function(){ debTimer=null; schedule(); }, 180); // coalesce → ~5 fits/s
  }
  function inputSig(){
    let sym=""; try{ if(typeof symbol!=="undefined") sym=String(symbol); }catch(_){}
    let itv=""; try{ if(typeof interval!=="undefined") itv=String(interval); }catch(_){}
    let len=0, lc=0;
    try{ if(Array.isArray(klines)){ len=klines.length; lc=Number(klines[len-1]&&klines[len-1].close)||0; } }catch(_){}
    return sym+"|"+itv+"|"+len+"|"+lc.toFixed(6)+"|"+JSON.stringify(workerConfig())+"|"+state.length;
  }
  function maybeCompute(){
    if(!state.on) return;
    const sig = inputSig();
    if(sig!==lastSig){ lastSig=sig; requestCompute(); }
  }

  /* ───────────────────────────── desenho ─────────────────────────────────── */
  function draw(ctx, cfg){
    try{
      if(!state.on) return;
      maybeCompute();
      const r = lastResult; if(!r || !r.meta) return;
      const meta = r.meta;
      let klen = 0; try{ klen = Array.isArray(klines)?klines.length:0; }catch(_){ return; }
      if(klen < meta.base + meta.N) return;   // série trocou/encolheu → espera fit novo

      const X = cfg.x, Y = cfg.y, so = cfg.slotOffset, ws = (cfg.win&&cfg.win.start)||0;
      const x0=cfg.x0, x1=cfg.x1, y0=cfg.y0, y1=cfg.y1;
      const gx = gi => X(so + (gi - ws));
      const clipY = py => py<y0 ? y0 : (py>y1 ? y1 : py);

      // ponto (px,py) para índice k do histórico e para forecast f
      const hx = k => gx(meta.base + k);
      const fx = f => gx(meta.len - 1 + (f+1));

      ctx.save();
      ctx.beginPath(); ctx.rect(x0, y0, Math.max(0,x1-x0), Math.max(0,y1-y0)); ctx.clip();
      ctx.lineJoin="round"; ctx.lineCap="round";

      const N = meta.N;
      const up = r.upperHistory, mid = r.medianHistory, lo = r.lowerHistory;
      const upF = r.upperForecast, midF = r.medianForecast, loF = r.lowerForecast;
      const fc = state.forecastOn && upF && upF.length ? upF.length : 0;

      // preenchimento entre superior e inferior (histórico + forecast)
      if(state.fillOn){
        ctx.beginPath();
        let started=false;
        for(let k=0;k<N;k++){ const px=hx(k), py=Y(up[k]); if(!started){ctx.moveTo(px,py);started=true;} else ctx.lineTo(px,py); }
        for(let f=0;f<fc;f++){ ctx.lineTo(fx(f), Y(upF[f])); }
        for(let f=fc-1;f>=0;f--){ ctx.lineTo(fx(f), Y(loF[f])); }
        for(let k=N-1;k>=0;k--){ ctx.lineTo(hx(k), Y(lo[k])); }
        ctx.closePath();
        ctx.globalAlpha=0.06; ctx.fillStyle=state.upColor; ctx.fill(); ctx.globalAlpha=1;
      }

      // linhas: histórico sólido, forecast tracejado
      const strokeCurve = (hist, fcast, color) => {
        ctx.strokeStyle=color; ctx.lineWidth=Math.max(1,state.width);
        ctx.setLineDash([]);
        ctx.beginPath();
        let started=false;
        for(let k=0;k<N;k++){ const px=hx(k), py=clipY(Y(hist[k])); if(!started){ctx.moveTo(px,py);started=true;} else ctx.lineTo(px,py); }
        ctx.stroke();
        if(state.forecastOn && fcast && fcast.length){
          ctx.setLineDash([5,4]);
          ctx.beginPath();
          ctx.moveTo(hx(N-1), clipY(Y(hist[N-1])));
          for(let f=0;f<fcast.length;f++){ ctx.lineTo(fx(f), clipY(Y(fcast[f]))); }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      };
      strokeCurve(lo, loF, state.loColor);
      strokeCurve(up, upF, state.upColor);
      strokeCurve(mid, midF, state.midColor);

      // pílulas na escala (último valor de cada curva)
      if(window.dvlRegisterScaleLabel){
        try{
          window.dvlRegisterScaleLabel({value:up[N-1], color:state.upColor, label:"SQ↑"});
          window.dvlRegisterScaleLabel({value:mid[N-1], color:state.midColor, label:"SQ"});
          window.dvlRegisterScaleLabel({value:lo[N-1], color:state.loColor, label:"SQ↓"});
        }catch(_){}
      }
      ctx.restore();
    }catch(_){ try{ctx.restore();}catch(__){} }
  }

  /* ───────────────────────── item no menu ────────────────────────────────── */
  function updateItem(){
    const st = document.getElementById("dvlSplineQuantState");
    if(st){ st.textContent = state.on?"ON":"OFF"; st.classList.toggle("is-on", !!state.on); }
  }
  function placeItem(menu, item){
    const anchor = document.getElementById("dvlVwapSessionItem") || document.getElementById("dvlMovingAveragesItem");
    if(anchor && anchor.parentNode){ if(anchor.nextSibling!==item) anchor.parentNode.insertBefore(item, anchor.nextSibling); return; }
    const head = menu.querySelector(".indicatorDropHead");
    if(head && head.parentNode){ if(head.nextSibling!==item) menu.insertBefore(item, head.nextSibling); }
    else if(menu.firstChild!==item){ menu.insertBefore(item, menu.firstChild); }
  }
  function insertItem(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu) return;
    let item = document.getElementById("dvlSplineQuantItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlSplineQuantItem";
      item.className = "indicatorItem dvl-splineq-indicator-item";
      item.innerHTML =
        '<span class="indicatorFxMark">SQ</span>'+
        '<span><b>Spline Quantile Channel</b><small>overlay · canal quantílico + forecast</small></span>'+
        '<i class="dvl-vt-state" id="dvlSplineQuantState">OFF</i>';
      const pill = item.querySelector("#dvlSplineQuantState");
      if(pill) pill.addEventListener("click", ev=>{ ev.preventDefault(); ev.stopPropagation(); toggle(); });
      item.addEventListener("click", ev=>{ ev.stopPropagation(); openPanel(); });
    }
    placeItem(menu, item);
    updateItem();
  }
  function toggle(){
    state.on = !state.on; persist(); updateItem();
    if(state.on){ initWorker(); lastSig=""; maybeCompute(); }
    else { lastResult=null; }
    redraw();
    if(panel) renderPanel();
  }

  /* ───────────────────────────── painel ──────────────────────────────────── */
  function ensurePanel(){
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "dvlSplineQuantPanel";
    panel.className = "dvl-vt-panel dvl-splineq-panel";
    panel.setAttribute("data-dvl-ui","true");
    panel.innerHTML =
      '<div class="dvl-vt-head"><b>Spline Quantile Channel</b>'+
      '<span style="flex:1"></span>'+
      '<button class="dvl-vt-btn" id="dvlSQReset">Reset</button>'+
      '<button class="dvl-vt-btn" id="dvlSQClose">✕</button></div>'+
      '<div class="dvl-vt-body" id="dvlSQBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev=>ev.stopPropagation(), true);
    panel.querySelector("#dvlSQClose").addEventListener("click", closePanel);
    panel.querySelector("#dvlSQReset").addEventListener("click", reset);
    return panel;
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }
  function reset(){ state = clone(DEFAULTS); persist(); updateItem(); lastResult=null; lastSig=""; if(state.on) maybeCompute(); redraw(); renderPanel(); }

  function row(label, control){ return '<label class="dvl-vt-row"><span>'+label+'</span>'+control+'</label>'; }
  function num(id,val,mn,mx,step){ return '<input type="number" id="'+id+'" value="'+val+'" min="'+mn+'" max="'+mx+'" step="'+(step||1)+'" class="dvl-vt-num">'; }
  function color(id,val){ return '<input type="color" id="'+id+'" value="'+val+'" class="dvl-vt-color">'; }
  function chk(id,on){ return '<input type="checkbox" id="'+id+'"'+(on?' checked':'')+'>'; }

  function renderPanel(){
    ensurePanel();
    const b = panel.querySelector("#dvlSQBody");
    b.innerHTML =
      row("Ativado", chk("sqOn", state.on))+
      row("Janela (barras)", num("sqLen", state.length,20,1000,10))+
      row("Nós (knots)", num("sqKnots", state.knots,1,15,1))+
      row("Iterações IRLS", num("sqIter", state.iterations,1,200,1))+
      row("Quantil superior %", num("sqUq", state.upperQ,50,99,1))+
      row("Quantil inferior %", num("sqLq", state.lowerQ,1,50,1))+
      row("Forecast", chk("sqFcOn", state.forecastOn))+
      row("Barras de forecast", num("sqFc", state.forecast,0,100,1))+
      row("Preenchimento", chk("sqFill", state.fillOn))+
      row("Espessura", num("sqW", state.width,1,6,1))+
      row("Cor superior", color("sqUc", state.upColor))+
      row("Cor mediana", color("sqMc", state.midColor))+
      row("Cor inferior", color("sqLc", state.loColor));

    const bind=(id,ev,fn)=>{ const e=b.querySelector("#"+id); if(e) e.addEventListener(ev,fn); };
    const commit=()=>{ persist(); updateItem(); lastSig=""; if(state.on){ initWorker(); maybeCompute(); } else lastResult=null; redraw(); };
    bind("sqOn","change",e=>{ state.on=e.target.checked; commit(); });
    bind("sqLen","change",e=>{ state.length=clampN(e.target.value,20,1000,DEFAULTS.length); commit(); });
    bind("sqKnots","change",e=>{ state.knots=clampN(e.target.value,1,15,DEFAULTS.knots); commit(); });
    bind("sqIter","change",e=>{ state.iterations=clampN(e.target.value,1,200,DEFAULTS.iterations); commit(); });
    bind("sqUq","change",e=>{ state.upperQ=clampN(e.target.value,50,99,DEFAULTS.upperQ); commit(); });
    bind("sqLq","change",e=>{ state.lowerQ=clampN(e.target.value,1,50,DEFAULTS.lowerQ); commit(); });
    bind("sqFcOn","change",e=>{ state.forecastOn=e.target.checked; commit(); });
    bind("sqFc","change",e=>{ state.forecast=clampN(e.target.value,0,100,DEFAULTS.forecast); commit(); });
    bind("sqFill","change",e=>{ state.fillOn=e.target.checked; persist(); redraw(); });
    bind("sqW","change",e=>{ state.width=clampN(e.target.value,1,6,DEFAULTS.width); persist(); redraw(); });
    bind("sqUc","change",e=>{ state.upColor=isHex(e.target.value)?e.target.value:state.upColor; persist(); redraw(); });
    bind("sqMc","change",e=>{ state.midColor=isHex(e.target.value)?e.target.value:state.midColor; persist(); redraw(); });
    bind("sqLc","change",e=>{ state.loColor=isHex(e.target.value)?e.target.value:state.loColor; persist(); redraw(); });
  }

  /* ───────────────────────────── boot ────────────────────────────────────── */
  function homed(){ return !!document.getElementById("dvlSplineQuantItem"); }
  function boot(){
    // O #indicatorDropdown e os itens-âncora (MAs/VWAP) só existem DEPOIS do
    // boot deste script, então tenta repetidamente até encaixar (~20s) e observa
    // o DOM inteiro para reencaixar se o menu for reconstruído.
    let tries = 0;
    (function attempt(){
      insertItem();
      if(homed()) return;
      if(tries++ < 80) setTimeout(attempt, 250);
    })();
    try{
      const mo = new MutationObserver(()=>{ if(!homed()) insertItem(); });
      mo.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(()=>{ try{ mo.disconnect(); }catch(_){} }, 30000);
    }catch(_){}
    if(state.on){ initWorker(); maybeCompute(); }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.DVLSplineQuantChannelDraw = draw;
  window.DVLSplineQuantChannel = {
    get state(){return state;}, open:openPanel, toggle:toggle,
    _debug:()=>({ on:state.on, hasResult:!!lastResult, resultLens:lastResult?[lastResult.upperHistory&&lastResult.upperHistory.length, (lastResult.upperForecast||[]).length]:null,
      workerOk, busy, generation, triedWorker, lastErr, hasSolver:!!window.DVLSplineSolver,
      klen:(function(){try{return Array.isArray(klines)?klines.length:-1;}catch(_){return -2;}})() })
  };
})();
