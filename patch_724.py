#!/usr/bin/env python3
"""patch_724.py — Beta 0.724: Functional Positions panel + Watchlist bottom nav rename."""
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

print("=== patch_724.py — Beta 0.724 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.723</title>',
    '<title>DVL Binance Live — Beta 0.724</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.723";',
    'const DVL_APP_VERSION = "Beta 0.724";', "version const")

html = rep(html,
    '>BETA 0.723</span>',
    '>BETA 0.724</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.723 — all indicators OFF by default for new users, sessions OFF by default, DVL Teste removed from defaults." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.724 — integrated functional Positions panel, Watchlist bottom nav rename, Demo/Real toggle and Position Details drawer." },\n  { version: "Beta 0.723", note: "Beta 0.723 — all indicators OFF by default for new users, sessions OFF by default, DVL Teste removed from defaults." },',
    "changelog")

# ── 2. Audit bump 0723 → 0724 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0723_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0724_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.723"',
    'window.DVL_APP_VERSION==="Beta 0.724"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.723' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.724' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.723")===-1) blockers.push("A2: title missing 0.723")',
    'indexOf("0.724")===-1) blockers.push("A2: title missing 0.724")', "audit A2")

html = rep(html,
    'var N=77, name="DVL_UI_OVERLAY_PHASE_0723_AUDIT_MODULE";',
    '// A78. Positions v2 overlay CSS block present\n'
    'if(!document.getElementById("DVL_POSITIONS_WATCHLIST_OVERLAY_CSS_0722")) warnings.push("A78: DVL_POSITIONS_WATCHLIST_OVERLAY_CSS_0722 missing");\n'
    '// A79. Position Details panel CSS present\n'
    'if(!document.getElementById("DVL_POSITION_DETAILS_PANEL_CSS_0724")) warnings.push("A79: DVL_POSITION_DETAILS_PANEL_CSS_0724 missing");\n'
    '// A80. assetsNavBtn bridge target present\n'
    'if(!document.getElementById("assetsNavBtn")) warnings.push("A80: assetsNavBtn missing — Watchlist bridge broken");\n'
    '\n'
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0724_AUDIT_MODULE";',
    "audit: A78-A80 + N=80 + name 0724")

# ── 3. Rename "Assets" → "Watchlist" in legacy bottom nav HTML ───────────────────
html = rep(html,
    'id="assetsNavBtn" type="button"><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M16 13h4"/></svg><span>Assets</span></button>',
    'id="assetsNavBtn" type="button"><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M16 13h4"/></svg><span>Watchlist</span></button>',
    "legacy nav: Assets → Watchlist")

# ── 4. Build Positions overlay blocks ────────────────────────────────────────────
POSITIONS_BLOCKS = """\
<style id="DVL_POSITIONS_WATCHLIST_OVERLAY_CSS_0722">
/*
  DVL Beta 0.722 — Positions + Watchlist overlay on existing HTML.
  Draws Positions panel and v2 bottom nav shell over the current HTML.
  Existing header, hotbar, chart, trade drawer, paper trading and API untouched.
  Legacy bottom nav hidden visually; stays in DOM for bridge clicks.
*/

/* 00 — local tokens */
:root{
  --dvl-pos-bottom-h:104px;
  --dvl-pos-nav-h:88px;
  --dvl-pos-green:#10df77;
  --dvl-pos-bg:#020806;
  --dvl-pos-bg2:#030d0a;
  --dvl-pos-card:rgba(5,14,12,.94);
  --dvl-pos-card2:rgba(7,17,15,.96);
  --dvl-pos-line:rgba(145,175,165,.18);
  --dvl-pos-line-strong:rgba(16,223,119,.32);
  --dvl-pos-text:#f4f6f4;
  --dvl-pos-muted:#a5aaa9;
  --dvl-pos-muted2:#737b79;
  --dvl-pos-red:#ff3037;
  --dvl-pos-yellow:#ffd321;
}

/* 01 — safe activation */
body.dvl-positions-v2-active{
  --dvl-footer-h:var(--dvl-pos-bottom-h)!important;
}

body.dvl-positions-v2-active .app{
  padding-bottom:calc(var(--dvl-pos-bottom-h) + env(safe-area-inset-bottom))!important;
}

body.dvl-positions-v2-active .bottomNav{
  opacity:0!important;
  pointer-events:none!important;
}

body.dvl-positions-v2-active .homeLine{
  display:none!important;
}

body.dvl-positions-v2-active .tradeDrawer{
  bottom:calc(var(--dvl-pos-bottom-h) + env(safe-area-inset-bottom))!important;
  z-index:92!important;
}

body.dvl-positions-v2-active .tradeDrawer.is-open{
  pointer-events:auto!important;
}

/* 02 — v2 bottom nav shell */
#dvlBottomNavV2{
  position:fixed!important;
  left:10px!important;
  right:10px!important;
  bottom:calc(24px + env(safe-area-inset-bottom))!important;
  height:var(--dvl-pos-nav-h)!important;
  z-index:120!important;
  display:grid!important;
  grid-template-columns:repeat(5,1fr)!important;
  align-items:center!important;
  gap:0!important;
  padding:7px 8px!important;
  border-radius:28px!important;
  border:1px solid rgba(145,175,165,.18)!important;
  background:
    radial-gradient(280px 95px at 50% 0%, rgba(16,223,119,.13), transparent 72%),
    linear-gradient(180deg,rgba(5,14,12,.95),rgba(3,10,8,.98))!important;
  box-shadow:
    0 18px 52px rgba(0,0,0,.46),
    inset 0 1px 0 rgba(255,255,255,.025)!important;
  overflow:visible!important;
}

.dvlNavV2Btn{
  height:72px!important;
  min-width:0!important;
  border-radius:20px!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:5px!important;
  color:#94a29c!important;
  font-size:12px!important;
  font-weight:850!important;
  line-height:1!important;
  white-space:nowrap!important;
  position:relative!important;
}

.dvlNavV2Btn svg{
  width:26px!important;
  height:26px!important;
  display:block!important;
  stroke:currentColor!important;
  fill:none!important;
  stroke-width:2.25!important;
  stroke-linecap:round!important;
  stroke-linejoin:round!important;
}

.dvlNavV2Btn span{
  line-height:1!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  max-width:100%!important;
}

.dvlNavV2Btn.is-active{
  color:var(--dvl-pos-green)!important;
}

.dvlNavV2Btn[data-dvl-nav-key="trade"]{
  height:84px!important;
  transform:translateY(-9px)!important;
  border-radius:22px!important;
  color:var(--dvl-pos-green)!important;
  border:1px solid rgba(16,223,119,.42)!important;
  background:
    radial-gradient(circle at 50% 23%, rgba(16,223,119,.28), transparent 62%),
    linear-gradient(180deg,rgba(16,223,119,.13),rgba(5,14,12,.94))!important;
  box-shadow:
    0 0 36px rgba(16,223,119,.16),
    inset 0 0 0 1px rgba(255,255,255,.025)!important;
}

.dvlNavV2Btn[data-dvl-nav-key="trade"] svg{
  width:32px!important;
  height:32px!important;
}

.dvlNavV2Btn[data-dvl-nav-key="positions"].is-active{
  color:var(--dvl-pos-green)!important;
  text-shadow:0 0 12px rgba(16,223,119,.22)!important;
}

#dvlBottomHomebarV2{
  position:fixed!important;
  left:50%!important;
  transform:translateX(-50%)!important;
  bottom:calc(8px + env(safe-area-inset-bottom))!important;
  width:150px!important;
  height:4px!important;
  border-radius:999px!important;
  background:#f4f4f4!important;
  opacity:.88!important;
  z-index:122!important;
}

/* 03 — Positions sheet */
#dvlPositionsPanelV2{
  position:fixed!important;
  left:4px!important;
  right:4px!important;
  bottom:calc(var(--dvl-pos-bottom-h) + 17px + env(safe-area-inset-bottom))!important;
  z-index:112!important;
  border-radius:24px!important;
  border:1px solid rgba(16,223,119,.28)!important;
  background:
    radial-gradient(360px 180px at 52% 0%, rgba(16,223,119,.09), transparent 70%),
    linear-gradient(180deg,rgba(5,14,12,.965),rgba(3,10,8,.985))!important;
  box-shadow:
    0 22px 60px rgba(0,0,0,.48),
    inset 0 1px 0 rgba(255,255,255,.025)!important;
  overflow:hidden!important;
  display:none!important;
}

#dvlPositionsPanelV2.is-open{
  display:block!important;
}

.dvlPosV2Grip{
  width:54px!important;
  height:4px!important;
  margin:8px auto 10px!important;
  border-radius:999px!important;
  background:rgba(165,170,169,.48)!important;
}

.dvlPosV2Head{
  display:grid!important;
  grid-template-columns:1fr auto!important;
  align-items:center!important;
  gap:12px!important;
  padding:0 18px 14px!important;
}

.dvlPosV2Title{
  margin:0!important;
  font-size:24px!important;
  font-weight:950!important;
  letter-spacing:-.02em!important;
  color:#f4f6f4!important;
}

.dvlPosV2Mode{
  display:flex!important;
  align-items:center!important;
  gap:0!important;
  justify-content:flex-end!important;
  color:var(--dvl-pos-green)!important;
  font-size:15px!important;
  font-weight:850!important;
  white-space:nowrap!important;
}

.dvlPosV2ModeLabel{
  display:none!important;
}

.dvlPosV2ModeToggle{
  width:104px!important;
  height:44px!important;
  padding:4px!important;
  display:grid!important;
  grid-template-columns:1fr 1fr!important;
  border-radius:15px!important;
  border:1px solid rgba(145,175,165,.18)!important;
  background:rgba(3,10,8,.82)!important;
  overflow:hidden!important;
}

.dvlPosV2ModeBtn{
  height:36px!important;
  display:grid!important;
  place-items:center!important;
  border-radius:12px!important;
  color:var(--dvl-pos-muted)!important;
  font-size:14px!important;
  font-weight:900!important;
}

.dvlPosV2ModeBtn.is-active{
  color:var(--dvl-pos-green)!important;
  background:linear-gradient(180deg,rgba(16,223,119,.20),rgba(16,223,119,.10))!important;
  box-shadow:0 0 18px rgba(16,223,119,.12)!important;
}

.dvlPosV2Tabs{
  height:54px!important;
  margin:0 16px 10px!important;
  display:grid!important;
  grid-template-columns:repeat(3,1fr)!important;
  border:1px solid rgba(145,175,165,.14)!important;
  border-radius:13px!important;
  overflow:hidden!important;
  background:rgba(4,12,10,.62)!important;
}

.dvlPosV2Tab{
  position:relative!important;
  display:grid!important;
  place-items:center!important;
  color:#c7cecb!important;
  font-size:16px!important;
  font-weight:850!important;
  border-right:1px solid rgba(145,175,165,.10)!important;
}

.dvlPosV2Tab:last-child{
  border-right:0!important;
}

.dvlPosV2Tab.is-active{
  color:var(--dvl-pos-green)!important;
  background:linear-gradient(180deg,rgba(16,223,119,.08),rgba(16,223,119,.025))!important;
}

.dvlPosV2Tab.is-active::after{
  content:""!important;
  position:absolute!important;
  left:0!important;
  right:0!important;
  bottom:0!important;
  height:3px!important;
  background:var(--dvl-pos-green)!important;
  box-shadow:0 0 14px rgba(16,223,119,.32)!important;
}

.dvlPosV2List{
  max-height:292px!important;
  overflow:auto!important;
  padding:0 14px 16px!important;
  scrollbar-width:none!important;
}

.dvlPosV2List::-webkit-scrollbar{
  display:none!important;
}

.dvlPosV2Card{
  height:74px!important;
  display:grid!important;
  grid-template-columns:44px 1.15fr .90fr .90fr 1.05fr 18px!important;
  align-items:center!important;
  gap:9px!important;
  padding:0 12px!important;
  margin:0 0 8px!important;
  border-radius:14px!important;
  border:1px solid rgba(145,175,165,.12)!important;
  background:linear-gradient(180deg,rgba(7,17,15,.86),rgba(4,12,10,.80))!important;
  cursor:pointer!important;
}

.dvlPosV2Token{
  width:34px!important;
  height:34px!important;
  border-radius:50%!important;
  display:grid!important;
  place-items:center!important;
  font-size:18px!important;
  font-weight:950!important;
  color:#fff!important;
}

.dvlPosV2Token.btc{background:linear-gradient(180deg,#ffb536,#f08d00)!important;}
.dvlPosV2Token.eth{background:linear-gradient(180deg,#7180ff,#49516f)!important;}
.dvlPosV2Token.sol{background:linear-gradient(135deg,#00f0a8,#7d45ff 55%,#0a0a0d)!important;}

.dvlPosV2Pair{
  min-width:0!important;
}

.dvlPosV2Pair b{
  display:block!important;
  font-size:15px!important;
  font-weight:950!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}

.dvlPosV2Tags{
  margin-top:7px!important;
  display:flex!important;
  gap:4px!important;
}

.dvlPosV2Tag{
  height:22px!important;
  min-width:42px!important;
  padding:0 7px!important;
  display:grid!important;
  place-items:center!important;
  border-radius:6px!important;
  font-size:11px!important;
  font-weight:900!important;
  white-space:nowrap!important;
}

.dvlPosV2Tag.long{
  color:var(--dvl-pos-green)!important;
  background:rgba(16,223,119,.12)!important;
  border:1px solid rgba(16,223,119,.18)!important;
}

.dvlPosV2Tag.short{
  color:#ff5966!important;
  background:rgba(255,48,55,.12)!important;
  border:1px solid rgba(255,48,55,.20)!important;
}

.dvlPosV2Tag.lev{
  color:#cbd4d0!important;
  background:rgba(145,175,165,.10)!important;
  border:1px solid rgba(145,175,165,.12)!important;
}

.dvlPosV2Col{
  min-width:0!important;
}

.dvlPosV2Col span,
.dvlPosV2Pnl span{
  display:block!important;
  font-size:11px!important;
  color:var(--dvl-pos-muted2)!important;
  margin-bottom:6px!important;
  white-space:nowrap!important;
}

.dvlPosV2Col b{
  display:block!important;
  font-size:14px!important;
  font-weight:850!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}

.dvlPosV2Pnl{
  min-width:0!important;
  text-align:right!important;
}

.dvlPosV2Pnl b{
  display:block!important;
  font-size:15px!important;
  font-weight:950!important;
  white-space:nowrap!important;
}

.dvlPosV2Pnl small{
  display:block!important;
  margin-top:4px!important;
  font-size:12px!important;
  font-weight:850!important;
  white-space:nowrap!important;
}

.dvlPosV2Pnl.positive b,
.dvlPosV2Pnl.positive small{color:var(--dvl-pos-green)!important;}

.dvlPosV2Pnl.negative b,
.dvlPosV2Pnl.negative small{color:var(--dvl-pos-red)!important;}

.dvlPosV2Next{
  width:13px!important;
  height:13px!important;
  border-right:3px solid var(--dvl-pos-muted)!important;
  border-bottom:3px solid var(--dvl-pos-muted)!important;
  transform:rotate(-45deg)!important;
  opacity:.9!important;
}

.dvlPosV2Empty{
  height:120px!important;
  display:grid!important;
  place-items:center!important;
  color:var(--dvl-pos-muted)!important;
  font-weight:850!important;
}

/* 04 — nav always interactive when v2 active */
body.dvl-positions-v2-active #dvlBottomNavV2{
  pointer-events:auto!important;
}

/* 05 — responsive */
@media(max-width:390px){
  #dvlBottomNavV2{
    left:7px!important;
    right:7px!important;
    height:86px!important;
    border-radius:25px!important;
    padding:7px 7px!important;
  }
  .dvlNavV2Btn{font-size:11px!important;}
  .dvlNavV2Btn svg{width:24px!important;height:24px!important;}
  .dvlNavV2Btn[data-dvl-nav-key="trade"]{height:82px!important;}
  #dvlPositionsPanelV2{left:3px!important;right:3px!important;}
}
</style>

<style id="DVL_POSITIONS_WATCHLIST_PROPORTIONS_FIX_CSS_0723">
/*
  DVL Beta 0.723 — Positions + Bottom Nav Proportions Fix
  Overrides 0722 initial sizes to match real DVL mobile proportions.
*/

:root{
  --dvl-pos-bottom-h:86px!important;
  --dvl-pos-nav-h:80px!important;
}

body.dvl-positions-v2-active{
  --dvl-footer-h:86px!important;
}

body.dvl-positions-v2-active .app{
  padding-bottom:calc(86px + env(safe-area-inset-bottom))!important;
}

body.dvl-positions-v2-active .tradeDrawer{
  bottom:calc(86px + env(safe-area-inset-bottom))!important;
  z-index:92!important;
}

#dvlBottomNavV2{
  left:12px!important;
  right:12px!important;
  bottom:calc(10px + env(safe-area-inset-bottom))!important;
  height:80px!important;
  padding:5px 7px!important;
  border-radius:24px!important;
  grid-template-columns:repeat(5,1fr)!important;
  background:
    radial-gradient(210px 76px at 50% 0%, rgba(16,223,119,.10), transparent 72%),
    linear-gradient(180deg,rgba(5,14,12,.94),rgba(3,10,8,.985))!important;
  box-shadow:
    0 14px 38px rgba(0,0,0,.42),
    inset 0 1px 0 rgba(255,255,255,.022)!important;
}

.dvlNavV2Btn{
  height:58px!important;
  border-radius:17px!important;
  gap:4px!important;
  font-size:10.4px!important;
  font-weight:830!important;
  color:#91a09a!important;
}

.dvlNavV2Btn svg{
  width:22px!important;
  height:22px!important;
  stroke-width:2.15!important;
}

.dvlNavV2Btn[data-dvl-nav-key="trade"]{
  height:68px!important;
  transform:translateY(-5px)!important;
  border-radius:19px!important;
  border-color:rgba(16,223,119,.34)!important;
  box-shadow:
    0 0 22px rgba(16,223,119,.12),
    inset 0 0 0 1px rgba(255,255,255,.02)!important;
  background:
    radial-gradient(circle at 50% 22%, rgba(16,223,119,.20), transparent 62%),
    linear-gradient(180deg,rgba(16,223,119,.10),rgba(5,14,12,.94))!important;
}

.dvlNavV2Btn[data-dvl-nav-key="trade"] svg{
  width:26px!important;
  height:26px!important;
}

.dvlNavV2Btn[data-dvl-nav-key="positions"].is-active{
  color:#10df77!important;
  text-shadow:0 0 10px rgba(16,223,119,.16)!important;
}

body:not(.dvl-trade-v2-open) .dvlNavV2Btn[data-dvl-nav-key="trade"]{
  color:#94a29c!important;
  border-color:rgba(145,175,165,.18)!important;
  background:
    radial-gradient(circle at 50% 22%, rgba(16,223,119,.08), transparent 60%),
    linear-gradient(180deg,rgba(5,14,12,.92),rgba(3,10,8,.98))!important;
  box-shadow:none!important;
}

body.dvl-trade-v2-open .dvlNavV2Btn[data-dvl-nav-key="trade"]{
  color:#10df77!important;
}

#dvlBottomHomebarV2{
  bottom:calc(5px + env(safe-area-inset-bottom))!important;
  width:138px!important;
  height:3px!important;
  opacity:.82!important;
}

#dvlPositionsPanelV2{
  left:10px!important;
  right:10px!important;
  bottom:calc(86px + 12px + env(safe-area-inset-bottom))!important;
  max-height:44vh!important;
  border-radius:20px!important;
  display:none!important;
  grid-template-rows:auto auto minmax(0,1fr)!important;
  background:
    radial-gradient(300px 130px at 52% 0%, rgba(16,223,119,.07), transparent 70%),
    linear-gradient(180deg,rgba(5,14,12,.965),rgba(3,10,8,.985))!important;
}

#dvlPositionsPanelV2.is-open{
  display:grid!important;
}

.dvlPosV2Grip{
  width:44px!important;
  height:3px!important;
  margin:7px auto 8px!important;
}

.dvlPosV2Head{
  padding:0 12px 9px!important;
  gap:8px!important;
}

.dvlPosV2Title{
  font-size:20px!important;
  letter-spacing:-.015em!important;
}

.dvlPosV2Mode{
  gap:7px!important;
  font-size:13px!important;
}

.dvlPosV2ModeToggle{
  width:88px!important;
  height:34px!important;
  padding:3px!important;
  border-radius:12px!important;
}

.dvlPosV2ModeBtn{
  height:28px!important;
  border-radius:9px!important;
  font-size:12px!important;
}

.dvlPosV2Tabs{
  height:42px!important;
  margin:0 10px 8px!important;
  border-radius:11px!important;
}

.dvlPosV2Tab{
  font-size:13px!important;
  font-weight:850!important;
}

.dvlPosV2Tab.is-active::after{
  height:2px!important;
}

.dvlPosV2List{
  max-height:none!important;
  overflow:auto!important;
  padding:0 9px 10px!important;
  min-height:0!important;
}

.dvlPosV2Card{
  height:58px!important;
  grid-template-columns:30px minmax(66px,1.10fr) minmax(48px,.72fr) minmax(48px,.72fr) minmax(66px,.92fr) 10px!important;
  gap:5px!important;
  padding:0 8px!important;
  margin-bottom:6px!important;
  border-radius:12px!important;
}

.dvlPosV2Token{
  width:28px!important;
  height:28px!important;
  font-size:15px!important;
}

.dvlPosV2Pair{overflow:hidden!important;}

.dvlPosV2Pair b{
  font-size:13px!important;
  max-width:100%!important;
}

.dvlPosV2Tags{margin-top:5px!important;gap:3px!important;}

.dvlPosV2Tag{
  height:18px!important;
  min-width:34px!important;
  padding:0 5px!important;
  border-radius:5px!important;
  font-size:9px!important;
}

.dvlPosV2Col span,
.dvlPosV2Pnl span{
  font-size:8.5px!important;
  margin-bottom:4px!important;
  line-height:1!important;
}

.dvlPosV2Col b{
  font-size:11.5px!important;
  line-height:1!important;
}

.dvlPosV2Pnl b{
  font-size:12.5px!important;
  line-height:1!important;
}

.dvlPosV2Pnl small{
  margin-top:3px!important;
  font-size:10px!important;
  line-height:1!important;
}

.dvlPosV2Next{
  width:10px!important;
  height:10px!important;
  border-right-width:2px!important;
  border-bottom-width:2px!important;
}

.dvlPosV2Empty{
  height:86px!important;
  font-size:12px!important;
}

@media(max-width:385px){
  #dvlBottomNavV2{
    left:9px!important;
    right:9px!important;
    height:78px!important;
    border-radius:23px!important;
  }
  .dvlNavV2Btn{height:56px!important;font-size:10px!important;}
  .dvlNavV2Btn svg{width:21px!important;height:21px!important;}
  .dvlNavV2Btn[data-dvl-nav-key="trade"]{height:66px!important;transform:translateY(-5px)!important;}
  .dvlNavV2Btn[data-dvl-nav-key="trade"] svg{width:25px!important;height:25px!important;}
  #dvlPositionsPanelV2{left:8px!important;right:8px!important;max-height:43vh!important;}
  .dvlPosV2Title{font-size:19px!important;}
  .dvlPosV2Mode{font-size:12px!important;}
  .dvlPosV2ModeToggle{width:82px!important;}
  .dvlPosV2ModeBtn{font-size:11px!important;}
  .dvlPosV2Card{grid-template-columns:29px minmax(68px,1.18fr) minmax(49px,.76fr) minmax(66px,.95fr) 10px!important;}
  .dvlPosV2Card .dvlPosV2Col:nth-of-type(3){display:none!important;}
}
</style>

<style id="DVL_POSITION_DETAILS_PANEL_CSS_0724">
/*
  DVL Beta 0.724 — Position Details panel
  Click a position card to open a compact details drawer.
*/

#dvlPositionDetailsV2{
  position:fixed!important;
  left:10px!important;
  right:10px!important;
  bottom:calc(86px + 12px + env(safe-area-inset-bottom))!important;
  z-index:118!important;
  max-height:50vh!important;
  display:none!important;
  grid-template-rows:auto minmax(0,1fr)!important;
  border-radius:20px!important;
  border:1px solid rgba(16,223,119,.34)!important;
  background:
    radial-gradient(320px 150px at 52% 0%, rgba(16,223,119,.10), transparent 72%),
    linear-gradient(180deg,rgba(5,14,12,.982),rgba(3,10,8,.992))!important;
  box-shadow:
    0 24px 62px rgba(0,0,0,.56),
    inset 0 1px 0 rgba(255,255,255,.025)!important;
  overflow:hidden!important;
  color:#f4f6f4!important;
}

#dvlPositionDetailsV2.is-open{
  display:grid!important;
}

.dvlDetailV2Head{
  padding:10px 12px 9px!important;
  display:grid!important;
  grid-template-columns:1fr auto!important;
  align-items:center!important;
  gap:10px!important;
  border-bottom:1px solid rgba(145,175,165,.13)!important;
}

.dvlDetailV2TitleLine{
  min-width:0!important;
  display:flex!important;
  align-items:center!important;
  gap:8px!important;
}

.dvlDetailV2Coin{
  width:30px!important;
  height:30px!important;
  border-radius:50%!important;
  display:grid!important;
  place-items:center!important;
  font-size:16px!important;
  font-weight:950!important;
  color:#fff!important;
  flex:0 0 auto!important;
}

.dvlDetailV2Coin.btc{background:linear-gradient(180deg,#ffb536,#f08d00)!important;}
.dvlDetailV2Coin.eth{background:linear-gradient(180deg,#7180ff,#49516f)!important;}
.dvlDetailV2Coin.sol{background:linear-gradient(135deg,#00f0a8,#7d45ff 55%,#0a0a0d)!important;}

.dvlDetailV2TitleText{min-width:0!important;}

.dvlDetailV2TitleText strong{
  display:block!important;
  font-size:17px!important;
  line-height:1.05!important;
  font-weight:950!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}

.dvlDetailV2Sub{
  margin-top:4px!important;
  display:flex!important;
  align-items:center!important;
  gap:5px!important;
  color:#a5aaa9!important;
  font-size:11px!important;
  font-weight:850!important;
}

.dvlDetailV2Badge{
  height:19px!important;
  padding:0 7px!important;
  display:grid!important;
  place-items:center!important;
  border-radius:6px!important;
  font-size:10px!important;
  font-weight:900!important;
  line-height:1!important;
}

.dvlDetailV2Badge.long{
  color:#10df77!important;
  background:rgba(16,223,119,.12)!important;
  border:1px solid rgba(16,223,119,.22)!important;
}

.dvlDetailV2Badge.short{
  color:#ff5966!important;
  background:rgba(255,48,55,.12)!important;
  border:1px solid rgba(255,48,55,.22)!important;
}

.dvlDetailV2Badge.lev{
  color:#cbd4d0!important;
  background:rgba(145,175,165,.10)!important;
  border:1px solid rgba(145,175,165,.13)!important;
}

.dvlDetailV2Close{
  width:34px!important;
  height:34px!important;
  display:grid!important;
  place-items:center!important;
  border-radius:11px!important;
  border:1px solid rgba(145,175,165,.16)!important;
  background:rgba(4,12,10,.74)!important;
  color:#c9d2ce!important;
  font-size:24px!important;
  line-height:1!important;
}

.dvlDetailV2Body{
  min-height:0!important;
  overflow:auto!important;
  padding:10px 12px 12px!important;
  scrollbar-width:none!important;
}

.dvlDetailV2Body::-webkit-scrollbar{display:none!important;}

.dvlDetailV2PnlHero{
  display:grid!important;
  grid-template-columns:1fr auto!important;
  align-items:center!important;
  gap:8px!important;
  min-height:58px!important;
  border-radius:14px!important;
  border:1px solid rgba(145,175,165,.13)!important;
  background:
    radial-gradient(150px 70px at 88% 50%, rgba(16,223,119,.10), transparent 70%),
    linear-gradient(180deg,rgba(7,17,15,.74),rgba(4,12,10,.70))!important;
  padding:9px 10px!important;
  margin-bottom:9px!important;
}

.dvlDetailV2PnlHero span{
  display:block!important;
  color:#a5aaa9!important;
  font-size:10px!important;
  font-weight:850!important;
  margin-bottom:5px!important;
}

.dvlDetailV2PnlHero strong{
  display:block!important;
  font-size:21px!important;
  line-height:1!important;
  font-weight:950!important;
}

.dvlDetailV2PnlHero strong.green{color:#10df77!important;}
.dvlDetailV2PnlHero strong.red{color:#ff3037!important;}

.dvlDetailV2PnlHero small{
  display:block!important;
  margin-top:4px!important;
  color:#10df77!important;
  font-size:12px!important;
  font-weight:900!important;
  text-align:right!important;
}

.dvlDetailV2Grid{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:7px!important;
  margin-bottom:9px!important;
}

.dvlDetailV2Cell{
  min-height:50px!important;
  border-radius:12px!important;
  border:1px solid rgba(145,175,165,.11)!important;
  background:rgba(4,12,10,.64)!important;
  padding:8px 9px!important;
}

.dvlDetailV2Cell span{
  display:block!important;
  color:#7d8984!important;
  font-size:9.5px!important;
  font-weight:850!important;
  margin-bottom:6px!important;
  line-height:1!important;
}

.dvlDetailV2Cell b{
  display:block!important;
  color:#f4f6f4!important;
  font-size:13px!important;
  line-height:1.1!important;
  font-weight:900!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}

.dvlDetailV2Cell.green b{color:#10df77!important;}
.dvlDetailV2Cell.red b{color:#ff3037!important;}

.dvlDetailV2SectionTitle{
  margin:2px 0 7px!important;
  color:#dfe8e3!important;
  font-size:12px!important;
  font-weight:950!important;
  letter-spacing:.02em!important;
}

.dvlDetailV2Actions{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:7px!important;
  margin-bottom:10px!important;
}

.dvlDetailV2Action{
  height:36px!important;
  border-radius:11px!important;
  border:1px solid rgba(145,175,165,.14)!important;
  background:rgba(4,12,10,.72)!important;
  color:#dfe8e3!important;
  font-size:11px!important;
  font-weight:900!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:6px!important;
}

.dvlDetailV2Action.primary{
  color:#10df77!important;
  border-color:rgba(16,223,119,.35)!important;
  background:rgba(16,223,119,.09)!important;
}

.dvlDetailV2Action.danger{
  color:#ff5966!important;
  border-color:rgba(255,48,55,.28)!important;
  background:rgba(255,48,55,.08)!important;
}

.dvlDetailV2Timeline{
  border-radius:13px!important;
  border:1px solid rgba(145,175,165,.11)!important;
  background:rgba(4,12,10,.55)!important;
  padding:8px 9px!important;
}

.dvlDetailV2Event{
  display:grid!important;
  grid-template-columns:54px 1fr!important;
  gap:8px!important;
  padding:5px 0!important;
  color:#cbd4d0!important;
  font-size:10.5px!important;
  font-weight:820!important;
  border-bottom:1px solid rgba(145,175,165,.08)!important;
}

.dvlDetailV2Event:last-child{border-bottom:0!important;}

.dvlDetailV2Event time{
  color:#10df77!important;
  font-weight:900!important;
}

.dvlPosV2Card.is-detail-open{
  border-color:rgba(16,223,119,.38)!important;
  box-shadow:0 0 0 1px rgba(16,223,119,.08),0 0 18px rgba(16,223,119,.08)!important;
}

@media(max-width:385px){
  #dvlPositionDetailsV2{left:8px!important;right:8px!important;max-height:49vh!important;}
  .dvlDetailV2TitleText strong{font-size:16px!important;}
  .dvlDetailV2PnlHero strong{font-size:19px!important;}
  .dvlDetailV2Grid{gap:6px!important;}
  .dvlDetailV2Cell{min-height:48px!important;padding:7px 8px!important;}
  .dvlDetailV2Cell b{font-size:12px!important;}
  .dvlDetailV2Actions{gap:6px!important;}
  .dvlDetailV2Action{height:34px!important;font-size:10px!important;}
}
</style>

<script id="DVL_POSITIONS_WATCHLIST_OVERLAY_MODULE_0722">
(function(){
  "use strict";

  if(window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722) return;

  var state = {
    mode: "demo",
    activeTab: "open",
    panelOpen: false
  };

  var tabs = [
    { key: "open", label: "Abertas" },
    { key: "pending", label: "Pendentes" },
    { key: "histórico", label: "Histórico" }
  ];

  var tabKeys = ["open","pending","history"];
  var tabLabels = ["Abertas","Pendentes","Histórico"];

  var navKeys = ["home","markets","trade","positions","watchlist"];
  var navLabels = ["Home","Markets","Trade","Positions","Watchlist"];

  var data = {
    open: [
      { symbol:"BTC/USDT", coin:"btc", side:"Long", leverage:"10x", entry:"63.420,1", current:"63.995,2", pnl:"+575,10", pct:"+0,91%", direction:"positive" },
      { symbol:"ETH/USDT", coin:"eth", side:"Short", leverage:"5x", entry:"3.385,70", current:"3.348,22", pnl:"-187,40", pct:"-0,55%", direction:"negative" },
      { symbol:"SOL/USDT", coin:"sol", side:"Long", leverage:"5x", entry:"158,420", current:"161,870", pnl:"+172,50", pct:"+2,17%", direction:"positive" }
    ],
    pending: [
      { symbol:"BTC/USDT", coin:"btc", side:"Buy Limit", leverage:"10x", entry:"63.120,0", current:"Aguardando", pnl:"Pendente", pct:"TP/SL ativo", direction:"positive" },
      { symbol:"ETH/USDT", coin:"eth", side:"Sell Stop", leverage:"5x", entry:"3.310,00", current:"Aguardando", pnl:"Pendente", pct:"TP/SL ativo", direction:"negative" }
    ],
    history: [
      { symbol:"BTC/USDT", coin:"btc", side:"Long", leverage:"10x", entry:"62.900,2", current:"63.480,7", pnl:"+251,90", pct:"TP", direction:"positive" },
      { symbol:"SOL/USDT", coin:"sol", side:"Short", leverage:"5x", entry:"165,120", current:"167,300", pnl:"-84,20", pct:"SL", direction:"negative" }
    ]
  };

  function elById(id){ return document.getElementById(id); }

  function svgIcon(name){
    var icons = {
      home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
      markets: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V9"/><path d="M12 20V4"/><path d="M19 20v-7"/><path d="M16 13h6"/></svg>',
      trade: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
      positions: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16H6z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>',
      watchlist: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.7l2.5 5.1 5.6.8-4 3.9.95 5.5L12 16.4 7.05 19l.95-5.5-4-3.9 5.5-.8L12 3.7z"/></svg>'
    };
    return icons[name] || "";
  }

  function oldNavBtn(index){
    var btns = document.querySelectorAll(".bottomNav .navItem");
    return btns[index] || null;
  }

  function bridgeClick(el){
    if(!el) return false;
    try{ el.click(); return true; }catch(e){ return false; }
  }

  function syncTradeState(){
    var drawer = document.querySelector(".tradeDrawer");
    document.body.classList.toggle("dvl-trade-v2-open", !!(drawer && drawer.classList.contains("is-open")));
  }

  function closeTradeIfOpen(){
    var drawer = document.querySelector(".tradeDrawer");
    var oldTrade = elById("tradeNavBtn");
    if(drawer && drawer.classList.contains("is-open") && oldTrade){
      bridgeClick(oldTrade);
    }
    document.body.classList.remove("dvl-trade-v2-open");
  }

  function renderShell(){
    if(elById("dvlBottomNavV2")) return;

    var navHtml = "";
    for(var i=0; i<navKeys.length; i++){
      navHtml += '<button class="dvlNavV2Btn" type="button" data-dvl-nav-key="' + navKeys[i] + '" aria-label="' + navLabels[i] + '">' + svgIcon(navKeys[i]) + '<span>' + navLabels[i] + '</span></button>';
    }

    var nav = document.createElement("nav");
    nav.id = "dvlBottomNavV2";
    nav.setAttribute("data-dvl-ui","true");
    nav.setAttribute("aria-label","DVL bottom navigation v2");
    nav.innerHTML = navHtml;

    var homebar = document.createElement("div");
    homebar.id = "dvlBottomHomebarV2";

    var panel = document.createElement("section");
    panel.id = "dvlPositionsPanelV2";
    panel.setAttribute("data-dvl-ui","true");
    panel.setAttribute("aria-label","Positions panel");
    panel.innerHTML =
      '<div class="dvlPosV2Grip"></div>' +
      '<header class="dvlPosV2Head">' +
        '<h2 class="dvlPosV2Title">Positions</h2>' +
        '<div class="dvlPosV2Mode"><div class="dvlPosV2ModeToggle" id="dvlPosV2ModeToggle"></div></div>' +
      '</header>' +
      '<div class="dvlPosV2Tabs" id="dvlPosV2Tabs"></div>' +
      '<div class="dvlPosV2List" id="dvlPosV2List"></div>';

    document.body.appendChild(panel);
    document.body.appendChild(nav);
    document.body.appendChild(homebar);
    document.body.classList.add("dvl-positions-v2-active");

    renderAll();
    bindEvents();
  }

  function renderModes(){
    var modeToggle = elById("dvlPosV2ModeToggle");
    if(!modeToggle) return;
    var modes = ["demo","real"];
    var labels = ["Demo","Real"];
    var html = "";
    for(var i=0; i<modes.length; i++){
      html += '<button class="dvlPosV2ModeBtn' + (state.mode === modes[i] ? " is-active" : "") + '" type="button" data-dvl-mode="' + modes[i] + '">' + labels[i] + '</button>';
    }
    modeToggle.innerHTML = html;
    window.DVL_ACCOUNT_MODE = state.mode;
  }

  function renderTabs(){
    var holder = elById("dvlPosV2Tabs");
    if(!holder) return;
    var html = "";
    for(var i=0; i<tabKeys.length; i++){
      html += '<button class="dvlPosV2Tab' + (state.activeTab === tabKeys[i] ? " is-active" : "") + '" type="button" data-dvl-tab="' + tabKeys[i] + '">' + tabLabels[i] + '</button>';
    }
    holder.innerHTML = html;
  }

  function tokenGlyph(coin){
    if(coin === "btc") return "₿";
    if(coin === "eth") return "◆";
    return "";
  }

  function renderList(){
    var list = elById("dvlPosV2List");
    if(!list) return;
    var rows = data[state.activeTab] || [];
    if(!rows.length){
      list.innerHTML = '<div class="dvlPosV2Empty">Nenhum item nesta aba</div>';
      return;
    }
    var html = "";
    for(var i=0; i<rows.length; i++){
      var row = rows[i];
      var lower = String(row.side).toLowerCase();
      var sideClass = (lower.indexOf("short") !== -1 || lower.indexOf("sell") !== -1) ? "short" : "long";
      html +=
        '<article class="dvlPosV2Card" data-dvl-symbol="' + row.symbol + '">' +
          '<div class="dvlPosV2Token ' + row.coin + '">' + tokenGlyph(row.coin) + '</div>' +
          '<div class="dvlPosV2Pair">' +
            '<b>' + row.symbol + '</b>' +
            '<div class="dvlPosV2Tags">' +
              '<span class="dvlPosV2Tag ' + sideClass + '">' + row.side + '</span>' +
              '<span class="dvlPosV2Tag lev">' + row.leverage + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="dvlPosV2Col"><span>Entrada</span><b>' + row.entry + '</b></div>' +
          '<div class="dvlPosV2Col"><span>Preço atual</span><b>' + row.current + '</b></div>' +
          '<div class="dvlPosV2Pnl ' + row.direction + '">' +
            '<span>PnL (USDT)</span>' +
            '<b>' + row.pnl + '</b>' +
            '<small>' + row.pct + '</small>' +
          '</div>' +
          '<div class="dvlPosV2Next"></div>' +
        '</article>';
    }
    list.innerHTML = html;
  }

  function renderNav(){
    var btns = document.querySelectorAll(".dvlNavV2Btn");
    for(var i=0; i<btns.length; i++){
      var key = btns[i].getAttribute("data-dvl-nav-key");
      btns[i].classList.toggle("is-active", key === "positions" && state.panelOpen);
    }
    var panel = elById("dvlPositionsPanelV2");
    if(panel) panel.classList.toggle("is-open", !!state.panelOpen);
  }

  function renderAll(){
    renderModes();
    renderTabs();
    renderList();
    renderNav();
  }

  function bindEvents(){
    var nav = elById("dvlBottomNavV2");
    if(nav && !nav.dataset.bound){
      nav.dataset.bound = "1";
      nav.addEventListener("click", function(ev){
        var btn = ev.target.closest ? ev.target.closest("[data-dvl-nav-key]") : null;
        if(!btn) return;
        var key = btn.getAttribute("data-dvl-nav-key");

        if(key === "trade"){
          state.panelOpen = false;
          renderNav();
          bridgeClick(elById("tradeNavBtn"));
          syncTradeState();
          return;
        }
        if(key === "positions"){
          closeTradeIfOpen();
          state.panelOpen = !state.panelOpen;
          renderNav();
          return;
        }
        if(key === "watchlist"){
          closeTradeIfOpen();
          state.panelOpen = false;
          renderNav();
          bridgeClick(elById("assetsNavBtn")) || bridgeClick(oldNavBtn(4));
          return;
        }
        if(key === "home"){
          closeTradeIfOpen();
          state.panelOpen = false;
          renderNav();
          bridgeClick(oldNavBtn(0));
          return;
        }
        if(key === "markets"){
          closeTradeIfOpen();
          state.panelOpen = false;
          renderNav();
          bridgeClick(oldNavBtn(1));
        }
      });
    }

    var panel = elById("dvlPositionsPanelV2");
    if(panel && !panel.dataset.bound){
      panel.dataset.bound = "1";
      panel.addEventListener("click", function(ev){
        var modeBtn = ev.target.closest ? ev.target.closest("[data-dvl-mode]") : null;
        if(modeBtn){
          state.mode = modeBtn.getAttribute("data-dvl-mode");
          renderModes();
          return;
        }
        var tabBtn = ev.target.closest ? ev.target.closest("[data-dvl-tab]") : null;
        if(tabBtn){
          state.activeTab = tabBtn.getAttribute("data-dvl-tab");
          renderTabs();
          renderList();
        }
      });
    }
  }

  function updateOldLabels(){
    var assets = elById("assetsNavBtn");
    if(assets){
      var sp = assets.querySelector("span");
      if(sp) sp.textContent = "Watchlist";
      assets.setAttribute("aria-label","Watchlist");
    }
  }

  window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722 = {
    state: state,
    data: data,
    open: function(){ state.panelOpen = true; renderNav(); },
    close: function(){ state.panelOpen = false; renderNav(); },
    setMode: function(mode){ state.mode = mode === "real" ? "real" : "demo"; renderModes(); },
    setTab: function(tab){ state.activeTab = tab; renderTabs(); renderList(); }
  };

  updateOldLabels();
  renderShell();
})();
</script>

<script id="DVL_POSITION_DETAILS_PANEL_MODULE_0724">
(function(){
  "use strict";

  if(window.DVL_POSITION_DETAILS_PANEL_0724) return;

  var details = {
    "BTC/USDT": {
      coin:"btc", symbol:"BTC/USDT", side:"Long", leverage:"10x", mode:"Real",
      size:"0.089 BTC", margin:"571,20 USDT", entry:"63.420,10", current:"63.995,20",
      average:"63.420,10", liquidation:"61.284,80", tp:"64.420,00", sl:"62.910,00",
      pnl:"+575,10", pct:"+0,91%", fees:"-3,42 USDT", funding:"+0,18 USDT", net:"+571,86 USDT",
      direction:"long",
      timeline:[["15:10","Posição Long aberta"],["15:11","TP/SL criado 1:1"],["15:23","Preço tocou zona verde"],["15:33","PnL atualizado"]]
    },
    "ETH/USDT": {
      coin:"eth", symbol:"ETH/USDT", side:"Short", leverage:"5x", mode:"Real",
      size:"1.24 ETH", margin:"836,40 USDT", entry:"3.385,70", current:"3.348,22",
      average:"3.385,70", liquidation:"3.612,10", tp:"3.310,00", sl:"3.440,00",
      pnl:"-187,40", pct:"-0,55%", fees:"-2,15 USDT", funding:"-0,08 USDT", net:"-189,63 USDT",
      direction:"short",
      timeline:[["14:48","Ordem Short executada"],["14:49","SL confirmado"],["15:02","Preço retornou contra posição"],["15:33","PnL atualizado"]]
    },
    "SOL/USDT": {
      coin:"sol", symbol:"SOL/USDT", side:"Long", leverage:"5x", mode:"Real",
      size:"34.8 SOL", margin:"1.102,00 USDT", entry:"158,420", current:"161,870",
      average:"158,420", liquidation:"147,880", tp:"164,000", sl:"156,900",
      pnl:"+172,50", pct:"+2,17%", fees:"-1,76 USDT", funding:"+0,05 USDT", net:"+170,79 USDT",
      direction:"long",
      timeline:[["13:26","Long aberto em SOL"],["13:27","TP/SL criado"],["14:10","Preço rompeu topo local"],["15:33","PnL atualizado"]]
    }
  };

  function elById(id){ return document.getElementById(id); }

  function ensurePanel(){
    if(elById("dvlPositionDetailsV2")) return elById("dvlPositionDetailsV2");
    var panel = document.createElement("section");
    panel.id = "dvlPositionDetailsV2";
    panel.setAttribute("data-dvl-ui","true");
    panel.setAttribute("aria-label","Position details");
    document.body.appendChild(panel);
    return panel;
  }

  function coinGlyph(coin){
    if(coin === "btc") return "₿";
    if(coin === "eth") return "◆";
    return "";
  }

  function moneyClass(val){
    return String(val).trim().charAt(0) === "-" ? "red" : "green";
  }

  function closeDetails(){
    var panel = elById("dvlPositionDetailsV2");
    if(panel) panel.classList.remove("is-open");
    var cards = document.querySelectorAll(".dvlPosV2Card.is-detail-open");
    for(var i=0; i<cards.length; i++) cards[i].classList.remove("is-detail-open");
  }

  function renderDetails(symbol, sourceCard){
    var row = details[symbol] || details["BTC/USDT"];
    var panel = ensurePanel();

    var openCards = document.querySelectorAll(".dvlPosV2Card.is-detail-open");
    for(var i=0; i<openCards.length; i++) openCards[i].classList.remove("is-detail-open");
    if(sourceCard) sourceCard.classList.add("is-detail-open");

    var sideClass = row.direction === "short" ? "short" : "long";
    var pnlClass = moneyClass(row.pnl);

    var tl = "";
    for(var j=0; j<row.timeline.length; j++){
      tl += '<div class="dvlDetailV2Event"><time>' + row.timeline[j][0] + '</time><span>' + row.timeline[j][1] + '</span></div>';
    }

    panel.innerHTML =
      '<header class="dvlDetailV2Head">' +
        '<div class="dvlDetailV2TitleLine">' +
          '<div class="dvlDetailV2Coin ' + row.coin + '">' + coinGlyph(row.coin) + '</div>' +
          '<div class="dvlDetailV2TitleText">' +
            '<strong>' + row.symbol + '</strong>' +
            '<div class="dvlDetailV2Sub">' +
              '<span class="dvlDetailV2Badge ' + sideClass + '">' + row.side + '</span>' +
              '<span class="dvlDetailV2Badge lev">' + row.leverage + '</span>' +
              '<span>' + row.mode + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button class="dvlDetailV2Close" type="button" data-dvl-detail-close="true">×</button>' +
      '</header>' +
      '<div class="dvlDetailV2Body">' +
        '<div class="dvlDetailV2PnlHero">' +
          '<div><span>Resultado líquido</span><strong class="' + pnlClass + '">' + row.net + '</strong></div>' +
          '<small>' + row.pnl + '<br>' + row.pct + '</small>' +
        '</div>' +
        '<div class="dvlDetailV2Grid">' +
          '<div class="dvlDetailV2Cell"><span>Tamanho</span><b>' + row.size + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Margem usada</span><b>' + row.margin + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Entrada</span><b>' + row.entry + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Preço atual</span><b>' + row.current + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Preço médio</span><b>' + row.average + '</b></div>' +
          '<div class="dvlDetailV2Cell red"><span>Liquidação</span><b>' + row.liquidation + '</b></div>' +
          '<div class="dvlDetailV2Cell green"><span>Take Profit</span><b>' + row.tp + '</b></div>' +
          '<div class="dvlDetailV2Cell red"><span>Stop Loss</span><b>' + row.sl + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Fees</span><b>' + row.fees + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Funding</span><b>' + row.funding + '</b></div>' +
        '</div>' +
        '<div class="dvlDetailV2SectionTitle">Gestão rápida</div>' +
        '<div class="dvlDetailV2Actions">' +
          '<button class="dvlDetailV2Action primary" type="button">Ver no gráfico</button>' +
          '<button class="dvlDetailV2Action primary" type="button">Mover TP/SL</button>' +
          '<button class="dvlDetailV2Action" type="button">Fechar parcial</button>' +
          '<button class="dvlDetailV2Action danger" type="button">Fechar posição</button>' +
        '</div>' +
        '<div class="dvlDetailV2SectionTitle">Timeline</div>' +
        '<div class="dvlDetailV2Timeline">' + tl + '</div>' +
      '</div>';

    panel.classList.add("is-open");
  }

  document.addEventListener("click", function(ev){
    var closeBtn = ev.target.closest ? ev.target.closest("[data-dvl-detail-close]") : null;
    if(closeBtn){ closeDetails(); return; }

    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;
    if(card){ renderDetails(card.getAttribute("data-dvl-symbol") || "BTC/USDT", card); return; }

    var panel = elById("dvlPositionDetailsV2");
    if(panel && panel.classList.contains("is-open")){
      var inDetails = ev.target.closest ? ev.target.closest("#dvlPositionDetailsV2") : null;
      var inPositions = ev.target.closest ? ev.target.closest("#dvlPositionsPanelV2") : null;
      var inNav = ev.target.closest ? ev.target.closest("#dvlBottomNavV2") : null;
      if(!inDetails && !inPositions && !inNav) closeDetails();
    }
  }, true);

  window.DVL_POSITION_DETAILS_PANEL_0724 = {
    open: renderDetails,
    close: closeDetails,
    data: details
  };
})();
</script>
"""

html = rep(html,
    '\n</body>\n</html>',
    '\n' + POSITIONS_BLOCKS + '</body>\n</html>',
    "insert Positions+Details blocks before </body>")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
