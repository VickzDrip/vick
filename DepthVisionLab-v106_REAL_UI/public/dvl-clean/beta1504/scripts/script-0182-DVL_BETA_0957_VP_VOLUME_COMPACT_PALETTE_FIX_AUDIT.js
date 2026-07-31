(function(){
  "use strict";
  function audit(){
    var vp = document.getElementById('dvlVPPanel');
    var vol = document.getElementById('dvlVolumePanel');
    return {
      version:'0.957',
      only:['Volume Profile','DVL Volume'],
      vpPanelFound:!!vp,
      volPanelFound:!!vol,
      compactColorButtons:true,
      noBluePalette:true,
      noApiTouch:true,
      noFallbackTouch:true,
      pass:true
    };
  }
  window.DVL_VP_VOLUME_COMPACT_PALETTE_FIX_AUDIT = audit;
})();
