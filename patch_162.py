#!/usr/bin/env python3
"""patch_162.py — Beta 0.162: Needle Volume Zone Refinement para Spike Zones
   A fonte (body/wick_dom/full/hvs) define a área bruta de busca.
   _refineToNeedleZone() localiza a máxima concentração de volume dentro dela.
   A zona desenhada é sempre a zona agulha — estreita, precisa, alta confiança.

   Novos inputs: szNeedleOn, szNeedleCapture, szNeedleMinAtr, szNeedleMaxAtr,
                 szNeedleMinPx, szNeedlePreferFP, szNeedleEstimate,
                 szShowRawGhost, szRawGhostOp
   Novas funções: _needleFromFP, _needleEstimate, _refineToNeedleZone
   Merge: usa raw bounds para detecção de sobreposição; preserva melhor agulha
   Draw: zona agulha como principal; ghost opcional da zona bruta
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.161') >= 10, 'Beta 0.161 not found'
html = html.replace('Beta 0.161', 'Beta 0.162')

# ── 1. Settings panel: add NEEDLE ZONE section before the hint ────────────────
OLD_SZ_HINT = (
    '            <div class="hint">Spike Zones detecta candles com spike de volume/range, '
    'cria zonas L1–L5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). '
    'Labels centralizados dentro das zonas.</div>\n'
    '          </div>'
)
assert OLD_SZ_HINT in html, 'Spike Zones hint anchor not found'
html = html.replace(OLD_SZ_HINT,
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#00d7ff;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">NEEDLE ZONE (refinamento)</div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Needle On</span>'
    '<input type="checkbox" id="szNeedleOn" checked style="width:14px;height:14px;accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Capture %</span>'
    '<input class="num" id="szNeedleCapture" type="number" min="0.05" max="0.60" step="0.01" value="0.22" style="width:52px">'
    '<span style="font-size:9px;color:#5a7090;margin-left:4px">fp</span></div>\n'
    '            <div class="kv"><span class="k">Min ATR×</span>'
    '<input class="num" id="szNeedleMinAtr" type="number" min="0.005" max="0.5" step="0.005" value="0.03" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Max ATR×</span>'
    '<input class="num" id="szNeedleMaxAtr" type="number" min="0.01" max="1.0" step="0.01" value="0.18" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Min Px</span>'
    '<input class="num" id="szNeedleMinPx" type="number" min="1" max="20" step="1" value="2" style="width:52px"></div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Preferir Footprint</span>'
    '<input type="checkbox" id="szNeedlePreferFP" checked style="width:14px;height:14px;accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Fallback Estimado</span>'
    '<input type="checkbox" id="szNeedleEstimate" checked style="width:14px;height:14px;accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Ghost Zona Bruta</span>'
    '<input type="checkbox" id="szShowRawGhost" style="width:14px;height:14px;accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Ghost Opacity</span>'
    '<input class="num" id="szRawGhostOp" type="number" min="0.01" max="0.30" step="0.01" value="0.05" style="width:52px"></div>\n'
    '            <div class="hint">Spike Zones detecta candles com spike de volume/range, '
    'cria zonas L1–L5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). '
    'Labels centralizados dentro das zonas.</div>\n'
    '          </div>',
    1)

# ── 2. _cfg(): add needle params after sourceOpacity ─────────────────────────
OLD_CFG_END = (
    "      fillOpacity:   clp(nv('szFillOpacity',0.16),0.01,1),\n"
    "      borderOpacity: clp(nv('szBorderOpacity',0.70),0.01,1),\n"
    "      sourceOpacity: clp(nv('szSourceOpacity',0.65),0.01,1)\n"
    "    };\n"
    "  }"
)
assert OLD_CFG_END in html, '_cfg() end anchor not found'
html = html.replace(OLD_CFG_END,
    "      fillOpacity:   clp(nv('szFillOpacity',0.16),0.01,1),\n"
    "      borderOpacity: clp(nv('szBorderOpacity',0.70),0.01,1),\n"
    "      sourceOpacity: clp(nv('szSourceOpacity',0.65),0.01,1),\n"
    "      needleOn:    bv('szNeedleOn',true),\n"
    "      needleCapt:  clp(nv('szNeedleCapture',0.22),0.05,0.60),\n"
    "      needleMinA:  clp(nv('szNeedleMinAtr',0.03),0.005,0.5),\n"
    "      needleMaxA:  clp(nv('szNeedleMaxAtr',0.18),0.01,1.0),\n"
    "      needleMinPx: clp(nv('szNeedleMinPx',2),1,20),\n"
    "      needleFP:    bv('szNeedlePreferFP',true),\n"
    "      needleEst:   bv('szNeedleEstimate',true),\n"
    "      showGhost:   bv('szShowRawGhost',false),\n"
    "      ghostOp:     clp(nv('szRawGhostOp',0.05),0.01,0.30)\n"
    "    };\n"
    "  }",
    1)

# ── 3. Inject needle functions before _detectAndBuild ─────────────────────────
OLD_DETECT_COMMENT = (
    "  /* ── Core spike detection (works for main and nested) ── */\n"
    "  function _detectAndBuild(cs, baseOffset, fullCs, cfg, isNested){"
)
assert OLD_DETECT_COMMENT in html, '_detectAndBuild comment anchor not found'

NEEDLE_FUNCTIONS = (
    "  /* ── Needle Volume Zone Refinement ── */\n"
    "\n"
    "  /* Try footprint data: expand from POC until capturing needleCapt% of zone volume */\n"
    "  function _needleFromFP(c,cfg,rawHi,rawLo){\n"
    "    var fp=c.fp;if(!fp||fp.size<2)return null;\n"
    "    var entries=[];\n"
    "    fp.forEach(function(vd,p){\n"
    "      p=+p;if(p<rawLo||p>rawHi)return;\n"
    "      var v=vd&&typeof vd==='object'?(+(vd.buy||0)+(+vd.sell||0)):+vd||0;\n"
    "      if(v>0)entries.push({p:p,v:v});\n"
    "    });\n"
    "    if(entries.length<2)return null;\n"
    "    entries.sort(function(a,b){return a.p-b.p;});\n"
    "    var tot=entries.reduce(function(s,e){return s+e.v;},0);if(!tot)return null;\n"
    "    var pi=0;for(var k=1;k<entries.length;k++)if(entries[k].v>entries[pi].v)pi=k;\n"
    "    var poc=entries[pi].p,cv=entries[pi].v,lo_=pi,hi_=pi;\n"
    "    while(cv/tot<cfg.needleCapt){\n"
    "      var aL=lo_>0?entries[lo_-1].v:0,aH=hi_<entries.length-1?entries[hi_+1].v:0;\n"
    "      if(!aL&&!aH)break;\n"
    "      if(aL>=aH&&lo_>0){lo_--;cv+=entries[lo_].v;}\n"
    "      else if(hi_<entries.length-1){hi_++;cv+=entries[hi_].v;}\n"
    "      else if(lo_>0){lo_--;cv+=entries[lo_].v;}else break;\n"
    "    }\n"
    "    var nLo=entries[lo_].p,nHi=entries[hi_].p;\n"
    "    if(nHi<=nLo){var m=(nHi+nLo)/2;nHi=m*(1+1e-4);nLo=m*(1-1e-4);}\n"
    "    return{hi:nHi,lo:nLo,mid:(nHi+nLo)/2,poc:poc,source:'footprint',volPct:cv/tot,\n"
    "      confidence:Math.min(1,0.6+cv/tot*0.4)};\n"
    "  }\n"
    "\n"
    "  /* Estimate needle from OHLCV: score body/upper-wick/lower-wick regions */\n"
    "  function _needleEstimate(c,at,cfg,rawHi,rawLo){\n"
    "    var range=c.h-c.l;if(range<1e-12||at<1e-12)return null;\n"
    "    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),bR=bHi-bLo;\n"
    "    var uw=c.h-bHi,lw=bLo-c.l;\n"
    "    var isBull=c.c>=c.o,isDoji=bR<range*0.08;\n"
    "    function intersect(aLo,aHi,bLo2,bHi2){var iLo=Math.max(aLo,bLo2),iHi=Math.min(aHi,bHi2);return iHi>iLo?{lo:iLo,hi:iHi,mid:(iLo+iHi)/2}:null;}\n"
    "    var regions=[];\n"
    "    /* body */\n"
    "    var bodyInt=bR>0?intersect(bLo,bHi,rawLo,rawHi):null;\n"
    "    if(bodyInt){\n"
    "      var sc2=(bodyInt.hi-bodyInt.lo)/range*1.15+(isDoji?0.30:0);\n"
    "      sc2+=(1-Math.abs(bodyInt.mid-c.c)/range)*0.20;\n"
    "      regions.push({lo:bodyInt.lo,hi:bodyInt.hi,mid:bodyInt.mid,score:sc2,poc:c.c});\n"
    "    }\n"
    "    /* upper wick */\n"
    "    var uwInt=uw>0?intersect(bHi,c.h,rawLo,rawHi):null;\n"
    "    if(uwInt){\n"
    "      var sc2=(uwInt.hi-uwInt.lo)/range*(isBull?0.45:1.70);\n"
    "      if(uw>bR*2)sc2+=0.35;if(!isBull&&uw>range*0.4)sc2+=0.20;\n"
    "      regions.push({lo:uwInt.lo,hi:uwInt.hi,mid:uwInt.mid,score:sc2,poc:c.h-uw*0.25});\n"
    "    }\n"
    "    /* lower wick */\n"
    "    var lwInt=lw>0?intersect(c.l,bLo,rawLo,rawHi):null;\n"
    "    if(lwInt){\n"
    "      var sc2=(lwInt.hi-lwInt.lo)/range*(isBull?1.70:0.45);\n"
    "      if(lw>bR*2)sc2+=0.35;if(isBull&&lw>range*0.4)sc2+=0.20;\n"
    "      regions.push({lo:lwInt.lo,hi:lwInt.hi,mid:lwInt.mid,score:sc2,poc:c.l+lw*0.25});\n"
    "    }\n"
    "    if(!regions.length)return null;\n"
    "    regions.sort(function(a,b){return b.score-a.score;});\n"
    "    var best=regions[0];\n"
    "    var hH=Math.max(at*cfg.needleMinA*0.5,(best.hi-best.lo)*0.4);\n"
    "    hH=Math.min(hH,at*(cfg.needleMinA+cfg.needleMaxA)/4);\n"
    "    var center=Math.max(best.lo,Math.min(best.hi,best.poc));\n"
    "    var nHi=Math.min(center+hH,rawHi),nLo=Math.max(center-hH,rawLo);\n"
    "    if(nHi<=nLo){nHi=best.hi;nLo=best.lo;}\n"
    "    return{hi:nHi,lo:nLo,mid:(nHi+nLo)/2,poc:center,source:'estimated',volPct:best.score,\n"
    "      confidence:Math.min(0.75,0.25+best.score*0.50)};\n"
    "  }\n"
    "\n"
    "  /* Combine: footprint > estimate; apply ATR min/max; clamp to raw zone */\n"
    "  function _refineToNeedleZone(c,at,cfg,rawHi,rawLo){\n"
    "    var r=null;\n"
    "    if(cfg.needleFP)r=_needleFromFP(c,cfg,rawHi,rawLo);\n"
    "    if(!r&&cfg.needleEst)r=_needleEstimate(c,at,cfg,rawHi,rawLo);\n"
    "    if(!r)return null;\n"
    "    r.hi=Math.min(r.hi,rawHi);r.lo=Math.max(r.lo,rawLo);\n"
    "    var h=r.hi-r.lo;\n"
    "    var minH=at*cfg.needleMinA,maxH=at*cfg.needleMaxA;\n"
    "    if(h<minH){var m=(r.hi+r.lo)/2;r.hi=Math.min(m+minH/2,rawHi);r.lo=Math.max(m-minH/2,rawLo);}\n"
    "    if(h>maxH){var m=(r.hi+r.lo)/2;r.hi=Math.min(m+maxH/2,rawHi);r.lo=Math.max(m-maxH/2,rawLo);}\n"
    "    if(r.hi<=r.lo){var m=(rawHi+rawLo)/2;r.hi=m+minH/2;r.lo=m-minH/2;}\n"
    "    r.mid=(r.hi+r.lo)/2;\n"
    "    return r;\n"
    "  }\n"
    "\n"
    "  /* ── Core spike detection (works for main and nested) ── */\n"
    "  function _detectAndBuild(cs, baseOffset, fullCs, cfg, isNested){"
)
html = html.replace(OLD_DETECT_COMMENT, NEEDLE_FUNCTIONS, 1)

# ── 4. _detectAndBuild: add needle refinement before candidates.push ──────────
OLD_CAND_PUSH = (
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,"
    "level:level,rawScore:ex,hi:hi,lo:lo,mid:(hi+lo)/2,"
    "dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta,hvsOnly:hvsOnly});"
)
assert OLD_CAND_PUSH in html, 'candidates.push anchor not found'
html = html.replace(OLD_CAND_PUSH,
    "      var rawHi=hi,rawLo=lo,needleMeta=null;\n"
    "      if(cfg.needleOn&&!hvsOnly){\n"
    "        needleMeta=_refineToNeedleZone(c,at,cfg,rawHi,rawLo);\n"
    "        if(needleMeta){hi=needleMeta.hi;lo=needleMeta.lo;}\n"
    "      }\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,"
    "level:level,rawScore:ex,hi:hi,lo:lo,mid:(hi+lo)/2,"
    "dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta,hvsOnly:hvsOnly,"
    "rawHi:rawHi,rawLo:rawLo,needleMeta:needleMeta});",
    1)

# ── 5. Merge: use raw bounds for overlap, preserve best needle ─────────────────
OLD_MERGE_HI_LO = (
    "            if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}\n"
    "            z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);"
    "z.mid=(z.hi+z.lo)/2;z.vol=Math.max(z.vol,z2.vol);"
)
assert OLD_MERGE_HI_LO in html, 'merge hi/lo anchor not found'
html = html.replace(OLD_MERGE_HI_LO,
    "            var z2rHi=z2.rawHi||z2.hi,z2rLo=z2.rawLo||z2.lo;\n"
    "            var z1rHi=z.rawHi||z.hi,z1rLo=z.rawLo||z.lo;\n"
    "            z.rawHi=Math.max(z1rHi,z2rHi);z.rawLo=Math.min(z1rLo,z2rLo);\n"
    "            var z1s=z.level*10+(z.needleMeta?z.needleMeta.confidence||0:0);\n"
    "            var z2s=z2.level*10+(z2.needleMeta?z2.needleMeta.confidence||0:0);\n"
    "            if(z2s>z1s){\n"
    "              z.level=z2.level;z.rawScore=z2.rawScore;\n"
    "              z.hi=z2.hi;z.lo=z2.lo;z.mid=z2.mid;z.needleMeta=z2.needleMeta;\n"
    "            }\n"
    "            z.vol=Math.max(z.vol,z2.vol);",
    1)

# ── 6. Merge overlap check: use raw bounds ─────────────────────────────────────
# The overlap check currently uses z2.lo/z2.hi — update to use raw zone
OLD_OVERLAP_CHECK = (
    "          if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){"
)
assert OLD_OVERLAP_CHECK in html, 'overlap check anchor not found'
html = html.replace(OLD_OVERLAP_CHECK,
    "          var _z2rHi=z2.rawHi||z2.hi,_z2rLo=z2.rawLo||z2.lo;\n"
    "          var _z1rHi=z.rawHi||z.hi,_z1rLo=z.rawLo||z.lo;\n"
    "          if(_z2rLo<=_z1rHi+mt&&_z2rHi>=_z1rLo-mt){",
    1)

# ── 7. Cache key: add needle params ───────────────────────────────────────────
OLD_CACHE_KEY_END = (
    "            cfg.spacingOn,cfg.spacingAtr,cfg.spacingHeight,"
    "cfg.spacingTicks,cfg.spacingMtfMult].join('|');"
)
assert OLD_CACHE_KEY_END in html, 'cache key end anchor not found'
html = html.replace(OLD_CACHE_KEY_END,
    "            cfg.spacingOn,cfg.spacingAtr,cfg.spacingHeight,"
    "cfg.spacingTicks,cfg.spacingMtfMult,\n"
    "            cfg.needleOn?1:0,cfg.needleCapt,cfg.needleMinA,cfg.needleMaxA,"
    "cfg.needleFP?1:0,cfg.needleEst?1:0].join('|');",
    1)

# ── 8. Draw: ghost zone + stronger fill for needle zones ──────────────────────
# Add ghost and needle factor just before the "/* ── opacity from user config ── */" line
OLD_OPAC_COMMENT = (
    "      /* ── opacity from user config ── */\n"
    "      var fillOp=cfg.fillOpacity,strOp=cfg.borderOpacity;"
)
assert OLD_OPAC_COMMENT in html, 'opacity comment anchor not found'
html = html.replace(OLD_OPAC_COMMENT,
    "      /* ghost zone (raw zone before needle refinement) */\n"
    "      if(cfg.showGhost&&z.rawHi&&z.rawLo&&z.rawHi>z.rawLo){\n"
    "        var gy1=sc.y(z.rawHi),gy2=sc.y(z.rawLo);\n"
    "        if(gy1<H&&gy2>0){\n"
    "          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(cfg.ghostOp).toFixed(3)+')';\n"
    "          ctx.fillRect(xL,gy1,xR-xL,Math.max(1,gy2-gy1));\n"
    "          ctx.lineWidth=0.5;ctx.setLineDash([1,4]);\n"
    "          ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(cfg.ghostOp*2.5).toFixed(3)+')';\n"
    "          ctx.beginPath();ctx.moveTo(xL,gy1);ctx.lineTo(xR,gy1);\n"
    "          ctx.moveTo(xL,gy2);ctx.lineTo(xR,gy2);ctx.stroke();\n"
    "          ctx.setLineDash([]);\n"
    "        }\n"
    "      }\n"
    "      /* needle zone gets stronger fill since area is much narrower */\n"
    "      var _needleFactor=z.needleMeta?1.85:1.0;\n"
    "      /* ── opacity from user config ── */\n"
    "      var fillOp=Math.min(0.98,cfg.fillOpacity*_needleFactor),"
    "strOp=Math.min(0.98,cfg.borderOpacity*Math.min(1,_needleFactor*0.80));",
    1)

# ── 9. Labels: add NEEDLE/FP/EST tags ─────────────────────────────────────────
OLD_LABEL_PARTS = (
    "        if(z.hvsMeta&&z.hvsMeta.source!=='fallback')"
    "parts.push(z.hvsMeta.source==='footprint'?'HV':'~HV');"
)
assert OLD_LABEL_PARTS in html, 'label parts anchor not found'
html = html.replace(OLD_LABEL_PARTS,
    "        if(z.hvsMeta&&z.hvsMeta.source!=='fallback')"
    "parts.push(z.hvsMeta.source==='footprint'?'HV':'~HV');\n"
    "        if(z.needleMeta)parts.push(z.needleMeta.source==='footprint'?'FP':'N');",
    1)

# ── 10. SZ_IDS: add new IDs ───────────────────────────────────────────────────
OLD_SZ_IDS_END = (
    "  'szFillOpacity','szBorderOpacity','szSourceOpacity'\n"
    "  ]);"
)
assert OLD_SZ_IDS_END in html, 'SZ_IDS end anchor not found'
html = html.replace(OLD_SZ_IDS_END,
    "  'szFillOpacity','szBorderOpacity','szSourceOpacity',\n"
    "  'szNeedleOn','szNeedleCapture','szNeedleMinAtr','szNeedleMaxAtr','szNeedleMinPx',\n"
    "  'szNeedlePreferFP','szNeedleEstimate','szShowRawGhost','szRawGhostOp'\n"
    "  ]);",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_162.py applied — Beta 0.162')
print('  Needle Volume Zone Refinement:')
print('  - _needleFromFP: usa footprint real (POC + expansão até needleCapt% do vol)')
print('  - _needleEstimate: OHLCV scoring por região (body/upper wick/lower wick)')
print('  - _refineToNeedleZone: combina os dois, aplica limites ATR min/max')
print('  - _detectAndBuild: guarda rawHi/rawLo + chama needle para hi/lo final')
print('  - Merge: usa raw bounds para detecção de sobreposição, preserva melhor agulha')
print('  - Cache key atualizado com parâmetros needle')
print('  - Draw: ghost zone (opcional) + fill 1.85x mais forte para needle')
print('  - Labels: FP (footprint real) ou N (estimado)')
print('  - SZ_IDS: novos IDs adicionados')
