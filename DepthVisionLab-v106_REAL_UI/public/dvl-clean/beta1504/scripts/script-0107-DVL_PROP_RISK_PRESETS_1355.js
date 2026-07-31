/* ── Registro de presets de risco prop-firm (data-driven, spec §9) ──────────
   Centraliza os parâmetros do preset "CFT Break 50K — BTC MT5/Match" para que
   comissão, notional máximo, buffer, net R:R e limite de custo NÃO fiquem
   espalhados como constantes de UI. O Risk Engine lê daqui os defaults do modo
   "Net R:R (fees included)". */
(function(){
  "use strict";
  if(window.DVL_PROP_RISK_PRESETS) return;
  var presets={
    cftBreak50kBtc:{
      id:"cft-break-50k-btc",
      label:"CFT Break 50K — BTC MT5/Match",
      brokerId:"cryptoFundTrader",
      symbolKey:"BTCUSD",
      accountBalance:50000,
      maxDrawdown:2000,
      commissionModel:"notional_per_side",
      commissionRatePerSide:0.000325,   // 0,0325%/lado  (~0,065% round turn)
      contractSize:1,
      leverage:100,
      defaultRiskUsd:300,
      defaultNetRR:1,
      maxRecommendedNotional:175000,
      notionalRange:[150000,200000],
      maxCostShare:0.25,
      executionBufferPerUnit:0,          // USD por BTC round trip, editável
      lotStep:0.01,
      defaultFeesIncluded:true
    }
  };
  function clone(v){return JSON.parse(JSON.stringify(v));}
  window.DVL_PROP_RISK_PRESETS={
    get:function(id){return presets[id]?clone(presets[id]):null;},
    forBroker:function(brokerId,symbolKey){var k=String(symbolKey||"").toUpperCase();for(var id in presets){var p=presets[id];if(p.brokerId===brokerId&&(!k||p.symbolKey===k))return clone(p);}return null;},
    list:function(){return Object.keys(presets).map(function(k){return clone(presets[k]);});},
    "default":"cftBreak50kBtc"
  };
})();
