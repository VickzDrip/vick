#!/usr/bin/env python3
"""Beta 0.092 — Strategy Tester + Optimizer: suporte a FVG Confluence"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.091', 'Beta 0.092')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.092\n  - Hotfix: avgW e avgL reintroduzidos',
    '''Beta 0.092
  - Strategy Tester: seletor "Indicador" ganha opção FVG Confluence.
  - REGRAS DE ENTRADA adapta campos ao indicador selecionado:
    HVN = pavio, fechamento, modo, mergulho; FVG = gap ATR×, mitigação,
    exigir reação, exigir re-entry, idade máx. FVG.
  - TF label, SL e TP opções mudam dinamicamente (ex. "Borda do FVG").
  - _backtestFVG(): modelo mock específico para FVG — menos trades,
    WR mais alto com filtros de reação/re-entry e gaps maiores.
  - Optimizer: FVG_OPT_COMBOS com 60 combinações cobrindo gap ATR,
    mitigação, Clarity, Flow, react, re-entry, SL, TP e Vol Spike.
  - _cfgLabel() reconhece combos FVG e exibe Gap/Mit/Age/React.
  - _syncAllFromCfg() tem branch FVG que sincroniza campos do tester
    e as configurações do indicador DVL FVG Confluence.

Beta 0.091
  - Hotfix: avgW e avgL reintroduzidos''',
    1
)

# ── 3. stInd select: add FVG option + onchange ────────────────────────────────
OLD_STIND = (
    '<select class="dvl-st-sel" id="stInd">'
    '<option value="hvnSignals">HVN Signals</option></select>'
)
NEW_STIND = (
    '<select class="dvl-st-sel" id="stInd" onchange="_stSwitchInd(this.value)">'
    '<option value="hvnSignals">HVN Signals</option>'
    '<option value="fvgConf">FVG Confluence</option></select>'
)
assert OLD_STIND in html, "stInd select not found"
html = html.replace(OLD_STIND, NEW_STIND, 1)

# ── 4. Add id to TF label ──────────────────────────────────────────────────────
OLD_TF_LBL = '<div class="dvl-st-field"><span class="dvl-st-lbl">TF das Zonas HVN</span>'
NEW_TF_LBL = '<div class="dvl-st-field"><span class="dvl-st-lbl" id="stTfLbl">TF das Zonas HVN</span>'
assert OLD_TF_LBL in html, "TF label not found"
html = html.replace(OLD_TF_LBL, NEW_TF_LBL, 1)

# ── 5. Wrap HVN REGRAS fields + add FVG fields ────────────────────────────────
OLD_REGRAS = (
    '      <div class="dvl-st-sl">REGRAS DE ENTRADA</div>\n'
    '      <div class="dvl-st-checks">\n'
    '        <label class="dvl-st-chk"><input type="checkbox" id="stRuleWick" checked><span>Rejei\xe7\xe3o de pavio na zona HVN</span></label>\n'
    '        <label class="dvl-st-chk"><input type="checkbox" id="stRuleClose" checked><span>Fechamento fora da zona</span></label>\n'
    '        <label class="dvl-st-chk"><input type="checkbox" id="stRuleCons"><span>Permitir consolida\xe7\xe3o antes do sinal</span></label>\n'
    '      </div>\n'
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">M\xe1x. candles na HVN</span>\n'
    '          <input class="dvl-st-inp" id="stMaxCandles" type="number" value="8" min="1" max="30"></div>\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Sensibilidade pavio %</span>\n'
    '          <input class="dvl-st-inp" id="stWickSens" type="number" value="45" min="10" max="90"></div>\n'
    '      </div>\n'
    '      <div class="dvl-st-field" style="margin-bottom:8px"><span class="dvl-st-lbl">Dist. m\xe1x. fechamento da zona %</span>\n'
    '        <input class="dvl-st-inp" id="stCloseDist" type="number" value="0.40" step="0.05" min="0.05"></div>\n'
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Padr\xe3o do Sinal</span>\n'
    '          <select class="dvl-st-sel" id="stMode">\n'
    '            <option value="wick" selected>Wick Rejection</option>\n'
    '            <option value="dive">Dive &amp; Recover</option>\n'
    '            <option value="engulf">Engolfing</option>\n'
    '            <option value="all">Todos</option>\n'
    '          </select></div>\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">M\xedn. candles mergulho</span>\n'
    '          <input class="dvl-st-inp" id="stDiveMin" type="number" value="2" min="1" max="10"></div>\n'
    '      </div>\n'
    '\n'
    '      <div class="dvl-st-sl">FILTROS</div>'
)

NEW_REGRAS = (
    '      <div class="dvl-st-sl">REGRAS DE ENTRADA</div>\n'
    '      <div id="stHVNFields">\n'
    '        <div class="dvl-st-checks">\n'
    '          <label class="dvl-st-chk"><input type="checkbox" id="stRuleWick" checked><span>Rejei\xe7\xe3o de pavio na zona HVN</span></label>\n'
    '          <label class="dvl-st-chk"><input type="checkbox" id="stRuleClose" checked><span>Fechamento fora da zona</span></label>\n'
    '          <label class="dvl-st-chk"><input type="checkbox" id="stRuleCons"><span>Permitir consolida\xe7\xe3o antes do sinal</span></label>\n'
    '        </div>\n'
    '        <div class="dvl-st-row2">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">M\xe1x. candles na HVN</span>\n'
    '            <input class="dvl-st-inp" id="stMaxCandles" type="number" value="8" min="1" max="30"></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Sensibilidade pavio %</span>\n'
    '            <input class="dvl-st-inp" id="stWickSens" type="number" value="45" min="10" max="90"></div>\n'
    '        </div>\n'
    '        <div class="dvl-st-field" style="margin-bottom:8px"><span class="dvl-st-lbl">Dist. m\xe1x. fechamento da zona %</span>\n'
    '          <input class="dvl-st-inp" id="stCloseDist" type="number" value="0.40" step="0.05" min="0.05"></div>\n'
    '        <div class="dvl-st-row2">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Padr\xe3o do Sinal</span>\n'
    '            <select class="dvl-st-sel" id="stMode">\n'
    '              <option value="wick" selected>Wick Rejection</option>\n'
    '              <option value="dive">Dive &amp; Recover</option>\n'
    '              <option value="engulf">Engolfing</option>\n'
    '              <option value="all">Todos</option>\n'
    '            </select></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">M\xedn. candles mergulho</span>\n'
    '            <input class="dvl-st-inp" id="stDiveMin" type="number" value="2" min="1" max="10"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div id="stFVGFields" style="display:none">\n'
    '        <div class="dvl-st-row2">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Gap m\xedn. ATR\xd7</span>\n'
    '            <select class="dvl-st-sel" id="stFvgMinAtr">\n'
    '              <option value="0.05">0.05</option>\n'
    '              <option value="0.08" selected>0.08</option>\n'
    '              <option value="0.10">0.10</option>\n'
    '              <option value="0.15">0.15</option>\n'
    '              <option value="0.20">0.20</option>\n'
    '            </select></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Mitiga\xe7\xe3o</span>\n'
    '            <select class="dvl-st-sel" id="stFvgMit">\n'
    '              <option value="wick" selected>Wick</option>\n'
    '              <option value="close">Close</option>\n'
    '            </select></div>\n'
    '        </div>\n'
    '        <div class="dvl-st-row2">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Exigir rea\xe7\xe3o</span>\n'
    '            <select class="dvl-st-sel" id="stFvgReact">\n'
    '              <option value="1" selected>Sim</option>\n'
    '              <option value="0">N\xe3o</option>\n'
    '            </select></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">Exigir re-entry</span>\n'
    '            <select class="dvl-st-sel" id="stFvgReentry">\n'
    '              <option value="1" selected>Sim</option>\n'
    '              <option value="0">N\xe3o</option>\n'
    '            </select></div>\n'
    '        </div>\n'
    '        <div class="dvl-st-field" style="margin-bottom:8px"><span class="dvl-st-lbl">Idade m\xe1x. FVG (barras)</span>\n'
    '          <select class="dvl-st-sel" id="stFvgMaxAge">\n'
    '            <option value="0">Sem limite</option>\n'
    '            <option value="100">100</option>\n'
    '            <option value="200">200</option>\n'
    '            <option value="300" selected>300</option>\n'
    '          </select></div>\n'
    '      </div>\n'
    '\n'
    '      <div class="dvl-st-sl">FILTROS</div>'
)

assert OLD_REGRAS in html, "REGRAS DE ENTRADA block not found"
html = html.replace(OLD_REGRAS, NEW_REGRAS, 1)

# ── 6. Add id to stNextHVN row (for hide when FVG) ───────────────────────────
OLD_NEXT_HVN = (
    '      <div class="dvl-st-field" style="margin-bottom:8px">'
    '<span class="dvl-st-lbl">Evitar pr\xf3xima HVN muito pr\xf3xima %</span>\n'
    '        <input class="dvl-st-inp" id="stNextHVN" type="number" value="0.35" step="0.05" min="0"></div>'
)
NEW_NEXT_HVN = (
    '      <div class="dvl-st-field" style="margin-bottom:8px" id="stNextHVNRow">'
    '<span class="dvl-st-lbl">Evitar pr\xf3xima HVN muito pr\xf3xima %</span>\n'
    '        <input class="dvl-st-inp" id="stNextHVN" type="number" value="0.35" step="0.05" min="0"></div>'
)
assert OLD_NEXT_HVN in html, "stNextHVN row not found"
html = html.replace(OLD_NEXT_HVN, NEW_NEXT_HVN, 1)

# ── 7. Add FVG_OPT_PARAMS + _stSwitchInd after OPT_PARAMS declaration ─────────
OLD_AFTER_OPT_PARAMS = (
    "];\n"
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

NEW_AFTER_OPT_PARAMS = (
    "];\n"
    "var FVG_OPT_PARAMS=[\n"
    "  {n:'Gap m\xedn. ATR\xd7',v:'0.05 \xb7 0.08 \xb7 0.10 \xb7 0.15 \xb7 0.20'},\n"
    "  {n:'Mitiga\xe7\xe3o',v:'Wick \xb7 Close'},\n"
    "  {n:'Trend Clarity',v:'Off \xb7 LONG > +10 \xb7 > +20 \xb7 > +30'},\n"
    "  {n:'DVL Flow',v:'Off \xb7 LONG > +10 \xb7 > +20 \xb7 > +30'},\n"
    "  {n:'Exigir Rea\xe7\xe3o',v:'Sim \xb7 N\xe3o'},\n"
    "  {n:'Exigir Re-entry',v:'Sim \xb7 N\xe3o'},\n"
    "  {n:'Volume Spike',v:'Desativado \xb7 \xd71.5 \xb7 \xd72.0'},\n"
    "  {n:'Stop Loss',v:'Pavio \xb7 Borda do FVG \xb7 ATR'},\n"
    "  {n:'Take Profit',v:'Pr\xf3x. FVG \xb7 1R \xb7 1.5R \xb7 2R'},\n"
    "  {n:'Idade m\xe1x. FVG',v:'Sem limite \xb7 100 \xb7 200 \xb7 300 barras'},\n"
    "];\n"
    "function _stRenderOptParams(params){\n"
    "  var c=document.getElementById('dvlSTOptParams');if(!c)return;\n"
    "  c.innerHTML='';\n"
    "  params.forEach(function(p){\n"
    "    var d=document.createElement('div');d.className='dvl-st-oparam';\n"
    "    d.innerHTML='<span class=\"dvl-st-opn\">'+p.n+'</span><span class=\"dvl-st-opv\">'+p.v+'</span>';\n"
    "    c.appendChild(d);\n"
    "  });\n"
    "}\n"
    "function _stSwitchInd(v){\n"
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
    "}\n"
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

assert OLD_AFTER_OPT_PARAMS in html, "OPT_PARAMS IIFE block not found"
html = html.replace(OLD_AFTER_OPT_PARAMS, NEW_AFTER_OPT_PARAMS, 1)

# ── 8. Update _hashCfg to include signalType + FVG params ──────────────────────
OLD_HASH = (
    "    cfg.dateFrom||'',cfg.dateTo||'',\n"
    "    cfg.mode||'wick',cfg.diveMin||2\n"
    "  ]);"
)
NEW_HASH = (
    "    cfg.dateFrom||'',cfg.dateTo||'',\n"
    "    cfg.mode||'wick',cfg.diveMin||2,\n"
    "    cfg.signalType||'hvnSignals',\n"
    "    cfg.fvgMinAtr||0.08,cfg.fvgMit||'wick',\n"
    "    cfg.fvgReact?1:0,cfg.fvgReentry?1:0,cfg.fvgMaxAge||300\n"
    "  ]);"
)
assert OLD_HASH in html, "_hashCfg tail not found"
html = html.replace(OLD_HASH, NEW_HASH, 1)

# ── 9. Update backtest cfg builder: add signalType + FVG params ───────────────
OLD_BT_CFG = (
    "        mode:(_g('stMode')||{value:'wick'}).value,\n"
    "        diveMin:parseInt((_g('stDiveMin')||{value:'2'}).value)||2,\n"
    "      };"
)
NEW_BT_CFG = (
    "        mode:(_g('stMode')||{value:'wick'}).value,\n"
    "        diveMin:parseInt((_g('stDiveMin')||{value:'2'}).value)||2,\n"
    "        signalType:(_g('stInd')||{value:'hvnSignals'}).value,\n"
    "        fvgMinAtr:parseFloat((_g('stFvgMinAtr')||{value:'0.08'}).value)||0.08,\n"
    "        fvgMit:(_g('stFvgMit')||{value:'wick'}).value,\n"
    "        fvgReact:parseInt((_g('stFvgReact')||{value:'1'}).value)===1,\n"
    "        fvgReentry:parseInt((_g('stFvgReentry')||{value:'1'}).value)===1,\n"
    "        fvgMaxAge:parseInt((_g('stFvgMaxAge')||{value:'300'}).value)||0,\n"
    "      };"
)
assert OLD_BT_CFG in html, "backtest cfg builder end not found"
html = html.replace(OLD_BT_CFG, NEW_BT_CFG, 1)

# ── 10. Add _backtestFVG + FVG branch in _backtest ────────────────────────────
OLD_BT_ENTRY = (
    "function _backtest(cfg){\n"
    "  /* try real data first */\n"
    "  var real=_backtestReal(cfg);\n"
    "  if(real)return real;\n"
    "\n"
    "  /* seeded deterministic mock */"
)
NEW_BT_ENTRY = (
    "function _backtestFVG(cfg){\n"
    "  var seed=_hashCfg(cfg);\n"
    "  var rng=_mkRng(seed);\n"
    "  function rnd(a,b){return rng()*(b-a)+a;}\n"
    "  function ri(a,b){return Math.floor(rnd(a,b+0.9999));}\n"
    "  var clarity=_parseThresh(cfg.trend);\n"
    "  var flow=_parseThresh(cfg.flow);\n"
    "  var _days=Math.max(7,parseInt(cfg.period)||30);\n"
    "  var _pScale=Math.sqrt(_days/30);\n"
    "  var tradesBase=Math.round(ri(16,28)*_pScale);\n"
    "  var _minAtr=parseFloat(cfg.fvgMinAtr)||0.08;\n"
    "  if(_minAtr<=0.05)tradesBase=Math.round(tradesBase*1.45);\n"
    "  else if(_minAtr>=0.20)tradesBase=Math.round(tradesBase*0.40);\n"
    "  else if(_minAtr>=0.15)tradesBase=Math.round(tradesBase*0.55);\n"
    "  else if(_minAtr>=0.10)tradesBase=Math.round(tradesBase*0.75);\n"
    "  if(cfg.fvgMit==='close')tradesBase=Math.round(tradesBase*0.78);\n"
    "  if(clarity!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.40,Math.abs(clarity)/110)));\n"
    "  if(flow!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.30,Math.abs(flow)/110)));\n"
    "  var _vs=parseFloat(cfg.volSpike||'0')||0;\n"
    "  if(_vs>1)tradesBase=Math.round(tradesBase*(1-Math.min(0.50,(_vs-1)*0.45)));\n"
    "  if(cfg.fvgReact)tradesBase=Math.round(tradesBase*0.72);\n"
    "  if(cfg.fvgReentry)tradesBase=Math.round(tradesBase*0.83);\n"
    "  var _maxAge=parseInt(cfg.fvgMaxAge)||0;\n"
    "  if(_maxAge>0&&_maxAge<=100)tradesBase=Math.round(tradesBase*0.62);\n"
    "  else if(_maxAge>0&&_maxAge<=200)tradesBase=Math.round(tradesBase*0.80);\n"
    "  var trades=Math.max(5,tradesBase);\n"
    "  var wr=0.51;\n"
    "  if(clarity!==null){\n"
    "    if(clarity>0){wr+=clarity>=30?0.09:clarity>=20?0.07:0.04;}\n"
    "    else{wr+=Math.abs(clarity)>=10?0.07:0.04;}\n"
    "  }\n"
    "  if(flow!==null){\n"
    "    if(flow>0){wr+=flow>=30?0.07:flow>=20?0.05:0.03;}\n"
    "    else{wr+=Math.abs(flow)>=10?0.06:0.03;}\n"
    "  }\n"
    "  if(_vs>=2.0)wr+=0.06;else if(_vs>=1.5)wr+=0.04;\n"
    "  if(cfg.fvgReact)wr+=0.07;\n"
    "  if(cfg.fvgReentry)wr+=0.04;\n"
    "  if(cfg.fvgMit==='close')wr+=0.03;\n"
    "  if(_minAtr>=0.15)wr+=0.05;else if(_minAtr>=0.10)wr+=0.03;\n"
    "  wr+=rnd(-0.03,0.03);\n"
    "  wr=Math.max(0.38,Math.min(0.80,wr));\n"
    "  var wins=Math.round(trades*wr);\n"
    "  var losses=Math.round(trades*(1-wr)*0.84);\n"
    "  var be=trades-wins-losses;\n"
    "  var riskPct=parseFloat(cfg.risk)||1.0;\n"
    "  var avgW=rnd(1.3,2.0),avgL=rnd(0.6,1.0);\n"
    "  var pf=Math.max(0.80,Math.min(2.85,0.88+(wr-0.50)*7.8+rnd(-0.08,0.08)));\n"
    "  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;\n"
    "  var ret=trades*_ev*rnd(0.80,1.20);\n"
    "  ret=Math.max(-30,Math.min(80,ret));\n"
    "  var dd=-rnd(1.8,8.5);\n"
    "  var eq=[100];\n"
    "  for(var i=0;i<trades;i++){\n"
    "    var prev=eq[eq.length-1];\n"
    "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
    "    eq.push(Math.max(40,prev+chg));\n"
    "  }\n"
    "  var longs=ri(Math.floor(trades*.45),Math.ceil(trades*.60));\n"
    "  var shorts=trades-longs;\n"
    "  var lwR=wr+rnd(-0.06,0.06),swR=wr+rnd(-0.06,0.06);\n"
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
    "  /* FVG Confluence mock */\n"
    "  if(cfg.signalType==='fvgConf')return _backtestFVG(cfg);\n"
    "\n"
    "  /* seeded deterministic mock */"
)
assert OLD_BT_ENTRY in html, "_backtest entry not found"
html = html.replace(OLD_BT_ENTRY, NEW_BT_ENTRY, 1)

# ── 11. Update _cfgLabel to handle FVG combos ─────────────────────────────────
OLD_CFG_LABEL = (
    "function _cfgLabel(c){\n"
    "  var modeTag={wick:'',dive:'DIVE',engulf:'ENGULF',all:'ALL'};\n"
    "  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];\n"
    "  if(modeTag[c.mode])p.unshift('['+modeTag[c.mode]+']');\n"
    "  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
    "  if(tl)p.push(tl);if(fl)p.push(fl);\n"
    "  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
    "  return p.join(' | ');\n"
    "}"
)
NEW_CFG_LABEL = (
    "function _cfgLabel(c){\n"
    "  if(c.minAtr!==undefined){\n"
    "    var p=['Gap > '+parseFloat(c.minAtr).toFixed(2)+'\xd7ATR'];\n"
    "    if(c.mitMode==='close')p.push('Mit:Close');\n"
    "    var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
    "    if(tl)p.push(tl);if(fl)p.push(fl);\n"
    "    if(c.react)p.push('React');\n"
    "    if(c.reentry)p.push('Re-entry');\n"
    "    if(c.maxAge>0)p.push('Age≤'+c.maxAge);\n"
    "    if(c.volSpike&&c.volSpike!=='off')p.push('Vol\xd7'+c.volSpike);\n"
    "    return p.join(' | ');\n"
    "  }\n"
    "  var modeTag={wick:'',dive:'DIVE',engulf:'ENGULF',all:'ALL'};\n"
    "  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];\n"
    "  if(modeTag[c.mode])p.unshift('['+modeTag[c.mode]+']');\n"
    "  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
    "  if(tl)p.push(tl);if(fl)p.push(fl);\n"
    "  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
    "  return p.join(' | ');\n"
    "}"
)
assert OLD_CFG_LABEL in html, "_cfgLabel not found"
html = html.replace(OLD_CFG_LABEL, NEW_CFG_LABEL, 1)

# ── 12. Add FVG_OPT_COMBOS + update _runOptimizer ─────────────────────────────
OLD_RUN_OPT_HEAD = (
    "function _runOptimizer(){\n"
    "  var bar=_g('dvlSTOptBar'),prog=_g('dvlSTOptProg'),status=_g('dvlSTOptStatus');\n"
    "  var rw=_g('dvlSTRankWrap'),rl=_g('dvlSTRankList'),runBtn=_g('dvlSTRunOpt');\n"
    "  if(!runBtn)return;\n"
    "  runBtn.disabled=true;\n"
)
NEW_RUN_OPT_HEAD = (
    "var FVG_OPT_COMBOS=[\n"
    "  /* minAtr, mitMode, trend, flow, react, reentry, sl, tp, maxAge, volSpike */\n"
    "  {minAtr:0.08,mitMode:'wick',trend:null,flow:null,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:null,flow:null,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:null,flow:null,react:true,reentry:true,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:30,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:10,flow:null,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:null,flow:30,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:null,flow:10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:30,flow:20,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:100,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:10,flow:10,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'close',trend:20,flow:20,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'close',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'close',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'close',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:20,flow:null,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:null,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.05,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.05,mitMode:'wick',trend:30,flow:30,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.05,mitMode:'wick',trend:20,flow:20,react:false,reentry:false,sl:'wick',tp:'fvg',maxAge:0,volSpike:'off'},\n"
    "  {minAtr:0.05,mitMode:'close',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.05,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.15,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.15,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.15,mitMode:'close',trend:20,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.15,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.15,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.20,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.20,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'1.5'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'1.5'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'fvg',tp:'2r',maxAge:300,volSpike:'2.0'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:200,volSpike:'2.0'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'2r',maxAge:300,volSpike:'1.5'},\n"
    "  {minAtr:0.10,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:200,volSpike:'2.0'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'1r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'atr',tp:'fvg',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'close',trend:20,flow:20,react:true,reentry:false,sl:'atr',tp:'2r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:30,flow:20,react:true,reentry:true,sl:'atr',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:100,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:100,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:100,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:20,flow:20,react:true,reentry:true,sl:'fvg',tp:'2r',maxAge:100,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'close',trend:30,flow:30,react:true,reentry:true,sl:'atr',tp:'2r',maxAge:100,volSpike:'off'},\n"
    "  {minAtr:0.05,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:200,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:10,flow:20,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'wick',trend:20,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.08,mitMode:'close',trend:10,flow:10,react:false,reentry:false,sl:'wick',tp:'1r',maxAge:0,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'wick',tp:'fvg',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.10,mitMode:'wick',trend:10,flow:20,react:true,reentry:true,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "  {minAtr:0.20,mitMode:'wick',trend:10,flow:10,react:true,reentry:false,sl:'fvg',tp:'1.5r',maxAge:300,volSpike:'off'},\n"
    "];\n"
    "\n"
    "function _runOptimizer(){\n"
    "  var bar=_g('dvlSTOptBar'),prog=_g('dvlSTOptProg'),status=_g('dvlSTOptStatus');\n"
    "  var rw=_g('dvlSTRankWrap'),rl=_g('dvlSTRankList'),runBtn=_g('dvlSTRunOpt');\n"
    "  if(!runBtn)return;\n"
    "  runBtn.disabled=true;\n"
)
assert OLD_RUN_OPT_HEAD in html, "_runOptimizer head not found"
html = html.replace(OLD_RUN_OPT_HEAD, NEW_RUN_OPT_HEAD, 1)

# ── 13. Update _runOptimizer step to handle FVG combos ────────────────────────
OLD_OPT_STEP = (
    "  for(var _k in _btCache)delete _btCache[_k];\n"
    "  var results=[],total=OPT_COMBOS.length,done=0;\n"
    "  function step(){\n"
    "    if(done>=total){\n"
    "      var _sc=function(r){return parseFloat(r.pf)*parseFloat(r.wr);};\n"
    "      results.sort(function(a,b){return _sc(b)-_sc(a);});\n"
    "      _bestCfgs=results.slice(0,5);\n"
    "      _renderRanking(_bestCfgs);\n"
)

NEW_OPT_STEP = (
    "  for(var _k in _btCache)delete _btCache[_k];\n"
    "  var _isFvgOpt=(_g('stInd')||{value:'hvnSignals'}).value==='fvgConf';\n"
    "  var _COMBOS=_isFvgOpt?FVG_OPT_COMBOS:OPT_COMBOS;\n"
    "  var results=[],total=_COMBOS.length,done=0;\n"
    "  function step(){\n"
    "    if(done>=total){\n"
    "      var _sc=function(r){return parseFloat(r.pf)*parseFloat(r.wr);};\n"
    "      results.sort(function(a,b){return _sc(b)-_sc(a);});\n"
    "      _bestCfgs=results.slice(0,5);\n"
    "      _renderRanking(_bestCfgs);\n"
)
assert OLD_OPT_STEP in html, "_runOptimizer step start not found"
html = html.replace(OLD_OPT_STEP, NEW_OPT_STEP, 1)

OLD_OPT_LOOP = (
    "    var c=OPT_COMBOS[done];\n"
    "    if(bar)bar.style.width=(done/total*100)+'%';\n"
    "    if(status)status.textContent='Testando combina\xe7\xe3o '+(done+1)+' de '+total+'...';\n"
    "    var r=_cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2});\n"
    "    results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});"
)
NEW_OPT_LOOP = (
    "    var c=_COMBOS[done];\n"
    "    if(bar)bar.style.width=(done/total*100)+'%';\n"
    "    if(status)status.textContent='Testando combina\xe7\xe3o '+(done+1)+' de '+total+'...';\n"
    "    var r=_isFvgOpt?\n"
    "      _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:'30'}):\n"
    "      _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2});\n"
    "    results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});"
)
assert OLD_OPT_LOOP in html, "_runOptimizer loop body not found"
html = html.replace(OLD_OPT_LOOP, NEW_OPT_LOOP, 1)

# ── 14. Update _syncAllFromCfg to add FVG branch ──────────────────────────────
OLD_SYNC = (
    "function _syncAllFromCfg(cfg){\n"
    "  if(!cfg)return;\n"
    "  var ws=parseFloat(cfg.wickSens||cfg.w||45);"
)
NEW_SYNC = (
    "function _syncAllFromCfg(cfg){\n"
    "  if(!cfg)return;\n"
    "  if(cfg.signalType==='fvgConf'||cfg.minAtr!==undefined){\n"
    "    var _sv=function(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(el)el.value=String(val);};\n"
    "    var _ssl=function(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(!el)return;for(var i=0;i<el.options.length;i++){if(el.options[i].value===String(val)){el.selectedIndex=i;break;}}};\n"
    "    _ssl('stInd','fvgConf');\n"
    "    if(typeof _stSwitchInd==='function')_stSwitchInd('fvgConf');\n"
    "    if(cfg.minAtr!==undefined)_ssl('stFvgMinAtr',parseFloat(cfg.minAtr).toFixed(2));\n"
    "    _ssl('stFvgMit',cfg.mitMode||'wick');\n"
    "    _ssl('stFvgReact',cfg.react?'1':'0');\n"
    "    _ssl('stFvgReentry',cfg.reentry?'1':'0');\n"
    "    _ssl('stFvgMaxAge',cfg.maxAge!==undefined?String(cfg.maxAge):'300');\n"
    "    var _t=cfg.trend!==undefined&&cfg.trend!==null?String(cfg.trend):'off';\n"
    "    var _f=cfg.flow!==undefined&&cfg.flow!==null?String(cfg.flow):'off';\n"
    "    _ssl('stFTrend',_t);_ssl('stFFlow',_f);\n"
    "    _ssl('stFVol',cfg.volSpike||'off');\n"
    "    _ssl('stSL',cfg.sl||'wick');_ssl('stTP',cfg.tp||'fvg');\n"
    "    if(cfg.flow!==null&&cfg.flow!==undefined)_sv('fvgConfFlowMin',Math.abs(parseFloat(cfg.flow))||20);\n"
    "    if(cfg.trend!==null&&cfg.trend!==undefined)_sv('fvgConfClarMin',Math.abs(parseFloat(cfg.trend))||25);\n"
    "    _ssl('fvgMitMode',cfg.mitMode||'wick');\n"
    "    _ssl('fvgConfMitMode',cfg.mitMode||'wick');\n"
    "    for(var k in _btCache)delete _btCache[k];\n"
    "    if(typeof drawSoon==='function')drawSoon();\n"
    "    return;\n"
    "  }\n"
    "  var ws=parseFloat(cfg.wickSens||cfg.w||45);"
)
assert OLD_SYNC in html, "_syncAllFromCfg start not found"
html = html.replace(OLD_SYNC, NEW_SYNC, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.092 applied')
