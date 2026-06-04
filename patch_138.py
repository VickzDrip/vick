#!/usr/bin/env python3
"""patch_138.py — Beta 0.138: Spike Zones começam no candle de origem (não plotam para o passado)"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.137') >= 10
html = html.replace('Beta 0.137', 'Beta 0.138')

# ── 1. Main zones: compute per-zone xL from source candle index ───────────────
# Insert after var lf= (before the opacity block)
OLD_MAIN_LF = (
    '      var recency=Math.max(0,1-(z.age/expBound));\n'
    '      var lf=z.level/5;\n'
    '\n'
    '      /* ── opacity by mode (stronger than v0.132) ── */'
)
assert OLD_MAIN_LF in html, 'main zone lf line not found'

NEW_MAIN_LF = (
    '      var recency=Math.max(0,1-(z.age/expBound));\n'
    '      var lf=z.level/5;\n'
    '      xL=Math.max(0,x(z.srcIdx)-bwPx*0.5); /* start at source candle, never extend left */\n'
    '      if(xL>=xR)continue; /* source candle is off-screen to the right */\n'
    '\n'
    '      /* ── opacity by mode (stronger than v0.132) ── */'
)
html = html.replace(OLD_MAIN_LF, NEW_MAIN_LF, 1)

# ── 2. Nested zones: compute per-zone xL from source candle timestamp ─────────
# Add mainTfMs/firstTs vars before the nested loop, then xL= inside it
OLD_NEST_LOOP_START = (
    '    /* ══ NESTED ZONES ══ */\n'
    '    if(cfg.showNested&&nested.length){\n'
    '      var nop=cfg.nestOp||0.6,nSt=cfg.nestStyle||\'dashed\';\n'
    '      var nestTFLbl=nestTF?nestTF.toUpperCase():\'\';\n'
    '      for(var zi=0;zi<nested.length;zi++){\n'
    '        var z=nested[zi];\n'
    '        var y1=sc.y(z.hi),y2=sc.y(z.lo);\n'
    '        if(y1>=H||y2<=0)continue;\n'
    '        var boxH=Math.max(1,y2-y1);\n'
    '        var col=COL[z.level]||COL[5];\n'
    '        var lf=z.level/5;\n'
    '        var fOp=nop*(0.02+0.04*lf),sOp=nop*(0.22+0.32*lf);\n'
)
assert OLD_NEST_LOOP_START in html, 'nested zone loop start not found'

NEW_NEST_LOOP_START = (
    '    /* ══ NESTED ZONES ══ */\n'
    '    if(cfg.showNested&&nested.length){\n'
    '      var nop=cfg.nestOp||0.6,nSt=cfg.nestStyle||\'dashed\';\n'
    '      var nestTFLbl=nestTF?nestTF.toUpperCase():\'\';\n'
    '      var _nMtfMs=_tfMs(cfg.tf||S.tf),_nFirst=S.candles[0]?S.candles[0].t:0;\n'
    '      for(var zi=0;zi<nested.length;zi++){\n'
    '        var z=nested[zi];\n'
    '        var y1=sc.y(z.hi),y2=sc.y(z.lo);\n'
    '        if(y1>=H||y2<=0)continue;\n'
    '        var boxH=Math.max(1,y2-y1);\n'
    '        var col=COL[z.level]||COL[5];\n'
    '        var lf=z.level/5;\n'
    '        var fOp=nop*(0.02+0.04*lf),sOp=nop*(0.22+0.32*lf);\n'
    '        xL=_nMtfMs>0?Math.max(0,x((z.srcTs-_nFirst)/_nMtfMs)-bwPx*0.5):0;\n'
    '        if(xL>=xR)continue;\n'
)
html = html.replace(OLD_NEST_LOOP_START, NEW_NEST_LOOP_START, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_138.py applied — Beta 0.138')
print('  + Main zones: xL = max(0, x(z.srcIdx) - bwPx/2) — começa no candle de origem')
print('  + Nested zones: xL via srcTs → main TF index — começa no nested source candle')
print('  + Guard: skip se xL >= xR (source candle fora da tela para a direita)')
