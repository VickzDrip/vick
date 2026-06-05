#!/usr/bin/env python3
"""patch_171.py — Beta 0.171: Spike Zones — Proximity Merge com cor diferente

Zonas em proximidade (dentro de N×ATR) são mescladas numa zona "confluência"
e exibidas com uma cor distinta configurável (default: #f59e0b dourado).

Mudanças:
1. _cfg(): proxOn, proxDist, proxColor
2. _proximityGroup(): nova função (post-cache, puramente visual)
   - ordena zonas por preço, expande grupos transitivamente
   - zona mesclada: hi=max, lo=min, level=max, srcIdx=earliest, needle=best
   - marca isProxMerged=true, proxCount=N
3. drawSpikeZones(): chama _proximityGroup após cache; usa proxC para cor
4. HTML: secção CONFLUÊNCIA no painel (toggle, ATR×, cor)
5. SZ_IDS: szProxOn, szProxDist, szProxColor → redraw ao mudar
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.170') >= 10, 'Beta 0.170 not found'
html = html.replace('Beta 0.170', 'Beta 0.171')

# ── 1. _cfg(): proxOn / proxDist / proxColor ──────────────────────────────────
OLD_CFG_END = "      histDays:    Math.max(7,parseInt(sv('szHistoryDays','90'))||90)\n    };\n  }"
assert OLD_CFG_END in html, '_cfg end anchor not found'
html = html.replace(OLD_CFG_END,
    "      proxOn:      bv('szProxOn',true),\n"
    "      proxDist:    clp(nv('szProxDist',1.0),0.1,5),\n"
    "      proxColor:   sv('szProxColor','#f59e0b'),\n"
    "      histDays:    Math.max(7,parseInt(sv('szHistoryDays','90'))||90)\n"
    "    };\n"
    "  }",
    1
)

# ── 2. _proximityGroup(): insere antes de _computeNested ─────────────────────
OLD_NESTED_CMT = (
    "    return final_.slice(0,isNested?cfg.nestMax:cfg.maxZones);\n"
    "  }\n\n"
    "  /* ── Nested zones: per main zone, find inner spikes ── */"
)
assert OLD_NESTED_CMT in html, '_detectAndBuild end anchor not found'

PROX_FN = (
    "    return final_.slice(0,isNested?cfg.nestMax:cfg.maxZones);\n"
    "  }\n\n"
    "  /* ── Proximity Group: agrupa zonas visualmente próximas (post-cache) ── */\n"
    "  function _proximityGroup(zones,cfg){\n"
    "    if(!cfg.proxOn||zones.length<2)return zones;\n"
    "    var atrSum=0,atrN=0;\n"
    "    for(var i=0;i<zones.length;i++){if(zones[i].atr>0){atrSum+=zones[i].atr;atrN++;}}\n"
    "    if(atrN===0)return zones;\n"
    "    var thresh=(atrSum/atrN)*cfg.proxDist;\n"
    "    var sorted=zones.slice().sort(function(a,b){return a.lo-b.lo;});\n"
    "    var used=new Uint8Array(sorted.length),result=[];\n"
    "    for(var i=0;i<sorted.length;i++){\n"
    "      if(used[i])continue;\n"
    "      used[i]=1;\n"
    "      var gHi=sorted[i].hi,gLo=sorted[i].lo,group=[i];\n"
    "      /* expand transitivamente até nenhum vizinho novo */\n"
    "      var chg=true;\n"
    "      while(chg){\n"
    "        chg=false;\n"
    "        for(var j=0;j<sorted.length;j++){\n"
    "          if(used[j])continue;\n"
    "          if(sorted[j].lo<=gHi+thresh&&sorted[j].hi>=gLo-thresh){\n"
    "            used[j]=1;group.push(j);\n"
    "            gHi=Math.max(gHi,sorted[j].hi);gLo=Math.min(gLo,sorted[j].lo);chg=true;\n"
    "          }\n"
    "        }\n"
    "      }\n"
    "      if(group.length===1){result.push(sorted[i]);continue;}\n"
    "      /* mescla grupo numa zona conlfuência */\n"
    "      var z0=Object.assign({},sorted[group[0]]);\n"
    "      z0.srcIdxs=z0.srcIdxs?z0.srcIdxs.slice():[z0.srcIdx];\n"
    "      for(var k=1;k<group.length;k++){\n"
    "        var oz=sorted[group[k]];\n"
    "        z0.hi=Math.max(z0.hi,oz.hi);z0.lo=Math.min(z0.lo,oz.lo);\n"
    "        z0.level=Math.max(z0.level,oz.level);\n"
    "        z0.vol=Math.max(z0.vol,oz.vol);\n"
    "        if((oz.rawScore||0)>(z0.rawScore||0))z0.rawScore=oz.rawScore;\n"
    "        /* srcIdx mais antigo = borda esquerda mais longe */\n"
    "        if(oz.srcIdx<z0.srcIdx){z0.srcIdx=oz.srcIdx;z0.srcTs=oz.srcTs;}\n"
    "        if(oz.srcIdxs)z0.srcIdxs=z0.srcIdxs.concat(oz.srcIdxs);\n"
    "        else if(oz.srcIdx!=null)z0.srcIdxs.push(oz.srcIdx);\n"
    "        if(_needleScore(oz)>_needleScore(z0)){\n"
    "          z0.needleHi=oz.needleHi;z0.needleLo=oz.needleLo;\n"
    "          z0.needleMid=oz.needleMid;z0.needlePoc=oz.needlePoc;\n"
    "          z0.needleSource=oz.needleSource;\n"
    "          z0.needleVolPct=oz.needleVolPct;z0.needleConfidence=oz.needleConfidence;\n"
    "        }\n"
    "      }\n"
    "      z0.mid=(z0.hi+z0.lo)/2;\n"
    "      z0.isProxMerged=true;z0.proxCount=group.length;\n"
    "      result.push(z0);\n"
    "    }\n"
    "    result.sort(function(a,b){return b.level-a.level;});\n"
    "    return result;\n"
    "  }\n\n"
    "  /* ── Nested zones: per main zone, find inner spikes ── */"
)
html = html.replace(OLD_NESTED_CMT, PROX_FN, 1)

# ── 3. drawSpikeZones: aplica _proximityGroup + declara proxC ────────────────
OLD_MAIN_LOAD = (
    "    var main=(_cache&&_cache.main)||[];\n"
    "    var nested=(_cache&&_cache.nested)||[];\n"
    "    if(!main.length&&!nested.length)return;"
)
assert OLD_MAIN_LOAD in html, 'main/nested load anchor not found'
html = html.replace(OLD_MAIN_LOAD,
    "    var main=(_cache&&_cache.main)||[];\n"
    "    var nested=(_cache&&_cache.nested)||[];\n"
    "    if(!main.length&&!nested.length)return;\n"
    "    /* proximity group — post-cache, puramente visual */\n"
    "    if(cfg.proxOn&&main.length>1)main=_proximityGroup(main,cfg);\n"
    "    var proxC=cfg.proxOn&&cfg.proxColor?hexToRgb(cfg.proxColor)||null:null;",
    1
)

# ── 4. Draw loop (MAIN ZONES): usa proxC para zonas confluência ──────────────
OLD_COL = (
    "      var boxH=Math.max(1,y2-y1);\n"
    "      var col=cols[z.level]||cols[10];\n"
    "      var recency=Math.max(0,1-(z.age/expBound));"
)
assert OLD_COL in html, 'main zones col anchor not found'
html = html.replace(OLD_COL,
    "      var boxH=Math.max(1,y2-y1);\n"
    "      var col=(z.isProxMerged&&proxC)?proxC:(cols[z.level]||cols[10]);\n"
    "      var recency=Math.max(0,1-(z.age/expBound));",
    1
)

# ── 5. HTML: secção CONFLUÊNCIA antes do hint do Spike Zones ──────────────────
OLD_HINT = (
    '            <div class="hint">Spike Zones detecta candles com spike de volume/range, '
    'cria zonas L1–5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). '
    'Labels centralizados dentro das zonas.</div>\n'
    '          </div>\n'
    '        </div>'
)
# fallback: tenta com L1–L5
if OLD_HINT not in html:
    OLD_HINT = (
        '            <div class="hint">Spike Zones detecta candles com spike de volume/range, '
        'cria zonas L1–L5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). '
        'Labels centralizados dentro das zonas.</div>\n'
        '          </div>\n'
        '        </div>'
    )
assert OLD_HINT in html, 'spike zones hint anchor not found'
html = html.replace(OLD_HINT,
    '            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;'
    'text-transform:uppercase;margin:8px 0 4px;padding-top:6px;padding-bottom:4px;'
    'border-top:1px solid rgba(0,212,255,.07);border-bottom:1px solid rgba(0,212,255,.07)">CONLUIÊNCIA</div>\n'
    '            <label class="kv" style="cursor:pointer"><span class="k">Merge por proximidade</span>'
    '<input type="checkbox" id="szProxOn" checked '
    'style="width:14px;height:14px;accent-color:#f59e0b;cursor:pointer;flex-shrink:0"></label>\n'
    '            <div class="kv"><span class="k">Prox. ATR×</span>'
    '<select class="select" id="szProxDist" style="width:72px">'
    '<option value="0.3">0.3×</option>'
    '<option value="0.5">0.5×</option>'
    '<option value="1.0" selected>1.0×</option>'
    '<option value="1.5">1.5×</option>'
    '<option value="2.0">2.0×</option>'
    '<option value="3.0">3.0×</option>'
    '</select></div>\n'
    '            <div class="kv"><span class="k">Cor conluiência</span>'
    '<input type="color" id="szProxColor" value="#f59e0b" '
    'style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="hint">Spike Zones detecta candles com spike de volume/range, '
    'cria zonas L1–L5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). '
    'Labels centralizados dentro das zonas.</div>\n'
    '          </div>\n'
    '        </div>',
    1
)

# ── 6. SZ_IDS: adiciona 3 novos IDs ──────────────────────────────────────────
OLD_SZIDS_END = "  'szHistoryDays'\n  ]);"
assert OLD_SZIDS_END in html, 'SZ_IDS end anchor not found'
html = html.replace(OLD_SZIDS_END,
    "  'szHistoryDays',\n"
    "  'szProxOn','szProxDist','szProxColor'\n"
    "  ]);",
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_171.py applied — Beta 0.171')
print('  Spike Zones: Proximity Merge com cor conlfuência')
print('  - Zonas em proximidade (default 1×ATR) mesclam-se numa zona')
print('  - Cor diferente: #f59e0b (dourado) para zonas confluentes')
print('  - Settings: toggle On/Off, ATR× threshold (0.3“3.0), cor pick')
print('  - srcIdx=earliest → zona começa no candle mais antigo do grupo')
print('  - needle=best: preserva o miolo de maior qualidade')
