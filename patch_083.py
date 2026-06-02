#!/usr/bin/env python3
"""Beta 0.083 — Optimizer: botão APLICAR em cada resultado do ranking"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.082', 'Beta 0.083')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.083\n  - Strategy Tester: TF expandido',
    '''Beta 0.083
  - Optimizer: cada resultado do ranking tem seu próprio botão APLICAR.
  - Botão único "Aplicar Melhor Configuração" removido; agora cada card
    tem "↳ APLICAR" que chama _applyRankResult(i) com feedback visual.

Beta 0.082
  - Strategy Tester: TF expandido''',
    1
)

# ── 3. Remove the single "APLICAR MELHOR CONFIGURAÇÃO" button from HTML ───────
OLD_APPLY_BTN_HTML = (
    '        <button class="dvl-st-apply" id="dvlSTApplyBest">&#10003; APLICAR MELHOR CONFIGURAÇÃO</button>\n'
    '      </div>\n'
    '    </div>'
)

NEW_APPLY_BTN_HTML = (
    '      </div>\n'
    '    </div>'
)

assert OLD_APPLY_BTN_HTML in html, "dvlSTApplyBest button HTML not found"
html = html.replace(OLD_APPLY_BTN_HTML, NEW_APPLY_BTN_HTML, 1)

# ── 4. Add CSS for per-card apply button ──────────────────────────────────────
OLD_RANK_CSS = ".dvl-st-apply{width:100%;height:35px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.25);border-radius:8px;color:#00d4ff;font-size:9px;font-weight:700;letter-spacing:.1em;cursor:pointer;margin-top:7px;text-transform:uppercase;transition:all .12s}\n.dvl-st-apply:hover{background:rgba(0,212,255,.12);border-color:#00d4ff}"

NEW_RANK_CSS = (
    ".dvl-st-apply{width:100%;height:35px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.25);border-radius:8px;color:#00d4ff;font-size:9px;font-weight:700;letter-spacing:.1em;cursor:pointer;margin-top:7px;text-transform:uppercase;transition:all .12s}\n"
    ".dvl-st-apply:hover{background:rgba(0,212,255,.12);border-color:#00d4ff}\n"
    ".dvl-st-applyrank{width:100%;padding:5px 0;margin-top:6px;font-size:8px;font-weight:700;letter-spacing:.08em;color:#5a8aaa;background:rgba(0,212,255,.03);border:1px solid rgba(0,212,255,.1);border-radius:5px;cursor:pointer;text-transform:uppercase;transition:all .12s}\n"
    ".dvl-st-applyrank:hover{color:#00d4ff;border-color:rgba(0,212,255,.32);background:rgba(0,212,255,.08)}\n"
    ".dvl-st-applyrank.applied{color:#00e676;border-color:rgba(0,220,100,.35);background:rgba(0,220,100,.06)}"
)

assert OLD_RANK_CSS in html, "dvl-st-apply CSS not found"
html = html.replace(OLD_RANK_CSS, NEW_RANK_CSS, 1)

# ── 5. Add APLICAR button to each card in _renderRanking ─────────────────────
OLD_RENDER_RANKING = (
    "    return '<div class=\"dvl-st-rank'+(i===0?' gold':'')+'\">'+"
    "\n      '<div class=\"dvl-st-rank-hdr\">'+"
    "\n      '<div class=\"dvl-st-rnum '+RANK_CLS[i]+'\">'+(i+1)+'</div>'+"
    "\n      '<div class=\"dvl-st-rcfg\">'+_cfgLabel(r.c)+'</div></div>'+"
    "\n      '<div class=\"dvl-st-rstats\">'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv neu\">'+r.trades+'</div><div class=\"dvl-st-rsl\">Trades</div></div>'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv '+wrc+'\">'+r.wr+'%</div><div class=\"dvl-st-rsl\">Win Rate</div></div>'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv '+pfc+'\">'+r.pf+'</div><div class=\"dvl-st-rsl\">PF</div></div>'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv '+rc+'\">'+r.ret+'%</div><div class=\"dvl-st-rsl\">Retorno</div></div>'+"
    "\n      '</div></div>';"
)

NEW_RENDER_RANKING = (
    "    return '<div class=\"dvl-st-rank'+(i===0?' gold':'')+'\">'+"
    "\n      '<div class=\"dvl-st-rank-hdr\">'+"
    "\n      '<div class=\"dvl-st-rnum '+RANK_CLS[i]+'\">'+(i+1)+'</div>'+"
    "\n      '<div class=\"dvl-st-rcfg\">'+_cfgLabel(r.c)+'</div></div>'+"
    "\n      '<div class=\"dvl-st-rstats\">'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv neu\">'+r.trades+'</div><div class=\"dvl-st-rsl\">Trades</div></div>'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv '+wrc+'\">'+r.wr+'%</div><div class=\"dvl-st-rsl\">Win Rate</div></div>'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv '+pfc+'\">'+r.pf+'</div><div class=\"dvl-st-rsl\">PF</div></div>'+"
    "\n      '<div class=\"dvl-st-rs\"><div class=\"dvl-st-rsv '+rc+'\">'+r.ret+'%</div><div class=\"dvl-st-rsl\">Retorno</div></div>'+"
    "\n      '</div>'+"
    "\n      '<button class=\"dvl-st-applyrank\" onclick=\"_applyRankResult('+i+')\">&#8627; APLICAR ESTA CONFIGURAÇÃO</button>'+"
    "\n      '</div>';"
)

assert OLD_RENDER_RANKING in html, "_renderRanking card template not found"
html = html.replace(OLD_RENDER_RANKING, NEW_RENDER_RANKING, 1)

# ── 6. Add _applyRankResult function + remove stale applyBtn / _origApplyBest handlers ──
OLD_APPLY_BEST_JS = (
    "var applyBtn=_g('dvlSTApplyBest');\n"
    "if(applyBtn){\n"
    "  applyBtn.addEventListener('click',function(){\n"
    "    if(!_bestCfgs.length)return;\n"
    "    var best=_bestCfgs[0];\n"
    "    try{var ws=_g('stWickSens');if(ws)ws.value=best.c.w;}catch(_){}\n"
    "    /* switch to backtest */\n"
    "    document.querySelectorAll('.dvl-st-tab').forEach(function(x){x.classList.remove('active');});\n"
    "    document.querySelectorAll('.dvl-st-tc').forEach(function(x){x.classList.remove('active');});\n"
    "    var bt=document.querySelector('.dvl-st-tab[data-sttab=\"backtest\"]');\n"
    "    if(bt)bt.classList.add('active');\n"
    "    var btc=_g('dvlSTTabBacktest');if(btc)btc.classList.add('active');\n"
    "    applyBtn.textContent='✓ CONFIGURAÇÃO APLICADA';\n"
    "    applyBtn.style.cssText='color:#00e676;border-color:rgba(0,220,100,.35)';\n"
    "    setTimeout(function(){applyBtn.textContent='✓ APLICAR MELHOR CONFIGURAÇÃO';applyBtn.style.cssText='';},2800);\n"
    "  });\n"
    "}"
)

NEW_APPLY_BEST_JS = (
    "/* apply any ranked result by index */\n"
    "function _applyRankResult(i){\n"
    "  if(!_bestCfgs[i])return;\n"
    "  _applyToHVNSignals(_bestCfgs[i].c||_bestCfgs[i].cfg||_bestCfgs[i]);\n"
    "  /* switch to backtest tab */\n"
    "  document.querySelectorAll('.dvl-st-tab').forEach(function(x){x.classList.remove('active');});\n"
    "  document.querySelectorAll('.dvl-st-tc').forEach(function(x){x.classList.remove('active');});\n"
    "  var bt=document.querySelector('.dvl-st-tab[data-sttab=\"backtest\"]');\n"
    "  if(bt)bt.classList.add('active');\n"
    "  var btc=_g('dvlSTTabBacktest');if(btc)btc.classList.add('active');\n"
    "  /* visual feedback on the clicked button */\n"
    "  var btns=document.querySelectorAll('.dvl-st-applyrank');\n"
    "  var btn=btns[i];\n"
    "  if(btn){\n"
    "    btn.classList.add('applied');\n"
    "    btn.textContent='✓ APLICADO';\n"
    "    setTimeout(function(){\n"
    "      if(btn){btn.classList.remove('applied');btn.innerHTML='&#8627; APLICAR ESTA CONFIGURAÇÃO';}\n"
    "    },2800);\n"
    "  }\n"
    "}"
)

assert OLD_APPLY_BEST_JS in html, "applyBtn JS block not found"
html = html.replace(OLD_APPLY_BEST_JS, NEW_APPLY_BEST_JS, 1)

# ── 7. Remove the stale "_origApplyBest" enhancer block ───────────────────────
OLD_ORIG_APPLY = (
    "/* ── Enhance optimizer apply-best to also update HVN Signals ── */\n"
    "var _origApplyBest=_g('dvlSTApplyBest');\n"
    "if(_origApplyBest){\n"
    "  var _origClick=_origApplyBest.onclick;\n"
    "  _origApplyBest.addEventListener('click',function(){\n"
    "    if(_bestCfgs.length){_applyToHVNSignals(_bestCfgs[0].c||_bestCfgs[0].cfg||_bestCfgs[0]);}\n"
    "  });\n"
    "}"
)

NEW_ORIG_APPLY = "/* _applyRankResult() handles per-card apply — no global apply-best button */"

assert OLD_ORIG_APPLY in html, "_origApplyBest block not found"
html = html.replace(OLD_ORIG_APPLY, NEW_ORIG_APPLY, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.083 applied')
