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
    { id:"battle",  label:"Battle", ready:true  },
    { id:"stress",  label:"Stress", ready:true  },
    { id:"debt",    label:"Debt",   ready:true  }
  ];

  var state = { open:false, mode:"effort", sheet:false };
  var cache = { effort:null, battle:[], battleLatest:null, stress:[], stressTop:null, debt:[], debtTop:null, at:0, symbol:"", tf:"" };
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
      } else if(state.mode==="battle" && window.DVLXRayBattle){
        var csb = candles();
        cache.battle = (csb && csb.length>=5) ? window.DVLXRayBattle.detect(csb, {lookback:50}) : [];
        cache.battleLatest = cache.battle.length ? cache.battle[cache.battle.length-1] : null;
        cache.at = Date.now(); cache.symbol=sym(); cache.tf=tf();
      } else if(state.mode==="stress" && window.DVLXRayStress){
        var css = candles();
        cache.stress = (css && css.length>=6) ? window.DVLXRayStress.detect(css, {lookback:50}) : [];
        cache.stressTop = cache.stress.length ? cache.stress[0] : null; // já vem ordenado por stress
        cache.at = Date.now(); cache.symbol=sym(); cache.tf=tf();
      } else if(state.mode==="debt" && window.DVLXRayDebt){
        var csd = candles();
        cache.debt = (csd && csd.length>=6) ? window.DVLXRayDebt.detect(csd, {lookback:50}) : [];
        cache.debtTop = cache.debt.length ? cache.debt[0] : null; // mais recente primeiro
        cache.at = Date.now(); cache.symbol=sym(); cache.tf=tf();
      }
      if(state.sheet) renderSheet();
      try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){}
    }catch(_labTick){}
  }

  /* ── bottom sheet ───────────────────────────────────────────────────────── */
  function renderSheet(){
    if(!sheet) return; var body=sheet.querySelector("#dvlLabSheetBody"); if(!body) return;
    if(state.mode==="battle"){ return renderBattleSheet(body); }
    if(state.mode==="stress"){ return renderStressSheet(body); }
    if(state.mode==="debt"){ return renderDebtSheet(body); }
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
      if(!state.open || !cfg) return;
      if(state.mode==="effort") drawEffort(ctx,cfg);
      else if(state.mode==="battle") drawBattle(ctx,cfg);
      else if(state.mode==="stress") drawStress(ctx,cfg);
      else if(state.mode==="debt") drawDebt(ctx,cfg);
    }catch(_labDrawRoot){}
  }
  function drawEffort(ctx, cfg){
    try{
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
  /* Battle overlay: markers ▲ (buyers) / ▼ (sellers) / ◆ (draw) no candle final de
     cada batalha VISÍVEL, no meio da faixa. Mapeia tempo→x pelo índice do candle
     (mesmo padrão das médias: x(slotOffset + idx - win.start)). SÓ lê cache. */
  function drawBattle(ctx, cfg){
    try{
      var list = cache.battle; if(!list || !list.length) return;
      if(!cfg.win || typeof cfg.x!=="function" || typeof cfg.y!=="function") return;
      var winStart = Number(cfg.win.start)||0, winEnd = Number(cfg.win.end);
      var x0=cfg.x0, x1=cfg.x1, y0=cfg.y0, y1=cfg.y1, slot=cfg.slotOffset||0;
      ctx.save(); ctx.textAlign="center"; ctx.textBaseline="middle";
      for(var i=0;i<list.length;i++){
        var b=list[i];
        if(Number.isFinite(winEnd) && (b.endIndex<winStart-1 || b.endIndex>winEnd+1)) continue;
        var local=b.endIndex - winStart;
        var px=cfg.x(slot+local);
        if(!isFinite(px) || px<x0-6 || px>x1+6) continue;
        var mid=(b.priceLow+b.priceHigh)/2;
        var py=cfg.y(mid); if(!isFinite(py)) continue;
        py=Math.max(y0+10, Math.min(y1-10, py));
        var win = b.winner;
        var col = win==="buyers" ? "#2fd08a" : win==="sellers" ? "#f05a5a" : "#c9b56a";
        var glyph = win==="buyers" ? "▲" : win==="sellers" ? "▼" : "◆";
        // faixa discreta da batalha (topo→base) no x do fim
        var pTop=cfg.y(b.priceHigh), pBot=cfg.y(b.priceLow);
        if(isFinite(pTop)&&isFinite(pBot)){
          ctx.globalAlpha=.16; ctx.fillStyle=col;
          ctx.fillRect(px-3, Math.min(pTop,pBot), 6, Math.abs(pBot-pTop)); ctx.globalAlpha=1;
        }
        ctx.font="900 13px system-ui"; ctx.fillStyle=col;
        ctx.fillText(glyph, px, py);
      }
      ctx.restore();
    }catch(_dbe){}
  }

  function renderBattleSheet(body){
    var list=cache.battle||[], b=cache.battleLatest;
    var wins={buyers:0,sellers:0,draw:0}; list.forEach(function(x){ wins[x.winner]=(wins[x.winner]||0)+1; });
    var head='<h4>Battle Map</h4><div class="sub">'+(cache.symbol||sym())+' · '+(cache.tf||tf())+' · '+list.length+' disputas · ▲'+wins.buyers+' ▼'+wins.sellers+' ◆'+wins.draw+'</div>';
    if(!b){ body.innerHTML=head+'<div class="dvl-lab-read flat">Nenhuma disputa relevante na janela ainda.</div>'; return; }
    var cls=b.winner==="buyers"?"buy":(b.winner==="sellers"?"sell":"flat");
    var wlabel=b.winner==="buyers"?"COMPRADORES venceram":(b.winner==="sellers"?"VENDEDORES venceram":"EMPATE (muito esforço, sem resultado)");
    body.innerHTML=head+
      '<div class="dvl-lab-row"><span>Última disputa</span><b>'+b.len+' candles</b></div>'+
      '<div class="dvl-lab-row"><span>Faixa</span><b>'+fmt(b.priceLow, priceDp(b.priceLow))+' – '+fmt(b.priceHigh, priceDp(b.priceHigh))+'</b></div>'+
      '<div class="dvl-lab-row"><span>Esforço (×média)</span><b>'+fmt(b.effort)+'×</b></div>'+
      '<div class="dvl-lab-row"><span>Resultado (ATR)</span><b>'+fmt(b.result)+'</b></div>'+
      '<div class="dvl-lab-row"><span>Eficiência</span><b>'+fmt(b.efficiency)+'</b></div>'+
      '<div class="dvl-lab-row"><span>Bilateralidade</span><b>'+fmt(b.twoSided*100,0)+'%</b></div>'+
      '<div class="dvl-lab-read '+cls+'"><b>'+wlabel+'</b></div>';
  }
  function priceDp(p){ p=Math.abs(Number(p)||0); return p>=1000?1:(p>=1?2:5); }

  /* Stress overlay: banda discreta na faixa da zona, do candle de origem até a
     borda direita. Buyers trapped = VERMELHO, Sellers trapped = VERDE (§15).
     Intensidade acompanha o score. Só lê cache. */
  function drawStress(ctx, cfg){
    try{
      var list=cache.stress; if(!list || !list.length) return;
      if(!cfg.win || typeof cfg.x!=="function" || typeof cfg.y!=="function") return;
      var winStart=Number(cfg.win.start)||0, x0=cfg.x0, x1=cfg.x1, y0=cfg.y0, y1=cfg.y1, slot=cfg.slotOffset||0;
      ctx.save();
      for(var i=0;i<list.length;i++){
        var z=list[i];
        var xs=cfg.x(slot + (z.startIndex - winStart));
        if(!isFinite(xs)) continue;
        xs=Math.max(x0, xs);
        var pTop=cfg.y(z.priceHigh), pBot=cfg.y(z.priceLow);
        if(!isFinite(pTop)||!isFinite(pBot)) continue;
        var yTop=Math.max(y0, Math.min(pTop,pBot)), yBot=Math.min(y1, Math.max(pTop,pBot));
        if(yBot<=yTop) { yBot=yTop+1.5; }
        var col = z.side==="buyers" ? "244,90,90" : "47,208,138"; // buyers=vermelho, sellers=verde
        var a = 0.08 + 0.16*(Math.max(0,Math.min(100,z.stress))/100);
        ctx.fillStyle="rgba("+col+","+a.toFixed(3)+")";
        ctx.fillRect(xs, yTop, Math.max(2, x1-xs), Math.max(1.5, yBot-yTop));
        // borda superior/inferior fininha + label curto na origem
        ctx.strokeStyle="rgba("+col+",0.6)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(xs, yTop); ctx.lineTo(x1, yTop); ctx.moveTo(xs, yBot); ctx.lineTo(x1, yBot); ctx.stroke();
        var lbl=(z.side==="buyers"?"BUY TRAP ":"SELL TRAP ")+z.stress+(z.status==="resolved"?" ·r":"");
        ctx.font="800 9px system-ui"; ctx.textBaseline="bottom"; ctx.textAlign="left";
        ctx.fillStyle="rgba("+col+",0.95)";
        if(yTop-2>y0+8) ctx.fillText(lbl, Math.min(xs+3, x1-70), yTop-2);
      }
      ctx.restore();
    }catch(_dse){}
  }

  function renderStressSheet(body){
    var list=cache.stress||[], z=cache.stressTop;
    var buyers=list.filter(function(x){return x.side==="buyers";}).length;
    var sellers=list.filter(function(x){return x.side==="sellers";}).length;
    var head='<h4>Inventory Stress</h4><div class="sub">'+(cache.symbol||sym())+' · '+(cache.tf||tf())+' · presos: ▤'+buyers+' compra · ▤'+sellers+' venda</div>';
    if(!z){ body.innerHTML=head+'<div class="dvl-lab-read flat">Nenhuma zona de participantes presos na janela.</div>'; return; }
    var cls=z.side==="buyers"?"sell":"buy"; // buyers presos = pressão de baixa → visual vermelho(sell)
    var sideLbl=z.side==="buyers"?"COMPRADORES presos (acima)":"VENDEDORES presos (abaixo)";
    body.innerHTML=head+
      '<div class="dvl-lab-row"><span>Zona</span><b>'+fmt(z.priceLow,priceDp(z.priceLow))+' – '+fmt(z.priceHigh,priceDp(z.priceHigh))+'</b></div>'+
      '<div class="dvl-lab-row"><span>Stress</span><b>'+z.stress+'/100</b></div>'+
      '<div class="dvl-lab-row"><span>Agressão inicial</span><b>'+fmt(z.aggression)+'× · '+fmt(z.imbalance*100,0)+'% '+(z.side==="buyers"?"compra":"venda")+'</b></div>'+
      '<div class="dvl-lab-row"><span>Deslocamento adverso</span><b>'+fmt(z.adverseATR)+' ATR (pico '+fmt(z.adverseExtremeATR)+')</b></div>'+
      '<div class="dvl-lab-row"><span>Idade</span><b>'+z.ageCandles+' candles</b></div>'+
      '<div class="dvl-lab-row"><span>Status</span><b>'+(z.status==="live"?"VIVA":"resolvida")+'</b></div>'+
      '<div class="dvl-lab-read '+cls+'"><b>'+sideLbl+'</b><br>Inferência de pressão (não é posição real) — reação provável se o preço voltar à zona.</div>';
  }

  /* Debt (FVG) overlay: faixa do gap, da origem até a borda direita. OPEN =
     tracejada; PARTIAL = mesma faixa com preenchimento proporcional (§15).
     Bull (suporte, embaixo) = verde; Bear (resistência, em cima) = vermelho. */
  function drawDebt(ctx, cfg){
    try{
      var list=cache.debt; if(!list||!list.length) return;
      if(!cfg.win || typeof cfg.x!=="function" || typeof cfg.y!=="function") return;
      var winStart=Number(cfg.win.start)||0, x0=cfg.x0, x1=cfg.x1, y0=cfg.y0, y1=cfg.y1, slot=cfg.slotOffset||0;
      ctx.save();
      for(var i=0;i<list.length;i++){
        var d=list[i];
        var xs=cfg.x(slot+(d.startIndex-winStart)); if(!isFinite(xs)) continue; xs=Math.max(x0,xs);
        var pHi=cfg.y(d.gapHigh), pLo=cfg.y(d.gapLow); if(!isFinite(pHi)||!isFinite(pLo)) continue;
        var yTop=Math.max(y0, Math.min(pHi,pLo)), yBot=Math.min(y1, Math.max(pHi,pLo));
        if(yBot<yTop) continue;
        var col = d.dir==="bull" ? "47,208,138" : "244,90,90";
        var w=Math.max(2, x1-xs), h=Math.max(1.5, yBot-yTop);
        // fundo do gap
        ctx.fillStyle="rgba("+col+",0.06)"; ctx.fillRect(xs,yTop,w,h);
        // preenchimento parcial (do lado por onde o preço entra)
        if(d.fillPct>0){
          var fh=Math.max(1, h*Math.min(1,d.fillPct));
          ctx.fillStyle="rgba("+col+",0.20)";
          if(d.dir==="bull") ctx.fillRect(xs, yTop, w, fh);          // bull preenche de cima p/ baixo
          else ctx.fillRect(xs, yBot-fh, w, fh);                     // bear de baixo p/ cima
        }
        // bordas tracejadas
        ctx.strokeStyle="rgba("+col+",0.7)"; ctx.lineWidth=1; ctx.setLineDash([5,4]);
        ctx.beginPath(); ctx.moveTo(xs,yTop); ctx.lineTo(x1,yTop); ctx.moveTo(xs,yBot); ctx.lineTo(x1,yBot); ctx.stroke();
        ctx.setLineDash([]);
        // label curto
        var lbl="FVG "+(d.dir==="bull"?"▲":"▼")+" "+d.status.toUpperCase()+(d.status==="partial"?(" "+Math.round(d.fillPct*100)+"%"):"");
        ctx.font="800 9px system-ui"; ctx.textAlign="left"; ctx.textBaseline="bottom"; ctx.fillStyle="rgba("+col+",0.95)";
        if(yTop-2>y0+8) ctx.fillText(lbl, Math.min(xs+3, x1-78), yTop-2);
      }
      ctx.restore();
    }catch(_dde){}
  }

  function renderDebtSheet(body){
    var list=cache.debt||[], d=cache.debtTop;
    var opens=list.filter(function(x){return x.status==="open";}).length;
    var parts=list.filter(function(x){return x.status==="partial";}).length;
    var head='<h4>Liquidity Debt</h4><div class="sub">'+(cache.symbol||sym())+' · '+(cache.tf||tf())+' · '+opens+' OPEN · '+parts+' PARTIAL</div>';
    if(!d){ body.innerHTML=head+'<div class="dvl-lab-read flat">Nenhuma dívida de liquidez pendente na janela.</div>'; return; }
    var cls=d.dir==="bull"?"buy":"sell";
    body.innerHTML=head+
      '<div class="dvl-lab-row"><span>Tipo</span><b>FVG '+(d.dir==="bull"?"alta (suporte)":"baixa (resistência)")+'</b></div>'+
      '<div class="dvl-lab-row"><span>Faixa</span><b>'+fmt(d.gapLow,priceDp(d.gapLow))+' – '+fmt(d.gapHigh,priceDp(d.gapHigh))+'</b></div>'+
      '<div class="dvl-lab-row"><span>Origem</span><b>'+fmt(d.aggression)+'× · '+fmt(d.imbalance*100,0)+'% '+(d.dir==="bull"?"compra":"venda")+'</b></div>'+
      '<div class="dvl-lab-row"><span>Idade</span><b>'+d.ageCandles+' candles</b></div>'+
      '<div class="dvl-lab-row"><span>Resolvido</span><b>'+Math.round(d.fillPct*100)+'%</b></div>'+
      '<div class="dvl-lab-row"><span>Status</span><b>'+d.status.toUpperCase()+'</b></div>'+
      '<div class="dvl-lab-read '+cls+'"><b>Dívida pendente</b><br>Zona deixada para trás com fluxo forte — tende a atrair o preço até ser preenchida.</div>';
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
