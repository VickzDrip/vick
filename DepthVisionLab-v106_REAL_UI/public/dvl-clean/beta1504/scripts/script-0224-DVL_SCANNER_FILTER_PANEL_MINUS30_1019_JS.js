(function(){
  "use strict";
  if(window.DVL_SCANNER_FILTER_PANEL_MINUS30_1019) return;
  var VERSION="1.020";

  function menu(){ return document.getElementById("dvlScan1013FilterMenu"); }
  function btn(){ return document.querySelector('#dvlScannerPanel0780 [data-dvl-scan1013-filters]'); }

  function fitCompact(){
    var m=menu(), b=btn();
    if(!m || !b) return;
    var br=b.getBoundingClientRect();
    var vw=window.innerWidth;
    var pref=Math.min((vw<=430?224:232), vw-16);
    var left=Math.max(8, Math.min(vw-pref-8, br.right-pref));
    var top=br.bottom+6;
    m.style.width = pref + "px";
    m.style.maxWidth = pref + "px";
    m.style.left = left + "px";
    m.style.right = "auto";
    m.style.top = top + "px";
  }

  function install(){
    var sync=function(){ setTimeout(fitCompact, 20); };
    window.addEventListener("resize", sync, true);
    window.addEventListener("orientationchange", function(){ setTimeout(fitCompact, 100); }, true);
    document.addEventListener("click", function(ev){
      var b=ev.target && ev.target.closest ? ev.target.closest('#dvlScannerPanel0780 [data-dvl-scan1013-filters]') : null;
      if(b){
        setTimeout(fitCompact, 10);
        setTimeout(fitCompact, 100);
      }
    }, true);
    setTimeout(fitCompact, 800);
    setTimeout(fitCompact, 1500);
  }

  window.DVL_SCANNER_FILTER_PANEL_MINUS30_1019 = {
    version: VERSION,
    fit: fitCompact
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", install, {once:true});
  else install();
})();
