"use strict";

/* Persistence test for the signal registry: a detected signal must STAY on
   the list and refresh, not vanish next cycle. Runs offline. */

const assert = require("assert");
const { mergeRegistry } = require("../src/worker");
const cfg = require("../src/config");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }

function row(sym, igniting, price) {
  return { rawSymbol: sym, symbol: sym + "USDT", isIgnition: !!igniting, price: price || 1, spikeScore: 50 };
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

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
