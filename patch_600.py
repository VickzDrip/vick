# patch_600.py — Beta 0.600
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.599)
#
# FEATURE: Toque no badge BETA → hard refresh (cache-busting)
#   - Adiciona onclick no #versionBadge
#   - Recarrega com ?_r=timestamp para forçar bypass do cache
#   - Funciona no mobile sem precisar de gestos especiais
#
# VERSION: 0.599 → 0.600

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

# ── 1. Badge com onclick hard-refresh ────────────────────────────────────────
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.599</div>',
    '<div class="beta" id="versionBadge" style="cursor:pointer" title="Tap to reload" '
    'onclick="window.location.href=window.location.origin+window.location.pathname+\'?_r=\'+Date.now()">'
    'BETA 0.600</div>',
    'versionBadge hard-refresh onclick'
)

# ── Version bump 0.599 → 0.600 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.599";',
    'const DVL_APP_VERSION = "Beta 0.600";',
    'DVL_APP_VERSION 0.599→0.600'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: DVLDeltaVolume e DVLTickVolume nao apareciam no painel Indicators — corrigido insertRow() com #indicatorDropdown e classe indicatorItem." },',
    '{ version: DVL_APP_VERSION, note: "Badge BETA vira botao de hard refresh — toque forca reload com cache-busting no mobile." },\n'
    '  { version: "Beta 0.599", note: "Bugfix: DVLDeltaVolume e DVLTickVolume no painel Indicators." },',
    'DVL_CHANGELOG 0.600'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.599</title>',
    '<title>DVL Binance Live — Beta 0.600</title>',
    'title 0.599→0.600'
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
