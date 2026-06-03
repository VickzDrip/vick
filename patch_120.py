#!/usr/bin/env python3
"""Beta 0.120 — Fix DVL_FORCE_UPDATE_MANAGER: LOCAL_VERSION e DVL_APP_VERSION desatualizados

Causa raiz:
  Os patches 0.117/0.118/0.119 só atualizavam 'var V' e o comentário HTML.
  Mas existem DOIS outros lugares que precisam do número de versão:
    1. window.DVL_APP_VERSION = "Beta 0.116"  (linha ~2353) — comparado com /api/version
    2. const LOCAL_VERSION = "Beta 0.116"     (linha ~663)  — fallback quando DVL_APP_VERSION não carregou
  Com os dois presos em 0.116 enquanto /api/version retorna 0.119,
  o manager detectava mismatch, chamava forceReloadToLatest, mas o loop
  protection (mesma versão < 10s) barrava — página nunca atualizava.

Correção:
  Atualizar DVL_APP_VERSION e LOCAL_VERSION para 0.120 junto com o bump normal de versão.
  Daqui em diante todo patch deve atualizar os 3 campos.
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. var V (IIFE) ───────────────────────────────────────────────────────────
OLD_V = "var V='Beta 0.119';"
NEW_V = "var V='Beta 0.120';"
assert OLD_V in html, 'IIFE version string not found'
html = html.replace(OLD_V, NEW_V, 1)

# ── 2. HTML comment ───────────────────────────────────────────────────────────
OLD_CMT = '<!-- DVL_STRATEGY_TESTER v0.119 -->'
NEW_CMT = '<!-- DVL_STRATEGY_TESTER v0.120 -->'
assert OLD_CMT in html
html = html.replace(OLD_CMT, NEW_CMT, 1)

# ── 3. window.DVL_APP_VERSION ─────────────────────────────────────────────────
OLD_APP_V = 'window.DVL_APP_VERSION = "Beta 0.116";'
NEW_APP_V = 'window.DVL_APP_VERSION = "Beta 0.120";'
assert OLD_APP_V in html, 'window.DVL_APP_VERSION not found'
html = html.replace(OLD_APP_V, NEW_APP_V, 1)

# ── 4. LOCAL_VERSION (fallback inside DVL_FORCE_UPDATE_MANAGER) ───────────────
OLD_LOC = '  const LOCAL_VERSION = "Beta 0.116";'
NEW_LOC = '  const LOCAL_VERSION = "Beta 0.120";'
assert OLD_LOC in html, 'LOCAL_VERSION not found'
html = html.replace(OLD_LOC, NEW_LOC, 1)

# ── 5. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = (
    'Beta 0.119\n'
    '  - Backtest real: LONGS/SHORTS e Melhor Dire\xe7\xe3o/Sess\xe3o agora calculados\n'
)
NEW_LOG = (
    'Beta 0.120\n'
    '  - Fix DVL_FORCE_UPDATE_MANAGER: DVL_APP_VERSION e LOCAL_VERSION\n'
    '    agora atualizados em cada patch (estavam presos em 0.116)\n'
    'Beta 0.119\n'
    '  - Backtest real: LONGS/SHORTS e Melhor Dire\xe7\xe3o/Sess\xe3o agora calculados\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.120 applied')
