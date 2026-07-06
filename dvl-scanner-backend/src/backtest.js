"use strict";

/* ── Financial backtest — did the model actually make more money? ──────
   train.js/tree.js already report ACCURACY (did the predicted direction
   match the outcome) on a temporal holdout. That answers "is the model
   right more often than not", but says nothing about MAGNITUDE — a model
   that's right 55% of the time on trades that lose big when wrong is
   worse than one that's right 50% of the time on trades with a tight
   stop and a generous target. This module answers the money question
   instead: on the exact same held-out examples, what would the win rate
   and average/total return have been for (a) every signal, (b) only the
   signals the logistic model called favorable, and (c) only the signals
   the tree called favorable?

   Deliberately re-fits fresh logistic + tree models here rather than
   reusing train.js's persisted learned-weights.json: that file is only
   updated every MIN_NEW_SAMPLES-examples cycle and could be stale (fit on
   an older/smaller split) relative to whatever's in the log right now.
   Re-fitting is the same sub-second operation trainSide() already does on
   every maybeTrain() call, so the cost of always being current is
   negligible. This module only reads the log and fits in memory — it
   never writes learned-weights.json or otherwise affects the live model
   trainSide()/maybeTrain() persist. */

const train = require("./train");
const tree = require("./tree");

function round3(x) { return Math.round(x * 1000) / 1000; }

/* `examples`: [{features, label, finalReturnPct, at}]. `finalReturnPct` is
   already side-adjusted (favorable = positive) by outcomes.js's resolve(),
   so a plain average is directly comparable across LONG and SHORT. */
function statsFor(examples) {
  const count = examples.length;
  if (!count) return { count: 0, winRate: 0, avgReturnPct: 0, totalReturnPct: 0 };
  let wins = 0, totalReturn = 0;
  for (const e of examples) {
    if (e.label === 1) wins++;
    totalReturn += e.finalReturnPct || 0;
  }
  return {
    count,
    winRate: round3(wins / count),
    avgReturnPct: round3(totalReturn / count),
    totalReturnPct: round3(totalReturn)
  };
}

/* Same temporal split/fit methodology as train.js's trainSide (see its
   doc-comment): fit only on the oldest ~80%, evaluate strictly on the
   newest ~20%, which never leaks into either fit. The three buckets below
   share that exact same test set — this is an apples-to-apples comparison
   of "trade everything" vs "trade only what the model likes", not two
   different samples. */
function backtestSide(side) {
  const examples = train.loadExamples(side);
  if (examples.length < train.MIN_SAMPLES) {
    return { ready: false, side, samples: examples.length, needed: train.MIN_SAMPLES };
  }

  const { train: trainSet, test: testSet } = train.splitTemporal(examples, train.TEST_FRACTION);

  const { w, b } = train.fit(trainSet);
  const logisticFavorable = testSet.filter(e => {
    let z = b;
    for (let i = 0; i < w.length; i++) z += e.features[i] * w[i];
    return 1 / (1 + Math.exp(-z)) >= 0.5;
  });

  const treeOpts = {
    maxDepth: 4,
    minSamplesSplit: Math.max(20, Math.round(trainSet.length * 0.03)),
    minSamplesLeaf: Math.max(10, Math.round(trainSet.length * 0.015))
  };
  const treeModel = tree.fit(trainSet, train.FEATURE_KEYS, treeOpts);
  const treeFavorable = testSet.filter(e => tree.predictProb(treeModel.root, e.features) >= 0.5);

  return {
    ready: true,
    side,
    samples: examples.length,
    trainSamples: trainSet.length,
    testSamples: testSet.length,
    labelMethod: "triple-barrier-atr",
    allSignals: statsFor(testSet),
    logisticModel: statsFor(logisticFavorable),
    treeModel: statsFor(treeFavorable)
  };
}

/* LONG only — see train.js's doc-comment for why SHORT was removed from
   training entirely (its own backtest numbers were part of what confirmed
   the thesis mismatch: SHORT signals lost money on average). */
function backtest() {
  return { LONG: backtestSide("LONG") };
}

module.exports = { statsFor, backtestSide, backtest };

/* Runnable directly: `node src/backtest.js`. */
if (require.main === module) {
  console.log(JSON.stringify(backtest(), null, 2));
}
