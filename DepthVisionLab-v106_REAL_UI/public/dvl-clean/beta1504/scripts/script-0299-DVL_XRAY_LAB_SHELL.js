/* ============================================================================
   DVL — Lab (X-Ray Lab) · shell mobile-first + camada Effort vs Result
   Beta 1.635 · MVP passos 1+3 (shell da aba + overlay do Effort)
   ----------------------------------------------------------------------------
   OPT-IN e ISOLADO: nada aparece nem desenha até tocar no botão "Lab". Tudo em
   try/catch e marcado data-dvl-ui. Uma camada ativa por vez (spec §8). O motor
   (DVLXRayEffort) roda num timer throttled — NUNCA dentro do draw (spec §12/§14);
   o draw só lê a leitura em cache. Detalhes num bottom sheet (§10), no máx ~40%
   da altura útil (§8). Não cria sinal BUY/SELL, não usa IA (§16).

   Camadas: Effort (ativa). Battle/Stress/Debt entram como chips "em breve".
   ============================================================================ */
(function(){
  "use strict";
  var MODES = [
    { id:"effort",  label:"Effort", ready:true  },
    { id:"battle",  label:"Battle", ready:false },
    { id:"stress",  label:"Stress", ready:false },
    { id:"debt",    label:"Debt",   ready:false }
  ];

  var state = { open:false, mode:"effort", sheet:false };
  var cache = { effort:null, at:0, symbol:"", tf:"" };
  var timer = null;

  /* leitura de candles/símbolo/tf pelo padrão do app (bare + typeof guard) */
  function candles(){ try{ if(typeof klines !== "undefined" && Array.isArray(klines)) return klines; }catch(_){} return []; }
  function sym(){ try{ if(typeof symbol !== "undefined" && symbol) return String(symbol); }catch(_){} return ""; }
  function tf(){ try{ if(typeof interval !== "undefined" && interval) return String(interval); }catch(_){} return ""; }
  function fmt(n,d){ n=Number(n); if(!isFinite(n)) return "—"; return n.toFixed(d==null?2:d); }

  /* ── estilos (injetados 1×) ─────────────────────────────────────────────── */
  function ensureStyle(){
    if(document.getElementById("dvlLabStyle1635")) return;
    var s = document.createElement("style"); s.id="dvlLabStyle1635";
    s.textContent = [
      ".dvl-lab-launch{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 74px);z-index:9400;",
      " background:#0b1a14;border:1px solid #1f6f4e;color:#7ff0be;font:800 12px/1 system-ui;padding:8px 14px;border-radius:999px;",
      " box-shadow:0 6px 20px rgba(0,0,0,.45);display:flex;gap:7px;align-items:center;cursor:pointer}",
      ".dvl-lab-launch.on{background:#0f2a1e;border-color:#2fd08a;color:#aef7d6}",
      ".dvl-lab-launch b{font-weight:900;letter-spacing:.4px}",
      ".dvl-lab-bar{position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 72px);z-index:9401;",
      " background:rgba(6,14,11,.94);border:1px solid #163a2b;border-radius:14px;padding:8px;display:none;",
      " backdrop-filter:blur(6px);box-shadow:0 10px 30px rgba(0,0,0,.5)}",
      ".dvl-lab-bar.open{display:block}",
      ".dvl-lab-chips{display:flex;gap:6px;overflow-x:auto}",
      ".dvl-lab-chip{flex:0 0 auto;background:#0c1c15;border:1px solid #1c4634;color:#cfeede;font:800 12px/1 system-ui;",
      " padding:9px 14px;border-radius:999px;cursor:pointer;position:relative}",
      ".dvl-lab-chip.active{background:#123a29;border-color:#2fd08a;color:#aef7d6}",
      ".dvl-lab-chip.soon{opacity:.5;cursor:default}",
      ".dvl-lab-chip .soon-tag{font-size:8px;opacity:.8;margin-left:4px}",
      ".dvl-lab-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9402;max-height:40vh;overflow:auto;",
      " background:rgba(6,14,11,.97);border-top:1px solid #1c4634;border-radius:16px 16px 0 0;padding:12px 14px 18px;",
      " transform:translateY(100%);transition:transform .22s ease;box-shadow:0 -10px 30px rgba(0,0,0,.5)}",
      ".dvl-lab-sheet.open{transform:translateY(0)}",
      ".dvl-lab-sheet h4{margin:0 0 2px;font:900 13px/1.2 system-ui;color:#eafff5}",
      ".dvl-lab-sheet .sub{font:700 10px/1.2 system-ui;color:#7fb59c;margin-bottom:10px}",
      ".dvl-lab-grip{width:38px;height:4px;border-radius:3px;background:#2a5a44;margin:0 auto 10px}",
      ".dvl-lab-row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #10281e;font:700 12px/1.3 system-ui;color:#cfeede}",
      ".dvl-lab-row b{color:#eafff5;font-weight:900}",
      ".dvl-lab-read{margin-top:10px;padding:10px;border-radius:10px;font:800 12px/1.35 system-ui}",
      ".dvl-lab-read.buy{background:rgba(47,208,138,.12);border:1px solid #2fd08a;color:#aef7d6}",
      ".dvl-lab-read.sell{background:rgba(240,90,90,.12);border:1px solid #f05a5a;color:#f7c2c2}",
      ".dvl-lab-read.flat{background:rgba(160,180,170,.10);border:1px solid #3a5a4c;color:#cfe0d7}"
    ].join("");
    document.head.appendChild(s);
  }

  /* ── DOM ────────────────────────────────────────────────────────────────── */
  var launch = null, bar, sheet; // launch: sem botão flutuante — a entrada é o botão "Lab" da nav (era Copilot)
  function ensureDom(){
    ensureStyle();
    if(!bar){
      bar = document.createElement("div");
      bar.className="dvl-lab-bar"; bar.setAttribute("data-dvl-ui","true");
      var chips = MODES.map(function(m){
        return '<div class="dvl-lab-chip'+(m.ready?"":" soon")+(m.id===state.mode?" active":"")+'" data-lab-mode="'+m.id+'">'+m.label+(m.ready?"":'<span class="soon-tag">em breve</span>')+'</div>';
      }).join("");
      bar.innerHTML='<div class="dvl-lab-chips">'+chips+'</div>';
      bar.addEventListener("click", function(ev){
        var c = ev.target && ev.target.closest ? ev.target.closest("[data-lab-mode]") : null;
        if(!c) return; var id=c.getAttribute("data-lab-mode");
        var m = MODES.filter(function(x){return x.id===id;})[0];
        if(!m || !m.ready){ return; }
        setMode(id);
      });
      document.body.appendChild(bar);
    }
    if(!sheet){
      sheet = document.createElement("div");
      sheet.className="dvl-lab-sheet"; sheet.setAttribute("data-dvl-ui","true");
      sheet.innerHTML='<div class="dvl-lab-grip"></div><div id="dvlLabSheetBody"></div>';
      // swipe/tap-fora fecha o sheet
      sheet.addEventListener("click", function(ev){ if(ev.target===sheet) closeSheet(); });
      var sy=0, dy=0;
      sheet.addEventListener("touchstart", function(e){ sy=e.touches[0].clientY; dy=0; }, {passive:true});
      sheet.addEventListener("touchmove", function(e){ dy=e.touches[0].clientY - sy; }, {passive:true});
      sheet.addEventListener("touchend", function(){ if(dy>60) closeSheet(); }, {passive:true});
      document.body.appendChild(sheet);
    }
  }

  function toggle(){ state.open ? close() : open(); }
  function emitState(isOpen){ try{ window.dispatchEvent(new CustomEvent("dvl:lab-state-change",{detail:{open:!!isOpen,mode:state.mode}})); }catch(_){} }
  function open(){
    ensureDom(); state.open=true;
    if(launch) launch.classList.add("on");
    if(bar) bar.classList.add("open");
    startTimer(); tick(); openSheet();
    emitState(true);
  }
  function close(){
    state.open=false;
    if(launch) launch.classList.remove("on");
    if(bar) bar.classList.remove("open");
    closeSheet(); stopTimer();
    emitState(false);
    try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){}
  }
  function setMode(id){
    state.mode=id;
    if(launch){ var lm=launch.querySelector("#dvlLabLaunchMode"); if(lm) lm.textContent=(MODES.filter(function(x){return x.id===id;})[0]||{}).label||id; }
    if(bar){ bar.querySelectorAll("[data-lab-mode]").forEach(function(c){ c.classList.toggle("active", c.getAttribute("data-lab-mode")===id); }); }
    tick(); openSheet();
    try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){}
  }
  function openSheet(){ ensureDom(); state.sheet=true; sheet.classList.add("open"); renderSheet(); }
  function closeSheet(){ state.sheet=false; if(sheet) sheet.classList.remove("open"); }

  /* ── motor: recomputa throttled, guarda em cache (fora do draw) ─────────── */
  function startTimer(){ if(timer) return; timer=setInterval(tick, 700); }
  function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }
  function tick(){
    try{
      if(!state.open) return;
      if(state.mode==="effort" && window.DVLXRayEffort){
        var cs = candles();
        cache.effort = (cs && cs.length>=5) ? window.DVLXRayEffort.latest(cs, {lookback:50, window:1}) : null;
        cache.at = Date.now(); cache.symbol=sym(); cache.tf=tf();
      }
      if(state.sheet) renderSheet();
      try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){}
    }catch(_labTick){}
  }

  /* ── bottom sheet ───────────────────────────────────────────────────────── */
  function renderSheet(){
    if(!sheet) return; var body=sheet.querySelector("#dvlLabSheetBody"); if(!body) return;
    if(state.mode!=="effort"){
      body.innerHTML='<h4>'+(state.mode.toUpperCase())+'</h4><div class="sub">Em breve neste Lab.</div>'; return;
    }
    var r=cache.effort;
    if(!r){ body.innerHTML='<h4>Effort vs Result</h4><div class="sub">'+ (cache.symbol||sym()) +' · '+(cache.tf||tf())+'</div><div class="dvl-lab-read flat">Coletando fluxo…</div>'; return; }
    var sideCls = r.reading.side==="buy"?"buy":(r.reading.side==="sell"?"sell":"flat");
    body.innerHTML =
      '<h4>Effort vs Result</h4>'+
      '<div class="sub">'+(cache.symbol||sym())+' · '+(cache.tf||tf())+'</div>'+
      '<div class="dvl-lab-row"><span>Lado dominante</span><b>'+(r.dominantSide==="buy"?"Compra":r.dominantSide==="sell"?"Venda":"Neutro")+'</b></div>'+
      '<div class="dvl-lab-row"><span>Esforço (vs média)</span><b>'+fmt(r.effort)+'×</b></div>'+
      '<div class="dvl-lab-row"><span>Resultado (ATR)</span><b>'+fmt(r.result)+'</b></div>'+
      '<div class="dvl-lab-row"><span>Eficiência</span><b>'+fmt(r.efficiency)+'</b></div>'+
      '<div class="dvl-lab-read '+sideCls+'"><b>'+r.reading.label+'</b><br>'+r.reading.meaning+'</div>';
  }

  /* ── overlay no gráfico (chamado pelo draw do chart; SÓ lê o cache) ──────── */
  function draw(ctx, cfg){
    try{
      if(!state.open || state.mode!=="effort" || !cfg) return;
      var r = cache.effort; if(!r) return;
      var x0=cfg.x0, y0=cfg.y0, y1=cfg.y1;
      var side = r.reading.side;
      var col = side==="buy" ? "#2fd08a" : side==="sell" ? "#f05a5a" : "#9fb6aa";
      var label = "LAB · " + r.reading.label;
      ctx.save();
      ctx.font="800 10px system-ui"; ctx.textBaseline="middle"; ctx.textAlign="left";
      var padX=8, tw=ctx.measureText(label).width, bw=tw+padX*2+18, bh=18;
      var bx=x0+10, by=(y1||0)-bh-8; // canto inferior-esquerdo do painel (menos poluição)
      // pílula
      ctx.fillStyle="rgba(4,12,9,.82)"; roundRectSafe(ctx,bx,by,bw,bh,7);
      ctx.strokeStyle=col; ctx.lineWidth=1; ctx.stroke();
      // barra de eficiência (0..~2 → 0..12px)
      var eff=Math.max(0,Math.min(2, r.efficiency));
      ctx.fillStyle=col; ctx.globalAlpha=.9;
      ctx.fillRect(bx+padX, by+bh-4, (eff/2)*(bw-padX*2-4), 2);
      ctx.globalAlpha=1;
      // dot + texto
      ctx.beginPath(); ctx.arc(bx+padX+3, by+bh/2-2, 3, 0, Math.PI*2); ctx.fillStyle=col; ctx.fill();
      ctx.fillStyle="#dff6ec"; ctx.fillText(label, bx+padX+11, by+bh/2-1);
      ctx.restore();
    }catch(_labDraw){}
  }
  function roundRectSafe(ctx,x,y,w,h,r){
    try{ if(typeof roundRect==="function"){ roundRect(ctx,x,y,w,h,r,true,false); return; } }catch(_){}
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill();
  }

  /* ── boot + API ─────────────────────────────────────────────────────────── */
  function boot(){ try{ ensureDom(); }catch(_){} }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLXRayLabDraw = draw;
  window.DVL_LAB = {
    open:open, close:close, toggle:toggle, setMode:setMode,
    isOpen:function(){ return !!state.open; }, mode:function(){ return state.mode; },
    reading:function(){ return cache.effort; }
  };
})();
