# patch_616.py — Beta 0.616
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.615)
#
# FEATURE — Volume Profile buy/sell por barra
#
#   1. klines: adiciona buyVolume (+x[9]) ao map que converte linhas brutas
#      da Binance API para objetos (linha 15106). A API de klines do Binance
#      retorna takerBuyBaseAssetVolume no índice 9 de cada row.
#
#   2. computeVP: separado em buyBuckets + sellBuckets por faixa de preço.
#
#   3. draw: cada barra mostra o split buy/sell na MESMA coluna:
#        - Porção DIREITA (mais perto da escala de preço): buy → verde
#        - Porção ESQUERDA: sell → vermelho
#      Barras dentro da Value Area têm opacidade maior.
#      Cor da linha POC muda conforme dominância (buy=verde, sell=vermelho).
#
#   4. DEFAULTS / settings panel: troca colorIn/colorOut por colorBuy/colorSell.
#
# VERSION: 0.615 → 0.616

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

# ── 1. klines map: adiciona buyVolume (x[9]) ─────────────────────────────────
html = rep(html,
    'klines = k.map(x => ({\n'
    '      time:x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4], volume:+x[5], quoteVolume:+x[7]\n'
    '    }));',

    'klines = k.map(x => ({\n'
    '      time:x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4],\n'
    '      volume:+x[5], quoteVolume:+x[7], buyVolume:+x[9]\n'
    '    }));',

    'klines map: add buyVolume'
)

# ── 2. VP DEFAULTS: troca colorIn/colorOut por colorBuy/colorSell ─────────────
html = rep(html,
    '    colorIn:  "#18d7ff",\n'
    '    colorOut: "#2a3d55",\n'
    '    colorPOC: "#f3c768",',

    '    colorBuy:  "#13dc8d",\n'
    '    colorSell: "#ff4a61",\n'
    '    colorPOC:  "#f3c768",',

    'VP DEFAULTS: colorIn/Out → colorBuy/colorSell'
)

# ── 3. computeVP: buckets separados buy/sell ──────────────────────────────────
html = rep(html,
    '  // ── Volume Profile computation ────────────────────────────────────────────\n'
    '  function computeVP(view, priceMin, priceMax, rows){\n'
    '    const buckets = new Float64Array(rows);\n'
    '    const range = priceMax - priceMin;\n'
    '    if(range <= 0) return buckets;\n'
    '    for(const c of view){\n'
    '      const vol = Number(c.volume)||0;\n'
    '      if(!vol) continue;\n'
    '      const lo = Math.max(Number(c.low),  priceMin);\n'
    '      const hi = Math.min(Number(c.high), priceMax);\n'
    '      if(lo >= hi) continue;\n'
    '      const loI = Math.max(0,      Math.floor((lo - priceMin) / range * rows));\n'
    '      const hiI = Math.min(rows-1, Math.floor((hi - priceMin) / range * rows));\n'
    '      const n = hiI - loI + 1;\n'
    '      const vpb = vol / n;\n'
    '      for(let i = loI; i <= hiI; i++) buckets[i] += vpb;\n'
    '    }\n'
    '    return buckets;\n'
    '  }',

    '  // ── Volume Profile computation ────────────────────────────────────────────\n'
    '  function computeVP(view, priceMin, priceMax, rows){\n'
    '    const buy  = new Float64Array(rows);\n'
    '    const sell = new Float64Array(rows);\n'
    '    const range = priceMax - priceMin;\n'
    '    if(range <= 0) return { buy, sell };\n'
    '    for(const c of view){\n'
    '      const vol  = Number(c.volume)||0;\n'
    '      if(!vol) continue;\n'
    '      const bVol = Math.min(Number(c.buyVolume)||0, vol);\n'
    '      const sVol = Math.max(0, vol - bVol);\n'
    '      const lo = Math.max(Number(c.low),  priceMin);\n'
    '      const hi = Math.min(Number(c.high), priceMax);\n'
    '      if(lo >= hi) continue;\n'
    '      const loI = Math.max(0,      Math.floor((lo - priceMin) / range * rows));\n'
    '      const hiI = Math.min(rows-1, Math.floor((hi - priceMin) / range * rows));\n'
    '      const n = hiI - loI + 1;\n'
    '      for(let i = loI; i <= hiI; i++){\n'
    '        buy[i]  += bVol / n;\n'
    '        sell[i] += sVol / n;\n'
    '      }\n'
    '    }\n'
    '    return { buy, sell };\n'
    '  }',

    'computeVP: buy/sell separados'
)

# ── 4. draw: usa buyBuckets/sellBuckets + split por barra ─────────────────────
html = rep(html,
    '    const rows = Math.max(20, Math.min(500, Math.round(state.rows)||120));\n'
    '    const buckets = computeVP(view, min, max, rows);\n'
    '\n'
    '    let maxBucket = 0, totalVol = 0, pocIdx = 0;\n'
    '    for(let i = 0; i < rows; i++){\n'
    '      totalVol += buckets[i];\n'
    '      if(buckets[i] > maxBucket){ maxBucket = buckets[i]; pocIdx = i; }\n'
    '    }\n'
    '    if(!maxBucket) return;\n'
    '\n'
    '    // Value Area (default 70% do volume total, expandindo do POC)\n'
    '    const vaTarget = totalVol * Math.max(0.01, Math.min(1, state.valueAreaPct||0.70));\n'
    '    let vaVol = buckets[pocIdx];\n'
    '    let vaLo = pocIdx, vaHi = pocIdx;\n'
    '    while(vaVol < vaTarget && (vaLo > 0 || vaHi < rows-1)){\n'
    '      const nLo = vaLo > 0        ? buckets[vaLo-1] : 0;\n'
    '      const nHi = vaHi < rows-1  ? buckets[vaHi+1] : 0;\n'
    '      if(nHi >= nLo){ vaHi++; vaVol += buckets[vaHi]; }\n'
    '      else           { vaLo--; vaVol += buckets[vaLo]; }\n'
    '    }\n'
    '\n'
    '    const vpW  = Math.min(150, Math.max(40, (x1-x0) * (state.widthPct||0.18)));\n'
    '    const vpX0 = x1 - vpW;\n'
    '    const barH = (y1 - y0) / rows;\n'
    '    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));\n'
    '\n'
    '    ctx.save();\n'
    '\n'
    '    // ── Bars ──────────────────────────────────────────────────────────────\n'
    '    for(let i = 0; i < rows; i++){\n'
    '      if(!buckets[i]) continue;\n'
    '      const bw = (buckets[i] / maxBucket) * vpW;\n'
    '      const py = y1 - (i+1)*barH;\n'
    '      ctx.globalAlpha = op;\n'
    '      ctx.fillStyle   = (i >= vaLo && i <= vaHi) ? (state.colorIn||"#18d7ff") : (state.colorOut||"#2a3d55");\n'
    '      ctx.fillRect(x1 - bw, py, bw, Math.max(0.8, barH));\n'
    '    }\n'
    '    ctx.globalAlpha = 1;',

    '    const rows = Math.max(20, Math.min(500, Math.round(state.rows)||120));\n'
    '    const { buy: buyB, sell: sellB } = computeVP(view, min, max, rows);\n'
    '\n'
    '    let maxBucket = 0, totalVol = 0, pocIdx = 0;\n'
    '    for(let i = 0; i < rows; i++){\n'
    '      const t = buyB[i] + sellB[i];\n'
    '      totalVol += t;\n'
    '      if(t > maxBucket){ maxBucket = t; pocIdx = i; }\n'
    '    }\n'
    '    if(!maxBucket) return;\n'
    '\n'
    '    // Value Area (70% do volume total, expandindo do POC)\n'
    '    const vaTarget = totalVol * Math.max(0.01, Math.min(1, state.valueAreaPct||0.70));\n'
    '    let vaVol = buyB[pocIdx] + sellB[pocIdx];\n'
    '    let vaLo = pocIdx, vaHi = pocIdx;\n'
    '    while(vaVol < vaTarget && (vaLo > 0 || vaHi < rows-1)){\n'
    '      const nLo = vaLo > 0       ? buyB[vaLo-1]+sellB[vaLo-1] : 0;\n'
    '      const nHi = vaHi < rows-1  ? buyB[vaHi+1]+sellB[vaHi+1] : 0;\n'
    '      if(nHi >= nLo){ vaHi++; vaVol += buyB[vaHi]+sellB[vaHi]; }\n'
    '      else           { vaLo--; vaVol += buyB[vaLo]+sellB[vaLo]; }\n'
    '    }\n'
    '\n'
    '    const vpW  = Math.min(150, Math.max(40, (x1-x0) * (state.widthPct||0.18)));\n'
    '    const barH = (y1 - y0) / rows;\n'
    '    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));\n'
    '    const cBuy  = state.colorBuy  || "#13dc8d";\n'
    '    const cSell = state.colorSell || "#ff4a61";\n'
    '\n'
    '    ctx.save();\n'
    '\n'
    '    // ── Bars: split buy (direita) / sell (esquerda) ───────────────────────\n'
    '    for(let i = 0; i < rows; i++){\n'
    '      const total = buyB[i] + sellB[i];\n'
    '      if(!total) continue;\n'
    '      const bw   = (total / maxBucket) * vpW;\n'
    '      const buyW = (buyB[i] / total) * bw;\n'
    '      const py   = y1 - (i+1) * barH;\n'
    '      const bH   = Math.max(0.8, barH);\n'
    '      const inVA = i >= vaLo && i <= vaHi;\n'
    '      ctx.globalAlpha = inVA ? op : op * 0.55;\n'
    '      // Sell (esquerda, vermelho)\n'
    '      ctx.fillStyle = cSell;\n'
    '      ctx.fillRect(x1 - bw, py, bw - buyW, bH);\n'
    '      // Buy (direita, verde — mais perto da escala)\n'
    '      ctx.fillStyle = cBuy;\n'
    '      ctx.fillRect(x1 - buyW, py, buyW, bH);\n'
    '    }\n'
    '    ctx.globalAlpha = 1;',

    'draw: split buy/sell por barra'
)

# ── 5. POC line: cor dinâmica por dominância buy/sell ─────────────────────────
html = rep(html,
    '    // ── POC ───────────────────────────────────────────────────────────────\n'
    '    if(state.showPOC !== false){\n'
    '      const pocY = y1 - (pocIdx + 0.5) * barH;\n'
    '      ctx.strokeStyle = state.colorPOC || "#f3c768";',

    '    // ── POC ───────────────────────────────────────────────────────────────\n'
    '    if(state.showPOC !== false){\n'
    '      const pocY = y1 - (pocIdx + 0.5) * barH;\n'
    '      const pocDom = buyB[pocIdx] >= sellB[pocIdx] ? cBuy : cSell;\n'
    '      ctx.strokeStyle = state.colorPOC || pocDom;',

    'POC line: cor por dominância'
)

# ── 6. Settings panel HTML: colorIn/Out → colorBuy/colorSell ──────────────────
html = rep(html,
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>Cores das Barras</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          ${cField("dvlVPCIn","Value Area","colorIn")}\n'
    '          ${cField("dvlVPCOut","Fora VA","colorOut")}\n'
    '        </div>\n'
    '      </div>',

    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>Cores das Barras</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          ${cField("dvlVPCBuy","Buy (verde)","colorBuy")}\n'
    '          ${cField("dvlVPCSell","Sell (vermelho)","colorSell")}\n'
    '        </div>\n'
    '      </div>',

    'VP settings panel: colorBuy/colorSell'
)

# ── 7. Bind de color no settings: colorIn/Out → colorBuy/colorSell ────────────
html = rep(html,
    '    b("dvlVPCIn",   el=>{ state.colorIn=el.value; });\n'
    '    b("dvlVPCOut",  el=>{ state.colorOut=el.value; });',

    '    b("dvlVPCBuy",  el=>{ state.colorBuy=el.value; });\n'
    '    b("dvlVPCSell", el=>{ state.colorSell=el.value; });',

    'VP bind: colorBuy/colorSell'
)

# ── 8. Version bump 0.615 → 0.616 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.615";',
    'const DVL_APP_VERSION = "Beta 0.616";',
    'DVL_APP_VERSION 0.615→0.616'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: VP barras ancoradas em x1 (escala de preco), crescendo para a esquerda." },',
    '{ version: DVL_APP_VERSION, note: "Feature: VP barras com split buy/sell — buy na direita (verde), sell na esquerda (vermelho), POC cor dinamica." },\n'
    '  { version: "Beta 0.615", note: "Bugfix: VP barras ancoradas em x1 (escala de preco)." },',
    'DVL_CHANGELOG 0.616'
)
html = rep(html,
    'BETA 0.615</div>',
    'BETA 0.616</div>',
    'versionBadge 0.615→0.616'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.615</title>',
    '<title>DVL Binance Live — Beta 0.616</title>',
    'title 0.615→0.616'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.614",',
    '  window.DVLVolumeProfile = { version:"0.616",',
    'DVLVolumeProfile version 0.616'
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
