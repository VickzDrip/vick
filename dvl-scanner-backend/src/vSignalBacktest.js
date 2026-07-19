"use strict";

/* ── DVL "Sinais V" backtest ─────────────────────────────────────────────────
   Testa SÓ o sinal dos triângulos do gráfico: a EXAUSTÃO por excursão do
   Exhaustion RSI. O RSI entra numa zona (sobrecompra ≥ upper / sobrevenda ≤
   lower), e quando SAI da zona confirma a reversão:
     • saiu da SOBREVENDA  → COMPRA  (long)  — triângulo verde pra cima
     • saiu da SOBRECOMPRA → VENDA   (short) — triângulo vermelho pra baixo
   A entrada do trade é na vela de saída (quando confirma), e o resultado é
   resolvido pelas velas seguintes com SL/TP em ATR — o MESMO simulador dos
   outros backtests (pumpBacktest.run).

   Varre as zonas (upper/lower) × alvo (tp), por lado, cada lado com seu $1000,
   com o mesmo critério anti-sorte: VERDE no treino E no teste, ranqueado pelo
   pior dos dois. Sinal raro/limpo, então o mínimo de trades é modesto. */

const pumpBacktest = require("./pumpBacktest");
const M = require("./metrics");

const HORIZON = 20;

function vSignalGridSearch(base, series, opts) {
  opts = opts || {};
  const N = Array.isArray(base) ? base.length : 0;
  if (N < 60 + HORIZON) return { ready: false, bars: N, need: 60 + HORIZON };

  /* RSI alinhado por tempo ao candle (computeSeries devolve na mesma ordem, mas
     casamos por time pra ser à prova de furos). */
  const rsi = new Array(N).fill(NaN);
  const byT = new Map();
  if (Array.isArray(series)) for (const s of series) byT.set(Number(s.time), Number(s.value));
  for (let i = 0; i < N; i++) { const v = byT.get(Number(base[i].time)); if (Number.isFinite(v)) rsi[i] = v; }

  const ohlc = base.map(c => ({ high: Number(c.high), low: Number(c.low), close: Number(c.close) }));
  const atrAt = (k) => M.computeAtr(ohlc.slice(Math.max(0, k - 19), k + 1), 14);

  const exitBase = { costFrac: opts.costFrac, account0: opts.account0 || 1000, riskPct: opts.riskPct || 0.01, minConv: 0 };
  const slAtr = opts.slAtr || 1.2;
  const upperGrid = opts.upperGrid || [60, 65, 70, 75];
  const lowerGrid = opts.lowerGrid || [40, 35, 30, 25];
  const tpGrid = opts.tpGrid || [1.5, 2, 3, 4, 5, 6];
  const trainFrac = opts.trainFrac || 0.7;
  const minTr = Math.max(5, opts.minTr || 6);

  /* Excursões: caminha o RSI e emite o índice da vela de SAÍDA de cada zona. */
  function signalsFor(upper, lower) {
    const longs = [], shorts = [];
    let inUp = false, inDn = false;
    for (let i = 0; i < N; i++) {
      const v = rsi[i];
      if (!Number.isFinite(v)) continue;
      // sobrecompra → venda (short) na saída
      if (v >= upper) inUp = true;
      else if (inUp) { inUp = false; if (i <= N - 2 - HORIZON) shorts.push(i); }
      // sobrevenda → compra (long) na saída
      if (v <= lower) inDn = true;
      else if (inDn) { inDn = false; if (i <= N - 2 - HORIZON) longs.push(i); }
    }
    return { longs, shorts };
  }

  function sampleAt(k, side) {
    const entry = Number(base[k].close), a = atrAt(k);
    if (!(entry > 0) || !(a > 0)) return null;
    const path = [];
    for (let i = k + 1; i <= k + HORIZON; i++) {
      const h = Number(base[i].high), l = Number(base[i].low), c = Number(base[i].close);
      path.push([(h - entry) / a, (l - entry) / a, (c - entry) / a]);
    }
    return { f: [0, 0, 0, 0, 0], entry, atr: a, path, side };
  }

  const FL = () => ({ up: 1, down: 0 });
  const FS = () => ({ up: 0, down: 1 });
  const sum = r => ({ returnPct: r.returnPct, account: r.account, maxDrawdownPct: r.maxDrawdownPct, winRate: r.winRate, trades: r.trades });
  const minTe = Math.max(3, Math.floor(minTr * 0.5));

  function evalSide(side, upper, lower) {
    const sg = signalsFor(upper, lower);
    const idxs = side === "long" ? sg.longs : sg.shorts;
    const samples = idxs.map(k => sampleAt(k, side)).filter(Boolean);
    if (samples.length < minTr + minTe) return null;
    const cut = Math.max(minTr, Math.floor(samples.length * trainFrac));
    const tr = samples.slice(0, cut), te = samples.slice(cut);
    if (tr.length < minTr || te.length < minTe) return null;
    const forced = side === "long" ? FL : FS;
    let best = null;
    for (const tp of tpGrid) {
      const r = pumpBacktest.run(tr, forced, Object.assign({ slAtr, tpAtr: tp, side }, exitBase));
      if (!best || r.account > best.r.account) best = { tp, r };
    }
    const teR = pumpBacktest.run(te, forced, Object.assign({ slAtr, tpAtr: best.tp, side }, exitBase));
    return {
      side, upper, lower, tpAtr: best.tp, slAtr,
      signals: samples.length, trainN: tr.length, testN: te.length,
      train: sum(best.r), test: sum(teR),
      robust: Math.min(best.r.returnPct, teR.returnPct),
      generalizes: teR.trades >= minTe && teR.returnPct > 0 && best.r.returnPct > 0
    };
  }

  function searchSide(side) {
    const combos = [];
    for (const u of upperGrid) for (const l of lowerGrid) {
      const c = evalSide(side, u, l);
      if (c) combos.push(c);
    }
    const scored = combos.slice().sort((a, b) => b.robust - a.robust);
    return { best: scored.filter(c => c.generalizes)[0] || null, top: scored.slice(0, 8), combos: combos.length };
  }

  /* Contagem "crua" nas zonas configuradas (só pra mostrar quantos sinais o
     indicador gerou no período, independente da otimização). */
  const cu = Number(opts.upperZone) || 60, cl = Number(opts.lowerZone) || 35;
  const rawSig = signalsFor(cu, cl);

  return {
    ready: true, bars: N, slAtr, horizon: HORIZON,
    combosTested: upperGrid.length * lowerGrid.length,
    grids: { upper: upperGrid, lower: lowerGrid, tp: tpGrid },
    configured: { upper: cu, lower: cl, buys: rawSig.longs.length, sells: rawSig.shorts.length },
    long: searchSide("long"),
    short: searchSide("short")
  };
}

module.exports = { vSignalGridSearch, HORIZON };
