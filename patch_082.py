#!/usr/bin/env python3
"""Beta 0.082 — Strategy Tester: TF expandido + Período 1ano/2anos/Personalizado"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.081', 'Beta 0.082')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.082\n  - Optimizer: Volume Spike e TF das Zonas HVN adicionados',
    '''Beta 0.082
  - Strategy Tester: TF expandido — adicionados 30m, 2h e 1W.
  - Período: adicionados 1 ano (365d), 2 anos (730d) e Personalizado
    (date picker De/Até com cálculo automático de dias).
  - Mock backtest escala tradesBase pelo período selecionado (base 30d).
  - _hashCfg inclui dateFrom/dateTo quando período é personalizado.

Beta 0.081
  - Optimizer: Volume Spike e TF das Zonas HVN adicionados''',
    1
)

# ── 3. Expand stTf options ────────────────────────────────────────────────────
OLD_STF = (
    '<select class="dvl-st-sel" id="stTf">'
    '<option value="5m">5m</option>'
    '<option value="15m">15m</option>'
    '<option value="1h">1h</option>'
    '<option value="4h">4h</option>'
    '<option value="1d">1D</option>'
    '</select>'
)

NEW_STF = (
    '<select class="dvl-st-sel" id="stTf">'
    '<option value="5m">5m</option>'
    '<option value="15m">15m</option>'
    '<option value="30m">30m</option>'
    '<option value="1h">1h</option>'
    '<option value="2h">2h</option>'
    '<option value="4h">4h</option>'
    '<option value="1d">1D</option>'
    '<option value="1w">1W</option>'
    '</select>'
)

assert OLD_STF in html, "stTf select not found"
html = html.replace(OLD_STF, NEW_STF, 1)

# ── 4. Expand stPeriod + add date picker row ──────────────────────────────────
OLD_PERIOD_ROW = (
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">TF das Zonas HVN</span>\n'
    '          <select class="dvl-st-sel" id="stTf">'
    '<option value="5m">5m</option>'
    '<option value="15m">15m</option>'
    '<option value="30m">30m</option>'
    '<option value="1h">1h</option>'
    '<option value="2h">2h</option>'
    '<option value="4h">4h</option>'
    '<option value="1d">1D</option>'
    '<option value="1w">1W</option>'
    '</select></div>\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Per\xedodo</span>\n'
    '          <select class="dvl-st-sel" id="stPeriod">'
    '<option value="7">7 dias</option>'
    '<option value="30" selected>30 dias</option>'
    '<option value="90">90 dias</option>'
    '<option value="180">180 dias</option>'
    '</select></div>\n'
    '      </div>'
)

NEW_PERIOD_ROW = (
    '      <div class="dvl-st-row2">\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">TF das Zonas HVN</span>\n'
    '          <select class="dvl-st-sel" id="stTf">'
    '<option value="5m">5m</option>'
    '<option value="15m">15m</option>'
    '<option value="30m">30m</option>'
    '<option value="1h">1h</option>'
    '<option value="2h">2h</option>'
    '<option value="4h">4h</option>'
    '<option value="1d">1D</option>'
    '<option value="1w">1W</option>'
    '</select></div>\n'
    '        <div class="dvl-st-field"><span class="dvl-st-lbl">Per\xedodo</span>\n'
    '          <select class="dvl-st-sel" id="stPeriod" onchange="(function(v){var r=document.getElementById(\'stDateRow\');if(r)r.style.display=v===\'custom\'?\'block\':\'none\';})(this.value)">'
    '<option value="7">7 dias</option>'
    '<option value="30" selected>30 dias</option>'
    '<option value="90">90 dias</option>'
    '<option value="180">180 dias</option>'
    '<option value="365">1 ano</option>'
    '<option value="730">2 anos</option>'
    '<option value="custom">Personalizado…</option>'
    '</select></div>\n'
    '      </div>\n'
    '      <div id="stDateRow" style="display:none;margin-top:2px">\n'
    '        <div class="dvl-st-row2">\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">De</span>\n'
    '            <input class="dvl-st-inp" id="stDateFrom" type="date" style="width:100%;font-size:10px;padding:3px 5px"></div>\n'
    '          <div class="dvl-st-field"><span class="dvl-st-lbl">At\xe9</span>\n'
    '            <input class="dvl-st-inp" id="stDateTo" type="date" style="width:100%;font-size:10px;padding:3px 5px"></div>\n'
    '        </div>\n'
    '      </div>'
)

assert OLD_PERIOD_ROW in html, "stPeriod row not found"
html = html.replace(OLD_PERIOD_ROW, NEW_PERIOD_ROW, 1)

# ── 5. Init date inputs with defaults in the Strategy Tester init block ────────
# Find the block that initialises the stTf to S.tf and add date defaults after it
OLD_STF_INIT = "  try{var s=document.getElementById('stTf');if(s&&window.S&&window.S.tf)s.value=window.S.tf;}catch(_){}"

NEW_STF_INIT = (
    "  try{var s=document.getElementById('stTf');if(s&&window.S&&window.S.tf)s.value=window.S.tf;}catch(_){}\n"
    "  try{\n"
    "    /* default date range: today - 1 year → today */\n"
    "    var _td=new Date(),_ty=new Date(_td);\n"
    "    _ty.setFullYear(_td.getFullYear()-1);\n"
    "    function _fmtD(d){return d.toISOString().slice(0,10);}\n"
    "    var _df=document.getElementById('stDateFrom'),_dt=document.getElementById('stDateTo');\n"
    "    if(_df&&!_df.value)_df.value=_fmtD(_ty);\n"
    "    if(_dt&&!_dt.value)_dt.value=_fmtD(_td);\n"
    "  }catch(_){}"
)

assert OLD_STF_INIT in html, "stTf init block not found"
html = html.replace(OLD_STF_INIT, NEW_STF_INIT, 1)

# ── 6. Add period + dateFrom/dateTo to backtest cfg build (click handler) ─────
OLD_BT_CFG = (
    "      var cfg={\n"
    "        wickSens:(_g('stWickSens')||{value:'45'}).value,\n"
    "        trend:(_g('stFTrend')||{value:'20'}).value,\n"
    "        flow:(_g('stFFlow')||{value:'20'}).value,\n"
    "        nextHVN:(_g('stNextHVN')||{value:'0.35'}).value,\n"
    "        sl:(_g('stSL')||{value:'wick'}).value,\n"
    "        tp:(_g('stTP')||{value:'hvn'}).value,\n"
    "        risk:(_g('stRisk')||{value:'1.0'}).value,\n"
    "        be:(_g('stBE')||{value:'off'}).value,\n"
    "        tf:(_g('stTf')||{value:'5m'}).value,\n"
    "      };"
)

NEW_BT_CFG = (
    "      var _stPer=(_g('stPeriod')||{value:'30'}).value;\n"
    "      var _stFrom=(_g('stDateFrom')||{value:''}).value;\n"
    "      var _stTo=(_g('stDateTo')||{value:''}).value;\n"
    "      var _stDays=_stPer==='custom'?\n"
    "        ((_stFrom&&_stTo)?Math.max(1,Math.round((new Date(_stTo)-new Date(_stFrom))/86400000)):365)\n"
    "        :parseInt(_stPer)||30;\n"
    "      var cfg={\n"
    "        wickSens:(_g('stWickSens')||{value:'45'}).value,\n"
    "        trend:(_g('stFTrend')||{value:'20'}).value,\n"
    "        flow:(_g('stFFlow')||{value:'20'}).value,\n"
    "        nextHVN:(_g('stNextHVN')||{value:'0.35'}).value,\n"
    "        sl:(_g('stSL')||{value:'wick'}).value,\n"
    "        tp:(_g('stTP')||{value:'hvn'}).value,\n"
    "        risk:(_g('stRisk')||{value:'1.0'}).value,\n"
    "        be:(_g('stBE')||{value:'off'}).value,\n"
    "        tf:(_g('stTf')||{value:'5m'}).value,\n"
    "        period:String(_stDays),\n"
    "        dateFrom:_stPer==='custom'?_stFrom:'',\n"
    "        dateTo:_stPer==='custom'?_stTo:'',\n"
    "      };"
)

assert OLD_BT_CFG in html, "backtest cfg build block not found"
html = html.replace(OLD_BT_CFG, NEW_BT_CFG, 1)

# ── 7. Scale tradesBase by period in _backtest mock ───────────────────────────
OLD_TRADES_BASE = "  var tradesBase=ri(130,210);"

NEW_TRADES_BASE = (
    "  var _days=Math.max(7,parseInt(cfg.period)||30);\n"
    "  var _pScale=Math.sqrt(_days/30);\n"
    "  var tradesBase=Math.round(ri(130,210)*_pScale);"
)

assert OLD_TRADES_BASE in html, "tradesBase line not found"
html = html.replace(OLD_TRADES_BASE, NEW_TRADES_BASE, 1)

# ── 8. Add dateFrom/dateTo to _hashCfg ───────────────────────────────────────
OLD_HASH_END = (
    "    cfg.close||'outside',cfg.cons||5,cfg.volSpike||'off'\n"
    "  ]);"
)

NEW_HASH_END = (
    "    cfg.close||'outside',cfg.cons||5,cfg.volSpike||'off',\n"
    "    cfg.dateFrom||'',cfg.dateTo||''\n"
    "  ]);"
)

assert OLD_HASH_END in html, "_hashCfg end not found"
html = html.replace(OLD_HASH_END, NEW_HASH_END, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.082 applied')
