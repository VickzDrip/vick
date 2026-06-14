# patch_591.py — Beta 0.591
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.590)
#
# FEATURE: Settings panel for OI and L/S oscillators
#   - Remove inline MA input from OI indicator row
#   - Click on OI row → opens dvl-vt-panel (ON/OFF toggle + MA length)
#   - Click on L/S row → opens dvl-vt-panel (ON/OFF toggle + Mode select)
#   - ON/OFF pill on each row still toggles directly without opening panel
#
# VERSION: 0.590 → 0.591

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

# ── 1. OI: replace updateRow() — remove maLen sync, add panel checkbox sync;
#          prepend panel functions ─────────────────────────────────────────────
html = rep(html,
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

    '  let panel = null;\n'
    '  function ensurePanel(){\n'
    '    if(panel) return panel;\n'
    '    panel = document.createElement("div");\n'
    '    panel.id = "dvlOIPanel";\n'
    '    panel.className = "dvl-vt-panel";\n'
    '    panel.innerHTML = `\n'
    '      <div class="dvl-vt-head">\n'
    '        <div class="dvl-vt-title"><b>DVL Open Interest</b><small>AGG OI candles · real data</small></div>\n'
    '        <div class="dvl-vt-head-actions">\n'
    '          <button class="dvl-vt-close" id="dvlOIPanelClose" type="button">×</button>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div class="dvl-vt-body" id="dvlOIPanelBody"></div>\n'
    '    `;\n'
    '    document.body.appendChild(panel);\n'
    '    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);\n'
    '    panel.querySelector("#dvlOIPanelClose").addEventListener("click", closePanel);\n'
    '    return panel;\n'
    '  }\n'
    '  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }\n'
    '  function closePanel(){ if(panel) panel.classList.remove("is-open"); }\n'
    '  function renderPanel(){\n'
    '    ensurePanel();\n'
    '    const body = panel.querySelector("#dvlOIPanelBody");\n'
    '    body.innerHTML = `\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>General</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlOIOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>\n'
    '          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlOIMALenPanel" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.maLen||20}"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '    `;\n'
    '    const onCb = panel.querySelector("#dvlOIOn");\n'
    '    if(onCb) onCb.addEventListener("change", () => { state.on = onCb.checked; save(); if(state.on) ensureData(true); });\n'
    '    const maInp = panel.querySelector("#dvlOIMALenPanel");\n'
    '    if(maInp) maInp.addEventListener("change", () => { const v=Math.max(2,Math.min(500,Math.round(+maInp.value)||20)); maInp.value=v; state.maLen=v; save(); });\n'
    '  }\n'
    '\n'
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlOpenInterestOscState");\n'
    '    if(st){\n'
    '      st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";\n'
    '      st.classList.toggle("is-on", !!state.on);\n'
    '      st.setAttribute("aria-label", "DVL Open Interest " + (state.on ? "ON" : "OFF"));\n'
    '    }\n'
    '    const cb = document.getElementById("dvlOIOn");\n'
    '    if(cb && cb.checked !== !!state.on) cb.checked = !!state.on;\n'
    '  }',

    'OI panel functions + updateRow'
)

# ── 2. OI: remove inline MA input from insertRow HTML ────────────────────────
html = rep(html,
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

    '      item.innerHTML = `\n'
    '        <span class="indicatorFxMark">OI</span>\n'
    '        <span><b>DVL Open Interest</b><small>AGG OI candles · real data</small></span>\n'
    '        <i class="dvl-vt-state" id="dvlOpenInterestOscState">ON</i>\n'
    '      `;',

    'OI insertRow remove inline MA input'
)

# ── 3. OI: update click binding — pill toggles, item opens panel ─────────────
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

    '    if(!item.dataset.dvl554Bound){\n'
    '      item.dataset.dvl554Bound = "1";\n'
    '      const toggle = () => {\n'
    '        state.on = !state.on;\n'
    '        save();\n'
    '        if(state.on) ensureData(true);\n'
    '      };\n'
    '\n'
    '      const pill = item.querySelector("#dvlOpenInterestOscState");\n'
    '      if(pill){\n'
    '        pill.addEventListener("click", ev => {\n'
    '          ev.preventDefault(); ev.stopPropagation();\n'
    '          toggle();\n'
    '        });\n'
    '      }\n'
    '\n'
    '      item.addEventListener("click", ev => {\n'
    '        ev.stopPropagation();\n'
    '        openPanel();\n'
    '      });\n'
    '    }',

    'OI insertRow click binding'
)

# ── 4. L/S: prepend panel functions + update updateRow() ─────────────────────
html = rep(html,
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlLongShortOscState");\n'
    '    if(st){\n'
    '      st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";\n'
    '      st.classList.toggle("is-on", !!state.on);\n'
    '      st.setAttribute("aria-label", "DVL Long Short " + (state.on ? "ON" : "OFF"));\n'
    '    }\n'
    '  }',

    '  let panel = null;\n'
    '  function ensurePanel(){\n'
    '    if(panel) return panel;\n'
    '    panel = document.createElement("div");\n'
    '    panel.id = "dvlLSPanel";\n'
    '    panel.className = "dvl-vt-panel";\n'
    '    panel.innerHTML = `\n'
    '      <div class="dvl-vt-head">\n'
    '        <div class="dvl-vt-title"><b>DVL Long/Short Ratio</b><small>CoinGlass-style · real data</small></div>\n'
    '        <div class="dvl-vt-head-actions">\n'
    '          <button class="dvl-vt-close" id="dvlLSPanelClose" type="button">×</button>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div class="dvl-vt-body" id="dvlLSPanelBody"></div>\n'
    '    `;\n'
    '    document.body.appendChild(panel);\n'
    '    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);\n'
    '    panel.querySelector("#dvlLSPanelClose").addEventListener("click", closePanel);\n'
    '    return panel;\n'
    '  }\n'
    '  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }\n'
    '  function closePanel(){ if(panel) panel.classList.remove("is-open"); }\n'
    '  function renderPanel(){\n'
    '    ensurePanel();\n'
    '    const body = panel.querySelector("#dvlLSPanelBody");\n'
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
    '  }\n'
    '\n'
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlLongShortOscState");\n'
    '    if(st){\n'
    '      st.textContent = state.on ? (CACHE.fetching ? "LOAD" : "ON") : "OFF";\n'
    '      st.classList.toggle("is-on", !!state.on);\n'
    '      st.setAttribute("aria-label", "DVL Long Short " + (state.on ? "ON" : "OFF"));\n'
    '    }\n'
    '    const cb = document.getElementById("dvlLSOn");\n'
    '    if(cb && cb.checked !== !!state.on) cb.checked = !!state.on;\n'
    '  }',

    'LS panel functions + updateRow'
)

# ── 5. L/S: update click binding — pill toggles, item opens panel ────────────
html = rep(html,
    '    if(!item.dataset.dvl559Bound){\n'
    '      item.dataset.dvl559Bound = "1";\n'
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

    '    if(!item.dataset.dvl559Bound){\n'
    '      item.dataset.dvl559Bound = "1";\n'
    '      const toggle = () => {\n'
    '        state.on = !state.on;\n'
    '        save();\n'
    '        if(state.on) ensureData(true);\n'
    '      };\n'
    '\n'
    '      const pill = item.querySelector("#dvlLongShortOscState");\n'
    '      if(pill){\n'
    '        pill.addEventListener("click", ev => {\n'
    '          ev.preventDefault(); ev.stopPropagation();\n'
    '          toggle();\n'
    '        });\n'
    '      }\n'
    '\n'
    '      item.addEventListener("click", ev => {\n'
    '        ev.stopPropagation();\n'
    '        openPanel();\n'
    '      });\n'
    '    }',

    'LS insertRow click binding'
)

# ── Version bump 0.590 → 0.591 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.590";',
    'const DVL_APP_VERSION = "Beta 0.591";',
    'DVL_APP_VERSION 0.590→0.591'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "OI: media movel (MA) adicionada — linha ciano sobre as colunas, periodo configuravel via input na linha do indicador. Default 20." },\n'
    '  { version: "Beta 0.589", note: "Revert OI Bybit (unidade ambigua). Spike Zones warmup fix mantido." },',
    '{ version: DVL_APP_VERSION, note: "OI e L/S: painel de configuracoes abre ao clicar na linha do indicador (igual aos outros). Pill ON/OFF permanece. MA do OI agora no painel." },\n'
    '  { version: "Beta 0.590", note: "OI: MA ciano configuravel via input na linha (substituido por painel)." },\n'
    '  { version: "Beta 0.589", note: "Revert OI Bybit (unidade ambigua). Spike Zones warmup fix mantido." },',
    'DVL_CHANGELOG 0.591'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.590</div>',
    '<div class="beta" id="versionBadge">BETA 0.591</div>',
    'versionBadge 0.590→0.591'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.590</title>',
    '<title>DVL Binance Live — Beta 0.591</title>',
    'title 0.590→0.591'
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
