"use strict";

/* Diagnostic: does CONFLUENCE (several Spike Score blocks true at once) beat
   any single block alone? train.js's logistic regression scores every block
   independently, so a real "these together are strong" effect can get
   diluted if most single-block-true examples in the log are weak/noisy on
   their own — a block's average coefficient reflects its AVERAGE showing
   across every example it appeared in, alone or in combination.

   This reads the same outcomes log with no modeling assumptions: it buckets
   every resolved example by how many of the 6 blocks were true (0-6) and
   reports, per bucket:
     - the plain win rate (no regression, no weighting, just counts)
     - the average final return (finalReturnPct, side-adjusted, signed —
       negative means the bucket lost money on average at resolution)
     - the average drawdown (maxDrawdownPct — how deep the worst adverse
       dip got, side-adjusted, before the signal resolved, whichever way it
       resolved) — only entries logged after this field existed carry it,
       so its sample count can be smaller than the bucket's total.
   This module only reports; it doesn't feed into train.js or the live score. */

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

function round1(x) { return Math.round(x * 10) / 10; }

/* Buckets examples by how many of the 6 blocks were true and reports win
   rate, average final return, and average drawdown per bucket. */
function analyzeConfluence(examples) {
  examples = examples || loadResolved();
  const buckets = {};
  for (let n = 0; n <= BLOCK_KEYS.length; n++) {
    buckets[n] = { count: 0, wins: 0, retSum: 0, ddSum: 0, ddCount: 0 };
  }
  for (const e of examples) {
    const n = confluenceCount(e.blocks);
    const b = buckets[n];
    b.count++;
    if (e.label === 1) b.wins++;
    if (Number.isFinite(e.finalReturnPct)) b.retSum += e.finalReturnPct;
    if (Number.isFinite(e.maxDrawdownPct)) { b.ddSum += e.maxDrawdownPct; b.ddCount++; }
  }
  const rows = [];
  for (let n = 0; n <= BLOCK_KEYS.length; n++) {
    const b = buckets[n];
    rows.push({
      blocksTrue: n,
      samples: b.count,
      wins: b.wins,
      winRate: b.count ? round1((b.wins / b.count) * 100) : null,
      avgReturnPct: b.count ? round1(b.retSum / b.count) : null,
      avgDrawdownPct: b.ddCount ? round1(b.ddSum / b.ddCount) : null,
      drawdownSamples: b.ddCount
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
  console.log("Bloq. | Amostras | Vitórias | Taxa acerto | Retorno médio | Drawdown médio");
  for (const r of result.rows) {
    if (r.samples === 0) continue;
    const dd = r.avgDrawdownPct === null ? "n/d" : (r.avgDrawdownPct + "% (n=" + r.drawdownSamples + ")");
    console.log(
      (r.blocksTrue + "/6").padEnd(5) +
      " | " + String(r.samples).padStart(8) +
      " | " + String(r.wins).padStart(8) +
      " | " + String(r.winRate + "%").padStart(11) +
      " | " + String((r.avgReturnPct >= 0 ? "+" : "") + r.avgReturnPct + "%").padStart(13) +
      " | " + dd
    );
  }
}
