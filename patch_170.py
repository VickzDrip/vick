#!/usr/bin/env python3
"""patch_170.py — Beta 0.170: Fix MA inputs inacessíveis no modal mobile

Problemas no Beta 0.169:
1. .input-modal-body input{width:100%;min-width:0} sobrescreve as widths
   inline dos inputs da tabela MA, quebrando o layout flex da linha
2. type="number" em mobile mostra setas spin que tomam espaço útil
3. Sem overflow-x:auto → colunas da direita (Estilo) ficam fora do toque

Correções:
1. Adiciona <style> scoped no #settings-movingAverages que usa ID specificity
   para repor width:auto; min-width:0; min-height:auto nos inputs/selects
2. Muda inputs de período: type="number" → type="text" inputmode="numeric"
   pattern="[0-9]+" (evita setas spin; teclado numérico continua abrindo)
3. Envolve header + linhas em div overflow-x:auto;-webkit-overflow-scrolling:touch
   para que o utilizador possa deslizar lateralmente e aceder a todos os campos
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.169') >= 10, 'Beta 0.169 not found'
html = html.replace('Beta 0.169', 'Beta 0.170')

# ── 1. Muda todos os inputs de período: type="number" → type="text" inputmode="numeric" ─
# São 10 inputs, todos com padrão idêntico excepto id e value
import re

def fix_period_input(m):
    return m.group(0).replace(
        'type="number"',
        'type="text" inputmode="numeric" pattern="[0-9]+"'
    )

period_pattern = re.compile(
    r'<input class="num" type="number" id="ma\d+Period"[^>]+>'
)
count_before = len(period_pattern.findall(html))
assert count_before == 10, f'Expected 10 period inputs, found {count_before}'
html = period_pattern.sub(fix_period_input, html)

# Verifica que foram todos substituídos
count_after = len(re.findall(r'type="text" inputmode="numeric"', html))
assert count_after == 10, f'Expected 10 replacements, got {count_after}'

# ── 2. Adiciona <style> scoped + overflow wrapper ──────────────────────────────────
# O <style> usa #settings-movingAverages (ID specificity=100) para anular
# .input-modal-body input{width:100%;min-width:0} (specificity=11)
# O wrapper overflow-x:auto permite scroll horizontal para aceder Estilo/Larg

OLD_SETTINGS_OPEN = (
    '          <div class="ind-settings" id="settings-movingAverages">\n'
    '            <!-- header de colunas -->\n'
    '            <div style="display:flex;align-items:center;gap:3px;padding:0 0 4px;border-bottom:1px solid rgba(34,211,238,.12);margin-bottom:2px;">'
)
assert OLD_SETTINGS_OPEN in html, 'settings-movingAverages open anchor not found'

# Encontrar o fechamento do settings div + Show MA Labels + hint
# Âncora: a linha do "Show MA Labels" + hint + </div> do settings
OLD_SETTINGS_CLOSE = (
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <label class="kv" style="cursor:pointer;">'
    '<span class="k">Show MA Labels</span>'
    '<input type="checkbox" id="maShowLabels" style="width:14px;height:14px;accent-color:#22d3ee;cursor:pointer;flex-shrink:0;">'
    '</label>\n'
    '            <div class="hint">DVL Moving Averages — até 10 médias independentes. '
    'Tipos: SMA, EMA, WMA, VWMA, RMA, HMA, DEMA, TEMA, LSMA, KAMA. '
    'Por padrão: MA1 = SMA 20 ativa.</div>\n'
    '          </div>\n'
)
assert OLD_SETTINGS_CLOSE in html, 'settings-movingAverages close anchor not found'

# Substitui abertura: adiciona <style> scoped + abre wrapper scroll
html = html.replace(
    OLD_SETTINGS_OPEN,
    '          <div class="ind-settings" id="settings-movingAverages">\n'
    '            <style>\n'
    '              #settings-movingAverages input,\n'
    '              #settings-movingAverages select{\n'
    '                width:auto!important;min-width:0!important;\n'
    '                min-height:auto!important;box-sizing:border-box;\n'
    '              }\n'
    '            </style>\n'
    '            <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;">\n'
    '            <!-- header de colunas -->\n'
    '            <div style="display:flex;align-items:center;gap:3px;padding:0 0 4px;border-bottom:1px solid rgba(34,211,238,.12);margin-bottom:2px;">',
    1
)

# Substitui fechamento: fecha wrapper scroll antes de Show MA Labels
html = html.replace(
    OLD_SETTINGS_CLOSE,
    '            </div><!-- /scroll wrapper -->\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <label class="kv" style="cursor:pointer;">'
    '<span class="k">Show MA Labels</span>'
    '<input type="checkbox" id="maShowLabels" style="width:14px;height:14px;accent-color:#22d3ee;cursor:pointer;flex-shrink:0;">'
    '</label>\n'
    '            <div class="hint">DVL Moving Averages — até 10 médias independentes. '
    'Tipos: SMA, EMA, WMA, VWMA, RMA, HMA, DEMA, TEMA, LSMA, KAMA. '
    'Por padrão: MA1 = SMA 20 ativa.</div>\n'
    '          </div>\n',
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_170.py applied — Beta 0.170')
print('  Fix: period inputs type="text" inputmode="numeric" (sem setas spin mobile)')
print('  Fix: <style> scoped com ID specificity anula .input-modal-body input{width:100%}')
print('  Fix: wrapper overflow-x:auto permite scroll para aceder todas as colunas')
