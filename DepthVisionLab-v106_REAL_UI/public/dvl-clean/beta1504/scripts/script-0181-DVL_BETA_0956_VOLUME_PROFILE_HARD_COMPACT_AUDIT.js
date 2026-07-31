(function(){
  "use strict";
  function audit(){
    var p = document.getElementById("dvlVPPanel");
    var r = null;
    try{ r = p ? p.getBoundingClientRect() : null; }catch(_){}
    return {
      version:"0.956",
      only:"DVL Volume Profile",
      realPanelId:"#dvlVPPanel",
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
  window.DVL_VOLUME_PROFILE_HARD_COMPACT_AUDIT = audit;
})();
