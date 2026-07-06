"use strict";

/* ── DVL signal metrics — faithful server-side port of the in-page
   scanner formulas (sma / pct / priceMaGlueStats / computeSignal /
   score / status / OI-LSR derivation). Keep these in sync with the
   matching functions in public/index.html so the backend output is
   identical to what the client renders. */

const { ENGINE, WEIGHTS } = require("./config");

function sma(values, period, idx) {
  if (idx < period - 1) return null;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += Number(values[i] || 0);
  return sum / period;
}

function pct(a, b) { if (!b) return 0; return ((a - b) / b) * 100; }

/* Average True Range — a simple moving average of True Range over the
   last `period` candles (not Wilder's smoothed variant), the same formula
   the Bot Demo already computes client-side (index.html), so the two stay
   comparable. `candles` must be oldest->newest {high, low, close} objects
   (worker.js's own k.ohlc shape, already fetched every cycle for every
   candidate — no extra network call needed to compute this). Returns null
   (not 0) when there isn't enough history, so callers can fall back
   explicitly instead of silently treating "unknown" as "zero volatility". */
function computeAtr(candles, period) {
  if (!Array.isArray(candles) || candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = Number(candles[i].high), l = Number(candles[i].low), pc = Number(candles[i - 1].close);
    if (!(h > 0) || !(l > 0) || !(pc > 0)) continue;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length < period) return null;
  const last = trs.slice(-period);
  let sum = 0;
  for (const v of last) sum += v;
  return sum / last.length;
}

function priceMaGlueStats(closes, period, lookback, tolPct) {
  const len = closes.length;
  period = Math.min(500, Math.max(2, parseInt(period) || 20));
  lookback = Math.min(80, Math.max(1, parseInt(lookback) || 10));
  tolPct = Math.min(10, Math.max(0.01, parseFloat(tolPct) || 0.25));

  const start = Math.max(0, len - lookback);
  let ok = true, valid = 0, maxDist = 0, sumDist = 0;

  for (let i = start; i < len; i++) {
    const ma = sma(closes, period, i);
    const close = Number(closes[i] || 0);
    if (!ma || !Number.isFinite(ma) || !close || !Number.isFinite(close)) { ok = false; continue; }
    const dist = Math.abs((close - ma) / close) * 100;
    valid++; sumDist += dist;
    if (dist > maxDist) maxDist = dist;
    if (dist > tolPct) ok = false;
  }
  if (valid < lookback) ok = false;
  return { ok, valid, maxDist, avgDist: valid ? sumDist / valid : 999, period, lookback, tolPct };
}

/* Port of the in-page computeSignal(). `closes` and `vols` are aligned
   arrays oldest→newest. Returns the canonical row fields. */
function computeSignal(closes, vols, engine) {
  engine = engine || ENGINE;
  const p1 = engine.maPeriod1 || 20;
  const p2 = engine.maPeriod2 || 50;
  const len = vols.length;
  const volMa1 = [], volMa2 = [], priceMa1 = [], priceMa2 = [];
  for (let i = 0; i < len; i++) {
    volMa1.push(sma(vols, p1, i));
    volMa2.push(sma(vols, p2, i));
    priceMa1.push(sma(closes, p1, i));
    priceMa2.push(sma(closes, p2, i));
  }
  const lastVol = vols[len - 1] || 0;
  const lastMa1 = volMa1[len - 1] || (sma(vols, Math.min(p1, len), len - 1) || 1);
  const lastMa2 = volMa2[len - 1] || (sma(vols, Math.min(p2, len), len - 1) || 1);
  const spike1 = lastVol / Math.max(lastMa1, 1e-9);
  const spike2 = lastVol / Math.max(lastMa2, 1e-9);
  const ma1Now = priceMa1[len - 1] || closes[len - 1];
  const ma1Past = priceMa1[Math.max(0, len - p1 - 1)] || priceMa1[len - 2] || ma1Now;
  const ma2Now = priceMa2[len - 1] || closes[len - 1];
  const ma2Past = priceMa2[Math.max(0, len - p1 - 1)] || priceMa2[len - 2] || ma2Now;
  const slope1 = Math.abs(pct(ma1Now, ma1Past));
  const slope2 = Math.abs(pct(ma2Now, ma2Past));
  const flatScore = Math.max(0, 1 - ((slope1 + slope2) / 1.2));
  const lastClose = closes[len - 1] || 0;
  const prevClose = closes[len - 2] || lastClose;
  const side = lastClose >= prevClose ? "LONG" : "SHORT";
  const barPct = prevClose > 0 ? ((lastClose - prevClose) / prevClose) * 100 : 0;
  const prevVol = Number(vols[len - 2] || 0);
  const spikePrevVolRatio = prevVol > 0 ? lastVol / prevVol : 0;
  const priceGlue = priceMaGlueStats(closes, engine.priceGlueMaPeriod, engine.priceGlueLookback, engine.priceGlueMaxDistPct);

  const flatX = engine.flat_x || 10;
  let flatCandles = 0;
  for (let j = len - 2; j >= 0; j--) {
    const mj = volMa1[j];
    if (!mj || !Number.isFinite(mj) || mj <= 0) break;
    if (vols[j] / mj <= flatX) flatCandles++; else break;
  }
  const prevVolBelowHalf = len >= 2 && lastVol > 0 && (vols[len - 2] || 0) < lastVol * 0.5;

  /* MA flatness over the lookback before the last bar — how flat the volume
     MA was during the base ((max-min)/avg). Lower = flatter = cleaner setup. */
  const maFlatLookback = engine.maFlatLookback || 10;
  const maWin = volMa1.slice(Math.max(0, len - 1 - maFlatLookback), len - 1).filter(v => v !== null && Number.isFinite(v) && v > 0);
  let maFlatness1 = 0;
  if (maWin.length > 1) {
    let mn = maWin[0], mx = maWin[0], sum = 0;
    for (const v of maWin) { sum += v; if (v < mn) mn = v; if (v > mx) mx = v; }
    const avg = sum / maWin.length;
    maFlatness1 = avg > 0 ? (mx - mn) / avg : 0;
  }

  /* ── Ignition: dead volume base (below MA) then the first cross above it ──
     The bars before the last must be BELOW their MA (the flat/dead base); the
     current (extrapolated) bar is the first to cross back above the MA. */
  const minBaseBars = engine.minBaseBars || 6;
  let volBelowMaBars = 0;
  for (let bi = len - 2; bi >= 0; bi--) {
    const mb = volMa1[bi];
    if (!mb || !Number.isFinite(mb) || mb <= 0) break;
    if (vols[bi] < mb) volBelowMaBars++; else break;
  }
  const crossStrength = lastMa1 > 0 ? lastVol / lastMa1 : 0;
  const igniteCross = lastVol > lastMa1;
  const isIgnition = igniteCross && volBelowMaBars >= minBaseBars;

  const firstClose24 = closes[0] || lastClose || 0;
  const price24hPct = firstClose24 > 0 ? ((lastClose - firstClose24) / firstClose24) * 100 : 0;

  let rsi14 = 50;
  if (len >= 15) {
    let gain = 0, loss = 0, steps = 0;
    for (let ri = Math.max(1, len - 14); ri < len; ri++) {
      const delta = (closes[ri] || 0) - (closes[ri - 1] || 0);
      if (delta >= 0) gain += delta; else loss += Math.abs(delta);
      steps++;
    }
    const avgGain = steps ? gain / steps : 0, avgLoss = steps ? loss / steps : 0;
    if (avgLoss <= 1e-9) rsi14 = avgGain > 0 ? 100 : 50;
    else rsi14 = 100 - (100 / (1 + (avgGain / avgLoss)));
  }

  /* RSI oversold block: was RSI(14) at/under the configured threshold at any
     point within the last N candles? Needs the full RSI series (not just the
     latest value), computed the same simple way as rsi14 above. */
  const rsiPeriod = 14;
  const rsiOversoldLookback = engine.rsiOversoldLookback || 20;
  const rsiOversoldThreshold = Number.isFinite(engine.rsiOversoldThreshold) ? engine.rsiOversoldThreshold : 30;
  let rsiOversoldOk = false;
  /* Lowest RSI(14) reached within the lookback — reused below to measure how
     much RSI has ALREADY recovered from that low, not just whether it dipped
     at some point. Starts at the current rsi14 so a still-falling RSI (no
     low behind it yet within the window) correctly reports zero recovery. */
  let rsiMinRecent = rsi14;
  if (len >= rsiPeriod + 1) {
    const start = Math.max(rsiPeriod, len - rsiOversoldLookback);
    for (let ri = start; ri < len; ri++) {
      let gain = 0, loss = 0, steps = 0;
      for (let gi = ri - rsiPeriod + 1; gi <= ri; gi++) {
        const delta = (closes[gi] || 0) - (closes[gi - 1] || 0);
        if (delta >= 0) gain += delta; else loss += Math.abs(delta);
        steps++;
      }
      const avgGain = steps ? gain / steps : 0, avgLoss = steps ? loss / steps : 0;
      const rsiAt = avgLoss <= 1e-9 ? (avgGain > 0 ? 100 : 50) : 100 - (100 / (1 + (avgGain / avgLoss)));
      if (rsiAt <= rsiOversoldThreshold) rsiOversoldOk = true;
      if (rsiAt < rsiMinRecent) rsiMinRecent = rsiAt;
    }
  }
  /* The "V" shape: how far RSI has already climbed back up from its recent
     low, not just whether it ever dipped — a boolean oversold check treats a
     signal still falling the same as one bottoming out and recovering. */
  const rsiRecoveryFromLow = Math.max(0, rsi14 - rsiMinRecent);

  return {
    side, lastClose, price24hPct, rsi14,
    last5Closes: closes.slice(-5),
    spike20: spike1, spike50: spike2, flatScore,
    flatCandles, barPct,
    prevVolBelowHalf,
    priceGlueOk: priceGlue.ok,
    spikePrevVolRatio,
    spikePrevVolOk: spikePrevVolRatio >= (engine.spikePrevVolMult || 1.5),
    maFlatness1,
    volBelowMaBars,
    crossStrength,
    isIgnition,
    rsiOversoldOk,
    rsiRecoveryFromLow
  };
}

/* Ignition score — ranks the QUALITY of an early MEXC-pump setup. Rewards a
   long dead base, rising OI, a clean flat MA and compressed price; the size
   of the cross matters only a little (the point is to catch it small/early).
   r must carry oi ("up"/"down"/"flat") set from the real OI trend. */
function ignitionScore(r, weights) {
  const w = weights || require("./config").IGNITION_WEIGHTS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fBase = clamp((Number(r.volBelowMaBars) || 0) / 15, 0, 1);          // full at 15 dead bars
  const fCross = clamp(((Number(r.crossStrength) || 1) - 1) / 1.5, 0, 1);   // full at ~2.5x MA
  const fFlat = clamp(1 - (Number(r.maFlatness1) || 1) / 0.5, 0, 1);        // flatter = better
  /* OI confirmation from the colour: green (MA rising + above) is the
     strongest "money entering", red (falling + below) the weakest. */
  const oiUp = r.oiColor === "green" ? 1 : (r.oiColor === "red" ? 0 : 0.4);
  const glue = r.priceGlueOk ? 1 : 0;
  const wTotal = w.base + w.cross + w.flat + w.oi + w.glue;
  if (wTotal <= 0) return 0;
  const pts = fBase * w.base + fCross * w.cross + fFlat * w.flat + oiUp * w.oi + glue * w.glue;
  return Math.max(0, Math.min(99, Math.round(pts / wTotal * 99)));
}

/* Ignition-context status labels (all shown rows are ignitions; this conveys
   strength). */
function ignitionStatus(sc) {
  if (sc >= 72) return "Ignição forte";
  if (sc >= 54) return "Ignição";
  if (sc >= 40) return "Início";
  return "Fraca";
}

/* Each of the 6 Spike Score blocks as a pass/fail check. `r` must already
   carry the real oi/lsr arrows (set from trendVsMA) when available — falls
   back to false (not validated) when absent (e.g. no OI data for the
   exchange). Blocks carry no priority/order between them; this is only used
   to compute the weighted score and to render the per-row checklist. */
function blocksOf(r, engine) {
  engine = engine || ENGINE;
  const spikeMaMode = String(engine.spikeMaMode || "2");
  const spike20 = Number(r.spike20) || Number(r.volX) || 0;
  const spike50 = Number(r.spike50) || 0;
  const spikeAboveAvg = spikeMaMode === "1" ? spike20 > 1 : (spike20 > 1 && spike50 > 1);
  const flatVolumeBarLen = engine.flatVolumeBarLen || 5;
  return {
    spikeAboveAvg,
    rsiOversold: !!r.rsiOversoldOk,
    oiAboveAvg: r.oi === "up",
    lsrBelowAvg: r.lsr === "down",
    flatVolumeBar: (Number(r.volBelowMaBars) || 0) >= flatVolumeBarLen,
    prevVolBelowHalf: !!r.prevVolBelowHalf
  };
}

/* Spike Score — weighted share of the 6 blocks above that validated,
   scaled to 0-99. Each block is a straight pass/fail (no continuous
   ranges); the weights only set each block's relative contribution. */
function score(r, weights, engine) {
  const w = weights || WEIGHTS;
  const b = blocksOf(r, engine);
  const W = {
    spikeAboveAvg: Number(w.spikeAboveAvg || 0),
    rsiOversold: Number(w.rsiOversold || 0),
    oiAboveAvg: Number(w.oiAboveAvg || 0),
    lsrBelowAvg: Number(w.lsrBelowAvg || 0),
    flatVolumeBar: Number(w.flatVolumeBar || 0),
    prevVolBelowHalf: Number(w.prevVolBelowHalf || 0)
  };
  const wTotal = W.spikeAboveAvg + W.rsiOversold + W.oiAboveAvg + W.lsrBelowAvg + W.flatVolumeBar + W.prevVolBelowHalf;
  if (wTotal <= 0) return 0;
  const pts = (b.spikeAboveAvg ? W.spikeAboveAvg : 0)
    + (b.rsiOversold ? W.rsiOversold : 0)
    + (b.oiAboveAvg ? W.oiAboveAvg : 0)
    + (b.lsrBelowAvg ? W.lsrBelowAvg : 0)
    + (b.flatVolumeBar ? W.flatVolumeBar : 0)
    + (b.prevVolBelowHalf ? W.prevVolBelowHalf : 0);
  return Math.max(0, Math.min(99, Math.round(pts / wTotal * 99)));
}

/* Port of statusPack1012 (display status from score + flat). */
function statusOf(r, sc) {
  if ((Number(r.flatCandles) || 0) >= 4 && sc >= 74) return "Spike pós-flat";
  if (sc >= 72) return "Spike limpo";
  if (sc >= 54) return "Em formação";
  if (sc >= 44) return "Monitorar";
  return "Sem spike";
}

/* Port of trendPack1012 — derived OI / LSR direction (up/down/flat). */
function oiTrend(r, sc) {
  const side = String(r.side || "").toUpperCase();
  if (side === "LONG" && sc >= 52) return "up";
  if (side === "SHORT" && sc >= 52) return "down";
  return "flat";
}
function lsrTrend(r) {
  const side = String(r.side || "").toUpperCase();
  const bp = Number(r.barPct) || 0;
  if (side === "LONG" && bp > 0.18) return "up";
  if (side === "SHORT" && bp < -0.18) return "down";
  return "flat";
}

/* DVL confluence factors (vt/sz/cs/oi/ls/ex) → "good" | "wait".
   Derived from the same metrics; tune freely. */
function factorsOf(r, sc) {
  const g = (cond) => (cond ? "good" : "wait");
  return {
    vt: g((Number(r.spike20) || 0) >= 1.8),         // volume thrust
    sz: g((Number(r.spike50) || 0) >= 1.5),         // spike size vs slow MA
    cs: g((Number(r.flatCandles) || 0) >= 4),       // consolidation before
    oi: g(oiTrend(r, sc) === "up"),
    ls: g(lsrTrend(r) !== "flat"),
    ex: g(!!r.priceGlueOk)                          // price compression / extension
  };
}

/* Arrow + colour for OI / LSR from a value series (oldest → newest).
   - arrow: current value ABOVE its MA → "up" (↑), BELOW → "down" (↓)
   - colour (MA slope × position):
       MA rising + above  = green
       MA rising + below  = yellow
       MA falling + above = yellow
       MA falling + below = red */
function trendVsMA(series) {
  const s = (series || []).map(Number).filter(v => Number.isFinite(v));
  if (s.length < 2) return { arrow: "up", color: "yellow", ratio: 0, slope: 0 }; // not enough data yet
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1);
  const ma = avg(s);
  const cur = s[s.length - 1];
  const above = cur >= ma;
  const half = Math.floor(s.length / 2);
  const firstHalfAvg = avg(s.slice(0, half));
  const secondHalfAvg = avg(s.slice(half));
  const maRising = secondHalfAvg >= firstHalfAvg;
  let color;
  if (maRising && above) color = "green";
  else if (!maRising && !above) color = "red";
  else color = "yellow";
  /* Continuous "how far above/below its own MA" — the block system only
     needs the arrow (above/below), but the ML groundwork wants the actual
     magnitude so it can learn its own thresholds instead of a fixed cutoff. */
  const ratio = ma !== 0 ? (cur - ma) / Math.abs(ma) : 0;
  /* Continuous TREND (not just current position): how much the second half
     of the window moved relative to the first half. "OI acima da média" is
     a snapshot; "OI subindo" is this — the direction/rate a trader actually
     watches on the chart, which the boolean arrow/ratio above don't capture
     (a value can sit above its MA while already falling from a peak). */
  const slope = firstHalfAvg !== 0 ? (secondHalfAvg - firstHalfAvg) / Math.abs(firstHalfAvg) : 0;
  return { arrow: above ? "up" : "down", color, ratio, slope };
}

/* Approximates CoinGlass's Net Long / Net Short / Net Delta panels using
   only Binance's public API (no paid CoinGlass key) — same principle the
   in-page DVL Net Long/Net Short/Net Delta oscillators already use
   client-side: a top-trader position-ratio fraction (long/short split BY
   POSITION SIZE, exchanges.js's positionRatio) times the Open Interest
   already fetched for OI's own trend. netDelta = netLong - netShort;
   Net Delta rising = buy side (new longs or short-covering) winning, a
   different signal from lsrSlope (which is ACCOUNT-count-weighted, not
   position-size-weighted) even though both describe long/short skew.
   `oiSeries`/`posSeries` are aligned by INDEX, not timestamp — see
   exchanges.js's positionRatio doc-comment for why that's an acceptable
   approximation here. Returns trendVsMA()'s neutral default for all three
   if there isn't enough overlap between the two series. */
function netFlowTrend(oiSeries, posSeries) {
  const neutral = { arrow: "up", color: "yellow", ratio: 0, slope: 0 };
  const n = Math.min((oiSeries || []).length, (posSeries || []).length);
  if (n < 2) return { netLong: neutral, netShort: neutral, netDelta: neutral };
  const netLong = [], netShort = [], netDelta = [];
  for (let i = 0; i < n; i++) {
    const oi = Number(oiSeries[i]);
    const p = posSeries[i];
    if (!Number.isFinite(oi) || !p) continue;
    const l = oi * Number(p.long), s = oi * Number(p.short);
    netLong.push(l); netShort.push(s); netDelta.push(l - s);
  }
  return { netLong: trendVsMA(netLong), netShort: trendVsMA(netShort), netDelta: trendVsMA(netDelta) };
}

/* Divergence warning — a read-only alert, deliberately kept OUT of the
   bullish Spike Score machinery entirely: never touches blocksOf()/score(),
   never becomes a FEATURE_KEYS entry in train.js. The pattern: Net Long
   unwinding, Net Short building, AND Net Delta rolling over, all while
   price hasn't confirmed a reversal yet — longs quietly de-risking before
   the chart shows it. This is the opposite shape of the 6 blocks (which
   all confirm the bullish thesis), so it doesn't fit the same additive
   scoring model; keeping it a separate flag avoids repeating the SHORT
   mistake (see train.js's doc-comment) of forcing a bearish-shaped signal
   into machinery built to predict a bullish setup's win rate.

   `row` must carry netLongSlope/netShortSlope/netDeltaSlope (worker.js
   sets these from this module's own netFlowTrend, at signal-detection
   time only — same rate-limit-safety reasoning as netLongRatio etc.,
   see worker.js's doc-comment). `warnThreshold` is the minimum |slope|
   fraction to count a leg as "moving" rather than noise — 0.03 (3%
   second-half-vs-first-half change) matches the scale netDeltaSlope
   already uses as an ML feature. `warning` fires on a MAJORITY (2 of 3)
   rather than requiring all three, so a single noisy leg doesn't mask an
   otherwise-clear divergence. */
function netFlowDivergence(row, warnThreshold) {
  const t = Number.isFinite(warnThreshold) ? warnThreshold : 0.03;
  const netLongSlope = Number(row.netLongSlope) || 0;
  const netShortSlope = Number(row.netShortSlope) || 0;
  const netDeltaSlope = Number(row.netDeltaSlope) || 0;
  const netLongFalling = netLongSlope < -t;
  const netShortRising = netShortSlope > t;
  const netDeltaFalling = netDeltaSlope < -t;
  const count = (netLongFalling ? 1 : 0) + (netShortRising ? 1 : 0) + (netDeltaFalling ? 1 : 0);
  return { netLongFalling, netShortRising, netDeltaFalling, count, warning: count >= 2 };
}

module.exports = {
  sma, pct, priceMaGlueStats, computeSignal, computeAtr,
  score, blocksOf, ignitionScore, statusOf, ignitionStatus, oiTrend, lsrTrend, factorsOf, trendVsMA, netFlowTrend, netFlowDivergence
};
