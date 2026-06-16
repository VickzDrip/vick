# patch_606.py — Beta 0.606
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.605)
#
# FIXES:
#   1. TV panelMetrics → OI-identical (scaleW, labelGap, labelW, y0/y1 padding)
#   2. TV draw() → OI model (basePanel, ctx.save/clip/restore, scale ticks)
#      + Corrige bug de timestamp: candles.time já é ms, remover * 1000
#   3. Volume Trace 1s: substitui fetchAggTradeCandles (inviável para BTCUSDT
#      por volume extremo de aggTrades) por /api/ticks/bars — mesmo endpoint
#      do TV, que já agrega em 1s via coletor VPS
#   4. Volume Trace buildLowerEvents: fallback de preço ao midpoint do candle
#      pai quando dados de tick não trazem OHLCV
#
# VERSION: 0.605 → 0.606

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes  = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    fixes.append(label)
    return html.replace(old, new)

# ── 1+2. TV panelMetrics + oscillatorWindow + basePanel + draw() ─────────────
html = rep(html,
    '  function panelMetrics(padL,padR,top,h,w){\n'
    '    return { x0:padL, x1:w-padR, y0:top, y1:top+h, w:w-padL-padR, h };\n'
    '  }\n'
    '\n'
    '  function oscillatorWindow(){\n'
    '    try{ if(typeof visibleWindow==="function") return visibleWindow(); }catch(_){}\n'
    '    const count = (typeof chartViewCount!=="undefined" ? chartViewCount : 140);\n'
    '    return { candles:[], totalSlots:count, futureSlots:0, start:0, end:0 };\n'
    '  }\n'
    '\n'
    '  function draw(ctx, padL, padR, top, h, w){\n'
    '    if(!on()) return;\n'
    '\n'
    '    const m       = panelMetrics(padL, padR, top, h, w);\n'
    '    const win     = oscillatorWindow();\n'
    '    const candles = win.candles || [];\n'
    '\n'
    '    if(!candles.length){\n'
    '      ctx.fillStyle="rgba(120,145,180,.45)"; ctx.font="11px system-ui";\n'
    '      ctx.textAlign="center"; ctx.textBaseline="middle";\n'
    '      ctx.fillText("Sem candles visíveis", (m.x0+m.x1)/2, m.y0+m.h/2);\n'
    '      return;\n'
    '    }\n'
    '\n'
    '    // Intervalo de tempo visível\n'
    '    const pMs = candles.length > 1\n'
    '      ? (Number(candles[1].time) - Number(candles[0].time)) * 1000\n'
    '      : 60000;\n'
    '    const t0 = Number(candles[0].time) * 1000;\n'
    '    const t1 = Number(candles[candles.length-1].time) * 1000 + pMs;\n'
    '\n'
    '    // Dispara fetch em background se necessário\n'
    '    ensureData(t0, t1);\n'
    '\n'
    '    const rawBars = CACHE.bars.filter(b => b.ts >= t0 && b.ts <= t1);\n'
    '\n'
    '    if(!rawBars.length){\n'
    '      ctx.fillStyle="rgba(120,145,180,.45)"; ctx.font="11px system-ui";\n'
    '      ctx.textAlign="center"; ctx.textBaseline="middle";\n'
    '      ctx.fillText(CACHE.key ? "Aguardando dados de ticks…" : "Coletor não disponível (/api/ticks)", (m.x0+m.x1)/2, m.y0+m.h/2);\n'
    '      return;\n'
    '    }\n'
    '\n'
    '    // Auto-agregação: mínimo 1.5px por barra\n'
    '    const rangeMs   = t1 - t0;\n'
    '    const minAggSec = Math.ceil(rangeMs / 1000 / (m.w / 1.5));\n'
    '    const aggSec    = NICE_AGG.find(v => v >= minAggSec) || 600;\n'
    '    const aggMs     = aggSec * 1000;\n'
    '    const bars      = aggregateBars(rawBars, aggMs);\n'
    '\n'
    '    if(!bars.length) return;\n'
    '\n'
    '    // Escala\n'
    '    let maxVol = 0;\n'
    '    for(const b of bars){\n'
    '      if(b.buyVol  > maxVol) maxVol = b.buyVol;\n'
    '      if(b.sellVol > maxVol) maxVol = b.sellVol;\n'
    '    }\n'
    '    if(!maxVol) maxVol = 1;\n'
    '\n'
    '    const cx   = m.y0 + m.h / 2;   // linha zero\n'
    '    const half = m.h / 2 * 0.92;\n'
    '    const barW = Math.max(1, aggMs / rangeMs * m.w);\n'
    '\n'
    '    // Barras\n'
    '    for(const b of bars){\n'
    '      const x   = m.x0 + (b.ts - t0) / rangeMs * m.w;\n'
    '      const bh  = Math.max(1, b.buyVol  / maxVol * half);\n'
    '      const sh  = Math.max(1, b.sellVol / maxVol * half);\n'
    '\n'
    '      // Buy (verde, acima da linha zero)\n'
    '      ctx.fillStyle = "rgba(46,213,115,.85)";\n'
    '      ctx.fillRect(x, cx - bh, Math.max(1, barW - 1), bh);\n'
    '\n'
    '      // Sell (vermelho, abaixo da linha zero)\n'
    '      ctx.fillStyle = "rgba(255,71,87,.85)";\n'
    '      ctx.fillRect(x, cx, Math.max(1, barW - 1), sh);\n'
    '    }\n'
    '\n'
    '    // Linha zero\n'
    '    ctx.strokeStyle = "rgba(120,145,180,.4)";\n'
    '    ctx.lineWidth   = 1;\n'
    '    ctx.setLineDash([3,3]);\n'
    '    ctx.beginPath();\n'
    '    ctx.moveTo(m.x0, cx);\n'
    '    ctx.lineTo(m.x1, cx);\n'
    '    ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '\n'
    '    // Label\n'
    '    ctx.fillStyle   = "rgba(120,145,180,.78)";\n'
    '    ctx.font        = "760 8px system-ui";\n'
    '    ctx.textAlign   = "left";\n'
    '    ctx.textBaseline= "bottom";\n'
    '    const aggLabel  = aggSec >= 60 ? (aggSec/60)+"m" : aggSec+"s";\n'
    '    ctx.fillText("TICK VOL "+aggLabel+" \xb7 BUY/SELL", m.x0 + 8, m.y1 - 5);\n'
    '  }',

    '  function panelMetrics(padL,padR,top,h,w){\n'
    '    const scaleW  = (typeof PRICE_SCALE_W  !=="undefined" ? PRICE_SCALE_W  : 55);\n'
    '    const labelGap= (typeof PRICE_LABEL_GAP!=="undefined" ? PRICE_LABEL_GAP : 2);\n'
    '    const labelW  = (typeof PRICE_LABEL_W  !=="undefined" ? PRICE_LABEL_W   : scaleW - 4);\n'
    '    const x0=padL, x1=w-padR, y0=top+4, y1=top+h-6;\n'
    '    return { padL, padR, top, h, w, scaleW, labelGap, labelW, x0, x1, y0, y1,\n'
    '             scaleX0:x1+labelGap, scaleX1:x1+labelGap+labelW };\n'
    '  }\n'
    '\n'
    '  function oscillatorWindow(){\n'
    '    try{ if(typeof visibleWindow==="function") return visibleWindow(); }catch(_){}\n'
    '    const count = (typeof chartViewCount!=="undefined" ? chartViewCount : 140);\n'
    '    return { candles:[], totalSlots:count, futureSlots:0, start:0, end:0 };\n'
    '  }\n'
    '\n'
    '  function basePanel(ctx, m, title, rightLabel, kind){\n'
    '    ctx.save();\n'
    '    ctx.fillStyle="#020812"; ctx.fillRect(0, m.top, m.w, m.h);\n'
    '    ctx.strokeStyle="rgba(32,48,70,.9)"; ctx.lineWidth=1;\n'
    '    ctx.beginPath(); ctx.moveTo(0,m.top); ctx.lineTo(m.w,m.top); ctx.stroke();\n'
    '    ctx.strokeStyle="rgba(28,42,60,.55)";\n'
    '    for(let i=1;i<=4;i++){\n'
    '      const gy=m.top+m.h*i/4;\n'
    '      ctx.beginPath(); ctx.moveTo(m.x0,gy); ctx.lineTo(m.x1,gy); ctx.stroke();\n'
    '    }\n'
    '    ctx.strokeStyle="rgba(32,48,70,.9)";\n'
    '    ctx.beginPath(); ctx.moveTo(m.x1,m.top); ctx.lineTo(m.x1,m.top+m.h); ctx.stroke();\n'
    '    if(title){\n'
    '      ctx.fillStyle="rgba(120,145,180,.78)"; ctx.font="760 8px system-ui";\n'
    '      ctx.textAlign="left"; ctx.textBaseline="top";\n'
    '      ctx.fillText(title, m.x0+5, m.top+6);\n'
    '    }\n'
    '    if(rightLabel){\n'
    '      const c=kind==="bull"?"#2ed573":kind==="bear"?"#ff4757":"rgba(140,165,200,.7)";\n'
    '      ctx.fillStyle=c; ctx.font="9px system-ui";\n'
    '      ctx.textAlign="right"; ctx.textBaseline="top";\n'
    '      ctx.fillText(rightLabel, m.x1-4, m.top+6);\n'
    '    }\n'
    '    ctx.restore();\n'
    '  }\n'
    '\n'
    '  function draw(ctx, padL, padR, top, h, w){\n'
    '    if(!on()) return;\n'
    '\n'
    '    const m   = panelMetrics(padL, padR, top, h, w);\n'
    '    const win = oscillatorWindow();\n'
    '    const candles = win.candles || [];\n'
    '\n'
    '    if(!candles.length){\n'
    '      basePanel(ctx, m, "TICK VOL \xb7 BUY/SELL", null, null);\n'
    '      return;\n'
    '    }\n'
    '\n'
    '    // klines.time já é ms — sem * 1000\n'
    '    const pMs = candles.length > 1\n'
    '      ? (Number(candles[1].time) - Number(candles[0].time))\n'
    '      : 60000;\n'
    '    const t0 = Number(candles[0].time);\n'
    '    const t1 = Number(candles[candles.length-1].time) + pMs;\n'
    '\n'
    '    ensureData(t0, t1);\n'
    '\n'
    '    const rawBars = CACHE.bars.filter(b => b.ts >= t0 && b.ts <= t1);\n'
    '\n'
    '    if(!rawBars.length){\n'
    '      const msg = CACHE.key ? "Aguardando ticks…" : "Sem coletor (/api/ticks)";\n'
    '      basePanel(ctx, m, "TICK VOL \xb7 BUY/SELL", msg, null);\n'
    '      return;\n'
    '    }\n'
    '\n'
    '    const rangeMs   = t1 - t0;\n'
    '    const minAggSec = Math.ceil(rangeMs / 1000 / ((m.x1-m.x0) / 1.5));\n'
    '    const aggSec    = NICE_AGG.find(v => v >= minAggSec) || 600;\n'
    '    const aggMs     = aggSec * 1000;\n'
    '    const bars      = aggregateBars(rawBars, aggMs);\n'
    '\n'
    '    if(!bars.length){ basePanel(ctx, m, "TICK VOL \xb7 BUY/SELL", null, null); return; }\n'
    '\n'
    '    let maxVol=0;\n'
    '    for(const b of bars){\n'
    '      if(b.buyVol  > maxVol) maxVol = b.buyVol;\n'
    '      if(b.sellVol > maxVol) maxVol = b.sellVol;\n'
    '    }\n'
    '    if(!maxVol) maxVol=1;\n'
    '\n'
    '    const fmtV = v => { const a=Math.abs(v); return a>=1e6?(a/1e6).toFixed(1)+"M":a>=1e3?(a/1e3).toFixed(1)+"K":Math.round(a).toString(); };\n'
    '    const aggLabel = aggSec >= 60 ? (aggSec/60)+"m" : aggSec+"s";\n'
    '    const lastBar  = bars[bars.length-1];\n'
    '    const netDelta = (lastBar.buyVol||0) - (lastBar.sellVol||0);\n'
    '    const kind = netDelta > 0 ? "bull" : netDelta < 0 ? "bear" : null;\n'
    '    basePanel(ctx, m, "TICK VOL "+aggLabel, fmtV(netDelta), kind);\n'
    '\n'
    '    ctx.save();\n'
    '    ctx.beginPath();\n'
    '    ctx.rect(m.x0, m.y0, m.x1-m.x0, m.y1-m.y0);\n'
    '    ctx.clip();\n'
    '\n'
    '    const midY = (m.y0+m.y1)/2;\n'
    '    const half = (m.y1-m.y0)/2*0.90;\n'
    '    const barW = Math.max(1, aggMs/rangeMs*(m.x1-m.x0));\n'
    '\n'
    '    for(const b of bars){\n'
    '      const x  = m.x0 + (b.ts-t0)/rangeMs*(m.x1-m.x0);\n'
    '      const bh = Math.max(1, b.buyVol /maxVol*half);\n'
    '      const sh = Math.max(1, b.sellVol/maxVol*half);\n'
    '      ctx.fillStyle="rgba(46,213,115,.85)";\n'
    '      ctx.fillRect(x, midY-bh, Math.max(1,barW-1), bh);\n'
    '      ctx.fillStyle="rgba(255,71,87,.85)";\n'
    '      ctx.fillRect(x, midY, Math.max(1,barW-1), sh);\n'
    '    }\n'
    '\n'
    '    ctx.strokeStyle="rgba(120,145,180,.35)"; ctx.lineWidth=1; ctx.setLineDash([3,3]);\n'
    '    ctx.beginPath(); ctx.moveTo(m.x0,midY); ctx.lineTo(m.x1,midY); ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '\n'
    '    ctx.restore();\n'
    '\n'
    '    ctx.font="9.2px system-ui"; ctx.textAlign="left"; ctx.textBaseline="middle";\n'
    '    ctx.fillStyle="rgba(200,213,230,.72)";\n'
    '    ctx.fillText(fmtV(maxVol), m.x1+m.labelGap, m.y0+8);\n'
    '    ctx.fillText(fmtV(maxVol), m.x1+m.labelGap, m.y1-8);\n'
    '    ctx.fillStyle="rgba(140,160,190,.5)";\n'
    '    ctx.fillText("0", m.x1+m.labelGap, midY);\n'
    '  }',

    'TV panelMetrics+basePanel+draw: OI model + timestamp fix'
)

# ── 3. Volume Trace: adiciona fetchTickBars antes de loadLowerData ─────────────
html = rep(html,
    '  async function loadLowerData(state, cfg){',

    '  async function fetchTickBars(symbolName, start, end){\n'
    '    const url = "/api/ticks/bars?symbol="+encodeURIComponent(symbolName)+"&from="+start+"&to="+end;\n'
    '    const r = await fetch(url);\n'
    '    if(!r.ok) throw new Error("HTTP "+r.status);\n'
    '    const bars = await r.json();\n'
    '    if(!Array.isArray(bars)) return [];\n'
    '    return bars.map(b => ({\n'
    '      time: b.ts,\n'
    '      volume: (b.buyVol||0) + (b.sellVol||0),\n'
    '      buyVolume: b.buyVol||0,\n'
    '      sellVolume: b.sellVol||0,\n'
    '      low:0, high:0, close:0\n'
    '    }));\n'
    '  }\n'
    '\n'
    '  async function loadLowerData(state, cfg){',

    'VT fetchTickBars: /api/ticks/bars adapter'
)

# ── 4. Volume Trace loadLowerData: usar fetchTickBars em vez de aggTrades ──────
html = rep(html,
    '      if(parsed.unit === "s"){\n'
    '        data = await fetchAggTradeCandles(sym(), tf, rangeStart, rangeEnd);\n'
    '      }else{',

    '      if(parsed.unit === "s"){\n'
    '        data = await fetchTickBars(sym(), rangeStart, rangeEnd);\n'
    '      }else{',

    'VT loadLowerData: fetchTickBars para unidade s'
)

# ── 5. Volume Trace buildLowerEvents: fallback de preço ao midpoint do pai ─────
html = rep(html,
    '      const low = clamp(Math.min(Number(c.low), Number(c.high)), pLow, pHigh);\n'
    '      const high = clamp(Math.max(Number(c.low), Number(c.high)), pLow, pHigh);\n'
    '      const priceRaw = (Number(c.close) * 2 + Number(c.high) + Number(c.low)) / 4;\n'
    '      const price = clamp(priceRaw, pLow, pHigh);',

    '      const mid = (pLow + pHigh) / 2;\n'
    '      const low  = (c.low||0)  ? clamp(Math.min(Number(c.low),Number(c.high)),pLow,pHigh) : mid;\n'
    '      const high = (c.high||0) ? clamp(Math.max(Number(c.low),Number(c.high)),pLow,pHigh) : mid;\n'
    '      const priceRaw = (c.close||0) ? (Number(c.close)*2+Number(c.high)+Number(c.low))/4 : mid;\n'
    '      const price = clamp(priceRaw, pLow, pHigh);',

    'VT buildLowerEvents: price fallback to candle midpoint'
)

# ── Version bump 0.605 → 0.606 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.605";',
    'const DVL_APP_VERSION = "Beta 0.606";',
    'DVL_APP_VERSION 0.605→0.606'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Refactor: DV agora usa exatamente o mesmo modelo do OI — basePanel, panelMetrics, xForIndex, yMap, drawScaleTag identicos." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: TV timestamp (sem *1000); TV OI model (basePanel+panelMetrics); VT 1s usa /api/ticks/bars em vez de aggTrades; VT price fallback ao midpoint do candle pai." },\n'
    '  { version: "Beta 0.605", note: "Refactor: DV modelo OI identico — basePanel, panelMetrics, xForIndex, yMap, drawScaleTag." },',
    'DVL_CHANGELOG 0.606'
)
html = rep(html,
    'BETA 0.605</div>',
    'BETA 0.606</div>',
    'versionBadge 0.605→0.606'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.605</title>',
    '<title>DVL Binance Live — Beta 0.606</title>',
    'title 0.605→0.606'
)

# ── Result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  ', e)
    print('Aborting write.')
    sys.exit(1)
else:
    print('All checks passed.')

print('Applied (%d fixes):' % len(fixes))
for f in fixes: print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

print()
print('Written to', DST)
print('Total lines after patch: %d' % (html.count('\n') + 1))
