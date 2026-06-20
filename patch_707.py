#!/usr/bin/env python3
"""patch_707.py — Beta 0.707: Phase 1C visual refinement (header/hotbar only)

Visual-only polish of the inline #DVL_UI_OVERLAY_PHASE_1B header/hotbar.
NO new functional bridges. Chart untouched. Fail-safe + namespacing preserved.

Refinements:
  1. Header — lighter/compact "Salvar" button (responsive label), tighter
     alignment, premium compact feel (inset highlight, tighter gaps).
  2. BTC/USDT — premium asset block (gradient, refined border, no text clip).
  3. Hotbar — uniform spacing, softer dividers, less cramped, one clean line.
  4. Chart — not touched.
  5. Security — fail-safe, namespaced ids, no iframe, no second file.
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
# PART 1 — Version bump 0.706 -> 0.707
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html, '<title>DVL Binance Live — Beta 0.706</title>',
                 '<title>DVL Binance Live — Beta 0.707</title>', "title")
html = rep(html, '>BETA 0.706</div>', '>BETA 0.707</div>', "host_badge")
html = rep(html, '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.706</span>',
                 '<span class="dvl1b-badge" id="dvl1b_versionBadge">BETA 0.707</span>', "new_badge")
html = rep(html, 'const DVL_APP_VERSION = "Beta 0.706";',
                 'const DVL_APP_VERSION = "Beta 0.707";', "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.706 — Phase 1B inline UI:',
    '  { version: DVL_APP_VERSION, note: "Beta 0.707 — Phase 1C visual refinement: lighter compact Salvar button (responsive label), premium BTC/USDT asset block, tighter header alignment, softer hotbar dividers and more uniform spacing. Visual-only — no new functional bridges, chart untouched." },\n'
    '  { version: "Beta 0.706", note: "Beta 0.706 — Phase 1B inline UI:',
    "changelog_0707")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — CSS refinements
# ═══════════════════════════════════════════════════════════════════════════════

# 2a. Card: tighter padding/gap + premium inset highlight
html = rep(html,
    '  padding:calc(12 * var(--px)) calc(18 * var(--px)); display:flex; flex-direction:column;\n  gap:calc(10 * var(--px)); box-shadow:0 calc(14 * var(--px)) calc(40 * var(--px)) rgba(0,0,0,.4);',
    '  padding:calc(10 * var(--px)) calc(16 * var(--px)); display:flex; flex-direction:column;\n  gap:calc(9 * var(--px)); box-shadow:0 calc(14 * var(--px)) calc(40 * var(--px)) rgba(0,0,0,.45), inset 0 calc(1 * var(--px)) 0 rgba(255,255,255,.04);',
    "css_card")

# 2b. Row1: tighter, uniform gap
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-row1{ display:flex; align-items:center; gap:calc(14 * var(--px)); }',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-row1{ display:flex; align-items:center; gap:calc(12 * var(--px)); }',
    "css_row1")

# 2c. Row2: uniform spacing
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-row2{ display:flex; align-items:center; gap:calc(10 * var(--px)); overflow-x:auto; scrollbar-width:none; }',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-row2{ display:flex; align-items:center; gap:calc(12 * var(--px)); justify-content:flex-start; overflow-x:auto; scrollbar-width:none; }',
    "css_row2")

# 2d. Symbol block: premium look, no text clip
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-symbol{ flex:1 1 auto; min-width:0; height:calc(62 * var(--px)); gap:calc(12 * var(--px)); padding:0 calc(15 * var(--px)); justify-content:flex-start; }',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-symbol{ flex:1 1 auto; min-width:calc(150 * var(--px)); height:calc(60 * var(--px)); gap:calc(12 * var(--px)); padding:0 calc(16 * var(--px)); justify-content:flex-start; background:linear-gradient(180deg,rgba(9,22,18,.78),rgba(5,14,12,.62)); border-color:rgba(150,180,165,.22); border-radius:calc(13 * var(--px)); box-shadow:inset 0 calc(1 * var(--px)) 0 rgba(255,255,255,.05); }',
    "css_symbol")

# 2e. Save button: reduce visual weight (lighter/quieter/compact)
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save{ flex:0 0 auto; height:calc(62 * var(--px)); padding:0 calc(16 * var(--px)); font-size:calc(22 * var(--px)); font-weight:500; color:#f1f1ee; white-space:nowrap; }',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save{ flex:0 0 auto; height:calc(60 * var(--px)); padding:0 calc(13 * var(--px)); font-size:calc(18 * var(--px)); font-weight:450; color:#aeb8b4; white-space:nowrap; background:rgba(5,14,12,.42); border-color:rgba(170,190,180,.12); }\n'
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-short{ display:none; }\n'
    '@media (max-width:560px){\n'
    '  #DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-full{ display:none; }\n'
    '  #DVL_UI_OVERLAY_PHASE_1B .dvl1b-save-short{ display:inline; }\n'
    '}',
    "css_save")

# 2f. Separators: softer + shorter
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-sep{ width:calc(1 * var(--px)); height:calc(36 * var(--px)); background:rgba(180,198,190,.16); flex:0 0 auto; }',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-sep{ width:calc(1 * var(--px)); height:calc(24 * var(--px)); background:rgba(180,198,190,.09); flex:0 0 auto; }',
    "css_sep")

# 2g. Action buttons: more breathing room, less cramped
html = rep(html,
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act{ display:flex; align-items:center; gap:calc(9 * var(--px)); height:calc(50 * var(--px)); padding:0 calc(9 * var(--px)); border-radius:calc(9 * var(--px)); font-size:calc(21 * var(--px)); font-weight:450; color:#eef2f0; white-space:nowrap; flex:0 0 auto; }',
    '#DVL_UI_OVERLAY_PHASE_1B .dvl1b-act{ display:flex; align-items:center; gap:calc(10 * var(--px)); height:calc(48 * var(--px)); padding:0 calc(12 * var(--px)); border-radius:calc(9 * var(--px)); font-size:calc(20 * var(--px)); font-weight:450; letter-spacing:.005em; color:#eef2f0; white-space:nowrap; flex:0 0 auto; }',
    "css_act")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — Markup: responsive save label
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<button class="dvl1b-btn dvl1b-save" id="dvl1b_saveBtn" type="button">Salvar perfil</button>',
    '<button class="dvl1b-btn dvl1b-save" id="dvl1b_saveBtn" type="button" aria-label="Salvar perfil"><span class="dvl1b-save-full">Salvar perfil</span><span class="dvl1b-save-short">Salvar</span></button>',
    "markup_save")

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — Audit: bump to 0.707, add compact-save check
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_1B_AUDIT_MODULE_0706">',
    '<script id="DVL_UI_OVERLAY_PHASE_1C_AUDIT_MODULE_0707">',
    "audit_id")
html = rep(html,
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.706"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.706\' (got: "+window.DVL_APP_VERSION+")");',
    'if(!(typeof window.DVL_APP_VERSION!=="undefined" && window.DVL_APP_VERSION==="Beta 0.707"))\n  blockers.push("A1: DVL_APP_VERSION !== \'Beta 0.707\' (got: "+window.DVL_APP_VERSION+")");',
    "audit_a1")
html = rep(html,
    'if(!_t || (_t.textContent||"").indexOf("0.706")===-1) blockers.push("A2: title missing 0.706");',
    'if(!_t || (_t.textContent||"").indexOf("0.707")===-1) blockers.push("A2: title missing 0.707");',
    "audit_a2")
html = rep(html,
    'var N=16, name="DVL_UI_OVERLAY_PHASE_1B_AUDIT_MODULE_0706";',
    '// A17. Compact (responsive) save label present (Phase 1C)\n'
    'if(!document.querySelector("#dvl1b_saveBtn .dvl1b-save-short")) warnings.push("A17: compact save label missing");\n\n'
    'var N=17, name="DVL_UI_OVERLAY_PHASE_1C_AUDIT_MODULE_0707";',
    "audit_n")

# ── Write ─────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Written index.html: {len(html)} chars, {html.count(chr(10))+1} lines — Beta 0.707 OK")
