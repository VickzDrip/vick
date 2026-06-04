#!/usr/bin/env python3
"""patch_131.py — Beta 0.131: período HVN separado + mais opções de período (3/5 anos)"""

import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.130') >= 10
html = html.replace('Beta 0.130', 'Beta 0.131')

# ── 1. stPeriod: add 3 anos / 5 anos before custom ───────────────────────────
OLD_PERIOD_SEL = ('<select class="dvl-st-sel" id="stPeriod" onchange="'
    '(function(v){var r=document.getElementById(\'stDateRow\');if(r)r.style.display=v===\'custom\'?\'block\':\'none\';})(this.value)">'
    '<option value="7">7 dias</option>'
    '<option value="30" selected>30 dias</option>'
    '<option value="90">90 dias</option>'
    '<option value="180">180 dias</option>'
    '<option value="365">1 ano</option>'
    '<option value="730">2 anos</option>'
    '<option value="custom">Personalizado…</option></select>')
assert OLD_PERIOD_SEL in html, 'stPeriod select not found'
NEW_PERIOD_SEL = ('<select class="dvl-st-sel" id="stPeriod" onchange="'
    '(function(v){var r=document.getElementById(\'stDateRow\');if(r)r.style.display=v===\'custom\'?\'block\':\'none\';})(this.value)">'
    '<option value="7">7 dias</option>'
    '<option value="30" selected>30 dias</option>'
    '<option value="90">90 dias</option>'
    '<option value="180">180 dias</option>'
    '<option value="365">1 ano</option>'
    '<option value="730">2 anos</option>'
    '<option value="1095">3 anos</option>'
    '<option value="1825">5 anos</option>'
    '<option value="custom">Personalizado…</option></select>')
html = html.replace(OLD_PERIOD_SEL, NEW_PERIOD_SEL, 1)

# ── 2. stOptPeriod: add 3 anos / 5 anos ──────────────────────────────────────
OLD_OPT_PERIOD = ('<select class="dvl-st-sel" id="stOptPeriod">\n'
    '            <option value="7">7 dias</option>\n'
    '            <option value="30" selected>30 dias</option>\n'
    '            <option value="90">90 dias</option>\n'
    '            <option value="180">180 dias</option>\n'
    '            <option value="365">1 ano</option>\n'
    '            <option value="730">2 anos</option>\n'
    '          </select>')
assert OLD_OPT_PERIOD in html, 'stOptPeriod select not found'
NEW_OPT_PERIOD = ('<select class="dvl-st-sel" id="stOptPeriod">\n'
    '            <option value="7">7 dias</option>\n'
    '            <option value="30" selected>30 dias</option>\n'
    '            <option value="90">90 dias</option>\n'
    '            <option value="180">180 dias</option>\n'
    '            <option value="365">1 ano</option>\n'
    '            <option value="730">2 anos</option>\n'
    '            <option value="1095">3 anos</option>\n'
    '            <option value="1825">5 anos</option>\n'
    '          </select>')
html = html.replace(OLD_OPT_PERIOD, NEW_OPT_PERIOD, 1)

# ── 3. Add stHvnZonePeriod field inside stHVNFields ──────────────────────────
OLD_HVN_FIELDS_START = ('      <div class="dvl-st-sl">REGRAS DE ENTRADA</div>\n'
    '      <div id="stHVNFields">\n'
    '        <div class="dvl-st-checks">')
assert OLD_HVN_FIELDS_START in html, 'stHVNFields start not found'
NEW_HVN_FIELDS_START = ('      <div class="dvl-st-sl">REGRAS DE ENTRADA</div>\n'
    '      <div id="stHVNFields">\n'
    '        <div class="dvl-st-field" style="margin-bottom:7px">'
    '<span class="dvl-st-lbl">Histórico das Zonas HVN</span>'
    '<select class="dvl-st-sel" id="stHvnZonePeriod">'
    '<option value="0" selected>Mesmo período do backtest</option>'
    '<option value="90">+ 3 meses antes</option>'
    '<option value="180">+ 6 meses antes</option>'
    '<option value="365">+ 1 ano antes</option>'
    '<option value="730">+ 2 anos antes</option>'
    '<option value="1825">+ 5 anos antes</option>'
    '</select></div>\n'
    '        <div class="dvl-st-checks">')
html = html.replace(OLD_HVN_FIELDS_START, NEW_HVN_FIELDS_START, 1)

# ── 4. _backtestReal: add _preSafe param to correctly flag lookahead ──────────
OLD_BT_SAFE = ('function _backtestReal(cfg,_preCandles,_preZones){\n'
    '  if(cfg.signalType===\'fvgConf\')return _backtestRealFVG(cfg,_preCandles);\n'
    '  if(cfg.signalType===\'trendBreak\')return _backtestRealTB(cfg,_preCandles);\n'
    '  try{\n'
    '    var candles=_preCandles||(window.S&&window.S.candles)||[];\n'
    '    if(candles.length<50)return null;\n'
    '    var zones=_preZones;\n'
    '    if(!zones){\n'
    '      /* lookahead-safe: compute zones only from warmup (40% or min 500 candles) */\n'
    '      var _wuEnd=Math.min(candles.length,Math.max(500,Math.floor(candles.length*0.4)));\n'
    '      var _wuC=_wuEnd<candles.length?candles.slice(0,_wuEnd):candles;\n'
    '      zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_wuC):\n'
    '        (window.__hvnZones?window.__hvnZones():[]);\n'
    '      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=true;\n'
    '    }else{\n'
    '      /* zones from external source (optimizer/chart) use full history = lookahead risk */\n'
    '      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=false;\n'
    '    }')
assert OLD_BT_SAFE in html, '_backtestReal signature not found'
NEW_BT_SAFE = ('function _backtestReal(cfg,_preCandles,_preZones,_preSafe){\n'
    '  if(cfg.signalType===\'fvgConf\')return _backtestRealFVG(cfg,_preCandles);\n'
    '  if(cfg.signalType===\'trendBreak\')return _backtestRealTB(cfg,_preCandles);\n'
    '  try{\n'
    '    var candles=_preCandles||(window.S&&window.S.candles)||[];\n'
    '    if(candles.length<50)return null;\n'
    '    var zones=_preZones;\n'
    '    if(!zones){\n'
    '      /* lookahead-safe: compute zones only from warmup (40% or min 500 candles) */\n'
    '      var _wuEnd=Math.min(candles.length,Math.max(500,Math.floor(candles.length*0.4)));\n'
    '      var _wuC=_wuEnd<candles.length?candles.slice(0,_wuEnd):candles;\n'
    '      zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_wuC):\n'
    '        (window.__hvnZones?window.__hvnZones():[]);\n'
    '      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=true;\n'
    '    }else{\n'
    '      /* _preSafe=true means zones were fetched from before the test period */\n'
    '      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=!!_preSafe;\n'
    '    }')
html = html.replace(OLD_BT_SAFE, NEW_BT_SAFE, 1)

# ── 5. Backtest click handler: fetch HVN zone candles when period is set ──────
# Find the block where candles are fetched and zones are computed, then inject
# the HVN pre-period logic just before _backtestReal is called.

OLD_BT_CALL = ('      var _needsZones=cfg.signalType===\'hvnSignals\'||!cfg.signalType;\n'
    '      if(_needsZones){\n'
    '        if(!zones||!zones.length){\n'
    '          zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '            (window.__hvnZones?window.__hvnZones():[]);\n'
    '          /* cache zones back for next backtest run */\n'
    '          if(window.DVLBacktestData&&window.DVLBacktestData.candles===candles)window.DVLBacktestData.zones=zones;\n'
    '        }\n'
    '        if(!zones||!zones.length){\n'
    '          _setBadge(\'NO HISTORY\',\'#ff4d6a\',\'rgba(255,77,106,.08)\',\'rgba(255,77,106,.25)\',\n'
    '            \'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue o gráfico.\',\n'
    '            \'rgba(255,77,106,.8)\');\n'
    '          return;\n'
    '        }\n'
    '      }\n'
    '      var res=_backtestReal(cfg,candles,zones);')
assert OLD_BT_CALL in html, 'backtest zone+call block not found'
NEW_BT_CALL = ('      var _needsZones=cfg.signalType===\'hvnSignals\'||!cfg.signalType;\n'
    '      var _hvnPreSafe=false;\n'
    '      if(_needsZones){\n'
    '        var _hvnZP=parseInt((_g(\'stHvnZonePeriod\')||{value:\'0\'}).value)||0;\n'
    '        if(_hvnZP>0){\n'
    '          /* fetch extra pre-period candles just for HVN zone computation */\n'
    '          var _totalDays=_stDays+_hvnZP;\n'
    '          try{\n'
    '            var _dn2=_g(\'dvlSTDetNote\');\n'
    '            if(_dn2)_dn2.textContent=\'Buscando \'+_hvnZP+\' dias extras para zonas HVN...\';\n'
    '            var _allC=await _dvlFetchBTCandles(sym,tf,_totalDays,\'\',\'\',null);\n'
    '            if(_allC&&_allC.length>100){\n'
    '              var _hvnCount=Math.max(50,Math.floor(_allC.length*_hvnZP/_totalDays));\n'
    '              var _hvnC=_allC.slice(0,_hvnCount);\n'
    '              /* use only the backtest portion for signals */\n'
    '              candles=_allC.slice(_hvnCount);\n'
    '              zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_hvnC):null;\n'
    '              _hvnPreSafe=true;/* zones from before test period = lookahead safe */\n'
    '            }\n'
    '          }catch(_e2){/* ignore — fall back to normal */}\n'
    '        }\n'
    '        if(!zones||!zones.length){\n'
    '          zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(candles):\n'
    '            (window.__hvnZones?window.__hvnZones():[]);\n'
    '          /* cache zones back for next backtest run */\n'
    '          if(window.DVLBacktestData&&window.DVLBacktestData.candles===candles)window.DVLBacktestData.zones=zones;\n'
    '        }\n'
    '        if(!zones||!zones.length){\n'
    '          _setBadge(\'NO HISTORY\',\'#ff4d6a\',\'rgba(255,77,106,.08)\',\'rgba(255,77,106,.25)\',\n'
    '            \'Sem zonas HVN calculadas. Ative o Vol Zones e recarregue o gráfico.\',\n'
    '            \'rgba(255,77,106,.8)\');\n'
    '          return;\n'
    '        }\n'
    '      }\n'
    '      var res=_backtestReal(cfg,candles,zones,_hvnPreSafe);')
html = html.replace(OLD_BT_CALL, NEW_BT_CALL, 1)

# ── 6. Update Live Stats sync to show HVN zone period note ───────────────────
# (no change needed — Live Stats doesn't use HVN zone period)

# ── 7. CSS: version comment ───────────────────────────────────────────────────
assert '/* ── DVL Strategy Tester — Beta 0.131 ── */' in html
html = html.replace(
    '/* ── DVL Strategy Tester — Beta 0.131 ── */',
    '/* ── DVL Strategy Tester — Beta 0.131 ── */\n'
    '/* 0.131: período HVN separado (busca candles extras antes do backtest); +3/5 anos nos seletores */',
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_131.py applied — Beta 0.131')
print('  + stPeriod / stOptPeriod: 3 anos (1095d), 5 anos (1825d)')
print('  + stHvnZonePeriod: busca candles extras antes do backtest para zonas HVN')
print('  + _backtestReal: _preSafe flag — zones pré-período = LOOKAHEAD SAFE')
