/* ============================================================================
   DVL X-Ray Lab — Inventory Stress Map Engine (Beta 1.638, MVP passo 4)
   ----------------------------------------------------------------------------
   Estima zonas onde participantes AGRESSIVOS entraram e depois ficaram em
   posição desfavorável conforme o preço se afastou (spec §4). NÃO afirma posição
   real — é INFERÊNCIA de pressão potencial a partir de agressão + deslocamento.

     Buyers trapped:  agressão COMPRADORA relevante numa faixa, seguida de
                      deslocamento adverso ABAIXO da região.
     Sellers trapped: agressão VENDEDORA relevante, seguida de deslocamento
                      adverso ACIMA da região.
     Stress (0–100):  agressão inicial + deslocamento adverso + tempo fora da
                      zona + volume ainda não neutralizado.
     Status:          live  (hipótese de presos ainda faz sentido)
                      resolved (preço revisitou/atravessou a região).

   Função PURA sobre candles → testável; o render/UI só consome. Cada zona leva
   startIndex/startTime + faixa de preço (p/ o overlay desenhar a banda).
   ============================================================================ */
(function(){
  "use strict";

  var DEFAULTS = {
    lookback: 50,
    hotMult: 1.5,        // volume do evento >= 1.5× a média recente
    buyImb: 0.62,        // buyNotional/notional >= 0.62 → agressão compradora
    sellImb: 0.38,       // <= 0.38 → agressão vendedora
    adverseMinATR: 0.8,  // precisou afastar >= 0.8 ATR contra os agressores p/ contar
    adverseSatATR: 3.0,  // satura o componente de deslocamento adverso do score
    timeSatCandles: 20,  // satura o componente de tempo
    minGap: 3,           // candles mínimos entre eventos do mesmo lado (evita cluster)
    maxZones: 24,        // teto (perf/densidade §14)
    keepResolved: false, // por padrão só devolve zonas VIVAS
    epsilon: 1e-9
  };

  function num(v,d){ v=Number(v); return Number.isFinite(v)?v:(d||0); }
  function hlc3(c){ return (num(c.high)+num(c.low)+num(c.close))/3; }
  function trueRange(cur,prev){ var h=num(cur.high),l=num(cur.low); if(!prev) return h-l; var pc=num(prev.close); return Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); }
  function raw(c){
    var vol=num(c.volume);
    var bv=(c.buyVolume!=null)?num(c.buyVolume):NaN;
    var notion=(c.quoteVolume!=null&&num(c.quoteVolume)>0)?num(c.quoteVolume):vol*hlc3(c);
    var buyFrac=Number.isFinite(bv)&&vol>0?(bv/vol):0.5;
    return { notion:notion, buyFrac:buyFrac, hasSide:Number.isFinite(bv) };
  }
  function clamp01(x){ return x<0?0:(x>1?1:x); }

  function detect(candles, options){
    var opt=Object.assign({},DEFAULTS,options||{});
    var out=[];
    if(!Array.isArray(candles)||candles.length<6) return out;
    var n=candles.length, i;
    var r=new Array(n), tr=new Array(n);
    for(i=0;i<n;i++){ r[i]=raw(candles[i]); tr[i]=trueRange(candles[i], i>0?candles[i-1]:null); }
    function meanNotionBefore(idx){ var a=Math.max(0,idx-opt.lookback),s=0,c=0; for(var k=a;k<idx;k++){s+=r[k].notion;c++;} return c?s/c:r[idx].notion; }
    function meanTrBefore(idx){ var a=Math.max(0,idx-opt.lookback),s=0,c=0; for(var k=a;k<idx;k++){s+=tr[k];c++;} return c?s/c:(tr[idx]||1); }

    var lastEventIdx={buy:-1e9, sell:-1e9};
    var last=n-1, closeNow=num(candles[last].close);

    for(i=opt.lookback? Math.min(1,opt.lookback):1; i<n-1; i++){ // precisa de forward (não avalia o último)
      var ri=r[i];
      var effMean=meanNotionBefore(i);
      if(ri.notion < effMean*opt.hotMult) continue;         // volume não é relevante
      var side = ri.buyFrac>=opt.buyImb ? "buyers" : (ri.buyFrac<=opt.sellImb ? "sellers" : null);
      if(!side) continue;                                    // não é agressão de um lado
      if(i - lastEventIdx[side] < opt.minGap) continue;      // anti-cluster

      var zoneLow=num(candles[i].low), zoneHigh=num(candles[i].high), ref=num(candles[i].close);
      var atr=meanTrBefore(i); if(!(atr>0)) atr=opt.epsilon;

      // deslocamento adverso: extremo (máx histórico contra) e ATUAL (agora)
      var advExtreme=0, currAdverse, revisited=false, extIdx=i;
      if(side==="buyers"){
        var minLow=Infinity;
        for(var j=i+1;j<n;j++){ if(num(candles[j].low)<minLow){ minLow=num(candles[j].low); extIdx=j; } if(num(candles[j].high)>=zoneHigh) revisited=true; }
        advExtreme = zoneLow - minLow;                 // quão abaixo da zona chegou
        currAdverse = zoneLow - closeNow;              // quão abaixo está agora
      } else {
        var maxHigh=-Infinity;
        for(var j2=i+1;j2<n;j2++){ if(num(candles[j2].high)>maxHigh){ maxHigh=num(candles[j2].high); extIdx=j2; } if(num(candles[j2].low)<=zoneLow) revisited=true; }
        advExtreme = maxHigh - zoneHigh;               // quão acima da zona chegou
        currAdverse = closeNow - zoneHigh;             // quão acima está agora
      }
      if(advExtreme < opt.adverseMinATR*atr) continue;  // nunca ficou realmente preso

      var status = currAdverse > 0 ? "live" : "resolved"; // voltou pra zona → resolvido
      if(status==="resolved" && !opt.keepResolved) { lastEventIdx[side]=i; continue; }

      // componentes do score (0..1)
      var cAgg = clamp01((ri.notion/Math.max(effMean,opt.epsilon) - 1)/2);      // tamanho da agressão
      var cImb = clamp01(Math.abs(ri.buyFrac-0.5)*2);                            // quão unilateral
      var cAdv = clamp01(Math.max(0,currAdverse)/(atr*opt.adverseSatATR));       // quão fundo AGORA
      var age  = last - i;
      var cTime= clamp01(age/opt.timeSatCandles);                                // tempo preso
      var stress = Math.round(100*(0.30*cAgg + 0.18*cImb + 0.37*cAdv + 0.15*cTime));

      out.push({
        side:side, startIndex:i, startTime:num(candles[i].time),
        priceLow:zoneLow, priceHigh:zoneHigh, refPrice:ref,
        stress:stress, status:status,
        adverseATR: Math.max(0,currAdverse)/atr,
        adverseExtremeATR: advExtreme/atr,
        ageCandles: age, aggression: ri.notion/Math.max(effMean,opt.epsilon),
        imbalance: ri.buyFrac, hasSideData: ri.hasSide
      });
      lastEventIdx[side]=i;
    }

    // mais estressadas primeiro; corta pelo teto
    out.sort(function(a,b){ return b.stress-a.stress; });
    if(out.length>opt.maxZones) out=out.slice(0,opt.maxZones);
    return out;
  }

  function top(candles, options){ var z=detect(candles,options); return z.length?z[0]:null; }

  window.DVLXRayStress = { version:"1.638", defaults:DEFAULTS, detect:detect, top:top };
})();
