# patch_621.py — Beta 0.621
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.620)
#
# FIX — Flickering das linhas POC/VAH/VAL ao mover o gráfico
#
#   Em modo "Range Visível", a cada frame que o chart repinta (drag),
#   os candles visíveis mudam → computeVP recalcula → pocIdx pode variar
#   em 1-2 buckets → pocY pula vários pixels → linha pisca visivelmente.
#
#   SOLUÇÃO: histerese de 1.5 buckets de preço.
#   As posições POC/VAH/VAL (em unidades de preço) só são atualizadas quando
#   o novo valor diverge do cacheado em mais de 1.5 × pricePerRow.
#   Mudanças mínimas por panning são absorvidas; mudanças reais (zoom,
#   novo TF, mudança de símbolo) passam normalmente.
#
# VERSION: 0.620 → 0.621

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

# ── 1. Adicionar variável de estado para os níveis estáveis ──────────────────
html = rep(html,
    '  let vpKCache    = null;\n'
    '  let vpKFetching = false;',

    '  let vpKCache      = null;\n'
    '  let vpKFetching   = false;\n'
    '  let vpStableLevels = {poc:null, vah:null, val:null, sym:null, tf:null};',

    'add vpStableLevels'
)

# ── 2. Bloco de histerese + rowP antes do ctx.save() ─────────────────────────
html = rep(html,
    '    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));\n'
    '    const cBuy  = state.colorBuy  || "#13dc8d";\n'
    '    const cSell = state.colorSell || "#ff4a61";\n'
    '\n'
    '    ctx.save();\n'
    '    try {\n'
    '\n'
    '    // ── Bars: split buy (direita) / sell (esquerda) ───────────────────────',

    '    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));\n'
    '    const cBuy  = state.colorBuy  || "#13dc8d";\n'
    '    const cSell = state.colorSell || "#ff4a61";\n'
    '\n'
    '    // Histerese: POC/VAH/VAL só movem > 1.5 buckets (evita flickering no drag)\n'
    '    const rowP   = p => y0 + (max - p) / chartRange * (y1 - y0);\n'
    "    const curTF  = state.vpTF || 'visible';\n"
    '    if(vpStableLevels.sym !== sym || vpStableLevels.tf !== curTF){\n'
    '      vpStableLevels = {poc:null, vah:null, val:null, sym, tf:curTF};\n'
    '    }\n'
    '    const hyst   = pricePerRow * 1.5;\n'
    '    const newPoc = vpMin + (pocIdx + 0.5) * pricePerRow;\n'
    '    const newVah = vpMin + (vaHi + 1)     * pricePerRow;\n'
    '    const newVal = vpMin +  vaLo           * pricePerRow;\n'
    '    if(vpStableLevels.poc===null||Math.abs(newPoc-vpStableLevels.poc)>hyst) vpStableLevels.poc=newPoc;\n'
    '    if(vpStableLevels.vah===null||Math.abs(newVah-vpStableLevels.vah)>hyst) vpStableLevels.vah=newVah;\n'
    '    if(vpStableLevels.val===null||Math.abs(newVal-vpStableLevels.val)>hyst) vpStableLevels.val=newVal;\n'
    '\n'
    '    ctx.save();\n'
    '    try {\n'
    '\n'
    '    // ── Bars: split buy (direita) / sell (esquerda) ───────────────────────',

    'draw(): hysteresis + rowP before ctx.save()'
)

# ── 3. Substituir pocY/vahY/valY pelos níveis estáveis ───────────────────────
html = rep(html,
    '      const pocY = rowY(pocIdx + 0.5);',
    '      const pocY = rowP(vpStableLevels.poc);',
    'pocY via stable level'
)

html = rep(html,
    '      const vahY = rowY(vaHi + 1);',
    '      const vahY = rowP(vpStableLevels.vah);',
    'vahY via stable level'
)

html = rep(html,
    '      const valY = rowY(vaLo);',
    '      const valY = rowP(vpStableLevels.val);',
    'valY via stable level'
)

# ── 4. Resetar stable levels ao trocar TF ────────────────────────────────────
html = rep(html,
    '    b("dvlVPTF",    el=>{ state.vpTF=el.value; vpKCache=null; });',
    '    b("dvlVPTF",    el=>{ state.vpTF=el.value; vpKCache=null; vpStableLevels={poc:null,vah:null,val:null,sym:null,tf:null}; });',
    'reset vpStableLevels on TF change'
)

# ── 5. Version bump 0.620 → 0.621 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.620";',
    'const DVL_APP_VERSION = "Beta 0.621";',
    'DVL_APP_VERSION 0.620→0.621'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: VP Timeframe selector (1h/4h/1d/…) — prev period + current in formation." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: POC/VAH/VAL hysteresis — sem flickering ao arrastar o gráfico." },\n'
    '  { version: "Beta 0.620", note: "Feature: VP Timeframe selector (1h/4h/1d/…) — prev period + current in formation." },',
    'DVL_CHANGELOG 0.621'
)
html = rep(html,
    'BETA 0.620</div>',
    'BETA 0.621</div>',
    'versionBadge 0.620→0.621'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.620</title>',
    '<title>DVL Binance Live — Beta 0.621</title>',
    'title 0.620→0.621'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.620",',
    '  window.DVLVolumeProfile = { version:"0.621",',
    'DVLVolumeProfile version 0.621'
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
