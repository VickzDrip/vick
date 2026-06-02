#!/usr/bin/env python3
"""Beta 0.093 — Optimizer: botão FILTRO para reordenar Top 5 por 1 ou 2 métricas"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.092', 'Beta 0.093')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.093\n  - Strategy Tester: seletor "Indicador"',
    '''Beta 0.093
  - Optimizer: botão FILTRO ao lado de "TOP 5 MELHORES CONFIGURAÇÕES".
    Permite reordenar o ranking por 1 ou 2 métricas combinadas:
    Win Rate · Prof. Factor · Retorno · Trades · PF×WR (padrão).
  - Com 2 métricas selecionadas o score é a soma dos valores normalizados
    0-1 de cada métrica sobre todos os resultados, garantindo equilíbrio.
  - _allOptResults armazena todos os resultados; _reRankResults() re-aplica
    o critério sem rodar o optimizer novamente.
  - Pills se atualizam visualmente (cyan = selecionado). Ao selecionar uma
    terceira, a mais antiga é removida automaticamente.

Beta 0.092
  - Strategy Tester: seletor "Indicador"''',
    1
)

# ── 3. CSS: add pill styles ───────────────────────────────────────────────────
OLD_PILL_CSS = (
    '.dvl-st-applyrank.applied{color:#00e676;border-color:rgba(0,220,100,.35);background:rgba(0,220,100,.06)}'
)
NEW_PILL_CSS = (
    '.dvl-st-applyrank.applied{color:#00e676;border-color:rgba(0,220,100,.35);background:rgba(0,220,100,.06)}\n'
    '.dvl-opt-pill{background:rgba(255,255,255,.04);border:1px solid #1e2a40;border-radius:10px;color:#5a7090;font-size:8px;font-weight:700;letter-spacing:.06em;padding:3px 10px;cursor:pointer;transition:all .14s;text-transform:uppercase}\n'
    '.dvl-opt-pill.sel{background:rgba(0,200,220,.12);border-color:rgba(0,200,220,.32);color:#00c8dc}'
)
assert OLD_PILL_CSS in html, "dvl-st-applyrank.applied CSS not found"
html = html.replace(OLD_PILL_CSS, NEW_PILL_CSS, 1)

# ── 4. HTML: replace TOP 5 header with flex row + filter button + panel ───────
OLD_TOP5 = (
    '      <div id="dvlSTRankWrap" style="display:none">\n'
    '        <div class="dvl-st-sl">TOP 5 MELHORES CONFIGURA\xc7\xd5ES</div>\n'
    '        <div id="dvlSTRankList"></div>'
)
NEW_TOP5 = (
    '      <div id="dvlSTRankWrap" style="display:none">\n'
    '        <div style="display:flex;align-items:center;justify-content:space-between;margin:13px 0 4px">\n'
    '          <span style="font-size:7.5px;letter-spacing:.18em;color:#344a62;text-transform:uppercase;font-weight:700">TOP 5 MELHORES CONFIGURA\xc7\xd5ES</span>\n'
    '          <button id="dvlOptFilterBtn" onclick="_toggleOptFilter()" style="background:rgba(0,200,220,.06);border:1px solid rgba(0,200,220,.18);border-radius:5px;color:#3a8090;font-size:7.5px;font-weight:700;letter-spacing:.08em;padding:2px 8px;cursor:pointer;text-transform:uppercase">FILTRO ▾</button>\n'
    '        </div>\n'
    '        <div id="dvlOptFilterPanel" style="display:none;background:rgba(5,12,25,.96);border:1px solid #1a2638;border-radius:7px;padding:8px 9px;margin-bottom:6px">\n'
    '          <div style="font-size:7.5px;color:#3a5070;margin-bottom:6px;letter-spacing:.05em">ORDENAR POR (M\xc1X. 2)</div>\n'
    '          <div style="display:flex;flex-wrap:wrap;gap:4px" id="dvlOptPills">\n'
    '            <button class="dvl-opt-pill sel" data-key="pf_wr" onclick="_optPillClick(this)">PF \xd7 WR</button>\n'
    '            <button class="dvl-opt-pill" data-key="wr" onclick="_optPillClick(this)">Win Rate</button>\n'
    '            <button class="dvl-opt-pill" data-key="pf" onclick="_optPillClick(this)">Prof. Factor</button>\n'
    '            <button class="dvl-opt-pill" data-key="ret" onclick="_optPillClick(this)">Retorno</button>\n'
    '            <button class="dvl-opt-pill" data-key="trades" onclick="_optPillClick(this)">Trades</button>\n'
    '          </div>\n'
    '        </div>\n'
    '        <div id="dvlSTRankList"></div>'
)
assert OLD_TOP5 in html, "dvlSTRankWrap block not found"
html = html.replace(OLD_TOP5, NEW_TOP5, 1)

# ── 5. JS: add filter state + functions before _renderRanking ─────────────────
OLD_BEFORE_RENDER = 'var RANK_CLS=[\'r1\',\'r2\',\'r3\',\'rn\',\'rn\'];\nfunction _renderRanking(top){'
NEW_BEFORE_RENDER = (
    "var _allOptResults=[];\n"
    "var _optSortBy=['pf_wr'];\n"
    "\n"
    "function _optMetricVal(r,key){\n"
    "  if(key==='wr')return parseFloat(r.wr);\n"
    "  if(key==='pf')return parseFloat(r.pf);\n"
    "  if(key==='ret')return parseFloat(r.ret);\n"
    "  if(key==='trades')return r.trades;\n"
    "  return parseFloat(r.pf)*parseFloat(r.wr)/100;\n"
    "}\n"
    "\n"
    "function _reRankResults(){\n"
    "  if(!_allOptResults.length)return;\n"
    "  var keys=_optSortBy,all=_allOptResults;\n"
    "  var scored=all.map(function(r){\n"
    "    var s=0;\n"
    "    keys.forEach(function(k){\n"
    "      var vals=all.map(function(x){return _optMetricVal(x,k);});\n"
    "      var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);\n"
    "      s+=(_optMetricVal(r,k)-mn)/((mx-mn)||1);\n"
    "    });\n"
    "    return{r:r,s:s};\n"
    "  });\n"
    "  scored.sort(function(a,b){return b.s-a.s;});\n"
    "  _bestCfgs=scored.slice(0,5).map(function(x){return x.r;});\n"
    "  _renderRanking(_bestCfgs);\n"
    "}\n"
    "\n"
    "function _toggleOptFilter(){\n"
    "  var p=document.getElementById('dvlOptFilterPanel');\n"
    "  var b=document.getElementById('dvlOptFilterBtn');\n"
    "  if(!p)return;\n"
    "  var open=p.style.display!=='none';\n"
    "  p.style.display=open?'none':'';\n"
    "  if(b)b.innerHTML=open?'FILTRO ▾':'FILTRO ▴';\n"
    "}\n"
    "\n"
    "function _optPillClick(el){\n"
    "  var key=el.getAttribute('data-key');\n"
    "  var idx=_optSortBy.indexOf(key);\n"
    "  if(idx>=0){\n"
    "    if(_optSortBy.length>1)_optSortBy.splice(idx,1);\n"
    "  }else{\n"
    "    if(_optSortBy.length>=2)_optSortBy.shift();\n"
    "    _optSortBy.push(key);\n"
    "  }\n"
    "  document.querySelectorAll('#dvlOptPills .dvl-opt-pill').forEach(function(p){\n"
    "    p.classList.toggle('sel',_optSortBy.indexOf(p.getAttribute('data-key'))>=0);\n"
    "  });\n"
    "  _reRankResults();\n"
    "}\n"
    "\n"
    "var RANK_CLS=['r1','r2','r3','rn','rn'];\n"
    "function _renderRanking(top){"
)
assert OLD_BEFORE_RENDER in html, "RANK_CLS / _renderRanking not found"
html = html.replace(OLD_BEFORE_RENDER, NEW_BEFORE_RENDER, 1)

# ── 6. _runOptimizer: store all results and use _reRankResults ─────────────────
OLD_RANK_DONE = (
    "      var _sc=function(r){return parseFloat(r.pf)*parseFloat(r.wr);};\n"
    "      results.sort(function(a,b){return _sc(b)-_sc(a);});\n"
    "      _bestCfgs=results.slice(0,5);\n"
    "      _renderRanking(_bestCfgs);\n"
)
NEW_RANK_DONE = (
    "      _allOptResults=results;\n"
    "      _reRankResults();\n"
)
assert OLD_RANK_DONE in html, "optimizer sort/rank block not found"
html = html.replace(OLD_RANK_DONE, NEW_RANK_DONE, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.093 applied')
