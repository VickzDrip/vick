#!/usr/bin/env python3
"""Beta 0.099 — Filtro: Trades×WR, visual selecionado, optimizer 10x mais rápido"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.098', 'Beta 0.099')

# ── 2. changelog ────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.099\n  - Optimizer: 1000 combina'
NEW_LOG = ('Beta 0.099\n'
           '  - Filtro: nova p\xedlula "Trades \xd7 WR" — combina volume de trades\n'
           '    e assertividade para premiar configs com muitos trades bons.\n'
           '  - Filtro: pill selecionada ganha box-shadow cyan ao redor do bot\xe3o\n'
           '    para indicar claramente quais crit\xe9rios est\xe3o ativos.\n'
           '  - Optimizer: processa 20 combos por tick (era 1 a cada 110ms).\n'
           '    1000 combos agora levam ~2s em vez de ~110s.\n\n'
           'Beta 0.098\n  - Optimizer: 1000 combina')
assert OLD_LOG in html, "changelog anchor not found"
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. CSS: upgrade .dvl-opt-pill.sel with box-shadow glow ───────────────────
OLD_PILL_SEL = (
    '.dvl-opt-pill.sel{background:rgba(0,200,220,.12);border-color:rgba(0,200,220,.32);color:#00c8dc}'
)
NEW_PILL_SEL = (
    '.dvl-opt-pill.sel{background:rgba(0,200,220,.15);border-color:rgba(0,200,220,.55);'
    'color:#00c8dc;box-shadow:0 0 0 1.5px rgba(0,200,220,.38),0 0 6px rgba(0,200,220,.18)}'
)
assert OLD_PILL_SEL in html, "pill.sel CSS not found"
html = html.replace(OLD_PILL_SEL, NEW_PILL_SEL, 1)

# ── 4. HTML: add Trades×WR pill ───────────────────────────────────────────────
OLD_PILLS_HTML = (
    '            <button class="dvl-opt-pill" data-key="trades" onclick="_optPillClick(this)">Trades</button>\n'
    '          </div>'
)
NEW_PILLS_HTML = (
    '            <button class="dvl-opt-pill" data-key="trades" onclick="_optPillClick(this)">Trades</button>\n'
    '            <button class="dvl-opt-pill" data-key="tr_wr" onclick="_optPillClick(this)">Trades \xd7 WR</button>\n'
    '          </div>'
)
assert OLD_PILLS_HTML in html, "pills HTML not found"
html = html.replace(OLD_PILLS_HTML, NEW_PILLS_HTML, 1)

# ── 5. JS: add tr_wr to _optMetricVal ─────────────────────────────────────────
OLD_METRIC_VAL = (
    "function _optMetricVal(r,key){\n"
    "  if(key==='wr')return parseFloat(r.wr);\n"
    "  if(key==='pf')return parseFloat(r.pf);\n"
    "  if(key==='ret')return parseFloat(r.ret);\n"
    "  if(key==='trades')return r.trades;\n"
    "  return parseFloat(r.pf)*parseFloat(r.wr)/100;\n"
    "}"
)
NEW_METRIC_VAL = (
    "function _optMetricVal(r,key){\n"
    "  if(key==='wr')return parseFloat(r.wr);\n"
    "  if(key==='pf')return parseFloat(r.pf);\n"
    "  if(key==='ret')return parseFloat(r.ret);\n"
    "  if(key==='trades')return r.trades;\n"
    "  if(key==='tr_wr')return r.trades*(parseFloat(r.wr)/100);\n"
    "  return parseFloat(r.pf)*parseFloat(r.wr)/100;\n"
    "}"
)
assert OLD_METRIC_VAL in html, "_optMetricVal not found"
html = html.replace(OLD_METRIC_VAL, NEW_METRIC_VAL, 1)

# ── 6. Optimizer: batch 20 combos per tick at 0ms ────────────────────────────
OLD_STEP_LOOP = (
    "    var c=_COMBOS[done];\n"
    "    if(bar)bar.style.width=(done/total*100)+'%';\n"
    "    if(status)status.textContent='Testando combina\xe7\xe3o '+(done+1)+' de '+total+'...';\n"
    "    var r=_isFvgOpt?\n"
    "      _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod,tf:_optTf}):\n"
    "      _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod,tf:_optTf});\n"
    "    results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});\n"
    "    done++;\n"
    "    setTimeout(step,110);"
)
NEW_STEP_LOOP = (
    "    var batch=Math.min(20,total-done);\n"
    "    for(var _b=0;_b<batch;_b++){\n"
    "      var c=_COMBOS[done];\n"
    "      var r=_isFvgOpt?\n"
    "        _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod,tf:_optTf}):\n"
    "        _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod,tf:_optTf});\n"
    "      results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});\n"
    "      done++;\n"
    "    }\n"
    "    if(bar)bar.style.width=(done/total*100)+'%';\n"
    "    if(status)status.textContent='Testando combina\xe7\xe3o '+done+' de '+total+'...';\n"
    "    setTimeout(step,0);"
)
assert OLD_STEP_LOOP in html, "optimizer step loop not found"
html = html.replace(OLD_STEP_LOOP, NEW_STEP_LOOP, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.099 applied')
