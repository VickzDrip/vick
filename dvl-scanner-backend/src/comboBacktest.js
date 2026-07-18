"use strict";

/* ── DVL Combined confluence backtest ───────────────────────────────────
   Junta os três: gatilho pré-volume (ignição pós-flat) + Exhaustion RSI na
   zona certa + entrada PERTO de uma linha do Volume Profile (VAL/POC/VAH).
   Um sinal só conta quando as TRÊS coisas batem ao mesmo tempo (confluência).

   Varre: zona do RSI × linha do VP × distância (ATR) × janela do perfil ×
   lado da linha × alvo, por direção (long/short), cada lado com seu $1000.

   ⚠️ Confluência = sinais mais raros = mais risco de overfit por amostra
   pequena. Por isso o critério é rígido (verde no TREINO E no TESTE, ranqueado
   pelo pior dos dois) E o mínimo de trades é reforçado. */

const pumpBacktest = require("./pumpBacktest");
const vp = require("./vpBacktest");
const EXR = require("./exhaustionRsi");

function comboGridSearch(samples, opts) {
  opts = opts || {};
  const exitBase = { costFrac: opts.costFrac, account0: opts.account0 || 1000, riskPct: opts.riskPct || 0.01, minConv: 0 };
  const slAtr = opts.slAtr || 1.2;
  const usableAll = (Array.isArray(samples) ? samples : []).filter(s =>
    s && Array.isArray(s.vpBars) && s.vpBars.length >= 30 &&
    Array.isArray(s.exrBars) && s.exrBars.length >= 8 &&
    Number(s.entry) > 0 && Number(s.atr) > 0);
  if (usableAll.length < 30) return { ready: false, usable: usableAll.length, need: 30 };
  const MAX = Math.max(200, opts.maxSamples || 1500);
  const use = usableAll.length > MAX ? usableAll.slice(-MAX) : usableAll;
  const sampleTotal = usableAll.length;
  const cut = Math.max(1, Math.floor(use.length * (opts.trainFrac || 0.7)));

  const lowerGrid = opts.lowerGrid || [25, 30, 35, 40];   // RSI oversold → LONG
  const upperGrid = opts.upperGrid || [60, 65, 70, 75];   // RSI overbought → SHORT
  const lineGrid  = opts.lineGrid  || ["val", "poc", "vah"];
  const proxGrid  = opts.proxGrid  || [0.5, 1, 1.5, 2];   // ATR até a linha
  const winGrid   = opts.winGrid   || [80, 120, 160];     // janela do VP (velas)
  const posGrid   = opts.posGrid   || ["any", "below", "above"];
  const tpGrid    = opts.tpGrid    || [1.5, 2, 3, 4, 5, 6];
  const rows = opts.rows || 120, vaPct = opts.vaPct || 0.70;
  const rsiCfg = { mtfRsiLen: 14, mtfPush: 18, mtfVolSpikeAt: 2.5, mtfVolMaLen: 20 };
  const minTr = Math.max(8, Math.round(cut * 0.04));      // reforçado (confluência é rara)

  const FL = () => ({ up: 1, down: 0 });
  const FS = () => ({ up: 0, down: 1 });
  const sum = r => ({ returnPct: r.returnPct, account: r.account, maxDrawdownPct: r.maxDrawdownPct, winRate: r.winRate, trades: r.trades });

  /* Precompute por sample: valor do Exhaustion RSI (config default) + níveis de
     VP em cada janela. O sweep só lê distâncias/zonas. */
  const prep = use.map(s => {
    const rv = EXR.valueFrom(s.exrBars, rsiCfg);
    const val = rv ? rv.value : 50;
    const lv = {};
    for (const w of winGrid) lv[w] = vp.volumeProfile(s.vpBars.slice(Math.max(0, s.vpBars.length - w)), rows, vaPct);
    return { s, val, lv, entry: Number(s.entry), atr: Number(s.atr) };
  });
  const prepTrain = prep.slice(0, cut), prepTest = prep.slice(cut);

  function near(p, win, line, prox, pos) {
    const L = p.lv[win]; if (!L) return false;
    const px = L[line]; if (!(px > 0)) return false;
    const d = (p.entry - px) / p.atr;
    if (Math.abs(d) > prox) return false;
    if (pos === "below" && d > 0) return false;
    if (pos === "above" && d < 0) return false;
    return true;
  }
  const inZone = (p, side, thr) => side === "long" ? p.val <= thr : p.val >= thr;

  function evalCombo(side, zone, line, prox, win, pos) {
    const forced = side === "long" ? FL : FS;
    const filt = p => inZone(p, side, zone) && near(p, win, line, prox, pos);
    const tr = prepTrain.filter(filt).map(p => p.s);
    if (tr.length < minTr) return null;
    let best = null;
    for (const tp of tpGrid) {
      const r = pumpBacktest.run(tr, forced, Object.assign({ slAtr, tpAtr: tp, side }, exitBase));
      if (!best || r.account > best.r.account) best = { tp, r };
    }
    const te = prepTest.filter(filt).map(p => p.s);
    const teR = pumpBacktest.run(te, forced, Object.assign({ slAtr, tpAtr: best.tp, side }, exitBase));
    return {
      side, zone, line, vpWin: win, proxAtr: prox, pos, tpAtr: best.tp,
      train: sum(best.r), test: sum(teR), trainN: tr.length, testN: te.length,
      robust: Math.min(best.r.returnPct, teR.returnPct),
      generalizes: teR.trades >= 8 && teR.returnPct > 0 && best.r.returnPct > 0
    };
  }

  function searchSide(side, zoneGrid) {
    const combos = [];
    for (const zone of zoneGrid) for (const line of lineGrid) for (const prox of proxGrid) for (const win of winGrid) for (const pos of posGrid) {
      const c = evalCombo(side, zone, line, prox, win, pos);
      if (c) combos.push(c);
    }
    const scored = combos.slice().sort((a, b) => b.robust - a.robust);
    const best = scored.filter(c => c.generalizes)[0] || null;
    return { best, top: scored.slice(0, 12), combos: combos.length };
  }

  const nCombos = (lowerGrid.length + upperGrid.length) * lineGrid.length * proxGrid.length * winGrid.length * posGrid.length;
  return {
    ready: true, usable: use.length, sampleTotal, trainN: cut, testN: use.length - cut, slAtr, rows, vaPct,
    combosTested: nCombos,
    grids: { lower: lowerGrid, upper: upperGrid, line: lineGrid, prox: proxGrid, win: winGrid, pos: posGrid, tp: tpGrid },
    long: searchSide("long", lowerGrid), short: searchSide("short", upperGrid)
  };
}

module.exports = { comboGridSearch };
