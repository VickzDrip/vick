/* script-0294-DVL_LIQUIDITY_BANDS_1610.js
   DVL Liquidity Bands — bandas de order book que rodeiam o preço (parede de ASK
   dominante acima / BID dominante abaixo), derivadas do MOTOR do Deep Heatmap,
   + marcadores absorvido(consume)/retirado(pull). Segue o padrão dos indicadores
   overlay: item no menu (registro Phase1B), painel dvl-vt-*, storage, e um hook
   window.DVLLiquidityBandsDraw chamado pelo render (script-0064). O cálculo usa
   o solver isolado dvl-liquidity-bands-solver-1610.js (window.DVLLiquidityBands). */
(function(){
  "use strict";
  var KEY = "dvl_liq_bands_v1";
  var DEFAULTS = {
    on:false,
    rangePct:0.6, minNotional:50000, smoothBars:8,
    showFill:true, showMarkers:true,
    askColor:"#ef4444", bidColor:"#22c55e", width:2
  };
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clampN(v,a,b,d){ v=Number(v); if(!Number.isFinite(v)) v=d; return Math.max(a,Math.min(b,v)); }
  function isHex(s){ return /^#[0-9a-f]{6}$/i.test(String(s||"")); }
  function normalize(s){
    var o=clone(DEFAULTS);
    if(s&&typeof s==="object"){
      o.on=!!s.on;
      o.rangePct=clampN(s.rangePct,0.05,5,DEFAULTS.rangePct);
      o.minNotional=clampN(s.minNotional,5000,5e7,DEFAULTS.minNotional);
      o.smoothBars=clampN(s.smoothBars,0,60,DEFAULTS.smoothBars);
      o.showFill=s.showFill!==false; o.showMarkers=s.showMarkers!==false;
      o.askColor=isHex(s.askColor)?s.askColor:DEFAULTS.askColor;
      o.bidColor=isHex(s.bidColor)?s.bidColor:DEFAULTS.bidColor;
      o.width=clampN(s.width,1,5,DEFAULTS.width);
    }
    return o;
  }
  function load(){ try{ return normalize(JSON.parse(localStorage.getItem(KEY)||"null")); }catch(_){ return clone(DEFAULTS); } }
  function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){} }

  var state = load(), panel=null, palette=null, paletteKey=null;
  var cache = { ver:-1, at:0, bands:[], events:[] };

  function redraw(){ if(typeof drawSoon==="function"){ try{ drawSoon(); }catch(_){} } }
  function hm(){ return window.DVL_DEEP_HEATMAP_API || null; }

  /* ── tempo→slot (replica do Deep Heatmap) ───────────────────────────────── */
  function intervalMsFromView(v){ if(!v||v.length<2) return 60000; var d=Number(v[v.length-1].time)-Number(v[0].time); return Math.max(1, d/(v.length-1)); }
  function timeToSlot(t,cfg){
    var v=cfg.view||[], off=Number(cfg.slotOffset)||0, ms=intervalMsFromView(v);
    if(!v.length) return off;
    var first=Number(v[0].time), last=Number(v[v.length-1].time);
    if(t<=first) return off+(t-first)/ms;
    if(t>=last)  return off+v.length-1+(t-last)/ms;
    var lo=0,hi=v.length-1;
    while(lo+1<hi){ var m=(lo+hi)>>1; if(Number(v[m].time)<=t) lo=m; else hi=m; }
    var t0=Number(v[lo].time), t1=Number(v[hi].time), f=(t-t0)/Math.max(1,t1-t0);
    return off+lo+f;
  }

  /* ── compute (throttle + cache por snapVersion) ─────────────────────────── */
  function recompute(){
    var api=hm(), solver=window.DVLLiquidityBands;
    if(!api || !solver || typeof api._snapshots!=="function"){ cache.bands=[]; cache.events=[]; return; }
    var snaps=api._snapshots()||[], step=Number(api._step())||0;
    if(!snaps.length || !step){ cache.bands=[]; cache.events=[]; return; }
    var ver = (typeof api._snapVersion==="function")?api._snapVersion():snaps.length;
    var now=Date.now();
    if(ver===cache.ver && now-cache.at<400) return;   // throttle
    cache.ver=ver; cache.at=now;
    var slice = snaps.length>1500 ? snaps.slice(-1500) : snaps;
    var decoded = solver.fromHeatmap(slice, step);
    var r = solver.compute(decoded, { rangePct:state.rangePct, minNotional:state.minNotional, smoothBars:state.smoothBars });
    cache.bands = r.bands || [];
    var cons = (typeof api._consumption==="function")?api._consumption():[];
    var t0 = decoded.length?decoded[0].t:0, t1 = decoded.length?decoded[decoded.length-1].t:now;
    cache.events = state.showMarkers ? (solver.markEvents(cons, t0, t1)||[]) : [];
  }

  /* ── desenho ─────────────────────────────────────────────────────────────*/
  function draw(ctx, cfg){
    try{
      if(!state.on) return;
      recompute();
      var bands=cache.bands; if(!bands.length) return;
      var X=cfg.x, Y=cfg.y, x0=cfg.x0, x1=cfg.x1, y0=cfg.y0, y1=cfg.y1;
      var clipY=function(p){ return p<y0?y0:(p>y1?y1:p); };

      ctx.save();
      ctx.beginPath(); ctx.rect(x0,y0,Math.max(0,x1-x0),Math.max(0,y1-y0)); ctx.clip();
      ctx.lineJoin="round"; ctx.lineCap="round";

      // pré-mapeia pontos visíveis
      var pts=[];
      for(var i=0;i<bands.length;i++){
        var b=bands[i], slot=timeToSlot(b.t,cfg), px=X(slot);
        if(px<x0-30||px>x1+30) continue;
        pts.push({ px:px, yu:Y(b.upper), yl:Y(b.lower) });
      }
      if(pts.length<2){ ctx.restore(); return; }

      // canal sombreado entre as bandas
      if(state.showFill){
        ctx.beginPath();
        ctx.moveTo(pts[0].px, clipY(pts[0].yu));
        for(var a=1;a<pts.length;a++) ctx.lineTo(pts[a].px, clipY(pts[a].yu));
        for(var d=pts.length-1;d>=0;d--) ctx.lineTo(pts[d].px, clipY(pts[d].yl));
        ctx.closePath();
        ctx.globalAlpha=0.05; ctx.fillStyle=state.askColor; ctx.fill(); ctx.globalAlpha=1;
      }

      // banda superior (parede ASK) e inferior (parede BID)
      var line=function(key,color){
        ctx.strokeStyle=color; ctx.lineWidth=Math.max(1,state.width); ctx.beginPath();
        for(var i=0;i<pts.length;i++){ var py=clipY(pts[i][key]); if(i===0)ctx.moveTo(pts[i].px,py); else ctx.lineTo(pts[i].px,py); }
        ctx.stroke();
      };
      line("yl", state.bidColor);
      line("yu", state.askColor);

      // marcadores: absorvido (bolinha cheia) / retirado (x)
      if(state.showMarkers && cache.events.length){
        for(var e=0;e<cache.events.length;e++){
          var ev=cache.events[e], sx=X(timeToSlot(ev.t,cfg)), sy=Y(ev.price);
          if(sx<x0-6||sx>x1+6||sy<y0-6||sy>y1+6) continue;
          var col = ev.side==="ask" ? state.askColor : state.bidColor;
          ctx.globalAlpha=0.35+0.6*Math.min(1,ev.strength||0.3);
          if(ev.kind==="absorbed"){ ctx.fillStyle=col; ctx.beginPath(); ctx.arc(sx,sy,2.6,0,Math.PI*2); ctx.fill(); }
          else { ctx.strokeStyle=col; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(sx-2.4,sy-2.4); ctx.lineTo(sx+2.4,sy+2.4); ctx.moveTo(sx+2.4,sy-2.4); ctx.lineTo(sx-2.4,sy+2.4); ctx.stroke(); }
          ctx.globalAlpha=1;
        }
      }

      // pílulas na escala (último nível de cada banda)
      if(window.dvlRegisterScaleLabel){
        var last=bands[bands.length-1];
        try{ window.dvlRegisterScaleLabel({value:last.upper,color:state.askColor,label:"ASK"}); window.dvlRegisterScaleLabel({value:last.lower,color:state.bidColor,label:"BID"}); }catch(_){}
      }
      ctx.restore();
    }catch(_){ try{ctx.restore();}catch(__){} }
  }

  /* ── dependência do motor: liga o Deep Heatmap p/ ter snapshots ──────────── */
  function ensureEngine(){ var api=hm(); if(api && typeof api.setOn==="function" && typeof api.isOn==="function" && !api.isOn()){ try{ api.setOn(true); }catch(_){} } }

  /* ── menu (Phase1B faz o registro; aqui só o row legado + pill) ──────────── */
  function updateItem(){ var st=document.getElementById("dvlLiqBandsState"); if(st){ st.textContent=state.on?"ON":"OFF"; st.classList.toggle("is-on",!!state.on); } }
  function placeItem(menu,item){
    var anchor=document.getElementById("dvlDeepHeatmapItem")||document.getElementById("dvlVwapSessionItem");
    if(anchor&&anchor.parentNode){ if(anchor.nextSibling!==item)anchor.parentNode.insertBefore(item,anchor.nextSibling); return; }
    var head=menu.querySelector(".indicatorDropHead"); if(head&&head.parentNode){ if(head.nextSibling!==item)menu.insertBefore(item,head.nextSibling); } else if(menu.firstChild!==item)menu.insertBefore(item,menu.firstChild);
  }
  function insertItem(){
    var menu=document.getElementById("indicatorDropdown"); if(!menu) return;
    var item=document.getElementById("dvlLiqBandsItem");
    if(!item){
      item=document.createElement("div"); item.id="dvlLiqBandsItem"; item.className="indicatorItem dvl-liqbands-indicator-item";
      item.innerHTML='<span class="indicatorFxMark">LB</span><span><b>Liquidity Bands</b><small>order book · paredes que cercam o preço</small></span><i class="dvl-vt-state" id="dvlLiqBandsState">OFF</i>';
      var pill=item.querySelector("#dvlLiqBandsState");
      if(pill) pill.addEventListener("click",function(ev){ ev.preventDefault(); ev.stopPropagation(); toggle(); });
      item.addEventListener("click",function(ev){ ev.stopPropagation(); openPanel(); });
    }
    placeItem(menu,item); updateItem();
  }
  function toggle(){ state.on=!state.on; persist(); updateItem(); if(state.on){ ensureEngine(); } redraw(); if(panel) renderPanel(); }

  /* ── painel (padrão dvl-vt-*) ────────────────────────────────────────────── */
  var PALETTE=["#ef4444","#22c55e","#22d3ee","#f5c542","#a855f7","#60a5fa","#f97316","#e879f9","#4ade80","#fb7185","#ffffff","#7f91a7"];
  function ensurePanel(){
    if(panel) return panel;
    panel=document.createElement("div"); panel.id="dvlLiqBandsPanel"; panel.className="dvl-vt-panel dvl-liqbands-panel"; panel.setAttribute("data-dvl-ui","true");
    panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>Liquidity Bands</b><small>order book · Deep Heatmap</small></div>'+
      '<div class="dvl-vt-head-actions"><button class="dvl-vt-reset-icon" id="dvlLBReset" type="button" aria-label="Reset">↻</button>'+
      '<button class="dvl-vt-close" id="dvlLBClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlLBBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown",function(ev){ ev.stopPropagation(); },true);
    panel.querySelector("#dvlLBClose").addEventListener("click",closePanel);
    panel.querySelector("#dvlLBReset").addEventListener("click",reset);
    return panel;
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ closePalette(); if(panel)panel.classList.remove("is-open"); }
  function reset(){ state=clone(DEFAULTS); persist(); updateItem(); redraw(); renderPanel(); }
  function field(l,c){ return '<div class="dvl-vt-field"><label>'+l+'</label>'+c+'</div>'; }
  function sw(id,on){ return '<label class="dvl-switch"><input id="'+id+'" type="checkbox"'+(on?' checked':'')+'><i></i><b></b></label>'; }
  function numIn(id,val,mn,mx,st){ return '<input class="dvl-vt-input" id="'+id+'" type="number" min="'+mn+'" max="'+mx+'" step="'+(st||1)+'" value="'+val+'">'; }
  function sel(id,list,cur){ return '<select class="dvl-vt-select" id="'+id+'">'+list.map(function(v){return '<option value="'+v+'"'+(String(v)===String(cur)?' selected':'')+'>'+v+'</option>';}).join('')+'</select>'; }
  function colorBtn(k,c){ return '<button type="button" class="dvl-ma-color-btn" data-clr="'+k+'"><i style="background:'+c+'"></i></button>'; }
  function section(t,inner){ return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>'+t+'</span></div><div class="dvl-vt-grid">'+inner+'</div></div>'; }
  function renderPanel(){
    ensurePanel();
    var b=panel.querySelector("#dvlLBBody");
    b.innerHTML=
      section("Geral",
        field("Ativado", sw("lbOn",state.on))+
        field("Alcance %", numIn("lbRange",state.rangePct,0.05,5,0.05))+
        field("Notional mín ($)", numIn("lbMinN",state.minNotional,5000,5000000,5000))+
        field("Suavização", sel("lbSmooth",["0","4","8","12","20"],String(state.smoothBars)))+
        field("Espessura", sel("lbW",["1","2","3","4","5"],String(state.width)))
      )+
      section("Visual",
        field("Preenchimento", sw("lbFill",state.showFill))+
        field("Marcadores (absorvido/retirado)", sw("lbMk",state.showMarkers))
      )+
      section("Cores",
        field("Parede ASK (topo)", colorBtn("askColor",state.askColor))+
        field("Parede BID (base)", colorBtn("bidColor",state.bidColor))
      )+
      '<div class="dvl-vt-note" style="padding:6px 10px;font:600 10px system-ui;color:#8aa0b6">Usa o motor do Deep Heatmap (liga sozinho ao ativar).</div>';
    var bind=function(id,ev,fn){ var e=b.querySelector("#"+id); if(e)e.addEventListener(ev,fn); };
    var commit=function(){ persist(); updateItem(); cache.ver=-1; redraw(); };
    bind("lbOn","change",function(e){ state.on=e.target.checked; if(state.on)ensureEngine(); commit(); });
    bind("lbRange","change",function(e){ state.rangePct=clampN(e.target.value,0.05,5,DEFAULTS.rangePct); commit(); });
    bind("lbMinN","change",function(e){ state.minNotional=clampN(e.target.value,5000,5e7,DEFAULTS.minNotional); commit(); });
    bind("lbSmooth","change",function(e){ state.smoothBars=clampN(e.target.value,0,60,DEFAULTS.smoothBars); commit(); });
    bind("lbW","change",function(e){ state.width=clampN(e.target.value,1,5,DEFAULTS.width); persist(); redraw(); });
    bind("lbFill","change",function(e){ state.showFill=e.target.checked; persist(); redraw(); });
    bind("lbMk","change",function(e){ state.showMarkers=e.target.checked; cache.ver=-1; persist(); redraw(); });
    b.querySelectorAll(".dvl-ma-color-btn").forEach(function(btn){ btn.addEventListener("click",function(ev){ ev.stopPropagation(); openPalette(btn,btn.dataset.clr); }); });
    updateItem();
  }
  function openPalette(btn,key){
    closePalette(); paletteKey=key;
    palette=document.createElement("div"); palette.className="dvl-ma-palette";
    palette.style.cssText="position:fixed;z-index:100001;display:flex;flex-wrap:wrap;gap:6px;max-width:180px;padding:8px;border-radius:10px;background:rgba(10,16,22,.97);border:1px solid rgba(34,211,238,.4);box-shadow:0 8px 24px rgba(0,0,0,.5);";
    PALETTE.forEach(function(c){ var cell=document.createElement("button"); cell.type="button"; cell.style.cssText="width:20px;height:20px;border-radius:5px;border:1px solid rgba(255,255,255,.25);cursor:pointer;background:"+c+";"; cell.addEventListener("click",function(){ if(isHex(c)){ state[paletteKey]=c; persist(); redraw(); renderPanel(); } closePalette(); }); palette.appendChild(cell); });
    document.body.appendChild(palette);
    var r=btn.getBoundingClientRect(); palette.style.left=Math.min(window.innerWidth-190,Math.max(6,r.left))+"px"; palette.style.top=(r.bottom+6)+"px";
    setTimeout(function(){ document.addEventListener("pointerdown",outsidePalette,true); },0);
  }
  function outsidePalette(e){ if(palette&&!palette.contains(e.target)&&!(e.target.closest&&e.target.closest(".dvl-ma-color-btn"))) closePalette(); }
  function closePalette(){ if(palette){ try{ palette.remove(); }catch(_){} palette=null; } document.removeEventListener("pointerdown",outsidePalette,true); }

  /* ── boot (retry + observer + reinsere ao abrir Indicators) ──────────────── */
  function homed(){ return !!document.getElementById("dvlLiqBandsItem"); }
  function boot(){
    var tries=0;
    (function attempt(){ insertItem(); if(homed())return; if(tries++<80)setTimeout(attempt,250); })();
    try{ var mo=new MutationObserver(function(){ if(!homed())insertItem(); }); mo.observe(document.documentElement,{childList:true,subtree:true}); setTimeout(function(){ try{mo.disconnect();}catch(_){} },30000); }catch(_){}
    try{ document.addEventListener("click",function(ev){ try{ if(ev.target&&ev.target.closest&&ev.target.closest("#toggleIndicators")) setTimeout(insertItem,0); }catch(_){} },true); }catch(_){}
    if(state.on) ensureEngine();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();

  window.DVLLiquidityBandsDraw = draw;
  window.DVL_LIQ_BANDS_API = { get state(){return state;}, on:function(){return !!state.on;}, setOn:function(v){ state.on=!!v; persist(); updateItem(); if(state.on)ensureEngine(); redraw(); if(panel)renderPanel(); }, open:openPanel, openPanel:openPanel, toggle:toggle };
})();
