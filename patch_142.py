#!/usr/bin/env python3
"""patch_142.py — Beta 0.142: Níveis por Volume MA + Volume ATR (novo sistema de scoring)"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.141') >= 10
html = html.replace('Beta 0.141', 'Beta 0.142')

# ── 1. HTML: remove "Peso volume" e "Peso ATR range" ─────────────────────────
OLD_WEIGHTS_HTML = (
    '            <div class="kv"><span class="k">Peso volume</span><input class="num" id="szVolMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Peso ATR range</span><input class="num" id="szAtrMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>\n'
)
assert OLD_WEIGHTS_HTML in html, 'weight inputs not found'
html = html.replace(OLD_WEIGHTS_HTML, '', 1)

# ── 2. _cfg(): remove volMult e atrMult ──────────────────────────────────────
OLD_CFG_WEIGHTS = (
    "      volMult:   clp(nv('szVolMult',1.0),0.1,5),\n"
    "      atrMult:   clp(nv('szAtrMult',1.0),0.1,5),\n"
)
assert OLD_CFG_WEIGHTS in html, '_cfg volMult/atrMult not found'
html = html.replace(OLD_CFG_WEIGHTS, '', 1)

# ── 3. SZ_IDS: remove szVolMult, szAtrMult ───────────────────────────────────
OLD_SZIDS_W = "    'szSens','szVolMult','szAtrMult','szVolMA','szMinLevel','szMaxZones',"
assert OLD_SZIDS_W in html, 'SZ_IDS weight entries not found'
html = html.replace(OLD_SZIDS_W, "    'szSens','szVolMA','szMinLevel','szMaxZones',", 1)

# ── 4. _detectAndBuild: novo sistema de scoring por Volume ATR ────────────────
OLD_SCORING = (
    '    /* volume MA */\n'
    '    var volMA=new Float64Array(n),vs=0;\n'
    '    for(var i=0;i<n;i++){vs+=cs[i].v;if(i>=MA_P)vs-=cs[i-MA_P].v;volMA[i]=vs/Math.min(i+1,MA_P);}\n'
    '\n'
    '    /* ATR */\n'
    '    var atrArr=new Float64Array(n),atrSum=0;\n'
    '    for(var i=0;i<n;i++){\n'
    '      var c=cs[i],pc=i>0?cs[i-1].c:c.o;\n'
    '      var tr=Math.max(c.h-c.l,Math.abs(c.h-pc),Math.abs(c.l-pc));\n'
    '      atrSum+=tr;\n'
    '      if(i>=ATR_P){var oc=cs[i-ATR_P],op2=i>ATR_P?cs[i-ATR_P-1].c:oc.o;atrSum-=Math.max(oc.h-oc.l,Math.abs(oc.h-op2),Math.abs(oc.l-op2));}\n'
    '      atrArr[i]=atrSum/Math.min(i+1,ATR_P);\n'
    '    }\n'
    '\n'
    '    /* level thresholds scaled by sensitivity */\n'
    '    var s=cfg.sens||1;\n'
    '    var T=[0,1.5*s,2.5*s,4.0*s,6.5*s,10.0*s];\n'
    '    var WARMUP=isNested?0:Math.max(MA_P,ATR_P);\n'
    '    var minLvl=isNested?cfg.nestMinLvl:cfg.minLevel;\n'
    '    var candidates=[];\n'
    '\n'
    '    for(var i=WARMUP;i<n;i++){\n'
    '      var c=cs[i],vm=volMA[i]||1,at=atrArr[i]||1;\n'
    '      var range=c.h-c.l,body=Math.abs(c.c-c.o);\n'
    '      var uw=c.h-Math.max(c.o,c.c),lw=Math.min(c.o,c.c)-c.l;\n'
    '      var vr=c.v/vm,rr=range/at;\n'
    '      var score=cfg.volMult*vr+cfg.atrMult*rr;\n'
    '      var br=range>1e-12?body/range:0;\n'
    '      if(br>0.62)score+=0.40;\n'
    '      var mw=Math.max(uw,lw);\n'
    '      if(range>1e-12&&mw/range>0.52)score+=0.25;\n'
    '      if(vr>3.5)score+=0.60;\n'
    '      if(c.delta&&Math.abs(c.delta)>c.v*0.35)score+=0.35;\n'
    '      var level=score<T[1]?0:score<T[2]?1:score<T[3]?2:score<T[4]?3:score<T[5]?4:5;\n'
    '      if(level<1||level<minLvl)continue;'
)
assert OLD_SCORING in html, 'scoring block not found'

NEW_SCORING = (
    '    /* volume MA */\n'
    '    var volMA=new Float64Array(n),vs=0;\n'
    '    for(var i=0;i<n;i++){vs+=cs[i].v;if(i>=MA_P)vs-=cs[i-MA_P].v;volMA[i]=vs/Math.min(i+1,MA_P);}\n'
    '\n'
    '    /* volume ATR = rolling mean of |v[i] - v[i-1]| */\n'
    '    var volATR=new Float64Array(n),vaS=0;\n'
    '    for(var i=0;i<n;i++){\n'
    '      var vd=i>0?Math.abs(cs[i].v-cs[i-1].v):0;\n'
    '      vaS+=vd;if(i>=MA_P)vaS-=(i-MA_P>0?Math.abs(cs[i-MA_P].v-cs[i-MA_P-1].v):0);\n'
    '      volATR[i]=vaS/Math.min(i+1,MA_P);\n'
    '    }\n'
    '\n'
    '    /* price ATR (still needed for zone sizing) */\n'
    '    var atrArr=new Float64Array(n),atrSum=0;\n'
    '    for(var i=0;i<n;i++){\n'
    '      var c=cs[i],pc=i>0?cs[i-1].c:c.o;\n'
    '      var tr=Math.max(c.h-c.l,Math.abs(c.h-pc),Math.abs(c.l-pc));\n'
    '      atrSum+=tr;\n'
    '      if(i>=ATR_P){var oc=cs[i-ATR_P],op2=i>ATR_P?cs[i-ATR_P-1].c:oc.o;atrSum-=Math.max(oc.h-oc.l,Math.abs(oc.h-op2),Math.abs(oc.l-op2));}\n'
    '      atrArr[i]=atrSum/Math.min(i+1,ATR_P);\n'
    '    }\n'
    '\n'
    '    /* level thresholds: (vol - volMA) / volATR vs multiples of 1.5 scaled by sens */\n'
    '    var s=cfg.sens||1;\n'
    '    var WARMUP=isNested?0:Math.max(MA_P,ATR_P);\n'
    '    var minLvl=isNested?cfg.nestMinLvl:cfg.minLevel;\n'
    '    var candidates=[];\n'
    '\n'
    '    for(var i=WARMUP;i<n;i++){\n'
    '      var c=cs[i],vm=volMA[i]||1,at=atrArr[i]||1,va=volATR[i];\n'
    '      var uw=c.h-Math.max(c.o,c.c),lw=Math.min(c.o,c.c)-c.l;\n'
    '      if(c.v<=vm)continue; /* must be above average volume */\n'
    '      var ex=va>0?(c.v-vm)/va:0; /* excess in volATR units */\n'
    '      var level=ex>=6.0*s?5:ex>=4.5*s?4:ex>=3.0*s?3:ex>=1.5*s?2:1;\n'
    '      if(level<minLvl)continue;'
)
html = html.replace(OLD_SCORING, NEW_SCORING, 1)

# ── 5. Remover rawScore=score (agora usa rawScore=ex) ────────────────────────
OLD_CAND_PUSH = (
    '      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:score,'
)
assert OLD_CAND_PUSH in html, 'candidates.push rawScore not found'
html = html.replace(OLD_CAND_PUSH,
    '      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:ex,',
    1
)

# ── 6. Cache key: remove cfg.volMult, cfg.atrMult ────────────────────────────
OLD_CK_WEIGHTS = "            cfg.minLevel,cfg.sens,cfg.volMult,cfg.atrMult,cfg.volMA,"
assert OLD_CK_WEIGHTS in html, 'cache key volMult not found'
html = html.replace(OLD_CK_WEIGHTS,
    "            cfg.minLevel,cfg.sens,cfg.volMA,", 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_142.py applied — Beta 0.142')
print('  - Removed: szVolMult, szAtrMult (peso volume/ATR range)')
print('  + volATR = rolling mean of |v[i]-v[i-1]| (mesmo período da volMA)')
print('  + Níveis por excess = (vol - volMA) / volATR:')
print('    L1: vol > volMA  (qualquer excesso)')
print('    L2: excess >= 1.5 × s')
print('    L3: excess >= 3.0 × s')
print('    L4: excess >= 4.5 × s')
print('    L5: excess >= 6.0 × s')
print('  + szSens ainda escala todos os thresholds')
