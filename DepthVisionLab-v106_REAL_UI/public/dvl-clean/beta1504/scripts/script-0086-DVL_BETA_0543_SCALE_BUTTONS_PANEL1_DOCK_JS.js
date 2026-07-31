(function(){
  "use strict";

  function activeOscillator(){
    try{
      const oi = !!(window.DVLOpenInterestOscillator && typeof window.DVLOpenInterestOscillator.on === "function" && window.DVLOpenInterestOscillator.on());
      const ls = !!(window.DVLLongShortOscillator && typeof window.DVLLongShortOscillator.on === "function" && window.DVLLongShortOscillator.on());
      const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());
      const tv = !!(window.DVLTickVolume && typeof window.DVLTickVolume.on === "function" && window.DVLTickVolume.on());
      const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());
      const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());
      return !!(oi || ls || dv || tv || t1 || t2);
    }catch(_){
      return false;
    }
  }

  function panel1Height(totalH){
    try{
      if(window.DVLTestOscillator && typeof window.DVLTestOscillator.splitHeight === "function"){
        return window.DVLTestOscillator.splitHeight(totalH);
      }
    }catch(_){}
    return Math.max(250, totalH * .62);
  }

  function updateDock(){
    const controls = document.getElementById("chartScaleControls");
    const wrap = document.getElementById("chartWrap");
    const canvas = document.getElementById("chart");
    if(!controls || !wrap || !canvas) return;

    const isOsc = activeOscillator();
    controls.classList.toggle("dvl-panel1-scale-docked", isOsc);

    if(!isOsc){
      controls.style.top = "";
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const h = rect.height || wrap.clientHeight || 1;
    const splitY = panel1Height(h);

    /*
      Dock in the panel 1 scale column, just above the panel divider.
      Height is 24px; keep 8px clearance so it never enters panel 2.
      Button order follows DOM: scale/auto button on the left, gear on the right.
    */
    const top = Math.max(8, splitY - 24 - 8);
    controls.style.top = top + "px";
  }

  function boot(){
    updateDock();
    window.addEventListener("resize", updateDock, {passive:true});
    try{
      const target=document.getElementById("chart")||document.getElementById("chartWrap");
      if(window.ResizeObserver&&target){
        const ro=new ResizeObserver(updateDock);
        ro.observe(target);
        window.__DVL_SCALE_DOCK_RO_1203__=ro;
      }
    }catch(_){}
    window.addEventListener("dvl:oscillator-layout-change", updateDock, true);

    const old = window.DVLScaleControlsDockUpdate;
    window.DVLScaleControlsDockUpdate = function(){
      try{ if(typeof old === "function") old(); }catch(_){}
      updateDock();
    };
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
