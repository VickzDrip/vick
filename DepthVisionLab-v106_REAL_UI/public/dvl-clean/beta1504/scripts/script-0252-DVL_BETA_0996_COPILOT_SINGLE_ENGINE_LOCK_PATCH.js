(function(){
  "use strict";
  if(window.DVL_COPILOT_SINGLE_ENGINE_LOCK_0996) return;

  var VERSION = "1.020";
  var timer = 0;
  var painting = false;
  var lastSig = "";
  var observer = null;
  var lastConvictionUpdateAt1008 = 0;
  var lastConvictionSignature1009 = "";
  var liveFeedState1010 = { feed:null, updatedAt:0, ws:null, lastHash:"", connected:false, url:"" };

  function page(){ return document.getElementById("dvlCopilotPage0974"); }
  function esc(v){ return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function norm(v){ try{return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}catch(_){return String(v||"").toLowerCase();} }
  function num(v,d){ var n=parseFloat(String(v==null?"":v).replace(/[^0-9.\-]/g,"")); return isFinite(n)?n:(d||0); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function clean(v){ var s=String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,""); if(!s)return""; if(!/(USDT|USDC|BUSD|USD)$/.test(s))s+="USDT"; return s; }
  function display(v){ var s=clean(v); return /USDT$/.test(s)?s.replace(/USDT$/,"/USDT"):s; }
  function compact(v){ return clean(v)||"BTCUSDT"; }
  function ageMin(v){ var a=norm(v); if(/agora|now/.test(a))return 0; if(/antigo|expir|velho|ja foi|já foi|old/.test(a))return 99; var m=a.match(/(\d+)/); return m?parseInt(m[1],10):7; }
  function ageBucket(v){ var m=ageMin(v); return m>=18?"expired":(m>=8?"old":"fresh"); }
  function safeText(root,sel,v){ var el=root&&root.querySelector(sel); if(el && el.textContent!==String(v)) el.textContent=String(v); }
  function safeClass(el,cls){ if(el && el.className!==cls) el.className=cls; }
  function safeHTML(el,html){ if(el && el.innerHTML!==html) el.innerHTML=html; }
  function dots(n){ var h=""; for(var i=0;i<5;i++) h+='<i class="'+(i<n?'on':'')+'"></i>'; return h; }
  function factor(label,state,pair){ return '<span class="dvlCp0986PMFactor '+esc(state||"off")+(pair?' dvl0996pair':'')+'"><em>'+esc(label)+'</em><i></i></span>'; }
  function bars(states,pump){ var h=""; for(var i=0;i<6;i++){ var s=states[i], cls=s==="good"?"on":(s==="wait"?"mid":(s==="risk"?"bad":"")); h+='<i class="'+cls+(pump&&(i===3||i===4)?' pair':'')+'"></i>'; } return h; }
  function paintIcon(el,sym){
    if(!el) return;
    var s=compact(sym);
    try{ if(window.dvlPaintAssetLetterIcon){ window.dvlPaintAssetLetterIcon(el,s); el.setAttribute("data-dvl-symbol",s); el.removeAttribute("style"); return; } }catch(_){}
    try{
      if(window.getAssetIconMeta){
        var meta=window.getAssetIconMeta(s)||{}, letter=window.dvlAssetFirstLetter?window.dvlAssetFirstLetter(s):(meta.label||"?"), cls=window.dvlAssetLetterClass?window.dvlAssetLetterClass(s):(meta.className||"dvlLetterGeneric");
        el.textContent=letter; el.className=(el.className.split(/\s+/).filter(function(x){return !/^dvlLetter/.test(x)&&x!=="dvlAssetLetterIcon";}).join(" ")+" dvlAssetLetterIcon "+cls).trim(); el.setAttribute("data-dvl-symbol",s); el.removeAttribute("style"); return;
      }
    }catch(_){}
    var base=s.replace(/USDT$/,"").replace(/^[0-9]+/,""), letter=(base.match(/[A-Z]/)||["D"])[0];
    el.textContent=letter; el.className=(el.className.split(/\s+/).filter(function(x){return !/^dvlLetter/.test(x)&&x!=="dvlAssetLetterIcon";}).join(" ")+" dvlAssetLetterIcon dvlLetterGeneric").trim(); el.setAttribute("data-dvl-symbol",s); el.removeAttribute("style");
  }

  function scannerAgeMap(p){
    var map={};
    try{
      p.querySelectorAll("[data-dvl-cp-section='scanner'] .dvlCp0976ScanRow").forEach(function(row){
        if(row.classList.contains("head")) return;
        var b=row.querySelector(".dvlCp0976AssetCell b"), age=row.querySelector(".dvlCp0976Age");
        if(b&&age){ var k=compact(b.textContent); if(k) map[k]=String(age.textContent||"").trim(); }
      });
    }catch(_){}
    return map;
  }
  function fallbackAge(i){ return i===0?"agora":(i===1?"2m":"5m"); }

  function analysisTf(){
    var tf = "";
    try{ if(window.DVL_REAL_TIMEFRAME_STATE && window.DVL_REAL_TIMEFRAME_STATE.activeTf) tf = window.DVL_REAL_TIMEFRAME_STATE.activeTf; }catch(_){}
    try{ if(!tf){ var a = document.querySelector("#dvl1b_tfScroll .dvl1b-tf.is-active[data-tf]"); if(a) tf = a.getAttribute("data-tf") || a.textContent; } }catch(_){}
    try{ if(!tf){ var b = document.querySelector(".tfBtn.active[data-tf]"); if(b) tf = b.getAttribute("data-tf") || b.textContent; } }catch(_){}
    tf = String(tf || "5m").trim();
    return tf || "5m";
  }

  function patchVisibleAnalysisTf(p, tf){
    try{
      if(!p) return;
      p.querySelectorAll(".dvlCp0998HeaderTf,.dvlCp0998PMHeadTf,.dvlCp1000TfExplain,.dvlCp0997SectionMeta").forEach(function(el){ el.remove(); });
    }catch(_){}
  }

  var DVL_AI_TF_SCAN_0999 = ["1m","3m","5m","15m","30m","45m","1h","2h","4h"];
  function tfIdx(tf){
    var i = DVL_AI_TF_SCAN_0999.indexOf(String(tf||""));
    return i < 0 ? 2 : i;
  }
  function tfMax(a,b){ return DVL_AI_TF_SCAN_0999[Math.max(tfIdx(a), tfIdx(b))] || "5m"; }
  function aiTfPack(item,c,idx){
    item = item || {};
    c = c || {conf:3,expired:false,old:false};
    var m = ageMin(item.age);
    var force = clamp(Math.round(num(item.force, idx===0?78:62)),1,99);
    var setup = norm(item.setup || "");
    var origin = "5m";
    if(m <= 1 || /spike|volume trace|vt/.test(setup)) origin = "1m";
    else if(m <= 3 || /pre|formando|early|observ/.test(setup)) origin = "3m";
    else if(m <= 8 || /pull|reteste|zona|zone/.test(setup)) origin = "5m";
    else if(/break|romp|acumulo|acúmulo/.test(setup)) origin = "15m";
    else origin = "5m";

    var confirm = "5m";
    if(origin === "1m") confirm = force >= 72 || c.conf >= 4 ? "5m" : "3m";
    else if(origin === "3m") confirm = force >= 68 || c.conf >= 4 ? "5m" : "15m";
    else if(origin === "5m") confirm = force >= 78 || c.conf >= 5 ? "15m" : "5m";
    else if(origin === "15m") confirm = "30m";
    else if(origin === "30m" || origin === "45m") confirm = "1h";
    else confirm = "1h";
    confirm = tfMax(origin, confirm);

    var context = "1h";
    if(c.expired || m >= 12) context = "4h";
    else if(force < 52 || c.conf <= 3) context = "30m";
    else if(force >= 82 && c.conf >= 5) context = "1h";
    else context = "1h";
    if(tfIdx(context) < tfIdx(confirm)) context = tfMax(confirm, context);
    if(tfIdx(context) > tfIdx("4h")) context = "4h";

    if(item && item.dvlSignal && item.dvlSignal.source === "live-feed-24h"){
      origin = item.dvlSignal.tfOrigin || origin;
      confirm = item.dvlSignal.tfConfirm || confirm;
      context = item.dvlSignal.contextTf || context;
    }
    var label = origin === confirm ? confirm : (origin + "→" + confirm);
    var clear = "Origem " + origin + " · Confirmação " + confirm + " · Contexto " + context;
    var rowLabel = "Origem " + origin + " · Conf " + confirm;
    return {origin:origin,confirm:confirm,context:context,label:label,clear:clear,rowLabel:rowLabel,scan:DVL_AI_TF_SCAN_0999.join("/")};
  }


  function aiTfExplainHtml(tfp){
    tfp = tfp || {origin:"1m",confirm:"5m",context:"1h",label:"1m→5m"};
    return '<div class="dvlCp1000TfExplain" data-dvl-ai-tf-clear-box>'+
      '<div class="dvlCp1000TfExplainTop"><span>IA de TF</span><b>Varredura até 4h</b></div>'+
      '<div class="dvlCp1000TfPills">'+
        '<span class="dvlCp1000TfPill origin"><em>Origem</em><b>'+esc(tfp.origin)+'</b></span>'+
        '<span class="dvlCp1000TfPill confirm"><em>Confirmação</em><b>'+esc(tfp.confirm)+'</b></span>'+
        '<span class="dvlCp1000TfPill context"><em>Contexto</em><b>'+esc(tfp.context)+'</b></span>'+
      '</div>'+
      '<div class="dvlCp1000TfNote">Origem = onde o sinal nasceu · Confirmação = onde validar · Contexto = tendência maior.</div>'+
    '</div>';
  }


  var DVL_PM_TF_SET_1001 = ["1m","3m","5m","15m"];
  function pmWatchTf(){
    var tf = "";
    try{ tf = localStorage.getItem("DVL_PM_WATCH_TF_1001") || ""; }catch(_){}
    if(DVL_PM_TF_SET_1001.indexOf(tf) < 0) tf = "3m";
    return tf;
  }
  function pmTfProfile(tf,item,c,idx){
    tf = DVL_PM_TF_SET_1001.indexOf(tf) >= 0 ? tf : "3m";
    var m = ageMin(item.age), force = clamp(Math.round(num(item.force, idx===0?68:55)),1,99);
    var adj = 0, mode = "Equilíbrio";
    if(tf === "1m"){
      mode = "início rápido";
      adj += m <= 1 ? 15 : (m <= 3 ? 8 : (m <= 6 ? 0 : -12));
      adj += c.conf >= 4 ? 4 : 0;
    }else if(tf === "3m"){
      mode = "arranque provável";
      adj += m <= 3 ? 10 : (m <= 6 ? 5 : -5);
      adj += c.conf >= 4 ? 5 : 0;
    }else if(tf === "5m"){
      mode = "confirmação";
      adj += c.conf >= 5 ? 10 : (c.conf >= 4 ? 6 : -3);
      adj += force >= 70 ? 4 : 0;
    }else if(tf === "15m"){
      mode = "filtro maior";
      adj += c.conf >= 5 && force >= 76 ? 9 : (c.conf >= 4 ? 2 : -8);
      adj += m >= 8 ? 2 : -2;
    }
    var score = clamp(force + adj, 8, 96);
    var st = itemState(item,c);
    if(score >= 82){ st = {label:"PERTO",cls:"",stage:"Arranque perto",stageCls:"ready",stageN:4,forceCls:"",trigger:"monitorar gatilho no "+tf}; }
    else if(score >= 64){ st = {label:"VIGIAR",cls:"watch",stage:"Em formação",stageCls:"forming",stageN:2,forceCls:"mid",trigger:"acompanhar "+tf}; }
    else if(score >= 44){ st = {label:"FORMANDO",cls:"watch",stage:"Inicial",stageCls:"initial",stageN:1,forceCls:"low",trigger:"cedo no "+tf}; }
    else { st = {label:"FRACO",cls:"expired",stage:"Sem arranque",stageCls:"drop",stageN:1,forceCls:"bad",trigger:"não priorizar no "+tf}; }
    return {tf:tf,force:score,state:st,mode:mode};
  }
  function pmTfHint(tf){
    if(tf==="1m") return "<b>1m</b> caça o início mais cedo, mas tem mais ruído.";
    if(tf==="3m") return "<b>3m</b> equilibra antecipação e limpeza do movimento.";
    if(tf==="5m") return "<b>5m</b> valida se o pré-momentum está virando setup.";
    return "<b>15m</b> filtra contexto maior antes do arranque.";
  }
  function ensurePMTfTabs(panel,activeTf){
    if(!panel) return;
    var tabs = panel.querySelector(".dvlCp1001PMTfTabs");
    if(!tabs){
      var html = '<div class="dvlCp1001PMTfTabs" data-dvl-pm-tf-tabs>'+
        DVL_PM_TF_SET_1001.map(function(tf){ return '<button type="button" class="dvlCp1001PMTfBtn" data-dvl-pm-watch-tf="'+tf+'">'+tf+'</button>'; }).join("")+
        '<div class="dvlCp1001PMTfHint" data-dvl-pm-tf-hint></div>'+
      '</div>';
      var top = panel.querySelector(".dvlCp0986PMTopLine");
      if(top) top.insertAdjacentHTML("afterend", html);
      else {
        var list = panel.querySelector(".dvlCp0986PMList");
        if(list) list.insertAdjacentHTML("beforebegin", html);
      }
      tabs = panel.querySelector(".dvlCp1001PMTfTabs");
    }
    if(tabs){
      tabs.querySelectorAll("[data-dvl-pm-watch-tf]").forEach(function(btn){
        var tf = btn.getAttribute("data-dvl-pm-watch-tf");
        btn.classList.toggle("is-active", tf === activeTf);
        var sm = btn.querySelector("small");
        if(sm) sm.remove();
      });
      var hint = tabs.querySelector("[data-dvl-pm-tf-hint]");
      if(hint) safeHTML(hint, '');
    }
  }
  function bindPMTfTabs(p){
    if(!p || p.getAttribute("data-dvl-pm-tf-tabs-bound-1001")==="1") return;
    p.setAttribute("data-dvl-pm-tf-tabs-bound-1001","1");
    p.addEventListener("click",function(ev){
      var btn = ev.target && ev.target.closest ? ev.target.closest("[data-dvl-pm-watch-tf]") : null;
      if(!btn) return;
      var tf = btn.getAttribute("data-dvl-pm-watch-tf") || "3m";
      if(DVL_PM_TF_SET_1001.indexOf(tf) < 0) tf = "3m";
      try{ localStorage.setItem("DVL_PM_WATCH_TF_1001",tf); }catch(_){}
      schedule(10);
    },true);
  }

  function setupBaseScore(setup, conf){
    var s=norm(setup);
    if(/pos-flat|pos flat|limpo|acumulo|acúmulo|pre-break|pre break|break|spike|zona|zone|pull|romp/.test(s)) return Math.max(conf,4);
    if(/formando|observ/.test(s)) return Math.max(conf,3);
    return conf;
  }
  function readOpps(p){
    var out=[], ageMap=scannerAgeMap(p), tf=analysisTf();
    try{
      p.querySelectorAll("[data-dvl-cp-section='opportunities'] .dvlCp0976Opp").forEach(function(row,idx){
        var pair=row.querySelector(".dvlCp0976Pair b"), setup=row.querySelector(".dvlCp0976Pair small"), pct=row.querySelector(".dvlCp0976Pct"), side=row.querySelector(".dvlCp0976Long"), ageEl=row.querySelector(".dvlCp0987OppAge b");
        if(!pair) return;
        var sym=compact(pair.textContent), age=(ageMap[sym] || row.getAttribute("data-dvl-opp-age") || (ageEl&&ageEl.textContent) || fallbackAge(idx)).trim();
        var force=clamp(Math.round(num(pct&&pct.textContent, idx===0?78:idx===1?72:65)),1,99);
        var sideTxt=/SHORT/i.test(side&&side.textContent||"")?"SHORT":(/NEUTRO|NEUTRAL/i.test(side&&side.textContent||"")?"NEUTRO":"LONG");
        var setupTxt=String(setup&&setup.textContent||"").replace(/^Setup:\s*/i,"").trim() || "Formando";
        out.push({row:row,index:idx,symbol:sym,display:display(sym),setup:setupTxt,force:force,side:sideTxt,age:age,tf:tf});
      });
    }catch(_){}
    return out;
  }

  function arrOI(){
    try{ if(typeof window.gOI==="function"){ var a=window.gOI(); if(Array.isArray(a)&&a.length)return a; } }catch(_){}
    try{ var c=window.DVLOpenInterestOscillator&&window.DVLOpenInterestOscillator.cache; if(c&&Array.isArray(c.data)&&c.data.length)return c.data; }catch(_){}
    return [];
  }
  function arrLS(){
    try{ if(typeof window.gLS==="function"){ var a=window.gLS(); if(Array.isArray(a)&&a.length)return a; } }catch(_){}
    try{ var c=window.DVLLongShortOscillator&&window.DVLLongShortOscillator.cache; if(c&&Array.isArray(c.data)&&c.data.length)return c.data; }catch(_){}
    return [];
  }
  function val(o,keys){
    for(var i=0;i<keys.length;i++){ var k=keys[i]; if(o&&o[k]!=null){ var n=+o[k]; if(isFinite(n))return n; } }
    if(Array.isArray(o)){ for(var j=0;j<keys.length;j++){ var idx=parseInt(keys[j],10); if(isFinite(idx)&&o[idx]!=null){ var n2=+o[idx]; if(isFinite(n2))return n2; } } }
    return NaN;
  }
  function trend(arr,keys){
    if(!Array.isArray(arr)||arr.length<6)return {dir:"unknown",pct:0,n:arr?arr.length:0};
    var vals=arr.map(function(x){return val(x,keys);}).filter(function(v){return isFinite(v)&&v>0;}).slice(-12);
    if(vals.length<6)return {dir:"unknown",pct:0,n:vals.length};
    var half=Math.max(3,Math.floor(vals.length/2)), a=vals.slice(0,half), b=vals.slice(half);
    function avg(x){return x.reduce(function(s,v){return s+v;},0)/Math.max(1,x.length);}
    var avga=avg(a), avgb=avg(b), pct=avga?((avgb-avga)/avga)*100:0, th=.035;
    return {dir:pct>th?"up":(pct<-th?"down":"flat"),pct:pct,n:vals.length};
  }
  function derivatives(){
    var oi=trend(arrOI(),["value","close","c","sumOpenInterestValue","sumOpenInterest","qty","openInterest",4,5]);
    var ls=trend(arrLS(),["ratio","longShortRatio","long_short_ratio","longShort","value","close","c",1,4]);
    var known=oi.dir!=="unknown"&&ls.dir!=="unknown";
    return {oi:oi.dir,lsr:ls.dir,known:known,pump:known&&oi.dir==="up"&&ls.dir==="down",oiPct:oi.pct||0,lsrPct:ls.pct||0};
  }



  function normalizeFactor1010(v){
    var s=norm(v);
    if(/good|ok|true|1|bull|valid|alinh/.test(s)) return "good";
    if(/risk|bad|contra|false|-1|invalid/.test(s)) return "risk";
    if(/wait|neutro|neutral|0|obs|watch|flat/.test(s)) return "wait";
    if(!s) return "off";
    return s;
  }
  function normalizeSymbol1010(v){ return compact(v || ""); }
  function readGlobalFeed1010(){
    try{
      if(window.DVL_COPILOT_SIGNAL_FEED && typeof window.DVL_COPILOT_SIGNAL_FEED === "object"){
        return window.DVL_COPILOT_SIGNAL_FEED;
      }
    }catch(_){}
    return liveFeedState1010.feed;
  }
  function normalizeFeed1010(feed){
    feed = feed && typeof feed === "object" ? feed : {};
    var out = {
      version:feed.version || "1.010",
      window:feed.window || feed.lookback || "24h",
      updatedAt:Number(feed.updatedAt || feed.ts || Date.now()),
      assets:{}
    };
    var src = feed.assets || feed.symbols || feed.data || {};
    if(Array.isArray(src)){
      src.forEach(function(a){ if(a){ out.assets[normalizeSymbol1010(a.symbol||a.pair||a.asset)] = a; } });
    }else{
      Object.keys(src||{}).forEach(function(k){
        var a = src[k] || {};
        var sym = normalizeSymbol1010(a.symbol || a.pair || a.asset || k);
        if(sym) out.assets[sym] = a;
      });
    }
    return out;
  }
  function liveFeedAssets1010(){
    var feed = normalizeFeed1010(readGlobalFeed1010() || {});
    return feed.assets || {};
  }
  function liveFeedAsset1010(sym){
    sym = normalizeSymbol1010(sym || currentPairClean());
    var assets = liveFeedAssets1010();
    return assets[sym] || null;
  }
  function liveFeedTop1010(limit){
    var feed = normalizeFeed1010(readGlobalFeed1010() || {});
    var arr = Object.keys(feed.assets || {}).map(function(k){
      var a = feed.assets[k] || {};
      var conf = num(a.conviction ?? a.confidence ?? a.score, 0);
      return {symbol:normalizeSymbol1010(a.symbol || a.pair || a.asset || k), raw:a, confidence:conf, updatedAt:Number(a.updatedAt || a.ts || feed.updatedAt || 0)};
    }).filter(function(x){ return !!x.symbol; });
    arr.sort(function(a,b){ return (b.confidence||0) - (a.confidence||0); });
    return arr.slice(0, limit || 3);
  }
  function applyFeed1010(feed){
    var normalized = normalizeFeed1010(feed);
    liveFeedState1010.feed = normalized;
    liveFeedState1010.updatedAt = Date.now();
    try{ window.DVL_COPILOT_SIGNAL_FEED = normalized; }catch(_){}
    try{
      var ev = new CustomEvent("dvl:copilot-live-feed", { detail:{ feed:normalized } });
      window.dispatchEvent(ev);
      document.dispatchEvent(ev);
    }catch(_){}
    try{ if(typeof schedule === "function") schedule(0); }catch(_){}
    return normalized;
  }
  function updateFeedAsset1010(symbol,data){
    var feed = normalizeFeed1010(readGlobalFeed1010() || {});
    var sym = normalizeSymbol1010(symbol || (data && (data.symbol || data.pair || data.asset)));
    if(!sym) return feed;
    feed.assets = feed.assets || {};
    feed.assets[sym] = Object.assign({}, feed.assets[sym] || {}, data || {}, { symbol:sym, updatedAt:Date.now() });
    feed.updatedAt = Date.now();
    return applyFeed1010(feed);
  }
  function stateFromFeedFactors1010(factors,key){
    factors = factors || {};
    var v = factors[key];
    if(v && typeof v === "object") v = v.state || v.status || v.value;
    return normalizeFactor1010(v);
  }
  function signalFromLiveFeed1010(item,drv){
    item = item || {};
    var sym = normalizeSymbol1010(item.symbol || item.pair || "");
    var a = liveFeedAsset1010(sym);
    if(!a) return null;
    var confidence = clamp(Math.round(num(a.conviction ?? a.confidence ?? a.score, item.force || 55)), 1, 99);
    var side = String(a.side || a.direction || item.side || "LONG").toUpperCase();
    side = /SHORT|SELL|DOWN|BEAR/.test(side) ? "SHORT" : "LONG";
    var factors = a.factors || a.states || {};
    var states = [
      stateFromFeedFactors1010(factors,"vt") || stateFromFeedFactors1010(factors,"volume") || "wait",
      stateFromFeedFactors1010(factors,"sz") || stateFromFeedFactors1010(factors,"zone") || "wait",
      stateFromFeedFactors1010(factors,"cs") || stateFromFeedFactors1010(factors,"candle") || "wait",
      stateFromFeedFactors1010(factors,"oi") || "wait",
      stateFromFeedFactors1010(factors,"ls") || stateFromFeedFactors1010(factors,"lsr") || "wait",
      stateFromFeedFactors1010(factors,"ex") || stateFromFeedFactors1010(factors,"exhaustion") || "wait"
    ];
    var conf = states.reduce(function(n,x){ return n + (x==="good"?1:0); },0);
    var age = String(a.age || a.timeAgo || a.elapsed || "");
    if(!age){
      var u = Number(a.updatedAt || a.ts || 0);
      age = u ? Math.max(0,Math.floor((Date.now()-u)/60000))+"m" : "agora";
    }
    var tfOrigin = a.tfOrigin || a.originTf || a.origin || a.tf || item.tf || "1m";
    var tfConfirm = a.tfConfirm || a.confirmTf || a.confirm || "5m";
    var contextTf = a.contextTf || a.tfContext || a.context || "1h";
    return {
      ready:true,
      partial:false,
      source:"live-feed-24h",
      window:a.window || (readGlobalFeed1010() && readGlobalFeed1010().window) || "24h",
      symbol:sym,
      side:side,
      confidence:confidence,
      conf:clamp(conf,1,6),
      states:states,
      age:age,
      setup:"Setup: " + String(a.setup || a.label || a.status || "Feed 24h"),
      metrics:a.metrics || {},
      scanner:a.scanner || null,
      candles:a.candles || a.bars || a.ohlc || [],
      tfOrigin:tfOrigin,
      tfConfirm:tfConfirm,
      contextTf:contextTf,
      factors:{vt:states[0],sz:states[1],cs:states[2],oi:states[3],ls:states[4],ex:states[5]},
      noTradeExecution:true
    };
  }
  function renderLiveFeedRows1010(p){
    try{
      p = p || page();
      if(!p) return false;
      var top = liveFeedTop1010(3);
      if(!top.length) return false;
      var rows = [].slice.call(p.querySelectorAll("[data-dvl-cp-section='opportunities'] .dvlCp0976Opp"));
      if(!rows.length) return false;
      top.forEach(function(x,i){
        var row = rows[i]; if(!row) return;
        var a = x.raw || {}, sym = x.symbol, conf = clamp(Math.round(num(a.conviction ?? a.confidence ?? a.score, 55)),1,99);
        var side = String(a.side || a.direction || "LONG").toUpperCase();
        side = /SHORT|SELL|DOWN|BEAR/.test(side) ? "SHORT" : "LONG";
        var setup = "Setup: " + String(a.setup || a.label || a.status || "Feed 24h");
        var age = String(a.age || a.timeAgo || a.elapsed || "agora");
        var pair = row.querySelector(".dvlCp0976Pair b");
        if(pair) pair.textContent = display(sym);
        var small = row.querySelector(".dvlCp0976Pair small");
        if(small) small.textContent = setup;
        var pct = row.querySelector(".dvlCp0976Pct");
        if(pct) pct.innerHTML = conf + "%<small>Convicção</small>";
        var sideEl = row.querySelector(".dvlCp0976Long");
        if(sideEl) sideEl.textContent = side;
        var tf = row.querySelector("[data-dvl-opp-inline-tf]");
        if(tf) tf.textContent = String(a.tfOrigin || a.originTf || a.tf || "1m");
        row.setAttribute("data-dvl-feed-source","live-feed-24h");
        row.setAttribute("data-dvl-symbol",sym);
        row.setAttribute("data-dvl-opp-age",age);
        row.setAttribute("data-dvl-ai-tf-origin",String(a.tfOrigin || a.originTf || a.tf || "1m"));
        row.setAttribute("data-dvl-ai-tf-confirm",String(a.tfConfirm || a.confirmTf || "5m"));
      });
      return true;
    }catch(_){return false;}
  }

  function currentPairClean(){
    try{
      var st=document.getElementById("symbolText");
      var raw=st?(st.textContent||"").trim():"";
      if(raw) return compact(raw);
    }catch(_){}
    try{ if(window.S&&S.sym) return compact(S.sym); }catch(_){}
    try{ if(window.symbol) return compact(window.symbol); }catch(_){}
    return "BTCUSDT";
  }

  function rawCandles1005(){
    var arr=[];
    try{
      if(window.DVL_CANDLE_DATA_MODEL && typeof window.DVL_CANDLE_DATA_MODEL.getCandles==="function"){
        arr = window.DVL_CANDLE_DATA_MODEL.getCandles();
      }
    }catch(_){}
    try{ if((!arr||!arr.length) && window.S && Array.isArray(S.candles)) arr=S.candles; }catch(_){}
    try{ if((!arr||!arr.length) && Array.isArray(window.klines)) arr=window.klines; }catch(_){}
    return Array.isArray(arr)?arr:[];
  }
  function cOpen(c){return num(c&&(c.open??c.o??c[1]??c.close??c.c));}
  function cHigh(c){return num(c&&(c.high??c.h??c[2]??c.close??c.c));}
  function cLow(c){return num(c&&(c.low??c.l??c[3]??c.close??c.c));}
  function cClose(c){return num(c&&(c.close??c.c??c[4]??c.price));}
  function cVol(c){return num(c&&(c.volume??c.v??c.vol??c[5]));}
  function avg1005(a){var s=0,n=0;for(var i=0;i<a.length;i++){var v=num(a[i]);if(isFinite(v)){s+=v;n++;}}return n?s/n:0;}
  function pct1005(a,b){return b?((a-b)/Math.abs(b))*100:0;}

  function scannerRows1005(){
    var rows=[];
    try{
      var api=window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780;
      var cands=[
        api&&api.state&&api.state.rawRows,
        api&&api.rawRows,
        window.dvlScannerRows,
        window.DVL_SCANNER_ROWS,
        window.DVL_MEXC_SCANNER_ROWS
      ];
      for(var i=0;i<cands.length;i++){
        if(Array.isArray(cands[i])&&cands[i].length){rows=cands[i];break;}
      }
    }catch(_){}
    return rows||[];
  }
  function scannerMap1005(){
    var map={};
    scannerRows1005().forEach(function(r,i){
      var rawSym=String(r.symbol||r.sym||r.pair||r.asset||r.base||"").trim();
      if(!rawSym) return;
      var sym=compact(rawSym);
      var score=num(r.score||r.spikeScore||r.spike||r.rankScore||r.confidence||0);
      if(score>0&&score<=1) score*=100;
      var age=String(r.age||r.timeAgo||r.elapsed||r.minutesAgo||r.spikeAge||"").trim();
      if(!age && r.updatedAt){ try{ age=Math.max(0,Math.round((Date.now()-Number(r.updatedAt))/60000))+"m"; }catch(_){} }
      var side=String(r.side||r.direction||r.bias||"").toUpperCase();
      if(/SHORT|SELL|DOWN|BEAR/.test(side)) side="SHORT"; else if(/LONG|BUY|UP|BULL/.test(side)) side="LONG"; else side="";
      map[sym]={raw:r,index:i,score:clamp(Math.round(score||0),0,100),age:age,setup:String(r.setup||r.status||r.label||""),side:side};
    });
    return map;
  }

  function candleMetrics1005(candles){
    candles=Array.isArray(candles)?candles:[];
    var n=candles.length, last=candles[n-1]||{}, prev=candles[n-2]||last;
    var recent=candles.slice(Math.max(0,n-8));
    var prior=candles.slice(Math.max(0,n-38),Math.max(0,n-8));
    var vols=recent.map(cVol), pvols=prior.map(cVol);
    var volRecent=avg1005(vols), volPrior=avg1005(pvols), lastVol=cVol(last);
    var volRatio=volPrior?volRecent/volPrior:1;
    var lastVolRatio=volPrior?lastVol/volPrior:volRatio;
    var close=cClose(last), open=cOpen(last), high=cHigh(last), low=cLow(last), prevClose=cClose(prev)||open;
    var range=Math.max(0,high-low), body=Math.abs(close-open), bodyRatio=range?body/range:0;
    var upper=range?Math.max(0,high-Math.max(open,close))/range:0;
    var lower=range?Math.max(0,Math.min(open,close)-low)/range:0;
    var look=Math.min(24,Math.max(1,n-1)), ref=cClose(candles[n-1-look]||last)||close;
    var change=pct1005(close,ref);
    var side=change<-0.18?"SHORT":"LONG";
    if(Math.abs(change)<0.12) side=close>=prevClose?"LONG":"SHORT";
    var avgRange=avg1005(candles.slice(Math.max(0,n-20)).map(function(c){return Math.max(0,cHigh(c)-cLow(c));}));
    var hi=Math.max.apply(null,candles.slice(Math.max(0,n-30)).map(cHigh).filter(isFinite));
    var lo=Math.min.apply(null,candles.slice(Math.max(0,n-30)).map(cLow).filter(isFinite));
    if(!isFinite(hi)) hi=high; if(!isFinite(lo)) lo=low;
    var nearHigh=avgRange?Math.abs(close-hi)<=avgRange*.75:false;
    var nearLow=avgRange?Math.abs(close-lo)<=avgRange*.75:false;
    var spikeIdx=-1, spikeRatio=0;
    for(var i=Math.max(1,n-24);i<n;i++){
      var base=avg1005(candles.slice(Math.max(0,i-20),i).map(cVol));
      var vr=base?cVol(candles[i])/base:0;
      if(vr>spikeRatio){spikeRatio=vr;spikeIdx=i;}
    }
    var spikeAge=spikeIdx>=0?n-1-spikeIdx:99;
    return {n:n,side:side,change:change,volRatio:volRatio,lastVolRatio:lastVolRatio,spikeRatio:spikeRatio,spikeAge:spikeAge,bodyRatio:bodyRatio,upper:upper,lower:lower,nearHigh:nearHigh,nearLow:nearLow,avgRange:avgRange,close:close,prevClose:prevClose,open:open};
  }

  function signalAgeLabel1005(ageBars, scanAge){
    if(scanAge) return scanAge;
    if(ageBars<=0) return "agora";
    if(ageBars>=99) return "antigo";
    return ageBars+"m";
  }
  function stateScore1005(s){
    return s==="good"?1:(s==="wait"?.5:(s==="risk"?-.65:0));
  }
  function stateFromBool1005(g,w,r){
    return g?"good":(w?"wait":(r?"risk":"off"));
  }

  function computeSignal1005(item,drv){
    item=item||{};
    var sym=compact(item.symbol||item.pair||"");
    var current=currentPairClean();
    var feedSignal = signalFromLiveFeed1010(item,drv);
    if(feedSignal) return feedSignal;
    var scans=scannerMap1005(), scan=scans[sym]||null;
    var candles=rawCandles1005();
    var hasCandles=!!(candles&&candles.length>=30&&(!sym||sym===current));
    var m=hasCandles?candleMetrics1005(candles):null;
    var hasScanner=!!scan;
    if(!hasCandles&&!hasScanner){
      return {ready:false,partial:false,source:"fallback",confidence:clamp(Math.round(num(item.force,55)),35,82),states:null};
    }

    var scanScore=hasScanner?clamp(scan.score||num(item.force,60),40,96):0;
    var side=(scan&&scan.side)||(m&&m.side)||item.side||"LONG";
    side=/SHORT/.test(String(side))?"SHORT":"LONG";
    var age=signalAgeLabel1005(m?m.spikeAge:99,scan&&scan.age);
    var ageM=ageMin(age);
    var vtGood=false, vtWait=false, szGood=false, szWait=false, csGood=false, csWait=false, exGood=false, exWait=false, exRisk=false;
    if(hasCandles){
      vtGood=(m.spikeRatio>=1.55||m.lastVolRatio>=1.42||m.volRatio>=1.28)&&m.spikeAge<=6;
      vtWait=(m.spikeRatio>=1.18||m.lastVolRatio>=1.15||m.volRatio>=1.10)&&m.spikeAge<=12;
      szGood=side==="LONG"?m.nearLow||m.nearHigh:m.nearHigh||m.nearLow;
      szWait=!!(m.avgRange&&Math.abs(m.change)>.18);
      var dirOk=side==="LONG"?m.close>=m.open:m.close<=m.open;
      var wickOk=side==="LONG"?m.lower>=.28:m.upper>=.28;
      var contraWick=side==="LONG"?m.upper>=.48:m.lower>=.48;
      csGood=dirOk&&m.bodyRatio>=.42;
      csWait=(dirOk&&m.bodyRatio>=.24)||wickOk;
      exRisk=(Math.abs(m.change)>1.35&&contraWick)||(ageM>=18);
      exGood=!exRisk&&ageM<=5;
      exWait=!exRisk&&!exGood;
    }
    if(hasScanner){
      vtGood=vtGood||scanScore>=76;
      vtWait=vtWait||scanScore>=60;
      var setup=norm(scan.setup||"");
      szGood=szGood||/(zona|zone|reteste|break|romp|limpo|acumulo|acúmulo|pos-flat|pós-flat)/.test(setup);
      szWait=szWait||scanScore>=58;
      csGood=csGood||scanScore>=82;
      csWait=csWait||scanScore>=66;
      if(ageM<=3) exGood=true;
      else if(ageM<=10) exWait=true;
      else exRisk=true;
    }

    var oiGood=false, oiWait=false, lsGood=false, lsWait=false, oiRisk=false, lsRisk=false;
    if(drv&&drv.known&&side==="LONG"){
      oiGood=drv.oi==="up"&&drv.lsr==="down";
      lsGood=oiGood;
      oiWait=drv.oi==="up"&&!oiGood;
      lsWait=drv.lsr==="down"&&!oiGood;
      oiRisk=drv.oi==="down";
      lsRisk=drv.lsr==="up";
    }else if(drv&&drv.known){
      oiWait=drv.oi==="up"||drv.oi==="down";
      lsWait=drv.lsr==="up"||drv.lsr==="down";
    }else{
      oiWait=true; lsWait=true;
    }

    var states=[
      stateFromBool1005(vtGood,vtWait,!vtWait),
      stateFromBool1005(szGood,szWait,false),
      stateFromBool1005(csGood,csWait,!csWait&&hasCandles),
      stateFromBool1005(oiGood,oiWait,oiRisk),
      stateFromBool1005(lsGood,lsWait,lsRisk),
      exRisk?"risk":(exGood?"good":(exWait?"wait":"off"))
    ];

    var weighted=26;
    var weights=[16,13,14,9,9,11];
    for(var i=0;i<states.length;i++) weighted += weights[i]*stateScore1005(states[i]);
    if(ageM<=2) weighted+=7; else if(ageM<=5) weighted+=4; else if(ageM>=14) weighted-=8;
    if(hasCandles&&m){ weighted += Math.min(8,Math.abs(m.change)*2.8); }
    if(hasScanner&&scanScore){ weighted = weighted*.65 + scanScore*.35; }
    var confidence=clamp(Math.round(weighted),18,96);
    var conf=states.reduce(function(a,x){return a+(x==="good"?1:0);},0);
    if(conf<1&&confidence>52) conf=2;
    if(conf<2&&confidence>64) conf=3;
    var setupLabel="Contexto vivo";
    if(vtGood&&szGood) setupLabel="Spike + Zona";
    else if(vtGood) setupLabel="Volume vivo";
    else if(csGood) setupLabel="Candle forte";
    else if(hasScanner&&scan&&scan.setup) setupLabel=String(scan.setup).replace(/^Setup:\s*/i,"");
    else if(hasCandles&&m&&Math.abs(m.change)>.45) setupLabel="Momentum";
    if(exRisk) setupLabel+=" · risco exaustão";

    return {
      ready:true,
      partial:!(hasCandles&&hasScanner),
      source:(hasCandles?"candles":"")+(hasCandles&&hasScanner?"+":"")+(hasScanner?"scanner":""),
      symbol:sym||current,
      side:side,
      confidence:confidence,
      conf:clamp(conf,1,6),
      states:states,
      age:age,
      setup:"Setup: "+setupLabel,
      metrics:m||{},
      scanner:scan||null,
      factors:{vt:states[0],sz:states[1],cs:states[2],oi:states[3],ls:states[4],ex:states[5]},
      noTradeExecution:true
    };
  }

  function signalForItem1005(item,drv){
    try{ return computeSignal1005(item,drv); }catch(e){ return {ready:false,error:String(e&&e.message||e),confidence:clamp(Math.round(num(item&&item.force,55)),20,85)}; }
  }

  window.DVL_COPILOT_SIGNAL_ENGINE_1005={
    version:"1.005",
    compute:function(item){
      var drv;
      try{drv=derivatives();}catch(_){drv={known:false,oi:"unknown",lsr:"unknown"};}
      return computeSignal1005(item||{},drv);
    },
    computeAll:function(items){
      var drv;
      try{drv=derivatives();}catch(_){drv={known:false,oi:"unknown",lsr:"unknown"};}
      return (Array.isArray(items)?items:[]).map(function(it){return computeSignal1005(it,drv);});
    },
    audit:function(){
      var candles=rawCandles1005(), scans=scannerRows1005();
      var sample=computeSignal1005({symbol:currentPairClean(),force:55,side:"LONG"},derivatives());
      return {version:"1.005",candles:candles.length,scannerRows:scans.length,source:sample.source||"fallback",ready:!!sample.ready,confidence:sample.confidence,states:sample.states,tfLimit:"4h",noTradeExecution:true,noOrdersSent:true};
    }
  };
  window.DVL_COPILOT_SIGNAL_ENGINE=window.DVL_COPILOT_SIGNAL_ENGINE_1005;
  window.DVL_COPILOT_SIGNAL_ENGINE_AUDIT_1005=function(){return window.DVL_COPILOT_SIGNAL_ENGINE_1005.audit();};

  function confluence(item, drv){
    var liveSig=signalForItem1005(item,drv);
    if(liveSig&&liveSig.ready){
      item.dvlSignal=liveSig;
      item.force=liveSig.confidence;
      item.side=liveSig.side||item.side;
      item.age=liveSig.age||item.age;
      item.setup=liveSig.setup||item.setup;
      var staleLive=ageBucket(item.age), oldLive=staleLive==="old", expiredLive=staleLive==="expired";
      return {states:liveSig.states,conf:liveSig.conf,pump:drv&&drv.known&&drv.pump&&item.side==="LONG",old:oldLive,expired:expiredLive,signal:liveSig};
    }
    var stale=ageBucket(item.age), old=stale==="old", expired=stale==="expired";
    var force=item.force, base=setupBaseScore(item.setup, force>=82?5:force>=68?4:force>=52?3:2);
    var states=[];
    states[0]=force>=65?"good":(force>=45?"wait":"risk");                         // VT
    states[1]=base>=4?"good":(base>=3?"wait":"off");                               // SZ
    states[2]=force>=76?"good":(force>=55?"wait":"risk");                          // CS
    states[3]=base>=5?"good":(base>=3?"wait":"off");                               // OI base preserved
    states[4]=force>=72?"good":(force>=58?"wait":"risk");                          // LS base preserved
    states[5]=expired?"risk":(old?"wait":(force>=80?"good":"wait"));               // EX
    if(drv.known && item.side==="LONG"){
      if(drv.pump){ states[3]="good"; states[4]="good"; }
      else{
        states[3]=drv.oi==="up"?"wait":(drv.oi==="down"?"risk":"off");
        states[4]=drv.lsr==="down"?"wait":(drv.lsr==="up"?"risk":"off");
      }
    }
    if(expired){ states[2]="risk"; states[5]="risk"; }
    var conf=states.reduce(function(s,x){return s+(x==="good"?1:0);},0);
    conf=clamp(conf,1,6);
    return {states:states,conf:conf,pump:drv.known&&drv.pump&&item.side==="LONG",old:old,expired:expired};
  }

  function itemState(item,c){
    if(c.expired || item.force<28 || c.conf<2) return {label:"JÁ FOI",cls:"expired",stage:"Descartar",stageCls:"drop",stageN:1,forceCls:"bad",trigger:"sinal antigo / risco ruim"};
    if(ageMin(item.age)<=2 && c.conf>=5) return {label:"AGORA",cls:"",stage:"Quase pronto",stageCls:"ready",stageN:4,forceCls:"",trigger:"confirmar pullback"};
    if(c.conf>=4) return {label:"VIGIAR",cls:"watch",stage:"Em formação",stageCls:"forming",stageN:2,forceCls:"mid",trigger:"aguardar confirmação"};
    return {label:"FORMANDO",cls:"watch",stage:"Inicial",stageCls:"initial",stageN:1,forceCls:"low",trigger:"monitorar alinhamento"};
  }

  function ensureOppLive(row){
    var live=row.querySelector(".dvlCp0996OppLive");
    if(!live){
      live=document.createElement("div");
      live.className="dvlCp0996OppLive";
      row.appendChild(live);
    }
    return live;
  }
  function patchOpps(items,drv){
    var p = page(), topC = items[0] ? confluence(items[0],drv) : null, topTf = items[0] ? aiTfPack(items[0], topC, 0) : {label:"1m→5m",origin:"1m",confirm:"5m",context:"1h"};
    try{
      var opp = p && p.querySelector("[data-dvl-cp-section='opportunities']");
      if(opp){
        opp.setAttribute("data-dvl-ai-tf", topTf.label);
        opp.setAttribute("data-dvl-ai-tf-origin", topTf.origin);
        opp.setAttribute("data-dvl-ai-tf-confirm", topTf.confirm);
        opp.setAttribute("data-dvl-ai-tf-context", topTf.context);
        var meta = opp.querySelector(".dvlCp0997SectionMeta");
        if(meta) meta.remove();
      }
    }catch(_){}
    items.forEach(function(item){
      var c=confluence(item,drv), tfPack=aiTfPack(item,c,item.index), st=itemState(item,c), row=item.row, sig=item.dvlSignal||c.signal||null;
      if(sig&&sig.ready){
        var pctEl=row.querySelector(".dvlCp0976Pct");
        if(pctEl){
          pctEl.setAttribute("data-dvl-live-confidence",sig.partial?"partial":"1");
          safeHTML(pctEl,esc(sig.confidence)+'%<small>Convicção</small>');
        }
        var small=row.querySelector(".dvlCp0976Pair small");
        if(small) safeText(row,".dvlCp0976Pair small",sig.setup||item.setup);
        var sideEl=row.querySelector(".dvlCp0976Long");
        if(sideEl) sideEl.textContent=sig.side||item.side;
        row.setAttribute("data-dvl-signal-live",sig.partial?"partial":"1");
        row.setAttribute("data-dvl-signal-source",sig.source||"fallback");
      }
      paintOppMiniCandles1009(row,item,sig||item.dvlSignal||null);
      row.setAttribute("data-dvl-symbol",item.symbol);
      row.setAttribute("data-dvl-opp-age",item.age);
      row.setAttribute("data-dvl-opp-confluence",String(c.conf));
      row.setAttribute("data-dvl-oi-trend",drv.oi);
      row.setAttribute("data-dvl-lsr-trend",drv.lsr);
      row.setAttribute("data-dvl-oi-lsr-pump",c.pump?"1":"0");
      row.setAttribute("data-dvl-ai-tf", tfPack.label);
      row.setAttribute("data-dvl-ai-tf-origin", tfPack.origin);
      row.setAttribute("data-dvl-ai-tf-confirm", tfPack.confirm);
      row.setAttribute("data-dvl-ai-tf-context", tfPack.context);
      paintIcon(row.querySelector(".dvlCp0976Coin"), item.symbol);
      try{
        var pairBox = row.querySelector(".dvlCp0976Pair");
        var pairName = pairBox && pairBox.querySelector("b");
        if(pairBox && pairName){
          var line = pairBox.querySelector(".dvlCp1004PairLine");
          if(!line){
            line = document.createElement("span");
            line.className = "dvlCp1004PairLine";
            pairBox.insertBefore(line, pairName);
            line.appendChild(pairName);
          }
          var inline = pairBox.querySelector("[data-dvl-opp-inline-tf]");
          if(!inline){
            inline = document.createElement("span");
            inline.className = "dvlCp1004InlineTf";
            inline.setAttribute("data-dvl-opp-inline-tf","");
            line.appendChild(inline);
          }
          inline.setAttribute("title", tfPack.clear);
          inline.textContent = tfPack.origin;
        }
      }catch(_){}
      var ageEl=row.querySelector(".dvlCp0987OppAge");
      if(!ageEl){
        ageEl=document.createElement("div"); ageEl.className="dvlCp0987OppAge";
        var pct=row.querySelector(".dvlCp0976Pct"); if(pct&&pct.parentNode)pct.insertAdjacentElement("afterend",ageEl); else row.appendChild(ageEl);
      }
      ageEl.className="dvlCp0987OppAge "+(c.expired?"is-expired":(c.old?"is-old":""));
      safeHTML(ageEl,'<small>Tempo</small><b>'+esc(item.age)+'</b>');
      var live=ensureOppLive(row);
      safeHTML(live,
        '<span class="dvlCp0996State '+st.cls+'">'+st.label+'</span>'+
        '<span class="dvlCp0997TfTag" title="'+esc(tfPack.clear)+'"><b>'+esc(tfPack.confirm)+'</b></span>'+
        '<span class="dvlCp0996Conf '+(c.conf>=5?'':c.conf>=3?'mid':'bad')+(c.pump?' dvl0996Pump':'')+'">'+c.conf+'/6</span>'+
        '<span class="dvlCp0996Trigger"><b>Gatilho:</b> '+esc(st.trigger)+'</span>'+
        '<span class="dvlCp0996Factors">'+bars(c.states,c.pump)+'</span>'
      );
    });
  }

  function patchPM(p,items,drv){
    var selectedPMTf = pmWatchTf();
    var panelTopC = items[0] ? confluence(items[0],drv) : null, panelTopTf = items[0] ? aiTfPack(items[0], panelTopC, 0) : {label:"1m→5m",origin:"1m",confirm:"5m",context:"1h"};
    var panelTf = selectedPMTf;
    var panel=p.querySelector("[data-dvl-cp-section='decision'][data-dvl-cp-section-version='0986']");
    if(!panel) return;
    panel.setAttribute("data-dvl-pm-source","single-engine-0996");
    panel.setAttribute("data-dvl-pm-stable","1");
    panel.setAttribute("data-dvl-pm-watch-tf",selectedPMTf);
    ensurePMTfTabs(panel,selectedPMTf);
    var rows=[].slice.call(panel.querySelectorAll(".dvlCp0986PMRow"));
    if(!rows.length) return;
    var list=items.slice(0,rows.length);
    while(list.length<rows.length){
      list.push({symbol:["BTCUSDT","ETHUSDT","SOLUSDT"][list.length]||"BTCUSDT", display:"", setup:"Observação", force:list.length?42:55, side:list.length===1?"SHORT":"LONG", age:list.length===0?"agora":list.length===1?"2m":"5m", tf:panelTf});
    }
    rows.forEach(function(row,idx){
      var item=list[idx], c=confluence(item,drv), tfPack=aiTfPack(item,c,idx), profile=pmTfProfile(selectedPMTf,item,c,idx), st=profile.state, force=profile.force, sig=item.dvlSignal||c.signal||null;
      if(sig&&sig.ready){
        row.setAttribute("data-dvl-signal-live",sig.partial?"partial":"1");
        row.setAttribute("data-dvl-signal-source",sig.source||"fallback");
      }
      row.setAttribute("data-dvl-symbol",item.symbol);
      row.setAttribute("data-dvl-opp-confluence",String(c.conf));
      row.setAttribute("data-dvl-oi-trend",drv.oi);
      row.setAttribute("data-dvl-lsr-trend",drv.lsr);
      row.setAttribute("data-dvl-oi-lsr-pump",c.pump?"1":"0");
      safeText(row,".dvlCp0986PMAssetName b", item.symbol);
      paintIcon(row.querySelector(".dvlCp0986PMAssetIcon"), item.symbol);
      var dir=row.querySelector(".dvlCp0986PMDir"); if(dir){ dir.textContent=item.side; safeClass(dir,"dvlCp0986PMDir"+(item.side==="SHORT"?" short":item.side==="NEUTRO"?" neutral":"")); }
      var stage=row.querySelector(".dvlCp0986PMStage"); if(stage){ safeClass(stage,"dvlCp0986PMStage "+st.stageCls); safeText(stage,"b",st.stage); safeHTML(stage.querySelector(".dvlCp0986PMStageDots"),dots(st.stageN)); }
      var f=row.querySelector(".dvlCp0986PMForce"); if(f){ safeClass(f,"dvlCp0986PMForce"+(st.forceCls?" "+st.forceCls:"")); safeText(f,"b",force+"%"); var bar=f.querySelector(".dvlCp0986PMBar i"); if(bar) bar.style.width=force+"%"; }
      var sp=row.querySelector(".dvlCp0986PMSpike"); if(sp){ safeClass(sp,"dvlCp0986PMSpike"+(c.expired?" expired":c.old?" old":"")); safeText(sp,"b",item.age); }
      var sc=row.querySelector(".dvlCp0986PMConfTop b"); if(sc){ sc.textContent=c.conf+"/6"; sc.className=(c.conf>=5?"":c.conf>=3?"mid":"bad")+(c.pump?" dvl0996Pump":""); }
      var confTop=row.querySelector(".dvlCp0986PMConfTop"), tfMeta=confTop&&confTop.querySelector(".dvlCp0997PmTf");
      if(confTop){
        if(!tfMeta){ confTop.insertAdjacentHTML("beforeend", '<em class="dvlCp0997PmTf" title="Pré-Momentum sendo avaliado no '+esc(selectedPMTf)+'"><b>'+esc(selectedPMTf)+'</b></em>'); tfMeta=confTop.querySelector(".dvlCp0997PmTf"); }
        else { tfMeta.setAttribute("title", 'Pré-Momentum sendo avaliado no '+selectedPMTf); safeHTML(tfMeta, '<b>'+esc(selectedPMTf)+'</b>'); }
      }
      var fs=row.querySelector(".dvlCp0986PMFactors"), h="", labs=["VT","SZ","CS","OI","LS","EX"];
      for(var i=0;i<6;i++) h+=factor(labs[i],c.states[i],c.pump&&(i===3||i===4));
      safeHTML(fs,h);
    });
    var min=panel.querySelector(".dvlCp0986PMMin"); if(min) safeHTML(min,'Min <b>3/6</b> <span class="dvlCp0990LivePulse"><i></i>single</span> <span class="dvlCp1001PMTfSelected"><b>'+esc(selectedPMTf)+'</b></span>');
    var old=panel.querySelector(".dvlCp0994RuleNote,.dvlCp0995RuleNote"); if(old) old.remove();
    var foot=panel.querySelector(".dvlCp0986PMFoot");
    if(foot){
      var note=panel.querySelector(".dvlCp0996RuleNote");
      var txt=drv.known?("OI "+(drv.oi==="up"?"subindo":drv.oi==="down"?"caindo":"flat")+" · LSR "+(drv.lsr==="down"?"caindo":drv.lsr==="up"?"subindo":"flat")):"aguardando dados reais de OI/LSR";
      var html='<span>VT/SZ/CS/EX preservados · <b>Pump = OI↑ + LSR↓</b></span><b>'+esc(txt)+'</b>';
      if(!note){ foot.insertAdjacentHTML("beforebegin",'<div class="dvlCp0996RuleNote">'+html+'</div>'); }
      else safeHTML(note,html);
      var fs=foot.querySelector("span"); if(fs) fs.textContent="Observação antecipada estabilizada. Entrada só após confirmação no gráfico.";
      var fb=foot.querySelector("b"); if(fb) fb.textContent="Bot bloqueado";
    }
  }

  function patchChat(p,items,drv){
    var chat=p.querySelector("[data-dvl-cp-section='ai-chat'][data-dvl-cp-section-version='0988']");
    if(!chat) return;
    var head=chat.querySelector(".dvlCp0988ChatHead");
    var ctx=chat.querySelector("[data-dvl-chat-live-context]")||chat.querySelector(".dvlCp0996ChatContext");
    if(!ctx && head){ head.insertAdjacentHTML("afterend",'<div class="dvlCp0996ChatContext" data-dvl-chat-live-context></div>'); ctx=chat.querySelector("[data-dvl-chat-live-context]"); }
    var top=items[0], c=top?confluence(top,drv):null, tfp=top?aiTfPack(top,c,0):null, sig=top?(top.dvlSignal||c.signal||null):null;
    var html=top?('<span>Engine viva: <b>'+esc(sig&&sig.source?sig.source:"dados parciais")+'</b> · '+esc(top.symbol)+' · '+esc(sig&&sig.confidence?sig.confidence:top.force)+'% · '+esc(tfp?tfp.origin:"-")+'→'+esc(tfp?tfp.confirm:"-")+' · '+(c?c.conf+"/6":"-")+'</span><b>sem ordens</b>'):'<span>Fonte única aguardando oportunidades.</span><b>sem ordens</b>';
    safeHTML(ctx,html);
    var first=chat.querySelector("[data-dvl-ai-chat-msgs] .dvlCp0988Msg.is-bot:first-child");
    if(first && top){
      safeHTML(first,'Engine viva do Copilot ligada. Top atual: <b>'+esc(top.symbol)+'</b>, convicção <b>'+esc(sig&&sig.confidence?sig.confidence:top.force)+'%</b>, fonte <b>'+esc(sig&&sig.source?sig.source:'parcial')+'</b>, fatores <b>'+(c?c.conf:'-')+'/6</b>. Execução de trade segue bloqueada.');
    }
  }

  function ensureBase(){
    try{ if(window.DVL_COPILOT_PRE_MOMENTUM_COMPACT_0986&&typeof window.DVL_COPILOT_PRE_MOMENTUM_COMPACT_0986.patch==="function") window.DVL_COPILOT_PRE_MOMENTUM_COMPACT_0986.patch(); }catch(_){}
    try{ if(window.DVL_COPILOT_OPPORTUNITY_TIMES_LOGOS_0987&&typeof window.DVL_COPILOT_OPPORTUNITY_TIMES_LOGOS_0987.patch==="function") window.DVL_COPILOT_OPPORTUNITY_TIMES_LOGOS_0987.patch(); }catch(_){}
    try{ if(window.DVL_COPILOT_AI_CHAT_SITE_HELPER_0988&&typeof window.DVL_COPILOT_AI_CHAT_SITE_HELPER_0988.patch==="function") window.DVL_COPILOT_AI_CHAT_SITE_HELPER_0988.patch(); }catch(_){}
    try{ if(window.DVL_COPILOT_AI_CHAT_PENULTIMATE_0989&&typeof window.DVL_COPILOT_AI_CHAT_PENULTIMATE_0989.patch==="function") window.DVL_COPILOT_AI_CHAT_PENULTIMATE_0989.patch(); }catch(_){}
  }


  function convictionElapsed1008(ms){
    var sec = Math.max(0, Math.floor((Date.now() - (Number(ms)||Date.now())) / 1000));
    if(sec < 60) return sec + "s";
    var min = Math.floor(sec / 60), rest = sec % 60;
    return min + "m" + (rest ? " " + rest + "s" : "");
  }
  function ensureConvictionTimer1008(p){
    try{
      if(!p) return;
      p.querySelectorAll("[data-dvl-cp-section='opportunities'] [data-dvl-conviction-timer],[data-dvl-cp-section='decision'] [data-dvl-conviction-timer],.dvlCp1006UpdateLine").forEach(function(el){el.remove();});
      var conf = p.querySelector("[data-dvl-cp-section='insight'] .dvlCp0976Confidence");
      if(conf && !conf.querySelector("[data-dvl-conviction-timer]")){
        var label = conf.querySelector("span");
        if(label) label.insertAdjacentHTML("afterend", '<em class="dvlCp1008ConvictionTimer" data-dvl-conviction-timer>Atualizado <b data-dvl-conviction-age>0s</b></em>');
        else conf.insertAdjacentHTML("afterbegin", '<em class="dvlCp1008ConvictionTimer" data-dvl-conviction-timer>Atualizado <b data-dvl-conviction-age>0s</b></em>');
      }
    }catch(_){}
  }
  function refreshConvictionTimer1008(p){
    try{
      p = p || page();
      if(!p) return;
      if(!lastConvictionUpdateAt1008) lastConvictionUpdateAt1008 = Date.now();
      var label = convictionElapsed1008(lastConvictionUpdateAt1008);
      var sec = Math.max(0, Math.floor((Date.now() - lastConvictionUpdateAt1008) / 1000));
      p.querySelectorAll("[data-dvl-cp-section='insight'] [data-dvl-conviction-age]").forEach(function(el){
        if(el.textContent !== label) el.textContent = label;
      });
      p.querySelectorAll("[data-dvl-cp-section='insight'] [data-dvl-conviction-timer]").forEach(function(el){
        el.classList.toggle("stale", sec >= 10);
      });
    }catch(_){}
  }
  function paintConvictionBars1008(el,confidence){
    if(!el) return;
    var total=7;
    var on=clamp(Math.round((Number(confidence)||0)/100*total),1,total);
    var html="";
    for(var i=0;i<total;i++) html+='<i class="'+(i<on?'on':'')+'"></i>';
    safeHTML(el,html);
  }

  function signalSignature1009(item,sig){
    item = item || {};
    sig = sig || {};
    var states = sig.states && sig.states.join ? sig.states.join("|") : "";
    var factors = sig.factors ? JSON.stringify(sig.factors) : "";
    return [
      sig.symbol || item.symbol || currentPairClean(),
      sig.source || "",
      sig.side || item.side || "",
      states,
      factors,
      sig.conf || 0,
      clamp(Math.round(num(sig.confidence, item.force || 0)), 0, 100),
      ageBucket(sig.age || item.age || ""),
      sig.setup || item.setup || ""
    ].join("¦");
  }

  function realMiniCandlesFromBars1009(arr){
    arr = Array.isArray(arr) ? arr.slice(-7) : [];
    if(arr.length < 4) return null;
    var bars = arr.map(function(c){
      var o=cOpen(c), h=cHigh(c), l=cLow(c), cl=cClose(c);
      var rng=Math.max(0.0000001,h-l);
      return {o:o,h:h,l:l,c:cl,rng:rng,red:cl<o};
    });
    var maxRange = Math.max.apply(null, bars.map(function(x){ return x.rng; }).filter(isFinite));
    if(!isFinite(maxRange) || maxRange <= 0) maxRange = 1;
    return bars.map(function(b){
      var h = clamp(Math.round(10 + (b.rng / maxRange) * 22), 10, 32);
      return {h:h, red:b.red, real:true};
    });
  }

  function fallbackMiniCandles1009(item,sig){
    item = item || {}; sig = sig || {};
    var side = String(sig.side || item.side || "LONG").toUpperCase();
    var confidence = clamp(Math.round(num(sig.confidence, item.force || 58)), 18, 96);
    var recent = ageMin(sig.age || item.age || "7m");
    var base = side === "SHORT" ? [28,25,23,21,18,15,12] : [12,15,18,21,24,27,30];
    var pull = side === "SHORT" ? [1,0,1,0,1,0,0] : [0,1,0,1,0,1,0];
    var shift = confidence >= 80 ? 2 : (confidence >= 65 ? 0 : -2);
    var fade = recent >= 8 ? -2 : (recent <= 2 ? 2 : 0);
    return base.map(function(v,i){
      return {h:clamp(v + shift + fade + (i%2===0?1:0), 10, 32), red: !!pull[i]};
    }).map(function(c){
      if(side === "SHORT") c.red = !c.red ? true : c.red;
      return c;
    });
  }

  function bestMiniCandles1009(item,sig){
    try{
      item = item || {};
      sig = sig || {};
      var sym = compact(item.symbol || sig.symbol || "");
      var scanMap = scannerMap1005(), scan = scanMap[sym];
      var rowRaw = scan && scan.raw ? scan.raw : null;
      var feedAsset = liveFeedAsset1010(sym);

      var feedSet = feedAsset && (feedAsset.candles || feedAsset.bars || feedAsset.ohlc);
      var feedBars = realMiniCandlesFromBars1009(feedSet);
      if(feedBars && feedBars.length) return {bars:feedBars, source:"live-feed-ohlc", real:true};

      var signalSet = sig && sig.source === "live-feed-24h" && (sig.candles || sig.bars || sig.ohlc);
      var signalBars = realMiniCandlesFromBars1009(signalSet);
      if(signalBars && signalBars.length) return {bars:signalBars, source:"live-feed-ohlc", real:true};

      var scannerSet = rowRaw && (rowRaw.candles || rowRaw.bars || rowRaw.ohlc);
      var scannerBars = realMiniCandlesFromBars1009(scannerSet);
      if(scannerBars && scannerBars.length) return {bars:scannerBars, source:"scanner-ohlc", real:true};

      if(sym && sym === currentPairClean()){
        var current = realMiniCandlesFromBars1009(rawCandles1005());
        if(current && current.length) return {bars:current, source:"current-symbol-real", real:true};
      }
    }catch(_){}
    return {bars:null, source:"no-real-ohlc", real:false};
  }

  function paintOppMiniCandles1009(row,item,sig){
    try{
      if(!row) return;
      var host = row.querySelector(".dvlCp0976MiniCandles");
      if(!host) return;
      var pack = bestMiniCandles1009(item,sig);
      if(!pack || !pack.real || !pack.bars || !pack.bars.length){
        var empty = '<span class="dvlCp1011NoOhlc">SEM OHLC</span>';
        if(host.innerHTML !== empty) host.innerHTML = empty;
        host.setAttribute("data-dvl-candle-source","no-real-ohlc");
        row.setAttribute("data-dvl-candle-source","no-real-ohlc");
        row.setAttribute("data-dvl-real-ohlc","0");
        return;
      }
      var html = pack.bars.map(function(b){
        return '<i class="dvlCp0976Candle '+(b.red?'r':'')+'" style="height:'+clamp(Math.round(num(b.h,16)),10,32)+'px"></i>';
      }).join('');
      if(host.innerHTML !== html) host.innerHTML = html;
      host.setAttribute("data-dvl-candle-source", pack.source || "real-ohlc");
      row.setAttribute("data-dvl-candle-source", pack.source || "real-ohlc");
      row.setAttribute("data-dvl-real-ohlc","1");
    }catch(_){}
  }

  function updateConvictionHeader1008(p,items,drv){
    try{
      if(!p) return false;
      ensureConvictionTimer1008(p);
      var hero=p.querySelector("[data-dvl-cp-section='insight']");
      if(!hero) return false;
      var item=(items&&items[0])||{symbol:currentPairClean(),side:"LONG",force:55,age:"agora",setup:"Contexto vivo"};
      var sig=(item.dvlSignal)||signalForItem1005(item,drv)||{};
      var confidence=clamp(Math.round(num(sig.confidence,item.force||55)),10,96);
      var source=sig.source||"dados parciais";
      var confCount=(sig.conf!=null?sig.conf:(sig.states?sig.states.reduce(function(a,x){return a+(x==="good"?1:0);},0):0));
      var side=sig.side||item.side||"LONG";
      var title=confidence>=78?"Convicção Alta":(confidence>=62?"Convicção Média":(confidence>=45?"Convicção Baixa":"Aguardar"));
      var regime=(side==="SHORT"?"SHORT":"LONG")+" · "+source;
      var text="Convicção viva recalculada pela Signal Engine: "+confidence+"%, fonte "+source+", fatores "+confCount+"/6. Sem execução automática.";
      var symbol=sig.symbol||item.symbol||currentPairClean();
      var signature = signalSignature1009(item,sig);
      var changed = signature !== lastConvictionSignature1009;
      hero.setAttribute("data-dvl-conviction-live",sig.ready?(sig.partial?"partial":"1"):"fallback");
      hero.setAttribute("data-dvl-conviction-source",source);
      hero.setAttribute("data-dvl-feed-source",source);
      hero.setAttribute("data-dvl-conviction",String(confidence));
      hero.setAttribute("data-dvl-conviction-signature",signature);
      p.querySelectorAll("[data-dvl-cp-live-symbol]").forEach(function(el){ el.textContent=display(symbol); });
      safeText(hero,"[data-dvl-cp-live-title]",title);
      safeText(hero,"[data-dvl-cp-live-text]",text);
      safeText(hero,"[data-dvl-cp-live-regime]",regime);
      var score=hero.querySelector("[data-dvl-cp-live-score]");
      if(score) safeHTML(score,String(confidence)+'<small>%</small>');
      paintConvictionBars1008(hero.querySelector("[data-dvl-cp-live-bars]"),confidence);
      if(changed || !lastConvictionUpdateAt1008){
        lastConvictionSignature1009 = signature;
        lastConvictionUpdateAt1008 = Date.now();
      }
      refreshConvictionTimer1008(p);
      return true;
    }catch(_){return false;}
  }

  function patch(){
    var p=page(); if(!p || painting) return false;
    painting=true;
    try{
      var scrollY=window.scrollY, cpScroll=p.scrollTop;
      ensureBase();
      bindPMTfTabs(p);
      var activeChartTf = analysisTf(), selectedPMTf = pmWatchTf();
      renderLiveFeedRows1010(p);
      var drv=derivatives(), items=readOpps(p);
      var visibleTfPack = items[0] ? aiTfPack(items[0], confluence(items[0],drv), 0) : {label:"1m→5m",origin:"1m",confirm:"5m",context:"1h"};
      updateConvictionHeader1008(p,items,drv);
      patchVisibleAnalysisTf(p, visibleTfPack.label);
      p.setAttribute("data-dvl-single-engine","0996");
      p.setAttribute("data-dvl-oi-trend",drv.oi);
      p.setAttribute("data-dvl-lsr-trend",drv.lsr);
      p.setAttribute("data-dvl-pump-confluence",drv.pump?"1":"0");
      var sig=JSON.stringify(items.map(function(x){var cc=confluence(x,drv), tt=aiTfPack(x,cc,x.index); return [x.symbol,x.force,x.side,x.age,x.setup,x.tf,tt.label,tt.context];}).concat([[drv.oi,drv.lsr,drv.pump,activeChartTf,selectedPMTf]]));
      patchVisibleAnalysisTf(p, visibleTfPack.label);
      if(sig!==lastSig || !p.getAttribute("data-dvl-single-engine-painted")){
        patchOpps(items,drv);
        patchPM(p,items,drv);
        patchChat(p,items,drv);
        ensureConvictionTimer1008(p);
        refreshConvictionTimer1008(p);
        p.setAttribute("data-dvl-single-engine-painted","1");
        lastSig=sig;
      }
      try{ p.dataset.dvlCpSingleEngine0996=JSON.stringify({version:VERSION,items:items.length,oi:drv.oi,lsr:drv.lsr,pump:drv.pump,aiTf:visibleTfPack,tfScan:DVL_AI_TF_SCAN_0999,activeChartTf:activeChartTf,pmWatchTf:selectedPMTf,signalEngine:(window.DVL_COPILOT_SIGNAL_ENGINE_1005?window.DVL_COPILOT_SIGNAL_ENGINE_1005.audit():null),liveFeedBridge:(window.DVL_COPILOT_LIVE_FEED_BRIDGE_1010?window.DVL_COPILOT_LIVE_FEED_BRIDGE_1010.audit():null),convictionTimerOnly:true,convictionFactorDriven:true,lastConvictionSignature:lastConvictionSignature1009,lastConvictionUpdateAt:lastConvictionUpdateAt1008,convictionAge:convictionElapsed1008(lastConvictionUpdateAt1008),tfLimit:'4h',ts:Date.now(),scriptOverlay:false,scannerUntouched:true,noOrders:true}); }catch(_){}
      if(Math.abs(window.scrollY-scrollY)>2) window.scrollTo(window.scrollX,scrollY);
      if(p.scrollTop!==cpScroll) p.scrollTop=cpScroll;
      return true;
    }finally{
      painting=false;
    }
  }

  function schedule(delay){
    clearTimeout(timer);
    timer=setTimeout(patch, delay==null?180:delay);
  }

  function copilotOpen1208(){
    var cp=page();
    return !document.hidden && !!(cp&&(cp.classList.contains("is-open")||cp.classList.contains("open")));
  }
  function stopCopilotRuntime1208(){
    try{ if(window.__DVL_COPILOT_0996_INTERVAL__) clearInterval(window.__DVL_COPILOT_0996_INTERVAL__); }catch(_){}
    try{ if(window.__DVL_COPILOT_1008_CONVICTION_TIMER__) clearInterval(window.__DVL_COPILOT_1008_CONVICTION_TIMER__); }catch(_){}
    window.__DVL_COPILOT_0996_INTERVAL__=0;
    window.__DVL_COPILOT_1008_CONVICTION_TIMER__=0;
    try{ if(observer) observer.disconnect(); }catch(_){}
    try{ if(window.__DVL_COPILOT_0996_OBSERVER__) window.__DVL_COPILOT_0996_OBSERVER__.disconnect(); }catch(_){}
    observer=null;
    window.__DVL_COPILOT_0996_OBSERVER__=null;
  }
  function startCopilotObserver1208(){
    var p=page();
    if(!p || observer || !window.MutationObserver) return;
    observer=new MutationObserver(function(muts){
      if(painting || !copilotOpen1208()) return;
      var relevant=false;
      for(var i=0;i<muts.length;i++){
        var t=muts[i].target;
        if(t && t.closest && t.closest("[data-dvl-conviction-timer]")) continue;
        if(t && t.closest && (t.closest("[data-dvl-cp-section='opportunities']") || t.closest("[data-dvl-cp-section='decision']") || t.closest("[data-dvl-cp-section='ai-chat']"))){ relevant=true; break; }
      }
      if(relevant) schedule(260);
    });
    observer.observe(p,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["data-dvl-opp-age","data-dvl-symbol"]});
    window.__DVL_COPILOT_0996_OBSERVER__=observer;
  }
  function syncCopilotRuntime1208(force){
    if(!copilotOpen1208()){ stopCopilotRuntime1208(); return; }
    if(force) patch(); else schedule(0);
    if(!window.__DVL_COPILOT_0996_INTERVAL__){
      window.__DVL_COPILOT_0996_INTERVAL__=setInterval(function(){ if(copilotOpen1208()) schedule(0); },12000);
    }
    if(!window.__DVL_COPILOT_1008_CONVICTION_TIMER__){
      window.__DVL_COPILOT_1008_CONVICTION_TIMER__=setInterval(function(){
        var cp=page(); if(copilotOpen1208()&&cp) refreshConvictionTimer1008(cp);
      },1000);
    }
    startCopilotObserver1208();
  }

  function boot(){
    stopCopilotRuntime1208();
    window.addEventListener("dvl:copilot-state-change",function(){ syncCopilotRuntime1208(true); },true);
    document.addEventListener("visibilitychange",function(){ syncCopilotRuntime1208(false); },true);
    window.addEventListener("dvl-safe-asset-selected-0804",function(){if(copilotOpen1208())schedule(320);},true);
    window.addEventListener("dvl:scanner-state-change",function(){if(copilotOpen1208())schedule(520);},true);
    window.addEventListener("dvl:copilot-live-feed",function(){if(copilotOpen1208())schedule(0);},true);
    document.addEventListener("dvl:copilot-live-feed",function(){if(copilotOpen1208())schedule(0);},true);
    syncCopilotRuntime1208(true);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();


  window.DVL_COPILOT_LIVE_FEED_BRIDGE_1010 = {
    version:"1.010",
    schema:{
      window:"24h",
      asset:"{ symbol, conviction, side, tfOrigin, tfConfirm, contextTf, age, setup, factors:{vt,sz,cs,oi,ls,ex}, candles:[{open,high,low,close,volume}], updatedAt } // candles/ohlc obrigatórios para mini candles reais"
    },
    setFeed:function(feed){ return applyFeed1010(feed); },
    updateAsset:function(symbol,data){ return updateFeedAsset1010(symbol,data); },
    getFeed:function(){ return normalizeFeed1010(readGlobalFeed1010() || {}); },
    top:function(limit){ return liveFeedTop1010(limit || 3); },
    connectWS:function(url){
      try{
        if(liveFeedState1010.ws) liveFeedState1010.ws.close();
        liveFeedState1010.url = String(url||"");
        var ws = new WebSocket(liveFeedState1010.url);
        liveFeedState1010.ws = ws;
        ws.onopen = function(){ liveFeedState1010.connected=true; };
        ws.onclose = function(){ liveFeedState1010.connected=false; };
        ws.onerror = function(){ liveFeedState1010.connected=false; };
        ws.onmessage = function(ev){
          try{
            var msg = JSON.parse(ev.data);
            if(msg && (msg.assets || msg.symbols || msg.data)) applyFeed1010(msg);
            else if(msg && (msg.symbol || msg.pair || msg.asset)) updateFeedAsset1010(msg.symbol || msg.pair || msg.asset, msg);
          }catch(_){}
        };
        return true;
      }catch(e){ return false; }
    },
    disconnect:function(){
      try{ if(liveFeedState1010.ws) liveFeedState1010.ws.close(); }catch(_){}
      liveFeedState1010.ws=null;
      liveFeedState1010.connected=false;
      return true;
    },
    audit:function(){
      var feed = normalizeFeed1010(readGlobalFeed1010() || {});
      var top = liveFeedTop1010(3);
      return {
        version:"1.010",
        hasFeed:!!(feed && Object.keys(feed.assets||{}).length),
        assetCount:Object.keys(feed.assets||{}).length,
        window:feed.window || "24h",
        updatedAt:feed.updatedAt || 0,
        connected:!!liveFeedState1010.connected,
        url:liveFeedState1010.url || "",
        top:top.map(function(x){return {symbol:x.symbol,confidence:x.confidence};}),
        noTradeExecution:true,
        noOrdersSent:true
      };
    }
  };
  window.DVL_COPILOT_LIVE_FEED_BRIDGE = window.DVL_COPILOT_LIVE_FEED_BRIDGE_1010;

  window.DVL_COPILOT_SINGLE_ENGINE_LOCK_0996={
    version:VERSION,
    patch:patch,
    read:function(){var p=page();return {items:p?readOpps(p):[],derivatives:derivatives()};},
    audit:function(){
      patch();
      var p=page(), oldScripts=document.querySelectorAll('script[id^="DVL_BETA_0990"],script[id^="DVL_BETA_0991"],script[id^="DVL_BETA_0992"],script[id^="DVL_BETA_0993"],script[id^="DVL_BETA_0994"],script[id^="DVL_BETA_0995"]').length;
      var pm=p?p.querySelector("[data-dvl-cp-section='decision']"):null, chat=p?p.querySelector("[data-dvl-cp-section='ai-chat']"):null, bot=p?p.querySelector("[data-dvl-cp-section='bot-soon']"):null;
      return {version:VERSION,pageFound:!!p,old0990to0995Scripts:oldScripts,singleEngine:!!(p&&p.getAttribute("data-dvl-single-engine")==="0996"),preMomentumFound:!!pm,convictionTimerInInsight:!!(p&&p.querySelector("[data-dvl-cp-section='insight'] [data-dvl-conviction-timer]")),timerInOppOrPM:!!(p&&p.querySelector("[data-dvl-cp-section='opportunities'] [data-dvl-conviction-timer],[data-dvl-cp-section='decision'] [data-dvl-conviction-timer]")),factorDrivenTimer:true,strictRealOhlc:true,realOhlcRows:p?p.querySelectorAll('[data-dvl-real-ohlc="1"]').length:0,noOhlcRows:p?p.querySelectorAll('[data-dvl-candle-source="no-real-ohlc"]').length:0,liveFeedBridge:window.DVL_COPILOT_LIVE_FEED_BRIDGE_1010?window.DVL_COPILOT_LIVE_FEED_BRIDGE_1010.audit():null,lastConvictionSignature:lastConvictionSignature1009,lastConvictionUpdateAt:lastConvictionUpdateAt1008,chatBeforeBot:!!(chat&&bot&&chat.nextElementSibling===bot),scannerUntouched:!!(p&&p.querySelector("[data-dvl-cp-section='scanner']")),noTradeExecution:true,noOrdersSent:true,pass:!!p&&oldScripts===0&&!!pm&&!!chat};
    }
  };
  window.DVL_COPILOT_SINGLE_ENGINE_AUDIT_0996=function(){return window.DVL_COPILOT_SINGLE_ENGINE_LOCK_0996.audit();};
})();
