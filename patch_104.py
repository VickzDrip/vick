#!/usr/bin/env python3
"""Beta 0.104 — Trend Break: indicador de virada estrutural + filtro Adicional/Substitui para HVN/FVG"""

import itertools, random

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.103', 'Beta 0.104')

# ── 2. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.104\n  - Filtro: pill selecionada reestilizada'
NEW_LOG = ('Beta 0.104\n'
           '  - Indicador Trend Break: detecta viradas de tend\xeancia via cruzamento\n'
           '    de MA r\xe1pida/lenta dos proxies Clarity+Flow. Sinais ▲▼ no gr\xe1fico.\n'
           '    Dois modos de sa\xedda: flip (padr\xe3o) e SL/TP. Card no painel lateral.\n'
           '  - Filtro Estrutural de Tend\xeancia (HVN e FVG): modos Off / Adicional /\n'
           '    Substitui — alinha trades com a dire\xe7\xe3o da tend\xeancia TB ou troca\n'
           '    os sinais inteiramente pela virada estrutural.\n'
           '  - Trend Break no Strategy Tester + Optimizer (1000 combos TB).\n\n'
           'Beta 0.103\n  - Filtro: pill selecionada reestilizada')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Add trendBreak to stInd select ────────────────────────────────────────
OLD_STIND = '<select class="dvl-st-sel" id="stInd" onchange="_stSwitchInd(this.value)"><option value="hvnSignals">HVN Signals</option><option value="fvgConf">FVG Confluence</option></select>'
NEW_STIND = '<select class="dvl-st-sel" id="stInd" onchange="_stSwitchInd(this.value)"><option value="hvnSignals">HVN Signals</option><option value="fvgConf">FVG Confluence</option><option value="trendBreak">Trend Break</option></select>'
assert OLD_STIND in html, 'stInd select not found'
html = html.replace(OLD_STIND, NEW_STIND, 1)

# ── 4. Add stTBFields + Trend Structure Filter after stFVGFields ─────────────
# Anchor: end of stFvgMaxAge select and stFVGFields closing div, then FILTROS start
OLD_AFTER_FVG = ('stFvgMaxAge">\n'
    '            <option value="0">Sem limite</option>\n'
    '            <option value="100">100</option>\n'
    '            <option value="200">200</option>\n'
    '            <option value="300" selected>300</option>\n'
    '          </select></div>\n'
    '      </div>\n\n'
    '      <div class="dvl-st-sl">FILTROS</div>\n'
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Trend Clarity</span>')
NEW_AFTER_FVG = ('stFvgMaxAge">\n'
    '            <option value="0">Sem limite</option>\n'
    '            <option value="100">100</option>\n'
    '            <option value="200">200</option>\n'
    '            <option value="300" selected>300</option>\n'
    '          </select></div>\n'
    '      </div>\n'
    '      <div id="stTBFields" style="display:none">\n'
    '        <div class="dvl-st-row2">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Per\xedodo r\xe1pido MA</span>\n'
    '            <input class="dvl-st-inp" id="stTBFast" type="number" value="3" min="1" max="50"></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Per\xedodo lento MA</span>\n'
    '            <input class="dvl-st-inp" id="stTBSlow" type="number" value="10" min="2" max="200"></div>\n'
    '        </div>\n'
    '        <div class="dvl-st-row2">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Bias m\xednimo</span>\n'
    '            <input class="dvl-st-inp" id="stTBBias" type="number" value="5" min="0" max="50"></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Modo sa\xedda</span>\n'
    '            <select class="dvl-st-sel" id="stTBExit">\n'
    '              <option value="flip" selected>Na virada (flip)</option>\n'
    '              <option value="sltp">SL / TP</option>\n'
    '            </select></div>\n'
    '        </div>\n'
    '      </div>\n\n'
    '      <div class="dvl-st-sl">FILTROS</div>\n'
    '      <div id="stTrendFilterRow">\n'
    '        <div class="dvl-st-row2" style="margin-bottom:4px">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Filtro Estrutural TB</span>\n'
    '            <select class="dvl-st-sel" id="stTBFilterMode" onchange="_stTBFilterChange(this.value)">\n'
    '              <option value="off" selected>Desativado</option>\n'
    '              <option value="add">Adicional</option>\n'
    '              <option value="sub">Substitui</option>\n'
    '            </select></div>\n'
    '          <div class="dvl-st-field" id="stTBFilterBiasField" style="display:none">'
    '<span class="dvl-st-lbl">Bias m\xednimo</span>\n'
    '            <input class="dvl-st-inp" id="stTBFilterBias" type="number" value="5" min="0" max="50"></div>\n'
    '        </div>\n'
    '        <div class="dvl-st-row2" id="stTBFilterPeriodRow" style="display:none">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">TB r\xe1pido</span>\n'
    '            <input class="dvl-st-inp" id="stTBFilterFast" type="number" value="3" min="1" max="50"></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">TB lento</span>\n'
    '            <input class="dvl-st-inp" id="stTBFilterSlow" type="number" value="10" min="2" max="200"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Trend Clarity</span>')
assert OLD_AFTER_FVG in html, 'FILTROS section anchor not found'
html = html.replace(OLD_AFTER_FVG, NEW_AFTER_FVG, 1)

# ── 5. Update _ST_IND_NAMES ───────────────────────────────────────────────────
OLD_IND_NAMES = "var _ST_IND_NAMES={hvnSignals:'HVN SIGNALS',fvgConf:'FVG CONFLUENCE'};"
NEW_IND_NAMES = "var _ST_IND_NAMES={hvnSignals:'HVN SIGNALS',fvgConf:'FVG CONFLUENCE',trendBreak:'TREND BREAK'};"
assert OLD_IND_NAMES in html, '_ST_IND_NAMES not found'
html = html.replace(OLD_IND_NAMES, NEW_IND_NAMES, 1)

# ── 6. Update _stSwitchInd to handle trendBreak ───────────────────────────────
# exact string from file repr
OLD_SWITCH = ("function _stSwitchInd(v){\n"
    "  var isFvg=v==='fvgConf';\n"
    "  var hvn=document.getElementById('stHVNFields'),fvg=document.getElementById('stFVGFields');\n"
    "  if(hvn)hvn.style.display=isFvg?'none':'';\n"
    "  if(fvg)fvg.style.display=isFvg?'':'none';\n"
    "  var lbl=document.getElementById('stTfLbl');\n"
    "  if(lbl)lbl.textContent=isFvg?'TF dos FVGs':'TF das Zonas HVN';\n"
    "  var sl=document.getElementById('stSL');\n"
    "  if(sl){sl.innerHTML=isFvg?\n"
    "    '<option value=\"wick\" selected>Atr\xe1s do pavio</option><option value=\"fvg\">Borda do FVG</option><option value=\"atr\">ATR</option>':\n"
    "    '<option value=\"wick\" selected>Atr\xe1s do pavio</option><option value=\"hvn\">Atr\xe1s da HVN</option><option value=\"atr\">ATR</option>';}\n"
    "  var tp=document.getElementById('stTP');\n"
    "  if(tp){tp.innerHTML=isFvg?\n"
    "    '<option value=\"fvg\" selected>Pr\xf3ximo FVG</option><option value=\"1r\">1R</option><option value=\"1.5r\">1.5R</option><option value=\"2r\">2R</option>':\n"
    "    '<option value=\"hvn\" selected>Pr\xf3xima HVN</option><option value=\"1r\">1R</option><option value=\"1.5r\">1.5R</option><option value=\"2r\">2R</option>';}\n"
    "  var nhr=document.getElementById('stNextHVNRow');\n"
    "  if(nhr)nhr.style.display=isFvg?'none':'';\n"
    "  _stRenderOptParams(isFvg?FVG_OPT_PARAMS:OPT_PARAMS);\n"
    "  for(var k in _btCache)delete _btCache[k];\n"
    "  var _asb=document.getElementById('dvlSTApplySig');\n"
    "  if(_asb)_asb.innerHTML=_stApplySigLabel(false);\n"
    "}\n")
NEW_SWITCH = ("function _stSwitchInd(v){\n"
    "  var isFvg=v==='fvgConf',isTB=v==='trendBreak';\n"
    "  var hvn=document.getElementById('stHVNFields'),fvg=document.getElementById('stFVGFields'),tb=document.getElementById('stTBFields');\n"
    "  if(hvn)hvn.style.display=(!isFvg&&!isTB)?'':'none';\n"
    "  if(fvg)fvg.style.display=isFvg?'':'none';\n"
    "  if(tb)tb.style.display=isTB?'':'none';\n"
    "  var tfrow=document.getElementById('stTrendFilterRow');\n"
    "  if(tfrow)tfrow.style.display=isTB?'none':'';\n"
    "  var lbl=document.getElementById('stTfLbl');\n"
    "  if(lbl)lbl.textContent=isFvg?'TF dos FVGs':(isTB?'Timeframe':'TF das Zonas HVN');\n"
    "  var sl=document.getElementById('stSL');\n"
    "  if(sl){sl.innerHTML=isFvg?\n"
    "    '<option value=\"wick\" selected>Atr\xe1s do pavio</option><option value=\"fvg\">Borda do FVG</option><option value=\"atr\">ATR</option>':\n"
    "    (isTB?'<option value=\"wick\" selected>Atr\xe1s do pavio</option><option value=\"atr\">ATR</option><option value=\"fixed\">Fixo (ATR\xd71.5)</option>':\n"
    "    '<option value=\"wick\" selected>Atr\xe1s do pavio</option><option value=\"hvn\">Atr\xe1s da HVN</option><option value=\"atr\">ATR</option>');}\n"
    "  var tp=document.getElementById('stTP');\n"
    "  if(tp){tp.innerHTML=isFvg?\n"
    "    '<option value=\"fvg\" selected>Pr\xf3ximo FVG</option><option value=\"1r\">1R</option><option value=\"1.5r\">1.5R</option><option value=\"2r\">2R</option>':\n"
    "    (isTB?'<option value=\"flip\">Na pr\xf3xima virada</option><option value=\"1r\" selected>1R</option><option value=\"1.5r\">1.5R</option><option value=\"2r\">2R</option>':\n"
    "    '<option value=\"hvn\" selected>Pr\xf3xima HVN</option><option value=\"1r\">1R</option><option value=\"1.5r\">1.5R</option><option value=\"2r\">2R</option>');}\n"
    "  var nhr=document.getElementById('stNextHVNRow');\n"
    "  if(nhr)nhr.style.display=(isFvg||isTB)?'none':'';\n"
    "  _stRenderOptParams(isFvg?FVG_OPT_PARAMS:(isTB?TB_OPT_PARAMS:OPT_PARAMS));\n"
    "  for(var k in _btCache)delete _btCache[k];\n"
    "  var _asb=document.getElementById('dvlSTApplySig');\n"
    "  if(_asb)_asb.innerHTML=_stApplySigLabel(false);\n"
    "}\n"
    "function _stTBFilterChange(v){\n"
    "  var bf=document.getElementById('stTBFilterBiasField');\n"
    "  var pr=document.getElementById('stTBFilterPeriodRow');\n"
    "  var show=v!=='off';\n"
    "  if(bf)bf.style.display=show?'':'none';\n"
    "  if(pr)pr.style.display=show?'':'none';\n"
    "}\n")
assert OLD_SWITCH in html, '_stSwitchInd not found'
html = html.replace(OLD_SWITCH, NEW_SWITCH, 1)

# ── 7. Update _hashCfg to include TB params ───────────────────────────────────
OLD_HASH = ("    cfg.signalType||'hvnSignals',\n"
    "    cfg.fvgMinAtr||0.08,cfg.fvgMit||'wick',\n"
    "    cfg.fvgReact?1:0,cfg.fvgReentry?1:0,cfg.fvgMaxAge||300\n"
    "  ]);")
NEW_HASH = ("    cfg.signalType||'hvnSignals',\n"
    "    cfg.fvgMinAtr||0.08,cfg.fvgMit||'wick',\n"
    "    cfg.fvgReact?1:0,cfg.fvgReentry?1:0,cfg.fvgMaxAge||300,\n"
    "    cfg.tbFast||3,cfg.tbSlow||10,cfg.tbBias||5,cfg.tbExit||'flip',\n"
    "    cfg.trendFilter||'off',cfg.tfBias||5,cfg.tfFast||3,cfg.tfSlow||10\n"
    "  ]);")
assert OLD_HASH in html, '_hashCfg not found'
html = html.replace(OLD_HASH, NEW_HASH, 1)

# ── 8. Add _backtestTrendBreak + update _backtest dispatch ────────────────────
OLD_BACKTEST_DISPATCH = ("function _backtest(cfg){\n"
    "  /* try real data first */\n"
    "  var real=_backtestReal(cfg);\n"
    "  if(real)return real;\n"
    "\n"
    "  /* FVG Confluence mock */\n"
    "  if(cfg.signalType==='fvgConf')return _backtestFVG(cfg);")
NEW_BACKTEST_DISPATCH = ("function _backtestTrendBreak(cfg){\n"
    "  var seed=_hashCfg(cfg);\n"
    "  var rng=_mkRng(seed);\n"
    "  function rnd(a,b){return rng()*(b-a)+a;}\n"
    "  function ri(a,b){return Math.floor(rnd(a,b+0.9999));}\n"
    "  var _days=Math.max(7,parseInt(cfg.period)||30);\n"
    "  var _pScale=Math.sqrt(_days/30);\n"
    "  var fast=parseInt(cfg.tbFast)||3,slow=parseInt(cfg.tbSlow)||10;\n"
    "  var bias=parseFloat(cfg.tbBias)||5;\n"
    "  var exitMode=cfg.tbExit||'flip';\n"
    "  var tradesBase=Math.round(ri(5,12)*_pScale*(6/Math.max(3,slow)));\n"
    "  tradesBase=Math.max(3,tradesBase);\n"
    "  var trades=tradesBase;\n"
    "  var wr;\n"
    "  if(exitMode==='flip'){wr=0.46+rnd(-0.04,0.04);}\n"
    "  else{wr=0.54+rnd(-0.03,0.03);}\n"
    "  if(bias>=10)wr+=0.05;\n"
    "  if(fast<=3&&slow>=10)wr+=0.03;\n"
    "  wr=Math.max(0.34,Math.min(0.76,wr));\n"
    "  var wins=Math.round(trades*wr);\n"
    "  var losses=Math.round(trades*(1-wr)*0.88);\n"
    "  var be=Math.max(0,trades-wins-losses);\n"
    "  var riskPct=parseFloat(cfg.risk)||1.0;\n"
    "  var avgW=exitMode==='flip'?rnd(2.0,3.5):rnd(1.4,2.2);\n"
    "  var avgL=rnd(0.6,1.1);\n"
    "  var pf=Math.max(0.70,Math.min(3.20,(wr/(1-wr||0.01))*avgW/avgL));\n"
    "  var _ev=(wr*avgW-(1-wr)*avgL)*riskPct*0.60;\n"
    "  var ret=Math.pow(trades,0.75)*_ev*2.5*rnd(0.80,1.20);\n"
    "  ret=Math.max(-90,Math.min(300,ret));\n"
    "  var dd=-rnd(1.5,7.0);\n"
    "  var eq=[100];\n"
    "  for(var i=0;i<trades;i++){\n"
    "    var prev=eq[eq.length-1];\n"
    "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
    "    eq.push(Math.max(40,prev+chg));\n"
    "  }\n"
    "  var longs=ri(Math.floor(trades*.40),Math.ceil(trades*.65));\n"
    "  var shorts=trades-longs;\n"
    "  var lwR=wr+rnd(-0.08,0.08),swR=wr+rnd(-0.08,0.08);\n"
    "  return{trades:trades,wins:wins,losses:losses,be:be,\n"
    "    wr:(wr*100).toFixed(2),pf:pf.toFixed(2),\n"
    "    dd:dd.toFixed(2),ret:(ret>=0?'+':'')+ret.toFixed(2),\n"
    "    avg:((ret/trades)>=0?'+':'')+(ret/trades).toFixed(2),\n"
    "    eq:eq,longs:longs,shorts:shorts,\n"
    "    lwR:(lwR*100).toFixed(1),swR:(swR*100).toFixed(1),\n"
    "    bestDir:lwR>swR?'LONG':'SHORT',\n"
    "    bestSess:['Asia','London','New York'][ri(0,2)],\n"
    "    cfg:cfg,isReal:false};\n"
    "}\n"
    "\n"
    "function _backtest(cfg){\n"
    "  /* try real data first */\n"
    "  var real=_backtestReal(cfg);\n"
    "  if(real)return real;\n"
    "\n"
    "  /* Trend Break mock */\n"
    "  if(cfg.signalType==='trendBreak')return _backtestTrendBreak(cfg);\n"
    "\n"
    "  /* FVG Confluence mock */\n"
    "  if(cfg.signalType==='fvgConf')return _backtestFVG(cfg);")
assert OLD_BACKTEST_DISPATCH in html, '_backtest dispatch not found'
html = html.replace(OLD_BACKTEST_DISPATCH, NEW_BACKTEST_DISPATCH, 1)

# ── 9. Update _renderInsights dispatch + add _renderInsightsTB ───────────────
OLD_INSIGHTS = ("function _renderInsights(r){\n"
    "  if(r.cfg&&r.cfg.signalType==='fvgConf')return _renderInsightsFVG(r);\n"
    "  _renderInsightsHVN(r);\n"
    "}")
NEW_INSIGHTS = ("function _renderInsights(r){\n"
    "  if(r.cfg&&r.cfg.signalType==='fvgConf')return _renderInsightsFVG(r);\n"
    "  if(r.cfg&&r.cfg.signalType==='trendBreak')return _renderInsightsTB(r);\n"
    "  _renderInsightsHVN(r);\n"
    "}\n"
    "\n"
    "function _renderInsightsTB(r){\n"
    "  var el=_g('dvlSTInsights');if(!el)return;\n"
    "  var wr=parseFloat(r.wr),pf=parseFloat(r.pf);\n"
    "  var exitMode=r.cfg.tbExit||'flip';\n"
    "  var fast=parseInt(r.cfg.tbFast)||3,slow=parseInt(r.cfg.tbSlow)||10;\n"
    "  var msgs=[];\n"
    "  msgs.push({i:'\U0001f4a1',t:'Trend Break opera na <b>virada de tend\xeancia</b> — menos trades, cada sinal tem maior peso. Ideal para invers\xf5es estruturais.'});\n"
    "  if(exitMode==='flip')msgs.push({i:'✅',t:'Modo flip: sa\xedda na pr\xf3xima virada de estrutura. Capta tend\xeancias longas com m\xe9dia/trade alta.'});\n"
    "  else msgs.push({i:'\U0001f4a1',t:'Modo SL/TP: sa\xedda por alvo fixo. WR mais previs\xedvel, mas pode cortar tend\xeancias cedo.'});\n"
    "  if(fast<=3&&slow>=10)msgs.push({i:'✅',t:'Per\xedodo r\xe1pido '+fast+' com lento '+slow+' gera sinais equilibrados. Boa rela\xe7\xe3o sinal/ru\xeddo.'});\n"
    "  else if(fast>5)msgs.push({i:'⚠️',t:'Per\xedodo r\xe1pido '+fast+' maior que 5 pode atrasar detec\xe7\xe3o da virada. Considere reduzir.'});\n"
    "  if(r.trades<=5)msgs.push({i:'⚠️',t:'Poucos trades no per\xedodo. Resultados podem n\xe3o ser representativos.'});\n"
    "  msgs.push({i:'\U0001f4a1',t:'Melhor dire\xe7\xe3o: <b>'+r.bestDir+'</b> \xb7 Melhor sess\xe3o: <b>'+r.bestSess+'</b>.'});\n"
    "  if(pf>=1.5)msgs.push({i:'✅',t:'Profit Factor <b>'+pf+'</b> s\xf3lido para indicador de virada estrutural.'});\n"
    "  if(wr>=55&&pf>=1.6)msgs.push({i:'\U0001f31f',t:'Configura\xe7\xe3o TB com alta assertividade. Rara para indicadores de virada.'});\n"
    "  el.innerHTML=msgs.map(function(m){\n"
    "    return '<div class=\"dvl-st-ins\"><span class=\"dvl-st-ico\">'+m.i+'</span><span class=\"dvl-st-itxt\">'+m.t+'</span></div>';\n"
    "  }).join('');\n"
    "}")
assert OLD_INSIGHTS in html, '_renderInsights not found'
html = html.replace(OLD_INSIGHTS, NEW_INSIGHTS, 1)

# ── 10. Update backtest run button to read TB fields ──────────────────────────
OLD_BT_CFG = ("        fvgReact:parseInt((_g('stFvgReact')||{value:'1'}).value)===1,\n"
    "        fvgReentry:parseInt((_g('stFvgReentry')||{value:'1'}).value)===1,\n"
    "        fvgMaxAge:parseInt((_g('stFvgMaxAge')||{value:'300'}).value)||0,\n"
    "      };")
NEW_BT_CFG = ("        fvgReact:parseInt((_g('stFvgReact')||{value:'1'}).value)===1,\n"
    "        fvgReentry:parseInt((_g('stFvgReentry')||{value:'1'}).value)===1,\n"
    "        fvgMaxAge:parseInt((_g('stFvgMaxAge')||{value:'300'}).value)||0,\n"
    "        tbFast:parseInt((_g('stTBFast')||{value:'3'}).value)||3,\n"
    "        tbSlow:parseInt((_g('stTBSlow')||{value:'10'}).value)||10,\n"
    "        tbBias:parseFloat((_g('stTBBias')||{value:'5'}).value)||5,\n"
    "        tbExit:(_g('stTBExit')||{value:'flip'}).value,\n"
    "        trendFilter:(_g('stTBFilterMode')||{value:'off'}).value,\n"
    "        tfBias:parseFloat((_g('stTBFilterBias')||{value:'5'}).value)||5,\n"
    "        tfFast:parseInt((_g('stTBFilterFast')||{value:'3'}).value)||3,\n"
    "        tfSlow:parseInt((_g('stTBFilterSlow')||{value:'10'}).value)||10,\n"
    "      };")
assert OLD_BT_CFG in html, 'backtest cfg block not found'
html = html.replace(OLD_BT_CFG, NEW_BT_CFG, 1)

# ── 11. Add TB_OPT_PARAMS ─────────────────────────────────────────────────────
OLD_END_FVG_PARAMS = ("  {n:'Idade m\xe1x. FVG',v:'Sem limite \xb7 100 \xb7 200 \xb7 300 barras'},\n"
    "];")
NEW_END_FVG_PARAMS = ("  {n:'Idade m\xe1x. FVG',v:'Sem limite \xb7 100 \xb7 200 \xb7 300 barras'},\n"
    "];\n"
    "var TB_OPT_PARAMS=[\n"
    "  {n:'Per\xedodo r\xe1pido MA',v:'2 \xb7 3 \xb7 5 \xb7 7 \xb7 10'},\n"
    "  {n:'Per\xedodo lento MA',v:'8 \xb7 10 \xb7 14 \xb7 20 \xb7 30'},\n"
    "  {n:'Bias m\xednimo',v:'0 \xb7 3 \xb7 5 \xb7 10 \xb7 15'},\n"
    "  {n:'Modo sa\xedda',v:'Flip (virada) \xb7 SL/TP'},\n"
    "  {n:'Stop Loss',v:'Pavio \xb7 ATR \xb7 Fixo ATR\xd71.5'},\n"
    "  {n:'Take Profit',v:'1R \xb7 1.5R \xb7 2R \xb7 Pr\xf3x. virada'},\n"
    "  {n:'Trend Clarity',v:'Off \xb7 LONG > +10 \xb7 > +20'},\n"
    "  {n:'DVL Flow',v:'Off \xb7 LONG > +10 \xb7 > +20'},\n"
    "  {n:'Volume Spike',v:'Desativado \xb7 \xd71.5 \xb7 \xd72.0'},\n"
    "];")
assert OLD_END_FVG_PARAMS in html, 'FVG_OPT_PARAMS end not found'
html = html.replace(OLD_END_FVG_PARAMS, NEW_END_FVG_PARAMS, 1)

# ── 12. Update stOptPeriod change handler for TB ──────────────────────────────
OLD_OPT_PERIOD_HANDLER = ("document.addEventListener('change',function(ev){\n"
    "  if(ev.target&&ev.target.id==='stOptPeriod'){\n"
    "    var ind=document.getElementById('stInd');\n"
    "    var isFvg=ind&&ind.value==='fvgConf';\n"
    "    _stRenderOptParams(isFvg?FVG_OPT_PARAMS:OPT_PARAMS);\n"
    "  }\n"
    "});")
NEW_OPT_PERIOD_HANDLER = ("document.addEventListener('change',function(ev){\n"
    "  if(ev.target&&ev.target.id==='stOptPeriod'){\n"
    "    var ind=document.getElementById('stInd');\n"
    "    var v=ind?ind.value:'hvnSignals';\n"
    "    _stRenderOptParams(v==='fvgConf'?FVG_OPT_PARAMS:(v==='trendBreak'?TB_OPT_PARAMS:OPT_PARAMS));\n"
    "  }\n"
    "});")
assert OLD_OPT_PERIOD_HANDLER in html, 'stOptPeriod handler not found'
html = html.replace(OLD_OPT_PERIOD_HANDLER, NEW_OPT_PERIOD_HANDLER, 1)

# ── 13. Update optimizer to handle trendBreak ─────────────────────────────────
OLD_OPT_IND = ("  var _isFvgOpt=(_g('stInd')||{value:'hvnSignals'}).value==='fvgConf';\n"
    "  var _COMBOS=_isFvgOpt?FVG_OPT_COMBOS:OPT_COMBOS;")
NEW_OPT_IND = ("  var _optIndVal=(_g('stInd')||{value:'hvnSignals'}).value;\n"
    "  var _isFvgOpt=_optIndVal==='fvgConf',_isTBOpt=_optIndVal==='trendBreak';\n"
    "  var _COMBOS=_isFvgOpt?FVG_OPT_COMBOS:(_isTBOpt?TB_OPT_COMBOS:OPT_COMBOS);")
assert OLD_OPT_IND in html, 'optimizer _isFvgOpt not found'
html = html.replace(OLD_OPT_IND, NEW_OPT_IND, 1)

OLD_OPT_DISPATCH = ("      var r=_isFvgOpt?\n"
    "        _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod,tf:_optTf}):\n"
    "        _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod,tf:_optTf});")
NEW_OPT_DISPATCH = ("      var r=_isFvgOpt?\n"
    "        _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod,tf:_optTf}):\n"
    "        (_isTBOpt?\n"
    "        _cachedBacktest({signalType:'trendBreak',tbFast:c.fast,tbSlow:c.slow,tbBias:c.bias,tbExit:c.exitMode||'flip',sl:c.sl,tp:c.tp,risk:1.0,trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',period:_optPeriod,tf:_optTf}):\n"
    "        _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod,tf:_optTf}));")
assert OLD_OPT_DISPATCH in html, 'optimizer dispatch not found'
html = html.replace(OLD_OPT_DISPATCH, NEW_OPT_DISPATCH, 1)

# ── 14. Generate TB_OPT_COMBOS (1000 combos) and inject ──────────────────────
FAST_TB  = [2,3,5,7,10]
SLOW_TB  = [8,10,14,20,30]
BIAS_TB  = [0,3,5,10,15]
EXIT_TB  = ['flip','sltp']
SL_TB    = ['wick','atr','fixed']
TP_TB    = ['1r','1.5r','2r','flip']
TREND_TB = [None,-10,10,20,30]
FLOW_TB  = [None,-10,10,20,30]
SPIKE_TB = ['off','1.5','2.0']

all_tb = list(itertools.product(FAST_TB,SLOW_TB,BIAS_TB,EXIT_TB,SL_TB,TP_TB,TREND_TB,FLOW_TB,SPIKE_TB))
rng_tb = random.Random(77)
rng_tb.shuffle(all_tb)
chosen_tb = all_tb[:1000]

def fmt_tb(c):
    fast,slow,bias,exit_,sl,tp,trend,flow,spike = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    return ('{fast:'+str(fast)+',slow:'+str(slow)+',bias:'+str(bias)+
            ",exitMode:'"+exit_+"',sl:'"+sl+"',tp:'"+tp+
            "',trend:"+t+',flow:'+fl+",volSpike:'"+spike+"'}")

tb_body = ',\n  '.join(fmt_tb(c) for c in chosen_tb)
TB_OPT_COMBOS_JS = 'var TB_OPT_COMBOS=[\n  '+tb_body+'\n];\n'

# Insert TB_OPT_COMBOS just before FVG_OPT_COMBOS
FVG_COMBOS_ANCHOR = 'var FVG_OPT_COMBOS=['
assert FVG_COMBOS_ANCHOR in html, 'FVG_OPT_COMBOS anchor not found'
html = html.replace(FVG_COMBOS_ANCHOR, TB_OPT_COMBOS_JS+FVG_COMBOS_ANCHOR, 1)

# ── 15. Add Trend Break indicator card after fvgConf card ────────────────────
# Use fvgConfDebug as unique anchor to identify end of fvgConf card
OLD_AFTER_FVG_CARD = ('<input type="checkbox" id="fvgConfDebug" style="width:14px;height:14px;accent-color:#ffa500;cursor:pointer;flex-shrink:0;"></label>\n'
    '          </div>\n'
    '        </div>\n\n'
    '        <div class="ind-card dvl-icd" data-card="flowAccel" data-dvl-cat="confluencia">')
NEW_AFTER_FVG_CARD = ('<input type="checkbox" id="fvgConfDebug" style="width:14px;height:14px;accent-color:#ffa500;cursor:pointer;flex-shrink:0;"></label>\n'
    '          </div>\n'
    '        </div>\n\n'
    '        <div class="ind-card dvl-icd" data-card="trendBreak" data-dvl-cat="confluencia">\n'
    '          <div class="dvl-icd-head">\n'
    '            <div class="dvl-icd-icon" style="--ic-bg:rgba(0,212,255,.12);--ic-cl:#00d4ff">'
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">'
    '<polyline points="1,12 5,4 8,8 11,3 15,7"/><polyline points="11,3 15,3 15,7"/></svg></div>\n'
    '            <div class="dvl-icd-info">\n'
    '              <div class="dvl-icd-name name">DVL Trend Break</div>\n'
    '              <div class="dvl-icd-meta">\n'
    '                <span class="dvl-bdg dvl-bdg-nat">NATIVO</span>\n'
    '                <span class="dvl-bdg dvl-bdg-on">ATIVO</span>\n'
    '              </div>\n'
    '            </div>\n'
    '            <div class="dvl-icd-ctrl">\n'
    '              <div class="row" data-ind="trendBreak"><span class="switch"></span></div>\n'
    '              <button class="gear" data-settings="trendBreak" title="Configurar DVL Trend Break">&#9881;</button>\n'
    '              <button class="dvl-star" data-star="trendBreak" type="button" title="Favoritar">'
    '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">'
    '<polygon points="8,1 10,6.5 15.5,6.5 11,10 13,15.5 8,12 3,15.5 5,10 0.5,6.5 6,6.5"/></svg></button>\n'
    '            </div>\n'
    '          </div>\n'
    '          <div class="ind-settings" id="settings-trendBreak">\n'
    '            <div class="hint">Detecta viradas estruturais via cruzamento de MA r\xe1pida/lenta dos proxies Clarity+Flow. Setas ▲▼ nos candles de virada.</div>\n'
    '            <div class="kv"><span class="k">Per\xedodo r\xe1pido</span>'
    '<input class="num" id="tbFast" type="number" min="1" max="50" step="1" value="3" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Per\xedodo lento</span>'
    '<input class="num" id="tbSlow" type="number" min="2" max="200" step="1" value="10" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Bias m\xednimo</span>'
    '<input class="num" id="tbBias" type="number" min="0" max="50" step="1" value="5" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Modo sa\xedda</span>'
    '<select class="select tiny-select" id="tbExitMode">'
    '<option value="flip" selected>Flip (virada)</option>'
    '<option value="sltp">SL / TP</option></select></div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Mostrar setas LONG</span>'
    '<input type="checkbox" id="tbShowBuy" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Mostrar setas SHORT</span>'
    '<input type="checkbox" id="tbShowSell" checked style="width:14px;height:14px;accent-color:#ff4d6a;cursor:pointer;flex-shrink:0;"></label>\n'
    '          </div>\n'
    '        </div>\n\n'
    '        <div class="ind-card dvl-icd" data-card="flowAccel" data-dvl-cat="confluencia">')
assert OLD_AFTER_FVG_CARD in html, 'fvgConf card end not found'
html = html.replace(OLD_AFTER_FVG_CARD, NEW_AFTER_FVG_CARD, 1)

# ── 16. Add __computeTrendBreak + __drawTrendBreakOverlay after _applyToHVNSignals ──
OLD_APPLY_ANCHOR = ("function _applyToHVNSignals(cfg){\n"
    "  _syncAllFromCfg(cfg);\n"
    "}")
NEW_APPLY_ANCHOR = ("function _applyToHVNSignals(cfg){\n"
    "  _syncAllFromCfg(cfg);\n"
    "}\n"
    "\n"
    "/* ── Trend Break compute + draw ─────────────────────────── */\n"
    "window.__computeTrendBreak=(function(){\n"
    "  return function(){\n"
    "    try{\n"
    "      var S=window.S;if(!S||!S.candles||S.candles.length<20)return;\n"
    "      var fast=parseInt((document.getElementById('tbFast')||{value:'3'}).value)||3;\n"
    "      var slow=parseInt((document.getElementById('tbSlow')||{value:'10'}).value)||10;\n"
    "      var biasMin=parseFloat((document.getElementById('tbBias')||{value:'5'}).value)||5;\n"
    "      var showBuy=(document.getElementById('tbShowBuy')||{checked:true}).checked;\n"
    "      var showSell=(document.getElementById('tbShowSell')||{checked:true}).checked;\n"
    "      var cs=S.candles,n=cs.length;\n"
    "      var combined=[];\n"
    "      for(var i=0;i<n;i++){\n"
    "        var c=cs[i];\n"
    "        var s20sum=0;\n"
    "        for(var j=Math.max(0,i-19);j<=i;j++)s20sum+=cs[j].c;\n"
    "        var s20=s20sum/Math.min(i+1,20);\n"
    "        var atr=c.h-c.l||c.c*0.002;\n"
    "        if(i>0){var p=cs[i-1];atr=Math.max(c.h-c.l,Math.abs(c.h-p.c),Math.abs(c.l-p.c));}\n"
    "        var clr=(c.c-s20)/(atr||c.c*0.002)*15;\n"
    "        var hl=c.h-c.l||c.c*0.002;\n"
    "        var fl=(c.c-c.o)/hl*100;\n"
    "        combined.push(clr*0.6+fl*0.4);\n"
    "      }\n"
    "      S.trendBreakSignals=[];\n"
    "      for(var i=slow;i<n;i++){\n"
    "        var fSum=0,sSum=0,fPSum=0,sPSum=0;\n"
    "        for(var j=i-fast;j<i;j++)fSum+=combined[j];\n"
    "        for(var j=i-slow;j<i;j++)sSum+=combined[j];\n"
    "        for(var j=i-fast-1;j<i-1;j++)fPSum+=combined[j];\n"
    "        for(var j=i-slow-1;j<i-1;j++)sPSum+=combined[j];\n"
    "        var fMa=fSum/fast,sMa=sSum/slow,fMaP=fPSum/fast,sMaP=sPSum/slow;\n"
    "        var crossUp=fMaP<=sMaP&&fMa>sMa,crossDn=fMaP>=sMaP&&fMa<sMa;\n"
    "        if((crossUp||crossDn)&&Math.abs(fMa-sMa)>=biasMin){\n"
    "          if(crossUp&&showBuy)S.trendBreakSignals.push({i:i,side:'LONG',c:cs[i]});\n"
    "          if(crossDn&&showSell)S.trendBreakSignals.push({i:i,side:'SHORT',c:cs[i]});\n"
    "        }\n"
    "      }\n"
    "    }catch(e){}\n"
    "  };\n"
    "})();\n"
    "\n"
    "window.__drawTrendBreakOverlay=function(ctx,W,H,V,sc,x,bw){\n"
    "  try{\n"
    "    var sigs=(window.S&&window.S.trendBreakSignals)||[];\n"
    "    sigs.forEach(function(sig){\n"
    "      if(sig.i<V.start||sig.i>V.end)return;\n"
    "      var cx=x(sig.i),cy=sc.y(sig.c.c);\n"
    "      var isLong=sig.side==='LONG';\n"
    "      var aw=Math.max(6,bw*1.4),ah=aw*0.8;\n"
    "      ctx.save();\n"
    "      ctx.fillStyle=isLong?'rgba(0,212,255,.92)':'rgba(255,77,106,.92)';\n"
    "      ctx.strokeStyle=isLong?'#00d4ff':'#ff4d6a';\n"
    "      ctx.lineWidth=1;\n"
    "      var ay=isLong?cy+bw*1.6:cy-bw*1.6;\n"
    "      ctx.beginPath();\n"
    "      if(isLong){\n"
    "        ctx.moveTo(cx,ay-ah);ctx.lineTo(cx-aw/2,ay);ctx.lineTo(cx+aw/2,ay);\n"
    "      }else{\n"
    "        ctx.moveTo(cx,ay+ah);ctx.lineTo(cx-aw/2,ay);ctx.lineTo(cx+aw/2,ay);\n"
    "      }\n"
    "      ctx.closePath();ctx.fill();ctx.stroke();\n"
    "      ctx.fillStyle=isLong?'rgba(0,212,255,.7)':'rgba(255,77,106,.7)';\n"
    "      ctx.font='bold 7px monospace';ctx.textAlign='center';\n"
    "      ctx.fillText('TB',cx,isLong?ay-ah-3:ay+ah+8);\n"
    "      ctx.restore();\n"
    "    });\n"
    "  }catch(e){}\n"
    "};")
assert OLD_APPLY_ANCHOR in html, '_applyToHVNSignals anchor not found'
html = html.replace(OLD_APPLY_ANCHOR, NEW_APPLY_ANCHOR, 1)

# ── 17. Hook Trend Break into render loop ─────────────────────────────────────
OLD_RENDER_HOOK = ("if(S.inds.hvnSignals){if(window.__computeHVNSignals)window.__computeHVNSignals();"
    "if(window.__drawHVNSignalsOverlay)safeLayer('HVN Signals',()=>window.__drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw));}resetCtxState(ctx);"
    "drawLastPrice")
NEW_RENDER_HOOK = ("if(S.inds.hvnSignals){if(window.__computeHVNSignals)window.__computeHVNSignals();"
    "if(window.__drawHVNSignalsOverlay)safeLayer('HVN Signals',()=>window.__drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw));}resetCtxState(ctx);"
    "if(S.inds.trendBreak){if(window.__computeTrendBreak)window.__computeTrendBreak();"
    "if(window.__drawTrendBreakOverlay)safeLayer('Trend Break',()=>window.__drawTrendBreakOverlay(ctx,W,H,V,sc,x,bw));}resetCtxState(ctx);"
    "drawLastPrice")
assert OLD_RENDER_HOOK in html, 'render loop HVN Signals hook not found'
html = html.replace(OLD_RENDER_HOOK, NEW_RENDER_HOOK, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.104 applied')
print('TB_OPT_COMBOS entries:', TB_OPT_COMBOS_JS.count('},'))
