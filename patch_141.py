#!/usr/bin/env python3
"""patch_141.py — Beta 0.141: Colore todos os candles que fazem parte do merge"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.140') >= 10
html = html.replace('Beta 0.140', 'Beta 0.141')

# ── 1. Merge: inicializa srcIdxs e acumula ao mesclar ─────────────────────────
OLD_MERGE = (
    '    /* merge overlapping/nearby */\n'
    '    var used=new Uint8Array(candidates.length),merged=[];\n'
    '    for(var i=0;i<candidates.length;i++){\n'
    '      if(used[i])continue;\n'
    '      var z=Object.assign({},candidates[i]);\n'
    '      var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);\n'
    '      for(var j=i+1;j<candidates.length;j++){\n'
    '        if(used[j])continue;\n'
    '        var z2=candidates[j];\n'
    '        if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){\n'
    '          used[j]=1;\n'
    '          if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}\n'
    '          z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;z.vol=Math.max(z.vol,z2.vol);\n'
    '        }\n'
    '      }\n'
    '      merged.push(z);\n'
    '    }'
)
assert OLD_MERGE in html, 'merge block not found'

NEW_MERGE = (
    '    /* merge overlapping/nearby */\n'
    '    var used=new Uint8Array(candidates.length),merged=[];\n'
    '    for(var i=0;i<candidates.length;i++){\n'
    '      if(used[i])continue;\n'
    '      var z=Object.assign({},candidates[i]);\n'
    '      z.srcIdxs=[z.srcIdx]; /* track all merged source candles */\n'
    '      var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);\n'
    '      for(var j=i+1;j<candidates.length;j++){\n'
    '        if(used[j])continue;\n'
    '        var z2=candidates[j];\n'
    '        if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){\n'
    '          used[j]=1;\n'
    '          z.srcIdxs.push(z2.srcIdx);\n'
    '          if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}\n'
    '          z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;z.vol=Math.max(z.vol,z2.vol);\n'
    '        }\n'
    '      }\n'
    '      merged.push(z);\n'
    '    }'
)
html = html.replace(OLD_MERGE, NEW_MERGE, 1)

# ── 2. Draw: destaca TODOS os candles de srcIdxs (não só o principal) ─────────
OLD_HL = (
    '      ctx.textAlign=\'center\';\n'
    '      for(var zi=0;zi<main.length;zi++){\n'
    '        var z=main[zi];\n'
    '        var si=z.srcIdx;\n'
    '        if(si<0||si>=S.candles.length||si<V.a-2||si>V.b+2)continue;\n'
    '        var c=S.candles[si];if(!c)continue;\n'
    '        var col=COL[z.level]||COL[5];\n'
    '        var cx=x(si),chy=sc.y(c.h),cly=sc.y(c.l);\n'
    '        var isUp=c.c>=c.o,hlOp=0.32+0.45*(z.level/5);\n'
    '\n'
    '        ctx.save();\n'
    '        ctx.shadowColor=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',0.55)\';ctx.shadowBlur=2;\n'
    '        ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+hlOp.toFixed(3)+\')\';  \n'
    '        ctx.lineWidth=1.5;ctx.setLineDash([]);\n'
    '        ctx.beginPath();ctx.moveTo(cx,chy);ctx.lineTo(cx,cly);ctx.stroke();\n'
    '        ctx.restore();ctx.setLineDash([]);\n'
    '\n'
    '        /* triangle above/below candle tip */\n'
    '        var triY=isUp?chy-3:cly+3,triD=isUp?-1:1;\n'
    '        ctx.fillStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+(hlOp*1.1).toFixed(3)+\')\';\n'
    '        ctx.beginPath();ctx.moveTo(cx-3.5,triY);ctx.lineTo(cx+3.5,triY);ctx.lineTo(cx,triY+triD*5);ctx.closePath();ctx.fill();\n'
    '\n'
    '        /* S3/S4/S5 label */\n'
    '        var lblY=isUp?chy-10:cly+13;\n'
    '        ctx.font=\'bold 7px monospace\';\n'
    '        ctx.fillStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+Math.min(1,hlOp+0.15).toFixed(3)+\')\';\n'
    '        ctx.fillText(\'S\'+z.level,cx,lblY);\n'
    '      }\n'
    '      ctx.textAlign=\'left\';'
)
assert OLD_HL in html, 'highlight block not found'

NEW_HL = (
    '      ctx.textAlign=\'center\';\n'
    '      for(var zi=0;zi<main.length;zi++){\n'
    '        var z=main[zi];\n'
    '        var srcs=z.srcIdxs&&z.srcIdxs.length?z.srcIdxs:[z.srcIdx];\n'
    '        for(var _si=0;_si<srcs.length;_si++){\n'
    '          var si=srcs[_si],isPrimary=_si===0;\n'
    '          if(si<0||si>=S.candles.length||si<V.a-2||si>V.b+2)continue;\n'
    '          var c=S.candles[si];if(!c)continue;\n'
    '          var col=COL[z.level]||COL[5];\n'
    '          var cx=x(si),chy=sc.y(c.h),cly=sc.y(c.l);\n'
    '          var isUp=c.c>=c.o;\n'
    '          /* primary source: full opacity; merged sources: 55% opacity */\n'
    '          var hlOp=(isPrimary?0.32+0.45*(z.level/5):(0.20+0.28*(z.level/5)));\n'
    '\n'
    '          ctx.save();\n'
    '          ctx.shadowColor=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+(isPrimary?0.55:0.30)+\')\';ctx.shadowBlur=isPrimary?2:1;\n'
    '          ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+hlOp.toFixed(3)+\')\';\n'
    '          ctx.lineWidth=isPrimary?1.5:1;ctx.setLineDash([]);\n'
    '          ctx.beginPath();ctx.moveTo(cx,chy);ctx.lineTo(cx,cly);ctx.stroke();\n'
    '          ctx.restore();ctx.setLineDash([]);\n'
    '\n'
    '          /* triangle above/below candle tip */\n'
    '          var triY=isUp?chy-3:cly+3,triD=isUp?-1:1;\n'
    '          ctx.fillStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+(hlOp*1.1).toFixed(3)+\')\';\n'
    '          ctx.beginPath();ctx.moveTo(cx-3.5,triY);ctx.lineTo(cx+3.5,triY);ctx.lineTo(cx,triY+triD*5);ctx.closePath();ctx.fill();\n'
    '\n'
    '          /* label: primary = S3, merged = ·3 */\n'
    '          var lblY=isUp?chy-10:cly+13;\n'
    '          ctx.font=\'bold 7px monospace\';\n'
    '          ctx.fillStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+Math.min(1,hlOp+0.15).toFixed(3)+\')\';\n'
    '          ctx.fillText(isPrimary?\'S\'+z.level:\'·\'+z.level,cx,lblY);\n'
    '        }\n'
    '      }\n'
    '      ctx.textAlign=\'left\';'
)
html = html.replace(OLD_HL, NEW_HL, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_141.py applied — Beta 0.141')
print('  + Merge rastreia todos os srcIdxs (z.srcIdxs array)')
print('  + Draw destaca todos os candles merged: S3 (principal) + ·3 (mesclados)')
print('  + Merged sources: 55% de opacidade, linha mais fina, sem shadow forte')
