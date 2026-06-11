# patch_348.py — Beta 0.348
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.347)
#
# DUPLICATE ID FIXES (priority list from user):
#   1. ppQty — static DTB input (line ~5785) vs dynamic paper-trading panel (line ~23061)
#      Fix: rename panel copy to ppFormQty; add oninput mirror → ppQty (DTB stays canonical)
#   2. ppRiskPct — static DTB input (line ~5789) vs dynamic panel (line ~23062)
#      Fix: rename panel copy to ppFormRiskPct; oninput mirrors to ppRiskPct then calls _updateSummaryBar
#   3. ppOrderType — static hidden input (line ~5796) vs dynamic panel select (line ~23060)
#      Fix: rename panel copy to ppFormOrderType; onchange mirrors to ppOrderType
#   4. dvl290LiqRow — defensive createElement in dvl290/dvl291/dvl296 components
#      vs. hardcoded in dvl297 buildPanel innerHTML (line ~36471)
#      Fix: rename dvl297's container to dvl297LiqRow (dvl297 accesses children by their own IDs)
#   5. syncToPaper() — extend to also write ppFormQty so panel stays in sync with entry calc
#
# NOT CHANGED (confirmed unique or replace-only, no DOM collision):
#   dvlLogoImgTop — unique in static HTML
#   dvlVersionBadge — one static HTML + JS fallback that checks getElementById first
#   DVL_FORCE_UPDATE_MANAGER — unique <script id>
#   dvl310AssetBtn — all code paths do replaceChild; only 1 element in DOM at any time
#
# VERSION: 0.347 → 0.348

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes = []

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

def rep_all(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    fixes.append('%s (x%d)' % (label, html.count(old)))
    return html.replace(old, new)

# ── 1. ppOrderType: rename panel select ID, mirror value to static hidden input ────
html = rep(html,
    'class="pp-sel" id="ppOrderType" onchange="DVL_PAPER._onTypeChange(this.value)"',
    'class="pp-sel" id="ppFormOrderType" onchange="var _ot=document.getElementById(&quot;ppOrderType&quot;);if(_ot)_ot.value=this.value;DVL_PAPER._onTypeChange(this.value)"',
    'ppOrderType panel→ppFormOrderType (mirror to static hidden ppOrderType)'
)

# ── 2. ppQty: rename panel input ID, add oninput mirror to static DTB input ────────
html = rep(html,
    'class="pp-inp" id="ppQty" type="number" min="0.0001" step="0.001" value="',
    'class="pp-inp" id="ppFormQty" type="number" min="0.0001" step="0.001" oninput="var q=document.getElementById(&quot;ppQty&quot;);if(q)q.value=this.value;" value="',
    'ppQty panel→ppFormQty (mirror to static DTB ppQty)'
)

# ── 3. ppRiskPct: rename panel input ID, mirror to DTB before calling _updateSummaryBar ─
html = rep(html,
    'class="pp-inp" id="ppRiskPct" type="number" min="0.1" max="100" step="0.1" value="'+chr(39)+'+riskPct+'+chr(39)+'" oninput="window.DVL_PAPER&&DVL_PAPER._updateSummaryBar()"',
    'class="pp-inp" id="ppFormRiskPct" type="number" min="0.1" max="100" step="0.1" value="'+chr(39)+'+riskPct+'+chr(39)+'" oninput="var r=document.getElementById(&quot;ppRiskPct&quot;);if(r)r.value=this.value;window.DVL_PAPER&&DVL_PAPER._updateSummaryBar()"',
    'ppRiskPct panel→ppFormRiskPct (mirror to static DTB ppRiskPct)'
)

# ── 4. dvl290LiqRow: rename dvl297 buildPanel container to dvl297LiqRow ─────────────
# The dvl297 component accesses its children (dvl297LiqToggle, dvl297LongLiq, etc.)
# directly by their own IDs — it never queries dvl290LiqRow by ID. Safe to rename.
html = rep(html,
    "        +'<div id=\"dvl290LiqRow\">'",
    "        +'<div id=\"dvl297LiqRow\">'",
    'dvl290LiqRow in dvl297 buildPanel → dvl297LiqRow'
)

# ── 5. syncToPaper(): also sync ppFormQty so panel stays in sync with entry calc ────
html = rep(html,
    "function syncToPaper(){ const d=data(); const q=document.getElementById('ppQty'); if(q){const v=qty(d.baseQty); if(q.value!==v)q.value=v;} const l=document.getElementById('ppLev'); if(l&&l.value!==String(d.l))l.value=String(d.l); try{if(window.ST&&ST.settings)ST.settings.leverage=d.l;}catch(e){} }",
    "function syncToPaper(){ const d=data(); const qv=qty(d.baseQty); const q=document.getElementById('ppQty'); if(q&&q.value!==qv)q.value=qv; const qf=document.getElementById('ppFormQty'); if(qf&&qf.value!==qv)qf.value=qv; const l=document.getElementById('ppLev'); if(l&&l.value!==String(d.l))l.value=String(d.l); try{if(window.ST&&ST.settings)ST.settings.leverage=d.l;}catch(e){} }",
    'syncToPaper: also sync ppFormQty'
)

# ── 6. Version bump: 0.347 → 0.348 ─────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.347";',
    'const DVL_APP_VERSION = "Beta 0.348";',
    'DVL_APP_VERSION const 0.347→0.348'
)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.347";',
    'const LOCAL_VERSION = "Beta 0.348";',
    'LOCAL_VERSION 0.347→0.348'
)
html = rep(html,
    "  const VER='Beta 0.347';",
    "  const VER='Beta 0.348';",
    'VER 0.347→0.348 in DVL_BETA_0334 script'
)
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.347</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.348</span>',
    'static dvlVersionBadge 0.347→0.348'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.347</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.348</span>',
    'static dvl-version-logo-hidden 0.347→0.348'
)
html = rep(html,
    "'Beta 0.347: Documento HTML consolidado: removidas cópias duplicadas de doctype/html/head/body. Estrutura DOM estabilizada para evitar comportamento imprevisível no mobile.'",
    "'Beta 0.348: IDs duplicados críticos consolidados: ppQty/ppRiskPct/ppOrderType/dvl290LiqRow. Painel paper-trading usa IDs ppFormQty/ppFormRiskPct/ppFormOrderType; valores espelham inputs estáticos do DTB. getElementById estabilizado.'",
    'changelog note 0.348'
)
html = rep(html,
    '/* Beta 0.347: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    '/* Beta 0.348: version already locked by first DVL_APP_VERSION block — intentionally empty */',
    'DVL_APP_VERSION stub comment 0.347→0.348'
)

# ── result ────────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 2:
        print('Too many errors — aborting write.')
        sys.exit(1)
else:
    print('All checks passed.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print()

total_lines = html.count('\n') + 1
print('Written to', DST)
print('Total lines after patch: %d' % total_lines)
print()
print('Beta 0.348 changes:')
print('  - ppQty: DTB static input keeps id="ppQty"; panel input renamed to id="ppFormQty"')
print('    Panel oninput mirrors value to DTB ppQty (engine reads DTB as canonical)')
print('  - ppRiskPct: DTB static keeps id="ppRiskPct"; panel renamed to id="ppFormRiskPct"')
print('    Panel oninput mirrors value to DTB ppRiskPct then calls _updateSummaryBar()')
print('  - ppOrderType: DTB hidden keeps id="ppOrderType"; panel select→id="ppFormOrderType"')
print('    Panel onchange mirrors value to hidden ppOrderType then calls _onTypeChange()')
print('  - dvl290LiqRow: dvl297 buildPanel container renamed to dvl297LiqRow')
print('    (dvl297 accesses its children by their own dvl297-prefixed IDs — safe rename)')
print('  - syncToPaper(): now also syncs ppFormQty when dvl279 entry calc updates quantity')
print('  - Version: Beta 0.348')
