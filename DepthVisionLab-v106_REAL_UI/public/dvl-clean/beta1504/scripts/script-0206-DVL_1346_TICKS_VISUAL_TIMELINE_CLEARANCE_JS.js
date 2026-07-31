(function(){
  "use strict";
  function sync(){
    const wrap=document.getElementById("chartWrap");if(!wrap)return;
    let h=20;try{if(typeof dvlMainTimeScaleHeight==="function")h=Math.max(20,Number(dvlMainTimeScaleHeight())||20);}catch(_){}
    wrap.style.setProperty("--dvl-timeline-clearance-1346",Math.round(h)+"px");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",sync,{once:true});else sync();
  window.addEventListener("resize",sync,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(sync,120),{passive:true});
  setTimeout(sync,600);setTimeout(sync,1600);
  window.DVL_TICKS_VISUAL_1346={version:"1.346",sync};
})();
