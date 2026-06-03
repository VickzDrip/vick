#!/usr/bin/env python3
"""Beta 0.115 — Strategy Tester: conexão real HVN Signals, Signals loaded, mensagens REAL/DEMO"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ───────────────────────────────────────────────────────────
html = html.replace('Beta 0.114', 'Beta 0.115')

# ── 2. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = ('Beta 0.115\n'
           '  - Strategy Tester estabiliza\xe7\xe3o:\n')
NEW_LOG = ('Beta 0.115\n'
           '  - Strategy Tester: conex\xe3o real com HVN Signals\n'
           '    \xb7 Contador "Signals loaded: X" vis\xedvel no painel\n'
           '    \xb7 REAL DATA mostra: "Backtest usando sinais reais do HVN Signals."\n'
           '    \xb7 DEMO DATA mostra: "Sem sinais reais carregados. Resultados simulados."\n'
           '    \xb7 Badge reexibido automaticamente a cada execu\xe7\xe3o do backtest\n'
           '    \xb7 Coment\xe1rio DVL_STRATEGY_TESTER atualizado para v0.115\n'
           '  - Strategy Tester estabiliza\xe7\xe3o:\n')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. version comment on the panel HTML ─────────────────────────────────────
OLD_CMT = '<!-- DVL_STRATEGY_TESTER v0.072 -->'
NEW_CMT = '<!-- DVL_STRATEGY_TESTER v0.115 -->'
assert OLD_CMT in html, 'DVL_STRATEGY_TESTER comment not found'
html = html.replace(OLD_CMT, NEW_CMT, 1)

# ── 4. dvlSTDetNote: change initial placeholder text to PT ────────────────────
OLD_NOTE_HTML = ('>Results are deterministic for the selected parameters.</div>')
NEW_NOTE_HTML = ('>Execute o backtest para ver a fonte dos dados.</div>')
assert OLD_NOTE_HTML in html, 'dvlSTDetNote placeholder text not found'
html = html.replace(OLD_NOTE_HTML, NEW_NOTE_HTML, 1)

# ── 5. add dvlSTSigStatus div before RODAR BACKTEST button ────────────────────
OLD_RUN_BTN = ('      <button class="dvl-st-run" id="dvlSTRunBT">\n'
               '        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">'
               '<polygon points="5,3 19,12 5,21"/></svg>\n'
               '        RODAR BACKTEST\n'
               '      </button>')
NEW_RUN_BTN = ('      <div id="dvlSTSigStatus" style="font-size:8px;color:#344a62;margin:2px 0;'
               'letter-spacing:.02em">Signals loaded: —</div>\n'
               '      <button class="dvl-st-run" id="dvlSTRunBT">\n'
               '        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">'
               '<polygon points="5,3 19,12 5,21"/></svg>\n'
               '        RODAR BACKTEST\n'
               '      </button>')
assert OLD_RUN_BTN in html, 'RODAR BACKTEST button not found'
html = html.replace(OLD_RUN_BTN, NEW_RUN_BTN, 1)

# ── 6. add _updateSigStatus() helper after close() ───────────────────────────
OLD_CLOSE = ('function close(){\n'
             '  if(!panel)return;\n'
             '  panel.classList.remove(\'show\');\n'
             '  if(scrim)scrim.classList.remove(\'show\');\n'
             '  if(rpBtn)rpBtn.classList.remove(\'active\');\n'
             '}\n'
             '\n'
             '/* live stats auto-refresh */')
NEW_CLOSE = ('function close(){\n'
             '  if(!panel)return;\n'
             '  panel.classList.remove(\'show\');\n'
             '  if(scrim)scrim.classList.remove(\'show\');\n'
             '  if(rpBtn)rpBtn.classList.remove(\'active\');\n'
             '}\n'
             '\n'
             'function _updateSigStatus(){\n'
             '  var el=_g(\'dvlSTSigStatus\');if(!el)return;\n'
             '  var cnt=(window.S&&window.S.hvnSignals)?'
             'window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}).length:0;\n'
             '  el.textContent=\'Signals loaded: \'+cnt;\n'
             '  el.style.color=cnt>0?\'rgba(0,200,100,.7)\':\'#344a62\';\n'
             '}\n'
             '\n'
             '/* live stats auto-refresh */')
assert OLD_CLOSE in html, 'close() function block not found'
html = html.replace(OLD_CLOSE, NEW_CLOSE, 1)

# ── 7. call _updateSigStatus() when panel opens ───────────────────────────────
OLD_OPEN_END = ('  _syncLiveStats();\n'
                '}\n'
                'function close(){')
NEW_OPEN_END = ('  _updateSigStatus();\n'
                '  _syncLiveStats();\n'
                '}\n'
                'function close(){')
assert OLD_OPEN_END in html, 'open() end / _syncLiveStats call not found'
html = html.replace(OLD_OPEN_END, NEW_OPEN_END, 1)

# ── 8. replace badge update block with full REAL/DEMO notes logic ─────────────
OLD_BADGE = ('      /* update data badge */\n'
             '      var db=_g(\'dvlSTDataBadge\');\n'
             '      if(db){if(res.isReal){db.textContent=\'REAL DATA\';'
             'db.style.background=\'rgba(0,200,100,.08)\';db.style.color=\'#00c864\';'
             'db.style.borderColor=\'rgba(0,200,100,.25)\';}else{db.textContent=\'DEMO DATA\';'
             'db.style.background=\'rgba(255,180,0,.1)\';db.style.color=\'#ffb400\';'
             'db.style.borderColor=\'rgba(255,180,0,.28)\';}}\n')
NEW_BADGE = ('      /* update data badge + data source note */\n'
             '      _updateSigStatus();\n'
             '      var db=_g(\'dvlSTDataBadge\'),dn=_g(\'dvlSTDetNote\');\n'
             '      var _sCnt=(window.S&&window.S.hvnSignals)?'
             'window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}).length:0;\n'
             '      if(db){\n'
             '        db.style.display=\'inline-flex\';\n'
             '        if(res.isReal){'
             'db.textContent=\'REAL DATA\';db.style.background=\'rgba(0,200,100,.08)\';'
             'db.style.color=\'#00c864\';db.style.borderColor=\'rgba(0,200,100,.25)\';}\n'
             '        else{db.textContent=\'DEMO DATA\';db.style.background=\'rgba(255,180,0,.1)\';'
             'db.style.color=\'#ffb400\';db.style.borderColor=\'rgba(255,180,0,.28)\';}\n'
             '      }\n'
             '      if(dn){\n'
             '        dn.style.display=\'\';\n'
             '        if(res.isReal){'
             'dn.textContent=\'Backtest usando sinais reais do HVN Signals. Signals loaded: \'+_sCnt;'
             'dn.style.color=\'rgba(0,200,100,.8)\';}\n'
             '        else{dn.textContent=_sCnt>0?\'Signals loaded: \'+_sCnt'
             '+\' — configura\xe7\xe3o n\xe3o corresponde.\':\''
             'Sem sinais reais carregados. Resultados simulados.\';'
             'dn.style.color=\'rgba(255,180,0,.7)\';}\n'
             '      }\n')
assert OLD_BADGE in html, 'badge update block not found'
html = html.replace(OLD_BADGE, NEW_BADGE, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.115 applied')
