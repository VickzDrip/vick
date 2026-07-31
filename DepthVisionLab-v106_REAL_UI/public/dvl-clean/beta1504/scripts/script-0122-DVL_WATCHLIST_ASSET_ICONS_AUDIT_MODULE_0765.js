(function(){
"use strict";
window.DVL_WATCHLIST_ASSET_ICONS_AUDIT_0765={run:function(){
  var bl=[];
  if(document.title.indexOf('0.765')<0)bl.push('01: title missing 0.765');
  if(document.body.innerHTML.indexOf('BETA 0.875')<0)bl.push('02: badge missing 0.765');
  if(document.body.innerHTML.indexOf('Beta 0.765')<0)bl.push('03: changelog missing 0.765');
  if(!window.DVL_ASSET_REGISTRY)bl.push('04: DVL_ASSET_REGISTRY missing');
  if(typeof window.getAssetIconMeta!=='function')bl.push('05: getAssetIconMeta missing');
  if(typeof window.renderAssetIcon!=='function')bl.push('06: renderAssetIcon missing');
  try{var m=window.getAssetIconMeta('BTCUSDT');if(!m||m.className!=='coin-btc')bl.push('07: BTC icon className incorrect');}catch(e){bl.push('07: getAssetIconMeta BTC threw');}
  try{var m2=window.getAssetIconMeta('ETHUSDT');if(!m2||m2.className!=='coin-eth')bl.push('08: ETH icon className incorrect');}catch(e){bl.push('08: getAssetIconMeta ETH threw');}
  try{var m3=window.getAssetIconMeta('ADAUSDT');if(!m3||m3.className!=='coin-ada')bl.push('09: ADA icon className incorrect');}catch(e){bl.push('09: getAssetIconMeta ADA threw');}
  try{var m4=window.getAssetIconMeta('SOLUSDT');if(!m4||m4.className!=='coin-sol')bl.push('10: SOL icon className incorrect');}catch(e){bl.push('10: getAssetIconMeta SOL threw');}
  try{var m5=window.getAssetIconMeta('XYZUSDT');if(!m5||m5.className!=='coin-generic')bl.push('11: unknown asset should use coin-generic');}catch(e){bl.push('11: getAssetIconMeta generic threw');}
  try{var html=window.renderAssetIcon('ETHUSDT');if(html.indexOf('coin-eth')<0)bl.push('12: renderAssetIcon ETH missing coin-eth class');}catch(e){bl.push('12: renderAssetIcon threw');}
  try{var html2=window.renderAssetIcon('BTCUSDT');if(html2.indexOf('coin-btc')<0)bl.push('13: renderAssetIcon BTC missing coin-btc class');}catch(e){bl.push('13: renderAssetIcon BTC threw');}
  if(!window.DVL_WATCHLIST_STORE)bl.push('15: DVL_WATCHLIST_STORE missing');
  if(!window.DVL_WATCHLIST)bl.push('16: DVL_WATCHLIST missing');
  if(typeof window.loadWatchlist!=='function')bl.push('17: loadWatchlist missing');
  if(typeof window.saveWatchlist!=='function')bl.push('18: saveWatchlist missing');
  if(typeof window.toggleWatchlist!=='function')bl.push('19: toggleWatchlist missing');
  if(typeof window.isInWatchlist!=='function')bl.push('20: isInWatchlist missing');
  if(typeof window.addToWatchlist!=='function')bl.push('21: addToWatchlist missing');
  if(typeof window.removeFromWatchlist!=='function')bl.push('22: removeFromWatchlist missing');
  try{window.addToWatchlist('TESTUSDT');if(!window.isInWatchlist('TESTUSDT'))bl.push('23a: addToWatchlist not working');window.removeFromWatchlist('TESTUSDT');if(window.isInWatchlist('TESTUSDT'))bl.push('23b: removeFromWatchlist not working');}catch(e){bl.push('23: watchlist crud threw');}
  if(typeof window.openWatchlistPanel!=='function')bl.push('24: openWatchlistPanel missing');
  if(typeof window.closeWatchlistPanel!=='function')bl.push('25: closeWatchlistPanel missing');
  if(typeof window.renderWatchlistPanel!=='function')bl.push('26: renderWatchlistPanel missing');
  if(typeof window.updateHeaderIconAndStar!=='function')bl.push('27: updateHeaderIconAndStar missing');
  try{window.renderWatchlistPanel();var p=document.getElementById('dvlWatchlistPanel');if(!p)bl.push('28: dvlWatchlistPanel not created by renderWatchlistPanel');}catch(e){bl.push('28: renderWatchlistPanel threw');}
  if(document.querySelector('[data-dvl-nav-key="watchlist"]')&&!document.querySelector('#dvlBottomNavV2[data-wl-nav-bound]'))bl.push('29: footer watchlist nav not wl-bound (wire may have failed)');
  if(!document.getElementById('dvlHeaderStar'))bl.push('30: #dvlHeaderStar missing');
  if(document.getElementById('dvlHeaderStar')&&!document.getElementById('dvlHeaderStar').classList.contains('dvlHeaderStarHard'))bl.push('30b: #dvlHeaderStar missing dvlHeaderStarHard class');
  if(typeof window.normalizeHeaderStarHardOverride!=='function')bl.push('30c: normalizeHeaderStarHardOverride missing');
  if(typeof window.updateHeaderFavoriteStarState!=='function')bl.push('30d: updateHeaderFavoriteStarState missing');
  if(typeof window.bindHeaderFavoriteStarHardOverride!=='function')bl.push('30e: bindHeaderFavoriteStarHardOverride missing');
  var wls=window.DVL_WATCHLIST_STORE;if(wls&&!Array.isArray(wls.symbols))bl.push('31: DVL_WATCHLIST_STORE.symbols not an array');
  if(!window.DVL_PAPER_EXECUTION_ENGINE&&!window.DVL_PAPER_REALTIME_ENGINE)bl.push('33: execution engine missing - 0.764 regression');
  if(!window.DVL_DEMO_WALLET)bl.push('34: DVL_DEMO_WALLET missing - 0.764 regression');
  if(!window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722)bl.push('35: positions overlay missing - 0.763 regression');
  if(!window.DVL_POSITION_DETAILS_PANEL_0724)bl.push('36: positions detail panel missing - 0.763 regression');
  if(document.body.innerHTML.toLowerCase().indexOf('broker connector')>=0)bl.push('37: Broker Connector found');
  return{pass:bl.length===0,blockers:bl,version:'0.765',checks:38};
}};
})();
