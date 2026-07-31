(function(){
  "use strict";
  if(window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023) return;

  var LS_URL="dvlScannerBackendUrl";
  var _base=null, _active=false, _rows=[], _meta={}, _ws=null, _reconnect=null, _hooked=false;
  var _poll=null, _enabled=false;
  var _orig={rows:null,rawRows:null,refresh:null};

  function activity1207(){
    var g=window.DVL_PANEL_ACTIVITY_1207;
    return g ? g.state() : {scanner:!document.hidden&&!!document.querySelector("#dvlScannerPanel0780.is-open"),copilot:!document.hidden&&!!document.querySelector("#dvlCopilotPage0974.is-open")};
  }
  function emit1207(name,detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); }catch(_){} }
  function pullCycle1207(){
    if(!_enabled || document.hidden) return Promise.resolve([]);
    var a=activity1207(), jobs=[];
    if(a.scanner || a.copilot){ jobs.push(pull()); jobs.push(pullModel()); }
    if(a.copilot) jobs.push(pullBacktest());
    return jobs.length ? Promise.all(jobs) : Promise.resolve([]);
  }
  function syncPoll1207(force){
    if(!_enabled) return;
    var a=activity1207(), on=!!(a.scanner||a.copilot);
    if(!on){ if(_poll){clearInterval(_poll);_poll=null;} return; }
    if(force) pullCycle1207();
    if(!_poll) _poll=setInterval(function(){ if(activity1207().scanner||activity1207().copilot) pullCycle1207(); },30000);
  }

  function engine(){ return window.__DVL_SCANNER_ORIGINAL_1013 || null; }
  function pro(){ return window.DVL_SCANNER_PRO_FORCE_OPEN_1013 || null; }
  function curExchange(){
    try{ return (window.DVL_SCANNER_EXCHANGE_FILTER_1022 && window.DVL_SCANNER_EXCHANGE_FILTER_1022.state && window.DVL_SCANNER_EXCHANGE_FILTER_1022.state.exchange) || "binance"; }
    catch(_){ return "binance"; }
  }
  /* TF the Filtros dropdown (Scanner Pro 1013/1015) currently has selected —
     the backend keeps every TF pre-computed, so switching this is instant. */
  function curTf(){
    try{
      var api=window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780;
      if(api && typeof api.getFilterConfig==="function"){
        var fc=api.getFilterConfig();
        if(fc && fc.scanTF) return fc.scanTF;
      }
    }catch(_){}
    return "15m";
  }
  function loadUrl(){ try{ return (typeof window.DVL_SCANNER_BACKEND_URL==="string"?window.DVL_SCANNER_BACKEND_URL:null) || localStorage.getItem(LS_URL) || null; }catch(_){ return null; } }
  function api(path){ var b=_base==null?"":_base; return b.replace(/\/$/,"")+path; }
  function wsUrl(path){
    var b=_base; if(b==null||b===""){ b=location.origin; }
    return b.replace(/^http/,"ws").replace(/\/$/,"")+path;
  }

  /* Map a server snapshot row to the row shape the in-page Scanner Pro reads.
     The Pro always re-derives score/status/blocks locally from these raw
     fields via its own score()/blocksOf() — so the Filtros weight/engine
     inputs affect backend-fed rows exactly the same as client-scanned ones. */
  function mapRow(r){
    var sym=String(r.symbol||r.rawSymbol||"");
    var base=r.base || sym.replace(/\/USDT$/,"").replace(/USDT$/,"");
    return {
      symbol: sym.indexOf("/")>=0 ? sym : (base+"/USDT"),
      mexc: r.rawSymbol || sym,
      coin: window.dvlAssetLetterClass ? window.dvlAssetLetterClass(sym) : "",
      icon: window.dvlAssetFirstLetter ? window.dvlAssetFirstLetter(sym) : ((base.charAt(0))||"?"),
      side: r.side, setup:"",
      spike20: Number(r.spike20)||0, spike50: Number(r.spike50)||0, volX: Number(r.spike20)||0,
      flatCandles: Number(r.flatCandles)||0, barPct: Number(r.barPct)||0,
      prevVolBelowHalf: !!r.prevVolBelowHalf, priceGlueOk: !!r.priceGlueOk,
      rsiOversoldOk: !!r.rsiOversoldOk,
      rsi14: Number(r.rsi14)||50, last5Closes: Array.isArray(r.last5Closes)?r.last5Closes:[],
      lastClose: Number(r.price)||0, price24hPct: Number(r.var24h)||0,
      spikeAt: r.spikeAt||0, _histAt: r.spikeAt||_meta.updatedAt||Date.now(),
      oi: r.oi, lsr: r.lsr, oiValue: r.oiValue, lsrValue: r.lsrValue,
      oiColor: r.oiColor, lsrColor: r.lsrColor,
      spikeScore: r.spikeScore, status: r.status, blocks: r.blocks,
      volBelowMaBars: r.volBelowMaBars, crossStrength: r.crossStrength,
      isIgnition: (typeof r.isIgnition==="boolean" ? r.isIgnition : null),
      predUp: (r.predUp==null?null:Number(r.predUp)), predDown: (r.predDown==null?null:Number(r.predDown)),
      exrValue: (r.exrValue==null?null:Number(r.exrValue)), exrBase: (r.exrBase==null?null:Number(r.exrBase)), exrZone: r.exrZone||null,
      tfOrigin: r.tfOrigin,
      _backend:true
    };
  }

  function rerender(){ try{ var p=pro(); if(p&&typeof p.render==="function") p.render(); }catch(_){} }

  function installHooks(){
    var e=engine(); if(!e || _hooked) return false;
    _orig.rows=e.rows; _orig.rawRows=e.rawRows; _orig.refresh=e.refresh;
    /* Prefer backend rows, but fall back to the client engine's own rows
       whenever the backend hasn't delivered any (unreachable, or a genuinely
       empty snapshot) — so turning the bridge on never blanks a working
       client scan. */
    e.rows=function(){ return (_active && _rows.length) ? _rows.slice() : (typeof _orig.rows==="function"?_orig.rows.apply(e,arguments):[]); };
    e.rawRows=function(){ return (_active && _rows.length) ? _rows.slice() : (typeof _orig.rawRows==="function"?_orig.rawRows.apply(e,arguments):[]); };
    /* NOTE: refresh is intentionally NOT hijacked — the client engine keeps
       running its own scan, so if the backend goes empty/unreachable the
       client rows are still there as a live fallback (see rows() above). */
    _hooked=true; return true;
  }

  /* ── Public bridge API ── */
  function setSnapshot(snap){
    if(!snap || !Array.isArray(snap.rows)) return;
    _meta={updatedAt:snap.updatedAt, exchange:snap.exchange, activeSource:snap.activeSource, fallback:!!snap.fallback};
    _rows=snap.rows.map(mapRow);
    /* Only take over the client engine once the backend actually delivered
       rows — then the Scanner Pro shows the backend feed (which can reach
       MEXC server-side even when Binance is off). */
    if(_rows.length){ _active=true; installHooks(); }
    rerender();
    emit1207("dvl:scanner-backend-update",{rows:_rows.length,meta:_meta});
  }
  function updateRows(rows){ if(Array.isArray(rows)){ _rows=rows.map(mapRow); rerender(); } }
  function updateAsset(asset){
    if(!asset) return;
    var key=asset.rawSymbol||asset.symbol; if(!key) return;
    var mapped=mapRow(asset), found=false;
    for(var i=0;i<_rows.length;i++){ if(_rows[i].mexc===mapped.mexc||_rows[i].symbol===mapped.symbol){ _rows[i]=mapped; found=true; break; } }
    if(!found) _rows.push(mapped);
    rerender();
  }

  function pull(){
    if(_base==null) return Promise.resolve(null);
    var ex=curExchange(), tf=curTf();
    /* FULL universe (every candidate) — not /snapshot, which is only the
       ignited-signal registry. This is what lets the Pro show the whole MEXC
       table server-side when the browser can't reach MEXC. */
    return fetch(api("/api/dvl/scanner/universe?exchange="+encodeURIComponent(ex)+"&tf="+encodeURIComponent(tf)),{cache:"no-store"})
      .then(function(r){ if(!r.ok) throw new Error("universe "+r.status); return r.json(); })
      .then(function(snap){ setSnapshot(snap); return snap; })
      .catch(function(e){ console.warn("[DVL 1023] universe pull failed:",e&&e.message); return null; });
  }

  /* Poll the pré-pump / pré-short model status so the Pro can show a small
     "modelo aprendendo · N amostras" pill (and, once trained, per-row
     predictions ride along on the /universe rows themselves). Best-effort. */
  function pullModel(){
    /* Beta 1.260 — modelo antigo (pré-pump/pré-short) removido do backend; não
       consulta mais o endpoint apagado. O novo modelo VP+RSI-V tem card próprio. */
    return Promise.resolve(null);
  }

  /* Financial backtest of the model's signals ($1000 sim). Fed into the Copilot
     backtest card via window.DVL_PUMP_BACKTEST. Best-effort. When the "só sinais
     completos" toggle is on, restrict the whole analysis to the new-format
     signals that carry the 15m Exhaustion-RSI reading (?onlyComplete=1) — a
     reversible VIEW; nothing is deleted on the backend. */
  function btOnlyComplete(){
    if(typeof window.DVL_PUMP_BT_ONLY_COMPLETE==="boolean") return window.DVL_PUMP_BT_ONLY_COMPLETE;
    try{ window.DVL_PUMP_BT_ONLY_COMPLETE = localStorage.getItem("dvl_pump_bt_only_complete")==="1"; }
    catch(_){ window.DVL_PUMP_BT_ONLY_COMPLETE=false; }
    return window.DVL_PUMP_BT_ONLY_COMPLETE;
  }
  function pullBacktest(){
    /* Beta 1.260 — backtest antigo (pré-pump/pré-short) removido do backend. */
    return Promise.resolve(null);
  }

  function pushConfig(patch){
    if(_base==null || !patch) return Promise.resolve(null);
    return fetch(api("/api/dvl/scanner/config"),{
      method:"POST", cache:"no-store",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(patch)
    }).catch(function(e){ console.warn("[DVL 1023] config push failed:",e&&e.message); return null; });
  }

  function connectWS(url){
    disconnect();
    var ex=curExchange(), tf=curTf();
    var target=url || wsUrl("/ws/dvl/scanner?exchange="+encodeURIComponent(ex)+"&tf="+encodeURIComponent(tf));
    try{
      _ws=new WebSocket(target);
      _ws.onmessage=function(ev){
        try{
          var msg=JSON.parse(ev.data);
          if(msg.type==="scanner:update") setSnapshot({rows:msg.rows,updatedAt:msg.updatedAt,exchange:msg.exchange,activeSource:msg.activeSource,fallback:msg.fallback});
          else if(msg.type==="scanner:asset") updateAsset(msg.asset);
        }catch(_){}
      };
      _ws.onclose=function(){ _ws=null; if(_active){ if(_reconnect) clearTimeout(_reconnect); _reconnect=setTimeout(function(){ if(_active) connectWS(); }, 4000); } };
      _ws.onerror=function(){ try{_ws.close();}catch(_){}};
    }catch(e){ console.warn("[DVL 1023] WS connect failed:",e&&e.message); }
  }
  function disconnect(){ if(_reconnect){clearTimeout(_reconnect);_reconnect=null;} if(_ws){ try{_ws.onclose=null;_ws.close();}catch(_){} _ws=null; } }

  function enable(url){
    if(typeof url==="string"){ _base=url; if(url){ try{ localStorage.setItem(LS_URL,url); }catch(_){} } }
    else if(_base==null){ _base=loadUrl(); }
    /* No explicit backend URL? Use the SAME ORIGIN — the app is served next
       to the scanner backend and /api/dvl/scanner/* is proxied to it (the
       Copilot cards already fetch it relatively). This is what lets the
       Scanner Pro get MEXC data server-side when Binance is off. */
    if(_base==null){ _base=""; }
    _enabled=true;
    /* Beta 1.207 — backend polling follows visible demand. No universe/model/
       backtest downloads are kept alive while Scanner and Copilot are closed. */
    syncPoll1207(true);
    return true;
  }
  function disable(){ _active=false; _enabled=false; disconnect(); if(_poll){ clearInterval(_poll); _poll=null; } try{ localStorage.removeItem(LS_URL); }catch(_){} _rows=[]; rerender(); }

  /* Re-pull + reconnect when the user switches Binance/MEXC in the filter. */
  window.addEventListener("dvl:scanner-exchange-change", function(){ if(_enabled && activity1207().scanner){ pull().then(function(snap){ if(snap) connectWS(); }); } });
  /* Re-pull + reconnect at the newly-selected TF — the backend keeps every
     TF pre-computed, so this is just a re-fetch, not a fresh scan. */
  window.addEventListener("dvl:scanner-tf-change", function(){ if(_enabled && activity1207().scanner){ pull().then(function(snap){ if(snap) connectWS(); }); } });
  window.addEventListener("dvl:scanner-state-change",function(){ setTimeout(function(){syncPoll1207(true);},0); },true);
  window.addEventListener("dvl:copilot-state-change",function(){ setTimeout(function(){syncPoll1207(true);},0); },true);
  window.addEventListener("dvl:panel-activity-change",function(){ syncPoll1207(false); },true);
  document.addEventListener("visibilitychange",function(){ syncPoll1207(!document.hidden); },true);
  /* Push Filtros weight/engine changes (MA periods, RSI zone/lookback, OI/LSR
     MA length, block weights) down to the backend so its own spikeScore/
     blocks stay consistent with what's shown locally. Best-effort: the local
     recompute in score()/blocksOf() is what's actually displayed either way. */
  window.addEventListener("dvl:scanner-config-change", function(ev){ if(_active) pushConfig(ev && ev.detail); });

  /* Auto-enable against the same origin once the scanner engine + Pro are
     registered. This is what makes the live table pull from the backend
     (MEXC-capable, always-on) by default — previously the bridge existed but
     nothing ever switched it on, so the Pro was stuck on the browser-side
     scan that can't reach MEXC (contract.mexc.com is blocked from the page).
     Safe: it only takes over once the backend actually returns rows. */
  function autoEnable(tries){
    tries=tries||0;
    if(_enabled) return;
    if(engine() && pro()){ enable(); return; }
    if(tries<60) setTimeout(function(){ autoEnable(tries+1); }, 500);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", function(){ autoEnable(0); }, {once:true});
  else autoEnable(0);

  window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023={
    version:"1.023",
    enable:enable, disable:disable,
    setSnapshot:setSnapshot, setFeed:setSnapshot,
    updateRows:updateRows, updateAsset:updateAsset,
    connectWS:connectWS, disconnect:disconnect, pull:pull, pushConfig:pushConfig,
    pullBacktest:pullBacktest, api:api,
    /* "Só sinais completos" toggle for the backtest view (persisted). */
    btOnlyComplete:btOnlyComplete,
    setBtOnlyComplete:function(on){
      window.DVL_PUMP_BT_ONLY_COMPLETE=!!on;
      try{ localStorage.setItem("dvl_pump_bt_only_complete", on?"1":"0"); }catch(_){}
      return pullBacktest();
    },
    audit:function(){ return { version:"1.023", active:_active, enabled:_enabled, base:_base, hooked:_hooked, rows:_rows.length, ws:!!(_ws&&_ws.readyState===1), exchange:curExchange(), tf:curTf(), meta:_meta }; }
  };

  /* Auto-start: if a backend URL was saved, use it. Otherwise probe the SAME
     origin — if the 24h backend answers at /api/dvl/scanner/health, activate
     automatically (no console needed). If nothing answers, stay completely
     inert and the in-browser scanner runs exactly as before. */
  function autoStart(){
    var saved=loadUrl();
    if(saved){ enable(saved); return; }
    fetch("/api/dvl/scanner/health",{cache:"no-store"})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(h){ if(h && h.ok){ enable(""); } })
      .catch(function(){ /* no backend reachable — stay inert */ });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", autoStart, {once:true});
  else autoStart();
})();
