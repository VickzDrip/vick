# patch_579.py — Beta 0.579
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.578)
#
# FIX: Pinch zoom fails when second finger lands outside the chart canvas.
#
# ROOT CAUSE:
#   The main pinch engine (0.487) listens for `pointerdown` on the chart
#   `canvas` element in BUBBLE phase. When the second finger lands on ANY
#   other element (oscillator strip, hotbar, toolbar, labels, etc.) the
#   canvas never receives that `pointerdown`, so chartPointers.size never
#   reaches 2, chartPinchState is never created — and pinch appears broken.
#
#   This is a cross-element boundary issue, NOT a bug in the pinch math.
#   The existing zoom engine logic is correct; it just needs both pointers
#   to be registered before it can start.
#
# FIX (non-invasive):
#   Add window-level CAPTURE listeners (run before any element handler):
#     • pointerdown: if chart already has 1 pointer, register the 2nd
#       anywhere on screen and create chartPinchState
#     • pointermove: if pinch is active, update pointer position and run
#       the same pinch calculation the canvas handler already uses
#     • pointerup / pointercancel: mirror the canvas endPointer cleanup
#
#   The zoom MATH (chartViewCount = chartPinchState.viewCount / ratio, 1.08
#   exponent, clamp) is IDENTICAL to the existing canvas handler — no
#   changes to the zoom engine logic, only the event reception scope.
#
# ALSO: add maximum-scale=1 to viewport meta so the browser never
#   intercepts the pinch as page zoom (belt+suspenders for iOS/Android).
#
# VERSION: 0.578 → 0.579

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

# ── FIX 1: viewport — add maximum-scale=1 (prevents browser page-zoom on pinch) ──
html = rep(html,
    'content="width=device-width, initial-scale=1, viewport-fit=cover"',
    'content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"',
    'viewport: add maximum-scale=1 to prevent page-level pinch zoom'
)

# ── FIX 2: window-level pinch-assist listeners ─────────────────────────────────
PINCH_ASSIST = '''\
// DVL 0.579 pinch-assist: catches second finger anywhere on screen.
// The canvas-level pinch engine only sees pointers that land directly on the
// chart canvas (bubble phase). When a finger lands on an oscillator, hotbar,
// or label, this window capture handler registers it so chartPinchState is
// created and the existing zoom math can run normally.
(function(){
  function _dvlPinchDown(ev){
    if(chartPointers.size < 1 || chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
    if(chartPointers.size !== 2) return;
    var pts = Array.from(chartPointers.values());
    chartPinchState = {
      distance: Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y)),
      viewCount: chartViewCount,
      range: priceViewRange,
      centerX: (pts[0].x+pts[1].x)/2
    };
    chartDragState = null;
  }
  function _dvlPinchMove(ev){
    if(!chartPinchState || !chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
    var pts = Array.from(chartPointers.values());
    if(pts.length < 2) return;
    var dist = Math.max(12, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y));
    var ratio = Math.pow(dist / Math.max(chartPinchState.distance, 12), 1.08);
    chartViewCount = clamp(chartPinchState.viewCount / ratio, minViewCandles(), maxViewCandles());
    clampChartViewport();
    drawSoon();
  }
  function _dvlPinchEnd(ev){
    if(!chartPointers.has(ev.pointerId)) return;
    chartPointers.delete(ev.pointerId);
    if(chartPointers.size < 2) chartPinchState = null;
    if(chartPointers.size === 0) chartDragState = null;
  }
  window.addEventListener("pointerdown",   _dvlPinchDown, {capture:true, passive:false});
  window.addEventListener("pointermove",   _dvlPinchMove, {capture:true, passive:false});
  window.addEventListener("pointerup",     _dvlPinchEnd,  {capture:true});
  window.addEventListener("pointercancel", _dvlPinchEnd,  {capture:true});
})();
'''

html = rep(html,
    'setupChartInteractions();\n\nfunction setupChartMiniControls(){',
    'setupChartInteractions();\n\n' + PINCH_ASSIST + '\nfunction setupChartMiniControls(){',
    'pinch-assist: window-level capture listeners for cross-element 2-finger pinch'
)

# ── Version bump: 0.578 → 0.579 ───────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.578";',
    'const DVL_APP_VERSION = "Beta 0.579";',
    'DVL_APP_VERSION 0.578→0.579'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Chart undo/redo arrows now stay at 50% opacity by default and only light up to 100% when a valid history action exists, keeping the floating look cleaner and more informative." }',
    '{ version: DVL_APP_VERSION, note: "Pinch zoom corrigido: segundo dedo agora registrado em qualquer elemento da tela via window capture, nao apenas sobre o canvas do grafico. viewport maximum-scale=1 adicionado para impedir zoom de pagina do browser durante pinch." },\n  { version: "Beta 0.578", note: "Real 15s/30s aggTrade candles + real footprint data via /api/footprint. server.js tfToMs com suporte a segundos." }',
    'DVL_CHANGELOG 0.579 + preserve 0.578 note'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.577</title>',
    '<title>DVL Binance Live — Beta 0.579</title>',
    'title tag 0.577→0.579'
)

# ── result ────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    print('Aborting write — fix anchors first.')
    sys.exit(1)
else:
    print('All checks passed.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

total_lines = html.count('\n') + 1
print()
print('Written to', DST)
print('Total lines after patch: %d' % total_lines)
