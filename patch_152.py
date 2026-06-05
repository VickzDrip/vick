#!/usr/bin/env python3
"""patch_152.py — Beta 0.152: Spike Zones ATR Smart Spacing + HVS directional scoring
   1. _applyAtrSpacing(): post-detection filter — removes clusters, keeps best per region
   2. _hvsEstimate(): directional density scoring (bull=lowerWick, bear=upperWick)
   3. UI: ATR Smart Spacing checkbox + factor input added to settings panel
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.151') >= 10, 'Beta 0.151 not found'
html = html.replace('Beta 0.151', 'Beta 0.152')

# ── 1. UI: add ATR Smart Spacing controls after Merge row ────────────────────────
OLD_MERGE_ROW = '<div class="kv"><span class="k">Merge ATR×</span><input class="num" id="szMerge" type="number" min="0" max="1" step="0.05" value="0.15" style="width:56px"></div>'
assert OLD_MERGE_ROW in html, 'merge row anchor not found'
NEW_MERGE_ROW = (
    '<div class="kv"><span class="k">Merge ATR×</span>'
    '<input class="num" id="szMerge" type="number" min="0" max="1" step="0.05" value="0.15" style="width:56px"></div>\n'
    '            <label class="kv" style="cursor:pointer"><span class="k">ATR Smart Spacing</span>'
    '<input type="checkbox" id="szAtrSpacingOn" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>\n'
    '            <div class="kv"><span class="k">Spacing factor</span>'
    '<input class="num" id="szAtrSpacing" type="number" min="0.02" max="1.0" step="0.01" value="0.12" style="width:56px">'
    '<span style="font-size:9px;color:#5a7090;margin-left:4px">×ATR</span></div>'
)
html = html.replace(OLD_MERGE_ROW, NEW_MERGE_ROW, 1)

# ── 2. _cfg(): add atrSpacingEnabled + atrSpacing ────────────────────────────────
OLD_CFG_END = (
    "      hvsDomMin: clp(parseFloat(sv('szHvsDomMin','0.30'))||0.30,0.10,0.80),\n"
    "      hvsWidth:  sv('szHvsWidth','auto'),\n"
    "      hvsSens:   sv('szHvsSens','medium')\n"
    "    };\n"
    "  }"
)
assert OLD_CFG_END in html, '_cfg end anchor not found'
NEW_CFG_END = (
    "      hvsDomMin: clp(parseFloat(sv('szHvsDomMin','0.30'))||0.30,0.10,0.80),\n"
    "      hvsWidth:  sv('szHvsWidth','auto'),\n"
    "      hvsSens:   sv('szHvsSens','medium'),\n"
    "      atrSpacingEnabled: bv('szAtrSpacingOn',true),\n"
    "      atrSpacing: clp(nv('szAtrSpacing',0.12),0.02,1.0)\n"
    "    };\n"
    "  }"
)
html = html.replace(OLD_CFG_END, NEW_CFG_END, 1)

# ── 3. _hvsEstimate(): directional density scoring ───────────────────────────────
OLD_HVS_EST = (
    "  function _hvsEstimate(c,at,cfg){\n"
    "    /* Heuristic estimation when no footprint */\n"
    "    var range=c.h-c.l;if(range<1e-12)return null;\n"
    "    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),bR=bHi-bLo;\n"
    "    var uw=c.h-bHi,lw=bLo-c.l;\n"
    "    var bPct=bR/range,uwPct=uw/range,lwPct=lw/range;\n"
    "    var sens=cfg.hvsSens||'medium';\n"
    "    var wickCapture=sens==='high'?0.42:sens==='low'?0.68:0.54;\n"
    "    var loc,hi,lo,poc;\n"
    "    if(bPct>0.40){\n"
    "      loc='body';poc=c.c;\n"
    "      var hw=Math.max(bR*0.55,at*0.04);\n"
    "      hi=Math.min(c.h,poc+hw);lo=Math.max(c.l,poc-hw);\n"
    "    }else if(uwPct>lwPct&&uwPct>0.28){\n"
    "      loc='upperWick';hi=c.h;lo=c.h-uw*wickCapture;poc=(hi+lo)/2;\n"
    "    }else if(lwPct>uwPct&&lwPct>0.28){\n"
    "      loc='lowerWick';lo=c.l;hi=c.l+lw*wickCapture;poc=(hi+lo)/2;\n"
    "    }else{\n"
    "      loc='body';hi=bHi;lo=bLo;poc=(hi+lo)/2;\n"
    "      if(hi<=lo){hi=poc+at*0.08;lo=poc-at*0.08;}\n"
    "    }\n"
    "    var vPct=Math.max(bPct,uwPct,lwPct);\n"
    "    return{hi:hi,lo:lo,pocPrice:poc||((hi+lo)/2),location:loc,source:'estimated',volPct:vPct};\n"
    "  }"
)
assert OLD_HVS_EST in html, '_hvsEstimate anchor not found'
NEW_HVS_EST = (
    "  function _hvsEstimate(c,at,cfg){\n"
    "    /* Directional density scoring: bull spike -> lower wick/body absorbs buying;\n"
    "       bear spike -> upper wick/body absorbs selling. Score each region and pick best. */\n"
    "    var range=c.h-c.l;if(range<1e-12)return null;\n"
    "    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),bR=bHi-bLo;\n"
    "    var uw=c.h-bHi,lw=bLo-c.l;\n"
    "    var bPct=bR/range,uwPct=uw/range,lwPct=lw/range;\n"
    "    var sens=cfg.hvsSens||'medium';\n"
    "    var wickCapture=sens==='high'?0.42:sens==='low'?0.68:0.54;\n"
    "    var isBull=c.c>=c.o;\n"
    "    /* body always has baseline volume; wicks weighted by candle direction */\n"
    "    var bScore=bPct*1.10;\n"
    "    var uwScore=uwPct>0.12?uwPct*(isBull?0.70:1.50):0; /* bear: upper wick = distribution vol */\n"
    "    var lwScore=lwPct>0.12?lwPct*(isBull?1.50:0.70):0; /* bull: lower wick = absorption vol  */\n"
    "    var loc,hi,lo,poc;\n"
    "    if(bScore>=uwScore&&bScore>=lwScore){\n"
    "      loc='body';poc=c.c;\n"
    "      var hw=Math.max(bR*0.55,at*0.04);\n"
    "      hi=Math.min(c.h,poc+hw);lo=Math.max(c.l,poc-hw);\n"
    "    }else if(uwScore>=lwScore){\n"
    "      loc='upperWick';hi=c.h;lo=c.h-uw*wickCapture;poc=(hi+lo)/2;\n"
    "    }else{\n"
    "      loc='lowerWick';lo=c.l;hi=c.l+lw*wickCapture;poc=(hi+lo)/2;\n"
    "    }\n"
    "    if(hi<=lo){var m=(hi+lo)/2;hi=m+at*0.06;lo=m-at*0.06;}\n"
    "    var vPct=Math.max(bPct,uwPct,lwPct);\n"
    "    return{hi:hi,lo:lo,pocPrice:poc||((hi+lo)/2),location:loc,source:'estimated',volPct:vPct};\n"
    "  }"
)
html = html.replace(OLD_HVS_EST, NEW_HVS_EST, 1)

# ── 4. Insert _applyAtrSpacing() before _computeAll() ────────────────────────────
OLD_COMPUTE_ALL_HDR = (
    "  /* ── Main compute ── */\n"
    "  function _computeAll(cs,cfg,nestCs){"
)
assert OLD_COMPUTE_ALL_HDR in html, '_computeAll header anchor not found'
NEW_COMPUTE_ALL_HDR = (
    "  /* ── ATR Smart Spacing: filter/prioritise zones that are too close ── */\n"
    "  function _applyAtrSpacing(zones,cfg){\n"
    "    if(zones.length<2)return zones;\n"
    "    var factor=cfg.atrSpacing||0.12;\n"
    "    /* per-level multiplier: higher level = keeps more space around itself */\n"
    "    var LVL_F=[0,0.08,0.10,0.12,0.15,0.18];\n"
    "    function _zScore(z){\n"
    "      return z.level*10000\n"
    "        +(z.rawScore||0)*100\n"
    "        +z.srcIdx\n"
    "        +(z.vol||0)/1e8\n"
    "        +((z.hvsMeta&&z.hvsMeta.source==='footprint')?500:0);\n"
    "    }\n"
    "    /* sort best-first, sweep and keep only non-crowded zones */\n"
    "    var byPri=zones.slice().sort(function(a,b){return _zScore(b)-_zScore(a);});\n"
    "    var kept=[];\n"
    "    for(var i=0;i<byPri.length;i++){\n"
    "      var z=byPri[i];\n"
    "      var lf=LVL_F[Math.min(5,z.level)]*(factor/0.12);\n"
    "      var minGap=Math.max(z.atr*lf,(z.hi-z.lo)*1.0);\n"
    "      var ok=true;\n"
    "      for(var j=0;j<kept.length;j++){\n"
    "        if(Math.abs(z.mid-kept[j].mid)<minGap){ok=false;break;}\n"
    "      }\n"
    "      if(ok)kept.push(z);\n"
    "    }\n"
    "    /* restore draw order: level DESC, then recency DESC */\n"
    "    kept.sort(function(a,b){var ld=b.level-a.level;return ld!==0?ld:b.srcIdx-a.srcIdx;});\n"
    "    return kept;\n"
    "  }\n"
    "\n"
    "  /* ── Main compute ── */\n"
    "  function _computeAll(cs,cfg,nestCs){"
)
html = html.replace(OLD_COMPUTE_ALL_HDR, NEW_COMPUTE_ALL_HDR, 1)

# ── 5. Call _applyAtrSpacing() inside _computeAll() after detection ───────────────
OLD_AFTER_DETECT = (
    "    var main=_detectAndBuild(sl,base,cs,cfg,false);\n"
    "    var nested=[];"
)
assert OLD_AFTER_DETECT in html, 'after-detect anchor not found'
NEW_AFTER_DETECT = (
    "    var main=_detectAndBuild(sl,base,cs,cfg,false);\n"
    "    if(cfg.atrSpacingEnabled&&main.length>1)main=_applyAtrSpacing(main,cfg);\n"
    "    var nested=[];"
)
html = html.replace(OLD_AFTER_DETECT, NEW_AFTER_DETECT, 1)

# ── 6. Register new IDs in SZ_IDS event set ──────────────────────────────────────
OLD_SZ_IDS_END = "  'szNested','szNestMinLvl','szNestMax','szShowNested','szNestOp','szNestStyle'\n  ]);"
assert OLD_SZ_IDS_END in html, 'SZ_IDS end anchor not found'
NEW_SZ_IDS_END = "  'szNested','szNestMinLvl','szNestMax','szShowNested','szNestOp','szNestStyle',\n  'szAtrSpacingOn','szAtrSpacing'\n  ]);"
html = html.replace(OLD_SZ_IDS_END, NEW_SZ_IDS_END, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_152.py applied — Beta 0.152')
print('  + _applyAtrSpacing(): post-detection filter, keeps best zone per ATR region')
print('    Priority: level > rawScore > recency > vol > footprint source')
print('    minGap = max(atr * levelFactor * userFactor, zoneHeight * 1.0)')
print('  + _hvsEstimate(): directional density scoring')
print('    Bull spike: lower wick weighted 1.5x (absorption)')
print('    Bear spike: upper wick weighted 1.5x (distribution)')
print('  + UI: ATR Smart Spacing checkbox (default ON) + factor input (default 0.12)')
