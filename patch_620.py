# patch_620.py — Beta 0.620
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.619)
#
# FEATURE: Volume Profile Timeframe selector
#   TFs disponíveis (sem minutos): 1h 2h 4h 6h 8h 12h 1d 3d 1w
#   + "Range Visível" (comportamento atual).
#   Ao escolher um TF, o VP busca klines da Binance Futures API:
#     período = TF anterior (fechado) + TF atual (em formação)
#     ex.: TF=1h, 15h45 → klines de 14h00 até agora
#   Cache 60s, invalidado quando o período vira (candle fecha).
#   Coordenadas Y alinhadas ao preço real do VP (não ao range visível),
#   para que o perfil seja correto mesmo quando o TF do VP tem range
#   de preço diferente do range visível no chart.
#
# VERSION: 0.619 → 0.620

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes  = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    fixes.append(label)
    return html.replace(old, new)

# ── 1. DEFAULTS: adicionar vpTF ───────────────────────────────────────────────
html = rep(html,
    '    on: true,\n'
    '    rows: 120,\n'
    '    widthPct: 0.18,\n'
    '    opacity: 0.46,\n'
    '    valueAreaPct: 0.70,',

    '    on: true,\n'
    '    rows: 120,\n'
    '    widthPct: 0.18,\n'
    '    opacity: 0.46,\n'
    '    valueAreaPct: 0.70,\n'
    "    vpTF: 'visible',",

    'DEFAULTS: add vpTF'
)

# ── 2. Inserir VP TF infra (opts, base, cache, fetch, resolve) ────────────────
html = rep(html,
    '  function setOn(v){ state.on=!!v; save(); }\n'
    '\n'
    '  // ── Volume Profile computation (triangular close-peaked) ─────────────────',

    '  function setOn(v){ state.on=!!v; save(); }\n'
    '\n'
    '  // ── VP Timeframe: opções, bases, cache e fetch ────────────────────────────\n'
    '  const VP_TF_OPTS = [\n'
    "    {v:'visible',l:'Range Visível'},\n"
    "    {v:'1h', l:'1h'},  {v:'2h', l:'2h'},  {v:'4h', l:'4h'},\n"
    "    {v:'6h', l:'6h'},  {v:'8h', l:'8h'},  {v:'12h',l:'12h'},\n"
    "    {v:'1d', l:'1 Dia'},{v:'3d', l:'3 Dias'},{v:'1w', l:'1 Semana'},\n"
    '  ];\n'
    '  const VP_BASE_TF = {\n'
    "    '1h' :{base:'1m',  ms:3600000   },\n"
    "    '2h' :{base:'3m',  ms:7200000   },\n"
    "    '4h' :{base:'5m',  ms:14400000  },\n"
    "    '6h' :{base:'5m',  ms:21600000  },\n"
    "    '8h' :{base:'15m', ms:28800000  },\n"
    "    '12h':{base:'15m', ms:43200000  },\n"
    "    '1d' :{base:'30m', ms:86400000  },\n"
    "    '3d' :{base:'1h',  ms:259200000 },\n"
    "    '1w' :{base:'4h',  ms:604800000 },\n"
    '  };\n'
    '  let vpKCache    = null;\n'
    '  let vpKFetching = false;\n'
    '\n'
    '  async function fetchVPKlines(sym, tf){\n'
    '    const cfg = VP_BASE_TF[tf];\n'
    '    if(!cfg || !sym) return null;\n'
    '    const now  = Date.now();\n'
    '    const cur  = Math.floor(now / cfg.ms) * cfg.ms;\n'
    '    const from = cur - cfg.ms;\n'
    "    const url  = 'https://fapi.binance.com/fapi/v1/klines?symbol='+sym\n"
    "               + '&interval='+cfg.base+'&startTime='+from+'&limit=1500';\n"
    '    try{\n'
    '      const r = await fetch(url);\n'
    '      if(!r.ok) return null;\n'
    '      const d = await r.json();\n'
    '      if(!Array.isArray(d)) return null;\n'
    '      return d.map(x=>({\n'
    '        time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],\n'
    '        volume:+x[5],buyVolume:+x[9]\n'
    '      }));\n'
    '    }catch(_){ return null; }\n'
    '  }\n'
    '\n'
    '  function resolveVPKlines(defaultView, sym){\n'
    "    const tf = state.vpTF || 'visible';\n"
    "    if(tf === 'visible' || !sym) return {klines:defaultView, own:false};\n"
    '    const cfg  = VP_BASE_TF[tf];\n'
    '    const now  = Date.now();\n'
    '    const periodStart = cfg ? Math.floor(now / cfg.ms) * cfg.ms : 0;\n'
    '    const ok = vpKCache\n'
    '      && vpKCache.sym === sym && vpKCache.tf === tf\n'
    '      && vpKCache.periodStart === periodStart\n'
    '      && Array.isArray(vpKCache.klines) && vpKCache.klines.length\n'
    '      && (now - vpKCache.ts) < 60000;\n'
    '    if(!ok && !vpKFetching){\n'
    '      vpKFetching = true;\n'
    '      fetchVPKlines(sym, tf).then(kl=>{\n'
    '        vpKCache = {sym, tf, klines:kl||[], ts:Date.now(), periodStart};\n'
    '        vpKFetching = false;\n'
    "        if(kl && kl.length && typeof drawSoon==='function') drawSoon();\n"
    '      }).catch(()=>{ vpKFetching=false; });\n'
    '    }\n'
    '    if(vpKCache && vpKCache.sym===sym && vpKCache.tf===tf && vpKCache.klines.length){\n'
    '      return {klines:vpKCache.klines, own:true};\n'
    '    }\n'
    '    return {klines:defaultView, own:false};\n'
    '  }\n'
    '\n'
    '  // ── Volume Profile computation (triangular close-peaked) ─────────────────',

    'VP TF infra: opts, base, cache, fetchVPKlines, resolveVPKlines'
)

# ── 3. draw(): usar vpView + vpMin/vpMax antes de computeVP ──────────────────
html = rep(html,
    '    const rows = Math.max(20, Math.min(500, Math.round(state.rows)||120));\n'
    '    const { buy: buyB, sell: sellB } = computeVP(view, min, max, rows);',

    '    const rows = Math.max(20, Math.min(500, Math.round(state.rows)||120));\n'
    "    const sym = cfg.symbol || '';\n"
    '    const {klines:vpView, own:ownData} = resolveVPKlines(view, sym);\n'
    '    let vpMin = min, vpMax = max;\n'
    '    if(ownData && vpView.length){\n'
    '      for(const c of vpView){\n'
    '        if(+c.low  < vpMin) vpMin = +c.low;\n'
    '        if(+c.high > vpMax) vpMax = +c.high;\n'
    '      }\n'
    '      const pad = (vpMax - vpMin) * 0.005;\n'
    '      vpMin -= pad; vpMax += pad;\n'
    '    }\n'
    '    const vpRange = vpMax - vpMin || 1;\n'
    '    const { buy: buyB, sell: sellB } = computeVP(vpView, vpMin, vpMax, rows);',

    'draw(): vpView + vpMin/vpMax/vpRange'
)

# ── 4. draw(): trocar barH por pricePerRow + rowY ────────────────────────────
html = rep(html,
    '    const vpW  = Math.min(150, Math.max(40, (x1-x0) * (state.widthPct||0.18)));\n'
    '    const vpX0 = x1 - vpW;\n'
    '    const barH = (y1 - y0) / rows;\n'
    '    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));\n'
    '    const cBuy  = state.colorBuy  || "#13dc8d";\n'
    '    const cSell = state.colorSell || "#ff4a61";',

    '    const vpW  = Math.min(150, Math.max(40, (x1-x0) * (state.widthPct||0.18)));\n'
    '    const vpX0 = x1 - vpW;\n'
    '    const chartRange  = max - min;\n'
    '    const pricePerRow = vpRange / rows;\n'
    '    const rowY = i => y0 + (max - (vpMin + i * pricePerRow)) / chartRange * (y1 - y0);\n'
    '    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));\n'
    '    const cBuy  = state.colorBuy  || "#13dc8d";\n'
    '    const cSell = state.colorSell || "#ff4a61";',

    'draw(): pricePerRow + rowY (remove barH)'
)

# ── 5. draw(): barras com coordenadas alinhadas ao preço ─────────────────────
html = rep(html,
    '      const py    = y1 - (i+1) * barH;\n'
    '      const bH    = Math.max(0.8, barH);',

    '      const priceLo = vpMin + i       * pricePerRow;\n'
    '      const priceHi = vpMin + (i + 1) * pricePerRow;\n'
    '      if(priceHi < min || priceLo > max) continue;\n'
    '      const pyTop = y0 + (max - Math.min(priceHi, max)) / chartRange * (y1 - y0);\n'
    '      const pyBot = y0 + (max - Math.max(priceLo, min)) / chartRange * (y1 - y0);\n'
    '      const py  = pyTop;\n'
    '      const bH  = Math.max(0.5, pyBot - pyTop);',

    'draw(): bars price-aligned Y coords'
)

# ── 6. draw(): POC/VAH/VAL Y alinhados ao preço ──────────────────────────────
html = rep(html,
    '      const pocY = y1 - (pocIdx + 0.5) * barH;',
    '      const pocY = rowY(pocIdx + 0.5);',
    'draw(): pocY via rowY'
)

html = rep(html,
    '      const vahY = y1 - (vaHi + 1) * barH;',
    '      const vahY = rowY(vaHi + 1);',
    'draw(): vahY via rowY'
)

html = rep(html,
    '      const valY = y1 - vaLo * barH;',
    '      const valY = rowY(vaLo);',
    'draw(): valY via rowY'
)

# ── 7. renderPanel(): selector de TF ─────────────────────────────────────────
html = rep(html,
    '          <div class="dvl-vt-field"><label>Value Area %</label>'
    '<input id="dvlVPVAPct" class="dvl-vt-input" type="number" min="10" max="100" step="5" '
    'value="${Math.round((state.valueAreaPct||0.70)*100)}"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>Cores das Barras</span></div>',

    '          <div class="dvl-vt-field"><label>Value Area %</label>'
    '<input id="dvlVPVAPct" class="dvl-vt-input" type="number" min="10" max="100" step="5" '
    'value="${Math.round((state.valueAreaPct||0.70)*100)}"></div>\n'
    '          <div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px">'
    '<label style="white-space:nowrap">Timeframe do VP</label>'
    '<select id="dvlVPTF" style="width:100%;background:#0f1623;color:#c8d5e6;border:1px solid #253248;'
    'border-radius:3px;padding:4px 6px;font-size:11px;cursor:pointer">'
    "${VP_TF_OPTS.map(o=>`<option value=\"${o.v}\"${(state.vpTF||'visible')===o.v?' selected':''}>${o.l}</option>`).join('')}"
    '</select></div>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>Cores das Barras</span></div>',

    'renderPanel: TF selector'
)

# ── 8. renderPanel(): handler dvlVPTF ────────────────────────────────────────
html = rep(html,
    '    b("dvlVPVAPct", el=>{ state.valueAreaPct=Math.max(0.10,Math.min(1,(+el.value||70)/100)); });\n'
    '    b("dvlVPCBuy",  el=>{ state.colorBuy=el.value; });',

    '    b("dvlVPVAPct", el=>{ state.valueAreaPct=Math.max(0.10,Math.min(1,(+el.value||70)/100)); });\n'
    "    b(\"dvlVPTF\",    el=>{ state.vpTF=el.value; vpKCache=null; });\n"
    '    b("dvlVPCBuy",  el=>{ state.colorBuy=el.value; });',

    'renderPanel: handler dvlVPTF'
)

# ── 9. Hook call: passar symbol ───────────────────────────────────────────────
html = rep(html,
    '      view, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max\n'
    '    });',

    '      view, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max, symbol\n'
    '    });',

    'DVLVolumeProfileDraw: pass symbol'
)

# ── 10. Version bump 0.619 → 0.620 ───────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.619";',
    'const DVL_APP_VERSION = "Beta 0.620";',
    'DVL_APP_VERSION 0.619→0.620'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: VP draw try/finally — escala e osciladores paravam de aparecer." },',
    '{ version: DVL_APP_VERSION, note: "Feature: VP Timeframe selector (1h/4h/1d/…) — prev period + current in formation." },\n'
    '  { version: "Beta 0.619", note: "Bugfix: VP draw try/finally — escala e osciladores paravam de aparecer." },',
    'DVL_CHANGELOG 0.620'
)
html = rep(html,
    'BETA 0.619</div>',
    'BETA 0.620</div>',
    'versionBadge 0.619→0.620'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.619</title>',
    '<title>DVL Binance Live — Beta 0.620</title>',
    'title 0.619→0.620'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.619",',
    '  window.DVLVolumeProfile = { version:"0.620",',
    'DVLVolumeProfile version 0.620'
)

# ── Result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  ', e)
    print('Aborting write.')
    sys.exit(1)
else:
    print('All checks passed.')

print('Applied (%d fixes):' % len(fixes))
for f in fixes: print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

print()
print('Written to', DST)
print('Total lines after patch: %d' % (html.count('\n') + 1))
