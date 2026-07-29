"use strict";
const assert = require("assert");
const dh = require("../src/depthHistory");
const { bandLevels } = dh._internal;

(function () {
  // bandLevels: filtra ±banda e limita
  const mid = 64000, lo = mid * 0.974, hi = mid * 1.026;
  const bids = [];
  for (let i = 0; i < 500; i++) bids.push([64000 - i * 5, 1 + (i % 7)]); // desce ~2500 (fora da banda no fim)
  const out = bandLevels(bids, mid, lo, hi);
  assert.ok(out.length > 0, "tem níveis na banda");
  assert.ok(out.every(l => l[0] >= lo && l[0] <= hi), "todos dentro da banda");
  assert.ok(out.length <= dh._internal.MAX_SNAPS || out.length <= 220, "respeita teto de níveis");
  assert.ok(out.length <= 220, "cap 220 níveis");

  // ignora qty<=0 e preço<=0
  const bad = bandLevels([[64000, 0], [0, 5], [63999, 3]], mid, lo, hi);
  assert.strictEqual(bad.length, 1, "só o nível válido");
  assert.strictEqual(bad[0][1], 3);

  // history: injeta snaps direto no recorder e fatia por tempo
  const rec = dh.ensureRecording("TESTUSDT");
  const now = Date.now();
  rec.snaps = [];
  const many = []; for (let k = 0; k < 60; k++) many.push([99 - k, 1 + k]);
  for (let i = 0; i < 200; i++) rec.snaps.push({ ts: now - i * 8000, mid: 100 + i * 0.01, bids: many.slice(), asks: many.slice() });
  rec.snaps.sort((a, b) => a.ts - b.ts);
  const h = dh.history("TESTUSDT", 10, 1000);
  assert.strictEqual(h.ok, true);
  // 10 min = 600s ; a 8s => ~75 snaps
  assert.ok(h.count > 60 && h.count <= 80, "fatia ~10min de snaps, veio " + h.count);
  assert.ok(h.snapshots.every(s => s.ts >= now - 10 * 60000 - 1), "todos dentro da janela");
  assert.ok(Array.isArray(h.snapshots[0].bids) && Array.isArray(h.snapshots[0].asks), "contrato bids/asks");

  // levels cap no output (cap tem piso de 20 por design)
  const h2 = dh.history("TESTUSDT", 10, 25);
  assert.strictEqual(h2.snapshots[0].bids.length, 25, "cap de levels no output = 25");
  const h3 = dh.history("TESTUSDT", 10, 1);
  assert.strictEqual(h3.snapshots[0].bids.length, 20, "cap tem piso de 20");

  console.log("depthHistory.test.js OK (band=" + out.length + " · hist=" + h.count + ")");
  process.exit(0);
})();
