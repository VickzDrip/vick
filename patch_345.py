# patch_345.py — Beta 0.345
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.344)
#
# Fixes:
#  1. Remove stray </head> (line ~8977) and duplicate <body> (line ~8978):
#     These tags appear inside the document body (after line 3270's <body>).
#     Browsers ignore them in "in body" insertion mode; removing them is safe
#     and eliminates two of the Raio-X structural anomalies.
#  2. Move </body></html> from its current position (after the main app closes
#     at line ~43630) to the very end of the file, so all appended patch
#     blocks (lines ~43631–61950) are properly inside the document body.
#  3. Version bump: 0.344 → 0.345

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

# ── 1. Remove stray </head><body> wrapper tags ───────────────────────────────
# The sequence </style>\n</head>\n<body>\n appears exactly once in the file
# (between the second-head style blocks and the second-body pre-ui script).
# Removing </head>\n<body>\n leaves all surrounding content intact.
html = rep(html,
    '</style>\n</head>\n<body>\n',
    '</style>\n',
    'remove stray </head><body> at ~lines 8977-8978'
)

# ── 2. Move </body></html> to end of file ────────────────────────────────────
# Step 2a: remove </body></html> from its current position (right after the
# main app </script> and before the patch blocks).
html = rep(html,
    '</script>\n</body>\n</html>\n\n\n<style>\n/* V49 FVG Clean Volume Format */',
    '</script>\n\n\n<style>\n/* V49 FVG Clean Volume Format */',
    'move </body></html>: remove from current position (~line 43629)'
)

# Step 2b: append </body></html> at end of file (after last patch </script>).
if html.rstrip().endswith('</script>'):
    html = html.rstrip() + '\n</body>\n</html>\n'
    fixes.append('move </body></html>: appended at end of file')
else:
    errors.append('File does not end with </script> — cannot safely append </body></html>')

# ── 3. Version bump: 0.344 → 0.345 ──────────────────────────────────────────
html = rep_all(html,
    'window.DVL_APP_VERSION = "Beta 0.344";',
    'window.DVL_APP_VERSION = "Beta 0.345";',
    'DVL_APP_VERSION 0.344→0.345'
)
html = rep_all(html,
    'value:"Beta 0.344",writable:false,configurable:false,enumerable:true',
    'value:"Beta 0.345",writable:false,configurable:false,enumerable:true',
    'Object.defineProperty value 0.344→0.345'
)
html = rep_all(html,
    'const LOCAL_VERSION = "Beta 0.344";',
    'const LOCAL_VERSION = "Beta 0.345";',
    'LOCAL_VERSION 0.344→0.345'
)
html = rep(html,
    "  const VER='Beta 0.344';",
    "  const VER='Beta 0.345';",
    'VER 0.344→0.345'
)
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.344</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.345</span>',
    'static dvlVersionBadge 0.344→0.345'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.344</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.345</span>',
    'static dvl-version-logo-hidden 0.344→0.345'
)
html = rep(html,
    "'Beta 0.344: CG cards now use native dvl-icd CSS, correct badge structure, static version badges updated.'",
    "'Beta 0.345: Removed stray </head><body> tags, moved </body></html> to end of file (patches now inside body).'",
    'changelog note 0.345'
)

# ── result ────────────────────────────────────────────────────────────────────
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
print('Beta 0.345 changes:')
print('  - Removed stray </head><body> tags at ~lines 8977-8978')
print('    (were inside the document body; browsers ignored them; now gone)')
print('  - Moved </body></html> to end of file')
print('    (all patch blocks ~43631-61950 are now properly inside the body)')
print('  - Version: Beta 0.345')
