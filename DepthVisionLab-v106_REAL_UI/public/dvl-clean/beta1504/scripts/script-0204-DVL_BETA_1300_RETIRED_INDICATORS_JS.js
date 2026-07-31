(function(){
  "use strict";
  var IDS=["dvlOpenInterestOscItem","dvlLongShortOscItem","dvlNetLongItem","dvlNetShortItem","dvlNetDeltaItem"];
  var APIS=["DVLOpenInterestOscillator","DVLLongShortOscillator","DVLNetLongOscillator","DVLNetShortOscillator","DVLNetDeltaOscillator"];
  var RETIRED={oi:1,ls:1,netlong:1,netshort:1,netdelta:1};

  function removeRows(){
    for(var i=0;i<IDS.length;i++){
      var el=document.getElementById(IDS[i]);
      if(el && el.parentNode) el.parentNode.removeChild(el);
    }
  }
  function cleanFavorites(){
    try{
      var key="DVL_INDICATOR_FAVORITES_0854";
      var v=JSON.parse(localStorage.getItem(key)||"null");
      if(!Array.isArray(v)) return;
      var next=v.filter(function(k){return !RETIRED[k];});
      if(next.length!==v.length) localStorage.setItem(key,JSON.stringify(next));
    }catch(_){}
  }
  function disableVisualOscillators(){
    for(var i=0;i<APIS.length;i++){
      try{
        var a=window[APIS[i]];
        if(!a) continue;
        if(typeof a.setOn==="function") a.setOn(false);
        if(typeof a.close==="function") a.close();
      }catch(_){}
    }
    try{ if(typeof window.drawSoon==="function") window.drawSoon(); }catch(_){}
  }
  function refreshModernMenu(){
    try{
      var a=window.DVL_PHASE1B_INDICATORS_MENU_0813_API;
      if(a && typeof a.render==="function") a.render();
    }catch(_){}
  }
  function apply(){
    cleanFavorites();
    disableVisualOscillators();
    removeRows();
    refreshModernMenu();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",apply,{once:true});
  else apply();

  /* Some legacy modules insert their row after DOMContentLoaded. Observe only child-list
     changes; no text/attribute observation, so this cannot create a render loop. */
  try{
    var ob=new MutationObserver(function(muts){
      var relevant=false;
      for(var i=0;i<muts.length&&!relevant;i++) if(muts[i].addedNodes&&muts[i].addedNodes.length) relevant=true;
      if(relevant) removeRows();
    });
    ob.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(function(){try{ob.disconnect();}catch(_){}},12000);
  }catch(_){}

  /* APIs are defined late in this single HTML. Retry briefly, then stop. */
  [80,220,500,1000,1800,3000,5000,8000].forEach(function(ms){setTimeout(function(){disableVisualOscillators();removeRows();},ms);});

  window.DVL_RETIRED_INDICATORS_1300={
    version:"1.300",
    keys:Object.keys(RETIRED),
    rows:IDS.slice(),
    apply:apply
  };
})();
