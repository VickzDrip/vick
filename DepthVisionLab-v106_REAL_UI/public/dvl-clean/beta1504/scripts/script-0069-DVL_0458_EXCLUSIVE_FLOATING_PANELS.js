(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function(){
    const panelMap = {
      tf: {
        wrap: document.getElementById("tfMoreWrap"),
        menu: document.getElementById("tfMoreMenu"),
        btn: document.getElementById("tfMoreBtn"),
        stateName: "tfMoreOpen"
      },
      candles: {
        wrap: document.getElementById("candleTypeWrap"),
        menu: document.getElementById("candleTypeMenu"),
        btn: document.getElementById("candleTypeBtn")
      },
      fx: {
        wrap: document.getElementById("fxIndicatorWrap"),
        menu: document.getElementById("indicatorDropdown"),
        btn: document.getElementById("toggleIndicators"),
        stateName: "indicatorsDropdownOpen"
      },
      assetDropdown: {
        wrap: document.querySelector(".marketRow"),
        menu: document.getElementById("assetDropdown"),
        btn: document.getElementById("symbolBtn"),
        stateName: "assetDropdownOpen"
      },
      assetFavorites: {
        wrap: document.getElementById("assetFavoritesDrawer"),
        menu: document.getElementById("assetFavoritesDrawer"),
        btn: document.getElementById("assetsNavBtn"),
        stateName: "assetFavoritesOpen"
      },
      chartSettings: {
        wrap: document.querySelector(".chartMiniControls"),
        menu: document.getElementById("chartSettingsPanel"),
        btn: document.getElementById("chartSettingsBtn")
      },
      drawTools: {
        wrap: document.getElementById("assetToolsShell"),
        menu: document.getElementById("assetToolsMenu"),
        btn: document.getElementById("assetToolsGear")
      }
    };

    function setGlobalState(name, value){
      if(!name) return;
      try{ window[name] = value; }catch(e){}
      try{ eval(name + " = " + (value ? "true" : "false")); }catch(e){}
    }

    function closePanel(key){
      const p = panelMap[key];
      if(!p) return;

      if(p.wrap) p.wrap.classList.remove("is-open");
      if(p.btn){
        p.btn.classList.remove("is-active");
        if(key === "assetFavorites") p.btn.classList.remove("active");
        if(key === "fx") p.btn.setAttribute("aria-expanded", "false");
        if(key === "candles") p.btn.setAttribute("aria-expanded", "false");
      }
      if(p.menu) p.menu.setAttribute("aria-hidden", "true");

      if(key === "assetDropdown" && p.menu) p.menu.classList.remove("is-open");
      if(key === "assetFavorites" && p.menu) p.menu.classList.remove("is-open");
      if(key === "chartSettings" && p.menu) p.menu.classList.remove("is-open");
      if(key === "drawTools"){
        try{ window.dvlCloseDrawToolsMenu?.(); }catch(e){}
      }

      setGlobalState(p.stateName, false);
    }

    function closeAllExcept(exceptKey){
      Object.keys(panelMap).forEach(key => {
        if(key !== exceptKey) closePanel(key);
      });
    }

    const triggers = [
      ["tf", panelMap.tf.btn],
      ["candles", panelMap.candles.btn],
      ["fx", panelMap.fx.btn],
      ["assetDropdown", panelMap.assetDropdown.btn],
      ["assetFavorites", panelMap.assetFavorites.btn],
      ["chartSettings", panelMap.chartSettings.btn],
      ["drawTools", panelMap.drawTools.btn]
    ];

    triggers.forEach(([key, btn]) => {
      if(!btn) return;

      // pointerdown capture closes other panels BEFORE the clicked panel toggles.
      btn.addEventListener("pointerdown", function(){
        closeAllExcept(key);
      }, true);

      btn.addEventListener("click", function(){
        closeAllExcept(key);
      }, true);
    });

    // When clicking inside one panel, keep it but close the others.
    Object.entries(panelMap).forEach(([key, p]) => {
      if(!p.menu) return;
      p.menu.addEventListener("pointerdown", function(){
        closeAllExcept(key);
      }, true);
    });

    window.dvlCloseFloatingPanelsExcept = closeAllExcept;
  });
})();
