(function(){
  "use strict";
  if(window.DVL_SCANNER_FILTER_SHEET_FIX_1017) return;
  var panelId="dvlScannerPanel0780";
  var VERSION="1.020";

  function panel(){ return document.getElementById(panelId); }
  function menu(){ return document.getElementById("dvlScan1013FilterMenu"); }

  function ensureSheet(){
    var p=panel();
    var m=menu();
    if(!p || !m) return null;
    if(!m.classList.contains("dvlScan1017FilterSheet")){
      m.classList.add("dvlScan1017FilterSheet");
    }
    if(m.parentElement !== p){
      p.appendChild(m);
    }
    if(!m.querySelector(".dvlScan1017FilterTop")){
      var h=m.querySelector("h3");
      if(h){
        h.outerHTML='<div class="dvlScan1017FilterTop"><h3>Filtros</h3><button type="button" class="dvlScan1017Close" data-dvl-scan1017-close>×</button></div>';
      }else{
        m.insertAdjacentHTML("afterbegin",'<div class="dvlScan1017FilterTop"><h3>Filtros</h3><button type="button" class="dvlScan1017Close" data-dvl-scan1017-close>×</button></div>');
      }
    }
    return m;
  }

  function openSheet(){
    var p=panel();
    var m=ensureSheet();
    if(!p || !m) return false;
    m.classList.add("is-open");
    p.classList.add("dvlScan1017FiltersOpen");
    return true;
  }

  function closeSheet(){
    var p=panel();
    var m=menu();
    if(m) m.classList.remove("is-open");
    if(p) p.classList.remove("dvlScan1017FiltersOpen");
  }

  function toggleSheet(){
    var m=ensureSheet();
    if(!m) return false;
    if(m.classList.contains("is-open")) closeSheet();
    else openSheet();
    return true;
  }

  function install(){
    document.addEventListener("click",function(ev){
      var btn=ev.target && ev.target.closest ? ev.target.closest("#dvlScannerPanel0780 [data-dvl-scan1013-filters]") : null;
      if(btn){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        setTimeout(toggleSheet,0);
        return;
      }
      var close=ev.target && ev.target.closest ? ev.target.closest("#dvlScannerPanel0780 [data-dvl-scan1017-close]") : null;
      if(close){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        closeSheet();
        return;
      }
      var p=panel();
      var m=menu();
      if(p && m && m.classList.contains("is-open")){
        var inside=ev.target && ev.target.closest ? ev.target.closest("#dvlScan1013FilterMenu") : null;
        var filterButton=ev.target && ev.target.closest ? ev.target.closest("#dvlScannerPanel0780 [data-dvl-scan1013-filters]") : null;
        if(!inside && !filterButton) closeSheet();
      }
    },true);

    window.addEventListener("dvl:scanner-state-change",function(e){
      setTimeout(function(){
        ensureSheet();
        var p=panel();
        if(p && !(e && e.detail && e.detail.open)) closeSheet();
      },80);
    },true);

    window.addEventListener("resize",function(){ setTimeout(ensureSheet,60); },true);

    var oldOpen=null;
    setTimeout(function(){
      try{
        if(window.DVL_SCANNER_PRO_FORCE_OPEN_1013 && !window.DVL_SCANNER_PRO_FORCE_OPEN_1013.__filterSheetPatched1017){
          oldOpen=window.DVL_SCANNER_PRO_FORCE_OPEN_1013.open;
          if(typeof oldOpen==="function"){
            window.DVL_SCANNER_PRO_FORCE_OPEN_1013.open=function(){
              var out=oldOpen.apply(this,arguments);
              setTimeout(ensureSheet,120);
              return out;
            };
          }
          window.DVL_SCANNER_PRO_FORCE_OPEN_1013.__filterSheetPatched1017=true;
        }
      }catch(_){}
    },300);
  }

  window.DVL_SCANNER_FILTER_SHEET_FIX_1017={
    version:VERSION,
    ensure:ensureSheet,
    open:openSheet,
    close:closeSheet,
    toggle:toggleSheet,
    audit:function(){
      var p=panel(), m=menu();
      return {version:VERSION,panel:!!p,menu:!!m,menuParentIsPanel:!!(p&&m&&m.parentElement===p),open:!!(m&&m.classList.contains("is-open"))};
    }
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
  setTimeout(ensureSheet,1000);
})();
