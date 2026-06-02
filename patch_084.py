#!/usr/bin/env python3
"""Beta 0.084 — Optimizer: fix _applyRankResult scope + auto-rodar backtest"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.083', 'Beta 0.084')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.084\n  - Optimizer: cada resultado do ranking tem seu próprio',
    '''Beta 0.084
  - Optimizer: fix crítico — _applyRankResult estava no escopo do IIFE,
    inacessível pelo onclick inline; migrado para data-ri + addEventListener.
  - Ao aplicar um resultado do Optimizer, o backtest roda automaticamente
    com a config escolhida e a aba Backtest rola para os resultados.

Beta 0.083
  - Optimizer: cada resultado do ranking tem seu próprio''',
    1
)

# ── 3. Fix _renderRanking: use data-ri instead of inline onclick ──────────────
OLD_RENDER_BTN = (
    "      '<button class=\"dvl-st-applyrank\" onclick=\"_applyRankResult('+i+')\">&#8627; APLICAR ESTA CONFIGURAÇÃO</button>'+"
    "\n      '</div>';"
)

NEW_RENDER_BTN = (
    "      '<button class=\"dvl-st-applyrank\" data-ri=\"'+i+'\">&#8627; APLICAR ESTA CONFIGURAÇÃO</button>'+"
    "\n      '</div>';"
)

assert OLD_RENDER_BTN in html, "_renderRanking button template not found"
html = html.replace(OLD_RENDER_BTN, NEW_RENDER_BTN, 1)

# ── 4. After setting rl.innerHTML, wire up listeners via data-ri ──────────────
OLD_RANK_WRAP = (
    "  rl.innerHTML=top.map(function(r,i){"
)

# We need to find the end of _renderRanking and add the listener wiring
# The function ends with:  rw.style.display='block'; }
OLD_RANK_END = (
    "  rw.style.display='block';\n"
    "}"
)

NEW_RANK_END = (
    "  rw.style.display='block';\n"
    "  /* wire per-card apply buttons — avoids global scope issues */\n"
    "  rl.querySelectorAll('.dvl-st-applyrank').forEach(function(btn){\n"
    "    btn.addEventListener('click',function(){\n"
    "      _applyRankResult(parseInt(btn.getAttribute('data-ri')));\n"
    "    });\n"
    "  });\n"
    "}"
)

# This string appears multiple times potentially, need to find the right one (in _renderRanking context)
# Let's anchor with the rw.style.display line near _renderRanking
OLD_RANK_SHOW = (
    "  rl.innerHTML=top.map(function(r,i){\n"
    "    var wrc=parseFloat(r.wr)>=60?'pos':(parseFloat(r.wr)>=50?'':'neg');\n"
    "    var pfc=parseFloat(r.pf)>=1.5?'pos':'';\n"
    "    var rc=parseFloat(r.ret)>=0?'pos':'neg';\n"
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
    "\n      '<button class=\"dvl-st-applyrank\" data-ri=\"'+i+'\">&#8627; APLICAR ESTA CONFIGURAÇÃO</button>'+"
    "\n      '</div>';\n"
    "  }).join('');\n"
    "  rw.style.display='block';\n"
    "}"
)

NEW_RANK_SHOW = (
    "  rl.innerHTML=top.map(function(r,i){\n"
    "    var wrc=parseFloat(r.wr)>=60?'pos':(parseFloat(r.wr)>=50?'':'neg');\n"
    "    var pfc=parseFloat(r.pf)>=1.5?'pos':'';\n"
    "    var rc=parseFloat(r.ret)>=0?'pos':'neg';\n"
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
    "\n      '<button class=\"dvl-st-applyrank\" data-ri=\"'+i+'\">&#8627; APLICAR ESTA CONFIGURAÇÃO</button>'+"
    "\n      '</div>';\n"
    "  }).join('');\n"
    "  rw.style.display='block';\n"
    "  /* wire per-card apply buttons — keeps _applyRankResult in IIFE scope */\n"
    "  rl.querySelectorAll('.dvl-st-applyrank').forEach(function(btn){\n"
    "    btn.addEventListener('click',function(){\n"
    "      _applyRankResult(parseInt(btn.getAttribute('data-ri')));\n"
    "    });\n"
    "  });\n"
    "}"
)

assert OLD_RANK_SHOW in html, "_renderRanking full block not found"
html = html.replace(OLD_RANK_SHOW, NEW_RANK_SHOW, 1)

# ── 5. Update _applyRankResult to auto-run the backtest after applying ─────────
OLD_APPLY_RANK = (
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

NEW_APPLY_RANK = (
    "function _applyRankResult(i){\n"
    "  if(!_bestCfgs[i])return;\n"
    "  var combo=_bestCfgs[i].c||_bestCfgs[i].cfg||_bestCfgs[i];\n"
    "  _applyToHVNSignals(combo);\n"
    "  /* switch to backtest tab */\n"
    "  document.querySelectorAll('.dvl-st-tab').forEach(function(x){x.classList.remove('active');});\n"
    "  document.querySelectorAll('.dvl-st-tc').forEach(function(x){x.classList.remove('active');});\n"
    "  var bt=document.querySelector('.dvl-st-tab[data-sttab=\"backtest\"]');\n"
    "  if(bt)bt.classList.add('active');\n"
    "  var btc=_g('dvlSTTabBacktest');if(btc)btc.classList.add('active');\n"
    "  /* auto-run the backtest so results appear immediately */\n"
    "  setTimeout(function(){\n"
    "    var runBtn=_g('dvlSTRunBT');\n"
    "    if(runBtn&&!runBtn.disabled)runBtn.click();\n"
    "  },120);\n"
    "  /* visual feedback on the clicked button */\n"
    "  var btns=document.querySelectorAll('.dvl-st-applyrank');\n"
    "  var btn=btns[i];\n"
    "  if(btn){\n"
    "    btn.classList.add('applied');\n"
    "    btn.textContent='✓ APLICADO';\n"
    "    setTimeout(function(){\n"
    "      if(btn){btn.classList.remove('applied');btn.innerHTML='&#8627; APLICAR ESTA CONFIGURA\xc7\xc3O';}\n"
    "    },2800);\n"
    "  }\n"
    "}"
)

assert OLD_APPLY_RANK in html, "_applyRankResult function not found"
html = html.replace(OLD_APPLY_RANK, NEW_APPLY_RANK, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.084 applied')
