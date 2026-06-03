#!/usr/bin/env python3
"""Beta 0.123 — _syncAllFromCfg: sincronizar checkboxes ao aplicar combo

Causa raiz:
  _syncAllFromCfg nunca atualizava os checkboxes stRuleWick / stRuleClose / stRuleCons.
  Resultado: "Fechamento fora da zona" ficava desmarcado mesmo o combo usando close:'outside'.

  CLOSE_LABELS = {outside:'Fech. fora da zona', mid:'Fech. além do meio', strong:'Corpo forte'}
  → qualquer combo HVN sempre tem um close → stRuleClose deve ficar marcado.
  → stRuleWick: todos os combos HVN usam rejeição de pavio → sempre marcado.
  → stRuleCons: cons > 3 (muitos candles laterais permitidos) → marcado; ≤ 3 → desmarcado.

Correção:
  Adicionar sync de checkboxes no final do bloco backtest form fields de _syncAllFromCfg.
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump (todos os campos) ─────────────────────────────────────────
BUMPS = [
    ("var V='Beta 0.122';",                          "var V='Beta 0.123';"),
    ('<!-- DVL_STRATEGY_TESTER v0.122 -->',           '<!-- DVL_STRATEGY_TESTER v0.123 -->'),
    ('window.DVL_APP_VERSION = "Beta 0.122";',        'window.DVL_APP_VERSION = "Beta 0.123";'),
    ('  const LOCAL_VERSION = "Beta 0.122";',         '  const LOCAL_VERSION = "Beta 0.123";'),
    ("try{ window.DVL_APP_VERSION='Beta 0.122'; }catch(_){}",
     "try{ window.DVL_APP_VERSION='Beta 0.123'; }catch(_){}"),
    ("b.textContent='Beta 0.122';});}catch(_){}",
     "b.textContent='Beta 0.123';});}catch(_){}"),
    ("const VERSION='Beta 0.122';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }",
     "const VERSION='Beta 0.123';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }"),
    ("const VERSION='Beta 0.122';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }",
     "const VERSION='Beta 0.123';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }"),
    ("window.DVL_APP_VERSION='Beta 0.122';",          "window.DVL_APP_VERSION='Beta 0.123';"),
    ("if(b)b.textContent='Beta 0.122';",              "if(b)b.textContent='Beta 0.123';"),
    ("const VERSION = 'Beta 0.122';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }",
     "const VERSION = 'Beta 0.123';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }"),
    ("var VERSION='Beta 0.122';\n  var KEYS=['flow','clarity'];",
     "var VERSION='Beta 0.123';\n  var KEYS=['flow','clarity'];"),
]
for old, new in BUMPS:
    assert old in html, f'not found: {old[:60]}'
    html = html.replace(old, new, 1)

# HTML badge spans (2 occurrences)
assert html.count('>Beta 0.122</span>') == 2, 'expected 2 badge spans'
html = html.replace('>Beta 0.122</span>', '>Beta 0.123</span>', 2)

# ── 2. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.122\n  - Fix _syncAllFromCfg: trend/flow null e mapeamento num\xe9rico → bothN\n'
NEW_LOG = (
    'Beta 0.123\n'
    '  - _syncAllFromCfg: sincroniza checkboxes stRuleWick/stRuleClose/stRuleCons\n'
    '    ao aplicar combo (Fechamento fora da zona agora marcado corretamente)\n'
    'Beta 0.122\n'
    '  - Fix _syncAllFromCfg: trend/flow null e mapeamento num\xe9rico → bothN\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Add checkbox sync in _syncAllFromCfg ───────────────────────────────────
# Insert after the trendFilter sync block, before "update S.settings"
OLD_BEFORE_SETTINGS = (
    '  /* trendFilter → stTBFilterMode (add/sub/off) */\n'
    '  if(cfg.trendFilter!==undefined&&cfg.trendFilter!==null)\n'
    '    _setSelVal(\'stTBFilterMode\',cfg.trendFilter);\n'
    '\n'
    '  /* update S.settings */\n'
)
NEW_BEFORE_SETTINGS = (
    '  /* trendFilter → stTBFilterMode (add/sub/off) */\n'
    '  if(cfg.trendFilter!==undefined&&cfg.trendFilter!==null)\n'
    '    _setSelVal(\'stTBFilterMode\',cfg.trendFilter);\n'
    '\n'
    '  /* sync checkboxes */\n'
    '  (function(){\n'
    '    var _ckW=document.getElementById(\'stRuleWick\');\n'
    '    var _ckC=document.getElementById(\'stRuleClose\');\n'
    '    var _ckCons=document.getElementById(\'stRuleCons\');\n'
    '    /* all HVN combos use wick rejection */\n'
    '    if(_ckW)_ckW.checked=true;\n'
    '    /* close field: outside/mid/strong → fechamento fora da zona */\n'
    '    if(_ckC)_ckC.checked=!!(cfg.close&&cfg.close!==\'off\');\n'
    '    /* consolidação: cons > 3 candles = permite lateralização */\n'
    '    if(_ckCons)_ckCons.checked=(parseInt(cfg.cons)||0)>3;\n'
    '  })();\n'
    '\n'
    '  /* update S.settings */\n'
)
assert OLD_BEFORE_SETTINGS in html, 'trendFilter/settings anchor not found'
html = html.replace(OLD_BEFORE_SETTINGS, NEW_BEFORE_SETTINGS, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.123 applied')
