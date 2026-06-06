#!/usr/bin/env python3
"""patch_175.py — Beta 0.175: Remove TF 1s + mais histórico 15s/30s

1. Remove timeframe 1s da UI (pill bar, tfSelect, szTf, stTf, stOptTf).
   - 1s continua a existir internamente como fonte para agregação de 15s/30s.
   - isSyntheticSecTf, tfMs e WS subscription mantêm-se intactos.

2. Mais histórico para 15s e 30s:
   - fetchKlinesForTF: loop cap 10 → 50 iterações (cada uma = 1000 1s candles).
     50 iterações × 1000s = 50,000s de dados brutos:
       • 15s com initLim=2000: precisa 30,000s → 30 iters → 2000 candles (~8h)
       • 30s com initLim=1500: precisa 45,000s → 45 iters → 1500 candles (~12.5h)
   - _dvlInitLim(): 15s 1500→2000, 30s mantém 1500 (agora realmente atingível).

3. Limpeza: remove referências a 1s em _dvlInitLim, _dvlBatchLim e
   _dvlLoadOlderCandles (1s nunca foi selecionável como TF de batch).

Sem alterações de UI, layout, indicadores ou identidade visual.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.174') >= 10, f'Beta 0.174 not found (count={html.count("Beta 0.174")})'
html = html.replace('Beta 0.174', 'Beta 0.175')

# ── 1. fetchKlinesForTF: aumenta loop cap 10 → 50 ────────────────────────────
OLD_LOOP = 'for(let i=0;i<10&&end>start;i++){'
assert OLD_LOOP in html, 'fetchKlinesForTF loop cap anchor not found'
html = html.replace(OLD_LOOP, 'for(let i=0;i<50&&end>start;i++){', 1)

# ── 2. _dvlInitLim: remove 1s, aumenta 15s para 2000 ─────────────────────────
OLD_INIT_LIM = (
    'function _dvlInitLim(tf){\n'
    '  if(tf===\'1s\')return 1500;\n'
    '  if(tf===\'15s\'||tf===\'30s\')return 1500;\n'
    '  if(tf===\'1m\'||tf===\'3m\')return 2000;\n'
    '  if(tf===\'5m\')return 2500;\n'
    '  if(tf===\'15m\'||tf===\'30m\')return 3000;\n'
    '  if(tf===\'1h\'||tf===\'4h\')return 3000;\n'
    '  return 2000;\n'
    '}'
)
assert OLD_INIT_LIM in html, '_dvlInitLim anchor not found'
html = html.replace(OLD_INIT_LIM,
    'function _dvlInitLim(tf){\n'
    '  if(tf===\'15s\')return 2000;\n'
    '  if(tf===\'30s\')return 1500;\n'
    '  if(tf===\'1m\'||tf===\'3m\')return 2000;\n'
    '  if(tf===\'5m\')return 2500;\n'
    '  if(tf===\'15m\'||tf===\'30m\')return 3000;\n'
    '  if(tf===\'1h\'||tf===\'4h\')return 3000;\n'
    '  return 2000;\n'
    '}',
    1
)

# ── 3. _dvlBatchLim: remove 1s da guard ──────────────────────────────────────
OLD_BATCH = "  if(tf==='1s'||tf==='15s'||tf==='30s')return 1000;"
assert OLD_BATCH in html, '_dvlBatchLim 1s anchor not found'
html = html.replace(OLD_BATCH, "  if(tf==='15s'||tf==='30s')return 1000;", 1)

# ── 4. _dvlLoadOlderCandles: remove 1s da guard ──────────────────────────────
OLD_OLDER = "  if(tf==='1s'||tf==='15s'||tf==='30s'){"
assert OLD_OLDER in html, '_dvlLoadOlderCandles 1s anchor not found'
html = html.replace(OLD_OLDER, "  if(tf==='15s'||tf==='30s'){", 1)

# ── 5. tfSelect (hidden select) — remove option 1s ───────────────────────────
OLD_TF_SEL = '<option value="1s">1s</option><option value="15s">15s</option><option value="30s">30s</option>'
assert OLD_TF_SEL in html, 'tfSelect 1s option anchor not found'
html = html.replace(OLD_TF_SEL,
    '<option value="15s">15s</option><option value="30s">30s</option>',
    1
)

# ── 6. Pill bar — remove botão 1s ────────────────────────────────────────────
OLD_PILL_1S = '          <button class="tb-tf-pill tf" data-tf="1s">1s</button>\n'
assert OLD_PILL_1S in html, 'pill bar 1s button anchor not found'
html = html.replace(OLD_PILL_1S, '', 1)

# ── 7. szTf (Spike Zones TF) — remove option 1s ──────────────────────────────
OLD_SZTF = (
    '                <option value="1s">1s</option>\n'
    '                <option value="15s">15s</option>\n'
)
assert OLD_SZTF in html, 'szTf 1s option anchor not found'
html = html.replace(OLD_SZTF, '                <option value="15s">15s</option>\n', 1)

# ── 8. stTf (Strategy Tester) — remove option 1s ────────────────────────────
OLD_STTF = '<select class="dvl-st-sel" id="stTf"><option value="1s">1s</option><option value="15s">15s</option>'
assert OLD_STTF in html, 'stTf 1s option anchor not found'
html = html.replace(OLD_STTF,
    '<select class="dvl-st-sel" id="stTf"><option value="15s">15s</option>',
    1
)

# ── 9. stOptTf (Strategy Tester Optimize) — remove option 1s ────────────────
OLD_STOPT = (
    '            <option value="1s">1s</option>\n'
    '            <option value="15s">15s</option>\n'
    '            <option value="30s">30s</option>\n'
    '            <option value="1m">1m</option>\n'
    '            <option value="2m">2m</option>\n'
    '            <option value="5m" selected>5m</option>'
)
assert OLD_STOPT in html, 'stOptTf 1s option anchor not found'
html = html.replace(OLD_STOPT,
    '            <option value="15s">15s</option>\n'
    '            <option value="30s">30s</option>\n'
    '            <option value="1m">1m</option>\n'
    '            <option value="2m">2m</option>\n'
    '            <option value="5m" selected>5m</option>',
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_175.py applied — Beta 0.175')
print('  UI: TF 1s removido (pill bar + todos os selects)')
print('  Histórico 15s: initLim 1500→2000 candles (~8h)')
print('  Histórico 30s: initLim mantém 1500, agora atingível (loop cap 10→50)')
print('  Loop fetchKlinesForTF: max 50 iterações × 1000s = 50,000s de dados 1s brutos')
print('  Limpeza: _dvlInitLim/_dvlBatchLim/_dvlLoadOlderCandles sem referência a 1s')
