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
/* Same single-letter badges the Scanner UI already shows per block, so a
   combo like "O+L" reads the same way here as it does on the app. */
const BLOCK_LABELS = { spikeAboveAvg: "S", rsiOversold: "R", oiAboveAvg: "O", lsrBelowAvg: "L", flatVolumeBar: "F", prevVolBelowHalf: "P" };
/* Combos with fewer samples than this are still computed/returned, just
   hidden from the CLI table by default — a handful of examples makes the
   average too noisy to read. */
const MIN_COMBO_SAMPLES_TO_PRINT = 3;

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

/* Which EXACT combination of blocks was true, not just how many — "O+L"
   (OI acima da média + LSR abaixo da média) and "S+F+P" (spike pós-flat, the
   old scanner's own signal) can land in the same confluence-count bucket
   while meaning completely different things. Sorted by sample count
   (most-seen combos first) so the reliable rows surface at the top. */
function comboKey(blocks) {
  const letters = BLOCK_KEYS.filter(k => blocks[k]).map(k => BLOCK_LABELS[k]);
  return letters.length ? letters.join("+") : "(nenhum)";
}

function analyzeByCombination(examples) {
  examples = examples || loadResolved();
  const combos = {};
  for (const e of examples) {
    const key = comboKey(e.blocks);
    if (!combos[key]) combos[key] = { count: 0, wins: 0, retSum: 0, ddSum: 0, ddCount: 0 };
    const c = combos[key];
    c.count++;
    if (e.label === 1) c.wins++;
    if (Number.isFinite(e.finalReturnPct)) c.retSum += e.finalReturnPct;
    if (Number.isFinite(e.maxDrawdownPct)) { c.ddSum += e.maxDrawdownPct; c.ddCount++; }
  }
  const rows = Object.keys(combos).map(combo => {
    const c = combos[combo];
    return {
      combo,
      samples: c.count,
      wins: c.wins,
      winRate: round1((c.wins / c.count) * 100),
      avgReturnPct: round1(c.retSum / c.count),
      avgDrawdownPct: c.ddCount ? round1(c.ddSum / c.ddCount) : null,
      drawdownSamples: c.ddCount
    };
  });
  rows.sort((a, b) => b.samples - a.samples);
  return { total: examples.length, rows };
}

/* Converts a free-form string like "R,O,L" / "ROL" / "R+O+L" into the block
   keys it refers to, ignoring separators and unknown characters. */
function lettersToKeys(input) {
  const inverse = {};
  for (const k in BLOCK_LABELS) inverse[BLOCK_LABELS[k]] = k;
  const chars = String(input || "").toUpperCase().split("").filter(ch => inverse[ch]);
  return [...new Set(chars)].map(ch => inverse[ch]);
}

/* Answers "how do signals with AT LEAST these blocks true perform?",
   pooling every example where all the requested blocks were true
   regardless of what else was also true (F/P show up in almost every
   logged signal, so an EXACT match on "R+O+L" alone would mostly come back
   empty even when RSI+OI+LSR together are common — this is a superset
   match instead). `breakdown` lists the exact combinations that
   contributed, so you can see what tagged along. */
function analyzeSubset(letters, examples) {
  examples = examples || loadResolved();
  const keys = lettersToKeys(letters);
  const matches = examples.filter(e => e.blocks && keys.every(k => e.blocks[k]));
  const agg = { count: 0, wins: 0, retSum: 0, ddSum: 0, ddCount: 0 };
  for (const e of matches) {
    agg.count++;
    if (e.label === 1) agg.wins++;
    if (Number.isFinite(e.finalReturnPct)) agg.retSum += e.finalReturnPct;
    if (Number.isFinite(e.maxDrawdownPct)) { agg.ddSum += e.maxDrawdownPct; agg.ddCount++; }
  }
  return {
    requested: keys.map(k => BLOCK_LABELS[k]).join("+") || "(nenhum)",
    samples: agg.count,
    wins: agg.wins,
    winRate: agg.count ? round1((agg.wins / agg.count) * 100) : null,
    avgReturnPct: agg.count ? round1(agg.retSum / agg.count) : null,
    avgDrawdownPct: agg.ddCount ? round1(agg.ddSum / agg.ddCount) : null,
    drawdownSamples: agg.ddCount,
    breakdown: analyzeByCombination(matches).rows
  };
}

/* Raw continuous values behind the blocks (outcomes.js's `features`
   snapshot) — the actual RSI, how far OI/LSR sit from their own average,
   spike intensity, etc, not just the sim/não the blocks reduce them to. */
const CONT_FEATURE_KEYS = ["spike20", "spike50", "rsi14", "volBelowMaBars", "barPct", "flatCandles", "oiRatio", "lsrRatio", "crossStrength"];

function round4(x) { return Math.round(x * 10000) / 10000; }

/* Splits resolved examples into `numBins` equal-SIZE groups (quantiles) by
   the raw value of one continuous feature, and reports win rate / average
   return / average drawdown per group — this answers "at what actual VALUE
   does this start working," not just "does this boolean help." Quantile
   (not fixed-width) bins so each group has a similar sample count even
   when the value distribution is skewed. */
function analyzeByFeatureBins(featureKey, examples, numBins) {
  examples = (examples || loadResolved()).filter(e => e.features && Number.isFinite(e.features[featureKey]));
  numBins = numBins || 5;
  const total = examples.length;
  if (!total) return { feature: featureKey, total: 0, rows: [] };

  const sorted = examples.slice().sort((a, b) => a.features[featureKey] - b.features[featureKey]);
  const rows = [];
  for (let i = 0; i < numBins; i++) {
    const start = Math.floor((i * total) / numBins);
    const end = Math.floor(((i + 1) * total) / numBins);
    const slice = sorted.slice(start, end);
    if (!slice.length) continue;
    const wins = slice.filter(e => e.label === 1).length;
    const retSum = slice.reduce((s, e) => s + (Number.isFinite(e.finalReturnPct) ? e.finalReturnPct : 0), 0);
    const ddVals = slice.filter(e => Number.isFinite(e.maxDrawdownPct)).map(e => e.maxDrawdownPct);
    rows.push({
      rangeMin: round4(slice[0].features[featureKey]),
      rangeMax: round4(slice[slice.length - 1].features[featureKey]),
      samples: slice.length,
      wins,
      winRate: round1((wins / slice.length) * 100),
      avgReturnPct: round1(retSum / slice.length),
      avgDrawdownPct: ddVals.length ? round1(ddVals.reduce((a, b) => a + b, 0) / ddVals.length) : null,
      drawdownSamples: ddVals.length
    });
  }
  return { feature: featureKey, total, rows };
}

module.exports = {
  analyzeConfluence, analyzeByCombination, analyzeSubset, analyzeByFeatureBins,
  comboKey, lettersToKeys, confluenceCount, loadResolved,
  BLOCK_KEYS, BLOCK_LABELS, CONT_FEATURE_KEYS
};

function printTable(header, rows, minSamples) {
  console.log(header);
  for (const r of rows) {
    if (r.samples < (minSamples || 0)) continue;
    const dd = r.avgDrawdownPct === null ? "n/d" : (r.avgDrawdownPct + "% (n=" + r.drawdownSamples + ")");
    const label = r.combo !== undefined ? r.combo.padEnd(14) : (r.blocksTrue + "/6").padEnd(14);
    console.log(
      label +
      " | " + String(r.samples).padStart(8) +
      " | " + String(r.wins).padStart(8) +
      " | " + String(r.winRate + "%").padStart(11) +
      " | " + String((r.avgReturnPct >= 0 ? "+" : "") + r.avgReturnPct + "%").padStart(13) +
      " | " + dd
    );
  }
}

function printFeatureBins(featureKey) {
  const result = analyzeByFeatureBins(featureKey);
  console.log("=== " + featureKey + " (valor real, " + result.total + " amostras com esse dado) ===");
  if (!result.rows.length) { console.log("Sem dados ainda."); return; }
  console.log("Faixa de valor           | Amostras | Vitórias | Taxa acerto | Retorno médio | Drawdown médio");
  for (const r of result.rows) {
    const dd = r.avgDrawdownPct === null ? "n/d" : (r.avgDrawdownPct + "% (n=" + r.drawdownSamples + ")");
    const range = (r.rangeMin + " a " + r.rangeMax).padEnd(24);
    console.log(
      range +
      " | " + String(r.samples).padStart(8) +
      " | " + String(r.wins).padStart(8) +
      " | " + String(r.winRate + "%").padStart(11) +
      " | " + String((r.avgReturnPct >= 0 ? "+" : "") + r.avgReturnPct + "%").padStart(13) +
      " | " + dd
    );
  }
}

/* Runnable directly: `node src/analyze.js` (or `npm run analyze`).
   `--combo=R,O,L` (or `--combo=ROL`) looks up one specific set of blocks
   directly — a superset match (any signal with AT LEAST those blocks true,
   whatever else also happened to be true) plus a breakdown of the exact
   combinations that contributed, since the default tables only print
   combos with >= 3 samples and can hide small/rare ones entirely. */
if (require.main === module) {
  const featureArg = process.argv.find(a => a.startsWith("--feature="));
  const comboArg = process.argv.find(a => a.startsWith("--combo="));
  if (featureArg) {
    const requested = featureArg.slice("--feature=".length);
    const keys = requested === "all" ? CONT_FEATURE_KEYS : [requested];
    for (const k of keys) {
      if (!CONT_FEATURE_KEYS.includes(k)) { console.log("Feature desconhecida: " + k + " (opções: " + CONT_FEATURE_KEYS.join(", ") + ", all)"); continue; }
      printFeatureBins(k);
      console.log("");
    }
  } else if (comboArg) {
    const result = analyzeSubset(comboArg.slice("--combo=".length));
    console.log("Sinais com pelo menos " + result.requested + " verdadeiro(s) (outros bloquinhos podem ou não estar presentes junto):");
    console.log(
      "Amostras: " + result.samples +
      " | Vitórias: " + result.wins +
      " | Taxa de acerto: " + (result.winRate === null ? "n/d" : result.winRate + "%") +
      " | Retorno médio: " + (result.avgReturnPct === null ? "n/d" : (result.avgReturnPct >= 0 ? "+" : "") + result.avgReturnPct + "%") +
      " | Drawdown médio: " + (result.avgDrawdownPct === null ? "n/d" : result.avgDrawdownPct + "% (n=" + result.drawdownSamples + ")")
    );
    if (result.breakdown.length) {
      console.log("");
      printTable("Combinações exatas que contribuíram (o que mais aparece junto):\nCombo          | Amostras | Vitórias | Taxa acerto | Retorno médio | Drawdown médio", result.breakdown);
    } else {
      console.log("Nenhum sinal resolvido teve essa combinação até agora.");
    }
  } else {
    const byCount = analyzeConfluence();
    console.log("Total de amostras resolvidas: " + byCount.total);
    console.log("");
    printTable("=== Por quantidade de bloquinhos (0-6) ===\nCombo          | Amostras | Vitórias | Taxa acerto | Retorno médio | Drawdown médio", byCount.rows.filter(r => r.samples > 0));

    console.log("");
    const byCombo = analyzeByCombination();
    const shown = byCombo.rows.filter(r => r.samples >= MIN_COMBO_SAMPLES_TO_PRINT);
    const hidden = byCombo.rows.length - shown.length;
    printTable("=== Por combinação exata de bloquinhos (S=Spike R=RSI O=OI L=LSR F=FlatVol P=PreVol) ===\nCombo          | Amostras | Vitórias | Taxa acerto | Retorno médio | Drawdown médio", shown);
    if (hidden > 0) console.log("(+ " + hidden + " combinações com menos de " + MIN_COMBO_SAMPLES_TO_PRINT + " amostras, escondidas por serem pouco confiáveis)");
    console.log("");
    console.log("Dica: `node src/analyze.js --combo=ROL` mostra estatísticas agregadas só pra sinais com RSI+OI+LSR verdadeiros (com ou sem os outros).");
    console.log("Dica: `node src/analyze.js --feature=rsi14` (ou --feature=all) mostra o valor REAL de cada critério dividido em faixas, com a taxa de acerto de cada faixa.");
  }
}
