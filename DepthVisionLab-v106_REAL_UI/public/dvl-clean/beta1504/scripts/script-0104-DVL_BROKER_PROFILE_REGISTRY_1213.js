(function(){
  "use strict";
  if(window.DVL_BROKER_PROFILE_REGISTRY) return;
  function blank(symbol){return {brokerSymbol:symbol||"",contractSize:null,tickSize:null,tickValue:null,volumeMin:null,volumeMax:null,volumeStep:null,digits:null,currency:"USD",calculationMode:"tickValue",marginLeverage:null,verified:false,updatedAt:null,source:"pending"};}
  var profiles={
    cryptoFundTrader:{id:"cryptoFundTrader",name:"Crypto Fund Trader",platform:"MT5",currency:"USD",enabled:true,symbols:{BTCUSD:{brokerSymbol:"BTCUSDT.cft",contractSize:1,tickSize:0.1,tickValue:0.1,volumeMin:0.001,volumeMax:10000000000,volumeStep:0.001,digits:1,currency:"USD",calculationMode:"tickValue",marginLeverage:null,commissionPct:0.0325,verified:true,updatedAt:"2026-07-20T00:00:00.000Z",source:"factory"}}},
    ftmo:{id:"ftmo",name:"FTMO",platform:"MT5",currency:"USD",enabled:false,symbols:{}},
    the5ers:{id:"the5ers",name:"The5ers",platform:"MT5",currency:"USD",enabled:false,symbols:{}},
    icMarkets:{id:"icMarkets",name:"IC Markets",platform:"MT5",currency:"USD",enabled:false,symbols:{}},
    pepperstone:{id:"pepperstone",name:"Pepperstone",platform:"MT5",currency:"USD",enabled:false,symbols:{}},
    custom:{id:"custom",name:"Personalizado",platform:"MT5",currency:"USD",enabled:true,symbols:{BTCUSD:blank("BTCUSD")}}
  };
  function clone(v){return JSON.parse(JSON.stringify(v));}
  window.DVL_BROKER_PROFILE_REGISTRY={
    list:function(){return Object.keys(profiles).map(function(k){return clone(profiles[k]);});},
    get:function(id){return profiles[id]?clone(profiles[id]):null;},
    has:function(id){return !!profiles[id];},
    blankSymbol:blank,
    accounts:[5000,10000,25000,50000,100000]
  };
})();
