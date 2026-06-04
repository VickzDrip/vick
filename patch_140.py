#!/usr/bin/env python3
"""patch_140.py — Beta 0.140: Default source=body + teto 1.5×ATR em todas as zonas"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.139') >= 10
html = html.replace('Beta 0.139', 'Beta 0.140')

# ── 1. HTML: muda selected de full → body ────────────────────────────────────
OLD_SOURCE_SEL = (
    '                <option value="full" selected>Candle completo</option>\n'
    '                <option value="body">Corpo</option>\n'
)
assert OLD_SOURCE_SEL in html, 'source select options not found'
NEW_SOURCE_SEL = (
    '                <option value="full">Candle completo</option>\n'
    '                <option value="body" selected>Corpo</option>\n'
)
html = html.replace(OLD_SOURCE_SEL, NEW_SOURCE_SEL, 1)

# ── 2. _cfg(): muda default de 'full' → 'body' ───────────────────────────────
OLD_CFG_SRC = "      source:    sv('szSource','full'),"
assert OLD_CFG_SRC in html, '_cfg source not found'
html = html.replace(OLD_CFG_SRC, "      source:    sv('szSource','body'),", 1)

# ── 3. _detectAndBuild: adiciona teto de 1.5×ATR centrado no corpo ────────────
# Injeta entre "if(hi<=lo)..." e "candidates.push(...)"
OLD_CAP_ANCHOR = (
    '      if(hi<=lo)lo=hi-at*0.01;\n'
    '      candidates.push('
)
assert OLD_CAP_ANCHOR in html, 'cap anchor not found'
NEW_CAP_ANCHOR = (
    '      if(hi<=lo)lo=hi-at*0.01;\n'
    '      /* cap zone height at 1.5×ATR — prevents absurdly large zones from spike candles */\n'
    '      if(at>0&&(hi-lo)>at*1.5){var _zm=(Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;hi=_zm+at*0.75;lo=_zm-at*0.75;}\n'
    '      candidates.push('
)
html = html.replace(OLD_CAP_ANCHOR, NEW_CAP_ANCHOR, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_140.py applied — Beta 0.140')
print('  ~ Default source: full → body (zona = corpo do candle, menor e mais precisa)')
print('  + Teto 1.5×ATR: zones nunca excedem 1.5× o ATR local, centradas no corpo')
