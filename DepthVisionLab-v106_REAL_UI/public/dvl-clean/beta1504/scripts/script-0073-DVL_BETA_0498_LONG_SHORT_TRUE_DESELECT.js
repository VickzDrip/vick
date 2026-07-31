(function(){
  "use strict";

  function shouldKeepSelection(target){
    return !!(target && target.closest && target.closest(
      ".dvl-ls-box,.dvl-ls-entry-magnet,.dvl-ls-controlbar,.dvl-ls-settings,.assetToolsShell,.assetToolsMenu"
    ));
  }

  function isInsideChart(target){
    var wrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
    return !!(wrap && target && wrap.contains(target));
  }

  function forceDeselect(){
    var api = window.__dvlLongShortV2;
    if(api && typeof api.deselect === "function"){
      api.deselect();
      return;
    }

    document.querySelectorAll(".dvl-ls-box.is-selected").forEach(function(el){
      el.classList.remove("is-selected");
    });

    document.querySelectorAll(".dvl-ls-controlbar.is-open,.dvl-ls-settings.is-open").forEach(function(el){
      el.classList.remove("is-open");
    });
  }

  function onPointerDown(ev){
    if(shouldKeepSelection(ev.target)) return;

    var api = window.__dvlLongShortV2;
    if(api && api.mode) return;

    if(isInsideChart(ev.target) || ev.target.id === "dvlLsLayer" || (ev.target.classList && ev.target.classList.contains("dvl-ls-layer"))){
      forceDeselect();
    }
  }

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("touchstart", onPointerDown, true);
})();
