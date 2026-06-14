# patch_583.py — Beta 0.583
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.582)
#
# REWRITE FROM SCRATCH: unified zoom/pinch/drag mechanics
#
# ROOT CAUSE OF ALL PREVIOUS PINCH FAILURES:
#   The old design split pointer handling between two places:
#     1. canvas.addEventListener("pointerdown", ...) — bubble phase
#        → only fires when the finger lands ON the canvas element
#     2. window IIFE — window capture, but checked chartPointers.size >= 1
#        first, meaning it depended on (1) having already run
#   When both fingers go down near-simultaneously, the window capture for
#   the 2nd finger can fire BEFORE the canvas bubble has processed the 1st
#   finger → chartPointers.size is still 0 → IIFE returns early → pinch
#   never starts. This is why pinch was unreliable.
#
# FIX:
#   One unified setupChartInteractions() using window-level capture for
#   ALL pointer events. The window fires before everything else, so there
#   is no race condition. The old canvas bubble handlers and the 0.582
#   window IIFE are both removed — replaced by this single function.
#
#   Design:
#   • First finger: accepted only if ev.target === canvas (prevents random
#     taps on buttons/overlays from triggering chart interaction)
#   • Second finger: accepted from anywhere (cross-element pinch works)
#   • Pinch zoom: incremental damped factor 0.72, ±12% clamp per move
#     (the "perfect" feel recovered from legacy DVL 0.076)
#   • Simultaneous pan by midpoint delta
#   • stopImmediatePropagation() only during pinch (2nd finger down/move)
#   • Crosshair / tap / drag / price-scale drag: all preserved
#
# VERSION: 0.582 → 0.583

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

# ── NEW setupChartInteractions() ──────────────────────────────────────────────
NEW_SETUP = '''\
function setupChartInteractions(){
  const canvas = els.canvas;
  if(!canvas) return;

  function candleSpacing(){
    const rect = canvas.getBoundingClientRect();
    return Math.max(1, (rect.width - PRICE_SCALE_W) / Math.max(chartViewCount, 1));
  }
  function isOnPriceScale(cx){
    return cx >= canvas.getBoundingClientRect().right - PRICE_SCALE_W;
  }
  function chartHeightForPrice(){
    const rect = canvas.getBoundingClientRect();
    return Math.max(rect.height - (indicatorsOn ? 36 : 24) - 4, 1);
  }

  // ── Wheel: time-axis zoom + price-scale zoom ──────────────────────────────
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? 0.88 : 1.16;
    if(isOnPriceScale(ev.clientX)) zoomPriceScaleAt(ev.clientY, factor);
    else                            zoomChartAt(ev.clientX, factor);
  }, {passive:false});

  // ── Unified window-capture pointer handling ───────────────────────────────
  // chartPointers (outer scope Map) tracks all active chart pointers.
  // _pinch is the incremental pinch state, null when not pinching.
  var _pinch = null;

  function _onDown(ev){
    if(window.__dvlPositionDragActive) return;

    // First finger: must land on the canvas
    if(chartPointers.size === 0){
      if(ev.target !== canvas) return;
      chartPointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});

      clearCrossPressTimer();
      crossMovedBeforeHold = false;
      crosshair.active  = false;
      crossDragState    = null;

      const onScale    = isOnPriceScale(ev.clientX);
      const insidePrice = pointInsidePriceArea(ev.clientX, ev.clientY);

      if(crosshair.visible && insidePrice && !onScale){
        crosshair.active = true;
        crossDragState = {
          startPointerX: ev.clientX, startPointerY: ev.clientY,
          startCrossX: crosshair.x, startCrossY: crosshair.y,
          moved: false, fromVisibleCross: true
        };
        chartDragState = null;
        return;
      }

      chartDragState = {
        x: ev.clientX, y: ev.clientY,
        offset: chartOffsetCandles, priceCenter: priceViewCenter,
        priceRange: priceViewRange, onScale
      };

      if(!onScale && insidePrice){
        crossPressTimer = setTimeout(() => {
          if(!crossMovedBeforeHold && chartPointers.has(ev.pointerId)){
            crosshair.active = true;
            const rect = canvas.getBoundingClientRect();
            crossDragState = {
              startPointerX: ev.clientX, startPointerY: ev.clientY,
              startCrossX: crosshair.visible ? crosshair.x : ev.clientX - rect.left,
              startCrossY: crosshair.visible ? crosshair.y : ev.clientY - rect.top,
              moved: false, fromVisibleCross: crosshair.visible
            };
            chartDragState = null;
            if(!crosshair.visible){
              setCrosshairFromClient(ev.clientX, ev.clientY);
              crossDragState.startCrossX = crosshair.x;
              crossDragState.startCrossY = crosshair.y;
            } else {
              drawSoon();
            }
          }
        }, 240);
      }
      return;
    }

    // Additional finger → pinch
    if(chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    if(chartPointers.size === 2){
      clearCrossPressTimer();
      crossMovedBeforeHold = true;
      const pts = Array.from(chartPointers.values());
      _pinch = {
        lastDist: Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y)),
        lastMidX: (pts[0].x+pts[1].x)/2
      };
      chartPinchState = _pinch;
      chartDragState  = null;
    }
    ev.stopImmediatePropagation();
  }

  function _onMove(ev){
    if(window.__dvlPositionDragActive) return;
    if(!chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});

    // Pinch mode — incremental damped zoom + midpoint pan (legacy DVL feel)
    if(_pinch && chartPointers.size >= 2){
      clearCrossPressTimer();
      ev.stopImmediatePropagation();
      const pts  = Array.from(chartPointers.values());
      const nd   = Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y));
      const midX = (pts[0].x+pts[1].x)/2;
      const raw    = _pinch.lastDist / nd;
      const factor = clamp(1 + (raw-1)*0.72, 0.88, 1.12);
      const rect   = canvas.getBoundingClientRect();
      const pw     = Math.max(1, rect.width - PRICE_SCALE_W);
      const xRatio = clamp((midX - rect.left) / pw, 0, 1);
      const rightAnchor = chartOffsetCandles + (1 - xRatio) * chartViewCount;
      const oldCount    = chartViewCount;
      chartViewCount    = clamp(oldCount * factor, minViewCandles(), maxViewCandles());
      chartOffsetCandles = rightAnchor - (1 - xRatio) * chartViewCount;
      const spacing = pw / Math.max(chartViewCount, 1);
      chartOffsetCandles += ((midX - _pinch.lastMidX) / Math.max(spacing, 0.001)) * CHART_DRAG_SENSITIVITY;
      clampChartViewport();
      drawSoon();
      _pinch.lastDist = nd;
      _pinch.lastMidX = midX;
      return;
    }

    // Crosshair drag
    if(crosshair.active && crossDragState){
      const dx = ev.clientX - crossDragState.startPointerX;
      const dy = ev.clientY - crossDragState.startPointerY;
      if(Math.hypot(dx, dy) > 3) crossDragState.moved = true;
      if(crossDragState.moved) moveCrosshairByDelta(dx, dy);
      return;
    }

    // Chart / price-scale drag
    if(chartDragState){
      const dx = ev.clientX - chartDragState.x;
      const dy = ev.clientY - chartDragState.y;
      if(Math.hypot(dx, dy) > 7){ crossMovedBeforeHold = true; clearCrossPressTimer(); }
      if(chartDragState.onScale){
        if(Number.isFinite(chartDragState.priceRange)){
          const zf = Math.exp(dy * 0.0075);
          priceViewRange  = clamp(chartDragState.priceRange * zf, 0.0000001, chartDragState.priceRange * 1e6);
          priceViewCenter = chartDragState.priceCenter;
          priceScaleLocked = true;
        }
      } else {
        chartOffsetCandles = chartDragState.offset + (dx / candleSpacing()) * CHART_DRAG_SENSITIVITY;
        if(Number.isFinite(chartDragState.priceCenter) && Number.isFinite(priceViewRange)){
          priceViewCenter = chartDragState.priceCenter + dy * (priceViewRange / chartHeightForPrice()) * PRICE_DRAG_SENSITIVITY;
          priceScaleLocked = true;
        }
      }
      clampChartViewport();
      drawSoon();
    }
  }

  function _onEnd(ev){
    if(!chartPointers.has(ev.pointerId)) return;
    chartPointers.delete(ev.pointerId);

    // Pinch ended — reset and give remaining finger a fresh drag baseline
    if(_pinch){
      if(chartPointers.size < 2){
        _pinch = null;
        chartPinchState = null;
        if(chartPointers.size === 1){
          const rem = chartPointers.values().next().value;
          chartDragState = {
            x: rem.x, y: rem.y,
            offset: chartOffsetCandles,
            priceCenter: priceViewCenter, priceRange: priceViewRange,
            onScale: false
          };
        } else {
          chartDragState = null;
        }
      }
      clearCrossPressTimer();
      crosshair.active = false;
      crossDragState   = null;
      return;
    }

    // Tap detection
    const insidePrice   = pointInsidePriceArea(ev.clientX, ev.clientY);
    const wasTap        = chartDragState && !chartDragState.onScale &&
                          !crossMovedBeforeHold && insidePrice;
    const crossTapToHide = crosshair.visible && insidePrice && !dvlDrawingModeActive() &&
      ((crosshair.active && crossDragState && crossDragState.fromVisibleCross && !crossDragState.moved) ||
       (wasTap && chartPointers.size === 0));

    clearCrossPressTimer();

    if(crossTapToHide){
      hideCrosshair();
    } else if(wasTap && !crosshair.active && chartPointers.size === 0 && !crosshair.visible && !dvlDrawingModeActive()){
      setCrosshairFromClient(ev.clientX, ev.clientY);
    }

    crosshair.active = false;
    crossDragState   = null;
    if(chartPointers.size < 2) chartPinchState = null;
    if(chartPointers.size === 0) chartDragState = null;
  }

  window.addEventListener("pointerdown",   _onDown, {capture:true, passive:false});
  window.addEventListener("pointermove",   _onMove, {capture:true, passive:false});
  window.addEventListener("pointerup",     _onEnd,  {capture:true});
  window.addEventListener("pointercancel", _onEnd,  {capture:true});
}'''

# ── Replace setupChartInteractions() + remove 0.582 IIFE ─────────────────────
# Use unique start/end markers to locate the block without typing it out in full.
START_MARK = '\nfunction setupChartInteractions(){\n  const canvas = els.canvas;\n  if(!canvas) return;\n'
END_MARK   = '\n})();\n\nfunction setupChartMiniControls(){'

si = html.find(START_MARK)
ei = html.find(END_MARK)

if si == -1:
    errors.append('NOT FOUND: setupChartInteractions start marker')
elif ei == -1:
    errors.append('NOT FOUND: IIFE end marker (before setupChartMiniControls)')
else:
    old_block = html[si : ei + len(END_MARK)]
    cnt = html.count(old_block)
    if cnt != 1:
        errors.append('AMBIGUOUS (%dx): setupChartInteractions block' % cnt)
    else:
        new_block = '\n' + NEW_SETUP + '\n\nfunction setupChartMiniControls(){'
        fixes.append('setupChartInteractions + 0.582 IIFE → unified window-capture rewrite (0.583)')
        html = html[:si] + new_block + html[ei + len(END_MARK):]

# ── Version bump 0.582 → 0.583 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.582";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;\n'
    'try{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}',
    'const DVL_APP_VERSION = "Beta 0.583";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;\n'
    'try{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}',
    'DVL_APP_VERSION 0.582→0.583'
)

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Mecanica de zoom do DVL antigo recuperada. (1) View agora continua em float: removida a quantizacao inteira de chartViewCount/chartOffsetCandles que causava stepping/travamento no zoom; o renderer ja posiciona em float, slicing continua inteiro. (2) Pinch portado do DVL legado: fator incremental amortecido (0.72) + clamp +/-12% por passo + pan simultaneo pelo ponto medio dos dedos. Wheel fica suave automaticamente com a view continua." },',
    '{ version: DVL_APP_VERSION, note: "Zoom/pinch reescrito do zero: handler unificado em window capture elimina race condition onde 2 dedos simultaneos nao iniciavam pinch. Factor incremental amortecido 0.72 +-12%/move + pan por midpoint = mecanica do DVL legado." },\n'
    '  { version: "Beta 0.582", note: "Mecanica de zoom do DVL antigo recuperada: view float, fator incremental amortecido (0.72), clamp +/-12%, pan por midpoint." },',
    'DVL_CHANGELOG 0.583'
)

html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.581</div>',
    '<div class="beta" id="versionBadge">BETA 0.583</div>',
    'static versionBadge fallback 0.581→0.583'
)

html = rep(html,
    '<title>DVL Binance Live — Beta 0.582</title>',
    '<title>DVL Binance Live — Beta 0.583</title>',
    'title 0.582→0.583'
)

# ── Result ─────────────────────────────────────────────────────────────────────
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
