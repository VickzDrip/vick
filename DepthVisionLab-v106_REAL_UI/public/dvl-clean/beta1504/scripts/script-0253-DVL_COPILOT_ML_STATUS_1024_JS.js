(function(){"use strict";if(window.DVL_COPILOT_ML_STATUS_1024)return;

function page(){return document.getElementById("dvlCopilotPage0974");}
function copilotOpen1207(){var g=window.DVL_PANEL_ACTIVITY_1207;return g?g.copilotOpen():(!document.hidden&&!!document.querySelector("#dvlCopilotPage0974.is-open"));}
function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}

var BLOCK_LABELS={
  spikeAboveAvg:"Spike acima da média",
  rsiOversold:"RSI sobrevenda",
  oiAboveAvg:"OI acima da média",
  lsrBelowAvg:"LSR abaixo da média",
  flatVolumeBar:"Flat volume bar",
  prevVolBelowHalf:"Pré-volume baixo"
};
var BLOCK_ORDER=["spikeAboveAvg","rsiOversold","oiAboveAvg","lsrBelowAvg","flatVolumeBar","prevVolBelowHalf"];

/* Friendly labels for the 12 continuous features (train.js's CONT_KEYS) —
   only used to name a decision-tree rule's condition, never an exact
   value (they're normalized to roughly [-1,1]/[0,1] server-side, so a
   raw number like "-0.05" means nothing to a human; "alto"/"baixo" off
   the split direction is what's actually readable). */
var CONT_LABELS={
  spike20n:"Spike vs MA(20)", spike50n:"Spike vs MA(50)", rsi14n:"RSI (valor exato)",
  volBelowMaBarsN:"Barras de volume abaixo da média", barPctN:"Variação do candle",
  flatCandlesN:"Candles flat seguidos", oiRatioN:"Distância do OI da média",
  lsrRatioN:"Distância do LSR da média", crossStrengthN:"Força do cruzamento de volume",
  oiSlopeN:"Tendência do OI", lsrSlopeN:"Tendência do LSR", rsiRecoveryN:"Recuperação do RSI (V)",
  netLongRatioN:"Net Long vs média", netShortRatioN:"Net Short vs média",
  netDeltaRatioN:"Net Delta vs média", netDeltaSlopeN:"Tendência do Net Delta"
};
function featureLabel(name){
  if(BLOCK_LABELS[name]) return BLOCK_LABELS[name];
  if(CONT_LABELS[name]) return CONT_LABELS[name];
  if(name && name.indexOf("__")>=0){
    var parts=name.split("__");
    return (BLOCK_LABELS[parts[0]]||parts[0])+" + "+(BLOCK_LABELS[parts[1]]||parts[1]);
  }
  return name;
}
/* A tree condition is either on a strictly-boolean feature (block or
   pair, always 0 or 1 — "right" of the 0.5 split literally means true)
   or a continuous one (no clean true/false, just relatively high/low). */
function conditionText(c){
  var isBoolLike=!!BLOCK_LABELS[c.name]||(c.name&&c.name.indexOf("__")>=0);
  var label=featureLabel(c.name);
  if(isBoolLike) return c.dir==="right" ? label : ("não "+label);
  return label+(c.dir==="right"?" alto":" baixo");
}

var _lastHealth=null, _lastErr=false;

function fmtAgo(ts){
  if(!ts) return "—";
  var d=Math.max(0,Date.now()-Number(ts)), h=Math.floor(d/3600000), m=Math.floor(d/60000)%60;
  if(h<1) return m+"min atrás";
  if(h<24) return h+"h atrás";
  return Math.floor(h/24)+"d atrás";
}

/* LONG-only (backend src/train.js) — SHORT was removed entirely, not just
   left untrained: the 6 blocks (RSI sobrevenda, OI subindo, LSR caindo,
   ...) all encode a bullish thesis, a SHORT signal was never a real short
   setup ("the last candle closed red" scored against that same bullish
   checklist), and the financial backtest confirmed it lost money on
   average. `side` stays a parameter (not hardcoded "LONG" inline) only
   because this function itself is otherwise generic. */
function sideBlockHtml(side, model){
  model = model || { trained:false, samples:0, needed:200 };
  var titleCls = "dvlCp1024SideTitle";
  var out = '<div class="dvlCp1024Side"><div class="'+titleCls+'">'+esc(side)+'</div>';
  if(!model.trained){
    var have=Number(model.samples||0), need=Number(model.needed||200);
    var pct=Math.max(2,Math.min(100,Math.round(have/Math.max(1,need)*100)));
    out+='<div class="dvlCp1024Bar"><div class="dvlCp1024BarFill" style="width:'+pct+'%"></div></div>';
    out+='<div class="dvlCp1024Stat"><span>Treino automático</span><b>'+have+'/'+need+' amostras</b></div>';
  } else {
    out+='<div class="dvlCp1024Stat"><span>Modelo treinado com</span><b>'+esc(model.samples)+' amostras</b></div>';
    out+='<div class="dvlCp1024Stat"><span>Acurácia real (dados nunca vistos)</span><b>'+Math.round((model.testAccuracy!=null?model.testAccuracy:model.accuracy||0)*100)+'%</b></div>';
    if(model.trainAccuracy!=null) out+='<div class="dvlCp1024Stat"><span>Acurácia no treino (referência)</span><b>'+Math.round(model.trainAccuracy*100)+'%</b></div>';
    out+='<div class="dvlCp1024Stat"><span>Última atualização</span><b>'+esc(fmtAgo(model.trainedAt))+'</b></div>';
    out+='<div class="dvlCp1024Weights">'+BLOCK_ORDER.map(function(k){
      var w=Number((model.weights||{})[k]||0), pctW=Math.max(0,Math.min(100,Math.round(w/40*100)));
      return '<div class="dvlCp1024WRow"><span>'+esc(BLOCK_LABELS[k])+'</span><div class="dvlCp1024WBar"><i style="width:'+pctW+'%"></i></div><b style="text-align:right">'+w+'</b></div>';
    }).join("")+'</div>';

    /* Combos: pairWeights are what let the model learn "these two blocks
       together predict a lot better than either alone" — a plain additive
       score can't represent that, see train.js's doc-comment. Only the
       top few with a real (>0) weight are worth showing; if none stood
       out, say so instead of listing 15 rows of zero. */
    var pairs=(Array.isArray(model.pairWeights)?model.pairWeights:[]).filter(function(p){ return Number(p.weight)>0; }).slice(0,5);
    out+='<div class="dvlCp1024ComboTitle">Combinações que mais pesam</div>';
    if(!pairs.length){
      out+='<div class="dvlCp1024ComboEmpty">Nenhuma combinação de 2 blocos se destacou sozinha ainda — os pesos acima (blocos isolados) seguem sendo o principal.</div>';
    }else{
      out+='<div class="dvlCp1024Weights">'+pairs.map(function(p){
        var pctW=Math.max(0,Math.min(100,Math.round(Number(p.weight)/40*100)));
        var label=(BLOCK_LABELS[p.a]||p.a)+' + '+(BLOCK_LABELS[p.b]||p.b);
        return '<div class="dvlCp1024WRow"><span>'+esc(label)+'</span><div class="dvlCp1024WBar"><i style="width:'+pctW+'%"></i></div><b style="text-align:right">'+p.weight+'</b></div>';
      }).join("")+'</div>';
    }

    /* Árvore de decisão: trained on the exact same data/split as the
       logistic model above (train.js's trainSide), but a tree can chain
       an arbitrary number of conditions per rule — not just 2 blocks at
       a time like pairWeights — so it can surface combos nobody had to
       name in advance. bestModel says, informationally, which of the two
       actually tests better; nothing switches live scoring based on it. */
    var t=model.tree;
    if(t){
      var treeWon=model.bestModel==="tree";
      out+='<div class="dvlCp1024ComboTitle">Árvore de decisão'+(treeWon?' <span class="dvlCp1024Winner">(venceu a regressão)</span>':'')+'</div>';
      out+='<div class="dvlCp1024Stat"><span>Acurácia real (árvore)</span><b>'+Math.round((t.testAccuracy||0)*100)+'%</b></div>';
      var rules=(Array.isArray(t.rules)?t.rules:[]).slice(0,3);
      if(!rules.length){
        out+='<div class="dvlCp1024ComboEmpty">A árvore não achou uma regra forte ainda.</div>';
      }else{
        out+='<div class="dvlCp1024Rules">'+rules.map(function(r){
          var txt=(r.conditions||[]).map(conditionText).join(" + ");
          return '<div class="dvlCp1024RuleRow">'+esc(txt)+' → <b>'+Math.round((r.prob||0)*100)+'%</b> favorável <span>('+esc(r.n)+' casos)</span></div>';
        }).join("")+'</div>';
      }
    }
  }
  out+='</div>';
  return out;
}

function bodyHtml(){
  if(_lastErr || !_lastHealth){
    return '<div class="dvlCp1024Body">Backend do scanner não respondeu agora. O registro de dados continua rodando no servidor mesmo assim — isso aqui é só a leitura, não afeta o funcionamento.</div>';
  }
  var emptyModel={trained:false,samples:0,needed:200};
  var oc=_lastHealth.outcomes||{pending:0,resolved:0,model:{LONG:emptyModel}};
  var models=oc.model||{};
  var out='<div class="dvlCp1024Body">';
  out+='<div class="dvlCp1024Stat"><span>Sinais em aberto (monitorando alvo/stop)</span><b>'+esc(oc.pending||0)+'</b></div>';
  out+='<div class="dvlCp1024Stat"><span>Amostras resolvidas</span><b>'+esc(oc.resolved||0)+'</b></div>';
  out+=sideBlockHtml("LONG", models.LONG);
  out+='<div class="dvlCp1024Foot">Modelo híbrido: aprende dos valores exatos por trás de cada bloquinho (RSI, força do OI/LSR, volume), não só sim/não — os pesos acima são a versão simplificada pra leitura. A acurácia real é medida em amostras que o modelo nunca viu no treino. Ainda <b>não substitui</b> o score do Scanner, que continua sendo o que você ajusta na mão em Filtros. SHORT foi removido do sistema (Scanner, ML e Bot Demo): os 6 bloquinhos só validam um setup de compra, e o backtest confirmou que SHORT vinha perdendo dinheiro.</div>';
  out+='</div>';
  return out;
}

function html(){
  return '<section class="dvlCp0976Panel dvlCp1024MlPanel" data-dvl-cp-section="ml-status" data-dvl-cp-section-version="1024">'
    +'<div class="dvlCp1024Head"><i class="dvlCp1024Icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4.2"/></svg></i>'
    +'<div class="dvlCp1024Title"><b>Aprendizado (ML)</b><span>Score aprendendo com os resultados reais do scanner</span></div></div>'
    +bodyHtml()
    +'</section>';
}

function render(){
  var p=page();
  if(!p) return false;
  var panel=p.querySelector("[data-dvl-cp-section='ml-status'][data-dvl-cp-section-version='1024']");
  if(!panel){
    var bot=p.querySelector("[data-dvl-cp-section='bot-soon']");
    var chat=p.querySelector("[data-dvl-cp-section='ai-chat']");
    var decision=p.querySelector("[data-dvl-cp-section='decision']");
    if(bot) bot.insertAdjacentHTML("beforebegin", html());
    else if(chat) chat.insertAdjacentHTML("afterend", html());
    else if(decision) decision.insertAdjacentHTML("afterend", html());
    else p.insertAdjacentHTML("beforeend", html());
    panel=p.querySelector("[data-dvl-cp-section='ml-status'][data-dvl-cp-section-version='1024']");
  } else {
    var body=panel.querySelector(".dvlCp1024Body");
    if(body) body.outerHTML=bodyHtml();
  }
  return !!panel;
}

var _timer=null,_fetching=false;
function fetchHealth(){
  if(!copilotOpen1207()||_fetching) return Promise.resolve(null);
  _fetching=true;
  return fetch("/api/dvl/scanner/health",{cache:"no-store"})
    .then(function(r){ if(!r.ok) throw new Error("health "+r.status); return r.json(); })
    .then(function(j){ _lastHealth=j; _lastErr=false; render(); return j; })
    .catch(function(){ _lastErr=true; render(); return null; })
    .finally(function(){_fetching=false;});
}
function syncTimer1207(){
  if(copilotOpen1207()){
    render(); fetchHealth();
    if(!_timer) _timer=setInterval(fetchHealth,30000);
  }else if(_timer){ clearInterval(_timer); _timer=null; }
}
function boot(){
  render();
  [300,900,1500,2500,4000,6000,9000].forEach(function(ms){ setTimeout(function(){if(copilotOpen1207())render();},ms); });
  window.addEventListener("dvl:copilot-state-change",function(){setTimeout(syncTimer1207,0);},true);
  document.addEventListener("visibilitychange",syncTimer1207,true);
  syncTimer1207();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();

window.DVL_COPILOT_ML_STATUS_1024={
  version:"1.024", render:render, fetchHealth:fetchHealth,
  audit:function(){ var p=page(), panel=p?p.querySelector("[data-dvl-cp-section='ml-status']"):null; return {version:"1.024", panelFound:!!panel, lastHealth:_lastHealth, lastErr:_lastErr}; }
};
})();
