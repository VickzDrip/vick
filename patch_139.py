#!/usr/bin/env python3
"""patch_139.py — Beta 0.139: Remove ATR padding completamente do Spike Zones"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.138') >= 10
html = html.replace('Beta 0.138', 'Beta 0.139')

# ── 1. HTML: remove ATR padding div ──────────────────────────────────────────
OLD_PAD_DIV = (
    '            <div class="kv"><span class="k">ATR padding</span>\n'
    '              <select class="select" id="szAtrPad" style="width:90px">\n'
    '                <option value="0">0 (sem)</option>\n'
    '                <option value="0.05" selected>0.05 ATR</option>\n'
    '                <option value="0.10">0.10 ATR</option>\n'
    '                <option value="0.20">0.20 ATR</option>\n'
    '              </select>\n'
    '            </div>\n'
)
assert OLD_PAD_DIV in html, 'ATR padding div not found'
html = html.replace(OLD_PAD_DIV, '', 1)

# ── 2. _cfg(): remove atrPad ─────────────────────────────────────────────────
OLD_CFG_PAD = "      atrPad:    clp(parseFloat(sv('szAtrPad','0.05'))||0,0,1),\n"
assert OLD_CFG_PAD in html, '_cfg atrPad not found'
html = html.replace(OLD_CFG_PAD, '', 1)

# ── 3. _detectAndBuild(): remove pad variable + strip from all hi/lo calcs ───
OLD_SOURCE_CALC = (
    "      var pad=at*(cfg.atrPad||0);\n"
    "      var hi,lo,hvsMeta=null;\n"
    "      if(cfg.source==='body'){hi=Math.max(c.o,c.c)+pad;lo=Math.min(c.o,c.c)-pad;}\n"
    "      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h+pad;lo=Math.max(c.o,c.c)-pad;}else{hi=Math.min(c.o,c.c)+pad;lo=c.l-pad;}}\n"
    "      else if(cfg.source==='hvs'){\n"
    "        var _hvs=_computeHVS(c,at,cfg);\n"
    "        if(_hvs&&_hvs.volPct>=cfg.hvsDomMin){hi=_hvs.hi+pad;lo=_hvs.lo-pad;hvsMeta=_hvs;}\n"
    "        else{hi=Math.max(c.o,c.c)+pad;lo=Math.min(c.o,c.c)-pad;hvsMeta={pocPrice:(c.o+c.c)/2,location:'body',source:'fallback',volPct:0};}\n"
    "      }\n"
    "      else{hi=c.h+pad;lo=c.l-pad;}"
)
assert OLD_SOURCE_CALC in html, 'source calc block not found'

NEW_SOURCE_CALC = (
    "      var hi,lo,hvsMeta=null;\n"
    "      if(cfg.source==='body'){hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);}\n"
    "      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h;lo=Math.max(c.o,c.c);}else{hi=Math.min(c.o,c.c);lo=c.l;}}\n"
    "      else if(cfg.source==='hvs'){\n"
    "        var _hvs=_computeHVS(c,at,cfg);\n"
    "        if(_hvs&&_hvs.volPct>=cfg.hvsDomMin){hi=_hvs.hi;lo=_hvs.lo;hvsMeta=_hvs;}\n"
    "        else{hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);hvsMeta={pocPrice:(c.o+c.c)/2,location:'body',source:'fallback',volPct:0};}\n"
    "      }\n"
    "      else{hi=c.h;lo=c.l;}"
)
html = html.replace(OLD_SOURCE_CALC, NEW_SOURCE_CALC, 1)

# ── 4. Cache key: remove cfg.atrPad ──────────────────────────────────────────
OLD_CK_PAD = "            cfg.maxZones,cfg.source,cfg.atrPad,"
assert OLD_CK_PAD in html, 'cache key atrPad not found'
html = html.replace(OLD_CK_PAD, "            cfg.maxZones,cfg.source,", 1)

# ── 5. SZ_IDS: remove szAtrPad ───────────────────────────────────────────────
OLD_SZIDS_PAD = "    'szSource','szAtrPad','szMerge','szExpire','szMaxTests',"
assert OLD_SZIDS_PAD in html, 'SZ_IDS szAtrPad not found'
html = html.replace(OLD_SZIDS_PAD, "    'szSource','szMerge','szExpire','szMaxTests',", 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_139.py applied — Beta 0.139')
print('  - ATR padding removido completamente (HTML + _cfg + _detectAndBuild + cache + SZ_IDS)')
print('  - Zonas agora usam exatamente o range do candle de origem, sem margem extra')
