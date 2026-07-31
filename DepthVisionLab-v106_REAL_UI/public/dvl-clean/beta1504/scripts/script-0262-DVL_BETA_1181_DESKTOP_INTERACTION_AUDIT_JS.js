(function(){
  "use strict";
  window.DVL_DESKTOP_INTERACTION_1181={
    version:"1.183",
    audit:function(){
      var tf=document.getElementById("dvl1b_tfDropBtn");
      var cp=document.getElementById("dvlCopilotPage0974");
      return {
        version:String(window.DVL_APP_VERSION||""),
        tfButtonFound:!!tf,
        tfMenuFound:!!document.getElementById("dvl1b_tfDropMenu"),
        tfExpanded:tf?tf.getAttribute("aria-expanded"):null,
        copilotOpen:!!(cp&&cp.classList.contains("is-open")),
        desktopHoverCrosshair:!!window.__dvlDesktopHoverCrosshair,
        drawScheduler:"single-pending-frame"
      };
    }
  };
})();
