# patch_580.py — Beta 0.580
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.579)
#
# REPLACE: 0.579 pinch-assist (buggy) → improved version
#
# BUGS IN 0.579 PINCH-ASSIST:
#
#  1. _dvlPinchEnd cleared chartDragState = null BEFORE the canvas's
#     endPointer() ran. The canvas reads chartDragState to decide wasTap →
#     it was always null → tap-to-crosshair / tap-to-hide broken for
#     ALL single-finger taps (regression in 0.579).
#
#  2. No stopImmediatePropagation during pinch → oscillator handlers still
#     ran their drag logic for the second finger, causing the oscillator
#     strip to jump while zooming ("buga tudo").
#
#  3. No _dvlWinPointers tracking → _dvlPinchEnd interfered with the
#     canvas's own pointer cleanup even for canvas-native pointers.
#
# FIX:
#  • _dvlWP (Set): tracks only pointers added by the WINDOW handler.
#    _dvlPinchEnd ONLY removes window-managed pointers; canvas handles its
#    own pointers via endPointer(). chartDragState is NEVER touched here.
#  • _dvlPinchDown: when 2nd finger triggers pinch, calls
#    stopImmediatePropagation() so oscillators can't start a drag.
#    Also calls clearCrossPressTimer()+crossMovedBeforeHold to kill any
#    pending long-press.
#  • _dvlPinchMove: calls stopImmediatePropagation() while pinch is
#    active so oscillator pointermove handlers can't scroll their panels.
#
# VERSION: 0.579 → 0.580

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

# ── REPLACE 0.579 pinch-assist with corrected version ─────────────────────────
OLD_PINCH = '''\
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
})();'''

NEW_PINCH = '''\
// DVL 0.580 pinch-assist: catches second finger anywhere on screen.
// _dvlWP tracks only window-managed pointers so cleanup never interferes
// with the canvas endPointer() tap/crosshair detection.
// stopImmediatePropagation() during pinch prevents oscillator drag.
(function(){
  var _dvlWP = new Set();

  function _dvlPinchDown(ev){
    if(chartPointers.size < 1 || chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
    _dvlWP.add(ev.pointerId);
    if(chartPointers.size !== 2) return;
    try{ clearCrossPressTimer(); crossMovedBeforeHold = true; }catch(_){}
    var pts = Array.from(chartPointers.values());
    chartPinchState = {
      distance: Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y)),
      viewCount: chartViewCount,
      range: priceViewRange,
      centerX: (pts[0].x+pts[1].x)/2
    };
    chartDragState = null;
    ev.stopImmediatePropagation();
  }

  function _dvlPinchMove(ev){
    if(!chartPinchState || !chartPointers.has(ev.pointerId)) return;
    try{ clearCrossPressTimer(); }catch(_){}
    ev.stopImmediatePropagation();
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
    if(!_dvlWP.has(ev.pointerId)) return;
    _dvlWP.delete(ev.pointerId);
    chartPointers.delete(ev.pointerId);
    if(chartPointers.size < 2) chartPinchState = null;
    // chartDragState intentionally NOT touched — canvas endPointer() reads it
  }

  window.addEventListener("pointerdown",   _dvlPinchDown, {capture:true, passive:false});
  window.addEventListener("pointermove",   _dvlPinchMove, {capture:true, passive:false});
  window.addEventListener("pointerup",     _dvlPinchEnd,  {capture:true});
  window.addEventListener("pointercancel", _dvlPinchEnd,  {capture:true});
})();'''

html = rep(html, OLD_PINCH, NEW_PINCH,
    'replace 0.579 pinch-assist with 0.580 (_dvlWP + stopImmediatePropagation + no chartDragState clear)')

# ── Version bump: 0.579 → 0.580 ───────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.579";',
    'const DVL_APP_VERSION = "Beta 0.580";',
    'DVL_APP_VERSION 0.579→0.580'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Pinch zoom corrigido: segundo dedo agora registrado em qualquer elemento da tela via window capture, nao apenas sobre o canvas do grafico. viewport maximum-scale=1 adicionado para impedir zoom de pagina do browser durante pinch." },',
    '{ version: DVL_APP_VERSION, note: "Pinch-assist reescrito: _dvlWP rastreia ponteiros do window handler para nao interferir no tap/crosshair do canvas. stopImmediatePropagation durante pinch impede drag dos osciladores. clearCrossPressTimer no inicio do pinch." },\n  { version: "Beta 0.579", note: "Pinch zoom corrigido: segundo dedo agora registrado em qualquer elemento da tela via window capture, nao apenas sobre o canvas do grafico. viewport maximum-scale=1 adicionado para impedir zoom de pagina do browser durante pinch." },',
    'DVL_CHANGELOG 0.580'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.579</title>',
    '<title>DVL Binance Live — Beta 0.580</title>',
    'title 0.579→0.580'
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
