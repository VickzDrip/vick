# patch_598.py — Beta 0.598
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.597)
#
# FEATURE: Tick Volume oscillator (DVLTickVolume)
#   - Busca barras de 1s do coletor local via /api/ticks/bars
#   - Auto-agrega conforme o zoom (1s → 2s → 5s → 10s → 30s → 60s)
#   - Buy volume verde acima da linha zero, sell volume vermelho abaixo
#   - Alinhamento temporal com os candles visíveis (não por índice)
#   - Atualização ao vivo a cada 3s via setInterval
#   - Painel: ON/OFF
#   - Exportado como window.DVLTickVolume
#   - Adicionado a todos os 5 pontos de integração
#
# VERSION: 0.597 → 0.598

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes  = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    fixes.append(label)
    return html.replace(old, new)

# ── 1. dvlFitOscillatorsToCurrent ────────────────────────────────────────────
html = rep(html,
    '    window.DVLDeltaVolume,\n'
    '    window.DVLTestOscillator,\n'
    '    window.DVLTestOscillator2\n'
    '  ];',

    '    window.DVLDeltaVolume,\n'
    '    window.DVLTickVolume,\n'
    '    window.DVLTestOscillator,\n'
    '    window.DVLTestOscillator2\n'
    '  ];',

    'dvlFitOscillatorsToCurrent add DVLTickVolume'
)

# ── 2. dvlLowerPanelOn ───────────────────────────────────────────────────────
html = rep(html,
    '    const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());\n'
    '    return !!(oi || ls || t1 || t2 || dv);',

    '    const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());\n'
    '    const tv = !!(window.DVLTickVolume && typeof window.DVLTickVolume.on === "function" && window.DVLTickVolume.on());\n'
    '    return !!(oi || ls || t1 || t2 || dv || tv);',

    'dvlLowerPanelOn add tv'
)

# ── 3. activeOscillators push ────────────────────────────────────────────────
html = rep(html,
    '  if(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on()){\n'
    '    activeOscillators.push(window.DVLDeltaVolume);\n'
    '  }\n'
    '  if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()){',

    '  if(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on()){\n'
    '    activeOscillators.push(window.DVLDeltaVolume);\n'
    '  }\n'
    '  if(window.DVLTickVolume && typeof window.DVLTickVolume.on === "function" && window.DVLTickVolume.on()){\n'
    '    activeOscillators.push(window.DVLTickVolume);\n'
    '  }\n'
    '  if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()){',

    'activeOscillators push DVLTickVolume'
)

# ── 4. activeOscillatorCount ─────────────────────────────────────────────────
html = rep(html,
    '      if(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on()) n++;\n'
    '      if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()) n++;',

    '      if(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on()) n++;\n'
    '      if(window.DVLTickVolume && typeof window.DVLTickVolume.on === "function" && window.DVLTickVolume.on()) n++;\n'
    '      if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()) n++;',

    'activeOscillatorCount add tv'
)

# ── 5. activeOscillator() SCALE_BUTTONS ──────────────────────────────────────
html = rep(html,
    '      const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());\n'
    '      const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());\n'
    '      const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());\n'
    '      return !!(oi || ls || dv || t1 || t2);',

    '      const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());\n'
    '      const tv = !!(window.DVLTickVolume && typeof window.DVLTickVolume.on === "function" && window.DVLTickVolume.on());\n'
    '      const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());\n'
    '      const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());\n'
    '      return !!(oi || ls || dv || tv || t1 || t2);',

    'activeOscillator SCALE_BUTTONS add tv'
)

# ── 6. Insert DVLTickVolume IIFE after DVLDeltaVolume script ──────────────────
TICK_VOL_IIFE = r"""

<script id="DVL_BETA_0598_TICK_VOL_JS">
(function(){
  "use strict";

  const STOR_KEY  = "dvlTickVol_v1";
  const DEFAULTS  = { on: true };
  const TICKS_URL = "/api/ticks/bars";
  const NICE_AGG  = [1,2,5,10,15,30,60,120,300,600];

  let state = Object.assign({}, DEFAULTS);
  (function(){ try{ Object.assign(state, JSON.parse(localStorage.getItem(STOR_KEY)||"{}")); }catch(_){} })();
  function save(){ try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){} }

  function on(){ return !!state.on; }
  function setOn(v){ state.on=!!v; save(); }

  const CACHE = { key:null, bars:[], fetchingKey:null, lastFetch:0, rangeKey:null };

  function sym(){ try{ return (window.currentSymbol||"BTCUSDT").toUpperCase(); }catch(_){ return "BTCUSDT"; } }
  function period(){ try{ return window.currentPeriod||"1h"; }catch(_){ return "1h"; } }

  function cacheKey(){ return sym()+"|"+period(); }

  async function fetchBars(symbol, from, to){
    const url = TICKS_URL+"?symbol="+encodeURIComponent(symbol)+"&from="+from+"&to="+to;
    const r = await fetch(url);
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }

  function rangeKey(t0, t1){ return t0+"|"+t1; }

  async function ensureData(t0, t1){
    const key = cacheKey();
    const rk  = rangeKey(t0, t1);
    const now  = Date.now();
    if(CACHE.fetchingKey) return;
    if(key === CACHE.key && rk === CACHE.rangeKey && now - CACHE.lastFetch < 3000) return;
    CACHE.fetchingKey = key+"|"+rk;
    try{
      const bars = await fetchBars(sym(), t0, t1);
      if(!Array.isArray(bars)) throw new Error("bad response");
      CACHE.key      = key;
      CACHE.rangeKey = rk;
      CACHE.bars     = bars;
      CACHE.lastFetch= Date.now();
      if(typeof drawSoon === "function") drawSoon();
    }catch(_){
      // silencioso — coletor pode não estar disponível
    }finally{
      CACHE.fetchingKey = null;
    }
  }

  function aggregateBars(bars, aggMs){
    if(aggMs <= 1000) return bars;
    const map = new Map();
    for(const b of bars){
      const key = Math.floor(b.ts / aggMs) * aggMs;
      let a = map.get(key);
      if(!a){ a={ts:key,buyVol:0,sellVol:0,delta:0,trades:0}; map.set(key,a); }
      a.buyVol  += b.buyVol;
      a.sellVol += b.sellVol;
      a.delta   += b.delta;
      a.trades  += b.trades;
    }
    return Array.from(map.values()).sort((a,b)=>a.ts-b.ts);
  }

  function panelMetrics(padL,padR,top,h,w){
    return { x0:padL, x1:w-padR, y0:top, y1:top+h, w:w-padL-padR, h };
  }

  function oscillatorWindow(){
    try{ return (typeof window.dvlGetOscillatorWindow==="function") ? window.dvlGetOscillatorWindow() : {}; }catch(_){ return {}; }
  }

  function draw(ctx, padL, padR, top, h, w){
    if(!on()) return;

    const m       = panelMetrics(padL, padR, top, h, w);
    const win     = oscillatorWindow();
    const candles = win.candles || [];

    if(!candles.length){
      ctx.fillStyle="rgba(120,145,180,.45)"; ctx.font="11px system-ui";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("Sem candles visíveis", (m.x0+m.x1)/2, m.y0+m.h/2);
      return;
    }

    // Intervalo de tempo visível
    const pMs = candles.length > 1
      ? (Number(candles[1].time) - Number(candles[0].time)) * 1000
      : 60000;
    const t0 = Number(candles[0].time) * 1000;
    const t1 = Number(candles[candles.length-1].time) * 1000 + pMs;

    // Dispara fetch em background se necessário
    ensureData(t0, t1);

    const rawBars = CACHE.bars.filter(b => b.ts >= t0 && b.ts <= t1);

    if(!rawBars.length){
      ctx.fillStyle="rgba(120,145,180,.45)"; ctx.font="11px system-ui";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(CACHE.key ? "Aguardando dados de ticks…" : "Coletor não disponível (/api/ticks)", (m.x0+m.x1)/2, m.y0+m.h/2);
      return;
    }

    // Auto-agregação: mínimo 1.5px por barra
    const rangeMs   = t1 - t0;
    const minAggSec = Math.ceil(rangeMs / 1000 / (m.w / 1.5));
    const aggSec    = NICE_AGG.find(v => v >= minAggSec) || 600;
    const aggMs     = aggSec * 1000;
    const bars      = aggregateBars(rawBars, aggMs);

    if(!bars.length) return;

    // Escala
    let maxVol = 0;
    for(const b of bars){
      if(b.buyVol  > maxVol) maxVol = b.buyVol;
      if(b.sellVol > maxVol) maxVol = b.sellVol;
    }
    if(!maxVol) maxVol = 1;

    const cx   = m.y0 + m.h / 2;   // linha zero
    const half = m.h / 2 * 0.92;
    const barW = Math.max(1, aggMs / rangeMs * m.w);

    // Barras
    for(const b of bars){
      const x   = m.x0 + (b.ts - t0) / rangeMs * m.w;
      const bh  = Math.max(1, b.buyVol  / maxVol * half);
      const sh  = Math.max(1, b.sellVol / maxVol * half);

      // Buy (verde, acima da linha zero)
      ctx.fillStyle = "rgba(46,213,115,.85)";
      ctx.fillRect(x, cx - bh, Math.max(1, barW - 1), bh);

      // Sell (vermelho, abaixo da linha zero)
      ctx.fillStyle = "rgba(255,71,87,.85)";
      ctx.fillRect(x, cx, Math.max(1, barW - 1), sh);
    }

    // Linha zero
    ctx.strokeStyle = "rgba(120,145,180,.4)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(m.x0, cx);
    ctx.lineTo(m.x1, cx);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle   = "rgba(120,145,180,.78)";
    ctx.font        = "760 8px system-ui";
    ctx.textAlign   = "left";
    ctx.textBaseline= "bottom";
    const aggLabel  = aggSec >= 60 ? (aggSec/60)+"m" : aggSec+"s";
    ctx.fillText("TICK VOL "+aggLabel+" · BUY/SELL", m.x0 + 8, m.y1 - 5);
  }

  function fitToCurrent(){ CACHE.rangeKey = null; CACHE.lastFetch = 0; }

  // ── Painel ────────────────────────────────────────────────────────────────
  let panel = null;

  function ensurePanel(){
    if(panel && document.contains(panel)) return;
    panel = document.createElement("div");
    panel.className = "dvl-vt-panel";
    panel.style.cssText = "display:none;position:fixed;z-index:9999;top:60px;right:60px;width:220px;";
    panel.innerHTML = `
      <div class="dvl-vt-header">
        <span class="dvl-vt-title">Tick Volume</span>
        <button class="dvl-vt-close" id="dvlTvClose">✕</button>
      </div>
      <div class="dvl-vt-body" id="dvlTvBody"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector("#dvlTvClose").addEventListener("click", ()=>{ panel.style.display="none"; });
  }

  function openPanel(){ ensurePanel(); renderPanel(); panel.style.display=""; }

  function renderPanel(){
    ensurePanel();
    panel.querySelector("#dvlTvBody").innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlTvOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Info</span></div>
        <div style="padding:6px 8px;font-size:10px;color:rgba(120,145,180,.8);line-height:1.5">
          Barras de 1s via /api/ticks<br>
          Auto-agrega conforme o zoom<br>
          Verde = buy · Vermelho = sell
        </div>
      </div>
    `;
    const cb = panel.querySelector("#dvlTvOn");
    if(cb) cb.addEventListener("change", ()=>{ state.on=cb.checked; save(); });
  }

  // ── Live poll: atualiza a cada 3s ────────────────────────────────────────
  setInterval(()=>{
    if(!on()) return;
    CACHE.lastFetch = 0; // força re-fetch na próxima draw
    if(typeof drawSoon === "function") drawSoon();
  }, 3000);

  window.DVLTickVolume = {
    version:"0.598",
    on,
    setOn,
    draw,
    refresh: fitToCurrent,
    fitToCurrent,
    reset: fitToCurrent,
    openPanel,
    get state(){ return Object.assign({}, state); },
    get cache(){ return Object.assign({}, CACHE, { bars:(CACHE.bars||[]).slice() }); }
  };
})();
</script>"""

html = rep(html,
    '  window.DVLDeltaVolume = {\n'
    '    version:"0.596",\n'
    '    on,\n'
    '    setOn,\n'
    '    draw,\n'
    '    refresh:function(){ return ensureData(true); },\n'
    '    fitToCurrent,\n'
    '    reset:fitToCurrent,\n'
    '    get state(){ return Object.assign({}, state); },\n'
    '    get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data||[]).slice() }); }\n'
    '  };\n'
    '})();\n'
    '</script>',

    '  window.DVLDeltaVolume = {\n'
    '    version:"0.596",\n'
    '    on,\n'
    '    setOn,\n'
    '    draw,\n'
    '    refresh:function(){ return ensureData(true); },\n'
    '    fitToCurrent,\n'
    '    reset:fitToCurrent,\n'
    '    get state(){ return Object.assign({}, state); },\n'
    '    get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data||[]).slice() }); }\n'
    '  };\n'
    '})();\n'
    '</script>'
    + TICK_VOL_IIFE,

    'insert DVLTickVolume IIFE after DVLDeltaVolume'
)

# ── Version bump 0.597 → 0.598 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.597";',
    'const DVL_APP_VERSION = "Beta 0.598";',
    'DVL_APP_VERSION 0.597→0.598'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: Delta Volume nao carregava — CACHE.key setado antes do fetch bloqueava retry; sem drawSoon causava tela vazia apos fetch." },',
    '{ version: DVL_APP_VERSION, note: "Tick Volume: oscilador buy/sell por barras de 1s via coletor local (/api/ticks). Auto-agrega conforme zoom. Verde=buy, Vermelho=sell." },\n'
    '  { version: "Beta 0.597", note: "Bugfix: Delta Volume nao carregava dados." },',
    'DVL_CHANGELOG 0.598'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.597</div>',
    '<div class="beta" id="versionBadge">BETA 0.598</div>',
    'versionBadge 0.597→0.598'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.597</title>',
    '<title>DVL Binance Live — Beta 0.598</title>',
    'title 0.597→0.598'
)

# ── Result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  ', e)
    print('Aborting write.')
    sys.exit(1)
else:
    print('All checks passed.')

print('Applied (%d fixes):' % len(fixes))
for f in fixes: print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

print()
print('Written to', DST)
print('Total lines after patch: %d' % (html.count('\n') + 1))
