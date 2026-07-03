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

  /* All timeframes the scanner keeps pre-computed in the background so
     switching the Filtros "TF detecção" chip is instant (mirrors the
     frontend's TF_LIST). */
  TF_LIST: ["1m", "3m", "5m", "15m", "30m", "1h"],

  /* MEXC timeframe mapping (matches the in-page MEXC_TF). */
  MEXC_TF: { "1m": "Min1", "3m": "Min5", "5m": "Min5", "15m": "Min15", "30m": "Min30", "1h": "Min60" },

  /* Binance top-trader long/short ratio period mapping (Binance's minimum
     granularity for this endpoint is 5m). */
  BINANCE_LSR_PERIOD: { "1m": "5m", "3m": "5m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h" },

  /* Window lengths for the OI / LSR moving averages used to decide the arrow
     (value vs its MA) and the colour (MA slope + value position). */
  OI_MA_LEN: 20,    // OI samples (one per cycle) kept per symbol
  LSR_MA_LEN: 20,   // Binance top-trader ratio points fetched per symbol

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
    minBaseBars: 6,

    /* ── Spike Score block inputs (Beta scanner-blocks redesign) ──
       spikeMaMode: "1" checks only the fast MA (maPeriod1); "2" requires
       both the fast and slow MA (maPeriod1 + maPeriod2). */
    spikeMaMode: "2",
    /* "Flat volume bar" block: bars immediately before the spike whose
       volume stayed below its MA (reuses volBelowMaBars), gated by this
       length. */
    flatVolumeBarLen: 5,
    /* RSI oversold block: validated if RSI was at/under this value at any
       point within the last N candles. */
    rsiOversoldThreshold: 30,
    rsiOversoldLookback: 20
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

  /* Default Spike Score weights — identical to the in-page Filtros defaults.
     Each factor is a pass/fail block (no continuous ranges anymore): the
     score is the weighted share of blocks that validated, scaled to 0-99.
     Blocks carry no priority between them — this is just each one's relative
     contribution to the score. */
  WEIGHTS: {
    spikeAboveAvg: 20,
    rsiOversold: 15,
    oiAboveAvg: 15,
    lsrBelowAvg: 15,
    flatVolumeBar: 12,
    prevVolBelowHalf: 12
  },

  /* ── Hard safety locks — this backend is READ-ONLY. It never trades. ──
     Mirrored here so the contract is explicit and auditable. */
  SAFETY: {
    DVL_BOT_EXECUTION_ALLOWED: false,
    DVL_AI_AUTO_TRADE_ALLOWED: false,
    DVL_COPILOT_AUTO_ORDER_ALLOWED: false
  }
};
