# patch_603.py — Beta 0.603
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.602)
#
# BUGFIXES:
#   1. DV + TV period() usava window.currentPeriod (nunca definido) → caía em "1h"
#      Resultado: CACHE.data agregava 1m bars em buckets de 1h, mas os candles visíveis
#      são de 5m → só 1 match a cada ~12 candles → só 1 barra aparecia.
#      Fix: usar a variável global `interval` do chart principal (igual currentInterval() do OI).
#
#   2. DV + TV ensurePanel/openPanel/closePanel usavam panel.style.display
#      mas .dvl-vt-panel já tem display:none no CSS → panel nunca aparecia ("não tem input").
#      Fix: usar classList.add/remove("is-open") igual ao OI.
#
#   3. DV draw(): sem escala no eixo direito.
#      Fix: adiciona drawDvlScale (função global já existente).
#
# VERSION: 0.602 → 0.603

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

# ── 1. DV period(): usar interval global ─────────────────────────────────────
html = rep(html,
    '  function period(){ try{ return window.currentPeriod||"1h"; }catch(_){ return "1h"; } }\n'
    '\n'
    '  function periodMs',

    '  function period(){ try{ return (typeof interval!=="undefined"?interval:null)||"5m"; }catch(_){ return "5m"; } }\n'
    '\n'
    '  function periodMs',

    'DV period(): interval global'
)

# ── 2. TV period(): usar interval global ─────────────────────────────────────
html = rep(html,
    '  function period(){ try{ return window.currentPeriod||"1h"; }catch(_){ return "1h"; } }\n'
    '\n'
    '  function cacheKey(){ return sym()+"|"+period(); }\n'
    '\n'
    '  async function fetchBars(',

    '  function period(){ try{ return (typeof interval!=="undefined"?interval:null)||"5m"; }catch(_){ return "5m"; } }\n'
    '\n'
    '  function cacheKey(){ return sym()+"|"+period(); }\n'
    '\n'
    '  async function fetchBars(',

    'TV period(): interval global'
)

# ── 3. DV ensurePanel/openPanel/closePanel: usar classList ───────────────────
html = rep(html,
    '  function ensurePanel(){\n'
    '    if(panel && document.contains(panel)) return;\n'
    '    panel = document.createElement("div");\n'
    '    panel.className = "dvl-vt-panel";\n'
    '    panel.style.cssText = "display:none;position:fixed;z-index:9999;top:60px;right:60px;width:240px;";\n'
    '    panel.innerHTML = `\n'
    '      <div class="dvl-vt-header">\n'
    '        <span class="dvl-vt-title">Delta Volume</span>\n'
    '        <button class="dvl-vt-close" id="dvlDvClose">✕</button>\n'
    '      </div>\n'
    '      <div class="dvl-vt-body" id="dvlDvBody"></div>\n'
    '    `;\n'
    '    document.body.appendChild(panel);\n'
    '    panel.querySelector("#dvlDvClose").addEventListener("click", closePanel);\n'
    '  }\n'
    '\n'
    '  function openPanel(){ ensurePanel(); renderPanel(); panel.style.display=""; }\n'
    '  function closePanel(){ if(panel) panel.style.display="none"; }',

    '  function ensurePanel(){\n'
    '    if(panel && document.contains(panel)) return;\n'
    '    panel = document.createElement("div");\n'
    '    panel.id = "dvlDvPanel";\n'
    '    panel.className = "dvl-vt-panel";\n'
    '    panel.innerHTML = `\n'
    '      <div class="dvl-vt-head">\n'
    '        <div class="dvl-vt-title"><b>DVL Delta Volume</b><small>1m klines · buy/sell delta</small></div>\n'
    '        <div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlDvClose" type="button">×</button></div>\n'
    '      </div>\n'
    '      <div class="dvl-vt-body" id="dvlDvBody"></div>\n'
    '    `;\n'
    '    document.body.appendChild(panel);\n'
    '    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);\n'
    '    panel.querySelector("#dvlDvClose").addEventListener("click", closePanel);\n'
    '  }\n'
    '\n'
    '  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }\n'
    '  function closePanel(){ if(panel) panel.classList.remove("is-open"); }',

    'DV ensurePanel: classList.add(is-open)'
)

# ── 4. TV ensurePanel/openPanel: usar classList ───────────────────────────────
html = rep(html,
    '  function ensurePanel(){\n'
    '    if(panel && document.contains(panel)) return;\n'
    '    panel = document.createElement("div");\n'
    '    panel.className = "dvl-vt-panel";\n'
    '    panel.style.cssText = "display:none;position:fixed;z-index:9999;top:60px;right:60px;width:220px;";\n'
    '    panel.innerHTML = `\n'
    '      <div class="dvl-vt-header">\n'
    '        <span class="dvl-vt-title">Tick Volume</span>\n'
    '        <button class="dvl-vt-close" id="dvlTvClose">✕</button>\n'
    '      </div>\n'
    '      <div class="dvl-vt-body" id="dvlTvBody"></div>\n'
    '    `;\n'
    '    document.body.appendChild(panel);\n'
    '    panel.querySelector("#dvlTvClose").addEventListener("click", ()=>{ panel.style.display="none"; });\n'
    '  }\n'
    '\n'
    '  function openPanel(){ ensurePanel(); renderPanel(); panel.style.display=""; }',

    '  function ensurePanel(){\n'
    '    if(panel && document.contains(panel)) return;\n'
    '    panel = document.createElement("div");\n'
    '    panel.id = "dvlTvPanel";\n'
    '    panel.className = "dvl-vt-panel";\n'
    '    panel.innerHTML = `\n'
    '      <div class="dvl-vt-head">\n'
    '        <div class="dvl-vt-title"><b>DVL Tick Volume</b><small>1s bars · buy/sell live</small></div>\n'
    '        <div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlTvClose" type="button">×</button></div>\n'
    '      </div>\n'
    '      <div class="dvl-vt-body" id="dvlTvBody"></div>\n'
    '    `;\n'
    '    document.body.appendChild(panel);\n'
    '    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);\n'
    '    panel.querySelector("#dvlTvClose").addEventListener("click", ()=>{ panel.classList.remove("is-open"); });\n'
    '  }\n'
    '\n'
    '  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }',

    'TV ensurePanel: classList.add(is-open)'
)

# ── 5. DV draw(): adicionar escala direita ────────────────────────────────────
html = rep(html,
    '    ctx.fillText("DELTA VOL 1m", m.x0 + 8, m.y1 - 5);\n'
    '  }',

    '    ctx.fillText("DELTA VOL 1m", m.x0 + 8, m.y1 - 5);\n'
    '\n'
    '    if(typeof drawDvlScale === "function"){\n'
    '      const fmtV = v => { const a=Math.abs(v); return a>=1e6?(v/1e6).toFixed(1)+"M":a>=1e3?(v/1e3).toFixed(1)+"K":Math.round(v).toString(); };\n'
    '      drawDvlScale(ctx, {x1:m.x1, y0:m.y0, y1:m.y1, right:w}, sc.min, sc.max, fmtV, null, null);\n'
    '    }\n'
    '  }',

    'DV draw: drawDvlScale'
)

# ── Version bump 0.602 → 0.603 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.602";',
    'const DVL_APP_VERSION = "Beta 0.603";',
    'DVL_APP_VERSION 0.602→0.603'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: toggle DV/TV agora fica verde/ON corretamente; Teste e Teste 2 removidos do menu Indicators." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: DV/TV period() usava currentPeriod inexistente (1h hardcoded) — corrigido para interval global; painel settings agora abre; escala adicionada." },\n'
    '  { version: "Beta 0.602", note: "Bugfix: toggle DV/TV verde/ON; Teste e Teste 2 removidos do menu." },',
    'DVL_CHANGELOG 0.603'
)
html = rep(html,
    'BETA 0.602</div>',
    'BETA 0.603</div>',
    'versionBadge 0.602→0.603'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.602</title>',
    '<title>DVL Binance Live — Beta 0.603</title>',
    'title 0.602→0.603'
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
