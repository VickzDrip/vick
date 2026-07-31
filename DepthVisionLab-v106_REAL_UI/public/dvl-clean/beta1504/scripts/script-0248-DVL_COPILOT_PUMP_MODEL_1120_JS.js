/* Beta 1.120 — cartão do Copilot para o modelo pré-pump / pré-short.
   Só leitura: mostra o estado de aprendizado (amostras N/mínimo) e, quando o
   modelo treina, as moedas com maior expectativa de ALTA (pré-pump/LONG) e de
   QUEDA (pré-short/SHORT) nas próximas 20 velas, em ATR. Lê o status já
   polido pela bridge (window.DVL_PUMP_MODEL_STATUS) e as linhas do scanner
   (window.__DVL_SCANNER_ORIGINAL_1013.rows(), que carregam predUp/predDown).
   Nunca abre ordem, nunca inventa número — nada aparece até o modelo treinar. */
(function(){
  if(window.DVL_COPILOT_PUMP_MODEL_1120) return;
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }

  function scannerRows(){
    try{
      var api=window.__DVL_SCANNER_ORIGINAL_1013;
      if(api && typeof api.rows==="function"){ var r=api.rows(); if(r&&r.length) return r; }
    }catch(_){}
    return [];
  }

  /* Ações/índices/commodities/forex tokenizados (SKHYNIXSTOCK, NAS100, SPX500,
     XAU…) quase não se mexem, então entopem o ranking em ATR com ruído e não são
     cripto. O backend já os remove; aqui é uma rede de segurança pro card ficar
     limpo mesmo antes do restart do backend. Match exato (não substring) pra
     nunca esconder cripto real tipo SPX6900 ou AAVE. */
  var PM_NON_CRYPTO=new Set(["NAS100","US100","SPX500","US500","US30","US2000","DJI30","GER30","GER40","DE40","DAX40","UK100","FTSE100","JP225","NIKKEI225","HK50","EU50","STOXX50","FRA40","CAC40","AUS200","CHINA50","ES35","IT40","XAU","XAUUSD","XAG","XAGUSD","XPT","XPD","WTI","USOIL","UKOIL","BRENT","NGAS","NATGAS","EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD","EURJPY","GBPJPY","DXY","USDX"]);
  function isCryptoRow(r){
    var b=String((r&&(r.symbol||r.mexc))||"").toUpperCase().replace(/\/?USDT$/,"").replace(/_/g,"");
    if(!b) return false;
    if(b.indexOf("STOCK")>=0) return false;
    return !PM_NON_CRYPTO.has(b);
  }

  /* NOVO MODELO (RSI): o antigo (só pré-volume+spike em ATR) parou de comandar
     este cartão. Agora ele SEGUE o oscilador da plataforma (Exhaustion RSI, 15m):
     pré-pump = moedas SOBREVENDIDAS (zona "down", verde) esperando o spike pós-
     flat pra comprar; pré-short = SOBRECOMPRADAS (zona "up", vermelho) esperando
     o spike pra vender. Ordenadas pela extremidade do RSI (mais esticada primeiro). */
  function topByRsi(rows, dir){
    return rows.filter(function(r){
      return isCryptoRow(r) && r.exrZone===dir && r.exrValue!=null && isFinite(Number(r.exrValue));
    }).sort(function(a,b){
      return dir==="down" ? Number(a.exrValue)-Number(b.exrValue)   // mais sobrevendido primeiro
                          : Number(b.exrValue)-Number(a.exrValue);  // mais sobrecomprado primeiro
    }).slice(0,4);
  }
  /* Spike pós-flat FECHOU? É o gatilho do padrão: RSI na zona + spike pós-flat no
     fechamento. O status do scanner mostra "Spike pós-flat" quando fecha. */
  function spikeReady(r){ return /flat/i.test(String((r&&r.status)||"")); }
  function itemsHtml(list, dir){
    if(!list.length) return '<div class="dvlCpPm1120Empty">nenhuma na zona agora</div>';
    var col = dir==="down" ? "#10df77" : "#ff5966";
    return list.map(function(r){
      var name=esc(r.symbol||r.mexc||"—").replace(/\/USDT$/,"");
      var rv=Number(r.exrValue)||0;
      var mark = spikeReady(r) ? ' <i class="dvlCpPm1120Go" title="Spike pós-flat fechou — gatilho pronto pra '+(dir==="down"?"comprar":"vender")+'">⚡</i>' : '';
      return '<div class="dvlCpPm1120Item"><b>'+name+mark+'</b><span style="color:'+col+'">RSI '+rv.toFixed(1)+'</span></div>';
    }).join("");
  }

  /* Linha de status do RSI Exhaustion (15m) no card do modelo, pra acompanhar:
     estado da coleta ou a melhor config aprendida no backtest. */
  function rsiStatusHtml(){
    var rc=window.DVL_PUMP_BACKTEST && window.DVL_PUMP_BACKTEST.rsiConfirm;
    if(!rc||typeof rc!=="object") return '';
    if(!rc.ready){
      var have=Number(rc.withExr)||0, need=Number(rc.need)||20;
      return '<div class="dvlCpPm1120RsiNote">🔎 RSI Exhaustion (15m): coletando leituras nos disparos (<b>'+have+'/'+need+'</b>). A marca <b>[RSI]</b> nas moedas aparece conforme os sinais novos chegam.</div>';
    }
    var b=rc.best||{}, te=rc.test||{}; var teR=Number(te.returnPct);
    var edge = isFinite(teR) ? (' · fora da amostra: '+((teR>=0?'+':'')+teR.toFixed(1)+'%')) : '';
    return '<div class="dvlCpPm1120RsiNote">🔎 RSI Exhaustion (15m) — melhor no backtest: <b>RSI '+(Number(b.rsiLen)||0)+'</b>, long ≤ '+(Number(b.lowerZone)||0)+' / short ≥ '+(Number(b.upperZone)||0)+edge+'. <b style="color:#10df77">[RSI]</b> verde na moeda = oscilador a favor da direção.</div>';
  }

  function bodyHtml(){
    var s=window.DVL_PUMP_MODEL_STATUS;
    if(!s||typeof s!=="object"){
      return {on:false, html:''
        +'<h4><i class="dvlCpPm1120Dot"></i>Modelo pré-pump / pré-short</h4>'
        +'<p class="dvlCpPm1120Sub">Aguardando o scanner backend responder. Se acabou de reiniciar, aparece em instantes.</p>'};
    }
    var n=Number(s.samples)||0, min=Number(s.minSamples)||40, pend=Number(s.pending)||0;
    if(s.trained){
      var rows=scannerRows();
      var ups=topByRsi(rows,"down"), downs=topByRsi(rows,"up");
      return {on:true, html:''
        +'<h4><i class="dvlCpPm1120Dot"></i>Modelo RSI · pré-pump / pré-short</h4>'
        +'<p class="dvlCpPm1120Sub">Segue o RSI Exhaustion da plataforma (15m). <b style="color:#10df77">Pré-pump</b> = sobrevendido (RSI ≤ zona, verde) esperando spike pós-flat pra <b>comprar</b>; <b style="color:#ff5966">pré-short</b> = sobrecomprado (RSI ≥ zona, vermelho) esperando spike pra <b>vender</b>. ⚡ = spike pós-flat já fechou (gatilho pronto).</p>'
        +'<div class="dvlCpPm1120Cols">'
          +'<div class="dvlCpPm1120Col up"><h5>▲ Pré-pump (sobrevendido)</h5>'+itemsHtml(ups,"down")+'</div>'
          +'<div class="dvlCpPm1120Col down"><h5>▼ Pré-short (sobrecomprado)</h5>'+itemsHtml(downs,"up")+'</div>'
        +'</div>'
        + rsiStatusHtml()};
    }
    var pct=Math.max(0,Math.min(100,Math.round(n/Math.max(1,min)*100)));
    return {on:false, html:''
      +'<h4><i class="dvlCpPm1120Dot"></i>Modelo pré-pump / pré-short · aprendendo</h4>'
      +'<p class="dvlCpPm1120Sub">Ele começa vazio e aprende sozinho, sem número fixo de %. Precisa de sinais "spike pós-flat" que resolvem 20 velas depois — leva dias/semanas. As previsões aparecem aqui e no Scanner assim que treinar.</p>'
      +'<div class="dvlCpPm1120Bar"><i style="width:'+pct+'%"></i></div>'
      +'<div class="dvlCpPm1120BarLbl">'+n+' / '+min+' amostras'+(pend?(' · '+pend+' sinais em aberto'):'')+'</div>'};
  }

  function render(){
    var d=bodyHtml();
    return '<div class="dvlCpPm1120'+(d.on?' on':'')+'" data-dvl-cp-section="pumpModel" id="dvlCpPm1120Card">'+d.html+'</div>';
  }

  function refreshCard(){
    var el=document.getElementById("dvlCpPm1120Card");
    if(!el) return;
    var d=bodyHtml();
    el.className='dvlCpPm1120'+(d.on?' on':'');
    el.innerHTML=d.html;
  }

  var bound1207=false;
  function copilotOpen1207(){ var g=window.DVL_PANEL_ACTIVITY_1207; return g?g.copilotOpen():(!document.hidden&&!!document.querySelector("#dvlCopilotPage0974.is-open")); }
  function refreshIfOpen1207(){ if(copilotOpen1207()) refreshCard(); }
  function bind1207(){
    if(bound1207) return; bound1207=true;
    window.addEventListener("dvl:pump-model-update",refreshIfOpen1207,true);
    window.addEventListener("dvl:scanner-backend-update",refreshIfOpen1207,true);
    window.addEventListener("dvl:copilot-state-change",function(ev){ if(!ev.detail||ev.detail.open!==false) setTimeout(refreshIfOpen1207,0); },true);
  }
  function tryRegister(tries){
    tries=tries||0;
    var core=window.DVL_COPILOT_MODULAR_CORE_0980;
    if(core && typeof core.registerSection==="function"){
      core.registerSection({ key:"pumpModel", render:render }, "insight");
      bind1207();
      return;
    }
    if(tries<80) setTimeout(function(){ tryRegister(tries+1); }, 400);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", function(){ tryRegister(0); }, {once:true});
  else tryRegister(0);

  window.DVL_COPILOT_PUMP_MODEL_1120={ version:"1.120", render:render, refresh:refreshCard };
})();
