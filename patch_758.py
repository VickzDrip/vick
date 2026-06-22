#!/usr/bin/env python3
"""patch_758.py — Beta 0.758: getAllOrders() scan direto localStorage — garante todos os ativos sem registry."""
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

print("=== patch_758.py — Beta 0.758 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.757</title>',
    '<title>DVL Binance Live — Beta 0.758</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.757";',
    'const DVL_APP_VERSION = "Beta 0.758";', "version const")

html = rep(html,
    '>BETA 0.757</span>',
    '>BETA 0.758</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.757 — Multi-symbol positions: show all assets\' trades in Positions panel; fix history lost on symbol switch; baseOrder uses rawSym()." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.758 — getAllOrders() scan direto de localStorage: garante todos os ativos sem depender de registry." },\n  { version: "Beta 0.757", note: "Beta 0.757 — Multi-symbol positions: show all assets\' trades in Positions panel; fix history lost on symbol switch; baseOrder uses rawSym()." },',
    "changelog")

# ── 2. Audit bump 0757 → 0758 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0757_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0758_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.757"',
    'window.DVL_APP_VERSION==="Beta 0.758"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.757' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.758' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.757")===-1) blockers.push("A2: title missing 0.757")',
    'indexOf("0.758")===-1) blockers.push("A2: title missing 0.758")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0757_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0758_AUDIT_MODULE";',
    "audit name bump")

# ── 3. getAllOrders(): scan direto de localStorage pelo prefixo ───────────────────
# PROBLEMA da 0.757: usava registry (dvl_paper_v2_pro_0695_symbols) que só é
# populado ao salvar ou trocar de ativo. Se o usuário tinha trades ANTES de 0.757,
# o registry estava vazio → getAllOrders() não encontrava os trades antigos.
#
# FIX: itera diretamente sobre localStorage.keys() buscando qualquer chave com
# o prefixo 'dvl_paper_v2_pro_0695_'. Assim encontra TODOS os ativos, mesmo
# os que existiam antes de qualquer registry ser criado.
# A chave de registry ('dvl_paper_v2_pro_0695_symbols') é excluída do scan.
html = rep(html,
    "  function getAllOrders(){var _all=state.orders.filter(function(o){return o&&o.id&&o.status!=='draft';}); var _cur=rawSym(); try{var _syms=JSON.parse(localStorage.getItem('dvl_paper_v2_pro_0695_symbols')||'[]'); _syms.forEach(function(_s){if(_s===_cur)return; try{var _a=JSON.parse(localStorage.getItem('dvl_paper_v2_pro_0695_'+_s)||'[]'); if(Array.isArray(_a))_all=_all.concat(_a.filter(function(o){return o&&o.id&&o.status!=='draft';}));}catch(_){}});}catch(_){} return _all;}",
    "  function getAllOrders(){var _all=state.orders.filter(function(o){return o&&o.id&&o.status!=='draft';}); var _cur=rawSym(); var _pfx='dvl_paper_v2_pro_0695_'; var _rk=_pfx+'symbols'; try{for(var _k=0;_k<localStorage.length;_k++){var _lkey=localStorage.key(_k); if(!_lkey||_lkey.indexOf(_pfx)!==0||_lkey===_rk)continue; var _ls=_lkey.slice(_pfx.length); if(_ls===_cur)continue; try{var _la=JSON.parse(localStorage.getItem(_lkey)||'[]'); if(Array.isArray(_la))_all=_all.concat(_la.filter(function(o){return o&&o.id&&o.status!=='draft';}));}catch(_){}}}catch(_){} return _all;}",
    "getAllOrders(): scan localStorage direto")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
