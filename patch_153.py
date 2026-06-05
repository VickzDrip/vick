#!/usr/bin/env python3
"""patch_153.py — Beta 0.153: Spike Zones — nova paleta de cores + opacidades melhoradas
   Problema: L1 (75,100,158) invisível no fundo dark; opacidades fill 0.06–0.19 muito baixas.
   Fix: cores vívidas de alto contraste + opacidades aumentadas por modo.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.152') >= 10, 'Beta 0.152 not found'
html = html.replace('Beta 0.152', 'Beta 0.153')

# ── 1. New color palette — high-contrast vivid colors on dark background ──────────
OLD_COL = (
    "  var COL=[null,\n"
    "    {r:75, g:100,b:158},  /* L1 steel blue  */\n"
    "    {r:10, g:185,b:215},  /* L2 cyan        */\n"
    "    {r:0,  g:205,b:172},  /* L3 teal        */\n"
    "    {r:235,g:162,b:32},   /* L4 golden      */\n"
    "    {r:205,g:50, b:205}   /* L5 magenta     */\n"
    "  ];"
)
assert OLD_COL in html, 'COL array anchor not found'
NEW_COL = (
    "  var COL=[null,\n"
    "    {r:90, g:150,b:255},  /* L1 bright blue  */\n"
    "    {r:0,  g:215,b:255},  /* L2 vivid cyan   */\n"
    "    {r:0,  g:245,b:200},  /* L3 vivid mint   */\n"
    "    {r:255,g:188,b:0  },  /* L4 bright amber */\n"
    "    {r:255,g:55, b:245}   /* L5 vivid pink   */\n"
    "  ];"
)
html = html.replace(OLD_COL, NEW_COL, 1)

# ── 2. Opacity values — increased across all three colMode options ────────────────
OLD_OPS = (
    "      var fillOp,strOp;\n"
    "      if(cfg.colMode==='level'){\n"
    "        fillOp=0.06+0.11*lf;\n"
    "        strOp=Math.min(0.88,0.32+0.45*lf);\n"
    "      }else if(cfg.colMode==='recency'){\n"
    "        fillOp=0.03+0.15*recency;\n"
    "        strOp=Math.min(0.88,0.16+0.68*recency);\n"
    "      }else{\n"
    "        fillOp=0.045+0.065*lf+0.075*recency;\n"
    "        strOp=Math.min(0.84,0.28+0.32*lf+0.26*recency);\n"
    "      }"
)
assert OLD_OPS in html, 'opacity values anchor not found'
NEW_OPS = (
    "      var fillOp,strOp;\n"
    "      if(cfg.colMode==='level'){\n"
    "        fillOp=0.09+0.13*lf;\n"
    "        strOp=Math.min(0.95,0.46+0.46*lf);\n"
    "      }else if(cfg.colMode==='recency'){\n"
    "        fillOp=0.06+0.18*recency;\n"
    "        strOp=Math.min(0.95,0.26+0.70*recency);\n"
    "      }else{\n"
    "        fillOp=0.07+0.08*lf+0.09*recency;\n"
    "        strOp=Math.min(0.92,0.38+0.34*lf+0.26*recency);\n"
    "      }"
)
html = html.replace(OLD_OPS, NEW_OPS, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_153.py applied — Beta 0.153')
print('  NEW PALETTE:')
print('    L1: bright blue    (90,150,255) — was (75,100,158) invisible on dark bg')
print('    L2: vivid cyan     (0,215,255)  — was (10,185,215)')
print('    L3: vivid mint     (0,245,200)  — was (0,205,172)')
print('    L4: bright amber   (255,188,0)  — was (235,162,32)')
print('    L5: vivid pink     (255,55,245) — was (205,50,205)')
print('  OPACITY (hybrid mode example L3 recency=0.5):')
print('    fillOp: 0.115 → was 0.088 (+31%)')
print('    strOp:  0.640 → was 0.554 (+16%)')
