/* ============================================================================
   DVL X-Ray Lab — Liquidity Debt Engine (Beta 1.639, MVP passo 5 · V1)
   ----------------------------------------------------------------------------
   Registra eventos "pendentes" e acompanha o ciclo de vida (spec §5). V1 cobre o
   evento mais bem-definido a partir dos candles: FVG (Fair Value Gap) acompanhado
   de forte agressão/volume. Os demais (absorção sem reteste, POC abandonado,
   liquidez retirada por order book) entram com o backend/depth nas próximas
   fases.

   Ciclo de vida (§5):
     OPEN     — evento ainda não revisitado
     PARTIAL  — preço começou a interagir com a região, sem concluir
     RESOLVED — critério de resolução atingido (gap preenchido)
     EXPIRED  — perdeu validade por tempo ou distância

   FVG:
     bull — high[i-1] < low[i+1] (impulso de alta deixou um vazio embaixo);
            preenche quando o preço volta pra baixo até o gap.
     bear — low[i-1]  > high[i+1] (impulso de baixa deixou vazio em cima);
            preenche quando o preço sobe até o gap.
   Só vira "dívida" se o candle de impulso teve volume quente + agressão do lado.

   Função PURA sobre candles → testável; UI só consome. Cada evento leva
   startIndex/startTime + faixa (gapLow/gapHigh) p/ o overlay desenhar.
   ============================================================================ */
(function(){
  "use strict";

  var DEFAULTS = {
    lookback: 50,
    hotMult: 1.3,       // volume do impulso >= 1.3× a média recente
    aggBuy: 0.56,       // buyFrac do impulso p/ FVG bull
    aggSell: 0.44,      // buyFrac <= p/ FVG bear
    minGapATR: 0.25,    // gap precisa ter >= 0.25 ATR (ignora ruído)
    maxAge: 200,        // candles sem resolver → EXPIRED
    maxDistATR: 10,     // preço longe demais do gap → EXPIRED
    maxEvents: 24,
    keepResolved: false,
    keepExpired: false,
    epsilon: 1e-9
  };

  function num(v,d){ v=Number(v); return Number.isFinite(v)?v:(d||0); }
  function hlc3(c){ return (num(c.high)+num(c.low)+num(c.close))/3; }
  function trueRange(cur,prev){ var h=num(cur.high),l=num(cur.low); if(!prev) return h-l; var pc=num(prev.close); return Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); }
  function raw(c){
    var vol=num(c.volume);
    var bv=(c.buyVolume!=null)?num(c.buyVolume):NaN;
    var notion=(c.quoteVolume!=null&&num(c.quoteVolume)>0)?num(c.quoteVolume):vol*hlc3(c);
    return { notion:notion, buyFrac:(Number.isFinite(bv)&&vol>0?bv/vol:0.5), hasSide:Number.isFinite(bv) };
  }
  function clamp(x,a,b){ return x<a?a:(x>b?b:x); }

  function detect(candles, options){
    var opt=Object.assign({},DEFAULTS,options||{});
    var out=[];
    if(!Array.isArray(candles)||candles.length<6) return out;
    var n=candles.length, i;
    var r=new Array(n), tr=new Array(n);
    for(i=0;i<n;i++){ r[i]=raw(candles[i]); tr[i]=trueRange(candles[i], i>0?candles[i-1]:null); }
    function meanNotionBefore(idx){ var a=Math.max(0,idx-opt.lookback),s=0,c=0; for(var k=a;k<idx;k++){s+=r[k].notion;c++;} return c?s/c:r[idx].notion; }
    function meanTrBefore(idx){ var a=Math.max(0,idx-opt.lookback),s=0,c=0; for(var k=a;k<idx;k++){s+=tr[k];c++;} return c?s/c:(tr[idx]||1); }

    var last=n-1, closeNow=num(candles[last].close);

    for(i=1;i<n-1;i++){                       // i é o candle de impulso (precisa i-1 e i+1)
      var effMean=meanNotionBefore(i), atr=meanTrBefore(i); if(!(atr>0)) atr=opt.epsilon;
      if(r[i].notion < effMean*opt.hotMult) continue; // impulso sem volume relevante

      var h0=num(candles[i-1].high), l0=num(candles[i-1].low);
      var h2=num(candles[i+1].high), l2=num(candles[i+1].low);
      var dir=null, gapLow, gapHigh;
      if(h0 < l2 && r[i].buyFrac>=opt.aggBuy){ dir="bull"; gapLow=h0; gapHigh=l2; }
      else if(l0 > h2 && r[i].buyFrac<=opt.aggSell){ dir="bear"; gapLow=h2; gapHigh=l0; }
      else continue;

      var gapSize=gapHigh-gapLow;
      if(gapSize < opt.minGapATR*atr) continue; // gap insignificante

      var createIdx=i+1, age=last-createIdx;

      // ciclo de vida: quão fundo o preço entrou no gap depois de criado
      var fillPct=0, entered=false, filled=false;
      if(dir==="bull"){
        var minLow=Infinity;
        for(var j=createIdx+1;j<n;j++){ var lj=num(candles[j].low); if(lj<minLow) minLow=lj; }
        if(minLow!==Infinity){
          if(minLow<=gapHigh) entered=true;
          if(minLow<=gapLow) filled=true;
          fillPct=clamp((gapHigh-minLow)/Math.max(gapSize,opt.epsilon),0,1);
        }
      } else {
        var maxHigh=-Infinity;
        for(var j2=createIdx+1;j2<n;j2++){ var hj=num(candles[j2].high); if(hj>maxHigh) maxHigh=hj; }
        if(maxHigh!==-Infinity){
          if(maxHigh>=gapLow) entered=true;
          if(maxHigh>=gapHigh) filled=true;
          fillPct=clamp((maxHigh-gapLow)/Math.max(gapSize,opt.epsilon),0,1);
        }
      }

      // distância do preço atual até o gap (em ATR)
      var mid=(gapLow+gapHigh)/2;
      var dist = closeNow>gapHigh ? (closeNow-gapHigh) : (closeNow<gapLow ? (gapLow-closeNow) : 0);
      var distATR = dist/atr;

      var status;
      if(filled) status="resolved";
      else if(age>opt.maxAge || distATR>opt.maxDistATR) status="expired";
      else if(entered) status="partial";
      else status="open";

      if(status==="resolved" && !opt.keepResolved) continue;
      if(status==="expired" && !opt.keepExpired) continue;

      out.push({
        type:"fvg", dir:dir,
        startIndex:createIdx, startTime:num(candles[createIdx].time),
        gapLow:gapLow, gapHigh:gapHigh, mid:mid,
        status:status, fillPct:fillPct,
        ageCandles:age, distATR:distATR,
        aggression:r[i].notion/Math.max(effMean,opt.epsilon), imbalance:r[i].buyFrac,
        hasSideData:r[i].hasSide
      });
    }

    // mais recentes primeiro; corta pelo teto
    out.sort(function(a,b){ return b.startIndex-a.startIndex; });
    if(out.length>opt.maxEvents) out=out.slice(0,opt.maxEvents);
    return out;
  }

  function open(candles, options){ return detect(candles,options).filter(function(e){ return e.status==="open"||e.status==="partial"; }); }

  window.DVLXRayDebt = { version:"1.639", defaults:DEFAULTS, detect:detect, open:open };
})();
