(function(){
  "use strict";
  if(window.DVL_BOOKMAP_CORE_0812) return;
  window.DVL_BOOKMAP_CORE_0812 = true;

  var LS = "DVL_BOOKMAP_ZONES_0808";
  var defaults = {
    on:false, source:"futures", depth:100, sensitivity:"medium",
    maxZones:10, heightPx:7, labels:true, glow:true,
    maxDistATR:true, atrDistance:5, opacity:0.52
  };
  var state = Object.assign({}, defaults);
  try{ Object.assign(state, JSON.parse(localStorage.getItem(LS) || "{}") || {}); }catch(_){}

  function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(_){} }
  function drawSoonSafe(){ try{ if(typeof drawSoon === "function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){} }
  function kick(force){
    try{ if(window.DVL_BOOKMAP_DRAW_BRIDGE_0812 && typeof window.DVL_BOOKMAP_DRAW_BRIDGE_0812.kick === "function") window.DVL_BOOKMAP_DRAW_BRIDGE_0812.kick(!!force); }catch(_){}
    drawSoonSafe();
  }
  function setOn(v){ state.on = !!v; save(); kick(true); }
  function set(key,val){ state[key] = val; save(); kick(key === "source" || key === "depth"); }

  var api = {
    version:"0.812",
    settings:state,
    get state(){ return state; },
    on:function(){ return !!state.on; },
    setOn:setOn,
    set:set,
    openPanel:function(){
      try{
        if(window.DVL_PHASE1B_INDICATORS_MENU_0812_API && typeof window.DVL_PHASE1B_INDICATORS_MENU_0812_API.open === "function"){
          window.DVL_PHASE1B_INDICATORS_MENU_0812_API.open();
          window.DVL_PHASE1B_INDICATORS_MENU_0812_API.expandBookmap();
        }
      }catch(_){}
    },
    connect:function(){ kick(true); },
    disconnect:function(){},
    kick:kick
  };

  window.DVL_BOOKMAP_ZONES_0812 = api;
  /* Compatibility alias: old menu/draw code looked for 0808. Do not mark as missing anymore. */
  window.DVL_BOOKMAP_ZONES_0808 = api;
})();
