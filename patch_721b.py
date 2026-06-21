#!/usr/bin/env python3
"""patch_721b.py — Beta 0.721 amendment: compact Indicators dropdown per approved mockup."""
import sys, re

PATH = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label, expect=1):
    count = html.count(old)
    if count != expect:
        print(f"ABORT [{label}] — expected {expect} occ, got {count}")
        sys.exit(1)
    html = html.replace(old, new, expect)
    print(f"  OK: {label}")
    return html

def rep_re(html, pattern, new, label):
    html2, n = re.subn(pattern, new, html, flags=re.DOTALL)
    if n != 1:
        print(f"ABORT [{label}] — expected 1 regex match, got {n}")
        sys.exit(1)
    print(f"  OK: {label}")
    return html2

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_721b.py — Beta 0.721 (compact indicator dropdown) ===")

# ── 1. Changelog: update 0.721 note ────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.721 — expanded indicator dropdown proportions to match 0.728 reference, fixed Trade button top-clip (margin-top correction)." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.721 — compact Indicators dropdown remodel based on approved mockup, preserving existing indicator logic." },',
    "changelog 0.721 note")

# ── 2. Audit: add A77, bump N to 77 ─────────────────────────────────────────
html = rep(html,
    '// A76. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A76: setCandleMode missing");\n'
    '\n'
    'var N=76, name="DVL_UI_OVERLAY_PHASE_0721_AUDIT_MODULE";',

    '// A76. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A76: setCandleMode missing");\n'
    '// A77. Indicators dropdown compact: width ≤ 320px when open\n'
    '(function(){if(document.documentElement.classList.contains("dvl1b-ind-open")){'
    'var d=document.getElementById("indicatorDropdown");if(d){var w=parseFloat(getComputedStyle(d).width);if(w>336)warnings.push("A77: #indicatorDropdown width="+w+"px — expected ≤336px");}}'
    '})();\n'
    '\n'
    'var N=77, name="DVL_UI_OVERLAY_PHASE_0721_AUDIT_MODULE";',
    "audit: A77 + N=77")

# ── 3. Replace DVL_721_INDIC_PROPORTIONS block with compact version ─────────
NEW_INDIC_BLOCK = """\
<style id="DVL_721_INDIC_PROPORTIONS">
/* ─── Beta 0.721 — Compact Indicators dropdown (approved mockup) ─── */
/* CSS !important overrides positionInd() non-!important inline styles. No JS touched. */

/* Center wrapper horizontally; JS-set top (button.bottom) stays correct */
html.dvl1b-ind-open #fxIndicatorWrap{
  left:50% !important;
  transform:translateX(-50%) !important;
  width:min(320px,calc(100vw - 28px)) !important;
}

/* Dropdown: compact, scrollable, full-width within centered wrapper */
html.dvl1b-ind-open #fxIndicatorWrap .indicatorDropdown,
html.dvl1b-ind-open #indicatorDropdown{
  left:0 !important;
  right:0 !important;
  width:100% !important;
  max-height:52vh !important;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  -webkit-overflow-scrolling:touch !important;
  scrollbar-width:none !important;
  border-radius:14px !important;
  background:linear-gradient(180deg,rgba(8,18,15,.98),rgba(5,12,10,.99)) !important;
  border:1px solid rgba(110,140,130,.22) !important;
  box-shadow:0 16px 42px rgba(0,0,0,.60),0 0 0 1px rgba(145,175,165,.05) !important;
  top:calc(100% + 8px) !important;
}
html.dvl1b-ind-open #fxIndicatorWrap .indicatorDropdown::-webkit-scrollbar,
html.dvl1b-ind-open #indicatorDropdown::-webkit-scrollbar{
  display:none !important;
}

/* Header: "INDICATORS" — compact 38px, uppercase */
html.dvl1b-ind-open .indicatorDropHead{
  height:38px !important;
  min-height:38px !important;
  padding:0 12px !important;
  border-bottom:1px solid rgba(110,140,130,.12) !important;
  background:transparent !important;
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
}
html.dvl1b-ind-open .indicatorDropHead b{
  font-size:11px !important;
  font-weight:800 !important;
  color:#a5c8b5 !important;
  text-transform:uppercase !important;
  letter-spacing:.08em !important;
}
html.dvl1b-ind-open .indicatorDropHead small{
  display:none !important;
}

/* Rows: compact 50-56px */
html.dvl1b-ind-open .indicatorItem{
  min-height:50px !important;
  max-height:56px !important;
  padding:7px 12px !important;
  grid-template-columns:32px minmax(0,1fr) 42px !important;
  gap:8px !important;
  border-bottom:1px solid rgba(110,140,130,.07) !important;
  align-items:center !important;
}
html.dvl1b-ind-open .indicatorItem:last-child{
  border-bottom:none !important;
}

/* Icon badge: 32×32px */
html.dvl1b-ind-open .indicatorFxMark{
  width:32px !important;
  height:32px !important;
  min-width:32px !important;
  min-height:32px !important;
  border-radius:8px !important;
  font-size:9px !important;
}

/* Name + subtitle text */
html.dvl1b-ind-open .indicatorItem b{
  font-size:13px !important;
  font-weight:700 !important;
  color:#dde8e2 !important;
  display:block !important;
  line-height:1.2 !important;
}
html.dvl1b-ind-open .indicatorItem small{
  font-size:10px !important;
  color:#6a8a78 !important;
  line-height:1.3 !important;
  display:block !important;
}
html.dvl1b-ind-open .indicatorItem i{
  font-size:9px !important;
}

/* Toggle: 40×20px, ON=#10df77, OFF=green-grey — no blue */
html.dvl1b-ind-open .indicatorItem .dvl-vt-state{
  width:40px !important;
  min-width:40px !important;
  max-width:40px !important;
  height:20px !important;
  flex:0 0 40px !important;
  border-color:rgba(110,140,130,.30) !important;
  background:rgba(5,14,12,.84) !important;
}
/* Hide OFF/ON text labels in compact mode */
html.dvl1b-ind-open .indicatorItem .dvl-vt-state::before{
  font-size:0 !important;
  content:"" !important;
}
/* OFF knob: muted green-grey */
html.dvl1b-ind-open .indicatorItem .dvl-vt-state::after{
  background:#8a9a90 !important;
  box-shadow:none !important;
  width:14px !important;
  height:14px !important;
}
/* ON track: green */
html.dvl1b-ind-open .indicatorItem .dvl-vt-state.is-on{
  border-color:rgba(16,223,119,.48) !important;
  background:rgba(5,24,20,.92) !important;
}
/* ON knob: DVL green */
html.dvl1b-ind-open .indicatorItem .dvl-vt-state.is-on::after{
  transform:translateX(22px) !important;
  background:#10df77 !important;
  box-shadow:0 0 8px rgba(16,223,119,.24) !important;
}

/* "Mais indicadores abaixo ˅" — CSS footer at bottom of scroll */
html.dvl1b-ind-open #indicatorDropdown::after{
  content:"Mais indicadores abaixo  \02C5";
  display:block;
  text-align:center;
  font-size:10.5px;
  font-weight:500;
  color:rgba(110,140,130,.55);
  padding:8px 12px 10px;
  border-top:1px solid rgba(110,140,130,.08);
  letter-spacing:.02em;
  pointer-events:none;
}

/* Active Indicators button: green while panel is open (reinforcement) */
html.dvl1b-ind-open #dvl1b_indBtn{
  color:#10df77 !important;
  background:rgba(16,223,119,.10) !important;
  border-color:rgba(16,223,119,.30) !important;
}
</style>
"""

html = rep_re(html,
    r'<style id="DVL_721_INDIC_PROPORTIONS">.*?</style>',
    NEW_INDIC_BLOCK.rstrip('\n'),
    "replace DVL_721_INDIC_PROPORTIONS block")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
