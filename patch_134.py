#!/usr/bin/env python3
"""patch_134.py — Beta 0.134: Spike Zones — High Volume Segment (Zone Source)"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.133') >= 10
html = html.replace('Beta 0.133', 'Beta 0.134')

# ── 1. HTML: szSource select — add HVS option ────────────────────────────────
OLD_SOURCE_SELECT = (
    '            <div class="kv"><span class="k">Fonte da zona</span>\n'
    '              <select class="select" id="szSource" style="width:108px">\n'
    '                <option value="full" selected>Candle completo</option>\n'
    '                <option value="body">Corpo</option>\n'
    '                <option value="wick_dom">Pavio dominante</option>\n'
    '              </select>\n'
    '            </div>'
)
assert OLD_SOURCE_SELECT in html, 'szSource select not found'

NEW_SOURCE_SELECT = (
    '            <div class="kv"><span class="k">Fonte da zona</span>\n'
    '              <select class="select" id="szSource" style="width:108px">\n'
    '                <option value="full" selected>Candle completo</option>\n'
    '                <option value="body">Corpo</option>\n'
    '                <option value="wick_dom">Pavio dominante</option>\n'
    '                <option value="hvs">High Volume Segment</option>\n'
    '              </select>\n'
    '            </div>\n'
    '            <div class="kv"><span class="k">HVS: dominância mín.</span>\n'
    '              <select class="select" id="szHvsDomMin" style="width:72px">\n'
    '                <option value="0.20">20%</option>\n'
    '                <option value="0.30" selected>30%</option>\n'
    '                <option value="0.40">40%</option>\n'
    '                <option value="0.50">50%</option>\n'
    '              </select>\n'
    '            </div>\n'
    '            <div class="kv"><span class="k">HVS: largura</span>\n'
    '              <select class="select" id="szHvsWidth" style="width:90px">\n'
    '                <option value="auto" selected>Auto</option>\n'
    '                <option value="narrow">Narrow</option>\n'
    '                <option value="medium">Medium</option>\n'
    '                <option value="wide">Wide</option>\n'
    '              </select>\n'
    '            </div>\n'
    '            <div class="kv"><span class="k">HVS: sensibilidade</span>\n'
    '              <select class="select" id="szHvsSens" style="width:90px">\n'
    '                <option value="low">Baixa</option>\n'
    '                <option value="medium" selected>Média</option>\n'
    '                <option value="high">Alta</option>\n'
    '              </select>\n'
    '            </div>'
)
html = html.replace(OLD_SOURCE_SELECT, NEW_SOURCE_SELECT, 1)

# ── 2. Script: _cfg() — add HVS settings ─────────────────────────────────────
OLD_CFG_TAIL = "      nestStyle: sv('szNestStyle','dashed')\n    };\n  }"
assert OLD_CFG_TAIL in html, '_cfg tail not found'
NEW_CFG_TAIL = ("      nestStyle: sv('szNestStyle','dashed'),\n"
                "      hvsDomMin: clp(parseFloat(sv('szHvsDomMin','0.30'))||0.30,0.10,0.80),\n"
                "      hvsWidth:  sv('szHvsWidth','auto'),\n"
                "      hvsSens:   sv('szHvsSens','medium')\n"
                "    };\n  }")
html = html.replace(OLD_CFG_TAIL, NEW_CFG_TAIL, 1)

# ── 3. Script: HVS helper functions — inject before _detectAndBuild ──────────
OLD_DETECT_ANCHOR = "  /* ── Core spike detection (works for main and nested) ── */"
assert OLD_DETECT_ANCHOR in html, 'detect anchor not found'

HVS_FUNCTIONS = """\
  /* ── High Volume Segment helpers ── */
  function _hvsLoc(c,lo,hi){
    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),mid=(hi+lo)/2;
    if(mid>bHi)return'upperWick';if(mid<bLo)return'lowerWick';return'body';
  }

  function _hvsFromFP(c,cfg){
    /* Use real footprint data if available */
    var fp=c.fp;if(!fp||fp.size<3)return null;
    var entries=[];
    fp.forEach(function(vd,p){
      var v=vd&&typeof vd==='object'?(+(vd.buy||0)++(vd.sell||0)):+vd||0;
      if(v>0)entries.push({p:+p,v:v});
    });
    if(entries.length<3)return null;
    entries.sort(function(a,b){return a.p-b.p;});
    var tot=entries.reduce(function(s,e){return s+e.v;},0);
    if(!tot)return null;
    var pIdx=0;for(var k=1;k<entries.length;k++)if(entries[k].v>entries[pIdx].v)pIdx=k;
    var poc=entries[pIdx].p,cv=entries[pIdx].v,lo_=pIdx,hi_=pIdx;
    var minD=cfg.hvsDomMin||0.30;
    while(cv/tot<minD){
      var aL=lo_>0?entries[lo_-1].v:0,aH=hi_<entries.length-1?entries[hi_+1].v:0;
      if(!aL&&!aH)break;
      if(aL>=aH&&lo_>0){lo_--;cv+=entries[lo_].v;}
      else if(hi_<entries.length-1){hi_++;cv+=entries[hi_].v;}
      else if(lo_>0){lo_--;cv+=entries[lo_].v;}
      else break;
    }
    var cLo=entries[lo_].p,cHi=entries[hi_].p;
    if(cHi<=cLo)cHi=cLo+c.atr*0.02||cLo*(1+1e-4);
    return{hi:cHi,lo:cLo,pocPrice:poc,location:_hvsLoc(c,cLo,cHi),source:'footprint',volPct:cv/tot};
  }

  function _hvsEstimate(c,at,cfg){
    /* Heuristic estimation when no footprint */
    var range=c.h-c.l;if(range<1e-12)return null;
    var bHi=Math.max(c.o,c.c),bLo=Math.min(c.o,c.c),bR=bHi-bLo;
    var uw=c.h-bHi,lw=bLo-c.l;
    var bPct=bR/range,uwPct=uw/range,lwPct=lw/range;
    var sens=cfg.hvsSens||'medium';
    var wickCapture=sens==='high'?0.42:sens==='low'?0.68:0.54;
    var loc,hi,lo,poc;
    if(bPct>0.40){
      loc='body';poc=c.c;
      var hw=Math.max(bR*0.55,at*0.04);
      hi=Math.min(c.h,poc+hw);lo=Math.max(c.l,poc-hw);
    }else if(uwPct>lwPct&&uwPct>0.28){
      loc='upperWick';hi=c.h;lo=c.h-uw*wickCapture;poc=(hi+lo)/2;
    }else if(lwPct>uwPct&&lwPct>0.28){
      loc='lowerWick';lo=c.l;hi=c.l+lw*wickCapture;poc=(hi+lo)/2;
    }else{
      loc='body';hi=bHi;lo=bLo;poc=(hi+lo)/2;
      if(hi<=lo){hi=poc+at*0.08;lo=poc-at*0.08;}
    }
    var vPct=Math.max(bPct,uwPct,lwPct);
    return{hi:hi,lo:lo,pocPrice:poc||((hi+lo)/2),location:loc,source:'estimated',volPct:vPct};
  }

  function _computeHVS(c,at,cfg){
    var r=_hvsFromFP(c,cfg)||_hvsEstimate(c,at,cfg);
    if(!r)return null;
    /* apply width override */
    var w=cfg.hvsWidth||'auto';
    if(w!=='auto'){
      var h=w==='narrow'?at*0.12:w==='wide'?at*0.35:at*0.21;
      r.hi=r.pocPrice+h;r.lo=r.pocPrice-h;
    }
    r.segmentHigh=r.hi;r.segmentLow=r.lo;r.segmentVolPct=r.volPct;
    return r;
  }

"""
html = html.replace(OLD_DETECT_ANCHOR, HVS_FUNCTIONS + OLD_DETECT_ANCHOR, 1)

# ── 4. Script: _detectAndBuild — update source calculation + candidates.push ──
OLD_SOURCE_CALC = (
    "      var dir=c.c>c.o?'bull':c.c<c.o?'bear':'neutral';\n"
    "      var pad=at*(cfg.atrPad||0);\n"
    "      var hi,lo;\n"
    "      if(cfg.source==='body'){hi=Math.max(c.o,c.c)+pad;lo=Math.min(c.o,c.c)-pad;}\n"
    "      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h+pad;lo=Math.max(c.o,c.c)-pad;}else{hi=Math.min(c.o,c.c)+pad;lo=c.l-pad;}}\n"
    "      else{hi=c.h+pad;lo=c.l-pad;}\n"
    "      if(hi<=lo)lo=hi-at*0.01;\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:score,hi:hi,lo:lo,mid:(hi+lo)/2,dir:dir,vol:c.v,atr:at});"
)
assert OLD_SOURCE_CALC in html, 'source calc block not found'

NEW_SOURCE_CALC = (
    "      var dir=c.c>c.o?'bull':c.c<c.o?'bear':'neutral';\n"
    "      var pad=at*(cfg.atrPad||0);\n"
    "      var hi,lo,hvsMeta=null;\n"
    "      if(cfg.source==='body'){hi=Math.max(c.o,c.c)+pad;lo=Math.min(c.o,c.c)-pad;}\n"
    "      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h+pad;lo=Math.max(c.o,c.c)-pad;}else{hi=Math.min(c.o,c.c)+pad;lo=c.l-pad;}}\n"
    "      else if(cfg.source==='hvs'){\n"
    "        var _hvs=_computeHVS(c,at,cfg);\n"
    "        if(_hvs&&_hvs.volPct>=cfg.hvsDomMin){hi=_hvs.hi+pad;lo=_hvs.lo-pad;hvsMeta=_hvs;}\n"
    "        else{hi=Math.max(c.o,c.c)+pad;lo=Math.min(c.o,c.c)-pad;hvsMeta={pocPrice:(c.o+c.c)/2,location:'body',source:'fallback',volPct:0};}\n"
    "      }\n"
    "      else{hi=c.h+pad;lo=c.l-pad;}\n"
    "      if(hi<=lo)lo=hi-at*0.01;\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:score,hi:hi,lo:lo,mid:(hi+lo)/2,dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta});"
)
html = html.replace(OLD_SOURCE_CALC, NEW_SOURCE_CALC, 1)

# ── 5. Script: draw label — add HV/~HV tag ───────────────────────────────────
OLD_LABEL = (
    "        var parts=['L'+z.level];\n"
    "        if(cfg.labTF&&usingMTF)parts.push(tf.toUpperCase());\n"
    "        if(cfg.labVol&&z.vol>0)parts.push('$'+_nf(z.vol));"
)
assert OLD_LABEL in html, 'draw label not found'
NEW_LABEL = (
    "        var parts=['L'+z.level];\n"
    "        if(cfg.labTF&&usingMTF)parts.push(tf.toUpperCase());\n"
    "        if(z.hvsMeta&&z.hvsMeta.source!=='fallback')parts.push(z.hvsMeta.source==='footprint'?'HV':'~HV');\n"
    "        if(cfg.labVol&&z.vol>0)parts.push('$'+_nf(z.vol));"
)
html = html.replace(OLD_LABEL, NEW_LABEL, 1)

# ── 6. Script: cache key — add HVS settings ──────────────────────────────────
OLD_CK = (
    "            cfg.maxZones,cfg.maxScan,cfg.source,cfg.atrPad,\n"
    "            cfg.mergeDist,cfg.expire,cfg.maxTests,"
)
assert OLD_CK in html, 'cache key line not found'
NEW_CK = (
    "            cfg.maxZones,cfg.maxScan,cfg.source,cfg.atrPad,\n"
    "            cfg.hvsDomMin,cfg.hvsWidth,cfg.hvsSens,\n"
    "            cfg.mergeDist,cfg.expire,cfg.maxTests,"
)
html = html.replace(OLD_CK, NEW_CK, 1)

# ── 7. Script: SZ_IDS — add HVS inputs ───────────────────────────────────────
OLD_SZIDS_LINE = (
    "    'szMaxScan','szSource','szAtrPad','szMerge','szExpire','szMaxTests',"
)
assert OLD_SZIDS_LINE in html, 'SZ_IDS line not found'
NEW_SZIDS_LINE = (
    "    'szMaxScan','szSource','szAtrPad','szMerge','szExpire','szMaxTests',\n"
    "    'szHvsDomMin','szHvsWidth','szHvsSens',"
)
html = html.replace(OLD_SZIDS_LINE, NEW_SZIDS_LINE, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_134.py applied — Beta 0.134')
print('  + szSource: nova opção "High Volume Segment" (value=hvs)')
print('  + szHvsDomMin: dominância mínima do cluster (20/30/40/50%)')
print('  + szHvsWidth: largura da zona HVS (Auto/Narrow/Medium/Wide)')
print('  + szHvsSens: sensibilidade do cluster (Baixa/Média/Alta)')
print('  + _hvsFromFP(): usa footprint real (candle.fp Map) se disponível')
print('  + _hvsEstimate(): fallback heurístico (corpo/pavio dominante)')
print('  + _computeHVS(): wrapper com override de largura')
print('  + _detectAndBuild(): source=hvs usa HVS; fallback para body se volPct < domMin')
print('  + label: appends HV (footprint real) ou ~HV (estimado) quando HVS ativo')
