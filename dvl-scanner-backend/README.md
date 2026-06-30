# DVL Scanner Backend (24h)

Server-side worker that scans Binance + MEXC futures **24h**, computes the
DVL volume-spike signals, and serves a ready-to-render snapshot over REST +
a live WebSocket feed. The phone/HTML only renders — it no longer scans 100
assets itself.

```
Binance/MEXC REST  ──►  24h worker  ──►  in-memory snapshot  ──►  REST /api/dvl/scanner/snapshot
                                                            └──►  WS  /ws/dvl/scanner  (live updates)
```

The signal math (`sma`, `priceMaGlueStats`, `computeSignal`, `score`,
`statusOf`, OI/LSR derivation) is a faithful port of the in-page scanner in
`public/index.html`, so the backend output matches what the client renders.

> **Read-only.** This process never places or routes trades.
> `DVL_BOT_EXECUTION_ALLOWED / DVL_AI_AUTO_TRADE_ALLOWED /
> DVL_COPILOT_AUTO_ORDER_ALLOWED` are hard-locked to `false`; the process
> refuses to start otherwise.

## Why Node, no Redis
The signal formulas already exist in JS — porting them to Node keeps the
output identical (Python would risk subtle drift). A single process holding
the snapshot in memory is plenty for a few hundred symbols; Redis would add
ops overhead with no benefit at this scale.

## Endpoints
- `GET /api/dvl/scanner/snapshot?exchange=binance|mexc` → snapshot JSON
- `GET /api/dvl/scanner/health` → row counts, freshness, safety flags
- `WS  /ws/dvl/scanner?exchange=binance|mexc` → sends the snapshot on
  connect, then `{type:"scanner:update", exchange, updatedAt, fallback,
  activeSource, rows}` whenever the ranking/score/status/side/OI/LSR/RSI
  changes.

If Binance is unreachable from the server, the `binance` snapshot falls back
to MEXC data and reports `{ fallback: true, activeSource: "mexc" }`.

## Run locally
```bash
cd dvl-scanner-backend
npm install
npm test          # offline parity test (no network)
npm start         # starts worker + server on :8090
# curl http://localhost:8090/api/dvl/scanner/snapshot?exchange=binance
```

## Deploy on the Hetzner VPS (Ubuntu, where nginx already runs)
```bash
# 1. Get the code onto the VPS (clone the repo or copy this folder) to:
sudo mkdir -p /opt/dvl-scanner-backend
# ...copy the dvl-scanner-backend/ contents there...
cd /opt/dvl-scanner-backend
sudo npm install --omit=dev
sudo chown -R www-data:www-data /opt/dvl-scanner-backend

# 2. Install the systemd service (keeps it running 24h, auto-restart, boot):
sudo cp deploy/dvl-scanner.service /etc/systemd/system/dvl-scanner.service
sudo systemctl daemon-reload
sudo systemctl enable --now dvl-scanner
sudo systemctl status dvl-scanner          # should be "active (running)"
curl http://127.0.0.1:8090/api/dvl/scanner/health

# 3. Expose it through nginx (same server block that has /mexc-proxy/):
#    paste deploy/nginx-dvl-scanner.conf's two location blocks, then:
sudo nginx -t && sudo systemctl reload nginx
curl https://depthvisionlab.com/api/dvl/scanner/health
```

## Point the site at the backend
The HTML ships an opt-in bridge (`DVL_SCANNER_LIVE_FEED_BRIDGE_1023`) that is
**inert until you give it a URL**. Once the backend answers on the same
domain, enable it from the browser console (persists in localStorage):

```js
DVL_SCANNER_LIVE_FEED_BRIDGE_1023.enable("");   // same-origin (recommended)
// or an absolute base if hosted elsewhere:
DVL_SCANNER_LIVE_FEED_BRIDGE_1023.enable("https://depthvisionlab.com");
DVL_SCANNER_LIVE_FEED_BRIDGE_1023.audit();      // check status
DVL_SCANNER_LIVE_FEED_BRIDGE_1023.disable();    // back to in-browser scanning
```

When enabled, opening the Scanner shows the server snapshot **instantly** and
the phone stops scanning; live updates arrive over WebSocket. If the backend
is unreachable, the bridge stays inactive and the existing in-browser scanner
keeps working exactly as before.

## Snapshot shape
```jsonc
{
  "version": "1.0",
  "exchange": "binance",
  "activeSource": "binance",   // "mexc" when binance fell back
  "fallback": false,
  "updatedAt": 1710000000000,
  "window": "24h",
  "rows": [{
    "symbol": "SOLUSDT", "price": 162.34, "var24h": 7.21, "side": "LONG",
    "spike20": 2.8, "spike50": 1.9, "flatCandles": 6, "barPct": 1.42,
    "prevVolBelowHalf": true, "priceGlueOk": true,
    "spikeScore": 92, "status": "Spike pós-flat", "spikeAt": 1710000000000,
    "rsi14": 62.8, "oi": "up", "lsr": "up",
    "tfOrigin": "15m", "tfConfirm": "1h", "contextTf": "4h",
    "candles": [{ "open":160.1,"high":161.4,"low":159.8,"close":161.2,"volume":1200,"time":1710000000000 }],
    "last5Closes": [160.1,160.8,161.2,161.9,162.3],
    "factors": { "vt":"good","sz":"good","cs":"wait","oi":"good","ls":"good","ex":"wait" }
  }]
}
```

## Notes / next steps
- `oi`, `lsr` and `factors` are **derived** from the same metrics the in-page
  Pro table already derives them from (so the columns match today). Wiring
  *real* per-symbol Open-Interest / Long-Short-Ratio endpoints is a clean
  next step: extend `scanExchange()` to also pull
  `fapi/v1/openInterest` + `futures/data/globalLongShortAccountRatio` per
  ranked symbol and replace `oiTrend`/`lsrTrend`.
- Spike-age (`spikeAt`) is held in memory; a process restart resets it.
  Persist `spikeReg` to a JSON file if you need ages to survive restarts.
- Tune cadence/size via env: `DVL_REFRESH_MS`, `DVL_SCAN_TF`, `DVL_PORT`.
