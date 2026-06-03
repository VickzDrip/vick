#!/usr/bin/env python3
"""Beta 0.114 — Strategy Tester stabilization: R-based PnL, running-peak DD, real signals"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ───────────────────────────────────────────────────────────
html = html.replace('Beta 0.113', 'Beta 0.114')

# ── 2. changelog ──────────────────────────────────────────────────────────────
OLD_LOG = ('Beta 0.114\n'
           '  - Take Profit por porcentagem: op\xe7\xf5es 0.5% / 1% / 1.5% / 2% / 3%\n')
NEW_LOG = ('Beta 0.114\n'
           '  - Strategy Tester estabiliza\xe7\xe3o:\n'
           '    \xb7 Separa\xe7\xe3o clara REAL DATA vs DEMO DATA\n'
           '    \xb7 C\xe1lculo de PnL via R-m\xfaltiplo correto (2R \xd7 1% risco = +2%)\n'
           '    \xb7 Drawdown calculado via running peak (trade a trade)\n'
           '    \xb7 HVN Signals popula side/timestamp/entryPrice/candle/hvnZone\n'
           '    \xb7 Backtest real usa sinais reais quando dispon\xedveis\n'
           '    \xb7 TP% (pct) aplicado corretamente no backtest real\n'
           '    \xb7 SL por pavio usa candle.l / candle.h (corre\xe7\xe3o de bug)\n'
           '  - Take Profit por porcentagem: op\xe7\xf5es 0.5% / 1% / 1.5% / 2% / 3%\n')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. _backtestReal — SL wick: fix .low/.high → .l/.h ───────────────────────
OLD_SL = "      if(slMode==='wick'){sl=isLong?sig.candle.low:sig.candle.high;}"
NEW_SL = "      if(slMode==='wick'){sl=isLong?sig.candle.l:sig.candle.h;}"
assert OLD_SL in html, '_backtestReal SL wick not found'
html = html.replace(OLD_SL, NEW_SL, 1)

# ── 4. _backtestReal — TP: add pct mode before else-HVN branch ───────────────
OLD_TP = ("      else if(tpMode==='2r'){tp=isLong?entry+slDist*2:entry-slDist*2;}\n"
          "      else{/* next HVN */var nz=sig.nextHvnZone||{lo:entry*(isLong?1.012:0.988)};tp=isLong?nz.lo:nz.hi||entry*(isLong?1.012:0.988);}")
NEW_TP = ("      else if(tpMode==='2r'){tp=isLong?entry+slDist*2:entry-slDist*2;}\n"
          "      else if(typeof tpMode==='string'&&tpMode.indexOf('pct')>-1){var _pctV=parseFloat(tpMode)/100;tp=isLong?entry*(1+_pctV):entry*(1-_pctV);}\n"
          "      else{/* next HVN */var nz=sig.nextHvnZone||{lo:entry*(isLong?1.012:0.988)};tp=isLong?nz.lo:nz.hi||entry*(isLong?1.012:0.988);}")
assert OLD_TP in html, '_backtestReal TP pct anchor not found'
html = html.replace(OLD_TP, NEW_TP, 1)

# ── 5. _backtestReal — PnL: R-multiple instead of raw % move ─────────────────
OLD_PNL = "      var pnl=(isLong?(exitPrice-entry)/entry:(entry-exitPrice)/entry)*100*riskPct;"
NEW_PNL = ("      var rMult;\n"
           "      if(outcome==='win'){rMult=Math.abs(exitPrice-entry)/slDist;}\n"
           "      else if(outcome==='loss'){rMult=-1;}\n"
           "      else{var _tmo=isLong?(exitPrice-entry):(entry-exitPrice);rMult=_tmo/slDist;}\n"
           "      var pnl=rMult*riskPct;")
assert OLD_PNL in html, '_backtestReal PnL line not found'
html = html.replace(OLD_PNL, NEW_PNL, 1)

# ── 6. _backtestReal — drawdown: running peak ────────────────────────────────
OLD_DD_REAL = ("    var minEq=Math.min.apply(null,eq);\n"
               "    var maxEqBefore=eq.reduce(function(a,v,i){return i>0?Math.max(a,eq[i-1]):a;},eq[0]);\n"
               "    var dd=((minEq-maxEqBefore)/maxEqBefore*100);")
NEW_DD_REAL = ("    var _pk=eq[0],_mDD=0;\n"
               "    for(var _ei=1;_ei<eq.length;_ei++){if(eq[_ei]>_pk)_pk=eq[_ei];var _d=(_pk-eq[_ei])/_pk*100;if(_d>_mDD)_mDD=_d;}\n"
               "    var dd=-_mDD;")
assert OLD_DD_REAL in html, '_backtestReal drawdown not found'
html = html.replace(OLD_DD_REAL, NEW_DD_REAL, 1)

# ── 7. _backtestFVG — drawdown: running peak from eq curve ───────────────────
OLD_DD_FVG = ("  var dd=-rnd(1.8,8.5);\n"
              "  var eq=[100];\n"
              "  for(var i=0;i<trades;i++){\n"
              "    var prev=eq[eq.length-1];\n"
              "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
              "    eq.push(Math.max(40,prev+chg));\n"
              "  }\n"
              "  var longs=ri(Math.floor(trades*.45),Math.ceil(trades*.60));")
NEW_DD_FVG = ("  var eq=[100];\n"
              "  for(var i=0;i<trades;i++){\n"
              "    var prev=eq[eq.length-1];\n"
              "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
              "    eq.push(Math.max(40,prev+chg));\n"
              "  }\n"
              "  var _pk0=eq[0],_mDD0=0;\n"
              "  for(var _ei0=1;_ei0<eq.length;_ei0++){if(eq[_ei0]>_pk0)_pk0=eq[_ei0];var _d0=(_pk0-eq[_ei0])/_pk0*100;if(_d0>_mDD0)_mDD0=_d0;}\n"
              "  var dd=-_mDD0;\n"
              "  var longs=ri(Math.floor(trades*.45),Math.ceil(trades*.60));")
assert OLD_DD_FVG in html, '_backtestFVG drawdown not found'
html = html.replace(OLD_DD_FVG, NEW_DD_FVG, 1)

# ── 8. _backtestTrendBreak — drawdown: running peak from eq curve ─────────────
OLD_DD_TB = ("  var dd=-rnd(1.5,7.0);\n"
             "  var eq=[100];\n"
             "  for(var i=0;i<trades;i++){\n"
             "    var prev=eq[eq.length-1];\n"
             "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
             "    eq.push(Math.max(40,prev+chg));\n"
             "  }\n"
             "  var longs=ri(Math.floor(trades*.40),Math.ceil(trades*.65));")
NEW_DD_TB = ("  var eq=[100];\n"
             "  for(var i=0;i<trades;i++){\n"
             "    var prev=eq[eq.length-1];\n"
             "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
             "    eq.push(Math.max(40,prev+chg));\n"
             "  }\n"
             "  var _pk1=eq[0],_mDD1=0;\n"
             "  for(var _ei1=1;_ei1<eq.length;_ei1++){if(eq[_ei1]>_pk1)_pk1=eq[_ei1];var _d1=(_pk1-eq[_ei1])/_pk1*100;if(_d1>_mDD1)_mDD1=_d1;}\n"
             "  var dd=-_mDD1;\n"
             "  var longs=ri(Math.floor(trades*.40),Math.ceil(trades*.65));")
assert OLD_DD_TB in html, '_backtestTrendBreak drawdown not found'
html = html.replace(OLD_DD_TB, NEW_DD_TB, 1)

# ── 9. HVN mock — drawdown: running peak from eq curve ───────────────────────
OLD_DD_HVN = ("  var dd=-rnd(1.8,8.5);\n"
              "\n"
              "  var eq=[100];\n"
              "  for(var i=0;i<trades;i++){\n"
              "    var prev=eq[eq.length-1];\n"
              "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
              "    eq.push(Math.max(40,prev+chg));\n"
              "  }\n"
              "\n"
              "  var longs=ri(Math.floor(trades*.42),Math.ceil(trades*.62));")
NEW_DD_HVN = ("  var eq=[100];\n"
              "  for(var i=0;i<trades;i++){\n"
              "    var prev=eq[eq.length-1];\n"
              "    var chg=rng()<wr?(prev*avgW*riskPct/100):(-(prev*avgL*riskPct/100));\n"
              "    eq.push(Math.max(40,prev+chg));\n"
              "  }\n"
              "  var _pk2=eq[0],_mDD2=0;\n"
              "  for(var _ei2=1;_ei2<eq.length;_ei2++){if(eq[_ei2]>_pk2)_pk2=eq[_ei2];var _d2=(_pk2-eq[_ei2])/_pk2*100;if(_d2>_mDD2)_mDD2=_d2;}\n"
              "  var dd=-_mDD2;\n"
              "\n"
              "  var longs=ri(Math.floor(trades*.42),Math.ceil(trades*.62));")
assert OLD_DD_HVN in html, 'HVN mock drawdown not found'
html = html.replace(OLD_DD_HVN, NEW_DD_HVN, 1)

# ── 10. computeHVNSignals — enrich signals with _backtestReal fields ──────────
OLD_SIG = ("    S.hvnSignals=signals;\n"
           "  }\n"
           "\n"
           "  /* ── Rounded-rect helper")
NEW_SIG = ("    /* enrich signals with fields required by _backtestReal */\n"
           "    for(var _si=0;_si<n;_si++){\n"
           "      var _sg=signals[_si];if(!_sg)continue;\n"
           "      var _sc=cs[_si];\n"
           "      _sg.side=_sg.type==='long'?'LONG':'SHORT';\n"
           "      _sg.timestamp=_sc.t;\n"
           "      _sg.entryPrice=_sc.c;\n"
           "      _sg.candle=_sc;\n"
           "      _sg.hvnZone=_sg.zone;\n"
           "      _sg.rejectionType=_sg.subtype||_sg.kind||'wick';\n"
           "      var _isL=_sg.type==='long',_nz=null,_nzD=Infinity;\n"
           "      for(var _zj=0;_zj<zones.length;_zj++){\n"
           "        var _z=zones[_zj];\n"
           "        if(_isL&&_z.lo>_sg.zone.hi){var _zd=_z.lo-_sg.zone.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}\n"
           "        else if(!_isL&&_z.hi<_sg.zone.lo){var _zd=_sg.zone.lo-_z.hi;if(_zd<_nzD){_nzD=_zd;_nz=_z;}}\n"
           "      }\n"
           "      _sg.nextHvnZone=_nz;\n"
           "    }\n"
           "    S.hvnSignals=signals;\n"
           "  }\n"
           "\n"
           "  /* ── Rounded-rect helper")
assert OLD_SIG in html, 'computeHVNSignals signal assignment not found'
html = html.replace(OLD_SIG, NEW_SIG, 1)

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.114 applied')
