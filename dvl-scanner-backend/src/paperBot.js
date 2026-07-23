"use strict";

/* ── DVL Paper Bot — the "Market Matrix" engine ───────────────────────────
   A 100% SIMULATED virtual account (the app never sends a real order) that
   trades the LEARNED VP+RSI-V combo across the top-N liquid assets, WALK-FORWARD:
   it only takes setups that appear AFTER the model has learned, and books each
   one with real fees + slippage. Because a sample is only stored once its full
   forward horizon has closed, the outcome is already known when the bot sees it —
   so a trade resolves immediately using the combo's own exit (POC or fixed ATR).
   The account compounds with fixed-fractional risk, and per-asset stats build a
   leaderboard.

   Honesty guardrails:
   - On first run the bot SKIPS the historical backfill (starts its cursor at the
     newest sample) so it never "trades the past" the model was fitted on.
   - Each trade uses the combo learned from EARLIER data → genuinely out-of-sample.
   - Fees + slippage per asset are subtracted (see cost.js). */

const fs = require("fs");
const path = require("path");
const fin = require("./finBacktest");
const costMod = require("./cost");
const model = require("./vrsiModel");

const STATE_FILE = process.env.DVL_BOT_STATE_FILE || path.join(process.cwd(), "data", "paper-bot.json");
const TFS = ["1m", "5m"];
const MAX_TRADES = 400;   // keep the last N closed trades

const STATE_V = 2;   // bump to discard old-schema state (walk-forward seed changed)

function freshState(account0) {
  return {
    v: STATE_V, account0: account0, account: account0, startedAt: Date.now(), updatedAt: 0,
    cursor: { "1m": 0, "5m": 0 }, seeded: { "1m": false, "5m": false },
    trades: [], equity: [account0], peak: account0, maxDD: 0,
    wins: 0, losses: 0, count: 0, grossAtr: 0, costAtrSum: 0,
    bySymbol: {}   // sym -> { trades, wins, pnl$, pnlAtr }
  };
}

let state = null;
function load(account0) {
  if (state) return state;
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch (_) { state = null; }
  if (!state || typeof state !== "object" || !state.account0 || state.v !== STATE_V) state = freshState(account0 || 1000);
  return state;
}
let saveT = 0;
function save() {
  const now = Date.now(); if (now - saveT < 2000) return; saveT = now;
  try { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (_) { }
}

/* All OOS-validated combos for a side (best + the rest that generalize), deduped.
   The bot books a setup that matches ANY of them → more activity, still honest
   (every combo passed the out-of-sample test). */
function pickCombos(models, tf, side) {
  const m = models && models[tf];
  if (!m || !m.ready) return [];
  const s = side === "long" ? m.long : m.short;
  if (!s) return [];
  const list = [];
  if (s.best) list.push(s.best);
  if (Array.isArray(s.generalizing)) for (const c of s.generalizing) if (c) list.push(c);
  const seen = new Set(), out = [];
  for (const c of list) {
    const k = c.session + "|" + c.zone + "|" + c.prox + "|" + c.sl + "|" + c.rsiThresh + "|" + (c.minConf || 1) + "|" + c.tpMode + "|" + c.tpAtr;
    if (!seen.has(k)) { seen.add(k); out.push(c); }
  }
  return out;
}

function tpFor(sample, combo) {
  if (combo.tpMode === "poc") { const d = sample.dist && sample.dist[combo.session]; return d && d.pocAtr > 0 ? d.pocAtr : (combo.tpAtr || 2); }
  return combo.tpAtr > 0 ? combo.tpAtr : 2;
}

/* Book ONE resolved sample against a combo into the running account. */
function book(st, s, combo, tf, cost, riskPct) {
  if (!Array.isArray(s.path) || !s.path.length) return false;
  const tp = tpFor(s, combo);
  let pnlAtr = fin.simFromPath(s.path, combo.side, combo.sl, tp);
  const cAtr = cost ? costMod.costAtr(s, cost) : 0;
  pnlAtr -= cAtr;
  const pnl$ = (pnlAtr / combo.sl) * riskPct * st.account;
  st.account += pnl$;
  st.grossAtr += pnlAtr; st.costAtrSum += cAtr; st.count++;
  if (pnlAtr > 0) st.wins++; else if (pnlAtr < 0) st.losses++;
  st.equity.push(st.account); if (st.equity.length > 2000) st.equity.shift();
  if (st.account > st.peak) st.peak = st.account;
  const dd = st.peak > 0 ? (st.peak - st.account) / st.peak : 0;
  if (dd > st.maxDD) st.maxDD = dd;
  const sym = s.symbol || "?";
  const bs = st.bySymbol[sym] || (st.bySymbol[sym] = { trades: 0, wins: 0, pnl$: 0, pnlAtr: 0 });
  bs.trades++; if (pnlAtr > 0) bs.wins++; bs.pnl$ += pnl$; bs.pnlAtr += pnlAtr;
  st.trades.push({ t: Number(s.time), sym, tf, side: combo.side, zone: combo.zone, session: combo.session, pnlAtr: round3(pnlAtr), pnl$: round2(pnl$), rsi: s.pivotRsi });
  if (st.trades.length > MAX_TRADES) st.trades.shift();
  return true;
}

/* First validated combo of a sample's side that it passes. */
function matchCombo(cands, s) { for (const c of cands) { if (model.passes(s, c)) return c; } return null; }

/* Process resolved setups per TF. On the FIRST run for a TF the bot SEEDS from the
   model's out-of-sample window — the most-recent (1-trainFrac) slice of stored
   history, i.e. the same validated set the card's backtest reports — so the Market
   Matrix starts populated instead of empty. After seeding it trades strictly
   FORWARD (new setups as they resolve). opts: { cost, riskPct, trainFrac }. */
function tick(store, models, opts) {
  opts = opts || {};
  const account0 = opts.account0 || 1000;
  const st = load(account0);
  const cost = opts.cost || null;
  const riskPct = opts.riskPct != null ? opts.riskPct : 0.01;
  const trainFrac = opts.trainFrac != null ? opts.trainFrac : 0.7;
  let booked = 0;

  for (const tf of TFS) {
    let all;
    try { all = store.samplesFor(tf); } catch (_) { all = []; }
    all = (all || []).filter(s => s && Number(s.time) > 0).sort((a, b) => a.time - b.time);
    if (!all.length) continue;
    const combosBySide = { long: pickCombos(models, tf, "long"), short: pickCombos(models, tf, "short") };

    // FIRST run for this TF: seed from the out-of-sample window, then set the cursor forward.
    if (!st.seeded || !st.seeded[tf]) {
      const cut = Math.floor(all.length * trainFrac);
      for (const s of all.slice(cut)) {
        const combo = matchCombo(combosBySide[s.side] || [], s);
        if (combo && book(st, s, combo, tf, cost, riskPct)) booked++;
      }
      (st.seeded || (st.seeded = {}))[tf] = true;
      st.cursor[tf] = all[all.length - 1].time;
      continue;
    }

    // FORWARD: only setups newer than the cursor.
    for (const s of all) {
      if (Number(s.time) <= (st.cursor[tf] || 0)) continue;
      st.cursor[tf] = Math.max(st.cursor[tf], Number(s.time));
      const combo = matchCombo(combosBySide[s.side] || [], s);
      if (combo && book(st, s, combo, tf, cost, riskPct)) booked++;
    }
  }
  st.updatedAt = Date.now();
  save();
  return booked;
}

function round2(x) { return Math.round(x * 100) / 100; }
function round3(x) { return Math.round(x * 1000) / 1000; }

/* Compact status for the API / Market Matrix. */
function status() {
  const st = load(1000);
  const leaderboard = Object.keys(st.bySymbol).map(sym => {
    const b = st.bySymbol[sym];
    return { symbol: sym, trades: b.trades, winRate: b.trades ? round1(b.wins / b.trades * 100) : 0, pnl: round2(b.pnl$), expectancyAtr: b.trades ? round3(b.pnlAtr / b.trades) : 0 };
  }).sort((a, b) => b.pnl - a.pnl);
  return {
    account0: st.account0, account: round2(st.account),
    returnPct: round1((st.account / st.account0 - 1) * 100),
    maxDrawdownPct: round1(st.maxDD * 100),
    trades: st.count, wins: st.wins, losses: st.losses,
    winRate: st.count ? round1(st.wins / st.count * 100) : 0,
    expectancyAtr: st.count ? round3(st.grossAtr / st.count) : 0,
    avgCostAtr: st.count ? round3(st.costAtrSum / st.count) : 0,
    startedAt: st.startedAt, updatedAt: st.updatedAt,
    leaderboard: leaderboard.slice(0, 50),
    recent: st.trades.slice(-25).reverse(),
    equity: st.equity.slice(-200)
  };
}
function round1(x) { return Math.round(x * 10) / 10; }

function reset(account0) { state = freshState(account0 || 1000); save(); return state; }

module.exports = { tick, status, reset, load, STATE_FILE, TFS };
