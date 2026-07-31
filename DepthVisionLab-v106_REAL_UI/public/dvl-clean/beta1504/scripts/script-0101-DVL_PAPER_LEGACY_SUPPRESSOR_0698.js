(function(){
"use strict";
// Beta 0.698: legacy paper runtime suppressed. V2 Pro (0.697) is the sole Paper system.
window.__DVL_PAPER_LEGACY_SUPPRESSED__ = true;
// Override any globally-exposed legacy paper functions (defense-in-depth)
var _noop = function(){};
var _legacyFns = [
  'startOrder','createPendingOrderDraft','confirmPendingOrderDraft',
  'cancelPendingOrderDraft','cancelPendingOrder','renderDraftPosition',
  'renderDraftConfirm','renderPosition','renderEditConfirm'
];
_legacyFns.forEach(function(fn){ if(typeof window[fn]==='function') window[fn]=_noop; });
// Hide legacy layer on DOM ready
function _hideLegacyLayer(){
  var l=document.getElementById('dvlPaperLayer');
  if(l){ l.style.cssText='display:none!important;pointer-events:none!important;visibility:hidden!important'; }
}
if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',_hideLegacyLayer,{once:true});
else _hideLegacyLayer();
})();
