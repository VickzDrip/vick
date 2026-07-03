"use strict";

/* Diagnostic: does CONFLUENCE (several Spike Score blocks true at once) beat
   any single block alone? train.js's logistic regression scores every block
   independently, so a real "these together are strong" effect can get
   diluted if most single-block-true examples in the log are weak/noisy on
   their own — a block's average coefficient reflects its AVERAGE showing
   across every example it appeared in, alone or in combination.

   This reads the same outcomes log with no modeling assumptions: it buckets
   every resolved example by how many of the 6 blocks were true (0-6) and
   reports the plain win rate per bucket. If confluence genuinely matters,
   the win rate should climb as the bucket count goes up. This module only
   reports; it doesn't feed into train.js or the live score. */

const fs = require("fs");
const path = require("path");

const LOG_FILE = process.env.DVL_OUTCOMES_LOG_FILE || path.join(process.cwd(), "data", "outcomes-log.jsonl");
const BLOCK_KEYS = ["spikeAboveAvg", "rsiOversold", "oiAboveAvg", "lsrBelowAvg", "flatVolumeBar", "prevVolBelowHalf"];

function loadResolved() {
  let raw;
  try { raw = fs.readFileSync(LOG_FILE, "utf8"); } catch (_) { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch (_) { continue; }
    if (!e || !e.blocks || (e.label !== 0 && e.label !== 1)) continue;
    out.push(e);
  }
  return out;
}

function confluenceCount(blocks) {
  return BLOCK_KEYS.reduce((n, k) => n + (blocks[k] ? 1 : 0), 0);
}

/* Buckets examples by how many of the 6 blocks were true and reports the
   plain win rate per bucket — no regression, no weighting, just counts. */
function analyzeConfluence(examples) {
  examples = examples || loadResolved();
  const buckets = {};
  for (let n = 0; n <= BLOCK_KEYS.length; n++) buckets[n] = { count: 0, wins: 0 };
  for (const e of examples) {
    const n = confluenceCount(e.blocks);
    buckets[n].count++;
    if (e.label === 1) buckets[n].wins++;
  }
  const rows = [];
  for (let n = 0; n <= BLOCK_KEYS.length; n++) {
    const b = buckets[n];
    rows.push({
      blocksTrue: n,
      samples: b.count,
      wins: b.wins,
      winRate: b.count ? Math.round((b.wins / b.count) * 1000) / 10 : null
    });
  }
  return { total: examples.length, rows };
}

module.exports = { analyzeConfluence, confluenceCount, loadResolved, BLOCK_KEYS };

/* Runnable directly: `node src/analyze.js` (or `npm run analyze`). */
if (require.main === module) {
  const result = analyzeConfluence();
  console.log("Total de amostras resolvidas: " + result.total);
  console.log("");
  console.log("Bloquinhos verdadeiros | Amostras | Vitórias | Taxa de acerto");
  for (const r of result.rows) {
    if (r.samples === 0) continue;
    console.log(
      (r.blocksTrue + "/6").padEnd(6) +
      "  |  " + String(r.samples).padStart(6) +
      "  |  " + String(r.wins).padStart(6) +
      "  |  " + (r.winRate + "%")
    );
  }
}
