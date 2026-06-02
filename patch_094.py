#!/usr/bin/env python3
"""Beta 0.094 — Fix: botão FILTRO não abria painel (toggle display bug)"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.093', 'Beta 0.094')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.094\n  - Optimizer: botão FILTRO ao lado de "TOP 5 MELHORES',
    '''Beta 0.094
  - Fix: botão FILTRO não abria o painel de filtros.
    Causa: toggle usava display:'' (string vazia) para abrir, mas o check
    !== 'none' considerava '' como "aberto", invertendo a lógica.
    Corrigido para usar display:'block' explicitamente e verificar com
    classList.contains('open') via CSS class, eliminando ambiguidade.
  - Funções _toggleOptFilter e _optPillClick expostas em window para
    garantir acesso global nos handlers inline.

Beta 0.093
  - Optimizer: botão FILTRO ao lado de "TOP 5 MELHORES''',
    1
)

# ── 3. Fix toggle logic: use CSS class instead of style.display ───────────────
# First add CSS for .dvl-opt-panel-open
OLD_PILL_CSS = (
    '.dvl-opt-pill.sel{background:rgba(0,200,220,.12);border-color:rgba(0,200,220,.32);color:#00c8dc}'
)
NEW_PILL_CSS = (
    '.dvl-opt-pill.sel{background:rgba(0,200,220,.12);border-color:rgba(0,200,220,.32);color:#00c8dc}\n'
    '#dvlOptFilterPanel{display:none}'
    '#dvlOptFilterPanel.open{display:block}'
)
assert OLD_PILL_CSS in html, "pill CSS not found"
html = html.replace(OLD_PILL_CSS, NEW_PILL_CSS, 1)

# Fix the _toggleOptFilter function to use classList
OLD_TOGGLE = (
    "function _toggleOptFilter(){\n"
    "  var p=document.getElementById('dvlOptFilterPanel');\n"
    "  var b=document.getElementById('dvlOptFilterBtn');\n"
    "  if(!p)return;\n"
    "  var open=p.style.display!=='none';\n"
    "  p.style.display=open?'none':'';\n"
    "  if(b)b.innerHTML=open?'FILTRO ▾':'FILTRO ▴';\n"
    "}"
)
NEW_TOGGLE = (
    "function _toggleOptFilter(){\n"
    "  var p=document.getElementById('dvlOptFilterPanel');\n"
    "  var b=document.getElementById('dvlOptFilterBtn');\n"
    "  if(!p)return;\n"
    "  var open=p.classList.contains('open');\n"
    "  p.classList.toggle('open');\n"
    "  if(b)b.textContent=open?'FILTRO ▾':'FILTRO ▴';\n"
    "}\n"
    "window._toggleOptFilter=_toggleOptFilter;\n"
    "window._optPillClick=_optPillClick;"
)
assert OLD_TOGGLE in html, "_toggleOptFilter function not found"
html = html.replace(OLD_TOGGLE, NEW_TOGGLE, 1)

# Remove the inline style="display:none" from dvlOptFilterPanel since CSS handles it now
OLD_PANEL_STYLE = (
    '        <div id="dvlOptFilterPanel" style="display:none;background:rgba(5,12,25,.96);border:1px solid #1a2638;border-radius:7px;padding:8px 9px;margin-bottom:6px">'
)
NEW_PANEL_STYLE = (
    '        <div id="dvlOptFilterPanel" style="background:rgba(5,12,25,.96);border:1px solid #1a2638;border-radius:7px;padding:8px 9px;margin-bottom:6px">'
)
assert OLD_PANEL_STYLE in html, "dvlOptFilterPanel style attr not found"
html = html.replace(OLD_PANEL_STYLE, NEW_PANEL_STYLE, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.094 applied')
