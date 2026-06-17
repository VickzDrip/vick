# patch_619.py — Beta 0.619
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.618)
#
# FIX — ctx.save/restore não balanceado no VP draw
#
#   Quando o draw() do VP lança qualquer exceção entre ctx.save() e
#   ctx.restore(), o wrapper externo (try/catch em DVLVolumeProfileDraw)
#   captura a exceção e retorna normalmente — mas o ctx.restore() dentro
#   de draw() NUNCA é chamado.
#
#   Consequência: o ctx.restore() na linha 16132 de drawPriceSection
#   restaura o estado INCORRETO (o save do VP, não o save da seção).
#   O ctx.clip() aplicado em linha 15983 (clip para [x0,x1]×[y0,y1])
#   continua ativo para todo o restante do frame:
#     - Labels da escala de preço (desenhadas em x1+2, fora do clip) →
#       clipadas → SOMEM
#     - Painéis dos osciladores (desenhados em y > priceBottom, fora do
#       clip) → clipados → SOMEM
#
#   SOLUÇÃO: try/finally em draw() garante que ctx.restore() sempre
#   é chamado, independente de qualquer exceção interna.
#
# VERSION: 0.618 → 0.619

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

# ── 1. try/finally no draw(): ctx.restore() garantido ────────────────────────
html = rep(html,
    '    ctx.save();\n'
    '\n'
    '    // ── Bars: split buy (direita) / sell (esquerda) ───────────────────────',

    '    ctx.save();\n'
    '    try {\n'
    '\n'
    '    // ── Bars: split buy (direita) / sell (esquerda) ───────────────────────',

    'draw(): ctx.save() → try {'
)

html = rep(html,
    '    ctx.restore();\n'
    '  }\n'
    '\n'
    '  // ── Settings panel ────────────────────────────────────────────────────────',

    '    } finally { ctx.restore(); }\n'
    '  }\n'
    '\n'
    '  // ── Settings panel ────────────────────────────────────────────────────────',

    'draw(): } finally { ctx.restore(); }'
)

# ── 2. Version bump 0.618 → 0.619 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.618";',
    'const DVL_APP_VERSION = "Beta 0.619";',
    'DVL_APP_VERSION 0.618→0.619'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: VP triangular close-peaked (sem flatlines) + fix labels POC/VAH/VAL." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: VP draw try/finally — escala e osciladores paravam de aparecer." },\n'
    '  { version: "Beta 0.618", note: "Bugfix: VP triangular close-peaked (sem flatlines) + fix vpX0 (labels POC/VAH/VAL)." },',
    'DVL_CHANGELOG 0.619'
)
html = rep(html,
    'BETA 0.618</div>',
    'BETA 0.619</div>',
    'versionBadge 0.618→0.619'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.618</title>',
    '<title>DVL Binance Live — Beta 0.619</title>',
    'title 0.618→0.619'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.618",',
    '  window.DVLVolumeProfile = { version:"0.619",',
    'DVLVolumeProfile version 0.619'
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
