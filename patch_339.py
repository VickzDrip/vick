# patch_339.py — Beta 0.339 — structural cleanup
# SOURCE: DVL_beta334_source.html (Beta 0.334)
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html
#
# What this patch does (NO restructuring):
#  1. Kill all forceVersion() from setIntervals — the root cause of flickering
#  2. Kill both qa('body *') DOM-walkers — very expensive per-tick DOM traversal
#  3. Remove redundant CG_CACHE ensureData() interval (CG327 supersedes it)
#  4. Neutralize Beta 0.329 keepCgSettingsInModal() loop (Beta 0.334 handles modal)
#  5. Neutralize Beta 0.331/0.332/0.333 gear intervals (Beta 0.334 supersedes them)
#  6. Fix __drawCGLongShortPanel → single color-changing line (no bars)
#  7. Default cgLsMode → accounts-global (from taker) everywhere in defaults()
#  8. Version → Beta 0.339 (change only Beta 0.334's VER declaration, last to run)
#  9. Copy cleaned file to target path

import re

SRC = 'DVL_beta334_source.html'
DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(SRC, 'r', encoding='utf-8') as f:
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
    fixes.append(label)
    return html.replace(old, new)

# ── 1. VERSION: change Beta 0.334's VER to 0.339 (last forceVersion to run) ─
html = rep(html,
    "  const VER='Beta 0.334';",
    "  const VER='Beta 0.339';",
    'VER 0.334→0.339 in final script'
)

# Also update changelog note in 0.334
html = rep(html,
    "'Hard-fixed CoinGlass settings gear: sidebar and chart gears now open from a dedicated 0.334 handler, independent of legacy modal/canvas handlers.'",
    "'Beta 0.339: Cleaned duplicate CG patch loops, killed flickering intervals, single-line L/S ratio, accounts-global default.'",
    'changelog note 0.334'
)
html = rep(html,
    "'CoinGlass chart controls replaced with final DOM eye/gear buttons and old CG hitboxes are neutralized after positioning.'",
    "'Removed all forceVersion() from setIntervals and body-* DOM walker — no more badge flicker or reflow on every tick.'",
    'changelog note 0.334 second'
)

# ── 2. Kill Beta 0.334's 350ms setInterval (WORST offender) ─────────────────
# updateChartButtons is already wired to draw hook — no interval needed
html = rep(html,
    'setInterval(function(){forceVersion();bindSidebarGears();updateChartButtons();},350);',
    '/* interval removed — updateChartButtons wired to draw hook, bindSidebarGears has guard */',
    'kill 350ms interval (0.334)'
)

# ── 3. Kill Beta 0.333's 600ms setInterval ───────────────────────────────────
# bindCapture already has window.__dvl333CgCaptureBound guard
html = rep(html,
    'setInterval(function(){forceVersion();bindCapture();},600);',
    '/* interval removed — bindCapture has one-time guard */',
    'kill 600ms interval (0.333)'
)

# ── 4. Kill Beta 0.329's 1000ms keepCgSettingsInModal loop ──────────────────
# Beta 0.334 manages the modal directly; this loop is obsolete
html = rep(html,
    'setInterval(function(){forceVersion();wrapModal();bindGears();if(activeCgSettings)keepCgSettingsInModal();},1000);',
    '/* interval removed — Beta 0.334 modal supersedes 0.329 */',
    'kill 1000ms interval (0.329)'
)

# ── 5. Kill Beta 0.331's 1200ms setInterval ──────────────────────────────────
html = rep(html,
    'setInterval(function(){forceVersion();bindFastGear();enhanceModal();},1200);',
    '/* interval removed — Beta 0.334 gear supersedes 0.331 */',
    'kill 1200ms interval (0.331)'
)

# ── 6. Kill Beta 0.332's 1400ms setInterval ──────────────────────────────────
html = rep(html,
    'setInterval(function(){forceVersion();bind();},1400);',
    '/* interval removed — Beta 0.334 gear supersedes 0.332 */',
    'kill 1400ms interval (0.332)'
)

# ── 7. Strip forceVersion() from Beta 0.328's 1500ms interval ────────────────
html = rep(html,
    'setInterval(function(){forceVersion();standardizeCards();patchDrawControls();updateOscButtons();},1500);',
    'setInterval(function(){standardizeCards();patchDrawControls();updateOscButtons();},1500);',
    'strip forceVersion from 1500ms interval (0.328)'
)

# ── 8. Kill Beta 0.330's 1500ms interval entirely ────────────────────────────
# bindGearCapture/bindFitReset superseded by 0.334
html = rep(html,
    'setInterval(function(){forceVersion();bindGearCapture();bindFitReset();},1500);',
    '/* interval removed — bindGearCapture/bindFitReset superseded by 0.334 */',
    'kill 1500ms interval (0.330)'
)

# ── 9. Strip forceVersion() from 1600ms interval (line ~61438) ───────────────
html = rep(html,
    'setInterval(function(){forceVersion();polishCards();hideOverlayPaint();},1600);',
    'setInterval(function(){polishCards();hideOverlayPaint();},1600);',
    'strip forceVersion from 1600ms (0.326 polish)'
)

# ── 10. Strip forceVersion() from other 1600ms interval (line ~61138) ─────────
html = rep(html,
    'setInterval(()=>{forceVersion();markLev();},1600);',
    'setInterval(()=>{markLev();},1600);',
    'strip forceVersion from 1600ms markLev'
)

# ── 11. Kill standalone 1800ms forceVersion-only interval ─────────────────────
html = rep(html,
    'setInterval(forceVersion,1800);',
    '/* setInterval(forceVersion) removed — badge set once at boot */',
    'kill 1800ms forceVersion-only interval'
)

# ── 12. Strip forceVersion() from footprint 1800ms interval ───────────────────
html = rep(html,
    'setInterval(function(){forceVersion();patchFootprintLabel();},1800);',
    'setInterval(function(){patchFootprintLabel();},1800);',
    'strip forceVersion from 1800ms footprint'
)

# ── 13. Kill Beta 0.325's 30s ensureData interval (CG327 supersedes) ──────────
html = rep(html,
    'setInterval(function(){forceVersion();ensureData();},30000);',
    '/* CG_CACHE ensureData interval removed — CG327 handles fetching */',
    'kill 30s CG_CACHE ensureData interval (0.325)'
)

# ── 14. Strip forceVersion() from Beta 0.327's 30s interval ───────────────────
html = rep(html,
    'setInterval(()=>{forceVersion();assignGlobalHelpers();ensure327();},30000);',
    'setInterval(()=>{assignGlobalHelpers();ensure327();},30000);',
    'strip forceVersion from 30s CG327 interval (0.327)'
)

# ── 15. Kill Beta 0.328's body-* DOM walker ────────────────────────────────────
html = rep(html,
    "  qa('body *').forEach(el=>{if(!el||el.children.length)return;const t=(el.textContent||'').trim();if(/^Beta\\s+0\\.\\d{3}$/i.test(t))el.textContent=VER;});",
    "  /* body-* walker removed — caused full DOM traversal on every badge update */",
    'kill body-* walker (0.328)'
)

# ── 16. Kill Beta 0.326's body-* DOM walker ────────────────────────────────────
html = rep(html,
    """    /* Some legacy patches write literal Beta text into custom header nodes; update only exact version labels. */
    qa('body *').forEach(el=>{
      if(!el || el.children.length) return;
      const t=(el.textContent||'').trim();
      if(/^Beta\\s+0\\.\\d{3}$/i.test(t)) el.textContent=VER;
    });""",
    "    /* body-* walker removed — caused full DOM traversal on every badge update */",
    'kill body-* walker (0.326)'
)

# ── 17. Fix __drawCGLongShortPanel → single color-changing line ────────────────
# Replace the current bars+line drawing with a single segmented color line.
# The current function ends with: ctx.restore();}; at line 61510
# We need to replace the drawing body inside ctx.clip() ... ctx.restore()

OLD_LS_DRAW = (
    'if(vals.length){const ratios=vals.map(v=>v.ratio).concat([1]);'
    'const ys=yScale(\'cgLs\',ratios,1,1.2);const zero=yy(L,1,ys);'
    'ctx.strokeStyle=\'rgba(0,212,255,.35)\';ctx.setLineDash([4,6]);'
    'ctx.beginPath();ctx.moveTo(L.plotLeft,zero);ctx.lineTo(L.plotRight,zero);'
    'ctx.stroke();ctx.setLineDash([]);'
    'ctx.strokeStyle=\'rgba(35,50,72,.72)\';ctx.lineWidth=.8;'
    'for(let k=0;k<3;k++){const y=L.plotTop+(L.plotBottom-L.plotTop)*k/2;'
    'ctx.beginPath();ctx.moveTo(L.plotLeft,y);ctx.lineTo(L.plotRight,y);ctx.stroke();}'
    'const bw=Math.max(1,(CW(W)/Math.max(1,V.span))*0.62);'
    'for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;'
    'const xx=x(i),yr=yy(L,d.ratio,ys);'
    'ctx.fillStyle=d.ratio>=1?\'rgba(0,220,170,.58)\':\''
    "rgba(255,95,90,.58)';"
    'ctx.fillRect(xx-bw/2,Math.min(zero,yr),bw,Math.max(1,Math.abs(yr-zero)));}'
    "if(val('cgLsShowAverage','on')!=='off'){"
    'ctx.beginPath();let st=false;'
    'for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;'
    'const xx=x(i),yr=yy(L,d.ratio,ys);'
    "if(!st){ctx.moveTo(xx,yr);st=true;}else ctx.lineTo(xx,yr);}"
    "ctx.strokeStyle='rgba(0,230,245,.98)';ctx.lineWidth=1.8;"
    "ctx.shadowColor='rgba(0,230,245,.34)';ctx.shadowBlur=5;"
    'if(st)ctx.stroke();ctx.shadowBlur=0;}'
    'ctx.restore();scaleLabels(ctx,L,ys,v=>v.toFixed(2));return;}'
    'ctx.restore();};\n'
)

NEW_LS_DRAW = (
    'if(vals.length){'
    'const ratios=vals.map(v=>v.ratio).concat([1]);'
    'const ys=yScale(\'cgLs\',ratios,1,1.2);'
    'const zero=yy(L,1,ys);'
    '/* midline */ctx.strokeStyle=\'rgba(0,212,255,.30)\';ctx.setLineDash([4,6]);'
    'ctx.beginPath();ctx.moveTo(L.plotLeft,zero);ctx.lineTo(L.plotRight,zero);ctx.stroke();ctx.setLineDash([]);'
    '/* subtle grid */ctx.strokeStyle=\'rgba(35,50,72,.55)\';ctx.lineWidth=.6;'
    'for(let k=0;k<3;k++){const y=L.plotTop+(L.plotBottom-L.plotTop)*k/2;ctx.beginPath();ctx.moveTo(L.plotLeft,y);ctx.lineTo(L.plotRight,y);ctx.stroke();}'
    '/* single color-changing line: green when ratio>=1, red when <1 */'
    'let px=null,py=null;'
    'for(let i=V.a;i<V.b;i++){'
    'const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;'
    'const xx=x(i),yr=yy(L,d.ratio,ys);'
    'if(px!==null){'
    'ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(xx,yr);'
    'const dom=d.ratio>=1;'
    'ctx.strokeStyle=dom?\'rgba(0,230,155,.98)\':\''
    "rgba(255,85,75,.98)';"
    'ctx.lineWidth=1.8;'
    'ctx.shadowColor=dom?\'rgba(0,225,150,.32)\':\''
    "rgba(255,85,75,.30)';"
    'ctx.shadowBlur=4;ctx.stroke();ctx.shadowBlur=0;}'
    'px=xx;py=yr;}'
    'ctx.restore();scaleLabels(ctx,L,ys,v=>v.toFixed(2));return;}'
    'ctx.restore();};\n'
)

html = rep(html, OLD_LS_DRAW, NEW_LS_DRAW, '__drawCGLongShortPanel single-line')

# ── 18. Default cgLsMode → accounts-global (in ALL defaults() functions) ───────
# Replace 'taker' default in all four defaults() functions (0.330, 0.332, 0.333, 0.334)
html = rep_all(html,
    "cgLsMode:'taker'",
    "cgLsMode:'accounts-global'",
    "default cgLsMode taker→accounts-global"
)

# Fix the select HTML option default in Beta 0.325 card injection
html = rep(html,
    "<option value=\"global\" selected>Global accounts</option><option value=\"top\">Top accounts</option>",
    "<option value=\"accounts-global\" selected>Accounts global</option><option value=\"accounts-top\">Top accounts</option>",
    'L/S mode select default (0.325 HTML)'
)

# ── 19. Update DVL_APP_VERSION assignment at the top of the file ───────────────
# The main file has: const LOCAL_VERSION = "Beta 0.319" or similar
# We want the badge to show 0.339. The 0.334 boot (last to run) handles it.
# But let's also update the main declared version if possible:
html = rep_all(html,
    'window.DVL_APP_VERSION="Beta 0.319"',
    'window.DVL_APP_VERSION="Beta 0.339"',
    'DVL_APP_VERSION top-level'
)
# Some versions use single quotes
html = rep_all(html,
    "window.DVL_APP_VERSION='Beta 0.319'",
    "window.DVL_APP_VERSION='Beta 0.339'",
    'DVL_APP_VERSION top-level single quote'
)

# ── result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    print()
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
print('  Source: Beta 0.334 (%d lines)' % html.count('\n'))
print()
print('Beta 0.339 changes:')
print('  - Killed 350ms / 600ms / 1000ms / 1200ms / 1400ms / 1500ms intervals calling forceVersion()')
print('  - Removed forceVersion() from all remaining setIntervals (1500ms, 1600ms, 1800ms, 30s)')
print('  - Killed both qa(body *) DOM-walker loops — full DOM traversal on every badge tick')
print('  - Removed CG_CACHE 30s ensureData loop (CG327 handles all data fetching)')
print('  - __drawCGLongShortPanel: single color-changing line (green >= 1, red < 1)')
print('  - Default cgLsMode: taker → accounts-global (everywhere in defaults())')
print('  - Version badge: Beta 0.339')
