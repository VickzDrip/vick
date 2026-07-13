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

/* PnL (ATR) for one resolved signal: exact price path when we have it, else the
   MFE/MAE approximation so EVERY already-resolved signal is usable now. */
function outcomeFor(s, side, slAtr, tpAtr) {
  if (Array.isArray(s.path) && s.path.length) return simulateTrade(s.path, side, slAtr, tpAtr);
  const up = Number(s.up), down = Number(s.down);
  if (Number.isFinite(up) && Number.isFinite(down)) return simulateMfe(up, down, side, slAtr, tpAtr);
  return null;
}

/* Run the full account simulation over the resolved signals.
   samples: pumpModel dataset rows (need .f, and .path OR .up/.down).
   predictFn(f) → {up,down} in ATR (the model).
   opts: {account0, riskPct, slAtr, tpAtr, minConv, side}. `side` ("long"|
   "short") restricts to just that direction — used for the long/short split. */
function run(samples, predictFn, opts) {
  opts = opts || {};
  const account0 = opts.account0 != null ? opts.account0 : 1000;
  const riskPct = opts.riskPct != null ? opts.riskPct : 0.01;   // 1% risk/trade
  const slAtr = opts.slAtr != null ? opts.slAtr : 1.0;
  const tpAtr = opts.tpAtr != null ? opts.tpAtr : 2.0;
  const minConv = opts.minConv != null ? opts.minConv : 0;       // min favourable ATR to take a trade
  const onlySide = opts.side || null;

  let account = account0, peak = account0, maxDD = 0;
  let wins = 0, losses = 0, trades = 0, grossAtr = 0, exactPath = 0;
  const equity = [account0];

  for (const s of samples) {
    if (!s || !Array.isArray(s.f)) continue;
    const pred = predictFn(s.f);
    if (!pred) continue;
    const side = pred.up >= pred.down ? "long" : "short";
    if (onlySide && side !== onlySide) continue;
    const conv = side === "long" ? pred.up : pred.down;
    if (!(conv >= minConv)) continue;

    const pnlAtr = outcomeFor(s, side, slAtr, tpAtr);
    if (pnlAtr == null) continue;
    if (Array.isArray(s.path) && s.path.length) exactPath++;
    const pnl$ = (pnlAtr / slAtr) * riskPct * account;   // risk-based sizing + compounding
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
    exactPath,                    // how many trades used the exact price path
    side: onlySide || "all",
    slAtr, tpAtr, riskPct, minConv, equity
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

module.exports = { simulateTrade, simulateMfe, outcomeFor, run, sweepTp };
