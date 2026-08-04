/* BTC 30-day backtest of the 7 Fast Bots ENTRY combos — a read-only
   Copilot card that does NOT touch the live paper wallets. It just fetches
   the backend's /api/dvl/scanner/btc-backtest (which does the heavy
   30-day fetch + candle-by-candle simulation server-side — see
   src/btcBacktest.js) and renders the per-timeframe results table.

   Why the numbers can differ from the live Fast Bots: this holds ONE
   common exit fixed across all 7 combos (so the comparison is about the
   entry), whereas the live bots each now have their own exit. Different
   question, on purpose — this one asks "which ENTRY has an edge, all else
   equal, on real BTC history". The backend caches the run (~1 min) and
   this polls until it's ready. */
(function(){
  "use strict";
  if(window.DVL_BTCBACKTEST_1090) return;
  var TFS=["15m","30m","1h"];
  var _data=null;
  function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  function fmtPct(v){ v=Number(v)||0; return (v>=0?"+":"")+v.toFixed(1)+"%"; }
  function fmtAgo(ts){ if(!ts) return "—"; var s=Math.round((Date.now()-ts)/1000); if(s<60) return s+"s atrás"; if(s<3600) return Math.round(s/60)+"min atrás"; return Math.round(s/3600)+"h atrás"; }
  async function fetchJson(url){ var r=await fetch(url,{cache:"no-store"}); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); }

  async function poll(){
    try{ _data=await fetchJson("/api/dvl/scanner/btc-backtest"); }catch(_){ if(!_data) _data={ __err:true }; }
    render();
  }

  function tableHtml(tf){
    var res=(_data.results||{})[tf]||{};
    var bots=_data.bots||[];
    var rows=bots.map(function(b){ return Object.assign({ id:b.id, label:b.label }, res[b.id]||{}); });
    /* Rank by compounded return; the top one (with at least one trade) is
       highlighted as this timeframe's winner. */
    rows.sort(function(a,b){ return (Number(b.retPct)||0)-(Number(a.retPct)||0); });
    var bestId=null; for(var i=0;i<rows.length;i++){ if((rows[i].trades||0)>0){ bestId=rows[i].id; break; } }
    var cov=(_data.coverage||{})[tf]||{};
    var nAssets=(_data.assets&&_data.assets.length)||0;
    var out='<div class="dvlBt1090TfTitle">'+esc(tf)+(nAssets?' · '+nAssets+' ativos':'')+(cov.feeR?' · taxa ~'+cov.feeR+'R/trade':'')+(cov.candles?' · '+cov.candles.toLocaleString('pt-BR')+' candles':'')+'</div>';
    out+='<div class="dvlBt1090Scroll"><table class="dvlBt1090Tbl"><thead><tr>'
      +'<th>Saída (TP/SL)</th><th>Trades</th><th>Acerto</th><th>R méd.</th><th>Retorno</th><th>Máx queda</th></tr></thead><tbody>';
    out+=rows.map(function(r){
      var isWin=r.id===bestId;
      var ret=Number(r.retPct)||0, avgr=Number(r.avgR)||0, gross=Number(r.grossRetPct)||0;
      /* Retorno cell shows NET (com taxa); the muted number under it is the
         GROSS (sem taxa) so the fee bite is visible at a glance. */
      var grossTag=(r.trades&&r.grossRetPct!=null)?'<span class="dvlBt1090Gross">'+esc(fmtPct(gross))+'</span>':'';
      var feeTag=(r.trades&&r.feeR)?'<span class="dvlBt1090Sub">taxa ~'+r.feeR+'R</span>':'';
      return '<tr class="'+(isWin?'win':'')+'">'
        +'<td>'+(isWin?'👑 ':'')+esc(r.label)+feeTag+'</td>'
        +'<td>'+(r.trades||0)+'</td>'
        +'<td>'+(r.trades?(r.winPct+'%'):'—')+'</td>'
        +'<td class="'+(avgr>=0?'pos':'neg')+'">'+(r.trades?avgr.toFixed(2)+'R':'—')+'</td>'
        +'<td class="'+(ret>=0?'pos':'neg')+'">'+(r.trades?esc(fmtPct(ret))+grossTag:'—')+'</td>'
        +'<td>'+(r.trades?'-'+(Number(r.maxDDPct)||0).toFixed(1)+'%':'—')+'</td></tr>';
    }).join("");
    out+='</tbody></table></div>';
    return out;
  }

  function progressBar(pct, err, phase, extra){
    pct=Math.max(2,Math.min(100,Number(pct)||0));
    return '<div class="dvlBt1090Bar'+(err?' err':'')+'"><i style="width:'+pct+'%"></i></div>'
      +'<div class="dvlBt1090Phase"><span>'+esc(phase||'')+'</span><span>'+pct+'%</span></div>'
      +(extra?'<div class="dvlBt1090Phase" style="justify-content:flex-start">'+esc(extra)+'</div>':'');
  }

  function bodyHtml(){
    if(!_data || _data.__err){
      return '<div class="dvlBt1090Loading">Não consegui falar com o backend do backteste. Ele já foi atualizado e reiniciado no servidor?</div>'
        +progressBar(100,true,"sem conexão com o backend");
    }
    if(!_data.ready){
      var pg=_data.progress||{};
      var banned=(_data.cooldownMin||0)>0 || (pg.lastError&&pg.lastError.indexOf("418")>=0);
      /* Only a REAL failure paints the bar red. A lastError alone doesn't:
         the run catches per-window errors (e.g. an old OI/LSR window outside
         Binance's 30-day retention) and keeps going, so it's still working —
         showing it as "problema" was a false alarm. */
      var isErr=pg.phase==="erro"||banned;
      var head;
      if(banned){ head='⏳ Calculando… os candles vêm da MEXC (não sofrem ban). O OI/LSR da Binance pode estar num ban curto de IP; se estiver, os combos que dependem deles aparecem sem dados até liberar. Atualiza sozinho.'; }
      else if(pg.phase==="erro"){ head='⚠️ Backteste com problema — veja abaixo. Ele tenta de novo sozinho a cada minuto.'; }
      else { head='⏳ Calculando o backteste (top combos, vários ativos)… atualiza sozinho.'; }
      var extra=pg.lastError ? ("último erro: "+pg.lastError+(pg.attempts?" · tentativa "+pg.attempts:"")) : "candles da MEXC + OI/LSR da Binance, ~15 ativos, 15m/30m/1h (~3-4 min)";
      return '<div class="dvlBt1090Loading">'+head+'</div>'
        +progressBar(pg.pct||3, isErr, pg.phase||"iniciando", extra);
    }
    var out='';
    if(_data.dataWarning) out+='<div class="dvlBt1090Warn">⚠️ '+esc(_data.dataWarning)+'</div>';
    var assetTxt=(_data.assets&&_data.assets.length)?_data.assets.join(", "):"BTC";
    out+='<div class="dvlBt1090Note">Entrada <b>FIXA</b>: '+esc(_data.entryLabel||"Spike + RSI sobrevenda")+'. Cada linha é uma <b>saída (TP/SL) diferente</b> — a ideia é ver se ALGUMA saída vira o jogo. Testado em <b>'+((_data.assets&&_data.assets.length)||1)+' ativos</b> ('+esc(assetTxt)+'), 30 dias, dados reais (candles <b>MEXC</b>, OI/LSR <b>Binance</b>). <b>Acerto</b> e <b>R méd.</b> juntam TODOS os trades; <b>Retorno</b> e <b>Máx queda</b> são a <b>média por ativo</b> (1% de risco por trade, composto). Tudo <b>já com taxa de '+((_data.feePct!=null)?_data.feePct:0.1)+'% por rodada</b> descontada — o número cinza é o <b>bruto</b> (sem taxa), e "taxa ~X R" mostra o custo daquela saída. 👑 = melhor retorno.</div>';
    out+=TFS.map(tableHtml).join("");
    out+='<div class="dvlBt1090Foot">Atualizado '+esc(fmtAgo(_data.updatedAt))+' · candles: '+esc(_data.candleSource||'MEXC')+' · OI/LSR: '+esc(_data.dirSource||'Binance')+' ('+(_data.oiPoints||0)+'/'+(_data.lsrPoints||0)+' pts) · recalcula a cada 6h. Não mexe nas carteiras dos bots ao vivo — é só simulação histórica.</div>';
    return out;
  }

  function html(){
    return '<section class="dvlBt1090Panel dvlBt1090" data-dvl-cp-section="btc-backtest" data-dvl-cp-section-version="1090">'
      +'<div class="dvlBt1090Head"><i class="dvlBt1090Icon">📊</i>'
      +'<div><b>Backteste 30 dias — Setup (sequência)</b><span>confluência de 4 blocos · 5 saídas · 15m/30m/1h</span></div></div>'
      +'<div class="dvlBt1090Body">'+bodyHtml()+'</div></section>';
  }

  function render(){
    var p=document.getElementById("dvlCopilotPage0974");
    if(!p) return false;
    var panel=p.querySelector("[data-dvl-cp-section='btc-backtest'][data-dvl-cp-section-version='1090']");
    if(!panel){
      var fast=p.querySelector("[data-dvl-cp-section='fast-bots']");
      if(fast) fast.insertAdjacentHTML("afterend", html());
      else p.insertAdjacentHTML("beforeend", html());
      panel=p.querySelector("[data-dvl-cp-section='btc-backtest'][data-dvl-cp-section-version='1090']");
    }else{
      var body=panel.querySelector(".dvlBt1090Body");
      if(body) body.innerHTML=bodyHtml();
    }
    return !!panel;
  }

  var progressTimer1207=null,slowTimer1207=null;
  function copilotOpen1207(){var g=window.DVL_PANEL_ACTIVITY_1207;return g?g.copilotOpen():(!document.hidden&&!!document.querySelector("#dvlCopilotPage0974.is-open"));}
  function stopTimers1207(){
    if(progressTimer1207){clearInterval(progressTimer1207);progressTimer1207=null;}
    if(slowTimer1207){clearInterval(slowTimer1207);slowTimer1207=null;}
  }
  function syncTimers1207(){
    if(!copilotOpen1207()){stopTimers1207();return;}
    render(); poll();
    if(!progressTimer1207) progressTimer1207=setInterval(function(){ if(copilotOpen1207()&&(!_data||!_data.ready)) poll(); },3000);
    if(!slowTimer1207) slowTimer1207=setInterval(function(){ if(copilotOpen1207()) poll(); },5*60000);
  }
  function boot(){
    return; /* Beta 1.600 — BACKTEST DESATIVADO: sem poll (fim dos 404 em /api/dvl/scanner/btc-backtest) nem UI. */
    render();
    [400,1200,2500,5000,9000].forEach(function(ms){ setTimeout(function(){if(copilotOpen1207())render();},ms); });
    window.addEventListener("dvl:copilot-state-change",function(){setTimeout(syncTimers1207,0);},true);
    document.addEventListener("visibilitychange",syncTimers1207,true);
    syncTimers1207();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_BTCBACKTEST_1090={ version:"1.090", render:render, poll:poll, audit:function(){ return { ready:_data&&_data.ready, updatedAt:_data&&_data.updatedAt }; } };
})();
