"use strict";

/* DVL Scanner backend entry point: start the 24h worker, then the
   REST + WebSocket server. The worker keeps the snapshot fresh whether
   or not anyone is connected. */

const cfg = require("./config");
const worker = require("./worker");
const oiStore = require("./oiStore");
const { mexc } = require("./exchanges");
const { createServer } = require("./server");

/* Dedicated Open Interest sampler — the scan cycle (REFRESH_MS, 2min) is too
   sparse to build decent OI candles, so this pulls the MEXC bulk ticker
   (holdVol + fairPrice for every symbol, one call) on its own faster tick and
   feeds oiStore. contractSize is fetched once at boot and refreshed daily.
   Persists periodically so collected history survives a restart. */
function startOiSampler() {
  const SAMPLE_MS = Number(process.env.DVL_OI_SAMPLE_MS || 30000);
  const SAVE_MS = Number(process.env.DVL_OI_SAVE_MS || 300000);
  const DETAIL_MS = 24 * 3600 * 1000;

  oiStore.load();
  const refreshDetail = () => mexc.contractDetail()
    .then(map => { oiStore.setContractSizes(map); console.log("[DVL] OI contractSize map:", Object.keys(map).length, "symbols"); })
    .catch(e => console.error("[DVL] OI contractDetail failed:", e.message));
  const tick = () => mexc.tickers()
    .then(ts => oiStore.sample(ts, Date.now()))
    .catch(e => console.error("[DVL] OI sample failed:", e.message));

  /* Load contractSize BEFORE the first sample so no snapshot is ever read back
     in the wrong unit during the ~1s the detail call takes (that produced a
     brief "wrong scale" transient right after a restart). */
  refreshDetail().finally(() => { tick(); setInterval(tick, SAMPLE_MS); });
  setInterval(refreshDetail, DETAIL_MS);
  setInterval(() => oiStore.save(), SAVE_MS);
}

(async () => {
  // Hard safety contract — this process is read-only and never trades.
  if (cfg.SAFETY.DVL_BOT_EXECUTION_ALLOWED || cfg.SAFETY.DVL_AI_AUTO_TRADE_ALLOWED || cfg.SAFETY.DVL_COPILOT_AUTO_ORDER_ALLOWED) {
    console.error("[DVL] Safety violation: trade execution flags must be false. Refusing to start.");
    process.exit(1);
  }

  const { server } = createServer();
  server.listen(cfg.PORT, () => {
    console.log("[DVL] scanner backend listening on :" + cfg.PORT);
    console.log("[DVL]   REST  GET /api/dvl/scanner/snapshot?exchange=binance|mexc");
    console.log("[DVL]   WS        /ws/dvl/scanner?exchange=binance|mexc");
  });

  await worker.start();

  startOiSampler();

  /* Warm the BTC backtest cache in the background so the first user who
     opens the Copilot tab isn't the one who triggers the ~1-min run. */
  try { require("./btcBacktest").get(); } catch (_) { /* non-fatal */ }

  const shutdown = () => { try { oiStore.save(); } catch (_) {} worker.stop(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})().catch(e => { console.error("[DVL] fatal:", e); process.exit(1); });
