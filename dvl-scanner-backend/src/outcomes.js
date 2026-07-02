"use strict";

/* ── Outcome logging — groundwork for a future learned score ─────────
   Every time a symbol freshly enters the signal registry (a real
   detection, not a re-refresh), we snapshot its feature set (the 6 Spike
   Score blocks + score + side + entry price). As time passes we fill in
   how price actually moved (15m/1h/4h/24h returns). Once fully resolved,
   the labeled example is appended to an append-only JSONL log — a
   training set for a future model to learn block weights from real
   outcomes instead of hand-tuned ones. This module only records; it does
   not train or predict anything (yet). */

const fs = require("fs");
const path = require("path");

const PENDING_FILE = process.env.DVL_OUTCOMES_PENDING_FILE || path.join(process.cwd(), "data", "outcomes-pending.json");
const LOG_FILE = process.env.DVL_OUTCOMES_LOG_FILE || path.join(process.cwd(), "data", "outcomes-log.jsonl");

/* How long after the signal we check price, and the point past which an
   entry is considered fully resolved and gets appended to the log. */
const HORIZONS_MS = { r15m: 15 * 60000, r1h: 60 * 60000, r4h: 4 * 3600000, r24h: 24 * 3600000 };
const RESOLVE_KEY = "r24h";
const MAX_HORIZON_MS = HORIZONS_MS[RESOLVE_KEY];
/* Drop stale entries that never see a fresh price again (delisted / fell
   out of the top-volume candidates) instead of holding them forever. */
const STALE_MS = MAX_HORIZON_MS * 2;
/* Safety cap so a runaway signal rate can't grow pending state unbounded. */
const MAX_PENDING = 5000;

let pending = {}; // key -> entry

function keyOf(exchange, tf, symbol, at) { return exchange + "|" + tf + "|" + symbol + "|" + at; }

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
    returns: {}
  };
}

/* Call once per exchange per cycle with the latest known price per symbol
   (from that cycle's scans). Fills in any return horizons that have
   elapsed, appends fully-resolved entries to the log, and drops stale ones
   that never got a fresh price again. */
function checkOutcomes(exchange, priceBySymbol, now) {
  for (const key in pending) {
    const e = pending[key];
    if (e.exchange !== exchange) continue;
    const elapsed = now - e.at;
    const price = priceBySymbol[e.symbol];
    if (Number.isFinite(price) && price > 0) {
      for (const h in HORIZONS_MS) {
        if (e.returns[h] === undefined && elapsed >= HORIZONS_MS[h]) {
          e.returns[h] = e.entryPrice > 0 ? ((price - e.entryPrice) / e.entryPrice) * 100 : 0;
        }
      }
    }
    if (e.returns[RESOLVE_KEY] !== undefined) {
      appendLog(e);
      delete pending[key];
    } else if (elapsed >= STALE_MS) {
      delete pending[key];
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

module.exports = { recordSignal, checkOutcomes, loadPending, savePending, loadStats, HORIZONS_MS, RESOLVE_KEY };
