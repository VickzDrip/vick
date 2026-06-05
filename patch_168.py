#!/usr/bin/env python3
"""patch_168.py — Beta 0.168: HVN Core Only — POC-centered, altura limitada, sem mega zona

Causa raiz do mega-bloco:
- Múltiplas janelas (prop_mtf) produzem zonas no mesmo nível de preço
- Zonas sobrepostas com fill opaco criam visualmente um bloco único enorme
- Sem POC tracking → zona desenhada de lo bruto a hi bruto (1+ buckets)

Correções:
1. computeHVN: tracking do bucket de maior wvol por zona → pocIdx, pocWVol, pocPrice, bucketSize
2. Novo draw mode: Core Only (default) — desenha só poc ± coreWidth×bucketSize/2
3. Core Zone: limita altura se hi-lo > coreH
4. Full Zone: comportamento original
5. vzCoreWidth: 1 (default) / 1.5 / 2 / 3 buckets
6. vzMaxAtrDraw: limita altura máx em N×ATR (default 0 = off)
7. vzMaxPctDraw: limita altura máx em %preço (default 0 = off)
8. vzShowLabels: labels ocultos por default
9. Deduplicação de zonas sobrepostas em computeHVNWindowed
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.167') >= 10, 'Beta 0.167 not found'
html = html.replace('Beta 0.167', 'Beta 0.168')

# ── 1. computeHVN merge loop: adiciona pocIdx/pocWVol tracking ────────────────
OLD_MERGE = (
    "    var zones=[];\n"
    "    var zn={\n"
    "      lo:priceMin+top[0].i*bucketSize,hi:priceMin+(top[0].i+1)*bucketSize,\n"
    "      totalVol:top[0].vol,weightedVol:top[0].wvol,\n"
    "      totalBuyVol:top[0].bv,totalSellVol:top[0].sv,\n"
    "      totalTouches:top[0].touches,maxWeight:top[0].mw\n"
    "    };\n"
    "    var lastI=top[0].i;\n"
    "    for(var k=1;k<top.length;k++){\n"
    "      var b=top[k];\n"
    "      if(b.i-lastI<=s.mergeGap+1){\n"
    "        zn.hi=priceMin+(b.i+1)*bucketSize;\n"
    "        zn.totalVol+=b.vol;zn.weightedVol+=b.wvol;\n"
    "        zn.totalBuyVol+=b.bv;zn.totalSellVol+=b.sv;\n"
    "        zn.totalTouches+=b.touches;\n"
    "        if(b.mw>zn.maxWeight)zn.maxWeight=b.mw;\n"
    "      }else{\n"
    "        zones.push(zn);\n"
    "        zn={lo:priceMin+b.i*bucketSize,hi:priceMin+(b.i+1)*bucketSize,\n"
    "            totalVol:b.vol,weightedVol:b.wvol,\n"
    "            totalBuyVol:b.bv,totalSellVol:b.sv,\n"
    "            totalTouches:b.touches,maxWeight:b.mw};\n"
    "      }\n"
    "      lastI=b.i;\n"
    "    }\n"
    "    zones.push(zn);"
)
assert OLD_MERGE in html, 'computeHVN merge loop anchor not found'
html = html.replace(OLD_MERGE,
    "    var zones=[];\n"
    "    var zn={\n"
    "      lo:priceMin+top[0].i*bucketSize,hi:priceMin+(top[0].i+1)*bucketSize,\n"
    "      totalVol:top[0].vol,weightedVol:top[0].wvol,\n"
    "      totalBuyVol:top[0].bv,totalSellVol:top[0].sv,\n"
    "      totalTouches:top[0].touches,maxWeight:top[0].mw,\n"
    "      pocIdx:top[0].i,pocWVol:top[0].wvol\n"
    "    };\n"
    "    var lastI=top[0].i;\n"
    "    for(var k=1;k<top.length;k++){\n"
    "      var b=top[k];\n"
    "      if(b.i-lastI<=s.mergeGap+1){\n"
    "        zn.hi=priceMin+(b.i+1)*bucketSize;\n"
    "        zn.totalVol+=b.vol;zn.weightedVol+=b.wvol;\n"
    "        zn.totalBuyVol+=b.bv;zn.totalSellVol+=b.sv;\n"
    "        zn.totalTouches+=b.touches;\n"
    "        if(b.mw>zn.maxWeight)zn.maxWeight=b.mw;\n"
    "        if(b.wvol>zn.pocWVol){zn.pocIdx=b.i;zn.pocWVol=b.wvol;}\n"
    "      }else{\n"
    "        zones.push(zn);\n"
    "        zn={lo:priceMin+b.i*bucketSize,hi:priceMin+(b.i+1)*bucketSize,\n"
    "            totalVol:b.vol,weightedVol:b.wvol,\n"
    "            totalBuyVol:b.bv,totalSellVol:b.sv,\n"
    "            totalTouches:b.touches,maxWeight:b.mw,\n"
    "            pocIdx:b.i,pocWVol:b.wvol};\n"
    "      }\n"
    "      lastI=b.i;\n"
    "    }\n"
    "    zones.push(zn);\n"
    "\n"
    "    /* pocPrice = centro do bucket de maior wvol; bucketSize armazenado para uso no draw */\n"
    "    for(var zi2=0;zi2<zones.length;zi2++){\n"
    "      zones[zi2].pocPrice=priceMin+(zones[zi2].pocIdx+0.5)*bucketSize;\n"
    "      zones[zi2].bucketSize=bucketSize;\n"
    "    }",
    1)

# ── 2. computeHVNWindowed: deduplicação de zonas sobrepostas ──────────────────
# Inserir ANTES do return final em computeHVNWindowed
OLD_WINDOWED_RETURN = (
    "    return{hvn:allZones.slice(0,s.topN*3),windowed:true};\n"
    "  }"
)
assert OLD_WINDOWED_RETURN in html, 'computeHVNWindowed return anchor not found'
html = html.replace(OLD_WINDOWED_RETURN,
    "    /* deduplicação: remove zonas que se sobrepõem no espaço de preço (mais fraca descartada) */\n"
    "    allZones.sort(function(a,b){return(a.pocPrice||a.lo)-(b.pocPrice||b.lo);});\n"
    "    var deduped=[];\n"
    "    for(var di=0;di<allZones.length;di++){\n"
    "      var dz=allZones[di],add=true;\n"
    "      for(var dj=deduped.length-1;dj>=0;dj--){\n"
    "        var dz2=deduped[dj];\n"
    "        var poc1=dz.pocPrice||dz.lo,poc2=dz2.pocPrice||dz2.lo;\n"
    "        var bsz=dz.bucketSize||1;\n"
    "        if(Math.abs(poc1-poc2)<bsz*1.5){\n"
    "          /* sobreposição — mantém a de maior relVol */\n"
    "          if((dz.relVol||0)>(dz2.relVol||0)){deduped[dj]=dz;}\n"
    "          add=false;break;\n"
    "        }\n"
    "        if(poc1-poc2>bsz*3)break;\n"
    "      }\n"
    "      if(add)deduped.push(dz);\n"
    "    }\n"
    "    allZones=deduped;\n"
    "\n"
    "    /* re-ordena por prioridade recente após deduplicação */\n"
    "    if(s.recentPri){\n"
    "      allZones.sort(function(a,b){\n"
    "        if(a.windowAge!==b.windowAge)return a.windowAge-b.windowAge;\n"
    "        return b.relVol-a.relVol;\n"
    "      });\n"
    "    }else{\n"
    "      allZones.sort(function(a,b){return b.relVol-a.relVol;});\n"
    "    }\n"
    "\n"
    "    return{hvn:allZones.slice(0,s.topN*3),windowed:true};\n"
    "  }",
    1)

# ── 3. UI: adiciona seção CORE HVN após vzStrMode row, antes da hint ──────────
OLD_HINT_ANCHOR = (
    '            <div class="kv"><span class="k">Strength Mode</span>'
    '<select class="select" id="vzStrMode" style="width:80px">'
    '<option value="weighted" selected>Weighted</option>'
    '<option value="raw">Raw Vol</option>'
    '<option value="hybrid">Hybrid</option>'
    '</select></div>\n'
    '            <div class="hint">'
)
assert OLD_HINT_ANCHOR in html, 'vzStrMode→hint anchor not found'
html = html.replace(OLD_HINT_ANCHOR,
    '            <div class="kv"><span class="k">Strength Mode</span>'
    '<select class="select" id="vzStrMode" style="width:80px">'
    '<option value="weighted" selected>Weighted</option>'
    '<option value="raw">Raw Vol</option>'
    '<option value="hybrid">Hybrid</option>'
    '</select></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#00d4ff;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">CORE HVN</div>\n'
    '            <div class="kv"><span class="k">Draw Mode</span>'
    '<select class="select" id="vzDrawMode" style="width:95px">'
    '<option value="coreOnly" selected>Core Only</option>'
    '<option value="core">Core Zone</option>'
    '<option value="full">Full Zone</option>'
    '</select></div>\n'
    '            <div class="kv"><span class="k">Core Width</span>'
    '<select class="select" id="vzCoreWidth" style="width:95px">'
    '<option value="1" selected>1 bucket</option>'
    '<option value="1.5">1.5 buckets</option>'
    '<option value="2">2 buckets</option>'
    '<option value="3">3 buckets</option>'
    '</select></div>\n'
    '            <div class="kv"><span class="k">Máx. ATR× draw</span>'
    '<input class="num" id="vzMaxAtrDraw" type="number" min="0" max="5" step="0.05" value="0" style="width:52px">'
    '<span style="font-size:9px;color:#5a7090;margin-left:4px">0=off</span></div>\n'
    '            <div class="kv"><span class="k">Máx. % draw</span>'
    '<input class="num" id="vzMaxPctDraw" type="number" min="0" max="5" step="0.01" value="0" style="width:52px">'
    '<span style="font-size:9px;color:#5a7090;margin-left:4px">0=off</span></div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Mostrar labels</span>'
    '<input type="checkbox" id="vzShowLabels" style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;">'
    '</label>\n'
    '            <div class="hint">',
    1)

# ── 4. getSettings: adiciona novos campos core ────────────────────────────────
OLD_SETTINGS_END2 = (
    "      recentPri:boolVal('vzRecentPri',true)\n"
    "    };\n"
    "  }"
)
assert OLD_SETTINGS_END2 in html, 'getSettings recentPri end anchor not found'
html = html.replace(OLD_SETTINGS_END2,
    "      recentPri:boolVal('vzRecentPri',true),\n"
    "      drawMode:strVal('vzDrawMode','coreOnly'),\n"
    "      coreWidth:Math.max(0.5,parseFloat(strVal('vzCoreWidth','1'))||1),\n"
    "      maxAtrDraw:Math.max(0,parseFloat(strVal('vzMaxAtrDraw','0'))||0),\n"
    "      maxPctDraw:Math.max(0,parseFloat(strVal('vzMaxPctDraw','0'))||0),\n"
    "      showLabels:boolVal('vzShowLabels',false)\n"
    "    };\n"
    "  }",
    1)

# ── 5. drawVolZones: aplica core height limiting no draw loop ─────────────────
# Substituir a seção do loop que calcula y1/y2 e desenha
OLD_DRAW_LOOP = (
    "    for(var zi=0;zi<zones.length;zi++){\n"
    "      var z=zones[zi];\n"
    "      var rel=s.strMode==='raw'?z.relRaw:s.strMode==='hybrid'?z.relHybrid:z.relVol;\n"
    "      if(rel==null)rel=0.5;\n"
    "      var mid=(z.hi+z.lo)/2;\n"
    "      var y1=sc.y(z.hi),y2=sc.y(z.lo),ym=sc.y(mid);\n"
    "      var boxH=Math.max(1,y2-y1);\n"
    "\n"
    "      /* posicionamento X — windowed usa timestamp, global usa 0..xR */\n"
    "      var xLeft,xRight;\n"
    "      if(useWindowed&&z.startTime!=null){\n"
    "        xLeft=_vzXByTs(z.startTime,x,bw);\n"
    "        if(z.isLastWindow){\n"
    "          xRight=xR;\n"
    "        }else{\n"
    "          xRight=Math.min(xR,_vzXByTs(z.endTime,x,bw)+bw*(1+s.extend));\n"
    "        }\n"
    "      }else{\n"
    "        xLeft=0;xRight=xR;\n"
    "      }\n"
    "\n"
    "      if(xRight<=xLeft||xLeft>=xR||y2<PT||y1>H-PB)continue;\n"
    "\n"
    "      /* age-fade: janelas antigas ficam mais transparentes */\n"
    "      var ageFade=useWindowed&&(z.windowAge||0)>0?Math.max(0.25,1-(z.windowAge||0)*0.07):1;\n"
    "\n"
    "      ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.03+0.10*rel)*ageFade).toFixed(3)+')';\n"
    "      ctx.fillRect(xLeft,y1,xRight-xLeft,boxH);\n"
    "\n"
    "      ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.25+0.45*rel)*ageFade).toFixed(3)+')';\n"
    "      ctx.lineWidth=rel>0.7?1.5:1;ctx.setLineDash([]);\n"
    "      ctx.beginPath();ctx.moveTo(xLeft,y1);ctx.lineTo(xRight,y1);\n"
    "      ctx.moveTo(xLeft,y2);ctx.lineTo(xRight,y2);ctx.stroke();\n"
    "\n"
    "      if(boxH>12){\n"
    "        ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.15+0.28*rel)*ageFade).toFixed(3)+')';\n"
    "        ctx.lineWidth=1;ctx.setLineDash([3,5]);\n"
    "        ctx.beginPath();ctx.moveTo(xLeft,ym);ctx.lineTo(xRight,ym);ctx.stroke();\n"
    "        ctx.setLineDash([]);\n"
    "      }\n"
    "\n"
    "      if(boxH>8){\n"
    "        ctx.textBaseline='middle';\n"
    "        ctx.font=(rel>0.5?'bold ':'')+'9px monospace';\n"
    "        ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.55+0.30*rel)*ageFade).toFixed(3)+')';\n"
    "        var wLabel=s.weightOn&&z.avgWeight>1.05?' W '+z.avgWeight.toFixed(1)+'x':'';\n"
    "        ctx.fillText('HVN '+priceFmt(mid)+' | $'+nFmt(s.strMode==='raw'?z.rawVol:z.weightedVol)+' | '+z.totalTouches+'t'+wLabel,xLeft+6,ym);\n"
    "      }\n"
    "    }"
)
assert OLD_DRAW_LOOP in html, 'drawVolZones loop anchor not found'
html = html.replace(OLD_DRAW_LOOP,
    "    /* ATR dos candles de análise (cs) para limite de altura no draw */\n"
    "    var _csAtr=0;\n"
    "    if(cs.length>1){\n"
    "      var _aS3=0,_aN3=0,_n3=Math.min(cs.length-1,20);\n"
    "      for(var _i3=cs.length-_n3;_i3<cs.length;_i3++){\n"
    "        var _c3=cs[_i3],_p3=cs[_i3-1].c;\n"
    "        _aS3+=Math.max(_c3.h-_c3.l,Math.abs(_c3.h-_p3),Math.abs(_c3.l-_p3));\n"
    "        _aN3++;\n"
    "      }\n"
    "      _csAtr=_aN3>0?_aS3/_aN3:0;\n"
    "    }\n"
    "\n"
    "    for(var zi=0;zi<zones.length;zi++){\n"
    "      var z=zones[zi];\n"
    "      var rel=s.strMode==='raw'?z.relRaw:s.strMode==='hybrid'?z.relHybrid:z.relVol;\n"
    "      if(rel==null)rel=0.5;\n"
    "\n"
    "      /* ── Core height limiting ─────────────────────────────────────────── */\n"
    "      var drawHi,drawLo;\n"
    "      if(s.drawMode!=='full'&&z.pocPrice!=null){\n"
    "        var poc=z.pocPrice;\n"
    "        var bkSz=z.bucketSize||(poc*s.bucketPct/100)||1;\n"
    "        var coreH=s.coreWidth*bkSz;\n"
    "        /* limites opcionais ATR/% */\n"
    "        if(s.maxAtrDraw>0&&_csAtr>0)coreH=Math.min(coreH,_csAtr*s.maxAtrDraw);\n"
    "        if(s.maxPctDraw>0)coreH=Math.min(coreH,poc*s.maxPctDraw/100);\n"
    "        /* mínimo: 10% do bucket para sempre ser visível */\n"
    "        coreH=Math.max(coreH,bkSz*0.1);\n"
    "        drawHi=poc+coreH/2;\n"
    "        drawLo=poc-coreH/2;\n"
    "      }else{\n"
    "        drawHi=z.hi;drawLo=z.lo;\n"
    "      }\n"
    "\n"
    "      var mid=(drawHi+drawLo)/2;\n"
    "      var y1=sc.y(drawHi),y2=sc.y(drawLo),ym=sc.y(mid);\n"
    "      var boxH=Math.max(1,y2-y1);\n"
    "\n"
    "      /* posicionamento X — windowed usa timestamp, global usa 0..xR */\n"
    "      var xLeft,xRight;\n"
    "      if(useWindowed&&z.startTime!=null){\n"
    "        xLeft=_vzXByTs(z.startTime,x,bw);\n"
    "        if(z.isLastWindow){\n"
    "          xRight=xR;\n"
    "        }else{\n"
    "          xRight=Math.min(xR,_vzXByTs(z.endTime,x,bw)+bw*(1+s.extend));\n"
    "        }\n"
    "      }else{\n"
    "        xLeft=0;xRight=xR;\n"
    "      }\n"
    "\n"
    "      if(xRight<=xLeft||xLeft>=xR||y2<PT||y1>H-PB)continue;\n"
    "\n"
    "      /* age-fade: janelas antigas ficam mais transparentes */\n"
    "      var ageFade=useWindowed&&(z.windowAge||0)>0?Math.max(0.25,1-(z.windowAge||0)*0.07):1;\n"
    "\n"
    "      ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.05+0.18*rel)*ageFade).toFixed(3)+')';\n"
    "      ctx.fillRect(xLeft,y1,xRight-xLeft,boxH);\n"
    "\n"
    "      ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.45+0.45*rel)*ageFade).toFixed(3)+')';\n"
    "      ctx.lineWidth=rel>0.7?1.5:1;ctx.setLineDash([]);\n"
    "      ctx.beginPath();ctx.moveTo(xLeft,y1);ctx.lineTo(xRight,y1);\n"
    "      ctx.moveTo(xLeft,y2);ctx.lineTo(xRight,y2);ctx.stroke();\n"
    "\n"
    "      if(boxH>12){\n"
    "        ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.15+0.25*rel)*ageFade).toFixed(3)+')';\n"
    "        ctx.lineWidth=1;ctx.setLineDash([3,5]);\n"
    "        ctx.beginPath();ctx.moveTo(xLeft,ym);ctx.lineTo(xRight,ym);ctx.stroke();\n"
    "        ctx.setLineDash([]);\n"
    "      }\n"
    "\n"
    "      if(s.showLabels&&boxH>8){\n"
    "        ctx.textBaseline='middle';\n"
    "        ctx.font=(rel>0.5?'bold ':'')+'9px monospace';\n"
    "        ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+((0.55+0.30*rel)*ageFade).toFixed(3)+')';\n"
    "        var wLabel=s.weightOn&&z.avgWeight>1.05?' W '+z.avgWeight.toFixed(1)+'x':'';\n"
    "        ctx.fillText('HVN '+priceFmt(mid)+' | $'+nFmt(s.strMode==='raw'?z.rawVol:z.weightedVol)+' | '+z.totalTouches+'t'+wLabel,xLeft+6,ym);\n"
    "      }\n"
    "    }",
    1)

# ── 6. VZ_INPUTS: adiciona novos IDs ──────────────────────────────────────────
OLD_VZ_INPUTS2 = (
    "    'vzCalcMode','vzWindowSize','vzMaxZoneAtr','vzExpiry','vzRecentPri'\n"
    "  ]);"
)
assert OLD_VZ_INPUTS2 in html, 'VZ_INPUTS 2 anchor not found'
html = html.replace(OLD_VZ_INPUTS2,
    "    'vzCalcMode','vzWindowSize','vzMaxZoneAtr','vzExpiry','vzRecentPri',\n"
    "    'vzDrawMode','vzCoreWidth','vzMaxAtrDraw','vzMaxPctDraw','vzShowLabels'\n"
    "  ]);",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_168.py applied — Beta 0.168')
print('  Core HVN:')
print('  1. Cada zona agora tem pocPrice = centro do bucket de maior wvol')
print('  2. Draw Mode: Core Only (default) → desenha poc ± coreWidth×bucketSize/2')
print('  3. Core Width: 1 bucket (default) — zona fina no núcleo')
print('  4. Deduplicação: zonas sobrepostas de janelas diferentes → mantém a mais forte')
print('  5. Labels OFF por default (vzShowLabels=false)')
print('  6. Fill opacity aumentada (mais visível em zona fina)')
print('  7. Novos inputs: vzDrawMode, vzCoreWidth, vzMaxAtrDraw, vzMaxPctDraw, vzShowLabels')
