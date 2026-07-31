(function(){
"use strict";
window.DVL_PAPER_REALTIME_MULTI_SYMBOL_AUDIT_0762={run:function(){
  var bl=[];
  if(document.title.indexOf('0.762')<0)bl.push('01: title missing 0.762');
  if(document.body.innerHTML.indexOf('BETA 0.875')<0)bl.push('02: badge missing BETA 0.875');
  if(document.body.innerHTML.indexOf('Beta 0.762')<0)bl.push('03: changelog missing 0.762');
  if(!window.DVL_PAPER_REALTIME_ENGINE)bl.push('04: DVL_PAPER_REALTIME_ENGINE missing');
  if(!window.DVL_LAST_PRICE_BY_SYMBOL)bl.push('05: DVL_LAST_PRICE_BY_SYMBOL missing');
  if(typeof window.getPaperSymbolsToMonitor!=='function')bl.push('06: getPaperSymbolsToMonitor missing');
  if(typeof window.calcPaperPnl!=='function')bl.push('07: calcPaperPnl missing');
  if(!window.DVL_PAPER_TRADE_STORE)bl.push('07b: DVL_PAPER_TRADE_STORE missing');
  if(typeof window.DVL_POSITIONS_REFRESH!=='function')bl.push('08: DVL_POSITIONS_REFRESH missing');
  try{var syms=window.getPaperSymbolsToMonitor();if(!Array.isArray(syms))bl.push('07c: getPaperSymbolsToMonitor did not return array');}catch(e){bl.push('07c: getPaperSymbolsToMonitor threw');}
  if(typeof window.onPaperSymbolPrice!=='function')bl.push('11: onPaperSymbolPrice missing');
  if(typeof window.processPaperRealtimeTick!=='function')bl.push('12: processPaperRealtimeTick missing');
  if(typeof window.processPendingOrderRealtime!=='function')bl.push('13: processPendingOrderRealtime missing');
  if(typeof window.processOpenPositionRealtime!=='function')bl.push('14: processOpenPositionRealtime missing');
  try{if(!window.processPendingOrderRealtime({side:'buy',type:'limit',entry:1.0},0.99,Date.now()))bl.push('15: buy limit not triggered at price<=entry');}catch(e){bl.push('15: buy limit test error:'+e);}
  try{if(!window.processPendingOrderRealtime({side:'sell',type:'limit',entry:1.0},1.01,Date.now()))bl.push('16: sell limit not triggered at price>=entry');}catch(e){bl.push('16: sell limit test error');}
  try{if(!window.processPendingOrderRealtime({side:'buy',type:'stop',entry:1.0},1.01,Date.now()))bl.push('17: buy stop not triggered at price>=entry');}catch(e){bl.push('17: buy stop test error');}
  try{if(!window.processPendingOrderRealtime({side:'sell',type:'stop',entry:1.0},0.99,Date.now()))bl.push('18: sell stop not triggered at price<=entry');}catch(e){bl.push('18: sell stop test error');}
  try{var _hLong=false;var _ah=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aLTP')_hLong=true;};window.processOpenPositionRealtime({id:'_aLTP',side:'buy',entry:1.0,tp:1.1,sl:0.9,symbol:'TESTUSDT',qty:1},1.11,Date.now());window.addTradeToHistory=_ah;if(!_hLong)bl.push('19: long TP not fired');}catch(e){bl.push('19: long TP test error');}
  try{var _hLS=false;var _ah2=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aLSL')_hLS=true;};window.processOpenPositionRealtime({id:'_aLSL',side:'buy',entry:1.0,tp:1.1,sl:0.9,symbol:'TESTUSDT',qty:1},0.89,Date.now());window.addTradeToHistory=_ah2;if(!_hLS)bl.push('20: long SL not fired');}catch(e){bl.push('20: long SL test error');}
  try{var _hST=false;var _ah3=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aSTP')_hST=true;};window.processOpenPositionRealtime({id:'_aSTP',side:'sell',entry:1.0,tp:0.9,sl:1.1,symbol:'TESTUSDT',qty:1},0.89,Date.now());window.addTradeToHistory=_ah3;if(!_hST)bl.push('21: short TP not fired');}catch(e){bl.push('21: short TP test error');}
  try{var _hSS=false;var _ah4=window.addTradeToHistory;window.addTradeToHistory=function(t){if(t&&t.id==='_aSSL')_hSS=true;};window.processOpenPositionRealtime({id:'_aSSL',side:'sell',entry:1.0,tp:0.9,sl:1.1,symbol:'TESTUSDT',qty:1},1.11,Date.now());window.addTradeToHistory=_ah4;if(!_hSS)bl.push('22: short SL not fired');}catch(e){bl.push('22: short SL test error');}
  try{var pnl=window.calcPaperPnl({side:'buy',entry:100,qty:1},110);if(!pnl||Math.abs((pnl.pnl||0)-10)>0.001)bl.push('23: calcPaperPnl buy result incorrect');}catch(e){bl.push('23: calcPaperPnl test error');}
  try{var pnl2=window.calcPaperPnl({side:'sell',entry:100,qty:1},90);if(!pnl2||Math.abs((pnl2.pnl||0)-10)>0.001)bl.push('24: calcPaperPnl sell result incorrect');}catch(e){bl.push('24: calcPaperPnl sell test error');}
  if(!window.DVL_LAST_PRICE_BY_SYMBOL||typeof window.DVL_LAST_PRICE_BY_SYMBOL!=='object')bl.push('25: DVL_LAST_PRICE_BY_SYMBOL not an object');
  if(typeof window.closePaperTradeToHistory!=='function')bl.push('29: closePaperTradeToHistory missing');
  try{var _store=window.DVL_PAPER_TRADE_STORE;if(_store){var _th=_store.tradeHistory||[];var _ids={};var _dup=false;_th.forEach(function(t){if(t&&t.id){if(_ids[t.id])_dup=true;_ids[t.id]=true;}});if(_dup)bl.push('30: tradeHistory has duplicate ids');if(_store.tradeHistory&&_store.tradeHistory.length>100)bl.push('31: tradeHistory exceeds 100');}}catch(e){}
  if(!window.DVL_PAPER_REALTIME_ENGINE||!window.DVL_PAPER_REALTIME_ENGINE.version)bl.push('04b: engine version missing');
  else if(window.DVL_PAPER_REALTIME_ENGINE.version!=='0.762')bl.push('04c: engine version is not 0.762');
  if(!window.DVL_PAPER_TRADE_STORE||typeof window.DVL_PAPER_TRADE_STORE.pendingOrders==='undefined')bl.push('36: store.pendingOrders not accessible');
  if(!window.DVL_PAPER_TRADE_STORE||typeof window.DVL_PAPER_TRADE_STORE.openPositions==='undefined')bl.push('37: store.openPositions not accessible');
  if(typeof window.renderPositionsPanelRealtime!=='function')bl.push('38: renderPositionsPanelRealtime missing');
  return{pass:bl.length===0,blockers:bl,version:'0.762',checks:39};
}};
})();
