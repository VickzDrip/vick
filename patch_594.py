# patch_594.py — Beta 0.594
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.593)
#
# BUGFIX: Volume Trace renderPanel — usa #dvlMaBody e HTML do Moving Averages em vez
#         do #dvlVtBody e HTML correto do VT. Resulta em painel body vazio ao abrir.
#
# VERSION: 0.593 → 0.594

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

# ── 1. Fix VT renderPanel: replace MA HTML with correct VT HTML ───────────────
html = rep(html,
    '  function renderPanel(){\n'
    '    ensurePanel();\n'
    '    const body = panel.querySelector("#dvlMaBody");\n'
    '    body.innerHTML = `\n'
    '      <div class="dvl-vt-section dvl-ma-general-compact">\n'
    '        <div class="dvl-vt-section-title"><span>General</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field">\n'
    '            <label>Indicator</label>\n'
    '            <label class="dvl-switch">\n'
    '              <input id="dvlMaOn" type="checkbox" ${state.on ? "checked" : ""}>\n'
    '              <i></i><b></b>\n'
    '            </label>\n'
    '          </div>\n'
    '          <div class="dvl-vt-field">\n'
    '            <label>Labels</label>\n'
    '            <label class="dvl-switch dvl-ma-show-labels">\n'
    '              <input id="dvlMaLabels" type="checkbox" ${state.showLabels ? "checked" : ""}>\n'
    '              <i></i><b></b>\n'
    '            </label>\n'
    '          </div>\n'
    '        </div>\n'
    '      </div>\n'
    '\n'
    '      <div class="dvl-vt-section dvl-ma-table-section">\n'
    '        <div class="dvl-vt-section-title"><span>Averages</span></div>\n'
    '        <div class="dvl-ma-lines-head">\n'
    '          <span></span><span></span><span>PER.</span><span>TIPO</span><span>COR</span><span>LARG</span><span>EST</span>\n'
    '        </div>\n'
    '        <div class="dvl-ma-lines">\n'
    '          ${state.items.map(card).join("")}\n'
    '        </div>\n'
    '      </div>\n'
    '    `;\n'
    '\n'
    '    bindPanel();\n'
    '    updateSpikeStatus();\n'
    '    fetchTf(false);\n'
    '\n'
    '    try{\n'
    '      if(window.DVLIndicatorCustomControls && typeof window.DVLIndicatorCustomControls.upgrade === "function"){\n'
    '        window.DVLIndicatorCustomControls.upgrade(panel);\n'
    '      }\n'
    '    }catch(_){}\n'
    '  }',

    '  function renderPanel(){\n'
    '    ensurePanel();\n'
    '    const body = panel.querySelector("#dvlVtBody");\n'
    '    body.innerHTML = `\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>General</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlVtOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>\n'
    '          <div class="dvl-vt-field"><label>Style</label><select id="dvlVtVisualStyle" class="dvl-vt-select">${styleOptions(state.visualStyle)}</select></div>\n'
    '          <div class="dvl-vt-field"><label>Detection TF</label><select id="dvlVtDetectionTf" class="dvl-vt-select">${tfOptions()}</select></div>\n'
    '          <div class="dvl-vt-field"><label>Side</label><select id="dvlVtSideFilter" class="dvl-vt-select">${sideOptions(state.sideFilter)}</select></div>\n'
    '          <div class="dvl-vt-field"><label>Avg Len</label><input id="dvlVtAvgLen" class="dvl-vt-input" type="number" min="2" max="500" step="1" value="${state.avgLen}"></div>\n'
    '          <div class="dvl-vt-field"><label>Last Candles</label><input id="dvlVtLastCandles" class="dvl-vt-input" type="number" min="1" max="5000" step="1" value="${state.lastCandles}"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>Colors</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Buyer</label><button id="dvlVtBuyerColorBtn" type="button" class="dvl-vt-input" style="background:${state.buyerColor};height:32px;cursor:pointer;border-radius:11px"></button><input id="dvlVtBuyerColor" type="color" value="${state.buyerColor}" style="opacity:0;position:absolute;pointer-events:none"></div>\n'
    '          <div class="dvl-vt-field"><label>Seller</label><button id="dvlVtSellerColorBtn" type="button" class="dvl-vt-input" style="background:${state.sellerColor};height:32px;cursor:pointer;border-radius:11px"></button><input id="dvlVtSellerColor" type="color" value="${state.sellerColor}" style="opacity:0;position:absolute;pointer-events:none"></div>\n'
    '        </div>\n'
    '      </div>\n'
    '\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>Cluster</span></div>\n'
    '        <div class="dvl-vt-grid">\n'
    '          <div class="dvl-vt-field"><label>Cluster</label><label class="dvl-switch"><input id="dvlVtClusterOn" type="checkbox" ${state.clusterOn?"checked":""}><i></i><b></b></label></div>\n'
    '          <div class="dvl-vt-field"><label>Style</label><select id="dvlVtClusterStyle" class="dvl-vt-select">${clusterStyleOptions(state.clusterStyle)}</select></div>\n'
    '          <div class="dvl-vt-field"><label>Max Candles</label><input id="dvlVtClusterCandles" class="dvl-vt-input" type="number" min="0" max="20" step="1" value="${state.clusterMaxCandles}"></div>\n'
    '          <div class="dvl-vt-field"><label>Price %</label><input id="dvlVtClusterPrice" class="dvl-vt-input" type="number" min="0" max="20" step="0.01" value="${state.clusterMaxPricePct}"></div>\n'
    '          <div class="dvl-vt-field"><label>Min Level</label><input id="dvlVtClusterMin" class="dvl-vt-input" type="number" min="1" max="5" step="1" value="${state.clusterMinLevel}"></div>\n'
    '          <div class="dvl-vt-field"><label>Strong Only</label><label class="dvl-switch"><input id="dvlVtStrongOnly" type="checkbox" ${state.clusterStrongOnly?"checked":""}><i></i><b></b></label></div>\n'
    '        </div>\n'
    '      </div>\n'
    '\n'
    '      <div class="dvl-vt-section">\n'
    '        <div class="dvl-vt-section-title"><span>Levels</span></div>\n'
    '        <div class="dvl-vt-grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">\n'
    '          ${state.levels.map((lvl,i) => levelHTML(lvl,i)).join("")}\n'
    '        </div>\n'
    '      </div>\n'
    '    `;\n'
    '\n'
    '    bindPanel();\n'
    '\n'
    '    try{\n'
    '      if(window.DVLIndicatorCustomControls && typeof window.DVLIndicatorCustomControls.upgrade === "function"){\n'
    '        window.DVLIndicatorCustomControls.upgrade(panel);\n'
    '      }\n'
    '    }catch(_){}\n'
    '  }',

    'VT renderPanel fix #dvlVtBody + correct HTML'
)

# ── Version bump 0.593 → 0.594 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.593";',
    'const DVL_APP_VERSION = "Beta 0.594";',
    'DVL_APP_VERSION 0.593→0.594'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "OI: seletor Coins/USD no painel; pavios reais via dados sub-periodo (fmtCoins). L/S MA mantida." },',
    '{ version: DVL_APP_VERSION, note: "Bugfix: Volume Trace renderPanel usava #dvlMaBody e HTML do MA — painel body ficava vazio. Corrigido para #dvlVtBody com HTML VT correto." },\n'
    '  { version: "Beta 0.593", note: "OI: seletor Coins/USD; pavios reais via sub-periodo." },',
    'DVL_CHANGELOG 0.594'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.593</div>',
    '<div class="beta" id="versionBadge">BETA 0.594</div>',
    'versionBadge 0.593→0.594'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.593</title>',
    '<title>DVL Binance Live — Beta 0.594</title>',
    'title 0.593→0.594'
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
