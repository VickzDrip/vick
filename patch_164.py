#!/usr/bin/env python3
"""patch_164.py — Beta 0.164: Needle = miolo interno, não substituto da zona

Correção conceitual crítica:
  - Zona principal (z.hi/z.lo) = fonte original (body/wick/full/hvs) — desenhada normalmente
  - Needle (z.needleHi/z.needleLo) = faixa fina desenhada DENTRO da zona principal
  - Needle nunca substitui a zona; é o núcleo volumétrico interno

Novo input: szNeedleMode
  "inside" (default) — zona principal + miolo interno
  "only"             — zona principal muito transparente + miolo em destaque
  "off"              — desativa needle

_needleScore(): score robusto para preservar melhor needle no merge
Merge: expande zona principal normalmente, preserva melhor needle por score
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.163') >= 10, 'Beta 0.163 not found'
html = html.replace('Beta 0.163', 'Beta 0.164')

# ── 1. candidates.push — z.hi/z.lo = zona principal (rawHi/rawLo) ─────────────
OLD_CAND = (
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
    "        needleConfidence:_needle?_needle.confidence:0});"
)
assert OLD_CAND in html, 'candidates.push anchor not found'
html = html.replace(OLD_CAND,
    "      var rawHi=hi,rawLo=lo;\n"
    "      var _needle=cfg.needleOn?_refineToNeedleZone(c,at,cfg,rawHi,rawLo):null;\n"
    "      /* z.hi/z.lo = zona principal (fonte bruta); needle = miolo separado */\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,\n"
    "        level:level,rawScore:ex,hi:rawHi,lo:rawLo,mid:(rawHi+rawLo)/2,\n"
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

# ── 2. _needleScore antes de _detectAndBuild ──────────────────────────────────
OLD_DETECT_HDR = (
    "    r.mid=(r.hi+r.lo)/2;\n"
    "    return r;\n"
    "  }\n"
    "\n"
    "  /* ── Core spike detection (works for main and nested) ── */\n"
    "  function _detectAndBuild(cs, baseOffset, fullCs, cfg, isNested){"
)
assert OLD_DETECT_HDR in html, '_detectAndBuild header anchor not found'
html = html.replace(OLD_DETECT_HDR,
    "    r.mid=(r.hi+r.lo)/2;\n"
    "    return r;\n"
    "  }\n"
    "\n"
    "  /* Score para selecionar melhor needle durante merge */\n"
    "  function _needleScore(z){\n"
    "    return (z.needleSource==='footprint'?10000000:0)\n"
    "      +((z.level||0)*100000)\n"
    "      +((z.rawScore||0)*1000)\n"
    "      +((z.vol||0)/1000)\n"
    "      +((z.needleConfidence||0)*5000)\n"
    "      +((z.needleVolPct||0)*2000);\n"
    "  }\n"
    "\n"
    "  /* ── Core spike detection (works for main and nested) ── */\n"
    "  function _detectAndBuild(cs, baseOffset, fullCs, cfg, isNested){",
    1)

# ── 3. Merge — zona principal expande normal, melhor needle por _needleScore ───
OLD_MERGE = (
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
    "            z.vol=Math.max(z.vol,z2.vol);"
)
assert OLD_MERGE in html, 'merge block anchor not found'
html = html.replace(OLD_MERGE,
    "            /* zona principal: expande normalmente */\n"
    "            z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;\n"
    "            z.rawHi=Math.max(z.rawHi||z.hi,z2.rawHi||z2.hi);\n"
    "            z.rawLo=Math.min(z.rawLo||z.lo,z2.rawLo||z2.lo);\n"
    "            if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}\n"
    "            /* needle: preserva melhor por _needleScore */\n"
    "            if(_needleScore(z2)>_needleScore(z)){\n"
    "              z.needleHi=z2.needleHi;z.needleLo=z2.needleLo;z.needleMid=z2.needleMid;\n"
    "              z.needlePoc=z2.needlePoc;z.needleSource=z2.needleSource;\n"
    "              z.needleVolPct=z2.needleVolPct;z.needleConfidence=z2.needleConfidence;\n"
    "            }\n"
    "            z.vol=Math.max(z.vol,z2.vol);",
    1)

# ── 4. Draw: restaura y1/y2 da zona principal ─────────────────────────────────
OLD_DRAW_Y = (
    "      var drawHi=cfg.needleOn&&z.needleHi!=null?z.needleHi:z.hi;\n"
    "      var drawLo=cfg.needleOn&&z.needleLo!=null?z.needleLo:z.lo;\n"
    "      var y1=sc.y(drawHi),y2=sc.y(drawLo);\n"
    "      /* needleMinPx: garante altura mínima visível em pixels */\n"
    "      if(cfg.needleOn&&z.needleHi!=null&&cfg.needleMinPx>0&&(y2-y1)<cfg.needleMinPx){\n"
    "        var _yc=(y1+y2)/2;y1=_yc-cfg.needleMinPx/2;y2=_yc+cfg.needleMinPx/2;\n"
    "      }\n"
    "      if(y1>=H||y2<=0)continue;\n"
    "      var boxH=Math.max(1,y2-y1);"
)
assert OLD_DRAW_Y in html, 'draw y1/y2 anchor not found'
html = html.replace(OLD_DRAW_Y,
    "      var y1=sc.y(z.hi),y2=sc.y(z.lo);\n"
    "      if(y1>=H||y2<=0)continue;\n"
    "      var boxH=Math.max(1,y2-y1);",
    1)

# ── 5. Opacidade — remove _needleFactor + adiciona lógica needleMode ──────────
OLD_FACTOR = (
    "      /* needle zone gets stronger fill since area is much narrower */\n"
    "      /* needle zones: fill mais forte (área menor, precisa de mais contraste) */\n"
    "      var _needleFactor=cfg.needleOn&&z.needleHi!=null?1.85:1.0;\n"
    "      /* ── opacity from user config ── */\n"
    "      var fillOp=Math.min(0.98,cfg.fillOpacity*_needleFactor),"
    "strOp=Math.min(0.98,cfg.borderOpacity*Math.min(1,_needleFactor*0.80));\n"
    "      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}\n"
    "      else if(z.status==='tested'){fillOp*=0.76;strOp*=0.76;}"
)
assert OLD_FACTOR in html, '_needleFactor anchor not found'
html = html.replace(OLD_FACTOR,
    "      /* ── opacity from user config ── */\n"
    "      var fillOp=cfg.fillOpacity,strOp=cfg.borderOpacity;\n"
    "      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}\n"
    "      else if(z.status==='tested'){fillOp*=0.76;strOp*=0.76;}\n"
    "      /* 'only' mode: zona principal vira fundo quase invisível */\n"
    "      var _nMode=cfg.needleOn?(cfg.needleMode||'inside'):'off';\n"
    "      if(_nMode==='only'&&z.needleHi!=null){\n"
    "        fillOp*=0.12;strOp*=0.20;\n"
    "      }",
    1)

# ── 6. Needle inner band após glow, antes dos labels ──────────────────────────
OLD_GLOW_LABEL = (
    "      /* glow for fresh L3+ recent zones */\n"
    "      if(z.status==='fresh'&&z.level>=3&&recency>0.5){\n"
    "        ctx.save();\n"
    "        ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.55)';ctx.shadowBlur=5;\n"
    "        ctx.lineWidth=1;"
    "ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.5).toFixed(3)+')';\n"
    "        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();\n"
    "        ctx.restore();ctx.setLineDash([]);\n"
    "      }\n"
    "\n"
    "      /* label — perfectly centred (textBaseline=middle) */"
)
assert OLD_GLOW_LABEL in html, 'glow+label anchor not found'
html = html.replace(OLD_GLOW_LABEL,
    "      /* glow for fresh L3+ recent zones */\n"
    "      if(z.status==='fresh'&&z.level>=3&&recency>0.5){\n"
    "        ctx.save();\n"
    "        ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.55)';ctx.shadowBlur=5;\n"
    "        ctx.lineWidth=1;"
    "ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.5).toFixed(3)+')';\n"
    "        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();\n"
    "        ctx.restore();ctx.setLineDash([]);\n"
    "      }\n"
    "\n"
    "      /* ── Needle Volume Core — miolo interno de maior concentração ── */\n"
    "      if(_nMode!=='off'&&z.needleHi!=null&&z.needleLo!=null){\n"
    "        var ny1=sc.y(z.needleHi),ny2=sc.y(z.needleLo);\n"
    "        /* clamp dentro da zona principal */\n"
    "        ny1=Math.max(y1,Math.min(y2-1,ny1));\n"
    "        ny2=Math.min(y2,Math.max(y1+1,ny2));\n"
    "        /* altura mínima visual */\n"
    "        var _nMinPx=Math.max(2,cfg.needleMinPx||2);\n"
    "        if(ny2-ny1<_nMinPx){var _nc=(ny1+ny2)/2;\n"
    "          ny1=Math.max(y1,_nc-_nMinPx/2);ny2=Math.min(y2,_nc+_nMinPx/2);}\n"
    "        var _nH=Math.max(1,ny2-ny1);\n"
    "        /* fill do miolo — opacidade alta */\n"
    "        var _nFillOp=Math.min(0.98,cfg.fillOpacity*2.8);\n"
    "        var _nStrOp=Math.min(0.98,cfg.borderOpacity*1.6);\n"
    "        if(z.status==='weakened'){_nFillOp*=0.55;_nStrOp*=0.55;}\n"
    "        else if(z.status==='tested'){_nFillOp*=0.85;_nStrOp*=0.85;}\n"
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+_nFillOp.toFixed(3)+')';\n"
    "        ctx.fillRect(xL,ny1,xR-xL,_nH);\n"
    "        /* bordas top/bottom do miolo */\n"
    "        ctx.lineWidth=1;ctx.setLineDash([]);\n"
    "        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+_nStrOp.toFixed(3)+')';\n"
    "        ctx.beginPath();ctx.moveTo(xL,ny1);ctx.lineTo(xR,ny1);\n"
    "        ctx.moveTo(xL,ny2);ctx.lineTo(xR,ny2);ctx.stroke();\n"
    "        /* glow sutil no miolo se alta confiança */\n"
    "        if(z.needleConfidence>0.5&&z.status==='fresh'){\n"
    "          ctx.save();\n"
    "          ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.45)';ctx.shadowBlur=4;\n"
    "          ctx.lineWidth=1;\n"
    "          ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(_nStrOp*0.6).toFixed(3)+')';\n"
    "          ctx.beginPath();ctx.moveTo(xL,ny1);ctx.lineTo(xR,ny1);ctx.stroke();\n"
    "          ctx.restore();ctx.setLineDash([]);\n"
    "        }\n"
    "      }\n"
    "\n"
    "      /* label — perfectly centred (textBaseline=middle) */",
    1)

# ── 7. Settings UI: adiciona szNeedleMode select após szNeedleOn ───────────────
OLD_NEEDLE_ON_LABEL = (
    '            <label class="kv" style="cursor:pointer;"><span class="k">Needle On</span>'
    '<input type="checkbox" id="szNeedleOn" checked style="width:14px;height:14px;'
    'accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>'
)
assert OLD_NEEDLE_ON_LABEL in html, 'szNeedleOn label anchor not found'
html = html.replace(OLD_NEEDLE_ON_LABEL,
    '            <label class="kv" style="cursor:pointer;"><span class="k">Needle On</span>'
    '<input type="checkbox" id="szNeedleOn" checked style="width:14px;height:14px;'
    'accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Needle Mode</span>'
    '<select class="select tiny-select" id="szNeedleMode">'
    '<option value="inside" selected>Inside</option>'
    '<option value="only">Only</option>'
    '<option value="off">Off</option>'
    '</select></div>',
    1)

# ── 8. _cfg(): adiciona needleMode ────────────────────────────────────────────
OLD_CFG_GHOST = (
    "      showGhost:   bv('szShowRawGhost',false),\n"
    "      ghostOp:     clp(nv('szRawGhostOp',0.05),0.01,0.30)\n"
    "    };\n"
    "  }"
)
assert OLD_CFG_GHOST in html, '_cfg() ghostOp anchor not found'
html = html.replace(OLD_CFG_GHOST,
    "      showGhost:   bv('szShowRawGhost',false),\n"
    "      ghostOp:     clp(nv('szRawGhostOp',0.05),0.01,0.30),\n"
    "      needleMode:  sv('szNeedleMode','inside')\n"
    "    };\n"
    "  }",
    1)

# ── 9. SZ_IDS: adiciona szNeedleMode ─────────────────────────────────────────
OLD_SZ_IDS = (
    "  'szNeedleOn','szNeedleCapture','szNeedleMinAtr','szNeedleMaxAtr','szNeedleMinPx',\n"
    "  'szNeedlePreferFP','szNeedleEstimate','szShowRawGhost','szRawGhostOp'\n"
    "  ]);"
)
assert OLD_SZ_IDS in html, 'SZ_IDS anchor not found'
html = html.replace(OLD_SZ_IDS,
    "  'szNeedleOn','szNeedleCapture','szNeedleMinAtr','szNeedleMaxAtr','szNeedleMinPx',\n"
    "  'szNeedlePreferFP','szNeedleEstimate','szShowRawGhost','szRawGhostOp','szNeedleMode'\n"
    "  ]);",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_164.py applied — Beta 0.164')
print('  Correção conceitual:')
print('  - z.hi/z.lo = zona principal (fonte bruta) — inalterada')
print('  - z.needleHi/z.needleLo = miolo volumétrico DENTRO da zona')
print('  - Merge: zona principal expande normalmente; needle preserva melhor por _needleScore')
print('  - Draw: zona principal desenhada primeiro; needle desenhada por cima (inside)')
print('  - szNeedleMode: "inside" (default) | "only" | "off"')
print('    - inside: zona + miolo')
print('    - only: zona quase invisível (12% opacidade) + miolo em destaque')
print('    - off: desativa miolo')
print('  - Miolo: fill 2.8× mais opaco, clampado dentro dos pixels da zona')
print('  - needleMinPx: altura mínima do miolo em pixels')
print('  - _needleScore: footprint > level > rawScore > vol > confidence > volPct')
