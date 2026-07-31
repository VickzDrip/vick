(function(){
  "use strict";
  if(window.DVL_INDICATOR_CONFIG_X_SCOPE_GUARD_0863) return;
  window.DVL_INDICATOR_CONFIG_X_SCOPE_GUARD_0863 = true;

  function isConfigTarget(t){
    if(!t || !t.closest) return false;
    return !!t.closest([
      ".dvl-vt-panel",
      ".dvl-exr-panel",
      ".dvl-ma-panel",
      ".dvl-vol-panel",
      ".dvl-sz-panel",
      ".dvl-vp-panel",
      ".dvl-feb-panel",
      ".dvl-tv-panel",
      ".dvl-ind-input-front-0862",
      "[id^='dvl'][id$='Panel']"
    ].join(","));
  }

  document.addEventListener("click", function(e){
    if(!isConfigTarget(e.target)) return;
    /*
      Do not stop the click. The config panel's own X/input handler must run.
      This exists only to mark the event as part of indicator config scope.
    */
  }, true);
})();
