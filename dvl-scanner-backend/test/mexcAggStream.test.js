"use strict";

/* Offline test for mexcAggStream.js — no network. Spins up a local
   MEXC-shaped fake WebSocket server (accepts sub.deal, responds to ping,
   pushes push.deal messages) and points the module at it via its
   injectable url/getSymbols params, so this exercises the exact same
   connect/subscribe/parse/reconnect code path production uses, just
   against a stand-in instead of the real contract.mexc.com. */

const assert = require("assert");
const { WebSocketServer } = require("ws");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + JSON.stringify(actual) + ", want " + JSON.stringify(expected) + ")"); }
}

async function main() {
  const stream = require("../src/mexcAggStream");

  const wss = new WebSocketServer({ port: 0 });
  await new Promise(resolve => wss.once("listening", resolve));
  const port = wss.address().port;
  const url = "ws://127.0.0.1:" + port;

  let serverSocket = null;
  const subMessages = [];
  wss.on("connection", (ws) => {
    serverSocket = ws;
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg && msg.method === "sub.deal") subMessages.push(msg.param.symbol);
      } catch (_) { /* ignore */ }
    });
  });

  const trades = [];
  let symbols = ["BTC_USDT", "ETH_USDT"];
  stream.start(
    (trade) => trades.push(trade),
    { getSymbols: () => symbols, url, resubscribeMs: 100, reconnectMs: 100, quiet: true }
  );

  /* 1) Connects and subscribes to the initial candidate list. */
  await new Promise(resolve => setTimeout(resolve, 300));
  ok(stream.isConnected(), "connects to the (fake) MEXC WS server");
  eq(subMessages.slice().sort().join(","), "BTC_USDT,ETH_USDT", "subscribes to the initial candidate symbols via sub.deal");
  eq(stream.getSubscribed().slice().sort().join(","), "BTC_USDT,ETH_USDT", "getSubscribed() reflects what was actually subscribed");

  /* 2) A push.deal message is parsed into the normalized trade shape. */
  serverSocket.send(JSON.stringify({ channel: "push.deal", symbol: "BTC_USDT", data: { p: 106.5, v: 12, T: 1 } }));
  await new Promise(resolve => setTimeout(resolve, 50));
  eq(trades.length, 1, "one push.deal message produces one onTrade call");
  eq(trades[0].symbol, "BTC_USDT", "trade carries the MEXC symbol as-is (underscore preserved)");
  eq(trades[0].price, 106.5, "trade carries the parsed price");
  eq(trades[0].qty, 12, "trade carries the parsed quantity");
  eq(trades[0].buy, true, "data.T===1 maps to buy:true");

  serverSocket.send(JSON.stringify({ channel: "push.deal", symbol: "ETH_USDT", data: { p: 10, v: 3, T: 2 } }));
  await new Promise(resolve => setTimeout(resolve, 50));
  eq(trades[1].buy, false, "data.T===2 maps to buy:false");

  /* 3) A malformed / irrelevant message is ignored, not thrown. */
  serverSocket.send(JSON.stringify({ channel: "push.ticker", symbol: "BTC_USDT", data: {} }));
  serverSocket.send("not json");
  await new Promise(resolve => setTimeout(resolve, 50));
  eq(trades.length, 2, "non-push.deal / malformed messages are silently ignored");

  /* 4) Resubscribing with an unchanged symbol list sends nothing new — the
     100ms resubscribeMs from start() above means at least one resubscribe
     tick has already fired by now. */
  subMessages.length = 0;
  await new Promise(resolve => setTimeout(resolve, 150));
  eq(subMessages.length, 0, "an unchanged candidate list resubscribes nothing new");

  /* 5) Growing the candidate list only sends the NEW symbol (additive). */
  symbols = ["BTC_USDT", "ETH_USDT", "SOL_USDT"];
  await new Promise(resolve => setTimeout(resolve, 150));
  eq(subMessages.join(","), "SOL_USDT", "growing the candidate list only sub.deal's the newly-added symbol");
  eq(stream.getSubscribed().slice().sort().join(","), "BTC_USDT,ETH_USDT,SOL_USDT", "getSubscribed() grows to include the new symbol");

  /* 6) Server-side close triggers a reconnect (new client connection). */
  const reconnected = new Promise(resolve => wss.once("connection", resolve));
  serverSocket.close();
  await reconnected;
  await new Promise(resolve => setTimeout(resolve, 150));
  ok(stream.isConnected(), "reconnects after the server drops the connection");

  stream.stop();
  wss.close();

  console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
