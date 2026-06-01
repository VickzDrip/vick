#!/usr/bin/env python3
"""Beta 0.064 — Ferramentas panel refactor patch."""

import re, sys

SRC = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
DST = SRC

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

OLD_VER = 'Beta 0.063'
NEW_VER = 'Beta 0.064'

# ─────────────────────────────────────────────────────────────────────
# 1. NEW HTML (right panel)
# ─────────────────────────────────────────────────────────────────────
OLD_HTML_START = '<div class="rp-scrim" id="rpScrim"></div>'
OLD_HTML_END   = '<!-- ── End Right Tools Panel ─────────────────────────────────────────── -->'

NEW_HTML = r'''<div class="rp-scrim" id="rpScrim"></div>
<div class="right-panel" id="rightPanel" aria-hidden="true">

  <div class="rp-hdr">
    <span class="rp-hdr-title">FERRAMENTAS</span>
    <button class="rp-hdr-x" id="rpClose" aria-label="Fechar">×</button>
  </div>

  <div class="rp-tabs-bar">
    <button class="rp-tab active" data-rpsec="rpSecTrading">Trading</button>
    <button class="rp-tab" data-rpsec="rpSecDrawing">Drawing</button>
    <button class="rp-tab" data-rpsec="rpSecUtility">Utility</button>
    <button class="rp-tab" data-rpsec="rpSecTheme">Theme</button>
  </div>

  <div class="rp-body" id="rpBody">

    <!-- QUICK ACTIONS -->
    <div class="rp-sec rp-sec-qa" id="rpSecQA">
      <div class="rp-qa-hdr">
        <span class="rp-sl rp-sl-qa">&#9889; QUICK ACTIONS</span>
        <span class="rp-qa-hint">favoritos</span>
      </div>
      <div class="rp-grid rp-qa-grid" id="rpQAGrid"></div>
      <div class="rp-qa-empty" id="rpQAEmpty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span>Toque em &#9733; num item para adicionar aqui</span>
      </div>
    </div>

    <div class="rp-div"></div>

    <!-- TRADING -->
    <div class="rp-sec" id="rpSecTrading">
      <div class="rp-sl">TRADING</div>
      <div class="rp-grid">

        <div class="rp-item">
          <button class="rp-btn rp-long-btn" id="rpBtnLong">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M5 19L19 5"/><polyline points="12 5 19 5 19 12"/></svg>
            <span>Long</span>
          </button>
          <button class="rp-star" data-rpkey="long" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn rp-short-btn" id="rpBtnShort">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M5 5L19 19"/><polyline points="12 19 19 19 19 12"/></svg>
            <span>Short</span>
          </button>
          <button class="rp-star" data-rpkey="short" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn" id="rpRuler">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="2" y="7" width="20" height="10" rx="1"/><line x1="6" y1="7" x2="6" y2="11"/><line x1="10" y1="7" x2="10" y2="13"/><line x1="14" y1="7" x2="14" y2="11"/><line x1="18" y1="7" x2="18" y2="13"/></svg>
            <span>R&#233;gua</span>
          </button>
          <button class="rp-star" data-rpkey="ruler" aria-label="Favoritar">&#9733;</button>
        </div>

      </div>
    </div>

    <div class="rp-div"></div>

    <!-- DRAWING -->
    <div class="rp-sec" id="rpSecDrawing">
      <div class="rp-sl">DRAWING</div>
      <div class="rp-grid">

        <div class="rp-item">
          <button class="rp-btn" id="rpDrawLine" title="Trend Line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><line x1="4" y1="20" x2="20" y2="4"/></svg>
            <span>Linha</span>
          </button>
          <button class="rp-star" data-rpkey="drawLine" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn" id="rpDrawRect" title="Rectangle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>
            <span>Ret&#226;ngulo</span>
          </button>
          <button class="rp-star" data-rpkey="drawRect" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn" id="rpDrawText" title="Text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M4 6h16M12 6v12M9 18h6"/></svg>
            <span>Texto</span>
          </button>
          <button class="rp-star" data-rpkey="drawText" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn" id="rpDrawArrow" title="Arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg>
            <span>Seta</span>
          </button>
          <button class="rp-star" data-rpkey="drawArrow" aria-label="Favoritar">&#9733;</button>
        </div>

      </div>
    </div>

    <div class="rp-div"></div>

    <!-- ANALYSIS -->
    <div class="rp-sec" id="rpSecAnalysis">
      <div class="rp-sl">ANALYSIS</div>
      <div class="rp-grid">

        <div class="rp-item">
          <button class="rp-btn" id="rpFvg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="3" y="8" width="18" height="8" rx="1"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"/></svg>
            <span>FVG</span>
          </button>
          <button class="rp-star" data-rpkey="fvg" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn" id="rpOb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="3" y="6" width="18" height="12" rx="1"/><line x1="8" y1="6" x2="8" y2="18"/></svg>
            <span>Orderblock</span>
          </button>
          <button class="rp-star" data-rpkey="ob" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn" id="rpVolProfile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><line x1="5" y1="20" x2="5" y2="4"/><rect x="5" y="4" width="9" height="2" rx=".5"/><rect x="5" y="8" width="14" height="2" rx=".5"/><rect x="5" y="12" width="7" height="2" rx=".5"/><rect x="5" y="16" width="11" height="2" rx=".5"/></svg>
            <span>Vol. Profile</span>
          </button>
          <button class="rp-star" data-rpkey="volProfile" aria-label="Favoritar">&#9733;</button>
        </div>

      </div>
    </div>

    <div class="rp-div"></div>

    <!-- UTILITY -->
    <div class="rp-sec" id="rpSecUtility">
      <div class="rp-sl">UTILITIES</div>
      <div class="rp-grid">

        <div class="rp-item">
          <button class="rp-btn" id="rpReplay" title="Replay Mode">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>
            <span>Replay</span>
          </button>
          <button class="rp-star" data-rpkey="replay" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn" id="rpSnapshot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>Snapshot</span>
          </button>
          <button class="rp-star" data-rpkey="snapshot" aria-label="Favoritar">&#9733;</button>
        </div>

        <div class="rp-item">
          <button class="rp-btn rp-dis" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span>Alertas</span>
          </button>
        </div>

        <div class="rp-item">
          <button class="rp-btn rp-dis" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Sess&#245;es</span>
          </button>
        </div>

      </div>
    </div>

    <div class="rp-div"></div>

    <!-- THEME -->
    <div class="rp-sec" id="rpSecTheme">
      <div class="rp-sl">THEME</div>
      <div class="rp-grid">
        <button class="rp-btn active" id="rpThemeDark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span>Escuro</span>
        </button>
        <button class="rp-btn" id="rpThemeLight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <span>Claro</span>
        </button>
      </div>
    </div>

    <div class="rp-div"></div>

    <!-- SAIR -->
    <div class="rp-sec">
      <button class="rp-btn rp-exit-btn" id="rpSair" onclick="if(confirm('Sair?'))location.href='about:blank'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Sair</span>
      </button>
    </div>

    <!-- BOTTOM BAR -->
    <div class="rp-bottom-bar">
      <div class="rp-tip-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Toque em &#9733; num item para adicion&#225;-lo ao Quick Actions</span>
      </div>
      <div class="rp-bottom-actions">
        <button class="rp-bottom-act-btn" id="rpManageFavs">Gerenciar favoritos</button>
        <button class="rp-bottom-act-btn rp-bottom-act-reset" id="rpResetLayout">Redefinir</button>
      </div>
    </div>

  </div><!-- end rp-body -->

</div>
<!-- ── End Right Tools Panel ─────────────────────────────────────────── -->'''

# ─────────────────────────────────────────────────────────────────────
# 2. NEW CSS
# ─────────────────────────────────────────────────────────────────────
OLD_CSS_START = '/* ── Right Panel Scrim ── */'
OLD_CSS_END   = '/* ── DVL Smart Indicators Panel (Beta 0.062) ─────────────────────────── */'

NEW_CSS = r'''/* ── Right Panel Scrim ── */
.rp-scrim{
  position:fixed;inset:0;
  background:rgba(0,0,0,.55);
  z-index:99;
  opacity:0;pointer-events:none;
  transition:opacity .25s ease;
}
.rp-scrim.open{opacity:1;pointer-events:auto;}

/* ── Right Panel container ── */
.right-panel{
  position:fixed;
  top:0;right:0;bottom:0;
  width:min(calc(50vw - 4px),340px);
  background:rgba(5,11,20,.97)!important;
  border-left:1px solid rgba(125,180,255,.1)!important;
  backdrop-filter:blur(20px)!important;
  -webkit-backdrop-filter:blur(20px)!important;
  z-index:100;
  display:flex;flex-direction:column;
  transform:translateX(100%);
  transition:transform .26s cubic-bezier(.4,0,.2,1);
  box-shadow:-20px 0 60px rgba(0,0,0,.5)!important;
}
.right-panel.open{transform:translateX(0);}

/* header */
.rp-hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:13px 14px 11px;
  border-bottom:1px solid rgba(255,255,255,.06)!important;
  flex-shrink:0;
}
.rp-hdr-title{
  font-size:10px;letter-spacing:.18em;color:rgba(0,214,232,.9);
  font-weight:700;text-transform:uppercase;
  font-family:Inter,system-ui,-apple-system,sans-serif;
}
.rp-hdr-x{
  width:26px;height:26px;
  border-radius:8px!important;padding:0!important;
  display:flex!important;align-items:center;justify-content:center;
  font-size:16px;line-height:1;
  color:rgba(180,195,215,.6)!important;
}
.rp-hdr-x:hover{
  color:rgba(255,77,109,.9)!important;
  background:rgba(255,77,109,.08)!important;
  border-color:rgba(255,77,109,.25)!important;
}

/* tabs */
.rp-tabs-bar{
  display:flex;
  border-bottom:1px solid rgba(125,180,255,.07);
  background:rgba(3,8,16,.6);
  flex-shrink:0;
  padding:0 4px;
}
.rp-tab{
  flex:1;
  background:transparent;border:none;outline:none;
  color:rgba(130,155,185,.45);
  font-size:10px;font-weight:600;letter-spacing:.04em;
  font-family:Inter,system-ui,-apple-system,sans-serif;
  padding:9px 4px 7px;
  cursor:pointer;
  border-bottom:2px solid transparent;
  transition:color .15s,border-color .15s;
  text-align:center;
  -webkit-tap-highlight-color:transparent;
}
.rp-tab:hover{color:rgba(180,205,230,.72);}
.rp-tab.active{color:#00d6e8;border-bottom-color:#00d6e8;}

/* body */
.rp-body{
  flex:1;overflow-y:auto;
  padding:10px 11px 16px;
  scrollbar-width:thin;
  display:flex;flex-direction:column;gap:9px;
}
.rp-body::-webkit-scrollbar{width:2px;}
.rp-body::-webkit-scrollbar-thumb{background:rgba(125,180,255,.15);border-radius:4px;}

/* section */
.rp-sec{display:flex;flex-direction:column;gap:7px;}
.rp-sl{
  font-size:9.5px;letter-spacing:.14em;
  color:rgba(160,185,210,.48);
  font-weight:700;text-transform:uppercase;
  font-family:Inter,system-ui,-apple-system,sans-serif;
  padding:0 2px;
}
.rp-div{height:1px;background:rgba(255,255,255,.048);margin:1px 0;}

/* 2-col grid */
.rp-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;}

/* item wrapper */
.rp-item{position:relative;}
.rp-item .rp-btn{width:100%;}

/* ── base button ── */
.rp-btn{
  display:flex!important;flex-direction:column!important;
  align-items:center!important;justify-content:center!important;
  gap:5px!important;padding:11px 8px 10px!important;
  background:linear-gradient(160deg,rgba(14,22,36,.95),rgba(8,14,24,.95))!important;
  border:1px solid rgba(255,255,255,.07)!important;
  border-radius:12px!important;
  color:rgba(215,228,248,.75)!important;
  font-size:11px!important;font-weight:500!important;letter-spacing:.01em!important;
  font-family:Inter,system-ui,-apple-system,sans-serif!important;
  cursor:pointer;text-align:center;width:100%;
  transition:background .15s,border-color .15s,color .15s,box-shadow .15s;
  line-height:1.15!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 1px 4px rgba(0,0,0,.28)!important;
  position:relative;
  -webkit-tap-highlight-color:transparent;
}
.rp-btn:hover{
  background:linear-gradient(160deg,rgba(18,27,43,.97),rgba(11,17,29,.97))!important;
  border-color:rgba(0,214,232,.2)!important;
  color:rgba(230,242,255,.94)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 0 10px rgba(0,214,232,.05)!important;
}
.rp-btn svg{
  flex-shrink:0;opacity:.56;transition:opacity .15s;
  width:18px!important;height:18px!important;
}
.rp-btn:hover svg,.rp-btn.active svg{opacity:.88;}
.rp-btn.active{
  background:linear-gradient(160deg,rgba(0,195,220,.11),rgba(0,155,180,.06))!important;
  border-color:rgba(0,214,232,.38)!important;
  color:#00d6e8!important;
  box-shadow:inset 0 1px 0 rgba(0,214,232,.08),0 0 12px rgba(0,214,232,.07)!important;
}
.rp-btn.active svg{opacity:1!important;}

/* disabled */
.rp-dis{opacity:.22!important;pointer-events:none!important;cursor:default!important;}

/* long */
.rp-long-btn{color:#27e6a3!important;}
.rp-long-btn svg{opacity:.62;}
.rp-long-btn:hover{border-color:rgba(39,230,163,.26)!important;box-shadow:inset 0 1px 0 rgba(39,230,163,.05),0 0 8px rgba(39,230,163,.04)!important;}
.rp-long-btn.active{background:linear-gradient(160deg,rgba(39,230,163,.11),rgba(39,230,163,.05))!important;border-color:rgba(39,230,163,.36)!important;}

/* short */
.rp-short-btn{color:#ff4d6d!important;}
.rp-short-btn svg{opacity:.62;}
.rp-short-btn:hover{border-color:rgba(255,77,109,.26)!important;box-shadow:inset 0 1px 0 rgba(255,77,109,.05),0 0 8px rgba(255,77,109,.04)!important;}
.rp-short-btn.active{background:linear-gradient(160deg,rgba(255,77,109,.11),rgba(255,77,109,.05))!important;border-color:rgba(255,77,109,.36)!important;}

/* star */
.rp-star{
  position:absolute!important;
  top:4px!important;right:5px!important;
  background:none!important;border:none!important;outline:none!important;
  padding:3px 2px!important;margin:0!important;
  font-size:10px;line-height:1;
  color:rgba(180,195,215,.2);
  cursor:pointer;
  z-index:2;
  transition:color .14s,transform .1s;
  -webkit-tap-highlight-color:transparent;
}
.rp-star:hover{color:#f59e0b;transform:scale(1.2);}
.rp-star.rp-starred{color:#f59e0b;}

/* QUICK ACTIONS section */
.rp-sec-qa{
  background:rgba(0,212,255,.022);
  border:1px solid rgba(0,212,255,.08);
  border-radius:11px;
  padding:10px 10px 8px;
  gap:0!important;
}
.rp-qa-hdr{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:9px;
}
.rp-sl-qa{color:rgba(0,214,232,.72)!important;}
.rp-qa-hint{
  font-size:8.5px;letter-spacing:.04em;
  color:rgba(130,155,185,.38);
  font-family:Inter,system-ui,-apple-system,sans-serif;
  text-transform:uppercase;font-weight:600;
}
.rp-qa-grid{gap:6px;}
.rp-qa-card{
  display:flex!important;flex-direction:column!important;
  align-items:center!important;justify-content:center!important;
  gap:5px!important;padding:12px 8px 11px!important;
  background:rgba(0,212,255,.03)!important;
  border:1px solid rgba(0,212,255,.1)!important;
  border-radius:11px!important;
  color:rgba(215,232,248,.8)!important;
  font-size:11px!important;font-weight:500!important;
  font-family:Inter,system-ui,-apple-system,sans-serif!important;
  cursor:pointer;text-align:center;width:100%;
  transition:background .15s,border-color .15s;
  box-shadow:0 1px 5px rgba(0,0,0,.18)!important;
  position:relative;
  -webkit-tap-highlight-color:transparent;
}
.rp-qa-card:hover{
  background:rgba(0,212,255,.06)!important;
  border-color:rgba(0,212,255,.18)!important;
}
.rp-qa-card svg{opacity:.68;width:18px!important;height:18px!important;transition:opacity .15s;}
.rp-qa-card:hover svg{opacity:.92;}
.rp-qa-card.rp-long-btn{color:#27e6a3!important;background:rgba(39,230,163,.04)!important;border-color:rgba(39,230,163,.14)!important;}
.rp-qa-card.rp-long-btn:hover{background:rgba(39,230,163,.08)!important;border-color:rgba(39,230,163,.24)!important;}
.rp-qa-card.rp-short-btn{color:#ff4d6d!important;background:rgba(255,77,109,.04)!important;border-color:rgba(255,77,109,.14)!important;}
.rp-qa-card.rp-short-btn:hover{background:rgba(255,77,109,.08)!important;border-color:rgba(255,77,109,.24)!important;}
.rp-qa-card .rp-star{color:#f59e0b;top:3px!important;right:4px!important;}
.rp-qa-empty{
  display:none;align-items:center;gap:7px;
  padding:11px 6px;
  color:rgba(130,155,185,.38);
  font-size:9.5px;letter-spacing:.02em;
  font-family:Inter,system-ui,-apple-system,sans-serif;
}
.rp-qa-empty.show{display:flex;}
.rp-qa-empty svg{opacity:.35;flex-shrink:0;}

/* exit — slim horizontal */
.rp-exit-btn{
  flex-direction:row!important;gap:8px!important;
  padding:9px 28px!important;justify-content:center!important;
  width:auto!important;min-width:110px;align-self:center;
  color:#ff4d6d!important;
  background:rgba(255,77,109,.04)!important;
  border-color:rgba(255,77,109,.18)!important;
  box-shadow:none!important;
}
.rp-exit-btn:hover{
  background:rgba(255,77,109,.08)!important;
  border-color:rgba(255,77,109,.36)!important;
  box-shadow:0 0 10px rgba(255,77,109,.06)!important;
}

/* bottom bar */
.rp-bottom-bar{
  margin-top:2px;
  padding:10px 11px;
  border-radius:10px;
  background:rgba(0,0,0,.16);
  border:1px solid rgba(255,255,255,.04);
  display:flex;flex-direction:column;gap:9px;
}
.rp-tip-box{
  display:flex;align-items:flex-start;gap:7px;
  color:rgba(140,165,195,.46);
  font-size:9.5px;letter-spacing:.01em;line-height:1.45;
  font-family:Inter,system-ui,-apple-system,sans-serif;
}
.rp-tip-box svg{flex-shrink:0;opacity:.45;margin-top:1px;}
.rp-bottom-actions{display:flex;gap:6px;}
.rp-bottom-act-btn{
  flex:1;
  background:rgba(255,255,255,.03)!important;
  border:1px solid rgba(255,255,255,.06)!important;
  border-radius:8px!important;
  color:rgba(155,180,210,.5)!important;
  font-size:9.5px!important;font-weight:600!important;letter-spacing:.03em!important;
  font-family:Inter,system-ui,-apple-system,sans-serif!important;
  padding:7px 6px!important;
  cursor:pointer;text-align:center;
  transition:background .15s,color .15s,border-color .15s;
  -webkit-tap-highlight-color:transparent;
}
.rp-bottom-act-btn:hover{
  background:rgba(0,214,232,.06)!important;
  border-color:rgba(0,214,232,.14)!important;
  color:rgba(0,214,232,.7)!important;
}
.rp-bottom-act-reset:hover{
  background:rgba(255,77,109,.06)!important;
  border-color:rgba(255,77,109,.14)!important;
  color:rgba(255,77,109,.68)!important;
}

/* ── DVL Smart Indicators Panel (Beta 0.062) ─────────────────────────── */'''

# ─────────────────────────────────────────────────────────────────────
# 3. NEW JS  (right panel control block)
# ─────────────────────────────────────────────────────────────────────
OLD_JS_START = '<script id="DVL__RIGHT_PANEL">'
OLD_JS_END   = '</script>\n\n<script>\n/* SessionProfile'

NEW_JS = r'''<script id="DVL__RIGHT_PANEL">
(function(){
  'use strict';
  var FAV_KEY='dvl_rp_favs_v1';
  var DEFAULT_FAVS=['long','short','ruler'];

  var _ITEMS={
    long:     {label:'Long',       cls:'rp-long-btn',  svg:'<path d="M5 19L19 5"/><polyline points="12 5 19 5 19 12"/>',sw:2},
    short:    {label:'Short',      cls:'rp-short-btn', svg:'<path d="M5 5L19 19"/><polyline points="12 19 19 19 19 12"/>',sw:2},
    ruler:    {label:'Régua',  svg:'<rect x="2" y="7" width="20" height="10" rx="1"/><line x1="6" y1="7" x2="6" y2="11"/><line x1="10" y1="7" x2="10" y2="13"/><line x1="14" y1="7" x2="14" y2="11"/><line x1="18" y1="7" x2="18" y2="13"/>'},
    fvg:      {label:'FVG',        svg:'<rect x="3" y="8" width="18" height="8" rx="1"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"/>'},
    ob:       {label:'Orderblock', svg:'<rect x="3" y="6" width="18" height="12" rx="1"/><line x1="8" y1="6" x2="8" y2="18"/>'},
    volProfile:{label:'Vol. Profile',svg:'<line x1="5" y1="20" x2="5" y2="4"/><rect x="5" y="4" width="9" height="2" rx=".5"/><rect x="5" y="8" width="14" height="2" rx=".5"/><rect x="5" y="12" width="7" height="2" rx=".5"/><rect x="5" y="16" width="11" height="2" rx=".5"/>'},
    drawLine: {label:'Linha',      svg:'<line x1="4" y1="20" x2="20" y2="4"/>'},
    drawRect: {label:'Retângulo',svg:'<rect x="3" y="5" width="18" height="14" rx="1"/>'},
    drawText: {label:'Texto',      svg:'<path d="M4 6h16M12 6v12M9 18h6"/>'},
    drawArrow:{label:'Seta',       svg:'<line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/>'},
    replay:   {label:'Replay',     svg:'<polygon points="5,3 19,12 5,21"/>'},
    snapshot: {label:'Snapshot',   svg:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'}
  };

  function getFavs(){try{var s=localStorage.getItem(FAV_KEY);return s?JSON.parse(s):DEFAULT_FAVS.slice();}catch(e){return DEFAULT_FAVS.slice();}}
  function setFavs(f){try{localStorage.setItem(FAV_KEY,JSON.stringify(f));}catch(e){}}

  function makeSvg(key){
    var m=_ITEMS[key];if(!m)return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(m.sw||1.5)+'" width="18" height="18">'+m.svg+'</svg>';
  }

  function triggerAction(key){
    var idMap={long:'rpBtnLong',short:'rpBtnShort',ruler:'rpRuler',fvg:'rpFvg',ob:'rpOb',volProfile:'rpVolProfile',drawLine:'rpDrawLine',drawRect:'rpDrawRect',drawText:'rpDrawText',drawArrow:'rpDrawArrow',replay:'rpReplay',snapshot:'rpSnapshot'};
    var b=document.getElementById(idMap[key]);if(b)b.click();
  }

  function renderQA(){
    var grid=document.getElementById('rpQAGrid');
    var empty=document.getElementById('rpQAEmpty');
    if(!grid)return;
    var favs=getFavs().filter(function(k){return !!_ITEMS[k];});
    grid.innerHTML='';
    if(!favs.length){
      if(empty){empty.classList.add('show');}
      return;
    }
    if(empty)empty.classList.remove('show');
    favs.forEach(function(key){
      var m=_ITEMS[key];
      var card=document.createElement('div');
      card.className='rp-qa-card'+(m.cls?' '+m.cls:'');
      card.dataset.qakey=key;
      card.innerHTML=makeSvg(key)+'<span>'+m.label+'</span><button class="rp-star rp-starred" data-rpkey="'+key+'" aria-label="Remover favorito">★</button>';
      card.addEventListener('click',function(e){
        if(e.target.classList.contains('rp-star'))return;
        triggerAction(key);
      });
      grid.appendChild(card);
    });
    grid.querySelectorAll('.rp-star[data-rpkey]').forEach(function(s){
      s.addEventListener('click',function(e){e.stopPropagation();toggleFav(s.dataset.rpkey);});
    });
  }

  function toggleFav(key){
    var favs=getFavs();
    var idx=favs.indexOf(key);
    if(idx>=0)favs.splice(idx,1);else favs.push(key);
    setFavs(favs);renderQA();syncStars();
  }

  function syncStars(){
    var favs=getFavs();
    document.querySelectorAll('.rp-star[data-rpkey]').forEach(function(s){
      var k=s.dataset.rpkey;
      var on=favs.indexOf(k)>=0;
      s.classList.toggle('rp-starred',on);
      s.title=on?'Remover favorito':'Favoritar';
    });
  }

  var panel=document.getElementById('rightPanel');
  var scrim=document.getElementById('rpScrim');
  var gearBtn=document.getElementById('gearMenuBtn');

  function open(){
    if(!panel)return;
    panel.classList.add('open');scrim&&scrim.classList.add('open');
    panel.setAttribute('aria-hidden','false');gearBtn&&gearBtn.classList.add('active');
    renderQA();syncStars();
  }
  function close(){
    if(!panel)return;
    panel.classList.remove('open');scrim&&scrim.classList.remove('open');
    panel.setAttribute('aria-hidden','true');gearBtn&&gearBtn.classList.remove('active');
  }

  window._dvlRightPanel={open:open,close:close};

  var closeBtn=document.getElementById('rpClose');
  if(closeBtn)closeBtn.onclick=close;
  if(scrim)scrim.onclick=close;

  // Tabs scroll to section
  document.querySelectorAll('.rp-tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      var secId=tab.dataset.rpsec;
      var body=document.getElementById('rpBody');
      document.querySelectorAll('.rp-tab').forEach(function(t){t.classList.remove('active');});
      tab.classList.add('active');
      if(secId&&body){
        var sec=document.getElementById(secId);
        if(sec)body.scrollTo({top:Math.max(0,sec.offsetTop-body.offsetTop-6),behavior:'smooth'});
      }
    });
  });

  // Stars (static ones in main sections)
  document.querySelectorAll('.rp-star[data-rpkey]').forEach(function(s){
    s.addEventListener('click',function(e){e.stopPropagation();toggleFav(s.dataset.rpkey);});
  });

  // Long / Short
  function syncRpBtns(){
    var hasS=window.S&&S.tool!==undefined;
    var rpL=document.getElementById('rpBtnLong');
    var rpS=document.getElementById('rpBtnShort');
    if(rpL)rpL.classList.toggle('active',hasS&&S.tool==='long');
    if(rpS)rpS.classList.toggle('active',hasS&&S.tool==='short');
  }
  var rpBtnLong=document.getElementById('rpBtnLong');
  var rpBtnShort=document.getElementById('rpBtnShort');
  if(rpBtnLong)rpBtnLong.onclick=function(){var b=document.getElementById('btnLong');if(b)b.click();syncRpBtns();};
  if(rpBtnShort)rpBtnShort.onclick=function(){var b=document.getElementById('btnShort');if(b)b.click();syncRpBtns();};

  // Régua
  var rpRuler=document.getElementById('rpRuler');
  if(rpRuler)rpRuler.onclick=function(){
    var br=document.getElementById('btnRuler');
    if(br){br.click();}
    else if(window.S){
      if(S.tool==='ruler'){S.tool=null;S._rulerNew=null;S._rulerCross=null;}else{S.tool='ruler';}
      rpRuler.classList.toggle('active',S.tool==='ruler');
      if(window.draw)draw();
    }
  };

  // FVG
  var rpFvg=document.getElementById('rpFvg');
  if(rpFvg)rpFvg.onclick=function(){
    var sw=document.querySelector('[data-ind="fvgVolume"] .switch');if(sw)sw.click();
    var row=document.querySelector('[data-ind="fvgVolume"]');
    rpFvg.classList.toggle('active',row&&row.classList.contains('on'));
  };

  // Orderblock
  var rpOb=document.getElementById('rpOb');
  if(rpOb)rpOb.onclick=function(){var sw=document.querySelector('[data-ind="book"] .switch');if(sw)sw.click();};

  // Vol. Profile
  var rpVolProfile=document.getElementById('rpVolProfile');
  if(rpVolProfile)rpVolProfile.onclick=function(){
    var sw=document.querySelector('[data-ind="sessionProfile"] .switch')||document.querySelector('[data-ind="profile"] .switch');
    if(sw)sw.click();
  };

  // Snapshot
  var rpSnapshot=document.getElementById('rpSnapshot');
  if(rpSnapshot)rpSnapshot.onclick=function(){
    var c=document.getElementById('chart');if(!c)return;
    try{var a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='dvl-chart-'+Date.now()+'.png';a.click();}catch(e){alert('Snapshot: '+e.message);}
  };

  // Theme
  var rpDark=document.getElementById('rpThemeDark');var rpLight=document.getElementById('rpThemeLight');
  if(rpDark)rpDark.onclick=function(){rpDark.classList.add('active');if(rpLight)rpLight.classList.remove('active');document.body.style.filter='';};
  if(rpLight)rpLight.onclick=function(){rpLight.classList.add('active');if(rpDark)rpDark.classList.remove('active');document.body.style.filter='invert(1) hue-rotate(180deg)';};

  // Bottom bar
  var rpManageFavs=document.getElementById('rpManageFavs');
  if(rpManageFavs)rpManageFavs.onclick=function(){
    var favs=getFavs();
    var names=favs.map(function(k){return _ITEMS[k]?_ITEMS[k].label:k;}).join(', ')||'(nenhum)';
    var msg='Quick Actions: '+names+'\n\nLimpar favoritos?';
    if(confirm(msg)){setFavs([]);renderQA();syncStars();}
  };
  var rpResetLayout=document.getElementById('rpResetLayout');
  if(rpResetLayout)rpResetLayout.onclick=function(){
    if(confirm('Redefinir Quick Actions para o padrão?')){setFavs(DEFAULT_FAVS.slice());renderQA();syncStars();}
  };

  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  setInterval(syncRpBtns,500);
  renderQA();syncStars();
})();
</script>

<script>
/* SessionProfile'''

# ─────────────────────────────────────────────────────────────────────
# 4. Apply replacements
# ─────────────────────────────────────────────────────────────────────

# HTML block
i1 = html.find(OLD_HTML_START)
i2 = html.find(OLD_HTML_END)
if i1 < 0 or i2 < 0:
    print('ERROR: HTML block markers not found', file=sys.stderr)
    sys.exit(1)
i2 += len(OLD_HTML_END)
print(f'HTML block: chars {i1}–{i2} ({i2-i1} chars removed)')
html = html[:i1] + NEW_HTML + html[i2:]

# CSS block
i1 = html.find(OLD_CSS_START)
i2 = html.find(OLD_CSS_END)
if i1 < 0 or i2 < 0:
    print('ERROR: CSS block markers not found', file=sys.stderr)
    sys.exit(1)
print(f'CSS block: chars {i1}–{i2} ({i2-i1} chars removed)')
html = html[:i1] + NEW_CSS + html[i2:]

# JS block
i1 = html.find(OLD_JS_START)
i2 = html.find(OLD_JS_END)
if i1 < 0 or i2 < 0:
    print('ERROR: JS block markers not found', file=sys.stderr)
    sys.exit(1)
print(f'JS block: chars {i1}–{i2} ({i2-i1} chars removed)')
html = html[:i1] + NEW_JS + html[i2 + len(OLD_JS_END):]

# Version bump
old_count = html.count(OLD_VER)
html = html.replace(OLD_VER, NEW_VER)
print(f'Version: replaced {old_count} occurrences of "{OLD_VER}" → "{NEW_VER}"')

# Changelog entry
CHANGELOG_MARKER = 'Beta 0.064\n'
if CHANGELOG_MARKER not in html:
    CL_ANCHOR = 'Beta 0.063\n'
    CL_ENTRY = ('Beta 0.064\n'
                '  - Ferramentas panel fully refactored: tabs (Trading/Drawing/Utility/Theme),\n'
                '    QUICK ACTIONS section powered by favorites, consistent card grid,\n'
                '    stars on every tool, localStorage persistence, bottom bar with\n'
                '    "Gerenciar favoritos" and "Redefinir" actions.\n'
                '  - Sections: Trading (Long/Short/Régua), Drawing, Analysis (FVG/Orderblock/Vol.Profile),\n'
                '    Utilities (Replay/Snapshot), Theme, Sair.\n'
                '  - No change to chart, indicators, crosshair, or oscillator panels.\n\n')
    html = html.replace(CL_ANCHOR, CL_ENTRY + CL_ANCHOR, 1)
    print('Changelog entry added.')

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print('Done — file written.')
