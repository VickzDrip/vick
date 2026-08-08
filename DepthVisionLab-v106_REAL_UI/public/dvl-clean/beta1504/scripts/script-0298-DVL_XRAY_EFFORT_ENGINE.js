/* ============================================================================
   DVL X-Ray Lab — Effort vs Result Engine (Beta 1.635, MVP passo 2)
   ----------------------------------------------------------------------------
   Mede a EFICIÊNCIA com que a agressão/volume consegue deslocar o preço.
   É o motor mais simples de validar do X-Ray Lab (spec §7/§17) e serve TANTO
   o mobile quanto o desktop (spec §11) — só a apresentação muda.

   FUNÇÃO PURA de propósito: recebe candles (klines) e devolve, por janela, as
   métricas + a leitura classificada. Assim dá pra testar offline (Node) e o
   render/UI só consome o resultado — nada de cálculo pesado dentro do draw
   (spec §12/§14). NÃO cria sinal BUY/SELL, não usa IA (spec §16).

   Entrada: array de candles no formato dos klines do DVL:
     { time, open, high, low, close, volume, quoteVolume?, buyVolume? }
   Derivados por candle:
     sellVolume = volume - buyVolume
     delta      = buyVolume - sellVolume            (base asset)
     notional   = quoteVolume || volume*hlc3        (aprox. quando falta qv)
     buyNotional/sellNotional = notional * (buy/sellVolume / volume)

   EFFORT  = magnitude normalizada do fluxo (notional agregado + |delta|).
   RESULT  = deslocamento efetivo normalizado por ATR (spec §7).
   EFFICIENCY = RESULT / max(EFFORT, eps).
   READING = classificação da tabela do §7 (absorção / caminho livre / etc).
   ============================================================================ */
(function(){
  "use strict";

  var DEFAULTS = {
    lookback: 50,   // janela de normalização (média de esforço + ATR)
    window: 1,      // candles agregados por medição (1 = por candle)
    epsilon: 1e-9,
    // limiares (em unidades normalizadas ~z-relativo à média):
    highEffort: 1.3, // esforço >= 1.3x a média recente = "muito esforço"
    lowEffort: 0.7,  // <= 0.7x = "pouco esforço"
    highResult: 1.3, // deslocamento >= 1.3x ATR = "muito resultado"
    lowResult: 0.7
  };

  function num(v, d){ v = Number(v); return Number.isFinite(v) ? v : (d||0); }
  function hlc3(c){ return (num(c.high)+num(c.low)+num(c.close))/3; }

  /* True Range clássico (usa o close anterior quando existe). */
  function trueRange(cur, prev){
    var h = num(cur.high), l = num(cur.low);
    if(!prev) return h - l;
    var pc = num(prev.close);
    return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }

  /* Métricas cruas por candle (sem normalização). */
  function rawPerCandle(c){
    var vol = num(c.volume);
    var bv  = (c.buyVolume != null) ? num(c.buyVolume) : NaN;
    var sv  = Number.isFinite(bv) ? Math.max(0, vol - bv) : NaN;
    var delta = Number.isFinite(bv) ? (bv - sv) : 0;
    var notional = (c.quoteVolume != null && num(c.quoteVolume) > 0)
      ? num(c.quoteVolume)
      : vol * hlc3(c);
    var buyN = Number.isFinite(bv) && vol > 0 ? notional * (bv/vol) : notional/2;
    var sellN = Number.isFinite(bv) && vol > 0 ? notional * (sv/vol) : notional/2;
    return {
      volume: vol,
      buyVolume: Number.isFinite(bv) ? bv : vol/2,
      sellVolume: Number.isFinite(sv) ? sv : vol/2,
      delta: delta,
      notional: notional,
      buyNotional: buyN,
      sellNotional: sellN,
      hasSideData: Number.isFinite(bv)
    };
  }

  /* Classifica a leitura (spec §7). effortN/resultN já normalizados (~1 = média).
     dominantSide vem do sinal do delta agregado na janela. */
  function classify(effortN, resultN, dominantSide, opt){
    var hiE = effortN >= opt.highEffort, loE = effortN <= opt.lowEffort;
    var hiR = resultN >= opt.highResult, loR = resultN <= opt.lowResult;
    var side = dominantSide; // "buy" | "sell" | "flat"
    // Tabela do doc: muito/pouco esforço (do lado dominante) × muito/pouco resultado
    if(side === "buy"){
      if(hiE && loR) return { code:"buy_absorbed",  side:"buy",  label:"Muito esforço comprador, pouco resultado", meaning:"resistência/absorção acima" };
      if(loE && hiR) return { code:"buy_freepath",  side:"buy",  label:"Pouco esforço comprador, muito resultado", meaning:"oferta fina / caminho livre acima" };
    } else if(side === "sell"){
      if(hiE && loR) return { code:"sell_absorbed", side:"sell", label:"Muito esforço vendedor, pouco resultado", meaning:"demanda absorvendo abaixo" };
      if(loE && hiR) return { code:"sell_freepath", side:"sell", label:"Pouco esforço vendedor, muito resultado", meaning:"bid fraca / caminho livre abaixo" };
    }
    if(hiE && loR) return { code:"absorbed", side:side, label:"Muito esforço, pouco resultado", meaning:"absorção / dois lados brigando" };
    if(loE && hiR) return { code:"freepath", side:side, label:"Pouco esforço, muito resultado", meaning:"caminho livre" };
    return { code:"neutral", side:side, label:"Esforço e resultado equilibrados", meaning:"sem leitura forte" };
  }

  /* Núcleo: computa a série de {time, effort, result, efficiency, reading, ...}.
     Cada ponto agrega `window` candles e normaliza pelo `lookback` anterior. */
  function compute(candles, options){
    var opt = Object.assign({}, DEFAULTS, options || {});
    var out = [];
    if(!Array.isArray(candles) || candles.length === 0) return out;

    var n = candles.length;
    var raw = new Array(n);
    var tr = new Array(n);
    for(var i=0;i<n;i++){
      raw[i] = rawPerCandle(candles[i]);
      tr[i] = trueRange(candles[i], i>0 ? candles[i-1] : null);
    }

    var W = Math.max(1, Math.floor(opt.window));
    for(var j=0;j<n;j++){
      if(j < W - 1) continue;
      var s = j - W + 1;
      // agrega a janela [s..j]
      var notion=0, delta=0, buyN=0, sellN=0, hasSide=false;
      for(var k=s;k<=j;k++){
        notion += raw[k].notional; delta += raw[k].delta;
        buyN += raw[k].buyNotional; sellN += raw[k].sellNotional;
        hasSide = hasSide || raw[k].hasSideData;
      }
      var refPrice = num(candles[s].open);
      var displacement = Math.abs(num(candles[j].close) - refPrice);

      // normalização pelo lookback anterior (esforço médio + ATR médio)
      var lbStart = Math.max(0, s - opt.lookback);
      var effAcc=0, effCnt=0, atrAcc=0, atrCnt=0;
      for(var m=lbStart;m<s;m++){ effAcc += raw[m].notional; effCnt++; atrAcc += tr[m]; atrCnt++; }
      var effMean = effCnt ? (effAcc/effCnt)*W : notion;      // esperado p/ a janela
      var atrMean = atrCnt ? (atrAcc/atrCnt) : (tr[j]||1);

      var effortN = notion / Math.max(effMean, opt.epsilon);
      var resultN = displacement / Math.max(atrMean * Math.sqrt(W), opt.epsilon);
      var efficiency = resultN / Math.max(effortN, opt.epsilon);

      var dominantSide = !hasSide ? "flat" : (delta > 0 ? "buy" : (delta < 0 ? "sell" : "flat"));
      var reading = classify(effortN, resultN, dominantSide, opt);

      out.push({
        index: j,
        time: num(candles[j].time),
        window: W,
        effort: effortN,          // ~1 = esforço médio; >1 acima da média
        result: resultN,          // deslocamento em ATRs
        efficiency: efficiency,   // resultado por unidade de esforço
        notional: notion,
        delta: delta,
        buyNotional: buyN,
        sellNotional: sellN,
        dominantSide: dominantSide,
        hasSideData: hasSide,
        displacement: displacement,
        reading: reading
      });
    }
    return out;
  }

  function latest(candles, options){
    var s = compute(candles, options);
    return s.length ? s[s.length-1] : null;
  }

  window.DVLXRayEffort = {
    version: "1.635",
    defaults: DEFAULTS,
    compute: compute,
    latest: latest,
    // exposto p/ teste/uso avulso:
    _rawPerCandle: rawPerCandle,
    _classify: classify
  };
})();
