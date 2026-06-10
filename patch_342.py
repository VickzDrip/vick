# patch_342.py — Beta 0.342 — kill all auto-reloads + lock version
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.341)
#
# Problems confirmed by video:
#  A) REAL RELOAD (white screen):
#     Beta 0.308 binds touchend (capture-phase) to .tb-logo-center — any accidental
#     mobile touch near logo fires cleanReload() → window.location.reload().
#     Beta 0.309 / 0.310 have the same problem.
#     Main app script wires location.reload() to .brand onclick.
#     Logo wrapper at line ~28702 also has location.reload() on onclick.
#
#  B) BADGE STILL FLICKERS "Beta 0.312":
#     25+ setVersion() functions across the file each have `const VER='Beta 0.312'`
#     and write `window.DVL_APP_VERSION = VER` at DOMContentLoaded + timeouts.
#     We can't individually fix 25+ functions — need an architectural lock.
#
# Fixes:
#  1. Lock window.DVL_APP_VERSION with Object.defineProperty (writable:false)
#     so ALL legacy setVersion/forceVersion assignments silently fail.
#     Also guarded with if(!window.DVL_APP_VERSION) so second copy skips cleanly.
#  2. Add badge enforcement at 3000ms — after all old timeout-based setVersion() calls.
#  3. Beta 0.308 cleanReload(): replace window.location.reload() with visual-only.
#  4. Beta 0.309 cleanReload(): same.
#  5. Beta 0.310 logo click: replace window.location.reload() with no-op.
#  6. Main app .brand onclick: replace location.reload() with null.
#  7. logoWrap.onclick (line ~28702): replace location.reload() with null.
#  8. Clear ALL stale reload localStorage flags at boot.
#  9. Version → Beta 0.342

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

# ── 1. Lock DVL_APP_VERSION + full localStorage cleanup (both copies) ─────────
# Both copies are identical, rep_all covers them.
OLD_VER_BLOCK = (
    'window.DVL_APP_VERSION = "Beta 0.341";\n'
    '/* clear stale reload signals from previous sessions */\n'
    'try{localStorage.removeItem("dvl_force_reload_signal");}catch(_){}\n'
    'try{localStorage.removeItem("dvl_last_reload_version");}catch(_){}\n'
    'try{localStorage.removeItem("dvl_pending_force_reload");}catch(_){}'
)
NEW_VER_BLOCK = (
    '/* guard: second copy of this script (at line ~8745) does nothing */\n'
    'if(!window.DVL_APP_VERSION){\n'
    '  window.DVL_APP_VERSION = "Beta 0.342";\n'
    '  /* lock: prevents ALL legacy setVersion/forceVersion from overwriting */\n'
    '  try{Object.defineProperty(window,"DVL_APP_VERSION",{\n'
    '    value:"Beta 0.342",writable:false,configurable:false,enumerable:true\n'
    '  });}catch(_){}\n'
    '  /* clear all stale reload and version signals */\n'
    '  ["dvl_force_reload_signal","dvl_last_reload_version","dvl_pending_force_reload",\n'
    '   "dvl308_clean_reload","dvl309_clean_reload","dvl310_clean_reload"].forEach(function(k){\n'
    '    try{localStorage.removeItem(k);}catch(_){}\n'
    '  });\n'
    '}'
)
html = rep_all(html, OLD_VER_BLOCK, NEW_VER_BLOCK, 'lock DVL_APP_VERSION + clear reload flags')

# ── 2. Badge enforcement script — add after DVL_APP_VERSION </script> tag ─────
# Runs at DOMContentLoaded + 3000ms, after all legacy setVersion() timeouts.
BADGE_LOCK_ANCHOR = (
    "document.addEventListener('DOMContentLoaded', applyDVLVersionBadge);\n"
    '</script>\n'
    '\n'
    '<script id="DVL_BETA_0006_PROFILE_GUARDS">'
)
BADGE_LOCK_NEW = (
    "document.addEventListener('DOMContentLoaded', applyDVLVersionBadge);\n"
    '</script>\n'
    '\n'
    '<script id="DVL_VERSION_BADGE_LOCK">\n'
    '/* Enforces the correct version badge after all legacy setVersion() timeouts */\n'
    '(function(){\n'
    '  var V=window.DVL_APP_VERSION;\n'
    '  function enforceBadge(){\n'
    "    document.querySelectorAll('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.version-badge,.beta-badge').forEach(function(el){\n"
    '      if(el&&el.textContent!==V)el.textContent=V;\n'
    '    });\n'
    '  }\n'
    "  document.addEventListener('DOMContentLoaded',function(){\n"
    '    enforceBadge();\n'
    '    /* re-enforce at 3000ms — after the longest legacy setVersion timeout (2600ms) */\n'
    '    setTimeout(enforceBadge,3000);\n'
    '  });\n'
    '})();\n'
    '</script>\n'
    '\n'
    '<script id="DVL_BETA_0006_PROFILE_GUARDS">'
)
html = rep(html, BADGE_LOCK_ANCHOR, BADGE_LOCK_NEW, 'add DVL_VERSION_BADGE_LOCK script')

# ── 3. Beta 0.308 cleanReload(): remove window.location.reload() ──────────────
html = rep(html,
    '  function cleanReload(){\n'
    "    try{ localStorage.setItem('dvl308_clean_reload','1'); }catch(e){}\n"
    "    document.documentElement.classList.add('dvl308-clean-reloading');\n"
    "    document.body.classList.add('dvl308-clean-reloading');\n"
    '    const ov = ensureReloadOverlay();\n'
    "    ov.classList.add('show');\n"
    '    setTimeout(function(){\n'
    '      window.location.reload();\n'
    '    }, 80);\n'
    '  }',
    '  function cleanReload(){\n'
    '    /* reload disabled in Beta 0.342 — tap logo to refresh is removed */\n'
    '    const ov = ensureReloadOverlay();\n'
    "    if(ov){ov.classList.add('show');setTimeout(function(){ov.classList.remove('show');},500);}\n"
    '  }',
    'Beta 0.308 cleanReload(): remove location.reload'
)

# ── 4. Beta 0.309 cleanReload(): remove window.location.reload() ──────────────
html = rep(html,
    '  function cleanReload(){\n'
    '    if(cleanReloading) return;\n'
    '    cleanReloading = true;\n'
    "    try{ localStorage.setItem('dvl309_clean_reload','1'); }catch(e){}\n"
    '    const ov = ensureReloadOverlay();\n'
    "    ov.style.display = 'flex';\n"
    "    setTimeout(function(){ window.location.reload(); }, 70);\n"
    '  }',
    '  function cleanReload(){\n'
    '    /* reload disabled in Beta 0.342 */\n'
    '    cleanReloading = false;\n'
    '  }',
    'Beta 0.309 cleanReload(): remove location.reload'
)

# ── 5. Beta 0.310 logo click: remove window.location.reload() ────────────────
html = rep(html,
    "        wrap.addEventListener('click', function(e){\n"
    "          e.preventDefault();\n"
    "          e.stopPropagation();\n"
    "          try{ localStorage.setItem('dvl310_clean_reload','1'); }catch(_e){}\n"
    "          window.location.reload();\n"
    "        }, true);",
    "        wrap.addEventListener('click', function(e){\n"
    "          e.preventDefault();\n"
    "          e.stopPropagation();\n"
    "          /* reload disabled in Beta 0.342 */\n"
    "        }, true);",
    'Beta 0.310 logo click: remove location.reload'
)

# ── 6. Main app .brand / .side-logo onclick: remove location.reload() ─────────
html = rep(html,
    '__brandReload.onclick=()=>location.reload();',
    '__brandReload.onclick=null;',
    'main app __brandReload.onclick: remove location.reload'
)

# ── 7. logoWrap.onclick (setupLogo ~line 28702): remove location.reload() ─────
html = rep(html,
    '      logoWrap.onclick = function(){ location.reload(); };',
    '      logoWrap.onclick = null;',
    'logoWrap.onclick: remove location.reload'
)

# ── 8. Version bump: 0.341 → 0.342 ──────────────────────────────────────────
html = rep(html,
    "  const VER='Beta 0.341';",
    "  const VER='Beta 0.342';",
    'VER 0.341→0.342'
)

# LOCAL_VERSION: 0.340 → 0.342 (both copies)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.340";',
    'const LOCAL_VERSION = "Beta 0.342";',
    'LOCAL_VERSION 0.340→0.342'
)

html = rep(html,
    "'Beta 0.341: Version stability — removed all competing Beta 0.312 badge writers, single source of truth.'",
    "'Beta 0.342: Locked DVL_APP_VERSION (Object.defineProperty), removed all cleanReload/location.reload from logo handlers.'",
    'changelog note 0.342'
)

# ── result ────────────────────────────────────────────────────────────────────
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
print('Beta 0.342 changes:')
print('  - DVL_APP_VERSION locked with Object.defineProperty(writable:false)')
print('    → ALL legacy setVersion/forceVersion assignments silently fail')
print('    → Only one assignment ever takes effect (the first, at boot)')
print('  - DVL_VERSION_BADGE_LOCK script: enforces badge at DOMContentLoaded + 3000ms')
print('  - Beta 0.308 cleanReload(): window.location.reload() removed')
print('  - Beta 0.309 cleanReload(): window.location.reload() removed')
print('  - Beta 0.310 logo click: window.location.reload() removed')
print('  - Main app .brand/side-logo onclick: location.reload() removed')
print('  - logoWrap.onclick: location.reload() removed')
print('  - All dvl30x_clean_reload localStorage flags cleared at boot')
print('  - Version badge: Beta 0.342')
