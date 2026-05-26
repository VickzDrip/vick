// ═══════════════════════════════════════════════════════════════════
//  DVL FOOTPRINT — extracted from DepthVisionLab
//
//  Estrutura de dados por candle (c):
//    c.fp      Map<price, {buy, sell, n, notional}>   ← footprint rows
//    c.buy     number   ← total qty comprada no candle (de trades)
//    c.sell    number   ← total qty vendida no candle
//    c.delta   number   ← c.buy - c.sell
//    c.v       number   ← volume total (kline)
//    c.o/h/l/c number   ← OHLC
//
//  Dependências globais esperadas:
//    clamp(v, min, max)       → número
//    fmtVolClean(n)           → string  (formata volume)
//    roundToTick(price)       → number  (arredonda ao passo de tick)
//    adaptivePriceStep(range, rows)  → number
//    PL, PT, PB               → padding do canvas (18, 8, 10)
//    LOCAL_API                → base URL da API ("http://localhost:3000")
//    S.candles, S.sym, S.tf, S.loadSeq, S.view
// ═══════════════════════════════════════════════════════════════════

// ── 1. Carregar footprint histórico do servidor ──────────────────
// Chamado de forma não-bloqueante após o draw inicial.
// Popula c.fp / c.buy / c.sell para candles históricos a partir de
// endpoint compactado — evita re-stream de trades individuais.
async function loadFootprintFromServer(seq = S.loadSeq, sym = S.sym, tf = S.tf) {
  if (!S.candles.length) return;
  try {
    const rows = +document.getElementById('profileRows')?.value || 80;
    const recent = S.candles.slice(-80);
    const avg = recent.length
      ? recent.reduce((a, c) => a + (c.h - c.l), 0) / recent.length
      : 100;
    const last = S.candles.at(-1);
    const range = last ? Math.max(last.h - last.l, avg * 3) : 100;
    const tick = adaptivePriceStep(range, rows * 0.72);

    const start = S.candles[0].t;
    const url = `${LOCAL_API}/api/footprint?interval=${tf}&start=${start}&end=${Date.now()}&tick=${tick}`;
    const data = await fetch(url).then(r => r.json());

    if (seq !== S.loadSeq || sym !== S.sym || tf !== S.tf) return;
    if (!Array.isArray(data) || !data.length) return;

    // Barras recentes já têm dados de alta resolução — pular
    const bigBarsLimit = clamp(+(document.getElementById('bigBars')?.value || 80), 1, 500);
    const recentFrom = Math.max(0, S.candles.length - bigBarsLimit);

    for (const fp of data) {
      const idx = findCandleIndex(fp.t);
      if (idx < 0 || idx >= recentFrom) continue;
      const c = S.candles[idx];
      if (!c) continue;
      c.buy = fp.b || 0;
      c.sell = fp.s || 0;
      c.delta = c.buy - c.sell;
      c.fp = new Map();
      for (const [price, sides] of Object.entries(fp.fp)) {
        const p = Math.round(+price / tick) * tick;
        c.fp.set(p, { buy: sides[0] || 0, sell: sides[1] || 0, n: 0, notional: (sides[0] + sides[1]) * p });
      }
    }

    window.__bigTradesPersistentCache = new Map(); // bust cache de clusters
    drawSoon();
    console.log(`Footprint loaded: ${data.length} candles with real data`);
  } catch (e) {
    console.log('footprint server load error:', e.message);
  }
}

// ── 2. Processar trade em tempo real → gravar em c.fp ───────────
// Chamado a cada aggTrade recebido via WebSocket.
//   t = objeto Binance aggTrade { p, q, T, m }
function processTrade(t, seq, live = true) {
  if (seq !== S.loadSeq) return;
  const p = +t.p, q = +t.q, time = +t.T, isSell = !!t.m;
  if (!isFinite(p) || !isFinite(q) || !isFinite(time) || q <= 0) return;
  const notional = p * q;

  const idx = findCandleIndex(time);
  if (idx >= 0) {
    const c = S.candles[idx];
    const side = isSell ? 'sell' : 'buy';
    c[side] = (c[side] || 0) + q;
    c.delta = (c.delta || 0) + (isSell ? -q : q);

    const row = roundToTick(p);
    const rec = c.fp.get(row) || { buy: 0, sell: 0, n: 0, notional: 0 };
    rec[side] += q;
    rec.n = (rec.n || 0) + 1;
    rec.notional = (rec.notional || 0) + notional;
    c.fp.set(row, rec);
  }
}

// ── 3. Resetar acumuladores ──────────────────────────────────────
function resetAggStats() {
  S.trades = [];
  S.candles.forEach(c => { c.delta = 0; c.buy = 0; c.sell = 0; c.fp = new Map(); });
}

// ════════════════════════════════════════════════════════════════════
//  CÁLCULO DE LINHAS (ROWS)
// ════════════════════════════════════════════════════════════════════

// ── 4. Pressão de compra estimada pelo shape do candle ───────────
// Retorna 0.0–1.0 (proporção de compra sintética).
// Usado como fallback quando c.fp está vazio.
function footprintPressure(c) {
  const range = Math.max(1e-9, c.h - c.l);
  const body = (c.c - c.o) / range;
  const closePos = (c.c - c.l) / range;
  let br = 0.50 + body * 0.35 + (closePos - 0.5) * 0.22;
  if ((c.buy + c.sell) > 0)
    br = br * 0.35 + (c.buy / (c.buy + c.sell)) * 0.65;
  return clamp(br, 0.12, 0.88);
}

// ── 5. Gerar rows sintéticas (quando não há dados reais) ─────────
// Distribui volume total do candle em N níveis de preço usando
// gaussiana centrada no body + pico na última cotação.
function syntheticFootprintRows(c, maxRows = 14) {
  const rows = [];
  const range = Math.max(1e-9, c.h - c.l);
  const n = clamp(Math.round(range / Math.max(range / maxRows, 1e-9)), 6, maxRows);
  const buyRatio = footprintPressure(c), sellRatio = 1 - buyRatio;
  const bodyMid = (c.o + c.c) / 2, close = c.c;
  let weights = [], sum = 0;
  for (let k = 0; k < n; k++) {
    const price = c.l + range * (k + 0.5) / n;
    const dBody = Math.abs(price - bodyMid) / range;
    const dClose = Math.abs(price - close) / range;
    const w = 0.45 + Math.exp(-dBody * 5.5) * 1.2 + Math.exp(-dClose * 8) * 0.75
      + (k === 0 || k === n - 1 ? 0.25 : 0);
    weights.push({ price, w });
    sum += w;
  }
  const total = Math.max(0, +c.v || 0);
  weights.forEach(r => {
    const vol = total * r.w / Math.max(1e-9, sum);
    const rowBias = (r.price - c.l) / range - 0.5;
    const localBuy = clamp(buyRatio + rowBias * (c.c >= c.o ? 0.10 : -0.10), 0.08, 0.92);
    rows.push([r.price, { buy: vol * localBuy, sell: vol * (1 - localBuy), synthetic: true }]);
  });
  return rows.sort((a, b) => b[0] - a[0]);
}

// ── 6. Normalizar rows reais (c.fp → array ordenado) ────────────
// Principal accessor. Usa dados reais se cobrem ≥3.5% do volume;
// caso contrário cai para sintético. Escala para bater com c.v.
function normalizedFootprintRows(c, maxRows = 18) {
  let rows = [...c.fp.entries()]
    .map(([p, r]) => [+p, { buy: +r.buy || 0, sell: +r.sell || 0, synthetic: false, n: r.n || 0, notional: r.notional || 0 }])
    .filter(([p, r]) => isFinite(p) && (r.buy + r.sell) > 0)
    .sort((a, b) => b[0] - a[0]);

  const fpTotal = rows.reduce((a, [_, r]) => a + r.buy + r.sell, 0);
  const candleVol = Math.max(0, +c.v || 0);

  if (!rows.length || fpTotal < candleVol * 0.035) {
    rows = syntheticFootprintRows(c, maxRows);
  } else if (candleVol > 0 && fpTotal > 0) {
    const k = clamp(candleVol / fpTotal, 0.18, 12);
    rows = rows.map(([p, r]) => [p, { buy: r.buy * k, sell: r.sell * k, synthetic: false, n: r.n || 0, notional: r.notional || 0 }]);
  }

  rows = compressFootprintRows(rows, maxRows);
  return rows;
}

// ── 7. Comprimir muitas rows em maxRows (merge por grupo) ────────
function compressFootprintRows(rows, maxRows) {
  if (rows.length <= maxRows) return rows;
  const out = [];
  const group = Math.ceil(rows.length / maxRows);
  for (let i = 0; i < rows.length; i += group) {
    const chunk = rows.slice(i, i + group);
    let buy = 0, sell = 0, px = 0, wt = 0, synthetic = true;
    chunk.forEach(([p, r]) => {
      const tv = (+r.buy || 0) + (+r.sell || 0);
      buy += +r.buy || 0;
      sell += +r.sell || 0;
      px += p * Math.max(tv, 1);
      wt += Math.max(tv, 1);
      if (!r.synthetic) synthetic = false;
    });
    out.push([px / Math.max(1, wt), { buy, sell, synthetic }]);
  }
  return out.sort((a, b) => b[0] - a[0]);
}

// ── 8. Cobertura real de trades no candle ────────────────────────
// Retorna 0.0–1.0 (fpTotal / c.v). 1.0 = cobertura total.
function candleTradeCoverage(c) {
  const fpTotal = [...c.fp.values()].reduce((a, r) => a + (+r.buy || 0) + (+r.sell || 0), 0);
  const v = Math.max(0, +c.v || 0);
  return v > 0 ? fpTotal / v : 0;
}

// ── 9. Rows de distribuição (fallback para perfil) ───────────────
function candleDistributionRows(c, step) {
  const range = Math.max(c.h - c.l, 1e-9);
  const lo = Math.floor(c.l / step) * step;
  const hi = Math.ceil(c.h / step) * step;
  const rows = [];
  const buyShare = footprintPressure(c);
  let sumW = 0;
  for (let p = lo; p <= hi + step * 0.5; p += step) {
    const cp = p + step * 0.5;
    if (cp < c.l || cp > c.h) continue;
    const distBody = Math.abs(cp - (c.o + c.c) / 2) / range;
    const distClose = Math.abs(cp - c.c) / range;
    const inBody = cp >= Math.min(c.o, c.c) && cp <= Math.max(c.o, c.c);
    const wickBoost = ((cp < c.o && cp < c.c) || (cp > c.o && cp > c.c)) ? 0.85 : 1;
    const w = (inBody ? 1.25 : 0.58) + Math.exp(-distBody * 5) * 1.05 + Math.exp(-distClose * 8) * 0.70 + wickBoost * 0.16;
    rows.push({ p: cp, w });
    sumW += w;
  }
  const total = Math.max(0, +c.v || 0);
  return rows.map(r => {
    const local = (r.p - c.l) / range - 0.5;
    const b = clamp(buyShare + local * (c.c >= c.o ? 0.08 : -0.08), 0.07, 0.93);
    const vol = total * r.w / Math.max(1e-9, sumW);
    return [r.p, { buy: vol * b, sell: vol * (1 - b), synthetic: true }];
  }).sort((a, b) => b[0] - a[0]);
}

// ── 10. Rows para perfil por sessão (real + fallback sintético) ──
function candleProfileRows(c, step) {
  let rows = [...c.fp.entries()]
    .map(([p, r]) => [+p, { buy: +r.buy || 0, sell: +r.sell || 0, synthetic: false }])
    .filter(([p, r]) => isFinite(p) && (r.buy + r.sell) > 0);
  const candleVol = Math.max(0, +c.v || 0);
  const fpVol = rows.reduce((a, [_, r]) => a + r.buy + r.sell, 0);
  if (rows.length && fpVol > 0) {
    const k = clamp(candleVol / fpVol, 0.20, 10);
    return rows.map(([p, r]) => [p, { buy: r.buy * k, sell: r.sell * k, synthetic: false }])
               .sort((a, b) => b[0] - a[0]);
  }
  return candleDistributionRows(c, step);
}

// ════════════════════════════════════════════════════════════════════
//  DESENHO DO FOOTPRINT CANDLE
// ════════════════════════════════════════════════════════════════════

// ── 11. Desenhar footprint ladder no canvas ──────────────────────
// Chamado por draw() quando S.chartStyle === 'footprint'.
//   ctx: CanvasRenderingContext2D
//   V:   objeto com { cs, a, b, n } — candles visíveis
//   sc:  scale helpers { y(price), lo, hi }
//   x:   fn(index) → pixel x do candle
//   bw:  largura de um candle em pixels
function drawFootprint(ctx, V, sc, x, bw) {
  // Se fpMode === 'last' → só os últimos 90 candles exibem ladder completo
  const fpModeEl = document.getElementById('fpMode');
  const rightLimit = fpModeEl ? (fpModeEl.value === 'last' ? 90 : 9999) : 9999;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  V.cs.forEach((c, j) => {
    const i = V.a + j;
    const xx = x(i);
    const top = sc.y(c.h), bot = sc.y(c.l), hh = Math.max(2, bot - top);
    const rows = normalizedFootprintRows(c, Math.max(8, Math.min(22, Math.floor(hh / 9))));
    const maxRow = Math.max(1, ...rows.map(([_, r]) => r.buy + r.sell));
    const realDelta = (+c.buy || 0) - (+c.sell || 0);

    // Zoom muito afastado → mini footprint agregado (sem texto)
    if (V.n > rightLimit || bw < 18 || hh < 45) {
      const w = Math.max(6, bw * 0.82), left = xx - w / 2;
      const buyTot = rows.reduce((a, [_, r]) => a + r.buy, 0);
      const sellTot = rows.reduce((a, [_, r]) => a + r.sell, 0);
      const total = Math.max(1, buyTot + sellTot);
      ctx.fillStyle = 'rgba(5,9,20,.65)'; ctx.fillRect(left, top, w, hh);
      ctx.strokeStyle = realDelta >= 0 ? 'rgba(0,230,118,.75)' : 'rgba(255,61,87,.75)';
      ctx.lineWidth = 1.1; ctx.strokeRect(left, top, w, hh);
      const mid = top + hh * (sellTot / total);
      ctx.fillStyle = 'rgba(255,61,87,.20)'; ctx.fillRect(left + 1, top, w - 2, Math.max(1, mid - top));
      ctx.fillStyle = 'rgba(0,230,118,.20)'; ctx.fillRect(left + 1, mid, w - 2, Math.max(1, bot - mid));
      return;
    }

    // Ladder completo
    const boxW = clamp(bw * 2.75, 54, 116);
    const left = xx - boxW / 2;
    const rowH = clamp(hh / Math.max(1, rows.length), 9, 18);

    ctx.fillStyle = 'rgba(5,9,20,.78)'; ctx.fillRect(left, top, boxW, hh);
    ctx.strokeStyle = realDelta >= 0 ? 'rgba(0,180,90,.55)' : 'rgba(200,50,70,.55)';
    ctx.lineWidth = 0.95; ctx.strokeRect(left, top, boxW, hh);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bot); ctx.stroke();

    rows.forEach(([price, r]) => {
      const y = sc.y(price);
      if (y < PT - 14 || y > sc.y(sc.lo) + 20) return;
      const buy = r.buy || 0, sell = r.sell || 0, tot = buy + sell;
      const pwr = clamp(tot / maxRow, 0, 1);
      const imbal = (buy - sell) / Math.max(1e-9, tot);
      const baseAlpha = clamp(0.10 + pwr * 0.45, 0.10, 0.62);
      const mid = left + boxW / 2;
      const halfW = boxW / 2 - 2;

      // Fundo do row
      ctx.fillStyle = 'rgba(5,9,20,.72)';
      ctx.fillRect(left + 1, y - rowH / 2, boxW - 2, rowH - 1);
      ctx.fillStyle = imbal >= 0 ? `rgba(0,230,118,${baseAlpha})` : `rgba(255,61,87,${baseAlpha})`;
      ctx.fillRect(left + 1, y - rowH / 2, boxW - 2, rowH - 1);

      // Barras: SELL esquerda (vermelho), BUY direita (verde)
      if (tot > 0) {
        const sellBar = clamp(sell / tot, 0, 1) * halfW;
        const buyBar  = clamp(buy  / tot, 0, 1) * halfW;
        ctx.fillStyle = `rgba(255,61,87,${clamp(0.20 + pwr * 0.42, 0.18, 0.68)})`;
        ctx.fillRect(left + 1, y - rowH / 2 + 1, sellBar, rowH - 2);
        ctx.fillStyle = `rgba(0,230,118,${clamp(0.20 + pwr * 0.42, 0.18, 0.68)})`;
        ctx.fillRect(mid, y - rowH / 2 + 1, buyBar, rowH - 2);
      }

      // Grid row
      ctx.strokeStyle = 'rgba(30,42,64,.65)'; ctx.lineWidth = 0.45;
      ctx.strokeRect(left + 1, y - rowH / 2, boxW - 2, rowH - 1);
      ctx.strokeStyle = 'rgba(80,100,140,.50)';
      ctx.beginPath(); ctx.moveTo(mid, y - rowH / 2); ctx.lineTo(mid, y + rowH / 2 - 1); ctx.stroke();

      // Texto sell / buy
      ctx.font = rowH >= 13 ? 'bold 9px monospace' : 'bold 8px monospace';
      ctx.shadowColor = 'rgba(0,0,0,.90)'; ctx.shadowBlur = 3;
      ctx.fillStyle = sell > buy ? 'rgba(255,110,130,1)' : 'rgba(160,170,190,.85)';
      ctx.fillText(fmtVolClean(sell * price), left + boxW * 0.25, y + 0.5);
      ctx.fillStyle = buy > sell ? 'rgba(0,235,120,1)' : 'rgba(160,170,190,.85)';
      ctx.fillText(fmtVolClean(buy * price), left + boxW * 0.75, y + 0.5);
      ctx.shadowBlur = 0;

      // Imbalance marker (≥60% de um lado e volume relevante)
      if (Math.abs(imbal) > 0.60 && pwr > 0.30) {
        ctx.fillStyle = imbal > 0 ? 'rgba(0,212,255,.55)' : 'rgba(240,180,41,.50)';
        ctx.fillRect(left + 2, y - rowH / 2, boxW - 4, 2.5);
      }
    });

    // Linha do corpo do candle
    const bull = c.c >= c.o, col = bull ? '#00e676' : '#ff3d57';
    ctx.strokeStyle = col; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bot); ctx.stroke();
    const yt = sc.y(Math.max(c.o, c.c)), yb = sc.y(Math.min(c.o, c.c));
    ctx.fillStyle = 'rgba(5,9,20,.65)';
    ctx.fillRect(xx - 2, yt, 4, Math.max(2, yb - yt));
    ctx.strokeStyle = col;
    ctx.strokeRect(xx - 2, yt, 4, Math.max(2, yb - yt));

    // Delta total no rodapé do ladder
    if (boxW > 62) {
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(5,9,20,.92)';
      ctx.fillRect(left, bot + 2, boxW, 15);
      ctx.strokeStyle = realDelta >= 0 ? 'rgba(0,180,90,.65)' : 'rgba(200,50,70,.65)';
      ctx.lineWidth = 0.7; ctx.strokeRect(left, bot + 2, boxW, 15);
      ctx.shadowColor = 'rgba(0,0,0,.90)'; ctx.shadowBlur = 2;
      ctx.fillStyle = realDelta >= 0 ? '#00ff88' : '#ff4466';
      ctx.fillText((realDelta >= 0 ? '▲ ' : '▼ ') + fmtVolClean(Math.abs(realDelta) * c.c), xx, bot + 11);
      ctx.shadowBlur = 0;
    }
  });

  ctx.fillStyle = 'rgba(0,212,255,.82)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '9px monospace';
  ctx.fillText('FOOTPRINT · ESQ=S / DIR=B · volume em USDT', PL + 6, PT + 25);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════
//  BIG TRADES a partir do FOOTPRINT
// ════════════════════════════════════════════════════════════════════

// ── 12. Valor de um level para fins de Big Trade ─────────────────
function footprintValueForBigTrade(price, row, side) {
  const qty = side === 'sell' ? (+row.sell || 0) : (+row.buy || 0);
  const unit = (document.getElementById('bigTradeUnit')?.value) || 'qty';
  return unit === 'notional' ? qty * Math.max(0, +price || 0) : qty;
}

// ── 13. Gap mediano entre rows (para tolerância de merge) ────────
function medianGapFromRows(rows) {
  const ps = rows.map(r => +r[0]).filter(isFinite).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < ps.length; i++) {
    const g = Math.abs(ps[i] - ps[i - 1]);
    if (g > 0 && isFinite(g)) gaps.push(g);
  }
  if (!gaps.length) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length * 0.5)] || gaps[0] || 0;
}

// ── 14. Construir clusters de Big Trade para um lado ─────────────
function buildFootprintBigTradeClustersForSide(rows, side, minV, mergeLevels) {
  const strong = [];
  for (const [price, row] of rows) {
    const p = +price;
    const v = footprintValueForBigTrade(p, row, side);
    if (isFinite(p) && isFinite(v) && v >= minV)
      strong.push({ price: p, value: v, qty: side === 'sell' ? (+row.sell || 0) : (+row.buy || 0) });
  }
  strong.sort((a, b) => a.price - b.price);
  if (!strong.length) return [];

  const baseGap = medianGapFromRows(rows);
  const tol = baseGap > 0 ? baseGap * Math.max(1, mergeLevels) : 0;
  const clusters = [];
  let cur = null;
  for (const it of strong) {
    if (!cur) {
      cur = { priceSum: it.price * Math.max(it.value, 1e-9), valueSum: it.value, qtySum: it.qty, count: 1, lastPrice: it.price };
      continue;
    }
    const near = mergeLevels > 0 && tol > 0 && Math.abs(it.price - cur.lastPrice) <= tol + 1e-9;
    if (near) {
      cur.priceSum += it.price * Math.max(it.value, 1e-9);
      cur.valueSum += it.value;
      cur.qtySum += it.qty;
      cur.count += 1;
      cur.lastPrice = it.price;
    } else {
      clusters.push(cur);
      cur = { priceSum: it.price * Math.max(it.value, 1e-9), valueSum: it.value, qtySum: it.qty, count: 1, lastPrice: it.price };
    }
  }
  if (cur) clusters.push(cur);
  return clusters.map(c => ({
    p: c.priceSum / Math.max(c.valueSum, 1e-9),
    btValue: c.valueSum,
    qtyValue: c.qtySum,
    levelCount: c.count,
    isSell: side === 'sell'
  }));
}

// ── 15. Construir clusters por candle (exibição de bolhas) ───────
// Retorna array de { idx, t } onde t = { p, btValue, qtyValue, levelCount, isSell }
function buildBigTradeClustersForCandle(idx) {
  const c = S.candles[idx];
  if (!c) return [];
  const minV = Math.max(0, +document.getElementById('bigTradeMinSize')?.value || 0);
  const mergeLevels = Math.max(0, Math.round(+document.getElementById('bigTradeMergeLevels')?.value || 2));
  const mode = (document.getElementById('bigTradeDisplay')?.value) || 'largestSide';
  const range = Math.max(1e-9, (+c.h || 0) - (+c.l || 0));

  const rows = normalizedFootprintRows(c, Math.max(10, Math.min(28, Math.round(range / Math.max(range / 22, 1e-9)))));
  if (!rows || !rows.length) return [];

  // Pré-filtrar: só níveis onde o lado dominante individualmente ≥ minV
  const qualRows = rows.filter(([price, row]) => {
    const buy = +row.buy || 0, sell = +row.sell || 0;
    const buyV  = footprintValueForBigTrade(price, row, 'buy');
    const sellV = footprintValueForBigTrade(price, row, 'sell');
    return Math.max(buyV, sellV) >= minV;
  }).sort((a, b) => a[0] - b[0]);
  if (!qualRows.length) return [];

  // Merge de níveis adjacentes
  const baseGap = medianGapFromRows(rows);
  const tol = baseGap > 0 ? baseGap * Math.max(1, mergeLevels) : 0;
  const merged = [];
  let cur = null;
  for (const [price, row] of qualRows) {
    const buy = +row.buy || 0, sell = +row.sell || 0;
    if (!cur) { cur = { priceSum: price * (buy + sell + 1e-9), wSum: buy + sell + 1e-9, buy, sell, count: 1, lastPrice: price }; continue; }
    if (mergeLevels > 0 && tol > 0 && Math.abs(price - cur.lastPrice) <= tol + 1e-9) {
      cur.priceSum += price * (buy + sell + 1e-9); cur.wSum += buy + sell + 1e-9;
      cur.buy += buy; cur.sell += sell; cur.count++; cur.lastPrice = price;
    } else {
      merged.push(cur);
      cur = { priceSum: price * (buy + sell + 1e-9), wSum: buy + sell + 1e-9, buy, sell, count: 1, lastPrice: price };
    }
  }
  if (cur) merged.push(cur);

  // Pontuar e separar por lado
  const all = [];
  for (const cl of merged) {
    const p = cl.priceSum / Math.max(cl.wSum, 1e-9);
    const buyV  = footprintValueForBigTrade(p, { buy: cl.buy, sell: cl.sell }, 'buy');
    const sellV = footprintValueForBigTrade(p, { buy: cl.buy, sell: cl.sell }, 'sell');
    const isSell = sellV > buyV;
    all.push({ p, btValue: Math.max(buyV, sellV), qtyValue: Math.max(cl.buy, cl.sell), levelCount: cl.count, isSell });
  }
  if (!all.length) return [];
  all.sort((a, b) => b.btValue - a.btValue);

  const g = { buy: null, sell: null, one: null, all: [] };
  for (const item of all) {
    g.all.push(item);
    if (!g.one || item.btValue > g.one.btValue) g.one = item;
    if (item.isSell) { if (!g.sell || item.btValue > g.sell.btValue) g.sell = item; }
    else             { if (!g.buy  || item.btValue > g.buy.btValue)  g.buy  = item; }
  }

  const out = [];
  if (mode === 'all')           g.all.forEach(t => out.push({ idx, t }));
  else if (mode === 'largestOne') { if (g.one)  out.push({ idx, t: g.one  }); }
  else                            { if (g.buy)  out.push({ idx, t: g.buy  });
                                    if (g.sell) out.push({ idx, t: g.sell }); }
  return out;
}
