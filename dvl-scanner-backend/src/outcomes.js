"use strict";

/* ── Outcome logging — groundwork for a future learned score ─────────
   Every time a symbol freshly enters the signal registry (a real
   detection, not a re-refresh), we snapshot its feature set (the 6 Spike
   Score blocks + continuous raw values + score + side + entry price).

   Resolution is event-driven (a "triple barrier"), not a fixed clock wait:
   every cycle we check the symbol's current price against the entry price
   and resolve — right then, whenever it happens — the moment either:
     - price moves PROFIT_TARGET_PCT in the signal's favor  -> label 1 ("target")
     - price moves STOP_LOSS_PCT against it                  -> label 0 ("stop")
     - MAX_HORIZON_MS elapses without hitting either          -> label from
       whichever side of zero the return is at that point ("timeout")
   This means most examples resolve in minutes-to-hours instead of waiting
   a fixed 24h regardless of what the price already did — a spike that
   pumps and reverses within 20 minutes doesn't have to sit around for a
   day to be labeled correctly.

   Once resolved, the labeled example is appended to an append-only JSONL
   log — a training set for a future model to learn block weights from
   real outcomes instead of hand-tuned ones. This module only records; it
   does not train or predict anything (see train.js for that, separately). */

const fs = require("fs");
const path = require("path");

const PENDING_FILE = process.env.DVL_OUTCOMES_PENDING_FILE || path.join(process.cwd(), "data", "outcomes-pending.json");
const LOG_FILE = process.env.DVL_OUTCOMES_LOG_FILE || path.join(process.cwd(), "data", "outcomes-log.jsonl");

/* Triple-barrier thresholds — side-adjusted (favorable = price moving in
   the signal's own direction: up for LONG, down for SHORT). */
const PROFIT_TARGET_PCT = 2;   // hit this in favor -> resolves "it worked"
const STOP_LOSS_PCT = 1;       // hit this against  -> resolves "it failed"
/* Safety time limit: resolves on whichever side of zero the return sits,
   even if neither barrier was cleanly hit. Bounds the worst-case wait. */
const MAX_HORIZON_MS = 4 * 3600000;
/* Informational-only snapshots kept alongside the label (not used to
   compute it) so the log stays useful for diagnostics/analysis. */
const INFO_HORIZONS_MS = { r15m: 15 * 60000, r1h: 60 * 60000, r4h: 4 * 3600000 };
/* Drop entries that never see a fresh price again (delisted / fell out of
   the top-volume candidates) instead of holding them forever — distinct
   from MAX_HORIZON_MS, which resolves using whatever price WAS seen. */
const STALE_MS = 24 * 3600000;
/* Safety cap so a runaway signal rate can't grow pending state unbounded. */
const MAX_PENDING = 5000;

let pending = {}; // key -> entry

function keyOf(exchange, tf, symbol, at) { return exchange + "|" + tf + "|" + symbol + "|" + at; }
function round3(x) { return Math.round(x * 1000) / 1000; }

function loadPending() {
  try {
    const obj = JSON.parse(fs.readFileSync(PENDING_FILE, "utf8"));
    if (obj && typeof obj === "object") pending = obj;
  } catch (_) { /* no file yet / unreadable — start fresh */ }
}

function savePending() {
  try {
    fs.mkdirSync(path.dirname(PENDING_FILE), { recursive: true });
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pending));
  } catch (_) { /* disk issues are non-fatal */ }
}

function appendLog(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch (_) { /* disk issues are non-fatal */ }
}

/* Call when a symbol FRESHLY enters the signal registry (real detection,
   not a refresh of an already-tracked row). Captures the feature snapshot
   at signal time; a no-op if this exact (exchange, tf, symbol, at) key is
   already pending. */
function recordSignal(exchange, tf, row, now) {
  if (!row || !row.rawSymbol) return;
  const key = keyOf(exchange, tf, row.rawSymbol, now);
  if (pending[key]) return;
  const keys = Object.keys(pending);
  if (keys.length >= MAX_PENDING) {
    let oldestKey = keys[0], oldestAt = pending[oldestKey].at;
    for (const k of keys) { if (pending[k].at < oldestAt) { oldestKey = k; oldestAt = pending[k].at; } }
    delete pending[oldestKey];
  }
  pending[key] = {
    exchange, tf, symbol: row.rawSymbol, side: row.side,
    at: now, entryPrice: Number(row.price) || 0,
    score: row.spikeScore, blocks: row.blocks || null,
    /* Continuous raw values behind the 6 blocks — the hybrid ML model
       trains on these (real magnitude) as well as the booleans, so it can
       learn its own thresholds instead of being capped by the hand-picked
       ones (RSI < 30, etc.) the blocks use for display/filtering. */
    features: {
      spike20: Number(row.spike20) || 0,
      spike50: Number(row.spike50) || 0,
      rsi14: Number.isFinite(Number(row.rsi14)) ? Number(row.rsi14) : 50,
      volBelowMaBars: Number(row.volBelowMaBars) || 0,
      barPct: Number(row.barPct) || 0,
      flatCandles: Number(row.flatCandles) || 0,
      oiRatio: Number(row.oiRatio) || 0,
      lsrRatio: Number(row.lsrRatio) || 0,
      crossStrength: Number(row.crossStrength) || 0
    },
    returns: {}
  };
}

function resolve(key, label, reason, favorableRetPct, now) {
  const e = pending[key];
  e.label = label;
  e.outcome = reason;
  e.resolvedAt = now;
  e.resolvedAfterMs = now - e.at;
  e.finalReturnPct = round3(favorableRetPct);
  appendLog(e);
  delete pending[key];
}

/* Call once per exchange per cycle with the latest known price per symbol
   (from that cycle's scans). Resolves any pending entry whose price has
   crossed a barrier (or timed out), fills in informational return
   snapshots along the way, and drops stale entries that never got a fresh
   price again. */
function checkOutcomes(exchange, priceBySymbol, now) {
  for (const key in pending) {
    const e = pending[key];
    if (e.exchange !== exchange) continue;
    const elapsed = now - e.at;
    const price = priceBySymbol[e.symbol];

    if (Number.isFinite(price) && price > 0) {
      const rawRetPct = e.entryPrice > 0 ? ((price - e.entryPrice) / e.entryPrice) * 100 : 0;
      const favorableRetPct = String(e.side).toUpperCase() === "SHORT" ? -rawRetPct : rawRetPct;

      for (const h in INFO_HORIZONS_MS) {
        if (e.returns[h] === undefined && elapsed >= INFO_HORIZONS_MS[h]) e.returns[h] = round3(rawRetPct);
      }

      if (favorableRetPct >= PROFIT_TARGET_PCT) { resolve(key, 1, "target", favorableRetPct, now); continue; }
      if (favorableRetPct <= -STOP_LOSS_PCT) { resolve(key, 0, "stop", favorableRetPct, now); continue; }
      if (elapsed >= MAX_HORIZON_MS) { resolve(key, favorableRetPct > 0 ? 1 : 0, "timeout", favorableRetPct, now); continue; }
    } else if (elapsed >= STALE_MS) {
      delete pending[key]; // never saw a fresh price again — drop without logging
    }
  }
  savePending();
}

function loadStats() {
  let resolved = 0;
  try {
    const data = fs.readFileSync(LOG_FILE, "utf8");
    resolved = data.split("\n").filter(Boolean).length;
  } catch (_) { /* no log yet */ }
  return { pending: Object.keys(pending).length, resolved };
}

module.exports = {
  recordSignal, checkOutcomes, loadPending, savePending, loadStats,
  PROFIT_TARGET_PCT, STOP_LOSS_PCT, MAX_HORIZON_MS, INFO_HORIZONS_MS
};
