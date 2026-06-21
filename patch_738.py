#!/usr/bin/env python3
"""patch_738.py — Beta 0.738: demo wallet 10k + reset button next to DEMO pill."""
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

print("=== patch_738.py — Beta 0.738 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.737</title>',
    '<title>DVL Binance Live — Beta 0.738</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.737";',
    'const DVL_APP_VERSION = "Beta 0.738";', "version const")

html = rep(html,
    '>BETA 0.737</span>',
    '>BETA 0.738</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.737 — position cards reduced to 40px; list height capped." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.738 — demo wallet starts at 10k, tracks realized PnL; reset ↺ button next to DEMO pill." },\n  { version: "Beta 0.737", note: "Beta 0.737 — position cards reduced to 40px; list height capped." },',
    "changelog")

# ── 2. Audit bump 0737 → 0738 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0737_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0738_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.737"',
    'window.DVL_APP_VERSION==="Beta 0.738"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.737' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.738' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.737")===-1) blockers.push("A2: title missing 0.737")',
    'indexOf("0.738")===-1) blockers.push("A2: title missing 0.738")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0737_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0738_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Static wallet value: give it an id + reset to 10,000 ──────────────────────
html = rep(html,
    '          <div class="metricValue">1,716.45</div>',
    '          <div class="metricValue" id="dvlWalletValue">10,000.00</div>',
    "wallet metric: add id + reset initial value")

# ── 4. DEMO pill: add reset button ↺ ─────────────────────────────────────────────
html = rep(html,
    '        <div class="demoPill">DEMO</div>',
    '        <div class="demoPill">DEMO<button class="dvlDemoReset" type="button" id="dvlDemoResetBtn" aria-label="Resetar wallet demo">&#x21BA;</button></div>',
    "demoPill: add reset button")

# ── 5. Wallet module (before </body></html>) ──────────────────────────────────────
WALLET_MODULE = (
    '\n<script id="DVL_DEMO_WALLET_MODULE_0738">\n'
    '(function(){\n'
    '"use strict";\n'
    'if(window.DVL_DEMO_WALLET_0738) return;\n'
    '\n'
    'var INITIAL = 10000;\n'
    '\n'
    'function calcWallet(){\n'
    '  var v2=window.DVL_PAPER_TRADING_V2_PRO;\n'
    '  if(!v2) return INITIAL;\n'
    '  try{\n'
    '    var st=v2.getState();\n'
    '    if(!st||!Array.isArray(st.orders)) return INITIAL;\n'
    '    var total=INITIAL;\n'
    '    for(var i=0;i<st.orders.length;i++){\n'
    '      var o=st.orders[i];\n'
    '      if(!o||o.status!=="closed") continue;\n'
    '      var pnl=Number(o.realizedPnl);\n'
    '      if(Number.isFinite(pnl)) total+=pnl;\n'
    '    }\n'
    '    return total;\n'
    '  }catch(_){ return INITIAL; }\n'
    '}\n'
    '\n'
    'function updateDisplay(){\n'
    '  var el=document.getElementById("dvlWalletValue");\n'
    '  if(!el) return;\n'
    '  var w=calcWallet();\n'
    '  el.textContent=w.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});\n'
    '}\n'
    '\n'
    'function resetWallet(){\n'
    '  var v2=window.DVL_PAPER_TRADING_V2_PRO;\n'
    '  if(v2){\n'
    '    try{ var st=v2.getState(); if(st){ st.orders=[]; st.selectedId=null; st.drag=null; st.edit=null; } }catch(_){}\n'
    '    try{\n'
    '      var keys=[];\n'
    '      for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));\n'
    '      for(var j=0;j<keys.length;j++) if(String(keys[j]).indexOf("dvl_paper_v2_pro_0695_")===0) try{ localStorage.removeItem(keys[j]); }catch(_){}\n'
    '    }catch(_){}\n'
    '    try{ v2.render(); }catch(_){}\n'
    '  }\n'
    '  try{ if(window.DVL_POSITIONS_REFRESH) window.DVL_POSITIONS_REFRESH(); }catch(_){}\n'
    '  updateDisplay();\n'
    '}\n'
    '\n'
    'function addStyles(){\n'
    '  if(document.getElementById("DVL_DEMO_WALLET_STYLE_0738")) return;\n'
    '  var s=document.createElement("style");\n'
    '  s.id="DVL_DEMO_WALLET_STYLE_0738";\n'
    '  s.textContent=\n'
    '    ".dvlDemoReset{background:none!important;border:none!important;color:var(--orange)!important;"\n'
    '    "opacity:.60!important;cursor:pointer!important;font-size:16px!important;line-height:1!important;"\n'
    '    "padding:0 0 0 5px!important;display:inline-grid!important;place-items:center!important;}"\n'
    '    ".dvlDemoReset:hover,.dvlDemoReset:active{opacity:1!important;}";\n'
    '  (document.head||document.documentElement).appendChild(s);\n'
    '}\n'
    '\n'
    'function init(){\n'
    '  addStyles();\n'
    '  var btn=document.getElementById("dvlDemoResetBtn");\n'
    '  if(btn) btn.addEventListener("click",function(ev){ ev.preventDefault(); ev.stopPropagation(); resetWallet(); },false);\n'
    '  window.addEventListener("dvl:paper-v2-close", updateDisplay, false);\n'
    '  updateDisplay();\n'
    '}\n'
    '\n'
    'window.DVL_DEMO_WALLET_0738={calc:calcWallet,reset:resetWallet,update:updateDisplay};\n'
    '\n'
    'if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});\n'
    'else init();\n'
    '})();\n'
    '</script>\n'
)

html = rep(html,
    '</body>\n</html>',
    WALLET_MODULE + '</body>\n</html>',
    "add wallet module before </body>")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
