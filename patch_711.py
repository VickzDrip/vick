#!/usr/bin/env python3
"""patch_711.py — Beta 0.711: Cache-bust meta + Phase 2C (Drawings)

Two changes:
  A) Cache-Control meta tags in <head> so mobile browsers don't serve
     a stale cached version (fixes "shows 0.706 on mobile" issue).

  B) Phase 2C: wires ONLY the new-UI Desenhos button to the EXISTING
     old drawing tools panel (#assetToolsShell / #assetToolsMenu) by
     calling the old open/close pattern (is-open class + aria attrs).
     Also exposes via window.dvlCloseDrawToolsMenu (already exported).
     Visibility trick mirrors Phase 2B: .marketRow ghost-revealed,
     #assetToolsShell repositioned fixed under the new button.
     Theme override (green/black) applied for visual consistency.

Not connected: Settings. Indicators 2B and Velas 2A unchanged.
No chart/zoom/pan/scale/oscillator/paper/drawing logic/API changes.
No iframe, no second file. Namespaced ids, fail-safe preserved.
No timers/observers. Version: 0.710 -> 0.711.
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
print(f"Loaded index.html: {len(html)} chars, {html.count(chr(10))+1} lines")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 1 — Version bump 0.710 -> 0.711
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.710</title>',
                 '<title>DVL Binance Live — Beta 0.711</title>', "title")
html = rep(html, '>BETA 0.710</div>', '>BETA 0.711</div>', "host_badge")
html = rep(html, '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.710</span>',
                 '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.711</span>', "new_badge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.710";',
                 'const DVL_APP_VERSION = "Beta 0.711";', "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.710 — Phase 2B-FIX (Theme Unification): CSS-only re-skin of the old #indicatorDropdown to match the new green/black UI when opened from the overlay (scoped to html.dvl1b-ind-open). Green/black gradient, green border, no cyan glow, muted soon labels in gold/gray. No new functional bridges; indicator logic untouched; Desenhos/Settings unconnected; Velas unchanged." },\n'
    '  { version: "Beta 0.709", note: "Beta 0.709',
    '  { version: DVL_APP_VERSION, note: "Beta 0.711 — Phase 2C (Drawings): the new-UI Desenhos button now opens the existing old drawing tools panel (#assetToolsShell/#assetToolsMenu) via the old is-open/aria pattern (dvlCloseDrawToolsMenu reused). Panel revealed from the hidden .marketRow with the same visibility trick used for indicators; repositioned fixed under the new button. Green/black theme applied. Cache-Control meta tags added to fix mobile browser caching. Settings still not connected; Indicators 2B and Velas 2A unchanged." },\n'
    '  { version: "Beta 0.710", note: "Beta 0.710 — Phase 2B-FIX (Theme Unification): CSS-only re-skin of the old #indicatorDropdown to match the new green/black UI when opened from the overlay (scoped to html.dvl1b-ind-open). Green/black gradient, green border, no cyan glow, muted soon labels in gold/gray. No new functional bridges; indicator logic untouched; Desenhos/Settings unconnected; Velas unchanged." },\n'
    '  { version: "Beta 0.709", note: "Beta 0.709',
    "changelog_0711")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — Cache-Control meta tags (mobile cache-bust fix)
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />\n'
    '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n'
    '<meta http-equiv="Pragma" content="no-cache" />\n'
    '<meta http-equiv="Expires" content="0" />',
    "cache_meta")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — CSS: reveal old drawing tools panel + green/black theme override
#          Inserted before </style> of the Phase 1B CSS block.
# ═══════════════════════════════════════════════════════════════════════════════
DRAW_CSS = (
'/* Phase 2C: reveal the OLD drawing tools shell from the hidden .marketRow, anchored under the new button. */\n'
'html.dvl1b-draw-open .marketRow{ display:block !important; visibility:hidden !important; position:fixed !important; left:0 !important; top:0 !important; width:0 !important; height:0 !important; min-height:0 !important; padding:0 !important; margin:0 !important; border:0 !important; background:transparent !important; box-shadow:none !important; overflow:visible !important; pointer-events:none !important; z-index:100000 !important; }\n'
'html.dvl1b-draw-open #assetToolsShell{ display:block !important; visibility:visible !important; position:fixed !important; overflow:visible !important; pointer-events:auto !important; z-index:100000 !important; }\n'
'html.dvl1b-draw-open #assetToolsShell *{ visibility:visible !important; }\n'
'/* Phase 2C: green/black theme override for old drawing tools menu */\n'
'html.dvl1b-draw-open #assetToolsMenu{\n'
'  background:linear-gradient(180deg,rgba(8,18,15,.98),rgba(5,12,10,.98)) !important;\n'
'  border:1px solid rgba(150,180,165,.20) !important;\n'
'  box-shadow:0 18px 46px rgba(0,0,0,.55) !important;\n'
'  border-radius:12px !important;\n'
'  color:#d4e0d9 !important;\n'
'  max-height:min(340px, calc(100svh - 120px)) !important;\n'
'}\n'
'html.dvl1b-draw-open .assetToolsMenuHead{ background:transparent !important; border-bottom:1px solid rgba(150,180,165,.12) !important; }\n'
'html.dvl1b-draw-open .assetToolsMenuHead b{ color:#c8d8cf !important; }\n'
'html.dvl1b-draw-open .assetToolsMenuHead small{ color:#6a8a78 !important; }\n'
'html.dvl1b-draw-open .assetToolsMenuList{ scrollbar-width:none !important; }\n'
'html.dvl1b-draw-open .assetToolMenuItem{ background:rgba(16,223,119,.04) !important; border:1px solid rgba(150,180,165,.10) !important; color:#c8d8cf !important; border-radius:8px !important; }\n'
'html.dvl1b-draw-open .assetToolMenuItem:hover,\n'
'html.dvl1b-draw-open .assetToolMenuItem:focus{ background:rgba(16,223,119,.10) !important; color:#eef2f0 !important; border-color:rgba(16,223,119,.22) !important; }\n'
'html.dvl1b-draw-open .assetToolMenuItem svg,\n'
'html.dvl1b-draw-open .assetToolMenuItem path,\n'
'html.dvl1b-draw-open .assetToolMenuItem line,\n'
'html.dvl1b-draw-open .assetToolMenuItem circle,\n'
'html.dvl1b-draw-open .assetToolMenuItem rect,\n'
'html.dvl1b-draw-open .assetToolMenuItem polyline,\n'
'html.dvl1b-draw-open .assetToolMenuItem polygon{ stroke:#8fb8a0 !important; fill:none !important; }\n'
'html.dvl1b-draw-open .assetToolsShell.is-open > .assetToolBtn.toolGear{ color:#10df77 !important; background:rgba(16,223,119,.08) !important; box-shadow:inset 0 0 0 1px rgba(16,223,119,.30) !important; }\n'
)
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act.dvl1b-open{ color:var(--b-accent); background:rgba(16,223,119,.10); border:calc(1 * var(--px)) solid rgba(16,223,119,.30); }\n</style>',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act.dvl1b-open{ color:var(--b-accent); background:rgba(16,223,119,.10); border:calc(1 * var(--px)) solid rgba(16,223,119,.30); }\n'
    + DRAW_CSS + '</style>',
    "draw_css")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — JS: wire new Desenhos button to old open/close (insert before helper)
# ═══════════════════════════════════════════════════════════════════════════════
DRAW_JS = (
'  /* ── Phase 2C: Desenhos — open the OLD drawing tools menu (reuse old DOM + fns) ── */\n'
'  var drawBtn=document.getElementById("dvl1b_drawBtn");\n'
'  var drawOpen=false;\n'
'  function drawShell(){ return document.getElementById("assetToolsShell"); }\n'
'  function positionDraw(){ var shell=drawShell(); if(!shell||!drawBtn) return; try{ var r=drawBtn.getBoundingClientRect(); var vw=window.innerWidth||360; shell.style.top=Math.round(r.bottom)+"px"; shell.style.right=Math.max(8, vw-Math.round(r.right))+"px"; shell.style.width="0"; shell.style.height="0"; }catch(_e){} }\n'
'  function closeDraw(){ drawOpen=false; try{ document.documentElement.classList.remove("dvl1b-draw-open"); }catch(_e){} if(drawBtn) drawBtn.classList.remove("dvl1b-open"); try{ if(typeof window.dvlCloseDrawToolsMenu==="function") window.dvlCloseDrawToolsMenu(); else{ var sh=drawShell(); var mn=document.getElementById("assetToolsMenu"); var gr=document.getElementById("assetToolsGear"); if(sh) sh.classList.remove("is-open"); if(mn) mn.setAttribute("aria-hidden","true"); if(gr) gr.setAttribute("aria-expanded","false"); } }catch(_e){} var sh=drawShell(); if(sh){ sh.style.top=""; sh.style.right=""; sh.style.width=""; sh.style.height=""; } }\n'
'  function openDraw(){ try{ document.documentElement.classList.add("dvl1b-draw-open"); }catch(_e){} positionDraw(); try{ var sh=drawShell(); var mn=document.getElementById("assetToolsMenu"); var gr=document.getElementById("assetToolsGear"); if(sh) sh.classList.add("is-open"); if(mn) mn.setAttribute("aria-hidden","false"); if(gr) gr.setAttribute("aria-expanded","true"); }catch(_e){} if(drawBtn) drawBtn.classList.add("dvl1b-open"); drawOpen=true; positionDraw(); }\n'
'  if(drawBtn) drawBtn.addEventListener("click", function(e){ e.stopPropagation(); if(drawOpen) closeDraw(); else openDraw(); }, false);\n'
'  document.addEventListener("click", function(e){ if(!drawOpen) return; var sh=drawShell(); var inSh=sh&&sh.contains(e.target); var inBtn=drawBtn&&drawBtn.contains(e.target); if(!inSh&&!inBtn) closeDraw(); }, false);\n\n'
)
html = rep(html,
    '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    DRAW_JS + '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    "draw_js")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 5 — Audit -> Phase 2C 0.711
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_2B_FIX_AUDIT_MODULE_0710">',
    '<script id="DVL_UI_OVERLAY_PHASE_2C_AUDIT_MODULE_0711">',
    "audit_id")
html = rep(html,
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.710"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.710\' (got: "+window.DVL_APP_VERSION+")");',
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.711"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.711\' (got: "+window.DVL_APP_VERSION+")");',
    "audit_a1")
html = rep(html,
    'if(!_t || (_t.textContent||"").indexOf("0.710")===-1) blockers.push("A2: title missing 0.710");',
    'if(!_t || (_t.textContent||"").indexOf("0.711")===-1) blockers.push("A2: title missing 0.711");',
    "audit_a2")
html = rep(html,
    'var N=28, name="DVL_UI_OVERLAY_PHASE_2B_FIX_AUDIT_MODULE_0710";',
    '// A29. Phase 2C: Drawings button present\n'
    'if(!document.getElementById("dvl1b_drawBtn")) blockers.push("A29: new Drawings button (dvl1b_drawBtn) missing");\n'
    '// A30. Old drawing tools DOM intact\n'
    'if(!document.getElementById("assetToolsShell")||!document.getElementById("assetToolsMenu")) blockers.push("A30: old drawing tools DOM (#assetToolsShell/#assetToolsMenu) missing");\n'
    '// A31. dvlCloseDrawToolsMenu reachable\n'
    'if(typeof window.dvlCloseDrawToolsMenu!=="function") warnings.push("A31: dvlCloseDrawToolsMenu not yet reachable (may load later)");\n'
    '// A32. Settings still NOT integrated\n'
    'if(document.getElementById("dvl1b_settingsMenu")) blockers.push("A32: dvl1b_settingsMenu was added (out of Phase 2C scope — Settings not yet integrated)");\n'
    '// A33. Cache-Control meta present\n'
    '(function(){ var metas=document.querySelectorAll("meta[http-equiv]"); var found=false; metas.forEach(function(m){ if((m.getAttribute("http-equiv")||"").toLowerCase().indexOf("cache-control")!==-1) found=true; }); if(!found) warnings.push("A33: Cache-Control meta not found"); })();\n\n'
    'var N=33, name="DVL_UI_OVERLAY_PHASE_2C_AUDIT_MODULE_0711";',
    "audit_n")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.711 OK")
