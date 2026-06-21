#!/usr/bin/env python3
"""patch_732.py — Beta 0.732: dvl:position-detail-open event; Funding removed; Gestão rápida moved above grid (open only)."""
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

print("=== patch_732.py — Beta 0.732 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.731</title>',
    '<title>DVL Binance Live — Beta 0.732</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.731";',
    'const DVL_APP_VERSION = "Beta 0.732";', "version const")

html = rep(html,
    '>BETA 0.731</span>',
    '>BETA 0.732</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.731 — fixed Positions click-outside using composedPath so tab/list clicks inside the panel never trigger close." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.732 — dvl:position-detail-open event; Funding field removed; Gestão rápida moved above grid, open trades only." },\n  { version: "Beta 0.731", note: "Beta 0.731 — fixed Positions click-outside using composedPath so tab/list clicks inside the panel never trigger close." },',
    "changelog")

# ── 2. Audit bump 0731 → 0732 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0731_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0732_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.731"',
    'window.DVL_APP_VERSION==="Beta 0.732"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.731' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.732' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.731")===-1) blockers.push("A2: title missing 0.731")',
    'indexOf("0.732")===-1) blockers.push("A2: title missing 0.732")', "audit A2")

html = rep(html,
    'var N=101, name="DVL_UI_OVERLAY_PHASE_0731_AUDIT_MODULE";',
    '// A102. Position details dispatches dvl:position-detail-open\n'
    '(function(){ var s=document.getElementById("DVL_POSITION_DETAILS_PANEL_MODULE_0724"); var t=s?(s.textContent||""):""; if(t.indexOf("dvl:position-detail-open")===-1) blockers.push("A102: position details not dispatching dvl:position-detail-open"); })();\n'
    '\n'
    'var N=102, name="DVL_UI_OVERLAY_PHASE_0732_AUDIT_MODULE";',
    "audit A102 + N bump")

# ── 3. renderList(): add data-dvl-status attribute to card ───────────────────────
html = rep(html,
    '\'<article class="dvlPosV2Card" data-dvl-symbol="\' + row.symbol + \'">\' +',
    '\'<article class="dvlPosV2Card" data-dvl-symbol="\' + row.symbol + \'" data-dvl-status="\' + state.activeTab + \'">\' +',
    "renderList: add data-dvl-status to card")

# ── 4. Click handler: pass status to renderDetails ───────────────────────────────
html = rep(html,
    '    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;\n'
    '    if(card){ renderDetails(card.getAttribute("data-dvl-symbol") || "BTC/USDT", card); return; }',
    '    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;\n'
    '    if(card){ renderDetails(card.getAttribute("data-dvl-symbol") || "BTC/USDT", card, card.getAttribute("data-dvl-status") || "open"); return; }',
    "click handler: pass status to renderDetails")

# ── 5. renderDetails: add status param + default ─────────────────────────────────
html = rep(html,
    '  function renderDetails(symbol, sourceCard){',
    '  function renderDetails(symbol, sourceCard, status){\n'
    '    status = status || "open";',
    "renderDetails: add status param")

# ── 6. Replace innerHTML block: remove Funding, move Gestão rápida, dispatch event ─
html = rep(html,
    '    panel.innerHTML =\n'
    '      \'<header class="dvlDetailV2Head">\' +\n'
    '        \'<div class="dvlDetailV2TitleLine">\' +\n'
    '          \'<div class="dvlDetailV2Coin \' + row.coin + \'">\' + coinGlyph(row.coin) + \'</div>\' +\n'
    '          \'<div class="dvlDetailV2TitleText">\' +\n'
    '            \'<strong>\' + row.symbol + \'</strong>\' +\n'
    '            \'<div class="dvlDetailV2Sub">\' +\n'
    '              \'<span class="dvlDetailV2Badge \' + sideClass + \'">\' + row.side + \'</span>\' +\n'
    '              \'<span class="dvlDetailV2Badge lev">\' + row.leverage + \'</span>\' +\n'
    '              \'<span>\' + row.mode + \'</span>\' +\n'
    '            \'</div>\' +\n'
    '          \'</div>\' +\n'
    '        \'</div>\' +\n'
    '        \'<button class="dvlDetailV2Close" type="button" data-dvl-detail-close="true">×</button>\' +\n'
    '      \'</header>\' +\n'
    '      \'<div class="dvlDetailV2Body">\' +\n'
    '        \'<div class="dvlDetailV2PnlHero">\' +\n'
    '          \'<div><span>Resultado líquido</span><strong class="\' + pnlClass + \'">\' + row.net + \'</strong></div>\' +\n'
    '          \'<small>\' + row.pnl + \'<br>\' + row.pct + \'</small>\' +\n'
    '        \'</div>\' +\n'
    '        \'<div class="dvlDetailV2Grid">\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Tamanho</span><b>\' + row.size + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Margem usada</span><b>\' + row.margin + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Entrada</span><b>\' + row.entry + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Preço atual</span><b>\' + row.current + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Preço médio</span><b>\' + row.average + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell red"><span>Liquidação</span><b>\' + row.liquidation + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell green"><span>Take Profit</span><b>\' + row.tp + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell red"><span>Stop Loss</span><b>\' + row.sl + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Fees</span><b>\' + row.fees + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Funding</span><b>\' + row.funding + \'</b></div>\' +\n'
    '        \'</div>\' +\n'
    '        \'<div class="dvlDetailV2SectionTitle">Gestão rápida</div>\' +\n'
    '        \'<div class="dvlDetailV2Actions">\' +\n'
    '          \'<button class="dvlDetailV2Action primary" type="button">Ver no gráfico</button>\' +\n'
    '          \'<button class="dvlDetailV2Action primary" type="button">Mover TP/SL</button>\' +\n'
    '          \'<button class="dvlDetailV2Action" type="button">Fechar parcial</button>\' +\n'
    '          \'<button class="dvlDetailV2Action danger" type="button">Fechar posição</button>\' +\n'
    '        \'</div>\' +\n'
    '        \'<div class="dvlDetailV2SectionTitle">Timeline</div>\' +\n'
    '        \'<div class="dvlDetailV2Timeline">\' + tl + \'</div>\' +\n'
    '      \'</div>\';\n'
    '\n'
    '    panel.classList.add("is-open");\n'
    '  }',

    '    var gestaoHtml = status === "open" ?\n'
    '      \'<div class="dvlDetailV2SectionTitle">Gestão rápida</div>\' +\n'
    '      \'<div class="dvlDetailV2Actions">\' +\n'
    '        \'<button class="dvlDetailV2Action primary" type="button">Ver no gráfico</button>\' +\n'
    '        \'<button class="dvlDetailV2Action primary" type="button">Mover TP/SL</button>\' +\n'
    '        \'<button class="dvlDetailV2Action" type="button">Fechar parcial</button>\' +\n'
    '        \'<button class="dvlDetailV2Action danger" type="button">Fechar posição</button>\' +\n'
    '      \'</div>\' : "";\n'
    '\n'
    '    panel.innerHTML =\n'
    '      \'<header class="dvlDetailV2Head">\' +\n'
    '        \'<div class="dvlDetailV2TitleLine">\' +\n'
    '          \'<div class="dvlDetailV2Coin \' + row.coin + \'">\' + coinGlyph(row.coin) + \'</div>\' +\n'
    '          \'<div class="dvlDetailV2TitleText">\' +\n'
    '            \'<strong>\' + row.symbol + \'</strong>\' +\n'
    '            \'<div class="dvlDetailV2Sub">\' +\n'
    '              \'<span class="dvlDetailV2Badge \' + sideClass + \'">\' + row.side + \'</span>\' +\n'
    '              \'<span class="dvlDetailV2Badge lev">\' + row.leverage + \'</span>\' +\n'
    '              \'<span>\' + row.mode + \'</span>\' +\n'
    '            \'</div>\' +\n'
    '          \'</div>\' +\n'
    '        \'</div>\' +\n'
    '        \'<button class="dvlDetailV2Close" type="button" data-dvl-detail-close="true">×</button>\' +\n'
    '      \'</header>\' +\n'
    '      \'<div class="dvlDetailV2Body">\' +\n'
    '        \'<div class="dvlDetailV2PnlHero">\' +\n'
    '          \'<div><span>Resultado líquido</span><strong class="\' + pnlClass + \'">\' + row.net + \'</strong></div>\' +\n'
    '          \'<small>\' + row.pnl + \'<br>\' + row.pct + \'</small>\' +\n'
    '        \'</div>\' +\n'
    '        gestaoHtml +\n'
    '        \'<div class="dvlDetailV2Grid">\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Tamanho</span><b>\' + row.size + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Margem usada</span><b>\' + row.margin + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Entrada</span><b>\' + row.entry + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Preço atual</span><b>\' + row.current + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Preço médio</span><b>\' + row.average + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell red"><span>Liquidação</span><b>\' + row.liquidation + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell green"><span>Take Profit</span><b>\' + row.tp + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell red"><span>Stop Loss</span><b>\' + row.sl + \'</b></div>\' +\n'
    '          \'<div class="dvlDetailV2Cell"><span>Fees</span><b>\' + row.fees + \'</b></div>\' +\n'
    '        \'</div>\' +\n'
    '        \'<div class="dvlDetailV2SectionTitle">Timeline</div>\' +\n'
    '        \'<div class="dvlDetailV2Timeline">\' + tl + \'</div>\' +\n'
    '      \'</div>\';\n'
    '\n'
    '    panel.classList.add("is-open");\n'
    '    try{ document.dispatchEvent(new CustomEvent("dvl:position-detail-open", {bubbles:true, detail:{symbol:symbol, status:status, row:row}})); }catch(_){}\n'
    '  }',

    "renderDetails: Funding removed, Gestão rápida → above grid (open only), dispatch event")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
