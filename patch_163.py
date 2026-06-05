#!/usr/bin/env python3
"""patch_163.py — Beta 0.163: Fix Needle Zone flow (detect→candidate→merge→draw)

Problemas corrigidos:
1. needleMeta (objeto aninhado) substituído por campos planos needleHi/needleLo/etc.
2. draw() usa drawHi/drawLo explícito — nunca usa z.hi/z.lo bruto quando needle ativo
3. Merge usa needleConfidence (campo plano) e copia todos os campos needle
4. Condição !hvsOnly removida — needle aplica a TODOS os sources incluindo hvs_only
5. needleMinPx aplicado no draw (garante altura mínima em pixels)
6. Cache key atualizado com todos os params de compute
7. console.table de diagnóstico quando needleOn e cache recalcula
8. Debug visual: `window.__szDbgNeedle=true` desenha contorno ciano nas needle zones
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.162') >= 10, 'Beta 0.162 not found'
html = html.replace('Beta 0.162', 'Beta 0.163')

# ── 1. candidates.push — campos planos + needle aplica a todos os sources ──────
OLD_CAND = (
    "      var rawHi=hi,rawLo=lo,needleMeta=null;\n"
    "      if(cfg.needleOn&&!hvsOnly){\n"
    "        needleMeta=_refineToNeedleZone(c,at,cfg,rawHi,rawLo);\n"
    "        if(needleMeta){hi=needleMeta.hi;lo=needleMeta.lo;}\n"
    "      }\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,"
    "level:level,rawScore:ex,hi:hi,lo:lo,mid:(hi+lo)/2,"
    "dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta,hvsOnly:hvsOnly,"
    "rawHi:rawHi,rawLo:rawLo,needleMeta:needleMeta});"
)
assert OLD_CAND in html, 'candidates.push anchor not found'
html = html.replace(OLD_CAND,
    "      var rawHi=hi,rawLo=lo;\n"
    "      var _needle=cfg.needleOn?_refineToNeedleZone(c,at,cfg,rawHi,rawLo):null;\n"
    "      var fHi=_needle?_needle.hi:rawHi,fLo=_needle?_needle.lo:rawLo;\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,\n"
    "        level:level,rawScore:ex,hi:fHi,lo:fLo,mid:(fHi+fLo)/2,\n"
    "        dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta,hvsOnly:hvsOnly,\n"
    "        rawHi:rawHi,rawLo:rawLo,\n"
    "        needleHi:_needle?_needle.hi:null,\n"
    "        needleLo:_needle?_needle.lo:null,\n"
    "        needleMid:_needle?_needle.mid:null,\n"
    "        needlePoc:_needle?_needle.poc:null,\n"
    "        needleSource:_needle?_needle.source:'none',\n"
    "        needleVolPct:_needle?_needle.volPct:0,\n"
    "        needleConfidence:_needle?_needle.confidence:0});",
    1)

# ── 2. Merge inner block — usa campos planos, preserva melhor needle ───────────
OLD_MERGE = (
    "            var z2rHi=z2.rawHi||z2.hi,z2rLo=z2.rawLo||z2.lo;\n"
    "            var z1rHi=z.rawHi||z.hi,z1rLo=z.rawLo||z.lo;\n"
    "            z.rawHi=Math.max(z1rHi,z2rHi);z.rawLo=Math.min(z1rLo,z2rLo);\n"
    "            var z1s=z.level*10+(z.needleMeta?z.needleMeta.confidence||0:0);\n"
    "            var z2s=z2.level*10+(z2.needleMeta?z2.needleMeta.confidence||0:0);\n"
    "            if(z2s>z1s){\n"
    "              z.level=z2.level;z.rawScore=z2.rawScore;\n"
    "              z.hi=z2.hi;z.lo=z2.lo;z.mid=z2.mid;z.needleMeta=z2.needleMeta;\n"
    "            }\n"
    "            z.vol=Math.max(z.vol,z2.vol);"
)
assert OLD_MERGE in html, 'merge inner block anchor not found'
html = html.replace(OLD_MERGE,
    "            z.rawHi=Math.max(z.rawHi||z.hi,z2.rawHi||z2.hi);\n"
    "            z.rawLo=Math.min(z.rawLo||z.lo,z2.rawLo||z2.lo);\n"
    "            var z1s=(z.level||0)*10+(z.needleConfidence||0);\n"
    "            var z2s=(z2.level||0)*10+(z2.needleConfidence||0);\n"
    "            if(z2s>z1s){\n"
    "              z.level=z2.level;z.rawScore=z2.rawScore;\n"
    "              z.hi=z2.hi;z.lo=z2.lo;z.mid=z2.mid;\n"
    "              z.needleHi=z2.needleHi;z.needleLo=z2.needleLo;z.needleMid=z2.needleMid;\n"
    "              z.needlePoc=z2.needlePoc;z.needleSource=z2.needleSource;\n"
    "              z.needleVolPct=z2.needleVolPct;z.needleConfidence=z2.needleConfidence;\n"
    "            }\n"
    "            z.vol=Math.max(z.vol,z2.vol);",
    1)

# ── 3. Cache + debug console.table após recompute ─────────────────────────────
OLD_CACHE_COMPUTE = (
    "      _cache=_computeAll(cs,cfg,nestCs);_cKey=ck;\n"
    "      if(window.S)window.S.spikeZones=_cache.main;"
)
assert OLD_CACHE_COMPUTE in html, 'cache compute anchor not found'
html = html.replace(OLD_CACHE_COMPUTE,
    "      _cache=_computeAll(cs,cfg,nestCs);_cKey=ck;\n"
    "      if(window.S)window.S.spikeZones=_cache.main;\n"
    "      /* needle diagnostics — fires once per recompute when needleOn */\n"
    "      if(cfg.needleOn&&typeof console!=='undefined'&&console.table&&(_cache.main||[]).length){\n"
    "        try{console.table((_cache.main||[]).slice(0,10).map(function(z){\n"
    "          var rH=(z.rawHi||z.hi)-(z.rawLo||z.lo),fH=z.hi-z.lo;\n"
    "          var nH=z.needleHi!=null?z.needleHi-z.needleLo:null;\n"
    "          return{level:z.level,\n"
    "            rawH:rH.toFixed?rH.toFixed(4):rH,\n"
    "            finalH:fH.toFixed?fH.toFixed(4):fH,\n"
    "            needleH:nH!=null?(nH.toFixed?nH.toFixed(4):nH):'—',\n"
    "            reduced:nH!=null&&rH>0?(100*(1-nH/rH)).toFixed(1)+'%':'—',\n"
    "            needleSource:z.needleSource||'none',\n"
    "            confidence:(z.needleConfidence||0).toFixed?z.needleConfidence.toFixed(2):z.needleConfidence};\n"
    "        }));}catch(_){}\n"
    "      }",
    1)

# ── 4. Draw: drawHi/drawLo explícito + needleMinPx ────────────────────────────
OLD_DRAW_Y = (
    "      var y1=sc.y(z.hi),y2=sc.y(z.lo);\n"
    "      if(y1>=H||y2<=0)continue;\n"
    "      var boxH=Math.max(1,y2-y1);"
)
assert OLD_DRAW_Y in html, 'draw y1/y2 anchor not found'
html = html.replace(OLD_DRAW_Y,
    "      var drawHi=cfg.needleOn&&z.needleHi!=null?z.needleHi:z.hi;\n"
    "      var drawLo=cfg.needleOn&&z.needleLo!=null?z.needleLo:z.lo;\n"
    "      var y1=sc.y(drawHi),y2=sc.y(drawLo);\n"
    "      /* needleMinPx: garante altura mínima visível em pixels */\n"
    "      if(cfg.needleOn&&z.needleHi!=null&&cfg.needleMinPx>0&&(y2-y1)<cfg.needleMinPx){\n"
    "        var _yc=(y1+y2)/2;y1=_yc-cfg.needleMinPx/2;y2=_yc+cfg.needleMinPx/2;\n"
    "      }\n"
    "      if(y1>=H||y2<=0)continue;\n"
    "      var boxH=Math.max(1,y2-y1);",
    1)

# ── 5. _needleFactor: usa campo plano needleHi ────────────────────────────────
OLD_FACTOR = "      var _needleFactor=z.needleMeta?1.85:1.0;"
assert OLD_FACTOR in html, '_needleFactor anchor not found'
html = html.replace(OLD_FACTOR,
    "      /* needle zones: fill mais forte (área menor, precisa de mais contraste) */\n"
    "      var _needleFactor=cfg.needleOn&&z.needleHi!=null?1.85:1.0;",
    1)

# ── 6. Label: usa campo plano needleSource ────────────────────────────────────
OLD_LABEL = (
    "        if(z.needleMeta)parts.push(z.needleMeta.source==='footprint'?'FP':'N');"
)
assert OLD_LABEL in html, 'label needleMeta anchor not found'
html = html.replace(OLD_LABEL,
    "        if(cfg.needleOn&&z.needleHi!=null)parts.push(z.needleSource==='footprint'?'FP':'N');",
    1)

# ── 7. Debug visual: contorno ciano em needle zones (window.__szDbgNeedle) ──────
# Inserir depois do bloco de labels, antes do fechamento do main loop (antes de "/* ══ NESTED ══ */")
OLD_NESTED_COMMENT = "    /* ══ NESTED ZONES ══ */"
assert OLD_NESTED_COMMENT in html, 'nested zones comment anchor not found'
html = html.replace(OLD_NESTED_COMMENT,
    "    /* debug needle: contorno ciano — ativar com: window.__szDbgNeedle=true */\n"
    "    if(window.__szDbgNeedle){\n"
    "      for(var _dzi=0;_dzi<main.length;_dzi++){\n"
    "        var _dz=main[_dzi];\n"
    "        if(!cfg.needleOn||_dz.needleHi==null)continue;\n"
    "        var _dy1=sc.y(_dz.needleHi),_dy2=sc.y(_dz.needleLo);\n"
    "        if(_dy1>=H||_dy2<=0)continue;\n"
    "        var _dxL=usingMTF?_xByTs(_dz.srcTs):Math.max(0,x(_dz.srcIdx)-bwPx*0.5);\n"
    "        ctx.save();\n"
    "        ctx.lineWidth=1.5;ctx.setLineDash([3,3]);\n"
    "        ctx.strokeStyle='rgba(0,220,255,0.75)';\n"
    "        ctx.strokeRect(_dxL,_dy1,xR-_dxL,Math.max(2,_dy2-_dy1));\n"
    "        ctx.restore();\n"
    "      }\n"
    "    }\n\n"
    "    /* ══ NESTED ZONES ══ */",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_163.py applied — Beta 0.163')
print('  Fluxo needle corrigido:')
print('  1. campos planos needleHi/needleLo/needleSource/needleConfidence (sem needleMeta)')
print('  2. needle aplica a TODOS os sources (sem exclusao hvsOnly)')
print('  3. draw usa drawHi/drawLo explícito — nunca hi/lo bruto quando needle ativo')
print('  4. needleMinPx aplicado em pixels no draw (mínimo visível garantido)')
print('  5. merge: needleConfidence (campo plano) + copia todos campos needle')
print('  6. _needleFactor usa needleHi!=null (campo plano, sem needleMeta)')
print('  7. label usa needleSource (campo plano)')
print('  8. console.table de diagnóstico (fires ao recomputar com needleOn)')
print('  9. window.__szDbgNeedle=true → contorno ciano nas needle zones')
