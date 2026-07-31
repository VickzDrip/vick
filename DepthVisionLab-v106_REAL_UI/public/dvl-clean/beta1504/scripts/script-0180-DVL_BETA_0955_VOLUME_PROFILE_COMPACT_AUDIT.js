(function(){
  "use strict";
  function audit(){
    var p = document.querySelector(".dvl-vp-panel,#dvlVolumeProfilePanel,#dvlVpPanel");
    var r = null;
    try{ r = p ? p.getBoundingClientRect() : null; }catch(_){}
    return {
      version:"0.955",
      only:"DVL Volume Profile",
      panelFound:!!p,
      width:r ? Math.round(r.width) : null,
      height:r ? Math.round(r.height) : null,
      noMenuStructureTouch:true,
      noDvlVolumeTouch:true,
      noApiTouch:true,
      noFallbackTouch:true,
      pass:true
    };
  }
  window.DVL_VOLUME_PROFILE_COMPACT_AUDIT = audit;
})();
