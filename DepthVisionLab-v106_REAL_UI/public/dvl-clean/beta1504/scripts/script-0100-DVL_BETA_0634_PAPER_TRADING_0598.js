/*
DVL PAPER TRADING SCRIPT-ONLY — VERSION 0.598

Implementação aprovada:
- Trade button opens/closes Paper Trading panel.
- Market/Limit order type.
- Pending Limit shows Long Limit / Short Limit only.
- Pending Limit does not show confirm/cancel when edited.
- Active ENTRY is locked and cannot move.
- Active TP/SL can be dragged repeatedly before confirm/cancel.
- TP auto-closes when touched after order is active/open.
- SL is manual and never auto-closes.
- TP auto-close is paused while TP/SL is being dragged or awaiting confirm/cancel.
- Confirm/cancel follows drag live, then freezes after release.
- Cancel restores original value from before the first edit.
- Multiple positions are supported through runtime state.

Expected host HTML:
- chart wrapper should be #chartWrap or .canvas-wrap/.chart-wrap/.chart-area.
- Trade footer/button can be #bottomTradeBtn, [data-tab="trade"], .bottom-nav .trade, or a button containing "Trade".
- Runtime reads price from ticker.lastPrice or S.candles last close.
- Runtime uses appSymbol/currentSymbol/selectedSymbol/S.symbol when available.

Do not rework this logic unless the user explicitly requests it.
*/

/* DVL Paper Trading 0.598 — script-only integration package */
(function(){
  "use strict";

  function injectStyle(id, css){
    if(document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  injectStyle("DVL_PAPER_TRADING_RUNTIME_0581_CSS", "/* DVL Beta 0.598 \u2014 Paper Trading runtime, no layout format changes */\n.bottomNav{\n  z-index:100000!important;\n  pointer-events:auto!important;\n}\n\n#tradeNavBtn,\n#tradeNavBtn *{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  -webkit-tap-highlight-color:transparent!important;\n}\n\n.tradeDrawer{\n  z-index:99980!important;\n}\n\n.tradeDrawer.is-open{\n  pointer-events:auto!important;\n}\n\n.tradeDrawer.is-open .tradeDrawerSheet{\n  transform:translateY(0)!important;\n}\n\n.tradeAction{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  -webkit-tap-highlight-color:transparent!important;\n}\n\n.dvl-paper-layer{\n  position:absolute!important;\n  inset:0!important;\n  z-index:17!important;\n  pointer-events:none!important;\n  overflow:hidden!important;\n}\n\n.dvl-paper-line{\n  position:absolute!important;\n  left:0!important;\n  right:55px!important;\n  height:0!important;\n  border-top:1.4px solid rgba(255,255,255,.65)!important;\n  pointer-events:none!important;\n}\n\n.dvl-paper-line.tp{\n  border-color:rgba(19,220,141,.92)!important;\n}\n\n.dvl-paper-line.entry{\n  border-color:rgba(235,245,255,.82)!important;\n  border-top-style:dashed!important;\n}\n\n.dvl-paper-line.sl{\n  border-color:rgba(255,74,97,.92)!important;\n}\n\n.dvl-paper-tag{\n  position:absolute!important;\n  right:57px!important;\n  min-width:72px!important;\n  max-width:128px!important;\n  height:17px!important;\n  padding:0 6px!important;\n  border-radius:999px!important;\n  display:flex!important;\n  align-items:center!important;\n  justify-content:center!important;\n  white-space:nowrap!important;\n  overflow:hidden!important;\n  text-overflow:ellipsis!important;\n  font-size:8px!important;\n  line-height:1!important;\n  font-weight:950!important;\n  letter-spacing:.01em!important;\n  pointer-events:auto!important;\n  color:#061018!important;\n  box-shadow:0 8px 18px rgba(0,0,0,.22)!important;\n}\n\n.dvl-paper-tag.tp{\n  background:#13dc8d!important;\n}\n\n.dvl-paper-tag.entry{\n  color:#eaf7ff!important;\n  background:rgba(5,14,26,.94)!important;\n  border:1px solid rgba(245,249,255,.32)!important;\n}\n\n.dvl-paper-tag.sl{\n  background:#ff4a61!important;\n}\n\n.dvl-paper-tag .x{\n  margin-left:5px!important;\n  opacity:.72!important;\n  font-size:9px!important;\n}\n\n.dvl-paper-pending{\n  position:absolute!important;\n  right:57px!important;\n  transform:translateY(-50%)!important;\n  display:flex!important;\n  gap:4px!important;\n  pointer-events:auto!important;\n  z-index:19!important;\n}\n\n.dvl-paper-confirm{\n  min-width:22px!important;\n  height:18px!important;\n  border-radius:8px!important;\n  border:1px solid rgba(24,215,255,.28)!important;\n  background:rgba(4,13,24,.94)!important;\n  color:#dff8ff!important;\n  font-size:8px!important;\n  font-weight:950!important;\n  display:grid!important;\n  place-items:center!important;\n  box-shadow:0 8px 20px rgba(0,0,0,.28)!important;\n}\n\n.dvl-paper-confirm.ok{\n  color:#05150e!important;\n  background:#13dc8d!important;\n}\n\n.dvl-paper-confirm.cancel{\n  color:#fff!important;\n  background:#ff4a61!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0582_EDITABLE_LABELS_CSS", "/* DVL Beta 0.598 \u2014 editable Paper Trading labels and unlimited drag */\n.dvl-paper-line{\n  right:54px!important;\n  border-top-width:2px!important;\n}\n\n.dvl-paper-line.entry.pending{\n  border-top-style:dashed!important;\n  border-color:rgba(255,255,255,.78)!important;\n}\n\n.dvl-paper-hit{\n  position:absolute!important;\n  left:0!important;\n  right:54px!important;\n  height:24px!important;\n  margin-top:-12px!important;\n  pointer-events:auto!important;\n  touch-action:none!important;\n  background:transparent!important;\n  cursor:ns-resize!important;\n  z-index:18!important;\n}\n\n.dvl-paper-tag{\n  right:56px!important;\n  min-width:142px!important;\n  max-width:202px!important;\n  height:auto!important;\n  min-height:38px!important;\n  padding:6px 10px!important;\n  border-radius:12px!important;\n  justify-content:flex-start!important;\n  cursor:ns-resize!important;\n  touch-action:none!important;\n  user-select:none!important;\n  -webkit-user-select:none!important;\n}\n\n.dvl-paper-tag .txt{\n  display:flex!important;\n  flex-direction:column!important;\n  align-items:flex-start!important;\n  justify-content:center!important;\n  gap:3px!important;\n  min-width:0!important;\n  flex:1 1 auto!important;\n}\n\n.dvl-paper-tag .main{\n  display:block!important;\n  max-width:100%!important;\n  overflow:hidden!important;\n  text-overflow:ellipsis!important;\n  white-space:nowrap!important;\n  font-size:9px!important;\n  line-height:12px!important;\n  font-weight:1000!important;\n}\n\n.dvl-paper-tag .pct{\n  display:block!important;\n  max-width:100%!important;\n  overflow:hidden!important;\n  text-overflow:ellipsis!important;\n  white-space:nowrap!important;\n  font-size:9px!important;\n  line-height:10px!important;\n  font-weight:900!important;\n  opacity:.86!important;\n}\n\n.dvl-paper-tag .kind,\n.dvl-paper-tag .val{\n  display:none!important;\n}\n\n.dvl-paper-tag.tp{\n  color:#ebfff4!important;\n  background:linear-gradient(180deg,rgba(13,63,40,.98),rgba(8,45,29,.98))!important;\n  border:2px solid rgba(19,220,141,.88)!important;\n}\n\n.dvl-paper-tag.entry{\n  color:#f1f8ff!important;\n  background:linear-gradient(180deg,rgba(13,25,56,.98),rgba(7,15,39,.98))!important;\n  border:2px solid rgba(96,188,255,.76)!important;\n}\n\n.dvl-paper-tag.entry.pending{\n  background:linear-gradient(180deg,rgba(20,24,42,.98),rgba(9,13,28,.98))!important;\n  border-color:rgba(255,255,255,.62)!important;\n}\n\n.dvl-paper-tag.sl{\n  color:#fff3f3!important;\n  background:linear-gradient(180deg,rgba(72,20,28,.98),rgba(48,13,19,.98))!important;\n  border:2px solid rgba(255,74,97,.88)!important;\n}\n\n.dvl-paper-tag .x{\n  flex:0 0 auto!important;\n  margin-left:auto!important;\n  width:22px!important;\n  height:22px!important;\n  border-radius:8px!important;\n  display:grid!important;\n  place-items:center!important;\n  color:#ffb077!important;\n  background:rgba(255,140,70,.12)!important;\n  border:1px solid rgba(255,140,70,.35)!important;\n  font-size:12px!important;\n  font-weight:1000!important;\n  line-height:1!important;\n  opacity:1!important;\n}\n\n.dvl-paper-pending-controls{\n  position:absolute!important;\n  right:56px!important;\n  transform:translateY(-50%)!important;\n  display:flex!important;\n  gap:4px!important;\n  pointer-events:auto!important;\n  z-index:20!important;\n}\n\n.dvl-paper-dragging,\n.dvl-paper-dragging *{\n  cursor:ns-resize!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0583_COMPACT_CONFIRM_CSS", "/* DVL Beta 0.598 \u2014 compact labels + dropdown/close/confirm fixes */\n.orderTypeWrap{\n  z-index:100010!important;\n}\n\n.orderTypeWrap.is-open .orderTypeMenu,\n#orderTypeWrap.is-open #orderTypeMenu{\n  display:grid!important;\n  opacity:1!important;\n  visibility:visible!important;\n  pointer-events:auto!important;\n  z-index:100250!important;\n}\n\n.orderTypeMenu{\n  z-index:100250!important;\n}\n\n#panelCloseX,\n#closeTradeDrawer,\n#panelCloseX *,\n#closeTradeDrawer *{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n}\n\n.dvl-paper-tag{\n  right:56px!important;\n  min-width:auto!important;\n  width:max-content!important;\n  max-width:154px!important;\n  min-height:25px!important;\n  height:auto!important;\n  padding:3px 6px!important;\n  border-radius:9px!important;\n  gap:4px!important;\n  box-shadow:0 8px 16px rgba(0,0,0,.24)!important;\n}\n\n.dvl-paper-tag .txt{\n  gap:1px!important;\n}\n\n.dvl-paper-tag .main{\n  font-size:9px!important;\n  line-height:10px!important;\n  letter-spacing:0!important;\n}\n\n.dvl-paper-tag .pct{\n  font-size:7px!important;\n  line-height:8px!important;\n  letter-spacing:0!important;\n  opacity:.84!important;\n}\n\n.dvl-paper-tag .x{\n  width:12px!important;\n  height:12px!important;\n  border-radius:6px!important;\n  margin-left:4px!important;\n  font-size:8px!important;\n}\n\n.dvl-paper-line{\n  border-top-width:1.6px!important;\n}\n\n.dvl-paper-hit{\n  height:20px!important;\n  margin-top:-10px!important;\n}\n\n.dvl-paper-pending-controls,\n.dvl-paper-edit-confirm{\n  position:absolute!important;\n  right:56px!important;\n  transform:translateY(-50%)!important;\n  display:flex!important;\n  gap:4px!important;\n  pointer-events:auto!important;\n  z-index:30!important;\n}\n\n.dvl-paper-confirm{\n  min-width:22px!important;\n  width:22px!important;\n  height:20px!important;\n  border-radius:7px!important;\n  font-size:8px!important;\n  padding:0!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0584_CLOSE_X_CSS", "/* DVL Beta 0.598 \u2014 ENTRY close X touch/click fix */\n.dvl-paper-tag .x,\n.dvl-paper-tag [data-remove=\"1\"]{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  cursor:pointer!important;\n  z-index:35!important;\n  position:relative!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0585_ALWAYS_CONFIRM_CSS", "/* DVL Beta 0.598 \u2014 confirm/cancel always visible after TP/SL/ENTRY drag */\n.dvl-paper-edit-confirm{\n  z-index:60!important;\n  pointer-events:auto!important;\n}\n\n.dvl-paper-edit-confirm .dvl-paper-confirm{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  box-shadow:0 8px 22px rgba(0,0,0,.34)!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0586_CONFIRM_UNDER_LABEL_CSS", "/* DVL Beta 0.598 \u2014 confirmation controls below moved labels */\n.dvl-paper-edit-confirm{\n  position:absolute!important;\n  right:56px!important;\n  transform:none!important;\n  display:flex!important;\n  align-items:center!important;\n  justify-content:flex-end!important;\n  gap:4px!important;\n  pointer-events:auto!important;\n  z-index:80!important;\n  min-width:auto!important;\n  width:auto!important;\n}\n\n.dvl-paper-edit-confirm .dvl-paper-confirm{\n  min-width:22px!important;\n  width:22px!important;\n  height:20px!important;\n  border-radius:7px!important;\n  font-size:8px!important;\n  padding:0!important;\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  box-shadow:0 8px 22px rgba(0,0,0,.34)!important;\n}\n\n.dvl-paper-edit-confirm[data-handle=\"tp\"]{\n  margin-top:1px!important;\n}\n\n.dvl-paper-edit-confirm[data-handle=\"entry\"]{\n  margin-top:1px!important;\n}\n\n.dvl-paper-edit-confirm[data-handle=\"sl\"]{\n  margin-top:1px!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0587_PERSIST_CONFIRM_CSS", "/* DVL Beta 0.598 \u2014 persistent confirm/cancel below moved label */\n.dvl-paper-edit-confirm{\n  position:absolute!important;\n  right:56px!important;\n  transform:none!important;\n  display:flex!important;\n  align-items:center!important;\n  justify-content:flex-end!important;\n  gap:4px!important;\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  z-index:120!important;\n  min-width:auto!important;\n  width:auto!important;\n}\n\n.dvl-paper-edit-confirm .dvl-paper-confirm{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  min-width:22px!important;\n  width:22px!important;\n  height:20px!important;\n  border-radius:7px!important;\n  font-size:8px!important;\n  padding:0!important;\n  box-shadow:0 8px 22px rgba(0,0,0,.34)!important;\n}\n\n.dvl-paper-layer{\n  overflow:visible!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0588_INSTANT_CONFIRM_CSS", ".dvl-paper-edit-confirm{\n  z-index:140!important;\n  pointer-events:auto!important;\n}\n.dvl-paper-edit-confirm .dvl-paper-confirm{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0589_PENDING_LIMIT_LABEL_CSS", ".dvl-paper-tag.entry.pending .pct:empty{\n  display:none!important;\n}\n.dvl-paper-tag.entry.pending{\n  min-height:24px!important;\n  padding-top:4px!important;\n  padding-bottom:4px!important;\n}\n.dvl-paper-tag.entry.pending .main{\n  font-size:8px!important;\n  line-height:11px!important;\n  text-transform:none!important;\n}\n.dvl-paper-pending-controls{\n  display:none!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0590_FIXED_CONFIRM_PORTAL_CSS", "/* DVL Beta 0.598 \u2014 confirm/cancel detached from chart movement */\n.dvl-paper-edit-confirm-fixed{\n  position:fixed!important;\n  transform:none!important;\n  display:flex!important;\n  align-items:center!important;\n  justify-content:flex-end!important;\n  gap:4px!important;\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  z-index:999999!important;\n  min-width:auto!important;\n  width:auto!important;\n}\n\n.dvl-paper-edit-confirm-fixed .dvl-paper-confirm{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  min-width:22px!important;\n  width:22px!important;\n  height:20px!important;\n  border-radius:7px!important;\n  font-size:8px!important;\n  padding:0!important;\n  box-shadow:0 8px 22px rgba(0,0,0,.34)!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0591_FIXED_EDIT_LABEL_CSS", "/* DVL Beta 0.598 \u2014 edited label also detached from chart movement */\n.dvl-paper-edit-label-fixed{\n  position:fixed!important;\n  transform:none!important;\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n  z-index:999998!important;\n  right:auto;\n}\n\n.dvl-paper-edit-label-fixed .x,\n.dvl-paper-edit-label-fixed [data-remove=\"1\"]{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0592_TPSL_CLOSE_FIXED_LABEL_CSS", "/* DVL Beta 0.598 \u2014 TP/SL hit close + edit portals detached from chart movement */\n.dvl-paper-edit-label-fixed,\n.dvl-paper-edit-confirm-fixed{\n  position:fixed!important;\n  transform:none!important;\n  z-index:999998!important;\n  will-change:auto!important;\n}\n\n.dvl-paper-edit-confirm-fixed{\n  z-index:999999!important;\n}\n\n.dvl-paper-edit-label-fixed{\n  pointer-events:auto!important;\n}\n\n.dvl-paper-edit-confirm-fixed,\n.dvl-paper-edit-confirm-fixed *{\n  pointer-events:auto!important;\n  touch-action:manipulation!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0593_TP_ONLY_CLOSE_CSS", "/* DVL Beta 0.598 \u2014 TP auto close active, SL remains manual */");
  injectStyle("DVL_PAPER_TRADING_0594_PENDING_NO_CONFIRM_CSS", "/* DVL Beta 0.598 \u2014 pending Limit orders do not show confirm/cancel after edits */\n.dvl-paper-tag.entry.pending + .dvl-paper-edit-confirm,\n.dvl-paper-pending-controls{\n  display:none!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0595_TP_EDIT_LOCK_CSS", "/* DVL Beta 0.598 \u2014 TP cannot close while ENTRY/TP/SL is in edit mode */");
  injectStyle("DVL_PAPER_TRADING_0596_ENTRY_LOCK_CSS", "/* DVL Beta 0.598 \u2014 active/open ENTRY is locked, only pending Limit ENTRY can move */\n.dvl-paper-tag.entry:not(.pending){\n  cursor:default!important;\n}\n\n.dvl-paper-line.entry:not(.pending){\n  cursor:default!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0597_EDIT_LABEL_FOLLOW_DRAG_CSS", "/* DVL Beta 0.598 \u2014 fixed edit label follows TP/SL live while dragging, then freezes after release */\n.dvl-paper-edit-label-fixed,\n.dvl-paper-edit-confirm-fixed{\n  will-change:top,right!important;\n}");
  injectStyle("DVL_PAPER_TRADING_0598_REPEAT_DRAG_BEFORE_CONFIRM_CSS", "/* DVL Beta 0.598 \u2014 TP/SL can keep moving while confirm/cancel is pending */\n.dvl-paper-edit-label-fixed.tp,\n.dvl-paper-edit-label-fixed.sl{\n  pointer-events:auto!important;\n  touch-action:none!important;\n}\n\n.dvl-paper-edit-label-fixed.tp .txt,\n.dvl-paper-edit-label-fixed.sl .txt{\n  pointer-events:none!important;\n}");
})();

/* ===== DVL_PAPER_TRADING_RUNTIME_0581 ===== */
(function(){
  "use strict";

  function ready(fn){
    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", fn, {once:true});
    }else{
      fn();
    }
  }

  ready(function(){
    if(window.__dvlPaperRuntime0581 && window.__dvlPaperRuntime0581.ready) return;

    const $ = (id) => document.getElementById(id);
    const qsa = (sel) => Array.from(document.querySelectorAll(sel));

    const dom = {
      wrap: $("chartWrap") || document.querySelector(".canvasWrap"),
      drawer: $("tradeDrawer"),
      tradeBtn: $("tradeNavBtn"),
      closeBtn: $("closeTradeDrawer"),
      closeX: $("panelCloseX"),
      buyBtn: document.querySelector(".tradeAction.buy"),
      sellBtn: document.querySelector(".tradeAction.sell"),
      buyLabel: $("buyPriceBtn"),
      sellLabel: $("sellPriceBtn"),
      orderWrap: $("orderTypeWrap"),
      orderBtn: $("orderTypeBtn"),
      orderLabel: $("orderTypeLabel"),
      orderMenu: $("orderTypeMenu"),
      orderOptions: qsa(".orderTypeOption"),
      isoBtn: $("isolatedModeBtn"),
      crossBtn: $("crossModeBtn"),
      entryCard: $("entryEditCard"),
      entryValue: $("entryValue"),
      entrySub: $("entrySub"),
      pad: $("entryPadOverlay"),
      padDisplay: $("entryPadDisplay"),
      padClose: $("entryPadClose"),
      padClear: $("entryPadClear"),
      padOk: $("entryPadOk"),
      padKeys: qsa(".numberPadGrid [data-key]"),
      levCard: $("levDragCard"),
      levSlider: $("levSlider"),
      levFill: $("levSliderFill"),
      levKnob: $("levKnob"),
      levValue: $("levValue"),
      levNotional: $("levNotional"),
      liqBtn: $("liqToggleBtn"),
      liqText: $("liqToggleText"),
      longLiq: $("longLiq"),
      shortLiq: $("shortLiq"),
      toast: $("toast")
    };

    if(!dom.drawer || !dom.tradeBtn || !dom.wrap){
      console.warn("[DVL 0.581 Paper] missing base DOM");
      return;
    }

    if(getComputedStyle(dom.wrap).position === "static"){
      dom.wrap.style.position = "relative";
    }

    let layer = $("dvlPaperLayer");
    if(!layer){
      layer = document.createElement("div");
      layer.id = "dvlPaperLayer";
      layer.className = "dvl-paper-layer";
      dom.wrap.appendChild(layer);
    }

    const state = {
      orderType: "Limit",
      marginMode: "isolated",
      entryAmount: 100,
      leverage: 112,
      padDraft: "100",
      liqOn: true,
      positions: [],
      pending: null,
      pendingDraft: null,
      draftDrag: null
    };

    function appSymbol(){
      try{ if(typeof symbol !== "undefined") return String(symbol || "BTCUSDT"); }catch(_){}
      try{ if(window.S && S.sym) return String(S.sym || "BTCUSDT"); }catch(_){}
      return "BTCUSDT";
    }

    function key(){
      return "dvl_paper_runtime_0581_" + appSymbol();
    }

    function save(){
      try{
        localStorage.setItem(key(), JSON.stringify(state.positions.slice(-40)));
      }catch(_){}
    }

    function load(){
      try{
        const raw = JSON.parse(localStorage.getItem(key()) || "[]");
        state.positions = Array.isArray(raw) ? raw.filter(Boolean) : [];
      }catch(_){
        state.positions = [];
      }
    }

    function clamp(v,a,b){
      v = Number(v);
      if(!Number.isFinite(v)) v = a;
      return Math.max(a, Math.min(b, v));
    }

    function fmt(v){
      v = Number(v);
      if(!Number.isFinite(v)) return "--";
      return v.toLocaleString("en-US", {
        minimumFractionDigits: v >= 1000 ? 2 : 3,
        maximumFractionDigits: v >= 1000 ? 2 : 4
      });
    }

    function money(v){
      v = Number(v);
      if(!Number.isFinite(v)) v = 0;
      const sign = v > 0 ? "+" : v < 0 ? "-" : "";
      return sign + Math.abs(v).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function toast(msg){
      try{
        if(typeof showToast === "function"){
          showToast(msg);
          return;
        }
      }catch(_){}

      if(dom.toast){
        dom.toast.textContent = msg;
        dom.toast.classList.add("show");
        clearTimeout(toast.t);
        toast.t = setTimeout(() => dom.toast.classList.remove("show"), 1800);
      }
    }

    function drawSoonSafe(){
      try{
        if(typeof drawSoon === "function"){
          drawSoon();
          return;
        }
      }catch(_){}
      requestAnimationFrame(render);
    }

    function lastPrice(){
      try{
        if(typeof ticker !== "undefined" && ticker && Number(ticker.lastPrice) > 0) return Number(ticker.lastPrice);
      }catch(_){}
      try{
        if(window.S && Array.isArray(S.candles) && S.candles.length){
          const c = Number(S.candles[S.candles.length - 1].close || S.candles[S.candles.length - 1].c);
          if(Number.isFinite(c) && c > 0) return c;
        }
      }catch(_){}
      return 0;
    }

    function lastCandleInfo(){
      try{
        if(window.S && Array.isArray(S.candles) && S.candles.length){
          const c = S.candles[S.candles.length - 1];
          return {
            time: Number(c.time || c.t || 0),
            high: Number(c.high || c.h || 0),
            low: Number(c.low || c.l || 0),
            close: Number(c.close || c.c || 0)
          };
        }
      }catch(_){}

      try{
        if(typeof klines !== "undefined" && Array.isArray(klines) && klines.length){
          const k = klines[klines.length - 1];
          return {
            time: Number(k.time || k.t || 0),
            high: Number(k.high || k.h || 0),
            low: Number(k.low || k.l || 0),
            close: Number(k.close || k.c || 0)
          };
        }
      }catch(_){}

      return null;
    }

    function scaleInfo(){
      const wrap = dom.wrap;
      if(!wrap) return null;

      try{ if(typeof __dvlSyncLegacyState === "function") __dvlSyncLegacyState(); }catch(_){}

      const W = wrap.clientWidth || 1;
      const H = wrap.clientHeight || 1;

      let sc = null;
      try{
        if(typeof visible === "function" && typeof scale === "function"){
          sc = scale(visible().cs, H);
        }
      }catch(_){}

      if(!sc || typeof sc.y !== "function") return null;

      let top = 4;
      let bottom = H - 24;
      try{
        if(typeof __dvlLegacyPriceArea === "function"){
          const a = __dvlLegacyPriceArea(H);
          top = a.y0;
          bottom = a.y1;
        }
      }catch(_){}

      let rightPad = 55;
      try{
        if(typeof RP === "function") rightPad = RP();
      }catch(_){}

      function pY(y){
        try{
          if(typeof priceFromY === "function"){
            const px = priceFromY(y, H, sc);
            if(Number.isFinite(px)) return px;
          }
        }catch(_){}
        const hh = Math.max(1, bottom - top);
        return sc.lo + (1 - (Number(y) - top) / hh) * (sc.hi - sc.lo);
      }

      return {W,H,top,bottom,right:W-rightPad,sc,pY};
    }

    function yPrice(price){
      const si = scaleInfo();
      if(!si) return null;
      const y = si.sc.y(Number(price));
      if(!Number.isFinite(y) || y < si.top - 30 || y > si.bottom + 30) return null;
      return {y, si};
    }

    function qtyFor(entry){
      const notional = Number(state.entryAmount) * Number(state.leverage);
      return entry > 0 ? notional / entry : 0;
    }

    function pnl(pos, price){
      const q = Number(pos.qty) || 0;
      const entry = Number(pos.entry) || 0;
      price = Number(price) || 0;
      return pos.side === "buy" ? (price - entry) * q : (entry - price) * q;
    }

    function fmtPct(v){
      v = Number(v);
      if(!Number.isFinite(v)) v = 0;
      const sign = v > 0 ? "+" : v < 0 ? "-" : "";
      return sign + Math.abs(v).toFixed(2) + "%";
    }

    function pnlPct(pos, price){
      const entry = Number(pos.entry) || 0;
      price = Number(price) || 0;
      if(!(entry > 0) || !(price > 0)) return 0;
      return pos.side === "buy" ? ((price - entry) / entry) * 100 : ((entry - price) / entry) * 100;
    }

    function makeLine(pos, handle, y){
      const visual = document.createElement("div");
      const pendingClass = handle === "entry" && pos.status === "pending" ? " pending" : "";
      visual.className = "dvl-paper-line " + handle + pendingClass;
      visual.style.top = y.toFixed(1) + "px";
      layer.appendChild(visual);

      const canDragHandle = handle !== "entry" || pos.status === "pending";
      if(!canDragHandle) return;

      const hit = document.createElement("div");
      hit.className = "dvl-paper-hit " + handle;
      hit.style.top = y.toFixed(1) + "px";
      hit.dataset.id = pos.id;
      hit.dataset.handle = handle;
      hit.addEventListener("pointerdown", function(ev){
        startPaperDrag(ev, pos.id, handle);
      }, {passive:false});
      layer.appendChild(hit);
    }

    function makeTag(pos, handle, y, main, pct){
      if(state.editConfirm && String(state.editConfirm.id) === String(pos.id) && state.editConfirm.handle === handle){
        return;
      }

      const el = document.createElement("div");
      const pendingClass = handle === "entry" && pos.status === "pending" ? " pending" : "";
      el.className = "dvl-paper-tag " + handle + pendingClass;
      el.style.top = orderTagTopFromLineY(y).toFixed(1) + "px";
      el.dataset.id = pos.id;
      el.dataset.handle = handle;
      el.innerHTML =
        '<span class="txt">' +
          '<span class="main">' + main + '</span>' +
          '<span class="pct">' + pct + '</span>' +
        '</span>' +
        (handle === "entry" && pos.status !== "pending" ? '<span class="x" data-remove="1">×</span>' : "");
      el.addEventListener("pointerdown", function(ev){
        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1") return;

        const canDragHandle = handle !== "entry" || pos.status === "pending";
        if(!canDragHandle) return;

        startPaperDrag(ev, pos.id, handle);
      }, {passive:false});
      el.addEventListener("click", function(ev){
        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){
          ev.preventDefault();
          ev.stopPropagation();
          if(pos.status === "pending"){
            cancelPendingOrder(pos.id);
          }else{
            removePosition(pos.id);
          }
        }
      });
      layer.appendChild(el);
    }

    function maybeTriggerPending(pos){
      if(!pos || pos.status !== "pending") return false;
      if(state.drag || window.__dvlPaperDragging || window.__dvlPositionDragActive) return false;
      if(state.editConfirm && String(state.editConfirm.id) === String(pos.id)) return false;

      const live = lastPrice();
      if(!(live > 0)) return false;

      const entry = Number(pos.entry);
      if(!(entry > 0)) return false;

      const hit = pos.side === "buy" ? live <= entry : live >= entry;
      if(!hit) return false;

      pos.status = "open";
      pos.triggeredAt = Date.now();
      const liveAtTrigger = lastPrice();
      if(liveAtTrigger > 0){
        pos.highSeen = liveAtTrigger;
        pos.lowSeen = liveAtTrigger;
      }else{
        pos.highSeen = Number(pos.entry);
        pos.lowSeen = Number(pos.entry);
      }
      save();
      return true;
    }

    function closePositionByHit(pos, reason, price){
      if(!pos || !pos.id) return false;

      state.positions = state.positions.filter(function(p){
        return String(p.id) !== String(pos.id);
      });

      state.editConfirm = null;
      document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){
        el.remove();
      });

      save();

      try{
        window.dispatchEvent(new CustomEvent("dvl:paper-position-closed", {
          detail: {
            id: pos.id,
            reason: reason,
            price: price,
            symbol: pos.symbol || appSymbol(),
            side: pos.side,
            entry: pos.entry,
            tp: pos.tp,
            sl: pos.sl,
            pnl: pnl(pos, price),
            pct: pnlPct(pos, price),
            closedAt: Date.now()
          }
        }));
      }catch(_){}

      toast("TP fechado");
      return true;
    }

    function resetTpTracking(pos){
      if(!pos) return;

      const live = lastPrice();
      if(live > 0){
        pos.highSeen = live;
        pos.lowSeen = live;
      }else{
        pos.highSeen = Number(pos.entry) || Number(pos.tp) || 0;
        pos.lowSeen = Number(pos.entry) || Number(pos.tp) || 0;
      }

      pos.tpTrackingResetAt = Date.now();
    }

    function maybeCloseByTpSl(pos){
      /*
        TP is automatic ONLY when the trade is not being edited.
        SL is manual by design: touching SL does NOT close the trade.
      */
      if(!pos || pos.status !== "open") return false;

      if(state.drag && String(state.drag.id) === String(pos.id)) return false;
      if(state.editConfirm && String(state.editConfirm.id) === String(pos.id)) return false;

      const live = lastPrice();
      if(!(live > 0)) return false;

      const tp = Number(pos.tp);
      if(!(tp > 0)) return false;

      const activatedAt = Number(pos.triggeredAt || pos.createdAt || 0);

      if(!Number.isFinite(Number(pos.highSeen)) || !(Number(pos.highSeen) > 0)) pos.highSeen = live;
      if(!Number.isFinite(Number(pos.lowSeen)) || !(Number(pos.lowSeen) > 0)) pos.lowSeen = live;

      pos.highSeen = Math.max(Number(pos.highSeen), live);
      pos.lowSeen = Math.min(Number(pos.lowSeen), live);

      const candle = lastCandleInfo();
      if(candle && Number.isFinite(candle.time) && candle.time >= activatedAt){
        if(Number.isFinite(candle.high) && candle.high > 0) pos.highSeen = Math.max(Number(pos.highSeen), candle.high);
        if(Number.isFinite(candle.low) && candle.low > 0) pos.lowSeen = Math.min(Number(pos.lowSeen), candle.low);
      }

      const tpTouched = pos.side === "buy" ? Number(pos.highSeen) >= tp : Number(pos.lowSeen) <= tp;
      if(tpTouched){
        return closePositionByHit(pos, "tp", tp);
      }

      return false;
    }

    function renderPosition(pos){
      maybeTriggerPending(pos);
      if(maybeCloseByTpSl(pos)) return;
      const entryY = yPrice(pos.entry);
      const tpY = yPrice(pos.tp);
      const slY = yPrice(pos.sl);
      if(!entryY && !tpY && !slY) return;

      const live = lastPrice();
      const livePnl = live > 0 ? pnl(pos, live) : 0;
      const livePct = live > 0 ? pnlPct(pos, live) : 0;
      const tpPnl = pnl(pos, pos.tp);
      const slPnl = pnl(pos, pos.sl);

      if(tpY){
        makeLine(pos, "tp", tpY.y);
        makeTag(pos, "tp", tpY.y, "TP " + money(tpPnl) + " USDT", fmtPct(pnlPct(pos, pos.tp)));
      }

      if(entryY){
        makeLine(pos, "entry", entryY.y);

        if(pos.status === "pending"){
          const _live2 = lastPrice();
          const _entry2 = Number(pos.entry);
          let _kind2 = "LIMIT";
          if(_live2 > 0 && _entry2 > 0){
            if(pos.side === "buy") _kind2 = _entry2 > _live2 ? "STOP" : "LIMIT";
            else _kind2 = _entry2 < _live2 ? "STOP" : "LIMIT";
          }
          const pendingTitle = ((pos.side||"").toLowerCase()==="buy" ? "BUY" : "SELL") + " " + _kind2;
          makeTag(pos, "entry", entryY.y, pendingTitle, "");
        }else{
          makeTag(pos, "entry", entryY.y, "ENTRY " + money(livePnl) + " USDT", fmtPct(livePct));
        }
      }

      if(slY){
        makeLine(pos, "sl", slY.y);
        makeTag(pos, "sl", slY.y, "SL " + money(slPnl) + " USDT", fmtPct(pnlPct(pos, pos.sl)));
      }

    }

    function renderPending(){
      if(!state.pending) return;
      const p = state.pending;
      const y = yPrice(p.price);
      if(!y) return;

      layer.appendChild(makeLine("entry", y.y));

      const box = document.createElement("div");
      box.className = "dvl-paper-pending";
      box.style.top = y.y.toFixed(1) + "px";
      box.innerHTML =
        '<button class="dvl-paper-confirm ok" type="button">✓</button>' +
        '<button class="dvl-paper-confirm cancel" type="button">×</button>';

      box.querySelector(".ok").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        createPosition(p.side, p.price, p.type);
        state.pending = null;
        render();
      });

      box.querySelector(".cancel").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        state.pending = null;
        render();
      });

      layer.appendChild(box);
    }

    function renderEditConfirm(){
      document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){
        el.remove();
      });

      if(!state.editConfirm) return;

      const pos = findPaperPosition(state.editConfirm.id);
      if(!pos){
        state.editConfirm = null;
        return;
      }

      const handle = state.editConfirm.handle || "entry";
      const price = handle === "tp" ? pos.tp : handle === "sl" ? pos.sl : pos.entry;
      const y = yPrice(price);
      const si = scaleInfo();

      let baseY = Number(state.editConfirm.yPx);
      if(!Number.isFinite(baseY) && y && Number.isFinite(y.y)){
        baseY = y.y;
      }
      if(!Number.isFinite(baseY)) return;

      const minTop = si ? Math.max(si.top + 4, 4) : 4;
      const maxTop = si ? Math.max(minTop, si.bottom - 24) : Math.max(minTop, (dom.wrap ? dom.wrap.clientHeight - 42 : 420));
      const topPx = clamp(baseY + 18, minTop, maxTop);

      const draggingThisEdit =
        !!(state.drag &&
          String(state.drag.id) === String(pos.id) &&
          (state.drag.handle || "entry") === handle);

      if(draggingThisEdit || !Number.isFinite(Number(state.editConfirm.fixedTop))){
        const rect = dom.wrap ? dom.wrap.getBoundingClientRect() : {top:0,right:window.innerWidth};
        state.editConfirm.fixedTop = clamp(rect.top + topPx, 4, Math.max(4, window.innerHeight - 34));
        state.editConfirm.fixedRight = clamp(window.innerWidth - rect.right + 56, 6, Math.max(6, window.innerWidth - 34));
      }

      document.querySelectorAll(".dvl-paper-edit-label-fixed").forEach(function(el){
        el.remove();
      });

      function fixedLabelText(){
        const live = lastPrice();
        if(handle === "tp"){
          return { main:"TP " + money(pnl(pos, pos.tp)) + " USDT", pct:fmtPct(pnlPct(pos, pos.tp)) };
        }
        if(handle === "sl"){
          return { main:"SL " + money(pnl(pos, pos.sl)) + " USDT", pct:fmtPct(pnlPct(pos, pos.sl)) };
        }
        if(pos.status === "pending"){
          const _live3 = lastPrice();
          const _entry3 = Number(pos.entry);
          let _kind3 = "LIMIT";
          if(_live3 > 0 && _entry3 > 0){
            if(pos.side === "buy") _kind3 = _entry3 > _live3 ? "STOP" : "LIMIT";
            else _kind3 = _entry3 < _live3 ? "STOP" : "LIMIT";
          }
          const _label3 = ((pos.side||"").toLowerCase()==="buy" ? "BUY" : "SELL") + " " + _kind3;
          return { main:_label3, pct:"" };
        }
        return {
          main:"ENTRY " + money(live > 0 ? pnl(pos, live) : 0) + " USDT",
          pct:fmtPct(live > 0 ? pnlPct(pos, live) : 0)
        };
      }

      const labelText = fixedLabelText();
      const fixedLabel = document.createElement("div");
      const pendingClass = handle === "entry" && pos.status === "pending" ? " pending" : "";
      fixedLabel.className = "dvl-paper-tag " + handle + pendingClass + " dvl-paper-edit-label-fixed";
      fixedLabel.dataset.handle = handle;
      fixedLabel.dataset.id = pos.id;
      fixedLabel.style.top = clamp(Number(state.editConfirm.fixedTop) - 31, 4, Math.max(4, window.innerHeight - 64)).toFixed(1) + "px";
      fixedLabel.style.right = Number(state.editConfirm.fixedRight || 56).toFixed(1) + "px";
      fixedLabel.innerHTML =
        '<span class="txt">' +
          '<span class="main">' + labelText.main + '</span>' +
          '<span class="pct">' + labelText.pct + '</span>' +
        '</span>' +
        (handle === "entry" ? '<span class="x" data-remove="1">×</span>' : "");

      fixedLabel.addEventListener("pointerdown", function(ev){
        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1") return;
        const canDragHandle = handle !== "entry" || pos.status === "pending";
        if(!canDragHandle) return;
        startPaperDrag(ev, pos.id, handle);
      }, {passive:false});

      fixedLabel.addEventListener("click", function(ev){
        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){
          ev.preventDefault();
          ev.stopPropagation();
          if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          if(pos.status === "pending"){
            const t=findPaperPosition(pos.id);
            if(t && state.editConfirm && state.editConfirm.orig){
              t.entry=Number(state.editConfirm.orig.entry);
              t.tp=Number(state.editConfirm.orig.tp);
              t.sl=Number(state.editConfirm.orig.sl);
              t.qty=qtyFor(t.entry);
            }
            document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){ el.remove(); });
            state.editConfirm=null;
            render();
          } else {
            removePosition(pos.id);
          }
        }
      });

      document.body.appendChild(fixedLabel);

      const box = document.createElement("div");
      box.className = "dvl-paper-edit-confirm dvl-paper-edit-confirm-fixed";
      box.dataset.handle = handle;
      box.dataset.id = pos.id;
      box.style.top = Number(state.editConfirm.fixedTop).toFixed(1) + "px";
      box.style.right = Number(state.editConfirm.fixedRight || 56).toFixed(1) + "px";
      box.innerHTML =
        '<button class="dvl-paper-confirm ok" type="button">✓</button>' +
        (pos.status !== "pending" ? '<button class="dvl-paper-confirm cancel" type="button">×</button>' : "");

      box.querySelectorAll(".dvl-paper-confirm").forEach(function(btn){
        btn.addEventListener("pointerdown", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        }, {passive:false});
        btn.addEventListener("touchstart", function(ev){
          ev.stopPropagation();
        }, {passive:true});
      });

      box.querySelector(".ok").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        const confirmed = findPaperPosition(pos.id);
        if(confirmed){
          resetTpTracking(confirmed);
        }

        document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){ el.remove(); });
        state.editConfirm = null;
        save();
        render();
      });

      box.querySelector(".cancel").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

        const target = findPaperPosition(pos.id);
        if(target && state.editConfirm && state.editConfirm.orig){
          target.entry = Number(state.editConfirm.orig.entry);
          target.tp = Number(state.editConfirm.orig.tp);
          target.sl = Number(state.editConfirm.orig.sl);
          target.qty = qtyFor(target.entry);
        }

        document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){ el.remove(); });
        state.editConfirm = null;
        render();
      });

      document.body.appendChild(box);
    }

    // 0684: draft position rendering constants and helpers
    var ORDER_TAG_W      = 130;
    var ORDER_TAG_H      = 22;
    var ORDER_TAG_RADIUS = 3;
    var ORDER_TAG_FONT   = 11;

    function orderTagTopFromLineY(y){
      return Math.round(y - ORDER_TAG_H / 2);
    }

    function makeDraftLine(draft, handle, y){
      var visual = document.createElement("div");
      visual.className = "dvl-paper-line " + handle + " dvl-paper-draft-line";
      visual.dataset.status = "draft";
      visual.dataset.id = draft.id;
      visual.style.top = y.toFixed(1) + "px";
      visual.style.pointerEvents = "none";
      layer.appendChild(visual);
      if(handle === "entry"){
        var hit = document.createElement("div");
        hit.className = "dvl-paper-draft-hit entry";
        hit.style.top = y.toFixed(1) + "px";
        hit.dataset.id = draft.id;
        hit.addEventListener("pointerdown", function(ev){ startDraftDrag(ev); }, {passive:false});
        layer.appendChild(hit);
      }
    }

    // 0688: ENTRY tag draggable via startDraftDrag; × button cancels draft
    function makeDraftTag(draft, handle, y, main){
      var el = document.createElement("div");
      el.className = "dvl-paper-tag " + handle + " dvl-paper-draft-tag";
      el.dataset.status = "draft";
      el.dataset.id = draft.id;
      el.dataset.handle = handle;
      el.style.top = orderTagTopFromLineY(y).toFixed(1) + "px";
      el.style.width        = ORDER_TAG_W      + "px";
      el.style.height       = ORDER_TAG_H      + "px";
      el.style.borderRadius = ORDER_TAG_RADIUS + "px";
      el.style.fontSize     = ORDER_TAG_FONT   + "px";
      el.innerHTML = '<span class="txt"><span class="main">' + main + '</span></span>' +
        (handle === "entry" ? '<span class="x" data-remove="1">×</span>' : "");
      if(handle === "entry"){
        el.addEventListener("pointerdown", function(ev){
          if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1") return;
          startDraftDrag(ev);
        }, {passive:false});
        el.addEventListener("click", function(ev){
          if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){
            ev.preventDefault(); ev.stopPropagation();
            cancelPendingOrderDraft(draft.id);
          }
        });
      }
      layer.appendChild(el);
    }

    function renderDraftConfirm(draft){
      document.querySelectorAll(".dvl-paper-draft-confirm-fixed").forEach(function(el){ el.remove(); });
      if(!draft) return;

      var entryY = yPrice(draft.entry);
      if(!entryY) return;

      var si = scaleInfo();
      var minTop = si ? Math.max(si.top + 4, 4) : 4;
      var maxTop = si ? Math.max(minTop, si.bottom - 24) : Math.max(minTop, (dom.wrap ? dom.wrap.clientHeight - 42 : 420));
      var topPx = clamp(entryY.y + 18, minTop, maxTop);

      var rect = dom.wrap ? dom.wrap.getBoundingClientRect() : {top:0, right:window.innerWidth};
      var fixedTop   = clamp(rect.top + topPx, 4, Math.max(4, window.innerHeight - 34));
      var fixedRight = clamp(window.innerWidth - rect.right + 56, 6, Math.max(6, window.innerWidth - 34));

      var confirmBox = document.createElement("div");
      confirmBox.className = "dvl-paper-edit-confirm dvl-paper-edit-confirm-fixed dvl-paper-draft-confirm-fixed";
      confirmBox.dataset.id = draft.id;
      confirmBox.style.top   = fixedTop.toFixed(1)   + "px";
      confirmBox.style.right = fixedRight.toFixed(1) + "px";
      confirmBox.innerHTML =
        '<button class="dvl-paper-confirm ok" type="button">✓</button>' +
        '<button class="dvl-paper-confirm cancel" type="button">×</button>';

      confirmBox.querySelectorAll(".dvl-paper-confirm").forEach(function(btn){
        btn.addEventListener("pointerdown", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        }, {passive:false});
        btn.addEventListener("touchstart", function(ev){
          ev.stopPropagation();
        }, {passive:true});
      });

      confirmBox.querySelector(".ok").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        confirmPendingOrderDraft(draft.id);
      });

      confirmBox.querySelector(".cancel").addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        cancelPendingOrderDraft(draft.id);
      });

      document.body.appendChild(confirmBox);
    }

    function renderDraftPosition(draft){
      if(!draft) return;

      var entryY = yPrice(draft.entry);
      var tpY    = yPrice(draft.tp);
      var slY    = yPrice(draft.sl);

      if(entryY) makeDraftLine(draft, "entry", entryY.y);
      if(tpY)    makeDraftLine(draft, "tp",    tpY.y);
      if(slY)    makeDraftLine(draft, "sl",    slY.y);

      if(entryY) makeDraftTag(draft, "entry", entryY.y, "ENTRY");
      if(tpY)    makeDraftTag(draft, "tp",    tpY.y,    "TP");
      if(slY)    makeDraftTag(draft, "sl",    slY.y,    "SL");

      renderDraftConfirm(draft);
    }

    function render(){
      if(!layer) return;
      /* Beta 1.204: the legacy canvas/DOM overlay is permanently replaced by
         V2 Pro. Keep only its panel/liquidation bookkeeping; never rebuild the
         hidden #dvlPaperLayer after V2 has taken ownership. */
      if(document.documentElement.classList.contains("dvl-paper-v2-pro-enabled")){
        updateLiq();
        return;
      }

      if(!state.editConfirm){
        document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){
          el.remove();
        });
      }

      layer.innerHTML = "";
      state.positions.slice().forEach(renderPosition);
      // 0687: renderEditConfirm FIRST — clears .dvl-paper-edit-confirm-fixed before draft appends its own
      renderEditConfirm();
      // draft confirm appended AFTER renderEditConfirm so it is not immediately removed
      document.querySelectorAll(".dvl-paper-draft-confirm-fixed").forEach(function(el){ el.remove(); });
      if(state.pendingDraft){ renderDraftPosition(state.pendingDraft); }
      updateLiq();
    }

    function removePosition(id){
      state.positions = state.positions.filter(p => String(p.id) !== String(id));
      save();
      render();
    }

    function findPaperPosition(id){
      return state.positions.find(p => String(p.id) === String(id));
    }

    function startPaperDrag(ev, id, handle){
      const pos = findPaperPosition(id);
      const si = scaleInfo();
      if(!pos || !si) return;

      const activeHandle = handle || "entry";
      if(activeHandle === "entry" && pos.status !== "pending") return;

      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

      const rect = dom.wrap.getBoundingClientRect();
      const y = ev.clientY - rect.top;

      const previousEdit =
        state.editConfirm &&
        String(state.editConfirm.id) === String(pos.id) &&
        state.editConfirm.handle === activeHandle
          ? state.editConfirm
          : null;

      state.drag = {
        pointerId: ev.pointerId,
        captureTarget: ev.currentTarget || null,
        id: pos.id,
        handle: activeHandle,
        startPrice: si.pY(y),
        orig: {
          entry: Number(pos.entry),
          tp: Number(pos.tp),
          sl: Number(pos.sl)
        }
      };

      state.editConfirm = {
        id: pos.id,
        handle: activeHandle,
        yPx: y,
        fixedTop: previousEdit ? previousEdit.fixedTop : undefined,
        fixedRight: previousEdit ? previousEdit.fixedRight : undefined,
        orig: previousEdit && previousEdit.orig ? previousEdit.orig : {
          entry: Number(pos.entry),
          tp: Number(pos.tp),
          sl: Number(pos.sl)
        }
      };

      window.__dvlPositionDragActive = true;
      window.__dvlLongShortV2Dragging = true;
      window.__dvlPaperDragging = true;
      document.documentElement.classList.add("dvl-paper-dragging");

      try{
        ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId);
      }catch(_){}
    }

    function movePaperDrag(ev){
      if(!state.drag) return;
      if(ev && ev.type !== "touchmove" && typeof ev.buttons === "number" && ev.buttons === 0){ endPaperDrag(); return; }
      if(state.drag.pointerId != null && ev.pointerId != null && state.drag.pointerId !== ev.pointerId) return;

      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

      const pos = findPaperPosition(state.drag.id);
      const si = scaleInfo();
      if(!pos || !si) return;

      const rect = dom.wrap.getBoundingClientRect();
      const y = ev.clientY - rect.top;
      const curPrice = si.pY(y);
      const dp = curPrice - state.drag.startPrice;

      if(state.drag.handle === "entry"){
        pos.entry = state.drag.orig.entry + dp;
        pos.tp = state.drag.orig.tp + dp;
        pos.sl = state.drag.orig.sl + dp;
        pos.qty = qtyFor(pos.entry);
      }else if(state.drag.handle === "tp"){
        const rawTp = state.drag.orig.tp + dp;
        pos.tp = pos.side === "buy" ? Math.max(rawTp, pos.entry) : Math.min(rawTp, pos.entry);
      }else if(state.drag.handle === "sl"){
        const rawSl = state.drag.orig.sl + dp;
        pos.sl = pos.side === "buy" ? Math.min(rawSl, pos.entry) : Math.max(rawSl, pos.entry);
      }

      if(pos.status !== "pending" && state.editConfirm && state.editConfirm.id === pos.id){
        const handle = state.drag.handle || "entry";
        const price = handle === "tp" ? pos.tp : handle === "sl" ? pos.sl : pos.entry;
        const yy = yPrice(price);
        if(yy && Number.isFinite(yy.y)){
          state.editConfirm.yPx = yy.y;
        }
      }

      render();
    }

    function endPaperDrag(){
      if(!state.drag) return;

      const dragData = state.drag;
      const pos = findPaperPosition(dragData.id);

      state.drag = null;
      window.__dvlPositionDragActive = false;
      window.__dvlLongShortV2Dragging = false;
      window.__dvlPaperDragging = false;
      document.documentElement.classList.remove("dvl-paper-dragging");

      if(pos){
        const handle = dragData.handle || "entry";
        const price = handle === "tp" ? pos.tp : handle === "sl" ? pos.sl : pos.entry;
        let yPx = null;
        try{
          const yy = yPrice(price);
          if(yy && Number.isFinite(yy.y)){
            yPx = yy.y;
          }
        }catch(_){}

        if(state.editConfirm && String(state.editConfirm.id) === String(pos.id)){
          state.editConfirm.handle = handle;
          if(Number.isFinite(yPx)) state.editConfirm.yPx = yPx;
          if(!state.editConfirm.orig){
            state.editConfirm.orig = {
              entry: Number(dragData.orig.entry),
              tp: Number(dragData.orig.tp),
              sl: Number(dragData.orig.sl)
            };
          }
        }else{
          state.editConfirm = {
            id: pos.id,
            handle: handle,
            yPx: yPx,
            orig: {
              entry: Number(dragData.orig.entry),
              tp: Number(dragData.orig.tp),
              sl: Number(dragData.orig.sl)
            }
          };
        }
      }

      render();
    }

    function createPosition(side, entry, orderType){
      entry = Number(entry) || lastPrice();
      if(!(entry > 0)){
        toast("Sem preço para criar ordem");
        return null;
      }

      const risk = Math.max(entry * 0.004, 1);
      const isBuy = side === "buy";
      const qty = qtyFor(entry);

      const pos = {
        id: "paper_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,7),
        symbol: appSymbol(),
        side: isBuy ? "buy" : "sell",
        orderType: orderType || state.orderType,
        status: (orderType || state.orderType) === "Market" ? "open" : "pending",
        entry,
        tp: isBuy ? entry + risk : entry - risk,
        sl: isBuy ? entry - risk : entry + risk,
        qty,
        highSeen: entry,
        lowSeen: entry,
        size: Number(state.entryAmount),
        leverage: Number(state.leverage),
        marginMode: state.marginMode,
        createdAt: Date.now()
      };

      state.positions.push(pos);
      save();

      try{
        window.dispatchEvent(new CustomEvent("dvl:paper-position", {detail: pos}));
      }catch(_){}

      toast((isBuy ? "Buy" : "Sell") + " " + pos.orderType + " criado");
      render();
      return pos;
    }

    function executeMarketOrder(side){
      const price = lastPrice();
      if(!(price > 0)){ toast("Aguardando preço"); return; }
      createPosition(side, price, "Market");
    }

    function createPendingOrderDraft(side){
      const price = lastPrice();
      if(!(price > 0)){ toast("Aguardando preço"); return; }
      const isLimit = state.orderType === "Limit";
      const isBuy = side === "buy";
      // Draft born at current price; user drags ENTRY to desired position
      const draftPrice = price;
      const risk = Math.max(draftPrice * 0.004, 1);
      state.pendingDraft = {
        id: "draft_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,7),
        symbol: appSymbol(),
        side: isBuy ? "buy" : "sell",
        orderType: state.orderType,
        entry: draftPrice,
        tp: isBuy ? draftPrice + risk : draftPrice - risk,
        sl: isBuy ? draftPrice - risk : draftPrice + risk,
        qty: qtyFor(draftPrice),
        size: Number(state.entryAmount),
        leverage: Number(state.leverage),
        marginMode: state.marginMode,
        createdAt: Date.now(),
        status: "draft"
      };
      render();
    }

    function confirmPendingOrderDraft(id){
      if(!state.pendingDraft) return;
      if(id && String(state.pendingDraft.id) !== String(id)) return;
      var draft = state.pendingDraft;
      var live  = lastPrice();
      if(live > 0){
        var dEntry = Number(draft.entry);
        var dType  = draft.orderType || state.orderType;
        var dSide  = draft.side;
        var validOrder = true;
        var validMsg   = "";
        if(dType === "Limit"){
          if(dSide === "buy"  && !(dEntry < live)){ validOrder = false; validMsg = "Limit Buy: entrada deve estar abaixo do preço atual"; }
          if(dSide === "sell" && !(dEntry > live)){ validOrder = false; validMsg = "Limit Sell: entrada deve estar acima do preço atual"; }
        }else if(dType === "Stop"){
          if(dSide === "buy"  && !(dEntry > live)){ validOrder = false; validMsg = "Stop Buy: entrada deve estar acima do preço atual"; }
          if(dSide === "sell" && !(dEntry < live)){ validOrder = false; validMsg = "Stop Sell: entrada deve estar abaixo do preço atual"; }
        }
        if(!validOrder){ toast(validMsg); render(); return; }
      }
      const pos = Object.assign({}, draft, { status: "pending" });
      state.positions.push(pos);
      state.pendingDraft = null;
      save();
      render();
    }

    function cancelPendingOrderDraft(id){
      if(!state.pendingDraft) return;
      if(id && String(state.pendingDraft.id) !== String(id)) return;
      state.pendingDraft = null;
      render();
    }

    function cancelPendingOrder(orderId){
      state.positions = state.positions.filter(function(p){
        return !(String(p.id) === String(orderId) && p.status === "pending");
      });
      save();
      render();
    }

    function fillPendingOrderIfTriggered(pos){ return maybeTriggerPending(pos); }

    function startDraftDrag(ev){
      if(!state.pendingDraft) return;
      var si = scaleInfo();
      if(!si) return;
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      var rect = dom.wrap.getBoundingClientRect();
      var y = ev.clientY - rect.top;
      state.draftDrag = {
        pointerId: ev.pointerId,
        startPrice: si.pY(y),
        origEntry: Number(state.pendingDraft.entry),
        origTp:    Number(state.pendingDraft.tp),
        origSl:    Number(state.pendingDraft.sl)
      };
      window.__dvlPaperDragging = true;
      document.documentElement.classList.add("dvl-paper-dragging");
      try{
        ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId);
      }catch(_){}
    }

    function moveDraftDrag(ev){
      if(!state.draftDrag || !state.pendingDraft) return;
      if(state.draftDrag.pointerId != null && ev.pointerId != null && state.draftDrag.pointerId !== ev.pointerId) return;
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      var si = scaleInfo();
      if(!si) return;
      var rect = dom.wrap.getBoundingClientRect();
      var y = ev.clientY - rect.top;
      var curPrice = si.pY(y);
      var dp = curPrice - state.draftDrag.startPrice;
      state.pendingDraft.entry = state.draftDrag.origEntry + dp;
      state.pendingDraft.tp    = state.draftDrag.origTp    + dp;
      state.pendingDraft.sl    = state.draftDrag.origSl    + dp;
      render();
    }

    function endDraftDrag(){
      if(!state.draftDrag) return;
      state.draftDrag = null;
      window.__dvlPaperDragging = false;
      document.documentElement.classList.remove("dvl-paper-dragging");
      render();
    }

    function startOrder(side){
      if(state.orderType === "Market"){
        executeMarketOrder(side);
      } else {
        createPendingOrderDraft(side);
      }
    }

    function setDrawer(open){
      dom.drawer.classList.toggle("is-open", !!open);
      dom.tradeBtn.classList.toggle("drawer-open", !!open);
      dom.tradeBtn.classList.toggle("active", !!open);
      dom.tradeBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function toggleOrderMenu(){
      if(!dom.orderWrap || !dom.orderMenu) return;
      const open = dom.orderWrap.classList.contains("is-open");
      dom.orderWrap.classList.toggle("is-open", !open);
      if(dom.orderBtn) dom.orderBtn.setAttribute("aria-expanded", !open ? "true" : "false");
      dom.orderMenu.setAttribute("aria-hidden", !open ? "false" : "true");
    }

    function closeOrderMenu(){
      if(!dom.orderWrap || !dom.orderMenu) return;
      dom.orderWrap.classList.remove("is-open");
      if(dom.orderBtn) dom.orderBtn.setAttribute("aria-expanded", "false");
      dom.orderMenu.setAttribute("aria-hidden", "true");
    }

    function setOrderType(type){
      state.orderType = type === "Market" ? "Market" : type === "Stop" ? "Stop" : "Limit";
      if(dom.orderLabel) dom.orderLabel.textContent = state.orderType;
      if(dom.buyLabel) dom.buyLabel.textContent = state.orderType;
      if(dom.sellLabel) dom.sellLabel.textContent = state.orderType;
      dom.orderOptions.forEach(b => b.classList.toggle("activeOrderType", b.dataset.orderType === state.orderType));
      closeOrderMenu();
    }

    function setMargin(mode){
      state.marginMode = mode === "cross" ? "cross" : "isolated";
      if(dom.isoBtn) dom.isoBtn.classList.toggle("activeMode", state.marginMode === "isolated");
      if(dom.crossBtn) dom.crossBtn.classList.toggle("activeMode", state.marginMode === "cross");
    }

    function levPct(){
      return ((state.leverage - 1) / (125 - 1)) * 100;
    }

    function syncPanel(){
      if(dom.entryValue) dom.entryValue.textContent = Number(state.entryAmount).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
      if(dom.entrySub) dom.entrySub.textContent = "$" + fmt(state.entryAmount);
      if(dom.levValue) dom.levValue.textContent = Math.round(state.leverage) + "x";
      if(dom.levFill) dom.levFill.style.width = levPct() + "%";
      if(dom.levKnob) dom.levKnob.style.left = levPct() + "%";
      if(dom.levSlider) dom.levSlider.setAttribute("aria-valuenow", String(Math.round(state.leverage)));
      if(dom.levNotional) dom.levNotional.textContent = "$" + fmt(Number(state.entryAmount) * Number(state.leverage));
      updateLiq();
    }

    function updateLiq(){
      const price = lastPrice();
      if(price > 0){
        const dist = clamp(1.5 / Math.max(state.leverage, 1), 0.006, 0.8);
        if(dom.longLiq) dom.longLiq.textContent = "Long Liq " + fmt(price * (1 - dist));
        if(dom.shortLiq) dom.shortLiq.textContent = "Short Liq " + fmt(price * (1 + dist));
      }
    }

    function setLiq(on){
      state.liqOn = !!on;
      if(dom.liqBtn) dom.liqBtn.classList.toggle("is-on", state.liqOn);
      if(dom.liqText) dom.liqText.textContent = state.liqOn ? "ON" : "OFF";
      syncPanel();
    }

    function openPad(){
      state.padDraft = String(state.entryAmount || "");
      if(dom.padDisplay) dom.padDisplay.textContent = state.padDraft || "0";
      if(dom.pad){
        dom.pad.classList.add("is-open");
        dom.pad.setAttribute("aria-hidden", "false");
      }
    }

    function closePad(){
      if(dom.pad){
        dom.pad.classList.remove("is-open");
        dom.pad.setAttribute("aria-hidden", "true");
      }
    }

    function applyPad(){
      const n = Number(state.padDraft);
      if(Number.isFinite(n) && n > 0){
        state.entryAmount = clamp(n, 1, 999999);
        syncPanel();
      }
      closePad();
    }

    function padKey(k){
      if(k === "back") state.padDraft = state.padDraft.slice(0, -1);
      else if(k === "."){
        if(!state.padDraft.includes(".")) state.padDraft = state.padDraft ? state.padDraft + "." : "0.";
      }else if(/^\d$/.test(k)){
        if(state.padDraft === "0") state.padDraft = k;
        else if(state.padDraft.length < 12) state.padDraft += k;
      }
      if(!state.padDraft) state.padDraft = "0";
      if(dom.padDisplay) dom.padDisplay.textContent = state.padDraft;
    }

    function bind(el, type, fn, opts){
      if(!el) return;
      el.addEventListener(type, fn, opts || false);
    }

    let lastTradeTap = 0;
    function tradeToggle(ev){
      const t = ev.target;
      if(!t || !t.closest || !t.closest("#tradeNavBtn")) return;
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

      const now = Date.now();
      if(now - lastTradeTap < 330) return;
      lastTradeTap = now;
      setDrawer(!dom.drawer.classList.contains("is-open"));
    }

    document.addEventListener("click", tradeToggle, true);
    document.addEventListener("pointerup", tradeToggle, true);

    bind(dom.closeBtn, "click", function(ev){ ev.preventDefault(); setDrawer(false); });
    bind(dom.closeX, "click", function(ev){ ev.preventDefault(); setDrawer(false); });

    bind(dom.buyBtn, "click", function(ev){ ev.preventDefault(); ev.stopPropagation(); startOrder("buy"); });
    bind(dom.sellBtn, "click", function(ev){ ev.preventDefault(); ev.stopPropagation(); startOrder("sell"); });

    bind(dom.orderBtn, "click", function(ev){ ev.preventDefault(); ev.stopPropagation(); toggleOrderMenu(); });
    dom.orderOptions.forEach(function(btn){
      bind(btn, "click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        setOrderType(btn.dataset.orderType);
      });
    });

    document.addEventListener("click", function(ev){
      if(dom.orderWrap && !dom.orderWrap.contains(ev.target)) closeOrderMenu();
    });

    document.addEventListener("pointerup", function(ev){
      const t = ev.target;
      if(t && t.closest && t.closest("#orderTypeBtn")){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        toggleOrderMenu();
        return;
      }

      if(t && t.closest && t.closest("#closeTradeDrawer,#panelCloseX")){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        setDrawer(false);
      }
    }, true);

    document.addEventListener("click", function(ev){
      const t = ev.target;
      if(t && t.closest && t.closest("#orderTypeBtn")){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }

      if(t && t.closest && t.closest("#closeTradeDrawer,#panelCloseX")){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        setDrawer(false);
      }
    }, true);

    bind(dom.isoBtn, "click", function(){ setMargin("isolated"); });
    bind(dom.crossBtn, "click", function(){ setMargin("cross"); });
    bind(dom.liqBtn, "click", function(){ setLiq(!state.liqOn); });

    let levDrag = false;
    function setLevFromX(x){
      if(!dom.levSlider) return;
      const r = dom.levSlider.getBoundingClientRect();
      const p = clamp((x - r.left) / Math.max(1, r.width), 0, 1);
      state.leverage = Math.round(1 + p * 124);
      syncPanel();
      drawSoonSafe();
    }

    function levStart(ev){
      ev.preventDefault();
      ev.stopPropagation();
      levDrag = true;
      try{ ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); }catch(_){}
      setLevFromX(ev.clientX);
    }

    bind(dom.levSlider, "pointerdown", levStart);
    bind(dom.levCard, "pointerdown", levStart);

    window.addEventListener("pointermove", function(ev){
      if(state.drag){
        movePaperDrag(ev);
        return;
      }
      if(!levDrag) return;
      ev.preventDefault();
      setLevFromX(ev.clientX);
    }, {passive:false, capture:true});

    window.addEventListener("pointerup", function(){
      if(state.drag) endPaperDrag();
      levDrag = false;
    }, {passive:true, capture:true});
    window.addEventListener("pointercancel", function(){
      if(state.drag) endPaperDrag();
      levDrag = false;
    }, {passive:true, capture:true});

    window.addEventListener("touchend", function(){
      if(state.drag) endPaperDrag();
      levDrag = false;
    }, {passive:true, capture:true});

    window.addEventListener("mouseup", function(){
      if(state.drag) endPaperDrag();
      levDrag = false;
    }, {passive:true, capture:true});

    window.addEventListener("pointermove", function(ev){
      if(!state.draftDrag) return;
      moveDraftDrag(ev);
    }, {passive:false, capture:true});
    window.addEventListener("pointerup", function(){
      if(state.draftDrag) endDraftDrag();
    }, {passive:true, capture:true});
    window.addEventListener("pointercancel", function(){
      if(state.draftDrag) endDraftDrag();
    }, {passive:true, capture:true});
    window.addEventListener("touchend", function(){
      if(state.draftDrag) endDraftDrag();
    }, {passive:true, capture:true});
    window.addEventListener("mouseup", function(){
      if(state.draftDrag) endDraftDrag();
    }, {passive:true, capture:true});

    bind(dom.entryCard, "click", openPad);
    bind(dom.padClose, "click", closePad);
    bind(dom.padOk, "click", applyPad);
    bind(dom.padClear, "click", function(){
      state.padDraft = "0";
      if(dom.padDisplay) dom.padDisplay.textContent = "0";
    });

    bind(dom.pad, "click", function(ev){
      if(ev.target === dom.pad) closePad();
    });

    dom.padKeys.forEach(function(btn){
      bind(btn, "click", function(){ padKey(btn.dataset.key); });
    });
    /* Beta 1.204: removed the legacy drawSoon wrapper and 1200ms renderer.
       V2 Pro owns chart labels; the legacy runtime updates liquidation text
       only when a real paper-price event arrives. */
    window.addEventListener("dvl:paper-price", function(){
      try{ updateLiq(); }catch(_){}
    }, {passive:true});
    window.addEventListener("resize", function(){
      if(!document.documentElement.classList.contains("dvl-paper-v2-pro-enabled")) render();
      else updateLiq();
    }, {passive:true});

    load();
    setOrderType(state.orderType);
    setMargin(state.marginMode);
    setLiq(state.liqOn);
    syncPanel();
    render();

    window.__dvlPaperRuntime0581 = {
      ready:true,
      state,
      open:function(){ setDrawer(true); },
      close:function(){ setDrawer(false); },
      render,
      createPosition,
      removePosition
    };

    console.log("[DVL 0.581] Paper Trading runtime ready");
  });
})();

/* ===== DVL_PAPER_TRADING_0584_CLOSE_X_FIX ===== */
(function(){
  "use strict";

  function runtime(){
    return window.__dvlPaperRuntime0582 ||
           window.__dvlPaperRuntime0581 ||
           window.__dvlPaperRuntime0580 ||
           window.__dvlPaperRuntime;
  }

  let lastCloseTs = 0;
  let lastCloseId = "";

  function isCloseTarget(target){
    return !!(target && target.closest && target.closest('.dvl-paper-tag .x, .dvl-paper-tag [data-remove="1"]'));
  }

  function closeFromEvent(ev){
    const target = ev.target;
    if(!isCloseTarget(target)) return;

    const tag = target.closest(".dvl-paper-tag");
    const id = tag && tag.dataset ? tag.dataset.id : "";
    if(!id) return;

    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    const now = Date.now();
    if(id === lastCloseId && now - lastCloseTs < 450) return;
    lastCloseId = id;
    lastCloseTs = now;

    const api = runtime();
    if(api && typeof api.removePosition === "function"){
      try{
        if(api.state) api.state.editConfirm = null;
      }catch(_){}
      api.removePosition(id);
      return;
    }

    const node = document.querySelector('.dvl-paper-tag[data-id="' + CSS.escape(id) + '"]');
    if(node) node.remove();
  }

  /*
    Capture phase is required here:
    the ENTRY label itself is draggable, so the close X must intercept the gesture
    before the parent label starts drag mode.
  */
  document.addEventListener("pointerdown", closeFromEvent, true);
  document.addEventListener("touchstart", closeFromEvent, true);
  document.addEventListener("click", closeFromEvent, true);

  console.log("[DVL 0.584] Paper close X fix ready");
})();
