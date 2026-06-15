# patch_599.py — Beta 0.599
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.598)
#
# BUGFIX: DVLDeltaVolume e DVLTickVolume não apareciam no painel de Indicators
#   - DVLDeltaVolume usava ensureRow() com container errado (.dvl-indicators-list)
#   - DVLTickVolume não tinha nenhuma linha no painel
#   Fix: ambos passam a usar insertRow()+updateRow()+boot() igual ao OI e L/S
#        inserem em #indicatorDropdown com classe indicatorItem
#
# VERSION: 0.598 → 0.599

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

# ── 1. Delta Volume: substituir ensureRow() por insertRow()+updateRow()+boot() ──
html = rep(html,
    '  // ── Indicator row pill ────────────────────────────────────────────────────\n'
    '  function ensureRow(){\n'
    '    if(item && document.contains(item)) return;\n'
    '    const container = document.querySelector(".dvl-indicators-list, #dvlIndicatorsList, .dvl-osc-list");\n'
    '    if(!container) return;\n'
    '    item = document.createElement("div");\n'
    '    item.className = "dvl-indicator-item";\n'
    '    item.dataset.dvlDvBound = "1";\n'
    '    item.innerHTML = `<span class="dvl-ind-name">Delta Volume</span><i class="dvl-vt-state" id="dvlDvState">${state.on?"ON":"OFF"}</i>`;\n'
    '    container.appendChild(item);\n'
    '    const pill = item.querySelector("#dvlDvState");\n'
    '    item.addEventListener("click", ev=>{\n'
    '      if(pill && pill.contains(ev.target)){ state.on=!state.on; save(); pill.textContent=state.on?"ON":"OFF"; }\n'
    '      else openPanel();\n'
    '    });\n'
    '  }\n'
    '\n'
    '  window.DVLDeltaVolume = {\n'
    '    version:"0.596",',

    '  // ── Indicator row ─────────────────────────────────────────────────────────\n'
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlDeltaVolumeState");\n'
    '    if(st) st.textContent = state.on ? "ON" : "OFF";\n'
    '  }\n'
    '\n'
    '  function insertRow(){\n'
    '    const menu = document.getElementById("indicatorDropdown");\n'
    '    if(!menu) return;\n'
    '    let item = document.getElementById("dvlDeltaVolumeItem");\n'
    '    if(!item){\n'
    '      item = document.createElement("div");\n'
    '      item.id = "dvlDeltaVolumeItem";\n'
    '      item.className = "indicatorItem";\n'
    '      item.innerHTML = `\n'
    '        <span class="indicatorFxMark">DV</span>\n'
    '        <span><b>DVL Delta Volume</b><small>1m klines buy/sell delta</small></span>\n'
    '        <i class="dvl-vt-state" id="dvlDeltaVolumeState">ON</i>\n'
    '      `;\n'
    '      const after = document.getElementById("dvlLongShortOscItem") || document.getElementById("dvlOpenInterestOscItem");\n'
    '      if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);\n'
    '      else menu.appendChild(item);\n'
    '    }\n'
    '    if(!item.dataset.dvlDvBound){\n'
    '      item.dataset.dvlDvBound = "1";\n'
    '      const pill = item.querySelector("#dvlDeltaVolumeState");\n'
    '      if(pill) pill.addEventListener("click", ev=>{ ev.preventDefault(); ev.stopPropagation(); state.on=!state.on; save(); updateRow(); });\n'
    '      item.addEventListener("click", ev=>{ ev.stopPropagation(); openPanel(); });\n'
    '    }\n'
    '    updateRow();\n'
    '  }\n'
    '\n'
    '  function boot(){\n'
    '    insertRow();\n'
    '    updateRow();\n'
    '    if(typeof drawSoon === "function") drawSoon();\n'
    '  }\n'
    '\n'
    '  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n'
    '  else boot();\n'
    '\n'
    '  window.DVLDeltaVolume = {\n'
    '    version:"0.599",',

    'DVLDeltaVolume: insertRow+updateRow+boot'
)

# ── 2. Tick Volume: adicionar insertRow()+updateRow()+boot() antes do setInterval ──
html = rep(html,
    '  // ── Live poll: atualiza a cada 3s ────────────────────────────────────────\n'
    '  setInterval(()=>{\n'
    '    if(!on()) return;\n'
    '    CACHE.lastFetch = 0; // força re-fetch na próxima draw\n'
    '    if(typeof drawSoon === "function") drawSoon();\n'
    '  }, 3000);\n'
    '\n'
    '  window.DVLTickVolume = {\n'
    '    version:"0.598",',

    '  // ── Indicator row ─────────────────────────────────────────────────────────\n'
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlTickVolumeState");\n'
    '    if(st) st.textContent = state.on ? "ON" : "OFF";\n'
    '  }\n'
    '\n'
    '  function insertRow(){\n'
    '    const menu = document.getElementById("indicatorDropdown");\n'
    '    if(!menu) return;\n'
    '    let item = document.getElementById("dvlTickVolumeItem");\n'
    '    if(!item){\n'
    '      item = document.createElement("div");\n'
    '      item.id = "dvlTickVolumeItem";\n'
    '      item.className = "indicatorItem";\n'
    '      item.innerHTML = `\n'
    '        <span class="indicatorFxMark">TV</span>\n'
    '        <span><b>DVL Tick Volume</b><small>1s bars · buy/sell live</small></span>\n'
    '        <i class="dvl-vt-state" id="dvlTickVolumeState">ON</i>\n'
    '      `;\n'
    '      const after = document.getElementById("dvlDeltaVolumeItem") || document.getElementById("dvlLongShortOscItem");\n'
    '      if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);\n'
    '      else menu.appendChild(item);\n'
    '    }\n'
    '    if(!item.dataset.dvlTvBound){\n'
    '      item.dataset.dvlTvBound = "1";\n'
    '      const pill = item.querySelector("#dvlTickVolumeState");\n'
    '      if(pill) pill.addEventListener("click", ev=>{ ev.preventDefault(); ev.stopPropagation(); state.on=!state.on; save(); updateRow(); });\n'
    '      item.addEventListener("click", ev=>{ ev.stopPropagation(); openPanel(); });\n'
    '    }\n'
    '    updateRow();\n'
    '  }\n'
    '\n'
    '  function boot(){\n'
    '    insertRow();\n'
    '    updateRow();\n'
    '    if(typeof drawSoon === "function") drawSoon();\n'
    '  }\n'
    '\n'
    '  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n'
    '  else boot();\n'
    '\n'
    '  // ── Live poll: atualiza a cada 3s ────────────────────────────────────────\n'
    '  setInterval(()=>{\n'
    '    if(!on()) return;\n'
    '    CACHE.lastFetch = 0;\n'
    '    if(typeof drawSoon === "function") drawSoon();\n'
    '  }, 3000);\n'
    '\n'
    '  window.DVLTickVolume = {\n'
    '    version:"0.599",',

    'DVLTickVolume: insertRow+updateRow+boot'
)

# ── Version bump 0.598 → 0.599 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.598";',
    'const DVL_APP_VERSION = "Beta 0.599";',
    'DVL_APP_VERSION 0.598→0.599'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Tick Volume: oscilador buy/sell por barras de 1s via coletor local (/api/ticks). Auto-agrega conforme zoom. Verde=buy, Vermelho=sell." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: DVLDeltaVolume e DVLTickVolume nao apareciam no painel Indicators — corrigido insertRow() com #indicatorDropdown e classe indicatorItem." },\n'
    '  { version: "Beta 0.598", note: "Tick Volume: barras de 1s via coletor local." },',
    'DVL_CHANGELOG 0.599'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.598</div>',
    '<div class="beta" id="versionBadge">BETA 0.599</div>',
    'versionBadge 0.598→0.599'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.598</title>',
    '<title>DVL Binance Live — Beta 0.599</title>',
    'title 0.598→0.599'
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
