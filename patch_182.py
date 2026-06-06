#!/usr/bin/env python3
"""patch_182.py — Beta 0.182: Reverter alteracoes UI do 180/181, manter só fixes de trading

Reverte:
- Botao "24H" toggle injetado na price strip (tb-24-toggle)
- CSS mobile que escondia logo, badge, tf-bar
- Script init que colocava 24H collapsed
- Mantém: cores buy/sell, TP/SL sem background, execução no tick, drag fix
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.181') >= 10, f'count={html.count("Beta 0.181")}'
html = html.replace('Beta 0.181', 'Beta 0.182')

# ── 1. Remover botao 24H toggle injetado ─────────────────────────────────────
OLD_24H_BTN = (
    '  <button id="tb24Toggle" class="tb-24-toggle" onclick="(function(){var s=document.querySelector(\'.tb-price-stats\');if(!s)return;var h=s.classList.toggle(\'tb-stats-collapsed\');localStorage.setItem(\'dvl24hCollapsed\',h?\'1\':\'0\');var btn=document.getElementById(\'tb24Toggle\');if(btn)btn.setAttribute(\'data-open\',h?\'0\':\'1\');})()" title="24H stats">'
    '<span>24H</span>'
    '<svg id="tb24Chevron" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
    '</button>\n  <div class="tb-price-stats">'
)
assert OLD_24H_BTN in html, 'tb24Toggle not found'
html = html.replace(OLD_24H_BTN, '  <div class="tb-price-stats">', 1)

# ── 2. Remover o bloco CSS mobile injetado pelo patch_180 ─────────────────────
OLD_MOBILE_CSS_START = '\n/* ═══════════════════════════════════════════\n   DVL Beta 0.181 — Mobile UI Improvements\n   ═══════════════════════════════════════════ */'
OLD_MOBILE_CSS_END = '\n  #ppQuickBtns{top:114px!important;}\n  .tb-icon-btn{width:30px!important;height:30px!important;}\n  .pp-qbtn{font-size:9.5px!important;padding:4px 8px!important;}\n}'

assert OLD_MOBILE_CSS_START in html, 'mobile CSS block start not found'
assert OLD_MOBILE_CSS_END in html, 'mobile CSS block end not found'

idx_s = html.index(OLD_MOBILE_CSS_START)
idx_e = html.index(OLD_MOBILE_CSS_END) + len(OLD_MOBILE_CSS_END)
html = html[:idx_s] + html[idx_e:]

# ── 3. Remover script init 24H colapsado ──────────────────────────────────────
OLD_INIT_SCRIPT = (
    '\n<script>\n/* DVL 0.180 — Restore 24H stats collapsed state on mobile */\n'
    '(function(){\n'
    '  if(window.innerWidth>760)return;\n'
    '  var collapsed=localStorage.getItem(\'dvl24hCollapsed\');\n'
    '  /* Default expanded on first mobile visit */\n'
    '  if(collapsed===null)collapsed=\'0\';\n'
    '  var stats=document.querySelector(\'.tb-price-stats\');\n'
    '  var btn=document.getElementById(\'tb24Toggle\');\n'
    '  if(stats&&collapsed===\'1\'){\n'
    '    stats.classList.add(\'tb-stats-collapsed\');\n'
    '    if(btn)btn.setAttribute(\'data-open\',\'0\');\n'
    '  } else if(stats) {\n'
    '    stats.classList.remove(\'tb-stats-collapsed\');\n'
    '    if(btn)btn.setAttribute(\'data-open\',\'1\');\n'
    '  }\n'
    '})();\n'
    '</script>'
)
assert OLD_INIT_SCRIPT in html, '24H init script not found'
html = html.replace(OLD_INIT_SCRIPT, '', 1)

# ── 4. Remover CSS do tb-24-toggle ────────────────────────────────────────────
OLD_TOGGLE_CSS = (
    '\n/* ── 24H toggle button ── */\n'
    '.tb-24-toggle{\n'
    '  display:none;\n'
    '  align-items:center;gap:3px;\n'
    '  background:none;border:none;\n'
    '  color:#4a6580;cursor:pointer;\n'
    '  font-family:monospace;font-size:8.5px;font-weight:700;\n'
    '  letter-spacing:.06em;padding:2px 5px 2px 2px;\n'
    '  border-radius:3px;\n'
    '  transition:color .15s;\n'
    '  flex-shrink:0;\n'
    '}\n'
    '.tb-24-toggle:hover{color:#c8d8f0;}\n'
    '.tb-24-toggle svg{transition:transform .2s;}\n'
    '.tb-24-toggle[data-open="0"] svg{transform:rotate(-90deg);}\n'
    '.tb-price-stats.tb-stats-collapsed{display:none!important;}'
)
assert OLD_TOGGLE_CSS in html, 'tb-24-toggle CSS not found'
html = html.replace(OLD_TOGGLE_CSS, '', 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_182.py applied — Beta 0.182')
print('  Revertidos: botao 24H toggle, CSS mobile agressivo, script init collapsed')
print('  Mantidos: cores buy/sell, labels TP/SL sem background, TP/SL no tick, drag fix')
