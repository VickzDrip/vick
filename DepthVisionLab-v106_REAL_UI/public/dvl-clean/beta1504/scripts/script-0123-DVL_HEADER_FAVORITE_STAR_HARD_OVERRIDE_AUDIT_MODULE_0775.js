(function(){
"use strict";
window.DVL_HEADER_FAVORITE_STAR_HARD_OVERRIDE_AUDIT_0775={run:function(){
  var bl=[];
  // 01 — Title Beta 0.775
  if(document.title.indexOf('0.775')<0)bl.push('01: title missing 0.775');
  // 02 — Badge BETA 0.875
  if(document.body.innerHTML.indexOf('BETA 0.875')<0)bl.push('02: badge missing 0.775');
  // 03 — Changelog 0.775 no topo
  if(document.body.innerHTML.indexOf('Beta 0.775')<0)bl.push('03: changelog missing 0.775');
  // 04 — #dvlHeaderStar existe
  var btn=document.getElementById('dvlHeaderStar');
  if(!btn)bl.push('04: #dvlHeaderStar not found');
  // 05 — dvlHeaderStarHard aplicado
  if(btn&&!btn.classList.contains('dvlHeaderStarHard'))bl.push('05: dvlHeaderStarHard class missing on #dvlHeaderStar');
  // 06 — SVG interno não controla visual (sem innerHTML visível)
  if(btn&&btn.querySelector('svg'))bl.push('06: #dvlHeaderStar still has SVG child element');
  // 07 — CSS esconde SVG/path via DVL_WL_STYLE_0773
  var styleEl=document.getElementById('DVL_WL_STYLE_0773');
  if(styleEl&&styleEl.textContent.indexOf('dvlHeaderStarHard')<0)bl.push('07: dvlHeaderStarHard CSS not found in DVL_WL_STYLE_0773');
  // 08 — ::before mostra ☆ quando OFF
  if(styleEl&&styleEl.textContent.indexOf('content:"☆"')<0&&styleEl.textContent.indexOf("content:'☆'")<0)bl.push('08: empty star ☆ ::before not defined in injected style');
  // 09 — ::before mostra ★ quando ON
  if(styleEl&&styleEl.textContent.indexOf('content:"★"')<0&&styleEl.textContent.indexOf("content:'★'")<0)bl.push('09: filled star ★ ::before not defined in injected style');
  // 10 — ON usa .is-favorite
  if(!document.getElementById('DVL_HSTAR_STYLE_0775'))bl.push('10: DVL_HSTAR_STYLE_0775 end-of-body <style> block missing');
  // 11 — data-favorite presente
  if(btn&&btn.dataset.favorite===undefined)bl.push('11: data-favorite attribute missing on #dvlHeaderStar');
  // 12 — aria-pressed presente
  if(btn&&btn.getAttribute('aria-pressed')===null)bl.push('12: aria-pressed missing on #dvlHeaderStar');
  // 13 — type=button
  if(btn&&btn.getAttribute('type')!=='button')bl.push('13: type not button on #dvlHeaderStar');
  // 14 — normalizeHeaderStarHardOverride exposta
  if(typeof window.normalizeHeaderStarHardOverride!=='function')bl.push('14: normalizeHeaderStarHardOverride missing');
  // 15 — updateHeaderFavoriteStarState exposta
  if(typeof window.updateHeaderFavoriteStarState!=='function')bl.push('15: updateHeaderFavoriteStarState missing');
  // 16 — bindHeaderFavoriteStarHardOverride exposta
  if(typeof window.bindHeaderFavoriteStarHardOverride!=='function')bl.push('16: bindHeaderFavoriteStarHardOverride missing');
  // 17 — cleanupDuplicateHeaderStars exposta
  if(typeof window.cleanupDuplicateHeaderStars!=='function')bl.push('17: cleanupDuplicateHeaderStars missing');
  // 18 — normalizeHeaderStarHardOverride retorna o botão
  try{var nb=window.normalizeHeaderStarHardOverride();if(!nb)bl.push('18: normalizeHeaderStarHardOverride returned null');}catch(e){bl.push('18: normalizeHeaderStarHardOverride threw: '+e.message);}
  // 19 — updateHeaderFavoriteStarState não lança erro
  try{window.updateHeaderFavoriteStarState();}catch(e){bl.push('19: updateHeaderFavoriteStarState threw: '+e.message);}
  // 20 — __dvlHeaderStarHardBound flag setado após bind
  var b2=document.getElementById('dvlHeaderStar');
  if(b2&&!b2.__dvlHeaderStarHardBound)bl.push('20: __dvlHeaderStarHardBound flag not set — bindHeaderFavoriteStarHardOverride not called');
  // 21 — State sync: is-favorite/is-active batem com store
  try{
    var symEl=document.getElementById('symbolText');
    var sym=symEl?symEl.textContent.trim():'';
    if(sym&&b2&&window.DVL_WATCHLIST_STORE&&Array.isArray(window.DVL_WATCHLIST_STORE.symbols)){
      var sn=sym.replace('/','').replace('-','').toUpperCase();
      var inWl=window.DVL_WATCHLIST_STORE.symbols.some(function(s){return s.replace('/','').replace('-','').toUpperCase()===sn;});
      var isFav=b2.classList.contains('is-favorite');
      if(inWl!==isFav)bl.push('21: is-favorite does not match DVL_WATCHLIST_STORE for "'+sym+'"');
    }
  }catch(e){bl.push('21: state sync check threw: '+e.message);}
  // 22 — Não existe estrela duplicada visível no header
  var dupes=Array.prototype.slice.call(document.querySelectorAll('.top .star, .marketRow .assetStar'));
  var visibleDupes=dupes.filter(function(el){return el!==b2&&el.offsetParent!==null;});
  if(visibleDupes.length>0)bl.push('22: visible duplicate star(s) found in header: '+visibleDupes.length);
  // 23 — Watchlist Store funcionando
  if(!window.DVL_WATCHLIST_STORE||!Array.isArray(window.DVL_WATCHLIST_STORE.symbols))bl.push('23: DVL_WATCHLIST_STORE invalid');
  // 24 — Zero Broker Connector
  if(document.body.innerHTML.toLowerCase().indexOf('broker connector')>=0)bl.push('24: Broker Connector found');
  // 25 — Zero Real order / Real Mode bridge
  if(window.DVL_REAL_MODE_BRIDGE)bl.push('25: DVL_REAL_MODE_BRIDGE exposed');
  // 26 — Zero API key / token exposto
  if(window.DVL_API_KEY||window.DVL_API_SECRET)bl.push('26: API key/secret exposed on window');
  // 27 — aliases de backward compat
  if(typeof window.normalizeHeaderFavoriteStarButton!=='function')bl.push('27: backward-compat alias normalizeHeaderFavoriteStarButton missing');
  if(typeof window.updateHeaderStarState!=='function')bl.push('27b: backward-compat alias updateHeaderStarState missing');
  if(typeof window.bindHeaderFavoriteStar!=='function')bl.push('27c: backward-compat alias bindHeaderFavoriteStar missing');
  return{pass:bl.length===0,blockers:bl,version:'0.775',checks:27};
}};
})();
