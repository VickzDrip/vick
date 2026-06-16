# patch_602.py — Beta 0.602
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.601)
#
# FIXES:
#   1. DV + TV updateRow(): adiciona classList.toggle("is-on") para toggle ficar verde/ON
#   2. DV + TV renderPanel() checkbox: adiciona updateRow()+drawSoon() ao mudar estado
#   3. Teste / Teste 2: remove insertRow() do boot() — ficam como referência interna,
#      não aparecem no menu Indicators
#
# VERSION: 0.601 → 0.602

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

# ── 1. DV updateRow: adiciona is-on class ────────────────────────────────────
html = rep(html,
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlDeltaVolumeState");\n'
    '    if(st) st.textContent = state.on ? "ON" : "OFF";\n'
    '  }',

    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlDeltaVolumeState");\n'
    '    if(st){ st.textContent = state.on ? "ON" : "OFF"; st.classList.toggle("is-on", !!state.on); }\n'
    '  }',

    'DV updateRow: classList.toggle is-on'
)

# ── 2. TV updateRow: adiciona is-on class ────────────────────────────────────
html = rep(html,
    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlTickVolumeState");\n'
    '    if(st) st.textContent = state.on ? "ON" : "OFF";\n'
    '  }',

    '  function updateRow(){\n'
    '    const st = document.getElementById("dvlTickVolumeState");\n'
    '    if(st){ st.textContent = state.on ? "ON" : "OFF"; st.classList.toggle("is-on", !!state.on); }\n'
    '  }',

    'TV updateRow: classList.toggle is-on'
)

# ── 3. DV renderPanel checkbox: updateRow + drawSoon ─────────────────────────
html = rep(html,
    '    if(onCb) onCb.addEventListener("change", ()=>{ state.on=onCb.checked; save(); });',
    '    if(onCb) onCb.addEventListener("change", ()=>{ state.on=onCb.checked; save(); updateRow(); if(typeof drawSoon==="function") drawSoon(); });',
    'DV renderPanel checkbox: updateRow+drawSoon'
)

# ── 4. TV renderPanel checkbox: updateRow + drawSoon ─────────────────────────
html = rep(html,
    '    if(cb) cb.addEventListener("change", ()=>{ state.on=cb.checked; save(); });',
    '    if(cb) cb.addEventListener("change", ()=>{ state.on=cb.checked; save(); updateRow(); if(typeof drawSoon==="function") drawSoon(); });',
    'TV renderPanel checkbox: updateRow+drawSoon'
)

# ── 5. Teste 1 boot: remove insertRow() ──────────────────────────────────────
html = rep(html,
    '    if(drag && drag.id === ev.pointerId) drag = null;\n'
    '    if(pointers.size < 2) pinch = null;\n'
    '  }\n'
    '\n'
    '  function boot(){\n'
    '    insertRow();\n'
    '    updateRow();',

    '    if(drag && drag.id === ev.pointerId) drag = null;\n'
    '    if(pointers.size < 2) pinch = null;\n'
    '  }\n'
    '\n'
    '  function boot(){\n'
    '    updateRow();',

    'Teste1 boot: remove insertRow'
)

# ── 6. Teste 2 boot: remove insertRow() ──────────────────────────────────────
html = rep(html,
    '      if(typeof crosshair !== "undefined") crosshair.active = false;\n'
    '      if(typeof crossDragState !== "undefined") crossDragState = null;\n'
    '    }catch(_){}\n'
    '\n'
    '    if(pointers.has(ev.pointerId)) pointers.delete(ev.pointerId);\n'
    '  }\n'
    '\n'
    '  function boot(){\n'
    '    insertRow();\n'
    '    updateRow();',

    '      if(typeof crosshair !== "undefined") crosshair.active = false;\n'
    '      if(typeof crossDragState !== "undefined") crossDragState = null;\n'
    '    }catch(_){}\n'
    '\n'
    '    if(pointers.has(ev.pointerId)) pointers.delete(ev.pointerId);\n'
    '  }\n'
    '\n'
    '  function boot(){\n'
    '    updateRow();',

    'Teste2 boot: remove insertRow'
)

# ── Version bump 0.601 → 0.602 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.601";',
    'const DVL_APP_VERSION = "Beta 0.602";',
    'DVL_APP_VERSION 0.601→0.602'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: DVLDeltaVolume e DVLTickVolume oscillatorWindow chamava funcao inexistente — corrigido para visibleWindow()." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: toggle DV/TV agora fica verde/ON corretamente; Teste e Teste 2 removidos do menu Indicators." },\n'
    '  { version: "Beta 0.601", note: "Bugfix: oscillatorWindow chamava funcao inexistente — corrigido para visibleWindow()." },',
    'DVL_CHANGELOG 0.602'
)
html = rep(html,
    'BETA 0.601</div>',
    'BETA 0.602</div>',
    'versionBadge 0.601→0.602'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.601</title>',
    '<title>DVL Binance Live — Beta 0.602</title>',
    'title 0.601→0.602'
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
