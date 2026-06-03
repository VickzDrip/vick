#!/usr/bin/env python3
"""Beta 0.122 — Fix _syncAllFromCfg: trend/flow null e mapeamento para opções bothN

Causas raiz:
  1. cfg.trend = null → String(null) = 'null' → _setSelVal tenta 'null' → sem match
     → _setSelVal fallback: selectedIndex=0 (Desativado) — mas só quando havia valor antes
     Na prática: a condição `if(trend!==null)` com trend='null' (string) é TRUE,
     então tenta setar 'null' e fica em qualquer opção anterior.
  2. cfg.trend = 20 → tenta setar '20' em stFTrend, mas as opções são
     off/both5/both10/both20/both30 — sem match → fica na opção anterior.
  Resultado: Trend Clarity e DVL Flow NUNCA sincronizam corretamente ao aplicar combo.

Correção:
  - Adicionar helper _toThreshOpt(v) que converte valor numérico para opção bothN mais próxima
  - null/'null'/'off'/0 → 'off'
  - |v| ≤ 5  → 'both5'
  - |v| ≤ 10 → 'both10'
  - |v| ≤ 20 → 'both20'
  - |v| > 20 → 'both30'
  - Sempre setar stFTrend e stFFlow (removendo a guarda if(trend!==null))
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump (all 4 fields) ────────────────────────────────────────────
assert "var V='Beta 0.121';" in html
html = html.replace("var V='Beta 0.121';", "var V='Beta 0.122';", 1)

assert '<!-- DVL_STRATEGY_TESTER v0.121 -->' in html
html = html.replace('<!-- DVL_STRATEGY_TESTER v0.121 -->', '<!-- DVL_STRATEGY_TESTER v0.122 -->', 1)

assert 'window.DVL_APP_VERSION = "Beta 0.121";' in html
html = html.replace('window.DVL_APP_VERSION = "Beta 0.121";', 'window.DVL_APP_VERSION = "Beta 0.122";', 1)

assert '  const LOCAL_VERSION = "Beta 0.121";' in html
html = html.replace('  const LOCAL_VERSION = "Beta 0.121";', '  const LOCAL_VERSION = "Beta 0.122";', 1)

# scripts legados
for old, new in [
    ("try{ window.DVL_APP_VERSION='Beta 0.121'; }catch(_){}", "try{ window.DVL_APP_VERSION='Beta 0.122'; }catch(_){}"),
    ("b.textContent='Beta 0.121';});}catch(_){}", "b.textContent='Beta 0.122';});}catch(_){}"),
    ("const VERSION='Beta 0.121';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }",
     "const VERSION='Beta 0.122';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }"),
    ("const VERSION='Beta 0.121';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }",
     "const VERSION='Beta 0.122';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }"),
    ("window.DVL_APP_VERSION='Beta 0.121';", "window.DVL_APP_VERSION='Beta 0.122';"),
    ("if(b)b.textContent='Beta 0.121';", "if(b)b.textContent='Beta 0.122';"),
    ("const VERSION = 'Beta 0.121';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }",
     "const VERSION = 'Beta 0.122';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }"),
    ("var VERSION='Beta 0.121';\n  var KEYS=['flow','clarity'];",
     "var VERSION='Beta 0.122';\n  var KEYS=['flow','clarity'];"),
]:
    assert old in html, f'string not found: {old[:60]}'
    html = html.replace(old, new, 1)

# ── 2. HTML badge spans ────────────────────────────────────────────────────────
assert '>Beta 0.121</span>' in html
html = html.replace('>Beta 0.121</span>', '>Beta 0.122</span>', 2)

# ── 3. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.121\n  - Fix badge vers\xe3o: 10 scripts legados sobrescreviam DVL_APP_VERSION\n'
NEW_LOG = (
    'Beta 0.122\n'
    '  - Fix _syncAllFromCfg: trend/flow null e mapeamento num\xe9rico → bothN\n'
    '    (stFTrend/stFFlow agora sincronizam corretamente ao aplicar combo)\n'
    'Beta 0.121\n'
    '  - Fix badge vers\xe3o: 10 scripts legados sobrescreviam DVL_APP_VERSION\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 4. Fix _syncAllFromCfg: replace trend/flow sync block ─────────────────────
# Current code (broken):
#   var trend=cfg.trend!==undefined?String(cfg.trend):null;
#   var flow=cfg.flow!==undefined?String(cfg.flow):null;
#   ...
#   if(trend!==null)_setSelVal('stFTrend', trend);
#   if(flow!==null) _setSelVal('stFFlow',  flow);
#
# New code: use _toThreshOpt helper

OLD_SYNC_VARS = (
    '  var trend=cfg.trend!==undefined?String(cfg.trend):null;\n'
    '  var flow=cfg.flow!==undefined?String(cfg.flow):null;\n'
)
NEW_SYNC_VARS = (
    '  /* convert numeric threshold (10/-20/null) to nearest bothN option */\n'
    '  function _toThreshOpt(v){\n'
    '    if(v===null||v===undefined||v===\'off\'||v===\'null\'||v===\'0\'||v===0)return \'off\';\n'
    '    var n=Math.abs(parseFloat(v));if(isNaN(n)||n===0)return \'off\';\n'
    '    if(n<=5)return \'both5\';if(n<=10)return \'both10\';\n'
    '    if(n<=20)return \'both20\';return \'both30\';\n'
    '  }\n'
    '  var trend=cfg.trend!==undefined?_toThreshOpt(cfg.trend):null;\n'
    '  var flow=cfg.flow!==undefined?_toThreshOpt(cfg.flow):null;\n'
)
assert OLD_SYNC_VARS in html, 'trend/flow var block not found'
html = html.replace(OLD_SYNC_VARS, NEW_SYNC_VARS, 1)

# Fix the if-guards: always set when the field is defined (null → 'off' is now handled)
OLD_TREND_SET = (
    '  if(trend!==null)_setSelVal(\'stFTrend\', trend);\n'
    '  if(flow!==null) _setSelVal(\'stFFlow\',  flow);\n'
)
NEW_TREND_SET = (
    '  _setSelVal(\'stFTrend\', trend||\'off\');\n'
    '  _setSelVal(\'stFFlow\',  flow||\'off\');\n'
)
assert OLD_TREND_SET in html, 'trend/flow setSelVal block not found'
html = html.replace(OLD_TREND_SET, NEW_TREND_SET, 1)

# Also fix indicator sync (same pattern, keep as-is since hvnSig fields may accept other values)
# The indicator sync uses if(trend!==null) for hvnSigClarity/hvnSigFlow — leave those alone

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.122 applied')
