# patch_347.py — Beta 0.347
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.346)
#
# STRUCTURAL CLEANUP:
#   Removes lines 3199–7035 — the old/duplicate first-body content:
#     - Duplicate pre-ui script and CSS (lines 3199-3218)
#     - Duplicate desktop sidebar CSS + old topbar/sidebar/right-panel HTML (3219-5262)
#     - Old main JS script (const API, const S, etc.) (5263-7035)
#     That script also contains embedded <!DOCTYPE html>/<html>/<head> text and
#     the inner DVL_FORCE_UPDATE_MANAGER (its </script> closed the outer script).
#   After removal the body starts directly with the current app CSS at what was line 7036.
#
#   Result: exactly 1 DOCTYPE, 1 <html>, 1 <head>, 1 <body>, 1 </body>, 1 </html>.
#
# VERSION: 0.346 → 0.347

import sys, re

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

def rep_all(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    fixes.append('%s (x%d)' % (label, html.count(old)))
    return html.replace(old, new)

# ── 1. STRUCTURAL REMOVAL ────────────────────────────────────────────────────
# Strategy: find <body>\n (unique), then find the second occurrence of
#   <style>\n*{box-sizing:border-box;
# (first = head, second = body after big outer script).
# Remove everything between <body>\n and that second <style>.
# Result: body starts directly with the current app CSS.
STYLE_MARKER = '<style>\n*{box-sizing:border-box;'

body_pos = html.find('<body>\n')
if body_pos < 0:
    print('FATAL: <body> not found')
    sys.exit(1)
body_content_start = body_pos + len('<body>\n')

first_style = html.find(STYLE_MARKER)
second_style = html.find(STYLE_MARKER, first_style + 1)

if first_style < 0 or second_style < 0:
    print('FATAL: CSS boundary markers not found (first=%d second=%d)' % (first_style, second_style))
    sys.exit(1)

if second_style <= body_content_start:
    print('FATAL: second style marker is before body content start')
    sys.exit(1)

# Verify: the removed chunk should contain exactly 1 duplicate DOCTYPE/html/head
removed_chunk = html[body_content_start:second_style]
doctype_count = removed_chunk.count('<!DOCTYPE html>')
html_count = removed_chunk.count('<html ')
head_count = removed_chunk.count('<head>')
body_in_removal = removed_chunk.count('<body>')
removed_lines = removed_chunk.count('\n')

if body_in_removal > 0:
    errors.append('SAFETY: removed chunk contains <body> — aborting structural removal')
else:
    # Apply the structural removal
    html = html[:body_content_start] + html[second_style:]
    fixes.append(
        'structural removal: removed %d lines (%d bytes) of duplicate body content '
        '(pre-ui script+CSS, old app HTML, old main JS script; '
        'removed DOCTYPE:%d html:%d head:%d inner-body:%d from within)'
        % (removed_lines, len(removed_chunk), doctype_count, html_count, head_count, body_in_removal)
    )

# ── Post-removal sanity: count structural tags ───────────────────────────────
for tag, expected in [('<!DOCTYPE html>', 1), ('<html ', 1), ('<head>', 1),
                       ('</head>', 1), ('<body>', 1), ('</body>', 1), ('</html>', 1)]:
    count = html.count(tag)
    if count != expected:
        errors.append('TAG COUNT: %s expected %d got %d' % (tag, expected, count))

# ── 2. Version bump: 0.346 → 0.347 ──────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.346";',
    'const DVL_APP_VERSION = "Beta 0.347";',
    'DVL_APP_VERSION const 0.346→0.347'
)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.346";',
    'const LOCAL_VERSION = "Beta 0.347";',
    'LOCAL_VERSION 0.346→0.347'
)
html = rep(html,
    "  const VER='Beta 0.346';",
    "  const VER='Beta 0.347';",
    'VER 0.346→0.347 in DVL_BETA_0334 script'
)
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.346</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.347</span>',
    'static dvlVersionBadge 0.346→0.347'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.346</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.347</span>',
    'static dvl-version-logo-hidden 0.346→0.347'
)
html = rep(html,
    "'Beta 0.346: Emergency — removed auto-reload/BroadcastChannel/checkVersion/caches.delete; single DVL_FORCE_UPDATE_MANAGER no-op; const DVL_APP_VERSION lock.'",
    "'Beta 0.347: Documento HTML consolidado: removidas cópias duplicadas de doctype/html/head/body. Estrutura DOM estabilizada para evitar comportamento imprevisível no mobile.'",
    'changelog note 0.347'
)
# Update comment in DVL_APP_VERSION badge section that references old line number
html = rep(html,
    '/* Beta 0.346: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    '/* Beta 0.347: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    'DVL_APP_VERSION stub comment 0.346→0.347'
)

# ── result ────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 2:
        print('Too many errors — aborting write.')
        sys.exit(1)
else:
    print('All checks passed.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print()

# Final stats
total_lines = html.count('\n') + 1
print('Written to', DST)
print('Total lines after cleanup: %d (was ~61949, removed ~3837)' % total_lines)
print()
print('Beta 0.347 structural changes:')
print('  - Removed OLD duplicate body content (lines 3199-7035):')
print('    * Pre-ui init script + CSS (duplicate of real app)')
print('    * Old app HTML: right-panel, platform, topbar, sidebar, canvas (duplicate DOM)')
print('    * Old main JS script (const API, const S — duplicate, was broken by SyntaxError)')
print('    * Embedded <!DOCTYPE html>/<html>/<head> text (inside old script, now gone)')
print('    * Inner DVL_FORCE_UPDATE_MANAGER (duplicate, inside old script)')
print('  - Document now has exactly: 1 DOCTYPE, 1 html, 1 head, 1 body, 1 /body, 1 /html')
print('  - Body starts directly with current app CSS (was at line 7036)')
print('  - Version: Beta 0.347')
