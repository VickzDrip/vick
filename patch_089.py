#!/usr/bin/env python3
"""Beta 0.089 — HVN Zones: controle de tamanho por ATR (vzBucketAtr)"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.088', 'Beta 0.089')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.089\n  - OPT_COMBOS expandido para exatamente 100',
    '''Beta 0.089
  - HVN Zones: novo campo "Tamanho ATR×" (vzBucketAtr).
    Quando > 0, o tamanho da zona é calculado como ATR(14) × valor / preço
    ao invés do percentual fixo, adaptando as zonas à volatilidade atual.
  - getSettings(cs) aceita candles opcionalmente para derivar bucketPct via ATR.
  - window.__dvlComputeHVNFromCS passa cs para getSettings, então os sinais
    HVN também usam o tamanho baseado em ATR automaticamente.
  - vzBucketAtr adicionado a VZ_INPUTS para forçar redesenho ao mudar.

Beta 0.088
  - OPT_COMBOS expandido para exatamente 100''',
    1
)

# ── 3. Add vzBucketAtr input to vol zones settings panel ─────────────────────
OLD_VZ_BUCKET_ROW = (
    '            <div class="kv"><span class="k">Faixa % pre\xe7o</span>'
    '<input class="num" id="vzBucket" type="number" min="0.01" max="5" step="0.01" value="0.1" style="width:70px"></div>\n'
    '            <div class="kv"><span class="k">Top zonas</span>'
)

NEW_VZ_BUCKET_ROW = (
    '            <div class="kv"><span class="k">Faixa % pre\xe7o</span>'
    '<input class="num" id="vzBucket" type="number" min="0.01" max="5" step="0.01" value="0.1" style="width:70px"></div>\n'
    '            <div class="kv"><span class="k">Tamanho ATR\xd7</span>'
    '<input class="num" id="vzBucketAtr" type="number" min="0" max="5" step="0.1" value="0" style="width:70px">'
    '<span style="font-size:9px;color:#5a7090;margin-left:4px">0=fixo</span></div>\n'
    '            <div class="kv"><span class="k">Top zonas</span>'
)

assert OLD_VZ_BUCKET_ROW in html, "vzBucket row not found"
html = html.replace(OLD_VZ_BUCKET_ROW, NEW_VZ_BUCKET_ROW, 1)

# ── 4. Modify getSettings() to accept cs and compute ATR-based bucketPct ─────
OLD_GET_SETTINGS = (
    "  function getSettings(){\n"
    "    return{\n"
    "      bucketPct:Math.max(0.01,numVal('vzBucket',0.1)),\n"
    "      topN:Math.max(1,Math.min(30,numVal('vzTopN',12))),\n"
    "      minTouch:Math.max(1,Math.round(numVal('vzMinTouch',2))),\n"
    "      mergeGap:Math.max(0,Math.round(numVal('vzMerge',0))),\n"
    "      extend:Math.max(0,Math.round(numVal('vzExtend',20))),\n"
    "      color:E('vzColor')?.value||'#f59e0b'\n"
    "    };\n"
    "  }"
)

NEW_GET_SETTINGS = (
    "  function getSettings(cs){\n"
    "    var bktPct=Math.max(0.01,numVal('vzBucket',0.1));\n"
    "    var bktAtr=Math.max(0,numVal('vzBucketAtr',0));\n"
    "    if(bktAtr>0&&cs&&cs.length>=14){\n"
    "      var _atrs=calcATR(cs,14);var _lastAtr=_atrs.filter(function(v){return v!=null;}).at(-1)||0;\n"
    "      var _lastP=cs.at(-1).c||0;\n"
    "      if(_lastAtr>0&&_lastP>0)bktPct=Math.max(0.01,_lastAtr*bktAtr/_lastP*100);\n"
    "    }\n"
    "    return{\n"
    "      bucketPct:bktPct,\n"
    "      topN:Math.max(1,Math.min(30,numVal('vzTopN',12))),\n"
    "      minTouch:Math.max(1,Math.round(numVal('vzMinTouch',2))),\n"
    "      mergeGap:Math.max(0,Math.round(numVal('vzMerge',0))),\n"
    "      extend:Math.max(0,Math.round(numVal('vzExtend',20))),\n"
    "      color:E('vzColor')?.value||'#f59e0b',\n"
    "      bucketAtr:bktAtr\n"
    "    };\n"
    "  }"
)

assert OLD_GET_SETTINGS in html, "getSettings() function not found"
html = html.replace(OLD_GET_SETTINGS, NEW_GET_SETTINGS, 1)

# ── 5. In drawVolZones: fetch candles BEFORE getSettings so cs is available ──
OLD_DRAW_VZ_CFG = (
    "    const{bucketPct,topN,minTouch,mergeGap,extend,color}=getSettings();\n"
    "    const vzTfSel=E('vzTf');const vzTf=vzTfSel?vzTfSel.value:'';\n"
    "    const cs=getVZCandles();"
)

NEW_DRAW_VZ_CFG = (
    "    const vzTfSel=E('vzTf');const vzTf=vzTfSel?vzTfSel.value:'';\n"
    "    const cs=getVZCandles();\n"
    "    const{bucketPct,topN,minTouch,mergeGap,extend,color}=getSettings(cs);"
)

assert OLD_DRAW_VZ_CFG in html, "drawVolZones cfg block not found"
html = html.replace(OLD_DRAW_VZ_CFG, NEW_DRAW_VZ_CFG, 1)

# ── 6. Update __dvlComputeHVNFromCS to pass cs to getSettings ────────────────
OLD_COMPUTE_EXPORT = (
    "  window.__dvlComputeHVNFromCS=function(cs){\n"
    "    var s=getSettings();\n"
    "    var r=computeHVN(cs,s.bucketPct,s.topN,s.minTouch,s.mergeGap);\n"
    "    return r?r.hvn||[]:[]; };"
)

NEW_COMPUTE_EXPORT = (
    "  window.__dvlComputeHVNFromCS=function(cs){\n"
    "    var s=getSettings(cs);\n"
    "    var r=computeHVN(cs,s.bucketPct,s.topN,s.minTouch,s.mergeGap);\n"
    "    return r?r.hvn||[]:[]; };"
)

assert OLD_COMPUTE_EXPORT in html, "__dvlComputeHVNFromCS export not found"
html = html.replace(OLD_COMPUTE_EXPORT, NEW_COMPUTE_EXPORT, 1)

# ── 7. Add vzBucketAtr to VZ_INPUTS ──────────────────────────────────────────
OLD_VZ_INPUTS = (
    "  const VZ_INPUTS=new Set(['vzBucket','vzTopN','vzMinTouch','vzMerge','vzExtend','vzColor','vzTf']);"
)

NEW_VZ_INPUTS = (
    "  const VZ_INPUTS=new Set(['vzBucket','vzBucketAtr','vzTopN','vzMinTouch','vzMerge','vzExtend','vzColor','vzTf']);"
)

assert OLD_VZ_INPUTS in html, "VZ_INPUTS set not found"
html = html.replace(OLD_VZ_INPUTS, NEW_VZ_INPUTS, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.089 applied')
