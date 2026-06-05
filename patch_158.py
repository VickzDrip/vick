#!/usr/bin/env python3
"""patch_158.py — Beta 0.158: Three fixes
   1. Fix phantom gear hitboxes for HVN Clarity and DVL Flow when oscillator is off
   2. Add MA overlay line to HVN Clarity oscillator panel (hvnClarMA input, 0=off)
   3. Add MA overlay line to DVL Flow Acceleration panel (faOscMA input, 0=off)
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.157') >= 10, 'Beta 0.157 not found'
html = html.replace('Beta 0.157', 'Beta 0.158')

# ── 1. Clear phantom gear hitboxes when oscillators are off ──────────────────
# In draw(), after computing _clarH and _fah, clear stale gear hitboxes
OLD_PB_CALC = (
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;'
    'const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;'
    'PB=10+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);'
)
assert OLD_PB_CALC in html, 'PB calc anchor not found'
html = html.replace(OLD_PB_CALC,
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;'
    'const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;'
    'PB=10+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);'
    "if(!_fah&&window._dvlOscGearHit)window._dvlOscGearHit['flow']=null;"
    "if(!_clarH&&window._dvlOscGearHit)window._dvlOscGearHit['clarity']=null;",
    1)

# ── 2a. HVN Clarity UI: add MA input before hint ─────────────────────────────
OLD_CLAR_HINT = '            <div class="hint">Drag the splitter to resize the Trend Clarity oscillator.</div>'
assert OLD_CLAR_HINT in html, 'hvnClarity hint anchor not found'
html = html.replace(OLD_CLAR_HINT,
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;'
    'letter-spacing:.08em;margin-bottom:4px;">MÉD. MÓVEL (0=off)</div>\n'
    '            <div class="kv"><span class="k">Clarity MA</span>'
    '<input class="num" id="hvnClarMA" type="number" min="0" max="200" step="1" '
    'value="0" style="width:52px"></div>\n'
    '            <div class="hint">Drag the splitter to resize the Trend Clarity oscillator.</div>',
    1)

# ── 2b. HVN Clarity: add MA overlay drawing before _dvlDrawOscCurrentMarker ──
OLD_CLAR_MARKER = (
    "  _dvlDrawOscCurrentMarker(ctx,L,displayVal,"
    "state==='bear'?'rgba(255,80,100,.9)':state==='bull'?'rgba(0,215,255,.9)':'rgba(140,160,190,.85)',"
    "'CLARITY');\n"
    "}"
)
assert OLD_CLAR_MARKER in html, 'hvnClarity marker anchor not found'
html = html.replace(OLD_CLAR_MARKER,
    "  {const _clml=Math.max(0,(+(document.getElementById('hvnClarMA')?.value)||0)|0);"
    "if(_clml>=2){const _ca=[];let _crs=0;"
    "for(let _ci=0;_ci<vals.length;_ci++){_crs+=vals[_ci];"
    "if(_ci>=_clml)_crs-=vals[_ci-_clml];_ca[_ci]=_crs/Math.min(_ci+1,_clml);}"
    "ctx.save();_dvlOscClip(ctx,L);ctx.beginPath();"
    "ctx.strokeStyle='rgba(34,211,238,0.90)';ctx.lineWidth=1.4;ctx.setLineDash([]);"
    "let _cmv=false;"
    "for(let i=V.a;i<V.b;i++){if(i<0||i>=_ca.length)continue;"
    "const _xx=x(i),_yy=_dvlOscY(L,_ca[i]);"
    "if(!_cmv){ctx.moveTo(_xx,_yy);_cmv=true;}else ctx.lineTo(_xx,_yy);}"
    "if(_cmv)ctx.stroke();ctx.restore();}}\n"
    "  _dvlDrawOscCurrentMarker(ctx,L,displayVal,"
    "state==='bear'?'rgba(255,80,100,.9)':state==='bull'?'rgba(0,215,255,.9)':'rgba(140,160,190,.85)',"
    "'CLARITY');\n"
    "}",
    1)

# ── 2c. HVN Clarity event wiring: add hvnClarMA ──────────────────────────────
OLD_CLAR_EVT = (
    "['hvnLineGlow','hvnHistOpac','hvnClarityTF','hvnShowOscLine','faShowOscLine']"
    ".forEach(id=>{const n=el(id);if(n)n.addEventListener('change',drawSoon)})"
)
assert OLD_CLAR_EVT in html, 'hvnClarity event wiring anchor not found'
html = html.replace(OLD_CLAR_EVT,
    "['hvnLineGlow','hvnHistOpac','hvnClarityTF','hvnShowOscLine','faShowOscLine','hvnClarMA']"
    ".forEach(id=>{const n=el(id);if(n){n.addEventListener('change',drawSoon);"
    "n.addEventListener('input',drawSoon);}});",
    1)

# ── 3a. DVL Flow UI: add MA input after faShowFlowTag ────────────────────────
OLD_FLOW_SHOWTAG = (
    '<label class="kv" style="cursor:pointer;"><span class="k">Flow State Tag</span>'
    '<input type="checkbox" id="faShowFlowTag" checked '
    'style="width:14px;height:14px;cursor:pointer;flex-shrink:0;"></label>'
)
assert OLD_FLOW_SHOWTAG in html, 'faShowFlowTag anchor not found'
html = html.replace(OLD_FLOW_SHOWTAG,
    '<label class="kv" style="cursor:pointer;"><span class="k">Flow State Tag</span>'
    '<input type="checkbox" id="faShowFlowTag" checked '
    'style="width:14px;height:14px;cursor:pointer;flex-shrink:0;"></label>'
    '<div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>'
    '<div style="font-size:9px;color:#5a7090;font-weight:700;'
    'letter-spacing:.08em;margin-bottom:4px;">MÉD. MÓVEL (0=off)</div>'
    '<div class="kv"><span class="k">Flow MA</span>'
    '<input class="num" id="faOscMA" type="number" min="0" max="200" step="1" '
    'value="0" style="width:52px"></div>',
    1)

# ── 3b. DVL Flow: add MA overlay drawing before _dvlDrawOscCurrentMarker ─────
OLD_FLOW_MARKER = (
    "  _dvlDrawOscCurrentMarker(ctx,L,displayVal,"
    "state==='bear'?'rgba(255,100,55,.9)':state==='bull'?'rgba(0,215,170,.9)':'rgba(140,160,190,.85)',"
    "'FLOW');\n"
    "}"
)
assert OLD_FLOW_MARKER in html, 'DVL Flow marker anchor not found'
html = html.replace(OLD_FLOW_MARKER,
    "  {const _flml=Math.max(0,(+(document.getElementById('faOscMA')?.value)||0)|0);"
    "if(_flml>=2){const _fa=[];let _frs=0;"
    "for(let _fi=0;_fi<osc.length;_fi++){_frs+=osc[_fi];"
    "if(_fi>=_flml)_frs-=osc[_fi-_flml];_fa[_fi]=_frs/Math.min(_fi+1,_flml);}"
    "ctx.save();_dvlOscClip(ctx,L);ctx.beginPath();"
    "ctx.strokeStyle='rgba(0,215,170,0.90)';ctx.lineWidth=1.4;ctx.setLineDash([]);"
    "let _fmv=false;"
    "for(let i=V.a;i<V.b;i++){if(i<0||i>=_fa.length)continue;"
    "const _xx=x(i),_yy=_dvlOscY(L,_fa[i]);"
    "if(!_fmv){ctx.moveTo(_xx,_yy);_fmv=true;}else ctx.lineTo(_xx,_yy);}"
    "if(_fmv)ctx.stroke();ctx.restore();}}\n"
    "  _dvlDrawOscCurrentMarker(ctx,L,displayVal,"
    "state==='bear'?'rgba(255,100,55,.9)':state==='bull'?'rgba(0,215,170,.9)':'rgba(140,160,190,.85)',"
    "'FLOW');\n"
    "}",
    1)

# ── 3c. DVL Flow event wiring: add faOscMA to FA_IDS ─────────────────────────
OLD_FA_IDS_END = "  'faHistOpacity','faLineGlow','faLineSmoothing','faShowFlowTag']);"
assert OLD_FA_IDS_END in html, 'FA_IDS end anchor not found'
html = html.replace(OLD_FA_IDS_END,
    "  'faHistOpacity','faLineGlow','faLineSmoothing','faShowFlowTag','faOscMA']);",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_158.py applied — Beta 0.158')
print('  1. Phantom gear fix: _dvlOscGearHit cleared when flow/clarity panels are off')
print('  2. HVN Clarity: MA overlay line (hvnClarMA, 0=off, cyan rgba(34,211,238))')
print('  3. DVL Flow Acceleration: MA overlay line (faOscMA, 0=off, teal rgba(0,215,170))')
