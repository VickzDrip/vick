#!/usr/bin/env python3
"""patch_145.py — Beta 0.145: gear icon no painel DVL Flow Stack abre as configurações"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.144') >= 10
html = html.replace('Beta 0.144', 'Beta 0.145')

# ── 1. drawFlowStack: draw ⚙ icon after _dvlDrawOscBase, store hitbox ─────────
OLD_AFTER_BASE = (
    "    /* 3 sub-panels: DELTA (norm by volMA), AGGRESSION, PULSE */\n"
    "    var innerH=L.plotBottom-L.plotTop;"
)
assert OLD_AFTER_BASE in html, 'drawFlowStack sub-panels anchor not found'

html = html.replace(OLD_AFTER_BASE,
    "    /* gear ⚙ icon in header — clicking opens pressureTrail settings */\n"
    "    (function(){\n"
    "      var gx=L.scaleLeft-26,gy=L.pTop+L.hdrH/2,gr=7;\n"
    "      ctx.save();\n"
    "      ctx.font='13px monospace';\n"
    "      ctx.textAlign='center';ctx.textBaseline='middle';\n"
    "      ctx.fillStyle='rgba(100,130,170,0.70)';\n"
    "      ctx.fillText('\\u2699',gx,gy);\n"
    "      ctx.restore();\n"
    "      window._dvlPTGearHit={x1:gx-10,y1:L.pTop,x2:gx+10,y2:L.pTop+L.hdrH};\n"
    "    })();\n"
    "\n"
    "    /* 3 sub-panels: DELTA (norm by volMA), AGGRESSION, PULSE */\n"
    "    var innerH=L.plotBottom-L.plotTop;",
    1)

# ── 2. mousedown: check _dvlPTGearHit and call openInputModal ─────────────────
OLD_PT_EYE_CLICK = (
    "if(window._dvlPTEyeHit){const _b=window._dvlPTEyeHit;"
    "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
    "window._dvlPTTitleHidden=!window._dvlPTTitleHidden;"
    "try{localStorage.setItem('dvl_ptTitleHidden',window._dvlPTTitleHidden?'1':'');}catch(_){}"
    "draw();return;}}"
)
# This pattern appears in both mousedown and pointerdown — replace in mousedown (first occurrence)
assert html.count(OLD_PT_EYE_CLICK) >= 1, '_dvlPTEyeHit click not found'
# Find the one inside the mousedown listener (not pointerdown) — it appears after "S.mouse.startX=e.clientX"
MOUSEDOWN_ANCHOR = "S.mouse.startX=e.clientX;S.mouse.startY=e.clientY;S.mouse.axis=null;"
assert MOUSEDOWN_ANCHOR in html, 'mousedown anchor not found'

# Replace the FIRST occurrence (inside mousedown)
html = html.replace(OLD_PT_EYE_CLICK,
    "if(window._dvlPTEyeHit){const _b=window._dvlPTEyeHit;"
    "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
    "window._dvlPTTitleHidden=!window._dvlPTTitleHidden;"
    "try{localStorage.setItem('dvl_ptTitleHidden',window._dvlPTTitleHidden?'1':'');}catch(_){}"
    "draw();return;}}"
    "if(window._dvlPTGearHit){const _b=window._dvlPTGearHit;"
    "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
    "if(typeof openInputModal==='function')openInputModal('pressureTrail',null);"
    "return;}}",
    1)  # only first occurrence (mousedown, not pointerdown)

# ── 3. pointerdown (touch): also wire gear hitbox ─────────────────────────────
# The pointerdown handler has a similar pattern for eye hitboxes
OLD_PT_EYE_TOUCH = (
    "if(window._dvlPTEyeHit){const _b=window._dvlPTEyeHit;"
    "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
    "window._dvlPTTitleHidden=!window._dvlPTTitleHidden;"
    "try{localStorage.setItem('dvl_ptTitleHidden',window._dvlPTTitleHidden?'1':'');}catch(_){}"
    "draw();return;}}"
)
# This is the REMAINING occurrence (in pointerdown after the first was already replaced above)
if OLD_PT_EYE_TOUCH in html:
    html = html.replace(OLD_PT_EYE_TOUCH,
        "if(window._dvlPTEyeHit){const _b=window._dvlPTEyeHit;"
        "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
        "window._dvlPTTitleHidden=!window._dvlPTTitleHidden;"
        "try{localStorage.setItem('dvl_ptTitleHidden',window._dvlPTTitleHidden?'1':'');}catch(_){}"
        "draw();return;}}"
        "if(window._dvlPTGearHit){const _b=window._dvlPTGearHit;"
        "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
        "if(typeof openInputModal==='function')openInputModal('pressureTrail',null);"
        "return;}}",
        1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_145.py applied — Beta 0.145')
print('  + Gear ⚙ drawn in DVL Flow Stack panel header (near right scale)')
print('  + Click / tap on gear → openInputModal("pressureTrail") → abre as configurações')
print('  + Hitbox _dvlPTGearHit wired in mousedown (desktop) e pointerdown (touch)')
