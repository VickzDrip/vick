#!/usr/bin/env python3
"""
patch_632.py  —  DVL Beta 0.631 → 0.632
1. Remove indicador Tick Volume (não funciona)
2. Candle fluido: throttle 0ms + setInterval 250ms + WS base para TFs não-nativos
3. Botões Buy/Sell: demo position com linha de entrada no gráfico
"""
import sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ERRO] NOT FOUND: {label}")
        sys.exit(1)
    if count > 1:
        print(f"[ERRO] AMBIGUOUS ({count}x): {label}")
        sys.exit(1)
    print(f"[OK] {label}")
    return html.replace(old, new, 1)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

# ── 1. Version bump ───────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.631";',
    'const DVL_APP_VERSION = "Beta 0.632";',
    "version constant"
)
html = rep(html,
    '>BETA 0.631</div>',
    '>BETA 0.632</div>',
    "version badge HTML"
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: VP Sessão 2 — POC·2/VAH·2/VAL·2 de timeframe independente, sem barras." },',
    '{ version: DVL_APP_VERSION, note: "Fix: remove TickVol; candle fluido (WS base TF + 250ms); Buy/Sell demo position." },\n  { version: "Beta 0.631", note: "Feature: VP Sessão 2 — POC·2/VAH·2/VAL·2 de timeframe independente, sem barras." },',
    "changelog entry"
)

# ── 2. Remove Tick Volume script block ────────────────────────────────────────
tick_start = '\n<script id="DVL_BETA_0598_TICK_VOL_JS">'
tick_end   = '\n<script id="DVL_BETA_0575_PROFILE_SAVE_AND_CHART_HISTORY_ACTIONS">'
si = html.find(tick_start)
ei = html.find(tick_end, si)
if si < 0 or ei < 0:
    print("[ERRO] NOT FOUND: Tick Volume script markers"); sys.exit(1)
html = html[:si] + '\n' + html[ei:]
print("[OK] removed Tick Volume script block")

# ── 3. Candle fluido — redraw interval 1000ms → 250ms ─────────────────────
html = rep(html,
    'setInterval(drawSoon, 1000);',
    'setInterval(drawSoon, 250);',
    "drawSoon interval 250ms"
)

# ── 4. Candle fluido — remove 200ms WS throttle ──────────────────────────────
html = rep(html,
    'const now = Date.now();\n        if(now-_klWsLastDraw > 200){ _klWsLastDraw=now; drawSoon(); }',
    'drawSoon();',
    "remove native WS throttle"
)

# ── 5. Candle fluido — secondary WS for non-native TFs ───────────────────────
NON_NATIVE_WS = """
// ── Live candle para TFs não-nativos (WS do intervalo base) ─────────────────
let _nnWs=null, _nnWsSym=null, _nnWsBase=null;
function _nnWsConnect(){
  if(isNativeTimeframe(interval)){
    if(_nnWs){try{_nnWs.close();}catch(_){}_nnWs=null;}
    return;
  }
  const s=(symbol||'BTCUSDT').toUpperCase();
  const base=baseIntervalForTimeframe(interval);
  if(_nnWsSym===s&&_nnWsBase===base&&_nnWs&&_nnWs.readyState<2) return;
  if(_nnWs){try{_nnWs.close();}catch(_){}_nnWs=null;}
  _nnWsSym=s; _nnWsBase=base;
  try{
    _nnWs=new WebSocket('wss://fstream.binance.com/ws/'+s.toLowerCase()+'@kline_'+base);
    _nnWs.onmessage=ev=>{
      try{
        const msg=JSON.parse(ev.data);
        if(msg.e!=='kline') return;
        const k=msg.k;
        const curBase=baseIntervalForTimeframe(interval);
        if(k.s!==(symbol||'BTCUSDT').toUpperCase()||k.i!==curBase) return;
        if(!klines.length) return;
        const tMs=intervalMs(interval);
        const bucketT=Math.floor(+k.t/tMs)*tMs;
        const last=klines[klines.length-1];
        if(last.time===bucketT){
          const h=+k.h, l=+k.l, c=+k.c;
          if(h>last.high) last.high=h;
          if(l<last.low)  last.low=l;
          last.close=c;
          drawSoon();
        }
      }catch(_){}
    };
    _nnWs.onerror=()=>{};
    _nnWs.onclose=()=>{ _nnWs=null; };
  }catch(_){}
}
_nnWsConnect();
setInterval(_nnWsConnect, 5000);
"""

html = rep(html,
    '_klWsConnect();\nsetInterval(_klWsConnect, 5000);\n',
    '_klWsConnect();\nsetInterval(_klWsConnect, 5000);\n' + NON_NATIVE_WS,
    "non-native TF live WS"
)

# ── 6. Call _nnWsConnect inside loadAll (symbol/interval change) ──────────────
html = rep(html,
    'if(typeof _klWsConnect===\'function\') _klWsConnect();',
    'if(typeof _klWsConnect===\'function\') _klWsConnect();\n    if(typeof _nnWsConnect===\'function\') _nnWsConnect();',
    "_nnWsConnect in loadAll"
)

# ── 7. demoPos state variable ─────────────────────────────────────────────────
html = rep(html,
    'let liquidationLinesOn = false;\n',
    'let liquidationLinesOn = false;\nlet demoPos = null;\n',
    "demoPos variable"
)

# ── 8. CSS for tradeAction.is-active ─────────────────────────────────────────
html = rep(html,
    '.tradeAction.buy span,\n.tradeAction.sell span{\n  font-size:9px!important;\n}\n</style>',
    """.tradeAction.buy span,
.tradeAction.sell span{
  font-size:9px!important;
}
.tradeAction.buy.is-active{
  background:rgba(19,220,141,.18)!important;
  border-color:rgba(19,220,141,.5)!important;
  box-shadow:0 0 12px rgba(19,220,141,.28),inset 0 0 8px rgba(19,220,141,.08)!important;
}
.tradeAction.sell.is-active{
  background:rgba(255,74,97,.18)!important;
  border-color:rgba(255,74,97,.5)!important;
  box-shadow:0 0 12px rgba(255,74,97,.28),inset 0 0 8px rgba(255,74,97,.08)!important;
}
</style>""",
    "tradeAction is-active CSS"
)

# ── 9. IDs on Buy/Sell buttons ────────────────────────────────────────────────
html = rep(html,
    '<button class="tradeAction buy"><strong>Buy</strong>',
    '<button class="tradeAction buy" id="dvlBuyBtn"><strong>Buy</strong>',
    "buy button id"
)
html = rep(html,
    '<button class="tradeAction sell"><strong>Sell</strong>',
    '<button class="tradeAction sell" id="dvlSellBtn"><strong>Sell</strong>',
    "sell button id"
)

# ── 10. Demo position click handlers ─────────────────────────────────────────
DEMO_HANDLERS = """

// ── Demo position (Buy / Sell) ─────────────────────────────────────────────
function _toggleDemoPos(dir){
  const price = Number(ticker?.lastPrice || klines.at(-1)?.close || 0);
  if(!price){ showToast('Aguardando preço...'); return; }
  demoPos = (demoPos && demoPos.dir === dir) ? null : { dir, price };
  const buyBtn = document.getElementById('dvlBuyBtn');
  const selBtn = document.getElementById('dvlSellBtn');
  if(buyBtn) buyBtn.classList.toggle('is-active', !!demoPos && demoPos.dir === 'long');
  if(selBtn) selBtn.classList.toggle('is-active', !!demoPos && demoPos.dir === 'short');
  drawSoon();
}
document.getElementById('dvlBuyBtn')?.addEventListener('click', ()=>_toggleDemoPos('long'));
document.getElementById('dvlSellBtn')?.addEventListener('click', ()=>_toggleDemoPos('short'));
"""

html = rep(html,
    "if(els.panelCloseX){\n  els.panelCloseX.addEventListener('click', ()=>setTradeDrawer(false));\n}",
    "if(els.panelCloseX){\n  els.panelCloseX.addEventListener('click', ()=>setTradeDrawer(false));\n}" + DEMO_HANDLERS,
    "demo position handlers"
)

# ── 11. drawDemoPosition function ─────────────────────────────────────────────
DRAW_DEMO = """
function drawDemoPosition(ctx, {x0, x1, y0, y1, y, last}){
  if(!demoPos) return;
  const {dir, price} = demoPos;
  const ep = Number(price);
  if(!ep) return;
  const py = y(ep);
  if(py < y0 - 10 || py > y1 + 10) return;

  const isLong = dir === 'long';
  const clr = isLong ? '#13dc8d' : '#ff4a61';
  const cur = Number(last || 0);
  const pnlPct = cur && ep ? (cur - ep) / ep * 100 * (isLong ? 1 : -1) : 0;
  const lev = Math.max(1, Math.round(leverage || 1));
  const pnlLev = pnlPct * lev;
  const pLabel = (isLong ? 'LONG' : 'SHORT') + '  ' + fmtPrice(ep)
    + (pnlPct !== 0 ? '   ' + (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%' : '')
    + (pnlPct !== 0 && lev > 1 ? '  ' + (pnlLev >= 0 ? '+' : '') + pnlLev.toFixed(1) + '% ×' + lev : '');

  ctx.save();
  ctx.strokeStyle = clr;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = clr;
  ctx.font = '700 8px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 0.9;
  ctx.fillText(pLabel, x0 + 4, py - 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

"""

html = rep(html,
    '\nfunction drawDvlSubpanelBase(',
    DRAW_DEMO + '\nfunction drawDvlSubpanelBase(',
    "drawDemoPosition function"
)

# ── 12. Call drawDemoPosition in main draw() ──────────────────────────────────
html = rep(html,
    '  window.__dvlLastCrossCfg = {\n    x0,\n    x1,\n    y0,\n    y1,\n    min,\n    max,',
    '  drawDemoPosition(ctx, {x0, x1, y0, y1, y, last});\n\n  window.__dvlLastCrossCfg = {\n    x0,\n    x1,\n    y0,\n    y1,\n    min,\n    max,',
    "drawDemoPosition call in draw"
)

# ── 13. Also clear demoPos when selectSymbol changes symbol ───────────────────
html = rep(html,
    '  symbol = sym;\n  symbolIndex = symbols.indexOf(sym);\n  chartOffsetCandles = -24;',
    '  symbol = sym;\n  symbolIndex = symbols.indexOf(sym);\n  demoPos = null;\n  chartOffsetCandles = -24;',
    "clear demoPos on symbol change"
)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n✓ patch_632 aplicado — {SRC}")
