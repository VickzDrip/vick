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

/* UNIFIED exit over a price path — one function that combines any of: initial
   stop (slAtr), take-profit (tpAtr), trailing stop (trailAtr) and move-to-
   breakeven (beAtr, raise stop to entry once price is up beAtr). Missing pieces
   are disabled (tp/trail = ∞, be = ∞). The stop each bar is the HIGHEST of the
   active protections, evaluated with the peak from PRIOR bars (conservative);
   if stop and TP fall in the same bar the STOP wins. Favourable-signed ATR so
   long/short share the code. This is the search space the optimiser explores. */
function simulatePathCfg(path, side, cfg) {
  if (!Array.isArray(path) || !path.length) return 0;
  const isLong = side === "long";
  const sl = cfg.slAtr > 0 ? cfg.slAtr : 1;
  const tp = cfg.tpAtr > 0 ? cfg.tpAtr : Infinity;
  const trail = cfg.trailAtr > 0 ? cfg.trailAtr : Infinity;
  const be = cfg.beAtr > 0 ? cfg.beAtr : Infinity;
  const timeBars = cfg.timeBars > 0 ? cfg.timeBars : Infinity;   // max bars to hold
  let maxFav = 0, i = 0;
  for (const c of path) {
    const hi = Number(c[0]), lo = Number(c[1]);
    const fhi = isLong ? hi : -lo;   // favourable extreme this bar
    const flo = isLong ? lo : -hi;   // adverse extreme this bar (favourable-signed)
    let stop = -sl;
    if (maxFav >= be) stop = Math.max(stop, 0);                 // breakeven
    if (maxFav >= trail) stop = Math.max(stop, maxFav - trail); // trailing
    if (flo <= stop) return stop;                               // stopped (may be ≥ 0)
    if (fhi >= tp) return tp;                                   // take-profit
    if (fhi > maxFav) maxFav = fhi;
    i++;
    if (i >= timeBars) { const cl = Number(c[2]) || 0; return isLong ? cl : -cl; }  // time stop
  }
  const last = Number(path[path.length - 1][2]) || 0;
  return isLong ? last : -last;
}

/* SCALE-OUT exit (partial take-profit): book `tp1Frac` of the position at
   `tp1Atr`, then run the remainder with the stop moved to breakeven and an ATR
   trailing stop — "take some off, let the runner run". PnL is the weighted sum.
   Needs the price path. */
function simulateScaleOut(path, side, cfg) {
  if (!Array.isArray(path) || !path.length) return 0;
  const isLong = side === "long";
  const sl = cfg.slAtr > 0 ? cfg.slAtr : 1;
  const tp1 = cfg.tp1Atr > 0 ? cfg.tp1Atr : 2;
  const frac = Math.min(0.9, Math.max(0.1, cfg.tp1Frac || 0.5));
  const trail = cfg.trailAtr > 0 ? cfg.trailAtr : 1;
  let maxFav = 0, tookPartial = false, booked = 0;
  for (const c of path) {
    const hi = Number(c[0]), lo = Number(c[1]);
    const fhi = isLong ? hi : -lo, flo = isLong ? lo : -hi;
    if (!tookPartial) {
      if (flo <= -sl) return -sl;                       // whole position stopped
      if (fhi >= tp1) { booked = frac * tp1; tookPartial = true; if (fhi > maxFav) maxFav = fhi; continue; }
      if (fhi > maxFav) maxFav = fhi;
    } else {
      const stop = Math.max(0, maxFav - trail);         // runner: breakeven + trailing
      if (flo <= stop) return booked + (1 - frac) * stop;
      if (fhi > maxFav) maxFav = fhi;
    }
  }
  const last = Number(path[path.length - 1][2]) || 0, lastFav = isLong ? last : -last;
  return tookPartial ? booked + (1 - frac) * lastFav : lastFav;
}

function simulateScaleOutMfe(up, down, side, cfg) {
  const sl = cfg.slAtr > 0 ? cfg.slAtr : 1;
  const tp1 = cfg.tp1Atr > 0 ? cfg.tp1Atr : 2;
  const frac = Math.min(0.9, Math.max(0.1, cfg.tp1Frac || 0.5));
  const trail = cfg.trailAtr > 0 ? cfg.trailAtr : 1;
  const fav = side === "long" ? up : down, adv = side === "long" ? down : up;
  if (adv >= sl) return -sl;                            // conservative: stopped whole first
  if (fav >= tp1) return frac * tp1 + (1 - frac) * Math.max(0, fav - trail);
  return 0;
}

/* MFE/MAE approximation of the UNIFIED exit, so path-less OLDER signals still
   work under any config (bracket / breakeven / trailing) — this is what lets
   the backtest use EVERY resolved signal, not just the new ones with a path.
   We only know the max favourable (fav) and max adverse (adv) excursions, not
   their ORDER, so we assume the adverse extreme could have come first
   (conservative): any initial-stop hit is taken as a loss before profit is
   locked. If the stop was never threatened, resolve favourably by TP, then
   trailing give-back, then breakeven, else flat. Reduces to the plain bracket
   when trail/be are off. */
function simulateMfeCfg(up, down, side, cfg) {
  const sl = cfg.slAtr > 0 ? cfg.slAtr : 1;
  const tp = cfg.tpAtr > 0 ? cfg.tpAtr : Infinity;
  const trail = cfg.trailAtr > 0 ? cfg.trailAtr : Infinity;
  const be = cfg.beAtr > 0 ? cfg.beAtr : Infinity;
  const fav = side === "long" ? up : down;   // max favourable excursion (≥0)
  const adv = side === "long" ? down : up;   // max adverse excursion (≥0)
  if (adv >= sl) return -sl;                  // conservative: stopped before locking
  if (fav >= tp) return tp;                   // took profit
  if (fav >= trail) return Math.max(0, fav - trail);  // trailed give-back
  if (fav >= be) return 0;                    // breakeven armed, gave it back
  return 0;                                   // small move → flat
}

/* PnL (ATR) for one resolved signal: exact unified exit when we have the price
   path, else the MFE/MAE approximation — so every resolved signal is usable
   under every config. `extra` carries the newer exit types: {timeBars, tp1Atr,
   tp1Frac} (scale-out is selected by tp1Atr > 0). */
function outcomeFor(s, side, slAtr, tpAtr, trailAtr, beAtr, extra) {
  extra = extra || {};
  const cfg = { slAtr, tpAtr, trailAtr, beAtr, timeBars: extra.timeBars || 0, tp1Atr: extra.tp1Atr || 0, tp1Frac: extra.tp1Frac || 0 };
  const hasPath = Array.isArray(s.path) && s.path.length;
  if (cfg.tp1Atr > 0) {   // scale-out (partial take-profit)
    if (hasPath) return simulateScaleOut(s.path, side, cfg);
    const u1 = Number(s.up), d1 = Number(s.down);
    return (Number.isFinite(u1) && Number.isFinite(d1)) ? simulateScaleOutMfe(u1, d1, side, cfg) : null;
  }
  if (hasPath) return simulatePathCfg(s.path, side, cfg);
  const up = Number(s.up), down = Number(s.down);
  if (Number.isFinite(up) && Number.isFinite(down)) return simulateMfeCfg(up, down, side, cfg);
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
  const trailAtr = opts.trailAtr != null ? opts.trailAtr : 0;    // >0 → trailing stop
  const beAtr = opts.beAtr != null ? opts.beAtr : 0;            // >0 → move stop to breakeven once up this far
  const extra = { timeBars: opts.timeBars || 0, tp1Atr: opts.tp1Atr || 0, tp1Frac: opts.tp1Frac || 0 };

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
  let sumWinAtr = 0, sumLossAtr = 0, streak = 0, maxLossStreak = 0;   // deeper stats
  const equity = [account0];

  for (const s of samples) {
    if (!s || !Array.isArray(s.f)) continue;
    const pred = predictFn(s.f);
    if (!pred) continue;
    const side = pred.up >= pred.down ? "long" : "short";
    if (onlySide && side !== onlySide) continue;
    const conv = side === "long" ? pred.up : pred.down;
    if (!(conv >= minConv)) continue;

    const grossPnlAtr = outcomeFor(s, side, slAtr, tpAtr, trailAtr, beAtr, extra);
    if (grossPnlAtr == null) continue;
    if (Array.isArray(s.path) && s.path.length) exactPath++;
    const costAtr = costFrac > 0 ? costFrac / atrPctOf(s) : 0;   // = costFrac × entry/atr
    const pnlAtr = grossPnlAtr - costAtr;                        // net of fees + slippage
    costAtrSum += costAtr;
    const pnl$ = (pnlAtr / slAtr) * riskPct * account;          // risk-based sizing + compounding
    account += pnl$;
    grossAtr += pnlAtr;
    if (pnlAtr > 0) { wins++; sumWinAtr += pnlAtr; streak = 0; }
    else if (pnlAtr < 0) { losses++; sumLossAtr += -pnlAtr; streak++; if (streak > maxLossStreak) maxLossStreak = streak; }
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
    profitFactor: sumLossAtr > 0 ? sumWinAtr / sumLossAtr : (sumWinAtr > 0 ? Infinity : 0),
    avgWinAtr: wins ? sumWinAtr / wins : 0,
    avgLossAtr: losses ? sumLossAtr / losses : 0,
    maxLossStreak,
    exactPath,                    // how many trades used the exact price path
    side: onlySide || "all",
    slAtr, tpAtr, trailAtr, beAtr, riskPct, minConv, costFrac, equity
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

/* Build the whole exit-config search space: fixed brackets (SL×TP), those same
   brackets with a move-to-breakeven, and trailing stops (SL×trail). This is the
   "many combos, not just one" the optimiser tries. */
function exitConfigs(opts) {
  opts = opts || {};
  const slGrid = opts.slGrid || [0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3];
  const tpGrid = opts.tpGrid || [1, 1.5, 2, 2.5, 3, 4, 5, 6];
  const trailGrid = opts.trailGrid || [0.5, 1, 1.5, 2, 2.5, 3];
  const beGrid = opts.beGrid || [0, 0.5, 1, 1.5];   // 0 = no breakeven
  const timeGrid = opts.timeGrid || [5, 8, 12];        // max bars to hold (of HORIZON)
  const tp1Grid = opts.tp1Grid || [1, 1.5, 2];         // partial take-profit level
  const cfgs = [];
  for (const sl of slGrid) for (const tp of tpGrid) for (const be of beGrid) {
    cfgs.push({ family: be > 0 ? "bracket+be" : "bracket", slAtr: sl, tpAtr: tp, trailAtr: 0, beAtr: be });
  }
  for (const sl of slGrid) for (const tr of trailGrid) {
    cfgs.push({ family: "trailing", slAtr: sl, tpAtr: 0, trailAtr: tr, beAtr: 0 });
  }
  /* time stop: fixed bracket that also bails after N bars */
  for (const sl of slGrid) for (const tp of tpGrid) for (const tb of timeGrid) {
    cfgs.push({ family: "timestop", slAtr: sl, tpAtr: tp, trailAtr: 0, beAtr: 0, timeBars: tb });
  }
  /* scale-out: book half at tp1, trail the runner from breakeven */
  for (const sl of slGrid) for (const tp1 of tp1Grid) for (const tr of trailGrid) {
    cfgs.push({ family: "scaleout", slAtr: sl, tp1Atr: tp1, tp1Frac: 0.5, trailAtr: tr });
  }
  return cfgs;
}

function summary(r) {
  return {
    returnPct: r.returnPct, maxDrawdownPct: r.maxDrawdownPct,
    winRate: r.winRate, trades: r.trades, expectancyAtr: r.expectancyAtr
  };
}

/* THE OPTIMISER — "machine-learn the TP/SL". Splits the resolved signals into a
   TRAIN slice (older) and a TEST slice (newer), searches the full exitConfigs()
   space on TRAIN (max net return among configs with enough trades), learns the
   conviction gate on TRAIN too, then reports that single chosen config's result
   on the untouched TEST slice. If TEST is also profitable the combo generalises;
   if only TRAIN is, it was curve-fitting. This is the guard that keeps a big
   search honest. In-sample tuning + out-of-sample check — never a live order. */
function optimize(samples, predictFn, opts) {
  opts = opts || {};
  const trainFrac = opts.trainFrac != null ? opts.trainFrac : 0.7;
  const cut = Math.max(1, Math.floor(samples.length * trainFrac));
  const train = samples.slice(0, cut);
  const test = samples.slice(cut);
  const cfgs = exitConfigs(opts);
  /* `side` (long/short/null) flows into every run so the optimiser can search a
     SINGLE direction — the long edge isn't diluted by losing shorts. */
  const baseOpts = { account0: opts.account0, riskPct: opts.riskPct, costFrac: opts.costFrac, side: opts.side || null };
  const minTrain = Math.max(5, Math.round(train.length * 0.05));

  let best = null, bestRun = null;
  for (const cfg of cfgs) {
    const r = run(train, predictFn, Object.assign({}, baseOpts, cfg));
    if (r.trades < minTrain) continue;
    if (!bestRun || r.account > bestRun.account) { best = cfg; bestRun = r; }
  }
  if (!best) return { ready: false, reason: "poucos trades no treino", trainN: train.length, testN: test.length };

  /* Learn the conviction gate for the winning config on TRAIN. */
  const convSweep = sweepMinConv(train, predictFn, Object.assign({}, baseOpts, best, { minTrades: minTrain }));
  const mcStar = convSweep.best ? convSweep.best.minConv : 0;
  const tuned = Object.assign({}, baseOpts, best, { minConv: mcStar });
  const trainRes = run(train, predictFn, tuned);
  const testRes = run(test, predictFn, tuned);

  return {
    ready: true, trainFrac, trainN: train.length, testN: test.length,
    candidates: cfgs.length,
    best: { family: best.family, slAtr: best.slAtr, tpAtr: best.tpAtr, trailAtr: best.trailAtr, beAtr: best.beAtr,
            timeBars: best.timeBars || 0, tp1Atr: best.tp1Atr || 0, tp1Frac: best.tp1Frac || 0, minConv: mcStar },
    train: summary(trainRes), test: summary(testRes),
    generalizes: testRes.trades >= 5 && testRes.returnPct > 0
  };
}

/* CALIBRATION — does the model's number mean anything? Buckets signals by the
   model's PREDICTED favourable move (in ATR) and, per bucket, shows the avg
   predicted vs the avg REALISED move and how often reality reached the
   prediction. If realised rises with predicted, the model has signal to exploit
   (raise the gate); if it's flat, the prediction is noise and no exit tuning
   saves it — the deeper root cause when the whole surface is red. */
function calibrate(samples, predictFn) {
  const edges = [0, 1, 2, 3, 4, Infinity];
  const buckets = edges.slice(0, -1).map((lo, i) => ({ lo, hi: edges[i + 1], n: 0, sumPred: 0, sumReal: 0, reached: 0, wins: 0 }));
  for (const s of samples) {
    if (!s || !Array.isArray(s.f)) continue;
    const pred = predictFn(s.f);
    if (!pred) continue;
    const long = pred.up >= pred.down;
    const p = long ? pred.up : pred.down;
    const realized = long ? Number(s.up) : Number(s.down);      // realised favourable excursion (ATR)
    const adverse = long ? Number(s.down) : Number(s.up);
    if (!Number.isFinite(realized) || !Number.isFinite(p)) continue;
    const b = buckets.find(b => p >= b.lo && p < b.hi);
    if (!b) continue;
    b.n++; b.sumPred += p; b.sumReal += realized;
    if (realized >= p) b.reached++;
    if (realized > adverse) b.wins++;                            // moved more our way than against
  }
  return buckets.filter(b => b.n > 0).map(b => ({
    range: b.hi === Infinity ? ("≥" + b.lo) : (b.lo + "–" + b.hi),
    n: b.n, avgPred: b.sumPred / b.n, avgReal: b.sumReal / b.n,
    reachRate: b.reached / b.n * 100, favRate: b.wins / b.n * 100
  }));
}

/* CONDITIONAL EDGE MINING — where does the edge hide? Splits the signals at the
   median of EACH feature and backtests both halves; ranks the conditions that
   most improve the net result on TRAIN and reports how they hold on TEST
   (out-of-sample). This is the deeper move when a blanket signal is unprofitable
   — the alpha, if any, is usually in a subset (a regime / feature range). */
function mineConditions(samples, predictFn, featureNames, opts) {
  opts = opts || {};
  const exit = { slAtr: opts.slAtr || 1.5, tpAtr: opts.tpAtr || 3, costFrac: opts.costFrac, account0: opts.account0, riskPct: opts.riskPct };
  const cut = Math.max(1, Math.floor(samples.length * (opts.trainFrac || 0.7)));
  const train = samples.slice(0, cut), test = samples.slice(cut);
  const baseline = run(train, predictFn, exit);
  const minTr = Math.max(8, Math.round(train.length * 0.05));
  const P = (featureNames && featureNames.length) || 0;
  const out = [];
  for (let j = 0; j < P; j++) {
    const vals = train.map(s => Number(s.f[j])).filter(Number.isFinite).sort((a, b) => a - b);
    if (vals.length < 10) continue;
    const med = vals[Math.floor(vals.length / 2)];
    for (const op of [">=", "<"]) {
      const filt = s => { const v = Number(s.f[j]); return op === ">=" ? v >= med : v < med; };
      const tr = run(train.filter(filt), predictFn, exit);
      if (tr.trades < minTr) continue;
      const te = run(test.filter(filt), predictFn, exit);
      out.push({
        feature: featureNames[j], op, thr: med,
        trainReturn: tr.returnPct, trainTrades: tr.trades, trainWin: tr.winRate,
        testReturn: te.returnPct, testTrades: te.trades
      });
    }
  }
  out.sort((a, b) => b.trainReturn - a.trainReturn);
  return { baselineReturn: baseline.returnPct, trainN: train.length, testN: test.length, top: out.slice(0, 4) };
}

const EXR = require("./exhaustionRsi");

/* RSI-INPUT SWEEP — the user's discovery: pré-volume+spike CONFIRMED by the
   Exhaustion RSI zone. Each signal stores the 15m closes + the multi-TF push
   at fire time, so we can RECOMPUTE the faithful EXR for any (rsiLen, push,
   upper, lower) combo and keep only the signals where the oscillator confirms
   the model's direction (long ⇐ exhausted down ≤ lower; short ⇐ exhausted up ≥
   upper). Sweeps a broad grid of those inputs, picks the best on TRAIN and
   reports it on TEST (out-of-sample) vs the unfiltered baseline. Only signals
   that carry EXR data participate (collected forward). */
function exrValueAt(s, rsiLen, push) {
  const cl = s && s.exrCloses;
  if (!Array.isArray(cl) || cl.length < 3) return null;
  const len = Math.max(2, Math.min(Math.round(rsiLen), cl.length - 1));
  const rsi = EXR.mtfRsi(cl.map(Number), len);
  const base = rsi[rsi.length - 1];
  return Math.max(0, Math.min(100, base + (Number(s.exrPush) || 0) * push));
}
function sweepRsiConfirm(samples, predictFn, opts) {
  opts = opts || {};
  const exit = { slAtr: opts.slAtr || 1.5, tpAtr: opts.tpAtr || 3, costFrac: opts.costFrac, account0: opts.account0, riskPct: opts.riskPct };
  const cut = Math.max(1, Math.floor(samples.length * (opts.trainFrac || 0.7)));
  const train = samples.slice(0, cut), test = samples.slice(cut);
  const nExr = samples.filter(s => Array.isArray(s.exrCloses) && s.exrCloses.length && Number.isFinite(s.exrValue)).length;
  if (nExr < 20) return { ready: false, withExr: nExr, need: 20 };

  const rsiLenGrid = opts.rsiLenGrid || [7, 10, 14, 21];
  const pushGrid = opts.pushGrid || [0, 10, 18, 25];
  const upperGrid = opts.upperGrid || [55, 60, 65, 70];
  const lowerGrid = opts.lowerGrid || [30, 35, 40, 45];
  const minTr = Math.max(6, Math.round(nExr * 0.03));

  const filt = (arr, cfg) => arr.filter(s => {
    if (!Array.isArray(s.exrCloses) || !s.exrCloses.length) return false;
    const p = predictFn(s.f); if (!p) return false;
    const side = p.up >= p.down ? "long" : "short";
    const v = exrValueAt(s, cfg.rsiLen, cfg.push); if (v == null) return false;
    return side === "long" ? v <= cfg.lower : v >= cfg.upper;
  });

  let bestRun = null, bestCfg = null;
  for (const rsiLen of rsiLenGrid) for (const push of pushGrid)
    for (const upper of upperGrid) for (const lower of lowerGrid) {
      if (lower >= upper) continue;
      const cfg = { rsiLen, push, upper, lower };
      const tr = run(filt(train, cfg), predictFn, exit);
      if (tr.trades < minTr) continue;
      if (!bestRun || tr.account > bestRun.account) { bestRun = tr; bestCfg = cfg; }
    }
  if (!bestCfg) return { ready: false, withExr: nExr, reason: "poucos sinais confirmados no treino" };

  const teRun = run(filt(test, bestCfg), predictFn, exit);
  const baseTrain = run(train, predictFn, exit), baseTest = run(test, predictFn, exit);
  return {
    ready: true, withExr: nExr, trainN: train.length, testN: test.length,
    best: { rsiLen: bestCfg.rsiLen, push: bestCfg.push, upperZone: bestCfg.upper, lowerZone: bestCfg.lower },
    train: { returnPct: bestRun.returnPct, trades: bestRun.trades, winRate: bestRun.winRate },
    test: { returnPct: teRun.returnPct, trades: teRun.trades, winRate: teRun.winRate },
    baselineTrainPct: baseTrain.returnPct, baselineTestPct: baseTest.returnPct,
    generalizes: teRun.trades >= 5 && teRun.returnPct > 0
  };
}

/* ── MASSIVE RSI grid search — TODOS os inputs do oscilador da plataforma ──
   Sweeps the FULL Exhaustion-RSI input set exactly like the chart's Filtros:
   comprimento (rsiLen) × push × spike de volume (volSpikeAt) × média de volume
   (volMaLen) × zona (sobrevendido/sobrecomprado). For EACH combo the RSI value
   is REBUILT from the stored 15m candles (sample.exrBars) via EXR.valueFrom, the
   signal is traded in the RSI's own direction (sobrevendido→LONG, sobrecomprado→
   SHORT), and LONG/SHORT are optimised INDEPENDENTLY (each $1000, own TP sweep),
   scored OUT-OF-SAMPLE. Per-sample base-RSI and exhaustion are PRECOMPUTED so the
   big combo loop is cheap arithmetic.
   NOTE: over the annual (15m-only) history the exhaustion is the 15m self-
   exhaustion (no sub-15m push), a faithful approximation — but push, volSpike and
   volMa now all MOVE the value, so the whole oscilador is swept. */
function rsiGridSearch(samples, opts) {
  opts = opts || {};
  const exitBase = { costFrac: opts.costFrac, account0: opts.account0 || 1000, riskPct: opts.riskPct || 0.01, minConv: 0 };
  const slAtr = opts.slAtr || 1.2;
  const withBars = (Array.isArray(samples) ? samples : []).filter(s => s && Array.isArray(s.exrBars) && s.exrBars.length >= 8);
  if (withBars.length < 20) return { ready: false, withExr: withBars.length, need: 20 };
  const cut = Math.max(1, Math.floor(withBars.length * (opts.trainFrac || 0.7)));

  /* MASSIVE sweep (1 ativo/1 ano): 60k+ full configs of RSI + pré-volume.
     combosTested = rsiLen × (volMa×volSpike) × push × (lower+upper). */
  const rsiLenGrid   = opts.rsiLenGrid   || [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 21, 25];
  const pushGrid     = opts.pushGrid     || [0, 4, 8, 12, 16, 18, 20, 25, 30];
  const volMaGrid    = opts.volMaGrid    || [10, 14, 20, 25, 30];
  const volSpikeGrid = opts.volSpikeGrid || [1.5, 2, 2.5, 3, 3.5, 4];
  const lowerGrid    = opts.lowerGrid    || [20, 25, 28, 30, 32, 35, 38, 40];
  const upperGrid    = opts.upperGrid    || [60, 62, 65, 68, 70, 72, 75, 80];
  const tpGrid       = opts.tpGrid       || [1, 1.5, 2, 2.5, 3, 4, 5, 6];
  const minTr = Math.max(5, Math.round(cut * 0.03));

  const FORCE_LONG = () => ({ up: 1, down: 0 });
  const FORCE_SHORT = () => ({ up: 0, down: 1 });
  const sum = r => ({ returnPct: r.returnPct, account: r.account, maxDrawdownPct: r.maxDrawdownPct, winRate: r.winRate, trades: r.trades });

  /* PRECOMPUTE per sample (over its stored 15m window):
       baseRsi[rsiLen] (depends only on rsiLen) and
       exh[volMa|volSpike] = (up-down) exhaustion (depends only on those two).
     Then value(rsiLen,volMa,volSpike,push) = clamp(baseRsi + exh*push, 0, 100). */
  const volCombos = [];
  for (const vm of volMaGrid) for (const vs of volSpikeGrid) volCombos.push({ vm, vs, key: vm + "|" + vs });
  const prep = withBars.map(s => {
    const bars = s.exrBars, i = bars.length - 1;
    const closes = bars.map(c => Number(c.close));
    const baseRsi = {};
    for (const rl of rsiLenGrid) { const r = EXR.mtfRsi(closes, Math.max(2, Math.round(rl))); baseRsi[rl] = r[r.length - 1]; }
    const exh = {};
    for (const vc of volCombos) {
      const up = EXR.mtfExh(bars, i, "up", vc.vm, vc.vs);
      const dn = EXR.mtfExh(bars, i, "down", vc.vm, vc.vs);
      exh[vc.key] = up - dn;
    }
    return { s, baseRsi, exh };
  });
  const prepTrain = prep.slice(0, cut), prepTest = prep.slice(cut);
  const valOf = (p, rl, vcKey, push) => Math.max(0, Math.min(100, p.baseRsi[rl] + p.exh[vcKey] * push));

  /* Evaluate one FULL combo on a side: filter in-zone (by the rebuilt value),
     sweep TP on train, apply the winner to the untouched test. */
  function evalCombo(side, rl, vc, push, thr) {
    const forced = side === "long" ? FORCE_LONG : FORCE_SHORT;
    const inZone = p => { const v = valOf(p, rl, vc.key, push); return side === "long" ? v <= thr : v >= thr; };
    const trSet = prepTrain.filter(inZone).map(p => p.s);
    if (trSet.length < minTr) return null;
    let best = null;
    for (const tp of tpGrid) {
      const r = run(trSet, forced, Object.assign({ slAtr, tpAtr: tp, side }, exitBase));
      if (!best || r.account > best.r.account) best = { tp, r };
    }
    const teSet = prepTest.filter(inZone).map(p => p.s);
    const te = run(teSet, forced, Object.assign({ slAtr, tpAtr: best.tp, side }, exitBase));
    return {
      side, rsiLen: rl, push, volMaLen: vc.vm, volSpikeAt: vc.vs, tpAtr: best.tp,
      lowerZone: side === "long" ? thr : null, upperZone: side === "short" ? thr : null,
      train: sum(best.r), test: sum(te), trainN: trSet.length, testN: teSet.length,
      robust: Math.min(best.r.returnPct, te.returnPct),   // pior dos dois (treino vs teste)
      generalizes: te.trades >= 5 && te.returnPct > 0 && best.r.returnPct > 0
    };
  }

  /* Critério anti-sorte (igual ao VP): ranqueia pelo PIOR dos dois (treino vs
     teste) e só elege best entre os que são VERDES nos dois. Se nenhum passa,
     best = null (nada confiável nesse lado). */
  function searchSide(side, thrGrid) {
    const combos = [];
    for (const rl of rsiLenGrid) for (const vc of volCombos) for (const push of pushGrid) for (const thr of thrGrid) {
      const c = evalCombo(side, rl, vc, push, thr);
      if (c) combos.push(c);
    }
    const scored = combos.slice().sort((a, b) => b.robust - a.robust);
    const best = scored.filter(c => c.generalizes)[0] || null;
    return { best, top: scored.slice(0, 15), combos: combos.length };
  }

  const nCombosSide = rsiLenGrid.length * volCombos.length * pushGrid.length;
  return {
    ready: true, withExr: withBars.length, trainN: cut, testN: withBars.length - cut, slAtr,
    combosTested: nCombosSide * (lowerGrid.length + upperGrid.length),
    grids: { rsiLen: rsiLenGrid, push: pushGrid, volMaLen: volMaGrid, volSpikeAt: volSpikeGrid, lower: lowerGrid, upper: upperGrid, tp: tpGrid },
    long: searchSide("long", lowerGrid), short: searchSide("short", upperGrid)
  };
}

module.exports = {
  simulateTrade, simulateMfe, simulateMfeCfg, simulateTrail, simulatePathCfg,
  simulateScaleOut, simulateScaleOutMfe, outcomeFor,
  run, sweepTp, sweepTrail, sweepMinConv, sweepGrid, evaluate, exitConfigs, optimize,
  calibrate, mineConditions, exrValueAt, sweepRsiConfirm, rsiGridSearch
};
