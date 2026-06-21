#!/usr/bin/env python3
"""patch_735.py — Beta 0.735: Real mode shows no demo data; pending cards get delete button."""
import sys

PATH = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label, expect=1):
    count = html.count(old)
    if count != expect:
        print(f"ABORT [{label}] — expected {expect} occ, got {count}")
        sys.exit(1)
    html = html.replace(old, new, expect)
    print(f"  OK: {label}")
    return html

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_735.py — Beta 0.735 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.734</title>',
    '<title>DVL Binance Live — Beta 0.735</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.734";',
    'const DVL_APP_VERSION = "Beta 0.735";', "version const")

html = rep(html,
    '>BETA 0.734</span>',
    '>BETA 0.735</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.734 — fixed history detail using live price instead of realizedPnl; timeline now shows date." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.735 — Real mode shows no demo data; pending orders have delete button." },\n  { version: "Beta 0.734", note: "Beta 0.734 — fixed history detail using live price instead of realizedPnl; timeline now shows date." },',
    "changelog")

# ── 2. Audit bump 0734 → 0735 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0734_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0735_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.734"',
    'window.DVL_APP_VERSION==="Beta 0.735"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.734' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.735' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.734")===-1) blockers.push("A2: title missing 0.734")',
    'indexOf("0.735")===-1) blockers.push("A2: title missing 0.735")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0734_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0735_AUDIT_MODULE";',
    "audit name bump")

# ── 3. CSS: add .dvlPosV2Del button style ────────────────────────────────────────
html = rep(html,
    '.dvlPosV2Next{\n'
    '  width:13px!important;\n'
    '  height:13px!important;\n'
    '  border-right:3px solid var(--dvl-pos-muted)!important;\n'
    '  border-bottom:3px solid var(--dvl-pos-muted)!important;\n'
    '  transform:rotate(-45deg)!important;\n'
    '  opacity:.9!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Empty{',
    '.dvlPosV2Next{\n'
    '  width:13px!important;\n'
    '  height:13px!important;\n'
    '  border-right:3px solid var(--dvl-pos-muted)!important;\n'
    '  border-bottom:3px solid var(--dvl-pos-muted)!important;\n'
    '  transform:rotate(-45deg)!important;\n'
    '  opacity:.9!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Del{\n'
    '  width:20px!important;\n'
    '  height:20px!important;\n'
    '  border-radius:50%!important;\n'
    '  background:rgba(231,61,61,.12)!important;\n'
    '  border:1px solid rgba(231,61,61,.38)!important;\n'
    '  color:#e73d3d!important;\n'
    '  font-size:15px!important;\n'
    '  font-weight:900!important;\n'
    '  display:grid!important;\n'
    '  place-items:center!important;\n'
    '  cursor:pointer!important;\n'
    '  padding:0!important;\n'
    '  line-height:1!important;\n'
    '  justify-self:center!important;\n'
    '}\n'
    '\n'
    '.dvlPosV2Empty{',
    "CSS: add .dvlPosV2Del")

# ── 4. syncFromAdapter: return empty when Real mode ──────────────────────────────
html = rep(html,
    '  function syncFromAdapter(){\n'
    '    var rows=window.DVL_POSITIONS_ADAPTER?window.DVL_POSITIONS_ADAPTER.readOrders():{open:[],pending:[],history:[]};\n'
    '    data.open=rows.open;\n'
    '    data.pending=rows.pending;\n'
    '    data.history=rows.history;\n'
    '  }',
    '  function syncFromAdapter(){\n'
    '    if(state.mode === "real"){ data.open=[]; data.pending=[]; data.history=[]; return; }\n'
    '    var rows=window.DVL_POSITIONS_ADAPTER?window.DVL_POSITIONS_ADAPTER.readOrders():{open:[],pending:[],history:[]};\n'
    '    data.open=rows.open;\n'
    '    data.pending=rows.pending;\n'
    '    data.history=rows.history;\n'
    '  }',
    "syncFromAdapter: empty on Real mode")

# ── 5. renderList: del button for pending, arrow for others ──────────────────────
html = rep(html,
    '          \'<div class="dvlPosV2Next"></div>\' +',
    '          (state.activeTab === "pending" ?\n'
    '            \'<button class="dvlPosV2Del" type="button" data-dvl-del-id="\' + (row.id||"") + \'">×</button>\' :\n'
    '            \'<div class="dvlPosV2Next"></div>\') +',
    "renderList: del button for pending")

# ── 6. Mode button: also refresh list so Real mode clears instantly ───────────────
html = rep(html,
    '        if(modeBtn){\n'
    '          state.mode = modeBtn.getAttribute("data-dvl-mode");\n'
    '          renderModes();\n'
    '          return;\n'
    '        }',
    '        if(modeBtn){\n'
    '          state.mode = modeBtn.getAttribute("data-dvl-mode");\n'
    '          renderModes();\n'
    '          renderList();\n'
    '          return;\n'
    '        }',
    "mode toggle: also renderList")

# ── 7. Panel click handler: add delete handler ───────────────────────────────────
html = rep(html,
    '        var tabBtn = ev.target.closest ? ev.target.closest("[data-dvl-tab]") : null;\n'
    '        if(tabBtn){\n'
    '          state.activeTab = tabBtn.getAttribute("data-dvl-tab");\n'
    '          renderTabs();\n'
    '          renderList();\n'
    '        }\n'
    '      });\n'
    '    }',
    '        var tabBtn = ev.target.closest ? ev.target.closest("[data-dvl-tab]") : null;\n'
    '        if(tabBtn){\n'
    '          state.activeTab = tabBtn.getAttribute("data-dvl-tab");\n'
    '          renderTabs();\n'
    '          renderList();\n'
    '          return;\n'
    '        }\n'
    '        var delBtn = ev.target.closest ? ev.target.closest("[data-dvl-del-id]") : null;\n'
    '        if(delBtn){\n'
    '          var delId = delBtn.getAttribute("data-dvl-del-id");\n'
    '          if(delId && window.DVL_PAPER_TRADING_V2_PRO) window.DVL_PAPER_TRADING_V2_PRO.cancelPaperOrder(delId);\n'
    '          renderList();\n'
    '        }\n'
    '      });\n'
    '    }',
    "panel handler: add delete")

# ── 8. Details capture handler: skip del-button clicks (don't open details) ──────
html = rep(html,
    '    var closeBtn = ev.target.closest ? ev.target.closest("[data-dvl-detail-close]") : null;\n'
    '    if(closeBtn){ closeDetails(); return; }\n'
    '\n'
    '    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;',
    '    var closeBtn = ev.target.closest ? ev.target.closest("[data-dvl-detail-close]") : null;\n'
    '    if(closeBtn){ closeDetails(); return; }\n'
    '    var delBtn = ev.target.closest ? ev.target.closest("[data-dvl-del-id]") : null;\n'
    '    if(delBtn) return;\n'
    '\n'
    '    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;',
    "details capture: skip del-button")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
