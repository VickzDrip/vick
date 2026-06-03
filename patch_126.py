#!/usr/bin/env python3
"""Beta 0.126 — limpeza final de confiança do Strategy Tester

  1. Comentários internos Beta 0.116/0.117 atualizados
  2. DEMO DATA removido do estado inicial (badge oculto, nota neutra)
  3. Badge LOOKAHEAD SAFE / LOOKAHEAD RISK adicionado
  4. _fmtN: formatação de candles com separador de milhar
  5. signalsGenerated adicionado a todos os resultado objects
  6. "Signals loaded" → "Sinais no gráfico" (separa de sinais gerados)
  7. Live Stats: cabeçalho dinâmico ÚLTIMO SINAL / HOJE / HISTÓRICO
  8. _backtestReal: marca lookaheadSafe=false quando _preZones fornecido de fora
  9. Optimizer LOW SAMPLE: configs < 20 trades marcadas; < 5 excluídas do ranking
"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ─────────────────────────────────────────────────────────
BUMPS = [
    ("var V='Beta 0.125';",                          "var V='Beta 0.126';"),
    ('<!-- DVL_STRATEGY_TESTER v0.125 -->',           '<!-- DVL_STRATEGY_TESTER v0.126 -->'),
    ('window.DVL_APP_VERSION = "Beta 0.125";',        'window.DVL_APP_VERSION = "Beta 0.126";'),
    ('  const LOCAL_VERSION = "Beta 0.125";',         '  const LOCAL_VERSION = "Beta 0.126";'),
    ("try{ window.DVL_APP_VERSION='Beta 0.125'; }catch(_){}",
     "try{ window.DVL_APP_VERSION='Beta 0.126'; }catch(_){}"),
    ("b.textContent='Beta 0.125';});}catch(_){}",
     "b.textContent='Beta 0.126';});}catch(_){}"),
    ("const VERSION='Beta 0.125';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }",
     "const VERSION='Beta 0.126';\n  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }"),
    ("const VERSION='Beta 0.125';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }",
     "const VERSION='Beta 0.126';\n  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn(); }"),
    ("window.DVL_APP_VERSION='Beta 0.125';",          "window.DVL_APP_VERSION='Beta 0.126';"),
    ("if(b)b.textContent='Beta 0.125';",              "if(b)b.textContent='Beta 0.126';"),
    ("const VERSION = 'Beta 0.125';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }",
     "const VERSION = 'Beta 0.126';\n  try{ window.DVL_APP_VERSION = VERSION; }catch(_){ }"),
    ("var VERSION='Beta 0.125';\n  var KEYS=['flow','clarity'];",
     "var VERSION='Beta 0.126';\n  var KEYS=['flow','clarity'];"),
]
for old, new in BUMPS:
    assert old in html, f'not found: {old[:60]}'
    html = html.replace(old, new, 1)

assert html.count('>Beta 0.125</span>') == 2, 'expected 2 badge spans'
html = html.replace('>Beta 0.125</span>', '>Beta 0.126</span>', 2)

# ── 2. changelog ────────────────────────────────────────────────────────────
OLD_LOG = (
    'Beta 0.125\n'
    '  - Hist\xf3rico real completo: sem limite de 10k candles, pagina\xe7\xe3o at\xe9 o per\xedodo completo\n'
)
NEW_LOG = (
    'Beta 0.126\n'
    '  - Comentários internos Beta 0.116/0.117 atualizados\n'
    '  - DEMO DATA removido: badge oculto inicialmente, nota neutra\n'
    '  - Badge LOOKAHEAD SAFE / LOOKAHEAD RISK no resultado\n'
    '  - _fmtN: candles com separador de milhar (ex: 105.120 / ~105.120)\n'
    '  - signalsGenerated em todos os resultados; "Sinais no gráfico" separado\n'
    '  - Live Stats: cabeçalho dinâmico HOJE / HISTÓRICO\n'
    '  - lookaheadSafe=false quando _preZones fornecido externamente\n'
    '  - Optimizer: LOW SAMPLE para trades < 20; excluídas se < 5\n'
    'Beta 0.125\n'
    '  - Hist\xf3rico real completo: sem limite de 10k candles, pagina\xe7\xe3o at\xe9 o per\xedodo completo\n'
)
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Fix old version comments inside Strategy Tester CSS/JS ────────────────
assert '/* ── DVL Strategy Tester — Beta 0.116 ── */' in html
html = html.replace('/* ── DVL Strategy Tester — Beta 0.116 ── */',
                    '/* ── DVL Strategy Tester — Beta 0.126 ── */', 1)

assert '/* Beta 0.116 — reset & apply buttons */' in html
html = html.replace('/* Beta 0.116 — reset & apply buttons */',
                    '/* DVL Strategy Tester — reset & apply buttons */', 1)

assert '/* Beta 0.116 — Strategy Tester */' in html
html = html.replace('/* Beta 0.116 — Strategy Tester */',
                    '/* DVL Strategy Tester */', 1)

assert '/* ── real backtest engine (Beta 0.117) ─────────────────────── */' in html
html = html.replace('/* ── real backtest engine (Beta 0.117) ─────────────────────── */',
                    '/* ── real backtest engine ─────────────────────────────── */', 1)

assert '/* real backtest: generates signals internally from candles+zones (Beta 0.117) */' in html
html = html.replace('/* real backtest: generates signals internally from candles+zones (Beta 0.117) */',
                    '/* real backtest: routes to HVN, FVG or TB engine */', 1)

assert '  /* real data only — no mock fallback (Beta 0.117) */' in html
html = html.replace('  /* real data only — no mock fallback (Beta 0.117) */',
                    '  /* real data only — no mock fallback */', 1)

# ── 4. Remove DEMO DATA — badge hidden initially, add LOOKAHEAD badge ─────────
OLD_BADGE_HTML = (
    '<span id="dvlSTDataBadge" style="font-size:7px;font-weight:700;letter-spacing:.1em;'
    'background:rgba(255,180,0,.1);color:#ffb400;border:1px solid rgba(255,180,0,.28);'
    'border-radius:3px;padding:2px 5px;text-transform:uppercase;cursor:pointer;'
    'display:inline-flex;align-items:center;gap:3px" '
    'title="Clique para ocultar. Muda para REAL DATA quando HVN Signals tiver dados reais." '
    'onclick="this.style.display=\'none\';var n=document.getElementById(\'dvlSTDetNote\');'
    'if(n)n.style.display=\'none\'">DEMO DATA '
    '<span style="font-size:9px;opacity:.7">\xd7</span></span>'
)
NEW_BADGE_HTML = (
    '<span id="dvlSTDataBadge" style="font-size:7px;font-weight:700;letter-spacing:.1em;'
    'border-radius:3px;padding:2px 5px;text-transform:uppercase;display:none;align-items:center"></span>'
    '<span id="dvlSTLookaheadBadge" style="font-size:7px;font-weight:700;letter-spacing:.1em;'
    'border-radius:3px;padding:2px 5px;text-transform:uppercase;display:none;align-items:center;margin-left:4px"></span>'
)
assert OLD_BADGE_HTML in html, 'DEMO DATA badge HTML not found'
html = html.replace(OLD_BADGE_HTML, NEW_BADGE_HTML, 1)

OLD_INIT_NOTE = '>Execute o backtest para ver a fonte dos dados.</div>'
NEW_INIT_NOTE = '>Execute o backtest para carregar hist\xf3rico real.</div>'
assert OLD_INIT_NOTE in html, 'initial note not found'
html = html.replace(OLD_INIT_NOTE, NEW_INIT_NOTE, 1)

# ── 5. Add id to ÚLTIMO SINAL header ────────────────────────────────────────
OLD_LAST_HDR = '      <div class="dvl-st-sl">ÚLTIMO SINAL</div>'
NEW_LAST_HDR = '      <div class="dvl-st-sl" id="dvlSTLastHeader">ÚLTIMO SINAL</div>'
assert OLD_LAST_HDR in html, 'ÚLTIMO SINAL header not found'
html = html.replace(OLD_LAST_HDR, NEW_LAST_HDR, 1)

# ── 6. _setBadge: update to set full border (not just borderColor) ────────────
OLD_SET_BADGE_FN = (
    "        if(db){db.style.display='inline-flex';db.textContent=txt;\n"
    "          db.style.background=bg;db.style.color=clr;db.style.borderColor=bd;}"
)
NEW_SET_BADGE_FN = (
    "        if(db){db.style.display='inline-flex';db.textContent=txt;\n"
    "          db.style.background=bg;db.style.color=clr;db.style.border='1px solid '+bd;}"
)
assert OLD_SET_BADGE_FN in html, '_setBadge db styling not found'
html = html.replace(OLD_SET_BADGE_FN, NEW_SET_BADGE_FN, 1)

# ── 7. Add _fmtN helper + change "Signals loaded" label ──────────────────────
OLD_G_FN = "function _g(id){return document.getElementById(id);}\n"
NEW_G_FN = (
    "function _g(id){return document.getElementById(id);}\n"
    "function _fmtN(n){return String(Math.round(n||0)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');}\n"
)
assert OLD_G_FN in html, '_g function not found'
html = html.replace(OLD_G_FN, NEW_G_FN, 1)

OLD_SIG_STATUS = "  el.textContent='Signals loaded: '+cnt;"
NEW_SIG_STATUS = "  el.textContent='Sinais no gr\xe1fico: '+cnt;"
assert OLD_SIG_STATUS in html, 'Signals loaded label not found'
html = html.replace(OLD_SIG_STATUS, NEW_SIG_STATUS, 1)

# ── 8. _backtestReal: mark lookaheadSafe=false when preZones provided ────────
OLD_ZONES_BLOCK = (
    "    var zones=_preZones;\n"
    "    if(!zones){\n"
    "      /* lookahead-safe: compute zones only from warmup (40% or min 500 candles) */\n"
    "      var _wuEnd=Math.min(candles.length,Math.max(500,Math.floor(candles.length*0.4)));\n"
    "      var _wuC=_wuEnd<candles.length?candles.slice(0,_wuEnd):candles;\n"
    "      zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_wuC):\n"
    "        (window.__hvnZones?window.__hvnZones():[]);\n"
    "      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=true;\n"
    "    }"
)
NEW_ZONES_BLOCK = (
    "    var zones=_preZones;\n"
    "    if(!zones){\n"
    "      /* lookahead-safe: compute zones only from warmup (40% or min 500 candles) */\n"
    "      var _wuEnd=Math.min(candles.length,Math.max(500,Math.floor(candles.length*0.4)));\n"
    "      var _wuC=_wuEnd<candles.length?candles.slice(0,_wuEnd):candles;\n"
    "      zones=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(_wuC):\n"
    "        (window.__hvnZones?window.__hvnZones():[]);\n"
    "      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=true;\n"
    "    }else{\n"
    "      /* zones from external source (optimizer/chart) use full history = lookahead risk */\n"
    "      if(window.DVLBacktestData)window.DVLBacktestData.lookaheadSafe=false;\n"
    "    }"
)
assert OLD_ZONES_BLOCK in html, 'zones block not found'
html = html.replace(OLD_ZONES_BLOCK, NEW_ZONES_BLOCK, 1)

# ── 9. Add signalsGenerated to HVN result object ─────────────────────────────
OLD_GENSIGS = (
    "    var signals=_dvlGenHVNSigs(candles,zones,sigCfg);\n"
    "    if(!signals.length)return null;"
)
NEW_GENSIGS = (
    "    var signals=_dvlGenHVNSigs(candles,zones,sigCfg);\n"
    "    if(!signals.length)return null;\n"
    "    var _sigGenCount=signals.filter(function(s){return s&&s.entryPrice;}).length;"
)
assert OLD_GENSIGS in html, '_dvlGenHVNSigs call not found'
html = html.replace(OLD_GENSIGS, NEW_GENSIGS, 1)

OLD_HVN_RETURN = (
    "      cfg:cfg,isReal:true,\n"
    "      dataSource:_preCandles?'extended':'chart',candleCount:candles.length\n"
    "    };\n"
    "  }catch(e){return null;}\n"
    "}\n"
    "\n"
    "\n"
    "/* ── shared stats builder for FVG + TB real backtests"
)
NEW_HVN_RETURN = (
    "      cfg:cfg,isReal:true,\n"
    "      signalsGenerated:_sigGenCount,\n"
    "      dataSource:_preCandles?'extended':'chart',candleCount:candles.length\n"
    "    };\n"
    "  }catch(e){return null;}\n"
    "}\n"
    "\n"
    "\n"
    "/* ── shared stats builder for FVG + TB real backtests"
)
assert OLD_HVN_RETURN in html, 'HVN return object not found'
html = html.replace(OLD_HVN_RETURN, NEW_HVN_RETURN, 1)

# ── 10. Add signalsGenerated to _btMakeResult return ────────────────────────
OLD_BT_RETURN = (
    "    cfg:cfg,isReal:true,\n"
    "    dataSource:_preCandles?'extended':'chart',candleCount:candles.length};\n"
    "}\n"
    "\n"
    "/* ── FVG real backtest"
)
NEW_BT_RETURN = (
    "    cfg:cfg,isReal:true,\n"
    "    signalsGenerated:trades.length,\n"
    "    dataSource:_preCandles?'extended':'chart',candleCount:candles.length};\n"
    "}\n"
    "\n"
    "/* ── FVG real backtest"
)
assert OLD_BT_RETURN in html, '_btMakeResult return object not found'
html = html.replace(OLD_BT_RETURN, NEW_BT_RETURN, 1)

# ── 11. Update badge info text: _fmtN + signalsGenerated + LOOKAHEAD badge ───
OLD_BADGE_SECTION = (
    "      var _histNote=_expC>0?(' '+_cLen+'/~'+_expC+' candles'+(_isLim?' ⚠':'')+'.'):'';\n"
    "      var _laNote=(_btd2&&_btd2.lookaheadSafe)?' Zonas: sem lookahead.':'';\n"
    "      var _info=(dataSource==='fetched'?'Backtest real'+_histNote+_laNote:\n"
    "        'Backtest: '+_cLen+' candles do gr\xe1fico.')+' Trades: '+res.trades+'.';\n"
    "      _setBadge(_bt,_bc,_bb,_bbd,_info,_bc==='#00c864'?'rgba(0,200,100,.8)':_bc==='#00b4ff'?'rgba(0,180,255,.8)':'rgba(255,180,0,.7)');"
)
NEW_BADGE_SECTION = (
    "      var _histNote=_expC>0?(' '+_fmtN(_cLen)+'/~'+_fmtN(_expC)+' candles'+(_isLim?' ⚠':'')+'.'):'';\n"
    "      var _sigNote=res.signalsGenerated?' Sinais: '+res.signalsGenerated+'.':' Trades: '+res.trades+'.';\n"
    "      var _info=(dataSource==='fetched'?'Backtest real'+_histNote:\n"
    "        'Backtest: '+_fmtN(_cLen)+' candles do gr\xe1fico.')+_sigNote;\n"
    "      _setBadge(_bt,_bc,_bb,_bbd,_info,_bc==='#00c864'?'rgba(0,200,100,.8)':_bc==='#00b4ff'?'rgba(0,180,255,.8)':'rgba(255,180,0,.7)');\n"
    "      /* LOOKAHEAD badge */\n"
    "      var _labEl=_g('dvlSTLookaheadBadge');\n"
    "      if(_labEl){\n"
    "        var _laS=_btd2&&_btd2.lookaheadSafe;\n"
    "        _labEl.textContent=_laS?'LOOKAHEAD SAFE':'LOOKAHEAD RISK';\n"
    "        _labEl.style.cssText='font-size:7px;font-weight:700;letter-spacing:.1em;border-radius:3px;padding:2px 5px;text-transform:uppercase;display:inline-flex;align-items:center;margin-left:4px;'+\n"
    "          (_laS?'color:#00c864;background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.25)':'\n"
    "          color:#ff4d6a;background:rgba(255,77,106,.08);border:1px solid rgba(255,77,106,.25)');\n"
    "      }"
)
assert OLD_BADGE_SECTION in html, 'badge section not found'
html = html.replace(OLD_BADGE_SECTION, NEW_BADGE_SECTION, 1)

# ── 12. Hide LOOKAHEAD badge when backtest starts ────────────────────────────
OLD_BT_START = (
    "    btBtn.disabled=true;\n"
    "    btBtn.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" width=\"12\" height=\"12\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg> CARREGANDO...';\n"
    "    var _dn0=_g('dvlSTDetNote');"
)
NEW_BT_START = (
    "    btBtn.disabled=true;\n"
    "    btBtn.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" width=\"12\" height=\"12\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg> CARREGANDO...';\n"
    "    var _lb0=_g('dvlSTLookaheadBadge');if(_lb0)_lb0.style.display='none';\n"
    "    var _dn0=_g('dvlSTDetNote');"
)
assert OLD_BT_START in html, 'backtest start block not found'
html = html.replace(OLD_BT_START, NEW_BT_START, 1)

# ── 13. Live Stats: dynamic header HOJE / HISTÓRICO ──────────────────────────
OLD_LIVE_ELSE = (
    "    }else{\n"
    "      var _ls=_sigs[_sigs.length-1];\n"
    "      /* compute today window first — needed to label signal as hoje/hist\xf3rico */\n"
    "      var _rt2=window.S&&window.S.candles&&window.S.candles.length?\n"
    "        window.S.candles[window.S.candles.length-1].t:0;\n"
    "      var _tSc2=_rt2>9999999999?1:1000;\n"
    "      var _24h=_rt2-86400*(_tSc2===1?1000:1);\n"
    "      var _isToday=_ls.timestamp>=_24h;\n"
    "      if(_dEl){_dEl.textContent=_ls.side;\n"
    "        _dEl.className='dvl-st-lsig-dir '+(_ls.side==='LONG'?'long':'short');}\n"
    "      if(_tEl)_tEl.textContent=(_ls.rejectionType||'HVN Signal')+' \xb7 HVN Signals';\n"
    "      if(_sEl)_sEl.textContent=_isToday?'':'(hist\xf3rico)';\n"
    "      if(_tfEl)_tfEl.textContent=(window.S&&window.S.tf)||'?';\n"
    "      if(_znEl){\n"
    "        var _z=_ls.hvnZone,_zp=_z?(_z.price||(_z.lo+_z.hi)/2):_ls.entryPrice;\n"
    "        _znEl.textContent=_zp>999?_zp.toFixed(0):_zp.toFixed(2);\n"
    "      }\n"
    "      var _tSigs=_sigs.filter(function(s){return s.timestamp>=_24h;});\n"
    "      if(_sgEl)_sgEl.textContent=String(_tSigs.length);\n"
    "      if(_wrEl)_wrEl.textContent='—';\n"
    "      if(_pfEl)_pfEl.textContent='—';\n"
    "    }"
)
NEW_LIVE_ELSE = (
    "    }else{\n"
    "      var _ls=_sigs[_sigs.length-1];\n"
    "      /* compute today window first — needed to label signal as hoje/hist\xf3rico */\n"
    "      var _rt2=window.S&&window.S.candles&&window.S.candles.length?\n"
    "        window.S.candles[window.S.candles.length-1].t:0;\n"
    "      var _tSc2=_rt2>9999999999?1:1000;\n"
    "      var _24h=_rt2-86400*(_tSc2===1?1000:1);\n"
    "      var _isToday=_ls.timestamp>=_24h;\n"
    "      var _tSigs=_sigs.filter(function(s){return s.timestamp>=_24h;});\n"
    "      /* update header: HOJE se h\xe1 sinal hoje, HIST\xd3RICO se n\xe3o */\n"
    "      var _lsHdr=_g('dvlSTLastHeader');\n"
    "      if(_lsHdr)_lsHdr.textContent=_tSigs.length>0?'\xdaLTIMO SINAL HOJE':(_isToday?'\xdaLTIMO SINAL HOJE':'\xdaLTIMO SINAL HIST\xd3RICO');\n"
    "      if(_dEl){_dEl.textContent=_ls.side;\n"
    "        _dEl.className='dvl-st-lsig-dir '+(_ls.side==='LONG'?'long':'short');}\n"
    "      if(_tEl)_tEl.textContent=(_ls.rejectionType||'HVN Signal')+' \xb7 HVN Signals';\n"
    "      if(_sEl)_sEl.textContent=_isToday?'':'(hist\xf3rico)';\n"
    "      if(_tfEl)_tfEl.textContent=(window.S&&window.S.tf)||'?';\n"
    "      if(_znEl){\n"
    "        var _z=_ls.hvnZone,_zp=_z?(_z.price||(_z.lo+_z.hi)/2):_ls.entryPrice;\n"
    "        _znEl.textContent=_zp>999?_zp.toFixed(0):_zp.toFixed(2);\n"
    "      }\n"
    "      if(_sgEl)_sgEl.textContent=String(_tSigs.length);\n"
    "      if(_wrEl)_wrEl.textContent='—';\n"
    "      if(_pfEl)_pfEl.textContent='—';\n"
    "    }"
)
assert OLD_LIVE_ELSE in html, 'Live Stats else block not found'
html = html.replace(OLD_LIVE_ELSE, NEW_LIVE_ELSE, 1)

# ── 14. Live Stats: reset header when no signals ─────────────────────────────
OLD_NO_SIG = (
    "    if(_sigs.length===0){\n"
    "      if(_dEl){_dEl.textContent='—';_dEl.className='dvl-st-lsig-dir';}"
)
NEW_NO_SIG = (
    "    if(_sigs.length===0){\n"
    "      var _lsHdrR=_g('dvlSTLastHeader');if(_lsHdrR)_lsHdrR.textContent='\xdaLTIMO SINAL';\n"
    "      if(_dEl){_dEl.textContent='—';_dEl.className='dvl-st-lsig-dir';}"
)
assert OLD_NO_SIG in html, 'no signals block not found'
html = html.replace(OLD_NO_SIG, NEW_NO_SIG, 1)

# ── 15. Optimizer: exclude < 5 trades, mark LOW SAMPLE (< 20) ───────────────
# Exclude micro-sample from scoring
OLD_RE_RANK = (
    "  var keys=_optSortBy,all=_allOptResults;\n"
    "  var scored=all.map(function(r){"
)
NEW_RE_RANK = (
    "  var keys=_optSortBy;\n"
    "  var all=_allOptResults.filter(function(r){return r.trades>=5;});\n"
    "  if(!all.length)all=_allOptResults;\n"
    "  var scored=all.map(function(r){"
)
assert OLD_RE_RANK in html, '_reRankResults scoring block not found'
html = html.replace(OLD_RE_RANK, NEW_RE_RANK, 1)

# Add LOW SAMPLE badge in rank card rendering
OLD_RANK_CFG = (
    "      '<div class=\"dvl-st-rcfg\">'+_cfgLabel(r.c)+'</div></div>'+"
)
NEW_RANK_CFG = (
    "      '<div class=\"dvl-st-rcfg\">'+_cfgLabel(r.c)+"
    "(r.trades<20?'<span style=\"font-size:6px;color:#ffb400;background:rgba(255,180,0,.1);border:1px solid rgba(255,180,0,.28);border-radius:3px;padding:1px 4px;margin-left:4px\">LOW SAMPLE</span>':'')+'</div></div>'+"
)
assert OLD_RANK_CFG in html, '_renderRanking cfg label not found'
html = html.replace(OLD_RANK_CFG, NEW_RANK_CFG, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.126 applied')
