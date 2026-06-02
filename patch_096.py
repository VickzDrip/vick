#!/usr/bin/env python3
"""Beta 0.096 — Strategy Tester: APLICAR dinâmico, Insights por indicador, 1m/2m, TF no Optimizer"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.095', 'Beta 0.096')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.096\n  - Optimizer: adiciona seletor de Per\xedodo e Par no topo da aba.',
    '''Beta 0.096
  - Strategy Tester: bot\xe3o APLICAR agora mostra o nome do indicador
    selecionado dinamicamente (HVN SIGNALS, FVG CONFLUENCE, etc).
    N\xe3o mais hardcoded — pronto para receber novos indicadores.
  - Insights adapt\xe1veis por indicador: HVN mostra pavio/HVN-distance,
    FVG mostra minAtr/mitMode/react/reentry/maxAge.
  - Adiciona timeframes 1m e 2m no seletor de TF do Backtest.
  - Optimizer: seletor de Timeframe adicionado na aba CONFIGURA\xc7\xc3O.
    TF escolhido \xe9 passado para todos os combos testados.

Beta 0.095
  - Optimizer: adiciona seletor de Per\xedodo e Par no topo da aba.''',
    1
)

# ── 3. Add 1m and 2m to stTf backtest timeframe select ───────────────────────
OLD_STF = (
    '<select class="dvl-st-sel" id="stTf"><option value="5m">5m</option>'
    '<option value="15m">15m</option><option value="30m">30m</option>'
    '<option value="1h">1h</option><option value="2h">2h</option>'
    '<option value="4h">4h</option><option value="1d">1D</option>'
    '<option value="1w">1W</option></select>'
)
NEW_STF = (
    '<select class="dvl-st-sel" id="stTf">'
    '<option value="1m">1m</option><option value="2m">2m</option>'
    '<option value="5m">5m</option><option value="15m">15m</option>'
    '<option value="30m">30m</option><option value="1h">1h</option>'
    '<option value="2h">2h</option><option value="4h">4h</option>'
    '<option value="1d">1D</option><option value="1w">1W</option></select>'
)
assert OLD_STF in html, "stTf select not found"
html = html.replace(OLD_STF, NEW_STF, 1)

# ── 4. Add Timeframe row to Optimizer CONFIGURAÇÃO (below Período+Par row) ────
OLD_OPT_CFG_ROW = (
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Par</span>\n'
    '          <select class="dvl-st-sel" id="stOptPair">\n'
    '            <option>BTC/USDT</option>\n'
    '            <option>ETH/USDT</option>\n'
    '          </select></div>\n'
    '      </div>\n'
    '      <div class="dvl-st-sl">PAR\xc2METROS TESTADOS</div>'
)
NEW_OPT_CFG_ROW = (
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Par</span>\n'
    '          <select class="dvl-st-sel" id="stOptPair">\n'
    '            <option>BTC/USDT</option>\n'
    '            <option>ETH/USDT</option>\n'
    '          </select></div>\n'
    '      </div>\n'
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Timeframe</span>\n'
    '          <select class="dvl-st-sel" id="stOptTf">\n'
    '            <option value="1m">1m</option>\n'
    '            <option value="2m">2m</option>\n'
    '            <option value="5m" selected>5m</option>\n'
    '            <option value="15m">15m</option>\n'
    '            <option value="30m">30m</option>\n'
    '            <option value="1h">1h</option>\n'
    '            <option value="2h">2h</option>\n'
    '            <option value="4h">4h</option>\n'
    '            <option value="1d">1D</option>\n'
    '            <option value="1w">1W</option>\n'
    '          </select></div>\n'
    '        <div class="dvl-st-field"></div>\n'
    '      </div>\n'
    '      <div class="dvl-st-sl">PAR\xc2METROS TESTADOS</div>'
)
assert OLD_OPT_CFG_ROW in html, "Optimizer Par row not found"
html = html.replace(OLD_OPT_CFG_ROW, NEW_OPT_CFG_ROW, 1)

# ── 5. Pass stOptTf to _cachedBacktest in _runOptimizer ───────────────────────
OLD_OPT_PERIOD_LINE = (
    "  var _optPeriod=String(parseInt((_g('stOptPeriod')||{value:'30'}).value)||30);\n"
    "  var results=[],total=_COMBOS.length,done=0;"
)
NEW_OPT_PERIOD_LINE = (
    "  var _optPeriod=String(parseInt((_g('stOptPeriod')||{value:'30'}).value)||30);\n"
    "  var _optTf=(_g('stOptTf')||{value:'5m'}).value||'5m';\n"
    "  var results=[],total=_COMBOS.length,done=0;"
)
assert OLD_OPT_PERIOD_LINE in html, "_optPeriod line not found"
html = html.replace(OLD_OPT_PERIOD_LINE, NEW_OPT_PERIOD_LINE, 1)

# ── 6. Add tf:_optTf to both cachedBacktest calls in _runOptimizer ─────────────
OLD_OPT_CALLS = (
    "    var r=_isFvgOpt?\n"
    "      _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod}):\n"
    "      _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod});"
)
NEW_OPT_CALLS = (
    "    var r=_isFvgOpt?\n"
    "      _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod,tf:_optTf}):\n"
    "      _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod,tf:_optTf});"
)
assert OLD_OPT_CALLS in html, "optimizer cachedBacktest calls not found"
html = html.replace(OLD_OPT_CALLS, NEW_OPT_CALLS, 1)

# ── 7. Add _ST_IND_NAMES map + _stApplySigLabel helper before _stSwitchInd ────
OLD_SWITCH_IND_FN = "function _stSwitchInd(v){"
NEW_SWITCH_IND_FN = (
    "var _ST_IND_NAMES={hvnSignals:'HVN SIGNALS',fvgConf:'FVG CONFLUENCE'};\n"
    "\n"
    "function _stApplySigLabel(done){\n"
    "  var ind=(_g('stInd')||{value:'hvnSignals'}).value;\n"
    "  var name=_ST_IND_NAMES[ind]||ind.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase();\n"
    "  var svgPlay='<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"11\" height=\"11\"><polygon points=\"5,3 19,12 5,21\"/></svg>';\n"
    "  var svgWave='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" width=\"12\" height=\"12\"><polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/></svg>';\n"
    "  return done?svgPlay+' APLICADO AO '+name+' ✓':svgWave+' APLICAR AO '+name;\n"
    "}\n"
    "\n"
    "function _stSwitchInd(v){"
)
assert OLD_SWITCH_IND_FN in html, "_stSwitchInd not found"
html = html.replace(OLD_SWITCH_IND_FN, NEW_SWITCH_IND_FN, 1)

# ── 8. In _stSwitchInd: refresh apply button label on indicator change ─────────
OLD_SWITCH_CLEAR_CACHE = (
    "  for(var k in _btCache)delete _btCache[k];\n"
    "}"
)
NEW_SWITCH_CLEAR_CACHE = (
    "  for(var k in _btCache)delete _btCache[k];\n"
    "  var _asb=document.getElementById('dvlSTApplySig');\n"
    "  if(_asb)_asb.innerHTML=_stApplySigLabel(false);\n"
    "}"
)
# This pattern may appear multiple times - use count-limited replace
count = html.count(OLD_SWITCH_CLEAR_CACHE)
assert count >= 1, "btCache clear in _stSwitchInd not found"
# Replace only inside the _stSwitchInd context - find the right occurrence
idx_sw = html.index("function _stSwitchInd(v){")
idx_end = html.index("(function(){", idx_sw)
block = html[idx_sw:idx_end]
assert OLD_SWITCH_CLEAR_CACHE in block, "btCache clear not inside _stSwitchInd"
new_block = block.replace(OLD_SWITCH_CLEAR_CACHE, NEW_SWITCH_CLEAR_CACHE, 1)
html = html[:idx_sw] + new_block + html[idx_end:]

# ── 9. Update apply button HTML: use _stApplySigLabel via id ──────────────────
OLD_APPLY_BTN_HTML = (
    '        <button class="dvl-st-apply-sig" id="dvlSTApplySig">\n'
    '          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>\n'
    '          APLICAR AO HVN SIGNALS\n'
    '        </button>'
)
NEW_APPLY_BTN_HTML = (
    '        <button class="dvl-st-apply-sig" id="dvlSTApplySig">\n'
    '          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>\n'
    '          APLICAR AO HVN SIGNALS\n'
    '        </button>'
)
# HTML button is fine as-is (JS overwrites innerHTML anyway), just mark it kept

# ── 10. Update applySigBtn click handler to use _stApplySigLabel ──────────────
OLD_APPLY_CLICK = (
    "  applySigBtn.addEventListener('click',function(){\n"
    "    if(!_lastBtCfg)return;\n"
    "    _applyToHVNSignals(_lastBtCfg);\n"
    "    applySigBtn.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"11\" height=\"11\"><polygon points=\"5,3 19,12 5,21\"/></svg> APLICADO AO HVN SIGNALS ✓';\n"
    "    applySigBtn.style.cssText='color:#00e676;border-color:rgba(0,220,100,.35)';\n"
    "    setTimeout(function(){\n"
    "      applySigBtn.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" width=\"12\" height=\"12\"><polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/></svg> APLICAR AO HVN SIGNALS';\n"
    "      applySigBtn.style.cssText='';\n"
    "    },2800);\n"
    "  });"
)
NEW_APPLY_CLICK = (
    "  applySigBtn.addEventListener('click',function(){\n"
    "    if(!_lastBtCfg)return;\n"
    "    _applyToHVNSignals(_lastBtCfg);\n"
    "    applySigBtn.innerHTML=_stApplySigLabel(true);\n"
    "    applySigBtn.style.cssText='color:#00e676;border-color:rgba(0,220,100,.35)';\n"
    "    setTimeout(function(){\n"
    "      applySigBtn.innerHTML=_stApplySigLabel(false);\n"
    "      applySigBtn.style.cssText='';\n"
    "    },2800);\n"
    "  });"
)
assert OLD_APPLY_CLICK in html, "applySigBtn click handler not found"
html = html.replace(OLD_APPLY_CLICK, NEW_APPLY_CLICK, 1)

# ── 11. Update _renderInsights to dispatch by indicator ───────────────────────
OLD_RENDER_INSIGHTS = (
    "function _renderInsights(r){\n"
    "  var el=_g('dvlSTInsights');if(!el)return;\n"
    "  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);\n"
    "  var clarity=_parseThresh(r.cfg.trend),flow=_parseThresh(r.cfg.flow);\n"
    "  var ws=parseFloat(r.cfg.wickSens)||45;\n"
    "  var msgs=[];\n"
    "  if(clarity!==null&&flow!==null){\n"
    "    var cl=_tLabel(clarity),fl=_fLabel(flow);\n"
    "    msgs.push({i:'✅',t:'Filtros combinados <b>'+cl+' + '+fl+'</b> aumentaram consist\xeancia dos sinais.'});\n"
    "  }\n"
    "  if(clarity!==null&&clarity<0)msgs.push({i:'⚠️',t:'Threshold negativo (<b>'+clarity+'</b>) filtra apenas setups SHORT. Verifique se h\xe1 trades suficientes.'});\n"
    "  if(ws>=45)msgs.push({i:'✅',t:'Pavio acima de <b>'+ws+'%</b> com fechamento fora da zona foram mais consistentes.'});\n"
    "  var nh=parseFloat(r.cfg.nextHVN)||0.35;\n"
    "  if(nh<=0.35)msgs.push({i:'⚠️',t:'Quando a pr\xf3xima HVN est\xe1 a menos de <b>'+nh+'%</b>, o retorno m\xe9dio cai.'});\n"
    "  msgs.push({i:'💡',t:'Melhor dire\xe7\xe3o: <b>'+r.bestDir+'</b> \xb7 Melhor sess\xe3o: <b>'+r.bestSess+'</b>.'});\n"
    "  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> indica edge positivo consistente.'});\n"
    "  if(wr<50)msgs.push({i:'⚠️',t:'Win Rate abaixo de 50%. Considere ajustar os filtros.'});\n"
    "  if(wr>=60&&pf>=1.7)msgs.push({i:'🌟',t:'Configura\xe7\xe3o com alta assertividade. Resultados acima da m\xe9dia hist\xf3rica.'});\n"
    "  el.innerHTML=msgs.map(function(m){\n"
    "    return '<div class=\"dvl-st-ins\"><span class=\"dvl-st-ico\">'+m.i+'</span><span class=\"dvl-st-itxt\">'+m.t+'</span></div>';\n"
    "  }).join('');\n"
    "}"
)
NEW_RENDER_INSIGHTS = (
    "function _renderInsights(r){\n"
    "  if(r.cfg&&r.cfg.signalType==='fvgConf')return _renderInsightsFVG(r);\n"
    "  _renderInsightsHVN(r);\n"
    "}\n"
    "\n"
    "function _renderInsightsHVN(r){\n"
    "  var el=_g('dvlSTInsights');if(!el)return;\n"
    "  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);\n"
    "  var clarity=_parseThresh(r.cfg.trend),flow=_parseThresh(r.cfg.flow);\n"
    "  var ws=parseFloat(r.cfg.wickSens)||45;\n"
    "  var msgs=[];\n"
    "  if(clarity!==null&&flow!==null){\n"
    "    var cl=_tLabel(clarity),fl=_fLabel(flow);\n"
    "    msgs.push({i:'✅',t:'Filtros combinados <b>'+cl+' + '+fl+'</b> aumentaram consist\xeancia dos sinais.'});\n"
    "  }\n"
    "  if(clarity!==null&&clarity<0)msgs.push({i:'⚠️',t:'Threshold negativo (<b>'+clarity+'</b>) filtra apenas setups SHORT. Verifique se h\xe1 trades suficientes.'});\n"
    "  if(ws>=45)msgs.push({i:'✅',t:'Pavio acima de <b>'+ws+'%</b> com fechamento fora da zona foram mais consistentes.'});\n"
    "  var nh=parseFloat(r.cfg.nextHVN)||0.35;\n"
    "  if(nh<=0.35)msgs.push({i:'⚠️',t:'Quando a pr\xf3xima HVN est\xe1 a menos de <b>'+nh+'%</b>, o retorno m\xe9dio cai.'});\n"
    "  msgs.push({i:'💡',t:'Melhor dire\xe7\xe3o: <b>'+r.bestDir+'</b> \xb7 Melhor sess\xe3o: <b>'+r.bestSess+'</b>.'});\n"
    "  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> indica edge positivo consistente.'});\n"
    "  if(wr<50)msgs.push({i:'⚠️',t:'Win Rate abaixo de 50%. Considere ajustar os filtros.'});\n"
    "  if(wr>=60&&pf>=1.7)msgs.push({i:'🌟',t:'Configura\xe7\xe3o com alta assertividade. Resultados acima da m\xe9dia hist\xf3rica.'});\n"
    "  el.innerHTML=msgs.map(function(m){\n"
    "    return '<div class=\"dvl-st-ins\"><span class=\"dvl-st-ico\">'+m.i+'</span><span class=\"dvl-st-itxt\">'+m.t+'</span></div>';\n"
    "  }).join('');\n"
    "}\n"
    "\n"
    "function _renderInsightsFVG(r){\n"
    "  var el=_g('dvlSTInsights');if(!el)return;\n"
    "  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);\n"
    "  var clarity=_parseThresh(r.cfg.trend),flow=_parseThresh(r.cfg.flow);\n"
    "  var minAtr=parseFloat(r.cfg.fvgMinAtr)||0.08;\n"
    "  var mit=r.cfg.fvgMit||'wick';\n"
    "  var react=r.cfg.fvgReact,reentry=r.cfg.fvgReentry;\n"
    "  var maxAge=parseInt(r.cfg.fvgMaxAge)||0;\n"
    "  var msgs=[];\n"
    "  if(clarity!==null&&flow!==null){\n"
    "    var cl=_tLabel(clarity),fl=_fLabel(flow);\n"
    "    msgs.push({i:'✅',t:'Confirma\xe7\xe3o dupla <b>'+cl+' + '+fl+'</b> melhorou a qualidade dos setups FVG.'});\n"
    "  }\n"
    "  if(minAtr>=0.10)msgs.push({i:'✅',t:'FVGs com tamanho m\xednimo de <b>'+minAtr+'× ATR</b> filtraram gaps fracos e aumentaram precis\xe3o.'});\n"
    "  else msgs.push({i:'⚠️',t:'MinAtr baixo (<b>'+minAtr+'</b>): muitos gaps pequenos podem diluir o edge.'});\n"
    "  var mitLbl={wick:'pavio',close:'fechamento',body:'corpo'}[mit]||mit;\n"
    "  msgs.push({i:'💡',t:'Modo de mitiga\xe7\xe3o: <b>'+mitLbl+'</b>. '+(mit==='close'?'Fechamentos dentro do gap s\xe3o mais conservadores.':'Pavio dentro do gap aceita toques r\xe1pidos.')});\n"
    "  if(react)msgs.push({i:'✅',t:'Confirma\xe7\xe3o de rea\xe7\xe3o ativa: exige vela de revers\xe3o ap\xf3s o toque no gap.'});\n"
    "  else msgs.push({i:'⚠️',t:'Sem confirma\xe7\xe3o de rea\xe7\xe3o: entradas mais agressivas, risco maior de falso sinal.'});\n"
    "  if(reentry)msgs.push({i:'💡',t:'Reentrada habilitada: aproveita retestar do FVG para melhorar pre\xe7o m\xe9dio.'});\n"
    "  if(maxAge>0)msgs.push({i:'💡',t:'Idade m\xe1xima do gap: <b>'+maxAge+' candles</b>. Limita entradas a FVGs recentes e mais relevantes.'});\n"
    "  msgs.push({i:'💡',t:'Melhor dire\xe7\xe3o: <b>'+r.bestDir+'</b> \xb7 Melhor sess\xe3o: <b>'+r.bestSess+'</b>.'});\n"
    "  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> — edge positivo s\xf3lido para FVG Confluence.'});\n"
    "  if(wr<50)msgs.push({i:'⚠️',t:'Win Rate abaixo de 50%. Considere aumentar MinAtr ou ativar confirma\xe7\xe3o de rea\xe7\xe3o.'});\n"
    "  if(wr>=60&&pf>=1.7)msgs.push({i:'🌟',t:'Configura\xe7\xe3o FVG com alta assertividade. Resultados acima da m\xe9dia hist\xf3rica.'});\n"
    "  el.innerHTML=msgs.map(function(m){\n"
    "    return '<div class=\"dvl-st-ins\"><span class=\"dvl-st-ico\">'+m.i+'</span><span class=\"dvl-st-itxt\">'+m.t+'</span></div>';\n"
    "  }).join('');\n"
    "}"
)
assert OLD_RENDER_INSIGHTS in html, "_renderInsights not found"
html = html.replace(OLD_RENDER_INSIGHTS, NEW_RENDER_INSIGHTS, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.096 applied')
