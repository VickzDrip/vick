(function(){
  "use strict";
  if(window.DVL_RISK_ENGINE_STORAGE) return;
  var KEY="dvl_risk_engine_1213";
  var defaults={
    executionProfile:"cryptoFundTrader",
    brokerId:"cryptoFundTrader",
    accountSize:50000,
    accountPreset:"50000",
    symbolKey:"BTCUSD",
    riskMode:"cash",
    riskValue:300,
    tolerancePct:2,
    costMode:"priceCommission",
    defaultRR:1,
    feesIncluded:true,
    maxNotional:175000,
    buffer:0,
    netRR:1,
    maxCostShare:0.25,
    entryMode:"market",
    tpMode:"autoRR",
    linesVisible:false,
    trade:{side:"buy",entry:null,stop:null,tp:null,graphOrderId:null},
    overrides:{}
  };
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function merge(a,b){var o=clone(a); if(!b||typeof b!=="object")return o; Object.keys(b).forEach(function(k){if(k==="trade"||k==="overrides")o[k]=Object.assign({},o[k]||{},b[k]||{});else o[k]=b[k];}); return o;}
  var state=(function(){try{return merge(defaults,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch(_){return clone(defaults);}})();
  var saveTimer=0;
  function saveNow(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
  function save(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,80);}
  function patch(p){if(!p||typeof p!=="object")return state;Object.keys(p).forEach(function(k){if(k==="trade"||k==="overrides")state[k]=Object.assign({},state[k]||{},p[k]||{});else state[k]=p[k];});save();return state;}
  function getOverride(broker,symbol){return clone((((state.overrides||{})[broker]||{})[symbol])||{});}
  function setOverride(broker,symbol,spec){state.overrides=state.overrides||{};state.overrides[broker]=state.overrides[broker]||{};state.overrides[broker][symbol]=clone(spec||{});save();return getOverride(broker,symbol);}
  function clearOverride(broker,symbol){if(state.overrides&&state.overrides[broker])delete state.overrides[broker][symbol];save();}
  window.DVL_RISK_ENGINE_STORAGE={KEY:KEY,defaults:clone(defaults),get:function(){return state;},patch:patch,save:saveNow,getOverride:getOverride,setOverride:setOverride,clearOverride:clearOverride,reset:function(){state=clone(defaults);saveNow();return state;}};
})();
