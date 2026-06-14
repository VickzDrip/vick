# patch_582.py — Beta 0.582
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.581)
#
# GOAL (user request): recover the OLD DVL zoom *mechanic* — which felt
# perfect — and implement it on the current 0.577+ codebase.
#
# WHY THE NEW ZOOM FELT BAD (two root causes found):
#
#  1. INTEGER QUANTIZATION. The new model stores the view as
#     chartViewCount (a candle count). clampChartViewport() did
#     Math.round(chartViewCount) and visibleWindow() did Math.round again
#     for totalSlots. So the zoom snapped to whole candles: a slow pinch
#     either jumped a full candle or did nothing → "stepping"/jank.
#     The OLD DVL used a CONTINUOUS float view (S.view.start/end), which is
#     why it was buttery smooth.
#     FIX: keep chartViewCount / chartOffsetCandles as FLOATS. The renderer
#     already positions candles via a float slotOffset, so fractional
#     totalSlots renders smoothly. Array slicing still uses integers
#     (Math.round/ceil) — only the SCALE is now continuous.
#
#  2. PINCH MATH. The new pinch computed ratio = (curDist/startDist)^1.08
#     from the FIXED start distance every frame, with NO simultaneous pan.
#     Any finger jitter mapped straight to a view jump, and the zoom didn't
#     follow the fingers' midpoint → felt unanchored/jumpy.
#     The OLD DVL pinch was INCREMENTAL + DAMPED + PANNED:
#       raw    = lastDist / newDist
#       factor = clamp(1 + (raw-1)*0.72, .88, 1.12)   // damp 0.72, ±12%/move
#       zoom(factor, anchorRel); then pan by midpoint delta; lastDist=newDist
#     FIX: port that exact mechanic into the window-level pinch handler
#     (which is already the sole pinch authority during a gesture because it
#     stopImmediatePropagation()s the canvas/oscillator handlers).
#
# Wheel zoom is left as-is — with the float view it is already smooth (no
# more integer snapping). Price-scale (Y) zoom is untouched.
#
# VERSION: 0.581 → 0.582

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

# ── FIX 1: clampChartViewport — keep view continuous (no integer rounding) ─────
html = rep(html,
'''  chartViewCount = clamp(Math.round(chartViewCount), minViewCandles(), maxViewCandles());
  const maxOffset = Math.max(0, (klines.length || 0) - Math.min(chartViewCount, klines.length || chartViewCount));
  const maxFuture = Math.max(20, Math.round(chartViewCount * 0.70));
  chartOffsetCandles = clamp(Math.round(chartOffsetCandles), -maxFuture, maxOffset);''',
'''  chartViewCount = clamp(chartViewCount, minViewCandles(), maxViewCandles());
  const maxOffset = Math.max(0, (klines.length || 0) - Math.min(chartViewCount, klines.length || chartViewCount));
  const maxFuture = Math.max(20, chartViewCount * 0.70);
  chartOffsetCandles = clamp(chartOffsetCandles, -maxFuture, maxOffset);''',
    'clampChartViewport: continuous float view (remove integer quantization)')

# ── FIX 2: visibleWindow — float totalSlots/futureSlots, integer slicing only ──
html = rep(html,
'''  const totalSlots = Math.round(chartViewCount);
  const futureSlots = Math.max(0, -Math.round(chartOffsetCandles));
  const pastOffset = Math.max(0, Math.round(chartOffsetCandles));
  const visibleSlots = Math.max(1, totalSlots - futureSlots);''',
'''  const totalSlots = chartViewCount;                       // float: smooth candle width/spacing
  const futureSlots = Math.max(0, -chartOffsetCandles);    // float: smooth right-edge gap
  const pastOffset = Math.max(0, Math.round(chartOffsetCandles)); // int: array slice index
  const visibleSlots = Math.max(1, Math.ceil(totalSlots - futureSlots)); // int: how many candles to slice''',
    'visibleWindow: float positioning, integer slicing')

# ── FIX 3: replace window pinch handler with OLD DVL incremental-damped mechanic ─
OLD_PINCH = '''// DVL 0.580 pinch-assist: catches second finger anywhere on screen.
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

NEW_PINCH = '''// DVL 0.582 pinch engine: OLD DVL mechanic ported to the current view model.
// Incremental + damped factor (0.72) + per-move clamp (±12%) + simultaneous
// pan by the fingers' midpoint — the "perfect" feel from legacy DVL.
// This window handler is the sole pinch authority during a gesture because it
// stopImmediatePropagation()s the canvas + oscillator handlers.
// _dvlWP tracks only window-managed pointers so cleanup never disturbs the
// canvas endPointer() tap/crosshair logic.
(function(){
  var _dvlWP = new Set();
  var _dvlPinch = null; // {lastDist, lastMidX}

  function _plotW(rect){ return Math.max(1, rect.width - PRICE_SCALE_W); }

  function _dvlPinchDown(ev){
    if(chartPointers.size < 1 || chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
    _dvlWP.add(ev.pointerId);
    if(chartPointers.size !== 2) return;
    try{ clearCrossPressTimer(); crossMovedBeforeHold = true; }catch(_){}
    var pts = Array.from(chartPointers.values());
    _dvlPinch = {
      lastDist: Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y)),
      lastMidX: (pts[0].x+pts[1].x)/2
    };
    chartPinchState = _dvlPinch; // keep truthy for any external checks
    chartDragState = null;
    ev.stopImmediatePropagation();
  }

  function _dvlPinchMove(ev){
    if(!_dvlPinch || !chartPointers.has(ev.pointerId)) return;
    try{ clearCrossPressTimer(); }catch(_){}
    ev.stopImmediatePropagation();
    chartPointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
    var pts = Array.from(chartPointers.values());
    if(pts.length < 2) return;

    var nd    = Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y));
    var midX  = (pts[0].x+pts[1].x)/2;

    // OLD DVL incremental damped factor (smooth, jitter-proof)
    var raw    = _dvlPinch.lastDist / nd;             // >1 = fingers closing = zoom out
    var factor = clamp(1 + (raw-1)*0.72, 0.88, 1.12); // damp 0.72, clamp ±12% per move

    var rect    = els.canvas.getBoundingClientRect();
    var plotW   = _plotW(rect);
    var spacing = plotW / Math.max(chartViewCount, 1);
    var xRatio  = clamp((midX - rect.left) / plotW, 0, 1);

    // Anchored zoom (keep the candle under the midpoint fixed)
    var oldCount = chartViewCount;
    var candleAtPointerFromRight = chartOffsetCandles + (1 - xRatio) * oldCount;
    chartViewCount = clamp(oldCount * factor, minViewCandles(), maxViewCandles());
    chartOffsetCandles = candleAtPointerFromRight - (1 - xRatio) * chartViewCount;

    // Simultaneous pan by midpoint movement (legacy DVL behavior)
    var dxMid = midX - _dvlPinch.lastMidX;
    chartOffsetCandles += (dxMid / Math.max(spacing, 0.0001)) * CHART_DRAG_SENSITIVITY;

    clampChartViewport();
    drawSoon();

    _dvlPinch.lastDist = nd;
    _dvlPinch.lastMidX = midX;
  }

  function _dvlPinchEnd(ev){
    if(!_dvlWP.has(ev.pointerId)) return;
    _dvlWP.delete(ev.pointerId);
    chartPointers.delete(ev.pointerId);
    if(chartPointers.size < 2){ chartPinchState = null; _dvlPinch = null; }
    // chartDragState intentionally NOT touched — canvas endPointer() reads it
  }

  window.addEventListener("pointerdown",   _dvlPinchDown, {capture:true, passive:false});
  window.addEventListener("pointermove",   _dvlPinchMove, {capture:true, passive:false});
  window.addEventListener("pointerup",     _dvlPinchEnd,  {capture:true});
  window.addEventListener("pointercancel", _dvlPinchEnd,  {capture:true});
})();'''

html = rep(html, OLD_PINCH, NEW_PINCH,
    'pinch engine: port legacy DVL incremental-damped + pan mechanic')

# ── Version bump: 0.581 → 0.582 ───────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.581";',
    'const DVL_APP_VERSION = "Beta 0.582";',
    'DVL_APP_VERSION 0.581→0.582')
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Badge de versao corrigido: era texto estatico fixo em BETA 0.577. Agora atualiza automaticamente a partir de DVL_APP_VERSION em todo bump futuro." },',
    '{ version: DVL_APP_VERSION, note: "Mecanica de zoom do DVL antigo recuperada. (1) View agora continua em float: removida a quantizacao inteira de chartViewCount/chartOffsetCandles que causava stepping/travamento no zoom; o renderer ja posiciona em float, slicing continua inteiro. (2) Pinch portado do DVL legado: fator incremental amortecido (0.72) + clamp +/-12% por passo + pan simultaneo pelo ponto medio dos dedos. Wheel fica suave automaticamente com a view continua." },\n  { version: "Beta 0.581", note: "Badge de versao corrigido: era texto estatico fixo em BETA 0.577. Agora atualiza automaticamente a partir de DVL_APP_VERSION em todo bump futuro." },',
    'DVL_CHANGELOG 0.582')
html = rep(html,
    '<title>DVL Binance Live — Beta 0.581</title>',
    '<title>DVL Binance Live — Beta 0.582</title>',
    'title 0.581→0.582')

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
