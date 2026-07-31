(function(){
"use strict";
if(window.DVL_PAPER_TRADE_STORE)return;
var _SKEY='DVL_PAPER_TRADE_STORE_V1';
var _MAX=100;
window.DVL_PAPER_TRADE_STORE={version:'0.759',pendingOrders:[],openPositions:[],tradeHistory:[],maxHistory:_MAX};

function savePaperTradeStore(){try{var s=window.DVL_PAPER_TRADE_STORE;localStorage.setItem(_SKEY,JSON.stringify({version:s.version,pendingOrders:s.pendingOrders,openPositions:s.openPositions,tradeHistory:s.tradeHistory}));}catch(e){}}

function loadPaperTradeStore(){
  try{
    var raw=localStorage.getItem(_SKEY);var s=window.DVL_PAPER_TRADE_STORE;
    if(raw){var data=JSON.parse(raw);if(data){s.pendingOrders=Array.isArray(data.pendingOrders)?data.pendingOrders:[];s.openPositions=Array.isArray(data.openPositions)?data.openPositions:[];s.tradeHistory=Array.isArray(data.tradeHistory)?data.tradeHistory.slice(-_MAX):[];}}
    if(!s.tradeHistory.length){
      var _pfx='dvl_paper_v2_pro_0695_',_rk=_pfx+'symbols',_seen={};
      try{
        for(var _k=0;_k<localStorage.length;_k++){var _lk=localStorage.key(_k);if(!_lk||_lk.indexOf(_pfx)!==0||_lk===_rk)continue;try{var _la=JSON.parse(localStorage.getItem(_lk)||'[]');if(Array.isArray(_la))_la.forEach(function(o){if(o&&o.id&&o.status==='closed'&&!_seen[o.id]){_seen[o.id]=true;s.tradeHistory.push(o);}});}catch(_){}}
      }catch(_){}
      s.tradeHistory.sort(function(a,b){return(a.closedAt||0)-(b.closedAt||0);});
      if(s.tradeHistory.length>_MAX)s.tradeHistory=s.tradeHistory.slice(-_MAX);
    }
  }catch(e){}
}

function addTradeToHistory(trade){var s=window.DVL_PAPER_TRADE_STORE;if(!s||!trade)return;s.tradeHistory.push(trade);while(s.tradeHistory.length>s.maxHistory)s.tradeHistory.shift();savePaperTradeStore();}

function syncPaperStoreFromOrders(){var s=window.DVL_PAPER_TRADE_STORE;if(!s)return;try{var V2=window.DVL_PAPER_TRADING_V2_PRO;if(!V2)return;var all=typeof V2.getAllOrders==='function'?V2.getAllOrders():(V2.getState().orders||[]);s.pendingOrders=all.filter(function(o){return o&&(o.status==='pending'||o.status==='draft');});s.openPositions=all.filter(function(o){return o&&o.status==='open';});}catch(_){}}

window.savePaperTradeStore=savePaperTradeStore;
window.loadPaperTradeStore=loadPaperTradeStore;
window.addTradeToHistory=addTradeToHistory;
window.syncPaperStoreFromOrders=syncPaperStoreFromOrders;

window.DVL_PAPER_TRADE_STORE_AUDIT={run:function(){var bl=[];var s=window.DVL_PAPER_TRADE_STORE;if(!s){bl.push('store missing');}else{if(!Array.isArray(s.pendingOrders))bl.push('pendingOrders missing');if(!Array.isArray(s.openPositions))bl.push('openPositions missing');if(!Array.isArray(s.tradeHistory))bl.push('tradeHistory missing');if(s.maxHistory!==100)bl.push('maxHistory!=100');if(s.tradeHistory.length>100)bl.push('history>100');}if(typeof window.savePaperTradeStore!=='function')bl.push('savePaperTradeStore missing');if(typeof window.loadPaperTradeStore!=='function')bl.push('loadPaperTradeStore missing');if(typeof window.addTradeToHistory!=='function')bl.push('addTradeToHistory missing');if(typeof window.syncPaperStoreFromOrders!=='function')bl.push('syncPaperStoreFromOrders missing');return{pass:bl.length===0,blockers:bl,version:'0.759'};}};

function _init(){loadPaperTradeStore();syncPaperStoreFromOrders();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_init,{once:true});else _init();
document.addEventListener('dvl:paper-v2-close',syncPaperStoreFromOrders);
document.addEventListener('dvl:paper-position',syncPaperStoreFromOrders);
document.addEventListener('dvl:paper-position-closed',syncPaperStoreFromOrders);
})();
