#!/usr/bin/env python3
"""patch_135.py — Beta 0.135: Mais histórico visual + Vol MA período configurável"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.134') >= 10
html = html.replace('Beta 0.134', 'Beta 0.135')

# ── 1. HTML DETECÇÃO: add szVolMA input after szAtrMult ──────────────────────
OLD_DETECTION_FIELDS = (
    '            <div class="kv"><span class="k">Peso volume</span><input class="num" id="szVolMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Peso ATR range</span><input class="num" id="szAtrMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>'
)
assert OLD_DETECTION_FIELDS in html, 'detection fields not found'

NEW_DETECTION_FIELDS = (
    '            <div class="kv"><span class="k">Peso volume</span><input class="num" id="szVolMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Peso ATR range</span><input class="num" id="szAtrMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Vol MA período</span><input class="num" id="szVolMA" type="number" min="3" max="200" step="1" value="20" style="width:56px"></div>'
)
html = html.replace(OLD_DETECTION_FIELDS, NEW_DETECTION_FIELDS, 1)

# ── 2. HTML szMaxZones: add 200 and 500 options ───────────────────────────────
OLD_MAX_ZONES = (
    '              <select class="select" id="szMaxZones" style="width:72px">\n'
    '                <option value="10">10</option>\n'
    '                <option value="20">20</option>\n'
    '                <option value="50" selected>50</option>\n'
    '                <option value="100">100</option>\n'
    '              </select>'
)
assert OLD_MAX_ZONES in html, 'szMaxZones select not found'

NEW_MAX_ZONES = (
    '              <select class="select" id="szMaxZones" style="width:72px">\n'
    '                <option value="10">10</option>\n'
    '                <option value="20">20</option>\n'
    '                <option value="50" selected>50</option>\n'
    '                <option value="100">100</option>\n'
    '                <option value="200">200</option>\n'
    '                <option value="500">500</option>\n'
    '              </select>'
)
html = html.replace(OLD_MAX_ZONES, NEW_MAX_ZONES, 1)

# ── 3. HTML szMaxScan: add 10k, 20k, 50k options ─────────────────────────────
OLD_MAX_SCAN = (
    '              <select class="select" id="szMaxScan" style="width:72px">\n'
    '                <option value="500">500</option>\n'
    '                <option value="1000">1000</option>\n'
    '                <option value="3000" selected>3000</option>\n'
    '                <option value="5000">5000</option>\n'
    '              </select>'
)
assert OLD_MAX_SCAN in html, 'szMaxScan select not found'

NEW_MAX_SCAN = (
    '              <select class="select" id="szMaxScan" style="width:72px">\n'
    '                <option value="500">500</option>\n'
    '                <option value="1000">1000</option>\n'
    '                <option value="3000" selected>3000</option>\n'
    '                <option value="5000">5000</option>\n'
    '                <option value="10000">10 000</option>\n'
    '                <option value="20000">20 000</option>\n'
    '                <option value="50000">50 000</option>\n'
    '              </select>'
)
html = html.replace(OLD_MAX_SCAN, NEW_MAX_SCAN, 1)

# ── 4. Script _cfg(): add volMA + raise maxScan upper limit ──────────────────
OLD_CFG_SCAN = "      maxScan:   clp(parseInt(sv('szMaxScan','3000'))||3000,50,10000),"
assert OLD_CFG_SCAN in html, '_cfg maxScan line not found'

NEW_CFG_SCAN = "      maxScan:   clp(parseInt(sv('szMaxScan','3000'))||3000,50,100000),"
html = html.replace(OLD_CFG_SCAN, NEW_CFG_SCAN, 1)

OLD_CFG_ATRPAD = "      atrPad:    clp(parseFloat(sv('szAtrPad','0.05'))||0,0,1),"
assert OLD_CFG_ATRPAD in html, '_cfg atrPad line not found'

NEW_CFG_ATRPAD = (
    "      volMA:     clp(parseInt(sv('szVolMA','20'))||20,3,200),\n"
    "      atrPad:    clp(parseFloat(sv('szAtrPad','0.05'))||0,0,1),"
)
html = html.replace(OLD_CFG_ATRPAD, NEW_CFG_ATRPAD, 1)

# ── 5. Script _cfg(): raise maxZones upper limit ──────────────────────────────
OLD_CFG_MAXZ = "      maxZones:  clp(parseInt(sv('szMaxZones','50'))||50,5,200),"
assert OLD_CFG_MAXZ in html, '_cfg maxZones line not found'

NEW_CFG_MAXZ = "      maxZones:  clp(parseInt(sv('szMaxZones','50'))||50,5,1000),"
html = html.replace(OLD_CFG_MAXZ, NEW_CFG_MAXZ, 1)

# ── 6. Script _detectAndBuild: use cfg.volMA instead of hardcoded 20 ─────────
OLD_MA_P = "    var MA_P=isNested?Math.max(2,Math.min(5,n-1)):20;"
assert OLD_MA_P in html, 'MA_P line not found'

NEW_MA_P = "    var MA_P=isNested?Math.max(2,Math.min(5,n-1)):(cfg.volMA||20);"
html = html.replace(OLD_MA_P, NEW_MA_P, 1)

# ── 7. Script cache key: add cfg.volMA ───────────────────────────────────────
OLD_CK = (
    "            cfg.minLevel,cfg.sens,cfg.volMult,cfg.atrMult,\n"
    "            cfg.maxZones,cfg.maxScan,cfg.source,cfg.atrPad,"
)
assert OLD_CK in html, 'cache key block not found'

NEW_CK = (
    "            cfg.minLevel,cfg.sens,cfg.volMult,cfg.atrMult,cfg.volMA,\n"
    "            cfg.maxZones,cfg.maxScan,cfg.source,cfg.atrPad,"
)
html = html.replace(OLD_CK, NEW_CK, 1)

# ── 8. SZ_IDS: add szVolMA ───────────────────────────────────────────────────
OLD_SZIDS = "    'szSens','szVolMult','szAtrMult','szMinLevel','szMaxZones',"
assert OLD_SZIDS in html, 'SZ_IDS first line not found'

NEW_SZIDS = "    'szSens','szVolMult','szAtrMult','szVolMA','szMinLevel','szMaxZones',"
html = html.replace(OLD_SZIDS, NEW_SZIDS, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_135.py applied — Beta 0.135')
print('  + szVolMA: input para período da Vol MA (padrão 20, range 3-200)')
print('  + cfg.volMA usado em _detectAndBuild() em vez de 20 fixo')
print('  + szMaxZones: adicionados 200 e 500; limite interno 1000')
print('  + szMaxScan: adicionados 10 000, 20 000, 50 000; limite interno 100 000')
