# patch_590.py — Beta 0.590
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.589)
#
# FEATURE: Moving Average no OI
#   - Adiciona maLen:20 ao state do OI oscillator
#   - Desenha linha MA ciano sobre as colunas OI no draw()
#   - Adiciona input compacto "MA" no insertRow para mudar o periodo
#   - updateRow() sincroniza o input com o state salvo
#
# VERSION: 0.589 → 0.590

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

# ── 1. Add maLen to DEFAULTS ──────────────────────────────────────────────────
html = rep(html,
    '  const DEFAULTS = {\n'
    '    on:true,\n'
    '    source:"binance",\n'
    '    unit:"usd",\n'
    '    viewCount:140,\n'
    '    offset:-24,\n'
    '    center:null,\n'
    '    range:null\n'
    '  };',

    '  const DEFAULTS = {\n'
    '    on:true,\n'
    '    source:"binance",\n'
    '    unit:"usd",\n'
    '    maLen:20,\n'
    '    viewCount:140,\n'
    '    offset:-24,\n'
    '    center:null,\n'
    '    range:null\n'
    '  };',

    'OI DEFAULTS add maLen'
)

# ── 2. Draw MA line after the bar loop ────────────────────────────────────────
html = rep(html,
    '        ctx.fillStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '        ctx.fillRect(xx-bw/2, bodyTop, bw, bodyH);\n'
    '        ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '        ctx.strokeRect(xx-bw/2, bodyTop, bw, bodyH);\n'
    '      }\n'
    '\n'
    '      ctx.fillStyle = "rgba(120,145,180,.78)";\n'
    '      ctx.font = "760 8px system-ui";\n'
    '      ctx.textAlign = "left";\n'
    '      ctx.textBaseline = "bottom";\n'
    '      ctx.fillText(CACHE.src || "BINANCE", m.x0 + 8, m.y1 - 5);',

    '        ctx.fillStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '        ctx.fillRect(xx-bw/2, bodyTop, bw, bodyH);\n'
    '        ctx.strokeStyle = bull ? "#13dc8d" : "#ff4a61";\n'
    '        ctx.strokeRect(xx-bw/2, bodyTop, bw, bodyH);\n'
    '      }\n'
    '\n'
    '      // MA line\n'
    '      const _maLen = Math.max(2, Math.round(state.maLen) || 20);\n'
    '      if(_maLen && CACHE.data.length >= 2){\n'
    '        const _closes = CACHE.data.map(d=>d.close);\n'
    '        const _prefix = new Array(_closes.length+1).fill(0);\n'
    '        for(let i=0;i<_closes.length;i++) _prefix[i+1]=_prefix[i]+_closes[i];\n'
    '        const _idxMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));\n'
    '        ctx.beginPath();\n'
    '        ctx.strokeStyle = "#4db8ff";\n'
    '        ctx.lineWidth = 1.5;\n'
    '        ctx.setLineDash([]);\n'
    '        let _started = false;\n'
    '        for(let i=0;i<view.length;i++){\n'
    '          const d = valueAt(CACHE.data, Number(view[i].time));\n'
    '          if(!d) continue;\n'
    '          const idx = _idxMap.get(d.t);\n'
    '          if(idx===undefined) continue;\n'
    '          const st2 = Math.max(0, idx-_maLen+1);\n'
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
    '      ctx.fillText(CACHE.src || "BINANCE", m.x0 + 8, m.y1 - 5);',

    'OI draw MA line'
)

# ── 3. updateRow: sync MA input ───────────────────────────────────────────────
html = rep(html,
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlOpenInterestOscState");\n'
    '    if(st){\n'
    '      st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";\n'
    '      st.classList.toggle("is-on", !!state.on);\n'
    '      st.setAttribute("aria-label", "DVL Open Interest " + (state.on ? "ON" : "OFF"));\n'
    '    }\n'
    '  }',

    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlOpenInterestOscState");\n'
    '    if(st){\n'
    '      st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";\n'
    '      st.classList.toggle("is-on", !!state.on);\n'
    '      st.setAttribute("aria-label", "DVL Open Interest " + (state.on ? "ON" : "OFF"));\n'
    '    }\n'
    '    const inp = document.getElementById("dvlOIMALen");\n'
    '    if(inp && +inp.value !== (state.maLen||20)) inp.value = state.maLen||20;\n'
    '  }',

    'OI updateRow sync MA input'
)

# ── 4. insertRow: add MA input in the HTML ────────────────────────────────────
html = rep(html,
    '      item.innerHTML = `\n'
    '        <span class="indicatorFxMark">OI</span>\n'
    '        <span><b>DVL Open Interest</b><small>AGG OI candles · real data</small></span>\n'
    '        <i class="dvl-vt-state" id="dvlOpenInterestOscState">ON</i>\n'
    '      `;',

    '      item.innerHTML = `\n'
    '        <span class="indicatorFxMark">OI</span>\n'
    '        <span><b>DVL Open Interest</b><small>AGG OI candles · real data</small></span>\n'
    '        <label style="display:flex;align-items:center;gap:3px;cursor:default;margin-left:auto;margin-right:6px" onclick="event.stopPropagation()">\n'
    '          <span style="color:#7b8fa8;font-size:9px;white-space:nowrap">MA</span>\n'
    '          <input id="dvlOIMALen" type="number" min="2" max="500" value="20"\n'
    '            style="width:38px;background:#0d1117;border:1px solid #2a3a50;color:#4db8ff;font-size:10px;padding:1px 4px;border-radius:3px;text-align:center;outline:none"\n'
    '            onclick="event.stopPropagation()">\n'
    '        </label>\n'
    '        <i class="dvl-vt-state" id="dvlOpenInterestOscState">ON</i>\n'
    '      `;',

    'OI insertRow add MA input'
)

# ── 5. Bind MA input change event ────────────────────────────────────────────
# Use the full dvl554Bound block as unique anchor (only one OI oscillator has this)
html = rep(html,
    '    if(!item.dataset.dvl554Bound){\n'
    '      item.dataset.dvl554Bound = "1";\n'
    '      const toggle = () => {\n'
    '        state.on = !state.on;\n'
    '        save();\n'
    '        if(state.on) ensureData(true);\n'
    '      };\n'
    '\n'
    '      item.addEventListener("click", ev => {\n'
    '        ev.preventDefault();\n'
    '        ev.stopPropagation();\n'
    '        toggle();\n'
    '      });\n'
    '    }',

    '    if(!item.dataset.dvl554Bound){\n'
    '      item.dataset.dvl554Bound = "1";\n'
    '      const toggle = () => {\n'
    '        state.on = !state.on;\n'
    '        save();\n'
    '        if(state.on) ensureData(true);\n'
    '      };\n'
    '\n'
    '      item.addEventListener("click", ev => {\n'
    '        ev.preventDefault();\n'
    '        ev.stopPropagation();\n'
    '        toggle();\n'
    '      });\n'
    '\n'
    '      const maInp = item.querySelector("#dvlOIMALen");\n'
    '      if(maInp){\n'
    '        maInp.addEventListener("change", ev => {\n'
    '          ev.stopPropagation();\n'
    '          const v = Math.max(2, Math.min(500, Math.round(+ev.target.value)||20));\n'
    '          ev.target.value = v;\n'
    '          state.maLen = v;\n'
    '          save();\n'
    '        });\n'
    '        maInp.addEventListener("click", ev => ev.stopPropagation());\n'
    '      }\n'
    '    }',

    'OI bind MA input change'
)

# ── Version bump 0.589 → 0.590 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.589";',
    'const DVL_APP_VERSION = "Beta 0.590";',
    'DVL_APP_VERSION 0.589→0.590'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Revert OI Bybit (unidade openInterest ambigua causou bug nas colunas). OI volta a Binance-only. Spike Zones warmup fix mantido." },',
    '{ version: DVL_APP_VERSION, note: "OI: media movel (MA) adicionada — linha ciano sobre as colunas, periodo configuravel via input na linha do indicador. Default 20." },\n'
    '  { version: "Beta 0.589", note: "Revert OI Bybit (unidade ambigua). Spike Zones warmup fix mantido." },',
    'DVL_CHANGELOG 0.590'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.589</div>',
    '<div class="beta" id="versionBadge">BETA 0.590</div>',
    'versionBadge 0.589→0.590'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.589</title>',
    '<title>DVL Binance Live — Beta 0.590</title>',
    'title 0.589→0.590'
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
