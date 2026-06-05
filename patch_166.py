#!/usr/bin/env python3
"""patch_166.py — Beta 0.166: HVN Proportional MTF — zonas por janelas/blocos com timestamp

Problemas corrigidos:
1. drawVolZones() usava xLeft=0 fixo → todas as zonas cobriam o gráfico inteiro (errado para MTF)
2. computeHVN() era puramente global → 1000 candles de 1h viram 2-3 zonas gigantes
3. Sem limites de altura por ATR → zona podia engolir todo o range do preço

Novidades (Beta 0.166):
1. Modo Proportional MTF (default): divide histórico em janelas, cada janela gera suas zonas
2. Cada zona recebe startTime/endTime → posicionada no timestamp correto no gráfico atual
3. _vzXByTs(): helper de timestamp → pixel X (busca binária em S.candles)
4. Rolling Window: últimos N candles do TF escolhido (xLeft=0, mais preciso)
5. Session Blocks: idêntico ao Proportional MTF com blocos fixos
6. Global: comportamento anterior preservado
7. Max Zone Height ATR×: filtra zonas muito largas pós-merge
8. Expiração: remove zonas de janelas além de N candles do TF
9. Prioridade Recente: janelas mais novas sobem no ranking + age-fade visual
10. Re-normalização relVol entre janelas para opacidade consistente
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.165') >= 10, 'Beta 0.165 not found'
html = html.replace('Beta 0.165', 'Beta 0.166')

# ── 1. UI: novos inputs após vzTf row ─────────────────────────────────────────
OLD_UI = (
    '<option value="1w">1w</option></select></div>\n'
    '            <div class="kv"><span class="k">Faixa % preço</span><input class="num" id="vzBucket"'
)
assert OLD_UI in html, 'vzTf→vzBucket anchor not found'
html = html.replace(OLD_UI,
    '<option value="1w">1w</option></select></div>\n'
    '            <div class="kv"><span class="k">Modo cálculo</span>'
    '<select class="select" id="vzCalcMode" style="width:118px">'
    '<option value="prop_mtf" selected>Proportional MTF</option>'
    '<option value="rolling">Rolling Window</option>'
    '<option value="blocks">Session Blocks</option>'
    '<option value="global">Global</option>'
    '</select></div>\n'
    '            <div class="kv"><span class="k">Window (candles)</span>'
    '<select class="select" id="vzWindowSize" style="width:72px">'
    '<option value="20">20</option>'
    '<option value="50" selected>50</option>'
    '<option value="100">100</option>'
    '<option value="200">200</option>'
    '</select></div>\n'
    '            <div class="kv"><span class="k">Altura máx. ATR×</span>'
    '<select class="select" id="vzMaxZoneAtr" style="width:72px">'
    '<option value="0">Off</option>'
    '<option value="0.5">0.5×</option>'
    '<option value="1.0" selected>1.0×</option>'
    '<option value="1.5">1.5×</option>'
    '<option value="2.0">2.0×</option>'
    '</select></div>\n'
    '            <div class="kv"><span class="k">Expiração</span>'
    '<select class="select" id="vzExpiry" style="width:90px">'
    '<option value="0" selected>Off</option>'
    '<option value="50">50 candles</option>'
    '<option value="100">100 candles</option>'
    '<option value="250">250 candles</option>'
    '<option value="500">500 candles</option>'
    '</select></div>\n'
    '            <label class="kv" style="cursor:pointer;">'
    '<span class="k">Prior. recente</span>'
    '<input type="checkbox" id="vzRecentPri" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;">'
    '</label>\n'
    '            <div class="kv"><span class="k">Faixa % preço</span><input class="num" id="vzBucket"',
    1)

# ── 2. Atualiza hint text ──────────────────────────────────────────────────────
OLD_HINT = (
    '<div class="hint">Weighted HVN — candles com volume anormal pesam mais no cálculo das zonas. '
    'Zonas mais fortes = maior volume ponderado nessa faixa de preço.</div>'
)
assert OLD_HINT in html, 'HVN hint text anchor not found'
html = html.replace(OLD_HINT,
    '<div class="hint">Proportional MTF: divide o histórico em janelas — '
    'cada bloco gera suas próprias zonas posicionadas no timestamp correto. '
    'Rolling = últimos N candles. Altura máx. ATR filtra zonas muito largas.</div>',
    1)

# ── 3. getSettings: adiciona novos campos ─────────────────────────────────────
OLD_SETTINGS_END = (
    '      recencyOn:boolVal(\'vzRecency\',true),\n'
    '      recStr:Math.max(0,Math.min(2,numVal(\'vzRecStr\',0.35))),\n'
    '      strMode:strVal(\'vzStrMode\',\'weighted\')\n'
    '    };\n'
    '  }'
)
assert OLD_SETTINGS_END in html, 'getSettings end anchor not found'
html = html.replace(OLD_SETTINGS_END,
    '      recencyOn:boolVal(\'vzRecency\',true),\n'
    '      recStr:Math.max(0,Math.min(2,numVal(\'vzRecStr\',0.35))),\n'
    '      strMode:strVal(\'vzStrMode\',\'weighted\'),\n'
    '      calcMode:strVal(\'vzCalcMode\',\'prop_mtf\'),\n'
    '      windowSize:Math.max(10,parseInt(strVal(\'vzWindowSize\',\'50\'),10)||50),\n'
    '      maxZoneAtr:Math.max(0,parseFloat(strVal(\'vzMaxZoneAtr\',\'1.0\'))||0),\n'
    '      expiry:Math.max(0,parseInt(strVal(\'vzExpiry\',\'0\'),10)||0),\n'
    '      recentPri:boolVal(\'vzRecentPri\',true)\n'
    '    };\n'
    '  }',
    1)

# ── 4. computeHVN: adiciona filtro de altura máx. ATR antes do return ─────────
OLD_HVN_RETURN = (
    '      z.strengthScore=Math.round(relVol*100);\n'
    '      z.isWeightedHVN=true;\n'
    '      z.weightedVolFinal=z.weightedVol;\n'
    '    }\n'
    '\n'
    '    return{hvn:zones};\n'
    '  }\n'
    '\n'
    '  /* ── Draw zones ── */'
)
assert OLD_HVN_RETURN in html, 'computeHVN return anchor not found'
html = html.replace(OLD_HVN_RETURN,
    '      z.strengthScore=Math.round(relVol*100);\n'
    '      z.isWeightedHVN=true;\n'
    '      z.weightedVolFinal=z.weightedVol;\n'
    '    }\n'
    '\n'
    '    /* max zone height ATR filter — descarta zonas mais largas que s.maxZoneAtr × ATR */\n'
    '    if(s.maxZoneAtr>0&&cs.length>1){\n'
    '      var _aS=0,_aN=0;\n'
    '      for(var _ai2=1;_ai2<cs.length;_ai2++){\n'
    '        var _ca=cs[_ai2],_pc=cs[_ai2-1].c;\n'
    '        _aS+=Math.max(_ca.h-_ca.l,Math.abs(_ca.h-_pc),Math.abs(_ca.l-_pc));\n'
    '        _aN++;\n'
    '      }\n'
    '      var _atr2=_aN>0?_aS/_aN:0;\n'
    '      if(_atr2>0)zones=zones.filter(function(z){return(z.hi-z.lo)<=s.maxZoneAtr*_atr2;});\n'
    '    }\n'
    '\n'
    '    return{hvn:zones};\n'
    '  }\n'
    '\n'
    '  /* ── Timestamp → pixel X (busca binária em S.candles) ── */\n'
    '  function _vzXByTs(ts,xFn,bwPix){\n'
    '    var cs2=window.S&&window.S.candles;\n'
    '    if(!cs2||!cs2.length)return 0;\n'
    '    var lo=0,hi=cs2.length-1;\n'
    '    while(lo<hi){var m=(lo+hi)>>1;if(cs2[m].t<ts)lo=m+1;else hi=m;}\n'
    '    if(lo>0&&Math.abs(cs2[lo-1].t-ts)<Math.abs(cs2[lo].t-ts))lo--;\n'
    '    return Math.max(0,xFn(lo)-bwPix*0.5);\n'
    '  }\n'
    '\n'
    '  /* ── Windowed HVN — divide histórico em blocos, cada bloco gera zonas com timestamps ── */\n'
    '  function computeHVNWindowed(cs,s){\n'
    '    if(cs.length<3)return null;\n'
    '    var win=s.windowSize;\n'
    '    var allZones=[];\n'
    '    var totalWins=Math.ceil(cs.length/win);\n'
    '    for(var wi=0;wi<totalWins;wi++){\n'
    '      var slS=wi*win,slE=Math.min((wi+1)*win,cs.length);\n'
    '      var wcs=cs.slice(slS,slE);\n'
    '      if(wcs.length<3)continue;\n'
    '      var res=computeHVN(wcs,s);\n'
    '      if(!res||!res.hvn||!res.hvn.length)continue;\n'
    '      var wAge=totalWins-1-wi;  /* 0=janela mais recente */\n'
    '      var startTs=wcs[0].t,endTs=wcs[wcs.length-1].t;\n'
    '      var isLast=(wi===totalWins-1);\n'
    '      for(var zi=0;zi<res.hvn.length;zi++){\n'
    '        var z=res.hvn[zi];\n'
    '        z.startTime=startTs;z.endTime=endTs;\n'
    '        z.windowAge=wAge;z.isLastWindow=isLast;z.srcTs=startTs;\n'
    '        allZones.push(z);\n'
    '      }\n'
    '    }\n'
    '    if(!allZones.length)return null;\n'
    '\n'
    '    /* expiry: descarta janelas muito antigas (em candles do TF escolhido) */\n'
    '    if(s.expiry>0&&cs.length>0){\n'
    '      var lastT=cs[cs.length-1].t;\n'
    '      var tfMs=cs.length>1?cs[1].t-cs[0].t:60000;\n'
    '      allZones=allZones.filter(function(z){\n'
    '        return(lastT-z.endTime)/tfMs<=s.expiry;\n'
    '      });\n'
    '    }\n'
    '\n'
    '    /* re-normaliza relVol entre janelas para opacidade global consistente */\n'
    '    var gMaxWV=0,gMaxRV=0;\n'
    '    for(var i=0;i<allZones.length;i++){\n'
    '      if(allZones[i].weightedVol>gMaxWV)gMaxWV=allZones[i].weightedVol;\n'
    '      var rv=allZones[i].rawVol||allZones[i].totalVol||0;\n'
    '      if(rv>gMaxRV)gMaxRV=rv;\n'
    '    }\n'
    '    for(var i=0;i<allZones.length;i++){\n'
    '      var zz=allZones[i];\n'
    '      zz.relVol=gMaxWV>0?zz.weightedVol/gMaxWV:1;\n'
    '      var rv2=zz.rawVol||zz.totalVol||0;\n'
    '      zz.relRaw=gMaxRV>0?rv2/gMaxRV:1;\n'
    '      zz.relHybrid=(zz.relVol+zz.relRaw)/2;\n'
    '      zz.strengthScore=Math.round(zz.relVol*100);\n'
    '    }\n'
    '\n'
    '    /* ordena: prioridade recente + volume */\n'
    '    if(s.recentPri){\n'
    '      allZones.sort(function(a,b){\n'
    '        if(a.windowAge!==b.windowAge)return a.windowAge-b.windowAge;\n'
    '        return b.relVol-a.relVol;\n'
    '      });\n'
    '    }else{\n'
    '      allZones.sort(function(a,b){return b.relVol-a.relVol;});\n'
    '    }\n'
    '\n'
    '    return{hvn:allZones.slice(0,s.topN*3),windowed:true};\n'
    '  }\n'
    '\n'
    '  /* ── Draw zones ── */',
    1)

# ── 5. Substitui função drawVolZones completa ──────────────────────────────────
OLD_DRAW = (
    '  function drawVolZones(ctx,W,H,V,sc,x){\n'
    '    if(!window.S||!S.inds.volZones||!S.candles.length)return;\n'
    '    var vzTfSel=E(\'vzTf\');var vzTf=vzTfSel?vzTfSel.value:\'\';\n'
    '    var cs=getVZCandles();\n'
    '    var s=getSettings(cs);\n'
    '    var key=[cs.length,(cs[0]||{}).t||0,S.sym,vzTf||S.tf,\n'
    '             s.bucketPct,s.topN,s.minTouch,s.mergeGap,\n'
    '             s.weightOn?1:0,s.weightMA,s.weightStr,s.maxWeight,\n'
    '             s.atrComp?1:0,s.compBoost,s.widePen,\n'
    '             s.recencyOn?1:0,s.recStr,s.strMode].join(\'|\');\n'
    '    if(key!==_vzCacheKey){\n'
    '      _vzCache=computeHVN(cs,s);\n'
    '      _vzCacheKey=key;\n'
    '    }\n'
    '    if(!_vzCache||!_vzCache.hvn||!_vzCache.hvn.length)return;\n'
    '    var zones=_vzCache.hvn;\n'
    '\n'
    '    var rgb=hexToRgb(s.color);\n'
    '    var vspan=S.view.end-S.view.start;\n'
    '    var cw=CW(W);var bw=cw/vspan;\n'
    '    var xLeft=0;\n'
    '    var xRight=W-RP();\n'
    '\n'
    '    ctx.save();\n'
    '    window.__ETX_SKIP_COLORMAP=true;\n'
    '\n'
    '    for(var zi=0;zi<zones.length;zi++){\n'
    '      var z=zones[zi];\n'
    '      var rel=s.strMode===\'raw\'?z.relRaw:s.strMode===\'hybrid\'?z.relHybrid:z.relVol;\n'
    '      var mid=(z.hi+z.lo)/2;\n'
    '      var y1=sc.y(z.hi),y2=sc.y(z.lo),ym=sc.y(mid);\n'
    '      var boxH=Math.max(1,y2-y1);\n'
    '      if(xRight<=xLeft||y2<PT||y1>H-PB)continue;\n'
    '\n'
    '      ctx.fillStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+(0.03+0.10*rel).toFixed(3)+\')\';\n'
    '      ctx.fillRect(xLeft,y1,xRight-xLeft,boxH);\n'
    '\n'
    '      ctx.strokeStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+(0.25+0.45*rel).toFixed(3)+\')\';\n'
    '      ctx.lineWidth=rel>0.7?1.5:1;ctx.setLineDash([]);\n'
    '      ctx.beginPath();ctx.moveTo(xLeft,y1);ctx.lineTo(xRight,y1);\n'
    '      ctx.moveTo(xLeft,y2);ctx.lineTo(xRight,y2);ctx.stroke();\n'
    '\n'
    '      if(boxH>12){\n'
    '        ctx.strokeStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+(0.15+0.28*rel).toFixed(3)+\')\';\n'
    '        ctx.lineWidth=1;ctx.setLineDash([3,5]);\n'
    '        ctx.beginPath();ctx.moveTo(xLeft,ym);ctx.lineTo(xRight,ym);ctx.stroke();\n'
    '        ctx.setLineDash([]);\n'
    '      }\n'
    '\n'
    '      if(boxH>8){\n'
    '        ctx.textBaseline=\'middle\';\n'
    '        ctx.font=(rel>0.5?\'bold \':\'\')+\'9px monospace\';\n'
    '        ctx.fillStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+(0.55+0.30*rel).toFixed(3)+\')\';\n'
    '        var wLabel=s.weightOn&&z.avgWeight>1.05?\' W \'+z.avgWeight.toFixed(1)+\'x\':\'\';\n'
    '        ctx.fillText(\'HVN \'+priceFmt(mid)+\' | $\'+nFmt(s.strMode===\'raw\'?z.rawVol:z.weightedVol)+\' | \'+z.totalTouches+\'t\'+wLabel,xLeft+6,ym);\n'
    '      }\n'
    '    }\n'
    '\n'
    '    window.__ETX_SKIP_COLORMAP=false;\n'
    '    ctx.restore();\n'
    '  }'
)
assert OLD_DRAW in html, 'drawVolZones function anchor not found'
html = html.replace(OLD_DRAW,
    '  function drawVolZones(ctx,W,H,V,sc,x){\n'
    '    if(!window.S||!S.inds.volZones||!S.candles.length)return;\n'
    '    var vzTfSel=E(\'vzTf\');var vzTf=vzTfSel?vzTfSel.value:\'\';\n'
    '    var cs=getVZCandles();\n'
    '    var s=getSettings(cs);\n'
    '    var useWindowed=s.calcMode===\'prop_mtf\'||s.calcMode===\'blocks\';\n'
    '    var key=[cs.length,(cs[0]||{}).t||0,S.sym,vzTf||S.tf,\n'
    '             s.bucketPct,s.topN,s.minTouch,s.mergeGap,\n'
    '             s.weightOn?1:0,s.weightMA,s.weightStr,s.maxWeight,\n'
    '             s.atrComp?1:0,s.compBoost,s.widePen,\n'
    '             s.recencyOn?1:0,s.recStr,s.strMode,\n'
    '             s.calcMode,s.windowSize,s.maxZoneAtr,s.expiry,s.recentPri?1:0].join(\'|\');\n'
    '    if(key!==_vzCacheKey){\n'
    '      if(useWindowed){_vzCache=computeHVNWindowed(cs,s);}\n'
    '      else if(s.calcMode===\'rolling\'){var _rwcs=cs.length>s.windowSize?cs.slice(-s.windowSize):cs;_vzCache=computeHVN(_rwcs,s);}\n'
    '      else{_vzCache=computeHVN(cs,s);}\n'
    '      _vzCacheKey=key;\n'
    '    }\n'
    '    if(!_vzCache||!_vzCache.hvn||!_vzCache.hvn.length)return;\n'
    '    var zones=_vzCache.hvn;\n'
    '\n'
    '    var rgb=hexToRgb(s.color);\n'
    '    var vspan=S.view.end-S.view.start;\n'
    '    var cw=CW(W);var bw=cw/vspan;\n'
    '    var xR=W-RP();\n'
    '\n'
    '    ctx.save();\n'
    '    window.__ETX_SKIP_COLORMAP=true;\n'
    '\n'
    '    for(var zi=0;zi<zones.length;zi++){\n'
    '      var z=zones[zi];\n'
    '      var rel=s.strMode===\'raw\'?z.relRaw:s.strMode===\'hybrid\'?z.relHybrid:z.relVol;\n'
    '      if(rel==null)rel=0.5;\n'
    '      var mid=(z.hi+z.lo)/2;\n'
    '      var y1=sc.y(z.hi),y2=sc.y(z.lo),ym=sc.y(mid);\n'
    '      var boxH=Math.max(1,y2-y1);\n'
    '\n'
    '      /* posicionamento X — windowed usa timestamp, global usa 0..xR */\n'
    '      var xLeft,xRight;\n'
    '      if(useWindowed&&z.startTime!=null){\n'
    '        xLeft=_vzXByTs(z.startTime,x,bw);\n'
    '        if(z.isLastWindow){\n'
    '          xRight=xR;\n'
    '        }else{\n'
    '          xRight=Math.min(xR,_vzXByTs(z.endTime,x,bw)+bw*(1+s.extend));\n'
    '        }\n'
    '      }else{\n'
    '        xLeft=0;xRight=xR;\n'
    '      }\n'
    '\n'
    '      if(xRight<=xLeft||xLeft>=xR||y2<PT||y1>H-PB)continue;\n'
    '\n'
    '      /* age-fade: janelas antigas ficam mais transparentes */\n'
    '      var ageFade=useWindowed&&(z.windowAge||0)>0?Math.max(0.25,1-(z.windowAge||0)*0.07):1;\n'
    '\n'
    '      ctx.fillStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+((0.03+0.10*rel)*ageFade).toFixed(3)+\')\';\n'
    '      ctx.fillRect(xLeft,y1,xRight-xLeft,boxH);\n'
    '\n'
    '      ctx.strokeStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+((0.25+0.45*rel)*ageFade).toFixed(3)+\')\';\n'
    '      ctx.lineWidth=rel>0.7?1.5:1;ctx.setLineDash([]);\n'
    '      ctx.beginPath();ctx.moveTo(xLeft,y1);ctx.lineTo(xRight,y1);\n'
    '      ctx.moveTo(xLeft,y2);ctx.lineTo(xRight,y2);ctx.stroke();\n'
    '\n'
    '      if(boxH>12){\n'
    '        ctx.strokeStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+((0.15+0.28*rel)*ageFade).toFixed(3)+\')\';\n'
    '        ctx.lineWidth=1;ctx.setLineDash([3,5]);\n'
    '        ctx.beginPath();ctx.moveTo(xLeft,ym);ctx.lineTo(xRight,ym);ctx.stroke();\n'
    '        ctx.setLineDash([]);\n'
    '      }\n'
    '\n'
    '      if(boxH>8){\n'
    '        ctx.textBaseline=\'middle\';\n'
    '        ctx.font=(rel>0.5?\'bold \':\'\')+\'9px monospace\';\n'
    '        ctx.fillStyle=\'rgba(\'+rgb.r+\',\'+rgb.g+\',\'+rgb.b+\',\'+((0.55+0.30*rel)*ageFade).toFixed(3)+\')\';\n'
    '        var wLabel=s.weightOn&&z.avgWeight>1.05?\' W \'+z.avgWeight.toFixed(1)+\'x\':\'\';\n'
    '        ctx.fillText(\'HVN \'+priceFmt(mid)+\' | $\'+nFmt(s.strMode===\'raw\'?z.rawVol:z.weightedVol)+\' | \'+z.totalTouches+\'t\'+wLabel,xLeft+6,ym);\n'
    '      }\n'
    '    }\n'
    '\n'
    '    window.__ETX_SKIP_COLORMAP=false;\n'
    '    ctx.restore();\n'
    '  }',
    1)

# ── 6. VZ_INPUTS: adiciona novos IDs ──────────────────────────────────────────
OLD_VZ_INPUTS = (
    "  var VZ_INPUTS=new Set([\n"
    "    'vzBucket','vzBucketAtr','vzTopN','vzMinTouch','vzMerge','vzExtend','vzColor','vzTf',\n"
    "    'vzWeightOn','vzWeightMA','vzWeightStr','vzMaxWeight',\n"
    "    'vzAtrComp','vzCompBoost','vzWidePen',\n"
    "    'vzRecency','vzRecStr','vzStrMode'\n"
    "  ]);"
)
assert OLD_VZ_INPUTS in html, 'VZ_INPUTS anchor not found'
html = html.replace(OLD_VZ_INPUTS,
    "  var VZ_INPUTS=new Set([\n"
    "    'vzBucket','vzBucketAtr','vzTopN','vzMinTouch','vzMerge','vzExtend','vzColor','vzTf',\n"
    "    'vzWeightOn','vzWeightMA','vzWeightStr','vzMaxWeight',\n"
    "    'vzAtrComp','vzCompBoost','vzWidePen',\n"
    "    'vzRecency','vzRecStr','vzStrMode',\n"
    "    'vzCalcMode','vzWindowSize','vzMaxZoneAtr','vzExpiry','vzRecentPri'\n"
    "  ]);",
    1)

# ── 7. Change handler: reseta candles também ao mudar vzCalcMode ───────────────
OLD_CHANGE = (
    "    if(id==='vzTf'){_vzExtCandles=null;_vzExtKey='';_vzExtFetching=false;}\n"
    "    vzRedraw();"
)
assert OLD_CHANGE in html, 'change handler anchor not found'
html = html.replace(OLD_CHANGE,
    "    if(id==='vzTf'||id==='vzCalcMode'){_vzExtCandles=null;_vzExtKey='';_vzExtFetching=false;}\n"
    "    vzRedraw();",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_166.py applied — Beta 0.166')
print('  HVN Proportional MTF:')
print('  1. Modo Proportional MTF (default): janelas de 50 candles, cada uma gera suas zonas')
print('  2. _vzXByTs(): timestamp → pixel X correto no gráfico atual')
print('  3. Zona começa em xLeft=_vzXByTs(startTime) — nunca mais xLeft=0 fixo para MTF')
print('  4. Última janela estende até a direita da tela (xRight=xR)')
print('  5. Janelas históricas: xRight = fim da janela + vzExtend barras')
print('  6. Age-fade: janelas antigas ficam mais transparentes (ageFade)')
print('  7. Max Zone ATR×: filtra zonas muito largas (default 1.0×ATR)')
print('  8. Rolling Window: apenas últimos N candles do TF escolhido')
print('  9. Global: comportamento anterior preservado')
print('  10. Re-normalização relVol entre janelas para opacidade global consistente')
print('  Novos inputs: vzCalcMode, vzWindowSize, vzMaxZoneAtr, vzExpiry, vzRecentPri')
