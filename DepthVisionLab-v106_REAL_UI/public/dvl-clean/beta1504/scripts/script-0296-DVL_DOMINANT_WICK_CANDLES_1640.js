/* script-0296-DVL_DOMINANT_WICK_CANDLES_1640.js
   DVL Dominant Wick Candles (DWC) — renderer de candles overlay. Em candles com
   VOLUME acima da média configurável, o MAIOR pavio vira o novo corpo e a
   direção do candle passa a ser definida pelo pavio dominante (não pela cor
   original). Camada 100% VISUAL/derivada: NÃO altera o OHLCV base do ativo — os
   demais indicadores/Risk/Replay seguem lendo a série original. Usa a mesma
   fonte de candles que o gráfico exibe (live ou replay) via o draw hook do core.
   Segue o protocolo DVL: toggle, registro Phase1B, painel dvl-vt-*, persistência.

   Regra (spec do usuário):
     bodyTop=max(open,close); bodyBottom=min(open,close)
     upperWick=high-bodyTop;  lowerWick=bodyBottom-low
     só transforma se volume > média (baseline dos N candles anteriores)
     empate de pavios (upper==lower) → mantém original
     lowerWick>upperWick → BULL: open=low, close=bodyBottom, high, low
     upperWick>lowerWick → BEAR: open=high, close=bodyTop, high, low
     o lado que virou corpo deixa de aparecer como pavio (candle fica com 1 pavio). */
(function(){
  "use strict";
  if(window.DVLDominantWickCandles) return;
  var KEY="dvl_dwc_v1";
  var DEFAULTS={
    on:false,
    // Volume Filter
    useVolumeFilter:true, volMaType:"SMA", volMaPeriod:20,
    // Rendering
    renderMode:"replace",          // replace | overlay | markers
    // Visual
    bullColor:"#22c55e", bearColor:"#ef4444",
    bodyWidthScale:1.0, overlayAlpha:0.5, bgColor:"#020806", markerSize:6
  };
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clampN(v,a,b,d){ v=Number(v); if(!Number.isFinite(v)) v=d; return Math.max(a,Math.min(b,v)); }
  function isHex(s){ return /^#[0-9a-f]{6}$/i.test(String(s||"")); }
  function normalize(s){
    var o=clone(DEFAULTS);
    if(s&&typeof s==="object"){
      o.on=!!s.on;
      o.useVolumeFilter=s.useVolumeFilter!==false;
      o.volMaType=(s.volMaType==="EMA")?"EMA":"SMA";
      o.volMaPeriod=Math.round(clampN(s.volMaPeriod,1,500,DEFAULTS.volMaPeriod));
      o.renderMode=({replace:1,overlay:1,markers:1}[s.renderMode])?s.renderMode:"replace";
      o.bullColor=isHex(s.bullColor)?s.bullColor:DEFAULTS.bullColor;
      o.bearColor=isHex(s.bearColor)?s.bearColor:DEFAULTS.bearColor;
      o.bodyWidthScale=clampN(s.bodyWidthScale,0.3,2,DEFAULTS.bodyWidthScale);
      o.overlayAlpha=clampN(s.overlayAlpha,0.1,1,DEFAULTS.overlayAlpha);
      o.bgColor=isHex(s.bgColor)?s.bgColor:DEFAULTS.bgColor;
      o.markerSize=Math.round(clampN(s.markerSize,3,14,DEFAULTS.markerSize));
    }
    return o;
  }
  function load(){ try{ return normalize(JSON.parse(localStorage.getItem(KEY)||"null")); }catch(_){ return clone(DEFAULTS); } }
  function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){} }

  var state=load(), panel=null;
  var volCache={ ref:null, period:0, type:"", map:null };

  function redraw(){ if(typeof drawSoon==="function"){ try{ drawSoon(); }catch(_){} } }

  /* baseline de volume EXCLUINDO o candle atual (média dos N anteriores). Assim
     a média fica estável intrabar e o candle em formação pode "cruzar" a média
     conforme o volume dele cresce. Cacheado por referência da série. */
  function volBaselineMap(){
    var ks=(typeof klines!=="undefined" && Array.isArray(klines))?klines:[];
    if(volCache.ref===ks && volCache.period===state.volMaPeriod && volCache.type===state.volMaType && volCache.map) return volCache.map;
    var n=ks.length, P=state.volMaPeriod, map={};
    if(state.volMaType==="EMA"){
      var k=2/(P+1), ema=null;
      for(var i=0;i<n;i++){
        map[ks[i].time]= (i===0? null : ema); // baseline = EMA até i-1
        var v=Number(ks[i].volume)||0; ema = (ema==null)? v : v*k+ema*(1-k);
      }
    } else {
      var sum=0;
      for(var j=0;j<n;j++){
        var cnt=Math.min(j,P);
        map[ks[j].time]= (cnt>0? sum/cnt : null); // baseline = média dos até P anteriores (exclui j)
        sum += Number(ks[j].volume)||0;
        if(j>=P) sum -= Number(ks[j-P].volume)||0;
      }
    }
    volCache={ ref:ks, period:P, type:state.volMaType, map:map };
    return map;
  }

  /* Transforma um candle. Retorna {o,h,l,c,dir} derivado ou null (mantém original). */
  function transform(c, baseVol){
    var o=+c.open, h=+c.high, l=+c.low, cl=+c.close, vol=+c.volume;
    if(!Number.isFinite(o)||!Number.isFinite(h)||!Number.isFinite(l)||!Number.isFinite(cl)) return null;
    if(state.useVolumeFilter){ if(baseVol==null || !(vol>baseVol)) return null; } // volume não supera a média
    var bodyTop=Math.max(o,cl), bodyBottom=Math.min(o,cl);
    var upper=h-bodyTop, lower=bodyBottom-l;
    if(upper===lower) return null;            // empate → original
    if(upper<=0 && lower<=0) return null;
    if(lower>upper) return { o:l, c:bodyBottom, h:h, l:l, dir:"bull" }; // pavio inferior dominante
    return { o:h, c:bodyTop, h:h, l:l, dir:"bear" };                    // pavio superior dominante
  }

  /* ── draw hook (chamado pelo render do core, DEPOIS dos candles) ─────────── */
  function draw(ctx, cfg){
    try{
      if(!state.on || !cfg || !cfg.view || typeof cfg.x!=="function" || typeof cfg.y!=="function") return;
      var view=cfg.view, so=Number(cfg.slotOffset)||0;
      var cw=Math.max(1.6, (Number(cfg.candleW)||3)*state.bodyWidthScale);
      var X=cfg.x, Y=cfg.y;
      var x0=Number(cfg.x0)||0, x1=Number(cfg.x1)||99999;
      var baseMap = state.useVolumeFilter ? volBaselineMap() : null;
      ctx.save();
      ctx.lineJoin="miter"; ctx.lineCap="butt";
      for(var i=0;i<view.length;i++){
        var c=view[i]; if(!c) continue;
        var cx=X(so+i);
        if(cx<x0-cw || cx>x1+cw) continue;
        var baseVol = baseMap ? baseMap[c.time] : null;
        var d=transform(c, baseVol);
        if(!d) continue; // mantém o candle original (o core já desenhou)
        var color = d.dir==="bull" ? state.bullColor : state.bearColor;
        var yHi=Y(d.h), yLo=Y(d.l), yO=Y(d.o), yC=Y(d.c);
        var bt=Math.min(yO,yC), bb=Math.max(yO,yC), bodyH=Math.max(1,bb-bt);

        if(state.renderMode==="markers"){
          // só um marcador de direção, sem redesenhar o candle
          var ms=state.markerSize;
          ctx.fillStyle=color; ctx.globalAlpha=0.95; ctx.beginPath();
          if(d.dir==="bull"){ var by=yLo+ms+3; ctx.moveTo(cx,by-ms); ctx.lineTo(cx-ms*0.8,by); ctx.lineTo(cx+ms*0.8,by); }
          else { var ty=yHi-ms-3; ctx.moveTo(cx,ty+ms); ctx.lineTo(cx-ms*0.8,ty); ctx.lineTo(cx+ms*0.8,ty); }
          ctx.closePath(); ctx.fill(); ctx.globalAlpha=1;
          continue;
        }

        if(state.renderMode==="replace"){
          // apaga o candle original (fundo do chart) na coluna dele
          ctx.fillStyle=state.bgColor;
          ctx.fillRect(cx-cw/2-1.5, Math.min(yHi,yLo)-1, cw+3, Math.abs(yLo-yHi)+2);
        }
        // pavio remanescente único (a linha vai high↔low; o corpo cobre o lado que virou corpo)
        ctx.globalAlpha = (state.renderMode==="overlay") ? state.overlayAlpha : 1;
        ctx.strokeStyle=color; ctx.lineWidth=1.3;
        ctx.beginPath(); ctx.moveTo(cx, yHi); ctx.lineTo(cx, yLo); ctx.stroke();
        ctx.fillStyle=color;
        ctx.fillRect(cx-cw/2, bt, cw, bodyH);
        ctx.globalAlpha=1;
      }
      ctx.restore();
    }catch(_){ try{ctx.restore();}catch(__){} }
  }

  /* ── menu (Phase1B registra; aqui o row legado + pill p/ o pill do menu) ─── */
  function updateItem(){ var st=document.getElementById("dvlDwcState"); if(st){ st.textContent=state.on?"ON":"OFF"; st.classList.toggle("is-on",!!state.on); } }
  function placeItem(menu,item){
    var anchor=document.getElementById("dvlVwapSessionItem")||document.getElementById("dvlMovingAveragesItem");
    if(anchor&&anchor.parentNode){ if(anchor.nextSibling!==item)anchor.parentNode.insertBefore(item,anchor.nextSibling); return; }
    if(menu.firstChild!==item)menu.insertBefore(item,menu.firstChild);
  }
  function insertItem(){
    var menu=document.getElementById("indicatorDropdown"); if(!menu) return;
    var item=document.getElementById("dvlDwcItem");
    if(!item){
      item=document.createElement("div"); item.id="dvlDwcItem"; item.className="indicatorItem dvl-dwc-indicator-item";
      item.innerHTML='<span class="indicatorFxMark">DWC</span><span><b>Dominant Wick Candles</b><small>maior pavio vira corpo · filtro de volume</small></span><i class="dvl-vt-state" id="dvlDwcState">OFF</i>';
      var pill=item.querySelector("#dvlDwcState");
      if(pill) pill.addEventListener("click",function(ev){ ev.preventDefault(); ev.stopPropagation(); toggle(); });
      item.addEventListener("click",function(ev){ ev.stopPropagation(); openPanel(); });
    }
    placeItem(menu,item); updateItem();
  }

  function setOn(v){ state.on=(v===undefined)?!state.on:!!v; persist(); updateItem(); redraw(); }
  function toggle(){ setOn(); }

  /* ── painel dvl-vt-* (Main / Volume Filter / Rendering / Visual) ─────────── */
  function seg(id,cur,opts){
    return '<div class="dwc-seg" data-dwc-seg="'+id+'">'+opts.map(function(o){
      return '<button type="button" data-val="'+o[0]+'" class="'+(String(cur)===String(o[0])?"is-on":"")+'">'+o[1]+'</button>';
    }).join("")+'</div>';
  }
  function step(id,val,min,max,st,suf){
    return '<div class="dwc-step" data-dwc-step="'+id+'" data-min="'+min+'" data-max="'+max+'" data-step="'+st+'">'
      +'<button type="button" data-dir="-1">−</button>'
      +'<input type="text" inputmode="decimal" value="'+val+(suf||"")+'" data-dwc-num="'+id+'">'
      +'<button type="button" data-dir="1">+</button></div>';
  }
  function colorField(id,val){ return '<input type="color" class="dwc-color" value="'+val+'" data-dwc-color="'+id+'">'; }
  function bodyHTML(){
    return ''
    + '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Main</span></div><div class="dvl-vt-grid">'
      + '<div class="dvl-vt-field"><label>Indicador</label><label class="dvl-switch"><input id="dwcOn" type="checkbox"'+(state.on?" checked":"")+'><i></i><b></b></label></div>'
    + '</div></div>'
    + '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Volume Filter</span></div><div class="dvl-vt-grid">'
      + '<div class="dvl-vt-field"><label>Usar filtro de volume</label><label class="dvl-switch"><input id="dwcVolOn" type="checkbox"'+(state.useVolumeFilter?" checked":"")+'><i></i><b></b></label></div>'
      + '<div class="dvl-vt-field"><label>Tipo da média</label>'+seg("volMaType",state.volMaType,[["SMA","SMA"],["EMA","EMA"]])+'</div>'
      + '<div class="dvl-vt-field"><label>Período</label>'+step("volMaPeriod",state.volMaPeriod,1,500,1,"")+'</div>'
    + '</div><div class="dvl-vt-note">Só transforma candles com volume ACIMA da média dos '+state.volMaPeriod+' candles anteriores.</div></div>'
    + '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Rendering</span></div><div class="dvl-vt-grid">'
      + '<div class="dvl-vt-field" style="grid-column:1/-1"><label>Modo de render</label>'+seg("renderMode",state.renderMode,[["replace","Replace"],["overlay","Overlay"],["markers","Markers"]])+'</div>'
    + '</div><div class="dvl-vt-note">Replace substitui o candle visualmente · Overlay desenha por cima · Markers só marca a direção.</div></div>'
    + '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Visual</span></div><div class="dvl-vt-grid">'
      + '<div class="dvl-vt-field"><label>Cor comprador</label>'+colorField("bullColor",state.bullColor)+'</div>'
      + '<div class="dvl-vt-field"><label>Cor vendedor</label>'+colorField("bearColor",state.bearColor)+'</div>'
      + '<div class="dvl-vt-field"><label>Largura do corpo</label>'+step("bodyWidthScale",state.bodyWidthScale,0.3,2,0.1,"")+'</div>'
      + '<div class="dvl-vt-field"><label>Opacidade (Overlay)</label>'+step("overlayAlpha",state.overlayAlpha,0.1,1,0.05,"")+'</div>'
      + '<div class="dvl-vt-field"><label>Fundo (Replace)</label>'+colorField("bgColor",state.bgColor)+'</div>'
      + '<div class="dvl-vt-field"><label>Tamanho marcador</label>'+step("markerSize",state.markerSize,3,14,1,"")+'</div>'
    + '</div></div>';
  }
  function renderPanel(){ if(!panel) return; var b=panel.querySelector("#dwcBody"); if(!b) return; b.innerHTML=bodyHTML(); bind(b); }
  function bind(b){
    var on=b.querySelector("#dwcOn"); if(on) on.addEventListener("change",function(){ setOn(on.checked); });
    var vo=b.querySelector("#dwcVolOn"); if(vo) vo.addEventListener("change",function(){ state.useVolumeFilter=vo.checked; persist(); redraw(); renderPanel(); });
    b.querySelectorAll("[data-dwc-seg]").forEach(function(sg){ sg.querySelectorAll("button").forEach(function(btn){ btn.addEventListener("click",function(){
      var key=sg.getAttribute("data-dwc-seg"); state[key]=btn.getAttribute("data-val"); persist(); redraw(); renderPanel();
    }); }); });
    b.querySelectorAll("[data-dwc-step]").forEach(function(sp){
      var key=sp.getAttribute("data-dwc-step"), min=Number(sp.getAttribute("data-min")), max=Number(sp.getAttribute("data-max")), st=Number(sp.getAttribute("data-step"));
      function set(v){ v=Math.max(min,Math.min(max, v)); if(st>=1) v=Math.round(v); else v=Math.round(v/st)*st; v=Number(v.toFixed(4)); state[key]=v; persist(); redraw(); renderPanel(); }
      sp.querySelectorAll("button").forEach(function(btn){ btn.addEventListener("click",function(){ set(Number(state[key])+Number(btn.getAttribute("data-dir"))*st); }); });
      var inp=sp.querySelector("[data-dwc-num]"); if(inp) inp.addEventListener("change",function(){ var v=parseFloat(String(inp.value).replace(",",".")); if(Number.isFinite(v)) set(v); else renderPanel(); });
    });
    b.querySelectorAll("[data-dwc-color]").forEach(function(cl){ cl.addEventListener("input",function(){ var key=cl.getAttribute("data-dwc-color"); if(isHex(cl.value)){ state[key]=cl.value; persist(); redraw(); } }); });
  }
  function openPanel(){
    injectCSS();
    if(!panel){
      panel=document.createElement("div"); panel.id="dvlDwcPanel"; panel.className="dvl-vt-panel dvl-dwc-panel"; panel.setAttribute("data-dvl-ui","true");
      panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>Dominant Wick Candles</b><small>maior pavio vira corpo · filtro de volume</small></div>'
        +'<div class="dvl-vt-head-actions"><button class="dvl-vt-reset-icon" id="dwcReset" type="button" aria-label="Reset">↻</button>'
        +'<button class="dvl-vt-close" id="dwcClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dwcBody"></div>';
      document.body.appendChild(panel);
      panel.addEventListener("pointerdown",function(e){ e.stopPropagation(); },true);
      panel.querySelector("#dwcClose").addEventListener("click",function(){ panel.classList.remove("is-open"); });
      panel.querySelector("#dwcReset").addEventListener("click",function(){ state=clone(DEFAULTS); state.on=true; persist(); updateItem(); redraw(); renderPanel(); });
    }
    renderPanel(); panel.classList.add("is-open");
  }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }

  function injectCSS(){
    if(document.getElementById("dvlDwcCSS1640")) return;
    var st=document.createElement("style"); st.id="dvlDwcCSS1640";
    st.textContent=[
      ".dwc-seg{display:flex;gap:4px}",
      ".dwc-seg button{flex:1;height:30px;border:1px solid rgba(94,135,178,.24);background:rgba(7,18,14,.7);color:#bcd3e2;font:800 10px system-ui;border-radius:9px;cursor:pointer}",
      ".dwc-seg button.is-on{color:#021018;border-color:rgba(16,223,119,.5);background:linear-gradient(180deg,#10df77,#13dc8d)}",
      ".dwc-step{display:flex;align-items:center;gap:4px}",
      ".dwc-step button{width:28px;height:30px;flex:0 0 auto;border:1px solid rgba(94,135,178,.24);background:rgba(7,18,14,.7);color:#dfeeff;font:800 14px/1 system-ui;border-radius:9px;cursor:pointer}",
      ".dwc-step input{flex:1;min-width:0;height:30px;text-align:center;border:1px solid rgba(94,135,178,.24);border-radius:9px;background:rgba(7,18,14,.78);color:#dfeeff;font:850 11px system-ui;outline:none}",
      ".dwc-color{width:100%;height:30px;border:1px solid rgba(94,135,178,.24);border-radius:9px;background:rgba(7,18,14,.78);padding:2px;cursor:pointer}"
    ].join("\n");
    (document.head||document.documentElement).appendChild(st);
  }

  function boot(){
    insertItem(); updateItem();
    // à prova de rebuild do menu
    var n=0, iv=setInterval(function(){ insertItem(); if(++n>20) clearInterval(iv); }, 1000);
    try{ var mo=new MutationObserver(function(){ insertItem(); }); mo.observe(document.documentElement,{childList:true,subtree:true}); setTimeout(function(){ try{mo.disconnect();}catch(_){}} ,30000); }catch(_){}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();

  window.DVLDominantWickCandles={
    version:"1.640",
    get state(){ return state; },
    isOn:function(){ return !!state.on; },
    on:function(){ return !!state.on; },
    setOn:setOn, toggle:toggle,
    open:openPanel, openPanel:openPanel,
    transform:transform,
    draw:draw
  };
  window.DVLDominantWickCandlesDraw=draw;
})();
