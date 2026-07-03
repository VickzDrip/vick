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

## Outcome logging (ML groundwork)
`src/outcomes.js` records, for every symbol that freshly enters the signal
registry (a real detection, not a refresh), a feature snapshot — the 6 Spike
Score blocks (booleans), the CONTINUOUS raw values behind them (exact RSI,
spike20/spike50 ratios, OI/LSR distance from their own moving average,
volume-below-MA bar count, candle strength, cross strength), the score,
side and entry price. As time passes it fills in what price actually did
(`r15m`/`r1h`/`r4h`/`r24h` % return), and once the 24h horizon is filled the
labeled example is appended to an append-only `data/outcomes-log.jsonl` (one
JSON object per line). Pending entries persist to
`data/outcomes-pending.json` across restarts, and `GET
/api/dvl/scanner/health` reports `{ outcomes: { pending, resolved } }`.

## Learned weights — hybrid model (ML — trains automatically, not wired to the live score yet)
`src/train.js` reads `outcomes-log.jsonl` and fits a plain logistic
regression (no external ML dependency — ~15 features, batch gradient
descent with L2 regularization) predicting whether a signal was "favorable"
(price moved in the signal's direction by the `r4h` horizon).

It's **hybrid** on purpose: the model sees both the 6 blocks as booleans
*and* the continuous values behind them (normalized), so it can find its
own thresholds (e.g. "RSI 22 is a much stronger signal than RSI 29") instead
of being capped at the hand-picked cutoffs the blocks use for display and
filtering (RSI < 30, etc.). The block coefficients are additionally
converted to the same 0-40 weight scale `cfg.WEIGHTS` uses (`model.weights`)
— a simplified view for the existing display / a future `M.score()`
plug-in. A block the model finds NOT predictive gets weight 0, never a
negative weight — a block should stop contributing, not actively penalize
the score. The full feature list (booleans + continuous) and their learned
coefficients are in `model.coefficients`.

**Evaluation is a temporal holdout, not in-sample.** The model trains on the
chronologically OLDEST ~80% of resolved examples and is scored on the
newest ~20%, which it never saw while fitting — `model.testAccuracy` (also
exposed as `model.accuracy` for backward compatibility) is that honest,
held-out number; `model.trainAccuracy` is shown alongside only as a
reference (a big gap between the two is a sign of overfitting). Measuring
accuracy on the model's own training data, as a v1 of this did, always
looks good and tells you almost nothing about whether it actually works on
signals it hasn't seen yet.

The worker calls `train.maybeTrain()` once per cycle (self-throttled to at
most once/hour). It's a no-op — cheap, just re-reads the log to count
lines — until there are at least `MIN_SAMPLES` (300, raised from the
original 200 now that there are ~15 features instead of 6, to keep enough
examples per feature) resolved examples, and only re-fits after
`MIN_NEW_SAMPLES` (30) more arrive since the last run. The result is saved
to `data/learned-weights.json` and surfaced read-only at `GET
/api/dvl/scanner/health` as `outcomes.model: { trained, samples,
trainSamples, testSamples, needed, accuracy, trainAccuracy, testAccuracy,
trainedAt, weights, coefficients }`, and shown in the app's Copilot tab
("Aprendizado (ML)" card).

**This is deliberately NOT wired into the live Spike Score yet.** The score
you tune by hand in Filtros keeps working exactly as before; the learned
model trains in the background so you can watch its (honest) accuracy and
weights build confidence over time, before anyone decides to actually
switch the live score over to it (or blend the two). Run it manually any
time with `npm run train`.

## Notes / next steps
- Spike-age (`spikeAt`) is held in memory; a process restart resets it.
  Persist `spikeReg` to a JSON file if you need ages to survive restarts.
- Tune cadence/size via env: `DVL_REFRESH_MS`, `DVL_SCAN_TF`, `DVL_PORT`.
- Outcome log paths are overridable via `DVL_OUTCOMES_PENDING_FILE` /
  `DVL_OUTCOMES_LOG_FILE`; horizons/thresholds are constants at the top of
  `src/outcomes.js`. The model file path is overridable via
  `DVL_MODEL_FILE`; training constants (horizon, MIN_SAMPLES,
  TEST_FRACTION, learning rate/iterations) are at the top of `src/train.js`.
- Possible next steps beyond this: predicting the expected return magnitude
  (regression) instead of just favorable/unfavorable (classification), and
  eventually an opt-in toggle to actually use the learned weights live.
