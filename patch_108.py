#!/usr/bin/env python3
"""Beta 0.108 — Filtro bidirecional Clarity/Flow: opções Ambos ±5/±10/±20/±30"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.107', 'Beta 0.108')

# ── 2. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = ('Beta 0.108\n'
           '  - Fix: _cfgLabel exibia "Pavio > undefined%" para combos TB.\n')
NEW_LOG = ('Beta 0.108\n'
           '  - Filtro bidirecional Clarity/Flow no Backtest: novas op\xe7\xf5es\n'
           '    "Ambos \xb15 / \xb110 / \xb120 / \xb130" — filtra LONG quando Clarity > +N\n'
           '    e SHORT quando Clarity < −N simultaneamente. Mock: sem redu\xe7\xe3o\n'
           '    de trades pois ambos os lados operam.\n'
           '  - Fix: _cfgLabel exibia "Pavio > undefined%" para combos TB.\n')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Add "Ambos ±" options to stFTrend select ──────────────────────────────
OLD_FTREND = ('<select class="dvl-st-sel" id="stFTrend">\n'
              '            <option value="off">Desativado</option>\n'
              '            <option value="10">LONG &gt; +10</option>\n'
              '            <option value="20" selected>LONG &gt; +20</option>\n'
              '            <option value="30">LONG &gt; +30</option>\n'
              '            <option value="-5">SHORT &lt; -5</option>\n'
              '            <option value="-10">SHORT &lt; -10</option>\n'
              '            <option value="-20">SHORT &lt; -20</option>\n'
              '          </select>')
NEW_FTREND = ('<select class="dvl-st-sel" id="stFTrend">\n'
              '            <option value="off">Desativado</option>\n'
              '            <option value="both5">Ambos \xb15</option>\n'
              '            <option value="both10" selected>Ambos \xb110</option>\n'
              '            <option value="both20">Ambos \xb120</option>\n'
              '            <option value="both30">Ambos \xb130</option>\n'
              '            <option value="10">LONG &gt; +10</option>\n'
              '            <option value="20">LONG &gt; +20</option>\n'
              '            <option value="30">LONG &gt; +30</option>\n'
              '            <option value="-5">SHORT &lt; -5</option>\n'
              '            <option value="-10">SHORT &lt; -10</option>\n'
              '            <option value="-20">SHORT &lt; -20</option>\n'
              '          </select>')
assert OLD_FTREND in html, 'stFTrend select not found'
html = html.replace(OLD_FTREND, NEW_FTREND, 1)

# ── 4. Add "Ambos ±" options to stFFlow select ───────────────────────────────
OLD_FFLOW = ('<select class="dvl-st-sel" id="stFFlow">\n'
             '            <option value="off">Desativado</option>\n'
             '            <option value="10">LONG &gt; +10</option>\n'
             '            <option value="20" selected>LONG &gt; +20</option>\n'
             '            <option value="30">LONG &gt; +30</option>\n'
             '            <option value="-5">SHORT &lt; -5</option>\n'
             '            <option value="-10">SHORT &lt; -10</option>\n'
             '            <option value="-20">SHORT &lt; -20</option>\n'
             '          </select>')
NEW_FFLOW = ('<select class="dvl-st-sel" id="stFFlow">\n'
             '            <option value="off">Desativado</option>\n'
             '            <option value="both5">Ambos \xb15</option>\n'
             '            <option value="both10" selected>Ambos \xb110</option>\n'
             '            <option value="both20">Ambos \xb120</option>\n'
             '            <option value="both30">Ambos \xb130</option>\n'
             '            <option value="10">LONG &gt; +10</option>\n'
             '            <option value="20">LONG &gt; +20</option>\n'
             '            <option value="30">LONG &gt; +30</option>\n'
             '            <option value="-5">SHORT &lt; -5</option>\n'
             '            <option value="-10">SHORT &lt; -10</option>\n'
             '            <option value="-20">SHORT &lt; -20</option>\n'
             '          </select>')
assert OLD_FFLOW in html, 'stFFlow select not found'
html = html.replace(OLD_FFLOW, NEW_FFLOW, 1)

# ── 5. Update _parseThresh + add _isBothThresh ───────────────────────────────
OLD_PARSE = ("function _parseThresh(v){if(v===null||v===undefined||v==='off')return null;var n=parseFloat(v);return isNaN(n)?null:n;}\n"
             "\n"
             "/* attempt real backtest")
NEW_PARSE = ("function _parseThresh(v){if(v===null||v===undefined||v==='off')return null;"
             "if(typeof v==='string'&&v.indexOf('both')===0){var n=parseFloat(v.slice(4));return isNaN(n)?null:n;}"
             "var n=parseFloat(v);return isNaN(n)?null:n;}\n"
             "function _isBothThresh(v){return typeof v==='string'&&v.indexOf('both')===0;}\n"
             "\n"
             "/* attempt real backtest")
assert OLD_PARSE in html, '_parseThresh block not found'
html = html.replace(OLD_PARSE, NEW_PARSE, 1)

# ── 6. HVN mock: skip trade reduction for "both" mode ────────────────────────
OLD_HVN_REDUCE = ("  var clarity=_parseThresh(cfg.trend);\n"
                  "  var flow=_parseThresh(cfg.flow);\n"
                  "\n"
                  "  var _days=Math.max(7,parseInt(cfg.period)||30);\n"
                  "  var _pScale=Math.sqrt(_days/30);\n"
                  "  var tradesBase=Math.round(ri(130,210)*_pScale);\n"
                  "  if(clarity!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.45,Math.abs(clarity)/120)));\n"
                  "  if(flow!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.35,Math.abs(flow)/120)));")
NEW_HVN_REDUCE = ("  var clarity=_parseThresh(cfg.trend);\n"
                  "  var flow=_parseThresh(cfg.flow);\n"
                  "  var _bothTrend=_isBothThresh(cfg.trend),_bothFlow=_isBothThresh(cfg.flow);\n"
                  "\n"
                  "  var _days=Math.max(7,parseInt(cfg.period)||30);\n"
                  "  var _pScale=Math.sqrt(_days/30);\n"
                  "  var tradesBase=Math.round(ri(130,210)*_pScale);\n"
                  "  if(clarity!==null&&!_bothTrend)tradesBase=Math.round(tradesBase*(1-Math.min(0.45,Math.abs(clarity)/120)));\n"
                  "  if(flow!==null&&!_bothFlow)tradesBase=Math.round(tradesBase*(1-Math.min(0.35,Math.abs(flow)/120)));")
assert OLD_HVN_REDUCE in html, 'HVN reduce block not found'
html = html.replace(OLD_HVN_REDUCE, NEW_HVN_REDUCE, 1)

# ── 7. FVG mock: skip trade reduction for "both" mode ────────────────────────
OLD_FVG_REDUCE = ("  var clarity=_parseThresh(cfg.trend);\n"
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
                  "  if(flow!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.30,Math.abs(flow)/110)));")
NEW_FVG_REDUCE = ("  var clarity=_parseThresh(cfg.trend);\n"
                  "  var flow=_parseThresh(cfg.flow);\n"
                  "  var _bothTrend=_isBothThresh(cfg.trend),_bothFlow=_isBothThresh(cfg.flow);\n"
                  "  var _days=Math.max(7,parseInt(cfg.period)||30);\n"
                  "  var _pScale=Math.sqrt(_days/30);\n"
                  "  var tradesBase=Math.round(ri(16,28)*_pScale);\n"
                  "  var _minAtr=parseFloat(cfg.fvgMinAtr)||0.08;\n"
                  "  if(_minAtr<=0.05)tradesBase=Math.round(tradesBase*1.45);\n"
                  "  else if(_minAtr>=0.20)tradesBase=Math.round(tradesBase*0.40);\n"
                  "  else if(_minAtr>=0.15)tradesBase=Math.round(tradesBase*0.55);\n"
                  "  else if(_minAtr>=0.10)tradesBase=Math.round(tradesBase*0.75);\n"
                  "  if(cfg.fvgMit==='close')tradesBase=Math.round(tradesBase*0.78);\n"
                  "  if(clarity!==null&&!_bothTrend)tradesBase=Math.round(tradesBase*(1-Math.min(0.40,Math.abs(clarity)/110)));\n"
                  "  if(flow!==null&&!_bothFlow)tradesBase=Math.round(tradesBase*(1-Math.min(0.30,Math.abs(flow)/110)));")
assert OLD_FVG_REDUCE in html, 'FVG reduce block not found'
html = html.replace(OLD_FVG_REDUCE, NEW_FVG_REDUCE, 1)

# ── 8. Update insight warning: only warn about unidirectional SHORT ───────────
OLD_WARN = ("  if(clarity!==null&&clarity<0)msgs.push({i:'⚠️',t:'Threshold negativo (<b>'+clarity+'</b>) filtra apenas setups SHORT. Verifique se h\xe1 trades suficientes.'});")
NEW_WARN = ("  if(clarity!==null&&clarity<0&&!_isBothThresh(r.cfg.trend))msgs.push({i:'⚠️',t:'Threshold negativo (<b>'+clarity+'</b>) filtra apenas setups SHORT. Verifique se h\xe1 trades suficientes.'});")
assert OLD_WARN in html, 'insight SHORT warning not found'
html = html.replace(OLD_WARN, NEW_WARN, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.108 applied')
print('Ambos options added to stFTrend and stFFlow')
