/* DVL Smart Delta — Tabela Institucional com Tempo no Estado (Beta 1.251).
   Rastreia, por módulo (Smart Delta / Net Delta / Net Long / Net Short / OI / LSR),
   há quanto tempo o valor está ACIMA/ABAIXO da própria média e há quanto tempo a
   tendência atual está ativa. NÃO recalcula nada dos motores — só consome os
   estados/valores dos osciladores já existentes (.cache.data) e do Smart Delta
   (getSnapshot/series). Histerese (banda neutra) + confirmação por candle (ou
   intrabar) evitam reset falso. Persiste por símbolo|timeframe. Um ticker central
   único atualiza tudo. */
(function(){
  "use strict";
  if(window.DVL_SMART_DELTA_STATE) return;
  var STOR="dvl_sd_state_v1", CFG_STOR="dvl_sd_table_cfg_v1";
  var MODS=[
    {k:"netDelta", label:"Net Delta", osc:"DVLNetDeltaOscillator",      fmt:"big",   field:"netDelta"},
    {k:"netLong",  label:"Net Long",  osc:"DVLNetLongOscillator",       fmt:"big",   field:"netLong"},
    {k:"netShort", label:"Net Short", osc:"DVLNetShortOscillator",      fmt:"big",   field:"netShort"},
    {k:"oi",       label:"OI",        osc:"DVLOpenInterestOscillator",  fmt:"big",   field:"close"},
    {k:"lsr",      label:"LSR",       osc:"DVLLongShortOscillator",     fmt:"ratio", field:"ratio"}
  ];
  var cfg={ confirm:"close", tolPct:0.15, maLen:20, durMode:"both", showTime:true, showCandles:true, showDist:true, mode:"detailed",
            modules:{netDelta:true,netLong:true,netShort:true,oi:true,lsr:true} };
  try{ Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_STOR)||"{}")); }catch(_){}
  function saveCfg(){ try{ localStorage.setItem(CFG_STOR, JSON.stringify(cfg)); }catch(_){} }

  var states={};
  try{ states=JSON.parse(localStorage.getItem(STOR)||"{}")||{}; }catch(_){ states={}; }
  var saveT=0;
  function saveStates(){ var now=Date.now(); if(now-saveT<1500) return; saveT=now; try{ localStorage.setItem(STOR, JSON.stringify(states)); }catch(_){} }

  function sym(){ try{ return String((typeof symbol!=="undefined"&&symbol)||"").toUpperCase(); }catch(_){ return ""; } }
  function tf(){ try{ return String((typeof interval!=="undefined"&&interval)||""); }catch(_){ return ""; } }
  function candleTime(){ try{ if(typeof klines!=="undefined"&&klines&&klines.length) return +klines[klines.length-1].time; }catch(_){} return 0; }
  function sma(arr,n){ if(!arr||!arr.length) return null; var m=Math.min(n,arr.length),s=0,c=0; for(var i=arr.length-m;i<arr.length;i++){ var v=+arr[i]; if(isFinite(v)){s+=v;c++;} } return c?s/c:null; }

  /* Cada oscilador guarda o valor num campo próprio (netDelta/netLong/netShort no
     Net*, close no OI, ratio no Long/Short) — NÃO num campo genérico "value". Lê o
     campo do módulo com fallback pros nomes usados pelos motores existentes. */
  function readVal(x, field){
    if(x==null) return NaN;
    if(typeof x==="number") return x;
    var cand=[field,"value","usd","ratio","close","v","longShortRatio"];
    for(var j=0;j<cand.length;j++){ if(cand[j]==null) continue; var v=+x[cand[j]]; if(isFinite(v)) return v; }
    return NaN;
  }
  /* Faz o motor buscar seus dados MESMO desligado (via método prime, adicionado aos
     osciladores). Já tem dados frescos? não repete. O motor tem throttle de 45s no
     sucesso; aqui limitamos a 1 tentativa/8s por módulo pra não floodar rede se a
     busca falhar em sequência (ex.: offline). */
  var _primeAt={};
  function primeModule(m){
    try{
      var osc=window[m.osc]; if(!osc||typeof osc.prime!=="function") return;
      var c=osc.cache, fresh=!!(c&&Array.isArray(c.data)&&c.data.length&&c.ts&&(Date.now()-c.ts<45000));
      if(fresh) return;
      var now=Date.now(), last=_primeAt[m.osc]||0; if(now-last<8000) return; _primeAt[m.osc]=now;
      osc.prime();
    }catch(_){}
  }
  function readModule(m){
    try{
      var osc=window[m.osc]; var d=osc&&osc.cache&&osc.cache.data; if(!d||!d.length) return null;
      var vals=[]; for(var i=0;i<d.length;i++){ var v=readVal(d[i], m.field); if(isFinite(v)) vals.push(v); }
      if(!vals.length) return null;
      return {value:vals[vals.length-1], series:vals};
    }catch(_){ return null; }
  }
  function relation(val,avg,tol){ if(val==null||avg==null||!isFinite(val)||!isFinite(avg)) return "neutral"; var band=Math.abs(avg)*(tol/100)||0; if(val>avg+band) return "above"; if(val<avg-band) return "below"; return "neutral"; }
  function trendOf(series){ if(!series||series.length<6) return "stable"; var n=series.length,recent=(series[n-1]+series[n-2]+series[n-3])/3,older=(series[n-4]+series[n-5]+series[n-6])/3; var r=(recent-older)/Math.max(1e-9,Math.abs(older)); if(r>0.001) return "rising"; if(r<-0.001) return "falling"; return "stable"; }

  var lastGlobalCandle=0;
  function tick(){
    var s=sym(),t=tf(),ct=candleTime(),now=Date.now();
    if(!s||!t) return;
    /* garante que os motores tenham dados mesmo sem o indicador ligado no gráfico —
       assim a tabela institucional aparece sem precisar ligar OI/LSR/Net* na mão.
       OI primeiro: Net Delta/Long/Short derivam do OI já buscado. */
    primeModule({osc:"DVLOpenInterestOscillator"});
    for(var pi=0;pi<MODS.length;pi++){ if(MODS[pi].k!=="oi" && cfg.modules[MODS[pi].k]!==false) primeModule(MODS[pi]); }
    var newCandle = !!(ct && ct!==lastGlobalCandle); if(ct) lastGlobalCandle=ct;
    for(var i=0;i<MODS.length;i++){
      var m=MODS[i]; var rd=readModule(m); if(!rd||rd.value==null) continue;
      var avg=sma(rd.series,cfg.maLen); if(avg==null) avg=rd.value;
      var key=s+"|"+t+"|"+m.k;
      var raw=relation(rd.value,avg,cfg.tolPct), tr=trendOf(rd.series);
      var st=states[key];
      if(!st){
        /* estado NOVO (nunca visto este símbolo|TF) — semeia já com o estado atual
           em vez de "neutro" até o 1º candle fechar, senão a tabela mostra "Média"
           logo após carregar mesmo com valor claramente acima/abaixo da média.
           Estados persistidos (reload) NÃO são semeados: mantêm a duração acumulada. */
        st={relation:"neutral",stateSince:now,stateBars:0,trend:"stable",trendSince:now,trendBars:0,value:rd.value,avg:avg};
        states[key]=st;
        if(raw!=="neutral"){ st.relation=raw; st.stateSince=now; st.stateBars=1; }
        if(tr!=="stable"){ st.trend=tr; st.trendSince=now; st.trendBars=1; }
      }
      var confirm=(cfg.confirm==="intrabar")||newCandle;
      if(confirm){
        var rc = raw!=="neutral"?raw:st.relation;   // dentro da banda neutra mantém o último estado confirmado
        if(rc!==st.relation && rc!=="neutral"){ st.relation=rc; st.stateSince=now; st.stateBars=1; }
        else if(newCandle){ st.stateBars=(st.stateBars||0)+1; }
        if(tr!==st.trend && tr!=="stable"){ st.trend=tr; st.trendSince=now; st.trendBars=1; }
        else if(newCandle){ st.trendBars=(st.trendBars||0)+1; }
      }
      st.value=rd.value; st.avg=avg;
    }
    saveStates();
    try{ window.dispatchEvent(new CustomEvent("dvl:sd-state")); }catch(_){}
  }
  setInterval(tick,1000);
  try{ window.addEventListener("dvl:smart-delta",tick,{passive:true}); }catch(_){}

  function snapshot(k){ var st=states[sym()+"|"+tf()+"|"+k]; if(!st) return null; var now=Date.now();
    return { module:k, value:st.value, average:st.avg, relationToAverage:st.relation,
      stateSince:st.stateSince, stateBars:st.stateBars||0, stateMs:now-(st.stateSince||now),
      trend:st.trend, trendSince:st.trendSince, trendBars:st.trendBars||0, trendMs:now-(st.trendSince||now),
      distanceFromAveragePercent:(st.avg?((st.value-st.avg)/Math.abs(st.avg)*100):0) }; }
  function getAll(){ var o={}; for(var i=0;i<MODS.length;i++) o[MODS[i].k]=snapshot(MODS[i].k); return o; }

  function fmtDur(ms){ ms=Math.max(0,ms||0); var s=Math.floor(ms/1000); if(s<60) return s+"s"; var mn=Math.floor(s/60); if(mn<60) return mn+"m"; var h=Math.floor(mn/60); if(h<24) return h+"h "+(mn%60)+"m"; var d=Math.floor(h/24); return d+"d "+(h%24)+"h"; }
  function fmtDuration(sn){ var p=[]; if(cfg.durMode!=="time" && cfg.showCandles) p.push((sn.stateBars||0)+"c"); if(cfg.durMode!=="candles" && cfg.showTime) p.push(fmtDur(sn.stateMs)); return p.join(" / "); }
  function fmtBig(v){ v=+v; if(!isFinite(v)) return "--"; var a=Math.abs(v),sg=v<0?"-":""; if(a>=1e9) return sg+(a/1e9).toFixed(2)+"B"; if(a>=1e6) return sg+(a/1e6).toFixed(2)+"M"; if(a>=1e3) return sg+(a/1e3).toFixed(2)+"K"; return sg+a.toFixed(2); }
  function fmtVal(m,sn){ if(m.fmt==="big") return fmtBig(sn.value); if(m.fmt==="ratio") return (+sn.value).toFixed(2); return (sn.value>0?"+":"")+Math.round(sn.value); }

  /* ── Beta 1.258 — CONTEXTO TEMPORAL P/ COPILOT / ALERTS (§13) ─────────────
     Expõe a confluência institucional já calculada (sem recalcular): cada módulo
     com estado, há quanto tempo, tendência; ordenada por duração (o que está ativo
     há mais tempo primeiro); + um viés compra/venda e uma narrativa em texto que o
     Copilot usa pra EXPLICAR a ordem temporal da confluência. */
  var _relWord={above:"acima",below:"abaixo",neutral:"na média"};
  function getConfluence(){
    var out={ symbol:sym(), tf:tf(), modules:[], biasScore:0, bias:"neutro", narrative:"" };
    var all=getAll();
    for(var i=0;i<MODS.length;i++){
      var m=MODS[i]; if(cfg.modules && cfg.modules[m.k]===false) continue;
      var sn=all[m.k]; if(!sn||sn.value==null) continue;
      out.modules.push({ key:m.k, label:m.label, relation:sn.relationToAverage, stateMs:sn.stateMs, stateBars:sn.stateBars,
        trend:sn.trend, trendMs:sn.trendMs, distancePct:sn.distanceFromAveragePercent, value:sn.value, average:sn.average });
    }
    /* ordena por há mais tempo no estado (só quem não está neutro conta na ordem) */
    out.modules.sort(function(a,b){
      var an=a.relation==="neutral"?-1:(a.stateMs||0), bn=b.relation==="neutral"?-1:(b.stateMs||0);
      return bn-an;
    });
    /* viés simples: delta/long acima = compra; short acima = venda */
    function lean(k,rel){ if(rel==="neutral") return 0; var s=rel==="above"?1:-1;
      if(k==="netShort") return -s; return (k==="netDelta"||k==="netLong")?s:0; }
    for(var j=0;j<out.modules.length;j++){ out.biasScore += lean(out.modules[j].key,out.modules[j].relation); }
    out.bias = out.biasScore>0?"compra":(out.biasScore<0?"venda":"neutro");
    var parts=out.modules.map(function(mm){
      var w=_relWord[mm.relation]||"na média";
      return mm.label+" "+w+(mm.relation!=="neutral"?" há "+fmtDur(mm.stateMs):"");
    });
    out.narrative = parts.length ? parts.join(" · ") : "";
    return out;
  }
  /* narrativa curta pronta pro Copilot/Alerts explicarem sem recalcular */
  function narrative(){ var c=getConfluence(); if(!c.modules.length) return "";
    var viés = c.bias==="neutro" ? "sem viés institucional dominante" : ("viés institucional de "+c.bias);
    return c.narrative + " — " + viés + "."; }

  window.DVL_SMART_DELTA_STATE={ MODS:MODS, getSnapshot:snapshot, getAll:getAll, getConfluence:getConfluence, narrative:narrative, cfg:function(){return cfg;}, setCfg:function(o){ Object.assign(cfg,o||{}); saveCfg(); }, saveCfg:saveCfg, fmtDur:fmtDur, fmtDuration:fmtDuration, fmtVal:fmtVal, fmtBig:fmtBig, tick:tick, reset:function(){ states={}; try{ localStorage.removeItem(STOR); }catch(_){} } };
})();
