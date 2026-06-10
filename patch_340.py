# patch_340.py — Beta 0.340 — kill auto-reload loop
# SOURCE/TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.339)
#
# Root cause: Two DVL_FORCE_UPDATE_MANAGER IIFEs (lines ~793 and ~7094) each
# poll /api/version on a 30-45s interval. When the server-reported version
# doesn't match DVL_APP_VERSION, forceReloadToLatest() shows the
# "Nova versão detectada. Atualizando..." toast and calls location.replace(),
# which reloads the page — then the same mismatch fires again → reload loop.
#
# Fix: Stub forceReloadToLatest() to a no-op in both copies.
# Both copies are byte-identical, so rep_all covers them.
# Version → Beta 0.340

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

# ── 1. Stub forceReloadToLatest in BOTH copies (identical body) ──────────────
OLD_FORCE_RELOAD = (
    '  async function forceReloadToLatest(version){\n'
    '    const now = Date.now();\n'
    '    const lastVersion = localStorage.getItem("dvl_last_reload_version");\n'
    '    const lastTime = +(localStorage.getItem("dvl_last_reload_time") || 0);\n'
    '\n'
    '    if(lastVersion === version && now - lastTime < 10000) return;\n'
    '\n'
    '    localStorage.setItem("dvl_pending_force_reload", version);\n'
    '    localStorage.setItem("dvl_last_reload_version", version);\n'
    '    localStorage.setItem("dvl_last_reload_time", String(now));\n'
    '\n'
    '    try{ if(bc) bc.postMessage({type:"DVL_FORCE_RELOAD", version}); }catch(_){}\n'
    '    try{ localStorage.setItem("dvl_force_reload_signal", version + "|" + now); }catch(_){}\n'
    '\n'
    '    const banner = document.createElement("div");\n'
    '    banner.textContent = "Nova versão detectada. Atualizando...";\n'
    '    banner.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;background:#070c18;color:#c8d8f0;border:1px solid #1e2a40;border-radius:10px;padding:9px 13px;font:700 12px monospace;box-shadow:0 12px 35px rgba(0,0,0,.45)";\n'
    '    try{ document.body.appendChild(banner); }catch(_){}\n'
    '\n'
    '    await clearRuntimeCaches();\n'
    '\n'
    '    setTimeout(function(){\n'
    '      const url = new URL(location.href);\n'
    '      url.searchParams.set("v", versionSlug(version));\n'
    '      url.searchParams.set("reload", String(Date.now()));\n'
    '      location.replace(url.toString());\n'
    '    }, 350);\n'
    '  }'
)

NEW_FORCE_RELOAD = (
    '  async function forceReloadToLatest(version){\n'
    '    /* auto-reload disabled — server version mismatch is expected during patching */\n'
    '    console.warn("[DVL] version check (no reload):", version);\n'
    '  }'
)

html = rep_all(html, OLD_FORCE_RELOAD, NEW_FORCE_RELOAD, 'stub forceReloadToLatest')

# ── 2. Version bump: 0.339 → 0.340 ──────────────────────────────────────────
html = rep(html,
    "  const VER='Beta 0.339';",
    "  const VER='Beta 0.340';",
    'VER 0.339→0.340'
)

html = rep(html,
    "'Beta 0.339: Cleaned duplicate CG patch loops, killed flickering intervals, single-line L/S ratio, accounts-global default.'",
    "'Beta 0.340: Disabled auto-reload loop — forceReloadToLatest stubbed, no more version-mismatch reload.'",
    'changelog note 0.340'
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
print('Beta 0.340 changes:')
print('  - forceReloadToLatest() stubbed in both DVL_FORCE_UPDATE_MANAGER copies')
print('  - "Nova versão detectada. Atualizando..." toast and location.replace() removed')
print('  - checkVersion() still polls /api/version but does nothing on mismatch')
print('  - Version badge: Beta 0.340')
