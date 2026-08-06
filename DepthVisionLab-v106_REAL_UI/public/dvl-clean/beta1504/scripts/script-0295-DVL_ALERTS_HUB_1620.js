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
    { id:"exhaustion_up",   label:"Exaustão de TOPO",  desc:"RSI em exaustão de alta (possível reversão p/ baixo)" },
    { id:"exhaustion_down", label:"Exaustão de FUNDO", desc:"RSI em exaustão de baixa (possível reversão p/ cima)" }
  ]});
  registerSource({ key:"liqbands", title:"Liquidity Bands", mark:"LB", signals:[
    { id:"grab_up",   label:"Buscou liquidez em CIMA (ask)", desc:"o candle varreu a banda superior e voltou" },
    { id:"grab_down", label:"Buscou liquidez em BAIXO (bid)", desc:"o candle varreu a banda inferior e voltou" }
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
      level: (r.level==null?null:Number(r.level)),
      tf: r.tf||"",
      symbol: r.symbol||"",
      cooldownSec: Number(r.cooldownSec)||30,
      toast: r.toast!==false,
      sound: r.sound!==false,
      once: !!r.once,
      enabled: r.enabled!==false,
      created: now(),
      lastFired: 0,
      fires: 0
    };
    rules.push(rule); saveRules(rules); return rule;
  }
  function updateRule(id, patch){ for(var i=0;i<rules.length;i++){ if(rules[i].id===id){ Object.assign(rules[i], patch||{}); saveRules(rules); return rules[i]; } } return null; }
  function deleteRule(id){ rules = rules.filter(function(r){ return r.id!==id; }); saveRules(rules); }

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
    var px = payload&&payload.price!=null ? (" · "+fmtPx(payload.price)) : "";
    return title+": "+label+px;
  }

  function fire(rule, payload){
    payload = payload||{};
    var dir = payload.dir || (rule.dir!=="any"?rule.dir:"");
    var msg = autoMessage(rule, payload);
    var sub = (payload.tf?("TF "+payload.tf):"") + (payload.symbol?("  "+shortSym(payload.symbol)):"");
    rule.lastFired = now(); rule.fires = (rule.fires||0)+1;
    if(rule.once) rule.enabled = false;
    saveRules(rules);
    logAdd({ msg:msg, ts:now(), tf:(payload.tf||rule.tf||""), sym:(payload.symbol||rule.symbol||""), kind:("alert:"+rule.source) });
    if(rule.toast) toast(msg, dir, sub.trim());
    if(rule.sound) beep(dir);
    bumpNavBadge();
    try{ window.dispatchEvent(new CustomEvent("dvl:alerts-fired",{detail:{rule:rule,payload:payload,message:msg}})); }catch(_){}
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
      // filtro de TF (se a regra fixou um TF e o payload traz TF)
      if(r.tf && payload.tf && String(r.tf)!==String(payload.tf)) continue;
      // filtro de símbolo (só quando ambos existem)
      if(r.symbol && payload.symbol && String(r.symbol).toUpperCase()!==String(payload.symbol).toUpperCase()) continue;
      // cooldown por regra
      if(r.lastFired && (t - r.lastFired) < (r.cooldownSec*1000)) continue;
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

    // avalia regras de preço
    for(var i=0;i<rules.length;i++){
      var r = rules[i];
      if(!r.enabled || r.source!=="price") continue;
      if(r.symbol && String(r.symbol).toUpperCase()!==sym) continue; // preço é por símbolo
      if(r.lastFired && (t - r.lastFired) < (r.cooldownSec*1000)) continue;

      if(r.signal==="cross_up" && r.level!=null && prevPrice!=null){
        if(prevPrice < r.level && p >= r.level) fire(r, {dir:"up", price:p, symbol:sym, tf:tf, message:"Preço cruzou ACIMA de "+fmtPx(r.level)+" ("+shortSym(sym)+")"});
      } else if(r.signal==="cross_down" && r.level!=null && prevPrice!=null){
        if(prevPrice > r.level && p <= r.level) fire(r, {dir:"down", price:p, symbol:sym, tf:tf, message:"Preço cruzou ABAIXO de "+fmtPx(r.level)+" ("+shortSym(sym)+")"});
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
    test: function(id){ var r=null; for(var i=0;i<rules.length;i++) if(rules[i].id===id) r=rules[i]; if(!r) return; fire(Object.assign({},r,{lastFired:0}), {tf:(r.tf||gtf()), symbol:(r.symbol||gsym()), message:"[TESTE] "+autoMessage(r,{})}); }
  };

  /* ══ UI: painel central ══════════════════════════════════════════════════ */
  injectCSS();
  var panel=null, draft={ source:"price", signal:"cross_up", dir:"any", level:"", tf:"", cooldownSec:30, toast:true, sound:true, once:false };

  function opt(v,label,cur){ return '<option value="'+esc(v)+'"'+(String(v)===String(cur)?" selected":"")+'>'+esc(label)+'</option>'; }
  function sourceOptions(cur){ return DVL_ALERTS.sources().map(function(s){ return opt(s.key, s.title, cur); }).join(""); }
  function signalOptions(srcKey, cur){ var s=SOURCES[srcKey]; if(!s) return ""; return s.signals.map(function(sg){ return opt(sg.id, sg.label, cur); }).join(""); }

  function currentSignalDef(){ return signalDef(draft.source, draft.signal); }

  function newRuleHTML(){
    var sg = currentSignalDef();
    var needsLevel = sg && sg.needsLevel;
    var hasDir = sg && sg.dirs;
    var levelLabel = (sg&&sg.levelLabel)||"Nível";
    var levelUnit = (sg&&sg.levelUnit)||"";
    var lvlPlace = draft.source==="price" && (draft.signal==="cross_up"||draft.signal==="cross_down") ? String(Math.round(gprice()||0)) : ((sg&&sg.levelDefault!=null)?String(sg.levelDefault):"");
    var h = '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Novo alerta</span></div>'
      + '<div class="dvl-vt-grid">'
      + '<div class="dvl-vt-field"><label>Indicador</label><select class="dvl-vt-select" data-al="source">'+sourceOptions(draft.source)+'</select></div>'
      + '<div class="dvl-vt-field"><label>Sinal</label><select class="dvl-vt-select" data-al="signal">'+signalOptions(draft.source, draft.signal)+'</select></div>';
    if(needsLevel){
      h += '<div class="dvl-vt-field"><label>'+esc(levelLabel)+(levelUnit?(" ("+esc(levelUnit)+")"):"")+'</label><input class="dvl-vt-input" type="number" step="any" data-al="level" value="'+esc(draft.level)+'" placeholder="'+esc(lvlPlace)+'"></div>';
    }
    if(hasDir){
      h += '<div class="dvl-vt-field"><label>Direção</label><select class="dvl-vt-select" data-al="dir">'+opt("any","Qualquer",draft.dir)+opt("up","Alta ▲",draft.dir)+opt("down","Baixa ▼",draft.dir)+'</select></div>';
    }
    h += '<div class="dvl-vt-field"><label>Timeframe</label><input class="dvl-vt-input" type="text" data-al="tf" value="'+esc(draft.tf)+'" placeholder="qualquer"></div>'
      + '<div class="dvl-vt-field"><label>Cooldown (s)</label><input class="dvl-vt-input" type="number" min="0" step="5" data-al="cooldownSec" value="'+esc(draft.cooldownSec)+'"></div>'
      + '<div class="dvl-vt-field"><label>Toast no gráfico</label><label class="dvl-switch"><input type="checkbox" data-al="toast"'+(draft.toast?" checked":"")+'><i></i><b></b></label></div>'
      + '<div class="dvl-vt-field"><label>Som</label><label class="dvl-switch"><input type="checkbox" data-al="sound"'+(draft.sound?" checked":"")+'><i></i><b></b></label></div>'
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
      var tfTag = r.tf ? '<span class="dvl-alert-tag tf">TF '+esc(r.tf)+'</span>' : '';
      var chans = (r.toast?"toast":"") + (r.sound?(r.toast?"+som":"som"):"");
      var meta = (r.fires?(r.fires+"× · "+ago(r.lastFired)):"nunca disparou") + (chans?(" · "+chans):"") + " · cd "+r.cooldownSec+"s";
      return '<div class="dvl-alert-row'+(r.enabled?"":" off")+'" data-id="'+r.id+'">'
        + '<label class="dvl-switch sm"><input type="checkbox" data-al-toggle'+(r.enabled?" checked":"")+'><i></i><b></b></label>'
        + '<div class="dvl-alert-row-main"><div class="dvl-alert-row-title">'+esc(title)+' · '+esc(label)+' '+dirTag+lvlTag+tfTag+'</div>'
        + '<div class="dvl-alert-row-meta">'+esc(meta)+'</div></div>'
        + '<button type="button" class="dvl-alert-mini" data-al-test title="Testar">▶</button>'
        + '<button type="button" class="dvl-alert-mini del" data-al-del title="Excluir">×</button>'
        + '</div>';
    }).join("");
    var on = rules.filter(function(r){return r.enabled;}).length;
    return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Meus alertas</span><span class="dvl-alert-count">'+on+'/'+rules.length+'</span></div>'+rowsArr+'</div>';
  }

  function recentHTML(){
    var list=[]; try{ if(window.DVL_ALERTS_LOG) list=window.DVL_ALERTS_LOG.list()||[]; }catch(_){}
    list = list.slice().reverse().slice(0,8);
    if(!list.length) return '';
    var rows = list.map(function(e){
      var c = /COMPRA|compra|ACIMA|alta|\+/.test(e.msg)?"#13dc8d":/VENDA|venda|ABAIXO|baixa/.test(e.msg)?"#ff6b81":"#9fb6ab";
      return '<div class="dvl-alert-recent"><span class="dot" style="background:'+c+'"></span><span class="txt">'+esc(e.msg)+'</span><span class="t">'+ago(e.ts)+'</span></div>';
    }).join("");
    return '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Recentes</span><button type="button" class="dvl-alert-linkbtn" data-al-clear>limpar</button></div>'+rows+'</div>';
  }

  function renderBody(){
    if(!panel) return; var b=panel.querySelector("#dvlAlertsBody"); if(!b) return;
    b.innerHTML = newRuleHTML() + rulesHTML() + recentHTML();
    bindBody(b);
  }

  function bindBody(b){
    b.querySelectorAll("[data-al]").forEach(function(el){
      var key=el.getAttribute("data-al");
      var evt = (el.tagName==="SELECT"||el.type==="checkbox") ? "change" : "input";
      el.addEventListener(evt, function(){
        if(el.type==="checkbox") draft[key]=el.checked; else draft[key]=el.value;
        if(key==="source"){ var s=SOURCES[draft.source]; draft.signal = s&&s.signals[0]?s.signals[0].id:""; draft.level=""; renderBody(); }
        else if(key==="signal"){ draft.level=""; renderBody(); }
      });
    });
    var add=b.querySelector("[data-al-add]");
    if(add) add.addEventListener("click", function(){
      var sg=currentSignalDef();
      if(sg&&sg.needsLevel && (draft.level===""||draft.level==null||!Number.isFinite(Number(draft.level)))){
        if(draft.source==="price" && (draft.signal==="cross_up"||draft.signal==="cross_down")){ var gp=gprice(); if(gp!=null) draft.level=String(Math.round(gp)); }
        if(draft.level===""||draft.level==null||!Number.isFinite(Number(draft.level))){ flash(add,"informe o nível"); return; }
      }
      addRule({
        source:draft.source, signal:draft.signal, dir:draft.dir,
        level:(sg&&sg.needsLevel)?Number(draft.level):null,
        tf:draft.tf, cooldownSec:Number(draft.cooldownSec)||0,
        toast:draft.toast, sound:draft.sound, once:draft.once,
        symbol:(draft.source==="price")?gsym():""
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
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderBody(); var b=document.getElementById("dvlAlertsNavBadge1620"); if(b) b.style.display="none"; }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }
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
      ".dvl-alert-linkbtn{background:none;border:0;color:#7f9c8e;font:700 9.5px system-ui;cursor:pointer;text-decoration:underline}"
    ].join("\n");
    (document.head||document.documentElement).appendChild(st);
  }
})();
