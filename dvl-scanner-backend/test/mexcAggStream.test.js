"use strict";

/* Offline test for mexcAggStream.js — no real network to MEXC. Runs a
   REAL headless Chromium tab (this module's whole point is opening the
   WebSocket from inside an actual browser, not Node's own TLS stack —
   see the module doc-comment), pointed at a local HTTP page + a local
   MEXC-shaped fake WebSocket server via the injectable navigateUrl/wsUrl
   options, so this exercises the exact browser-launch / page-bridge /
   subscribe / parse / reconnect code path production uses, just against
   loopback stand-ins instead of mexc.com and contract.mexc.com. */

const http = require("http");
const { WebSocketServer } = require("ws");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + JSON.stringify(actual) + ", want " + JSON.stringify(expected) + ")"); }
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitUntil(fn, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (fn()) return true;
    await wait(50);
  }
  return false;
}

async function main() {
  const stream = require("../src/mexcAggStream");

  const httpServer = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end("<html><body>ok</body></html>"); });
  await new Promise(resolve => httpServer.listen(0, resolve));
  const httpPort = httpServer.address().port;
  const navigateUrl = "http://127.0.0.1:" + httpPort + "/";

  const wss = new WebSocketServer({ port: 0 });
  await new Promise(resolve => wss.once("listening", resolve));
  const wsPort = wss.address().port;
  const wsUrl = "ws://127.0.0.1:" + wsPort;

  let serverSocket = null;
  const subMessages = [];
  wss.on("connection", (ws) => {
    serverSocket = ws;
    subMessages.length = 0;
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg && msg.method === "sub.deal") subMessages.push(msg.param.symbol);
      } catch (_) { /* ignore */ }
    });
  });

  const launchOptions = {
    headless: true,
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  };

  const trades = [];
  let symbols = ["BTC_USDT", "ETH_USDT"];
  stream.start(
    (trade) => trades.push(trade),
    {
      getSymbols: () => symbols,
      navigateUrl, wsUrl, launchOptions,
      resubscribeMs: 150, wsReconnectMs: 200, browserRelaunchMs: 300,
      quiet: true
    }
  );

  /* 1) Launches Chromium, navigates, opens the in-page WS, subscribes to
     the initial candidate list. Browser launch + navigation takes real
     wall-clock time, unlike the previous raw-ws version. */
  const connected = await waitUntil(() => stream.isConnected(), 15000);
  ok(connected, "connects (from inside the headless browser) within 15s");
  const subscribedInitially = await waitUntil(() => subMessages.length >= 2, 3000);
  ok(subscribedInitially, "subscribes to the initial candidate symbols via sub.deal");
  eq(subMessages.slice().sort().join(","), "BTC_USDT,ETH_USDT", "sub.deal messages match the injected candidate list");
  /* getSubscribed() updates only after maybeResubscribe()'s own
     page.evaluate() promise resolves back in Node, which can trail the
     server actually receiving the sub.deal packet by a few ms (two
     different async completions of the same round trip) — poll instead
     of asserting immediately to avoid a timing-flaky test. */
  await waitUntil(() => stream.getSubscribed().length >= 2, 2000);
  eq(stream.getSubscribed().slice().sort().join(","), "BTC_USDT,ETH_USDT", "getSubscribed() reflects what was actually subscribed");

  /* 2) A push.deal message pushed from the fake server is parsed into the
     normalized trade shape, round-tripped through the real page. */
  serverSocket.send(JSON.stringify({ channel: "push.deal", symbol: "BTC_USDT", data: { p: 106.5, v: 12, T: 1 } }));
  await waitUntil(() => trades.length >= 1, 2000);
  eq(trades.length, 1, "one push.deal message produces one onTrade call");
  eq(trades[0].symbol, "BTC_USDT", "trade carries the MEXC symbol as-is (underscore preserved)");
  eq(trades[0].price, 106.5, "trade carries the parsed price");
  eq(trades[0].qty, 12, "trade carries the parsed quantity");
  eq(trades[0].buy, true, "data.T===1 maps to buy:true");

  serverSocket.send(JSON.stringify({ channel: "push.deal", symbol: "ETH_USDT", data: { p: 10, v: 3, T: 2 } }));
  await waitUntil(() => trades.length >= 2, 2000);
  eq(trades[1].buy, false, "data.T===2 maps to buy:false");

  /* 3) A malformed / irrelevant message is ignored, not thrown. */
  serverSocket.send(JSON.stringify({ channel: "push.ticker", symbol: "BTC_USDT", data: {} }));
  serverSocket.send("not json");
  await wait(300);
  eq(trades.length, 2, "non-push.deal / malformed messages are silently ignored");

  /* 4) Growing the candidate list only sub.deal's the NEW symbol
     (additive), on the next resubscribe tick. */
  subMessages.length = 0;
  symbols = ["BTC_USDT", "ETH_USDT", "SOL_USDT"];
  const gotNewSub = await waitUntil(() => subMessages.indexOf("SOL_USDT") >= 0, 2000);
  ok(gotNewSub, "growing the candidate list sub.deal's the newly-added symbol");
  eq(subMessages.join(","), "SOL_USDT", "only the new symbol is resubscribed, not the whole list again");
  await waitUntil(() => stream.getSubscribed().length >= 3, 2000);
  eq(stream.getSubscribed().slice().sort().join(","), "BTC_USDT,ETH_USDT,SOL_USDT", "getSubscribed() grows to include the new symbol");

  /* 5) Server-side close triggers a WS-level reconnect — same page/browser
     reused, just a fresh in-page WebSocket (this module's whole point is
     NOT relaunching Chromium for an ordinary drop). */
  const reconnected = new Promise(resolve => wss.once("connection", resolve));
  serverSocket.close();
  await reconnected;
  const reconnectedOk = await waitUntil(() => stream.isConnected(), 5000);
  ok(reconnectedOk, "reconnects (in-page WS) after the server drops the connection");

  await stream.stop();
  await new Promise(resolve => httpServer.close(resolve));
  wss.close();

  console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
