/* ── DVL Alerts Hub (Beta 1.620) ───────────────────────────────────────────
   Estrutura GENÉRICA de alertas. Cada indicador registra os "sinais" que sabe
   detectar (DVL_ALERTS.registerSource) e dispara quando acontece
   (DVL_ALERTS.emit). Um painel central ("Alertas", no lugar do antigo botão
   Scanner) deixa você montar regras em cima de QUALQUER fonte: escolhe o
   indicador → o sinal → filtros (direção, nível, TF, cooldown) → canais de
   entrega (toast no gráfico, som, histórico). Reusa o DVL_ALERTS_LOG (0268)
   como histórico persistente. Canais deste release: in-app (toast + som + log).
   Fontes já ligadas: Preço (embutido), Smart Delta (ponte do evento),
   RSI Exhaustion e Liquidity Bands (emitem via DVL_ALERTS.emit). Só frontend. */
(function(){
  "use strict";
  if(window.__DVL_ALERTS_HUB_1620) return; window.__DVL_ALERTS_HUB_1620 = true;

  /* ── util ── */
  function esc(v){ return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); }
  function now(){ return Date.now(); }
  function uid(){ return "a"+Math.random().toString(36).slice(2,9)+now().toString(36).slice(-4); }
  function num(v){ v=Number(v); return Number.isFinite(v)?v:null; }
  function gsym(){ try{ if(typeof symbol!=="undefined"&&symbol) return String(symbol).toUpperCase(); }catch(_){} try{ if(window.ticker&&window.ticker.symbol) return String(window.ticker.symbol).toUpperCase(); }catch(_){} return "BTCUSDT"; }
  function gtf(){ try{ if(typeof interval!=="undefined"&&interval) return String(interval); }catch(_){} return "1m"; }
  function gprice(){
    try{ if(typeof ticker!=="undefined"&&ticker&&ticker.lastPrice!=null){ var p=Number(ticker.lastPrice); if(Number.isFinite(p)&&p>0) return p; } }catch(_){}
    try{ if(typeof klines!=="undefined"&&klines&&klines.length){ var c=Number(klines[klines.length-1].close); if(Number.isFinite(c)&&c>0) return c; } }catch(_){}
    return null;
  }
  function fmtPx(p){ p=Number(p); if(!Number.isFinite(p)) return "?"; if(p>=1000) return p.toLocaleString("en-US",{maximumFractionDigits:2}); if(p>=1) return p.toFixed(2); return p.toPrecision(5); }
  function shortSym(s){ return String(s||"").replace(/USDT$/,""); }
  function maLabelFor(idx){ try{ var api=window.DVLMovingAverages, l=(api&&typeof api.list==="function")?api.list():[]; for(var i=0;i<l.length;i++) if(l[i].idx===Number(idx)) return l[i].label; }catch(_){} return "média"; }

  /* ── registro de LINHAS (p/ a fonte "Cruzamentos") ────────────────────────
     Cada linha tem um id, um label e um valor atual. Só aparecem as linhas
     disponíveis agora (indicador ligado). */
  function lineOptions(){
    var out=[{value:"price",label:"Preço"}];
    try{ var mas=(window.DVLMovingAverages&&window.DVLMovingAverages.list)?window.DVLMovingAverages.list():[]; mas.forEach(function(m){ out.push({value:"ma:"+m.idx,label:m.label}); }); }catch(_){}
    // Beta 1.628 — no dropdown de criação mostramos só indicadores ATIVOS (o
    // VWAP.levels() agora calcula mesmo desligado; usamos on() p/ o menu). A
    // avaliação da regra (lineValue) roda independente disso.
    try{ var _vwOn=(window.DVLVwapSession&&window.DVLVwapSession.on)?window.DVLVwapSession.on():false;
      var vw=_vwOn?window.DVLVwapSession.levels():null;
      if(vw){ out.push({value:"vwap",label:"VWAP"});
        if(vw.bandsOn){ out.push({value:"vwap_u1",label:"VWAP +1σ"}); out.push({value:"vwap_l1",label:"VWAP −1σ"}); }
        if(vw.band2On){ out.push({value:"vwap_u2",label:"VWAP +2σ"}); out.push({value:"vwap_l2",label:"VWAP −2σ"}); }
      } }catch(_){}
    try{ var vp=(window.DVLVolumeProfile&&window.DVLVolumeProfile.getLevels)?((window.DVLVolumeProfile.getLevels()||{}).current||null):null;
      if(vp && vp.poc!=null){ out.push({value:"vp_poc",label:"VP POC"}); out.push({value:"vp_vah",label:"VP VAH"}); out.push({value:"vp_val",label:"VP VAL"}); } }catch(_){}
    return out;
  }
  function lineValue(id){
    if(!id) return null;
    if(id==="price") return gprice();
    if(id.indexOf("ma:")===0){ var idx=Number(id.slice(3)); try{ return (window.DVLMovingAverages&&window.DVLMovingAverages.valueAt)?window.DVLMovingAverages.valueAt(idx):null; }catch(_){ return null; } }
    if(id.indexOf("vwap")===0){ try{ var vw=(window.DVLVwapSession&&window.DVLVwapSession.levels)?window.DVLVwapSession.levels():null; if(!vw) return null;
      return id==="vwap"?vw.vwap:id==="vwap_u1"?vw.upper1:id==="vwap_l1"?vw.lower1:id==="vwap_u2"?vw.upper2:id==="vwap_l2"?vw.lower2:null; }catch(_){ return null; } }
    if(id.indexOf("vp_")===0){ try{ var vp=(window.DVLVolumeProfile&&window.DVLVolumeProfile.getLevels)?((window.DVLVolumeProfile.getLevels()||{}).current||{}):{}; return id==="vp_poc"?vp.poc:id==="vp_vah"?vp.vah:id==="vp_val"?vp.val:null; }catch(_){ return null; } }
    return null;
  }
  function lineLabelFor(id){
    var o=lineOptions(); for(var i=0;i<o.length;i++) if(o[i].value===id) return o[i].label;
    if(id==="price") return "Preço";
    if(id&&id.indexOf("ma:")===0) return maLabelFor(id.slice(3));
    var map={vwap:"VWAP",vwap_u1:"VWAP +1σ",vwap_l1:"VWAP −1σ",vwap_u2:"VWAP +2σ",vwap_l2:"VWAP −2σ",vp_poc:"VP POC",vp_vah:"VP VAH",vp_val:"VP VAL"};
    return map[id]||id||"linha";
  }
  var crossState = {}; // id da regra → {bar, sign, confirmed} — confirmação no fechamento do candle

  /* ── catálogo de fontes ──────────────────────────────────────────────────
     Cada fonte: {key,title,mark,signals:[{id,label,dirs?,needsLevel?,levelLabel?,
     levelUnit?,levelDefault?,desc}]}. dirs presente => o sinal tem direção
     (o usuário pode filtrar up/down/qualquer). needsLevel => pede um número. */
  var SOURCES = {};
  function registerSource(def){
    if(!def||!def.key) return;
    var prev = SOURCES[def.key]||{};
    SOURCES[def.key] = {
      key:def.key,
      title:def.title||prev.title||def.key,
      mark:def.mark||prev.mark||"",
      signals:(def.signals||prev.signals||[])
    };
    try{ window.dispatchEvent(new CustomEvent("dvl:alerts-sources-update")); }catch(_){}
  }
  function signalDef(sourceKey, signalId){
    var s = SOURCES[sourceKey]; if(!s) return null;
    for(var i=0;i<s.signals.length;i++) if(s.signals[i].id===signalId) return s.signals[i];
    return null;
  }

  /* Fontes iniciais (as ligadas neste release). Indicadores novos podem chamar
     DVL_ALERTS.registerSource sozinhos no futuro. */
  registerSource({ key:"price", title:"Preço", mark:"PX", signals:[
    { id:"cross_up",   label:"Cruza ACIMA do nível",  needsLevel:true, levelLabel:"Nível", levelUnit:"$", desc:"dispara quando o preço sobe e cruza o nível" },
    { id:"cross_down", label:"Cruza ABAIXO do nível",  needsLevel:true, levelLabel:"Nível", levelUnit:"$", desc:"dispara quando o preço cai e cruza o nível" },
    { id:"pct_fast",   label:"Movimento rápido (%)",   needsLevel:true, levelLabel:"Variação", levelUnit:"%", levelDefault:0.5, dirs:true, desc:"variação ≥ X% em ~1min" }
  ]});
  registerSource({ key:"smartdelta", title:"Smart Delta", mark:"SD", signals:[
    { id:"signal_buy",  label:"Sinal de COMPRA",   dirs:false, desc:"confluência institucional de compra" },
    { id:"signal_sell", label:"Sinal de VENDA",    dirs:false, desc:"confluência institucional de venda" },
    { id:"confluence",  label:"Confluência (forte)",dirs:false, desc:"alerta de confluência do Smart Delta" }
  ]});
  registerSource({ key:"exr", title:"RSI Exhaustion", mark:"EXR", signals:[
    { id:"exhaustion_any",  label:"Exaustão (topo ou fundo)", desc:"uma regra só cobre as DUAS exaustões; a notificação diz se foi TOPO (▼) ou FUNDO (▲)" },
    { id:"exhaustion_up",   label:"Exaustão de TOPO",  desc:"RSI em exaustão de alta (possível reversão p/ baixo)" },
    { id:"exhaustion_down", label:"Exaustão de FUNDO", desc:"RSI em exaustão de baixa (possível reversão p/ cima)" }
  ]});
  registerSource({ key:"liqbands", title:"Liquidity Bands", mark:"LB", signals:[
    { id:"grab_up",   label:"Buscou liquidez em CIMA (ask)", desc:"o candle varreu a banda superior e voltou" },
    { id:"grab_down", label:"Buscou liquidez em BAIXO (bid)", desc:"o candle varreu a banda inferior e voltou" }
  ]});
  registerSource({ key:"ma", title:"Médias Móveis", mark:"MA", signals:[
    { id:"cross", label:"Preço cruza a média", dirs:true, desc:"escolha QUAL média receber o alerta e a direção do cruzamento",
      params:[{ id:"maId", label:"Média", kind:"select", options:function(){
        var api=window.DVLMovingAverages, l=(api&&typeof api.list==="function")?api.list():[];
        if(!l.length) return [{value:"",label:"— ligue médias no indicador —"}];
        return l.map(function(m){ return { value:String(m.idx), label:m.label+(m.value!=null?(" · "+fmtPx(m.value)):"") }; });
      } }] }
  ]});
  registerSource({ key:"vp", title:"Volume Profile", mark:"VP", signals:[
    { id:"touch", label:"Preço bate no nível", desc:"quando o preço encosta/cruza o nível do VP (precisa do Volume Profile ligado)",
      params:[{ id:"level", label:"Nível", kind:"select", options:function(){ return [
        {value:"poc",label:"POC"},{value:"vah",label:"VAH"},{value:"val",label:"VAL"},{value:"all",label:"Qualquer (POC/VAH/VAL)"}
      ]; } }] }
  ]});
  registerSource({ key:"cross", title:"Cruzamentos (combinar)", mark:"✕", signals:[
    { id:"line_cross", label:"Linha A cruza Linha B", dirs:true,
      desc:"combine dois indicadores: ex. EMA × VWAP, ou Preço × borda do VWAP. Direção = A cruzando pra cima/baixo de B (ou ambas). Só aparecem as linhas dos indicadores LIGADOS.",
      params:[
        { id:"lhs", label:"Linha A", kind:"select", options:lineOptions },
        { id:"rhs", label:"Linha B", kind:"select", options:lineOptions }
      ] }
  ]});

  /* ── regras (localStorage) ── */
  var LS_RULES = "dvl_alerts_rules_v1";
  function loadRules(){ try{ var a=JSON.parse(localStorage.getItem(LS_RULES)||"[]"); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
  function saveRules(a){ try{ localStorage.setItem(LS_RULES, JSON.stringify(a||[])); }catch(_){} try{ window.dispatchEvent(new CustomEvent("dvl:alerts-rules-update")); }catch(_){} }
  var rules = loadRules();

  function addRule(r){
    r = r||{};
    var rule = {
      id: uid(),
      source: r.source, signal: r.signal,
      name: r.name||"",
      dir: r.dir||"any",
      params: (r.params&&typeof r.params==="object")?r.params:{},
      level: (r.level==null?null:Number(r.level)),
      tf: r.tf||"",
      symbol: r.symbol||"",
      rearm: r.rearm||"time",
      cooldownSec: Number(r.cooldownSec)||30,
      toast: r.toast!==false,
      sound: r.sound!==false,
      telegram: !!r.telegram,
      once: !!r.once,
      enabled: r.enabled!==false,
      created: now(),
      lastFired: 0,
      lastBar: 0,
      lastDir: "",
      fires: 0
    };
    rules.push(rule); saveRules(rules); tgSyncRules(); return rule;
  }
  function updateRule(id, patch){ for(var i=0;i<rules.length;i++){ if(rules[i].id===id){ Object.assign(rules[i], patch||{}); saveRules(rules); tgSyncRules(); return rules[i]; } } return null; }
  function deleteRule(id){ rules = rules.filter(function(r){ return r.id!==id; }); try{ delete crossState[id]; }catch(_){} saveRules(rules); tgSyncRules(); }

  /* ── entrega ──────────────────────────────────────────────────────────── */
  var _audioCtx = null;
  function beep(dir){
    try{
      var AC = window.AudioContext||window.webkitAudioContext; if(!AC) return;
      _audioCtx = _audioCtx || new AC();
      if(_audioCtx.state==="suspended"){ try{ _audioCtx.resume(); }catch(_){} }
      var t = _audioCtx.currentTime;
      var freqs = dir==="down" ? [660,440] : dir==="up" ? [660,880] : [720,720];
      freqs.forEach(function(f,i){
        var o=_audioCtx.createOscillator(), g=_audioCtx.createGain();
        o.type="sine"; o.frequency.value=f;
        var t0=t+i*0.14;
        g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.16,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.13);
        o.connect(g); g.connect(_audioCtx.destination); o.start(t0); o.stop(t0+0.14);
      });
    }catch(_){}
  }

  function ensureToastWrap(){
    var w = document.getElementById("dvlAlertToastWrap1620");
    if(!w){ w=document.createElement("div"); w.id="dvlAlertToastWrap1620"; w.setAttribute("data-dvl-ui","true"); document.body.appendChild(w); }
    return w;
  }
  function toast(msg, dir, sub){
    var w = ensureToastWrap();
    var color = dir==="down" ? "#ff6b81" : dir==="up" ? "#13dc8d" : "#35e0ff";
    var el = document.createElement("div");
    el.className = "dvl-alert-toast";
    el.style.setProperty("--dvl-toast-accent", color);
    el.innerHTML = '<span class="dvl-alert-toast-bar"></span><div class="dvl-alert-toast-in">'
      + '<div class="dvl-alert-toast-msg">'+esc(msg)+'</div>'
      + (sub? '<div class="dvl-alert-toast-sub">'+esc(sub)+'</div>' : '')
      + '</div><button type="button" class="dvl-alert-toast-x" aria-label="Fechar">×</button>';
    w.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add("in"); });
    var kill = function(){ el.classList.remove("in"); el.classList.add("out"); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 260); };
    el.querySelector(".dvl-alert-toast-x").addEventListener("click", kill);
    setTimeout(kill, 7000);
    // no máximo 4 toasts empilhados
    while(w.children.length>4){ w.removeChild(w.firstChild); }
  }

  function logAdd(entry){
    try{ if(window.DVL_ALERTS_LOG && typeof window.DVL_ALERTS_LOG.add==="function"){ window.DVL_ALERTS_LOG.add(entry); return; } }catch(_){}
  }

  function bumpNavBadge(){
    var b = document.getElementById("dvlAlertsNavBadge1620");
    if(b){ b.style.display="block"; b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse"); }
  }

  function autoMessage(rule, payload){
    if(payload && payload.message) return String(payload.message);
    var src = SOURCES[rule.source], sig = signalDef(rule.source, rule.signal);
    var label = (sig&&sig.label)|| rule.signal;
    var title = (src&&src.title)|| rule.source;
    var extra = "";
    if(rule.params){
      if(rule.source==="ma" && rule.params.maId!=null && rule.params.maId!=="") extra = " ("+maLabelFor(rule.params.maId)+")";
      else if(rule.source==="vp" && rule.params.level) extra = " ("+String(rule.params.level).toUpperCase()+")";
      else if(rule.source==="cross" && rule.params.lhs && rule.params.rhs) extra = " ("+lineLabelFor(rule.params.lhs)+" ✕ "+lineLabelFor(rule.params.rhs)+")";
    }
    var px = payload&&payload.price!=null ? (" · "+fmtPx(payload.price)) : "";
    return title+": "+label+extra+px;
  }

  function currentBarTime(){ try{ if(typeof klines!=="undefined" && klines && klines.length) return Number(klines[klines.length-1].time); }catch(_){} return 0; }
  /* Gating de re-arme: por tempo (cooldown s), por candle fechado (1× por
     candle), ou por candle + direção (1× por candle E por direção — permite,
     no mesmo candle, um disparo de alta e outro de baixa). */
  function canFire(rule, payload){
    var mode = rule.rearm || "time";
    if(mode==="bar" || mode==="bar_dir"){
      var cb = currentBarTime();
      if(cb && rule.lastBar===cb){
        if(mode==="bar") return false;
        var d=(payload&&payload.dir)||"";
        if(rule.lastDir===d) return false;
      }
      return true;
    }
    if(rule.lastFired && (now() - rule.lastFired) < ((rule.cooldownSec||0)*1000)) return false;
    return true;
  }

  function fire(rule, payload, force){
    payload = payload||{};
    if(!force && !canFire(rule, payload)) return;
    var dir = payload.dir || (rule.dir!=="any"?rule.dir:"");
    var msg = autoMessage(rule, payload);
    var sub = (payload.tf?("TF "+payload.tf):"") + (payload.symbol?("  "+shortSym(payload.symbol)):"");
    rule.lastFired = now(); rule.lastBar = currentBarTime(); rule.lastDir = payload.dir||""; rule.fires = (rule.fires||0)+1;
    if(rule.once) rule.enabled = false;
    saveRules(rules);
    logAdd({ msg:msg, ts:now(), tf:(payload.tf||rule.tf||""), sym:(payload.symbol||rule.symbol||""), kind:("alert:"+rule.source), tg:!!rule.telegram });
    if(rule.toast) toast(msg, dir, sub.trim());
    if(rule.sound) beep(dir);
    /* canal Telegram (backend): NUNCA manda chat_id/destino — só o evento. O
       servidor valida a conexão do usuário e enfileira. triggerId estável por
       disparo (dedup idempotente no backend). */
    if(rule.telegram){
      try{
        var src=SOURCES[rule.source];
        tgApi("/api/telegram/trigger", { method:"POST", body: JSON.stringify({
          triggerId: rule.id+":"+rule.lastFired,
          alertId: rule.id,
          symbol: (payload.symbol||rule.symbol||gsym()),
          tf: (payload.tf||rule.tf||gtf()),
          source: rule.source,
          title: (src&&src.title)||rule.source,
          message: msg,
          price: (payload.price!=null?payload.price:null),
          values: (payload.values||null),
          channels: { telegram:true }
        }) });
      }catch(_tgTrig){}
    }
    bumpNavBadge();
    try{ window.dispatchEvent(new CustomEvent("dvl:alerts-fired",{detail:{rule:rule,payload:payload,message:msg}})); }catch(_){}
  }

  /* Confirmação no FECHAMENTO do candle (Beta 1.634) — PADRÃO para todas as
     fontes de cruzamento (linha×linha, preço×média, preço×nível). Em vez de
     disparar com o candle ABERTO (o que faz a linha "chicotear"/samambaiar a
     cada tick de 1,5s), guardamos o sinal do candle EM FORMAÇÃO e só
     confirmamos quando ele FECHA (o candle atual troca). Resultado: cada
     cruzamento sai no máximo 1× por candle, já confirmado — nada de alerta no
     meio de um candle de 5m. `sign` = lado atual (+1/−1); `allowedDir` filtra a
     direção desejada ("any"/"up"/"down"); `makePayload(dir)` monta o disparo. */
  function crossOnClose(rule, sign, allowedDir, makePayload){
    var bar = currentBarTime();
    if(!bar) return; // sem candle de referência não dá pra confirmar fechamento
    var st = crossState[rule.id];
    if(st==null){ crossState[rule.id] = { bar:bar, sign:sign, confirmed:sign }; return; }
    if(bar !== st.bar){
      // novo candle começou → o anterior FECHOU com st.sign; confirma se mudou de lado
      if(st.sign !== st.confirmed){
        var dir = st.sign>0 ? "up" : "down";
        if(allowedDir==="any" || allowedDir===dir){
          var pl = makePayload(dir); if(pl) fire(rule, pl);
        }
        st.confirmed = st.sign;
      }
      st.bar = bar;
    }
    st.sign = sign; // sinal "ao vivo" do candle atual — vira o de fechamento quando fechar
  }

  /* ── emit: o coração. Indicadores chamam DVL_ALERTS.emit(src,sig,payload) ── */
  function emit(sourceKey, signalId, payload){
    payload = payload||{};
    var t = now();
    for(var i=0;i<rules.length;i++){
      var r = rules[i];
      if(!r.enabled || r.source!==sourceKey || r.signal!==signalId) continue;
      // filtro de direção
      if(r.dir && r.dir!=="any" && payload.dir && payload.dir!==r.dir) continue;
      // filtro de TF ("chart" = TF do gráfico; TF fixo casa só naquele TF)
      if(!tfMatches(r, payload.tf)) continue;
      // filtro de símbolo (só quando ambos existem)
      if(r.symbol && payload.symbol && String(r.symbol).toUpperCase()!==String(payload.symbol).toUpperCase()) continue;
      // re-arme (tempo / candle / candle+direção) é tratado dentro de fire()
      fire(r, payload);
    }
  }

  /* ── fonte embutida: Preço ────────────────────────────────────────────── */
  var priceHist = []; // {t,p} ~5min
  var prevPrice = null;
  function priceTick(){
    var p = gprice(); if(p==null) return;
    var t = now();
    priceHist.push({t:t,p:p});
    var cutoff = t - 5*60000;
    while(priceHist.length && priceHist[0].t < cutoff) priceHist.shift();
    var sym = gsym(), tf = gtf();

    // avalia regras que dependem do preço x nível dinâmico: Preço, Médias, VP
    for(var i=0;i<rules.length;i++){
      var r = rules[i];
      if(!r.enabled || (r.source!=="price" && r.source!=="ma" && r.source!=="vp" && r.source!=="cross")) continue;
      if(r.symbol && String(r.symbol).toUpperCase()!==sym) continue; // são por símbolo
      if(!tfMatches(r, tf)) continue; // "chart" casa sempre; TF fixo só no seu TF
      // re-arme é tratado dentro de fire()

      // ── Médias Móveis: preço cruza a média escolhida ──
      if(r.source==="ma"){
        if(r.signal==="cross"){
          var _mi = (r.params && r.params.maId!=null && r.params.maId!=="") ? Number(r.params.maId) : null;
          var _api = window.DVLMovingAverages;
          var _mv = (_mi!=null && _api && typeof _api.valueAt==="function") ? _api.valueAt(_mi) : null;
          if(_mv!=null && Number.isFinite(_mv)){
            // confirma no fechamento do candle (sem chicotear com o candle aberto)
            crossOnClose(r, (p - _mv) >= 0 ? 1 : -1, (r.dir||"any"), function(dir){
              var _mlbl = maLabelFor(_mi);
              return {dir:dir, price:p, symbol:sym, tf:tf, message:"Preço cruzou "+(dir==="up"?"ACIMA":"ABAIXO")+" da "+_mlbl+" ("+shortSym(sym)+")"};
            });
          }
        }
        continue;
      }
      // ── Cruzamentos: linha A cruza linha B (combina indicadores) ──
      if(r.source==="cross"){
        if(r.signal==="line_cross"){
          var _la=r.params&&r.params.lhs, _lb=r.params&&r.params.rhs;
          var _a=lineValue(_la), _b=lineValue(_lb);
          if(_a!=null && _b!=null && Number.isFinite(_a) && Number.isFinite(_b)){
            // confirma no fechamento do candle (A cruzou de lado só vale ao fechar)
            crossOnClose(r, (_a-_b)>=0 ? 1 : -1, (r.dir||"any"), function(dir){
              return {dir:dir, price:(gprice()), symbol:sym, tf:tf, message:lineLabelFor(_la)+" cruzou "+(dir==="up"?"ACIMA":"ABAIXO")+" de "+lineLabelFor(_lb)};
            });
          }
        }
        continue;
      }
      // ── Volume Profile: preço bate no nível escolhido ──
      if(r.source==="vp"){
        if(r.signal==="touch" && prevPrice!=null){
          var _vapi = window.DVLVolumeProfile;
          if(_vapi && typeof _vapi.getLevels==="function" && (!_vapi.on || _vapi.on())){
            var _lv = (_vapi.getLevels()||{}).current || {};
            var _which = (r.params && r.params.level) ? r.params.level : "all";
            var _targets = [];
            if(_which==="all"){ ["poc","vah","val"].forEach(function(kk){ if(_lv[kk]!=null) _targets.push([kk,_lv[kk]]); }); }
            else if(_lv[_which]!=null) _targets.push([_which,_lv[_which]]);
            for(var _ti=0;_ti<_targets.length;_ti++){
              var _nm=String(_targets[_ti][0]).toUpperCase(), _lvl=Number(_targets[_ti][1]);
              if(Number.isFinite(_lvl) && ((prevPrice<_lvl && p>=_lvl) || (prevPrice>_lvl && p<=_lvl))){
                var _vdir = p>=_lvl ? "up" : "down";
                fire(r, {dir:_vdir, price:p, symbol:sym, tf:tf, message:"Preço bateu no "+_nm+" do VP ("+fmtPx(_lvl)+")"});
                break;
              }
            }
          }
        }
        continue;
      }

      // ── Preço (embutido) ──
      if(r.signal==="cross_up" && r.level!=null){
        crossOnClose(r, (p - r.level) >= 0 ? 1 : -1, "up", function(){
          return {dir:"up", price:p, symbol:sym, tf:tf, message:"Preço cruzou ACIMA de "+fmtPx(r.level)+" ("+shortSym(sym)+")"};
        });
      } else if(r.signal==="cross_down" && r.level!=null){
        crossOnClose(r, (p - r.level) >= 0 ? 1 : -1, "down", function(){
          return {dir:"down", price:p, symbol:sym, tf:tf, message:"Preço cruzou ABAIXO de "+fmtPx(r.level)+" ("+shortSym(sym)+")"};
        });
      } else if(r.signal==="pct_fast" && r.level!=null){
        // preço ~60s atrás
        var ref=null, want=t-60000;
        for(var k=0;k<priceHist.length;k++){ if(priceHist[k].t<=want) ref=priceHist[k].p; else break; }
        if(ref==null && priceHist.length) ref=priceHist[0].p;
        if(ref!=null && ref>0){
          var chg=((p-ref)/ref)*100;
          var dir = chg>=0?"up":"down";
          if(Math.abs(chg) >= Math.abs(r.level) && (r.dir==="any" || r.dir===dir)){
            fire(r, {dir:dir, price:p, symbol:sym, tf:tf, message:"Movimento rápido "+(chg>=0?"+":"")+chg.toFixed(2)+"% em ~1min ("+shortSym(sym)+")"});
          }
        }
      }
    }
    prevPrice = p;
  }
  setInterval(priceTick, 1500);

  /* ── ponte: Smart Delta (evento já disparado pelo engine 0082) ── */
  window.addEventListener("dvl:smart-delta-alert", function(ev){
    try{
      var d = ev&&ev.detail||{}, s=d.snap||{};
      var m = String(d.message||"");
      var sig = d.confluence ? "confluence" : (/VENDA|venda|sell/i.test(m) ? "signal_sell" : "signal_buy");
      var dir = sig==="signal_sell" ? "down" : sig==="signal_buy" ? "up" : "";
      emit("smartdelta", sig, { message:m||"Smart Delta", dir:dir, tf:(s.tf||""), symbol:(s.symbol||"") });
    }catch(_){}
  }, {passive:true});

  /* ── API pública ── */
  window.DVL_ALERTS = {
    registerSource: registerSource,
    emit: emit,
    sources: function(){ return Object.keys(SOURCES).map(function(k){ return SOURCES[k]; }); },
    getSource: function(k){ return SOURCES[k]||null; },
    signalDef: signalDef,
    rules: function(){ return rules.slice(); },
    addRule: addRule, updateRule: updateRule, deleteRule: deleteRule,
    test: function(id){ var r=null; for(var i=0;i<rules.length;i++) if(rules[i].id===id) r=rules[i]; if(!r) return; fire(r, {tf:(r.tf||gtf()), symbol:(r.symbol||gsym()), message:"[TESTE] "+autoMessage(r,{})}, true); }
  };

  /* ══ UI: painel central ══════════════════════════════════════════════════ */
  injectCSS();
  var panel=null, draft={ source:"price", signal:"cross_up", dir:"any", level:"", tf:"chart", rearm:"time", cooldownSec:30, toast:true, sound:true, telegram:false, once:false, params:{} };

  /* ══ Telegram (canal externo · backend) ══════════════════════════════════
     Estado global da conexão do usuário. A UI aqui só administra a conexão e
     seleciona o canal por alerta; o disparo real vai pro backend em fire(). */
  var TG = { status:null, loaded:false, pollTimer:0, pollUntil:0, recent:[] };
  var TG_DURATIONS = [
    {value:"1h",label:"1 hora"},{value:"today",label:"Hoje"},{value:"24h",label:"24 horas"},
    {value:"7d",label:"7 dias"},{value:"30d",label:"30 dias"},{value:"forever",label:"Até cancelar"}
  ];
  var tgDur = "7d";
  function tgApi(path, opts){
    opts = opts || {};
    var headers = { "content-type":"application/json" };
    try{ var did=localStorage.getItem("dvl_tg_did"); if(did) headers["x-dvl-device"]=did; }catch(_){}
    return fetch(path, Object.assign({ credentials:"include", headers:headers }, opts, { headers:Object.assign(headers, opts.headers||{}) }))
      .then(function(r){ return r.json().catch(function(){ return null; }); })
      .catch(function(){ return null; });
  }
  function tgEnabled(){ return !!(TG.status && TG.status.enabled); }
  function tgConnected(){ return !!(TG.status && TG.status.connected); }
  function tgActive(){ return !!(TG.status && TG.status.status==="active" && (TG.status.activeUntil==null || TG.status.activeUntil>Date.now())); }
  function tgLoadStatus(){
    return tgApi("/api/telegram/status").then(function(j){
      if(j && typeof j==="object") TG.status = j;
      TG.loaded = true;
      if(panel && panel.classList.contains("is-open")) renderBody();
      return j;
    });
  }
  /* histórico do servidor (alertas que foram pro Telegram, inclusive com o DVL
     fechado). Mesclado com o log local em "Recentes". */
  function tgLoadRecent(){
    return tgApi("/api/telegram/recent").then(function(j){
      if(j && Array.isArray(j.entries)) TG.recent = j.entries;
      if(panel && panel.classList.contains("is-open")) renderBody();
      return j;
    });
  }
  function tgStartConnectPoll(){
    clearInterval(TG.pollTimer); TG.pollUntil = Date.now()+60000; // polling curto (doc: ~60s)
    TG.pollTimer = setInterval(function(){
      if(Date.now() > TG.pollUntil){ clearInterval(TG.pollTimer); return; }
      tgLoadStatus().then(function(j){ if(j && j.connected){ clearInterval(TG.pollTimer); tgSyncRules(); } });
    }, 2000);
  }
  /* Sync das regras com Telegram ligado → servidor (avaliação 24/7). Debounced.
     Resolve "chart" pro TF atual (evalTf), pra o servidor ter um TF concreto. */
  var _tgSyncTimer=0;
  function tgSyncRules(){
    if(!tgConnected()) return;
    clearTimeout(_tgSyncTimer);
    _tgSyncTimer=setTimeout(function(){
      try{
        var iv=gtf();
        var payload=rules.filter(function(r){ return r.telegram; }).map(function(r){
          return { id:r.id, source:r.source, signal:r.signal, dir:r.dir, level:r.level, params:r.params,
                   tf:r.tf, evalTf:((!r.tf||r.tf==="chart")?iv:r.tf), rearm:r.rearm, cooldownSec:r.cooldownSec,
                   symbol:r.symbol, telegram:r.telegram, enabled:r.enabled };
        });
        tgApi("/api/telegram/rules",{ method:"POST", body:JSON.stringify({rules:payload}) });
      }catch(_){}
    }, 400);
  }
  /* Heartbeat: enquanto o DVL está aberto e conectado, avisa o servidor pra ele
     NÃO avaliar (o cliente já entrega) — evita duplicidade. */
  function tgHeartbeat(){ if(tgConnected()) tgApi("/api/telegram/heartbeat",{method:"POST"}); }
  function tgBoot(){
    tgLoadStatus().then(function(j){ if(j && j.connected){ tgSyncRules(); tgHeartbeat(); tgLoadRecent(); } });
    setInterval(tgHeartbeat, 15000);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", tgBoot, {once:true}); else setTimeout(tgBoot, 1500);

  // TFs do dropdown: "Chart" (TF atual do gráfico) + favoritos do hotbar.
  // Removido o "Qualquer" pra evitar disparo em vários TFs de uma vez.
  function tfAselOptions(){
    var favs=[], cur="";
    try{ if(window.DVL_TF_MENU && typeof window.DVL_TF_MENU.favorites==="function") favs=window.DVL_TF_MENU.favorites()||[]; }catch(_){}
    try{ if(window.DVL_TF_MENU && typeof window.DVL_TF_MENU.active==="function") cur=window.DVL_TF_MENU.active()||""; }catch(_){}
    var list=[];
    favs.forEach(function(tf){ tf=String(tf); if(tf && list.indexOf(tf)<0) list.push(tf); });
    if(cur && list.indexOf(cur)<0) list.push(cur);
    if(!list.length) list=["1m","5m","15m","1h","4h","1d"];
    var opts=[{value:"chart",label:"Chart (TF atual)"}];
    list.forEach(function(tf){ opts.push({value:tf,label:tf}); });
    return opts;
  }
  /* "chart" (ou vazio, legado) = casa com o TF atual do gráfico; um TF fixo só
     casa quando o contexto/gráfico está naquele TF. Evita 1 regra disparar em
     vários TFs de uma vez. */
  function tfMatches(rule, ctxTf){
    var rt = rule.tf;
    if(!rt || rt==="chart") rt = gtf();
    if(!ctxTf) return true;
    return String(rt)===String(ctxTf);
  }
  var REARM_OPTS=[{value:"time",label:"Por tempo (s)"},{value:"bar",label:"A cada candle fechado"},{value:"bar_dir",label:"A cada candle + direção"}];

  // fecha o dropdown customizado ao tocar fora dele
  document.addEventListener("click", function(ev){
    if(ev.target && ev.target.closest && (ev.target.closest(".dvl-asel") || ev.target.closest("#dvlAselFloat1620"))) return;
    closeAselFloat();
  }, true);
  window.addEventListener("resize", function(){ closeAselFloat(); }, {passive:true});

  /* Dropdown CUSTOMIZADO (o <select> nativo do Android pinta a opção marcada de
     verde sólido, tapando o texto — e ignora CSS). Aqui controlamos 100%: a
     opção selecionada ganha só um leve realce + marcador, sem cobrir o texto. */
  function aselHTML(id, options, cur){
    var curLabel="";
    for(var i=0;i<options.length;i++){ if(String(options[i].value)===String(cur)){ curLabel=options[i].label; break; } }
    if(curLabel==="" && options.length) curLabel=options[0].label;
    var opts=options.map(function(o){ return '<div class="dvl-asel-opt'+(String(o.value)===String(cur)?" is-sel":"")+'" data-val="'+esc(o.value)+'" role="option">'+esc(o.label)+'</div>'; }).join("");
    return '<div class="dvl-asel" data-asel="'+esc(id)+'">'
      + '<button type="button" class="dvl-asel-btn"><span class="dvl-asel-lbl">'+esc(curLabel)+'</span><i class="dvl-asel-chev" aria-hidden="true"></i></button>'
      + '<div class="dvl-asel-menu" role="listbox">'+opts+'</div></div>';
  }
  function sourceAselOptions(){ return DVL_ALERTS.sources().map(function(s){ return {value:s.key,label:s.title}; }); }
  function signalAselOptions(srcKey){ var s=SOURCES[srcKey]; if(!s) return []; return s.signals.map(function(sg){ return {value:sg.id,label:sg.label}; }); }

  function currentSignalDef(){ return signalDef(draft.source, draft.signal); }
  function paramOptions(param){ try{ var o=(typeof param.options==="function")?param.options():param.options; return Array.isArray(o)?o:[]; }catch(_){ return []; } }
  // garante um valor default (1ª opção) p/ cada parâmetro do sinal atual
  function syncDraftParams(){
    var sg=currentSignalDef(); if(!sg||!sg.params) return;
    draft.params = draft.params||{};
    sg.params.forEach(function(pr){
      if(draft.params[pr.id]==null || draft.params[pr.id]===""){
        var opts=paramOptions(pr); if(opts.length) draft.params[pr.id]=String(opts[0].value);
      }
    });
    // Cruzamentos: evita A e B iguais por padrão (linha B = 2ª opção disponível)
    if(draft.source==="cross" && draft.params.lhs===draft.params.rhs){
      var lo=lineOptions(); if(lo.length>1) draft.params.rhs=String(lo[1].value);
    }
  }

  function newRuleHTML(){
    var sg = currentSignalDef();
    syncDraftParams();
    var needsLevel = sg && sg.needsLevel;
    var hasDir = sg && sg.dirs;
    var levelLabel = (sg&&sg.levelLabel)||"Nível";
    var levelUnit = (sg&&sg.levelUnit)||"";
    var lvlPlace = draft.source==="price" && (draft.signal==="cross_up"||draft.signal==="cross_down") ? String(Math.round(gprice()||0)) : ((sg&&sg.levelDefault!=null)?String(sg.levelDefault):"");
    var h = '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Novo alerta</span></div>'
      + '<div class="dvl-vt-grid">'
      + '<div class="dvl-vt-field"><label>Indicador</label>'+aselHTML("source", sourceAselOptions(), draft.source)+'</div>'
      + '<div class="dvl-vt-field"><label>Sinal</label>'+aselHTML("signal", signalAselOptions(draft.source), draft.signal)+'</div>';
    if(sg && sg.params){
      sg.params.forEach(function(pr){
        var opts=paramOptions(pr), cur=draft.params[pr.id];
        h += '<div class="dvl-vt-field"><label>'+esc(pr.label||pr.id)+'</label>'+aselHTML("alp:"+pr.id, opts, cur)+'</div>';
      });
    }
    if(needsLevel){
      h += '<div class="dvl-vt-field"><label>'+esc(levelLabel)+(levelUnit?(" ("+esc(levelUnit)+")"):"")+'</label><input class="dvl-vt-input" type="number" step="any" data-al="level" value="'+esc(draft.level)+'" placeholder="'+esc(lvlPlace)+'"></div>';
    }
    if(hasDir){
      h += '<div class="dvl-vt-field"><label>Direção</label>'+aselHTML("dir", [{value:"any",label:"Qualquer"},{value:"up",label:"Alta ▲"},{value:"down",label:"Baixa ▼"}], draft.dir)+'</div>';
    }
    h += '<div class="dvl-vt-field"><label>Timeframe</label>'+aselHTML("tf", tfAselOptions(), draft.tf)+'</div>'
      + '<div class="dvl-vt-field"><label>Rearmar</label>'+aselHTML("rearm", REARM_OPTS, draft.rearm)+'</div>'
      + (draft.rearm==="time" ? '<div class="dvl-vt-field"><label>Cooldown (s)</label><input class="dvl-vt-input" type="number" min="0" step="5" data-al="cooldownSec" value="'+esc(draft.cooldownSec)+'"></div>' : '')
      + '<div class="dvl-vt-field"><label>Toast no gráfico</label><label class="dvl-switch"><input type="checkbox" data-al="toast"'+(draft.toast?" checked":"")+'><i></i><b></b></label></div>'
      + '<div class="dvl-vt-field"><label>Som</label><label class="dvl-switch"><input type="checkbox" data-al="sound"'+(draft.sound?" checked":"")+'><i></i><b></b></label></div>'
      + (tgEnabled() ? '<div class="dvl-vt-field"><label>Telegram</label><label class="dvl-switch'+(tgConnected()?'':' is-disabled')+'" data-tg-switch><input type="checkbox" data-al="telegram"'+((draft.telegram&&tgConnected())?" checked":"")+(tgConnected()?'':' disabled')+'><i></i><b></b></label></div>' : '')
      + '<div class="dvl-vt-field"><label>Só uma vez</label><label class="dvl-switch"><input type="checkbox" data-al="once"'+(draft.once?" checked":"")+'><i></i><b></b></label></div>'
      + '</div>';
    if(sg&&sg.desc){ h += '<div class="dvl-alert-hint">'+esc(sg.desc)+'</div>'; }
    h += '<div class="dvl-alert-actions"><button type="button" class="dvl-alert-btn primary" data-al-add>+ Criar alerta</button></div>'
      + '</div>';
    return h;
  }

  function ago(ts){ var s=Math.max(0,Math.floor((now()-ts)/1000)); if(s<60) return "há "+s+"s"; var m=Math.floor(s/60); if(m<60) return "há "+m+"min"; var h=Math.floor(m/60); if(h<24) return "há "+h+"h"; return "há "+Math.floor(h/24)+"d"; }

  function rulesHTML(){
    if(!rules.length) return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Meus alertas</span><span class="dvl-alert-count">0</span></div><div class="dvl-alert-empty">Nenhuma regra ainda. Monte uma acima — ela vale pra qualquer indicador da lista.</div></div>';
    var rowsArr = rules.slice().reverse().map(function(r){
      var src=SOURCES[r.source], sg=signalDef(r.source,r.signal);
      var title=(src&&src.title)||r.source, label=(sg&&sg.label)||r.signal;
      var dirTag = r.dir&&r.dir!=="any" ? '<span class="dvl-alert-tag '+(r.dir==="down"?"down":"up")+'">'+(r.dir==="down"?"▼":"▲")+'</span>' : '';
      var lvlTag = r.level!=null ? '<span class="dvl-alert-tag">'+fmtPx(r.level)+((sg&&sg.levelUnit==="%")?"%":"")+'</span>' : '';
      var pTag = "";
      if(r.params){
        if(r.source==="ma" && r.params.maId!=null && r.params.maId!=="") pTag='<span class="dvl-alert-tag">'+esc(maLabelFor(r.params.maId))+'</span>';
        else if(r.source==="vp" && r.params.level) pTag='<span class="dvl-alert-tag">'+esc(String(r.params.level).toUpperCase())+'</span>';
        else if(r.source==="cross" && r.params.lhs && r.params.rhs) pTag='<span class="dvl-alert-tag">'+esc(lineLabelFor(r.params.lhs))+' ✕ '+esc(lineLabelFor(r.params.rhs))+'</span>';
      }
      var tfLabel = (!r.tf||r.tf==="chart") ? "Chart" : r.tf;
      var tfTag = '<span class="dvl-alert-tag tf">'+esc(tfLabel)+'</span>';
      var chans = (r.toast?"toast":"") + (r.sound?(r.toast?"+som":"som"):"");
      var rearmTxt = r.rearm==="bar" ? "1×/candle" : r.rearm==="bar_dir" ? "1×/candle+dir" : ("cd "+r.cooldownSec+"s");
      var meta = (r.fires?(r.fires+"× · "+ago(r.lastFired)):"nunca disparou") + (chans?(" · "+chans):"") + " · "+rearmTxt;
      return '<div class="dvl-alert-row'+(r.enabled?"":" off")+'" data-id="'+r.id+'">'
        + '<label class="dvl-switch sm"><input type="checkbox" data-al-toggle'+(r.enabled?" checked":"")+'><i></i><b></b></label>'
        + '<div class="dvl-alert-row-main"><div class="dvl-alert-row-title">'+esc(title)+' · '+esc(label)+' '+pTag+dirTag+lvlTag+tfTag+'</div>'
        + '<div class="dvl-alert-row-meta">'+esc(meta)+'</div></div>'
        + '<button type="button" class="dvl-alert-mini" data-al-test title="Testar">▶</button>'
        + '<button type="button" class="dvl-alert-mini del" data-al-del title="Excluir">×</button>'
        + '</div>';
    }).join("");
    var on = rules.filter(function(r){return r.enabled;}).length;
    return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Meus alertas</span><span class="dvl-alert-count">'+on+'/'+rules.length+'</span></div>'+rowsArr+'</div>';
  }

  function recentHTML(){
    var local=[]; try{ if(window.DVL_ALERTS_LOG) local=(window.DVL_ALERTS_LOG.list()||[]).map(function(e){ return {msg:e.msg, ts:e.ts, tg:!!e.tg}; }); }catch(_){}
    // histórico do servidor (Telegram, inclusive com o DVL fechado) → sempre tg
    var srv=(TG.recent||[]).map(function(e){ return {msg:e.msg, ts:e.ts, tg:true}; });
    // mescla + dedup (mesma msg dentro de ~8s) + ordena desc
    var all=local.concat(srv).filter(function(e){ return e && e.msg; });
    all.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    var seen=[], list=[];
    all.forEach(function(e){
      var dup=seen.some(function(s){ return s.msg===e.msg && Math.abs((s.ts||0)-(e.ts||0))<8000; });
      if(dup){ // se o duplicado veio do servidor, garante a marca TG
        seen.forEach(function(s){ if(s.msg===e.msg && Math.abs((s.ts||0)-(e.ts||0))<8000 && e.tg) s.tg=true; });
        return;
      }
      seen.push(e); list.push(e);
    });
    list = list.slice(0,12);
    if(!list.length) return '';
    var rows = list.map(function(e){
      var c = /COMPRA|compra|ACIMA|alta|\+/.test(e.msg)?"#13dc8d":/VENDA|venda|ABAIXO|baixa/.test(e.msg)?"#ff6b81":"#9fb6ab";
      var tg = e.tg ? '<span class="dvl-tg-chip">TG</span>' : '';
      return '<div class="dvl-alert-recent"><span class="dot" style="background:'+c+'"></span><span class="txt">'+esc(e.msg)+'</span>'+tg+'<span class="t">'+ago(e.ts)+'</span></div>';
    }).join("");
    return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Recentes</span><button type="button" class="dvl-alert-linkbtn" data-al-clear>limpar</button></div>'+rows+'</div>';
  }

  function tgStatePill(s){
    var cls="off", txt="Não conectado";
    if(s && s.connected){
      if(s.status==="active"){ cls="on"; txt="Conectado"; }
      else if(s.status==="paused"){ cls="warn"; txt="Pausado"; }
      else if(s.status==="expired"){ cls="warn"; txt="Expirado"; }
      else { cls="warn"; txt=String(s.status||""); }
    }
    return '<span class="dvl-tg-pill '+cls+'">'+esc(txt)+'</span>';
  }
  function telegramSectionHTML(){
    var s = TG.status;
    if(!TG.loaded) return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Telegram</span></div><div class="dvl-alert-empty">carregando…</div></div>';
    if(!s || !s.enabled) return ''; // feature desligada no servidor → não mostra
    var head = '<div class="dvl-vt-section dvl-tg-section" id="dvlTgSection"><div class="dvl-vt-section-title"><span>Telegram</span>'+tgStatePill(s)+'</div>';
    var body;
    if(!s.connected){
      body = '<div class="dvl-alert-hint">Receba seus alertas no Telegram (chat privado com @'+esc(s.botUsername||"DvlalertsBot")+'). '
        + (s.mode==="server" ? "Funciona mesmo com o DVL fechado." : "Funciona enquanto o DVL estiver aberto.") + '</div>'
        + '<div class="dvl-vt-grid"><div class="dvl-vt-field"><label>Receber por</label>'+aselHTML("tgdur", TG_DURATIONS, tgDur)+'</div></div>'
        + '<div class="dvl-alert-actions"><button type="button" class="dvl-alert-btn primary" data-tg-connect>Conectar Telegram</button></div>'
        + '<div class="dvl-tg-msg" data-tg-msg></div>';
    } else {
      var until = s.activeUntil ? ("Ativo até " + new Date(s.activeUntil).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})) : "Ativo até você cancelar";
      var stTxt = s.status==="paused" ? "Pausado — envio suspenso" : s.status==="expired" ? "Expirado — renove para voltar" : "Conectado · Chat privado";
      body = '<div class="dvl-tg-conn"><div class="dvl-tg-conn-line">'+esc(stTxt)+'</div><div class="dvl-tg-conn-sub">'+esc(until)+'</div></div>'
        + '<div class="dvl-vt-grid"><div class="dvl-vt-field"><label>Renovar por</label>'+aselHTML("tgdur", TG_DURATIONS, tgDur)+'</div></div>'
        + '<div class="dvl-tg-btns">'
        + '<button type="button" class="dvl-alert-mini-btn" data-tg-test>Testar</button>'
        + (s.status==="paused" ? '' : '<button type="button" class="dvl-alert-mini-btn" data-tg-pause>Pausar</button>')
        + '<button type="button" class="dvl-alert-mini-btn" data-tg-renew>Renovar</button>'
        + '<button type="button" class="dvl-alert-mini-btn danger" data-tg-disconnect>Desconectar</button>'
        + '</div><div class="dvl-tg-msg" data-tg-msg></div>';
    }
    return head + body + '</div>';
  }
  function tgMsg(b, txt, kind){
    var el = b ? b.querySelector("[data-tg-msg]") : (panel && panel.querySelector("[data-tg-msg]"));
    if(el){ el.textContent = txt||""; el.className = "dvl-tg-msg" + (kind?(" "+kind):""); }
  }

  function renderBody(){
    if(!panel) return; var b=panel.querySelector("#dvlAlertsBody"); if(!b) return;
    b.innerHTML = newRuleHTML() + telegramSectionHTML() + rulesHTML() + recentHTML();
    bindBody(b);
  }

  /* O menu é renderizado como filho do <body> (o painel tem transform +
     overflow:hidden, o que quebraria/cortaria um menu fixed/absolute interno).
     Um float singleton recebe as opções do dropdown clicado e é posicionado na
     viewport, abrindo pra baixo ou pra cima conforme o espaço. */
  var _aselOpenWrap = null;
  function ensureAselFloat(){
    var f=document.getElementById("dvlAselFloat1620");
    if(!f){
      f=document.createElement("div"); f.id="dvlAselFloat1620"; f.className="dvl-asel-float"; f.setAttribute("data-dvl-ui","true");
      document.body.appendChild(f);
      f.addEventListener("pointerdown", function(e){ e.stopPropagation(); }, true);
      f.addEventListener("click", function(ev){
        var o=ev.target&&ev.target.closest?ev.target.closest(".dvl-asel-opt"):null; if(!o) return;
        ev.stopPropagation();
        applyAsel(f.getAttribute("data-asel"), o.getAttribute("data-val"));
      });
    }
    return f;
  }
  function closeAselFloat(){
    var f=document.getElementById("dvlAselFloat1620"); if(f) f.classList.remove("open");
    if(_aselOpenWrap){ _aselOpenWrap.classList.remove("open"); _aselOpenWrap=null; }
  }
  function openAselFloat(wrap, btn){
    var f=ensureAselFloat();
    var src=wrap.querySelector(".dvl-asel-menu");
    f.innerHTML = src?src.innerHTML:"";
    f.setAttribute("data-asel", wrap.getAttribute("data-asel"));
    var r=btn.getBoundingClientRect();
    var vw=window.innerWidth||document.documentElement.clientWidth;
    var vh=window.innerHeight||document.documentElement.clientHeight;
    var w=Math.min(Math.max(Math.round(r.width),210), vw-16);
    var left=Math.round(r.left); if(left+w>vw-8) left=vw-8-w; if(left<8) left=8;
    f.style.width=w+"px"; f.style.left=left+"px"; f.style.right="auto";
    f.classList.add("open");
    var mh=Math.min(260, f.scrollHeight||260);
    var below=vh-r.bottom-8, above=r.top-8;
    if(below>=mh || below>=above){ f.style.top=Math.round(r.bottom+4)+"px"; f.style.bottom="auto"; f.style.maxHeight=Math.max(120,Math.min(260,below))+"px"; }
    else { f.style.top="auto"; f.style.bottom=Math.round(vh-r.top+4)+"px"; f.style.maxHeight=Math.max(120,Math.min(260,above))+"px"; }
    wrap.classList.add("open"); _aselOpenWrap=wrap;
  }
  function applyAsel(id, val){
    closeAselFloat();
    if(id==="source"){ draft.source=val; var s=SOURCES[val]; draft.signal=(s&&s.signals[0])?s.signals[0].id:""; draft.level=""; draft.params={}; renderBody(); }
    else if(id==="signal"){ draft.signal=val; draft.level=""; draft.params={}; renderBody(); }
    else if(id==="dir"){ draft.dir=val; renderBody(); }
    else if(id==="tf"){ draft.tf=val; renderBody(); }
    else if(id==="rearm"){ draft.rearm=val; renderBody(); }
    else if(id==="tgdur"){ tgDur=val; renderBody(); }
    else if(id.indexOf("alp:")===0){ draft.params=draft.params||{}; draft.params[id.slice(4)]=val; renderBody(); }
  }
  function bindBody(b){
    // inputs (nível, tf, cooldown) + switches (toast, som, once)
    b.querySelectorAll("input[data-al]").forEach(function(el){
      var key=el.getAttribute("data-al");
      var evt = (el.type==="checkbox") ? "change" : "input";
      el.addEventListener(evt, function(){
        if(el.type==="checkbox") draft[key]=el.checked; else draft[key]=el.value;
      });
    });
    // dropdowns customizados (menu renderizado no body via float)
    b.querySelectorAll(".dvl-asel-btn").forEach(function(btn){
      btn.addEventListener("click", function(ev){
        ev.stopPropagation();
        var wrap=btn.closest(".dvl-asel");
        if(_aselOpenWrap===wrap){ closeAselFloat(); return; }
        closeAselFloat();
        openAselFloat(wrap, btn);
      });
    });
    // fecha o dropdown ao rolar o corpo do painel (o menu é fixed no body)
    b.addEventListener("scroll", function(){ closeAselFloat(); }, {passive:true});
    var add=b.querySelector("[data-al-add]");
    if(add) add.addEventListener("click", function(){
      var sg=currentSignalDef();
      syncDraftParams();
      if(sg&&sg.needsLevel && (draft.level===""||draft.level==null||!Number.isFinite(Number(draft.level)))){
        if(draft.source==="price" && (draft.signal==="cross_up"||draft.signal==="cross_down")){ var gp=gprice(); if(gp!=null) draft.level=String(Math.round(gp)); }
        if(draft.level===""||draft.level==null||!Number.isFinite(Number(draft.level))){ flash(add,"informe o nível"); return; }
      }
      // validação de parâmetros obrigatórios (ex.: escolher a média)
      if(sg&&sg.params){ for(var pi=0;pi<sg.params.length;pi++){ var pid=sg.params[pi].id; if(draft.params[pid]==null||draft.params[pid]===""){ flash(add, sg.params[pi].id==="maId"?"ligue e escolha a média":"escolha "+(sg.params[pi].label||"o parâmetro")); return; } } }
      if(draft.source==="cross" && draft.params.lhs===draft.params.rhs){ flash(add,"escolha duas linhas diferentes"); return; }
      var scoped = (draft.source==="price"||draft.source==="ma"||draft.source==="vp"||draft.source==="cross");
      addRule({
        source:draft.source, signal:draft.signal, dir:draft.dir,
        level:(sg&&sg.needsLevel)?Number(draft.level):null,
        params:Object.assign({}, draft.params),
        tf:draft.tf, rearm:draft.rearm, cooldownSec:Number(draft.cooldownSec)||0,
        toast:draft.toast, sound:draft.sound, telegram:(draft.telegram && tgConnected()), once:draft.once,
        symbol:scoped?gsym():""
      });
      draft.level="";
      renderBody();
    });
    b.querySelectorAll(".dvl-alert-row").forEach(function(row){
      var id=row.getAttribute("data-id");
      var tg=row.querySelector("[data-al-toggle]"); if(tg) tg.addEventListener("change",function(){ updateRule(id,{enabled:tg.checked}); renderBody(); });
      var del=row.querySelector("[data-al-del]"); if(del) del.addEventListener("click",function(){ deleteRule(id); renderBody(); });
      var tst=row.querySelector("[data-al-test]"); if(tst) tst.addEventListener("click",function(){ DVL_ALERTS.test(id); });
    });
    var clr=b.querySelector("[data-al-clear]"); if(clr) clr.addEventListener("click",function(){ try{ if(window.DVL_ALERTS_LOG) window.DVL_ALERTS_LOG.clear(); }catch(_){} renderBody(); });

    // ── Telegram ──
    // clicar no switch desabilitado leva à seção de conexão (destaque)
    var tgsw=b.querySelector("[data-tg-switch]");
    if(tgsw && !tgConnected()){ tgsw.addEventListener("click", function(ev){ ev.preventDefault(); var sec=b.querySelector("#dvlTgSection"); if(sec){ sec.scrollIntoView({behavior:"smooth",block:"center"}); sec.classList.add("dvl-tg-flash"); setTimeout(function(){ sec.classList.remove("dvl-tg-flash"); },1200); } }); }
    var tgConnectBtn=b.querySelector("[data-tg-connect]");
    if(tgConnectBtn) tgConnectBtn.addEventListener("click", function(){
      tgMsg(b,"abrindo o Telegram…");
      tgApi("/api/telegram/connect-intent", { method:"POST", body:JSON.stringify({duration:tgDur}) }).then(function(j){
        if(j && j.ok && j.deepLink){
          try{ if(j.deviceToken) localStorage.setItem("dvl_tg_did", j.deviceToken); }catch(_){}
          var w=window.open(j.deepLink, "_blank"); if(!w){ location.href=j.deepLink; }
          tgMsg(b,"toque em INICIAR no Telegram… aguardando confirmação","ok");
          tgStartConnectPoll();
        } else { tgMsg(b, (j&&j.error==="rate_limited")?"muitas tentativas, aguarde":"não consegui iniciar a conexão","err"); }
      });
    });
    function tgAction(sel, path, body, okMsg){
      var el=b.querySelector(sel); if(!el) return;
      el.addEventListener("click", function(){
        el.disabled=true;
        tgApi(path, { method:"POST", body: JSON.stringify(body||{}) }).then(function(j){
          if(okMsg && j && (j.ok || j.queued!==undefined)) tgMsg(b, (j.ok===false?("falhou: "+(j.error||"?")):okMsg), j.ok===false?"err":"ok");
          tgLoadStatus();
        });
      });
    }
    tgAction("[data-tg-test]", "/api/telegram/test", {}, "teste enviado — confira o Telegram");
    tgAction("[data-tg-pause]", "/api/telegram/pause", {}, "pausado");
    tgAction("[data-tg-renew]", "/api/telegram/renew", {duration:tgDur}, "renovado");
    var tgDisc=b.querySelector("[data-tg-disconnect]");
    if(tgDisc) tgDisc.addEventListener("click", function(){ tgApi("/api/telegram/disconnect",{method:"POST"}).then(function(){ tgLoadStatus(); }); });
  }

  function flash(btn,txt){ var old=btn.textContent; btn.textContent=txt; btn.classList.add("warn"); setTimeout(function(){ btn.textContent=old; btn.classList.remove("warn"); },1400); }

  function ensurePanel(){
    if(panel) return panel;
    panel=document.createElement("div"); panel.id="dvlAlertsHubPanel"; panel.className="dvl-vt-panel dvl-alerts-panel"; panel.setAttribute("data-dvl-ui","true");
    panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>Alertas</b><small>central · todos os indicadores</small></div>'
      +'<div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlAlertsHubClose" type="button" aria-label="Fechar">×</button></div></div>'
      +'<div class="dvl-vt-body" id="dvlAlertsBody"></div>';
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown",function(e){ e.stopPropagation(); },true);
    panel.querySelector("#dvlAlertsHubClose").addEventListener("click", closePanel);
    return panel;
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderBody(); tgLoadStatus(); tgLoadRecent(); var b=document.getElementById("dvlAlertsNavBadge1620"); if(b) b.style.display="none"; }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); closeAselFloat(); clearInterval(TG.pollTimer); }
  function togglePanel(){ ensurePanel(); if(panel.classList.contains("is-open")) closePanel(); else openPanel(); }

  window.addEventListener("dvl:alerts-rules-update", function(){ if(panel&&panel.classList.contains("is-open")) renderBody(); });
  window.addEventListener("dvl:alerts-fired", function(){ if(panel&&panel.classList.contains("is-open")) renderBody(); });

  window.DVL_ALERTS_HUB_API = { open:openPanel, openPanel:openPanel, close:closePanel, toggle:togglePanel, isOn:function(){ return !!(panel&&panel.classList.contains("is-open")); } };

  /* ══ botão da nav (era Scanner) ══════════════════════════════════════════ */
  function bellSVG(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">'
      +'<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.2 7.5-2.2 7.5h16.4S18 14.5 18 8.5z"/>'
      +'<path d="M10.3 20.2a2 2 0 0 0 3.4 0"/></svg>';
  }
  /* O botão da bottom nav (data-dvl-nav-key="markets", agora rotulado "Alertas")
     é dono do script-0120, que chama window.DVL_ALERTS_HUB_API.toggle(). Aqui só
     mantemos um clique delegado de reserva para um eventual #alertsNavBtn (nav
     legada) — inofensivo se não existir. */
  window.addEventListener("click", function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest("#alertsNavBtn") : null;
    if(!btn) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    togglePanel();
  }, true);

  /* ══ CSS ══════════════════════════════════════════════════════════════════ */
  function injectCSS(){
    if(document.getElementById("dvlAlertsHubCSS1620")) return;
    var st=document.createElement("style"); st.id="dvlAlertsHubCSS1620";
    st.textContent = [
      /* nav bell badge */
      ".dvlAlertsBell1620{position:relative;display:inline-flex}",
      ".dvlAlertsNavBadge{display:none;position:absolute;top:-2px;right:-3px;width:7px;height:7px;border-radius:50%;background:#ff5a76;box-shadow:0 0 0 2px rgba(4,10,14,.9)}",
      ".dvlAlertsNavBadge.pulse{animation:dvlAlertBadgePulse .9s ease-out}",
      "@keyframes dvlAlertBadgePulse{0%{transform:scale(.4);opacity:.2}60%{transform:scale(1.35);opacity:1}100%{transform:scale(1);opacity:1}}",
      /* toasts */
      "#dvlAlertToastWrap1620{position:fixed;top:64px;right:14px;z-index:2147483400;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:min(340px,86vw)}",
      ".dvl-alert-toast{pointer-events:auto;display:flex;align-items:stretch;gap:0;background:linear-gradient(180deg,rgba(12,20,26,.98),rgba(6,11,15,.98));border:1px solid rgba(120,150,140,.24);border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.45);transform:translateX(20px);opacity:0;transition:transform .24s cubic-bezier(.2,.9,.3,1),opacity .24s}",
      ".dvl-alert-toast.in{transform:translateX(0);opacity:1}",
      ".dvl-alert-toast.out{transform:translateX(20px);opacity:0}",
      ".dvl-alert-toast-bar{width:4px;flex:0 0 auto;background:var(--dvl-toast-accent,#35e0ff)}",
      ".dvl-alert-toast-in{flex:1;min-width:0;padding:9px 4px 9px 11px}",
      ".dvl-alert-toast-msg{color:#eafff4;font:800 12px/1.35 system-ui;word-break:break-word}",
      ".dvl-alert-toast-sub{color:#8fb0a3;font:700 9.5px/1.3 system-ui;margin-top:2px;letter-spacing:.02em}",
      ".dvl-alert-toast-x{flex:0 0 auto;align-self:flex-start;background:none;border:0;color:#7f9c8e;font:700 16px/1 system-ui;padding:6px 8px;cursor:pointer}",
      ".dvl-alert-toast-x:hover{color:#dcebe4}",
      /* panel bits (herda .dvl-vt-*) */
      ".dvl-alerts-panel .dvl-vt-body{max-height:min(74vh,620px);overflow-y:auto}",
      /* dropdown CUSTOMIZADO — substitui o <select> nativo (que no Android
         pintava a opção marcada de verde sólido tapando o texto). */
      ".dvl-asel{position:relative}",
      ".dvl-asel-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#0b1218;border:1px solid rgba(129,166,151,.28);border-radius:9px;padding:8px 10px;color:#eafff4;font:700 12px system-ui;cursor:pointer;text-align:left;line-height:1.2}",
      ".dvl-asel-btn:active{background:#0e1720}",
      ".dvl-asel-lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dvl-asel-chev{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #7f9c8e;flex:0 0 auto;transition:transform .16s}",
      ".dvl-asel.open .dvl-asel-chev{transform:rotate(180deg)}",
      ".dvl-asel.open .dvl-asel-btn{border-color:rgba(53,224,255,.5)}",
      ".dvl-asel-menu{display:none}", /* fonte de dados: nunca visível inline */
      /* menu flutuante (filho do body, escapa do transform+overflow do painel) */
      "#dvlAselFloat1620{display:none;position:fixed;z-index:2147483600;background:#0c141a;border:1px solid rgba(129,166,151,.34);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.62);overflow-y:auto;padding:4px;-webkit-overflow-scrolling:touch}",
      "#dvlAselFloat1620.open{display:block}",
      ".dvl-asel-opt{padding:9px 10px;border-radius:7px;color:#cfe0d8;font:650 12px/1.3 system-ui;cursor:pointer;white-space:normal;word-break:break-word}",
      ".dvl-asel-opt:active{background:rgba(129,166,151,.14)}",
      ".dvl-asel-opt.is-sel{color:#eafff4;background:rgba(53,224,255,.1);position:relative;padding-left:18px}",
      ".dvl-asel-opt.is-sel::before{content:'';position:absolute;left:7px;top:50%;transform:translateY(-50%);width:5px;height:5px;border-radius:50%;background:#35e0ff}",
      ".dvl-alert-hint{color:#8aa99b;font:600 10px/1.45 system-ui;margin:2px 2px 0}",
      ".dvl-alert-actions{margin-top:10px}",
      ".dvl-alert-btn{border:1px solid rgba(53,224,255,.34);background:rgba(53,224,255,.12);color:#cdeffb;font:800 12px system-ui;border-radius:9px;padding:8px 14px;cursor:pointer;width:100%}",
      ".dvl-alert-btn.primary:hover{background:rgba(53,224,255,.2)}",
      ".dvl-alert-btn.warn{border-color:rgba(255,120,120,.5);background:rgba(255,120,120,.16);color:#ffd9d9}",
      ".dvl-alert-count{color:#7f9c8e;font:700 10px system-ui}",
      ".dvl-alert-empty{color:#8aa99b;font:600 11px/1.5 system-ui;padding:8px 2px}",
      ".dvl-alert-row{display:flex;align-items:center;gap:9px;padding:8px 2px;border-top:1px solid rgba(129,166,151,.12)}",
      ".dvl-alert-row.off{opacity:.5}",
      ".dvl-alert-row-main{flex:1;min-width:0}",
      ".dvl-alert-row-title{color:#dcebe4;font:750 11px/1.3 system-ui;display:flex;align-items:center;gap:5px;flex-wrap:wrap}",
      ".dvl-alert-row-meta{color:#8aa99b;font:600 9px/1.3 system-ui;margin-top:2px}",
      ".dvl-alert-tag{font:800 8.5px/1 system-ui;color:#bcd8ff;background:rgba(120,200,255,.12);border:1px solid rgba(120,200,255,.24);border-radius:5px;padding:2px 5px}",
      ".dvl-alert-tag.up{color:#13dc8d;background:rgba(19,220,141,.12);border-color:rgba(19,220,141,.28)}",
      ".dvl-alert-tag.down{color:#ff6b81;background:rgba(255,107,129,.12);border-color:rgba(255,107,129,.28)}",
      ".dvl-alert-tag.tf{color:#e6d9a0;background:rgba(230,210,140,.1);border-color:rgba(230,210,140,.24)}",
      ".dvl-alert-mini{flex:0 0 auto;width:24px;height:24px;border-radius:7px;border:1px solid rgba(129,166,151,.24);background:rgba(129,166,151,.08);color:#bcd3e2;font:700 11px/1 system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center}",
      ".dvl-alert-mini:hover{background:rgba(129,166,151,.18)}",
      ".dvl-alert-mini.del{color:#ff8ea0}",
      ".dvl-switch.sm{transform:scale(.85)}",
      ".dvl-alert-recent{display:flex;align-items:center;gap:7px;padding:4px 0;border-top:1px solid rgba(129,166,151,.08)}",
      ".dvl-alert-recent .dot{width:6px;height:6px;border-radius:50%;flex:0 0 auto}",
      ".dvl-alert-recent .txt{flex:1;min-width:0;color:#cfe0d8;font:600 10px/1.3 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".dvl-alert-recent .t{color:#7f9c8e;font:600 9px system-ui;flex:0 0 auto}",
      ".dvl-alert-linkbtn{background:none;border:0;color:#7f9c8e;font:700 9.5px system-ui;cursor:pointer;text-decoration:underline}",
      /* ── Telegram ── */
      ".dvl-tg-pill{font:800 8.5px/1 system-ui;border-radius:5px;padding:3px 7px;border:1px solid rgba(129,166,151,.28);color:#9fb6ab;background:rgba(129,166,151,.08)}",
      ".dvl-tg-pill.on{color:#13dc8d;background:rgba(19,220,141,.12);border-color:rgba(19,220,141,.30)}",
      ".dvl-tg-pill.warn{color:#e6c04a;background:rgba(230,192,74,.1);border-color:rgba(230,192,74,.28)}",
      ".dvl-tg-section.dvl-tg-flash{outline:2px solid rgba(53,224,255,.6);outline-offset:2px;transition:outline .3s}",
      ".dvl-tg-conn{margin:2px 0 8px}",
      ".dvl-tg-conn-line{color:#eafff4;font:800 12px system-ui}",
      ".dvl-tg-conn-sub{color:#8fb0a3;font:700 10px system-ui;margin-top:2px}",
      ".dvl-tg-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
      ".dvl-alert-mini-btn{border:1px solid rgba(129,166,151,.26);background:rgba(129,166,151,.08);color:#cfe0d8;font:750 10.5px system-ui;border-radius:8px;padding:6px 11px;cursor:pointer}",
      ".dvl-alert-mini-btn:active{background:rgba(129,166,151,.18)}",
      ".dvl-alert-mini-btn.danger{color:#ff8ea0;border-color:rgba(255,107,129,.3)}",
      ".dvl-tg-msg{color:#8fb0a3;font:650 10px/1.4 system-ui;margin-top:7px;min-height:0}",
      ".dvl-tg-msg.ok{color:#13dc8d}",
      ".dvl-tg-msg.err{color:#ff6b81}",
      ".dvl-switch.is-disabled{opacity:.4}",
      ".dvl-tg-chip{font:800 8px/1 system-ui;color:#3aa0ff;background:rgba(58,160,255,.14);border:1px solid rgba(58,160,255,.3);border-radius:4px;padding:2px 4px;flex:0 0 auto}"
    ].join("\n");
    (document.head||document.documentElement).appendChild(st);
  }
})();
