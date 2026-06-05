#!/usr/bin/env python3
"""patch_157.py — Beta 0.157: Complete removal of DVL Real Pressure Trail
   Removes every reference: indicator card, resize handle, S.inds entry,
   oscScale key, _ptFlowH variable, draw calls, hitbox checks, CSS, IIFE.
"""
import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.156') >= 10, 'Beta 0.156 not found'
html = html.replace('Beta 0.156', 'Beta 0.157')

# ── 1. Remove indicator card (lines 3978-4022) ───────────────────────────────
assert 'data-card="pressureTrail"' in html, 'pressureTrail card not found'
html = re.sub(
    r'\n        <div class="ind-card dvl-icd" data-card="pressureTrail".*?        </div>\n',
    '\n',
    html, count=1, flags=re.DOTALL
)
assert 'data-card="pressureTrail"' not in html, 'pressureTrail card not fully removed'

# ── 2. Remove ptFlowResizeHandle HTML div + comment ───────────────────────────
OLD_RHANDLE = (
    '        <!-- ── DVL Flow Stack panel resize handle ── -->\n'
    '        <div id="ptFlowResizeHandle" style="display:none" title="Drag to resize DVL Flow Stack panel"></div>\n'
)
assert OLD_RHANDLE in html, 'ptFlowResizeHandle HTML anchor not found'
html = html.replace(OLD_RHANDLE, '', 1)

# ── 3. Remove pressureTrail:false from S.inds ─────────────────────────────────
OLD_INDS = 'spikeZones:false,pressureTrail:false},window.__savedInds'
assert OLD_INDS in html, 'pressureTrail inds anchor not found'
html = html.replace(OLD_INDS, 'spikeZones:false},window.__savedInds', 1)

# ── 4. Remove pressureFlow from S.oscScale ────────────────────────────────────
OLD_OSCSCALE = 'trendClarity:{center:0,range:200},pressureFlow:{center:0,range:200}}'
assert OLD_OSCSCALE in html, 'pressureFlow oscScale anchor not found'
html = html.replace(OLD_OSCSCALE, 'trendClarity:{center:0,range:200}}', 1)

# ── 5. Remove _ptFlowH variable declaration ───────────────────────────────────
OLD_PTFLOWH = (
    '})();let _ptFlowH=(()=>{try{const v=parseInt(localStorage.getItem(\'dvl_ptFlowH\'));'
    'return(v>=70&&v<=240)?v:110;}catch(e){return 110;}})();function RP()'
)
assert OLD_PTFLOWH in html, '_ptFlowH variable anchor not found'
html = html.replace(OLD_PTFLOWH, '})();function RP()', 1)

# ── 6. Remove _ptH const and strip from PB formula ───────────────────────────
OLD_PTH_PB = (
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;'
    'const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;'
    'const _ptH=(S.inds.pressureTrail&&S.candles.length)?_ptFlowH:0;'
    'PB=10+(_ptH?_ptH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);'
)
assert OLD_PTH_PB in html, '_ptH + PB anchor not found'
html = html.replace(OLD_PTH_PB,
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;'
    'const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;'
    'PB=10+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);',
    1)

# ── 7. Remove _frh2 (ptFlowResizeHandle) positioning block ───────────────────
OLD_FRH2 = (
    'const _frh2=el(\'ptFlowResizeHandle\');if(_frh2){'
    '_frh2.style.display=_ptH>0?\'block\':\'none\';'
    '_frh2.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+_ptH-PANEL_GAP/2)+\'px\';}'
)
assert OLD_FRH2 in html, '_frh2 block anchor not found'
html = html.replace(OLD_FRH2, '', 1)

# ── 8a. Remove Pressure Cloud safeLayer call ─────────────────────────────────
OLD_CLOUD = (
    "if(S.inds.pressureTrail&&window.__drawPressureCloud)"
    "safeLayer('DVL Pressure Cloud',()=>window.__drawPressureCloud(ctx,W,H,AllV,sc,x,bw));"
    "resetCtxState(ctx);"
)
assert OLD_CLOUD in html, 'Pressure Cloud safeLayer anchor not found'
html = html.replace(OLD_CLOUD, '', 1)

# ── 8b. Remove Pressure Trail + State safeLayer calls ────────────────────────
OLD_TRAIL = (
    "if(S.inds.pressureTrail&&window.__drawPressureTrail){"
    "safeLayer('DVL Pressure Trail',()=>window.__drawPressureTrail(ctx,W,H,AllV,sc,x,bw));"
    "resetCtxState(ctx);"
    "if(window.__drawPressureState)safeLayer('DVL Pressure State',()=>window.__drawPressureState(ctx,W,H));}"
    "resetCtxState(ctx);"
)
assert OLD_TRAIL in html, 'Pressure Trail safeLayer anchor not found'
html = html.replace(OLD_TRAIL, '', 1)

# ── 8c. Remove Flow Stack (drawPressurePanel) safeLayer call ─────────────────
OLD_PANEL = (
    "if(_ptH>0&&window.__drawPressurePanel)"
    "safeLayer('DVL Flow Stack',()=>window.__drawPressurePanel(ctx,W,H,V,sc,x,_ptH,"
    "(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0)));"
    "resetCtxState(ctx);"
)
assert OLD_PANEL in html, 'Flow Stack safeLayer anchor not found'
html = html.replace(OLD_PANEL, '', 1)

# ── 9. Update oscPanelHeights: remove ptH ────────────────────────────────────
OLD_OSC_H = (
    'function oscPanelHeights(){'
    'const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;'
    'const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;'
    'const ptH=(window.S&&S.inds&&S.inds.pressureTrail&&S.candles&&S.candles.length)?_ptFlowH:0;'
    'return{clarH,flowH,ptH};}'
)
assert OLD_OSC_H in html, 'oscPanelHeights anchor not found'
html = html.replace(OLD_OSC_H,
    'function oscPanelHeights(){'
    'const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;'
    'const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;'
    'return{clarH,flowH};}',
    1)

# ── 10. Update oscScaleHit: remove {ptH} and pressureFlow block ──────────────
OLD_SCALE_HIT = (
    'function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;'
    'const{clarH,flowH,ptH}=oscPanelHeights();'
    "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
    'if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;'
    "if(y>=ft&&y<=fb)return 'flow';}"
    "if(ptH>0){const ptOff=(flowH?flowH+PANEL_GAP:0)+(clarH?clarH+PANEL_GAP:0);const pb=H-10-ptOff,pt=pb-ptH;if(y>=pt&&y<=pb)return 'pressureFlow';}"
    'return null;}'
)
assert OLD_SCALE_HIT in html, 'oscScaleHit anchor not found'
html = html.replace(OLD_SCALE_HIT,
    'function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;'
    'const{clarH,flowH}=oscPanelHeights();'
    "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
    'if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;'
    "if(y>=ft&&y<=fb)return 'flow';}"
    'return null;}',
    1)

# ── 11. Update oscPanelAtY: remove {ptH} and pressureFlow block ──────────────
OLD_PANEL_ATY = (
    'function oscPanelAtY(y,H){'
    'const{clarH,flowH,ptH}=oscPanelHeights();'
    "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
    'if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;'
    "if(y>=ft&&y<=fb)return 'flow';}"
    "if(ptH>0){const ptOff=(flowH?flowH+PANEL_GAP:0)+(clarH?clarH+PANEL_GAP:0);const pb=H-10-ptOff,pt=pb-ptH;if(y>=pt&&y<=pb)return 'pressureFlow';}"
    'return null;}'
)
assert OLD_PANEL_ATY in html, 'oscPanelAtY anchor not found'
html = html.replace(OLD_PANEL_ATY,
    'function oscPanelAtY(y,H){'
    'const{clarH,flowH}=oscPanelHeights();'
    "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
    'if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;'
    "if(y>=ft&&y<=fb)return 'flow';}"
    'return null;}',
    1)

# ── 12. Remove PT eye hit block from touch handler (appears in 7273 + 7274) ──
OLD_PT_EYE = (
    'if(window._dvlPTEyeHit){const _b=window._dvlPTEyeHit;'
    'if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){'
    "window._dvlPTTitleHidden=!window._dvlPTTitleHidden;"
    "try{localStorage.setItem('dvl_ptTitleHidden',window._dvlPTTitleHidden?'1':'');}catch(_){}"
    'draw();return;}}'
)
assert html.count(OLD_PT_EYE) == 2, f'expected 2 PT eye hit blocks, got {html.count(OLD_PT_EYE)}'
html = html.replace(OLD_PT_EYE, '')

# ── 13. Remove PT gear hit block from touch + mouse handlers ─────────────────
OLD_PT_GEAR = (
    'if(window._dvlPTGearHit){const _b=window._dvlPTGearHit;'
    'if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){'
    "if(typeof openInputModal==='function')openInputModal('pressureTrail',null);"
    'e.stopImmediatePropagation();return;}}'
)
assert html.count(OLD_PT_GEAR) == 2, f'expected 2 PT gear hit blocks, got {html.count(OLD_PT_GEAR)}'
html = html.replace(OLD_PT_GEAR, '')

# ── 14. Remove pressureFlow branch from mousemove oscDrag handler ─────────────
OLD_MOUSE_PF = (
    "const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):"
    "S.oscDrag.kind==='pressureFlow'?(_ptFlowH||110):(_hvnClarityH||166);"
)
assert OLD_MOUSE_PF in html, 'mousemove pressureFlow anchor not found'
html = html.replace(OLD_MOUSE_PF,
    "const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);",
    1)

# ── 15. Remove ptFlowResizeHandle IIFE ────────────────────────────────────────
OLD_PT_IIFE = (
    "(()=>{let _ptrhDrag=null;const ptrh=el('ptFlowResizeHandle');if(!ptrh)return;"
    "ptrh.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();"
    "ptrh.setPointerCapture(e.pointerId);_ptrhDrag={y:e.clientY,h:_ptFlowH};"
    "ptrh.classList.add('active');});"
    "ptrh.addEventListener('pointermove',e=>{if(!_ptrhDrag)return;"
    "_ptFlowH=clamp(_ptrhDrag.h-(e.clientY-_ptrhDrag.y),70,240);drawSoon();});"
    "ptrh.addEventListener('pointerup',()=>{if(!_ptrhDrag)return;_ptrhDrag=null;"
    "ptrh.classList.remove('active');"
    "try{localStorage.setItem('dvl_ptFlowH',Math.round(_ptFlowH));}catch(_){}});"
    "ptrh.addEventListener('pointercancel',()=>{_ptrhDrag=null;"
    "ptrh.classList.remove('active');});})();"
)
assert OLD_PT_IIFE in html, 'ptFlowResizeHandle IIFE anchor not found'
html = html.replace(OLD_PT_IIFE, '', 1)

# ── 16. Remove pressureFlow branch from touchmove handler ────────────────────
OLD_TOUCH_PF = (
    "const ph=touchState.oscKind==='flow'?(_flowAccelH||120):"
    "touchState.oscKind==='pressureFlow'?(_ptFlowH||110):(_hvnClarityH||166);"
)
assert OLD_TOUCH_PF in html, 'touchmove pressureFlow anchor not found'
html = html.replace(OLD_TOUCH_PF,
    "const ph=touchState.oscKind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);",
    1)

# ── 17. Remove ptFlowResizeHandle CSS ─────────────────────────────────────────
OLD_CSS = (
    '#ptFlowResizeHandle{position:absolute;left:0;right:0;height:8px;cursor:ns-resize;'
    'z-index:15;background:transparent;touch-action:none;user-select:none;}'
    '#ptFlowResizeHandle::after{content:\'\';position:absolute;left:50%;top:50%;'
    'transform:translate(-50%,-50%);width:40px;height:2px;'
    'background:rgba(0,212,255,0.20);border-radius:1px;transition:background .15s;}'
    '#ptFlowResizeHandle:hover::after,#ptFlowResizeHandle.active::after'
    '{background:rgba(0,212,255,0.55);}'
)
assert OLD_CSS in html, 'ptFlowResizeHandle CSS anchor not found'
html = html.replace(OLD_CSS, '', 1)

# ── 18. Remove entire DVL_PRESSURE_TRAIL script block (last in file) ──────────
PT_SCRIPT_START = '\n<script id="DVL_PRESSURE_TRAIL">'
idx = html.find(PT_SCRIPT_START)
assert idx != -1, 'DVL_PRESSURE_TRAIL script not found'
html = html[:idx]

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_157.py applied — Beta 0.157')
print('  DVL Real Pressure Trail completely removed:')
print('  - Indicator card (UI panel)')
print('  - ptFlowResizeHandle (HTML div + CSS + IIFE)')
print('  - S.inds.pressureTrail, S.oscScale.pressureFlow')
print('  - _ptFlowH variable + _ptH const + PB formula')
print('  - 3 safeLayer draw calls (Cloud, Trail+State, FlowStack)')
print('  - Touch/mouse PT eye + gear hitbox handlers')
print('  - oscPanelHeights / oscScaleHit / oscPanelAtY pressureFlow refs')
print('  - mousemove + touchmove pressureFlow branch')
print('  - Entire DVL_PRESSURE_TRAIL <script> block')
