/* ============================================================================
   DVL X-Ray Lab — Battle Map Engine (Beta 1.636, MVP passo 3)
   ----------------------------------------------------------------------------
   Detecta SEGMENTOS de disputa relevante entre compradores e vendedores
   (independente das fronteiras dos candles — spec §6) e classifica o desfecho:
     BUYERS WON  — deslocamento favorável aos compradores após a briga
     SELLERS WON — deslocamento favorável aos vendedores
     DRAW        — muito esforço sem deslocamento conclusivo
   Métrica principal (§6): esforço gasto × pontos/ATR conquistados.

   Reaproveita a base do Effort (§17: "Battle usa esforço/resultado como base").
   Função PURA sobre candles → testável offline, e o render/UI só consome.
   Cada batalha carrega startIndex/endIndex (p/ o overlay mapear tempo→x pelo
   índice do candle, como as médias fazem) + startTime/endTime.
   ============================================================================ */
(function(){
  "use strict";

  var DEFAULTS = {
    lookback: 50,        // janela p/ médias de volume/ATR
    hotMult: 1.5,        // candle "quente" = notional >= 1.5× a média recente
    maxGap: 1,           // candles frios tolerados dentro de uma batalha
    minLen: 2,           // mínimo de candles p/ virar batalha
    twoSidedMin: 0.35,   // lado fraco >= 35% do forte (senão é fluxo de 1 lado só)
    drawThreshATR: 0.6,  // |deslocamento líquido| < 0.6 ATR = empate
    epsilon: 1e-9,
    maxBattles: 40       // teto de eventos (perf mobile §14)
  };

  function num(v,d){ v=Number(v); return Number.isFinite(v)?v:(d||0); }
  function hlc3(c){ return (num(c.high)+num(c.low)+num(c.close))/3; }
  function trueRange(cur, prev){
    var h=num(cur.high), l=num(cur.low);
    if(!prev) return h-l;
    var pc=num(prev.close);
    return Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc));
  }
  function raw(c){
    var vol=num(c.volume);
    var bv=(c.buyVolume!=null)?num(c.buyVolume):NaN;
    var sv=Number.isFinite(bv)?Math.max(0,vol-bv):NaN;
    var notion=(c.quoteVolume!=null&&num(c.quoteVolume)>0)?num(c.quoteVolume):vol*hlc3(c);
    var buyN=Number.isFinite(bv)&&vol>0?notion*(bv/vol):notion/2;
    var sellN=Number.isFinite(bv)&&vol>0?notion*(sv/vol):notion/2;
    return { notion:notion, buyN:buyN, sellN:sellN, delta:(Number.isFinite(bv)?bv-sv:0), hasSide:Number.isFinite(bv) };
  }

  function detect(candles, options){
    var opt=Object.assign({},DEFAULTS,options||{});
    var out=[];
    if(!Array.isArray(candles)||candles.length<5) return out;
    var n=candles.length, i;
    var r=new Array(n), tr=new Array(n);
    for(i=0;i<n;i++){ r[i]=raw(candles[i]); tr[i]=trueRange(candles[i], i>0?candles[i-1]:null); }

    // médias móveis simples do notional e do TR pela janela ANTERIOR a cada i
    function meanNotionBefore(idx){ var a=Math.max(0,idx-opt.lookback),s=0,c=0; for(var k=a;k<idx;k++){s+=r[k].notion;c++;} return c?s/c:r[idx].notion; }
    function meanTrBefore(idx){ var a=Math.max(0,idx-opt.lookback),s=0,c=0; for(var k=a;k<idx;k++){s+=tr[k];c++;} return c?s/c:(tr[idx]||1); }

    var hot=new Array(n);
    for(i=0;i<n;i++){ hot[i]= r[i].notion >= meanNotionBefore(i)*opt.hotMult; }

    // agrupa runs de candles quentes (tolerando maxGap frios no meio)
    i=0;
    while(i<n){
      if(!hot[i]){ i++; continue; }
      var s=i, e=i, gap=0, j=i+1;
      while(j<n && (hot[j] || gap<opt.maxGap)){
        if(hot[j]){ e=j; gap=0; } else { gap++; }
        j++;
      }
      // fecha a batalha [s..e]
      var len=e-s+1;
      if(len>=opt.minLen){
        var lo=Infinity, hi=-Infinity, buyN=0, sellN=0, notion=0, hasSide=false;
        for(var k=s;k<=e;k++){
          lo=Math.min(lo,num(candles[k].low)); hi=Math.max(hi,num(candles[k].high));
          buyN+=r[k].buyN; sellN+=r[k].sellN; notion+=r[k].notion; hasSide=hasSide||r[k].hasSide;
        }
        var strong=Math.max(buyN,sellN), weak=Math.min(buyN,sellN);
        var twoSided= strong>0 ? weak/strong : 0;
        if(twoSided>=opt.twoSidedMin){
          var atr=meanTrBefore(s);
          var effMean=meanNotionBefore(s);
          var effort= notion / Math.max(effMean*len, opt.epsilon);
          var netMove= num(candles[e].close) - num(candles[s].open);
          var resultATR= Math.abs(netMove)/Math.max(atr, opt.epsilon);
          var winner = resultATR < opt.drawThreshATR ? "draw" : (netMove>0 ? "buyers" : "sellers");
          out.push({
            startIndex:s, endIndex:e,
            startTime:num(candles[s].time), endTime:num(candles[e].time),
            priceLow:lo, priceHigh:hi,
            winner:winner,
            effort:effort,           // ×média (quanto fluxo a briga consumiu)
            result:resultATR,        // deslocamento líquido em ATRs
            efficiency: resultATR/Math.max(effort,opt.epsilon),
            twoSided:twoSided,       // 0..1 (quão bilateral foi)
            buyNotional:buyN, sellNotional:sellN, notional:notion,
            netMove:netMove, len:len, hasSideData:hasSide
          });
        }
      }
      i=e+1;
    }
    // mantém só as mais recentes (perf/densidade §14)
    if(out.length>opt.maxBattles) out=out.slice(out.length-opt.maxBattles);
    return out;
  }

  function latest(candles, options){ var b=detect(candles,options); return b.length?b[b.length-1]:null; }

  window.DVLXRayBattle = {
    version:"1.636",
    defaults:DEFAULTS,
    detect:detect,
    latest:latest
  };
})();
