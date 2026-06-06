#!/usr/bin/env python3
"""patch_180.py — Beta 0.180: Mobile UI — header compacto, TradingView-like

Melhorias mobile:
1. Watermark canvas: 12.4% → 4%
2. Header compacto no mobile: 44px, sem logo central, sem badge Beta
3. 24H High/Low colapso automático no mobile + toggle botão "24H"
4. Undo/Redo/Save ocultos no mobile (só fx Indicators visível)
5. #ppQuickBtns (Buy/Sell) reposicionados para dentro do gráfico
6. Refresh button: mais para esquerda (longe da escala de preço)
7. TB-tf-bar compacto no mobile
8. CSS geral: melhor espaçamento, alinhamento e legibilidade mobile
"""
import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.179') >= 10, f'count={html.count("Beta 0.179")}'
html = html.replace('Beta 0.179', 'Beta 0.180')

# ── 1. Watermark opacity 12.4% → 4% ──────────────────────────────────────────
OLD_WM = 'ctx.save();ctx.globalAlpha=0.124;ctx.drawImage(_wmImg,wx,wy,ww,wh);ctx.restore();'
assert OLD_WM in html, 'watermark opacity anchor not found'
html = html.replace(OLD_WM,
    'ctx.save();ctx.globalAlpha=0.04;ctx.drawImage(_wmImg,wx,wy,ww,wh);ctx.restore();', 1)

# ── 2. Adiciona botão toggle 24H antes de .tb-price-stats ────────────────────
OLD_STATS = '  <div class="tb-price-stats">'
assert OLD_STATS in html, 'tb-price-stats anchor not found'
html = html.replace(OLD_STATS,
    '  <button id="tb24Toggle" class="tb-24-toggle" onclick="(function(){var s=document.querySelector(\'.tb-price-stats\');if(!s)return;var h=s.classList.toggle(\'tb-stats-collapsed\');localStorage.setItem(\'dvl24hCollapsed\',h?\'1\':\'0\');var btn=document.getElementById(\'tb24Toggle\');if(btn)btn.setAttribute(\'data-open\',h?\'0\':\'1\');})()" title="24H stats">'
    '<span>24H</span>'
    '<svg id="tb24Chevron" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
    '</button>\n  <div class="tb-price-stats">',
    1
)

# ── 3. Injeta bloco de CSS mobile antes do </style> que fecha o bloco geral ──
# Procura o bloco de media queries existentes e injeta logo depois
INJECT_ANCHOR = '@media(max-width:480px){\n  .tb-price-stats .tb-stat-col:last-child{display:none!important;}\n  .tb-action-btn span:not(.tb-action-fx){display:none!important;}\n}'
assert INJECT_ANCHOR in html, 'mobile media anchor not found'

MOBILE_CSS = """
/* ═══════════════════════════════════════════
   DVL Beta 0.180 — Mobile UI Improvements
   ═══════════════════════════════════════════ */

/* ── 24H toggle button ── */
.tb-24-toggle{
  display:none;
  align-items:center;gap:3px;
  background:none;border:none;
  color:#4a6580;cursor:pointer;
  font-family:monospace;font-size:8.5px;font-weight:700;
  letter-spacing:.06em;padding:2px 5px 2px 2px;
  border-radius:3px;
  transition:color .15s;
  flex-shrink:0;
}
.tb-24-toggle:hover{color:#c8d8f0;}
.tb-24-toggle svg{transition:transform .2s;}
.tb-24-toggle[data-open="0"] svg{transform:rotate(-90deg);}
.tb-price-stats.tb-stats-collapsed{display:none!important;}

@media(max-width:760px){
  /* ── Compact header ── */
  .tb-header{height:44px!important;min-height:44px!important;padding:0 8px 0 10px!important;}

  /* ── Hide clutter ── */
  #dvlVersionBadge{display:none!important;}
  .tb-logo-center{display:none!important;}
  .dvl-version-badge{display:none!important;}

  /* ── Price strip: tighter ── */
  .tb-price-strip{min-height:38px!important;padding:3px 10px 3px 10px!important;}
  #pNow{font-size:16px!important;font-weight:700!important;}
  #p24Change,#pCh{font-size:10px!important;}

  /* ── Show 24H toggle on mobile ── */
  .tb-24-toggle{display:flex!important;}

  /* ── 24H stats: collapsed by default on mobile (JS restores from localStorage) ── */
  .tb-price-stats:not(.tb-stats-force-open){display:none;}

  /* ── TF bar: tighter ── */
  .tb-tf-bar{height:34px!important;min-height:34px!important;}
  .tb-tf-pill{font-size:10.5px!important;padding:3px 8px!important;}

  /* ── Indicators bar: hide undo/redo/save on mobile ── */
  .tb-history-btn{display:none!important;}

  /* ── fx Indicators: text oculto, apenas fx visível ── */
  .tb-action-btn span:not(.tb-action-fx){display:none!important;}

  /* ── Quick Buy/Sell buttons: position inside chart ── */
  #ppQuickBtns{top:120px!important;left:4px!important;}

  /* ── Refresh button: afastar da escala de preço ── */
  #dvlMiniRefresh{right:84px!important;bottom:22px!important;}

  /* ── Icon buttons: compact ── */
  .tb-icon-btn{width:32px!important;height:32px!important;}

  /* ── Price scale right: not invaded by zones labels ── */
  /* (handled by RP() already, but ensure min) */
}

@media(max-width:480px){
  .tb-header{height:42px!important;padding:0 6px 0 8px!important;}
  .tb-price-strip{min-height:34px!important;padding:2px 8px!important;}
  .tb-tf-bar{height:32px!important;}
  .tb-tf-pill{font-size:10px!important;padding:2px 7px!important;}
  #pNow{font-size:15px!important;}
  #ppQuickBtns{top:114px!important;}
  .tb-icon-btn{width:30px!important;height:30px!important;}
  .pp-qbtn{font-size:9.5px!important;padding:4px 8px!important;}
}"""

html = html.replace(INJECT_ANCHOR, INJECT_ANCHOR + '\n' + MOBILE_CSS, 1)

# ── 4. Init script: restaurar estado 24H do localStorage ─────────────────────
# Injeta um script inline logo antes de </body>
OLD_BODY_END = '\n</body>\n</html>'
assert OLD_BODY_END in html, '</body> anchor not found'

INIT_24H = """
<script>
/* DVL 0.180 — Restore 24H stats collapsed state on mobile */
(function(){
  if(window.innerWidth>760)return;
  var collapsed=localStorage.getItem('dvl24hCollapsed');
  /* Default collapsed on first mobile visit */
  if(collapsed===null)collapsed='1';
  var stats=document.querySelector('.tb-price-stats');
  var btn=document.getElementById('tb24Toggle');
  if(stats&&collapsed==='1'){
    stats.classList.add('tb-stats-collapsed');
    if(btn)btn.setAttribute('data-open','0');
  } else if(stats) {
    stats.classList.remove('tb-stats-collapsed');
    if(btn)btn.setAttribute('data-open','1');
  }
})();
</script>"""

html = html.replace(OLD_BODY_END, INIT_24H + OLD_BODY_END, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_180.py applied — Beta 0.180')
print('  Watermark: 12.4% -> 4%')
print('  Header mobile: 44px, sem logo central, sem badge Beta')
print('  24H stats: colapsado por default no mobile, toggle botao "24H"')
print('  Undo/Redo/Save: ocultos no mobile')
print('  fx Indicators: so "fx" visivel no mobile')
print('  #ppQuickBtns: top:120px no mobile')
print('  Refresh button: right:84px (longe da escala)')
