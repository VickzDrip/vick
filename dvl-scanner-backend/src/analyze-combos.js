"use strict";

/* ── Advanced combo mining — which block combinations ACTUALLY work? ──
   analyze.js answers "does more confluence beat less" (bucket by count)
   and lets you look up ONE combo by hand. This module goes further and
   mines EVERY 1-, 2- and 3-block subset (6+15+20 = 41 subsets, superset
   match: all signals where at least those blocks were true) per side,
   then ranks them by statistics that don't reward luck:

   - Wilson lower bound (95%) on the win rate — the core ranking metric.
     A combo that went 3/3 has a raw win rate of 100% but a Wilson lower
     bound near 44%; one that went 52/80 (65%) bounds near 54%. Ranking
     by the bound instead of the raw rate is what stops tiny-sample flukes
     from topping the table — the standard fix, no simulation needed.
   - Lift vs that side's own baseline win rate — "1.4x" reads as "this
     combo wins 40% more often than just taking every signal of this side".
   - Financial expectancy (avg finalReturnPct, side-adjusted) — a combo
     can win often and still lose money if wins are small and losses big;
     both numbers are shown so neither can hide behind the other.
   - Temporal stability: each combo's examples split chronologically in
     half; a combo that won 70% early and 45% late is decaying, not real —
     flagged instead of silently averaged into a respectable-looking 58%.
   - Net Delta conditioning: within each combo, examples that carry the
     netDeltaSlope feature (logged after it existed) split into rising vs
     falling — is the combo better when the buy side is actively winning?

   Read-only diagnostic like analyze.js: reads the outcomes log, feeds
   nothing back into train.js or the live score. CLI output is Portuguese
   (it's read by the user on a phone terminal); flags: --side=LONG|SHORT,
   --min=N (min samples to rank, default 15), --top=N (default 8). */

const A = require("./analyze");

const BLOCK_KEYS = A.BLOCK_KEYS;
const BLOCK_LABELS = A.BLOCK_LABELS;
const LETTER_NAMES = {
  S: "Spike acima da média", R: "RSI sobrevenda", O: "OI acima da média",
  L: "LSR abaixo da média", F: "Flat volume bar", P: "Pré-volume baixo"
};

function round1(x) { return Math.round(x * 10) / 10; }
function round2(x) { return Math.round(x * 100) / 100; }

/* Lower bound of the 95% Wilson score interval for a binomial proportion.
   Preferred over the naive rate +- normal error because it stays sane at
   small n and extreme rates (3/3 doesn't claim 100%). */
function wilsonLower(wins, n, z) {
  if (!n) return 0;
  z = z || 1.96;
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return Math.max(0, (center - margin) / denom);
}

/* All subsets of BLOCK_KEYS with 1..maxSize members, as arrays of keys. */
function enumerateSubsets(maxSize) {
  maxSize = maxSize || 3;
  const out = [];
  const n = BLOCK_KEYS.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const keys = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) keys.push(BLOCK_KEYS[i]);
    if (keys.length <= maxSize) out.push(keys);
  }
  return out;
}

function comboLabel(keys) {
  return keys.map(k => BLOCK_LABELS[k]).join("+");
}

function normSide(s) { return String(s || "").toUpperCase() === "SHORT" ? "SHORT" : "LONG"; }

/* Full stat block for one set of examples (already filtered to a combo). */
function statsOf(examples) {
  const n = examples.length;
  let wins = 0, retSum = 0;
  for (const e of examples) {
    if (e.label === 1) wins++;
    if (Number.isFinite(e.finalReturnPct)) retSum += e.finalReturnPct;
  }
  return {
    samples: n,
    wins,
    winRate: n ? round1((wins / n) * 100) : null,
    wilsonLow: n ? round1(wilsonLower(wins, n) * 100) : null,
    avgReturnPct: n ? round2(retSum / n) : null,
    totalReturnPct: n ? round1(retSum) : null
  };
}

/* Chronological half-split win rates — the decay detector. `examples`
   must be in log order (loadResolved preserves it), which IS resolution
   order; good enough to see "worked before, stopped working". */
function stabilityOf(examples) {
  const n = examples.length;
  if (n < 8) return null; // halves of <4 are pure noise, don't pretend
  const half = Math.floor(n / 2);
  const first = statsOf(examples.slice(0, half));
  const second = statsOf(examples.slice(half));
  const delta = second.winRate - first.winRate;
  return {
    firstWinRate: first.winRate, secondWinRate: second.winRate,
    delta: round1(delta),
    verdict: delta <= -15 ? "piorando" : delta >= 15 ? "melhorando" : "estável"
  };
}

/* Rising vs falling Net Delta split, only over examples that actually
   carry the feature (logged after it existed; 0 also means "not captured"
   since worker.js leaves it unset on fetch failure, so 0 is excluded
   rather than guessed at). */
function netDeltaSplitOf(examples) {
  const rising = [], falling = [];
  for (const e of examples) {
    const s = e.features && Number(e.features.netDeltaSlope);
    if (!Number.isFinite(s) || s === 0) continue;
    (s > 0 ? rising : falling).push(e);
  }
  if (rising.length < 5 || falling.length < 5) return null; // not enough on both sides to compare
  return { rising: statsOf(rising), falling: statsOf(falling) };
}

/* Mines every 1-3 block subset for one side. Returns them ALL (caller
   filters/sorts); each entry: { keys, label, ...statsOf, lift, stability,
   netDelta }. `lift` is vs the side's own baseline win rate. */
function mineCombos(examples, side) {
  const sided = examples.filter(e => normSide(e.side) === side);
  const baseline = statsOf(sided);
  const combos = enumerateSubsets(3).map(keys => {
    const subset = sided.filter(e => keys.every(k => e.blocks[k]));
    const st = statsOf(subset);
    return Object.assign({
      keys,
      label: comboLabel(keys),
      lift: (st.samples && baseline.winRate > 0) ? round2(st.winRate / baseline.winRate) : null,
      stability: stabilityOf(subset),
      netDelta: netDeltaSplitOf(subset)
    }, st);
  });
  return { side, baseline, combos };
}

function analyze(examples) {
  examples = examples || A.loadResolved();
  return { LONG: mineCombos(examples, "LONG"), SHORT: mineCombos(examples, "SHORT"), total: examples.length };
}

/* ── CLI report (Portuguese, narrow enough for a phone terminal) ── */

function fmtPct(v) { return v === null ? "n/d" : (v >= 0 ? "+" : "") + v + "%"; }

function printCombo(c, baseline) {
  const names = c.keys.map(k => LETTER_NAMES[BLOCK_LABELS[k]]).join(" + ");
  console.log("  " + c.label + "  (" + names + ")");
  console.log("    " + c.samples + " sinais | acerto " + c.winRate + "% (piso confiável " + c.wilsonLow + "%)" +
    (c.lift !== null ? " | " + c.lift + "x o base de " + baseline.winRate + "%" : ""));
  console.log("    retorno médio " + fmtPct(c.avgReturnPct) + " por sinal | total " + fmtPct(c.totalReturnPct));
  if (c.stability) {
    console.log("    metade antiga " + c.stability.firstWinRate + "% -> metade recente " + c.stability.secondWinRate + "% (" + c.stability.verdict + ")");
  }
  if (c.netDelta) {
    console.log("    Net Delta subindo: " + c.netDelta.rising.winRate + "% em " + c.netDelta.rising.samples +
      " | caindo: " + c.netDelta.falling.winRate + "% em " + c.netDelta.falling.samples);
  }
}

function printSide(result, minSamples, top) {
  const b = result.baseline;
  console.log("== " + result.side + " ==");
  if (!b.samples) { console.log("  (nenhum sinal resolvido desse lado ainda)\n"); return; }
  console.log("  Base (todo sinal " + result.side + "): " + b.samples + " sinais | acerto " + b.winRate +
    "% | retorno médio " + fmtPct(b.avgReturnPct) + " | total " + fmtPct(b.totalReturnPct));
  console.log("");

  const ranked = result.combos.filter(c => c.samples >= minSamples);
  if (!ranked.length) {
    console.log("  (nenhuma combinação com pelo menos " + minSamples + " sinais ainda — use --min menor)\n");
    return;
  }

  const best = ranked.slice().sort((a, z) => z.wilsonLow - a.wilsonLow).slice(0, top);
  console.log("  --- Melhores combinações (ranking pelo piso confiável, não pelo acerto cru) ---");
  for (const c of best) printCombo(c, b);

  const worst = ranked.slice().sort((a, z) => a.wilsonLow - z.wilsonLow).slice(0, Math.min(4, top));
  console.log("");
  console.log("  --- Piores (evitar quando aparecem sozinhas) ---");
  for (const c of worst) printCombo(c, b);
  console.log("");
}

module.exports = { wilsonLower, enumerateSubsets, statsOf, stabilityOf, netDeltaSplitOf, mineCombos, analyze, comboLabel };

/* Runnable directly: `node src/analyze-combos.js` (or `npm run analyze:combos`). */
if (require.main === module) {
  const arg = (name, dflt) => {
    const a = process.argv.find(x => x.startsWith("--" + name + "="));
    return a ? a.slice(name.length + 3) : dflt;
  };
  const minSamples = Math.max(1, parseInt(arg("min", "15"), 10) || 15);
  const top = Math.max(1, parseInt(arg("top", "8"), 10) || 8);
  const onlySide = arg("side", "").toUpperCase();

  const r = analyze();
  console.log("Análise avançada de combinações — " + r.total + " sinais resolvidos no total");
  console.log("(superset: um sinal conta pra combinação se TODOS os blocos dela estavam ativos, com ou sem outros junto)");
  console.log("");
  if (onlySide !== "SHORT") printSide(r.LONG, minSamples, top);
  if (onlySide !== "LONG") printSide(r.SHORT, minSamples, top);
  console.log("Como ler: 'piso confiável' é o pior acerto que dá pra afirmar com 95% de confiança dado o tamanho da amostra —");
  console.log("uma combinação 3/3 (100% cru) tem piso ~44%, então NÃO passa na frente de uma 52/80 (65% cru, piso ~54%).");
  console.log("'piorando' = acertava na metade antiga dos dados e parou de acertar na recente: padrão possivelmente morto.");
}
