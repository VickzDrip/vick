/* Backtest financeiro — complementa a acurácia do card "Aprendizado (ML)"
   (aquele mede só "acertou a direção?"; este mede "quanto teria rendido?").
   Lê GET /api/dvl/scanner/backtest (src/backtest.js no backend), que refaz
   o MESMO split temporal treino/teste do trainSide() e compara, no
   conjunto de teste (nunca visto no treino), 3 grupos: negociar TODO sinal,
   negociar só o que a regressão logística chamou de favorável, e só o que
   a árvore de decisão chamou de favorável — taxa de acerto e retorno
   médio/total de cada um, lado a lado. Só leitura: não abre posição
   nenhuma, não afeta o score do Scanner nem o Bot Demo. */
(function(){"use strict";if(window.DVL_COPILOT_BACKTEST_1040)return;

function page(){return document.getElementById("dvlCopilotPage0974");}
function copilotOpen1207(){var g=window.DVL_PANEL_ACTIVITY_1207;return g?g.copilotOpen():(!document.hidden&&!!document.querySelector("#dvlCopilotPage0974.is-open"));}
function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
function fmtPct(v){ v=Number(v)||0; return (v>=0?"+":"")+v.toFixed(2)+"%"; }

var BUCKET_LABELS={
  allSignals:"Todo sinal (sem filtro do modelo)",
  logisticModel:"Só o que a regressão chamou de favorável",
  treeModel:"Só o que a árvore de decisão chamou de favorável"
};
var BUCKET_ORDER=["allSignals","logisticModel","treeModel"];

var _last=null, _lastErr=false;

function bucketRowHtml(key, stats){
  var s=stats || {count:0,winRate:0,avgReturnPct:0,totalReturnPct:0};
  var cls=(Number(s.avgReturnPct)||0) >= 0 ? "pos" : "neg";
  var barPct=Math.max(0,Math.min(100,Math.round(Math.abs(Number(s.avgReturnPct)||0)/2*100)));
  return '<div class="dvlBt1040Row">'
    +'<div class="dvlBt1040RowLabel">'+esc(BUCKET_LABELS[key]||key)+'</div>'
    +'<div class="dvlBt1040RowStats">'
      +'<span>'+esc(s.count)+' sinais</span>'
      +'<span>'+Math.round((s.winRate||0)*100)+'% acerto</span>'
      +'<b class="'+cls+'">'+fmtPct(s.avgReturnPct)+' médio</b>'
      +'<span>'+fmtPct(s.totalReturnPct)+' total</span>'
    +'</div>'
    +'<div class="dvlBt1040ReturnBar"><i class="'+cls+'" style="width:'+barPct+'%"></i></div>'
    +'</div>';
}

/* LONG-only (same reasoning as the ML card: SHORT was removed from
   training entirely, not just left unready — see train.js's doc-comment). */
function sideBacktestHtml(side, result){
  result = result || {ready:false, samples:0, needed:300};
  var titleCls = "dvlBt1040SideTitle";
  var out='<div class="dvlBt1040Side"><div class="'+titleCls+'">'+esc(side)+'</div>';
  if(!result.ready){
    var have=Number(result.samples||0), need=Number(result.needed||300);
    var pct=Math.max(2,Math.min(100,Math.round(have/Math.max(1,need)*100)));
    out+='<div class="dvlBt1040Bar"><div class="dvlBt1040BarFill" style="width:'+pct+'%"></div></div>';
    out+='<div class="dvlBt1040Stat"><span>Aguardando amostras suficientes</span><b>'+have+'/'+need+'</b></div>';
  }else{
    out+='<div class="dvlBt1040Stat"><span>Testado em (nunca visto no treino)</span><b>'+esc(result.testSamples)+' sinais</b></div>';
    out+='<div class="dvlBt1040Compare">'+BUCKET_ORDER.map(function(k){ return bucketRowHtml(k, result[k]); }).join("")+'</div>';
  }
  out+='</div>';
  return out;
}

function bodyHtml(){
  if(_lastErr || !_last){
    return '<div class="dvlBt1040Body">Backend do scanner não respondeu agora. Isso aqui é só leitura — não afeta o Scanner nem o Bot Demo.</div>';
  }
  var out='<div class="dvlBt1040Body">';
  out+='<div class="dvlBt1040Note">Diferente da acurácia do card "Aprendizado (ML)" (que só mede se acertou a direção), isto mede quanto cada abordagem teria RENDIDO — mesmo conjunto de teste, nunca usado pra treinar, sem olhar o futuro.</div>';
  out+=sideBacktestHtml("LONG", _last.LONG);
  out+='<div class="dvlBt1040Foot">Retorno já ajustado pro lado do sinal (favorável = positivo). Ainda <b>não substitui</b> o score do Scanner nem abre posição nenhuma — só compara, pra você decidir se vale ligar "Pesos aprendido" em Filtros. SHORT foi removido (Scanner, ML e Bot Demo): o backtest confirmou que vinha perdendo dinheiro.</div>';
  out+='</div>';
  return out;
}

function html(){
  return '<section class="dvlCp0976Panel dvlBt1040Panel" data-dvl-cp-section="backtest" data-dvl-cp-section-version="1040">'
    +'<div class="dvlBt1040Head"><i class="dvlBt1040Icon">📈</i>'
    +'<div class="dvlBt1040HeadTitle"><b>Backtest financeiro</b><span>Não é só acerto — quanto teria rendido</span></div></div>'
    +bodyHtml()
    +'</section>';
}

function render(){
  var p=page();
  if(!p) return false;
  var panel=p.querySelector("[data-dvl-cp-section='backtest'][data-dvl-cp-section-version='1040']");
  if(!panel){
    var botDemo=p.querySelector("[data-dvl-cp-section='bot-demo']");
    var mlStatus=p.querySelector("[data-dvl-cp-section='ml-status']");
    var bot=p.querySelector("[data-dvl-cp-section='bot-soon']");
    var chat=p.querySelector("[data-dvl-cp-section='ai-chat']");
    if(botDemo) botDemo.insertAdjacentHTML("afterend", html());
    else if(mlStatus) mlStatus.insertAdjacentHTML("afterend", html());
    else if(bot) bot.insertAdjacentHTML("beforebegin", html());
    else if(chat) chat.insertAdjacentHTML("afterend", html());
    else p.insertAdjacentHTML("beforeend", html());
    panel=p.querySelector("[data-dvl-cp-section='backtest'][data-dvl-cp-section-version='1040']");
  }else{
    var body=panel.querySelector(".dvlBt1040Body");
    if(body) body.outerHTML=bodyHtml();
  }
  return !!panel;
}

var _timer=null,_fetching1207=false;
function fetchBacktest(){
  if(!copilotOpen1207()||_fetching1207) return Promise.resolve(null);
  _fetching1207=true;
  return fetch("/api/dvl/scanner/backtest",{cache:"no-store"})
    .then(function(r){ if(!r.ok) throw new Error("backtest "+r.status); return r.json(); })
    .then(function(j){ _last=j; _lastErr=false; render(); return j; })
    .catch(function(){ _lastErr=true; render(); return null; })
    .finally(function(){_fetching1207=false;});
}
function syncTimer1207(){
  if(copilotOpen1207()){
    render(); fetchBacktest();
    if(!_timer) _timer=setInterval(fetchBacktest,60000);
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

window.DVL_COPILOT_BACKTEST_1040={
  version:"1.040", render:render, fetchBacktest:fetchBacktest,
  audit:function(){ var p=page(), panel=p?p.querySelector("[data-dvl-cp-section='backtest']"):null; return {version:"1.040", panelFound:!!panel, last:_last, lastErr:_lastErr}; }
};
})();
