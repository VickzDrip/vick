#!/usr/bin/env python3
"""Beta 0.121 — Fix todos os hardcodes "Beta 0.116" que sobrescrevem versão/badge

Causa raiz (completa):
  Existem 4 scripts legados que definem VERSION/'Beta 0.116' E sobrescrevem
  window.DVL_APP_VERSION + badge DEPOIS do bloco DVL_APP_VERSION.
  O último a rodar (linha ~22809) ganhava sempre → badge mostrava 0.116.

  Scripts afetados:
    DVL_BETA_0037_NATIVE_CROSS_STATE_CLEANUP  (window.DVL_APP_VERSION + badge)
    DVL_BETA_0041_OSC_CROSS_OVERLAY_JS        (const VERSION + badge via sync)
    DVL_BETA_0045_PREMIUM_POLISH_JS           (const VERSION + badge via sync)
    DVL_BETA_0011_STARTUP_GUARD               (window.DVL_APP_VERSION + badge)
    script sem ID antes de DVL_BETA_0078...    (const VERSION + DVL_APP_VERSION)
    script DOM overlay gear buttons            (var VERSION)

  Também: span#dvlVersionBadge e span.dvl-version-logo-hidden no HTML.
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. var V (IIFE Strategy Tester) ──────────────────────────────────────────
OLD_V = "var V='Beta 0.120';"
NEW_V = "var V='Beta 0.121';"
assert OLD_V in html
html = html.replace(OLD_V, NEW_V, 1)

# ── 2. HTML comment ───────────────────────────────────────────────────────────
OLD_CMT = '<!-- DVL_STRATEGY_TESTER v0.120 -->'
NEW_CMT = '<!-- DVL_STRATEGY_TESTER v0.121 -->'
assert OLD_CMT in html
html = html.replace(OLD_CMT, NEW_CMT, 1)

# ── 3. window.DVL_APP_VERSION (DVL_APP_VERSION script block) ─────────────────
OLD_APP_V = 'window.DVL_APP_VERSION = "Beta 0.120";'
NEW_APP_V = 'window.DVL_APP_VERSION = "Beta 0.121";'
assert OLD_APP_V in html
html = html.replace(OLD_APP_V, NEW_APP_V, 1)

# ── 4. LOCAL_VERSION (DVL_FORCE_UPDATE_MANAGER) ───────────────────────────────
OLD_LOC = '  const LOCAL_VERSION = "Beta 0.120";'
NEW_LOC = '  const LOCAL_VERSION = "Beta 0.121";'
assert OLD_LOC in html
html = html.replace(OLD_LOC, NEW_LOC, 1)

# ── 5. HTML badge elements ─────────────────────────────────────────────────────
OLD_BADGE1 = '<span id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.116</span>'
NEW_BADGE1 = '<span id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.121</span>'
assert OLD_BADGE1 in html, 'dvlVersionBadge span not found'
html = html.replace(OLD_BADGE1, NEW_BADGE1, 1)

OLD_BADGE2 = '<span class="dvl-version-badge dvl-version-logo-hidden">Beta 0.116</span>'
NEW_BADGE2 = '<span class="dvl-version-badge dvl-version-logo-hidden">Beta 0.121</span>'
assert OLD_BADGE2 in html, 'dvl-version-logo-hidden span not found'
html = html.replace(OLD_BADGE2, NEW_BADGE2, 1)

# ── 6. DVL_BETA_0037: DVL_APP_VERSION + badge text ───────────────────────────
OLD_037_V = "  try{ window.DVL_APP_VERSION='Beta 0.116'; }catch(_){}"
NEW_037_V = "  try{ window.DVL_APP_VERSION='Beta 0.121'; }catch(_){}"
assert OLD_037_V in html, 'DVL_BETA_0037 DVL_APP_VERSION not found'
html = html.replace(OLD_037_V, NEW_037_V, 1)

OLD_037_B = "    try{document.querySelectorAll('#dvlVersionBadge,.dvl-version-badge').forEach(function(b){b.textContent='Beta 0.116';});}catch(_){}"
NEW_037_B = "    try{document.querySelectorAll('#dvlVersionBadge,.dvl-version-badge').forEach(function(b){b.textContent='Beta 0.121';});}catch(_){}"
assert OLD_037_B in html, 'DVL_BETA_0037 badge textContent not found'
html = html.replace(OLD_037_B, NEW_037_B, 1)

# ── 7. DVL_BETA_0041: const VERSION ──────────────────────────────────────────
OLD_041_V = "  const VERSION='Beta 0.116';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }"
NEW_041_V = "  const VERSION='Beta 0.121';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }"
assert OLD_041_V in html, 'DVL_BETA_0041 VERSION not found'
html = html.replace(OLD_041_V, NEW_041_V, 1)

# ── 8. DVL_BETA_0045: const VERSION ──────────────────────────────────────────
OLD_045_V = "  const VERSION='Beta 0.116';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }"
NEW_045_V = "  const VERSION='Beta 0.121';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }"
assert OLD_045_V in html, 'DVL_BETA_0045 VERSION not found'
html = html.replace(OLD_045_V, NEW_045_V, 1)

# ── 9. DVL_BETA_0011: window.DVL_APP_VERSION + badge ────────────────────────
OLD_011_V = "  window.DVL_APP_VERSION='Beta 0.116';"
NEW_011_V = "  window.DVL_APP_VERSION='Beta 0.121';"
assert OLD_011_V in html, 'DVL_BETA_0011 DVL_APP_VERSION not found'
html = html.replace(OLD_011_V, NEW_011_V, 1)

OLD_011_B = "    if(b)b.textContent='Beta 0.116';"
NEW_011_B = "    if(b)b.textContent='Beta 0.121';"
assert OLD_011_B in html, 'DVL_BETA_0011 badge textContent not found'
html = html.replace(OLD_011_B, NEW_011_B, 1)

# ── 10. neutralized osc-wheel script: const VERSION + DVL_APP_VERSION ────────
OLD_NEU_V = "  const VERSION = 'Beta 0.116';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }"
NEW_NEU_V = "  const VERSION = 'Beta 0.121';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }"
assert OLD_NEU_V in html, 'neutralized script VERSION not found'
html = html.replace(OLD_NEU_V, NEW_NEU_V, 1)

# ── 11. DOM overlay gear buttons: var VERSION ─────────────────────────────────
OLD_DOM_V = "  var VERSION='Beta 0.116';\n  var KEYS=['flow','clarity'];"
NEW_DOM_V = "  var VERSION='Beta 0.121';\n  var KEYS=['flow','clarity'];"
assert OLD_DOM_V in html, 'DOM overlay VERSION not found'
html = html.replace(OLD_DOM_V, NEW_DOM_V, 1)

# ── 12. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = (
    'Beta 0.120\n'
    '  - Fix DVL_FORCE_UPDATE_MANAGER: DVL_APP_VERSION e LOCAL_VERSION\n'
    '    agora atualizados em cada patch (estavam presos em 0.116)\n'
)
NEW_LOG = (
    'Beta 0.121\n'
    '  - Fix badge vers\xe3o: 10 scripts legados sobrescreviam DVL_APP_VERSION\n'
    '    e badge de volta para 0.116 ap\xf3s o bloco DVL_APP_VERSION\n'
    'Beta 0.120\n'
    '  - Fix DVL_FORCE_UPDATE_MANAGER: DVL_APP_VERSION e LOCAL_VERSION\n'
    '    agora atualizados em cada patch (estavam presos em 0.116)\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.121 applied')
