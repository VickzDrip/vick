(function(){
  "use strict";

  function tfMs(tf){
    const m = String(tf || "").trim().toLowerCase().match(/^(\d+)(m|h|d|w)$/);
    if(!m) return Number.MAX_SAFE_INTEGER;
    const n = Math.max(1, Number(m[1]) || 1);
    const u = m[2];
    return u === "m" ? n : u === "h" ? n * 60 : u === "d" ? n * 1440 : n * 10080;
  }

  function sortList(list){
    return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean)))
      .sort((a,b) => tfMs(a) - tfMs(b) || String(a).localeCompare(String(b)));
  }

  function sortStoredFavorites(){
    try{
      const raw = JSON.parse(localStorage.getItem("DVL_FAVORITE_TIMEFRAMES") || "[]");
      if(Array.isArray(raw) && raw.length){
        const sorted = sortList(raw);
        localStorage.setItem("DVL_FAVORITE_TIMEFRAMES", JSON.stringify(sorted));
        if(typeof favoriteTimeframes !== "undefined") favoriteTimeframes = sorted;
      }else if(typeof favoriteTimeframes !== "undefined"){
        favoriteTimeframes = sortList(favoriteTimeframes);
      }
    }catch(_){
      try{
        if(typeof favoriteTimeframes !== "undefined") favoriteTimeframes = sortList(favoriteTimeframes);
      }catch(__){}
    }
  }

  function sortHotbarDom(){
    const row = document.querySelector(".tfMainRow, .tfRow");
    if(!row) return;
    const buttons = Array.from(row.querySelectorAll(".tfBtn[data-interval]"));
    buttons.sort((a,b) => tfMs(a.dataset.interval) - tfMs(b.dataset.interval));
    buttons.forEach(btn => row.appendChild(btn));
  }

  function apply(){
    sortStoredFavorites();
    try{
      if(typeof renderTimeframeHotbar === "function") renderTimeframeHotbar();
    }catch(_){
      sortHotbarDom();
    }
    sortHotbarDom();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();

  window.DVLTimeframeHotbarStandard = {
    version:"0.577",
    sort:"ascending",
    apply
  };
})();
