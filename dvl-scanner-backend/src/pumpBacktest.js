"use strict";

/* ── DVL financial backtest over the pré-pump / pré-short model ──────────
   Replays the model's predicted direction on every RESOLVED signal and asks
   "starting from $1000, how would this have done?". Each signal stores a
   forward price path in ATR units (see pumpModel.resolveWith), so we can
   simulate a real bracket order — stop-loss and take-profit both in ATR — and
   sweep the take-profit to estimate the best exit.

   Risk management (fixed-fractional): every trade risks the same % of the
   CURRENT account. Size is set so that hitting the stop loses exactly that %,
   which makes the sizing independent of the asset's price/ATR and lets the
   account compound. PnL, drawdown and win rate all fall out of that.

   Honest scope: this is IN-SAMPLE (the model was trained on these same
   signals), so it's an optimistic planning estimate, not a forward promise.
   It never places a live order. */

/* Simulate one trade over an ATR-normalised path ([[hiΔ,loΔ,clΔ],…] relative
   to entry). Returns PnL in ATR units (favourable = positive). If SL and TP
   would both trigger inside the same candle we assume the STOP hit first
   (conservative — never flatters the result). If neither triggers, exit at the
   last close. */
function simulateTrade(path, side, slAtr, tpAtr) {
  if (!Array.isArray(path) || !path.length) return 0;
  for (const c of path) {
    const hi = Number(c[0]), lo = Number(c[1]);
    if (side === "long") {
      if (lo <= -slAtr) return -slAtr;
      if (hi >= tpAtr) return tpAtr;
    } else {
      if (hi >= slAtr) return -slAtr;
      if (lo <= -tpAtr) return tpAtr;
    }
  }
  const last = Number(path[path.length - 1][2]) || 0;
  return side === "long" ? last : -last;
}

/* Outcome from MFE/MAE only (the up/down a signal always stores), for signals
   recorded before the full price path was kept. up = max favourable-for-long
   excursion (ATR), down = max adverse-for-long. We don't know the ORDER the
   levels were touched, so if both the stop and the target were reached we
   assume the STOP first (conservative). With no bracket hit and no stored
   close, exit flat (0). This is slightly more pessimistic than the exact path
   sim — never flatters the result. */
function simulateMfe(up, down, side, slAtr, tpAtr) {
  const fav = side === "long" ? up : down;   // favourable excursion for this side
  const adv = side === "long" ? down : up;   // adverse excursion for this side
  const hitTP = fav >= tpAtr, hitSL = adv >= slAtr;
  if (hitSL && hitTP) return -slAtr;
  if (hitTP) return tpAtr;
  if (hitSL) return -slAtr;
  return 0;
}

/* ADAPTIVE exit: an ATR trailing stop (no fixed target). Start with the stop
   slAtr below entry; once the trade is up by ≥ trailAtr, ride the stop trailAtr
   behind the best favourable excursion so far — locking profit while letting a
   runner run. Works in favourable-signed ATR coordinates so long/short share
   the code. Needs the real price path; the trailed stop is checked against each
   bar using the peak from PRIOR bars only (never lets the same bar that dipped
   also raise the stop first — conservative). Returns PnL in ATR. */
function simulateTrail(path, side, slAtr, trailAtr) {
  if (!Array.isArray(path) || !path.length) return 0;
  const isLong = side === "long";
  let maxFav = 0;
  for (const c of path) {
    const hi = Number(c[0]), lo = Number(c[1]);
    const fhi = isLong ? hi : -lo;   // favourable extreme this bar
    const flo = isLong ? lo : -hi;   // adverse extreme this bar (favourable-signed)
    const stop = maxFav >= trailAtr ? (maxFav - trailAtr) : -slAtr;
    if (flo <= stop) return stop;    // stopped out (stop may be > 0 = locked profit)
    if (fhi > maxFav) maxFav = fhi;
  }
  const last = Number(path[path.length - 1][2]) || 0;
  return isLong ? last : -last;
}

/* PnL (ATR) for one resolved signal. Trailing (adaptive) needs the exact path;
   otherwise use the fixed bracket on the path, or the MFE/MAE approximation for
   older path-less signals so EVERY resolved signal stays usable. */
function outcomeFor(s, side, slAtr, tpAtr, trailAtr) {
  if (trailAtr > 0) {
    return (Array.isArray(s.path) && s.path.length) ? simulateTrail(s.path, side, slAtr, trailAtr) : null;
  }
  if (Array.isArray(s.path) && s.path.length) return simulateTrade(s.path, side, slAtr, tpAtr);
  const up = Number(s.up), down = Number(s.down);
  if (Number.isFinite(up) && Number.isFinite(down)) return simulateMfe(up, down, side, slAtr, tpAtr);
  return null;
}

/* Run the full account simulation over the resolved signals.
   samples: pumpModel dataset rows (need .f, and .path OR .up/.down; .entry/.atr
   let fees be charged realistically). predictFn(f) → {up,down} in ATR.
   opts: {account0, riskPct, slAtr, tpAtr, minConv, side, costFrac}.
   `side` restricts to one direction (long/short split). `costFrac` is the
   ROUND-TRIP trading cost as a fraction of notional (fee + slippage, both
   sides). It's converted to ATR per trade — costAtr = costFrac × (entry/atr) —
   so a low-volatility asset (small ATR%) pays proportionally more, exactly as
   in real life (you need a bigger notional to risk the same % with a 1-ATR
   stop). Samples without entry/atr use the median ATR% of the ones that have
   it. */
function run(samples, predictFn, opts) {
  opts = opts || {};
  const account0 = opts.account0 != null ? opts.account0 : 1000;
  const riskPct = opts.riskPct != null ? opts.riskPct : 0.01;   // 1% risk/trade
  const slAtr = opts.slAtr != null ? opts.slAtr : 1.0;
  const tpAtr = opts.tpAtr != null ? opts.tpAtr : 2.0;
  const minConv = opts.minConv != null ? opts.minConv : 0;       // min favourable ATR to take a trade
  const onlySide = opts.side || null;
  const costFrac = opts.costFrac != null ? opts.costFrac : 0;    // round-trip cost (fraction of notional)
  const trailAtr = opts.trailAtr != null ? opts.trailAtr : 0;    // >0 → adaptive trailing stop (ignores tpAtr)

  /* Median ATR% (atr/entry) across samples that carry it, as the fallback for
     older path-less signals — clamped to a sane crypto-perp floor so one
     freak low-vol sample can't blow the fee up to infinity. */
  const atrPcts = [];
  for (const s of samples) {
    const e = Number(s && s.entry), a = Number(s && s.atr);
    if (e > 0 && a > 0) atrPcts.push(a / e);
  }
  atrPcts.sort((x, y) => x - y);
  const medianAtrPct = atrPcts.length ? atrPcts[Math.floor(atrPcts.length / 2)] : 0.01;
  const atrPctOf = s => {
    const e = Number(s && s.entry), a = Number(s && s.atr);
    const v = (e > 0 && a > 0) ? a / e : medianAtrPct;
    return Math.max(0.0015, v);   // floor 0.15% ATR
  };

  let account = account0, peak = account0, maxDD = 0;
  let wins = 0, losses = 0, trades = 0, grossAtr = 0, exactPath = 0, costAtrSum = 0;
  const equity = [account0];

  for (const s of samples) {
    if (!s || !Array.isArray(s.f)) continue;
    const pred = predictFn(s.f);
    if (!pred) continue;
    const side = pred.up >= pred.down ? "long" : "short";
    if (onlySide && side !== onlySide) continue;
    const conv = side === "long" ? pred.up : pred.down;
    if (!(conv >= minConv)) continue;

    const grossPnlAtr = outcomeFor(s, side, slAtr, tpAtr, trailAtr);
    if (grossPnlAtr == null) continue;
    if (Array.isArray(s.path) && s.path.length) exactPath++;
    const costAtr = costFrac > 0 ? costFrac / atrPctOf(s) : 0;   // = costFrac × entry/atr
    const pnlAtr = grossPnlAtr - costAtr;                        // net of fees + slippage
    costAtrSum += costAtr;
    const pnl$ = (pnlAtr / slAtr) * riskPct * account;          // risk-based sizing + compounding
    account += pnl$;
    grossAtr += pnlAtr;
    if (pnlAtr > 0) wins++; else if (pnlAtr < 0) losses++;
    trades++;
    equity.push(account);
    if (account > peak) peak = account;
    const dd = peak > 0 ? (peak - account) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    account0, account,
    returnPct: (account / account0 - 1) * 100,
    maxDrawdownPct: maxDD * 100,
    trades, wins, losses,
    winRate: trades ? (wins / trades) * 100 : 0,
    expectancyAtr: trades ? grossAtr / trades : 0,
    avgCostAtr: trades ? costAtrSum / trades : 0,
    exactPath,                    // how many trades used the exact price path
    side: onlySide || "all",
    slAtr, tpAtr, trailAtr, riskPct, minConv, costFrac, equity
  };
}

/* Sweep the take-profit multiple to estimate the best exit. Returns the grid of
   summaries plus the tpAtr that maximised the final account. */
function sweepTp(samples, predictFn, opts) {
  opts = opts || {};
  const grid = opts.tpGrid || [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
  const runs = grid.map(tp => run(samples, predictFn, Object.assign({}, opts, { tpAtr: tp })));
  let best = runs[0];
  for (const r of runs) if (r.account > best.account) best = r;
  const summarize = r => ({
    tpAtr: r.tpAtr, returnPct: r.returnPct, maxDrawdownPct: r.maxDrawdownPct,
    winRate: r.winRate, trades: r.trades, expectancyAtr: r.expectancyAtr
  });
  return { grid: runs.map(summarize), best: best ? summarize(best) : null };
}

/* Sweep the minimum-conviction gate to LEARN a trigger: "only operate when the
   model's favourable prediction is ≥ X ATR". A tighter gate = fewer, higher-
   quality trades. Picks the threshold that maximises the net final account
   among gates that still leave enough trades (so it can't overfit to 3 lucky
   signals). Returns the grid + the chosen threshold. */
function sweepMinConv(samples, predictFn, opts) {
  opts = opts || {};
  const grid = opts.convGrid || [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5];
  const total = samples.length;
  const minTrades = opts.minTrades != null ? opts.minTrades : Math.max(15, Math.round(total * 0.04));
  const runs = grid.map(mc => run(samples, predictFn, Object.assign({}, opts, { minConv: mc })));
  let best = null;
  for (const r of runs) if (r.trades >= minTrades && (!best || r.account > best.account)) best = r;
  if (!best) best = runs[0];   // nothing has enough trades → fall back to the loosest gate
  const summarize = r => ({
    minConv: r.minConv, trades: r.trades, returnPct: r.returnPct,
    winRate: r.winRate, maxDrawdownPct: r.maxDrawdownPct, expectancyAtr: r.expectancyAtr
  });
  return { grid: runs.map(summarize), best: summarize(best) };
}

/* Sweep the trailing distance for the adaptive mode (analogous to sweepTp). */
function sweepTrail(samples, predictFn, opts) {
  opts = opts || {};
  const grid = opts.trailGrid || [0.5, 1, 1.5, 2, 2.5, 3];
  const runs = grid.map(tr => run(samples, predictFn, Object.assign({}, opts, { trailAtr: tr })));
  let best = runs[0];
  for (const r of runs) if (r.account > best.account) best = r;
  const summarize = r => ({
    trailAtr: r.trailAtr, returnPct: r.returnPct, maxDrawdownPct: r.maxDrawdownPct,
    winRate: r.winRate, trades: r.trades, expectancyAtr: r.expectancyAtr
  });
  return { grid: runs.map(summarize), best: best ? summarize(best) : null };
}

/* NO-BLIND-SPOTS surface: net return for every SL × TP combination on a grid,
   at a fixed conviction gate + real costs. Lets the whole landscape be seen
   (heatmap) instead of a few chosen points, so the best cell can be judged for
   robustness (is it a plateau or a lucky spike?). */
function sweepGrid(samples, predictFn, opts) {
  opts = opts || {};
  const slGrid = opts.slGrid || [0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3];
  const tpGrid = opts.tpGrid || [1, 1.5, 2, 2.5, 3, 4, 5, 6];
  const cells = [];
  let best = null;
  for (const sl of slGrid) for (const tp of tpGrid) {
    const r = run(samples, predictFn, Object.assign({}, opts, { slAtr: sl, tpAtr: tp }));
    const cell = { slAtr: sl, tpAtr: tp, returnPct: r.returnPct, winRate: r.winRate, trades: r.trades };
    cells.push(cell);
    if (!best || r.returnPct > best.returnPct) best = cell;
  }
  return { slGrid, tpGrid, cells, best };
}

/* Full evaluation for ONE risk profile. Fixed-bracket modes have a SL + a TP
   search grid; the ADAPTIVE mode (opts.trail) has a SL + a trailing-distance
   grid instead. Either way: learn the best exit, then the best conviction gate,
   then run the tuned all/long/short (net of costs) plus a gross reference. */
function evaluate(samples, predictFn, opts) {
  opts = Object.assign({ minConv: 0 }, opts || {});
  let exitKey, exitVal, sweepGridOut;
  if (opts.trail) {
    const sw = sweepTrail(samples, predictFn, opts);
    exitVal = sw.best ? sw.best.trailAtr : (opts.trailAtr || 1.5);
    exitKey = "trailAtr"; sweepGridOut = sw.grid;
  } else {
    const sw = sweepTp(samples, predictFn, opts);
    exitVal = sw.best ? sw.best.tpAtr : (opts.tpAtr || 2);
    exitKey = "tpAtr"; sweepGridOut = sw.grid;
  }
  const withExit = o => Object.assign({}, o, { [exitKey]: exitVal });
  const convSweep = sweepMinConv(samples, predictFn, withExit(opts));
  const mcStar = convSweep.best ? convSweep.best.minConv : 0;
  const tuned = withExit(Object.assign({}, opts, { minConv: mcStar }));
  const all = run(samples, predictFn, tuned);
  const long = run(samples, predictFn, Object.assign({}, tuned, { side: "long" }));
  const short = run(samples, predictFn, Object.assign({}, tuned, { side: "short" }));
  const gross = run(samples, predictFn, Object.assign({}, tuned, { costFrac: 0 }));
  return {
    slAtr: opts.slAtr != null ? opts.slAtr : 1,
    tpAtr: opts.trail ? 0 : exitVal, trailAtr: opts.trail ? exitVal : 0,
    adaptive: !!opts.trail, minConv: mcStar,
    all, long, short, grossReturnPct: gross.returnPct,
    sweep: sweepGridOut, convSweep: convSweep.grid
  };
}

module.exports = { simulateTrade, simulateMfe, simulateTrail, outcomeFor, run, sweepTp, sweepTrail, sweepMinConv, sweepGrid, evaluate };
