# patch_596.py — Beta 0.596
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.595)
#
# FEATURE: Delta Volume oscillator
#   - Fetches Binance Futures 1m klines (3 pages × 1500 = up to 4500 candles)
#   - Groups by parent period: Math.floor(t1m / pMs) * pMs
#   - Per parent candle: buy=sum(takerBuyBase), sell=sum(vol-takerBuyBase), delta=buy-sell
#   - Draws symmetric histogram: positive delta = green bar above 0, negative = red bar below 0
#   - Optional MA over delta line (default maLen=0 = disabled)
#   - Settings panel: ON/OFF + MA Length
#   - Registered as window.DVLDeltaVolume
#   - Added to all 5 integration points
#
# VERSION: 0.595 → 0.596

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

# ── 1. dvlFitOscillatorsToCurrent: add DVLDeltaVolume ────────────────────────
html = rep(html,
    'function dvlFitOscillatorsToCurrent(){\n'
    '  const list = [\n'
    '    window.DVLOpenInterestOscillator,\n'
    '    window.DVLLongShortOscillator,\n'
    '    window.DVLTestOscillator,\n'
    '    window.DVLTestOscillator2\n'
    '  ];',

    'function dvlFitOscillatorsToCurrent(){\n'
    '  const list = [\n'
    '    window.DVLOpenInterestOscillator,\n'
    '    window.DVLLongShortOscillator,\n'
    '    window.DVLDeltaVolume,\n'
    '    window.DVLTestOscillator,\n'
    '    window.DVLTestOscillator2\n'
    '  ];',

    'dvlFitOscillatorsToCurrent add DVLDeltaVolume'
)

# ── 2. dvlLowerPanelOn: add dv check ─────────────────────────────────────────
html = rep(html,
    '    const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());\n'
    '    const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());\n'
    '    return !!(oi || ls || t1 || t2);\n'
    '  }catch(_){\n'
    '    return false;\n'
    '  }\n'
    '}\n'
    '\n'
    'function dvlMainTimeScaleHeight()',

    '    const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());\n'
    '    const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());\n'
    '    const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());\n'
    '    return !!(oi || ls || t1 || t2 || dv);\n'
    '  }catch(_){\n'
    '    return false;\n'
    '  }\n'
    '}\n'
    '\n'
    'function dvlMainTimeScaleHeight()',

    'dvlLowerPanelOn add dv'
)

# ── 3. activeOscillators push block: add DVLDeltaVolume ──────────────────────
html = rep(html,
    '  if(window.DVLLongShortOscillator && typeof window.DVLLongShortOscillator.on === "function" && window.DVLLongShortOscillator.on()){\n'
    '    activeOscillators.push(window.DVLLongShortOscillator);\n'
    '  }\n'
    '  if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()){\n'
    '    activeOscillators.push(window.DVLTestOscillator);\n'
    '  }',

    '  if(window.DVLLongShortOscillator && typeof window.DVLLongShortOscillator.on === "function" && window.DVLLongShortOscillator.on()){\n'
    '    activeOscillators.push(window.DVLLongShortOscillator);\n'
    '  }\n'
    '  if(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on()){\n'
    '    activeOscillators.push(window.DVLDeltaVolume);\n'
    '  }\n'
    '  if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()){\n'
    '    activeOscillators.push(window.DVLTestOscillator);\n'
    '  }',

    'activeOscillators push DVLDeltaVolume'
)

# ── 4. activeOscillatorCount: add dv ─────────────────────────────────────────
html = rep(html,
    '      if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()) n++;\n'
    '      if(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on()) n++;\n'
    '    }catch(_){}\n'
    '    return n;\n'
    '  }\n'
    '\n'
    '  function stackDividerY(',

    '      if(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on()) n++;\n'
    '      if(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on()) n++;\n'
    '      if(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on()) n++;\n'
    '    }catch(_){}\n'
    '    return n;\n'
    '  }\n'
    '\n'
    '  function stackDividerY(',

    'activeOscillatorCount add dv'
)

# ── 5. activeOscillator() in SCALE_BUTTONS_PANEL1_DOCK: add dv ───────────────
html = rep(html,
    '      const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());\n'
    '      const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());\n'
    '      return !!(oi || ls || t1 || t2);\n'
    '    }catch(_){\n'
    '      return false;\n'
    '    }\n'
    '  }\n'
    '\n'
    '  function panel1Height(',

    '      const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());\n'
    '      const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());\n'
    '      const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());\n'
    '      return !!(oi || ls || dv || t1 || t2);\n'
    '    }catch(_){\n'
    '      return false;\n'
    '    }\n'
    '  }\n'
    '\n'
    '  function panel1Height(',

    'activeOscillator SCALE_BUTTONS add dv'
)

# ── 6. Insert Delta Volume IIFE after L/S script ─────────────────────────────
DELTA_VOL_IIFE = r"""

<script id="DVL_BETA_0596_DELTA_VOL_JS">
(function(){
  "use strict";

  const STOR_KEY = "dvlDeltaVol_v1";
  const DEFAULTS = { on:true, maLen:0 };

  let state = Object.assign({}, DEFAULTS);
  (function(){ try{ const s=JSON.parse(localStorage.getItem(STOR_KEY)||"{}"); Object.assign(state,s); }catch(_){} })();
  function save(){ try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){} }

  function on(){ return !!state.on; }
  function setOn(v){ state.on=!!v; save(); }

  const CACHE = { key:null, data:[], fetching:false };

  function sym(){ try{ return (window.currentSymbol||"BTCUSDT").toUpperCase(); }catch(_){ return "BTCUSDT"; } }
  function period(){ try{ return window.currentPeriod||"1h"; }catch(_){ return "1h"; } }

  function periodMs(tf){
    const map={ "1m":60000,"3m":180000,"5m":300000,"15m":900000,"30m":1800000,
                "1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"8h":28800000,
                "12h":43200000,"1d":86400000,"3d":259200000,"1w":604800000 };
    return map[tf] || 3600000;
  }

  function cacheKey(){ return sym()+"|"+period(); }

  async function fetchPage(symbol, limit, endTime){
    const base = (typeof BINANCE !== "undefined" ? BINANCE : "https://fapi.binance.com");
    let url = base+"/fapi/v1/klines?symbol="+encodeURIComponent(symbol)+"&interval=1m&limit="+limit;
    if(endTime) url += "&endTime="+endTime;
    const r = await fetch(url);
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }

  function parseKlines(rows, pMs){
    const map = new Map();
    for(const k of rows){
      const t1m = Number(k[0]);
      const pKey = Math.floor(t1m / pMs) * pMs;
      let b = map.get(pKey);
      if(!b){ b={ t:pKey, buy:0, sell:0, delta:0 }; map.set(pKey, b); }
      const vol = parseFloat(k[5]);
      const buyVol = parseFloat(k[9]);
      const sellVol = vol - buyVol;
      b.buy += buyVol;
      b.sell += sellVol;
      b.delta += (buyVol - sellVol);
    }
    return map;
  }

  async function ensureData(force){
    const key = cacheKey();
    if(!force && CACHE.key === key) return;
    if(CACHE.fetching) return;
    CACHE.fetching = true;
    CACHE.key = key;
    const sym_ = sym();
    const pMs = periodMs(period());
    try{
      const LIMIT = 1500;
      const pages = [];
      let endTime = null;
      for(let p=0; p<3; p++){
        const rows = await fetchPage(sym_, LIMIT, endTime);
        if(!rows || !rows.length) break;
        pages.push(...rows);
        endTime = Number(rows[0][0]) - 1;
        if(rows.length < LIMIT) break;
      }
      if(CACHE.key !== key){ CACHE.fetching=false; return; }
      const map = parseKlines(pages, pMs);
      const sorted = Array.from(map.values()).sort((a,b)=>a.t-b.t);
      CACHE.data = sorted;
    }catch(e){
      if(CACHE.key === key) CACHE.data = [];
    }finally{
      CACHE.fetching = false;
    }
  }

  function panelMetrics(padL,padR,top,h,w){
    return { x0:padL, x1:w-padR, y0:top, y1:top+h, w:w-padL-padR, h };
  }

  function oscillatorWindow(){
    try{ return (typeof window.dvlGetOscillatorWindow==="function") ? window.dvlGetOscillatorWindow() : {}; }catch(_){ return {}; }
  }

  function xForIndex(i, m, win){
    const total = (win.candles||[]).length;
    if(!total) return m.x0;
    const cw = m.w / total;
    return m.x0 + (i + 0.5) * cw;
  }

  function yMap(m, val, sc){
    const { min, max } = sc;
    const range = max - min || 1;
    return m.y1 - ((val - min) / range) * m.h;
  }

  function barScale(data){
    if(!data.length) return { min:0, max:1, absMax:1 };
    let absMax = 0;
    for(const d of data) if(Math.abs(d.delta)>absMax) absMax=Math.abs(d.delta);
    if(!absMax) absMax=1;
    return { min:-absMax*1.05, max:absMax*1.05, absMax };
  }

  function valueAt(arr, t){
    let lo=0, hi=arr.length-1;
    while(lo<=hi){ const mid=(lo+hi)>>1; if(arr[mid].t===t) return arr[mid]; else if(arr[mid].t<t) lo=mid+1; else hi=mid-1; }
    return null;
  }

  function draw(ctx, padL, padR, top, h, w){
    if(!CACHE.fetching && on()) ensureData(false);

    const m = panelMetrics(padL, padR, top, h, w);
    const win = oscillatorWindow();
    const view = win.candles || [];

    if(!view.length || !CACHE.data.length){
      ctx.fillStyle = "rgba(120,145,180,.45)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(CACHE.fetching ? "Loading Delta Volume…" : "No delta data", (m.x0+m.x1)/2, m.y0+m.h/2);
      return;
    }

    const visibleData = [];
    for(const c of view){
      const d = valueAt(CACHE.data, Number(c.time));
      if(d) visibleData.push(d);
    }
    const sc = barScale(visibleData.length ? visibleData : CACHE.data.slice(-160));
    const zero = yMap(m, 0, sc);

    const total = view.length;
    const cw = total > 0 ? m.w / total : 8;
    const bw = Math.max(1, cw * 0.72);

    // bars
    for(let i=0; i<view.length; i++){
      const d = valueAt(CACHE.data, Number(view[i].time));
      if(!d) continue;
      const xx = m.x0 + (i + 0.5) * cw;
      const yy = yMap(m, d.delta, sc);
      const barTop = Math.min(yy, zero);
      const barH = Math.max(1, Math.abs(yy - zero));
      ctx.fillStyle = d.delta >= 0 ? "rgba(46,213,115,.82)" : "rgba(255,71,87,.82)";
      ctx.fillRect(xx - bw/2, barTop, bw, barH);
    }

    // zero line
    ctx.strokeStyle = "rgba(120,145,180,.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(m.x0, zero);
    ctx.lineTo(m.x1, zero);
    ctx.stroke();
    ctx.setLineDash([]);

    // MA line
    const maLen = Math.max(2, Math.round(state.maLen)||0);
    if(state.maLen >= 2 && CACHE.data.length >= 2){
      const allDeltas = CACHE.data.map(d=>d.delta);
      const prefix = new Array(allDeltas.length+1).fill(0);
      for(let i=0;i<allDeltas.length;i++) prefix[i+1]=prefix[i]+allDeltas[i];
      const idxMap = new Map(CACHE.data.map((d,i)=>[d.t,i]));
      ctx.beginPath();
      ctx.strokeStyle = "#ffd32a";
      ctx.lineWidth = 1.5;
      let started = false;
      for(let i=0;i<view.length;i++){
        const d = valueAt(CACHE.data, Number(view[i].time));
        if(!d) continue;
        const idx = idxMap.get(d.t);
        if(idx===undefined) continue;
        const st = Math.max(0, idx-maLen+1);
        const avg = (prefix[idx+1]-prefix[st])/(idx-st+1);
        const xx = m.x0 + (i+0.5)*cw;
        const yy = yMap(m, avg, sc);
        if(!started){ ctx.moveTo(xx,yy); started=true; } else ctx.lineTo(xx,yy);
      }
      if(started) ctx.stroke();
    }

    // label
    ctx.fillStyle = "rgba(120,145,180,.78)";
    ctx.font = "760 8px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("DELTA VOL 1m", m.x0 + 8, m.y1 - 5);
  }

  function fitToCurrent(){ ensureData(true); }

  // ── Panel ──────────────────────────────────────────────────────────────────
  let panel = null;
  let item  = null;

  function ensurePanel(){
    if(panel && document.contains(panel)) return;
    panel = document.createElement("div");
    panel.className = "dvl-vt-panel";
    panel.style.cssText = "display:none;position:fixed;z-index:9999;top:60px;right:60px;width:240px;";
    panel.innerHTML = `
      <div class="dvl-vt-header">
        <span class="dvl-vt-title">Delta Volume</span>
        <button class="dvl-vt-close" id="dvlDvClose">✕</button>
      </div>
      <div class="dvl-vt-body" id="dvlDvBody"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector("#dvlDvClose").addEventListener("click", closePanel);
  }

  function openPanel(){ ensurePanel(); renderPanel(); panel.style.display=""; }
  function closePanel(){ if(panel) panel.style.display="none"; }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlDvBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>General</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Indicator</label><label class="dvl-switch"><input id="dvlDvOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>MA Length</label><input id="dvlDvMALen" class="dvl-vt-input" type="number" min="0" max="500" step="1" value="${state.maLen||0}" placeholder="0=off"></div>
        </div>
      </div>
    `;
    const onCb = panel.querySelector("#dvlDvOn");
    if(onCb) onCb.addEventListener("change", ()=>{ state.on=onCb.checked; save(); });
    const maInp = panel.querySelector("#dvlDvMALen");
    if(maInp) maInp.addEventListener("change", ()=>{ const v=Math.max(0,Math.min(500,Math.round(+maInp.value)||0)); maInp.value=v; state.maLen=v; save(); });
  }

  // ── Indicator row pill ────────────────────────────────────────────────────
  function ensureRow(){
    if(item && document.contains(item)) return;
    const container = document.querySelector(".dvl-indicators-list, #dvlIndicatorsList, .dvl-osc-list");
    if(!container) return;
    item = document.createElement("div");
    item.className = "dvl-indicator-item";
    item.dataset.dvlDvBound = "1";
    item.innerHTML = `<span class="dvl-ind-name">Delta Volume</span><i class="dvl-vt-state" id="dvlDvState">${state.on?"ON":"OFF"}</i>`;
    container.appendChild(item);
    const pill = item.querySelector("#dvlDvState");
    item.addEventListener("click", ev=>{
      if(pill && pill.contains(ev.target)){ state.on=!state.on; save(); pill.textContent=state.on?"ON":"OFF"; }
      else openPanel();
    });
  }

  window.DVLDeltaVolume = {
    version:"0.596",
    on,
    setOn,
    draw,
    refresh:function(){ return ensureData(true); },
    fitToCurrent,
    reset:fitToCurrent,
    get state(){ return Object.assign({}, state); },
    get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data||[]).slice() }); }
  };
})();
</script>"""

html = rep(html,
    '  window.DVLLongShortOscillator = {\n'
    '    version:"0.577",\n'
    '    on,\n'
    '    setOn,\n'
    '    draw,\n'
    '    refresh:function(){ return ensureData(true); },\n'
    '    fitToCurrent,\n'
    '    reset:fitToCurrent,\n'
    '    get state(){ return Object.assign({}, state); },\n'
    '    get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data || []).slice() }); }\n'
    '  };\n'
    '})();\n'
    '</script>',

    '  window.DVLLongShortOscillator = {\n'
    '    version:"0.577",\n'
    '    on,\n'
    '    setOn,\n'
    '    draw,\n'
    '    refresh:function(){ return ensureData(true); },\n'
    '    fitToCurrent,\n'
    '    reset:fitToCurrent,\n'
    '    get state(){ return Object.assign({}, state); },\n'
    '    get cache(){ return Object.assign({}, CACHE, { data:(CACHE.data || []).slice() }); }\n'
    '  };\n'
    '})();\n'
    '</script>'
    + DELTA_VOL_IIFE,

    'insert DVLDeltaVolume IIFE after LS script'
)

# ── Version bump 0.595 → 0.596 ────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.595";',
    'const DVL_APP_VERSION = "Beta 0.596";',
    'DVL_APP_VERSION 0.595→0.596'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: OI e L/S nao atualizavam ao trocar de ativo — draw() so chamava ensureData quando sem dados; removida a guarda CACHE.data.length." },',
    '{ version: DVL_APP_VERSION, note: "Delta Volume: novo oscilador, barras buy/sell/delta via klines 1m Binance Futures, agrupadas por periodo mae. MA opcional." },\n'
    '  { version: "Beta 0.595", note: "Bugfix: OI e L/S nao atualizavam ao trocar de ativo." },',
    'DVL_CHANGELOG 0.596'
)
html = rep(html,
    '<div class="beta" id="versionBadge">BETA 0.595</div>',
    '<div class="beta" id="versionBadge">BETA 0.596</div>',
    'versionBadge 0.595→0.596'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.595</title>',
    '<title>DVL Binance Live — Beta 0.596</title>',
    'title 0.595→0.596'
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
