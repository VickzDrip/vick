"use strict";

const cost = require("./cost");

/* ── Financial backtest engine for the VP+RSI-V model ─────────────────────
   Clean, strategy-agnostic account simulator (replaces the pump-era engine).
   Each sample already knows its DIRECTION (the RSI-V decided long/short) and
   carries the price trajectory in ATR units, so there is no classifier here —
   just money management.

   sample = {
     side : "long" | "short",
     path : [[hiAtr, loAtr, closeAtr], ...]  favourable/adverse excursion per bar
            in ATR from entry (optional; MFE used if absent),
     up, down : max favourable-for-long / adverse-for-long excursion in ATR
            (fallback when no path),
     tpAtr : optional per-sample take-profit in ATR (e.g. the distance to POC),
     entry, atr : prices, for fee conversion.
   }
   Risk: fixed-fractional — every trade risks riskPct of the CURRENT account, so
   size = risk / stopDistance and the account compounds. If the stop and target
   fall in the same bar the STOP is assumed first (conservative). */

function simFromPath(path, side, slAtr, tpAtr) {
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

/* MFE/MAE fallback (order unknown → assume stop first if both hit). */
function simFromMfe(up, down, side, slAtr, tpAtr) {
  const fav = side === "long" ? up : down;
  const adv = side === "long" ? down : up;
  const hitTP = fav >= tpAtr, hitSL = adv >= slAtr;
  if (hitSL && hitTP) return -slAtr;
  if (hitTP) return tpAtr;
  if (hitSL) return -slAtr;
  return 0;
}

function outcomeFor(s, slAtr, optTpAtr, useSampleTp) {
  const side = s.side === "short" ? "short" : "long";
  let tp = optTpAtr;
  if (useSampleTp && Number(s.tpAtr) > 0) tp = Number(s.tpAtr);
  if (!(tp > 0)) tp = optTpAtr > 0 ? optTpAtr : 2;
  if (Array.isArray(s.path) && s.path.length) return { pnl: simFromPath(s.path, side, slAtr, tp), tp };
  const up = Number(s.up) || 0, down = Number(s.down) || 0;
  if (up === 0 && down === 0) return null;
  return { pnl: simFromMfe(up, down, side, slAtr, tp), tp };
}

/* Run the account over `samples`. opts:
   { account0=1000, riskPct=0.01, slAtr=1.2, tpAtr=2, useSampleTp=false,
     cost={feeTakerPerSide,slipAtrPerSide} (per-asset fees+slippage; uses each
     sample's entry/atr/qv), costFrac=0 (legacy flat fee), side=null (filter) }. */
function run(samples, opts) {
  opts = opts || {};
  const account0 = opts.account0 != null ? opts.account0 : 1000;
  const riskPct = opts.riskPct != null ? opts.riskPct : 0.01;
  const slAtr = opts.slAtr != null ? opts.slAtr : 1.2;
  const tpAtr = opts.tpAtr != null ? opts.tpAtr : 2.0;
  const useSampleTp = !!opts.useSampleTp;
  const costFrac = opts.costFrac != null ? opts.costFrac : 0;
  const costModel = opts.cost || null;   // fees + slippage per asset
  const onlySide = opts.side || null;
  const list = Array.isArray(samples) ? samples : [];

  const atrPcts = [];
  for (const s of list) { const e = Number(s && s.entry), a = Number(s && s.atr); if (e > 0 && a > 0) atrPcts.push(a / e); }
  atrPcts.sort((x, y) => x - y);
  const medianAtrPct = atrPcts.length ? atrPcts[Math.floor(atrPcts.length / 2)] : 0.01;
  const atrPctOf = s => { const e = Number(s && s.entry), a = Number(s && s.atr); const v = (e > 0 && a > 0) ? a / e : medianAtrPct; return Math.max(0.0015, v); };

  let account = account0, peak = account0, maxDD = 0;
  let wins = 0, losses = 0, trades = 0, grossAtr = 0, exactPath = 0, costAtrSum = 0;
  let sumWinAtr = 0, sumLossAtr = 0, streak = 0, maxLossStreak = 0;
  const equity = [account0];

  for (const s of list) {
    if (!s || (s.side !== "long" && s.side !== "short")) continue;
    if (onlySide && s.side !== onlySide) continue;
    const oc = outcomeFor(s, slAtr, tpAtr, useSampleTp);
    if (!oc) continue;
    if (Array.isArray(s.path) && s.path.length) exactPath++;
    const costAtr = costModel ? cost.costAtr(s, costModel) : (costFrac > 0 ? costFrac / atrPctOf(s) : 0);
    costAtrSum += costAtr;
    const pnlAtr = oc.pnl - costAtr;
    const pnl$ = (pnlAtr / slAtr) * riskPct * account;
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
    maxLossStreak, exactPath,
    side: onlySide || "all",
    slAtr, tpAtr, riskPct, costFrac, equity
  };
}

module.exports = { run, simFromPath, simFromMfe };
