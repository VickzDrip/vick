#!/usr/bin/env python3
"""Beta 0.090 — Optimizer: fix PF e Retorno travados no teto (3.60 / +42.00%)"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.089', 'Beta 0.090')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.090\n  - HVN Zones: novo campo',
    '''Beta 0.090
  - Optimizer/Backtest: corrige PF travado em 3.60 e Retorno em +42.00%.
    Causa: fórmula (avgW*wr)/(avgL*(1-wr)) com WR > 65% quase sempre
    ultrapassava o teto de 3.6; ret escalava com nº de trades sem divisor.
  - PF agora derivado do WR com pequeno ruído: 0.88 + (wr-0.50)*7.8 ± 0.08
    → range realista 0.80–2.85 para WR 50–76%.
  - Retorno calculado como EV/trade × trades: distingue combos com muitos
    trades de baixo WR vs poucos trades de alto WR.
  - _btCache limpo no início de cada rodada do Optimizer para não reutilizar
    resultados cacheados com a fórmula antiga.
  - Optimizer passa a ordenar por score combinado (PF × WR) em vez de só PF.

Beta 0.089
  - HVN Zones: novo campo''',
    1
)

# ── 3. Fix PF and Retorno formulas in _backtest ───────────────────────────────
OLD_PF_RET = (
    "  var avgW=rnd(1.2,1.9),avgL=rnd(0.7,1.1);\n"
    "  var pf=Math.max(0.5,Math.min(3.6,(avgW*wr)/(avgL*(1-wr))));\n"
    "  var ret=(wins*avgW-losses*avgL)*riskPct;\n"
    "  ret=Math.max(-22,Math.min(42,ret));"
)

NEW_PF_RET = (
    "  /* PF derived from WR so it varies meaningfully across combos */\n"
    "  var pf=Math.max(0.80,Math.min(2.85,0.88+(wr-0.50)*7.8+rnd(-0.08,0.08)));\n"
    "  /* Return: expected-value per trade × trade count, scaled to realistic % */\n"
    "  var _ev=(wr*1.35-(1-wr)*1.0)*riskPct*0.60;\n"
    "  var ret=trades*_ev*rnd(0.80,1.20);\n"
    "  ret=Math.max(-30,Math.min(80,ret));"
)

assert OLD_PF_RET in html, "_backtest avgW/pf/ret block not found"
html = html.replace(OLD_PF_RET, NEW_PF_RET, 1)

# ── 4. Clear _btCache at start of every optimizer run ────────────────────────
OLD_RUN_OPT_START = (
    "  runBtn.disabled=true;\n"
    "  runBtn.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" width=\"12\" height=\"12\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg> OTIMIZANDO...';\n"
    "  if(prog)prog.classList.add('show');\n"
    "  if(rw)rw.style.display='none';\n"
    "  var results=[],total=OPT_COMBOS.length,done=0;"
)

NEW_RUN_OPT_START = (
    "  runBtn.disabled=true;\n"
    "  runBtn.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" width=\"12\" height=\"12\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg> OTIMIZANDO...';\n"
    "  if(prog)prog.classList.add('show');\n"
    "  if(rw)rw.style.display='none';\n"
    "  for(var _k in _btCache)delete _btCache[_k];\n"
    "  var results=[],total=OPT_COMBOS.length,done=0;"
)

assert OLD_RUN_OPT_START in html, "_runOptimizer start block not found"
html = html.replace(OLD_RUN_OPT_START, NEW_RUN_OPT_START, 1)

# ── 5. Sort optimizer results by score = PF × WR instead of PF alone ─────────
OLD_SORT = (
    "      results.sort(function(a,b){return parseFloat(b.pf)-parseFloat(a.pf);});"
)

NEW_SORT = (
    "      var _sc=function(r){return parseFloat(r.pf)*parseFloat(r.wr);};\n"
    "      results.sort(function(a,b){return _sc(b)-_sc(a);});"
)

assert OLD_SORT in html, "optimizer sort not found"
html = html.replace(OLD_SORT, NEW_SORT, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.090 applied')
