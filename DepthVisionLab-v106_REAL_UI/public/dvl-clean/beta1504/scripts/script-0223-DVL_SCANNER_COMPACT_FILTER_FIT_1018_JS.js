(function(){
  "use strict";
  if(window.DVL_SCANNER_COMPACT_FILTER_FIT_1018) return;
  var VERSION="1.020";

  function panel(){ return document.getElementById("dvlScannerPanel0780"); }
  function menu(){ return document.getElementById("dvlScan1013FilterMenu"); }
  function btn(){ return document.querySelector('#dvlScannerPanel0780 [data-dvl-scan1013-filters]'); }

  function fitMenu(){
    var p=panel(), m=menu(), b=btn();
    if(!p || !m || !b) return;
    var br=b.getBoundingClientRect();
    var vw=window.innerWidth;
    var pref=Math.min(332, vw-24);
    var left=vw - pref - 12;
    left=Math.max(10, Math.min(left, vw-pref-10));
    var top=br.bottom + 8;
    var maxTop = window.innerHeight - Math.min(window.innerHeight*0.66, 560) - 84;
    if(top > maxTop) top = Math.max(72, maxTop);
    m.style.width = pref + "px";
    m.style.maxWidth = pref + "px";
    m.style.left = left + "px";
    m.style.right = "auto";
    m.style.top = top + "px";
  }

  function install(){
    var sync = function(){ setTimeout(fitMenu, 30); };
    window.addEventListener("resize", sync, true);
    window.addEventListener("orientationchange", function(){ setTimeout(fitMenu, 160); }, true);
    window.addEventListener("dvl:scanner-state-change", function(){ setTimeout(fitMenu, 180); }, true);
    document.addEventListener("click", function(ev){
      var b = ev.target && ev.target.closest ? ev.target.closest('#dvlScannerPanel0780 [data-dvl-scan1013-filters]') : null;
      var m = menu();
      if(b){
        setTimeout(fitMenu, 10);
        setTimeout(fitMenu, 120);
      }else if(m && m.classList.contains("is-open")){
        setTimeout(fitMenu, 10);
      }
    }, true);
    setTimeout(fitMenu, 800);
    setTimeout(fitMenu, 1500);
  }

  window.DVL_SCANNER_COMPACT_FILTER_FIT_1018={
    version:VERSION,
    fit:fitMenu,
    audit:function(){
      var m=menu(), b=btn();
      return {version:VERSION, menu:!!m, btn:!!b, open:!!(m&&m.classList.contains('is-open'))};
    }
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", install, {once:true});
  else install();
})();
