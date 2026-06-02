#!/usr/bin/env python3
"""Beta 0.087 — Optimizer: OPT_COMBOS expandido de 20 para 50 combos com todos os modos"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.086', 'Beta 0.087')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.087\n  - Strategy Tester: Padr\xe3o do Sinal',
    '''Beta 0.087
  - Optimizer: OPT_COMBOS expandido de 20 para 50 combos cobrindo os
    tr\xeas modos de sinal (wick, dive, engulf) com varia\xe7\xf5es de pavio,
    filtros, spike de volume e SL/TP.
  - OPT_PARAMS atualizado com linha "Padr\xe3o do Sinal".
  - _cfgLabel exibe o modo (DIVE / ENGULF) quando n\xe3o \xe9 wick.
  - _runOptimizer passa mode e diveMin ao _cachedBacktest por combo.

Beta 0.086
  - Strategy Tester: Padr\xe3o do Sinal''',
    1
)

# ── 3. Add "Padrão do Sinal" to OPT_PARAMS ───────────────────────────────────
OLD_OPT_PARAMS = (
    "  {n:'Volume spike',v:'Desativado \xb7 \xd71.5 \xb7 \xd72.0'},\n"
    "  {n:'Stop Loss',v:'Pavio \xb7 HVN \xb7 ATR'},\n"
    "  {n:'Take Profit',v:'Pr\xf3x. HVN \xb7 1R \xb7 1.5R \xb7 2R'},\n"
    "  {n:'TF das Zonas HVN',v:'Config. no indicador (MTF)'},\n"
    "];"
)

NEW_OPT_PARAMS = (
    "  {n:'Volume spike',v:'Desativado \xb7 \xd71.5 \xb7 \xd72.0'},\n"
    "  {n:'Padr\xe3o do Sinal',v:'Wick Rejection \xb7 Dive & Recover \xb7 Engolfing \xb7 Todos'},\n"
    "  {n:'Stop Loss',v:'Pavio \xb7 HVN \xb7 ATR'},\n"
    "  {n:'Take Profit',v:'Pr\xf3x. HVN \xb7 1R \xb7 1.5R \xb7 2R'},\n"
    "  {n:'TF das Zonas HVN',v:'Config. no indicador (MTF)'},\n"
    "];"
)

assert OLD_OPT_PARAMS in html, "OPT_PARAMS not found"
html = html.replace(OLD_OPT_PARAMS, NEW_OPT_PARAMS, 1)

# ── 4. Replace OPT_COMBOS (20 → 50) ──────────────────────────────────────────
OLD_OPT_COMBOS = (
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

NEW_OPT_COMBOS = (
    "var OPT_COMBOS=[\n"
    "  /* ── WICK REJECTION — LONG ─────────────────────────────────── */\n"
    "  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:40,close:'outside',cons:5,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:55,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:2},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2},\n"
    "  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2},\n"
    "  /* ── WICK REJECTION — SHORT ────────────────────────────────── */\n"
    "  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:45,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2},\n"
    "  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2},\n"
    "  /* ── WICK — MIXED / RELAXED ────────────────────────────────── */\n"
    "  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:2},\n"
    "  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:2},\n"
    "  {w:60,close:'strong',cons:3,trend:30,flow:null,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2},\n"
    "  /* ── DIVE & RECOVER — LONG ──────────────────────────────────── */\n"
    "  {w:35,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},\n"
    "  {w:35,close:'outside',cons:3,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'dive',diveMin:2},\n"
    "  {w:40,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:3},\n"
    "  {w:35,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:2},\n"
    "  {w:40,close:'outside',cons:5,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:2},\n"
    "  {w:35,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2},\n"
    "  {w:40,close:'mid',cons:5,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},\n"
    "  /* ── DIVE & RECOVER — SHORT ─────────────────────────────────── */\n"
    "  {w:35,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:2},\n"
    "  {w:35,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},\n"
    "  {w:40,close:'outside',cons:5,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:3},\n"
    "  {w:35,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:2},\n"
    "  {w:40,close:'outside',cons:5,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2},\n"
    "  /* ── ENGOLFING — LONG ──────────────────────────────────────── */\n"
    "  {w:30,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:1},\n"
    "  {w:30,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:1},\n"
    "  {w:35,close:'outside',cons:3,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},\n"
    "  {w:30,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:1},\n"
    "  {w:30,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:1},\n"
    "  /* ── ENGOLFING — SHORT ─────────────────────────────────────── */\n"
    "  {w:30,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},\n"
    "  {w:30,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:1},\n"
    "  {w:35,close:'outside',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},\n"
    "  {w:30,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:1},\n"
    "  {w:30,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:1},\n"
    "  /* ── TODOS OS PADR\xd5ES — alta convic\xe7\xe3o ─────────────────── */\n"
    "  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:2},\n"
    "  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2},\n"
    "  {w:40,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2},\n"
    "  {w:35,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2},\n"
    "  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0',mode:'all',diveMin:2},\n"
    "  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2},\n"
    "];"
)

assert OLD_OPT_COMBOS in html, "OPT_COMBOS not found"
html = html.replace(OLD_OPT_COMBOS, NEW_OPT_COMBOS, 1)

# ── 5. Update _cfgLabel to show mode ─────────────────────────────────────────
OLD_CFG_LABEL = (
    "function _cfgLabel(c){\n"
    "  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];\n"
    "  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
    "  if(tl)p.push(tl);if(fl)p.push(fl);\n"
    "  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
    "  return p.join(' | ');\n"
    "}"
)

NEW_CFG_LABEL = (
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

assert OLD_CFG_LABEL in html, "_cfgLabel not found"
html = html.replace(OLD_CFG_LABEL, NEW_CFG_LABEL, 1)

# ── 6. Pass mode + diveMin from combo to _cachedBacktest in optimizer step ────
OLD_OPT_STEP = "    var r=_cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off'});"

NEW_OPT_STEP = "    var r=_cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2});"

assert OLD_OPT_STEP in html, "optimizer _cachedBacktest call not found"
html = html.replace(OLD_OPT_STEP, NEW_OPT_STEP, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.087 applied')
