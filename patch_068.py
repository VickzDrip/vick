#!/usr/bin/env python3
# patch_068.py — Remove HVN Signals oscillator panel; pure chart-overlay signals only (Beta 0.068)

import re, sys

SRC = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

orig_len = len(html)

def replace_once(old, new, ctx=''):
    global html
    if old not in html:
        print(f'[MISS] {ctx}')
        return False
    html = html.replace(old, new, 1)
    print(f'[OK]   {ctx}')
    return True

# ── 1. CSS: remove #hvnSignalsResizeHandle from resize handle rule ─────────────
replace_once(
    '#flowResizeHandle,#hvnResizeHandle,#hvnSignalsResizeHandle{',
    '#flowResizeHandle,#hvnResizeHandle{',
    'CSS resize handle'
)

# ── 2. HTML: remove hvnSignalsResizeHandle div ────────────────────────────────
replace_once(
    '\n        <div id="hvnSignalsResizeHandle" style="display:none" title="Drag to resize HVN Signals panel"></div>',
    '',
    'HTML resize handle div'
)

# ── 3. Module-level: remove _hvnSignalsH variable ────────────────────────────
replace_once(
    "let _hvnSignalsH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_hvnSignH'));return(v>=80&&v<=240)?v:110;}catch(e){return 110;}})();",
    '',
    '_hvnSignalsH variable'
)

# ── 4. PB calculation: remove _hvnSignH ──────────────────────────────────────
replace_once(
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;const _hvnSignH=(S.inds.hvnSignals&&S.candles.length)?_hvnSignalsH:0;PB=10+(_hvnSignH?_hvnSignH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);',
    'const _clarH=(S.inds.hvnClarity&&S.candles.length)?_hvnClarityH:0;const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;PB=10+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);',
    'PB calculation'
)

# ── 5. Resize handle positioning: remove _srh block ──────────────────────────
replace_once(
    "const _srh=el('hvnSignalsResizeHandle');if(_srh){_srh.style.display=_hvnSignH>0?'block':'none';_srh.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+_hvnSignH-PANEL_GAP/2)+'px';}",
    '',
    'resize handle positioning'
)

# ── 6. Draw loop: remove panel draw call (keep overlay draw call) ─────────────
replace_once(
    "if(_hvnSignH>0&&window.__drawHVNSignalsPanel)safeLayer('HVN Signals Panel',()=>window.__drawHVNSignalsPanel(ctx,W,H,V,_hvnSignH,_fah,_clarH));resetCtxState(ctx);if(_fah>0",
    "if(_fah>0",
    'draw loop panel call removal'
)

# ── 7. oscPanelHeights: remove signH ─────────────────────────────────────────
replace_once(
    'function oscPanelHeights(){const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;const signH=(window.S&&S.inds&&S.inds.hvnSignals&&S.candles&&S.candles.length)?_hvnSignalsH:0;return{clarH,flowH,signH};}',
    'function oscPanelHeights(){const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;return{clarH,flowH};}',
    'oscPanelHeights'
)

# ── 8. oscScaleHit: remove hvnSignals branch ─────────────────────────────────
replace_once(
    "function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;const{clarH,flowH,signH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}if(signH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const flowOff=flowH>0?flowH+PANEL_GAP:0;const sb=H-10-clarOff-flowOff,st=sb-signH;if(y>=st&&y<=sb)return 'hvnSignals';}return null;}",
    "function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;const{clarH,flowH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}return null;}",
    'oscScaleHit'
)

# ── 9. oscPanelAtY: remove hvnSignals branch ─────────────────────────────────
replace_once(
    "function oscPanelAtY(y,H){const{clarH,flowH,signH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}if(signH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const flowOff=flowH>0?flowH+PANEL_GAP:0;const sb=H-10-clarOff-flowOff,st=sb-signH;if(y>=st&&y<=sb)return 'hvnSignals';}return null;}",
    "function oscPanelAtY(y,H){const{clarH,flowH}=oscPanelHeights();if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}return null;}",
    'oscPanelAtY'
)

# ── 10. mousemove: revert ph back to 2-panel version ─────────────────────────
replace_once(
    "const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):S.oscDrag.kind==='hvnSignals'?(_hvnSignalsH||110):(_hvnClarityH||166);",
    "const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);",
    'mousemove ph'
)

# ── 11. touchmove: revert ph back to 2-panel version ─────────────────────────
replace_once(
    "const ph=touchState.oscKind==='flow'?(_flowAccelH||120):touchState.oscKind==='hvnSignals'?(_hvnSignalsH||110):(_hvnClarityH||166);",
    "const ph=touchState.oscKind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);",
    'touchmove ph'
)

# ── 12. Remove hvnSignalsResizeHandle IIFE wiring ────────────────────────────
replace_once(
    "(()=>{let _srhDrag=null;const srh=el('hvnSignalsResizeHandle');if(!srh)return;srh.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();srh.setPointerCapture(e.pointerId);_srhDrag={y:e.clientY,h:_hvnSignalsH};srh.classList.add('active');});srh.addEventListener('pointermove',e=>{if(!_srhDrag)return;_hvnSignalsH=clamp(_srhDrag.h-(e.clientY-_srhDrag.y),80,240);drawSoon();});srh.addEventListener('pointerup',()=>{if(!_srhDrag)return;_srhDrag=null;srh.classList.remove('active');try{localStorage.setItem('dvl_hvnSignH',Math.round(_hvnSignalsH));}catch(_){}});srh.addEventListener('pointercancel',()=>{_srhDrag=null;srh.classList.remove('active');});})();",
    '',
    'hvnSignalsResizeHandle IIFE'
)

# ── 13. Update indicator card settings ───────────────────────────────────────
old_card_settings = '''          <div class="ind-settings" id="settings-hvnSignals">
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
          </div>'''

new_card_settings = '''          <div class="ind-settings" id="settings-hvnSignals">
            <div style="font-size:9px;color:#00d4ff;font-weight:700;letter-spacing:.08em;margin-bottom:6px;opacity:.8;">SINAIS</div>
            <label class="kv" style="cursor:pointer;"><span class="k">Mostrar LONG</span><input type="checkbox" id="hvnSigShowLong" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <label class="kv" style="cursor:pointer;"><span class="k">Mostrar SHORT</span><input type="checkbox" id="hvnSigShowShort" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">DETECÇÃO</div>
            <div class="kv"><span class="k">Sensibilidade pavio (%)</span><input class="num" id="hvnSigSens" type="number" min="0" max="50" step="5" value="20" style="width:52px"></div>
            <div class="kv"><span class="k">Rejeição mín. pavio (%)</span><input class="num" id="hvnSigMinWick" type="number" min="5" max="80" step="5" value="25" style="width:52px"></div>
            <div class="kv"><span class="k">Cooldown candles</span><input class="num" id="hvnSigCooldown" type="number" min="1" max="50" step="1" value="5" style="width:52px"></div>
            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">LATERALIZAÇÃO</div>
            <label class="kv" style="cursor:pointer;"><span class="k">Sinal após consolidação</span><input type="checkbox" id="hvnSigAllowLateral" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <div class="kv"><span class="k">Máx. candles na zona</span><input class="num" id="hvnSigLateral" type="number" min="1" max="20" step="1" value="5" style="width:52px"></div>
            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">VISUAL</div>
            <div class="kv"><span class="k">Tamanho label</span><select class="select" id="hvnSigLabelSize" style="width:72px"><option value="small">Small</option><option value="medium" selected>Medium</option><option value="large">Large</option></select></div>
            <div class="kv"><span class="k">Estilo label</span><select class="select" id="hvnSigLabelStyle" style="width:72px"><option value="both" selected>Label+Seta</option><option value="label">Só Label</option><option value="arrow">Só Seta</option></select></div>
            <div class="kv"><span class="k">Cor LONG</span><input type="color" id="hvnSigLongColor" value="#00d2c8"></div>
            <div class="kv"><span class="k">Cor SHORT</span><input type="color" id="hvnSigShortColor" value="#ff4a64"></div>
            <div class="hint">Sinais LONG/SHORT por rejeição de pavio nas zonas HVN. Sem painel — apenas marcadores no gráfico.</div>
          </div>'''

replace_once(old_card_settings, new_card_settings, 'indicator card settings')

# ── 14. Replace entire DVL_BETA_HVN_SIGNALS script block ─────────────────────
# Find start and end of the block
start_marker = '<script id="DVL_BETA_HVN_SIGNALS">'
end_marker = '</script>'

start_idx = html.find(start_marker)
if start_idx == -1:
    print('[MISS] script block start not found')
    sys.exit(1)

# Find the closing </script> after the start
end_idx = html.find(end_marker, start_idx + len(start_marker))
if end_idx == -1:
    print('[MISS] script block end not found')
    sys.exit(1)

old_script_block = html[start_idx:end_idx + len(end_marker)]

NEW_SCRIPT = '''<script id="DVL_BETA_HVN_SIGNALS">
/* HVN Signals — Beta 0.068
   Pure chart-overlay indicator: detects LONG/SHORT when a candle wick touches an
   HVN zone then the candle closes back out (rejection). No oscillator, no panel,
   no histogram — only LONG/SHORT labels drawn directly on the main chart canvas.

   Signal rules:
     SHORT: upper wick >= zone.lo  AND  close < zone.lo + tolerance  (resistance rejection)
     LONG:  lower wick <= zone.hi  AND  close > zone.hi - tolerance  (support rejection)
   Lateral: N+ candles with body overlapping zone → next rejection also fires a signal. */
(function(){
  'use strict';

  /* ── Config ──────────────────────────────────────────────────────────────── */
  function _cfg(){
    var g=function(id){return document.getElementById(id);};
    var labelSizeMap={small:8,medium:10,large:12};
    var lsKey=g('hvnSigLabelSize')?.value||'medium';
    return {
      showLong  : g('hvnSigShowLong')?.checked !== false,
      showShort : g('hvnSigShowShort')?.checked !== false,
      sens      : Math.max(0,Math.min(50,parseFloat(g('hvnSigSens')?.value)||20))/100,
      minWickPct: Math.max(0,Math.min(80,parseFloat(g('hvnSigMinWick')?.value)||25))/100,
      cooldown  : Math.max(1,parseInt(g('hvnSigCooldown')?.value)||5),
      allowLat  : g('hvnSigAllowLateral')?.checked !== false,
      lateralMax: Math.max(1,parseInt(g('hvnSigLateral')?.value)||5),
      labelFs   : labelSizeMap[lsKey]||10,
      labelStyle: g('hvnSigLabelStyle')?.value||'both',
      longColor : g('hvnSigLongColor')?.value||'#00d2c8',
      shortColor: g('hvnSigShortColor')?.value||'#ff4a64',
    };
  }

  /* ── Signal computation ───────────────────────────────────────────────────── */
  function computeHVNSignals(){
    if(!window.S||!S.inds||!S.inds.hvnSignals){if(window.S)S.hvnSignals=[];return;}
    var cs=S.candles;
    if(!cs||cs.length<4){S.hvnSignals=[];return;}
    var zones=window.__hvnZones?.()||[];
    if(!zones.length){S.hvnSignals=[];return;}

    var cfg=_cfg();
    var n=cs.length;
    // signals[i] = null | { type:'long'|'short', kind:'rejection'|'lateral', zone, wickPct }
    var signals=new Array(n).fill(null);

    for(var zi=0;zi<zones.length;zi++){
      var z=zones[zi];
      var zSize=z.hi-z.lo;
      if(zSize<=0)continue;

      var tol=zSize*cfg.sens;          // how far inside the zone the close may be
      var lateralCount=0;
      var lastSignalIdx=-999;

      for(var i=0;i<n;i++){
        var c=cs[i];
        var bodyLo=Math.min(c.o,c.c);
        var bodyHi=Math.max(c.o,c.c);
        var candleRange=c.h-c.l;
        if(candleRange<=0){lateralCount=0;continue;}

        var bodyInZone=(bodyHi>=z.lo&&bodyLo<=z.hi);

        if(bodyInZone){
          // Body is inside zone — count as lateral candle
          lateralCount++;
          continue;
        }

        var coolOK=(i-lastSignalIdx>=cfg.cooldown);
        var latOK=(cfg.allowLat||lateralCount===0);

        // ── SHORT: upper wick enters zone, close back below ──────────────────
        if(cfg.showShort&&c.h>=z.lo&&c.c<z.lo+tol&&bodyLo<z.lo){
          var upperWick=c.h-Math.max(c.o,c.c);
          var wickPct=upperWick/candleRange;
          if(wickPct>=cfg.minWickPct&&coolOK&&latOK){
            var isLat=(lateralCount>=1);
            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){
              signals[i]={type:'short',kind:isLat?'lateral':'rejection',
                          zone:z,wickPct:wickPct,_strength:wickPct};
            }
            lastSignalIdx=i;
          }
        }
        // ── LONG: lower wick enters zone, close back above ───────────────────
        else if(cfg.showLong&&c.l<=z.hi&&c.c>z.hi-tol&&bodyHi>z.hi){
          var lowerWick=Math.min(c.o,c.c)-c.l;
          var wickPct=lowerWick/candleRange;
          if(wickPct>=cfg.minWickPct&&coolOK&&latOK){
            var isLat=(lateralCount>=1);
            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){
              signals[i]={type:'long',kind:isLat?'lateral':'rejection',
                          zone:z,wickPct:wickPct,_strength:wickPct};
            }
            lastSignalIdx=i;
          }
        }

        // Reset lateral count any time body is clearly outside the zone
        lateralCount=0;
      }
    }

    S.hvnSignals=signals;
  }

  /* ── Rounded-rect helper ─────────────────────────────────────────────────── */
  function _rr(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  /* ── Draw one signal ─────────────────────────────────────────────────────── */
  function _drawSignal(ctx,sig,c,cx,sc,W,H,cfg,PB){
    var PT=8;
    var isLong=(sig.type==='long');
    var bc=isLong?cfg.longColor:cfg.shortColor;
    var glowC=isLong?'rgba(0,200,190,.4)':'rgba(255,50,80,.4)';
    var fillC=isLong?'rgba(0,50,46,.58)':'rgba(76,10,22,.58)';
    var textC=isLong?'rgba(0,255,230,.97)':'rgba(255,100,118,.97)';
    var label=isLong?'LONG':'SHORT';
    var csf=window.innerWidth>900?1.35:1.0;
    var fs=Math.round(cfg.labelFs*csf);
    var showLabel=(cfg.labelStyle==='label'||cfg.labelStyle==='both');
    var showArrow=(cfg.labelStyle==='arrow'||cfg.labelStyle==='both');

    ctx.font='bold '+fs+'px monospace';
    var tW=ctx.measureText(label).width;
    var lW=showLabel?Math.ceil(tW)+16:0;
    var lH=showLabel?Math.round(fs*1.9):0;
    var rad=4;
    var tSz=Math.round(4*csf);  // triangle half-base
    var triH=Math.round(5*csf); // triangle height
    var gap=3;
    var space=2;

    if(isLong){
      var anchorY=sc.y(c.l);
      var triTipY=anchorY+gap;
      var triBaseY=triTipY+triH;
      var lY=showLabel?triBaseY+space:triTipY;
      if(showLabel&&lY+lH>H-PB-2)return;
      if(!showLabel&&triTipY+triH>H-PB-2)return;
      var lX=cx-lW/2;

      ctx.shadowColor=glowC;ctx.shadowBlur=7;
      if(showArrow){
        ctx.fillStyle=bc;
        ctx.beginPath();
        ctx.moveTo(cx,triTipY);ctx.lineTo(cx-tSz,triBaseY);ctx.lineTo(cx+tSz,triBaseY);
        ctx.closePath();ctx.fill();
      }
      ctx.shadowBlur=0;
      if(showLabel){
        _rr(ctx,lX,lY,lW,lH,rad);
        ctx.fillStyle=fillC;ctx.fill();
        ctx.strokeStyle=bc;ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=textC;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(label,cx,lY+lH/2);
      }

    } else {
      var anchorY=sc.y(c.h);
      var triTipY=anchorY-gap;
      var triBaseY=triTipY-triH;
      var lY=showLabel?triBaseY-space-lH:triBaseY-triH;
      if(showLabel&&lY<PT+2)return;
      if(!showLabel&&triTipY-triH<PT+2)return;
      var lX=cx-lW/2;

      ctx.shadowColor=glowC;ctx.shadowBlur=7;
      if(showArrow){
        ctx.fillStyle=bc;
        ctx.beginPath();
        ctx.moveTo(cx,triTipY);ctx.lineTo(cx-tSz,triBaseY);ctx.lineTo(cx+tSz,triBaseY);
        ctx.closePath();ctx.fill();
      }
      ctx.shadowBlur=0;
      if(showLabel){
        _rr(ctx,lX,lY,lW,lH,rad);
        ctx.fillStyle=fillC;ctx.fill();
        ctx.strokeStyle=bc;ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=textC;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(label,cx,lY+lH/2);
      }
    }
    ctx.shadowBlur=0;
  }

  /* ── Chart overlay draw ──────────────────────────────────────────────────── */
  function drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw){
    if(!window.S||!S.inds.hvnSignals||!S.candles.length)return;
    var signals=S.hvnSignals;
    if(!signals||!signals.length)return;
    var cfg=_cfg();
    var rp=window.RP?window.RP():68;
    var right=W-rp;
    var PB=window._dvlLastPB||10;
    ctx.save();
    ctx.beginPath();ctx.rect(0,8,right,H-8-PB);ctx.clip();
    ctx.setLineDash([]);
    for(var i=V.a;i<=V.b&&i<signals.length;i++){
      var sig=signals[i];if(!sig)continue;
      var c=S.candles[i];if(!c)continue;
      var cx=x(i);
      if(cx<-40||cx>right+40)continue;
      _drawSignal(ctx,sig,c,cx,sc,W,H,cfg,PB);
    }
    ctx.restore();
  }

  /* ── Exports ─────────────────────────────────────────────────────────────── */
  window.__computeHVNSignals     = computeHVNSignals;
  window.__drawHVNSignalsOverlay = drawHVNSignalsOverlay;

  /* ── Redraw on settings change ───────────────────────────────────────────── */
  ['hvnSigShowLong','hvnSigShowShort','hvnSigSens','hvnSigMinWick','hvnSigCooldown',
   'hvnSigAllowLateral','hvnSigLateral','hvnSigLabelSize','hvnSigLabelStyle',
   'hvnSigLongColor','hvnSigShortColor'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('input',function(){if(typeof drawSoon==='function')drawSoon();});
  });

})();
</script>'''

html = html[:start_idx] + NEW_SCRIPT + html[end_idx + len(end_marker):]
print('[OK]   DVL_BETA_HVN_SIGNALS script block replaced')

# ── 15. Version bump 0.067 → 0.068 ───────────────────────────────────────────
html = html.replace('Beta 0.067', 'Beta 0.068')
print(f'[OK]   version bump: {html.count("Beta 0.068")} occurrences')

# ── 16. Changelog ─────────────────────────────────────────────────────────────
old_log = 'Beta 0.068\n  - New indicator: HVN Signals'
new_log = ('Beta 0.068\n'
           '  - HVN Signals refactor: pure chart-overlay only — no oscillator, no panel, no histogram.\n'
           '  - Removed _hvnSignalsH, PB offset, resize handle, oscPanelHeights/ScaleHit/AtY extensions.\n'
           '  - Kept: computeHVNSignals + drawHVNSignalsOverlay (LONG/SHORT labels + arrows on chart).\n'
           '  - Indicator card settings updated: Show Long/Short, sensitivity, min wick %, cooldown,\n'
           '    lateral toggle/max, label size/style/color.')
replace_once(old_log, new_log, 'changelog')

# ── Write ──────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\nDone. {orig_len} → {len(html)} bytes ({len(html)-orig_len:+})')
