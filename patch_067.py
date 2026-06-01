#!/usr/bin/env python3
# patch_067.py — HVN Signals indicator implementation (Beta 0.067)

import re, sys

SRC  = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
DEST = SRC

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

orig_len = len(html)

def replace_once(old, new, context=''):
    global html
    if old not in html:
        print(f'[MISS]{" "+context if context else ""}: not found')
        return False
    html = html.replace(old, new, 1)
    print(f'[OK]{" "+context if context else ""}')
    return True

def count_occurrences(s):
    return html.count(s)

# ── 1. CSS: add hvnSignalsResizeHandle to resize bar rule ─────────────────────
replace_once(
    '#flowResizeHandle,#hvnResizeHandle{height:3px!important',
    '#flowResizeHandle,#hvnResizeHandle,#hvnSignalsResizeHandle{height:3px!important',
    'CSS resize handle'
)

# ── 2. HTML: add hvnSignalsResizeHandle div after flowResizeHandle ─────────────
replace_once(
    '<div id="flowResizeHandle" style="display:none" title="Drag to resize DVL Flow panel"></div>',
    '<div id="flowResizeHandle" style="display:none" title="Drag to resize DVL Flow panel"></div>\n        <div id="hvnSignalsResizeHandle" style="display:none" title="Drag to resize HVN Signals panel"></div>',
    'HTML resize handle div'
)

# ── 3. S.inds: register hvnSignals ────────────────────────────────────────────
replace_once(
    'hvnReact:false},window.__savedInds',
    'hvnReact:false,hvnSignals:false},window.__savedInds',
    'S.inds hvnSignals'
)

# ── 4. S state: add hvnSignals array alongside confluenceSignals ──────────────
replace_once(
    'confluenceSignals:[],fvgConfSignals:[]}',
    'confluenceSignals:[],fvgConfSignals:[],hvnSignals:[]}',
    'S state hvnSignals'
)

# ── 5. setCandles: reset hvnSignals on symbol change ─────────────────────────
replace_once(
    'S.confluenceSignals=[];S.fvgConfSignals=[];',
    'S.confluenceSignals=[];S.fvgConfSignals=[];S.hvnSignals=[];',
    'setCandles reset hvnSignals'
)

# ── 6. Module-level variable: _hvnSignalsH ────────────────────────────────────
replace_once(
    "let _flowAccelH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_flowH'));return(v>=70&&v<=240)?v:120;}catch(e){return 120;}})();",
    "let _flowAccelH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_flowH'));return(v>=70&&v<=240)?v:120;}catch(e){return 120;}})();let _hvnSignalsH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_hvnSignH'));return(v>=80&&v<=240)?v:110;}catch(e){return 110;}})();",
    '_hvnSignalsH variable'
)

# ── 7. PB calculation: include _hvnSignH ─────────────────────────────────────
replace_once(
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;PB=10+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);',
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;const _hvnSignH=(S.inds.hvnSignals&&S.candles.length)?_hvnSignalsH:0;PB=10+(_hvnSignH?_hvnSignH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);',
    'PB calculation'
)

# ── 8. Resize handle positioning: add hvnSignalsResizeHandle ─────────────────
replace_once(
    "const _frh=el('flowResizeHandle');if(_frh){_frh.style.display=_fah>0?'block':'none';_frh.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+_fah-PANEL_GAP/2)+'px';}",
    "const _frh=el('flowResizeHandle');if(_frh){_frh.style.display=_fah>0?'block':'none';_frh.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+_fah-PANEL_GAP/2)+'px';}const _srh=el('hvnSignalsResizeHandle');if(_srh){_srh.style.display=_hvnSignH>0?'block':'none';_srh.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+_hvnSignH-PANEL_GAP/2)+'px';}",
    'resize handle positioning'
)

# ── 9. Draw loop: HVN Signals overlay + panel draw calls ─────────────────────
replace_once(
    "}resetCtxState(ctx);drawLastPrice(ctx,W,sc);drawDeltaPane();if(_fah>0&&window.__drawFlowPanel)safeLayer('DVL Flow Panel',()=>window.__drawFlowPanel(ctx,W,H,V,sc,x,_fah,_clarH,0));resetCtxState(ctx);if(_clarH>0)drawTrendClarityOnCanvas(ctx,V,sc,x,W,H,_clarH);drawTimeAxis();",
    "}resetCtxState(ctx);if(S.inds.hvnSignals){if(window.__computeHVNSignals)window.__computeHVNSignals();if(window.__drawHVNSignalsOverlay)safeLayer('HVN Signals',()=>window.__drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw));}resetCtxState(ctx);drawLastPrice(ctx,W,sc);drawDeltaPane();if(_hvnSignH>0&&window.__drawHVNSignalsPanel)safeLayer('HVN Signals Panel',()=>window.__drawHVNSignalsPanel(ctx,W,H,V,_hvnSignH,_fah,_clarH));resetCtxState(ctx);if(_fah>0&&window.__drawFlowPanel)safeLayer('DVL Flow Panel',()=>window.__drawFlowPanel(ctx,W,H,V,sc,x,_fah,_clarH,0));resetCtxState(ctx);if(_clarH>0)drawTrendClarityOnCanvas(ctx,V,sc,x,W,H,_clarH);drawTimeAxis();",
    'draw loop HVN Signals calls'
)

# ── 10. oscPanelHeights: add hvnSignals ───────────────────────────────────────
replace_once(
    'function oscPanelHeights(){const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;return{clarH,flowH};}',
    'function oscPanelHeights(){const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;const signH=(window.S&&S.inds&&S.inds.hvnSignals&&S.candles&&S.candles.length)?_hvnSignalsH:0;return{clarH,flowH,signH};}',
    'oscPanelHeights'
)

# ── 11. oscScaleHit: add hvnSignals panel detection ───────────────────────────
replace_once(
    "function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;const{clarH,flowH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}return null;}",
    "function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;const{clarH,flowH,signH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}if(signH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const flowOff=flowH>0?flowH+PANEL_GAP:0;const sb=H-10-clarOff-flowOff,st=sb-signH;if(y>=st&&y<=sb)return 'hvnSignals';}return null;}",
    'oscScaleHit'
)

# ── 12. oscPanelAtY: add hvnSignals panel detection ───────────────────────────
replace_once(
    "function oscPanelAtY(y,H){const{clarH,flowH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}return null;}",
    "function oscPanelAtY(y,H){const{clarH,flowH,signH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}if(signH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const flowOff=flowH>0?flowH+PANEL_GAP:0;const sb=H-10-clarOff-flowOff,st=sb-signH;if(y>=st&&y<=sb)return 'hvnSignals';}return null;}",
    'oscPanelAtY'
)

# ── 13. mousemove: add hvnSignals panel height ────────────────────────────────
replace_once(
    "const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);",
    "const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):S.oscDrag.kind==='hvnSignals'?(_hvnSignalsH||110):(_hvnClarityH||166);",
    'mousemove ph'
)

# ── 14. touchmove: add hvnSignals panel height ────────────────────────────────
replace_once(
    "const ph=touchState.oscKind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);",
    "const ph=touchState.oscKind==='flow'?(_flowAccelH||120):touchState.oscKind==='hvnSignals'?(_hvnSignalsH||110):(_hvnClarityH||166);",
    'touchmove ph'
)

# ── 15. Resize handle wiring: add hvnSignalsResizeHandle JS ──────────────────
old_rh = """})();['volMaLen','heatOpacity',"""
new_rh = """})();(()=>{let _srhDrag=null;const srh=el('hvnSignalsResizeHandle');if(!srh)return;srh.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();srh.setPointerCapture(e.pointerId);_srhDrag={y:e.clientY,h:_hvnSignalsH};srh.classList.add('active');});srh.addEventListener('pointermove',e=>{if(!_srhDrag)return;_hvnSignalsH=clamp(_srhDrag.h-(e.clientY-_srhDrag.y),80,240);drawSoon();});srh.addEventListener('pointerup',()=>{if(!_srhDrag)return;_srhDrag=null;srh.classList.remove('active');try{localStorage.setItem('dvl_hvnSignH',Math.round(_hvnSignalsH));}catch(_){}});srh.addEventListener('pointercancel',()=>{_srhDrag=null;srh.classList.remove('active');});})();['volMaLen','heatOpacity',"""
replace_once(old_rh, new_rh, 'hvnSignalsResizeHandle JS wiring')

# ── 16. Indicator card HTML: add hvnSignals card after hvnPro ─────────────────
old_card_anchor = """        <div class="ind-card dvl-icd" data-card="footprint" data-dvl-cat="" style="display:none">"""
new_card = """        <div class="ind-card dvl-icd" data-card="hvnSignals" data-dvl-cat="clareza">
          <div class="dvl-icd-head">
            <div class="dvl-icd-icon" style="--ic-bg:rgba(255,100,100,.12);--ic-cl:#ff6464"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 2L10 7h5l-4 3 1.5 5L8 12l-4.5 3L5 10 1 7h5z"/></svg></div>
            <div class="dvl-icd-info">
              <div class="dvl-icd-name name">HVN Signals</div>
              <div class="dvl-icd-meta">
                <span class="dvl-bdg dvl-bdg-nat">NATIVO</span>
                <span class="dvl-bdg dvl-bdg-on">ATIVO</span>
              </div>
            </div>
            <div class="dvl-icd-ctrl">
              <div class="row" data-ind="hvnSignals"><span class="switch"></span></div>
              <button class="gear" data-settings="hvnSignals" title="Configurar HVN Signals">&#9881;</button>
              <button class="dvl-star" data-star="hvnSignals" type="button" title="Favoritar"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="8,1 10,6.5 15.5,6.5 11,10 13,15.5 8,12 3,15.5 5,10 0.5,6.5 6,6.5"/></svg></button>
            </div>
          </div>
          <div class="ind-settings" id="settings-hvnSignals">
            <div style="font-size:9px;color:#00d4ff;font-weight:700;letter-spacing:.08em;margin-bottom:6px;opacity:.8;">DETECÇÃO DE REJEIÇÃO</div>
            <div class="kv"><span class="k">Lateral mín. candles</span><input class="num" id="hvnSigLateral" type="number" min="1" max="20" step="1" value="3" style="width:52px"></div>
            <div class="kv"><span class="k">Sensibilidade (%)</span><input class="num" id="hvnSigSens" type="number" min="0" max="50" step="5" value="20" style="width:52px"></div>
            <div class="kv"><span class="k">Cooldown candles</span><input class="num" id="hvnSigCooldown" type="number" min="1" max="50" step="1" value="5" style="width:52px"></div>
            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">VISUAL</div>
            <div class="kv"><span class="k">LONG color</span><input type="color" id="hvnSigLongColor" value="#00d2c8"></div>
            <div class="kv"><span class="k">SHORT color</span><input type="color" id="hvnSigShortColor" value="#ff4a64"></div>
            <label class="kv" style="cursor:pointer;"><span class="k">Mostrar callouts</span><input type="checkbox" id="hvnSigCallouts" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <label class="kv" style="cursor:pointer;"><span class="k">Hist opacity</span></label>
            <div class="kv"><span class="k">Hist opacity</span><input class="num" id="hvnSigHistOp" type="number" min="0.1" max="2" step="0.1" value="1.1" style="width:52px"></div>
            <div class="hint">Detecta rejeição de candle nas zonas HVN — sinais LONG/SHORT por suporte/resistência.</div>
          </div>
        </div>

"""
replace_once(old_card_anchor, new_card + old_card_anchor, 'indicator card HTML')

# ── 17. Version bump 0.066 → 0.067 ────────────────────────────────────────────
html = html.replace('Beta 0.066', 'Beta 0.067')
print(f'[OK] version bump: {html.count("Beta 0.067")} occurrences')

# ── 18. Changelog entry ───────────────────────────────────────────────────────
replace_once(
    'Beta 0.067\n  - Moved GRÁFICO section',
    'Beta 0.067\n  - New indicator: HVN Signals — LONG/SHORT signals by wick rejection at HVN zones.\n  - Signal types: resistance rejection (SHORT), support rejection (LONG), lateral zone rejection.\n  - Chart overlay: LONG/SHORT labels with triangle pointer + callout box.\n  - Oscillator panel: HVN SIGNALS with signal timeline histogram + PREMIUM badge.\n  - Resize handle, oscPanelHeights/ScaleHit/AtY all updated for the new panel slot.\n\nBeta 0.066\n  - Moved GRÁFICO section',
    'changelog'
)

# ── 19. Append new script block ───────────────────────────────────────────────
NEW_SCRIPT = r"""
<script id="DVL_BETA_HVN_SIGNALS">
/* HVN Signals — Beta 0.067
   Detects LONG/SHORT rejections when candle wicks touch HVN zones then close back
   out. Three signal types: resistance rejection (SHORT), support rejection (LONG),
   lateral zone rejection (either direction after consolidation inside zone).
   Draws chart overlay labels + callout boxes, and an oscillator panel.         */
(function(){
  'use strict';

  var VERSION = 'Beta 0.067';

  /* ── Config helpers ─────────────────────────────────────────────────────── */
  function _cfg(){
    var el=function(id){return document.getElementById(id);};
    var lateralMin = Math.max(1, parseInt(el('hvnSigLateral')?.value)||3);
    var sens       = Math.max(0, Math.min(50, parseFloat(el('hvnSigSens')?.value)||20)) / 100;
    var cooldown   = Math.max(1, parseInt(el('hvnSigCooldown')?.value)||5);
    var longColor  = el('hvnSigLongColor')?.value  || '#00d2c8';
    var shortColor = el('hvnSigShortColor')?.value || '#ff4a64';
    var callouts   = el('hvnSigCallouts')?.checked !== false;
    var histOp     = Math.max(0.1, Math.min(2, parseFloat(el('hvnSigHistOp')?.value)||1.1));
    return {lateralMin:lateralMin, sens:sens, cooldown:cooldown,
            longColor:longColor, shortColor:shortColor, callouts:callouts, histOp:histOp};
  }

  /* ── Signal value for oscillator histogram ──────────────────────────────── */
  // +100 = clean LONG, -100 = clean SHORT, +60/-60 = lateral, 0 = none

  /* ── Compute signals ────────────────────────────────────────────────────── */
  function computeHVNSignals(){
    if(!window.S||!S.inds||!S.inds.hvnSignals)return;
    var cs=S.candles;
    if(!cs||cs.length<4){S.hvnSignals=[];return;}

    var zones=window.__hvnZones?.()||[];
    if(!zones.length){S.hvnSignals=[];return;}

    var cfg=_cfg();
    var n=cs.length;
    var signals=new Array(n).fill(null);

    for(var zi=0;zi<zones.length;zi++){
      var z=zones[zi];
      var zSize=z.hi-z.lo;
      if(zSize<=0)continue;

      /* close tolerance: how far inside the zone a close can be and still
         count as a rejection close (0 = must close outside, 0.3 = can close
         in the inner 30% of the zone on the far side)                       */
      var tol=zSize*cfg.sens;

      var lateralCount=0;   // consecutive candles with body overlapping zone
      var lastSignalIdx=-999;

      for(var i=0;i<n;i++){
        var c=cs[i];
        var bodyLo=Math.min(c.o,c.c);
        var bodyHi=Math.max(c.o,c.c);
        var bodyOverlap=(bodyHi>=z.lo&&bodyLo<=z.hi);

        if(bodyOverlap){
          lateralCount++;
        } else {
          /* ── SHORT: wick from below touches/enters zone, close back below ── */
          var wickShort=(c.h>=z.lo);                      // upper wick in zone
          var closeShort=(c.c < z.lo + tol);              // closed below (or near) zone bottom
          var bodyBelowMidZone=(bodyLo < z.lo + zSize*0.5); // body mostly below zone midpoint

          /* ── LONG: wick from above touches/enters zone, close back above ── */
          var wickLong=(c.l<=z.hi);                       // lower wick in zone
          var closeLong=(c.c > z.hi - tol);               // closed above (or near) zone top
          var bodyAboveMidZone=(bodyHi > z.hi - zSize*0.5); // body mostly above zone midpoint

          var cooldownOK=(i-lastSignalIdx>=cfg.cooldown);

          if(wickShort&&closeShort&&bodyBelowMidZone&&cooldownOK){
            var isLateral=(lateralCount>=cfg.lateralMin);
            var sigVal=isLateral?-60:-100;
            if(!signals[i]||Math.abs(signals[i].val)<Math.abs(sigVal)){
              signals[i]={type:'short',kind:isLateral?'lateral':'rejection',
                          val:sigVal,zone:z,lateralCount:lateralCount};
              lastSignalIdx=i;
            }
          } else if(wickLong&&closeLong&&bodyAboveMidZone&&cooldownOK){
            var isLateral=(lateralCount>=cfg.lateralMin);
            var sigVal=isLateral?60:100;
            if(!signals[i]||Math.abs(signals[i].val)<Math.abs(sigVal)){
              signals[i]={type:'long',kind:isLateral?'lateral':'rejection',
                          val:sigVal,zone:z,lateralCount:lateralCount};
              lastSignalIdx=i;
            }
          }

          lateralCount=0;
        }
      }
    }

    S.hvnSignals=signals;
  }

  /* ── Rounded rect helper ──────────────────────────────────────────────── */
  function _rr(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  /* ── Draw one signal on main chart ─────────────────────────────────────── */
  function _drawOneSig(ctx,sig,c,cx,sc,W,H,cfg){
    var PL=0,PT=8;
    var PB=window._dvlLastPB||10;
    var isLong=(sig.type==='long');
    var isLateral=(sig.kind==='lateral');
    var longC=cfg.longColor;
    var shortC=cfg.shortColor;
    var bc=isLong?longC:shortC;
    var glowC=isLong?'rgba(0,210,200,.45)':'rgba(255,74,100,.45)';
    var fillC=isLong?'rgba(0,60,56,.55)':'rgba(80,16,24,.55)';
    var textC=isLong?'rgba(0,255,235,.97)':'rgba(255,100,120,.97)';
    var label=isLong?'LONG':'SHORT';
    var csf=window.innerWidth>900?1.35:1.0;
    var fs=Math.round(9*csf);
    ctx.font='bold '+fs+'px monospace';
    var tW=ctx.measureText(label).width;
    var lW=Math.ceil(tW)+18;
    var lH=Math.round(18*csf);
    var rad=4,tSz=5,triH=6,gap=4,space=2;
    var lX=cx-lW/2;

    if(isLong){
      var anchorY=sc.y(c.l);
      var triTipY=anchorY+gap;
      var triBaseY=triTipY+triH;
      var lY=triBaseY+space;
      if(lY+lH>H-PB-4)return;
      ctx.shadowColor=glowC;ctx.shadowBlur=8;
      ctx.fillStyle=bc;
      ctx.beginPath();ctx.moveTo(cx,triTipY);ctx.lineTo(cx-tSz,triBaseY);ctx.lineTo(cx+tSz,triBaseY);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;
      _rr(ctx,lX,lY,lW,lH,rad);
      ctx.fillStyle=fillC;ctx.fill();
      ctx.strokeStyle=bc;ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle=textC;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(label,cx,lY+lH/2);

      if(cfg.callouts){
        var calloutText=isLateral
          ? ['Lateral zone','Rejection ↑']
          : ['Wick → HVN support','Close ↑ = Rejection'];
        _drawCallout(ctx,cx,lY+lH+4,calloutText,bc,fillC,W,H,csf,true);
      }

    } else {
      var anchorY=sc.y(c.h);
      var triTipY=anchorY-gap;
      var triBaseY=triTipY-triH;
      var lY=triBaseY-space-lH;
      if(lY<PT+4)return;
      ctx.shadowColor=glowC;ctx.shadowBlur=8;
      ctx.fillStyle=bc;
      ctx.beginPath();ctx.moveTo(cx,triTipY);ctx.lineTo(cx-tSz,triBaseY);ctx.lineTo(cx+tSz,triBaseY);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;
      _rr(ctx,lX,lY,lW,lH,rad);
      ctx.fillStyle=fillC;ctx.fill();
      ctx.strokeStyle=bc;ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle=textC;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(label,cx,lY+lH/2);

      if(cfg.callouts){
        var calloutText=isLateral
          ? ['Lateral zone','Rejection ↓']
          : ['Wick → HVN resistance','Close ↓ = Rejection'];
        _drawCallout(ctx,cx,lY-4,calloutText,bc,fillC,W,H,csf,false);
      }
    }
    ctx.shadowBlur=0;
  }

  function _drawCallout(ctx,cx,anchorY,lines,bc,fillC,W,H,csf,isBelow){
    var fs=Math.round(8*csf);
    ctx.font=fs+'px Inter,system-ui,sans-serif';
    var maxW=0;
    for(var i=0;i<lines.length;i++)maxW=Math.max(maxW,ctx.measureText(lines[i]).width);
    var cW=Math.ceil(maxW)+14;
    var lineH=Math.round(12*csf);
    var cH=lines.length*lineH+8;
    var cX=Math.max(2,Math.min(W-cW-2,cx-cW/2));
    var cY=isBelow?anchorY:anchorY-cH;
    _rr(ctx,cX,cY,cW,cH,3);
    ctx.fillStyle=fillC;ctx.fill();
    ctx.strokeStyle=bc;ctx.lineWidth=0.8;ctx.stroke();
    ctx.fillStyle='rgba(215,230,248,.82)';
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(var i=0;i<lines.length;i++){
      ctx.fillText(lines[i],cX+cW/2,cY+6+i*lineH+lineH/2);
    }
  }

  /* ── Draw chart overlay ─────────────────────────────────────────────────── */
  function drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw){
    if(!window.S||!S.inds.hvnSignals||!S.candles.length)return;
    var signals=S.hvnSignals;
    if(!signals||!signals.length)return;
    var cfg=_cfg();
    var rp=window.RP?window.RP():68;
    var right=W-rp;
    ctx.save();
    ctx.beginPath();ctx.rect(0,8,right,H-8-(window._dvlLastPB||10));ctx.clip();
    ctx.setLineDash([]);
    for(var i=V.a;i<=V.b&&i<signals.length;i++){
      var sig=signals[i];if(!sig)continue;
      var c=S.candles[i];if(!c)continue;
      var cx=x(i);
      if(cx<-30||cx>right+30)continue;
      _drawOneSig(ctx,sig,c,cx,sc,W,H,cfg);
    }
    ctx.restore();
  }

  /* ── Panel drawing ──────────────────────────────────────────────────────── */
  function drawHVNSignalsPanel(ctx,W,H,V,signH,fah,clarH){
    if(!signH||signH<=0)return;
    if(!window.S||!S.candles.length)return;
    var PANEL_GAP=3;
    var clarOff=clarH?(clarH+PANEL_GAP):0;
    var flowOff=fah?(fah+PANEL_GAP):0;
    var pBot=H-10-clarOff-flowOff;
    var pTop=pBot-signH;
    if(pBot<=pTop)return;

    var csf=window.innerWidth>900?1.35:1.0;
    var rp=window.RP?window.RP():68;
    var scaleW=Math.max(44,Math.min(68,rp));
    var hdrH=Math.max(18,Math.round(20*csf));
    var plotLeft=6, plotRight=W-scaleW-5;
    var plotTop=pTop+hdrH+3, plotBottom=pBot-7;
    var mid=(plotTop+plotBottom)/2;

    /* background */
    ctx.save();
    ctx.fillStyle='#05070b';
    ctx.fillRect(0,pTop,W,pBot-pTop);
    ctx.strokeStyle='rgba(23,32,45,0.80)';
    ctx.lineWidth=1;ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(0,pTop+.5);ctx.lineTo(W,pTop+.5);ctx.stroke();

    /* eye icon */
    var eyeX=plotLeft+12, eyeY=pTop+hdrH/2;
    window._dvnSigEyeHit={x1:eyeX-10,y1:eyeY-10,x2:eyeX+10,y2:eyeY+10};
    var eyeHidden=!!window._dvlHvnSigTitleHidden;
    ctx.strokeStyle='rgba(120,145,180,0.70)';ctx.fillStyle='rgba(120,145,180,0.70)';
    ctx.lineWidth=0.9;ctx.lineJoin='round';ctx.lineCap='round';
    if(!eyeHidden){
      ctx.beginPath();ctx.moveTo(eyeX-5,eyeY);ctx.bezierCurveTo(eyeX-3,eyeY-3.5,eyeX+3,eyeY-3.5,eyeX+5,eyeY);ctx.bezierCurveTo(eyeX+3,eyeY+3.5,eyeX-3,eyeY+3.5,eyeX-5,eyeY);ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.arc(eyeX,eyeY,1.7,0,Math.PI*2);ctx.fill();
    } else {
      ctx.beginPath();ctx.moveTo(eyeX-5,eyeY);ctx.bezierCurveTo(eyeX-3,eyeY-2.5,eyeX+3,eyeY-2.5,eyeX+5,eyeY);ctx.stroke();
      for(var d of[-3,0,3]){ctx.beginPath();ctx.moveTo(eyeX+d,eyeY);ctx.lineTo(eyeX+d,eyeY+2.5);ctx.stroke();}
    }

    /* title */
    if(!eyeHidden){
      ctx.font='700 '+Math.round(10*csf)+'px monospace';
      ctx.fillStyle='rgba(160,178,205,0.92)';
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText('HVN SIGNALS',eyeX+16,eyeY);

      /* PREMIUM badge */
      var badgeX=eyeX+16+ctx.measureText('HVN SIGNALS').width+8;
      var badgeW=50,badgeH=11;
      _rr(ctx,badgeX,eyeY-badgeH/2,badgeW,badgeH,3);
      ctx.fillStyle='rgba(245,158,11,.15)';ctx.fill();
      ctx.strokeStyle='rgba(245,158,11,.38)';ctx.lineWidth=0.7;ctx.stroke();
      ctx.font='700 '+Math.round(7.5*csf)+'px monospace';
      ctx.fillStyle='rgba(245,158,11,.88)';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('PREMIUM',badgeX+badgeW/2,eyeY);
    }

    /* right-side signal state text */
    var signals=S.hvnSignals||[];
    var lastSig=null;
    for(var i=signals.length-1;i>=0;i--){if(signals[i]){lastSig=signals[i];break;}}
    var stateText='SCANNING...';
    var stateColor='rgba(135,155,185,.92)';
    if(lastSig){
      var cfg=_cfg();
      if(lastSig.type==='short'&&lastSig.kind==='lateral')     {stateText='LATERAL REJ ↓';stateColor='rgba(255,100,120,.92)';}
      else if(lastSig.type==='short')                          {stateText='RESISTANCE REJ';stateColor='rgba(255,74,100,.94)';}
      else if(lastSig.type==='long'&&lastSig.kind==='lateral') {stateText='LATERAL REJ ↑';stateColor='rgba(0,200,180,.92)';}
      else if(lastSig.type==='long')                           {stateText='SUPPORT REJ';stateColor='rgba(0,220,190,.94)';}
    }
    ctx.font='700 '+Math.round(9*csf)+'px monospace';
    ctx.textAlign='right';ctx.textBaseline='middle';
    ctx.fillStyle=stateColor;
    ctx.fillText(stateText,W-scaleW-8,eyeY);

    /* zero line */
    ctx.strokeStyle='rgba(0,212,255,0.30)';ctx.lineWidth=1;ctx.setLineDash([4,6]);
    ctx.beginPath();ctx.moveTo(plotLeft,mid);ctx.lineTo(plotRight,mid);ctx.stroke();
    ctx.setLineDash([]);

    /* right scale gutter */
    ctx.fillStyle='#05070b';
    ctx.fillRect(W-scaleW,pTop,scaleW,pBot-pTop);
    ctx.strokeStyle='rgba(23,32,45,.88)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(W-scaleW+.5,pTop);ctx.lineTo(W-scaleW+.5,pBot);ctx.stroke();
    ctx.font='700 '+Math.round(8*csf)+'px monospace';
    ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillStyle='rgba(95,115,145,.82)';
    ctx.fillText('+100',W-scaleW+4,plotTop+4);
    ctx.fillStyle='rgba(160,180,210,.88)';
    ctx.fillText('  0',W-scaleW+4,mid);
    ctx.fillStyle='rgba(95,115,145,.82)';
    ctx.fillText('-100',W-scaleW+4,plotBottom-4);

    /* histogram bars */
    if(plotRight>plotLeft&&plotBottom>plotTop&&V&&S.candles.length){
      var cfg2=_cfg();
      var cw2=Math.max(80,W-rp);
      var span=Math.max(1,(V.b-V.a)||1);
      var bwRaw=cw2/span;
      var barW=Math.max(1,bwRaw*0.62);
      var amp2=Math.max(4,(plotBottom-plotTop)*0.48);
      var x2=function(idx){return plotLeft+6+(idx-S.view.start+.5)*bwRaw;};

      ctx.save();
      ctx.beginPath();ctx.rect(plotLeft,plotTop,plotRight-plotLeft,plotBottom-plotTop);ctx.clip();

      for(var i=V.a;i<=V.b&&i<signals.length;i++){
        var sig=signals[i];if(!sig)continue;
        var val=sig.val||0;if(val===0)continue;
        var xx=x2(i);
        var y0=mid;
        var yv=mid-(val/100)*amp2;
        var h2=Math.abs(yv-y0);
        if(h2<1)h2=1;
        var isLong2=(sig.type==='long');
        var isLat2=(sig.kind==='lateral');
        var col=isLong2?cfg2.longColor:cfg2.shortColor;
        var alpha=isLat2?0.5:0.75;
        /* glow effect */
        ctx.shadowColor=col;ctx.shadowBlur=isLat2?4:8;
        ctx.fillStyle=_hexToRgba(col,alpha*(cfg2.histOp||1.1));
        ctx.fillRect(xx-barW/2,Math.min(y0,yv),barW,h2);
        ctx.shadowBlur=0;

        /* dot on top of bar */
        var dotY=isLong2?Math.min(y0,yv)-3:Math.max(y0,yv)+3;
        ctx.beginPath();ctx.arc(xx,dotY,Math.max(2,barW*0.6),0,Math.PI*2);
        ctx.fillStyle=_hexToRgba(col,0.92);ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();

    /* store last PB so overlay knows it */
    window._dvlLastPB=pBot;
  }

  /* ── hex to rgba helper ─────────────────────────────────────────────────── */
  function _hexToRgba(hex,a){
    if(window._dvlRgba)return window._dvlRgba(hex,a);
    var r=parseInt(hex.slice(1,3),16)||0;
    var g=parseInt(hex.slice(3,5),16)||0;
    var b=parseInt(hex.slice(5,7),16)||0;
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  /* ── Expose globals ─────────────────────────────────────────────────────── */
  window.__computeHVNSignals     = computeHVNSignals;
  window.__drawHVNSignalsOverlay = drawHVNSignalsOverlay;
  window.__drawHVNSignalsPanel   = drawHVNSignalsPanel;

  /* ── eye-click handler (header visibility toggle) ───────────────────────── */
  var _wrap=document.getElementById('chartWrap');
  if(_wrap){
    _wrap.addEventListener('mousedown',function(e){
      var h=window._dvnSigEyeHit;if(!h)return;
      var r=_wrap.getBoundingClientRect();
      var x=e.clientX-r.left,y=e.clientY-r.top;
      if(x>=h.x1&&x<=h.x2&&y>=h.y1&&y<=h.y2){
        window._dvlHvnSigTitleHidden=!window._dvlHvnSigTitleHidden;
        if(typeof drawSoon==='function')drawSoon();
      }
    });
  }

  /* ── drawSoon wiring ────────────────────────────────────────────────────── */
  ['hvnSigLateral','hvnSigSens','hvnSigCooldown','hvnSigLongColor',
   'hvnSigShortColor','hvnSigCallouts','hvnSigHistOp'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('input',function(){if(typeof drawSoon==='function')drawSoon();});
  });

})();
</script>
"""

html = html + NEW_SCRIPT
print('[OK] new script block appended')

# ── Write output ──────────────────────────────────────────────────────────────
with open(DEST, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\nDone. {orig_len} → {len(html)} bytes (+{len(html)-orig_len})')
print('File written to:', DEST)
