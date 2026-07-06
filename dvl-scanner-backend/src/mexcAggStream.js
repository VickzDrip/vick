"use strict";

/* ── MEXC live trade-stream relay ──────────────────────────────────
   Fast Bots' Bot 4 (frontend) needs MEXC's live aggressive-trade feed to
   react within seconds, but a browser connecting straight to MEXC's own
   WebSocket (wss://contract.mexc.com/ws) never stays connected in
   production (same class of problem the REST endpoints in server.js
   already work around) — every browser client gets its trades relayed
   over OUR OWN WebSocket endpoint instead (server.js's "/ws/dvl/agg"),
   so nothing in the browser ever talks to contract.mexc.com directly.

   This module holds the ONE connection to MEXC that everything else
   depends on. It went through two failed designs before this one, all
   confirmed via this module's own logging in production (nothing here
   could be verified live from the sandbox this was built in — see the
   confidence note below):
     1) A plain `ws` client hit "Unexpected server response: 301" — MEXC's
        WS answers the handshake with an HTTP redirect. Fixed by
        following it (followRedirects), which surfaced —
     2) — a 403 from Akamai's edge/bot-protection sitting in front of the
        real WS gateway (visible via the "akamai-grn"/"server-timing:
        cdn-cache" response headers this module logged) — a raw Node.js
        WebSocket client's TLS/HTTP fingerprint gets blocked before it
        ever reaches MEXC's own server, no matter what headers are added
        on top of it.
   So this module runs a headless Chromium tab (Playwright) and opens the
   WebSocket from INSIDE that real browser's network stack instead of
   Node's — that's the only way ever to look like an actual browser to
   Akamai. The browser tab first navigates to mexc.com itself (picking up
   whatever cookies/session context a real visit would) before opening
   the WS, then bridges every message back to Node via
   page.exposeFunction(). Re-launching a whole browser process is far more
   expensive than a raw WS reconnect, so failures are handled in two
   tiers: if just the WS drops but the page/browser are still alive, only
   the in-page WebSocket is reconnected (reconnectWs); the browser itself
   is only relaunched if the page/browser process itself dies.

   Subscribes to MEXC's own "sub.deal" channel for whatever
   worker.getCandidates("mexc") currently considers the top-by-volume
   universe (same list /api/dvl/scanner/tickers exposes) — capped at
   MAX_SYMBOLS. Re-subscribes (only the newly-added symbols, additively)
   each time that candidate list is checked; a fresh WS connection always
   starts a clean subscription set.

   NOTE on confidence: the REST shapes elsewhere in this backend
   (exchanges.js) are proven in production. This WS message shape
   (channel "push.deal", data.T 1=buy/2=sell) is implemented from
   best-available documentation and verified here only against a mocked
   MEXC-shaped server in tests, run over a real local browser tab — not
   MEXC's actual push.deal payload, which nothing in this sandbox can
   reach. Watch the logs after deploy: an open connection with zero
   trades ever parsed, or "unrecognized message" log lines, would mean
   this shape is off. */

const { chromium } = require("playwright");
const worker = require("./worker");

const WS_RECONNECT_MS = 5000;     // just re-opens the WS inside the same page — cheap, can retry often
const BROWSER_RELAUNCH_MS = 20000; // relaunches the whole Chromium process — expensive, back off more
const RESUBSCRIBE_CHECK_MS = 10000;
const MAX_SYMBOLS = 100;
/* about:blank, not a real mexc.com page: the Akamai fingerprint check this
   module works around is a property of the BROWSER PROCESS's own TLS/HTTP
   stack, not of what page happened to load first — but a real mexc.com
   page comes with its OWN Content-Security-Policy, which could block our
   script's own WebSocket connect-src as a same-origin-policy violation
   before the request even leaves the browser. Not worth the risk for a
   benefit (session cookies) this module doesn't need anyway. */
const DEFAULT_NAV_URL = "about:blank";
const DEFAULT_WS_URL = "wss://contract.mexc.com/ws";

let _browser = null;
let _page = null;
let _wsReconnectTimer = null;
let _browserRelaunchTimer = null;
let _resubTimer = null;
let _heartbeatTimer = null;
let _subscribed = [];
let _connected = false;
let _onTrade = () => {};
let _getSymbols = () => worker.getCandidates("mexc").map(c => c.sym);
let _navUrl = DEFAULT_NAV_URL;
let _wsUrl = DEFAULT_WS_URL;
let _launchOptions = { headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] };
let _wsReconnectMs = WS_RECONNECT_MS;
let _browserRelaunchMs = BROWSER_RELAUNCH_MS;
let _started = false;
let _tradesSeen = 0;
let _unknownLogged = 0;
let _log = true;

function log() { if (_log) console.log.apply(console, ["[mexcAggStream]"].concat(Array.prototype.slice.call(arguments))); }

/* onTrade and every field of opts are injectable so tests can run this
   against a local mock WS server + fake candidate list (with fast
   reconnect intervals and a blank navigateUrl) instead of the real MEXC
   connection and worker.js's live scan cycle. */
function start(onTrade, opts) {
  if (_started) return;
  _started = true;
  opts = opts || {};
  _onTrade = typeof onTrade === "function" ? onTrade : () => {};
  if (typeof opts.getSymbols === "function") _getSymbols = opts.getSymbols;
  if (opts.navigateUrl) _navUrl = opts.navigateUrl;
  if (opts.wsUrl) _wsUrl = opts.wsUrl;
  if (opts.launchOptions) _launchOptions = opts.launchOptions;
  if (opts.wsReconnectMs) _wsReconnectMs = opts.wsReconnectMs;
  if (opts.browserRelaunchMs) _browserRelaunchMs = opts.browserRelaunchMs;
  if (opts.quiet) _log = false;
  launchBrowser().catch(e => log("initial launch failed:", e && e.message));
  _resubTimer = setInterval(() => { maybeResubscribe().catch(() => {}); }, opts.resubscribeMs || RESUBSCRIBE_CHECK_MS);
  _heartbeatTimer = setInterval(() => {
    log("heartbeat — connected:", _connected, "subscribed:", _subscribed.length, "tradesSeen:", _tradesSeen);
  }, 30000);
}

async function stop() {
  _started = false;
  clearInterval(_resubTimer);
  clearInterval(_heartbeatTimer);
  clearTimeout(_wsReconnectTimer);
  clearTimeout(_browserRelaunchTimer);
  try { if (_browser) await _browser.close(); } catch (_) { /* ignore */ }
  _browser = null;
  _page = null;
  _connected = false;
  _subscribed = [];
  _navUrl = DEFAULT_NAV_URL;
  _wsUrl = DEFAULT_WS_URL;
  _wsReconnectMs = WS_RECONNECT_MS;
  _browserRelaunchMs = BROWSER_RELAUNCH_MS;
  _getSymbols = () => worker.getCandidates("mexc").map(c => c.sym);
  _log = true;
}

/* Tier 2 (expensive): launches a fresh headless Chromium + page, wires up
   the Node<->page message bridge ONCE for this page's lifetime, then
   opens the WS inside it. Only called at startup or if the page/browser
   itself dies — a dropped WS alone is handled by reconnectWs() below,
   which reuses the same page. */
async function launchBrowser() {
  if (!_started) return;
  try { if (_browser) await _browser.close(); } catch (_) { /* ignore */ }
  _browser = null; _page = null; _connected = false; _subscribed = [];
  log("launching headless Chromium");
  try {
    const browser = await chromium.launch(_launchOptions);
    const page = await browser.newPage();
    _browser = browser;
    _page = page;

    await page.exposeFunction("__mexcOnOpen", () => {
      _connected = true;
      log("connected (in-page WS open)");
      maybeResubscribe().catch(() => {});
    });
    await page.exposeFunction("__mexcOnClose", (code, reason) => {
      _connected = false;
      log("in-page WS closed — code:", code, "reason:", reason);
      scheduleWsReconnect();
    });
    await page.exposeFunction("__mexcOnError", (msg) => { log("in-page WS error:", msg); });
    await page.exposeFunction("__mexcOnMessage", (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch (_) { return; }
      if (!msg || msg.channel !== "push.deal" || !msg.symbol || !msg.data) {
        if (_unknownLogged < 5) { _unknownLogged++; log("unrecognized message:", String(raw).slice(0, 500)); }
        return;
      }
      const price = Number(msg.data.p), qty = Number(msg.data.v);
      if (!(price > 0) || !(qty > 0)) return;
      _tradesSeen++;
      _onTrade({ symbol: String(msg.symbol).toUpperCase(), price, qty, buy: Number(msg.data.T) === 1 });
    });

    page.on("close", () => { _connected = false; log("page closed"); scheduleBrowserRelaunch(); });
    page.on("crash", () => { _connected = false; log("page crashed"); scheduleBrowserRelaunch(); });
    /* Our own ws.onerror inside the page only ever gets a generic "error
       event" (that's all browsers expose to JS per spec) — Chromium's own
       network layer knows the REAL reason (ERR_CONNECTION_RESET,
       ERR_SSL_PROTOCOL_ERROR, ERR_BLOCKED_BY_CLIENT, ERR_NAME_NOT_RESOLVED,
       ...) and Playwright can surface it via requestfailed. This is the
       only way left to see WHY the handshake actually failed once it's no
       longer a plain HTTP status code (301/403) to read off a response. */
    page.on("requestfailed", (req) => {
      var failure = req.failure();
      log("page requestfailed:", req.url(), "-", failure && failure.errorText);
    });
    page.on("pageerror", (err) => { log("page JS error:", err && err.message); });
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") log("page console." + msg.type() + ":", msg.text());
    });

    try {
      await page.goto(_navUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch (e) {
      log("navigation to", _navUrl, "failed (continuing anyway):", e && e.message);
    }

    await reconnectWs();
  } catch (e) {
    /* Any failure anywhere above (missing browser binary, OOM, a page
       method throwing, ...) must still retry — otherwise one bad attempt
       (e.g. right after a fresh install before `npx playwright install`
       has run) leaves this permanently disconnected with nothing ever
       trying again. */
    log("launch failed:", e && e.message);
    try { if (_browser) await _browser.close(); } catch (_) { /* ignore */ }
    _browser = null; _page = null;
    scheduleBrowserRelaunch();
  }
}

/* Tier 1 (cheap): (re)opens the WebSocket inside the ALREADY-open page —
   no new browser process, just a fresh `new WebSocket(...)` in the page's
   own JS context. This is what actually runs on every reconnect; a full
   launchBrowser() only happens if the page itself is gone. */
async function reconnectWs() {
  if (!_started || !_page) return;
  try {
    await _page.evaluate((wsUrl) => {
      try { if (window.__mexcWs) window.__mexcWs.close(); } catch (_) { /* ignore */ }
      var ws = new WebSocket(wsUrl);
      window.__mexcWs = ws;
      ws.onopen = function () { window.__mexcOnOpen(); };
      ws.onclose = function (ev) { window.__mexcOnClose(ev.code, ev.reason); };
      ws.onerror = function () { window.__mexcOnError("error event"); };
      ws.onmessage = function (ev) { window.__mexcOnMessage(ev.data); };
      if (window.__mexcPingTimer) clearInterval(window.__mexcPingTimer);
      window.__mexcPingTimer = setInterval(function () {
        try { if (ws.readyState === 1) ws.send(JSON.stringify({ method: "ping" })); } catch (_) { /* ignore */ }
      }, 15000);
    }, _wsUrl);
  } catch (e) {
    log("reconnectWs eval failed (page likely gone):", e && e.message);
    scheduleBrowserRelaunch();
  }
}

function scheduleWsReconnect() {
  if (!_started) return;
  clearTimeout(_wsReconnectTimer);
  _wsReconnectTimer = setTimeout(() => { reconnectWs().catch(() => {}); }, _wsReconnectMs);
}

function scheduleBrowserRelaunch() {
  if (!_started) return;
  clearTimeout(_browserRelaunchTimer);
  _browserRelaunchTimer = setTimeout(() => { launchBrowser().catch(e => log("relaunch failed:", e && e.message)); }, _browserRelaunchMs);
}

/* Additive: only sub.deal's symbols not already subscribed this WS
   connection — MEXC's own idempotency for repeat subscribes is untested,
   so avoiding resending known ones is the safer default either way. */
async function maybeResubscribe() {
  if (!_page || !_connected) return;
  const cands = (_getSymbols() || []).filter(Boolean).slice(0, MAX_SYMBOLS);
  const known = new Set(_subscribed);
  const fresh = cands.filter(s => !known.has(s));
  if (!fresh.length) {
    if (!cands.length) log("no MEXC candidates available yet from worker.getCandidates — nothing to subscribe to");
    return;
  }
  log("subscribing to", fresh.length, "new symbol(s), e.g.", fresh.slice(0, 5).join(","));
  try {
    await _page.evaluate((syms) => {
      var ws = window.__mexcWs;
      if (!ws || ws.readyState !== 1) return;
      syms.forEach(function (sym) {
        ws.send(JSON.stringify({ method: "sub.deal", param: { symbol: sym } }));
      });
    }, fresh);
    _subscribed = _subscribed.concat(fresh);
  } catch (e) {
    log("subscribe eval failed:", e && e.message);
  }
}

function isConnected() { return _connected; }
function getSubscribed() { return _subscribed.slice(); }

module.exports = { start, stop, isConnected, getSubscribed };
