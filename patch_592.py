# patch_592.py — Beta 0.592
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.591)
#
# FEATURE: Moving Average on Long/Short Ratio
#   - Adds maLen:14 to L/S DEFAULTS
#   - Draws orange MA line (#ff9f43) over the L/S ratio line
#   - Adds MA Length input to the L/S settings panel
#
# VERSION: 0.591 → 0.592

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

# ── 1. Add maLen to L/S DEFAULTS ─────────────────────────────────────────────
html = rep(html,
    '  const DEFAULTS = {\n'
    '    on:true,\n'
    '    mode:"global",\n'
    '    center:null,\n'
    '    range:null\n'
    '  };',

    '  const DEFAULTS = {\n'
    '    on:true,\n'
    '    mode:"global",\n'
    '    maLen:14,\n'
    '    center:null,\n'
    '    range:null\n'
    '  };',

    'LS DEFAULTS add maLen'
)

# ── 2. Draw MA line after the ratio line, before source label ─────────────────
html = rep(html,
    '        const lastPoint = points[points.length - 1];\n'
    '        ctx.fillStyle = "rgba(45,196,174,.96)";\n'
    '        ctx.beginPath();\n'
    '        ctx.arc(lastPoint.x, lastPoint.y, 2.4, 0, Math.PI * 2);\n'
    '        ctx.fill();\n'
    '      }\n'
    '\n'
    '      ctx.fillStyle = "rgba(120,145,180,.78)";\n'
    '      ctx.font = "760 8px system-ui";\n'
    '      ctx.textAlign = "left";\n'
    '      ctx.textBaseline = "bottom";\n'
    '      ctx.fillText(CACHE.src || "BINANCE GLOBAL", m.x0 + 8, m.y1 - 5);',

    '        const lastPoint = points[points.length - 1];\n'
    '        ctx.fillStyle = "rgba(45,196,174,.96)";\n'
    '        ctx.beginPath();\n'
    '        ctx.arc(lastPoint.x, lastPoint.y, 2.4, 0, Math.PI * 2);\n'
    '        ctx.fill();\n'
    '      }\n'
    '\n'
    '      // MA line\n'
    '      const _lsMALen = Math.max(2, Math.round(state.maLen) || 14);\n'
    '      if(_lsMALen && CACHE.data.length >= 2){\n'
    '        const _ratios = CACHE.data.map(d => d.ratio);\n'
    '        const _prefix = new Array(_ratios.length+1).fill(0);\n'
    '        for(let i=0;i<_ratios.length;i++) _prefix[i+1]=_prefix[i]+_ratios[i];\n'
    '        const _idxMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));\n'
    '        ctx.beginPath();\n'
    '        ctx.strokeStyle = "#ff9f43";\n'
    '        ctx.lineWidth = 1.5;\n'
    '        ctx.setLineDash([]);\n'
    '        let _started = false;\n'
    '        for(let i=0;i<view.length;i++){\n'
    '          const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '          if(!d) continue;\n'
    '          const idx = _idxMap.get(d.t);\n'
    '          if(idx===undefined) continue;\n'
    '          const st2 = Math.max(0, idx-_lsMALen+1);\n'
    '          const avg = (_prefix[idx+1]-_prefix[st2])/(idx-st2+1);\n'
    '          const xx2 = xForIndex(i, m, win);\n'
    '          const yy2 = yMap(m, avg, sc);\n'
    '          if(!_started){ ctx.moveTo(xx2,yy2); _started=true; } else ctx.lineTo(xx2,yy2);\n'
    '        }\n'
    '        if(_started) ctx.stroke();\n'
    '      }\n'
    '\n'
    '      ctx.fillStyle = "rgba(120,145,180,.78)";\n'
    '      ctx.font = "760 8px system-ui";\n'
    '      ctx.textAlign = "left";\n'
    '      ctx.textBaseline = "bottom";\n'
    '      ctx.fillText(CACHE.src || "BINANCE GLOBAL", m.x0 + 8, m.y1 - 5);',

    'LS draw MA line'
)

# ── 3. renderPanel: add MA Length field + binding ─────────────────────────────
html = rep(html,
    '    body.innerHTML = `\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>General</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlLSOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>\n'
    '          <div class="dvl-vt-field"><label>Mode</label><select id="dvlLSMode" class="dvl-vt-select"><option value="global" ${state.mode==="global"?"selected":""}>Global</option><option value="top" ${state.mode==="top"?"selected":""}>Top Traders</option></select></div>\n'
    '        </div>\n'
    '      </div>\n'
    '    `;\n'
    '    const onCb = panel.querySelector("#dvlLSOn");\n'
    '    if(onCb) onCb.addEventListener("change", () => { state.on = onCb.checked; save(); if(state.on) ensureData(true); });\n'
    '    const modeEl = panel.querySelector("#dvlLSMode");\n'
    '    if(modeEl) modeEl.addEventListener("change", () => { state.mode = modeEl.value; save(); });\n'
    '  }',

    '    body.innerHTML = `\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>General</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlLSOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>\n'
    '          <div class="dvl-vt-field"><label>Mode</label><select id="dvlLSMode" class="dvl-vt-select"><option value="global" ${state.mode==="global"?"selected":""}>Global</option><option value="top" ${state.mode==="top"?"selected":""}>Top Traders</option></select></div>\n'
    '          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlLSMALen" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.maLen||14}"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '    `;\n'
    '    const onCb = panel.querySelector("#dvlLSOn");\n'
    '    if(onCb) onCb.addEventListener("change", () => { state.on = onCb.checked; save(); if(state.on) ensureData(true); });\n'
    '    const modeEl = panel.querySelector("#dvlLSMode");\n'
    '    if(modeEl) modeEl.addEventListener("change", () => { state.mode = modeEl.value; save(); });\n'
    '    const maInp = panel.querySelector("#dvlLSMALen");\n'
    '    if(maInp) maInp.addEventListener("change", () => { const v=Math.max(2,Math.min(500,Math.round(+maInp.value)||14)); maInp.value=v; state.maLen=v; save(); });\n'
    '  }',

    'LS renderPanel add MA Length'
)

# ── Version bump 0.591 → 0.592 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.591";',
    'const DVL_APP_VERSION = "Beta 0.592";',
    'DVL_APP_VERSION 0.591→0.592'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "OI e L/S: painel de configuracoes abre ao clicar na linha do indicador (igual aos outros). Pill ON/OFF permanece. MA do OI agora no painel." },',
    '{ version: DVL_APP_VERSION, note: "L/S: media movel (MA) laranja adicionada sobre a linha do ratio, periodo configuravel no painel. Default 14." },\n'
    '  { version: "Beta 0.591", note: "OI e L/S: painel de configuracoes. Pill ON/OFF permanece. MA do OI no painel." },',
    'DVL_CHANGELOG 0.592'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.591</div>',
    '<div class="beta" id="versionBadge">BETA 0.592</div>',
    'versionBadge 0.591→0.592'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.591</title>',
    '<title>DVL Binance Live — Beta 0.592</title>',
    'title 0.591→0.592'
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
