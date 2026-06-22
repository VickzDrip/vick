#!/usr/bin/env python3
"""patch_761.py — Beta 0.761: live PnL no painel Positions via refresh no final de render()."""
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

print("=== patch_761.py — Beta 0.761 ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.760</title>',
    '<title>DVL Binance Live — Beta 0.761</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.760";',
    'const DVL_APP_VERSION = "Beta 0.761";', "version const")

html = rep(html,
    '>BETA 0.760</span>',
    '>BETA 0.761</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.760 — Fix positions panel: revert adapter changes from 0.759 que quebraram o painel; store continua ativo via addTradeToHistory + eventos." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.761 — Live PnL no painel Positions: DVL_POSITIONS_REFRESH() no final de render() para atualizar preço atual e PnL a cada ciclo do chart." },\n  { version: "Beta 0.760", note: "Beta 0.760 — Fix positions panel: revert adapter changes from 0.759 que quebraram o painel; store continua ativo via addTradeToHistory + eventos." },',
    "changelog")

# ── 2. Audit bump 0760 → 0761 ─────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0760_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0761_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.760"',
    'window.DVL_APP_VERSION==="Beta 0.761"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.760' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.761' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.760")===-1) blockers.push("A2: title missing 0.760")',
    'indexOf("0.761")===-1) blockers.push("A2: title missing 0.761")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0760_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0761_AUDIT_MODULE";',
    "audit name bump")

# ── 3. render(): chamar DVL_POSITIONS_REFRESH no final ───────────────────────
# render() já é chamado a cada ~900ms pelo startPnlRefresh e a cada 1200ms
# pelo setInterval(render,1200). Adicionando DVL_POSITIONS_REFRESH() no final,
# o painel Positions atualiza Preço atual e PnL ao vivo sem novo setInterval.
# O guard if(state.panelOpen) dentro de refresh() garante que o DOM só é
# modificado quando o painel estiver aberto.
html = rep(html,
    'state.orders.forEach(function(o){renderOrder(layer,o);});}',
    'state.orders.forEach(function(o){renderOrder(layer,o);}); try{if(typeof window.DVL_POSITIONS_REFRESH===\'function\')window.DVL_POSITIONS_REFRESH();}catch(_){};}',
    "render(): DVL_POSITIONS_REFRESH no final")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
