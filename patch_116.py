#!/usr/bin/env python3
"""Beta 0.116 — Strategy Tester real-only: sem fallback mock, filtro de período, Live Stats dinâmico"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ───────────────────────────────────────────────────────────
html = html.replace('Beta 0.115', 'Beta 0.116')

# ── 2. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = ('Beta 0.116\n'
           '  - Strategy Tester: conex\xe3o real com HVN Signals\n')
NEW_LOG = ('Beta 0.116\n'
           '  - Strategy Tester real-only:\n'
           '    \xb7 Sem sinais reais = sem backtest. Bot\xe3o bloqueado com mensagem clara.\n'
           '    \xb7 Sem fallback mock. _backtest usa s\xf3 dados reais.\n'
           '    \xb7 Filtro de per\xedodo real (7d/30d/90d/custom) aplicado nos sinais.\n'
           '    \xb7 Badge: SEM SINAIS (vermelho) | REAL DATA (verde). DEMO DATA removido.\n'
           '    \xb7 Optimizer bloqueado se Signals loaded = 0.\n'
           '    \xb7 Live Stats din\xe2mico: \xfaltimo sinal real, contador de hoje.\n'
           '    \xb7 computeHVNSignals: idx, rejectionType descritivo, price nas zonas.\n'
           '    \xb7 Auto-atualiza contador ao recomputar HVN Signals.\n'
           '  - Strategy Tester: conex\xe3o real com HVN Signals\n')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. button click: guard — block if no real signals ────────────────────────
OLD_BTN_START = ('  btBtn.addEventListener(\'click\',function(){\n'
                 '    btBtn.disabled=true;\n'
                 '    btBtn.innerHTML=\'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                 'stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg>'
                 ' CALCULANDO...\';')
NEW_BTN_START = ('  btBtn.addEventListener(\'click\',function(){\n'
                 '    /* guard: require real HVN signals */\n'
                 '    var _gnCnt=(window.S&&window.S.hvnSignals)?\n'
                 '      window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}).length:0;\n'
                 '    if(_gnCnt===0){\n'
                 '      var _res0=_g(\'dvlSTResults\'),_db0=_g(\'dvlSTDataBadge\'),_dn0=_g(\'dvlSTDetNote\');\n'
                 '      if(_res0)_res0.style.display=\'block\';\n'
                 '      if(_db0){_db0.style.display=\'inline-flex\';_db0.textContent=\'SEM SINAIS\';\n'
                 '        _db0.style.background=\'rgba(255,77,106,.08)\';\n'
                 '        _db0.style.color=\'#ff4d6a\';_db0.style.borderColor=\'rgba(255,77,106,.25)\';}\n'
                 '      if(_dn0){_dn0.style.display=\'\';\n'
                 '        _dn0.textContent=\'Nenhum sinal real carregado. Ative o HVN Signals e aguarde sinais no gr\xe1fico para rodar o backtest real.\';\n'
                 '        _dn0.style.color=\'rgba(255,77,106,.8)\';}\n'
                 '      _updateSigStatus();return;\n'
                 '    }\n'
                 '    btBtn.disabled=true;\n'
                 '    btBtn.innerHTML=\'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                 'stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg>'
                 ' CALCULANDO...\';')
assert OLD_BTN_START in html, 'btBtn click start not found'
html = html.replace(OLD_BTN_START, NEW_BTN_START, 1)

# ── 4+5. button: _cachedBacktest → _backtestReal + null guard + badge ─────────
OLD_RES_BLOCK = ('      var res=_cachedBacktest(cfg);\n'
                 '      _renderResults(res);\n'
                 '      /* update data badge + data source note */\n'
                 '      _updateSigStatus();\n'
                 '      var db=_g(\'dvlSTDataBadge\'),dn=_g(\'dvlSTDetNote\');\n'
                 '      var _sCnt=(window.S&&window.S.hvnSignals)?window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}).length:0;\n'
                 '      if(db){\n'
                 '        db.style.display=\'inline-flex\';\n'
                 '        if(res.isReal){db.textContent=\'REAL DATA\';db.style.background=\'rgba(0,200,100,.08)\';db.style.color=\'#00c864\';db.style.borderColor=\'rgba(0,200,100,.25)\';}\n'
                 '        else{db.textContent=\'DEMO DATA\';db.style.background=\'rgba(255,180,0,.1)\';db.style.color=\'#ffb400\';db.style.borderColor=\'rgba(255,180,0,.28)\';}\n'
                 '      }\n'
                 '      if(dn){\n'
                 '        dn.style.display=\'\';\n'
                 '        if(res.isReal){dn.textContent=\'Backtest usando sinais reais do HVN Signals. Signals loaded: \'+_sCnt;dn.style.color=\'rgba(0,200,100,.8)\';}\n'
                 '        else{dn.textContent=_sCnt>0?\'Signals loaded: \'+_sCnt+\' — configura\xe7\xe3o n\xe3o corresponde.\':\'Sem sinais reais carregados. Resultados simulados.\';dn.style.color=\'rgba(255,180,0,.7)\';}\n'
                 '      }')
NEW_RES_BLOCK = ('      var res=_backtestReal(cfg);\n'
                 '      if(!res||!res.trades){\n'
                 '        var _rbn=_g(\'dvlSTResults\'),_dbn=_g(\'dvlSTDataBadge\'),_dnn=_g(\'dvlSTDetNote\');\n'
                 '        if(_rbn)_rbn.style.display=\'block\';\n'
                 '        if(_dbn){_dbn.style.display=\'inline-flex\';_dbn.textContent=\'SEM TRADES\';\n'
                 '          _dbn.style.background=\'rgba(255,180,0,.1)\';\n'
                 '          _dbn.style.color=\'#ffb400\';_dbn.style.borderColor=\'rgba(255,180,0,.28)\';}\n'
                 '        if(_dnn){_dnn.style.display=\'\';\n'
                 '          _dnn.textContent=\'Nenhum trade encontrado no per\xedodo selecionado. Ajuste o per\xedodo ou verifique os filtros.\';\n'
                 '          _dnn.style.color=\'rgba(255,180,0,.7)\';}\n'
                 '        btBtn.disabled=false;\n'
                 '        btBtn.innerHTML=\'<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">'
                 '<polygon points="5,3 19,12 5,21"/></svg> RODAR BACKTEST\';\n'
                 '        _updateSigStatus();return;\n'
                 '      }\n'
                 '      _renderResults(res);\n'
                 '      var _sCnt2=(window.S&&window.S.hvnSignals)?\n'
                 '        window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}).length:0;\n'
                 '      var db=_g(\'dvlSTDataBadge\'),dn=_g(\'dvlSTDetNote\');\n'
                 '      if(db){db.style.display=\'inline-flex\';db.textContent=\'REAL DATA\';\n'
                 '        db.style.background=\'rgba(0,200,100,.08)\';\n'
                 '        db.style.color=\'#00c864\';db.style.borderColor=\'rgba(0,200,100,.25)\';}\n'
                 '      if(dn){dn.style.display=\'\';\n'
                 '        dn.textContent=\'Backtest usando sinais reais do HVN Signals. Signals loaded: \'+_sCnt2;\n'
                 '        dn.style.color=\'rgba(0,200,100,.8)\';}\n'
                 '      _updateSigStatus();')
assert OLD_RES_BLOCK in html, 'result/badge block not found'
html = html.replace(OLD_RES_BLOCK, NEW_RES_BLOCK, 1)

# ── 6. _backtestReal: add period filter ───────────────────────────────────────
OLD_PERIOD = ('    var maxCandles=40;\n'
              '    var trades=[],eq=[100];\n'
              '    signals.forEach(function(sig){\n'
              '      if(!sig||!sig.entryPrice)return;\n'
              '      var entry=sig.entryPrice;')
NEW_PERIOD = ('    var maxCandles=40;\n'
              '    /* period filter — auto-detect timestamp unit */\n'
              '    var _refT=candles[candles.length-1].t||0;\n'
              '    var _tScale=_refT>9999999999?1:1000; /* 1=ms, 1000=s */\n'
              '    var _ftFrom=0,_ftTo=Infinity;\n'
              '    if(cfg.dateFrom&&cfg.dateTo){\n'
              '      _ftFrom=new Date(cfg.dateFrom).getTime()/(_tScale===1?1:1000);\n'
              '      _ftTo=(new Date(cfg.dateTo).getTime()+86400000)/(_tScale===1?1:1000);\n'
              '    }else if(cfg.period){\n'
              '      var _pdSec=Math.max(1,parseInt(cfg.period)||30)*86400;\n'
              '      _ftTo=_refT;_ftFrom=_refT-(_tScale===1?_pdSec*1000:_pdSec);\n'
              '    }\n'
              '    var trades=[],eq=[100];\n'
              '    signals.forEach(function(sig){\n'
              '      if(!sig||!sig.entryPrice)return;\n'
              '      if(_ftFrom>0&&(sig.timestamp<_ftFrom||sig.timestamp>_ftTo))return;\n'
              '      var entry=sig.entryPrice;')
assert OLD_PERIOD in html, '_backtestReal period filter anchor not found'
html = html.replace(OLD_PERIOD, NEW_PERIOD, 1)

# ── 7. optimizer: guard if no real signals ────────────────────────────────────
OLD_OPT_START = ('function _runOptimizer(){\n'
                 '  var bar=_g(\'dvlSTOptBar\'),prog=_g(\'dvlSTOptProg\'),status=_g(\'dvlSTOptStatus\');\n'
                 '  var rw=_g(\'dvlSTRankWrap\'),rl=_g(\'dvlSTRankList\'),runBtn=_g(\'dvlSTRunOpt\');\n'
                 '  if(!runBtn)return;\n'
                 '  runBtn.disabled=true;')
NEW_OPT_START = ('function _runOptimizer(){\n'
                 '  /* guard: require real signals */\n'
                 '  var _optSigCnt=(window.S&&window.S.hvnSignals)?\n'
                 '    window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}).length:0;\n'
                 '  if(_optSigCnt===0){\n'
                 '    var _ost=_g(\'dvlSTOptStatus\');\n'
                 '    if(_ost){_ost.style.color=\'#ff4d6a\';\n'
                 '      _ost.textContent=\'Optimizer precisa de sinais reais. Ative o HVN Signals e aguarde sinais no gr\xe1fico.\';}\n'
                 '    return;\n'
                 '  }\n'
                 '  var bar=_g(\'dvlSTOptBar\'),prog=_g(\'dvlSTOptProg\'),status=_g(\'dvlSTOptStatus\');\n'
                 '  var rw=_g(\'dvlSTRankWrap\'),rl=_g(\'dvlSTRankList\'),runBtn=_g(\'dvlSTRunOpt\');\n'
                 '  if(!runBtn)return;\n'
                 '  runBtn.disabled=true;')
assert OLD_OPT_START in html, '_runOptimizer start not found'
html = html.replace(OLD_OPT_START, NEW_OPT_START, 1)

# ── 8. optimizer batch: guard null result ─────────────────────────────────────
OLD_OPT_PUSH = ('      results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});\n'
                '      done++;')
NEW_OPT_PUSH = ('      if(r)results.push({c:c,trades:r.trades,wr:r.wr,pf:r.pf,ret:r.ret,dd:r.dd});\n'
                '      done++;')
assert OLD_OPT_PUSH in html, 'optimizer results.push not found'
html = html.replace(OLD_OPT_PUSH, NEW_OPT_PUSH, 1)

# ── 9. Live Stats HTML: add IDs, dynamic defaults ────────────────────────────
OLD_LS_HTML = ('      <div class="dvl-st-sl">ÚLTIMO SINAL</div>\n'
               '      <div class="dvl-st-lsig">\n'
               '        <div class="dvl-st-lsig-hdr">\n'
               '          <span class="dvl-st-lsig-dir short">SHORT</span>\n'
               '          <span class="dvl-st-lsig-type">Resistance rejection \xb7 HVN Signals</span>\n'
               '          <span class="dvl-st-lsig-status">Em acompanhamento</span>\n'
               '        </div>\n'
               '        <div class="dvl-st-lkv">\n'
               '          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v">5m</div>'
               '<div class="dvl-st-lkv-l">Timeframe</div></div>\n'
               '          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v" id="dvlSTLivePrice">—</div>'
               '<div class="dvl-st-lkv-l">Entrada</div></div>\n'
               '          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v">73.4k</div>'
               '<div class="dvl-st-lkv-l">Zona HVN</div></div>\n'
               '        </div>\n'
               '      </div>\n'
               '      <div class="dvl-st-sl">HOJE</div>\n'
               '      <div class="dvl-st-cards6" style="grid-template-columns:repeat(3,1fr)">\n'
               '        <div class="dvl-st-card"><div class="dvl-st-cv neu">7</div>'
               '<div class="dvl-st-cl">Sinais</div></div>\n'
               '        <div class="dvl-st-card"><div class="dvl-st-cv pos">57%</div>'
               '<div class="dvl-st-cl">Win Rate</div></div>\n'
               '        <div class="dvl-st-card"><div class="dvl-st-cv pos">1.38</div>'
               '<div class="dvl-st-cl">Prof. Factor</div></div>\n'
               '      </div>')
NEW_LS_HTML = ('      <div class="dvl-st-sl">ÚLTIMO SINAL</div>\n'
               '      <div class="dvl-st-lsig">\n'
               '        <div class="dvl-st-lsig-hdr">\n'
               '          <span class="dvl-st-lsig-dir" id="dvlSTLastDir">—</span>\n'
               '          <span class="dvl-st-lsig-type" id="dvlSTLastType">Nenhum sinal real detectado ainda.</span>\n'
               '          <span class="dvl-st-lsig-status" id="dvlSTLastStatus"></span>\n'
               '        </div>\n'
               '        <div class="dvl-st-lkv">\n'
               '          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v" id="dvlSTLastTF">—</div>'
               '<div class="dvl-st-lkv-l">Timeframe</div></div>\n'
               '          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v" id="dvlSTLivePrice">—</div>'
               '<div class="dvl-st-lkv-l">Entrada</div></div>\n'
               '          <div class="dvl-st-lkv-i"><div class="dvl-st-lkv-v" id="dvlSTLastZone">—</div>'
               '<div class="dvl-st-lkv-l">Zona HVN</div></div>\n'
               '        </div>\n'
               '      </div>\n'
               '      <div class="dvl-st-sl">HOJE</div>\n'
               '      <div class="dvl-st-cards6" style="grid-template-columns:repeat(3,1fr)">\n'
               '        <div class="dvl-st-card"><div class="dvl-st-cv neu" id="dvlSTTodaySig">—</div>'
               '<div class="dvl-st-cl">Sinais</div></div>\n'
               '        <div class="dvl-st-card"><div class="dvl-st-cv neu" id="dvlSTTodayWR">—</div>'
               '<div class="dvl-st-cl">Win Rate</div></div>\n'
               '        <div class="dvl-st-card"><div class="dvl-st-cv neu" id="dvlSTTodayPF">—</div>'
               '<div class="dvl-st-cl">Prof. Factor</div></div>\n'
               '      </div>')
assert OLD_LS_HTML in html, 'Live Stats HTML block not found'
html = html.replace(OLD_LS_HTML, NEW_LS_HTML, 1)

# ── 10. _syncLiveStats: make dynamic with real signal data ────────────────────
OLD_LIVE = ('function _syncLiveStats(){\n'
            '  try{\n'
            '    var prEl=_g(\'dvlSTLivePrice\');\n'
            '    if(prEl){\n'
            '      var p=window.S&&window.S.candles&&window.S.candles.length?window.S.candles[window.S.candles.length-1].c:null;\n'
            '      if(p)prEl.textContent=p>999?p.toFixed(0):p.toFixed(2);\n'
            '    }\n'
            '    var clarEl=_g(\'dvlSTMktTrend\');\n'
            '    if(clarEl){\n'
            '      var cv=window.__dvlClarNow;\n'
            '      if(cv!=null&&!isNaN(cv)){\n'
            '        clarEl.textContent=(cv>=0?\'+\':\'\')+Math.round(cv);\n'
            '        clarEl.className=\'dvl-st-dv\'+(cv>=25?\' pos\':cv<=-25?\' neg\':\'\');\n'
            '      }\n'
            '    }\n'
            '    var flowEl=_g(\'dvlSTMktFlow\');\n'
            '    if(flowEl){\n'
            '      var fv=window.__dvlFlowNow;\n'
            '      if(fv!=null&&!isNaN(fv)){\n'
            '        flowEl.textContent=(fv>=0?\'+\':\'\')+Math.round(fv);\n'
            '        flowEl.className=\'dvl-st-dv\'+(fv>=20?\' pos\':fv<=-20?\' neg\':\'\');\n'
            '      }\n'
            '    }\n'
            '  }catch(_){}\n'
            '}')
NEW_LIVE = ('function _syncLiveStats(){\n'
            '  try{\n'
            '    var prEl=_g(\'dvlSTLivePrice\');\n'
            '    if(prEl){\n'
            '      var p=window.S&&window.S.candles&&window.S.candles.length?window.S.candles[window.S.candles.length-1].c:null;\n'
            '      if(p)prEl.textContent=p>999?p.toFixed(0):p.toFixed(2);\n'
            '    }\n'
            '    var clarEl=_g(\'dvlSTMktTrend\');\n'
            '    if(clarEl){\n'
            '      var cv=window.__dvlClarNow;\n'
            '      if(cv!=null&&!isNaN(cv)){\n'
            '        clarEl.textContent=(cv>=0?\'+\':\'\')+Math.round(cv);\n'
            '        clarEl.className=\'dvl-st-dv\'+(cv>=25?\' pos\':cv<=-25?\' neg\':\'\');\n'
            '      }\n'
            '    }\n'
            '    var flowEl=_g(\'dvlSTMktFlow\');\n'
            '    if(flowEl){\n'
            '      var fv=window.__dvlFlowNow;\n'
            '      if(fv!=null&&!isNaN(fv)){\n'
            '        flowEl.textContent=(fv>=0?\'+\':\'\')+Math.round(fv);\n'
            '        flowEl.className=\'dvl-st-dv\'+(fv>=20?\' pos\':fv<=-20?\' neg\':\'\');\n'
            '      }\n'
            '    }\n'
            '    /* last real signal + today count */\n'
            '    var _sigs=window.S&&window.S.hvnSignals?\n'
            '      window.S.hvnSignals.filter(function(s){return s&&s.entryPrice;}):[];\n'
            '    var _dEl=_g(\'dvlSTLastDir\'),_tEl=_g(\'dvlSTLastType\'),_sEl=_g(\'dvlSTLastStatus\');\n'
            '    var _tfEl=_g(\'dvlSTLastTF\'),_znEl=_g(\'dvlSTLastZone\');\n'
            '    var _sgEl=_g(\'dvlSTTodaySig\'),_wrEl=_g(\'dvlSTTodayWR\'),_pfEl=_g(\'dvlSTTodayPF\');\n'
            '    if(_sigs.length===0){\n'
            '      if(_dEl){_dEl.textContent=\'—\';_dEl.className=\'dvl-st-lsig-dir\';}\n'
            '      if(_tEl)_tEl.textContent=\'Nenhum sinal real detectado ainda.\';\n'
            '      if(_sEl)_sEl.textContent=\'\';\n'
            '      if(_tfEl)_tfEl.textContent=\'—\';\n'
            '      if(_znEl)_znEl.textContent=\'—\';\n'
            '      if(_sgEl)_sgEl.textContent=\'0\';\n'
            '      if(_wrEl)_wrEl.textContent=\'—\';\n'
            '      if(_pfEl)_pfEl.textContent=\'—\';\n'
            '    }else{\n'
            '      var _ls=_sigs[_sigs.length-1];\n'
            '      if(_dEl){_dEl.textContent=_ls.side;\n'
            '        _dEl.className=\'dvl-st-lsig-dir \'+(_ls.side===\'LONG\'?\'long\':\'short\');}\n'
            '      if(_tEl)_tEl.textContent=(_ls.rejectionType||\'HVN Signal\')+\' \xb7 HVN Signals\';\n'
            '      if(_sEl)_sEl.textContent=\'\';\n'
            '      if(_tfEl)_tfEl.textContent=(window.S&&window.S.tf)||\'?\';\n'
            '      if(_znEl){\n'
            '        var _z=_ls.hvnZone,_zp=_z?(_z.price||(_z.lo+_z.hi)/2):_ls.entryPrice;\n'
            '        _znEl.textContent=_zp>999?_zp.toFixed(0):_zp.toFixed(2);\n'
            '      }\n'
            '      /* today: signals in last 24h */\n'
            '      var _rt2=window.S&&window.S.candles&&window.S.candles.length?\n'
            '        window.S.candles[window.S.candles.length-1].t:0;\n'
            '      var _tSc2=_rt2>9999999999?1:1000;\n'
            '      var _24h=_rt2-86400*(_tSc2===1?1000:1);\n'
            '      var _tSigs=_sigs.filter(function(s){return s.timestamp>=_24h;});\n'
            '      if(_sgEl)_sgEl.textContent=String(_tSigs.length);\n'
            '      if(_wrEl)_wrEl.textContent=\'—\';\n'
            '      if(_pfEl)_pfEl.textContent=\'—\';\n'
            '    }\n'
            '  }catch(_){}\n'
            '}')
assert OLD_LIVE in html, '_syncLiveStats function not found'
html = html.replace(OLD_LIVE, NEW_LIVE, 1)

# ── 11. computeHVNSignals: richer rejectionType + id + zone.price + idx ──────
OLD_ENRICH = ('      _sg.rejectionType=_sg.subtype||_sg.kind||\'wick\';\n'
              '      var _isL=_sg.type===\'long\',_nz=null,_nzD=Infinity;\n'
              '      for(var _zj=0;_zj<zones.length;_zj++){\n'
              '        var _z=zones[_zj];\n'
              '        if(_isL&&_z.lo>_sg.zone.hi){var _zd=_z.lo-_sg.zone.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}\n'
              '        else if(!_isL&&_z.hi<_sg.zone.lo){var _zd=_sg.zone.lo-_z.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}\n'
              '      }\n'
              '      _sg.nextHvnZone=_nz;\n'
              '    }')
NEW_ENRICH = ('      var _rt;\n'
              '      if(_sg.subtype===\'recover\'){_rt=\'Dive & Recover\';}\n'
              '      else if(_sg.subtype===\'engulf\'){_rt=\'Engolfing\';}\n'
              '      else if(_sg.kind===\'lateral\'){_rt=(_sg.type===\'long\')?\'Lateral zone support rejection\':\'Lateral zone resistance rejection\';}\n'
              '      else{_rt=(_sg.type===\'long\')?\'Support rejection\':\'Resistance rejection\';}\n'
              '      _sg.rejectionType=_rt;\n'
              '      _sg.id=\'sig_\'+_sc.t+\'_\'+_sg.type.charAt(0);\n'
              '      _sg.idx=_si;\n'
              '      if(_sg.zone&&!_sg.zone.price)_sg.zone.price=(_sg.zone.lo+_sg.zone.hi)/2;\n'
              '      var _isL=_sg.type===\'long\',_nz=null,_nzD=Infinity;\n'
              '      for(var _zj=0;_zj<zones.length;_zj++){\n'
              '        var _z=zones[_zj];\n'
              '        if(_isL&&_z.lo>_sg.zone.hi){var _zd=_z.lo-_sg.zone.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}\n'
              '        else if(!_isL&&_z.hi<_sg.zone.lo){var _zd=_sg.zone.lo-_z.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}\n'
              '      }\n'
              '      _sg.nextHvnZone=_nz;\n'
              '      if(_nz&&!_nz.price)_nz.price=(_nz.lo+_nz.hi)/2;\n'
              '    }')
assert OLD_ENRICH in html, 'computeHVNSignals enrichment block not found'
html = html.replace(OLD_ENRICH, NEW_ENRICH, 1)

# ── 12. computeHVNSignals: use idx in _backtestReal + auto-notify ─────────────
# Use signal.idx to skip O(N) findIndex in _backtestReal
OLD_SIG_IDX = ('      var sigIdx=candles.findIndex(function(c){return c.t>=sig.timestamp;});\n'
               '      if(sigIdx<0)return;')
NEW_SIG_IDX = ('      var sigIdx=sig.idx!==undefined?sig.idx:\n'
               '        candles.findIndex(function(c){return c.t>=sig.timestamp;});\n'
               '      if(sigIdx<0)return;')
assert OLD_SIG_IDX in html, 'sigIdx findIndex not found'
html = html.replace(OLD_SIG_IDX, NEW_SIG_IDX, 1)

# ── 13. computeHVNSignals: auto-notify _dvlST after computing ────────────────
OLD_SIG_END = ('    S.hvnSignals=signals;\n'
               '  }\n'
               '\n'
               '  /* ── Rounded-rect helper')
NEW_SIG_END = ('    S.hvnSignals=signals;\n'
               '    /* notify Strategy Tester */\n'
               '    try{if(window._dvlST&&typeof window._dvlST.updateSigStatus===\'function\')window._dvlST.updateSigStatus();}catch(_){}\n'
               '  }\n'
               '\n'
               '  /* ── Rounded-rect helper')
assert OLD_SIG_END in html, 'S.hvnSignals=signals end not found'
html = html.replace(OLD_SIG_END, NEW_SIG_END, 1)

# ── 14. expose _updateSigStatus on window._dvlST ────────────────────────────
OLD_DVL = "window._dvlST={open:open,close:close,version:V,syncCfg:_syncAllFromCfg};"
NEW_DVL = "window._dvlST={open:open,close:close,version:V,syncCfg:_syncAllFromCfg,updateSigStatus:_updateSigStatus};"
assert OLD_DVL in html, 'window._dvlST not found'
html = html.replace(OLD_DVL, NEW_DVL, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.116 applied')
