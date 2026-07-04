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

**LSR/OI data sources match the in-page chart exactly, on purpose.** LSR
comes from Binance's top-trader long/short ACCOUNT ratio
(`futures/data/topLongShortAccountRatio`, see `binanceLsr` in
`exchanges.js`) — the same source the chart's Long/Short panel uses by
default ("BINANCE TOP"). An earlier version of this file used Bybit's
account-ratio instead; it worked, but it's a different metric from a
different exchange than what the chart (and the outcome log's ML features)
were meant to reflect, so it was switched. OI works the same way per
exchange: MEXC's own ticker payload already carries it (`holdVol`), but
Binance's doesn't — its candidates get one `openInterest` call each,
pooled the same way klines are (`scanCandidatesAndOi` in `worker.js`).
Skipping that call (as an earlier version did) doesn't error; it just
silently leaves every Binance signal's OI arrow/ratio/slope at a neutral
placeholder forever, which is a real, easy-to-miss correctness bug rather
than a stylistic choice — worth remembering if OI/LSR-derived
signals/features ever look off again.

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
side and entry price.

**Trend, not just snapshot.** `oiRatio`/`lsrRatio` (and the OI/LSR blocks
themselves) are a snapshot — where OI/LSR sit relative to their own average
RIGHT NOW. That's not the same thing as "OI subindo" / "LSR caindo" (rising
/ falling) a trader actually reads off the chart — a value can sit above its
own average while already rolling over from a peak. `metrics.js`'s
`trendVsMA()` now also returns `slope` (second half of the window vs the
first half, so it captures direction/rate independently of the current
snapshot position), captured as `features.oiSlope` / `features.lsrSlope`.
Similarly, the RSI oversold block is a one-time "did it dip below 30 at
some point" check — it can't tell a signal that's still falling apart from
one that bottomed out and is recovering (a "V"). `features.rsiRecoveryFromLow`
is how far RSI has already climbed back up from its lowest point within the
lookback window (0 if it's still falling / hasn't bottomed out yet). All
three are hybrid features like the rest — real, continuous values the
learned model can weigh on its own, not new booleans.

**Manual trades count too.** The outcome log used to only ever see what the
automated ignition check flagged — a user's own discretionary entry (opened
by hand in the app's Trade tab, based on their own reading of the chart) was
invisible to it. `POST /api/dvl/scanner/manual-trade` (called by the
in-page app whenever a Market position is opened, via
`worker.recordManualTrade`) logs one of these too: it computes the exact
same feature snapshot fresh, on demand (the symbol may not be one the
worker happens to be polling as a scan candidate, so there's no cached row
to reuse), always against Binance — the same source the chart's own OI/LSR
panels use, regardless of which exchange the trade nominally runs on, so
the logged features match what the user actually looked at. These are
tagged `source: "manual"` in the log (scanner detections are `"auto"`) but
resolve through the exact same triple-barrier logic below — no special
treatment, so manual and auto-detected examples stay comparable in the same
training set.

**Seeing it on the chart, not just in a terminal.** `outcomes.historyForSymbol(symbol)`
(exposed at `GET /api/dvl/scanner/history?symbol=X`) returns every recorded
signal — resolved and still-pending, auto and manual — for one symbol,
oldest first, each with a `combo` field (e.g. `"O+P"`, via the same
`analyze.comboKey()` `--combo` already uses). The in-page app plots these as
small colored markers directly on that symbol's own price chart (green =
hit target, red = hit stop, yellow = still pending) at the exact candle
each signal fired on, with a letter-combo label and a tap-to-filter chip
row (S/R/O/L/F/P) — so a pattern's real history is something you look at on
the chart the same way you already read RSI/OI/LSR, not something you have
to go read as numbers in a terminal separately. Off by default; read-only
(fetches history, never writes anything).

**Any asset, not just ones the scanner has flagged.** `GET /api/dvl/scanner/history?symbol=X`
above only has data for symbols that already ignited or were manually
traded. `worker.computeLiveReading(symbol, tf)` (exposed at
`GET /api/dvl/scanner/live-reading?symbol=X&tf=Y`) is different: it computes
a full fresh row for literally ANY symbol, right now, whether or not the
scanner has ever flagged it — same computation `recordManualTrade` uses
(`computeFreshRow`, shared by both), just read-only and never logged.

The in-page app deliberately keeps this simple: a single small always-on
readout in the corner of the chart, no button/panel/filters to interact
with, showing "OI subindo"/"OI caindo", "LSR subindo"/"LSR caindo" (colored
by which direction is actually favorable for each — OI rising, LSR falling
— not just green-for-up), and "RSI recuperando (V)" when
`rsiRecoveryFromLow` is meaningfully positive, or "Spike pós-flat" when
those blocks line up. An earlier version of this also drew historical
marker dots on the chart (from the `/history` endpoint) behind a toggle
button with letter-combo filter chips — removed for being more complexity
than the ask needed; the `/history` endpoint itself is untouched and still
usable directly if that view is worth revisiting later.

**Rate-limit safety.** `computeFreshRow()` (shared by `recordManualTrade`
and `computeLiveReading`) fires 3 fresh Binance requests every time it
runs, with no throttling of its own — and the in-page live-reading readout
polls on a timer *and* on every symbol change. Multiple open tabs/devices
polling the same handful of popular symbols is exactly the kind of extra
load that can push the VPS's IP into a Binance rate-limit ban (HTTP 418 —
this actually happened once already), stacked on top of whatever the
scanner's own scan cycle is already using. `computeLiveReading()` caches
its result per `symbol|tf` for `LIVE_READING_CACHE_MS` (20s) — concurrent/
rapid requests for the same symbol collapse into a single Binance call
instead of one each. The in-page poll interval was also relaxed to 90s
(a "how does it look right now" readout doesn't need to update every
30s), and the symbol-change observer is debounced (400ms) since
`#symbolText` can mutate more than once in quick succession while the
header re-renders. `recordManualTrade` is NOT cached (a real trade should
always read fresh data at the moment it's opened).

**Resolution is event-driven (a "triple barrier"), not a fixed clock wait.**
Every cycle, each pending signal's current price is checked against its
entry price (side-adjusted: up is favorable for LONG, down for SHORT), and
it resolves the moment either:
- price moves `PROFIT_TARGET_PCT` (2%) in its favor → label **1** ("target")
- price moves `STOP_LOSS_PCT` (1%) against it → label **0** ("stop")
- `MAX_HORIZON_MS` (4h) elapses without hitting either → label from
  whichever side of zero the return sits on ("timeout")

A spike that pumps and reverses in 20 minutes gets labeled correctly in 20
minutes, not a day later — most examples resolve in minutes-to-hours. The
older fixed `r15m`/`r1h`/`r4h` snapshots are still recorded alongside the
label purely for informational/diagnostic purposes; they don't determine
it. Once resolved, the labeled example is appended to an append-only
`data/outcomes-log.jsonl` (one JSON object per line, with `label`,
`outcome`, `resolvedAfterMs` and `finalReturnPct` fields). Pending entries
persist to `data/outcomes-pending.json` across restarts (dropped as stale,
without logging, if a symbol never gets a fresh price again for 24h), and
`GET /api/dvl/scanner/health` reports `{ outcomes: { pending, resolved } }`.

## Learned weights — hybrid model (ML — trains automatically, not wired to the live score yet)
`src/train.js` reads `outcomes-log.jsonl` and fits a plain logistic
regression (no external ML dependency — ~18 features, batch gradient
descent with L2 regularization) predicting whether a signal was "favorable"
— using the `label` outcomes.js already resolved via the triple barrier
above, not a fixed-horizon return computed here.

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
lines — until there are at least `MIN_SAMPLES` (200) resolved examples, and
only re-fits after `MIN_NEW_SAMPLES` (7, roughly an hour's worth of new
resolutions at the scanner's typical pace) more arrive since the last run.
With ~18 features and only 200 examples there's more room for the model to
fit noise than with the original 6-boolean version — L2 regularization
and, especially, `testAccuracy` (the honest held-out number) are what
catch that if it happens; raise `MIN_SAMPLES` back up if `testAccuracy`
looks unstable or noticeably worse than `trainAccuracy` early on. The result is saved
to `data/learned-weights.json` and surfaced read-only at `GET
/api/dvl/scanner/health` as `outcomes.model: { trained, samples,
trainSamples, testSamples, needed, accuracy, trainAccuracy, testAccuracy,
trainedAt, weights, coefficients }`, and shown in the app's Copilot tab
("Aprendizado (ML)" card).

**Resetting the training data (`npm run reset-training-data`).** If
something upstream of the logged features changes in a way that makes old
and new samples not comparable anymore — e.g. switching the LSR/OI data
source, so `lsrRatio`/`oiRatio` would mean two different things depending
on when a sample was recorded — mixing old and new samples in the same
training set silently contaminates it. This archives (never deletes)
`outcomes-log.jsonl`, `outcomes-pending.json` and `learned-weights.json`
into a timestamped `data/archive-<date>/` folder and leaves the live paths
empty, so pending/resolved/trained counts all start over from zero. **Stop
the worker first** (`systemctl stop dvl-scanner`) — it reads/writes these
same files, and moving them out from under a running process risks a lost
update mid-cycle. Restart it after.

**Wiring into the live score is opt-in.** Filtros has a "Pesos do score"
toggle — Manual (default) or 🤖 Aprendido (ML). Manual keeps using the
weights you tune by hand, exactly as before. Switching to ML makes
`score()` read the trained model's `weights` instead (via a small
`effectiveWeights()` helper that falls back to manual weights if the model
isn't trained yet), and the metrics panel shows either the training
progress or, once trained, the learned per-block weights and the honest
held-out accuracy. Nothing about outcome logging or training changes based
on this toggle — it only affects which weights compute the score you see.
Run training manually any time with `npm run train`.

## Confluence diagnostic (`npm run analyze`)
`src/analyze.js` answers a narrower, model-free question: does having MORE
of the 6 blocks true at once (confluence) beat any single block alone?
`train.js`'s logistic regression scores each block independently — a
block's learned coefficient reflects its *average* showing across every
example it appeared in, whether alone or stacked with others. If, in
reality, a block only helps when several others also confirm at the same
time, that effect can get averaged away in a small dataset dominated by
single-block examples, even though the pattern is real.

`analyze.js` reads the same `outcomes-log.jsonl`, buckets every resolved
example by how many of the 6 blocks were true (0 through 6), and reports
per bucket:
- **win rate** — no regression, no weighting, just counts
- **average return** (`finalReturnPct`, side-adjusted, signed) — a negative
  average means the bucket lost money on average at resolution, even if
  some individual examples won
- **average drawdown** (`maxDrawdownPct`) — how deep the worst adverse dip
  got, side-adjusted, before the signal resolved, whichever way it
  resolved. Tracked live by `outcomes.js` on every `checkOutcomes()` call
  (the running worst point seen), so only entries logged after this field
  existed carry it — its sample count (`n=`) can be smaller than the
  bucket's total and is shown alongside the average for that reason.

Run it with `npm run analyze`. If confluence genuinely matters, the win
rate should climb as the bucket count goes up; if it's flat or noisy
across buckets, the data doesn't support that yet (small buckets,
especially 5/6 and 6/6, need to be read with the sample size in mind — a
handful of examples can swing a win rate a lot). The drawdown column is
useful for telling apart two different failure modes that look identical
in the win rate alone: a bucket with a low win rate AND a small average
drawdown suggests the direction call itself was often wrong, while a low
win rate with a LARGE average drawdown suggests the fixed barriers
(2% target / 1% stop) may be a poor fit for that bucket's volatility —
e.g. bigger, more violent spikes getting stopped out by ordinary price
noise before ever reaching the target. This is read-only and separate
from `train.js` — it doesn't feed the learned weights or the live score,
it's a lens to sanity-check them against.

**Count alone can hide what actually matters.** Two examples with the same
number of true blocks can be completely different signals — "OI acima da
média + LSR abaixo da média" (2 blocks) is not the same kind of setup as
"Spike + Flat volume bar + Pré-volume baixo" (3 blocks, the old scanner's
own spike-pós-flat pattern) just because both happen to have 2-3 blocks
true. `analyzeByCombination()` (also printed by `npm run analyze`, right
below the count table) groups by the EXACT set of blocks instead, using the
same single-letter badges the Scanner UI shows (S/R/O/L/F/P), sorted by
sample count — e.g. `O+L`, `S+F+P`, `R+O+L` each get their own row with
their own win rate/return/drawdown. Combinations with fewer than 3 samples
are counted but hidden from the printed table (too little data to read).

**Looking up one specific combination directly.** Since `flatVolumeBar`
and `prevVolBelowHalf` show up true in almost every logged signal in
practice, an EXACT combination like `R+O+L` alone (with nothing else true)
can be rare or nonexistent even when RSI+OI+LSR together are actually
common — it's just that F/P are usually tagging along too, landing it in a
different exact row like `R+O+L+F+P`. `npm run analyze -- --combo=ROL`
(letters in any order/case, separators optional) answers the more useful
question directly: every resolved signal where R, O AND L were ALL true,
regardless of what else also was, pooled together, plus a breakdown of the
exact combinations (with or without F/P attached) that contributed.

**Which actual VALUES work, not just which booleans.** The blocks reduce
everything to yes/no (RSI < 30, OI above its own average, etc) at a
hand-picked cutoff — but the real question is often "at what RSI does it
actually start working, 22? 28?", not "does the RSI block help." Every
resolved signal already carries the raw value behind each block
(`features.rsi14`, `features.oiRatio`, `features.lsrRatio`, `spike20`,
`spike50`, `barPct`, `flatCandles`, `volBelowMaBars`, `crossStrength`).
`npm run analyze -- --feature=rsi14` (or `--feature=all` for every
continuous feature at once) splits resolved examples into 5 quantile bins
by that feature's actual value and reports win rate/return/drawdown per
bin — so instead of a single fixed cutoff, you see the real trend across
the whole range and can read off where it actually turns favorable. Bins
are quantile-sized (roughly equal sample counts), not fixed-width, so
skewed distributions don't leave a bin with 2 examples and another with
200.

## Notes / next steps
- Spike-age (`spikeAt`) is held in memory; a process restart resets it.
  Persist `spikeReg` to a JSON file if you need ages to survive restarts.
- Tune cadence/size via env: `DVL_REFRESH_MS`, `DVL_SCAN_TF`, `DVL_PORT`.
- **`CAND` (candidates scanned) and `REFRESH_MS` (scan cadence) were cut
  from 200/60s to 80/120s after a Binance IP rate-limit ban (HTTP 418)** —
  200 candidates × 6 timeframes of klines, plus a fresh OI call per
  candidate and an LSR call per tracked signal per TF, every 60s, added up
  to 2000+ requests/min against Binance on their own, before the
  live-reading feature's polling tipped it over the edge. If you raise
  these back up, do it gradually and watch the logs / `npm run analyze`
  output for renewed 418s — and remember that repeatedly hitting Binance
  *while already banned* can extend the ban instead of letting it expire,
  so a ban always calls for stopping the service for a real cooldown, not
  just waiting with it still running.
- Outcome log paths are overridable via `DVL_OUTCOMES_PENDING_FILE` /
  `DVL_OUTCOMES_LOG_FILE`; horizons/thresholds are constants at the top of
  `src/outcomes.js`. The model file path is overridable via
  `DVL_MODEL_FILE`; training constants (horizon, MIN_SAMPLES,
  TEST_FRACTION, learning rate/iterations) are at the top of `src/train.js`.
- Possible next steps beyond this: predicting the expected return magnitude
  (regression) instead of just favorable/unfavorable (classification), and
  eventually an opt-in toggle to actually use the learned weights live.
