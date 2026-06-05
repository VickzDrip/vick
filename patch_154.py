#!/usr/bin/env python3
"""patch_154.py — Beta 0.154: Spike Zones Comprehensive Refactor
   1. Labels default OFF; all zone text gated by cfg.showLabels
   2. Multi-param Smart Spacing (spacingAtr, spacingHeight, spacingTicks, spacingMtfMult)
   3. Color pickers L1-L5 + fill/border/source opacity inputs
   4. Improved _applyAtrSmartSpacing with new priority formula
   5. MTF x-position fix: _xByTs() timestamp-based lookup
   6. Simpler opacity: direct cfg.fillOpacity / cfg.borderOpacity
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.153') >= 10, 'Beta 0.153 not found'
html = html.replace('Beta 0.153', 'Beta 0.154')

# ── 1. szLabOn: remove `checked` (default OFF) ───────────────────────────────
OLD_LAB_ON = (
    '<label class="kv" style="cursor:pointer"><span class="k">Mostrar labels</span>'
    '<input type="checkbox" id="szLabOn" checked style="width:14px;height:14px;'
    'accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>'
)
assert OLD_LAB_ON in html, 'szLabOn checked anchor not found'
NEW_LAB_ON = (
    '<label class="kv" style="cursor:pointer"><span class="k">Mostrar labels</span>'
    '<input type="checkbox" id="szLabOn" style="width:14px;height:14px;'
    'accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>'
)
html = html.replace(OLD_LAB_ON, NEW_LAB_ON, 1)

# ── 2. Replace spacing UI with multi-param section ───────────────────────────
OLD_SPACING_UI = (
    '            <label class="kv" style="cursor:pointer"><span class="k">ATR Smart Spacing</span>'
    '<input type="checkbox" id="szAtrSpacingOn" checked style="width:14px;height:14px;'
    'accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>\n'
    '            <div class="kv"><span class="k">Spacing factor</span>'
    '<input class="num" id="szAtrSpacing" type="number" min="0.02" max="1.0" step="0.01" '
    'value="0.12" style="width:56px"><span style="font-size:9px;color:#5a7090;margin-left:4px">'
    '×ATR</span></div>'
)
assert OLD_SPACING_UI in html, 'spacing UI anchor not found'
NEW_SPACING_UI = (
    '            <label class="kv" style="cursor:pointer"><span class="k">Smart Spacing</span>'
    '<input type="checkbox" id="szSpacingOn" checked style="width:14px;height:14px;'
    'accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>\n'
    '            <div class="kv"><span class="k">Spacing ×ATR</span>'
    '<input class="num" id="szSpacingAtr" type="number" min="0" max="3" step="0.05" '
    'value="0.25" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Spacing ×height</span>'
    '<input class="num" id="szSpacingHeight" type="number" min="0" max="5" step="0.1" '
    'value="1.2" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Spacing ticks</span>'
    '<input class="num" id="szSpacingTicks" type="number" min="0" max="100" step="1" '
    'value="4" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">MTF mult</span>'
    '<input class="num" id="szSpacingMtfMult" type="number" min="1" max="5" step="0.1" '
    'value="1.5" style="width:56px"></div>'
)
html = html.replace(OLD_SPACING_UI, NEW_SPACING_UI, 1)

# ── 3. Add CORES section (color pickers + opacity) before hint ────────────────
OLD_HINT = (
    '            <div class="hint">Spike Zones detecta candles com spike de volume/range, '
    'cria zonas L1–L5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). '
    'Labels centralizados dentro das zonas.</div>'
)
assert OLD_HINT in html, 'hint anchor not found'
NEW_HINT = (
    '            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;'
    'text-transform:uppercase;margin:8px 0 4px;padding-top:6px;padding-bottom:4px;'
    'border-top:1px solid rgba(0,212,255,.07);border-bottom:1px solid rgba(0,212,255,.07)">CORES</div>\n'
    '            <div class="kv"><span class="k">L1</span>'
    '<input type="color" id="szColorL1" value="#5a96ff" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L2</span>'
    '<input type="color" id="szColorL2" value="#00d7ff" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L3</span>'
    '<input type="color" id="szColorL3" value="#00f5c8" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L4</span>'
    '<input type="color" id="szColorL4" value="#ffbc00" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">L5</span>'
    '<input type="color" id="szColorL5" value="#ff37f5" style="width:36px;height:20px;'
    'border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">Fill opacity</span>'
    '<input class="num" id="szFillOpacity" type="number" min="0.01" max="1" step="0.01" '
    'value="0.16" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Border opacity</span>'
    '<input class="num" id="szBorderOpacity" type="number" min="0.01" max="1" step="0.01" '
    'value="0.70" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Source opacity</span>'
    '<input class="num" id="szSourceOpacity" type="number" min="0.01" max="1" step="0.01" '
    'value="0.65" style="width:56px"></div>\n'
    '            <div class="hint">Spike Zones detecta candles com spike de volume/range, '
    'cria zonas L1–L5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). '
    'Labels centralizados dentro das zonas.</div>'
)
html = html.replace(OLD_HINT, NEW_HINT, 1)

# ── 4a. _cfg(): rename labOn → showLabels, default false ─────────────────────
OLD_LAB_CFG = "      labOn:     bv('szLabOn',true),"
assert OLD_LAB_CFG in html, 'labOn cfg anchor not found'
NEW_LAB_CFG = "      showLabels: bv('szLabOn',false),"
html = html.replace(OLD_LAB_CFG, NEW_LAB_CFG, 1)

# ── 4b. _cfg(): replace atrSpacing params with full new set ──────────────────
OLD_CFG_END = (
    "      atrSpacingEnabled: bv('szAtrSpacingOn',true),\n"
    "      atrSpacing: clp(nv('szAtrSpacing',0.12),0.02,1.0)\n"
    "    };\n"
    "  }"
)
assert OLD_CFG_END in html, '_cfg end anchor not found'
NEW_CFG_END = (
    "      spacingOn:      bv('szSpacingOn',true),\n"
    "      spacingAtr:     clp(nv('szSpacingAtr',0.25),0,3),\n"
    "      spacingHeight:  clp(nv('szSpacingHeight',1.2),0,5),\n"
    "      spacingTicks:   clp(nv('szSpacingTicks',4),0,100),\n"
    "      spacingMtfMult: clp(nv('szSpacingMtfMult',1.5),1,5),\n"
    "      colorL1:  sv('szColorL1','#5a96ff'),\n"
    "      colorL2:  sv('szColorL2','#00d7ff'),\n"
    "      colorL3:  sv('szColorL3','#00f5c8'),\n"
    "      colorL4:  sv('szColorL4','#ffbc00'),\n"
    "      colorL5:  sv('szColorL5','#ff37f5'),\n"
    "      fillOpacity:   clp(nv('szFillOpacity',0.16),0.01,1),\n"
    "      borderOpacity: clp(nv('szBorderOpacity',0.70),0.01,1),\n"
    "      sourceOpacity: clp(nv('szSourceOpacity',0.65),0.01,1)\n"
    "    };\n"
    "  }"
)
html = html.replace(OLD_CFG_END, NEW_CFG_END, 1)

# ── 5. Add hexToRgb helper after COL array ────────────────────────────────────
OLD_COL_BLOCK = (
    "  var COL=[null,\n"
    "    {r:90, g:150,b:255},  /* L1 bright blue  */\n"
    "    {r:0,  g:215,b:255},  /* L2 vivid cyan   */\n"
    "    {r:0,  g:245,b:200},  /* L3 vivid mint   */\n"
    "    {r:255,g:188,b:0  },  /* L4 bright amber */\n"
    "    {r:255,g:55, b:245}   /* L5 vivid pink   */\n"
    "  ];"
)
assert OLD_COL_BLOCK in html, 'COL array anchor not found'
NEW_COL_BLOCK = (
    "  var COL=[null,\n"
    "    {r:90, g:150,b:255},  /* L1 bright blue  */\n"
    "    {r:0,  g:215,b:255},  /* L2 vivid cyan   */\n"
    "    {r:0,  g:245,b:200},  /* L3 vivid mint   */\n"
    "    {r:255,g:188,b:0  },  /* L4 bright amber */\n"
    "    {r:255,g:55, b:245}   /* L5 vivid pink   */\n"
    "  ];\n"
    "  function hexToRgb(h){h=h.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];\n"
    "    var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);\n"
    "    return(isNaN(r)||isNaN(g)||isNaN(b))?null:{r:r,g:g,b:b};}"
)
html = html.replace(OLD_COL_BLOCK, NEW_COL_BLOCK, 1)

# ── 6. Replace _applyAtrSpacing with improved _applyAtrSmartSpacing ───────────
OLD_ATR_SPACING = (
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
    "  }"
)
assert OLD_ATR_SPACING in html, '_applyAtrSpacing anchor not found'
NEW_ATR_SPACING = (
    "  /* ── ATR Smart Spacing: multi-param filter, keeps best zone per region ── */\n"
    "  function _applyAtrSmartSpacing(zones,cfg,isMTF){\n"
    "    if(zones.length<2)return zones;\n"
    "    var mult=isMTF?(cfg.spacingMtfMult||1.5):1.0;\n"
    "    var sAtr=(cfg.spacingAtr||0.25)*mult;\n"
    "    var sH=(cfg.spacingHeight||1.2)*mult;\n"
    "    var sT=(cfg.spacingTicks||4)*mult;\n"
    "    /* compute averages for minGap */\n"
    "    var sumAtr=0,sumH=0;\n"
    "    for(var k=0;k<zones.length;k++){sumAtr+=zones[k].atr||0;sumH+=(zones[k].hi-zones[k].lo);}\n"
    "    var avgAtr=sumAtr/zones.length,avgH=sumH/zones.length;\n"
    "    var tick=avgAtr>0?avgAtr*0.01:0.01;\n"
    "    function _zScore(z){\n"
    "      return z.level*100000\n"
    "        +(z.rawScore||0)*1000\n"
    "        +((z.hvsMeta&&z.hvsMeta.volPct)||0)*500\n"
    "        +((z.hvsMeta&&z.hvsMeta.source==='footprint')?500:0)\n"
    "        +(z.srcIdx||0)\n"
    "        +(z.vol||0)/1e8;\n"
    "    }\n"
    "    var byPri=zones.slice().sort(function(a,b){return _zScore(b)-_zScore(a);});\n"
    "    var kept=[];\n"
    "    for(var i=0;i<byPri.length;i++){\n"
    "      var z=byPri[i];\n"
    "      var minGap=Math.max(avgAtr*sAtr,avgH*sH,tick*sT);\n"
    "      var ok=true;\n"
    "      for(var j=0;j<kept.length;j++){\n"
    "        if(Math.abs(z.mid-kept[j].mid)<minGap){ok=false;break;}\n"
    "      }\n"
    "      if(ok)kept.push(z);\n"
    "    }\n"
    "    kept.sort(function(a,b){var ld=b.level-a.level;return ld!==0?ld:b.srcIdx-a.srcIdx;});\n"
    "    return kept;\n"
    "  }"
)
html = html.replace(OLD_ATR_SPACING, NEW_ATR_SPACING, 1)

# ── 7. _computeAll: use new spacing fn, apply to nested too ──────────────────
OLD_COMPUTE = (
    "    if(cfg.atrSpacingEnabled&&main.length>1)main=_applyAtrSpacing(main,cfg);\n"
    "    var nested=[];\n"
    "    if(nestCs&&nestCs.length>=2&&cfg.nested&&main.length){\n"
    "      var mainTfMs=_tfMs(cfg.tf||S.tf);\n"
    "      nested=_computeNested(main,nestCs,mainTfMs,cfg);\n"
    "    }\n"
    "    return{main:main,nested:nested};\n"
    "  }"
)
assert OLD_COMPUTE in html, '_computeAll spacing call anchor not found'
NEW_COMPUTE = (
    "    var _isMTF=!!(cfg.tf&&cfg.tf!==S.tf);\n"
    "    if(cfg.spacingOn&&main.length>1)main=_applyAtrSmartSpacing(main,cfg,_isMTF);\n"
    "    var nested=[];\n"
    "    if(nestCs&&nestCs.length>=2&&cfg.nested&&main.length){\n"
    "      var mainTfMs=_tfMs(cfg.tf||S.tf);\n"
    "      nested=_computeNested(main,nestCs,mainTfMs,cfg);\n"
    "      if(cfg.spacingOn&&nested.length>1)nested=_applyAtrSmartSpacing(nested,cfg,false);\n"
    "    }\n"
    "    return{main:main,nested:nested};\n"
    "  }"
)
html = html.replace(OLD_COMPUTE, NEW_COMPUTE, 1)

# ── 8. Cache key: add spacing params ─────────────────────────────────────────
OLD_CK = (
    "    var ck=[cs.length,cs[0]?cs[0].t:0,S.sym,tf,\n"
    "            cfg.minLevel,cfg.sens,cfg.volMA,\n"
    "            cfg.maxZones,cfg.source,\n"
    "            cfg.hvsDomMin,cfg.hvsWidth,cfg.hvsSens,\n"
    "            cfg.mergeDist,cfg.expire,cfg.maxTests,\n"
    "            nestTF,cfg.nestMinLvl,cfg.nestMax,\n"
    "            nestCs?nestCs.length:0].join('|');"
)
assert OLD_CK in html, 'cache key anchor not found'
NEW_CK = (
    "    var ck=[cs.length,cs[0]?cs[0].t:0,S.sym,tf,\n"
    "            cfg.minLevel,cfg.sens,cfg.volMA,\n"
    "            cfg.maxZones,cfg.source,\n"
    "            cfg.hvsDomMin,cfg.hvsWidth,cfg.hvsSens,\n"
    "            cfg.mergeDist,cfg.expire,cfg.maxTests,\n"
    "            nestTF,cfg.nestMinLvl,cfg.nestMax,\n"
    "            nestCs?nestCs.length:0,\n"
    "            cfg.spacingOn,cfg.spacingAtr,cfg.spacingHeight,cfg.spacingTicks,cfg.spacingMtfMult].join('|');"
)
html = html.replace(OLD_CK, NEW_CK, 1)

# ── 9. drawSpikeZones: add _xByTs helper after usingMTF ──────────────────────
OLD_MTF_LINE = (
    "    var usingMTF=cfg.tf&&cfg.tf!==S.tf;\n"
    "    var expBound=cfg.expire>0?cfg.expire:250;"
)
assert OLD_MTF_LINE in html, 'usingMTF anchor not found'
NEW_MTF_LINE = (
    "    var usingMTF=cfg.tf&&cfg.tf!==S.tf;\n"
    "    var expBound=cfg.expire>0?cfg.expire:250;\n"
    "    /* timestamp-based x lookup for MTF zones */\n"
    "    function _xByTs(ts){\n"
    "      var cs2=S.candles;if(!cs2||!cs2.length)return 0;\n"
    "      var lo=0,hi=cs2.length-1;\n"
    "      while(lo<hi){var m2=(lo+hi)>>1;if(cs2[m2].t<ts)lo=m2+1;else hi=m2;}\n"
    "      if(lo>0&&Math.abs(cs2[lo-1].t-ts)<Math.abs(cs2[lo].t-ts))lo--;\n"
    "      return Math.max(0,x(lo)-bwPx*0.5);\n"
    "    }"
)
html = html.replace(OLD_MTF_LINE, NEW_MTF_LINE, 1)

# ── 10. Build per-draw cols array from cfg color inputs ───────────────────────
OLD_TBSL = (
    "    ctx.textBaseline='middle'; /* ensures vertical centering for all text */\n"
    "    var isHvsOnlyDraw=main.length>0&&!!main[0].hvsOnly;"
)
assert OLD_TBSL in html, 'textBaseline anchor not found'
NEW_TBSL = (
    "    ctx.textBaseline='middle'; /* ensures vertical centering for all text */\n"
    "    var isHvsOnlyDraw=main.length>0&&!!main[0].hvsOnly;\n"
    "    /* build color array from user inputs (fallback to COL defaults) */\n"
    "    var cols=[null];\n"
    "    for(var _li=1;_li<=5;_li++){var _hx=cfg['colorL'+_li];cols.push(_hx?hexToRgb(_hx)||COL[_li]:COL[_li]);}"
)
html = html.replace(OLD_TBSL, NEW_TBSL, 1)

# ── 11. Replace COL[z.level]||COL[5] with cols everywhere in draw ─────────────
assert html.count('COL[z.level]||COL[5]') == 3, 'expected 3 occurrences of COL[z.level]||COL[5]'
html = html.replace('COL[z.level]||COL[5]', 'cols[z.level]||cols[5]')

# ── 12. Fix xL: use _xByTs when usingMTF ────────────────────────────────────
OLD_XL = "      xL=Math.max(0,x(z.srcIdx)-bwPx*0.5); /* start at source candle, never extend left */"
assert OLD_XL in html, 'xL assignment anchor not found'
NEW_XL = "      xL=usingMTF?_xByTs(z.srcTs):Math.max(0,x(z.srcIdx)-bwPx*0.5);"
html = html.replace(OLD_XL, NEW_XL, 1)

# ── 13. Simplify opacity: use cfg.fillOpacity / cfg.borderOpacity directly ────
OLD_OPS = (
    "      /* ── opacity by mode (stronger than v0.132) ── */\n"
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
    "      }\n"
    "      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}\n"
    "      else if(z.status==='tested'){fillOp*=0.76;strOp*=0.76;}"
)
assert OLD_OPS in html, 'opacity block anchor not found'
NEW_OPS = (
    "      /* ── opacity from user config ── */\n"
    "      var fillOp=cfg.fillOpacity,strOp=cfg.borderOpacity;\n"
    "      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}\n"
    "      else if(z.status==='tested'){fillOp*=0.76;strOp*=0.76;}"
)
html = html.replace(OLD_OPS, NEW_OPS, 1)

# ── 14. cfg.labOn → cfg.showLabels in draw function (3 occurrences) ──────────
assert html.count('cfg.labOn') == 3, 'expected 3 cfg.labOn references'
html = html.replace('cfg.labOn', 'cfg.showLabels')

# ── 15. Right-edge level indicator in HVS-only: gate on showLabels ────────────
OLD_HVS_REDGE = (
    "        if(coreH>4){\n"
    "          ctx.font='bold 6px monospace';ctx.textAlign='right';\n"
    "          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';\n"
    "          ctx.fillText('L'+z.level,W-rp-3,y1+coreH/2);\n"
    "        }"
)
assert OLD_HVS_REDGE in html, 'HVS right-edge anchor not found'
NEW_HVS_REDGE = (
    "        if(cfg.showLabels&&coreH>4){\n"
    "          ctx.font='bold 6px monospace';ctx.textAlign='right';\n"
    "          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';\n"
    "          ctx.fillText('L'+z.level,W-rp-3,y1+coreH/2);\n"
    "        }"
)
html = html.replace(OLD_HVS_REDGE, NEW_HVS_REDGE, 1)

# ── 16. Right-edge level indicator in normal mode: gate on showLabels ─────────
OLD_NORM_REDGE = (
    "      /* right-edge level indicator */\n"
    "      if(boxH>4){\n"
    "        ctx.font='bold 7px monospace';ctx.textAlign='right';\n"
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';\n"
    "        ctx.fillText('L'+z.level,W-rp-3,y1+boxH/2);\n"
    "      }"
)
assert OLD_NORM_REDGE in html, 'normal right-edge anchor not found'
NEW_NORM_REDGE = (
    "      /* right-edge level indicator */\n"
    "      if(cfg.showLabels&&boxH>4){\n"
    "        ctx.font='bold 7px monospace';ctx.textAlign='right';\n"
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';\n"
    "        ctx.fillText('L'+z.level,W-rp-3,y1+boxH/2);\n"
    "      }"
)
html = html.replace(OLD_NORM_REDGE, NEW_NORM_REDGE, 1)

# ── 17. Nested zone opacity: use cfg values ───────────────────────────────────
OLD_NESTED_OP = "        var fOp=nop*(0.02+0.04*lf),sOp=nop*(0.22+0.32*lf);"
assert OLD_NESTED_OP in html, 'nested opacity anchor not found'
NEW_NESTED_OP = "        var fOp=cfg.fillOpacity*nop,sOp=Math.min(1,cfg.borderOpacity*nop);"
html = html.replace(OLD_NESTED_OP, NEW_NESTED_OP, 1)

# ── 18. Source highlight: use cfg.sourceOpacity ───────────────────────────────
OLD_HL_OP = "          var hlOp=isPrimary?0.32+0.45*(z.level/5):0.20+0.28*(z.level/5);"
assert OLD_HL_OP in html, 'source highlight opacity anchor not found'
NEW_HL_OP = "          var hlOp=cfg.sourceOpacity*(isPrimary?1.0:0.6);"
html = html.replace(OLD_HL_OP, NEW_HL_OP, 1)

# ── 19. Source candle label: gate on cfg.showLabels ───────────────────────────
OLD_SRC_LBL = (
    "          /* label: primary = S3, merged candles = ·3 */\n"
    "          var lblY=isUp?chy-10:cly+13;\n"
    "          ctx.font='bold 7px monospace';\n"
    "          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,hlOp+0.15).toFixed(3)+')';\n"
    "          ctx.fillText(isPrimary?'S'+z.level:'·'+z.level,cx,lblY);"
)
assert OLD_SRC_LBL in html, 'source label anchor not found'
NEW_SRC_LBL = (
    "          /* label: primary = S3, merged candles = ·3 */\n"
    "          if(cfg.showLabels){\n"
    "            var lblY=isUp?chy-10:cly+13;\n"
    "            ctx.font='bold 7px monospace';\n"
    "            ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,hlOp+0.15).toFixed(3)+')';\n"
    "            ctx.fillText(isPrimary?'S'+z.level:'·'+z.level,cx,lblY);\n"
    "          }"
)
html = html.replace(OLD_SRC_LBL, NEW_SRC_LBL, 1)

# ── 20. SZ_IDS: replace old IDs with new set ─────────────────────────────────
OLD_SZ_IDS_END = (
    "  'szAtrSpacingOn','szAtrSpacing'\n"
    "  ]);"
)
assert OLD_SZ_IDS_END in html, 'SZ_IDS end anchor not found'
NEW_SZ_IDS_END = (
    "  'szSpacingOn','szSpacingAtr','szSpacingHeight','szSpacingTicks','szSpacingMtfMult',\n"
    "  'szColorL1','szColorL2','szColorL3','szColorL4','szColorL5',\n"
    "  'szFillOpacity','szBorderOpacity','szSourceOpacity'\n"
    "  ]);"
)
html = html.replace(OLD_SZ_IDS_END, NEW_SZ_IDS_END, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_154.py applied — Beta 0.154')
print('  1. Labels default OFF (szLabOn unchecked)')
print('  2. Multi-param Smart Spacing: spacingAtr(0.25) spacingHeight(1.2) spacingTicks(4) mtfMult(1.5)')
print('  3. CORES section: color pickers L1-L5, fillOpacity(0.16), borderOpacity(0.70), sourceOpacity(0.65)')
print('  4. _applyAtrSmartSpacing: priority = level*100k + rawScore*1k + hvsVolPct*500 + footprint + recency + vol')
print('  5. MTF x-fix: _xByTs() binary-search timestamp lookup in S.candles')
print('  6. Opacity: direct cfg.fillOpacity / cfg.borderOpacity (no colMode formula)')
print('  7. All zone text (labels, right-edge, source labels) gated by cfg.showLabels')
