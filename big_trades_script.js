// ═══════════════════════════════════════════════════════════════════
//  DVL BIG TRADES — extraído do DepthVisionLab
//
//  Pipeline completo:
//    aggTrades (WebSocket) → S.trades[]
//    → robustTradeStats()       percentis do notional
//    → buildBigTradeClustersForCandle(idx)  clusters por footprint
//    → visibleBigTradesByCandle(V)          cache persistente
//    → drawBigTrades(ctx, V, sc, x, W, H)   bolhas no canvas
//
//  Estrutura de um item de cluster (t):
//    t.p          price médio ponderado do cluster
//    t.btValue    valor dominante (qty ou notional conforme bigTradeUnit)
//    t.qtyValue   qty do lado dominante
//    t.levelCount quantos níveis de footprint foram merged
//    t.isSell     true = cluster de venda
//
//  Dependências globais esperadas:
//    S.candles, S.trades, S.sym, S.tf
//    clamp(v, min, max)
//    fmtVol(n), fmtN(n)
//    normalizedFootprintRows(c, maxRows)   ← do footprint_script.js
//    candleTradeCoverage(c)               ← do footprint_script.js
//    fpCfg()                              ← do footprint_script.js
//    tfMs(tf)                             → ms do timeframe
//    PL, PT, PB                           → paddings do canvas (18, 8, 10)
//    RP()                                 → right padding (inclui book)
// ═══════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════
//  1. ESTATÍSTICAS DOS TRADES (percentis)
// ══════════════════════════════════════════

// Quantil interpolado sobre array já ordenado
function quantileSorted(arr, q) {
  if (!arr.length) return 0;
  const pos = (arr.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (pos - lo);
}

// Estatísticas robustas de S.trades (ignora zeros, ordena por notional)
// Retorna: { n, median, p75, p88, p90, p95, p98, avg }
function robustTradeStats() {
  const arr = S.trades.map(t => +t.notional || 0).filter(v => v > 0).sort((a, b) => a - b);
  if (!arr.length) return { n: 0, median: 0, p75: 0, p90: 0, p95: 0, p98: 0, avg: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    n:      arr.length,
    median: quantileSorted(arr, 0.50),
    p75:    quantileSorted(arr, 0.75),
    p88:    quantileSorted(arr, 0.88),
    p90:    quantileSorted(arr, 0.90),
    p95:    quantileSorted(arr, 0.95),
    p98:    quantileSorted(arr, 0.98),
    avg:    sum / arr.length
  };
}

// Notional mediano dos trades atuais (usado como referência)
function avgNotional() {
  const s = robustTradeStats();
  return s.n ? s.median : 0;
}


// ══════════════════════════════════════════
//  2. LOOKUP DE CANDLE POR TIMESTAMP
// ══════════════════════════════════════════

// Busca binária: retorna índice do candle que contém `time`
function candleIndexByTime(time) {
  if (!S.candles.length) return -1;
  let lo = 0, hi = S.candles.length - 1;
  const ms = tfMs(S.tf);
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, t = S.candles[mid].t;
    if (time < t) hi = mid - 1;
    else if (time >= t + ms) lo = mid + 1;
    else return mid;
  }
  return -1;
}


// ══════════════════════════════════════════
//  3. BIG ORDER GROUPS (via S.trades raw)
// ══════════════════════════════════════════
//  Alternativa mais simples ao cluster de footprint.
//  Agrupa trades acima de threshold por candle.

function bigOrderConfig() {
  const minOrders = Math.max(1, Math.round(+document.getElementById('bigMinOrders')?.value || 2));
  const mode = (document.getElementById('bigMode')?.value) || 'candle';
  return { minOrders, mode };
}

// V: objeto com { a, b } — range de índices visíveis
// Retorna array de grupos: { idx, side, price, notional, count, hard, ... }
function buildBigOrderGroups(V) {
  const stats = robustTradeStats();
  if (!stats.n) return [];
  const mult = +document.getElementById('bigMult').value || 3;
  const threshold = Math.max(stats.median * mult, stats.p90 || 0);
  const cfg = bigOrderConfig(), groups = new Map();

  for (const t of S.trades) {
    if (t.notional < threshold) continue;
    const idx = candleIndexByTime(t.time);
    if (idx < V.a || idx >= V.b) continue;
    const key = cfg.mode === 'side' ? `${idx}-${t.isSell ? 'S' : 'B'}` : `${idx}`;
    let g = groups.get(key);
    if (!g) {
      g = { idx, buyCount: 0, sellCount: 0, count: 0, buyQty: 0, sellQty: 0, notional: 0, maxNotional: 0, priceSum: 0, weight: 0, hard: false };
      groups.set(key, g);
    }
    g.count++;
    if (t.isSell) { g.sellCount++; g.sellQty += t.q; }
    else          { g.buyCount++;  g.buyQty  += t.q; }
    g.notional    += t.notional;
    g.maxNotional  = Math.max(g.maxNotional, t.notional);
    g.priceSum    += t.p * t.notional;
    g.weight      += t.notional;
  }

  const hard = stats.p98 || threshold * 3;
  return [...groups.values()]
    .filter(g => cfg.mode === 'raw' || g.count >= cfg.minOrders)
    .map(g => ({
      ...g,
      price: g.weight ? g.priceSum / g.weight : S.candles[g.idx]?.c || 0,
      side:  g.sellCount > g.buyCount ? 'sell' : 'buy',
      hard:  g.maxNotional >= hard
    }));
}


// ══════════════════════════════════════════
//  4. LEITORES DE INPUTS
// ══════════════════════════════════════════

function bigTradeUnitValue(t) {
  const unit = (document.getElementById('bigTradeUnit')?.value) || 'qty';
  return unit === 'notional' ? (+t.notional || 0) : (+t.q || 0);
}
function bigTradeMinValue() {
  return Math.max(0, +document.getElementById('bigTradeMinSize')?.value || 0);
}
function bigTradeDisplayMode() {
  return (document.getElementById('bigTradeDisplay')?.value) || 'largestSide';
}
function bigTradeLabelMode() {
  return (document.getElementById('bigTradeLabel')?.value) || 'size';
}
function bigTradeMergeLevels() {
  return Math.max(0, Math.round(+document.getElementById('bigTradeMergeLevels')?.value || 2));
}
function bigTradeBubbleScale() {
  return clamp(+document.getElementById('bigTradeBubbleScale')?.value || 1.15, 0.4, 3);
}
function bigTradeMaxBubbles() {
  return Math.max(1, Math.round(+document.getElementById('bigTradeMaxBubbles')?.value || 4));
}

// Formata valor para label da bolha (ex: "4.2K", "$1.8M")
function formatBigTradeValue(v) {
  const unit = (document.getElementById('bigTradeUnit')?.value) || 'qty';
  const n = Math.abs(+v || 0);
  const prefix = unit === 'notional' ? '$' : '';
  if (n >= 1e9) return prefix + Math.round(n / 1e9) + 'B';
  if (n >= 1e6) return prefix + Math.round(n / 1e6) + 'M';
  if (n >= 1e3) return prefix + Math.round(n / 1e3) + 'K';
  return prefix + Math.round(n);
}


// ══════════════════════════════════════════
//  5. CONSTRUÇÃO DE CLUSTERS (footprint)
// ══════════════════════════════════════════

// Valor de um nível de footprint para fins de Big Trade
function footprintValueForBigTrade(price, row, side) {
  const qty = side === 'sell' ? (+row.sell || 0) : (+row.buy || 0);
  const unit = (document.getElementById('bigTradeUnit')?.value) || 'qty';
  return unit === 'notional' ? qty * Math.max(0, +price || 0) : qty;
}

// Gap mediano entre os preços das rows (tolerância de merge)
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

// Clusters de um único lado (buy ou sell) a partir de rows de footprint
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
      cur.qtySum   += it.qty;
      cur.count    += 1;
      cur.lastPrice = it.price;
    } else {
      clusters.push(cur);
      cur = { priceSum: it.price * Math.max(it.value, 1e-9), valueSum: it.value, qtySum: it.qty, count: 1, lastPrice: it.price };
    }
  }
  if (cur) clusters.push(cur);

  return clusters.map(c => ({
    p:          c.priceSum / Math.max(c.valueSum, 1e-9),
    btValue:    c.valueSum,
    qtyValue:   c.qtySum,
    levelCount: c.count,
    isSell:     side === 'sell'
  }));
}

// Chave de cache dos clusters (varia com inputs do usuário)
function bigTradeCacheConfigKey() {
  return 'v3|' + String(S.sym) + '|' + String(S.tf) + '|' +
         String(bigTradeMinValue()) + '|' + String(bigTradeDisplayMode()) + '|' +
         String(bigTradeMergeLevels()) + '|' + String(bigTradeUnitValue({ q: 1, notional: 1 }));
}

// Constrói clusters para um único candle (pré-filtra → merge → score)
// Retorna: [{ idx, t }]  onde t = { p, btValue, qtyValue, levelCount, isSell }
function buildBigTradeClustersForCandle(idx) {
  const c = S.candles[idx];
  if (!c) return [];

  // Bloqueia candles sem cobertura real quando fpRequireReal está ativo
  const _fpc = fpCfg();
  const _cov = candleTradeCoverage(c);
  if (_fpc.requireReal && _cov < _fpc.minCov) return [];

  const minV        = bigTradeMinValue();
  const mergeLevels = bigTradeMergeLevels();
  const mode        = bigTradeDisplayMode();
  const range       = Math.max(1e-9, (+c.h || 0) - (+c.l || 0));

  const rows = normalizedFootprintRows(c, Math.max(10, Math.min(28, Math.round(range / Math.max(range / 22, 1e-9)))));
  if (!rows || !rows.length) return [];

  // Passo 1: pré-filtrar — só níveis onde o lado dominante individualmente ≥ minV
  // (garante que nunca misturamos um nível fraco com um forte no merge)
  const qualRows = rows.filter(([price, row]) => {
    const buy  = +row.buy  || 0;
    const sell = +row.sell || 0;
    const buyV  = bigTradeUnitValue({ q: buy,  notional: buy  * Math.max(0, price) });
    const sellV = bigTradeUnitValue({ q: sell, notional: sell * Math.max(0, price) });
    return Math.max(buyV, sellV) >= minV;
  }).sort((a, b) => a[0] - b[0]);
  if (!qualRows.length) return [];

  // Passo 2: merge de níveis adjacentes qualificados
  const baseGap = medianGapFromRows(rows);
  const tol = baseGap > 0 ? baseGap * Math.max(1, mergeLevels) : 0;
  const merged = [];
  let cur = null;

  for (const [price, row] of qualRows) {
    const buy = +row.buy || 0, sell = +row.sell || 0;
    if (!cur) {
      cur = { priceSum: price * (buy + sell + 1e-9), wSum: buy + sell + 1e-9, buy, sell, count: 1, lastPrice: price };
      continue;
    }
    if (mergeLevels > 0 && tol > 0 && Math.abs(price - cur.lastPrice) <= tol + 1e-9) {
      cur.priceSum += price * (buy + sell + 1e-9);
      cur.wSum     += buy + sell + 1e-9;
      cur.buy      += buy;
      cur.sell     += sell;
      cur.count++;
      cur.lastPrice = price;
    } else {
      merged.push(cur);
      cur = { priceSum: price * (buy + sell + 1e-9), wSum: buy + sell + 1e-9, buy, sell, count: 1, lastPrice: price };
    }
  }
  if (cur) merged.push(cur);

  // Passo 3: pontuar cada cluster — lado dominante define isSell e btValue
  const all = [];
  for (const cl of merged) {
    const p     = cl.priceSum / Math.max(cl.wSum, 1e-9);
    const buyV  = bigTradeUnitValue({ q: cl.buy,  notional: cl.buy  * Math.max(0, p) });
    const sellV = bigTradeUnitValue({ q: cl.sell, notional: cl.sell * Math.max(0, p) });
    const isSell = sellV > buyV;
    all.push({ p, btValue: Math.max(buyV, sellV), qtyValue: Math.max(cl.buy, cl.sell), levelCount: cl.count, isSell });
  }

  if (!all.length) return [];
  all.sort((a, b) => b.btValue - a.btValue);

  // Separar pelo modo de exibição
  const g = { buy: null, sell: null, one: null, all: [] };
  for (const item of all) {
    g.all.push(item);
    if (!g.one || item.btValue > g.one.btValue) g.one = item;
    if (item.isSell) { if (!g.sell || item.btValue > g.sell.btValue) g.sell = item; }
    else             { if (!g.buy  || item.btValue > g.buy.btValue)  g.buy  = item; }
  }

  const out = [];
  if      (mode === 'all')        g.all.forEach(t => out.push({ idx, t }));
  else if (mode === 'largestOne') { if (g.one)  out.push({ idx, t: g.one });  }
  else                            { if (g.buy)  out.push({ idx, t: g.buy  });
                                    if (g.sell) out.push({ idx, t: g.sell }); }
  return out;
}


// ══════════════════════════════════════════
//  6. CACHE PERSISTENTE DE CLUSTERS
// ══════════════════════════════════════════

// Itera candles visíveis, mantém cache por candleKey.
// Conserva último resultado bom para evitar flicker durante reloads.
// V: { a, b } — índices visíveis
function visibleBigTradesByCandle(V) {
  const cfg = bigTradeCacheConfigKey();
  if (!window.__bigTradesPersistentCache) window.__bigTradesPersistentCache = new Map();
  const out = [];

  const visibleBarsLimit = clamp(+(document.getElementById('bigTradeVisibleBars')?.value || 200), 1, 2000);
  const a = Math.max(0, Math.min(Math.floor(V.a) - 2, S.candles.length - visibleBarsLimit));
  const b = Math.min(S.candles.length, Math.ceil(V.b) + 2);

  for (let idx = a; idx < b; idx++) {
    const c = S.candles[idx];
    if (!c) continue;

    // Chave inclui buy/sell derivados dos trades (não o c.v do kline que muda a todo tick)
    const candleKey = cfg + '|' + String(c.t) + '|' + String(c.h) + '|' + String(c.l) +
                      '|' + String(Math.round((c.buy  || 0) * 1e4)) +
                      '|' + String(Math.round((c.sell || 0) * 1e4));

    let cached = window.__bigTradesPersistentCache.get(candleKey);
    const isRecent = idx >= S.candles.length - 4; // recalcula últimas 4 velas sempre

    if (!cached || isRecent) {
      const built = buildBigTradeClustersForCandle(idx);
      if (built && built.length) {
        cached = { items: built, ts: Date.now(), idx };
        window.__bigTradesPersistentCache.set(candleKey, cached);
      } else if (cached?.items?.length) {
        // conserva cache anterior se nova computação retornou vazio
      } else {
        continue;
      }
    }

    if (cached?.items?.length) cached.items.forEach(o => out.push(o));
  }

  // Limpeza de cache: descarta entradas de candles muito antigos
  try {
    if (window.__bigTradesPersistentCache.size > 4000) {
      const keep = new Map();
      const recentTimes = new Set(S.candles.slice(-520).map(c => String(c.t)));
      window.__bigTradesPersistentCache.forEach((v, k) => {
        for (const t of recentTimes) {
          if (k.includes('|' + t + '|')) { keep.set(k, v); break; }
        }
      });
      window.__bigTradesPersistentCache = keep;
    }
  } catch (_e) {}

  if (out.length) { window.__bigTradesLastGood = out.slice(0, 1200); return out; }
  return window.__bigTradesLastGood || [];
}


// ══════════════════════════════════════════
//  7. DESENHO DAS BOLHAS NO CANVAS
// ══════════════════════════════════════════

function drawBigTrades(ctx, V, sc, x, W, H) {
  let items = visibleBigTradesByCandle(V);

  // Filtrar ao range visível + limite de barras do usuário
  const visibleBarsLimit = clamp(+(document.getElementById('bigTradeVisibleBars')?.value || 200), 1, 2000);
  const visibleFrom = Math.max(Math.floor(V.a), S.candles.length - visibleBarsLimit);
  items = items.filter(o => o.idx >= visibleFrom && o.idx <= Math.ceil(V.b));

  // Cache de overlay curto (30s) para evitar flicker durante reloads
  try {
    const cacheKey = bigTradeCacheConfigKey() + '|' + String(S.candles.length);
    if (items.length) {
      window.__bigTradesOverlayCache = { key: cacheKey, items: items, ts: Date.now() };
    } else if (window.__bigTradesOverlayCache?.key === cacheKey &&
               (Date.now() - (window.__bigTradesOverlayCache.ts || 0) < 30000)) {
      items = window.__bigTradesOverlayCache.items || [];
    }
  } catch (_e) {}

  if (!items.length) return;

  // Percentis de valor para definir tamanho e "heat" das bolhas
  const values = items.map(o => o.t.btValue).filter(v => v > 0).sort((a, b) => a - b);
  const maxV   = Math.max(...values, 1);
  const p90    = values.length ? values[Math.floor(values.length * 0.90)] || maxV : maxV;
  const p98    = values.length ? values[Math.floor(values.length * 0.98)] || maxV : maxV;

  const showLabel = bigTradeLabelMode() !== 'off';
  const cssW      = W || ctx.canvas.clientWidth  || ctx.canvas.width  / (window.devicePixelRatio || 1);
  const cssH      = H || ctx.canvas.clientHeight || ctx.canvas.height / (window.devicePixelRatio || 1);
  const right     = cssW - RP();
  const top       = PT, bottom = cssH - PB;

  // ── Pré-computar posição e raio de cada bolha ──
  const bscale    = bigTradeBubbleScale();
  const drawItems = [];

  items.forEach(({ idx, t }) => {
    const xx = x(idx), yy = sc.y(t.p);
    if (!isFinite(xx) || !isFinite(yy)) return;
    if (xx < PL || xx > right || yy < top || yy > bottom) return;
    const v        = t.btValue;
    const strength = v / Math.max(1e-9, p90);
    const hot = v >= p98, big = v >= p90;
    const clusterBoost = 1 + Math.min(0.75, ((t.levelCount || 1) - 1) * 0.16);
    const r = clamp((5 + Math.sqrt(Math.max(0, strength)) * 5.0) * bscale * clusterBoost, 5, hot ? 24 : big ? 18 : 13);
    drawItems.push({ xx, yy, adjY: yy, r, v, hot, big, t });
  });

  // ── De-overlap — passo 1: dentro de cada coluna (candle) ──
  const cols = new Map();
  drawItems.forEach(item => {
    const col = Math.round(item.xx);
    if (!cols.has(col)) cols.set(col, []);
    cols.get(col).push(item);
  });
  cols.forEach(group => {
    if (group.length < 2) return;
    group.sort((a, b) => a.yy - b.yy); // preço alto → baixo na tela = topo → base
    for (let pass = 0; pass < 5; pass++) {
      for (let k = 1; k < group.length; k++) {
        const a = group[k - 1], b = group[k];
        const need = a.r + b.r + 3;
        if (b.adjY - a.adjY < need) {
          const mid = (a.adjY + b.adjY) / 2;
          a.adjY = clamp(mid - need / 2, top + a.r, bottom - a.r);
          b.adjY = clamp(mid + need / 2, top + b.r, bottom - b.r);
        }
      }
      for (let k = group.length - 2; k >= 0; k--) {
        const a = group[k], b = group[k + 1];
        const need = a.r + b.r + 3;
        if (b.adjY - a.adjY < need) {
          const mid = (a.adjY + b.adjY) / 2;
          a.adjY = clamp(mid - need / 2, top + a.r, bottom - a.r);
          b.adjY = clamp(mid + need / 2, top + b.r, bottom - b.r);
        }
      }
    }
  });

  // ── De-overlap — passo 2: cross-column (bolhas de candles adjacentes) ──
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < drawItems.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = drawItems[j], b = drawItems[i];
        const dx = b.xx - a.xx, dy = b.adjY - a.adjY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.r + b.r + 2;
        if (dist > 0 && dist < minDist) {
          const push = (minDist - dist) / 2;
          const py   = dy / dist * push;
          a.adjY = clamp(a.adjY - py, top + a.r, bottom - a.r);
          b.adjY = clamp(b.adjY + py, top + b.r, bottom - b.r);
        }
      }
    }
  }

  // ── Render ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(PL, top, Math.max(1, right - PL), Math.max(1, bottom - top));
  ctx.clip();
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  // Converter hex → "r,g,b" para rgba()
  const _h2rgb = h => {
    const n = parseInt(h.replace('#', ''), 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  };
  const _buyRgb  = _h2rgb(document.getElementById('bigBuyColor')?.value  || '#00e676');
  const _sellRgb = _h2rgb(document.getElementById('bigSellColor')?.value || '#ff3d57');

  drawItems.forEach(({ xx, adjY, r, v, hot, big, t }) => {
    const rgb = t.isSell ? _sellRgb : _buyRgb;

    // Halo externo (glow)
    ctx.beginPath();
    ctx.arc(xx, adjY, r + (hot ? 4 : 3), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${hot ? 0.16 : big ? 0.09 : 0.05})`;
    ctx.fill();

    // Círculo principal
    ctx.beginPath();
    ctx.arc(xx, adjY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${hot ? 0.40 : big ? 0.28 : 0.20})`;
    ctx.fill();

    // Borda nítida
    ctx.strokeStyle = `rgba(${rgb},${hot ? 1 : big ? 0.92 : 0.72})`;
    ctx.lineWidth   = hot ? 2.2 : big ? 1.5 : 1.1;
    ctx.stroke();

    // Label de valor (só se bolha grande o suficiente)
    if (showLabel && r >= 6) {
      const label = formatBigTradeValue(v);
      ctx.font = 'bold 8px Inter,Arial';
      ctx.beginPath();
      ctx.arc(xx, adjY, Math.max(5.5, r * 0.60), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(3,6,14,.80)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fillText(label, xx, adjY + 0.3);
    }
  });

  ctx.restore();
}


// ══════════════════════════════════════════
//  EXPORTS (para uso por outros indicadores)
// ══════════════════════════════════════════
try {
  window.visibleBigTradesByCandle = visibleBigTradesByCandle;
  window.buildBigTradeClustersForCandle = buildBigTradeClustersForCandle;
  window.bigTradeUnitValue    = bigTradeUnitValue;
  window.bigTradeMinValue     = bigTradeMinValue;
  window.bigTradeDisplayMode  = bigTradeDisplayMode;
  window.bigTradeLabelMode    = bigTradeLabelMode;
  window.formatBigTradeValue  = formatBigTradeValue;
  window.bigTradeMergeLevels  = bigTradeMergeLevels;
  window.bigTradeBubbleScale  = bigTradeBubbleScale;
  window.bigTradeMaxBubbles   = bigTradeMaxBubbles;
  window.robustTradeStats     = robustTradeStats;
  window.candleIndexByTime    = candleIndexByTime;
} catch (_e) {}
