(function(){
  "use strict";

  var VERSION = "Beta 1.530";
  var BVERSION = "BETA 1.530";

  window.__DVL_VER_GUARD = true;
  window.__DVL_BETA_1530_VERSION_LOCK_SAFE = true;
  window.DVL_APP_VERSION = VERSION;

  function sync(){
    try{ document.title = "DVL - " + VERSION; }catch(_){}
    try{
      var a = document.getElementById("dvl1b_versionBadge");
      if(a) a.textContent = BVERSION;
      var b = document.getElementById("versionBadge");
      if(b) b.textContent = BVERSION;
    }catch(_){}
  }

  sync();
  document.addEventListener("DOMContentLoaded", sync);
  setTimeout(sync, 0);
  setTimeout(sync, 300);
  setTimeout(sync, 1200);
})();
