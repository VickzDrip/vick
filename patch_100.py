#!/usr/bin/env python3
"""Beta 0.100 — Pills: visual selecionado claro; Retorno: fórmula sem cap saturado"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.099', 'Beta 0.100')

# ── 2. changelog ────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.100\n  - Filtro: nova p\xedlula "Trades'
NEW_LOG = ('Beta 0.100\n'
           '  - Filtro: pill selecionada reestilizada — fundo teal s\xf3lido +\n'
           '    texto branco + borda cyan 2px. N\xedtida em qualquer tela.\n'
           '  - Retorno: f\xf3rmula muda de linear (trades\xd7ev) para trades^0.75\xd7ev\xd7k.\n'
           '    Com per\xedodos longos e mode=all (1000+ trades) o retorno n\xe3o\n'
           '    satura mais no cap. Ex.: 576 trades→~128%, 1027 trades→~190%.\n'
           '    Cap aumenta de 80% para 300%. Aplica em HVN e FVG.\n\n'
           'Beta 0.099\n  - Filtro: nova p\xedlula "Trades')
assert OLD_LOG in html, "changelog anchor not found"
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. CSS: pill unselected dimmer, selected = solid teal + white text ────────
OLD_PILL_CSS = (
    '.dvl-opt-pill{background:rgba(255,255,255,.04);border:1px solid #1e2a40;'
    'border-radius:10px;color:#5a7090;font-size:8px;font-weight:700;'
    'letter-spacing:.06em;padding:3px 10px;cursor:pointer;'
    'transition:all .14s;text-transform:uppercase}\n'
    '.dvl-opt-pill.sel{background:rgba(0,200,220,.15);'
    'border-color:rgba(0,200,220,.55);color:#00c8dc;'
    'box-shadow:0 0 0 1.5px rgba(0,200,220,.38),0 0 6px rgba(0,200,220,.18)}'
)
NEW_PILL_CSS = (
    '.dvl-opt-pill{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);'
    'border-radius:10px;color:rgba(255,255,255,.28);font-size:8px;font-weight:700;'
    'letter-spacing:.06em;padding:3px 10px;cursor:pointer;'
    'transition:all .14s;text-transform:uppercase}\n'
    '.dvl-opt-pill.sel{background:rgba(0,160,180,.45);'
    'border:2px solid #00c8dc;color:#fff;font-weight:800;'
    'box-shadow:0 0 0 1px rgba(0,200,220,.6),0 0 7px rgba(0,200,220,.22)}'
)
assert OLD_PILL_CSS in html, "pill CSS not found"
html = html.replace(OLD_PILL_CSS, NEW_PILL_CSS, 1)

# ── 4. HVN return formula: trades^0.75 × ev × 2.5, cap -90/300 ──────────────
OLD_HVN_RET = (
    '  /* Return: expected-value per trade \xd7 trade count, scaled to realistic % */\n'
    '  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;\n'
    '  var ret=trades*_ev*rnd(0.80,1.20);\n'
    '  ret=Math.max(-30,Math.min(80,ret));'
)
NEW_HVN_RET = (
    '  /* Return: power-scaled so long periods don\'t saturate cap */\n'
    '  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;\n'
    '  var ret=Math.pow(trades,0.75)*_ev*2.5*rnd(0.80,1.20);\n'
    '  ret=Math.max(-90,Math.min(300,ret));'
)
assert OLD_HVN_RET in html, "HVN return formula not found"
html = html.replace(OLD_HVN_RET, NEW_HVN_RET, 1)

# ── 5. FVG return formula: same fix ──────────────────────────────────────────
OLD_FVG_RET = (
    '  var pf=Math.max(0.80,Math.min(2.85,0.88+(wr-0.50)*7.8+rnd(-0.08,0.08)));\n'
    '  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;\n'
    '  var ret=trades*_ev*rnd(0.80,1.20);\n'
    '  ret=Math.max(-30,Math.min(80,ret));'
)
NEW_FVG_RET = (
    '  var pf=Math.max(0.80,Math.min(2.85,0.88+(wr-0.50)*7.8+rnd(-0.08,0.08)));\n'
    '  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;\n'
    '  var ret=Math.pow(trades,0.75)*_ev*2.5*rnd(0.80,1.20);\n'
    '  ret=Math.max(-90,Math.min(300,ret));'
)
assert OLD_FVG_RET in html, "FVG return formula not found"
html = html.replace(OLD_FVG_RET, NEW_FVG_RET, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.100 applied')
