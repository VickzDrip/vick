/* Beta 1.263 — MARKET MATRIX: a página do Scanner vira o placar do bot paper
   (VP+RSI-V, walk-forward, 100% simulado, top-50). O scanner antigo era calculado
   no CLIENTE (motor __DVL_SCANNER_ORIGINAL_1013 lendo a MEXC direto), então além de
   pausar o backend a gente esvazia o motor (some dos cards do Copilot que
   consumiam o scanner) e renderiza o Market Matrix (dados de /bot-state) no lugar.
   Reversível: window.DVL_SCANNER_PAUSED=false + reload. */
(function(){
  "use strict";
  if(window.__DVL_MARKET_MATRIX_ON) return; window.__DVL_MARKET_MATRIX_ON=true;
  if(window.DVL_SCANNER_PAUSED!==false) window.DVL_SCANNER_PAUSED=true;
  function paused(){ return window.DVL_SCANNER_PAUSED!==false; }
  function api(p){ try{ var br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023; if(br&&typeof br.api==="function") return br.api(p); }catch(_){} return p; }
  function esc(v){ return String(v==null?"":v).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }
  function wrapRows(o){ if(!o||o.__dvlPausedWrap) return; ["rows","rawRows"].forEach(function(k){ if(typeof o[k]==="function"){ var orig=o[k]; o[k]=function(){ return paused()?[]:orig.apply(this,arguments); }; } }); o.__dvlPausedWrap=true; }

  var DATA=null, _lastPull=0;
  function pull(){ var now=Date.now(); if(now-_lastPull<15000) return; _lastPull=now;
    fetch(api("/api/dvl/scanner/bot-state"),{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(j){ if(j&&j.ok){ DATA=j; render(); } }).catch(function(){});
  }
  function money(v){ v=Number(v); if(!isFinite(v)) return "--"; var a=Math.abs(v),s=v<0?"-":""; if(a>=1e3) return s+"$"+(a/1e3).toFixed(2)+"K"; return s+"$"+a.toFixed(2); }
  function pnlCol(v){ return Number(v)>=0?"#16c784":"#ff5a6a"; }

  function matrixHTML(){
    var d=DATA;
    var head='<div style="padding:14px 14px 8px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><b style="font-size:15px;color:#eafff4">MARKET MATRIX</b><span style="font-size:10px;color:#7f9c8e">bot paper · walk-forward · 100% simulado</span></div>'
      +'<div style="font-size:10.5px;color:#8aa99b;margin-top:2px">Opera TODOS os combos que passam no teste (VP + vzin do RSI → POC) nos top-50 ativos, já com taxa + slippage. Começa semeando a janela de teste out-of-sample do modelo e segue ao vivo daqui pra frente. Não é ordem real.</div></div>';
    if(!d){ return head+'<div style="padding:22px 16px;text-align:center;color:#8aa99b">carregando…</div>'; }
    if(!d.trades){ return head+'<div style="padding:22px 16px;text-align:center;color:#8aa99b"><div style="color:#dcebe4;margin-bottom:4px">Coletando setups…</div>O bot semeia a janela de teste out-of-sample e depois opera ao vivo. Os primeiros trades aparecem assim que o modelo tiver combos validados.</div>'; }
    var col=pnlCol(d.returnPct);
    var summary='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;padding:0 14px 12px">'
      +'<div><div style="font-size:9px;color:#7f9c8e">PATRIMÔNIO</div><b style="font-size:16px;color:'+col+'">'+money(d.account)+'</b><div style="font-size:10px;color:'+col+'">'+(d.returnPct>=0?"+":"")+d.returnPct+'%</div></div>'
      +'<div><div style="font-size:9px;color:#7f9c8e">ACERTO</div><b style="font-size:16px;color:#dcebe4">'+d.winRate+'%</b><div style="font-size:10px;color:#8aa99b">'+d.wins+'/'+d.trades+'</div></div>'
      +'<div><div style="font-size:9px;color:#7f9c8e">DRAWDOWN</div><b style="font-size:16px;color:#dcebe4">'+d.maxDrawdownPct+'%</b></div>'
      +'<div><div style="font-size:9px;color:#7f9c8e">CUSTO MÉD</div><b style="font-size:16px;color:#dcebe4">'+(d.avgCostAtr||0)+'</b><div style="font-size:9px;color:#8aa99b">ATR/trade</div></div>'
      +'</div>';
    var lb='';
    if(d.leaderboard&&d.leaderboard.length){
      lb='<div style="padding:2px 14px 4px"><div style="font-size:10px;color:#7f9c8e;margin-bottom:4px">RANKING POR ATIVO</div>'
        +'<div style="display:grid;grid-template-columns:20px 1fr 46px 52px 70px;gap:6px;font-size:9px;color:#7f9c8e;padding:2px 0"><span>#</span><span>ATIVO</span><span style="text-align:right">TR</span><span style="text-align:right">ACERTO</span><span style="text-align:right">PNL</span></div>';
      d.leaderboard.slice(0,20).forEach(function(r,i){
        lb+='<div style="display:grid;grid-template-columns:20px 1fr 46px 52px 70px;gap:6px;font-size:11px;align-items:center;padding:2.5px 0;border-top:1px solid rgba(129,166,151,.08)"><span style="color:#7f9c8e">'+(i+1)+'</span><b style="color:#dcebe4">'+esc((r.symbol||"").replace(/USDT$/,""))+'</b><span style="text-align:right;color:#8aa99b">'+r.trades+'</span><span style="text-align:right;color:#8aa99b">'+r.winRate+'%</span><b style="text-align:right;color:'+pnlCol(r.pnl)+'">'+money(r.pnl)+'</b></div>';
      });
      lb+='</div>';
    }
    var rec='';
    if(d.recent&&d.recent.length){
      rec='<div style="padding:8px 14px 14px"><div style="font-size:10px;color:#7f9c8e;margin-bottom:4px">TRADES RECENTES</div>';
      d.recent.slice(0,12).forEach(function(t){ var pv=t["pnl$"]; var sd=t.side==="long"?"C":"V";
        rec+='<div style="display:flex;align-items:center;gap:8px;font-size:11px;padding:1.5px 0"><span style="width:16px;color:'+(t.side==="long"?"#13dc8d":"#ff6b81")+'">'+sd+'</span><b style="flex:1;color:#dcebe4">'+esc((t.sym||"").replace(/USDT$/,""))+'</b><span style="color:#7f9c8e;font-size:9px">'+esc(t.tf)+' · '+esc(t.zone||"")+'</span><b style="color:'+pnlCol(pv)+';min-width:56px;text-align:right">'+money(pv)+'</b></div>';
      });
      rec+='</div>';
    }
    return head+summary+lb+rec;
  }
  function render(){ if(!paused()) return; ["dvlScan1013Body","dvlScan1012Body"].forEach(function(id){ var el=document.getElementById(id); if(el) el.innerHTML=matrixHTML(); }); }

  function patch(){
    try{
      wrapRows(window.__DVL_SCANNER_ORIGINAL_1013);
      wrapRows(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780);
      var pro=window.DVL_SCANNER_PRO_FORCE_OPEN_1013;
      if(pro && typeof pro.render==="function" && !pro.__dvlMatrixRender){ var r=pro.render; pro.render=function(){ if(paused()){ render(); return; } return r.apply(this,arguments); }; pro.__dvlMatrixRender=true; }
      // if a scanner body is on screen, keep it as the matrix + poll
      if(document.getElementById("dvlScan1013Body")||document.getElementById("dvlScan1012Body")){ pull(); render(); }
    }catch(_){}
  }
  setInterval(patch, 2000);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",patch,{once:true}); else patch();
})();
