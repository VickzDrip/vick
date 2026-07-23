"use strict";
const assert = require("assert");
const cost = require("../src/cost");

(function testSlipMultByLiquidity() {
  assert(cost.slipMult(1e9) < cost.slipMult(1e8), "deeper book slips less");
  assert(cost.slipMult(1e8) < cost.slipMult(1e6), "thin book slips more");
  assert.strictEqual(cost.slipMult(0), 1.0, "unknown volume → neutral");
  console.log("  slipMult: deep", cost.slipMult(1e9), "thin", cost.slipMult(1e6));
})();

(function testCostAtrComposition() {
  // fee: 0.0004/side → 0.0008 round-trip. atrPct = 1/100 = 0.01 → feeAtr = 0.08.
  // slip: 0.03/side → 0.06 round-trip × mult. For qv unknown mult=1 → 0.06.
  const s = { entry: 100, atr: 1, qv: 0 };
  const c = cost.costAtr(s, { feeTakerPerSide: 0.0004, slipAtrPerSide: 0.03 });
  assert(Math.abs(c - (0.08 + 0.06)) < 1e-9, "fee+slip ATR, got " + c);
  // tighter stop (smaller atrPct) → MORE fee in ATR
  const tight = cost.costAtr({ entry: 100, atr: 0.5, qv: 0 }, { feeTakerPerSide: 0.0004, slipAtrPerSide: 0.03 });
  assert(tight > c, "tighter stop pays more ATR fee");
  // illiquid asset → more slippage
  const illiquid = cost.costAtr({ entry: 100, atr: 1, qv: 1e6 }, { feeTakerPerSide: 0.0004, slipAtrPerSide: 0.03 });
  assert(illiquid > c, "illiquid pays more slippage");
  console.log("  costAtr base:", c.toFixed(3), "tight:", tight.toFixed(3), "illiquid:", illiquid.toFixed(3));
})();

console.log("cost.test.js OK");
