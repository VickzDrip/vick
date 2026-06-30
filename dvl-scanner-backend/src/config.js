"use strict";

/* ── DVL Scanner backend configuration ─────────────────────────────
   Values mirror the constants used by the in-page scanner so the
   server produces the same results the user already sees. */

module.exports = {
  PORT: Number(process.env.DVL_PORT || 8090),

  /* Scan window / sizing — mirrors the in-page scanner module. */
  KLIM: 80,          // candles fetched per symbol
  CAND: 200,         // scan top-N symbols by 24h quote volume
  POOL: 8,           // concurrent kline fetches
  FRESH_MS: 3 * 3600000, // a symbol's last candle must be newer than this

  /* How often the 24h worker re-scans each exchange (ms). */
  REFRESH_MS: Number(process.env.DVL_REFRESH_MS || 60000),

  /* How long a detected signal stays in the rolling history (ms). */
  HIST_MAX_AGE: 86400000,
  HIST_MAX_ROWS: 300,

  /* Evict a tracked signal after this many consecutive cycles missing from
     the feed (e.g. it dropped out of the top-volume candidates). */
  MAX_MISSED: 15,

  /* How many ranked rows the snapshot ships to the client. */
  SNAPSHOT_ROWS: 120,

  /* OHLC candles attached per row in the snapshot. */
  CANDLES_PER_ROW: 5,

  /* Detection timeframe and its confirm/context partners. */
  SCAN_TF: process.env.DVL_SCAN_TF || "15m",
  TF_CONFIRM: { "1m": "5m", "3m": "15m", "5m": "15m", "15m": "1h", "30m": "1h", "1h": "4h" },
  TF_CONTEXT: { "1m": "15m", "3m": "1h", "5m": "1h", "15m": "4h", "30m": "4h", "1h": "1d" },

  /* MEXC timeframe mapping (matches the in-page MEXC_TF). */
  MEXC_TF: { "1m": "Min1", "3m": "Min5", "5m": "Min5", "15m": "Min15", "30m": "Min30", "1h": "Min60" },

  /* Bybit account-ratio period mapping (Bybit's minimum granularity is 5min). */
  BYBIT_PERIOD: { "1m": "5min", "3m": "5min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h" },

  /* Window lengths for the OI / LSR moving averages used to decide the arrow
     (value vs its MA) and the colour (MA slope + value position). */
  OI_MA_LEN: 20,    // OI samples (one per cycle) kept per symbol
  LSR_MA_LEN: 20,   // Bybit account-ratio points fetched per symbol

  /* Signal-engine parameters — same defaults as the in-page filterState. */
  ENGINE: {
    maPeriod1: 20,
    maPeriod2: 50,
    flat_x: 10,
    priceGlueMaPeriod: 20,
    priceGlueLookback: 10,
    priceGlueMaxDistPct: 0.25,
    spikePrevVolMult: 1.5,
    maFlatLookback: 10,
    /* Ignition detection (the MEXC early-pump setup): the N bars before the
       current one must be BELOW the volume MA (a dead/flat base), and the
       current bar is the FIRST to cross back ABOVE the MA — even a small one. */
    minBaseBars: 6
  },

  /* Ignition score weights — reward the QUALITY of the early setup, not the
     size of the move (the whole point is to catch it small/early). */
  IGNITION_WEIGHTS: {
    base: 30,   // longer dead base below the MA = stronger accumulation
    oi: 25,     // real OI rising = confirmation that it's "the start of something"
    cross: 18,  // how decisively volume crossed back above the MA
    glue: 15,   // price was compressed/coiled before the cross
    flat: 12    // flatter volume MA during the base = cleaner setup
  },

  /* Default Spike Score weights — identical to the in-page Filtros defaults. */
  WEIGHTS: {
    spike20: 20,
    spike50: 7,
    flatCandles: 2.4,
    barPct: 2.2,
    prevVolBelowHalf: 6,
    priceGlueOk: 5
  },

  /* Range-normalization scales used by the Spike Score (mirror the fixed
     in-page score(): the metric value that earns full points). */
  SCORE_FULL: { spike20: 8, spike50: 5, flatCandles: 10, barPct: 8 },

  /* ── Hard safety locks — this backend is READ-ONLY. It never trades. ──
     Mirrored here so the contract is explicit and auditable. */
  SAFETY: {
    DVL_BOT_EXECUTION_ALLOWED: false,
    DVL_AI_AUTO_TRADE_ALLOWED: false,
    DVL_COPILOT_AUTO_ORDER_ALLOWED: false
  }
};
