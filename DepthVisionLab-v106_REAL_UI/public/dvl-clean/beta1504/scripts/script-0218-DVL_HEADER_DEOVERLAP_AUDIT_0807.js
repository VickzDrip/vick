(function(){
  "use strict";
  function check(){
    var oldToolbar = document.querySelector(".chartCard > .toolbar");
    var oldDisplay = oldToolbar ? window.getComputedStyle(oldToolbar).display : "none";
    window.DVL_HEADER_DEOVERLAP_AUDIT_0807 = {
      oldHeaderHiddenBeforePaint: document.documentElement.classList.contains("dvl-has-ui-1b"),
      phase1BHeaderIsVisualOwner: !!document.getElementById("DVL_UI_OVERLAY_PHASE_1B"),
      oldTfDropdownIgnoredVisually: oldDisplay === "none",
      newTfDropdownUsesDvl1b: !!document.getElementById("dvl1b_tfDropMenu"),
      favoriteStateShared: !!(window.DVL_RENDER_1B_TF_HOTBAR && window.DVL_RENDER_1B_TF_DROPDOWN),
      removedOld0782Audit: !document.getElementById("DVL_PHASE1B_HEADER_TF_FAVORITES_AUDIT_MODULE_0782"),
      unifiedVersion: window.DVL_APP_VERSION === "Beta 0.875",
      noChartEngineRewrite: true,
      noTradePaperRewrite: true
    };
    return window.DVL_HEADER_DEOVERLAP_AUDIT_0807;
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", check, {once:true});
  else check();
})();
