/* ── DVL BUBBLES — indicador overlay nativo (Big Trades · Volume Bubbles · Deep Proxy)
   Portado do protótipo Bubbles Lab para dentro do gráfico do DVL: um único módulo,
   registrado no menu Indicators, desenhado sobre o gráfico principal pela MESMA função
   de desenho dos outros overlays (window.DVLBubblesDraw), ancorado a preço+tempo pelas
   transforms oficiais (x(slotOffset+i), y(price)). Consome o feed @aggTrade que já existe
   (fan-out via window.DVL_TRADE_FEED) — sem abrir WebSocket novo. 100% leitura. */
(function(){
  "use strict";
  if(window.__DVL_BUBBLES_ON) return; window.__DVL_BUBBLES_ON=true;

  var LS="dvl.indicator.bubbles.v1";
  var DEF={
    on:false, mode:"big", bubbleMode:"split", visualStyle:"tape", labelMetric:"notional",
    filterMode:"auto", intensity:"medium", minNotional:50000,
    grouping:"auto", timeWindow:400, priceBucketMode:"auto", priceBucket:0,
    scale:"sqrt", minSize:6, maxSize:36, opacity:0.72,
    outlineWidth:1.6, traces:true, traceLen:18,
    merge:true, mergeTight:0.85,
    zones:false, labels:true, bubble3d:false
  };
  var st=(function(){
    try{
      var saved=JSON.parse(localStorage.getItem(LS)||"{}")||{}, o={};
      for(var k in DEF) o[k]=(k in saved)?saved[k]:DEF[k];
      /* Migração visual única: configurações antigas ganham o preset Tape sem apagar
         filtro, agrupamento, tamanho e estado ON/OFF que o usuário já tinha. */
      if(!("visualStyle" in saved)){ o.visualStyle="tape"; o.labels=true; o.traces=true; }
      return o;
    }catch(_){ var d={}; for(var k2 in DEF) d[k2]=DEF[k2]; return d; }
  })();
  var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ try{ localStorage.setItem(LS,JSON.stringify(st)); }catch(_){} },140); updateItem(); }
  function reset(){ for(var k in DEF) st[k]=DEF[k]; try{ localStorage.setItem(LS,JSON.stringify(st)); }catch(_){} updateItem(); if(panel) renderPanel(); requestDraw(); }

  /* ── globals do app (let → por identificador com guarda) ── */
  function gsym(){ try{ if(typeof symbol!=="undefined"&&symbol) return String(symbol).toUpperCase(); }catch(_){} try{ if(window.ticker&&window.ticker.symbol) return String(window.ticker.symbol).toUpperCase(); }catch(_){} return "BTCUSDT"; }
  function candles(){ try{ if(typeof klines!=="undefined"&&Array.isArray(klines)) return klines; }catch(_){} try{ if(Array.isArray(window.klines)) return window.klines; }catch(_){} return []; }
  function requestDraw(){ try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){} try{ if(typeof window.drawSoon==="function") window.drawSoon(); }catch(_){} }

  /* ── feed compartilhado (fan-out do @aggTrade existente) ─────────────────── */
  var RAW_MAX=5000, GROUP_MAX=9000;   // segura ~2h de bolhas de 1s + ao vivo
  function api(p){ try{ var br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023; if(br&&typeof br.api==="function") return br.api(p); }catch(_){} return p; }
  var raw=[];              // ring buffer de trades normalizados
  var groups=[];           // ring buffer de grupos agregados (ordenados por firstTs)
  var groupIndex={};       // key -> group (só do bucket de tempo corrente p/ merge rápido)
  var curSym=gsym();
  var recentNotional=[];   // janela móvel de nocional de grupos p/ threshold automático
  var RECENT_MAX=1500;
  var _dbg={ trades:0, drawCalls:0, visibleGroups:0, shown:0, drawn:0, skipY:0, skipX:0, seeded:0, lastTradeTs:0, lastDrawTs:0 };

  function twMs(){ if(st.grouping==="time") return Math.max(100, Math.min(3000, +st.timeWindow||400)); return 450; /* auto */ }
  function priceBucketFor(price){
    if(st.grouping==="price" && +st.priceBucket>0) return +st.priceBucket;
    /* auto: ~2 casas do tick relativo ao preço/volatilidade */
    var p=price||1; var step=Math.pow(10, Math.floor(Math.log10(p))-3); return Math.max(step, p*0.0002);
  }
  function keyOf(ts, price){ return Math.floor(ts/twMs())+"|"+Math.round(price/priceBucketFor(price)); }

  function pushGroup(g){ groups.push(g); if(groups.length>GROUP_MAX) groups.shift();
    recentNotional.push(g.buyN+g.sellN); if(recentNotional.length>RECENT_MAX) recentNotional.shift(); }

  /* API pública do módulo (spec §5.1) */
  window.DVL_BUBBLES={
    version:"1.348",
    get enabled(){ return !!st.on; }, get mode(){ return st.mode; }, get bubbleMode(){ return st.bubbleMode; },
    get trades(){ return raw; }, get groups(){ return groups; }, get settings(){ return st; },
    ingestTrade:function(t){
      if(!st.on || !t || !(t.price>0) || !(t.qty>0)) return;
      if(t.symbol && t.symbol!==curSym){ return; }
      raw.push(t); if(raw.length>RAW_MAX) raw.shift();
      _dbg.trades++; _dbg.lastTradeTs=t.ts;
      var k=keyOf(t.ts, t.price);
      var g=groupIndex[k];
      if(!g || (t.ts-g.firstTs)>twMs()*1.5){
        g={ key:k, firstTs:t.ts, lastTs:t.ts, buyN:0, sellN:0, buyQ:0, sellQ:0, qty:0, pxQty:0,
            priceMin:t.price, priceMax:t.price, rawCount:0, maxSingle:0 };
        groupIndex[k]=g; pushGroup(g);
      }
      if(t.side==="buy"){ g.buyN+=t.notional; g.buyQ+=t.qty; } else { g.sellN+=t.notional; g.sellQ+=t.qty; }
      g.qty+=t.qty; g.pxQty+=t.price*t.qty; g.rawCount+=(t.rawCount||1);
      if(t.notional>g.maxSingle) g.maxSingle=t.notional;
      if(t.price<g.priceMin) g.priceMin=t.price; if(t.price>g.priceMax) g.priceMax=t.price;
      g.lastTs=t.ts;
    },
    recompute:function(){ /* agregação é incremental; nada a fazer aqui */ },
    render:function(ctx,vp){ drawOverlay(ctx,vp); },
    hitTest:function(x,y){ return hitAt(x,y); },
    setSymbol:function(sym){ sym=String(sym||"").toUpperCase(); if(sym && sym!==curSym){ curSym=sym; raw=[]; groups=[]; groupIndex={}; recentNotional=[]; if(st.on){ openFeed(); seedHistory(); } requestDraw(); } },
    destroy:function(){ closeFeed(); raw=[]; groups=[]; groupIndex={}; recentNotional=[]; }
  };
  /* normaliza um evento aggTrade cru (spec §5.3) e ingere */
  function ingestRaw(d){
    if(!d || d.e!=="aggTrade") return;
    var price=+d.p, qty=+d.q; if(!(price>0)||!(qty>0)) return;
    window.DVL_BUBBLES.ingestTrade({ ts:+d.T||Date.now(), symbol:String(d.s||"").toUpperCase(), price:price, qty:qty,
      notional:price*qty, side:d.m?"sell":"buy", firstId:+d.f, lastId:+d.l, rawCount:(+d.l-+d.f+1)||1 });
  }
  /* fan-out do @aggTrade do CORE (futuros). Ignorado quando o feed PRÓPRIO já está
     ativo, pra não contar em dobro. Serve de fallback quando o próprio não subiu. */
  window.DVL_TRADE_FEED={ _emit:function(d){ try{ if(window.__DVL_BUB_OWN_FEED) return; ingestRaw(d); }catch(_){} }, subscribe:function(){} };

  /* ── FEED PRÓPRIO resiliente ────────────────────────────────────────────
     O @aggTrade de FUTUROS (fstream.binance.com) é bloqueado em algumas regiões
     (ex.: Brasil), então o feed do core pode nunca chegar. Aqui abrimos UM WS por
     símbolo, tentando futuros e caindo pra SPOT (stream.binance.com, acessível no
     Brasil). Só liga quando o indicador está ON; fecha no OFF/troca de símbolo. */
  var _feedWs=null, _feedSymL="", _feedIdx=0, _feedSrc="";
  var FEED_URLS=[
    { src:"futures", url:function(s){ return "wss://fstream.binance.com/ws/"+s+"@aggTrade"; } },
    { src:"spot",    url:function(s){ return "wss://stream.binance.com:9443/ws/"+s+"@aggTrade"; } }
  ];
  function closeFeed(){ if(_feedWs){ try{ _feedWs.onclose=null; _feedWs.close(); }catch(_){} _feedWs=null; } window.__DVL_BUB_OWN_FEED=false; _feedSrc=""; }
  function openFeed(){ if(!st.on) return; var s=gsym().toLowerCase(); if(_feedWs && _feedSymL===s && _feedWs.readyState<2) return; closeFeed(); _feedSymL=s; _feedIdx=0; tryFeed(s,0); }
  function tryFeed(s, idx){
    if(!st.on || s!==gsym().toLowerCase()) return;
    if(idx>=FEED_URLS.length){ window.__DVL_BUB_OWN_FEED=false; _feedSrc=""; setTimeout(function(){ if(st.on && s===gsym().toLowerCase()) tryFeed(s,0); }, 6000); return; }  // esgotou → tenta de novo depois
    var cfg=FEED_URLS[idx], ws;
    try{ ws=new WebSocket(cfg.url(s)); }catch(_){ tryFeed(s, idx+1); return; }
    _feedWs=ws; var got=false;
    var timer=setTimeout(function(){ if(!got){ try{ ws.onclose=null; ws.close(); }catch(_){} tryFeed(s, idx+1); } }, 4500);
    ws.onopen=function(){ window.__DVL_BUB_OWN_FEED=true; _feedSrc=cfg.src; };
    ws.onmessage=function(ev){ got=true; if(timer){ clearTimeout(timer); timer=0; } try{ ingestRaw(JSON.parse(ev.data)); }catch(_){} };
    ws.onerror=function(){};
    ws.onclose=function(){ if(_feedWs===ws){ _feedWs=null; window.__DVL_BUB_OWN_FEED=false; } if(timer){ clearTimeout(timer); timer=0; }
      if(st.on && s===gsym().toLowerCase()){ setTimeout(function(){ if(got) openFeed(); else tryFeed(s, idx+1); }, 1500); } };
  }

  /* ── histórico (~2h) do backend, pra abrir já com bolhas ── */
  var _seedT=0;
  function seedHistory(){
    if(!st.on) return; var sym=gsym(); var t0=Date.now(); _seedT=t0;
    fetch(api("/api/dvl/bubbles/history?symbol="+encodeURIComponent(sym)+"&mins=120"),{cache:"no-store"})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(j){
        if(!j||!j.ok||!Array.isArray(j.groups)||sym!==gsym()||_seedT!==t0) return;
        var hist=j.groups.map(function(g){ var p=+g.price||0, bN=+g.buyN||0, sN=+g.sellN||0, totN=bN+sN, rc=+g.rawCount||1;
          return { key:"h"+g.ts, firstTs:+g.ts, lastTs:(+g.ts)+999, buyN:bN, sellN:sN,
            buyQ:p>0?bN/p:0, sellQ:p>0?sN/p:0, qty:+g.qty||0, pxQty:p*(+g.qty||0),
            priceMin:p, priceMax:p, rawCount:rc, maxSingle:totN/rc }; });
        hist.sort(function(a,b){ return a.firstTs-b.firstTs; });   /* garante ordem cronológica */
        var histEnd=hist.length?hist[hist.length-1].lastTs:0;
        var live=groups.filter(function(g){ return g.firstTs>histEnd; });
        groups=hist.concat(live);
        groups.sort(function(a,b){ return a.firstTs-b.firstTs; });
        if(groups.length>GROUP_MAX) groups=groups.slice(groups.length-GROUP_MAX);
        _dbg.seeded=hist.length;
        requestDraw();
      }).catch(function(){});
  }

  /* ── threshold significativo (spec §8): manual OU auto por percentil sobre janela ── */
  var PCTL={ low:0.90, medium:0.96, strong:0.985 };
  function threshold(){
    if(st.filterMode==="manual") return Math.max(0, +st.minNotional||0);
    var arr=recentNotional; if(arr.length<20) return 0;
    var s=arr.slice().sort(function(a,b){return a-b;});
    var p=PCTL[st.intensity]||0.96; var idx=Math.min(s.length-1, Math.floor(p*s.length));
    return s[idx];
  }
  /* threshold auto ESTÁVEL: percentil sobre TODO o buffer (não só a janela visível),
     em cache ~1.5s. Assim mover/zoom o gráfico não muda o corte → bolhas não somem/voltam. */
  var _thrCache={ t:0, key:"", val:0 };
  function autoThreshold(){
    var key=st.mode+"|"+st.intensity;
    var now=Date.now();
    if(_thrCache.key===key && now-_thrCache.t<1500) return _thrCache.val;
    var n=groups.length, from=Math.max(0,n-4000);
    var s=[];
    for(var i=from;i<n;i++){ var g=groups[i]; var v=st.mode==="big"?Math.max(g.buyN,g.sellN):(g.buyN+g.sellN); if(v>0) s.push(v); }
    var val=0;
    if(s.length>=20){ s.sort(function(a,b){return a-b;}); var pc=PCTL[st.intensity]||0.96; val=s[Math.min(s.length-1,Math.floor(pc*s.length))]||0; }
    _thrCache.t=now; _thrCache.key=key; _thrCache.val=val;
    return val;
  }

  /* ── escala visual (spec §9) ── */
  function radiusFor(notional, scaleMax, floorN){
    var lo=Math.max(0,+floorN||0), hi=Math.max(lo+1,+scaleMax||0);
    var nrm=Math.max(0,Math.min(1,(notional-lo)/(hi-lo))), sc;
    if(st.scale==="linear") sc=nrm; else if(st.scale==="log") sc=Math.log1p(nrm*9)/Math.log(10); else sc=Math.sqrt(nrm);
    var mn=+st.minSize||6, mx=+st.maxSize||36;
    var r=mn+(mx-mn)*sc;
    if(window.innerWidth<=760) r=Math.min(r, mx*0.78);   // mantém leitura sem cobrir o candle inteiro
    return r;
  }

  /* ── cor por token do tema ── */
  function tok(name,fb){ try{ var v=getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v||fb; }catch(_){ return fb; } }
  function rgbaHex(hex,a){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]; var r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16); if(isNaN(r)) return "rgba(120,140,160,"+a+")"; return "rgba("+r+","+g+","+b+","+a+")"; }

  /* ── desenho overlay (chamado pela draw() do app via DVLBubblesDraw) ── */
  var hitList=[];   // {x,y,r,g}
  function bsearchTime(view,t){ var lo=0,hi=view.length-1,ans=-1; while(lo<=hi){ var m=(lo+hi)>>1; if(+view[m].time<=t){ans=m;lo=m+1;}else hi=m-1;} return ans; }

  /* ── MOTOR DE MESCLA (coalesce) ─────────────────────────────────────────────
     Quando muitas bolhas caem na MESMA região da tela (mesmo preço+tempo), elas
     se sobrepõem e viram um borrão ilegível. Este motor agrupa as bolhas que
     ficariam coladas numa só — SOMANDO o fluxo real (buyN/sellN/qty/execuções).
     Isso "faz sentido": uma rajada de prints no mesmo nível JÁ é um único evento
     de agressão/absorção; a mescla só usa um bucket mais grosso quando há
     aglomeração. Greedy ancorado no MAIOR print (semente), acelerado por grade
     de pixels (só vizinhos 3×3), então é barato e estável no pan/zoom.
     A bolha mesclada mantém a mesma forma dos campos de um grupo (o loop de
     desenho e o tooltip consomem sem mudança) + flags _merged/_n. */
  function coalesceBubbles(vis,o,thr){
    var view=o.view, x=o.x, y=o.y, slotOffset=o.slotOffset||0;
    if(!view||!view.length) return vis;
    var vFirst=+view[0].time, vLast=+view[view.length-1].time;
    /* scaleMax provisório (mesmo percentil do desenho) só p/ estimar o raio de mescla */
    var sv=vis.map(function(q){return q.__sig;}).sort(function(a,b){return a-b;});
    var provMax=sv[Math.min(sv.length-1,Math.floor((sv.length-1)*0.92))]||1;
    if(!(provMax>thr)) provMax=thr+1;
    var tight=Math.max(0.3,Math.min(1.6,+st.mergeTight||0.85));
    var cell=Math.max(10,(+st.maxSize||36)*tight);   // grade cobre a maior dist. de mescla em ±1 célula
    var items=[], i, G, t, vi, px, price, cndl, lo, hi, py, r;
    for(i=0;i<vis.length;i++){
      G=vis[i];
      t=G.firstTs;
      if(t<=vFirst) vi=0; else if(t>=vLast) vi=view.length-1; else { vi=bsearchTime(view,t); if(vi<0) vi=0; }
      px=x(slotOffset+vi);
      price=G.pxQty/(G.qty||1);
      cndl=view[vi];
      if(cndl){ lo=+cndl.low; hi=+cndl.high; if(isFinite(lo)&&isFinite(hi)&&hi>=lo){ if(price<lo)price=lo; else if(price>hi)price=hi; } }
      py=y(price);
      r=radiusFor(G.__sig,provMax,thr);
      items.push({px:px,py:py,r:r,G:G,used:false});
    }
    items.sort(function(a,b){ return b.G.__sig-a.G.__sig; });   // sementes = maiores primeiro
    var grid={}, cx, cy, k;
    for(k=0;k<items.length;k++){ var it=items[k]; cx=Math.floor(it.px/cell); cy=Math.floor(it.py/cell); var kk=cx+"|"+cy; (grid[kk]||(grid[kk]=[])).push(it); }
    var out=[], s;
    for(s=0;s<items.length;s++){
      var seed=items[s]; if(seed.used) continue; seed.used=true;
      var g0=seed.G;
      var acc={ key:g0.key, firstTs:g0.firstTs, lastTs:g0.lastTs||g0.firstTs,
        buyN:g0.buyN, sellN:g0.sellN, buyQ:g0.buyQ||0, sellQ:g0.sellQ||0,
        qty:g0.qty||0, pxQty:g0.pxQty||0, rawCount:g0.rawCount||0, maxSingle:g0.maxSingle||0,
        priceMin:g0.priceMin, priceMax:g0.priceMax, _n:1 };
      var cx0=Math.floor(seed.px/cell), cy0=Math.floor(seed.py/cell);
      var mergeDist=Math.max(seed.r*tight, cell*0.5), md2=mergeDist*mergeDist;
      var gx, gy;
      for(gx=cx0-1;gx<=cx0+1;gx++) for(gy=cy0-1;gy<=cy0+1;gy++){
        var bucket=grid[gx+"|"+gy]; if(!bucket) continue;
        for(var b=0;b<bucket.length;b++){
          var it2=bucket[b]; if(it2.used) continue;
          var dx=it2.px-seed.px, dy=it2.py-seed.py;
          if(dx*dx+dy*dy>md2) continue;
          it2.used=true; var g2=it2.G;
          acc.buyN+=g2.buyN; acc.sellN+=g2.sellN; acc.buyQ+=g2.buyQ||0; acc.sellQ+=g2.sellQ||0;
          acc.qty+=g2.qty||0; acc.pxQty+=g2.pxQty||0; acc.rawCount+=g2.rawCount||0;
          if((g2.maxSingle||0)>acc.maxSingle) acc.maxSingle=g2.maxSingle||0;
          if(g2.priceMin<acc.priceMin) acc.priceMin=g2.priceMin;
          if(g2.priceMax>acc.priceMax) acc.priceMax=g2.priceMax;
          if((g2.lastTs||g2.firstTs)>acc.lastTs) acc.lastTs=g2.lastTs||g2.firstTs;
          acc._n++;
        }
      }
      acc._merged=acc._n>1;
      acc.__sig = st.mode==="big" ? Math.max(acc.buyN,acc.sellN) : (acc.buyN+acc.sellN);
      out.push(acc);
    }
    return out;
  }
  function drawOverlay(ctx,o){
    hitList.length=0;
    if(!st.on) return;
    _dbg.drawCalls++; _dbg.lastDrawTs=Date.now();
    var s2=gsym(); if(s2!==curSym){ window.DVL_BUBBLES.setSymbol(s2); return; }
    var view=o.view, x=o.x, y=o.y, x0=o.x0,x1=o.x1,y0=o.y0,y1=o.y1, slotOffset=o.slotOffset||0;
    if(!view||!view.length||typeof x!=="function"||typeof y!=="function") return;
    var vFirst=+view[0].time, vLast=+view[view.length-1].time;
    var twEnd=vLast + (view.length>1 ? (+view[view.length-1].time-+view[view.length-2].time) : 60000);
    /* passo 1: todos os grupos DENTRO da janela visível (sem filtro de tamanho) */
    var inRange=[];
    for(var i=groups.length-1;i>=0;i--){
      var g=groups[i]; if(g.lastTs<vFirst-twMs()) break;   // groups ~ordem crescente → antes disso é fora
      if(g.firstTs>twEnd) continue;
      var domN=Math.max(g.buyN,g.sellN), totN=g.buyN+g.sellN;
      g.__sig = st.mode==="big" ? domN : totN;
      if(g.__sig>0) inRange.push(g);
      if(inRange.length>2500) break;
    }
    _dbg.visibleGroups=inRange.length;
    if(!inRange.length) return;
    /* passo 2: threshold ESTÁVEL (auto=percentil sobre buffer inteiro em cache; manual=USDT).
       Antes o percentil era calculado só sobre a janela visível → ao mover o gráfico o corte
       mudava e bolhas na borda piscavam. Agora o corte é o mesmo independente do pan/zoom. */
    var thr = st.filterMode==="manual" ? Math.max(0,+st.minNotional||0) : autoThreshold();
    var vis=[], visMax=0;
    for(var k2=0;k2<inRange.length;k2++){ var gg=inRange[k2]; if(gg.__sig<thr) continue; vis.push(gg); if(gg.__sig>visMax) visMax=gg.__sig; }
    /* MESCLA: junta bolhas que ficariam coladas na tela numa só (fluxo somado). */
    if(st.merge && vis.length>1){ vis=coalesceBubbles(vis,o,thr); visMax=0; for(var mv=0;mv<vis.length;mv++){ if(vis[mv].__sig>visMax) visMax=vis[mv].__sig; } }
    /* se exceder o limite de render, mantém as MAIORES (seleção estável por tamanho),
       não as "primeiras 600" (que mudavam conforme o pan) → sem sumiço/reaparecimento. */
    if(vis.length>600){ vis.sort(function(a,b){return b.__sig-a.__sig;}); vis.length=600; }
    _dbg.shown=vis.length;
    if(!vis.length) return;
    /* Escala robusta: o maior print não achata todas as outras bolhas. O percentil 92
       vira o tamanho máximo visual; eventos acima dele continuam capados no maxSize. */
    var scaleVals=vis.map(function(q){return q.__sig;}).sort(function(a,b){return a-b;});
    var scaleMax=scaleVals[Math.min(scaleVals.length-1,Math.floor((scaleVals.length-1)*0.92))]||visMax;
    if(!(scaleMax>thr)) scaleMax=visMax||thr+1;

    ctx.save();
    ctx.globalAlpha=1;
    ctx.font="700 9px -apple-system,Segoe UI,Roboto,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    var buyC=tok("--dvl-bubble-buy","#12b8ff"), sellC=tok("--dvl-bubble-sell","#ff4d7d"),
        absC=tok("--dvl-bubble-absorption","#f4b942"), batC=tok("--dvl-bubble-battle","#b370ff");
    var op=Math.max(0.1,Math.min(1,+st.opacity||0.78));

    /* zonas horizontais: níveis de preço onde o fluxo (buy/sell) mais se acumulou,
       desenhadas ATRÁS das bolhas (mapa de níveis de agressão). */
    if(st.zones){ try{ drawZones(ctx,inRange,o,buyC,sellC); }catch(_z){} }

    _dbg.drawn=0; _dbg.skipY=0; _dbg.skipX=0;
    for(var j=0;j<vis.length;j++){
      var G=vis[j];
      /* x: CENTRALIZA na vela do timestamp (várias bolhas na mesma vela alinham no centro,
         sem ficar "torto" por espalhar pelo tempo dentro da vela) */
      var t=G.firstTs, vi;
      if(t<=vFirst) vi=0; else if(t>=vLast) vi=view.length-1; else { vi=bsearchTime(view,t); if(vi<0) vi=0; }
      var px=x(slotOffset+vi);
      if(px<x0-40||px>x1+40){ _dbg.skipX++; continue; }
      /* y: preço da bolha, PRESO à faixa [low,high] da vela correspondente. Assim a bolha
         fica sempre na região do candle (o histórico spot pode ter base diferente do mercado
         do gráfico e "flutuava" fora da vela). */
      var price=G.pxQty/(G.qty||1);
      var cndl=view[vi];
      if(cndl){ var lo=+cndl.low, hi=+cndl.high; if(isFinite(lo)&&isFinite(hi)&&hi>=lo){ if(price<lo) price=lo; else if(price>hi) price=hi; } }
      var py=y(price); if(py<y0-40||py>y1+40){ _dbg.skipY++; continue; }

      var domN=Math.max(G.buyN,G.sellN), totN=G.buyN+G.sellN;
      var domSide=G.buyN>=G.sellN?"buy":"sell";
      var sig=st.mode==="big"?domN:totN;
      var r=radiusFor(sig,scaleMax,thr);
      if(r<1.5) continue;
      _dbg.drawn++;

      if(st.visualStyle==="tape"){
        /* Tape Aggression: círculo puro como no vídeo. Cor = lado dominante,
           tamanho = magnitude, transparência = dominância. Sem glow/shadow. */
        var tapeC=domSide==="buy"?buyC:sellC;
        var domFrac=totN>0?domN/totN:1;
        if(st.traces){
          ctx.beginPath(); ctx.moveTo(px+r*.55,py+.5); ctx.lineTo(px+r+Math.max(4,+st.traceLen||18),py+.5);
          ctx.strokeStyle=rgbaHex(tapeC,Math.min(.9,op*(.48+.35*domFrac))); ctx.lineWidth=1; ctx.stroke();
        }
        fillCircle(ctx,px,py,r,rgbaHex(tapeC,op*(.62+.38*domFrac)));
        strokeCircle(ctx,px,py,r,rgbaHex(tapeC,Math.min(1,op+.24)),Math.max(.5,+st.outlineWidth||1.6));
        if(r>=16){ strokeCircle(ctx,px,py,r-2.2,"rgba(255,255,255,0.16)",.7); }
      } else if(st.mode==="big"){
        var c=domSide==="buy"?buyC:sellC;
        fillCircle(ctx,px,py,r,rgbaHex(c,op)); strokeCircle(ctx,px,py,r,rgbaHex(c,Math.min(1,op+0.2)),1);
      } else if(st.mode==="volume"){
        if(st.bubbleMode==="delta"){
          var d=G.buyN-G.sellN, mag=totN>0?Math.abs(d)/totN:0;
          var c2=d>=0?buyC:sellC; fillCircle(ctx,px,py,r,rgbaHex(c2,op*(0.45+0.55*mag))); strokeCircle(ctx,px,py,r,rgbaHex(c2,op),1);
        } else if(st.bubbleMode==="volume"){
          fillCircle(ctx,px,py,r,rgbaHex(domSide==="buy"?buyC:sellC,op*0.5));
          strokeCircle(ctx,px,py,r,rgbaHex(domSide==="buy"?buyC:sellC,Math.min(1,op+0.25)),1.6);
        } else { /* split ask/bid */
          var buyFrac=totN>0?G.buyN/totN:0.5;
          drawSplit(ctx,px,py,r,buyFrac,rgbaHex(buyC,op),rgbaHex(sellC,op));
        }
      } else { /* deep proxy (estimado) */
        var conc=totN>0?G.maxSingle/totN:0;        // concentração
        var disp=price>0?(G.priceMax-G.priceMin)/price:0;  // deslocamento relativo
        var bal=domN>0?Math.min(G.buyN,G.sellN)/domN:0;     // equilíbrio dos lados
        var c3=domSide==="buy"?buyC:sellC;
        if(bal>=0.8 && totN>=thr){ drawDiamond(ctx,px,py,r,rgbaHex(batC,op)); }        // batalha estimada
        else if(disp<0.0006 && totN>=thr*1.3){ drawSquare(ctx,px,py,r,rgbaHex(absC,op)); } // absorção estimada
        else if(conc>=0.5){ fillCircle(ctx,px,py,r,rgbaHex(c3,op)); }                   // concentrado (poucos grandes)
        else { strokeCircle(ctx,px,py,r,rgbaHex(c3,Math.min(1,op+0.2)),1.6); }          // vazio (muitos pequenos)
      }

      /* aglomerado mesclado → halo concêntrico fininho sinaliza "isto é um cluster". */
      if(G._merged && r>=7){ strokeCircle(ctx,px,py,r+2.6,rgbaHex(domSide==="buy"?buyC:sellC,Math.min(.45,op*.5)),1); }

      if(st.labels && r>=8){
        var bubbleText;
        if(st.labelMetric==="exec") bubbleText=String(Math.max(1,Math.round(G.rawCount||1)));
        else if(st.labelMetric==="delta") bubbleText=fmtBubbleNumber(Math.abs(G.buyN-G.sellN));
        else bubbleText=fmtBubbleNumber(sig);
        var fsz=Math.max(8,Math.min(11,Math.round(r*.52)));
        ctx.font="850 "+fsz+"px -apple-system,Segoe UI,Roboto,sans-serif";
        ctx.lineWidth=2.2; ctx.strokeStyle="rgba(0,0,0,0.52)"; ctx.strokeText(bubbleText,px,py+.2);
        ctx.fillStyle="rgba(255,255,255,0.96)"; ctx.fillText(bubbleText,px,py+.2);
      }
      hitList.push({x:px,y:py,r:r,g:G,side:domSide,sig:sig});
    }
    ctx.restore();
  }

  /* ── zonas horizontais (níveis de fluxo) ──────────────────────────────────
     Agrega o nocional dos grupos VISÍVEIS por faixa de preço (histograma) e pinta
     bandas horizontais nos níveis de maior concentração — cor pelo lado dominante
     (compra=ciano / venda=rosa), opacidade pela força. Barato: ≤2500 grupos, 40 baldes. */
  function drawZones(ctx,list,o,buyC,sellC){
    if(!list||!list.length) return;
    var y=o.y, x0=o.x0, x1=o.x1;
    var pMin=Infinity,pMax=-Infinity, i, g, p;
    for(i=0;i<list.length;i++){ g=list[i]; p=g.pxQty/(g.qty||1); if(!isFinite(p)) continue; if(p<pMin)pMin=p; if(p>pMax)pMax=p; }
    if(!(pMax>pMin)) return;
    var NB=40, span=pMax-pMin;
    var buyB=new Float64Array(NB), sellB=new Float64Array(NB), bi;
    for(i=0;i<list.length;i++){ g=list[i]; p=g.pxQty/(g.qty||1); if(!isFinite(p)) continue; bi=Math.floor((p-pMin)/span*NB); if(bi<0)bi=0; else if(bi>=NB)bi=NB-1; buyB[bi]+=g.buyN||0; sellB[bi]+=g.sellN||0; }
    var mx=0,t; for(i=0;i<NB;i++){ t=buyB[i]+sellB[i]; if(t>mx)mx=t; }
    if(!(mx>0)) return;
    ctx.save();
    for(i=0;i<NB;i++){
      t=buyB[i]+sellB[i]; if(t<mx*0.18) continue;                 // só níveis relevantes
      var frac=t/mx;
      var pLo=pMin+span*i/NB, pHi=pMin+span*(i+1)/NB;
      var yA=y(pHi), yB=y(pLo);                                    // y é invertido (preço↑ = pixel↓)
      var yt=Math.min(yA,yB), hb=Math.max(2,Math.abs(yB-yA));
      var c=(buyB[i]>=sellB[i])?buyC:sellC;
      ctx.fillStyle=rgbaHex(c,0.05+0.16*frac); ctx.fillRect(x0,yt,x1-x0,hb);
      if(frac>0.55){ ctx.fillStyle=rgbaHex(c,0.30); ctx.fillRect(x0,yt+hb/2-0.5,x1-x0,1); }  // linha do nível forte
    }
    ctx.restore();
  }
  function fillCircle(ctx,cx,cy,r,fill){ ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283185); ctx.fillStyle=fill; ctx.fill(); }
  function strokeCircle(ctx,cx,cy,r,stroke,w){ ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283185); ctx.lineWidth=w||1; ctx.strokeStyle=stroke; ctx.stroke(); }
  function drawSplit(ctx,cx,cy,r,buyFrac,buyFill,sellFill){
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,-1.5707963,-1.5707963+6.283185*buyFrac); ctx.closePath(); ctx.fillStyle=buyFill; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,-1.5707963+6.283185*buyFrac,-1.5707963+6.283185); ctx.closePath(); ctx.fillStyle=sellFill; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283185); ctx.lineWidth=0.8; ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.stroke();
  }
  function drawSquare(ctx,cx,cy,r,fill){ var s=r*1.6; ctx.fillStyle=fill; ctx.fillRect(cx-s/2,cy-s/2,s,s); ctx.lineWidth=1; ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.strokeRect(cx-s/2,cy-s/2,s,s); }
  function drawDiamond(ctx,cx,cy,r,fill){ ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r,cy); ctx.lineTo(cx,cy+r); ctx.lineTo(cx-r,cy); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.lineWidth=1; ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.stroke(); }
  function fmtNotional(v){ v=+v||0; if(v>=1e9) return (v/1e9).toFixed(1)+"B"; if(v>=1e6) return (v/1e6).toFixed(1)+"M"; if(v>=1e3) return (v/1e3).toFixed(0)+"K"; return String(Math.round(v)); }
  /* Número curto sem sufixo, igual ao tape do vídeo: 35 = ~35K USDT,
     1.2M vira 1.2M para não perder escala. O tooltip mantém o valor completo. */
  function fmtBubbleNumber(v){ v=Math.abs(+v||0); if(v>=1e7)return (v/1e6).toFixed(0)+"M"; if(v>=1e6)return (v/1e6).toFixed(1)+"M"; if(v>=1000)return String(Math.max(1,Math.round(v/1000))); return String(Math.round(v)); }
  function hitAt(px,py){ for(var i=hitList.length-1;i>=0;i--){ var h=hitList[i]; var dx=px-h.x, dy=py-h.y; if(dx*dx+dy*dy<=(h.r+3)*(h.r+3)) return h; } return null; }
  window.DVLBubblesDraw=function(ctx,o){ try{ drawOverlay(ctx,o); }catch(_){} };

  /* ── tooltip (toque curto / hover; não bloqueia pan/zoom) ── */
  var tip=null;
  function ensureTip(){ if(tip) return tip; tip=document.createElement("div"); tip.id="dvlBubblesTip"; tip.style.cssText="position:fixed;z-index:100030;pointer-events:none;display:none;background:rgba(6,16,20,.96);border:1px solid rgba(140,174,190,.28);border-radius:8px;padding:7px 9px;font:600 11px system-ui;color:#eaf4ef;box-shadow:0 8px 26px rgba(0,0,0,.5)"; document.body.appendChild(tip); return tip; }
  function showTip(h,cx,cy){ var t=ensureTip(); var G=h.g; var price=G.pxQty/(G.qty||1); var d=new Date(G.firstTs);
    t.innerHTML='<div style="color:'+(h.side==="buy"?"var(--dvl-bubble-buy,#18d978)":"var(--dvl-bubble-sell,#ff4058)")+';font-weight:900">'+(h.side==="buy"?"COMPRA agressiva":"VENDA agressiva")+'</div>'
      +'<div>nocional <b>'+fmtNotional(h.sig)+'</b> · preço '+price.toFixed(price>100?1:4)+'</div>'
      +'<div style="color:#9fb3c8">buy '+fmtNotional(G.buyN)+' · sell '+fmtNotional(G.sellN)+' · '+G.rawCount+' exec</div>'
      +'<div style="color:#7f9c8e">'+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2)+'</div>';
    t.style.display="block"; var tw=t.offsetWidth,th=t.offsetHeight,vw=window.innerWidth,vh=window.innerHeight; var tx=cx+14,ty=cy+14; if(tx+tw>vw-6)tx=cx-tw-14; if(ty+th>vh-6)ty=vh-th-6; t.style.left=tx+"px"; t.style.top=ty+"px"; }
  function hideTip(){ if(tip) tip.style.display="none"; }
  function canvasEl(){ try{ return document.getElementById("chart")||document.querySelector("canvas"); }catch(_){ return null; } }
  function onMove(ev){ if(!st.on){ hideTip(); return; } var cv=canvasEl(); if(!cv) return; var r=cv.getBoundingClientRect(); var h=hitAt(ev.clientX-r.left, ev.clientY-r.top); if(h) showTip(h,ev.clientX,ev.clientY); else hideTip(); }
  function bindTip(){ var cv=canvasEl(); if(!cv||cv.__dvlBubblesTip) return; cv.__dvlBubblesTip=1; cv.addEventListener("pointermove",onMove,{passive:true}); cv.addEventListener("pointerleave",hideTip,{passive:true}); }

  /* ── item no menu real (modules() registry) + item legado ── */
  function updateItem(){ var el=document.getElementById("dvlBubblesState"); if(el){ el.textContent=st.on?"ON":"OFF"; el.classList.toggle("is-on",!!st.on); } }
  window.DVL_BUBBLES_API={ isOn:function(){return !!st.on;}, on:function(){return !!st.on;},
    setOn:function(v){ st.on=(v===undefined?!st.on:!!v); if(st.on){ curSym=gsym(); bindTip(); openFeed(); seedHistory(); } else { hideTip(); closeFeed(); } save(); requestDraw(); },
    openPanel:function(){ openPanel(); }, open:function(){ openPanel(); }, refresh:requestDraw, getState:function(){var o={};for(var k in st)o[k]=st[k];return o;},
    debug:function(){ return { on:st.on, mode:st.mode, visualStyle:st.visualStyle, labelMetric:st.labelMetric, traces:st.traces, curSym:curSym, appSym:gsym(), feedSrc:_feedSrc||"(conectando)", ownFeed:!!window.__DVL_BUB_OWN_FEED, seeded:_dbg.seeded, trades:_dbg.trades, rawLen:raw.length, groups:groups.length, drawCalls:_dbg.drawCalls, visibleGroups:_dbg.visibleGroups, passedFilter:_dbg.shown, drawnOnScreen:_dbg.drawn, offY:_dbg.skipY, offX:_dbg.skipX, secsSinceTrade:_dbg.lastTradeTs?Math.round((Date.now()-_dbg.lastTradeTs)/1000):null, secsSinceDraw:_dbg.lastDrawTs?Math.round((Date.now()-_dbg.lastDrawTs)/1000):null, drawFnPresent:typeof window.DVLBubblesDraw }; } };
  try{ window.DVL_BUBBLES.debug = window.DVL_BUBBLES_API.debug; }catch(_){}   /* alias: DVL_BUBBLES.debug() também funciona */

  /* ── painel de config (shell padrão DVL) ── */
  var panel=null;
  function seg(label,key,opts){ var cur=st[key]; return '<div class="dvl-bb-field"><label>'+label+'</label><div class="dvl-bb-seg">'
    +opts.map(function(o){ return '<button type="button" data-bbseg="'+key+'" data-val="'+o[0]+'" class="'+(String(cur)===String(o[0])?"is-on":"")+'">'+o[1]+'</button>'; }).join("")+'</div></div>'; }
  function sw(label,key){ return '<div class="dvl-bb-field"><label>'+label+'</label><label class="dvl-switch"><input type="checkbox" data-bbsw="'+key+'" '+(st[key]?"checked":"")+'><i></i><b></b></label></div>'; }
  function num(label,key,min,max,step){ return '<div class="dvl-bb-field"><label>'+label+'</label><input class="dvl-bb-num" type="number" data-bbnum="'+key+'" value="'+(st[key])+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'"></div>'; }
  function rng(label,key,min,max,step,unit,scale){ scale=scale||1; unit=unit||""; var disp=scale>1?Math.round(st[key]*scale):st[key]; return '<div class="dvl-bb-field"><label>'+label+'</label><div class="dvl-bb-rng"><input type="range" data-bbrng="'+key+'" data-scale="'+scale+'" data-unit="'+unit+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+disp+'"><b data-bbrngval="'+key+'">'+disp+unit+'</b></div></div>'; }
  function stepCtl(label,key,val,min,max,step,dec,suffix){
    var shown=dec?(+val).toFixed(dec):String(Math.round(+val||0));
    return '<div class="dvl-bb-field"><label>'+label+'</label><div class="dvl-feb-step-wrap"><button class="dvl-feb-step-btn dvl-feb-step-dec" type="button" data-id="bb_'+key+'" data-key="'+key+'" data-step="'+step+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'" data-suffix="'+(suffix||'')+'">−</button><span class="dvl-feb-step-val" id="bb_'+key+'Val">'+shown+'</span><button class="dvl-feb-step-btn dvl-feb-step-inc" type="button" data-id="bb_'+key+'" data-key="'+key+'" data-step="'+step+'" data-min="'+min+'" data-max="'+max+'" data-dec="'+dec+'" data-suffix="'+(suffix||'')+'">+</button></div></div>';
  }
  function statusLine(){
    if(!st.on) return '<span style="color:#f4b942">desligado — ligue no interruptor acima</span>';
    var src=_feedSrc?(" · fonte "+_feedSrc):" · conectando…";
    var base='<span style="color:#7f9c8e">feed '+_dbg.trades+' trades · '+groups.length+' grupos · '+(_dbg.drawn||0)+' bolhas na tela'+src+'</span>';
    if(_dbg.trades<=0) return '<span style="color:#f4b942">ligado, conectando o feed de trades…</span> (tento Binance futuros e caio pro spot; se não vier, a Binance pode estar bloqueada). '+base;
    if(_dbg.drawCalls<=0) return '<span style="color:#f4b942">ligado, recebendo trades, mas o gráfico não chamou o desenho</span> — '+base;
    if((_dbg.drawn||0)<=0) return '<span style="color:#f4b942">ligado · trades OK, mas nada na faixa de preço visível</span> (role até o preço atual / diminua o filtro). '+base;
    return '<span style="color:#16c784">ligado · desenhando '+(_dbg.drawn||0)+' bolhas</span> · '+base;
  }
  function bodyHTML(){
    var showBubbleMode = st.mode==="volume";
    return '<div class="dvl-bb-field" style="border-bottom:1px solid rgba(129,166,151,.16);padding-bottom:8px"><label>Indicador</label><label class="dvl-switch"><input type="checkbox" data-bbpower '+(st.on?"checked":"")+'><i></i><b></b></label></div>'
      +'<div style="font-size:10.5px;margin:2px 0 8px" id="dvlBubblesStatus">'+statusLine()+'</div>'
      +seg("Visual","visualStyle",[["tape","Tape"],["dvl","DVL"]])
      +seg("Modo","mode",[["big","Big Trades"],["volume","Volume"],["deep","Deep Proxy"]])
      +(showBubbleMode&&st.visualStyle!=="tape"?seg("Bubble Mode","bubbleMode",[["split","Ask/Bid"],["delta","Delta"],["volume","Volume"]]):"")
      +seg("Filtro","filterMode",[["auto","Automático"],["manual","Manual"]])
      +(st.filterMode==="auto"?seg("Intensidade","intensity",[["low","Low"],["medium","Medium"],["strong","Strong"]]):stepCtl("Mín. nocional (USDT)","minNotional",st.minNotional,0,1e9,1000,0))
      +seg("Agrupamento","grouping",[["auto","Auto"],["time","Tempo"],["price","Preço"]])
      +(st.grouping==="time"?stepCtl("Janela (ms)","timeWindow",st.timeWindow,100,3000,50,0):"")
      +(st.grouping==="price"?stepCtl("Bucket de preço","priceBucket",st.priceBucket,0,100000,.0001,4):"")
      +seg("Escala","scale",[["linear","Linear"],["sqrt","SQRT"],["log","Log"]])
      +stepCtl("Tamanho mín (px)","minSize",st.minSize,2,20,1,0)+stepCtl("Tamanho máx (px)","maxSize",st.maxSize,10,60,1,0)
      +stepCtl("Opacidade %","opacityPct",Math.round(st.opacity*100),20,100,1,0)
      +(st.visualStyle==="tape"?stepCtl("Contorno (px)","outlineWidth",st.outlineWidth,.5,4,.5,1):"")
      +sw("Números nas bolhas","labels")
      +(st.labels?seg("Número","labelMetric",[["notional","Nocional"],["delta","Delta"],["exec","Exec."]]):"")
      +(st.visualStyle==="tape"?sw("Traço curto de preço","traces"):"")
      +(st.visualStyle==="tape"&&st.traces?stepCtl("Comprimento traço","traceLen",st.traceLen,4,50,1,0):"")
      +sw("Mesclar aglomerados","merge")
      +(st.merge?stepCtl("Força da mescla","mergeTight",st.mergeTight,0.3,1.6,.05,2):"")
      +sw("Zonas horizontais","zones")
      +'<div class="dvl-bb-note"><b>Tape</b>: círculos verdes/vermelhos presos ao preço, tamanho pela força e número central. Sem neon. Deep Proxy continua estimado, pois dados públicos não são MBO real.</div>';
  }
  function renderPanel(){ if(!panel) return; var b=panel.querySelector("#dvlBubblesBody"); if(!b) return; b.innerHTML=bodyHTML(); bind(b); }
  function bind(b){
    var pw=b.querySelector("[data-bbpower]"); if(pw) pw.addEventListener("change",function(){ window.DVL_BUBBLES_API.setOn(pw.checked); renderPanel(); });
    b.querySelectorAll("[data-bbseg]").forEach(function(el){ el.addEventListener("click",function(){ st[el.getAttribute("data-bbseg")]=el.getAttribute("data-val"); save(); renderPanel(); requestDraw(); }); });
    b.querySelectorAll("[data-bbsw]").forEach(function(el){ el.addEventListener("change",function(){ st[el.getAttribute("data-bbsw")]=el.checked; save(); renderPanel(); requestDraw(); }); });
    b.querySelectorAll("[data-bbnum]").forEach(function(el){ el.addEventListener("input",function(){ st[el.getAttribute("data-bbnum")]=Number(el.value)||0; save(); requestDraw(); }); });
    b.querySelectorAll("[data-bbrng]").forEach(function(el){ el.addEventListener("input",function(){ var sc=+el.getAttribute("data-scale")||1, unit=el.getAttribute("data-unit")||"", key=el.getAttribute("data-bbrng"), v=Number(el.value); st[key]=sc>1?v/sc:v; var lab=b.querySelector('[data-bbrngval="'+key+'"]'); if(lab) lab.textContent=v+unit; save(); requestDraw(); }); });
    function applyStep(id,v){
      var key=String(id||"").replace(/^bb_/,"");
      if(key==="opacityPct") st.opacity=v/100; else st[key]=v;
      save(); requestDraw();
    }
    b.querySelectorAll(".dvl-feb-step-btn[data-key]").forEach(function(btn){ btn.addEventListener("click",function(){
      var id=btn.dataset.id, mn=+btn.dataset.min, mx=+btn.dataset.max, step=+btn.dataset.step, dec=+btn.dataset.dec;
      var valEl=b.querySelector("#"+id+"Val"), v=+(valEl&&valEl.textContent||0);
      v=Math.max(mn,Math.min(mx,v+(btn.classList.contains("dvl-feb-step-inc")?step:-step)));
      if(valEl) valEl.textContent=dec?v.toFixed(dec):String(Math.round(v)); applyStep(id,v);
    }); });
    if(window.DVLVPRowLayout1345&&typeof window.DVLVPRowLayout1345.bindEditable==="function") window.DVLVPRowLayout1345.bindEditable(b,applyStep);
  }
  function openPanel(){
    if(!panel){ panel=document.createElement("div"); panel.id="dvlBubblesPanel"; panel.className="dvl-vt-panel dvl-bb-panel";
      panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>DVL Bubbles</b><small>tape aggression · live trades</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlBubblesReset" type="button" title="Restaurar" style="font-size:15px">⟲</button><button class="dvl-vt-close" id="dvlBubblesClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlBubblesBody"></div>';
      document.body.appendChild(panel);
      panel.addEventListener("pointerdown",function(e){ e.stopPropagation(); },true);
      panel.querySelector("#dvlBubblesClose").addEventListener("click",function(){ panel.classList.remove("is-open"); });
      panel.querySelector("#dvlBubblesReset").addEventListener("click",reset);
    }
    /* abrir as configurações LIGA o indicador (evita 'abri mas não apareceu') */
    if(!st.on){ window.DVL_BUBBLES_API.setOn(true); }
    renderPanel(); panel.classList.add("is-open");
    /* status ao vivo enquanto o painel estiver aberto */
    clearInterval(openPanel._t); openPanel._t=setInterval(function(){ if(!panel||!panel.classList.contains("is-open")){ clearInterval(openPanel._t); return; } var s=panel.querySelector("#dvlBubblesStatus"); if(s) s.innerHTML=statusLine(); },1000);
  }

  /* troca de ativo → limpa buffers */
  try{ window.addEventListener("dvl-safe-asset-selected-0804",function(){ window.DVL_BUBBLES.setSymbol(gsym()); },{passive:true}); }catch(_){}
  try{ window.addEventListener("chart:draw",function(){ if(st.on) bindTip(); },{passive:true}); }catch(_){}

  function boot(){ updateItem(); if(st.on){ curSym=gsym(); bindTip(); openFeed(); seedHistory(); } setInterval(bindTip,4000); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
