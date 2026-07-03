"use strict";

/* ── Reset the ML training data ─────────────────────────────────────
   Archives (never deletes) the outcomes log, pending signals, and learned
   model, then starts fresh from zero. Use this when something upstream of
   the logged features changes in a way that makes old and new samples not
   comparable anymore — e.g. switching the LSR/OI data source, so `lsrRatio`/
   `oiRatio` would otherwise mean two different things depending on when a
   sample was recorded, silently contaminating the training set.

   STOP the worker before running this (systemctl stop dvl-scanner) — it
   moves files the worker also reads/writes, and doing that while it's
   running risks a lost update mid-cycle. Restart it after. */

const fs = require("fs");
const path = require("path");

const LOG_FILE = process.env.DVL_OUTCOMES_LOG_FILE || path.join(process.cwd(), "data", "outcomes-log.jsonl");
const PENDING_FILE = process.env.DVL_OUTCOMES_PENDING_FILE || path.join(process.cwd(), "data", "outcomes-pending.json");
const MODEL_FILE = process.env.DVL_MODEL_FILE || path.join(process.cwd(), "data", "learned-weights.json");

function archiveOne(file, archiveDir) {
  if (!fs.existsSync(file)) { console.log("(nada a arquivar) " + file); return; }
  fs.mkdirSync(archiveDir, { recursive: true });
  const dest = path.join(archiveDir, path.basename(file));
  fs.renameSync(file, dest);
  console.log("arquivado: " + file + " -> " + dest);
}

function resetTrainingData() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveDir = path.join(path.dirname(LOG_FILE), "archive-" + stamp);
  archiveOne(LOG_FILE, archiveDir);
  archiveOne(PENDING_FILE, archiveDir);
  archiveOne(MODEL_FILE, archiveDir);
  return archiveDir;
}

module.exports = { resetTrainingData, LOG_FILE, PENDING_FILE, MODEL_FILE };

/* Runnable directly: `node src/reset-training-data.js` (or `npm run reset-training-data`). */
if (require.main === module) {
  const dir = resetTrainingData();
  console.log("");
  console.log("Pronto. Sinais em aberto, amostras resolvidas e o modelo treinado voltaram a zero.");
  console.log("Nada foi apagado -- o estado anterior está em: " + dir);
}
