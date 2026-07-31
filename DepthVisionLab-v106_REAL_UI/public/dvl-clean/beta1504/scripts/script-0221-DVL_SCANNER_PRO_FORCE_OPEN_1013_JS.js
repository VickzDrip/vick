(function(){
  "use strict";
  if(window.DVL_SCANNER_PRO_FORCE_OPEN_1013) return;

  var VERSION = "1.020";
  var panelId = "dvlScannerPanel0780";
  var rawApi = null;
  var searchQuery = "";
  var LS_1015 = "dvlScan1015Filters";
  var FILTER1015_DEFAULTS = {
    preset:"all", tf:"15m", minScore:0, maxRows:20,
    maPeriod1:20, maPeriod2:50, spikeMaMode:"2", flatVolumeBarLen:5,
    rsiOversoldThreshold:30, rsiOversoldLookback:20, oiMaLen:20, lsrMaLen:20,
    /* DVL Exhaustion RSI (oscilador da plataforma) — os MESMOS inputs do
       gráfico, editáveis aqui. Vão pro backend (patch.exr) e mudam o RSI que
       aparece na tabela e confirma o sinal. Padrão = defaults do gráfico. */
    exrRsiLen:14, exrPush:18, exrVolSpikeAt:2.5, exrVolMaLen:20, exrUpper:60, exrLower:35,
    /* Scanner de 2 blocos (pré-pump): calmaria + spike. spikeMin=1.0 casa
       exatamente com o marcador "spike pós-flat" do gráfico (vela cruza a MA). */
    minBaseBars:6, spikeMin:1.0, scanRulesVersion:2,
    weights:{ preVolume:50, spike:50, rsi:50 },
    /* Off by default — the ML-learned block weights (src/train.js on the
       backend) only ever apply when the user opts in here. */
    useLearnedWeights:false
  };
  function loadFilterState1015(){
    try{
      var saved=JSON.parse(localStorage.getItem(LS_1015)||"{}");
      var st=Object.assign({}, FILTER1015_DEFAULTS, saved, { weights: Object.assign({}, FILTER1015_DEFAULTS.weights, saved.weights||{}) });
      /* Migração da regra do scanner (2 blocos, casada com o marcador do
         gráfico): se o estado salvo é de antes, reseta SÓ os parâmetros da
         regra (base/spike/pesos) pros novos defaults, preservando o resto
         (TF, nº de ativos, etc.). */
      if(st.scanRulesVersion !== 2){
        st.minBaseBars = FILTER1015_DEFAULTS.minBaseBars;
        st.spikeMin = FILTER1015_DEFAULTS.spikeMin;
        st.weights = Object.assign({}, FILTER1015_DEFAULTS.weights);
        st.scanRulesVersion = 2;
      }
      return st;
    }catch(_){ return Object.assign({}, FILTER1015_DEFAULTS, { weights: Object.assign({}, FILTER1015_DEFAULTS.weights) }); }
  }
  function saveFilterState1015(){
    try{ localStorage.setItem(LS_1015, JSON.stringify(filterState1015)); }catch(_){}
  }
  var filterState1015 = loadFilterState1015();

  /* Push MA periods / block inputs down into the engine that actually fetches
     and computes rows (client-side engine + best-effort to the Node backend
     if the live-feed bridge is active), so the Filtros inputs really change
     how the scanner scans — not just how it's scored/displayed. */
  function pushEngineConfig1015(){
    try{
      var api=rawApi || window.__DVL_SCANNER_ORIGINAL_1013 || window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780;
      if(api && typeof api.setFilterConfig==="function"){
        api.setFilterConfig({
          maPeriod1:filterState1015.maPeriod1, maPeriod2:filterState1015.maPeriod2,
          spikeMaMode:filterState1015.spikeMaMode, flatVolumeBarLen:filterState1015.flatVolumeBarLen,
          rsiOversoldThreshold:filterState1015.rsiOversoldThreshold, rsiOversoldLookback:filterState1015.rsiOversoldLookback,
          oiMaLen:filterState1015.oiMaLen, lsrMaLen:filterState1015.lsrMaLen
        });
      }
    }catch(_){}
    try{
      window.dispatchEvent(new CustomEvent("dvl:scanner-config-change",{detail:{
        weights: filterState1015.weights,
        engine: {
          /* maPeriod1/maPeriod2 (as médias de volume) NÃO vão mais daqui — quem
             manda é o indicador DVL Volume (syncScannerMa), pra o scanner seguir
             À RISCA as médias que aparecem no gráfico. */
          spikeMaMode: filterState1015.spikeMaMode, flatVolumeBarLen: filterState1015.flatVolumeBarLen,
          rsiOversoldThreshold: filterState1015.rsiOversoldThreshold, rsiOversoldLookback: filterState1015.rsiOversoldLookback
        },
        oiMaLen: filterState1015.oiMaLen, lsrMaLen: filterState1015.lsrMaLen,
        /* DVL Exhaustion RSI inputs → backend (setEngineConfig reads patch.exr,
           re-scans the oscillator on the next 15m cycle with these values). */
        exr: {
          mtfRsiLen: Number(filterState1015.exrRsiLen)||14,
          mtfPush: Number(filterState1015.exrPush),
          mtfVolSpikeAt: Number(filterState1015.exrVolSpikeAt)||2.5,
          mtfVolMaLen: Number(filterState1015.exrVolMaLen)||20,
          upperZone: Number(filterState1015.exrUpper)||60,
          lowerZone: Number(filterState1015.exrLower)||35
        }
      }}));
    }catch(_){}
  }
  /* Real TF switch: refetches client-side at the new TF, and asks the live
     backend bridge (if active) to re-pull its pre-computed snapshot for the
     same TF — instant either way. */
  function applyTf1015(tf){
    try{
      var api=rawApi || window.__DVL_SCANNER_ORIGINAL_1013 || window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780;
      if(api && typeof api.setFilterConfig==="function") api.setFilterConfig({scanTF:tf});
    }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("dvl:scanner-tf-change",{detail:{tf:tf}})); }catch(_){}
  }

  /* ── ML-learned weights (opt-in) ──────────────────────────────────
     src/train.js on the backend fits a hybrid model on real outcomes and
     exposes it read-only via /api/dvl/scanner/health. Polled independently
     of the Copilot "Aprendizado (ML)" card (separate module) so this panel
     doesn't depend on load order. Off by default — effectiveWeights() only
     returns the learned set when the user opts in AND the model is
     actually trained; otherwise it silently falls back to the manual
     (hand-tuned) weights, same as before this existed.

     LONG-only on the backend (src/train.js) — SHORT was removed from
     training entirely (the 6 blocks only encode a bullish thesis, and the
     financial backtest confirmed SHORT signals lost money on average), so
     _learnedModel is just { LONG:{...} }; learnedModelFor(side) still
     normalizes `side` since the scanner rows themselves also carry one,
     but there's only ever a LONG model to look up now. */
  var _learnedModel = null;
  function fetchLearnedModel(){
    fetch("/api/dvl/scanner/health",{cache:"no-store"})
      .then(function(r){ if(!r.ok) throw new Error("health "+r.status); return r.json(); })
      .then(function(j){
        _learnedModel = (j && j.outcomes && j.outcomes.model) || null;
        renderMetricsSection();
      })
      .catch(function(){ /* keep last known model (or null) — stay silent */ });
  }
  function learnedModelFor(side){
    var s = String(side||"").toUpperCase()==="SHORT" ? "SHORT" : "LONG";
    return (_learnedModel && _learnedModel[s]) || null;
  }
  function effectiveWeights(side){
    var m = learnedModelFor(side);
    if(filterState1015.useLearnedWeights && m && m.trained && m.weights) return m.weights;
    return filterState1015.weights;
  }

  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function norm(s){return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}
  function now(){return Date.now();}
  function radarSVG(){
    return '<svg class="dvlScannerRadar080 dvlScannerLogo0969 dvlScanRadarA1014" viewBox="0 0 64 64" aria-hidden="true">'
      +'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        +'<circle class="dvlRadarRing faint" cx="32" cy="32" r="26"/>'
        +'<circle class="dvlRadarRing" cx="32" cy="32" r="18"/>'
        +'<circle class="dvlRadarRing soft" cx="32" cy="32" r="11"/>'
        +'<path class="dvlRadarArc strong" d="M13 32a19 19 0 0 1 19-19"/>'
        +'<path class="dvlRadarArc strong" d="M32 51a19 19 0 0 0 19-19"/>'
        +'<path class="dvlRadarArc soft" d="M9 32a23 23 0 0 1 23-23"/>'
        +'<path class="dvlRadarArc soft" d="M32 55a23 23 0 0 0 23-23"/>'
        +'<path class="dvlRadarSweep" d="M32 32L49 15"/>'
        +'<circle class="dvlRadarCenter" cx="32" cy="32" r="4.6"/>'
        +'<circle class="dvlRadarHit" cx="49" cy="15" r="4.4"/>'
      +'</g>'
    +'</svg>';
  }

  function fmtPrice(v){
    v=Number(v);
    if(!isFinite(v)||v<=0) return "—";
    if(v>=1000) return v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    if(v>=100) return v.toFixed(2);
    if(v>=1) return v.toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
    return v.toFixed(5).replace(/0+$/,"").replace(/\.$/,"");
  }
  function ago(ts){
    if(!ts) return "—";
    var d=Math.max(0,now()-Number(ts)), s=Math.floor(d/1000), m=Math.floor(s/60), h=Math.floor(m/60);
    if(s<60) return s+"s atrás";
    if(m<60) return m+"m atrás";
    return h+"h "+String(m%60).padStart(2,"0")+"m atrás";
  }
  function updated(){
    var rows=getRowsRaw();
    var t=0;
    rows.forEach(function(r){ t=Math.max(t, Number(r._histAt||r.spikeAt||0)); });
    if(!t) return "Atualizado agora";
    var d=Math.max(0,now()-t), s=Math.floor(d/1000), m=Math.floor(s/60);
    if(s<60) return "Atualizado agora há "+s+"s";
    if(m<60) return "Atualizado há "+m+"m";
    return "Atualizado há "+Math.floor(m/60)+"h";
  }
  /* ── Spike Score blocks ──────────────────────────────────────────
     6 pass/fail checks, no priority between them — they only feed the
     scanner (which assets show up) and, weighted, the 0-99 score. Same
     score mechanism as before (weighted sum -> 0-99), just a different
     set of factors, all boolean now instead of continuous ranges. */
  /* ── 2-block scanner (pré-pump): calmaria de volume + coluna que se destaca ──
     Bloco 1 "Pré-volume": as velas antes ficaram abaixo da média (base morta /
     calmaria) — a pré-análise. Bloco 2 "Spike": a vela atual se destaca das
     menores por um fator MODERADO (não precisa ser descomunal). Ambos usam
     campos que o backend já manda: volBelowMaBars e spike20. */
  function blocksOf(r){
    var minBase=Number(filterState1015.minBaseBars)||6;
    var spikeMin=Number(filterState1015.spikeMin)||1.3;
    var spike20=Number(r.spike20)||Number(r.volX)||0;
    return {
      preVolume: (Number(r.volBelowMaBars)||0) >= minBase,
      /* mesma regra do marcador "spike pós-flat" do gráfico: a vela CRUZA
         acima da média (>1). spikeMin é o fator mínimo (1.0 = só cruzar). */
      spike: spike20 > spikeMin,
      /* Bloco do RSI Exhaustion (15m): ativo quando o oscilador está numa zona —
         verde = sobrevendido (exausto no fundo), vermelho = sobrecomprado
         (exausto no topo). Neutro = bloco desligado. */
      rsi: (r.exrZone==="down" || r.exrZone==="up")
    };
  }
  function allBlocksTrue(r){
    var b=blocksOf(r);
    return b.preVolume && b.spike && b.rsi;
  }

  /* ── Confluência total alerts — fires once per symbol on the FALSE→TRUE
     transition (not every render), so a symbol sitting in full confluence
     for many cycles doesn't spam. Bell icon lights up + best-effort browser
     Notification; the dropdown lists the recent hits. */
  var confluenceActive = {};   // symbol -> currently 6/6 (bool)
  var confluenceLog = [];      // [{symbol, at}] newest first, capped
  var confluenceUnread = 0;
  var notifyPermAsked = false;

  function notifyConfluence(sym){
    try{
      if(typeof Notification!=="undefined" && Notification.permission==="granted"){
        new Notification("DVL Scanner — Sinal", { body: sym+" bateu os 3 bloquinhos: pré-volume (calmaria) + spike + RSI na zona.", tag:"dvl-confluence-"+sym });
      }
    }catch(_){}
  }
  function scanConfluence(){
    var rows=getRowsRaw();
    for(var i=0;i<rows.length;i++){
      var r=rows[i], sym=r.symbol||r.mexc; if(!sym) continue;
      var full=allBlocksTrue(r);
      if(full && !confluenceActive[sym]){
        confluenceActive[sym]=true;
        confluenceLog.unshift({symbol:sym, at:now()});
        if(confluenceLog.length>30) confluenceLog.length=30;
        confluenceUnread++;
        notifyConfluence(sym);
      } else if(!full && confluenceActive[sym]){
        confluenceActive[sym]=false;
      }
    }
  }
  function alertMenu(){
    return '<div class="dvlScan1013FilterMenu dvlScan1015FilterMenu" id="dvlScan1013AlertMenu">'
      +'<h3>Alertas — Confluência total</h3>'
      +'<div class="dvlScan1015FilterFoot" id="dvlScan1013AlertList">Nenhum alerta ainda. Avisamos aqui (e por notificação do navegador, se permitida) assim que um ativo bater os 3 bloquinhos (pré-volume + spike + RSI na zona).</div>'
      +'</div>';
  }
  function renderAlertMenu(root){
    root = root || document.getElementById(panelId);
    if(!root) return;
    var list=root.querySelector("#dvlScan1013AlertList");
    if(list){
      if(!confluenceLog.length){
        list.textContent="Nenhum alerta ainda. Avisamos aqui (e por notificação do navegador, se permitida) assim que um ativo bater os 3 bloquinhos (pré-volume + spike + RSI na zona).";
      } else {
        list.innerHTML=confluenceLog.map(function(e){
          return '<div class="dvlScan1013AlertRow"><b>'+esc(e.symbol)+'</b><span>'+esc(ago(e.at))+'</span></div>';
        }).join("");
      }
    }
    var btn=root.querySelector("#dvlScan1013AlertBtn");
    if(btn) btn.classList.toggle("has-dot", confluenceUnread>0);
  }
  function score(r){
    var b=blocksOf(r), w=effectiveWeights(r&&r.side)||{};
    /* Default 50/50 se o peso não existir (ex.: estado antigo salvo com os 6
       blocos) — assim o score nunca zera por causa de estado persistido. */
    var W={ preVolume:Number(w.preVolume)||50, spike:Number(w.spike)||50, rsi:Number(w.rsi)||50 };
    var wTotal=W.preVolume+W.spike+W.rsi;
    if(wTotal<=0) return 0;
    var pts=(b.preVolume?W.preVolume:0)+(b.spike?W.spike:0)+(b.rsi?W.rsi:0);
    return Math.max(0,Math.min(99,Math.round(pts/wTotal*99)));
  }

  function fmtWeight1016(v){
    v=Number(v);
    if(!isFinite(v)) v=0;
    return (Math.round(v*10)/10).toFixed(v%1?1:0);
  }
  function metricLabel1016(key){
    return ({
      preVolume:"Pré-volume (calmaria)",
      spike:"Spike",
      rsi:"RSI Exhaustion (zona)"
    })[key] || key;
  }
  function metricSub1016(key){
    return ({
      preVolume:"volume baixo/uniforme antes (base morta)",
      spike:"vela cruza acima da média após a calmaria (= marcador do gráfico)",
      rsi:"RSI Exhaustion (15m) numa zona: verde=sobrevendido / vermelho=sobrecomprado"
    })[key] || "";
  }
  function metricStep1016(key){ return 1; }
  function metricMin1016(key){ return 0; }
  function metricMax1016(key){ return 100; }
  function setMetric1016(key,delta){
    var w=filterState1015.weights || (filterState1015.weights={});
    var cur=Number(w[key]||0);
    var next=cur + Number(delta||0);
    next=Math.max(metricMin1016(key),Math.min(metricMax1016(key),next));
    w[key]=Math.round(next*10)/10;
  }
  var BLOCK_KEYS_1016=["preVolume","spike","rsi"];
  function metricRows1016(){
    return BLOCK_KEYS_1016.map(function(k){
      return '<div class="dvlScan1016MetricRow" data-dvl-scan1016-row="'+k+'">'
        +'<div class="dvlScan1016MetricInfo"><b>'+metricLabel1016(k)+'</b><small>'+metricSub1016(k)+'</small></div>'
        +'<div class="dvlScan1016Stepper">'
          +'<button type="button" data-dvl-scan1016-metric="'+k+'" data-dvl-scan1016-dir="-1">−</button>'
          +'<span data-dvl-scan1016-value="'+k+'">'+fmtWeight1016((filterState1015.weights||{})[k])+'</span>'
          +'<button type="button" data-dvl-scan1016-metric="'+k+'" data-dvl-scan1016-dir="1">+</button>'
        +'</div>'
      +'</div>';
    }).join("");
  }

  /* Read-only view of the ML-learned weights (no steppers — you don't hand-
     tune a learned model, you retrain it with more data). Shows the LONG
     model — the only one there is now (SHORT was removed from training
     entirely, see train.js's doc-comment; the scanner itself no longer
     detects SHORT signals either). */
  function metricRowsML1016(){
    var lm=learnedModelFor("LONG");
    var w=(lm && lm.weights) || {};
    return BLOCK_KEYS_1016.map(function(k){
      return '<div class="dvlScan1016MetricRow" data-dvl-scan1016-row="'+k+'">'
        +'<div class="dvlScan1016MetricInfo"><b>'+metricLabel1016(k)+'</b><small>'+metricSub1016(k)+'</small></div>'
        +'<div class="dvlScan1016Stepper"><span data-dvl-scan1016-mlvalue="'+k+'">'+fmtWeight1016(w[k])+'</span></div>'
      +'</div>';
    }).join("");
  }
  function mlStatusLine1015(){
    var lm=learnedModelFor("LONG");
    if(!_learnedModel) return '<div class="dvlScan1015FilterFoot">Carregando status do modelo…</div>';
    if(!lm || !lm.trained) return '<div class="dvlScan1015FilterFoot">Modelo LONG ainda não treinado ('+esc((lm&&lm.samples)||0)+'/'+esc((lm&&lm.needed)||200)+' amostras) — usando pesos manuais por enquanto.</div>';
    var acc=Math.round((lm.testAccuracy!=null?lm.testAccuracy:lm.accuracy||0)*100);
    return '<div class="dvlScan1015FilterFoot">LONG treinado com '+esc(lm.samples)+' amostras · acurácia real '+acc+'%.</div>';
  }
  /* Swaps the metrics block between "manual steppers" and "read-only ML
     weights" — called on toggle click and whenever a fresh model arrives
     from fetchLearnedModel(), so it updates live without reopening Filtros. */
  function metricsSectionInnerHtml1015(){
    if(filterState1015.useLearnedWeights){
      return '<div class="dvlScan1016MetricHead"><label>Pesos aprendidos (ML)</label></div>'+mlStatusLine1015()+metricRowsML1016();
    }
    return '<div class="dvlScan1016MetricHead"><label>Pesos dos blocos do Spike Score</label><button type="button" data-dvl-scan1016-reset>Reset</button></div>'+metricRows1016();
  }
  function renderMetricsSection(){
    var p=document.getElementById(panelId);
    if(!p) return;
    var wrap=p.querySelector("#dvlScan1016MetricsWrap");
    if(wrap) wrap.innerHTML=metricsSectionInnerHtml1015();
  }

  /* ── Numeric engine inputs (MA periods, RSI zone/lookback, OI/LSR MA, flat
     volume bar length) — same DVL stepper widget, but these push down into
     the engine (pushEngineConfig1015) instead of only affecting local score
     weighting. */
  function numLabel1018(key){
    return ({
      maPeriod1:"MA rápida", maPeriod2:"MA lenta", flatVolumeBarLen:"Flat volume bar (candles)",
      rsiOversoldThreshold:"RSI zona sobrevenda", rsiOversoldLookback:"RSI lookback (candles)",
      oiMaLen:"Média OI (amostras)", lsrMaLen:"Média LSR (amostras)",
      exrRsiLen:"RSI Exhaustion · comprimento", exrPush:"RSI Exhaustion · push", exrVolSpikeAt:"RSI Exhaustion · spike vol.",
      exrVolMaLen:"RSI Exhaustion · média vol.", exrUpper:"RSI · zona sobrecompra", exrLower:"RSI · zona sobrevenda"
    })[key] || key;
  }
  function numSub1018(key){
    return ({
      maPeriod1:"período da MA rápida do spike", maPeriod2:"período da MA lenta do spike",
      flatVolumeBarLen:"nº de candles com volume abaixo da média antes do spike",
      rsiOversoldThreshold:"RSI ≤ este valor conta como sobrevenda",
      rsiOversoldLookback:"procura sobrevenda dentro dos últimos N candles",
      oiMaLen:"nº de amostras usadas na média de OI", lsrMaLen:"nº de amostras usadas na média de LSR",
      exrRsiLen:"comprimento do RSI do oscilador (igual ao gráfico)",
      exrPush:"força com que a exaustão multi-TF empurra pro topo/fundo",
      exrVolSpikeAt:"razão volume/média que conta como spike cheio",
      exrVolMaLen:"comprimento da média de volume dentro da exaustão",
      exrUpper:"RSI ≥ este valor = sobrecomprado (vermelho → short)",
      exrLower:"RSI ≤ este valor = sobrevendido (verde → long)"
    })[key] || "";
  }
  function numMin1018(key){
    if(key==="rsiOversoldThreshold") return 5;
    if(key==="exrPush") return 0;
    if(key==="exrVolSpikeAt") return 1.5;
    if(key==="exrUpper") return 50;
    if(key==="exrLower") return 5;
    return 2;
  }
  function numMax1018(key){
    if(key==="maPeriod1"||key==="maPeriod2"||key==="oiMaLen"||key==="lsrMaLen") return 200;
    if(key==="flatVolumeBarLen") return 50;
    if(key==="rsiOversoldThreshold") return 50;
    if(key==="rsiOversoldLookback") return 100;
    if(key==="exrRsiLen") return 100;
    if(key==="exrVolMaLen") return 5000;
    if(key==="exrPush") return 60;
    if(key==="exrVolSpikeAt") return 10;
    if(key==="exrUpper") return 95;
    if(key==="exrLower") return 50;
    return 999;
  }
  /* Step per key — most are integer ±1; the volume-spike ratio moves in 0.5,
     the RSI zones in 5 (more practical granularity). */
  function numStep1018(key){
    if(key==="exrVolSpikeAt") return 0.5;
    if(key==="exrUpper"||key==="exrLower") return 5;
    return 1;
  }
  function setNum1018(key,dir){
    var cur=Number(filterState1015[key]||0);
    var next=cur+Number(dir||0)*numStep1018(key);
    /* round to 1 decimal so 0.5 steps don't drift into float noise */
    next=Math.round(next*10)/10;
    next=Math.max(numMin1018(key),Math.min(numMax1018(key),next));
    /* Never let the RSI zones cross (sobrevenda deve ficar abaixo da sobrecompra). */
    if(key==="exrLower") next=Math.min(next, Number(filterState1015.exrUpper||60)-5);
    if(key==="exrUpper") next=Math.max(next, Number(filterState1015.exrLower||35)+5);
    filterState1015[key]=next;
  }
  /* Só os inputs do oscilador RSI Exhaustion (os do modelo antigo — MA rápida/
     lenta, RSI(14) sobrevenda, OI/LSR MA, flat bar — saíram da tela; os valores
     seguem nos defaults e ainda vão pro backend, só não são mais editáveis aqui). */
  var NUM_KEYS_1018=["exrRsiLen","exrPush","exrVolSpikeAt","exrVolMaLen","exrUpper","exrLower"];
  function numRows1018(){
    return NUM_KEYS_1018.map(function(k){
      return '<div class="dvlScan1016MetricRow" data-dvl-scan1015-num-row="'+k+'">'
        +'<div class="dvlScan1016MetricInfo"><b>'+numLabel1018(k)+'</b><small>'+numSub1018(k)+'</small></div>'
        +'<div class="dvlScan1016Stepper">'
          +'<button type="button" data-dvl-scan1015-num="'+k+'" data-dvl-scan1015-numdir="-1">−</button>'
          +'<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-dvl-scan1015-numval="'+k+'" value="'+Number(filterState1015[k]||0)+'">'
          +'<button type="button" data-dvl-scan1015-num="'+k+'" data-dvl-scan1015-numdir="1">+</button>'
        +'</div>'
      +'</div>';
    }).join("");
  }

  function bars(scoreVal){
    var total=6, on=Math.max(1,Math.min(total,Math.round(scoreVal/16)));
    var key=scoreVal>=70?"g":(scoreVal>=45?"y":"r");
    var out='<span class="dvlScan1013Bars">';
    for(var i=0;i<total;i++) out+='<i class="'+(i<on?key:"")+'"></i>';
    return out+'</span>';
  }
  /* Per-row checklist of the 6 blocks — purely a reading aid, no priority
     between them (order shown is fixed but meaningless). */
  var BLOCK_BADGE_ORDER=[["V","preVolume","Pré-volume (calmaria)"],["S","spike","Spike (coluna se destaca)"],["R","rsi","RSI Exhaustion na zona (verde=sobrevendido / vermelho=sobrecomprado)"]];
  function blockBadges(r){
    var b=blocksOf(r);
    return '<span class="dvlScan1013Blocks">'+BLOCK_BADGE_ORDER.map(function(o){
      var okv=!!b[o[1]];
      /* O bloco RSI é colorido pela direção do oscilador: verde = sobrevendido
         (zona down), vermelho = sobrecomprado (zona up). Os outros usam o estilo
         on/off padrão. */
      if(o[1]==="rsi" && okv){
        var col=(r.exrZone==="up")?"#ff5966":"#10df77";
        return '<i class="on" style="color:'+col+';border-color:'+col+'" title="'+esc(o[2])+' ✓">'+o[0]+'</i>';
      }
      return '<i class="'+(okv?"on":"off")+'" title="'+esc(o[2])+(okv?" ✓":" ✗")+'">'+o[0]+'</i>';
    }).join("")+'</span>';
  }
  /* Pré-pump / pré-short expectation from the learned model: expected UP move
     (pré-pump / LONG) and DOWN move (pré-short / SHORT) over the next 20
     candles, in ATR units. Rides along on the backend row (predUp/predDown).
     Absent until the model has trained on enough resolved signals, so this
     renders nothing for the first days/weeks — never fabricates a number. */
  /* Short suffix describing the learning state of the pré-pump/pré-short model
     (fed by the bridge's /pump-model poll into window.DVL_PUMP_MODEL_STATUS).
     Empty until the status is known. */
  function modelStatusText(){
    var s=window.DVL_PUMP_MODEL_STATUS;
    if(!s||typeof s!=="object") return '';
    var n=Number(s.samples)||0, min=Number(s.minSamples)||40;
    if(s.trained) return ' · Modelo pré-pump/pré-short ativo ('+n+' amostras)';
    return ' · Modelo aprendendo: '+n+'/'+min+' amostras (previsões aparecem quando treinar)';
  }
  function predBadge(r){
    var u=r.predUp, d=r.predDown;
    if(u==null&&d==null) return '';
    u=Math.max(0,Number(u)||0); d=Math.max(0,Number(d)||0);
    if(u<=0&&d<=0) return '';
    var longFav=u>=d, main=longFav?u:d, cls=longFav?"up":"down", lbl=longFav?"PUMP":"SHORT";
    return '<i class="dvlScan1013Pred '+cls+'" title="Expectativa do modelo (próx. 20 velas, em ATR) — alta '+u.toFixed(2)+'× / baixa '+d.toFixed(2)+'×">'+lbl+' '+main.toFixed(1)+'×</i>';
  }
  function trend(r,type){
    /* Both the client engine and the backend rows carry a real OI/LSR
       reading split into direction and colour: arrow = value vs its MA
       (↑ above / ↓ below) — always literal, never flipped. Colour means
       "favorable for this app's blocks", and the two metrics have OPPOSITE
       polarity: the OI block wants ABOVE its average (green = above), the
       LSR block wants BELOW its average (green = below) — so green/red are
       swapped for LSR relative to OI. Falls back to a derived value only
       when neither is available (e.g. cached rows saved before this field
       existed, or Binance which has no real OI feed). */
    var dir = type==="oi" ? r.oi : (type==="lsr" ? r.lsr : null);
    var col = type==="oi" ? r.oiColor : (type==="lsr" ? r.lsrColor : null);
    if(dir==="up"||dir==="down"){
      var cls = type==="lsr"
        ? (col==="green" ? "down" : (col==="red" ? "up" : "flat"))
        : (col==="green" ? "up" : (col==="red" ? "down" : "flat"));
      return { c:cls, t: dir==="up" ? "↑" : "↓" };
    }
    var side=String(r.side||"").toUpperCase(), bp=Number(r.barPct)||0, sc=score(r);
    if(type==="oi"){
      if(side==="LONG"&&sc>=52) return {c:"up",t:"↑"};
      if(side==="SHORT"&&sc>=52) return {c:"down",t:"↓"};
      return {c:"flat",t:"→"};
    }
    if(side==="LONG"&&bp>.18) return {c:"up",t:"↑"};
    if(side==="SHORT"&&bp<-.18) return {c:"down",t:"↓"};
    return {c:"flat",t:"→"};
  }
  function rsiColor(v){
    v=Number(v)||50;
    return v>=55?"#10df77":(v<=45?"#ff5966":"#ffd321");
  }
  function status(r){
    var sc=score(r);
    /* "Spike pós-flat" = o marcador do gráfico, confirmado no fechamento. Nas
       linhas do backend (MEXC) usamos o isIgnition close-confirmed; nas linhas
       do scan no navegador (sem isIgnition) cai no heurístico antigo. */
    var ig=(typeof r.isIgnition==="boolean") ? r.isIgnition : ((Number(r.flatCandles)||0)>=4 && sc>=72);
    if(ig) return {c:"postflat",t:"Spike pós-flat"};
    if(sc>=72) return {c:"clean",t:"Spike limpo"};
    if(sc>=54) return {c:"forming",t:"Em formação"};
    if(sc>=44) return {c:"monitor",t:"Monitorar"};
    return {c:"none",t:"Sem spike"};
  }
  function mini(closes){
    closes=(closes||[]).map(Number).filter(function(v){return isFinite(v);});
    if(!closes.length) return '<span style="color:#75827d;font-size:12px">—</span>';
    while(closes.length<5) closes.unshift(closes[0]);
    closes=closes.slice(-5);
    var vals=[];
    for(var i=0;i<closes.length;i++){ var o=i?closes[i-1]:closes[i], c=closes[i]; vals.push(o,c); }
    var min=Math.min.apply(null,vals), max=Math.max.apply(null,vals), rng=(max-min)||1; max+=rng*.16; min-=rng*.16; rng=(max-min)||1;
    return '<div class="dvlScan1013Mini">'+closes.map(function(c,i){
      var o=i?closes[i-1]:closes[i], top=Math.max(o,c), bot=Math.min(o,c), cls=c>o?"g":(c<o?"r":"n");
      var wickTop=((max-(top+rng*.035))/rng)*34, wickH=Math.max(8,(((top+rng*.035)-(bot-rng*.035))/rng)*34);
      var bodyTop=((max-top)/rng)*34, bodyH=Math.max(4,((top-bot)/rng)*34);
      return '<i class="'+cls+'"><u style="top:'+wickTop.toFixed(1)+'px;height:'+wickH.toFixed(1)+'px"></u><b style="top:'+bodyTop.toFixed(1)+'px;height:'+bodyH.toFixed(1)+'px"></b></i>';
    }).join("")+'</div>';
  }

  function getRowsRaw(){
    try{
      var api=rawApi || window.__DVL_SCANNER_ORIGINAL_1013 || window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780;
      if(api && api!==window.DVL_SCANNER_PRO_FORCE_OPEN_1013 && typeof api.rows==="function"){
        var rows=api.rows();
        if(rows && rows.length) return rows;
      }
      if(api && api!==window.DVL_SCANNER_PRO_FORCE_OPEN_1013 && typeof api.rawRows==="function"){
        var raw=api.rawRows();
        if(raw && raw.length) return raw;
      }
    }catch(_){}
    return [];
  }
  function getRows(){
    var q=norm(searchQuery), rows=getRowsRaw().slice();
    if(q) rows=rows.filter(function(r){return norm(r.symbol||r.mexc||"").indexOf(q)>-1;});
    rows=rows.filter(function(r){
      var sc=score(r);
      if(sc < Number(filterState1015.minScore||0)) return false;
      var sym=String(r.symbol||r.mexc||"").toUpperCase();
      var st=status(r);
      var oi=trend(r,"oi");
      if(filterState1015.preset==="usdt" && sym.indexOf("USDT")===-1) return false;
      if(filterState1015.preset==="high" && sc<70) return false;
      if(filterState1015.preset==="clean" && !(st.c==="clean" || st.c==="postflat")) return false;
      if(filterState1015.preset==="oi" && oi.c!=="up") return false;
      if(filterState1015.preset==="confluence" && !allBlocksTrue(r)) return false;
      return true;
    });
    return rows.slice(0, Number(filterState1015.maxRows||20));
  }

  function hero(rows){
    if(!rows.length) return {b:"CARREGANDO", c:"mid", d:"Scanner preparado. Assim que o feed responder, a tabela Spike Flow aparece aqui com tempo do spike, score, status e últimos candles."};
    var avg=Math.round(rows.slice(0,5).reduce(function(a,r){return a+score(r);},0)/Math.max(1,Math.min(5,rows.length)));
    var longs=rows.filter(function(r){return String(r.side||"").toUpperCase()==="LONG";}).length;
    var shorts=rows.filter(function(r){return String(r.side||"").toUpperCase()==="SHORT";}).length;
    if(avg>=72 && longs>=shorts) return {b:"ALTA CONVICÇÃO", c:"", d:"Tendência compradora forte com volume e estrutura sustentando o movimento. Probabilidade maior de continuação."};
    if(avg>=72 && shorts>longs) return {b:"ALTA CONVICÇÃO", c:"", d:"Pressão vendedora forte com spikes relevantes e estrutura sustentando o movimento. Observe continuação e rejeições."};
    if(avg>=52) return {b:"CONVICÇÃO MÉDIA", c:"mid", d:"Mercado misto. Priorize sinais recentes, spike score mais alto e status pós-flat ou limpo."};
    return {b:"BAIXA CONVICÇÃO", c:"low", d:"Poucos ativos com qualidade agora. O scanner segue monitorando spikes novos para evitar entradas tardias."};
  }

  function filterMenu(){
    return '<div class="dvlScan1013FilterMenu dvlScan1015FilterMenu" id="dvlScan1013FilterMenu">'
      +'<h3>Filtros</h3>'
      /* Scanner novo = RSI da plataforma + pré-volume/spike. Aqui ficam só os
         inputs do oscilador (RSI Exhaustion) e, no fim, os pesos do score e dos
         blocos. Tudo que era do modelo antigo (mercado/TF/spike mín/OI-LSR/MA)
         saiu da tela. */
      +'<div class="dvlScan1015FilterBlock dvlScan1016Metrics"><div class="dvlScan1016MetricHead"><label>RSI Exhaustion (oscilador da plataforma · 15m)</label></div>'+numRows1018()+'</div>'
      +'<div class="dvlScan1015FilterBlock"><label>Pesos do score</label><div class="dvlScan1013FilterChips" data-dvl-scan1015-group="weightsrc">'
        +'<button class="is-on" type="button" data-dvl-scan1015-weightsrc="manual">Manual (Filtros)</button>'
        +'<button type="button" data-dvl-scan1015-weightsrc="ml">🤖 Aprendido (ML)</button>'
      +'</div></div>'
      +'<div class="dvlScan1015FilterBlock dvlScan1016Metrics" id="dvlScan1016MetricsWrap">'+metricsSectionInnerHtml1015()+'</div>'
      +'<div class="dvlScan1015FilterFoot">Tudo em chips DVL. Sem dropdown nativo.</div>'
      +'</div>';
  }

  function syncFilterButtons1015(root){
    root = root || document.getElementById(panelId);
    if(!root) return;
    root.querySelectorAll("[data-dvl-scan1015-preset]").forEach(function(b){ b.classList.toggle("is-on", b.getAttribute("data-dvl-scan1015-preset")===filterState1015.preset); });
    root.querySelectorAll("[data-dvl-scan1015-tf]").forEach(function(b){ b.classList.toggle("is-on", b.getAttribute("data-dvl-scan1015-tf")===filterState1015.tf); });
    root.querySelectorAll("[data-dvl-scan1015-min]").forEach(function(b){ b.classList.toggle("is-on", Number(b.getAttribute("data-dvl-scan1015-min"))===Number(filterState1015.minScore)); });
    root.querySelectorAll("[data-dvl-scan1015-max]").forEach(function(b){ b.classList.toggle("is-on", Number(b.getAttribute("data-dvl-scan1015-max"))===Number(filterState1015.maxRows)); });
    root.querySelectorAll("[data-dvl-scan1015-spikemode]").forEach(function(b){ b.classList.toggle("is-on", b.getAttribute("data-dvl-scan1015-spikemode")===String(filterState1015.spikeMaMode)); });
    root.querySelectorAll("[data-dvl-scan1015-weightsrc]").forEach(function(b){ b.classList.toggle("is-on", b.getAttribute("data-dvl-scan1015-weightsrc")===(filterState1015.useLearnedWeights?"ml":"manual")); });
    root.querySelectorAll("[data-dvl-scan1016-value]").forEach(function(el){
      var key=el.getAttribute("data-dvl-scan1016-value");
      el.textContent=fmtWeight1016((filterState1015.weights||{})[key]);
    });
    root.querySelectorAll("[data-dvl-scan1015-numval]").forEach(function(el){
      var key=el.getAttribute("data-dvl-scan1015-numval");
      if(el.tagName==="INPUT") el.value=Number(filterState1015[key]||0); else el.textContent=Number(filterState1015[key]||0);
    });
  }

  function build(){
    var p=document.getElementById(panelId);
    if(!p){
      p=document.createElement("section");
      p.id=panelId;
      document.body.appendChild(p);
    }
    p.className="dvlScan1013Panel";
    p.setAttribute("data-dvl-ui","true");
    p.setAttribute("data-dvl-scanner-pro","1013");
    p.innerHTML =
      '<div class="dvlScan1013Sizer"><div class="dvlScan1013Canvas">'
      +'<header class="dvlScan1013Header"><div class="dvlScan1013Logo">'+radarSVG()+'</div><div class="dvlScan1013Title"><b>DVL <span>SCANNER PRO</span></b><small>Scanner ao vivo <i></i> futuros</small></div><div class="dvlScan1013Actions"><div class="dvlScan1013FilterWrap"><button class="dvlScan1013IconBtn" type="button" id="dvlScan1013AlertBtn" aria-label="Alertas"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg></button>'+alertMenu()+'</div><button class="dvlScan1013IconBtn" type="button" data-dvl-scan1013-filters aria-label="Configurações"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"></circle><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M16.9 16.9l2.2 2.2M2 12h3M19 12h3M4.9 19.1l2.1-2.1M16.9 7.1l2.2-2.2"></path></svg></button></div></header>'
      +'<section class="dvlScan1013Hero"><div class="dvlScan1013Radar"><div class="dvlScan1013RadarCore">'+radarSVG()+'</div><span class="dvlScan1013Dot a"></span><span class="dvlScan1013Dot b"></span><span class="dvlScan1013Dot c"></span></div><div class="dvlScan1013HeroText"><div class="dvlScan1013HeroTop"><b>Leitura de mercado</b><span class="dvlScan1013Badge" id="dvlScan1013Badge">CARREGANDO</span></div><div class="dvlScan1013HeroDesc" id="dvlScan1013HeroDesc">Scanner preparado.</div></div></section>'
      +'<div class="dvlScan1013Toolbar"><div class="dvlScan1013Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input id="dvlScan1013Search" type="search" placeholder="Buscar ativo..." autocomplete="off" spellcheck="false"></div><div class="dvlScan1013FilterWrap dvlScan1013ToolbarFilterWrap"><button class="dvlScan1013FilterBtn" type="button" data-dvl-scan1013-filters><svg viewBox="0 0 24 24"><path d="M3 5h18"></path><path d="M6 12h12"></path><path d="M10 19h4"></path></svg>Filtros</button>'+filterMenu()+'</div></div>'
      +'<section class="dvlScan1013Table"><div class="dvlScan1013TableTop"><b>SCANNER COMPLETO — SPIKE FLOW</b><span class="dvlScan1013Updated" id="dvlScan1013Updated">Atualizado agora <i></i></span></div><div class="dvlScan1013Head"><div>#</div><div>Ativo / preço</div><div>Var. 24h</div><div>RSI</div><div>Spike score</div><div>Status</div><div>Spike há</div><div>5 candles</div></div><div id="dvlScan1013Body"></div></section>'
      +'<section class="dvlScan1013Table dvlScan1013DetSec"><div class="dvlScan1013TableTop"><b>DETECTADOS (24h)</b><button type="button" class="dvlScan1013DetClear" id="dvlScan1013DetClear">Limpar</button></div><div class="dvlScan1013DetHead"><div>Ativo</div><div>Bloquinhos</div><div>Score</div><div>Detectado</div><div>Estado</div></div><div id="dvlScan1013DetectedBody"></div></section>'
      +'<div class="dvlScan1013Foot"><span><i>i</i><span><b>SPIKE HÁ:</b> tempo decorrido desde que o spike ocorreu. Use para evitar entradas tardias.</span></span><span><i>i</i><span>Spike Score: pontuação interna DVL que mede a qualidade do spike com base em volume, flat, momentum e estrutura.</span></span><span><i>i</i><span><b>Spike pós-flat:</b> spike detectado após período de consolidação.</span></span><span><i>i</i><span><b>Bloquinhos (S R O L F P):</b> S = Spike acima da média · R = RSI em sobrevenda · O = OI acima da média · L = LSR abaixo da média · F = Flat volume bar · P = Pré-volume baixo. Verde = validado, cinza = não. Sem prioridade entre eles.</span></span></div>'
      +'</div></div>';

    var input=p.querySelector("#dvlScan1013Search");
    if(input){
      input.addEventListener("input",function(){searchQuery=this.value||""; render();},false);
      input.addEventListener("click",function(e){e.stopPropagation();},false);
      input.addEventListener("keydown",function(e){e.stopPropagation();},false);
    }
    function commit(){ saveFilterState1015(); syncFilterButtons1015(p); render(); }
    function commitScannerNumInput(el){
      if(!el || el.dataset.dvlCommitted === "1") return;
      var key=el.getAttribute("data-dvl-scan1015-numval");
      var raw=String(el.value||"").trim().replace(",",".");
      var next=Number(raw);
      if(!Number.isFinite(next)){ syncFilterButtons1015(p); return; }
      var mn=numMin1018(key), mx=numMax1018(key), st=numStep1018(key);
      next=Math.max(mn,Math.min(mx,next));
      next=st>=1?Math.round(next):Math.round(next/st)*st;
      next=Math.round(next*10)/10;
      if(key==="exrLower") next=Math.min(next, Number(filterState1015.exrUpper||60)-5);
      if(key==="exrUpper") next=Math.max(next, Number(filterState1015.exrLower||35)+5);
      el.dataset.dvlCommitted="1";
      filterState1015[key]=next;
      pushEngineConfig1015();
      commit();
    }
    p.addEventListener("focusin",function(ev){
      var el=ev.target.closest&&ev.target.closest("input[data-dvl-scan1015-numval]");
      if(el){ try{el.select();}catch(_){} }
    },true);
    p.addEventListener("keydown",function(ev){
      var el=ev.target.closest&&ev.target.closest("input[data-dvl-scan1015-numval]");
      if(!el) return;
      ev.stopPropagation();
      if(ev.key==="Enter"){ev.preventDefault();commitScannerNumInput(el);}
      else if(ev.key==="Escape"){ev.preventDefault();syncFilterButtons1015(p);try{el.blur();}catch(_){}}
    },true);
    p.addEventListener("focusout",function(ev){
      var el=ev.target.closest&&ev.target.closest("input[data-dvl-scan1015-numval]");
      if(el) commitScannerNumInput(el);
    },true);
    p.addEventListener("click",function(ev){
      var preset=ev.target.closest && ev.target.closest("[data-dvl-scan1015-preset]");
      if(preset){
        ev.preventDefault();ev.stopPropagation();
        filterState1015.preset=preset.getAttribute("data-dvl-scan1015-preset")||"all";
        commit();
        return;
      }
      var tf=ev.target.closest && ev.target.closest("[data-dvl-scan1015-tf]");
      if(tf){
        ev.preventDefault();ev.stopPropagation();
        filterState1015.tf=tf.getAttribute("data-dvl-scan1015-tf")||"15m";
        applyTf1015(filterState1015.tf);
        commit();
        return;
      }
      var min=ev.target.closest && ev.target.closest("[data-dvl-scan1015-min]");
      if(min){
        ev.preventDefault();ev.stopPropagation();
        filterState1015.minScore=Number(min.getAttribute("data-dvl-scan1015-min")||0);
        commit();
        return;
      }
      var max=ev.target.closest && ev.target.closest("[data-dvl-scan1015-max]");
      if(max){
        ev.preventDefault();ev.stopPropagation();
        filterState1015.maxRows=Number(max.getAttribute("data-dvl-scan1015-max")||20);
        commit();
        return;
      }
      var spikemode=ev.target.closest && ev.target.closest("[data-dvl-scan1015-spikemode]");
      if(spikemode){
        ev.preventDefault();ev.stopPropagation();
        filterState1015.spikeMaMode=spikemode.getAttribute("data-dvl-scan1015-spikemode")==="1"?"1":"2";
        pushEngineConfig1015();
        commit();
        return;
      }
      var weightsrc=ev.target.closest && ev.target.closest("[data-dvl-scan1015-weightsrc]");
      if(weightsrc){
        ev.preventDefault();ev.stopPropagation();
        filterState1015.useLearnedWeights=weightsrc.getAttribute("data-dvl-scan1015-weightsrc")==="ml";
        if(filterState1015.useLearnedWeights) fetchLearnedModel();
        renderMetricsSection();
        commit();
        return;
      }
      var numBtn=ev.target.closest && ev.target.closest("[data-dvl-scan1015-num]");
      if(numBtn){
        ev.preventDefault();ev.stopPropagation();
        var numKey=numBtn.getAttribute("data-dvl-scan1015-num");
        var numDir=Number(numBtn.getAttribute("data-dvl-scan1015-numdir")||0);
        setNum1018(numKey, numDir);
        pushEngineConfig1015();
        commit();
        return;
      }
      var metric=ev.target.closest && ev.target.closest("[data-dvl-scan1016-metric]");
      if(metric){
        ev.preventDefault();ev.stopPropagation();
        var key=metric.getAttribute("data-dvl-scan1016-metric");
        var dir=Number(metric.getAttribute("data-dvl-scan1016-dir")||0);
        setMetric1016(key, dir*metricStep1016(key));
        pushEngineConfig1015();
        commit();
        return;
      }
      var reset=ev.target.closest && ev.target.closest("[data-dvl-scan1016-reset]");
      if(reset){
        ev.preventDefault();ev.stopPropagation();
        filterState1015.weights=Object.assign({},FILTER1015_DEFAULTS.weights);
        pushEngineConfig1015();
        commit();
        return;
      }
      var alertBtn=ev.target.closest && ev.target.closest("#dvlScan1013AlertBtn");
      if(alertBtn){
        ev.preventDefault();ev.stopPropagation();
        var am=document.getElementById("dvlScan1013AlertMenu");
        if(am) am.classList.toggle("is-open");
        confluenceUnread=0;
        renderAlertMenu(p);
        if(!notifyPermAsked && typeof Notification!=="undefined" && Notification.permission==="default"){
          notifyPermAsked=true;
          try{ Notification.requestPermission(); }catch(_){}
        }
        return;
      }
      var btn=ev.target.closest && ev.target.closest("[data-dvl-scan1013-filters]");
      if(btn){
        ev.preventDefault();ev.stopPropagation();
        var m=document.getElementById("dvlScan1013FilterMenu");
        if(m) m.classList.toggle("is-open");
        syncFilterButtons1015(p);
        return;
      }
      var clr=ev.target.closest && ev.target.closest("#dvlScan1013DetClear");
      if(clr){ ev.preventDefault();ev.stopPropagation(); clearDetected(); renderDetected(p); return; }
      var inside=ev.target.closest && ev.target.closest(".dvlScan1013FilterWrap.dvlScan1013ToolbarFilterWrap");
      if(!inside){ var mm=document.getElementById("dvlScan1013FilterMenu"); if(mm) mm.classList.remove("is-open"); }
      var insideAlert=ev.target.closest && ev.target.closest("#dvlScan1013AlertBtn, #dvlScan1013AlertMenu");
      if(!insideAlert){ var amm=document.getElementById("dvlScan1013AlertMenu"); if(amm) amm.classList.remove("is-open"); }
    },true);
    render();
    syncFilterButtons1015(p);
    resize();
    return p;
  }

  /* ── "Detectados (24h)" persistent log ────────────────────────────
     The live table above only shows what still passes the filters RIGHT
     NOW — a signal whose spike faded (score dropped below minScore, or the
     ML-adjusted score did) vanishes from it, even though it was real. This
     log captures every row the moment it shows up live, stamped with WHEN
     it was generated (row.spikeAt), and keeps it for 24h regardless of
     filters/score/ML — so nothing you spotted is ever lost. Each entry
     stays put when it leaves the live table (marked "saiu" vs "● ao vivo").
     Stored per symbol+TF so 15m and 1h detections don't overwrite. */
  var DETECTED_KEY="dvlScanDetected1103";
  var DETECTED_MAX_AGE=86400000; // 24h
  function curScanTf(){ try{ var a=window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780; if(a&&typeof a.getFilterConfig==="function"){ var fc=a.getFilterConfig(); if(fc&&fc.scanTF) return fc.scanTF; } }catch(_){} return "15m"; }
  function loadDetected(){ try{ var o=JSON.parse(localStorage.getItem(DETECTED_KEY)||"{}"); return (o&&typeof o==="object")?o:{}; }catch(_){ return {}; } }
  function saveDetected(s){ try{ localStorage.setItem(DETECTED_KEY,JSON.stringify(s)); }catch(_){} }
  function clearDetected(){ try{ localStorage.removeItem(DETECTED_KEY); }catch(_){} }
  function archiveDetected(rows){
    var store=loadDetected(), tnow=now(), tf=curScanTf(), liveKeys={};
    (rows||[]).forEach(function(r){
      var sym=r.symbol||r.mexc; if(!sym) return;
      var key=sym+"|"+tf; liveKeys[key]=true;
      if(!store[key]){
        /* First sighting: freeze the generation time + detection snapshot. */
        store[key]={ sym:sym, tf:tf, firstAt:(Number(r.spikeAt)||tnow), score:score(r), price:Number(r.lastClose)||0, blocks:blockBadges(r), full:allBlocksTrue(r) };
      }
      store[key].lastAt=tnow; store[key].live=true;
    });
    Object.keys(store).forEach(function(k){
      if(!liveKeys[k]) store[k].live=false;                                   // left the live table
      if(tnow-(store[k].firstAt||0)>DETECTED_MAX_AGE) delete store[k];        // older than 24h
    });
    saveDetected(store);
  }
  function renderDetected(p){
    var body=p&&p.querySelector("#dvlScan1013DetectedBody"); if(!body) return;
    var store=loadDetected();
    var list=Object.keys(store).map(function(k){ return store[k]; }).sort(function(a,b){ return (b.firstAt||0)-(a.firstAt||0); });
    if(!list.length){ body.innerHTML='<div class="dvlScan1013Empty">Nada por enquanto — assim que um sinal aparecer no ao vivo, fica registrado aqui por 24h, mesmo depois de sair de cima.</div>'; return; }
    body.innerHTML=list.slice(0,150).map(function(d){
      return '<div class="dvlScan1013DetRow'+(d.full?" confluence":"")+'" data-dvl-scan-analyze="'+esc(d.sym||"")+'">'
        +'<div class="dvlScan1013DetAsset"><b>'+esc(d.sym||"—")+'</b><span>'+esc(d.tf||"")+' · '+esc(fmtPrice(d.price))+'</span></div>'
        +'<div>'+(d.blocks||"")+'</div>'
        +'<div class="dvlScan1013DetScore">'+Math.round(Number(d.score)||0)+'</div>'
        +'<div class="dvlScan1013DetAgo">'+esc(ago(d.firstAt))+'</div>'
        +'<div>'+(d.live?'<i class="dvlScan1013DetLive live">● ao vivo</i>':'<i class="dvlScan1013DetLive gone">saiu</i>')+'</div>'
      +'</div>';
    }).join("");
  }

  function render(){
    var p=document.getElementById(panelId);
    if(!p || p.getAttribute("data-dvl-scanner-pro")!=="1013") return;
    scanConfluence();
    renderAlertMenu(p);
    var rows=getRows();
    var h=hero(rows);
    var badge=p.querySelector("#dvlScan1013Badge"), desc=p.querySelector("#dvlScan1013HeroDesc"), upd=p.querySelector("#dvlScan1013Updated");
    if(badge){ badge.textContent=h.b; badge.className="dvlScan1013Badge "+(h.c||"");}
    if(desc) desc.textContent=h.d+modelStatusText();
    if(upd) upd.innerHTML=esc(updated())+' <i></i>';
    var body=p.querySelector("#dvlScan1013Body");
    if(!body) return;
    if(!rows.length){
      /* Don't FLASH empty on a transient reload (e.g. right after clicking an
         asset, when the feed re-pulls for a beat). If a table is already on
         screen, keep it — only show the "loading" placeholder on the very
         first load, when there's nothing to keep. */
      if(!body.querySelector(".dvlScan1013Row")){
        body.innerHTML='<div class="dvlScan1013Empty">Carregando scanner completo… O painel continua aberto e a tabela aparece assim que os dados chegarem.</div>';
      }
      renderDetected(p);   // archive still shows even while the live feed loads
      return;
    }
    body.innerHTML=rows.map(function(r,i){
      var sc=score(r), st=status(r), p24=Number(r.price24hPct||r.barPct||0);
      var varCls=p24>0.001?"pos":(p24<-0.001?"neg":"flat");
      var full=allBlocksTrue(r);
      /* RSI = the platform Exhaustion RSI (15m), colored by its zone at the
         moment of the reading: sobrevendido (down) = verde, sobrecomprado
         (up) = vermelho, neutro = cinza. "—" until the backend attaches it
         (só MEXC, só no 15m). */
      var exrV=(r.exrValue==null?null:Number(r.exrValue)), exrZ=r.exrZone||null;
      var rsiCell = exrV==null
        ? '<div class="dvlScan1013Rsi" style="color:#6f7a75">—</div>'
        : '<div class="dvlScan1013Rsi" style="color:'+(exrZ==="down"?"#10df77":(exrZ==="up"?"#ff5966":"#c4ceca"))+';font-weight:900">'+exrV.toFixed(1)+'</div>';
      return '<div class="dvlScan1013Row'+(full?" confluence":"")+'" data-dvl-scan-analyze="'+esc(r.mexc||r.symbol||"")+'">'
        +'<div class="dvlScan1013Rank">'+(i+1)+'</div>'
        +'<div class="dvlScan1013Asset"><b>'+esc(r.symbol||r.mexc||"—")+'</b><span>'+esc(fmtPrice(r.lastClose))+'</span>'+(full?'<i class="dvlScan1013ConfluenceTag">🔥 3/3</i>':'')+predBadge(r)+'</div>'
        +'<div class="dvlScan1013Var '+varCls+'">'+(p24>=0?"+":"")+p24.toFixed(2)+'%</div>'
        +rsiCell
        +'<div class="dvlScan1013Score"><b>'+sc+'</b>'+bars(sc)+blockBadges(r)+'</div>'
        +'<div><span class="dvlScan1013Status '+st.c+'">'+esc(st.t)+'</span></div>'
        +'<div class="dvlScan1013Ago">'+esc(ago(r.spikeAt||r._histAt))+'</div>'
        +'<div>'+mini(r.last5Closes)+'</div>'
      +'</div>';
    }).join("");
    archiveDetected(rows);   // log every live row (keeps it 24h after it drops off)
    renderDetected(p);
  }

  function resize(){
    var p=document.getElementById(panelId);
    if(!p) return;
    var sizer=p.querySelector(".dvlScan1013Sizer");
    var canvas=p.querySelector(".dvlScan1013Canvas");
    if(!sizer || !canvas) return;
    var scale=Math.max(.42,Math.min(1,(window.innerWidth-34)/860));
    document.documentElement.style.setProperty("--dvl-scan1013-scale",String(scale));
    sizer.style.width=Math.ceil(880*scale)+"px";
    canvas.style.marginBottom=scale<1 ? Math.round((scale-1)*canvas.offsetHeight)+"px" : "";
  }

  function callOriginalRefresh(){
    try{
      var api=rawApi || window.__DVL_SCANNER_ORIGINAL_1013;
      if(api && typeof api.refresh==="function"){
        var out=api.refresh();
        if(out && typeof out.then==="function") out.then(function(){render();setTimeout(render,250);}).catch(function(){render();});
      }
    }catch(_){}
  }

  function open(){
    var p=build();
    p.classList.add("is-open");
    document.body.classList.add("dvlScannerOpen080");
    try{ if(window.DVL_COPILOT_PAGE_0974) window.DVL_COPILOT_PAGE_0974.close(); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("dvl:scanner-state-change",{detail:{open:true,source:"scanner-pro-1013"}})); }catch(_){}
    resize();
    render();
    callOriginalRefresh();
    setTimeout(render,300);
    setTimeout(render,1100);
  }

  function close(){
    var p=document.getElementById(panelId);
    if(p) p.classList.remove("is-open");
    document.body.classList.remove("dvlScannerOpen080");
    try{ window.dispatchEvent(new CustomEvent("dvl:scanner-state-change",{detail:{open:false,source:"scanner-pro-1013"}})); }catch(_){}
  }

  function toggle(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}
    var p=document.getElementById(panelId);
    if(p && p.classList.contains("is-open")) close();
    else open();
  }

  var learnedTimer1207=null, learnedFetchAt1207=0;
  function analysisVisible1207(){
    var g=window.DVL_PANEL_ACTIVITY_1207;
    return g ? g.anyAnalysisOpen() : (!document.hidden && !!(document.querySelector("#dvlScannerPanel0780.is-open,#dvlCopilotPage0974.is-open")));
  }
  function refreshLearnedModel1207(force){
    if(!analysisVisible1207()) return;
    var now=Date.now();
    if(!force && now-learnedFetchAt1207<55000) return;
    learnedFetchAt1207=now;
    fetchLearnedModel();
  }
  function syncLearnedTimer1207(){
    if(analysisVisible1207()){
      refreshLearnedModel1207(true);
      if(!learnedTimer1207) learnedTimer1207=setInterval(function(){ refreshLearnedModel1207(false); },60000);
    }else if(learnedTimer1207){
      clearInterval(learnedTimer1207); learnedTimer1207=null;
    }
  }

  function install(){
    rawApi = window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 && window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 !== window.DVL_SCANNER_PRO_FORCE_OPEN_1013 ? window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 : rawApi;
    window.__DVL_SCANNER_ORIGINAL_1013 = rawApi || window.__DVL_SCANNER_ORIGINAL_1013;
    window.DVL_SCANNER_PRO_FORCE_OPEN_1013 = {version:VERSION,open:open,close:close,toggle:toggle,render:render,resize:resize,audit:function(){return {version:VERSION,panel:!!document.getElementById(panelId),rows:getRowsRaw().length,open:!!(document.getElementById(panelId)&&document.getElementById(panelId).classList.contains("is-open"))};}};
    window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 = window.DVL_SCANNER_PRO_FORCE_OPEN_1013;

    window.addEventListener("click",function(ev){
      var btn=ev.target && ev.target.closest ? ev.target.closest('#dvlBottomNavV2 [data-dvl-nav-key="markets"], #scannerNavBtn, [data-dvl-scanner-nav="true"]') : null;
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      toggle(ev);
    },true);

    window.addEventListener("resize",resize);
    window.addEventListener("orientationchange",function(){setTimeout(resize,120);});
    /* Beta 1.208 — Pro refresh loop exists only while Scanner is visible. */
    var proRefreshTimer1208=0;
    function syncProRefresh1208(){
      var p=document.getElementById(panelId);
      var on=!document.hidden && !!(p&&p.classList.contains("is-open"));
      if(on){
        if(!proRefreshTimer1208) proRefreshTimer1208=setInterval(function(){
          var q=document.getElementById(panelId);
          if(q&&q.classList.contains("is-open")){ render(); callOriginalRefresh(); }
        },30000);
      }else if(proRefreshTimer1208){
        clearInterval(proRefreshTimer1208); proRefreshTimer1208=0;
      }
    }
    window.addEventListener("dvl:scanner-state-change",syncProRefresh1208,true);
    document.addEventListener("visibilitychange",syncProRefresh1208,true);
    setTimeout(syncProRefresh1208,0);

    /* Beta 1.207 — learned weights are refreshed only while Scanner or
       Copilot is visible. Opening either surface performs an immediate catch-up. */
    window.addEventListener("dvl:scanner-state-change",syncLearnedTimer1207,true);
    window.addEventListener("dvl:copilot-state-change",syncLearnedTimer1207,true);
    window.addEventListener("dvl:panel-activity-change",syncLearnedTimer1207,true);
    document.addEventListener("visibilitychange",syncLearnedTimer1207,true);
    setTimeout(syncLearnedTimer1207,0);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
  setTimeout(install,250);
  setTimeout(function(){render();resize();},800);
})();
