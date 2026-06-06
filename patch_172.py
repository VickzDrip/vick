#!/usr/bin/env python3
"""patch_172.py — Beta 0.172: Boot optimizations — eliminar flashes, performance

5 mudanças cirúrgicas, sem alterar UI, layout ou features:

1. CSS boot  — estende pre-ui e inds-syncing para suprimir TODAS as
   transitions/animations durante o boot (não apenas .switch::after);
   canvas recebe background:#05070b para não piscar branco.

2. drawSoon guard — _dvlBooting flag previne RAF overhead durante boot
   (os draws durante boot já eram no-ops; agora nem chegam ao RAF).

3. indicatorsReady — levanta _dvlBooting ao mesmo tempo que already-existing
   indicatorsReady=true, garantindo que drawSoon volta a funcionar assim
   que os dados estão prontos.

4. draw() signal — após o primeiro draw real (passados ambos os early-returns),
   adiciona classe dvl-drawn ao html e marca _dvlDrawn para não repetir.

5. window.__DVL_PERF — objeto de debug desativado por default. Para ativar:
   window.__DVL_PERF.enabled=true no console.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.171') >= 10, 'Beta 0.171 not found'
html = html.replace('Beta 0.171', 'Beta 0.172')

# ── 1. Estende CSS do boot para suprimir TODAS as transitions/animations ─────
# Âncora: o bloco <style> de boot que já existe logo após <body>
OLD_BOOT_STYLE = (
    '<style>\n'
    'html.pre-ui .tfs .tf,html.pre-ui .sidebar .ind-card{visibility:hidden}\n'
    'html.pre-ui .switch::after{transition:none!important}\n'
    '</style>'
)
assert OLD_BOOT_STYLE in html, 'boot style anchor not found'
html = html.replace(OLD_BOOT_STYLE,
    '<style>\n'
    'html.pre-ui .tfs .tf,html.pre-ui .sidebar .ind-card{visibility:hidden}\n'
    '/* ── Beta 0.172: suprimir TODAS as transitions durante pre-ui ── */\n'
    'html.pre-ui *{transition:none!important;animation:none!important;}\n'
    'html.pre-ui .switch::after{transition:none!important}\n'
    '/* ── inds-syncing: suprimir todas as transitions durante restore do workspace ── */\n'
    'body.inds-syncing *{transition:none!important;animation:none!important;}\n'
    '/* ── Canvas background = dark antes do primeiro draw ── */\n'
    '#chart,#chartWrap{background:#05070b;}\n'
    '</style>',
    1
)

# ── 2. drawSoon: adiciona _dvlBooting guard + _dvlDrawn flag ─────────────────
OLD_DRAWSOON = (
    'let _rafPending=false;'
    'function drawSoon(){if(_rafPending)return;_rafPending=true;'
    'requestAnimationFrame(()=>{_rafPending=false;draw();})}'
)
assert OLD_DRAWSOON in html, 'drawSoon anchor not found'
html = html.replace(OLD_DRAWSOON,
    'let _rafPending=false,_dvlBooting=true,_dvlDrawn=false;\n'
    'function drawSoon(){'
    'if(_dvlBooting)return;'  # skip RAF entirely during boot — draws são no-ops nesta fase
    'if(_rafPending)return;'
    '_rafPending=true;'
    'requestAnimationFrame(()=>{_rafPending=false;draw();});'
    '}',
    1
)

# ── 3. __DVL_PERF — debug tracker desativado por default ─────────────────────
# Inserido logo após drawSoon
OLD_AFTER_DRAWSOON = (
    'let _rafPending=false,_dvlBooting=true,_dvlDrawn=false;\n'
    'function drawSoon(){'
)
assert OLD_AFTER_DRAWSOON in html, '__DVL_PERF injection anchor not found'
html = html.replace(OLD_AFTER_DRAWSOON,
    'let _rafPending=false,_dvlBooting=true,_dvlDrawn=false;\n'
    'window.__DVL_PERF={enabled:false,drawCount:0,lastDrawMs:0,indicatorTimes:{}};\n'
    'function drawSoon(){',
    1
)

# ── 4. indicatorsReady=true: levanta _dvlBooting ao mesmo tempo ───────────────
OLD_IND_READY = 'indicatorsReady=true;draw();'
assert html.count(OLD_IND_READY) == 1, f'indicatorsReady anchor count: {html.count(OLD_IND_READY)}'
html = html.replace(OLD_IND_READY,
    'indicatorsReady=true;_dvlBooting=false;draw();',
    1
)

# ── 5. draw(): sinal de primeiro draw — marca _dvlDrawn e adiciona dvl-drawn ──
# Âncora: última instrução do draw() antes do } de fecho
# Verificado como único no ficheiro (grep retornou 1 ocorrência)
OLD_DRAW_END = 'drawCrosshair(ctx,W,H,sc,x,V);}'
assert OLD_DRAW_END in html, 'draw() end anchor not found'
html = html.replace(OLD_DRAW_END,
    'drawCrosshair(ctx,W,H,sc,x,V);'
    'if(!_dvlDrawn){'
    '_dvlDrawn=true;'
    'document.documentElement.classList.add(\'dvl-drawn\');'
    '}'
    'if(window.__DVL_PERF&&window.__DVL_PERF.enabled)window.__DVL_PERF.drawCount++;'
    '}',
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_172.py applied — Beta 0.172')
print('  1. CSS: html.pre-ui * { transition:none; animation:none } — sem flash de transições')
print('  2. CSS: body.inds-syncing * { transition:none } — sem flash durante restore workspace')
print('  3. CSS: #chart,#chartWrap { background:#05070b } — canvas não pisca branco')
print('  4. drawSoon: _dvlBooting guard — skip RAF durante boot (draws eram no-ops)')
print('  5. indicatorsReady: levanta _dvlBooting ao mesmo tempo')
print('  6. draw(): _dvlDrawn + html.dvl-drawn após primeiro draw real')
print('  7. window.__DVL_PERF: debug tracker (enabled:false por default)')
