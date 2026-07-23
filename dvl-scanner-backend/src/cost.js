"use strict";

/* ── Per-asset trading-cost model (fees + slippage) ───────────────────────
   Turns real frictions into ATR-unit costs the account sim can subtract, so the
   ML backtest and the paper bot both reflect what a real fill would lose — not a
   frictionless lab.

   Two components, per ROUND TRIP (entry + exit):
     - FEE: a % of notional. As an ATR cost it's feeRoundTrip / atrPct, i.e. a
       tighter-stop (small ATR%) trade pays proportionally more ATR in fees.
     - SLIPPAGE: modelled directly in ATR (a fraction of the bar's ATR), scaled
       per asset by a LIQUIDITY multiplier — illiquid alts slip more. Without an
       order book we proxy liquidity by 24h quote volume.

   costAtr(sample) returns the total round-trip cost in ATR for that sample. */

const DEFAULTS = { feeTakerPerSide: 0.0004, slipAtrPerSide: 0.03 };

/* Liquidity → slippage multiplier. Big books (BTC/ETH) slip less; thin alts
   more. Tiers by 24h quote volume (USDT). Unknown volume → neutral 1.0. */
function slipMult(quoteVol) {
  const v = Number(quoteVol);
  if (!(v > 0)) return 1.0;
  if (v >= 5e8) return 0.5;   // very deep
  if (v >= 1e8) return 0.75;  // deep
  if (v >= 2e7) return 1.1;   // ok
  if (v >= 5e6) return 1.5;   // thin
  return 2.2;                 // very thin
}

/* Round-trip fee as a fraction of notional. */
function feeRoundTripFrac(opts) {
  const per = (opts && opts.feeTakerPerSide != null) ? opts.feeTakerPerSide : DEFAULTS.feeTakerPerSide;
  return Math.max(0, per) * 2;
}

/* Round-trip slippage in ATR for one asset. */
function slipAtrRoundTrip(quoteVol, opts) {
  const per = (opts && opts.slipAtrPerSide != null) ? opts.slipAtrPerSide : DEFAULTS.slipAtrPerSide;
  return Math.max(0, per) * 2 * slipMult(quoteVol);
}

/* Total round-trip cost in ATR for a sample carrying { entry, atr, qv }. */
function costAtr(sample, opts) {
  const entry = Number(sample && sample.entry), atr = Number(sample && sample.atr);
  const atrPct = (entry > 0 && atr > 0) ? Math.max(0.0015, atr / entry) : 0.01;   // floor 0.15%
  const feeAtr = feeRoundTripFrac(opts) / atrPct;
  const slipAtr = slipAtrRoundTrip(sample && sample.qv, opts);
  return feeAtr + slipAtr;
}

module.exports = { DEFAULTS, slipMult, feeRoundTripFrac, slipAtrRoundTrip, costAtr };
