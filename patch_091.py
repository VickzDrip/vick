#!/usr/bin/env python3
"""Beta 0.091 — Hotfix: avgW/avgL reintroduzidos após remoção acidental no 0.090"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.090', 'Beta 0.091')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.091\n  - Optimizer/Backtest: corrige PF travado',
    '''Beta 0.091
  - Hotfix: avgW e avgL reintroduzidos no _backtest após remoção acidental
    no 0.090. O loop do equity curve ainda os referenciava, causando NaN
    na curva e quebrando o backtest/optimizer por completo.

Beta 0.090
  - Optimizer/Backtest: corrige PF travado''',
    1
)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.091 applied')
