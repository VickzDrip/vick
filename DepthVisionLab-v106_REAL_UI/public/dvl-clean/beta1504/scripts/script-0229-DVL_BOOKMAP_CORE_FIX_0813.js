(function(){
  "use strict";
  var LS = "DVL_BOOKMAP_ZONES_0808";
  var defaults = {
    on:false, source:"futures", depth:100, sensitivity:"medium",
    maxZones:10, heightPx:7, labels:true, glow:true,
    maxDistATR:true, atrDistance:5, opacity:0.52
  };
  function num(v, d, min, max){
    v = Number(v);
    if(!Number.isFinite(v)) v = d;
    if(Number.isFinite(min)) v = Math.max(min, v);
    if(Number.isFinite(max)) v = Math.min(max, v);
    return v;
  }
  function clean(obj){
    obj = Object.assign({}, defaults, obj || {});
    obj.on = !!obj.on;
    obj.source = obj.source === "spot" ? "spot" : "futures";
    obj.depth = [20,100,500].indexOf(Number(obj.depth)) >= 0 ? Number(obj.depth) : 100;
    obj.sensitivity = ["low","medium","high"].indexOf(obj.sensitivity) >= 0 ? obj.sensitivity : "medium";
    obj.maxZones = num(obj.maxZones, 10, 2, 24);
    obj.heightPx = num(obj.heightPx, 7, 3, 18);
    obj.labels = !!obj.labels;
    obj.glow = !!obj.glow;
    obj.maxDistATR = !!obj.maxDistATR;
    obj.atrDistance = num(obj.atrDistance, 5, 1, 20);
    obj.opacity = num(obj.opacity, 0.52, 0.15, 0.85);
    return obj;
  }
  var current = {};
  try{ current = JSON.parse(localStorage.getItem(LS) || "{}") || {}; }catch(_){}
  var state = clean(current);
  try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(_){}
  function drawSoonSafe(){ try{ if(typeof drawSoon==="function") drawSoon(); else if(window.drawSoon) window.drawSoon(); }catch(_){} }
  function kick(force){
    try{ if(window.DVL_BOOKMAP_DRAW_BRIDGE_0812 && typeof window.DVL_BOOKMAP_DRAW_BRIDGE_0812.kick==="function") window.DVL_BOOKMAP_DRAW_BRIDGE_0812.kick(!!force); }catch(_){}
    drawSoonSafe();
  }
  function setOn(v){ state.on=!!v; try{ localStorage.setItem(LS,JSON.stringify(state)); }catch(_){} kick(true); }
  function set(k,v){
    if(k==="depth" || k==="maxZones" || k==="heightPx" || k==="atrDistance" || k==="opacity") v=Number(v);
    state[k]=v;
    state=clean(state);
    api.settings=state;
    try{ localStorage.setItem(LS,JSON.stringify(state)); }catch(_){}
    kick(k==="source" || k==="depth");
  }
  var api = {
    version:"0.813",
    settings:state,
    on:function(){return !!state.on;},
    setOn:setOn,
    set:set,
    connect:function(){kick(true);},
    disconnect:function(){},
    kick:kick,
    openPanel:function(){
      try{
        var ui=window.DVL_PHASE1B_INDICATORS_MENU_0813_API;
        if(ui){ui.open();ui.expandBookmap();}
      }catch(_){}
    }
  };
  window.DVL_BOOKMAP_ZONES_0813 = api;
  window.DVL_BOOKMAP_ZONES_0812 = api;
  window.DVL_BOOKMAP_ZONES_0808 = api;
})();
