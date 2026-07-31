(function(){
'use strict';
if(window.DVL_PHASE1B_HEADER_STAR_FIX_AUDIT_MODULE_0779)return;
window.DVL_PHASE1B_HEADER_STAR_FIX_AUDIT_MODULE_0779=true;
function runAudit(){
  var bl=[];
  // 1 — Phase 1B overlay exists
  if(!document.getElementById('DVL_UI_OVERLAY_PHASE_1B'))bl.push('1: #DVL_UI_OVERLAY_PHASE_1B missing');
  // 2 — #dvl1b_favBtn exists
  var btn=document.getElementById('dvl1b_favBtn');
  if(!btn)bl.push('2: #dvl1b_favBtn missing');
  // 3 — button has dvl1b-star class (SVG approach)
  if(btn&&!btn.classList.contains('dvl1b-star'))bl.push('3: dvl1b-star class missing on #dvl1b_favBtn');
  // 4 — button has SVG child (SVG-based icon required)
  if(btn&&!btn.querySelector('svg'))bl.push('4: SVG missing inside #dvl1b_favBtn');
  // 5 — SVG path matches watchlist nav star
  if(btn){var svgEl=btn.querySelector('svg');var pathEl=svgEl&&svgEl.querySelector('path');if(!pathEl||pathEl.getAttribute('d').indexOf('M12 3.7')<0)bl.push('5: #dvl1b_favBtn SVG path does not match watchlist star');}
  // 6 — button __dvlPhase1BStarBound flag set
  if(btn&&!btn.__dvlPhase1BStarBound)bl.push('6: __dvlPhase1BStarBound flag not set on #dvl1b_favBtn');
  // 7 — CSS style block exists
  if(!document.getElementById('DVL_P1B_HSTAR_STYLE_0779'))bl.push('7: DVL_P1B_HSTAR_STYLE_0779 style block missing');
  // 8 — forcePhase1BHeaderStarVisual exposed
  if(typeof window.forcePhase1BHeaderStarVisual!=='function')bl.push('8: forcePhase1BHeaderStarVisual missing');
  // 9 — getPhase1BCurrentSymbol exposed
  if(typeof window.getPhase1BCurrentSymbol!=='function')bl.push('9: getPhase1BCurrentSymbol missing');
  // 10 — updatePhase1BHeaderFavoriteStarState exposed
  if(typeof window.updatePhase1BHeaderFavoriteStarState!=='function')bl.push('10: updatePhase1BHeaderFavoriteStarState missing');
  // 11 — bindPhase1BHeaderFavoriteStar exposed
  if(typeof window.bindPhase1BHeaderFavoriteStar!=='function')bl.push('11: bindPhase1BHeaderFavoriteStar missing');
  // 12 — installPhase1BHeaderStarGuard exposed
  if(typeof window.installPhase1BHeaderStarGuard!=='function')bl.push('12: installPhase1BHeaderStarGuard missing');
  // 13 — guard installed flag
  if(!window.__dvlPhase1BHeaderStarGuardInstalled)bl.push('13: __dvlPhase1BHeaderStarGuardInstalled flag not set');
  // 14 — getPhase1BCurrentSymbol returns a string
  try{var s=window.getPhase1BCurrentSymbol();if(typeof s!=='string')bl.push('14: getPhase1BCurrentSymbol did not return string');}catch(e){bl.push('14: getPhase1BCurrentSymbol threw: '+e.message);}
  // 15 — updatePhase1BHeaderFavoriteStarState does not throw
  try{window.updatePhase1BHeaderFavoriteStarState();}catch(e){bl.push('15: updatePhase1BHeaderFavoriteStarState threw: '+e.message);}
  // 16 — forcePhase1BHeaderStarVisual(true) fills SVG yellow (#ffd321)
  try{window.forcePhase1BHeaderStarVisual(true);var b2=document.getElementById('dvl1b_favBtn');var _svg16=b2&&b2.querySelector('svg');var _p16=_svg16&&_svg16.querySelector('path');if(!_svg16||(_svg16.getAttribute('fill')!=='#ffd321'&&(!_p16||_p16.getAttribute('fill')!=='#ffd321')))bl.push('16: forcePhase1BHeaderStarVisual(true) did not set SVG fill to #ffd321');}catch(e){bl.push('16: forcePhase1BHeaderStarVisual(true) threw: '+e.message);}
  // 17 — forcePhase1BHeaderStarVisual(true) sets is-favorite class
  try{var b3=document.getElementById('dvl1b_favBtn');if(b3&&!b3.classList.contains('is-favorite'))bl.push('17: forcePhase1BHeaderStarVisual(true) did not add is-favorite class');}catch(e){bl.push('17: class check threw: '+e.message);}
  // 18 — forcePhase1BHeaderStarVisual(false) sets SVG fill="none" (outline)
  try{window.forcePhase1BHeaderStarVisual(false);var b4=document.getElementById('dvl1b_favBtn');var _svg18=b4&&b4.querySelector('svg');var _p18=_svg18&&_svg18.querySelector('path');if(!_svg18||(_svg18.getAttribute('fill')!=='none'&&(!_p18||_p18.getAttribute('fill')!=='none')))bl.push('18: forcePhase1BHeaderStarVisual(false) did not set SVG fill to none');}catch(e){bl.push('18: forcePhase1BHeaderStarVisual(false) threw: '+e.message);}
  // 19 — forcePhase1BHeaderStarVisual(false) removes is-favorite class
  try{var b5=document.getElementById('dvl1b_favBtn');if(b5&&b5.classList.contains('is-favorite'))bl.push('19: forcePhase1BHeaderStarVisual(false) did not remove is-favorite class');}catch(e){bl.push('19: class check threw: '+e.message);}
  // 20 — aria-pressed set correctly by forcePhase1BHeaderStarVisual
  try{window.forcePhase1BHeaderStarVisual(true);var b6=document.getElementById('dvl1b_favBtn');if(b6&&b6.getAttribute('aria-pressed')!=='true')bl.push('20: aria-pressed not true after forcePhase1BHeaderStarVisual(true)');}catch(e){bl.push('20: aria-pressed check threw: '+e.message);}
  // 21 — data-favorite attribute set
  try{var b7=document.getElementById('dvl1b_favBtn');if(b7&&b7.dataset.favorite!=='true')bl.push('21: data-favorite not true after forcePhase1BHeaderStarVisual(true)');}catch(e){bl.push('21: data-favorite check threw: '+e.message);}
  // 22 — watchlist store exists
  if(!window.DVL_WATCHLIST_STORE||!Array.isArray(window.DVL_WATCHLIST_STORE.symbols))bl.push('22: DVL_WATCHLIST_STORE.symbols missing or not array');
  // 23 — _wlHas/_wlToggle exposed
  if(typeof window.isInWatchlist!=='function')bl.push('23: window.isInWatchlist missing');
  if(typeof window.toggleWatchlist!=='function')bl.push('23b: window.toggleWatchlist missing');
  // 24 — #dvl1b_symbolText exists for symbol read
  if(!document.getElementById('dvl1b_symbolText')&&!document.getElementById('symbolText'))bl.push('24: neither #dvl1b_symbolText nor #symbolText found');
  // 25 — updateHeaderIconAndStar exposed and calls Phase 1B
  if(typeof window.updateHeaderIconAndStar!=='function')bl.push('25: updateHeaderIconAndStar missing');
  // 26 — version badge updated to 0.779
  var vb=document.getElementById('dvl1b_versionBadge');
  if(!vb||vb.textContent.indexOf('0.779')<0)bl.push('26: dvl1b_versionBadge does not show 0.779');
  // 27 — title updated
  if(document.title.indexOf('0.779')<0)bl.push('27: document.title does not contain 0.779');
  // 28 — DVL_APP_VERSION updated
  if(typeof window.DVL_APP_VERSION==='undefined'||String(window.DVL_APP_VERSION).indexOf('0.779')<0)bl.push('28: DVL_APP_VERSION not 0.779');
  // 29 — changelog entry at top
  if(!window.DVL_CHANGELOG||!window.DVL_CHANGELOG[0]||window.DVL_CHANGELOG[0].note.indexOf('0.779')<0)bl.push('29: DVL_CHANGELOG[0] does not reference 0.779');
  // 30 — DVL_P1B_HSTAR_STYLE_0779 block exists (SVG-based star, no text-only rules)
  var styleEl=document.getElementById('DVL_P1B_HSTAR_STYLE_0779');
  if(!styleEl)bl.push('30: DVL_P1B_HSTAR_STYLE_0779 style block missing');
  // 31 — restore state: reset to ☆ after audit
  try{window.updatePhase1BHeaderFavoriteStarState();}catch(_){}
  var pass=bl.length===0;
  window.DVL_PHASE1B_HEADER_STAR_FIX_AUDIT_0779_RESULT={pass:pass,blockers:bl,ts:Date.now()};
  if(pass){console.log('[DVL AUDIT 0779] ✅ ALL 31 CHECKS PASSED — Phase 1B header star fix confirmed');}
  else{console.warn('[DVL AUDIT 0779] ❌ BLOCKERS ('+bl.length+'):\n'+bl.join('\n'));}
  return window.DVL_PHASE1B_HEADER_STAR_FIX_AUDIT_0779_RESULT;
}
window.DVL_PHASE1B_HEADER_STAR_FIX_AUDIT_0779=runAudit;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(runAudit,2500);},{once:true});
else setTimeout(runAudit,2500);
})();
