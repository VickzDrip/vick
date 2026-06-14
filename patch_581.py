# patch_581.py — Beta 0.581
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.580)
#
# FIX: Version badge on the site never updates.
#
# ROOT CAUSE:
#   The visible version badge is a STATIC HTML element:
#     <div class="beta" id="versionBadge">BETA 0.577</div>
#   No JS ever updates it. Bumping DVL_APP_VERSION (a JS const) changed the
#   internal value and the changelog, but the badge the user sees stayed at
#   "BETA 0.577" since 0.577.
#
# FIX:
#   • Update the static text to the current version (fallback if JS fails).
#   • Add a one-liner right after DVL_APP_VERSION is defined that syncs the
#     badge text from DVL_APP_VERSION.toUpperCase(). From now on, every
#     future version bump updates the badge automatically — this exact bug
#     can never recur.
#
# VERSION: 0.580 → 0.581

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes = []

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

# ── FIX 1: update the static badge text (fallback) ─────────────────────────────
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.577</div>',
    '<div class="beta" id="versionBadge">BETA 0.581</div>',
    'static versionBadge text 0.577→0.581 (fallback)'
)

# ── FIX 2: sync badge from DVL_APP_VERSION (auto-updates on every future bump) ──
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.580";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;',
    'const DVL_APP_VERSION = "Beta 0.581";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;\n'
    'try{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}',
    'dynamic versionBadge sync + DVL_APP_VERSION 0.580→0.581'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Pinch-assist reescrito: _dvlWP rastreia ponteiros do window handler para nao interferir no tap/crosshair do canvas. stopImmediatePropagation durante pinch impede drag dos osciladores. clearCrossPressTimer no inicio do pinch." },',
    '{ version: DVL_APP_VERSION, note: "Badge de versao corrigido: era texto estatico fixo em BETA 0.577. Agora atualiza automaticamente a partir de DVL_APP_VERSION em todo bump futuro." },\n  { version: "Beta 0.580", note: "Pinch-assist reescrito: _dvlWP rastreia ponteiros do window handler para nao interferir no tap/crosshair do canvas. stopImmediatePropagation durante pinch impede drag dos osciladores. clearCrossPressTimer no inicio do pinch." },',
    'DVL_CHANGELOG 0.581'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.580</title>',
    '<title>DVL Binance Live — Beta 0.581</title>',
    'title 0.580→0.581'
)

# ── result ────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    print('Aborting write — fix anchors first.')
    sys.exit(1)
else:
    print('All checks passed.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

total_lines = html.count('\n') + 1
print()
print('Written to', DST)
print('Total lines after patch: %d' % total_lines)
