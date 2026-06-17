#!/usr/bin/env python3
"""
patch_633.py  —  DVL Beta 0.632 → 0.633
Candle realmente fluido — raiz do problema:
  1. Bug em refreshAssetTickers: linha sobrescrevia ticker fresco com o antigo → ticker.lastPrice
     ficava estagnado por 15s (tempo do loadAll). Corrigido: atualiza ticker com dado fresco.
  2. Adiciona _fastPoll(): poll de 2s só do ativo atual (ticker + última vela) via REST.
     Funciona independente de WebSocket.
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
    'const DVL_APP_VERSION = "Beta 0.632";',
    'const DVL_APP_VERSION = "Beta 0.633";',
    "version constant"
)
html = rep(html,
    '>BETA 0.632</div>',
    '>BETA 0.633</div>',
    "version badge HTML"
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Fix: remove TickVol; candle fluido (WS base TF + 250ms); Buy/Sell demo position." },',
    '{ version: DVL_APP_VERSION, note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },\n  { version: "Beta 0.632", note: "Fix: remove TickVol; candle fluido (WS base TF + 250ms); Buy/Sell demo position." },',
    "changelog entry"
)

# ── 2. Corrige bug refreshAssetTickers ────────────────────────────────────────
# Linha antiga sobrescrevia o ticker FRESCO com o ANTIGO, travando o preço por 15s
html = rep(html,
    """async function refreshAssetTickers(silent=true){
  try{
    const all = await jget(`${BINANCE}/fapi/v1/ticker/24hr`);
    if(Array.isArray(all)){
      all.forEach(item => {
        if(item && symbols.includes(item.symbol)){
          assetTickerMap[item.symbol] = item;
        }
      });
      if(ticker && symbol) assetTickerMap[symbol] = ticker;
      refreshAssetUi();
    }
  }catch(err){
    if(!silent) console.warn(err);
  }
}""",
    """async function refreshAssetTickers(silent=true){
  try{
    const all = await jget(`${BINANCE}/fapi/v1/ticker/24hr`);
    if(Array.isArray(all)){
      all.forEach(item => {
        if(item && symbols.includes(item.symbol)){
          assetTickerMap[item.symbol] = item;
        }
      });
      // Atualiza ticker do ativo atual com dado fresco (bug anterior revertia para o antigo)
      const freshTk = assetTickerMap[symbol];
      if(freshTk){ ticker = freshTk; marketEntryPrice = Number(freshTk.lastPrice)||marketEntryPrice; }
      refreshAssetUi();
    }
  }catch(err){
    if(!silent) console.warn(err);
  }
}""",
    "fix refreshAssetTickers bug"
)

# ── 3. _fastPoll: poll REST 2s do ativo atual (ticker + última vela) ──────────
# Injeta depois do setInterval(refreshAssetTickers, ...)
FAST_POLL = """
// ── Poll rápido: ticker + última vela a cada 2 s (independente de WebSocket) ──
async function _fastPoll(){
  if(!symbol||!klines.length) return;
  try{
    const [tk, kl] = await Promise.all([
      jget(`${BINANCE}/fapi/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`),
      jget(`${BINANCE}/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=${isNativeTimeframe(interval)?interval:baseIntervalForTimeframe(interval)}&limit=2`)
    ]);

    // Atualiza ticker e cabeçalho de preço
    if(tk && tk.lastPrice){
      ticker = tk;
      assetTickerMap[symbol] = tk;
      marketEntryPrice = Number(tk.lastPrice)||marketEntryPrice;
      if(els.lastPrice) els.lastPrice.textContent = fmtPrice(+tk.lastPrice);
      const ch = +tk.priceChangePercent||0;
      if(els.changePct){
        els.changePct.textContent = pct(ch);
        els.changePct.style.color = ch>=0?'var(--green)':'var(--red)';
      }
      syncTradePanel();
    }

    // Atualiza última vela (close/high/low)
    if(Array.isArray(kl)&&kl.length){
      const row = kl[kl.length-1];
      const baseT = +row[0];
      const tMs   = intervalMs(interval);
      const targetT = isNativeTimeframe(interval) ? baseT : Math.floor(baseT/tMs)*tMs;
      const last    = klines[klines.length-1];
      if(last && last.time===targetT){
        const h=+row[2], l=+row[3], c=+row[4];
        if(h>last.high) last.high=h;
        if(l<last.low)  last.low=l;
        last.close=c;
      } else if(last && targetT>last.time){
        klines.push({time:targetT,open:+row[1],high:+row[2],low:+row[3],close:+row[4],
                     volume:+row[5],quoteVolume:+row[7]||0,buyVolume:+row[9]||0});
      }
    }

    drawSoon();
  }catch(_){}
}
setInterval(_fastPoll, 2000);
setTimeout(_fastPoll, 300); // primeiro tick logo no boot
"""

html = rep(html,
    'setInterval(()=>refreshAssetTickers(true), 10000);\n',
    'setInterval(()=>refreshAssetTickers(true), 10000);\n' + FAST_POLL,
    "inject _fastPoll"
)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n✓ patch_633 aplicado — {SRC}")
