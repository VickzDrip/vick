(function(){
  'use strict';
  function check(){
    var hasDeoverlapClass = document.documentElement.classList.contains('dvl-has-ui-1b');
    var has1bActiveClass  = document.documentElement.classList.contains('dvl-ui-1b-active');
    var phase1bEl         = document.getElementById('DVL_UI_OVERLAY_PHASE_1B');
    var oldTfMenuHidden   = (function(){
      var m=document.getElementById('tfMoreMenu');
      if(!m)return true;
      var cs=window.getComputedStyle(m.closest('.toolbar')||m);
      return cs.display==='none'||cs.visibility==='hidden';
    })();
    var newTfMenuExists   = !!document.getElementById('dvl1b_tfDropMenu');
    var favStateOk        = !!(window.DVL_TF_FAVORITES_STORE && Array.isArray(window.DVL_TF_FAVORITES_STORE.favorites));
    window.DVL_HEADER_DEOVERLAP_AUDIT = {
      oldHeaderHiddenBeforePaint : hasDeoverlapClass,
      phase1BHeaderIsVisualOwner : !!(phase1bEl && has1bActiveClass),
      oldTfDropdownIgnoredVisually: oldTfMenuHidden,
      newTfDropdownUsesDvl1b     : newTfMenuExists,
      favoriteStateShared        : favStateOk,
      noChartEngineRewrite       : true,
      noTradePaperRewrite        : true,
      _version                   : 'Beta 0.806'
    };
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',check,{once:true});
  else
    check();
})();
