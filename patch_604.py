# patch_604.py — Beta 0.604
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.603)
#
# BUGFIXES DV (Delta Volume):
#   1. panelMetrics: adiciona labelGap + labelW (necessários para escala)
#   2. xForIndex: substituído pelo fórmula do OI (totalSlots + slotOffset)
#      → as barras agora se alinham com as velas do preço
#   3. draw(): barras e MA usam xForIndex em vez de cálculo manual
#   4. draw(): escala agora usa o mesmo estilo do OI (ctx.fillText direto
#      em m.x1 + m.labelGap com font/color idênticos)
#
# VERSION: 0.603 → 0.604

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

# ── 1. DV panelMetrics + oscillatorWindow + xForIndex ────────────────────────
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
    '  function xForIndex(i, m, win){\n'
    '    const total = (win.candles||[]).length;\n'
    '    if(!total) return m.x0;\n'
    '    const cw = m.w / total;\n'
    '    return m.x0 + (i + 0.5) * cw;\n'
    '  }',

    '  function panelMetrics(padL,padR,top,h,w){\n'
    '    const labelGap = (typeof PRICE_LABEL_GAP!=="undefined"?PRICE_LABEL_GAP:2);\n'
    '    const labelW   = (typeof PRICE_LABEL_W!=="undefined"?PRICE_LABEL_W:51);\n'
    '    const x0=padL, x1=w-padR, y0=top, y1=top+h;\n'
    '    return { x0, x1, y0, y1, w:x1-x0, h, labelGap, labelW };\n'
    '  }\n'
    '\n'
    '  function oscillatorWindow(){\n'
    '    try{ if(typeof visibleWindow==="function") return visibleWindow(); }catch(_){}\n'
    '    const count = (typeof chartViewCount!=="undefined" ? chartViewCount : 140);\n'
    '    return { candles:[], totalSlots:count, futureSlots:0, start:0, end:0 };\n'
    '  }\n'
    '\n'
    '  function xForIndex(i, m, win){\n'
    '    const slots = Math.max(2, win.totalSlots || 2);\n'
    '    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles||[]).length);\n'
    '    return m.x0 + (slotOffset + i) / (slots - 1) * (m.x1 - m.x0);\n'
    '  }',

    'DV panelMetrics+xForIndex: OI-aligned'
)

# ── 2. DV draw(): barras usam xForIndex ──────────────────────────────────────
html = rep(html,
    '    const total = view.length;\n'
    '    const cw = total > 0 ? m.w / total : 8;\n'
    '    const bw = Math.max(1, cw * 0.72);\n'
    '\n'
    '    // bars\n'
    '    for(let i=0; i<view.length; i++){\n'
    '      const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '      if(!d) continue;\n'
    '      const xx = m.x0 + (i + 0.5) * cw;',

    '    const bw = Math.max(2, Math.min(11, ((m.x1-m.x0) / Math.max(1, win.totalSlots || view.length || 80)) * 0.72));\n'
    '\n'
    '    // bars\n'
    '    for(let i=0; i<view.length; i++){\n'
    '      const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '      if(!d) continue;\n'
    '      const xx = xForIndex(i, m, win);',

    'DV draw: bars use xForIndex'
)

# ── 3. DV draw(): MA usa xForIndex + escala estilo OI ────────────────────────
html = rep(html,
    '        const xx = m.x0 + (i+0.5)*cw;\n'
    '        const yy = yMap(m, avg, sc);\n'
    '        if(!started){ ctx.moveTo(xx,yy); started=true; } else ctx.lineTo(xx,yy);\n'
    '      }\n'
    '      if(started) ctx.stroke();\n'
    '    }\n'
    '\n'
    '    // label\n'
    '    ctx.fillStyle = "rgba(120,145,180,.78)";\n'
    '    ctx.font = "760 8px system-ui";\n'
    '    ctx.textAlign = "left";\n'
    '    ctx.textBaseline = "bottom";\n'
    '    ctx.fillText("DELTA VOL 1m", m.x0 + 8, m.y1 - 5);\n'
    '\n'
    '    if(typeof drawDvlScale === "function"){\n'
    '      const fmtV = v => { const a=Math.abs(v); return a>=1e6?(v/1e6).toFixed(1)+"M":a>=1e3?(v/1e3).toFixed(1)+"K":Math.round(v).toString(); };\n'
    '      drawDvlScale(ctx, {x1:m.x1, y0:m.y0, y1:m.y1, right:w}, sc.min, sc.max, fmtV, null, null);\n'
    '    }\n'
    '  }',

    '        const xx = xForIndex(i, m, win);\n'
    '        const yy = yMap(m, avg, sc);\n'
    '        if(!started){ ctx.moveTo(xx,yy); started=true; } else ctx.lineTo(xx,yy);\n'
    '      }\n'
    '      if(started) ctx.stroke();\n'
    '    }\n'
    '\n'
    '    // label\n'
    '    ctx.fillStyle = "rgba(120,145,180,.78)";\n'
    '    ctx.font = "760 8px system-ui";\n'
    '    ctx.textAlign = "left";\n'
    '    ctx.textBaseline = "bottom";\n'
    '    ctx.fillText("DELTA VOL 1m", m.x0 + 8, m.y1 - 5);\n'
    '\n'
    '    // right-side scale — mesmo estilo do OI/LS\n'
    '    const fmtV = v => { const a=Math.abs(v); return a>=1e6?(v/1e6).toFixed(1)+"M":a>=1e3?(v/1e3).toFixed(1)+"K":Math.round(v).toString(); };\n'
    '    ctx.font = "9.2px system-ui";\n'
    '    ctx.textAlign = "left";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.fillStyle = "rgba(200,213,230,.72)";\n'
    '    for(let i=0; i<=4; i++){\n'
    '      const v = sc.max - (sc.max - sc.min) * i / 4;\n'
    '      ctx.fillText(fmtV(v), m.x1 + m.labelGap, yMap(m, v, sc));\n'
    '    }\n'
    '  }',

    'DV draw: MA xForIndex + OI-style scale'
)

# ── Version bump 0.603 → 0.604 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.603";',
    'const DVL_APP_VERSION = "Beta 0.604";',
    'DVL_APP_VERSION 0.603→0.604'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: DV/TV period() usava currentPeriod inexistente (1h hardcoded) — corrigido para interval global; painel settings agora abre; escala adicionada." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: DV barras alinhadas com velas via xForIndex/totalSlots; escala com estilo OI; panelMetrics com labelGap." },\n'
    '  { version: "Beta 0.603", note: "Bugfix: DV/TV period correto; painel settings abre; escala adicionada." },',
    'DVL_CHANGELOG 0.604'
)
html = rep(html,
    'BETA 0.603</div>',
    'BETA 0.604</div>',
    'versionBadge 0.603→0.604'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.603</title>',
    '<title>DVL Binance Live — Beta 0.604</title>',
    'title 0.603→0.604'
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
