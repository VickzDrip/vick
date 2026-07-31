(function(){
  "use strict";
  window.__DVL_POS_DOM_OVERLAY = false;

  function clean(){
    var layer = document.getElementById("dvlPosDomLayer");
    if(layer) layer.remove();

    document.querySelectorAll(".assetToolsMenuHead small,.dvl-tool-hint,.dvl-drawing-hint,.toolHint,.drawHint").forEach(function(el){
      el.textContent = "";
      el.style.display = "none";
    });
  }

  window.__dvlSyncPositionDomOverlays = function(){
    window.__DVL_POS_DOM_OVERLAY = false;
    clean();
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", clean);
  else clean();
})();
