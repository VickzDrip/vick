#!/usr/bin/env python3
"""patch_173.py — Beta 0.173: Scale clipping + flash definitivo

Parte 1 — Scale clipping (Spike Zones xR):
  Único indicador que ultra-passava a escala: Spike Zones usava
  xR = W-rp+Math.min(cfg.extend*bwPx,80) → 0–80px DENTRO da escala.
  Todos os outros (HVN, MA, FVG, Session Profile) já usam W-rp ou W-RP().
  Fix: xR = W-rp-2 (2px de padding interno, nunca invade a escala).

Parte 2 — Flash definitivo (3 camadas):
  a) <html class="pre-ui">  — garante que pre-ui está ativo desde o
     primeiro byte renderizado pelo browser, eliminando a janela em que o JS
     ainda não tinha corrido mas o browser já podia pintar.

  b) CSS html:not(.dvl-drawn) #chart {opacity:0} + fade-in após dvl-drawn —
     o canvas fica invisível até ao primeiro draw real. Como #chart e
     #chartWrap já têm background:#05070b (Beta 0.172), o utilizador
     vê um fundo escuro limpo durante o boot, sem canvas piscando branco.
     Após o primeiro draw real (linha já existente que adiciona dvl-drawn),
     o canvas faz fade-in em 80ms.

  c) setTimeout 5s de segurança — se o primeiro draw nunca chegar (erro de
     rede, etc.), o canvas aparece na mesma após 5 segundos.

Sem alterações de UI, layout, funcionalidades ou identidade visual.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.172') >= 10, 'Beta 0.172 not found'
html = html.replace('Beta 0.172', 'Beta 0.173')

# ── 1. <html class="pre-ui"> — pre-ui activo desde o primeiro byte ──────────
OLD_HTML_TAG = '<html lang="pt">'
assert OLD_HTML_TAG in html, '<html> tag anchor not found'
html = html.replace(OLD_HTML_TAG, '<html lang="pt" class="pre-ui">', 1)

# ── 2. CSS: canvas invisível durante boot + fade-in após dvl-drawn ───────────
# Injecto no bloco de boot que já existe (criado no Beta 0.172)
OLD_BOOT_STYLE = (
    '/* ── Canvas background = dark antes do primeiro draw ── */\n'
    '#chart,#chartWrap{background:#05070b;}\n'
    '</style>'
)
assert OLD_BOOT_STYLE in html, 'boot canvas style anchor not found'
html = html.replace(OLD_BOOT_STYLE,
    '/* ── Canvas background = dark antes do primeiro draw ── */\n'
    '#chart,#chartWrap{background:#05070b;}\n'
    '/* ── Canvas invisível até ao primeiro draw real (dvl-drawn = após draw()) ── */\n'
    'html:not(.dvl-drawn) #chart{opacity:0;}\n'
    'html.dvl-drawn #chart{opacity:1;transition:opacity .08s ease;}\n'
    '</style>',
    1
)

# ── 3. Safety timeout — revela canvas após 5s mesmo se draw nunca correr ─────
# Injecto logo após window.__DVL_PERF que já existe (Beta 0.172)
OLD_PERF_LINE = (
    'window.__DVL_PERF={enabled:false,drawCount:0,lastDrawMs:0,indicatorTimes:{}};\n'
    'function drawSoon(){'
)
assert OLD_PERF_LINE in html, 'window.__DVL_PERF anchor not found'
html = html.replace(OLD_PERF_LINE,
    'window.__DVL_PERF={enabled:false,drawCount:0,lastDrawMs:0,indicatorTimes:{}};\n'
    '/* safety: se o primeiro draw nunca chegar (rede), revela canvas após 5s */\n'
    'setTimeout(function(){document.documentElement.classList.add(\'dvl-drawn\');},5000);\n'
    'function drawSoon(){',
    1
)

# ── 4. Spike Zones xR fix — remove invasão da escala ────────────────────────
# Anchor único (grep confirmou 1 ocorrência)
OLD_SZ_XR = 'var xR=W-rp+Math.min(cfg.extend*bwPx,80);'
assert OLD_SZ_XR in html, 'Spike Zones xR anchor not found'
html = html.replace(OLD_SZ_XR,
    'var xR=W-rp-2;'  # 2px de padding; nunca invade escala
    '/* extend: zonas chegam ao limite direito do chart — szExtend desc. */var _szExtIgn=cfg.extend;',
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_173.py applied — Beta 0.173')
print('  Scale: Spike Zones xR = W-rp-2 (era W-rp+80, invadia a escala)')
print('  Flash 1: <html class="pre-ui"> — pre-ui activo desde byte 1')
print('  Flash 2: html:not(.dvl-drawn) #chart{opacity:0} → fade-in após draw')
print('  Flash 3: setTimeout 5s — safety fallback se draw não correr')
