#!/usr/bin/env python3
"""patch_151.py — Beta 0.151: Spike Zones HVS-Only mode
   New source option 'hvs_only' draws ONLY the inner volume core (HVS).
   No parent zone, no ATR cap, no merge. Box at origin, projects right.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.150') >= 10, 'Beta 0.150 not found'
html = html.replace('Beta 0.150', 'Beta 0.151')

# ── 1. Add 'hvs_only' option to szSource select ──────────────────────────────────
OLD_SOURCE_OPT = '                <option value="hvs">High Volume Segment</option>\n              </select>'
assert OLD_SOURCE_OPT in html, 'szSource select anchor not found'
NEW_SOURCE_OPT = (
    '                <option value="hvs">High Volume Segment</option>\n'
    '                <option value="hvs_only">HVS Only (core)</option>\n'
    '              </select>'
)
html = html.replace(OLD_SOURCE_OPT, NEW_SOURCE_OPT, 1)

# ── 2. _detectAndBuild: add hvsOnly flag, skip ATR cap ───────────────────────────
# Replace the source-selection block
OLD_SRC = (
    "      var hi,lo,hvsMeta=null;\n"
    "      if(cfg.source==='body'){hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);}\n"
    "      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h;lo=Math.max(c.o,c.c);}else{hi=Math.min(c.o,c.c);lo=c.l;}}\n"
    "      else if(cfg.source==='hvs'){\n"
    "        var _hvs=_computeHVS(c,at,cfg);\n"
    "        if(_hvs&&_hvs.volPct>=cfg.hvsDomMin){hi=_hvs.hi;lo=_hvs.lo;hvsMeta=_hvs;}\n"
    "        else{hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);hvsMeta={pocPrice:(c.o+c.c)/2,location:'body',source:'fallback',volPct:0};}\n"
    "      }\n"
    "      else{hi=c.h;lo=c.l;}\n"
    "      if(hi<=lo)lo=hi-at*0.01;\n"
    "      /* cap zone height at 1.5×ATR — prevents absurdly large zones from spike candles */\n"
    "      if(at>0&&(hi-lo)>at*1.5){var _zm=(Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;hi=_zm+at*0.75;lo=_zm-at*0.75;}\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:ex,hi:hi,lo:lo,mid:(hi+lo)/2,dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta});"
)
assert OLD_SRC in html, 'source block anchor not found'
NEW_SRC = (
    "      var hi,lo,hvsMeta=null,hvsOnly=(cfg.source==='hvs_only');\n"
    "      if(hvsOnly||cfg.source==='hvs'){\n"
    "        var _hvs=_computeHVS(c,at,cfg);\n"
    "        if(_hvs&&_hvs.volPct>=cfg.hvsDomMin){hi=_hvs.hi;lo=_hvs.lo;hvsMeta=_hvs;}\n"
    "        else{hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);hvsMeta={pocPrice:(c.o+c.c)/2,location:'body',source:'fallback',volPct:0};}\n"
    "      }\n"
    "      else if(cfg.source==='body'){hi=Math.max(c.o,c.c);lo=Math.min(c.o,c.c);}\n"
    "      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h;lo=Math.max(c.o,c.c);}else{hi=Math.min(c.o,c.c);lo=c.l;}}\n"
    "      else{hi=c.h;lo=c.l;}\n"
    "      if(hi<=lo)lo=hi-at*0.01;\n"
    "      /* ATR cap skipped in hvs_only — the HVS inner core is already tight */\n"
    "      if(!hvsOnly&&at>0&&(hi-lo)>at*1.5){var _zm=(Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;hi=_zm+at*0.75;lo=_zm-at*0.75;}\n"
    "      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:ex,hi:hi,lo:lo,mid:(hi+lo)/2,dir:dir,vol:c.v,atr:at,hvsMeta:hvsMeta,hvsOnly:hvsOnly});"
)
html = html.replace(OLD_SRC, NEW_SRC, 1)

# ── 3. Merge: skip merge entirely for hvs_only ────────────────────────────────────
OLD_MERGE_HDR = (
    "    /* merge overlapping/nearby */\n"
    "    var used=new Uint8Array(candidates.length),merged=[];\n"
    "    for(var i=0;i<candidates.length;i++){\n"
    "      if(used[i])continue;\n"
    "      var z=Object.assign({},candidates[i]);\n"
    "      z.srcIdxs=[z.srcIdx]; /* track all merged source candles */\n"
    "      var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);\n"
    "      for(var j=i+1;j<candidates.length;j++){\n"
    "        if(used[j])continue;\n"
    "        var z2=candidates[j];\n"
    "        if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){\n"
    "          used[j]=1;\n"
    "          z.srcIdxs.push(z2.srcIdx);\n"
    "          if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}\n"
    "          z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;z.vol=Math.max(z.vol,z2.vol);\n"
    "        }\n"
    "      }\n"
    "      merged.push(z);\n"
    "    }"
)
assert OLD_MERGE_HDR in html, 'merge block anchor not found'
NEW_MERGE_HDR = (
    "    /* merge overlapping/nearby (skipped for hvs_only — each core stays independent) */\n"
    "    var _isHvsOnly=candidates.length>0&&candidates[0].hvsOnly;\n"
    "    var used=new Uint8Array(candidates.length),merged=[];\n"
    "    for(var i=0;i<candidates.length;i++){\n"
    "      if(used[i])continue;\n"
    "      var z=Object.assign({},candidates[i]);\n"
    "      z.srcIdxs=[z.srcIdx];\n"
    "      if(!_isHvsOnly){\n"
    "        var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);\n"
    "        for(var j=i+1;j<candidates.length;j++){\n"
    "          if(used[j])continue;\n"
    "          var z2=candidates[j];\n"
    "          if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){\n"
    "            used[j]=1;\n"
    "            z.srcIdxs.push(z2.srcIdx);\n"
    "            if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}\n"
    "            z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;z.vol=Math.max(z.vol,z2.vol);\n"
    "          }\n"
    "        }\n"
    "      }\n"
    "      merged.push(z);\n"
    "    }"
)
html = html.replace(OLD_MERGE_HDR, NEW_MERGE_HDR, 1)

# ── 4. drawSpikeZones: set isHvsOnlyDraw flag after textBaseline line ─────────────
OLD_TBSL = "    ctx.textBaseline='middle'; /* ensures vertical centering for all text */\n\n    /* ══ MAIN ZONES ══ */"
assert OLD_TBSL in html, 'textBaseline anchor not found'
NEW_TBSL = "    ctx.textBaseline='middle'; /* ensures vertical centering for all text */\n    var isHvsOnlyDraw=main.length>0&&!!main[0].hvsOnly;\n\n    /* ══ MAIN ZONES ══ */"
html = html.replace(OLD_TBSL, NEW_TBSL, 1)

# ── 5. Insert hvs-only branch BEFORE the /* fill */ comment ──────────────────────
OLD_FILL_COMMENT = (
    "      /* fill */\n"
    "      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fillOp.toFixed(3)+')';\n"
    "      ctx.fillRect(xL,y1,xR-xL,boxH);"
)
assert OLD_FILL_COMMENT in html, 'fill comment anchor not found'
NEW_FILL_WITH_BRANCH = (
    "      if(isHvsOnlyDraw){\n"
    "        /* HVS-ONLY: tight inner core box — no parent zone, clean premium visual */\n"
    "        var coreH=Math.max(2,boxH);\n"
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(fillOp*2.2).toFixed(3)+')';\n"
    "        ctx.fillRect(xL,y1,xR-xL,coreH);\n"
    "        ctx.lineWidth=1.5;ctx.setLineDash([]);\n"
    "        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(0.95,strOp*1.4).toFixed(3)+')';\n"
    "        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();\n"
    "        ctx.lineWidth=1;\n"
    "        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.70).toFixed(3)+')';\n"
    "        ctx.beginPath();ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();\n"
    "        ctx.lineWidth=1.5;\n"
    "        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(0.9,strOp*1.2).toFixed(3)+')';\n"
    "        ctx.beginPath();ctx.moveTo(xL+bwPx*0.5,y1);ctx.lineTo(xL+bwPx*0.5,y2);ctx.stroke();\n"
    "        if(z.level>=3&&recency>0.4){\n"
    "          ctx.save();ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.60)';ctx.shadowBlur=4;\n"
    "          ctx.lineWidth=1;ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+',0.50)';\n"
    "          ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();\n"
    "          ctx.restore();ctx.setLineDash([]);\n"
    "        }\n"
    "        if(cfg.labOn&&coreH>4){\n"
    "          var ym=y1+coreH/2;\n"
    "          var hvsLbl=(z.hvsMeta&&z.hvsMeta.source==='footprint'?'HV CORE':'~HV CORE')+' L'+z.level;\n"
    "          ctx.font='bold 6px monospace';ctx.textAlign='left';\n"
    "          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.2).toFixed(3)+')';\n"
    "          ctx.fillText(hvsLbl,xL+5,ym);\n"
    "          if(cfg.labVol&&z.vol>0){\n"
    "            ctx.font='6px monospace';\n"
    "            ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.75).toFixed(3)+')';\n"
    "            ctx.fillText(' $'+_nf(z.vol),xL+5+ctx.measureText(hvsLbl).width,ym);\n"
    "          }\n"
    "        }\n"
    "        if(coreH>4){\n"
    "          ctx.font='bold 6px monospace';ctx.textAlign='right';\n"
    "          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';\n"
    "          ctx.fillText('L'+z.level,W-rp-3,y1+coreH/2);\n"
    "        }\n"
    "      } else {\n"
    "      /* fill */\n"
    "      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fillOp.toFixed(3)+')';\n"
    "      ctx.fillRect(xL,y1,xR-xL,boxH);"
)
html = html.replace(OLD_FILL_COMMENT, NEW_FILL_WITH_BRANCH, 1)

# ── 6. Close the else branch at end of zone loop (before NESTED ZONES) ───────────
OLD_LOOP_END = "    }\n\n    /* ══ NESTED ZONES ══ */"
assert OLD_LOOP_END in html, 'loop end anchor not found'
NEW_LOOP_END = "      } /* end normal mode */\n    }\n\n    /* ══ NESTED ZONES ══ */"
html = html.replace(OLD_LOOP_END, NEW_LOOP_END, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_151.py applied — Beta 0.151')
print('  + Spike Zones: new source "HVS Only (core)" in dropdown')
print('  + hvs_only: no merge, no ATR cap — draws only tight inner volume core')
print('  + hvs_only visual: strong fill, sharp top border, vertical origin bar, 6px label')
print('  + normal mode unchanged')
