#!/usr/bin/env python3
"""patch_177.py — Beta 0.177: Spike Zones — modo "Só Concentração"

Novo toggle szOnlyNeedle:
  - Quando ON: apaga o box grande da zona e exibe apenas o box de
    concentração de volume (needle zone — miolo de maior densidad).
  - Se o needle não estiver disponível para uma zona, desenha um
    box fino centrado no mid da zona como fallback.
  - Labels (nível, status) movem-se para o centro do box de concentração.
  - O needle é computado automaticamente quando onlyNeedle=true, mesmo
    que "Needle On" esteja desativado no painel.
  - Cache invalida ao mudar o toggle (onlyNeedle entra na cache key).

Sem alterar detecção, sensibilidade ou qualquer outra feature.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.176') >= 10, f'Beta 0.176 not found (count={html.count("Beta 0.176")})'
html = html.replace('Beta 0.176', 'Beta 0.177')

# ── 1. _cfg(): adiciona onlyNeedle ────────────────────────────────────────────
OLD_NEEDLE_MODE_CFG = "      needleMode:  sv('szNeedleMode','inside'),"
assert OLD_NEEDLE_MODE_CFG in html, '_cfg needleMode anchor not found'
html = html.replace(OLD_NEEDLE_MODE_CFG,
    "      needleMode:  sv('szNeedleMode','inside'),\n"
    "      onlyNeedle:  bv('szOnlyNeedle',false),",
    1
)

# ── 2. Cache key: adiciona onlyNeedle ─────────────────────────────────────────
OLD_CK_NEEDLE = (
    "            cfg.needleOn?1:0,cfg.needleCapt,cfg.needleMinA,cfg.needleMaxA,"
    "cfg.needleFP?1:0,cfg.needleEst?1:0,"
)
assert OLD_CK_NEEDLE in html, 'cache key needle anchor not found'
html = html.replace(OLD_CK_NEEDLE,
    "            cfg.needleOn?1:0,cfg.needleCapt,cfg.needleMinA,cfg.needleMaxA,"
    "cfg.needleFP?1:0,cfg.needleEst?1:0,cfg.onlyNeedle?1:0,",
    1
)

# ── 3. _detectAndBuild: force needle computation quando onlyNeedle ────────────
OLD_NEEDLE_COMP = (
    '      var _needle=cfg.needleOn?_refineToNeedleZone(c,at,cfg,rawHi,rawLo):null;'
)
assert OLD_NEEDLE_COMP in html, 'needle computation anchor not found'
html = html.replace(OLD_NEEDLE_COMP,
    '      var _needle=(cfg.needleOn||cfg.onlyNeedle)?_refineToNeedleZone(c,at,cfg,rawHi,rawLo):null;',
    1
)

# ── 4. Draw: _conY tracker + wrap fill/borders/glow em if(!onlyNeedle) ────────
OLD_DRAW_ELSE = (
    '      } else {\n'
    '      /* fill */\n'
    '      ctx.fillStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+fillOp.toFixed(3)+\')\';'
    '\n'
    '      ctx.fillRect(xL,y1,xR-xL,boxH);\n'
    '\n'
    '      /* borders */\n'
    '      ctx.lineWidth=z.level>=5?2.5:z.level>=3?1.5:1;\n'
    '      ctx.setLineDash(z.status===\'weakened\'?[3,3]:[]);\n'
    '      ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+strOp.toFixed(3)+\')\';\n'
    '      ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();\n'
    '      ctx.setLineDash([]);\n'
    '      /* center line — dashed */\n'
    '      if(boxH>3){ctx.lineWidth=0.6;ctx.setLineDash([2,3]);ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+(strOp*0.45).toFixed(3)+\')\';ctx.beginPath();ctx.moveTo(xL,y1+boxH/2);ctx.lineTo(xR,y1+boxH/2);ctx.stroke();ctx.setLineDash([]);}\n'
    '\n'
    '      /* glow for fresh L3+ recent zones */\n'
    '      if(z.status===\'fresh\'&&z.level>=3&&recency>0.5){\n'
    '        ctx.save();\n'
    '        ctx.shadowColor=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',0.55)\';ctx.shadowBlur=5;\n'
    '        ctx.lineWidth=1;ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+(strOp*0.5).toFixed(3)+\')\';\n'
    '        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();\n'
    '        ctx.restore();ctx.setLineDash([]);\n'
    '      }\n'
    '\n'
    '      /* ── Needle Volume Core — miolo interno de maior concentração ── */\n'
    '      if(_nMode!==\'off\'&&z.needleHi!=null&&z.needleLo!=null){'
)
assert OLD_DRAW_ELSE in html, 'draw else section anchor not found'
html = html.replace(OLD_DRAW_ELSE,
    '      } else {\n'
    '      var _conY=y1+boxH/2;/* concentration label y-center */\n'
    '      if(!cfg.onlyNeedle){\n'
    '      /* fill */\n'
    '      ctx.fillStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+fillOp.toFixed(3)+\')\';\n'
    '      ctx.fillRect(xL,y1,xR-xL,boxH);\n'
    '\n'
    '      /* borders */\n'
    '      ctx.lineWidth=z.level>=5?2.5:z.level>=3?1.5:1;\n'
    '      ctx.setLineDash(z.status===\'weakened\'?[3,3]:[]);\n'
    '      ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+strOp.toFixed(3)+\')\';\n'
    '      ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();\n'
    '      ctx.setLineDash([]);\n'
    '      /* center line — dashed */\n'
    '      if(boxH>3){ctx.lineWidth=0.6;ctx.setLineDash([2,3]);ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+(strOp*0.45).toFixed(3)+\')\';ctx.beginPath();ctx.moveTo(xL,y1+boxH/2);ctx.lineTo(xR,y1+boxH/2);ctx.stroke();ctx.setLineDash([]);}\n'
    '\n'
    '      /* glow for fresh L3+ recent zones */\n'
    '      if(z.status===\'fresh\'&&z.level>=3&&recency>0.5){\n'
    '        ctx.save();\n'
    '        ctx.shadowColor=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',0.55)\';ctx.shadowBlur=5;\n'
    '        ctx.lineWidth=1;ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+(strOp*0.5).toFixed(3)+\')\';\n'
    '        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();\n'
    '        ctx.restore();ctx.setLineDash([]);\n'
    '      }\n'
    '      }/* end !onlyNeedle */\n'
    '\n'
    '      /* ── Needle Volume Core — miolo interno de maior concentração ── */\n'
    '      if((cfg.onlyNeedle||_nMode!==\'off\')&&z.needleHi!=null&&z.needleLo!=null){',
    1
)

# ── 5. Draw: marca _conY com o centro do needle quando onlyNeedle ─────────────
OLD_NEEDLE_FILL = (
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+_nFillOp.toFixed(3)+')';\n"
    "        ctx.fillRect(xL,ny1,xR-xL,_nH);\n"
    "        /* bordas top/bottom do miolo */"
)
assert OLD_NEEDLE_FILL in html, 'needle fillRect anchor not found'
html = html.replace(OLD_NEEDLE_FILL,
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+_nFillOp.toFixed(3)+')';\n"
    "        ctx.fillRect(xL,ny1,xR-xL,_nH);\n"
    "        if(cfg.onlyNeedle)_conY=ny1+_nH/2;\n"
    "        /* bordas top/bottom do miolo */",
    1
)

# ── 6. Draw: fallback box quando onlyNeedle e needle não disponível ───────────
OLD_AFTER_NEEDLE = (
    '      }\n'
    '\n'
    '      /* label — perfectly centred (textBaseline=middle) */\n'
    '      if(cfg.showLabels){\n'
    '        var ym=y1+boxH/2; /* exact vertical centre */'
)
assert OLD_AFTER_NEEDLE in html, 'after needle / label anchor not found'
html = html.replace(OLD_AFTER_NEEDLE,
    '      } else if(cfg.onlyNeedle){\n'
    '        /* onlyNeedle fallback: thin mid box (needle data not available) */\n'
    '        var _fbH=Math.max(3,Math.round(boxH*0.18));\n'
    '        var _fbY=Math.round(y1+boxH/2-_fbH/2);\n'
    '        ctx.fillStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+Math.min(0.92,cfg.fillOpacity*2.2).toFixed(3)+\')\';\n'
    '        ctx.fillRect(xL,_fbY,xR-xL,_fbH);\n'
    '        ctx.lineWidth=1;ctx.strokeStyle=\'rgba(\'+col.r+\',\'+col.g+\',\'+col.b+\',\'+Math.min(0.92,cfg.borderOpacity*1.4).toFixed(3)+\')\';\n'
    '        ctx.beginPath();ctx.moveTo(xL,_fbY);ctx.lineTo(xR,_fbY);ctx.moveTo(xL,_fbY+_fbH);ctx.lineTo(xR,_fbY+_fbH);ctx.stroke();\n'
    '      }\n'
    '\n'
    '      /* label — perfectly centred (textBaseline=middle) */\n'
    '      if(cfg.showLabels){\n'
    '        var ym=_conY; /* zone mid, or needle mid in onlyNeedle mode */',
    1
)

# ── 7. Draw: right-edge label usa _conY em vez de y1+boxH/2 ──────────────────
OLD_RLEDGE = (
    "      if(cfg.showLabels&&boxH>4){\n"
    "        ctx.font='bold 7px monospace';ctx.textAlign='right';\n"
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';\n"
    "        ctx.fillText('L'+z.level,W-rp-3,y1+boxH/2);\n"
    "      }"
)
assert OLD_RLEDGE in html, 'right-edge label anchor not found'
html = html.replace(OLD_RLEDGE,
    "      if(cfg.showLabels&&boxH>4){\n"
    "        ctx.font='bold 7px monospace';ctx.textAlign='right';\n"
    "        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';\n"
    "        ctx.fillText('L'+z.level,W-rp-3,_conY);\n"
    "      }",
    1
)

# ── 8. HTML: checkbox "Só concentração" antes de "Needle On" ─────────────────
OLD_NEEDLE_ON_HTML = (
    '            <label class="kv" style="cursor:pointer;"><span class="k">Needle On</span>'
    '<input type="checkbox" id="szNeedleOn" checked style="width:14px;height:14px;'
    'accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>'
)
assert OLD_NEEDLE_ON_HTML in html, 'Needle On HTML anchor not found'
html = html.replace(OLD_NEEDLE_ON_HTML,
    '            <label class="kv" style="cursor:pointer;">'
    '<span class="k">Só concentração</span>'
    '<input type="checkbox" id="szOnlyNeedle" '
    'style="width:14px;height:14px;accent-color:#f59e0b;cursor:pointer;flex-shrink:0;">'
    '</label>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Needle On</span>'
    '<input type="checkbox" id="szNeedleOn" checked style="width:14px;height:14px;'
    'accent-color:#00d7ff;cursor:pointer;flex-shrink:0;"></label>',
    1
)

# ── 9. SZ_IDS: adiciona szOnlyNeedle ─────────────────────────────────────────
OLD_SZIDS_NEEDLE = "  'szNeedleOn','szNeedleCapture',"
assert OLD_SZIDS_NEEDLE in html, 'SZ_IDS needle anchor not found'
html = html.replace(OLD_SZIDS_NEEDLE,
    "  'szOnlyNeedle','szNeedleOn','szNeedleCapture',",
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_177.py applied — Beta 0.177')
print('  Novo toggle: "Só concentração" (szOnlyNeedle)')
print('  ON: apaga zona grande, mostra só o box de concentração (needle)')
print('  Needle auto-ativado para computação quando onlyNeedle=true')
print('  Fallback: box fino centrado no mid quando needle não disponível')
print('  Labels movem-se para o centro do box de concentração')
