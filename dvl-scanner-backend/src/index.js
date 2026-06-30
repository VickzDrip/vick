"use strict";

/* DVL Scanner backend entry point: start the 24h worker, then the
   REST + WebSocket server. The worker keeps the snapshot fresh whether
   or not anyone is connected. */

const cfg = require("./config");
const worker = require("./worker");
const { createServer } = require("./server");

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

  const shutdown = () => { worker.stop(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})().catch(e => { console.error("[DVL] fatal:", e); process.exit(1); });
