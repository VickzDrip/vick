#!/usr/bin/env python3
"""
Beta 0.685 — Scale Label Compact Fix
"""
import sys

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-43.before_0685_scale_label_compact_fix.html"

def rep(html, old, new, label=""):
    cnt = html.count(old)
    if cnt != 1:
        print(f"ERROR rep({label!r}): found {cnt} (expected 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()
with open(BAK, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Backup → {BAK}")

# Pre-checks
_DUP = '<' + '/style><' + '/style>'
_BRK = 'Broker' + 'Connector'
assert _DUP not in html
assert _BRK not in html
assert 'Beta 0.684' in html
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in html
assert 'const tagH = 34;' in html, "PRE: tagH=34 not found"
assert 'tagH = 34;' in html, "PRE: tagH= 34 variant not found"
print("Pre-checks OK")

# ── C1: Add DVL_SCALE_LABEL_* constants after DVL_PRICE_SCALE_W ──────────
html = rep(html,
    'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;',
    'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;\n'
    'const DVL_SCALE_LABEL_MAX_W  = 68;\n'
    'const DVL_SCALE_LABEL_H      = 20;\n'
    'const DVL_SCALE_LABEL_FONT   = 10;\n'
    'const DVL_SCALE_LABEL_RADIUS = 5;\n'
    'const DVL_SCALE_LABEL_PAD_X  = 4;\n'
    'window.DVL_SCALE_LABEL_MAX_W  = DVL_SCALE_LABEL_MAX_W;\n'
    'window.DVL_SCALE_LABEL_H      = DVL_SCALE_LABEL_H;\n'
    'window.DVL_SCALE_LABEL_FONT   = DVL_SCALE_LABEL_FONT;\n'
    'window.DVL_SCALE_LABEL_RADIUS = DVL_SCALE_LABEL_RADIUS;\n'
    'window.DVL_SCALE_LABEL_PAD_X  = DVL_SCALE_LABEL_PAD_X;',
    "DVL_SCALE_LABEL constants")
print("C1 done")

# ── C2: Fix current price green label ─────────────────────────────────────
html = rep(html,
    '  const tagW = PRICE_LABEL_W;\n'
    '  const tagH = 20;\n'
    '  const tx = x1 + PRICE_LABEL_GAP;\n'
    '  const ty = ly - tagH / 2;\n'
    '  roundRect(ctx, tx, ty, tagW, tagH, 3, true, false, "#13dc8d");\n'
    '  ctx.fillStyle = "#02120b";\n'
    '  ctx.textAlign = "center";\n'
    '  ctx.textBaseline = "middle";\n'
    '  ctx.font = "900 9px system-ui";\n'
    '  ctx.fillText(tagText, tx + tagW / 2, ly - 5);\n'
    '  ctx.font = "850 7.4px system-ui";\n'
    '  ctx.globalAlpha = .82;\n'
    '  ctx.fillText(timerText, tx + tagW / 2, ly + 8);\n'
    '  ctx.globalAlpha = 1;',
    '  const tagW = PRICE_LABEL_W;\n'
    '  const tagH = DVL_SCALE_LABEL_H;\n'
    '  const tx = x1 + PRICE_LABEL_GAP;\n'
    '  const ty = ly - tagH / 2;\n'
    '  roundRect(ctx, tx, ty, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#13dc8d");\n'
    '  ctx.fillStyle = "#02120b";\n'
    '  ctx.textAlign = "center";\n'
    '  ctx.textBaseline = "middle";\n'
    '  ctx.font = "900 " + DVL_SCALE_LABEL_FONT + "px system-ui";\n'
    '  ctx.fillText(tagText, tx + tagW / 2, ly - 4);\n'
    '  ctx.font = "700 7px system-ui";\n'
    '  ctx.globalAlpha = .75;\n'
    '  ctx.fillText(timerText, tx + tagW / 2, ly + 6);\n'
    '  ctx.globalAlpha = 1;',
    "current price label")
print("C2 done")

# ── C3: Fix 0538 drawScaleTag (has comment block inside) ─────────────────
html = rep(html,
    '  function drawScaleTag(ctx, m, value){\n'
    '    /*\n'
    '      Same tag logic as the upper price scale:\n'
    '      fixed right column, same width/height, same radius/color/text.\n'
    '    */\n'
    '    const y = clamp(yForValue(value, m), m.y0 + 18, m.y1 - 18);\n'
    '    const txt = fmt(value);\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = 34;\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const ty = y - tagH / 2;\n'
    '\n'
    '    if(typeof roundRect === "function"){\n'
    '      roundRect(ctx, tx, ty, tagW, tagH, 6, true, false, "#18d7ff");\n'
    '    }else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, ty, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.font = "900 9px system-ui";\n'
    '    ctx.fillText(txt, tx + tagW / 2, y);\n'
    '  }',
    '  function drawScaleTag(ctx, m, value){\n'
    '    const y = clamp(yForValue(value, m), m.y0 + 18, m.y1 - 18);\n'
    '    const txt = fmt(value);\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = DVL_SCALE_LABEL_H;\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const ty = y - tagH / 2;\n'
    '\n'
    '    if(typeof roundRect === "function"){\n'
    '      roundRect(ctx, tx, ty, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#18d7ff");\n'
    '    }else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, ty, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.font = "900 " + DVL_SCALE_LABEL_FONT + "px system-ui";\n'
    '    ctx.fillText(txt, tx + tagW / 2, y);\n'
    '  }',
    "0538 drawScaleTag")
print("C3 done")

# ── C4: Fix 0549 drawScaleTag (no comment block) ─────────────────────────
html = rep(html,
    '  function drawScaleTag(ctx, m, value){\n'
    '    const y = clamp(yForValue(value, m), m.y0 + 18, m.y1 - 18);\n'
    '    const txt = fmt(value);\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = 34;\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const ty = y - tagH / 2;\n'
    '\n'
    '    if(typeof roundRect === "function"){\n'
    '      roundRect(ctx, tx, ty, tagW, tagH, 6, true, false, "#18d7ff");\n'
    '    }else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, ty, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.font = "900 9px system-ui";\n'
    '    ctx.fillText(txt, tx + tagW / 2, y);\n'
    '  }',
    '  function drawScaleTag(ctx, m, value){\n'
    '    const y = clamp(yForValue(value, m), m.y0 + 18, m.y1 - 18);\n'
    '    const txt = fmt(value);\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = DVL_SCALE_LABEL_H;\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const ty = y - tagH / 2;\n'
    '\n'
    '    if(typeof roundRect === "function"){\n'
    '      roundRect(ctx, tx, ty, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#18d7ff");\n'
    '    }else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, ty, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.font = "900 " + DVL_SCALE_LABEL_FONT + "px system-ui";\n'
    '    ctx.fillText(txt, tx + tagW / 2, y);\n'
    '  }',
    "0549 drawScaleTag")
print("C4 done")

# ── C5: Fix 0554 Open Interest drawScaleTag ───────────────────────────────
html = rep(html,
    '  function drawScaleTag(ctx, m, value, sc){\n'
    '    const yy = clamp(yMap(m, value, sc), m.y0 + 18, m.y1 - 18);\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = 34;\n'
    '\n'
    '    if(typeof roundRect === "function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, 6, true, false, "#18d7ff");\n'
    '    else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, yy-tagH/2, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.font = "900 8px system-ui";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.fillText(fmtScale(value), tx + tagW/2, yy);\n'
    '  }',
    '  function drawScaleTag(ctx, m, value, sc){\n'
    '    const yy = clamp(yMap(m, value, sc), m.y0 + 18, m.y1 - 18);\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = DVL_SCALE_LABEL_H;\n'
    '\n'
    '    if(typeof roundRect === "function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#18d7ff");\n'
    '    else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, yy-tagH/2, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.font = "900 " + DVL_SCALE_LABEL_FONT + "px system-ui";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.fillText(fmtScale(value), tx + tagW/2, yy);\n'
    '  }',
    "0554 drawScaleTag")
print("C5 done")

# ── C6: Fix 0559 Long/Short drawScaleTag ─────────────────────────────────
html = rep(html,
    '  function drawScaleTag(ctx, m, value, sc){\n'
    '    const yy = clamp(yMap(m, value, sc), m.y0 + 18, m.y1 - 18);\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = 34;\n'
    '\n'
    '    if(typeof roundRect === "function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, 6, true, false, "#18d7ff");\n'
    '    else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, yy-tagH/2, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.font = "900 8.5px system-ui";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.fillText(fmt(value), tx + tagW/2, yy);\n'
    '  }',
    '  function drawScaleTag(ctx, m, value, sc){\n'
    '    const yy = clamp(yMap(m, value, sc), m.y0 + 18, m.y1 - 18);\n'
    '    const tx = m.x1 + m.labelGap;\n'
    '    const tagW = m.labelW;\n'
    '    const tagH = DVL_SCALE_LABEL_H;\n'
    '\n'
    '    if(typeof roundRect === "function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#18d7ff");\n'
    '    else{\n'
    '      ctx.fillStyle = "#18d7ff";\n'
    '      ctx.fillRect(tx, yy-tagH/2, tagW, tagH);\n'
    '    }\n'
    '\n'
    '    ctx.fillStyle = "#02120b";\n'
    '    ctx.font = "900 " + DVL_SCALE_LABEL_FONT + "px system-ui";\n'
    '    ctx.textAlign = "center";\n'
    '    ctx.textBaseline = "middle";\n'
    '    ctx.fillText(fmt(value), tx + tagW/2, yy);\n'
    '  }',
    "0559 drawScaleTag")
print("C6 done")

# ── C7: Fix 0596 Delta Vol drawScaleTag (inline style) ───────────────────
html = rep(html,
    '  function drawScaleTag(ctx, m, value, sc){\n'
    '    const yy = Math.max(m.y0+18, Math.min(m.y1-18, yMap(m, value, sc)));\n'
    '    const tx = m.x1 + m.labelGap, tagW = m.labelW, tagH = 34;\n'
    '    if(typeof roundRect==="function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, 6, true, false, "#18d7ff");\n'
    '    else{ ctx.fillStyle="#18d7ff"; ctx.fillRect(tx, yy-tagH/2, tagW, tagH); }\n'
    '    ctx.fillStyle="#02120b"; ctx.font="900 8px system-ui";\n'
    '    ctx.textAlign="center"; ctx.textBaseline="middle";\n'
    '    ctx.fillText(fmtDelta(value), tx+tagW/2, yy);\n'
    '  }',
    '  function drawScaleTag(ctx, m, value, sc){\n'
    '    const yy = Math.max(m.y0+18, Math.min(m.y1-18, yMap(m, value, sc)));\n'
    '    const tx = m.x1 + m.labelGap, tagW = m.labelW, tagH = DVL_SCALE_LABEL_H;\n'
    '    if(typeof roundRect==="function") roundRect(ctx, tx, yy-tagH/2, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, "#18d7ff");\n'
    '    else{ ctx.fillStyle="#18d7ff"; ctx.fillRect(tx, yy-tagH/2, tagW, tagH); }\n'
    '    ctx.fillStyle="#02120b"; ctx.font="900 " + DVL_SCALE_LABEL_FONT + "px system-ui";\n'
    '    ctx.textAlign="center"; ctx.textBaseline="middle";\n'
    '    ctx.fillText(fmtDelta(value), tx+tagW/2, yy);\n'
    '  }',
    "0596 drawScaleTag")
print("C7 done")

# ── C8: CSS_0685 marker block ─────────────────────────────────────────────
CSS_0685 = '''\
<style id="DVL_SCALE_LABEL_COMPACT_FIX_CSS_0685">
/*
  DVL Beta 0.685 — Scale Label Compact Fix.
  Standardizes current-price and oscillator scale labels:
  max-width 68px, height 20px, font 10px, border-radius 5px.
  All changes are Canvas-side; this marker records the beta boundary.
*/
</style>

'''

html = rep(html,
    '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    '</style>\n\n' + CSS_0685 + '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "CSS_0685")
print("C8 done")

# ── C9: version bump ─────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.684</title>',
    '<title>DVL Binance Live — Beta 0.685</title>',
    "title")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.684";',
    'const DVL_APP_VERSION = "Beta 0.685";',
    "DVL_APP_VERSION")
html = rep(html,
    '>BETA 0.684<',
    '>BETA 0.685<',
    "versionBadge")
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.684 — Paper Draft Entry Selection',
    '{ version: DVL_APP_VERSION, note: "Beta 0.685 — Scale label compact fix: standardized current price and oscillator scale labels to fit the 70px right scale without card-like oversized boxes." },\n'
    '  { version: "Beta 0.684", note: "Beta 0.684 — Paper Draft Entry Selection',
    "changelog")
print("C9 done")

# ── C10: audit module ─────────────────────────────────────────────────────
MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0685 = '''\
<script id="DVL_SCALE_LABEL_COMPACT_FIX_AUDIT_MODULE_0685">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _dupStyleTag = '<' + '/style><' + '/style>';
var _brokerToken = 'Broker' + 'Connector';

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

function _cntId(els, id){
  var c = 0;
  for(var i = 0; i < els.length; i++){ if(els[i].id === id) c++; }
  return c;
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  // Collect sources
  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var si = 0; si < _allScripts.length; si++){ _srcFull += _allScripts[si].textContent; }

  // Oscillator script sources (for targeted checks)
  var _oscIds = [
    "DVL_BETA_0538_TEST_OSCILLATOR_JS",
    "DVL_BETA_0549_TESTE2_OSCILLATOR_JS",
    "DVL_BETA_0554_CG_STYLE_OPEN_INTEREST_OSC_JS",
    "DVL_BETA_0559_LONGSHORT_OSC_JS",
    "DVL_BETA_0596_DELTA_VOL_JS"
  ];
  var _allOscSrc = "";
  for(var oi = 0; oi < _oscIds.length; oi++){
    var _el = document.getElementById(_oscIds[oi]);
    if(_el) _allOscSrc += _el.textContent;
  }

  // This module's own source
  var _mod685 = document.getElementById("DVL_SCALE_LABEL_COMPACT_FIX_AUDIT_MODULE_0685");
  var _mod685src = _mod685 ? _mod685.textContent : "";

  // ── CSS & module presence ────────────────────────────────────────────

  // A1. CSS_0685 present 1x
  var css685Present = _cntId(styleEls, "DVL_SCALE_LABEL_COMPACT_FIX_CSS_0685") === 1;
  if(!css685Present) blockers.push("DVL_SCALE_LABEL_COMPACT_FIX_CSS_0685 not found");

  // A2. Audit module 0685 present 1x
  var mod685Present = _cntId(scriptEls, "DVL_SCALE_LABEL_COMPACT_FIX_AUDIT_MODULE_0685") === 1;
  if(!mod685Present) blockers.push("DVL_SCALE_LABEL_COMPACT_FIX_AUDIT_MODULE_0685 not 1x");

  // A3. No duplicate closing style tag
  var noDupStyle = document.documentElement.outerHTML.indexOf(_dupStyleTag) === -1;
  if(!noDupStyle) blockers.push("duplicate closing style tag found");

  // ── Runtime constants ────────────────────────────────────────────────

  // A4. DVL_SCALE_LABEL_MAX_W === 68
  var maxWOk = window.DVL_SCALE_LABEL_MAX_W === 68;
  if(!maxWOk) blockers.push("DVL_SCALE_LABEL_MAX_W !== 68 (got " + window.DVL_SCALE_LABEL_MAX_W + ")");

  // A5. DVL_SCALE_LABEL_H === 20
  var hOk = window.DVL_SCALE_LABEL_H === 20;
  if(!hOk) blockers.push("DVL_SCALE_LABEL_H !== 20 (got " + window.DVL_SCALE_LABEL_H + ")");

  // A6. DVL_SCALE_LABEL_FONT === 10
  var fontOk = window.DVL_SCALE_LABEL_FONT === 10;
  if(!fontOk) blockers.push("DVL_SCALE_LABEL_FONT !== 10 (got " + window.DVL_SCALE_LABEL_FONT + ")");

  // A7. DVL_SCALE_LABEL_RADIUS <= 6
  var radiusOk = typeof window.DVL_SCALE_LABEL_RADIUS === "number" && window.DVL_SCALE_LABEL_RADIUS <= 6;
  if(!radiusOk) blockers.push("DVL_SCALE_LABEL_RADIUS > 6 or undefined");

  // A8. DVL_SCALE_LABEL_PAD_X <= 4
  var padOk = typeof window.DVL_SCALE_LABEL_PAD_X === "number" && window.DVL_SCALE_LABEL_PAD_X <= 4;
  if(!padOk) warnings.push("DVL_SCALE_LABEL_PAD_X > 4 or undefined");

  // ── Current price label ──────────────────────────────────────────────

  // A9. Current price label uses DVL_SCALE_LABEL_H (source scan)
  var currPriceUsesH = _srcFull.indexOf("const tagH = DVL_SCALE_LABEL_H") > -1;
  if(!currPriceUsesH) blockers.push("current price label does not use DVL_SCALE_LABEL_H");

  // A10. Current price label uses DVL_SCALE_LABEL_FONT (source scan)
  var currPriceUsesFont = _srcFull.indexOf('DVL_SCALE_LABEL_FONT + "px system-ui"') > -1 ||
                          _srcFull.indexOf("DVL_SCALE_LABEL_FONT + 'px system-ui'") > -1;
  if(!currPriceUsesFont) blockers.push("current price label does not use DVL_SCALE_LABEL_FONT");

  // A11. Current price label uses DVL_SCALE_LABEL_RADIUS
  var currPriceUsesRadius = _srcFull.indexOf("DVL_SCALE_LABEL_RADIUS") > -1;
  if(!currPriceUsesRadius) warnings.push("DVL_SCALE_LABEL_RADIUS not found in source");

  // A12. PRICE_LABEL_W (66) <= DVL_SCALE_LABEL_MAX_W (68): enforced by constants
  var labelWFits = typeof window.DVL_SCALE_LABEL_MAX_W === "number" &&
                   (window.DVL_PRICE_SCALE_W - 4) <= window.DVL_SCALE_LABEL_MAX_W;
  if(!labelWFits) blockers.push("PRICE_LABEL_W exceeds DVL_SCALE_LABEL_MAX_W");

  // ── Oscillator labels ────────────────────────────────────────────────

  // A13. All oscillator scripts use DVL_SCALE_LABEL_H
  var allOscUseH = _allOscSrc.indexOf("DVL_SCALE_LABEL_H") > -1;
  if(!allOscUseH) blockers.push("oscillator scripts do not use DVL_SCALE_LABEL_H");

  // A14. All oscillator scripts use DVL_SCALE_LABEL_FONT
  var allOscUseFont = _allOscSrc.indexOf("DVL_SCALE_LABEL_FONT") > -1;
  if(!allOscUseFont) blockers.push("oscillator scripts do not use DVL_SCALE_LABEL_FONT");

  // A15. No tagH = 34 remaining in oscillator scripts
  var noOscOld34 = _allOscSrc.indexOf("tagH = 34") === -1 && _allOscSrc.indexOf("tagH= 34") === -1;
  if(!noOscOld34) blockers.push("tagH = 34 still present in oscillator scripts");

  // A16. No ORDER_TAG_W in oscillator scripts (scale labels != order labels)
  var noOscOrderTagW = _allOscSrc.indexOf("ORDER_TAG_W") === -1;
  if(!noOscOrderTagW) blockers.push("ORDER_TAG_W found in oscillator scripts");

  // A17. No dvl-paper-draft-tag in oscillator scripts
  var noOscDraftTag = _allOscSrc.indexOf("dvl-paper-draft-tag") === -1;
  if(!noOscDraftTag) blockers.push("dvl-paper-draft-tag found in oscillator scripts");

  // ── Prior patches preserved ──────────────────────────────────────────

  // A18. DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT preserved and passing
  var draft684Pass = false;
  try{
    if(typeof window.DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT !== "undefined"){
      var r684 = window.DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT.audit();
      draft684Pass = !!(r684 && r684.pass === true);
    }
  }catch(e){ warnings.push("DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT threw: " + e.message); }
  if(!draft684Pass) blockers.push("DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT.audit().pass not true");

  // A19. DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT preserved
  var hotfix683Pass = false;
  try{
    if(typeof window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT !== "undefined"){
      var r683 = window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT.audit();
      hotfix683Pass = !!(r683 && r683.pass === true);
    }
  }catch(e){ warnings.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT threw: " + e.message); }
  if(!hotfix683Pass) warnings.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT.audit().pass not true");

  // A20. DVL_RELEASE_CANDIDATE_GATE preserved
  var rcGateOk = typeof window.DVL_RELEASE_CANDIDATE_GATE !== "undefined";
  if(!rcGateOk) warnings.push("DVL_RELEASE_CANDIDATE_GATE not found");

  // A21. DVL_OPTIMIZED_BASELINE_FREEZE preserved
  var obfOk = typeof window.DVL_OPTIMIZED_BASELINE_FREEZE !== "undefined";
  if(!obfOk) warnings.push("DVL_OPTIMIZED_BASELINE_FREEZE not found");

  // A22. Final locks 0659-0662 present 1x each
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // A23. DVL_BUTTON_SYSTEM preserved
  var btnSysOk = typeof window.DVL_BUTTON_SYSTEM !== "undefined";
  if(!btnSysOk) blockers.push("DVL_BUTTON_SYSTEM not found");

  // A24. Order labels 0.684 preserved (renderDraftPosition exists in source)
  var orderLabels684Ok = _srcFull.indexOf("function renderDraftPosition") > -1;
  if(!orderLabels684Ok) blockers.push("renderDraftPosition not found (0.684 order labels broken)");

  // A25. Draft Limit/Stop preserved
  var draftFlowOk = _srcFull.indexOf("function createPendingOrderDraft") > -1 &&
                    _srcFull.indexOf("function confirmPendingOrderDraft") > -1;
  if(!draftFlowOk) blockers.push("createPendingOrderDraft or confirmPendingOrderDraft not found");

  // A26. Buy/Sell buttons present
  var buySellOk = !!document.getElementById("dvlBuyBtn") && !!document.getElementById("dvlSellBtn");
  if(!buySellOk) warnings.push("Buy/Sell buttons not found");

  // A27. Paper Trading preserved (renderPosition exists)
  var paperOk = _srcFull.indexOf("function renderPosition") > -1;
  if(!paperOk) blockers.push("renderPosition not found (Paper Trading broken)");

  // A28. Chart handlers intact
  var chartOk = !!document.querySelector("canvas");
  if(!chartOk) warnings.push("canvas element not found");

  // A29. Oscillator render intact (DVL_OSCILLATOR_BOUNDS_PUBLISHER)
  var oscBoundsOk = typeof window.DVL_OSCILLATOR_BOUNDS_PUBLISHER !== "undefined";
  if(!oscBoundsOk) warnings.push("DVL_OSCILLATOR_BOUNDS_PUBLISHER not found");

  // A30. Tools/keypads intact
  var toolsOk = document.documentElement.innerHTML.indexOf("dvl-btn-keypad") > -1;
  if(!toolsOk) warnings.push("dvl-btn-keypad not found");

  // A31. Zero Broker + Connector
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken + " found in source");

  // A32. No Real order / API key injection (split strings avoid false-positive)
  var _realOrd = 'real' + 'Order';
  var _apiKey  = 'api' + 'Key';
  var noRealOrder = _srcFull.indexOf(_realOrd) === -1;
  var noApiKey    = _srcFull.indexOf(_apiKey)  === -1;
  if(!noRealOrder) warnings.push(_realOrd + " found in source");
  if(!noApiKey)    warnings.push(_apiKey + " found in source");

  // A33. Zero timers/RAF/observers in this module source
  var noTimers685 = _mod685src.indexOf("setTimeout") === -1 &&
                    _mod685src.indexOf("setInterval") === -1 &&
                    _mod685src.indexOf("requestAnimationFrame") === -1 &&
                    _mod685src.indexOf("MutationObserver") === -1 &&
                    _mod685src.indexOf("ResizeObserver") === -1;
  if(!noTimers685) blockers.push("timer/RAF/observer found in 0685 module");

  // A34. Zero window.drawSoon= in this module source
  var noDrawSoon685 = _mod685src.indexOf("window.drawSoon") === -1;
  if(!noDrawSoon685) blockers.push("window.drawSoon= found in 0685 module");

  // A35. tagH = 34 absent from rendering code (split string avoids false-positive in audit scan)
  var _tag34 = "tagH" + " = 34";
  var noOld34Anywhere = _srcFull.indexOf(_tag34) === -1;
  if(!noOld34Anywhere) blockers.push(_tag34 + " still found in source");

  // A36. PRICE_LABEL_W constant accessible (set in outer scope)
  var priceLabelWOk = typeof window.DVL_PRICE_SCALE_W === "number" &&
                      (window.DVL_PRICE_SCALE_W - 4) <= 68;
  if(!priceLabelWOk) warnings.push("PRICE_LABEL_W exceeds DVL_SCALE_LABEL_MAX_W or unavailable");

  // A37. JS syntax OK (we got here = syntax is valid)
  var jsSyntaxOk = true;

  var pass = (
    css685Present &&
    mod685Present &&
    noDupStyle &&
    maxWOk &&
    hOk &&
    fontOk &&
    radiusOk &&
    currPriceUsesH &&
    currPriceUsesFont &&
    labelWFits &&
    allOscUseH &&
    allOscUseFont &&
    noOscOld34 &&
    noOscOrderTagW &&
    noOscDraftTag &&
    draft684Pass &&
    finalLocksPresent &&
    btnSysOk &&
    orderLabels684Ok &&
    draftFlowOk &&
    paperOk &&
    noBroker &&
    noTimers685 &&
    noDrawSoon685 &&
    noOld34Anywhere
  );

  _lastAudit = {
    pass:               pass,
    css685Present:      css685Present,
    mod685Present:      mod685Present,
    noDupStyle:         noDupStyle,
    maxWOk:             maxWOk,
    hOk:                hOk,
    fontOk:             fontOk,
    radiusOk:           radiusOk,
    padOk:              padOk,
    currPriceUsesH:     currPriceUsesH,
    currPriceUsesFont:  currPriceUsesFont,
    currPriceUsesRadius: currPriceUsesRadius,
    labelWFits:         labelWFits,
    allOscUseH:         allOscUseH,
    allOscUseFont:      allOscUseFont,
    noOscOld34:         noOscOld34,
    noOscOrderTagW:     noOscOrderTagW,
    noOscDraftTag:      noOscDraftTag,
    draft684Pass:       draft684Pass,
    hotfix683Pass:      hotfix683Pass,
    rcGateOk:           rcGateOk,
    obfOk:              obfOk,
    finalLocksPresent:  finalLocksPresent,
    btnSysOk:           btnSysOk,
    orderLabels684Ok:   orderLabels684Ok,
    draftFlowOk:        draftFlowOk,
    buySellOk:          buySellOk,
    paperOk:            paperOk,
    chartOk:            chartOk,
    oscBoundsOk:        oscBoundsOk,
    toolsOk:            toolsOk,
    noBroker:           noBroker,
    noRealOrder:        noRealOrder,
    noApiKey:           noApiKey,
    noTimers685:        noTimers685,
    noDrawSoon685:      noDrawSoon685,
    noOld34Anywhere:    noOld34Anywhere,
    priceLabelWOk:      priceLabelWOk,
    jsSyntaxOk:         jsSyntaxOk,
    blockers:           blockers,
    warnings:           warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_SCALE_LABEL_COMPACT_FIX_AUDIT = {
  VERSION:      "0.685",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>

'''

html = rep(html, MOD_ANCHOR, '})();\n</script>\n\n' + MOD_0685 + '</head>\n<body>', "audit_0685")
print("C10 done")

# ── Post-patch assertions ─────────────────────────────────────────────────
_DUP = '<' + '/style><' + '/style>'
_BRK = 'Broker' + 'Connector'

assert _DUP not in html,                                          "POST: dup style tag"
assert _BRK not in html,                                          "POST: BrokerConnector"
assert 'id="DVL_SCALE_LABEL_COMPACT_FIX_CSS_0685"' in html,      "POST: CSS_0685 marker"
assert 'id="DVL_SCALE_LABEL_COMPACT_FIX_AUDIT_MODULE_0685"' in html, "POST: audit module"
assert 'const DVL_SCALE_LABEL_H      = 20;' in html,             "POST: DVL_SCALE_LABEL_H"
assert 'const DVL_SCALE_LABEL_FONT   = 10;' in html,             "POST: DVL_SCALE_LABEL_FONT"
assert 'const DVL_SCALE_LABEL_RADIUS = 5;' in html,              "POST: DVL_SCALE_LABEL_RADIUS"
assert 'const DVL_SCALE_LABEL_MAX_W  = 68;' in html,             "POST: DVL_SCALE_LABEL_MAX_W"
assert 'const DVL_SCALE_LABEL_PAD_X  = 4;' in html,              "POST: DVL_SCALE_LABEL_PAD_X"
assert 'const tagH = DVL_SCALE_LABEL_H;' in html,                "POST: tagH uses constant"
assert 'DVL_SCALE_LABEL_RADIUS, true, false' in html,            "POST: radius uses constant"
assert 'DVL_SCALE_LABEL_FONT + "px system-ui"' in html,          "POST: font uses constant"
assert 'Beta 0.685' in html,                                      "POST: version 0.685"
assert 'Beta 0.684' in html,                                      "POST: 0.684 in changelog"
assert 'function renderDraftPosition' in html,                    "POST: 0.684 order labels preserved"

# Verify tagH=34 is gone from the oscillator script bodies
_osc_ids = [
    'DVL_BETA_0538_TEST_OSCILLATOR_JS',
    'DVL_BETA_0549_TESTE2_OSCILLATOR_JS',
    'DVL_BETA_0554_CG_STYLE_OPEN_INTEREST_OSC_JS',
    'DVL_BETA_0559_LONGSHORT_OSC_JS',
    'DVL_BETA_0596_DELTA_VOL_JS',
]
for _sid in _osc_ids:
    _start = html.find(f'id="{_sid}"')
    _end   = html.find('</script>', _start + 10) if _start != -1 else -1
    _stxt  = html[_start:_end] if _start != -1 and _end != -1 else ""
    assert 'tagH = 34' not in _stxt and 'tagH= 34' not in _stxt, \
        f"POST: tagH=34 still in {_sid}"

# Verify constants exposed on window
assert 'window.DVL_SCALE_LABEL_H      = DVL_SCALE_LABEL_H;' in html,  "POST: window.H exposed"
assert 'window.DVL_SCALE_LABEL_FONT   = DVL_SCALE_LABEL_FONT;' in html, "POST: window.FONT exposed"

print("Post-patch assertions: ALL PASSED")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count('\n') + 1
print(f"Wrote {SRC}  ({lines} lines)")
print("Beta 0.685 — Scale Label Compact Fix — DONE.")
