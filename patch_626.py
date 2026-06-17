# patch_626.py — Beta 0.626
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.625)
#
# FIX 1 — DVL Flow Event Bubbles toggle ON/OFF
#
#   O dvl-vt-state é um toggle switch CSS puro.
#   O estado visual é controlado pela classe CSS "is-on", não por textContent.
#   A função updatePill() estava chamando textContent="ON"/"OFF" que fica
#   invisível (font-size:0!important). Agora usa classList.toggle("is-on").
#   insertRow() também inicializa o elemento com a classe correta.
#
# FIX 2 — Liquidation lines OFF por padrão
#
#   liquidationLinesOn = true na declaração → mudar para false.
#   O botão HTML liqToggleBtn já tem class="is-on" hardcoded → remover.
#   O span liqToggleText já tem "ON" hardcoded → mudar para "OFF".
#
# VERSION: 0.625 → 0.626

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

# ── 1. FEB updatePill: textContent → classList.toggle("is-on") ───────────────
html = rep(html,
    '  function updatePill(){\n'
    '    const p=document.getElementById("dvlFebState");\n'
    '    if(p) p.textContent=state.on?"ON":"OFF";\n'
    '  }',

    '  function updatePill(){\n'
    '    const p=document.getElementById("dvlFebState");\n'
    '    if(p) p.classList.toggle("is-on",!!state.on);\n'
    '  }',

    'FEB updatePill: use is-on CSS class'
)

# ── 2. FEB insertRow: inicializa elemento com classe is-on correta ────────────
html = rep(html,
    "    item.innerHTML=\n"
    "      '<span class=\"indicatorFxMark\">FEB</span>'\n"
    "      +'<span><b>DVL Flow Event Bubbles</b><small>composite flow overlay</small></span>'\n"
    "      +'<i class=\"dvl-vt-state\" id=\"dvlFebState\">'+(state.on?\"ON\":\"OFF\")+'</i>';",

    "    item.innerHTML=\n"
    "      '<span class=\"indicatorFxMark\">FEB</span>'\n"
    "      +'<span><b>DVL Flow Event Bubbles</b><small>composite flow overlay</small></span>'\n"
    "      +'<i class=\"dvl-vt-state'+(state.on?' is-on':'')+'\" id=\"dvlFebState\"></i>';",

    'FEB insertRow: init is-on class from state'
)

# ── 3. Liquidation lines: default false ──────────────────────────────────────
html = rep(html,
    'let liquidationLinesOn = true;',
    'let liquidationLinesOn = false;',
    'liquidationLinesOn default false'
)

# ── 4. Liquidation lines HTML button: remover is-on e mudar texto para OFF ───
html = rep(html,
    'class="panelToggle liqToggle is-on" id="liqToggleBtn" type="button" aria-label="Mostrar/ocultar liquidação"><span id="liqToggleText">ON</span>',
    'class="panelToggle liqToggle" id="liqToggleBtn" type="button" aria-label="Mostrar/ocultar liquidação"><span id="liqToggleText">OFF</span>',
    'liqToggle HTML: remove is-on, set text OFF'
)

# ── 5. Version bump 0.625 → 0.626 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.625";',
    'const DVL_APP_VERSION = "Beta 0.626";',
    'DVL_APP_VERSION 0.625→0.626'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: DVL Flow Event Bubbles — overlay de eventos compostos de fluxo." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: FEB toggle ON/OFF + liquidation lines OFF por padrão." },\n'
    '  { version: "Beta 0.625", note: "Feature: DVL Flow Event Bubbles — overlay de eventos compostos de fluxo." },',
    'DVL_CHANGELOG 0.626'
)
html = rep(html,
    'BETA 0.625</div>',
    'BETA 0.626</div>',
    'versionBadge 0.625→0.626'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.625</title>',
    '<title>DVL Binance Live — Beta 0.626</title>',
    'title 0.625→0.626'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.625",',
    '  window.DVLVolumeProfile = { version:"0.626",',
    'DVLVolumeProfile version 0.626'
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
