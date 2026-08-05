/* ──────────────────────────────────────────────────────────────────────────
   DVL Liquidity Bands — SOLVER isolado (Beta 1.610+)

   Consome o MOTOR do Deep Heatmap (snapshots de order book + eventos de
   consumo/retirada) e produz DUAS BANDAS que rodeiam o preço: a parede de ASK
   dominante acima (banda superior) e a parede de BID dominante abaixo (banda
   inferior). Suavizadas no tempo (EMA) formam o "caminho das ordens". Os
   eventos absorvido(consume)/retirado(pull) do motor viram marcadores.

   Módulo PURO (sem DOM/rede): roda em Node (testes offline) e no app. O caller
   passa os snapshots já DECODIFICADOS (notional em $ por bin); um adaptador no
   app decodifica os Uint16 do motor (decodeNotional = expm1(code/4096)).
   ────────────────────────────────────────────────────────────────────────── */
(function(root, factory){
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;   // Node / testes
  if (typeof self !== "undefined") self.DVLLiquidityBands = api;               // worker/browser
  if (typeof window !== "undefined") window.DVLLiquidityBands = api;
})(this, function(){
  "use strict";

  function clampNum(v,a,b,d){ v=Number(v); if(!Number.isFinite(v)) v=d; return Math.max(a,Math.min(b,v)); }

  var DEFAULTS = {
    rangePct: 0.6,        // procura paredes dentro de ±rangePct% do mid
    minNotional: 50000,   // uma parede precisa ter pelo menos isto ($) pra contar
    wallStrength: 2.2,    // e >= wallStrength × média de notional da faixa (adaptativo)
    smoothBars: 8,        // suavização EMA das bandas (0 = sem suavização)
    buildRatio: 1.15,     // cresceu >=15% → "building" (ordem colocada)
    fadeRatio: 0.6        // caiu <=60% → "fading" (retirada/absorvida)
  };

  /* Parede dominante de um lado: varre os bins cujo preço cai na faixa e do lado
     certo, retorna {price, notional} do bin mais forte acima do limiar, ou null.
     arr: notional decodificado por bin; bin i → preço (base+i)*step.
     dir=+1 (asks acima do mid) / dir=-1 (bids abaixo do mid). */
  function dominantWall(arr, base, step, mid, range, dir, minNotional, wallStrength){
    var loP, hiP;
    if(dir > 0){ loP = mid;         hiP = mid + range; }   // asks: (mid, mid+range]
    else       { loP = mid - range; hiP = mid;         }   // bids: [mid-range, mid)
    var bestI = -1, bestN = 0, sum = 0, cnt = 0;
    for(var i=0;i<arr.length;i++){
      var price = (base + i) * step;
      if(dir > 0){ if(price <= loP || price > hiP) continue; }
      else       { if(price < loP  || price >= hiP) continue; }
      cnt++;                               // densidade: conta TODOS os bins da faixa
      var n = arr[i]; if(!(n > 0)) continue;
      sum += n;
      if(n > bestN){ bestN = n; bestI = i; }
    }
    if(bestI < 0) return null;
    var avg = cnt > 0 ? sum / cnt : 0;
    // precisa passar no piso absoluto E ser dominante vs a média da faixa
    if(bestN < minNotional) return null;
    if(avg > 0 && bestN < wallStrength * avg) return null;
    return { price: (base + bestI) * step, notional: bestN, avg: avg };
  }

  function classify(cur, prev, buildRatio, fadeRatio){
    if(prev <= 0) return cur > 0 ? "placed" : "none";
    if(cur <= 0) return "gone";
    if(cur >= prev * buildRatio) return "building";
    if(cur <= prev * fadeRatio) return "fading";
    return "holding";
  }

  /* snapshots: [{t, mid, base, step, bid:[..notional..], ask:[..notional..]}]
     (arrays já decodificados). config: ver DEFAULTS.
     Retorna { bands:[{t,mid,upper,lower,upperN,lowerN,upperState,lowerState,
     rawUpper,rawLower}], meta }. */
  function compute(snapshots, config){
    config = config || {};
    var rangePct   = clampNum(config.rangePct, 0.05, 5, DEFAULTS.rangePct);
    var minNotional= clampNum(config.minNotional, 0, 1e12, DEFAULTS.minNotional);
    var wallStr    = clampNum(config.wallStrength, 1, 20, DEFAULTS.wallStrength);
    var smoothBars = clampNum(config.smoothBars, 0, 200, DEFAULTS.smoothBars);
    var buildRatio = clampNum(config.buildRatio, 1.01, 5, DEFAULTS.buildRatio);
    var fadeRatio  = clampNum(config.fadeRatio, 0.05, 0.99, DEFAULTS.fadeRatio);
    var alpha = smoothBars > 0 ? 2 / (smoothBars + 1) : 1;

    var bands = [];
    var emaU = null, emaL = null, prevUN = 0, prevLN = 0;

    for(var s=0; s<snapshots.length; s++){
      var snap = snapshots[s];
      var mid = Number(snap.mid);
      var step = Number(snap.step), base = Number(snap.base);
      if(!Number.isFinite(mid) || !Number.isFinite(step) || step <= 0){ continue; }
      var range = mid * rangePct / 100;

      var wU = dominantWall(snap.ask || [], base, step, mid, range, +1, minNotional, wallStr);
      var wL = dominantWall(snap.bid || [], base, step, mid, range, -1, minNotional, wallStr);

      var rawU = wU ? wU.price : null;
      var rawL = wL ? wL.price : null;

      // EMA só quando a parede existe; quando some, a banda mantém o último nível
      // (o "caminho" não pula pra fora) até uma nova parede aparecer.
      if(rawU != null) emaU = (emaU == null) ? rawU : emaU + alpha * (rawU - emaU);
      if(rawL != null) emaL = (emaL == null) ? rawL : emaL + alpha * (rawL - emaL);

      var upper = (emaU != null) ? emaU : (mid + range);
      var lower = (emaL != null) ? emaL : (mid - range);
      // garante que a banda cerca o preço (nunca cruza pro lado errado)
      if(upper < mid) upper = mid + range * 0.15;
      if(lower > mid) lower = mid - range * 0.15;

      var uN = wU ? wU.notional : 0, lN = wL ? wL.notional : 0;
      var uState = classify(uN, prevUN, buildRatio, fadeRatio);
      var lState = classify(lN, prevLN, buildRatio, fadeRatio);
      prevUN = uN; prevLN = lN;

      bands.push({
        t: snap.t, mid: mid,
        upper: upper, lower: lower,
        rawUpper: rawU, rawLower: rawL,
        upperN: uN, lowerN: lN,
        upperState: uState, lowerState: lState
      });
    }

    return { bands: bands, count: bands.length, config: {
      rangePct:rangePct, minNotional:minNotional, wallStrength:wallStr,
      smoothBars:smoothBars, buildRatio:buildRatio, fadeRatio:fadeRatio
    } };
  }

  /* Marca os eventos do motor (consume=absorvido, pull=retirado) num formato
     limpo pro renderer. events do motor: {t,p,book,kind,n,strength}. */
  function markEvents(consumption, t0, t1){
    var out = [];
    for(var i=0;i<(consumption||[]).length;i++){
      var e = consumption[i];
      if(e.t < t0 || e.t > t1) continue;
      out.push({
        t: e.t, price: Number(e.p),
        kind: e.kind === "consume" ? "absorbed" : "pulled",
        side: e.book,                 // "ask" (acima) / "bid" (abaixo)
        notional: Number(e.n) || 0,
        strength: Number(e.strength) || 0
      });
    }
    return out;
  }

  /* Adaptador: converte snapshots crus do motor Deep Heatmap ({t,base,b,a} com
     Uint16 codificado + step global) para a forma decodificada que compute()
     consome. decode = expm1(code/4096). */
  function fromHeatmap(rawSnaps, step){
    var out = [];
    for(var s=0;s<(rawSnaps||[]).length;s++){
      var snap = rawSnaps[s], b = snap.b, a = snap.a, base = snap.base;
      var n = b ? b.length : 0;
      var bid = new Float64Array(n), ask = new Float64Array(n);
      for(var i=0;i<n;i++){
        bid[i] = b[i] > 0 ? Math.expm1(b[i] / 4096) : 0;
        ask[i] = (a && a[i] > 0) ? Math.expm1(a[i] / 4096) : 0;
      }
      // mid: bin do meio (center = base + rows/2) * step
      var mid = (base + (n >> 1)) * step;
      out.push({ t: snap.t, mid: mid, base: base, step: step, bid: bid, ask: ask });
    }
    return out;
  }

  return {
    compute: compute,
    markEvents: markEvents,
    fromHeatmap: fromHeatmap,
    _dominantWall: dominantWall,
    _classify: classify,
    DEFAULTS: DEFAULTS
  };
});
