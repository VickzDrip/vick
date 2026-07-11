"use strict";

/* ── DVL Open Interest store (Phase A) ──────────────────────────────
   Builds REAL Open Interest candles for MEXC assets from holdVol (the
   contract count MEXC publishes in its ticker), which no exchange exposes
   as ready-made OHLC history. We sample holdVol + fairPrice continuously on
   the backend and aggregate the timestamped snapshots into OHLC candles per
   the timeframe the chart asks for — closed buckets are immutable because a
   past bucket's snapshots never change. History only grows forward from when
   sampling started (MEXC has no retroactive OI history and we never invent
   it). Persisted so a restart doesn't wipe what was collected.

   holdVol is a contract count; contractSize (per symbol, never shared across
   assets) converts it: oiBase = holdVol * contractSize, oiUSDT = oiBase *
   fairPrice. */

const fs = require("fs");
const path = require("path");

const SNAP_FILE = process.env.DVL_OI_SNAP_FILE || path.join(process.cwd(), "data", "mexc-oi-snaps.json");
const SNAP_MAX = Number(process.env.DVL_OI_SNAP_MAX || 1000); // per symbol (~8h at 30s)

const UNIT_MS = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
function tfToMs(tf) {
  const m = String(tf || "").match(/^(\d+)([smhdw])$/);
  if (!m) return 60000;
  return Number(m[1]) * (UNIT_MS[m[2]] || 60000);
}
function normSym(symbol) {
  const raw = String(symbol || "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  return /_USDT$/.test(raw) ? raw : raw.replace(/USDT$/, "_USDT");
}

/* sym -> [{ t, hv, fp }] (ascending by t). contractSize map is separate. */
const snaps = {};
let contractSize = {};

function setContractSizes(map) {
  if (map && typeof map === "object") contractSize = map;
}
function getContractSize(sym) {
  const v = contractSize[sym];
  return Number.isFinite(v) && v > 0 ? v : null;
}

/* One sampling tick: push a snapshot for every symbol in the ticker list.
   `tickers` is the mexc.tickers() shape: [{ sym, oi (holdVol), fp (fairPrice) }]. */
function sample(tickers, now) {
  const t = Number(now) || Date.now();
  if (!Array.isArray(tickers)) return 0;
  let n = 0;
  for (const c of tickers) {
    const sym = c && c.sym;
    const hv = Number(c && c.oi);
    if (!sym || !Number.isFinite(hv) || hv <= 0) continue;
    const fp = Number(c && c.fp);
    const arr = snaps[sym] || (snaps[sym] = []);
    // Guard against duplicate/out-of-order timestamps (dedup by identical t).
    if (arr.length && arr[arr.length - 1].t === t) { arr[arr.length - 1] = { t, hv, fp }; }
    else arr.push({ t, hv, fp });
    if (arr.length > SNAP_MAX) arr.shift();
    n++;
  }
  return n;
}

/* Aggregate this symbol's snapshots into OHLC candles for `tf`, in `unit`:
   "contracts" (raw holdVol), "base" (holdVol*contractSize) or "usdt"
   (holdVol*contractSize*fairPrice). Closed buckets are deterministic from the
   stored snapshots, so they never change once past. Returns ascending
   [{ time, open, high, low, close }] (last `limit`). */
function getCandles(symbol, tf, unit, limit) {
  const sym = normSym(symbol);
  const arr = snaps[sym] || [];
  const tfMs = tfToMs(tf);
  const cs = getContractSize(sym);
  const u = unit === "base" || unit === "usdt" ? unit : "contracts";
  // base/usdt need a real contractSize; without it we can only serve contracts.
  const effUnit = (u !== "contracts" && !cs) ? "contracts" : u;

  const valOf = (s) => {
    if (effUnit === "contracts") return s.hv;
    const base = s.hv * cs;
    if (effUnit === "base") return base;
    return Number.isFinite(s.fp) && s.fp > 0 ? base * s.fp : NaN; // usdt
  };

  const buckets = new Map();
  for (const s of arr) {
    const v = valOf(s);
    if (!Number.isFinite(v)) continue;
    const bt = Math.floor(s.t / tfMs) * tfMs;
    const b = buckets.get(bt);
    if (!b) buckets.set(bt, { time: bt, open: v, high: v, low: v, close: v });
    else { if (v > b.high) b.high = v; if (v < b.low) b.low = v; b.close = v; }
  }
  let out = Array.from(buckets.values()).sort((a, b) => a.time - b.time);
  const lim = Math.max(1, Math.min(2000, Number(limit) || 600));
  if (out.length > lim) out = out.slice(-lim);
  return { symbol: sym, tf, unit: effUnit, requestedUnit: u, contractSize: cs, candles: out };
}

function snapCount(symbol) {
  const arr = snaps[normSym(symbol)];
  return arr ? arr.length : 0;
}

/* Persistence — closed history survives a restart. Compact JSON of the raw
   snapshots + contractSize map. Best-effort (never throws into the caller). */
function save() {
  try {
    fs.mkdirSync(path.dirname(SNAP_FILE), { recursive: true });
    fs.writeFileSync(SNAP_FILE, JSON.stringify({ v: 1, at: Date.now(), contractSize, snaps }));
    return true;
  } catch (e) { return false; }
}
function load() {
  try {
    const obj = JSON.parse(fs.readFileSync(SNAP_FILE, "utf8"));
    if (obj && obj.snaps && typeof obj.snaps === "object") {
      for (const k in obj.snaps) if (Array.isArray(obj.snaps[k])) snaps[k] = obj.snaps[k].slice(-SNAP_MAX);
    }
    if (obj && obj.contractSize && typeof obj.contractSize === "object") contractSize = obj.contractSize;
    return true;
  } catch (e) { return false; }
}

module.exports = { sample, getCandles, setContractSizes, getContractSize, snapCount, save, load, normSym, tfToMs, SNAP_FILE };
