"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const TMP = path.join(os.tmpdir(), "paper-bot-test-" + process.pid + ".json");
process.env.DVL_BOT_STATE_FILE = TMP;
try { fs.unlinkSync(TMP); } catch (_) { }
const bot = require("../src/paperBot");

// a combo the bot will trade: long, window/val, prox 1, sl 1, rsi ≤ 40, POC target
const combo = { side: "long", session: "window", zone: "val", prox: 1.0, sl: 1.0, rsiThresh: 40, tpMode: "poc", tpAtr: 0 };
const models = { "1m": { ready: true, long: { best: combo }, short: { best: null } }, "5m": { ready: false } };

function winSample(t, sym) {
  return { symbol: sym || "AAAUSDT", tf: "1m", side: "long", entry: 100, atr: 1, qv: 1e8, pivotRsi: 30, time: t,
    dist: { window: { val: 0.2, poc: -2.0, vah: -3.0, pocAtr: 2.0 } }, path: [[2.2, 0.3, 2.1]] };
}
function loseSample(t, sym) {
  return Object.assign(winSample(t, sym), { path: [[0.1, -1.6, -1.5]] });
}

// a fake store
function makeStore(samples) { return { samplesFor: function (tf) { return samples.filter(s => s.tf === tf); } }; }

(function testWalkForwardSkipsBackfillThenTrades() {
  bot.reset(1000);
  // first tick: only historical samples → cursor jumps to newest, books nothing
  const hist = [winSample(1000), winSample(2000), winSample(3000)];
  const n0 = bot.tick(makeStore(hist), models, { riskPct: 0.01 });
  assert.strictEqual(n0, 0, "first run skips the backfill, got " + n0);
  let st = bot.status();
  assert.strictEqual(st.trades, 0, "no trades from backfill");

  // now NEW samples arrive after the cursor → they get traded
  const forward = hist.concat([winSample(4000, "AAAUSDT"), winSample(5000, "BBBUSDT"), loseSample(6000, "AAAUSDT")]);
  const n1 = bot.tick(makeStore(forward), models, { riskPct: 0.01, cost: { feeTakerPerSide: 0.0004, slipAtrPerSide: 0.03 } });
  assert.strictEqual(n1, 3, "traded the 3 new setups, got " + n1);
  st = bot.status();
  assert.strictEqual(st.trades, 3, "3 closed trades");
  assert(st.wins === 2 && st.losses === 1, "2 wins 1 loss, got " + st.wins + "/" + st.losses);
  assert(st.account !== 1000, "account moved");
  assert(st.avgCostAtr > 0, "fees+slippage applied");
  assert(st.leaderboard.length === 2, "two symbols on the leaderboard");
  const top = st.leaderboard[0];
  assert(top.symbol && top.trades > 0, "leaderboard has per-asset stats");
  console.log("  account:", st.account, "win%:", st.winRate, "leaderboard:", st.leaderboard.map(x => x.symbol + ":" + x.pnl).join(", "));
})();

(function testNoComboNoTrade() {
  bot.reset(1000);
  const noModels = { "1m": { ready: false }, "5m": { ready: false } };
  bot.tick(makeStore([winSample(1000)]), noModels, {});          // seeds cursor
  const n = bot.tick(makeStore([winSample(1000), winSample(2000)]), noModels, {});
  assert.strictEqual(n, 0, "no learned combo → no trades");
})();

(function testRespectsFilter() {
  bot.reset(1000);
  bot.tick(makeStore([winSample(1000)]), models, {});            // seed cursor at 1000
  // a sample with pivotRsi 60 (> 40) must NOT be traded (fails the RSI filter)
  const bad = Object.assign(winSample(2000), { pivotRsi: 60 });
  const n = bot.tick(makeStore([winSample(1000), bad]), models, {});
  assert.strictEqual(n, 0, "filtered out by RSI threshold, got " + n);
})();

try { fs.unlinkSync(TMP); } catch (_) { }
console.log("paperBot.test.js OK");
