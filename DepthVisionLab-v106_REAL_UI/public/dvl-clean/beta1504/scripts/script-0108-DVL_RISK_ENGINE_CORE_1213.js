(function(){
  "use strict";
  if(window.DVL_RISK_ENGINE) return;
  var V=window.DVL_RISK_ENGINE_VALIDATION;
  function decimals(step){var s=String(step);if(s.indexOf("e-")>0)return Number(s.split("e-")[1])||0;var p=s.indexOf(".");return p<0?0:s.length-p-1;}
  function floorStep(raw,step){var d=Math.min(12,Math.max(0,decimals(step)));var units=Math.floor((Number(raw)+1e-12)/Number(step));return Number((units*Number(step)).toFixed(d));}
  function money(v,c){if(!Number.isFinite(Number(v)))return "--";return Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+" "+String(c||"USD");}
  /* ── Net R:R (fees included) — spec §6 ─────────────────────────────────────
     TP automático NET-aware. Chave: targetPerBTC = netLossPorUnidade×rr + b é
     INDEPENDENTE do lote (o lote cancela em targetNetProfit/Q), então o TP líquido
     depende só de E,S,c,b,rr,k. Assim um "1:1" vira 1:1 FINANCEIRO (cobre a
     comissão de saída), não um 1:1 bruto que a taxa depois come. */
  function netAutoTp(entry,stop,side,c,b,rr,k){
    entry=Number(entry);stop=Number(stop);
    if(!(entry>0&&stop>0)||entry===stop)return null;
    side=side==="sell"?"sell":"buy";
    if(side==="buy"&&stop>=entry)return null;
    if(side==="sell"&&stop<=entry)return null;
    c=Number(c)||0;b=Number(b)||0;rr=Number(rr)>0?Number(rr):1;k=Number(k)>0?Number(k):1;
    var dist=Math.abs(entry-stop);
    var netLossPerUnit=dist + c*(entry+stop) + b;   // = netLossPerLot / k
    var targetPerBTC=netLossPerUnit*rr + b;
    if(side==="buy")return (entry*(1+c)+targetPerBTC)/(1-c);
    return (entry*(1-c)-targetPerBTC)/(1+c);
  }
  function calcNet(input,spec,tv){
    var entry=Number(input.entry),stop=Number(input.stop),side=input.side==="sell"?"sell":"buy";
    var k=Number(spec.contractSize)>0?Number(spec.contractSize):1;
    var c=Number(spec.commissionPct)>0?Number(spec.commissionPct)/100:0;
    var b=Number(input.buffer)>0?Number(input.buffer):0;
    var rr=Number(input.rr)>0?Number(input.rr):1;
    var R=tv.requestedRisk;
    var step=Number(spec.volumeStep),min=Number(spec.volumeMin),max=Number(spec.volumeMax);
    var dist=Math.abs(entry-stop),lossPerLot=0,ticks=null;
    if(spec.calculationMode==="tickValue"){ticks=dist/Number(spec.tickSize);lossPerLot=ticks*Number(spec.tickValue);}
    else lossPerLot=dist*k;
    if(!(lossPerLot>0))return {ok:false,code:"LOSS_INVALID",errors:["Perda por lote inválida"]};
    var lossCommissionPerLot=k*c*(entry+stop), bufferPerLot=k*b;
    var netLossPerLot=lossPerLot+lossCommissionPerLot+bufferPerLot;
    if(!(netLossPerLot>0))return {ok:false,code:"LOSS_INVALID",errors:["Perda líquida por lote inválida"]};
    var riskBasedLot=R/netLossPerLot;
    var maxNotional=Number(input.maxNotional)>0?Number(input.maxNotional):Infinity;
    var maxLotByNotional=isFinite(maxNotional)?maxNotional/(entry*k):Infinity;
    var platformMaxLot=Number(max)>0?Number(max):Infinity;
    var rawLot=Math.min(riskBasedLot,maxLotByNotional,platformMaxLot);
    var capReason=(riskBasedLot<=maxLotByNotional&&riskBasedLot<=platformMaxLot)?"RISK_BASED":(maxLotByNotional<=platformMaxLot?"NOTIONAL_CAPPED":"LOT_CAPPED");
    var minimumRisk=netLossPerLot*(min>0?min:0);
    if(min>0&&rawLot<min-1e-12)return {ok:false,code:"BELOW_MIN",errors:["O risco solicitado exige um lote menor que o mínimo permitido."],rawLot:riskBasedLot,minimumLot:min,minimumRisk:minimumRisk,requestedRisk:R,lossPerLot:lossPerLot,stopDistance:dist,ticks:ticks};
    var lot=floorStep(rawLot,step);if(min>0&&lot<min)lot=min;if(platformMaxLot<Infinity&&lot>platformMaxLot)lot=platformMaxLot;
    if(!(lot>0))return {ok:false,code:"BELOW_MIN",errors:["Lote abaixo do passo mínimo permitido."],rawLot:rawLot,minimumLot:min,minimumRisk:minimumRisk,requestedRisk:R};
    var Q=lot*k, actualNetRisk=lot*netLossPerLot;
    var manual=(input.tpMode==="manual")&&Number(input.tp)>0;
    var autoTp=netAutoTp(entry,stop,side,c,b,rr,k), T=manual?Number(input.tp):autoTp;
    var winCommission=(T>0)?Q*c*(entry+T):0, lossCommission=Q*c*(entry+stop);
    var grossWin=(T>0)?(side==="buy"?Q*(T-entry):Q*(entry-T)):null;
    var netWin=(grossWin!=null)?grossWin-winCommission-Q*b:null;
    var grossLoss=Q*dist, netLoss=grossLoss+lossCommission+Q*b;
    var netRR=(netWin!=null&&netLoss>0)?netWin/netLoss:null, grossRR=(T>0&&dist>0)?Math.abs(T-entry)/dist:null;
    var costShare=(grossWin!=null&&grossWin>0)?(winCommission+Q*b)/grossWin:null;
    var maxCostShare=Number(input.maxCostShare)>0?Number(input.maxCostShare):0.25;
    var costHigh=(costShare!=null)&&costShare>maxCostShare;
    var entryCommission=Q*c*entry, exitCommission=Q*c*stop, totalFees=entryCommission+exitCommission;
    var nominalUnits=Q, nominalValue=Q*entry;
    var lev=Number(spec.marginLeverage)>0?Number(spec.marginLeverage):(Number(input.leverage)>0?Number(input.leverage):0);
    var margin=lev>0?nominalValue/lev:null;
    return {ok:true,code:capReason,feesIncluded:true,costMode:"netFeesIncluded",commissionPct:Number(spec.commissionPct)||0,
      capReason:capReason,lot:lot,rawLot:riskBasedLot,recommendedLotRaw:rawLot,maxLotByNotional:isFinite(maxLotByNotional)?maxLotByNotional:null,
      requestedRisk:R,realRisk:netLoss,difference:netLoss-R,lossPerLot:lossPerLot,netLossPerLot:netLossPerLot,
      priceRisk:grossLoss,entryCommission:entryCommission,exitCommission:exitCommission,totalFees:totalFees,totalRisk:netLoss,
      profit:grossWin,netProfit:netWin,rr:grossRR,netRR:netRR,autoTp:autoTp,tp:T,netTp:T,tpManual:manual,
      stopDistance:dist,ticks:ticks,nominalUnits:nominalUnits,nominalValue:nominalValue,
      accountRiskPct:Number(input.accountBalance)>0?netLoss/Number(input.accountBalance)*100:null,margin:margin,
      minimumRisk:minimumRisk,costShare:costShare,maxCostShare:maxCostShare,costHigh:costHigh,buffer:b,rrTarget:rr,
      currency:spec.currency||"USD",lotDecimals:decimals(step),
      warning:costHigh?"Trade range too short for configured CFT costs":null};
  }
  /* Beta 1.219 — dimensionamento CIENTE DE COMISSÕES da CFT.
     A perda por lote no PREÇO (lossPerLot) continua igual. Sobre ela somamos as
     comissões estimadas de entrada e saída (0,0325%/lado da CFT) para que o LOTE
     seguro caiba no risco solicitado JÁ com as taxas embutidas.
       • entrada: preço de entrada × contractSize × comissão
       • saída (orçamento): usa o MAIOR entre entrada e stop (conservador — pro
         buy o stop está abaixo, pro sell acima), então o risco real exibido
         (comissão de saída no stop real) nunca ultrapassa o orçamento.
     costMode "priceCommission" (padrão) dimensiona por preço+comissões; costMode
     "priceOnly" dimensiona só pelo preço (lote maior) e avisa que ignora taxas. */
  function calculate(input,spec){var sv=V.validateSpec(spec),tv=V.validateTrade(input);if(!sv.ok)return {ok:false,code:"PROFILE_INCOMPLETE",errors:sv.errors};if(!tv.ok)return {ok:false,code:"TRADE_INVALID",errors:tv.errors};if(input&&input.feesIncluded)return calcNet(input,spec,tv);var entry=Number(input.entry),stop=Number(input.stop),tp=Number(input.tp),distance=Math.abs(entry-stop),lossPerLot=0,ticks=null;if(spec.calculationMode==="tickValue"){ticks=distance/Number(spec.tickSize);lossPerLot=ticks*Number(spec.tickValue);}else if(spec.calculationMode==="contractSizeLinear")lossPerLot=distance*Number(spec.contractSize);if(!(lossPerLot>0))return {ok:false,code:"LOSS_INVALID",errors:["Perda por lote inválida"]};
    var costMode=input.costMode==="priceOnly"?"priceOnly":"priceCommission";
    var cs=Number(spec.contractSize)>0?Number(spec.contractSize):1;
    var commPct=Number(spec.commissionPct)>0?Number(spec.commissionPct):0,commFrac=commPct/100;
    var entryCommPerLot=commFrac>0?entry*cs*commFrac:0,exitCommStopPerLot=commFrac>0?stop*cs*commFrac:0,exitCommBudgetPerLot=commFrac>0?Math.max(entry,stop)*cs*commFrac:0;
    var feePerLotBudget=entryCommPerLot+exitCommBudgetPerLot,perLotForSizing=costMode==="priceCommission"?lossPerLot+feePerLotBudget:lossPerLot;
    var requested=tv.requestedRisk,raw=requested/perLotForSizing,min=Number(spec.volumeMin),max=Number(spec.volumeMax),step=Number(spec.volumeStep);var minimumRisk=perLotForSizing*min;if(raw<min-1e-12)return {ok:false,code:"BELOW_MIN",errors:["O risco solicitado exige um lote menor que o mínimo permitido."],rawLot:raw,minimumLot:min,minimumRisk:minimumRisk,requestedRisk:requested,lossPerLot:lossPerLot,stopDistance:distance,ticks:ticks};var capped=raw>max;var lot=floorStep(Math.min(raw,max),step);if(lot<min)lot=min;if(lot>max)lot=max;
    var priceRisk=lossPerLot*lot,entryCommission=entryCommPerLot*lot,exitCommission=exitCommStopPerLot*lot,totalFees=entryCommission+exitCommission,totalRisk=priceRisk+totalFees;
    var real=costMode==="priceCommission"?totalRisk:priceRisk,diff=real-requested,tolerance=Math.max(0,Number(input.tolerancePct)||0),limit=requested*(1+tolerance/100);if(real>limit+1e-8)return {ok:false,code:"TOLERANCE",errors:["Resultado bloqueado: risco acima da tolerância."],lot:lot,realRisk:real,requestedRisk:requested,tolerancePct:tolerance};var tpDistance=Number.isFinite(tp)&&tp>0?Math.abs(tp-entry):null,profit=null,rr=null,netProfit=null,netRR=null;if(tpDistance!=null){rr=distance>0?tpDistance/distance:null;if(spec.calculationMode==="tickValue")profit=(tpDistance/Number(spec.tickSize))*Number(spec.tickValue)*lot;else profit=tpDistance*Number(spec.contractSize)*lot;var tpExitCommission=commFrac>0?tp*cs*commFrac*lot:0;netProfit=profit-entryCommission-tpExitCommission;netRR=totalRisk>0?netProfit/totalRisk:null;}var nominalUnits=Number(spec.contractSize)>0?lot*Number(spec.contractSize):null,nominalValue=nominalUnits!=null?nominalUnits*entry:null,margin=(nominalValue!=null&&Number(spec.marginLeverage)>0)?nominalValue/Number(spec.marginLeverage):null;return {ok:true,code:capped?"CAPPED_MAX":"OK",warning:capped?"Lote limitado ao máximo permitido.":(costMode==="priceOnly"?"O lote não considera as comissões de entrada e saída.":null),costMode:costMode,commissionPct:commPct,lot:lot,rawLot:raw,requestedRisk:requested,realRisk:real,difference:diff,lossPerLot:lossPerLot,priceRisk:priceRisk,entryCommission:entryCommission,exitCommission:exitCommission,totalFees:totalFees,totalRisk:totalRisk,netProfit:netProfit,netRR:netRR,stopDistance:distance,ticks:ticks,rr:rr,profit:profit,nominalUnits:nominalUnits,nominalValue:nominalValue,accountRiskPct:Number(input.accountBalance)>0?real/Number(input.accountBalance)*100:null,margin:margin,minimumRisk:minimumRisk,currency:spec.currency||"USD",lotDecimals:decimals(step)};}
  window.DVL_RISK_ENGINE={calculate:calculate,floorStep:floorStep,formatMoney:money,netAutoTp:netAutoTp};
})();
