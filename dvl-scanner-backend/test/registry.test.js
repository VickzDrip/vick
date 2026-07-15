"use strict";

/* Persistence test for the signal registry: a detected signal must STAY on
   the list and refresh, not vanish next cycle. Runs offline.

   Every row defaults to side "LONG" — mergeRegistry only lets LONG signals
   join at all (SHORT was removed entirely, see worker.js's doc-comment),
   so a SHORT row here would never join and these tests would be exercising
   the wrong gate. A dedicated SHORT-specific test below covers that gate
   directly instead. */

const assert = require("assert");
const { mergeRegistry } = require("../src/worker");
const cfg = require("../src/config");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }

function row(sym, igniting, price, side) {
  return { rawSymbol: sym, symbol: sym + "USDT", side: side || "LONG", isIgnition: !!igniting, price: price || 1, spikeScore: 50 };
}
const reg = {};
let t = 1000000;
const STEP = 60000;

/* Cycle 1: A ignites → joins. */
let rows = mergeRegistry(reg, { A: row("A", true, 10) }, t);
ok(reg.A && rows.length === 1, "A joins on ignition");
const aDetected = reg.A._detectedAt;

/* Cycle 2: A no longer igniting but still in feed (price updated) → persists & refreshes. B ignites → joins. */
t += STEP;
rows = mergeRegistry(reg, { A: row("A", false, 12), B: row("B", true, 5) }, t);
ok(reg.A && reg.B, "A persists while no longer igniting; B joins");
ok(reg.A.price === 12, "A live price refreshed (10 -> 12)");
ok(reg.A._detectedAt === aDetected, "A keeps its original detection time");
ok(rows[0].rawSymbol === "B", "newest detection (B) on top");

/* Cycle 3..: A disappears from feed → accrues missed; stays until MAX_MISSED. */
let lastLen;
for (let i = 0; i < cfg.MAX_MISSED; i++) {
  t += STEP;
  rows = mergeRegistry(reg, { B: row("B", false, 6) }, t);
  lastLen = rows.length;
}
ok(reg.A, "A still tracked just under MAX_MISSED absences");
/* One more absence crosses the threshold → A evicted. */
t += STEP;
rows = mergeRegistry(reg, { B: row("B", false, 6) }, t);
ok(!reg.A, "A evicted after exceeding MAX_MISSED absences");
ok(reg.B, "B (still in feed) remains");

/* Cap: many fresh ignitions push the oldest past SNAPSHOT_ROWS. All stay in
   the feed (only the newest ignites each cycle) so the cap — not the missed
   eviction — is what drops them. */
const reg2 = {};
let t2 = 5000000;
const feed = {};
for (let i = 0; i < cfg.SNAPSHOT_ROWS + 5; i++) {
  t2 += STEP;
  for (const s in feed) feed[s].isIgnition = false;   // previous ones present but not igniting
  feed["S" + i] = row("S" + i, true, 1);
  mergeRegistry(reg2, feed, t2);
}
ok(Object.keys(reg2).length === cfg.SNAPSHOT_ROWS, "registry capped at SNAPSHOT_ROWS (oldest dropped)");
const survivors = Object.keys(reg2);
ok(!survivors.includes("S0") && survivors.includes("S" + (cfg.SNAPSHOT_ROWS + 4)), "oldest pushed out, newest kept");

/* SHORT never joins, even while igniting, even if it was already tracked
   from a persisted registry file saved before this gate existed (loaded
   straight into sigReg, bypassing the join check entirely). */
const reg3 = {};
let rows3 = mergeRegistry(reg3, { C: row("C", true, 1, "SHORT") }, 9000000);
ok(!reg3.C && rows3.length === 0, "an igniting SHORT row never joins the registry");

const reg4 = { D: { rawSymbol: "D", symbol: "DUSDT", side: "SHORT", isIgnition: true, price: 1, spikeScore: 50, _detectedAt: 8999000, _missed: 0 } };
let rows4 = mergeRegistry(reg4, { D: row("D", true, 1, "SHORT") }, 9000000);
ok(!reg4.D && rows4.length === 0, "a pre-existing SHORT entry (e.g. from an old persisted registry file) is purged immediately, not left to age out");

/* "Spike há" follows the LAST pré-volume spike: the detection time seeds from
   the ignition candle (igniteBarTime), stays put while the same candle is the
   most recent one, and RESETS when a fresh spike pós-flat fires on a newer
   candle. */
{
  const regT = {};
  const bar0 = 5000000;
  mergeRegistry(regT, { X: Object.assign(row("X", true, 1), { igniteBarTime: bar0 }) }, bar0 + 500);
  ok(regT.X && regT.X._detectedAt === bar0, "join uses the ignition candle time, not the scan time");
  mergeRegistry(regT, { X: Object.assign(row("X", true, 1), { igniteBarTime: bar0 }) }, bar0 + 60000);
  ok(regT.X._detectedAt === bar0, "same ignition candle keeps the time (no repeated reset while isIgnition stays true)");
  mergeRegistry(regT, { X: Object.assign(row("X", false, 1), { igniteBarTime: 0 }) }, bar0 + 120000);
  ok(regT.X._detectedAt === bar0, "a non-igniting refresh keeps the last spike time");
  const bar1 = bar0 + 900000;
  mergeRegistry(regT, { X: Object.assign(row("X", true, 1), { igniteBarTime: bar1 }) }, bar1 + 500);
  ok(regT.X._detectedAt === bar1, "a fresh spike pós-flat on a newer candle resets the time to the most recent spike");
}

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
