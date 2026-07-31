(function(){
  "use strict";

  var VERSION = "Beta 1.529";
  var BVERSION = "BETA 1.529";

  window.DVL_APP_VERSION = VERSION;

  function sync(){
    try{ document.title = "DVL - " + VERSION; }catch(_){}

    try{
      var ids = ["dvl1b_versionBadge", "versionBadge"];
      ids.forEach(function(id){
        var el = document.getElementById(id);
        if(el) el.textContent = BVERSION;
      });
    }catch(_){}
  }

  sync();
  document.addEventListener("DOMContentLoaded", sync);
  setTimeout(sync, 0);
  setTimeout(sync, 300);
  setTimeout(sync, 1200);
  setInterval(sync, 4000);

  /* Mata cache local/service worker velho que pode ressuscitar HTML antigo. */
  try{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.getRegistrations().then(function(regs){
        regs.forEach(function(r){ try{ r.unregister(); }catch(_){} });
      }).catch(function(){});
    }
  }catch(_){}

  try{
    if(window.caches && caches.keys){
      caches.keys().then(function(keys){
        keys.forEach(function(k){ try{ caches.delete(k); }catch(_){} });
      }).catch(function(){});
    }
  }catch(_){}

  /* Impede banner/auto-update antigo de rebaixar para build menor. */
  window.__DVL_VER_GUARD = true;
  window.__DVL_BETA_1529_VERSION_LOCK = true;
})();
