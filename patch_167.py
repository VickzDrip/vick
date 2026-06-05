#!/usr/bin/env python3
"""patch_167.py — Beta 0.167: Fix HVN invisible — maxZoneAtr filtrava todas as zonas

Bug crítico no patch_166:
- maxZoneAtr=1.0 (default) eliminava TODAS as zonas em TFs menores (1m/5m)
- ATR de uma janela de 50 candles de 1m ≈ $40; bucketSize = 0.1% × $60k = $60
- Como ATR < bucketSize, zona de 1 bucket (60) > 1.0 × ATR (40) → filtrado!
- Resultado: allZones vazio → nada plotado

Correções:
1. Filtro ATR: só aplica quando _atr2 > bucketSize*2 (ATR precisa ser significativo)
2. Default vzMaxZoneAtr muda para 0 (Off) — usuário activa manualmente se quiser
3. Mantém toda a lógica windowed/MTF do 0.166 intacta
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.166') >= 10, 'Beta 0.166 not found'
html = html.replace('Beta 0.166', 'Beta 0.167')

# ── 1. Corrige filtro ATR: só filtra quando ATR > bucketSize*2 ─────────────────
# Sem esse guard, em 1m chart: ATR≈40 < bucketSize=60 → todas as zonas filtradas!
OLD_ATR_FILTER = (
    "      var _atr2=_aN>0?_aS/_aN:0;\n"
    "      if(_atr2>0)zones=zones.filter(function(z){return(z.hi-z.lo)<=s.maxZoneAtr*_atr2;});\n"
    "    }"
)
assert OLD_ATR_FILTER in html, 'ATR filter anchor not found'
html = html.replace(OLD_ATR_FILTER,
    "      var _atr2=_aN>0?_aS/_aN:0;\n"
    "      /* guard: só filtra se ATR for significativo em relação ao bucket */\n"
    "      if(_atr2>bucketSize*2)zones=zones.filter(function(z){return(z.hi-z.lo)<=s.maxZoneAtr*_atr2;});\n"
    "    }",
    1)

# ── 2. Default vzMaxZoneAtr: muda 1.0 selected → 0 selected (Off) ─────────────
OLD_SELECT_DEFAULT = (
    '<option value="0">Off</option>'
    '<option value="0.5">0.5×</option>'
    '<option value="1.0" selected>1.0×</option>'
    '<option value="1.5">1.5×</option>'
    '<option value="2.0">2.0×</option>'
)
assert OLD_SELECT_DEFAULT in html, 'vzMaxZoneAtr select anchor not found'
html = html.replace(OLD_SELECT_DEFAULT,
    '<option value="0" selected>Off</option>'
    '<option value="0.5">0.5×</option>'
    '<option value="1.0">1.0×</option>'
    '<option value="1.5">1.5×</option>'
    '<option value="2.0">2.0×</option>',
    1)

# ── 3. Default getSettings: maxZoneAtr default string muda para '0' ─────────────
OLD_SETTINGS_DEFAULT = "maxZoneAtr:Math.max(0,parseFloat(strVal('vzMaxZoneAtr','1.0'))||0),"
assert OLD_SETTINGS_DEFAULT in html, 'maxZoneAtr settings default anchor not found'
html = html.replace(OLD_SETTINGS_DEFAULT,
    "maxZoneAtr:Math.max(0,parseFloat(strVal('vzMaxZoneAtr','0'))||0),",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_167.py applied — Beta 0.167')
print('  Bug fix: maxZoneAtr não filtra mais quando ATR < bucketSize*2')
print('  → em 1m/5m charts, ATR pequeno não elimina mais todas as zonas')
print('  Default vzMaxZoneAtr = Off (0) — usuário activa manualmente')
print('  Guard: filter só corre quando _atr2 > bucketSize*2')
