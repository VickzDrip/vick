# patch_344.py — Beta 0.344
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.343)
#
# Fixes:
#  1. Remove ALL oversized card CSS overrides in Beta 0.328 that made CG cards
#     too tall — 40px icon, 48×24px switch, height:60px head, min-width:154px ctrl,
#     display:inline-flex on all badges (forcing ATIVO always visible).
#     The base dvl-icd* CSS already handles card layout correctly.
#  2. Remove the Beta 0.328 @media(max-width:390px) block for CG cards (same issue).
#  3. Remove the extra "OI CANDLES"/"TAKER RATIO" third badge from:
#     a) injectCards() injected HTML (from Beta 0.343)
#     b) normalizeCard() JS function (Beta 0.328 script)
#     Add the correct dvl-bdg-on ATIVO badge in their place.
#  4. Update static version badge HTML: "Beta 0.340" and "Beta 0.317" → "Beta 0.344"
#     (there are two copies of the topbar HTML in the file)
#  5. Version bump: 0.343 → 0.344

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

# ── 1. Remove Beta 0.328 oversized sidebar card CSS block ────────────────────────
# Matches from the "Sidebar:" comment up to (but not including) the "Chart controls:" comment.
START_CSS = '  /* Sidebar: force the two CoinGlass cards to match native indicator cards, not oversized custom blocks. */'
END_CSS   = '  /* Chart controls: visible, clean, same language as the existing oscillator controls. */'
idx_s = html.find(START_CSS)
idx_e = html.find(END_CSS)
if idx_s >= 0 and idx_e > idx_s:
    html = html[:idx_s] + html[idx_e:]
    fixes.append('removed Beta 0.328 oversized card CSS overrides (sidebar block, %d chars)' % (idx_e - idx_s))
else:
    errors.append('NOT FOUND: Beta 0.328 sidebar CSS block (start=%d end=%d)' % (idx_s, idx_e))

# ── 2. Remove Beta 0.328 @media CG card overrides ───────────────────────────────
OLD_MEDIA = (
    '  @media(max-width:390px){\n'
    '    .ind-card[data-card="cgOpenInterest"] .dvl-icd-head,\n'
    '    .ind-card[data-card="cgLongShort"] .dvl-icd-head{\n'
    '      grid-template-columns:44px minmax(0,1fr) 136px!important;\n'
    '      gap:8px!important;\n'
    '      height:58px!important;\n'
    '      min-height:58px!important;\n'
    '      padding:8px!important;\n'
    '    }\n'
    '    .ind-card[data-card="cgOpenInterest"] .dvl-icd-icon,\n'
    '    .ind-card[data-card="cgLongShort"] .dvl-icd-icon{width:38px!important;height:38px!important;min-width:38px!important;}\n'
    '    .ind-card[data-card="cgOpenInterest"] .dvl-icd-name,\n'
    '    .ind-card[data-card="cgLongShort"] .dvl-icd-name,\n'
    '    .ind-card[data-card="cgOpenInterest"] .name,\n'
    '    .ind-card[data-card="cgLongShort"] .name{font-size:12px!important;}\n'
    '    .ind-card[data-card="cgOpenInterest"] .dvl-icd-ctrl,\n'
    '    .ind-card[data-card="cgLongShort"] .dvl-icd-ctrl{min-width:136px!important;gap:5px!important;}\n'
    '    .ind-card[data-card="cgOpenInterest"] .row[data-ind],\n'
    '    .ind-card[data-card="cgLongShort"] .row[data-ind]{width:48px!important;min-width:48px!important;}\n'
    '    .ind-card[data-card="cgOpenInterest"] .gear,\n'
    '    .ind-card[data-card="cgOpenInterest"] .dvl-star,\n'
    '    .ind-card[data-card="cgLongShort"] .gear,\n'
    '    .ind-card[data-card="cgLongShort"] .dvl-star{width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;}\n'
    '  }\n'
)
html = rep(html, OLD_MEDIA, '', 'removed Beta 0.328 CG card @media overrides')

# ── 3a. Fix injectCards() OI card — remove 3rd badge, add ATIVO ─────────────────
html = rep(html,
    '<span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg">OI CANDLES</span>',
    '<span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg dvl-bdg-on">ATIVO</span>',
    'injectCards OI: remove OI CANDLES badge, add ATIVO'
)

# ── 3b. Fix injectCards() L/S card — remove 3rd badge, add ATIVO ────────────────
html = rep(html,
    '<span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg">TAKER RATIO</span>',
    '<span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg dvl-bdg-on">ATIVO</span>',
    'injectCards L/S: remove TAKER RATIO badge, add ATIVO'
)

# ── 3c. Fix normalizeCard() in Beta 0.328 — remove 3rd badge ────────────────────
html = rep(html,
    "info.innerHTML='<div class=\"dvl-icd-name name\">'+title+'</div><div class=\"dvl-icd-meta\"><span class=\"dvl-bdg dvl-bdg-nat\">NATIVO</span><span class=\"dvl-bdg dvl-bdg-on\">ATIVO</span><span class=\"dvl-bdg\">'+badgeText+'</span></div>';",
    "info.innerHTML='<div class=\"dvl-icd-name name\">'+title+'</div><div class=\"dvl-icd-meta\"><span class=\"dvl-bdg dvl-bdg-nat\">NATIVO</span><span class=\"dvl-bdg dvl-bdg-on\">ATIVO</span></div>';",
    'normalizeCard: remove third badge (badgeText)'
)

# ── 4. Update static badge HTML (both topbar copies) ────────────────────────────
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.340</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.344</span>',
    'static dvlVersionBadge 0.340→0.344'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.317</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.344</span>',
    'static dvl-version-logo-hidden 0.317→0.344'
)

# ── 5. Version bump: 0.343 → 0.344 ──────────────────────────────────────────────
html = rep_all(html,
    'window.DVL_APP_VERSION = "Beta 0.343";',
    'window.DVL_APP_VERSION = "Beta 0.344";',
    'DVL_APP_VERSION 0.343→0.344'
)
html = rep_all(html,
    'value:"Beta 0.343",writable:false,configurable:false,enumerable:true',
    'value:"Beta 0.344",writable:false,configurable:false,enumerable:true',
    'Object.defineProperty value 0.343→0.344'
)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.343";',
    'const LOCAL_VERSION = "Beta 0.344";',
    'LOCAL_VERSION 0.343→0.344'
)
html = rep(html,
    "  const VER='Beta 0.343';",
    "  const VER='Beta 0.344';",
    'VER 0.343→0.344'
)
html = rep(html,
    "'Beta 0.343: Removed checkVersion event listeners (focus/pageshow/online/interval), fixed CG button null race, native CG card HTML.'",
    "'Beta 0.344: CG cards now use native dvl-icd CSS, correct badge structure, static version badges updated.'",
    'changelog note 0.344'
)

# ── result ────────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 3:
        print('Too many errors — aborting write.')
        exit(1)
else:
    print('All replacements succeeded.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print()
print('Written to', DST)
print()
print('Beta 0.344 changes:')
print('  - Beta 0.328 oversized card CSS removed: icon 40→28px, switch 48×24→30×15px,')
print('    head height 60px removed, ctrl min-width removed, force-display on badges removed')
print('  - CG cards now use native dvl-icd* CSS — same height and proportions as other cards')
print('  - dvl-bdg-on ATIVO badge: hidden by default, visible only when toggle is ON (base CSS)')
print('  - injectCards() and normalizeCard(): third badge removed, ATIVO badge added')
print('  - Static badge HTML updated: Beta 0.340→0.344, Beta 0.317→0.344 (both topbar copies)')
print('  - Version: Beta 0.344')
