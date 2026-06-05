#!/usr/bin/env python3
"""patch_155.py — Beta 0.155: Spike Zones L1-L10
   Extends detection from 5 to 10 levels with accelerating thresholds.
   L6-L10: fiery orange → alarm red → electric violet → electric yellow → pure white.
   lf normalisation: /5 → /10. Border weight steps extended. Color pickers L6-L10 added.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.154') >= 10, 'Beta 0.154 not found'
html = html.replace('Beta 0.154', 'Beta 0.155')

# ── 1. COL array: add L6-L10 colors ──────────────────────────────────────────
OLD_COL = (
    "  var COL=[null,\n"
    "    {r:90, g:150,b:255},  /* L1 bright blue  */\n"
    "    {r:0,  g:215,b:255},  /* L2 vivid cyan   */\n"
    "    {r:0,  g:245,b:200},  /* L3 vivid mint   */\n"
    "    {r:255,g:188,b:0  },  /* L4 bright amber */\n"
    "    {r:255,g:55, b:245}   /* L5 vivid pink   */\n"
    "  ];"
)
assert OLD_COL in html, 'COL array anchor not found'
NEW_COL = (
    "  var COL=[null,\n"
    "    {r:90, g:150,b:255},  /* L1  bright blue    */\n"
    "    {r:0,  g:215,b:255},  /* L2  vivid cyan     */\n"
    "    {r:0,  g:245,b:200},  /* L3  vivid mint     */\n"
    "    {r:255,g:188,b:0  },  /* L4  bright amber   */\n"
    "    {r:255,g:55, b:245},  /* L5  vivid pink     */\n"
    "    {r:255,g:90, b:0  },  /* L6  fiery orange   */\n"
    "    {r:255,g:15, b:15 },  /* L7  alarm red      */\n"
    "    {r:180,g:0,  b:255},  /* L8  electric violet*/\n"
    "    {r:255,g:240,b:0  },  /* L9  electric yellow*/\n"
    "    {r:255,g:255,b:255}   /* L10 pure white     */\n"
    "  ];"
)
html = html.replace(OLD_COL, NEW_COL, 1)

# ── 2. Level detection formula: extend to 10 levels ──────────────────────────
OLD_LEVEL = "      var level=ex>=6.0*s?5:ex>=4.5*s?4:ex>=3.0*s?3:ex>=1.5*s?2:1;"
assert OLD_LEVEL in html, 'level formula anchor not found'
NEW_LEVEL = (
    "      var level=ex>=24.0*s?10:ex>=18.0*s?9:ex>=13.5*s?8:ex>=10.0*s?7:"
    "ex>=7.5*s?6:ex>=6.0*s?5:ex>=4.5*s?4:ex>=3.0*s?3:ex>=1.5*s?2:1;"
)
html = html.replace(OLD_LEVEL, NEW_LEVEL, 1)

# ── 3. cfg: minLevel and nestMinLvl max → 10 ─────────────────────────────────
OLD_MIN_LVL_CFG = "      minLevel:  clp(parseInt(sv('szMinLevel','3'))||3,1,5),"
assert OLD_MIN_LVL_CFG in html, 'minLevel cfg anchor not found'
html = html.replace(OLD_MIN_LVL_CFG,
    "      minLevel:  clp(parseInt(sv('szMinLevel','3'))||3,1,10),", 1)

OLD_NEST_LVL_CFG = "      nestMinLvl:clp(parseInt(sv('szNestMinLvl','3'))||3,1,5),"
assert OLD_NEST_LVL_CFG in html, 'nestMinLvl cfg anchor not found'
html = html.replace(OLD_NEST_LVL_CFG,
    "      nestMinLvl:clp(parseInt(sv('szNestMinLvl','3'))||3,1,10),", 1)

# ── 4. cfg: add colorL6-L10 ──────────────────────────────────────────────────
OLD_COL_CFG_END = (
    "      colorL5:  sv('szColorL5','#ff37f5'),\n"
    "      fillOpacity:   clp(nv('szFillOpacity',0.16),0.01,1),"
)
assert OLD_COL_CFG_END in html, 'colorL5 cfg anchor not found'
NEW_COL_CFG_END = (
    "      colorL5:  sv('szColorL5','#ff37f5'),\n"
    "      colorL6:  sv('szColorL6','#ff5a00'),\n"
    "      colorL7:  sv('szColorL7','#ff0f0f'),\n"
    "      colorL8:  sv('szColorL8','#b400ff'),\n"
    "      colorL9:  sv('szColorL9','#fff000'),\n"
    "      colorL10: sv('szColorL10','#ffffff'),\n"
    "      fillOpacity:   clp(nv('szFillOpacity',0.16),0.01,1),"
)
html = html.replace(OLD_COL_CFG_END, NEW_COL_CFG_END, 1)

# ── 5. szMinLevel select: add L6-L10 options ─────────────────────────────────
OLD_MIN_SEL = (
    '              <select class="select" id="szMinLevel" style="width:90px">\n'
    '                <option value="1">L1 (todos)</option>\n'
    '                <option value="2">L2</option>\n'
    '                <option value="3" selected>L3</option>\n'
    '                <option value="4">L4</option>\n'
    '                <option value="5">L5 (extremo)</option>\n'
    '              </select>'
)
assert OLD_MIN_SEL in html, 'szMinLevel select anchor not found'
NEW_MIN_SEL = (
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
html = html.replace(OLD_MIN_SEL, NEW_MIN_SEL, 1)

# ── 6. szNestMinLvl select: add L6-L10 options ───────────────────────────────
OLD_NEST_SEL = (
    '              <select class="select" id="szNestMinLvl" style="width:72px">\n'
    '                <option value="2">L2</option>\n'
    '                <option value="3" selected>L3</option>\n'
    '                <option value="4">L4</option>\n'
    '                <option value="5">L5</option>\n'
    '              </select>'
)
assert OLD_NEST_SEL in html, 'szNestMinLvl select anchor not found'
NEW_NEST_SEL = (
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
html = html.replace(OLD_NEST_SEL, NEW_NEST_SEL, 1)

# ── 7. UI CORES: add L6-L10 color pickers ────────────────────────────────────
OLD_CORES_END = (
    '            <div class="kv"><span class="k">L5</span>'
    '<input type="color" id="szColorL5" value="#ff37f5" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">Fill opacity</span>'
)
assert OLD_CORES_END in html, 'CORES L5 anchor not found'
NEW_CORES_END = (
    '            <div class="kv"><span class="k">L5</span>'
    '<input type="color" id="szColorL5" value="#ff37f5" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L6</span>'
    '<input type="color" id="szColorL6" value="#ff5a00" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L7</span>'
    '<input type="color" id="szColorL7" value="#ff0f0f" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L8</span>'
    '<input type="color" id="szColorL8" value="#b400ff" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L9</span>'
    '<input type="color" id="szColorL9" value="#fff000" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L10</span>'
    '<input type="color" id="szColorL10" value="#ffffff" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">Fill opacity</span>'
)
html = html.replace(OLD_CORES_END, NEW_CORES_END, 1)

# ── 8. cols loop: extend to 10 ───────────────────────────────────────────────
OLD_COLS_LOOP = "    for(var _li=1;_li<=5;_li++){var _hx=cfg['colorL'+_li];cols.push(_hx?hexToRgb(_hx)||COL[_li]:COL[_li]);}"
assert OLD_COLS_LOOP in html, 'cols loop anchor not found'
NEW_COLS_LOOP = "    for(var _li=1;_li<=10;_li++){var _hx=cfg['colorL'+_li];cols.push(_hx?hexToRgb(_hx)||COL[_li]:COL[_li]);}"
html = html.replace(OLD_COLS_LOOP, NEW_COLS_LOOP, 1)

# ── 9. Fallback: cols[5] → cols[10] (3 occurrences) ─────────────────────────
assert html.count('cols[z.level]||cols[5]') == 3, 'expected 3 occurrences of cols fallback'
html = html.replace('cols[z.level]||cols[5]', 'cols[z.level]||cols[10]')

# ── 10. Level factor: lf=z.level/5 → z.level/10 (2 occurrences) ─────────────
assert html.count('var lf=z.level/5;') == 2, 'expected 2 lf normalisations'
html = html.replace('var lf=z.level/5;', 'var lf=z.level/10;')

# ── 11. Border weight: extend for L7+ and L9+ ────────────────────────────────
OLD_LINEWIDTH = "      ctx.lineWidth=z.level>=4?1.5:1;"
assert OLD_LINEWIDTH in html, 'lineWidth anchor not found'
html = html.replace(OLD_LINEWIDTH, "      ctx.lineWidth=z.level>=8?2.5:z.level>=5?1.5:1;", 1)

# ── 12. SZ_IDS: add szColorL6-L10 ────────────────────────────────────────────
OLD_SZ_IDS = (
    "  'szColorL1','szColorL2','szColorL3','szColorL4','szColorL5',\n"
    "  'szFillOpacity','szBorderOpacity','szSourceOpacity'"
)
assert OLD_SZ_IDS in html, 'SZ_IDS color IDs anchor not found'
NEW_SZ_IDS = (
    "  'szColorL1','szColorL2','szColorL3','szColorL4','szColorL5',\n"
    "  'szColorL6','szColorL7','szColorL8','szColorL9','szColorL10',\n"
    "  'szFillOpacity','szBorderOpacity','szSourceOpacity'"
)
html = html.replace(OLD_SZ_IDS, NEW_SZ_IDS, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_155.py applied — Beta 0.155')
print('  10-LEVEL PALETTE:')
print('    L1:  bright blue    (90,150,255)')
print('    L2:  vivid cyan     (0,215,255)')
print('    L3:  vivid mint     (0,245,200)')
print('    L4:  bright amber   (255,188,0)')
print('    L5:  vivid pink     (255,55,245)')
print('    L6:  fiery orange   (255,90,0)    — ex >= 7.5*s')
print('    L7:  alarm red      (255,15,15)   — ex >= 10.0*s')
print('    L8:  electric violet(180,0,255)   — ex >= 13.5*s')
print('    L9:  electric yellow(255,240,0)   — ex >= 18.0*s')
print('    L10: pure white     (255,255,255) — ex >= 24.0*s')
print('  lf normalised to z.level/10 (was /5)')
print('  Border weight: L8+: 2.5px, L5+: 1.5px, L1-4: 1px')
print('  szMinLevel and szNestMinLvl selects: L1-L10')
print('  CORES section: color pickers L1-L10')
