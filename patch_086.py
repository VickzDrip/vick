#!/usr/bin/env python3
"""Beta 0.086 — Strategy Tester: Padrão do Sinal (mode) + Mín. candles mergulho"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.085', 'Beta 0.086')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.086\n  - HVN Signals: 3 modos de dete',
    '''Beta 0.086
  - Strategy Tester: Padrão do Sinal (stMode) e Mín. candles no mergulho
    (stDiveMin) adicionados à seção REGRAS DE ENTRADA.
  - Mock backtest modela o efeito do modo: dive/engulf = menos trades com
    win rate maior; all = mais trades, WR equilibrado.
  - _hashCfg inclui mode e diveMin para cache determinístico por modo.
  - _syncAllFromCfg sincroniza hvnSigMode ↔ stMode e hvnSigDiveMin ↔ stDiveMin.

Beta 0.085
  - HVN Signals: 3 modos de dete''',
    1
)

# ── 3. Add stMode + stDiveMin to Strategy Tester REGRAS DE ENTRADA ─────────
OLD_ST_REGRAS_END = (
    '      <div class="dvl-st-field" style="margin-bottom:8px"><span class="dvl-st-lbl">Dist. m\xe1x. fechamento da zona %</span>\n'
    '        <input class="dvl-st-inp" id="stCloseDist" type="number" value="0.40" step="0.05" min="0.05"></div>\n'
    '\n'
    '      <div class="dvl-st-sl">FILTROS</div>'
)

NEW_ST_REGRAS_END = (
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

assert OLD_ST_REGRAS_END in html, "Strategy Tester REGRAS end not found"
html = html.replace(OLD_ST_REGRAS_END, NEW_ST_REGRAS_END, 1)

# ── 4. Add mode + diveMin to backtest cfg build ───────────────────────────────
OLD_BT_CFG_END = (
    "        period:String(_stDays),\n"
    "        dateFrom:_stPer==='custom'?_stFrom:'',\n"
    "        dateTo:_stPer==='custom'?_stTo:'',\n"
    "      };"
)

NEW_BT_CFG_END = (
    "        period:String(_stDays),\n"
    "        dateFrom:_stPer==='custom'?_stFrom:'',\n"
    "        dateTo:_stPer==='custom'?_stTo:'',\n"
    "        mode:(_g('stMode')||{value:'wick'}).value,\n"
    "        diveMin:parseInt((_g('stDiveMin')||{value:'2'}).value)||2,\n"
    "      };"
)

assert OLD_BT_CFG_END in html, "backtest cfg end not found"
html = html.replace(OLD_BT_CFG_END, NEW_BT_CFG_END, 1)

# ── 5. Model signal mode in _backtest mock ────────────────────────────────────
OLD_TRADES_VS = (
    "  var _vs=parseFloat(cfg.volSpike||'0')||0;\n"
    "  if(_vs>1)tradesBase=Math.round(tradesBase*(1-Math.min(0.58,(_vs-1)*0.5)));\n"
    "  var trades=Math.max(12,tradesBase);"
)

NEW_TRADES_VS = (
    "  var _vs=parseFloat(cfg.volSpike||'0')||0;\n"
    "  if(_vs>1)tradesBase=Math.round(tradesBase*(1-Math.min(0.58,(_vs-1)*0.5)));\n"
    "  var _mode=cfg.mode||'wick';\n"
    "  if(_mode==='dive')tradesBase=Math.round(tradesBase*0.52);\n"
    "  else if(_mode==='engulf')tradesBase=Math.round(tradesBase*0.32);\n"
    "  else if(_mode==='all')tradesBase=Math.round(tradesBase*1.28);\n"
    "  var trades=Math.max(8,tradesBase);"
)

assert OLD_TRADES_VS in html, "tradesBase _vs block not found"
html = html.replace(OLD_TRADES_VS, NEW_TRADES_VS, 1)

OLD_WR_VS = (
    "  if(_vs>=2.0)wr+=0.07;else if(_vs>=1.5)wr+=0.05;else if(_vs>=1.2)wr+=0.02;\n"
    "  wr+=rnd(-0.03,0.03);"
)

NEW_WR_VS = (
    "  if(_vs>=2.0)wr+=0.07;else if(_vs>=1.5)wr+=0.05;else if(_vs>=1.2)wr+=0.02;\n"
    "  if(_mode==='dive')wr+=0.06;else if(_mode==='engulf')wr+=0.09;else if(_mode==='all')wr-=0.01;\n"
    "  wr+=rnd(-0.03,0.03);"
)

assert OLD_WR_VS in html, "wr _vs block not found"
html = html.replace(OLD_WR_VS, NEW_WR_VS, 1)

# ── 6. Add mode + diveMin to _hashCfg ────────────────────────────────────────
OLD_HASH_DATE = (
    "    cfg.dateFrom||'',cfg.dateTo||''\n"
    "  ]);"
)

NEW_HASH_DATE = (
    "    cfg.dateFrom||'',cfg.dateTo||'',\n"
    "    cfg.mode||'wick',cfg.diveMin||2\n"
    "  ]);"
)

assert OLD_HASH_DATE in html, "_hashCfg dateFrom not found"
html = html.replace(OLD_HASH_DATE, NEW_HASH_DATE, 1)

# ── 7. Sync stMode + stDiveMin in _syncAllFromCfg ────────────────────────────
OLD_SYNC_VOLSPIKE = (
    "  var volSpike=cfg.volSpike||'off';\n"
    "  _setSelVal('hvnSigVolSpike',volSpike);_setSelVal('stFVol',volSpike);"
)

NEW_SYNC_VOLSPIKE = (
    "  var volSpike=cfg.volSpike||'off';\n"
    "  _setSelVal('hvnSigVolSpike',volSpike);_setSelVal('stFVol',volSpike);\n"
    "  var _mode=cfg.mode||'wick';\n"
    "  _setSelVal('hvnSigMode',_mode);_setSelVal('stMode',_mode);\n"
    "  var _diveMin=cfg.diveMin||cfg.divemin||2;\n"
    "  _setVal('hvnSigDiveMin',_diveMin);_setVal('stDiveMin',_diveMin);"
)

assert OLD_SYNC_VOLSPIKE in html, "_syncAllFromCfg volSpike line not found"
html = html.replace(OLD_SYNC_VOLSPIKE, NEW_SYNC_VOLSPIKE, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.086 applied')
