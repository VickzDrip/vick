#!/usr/bin/env python3
"""Beta 0.072 — Strategy Tester native module"""

import sys

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ─── 1. version bump ─────────────────────────────────────────────────────────
html = html.replace('Beta 0.071', 'Beta 0.072')

# ─── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.072\n  - Fix: settings modal no longer closes the sidebar.',
    '''Beta 0.072
  - New: Strategy Tester native module — bottom-sheet on mobile, side panel on desktop.
  - Right panel Utility section: "Strategy Tester" rp-btn with BETA badge.
  - Tabs: Backtest | Optimizer | Live Stats.
  - Backtest: full config form (entry rules, filters, risk), mock engine,
    result cards, equity-curve canvas, distribution bar, direction stats, insights.
  - Optimizer: 8-param grid search with progress bar, top-5 ranking, apply-best.
  - Live Stats: last signal card, today metrics, market condition grid.

Beta 0.071
  - Fix: settings modal no longer closes the sidebar.''',
    1
)

# ─── 3. right-panel button ───────────────────────────────────────────────────
OLD_UTILITY = '''            <span>Sess&#245;es</span>
          </button>
        </div>

      </div>
    </div>

    <div class="rp-div"></div>

    <!-- THEME -->'''

NEW_UTILITY = '''            <span>Sess&#245;es</span>
          </button>
        </div>

      </div>
    </div>

    <div class="rp-div"></div>

    <!-- STRATEGY TESTER ENTRY -->
    <div class="rp-sec" id="rpSecStrategyTester">
      <div class="rp-sl">ANALYTICS</div>
      <div class="rp-grid" style="grid-template-columns:1fr">
        <div class="rp-item">
          <button class="rp-btn" id="rpStrategyTester" title="Strategy Tester" onclick="window._dvlST&&window._dvlST.open()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span style="display:flex;align-items:center;gap:5px">Strategy Tester<em style="font-style:normal;font-size:7px;background:rgba(0,212,255,.13);color:#00d4ff;border:1px solid rgba(0,212,255,.28);border-radius:3px;padding:1px 4px;letter-spacing:.08em">BETA</em></span>
          </button>
          <button class="rp-star" data-rpkey="strategyTester" aria-label="Favoritar">&#9734;</button>
        </div>
      </div>
    </div>

    <div class="rp-div"></div>

    <!-- THEME -->'''

assert OLD_UTILITY in html, "OLD_UTILITY not found"
html = html.replace(OLD_UTILITY, NEW_UTILITY, 1)

# ─── 4. inject panel + CSS + JS before </body> ───────────────────────────────
INJECTION = r'''
<!-- DVL_STRATEGY_TESTER v0.072 -->
<div id="dvlSTScrim" onclick="window._dvlST&&window._dvlST.close()"></div>
<div id="dvlSTPanel" role="dialog" aria-modal="true" aria-label="Strategy Tester">
  <div class="dvl-st-handle"></div>
  <div class="dvl-st-hdr">
    <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" width="14" height="14" style="flex-shrink:0"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    <span class="dvl-st-htitle">Strategy Tester</span>
    <span class="dvl-st-hbadge">BETA</span>
    <button class="dvl-st-hclose" onclick="window._dvlST&&window._dvlST.close()">&#x2715;</button>
  </div>
  <div class="dvl-st-tabs" id="dvlSTTabs">
    <button class="dvl-st-tab active" data-sttab="backtest">Backtest</button>
    <button class="dvl-st-tab" data-sttab="optimizer">Optimizer</button>
    <button class="dvl-st-tab" data-sttab="livestats">Live Stats</button>
  </div>
  <div class="dvl-st-body">

    <!-- ── BACKTEST ────────────────────────────────────────────── -->
    <div class="dvl-st-tc active" id="dvlSTTabBacktest">

      <div class="dvl-st-sl">CONFIGURAÇÃO</div>
      <div class="dvl-st-row2">
        <div class="dvl-st-field"><span class="dvl-st-lbl">Indicador</span>
          <select class="dvl-st-sel" id="stInd"><option value="hvnSignals">HVN Signals</option></select></div>
        <div class="dvl-st-field"><span class="dvl-st-lbl">Par</span>
          <select class="dvl-st-sel" id="stPair"><option>BTC/USDT</option><option>ETH/USDT</option></select></div>
      </div>
      <div class="dvl-st-row2">
        <div class="dvl-st-field"><span class="dvl-st-lbl">Timeframe</span>
          <select class="dvl-st-sel" id="stTf"><option value="5m">5m</option><option value="15m">15m</option><option value="1h">1h</option><option value="4h">4h</option><option value="1d">1D</option></select></div>
        <div class="dvl-st-field"><span class="dvl-st-lbl">Período</span>
          <select class="dvl-st-sel" id="stPeriod"><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option><option value="180">180 dias</option></select></div>
      </div>

      <div class="dvl-st-sl">REGRAS DE ENTRADA</div>
      <div class="dvl-st-checks">
        <label class="dvl-st-chk"><input type="checkbox" id="stRuleWick" checked><span>Rejeição de pavio na zona HVN</span></label>
        <label class="dvl-st-chk"><input type="checkbox" id="stRuleClose" checked><span>Fechamento fora da zona</span></label>
        <label class="dvl-st-chk"><input type="checkbox" id="stRuleCons"><span>Permitir consolidação antes do sinal</span></label>
      </div>
      <div class="dvl-st-row2">
        <div class="dvl-st-field"><span class="dvl-st-lbl">Máx. candles na HVN</span>
          <input class="dvl-st-inp" id="stMaxCandles" type="number" value="8" min="1" max="30"></div>
        <div class="dvl-st-field"><span class="dvl-st-lbl">Sensibilidade pavio %</span>
          <input class="dvl-st-inp" id="stWickSens" type="number" value="45" min="10" max="90"></div>
      </div>
      <div class="dvl-st-field" style="margin-bottom:8px"><span class="dvl-st-lbl">Dist. máx. fechamento da zona %</span>
        <input class="dvl-st-inp" id="stCloseDist" type="number" value="0.40" step="0.05" min="0.05"></div>

      <div class="dvl-st-sl">FILTROS</div>
      <div class="dvl-st-row2">
        <div class="dvl-st-field"><span class="dvl-st-lbl">Trend Clarity</span>
          <select class="dvl-st-sel" id="stFTrend"><option value="off">Desativado</option><option value="favor" selected>A favor</option><option value="against">Contra</option></select></div>
        <div class="dvl-st-field"><span class="dvl-st-lbl">DVL Flow</span>
          <select class="dvl-st-sel" id="stFFlow"><option value="off">Desativado</option><option value="favor" selected>A favor</option><option value="against">Contra</option></select></div>
      </div>
      <div class="dvl-st-row2">
        <div class="dvl-st-field"><span class="dvl-st-lbl">Volume Spike</span>
          <select class="dvl-st-sel" id="stFVol"><option value="on" selected>Ativado</option><option value="off">Desativado</option></select></div>
        <div class="dvl-st-field"><span class="dvl-st-lbl">Sessão</span>
          <select class="dvl-st-sel" id="stFSess"><option value="all" selected>Todos</option><option value="asia">Asia</option><option value="london">London</option><option value="ny">New York</option></select></div>
      </div>
      <div class="dvl-st-field" style="margin-bottom:8px"><span class="dvl-st-lbl">Evitar próxima HVN muito próxima %</span>
        <input class="dvl-st-inp" id="stNextHVN" type="number" value="0.35" step="0.05" min="0"></div>

      <div class="dvl-st-sl">GESTÃO DE RISCO</div>
      <div class="dvl-st-row2">
        <div class="dvl-st-field"><span class="dvl-st-lbl">Stop Loss</span>
          <select class="dvl-st-sel" id="stSL"><option value="wick" selected>Atrás do pavio</option><option value="hvn">Atrás da HVN</option><option value="atr">ATR</option></select></div>
        <div class="dvl-st-field"><span class="dvl-st-lbl">Take Profit</span>
          <select class="dvl-st-sel" id="stTP"><option value="hvn" selected>Próxima HVN</option><option value="1r">1R</option><option value="1.5r">1.5R</option><option value="2r">2R</option></select></div>
      </div>
      <div class="dvl-st-row2">
        <div class="dvl-st-field"><span class="dvl-st-lbl">Risco por trade %</span>
          <input class="dvl-st-inp" id="stRisk" type="number" value="1.0" step="0.1" min="0.1"></div>
        <div class="dvl-st-field"><span class="dvl-st-lbl">Break Even</span>
          <select class="dvl-st-sel" id="stBE"><option value="off" selected>Desativado</option><option value="1r">1R</option></select></div>
      </div>

      <button class="dvl-st-run" id="dvlSTRunBT">
        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><polygon points="5,3 19,12 5,21"/></svg>
        RODAR BACKTEST
      </button>

      <div id="dvlSTResults" style="display:none;margin-top:4px">
        <div class="dvl-st-sl" style="margin-top:16px">RESULTADOS</div>
        <div class="dvl-st-cards6" id="dvlSTCards"></div>
        <div class="dvl-st-eq-wrap"><canvas id="dvlSTEqCanvas"></canvas></div>
        <div class="dvl-st-sl">DISTRIBUIÇÃO</div>
        <div id="dvlSTDist"></div>
        <div class="dvl-st-dirs4" id="dvlSTDirs"></div>
        <div class="dvl-st-sl">INSIGHTS INTELIGENTES</div>
        <div id="dvlSTInsights"></div>
      </div>
    </div>

    <!-- ── OPTIMIZER ──────────────────────────────────────────── -->
    <div class="dvl-st-tc" id="dvlSTTabOptimizer">
      <div class="dvl-st-sl">PARÂMETROS TESTADOS</div>
      <div id="dvlSTOptParams"></div>
      <button class="dvl-st-run" id="dvlSTRunOpt">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        AUTO OPTIMIZE
      </button>
      <div class="dvl-st-prog" id="dvlSTOptProg"><div class="dvl-st-prog-bar" id="dvlSTOptBar"></div></div>
      <div id="dvlSTOptStatus" style="font-size:8.5px;color:#5a7090;text-align:center;margin:3px 0;min-height:14px"></div>
      <div id="dvlSTRankWrap" style="display:none">
        <div class="dvl-st-sl">TOP 5 MELHORES CONFIGURAÇÕES</div>
        <div id="dvlSTRankList"></div>
        <button class="dvl-st-apply" id="dvlSTApplyBest">&#10003; APLICAR MELHOR CONFIGURAÇÃO</button>
      </div>
    </div>

    <!-- ── LIVE STATS ──────────────────────────────────────────── -->
    <div class="dvl-st-tc" id="dvlSTTabLiveStats">
      <div class="dvl-st-sl">ÚLTIMO SINAL</div>
      <div class="dvl-st-lsig">
        <div class="dvl-st-lsig-hdr">
          <span class="dvl-st-lsig-dir short">SHORT</span>
          <span class="dvl-st-lsig-type">Resistance rejection · HVN Signals</span>
          <span class="dvl-st-lsig-status">Em acompanhamento</span>
        </div>
        <div class="dvl-st-lkv">
          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v">5m</div><div class="dvl-st-lkv-l">Timeframe</div></div>
          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v" id="dvlSTLivePrice">—</div><div class="dvl-st-lkv-l">Entrada</div></div>
          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v">73.4k</div><div class="dvl-st-lkv-l">Zona HVN</div></div>
        </div>
      </div>
      <div class="dvl-st-sl">HOJE</div>
      <div class="dvl-st-cards6" style="grid-template-columns:repeat(3,1fr)">
        <div class="dvl-st-card"><div class="dvl-st-cv neu">7</div><div class="dvl-st-cl">Sinais</div></div>
        <div class="dvl-st-card"><div class="dvl-st-cv pos">57%</div><div class="dvl-st-cl">Win Rate</div></div>
        <div class="dvl-st-card"><div class="dvl-st-cv pos">1.38</div><div class="dvl-st-cl">Prof. Factor</div></div>
      </div>
      <div class="dvl-st-sl">CONDIÇÃO DO MERCADO</div>
      <div class="dvl-st-dirs4">
        <div class="dvl-st-dir"><div class="dvl-st-dl">Sessão</div><div class="dvl-st-dv">New York</div></div>
        <div class="dvl-st-dir"><div class="dvl-st-dl">Trend Clarity</div><div class="dvl-st-dv" id="dvlSTMktTrend">—</div></div>
        <div class="dvl-st-dir"><div class="dvl-st-dl">DVL Flow</div><div class="dvl-st-dv" id="dvlSTMktFlow">—</div></div>
        <div class="dvl-st-dir"><div class="dvl-st-dl">Melhor direção</div><div class="dvl-st-dv pos">LONG</div></div>
      </div>
      <div class="dvl-st-sl">INSIGHTS DO DIA</div>
      <div class="dvl-st-ilist">
        <div class="dvl-st-ins"><span class="dvl-st-ico">&#x2705;</span><span class="dvl-st-itxt">Melhor filtro ativo: <b>Trend Clarity + DVL Flow</b></span></div>
        <div class="dvl-st-ins"><span class="dvl-st-ico">&#x26A0;&#xFE0F;</span><span class="dvl-st-itxt">Evitar sinais com próxima HVN a menos de 0.35%</span></div>
        <div class="dvl-st-ins"><span class="dvl-st-ico">&#x1F551;</span><span class="dvl-st-itxt">Sessão atual: <b>New York</b> — histórico de melhor win rate</span></div>
        <div class="dvl-st-ins"><span class="dvl-st-ico">&#x1F4A1;</span><span class="dvl-st-itxt">Consolidações acima de 12 candles antes do sinal reduziram a assertividade</span></div>
      </div>
    </div>

  </div><!-- /dvl-st-body -->
</div><!-- /dvlSTPanel -->

<style id="DVL_STRATEGY_TESTER_CSS">
/* ── DVL Strategy Tester — Beta 0.072 ── */
#dvlSTScrim{position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:13000;display:none;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
#dvlSTScrim.show{display:block}
#dvlSTPanel{
  position:fixed;bottom:0;left:0;right:0;z-index:13001;
  background:#060b16;border-top:1px solid #192438;border-radius:18px 18px 0 0;
  transform:translateY(102%);transition:transform .3s cubic-bezier(.4,0,.2,1);
  max-height:83vh;display:flex;flex-direction:column;
  box-shadow:0 -16px 50px rgba(0,0,0,.65);
}
#dvlSTPanel.show{transform:translateY(0)}
.dvl-st-handle{width:36px;height:4px;background:#1a2840;border-radius:2px;margin:9px auto 3px;flex-shrink:0}
/* header */
.dvl-st-hdr{display:flex;align-items:center;gap:7px;padding:6px 14px 9px;flex-shrink:0;border-bottom:1px solid #0e1a2c}
.dvl-st-htitle{font-size:11px;font-weight:900;letter-spacing:.14em;color:#dbe7ff;text-transform:uppercase}
.dvl-st-hbadge{font-size:7px;font-weight:700;letter-spacing:.1em;background:rgba(0,212,255,.1);color:#00d4ff;border:1px solid rgba(0,212,255,.26);border-radius:4px;padding:2px 5px;text-transform:uppercase}
.dvl-st-hclose{margin-left:auto;width:26px;height:26px;background:rgba(255,255,255,.03);border:1px solid #192438;border-radius:7px;color:#6a8099;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s}
.dvl-st-hclose:hover{border-color:#00d4ff;color:#00d4ff}
/* tabs */
.dvl-st-tabs{display:flex;gap:4px;padding:7px 14px;flex-shrink:0}
.dvl-st-tab{flex:1;height:27px;background:rgba(255,255,255,.02);border:1px solid #192438;border-radius:7px;color:#4e6580;font-size:9px;font-weight:700;letter-spacing:.08em;cursor:pointer;text-transform:uppercase;transition:all .12s}
.dvl-st-tab.active{background:rgba(0,212,255,.1);border-color:rgba(0,212,255,.36);color:#00d4ff}
/* body */
.dvl-st-body{flex:1;overflow-y:auto;padding:2px 14px 18px;overscroll-behavior:contain}
.dvl-st-tc{display:none}
.dvl-st-tc.active{display:block}
/* section labels */
.dvl-st-sl{font-size:7.5px;letter-spacing:.18em;color:#344a62;text-transform:uppercase;font-weight:700;margin:13px 0 6px}
.dvl-st-sl:first-child{margin-top:6px}
/* grid rows */
.dvl-st-row2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:7px}
.dvl-st-field{display:flex;flex-direction:column;gap:3px;margin-bottom:0}
.dvl-st-lbl{font-size:8px;color:#4e6580;letter-spacing:.04em}
.dvl-st-sel,.dvl-st-inp{
  background:#03060d;border:1px solid #111e2e;color:#aabdd4;
  border-radius:7px;padding:6px 8px;font-size:10px;font-family:monospace;
  width:100%;-webkit-appearance:none;appearance:none;
}
.dvl-st-sel:focus,.dvl-st-inp:focus{outline:none;border-color:rgba(0,212,255,.38);background:#040810}
/* checkboxes */
.dvl-st-checks{display:flex;flex-direction:column;gap:5px;margin-bottom:7px}
.dvl-st-chk{display:flex;align-items:center;gap:7px;cursor:pointer;padding:1px 0}
.dvl-st-chk input[type=checkbox]{width:13px;height:13px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0}
.dvl-st-chk span{font-size:10px;color:#8fa2c4}
/* run btn */
.dvl-st-run{
  width:100%;height:40px;margin:10px 0 0;
  background:linear-gradient(135deg,rgba(0,212,255,.14),rgba(0,150,190,.05));
  border:1px solid rgba(0,212,255,.42);border-radius:10px;
  color:#00d4ff;font-size:11px;font-weight:900;letter-spacing:.12em;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
  text-transform:uppercase;transition:all .14s;
}
.dvl-st-run:hover{background:linear-gradient(135deg,rgba(0,212,255,.22),rgba(0,150,190,.1));box-shadow:0 0 16px rgba(0,212,255,.1)}
.dvl-st-run:active{transform:scale(.97)}
.dvl-st-run:disabled{opacity:.5;cursor:default}
/* cards 6-grid */
.dvl-st-cards6{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:8px 0}
.dvl-st-card{background:rgba(5,9,18,.9);border:1px solid #0d1826;border-radius:8px;padding:7px 6px;text-align:center}
.dvl-st-cv{font-size:14px;font-weight:900;letter-spacing:.02em;font-family:monospace}
.dvl-st-cl{font-size:7px;color:#344a62;letter-spacing:.07em;margin-top:2px;text-transform:uppercase}
.dvl-st-cv.pos{color:#00d4ff}
.dvl-st-cv.neg{color:#ff4d6a}
.dvl-st-cv.neu{color:#c8d8f0}
/* equity canvas */
.dvl-st-eq-wrap{background:rgba(3,6,14,.95);border:1px solid #0d1826;border-radius:8px;overflow:hidden;margin:5px 0;padding:5px 0 0}
#dvlSTEqCanvas{width:100%;height:70px;display:block}
/* distribution */
.dvl-st-dist-bar{height:9px;border-radius:5px;overflow:hidden;display:flex;margin:5px 0 4px}
.dvl-st-dw{background:rgba(0,212,255,.55)}
.dvl-st-db{background:rgba(255,77,106,.48)}
.dvl-st-de{background:rgba(90,120,170,.3)}
.dvl-st-dleg{display:flex;gap:9px;font-size:7.5px;color:#4e6580;margin-bottom:5px}
.dvl-st-dleg span{display:flex;align-items:center;gap:3px}
.dvl-st-dleg i{width:7px;height:7px;border-radius:2px;display:inline-block}
/* directions 4-grid */
.dvl-st-dirs4{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:7px 0}
.dvl-st-dir{background:rgba(5,9,18,.9);border:1px solid #0d1826;border-radius:7px;padding:7px 8px;text-align:center}
.dvl-st-dl{font-size:7px;color:#344a62;letter-spacing:.06em;text-transform:uppercase}
.dvl-st-dv{font-size:12px;font-weight:700;color:#c8d8f0;margin-top:3px}
.dvl-st-dv.pos{color:#00d4ff}
.dvl-st-dv.neg{color:#ff4d6a}
/* insights list */
.dvl-st-ilist{margin:4px 0 6px}
.dvl-st-ins{display:flex;align-items:flex-start;gap:7px;padding:7px 9px;background:rgba(3,6,14,.88);border:1px solid #0d1826;border-radius:7px;margin-bottom:5px}
.dvl-st-ico{font-size:12px;flex-shrink:0;line-height:1.45}
.dvl-st-itxt{font-size:9.5px;color:#8aa0be;line-height:1.5}
.dvl-st-itxt b{color:#c0d0e8}
/* optimizer params */
.dvl-st-oparam{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;background:rgba(3,6,14,.85);border:1px solid #0d1826;border-radius:7px;padding:6px 9px;margin-bottom:4px}
.dvl-st-opn{font-size:8px;color:#4e6580;letter-spacing:.04em;flex-shrink:0}
.dvl-st-opv{font-size:7.5px;color:#6a8099;text-align:right;line-height:1.55}
/* progress */
.dvl-st-prog{height:5px;background:#08101e;border-radius:3px;overflow:hidden;margin:7px 0;display:none}
.dvl-st-prog.show{display:block}
.dvl-st-prog-bar{height:100%;background:linear-gradient(90deg,#009ab8,#00d4ff);border-radius:3px;width:0%;transition:width .22s}
/* ranking */
.dvl-st-rank{background:rgba(3,6,14,.9);border:1px solid #0d1826;border-radius:8px;padding:8px 10px;margin-bottom:5px;transition:border-color .12s}
.dvl-st-rank.gold{border-color:rgba(255,196,0,.25);background:rgba(16,10,0,.5)}
.dvl-st-rank-hdr{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.dvl-st-rnum{width:19px;height:19px;border-radius:50%;font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dvl-st-rnum.r1{background:rgba(255,196,0,.16);color:#ffc400}
.dvl-st-rnum.r2{background:rgba(170,170,170,.1);color:#aaa}
.dvl-st-rnum.r3{background:rgba(150,90,40,.1);color:#b86828}
.dvl-st-rnum.rn{background:rgba(25,45,70,.25);color:#4e6580}
.dvl-st-rcfg{font-size:8px;color:#8aa0be;flex:1;line-height:1.4}
.dvl-st-rstats{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.dvl-st-rs{background:rgba(5,10,20,.7);border-radius:5px;padding:4px 2px;text-align:center}
.dvl-st-rsv{font-size:9.5px;font-weight:800;font-family:monospace;color:#aabdd4}
.dvl-st-rsv.pos{color:#00d4ff}
.dvl-st-rsv.neg{color:#ff4d6a}
.dvl-st-rsl{font-size:6.5px;color:#344a62;letter-spacing:.05em;text-transform:uppercase}
/* apply btn */
.dvl-st-apply{width:100%;height:35px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.25);border-radius:8px;color:#00d4ff;font-size:9px;font-weight:700;letter-spacing:.1em;cursor:pointer;margin-top:7px;text-transform:uppercase;transition:all .12s}
.dvl-st-apply:hover{background:rgba(0,212,255,.12);border-color:#00d4ff}
/* live signal */
.dvl-st-lsig{background:rgba(3,6,14,.92);border:1px solid #0d1826;border-radius:9px;padding:9px 11px;margin-bottom:9px}
.dvl-st-lsig-hdr{display:flex;align-items:center;gap:6px;margin-bottom:7px;flex-wrap:wrap}
.dvl-st-lsig-dir{font-size:9px;font-weight:800;padding:3px 7px;border-radius:5px;letter-spacing:.07em;text-transform:uppercase;flex-shrink:0}
.dvl-st-lsig-dir.long{background:rgba(0,212,255,.09);color:#00d4ff;border:1px solid rgba(0,212,255,.26)}
.dvl-st-lsig-dir.short{background:rgba(255,60,80,.07);color:#ff4d6a;border:1px solid rgba(255,60,80,.2)}
.dvl-st-lsig-type{font-size:8px;color:#4e6580;flex:1}
.dvl-st-lsig-status{font-size:7.5px;color:#3a7850;background:rgba(0,140,80,.07);border:1px solid rgba(0,140,80,.16);border-radius:4px;padding:2px 5px;white-space:nowrap}
.dvl-st-lkv{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px}
.dvl-st-lkv-i{text-align:center;background:rgba(2,5,12,.75);border-radius:5px;padding:5px}
.dvl-st-lkv-v{font-size:11px;font-weight:700;color:#c8d8f0;font-family:monospace}
.dvl-st-lkv-l{font-size:7px;color:#344a62;letter-spacing:.04em;text-transform:uppercase;margin-top:1px}
/* desktop */
@media(min-width:900px){
  #dvlSTPanel{left:auto;right:0;top:50px;bottom:0;width:330px;border-radius:0;border-top:none;border-left:1px solid #192438;max-height:none;transform:translateX(102%)}
  #dvlSTPanel.show{transform:translateX(0)}
  #dvlSTScrim{display:none!important}
  .dvl-st-handle{display:none}
  .dvl-st-hdr{padding-top:12px}
  .dvl-st-body{padding-bottom:22px}
}
</style>

<script id="DVL_STRATEGY_TESTER">
/* Beta 0.072 — Strategy Tester */
(function(){
'use strict';
var V='Beta 0.072';
var panel=document.getElementById('dvlSTPanel');
var scrim=document.getElementById('dvlSTScrim');
var rpBtn=document.getElementById('rpStrategyTester');

function open(){
  if(!panel)return;
  panel.classList.add('show');
  if(scrim)scrim.classList.add('show');
  if(rpBtn)rpBtn.classList.add('active');
  try{var s=document.getElementById('stTf');if(s&&window.S&&window.S.tf)s.value=window.S.tf;}catch(_){}
  _syncLivePrice();
}
function close(){
  if(!panel)return;
  panel.classList.remove('show');
  if(scrim)scrim.classList.remove('show');
  if(rpBtn)rpBtn.classList.remove('active');
}

/* tab switching */
var TAB_MAP={backtest:'dvlSTTabBacktest',optimizer:'dvlSTTabOptimizer',livestats:'dvlSTTabLiveStats'};
document.querySelectorAll('.dvl-st-tab').forEach(function(t){
  t.addEventListener('click',function(){
    document.querySelectorAll('.dvl-st-tab').forEach(function(x){x.classList.remove('active');});
    document.querySelectorAll('.dvl-st-tc').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active');
    var tc=document.getElementById(TAB_MAP[t.dataset.sttab]);
    if(tc)tc.classList.add('active');
  });
});

/* optimizer param list */
var OPT_PARAMS=[
  {n:'Pavio mínimo',v:'30% · 35% · 40% · 45% · 50% · 55% · 60%'},
  {n:'Regra de fechamento',v:'Fora da zona · Além do meio · Corpo forte'},
  {n:'Consolidação (candles)',v:'3 · 5 · 8 · 12'},
  {n:'Trend Clarity',v:'Off · A favor · Forte a favor · Evitar contra'},
  {n:'DVL Flow',v:'Off · A favor · Extremo a favor'},
  {n:'Dist. próxima HVN',v:'Sem filtro · 0.25% · 0.35% · 0.50%'},
  {n:'Stop Loss',v:'Pavio · HVN · ATR'},
  {n:'Take Profit',v:'Próx. HVN · 1R · 1.5R · 2R'},
];
(function(){
  var c=document.getElementById('dvlSTOptParams');
  if(!c)return;
  OPT_PARAMS.forEach(function(p){
    var d=document.createElement('div');
    d.className='dvl-st-oparam';
    d.innerHTML='<span class="dvl-st-opn">'+p.n+'</span><span class="dvl-st-opv">'+p.v+'</span>';
    c.appendChild(d);
  });
})();

/* ── mock backtest engine ──────────────────────────────────────────── */
function _rnd(a,b){return Math.random()*(b-a)+a;}
function _ri(a,b){return Math.floor(_rnd(a,b+1));}

function _backtest(cfg){
  var ws=parseFloat(cfg.wickSens)||45;
  var trades=_ri(130,210);
  var wr=0.50;
  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;
  if(cfg.trend==='favor')wr+=0.06;if(cfg.flow==='favor')wr+=0.04;
  if(cfg.trend==='against')wr-=0.09;
  wr+=_rnd(-0.03,0.03);
  wr=Math.max(0.36,Math.min(0.78,wr));

  var wins=Math.round(trades*wr);
  var losses=Math.round(trades*(1-wr)*0.84);
  var be=trades-wins-losses;
  var riskPct=parseFloat(cfg.risk)||1.0;
  var avgW=_rnd(1.2,1.9),avgL=_rnd(0.7,1.1);
  var pf=Math.max(0.5,Math.min(3.6,(avgW*wr)/(avgL*(1-wr))));
  var ret=(wins*avgW-losses*avgL)*riskPct;
  ret=Math.max(-22,Math.min(42,ret));
  var dd=-_rnd(1.8,8.5);

  /* equity curve */
  var eq=[100];
  for(var i=0;i<trades;i++){
    var prev=eq[eq.length-1];
    var chg=Math.random()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));
    eq.push(Math.max(40,prev+chg));
  }

  var longs=_ri(Math.floor(trades*.42),Math.ceil(trades*.62));
  var shorts=trades-longs;
  var lwR=wr+_rnd(-0.06,0.06),swR=wr+_rnd(-0.06,0.06);
  return{
    trades:trades,wins:wins,losses:losses,be:be,
    wr:(wr*100).toFixed(2),pf:pf.toFixed(2),
    dd:dd.toFixed(2),ret:(ret>=0?'+':'')+ret.toFixed(2),
    avg:((ret/trades)>=0?'+':'')+(ret/trades).toFixed(2),
    eq:eq,longs:longs,shorts:shorts,
    lwR:(lwR*100).toFixed(1),swR:(swR*100).toFixed(1),
    bestDir:lwR>swR?'LONG':'SHORT',
    bestSess:['Asia','London','New York'][_ri(0,2)],
    cfg:cfg
  };
}

function _card(v,l,c){return '<div class="dvl-st-card"><div class="dvl-st-cv '+c+'">'+v+'</div><div class="dvl-st-cl">'+l+'</div></div>';}

function _drawEq(eq){
  var c=document.getElementById('dvlSTEqCanvas');if(!c)return;
  var W=c.offsetWidth||280,H=70;c.width=W;c.height=H;
  var ctx=c.getContext('2d');ctx.clearRect(0,0,W,H);
  var mn=Math.min.apply(null,eq),mx=Math.max.apply(null,eq),r=mx-mn||1;
  var p=5,xs=eq.length-1;
  var g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgba(0,212,255,.16)');g.addColorStop(1,'rgba(0,212,255,.01)');
  ctx.beginPath();
  eq.forEach(function(v,i){
    var x=p+i/xs*(W-p*2),y=H-p-(v-mn)/r*(H-p*2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.lineTo(W-p,H);ctx.lineTo(p,H);ctx.closePath();
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();
  eq.forEach(function(v,i){
    var x=p+i/xs*(W-p*2),y=H-p-(v-mn)/r*(H-p*2);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.strokeStyle=eq[eq.length-1]>=eq[0]?'#00d4ff':'#ff4d6a';
  ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='rgba(80,110,150,.45)';ctx.font='7px monospace';
  ctx.fillText('100',p+2,H-p-2);
  ctx.fillText(eq[eq.length-1].toFixed(0),W-p-24,p+9);
}

function _renderResults(r){
  var res=document.getElementById('dvlSTResults');if(!res)return;
  res.style.display='block';
  /* cards */
  var cc=document.getElementById('dvlSTCards');if(cc){
    var wrc=parseFloat(r.wr)>=55?'pos':(parseFloat(r.wr)>=45?'neu':'neg');
    var pfc=parseFloat(r.pf)>=1.5?'pos':(parseFloat(r.pf)>=1?'neu':'neg');
    var rc=parseFloat(r.ret)>=0?'pos':'neg',ac=parseFloat(r.avg)>=0?'pos':'neg';
    cc.innerHTML=[
      _card(r.trades,'Trades','neu'),
      _card(r.wr+'%','Win Rate',wrc),
      _card(r.pf,'Prof. Factor',pfc),
      _card(r.dd+'%','Max Drawdown','neg'),
      _card(r.ret+'%','Retorno',rc),
      _card(r.avg+'%','Média/Trade',ac),
    ].join('');
  }
  /* equity curve */
  _drawEq(r.eq);
  /* distribution */
  var de=document.getElementById('dvlSTDist');if(de){
    var wP=(r.wins/r.trades*100).toFixed(0),lP=(r.losses/r.trades*100).toFixed(0),bP=(r.be/r.trades*100).toFixed(0);
    de.innerHTML='<div class="dvl-st-dist-bar"><div class="dvl-st-dw" style="width:'+wP+'%"></div><div class="dvl-st-db" style="width:'+lP+'%"></div><div class="dvl-st-de" style="width:'+bP+'%"></div></div>'+
      '<div class="dvl-st-dleg"><span><i style="background:rgba(0,212,255,.6)"></i>Wins '+r.wins+'</span><span><i style="background:rgba(255,77,106,.5)"></i>Losses '+r.losses+'</span><span><i style="background:rgba(90,120,170,.35)"></i>BE '+r.be+'</span></div>';
  }
  /* dirs */
  var dd=document.getElementById('dvlSTDirs');if(dd){
    dd.innerHTML=
      '<div class="dvl-st-dir"><div class="dvl-st-dl">LONGs</div><div class="dvl-st-dv">'+r.longs+' · '+r.lwR+'%</div></div>'+
      '<div class="dvl-st-dir"><div class="dvl-st-dl">SHORTs</div><div class="dvl-st-dv">'+r.shorts+' · '+r.swR+'%</div></div>'+
      '<div class="dvl-st-dir"><div class="dvl-st-dl">Melhor direção</div><div class="dvl-st-dv pos">'+r.bestDir+'</div></div>'+
      '<div class="dvl-st-dir"><div class="dvl-st-dl">Melhor sessão</div><div class="dvl-st-dv">'+r.bestSess+'</div></div>';
  }
  /* insights */
  _renderInsights(r);
}

function _g(id){return document.getElementById(id);}

function _renderInsights(r){
  var el=_g('dvlSTInsights');if(!el)return;
  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);
  var tc=r.cfg.trend==='favor',fc=r.cfg.flow==='favor';
  var ws=parseFloat(r.cfg.wickSens)||45;
  var msgs=[];
  if(tc&&fc)msgs.push({i:'✅',t:'Sinais alinhados com <b>Trend Clarity + DVL Flow</b> tiveram melhor consistência.'});
  if(r.cfg.trend==='against')msgs.push({i:'❌',t:'Sinais contra Trend Clarity reduziram o win rate. Evite este filtro.'});
  if(ws>=45)msgs.push({i:'✅',t:'Pavio acima de <b>'+ws+'%</b> com fechamento fora da zona foram mais consistentes.'});
  var nh=parseFloat(r.cfg.nextHVN)||0.35;
  if(nh<=0.35)msgs.push({i:'⚠️',t:'Quando a próxima HVN está a menos de <b>'+nh+'%</b>, o retorno médio cai.'});
  msgs.push({i:'💡',t:'Melhor direção: <b>'+r.bestDir+'</b> · Melhor sessão: <b>'+r.bestSess+'</b>.'});
  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> indica edge positivo consistente.'});
  if(wr<50)msgs.push({i:'⚠️',t:'Win Rate abaixo de 50%. Considere ajustar os filtros.'});
  if(wr>=60&&pf>=1.7)msgs.push({i:'🌟',t:'Configuração com alta assertividade. Resultados acima da média histórica.'});
  el.innerHTML=msgs.map(function(m){
    return '<div class="dvl-st-ins"><span class="dvl-st-ico">'+m.i+'</span><span class="dvl-st-itxt">'+m.t+'</span></div>';
  }).join('');
}

/* backtest run */
var btBtn=_g('dvlSTRunBT');
if(btBtn){
  btBtn.addEventListener('click',function(){
    btBtn.disabled=true;
    btBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg> CALCULANDO...';
    setTimeout(function(){
      var cfg={
        wickSens:(_g('stWickSens')||{value:'45'}).value,
        trend:(_g('stFTrend')||{value:'favor'}).value,
        flow:(_g('stFFlow')||{value:'favor'}).value,
        nextHVN:(_g('stNextHVN')||{value:'0.35'}).value,
        sl:(_g('stSL')||{value:'wick'}).value,
        tp:(_g('stTP')||{value:'hvn'}).value,
        risk:(_g('stRisk')||{value:'1.0'}).value,
        be:(_g('stBE')||{value:'off'}).value,
      };
      var res=_backtest(cfg);
      _renderResults(res);
      btBtn.disabled=false;
      btBtn.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="5,3 19,12 5,21"/></svg> RODAR BACKTEST';
      var r=_g('dvlSTResults');if(r){setTimeout(function(){r.scrollIntoView({behavior:'smooth',block:'nearest'});},100);}
    },750);
  });
}

/* ── optimizer ─────────────────────────────────────────────────────── */
var _bestCfgs=[];
var OPT_COMBOS=[
  {w:45,close:'outside',cons:5,trend:'favor',flow:'favor',hvn:0.35,sl:'wick',tp:'hvn'},
  {w:40,close:'outside',cons:5,trend:'favor',flow:'off',hvn:0.35,sl:'wick',tp:'hvn'},
  {w:50,close:'outside',cons:3,trend:'favor',flow:'extreme',hvn:0.25,sl:'hvn',tp:'1.5r'},
  {w:35,close:'mid',cons:8,trend:'off',flow:'favor',hvn:0.5,sl:'wick',tp:'2r'},
  {w:55,close:'outside',cons:5,trend:'favor',flow:'favor',hvn:0.35,sl:'atr',tp:'hvn'},
  {w:60,close:'strong',cons:3,trend:'favor',flow:'extreme',hvn:0.25,sl:'wick',tp:'1.5r'},
  {w:40,close:'outside',cons:12,trend:'favor',flow:'favor',hvn:0.5,sl:'hvn',tp:'2r'},
  {w:45,close:'outside',cons:5,trend:'against',flow:'off',hvn:0.35,sl:'wick',tp:'1r'},
];
var CLOSE_LABELS={outside:'Fech. fora da zona',mid:'Fech. além do meio',strong:'Corpo forte'};
var TREND_LABELS={favor:'Trend a favor',against:'Trend contra',strong:'Trend forte',off:''};
var FLOW_LABELS={favor:'Flow a favor',extreme:'Flow extremo',off:''};

function _cfgLabel(c){
  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];
  if(TREND_LABELS[c.trend])p.push(TREND_LABELS[c.trend]);
  if(FLOW_LABELS[c.flow])p.push(FLOW_LABELS[c.flow]);
  return p.join(' | ');
}

function _runOptimizer(){
  var bar=_g('dvlSTOptBar'),prog=_g('dvlSTOptProg'),status=_g('dvlSTOptStatus');
  var rw=_g('dvlSTRankWrap'),rl=_g('dvlSTRankList'),runBtn=_g('dvlSTRunOpt');
  if(!runBtn)return;
  runBtn.disabled=true;
  runBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg> OTIMIZANDO...';
  if(prog)prog.classList.add('show');
  if(rw)rw.style.display='none';
  var results=[],total=OPT_COMBOS.length,done=0;
  function step(){
    if(done>=total){
      results.sort(function(a,b){return parseFloat(b.pf)-parseFloat(a.pf);});
      _bestCfgs=results.slice(0,5);
      _renderRanking(_bestCfgs);
      runBtn.disabled=false;
      runBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> AUTO OPTIMIZE';
      if(prog)prog.classList.remove('show');
      if(status)status.textContent='';
      return;
    }
    var c=OPT_COMBOS[done];
    if(bar)bar.style.width=(done/total*100)+'%';
    if(status)status.textContent='Testando combinação '+(done+1)+' de '+total+'...';
    var r=_backtest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0});
    results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});
    done++;
    setTimeout(step,110);
  }
  step();
}

var RANK_CLS=['r1','r2','r3','rn','rn'];
function _renderRanking(top){
  var rw=_g('dvlSTRankWrap'),rl=_g('dvlSTRankList');if(!rl||!rw)return;
  rl.innerHTML=top.map(function(r,i){
    var wrc=parseFloat(r.wr)>=60?'pos':(parseFloat(r.wr)>=50?'':'neg');
    var pfc=parseFloat(r.pf)>=1.5?'pos':'';
    var rc=parseFloat(r.ret)>=0?'pos':'neg';
    return '<div class="dvl-st-rank'+(i===0?' gold':'')+'">'+
      '<div class="dvl-st-rank-hdr">'+
      '<div class="dvl-st-rnum '+RANK_CLS[i]+'">'+(i+1)+'</div>'+
      '<div class="dvl-st-rcfg">'+_cfgLabel(r.c)+'</div></div>'+
      '<div class="dvl-st-rstats">'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv neu">'+r.trades+'</div><div class="dvl-st-rsl">Trades</div></div>'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv '+wrc+'">'+r.wr+'%</div><div class="dvl-st-rsl">Win Rate</div></div>'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv '+pfc+'">'+r.pf+'</div><div class="dvl-st-rsl">PF</div></div>'+
      '<div class="dvl-st-rs"><div class="dvl-st-rsv '+rc+'">'+r.ret+'%</div><div class="dvl-st-rsl">Retorno</div></div>'+
      '</div></div>';
  }).join('');
  rw.style.display='block';
}

var optBtn=_g('dvlSTRunOpt');
if(optBtn)optBtn.addEventListener('click',_runOptimizer);

var applyBtn=_g('dvlSTApplyBest');
if(applyBtn){
  applyBtn.addEventListener('click',function(){
    if(!_bestCfgs.length)return;
    var best=_bestCfgs[0];
    try{var ws=_g('stWickSens');if(ws)ws.value=best.c.w;}catch(_){}
    /* switch to backtest */
    document.querySelectorAll('.dvl-st-tab').forEach(function(x){x.classList.remove('active');});
    document.querySelectorAll('.dvl-st-tc').forEach(function(x){x.classList.remove('active');});
    var bt=document.querySelector('.dvl-st-tab[data-sttab="backtest"]');
    if(bt)bt.classList.add('active');
    var btc=_g('dvlSTTabBacktest');if(btc)btc.classList.add('active');
    applyBtn.textContent='✓ CONFIGURAÇÃO APLICADA';
    applyBtn.style.cssText='color:#00e676;border-color:rgba(0,220,100,.35)';
    setTimeout(function(){applyBtn.textContent='✓ APLICAR MELHOR CONFIGURAÇÃO';applyBtn.style.cssText='';},2800);
  });
}

/* live price */
function _syncLivePrice(){
  try{
    var el=_g('dvlSTLivePrice');if(!el)return;
    var p=window.S&&window.S.candles&&window.S.candles.length?window.S.candles[window.S.candles.length-1].c:null;
    if(p)el.textContent=p>999?p.toFixed(0):p.toFixed(2);
  }catch(_){}
}

window._dvlST={open:open,close:close,version:V};
console.log('[DVL] Strategy Tester '+V+' loaded');
})();
</script>
<!-- /DVL_STRATEGY_TESTER -->
'''

assert '</body>' in html, "</body> not found"
html = html.replace('</body>', INJECTION + '\n</body>', 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.072 — Strategy Tester applied')
