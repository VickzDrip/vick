(function(){
"use strict";
window.DVL_DEMO_WALLET_REALTIME_EXECUTION_AUDIT_0764={run:function(){
  var bl=[];
  if(document.title.indexOf('0.764')<0)bl.push('01: title missing 0.764');
  if(document.body.innerHTML.indexOf('BETA 0.875')<0)bl.push('02: badge missing 0.764');
  if(document.body.innerHTML.indexOf('Beta 0.764')<0)bl.push('03: changelog missing 0.764');
  if(!window.DVL_PAPER_EXECUTION_ENGINE)bl.push('04: DVL_PAPER_EXECUTION_ENGINE missing');
  if(!window.DVL_LAST_PRICE_BY_SYMBOL)bl.push('05: DVL_LAST_PRICE_BY_SYMBOL missing');
  if(typeof window.getPaperSymbolsToWatch==='undefined'&&typeof window.getPaperSymbolsToMonitor==='undefined')bl.push('06: getPaperSymbolsToWatch missing');
  if(typeof window.processPendingOrderRealtime!=='function')bl.push('07: processPendingOrderRealtime missing');
  if(typeof window.processOpenPositionRealtime!=='function')bl.push('08: processOpenPositionRealtime missing');
  if(typeof window.onPaperSymbolPrice!=='function'&&typeof window.onPaperPriceTick!=='function')bl.push('09: price tick function missing');
  if(typeof window.processPaperRealtimeTick!=='function'&&typeof window.processPaperSymbolExecution!=='function')bl.push('10: symbol execution function missing');
  if(typeof window.renderPositionsPanelRealtime!=='function')bl.push('11: renderPositionsPanelRealtime missing');
  if(!window.DVL_PAPER_TRADE_STORE)bl.push('12: DVL_PAPER_TRADE_STORE missing');
  if(typeof window.closePaperTradeToHistory!=='function')bl.push('13: closePaperTradeToHistory missing');
  if(!window.DVL_DEMO_WALLET)bl.push('15: DVL_DEMO_WALLET missing');
  var w=window.DVL_DEMO_WALLET;
  if(w){
    if(typeof w.balance!=='number')bl.push('16: wallet.balance not a number');
    if(typeof w.availableBalance!=='number')bl.push('17: wallet.availableBalance not a number');
    if(typeof w.usedMargin!=='number')bl.push('18: wallet.usedMargin not a number');
    if(typeof w.equity!=='number')bl.push('19: wallet.equity not a number');
    if(typeof w.unrealizedPnl!=='number')bl.push('20: wallet.unrealizedPnl not a number');
    if(typeof w.realizedPnl!=='number')bl.push('21: wallet.realizedPnl not a number');
    if(typeof w.totalFees!=='number')bl.push('22: wallet.totalFees not a number');
  }
  if(typeof window.addTradeToHistory!=='function')bl.push('26: addTradeToHistory missing');
  try{var pd=window.calcPaperPnl({side:'buy',entry:100,qty:1},110);if(!pd||Math.abs((pd.pnl||0)-10)>0.001)bl.push('23: calcPaperPnl buy incorrect');}catch(e){bl.push('23: calcPaperPnl threw');}
  try{var pd2=window.calcPaperPnl({side:'sell',entry:100,qty:1},90);if(!pd2||Math.abs((pd2.pnl||0)-10)>0.001)bl.push('24: calcPaperPnl sell incorrect');}catch(e){bl.push('24: calcPaperPnl sell threw');}
  if(document.body.innerHTML.indexOf('>Fee <span class="tiny">')<0)bl.push('34: Fee button missing');
  if(document.body.innerHTML.indexOf('>Tax <span')>=0)bl.push('33: Tax button still present - should be Fee');
  if(!window.DVL_DEMO_FEE_CONFIG)bl.push('35: DVL_DEMO_FEE_CONFIG missing');
  var fc=window.DVL_DEMO_FEE_CONFIG;
  if(fc){
    if(Math.abs(fc.makerFeeRate-0.0002)>1e-9)bl.push('36: makerFeeRate should be 0.0002');
    if(Math.abs(fc.takerFeeRate-0.0005)>1e-9)bl.push('37: takerFeeRate should be 0.0005');
  }
  try{var r=window.processPendingOrderRealtime({side:'buy',orderType:'Limit',entry:1.0},0.99,Date.now());if(!r)bl.push('09b: buy limit should trigger at price<=entry');}catch(e){bl.push('09c: processPendingOrderRealtime threw');}
  try{var r2=window.processPendingOrderRealtime({side:'sell',orderType:'Limit',entry:1.0},1.01,Date.now());if(!r2)bl.push('09d: sell limit should trigger at price>=entry');}catch(e){bl.push('09e: sell limit threw');}
  try{var r3=window.processPendingOrderRealtime({side:'buy',orderType:'stop',entry:1.0},1.01,Date.now());if(!r3)bl.push('09f: buy stop should trigger at price>=entry');}catch(e){bl.push('09g: buy stop threw');}
  try{var r4=window.processPendingOrderRealtime({side:'sell',orderType:'stop',entry:1.0},0.99,Date.now());if(!r4)bl.push('09h: sell stop should trigger at price<=entry');}catch(e){bl.push('09i: sell stop threw');}
  try{var fn=String(window.closePaperTradeToHistory||'');
    if(fn.indexOf('grossPnl')<0)bl.push('28: closePaperTradeToHistory missing grossPnl');
    if(fn.indexOf('entryFee')<0)bl.push('29: closePaperTradeToHistory missing entryFee');
    if(fn.indexOf('exitFee')<0)bl.push('30: closePaperTradeToHistory missing exitFee');
    if(fn.indexOf('totalFee')<0)bl.push('31: closePaperTradeToHistory missing totalFee');
    if(fn.indexOf('netPnl')<0)bl.push('32: closePaperTradeToHistory missing netPnl');
  }catch(_){}
  try{var fn2=String(window.processPendingOrderRealtime||'');if(fn2.indexOf('applyEntryFee')<0)bl.push('25: processPendingOrderRealtime missing applyEntryFee call');}catch(_){}
  try{var _store=window.DVL_PAPER_TRADE_STORE;if(_store){var _th=_store.tradeHistory||[];if(_th.length>100)bl.push('39: tradeHistory exceeds 100');var _ids={};var _dup=false;_th.forEach(function(t){if(t&&t.id){if(_ids[t.id])_dup=true;_ids[t.id]=true;}});if(_dup)bl.push('40: tradeHistory has duplicate ids');}}catch(e){}
  if(!window.DVL_POSITION_DETAILS_PANEL_0724)bl.push('41: DVL_POSITION_DETAILS_PANEL_0724 missing - 0.763 regression');
  if(typeof window.DVL_POSITIONS_REFRESH!=='function')bl.push('42: DVL_POSITIONS_REFRESH missing');
  if(typeof window.saveDemoWallet!=='function')bl.push('43: saveDemoWallet missing');
  if(window.DVL_PAPER_EXECUTION_ENGINE&&window.DVL_PAPER_EXECUTION_ENGINE.version!=='0.764')bl.push('04b: engine version is not 0.764');
  if(document.body.innerHTML.toLowerCase().indexOf('broker connector')>=0)bl.push('44: Broker Connector found — must not exist');
  return{pass:bl.length===0,blockers:bl,version:'0.764',checks:46};
}};
})();
