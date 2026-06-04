#!/usr/bin/env python3
"""patch_137.py — Beta 0.137: Scan todo o histórico + center line pontilhada em zonas"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.136') >= 10
html = html.replace('Beta 0.136', 'Beta 0.137')

# ── 1. HTML: remove szMaxScan div ────────────────────────────────────────────
OLD_MAXSCAN_DIV = (
    '            <div class="kv"><span class="k">Max scan (barras)</span>\n'
    '              <select class="select" id="szMaxScan" style="width:72px">\n'
    '                <option value="500">500</option>\n'
    '                <option value="1000">1000</option>\n'
    '                <option value="3000" selected>3000</option>\n'
    '                <option value="5000">5000</option>\n'
    '                <option value="10000">10 000</option>\n'
    '                <option value="20000">20 000</option>\n'
    '                <option value="50000">50 000</option>\n'
    '              </select>\n'
    '            </div>\n'
)
assert OLD_MAXSCAN_DIV in html, 'szMaxScan div not found'
html = html.replace(OLD_MAXSCAN_DIV, '', 1)

# ── 2. Script _cfg(): remove maxScan ─────────────────────────────────────────
OLD_CFG_MAXSCAN = "      maxScan:   clp(parseInt(sv('szMaxScan','3000'))||3000,50,100000),\n"
assert OLD_CFG_MAXSCAN in html, '_cfg maxScan not found'
html = html.replace(OLD_CFG_MAXSCAN, '', 1)

# ── 3. Script _computeAll(): scan all candles (drop maxScan limit) ────────────
OLD_COMPUTE_SCAN = (
    '    var maxScan=Math.min(cs.length,cfg.maxScan),base=Math.max(0,cs.length-maxScan);\n'
    '    var sl=base>0?cs.slice(base):cs;\n'
)
assert OLD_COMPUTE_SCAN in html, '_computeAll scan block not found'
NEW_COMPUTE_SCAN = (
    '    var base=0;\n'
    '    var sl=cs; /* scan full history — no maxScan limit */\n'
)
html = html.replace(OLD_COMPUTE_SCAN, NEW_COMPUTE_SCAN, 1)

# ── 4. Script cache key: remove cfg.maxScan ──────────────────────────────────
OLD_CK_SCAN = "            cfg.maxZones,cfg.maxScan,cfg.source,cfg.atrPad,"
assert OLD_CK_SCAN in html, 'cache key maxScan not found'
html = html.replace(OLD_CK_SCAN, "            cfg.maxZones,cfg.source,cfg.atrPad,", 1)

# ── 5. SZ_IDS: remove szMaxScan ──────────────────────────────────────────────
OLD_SZIDS_SCAN = "    'szMaxScan','szSource','szAtrPad','szMerge','szExpire','szMaxTests',"
assert OLD_SZIDS_SCAN in html, 'SZ_IDS szMaxScan not found'
html = html.replace(OLD_SZIDS_SCAN, "    'szSource','szAtrPad','szMerge','szExpire','szMaxTests',", 1)

# ── 6. Main zones: add center line after border draw ─────────────────────────
OLD_MAIN_BORDER = (
    '      ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();\n'
    '      ctx.setLineDash([]);\n'
    '\n'
    '      /* glow for fresh L3+ recent zones */'
)
assert OLD_MAIN_BORDER in html, 'main zone border block not found'
NEW_MAIN_BORDER = (
    '      ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();\n'
    '      ctx.setLineDash([]);\n'
    '      /* center line — dashed */\n'
    "      if(boxH>3){ctx.lineWidth=0.6;ctx.setLineDash([2,3]);ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.45).toFixed(3)+')';ctx.beginPath();ctx.moveTo(xL,y1+boxH/2);ctx.lineTo(xR,y1+boxH/2);ctx.stroke();ctx.setLineDash([]);}\n"
    '\n'
    '      /* glow for fresh L3+ recent zones */'
)
html = html.replace(OLD_MAIN_BORDER, NEW_MAIN_BORDER, 1)

# ── 7. Nested zones: add center line after border draw ───────────────────────
OLD_NEST_BORDER = (
    '        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);\n'
    "        if(nSt!=='thin'){ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);}\n"
    '        ctx.stroke();ctx.setLineDash([]);\n'
    '\n'
    '        /* nested label — centred */'
)
assert OLD_NEST_BORDER in html, 'nested zone border block not found'
NEW_NEST_BORDER = (
    '        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);\n'
    "        if(nSt!=='thin'){ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);}\n"
    '        ctx.stroke();ctx.setLineDash([]);\n'
    '        /* center line — dashed */\n'
    "        if(boxH>3){ctx.lineWidth=0.5;ctx.setLineDash([2,3]);ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(sOp*0.45).toFixed(3)+')';ctx.beginPath();ctx.moveTo(xL,y1+boxH/2);ctx.lineTo(xR,y1+boxH/2);ctx.stroke();ctx.setLineDash([]);}\n"
    '\n'
    '        /* nested label — centred */'
)
html = html.replace(OLD_NEST_BORDER, NEW_NEST_BORDER, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_137.py applied — Beta 0.137')
print('  - szMaxScan input removido (UI + _cfg + SZ_IDS + cache key)')
print('  - _computeAll: escaneia todos os candles disponíveis (sem limite)')
print('  + Center line pontilhada [2,3] em todas as zonas principais (opacity 45% da borda)')
print('  + Center line pontilhada [2,3] em nested zones (opacity 45% da borda)')
