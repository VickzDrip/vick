#!/usr/bin/env python3
"""Beta 0.081 — Volume Spike + TF das Zonas no Optimizer: params, combos, mock engine"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.080', 'Beta 0.081')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.081\n  - Volume spike filter: hvnSigVolSpike select',
    '''Beta 0.081
  - Optimizer: Volume Spike e TF das Zonas HVN adicionados ao OPT_PARAMS.
  - OPT_COMBOS expandido de 10 para 20 combos testando ×1.5 e ×2.0 spike.
  - _backtest mock modela volSpike: menos trades, win rate ligeiramente maior.
  - _hashCfg inclui volSpike no seed determinístico.
  - _runOptimizer passa volSpike ao _cachedBacktest; _cfgLabel mostra spike.
  - _syncAllFromCfg: volSpike já sincronizado; apply best atualiza seletores.

Beta 0.080
  - Volume spike filter: hvnSigVolSpike select''',
    1
)

# ── 3. Add Volume Spike + TF rows to OPT_PARAMS ──────────────────────────────
OLD_OPT_PARAMS = (
    "var OPT_PARAMS=[\n"
    "  {n:'Pavio mínimo',v:'30% · 35% · 40% · 45% · 50% · 55% · 60%'},\n"
    "  {n:'Regra de fechamento',v:'Fora da zona · Além do meio · Corpo forte'},\n"
    "  {n:'Consolidação (candles)',v:'3 · 5 · 8 · 12'},\n"
    "  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20'},\n"
    "  {n:'DVL Flow',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20'},\n"
    "  {n:'Dist. próxima HVN',v:'Sem filtro · 0.25% · 0.35% · 0.50%'},\n"
    "  {n:'Stop Loss',v:'Pavio · HVN · ATR'},\n"
    "  {n:'Take Profit',v:'Próx. HVN · 1R · 1.5R · 2R'},\n"
    "];"
)

NEW_OPT_PARAMS = (
    "var OPT_PARAMS=[\n"
    "  {n:'Pavio m\xednimo',v:'30% \xb7 35% \xb7 40% \xb7 45% \xb7 50% \xb7 55% \xb7 60%'},\n"
    "  {n:'Regra de fechamento',v:'Fora da zona \xb7 Al\xe9m do meio \xb7 Corpo forte'},\n"
    "  {n:'Consolida\xe7\xe3o (candles)',v:'3 \xb7 5 \xb7 8 \xb7 12'},\n"
    "  {n:'Trend Clarity',v:'Off \xb7 LONG > +10 \xb7 > +20 \xb7 > +30 \xb7 SHORT < -5 \xb7 < -10 \xb7 < -20'},\n"
    "  {n:'DVL Flow',v:'Off \xb7 LONG > +10 \xb7 > +20 \xb7 > +30 \xb7 SHORT < -5 \xb7 < -10 \xb7 < -20'},\n"
    "  {n:'Dist. pr\xf3xima HVN',v:'Sem filtro \xb7 0.25% \xb7 0.35% \xb7 0.50%'},\n"
    "  {n:'Volume spike',v:'Desativado \xb7 \xd71.5 \xb7 \xd72.0'},\n"
    "  {n:'Stop Loss',v:'Pavio \xb7 HVN \xb7 ATR'},\n"
    "  {n:'Take Profit',v:'Pr\xf3x. HVN \xb7 1R \xb7 1.5R \xb7 2R'},\n"
    "  {n:'TF das Zonas HVN',v:'Config. no indicador (MTF)'},\n"
    "];"
)

assert OLD_OPT_PARAMS in html, "OPT_PARAMS not found"
html = html.replace(OLD_OPT_PARAMS, NEW_OPT_PARAMS, 1)

# ── 4. Add volSpike to _hashCfg ───────────────────────────────────────────────
OLD_HASH = (
    "    cfg.period||'30',cfg.tf||'5m',cfg.pair||'BTC/USDT',\n"
    "    cfg.close||'outside',cfg.cons||5\n"
    "  ]);"
)

NEW_HASH = (
    "    cfg.period||'30',cfg.tf||'5m',cfg.pair||'BTC/USDT',\n"
    "    cfg.close||'outside',cfg.cons||5,cfg.volSpike||'off'\n"
    "  ]);"
)

assert OLD_HASH in html, "_hashCfg array not found"
html = html.replace(OLD_HASH, NEW_HASH, 1)

# ── 5. Model volSpike in _backtest mock ───────────────────────────────────────
OLD_TRADES_FLOW = (
    "  if(clarity!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.45,Math.abs(clarity)/120)));\n"
    "  if(flow!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.35,Math.abs(flow)/120)));\n"
    "  var trades=Math.max(20,tradesBase);"
)

NEW_TRADES_FLOW = (
    "  if(clarity!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.45,Math.abs(clarity)/120)));\n"
    "  if(flow!==null)tradesBase=Math.round(tradesBase*(1-Math.min(0.35,Math.abs(flow)/120)));\n"
    "  var _vs=parseFloat(cfg.volSpike||'0')||0;\n"
    "  if(_vs>1)tradesBase=Math.round(tradesBase*(1-Math.min(0.58,(_vs-1)*0.5)));\n"
    "  var trades=Math.max(12,tradesBase);"
)

assert OLD_TRADES_FLOW in html, "_backtest trades/flow block not found"
html = html.replace(OLD_TRADES_FLOW, NEW_TRADES_FLOW, 1)

OLD_WR_FLOW = (
    "  if(flow!==null){\n"
    "    if(flow>0){wr+=flow>=30?0.06:flow>=20?0.04:0.02;}\n"
    "    else{wr+=Math.abs(flow)>=10?0.05:0.02;}\n"
    "  }\n"
    "  wr+=rnd(-0.03,0.03);"
)

NEW_WR_FLOW = (
    "  if(flow!==null){\n"
    "    if(flow>0){wr+=flow>=30?0.06:flow>=20?0.04:0.02;}\n"
    "    else{wr+=Math.abs(flow)>=10?0.05:0.02;}\n"
    "  }\n"
    "  if(_vs>=2.0)wr+=0.07;else if(_vs>=1.5)wr+=0.05;else if(_vs>=1.2)wr+=0.02;\n"
    "  wr+=rnd(-0.03,0.03);"
)

assert OLD_WR_FLOW in html, "_backtest wr/flow block not found"
html = html.replace(OLD_WR_FLOW, NEW_WR_FLOW, 1)

# ── 6. Expand OPT_COMBOS with volSpike variants ───────────────────────────────
OLD_OPT_COMBOS = (
    "var OPT_COMBOS=[\n"
    "  /* LONG setups — strong filters */\n"
    "  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn'},\n"
    "  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn'},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r'},\n"
    "  {w:40,close:'outside',cons:5,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'hvn'},\n"
    "  {w:55,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'atr',tp:'hvn'},\n"
    "  /* SHORT setups */\n"
    "  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r'},\n"
    "  {w:45,close:'outside',cons:5,trend:-5, flow:-5, hvn:0.35,sl:'wick',tp:'1r'},\n"
    "  {w:50,close:'outside',cons:3,trend:-10,flow:-5, hvn:0.25,sl:'hvn',tp:'1.5r'},\n"
    "  /* Mixed / no filter */\n"
    "  {w:40,close:'mid',   cons:8, trend:10, flow:10, hvn:0.5, sl:'wick',tp:'2r'},\n"
    "  {w:60,close:'strong',cons:3, trend:30, flow:null,hvn:0.25,sl:'wick',tp:'1.5r'},\n"
    "];"
)

NEW_OPT_COMBOS = (
    "var OPT_COMBOS=[\n"
    "  /* LONG — sem spike */\n"
    "  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off'},\n"
    "  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off'},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off'},\n"
    "  {w:40,close:'outside',cons:5,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off'},\n"
    "  /* SHORT — sem spike */\n"
    "  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off'},\n"
    "  {w:45,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off'},\n"
    "  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off'},\n"
    "  /* LONG + spike \xd71.5 */\n"
    "  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5'},\n"
    "  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5'},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5'},\n"
    "  {w:40,close:'outside',cons:5,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5'},\n"
    "  /* SHORT + spike \xd71.5 */\n"
    "  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5'},\n"
    "  {w:45,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5'},\n"
    "  /* LONG + spike \xd72.0 — alta convic\xe7\xe3o */\n"
    "  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0'},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0'},\n"
    "  /* SHORT + spike \xd72.0 */\n"
    "  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0'},\n"
    "  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0'},\n"
    "  /* Mixed */\n"
    "  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'off'},\n"
    "  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5'},\n"
    "  {w:60,close:'strong',cons:3,trend:30,flow:null,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'1.5'},\n"
    "];"
)

assert OLD_OPT_COMBOS in html, "OPT_COMBOS not found"
html = html.replace(OLD_OPT_COMBOS, NEW_OPT_COMBOS, 1)

# ── 7. Pass volSpike from combo to _cachedBacktest in optimizer step ──────────
OLD_OPT_STEP = (
    "    var r=_cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons});"
)

NEW_OPT_STEP = (
    "    var r=_cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off'});"
)

assert OLD_OPT_STEP in html, "optimizer _cachedBacktest call not found"
html = html.replace(OLD_OPT_STEP, NEW_OPT_STEP, 1)

# ── 8. Show volSpike in _cfgLabel ────────────────────────────────────────────
OLD_CFG_LABEL = (
    "function _cfgLabel(c){\n"
    "  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];\n"
    "  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
    "  if(tl)p.push(tl);if(fl)p.push(fl);\n"
    "  return p.join(' | ');\n"
    "}"
)

NEW_CFG_LABEL = (
    "function _cfgLabel(c){\n"
    "  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];\n"
    "  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
    "  if(tl)p.push(tl);if(fl)p.push(fl);\n"
    "  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
    "  return p.join(' | ');\n"
    "}"
)

assert OLD_CFG_LABEL in html, "_cfgLabel not found"
html = html.replace(OLD_CFG_LABEL, NEW_CFG_LABEL, 1)

# ── 9. Ensure _syncAllFromCfg extracts volSpike from combo cfg ────────────────
# The combo now uses cfg.volSpike directly; _syncAllFromCfg already handles it.
# Also ensure apply-best passes volSpike to _syncAllFromCfg via the combo object.
# The apply-best button calls _syncAllFromCfg(_bestCfgs[0].c||...) — combo now has volSpike. OK.

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.081 applied')
