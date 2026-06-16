# patch_614.py — Beta 0.614
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.613)
#
# FEATURE 1 — Volume Profile (VP)
#   - Novo script DVL_VOLUME_PROFILE_JS (IIFE)
#   - Hook window.DVLVolumeProfileDraw chamado de drawPriceSection (dentro do
#     ctx.clip existente, após DVLMovingAveragesDraw)
#   - Barras horizontais no lado direito do chart (widthPct% da largura)
#   - POC (Point of Control), VAH (Value Area High), VAL (Value Area Low) com
#     linhas e labels opcionais
#   - Painel de configurações: cor das barras VA / fora VA, cor POC/VAH/VAL,
#     rows, width%, opacity%, value area %
#   - Item "VP" no dropdown Indicators
#
# FEATURE 2 — Configurações persistentes (Salvar)
#   - saveAppSettings() grava em localStorage: cores dos candles, candleMode,
#     sessionsOn, sessionActive, interval
#   - loadAppSettings() é chamada imediatamente após declaração das variáveis
#   - Botão "Salvar configurações" no painel Chart Settings
#   - Sync dos checkboxes de sessão após DOMContentLoaded
#
# VERSION: 0.613 → 0.614

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

# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE 2 — Settings persistence
# ═══════════════════════════════════════════════════════════════════════════════

# ── 2a. saveAppSettings + loadAppSettings IIFE após declaração de sessionActive ─
html = rep(html,
    'let sessionActive = { asia:true, london:true, newyork:true, sydney:true };\n'
    'const SESSION_DEFS = {',

    'let sessionActive = { asia:true, london:true, newyork:true, sydney:true };\n'
    '\n'
    'const DVL_APP_SETTINGS_KEY = "DVL_APP_SETTINGS_V1";\n'
    'function saveAppSettings(){\n'
    '  try{\n'
    '    localStorage.setItem(DVL_APP_SETTINGS_KEY, JSON.stringify({\n'
    '      candleBullColor, candleBearColor, candleMode,\n'
    '      sessionsOn, sessionActive: Object.assign({}, sessionActive), interval\n'
    '    }));\n'
    '  }catch(_){}\n'
    '}\n'
    '(function loadAppSettings(){\n'
    '  try{\n'
    '    const s = JSON.parse(localStorage.getItem(DVL_APP_SETTINGS_KEY)||"null");\n'
    '    if(!s) return;\n'
    '    if(s.candleBullColor) candleBullColor = s.candleBullColor;\n'
    '    if(s.candleBearColor) candleBearColor = s.candleBearColor;\n'
    '    if(["candles","hollow","footprint","heikin","renko"].includes(s.candleMode)) candleMode = s.candleMode;\n'
    '    if(typeof s.sessionsOn === "boolean") sessionsOn = s.sessionsOn;\n'
    '    if(s.sessionActive && typeof s.sessionActive === "object")\n'
    '      ["asia","london","newyork","sydney"].forEach(k => { if(typeof s.sessionActive[k]==="boolean") sessionActive[k]=s.sessionActive[k]; });\n'
    '    if(s.interval && /^[1-9]\\d*(s|m|h|d|w)$/.test(s.interval)) interval = s.interval;\n'
    '  }catch(_){}\n'
    '})();\n'
    '\n'
    'const SESSION_DEFS = {',

    'saveAppSettings + loadAppSettings IIFE'
)

# ── 2b. Botão "Salvar configurações" no settings panel HTML ──────────────────
html = rep(html,
    '          <label><span class="sessionDot sydney"></span><span>Sydney</span><input class="sessionCheck" type="checkbox" data-session="sydney" checked></label>\n'
    '        </div>\n'
    '      </div>',

    '          <label><span class="sessionDot sydney"></span><span>Sydney</span><input class="sessionCheck" type="checkbox" data-session="sydney" checked></label>\n'
    '        </div>\n'
    '\n'
    '        <div class="chartSettingRow" style="margin-top:10px;padding-bottom:4px">\n'
    '          <button id="dvlSaveSettingsBtn" type="button" style="width:100%;padding:7px 0;background:rgba(19,220,141,.12);border:1px solid rgba(19,220,141,.3);border-radius:7px;color:#13dc8d;font:700 11px system-ui;cursor:pointer;letter-spacing:.04em">Salvar configurações</button>\n'
    '        </div>\n'
    '      </div>',

    'Settings panel: botão Salvar'
)

# ── 2c. Wire save button + sync checkboxes após sessionChecks handler ─────────
html = rep(html,
    '  if(els.sessionChecks){\n'
    '    els.sessionChecks.forEach(input => {\n'
    '      input.addEventListener("change", () => {\n'
    '        sessionActive[input.dataset.session] = input.checked;\n'
    '        drawSoon();\n'
    '      });\n'
    '    });\n'
    '  }\n'
    '\n'
    '  if(els.bullColorBtn){',

    '  if(els.sessionChecks){\n'
    '    els.sessionChecks.forEach(input => {\n'
    '      input.addEventListener("change", () => {\n'
    '        sessionActive[input.dataset.session] = input.checked;\n'
    '        drawSoon();\n'
    '      });\n'
    '    });\n'
    '  }\n'
    '\n'
    '  // Sync checkboxes to loaded settings (after loadAppSettings() ran at startup)\n'
    '  if(els.sessionsToggle) els.sessionsToggle.checked = !!sessionsOn;\n'
    '  if(els.sessionChecks) els.sessionChecks.forEach(inp => { if(typeof sessionActive[inp.dataset.session]==="boolean") inp.checked = sessionActive[inp.dataset.session]; });\n'
    '\n'
    '  const dvlSaveSettingsBtn = document.getElementById("dvlSaveSettingsBtn");\n'
    '  if(dvlSaveSettingsBtn){\n'
    '    dvlSaveSettingsBtn.addEventListener("click", ()=>{\n'
    '      saveAppSettings();\n'
    '      dvlSaveSettingsBtn.textContent = "Salvo \\u2713";\n'
    '      dvlSaveSettingsBtn.style.color = "#f3c768";\n'
    '      setTimeout(()=>{ dvlSaveSettingsBtn.textContent = "Salvar configura\\u00e7\\u00f5es"; dvlSaveSettingsBtn.style.color = "#13dc8d"; }, 1800);\n'
    '    });\n'
    '  }\n'
    '\n'
    '  if(els.bullColorBtn){',

    'Wire save button + sync session checkboxes'
)

# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE 1 — Volume Profile hook in drawPriceSection
# ═══════════════════════════════════════════════════════════════════════════════

# ── 1a. VP hook após DVLMovingAveragesDraw, antes do ctx.restore() ────────────
html = rep(html,
    '  if(window.DVLMovingAveragesDraw){\n'
    '    window.DVLMovingAveragesDraw(ctx, {\n'
    '      view,\n'
    '      drawView,\n'
    '      win,\n'
    '      x,\n'
    '      y,\n'
    '      x0,\n'
    '      x1,\n'
    '      y0,\n'
    '      y1,\n'
    '      slotOffset,\n'
    '      candleW,\n'
    '      priceBottom,\n'
    '      priceH\n'
    '    });\n'
    '  }\n'
    '\n'
    '  ctx.restore();',

    '  if(window.DVLMovingAveragesDraw){\n'
    '    window.DVLMovingAveragesDraw(ctx, {\n'
    '      view,\n'
    '      drawView,\n'
    '      win,\n'
    '      x,\n'
    '      y,\n'
    '      x0,\n'
    '      x1,\n'
    '      y0,\n'
    '      y1,\n'
    '      slotOffset,\n'
    '      candleW,\n'
    '      priceBottom,\n'
    '      priceH\n'
    '    });\n'
    '  }\n'
    '\n'
    '  if(window.DVLVolumeProfileDraw){\n'
    '    window.DVLVolumeProfileDraw(ctx, {\n'
    '      view, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max\n'
    '    });\n'
    '  }\n'
    '\n'
    '  ctx.restore();',

    'DVLVolumeProfileDraw hook em drawPriceSection'
)

# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE 1 — Volume Profile IIFE script (antes de </body>)
# ═══════════════════════════════════════════════════════════════════════════════

VP_SCRIPT = r'''
<script id="DVL_VOLUME_PROFILE_JS">
(function(){
  "use strict";

  const STOR_KEY = "dvl_vol_profile_v1";
  const DEFAULTS = {
    on: true,
    rows: 120,
    widthPct: 0.18,
    opacity: 0.46,
    valueAreaPct: 0.70,
    colorIn:  "#18d7ff",
    colorOut: "#2a3d55",
    colorPOC: "#f3c768",
    colorVAH: "#13dc8d",
    colorVAL: "#ff4a61",
    showPOC: true,
    showVAH: true,
    showVAL: true,
    showLabels: true
  };

  let state = Object.assign({}, DEFAULTS);
  try{ Object.assign(state, JSON.parse(localStorage.getItem(STOR_KEY)||"{}")); }catch(_){}

  function save(){ try{ localStorage.setItem(STOR_KEY, JSON.stringify(state)); }catch(_){} }
  function on(){ return !!state.on; }
  function setOn(v){ state.on=!!v; save(); }

  // ── Volume Profile computation ────────────────────────────────────────────
  function computeVP(view, priceMin, priceMax, rows){
    const buckets = new Float64Array(rows);
    const range = priceMax - priceMin;
    if(range <= 0) return buckets;
    for(const c of view){
      const vol = Number(c.volume)||0;
      if(!vol) continue;
      const lo = Math.max(Number(c.low),  priceMin);
      const hi = Math.min(Number(c.high), priceMax);
      if(lo >= hi) continue;
      const loI = Math.max(0,      Math.floor((lo - priceMin) / range * rows));
      const hiI = Math.min(rows-1, Math.floor((hi - priceMin) / range * rows));
      const n = hiI - loI + 1;
      const vpb = vol / n;
      for(let i = loI; i <= hiI; i++) buckets[i] += vpb;
    }
    return buckets;
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(ctx, cfg){
    if(!on()) return;
    const { view, x0, x1, y0, y1, min, max } = cfg;
    if(!view || !view.length || min === undefined || max === undefined) return;
    const priceRange = max - min;
    if(priceRange <= 0) return;

    const rows = Math.max(20, Math.min(500, Math.round(state.rows)||120));
    const buckets = computeVP(view, min, max, rows);

    let maxBucket = 0, totalVol = 0, pocIdx = 0;
    for(let i = 0; i < rows; i++){
      totalVol += buckets[i];
      if(buckets[i] > maxBucket){ maxBucket = buckets[i]; pocIdx = i; }
    }
    if(!maxBucket) return;

    // Value Area (default 70% do volume total, expandindo do POC)
    const vaTarget = totalVol * Math.max(0.01, Math.min(1, state.valueAreaPct||0.70));
    let vaVol = buckets[pocIdx];
    let vaLo = pocIdx, vaHi = pocIdx;
    while(vaVol < vaTarget && (vaLo > 0 || vaHi < rows-1)){
      const nLo = vaLo > 0        ? buckets[vaLo-1] : 0;
      const nHi = vaHi < rows-1  ? buckets[vaHi+1] : 0;
      if(nHi >= nLo){ vaHi++; vaVol += buckets[vaHi]; }
      else           { vaLo--; vaVol += buckets[vaLo]; }
    }

    const vpW  = Math.min(150, Math.max(40, (x1-x0) * (state.widthPct||0.18)));
    const vpX0 = x1 - vpW;
    const barH = (y1 - y0) / rows;
    const op   = Math.max(0.05, Math.min(1, state.opacity||0.46));

    ctx.save();

    // ── Bars ──────────────────────────────────────────────────────────────
    for(let i = 0; i < rows; i++){
      if(!buckets[i]) continue;
      const bw = (buckets[i] / maxBucket) * vpW;
      const py = y1 - (i+1)*barH;
      ctx.globalAlpha = op;
      ctx.fillStyle   = (i >= vaLo && i <= vaHi) ? (state.colorIn||"#18d7ff") : (state.colorOut||"#2a3d55");
      ctx.fillRect(vpX0, py, bw, Math.max(0.8, barH));
    }
    ctx.globalAlpha = 1;

    // ── POC ───────────────────────────────────────────────────────────────
    if(state.showPOC !== false){
      const pocY = y1 - (pocIdx + 0.5) * barH;
      ctx.strokeStyle = state.colorPOC || "#f3c768";
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(x0, pocY); ctx.lineTo(x1, pocY); ctx.stroke();
      ctx.setLineDash([]);
      if(state.showLabels !== false){
        ctx.fillStyle    = state.colorPOC || "#f3c768";
        ctx.font         = "700 7.5px system-ui";
        ctx.textAlign    = "right";
        ctx.textBaseline = "bottom";
        ctx.globalAlpha  = 0.9;
        ctx.fillText("POC", vpX0 - 2, pocY);
        ctx.globalAlpha  = 1;
      }
    }

    // ── VAH ───────────────────────────────────────────────────────────────
    if(state.showVAH !== false){
      const vahY = y1 - (vaHi + 1) * barH;
      ctx.strokeStyle = state.colorVAH || "#13dc8d";
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(x0, vahY); ctx.lineTo(x1, vahY); ctx.stroke();
      ctx.setLineDash([]);
      if(state.showLabels !== false){
        ctx.fillStyle    = state.colorVAH || "#13dc8d";
        ctx.font         = "700 7.5px system-ui";
        ctx.textAlign    = "right";
        ctx.textBaseline = "bottom";
        ctx.globalAlpha  = 0.9;
        ctx.fillText("VAH", vpX0 - 2, vahY);
        ctx.globalAlpha  = 1;
      }
    }

    // ── VAL ───────────────────────────────────────────────────────────────
    if(state.showVAL !== false){
      const valY = y1 - vaLo * barH;
      ctx.strokeStyle = state.colorVAL || "#ff4a61";
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(x0, valY); ctx.lineTo(x1, valY); ctx.stroke();
      ctx.setLineDash([]);
      if(state.showLabels !== false){
        ctx.fillStyle    = state.colorVAL || "#ff4a61";
        ctx.font         = "700 7.5px system-ui";
        ctx.textAlign    = "right";
        ctx.textBaseline = "top";
        ctx.globalAlpha  = 0.9;
        ctx.fillText("VAL", vpX0 - 2, valY);
        ctx.globalAlpha  = 1;
      }
    }

    ctx.restore();
  }

  // ── Settings panel ────────────────────────────────────────────────────────
  let panel = null;
  function ensurePanel(){
    if(panel && document.contains(panel)) return;
    panel = document.createElement("div");
    panel.id = "dvlVPPanel";
    panel.className = "dvl-vt-panel";
    panel.innerHTML = `
      <div class="dvl-vt-head">
        <div class="dvl-vt-title"><b>Volume Profile</b><small>range visível · POC / VAH / VAL</small></div>
        <div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlVPClose" type="button">×</button></div>
      </div>
      <div class="dvl-vt-body" id="dvlVPBody"></div>
    `;
    document.body.appendChild(panel);
    panel.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    panel.querySelector("#dvlVPClose").addEventListener("click", closePanel);
  }
  function openPanel(){ ensurePanel(); panel.classList.add("is-open"); renderPanel(); }
  function closePanel(){ if(panel) panel.classList.remove("is-open"); }

  function cField(id, lbl, key){
    const val = state[key] || "#18d7ff";
    return `<div class="dvl-vt-field"><label>${lbl}</label><input id="${id}" class="dvl-vt-color" type="color" value="${val}"></div>`;
  }

  function renderPanel(){
    ensurePanel();
    const body = panel.querySelector("#dvlVPBody");
    body.innerHTML = `
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Geral</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="dvlVPOn" type="checkbox" ${state.on?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Labels</label><label class="dvl-switch"><input id="dvlVPLabels" type="checkbox" ${state.showLabels!==false?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>Rows</label><input id="dvlVPRows" class="dvl-vt-input" type="number" min="20" max="500" step="10" value="${Math.round(state.rows||120)}"></div>
          <div class="dvl-vt-field"><label>Largura %</label><input id="dvlVPWPct" class="dvl-vt-input" type="number" min="5" max="40" step="1" value="${Math.round((state.widthPct||0.18)*100)}"></div>
          <div class="dvl-vt-field"><label>Opacidade %</label><input id="dvlVPOp" class="dvl-vt-input" type="number" min="5" max="100" step="5" value="${Math.round((state.opacity||0.46)*100)}"></div>
          <div class="dvl-vt-field"><label>Value Area %</label><input id="dvlVPVAPct" class="dvl-vt-input" type="number" min="10" max="100" step="5" value="${Math.round((state.valueAreaPct||0.70)*100)}"></div>
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Cores das Barras</span></div>
        <div class="dvl-vt-grid">
          ${cField("dvlVPCIn","Value Area","colorIn")}
          ${cField("dvlVPCOut","Fora VA","colorOut")}
        </div>
      </div>
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>POC / VAH / VAL</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>POC</label><label class="dvl-switch"><input id="dvlVPPOC" type="checkbox" ${state.showPOC!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCPOC","Cor POC","colorPOC")}
          <div class="dvl-vt-field"><label>VAH</label><label class="dvl-switch"><input id="dvlVPVAH" type="checkbox" ${state.showVAH!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCVAH","Cor VAH","colorVAH")}
          <div class="dvl-vt-field"><label>VAL</label><label class="dvl-switch"><input id="dvlVPVAL" type="checkbox" ${state.showVAL!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCVAL","Cor VAL","colorVAL")}
        </div>
      </div>
    `;

    function b(id, fn){ const el=body.querySelector("#"+id); if(el) el.addEventListener("change",()=>{ fn(el); save(); if(typeof drawSoon==="function") drawSoon(); }); }
    b("dvlVPOn",    el=>{ state.on=el.checked; updateRow(); });
    b("dvlVPLabels",el=>{ state.showLabels=el.checked; });
    b("dvlVPRows",  el=>{ state.rows=Math.max(20,Math.min(500,Math.round(+el.value)||120)); });
    b("dvlVPWPct",  el=>{ state.widthPct=Math.max(0.05,Math.min(0.40,(+el.value||18)/100)); });
    b("dvlVPOp",    el=>{ state.opacity=Math.max(0.05,Math.min(1,(+el.value||46)/100)); });
    b("dvlVPVAPct", el=>{ state.valueAreaPct=Math.max(0.10,Math.min(1,(+el.value||70)/100)); });
    b("dvlVPCIn",   el=>{ state.colorIn=el.value; });
    b("dvlVPCOut",  el=>{ state.colorOut=el.value; });
    b("dvlVPPOC",   el=>{ state.showPOC=el.checked; });
    b("dvlVPCPOC",  el=>{ state.colorPOC=el.value; });
    b("dvlVPVAH",   el=>{ state.showVAH=el.checked; });
    b("dvlVPCVAH",  el=>{ state.colorVAH=el.value; });
    b("dvlVPVAL",   el=>{ state.showVAL=el.checked; });
    b("dvlVPCVAL",  el=>{ state.colorVAL=el.value; });
  }

  // ── Indicator row ─────────────────────────────────────────────────────────
  function updateRow(){
    const st = document.getElementById("dvlVPState");
    if(st){ st.textContent=state.on?"ON":"OFF"; st.classList.toggle("is-on",!!state.on); }
  }

  function insertRow(){
    const menu = document.getElementById("indicatorDropdown");
    if(!menu) return;
    let item = document.getElementById("dvlVolProfileItem");
    if(!item){
      item = document.createElement("div");
      item.id = "dvlVolProfileItem";
      item.className = "indicatorItem";
      item.innerHTML = `
        <span class="indicatorFxMark">VP</span>
        <span><b>Volume Profile</b><small>range visível · POC / VAH / VAL</small></span>
        <i class="dvl-vt-state" id="dvlVPState">ON</i>
      `;
      const after = document.getElementById("dvlTickVolumeItem")||document.getElementById("dvlDeltaVolumeItem");
      if(after && after.parentNode) after.parentNode.insertBefore(item, after.nextSibling);
      else menu.appendChild(item);
    }
    if(!item.dataset.dvlVPBound){
      item.dataset.dvlVPBound = "1";
      const pill = item.querySelector("#dvlVPState");
      if(pill) pill.addEventListener("click", ev=>{ ev.preventDefault(); ev.stopPropagation(); state.on=!state.on; save(); updateRow(); if(typeof drawSoon==="function") drawSoon(); });
      item.addEventListener("click", ev=>{ ev.stopPropagation(); openPanel(); });
    }
    updateRow();
  }

  function boot(){ insertRow(); updateRow(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLVolumeProfile = { version:"0.614", on, setOn, draw, openPanel,
    get state(){ return Object.assign({}, state); }
  };
  window.DVLVolumeProfileDraw = function(ctx, cfg){ try{ draw(ctx, cfg); }catch(_){} };

})();
</script>
'''

html = rep(html,
    '\n</body>\n</html>',
    VP_SCRIPT + '\n</body>\n</html>',
    'DVL_VOLUME_PROFILE_JS script'
)

# ═══════════════════════════════════════════════════════════════════════════════
# Version bump 0.613 → 0.614
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.613";',
    'const DVL_APP_VERSION = "Beta 0.614";',
    'DVL_APP_VERSION 0.613→0.614'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Bugfix: auto-scale do chart principal p5/p95 — candle outlier nao achata a janela." },',
    '{ version: DVL_APP_VERSION, note: "Feature: Volume Profile (VP) — barras direita, POC/VAH/VAL + configuracoes persistentes (Salvar)." },\n'
    '  { version: "Beta 0.613", note: "Bugfix: auto-scale p5/p95 — candle outlier nao achata chart nem OI." },',
    'DVL_CHANGELOG 0.614'
)
html = rep(html,
    'BETA 0.613</div>',
    'BETA 0.614</div>',
    'versionBadge 0.613→0.614'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.613</title>',
    '<title>DVL Binance Live — Beta 0.614</title>',
    'title 0.613→0.614'
)
html = rep(html,
    '    version:"0.613",',
    '    version:"0.614",',
    'DVLTickVolume version 0.613→0.614'
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
