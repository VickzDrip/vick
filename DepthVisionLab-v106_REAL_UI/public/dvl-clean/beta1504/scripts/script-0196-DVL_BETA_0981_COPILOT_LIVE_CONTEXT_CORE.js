(function(){
"use strict";
function fmtSymbol(sym){sym=String(sym||"BTCUSDT").trim().toUpperCase();if(sym.indexOf("/")>=0)return sym;if(sym.endsWith("USDT"))return sym.replace(/USDT$/,"/USDT");return sym;}
function currentSymbol(){try{var st=document.getElementById("symbolText");var raw=st?(st.textContent||"").trim():"";if(raw)return fmtSymbol(raw);}catch(_){}try{if(window.S&&S.sym)return fmtSymbol(S.sym);}catch(_){}try{if(window.symbol)return fmtSymbol(window.symbol);}catch(_){}return "BTC/USDT";}
function candleArray(){var arr=[];try{if(window.S&&Array.isArray(S.candles)&&S.candles.length)arr=S.candles;}catch(_){}try{if(!arr.length&&Array.isArray(window.klines)&&window.klines.length)arr=window.klines;}catch(_){}return arr||[];}
function n(v){v=Number(v);return Number.isFinite(v)?v:0}
function closeOf(c){return n(c&&(c.close??c.c??c.price))}
function highOf(c){return n(c&&(c.high??c.h??c.close??c.c))}
function lowOf(c){return n(c&&(c.low??c.l??c.close??c.c))}
function volOf(c){return n(c&&(c.volume??c.v??c.vol))}
function avg(a){return a.length?a.reduce(function(x,y){return x+n(y)},0)/a.length:0}
function pct(a,b){return b?((a-b)/Math.abs(b))*100:0}
function computeContext(){
 var candles=candleArray(),sym=currentSymbol();
 if(!candles||candles.length<8)return{symbol:sym,candles:candles.length||0,bias:"neutral",title:"Aguardando dados",regime:"Carregando ·",score:4,status:"IA ativa · aguardando candles",text:"O Copilot está aguardando candles suficientes do ativo atual para formar uma leitura inicial confiável."};
 var last=candles[candles.length-1],lastClose=closeOf(last),lookback=Math.min(24,candles.length-1),ref=closeOf(candles[candles.length-1-lookback]),chg=pct(lastClose,ref);
 var recent=candles.slice(-Math.min(12,candles.length));
 var bodyAvg=avg(recent.map(function(c){return Math.abs(closeOf(c)-n(c.open??c.o??closeOf(c)))}));
 var rangeAvg=avg(recent.map(function(c){return Math.max(0,highOf(c)-lowOf(c))}));
 var bodyPower=rangeAvg?Math.min(1.4,bodyAvg/rangeAvg):0;
 var volRecent=avg(recent.map(volOf)),prevVol=avg(candles.slice(-Math.min(36,candles.length),-recent.length).map(volOf)),volBoost=prevVol?(volRecent/prevVol):1;
 var up=chg>0.18,down=chg<-0.18,strong=Math.abs(chg)>0.55||volBoost>1.22||bodyPower>0.42;
 var score=4;if(up||down)score++;if(strong)score++;if(volBoost>1.15)score++;if(Math.abs(chg)>0.9)score++;score=Math.max(3,Math.min(9,score));
 var bias=up?"bull":(down?"bear":"neutral"),title,regime,text;
 if(bias==="bull"){title=score>=7?"Convicção Alta":"Viés comprador";regime=strong?"Tendencial ↗":"Recuperação ↗";text="O "+sym+" mostra avanço recente de "+chg.toFixed(2)+"%, com leitura favorável de momentum"+(volBoost>1.15?" e volume acima da média.":".");}
 else if(bias==="bear"){title=score>=7?"Pressão Vendedora":"Viés vendedor";regime=strong?"Distribuição ↘":"Correção ↘";text="O "+sym+" recua "+Math.abs(chg).toFixed(2)+"% no recorte analisado. O Copilot reduz convicção de compra e prioriza proteção de risco.";}
 else{title="Mercado em equilíbrio";regime="Neutro →";text="O "+sym+" está sem direção forte no recorte atual. A leitura favorece paciência até surgir spike, zona ou confirmação de fluxo.";}
 return{symbol:sym,candles:candles.length,bias:bias,title:title,regime:regime,score:score,status:"IA ativa · "+candles.length+" candles · "+sym,text:text,change:chg,volBoost:volBoost};
}
function paintBars(el,score){if(!el)return;var total=7,on=Math.max(1,Math.min(total,Math.round((score/10)*total))),html="";for(var i=0;i<total;i++)html+='<i class="'+(i<on?'on':'')+'"></i>';el.innerHTML=html;}
function applyContext(ctx){
 var page=document.getElementById("dvlCopilotPage0974");if(!page)return false;page.dataset.dvlCpBias=ctx.bias||"neutral";
 page.querySelectorAll("[data-dvl-cp-live-symbol]").forEach(function(el){el.textContent=ctx.symbol});
 var q=function(s){return page.querySelector(s)},el;
 if(el=q("[data-dvl-cp-live-title]"))el.textContent=ctx.title;
 if(el=q("[data-dvl-cp-live-text]"))el.textContent=ctx.text;
 if(el=q("[data-dvl-cp-live-status]"))el.textContent=ctx.status;
 if(el=q("[data-dvl-cp-live-regime]"))el.textContent=ctx.regime;
 if(el=q("[data-dvl-cp-live-score]"))el.innerHTML=String(ctx.score)+'<small>/10</small>';
 paintBars(q("[data-dvl-cp-live-bars]"),ctx.score);
 try{page.dataset.dvlCpLiveContext=JSON.stringify({symbol:ctx.symbol,bias:ctx.bias,score:ctx.score,candles:ctx.candles,change:ctx.change||0,volBoost:ctx.volBoost||0});}catch(_){}
 return true;
}
var lastKey="";
function tick(){try{var ctx=computeContext(),key=[ctx.symbol,ctx.candles,ctx.bias,ctx.score,Math.round((ctx.change||0)*100)].join("|");if(key!==lastKey){lastKey=key;applyContext(ctx)}}catch(e){console.warn("[DVL Copilot 0.981] live context:",e)}}
function copilotOpen(){var p=document.getElementById("dvlCopilotPage0974");return !!(p&&(p.classList.contains("is-open")||p.classList.contains("open")));}
var liveContextTimer1203=0;
function syncLiveContextTimer1203(){
  var open=copilotOpen();
  if(open&&!liveContextTimer1203){
    tick();
    liveContextTimer1203=setInterval(function(){if(!document.hidden&&copilotOpen())tick();},1500);
  }else if(!open&&liveContextTimer1203){
    clearInterval(liveContextTimer1203);
    liveContextTimer1203=0;
  }
}
function boot(){
  syncLiveContextTimer1203();
  try{var st=document.getElementById("symbolText");if(st){var mo=new MutationObserver(function(){if(copilotOpen())tick();});mo.observe(st,{childList:true,characterData:true,subtree:true})}}catch(_){}
  window.addEventListener("dvl-safe-asset-selected-0804",function(){if(copilotOpen()){setTimeout(tick,0);setTimeout(tick,350)}},true);
  window.addEventListener("dvl:copilot-state-change",function(){setTimeout(syncLiveContextTimer1203,0);},true);
  window.addEventListener("dvl:copilot-live-feed",function(){if(copilotOpen())tick();},true);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)syncLiveContextTimer1203();},true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.DVL_COPILOT_LIVE_CONTEXT_CORE_0981={version:"0.981",compute:computeContext,apply:function(){var ctx=computeContext();applyContext(ctx);return ctx},audit:function(){var ctx=computeContext(),page=document.getElementById("dvlCopilotPage0974");return{version:"0.981",symbol:ctx.symbol,candles:ctx.candles,bias:ctx.bias,score:ctx.score,pageFound:!!page,hooksFound:!!(page&&page.querySelector("[data-dvl-cp-live-title]")),liveContextStored:!!(page&&page.dataset.dvlCpLiveContext),noTradeExecution:true,noOrdersSent:true,noDrawingsTouch:true,noIndicatorsTouch:true,noApiTouch:true,noFallbackTouch:true,pass:!!page}}};
window.DVL_COPILOT_LIVE_CONTEXT_AUDIT=function(){return window.DVL_COPILOT_LIVE_CONTEXT_CORE_0981.audit()};
})();
