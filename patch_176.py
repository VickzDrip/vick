#!/usr/bin/env python3
"""patch_176.py — Beta 0.176: Spike Zones — compressão para 5 níveis

Remapeia a escala interna de 10 níveis para 5:
  L3-L4 → L1  |  L5-L6 → L2  |  L7-L8 → L3  |  L9 → L4  |  L10+ → L5
  L1-L2 → 0 (filtrados — continuam abaixo do limiar mínimo)

A detecção bruta (excesso de volume vs ATR) não muda — o cálculo de
sensibilidade é o mesmo. A compressão é apenas visual/conceptual.

Mudanças:
1. _detectAndBuild: remapeia level após o cálculo bruto, antes do filtro
2. _cfg(): minLevel e nestMinLvl — clamp 1-10→1-5, default '3'→'1'
3. _cfg(): remove colorL6-colorL10 (não usadas após compressão)
4. cols loop: _li<=10→_li<=5, fallback cols[10]→cols[5]
5. HTML szMinLevel: L1-L10 → L1-L5 (selected=L1)
6. HTML szNestMinLvl: L2-L10 → L1-L5 (selected=L2)
7. HTML cor: remove linhas L6-L10
8. SZ_IDS: remove szColorL6-szColorL10
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.175') >= 10, f'Beta 0.175 not found (count={html.count("Beta 0.175")})'
html = html.replace('Beta 0.175', 'Beta 0.176')

# ── 1. Remapeia level imediatamente após cálculo bruto ───────────────────────
OLD_LEVEL = (
    '      var level=ex>=24.0*s?10:ex>=18.0*s?9:ex>=13.5*s?8:ex>=10.0*s?7:ex>=7.5*s?6:ex>=6.0*s?5:ex>=4.5*s?4:ex>=3.0*s?3:ex>=1.5*s?2:1;\n'
    '      if(level<minLvl)continue;'
)
assert OLD_LEVEL in html, 'level calculation anchor not found'
html = html.replace(OLD_LEVEL,
    '      var level=ex>=24.0*s?10:ex>=18.0*s?9:ex>=13.5*s?8:ex>=10.0*s?7:ex>=7.5*s?6:ex>=6.0*s?5:ex>=4.5*s?4:ex>=3.0*s?3:ex>=1.5*s?2:1;\n'
    '      /* compress: L3-4→1, L5-6→2, L7-8→3, L9→4, L10→5; L1-2→0 filtered */\n'
    '      level=level>=10?5:level>=9?4:level>=7?3:level>=5?2:level>=3?1:0;\n'
    '      if(level<minLvl)continue;',
    1
)

# ── 2. _cfg(): minLevel — default '3'→'1', clamp 1-10→1-5 ───────────────────
OLD_MINLEVEL = "      minLevel:  clp(parseInt(sv('szMinLevel','3'))||3,1,10),"
assert OLD_MINLEVEL in html, '_cfg minLevel anchor not found'
html = html.replace(OLD_MINLEVEL,
    "      minLevel:  clp(parseInt(sv('szMinLevel','1'))||1,1,5),",
    1
)

# ── 3. _cfg(): nestMinLvl — default '3'→'1', clamp 1-10→1-5 ─────────────────
OLD_NESTMIN = "      nestMinLvl:clp(parseInt(sv('szNestMinLvl','3'))||3,1,10),"
assert OLD_NESTMIN in html, '_cfg nestMinLvl anchor not found'
html = html.replace(OLD_NESTMIN,
    "      nestMinLvl:clp(parseInt(sv('szNestMinLvl','1'))||1,1,5),",
    1
)

# ── 4. _cfg(): remove colorL6-L10 ────────────────────────────────────────────
OLD_COL6_10 = (
    "      colorL6:  sv('szColorL6','#ff5a00'),\n"
    "      colorL7:  sv('szColorL7','#ff0f0f'),\n"
    "      colorL8:  sv('szColorL8','#b400ff'),\n"
    "      colorL9:  sv('szColorL9','#fff000'),\n"
    "      colorL10: sv('szColorL10','#ffffff'),"
)
assert OLD_COL6_10 in html, '_cfg colorL6-10 anchor not found'
html = html.replace(OLD_COL6_10, '', 1)

# ── 5. cols build loop: _li<=10→_li<=5, fallback cols[10]→cols[5] ───────────
OLD_COLS_LOOP = 'for(var _li=1;_li<=10;_li++){var _hx=cfg[\'colorL\'+_li];cols.push(_hx?hexToRgb(_hx)||COL[_li]:COL[_li]);}'
assert OLD_COLS_LOOP in html, 'cols loop anchor not found'
html = html.replace(OLD_COLS_LOOP,
    'for(var _li=1;_li<=5;_li++){var _hx=cfg[\'colorL\'+_li];cols.push(_hx?hexToRgb(_hx)||COL[_li]:COL[_li]);}',
    1
)

# fallback cols[10] → cols[5] (usado em main zones e nested)
html = html.replace('cols[z.level]||cols[10]', 'cols[z.level]||cols[5]')

# ── 6. HTML szMinLevel select — L1-L10 → L1-L5 ───────────────────────────────
OLD_MINLEVEL_HTML = (
    '              <select class="select" id="szMinLevel" style="width:90px">\n'
    '                <option value="1">L1 (todos)</option>\n'
    '                <option value="2">L2</option>\n'
    '                <option value="3" selected>L3</option>\n'
    '                <option value="4">L4</option>\n'
    '                <option value="5">L5</option>\n'
    '                <option value="6">L6</option>\n'
    '                <option value="7">L7</option>\n'
    '                <option value="8">L8</option>\n'
    '                <option value="9">L9</option>\n'
    '                <option value="10">L10 (extremo)</option>\n'
    '              </select>'
)
assert OLD_MINLEVEL_HTML in html, 'szMinLevel HTML select anchor not found'
html = html.replace(OLD_MINLEVEL_HTML,
    '              <select class="select" id="szMinLevel" style="width:90px">\n'
    '                <option value="1" selected>L1 (todos)</option>\n'
    '                <option value="2">L2</option>\n'
    '                <option value="3">L3</option>\n'
    '                <option value="4">L4</option>\n'
    '                <option value="5">L5 (extremo)</option>\n'
    '              </select>',
    1
)

# ── 7. HTML szNestMinLvl select — L2-L10 → L1-L5 ─────────────────────────────
OLD_NESTMIN_HTML = (
    '              <select class="select" id="szNestMinLvl" style="width:72px">\n'
    '                <option value="2">L2</option>\n'
    '                <option value="3" selected>L3</option>\n'
    '                <option value="4">L4</option>\n'
    '                <option value="5">L5</option>\n'
    '                <option value="6">L6</option>\n'
    '                <option value="7">L7</option>\n'
    '                <option value="8">L8</option>\n'
    '                <option value="9">L9</option>\n'
    '                <option value="10">L10</option>\n'
    '              </select>'
)
assert OLD_NESTMIN_HTML in html, 'szNestMinLvl HTML select anchor not found'
html = html.replace(OLD_NESTMIN_HTML,
    '              <select class="select" id="szNestMinLvl" style="width:72px">\n'
    '                <option value="1">L1</option>\n'
    '                <option value="2" selected>L2</option>\n'
    '                <option value="3">L3</option>\n'
    '                <option value="4">L4</option>\n'
    '                <option value="5">L5</option>\n'
    '              </select>',
    1
)

# ── 8. HTML pickers de cor — remove L6-L10 ────────────────────────────────────
OLD_COLOR_ROWS = (
    '            <div class="kv"><span class="k">L6</span><input type="color" id="szColorL6" value="#ff5a00" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L7</span><input type="color" id="szColorL7" value="#ff0f0f" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L8</span><input type="color" id="szColorL8" value="#b400ff" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L9</span><input type="color" id="szColorL9" value="#fff000" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L10</span><input type="color" id="szColorL10" value="#ffffff" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
)
assert OLD_COLOR_ROWS in html, 'color pickers L6-L10 anchor not found'
html = html.replace(OLD_COLOR_ROWS, '', 1)

# ── 9. SZ_IDS — remove szColorL6-L10 ─────────────────────────────────────────
OLD_SZIDS_COL = (
    "  'szColorL1','szColorL2','szColorL3','szColorL4','szColorL5',\n"
    "  'szColorL6','szColorL7','szColorL8','szColorL9','szColorL10',"
)
assert OLD_SZIDS_COL in html, 'SZ_IDS colorL anchor not found'
html = html.replace(OLD_SZIDS_COL,
    "  'szColorL1','szColorL2','szColorL3','szColorL4','szColorL5',",
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_176.py applied — Beta 0.176')
print('  Remapping: L3-4→1  L5-6→2  L7-8→3  L9→4  L10→5  (L1-2 filtrados)')
print('  minLevel/nestMinLvl: default 3→1, clamp 1-10→1-5')
print('  UI: selects L1-L5, removidos pickers e IDs L6-L10')
print('  cols loop: _li<=5, fallback cols[5]')
