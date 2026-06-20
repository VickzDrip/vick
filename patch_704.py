#!/usr/bin/env python3
"""patch_704.py — Beta 0.704: Rollback 0.703 + Object Persistence Guard

Restores the stable 0.702 Paper baseline and adds time-based anchor
persistence so Paper/drawings survive timeframe changes.
"""

import sys, os, re

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

# ═══════════════════════════════════════════════════════════════════════════════
# PART 1 — ROLLBACK 0.703 CHANGES
# ═══════════════════════════════════════════════════════════════════════════════

# ── 1a. Neutralize DVL_SMOOTH_VIEWPORT_ENGINE_0703 (regex, DOTALL) ────────────
html = re.sub(
    r'<script id="DVL_SMOOTH_VIEWPORT_ENGINE_0703">.*?</script>',
    '<script id="DVL_SMOOTH_VIEWPORT_ENGINE_0703">/* neutralized in Beta 0.704 — smooth viewport rolled back */</script>',
    html, count=1, flags=re.DOTALL
)
print("1a: neutralized DVL_SMOOTH_VIEWPORT_ENGINE_0703")

# ── 1b. Neutralize DVL_SMOOTH_VIEWPORT_ENGINE_AUDIT_MODULE_0703 ───────────────
html = re.sub(
    r'<script id="DVL_SMOOTH_VIEWPORT_ENGINE_AUDIT_MODULE_0703">.*?</script>',
    '<script id="DVL_SMOOTH_VIEWPORT_ENGINE_AUDIT_MODULE_0703">/* neutralized in Beta 0.704 */</script>',
    html, count=1, flags=re.DOTALL
)
print("1b: neutralized DVL_SMOOTH_VIEWPORT_ENGINE_AUDIT_MODULE_0703")

# ── 1c. visibleWindow(): revert pastFrac to Math.round; add indexFromTimeNearest
html = rep(html,
    'function visibleWindow(){\n  clampChartViewport();\n\n  const totalSlots   = chartViewCount;\n  const futureSlots  = Math.max(0, -chartOffsetCandles);\n  const pastFloat    = Math.max(0, chartOffsetCandles);\n  const pastWhole    = Math.floor(pastFloat);\n  const pastFrac     = pastFloat - pastWhole;\n  const visibleSlots = Math.max(1, Math.ceil(totalSlots - futureSlots));\n\n  const end   = Math.max(0, klines.length - pastWhole);\n  const start = Math.max(0, end - visibleSlots);\n  const candles = klines.slice(start, end);\n\n  return { candles, totalSlots, futureSlots, start, end, pastFrac, fractionalShiftSlots: pastFrac };\n}',
    'function visibleWindow(){\n  clampChartViewport();\n\n  const totalSlots = chartViewCount;                       // float: smooth candle width/spacing\n  const futureSlots = Math.max(0, -chartOffsetCandles);    // float: smooth right-edge gap\n  const pastOffset = Math.max(0, Math.round(chartOffsetCandles)); // int: array slice index\n  const visibleSlots = Math.max(1, Math.ceil(totalSlots - futureSlots)); // int: how many candles to slice\n\n  const end = Math.max(0, klines.length - pastOffset);\n  const start = Math.max(0, end - visibleSlots);\n  const candles = klines.slice(start, end);\n\n  return { candles, totalSlots, futureSlots, start, end };\n}\n\nfunction indexFromTimeNearest(timeMs){\n  if(!Array.isArray(klines) || !klines.length) return 0;\n  var best = 0, bestDist = Infinity;\n  for(var i = 0; i < klines.length; i++){\n    var t = Number(klines[i].time || klines[i].t || 0);\n    var d = Math.abs(t - timeMs);\n    if(d < bestDist){ bestDist = d; best = i; }\n  }\n  return best;\n}',
    "visibleWindow_revert")

# ── 1d. Auto-scale: revert HYSTERESIS/SMOOTH back to simple assignment ─────────
html = rep(html,
    '  if(!priceScaleLocked || !Number.isFinite(priceViewCenter) || !Number.isFinite(priceViewRange)){\n    const allPts=[...lows,...highs].sort((a,b)=>a-b);\n    const n=allPts.length;\n    const i05=Math.max(0,Math.floor(n*0.05));\n    const i95=Math.min(n-1,Math.ceil(n*0.95)-1);\n    const candleMin=allPts[i05];\n    const candleMax=allPts[i95];\n    const candleRange=(candleMax-candleMin)||Math.max(candleMax*.002,1);\n    const targetRange=candleRange*1.16;\n    const targetCenter=(candleMax+candleMin)/2;\n    const HYSTERESIS=0.08, SMOOTH=0.22;\n    if(!Number.isFinite(priceViewCenter)||!Number.isFinite(priceViewRange)||\n       Math.abs(targetCenter-priceViewCenter)/Math.max(Math.abs(priceViewCenter),1)>HYSTERESIS||\n       Math.abs(targetRange-priceViewRange)/Math.max(priceViewRange,1)>HYSTERESIS){\n      priceViewRange=Number.isFinite(priceViewRange)?priceViewRange+(targetRange-priceViewRange)*SMOOTH:targetRange;\n      priceViewCenter=Number.isFinite(priceViewCenter)?priceViewCenter+(targetCenter-priceViewCenter)*SMOOTH:targetCenter;\n    }\n  }',
    '  if(!priceScaleLocked || !Number.isFinite(priceViewCenter) || !Number.isFinite(priceViewRange)){\n    const allPts=[...lows,...highs].sort((a,b)=>a-b);\n    const n=allPts.length;\n    const i05=Math.max(0,Math.floor(n*0.05));\n    const i95=Math.min(n-1,Math.ceil(n*0.95)-1);\n    const candleMin=allPts[i05];\n    const candleMax=allPts[i95];\n    const candleRange=(candleMax-candleMin)||Math.max(candleMax*.002,1);\n    priceViewRange=candleRange*1.16;\n    priceViewCenter=(candleMax+candleMin)/2;\n  }',
    "autoScale_revert")

# ── 1e. drawPriceSection slotOffset: remove pastFrac and DVL_CHART_TRANSFORM ──
html = rep(html,
    '  const pastFrac = win.pastFrac || 0;\n  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - view.length) + pastFrac;\n  if(window.DVL_CHART_TRANSFORM_0703) DVL_CHART_TRANSFORM_0703.update(x0,x1,y0,y1,win.totalSlots,slotOffset,min,max);\n\n  ctx.save();\n  ctx.beginPath();',
    '  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - view.length);\n\n  ctx.save();\n  ctx.beginPath();',
    "slotOffset_revert")

# ── 1f. __dvlSyncLegacyState: remove pastFrac from S.view ─────────────────────
html = rep(html,
    '  const win = visibleWindow();\n  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - win.candles.length);\n  const pastFrac = win.pastFrac || 0;\n  const span = Math.max(1, win.totalSlots - 1);\n  S.view = {\n    start: win.start - slotOffset + 0.5 - pastFrac,\n    end: win.start - slotOffset + 0.5 - pastFrac + span\n  };',
    '  const win = visibleWindow();\n  const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - win.candles.length);\n  const span = Math.max(1, win.totalSlots - 1);\n  S.view = {\n    start: win.start - slotOffset + 0.5,\n    end: win.start - slotOffset + 0.5 + span\n  };',
    "legacyState_revert")

# ── 1g. xForIndex pattern A (2 occurrences) — revert ─────────────────────────
html = rep(html,
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles || []).length);\n    const pastFrac = win.pastFrac || 0;\n    return m.x0 + (slotOffset + i + pastFrac) / (slots-1) * (m.x1-m.x0);\n  }',
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles || []).length);\n    return m.x0 + (slotOffset + i) / (slots-1) * (m.x1-m.x0);\n  }',
    "xForIndex_A_revert", expect=2)

# ── 1h. xForIndex pattern B (1 occurrence, tighter spacing) — revert ──────────
html = rep(html,
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles||[]).length);\n    const pastFrac = win.pastFrac || 0;\n    return m.x0 + (slotOffset + i + pastFrac) / (slots - 1) * (m.x1 - m.x0);\n  }',
    '  function xForIndex(i, m, win){\n    const slots = Math.max(2, win.totalSlots || 2);\n    const slotOffset = Math.max(0, win.totalSlots - win.futureSlots - (win.candles||[]).length);\n    return m.x0 + (slotOffset + i) / (slots - 1) * (m.x1 - m.x0);\n  }',
    "xForIndex_B_revert")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — VERSION BUMP
# ═══════════════════════════════════════════════════════════════════════════════

html = rep(html,
    '<title>DVL Binance Live — Beta 0.703</title>',
    '<title>DVL Binance Live — Beta 0.704</title>',
    "title")

html = rep(html,
    '>BETA 0.703</div>',
    '>BETA 0.704</div>',
    "versionBadge")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.703";',
    'const DVL_APP_VERSION = "Beta 0.704";',
    "DVL_APP_VERSION")

html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.703 — Smooth Viewport Engine: chart pan now moves continuously by pixel/fractional candle offset instead of snapping by rounded candle slices, with Paper and drawings aligned to the same continuous chart transform." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.704 — Rollback stability and object persistence: restored the stable 0.702 Paper baseline, removed the unstable 0.703 smooth viewport changes, and protected Paper/drawings from disappearing when changing timeframe by resolving anchors from time+price instead of index-only." },\n  { version: "Beta 0.703", note: "Beta 0.703 — Smooth Viewport Engine: chart pan now moves continuously by pixel/fractional candle offset instead of snapping by rounded candle slices, with Paper and drawings aligned to the same continuous chart transform." },',
    "changelog_0704")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — PAPER PERSISTENCE GUARD
# ═══════════════════════════════════════════════════════════════════════════════

# ── 3a. Add anchorTime to baseOrder() ─────────────────────────────────────────
html = rep(html,
    'anchorIndex:idx,labelAnchorIndex:idx+LABEL_OFFSET_BARS,selected:true};}',
    'anchorIndex:idx,anchorTime:(function(i){try{var cs=window.S&&window.S.candles;var c=cs&&cs[i];return Number(c&&(c.t||c.time||c.openTime))||Date.now();}catch(_){return Date.now();}})(idx),labelAnchorIndex:idx+LABEL_OFFSET_BARS,selected:true};}',
    "baseOrder_anchorTime")

# ── 3b. Add resolveOrderAnchorIndex() + fix labelX() ─────────────────────────
# Old: labelX returns null for off-screen anchors
# New: resolveOrderAnchorIndex recalculates from anchorTime on TF change;
#      labelX returns fallback position instead of null
html = rep(html,
    'function labelX(order, si){var anchor=n(order.anchorIndex,currentIndex()); var raw=candleX(anchor+LABEL_OFFSET_BARS,si); var origin=candleX(anchor,si); var step=Math.max(2,candleStep(si)); if(origin<si.plotLeft-step*3 || origin>si.plotRight+step*3) return null; return clamp(raw, si.plotLeft+3, Math.max(si.plotLeft+3, si.plotRight-TAG_W-4));}',
    'function resolveOrderAnchorIndex(o){var idx=n(o.anchorIndex,0); if(o.anchorTime&&typeof window.indexFromTimeNearest==="function"){var cs=window.S&&window.S.candles; var kLen=cs?cs.length:0; if(kLen>0&&(!o._anchorKlineLen||Math.abs(o._anchorKlineLen-kLen)>2)){var ni=window.indexFromTimeNearest(o.anchorTime); if(typeof ni==="number"&&ni>=0){idx=ni; o.anchorIndex=idx; o._anchorKlineLen=kLen;}}} return idx;}\n  function labelX(order, si){var anchor=resolveOrderAnchorIndex(order); var raw=candleX(anchor+LABEL_OFFSET_BARS,si); var origin=candleX(anchor,si); var step=Math.max(2,candleStep(si)); var fallback=Math.max(si.plotLeft+3,si.plotRight-TAG_W-4); if(!Number.isFinite(raw)||origin<si.plotLeft-step*3||origin>si.plotRight+step*3){return fallback;} return clamp(raw, si.plotLeft+3, fallback);}',
    "labelX_fix")

# ── 3c. renderOrder(): null guard for x ───────────────────────────────────────
html = rep(html,
    'var si=(ey||ty||sy).si; var x=labelX(o,si); if(ty){',
    'var si=(ey||ty||sy).si; var x=labelX(o,si); if(x===null||x===undefined||!Number.isFinite(x))x=Math.max(si.plotLeft+3,si.plotRight-TAG_W-4); if(ty){',
    "renderOrder_nullGuard")

# ── 3d. chartPointToScreen(): prefer indexFromTimeNearest over stale p.index ──
html = rep(html,
    'function chartPointToScreen(p,cs){\n  cs=cs||getCS();if(!cs)return{x:0,y:0};\n  const n=S.candles.length;\n  let idx;\n  // If stored index extends past last candle, use it directly (future projection)\n  if(p.index!=null&&p.index>n-0.5)idx=p.index;\n  else if(p.time)idx=tToIdx(p.time);\n  else idx=p.index||0;\n  return{x:cs.xI(idx),y:cs.yP(p.price)};\n}',
    'function chartPointToScreen(p,cs){\n  cs=cs||getCS();if(!cs)return{x:0,y:0};\n  const n=S.candles.length;\n  let idx;\n  // If stored index extends past last candle, use it directly (future projection)\n  if(p.index!=null&&p.index>n-0.5)idx=p.index;\n  else if(p.time)idx=(typeof indexFromTimeNearest===\'function\')?indexFromTimeNearest(p.time):tToIdx(p.time);\n  else idx=p.index||0;\n  return{x:cs.xI(idx),y:cs.yP(p.price)};\n}',
    "chartPointToScreen_fix")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — AUDIT MODULE
# ═══════════════════════════════════════════════════════════════════════════════

AUDIT_0704 = '''
<script id="DVL_OBJECT_PERSISTENCE_ROLLBACK_AUDIT_MODULE_0704">
(function(){
"use strict";

var _selfEl = document.getElementById("DVL_OBJECT_PERSISTENCE_ROLLBACK_AUDIT_MODULE_0704");
var _src    = _selfEl ? (_selfEl.textContent || "") : "";
var _v2El   = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697");
var _v2Src  = _v2El ? (_v2El.textContent || "") : "";

var blockers = [];
var warnings = [];

// ── A1. Title contains Beta 0.704 ─────────────────────────────────────────
var _title = document.querySelector("title");
if(!_title || (_title.textContent||"").indexOf("0.704") === -1)
  blockers.push("A1: title missing 0.704");

// ── A2. Version badge contains 0.704 ──────────────────────────────────────
var _badge = document.getElementById("versionBadge");
if(!_badge || (_badge.textContent||"").toUpperCase().indexOf("0.704") === -1)
  blockers.push("A2: versionBadge missing 0.704");

// ── A3. DVL_APP_VERSION === "Beta 0.704" ──────────────────────────────────
var _vOk = typeof window.DVL_APP_VERSION !== "undefined" && window.DVL_APP_VERSION === "Beta 0.704";
if(!_vOk) blockers.push("A3: DVL_APP_VERSION !== 'Beta 0.704' (got: " + window.DVL_APP_VERSION + ")");

// ── A4. DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697 present ───────────
if(!_v2El) blockers.push("A4: DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697 missing");

// ── A5. closeOrCancelPaperOrder in Paper source ────────────────────────────
if(_v2Src.indexOf("closeOrCancelPaperOrder") === -1)
  blockers.push("A5: closeOrCancelPaperOrder missing from Paper source");

// ── A6. closeOrCancelPaperOrder splices state.orders ──────────────────────
if(_v2Src.indexOf("state.orders.splice") === -1)
  blockers.push("A6: state.orders.splice missing from Paper source");

// ── A7. DVL_PAPER_LOCK_FIX_GUARD_0701 still present ──────────────────────
if(document.getElementById("DVL_PAPER_LOCK_FIX_GUARD_0701") === null)
  blockers.push("A7: DVL_PAPER_LOCK_FIX_GUARD_0701 missing");

// ── A8. DVL_RELEASE_PAPER_LOCK still a function ───────────────────────────
if(typeof window.DVL_RELEASE_PAPER_LOCK !== "function")
  blockers.push("A8: DVL_RELEASE_PAPER_LOCK not a function");

// ── A9. Paper gesture flags present ───────────────────────────────────────
if(typeof window.__dvlPaperGestureActive === "undefined" ||
   typeof window.__dvlPaperDragLock === "undefined" ||
   typeof window.__dvlPaperV2ProDragging === "undefined")
  blockers.push("A9: Paper gesture flags missing");

// ── A10. DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702 present ──────────────────
if(document.getElementById("DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702") === null)
  warnings.push("A10: DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702 not found");

// ── A11. DVL_SMOOTH_VIEWPORT_ENGINE_0703 not active ───────────────────────
var _dvlT = window.DVL_CHART_TRANSFORM_0703;
if(_dvlT && typeof _dvlT.update === "function")
  blockers.push("A11: DVL_SMOOTH_VIEWPORT_ENGINE_0703 still active");

// ── A12. DVL_CHART_TRANSFORM_0703 not registered ──────────────────────────
if(window.DVL_CHART_TRANSFORM_0703 !== undefined && window.DVL_CHART_TRANSFORM_0703 !== null)
  blockers.push("A12: DVL_CHART_TRANSFORM_0703 still registered");

// ── A13. anchorTime in Paper source ───────────────────────────────────────
if(_v2Src.indexOf("anchorTime") === -1)
  blockers.push("A13: anchorTime missing from Paper source");

// ── A14. indexFromTimeNearest is a global function ────────────────────────
if(typeof window.indexFromTimeNearest !== "function")
  blockers.push("A14: indexFromTimeNearest not a global function");

// ── A15. resolveOrderAnchorIndex in Paper source ──────────────────────────
if(_v2Src.indexOf("resolveOrderAnchorIndex") === -1)
  blockers.push("A15: resolveOrderAnchorIndex missing from Paper source");

// ── A16. labelX no longer returns null for off-screen anchors ─────────────
var _lxStart = _v2Src.indexOf("function labelX");
var _lxEnd   = _v2Src.indexOf("function tagTop", _lxStart);
var _lxBody  = (_lxStart >= 0 && _lxEnd > _lxStart) ? _v2Src.slice(_lxStart, _lxEnd) : "";
if(_lxBody.indexOf("return null") !== -1)
  blockers.push("A16: labelX still returns null for off-screen anchors");

// ── A17. labelX has fallback position ─────────────────────────────────────
if(_lxBody.indexOf("fallback") === -1 || _lxBody.indexOf("plotRight") === -1)
  blockers.push("A17: labelX missing fallback to plotRight");

// ── A18. renderOrder has null guard for x ─────────────────────────────────
if(_v2Src.indexOf("x===null") === -1)
  blockers.push("A18: renderOrder missing null guard for x");

// ── A19. chartPointToScreen uses indexFromTimeNearest ─────────────────────
if(typeof chartPointToScreen === "function"){
  var _cpSrc = chartPointToScreen.toString();
  if(_cpSrc.indexOf("indexFromTimeNearest") === -1)
    blockers.push("A19: chartPointToScreen does not use indexFromTimeNearest");
}else{
  warnings.push("A19: chartPointToScreen not globally visible");
}

// ── A20. DVL_PAPER_LEGACY_SUPPRESSOR_0698 present ────────────────────────
if(document.getElementById("DVL_PAPER_LEGACY_SUPPRESSOR_0698") === null)
  warnings.push("A20: DVL_PAPER_LEGACY_SUPPRESSOR_0698 not found");

// ── A21. DVL_PAPER_GESTURE_ISOLATION_CSS_0699 present ─────────────────────
if(document.getElementById("DVL_PAPER_GESTURE_ISOLATION_CSS_0699") === null)
  warnings.push("A21: DVL_PAPER_GESTURE_ISOLATION_CSS_0699 not found");

// ── A22. visibleWindow does NOT contain pastFrac (0.703 rolled back) ──────
if(typeof visibleWindow === "function"){
  var _vwSrc = visibleWindow.toString();
  if(_vwSrc.indexOf("pastFrac") !== -1)
    blockers.push("A22: visibleWindow still contains pastFrac (0.703 not rolled back)");
}

// ── A23. visibleWindow contains Math.round (0.702 restored) ──────────────
if(typeof visibleWindow === "function"){
  var _vwSrc2 = visibleWindow.toString();
  if(_vwSrc2.indexOf("Math.round") === -1)
    blockers.push("A23: visibleWindow missing Math.round (0.702 not restored)");
}

// ── A24. __dvlSyncLegacyState does NOT contain pastFrac ───────────────────
if(typeof __dvlSyncLegacyState === "function"){
  var _lsSrc = __dvlSyncLegacyState.toString();
  if(_lsSrc.indexOf("pastFrac") !== -1)
    blockers.push("A24: __dvlSyncLegacyState still contains pastFrac (0.703 not rolled back)");
}

// ── A25. No BrokerConnector token in Paper source ─────────────────────────
var _bc = "Broker"+"Connector";
if(_v2Src.indexOf(_bc) !== -1)
  blockers.push("A25: Paper source contains "+"'Broker'+'Connector'");

// ── A26. No realMode in Paper source ──────────────────────────────────────
if(_v2Src.indexOf("realMode") !== -1 || _v2Src.indexOf("RealMode") !== -1)
  blockers.push("A26: Paper source references realMode");

// ── A27. No fetch() in Paper source ───────────────────────────────────────
if(_v2Src.indexOf("fetch(") !== -1)
  blockers.push("A27: Paper source contains fetch()");

// ── A28. No apiKey in Paper source ────────────────────────────────────────
if(_v2Src.indexOf("apiKey:") !== -1)
  warnings.push("A28: apiKey found in Paper source");

// ── A29-A31. Audit self: no timer literals ────────────────────────────────
var _sTO = "set"+"Timeout";
var _sIV = "set"+"Interval";
var _rAF = "request"+"AnimationFrame";
if(_src.indexOf(_sTO) !== -1) blockers.push("A29: audit self: "+_sTO+" literal found");
if(_src.indexOf(_sIV) !== -1) blockers.push("A30: audit self: "+_sIV+" literal found");
if(_src.indexOf(_rAF) !== -1) blockers.push("A31: audit self: "+_rAF+" literal found");

// ── A32. indexFromTimeNearest smoke: returns 0 or positive number ─────────
if(typeof window.indexFromTimeNearest === "function"){
  try{
    var _r = window.indexFromTimeNearest(Date.now());
    if(typeof _r !== "number" || _r < 0)
      blockers.push("A32: indexFromTimeNearest returned invalid: " + _r);
  }catch(_e){ blockers.push("A32: indexFromTimeNearest threw: " + _e.message); }
}

// ── A33. indexFromTimeNearest: 0 for huge future timestamp ────────────────
if(typeof window.indexFromTimeNearest === "function"){
  try{
    var _r2 = window.indexFromTimeNearest(9999999999999);
    if(typeof _r2 !== "number" || _r2 < 0)
      blockers.push("A33: indexFromTimeNearest(huge) returned invalid: " + _r2);
  }catch(_e){ blockers.push("A33: indexFromTimeNearest(huge) threw: " + _e.message); }
}

// ── A34. Audit self-presence ──────────────────────────────────────────────
if(!_selfEl) blockers.push("A34: audit module self-check failed");

// ── RESULT ────────────────────────────────────────────────────────────────
var N_CHECKS = 34;
var _auditName = "DVL_OBJECT_PERSISTENCE_ROLLBACK_AUDIT_MODULE_0704";
if(blockers.length > 0){
  var _msg = "[" + _auditName + "] BLOCKED (" + blockers.length +
             " blocker" + (blockers.length > 1 ? "s" : "") + "): " +
             blockers.join("; ");
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
'''

html = rep(html, '</body>', AUDIT_0704 + '</body>', "audit_0704")

# ── Write output ──────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count('\n') + 1
print(f"Written {len(html)} chars, {lines} lines — Beta 0.704 OK")
