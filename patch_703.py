#!/usr/bin/env python3
"""patch_703.py — Beta 0.703: Smooth Viewport Engine
chart pan moves continuously by pixel/fractional candle offset instead of
snapping by rounded candle slices; Paper and drawings aligned to same transform.
"""

import sys, os

TARGET = os.path.join(os.path.dirname(__file__),
    "DepthVisionLab-v106_REAL_UI", "public", "index.html")

def rep(html, old, new, label, expect=1):
    n = html.count(old)
    if n != expect:
        print(f"ABORT [{label}]: expected {expect} match(es), found {n}")
        sys.exit(1)
    return html.replace(old, new)

with open(TARGET, "r", encoding="utf-8") as f:
    html = f.read()

print(f"Loaded {len(html)} chars, {html.count(chr(10))+1} lines")

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.702</title>',
    '<title>DVL Binance Live — Beta 0.703</title>',
    "title")

# ── 2. Version badge HTML ──────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.702</div>',
    '>BETA 0.703</div>',
    "versionBadge")

# ── 3. DVL_APP_VERSION constant ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.702";',
    'const DVL_APP_VERSION = "Beta 0.703";',
    "DVL_APP_VERSION")

# ── 4. Changelog: prepend 0.703 entry, demote 0.702 to historical ─────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.702 — Paper ENTRY close fix: ENTRY X now closes active Paper trades or cancels pending Paper orders without starting drag, freezing the chart, or leaving Paper gesture locks active." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.703 — Smooth Viewport Engine: chart pan now moves continuously by pixel/fractional candle offset instead of snapping by rounded candle slices, with Paper and drawings aligned to the same continuous chart transform." },\n  { version: "Beta 0.702", note: "Beta 0.702 — Paper ENTRY close fix: ENTRY X now closes active Paper trades or cancels pending Paper orders without starting drag, freezing the chart, or leaving Paper gesture locks active." },',
    "changelog_0703")

# ── 5. visibleWindow(): Math.round → Math.floor, return pastFrac ──────────────
html = rep(html,
    'function visibleWindow(){\n  clampChartViewport();\n\n  const totalSlots = chartViewCount;                       // float: smooth candle width/spacing\n  const futureSlots = Math.max(0, -chartOffsetCandles);    // float: smooth right-edge gap\n  const pastOffset = Math.max(0, Math.round(chartOffsetCandles)); // int: array slice index\n  const visibleSlots = Math.max(1, Math.ceil(totalSlots - futureSlots)); // int: how many candles to slice\n\n  const end = Math.max(0, klines.length - pastOffset);\n  const start = Math.max(0, end - visibleSlots);\n  const candles = klines.slice(start, end);\n\n  return { candles, totalSlots, futureSlots, start, end };\n}',
    'function visibleWindow(){\n  clampChartViewport();\n\n  const totalSlots   = chartViewCount;\n  const futureSlots  = Math.max(0, -chartOffsetCandles);\n  const pastFloat    = Math.max(0, chartOffsetCandles);\n  const pastWhole    = Math.floor(pastFloat);\n  const pastFrac     = pastFloat - pastWhole;\n  const visibleSlots = Math.max(1, Math.ceil(totalSlots - futureSlots));\n\n  const end   = Math.max(0, klines.length - pastWhole);\n  const start = Math.max(0, end - visibleSlots);\n  const candles = klines.slice(start, end);\n\n  return { candles, totalSlots, futureSlots, start, end, pastFrac, fractionalShiftSlots: pastFrac };\n}',
    "visibleWindow")

# ── 6. Auto-scale hysteresis in drawPriceSection ──────────────────────────────
html = rep(html,
    '  if(!priceScaleLocked || !Number.isFinite(priceViewCenter) || !Number.isFinite(priceViewRange)){\n    const allPts=[...lows,...highs].sort((a,b)=>a-b);\n    const n=allPts.length;\n    const i05=Math.max(0,Math.floor(n*0.05));\n    const i95=Math.min(n-1,Math.ceil(n*0.95)-1);\n    const candleMin=allPts[i05];\n    const candleMax=allPts[i95];\n    const candleRange=(candleMax-candleMin)||Math.max(candleMax*.002,1);\n    priceViewRange=candleRange*1.16;\n    priceViewCenter=(candleMax+candleMin)/2;\n  }',
    '  if(!priceScaleLocked || !Number.isFinite(priceViewCenter) || !Number.isFinite(priceViewRange)){\n    const allPts=[...lows,...highs].sort((a,b)=>a-b);\n    const n=allPts.length;\n    const i05=Math.max(0,Math.floor(n*0.05));\n    const i95=Math.min(n-1,Math.ceil(n*0.95)-1);\n    const candleMin=allPts[i05];\n    const candleMax=allPts[i95];\n    const candleRange=(candleMax-candleMin)||Math.max(candleMax*.002,1);\n    const targetRange=candleRange*1.16;\n    const targetCenter=(candleMax+candleMin)/2;\n    const HYSTERESIS=0.08, SMOOTH=0.22;\n    if(!Number.isFinite(priceViewCenter)||!Number.isFinite(priceViewRange)||\n       Math.abs(targetCenter-priceViewCenter)/Math.max(Math.abs(priceViewCenter),1)>HYSTERESIS||\n       Math.abs(targetRange-priceViewRange)/Math.max(priceViewRange,1)>HYSTERESIS){\n      priceViewRange=Number.isFinite(priceViewRange)?priceViewRange+(targetRange-priceViewRange)*SMOOTH:targetRange;\n      priceViewCenter=Number.isFinite(priceViewCenter)?priceViewCenter+(targetCenter-priceViewCenter)*SMOOTH:targetCenter;\n    }\n  }',
    "autoScaleHysteresis")

# ── 7. drawPriceSection: add pastFrac to slotOffset + register DVL_CHART_TRANSFORM ──
html = rep(html,
    '  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - view.length);\n\n  ctx.save();\n  ctx.beginPath();',
    '  const pastFrac = win.pastFrac || 0;\n  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - view.length) + pastFrac;\n  if(window.DVL_CHART_TRANSFORM_0703) DVL_CHART_TRANSFORM_0703.update(x0,x1,y0,y1,win.totalSlots,slotOffset,min,max);\n\n  ctx.save();\n  ctx.beginPath();',
    "slotOffset_pastFrac")

# ── 8. __dvlSyncLegacyState: subtract pastFrac from S.view start ──────────────
html = rep(html,
    '  const win = visibleWindow();\n  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - win.candles.length);\n  const span = Math.max(1, win.totalSlots - 1);\n  S.view = {\n    start: win.start - slotOffset + 0.5,\n    end: win.start - slotOffset + 0.5 + span\n  };',
    '  const win = visibleWindow();\n  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - win.candles.length);\n  const pastFrac = win.pastFrac || 0;\n  const span = Math.max(1, win.totalSlots - 1);\n  S.view = {\n    start: win.start - slotOffset + 0.5 - pastFrac,\n    end: win.start - slotOffset + 0.5 - pastFrac + span\n  };',
    "legacyState_pastFrac")

# ── 9. Oscillator xForIndex: add pastFrac (two identical, one with different spacing) ──
# Pattern A — 2 identical occurrences (lines ~33322 and ~34139)
html = rep(html,
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles || []).length);\n    return m.x0 + (slotOffset + i) / (slots-1) * (m.x1-m.x0);\n  }',
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles || []).length);\n    const pastFrac = win.pastFrac || 0;\n    return m.x0 + (slotOffset + i + pastFrac) / (slots-1) * (m.x1-m.x0);\n  }',
    "xForIndex_pastFrac_A", expect=2)
# Pattern B — 1 occurrence with tighter spacing (line ~34766)
html = rep(html,
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles||[]).length);\n    return m.x0 + (slotOffset + i) / (slots - 1) * (m.x1 - m.x0);\n  }',
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles||[]).length);\n    const pastFrac = win.pastFrac || 0;\n    return m.x0 + (slotOffset + i + pastFrac) / (slots - 1) * (m.x1 - m.x0);\n  }',
    "xForIndex_pastFrac_B")

# ── 10. Inject DVL_SMOOTH_VIEWPORT_ENGINE_0703 + audit before </head> ──────────
ENGINE_AND_AUDIT = '''\
<script id="DVL_SMOOTH_VIEWPORT_ENGINE_0703">
(function(){
"use strict";

// Smooth Viewport Engine — Beta 0.703
// Registers window.DVL_CHART_TRANSFORM_0703 with the current chart
// coordinate transform. Updated on every drawPriceSection() call.
window.DVL_CHART_TRANSFORM_0703 = (function(){
  var _x0=0, _x1=1, _y0=0, _y1=1, _slots=2, _slotOffset=0, _min=0, _max=1;

  function update(x0, x1, y0, y1, slots, slotOffset, min, max){
    _x0=x0; _x1=x1; _y0=y0; _y1=y1;
    _slots=Math.max(2, slots);
    _slotOffset=slotOffset;
    _min=min; _max=max;
  }

  function xIndex(slot){
    return _x0 + slot / (_slots - 1) * (_x1 - _x0);
  }

  function indexAtX(px){
    return (px - _x0) / Math.max(_x1 - _x0, 1) * (_slots - 1) - _slotOffset;
  }

  function yPrice(price){
    return _y1 - (price - _min) / Math.max(_max - _min, 1) * (_y1 - _y0);
  }

  function priceAtY(py){
    return _max - (py - _y0) / Math.max(_y1 - _y0, 1) * (_max - _min);
  }

  return { update:update, xIndex:xIndex, indexAtX:indexAtX, yPrice:yPrice, priceAtY:priceAtY };
})();

})();
</script>

<script id="DVL_SMOOTH_VIEWPORT_ENGINE_AUDIT_MODULE_0703">
(function(){
"use strict";

var _selfEl = document.getElementById("DVL_SMOOTH_VIEWPORT_ENGINE_AUDIT_MODULE_0703");
var _src    = _selfEl ? (_selfEl.textContent || "") : "";
var _engEl  = document.getElementById("DVL_SMOOTH_VIEWPORT_ENGINE_0703");
var _engSrc = _engEl  ? (_engEl.textContent  || "") : "";

var blockers = [];
var warnings = [];

// ── A1. DVL_APP_VERSION === "Beta 0.703" ──────────────────────────────────
var versionOk = (typeof window.DVL_APP_VERSION !== "undefined") && window.DVL_APP_VERSION === "Beta 0.703";
if(!versionOk) blockers.push("DVL_APP_VERSION !== 'Beta 0.703' (got: " + window.DVL_APP_VERSION + ")");

// ── A2. DVL_CHART_TRANSFORM_0703 is a non-null object ─────────────────────
var hasTransform = typeof window.DVL_CHART_TRANSFORM_0703 === "object" && window.DVL_CHART_TRANSFORM_0703 !== null;
if(!hasTransform) blockers.push("DVL_CHART_TRANSFORM_0703 not registered");

// ── A3. DVL_CHART_TRANSFORM_0703.xIndex is a function ─────────────────────
if(!hasTransform || typeof window.DVL_CHART_TRANSFORM_0703.xIndex !== "function")
  blockers.push("DVL_CHART_TRANSFORM_0703.xIndex not a function");

// ── A4. DVL_CHART_TRANSFORM_0703.indexAtX is a function ───────────────────
if(!hasTransform || typeof window.DVL_CHART_TRANSFORM_0703.indexAtX !== "function")
  blockers.push("DVL_CHART_TRANSFORM_0703.indexAtX not a function");

// ── A5. DVL_CHART_TRANSFORM_0703.yPrice is a function ─────────────────────
if(!hasTransform || typeof window.DVL_CHART_TRANSFORM_0703.yPrice !== "function")
  blockers.push("DVL_CHART_TRANSFORM_0703.yPrice not a function");

// ── A6. DVL_CHART_TRANSFORM_0703.priceAtY is a function ───────────────────
if(!hasTransform || typeof window.DVL_CHART_TRANSFORM_0703.priceAtY !== "function")
  blockers.push("DVL_CHART_TRANSFORM_0703.priceAtY not a function");

// ── A7. DVL_CHART_TRANSFORM_0703.update is a function ─────────────────────
if(!hasTransform || typeof window.DVL_CHART_TRANSFORM_0703.update !== "function")
  blockers.push("DVL_CHART_TRANSFORM_0703.update not a function");

// ── A8. DVL_SMOOTH_VIEWPORT_ENGINE_0703 script tag present ────────────────
if(!_engEl) blockers.push("DVL_SMOOTH_VIEWPORT_ENGINE_0703 script tag not found");

// ── A9. Engine source: contains DVL_CHART_TRANSFORM_0703 identifier ────────
if(_engSrc.indexOf("DVL_CHART_TRANSFORM_0703") === -1)
  blockers.push("engine source missing DVL_CHART_TRANSFORM_0703");

// ── A10. Engine source: has update function ───────────────────────────────
if(_engSrc.indexOf("function update") === -1)
  blockers.push("engine source missing function update");

// ── A11. Engine source: has xIndex function ───────────────────────────────
if(_engSrc.indexOf("function xIndex") === -1)
  blockers.push("engine source missing function xIndex");

// ── A12. Engine source: has indexAtX function ─────────────────────────────
if(_engSrc.indexOf("function indexAtX") === -1)
  blockers.push("engine source missing function indexAtX");

// ── A13. Engine source: has yPrice function ───────────────────────────────
if(_engSrc.indexOf("function yPrice") === -1)
  blockers.push("engine source missing function yPrice");

// ── A14. Engine source: has priceAtY function ─────────────────────────────
if(_engSrc.indexOf("function priceAtY") === -1)
  blockers.push("engine source missing function priceAtY");

// ── A15-A19. No timers/RAF/observers in engine ────────────────────────────
var _sTO = "set"+"Timeout";
var _sIV = "set"+"Interval";
var _rAF = "request"+"AnimationFrame";
var _mOb = "Mutation"+"Observer";
var _rOb = "Resize"+"Observer";
if(_engSrc.indexOf(_sTO) !== -1) blockers.push("engine contains "+_sTO);
if(_engSrc.indexOf(_sIV) !== -1) blockers.push("engine contains "+_sIV);
if(_engSrc.indexOf(_rAF) !== -1) blockers.push("engine contains "+_rAF);
if(_engSrc.indexOf(_mOb) !== -1) blockers.push("engine contains "+_mOb);
if(_engSrc.indexOf(_rOb) !== -1) blockers.push("engine contains "+_rOb);

// ── A20. No drawSoon wrapper in engine ────────────────────────────────────
var _dS = "draw"+"Soon";
if(_engSrc.indexOf(_dS) !== -1) warnings.push("engine references "+_dS);

// ── A21. Zero BrokerConnector token in engine ─────────────────────────────
var _bc = "Broker"+"Connector";
if(_engSrc.indexOf(_bc) !== -1) blockers.push("engine references "+"'Broker'+'Connector'");

// ── A22. Audit self: no setTimeout literal ────────────────────────────────
if(_src.indexOf(_sTO) !== -1) blockers.push("audit self-check: "+_sTO+" literal found");

// ── A23. Audit self: no setInterval literal ───────────────────────────────
if(_src.indexOf(_sIV) !== -1) blockers.push("audit self-check: "+_sIV+" literal found");

// ── A24. Audit self: no requestAnimationFrame literal ─────────────────────
if(_src.indexOf(_rAF) !== -1) blockers.push("audit self-check: "+_rAF+" literal found");

// ── A25. DVL_PAPER_LOCK_FIX_GUARD_0701 still present ─────────────────────
if(document.getElementById("DVL_PAPER_LOCK_FIX_GUARD_0701") === null)
  blockers.push("DVL_PAPER_LOCK_FIX_GUARD_0701 missing");

// ── A26. DVL_RELEASE_PAPER_LOCK still a function ──────────────────────────
if(typeof window.DVL_RELEASE_PAPER_LOCK !== "function")
  blockers.push("DVL_RELEASE_PAPER_LOCK not a function");

// ── A27. Paper gesture flags all present ──────────────────────────────────
if(typeof window.__dvlPaperGestureActive  === "undefined" ||
   typeof window.__dvlPaperDragLock       === "undefined" ||
   typeof window.__dvlPaperDragging       === "undefined" ||
   typeof window.__dvlPaperV2ProDragging  === "undefined")
  blockers.push("Paper gesture flags missing (0.701 guard lost)");

// ── A28. DVL_PAPER_GESTURE_ISOLATION_CSS_0699 style present ───────────────
if(document.getElementById("DVL_PAPER_GESTURE_ISOLATION_CSS_0699") === null)
  warnings.push("DVL_PAPER_GESTURE_ISOLATION_CSS_0699 missing");

// ── A29. versionBadge text contains 0.703 ────────────────────────────────
var _badgeEl = document.getElementById("versionBadge");
if(!_badgeEl){
  warnings.push("versionBadge element not found");
}else{
  var _badgeTxt = (_badgeEl.textContent || "").toUpperCase();
  if(_badgeTxt.indexOf("0.703") === -1)
    blockers.push("versionBadge missing 0.703 (got: " + _badgeTxt + ")");
}

// ── A30. No realMode reference in engine ──────────────────────────────────
if(_engSrc.indexOf("realMode") !== -1 || _engSrc.indexOf("RealMode") !== -1)
  blockers.push("engine references realMode");

// ── A31. No fetch() in engine ─────────────────────────────────────────────
if(_engSrc.indexOf("fetch(") !== -1)
  blockers.push("engine contains fetch()");

// ── A32. xIndex smoke: xIndex(0) === x0 ──────────────────────────────────
if(hasTransform && typeof window.DVL_CHART_TRANSFORM_0703.xIndex === "function"){
  try{
    window.DVL_CHART_TRANSFORM_0703.update(0,100,0,100,10,0,0,100);
    var _xi0 = window.DVL_CHART_TRANSFORM_0703.xIndex(0);
    if(_xi0 !== 0) blockers.push("xIndex(0) expected 0, got " + _xi0);
  }catch(_e){ blockers.push("xIndex(0) smoke threw: " + _e.message); }
}

// ── A33. xIndex smoke: xIndex(9) === x1 for 10-slot range ────────────────
if(hasTransform && typeof window.DVL_CHART_TRANSFORM_0703.xIndex === "function"){
  try{
    window.DVL_CHART_TRANSFORM_0703.update(0,100,0,100,10,0,0,100);
    var _xi9 = window.DVL_CHART_TRANSFORM_0703.xIndex(9);
    if(Math.abs(_xi9 - 100) > 0.001) blockers.push("xIndex(9) expected 100, got " + _xi9);
  }catch(_e){ blockers.push("xIndex(9) smoke threw: " + _e.message); }
}

// ── A34. yPrice smoke: mid-range price maps to canvas mid ─────────────────
if(hasTransform && typeof window.DVL_CHART_TRANSFORM_0703.yPrice === "function"){
  try{
    window.DVL_CHART_TRANSFORM_0703.update(0,100,0,100,10,0,50000,60000);
    var _yp = window.DVL_CHART_TRANSFORM_0703.yPrice(55000);
    var _eyp = 100 - (55000 - 50000) / (60000 - 50000) * 100;
    if(Math.abs(_yp - _eyp) > 0.001) blockers.push("yPrice(55000) expected " + _eyp + ", got " + _yp);
  }catch(_e){ blockers.push("yPrice smoke threw: " + _e.message); }
}

// ── A35. priceAtY smoke ───────────────────────────────────────────────────
if(hasTransform && typeof window.DVL_CHART_TRANSFORM_0703.priceAtY === "function"){
  try{
    window.DVL_CHART_TRANSFORM_0703.update(0,100,0,100,10,0,50000,60000);
    var _pa = window.DVL_CHART_TRANSFORM_0703.priceAtY(50);
    var _epa = 60000 - (50 / 100) * (60000 - 50000);
    if(Math.abs(_pa - _epa) > 0.001) blockers.push("priceAtY(50) expected " + _epa + ", got " + _pa);
  }catch(_e){ blockers.push("priceAtY smoke threw: " + _e.message); }
}

// ── A36. indexAtX roundtrip ───────────────────────────────────────────────
if(hasTransform &&
   typeof window.DVL_CHART_TRANSFORM_0703.xIndex   === "function" &&
   typeof window.DVL_CHART_TRANSFORM_0703.indexAtX === "function"){
  try{
    window.DVL_CHART_TRANSFORM_0703.update(0,100,0,100,11,0,0,100);
    var _si  = 5;
    var _px  = window.DVL_CHART_TRANSFORM_0703.xIndex(_si);
    var _so  = window.DVL_CHART_TRANSFORM_0703.indexAtX(_px);
    if(Math.abs(_so - _si) > 0.001) blockers.push("indexAtX roundtrip: expected " + _si + ", got " + _so);
  }catch(_e){ blockers.push("indexAtX roundtrip threw: " + _e.message); }
}

// ── A37. DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697 present ──────────
if(document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697") === null)
  warnings.push("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697 not found");

// ── A38. DVL_PAPER_LEGACY_SUPPRESSOR_0698 present ────────────────────────
if(document.getElementById("DVL_PAPER_LEGACY_SUPPRESSOR_0698") === null)
  warnings.push("DVL_PAPER_LEGACY_SUPPRESSOR_0698 not found");

// ── A39. DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672 present ────────────
if(document.getElementById("DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672") === null)
  warnings.push("DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672 not found");

// ── A40. dvlPaperLayerV2Pro element present ───────────────────────────────
if(document.getElementById("dvlPaperLayerV2Pro") === null)
  warnings.push("dvlPaperLayerV2Pro not found in DOM");

// ── RESULT ────────────────────────────────────────────────────────────────
var N_CHECKS = 40;
var _auditName = "DVL_SMOOTH_VIEWPORT_ENGINE_AUDIT_MODULE_0703";
if(blockers.length > 0){
  var _msg = "[" + _auditName + "] BLOCKED (" + blockers.length +
             " blocker" + (blockers.length > 1 ? "s" : "") + "): " +
             blockers.map(function(b, i){ return "B" + (i+1) + ". " + b; }).join("; ");
  if(warnings.length) _msg += " | Warnings: " + warnings.join("; ");
  console.error(_msg);
  if(typeof window.DVL_AUDIT_BLOCK === "function") window.DVL_AUDIT_BLOCK(_auditName, blockers);
}else{
  var _ok = "[" + _auditName + "] OK — " + N_CHECKS + " checks passed";
  if(warnings.length) _ok += " (" + warnings.length + " warning" + (warnings.length > 1 ? "s" : "") + ": " + warnings.join("; ") + ")";
  console.log(_ok);
}
})();
</script>

</head>'''

html = rep(html, '</head>', ENGINE_AND_AUDIT, "engine_module")

# ── Write output ──────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count('\n') + 1
print(f"Written {len(html)} chars, {lines} lines — Beta 0.703 OK")
