# patch_341.py — Beta 0.341 — comprehensive version stability
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.340)
#
# Problem: Multiple old patch blocks actively write "Beta 0.312" to both
# window.DVL_APP_VERSION and the badge at DOMContentLoaded / timed callbacks,
# fighting the latest patch's forceVersion(). This causes:
#   - badge flickering (0.312 ↔ 0.340 oscillation)
#   - version mismatch detections (DVL_FORCE_UPDATE_MANAGER seeing "0.312")
#   - the old "Nova versão detectada" reload loop
#
# Fixes:
#  1. Primary DVL_APP_VERSION declaration: "Beta 0.319" → "Beta 0.340"
#  2. LOCAL_VERSION in both DVL_FORCE_UPDATE_MANAGER IIFEs: "Beta 0.317" → "Beta 0.340"
#  3. Badge HTML literals: "Beta 0.316" and "Beta 0.312" → "Beta 0.340"
#  4. DVL_BETA_0037 IIFE: remove version writes, keep crosshair cleanup
#  5. Anonymous IIFE (~line 33499): neutralize (only sets "Beta 0.312")
#  6. DVL_BETA_0235 apply(): remove version writes, keep trade-button setup
#  7. Beta 0.311 boot(): remove hardcoded badge write to "Beta 0.312"
#  8. Add boot-time localStorage cleanup of stale reload keys
#  9. Version → Beta 0.341

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

# ── 1. Primary DVL_APP_VERSION declarations (two identical copies) ────────────
html = rep_all(html,
    'window.DVL_APP_VERSION = "Beta 0.319";',
    'window.DVL_APP_VERSION = "Beta 0.340";',
    'primary DVL_APP_VERSION 0.319→0.340'
)

# ── 2. Boot-time localStorage cleanup (added after DVL_APP_VERSION declaration)
# Both copies are identical — rep_all covers both
html = rep_all(html,
    'window.DVL_APP_VERSION = "Beta 0.340";\n'
    '\n'
    'function applyDVLVersionBadge(){',
    'window.DVL_APP_VERSION = "Beta 0.340";\n'
    '/* clear stale reload signals from previous sessions */\n'
    'try{localStorage.removeItem("dvl_force_reload_signal");}catch(_){}\n'
    'try{localStorage.removeItem("dvl_last_reload_version");}catch(_){}\n'
    'try{localStorage.removeItem("dvl_pending_force_reload");}catch(_){}\n'
    '\n'
    'function applyDVLVersionBadge(){',
    'add localStorage cleanup after DVL_APP_VERSION'
)

# ── 3. LOCAL_VERSION in both DVL_FORCE_UPDATE_MANAGER copies ─────────────────
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.317";',
    'const LOCAL_VERSION = "Beta 0.340";',
    'LOCAL_VERSION 0.317→0.340'
)

# ── 4. Badge HTML literal #1 ("Beta 0.316") ──────────────────────────────────
html = rep(html,
    '<span id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.316</span>',
    '<span id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.340</span>',
    'badge HTML 0.316→0.340'
)

# ── 5. Badge HTML literal #2 ("Beta 0.312") ──────────────────────────────────
html = rep(html,
    '<span id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.312</span>',
    '<span id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.340</span>',
    'badge HTML 0.312→0.340'
)

# ── 6. DVL_BETA_0037: remove version writes, keep crosshair cleanup ───────────
# The IIFE sets DVL_APP_VERSION='Beta 0.312' and updates badge,
# then removes #dvlCrosshairTopLayer. Keep only the crosshair removal.
html = rep(html,
    '(function(){\n'
    "  try{ window.DVL_APP_VERSION='Beta 0.312'; }catch(_){}\n"
    '  function sync(){\n'
    "    try{document.querySelectorAll('#dvlVersionBadge,.dvl-version-badge').forEach(function(b){b.textContent='Beta 0.312';});}catch(_){}\n"
    "    try{document.querySelectorAll('#dvlCrosshairTopLayer').forEach(function(x){x.remove();});}catch(_){}\n"
    '  }\n'
    "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();\n"
    '})();',
    '(function(){\n'
    '  function sync(){\n'
    "    try{document.querySelectorAll('#dvlCrosshairTopLayer').forEach(function(x){x.remove();});}catch(_){}\n"
    '  }\n'
    "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();\n"
    '})();',
    'DVL_BETA_0037: remove version writes, keep crosshair cleanup'
)

# ── 7. Anonymous IIFE (line ~33499): only sets "Beta 0.312" — neutralize ──────
html = rep(html,
    '(function(){\n'
    "  try{ window.DVL_APP_VERSION='Beta 0.312'; }catch(e){}\n"
    '  try{\n'
    "    document.querySelectorAll('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden').forEach(function(el){ el.textContent='Beta 0.312'; });\n"
    '  }catch(e){}\n'
    '})();',
    '/* version writes removed — Beta 0.341 owns version */',
    'anon IIFE 0.312 badge writer neutralized'
)

# ── 8. DVL_BETA_0235 apply(): remove version writes from first two lines ──────
html = rep(html,
    "    try{window.DVL_APP_VERSION='Beta 0.312';}catch(e){}\n"
    "    document.querySelectorAll('.dvl-version-badge,#dvlVersionBadge').forEach(function(el){if(el)el.textContent='Beta 0.312';});\n"
    '    if(window.applyDVLVersionBadge)window.applyDVLVersionBadge();',
    '    if(window.applyDVLVersionBadge)window.applyDVLVersionBadge();',
    'DVL_BETA_0235 apply(): remove version writes'
)

# ── 9. Beta 0.311 boot(): remove hardcoded badge write ────────────────────────
html = rep(html,
    '    patchRender();\n'
    "    document.querySelectorAll('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header').forEach(el=>el.textContent='Beta 0.312');\n"
    '  }',
    '    patchRender();\n'
    '  }',
    'Beta 0.311 boot(): remove hardcoded badge write'
)

# ── 10. Version bump: 0.340 → 0.341 ──────────────────────────────────────────
html = rep(html,
    "  const VER='Beta 0.340';",
    "  const VER='Beta 0.341';",
    'VER 0.340→0.341'
)

html = rep(html,
    "'Beta 0.340: Disabled auto-reload loop — forceReloadToLatest stubbed, no more version-mismatch reload.'",
    "'Beta 0.341: Version stability — removed all competing Beta 0.312 badge writers, single source of truth.'",
    'changelog note 0.341'
)

# ── result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 3:
        print('Too many errors — aborting write.')
        exit(1)
else:
    print('All replacements succeeded.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print()
print('Written to', DST)
print()
print('Beta 0.341 changes:')
print('  - DVL_APP_VERSION primary declaration: 0.319 → 0.340')
print('  - LOCAL_VERSION in both update manager copies: 0.317 → 0.340')
print('  - Badge HTML literals updated: 0.316/0.312 → 0.340')
print('  - DVL_BETA_0037 IIFE: version writes removed, crosshair cleanup kept')
print('  - Anonymous IIFE (~line 33499): neutralized (was writing 0.312 to badge)')
print('  - DVL_BETA_0235 apply(): version writes stripped, trade button logic kept')
print('  - Beta 0.311 boot(): hardcoded badge-to-0.312 write removed')
print('  - Boot-time localStorage cleanup: stale reload keys cleared once at start')
print('  - No more version oscillation between 0.312 and 0.340')
print('  - Version badge: Beta 0.341')
