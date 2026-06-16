# patch_605.py — Beta 0.605
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.604)
#
# Reescreve DV usando EXATAMENTE o mesmo modelo do OI:
#   - panelMetrics idêntico ao OI (top/h/w/scaleW/labelGap/labelW/y0=top+4/y1=top+h-6)
#   - yMap idêntico ao OI (usa m.y1-m.y0 em vez de m.h)
#   - basePanel copiado do OI (fundo, grid, separador vertical, título)
#   - drawScaleTag copiado do OI (tag azul com valor atual)
#   - draw() com ctx.save/clip/restore igual ao OI
#
# VERSION: 0.604 → 0.605

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

# ── 1. DV panelMetrics → cópia exata do OI ───────────────────────────────────
html = rep(html,
    '  function panelMetrics(padL,padR,top,h,w){\n'
    '    const labelGap = (typeof PRICE_LABEL_GAP!=="undefined"?PRICE_LABEL_GAP:2);\n'
    '    const labelW   = (typeof PRICE_LABEL_W!=="undefined"?PRICE_LABEL_W:51);\n'
    '    const x0=padL, x1=w-padR, y0=top, y1=top+h;\n'
    '    return { x0, x1, y0, y1, w:x1-x0, h, labelGap, labelW };\n'
    '  }',

    '  function panelMetrics(padL, padR, top, h, w){\n'
    '    const scaleW  = (typeof PRICE_SCALE_W  !=="undefined" ? PRICE_SCALE_W  : 55);\n'
    '    const labelGap= (typeof PRICE_LABEL_GAP!=="undefined" ? PRICE_LABEL_GAP : 2);\n'
    '    const labelW  = (typeof PRICE_LABEL_W  !=="undefined" ? PRICE_LABEL_W   : scaleW - 4);\n'
    '    const x0 = padL, x1 = w - padR;\n'
    '    const y0 = top + 4, y1 = top + h - 6;\n'
    '    return { padL, padR, top, h, w, scaleW, labelGap, labelW, x0, x1, y0, y1,\n'
    '             scaleX0:x1+labelGap, scaleX1:x1+labelGap+labelW };\n'
    '  }',

    'DV panelMetrics: OI-identical'
)

# ── 2. DV yMap → cópia exata do OI ───────────────────────────────────────────
html = rep(html,
    '  function yMap(m, val, sc){\n'
    '    const { min, max } = sc;\n'
    '    const range = max - min || 1;\n'
    '    return m.y1 - ((val - min) / range) * m.h;\n'
    '  }',

    '  function yMap(m, v, sc){\n'
    '    return m.y1 - (v - sc.min) / Math.max(sc.max - sc.min, 0.000001) * (m.y1 - m.y0);\n'
    '  }',

    'DV yMap: OI-identical'
)

# ── 3. Inserir fmtDelta + basePanel + drawScaleTag antes de draw() ────────────
html = rep(html,
    '  function draw(ctx, padL, padR, top, h, w){\n'
    '    if(!CACHE.fetching && on()) ensureData(false);\n'
    '\n'
    '    const m = panelMetrics(padL, padR, top, h, w);\n'
    '    const win = oscillatorWindow();\n'
    '    const view = win.candles || [];\n'
    '\n'
    '    if(!view.length || !CACHE.data.length){\n'
    '      ctx.fillStyle = "rgba(120,145,180,.45)";',

    '  function fmtDelta(v){\n'
    '    const a = Math.abs(v);\n'
    '    const s = a>=1e6?(a/1e6).toFixed(1)+"M": a>=1e3?(a/1e3).toFixed(1)+"K": Math.round(a).toString();\n'
    '    return v < 0 ? "-"+s : s;\n'
    '  }\n'
    '\n'
    '  function basePanel(ctx, m, title, right, kind){\n'
    '    ctx.save();\n'
    '    ctx.fillStyle = "#020812";\n'
    '    ctx.fillRect(0, m.top, m.w, m.h);\n'
    '    ctx.strokeStyle = "rgba(64,105,145,.22)";\n'
    '    ctx.lineWidth = 1;\n'
    '    ctx.beginPath(); ctx.moveTo(0, m.top + .5); ctx.lineTo(m.w, m.top + .5); ctx.stroke();\n'
    '    ctx.strokeStyle = "rgba(64,105,145,.105)"; ctx.lineWidth = .85;\n'
    '    for(let n=1; n<=3; n++){\n'
    '      const y = m.y0 + (m.y1-m.y0)*n/4;\n'
    '      ctx.beginPath(); ctx.moveTo(m.x0, y); ctx.lineTo(m.x1, y); ctx.stroke();\n'
    '    }\n'
    '    ctx.fillStyle = "#020812"; ctx.fillRect(m.x1, m.top, m.w-m.x1, m.h);\n'
    '    ctx.strokeStyle = "rgba(64,105,145,.26)";\n'
    '    ctx.beginPath(); ctx.moveTo(m.x1+.5, m.top); ctx.lineTo(m.x1+.5, m.top+m.h); ctx.stroke();\n'
    '    const headY = m.y0 + 12;\n'
    '    ctx.font = "850 9px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";\n'
    '    ctx.fillStyle = "rgba(223,238,255,.84)"; ctx.fillText(title, m.x0 + 18, headY);\n'
    '    ctx.font = "800 8px system-ui"; ctx.textAlign = "right";\n'
    '    ctx.fillStyle = kind==="bear"?"rgba(255,95,110,.88)":kind==="bull"?"rgba(0,220,190,.88)":"rgba(135,155,185,.86)";\n'
    '    ctx.fillText(right || "", m.x1 - 8, headY);\n'
    '    ctx.restore();\n'
    '  }\n'
    '\n'
    '  function drawScaleTag(ctx, m, value, sc){\n'
    '    const yy = Math.max(m.y0+18, Math.min(m.y1-18, yMap(m, value, sc)));\n'
    '    const tx = m.x1 + m.labelGap, tagW = m.labelW, tagH = 34;\n'
    '    if(typeof roundRect==="function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, 6, true, false, "#18d7ff");\n'
    '    else{ ctx.fillStyle="#18d7ff"; ctx.fillRect(tx, yy-tagH/2, tagW, tagH); }\n'
    '    ctx.fillStyle="#02120b"; ctx.font="900 8px system-ui";\n'
    '    ctx.textAlign="center"; ctx.textBaseline="middle";\n'
    '    ctx.fillText(fmtDelta(value), tx+tagW/2, yy);\n'
    '  }\n'
    '\n'
    '  function draw(ctx, padL, padR, top, h, w){\n'
    '    if(!CACHE.fetching && on()) ensureData(false);\n'
    '\n'
    '    const m = panelMetrics(padL, padR, top, h, w);\n'
    '    const win = oscillatorWindow();\n'
    '    const view = win.candles || [];\n'
    '\n'
    '    if(!view.length || !CACHE.data.length){\n'
    '      ctx.fillStyle = "rgba(120,145,180,.45)";',

    'DV: fmtDelta+basePanel+drawScaleTag inserted'
)

# ── 4. Reescrever corpo do draw() ─────────────────────────────────────────────
html = rep(html,
    '    if(!view.length || !CACHE.data.length){\n'
    '      ctx.fillStyle = "rgba(120,145,180,.45)";\n'
    '      ctx.font = "11px system-ui";\n'
    '      ctx.textAlign = "center";\n'
    '      ctx.textBaseline = "middle";\n'
    '      ctx.fillText(CACHE.fetching ? "Loading Delta Volume…" : "No delta data", (m.x0+m.x1)/2, m.y0+m.h/2);\n'
    '      return;\n'
    '    }\n'
    '\n'
    '    const visibleData = [];\n'
    '    for(const c of view){\n'
    '      const d = valueAt(CACHE.data, Number(c.time));\n'
    '      if(d) visibleData.push(d);\n'
    '    }\n'
    '    const sc = barScale(visibleData.length ? visibleData : CACHE.data.slice(-160));\n'
    '    const zero = yMap(m, 0, sc);\n'
    '\n'
    '    const bw = Math.max(2, Math.min(11, ((m.x1-m.x0) / Math.max(1, win.totalSlots || view.length || 80)) * 0.72));\n'
    '\n'
    '    // bars\n'
    '    for(let i=0; i<view.length; i++){\n'
    '      const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '      if(!d) continue;\n'
    '      const xx = xForIndex(i, m, win);\n'
    '      const yy = yMap(m, d.delta, sc);\n'
    '      const barTop = Math.min(yy, zero);\n'
    '      const barH = Math.max(1, Math.abs(yy - zero));\n'
    '      ctx.fillStyle = d.delta >= 0 ? "rgba(46,213,115,.82)" : "rgba(255,71,87,.82)";\n'
    '      ctx.fillRect(xx - bw/2, barTop, bw, barH);\n'
    '    }\n'
    '\n'
    '    // zero line\n'
    '    ctx.strokeStyle = "rgba(120,145,180,.35)";\n'
    '    ctx.lineWidth = 1;\n'
    '    ctx.setLineDash([3,3]);\n'
    '    ctx.beginPath();\n'
    '    ctx.moveTo(m.x0, zero);\n'
    '    ctx.lineTo(m.x1, zero);\n'
    '    ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '\n'
    '    // MA line\n'
    '    const maLen = Math.max(2, Math.round(state.maLen)||0);\n'
    '    if(state.maLen >= 2 && CACHE.data.length >= 2){\n'
    '      const allDeltas = CACHE.data.map(d=>d.delta);\n'
    '      const prefix = new Array(allDeltas.length+1).fill(0);\n'
    '      for(let i=0;i<allDeltas.length;i++) prefix[i+1]=prefix[i]+allDeltas[i];\n'
    '      const idxMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));\n'
    '      ctx.beginPath();\n'
    '      ctx.strokeStyle = "#ffd32a";\n'
    '      ctx.lineWidth = 1.5;\n'
    '      let started = false;\n'
    '      for(let i=0;i<view.length;i++){\n'
    '        const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '        if(!d) continue;\n'
    '        const idx = idxMap.get(d.t);\n'
    '        if(idx===undefined) continue;\n'
    '        const st = Math.max(0, idx-maLen+1);\n'
    '        const avg = (prefix[idx+1]-prefix[st])/(idx-st+1);\n'
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

    '    const visibleData = [];\n'
    '    for(const c of view){ const d = valueAt(CACHE.data, Number(c.time)); if(d) visibleData.push(d); }\n'
    '    const sc = barScale(visibleData.length ? visibleData : CACHE.data.slice(-160));\n'
    '    const last = visibleData.length ? visibleData[visibleData.length-1] : CACHE.data.at(-1);\n'
    '    const kind = !last ? "neutral" : last.delta > 0 ? "bull" : last.delta < 0 ? "bear" : "neutral";\n'
    '\n'
    '    ctx.save();\n'
    '    basePanel(ctx, m, "DELTA VOL 1m", last ? fmtDelta(last.delta) : (CACHE.fetching?"LOADING":"NO DATA"), kind);\n'
    '\n'
    '    if(!visibleData.length){\n'
    '      ctx.fillStyle="rgba(120,145,180,.65)"; ctx.font="800 9px system-ui";\n'
    '      ctx.textAlign="left"; ctx.textBaseline="middle";\n'
    '      ctx.fillText(CACHE.fetching?"Loading Delta Volume…":"No delta data", m.x0+18, (m.y0+m.y1)/2);\n'
    '      ctx.restore(); return;\n'
    '    }\n'
    '\n'
    '    ctx.save();\n'
    '    ctx.beginPath(); ctx.rect(m.x0, m.y0, m.x1-m.x0, Math.max(1, m.y1-m.y0)); ctx.clip();\n'
    '\n'
    '    const zero = yMap(m, 0, sc);\n'
    '    const bw = Math.max(2, Math.min(11, ((m.x1-m.x0) / Math.max(1, win.totalSlots || view.length || 80)) * 0.72));\n'
    '\n'
    '    for(let i=0; i<view.length; i++){\n'
    '      const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '      if(!d) continue;\n'
    '      const xx = xForIndex(i, m, win);\n'
    '      if(xx < m.x0-12 || xx > m.x1+12) continue;\n'
    '      const yy = yMap(m, d.delta, sc);\n'
    '      const barTop = Math.min(yy, zero), barH = Math.max(1, Math.abs(yy-zero));\n'
    '      ctx.fillStyle = d.delta >= 0 ? "rgba(46,213,115,.82)" : "rgba(255,71,87,.82)";\n'
    '      ctx.fillRect(xx-bw/2, barTop, bw, barH);\n'
    '    }\n'
    '\n'
    '    ctx.strokeStyle="rgba(120,145,180,.35)"; ctx.lineWidth=1; ctx.setLineDash([3,3]);\n'
    '    ctx.beginPath(); ctx.moveTo(m.x0,zero); ctx.lineTo(m.x1,zero); ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '\n'
    '    if(state.maLen >= 2 && CACHE.data.length >= 2){\n'
    '      const maLen = Math.max(2, Math.round(state.maLen));\n'
    '      const allD = CACHE.data.map(d=>d.delta);\n'
    '      const pfx = new Array(allD.length+1).fill(0);\n'
    '      for(let i=0;i<allD.length;i++) pfx[i+1]=pfx[i]+allD[i];\n'
    '      const iMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));\n'
    '      ctx.beginPath(); ctx.strokeStyle="#ffd32a"; ctx.lineWidth=1.5; let ok=false;\n'
    '      for(let i=0;i<view.length;i++){\n'
    '        const d=valueAt(CACHE.data,Number(view[i].time)); if(!d) continue;\n'
    '        const idx=iMap.get(d.t); if(idx===undefined) continue;\n'
    '        const st=Math.max(0,idx-maLen+1), avg=(pfx[idx+1]-pfx[st])/(idx-st+1);\n'
    '        const xx=xForIndex(i,m,win), yy=yMap(m,avg,sc);\n'
    '        if(!ok){ctx.moveTo(xx,yy);ok=true;}else ctx.lineTo(xx,yy);\n'
    '      }\n'
    '      if(ok) ctx.stroke();\n'
    '    }\n'
    '\n'
    '    ctx.restore();\n'
    '\n'
    '    ctx.font="9.2px system-ui"; ctx.textAlign="left"; ctx.textBaseline="middle";\n'
    '    ctx.fillStyle="rgba(200,213,230,.72)";\n'
    '    for(let i=0; i<=4; i++){\n'
    '      const v = sc.max - (sc.max-sc.min)*i/4;\n'
    '      ctx.fillText(fmtDelta(v), m.x1+m.labelGap, yMap(m,v,sc));\n'
    '    }\n'
    '    if(last) drawScaleTag(ctx, m, last.delta, sc);\n'
    '\n'
    '    ctx.restore();\n'
    '  }',

    'DV draw(): OI-style body'
)

# ── Version bump 0.604 → 0.605 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.604";',
    'const DVL_APP_VERSION = "Beta 0.605";',
    'DVL_APP_VERSION 0.604→0.605'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: DV barras alinhadas com velas via xForIndex/totalSlots; escala com estilo OI; panelMetrics com labelGap." },',
    '{ version: DVL_APP_VERSION, note: "Refactor: DV agora usa exatamente o mesmo modelo do OI — basePanel, panelMetrics, xForIndex, yMap, drawScaleTag identicos." },\n'
    '  { version: "Beta 0.604", note: "Bugfix: DV alinhamento e escala OI-style." },',
    'DVL_CHANGELOG 0.605'
)
html = rep(html,
    'BETA 0.604</div>',
    'BETA 0.605</div>',
    'versionBadge 0.604→0.605'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.604</title>',
    '<title>DVL Binance Live — Beta 0.605</title>',
    'title 0.604→0.605'
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
