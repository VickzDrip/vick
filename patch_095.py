#!/usr/bin/env python3
"""Beta 0.095 — Optimizer: seletor de Período (estava fixo em 30 dias)"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.094', 'Beta 0.095')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.095\n  - Fix: botão FILTRO não abria',
    '''Beta 0.095
  - Optimizer: adiciona seletor de Período e Par no topo da aba.
    Antes o optimizer rodava sempre com 30 dias fixo (sem aviso).
    Agora o usuário escolhe: 7 · 30 · 90 · 180 · 365 · 730 dias.
  - Período escolhido é passado para todos os combos (HVN e FVG).
  - OPT_PARAMS e FVG_OPT_PARAMS exibem o período selecionado.

Beta 0.094
  - Fix: botão FILTRO não abria''',
    1
)

# ── 3. Add Período + Par row to Optimizer tab (above PARÂMETROS TESTADOS) ────
OLD_OPT_TAB_START = (
    '    <div class="dvl-st-tc" id="dvlSTTabOptimizer">\n'
    '      <div class="dvl-st-sl">PAR\xc2METROS TESTADOS</div>\n'
    '      <div id="dvlSTOptParams"></div>'
)

NEW_OPT_TAB_START = (
    '    <div class="dvl-st-tc" id="dvlSTTabOptimizer">\n'
    '      <div class="dvl-st-sl">CONFIGURA\xc7\xc3O</div>\n'
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Per\xedodo</span>\n'
    '          <select class="dvl-st-sel" id="stOptPeriod">\n'
    '            <option value="7">7 dias</option>\n'
    '            <option value="30" selected>30 dias</option>\n'
    '            <option value="90">90 dias</option>\n'
    '            <option value="180">180 dias</option>\n'
    '            <option value="365">1 ano</option>\n'
    '            <option value="730">2 anos</option>\n'
    '          </select></div>\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Par</span>\n'
    '          <select class="dvl-st-sel" id="stOptPair">\n'
    '            <option>BTC/USDT</option>\n'
    '            <option>ETH/USDT</option>\n'
    '          </select></div>\n'
    '      </div>\n'
    '      <div class="dvl-st-sl">PAR\xc2METROS TESTADOS</div>\n'
    '      <div id="dvlSTOptParams"></div>'
)

assert OLD_OPT_TAB_START in html, "Optimizer tab start not found"
html = html.replace(OLD_OPT_TAB_START, NEW_OPT_TAB_START, 1)

# ── 4. Pass period from stOptPeriod in _runOptimizer ─────────────────────────
OLD_OPT_COMBOS_LINE = (
    "  var _isFvgOpt=(_g('stInd')||{value:'hvnSignals'}).value==='fvgConf';\n"
    "  var _COMBOS=_isFvgOpt?FVG_OPT_COMBOS:OPT_COMBOS;\n"
    "  var results=[],total=_COMBOS.length,done=0;"
)
NEW_OPT_COMBOS_LINE = (
    "  var _isFvgOpt=(_g('stInd')||{value:'hvnSignals'}).value==='fvgConf';\n"
    "  var _COMBOS=_isFvgOpt?FVG_OPT_COMBOS:OPT_COMBOS;\n"
    "  var _optPeriod=String(parseInt((_g('stOptPeriod')||{value:'30'}).value)||30);\n"
    "  var results=[],total=_COMBOS.length,done=0;"
)
assert OLD_OPT_COMBOS_LINE in html, "_runOptimizer combos line not found"
html = html.replace(OLD_OPT_COMBOS_LINE, NEW_OPT_COMBOS_LINE, 1)

# ── 5. Use _optPeriod in both HVN and FVG cachedBacktest calls ────────────────
OLD_CACHED_CALLS = (
    "    var r=_isFvgOpt?\n"
    "      _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:'30'}):\n"
    "      _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2});"
)
NEW_CACHED_CALLS = (
    "    var r=_isFvgOpt?\n"
    "      _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod}):\n"
    "      _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod});"
)
assert OLD_CACHED_CALLS in html, "optimizer cachedBacktest calls not found"
html = html.replace(OLD_CACHED_CALLS, NEW_CACHED_CALLS, 1)

# ── 6. Show selected period in _stRenderOptParams ─────────────────────────────
OLD_RENDER_PARAMS = (
    "function _stRenderOptParams(params){\n"
    "  var c=document.getElementById('dvlSTOptParams');if(!c)return;\n"
    "  c.innerHTML='';\n"
    "  params.forEach(function(p){\n"
    "    var d=document.createElement('div');d.className='dvl-st-oparam';\n"
    "    d.innerHTML='<span class=\"dvl-st-opn\">'+p.n+'</span><span class=\"dvl-st-opv\">'+p.v+'</span>';\n"
    "    c.appendChild(d);\n"
    "  });\n"
    "}"
)
NEW_RENDER_PARAMS = (
    "function _stRenderOptParams(params){\n"
    "  var c=document.getElementById('dvlSTOptParams');if(!c)return;\n"
    "  c.innerHTML='';\n"
    "  var _pd=document.getElementById('stOptPeriod');\n"
    "  var _pdTxt=_pd?_pd.options[_pd.selectedIndex].text:'30 dias';\n"
    "  var _pRow=document.createElement('div');_pRow.className='dvl-st-oparam';\n"
    "  _pRow.innerHTML='<span class=\"dvl-st-opn\">Per\xedodo</span><span class=\"dvl-st-opv\">'+_pdTxt+'</span>';\n"
    "  c.appendChild(_pRow);\n"
    "  params.forEach(function(p){\n"
    "    var d=document.createElement('div');d.className='dvl-st-oparam';\n"
    "    d.innerHTML='<span class=\"dvl-st-opn\">'+p.n+'</span><span class=\"dvl-st-opv\">'+p.v+'</span>';\n"
    "    c.appendChild(d);\n"
    "  });\n"
    "}"
)
assert OLD_RENDER_PARAMS in html, "_stRenderOptParams not found"
html = html.replace(OLD_RENDER_PARAMS, NEW_RENDER_PARAMS, 1)

# ── 7. Refresh params display on period change ─────────────────────────────────
# After the (function(){...})() that renders initial params, add a listener
OLD_INIT_PARAMS = (
    "(function(){\n"
    "  var c=document.getElementById('dvlSTOptParams');\n"
    "  if(!c)return;\n"
    "  OPT_PARAMS.forEach(function(p){\n"
    "    var d=document.createElement('div');\n"
    "    d.className='dvl-st-oparam';\n"
    "    d.innerHTML='<span class=\"dvl-st-opn\">'+p.n+'</span><span class=\"dvl-st-opv\">'+p.v+'</span>';\n"
    "    c.appendChild(d);\n"
    "  });\n"
    "})();"
)
NEW_INIT_PARAMS = (
    "(function(){\n"
    "  var c=document.getElementById('dvlSTOptParams');\n"
    "  if(!c)return;\n"
    "  OPT_PARAMS.forEach(function(p){\n"
    "    var d=document.createElement('div');\n"
    "    d.className='dvl-st-oparam';\n"
    "    d.innerHTML='<span class=\"dvl-st-opn\">'+p.n+'</span><span class=\"dvl-st-opv\">'+p.v+'</span>';\n"
    "    c.appendChild(d);\n"
    "  });\n"
    "})();\n"
    "document.addEventListener('change',function(ev){\n"
    "  if(ev.target&&ev.target.id==='stOptPeriod'){\n"
    "    var ind=document.getElementById('stInd');\n"
    "    var isFvg=ind&&ind.value==='fvgConf';\n"
    "    _stRenderOptParams(isFvg?FVG_OPT_PARAMS:OPT_PARAMS);\n"
    "  }\n"
    "});"
)
assert OLD_INIT_PARAMS in html, "OPT_PARAMS init IIFE not found"
html = html.replace(OLD_INIT_PARAMS, NEW_INIT_PARAMS, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.095 applied')
